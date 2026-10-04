/* ⛔ CE QUE CE FICHIER GARDE — LES NOTIFICATIONS PUSH, DU VRAI SERVICE JUSQU'À UN FAUX SERVICE PUSH (famille 6, étape 2).

   `test-955` monte le MODULE `push.js` (dépendances injectées) : la liste blanche, la charge, l'acquittement. Ce banc-ci lance le VRAI `server-msg/index.js` dans un processus isolé, un VRAI OP
   GESTION de poche pour la porte bêta, et un FAUX SERVICE PUSH local (http, boucle locale, `OPMSG_TEST_PUSH`) : il joue les gestes d'une personne — s'abonner, recevoir un message, ouvrir la
   page, acquitter — et regarde ce qui part VRAIMENT, déchiffré avec les clés de l'appareil de banc (RFC 8291) et signé VAPID (vérifié contre la clé publique que le service publie).

   Ce qu'il garde, et que le module seul ne peut pas voir (« ce que le service PUBLIE et BRANCHE ») :
     · la clé VAPID : publiée par `/api/config`, la même après un redémarrage, la privée jamais en clair (ni dans la base, ni dans le journal) ; la première paire posée GAGNE ;
     · les gestes HTTP : une route qui refuse dit POURQUOI (`champ_invalide`, `service_push_refuse`), un refus n'écrit rien, dix appareils au plus, un appareil appartient à UNE personne,
       l'essai est plafonné à trois par heure et dit combien d'appareils l'ont reçu ;
     · ce qui part : un message → une charge MINIMALE (« Nouveau message », ni texte ni nom), l'aperçu (nom + cent caractères) seulement pour qui l'a activé, jamais à l'auteur, jamais pour
       une conversation en sourdine ; un ajout à un groupe, un nouveau contact ;
     · l'ACQUITTEMENT : une page ouverte qui a montré l'événement évite la notification, une page ouverte qui ne l'acquitte pas la reçoit après le délai, un acquittement « d'avance » est ramené
       au journal et n'éteint pas les événements à venir. Les négatifs se prouvent par SENTINELLE (un événement qui arrive APRÈS), jamais au chronomètre ;
     · les pannes : 410 → l'abonnement part ; 500 → compté puis retiré ; une redirection n'est PAS suivie ; un service qui ne répond pas est coupé au délai ;
     · l'accès bêta coupé dans la Tour et « Déconnecter les autres appareils » retirent aussi les abonnements ;
     · la vie privée : le point d'accès n'est ni dans les journaux, ni dans /health, ni en clair dans la base ; les journaux ne portent ni texte ni nom ;
     · les fichiers servis (`/sw.js`, `/manifest.webmanifest`) et la politique de la page (worker-src, manifest-src) ;
     · les démarrages REFUSÉS : la porte de banc en production, une paire VAPID incohérente, une adresse qui n'est pas la boucle locale.
   ⛔ Une assertion « rien n'est arrivé » est précédée de la preuve que la population existe (l'appareil recevait bien autre chose, par la même route). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456', eve: 'pw-eve-1234567' };
const NOMS = { alice: 'Alice Martin', bob: 'Bob Durand', cleo: 'Cleo Petit', dan: 'Dan Roux', eve: 'Eve Blanc' };
const ACK_MS = 1500;     // le délai d'acquittement du banc : l'acquittement part en quelques millisecondes (mesuré plus bas), la marge est de deux ordres de grandeur
const TEXTE_SECRET = 'Bonjour secret-9QX';
const TEXTE_LONG = 'Zq'.repeat(75);   // 150 caractères

function paireVapid() {
  for (;;) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const priv = e.getPrivateKey();
    if (priv.length === 32) return { pub: e.getPublicKey().toString('base64url'), priv: priv.toString('base64url'), privOctets: priv };
  }
}

(async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-956-'));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const fps = await P.fauxServicePush();
  const PAIRE = paireVapid(), PAIRE2 = paireVapid();
  const cle = crypto.randomBytes(32).toString('hex');
  /* ⛔ `timeoutMs` est la marge de l'appareil SAIN autant que le délai de l'appareil muet. À 700 ms, ce banc est tombé UNE fois sur la liste complète (3 octobre 2026) : au deuxième essai l'appareil sain « n'avait
     pas reçu » et sept échecs étaient comptés au lieu de six — un envoi réussi compté comme un échec. Cause probable, NON reproduite (quatre passages verts sous une charge épinglée sur le processeur du banc) : une
     boucle d'évènements du service arrêtée plus de 700 ms (un `fsync` de SQLite sur un disque partagé, un processeur pris par d'autres chantiers) laisse la minuterie partir avant la réponse déjà arrivée. Trois secondes
     laissent la marge, et l'appareil muet ne coûte que ce délai par essai. La production attend 8 secondes. */
  const PUSH_CFG = { ackMs: ACK_MS, echecsMax: 2, etalementMs: 1500, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' };
  const demarrer = (extra) => T.lancerService(Object.assign({ dossier, cle, urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote } }, extra || {}));
  let svc = null;
  const flux = [];
  try {
    svc = await demarrer({ config: { push: PUSH_CFG, beta: { relectureMs: 400 }, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE.priv } });
    const base = () => svc.base;
    const sante = async () => (await T.client(base()).get('/health')).j;
    const dbFichiers = () => fs.readdirSync(svc.data).filter(f => /^msg\.db/.test(f)).map(f => fs.readFileSync(path.join(svc.data, f)));
    const dansBase = (motif) => dbFichiers().some(b => b.includes(Buffer.isBuffer(motif) ? motif : Buffer.from(String(motif), 'utf8')));
    const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
    const abosDe = (uid) => sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uid).n;
    const abosTous = () => sql('SELECT COUNT(*) AS n FROM push').n;

    /* ── un appareil de banc, et ce qu'il a reçu ── */
    const dev = (nom) => { const d = P.appareil(fps.endpoint(nom)); d.nom = nom; d.chemin = '/push/' + nom; d.lus = 0; return d; };
    const recus = (d) => fps.envois.filter(e => e.chemin === d.chemin);
    const charge = (d, e) => JSON.parse(P.dechiffrer(d, e.corps));
    /* le PROCHAIN envoi pour cet appareil (AU GESTE), déchiffré — ou null s'il n'arrive pas */
    const suivant = async (d, plafond) => {
      const i = d.lus;
      const ok = await T.attendre(() => recus(d).length > i, plafond || 8000, 10);
      if (!ok) return null;
      d.lus = i + 1;
      const e = recus(d)[i];
      return { e, c: charge(d, e), t: e.t };
    };
    const rienDeNouveau = (d) => recus(d).length === d.lus;

    const connecte = async (nom) => T.connecter(svc, og, nom, MDP[nom]);
    const A = await connecte('alice'), B = await connecte('bob'), C = await connecte('cleo'), D = await connecte('dan');
    const abonner = (c, d) => c.post('/api/push/abonner', { sub: d.sub });

    console.log('La clé VAPID : publiée, stable, la privée jamais en clair');
    {
      const cfg = await T.client(base()).get('/api/config');
      v('/api/config publie la clé publique VAPID de l\'installation (la paire posée par la configuration)', cfg.j.push, { vapid: PAIRE.pub });
      const pub = Buffer.from(cfg.j.push.vapid, 'base64url');
      v('c\'est un point P-256 non compressé (65 octets, préfixe 4)', [pub.length, pub[0]], [65, 4]);
      const h = await sante();
      v('/health.push au départ : actif, aucun abonnement, rien envoyé, aucun échec, aucun refus de nos clés', h.push, { actif: true, abonnements: 0, envoyes24h: 0, echecs24h: 0, refuses24h: 0 });
      vrai('population : le balayage de la base voit la clé PUBLIQUE (elle est en clair dans la base) — il sait donc regarder', dansBase(PAIRE.pub));
      v('⛔ la clé VAPID PRIVÉE n\'est NULLE PART en clair dans la base (ni en base64url, ni en octets bruts, ni en hexadécimal)', [dansBase(PAIRE.priv), dansBase(PAIRE.privOctets), dansBase(PAIRE.privOctets.toString('hex'))], [false, false, false]);
      vrai('population : le journal du service est lu (le démarrage y est)', /demarre/.test(svc.sortie.texte()));
      v('⛔ ni la clé privée ni la publique dans le journal du service', [svc.sortie.texte().includes(PAIRE.priv), svc.sortie.texte().includes(PAIRE.pub)], [false, false]);
    }

    console.log('\nS\'abonner : chaque refus dit pourquoi, un refus n\'écrit rien');
    {
      const bonnes = P.appareil(fps.endpoint('gabarit')).sub.keys;
      const refus = [
        ['sans corps', {}, 'champ_invalide'],
        ['sub qui n\'est pas un objet', { sub: 'texte' }, 'champ_invalide'],
        ['un autre domaine', { sub: { endpoint: 'https://evil.example/push/x', keys: bonnes } }, 'service_push_refuse'],
        ['un nom qui COMMENCE comme un service autorisé (…googleapis.com.evil.example)', { sub: { endpoint: 'https://fcm.googleapis.com.evil.example/fcm/send/x', keys: bonnes } }, 'service_push_refuse'],
        ['des identifiants dans l\'adresse', { sub: { endpoint: 'https://user:mdp@fcm.googleapis.com/fcm/send/x', keys: bonnes } }, 'service_push_refuse'],
        ['un autre port que 443', { sub: { endpoint: 'https://fcm.googleapis.com:8443/fcm/send/x', keys: bonnes } }, 'service_push_refuse'],
        ['http au lieu de https', { sub: { endpoint: 'http://fcm.googleapis.com/fcm/send/x', keys: bonnes } }, 'service_push_refuse'],
        ['la boucle locale sur un AUTRE port que celui de la porte de banc', { sub: { endpoint: 'http://127.0.0.1:' + (fps.port + 1) + '/push/x', keys: bonnes } }, 'service_push_refuse'],
        ['une adresse IP en https', { sub: { endpoint: 'https://93.184.216.34/push/x', keys: bonnes } }, 'service_push_refuse'],
        ['une clé p256dh de 64 octets', { sub: { endpoint: fps.endpoint('x1'), keys: { p256dh: crypto.randomBytes(64).toString('base64url'), auth: bonnes.auth } } }, 'champ_invalide'],
        ['un p256dh de 65 octets qui n\'est pas un point de la courbe', { sub: { endpoint: fps.endpoint('x2'), keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url'), auth: bonnes.auth } } }, 'champ_invalide'],
        ['un secret d\'authentification de 15 octets', { sub: { endpoint: fps.endpoint('x3'), keys: { p256dh: bonnes.p256dh, auth: crypto.randomBytes(15).toString('base64url') } } }, 'champ_invalide'],
        ['sans clés', { sub: { endpoint: fps.endpoint('x4') } }, 'champ_invalide'],
        ['un point d\'accès qui n\'est pas du texte', { sub: { endpoint: 12, keys: bonnes } }, 'champ_invalide'],
      ];
      const avant = abosTous();
      const res = [];
      for (const [, corps] of refus) res.push(await D.post('/api/push/abonner', corps));
      for (let i = 0; i < refus.length; i++) v('⛔ refus : ' + refus[i][0] + ' → 400 ' + refus[i][2], [res[i].code, res[i].j && res[i].j.error], [400, refus[i][2]]);
      v('⛔ les ' + refus.length + ' refus n\'ont RIEN écrit', abosTous(), avant);
      vrai('population : le service accepte pourtant un abonnement de la forme voulue (la porte de banc), donc les refus ne viennent pas d\'un service qui refuse tout', (await abonner(D, dev('dan-sonde'))).code === 200);
      await D.post('/api/push/desabonner', { endpoint: fps.endpoint('dan-sonde') });
    }

    console.log('\nS\'abonner : un appareil, une personne, dix au plus');
    const A1 = dev('alice-1'), A2 = dev('alice-2'), B1 = dev('bob-1'), C1 = dev('cleo-1');
    {
      const r1 = await abonner(A, A1);
      v('Alice inscrit son premier appareil → 200, un appareil', [r1.code, r1.j], [200, { ok: true, appareils: 1 }]);
      const r2 = await abonner(A, A1);
      v('le même point d\'accès, une seconde fois → toujours UN appareil (pas de doublon)', [r2.code, r2.j.appareils, abosDe(A.moi.id)], [200, 1, 1]);
      v('un second appareil → deux', (await abonner(A, A2)).j.appareils, 2);
      await abonner(B, B1); await abonner(C, C1);
      v('population : alice 2, bob 1, cleo 1 appareils en base', [abosDe(A.moi.id), abosDe(B.moi.id), abosDe(C.moi.id)], [2, 1, 1]);
      /* un appareil prêté ou revendu suit son DERNIER utilisateur */
      const t = await abonner(B, A2);
      v('⛔ Bob inscrit le point d\'accès d\'Alice (un appareil prêté) : il passe à Bob — un appareil, une personne', [t.code, abosDe(A.moi.id), abosDe(B.moi.id)], [200, 1, 2]);
      await abonner(A, A2);
      v('Alice le reprend : il revient à Alice', [abosDe(A.moi.id), abosDe(B.moi.id)], [2, 1]);
      /* dix au plus */
      const dix = Array.from({ length: 11 }, (_, i) => dev('dan-' + i));
      for (const d of dix) await abonner(D, d);
      v('⛔ onze inscriptions : DIX appareils au plus', abosDe(D.moi.id), 10);
      v('le plus ANCIEN est parti (le premier point d\'accès n\'est plus à Dan), le dernier est resté', [(await D.post('/api/push/desabonner', { endpoint: dix[0].sub.endpoint })).j.retire, (await D.post('/api/push/desabonner', { endpoint: dix[10].sub.endpoint })).j.retire], [0, 1]);
      /* se désabonner : le sien seulement */
      const autre = await B.post('/api/push/desabonner', { endpoint: A1.sub.endpoint });
      v('⛔ Bob ne peut pas retirer l\'appareil d\'Alice : 200 « 0 retiré », et il est toujours là', [autre.code, autre.j.retire, abosDe(A.moi.id)], [200, 0, 2]);
      const sien = await C.post('/api/push/desabonner', { endpoint: C1.sub.endpoint });
      v('Cléo retire le sien → 1 retiré', [sien.j.retire, abosDe(C.moi.id)], [1, 0]);
      v('désabonner sans point d\'accès → 400', (await C.post('/api/push/desabonner', {})).code, 400);
      await abonner(C, C1);
      v('/health.push compte les abonnements (nombre seulement)', (await sante()).push.abonnements, abosTous());
    }

    console.log('\nL\'inscription d\'un appareil est plafonnée : soixante par heure et par personne');
    {
      const E = await connecte('eve');
      const E1 = dev('eve-1');
      const codes = [];
      for (let i = 0; i < 61; i++) codes.push((await abonner(E, E1)).code);
      v('⛔ soixante inscriptions passent, la soixante et unième est refusée 429 (une page qui boucle ne remplit pas la base)', [codes.slice(0, 60).every(c => c === 200), codes[60]], [true, 429]);
      v('et la base n\'a toujours qu\'UN appareil pour elle (le même point d\'accès, redit soixante fois)', abosDe(E.moi.id), 1);
      await E.post('/api/push/desabonner', { endpoint: E1.sub.endpoint });
    }

    console.log('\nLa notification d\'essai : ce qui part, déchiffré et signé');
    {
      const r = await A.post('/api/push/essai', {});
      v('l\'essai dit combien d\'appareils l\'ont reçu', [r.code, r.j], [200, { ok: true, appareils: 2, envoyes: 2 }]);
      const p1 = await suivant(A1), p2 = await suivant(A2);
      vrai('population : les DEUX appareils d\'Alice ont reçu une requête du service', !!p1 && !!p2);
      v('la charge DÉCHIFFRÉE avec les clés de l\'appareil (RFC 8291)', [p1.c.type, p1.c.titre, p1.c.corps, p1.c.tag, p1.c.url, p1.c.renotify], ['essai', 'OP MESSAGES', 'Les notifications fonctionnent sur cet appareil.', 'essai', '/', false]);
      v('chaque appareil déchiffre avec SA clé : la charge de A2 n\'est pas lisible avec les clés de A1', (() => { try { P.dechiffrer(A1, p2.e.corps); return 'lisible'; } catch (e) { return 'illisible'; } })(), 'illisible');
      const vap = P.lireVapid(p1.e.entetes);
      vrai('l\'en-tête Authorization est un jeton VAPID (vapid t=…, k=…)', !!vap);
      v('⛔ la signature ES256 du jeton est VALIDE contre la clé publique que /api/config publie', P.signatureVapidValide(vap, PAIRE.pub), true);
      v('la clé k de l\'en-tête est celle de l\'instance', vap.cle, PAIRE.pub);
      v('audience = l\'origine du service push appelé ; sujet = le contact de la configuration', [vap.charge.aud, vap.charge.sub], [fps.base, 'mailto:exploitation@exemple.invalid']);
      const maintenant = Math.floor(Date.now() / 1000);
      vrai('le jeton expire dans les 24 h (et pas déjà)', vap.charge.exp > maintenant && vap.charge.exp <= maintenant + 86400 + 60);
      v('TTL court pour un essai (120 s), urgence normale, chiffrement aes128gcm', [p1.e.entetes.ttl, p1.e.entetes.urgency, p1.e.entetes['content-encoding']], ['120', 'normal', 'aes128gcm']);
      v('la requête part vers le point d\'accès inscrit (méthode POST, chemin exact)', [p1.e.methode, p1.e.chemin], ['POST', A1.chemin]);
      const r2 = await A.post('/api/push/essai', {}), r3 = await A.post('/api/push/essai', {});
      const r4 = await A.post('/api/push/essai', {});
      v('⛔ le 4e essai de l\'heure → 429 quota_atteint (trois par heure)', [r2.code, r3.code, r4.code, r4.j && r4.j.error], [200, 200, 429, 'quota_atteint']);
      vrai('le 429 dit quand réessayer (Retry-After)', Number(r4.h.get('retry-after')) > 0);
      /* on remet les compteurs de lecture à jour : 3 essais × 2 appareils */
      await T.attendre(() => recus(A1).length === 3 && recus(A2).length === 3, 8000, 10);
      A1.lus = 3; A2.lus = 3;
      const e = await B.post('/api/push/essai', {});
      v('un essai pour Bob (un appareil) → 1 reçu', [e.j.appareils, e.j.envoyes], [1, 1]);
      await suivant(B1);
      const sans = await T.client(base()).post('/api/push/essai', {});
      v('sans session → 401', sans.code, 401);
      const h = await sante();
      vrai('/health.push compte les envois réussis (7 : 6 d\'Alice + 1 de Bob)', h.push.envoyes24h === 7 && h.push.echecs24h === 0);
    }

    console.log('\nUn nouveau contact, un message : la charge est MINIMALE par défaut');
    const conv = {};
    {
      const lien = await A.post('/api/contacts/lien', {});
      const acc = await B.post('/api/liens/accepter', { code: lien.j.code });
      v('Bob accepte le lien d\'Alice → contact', [acc.code, acc.j.genre], [200, 'contact']);
      const n1 = await suivant(A1), n2 = await suivant(A2);
      vrai('population : les deux appareils d\'Alice reçoivent « Nouveau contact »', !!n1 && !!n2);
      v('⛔ charge minimale : « Nouveau contact », SANS le nom de Bob', [n1.c.type, n1.c.titre, n1.c.corps, JSON.stringify(n1.c).includes('Bob')], ['contact', 'OP MESSAGES', 'Nouveau contact', false]);
      const d = await A.post('/api/conversations/directe', { uid: B.moi.id });
      conv.ab = d.j.conversation.id;
      v('population : la conversation directe Alice-Bob existe', d.code, 201);
      const m = await B.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-aaaa0001', texte: TEXTE_SECRET });
      v('Bob écrit à Alice → 201', m.code, 201);
      const p1 = await suivant(A1), p2 = await suivant(A2);
      vrai('population : Alice reçoit sur SES DEUX appareils', !!p1 && !!p2);
      v('⛔ un message → charge minimale « Nouveau message » (étiquette = la conversation, ouvre la conversation)', [p1.c.type, p1.c.titre, p1.c.corps, p1.c.tag, p1.c.url, p1.c.renotify], ['message', 'OP MESSAGES', 'Nouveau message', conv.ab, '/#messages/' + conv.ab, true]);
      v('⛔ ni le texte du message ni le nom de Bob ne figurent dans la charge', [JSON.stringify(p1.c).includes('secret-9QX'), JSON.stringify(p1.c).includes('Bob'), JSON.stringify(p1.c).includes('Durand')], [false, false, false]);
      v('TTL d\'un message : un jour ; urgence normale', [p1.e.entetes.ttl, p1.e.entetes.urgency], ['86400', 'normal']);
      /* l'aperçu : seulement pour qui l'a activé */
      const reg = await A.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      v('Alice active « Aperçu du message » (le réglage existant de /api/moi/maj, pas de seconde route)', reg.code, 200);
      await B.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-aaaa0002', texte: TEXTE_LONG });
      const q = await suivant(A1);
      vrai('population : la notification avec aperçu arrive', !!q);
      v('⛔ aperçu : le nom de l\'auteur en titre', q.c.titre, 'Bob Durand');
      v('⛔ aperçu : le message tronqué à CENT caractères (99 + « … »)', [Array.from(q.c.corps).length, q.c.corps.endsWith('…'), q.c.corps.startsWith('ZqZq')], [100, true, true]);
      v('⛔ aperçu : le texte voyage, donc une HEURE de vie chez le service push (le minimal garde un jour, vu plus haut)', q.e.entetes.ttl, '3600');
      await suivant(A2);
      await A.post('/api/moi/maj', { prefs: { apercu_notif: false } });
      await B.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-aaaa0003', texte: TEXTE_SECRET });
      const r = await suivant(A1);
      v('aperçu désactivé : de nouveau minimal (le réglage est lu à l\'instant d\'envoyer)', [r.c.corps, JSON.stringify(r.c).includes('secret-9QX')], ['Nouveau message', false]);
      await suivant(A2);
    }

    console.log('\nJamais à l\'auteur, jamais pour une conversation en sourdine (preuves par sentinelle)');
    {
      /* Bob (qui a un appareil abonné) écrit : Bob ne reçoit RIEN de son propre message. Sentinelle : un essai pour Bob, envoyé APRÈS. */
      const essaisBob = async () => { const r = await B.post('/api/push/essai', {}); return r; };
      await B.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-bbbb0001', texte: 'de Bob à Alice' });
      await suivant(A1); await suivant(A2);
      const es = await essaisBob();
      const s = await suivant(B1);
      v('population : la sentinelle (un essai pour Bob) est arrivée', [es.code, !!s && s.c.type], [200, 'essai']);
      v('⛔ Bob n\'a reçu que la sentinelle : rien pour son propre message', rienDeNouveau(B1), true);

      /* la sourdine : Bob coupe la conversation ; Alice écrit ; Bob ne reçoit rien */
      const huit = Date.now() + 8 * 3600000;
      const mu = await B.post('/api/conversations/' + conv.ab + '/prefs', { muet_jusqua: huit });
      v('Bob met la conversation en sourdine 8 h', mu.code, 200);
      vrai('population : la sourdine est enregistrée avec son échéance dans le futur', sql('SELECT muet_jusqua AS m FROM membre WHERE conv = ? AND uid = ?', conv.ab, B.moi.id).m > Date.now());
      await A.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-bbbb0002', texte: 'Alice à Bob, Bob est en sourdine' });
      const es2 = await B.post('/api/push/essai', {});
      const s2 = await suivant(B1);
      v('population : la sentinelle suivante arrive', [es2.code, !!s2 && s2.c.type], [200, 'essai']);
      v('⛔ sourdine : rien pour le message arrivé pendant la sourdine (seule la sentinelle est arrivée)', rienDeNouveau(B1), true);
      /* on lève la sourdine : le message suivant arrive */
      await B.post('/api/conversations/' + conv.ab + '/prefs', { muet_jusqua: 0 });
      await A.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-bbbb0003', texte: 'Alice à Bob, sourdine levée' });
      const apres = await suivant(B1);
      v('sourdine levée → le message suivant arrive à Bob', [!!apres && apres.c.type, !!apres && apres.c.url], ['message', '/#messages/' + conv.ab]);
    }

    console.log('\nL\'acquittement : une page ouverte qui a MONTRÉ l\'événement évite la notification');
    {
      /* Cléo devient contact d'Alice : la conversation Alice-Cléo (conv.ac) sert de second cas */
      const lien = await A.post('/api/contacts/lien', {});
      await C.post('/api/liens/accepter', { code: lien.j.code });
      await suivant(A1); await suivant(A2);   // « Nouveau contact »
      const d = await A.post('/api/conversations/directe', { uid: C.moi.id });
      conv.ac = d.j.conversation.id;
      const fl = await T.flux(A); flux.push(fl);
      const bj = await fl.attendre(e => e.event === 'bonjour');
      vrai('population : le flux d\'Alice est ouvert (l\'événement « bonjour » est arrivé)', !!bj);
      v('/health compte le flux ouvert', (await sante()).flux.ouverts, 1);

      /* (a) Bob écrit dans conv.ab ; la page d'Alice reçoit l'événement et l'ACQUITTE */
      const t0 = Date.now();
      await B.post('/api/conversations/' + conv.ab + '/messages', { cid: 'cid-956-cccc0001', texte: 'acquitté par la page' });
      const e1 = await fl.attendre(x => x.event === 'message' && x.data && x.data.conv === conv.ab && x.data.texte === 'acquitté par la page');
      vrai('population : la page d\'Alice reçoit l\'événement (avec son identifiant de journal)', !!e1 && Number.isInteger(e1.id));
      const ack = await A.post('/api/flux/ack', { gid: e1.id });
      const delaiAck = Date.now() - t0;
      v('l\'acquittement est accepté', [ack.code, ack.j], [200, { ok: true }]);
      vrai('marge mesurée : l\'acquittement part ' + delaiAck + ' ms après le message, pour une fenêtre de ' + ACK_MS + ' ms (au moins 3 fois moins)', delaiAck * 3 < ACK_MS);

      /* (b) Cléo écrit dans conv.ac ; la page d'Alice reçoit l'événement mais n'acquitte PAS */
      const tAvant = Date.now();
      await C.post('/api/conversations/' + conv.ac + '/messages', { cid: 'cid-956-cccc0002', texte: 'non acquitté' });
      const e2 = await fl.attendre(x => x.event === 'message' && x.data && x.data.conv === conv.ac);
      vrai('population : la page reçoit aussi l\'événement de la seconde conversation, sans l\'acquitter', !!e2);
      const p = await suivant(A1, 8000);
      vrai('⛔ page ouverte SANS acquittement → la notification arrive, et pas avant le délai (' + (p ? p.t - tAvant : '?') + ' ms après le geste, pour une fenêtre de ' + ACK_MS + ' ms)', !!p && p.c.url === '/#messages/' + conv.ac && p.t - tAvant >= ACK_MS - 50);
      await suivant(A2);
      /* la conversation ACQUITTÉE précédait l'autre dans la file (même délai, minuteurs dans l'ordre) : si une notification devait partir pour elle, elle est partie AVANT celle de l'autre, donc elle est déjà arrivée */
      const pourConv = (d, id) => recus(d).filter(e => e.t >= t0).map(e => charge(d, e)).filter(c => c.url === '/#messages/' + id).length;
      v('⛔ page ouverte AVEC acquittement → AUCUNE notification pour cette conversation, sur les deux appareils ; une seule pour l\'autre (preuve par sentinelle : elle est arrivée, et elle venait après)', [pourConv(A1, conv.ab), pourConv(A2, conv.ab), pourConv(A1, conv.ac), pourConv(A2, conv.ac)], [0, 0, 1, 1]);

      /* (c) un acquittement « d'avance » est ramené au journal : il n'éteint pas les événements à venir */
      const gros = await A.post('/api/flux/ack', { gid: 999999999 });
      v('un acquittement absurde est accepté mais RAMENÉ au dernier événement du journal', [gros.code, gros.j], [200, { ok: true }]);
      await C.post('/api/conversations/' + conv.ac + '/messages', { cid: 'cid-956-cccc0003', texte: 'après l\'acquittement d\'avance' });
      const p3 = await suivant(A1, 8000);
      v('⛔ le message suivant n\'est PAS étouffé par l\'acquittement d\'avance : la notification arrive', [!!p3, p3 && p3.c.url], [true, '/#messages/' + conv.ac]);
      await suivant(A2);
      v('un gid négatif ou fractionnaire ou absent → 400', [(await A.post('/api/flux/ack', { gid: -1 })).code, (await A.post('/api/flux/ack', { gid: 1.5 })).code, (await A.post('/api/flux/ack', {})).code, (await A.post('/api/flux/ack', { gid: '3' })).code], [400, 400, 400, 400]);

      /* (d) la page se ferme : plus de flux → la notification part sans attendre. Sentinelle d'ordre : Cléo a, elle, un flux ouvert (elle attend), Alice non. */
      fl.fermer();
      await T.attendre(async () => (await sante()).flux.ouverts === 0, 8000, 20);
      v('population : plus aucun flux ouvert', (await sante()).flux.ouverts, 0);
      const flC = await T.flux(C); flux.push(flC);
      await flC.attendre(e => e.event === 'bonjour');
      /* un groupe Bob + Alice + Cléo : Bob doit être contact de Cléo (lien) */
      const lb = await B.post('/api/contacts/lien', {});
      await C.post('/api/liens/accepter', { code: lb.j.code });
      const g = await B.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [A.moi.id, C.moi.id] });
      conv.g = g.j.conversation.id;
      v('population : le groupe « Chantier Nord » existe avec ses trois membres', [g.code, g.j.conversation.membres_n], [201, 3]);
      const ga = await suivant(A1), gc = await suivant(C1);
      vrai('population : Alice (sans page ouverte) reçoit tout de suite « ajouté à un groupe »', !!ga);
      v('⛔ ajout à un groupe : charge minimale, sans le nom du groupe ni celui de Bob', [ga.c.type, ga.c.corps, JSON.stringify(ga.c).includes('Chantier'), JSON.stringify(ga.c).includes('Bob')], ['groupe', 'Vous avez été ajouté à un groupe', false, false]);
      v('l\'ajout ouvre le groupe (url et étiquette)', [ga.c.url, ga.c.tag], ['/#messages/' + conv.g, 'groupe:' + conv.g]);
      vrai('⛔ Cléo a une page ouverte qui n\'acquitte pas : la notification est arrivée APRÈS celle d\'Alice (qui n\'attend personne)', !!gc && gc.t >= ga.t);
      /* le message du groupe, aperçu activé chez Alice */
      await A.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      await B.post('/api/conversations/' + conv.g + '/messages', { cid: 'cid-956-dddd0001', texte: 'Réunion à 8 h' });
      const gm = await suivant(A1);
      v('aperçu dans un groupe : « auteur · groupe » en titre, le message en corps', [gm.c.titre, gm.c.corps], ['Bob Durand · Chantier Nord', 'Réunion à 8 h']);
      await suivant(A2);
      const gmc = await suivant(C1);
      v('Cléo (aperçu non activé) reçoit la charge minimale', [gmc.c.corps, JSON.stringify(gmc.c).includes('Réunion')], ['Nouveau message', false]);
      await A.post('/api/moi/maj', { prefs: { apercu_notif: false } });
      flC.fermer();
    }

    console.log('\nCe que la notification RELIT en partant : le texte d\'AUJOURD\'HUI, un blocage posé entre-temps, un lot dont le dernier est supprimé (gardien, 3 octobre 2026)');
    {
      /* Alice a un flux ouvert qui n'acquitte rien : chaque notification attend sa fenêtre (ACK_MS) puis se re-juge au moment de partir */
      await A.post('/api/moi/maj', { prefs: { apercu_notif: true } });
      const fl = await T.flux(A); flux.push(fl);
      vrai('population : le flux d\'Alice est ouvert', !!(await fl.attendre(e => e.event === 'bonjour')));
      const ecrit = async (cl, c, texte) => {
        const r = await cl.post('/api/conversations/' + c + '/messages', { cid: 'cid-956-' + crypto.randomBytes(6).toString('hex'), texte });
        if (r.code !== 201) throw new Error('message refusé : ' + r.code);
        return r.j.seq;
      };
      /* (a) corrigé pendant l'attente : la notification porte le texte d'AUJOURD'HUI */
      const sA = await ecrit(B, conv.ab, 'CANARI-AVANT-CORRECTION');
      const mo = await B.post('/api/conversations/' + conv.ab + '/messages/modifier', { seq: sA, texte: 'CANARI-APRES-CORRECTION' });
      v('Bob corrige son message dans la fenêtre → 200', mo.code, 200);
      const nA = await suivant(A1, 8000);
      vrai('population : la notification arrive (après la fenêtre)', !!nA);
      v('⛔ elle porte la version d\'AUJOURD\'HUI, pas celle de l\'envoi — et l\'ancienne n\'est nulle part dans la charge', [nA.c.corps, JSON.stringify(nA.c).includes('AVANT-CORRECTION')], ['CANARI-APRES-CORRECTION', false]);
      await suivant(A2);
      /* (b) bloqué pendant l'attente. SENTINELLE : le message de Cléo, écrit APRÈS le blocage, attend la même fenêtre (sa minuterie est posée après celle de Bob) — il arrive, celui de Bob serait arrivé avant */
      await ecrit(B, conv.ab, 'CANARI-ENVOYE-AVANT-BLOCAGE');
      v('Alice bloque Bob dans la fenêtre → 200', (await A.post('/api/contacts/bloquer', { uid: B.moi.id })).code, 200);
      await ecrit(C, conv.ac, 'sentinelle, après le blocage');
      const sent = await suivant(A1, 8000);
      vrai('population : la sentinelle (le message de Cléo, écrit après) est arrivée', !!sent && sent.c.url === '/#messages/' + conv.ac);
      await suivant(A2);
      await T.dort(400);
      v('⛔ ...et RIEN pour le message de Bob, écrit avant le blocage : seule la sentinelle est arrivée', rienDeNouveau(A1), true);
      v('Alice débloque Bob', (await A.post('/api/contacts/debloquer', { uid: B.moi.id })).code, 200);
      /* (c) un lot : le DERNIER message est supprimé « pour tous » dans la fenêtre — le précédent, encore valable, notifie */
      await ecrit(B, conv.ab, 'CANARI-LOT-UN');
      await ecrit(B, conv.ab, 'CANARI-LOT-DEUX');
      const sT = await ecrit(B, conv.ab, 'CANARI-LOT-TROIS');
      v('Bob supprime « pour tous » le dernier message du lot, dans la fenêtre → 200', (await B.post('/api/conversations/' + conv.ab + '/messages/supprimer', { seq: sT, pour: 'tous' })).code, 200);
      const nC = await suivant(A1, 8000);
      vrai('population : une notification arrive', !!nC);
      v('⛔ elle décrit le plus récent message encore valable (le deuxième) : la suppression du dernier n\'étouffe pas le lot, et son texte ne part pas', [nC.c.corps, JSON.stringify(nC.c).includes('LOT-TROIS')], ['CANARI-LOT-DEUX', false]);
      await suivant(A2);
      await T.dort(400);
      v('   et une seule pour tout le lot', rienDeNouveau(A1), true);
      /* (d) la sourdine posée PENDANT l'attente est respectée de bout en bout (sentinelle : le message de Cléo, écrit après) */
      await ecrit(B, conv.ab, 'CANARI-AVANT-SOURDINE');
      v('Alice met la conversation en sourdine dans la fenêtre → 200', (await A.post('/api/conversations/' + conv.ab + '/prefs', { muet_jusqua: Date.now() + 3600000 })).code, 200);
      await ecrit(C, conv.ac, 'sentinelle, après la sourdine');
      const sd = await suivant(A1, 8000);
      vrai('population : la sentinelle est arrivée', !!sd && sd.c.url === '/#messages/' + conv.ac);
      await suivant(A2);
      await T.dort(400);
      v('⛔ ...et RIEN pour le message de Bob, écrit avant la sourdine : la notification est re-jugée au moment de partir', rienDeNouveau(A1), true);
      await A.post('/api/conversations/' + conv.ab + '/prefs', { muet_jusqua: 0 });
      /* (e) quitter le groupe PENDANT l'attente : rien ne part pour un groupe qu'on a quitté */
      await ecrit(B, conv.g, 'CANARI-AVANT-DEPART');
      v('Alice quitte le groupe dans la fenêtre → 200', (await A.post('/api/conversations/' + conv.g + '/quitter', {})).code, 200);
      await ecrit(C, conv.ac, 'sentinelle, après le départ');
      const sq = await suivant(A1, 8000);
      vrai('population : la sentinelle est arrivée', !!sq && sq.c.url === '/#messages/' + conv.ac);
      await suivant(A2);
      await T.dort(400);
      v('⛔ ...et RIEN pour le message du groupe quitté', rienDeNouveau(A1), true);
      await A.post('/api/moi/maj', { prefs: { apercu_notif: false } });
      fl.fermer();
      await T.attendre(async () => (await sante()).flux.ouverts === 0, 8000, 20);
    }

    console.log('\nLes pannes du service push : 404 et 410 retirent tout de suite ; 500, redirection, silence, 403 ne retirent JAMAIS ; un refus 400 ne retire qu\'après deux de suite ET une durée');
    {
      const cG = dev('cleo-gone'), c404 = dev('cleo-404'), c5 = dev('cleo-500'), cR = dev('cleo-redir'), cS = dev('cleo-silence'), c4 = dev('cleo-400'), cF = dev('cleo-403');
      const STATUTS = { [cG.chemin]: 410, [c404.chemin]: 404, [c5.chemin]: 500, [cR.chemin]: { redirige: fps.base + '/leak' }, [cS.chemin]: 'silence', [c4.chemin]: 400, [cF.chemin]: 403 };
      fps.statut = (e) => STATUTS[e.chemin] || 201;
      for (const d of [cG, c404, c5, cR, c4, cF]) await abonner(C, d);
      v('population : Cléo a sept appareils (le sien sain et six qui échouent chacun à sa façon)', abosDe(C.moi.id), 7);
      /* les lignes de Cléo, de la plus récente à la plus ancienne : cF (403), c4 (400), cR, c5 — le nombre de refus comptés de chacune */
      const refusDe = (rang) => sql('SELECT echecs FROM push WHERE uid = ? ORDER BY id DESC LIMIT 1 OFFSET ?', C.moi.id, rang).echecs;
      const avantOk = (await sante()).push;
      const r1 = await C.post('/api/push/essai', {});
      v('l\'essai dit combien ont REÇU : un seul sur sept', [r1.j.appareils, r1.j.envoyes], [7, 1]);
      v('⛔ 404 (le service push ne connaît pas cet appareil) et 410 Gone (il n\'existe plus) : les deux abonnements sont retirés tout de suite (cinq restent)', abosDe(C.moi.id), 5);
      const r2 = await C.post('/api/push/essai', {});
      v('deuxième essai, aussitôt : le 400 est compté DEUX fois (le seuil) mais pas encore retiré — une série serrée n\'est pas un abonnement mort ; le 403, le 500 et la redirection ne sont pas comptés du tout',
        [r2.j.appareils, r2.j.envoyes, abosDe(C.moi.id), refusDe(1), [refusDe(0), refusDe(2), refusDe(3)]], [5, 1, 5, 2, [0, 0, 0]]);
      await abonner(C, cS);                                                // un appareil MUET : le service push ne répond jamais (le délai est de trois secondes)
      await T.dort(1700);                                                  // la série du 400 dure maintenant plus que `etalementMs` (1,5 s)
      const r3 = await C.post('/api/push/essai', {});
      v('⛔ troisième essai, plus d\'une seconde et demie après le premier refus : le 400 (DEUX refus de suite sur plus que l\'étalement) est retiré — et SEUL lui (le muet, lui, a attendu son délai)', [r3.j.appareils, abosDe(C.moi.id)], [6, 5]);
      v('⛔ 500 (panne), redirection, silence (délai) et 403 (nos clés refusées) sont toujours là — ils ne retirent jamais ; le 400, le 410 et le 404 sont partis (retirer chacun rend 0)',
        await Promise.all([c5, cR, cS, cF, c4, cG, c404].map(async d => (await C.post('/api/push/desabonner', { endpoint: d.sub.endpoint })).j.retire)), [1, 1, 1, 1, 0, 0, 0]);
      v('⛔ la redirection n\'a JAMAIS été suivie : le faux service n\'a vu aucune requête vers /leak', fps.envois.filter(e => e.chemin === '/leak').length, 0);
      vrai('population : la redirection a bien été répondue (le point d\'accès a été appelé avant)', fps.envois.filter(e => e.chemin === cR.chemin).length >= 3);
      const h = await sante();
      v('/health.push.echecs24h compte tous les échecs : quatre appareils qui échouent aux deux premiers essais, cinq au troisième (le muet) ; un 410 n\'est PAS un échec (un appareil qui disparaît est normal)', h.push.echecs24h - avantOk.echecs24h, 13);
      v('⛔ /health.push.refuses24h compte à part les refus de NOS clés (le 403, trois essais) : la surveillance crie dessus', h.push.refuses24h - avantOk.refuses24h, 3);
      fps.statut = 201;
    }

    console.log('\nAccès coupé et « Déconnecter les autres appareils » : les abonnements partent aussi');
    {
      /* Alice a deux appareils ; elle demande de déconnecter les autres depuis A1 */
      const avantA = abosDe(A.moi.id);
      const deco = await A.post('/api/moi/appareils/deconnecter', { endpoint: A1.sub.endpoint });
      v('« Déconnecter les autres appareils » depuis A1 : A2 est retiré, A1 reste', [deco.code, deco.j.notifications, abosDe(A.moi.id), avantA], [200, 1, 1, 2]);
      v('⛔ le point d\'accès gardé est bien celui de A1 (le retirer rend 1), celui de A2 n\'existe plus (le retirer rend 0)', [(await A.post('/api/push/desabonner', { endpoint: A2.sub.endpoint })).j.retire, (await A.post('/api/push/desabonner', { endpoint: A1.sub.endpoint })).j.retire], [0, 1]);
      await abonner(A, A1);
      /* sans point d'accès : tous partent (la page se réabonne) */
      await abonner(A, A2);
      const deco2 = await A.post('/api/moi/appareils/deconnecter', {});
      v('sans point d\'accès donné : TOUS les abonnements sont retirés (un téléphone perdu ne reçoit plus rien)', [deco2.j.notifications, abosDe(A.moi.id)], [2, 0]);
      await abonner(A, A1);

      /* l'accès de Bob est coupé dans la Tour : sa session ET ses abonnements partent à la relecture */
      v('population : Bob a un appareil abonné et une session valide', [abosDe(B.moi.id), (await B.get('/api/moi')).code], [1, 200]);
      og.comptes.bob.actif = false;
      const parti = await T.attendre(async () => abosDe(B.moi.id) === 0 && (await B.get('/api/moi')).code === 401, 8000, 50);
      v('⛔ accès bêta coupé : la session est coupée ET ses abonnements push sont retirés', !!parti, true);
      og.comptes.bob.actif = true;
    }

    console.log('\nUne session EXPIRÉE ne laisse pas un téléphone recevoir — et un accès coupé PENDANT l\'expiration retire quand même l\'abonnement (gardien, 3 octobre 2026)');
    {
      /* Un service à part (sa base, son horloge décalable) : Eve s'abonne puis ne revient plus, Cléo (la sentinelle) revient, Dan écrit. 31 jours passent : toutes les sessions sont échues. */
      const JOUR = 86400000;
      const d3 = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-956d-'));
      const s3 = await T.lancerService({ dossier: d3, urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, horloge: true, config: { push: PUSH_CFG, beta: { relectureMs: 400 } } });
      const sql3 = (req, ...args) => { const d = T.lireBase(path.join(s3.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
      const abos3 = (uid) => sql3('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uid).n;
      try {
        const co = (nom) => T.connecter(s3, og, nom, MDP[nom]);
        const E = await co('eve'), K = await co('cleo'), W = await co('dan');
        const dE = dev('eve-expiree'), dK = dev('cleo-sentinelle');
        await E.post('/api/push/abonner', { sub: dE.sub }); await K.post('/api/push/abonner', { sub: dK.sub });
        for (const x of [E, K]) { const l = await W.post('/api/contacts/lien', {}); const r = await x.post('/api/liens/accepter', { code: l.j.code }); if (r.code !== 200) throw new Error('lien refusé (' + r.code + ')'); }
        const g = (await W.post('/api/conversations/groupe', { nom: 'Banc expiration', membres: [E.moi.id, K.moi.id] })).j.conversation.id;
        let i = 0;
        const ecrire = async (cl) => { const r = await cl.post('/api/conversations/' + g + '/messages', { texte: 'expiration ' + (++i), cid: 'cid-exp-' + i + '-abcdefgh' }); if (r.code !== 201) throw new Error('message refusé (' + r.code + ')'); };
        await ecrire(W);
        /* ce qui est arrivé jusque-là est VU : l'ajout au groupe a aussi notifié (un envoi de plus que le message) — le banc attend la notification du MESSAGE, puis prend la base */
        const recuMessage = (d) => recus(d).some(e => charge(d, e).type === 'message');
        const arrive = (d) => T.attendre(() => recus(d).length > d.lus, 8000, 20);
        const avant = await T.attendre(() => recuMessage(dE) && recuMessage(dK), 8000, 20);
        dE.lus = recus(dE).length; dK.lus = recus(dK).length;
        v('population : tant que leurs sessions vivent, Eve ET Cléo reçoivent le message de Dan', !!avant, true);

        s3.avancer(31 * JOUR);        // les sessions de trente jours sont échues, chez tout le monde
        const vieux = await E.get('/api/moi');
        v('population : le vieux cookie d\'Eve ne passe plus (session échue) alors que son abonnement est toujours là', [vieux.code, abos3(E.moi.id)], [401, 1]);
        await co('cleo'); const W2 = await co('dan');      // Cléo et Dan reviennent ; Eve non
        await ecrire(W2);
        const sentinelle = await arrive(dK);
        vrai('population : la sentinelle (Cléo, reconnectée) reçoit le message — le service push fonctionne, la route aussi', !!sentinelle);
        v('⛔ Eve, dont la session est échue et que rien d\'autre ne connecte, ne reçoit RIEN (avant : elle recevait tout, sur un téléphone peut-être revendu)', rienDeNouveau(dE), true);
        v('   son abonnement est encore en base (le balayeur n\'a pas passé : c\'est le jugement à l\'envoi qui l\'a protégée)', abos3(E.moi.id), 1);

        /* l'accès d'Eve est COUPÉ dans la Tour pendant que sa session est échue : la relecture doit quand même le voir (avant : seules les sessions vivantes étaient relues) */
        og.comptes.eve.actif = false;
        const retire = await T.attendre(() => abos3(E.moi.id) === 0, 8000, 50);
        v('⛔ accès bêta COUPÉ pendant l\'expiration : la relecture retire l\'abonnement d\'Eve (elle a un abonnement, pas de session) ; celui de Cléo reste', [!!retire, abos3(E.moi.id), abos3(K.moi.id)], [true, 0, 1]);
        og.comptes.eve.actif = true;

        /* elle revient : sa page redit son abonnement, tout repart */
        const E2 = await co('eve');
        await E2.post('/api/push/abonner', { sub: dE.sub });
        await ecrire(W2);
        const revenue = await arrive(dE);
        v('   Eve revient (accès rouvert), sa page redit son abonnement : elle reçoit de nouveau — rien n\'est perdu pour qui revient', [!!revenue, abos3(E2.moi.id)], [true, 1]);
      } finally { og.comptes.eve.actif = true; await s3.arreter(); try { fs.rmSync(d3, { recursive: true, force: true }); } catch (e) { /* tant pis */ } }
    }

    console.log('\nLe balayeur retire les abonnements d\'une personne que plus rien ne connecte (le câblage d\'index.js : la fonction du magasin seule ne suffit pas)');
    {
      const JOUR = 86400000;
      const d4 = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-956e-'));
      const s4 = await T.lancerService({ dossier: d4, urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, horloge: true, config: { push: PUSH_CFG, balayageMs: 120 } });
      const abos4 = (uid) => { const d = T.lireBase(path.join(s4.data, 'msg.db')); try { return d.prepare('SELECT COUNT(*) AS n FROM push WHERE uid = ?').get(uid).n; } finally { d.close(); } };
      try {
        const E = await T.connecter(s4, og, 'eve', MDP.eve), K = await T.connecter(s4, og, 'cleo', MDP.cleo);
        await E.post('/api/push/abonner', { sub: dev('eve-balayee').sub }); await K.post('/api/push/abonner', { sub: dev('cleo-balayee').sub });
        v('population : Eve et Cléo ont chacune un abonnement et une session vivante', [abos4(E.moi.id), abos4(K.moi.id)], [1, 1]);
        s4.avancer(31 * JOUR);                                   // les sessions de trente jours sont échues
        await T.connecter(s4, og, 'cleo', MDP.cleo);             // Cléo revient ; Eve non
        const retire = await T.attendre(() => abos4(E.moi.id) === 0, 10000, 50);
        v('⛔ le balayeur du SERVICE retire l\'abonnement d\'Eve (plus rien ne la connecte) et GARDE celui de Cléo (reconnectée)', [!!retire, abos4(K.moi.id)], [true, 1]);
        /* ⛔ ON ATTEND LA LIGNE, on ne la lit pas tout de suite (4 octobre 2026, `Vérification des pages` sur 864aeb1 : 174 ✓ 1 ✗). Le service
           RETIRE puis JOURNALISE (`index.js`, balayeur) : la base montre le retrait avant que la ligne ait traversé le tuyau jusqu'à ce
           banc — et le rappel de `T.attendre` qui voit la base passe AVANT que la boucle d'événements lise ce qui attend dans le tuyau.
           Sur la machine de GitHub, plus rapide, la ligne arrivait après le contrôle. Prouvé en retardant la ligne de 300 ms : l'ancien
           contrôle tombe, celui-ci passe. */
        const ligne = await T.attendre(() => /"evt":"push_elagage"[^\n]*"n":1/.test(s4.sortie.texte()), 8000, 20);
        vrai('le journal le dit : une ligne « push_elagage » avec le nombre retiré, sans personne ni point d\'accès', !!ligne && !s4.sortie.texte().includes('eve-balayee'));
      } finally { await s4.arreter(); try { fs.rmSync(d4, { recursive: true, force: true }); } catch (e) { /* tant pis */ } }
    }

    console.log('\nSe déconnecter emporte l\'abonnement de CET appareil — et seulement un abonnement de la personne qui se déconnecte');
    {
      const C3 = await connecte('cleo');
      const cl1 = dev('cleo-logout-1'), cl2 = dev('cleo-logout-2');
      await abonner(C3, cl1); await abonner(C3, cl2);
      const avantC = abosDe(C.moi.id), avantA = abosDe(A.moi.id);
      vrai('population : Cléo a ses deux appareils de plus, Alice en a un', avantC >= 2 && avantA === 1);
      const D2 = await connecte('dan');
      const autre = await D2.post('/api/compte/deconnexion', { endpoint: A1.sub.endpoint });
      v('⛔ Dan se déconnecte en donnant le point d\'accès d\'ALICE : sa session finit, l\'appareil d\'Alice reste', [autre.code, (await D2.get('/api/moi')).code, abosDe(A.moi.id)], [200, 401, avantA]);
      const sans = await C3.post('/api/compte/deconnexion', { endpoint: cl1.sub.endpoint });
      v('⛔ Cléo se déconnecte en donnant son point d\'accès : la session ET cet abonnement partent, l\'autre appareil de Cléo reste', [sans.code, (await C3.get('/api/moi')).code, abosDe(C.moi.id), (await C.post('/api/push/desabonner', { endpoint: cl2.sub.endpoint })).j.retire], [200, 401, avantC - 1, 1]);
      const C4 = await connecte('cleo');
      const nu = await C4.post('/api/compte/deconnexion', {});
      v('(sans point d\'accès, la déconnexion marche comme avant : la session seule)', [nu.code, (await C4.get('/api/moi')).code], [200, 401]);
    }

    console.log('\nLa vie privée : le point d\'accès et les clés ne se lisent nulle part');
    {
      const ep = A1.sub.endpoint, jeton = 'alice-1';
      vrai('population : le point d\'accès d\'Alice est bien inscrit (une ligne en base)', abosDe(A.moi.id) === 1);
      v('⛔ le point d\'accès n\'est PAS en clair dans la base (scellé) : ni l\'adresse entière, ni son jeton', [dansBase(ep), dansBase('/push/' + jeton)], [false, false]);
      v('⛔ les clés de l\'appareil (p256dh, auth) ne sont pas en clair dans la base', [dansBase(A1.sub.keys.p256dh), dansBase(A1.sub.keys.auth), dansBase(A1.publique), dansBase(A1.auth)], [false, false, false, false]);
      const j = svc.sortie.texte();
      v('⛔ le journal du service ne porte ni point d\'accès, ni clé, ni texte de message, ni nom', [j.includes('/push/'), j.includes(A1.sub.keys.p256dh), j.includes(A1.sub.keys.auth), j.includes('secret-9QX'), j.includes('Alice'), j.includes('Durand'), j.includes(PAIRE.priv)], [false, false, false, false, false, false, false]);
      v('⛔ /health ne porte aucun point d\'accès (des nombres seulement)', JSON.stringify(await sante()).includes('/push/'), false);
      v('/health.push : exactement cinq champs (actif, abonnements, envoyes24h, echecs24h, refuses24h)', Object.keys((await sante()).push).sort(), ['abonnements', 'actif', 'echecs24h', 'envoyes24h', 'refuses24h']);
      const cfg = await T.client(base()).get('/api/config');
      v('/api/config ne publie que la clé PUBLIQUE', JSON.stringify(cfg.j).includes(PAIRE.priv), false);
      v('/api/config dit le délai de suppression d\'un compte (la page le LIT, elle ne le recopie pas)', cfg.j.limites.suppression_jours, 14);
    }

    console.log('\nLes fichiers servis : le service worker, le manifeste, la politique de la page');
    {
      const c = T.client(base());
      const sw = await c.get('/sw.js');
      v('/sw.js est servi, en JavaScript, sans cache', [sw.code, /javascript/.test(sw.h.get('content-type')), sw.h.get('cache-control')], [200, true, 'no-cache']);
      vrai('⛔ le service worker servi n\'écoute pas fetch et ne touche à aucun cache (il ne peut pas servir une page périmée)', !/addEventListener\(\s*['"]fetch['"]|\bcaches\b|\bimportScripts\b/.test(T.sansCommentaires(sw.txt)) && /addEventListener\(\s*['"]push['"]/.test(sw.txt));
      const mf = await c.get('/manifest.webmanifest');
      v('/manifest.webmanifest est servi avec un type de manifeste', [mf.code, /manifest\+json|application\/json/.test(mf.h.get('content-type'))], [200, true]);
      v('le manifeste dit « OP MESSAGES », standalone, démarre sur « / »', [mf.j.name, mf.j.display, mf.j.start_url, mf.j.scope], ['OP MESSAGES', 'standalone', '/', '/']);
      const icones = await Promise.all(mf.j.icons.map(i => c.get('/' + i.src)));
      v('toutes les icônes du manifeste sont servies, en PNG', icones.map(i => [i.code, i.h.get('content-type')]), mf.j.icons.map(() => [200, 'image/png']));
      const page = await c.get('/');
      const csp = page.h.get('content-security-policy') || '';
      v('⛔ la politique de la réponse DIT worker-src et manifest-src (sans eux, le manifeste retombe sur default-src none et serait refusé)', [/worker-src 'self'/.test(csp), /manifest-src 'self'/.test(csp)], [true, true]);
      v('la page déclare son manifeste et son icône d\'écran d\'accueil (les notifications ne s\'accordent sur iPhone qu\'à une page ajoutée à l\'écran d\'accueil)', [/<link rel="manifest" href="manifest\.webmanifest">/.test(page.txt), /<link rel="apple-touch-icon" href="opmsg-apple-touch\.png">/.test(page.txt)], [true, true]);
    }

    console.log('\nLe redémarrage : la même clé, les mêmes abonnements, la première paire GAGNE');
    {
      const avant = [abosTous(), (await T.client(base()).get('/api/config')).j.push.vapid];
      await svc.arreter();
      /* sans paire dans la configuration : celle de la base sert */
      svc = await demarrer({ config: { push: PUSH_CFG, beta: { relectureMs: 3600000 } } });
      const apres = [abosTous(), (await T.client(base()).get('/api/config')).j.push.vapid];
      v('⛔ après redémarrage SANS paire dans la configuration : la clé publique est la MÊME, les abonnements sont tous là', apres, avant);
      vrai('population : le journal de ce démarrage est lu (la ligne « push_vapid » y est) — et il ne dit rien de différent quand la configuration n\'a pas de paire', /"evt":"push_vapid"/.test(svc.sortie.texte()) && !/"etat":"differe"/.test(svc.sortie.texte()));
      await svc.arreter();
      /* une AUTRE paire dans la configuration : la première posée gagne (changer de clé ferait refuser tous les envois) */
      svc = await demarrer({ config: { push: PUSH_CFG, beta: { relectureMs: 3600000 }, vapidPublicKey: PAIRE2.pub, vapidPrivateKey: PAIRE2.priv } });
      v('⛔ une autre paire dans la configuration ne remplace PAS celle de la base', (await T.client(base()).get('/api/config')).j.push.vapid, PAIRE.pub);
      vrai('population : l\'autre paire existe bien (elle est différente)', PAIRE2.pub !== PAIRE.pub);
      /* R9 : ...et le service le DIT (l'installation croit sinon avoir changé de paire) — l'empreinte courte des deux clés PUBLIQUES, jamais une clé */
      const jDiff = svc.sortie.texte();
      const empreinte = (k) => crypto.createHash('sha256').update(k).digest('hex').slice(0, 8);
      v('⛔ le journal de ce démarrage DIT que la paire de l\'installation diffère de celle de la base, avec l\'empreinte courte des deux clés publiques', [/"evt":"push_vapid","etat":"differe"/.test(jDiff), jDiff.includes('base ' + empreinte(PAIRE.pub)), jDiff.includes('installation ' + empreinte(PAIRE2.pub))], [true, true, true]);
      v('⛔ ...sans jamais écrire une clé : ni les deux publiques, ni les deux privées', [PAIRE.pub, PAIRE2.pub, PAIRE.priv, PAIRE2.priv].map(k => jDiff.includes(k)), [false, false, false, false]);
      await svc.arreter();
      /* une installation neuve, sans paire : le service en fabrique une, et la garde */
      const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-956b-'));
      let s2 = await T.lancerService({ dossier: d2, urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: PUSH_CFG } });
      try {
        const k1 = (await T.client(s2.base).get('/api/config')).j.push.vapid;
        vrai('une installation neuve fabrique sa paire (point P-256 de 65 octets)', typeof k1 === 'string' && Buffer.from(k1, 'base64url').length === 65);
        const cleD2 = s2.cle;
        await s2.arreter();
        s2 = await T.lancerService({ dossier: d2, cle: cleD2, urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: PUSH_CFG } });
        v('⛔ elle redémarre avec la MÊME paire (sinon tous les abonnements seraient refusés par les services push)', (await T.client(s2.base).get('/api/config')).j.push.vapid, k1);
      } finally { await s2.arreter(); try { fs.rmSync(d2, { recursive: true, force: true }); } catch (e) { /* tant pis */ } }
    }

    console.log('\nLes démarrages REFUSÉS : la porte de banc en production, une paire incohérente, une adresse qui n\'est pas la boucle locale');
    {
      const refuse = async (titre, opts, motif) => {
        const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-956c-'));
        let s = null, msg = '';
        try {
          s = await T.lancerService(Object.assign({ dossier: d, urlGestion: og.url, attendreSante: false, config: { push: PUSH_CFG } }, opts));
          await T.attendre(() => s.sorti() !== null, 8000, 20);
          msg = s.sortie.texte();
          vrai('⛔ ' + titre + ' → le démarrage est REFUSÉ (le processus sort en erreur, avec le motif)', s.sorti() !== null && s.sorti() !== 0 && motif.test(msg));
          if (!(s.sorti() !== null && s.sorti() !== 0 && motif.test(msg))) console.log('      sortie : ' + msg.slice(0, 300));
        } finally { if (s) await s.arreter(); try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* tant pis */ } }
      };
      await refuse('la porte de banc OPMSG_TEST_PUSH en PRODUCTION', { instance: 'prod', env: { OPMSG_TEST_PUSH: fps.hote } }, /OPMSG_TEST_PUSH.*production/);
      await refuse('la porte de banc vers une adresse qui n\'est pas la boucle locale', { env: { OPMSG_TEST_PUSH: '10.0.0.1:80' } }, /OPMSG_TEST_PUSH doit valoir 127\.0\.0\.1/);
      await refuse('la porte de banc avec un port qui n\'en est pas un', { env: { OPMSG_TEST_PUSH: '127.0.0.1:abc' } }, /OPMSG_TEST_PUSH doit valoir/);
      await refuse('une clé privée qui n\'est pas celle de la publique', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: PUSH_CFG, vapidPublicKey: PAIRE.pub, vapidPrivateKey: PAIRE2.priv } }, /n'est pas celle de la publique/);
      await refuse('une seule des deux clés VAPID', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: PUSH_CFG, vapidPublicKey: PAIRE.pub } }, /vont ensemble/);
      await refuse('une clé VAPID qui n\'a pas la bonne taille', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: PUSH_CFG, vapidPublicKey: 'AAAA', vapidPrivateKey: 'BBBB' } }, /bonne forme/);
      await refuse('un contact VAPID « localhost » (le service push d\'Apple le refuse)', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: Object.assign({}, PUSH_CFG, { contact: 'https://localhost:8443' }) } }, /ne peut pas être « localhost »/);
      await refuse('un contact VAPID qui n\'est ni un courriel ni une origine https', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: Object.assign({}, PUSH_CFG, { contact: 'pas une adresse' }) } }, /adresse de courriel ou une origine https/);
      await refuse('un délai d\'acquittement absurde (0)', { env: { OPMSG_TEST_PUSH: fps.hote }, config: { push: Object.assign({}, PUSH_CFG, { ackMs: 0 }) } }, /push\.ackMs/);
      /* ⛔ R8 : la porte de banc n'est refusée qu'en PRODUCTION — l'instance `beta` l'ACCEPTE (c'est ainsi que les bancs la posent). Une unité systemd de bêta qui la porterait ouvrirait donc l'envoi vers une adresse
         locale. L'unité est écrite par `install-msg.sh` (un modèle `%i` pour les deux instances, son fichier d'environnement `/etc/opmsg/%i.env` est à la main), le déploiement par `deployer.sh` et le workflow : aucun
         ne doit la nommer. Une phrase de SERVEUR.md n'est pas une garde. */
      {
        const fichiersMsg = ['install-msg.sh', 'deployer.sh'].map(f => path.join(T.SERVICE, f));
        const dossierYml = path.join(T.RACINE, '.github', 'workflows');
        for (const f of fs.readdirSync(dossierYml).filter(x => /messages/.test(x))) fichiersMsg.push(path.join(dossierYml, f));
        const textes = fichiersMsg.map(f => fs.readFileSync(f, 'utf8'));
        vrai('population : les fichiers d\'installation et de déploiement sont lus (le script d\'installation écrit bien l\'unité systemd : « [Service] » et « EnvironmentFile » y sont)', textes.length >= 3 && /\[Service\]/.test(textes[0]) && /EnvironmentFile=/.test(textes[0]) && textes.every(t => t.length > 500));
        v('⛔ aucun fichier d\'installation ni de déploiement ne pose la porte de banc OPMSG_TEST_PUSH (l\'instance bêta l\'ACCEPTE : elle ouvrirait l\'envoi vers une adresse locale)', fichiersMsg.filter((f, i) => textes[i].includes('OPMSG_TEST_PUSH')).map(f => path.basename(f)), []);
      }
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    if (svc) await svc.arreter();
    await og.fermer(); await fps.fermer();
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* tant pis */ }
  }
  fin();
})();
