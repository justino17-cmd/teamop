/* ⛔ CE QUE CE FICHIER GARDE — LES NOTIFICATIONS PUSH, LE MODULE SEUL (famille 8 de SERVEUR.md § 3.11 ; modèle `test-942`).

   `server-msg/push.js` monté avec le VRAI stockage (un fichier de base jetable), le VRAI `web-push`, une horloge, des minuteries et un transport INJECTÉS. Pas de service ici — c'est
   `test-956` qui dit que les routes sont branchées. Celui-ci dit que ce que le module DÉCIDE et ENVOIE est juste :

     · LA LISTE BLANCHE. Un point d'accès push est une adresse que le service appelle à la demande d'un inconnu : sans filtre, c'est une porte vers 127.0.0.1:8080 (OP GESTION, sur la même
       machine) ou le réseau interne. `http`, la boucle locale, les adresses privées (IPv4 et IPv6), un autre port, des identifiants dans l'adresse, un hôte qui RESSEMBLE (`fcm.googleapis.com.evil.fr`,
       `evilpush.apple.com`), les majuscules, le point final, un fragment, un antislash : refusés — et JOUÉS UN PAR UN, précédés de la population des adresses admises (un zéro sur du vide ne prouve rien) ;
     · LA CHARGE QUI PART EST CELLE QU'ON CROIT. Une VRAIE charge chiffrée par `web-push` est DÉCHIFFRÉE ICI avec les clés de l'appareil (RFC 8291) : par défaut « Nouveau message » et l'identifiant de la
       conversation, ni nom ni texte — ils n'y sont qu'avec le réglage « aperçu » de CELUI QUI REÇOIT, lu à l'instant de partir. La signature VAPID est vérifiée contre la clé publique de l'instance ;
     · LA PAIRE VAPID est fabriquée au premier démarrage, rangée avec la clé privée SCELLÉE (rien d'elle en clair dans le fichier), relue à l'identique, adoptée depuis l'installation ; une ligne abîmée désactive
       le push au lieu de le faire tourner de travers ;
     · UNE NOTIFICATION NE DOUBLE PAS UNE PAGE QUI EST SOUS LES YEUX : aucun flux ouvert → elle part tout de suite ; un flux ouvert → elle attend l'acquittement, et rien ne part s'il vient ; page cachée → elle
       part après le délai ; plusieurs événements d'une conversation n'en font qu'une ; sourdine, conversation quittée, message supprimé : rien ne part ;
     · 404 ET 410 RETIRENT L'ABONNEMENT, les autres échecs sont comptés et l'abonnement part au cinquième de suite ; la liste blanche est RE-VÉRIFIÉE à l'envoi ; dix appareils au plus, un appareil pour une seule
       personne ; le transport réel ne suit AUCUNE redirection, tient son délai, refuse une adresse privée derrière un nom admis ;
     · /health : des nombres, jamais un point d'accès, une clé, une personne.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « refusé » est précédé de la population des « admis » du même gabarit, et chaque « rien n'est parti » du témoin « quelque chose part ». */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const P = require('./outils-push');
const { v, vrai, fin } = T.compteur();
/* ⛔ UN BANC QUI SORT AVANT SA FIN N'EST PAS VERT. Ce module est monté avec des minuteries FACTICES que le banc déclenche à la main : une notification qui en attendrait une que personne ne déclenche ne se
   résoudrait jamais, la boucle d'évènements se viderait et le processus sortirait « proprement » en 0, au milieu d'une section, SANS total (pris par la mutation A05 de `mutations-push.js`). Sortir sans être
   allé jusqu'au bout est donc un ✗ qui le dit, imprimé avec le total. */
let termine = false;
process.on('exit', () => { if (termine) return; vrai('⛔ le banc est allé jusqu\'à sa fin (une promesse que rien ne résout vide la boucle : le processus sortait « proprement », sans total)', false); fin(); });
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { pushConfig } = require(path.join(T.SERVICE, 'config.js'));
const PUSH = require(path.join(T.SERVICE, 'push.js'));
const { DatabaseSync } = require('node:sqlite');

const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-955-'));
let n = 0;
const lance = (f) => { try { f(); return null; } catch (e) { return e.code || e.message; } };
const alea = () => crypto.randomBytes(5).toString('hex');
/* ⛔ UNE PAIRE VAPID DE BANC A TOUJOURS UNE CLÉ PRIVÉE DE 32 OCTETS. `ECDH.getPrivateKey()` rend un tampon SANS ses octets nuls de tête : une fois sur 256 la clé fait 31 octets et la configuration la refuse
   (« la paire VAPID n'a pas la bonne forme ») — le banc mourait alors, au hasard (vu à la passe finale des mutations, sur R02, 3 octobre 2026). `web-push` complète ses clés ; le banc, lui, retire jusqu'à en avoir une bonne. */
function paireVapid() {
  for (;;) {
    const e = crypto.createECDH('prime256v1'); e.generateKeys();
    const priv = e.getPrivateKey();
    if (priv.length === 32) return { vapidPublicKey: e.getPublicKey().toString('base64url'), vapidPrivateKey: priv.toString('base64url') };
  }
}
const octets = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };

/* Un monde jetable : stockage réel, hub factice (qui dit combien de flux sont ouverts), transport factice (qui note ce qu'on lui envoie), minuteries à la main. */
function monter(opts = {}) {
  const chemin = path.join(bac, 'push-' + (++n) + '.db');
  const kek = opts.kek || crypto.randomBytes(32);
  const h = { t: 1790000000000 };
  const S = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t });
  const env = opts.testHote ? { OPMSG_TEST_PUSH: opts.testHote } : {};
  const config = { origines: opts.origines === undefined ? ['https://msg.exemple.test'] : opts.origines, push: pushConfig(Object.assign({ push: opts.push || {} }, opts.cfg || {}), env, 'beta') };
  const ouverts = {};
  const hub = { fluxOuverts: (uid) => ouverts[uid] || 0 };
  const envois = [];
  const reponse = { statut: 201, delai: 0 };
  const transport = opts.transport || (async (r) => {
    envois.push({ url: r.url.href, methode: r.method, entetes: r.headers, corps: r.body });
    if (typeof reponse.statut === 'function') return { statut: reponse.statut(r) };
    if (reponse.leve) throw new Error('panne simulée');
    return { statut: reponse.statut };
  });
  const minuteurs = [];
  const planifier = (f, ms) => { const m = { f, ms, annule: false }; minuteurs.push(m); return m; };
  const annuler = (m) => { m.annule = true; };
  const declencher = async () => { const a = minuteurs.splice(0).filter(m => !m.annule); for (const m of a) m.f(); await new Promise(r => setImmediate(r)); await new Promise(r => setTimeout(r, 20)); };
  const journal = [];
  const push = PUSH.creerPush({ stockage: S, hub, config, horloge: () => h.t, journaliser: (e, c) => journal.push([e, c]), transport, planifier, annuler });
  /* ⛔ une personne du banc a une SESSION VIVANTE de trente jours, comme toute personne qui a des abonnements : le service n'envoie plus rien à qui plus rien ne connecte (`pushJoignable`) */
  const pers = (nom, o) => {
    const p = S.personneCreer({ identifiant: 'beta:' + nom + alea(), prenom: nom, nom: 'Banc', origine: (o && o.origine) || 'beta', verifie: true });
    if (!(o && o.sansSession)) S.sessionAjouter({ h: 'sess-' + p.id, personne: p.id, appareil: 'banc', ttlMs: 30 * 86400000 });
    return p;
  };
  /* abonne un appareil de banc (vraies clés) à `uid` ; l'adresse est celle d'un hôte de la liste blanche, ou de la porte de test */
  const abonne = (uid, endpoint) => {
    const app = P.appareil(endpoint || ('https://fcm.googleapis.com/fcm/send/' + alea() + alea()));
    const r = push.abonner(uid, app.sub);
    if (!r.ok) throw new Error('abonnement refusé : ' + r.code);
    return app;
  };
  return { S, h, chemin, kek, push, hub, ouverts, envois, reponse, minuteurs, declencher, journal, pers, abonne, config, brut: () => new DatabaseSync(chemin) };
}
const attente = () => new Promise(r => setTimeout(r, 25));

(async () => {
  /* ══ 1. LA LISTE BLANCHE ═════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('La liste blanche : https, port 443, aucun identifiant, un hôte de la liste — exact ou par suffixe AVEC POINT');
  {
    const admis = [
      'https://fcm.googleapis.com/fcm/send/dZf3-abc:APA91b',
      'https://fcm.googleapis.com/wp/fx9-token_ABC',
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB',
      'https://web.push.apple.com/QCbcGPz-mXx',
      'https://db5p.notify.windows.com/?token=AwYAAAB',
      'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAA',
      'https://a.b.push.services.mozilla.com/x',
    ];
    v('population : la liste blanche admet les services push de Chrome (FCM), Firefox (Mozilla), Safari (Apple) et Windows', admis.map(e => PUSH.analyserEndpoint(e, null).ok), admis.map(() => true));
    const refuses = {
      'http, même vers un hôte de la liste': 'http://fcm.googleapis.com/fcm/send/abc',
      'la boucle locale (OP GESTION écoute sur 127.0.0.1:8080)': 'https://127.0.0.1/x',
      'la boucle locale avec le port d\'OP GESTION': 'https://127.0.0.1:8080/api/x',
      'localhost': 'https://localhost/x',
      'une adresse privée 10/8': 'https://10.0.0.5/x',
      'une adresse privée 192.168/16': 'https://192.168.1.10/x',
      'une adresse privée 172.16/12': 'https://172.16.0.1/x',
      'l\'adresse de métadonnées d\'un hébergeur (lien local)': 'https://169.254.169.254/latest/meta-data/',
      'IPv6 : la boucle locale': 'https://[::1]/x',
      'IPv6 : une adresse locale unique': 'https://[fd00::1]/x',
      'IPv6 : une IPv4 de la boucle locale « mappée »': 'https://[::ffff:127.0.0.1]/x',
      'un port autre que 443 (8443)': 'https://fcm.googleapis.com:8443/fcm/send/abc',
      'un port autre que 443 (80)': 'https://fcm.googleapis.com:80/x',
      'le port 443 écrit explicitement (un navigateur ne l\'écrit jamais ; on ne réécrit rien)': 'https://fcm.googleapis.com:443/fcm/send/abc',
      'des identifiants dans l\'adresse': 'https://user:pass@fcm.googleapis.com/x',
      'un identifiant qui cache la vraie cible': 'https://fcm.googleapis.com@127.0.0.1/x',
      'un mot de passe qui imite l\'hôte': 'https://x:fcm.googleapis.com@127.0.0.1/x',
      'un hôte qui commence comme un hôte de la liste': 'https://fcm.googleapis.com.evil.fr/x',
      'un hôte qui finit presque comme un suffixe (sans point)': 'https://evilpush.apple.com/x',
      'le suffixe nu, sans sous-domaine': 'https://push.apple.com/x',
      'le suffixe de Mozilla nu': 'https://push.services.mozilla.com/x',
      'un suffixe collé à un autre domaine': 'https://push.apple.com.evil.fr/x',
      'un sous-domaine d\'un hôte exact': 'https://x.fcm.googleapis.com/x',
      'le domaine parent de l\'hôte exact': 'https://googleapis.com/x',
      'des majuscules': 'https://FCM.GOOGLEAPIS.COM/fcm/send/abc',
      'des majuscules dans un suffixe': 'https://web.PUSH.apple.com/x',
      'un point final': 'https://fcm.googleapis.com./fcm/send/abc',
      'un point final sur un suffixe': 'https://web.push.apple.com./x',
      'un fragment': 'https://fcm.googleapis.com/x#y',
      'un antislash (le parseur le réécrit en barre)': 'https://fcm.googleapis.com\\@127.0.0.1/x',
      'un espace': 'https://fcm.googleapis.com/x y',
      'un retour à la ligne': 'https://fcm.googleapis.com/x\nHost: evil',
      'une adresse relative au schéma': '//fcm.googleapis.com/x',
      'ftp': 'ftp://fcm.googleapis.com/x',
      'javascript': 'javascript:alert(1)',
      'file': 'file:///etc/passwd',
      'une étiquette invalide (tiret en tête) dans un suffixe': 'https://-x.push.apple.com/x',
      'un nom en Unicode qui imite l\'hôte (le « o » cyrillique)': 'https://fcm.googleapis.cоm/x',
      'une adresse trop longue': 'https://fcm.googleapis.com/' + 'a'.repeat(2100),
      'une adresse vide': '',
      'rien qu\'un mot': 'fcm.googleapis.com',
    };
    const reste = [];
    for (const [nom, e] of Object.entries(refuses)) if (PUSH.analyserEndpoint(e, null).ok) reste.push(nom);
    v('⛔ ' + Object.keys(refuses).length + ' adresses refusées une à une (aucune ne passe)', reste, []);
    vrai('population : la table des refus est peuplée', Object.keys(refuses).length >= 35);
    v('une valeur qui n\'est pas une chaîne est refusée', [undefined, null, 5, {}, [], true].map(e => PUSH.analyserEndpoint(e, null).ok), [false, false, false, false, false, false]);
    v('les raisons sont dites (schéma, port, identifiants, hôte)', [PUSH.analyserEndpoint(refuses['http, même vers un hôte de la liste'], null).raison, PUSH.analyserEndpoint(refuses['un port autre que 443 (8443)'], null).raison,
      PUSH.analyserEndpoint(refuses['des identifiants dans l\'adresse'], null).raison, PUSH.analyserEndpoint(refuses['la boucle locale (OP GESTION écoute sur 127.0.0.1:8080)'], null).raison], ['schema', 'port', 'identifiants', 'hote']);
    /* la porte des bancs n'ouvre QUE l'hôte et le port exacts qu'on lui a donnés */
    const porte = '127.0.0.1:45678';
    v('⛔ la porte de test n\'ouvre que SON hôte et SON port, en http', [PUSH.analyserEndpoint('http://127.0.0.1:45678/push/a', porte).ok, PUSH.analyserEndpoint('http://127.0.0.1:45679/push/a', porte).ok, PUSH.analyserEndpoint('http://127.0.0.1:8080/api', porte).ok,
      PUSH.analyserEndpoint('https://127.0.0.1:45678/push/a', porte).ok, PUSH.analyserEndpoint('http://localhost:45678/push/a', porte).ok], [true, false, false, false, false]);
    vrai('sans la porte, la même adresse est refusée', !PUSH.analyserEndpoint('http://127.0.0.1:45678/push/a', null).ok);
    v('l\'adresse qu\'on appelle est celle qu\'on a analysée (jamais le texte brut)', PUSH.analyserEndpoint(admis[0], null).url.href, admis[0]);
  }

  /* ══ 2. L'ABONNEMENT : des clés qui sont de vraies clés ═══════════════════════════════════════════════════════════════════ */
  console.log('\nL\'abonnement : p256dh = un point de P-256 (65 octets), auth = 16 octets, en base64 URL canonique');
  {
    const bon = P.appareil('https://fcm.googleapis.com/fcm/send/abcdefghij');
    const r = PUSH.validerAbonnement(bon.sub, null);
    v('population : un abonnement bien formé est admis, sous sa forme canonique', [r.ok, r.endpoint, r.p256dh === bon.sub.keys.p256dh, r.auth === bon.sub.keys.auth], [true, bon.sub.endpoint, true, true]);
    const avec = (m) => PUSH.validerAbonnement(Object.assign({}, bon.sub, { keys: Object.assign({}, bon.sub.keys, m) }), null);
    const horsCourbe = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url');
    const nonCompressee = (() => { const k = crypto.createECDH('prime256v1'); k.generateKeys(); return k.getPublicKey(null, 'compressed').toString('base64url'); })();
    const cas = {
      'p256dh trop court': avec({ p256dh: bon.sub.keys.p256dh.slice(0, 40) }),
      'p256dh qui n\'est pas un point de la courbe': avec({ p256dh: horsCourbe }),
      'p256dh compressé (33 octets)': avec({ p256dh: nonCompressee }),
      'p256dh avec du remplissage « = »': avec({ p256dh: bon.sub.keys.p256dh + '=' }),
      'p256dh en base64 classique (+ et /)': avec({ p256dh: Buffer.from('+/'.repeat(33)).toString('base64').slice(0, 87) }),
      'auth de 15 octets': avec({ auth: crypto.randomBytes(15).toString('base64url') }),
      'auth de 17 octets': avec({ auth: crypto.randomBytes(17).toString('base64url') }),
      'auth absent': avec({ auth: undefined }),
      'p256dh absent': avec({ p256dh: undefined }),
      'auth non texte': avec({ auth: 12345 }),
    };
    v('⛔ les clés mal formées sont refusées une à une (champ_invalide)', Object.entries(cas).filter(([, x]) => x.ok || x.code !== 'champ_invalide').map(([k]) => k), []);
    v('sans clés : refusé ; sans point d\'accès : refusé ; ni objet ni tableau : refusé', [PUSH.validerAbonnement({ endpoint: bon.sub.endpoint }, null).ok, PUSH.validerAbonnement({ keys: bon.sub.keys }, null).ok, PUSH.validerAbonnement(null, null).ok, PUSH.validerAbonnement([bon.sub], null).ok, PUSH.validerAbonnement('x', null).ok], [false, false, false, false, false]);
    v('un hôte hors de la liste est dit autrement qu\'une forme invalide (la page peut l\'expliquer)', [PUSH.validerAbonnement(Object.assign({}, bon.sub, { endpoint: 'https://evil.example/x' }), null).code, PUSH.validerAbonnement(Object.assign({}, bon.sub, { endpoint: 'http://fcm.googleapis.com/x' }), null).code, PUSH.validerAbonnement(Object.assign({}, bon.sub, { endpoint: 'pas une adresse' }), null).code], ['service_push_refuse', 'service_push_refuse', 'champ_invalide']);
  }

  /* ══ 3. LA PAIRE VAPID ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa paire VAPID : propre à l\'instance, fabriquée au premier démarrage, la privée SCELLÉE, jamais changée ensuite');
  {
    const a = monter();
    vrai('un premier démarrage fabrique une paire (origine « neuve »)', a.push.actif() && a.push.origineVapid() === 'neuve');
    const pub = a.push.cle();
    v('la clé publique est un point P-256 non compressé (65 octets, 0x04)', [Buffer.from(pub, 'base64url').length, Buffer.from(pub, 'base64url')[0]], [65, 4]);
    const lue = a.S.pushVapidLire();
    v('la base la relit à l\'identique (publique et privée)', [lue.publique === pub, Buffer.from(lue.privee, 'base64url').length], [true, 32]);
    const disque = octets(a.chemin);
    vrai('population : le fichier de base porte des octets à examiner et la clé publique (elle n\'est pas secrète)', disque.length > 8192 && disque.includes(Buffer.from(pub)));
    v('⛔ la clé PRIVÉE n\'est nulle part en clair dans le fichier (ni en base64 URL, ni en hexadécimal, ni en base64)', [disque.includes(Buffer.from(lue.privee)), disque.includes(Buffer.from(Buffer.from(lue.privee, 'base64url').toString('hex'))), disque.includes(Buffer.from(Buffer.from(lue.privee, 'base64url').toString('base64')))], [false, false, false]);
    const meta = a.brut().prepare("SELECT v FROM meta WHERE k = 'vapid_priv_ch'").get();
    vrai('elle est rangée scellée (la ligne `meta` ne ressemble pas à une clé)', !!meta && Buffer.from(meta.v, 'base64').length > 32 + 29 && !meta.v.includes(lue.privee));
    a.S.fermer();
    const b = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t });
    const cfgB = { origines: ['https://msg.exemple.test'], push: pushConfig({}, {}, 'beta') };
    const pb = PUSH.creerPush({ stockage: b, hub: { fluxOuverts: () => 0 }, config: cfgB, horloge: () => a.h.t, transport: async () => ({ statut: 201 }) });
    vrai('⛔ un redémarrage relit LA MÊME paire (origine « base ») : changer de paire ferait refuser tous les abonnements existants', pb.cle() === pub && pb.origineVapid() === 'base');
    b.fermer();

    /* adoptée depuis l'installation (`install-msg.sh` écrit une paire dans la configuration) */
    const paire = paireVapid();
    const c = monter({ cfg: paire });
    vrai('la paire de l\'installation est ADOPTÉE à la première fois (origine « installation »), puis rangée comme les autres', c.push.cle() === paire.vapidPublicKey && c.push.origineVapid() === 'installation' && c.S.pushVapidLire().privee === paire.vapidPrivateKey);
    c.S.fermer();
    const paire2 = paireVapid();
    const c2 = ouvrir({ chemin: c.chemin, scelleur: creerScelleur(c.kek), horloge: () => c.h.t });
    const cfgC = { origines: [], push: pushConfig(paire2, {}, 'beta') };
    const pc2 = PUSH.creerPush({ stockage: c2, hub: { fluxOuverts: () => 0 }, config: cfgC, horloge: () => c.h.t, transport: async () => ({ statut: 201 }) });
    vrai('⛔ une paire DIFFÉRENTE dans la configuration, plus tard, ne remplace pas celle de la base (les abonnements en dépendent)', pc2.cle() === paire.vapidPublicKey && pc2.origineVapid() === 'base');
    c2.fermer();

    /* la configuration refuse ce qui n'est pas une paire */
    const paire3 = paireVapid();
    v('⛔ une clé privée qui n\'est pas celle de la publique REFUSE le démarrage', lance(() => pushConfig({ vapidPublicKey: paire.vapidPublicKey, vapidPrivateKey: paire3.vapidPrivateKey }, {}, 'beta')), 'CONFIG');
    v('l\'une sans l\'autre aussi', [lance(() => pushConfig({ vapidPublicKey: paire.vapidPublicKey }, {}, 'beta')), lance(() => pushConfig({ vapidPrivateKey: paire.vapidPrivateKey }, {}, 'beta'))], ['CONFIG', 'CONFIG']);
    v('une clé de la mauvaise longueur aussi', lance(() => pushConfig({ vapidPublicKey: 'AAAA', vapidPrivateKey: 'AAAA' }, {}, 'beta')), 'CONFIG');
    /* le sujet VAPID : `push.contact`, à défaut le courriel que l'installation écrit déjà (`contactEmail`), à défaut l'origine https du service */
    v('⛔ le courriel de contact de l\'installation (`contactEmail`) devient le sujet VAPID, sauf si `push.contact` est posé ; sans l\'un ni l\'autre, rien (l\'origine https prend le relais)',
      [pushConfig({ contactEmail: 'contact@exemple.invalid' }, {}, 'beta').contact, pushConfig({ contactEmail: 'contact@exemple.invalid', push: { contact: 'mailto:autre@exemple.invalid' } }, {}, 'beta').contact, pushConfig({}, {}, 'beta').contact],
      ['mailto:contact@exemple.invalid', 'mailto:autre@exemple.invalid', null]);
    v('un courriel de contact illisible, vide, « localhost » ou qui n\'est pas du texte est LAISSÉ DE CÔTÉ : le démarrage n\'est pas refusé, le sujet retombe sur l\'origine https',
      ['pas un courriel', '', 'moi@localhost', 42, null].map(c => pushConfig({ contactEmail: c }, {}, 'beta').contact), [null, null, null, null, null]);

    /* une ligne abîmée : le push se DÉSACTIVE (et le dit), le reste du service vit */
    const d = monter();
    d.S.fermer();
    const brut = new DatabaseSync(d.chemin);
    const ligne = brut.prepare("SELECT v FROM meta WHERE k = 'vapid_priv_ch'").get().v;
    const octetsLigne = Buffer.from(ligne, 'base64'); octetsLigne[octetsLigne.length - 1] ^= 0xff;
    brut.prepare("UPDATE meta SET v = ? WHERE k = 'vapid_priv_ch'").run(octetsLigne.toString('base64')); brut.close();
    const d2 = ouvrir({ chemin: d.chemin, scelleur: creerScelleur(d.kek), horloge: () => d.h.t });
    const journalD = [];
    const pd = PUSH.creerPush({ stockage: d2, hub: { fluxOuverts: () => 0 }, config: { origines: [], push: pushConfig({}, {}, 'beta') }, horloge: () => d.h.t, journaliser: (e, c3) => journalD.push([e, c3]), transport: async () => ({ statut: 201 }) });
    v('⛔ une clé privée abîmée désactive le push (actif:false, clé publique non servie, abonnement refusé) au lieu de le faire tourner de travers', [pd.actif(), pd.cle(), pd.abonner('p_x', P.appareil('https://fcm.googleapis.com/fcm/send/abcdefghij').sub).code, pd.sante().actif], [false, null, 'push_indisponible', false]);
    vrai('   et le dit dans le journal (par un MOT, jamais par la clé)', journalD.some(([e, c3]) => e === 'push_inactif' && c3.motif === 'vapid_illisible'));
    d2.fermer();
  }

  /* ══ 4. CE QUI PART VRAIMENT : la charge DÉCHIFFRÉE avec les clés de l'appareil ═════════════════════════════════════════════════ */
  console.log('\nLa charge : minimale par défaut, aperçu seulement si CELUI QUI REÇOIT l\'a activé — déchiffrée avec les clés de l\'appareil (RFC 8291)');
  {
    const m = monter();
    const al = m.pers('Alice'), bo = m.pers('Bruno');
    m.S.contactLier(al.id, bo.id);
    const g = m.S.convCreerGroupe({ createur: al.id, nom: 'Chantier des Tilleuls', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
    const appBo = m.abonne(bo.id);
    const texte = 'CANARIQTEXTE ' + 'x'.repeat(150) + ' FINLONGUE';
    const env = m.S.messageEnvoyer({ conv: g.id, auteur: al.id, cid: 'cid-push-0001', texte });
    const envoyer = async () => { const r = m.push.message({ conv: g.id, seq: env.seq, gid: env.gid, auteur: al.id, nomAuteur: 'Alice Banc', nomConv: 'Chantier des Tilleuls', groupe: true, type: 'texte', texte }); await Promise.all(r); };
    await envoyer();
    v('population : UN envoi est parti, vers l\'appareil de Bruno, en POST', [m.envois.length, m.envois[0] && m.envois[0].methode, m.envois[0] && m.envois[0].url === appBo.sub.endpoint], [1, 'POST', true]);
    const e0 = m.envois[0];
    const clair = JSON.parse(P.dechiffrer(appBo, e0.corps));
    v('⛔ la charge DÉCHIFFRÉE est minimale : « Nouveau message » et l\'identifiant de la conversation pour l\'ouvrir', [clair.titre, clair.corps, clair.tag, clair.url, clair.type], ['OP MESSAGES', 'Nouveau message', g.id, '/#messages/' + g.id, 'message']);
    const brutClair = P.dechiffrer(appBo, e0.corps);
    v('⛔ ni le texte du message, ni le nom de l\'auteur, ni celui du groupe n\'y sont (par défaut)', [brutClair.includes('CANARIQTEXTE'), brutClair.includes('Alice'), brutClair.includes('Tilleuls')], [false, false, false]);
    v('les en-têtes : chiffrement aes128gcm, durée de vie, urgence normale, corps binaire', [e0.entetes['Content-Encoding'], String(e0.entetes.TTL), e0.entetes.Urgency, e0.entetes['Content-Type'], String(e0.entetes['Content-Length']) === String(e0.corps.length)], ['aes128gcm', '86400', 'normal', 'application/octet-stream', true]);
    vrai('⛔ le service push ne peut PAS lire la charge : le texte en clair n\'est pas dans le corps envoyé', !e0.corps.includes(Buffer.from('Nouveau message')) && !e0.corps.includes(Buffer.from('CANARIQ')));
    vrai('⛔ un AUTRE appareil (d\'autres clés) ne peut pas la lire', lance(() => P.dechiffrer(P.appareil('https://fcm.googleapis.com/fcm/send/autreappareil'), e0.corps)) !== null);
    const vap = P.lireVapid(e0.entetes);
    vrai('l\'en-tête Authorization porte un jeton VAPID ES256 dont la SIGNATURE se vérifie avec la clé publique de l\'instance', P.signatureVapidValide(vap, m.push.cle()) && vap.cle === m.push.cle());
    v('le jeton vise l\'ORIGINE du service push (aud) et porte le sujet de l\'instance (sub = son origine https, jamais un domaine en dur dans le code)', [vap.charge.aud, vap.charge.sub], ['https://fcm.googleapis.com', 'https://msg.exemple.test']);
    vrai('le jeton expire dans les 24 heures (plafond de la norme)', vap.charge.exp - Math.floor(m.h.t / 1000) <= 24 * 3600 + 5 || vap.charge.exp - Math.floor(Date.now() / 1000) <= 24 * 3600 + 5);

    /* l'aperçu, choisi par CELUI QUI REÇOIT et lu à l'instant de partir */
    m.S.personneMaj(bo.id, { prefs: { apercu_notif: true } });
    m.envois.length = 0;
    await envoyer();
    const ap = JSON.parse(P.dechiffrer(appBo, m.envois[0].corps));
    v('avec « Aperçu du message » activé : le nom (et le groupe), et les 100 premiers caractères du texte', [ap.titre, ap.corps.startsWith('CANARIQTEXTE '), Array.from(ap.corps).length <= 100, ap.corps.endsWith('…')], ['Alice Banc · Chantier des Tilleuls', true, true, true]);
    vrai('   et la longue fin du texte n\'y est pas', !ap.corps.includes('FINLONGUE'));
    m.S.personneMaj(bo.id, { prefs: { apercu_notif: false } });
    m.envois.length = 0; await envoyer();
    v('⛔ désactivé de nouveau : minimal de nouveau (le réglage est lu à CHAQUE envoi)', JSON.parse(P.dechiffrer(appBo, m.envois[0].corps)).corps, 'Nouveau message');
    m.S.personneMaj(bo.id, { prefs: { apercu_notif: 'oui' } });
    m.envois.length = 0; await envoyer();
    v('⛔ seul `true` active l\'aperçu (une chaîne, un nombre, un objet : minimal)', JSON.parse(P.dechiffrer(appBo, m.envois[0].corps)).corps, 'Nouveau message');
    m.S.personneMaj(bo.id, { prefs: {} });
    /* une photo, un vocal, un fichier : le mot, jamais le contenu */
    m.S.personneMaj(bo.id, { prefs: { apercu_notif: true } });
    for (const [type, mot] of [['photo', 'Photo'], ['vocal', 'Message vocal'], ['fichier', 'Fichier']]) {
      m.envois.length = 0;
      await Promise.all(m.push.message({ conv: g.id, seq: env.seq, gid: env.gid, auteur: al.id, nomAuteur: 'Alice Banc', nomConv: 'G', groupe: false, type, texte: null }));
      v('aperçu d\'une pièce (' + type + ') : « ' + mot + ' »', JSON.parse(P.dechiffrer(appBo, m.envois[0].corps)).corps, mot);
    }
    m.S.personneMaj(bo.id, { prefs: {} });

    /* l'auteur ne reçoit jamais sa propre notification */
    const appAl = m.abonne(al.id);
    m.envois.length = 0; await envoyer();
    v('⛔ l\'AUTEUR n\'est pas notifié de son propre message, même avec un appareil abonné', [m.envois.length, m.envois.some(e => e.url === appAl.sub.endpoint)], [1, false]);
    /* un appareil, plusieurs appareils : tous reçoivent */
    const appBo2 = m.abonne(bo.id);
    m.envois.length = 0; await envoyer();
    v('un destinataire avec DEUX appareils : les deux reçoivent', m.envois.map(e => e.url).sort(), [appBo.sub.endpoint, appBo2.sub.endpoint].sort());
    m.S.fermer();
  }

  /* ══ 5. L'ACQUITTEMENT : une notification ne double pas une page qui est sous les yeux ══════════════════════════════════════════ */
  console.log('\nL\'acquittement : aucun flux → tout de suite ; un flux → on attend, et rien ne part si la page acquitte ; page cachée → elle part après le délai');
  {
    const m = monter();
    const al = m.pers('Alice'), bo = m.pers('Bruno');
    m.S.contactLier(al.id, bo.id);
    const g = m.S.convCreerGroupe({ createur: al.id, nom: 'Équipe', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
    const g2 = m.S.convCreerGroupe({ createur: al.id, nom: 'Autre', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
    const app = m.abonne(bo.id);
    let c = 0;
    const ecrire = (conv, texte) => m.S.messageEnvoyer({ conv, auteur: al.id, cid: 'cid-ack-' + (++c) + alea(), texte: texte || 'bonjour ' + c });
    const notifier = (conv, e, texte) => m.push.message({ conv, seq: e.seq, gid: e.gid, auteur: al.id, nomAuteur: 'Alice', nomConv: 'Équipe', groupe: true, type: 'texte', texte: texte || 'bonjour' });
    const tout = async (ps) => Promise.all(ps);

    /* a. aucun flux : tout de suite, sans minuterie */
    m.ouverts[bo.id] = 0;
    const e1 = ecrire(g.id);
    /* ⛔ une notification qui attendrait une minuterie FACTICE que personne ne déclenche ne se résoudrait jamais : la boucle se viderait et le banc sortirait « proprement » en 0, sans total (pris par
       la mutation A05 de `mutations-push.js`). On l'attend donc au plus un instant, et le contrôle dit ce qu'il a vu. ⚠️ La minuterie NE se détache PAS (`unref`) : c'est elle qui tient la boucle ouverte
       pendant l'attente — détachée, le processus sortait quand même, en silence (mesuré). `fin()` quitte tout de suite, elle ne retarde donc jamais un banc vert. */
    const r1 = await Promise.race([tout(notifier(g.id, e1)), new Promise((ok) => { setTimeout(() => ok(null), 1500); })]);
    v('⛔ aucun flux ouvert : la notification part TOUT DE SUITE, sans attendre (aucune minuterie posée)', [m.envois.length, m.minuteurs.length, r1 && r1[0].envoyes], [1, 0, 1]);

    /* b. un flux ouvert + la page acquitte */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const e2 = ecrire(g.id);
    const ps2 = notifier(g.id, e2);
    v('un flux ouvert : RIEN ne part tout de suite, une minuterie de 5 s est posée', [m.envois.length, m.minuteurs.length, m.minuteurs[0] && m.minuteurs[0].ms], [0, 1, 5000]);
    vrai('   l\'acquittement est accepté', m.push.acquitter(bo.id, e2.gid));
    await m.declencher();
    const r2 = await tout(ps2);
    v('⛔ la page a acquitté l\'événement (reçu ET montré) : à l\'échéance RIEN ne part — pas de doublon avec ce qu\'elle montre', [m.envois.length, r2[0].raison], [0, 'acquittee']);

    /* c. la page est cachée : pas d'acquittement → elle part */
    m.ouverts[bo.id] = 1;
    const e3 = ecrire(g.id);
    const ps3 = notifier(g.id, e3);
    await m.declencher();
    const r3 = await tout(ps3);
    v('⛔ page cachée (aucun acquittement) : la notification part à l\'échéance, UNE fois', [m.envois.length, r3[0].envoyes], [1, 1]);

    /* d. un acquittement plus ANCIEN que l'événement ne le couvre pas */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const e4 = ecrire(g.id);
    m.push.acquitter(bo.id, e4.gid - 1);
    const ps4 = notifier(g.id, e4);
    await m.declencher(); await tout(ps4);
    v('⛔ un acquittement d\'un événement plus ancien ne couvre pas le nouveau : la notification part', m.envois.length, 1);
    /* e. un acquittement qui couvre PLUS (monotone) */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const e5 = ecrire(g.id);
    m.push.acquitter(bo.id, e5.gid); m.push.acquitter(bo.id, 1);
    const ps5 = notifier(g.id, e5);
    await m.declencher(); await tout(ps5);
    v('un acquittement qui couvre l\'événement (même identifiant) l\'arrête, et un petit acquittement ENSUITE ne le fait pas redescendre (monotone)', m.envois.length, 0);
    v('⛔ seul un entier positif acquitte (NaN, négatif, décimal, texte : refusés)', [Number.NaN, -1, 1.5, '7', null, undefined, Infinity].map(x => m.push.acquitter(bo.id, x)), [false, false, false, false, false, false, false]);

    /* e bis. une notification SANS identifiant d'événement ne peut être acquittée par PERSONNE : elle part à l'échéance, quelque haut que la page ait acquitté (une autre personne : les acquittements de Bruno
       servent encore plus bas) */
    {
      const cl = m.pers('Chloé'); m.abonne(cl.id);
      m.envois.length = 0; m.minuteurs.length = 0; m.ouverts[cl.id] = 1;
      m.push.acquitter(cl.id, 999999999);
      const psSans = m.push.pousser(cl.id, { type: 'message', tag: 'sans-gid-' + alea(), titre: 'OP MESSAGES', corps: 'Nouveau message', url: '/' });   // aucun { gid } en second argument
      v('population : elle ATTEND (un flux ouvert, une minuterie posée, rien de parti)', [m.envois.length, m.minuteurs.length], [0, 1]);
      await m.declencher(); const rSans = await psSans;
      v('⛔ sans identifiant d\'événement, aucun acquittement ne la couvre : elle part à l\'échéance', [m.envois.length, rSans.envoyes], [1, 1]);
      m.ouverts[cl.id] = 0;
      m.envois.length = 0;
    }

    /* f. plusieurs événements d'une même conversation pendant l'attente : UNE notification, la dernière */
    m.envois.length = 0; m.minuteurs.length = 0; m.ouverts[bo.id] = 1;
    m.S.personneMaj(bo.id, { prefs: { apercu_notif: true } });
    const ea = ecrire(g.id, 'premier'), eb = ecrire(g.id, 'deuxième'), ec = ecrire(g.id, 'troisième');
    // les acquittements d'avant couvraient des identifiants plus petits : on les dépasse pour que ceux-ci ne soient pas couverts
    const pa = notifier(g.id, ea, 'premier'), pb = notifier(g.id, eb, 'deuxième'), pc = notifier(g.id, ec, 'troisième');
    v('trois événements d\'une conversation pendant l\'attente : UNE seule minuterie', m.minuteurs.length, 1);
    m.ouverts[bo.id] = 1;
    await m.declencher(); await tout([...pa, ...pb, ...pc]);
    v('⛔ ...et UNE seule notification, qui décrit la DERNIÈRE', [m.envois.length, m.envois[0] && JSON.parse(P.dechiffrer(app, m.envois[0].corps)).corps], [1, 'troisième']);
    /* g. deux conversations : deux notifications */
    m.envois.length = 0; m.minuteurs.length = 0;
    const ga = ecrire(g.id), gb = ecrire(g2.id);
    const pga = notifier(g.id, ga), pgb = notifier(g2.id, gb);
    v('deux conversations différentes : deux minuteries', m.minuteurs.length, 2);
    await m.declencher(); await tout([...pga, ...pgb]);
    v('   et deux notifications (une par conversation)', m.envois.length, 2);
    m.S.personneMaj(bo.id, { prefs: {} });

    /* h. la sourdine, la sortie, la suppression : rien ne part */
    const demain = m.h.t + 86400000;
    m.envois.length = 0; m.minuteurs.length = 0; m.ouverts[bo.id] = 0;
    m.S.membrePrefs({ conv: g.id, uid: bo.id, muet_jusqua: demain });
    const eh = ecrire(g.id);
    const rh = await tout(notifier(g.id, eh));
    v('⛔ une conversation en SOURDINE ne notifie pas (le destinataire n\'est même pas retenu)', [rh.length, m.envois.length], [0, 0]);
    m.S.membrePrefs({ conv: g.id, uid: bo.id, muet_jusqua: 0 });
    const rh0 = await tout(notifier(g.id, eh));
    v('   contre-épreuve : la sourdine levée, la notification part', [rh0.length, m.envois.length], [1, 1]);
    /* sourdine posée PENDANT l'attente */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const ei = ecrire(g.id);
    const psi = notifier(g.id, ei);
    m.S.membrePrefs({ conv: g.id, uid: bo.id, muet_jusqua: demain });
    await m.declencher(); const ri = await tout(psi);
    v('⛔ la sourdine posée PENDANT l\'attente est respectée (la notification est re-jugée à l\'instant de partir)', [m.envois.length, ri[0].raison], [0, 'plus_valable']);
    m.S.membrePrefs({ conv: g.id, uid: bo.id, muet_jusqua: 0 });
    /* le message est supprimé « pour tous » pendant l'attente */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const ej = ecrire(g.id, 'à retirer');
    const psj = notifier(g.id, ej, 'à retirer');
    m.S.messageSupprimer({ conv: g.id, seq: ej.seq, uid: al.id, pour: 'tous', admin: false });
    await m.declencher(); const rj = await tout(psj);
    v('⛔ un message supprimé « pour tous » pendant l\'attente ne part pas', [m.envois.length, rj[0].raison], [0, 'plus_valable']);
    /* masqué « pour moi » par le destinataire */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const ek = ecrire(g.id);
    const psk = notifier(g.id, ek);
    m.S.messageSupprimer({ conv: g.id, seq: ek.seq, uid: bo.id, pour: 'moi', admin: false });
    await m.declencher(); await tout(psk);
    v('un message que le destinataire a supprimé « pour moi » pendant l\'attente ne part pas', m.envois.length, 0);
    /* le destinataire quitte la conversation */
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const el = ecrire(g2.id);
    const psl = notifier(g2.id, el);
    m.S.membreQuitter({ conv: g2.id, uid: bo.id });
    await m.declencher(); await tout(psl);
    v('⛔ quitter la conversation pendant l\'attente : rien ne part', m.envois.length, 0);
    /* un message éphémère échu pendant l'attente */
    const ge = m.S.convCreerGroupe({ createur: al.id, nom: 'Éphémère', membres: [bo.id], annonces_seules: false, ephemere_s: 86400 });
    m.envois.length = 0; m.ouverts[bo.id] = 1;
    const em = ecrire(ge.id, 'va disparaître');
    const psm = notifier(ge.id, em, 'va disparaître');
    m.h.t += 2 * 86400000;
    await m.declencher(); await tout(psm);
    v('⛔ un message éphémère ÉCHU pendant l\'attente ne part pas', m.envois.length, 0);
    m.S.fermer();
  }

  /* ══ 6. LES STATUTS DU SERVICE PUSH ═════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLes réponses du service push : 404 et 410 retirent l\'abonnement, les autres échecs se comptent, cinq de suite le retirent');
  {
    const m = monter();
    const al = m.pers('Alice'), bo = m.pers('Bruno');
    m.S.contactLier(al.id, bo.id);
    const g = m.S.convCreerGroupe({ createur: al.id, nom: 'Équipe', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
    m.abonne(bo.id);
    let c = 0;
    const un = async () => { const e = m.S.messageEnvoyer({ conv: g.id, auteur: al.id, cid: 'cid-st-' + (++c) + alea(), texte: 'x' }); return Promise.all(m.push.message({ conv: g.id, seq: e.seq, gid: e.gid, auteur: al.id, nomAuteur: 'A', nomConv: 'G', groupe: true, type: 'texte', texte: 'x' })); };
    const nb = () => m.S.pushCompterDe(bo.id);
    const ligne = () => m.brut().prepare('SELECT echecs, derniere_ok FROM push').all();
    /* le nombre d'échecs de LA ligne, ou ce qui manque : un abonnement retiré trop tôt doit se lire « ligne retirée », pas mourir sur un `undefined.echecs` (mutation S06 : « le banc a levé : TypeError ») */
    const echecs = () => { const l = ligne()[0]; return l ? l.echecs : 'ligne retirée'; };
    m.ouverts[bo.id] = 0;

    m.reponse.statut = 201; await un();
    v('201 : livré — l\'échec est à zéro, la dernière livraison est datée', [nb(), echecs(), (ligne()[0] || {}).derniere_ok === m.h.t], [1, 0, true]);
    for (const code of [410, 404]) {
      m.abonne(bo.id); m.reponse.statut = code;
      const avant = nb(), echecsAvant = m.push.sante().echecs24h; await un();
      v('⛔ ' + code + ' : le service dit que l\'appareil n\'existe plus — les abonnements en échec partent TOUT DE SUITE (population avant : ' + avant + ')', [avant >= 2, nb()], [true, 0]);
      v('   ...et ce n\'est PAS compté comme un échec de /health (un appareil qui disparaît est le fonctionnement normal : la surveillance ne doit pas crier)', m.push.sante().echecs24h, echecsAvant);
      m.abonne(bo.id);
    }
    m.S.pushSupprimerPersonne(bo.id);
    m.abonne(bo.id); m.reponse.statut = 500;
    for (let i = 1; i <= 4; i++) await un();
    v('500 quatre fois de suite : l\'abonnement est encore là, 4 échecs comptés', [nb(), echecs()], [1, 4]);
    m.reponse.statut = 201; await un();
    v('⛔ un succès remet le compte à zéro', [nb(), echecs()], [1, 0]);
    m.reponse.statut = 500;
    for (let i = 1; i <= 4; i++) await un();
    v('   (quatre échecs de plus ne suffisent pas : il en faut CINQ DE SUITE)', [nb(), echecs()], [1, 4]);
    await un();
    v('⛔ le cinquième échec de suite retire l\'abonnement', nb(), 0);
    m.abonne(bo.id);
    for (const [nom, st] of [['429 (trop de demandes)', 429], ['403 (nos clés refusées)', 403], ['302 (une redirection n\'est pas suivie : un échec)', 302], ['413', 413], ['503', 503]]) {
      m.reponse.statut = 201; await un();   // un succès remet le compte à zéro : chaque statut se juge seul
      m.reponse.statut = st; await un();
      v(nom + ' : compté comme un échec, l\'abonnement reste', [nb(), echecs()], [1, 1]);
    }
    m.S.pushSupprimerPersonne(bo.id); m.abonne(bo.id);
    m.reponse.statut = 201; m.reponse.leve = true;
    const rl = await un();
    v('⛔ un transport qui LÈVE ne fait pas tomber le module : l\'échec est compté, la promesse se résout', [nb(), echecs(), rl[0].envoyes], [1, 1, 0]);
    m.reponse.leve = false;

    /* la liste blanche est RE-VÉRIFIÉE à l'envoi : une ligne ancienne, ou une liste resserrée depuis */
    m.S.pushSupprimerPersonne(bo.id);
    const k = P.appareil('https://exemple.invalid/ancienne');   // une adresse que la liste n'admet pas, posée en contournant la route
    m.S.pushPoser({ uid: bo.id, endpoint: k.sub.endpoint, p256dh: k.sub.keys.p256dh, auth: k.sub.keys.auth });
    m.envois.length = 0; m.reponse.statut = 201;
    vrai('population : une ligne d\'abonnement hors liste existe (posée sans passer par la route)', nb() === 1);
    await un();
    v('⛔ une adresse hors de la liste blanche, déjà rangée, n\'est JAMAIS appelée à l\'envoi — et la ligne part', [m.envois.length, nb()], [0, 0]);
    m.S.fermer();
  }

  /* ══ 7. L'INSCRIPTION : dix au plus, un appareil pour une seule personne, scellé sur le disque ═════════════════════════════════════════ */
  console.log('\nLes appareils : dix au plus, un appareil pour une seule personne, et le point d\'accès scellé sur le disque');
  {
    const m = monter();
    const al = m.pers('Alice'), bo = m.pers('Bruno');
    const eps = [];
    for (let i = 0; i < 11; i++) { m.h.t += 1000; eps.push(m.abonne(al.id, 'https://fcm.googleapis.com/fcm/send/CANARIQENDPOINT' + i + alea())); }
    v('⛔ DIX appareils au plus par personne : le onzième fait partir le plus ANCIEN', [m.S.pushCompterDe(al.id), m.S.pushListe(al.id).some(x => x.endpoint === eps[0].sub.endpoint), m.S.pushListe(al.id).some(x => x.endpoint === eps[10].sub.endpoint)], [10, false, true]);
    m.h.t += 1000;
    const r = m.push.abonner(al.id, eps[1].sub);
    v('réinscrire un appareil déjà connu ne crée rien et le rajeunit (il ne sera pas le prochain à partir)', [r.ok, r.neuf, m.S.pushCompterDe(al.id)], [true, false, 10]);
    m.h.t += 1000; m.abonne(al.id);
    v('   (le onzième suivant fait partir un AUTRE : le plus ancien est maintenant le troisième de la file)', [m.S.pushListe(al.id).some(x => x.endpoint === eps[1].sub.endpoint), m.S.pushListe(al.id).some(x => x.endpoint === eps[2].sub.endpoint)], [true, false]);

    /* un appareil, une personne */
    m.h.t += 1000;
    const partage = P.appareil('https://web.push.apple.com/PARTAGE' + alea());
    m.push.abonner(al.id, partage.sub);
    m.h.t += 1000;
    const rt = m.push.abonner(bo.id, partage.sub);
    v('⛔ un point d\'accès déjà inscrit pour UNE AUTRE personne lui est RETIRÉ et passe à la nouvelle', [rt.ok, rt.transfere, m.S.pushListe(al.id).some(x => x.endpoint === partage.sub.endpoint), m.S.pushListe(bo.id).some(x => x.endpoint === partage.sub.endpoint)], [true, true, false, true]);
    v('   (Alice n\'a plus que neuf appareils : celui-là est parti de chez elle)', m.S.pushCompterDe(al.id), 9);

    /* ne retire que les siens */
    v('⛔ `desabonner` ne retire QUE les appareils de la personne : celui d\'une autre ne part pas, et la réponse est la même que s\'il n\'existait pas', [m.push.desabonner(al.id, partage.sub.endpoint), m.push.desabonner(al.id, 'https://fcm.googleapis.com/fcm/send/inconnu123456'), m.S.pushCompterDe(bo.id)], [0, 0, 1]);
    v('   le sien part', [m.push.desabonner(bo.id, partage.sub.endpoint), m.S.pushCompterDe(bo.id)], [1, 0]);

    /* scellé */
    const disque = octets(m.chemin);
    vrai('population : le fichier porte des octets à examiner', disque.length > 8192);
    v('⛔ aucun point d\'accès n\'est en clair sur le disque (le canari posé dans ceux d\'Alice est introuvable)', disque.includes(Buffer.from('CANARIQENDPOINT')), false);
    const ap = m.S.pushListe(al.id)[0];
    v('⛔ ni les clés de l\'appareil (p256dh, auth)', [disque.includes(Buffer.from(ap.p256dh)), disque.includes(Buffer.from(ap.auth))], [false, false]);
    vrai('témoin : le service relit pourtant le point d\'accès (le canari y est)', m.S.pushListe(al.id).some(x => x.endpoint.includes('CANARIQENDPOINT')));
    /* une ligne recopiée chez une autre personne, ou deux champs permutés : illisible, jamais livrée */
    const brut = m.brut();
    const lignes = brut.prepare('SELECT id, endpoint_ch, p256dh_ch FROM push WHERE uid = ? ORDER BY id LIMIT 2').all(al.id);
    brut.prepare('UPDATE push SET endpoint_ch = ? WHERE id = ?').run(lignes[1].endpoint_ch, lignes[0].id);
    const avantIll = m.S.stats().illisibles;
    v('⛔ une ligne dont le point d\'accès a été RECOPIÉ d\'une autre ne s\'ouvre pas (elle est sautée, comptée, et les autres appareils restent servis)', [m.S.pushListe(al.id).length, m.S.stats().illisibles > avantIll], [8, true]);
    brut.prepare('UPDATE push SET endpoint_ch = ?, p256dh_ch = ? WHERE id = ?').run(lignes[0].p256dh_ch, lignes[0].endpoint_ch, lignes[0].id);
    v('   deux champs permutés : illisible aussi', m.S.pushListe(al.id).length, 8);
    brut.prepare('UPDATE push SET uid = ? WHERE id = ?').run(bo.id, lignes[1].id);
    v('⛔ une ligne passée à UNE AUTRE personne par la base ne s\'ouvre pas chez elle (la personne est dans les données associées)', m.S.pushListe(bo.id).length, 0);
    brut.close();
    m.S.fermer();
  }

  /* ══ 8. LE TRANSPORT RÉEL : aucune redirection, un délai, aucune adresse privée derrière un nom ═══════════════════════════════════════ */
  console.log('\nLe transport réel : un POST, sans suivre de redirection, avec un délai, qui refuse une adresse privée derrière un nom admis');
  {
    const sp = await P.fauxServicePush();
    const cible = await P.fauxServicePush();
    const url = (id) => new URL(sp.endpoint(id));
    const corps = Buffer.from('corps-chiffre-factice');
    /* cinq secondes : la marge des chemins qui RÉUSSISSENT (une machine chargée a déjà fait tomber un banc voisin à 700 ms) ; seul le délai de r3 est court, exprès */
    const R = (extra) => PUSH.transportHttp(Object.assign({ url: url('a'), method: 'POST', headers: { TTL: 60, 'Content-Length': corps.length, Authorization: 'vapid t=x, k=y' }, body: corps, timeoutMs: 5000 }, extra || {}));
    const r1 = await R();
    v('un POST réussi rend le statut ; le service push a reçu le corps, la méthode et les en-têtes', [r1.statut, sp.envois.length, sp.envois[0].methode, sp.envois[0].corps.equals(corps), sp.envois[0].entetes.authorization], [201, 1, 'POST', true, 'vapid t=x, k=y']);
    sp.statut = { redirige: cible.endpoint('piege'), code: 302 };
    const r2 = await R();
    await new Promise(r => setTimeout(r, 150));
    v('⛔ une REDIRECTION n\'est pas suivie : le statut 302 est rendu tel quel et la cible de la redirection n\'a reçu AUCUNE requête', [r2.statut, cible.envois.length], [302, 0]);
    for (const code of [301, 307, 308]) { sp.statut = { redirige: cible.endpoint('piege'), code }; const rr = await R(); v('   ' + code + ' aussi', [rr.statut, cible.envois.length], [code, 0]); }
    sp.statut = 'silence';
    const t0 = Date.now();
    const r3 = await R({ timeoutMs: 300 });
    v('⛔ un service qui ne répond jamais : le délai coupe (erreur « delai »), vite', [r3.statut, r3.erreur, Date.now() - t0 < 2500], [0, 'delai', true]);
    sp.statut = 'coupe';
    const r4 = await R();
    v('une connexion coupée en route est un échec « reseau », pas une exception', [r4.statut, r4.erreur], [0, 'reseau']);
    /* l'adresse privée derrière un nom admis : `localhost` se résout en boucle locale ; le transport réel doit REFUSER avant de se connecter */
    let connexions = 0;
    const ecoute = require('net').createServer(() => { connexions++; });
    const portEcoute = await new Promise(ok => ecoute.listen(0, '127.0.0.1', () => ok(ecoute.address().port)));
    const r5 = await PUSH.transportHttp({ url: new URL('https://localhost:' + portEcoute + '/x'), method: 'POST', headers: {}, body: corps, timeoutMs: 5000 });
    await new Promise(r => setTimeout(r, 100));
    v('⛔ un nom qui se résout en adresse PRIVÉE (ici « localhost » → 127.0.0.1) est refusé AVANT toute connexion : aucune connexion reçue', [r5.statut, r5.erreur, connexions], [0, 'adresse_privee', 0]);
    ecoute.close();
    await sp.fermer(); await cible.fermer();
  }

  /* ══ 8 bis. L'ADRESSE IP DERRIÈRE UN NOM : la table des plages refusées, ET celle des adresses publiques qui doivent PASSER ═════════════════════
     Un seul test de transport (« localhost ») ne dit pas que la table tient ses BORNES : 172.31.255.255 est privée, 172.32.0.1 ne l'est pas ; et une borne mal écrite qui refuse 142.250.x ferait taire
     TOUS les envois vers Google sans un message d'erreur. D'où les deux listes : chacune est précédée de la population de l'autre. */
  console.log('\nL\'adresse IP à laquelle un nom se résout : les plages privées sont refusées à leurs BORNES, les adresses publiques des services push passent');
  {
    const privees = {
      '0.0.0.0': 'cette machine', '10.1.2.3': '10/8', '127.0.0.1': 'la boucle locale', '127.255.255.254': 'le bout de 127/8', '100.64.0.1': 'CGNAT (début)', '100.127.255.255': 'CGNAT (fin)',
      '169.254.169.254': 'lien local (métadonnées d\'hébergeur)', '172.16.0.1': '172.16/12 (début)', '172.31.255.255': '172.16/12 (FIN)', '192.168.0.1': '192.168/16', '192.0.0.1': '192.0.0/24',
      '198.18.0.1': 'bancs de mesure (début)', '198.19.255.255': 'bancs de mesure (fin)', '192.88.99.1': 'relais 6to4', '224.0.0.1': 'multidiffusion (début)', '255.255.255.255': 'diffusion',
      '::': 'IPv6 non spécifiée', '::1': 'IPv6 boucle locale', 'fc00::1': 'IPv6 locale unique (fc00)', 'fd12:3456::1': 'IPv6 locale unique (fd00)', 'fe80::1': 'IPv6 lien local', 'febf::1': 'IPv6 lien local (fin de plage)',
      'fec0::1': 'IPv6 locale au site', 'ff02::1': 'IPv6 multidiffusion', '::ffff:127.0.0.1': 'IPv4 de la boucle locale « mappée »', '::ffff:10.0.0.1': 'IPv4 privée « mappée »', '::ffff:7f00:1': 'la même, écrite en hexadécimal',
      '64:ff9b::7f00:1': 'NAT64 qui porte 127.0.0.1', '2002:7f00:1::1': '6to4 qui porte 127.0.0.1', '2001:0:4136:e378:8000:63bf:3fff:fdd2': 'Teredo', '2001:db8::1': 'IPv6 de documentation',
      'pas-une-adresse:': 'une adresse illisible (refusée)', '1.2.3': 'une IPv4 à trois groupes (refusée)', '256.1.1.1': 'une IPv4 hors plage (refusée)', 'fe80::1%eth0': 'IPv6 lien local avec zone',
    };
    const publiques = {
      '142.250.74.138': 'Google (FCM)', '17.253.144.10': 'Apple', '34.107.243.93': 'Mozilla', '8.8.8.8': 'une adresse publique ordinaire', '100.63.255.255': 'juste sous le CGNAT', '100.128.0.1': 'juste au-dessus du CGNAT',
      '172.15.255.255': 'juste sous 172.16/12', '172.32.0.1': 'juste au-dessus de 172.16/12', '169.253.1.1': 'juste sous le lien local', '192.167.255.255': 'juste sous 192.168/16', '192.169.0.1': 'juste au-dessus de 192.168/16',
      '198.17.255.255': 'juste sous 198.18/15', '198.20.0.1': 'juste au-dessus de 198.18/15', '223.255.255.255': 'juste sous la multidiffusion', '2a00:1450:4007:80d::200e': 'Google, IPv6', '2607:f8b0:4004:c08::5f': 'Google, IPv6 (2)',
      '::ffff:8.8.8.8': 'IPv4 publique « mappée »', '2001:4860:4860::8888': 'IPv6 publique', '64:ff9b::808:808': 'NAT64 qui porte 8.8.8.8', '2002:808:808::1': '6to4 qui porte 8.8.8.8',
    };
    vrai('population : ' + Object.keys(privees).length + ' adresses privées et ' + Object.keys(publiques).length + ' publiques à juger', Object.keys(privees).length >= 30 && Object.keys(publiques).length >= 18);
    v('⛔ les adresses publiques des services push PASSENT (une borne mal écrite qui les refuserait ferait taire tous les envois, sans un message)', Object.keys(publiques).filter(a => PUSH.adressePrivee(a)).map(a => a + ' (' + publiques[a] + ')'), []);
    v('⛔ chaque adresse privée, locale ou réservée est REFUSÉE — aux bornes comprises', Object.keys(privees).filter(a => !PUSH.adressePrivee(a)).map(a => a + ' (' + privees[a] + ')'), []);
    v('contre-épreuve : la fonction distingue (elle ne dit pas « privée » à tout, ni « publique » à tout)', [PUSH.adressePrivee('172.31.255.255'), PUSH.adressePrivee('172.32.0.1')], [true, false]);
  }

  /* ══ 9. LA FILE : des envois en nombre borné ════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa file : deux envois à la fois, une file bornée — au-delà on abandonne (et on le compte), la mémoire ne se remplit pas');
  {
    let actifs = 0, max = 0;
    const portes = [];
    const transport = () => new Promise((ok) => { actifs++; max = Math.max(max, actifs); portes.push(() => { actifs--; ok({ statut: 201 }); }); });
    const m = monter({ push: { simultanes: 2, fileMax: 10 }, transport });
    const al = m.pers('Alice'), bo = m.pers('Bruno');
    for (let i = 0; i < 10; i++) { m.h.t += 1000; m.abonne(al.id); m.abonne(bo.id); }
    const pa = m.push.essai(al.id), pb = m.push.essai(bo.id);
    await attente();
    v('population : vingt appareils, deux envois en cours, dix en file, HUIT abandonnés (comptés)', [portes.length, max, m.push.sante().echecs24h], [2, 2, 8]);
    while (portes.length) { portes.shift()(); await attente(); }
    const [ra, rb] = await Promise.all([pa, pb]);
    v('⛔ jamais plus de deux envois en même temps, et la file se vide : douze envois sur vingt, les huit autres abandonnés', [max, ra.appareils + rb.appareils, ra.envoyes + rb.envoyes], [2, 20, 12]);
    m.S.fermer();
  }

  /* ══ 9 bis. UNE PERSONNE QUE PLUS RIEN NE CONNECTE NE REÇOIT RIEN ═══════════════════════════════════════════════════════════════
     Relevé par le gardien le 3 octobre 2026 (`gardien3-session.js`) : une session expire (trente jours sans usage), un abonnement push non. Une personne dont la session avait expiré — ou
     dont l'accès bêta avait été coupé dans la Tour PENDANT que sa session était expirée, donc jamais relue — recevait encore, sur son téléphone, tous les messages. Le service n'envoie plus qu'à
     une personne JOIGNABLE : une session vivante, ou un jeton d'appareil valable (échéance glissante ET plafond absolu). Le balayeur retire les abonnements des autres ; la relecture des accès
     bêta couvre aussi les comptes qui ont un abonnement, sans session. */
  console.log('\nUne personne que plus rien ne connecte (ni session vivante, ni jeton d\'appareil valable) ne reçoit rien — et ses abonnements ne lui survivent pas');
  {
    const JOUR = 86400000;
    const ABS = require(path.join(T.SERVICE, 'telephone.js')).APPAREIL_ABS_MS;
    const m = monter();
    const al = m.pers('Alice'), bo = m.pers('Bruno'), ca = m.pers('Carole'), da = m.pers('David'), ni = m.pers('Nina');
    const compte = m.pers('Tel', { origine: 'compte', sansSession: true });
    for (const u of [al, bo, ca, da, compte]) m.abonne(u.id);
    m.S.telAppareilLier({ h: 'tel-bruno', personne: bo.id, nom: 'tél', ttlMs: 200 * JOUR });     // valable 200 jours
    m.S.telAppareilLier({ h: 'tel-carole', personne: ca.id, nom: 'tél', ttlMs: 10 * JOUR });     // échu au bout de 10 jours
    m.S.telAppareilLier({ h: 'tel-david', personne: da.id, nom: 'tél', ttlMs: 400 * JOUR });     // glissant jusqu'à 400 jours, mais le plafond ABSOLU est de 365
    m.S.telAppareilLier({ h: 'tel-compte', personne: compte.id, nom: 'tél', ttlMs: 200 * JOUR });
    const essais = async (liste) => { const r = []; for (const u of liste) { const x = await m.push.essai(u.id); r.push([x.envoyes, x.raison || null]); } return r; };
    v('population : tant que la session de trente jours vit, chacun reçoit (l\'essai, qui passe par la même porte d\'envoi que tout)', await essais([al, bo, ca, da]), [[1, null], [1, null], [1, null], [1, null]]);
    v('population : et la personne qui n\'a QUE son jeton d\'appareil (compte par téléphone, sans session) reçoit aussi', await essais([compte]), [[1, null]]);

    /* quarante jours plus tard : les sessions de trente jours sont échues */
    m.h.t += 40 * JOUR;
    v('⛔ sessions échues : Alice (rien d\'autre) ne reçoit RIEN et le dit (« non_joignable »), Bruno (jeton valable) reçoit, Carole (jeton échu) non, David (jeton valable, plafond absolu pas atteint) reçoit',
      await essais([al, bo, ca, da]), [[0, 'non_joignable'], [1, null], [0, 'non_joignable'], [1, null]]);
    m.envois.length = 0;
    /* Fanny n'a QUE sa session (vivante : elle vient d'arriver), un abonnement, aucun jeton d'appareil : ni l'envoi ni le balayeur ne doivent la toucher */
    const fa = m.pers('Fanny'); m.abonne(fa.id);
    const abosAvant = m.S.pushCompter();
    /* la relecture des accès bêta couvre les comptes qui ont un abonnement, sans session — et ceux qui ont une session sans abonnement ; pas les comptes qui n'ont ni l'un ni l'autre */
    const ev = m.pers('Eva');   // créée maintenant : session vivante, aucun abonnement
    const releves = m.S.betaARelire().map(x => x.id).sort();
    v('⛔ la relecture des accès bêta voit ceux qui ont un abonnement (Alice, Bruno, Carole, David — même sans session) et celles qui ont une session vivante (Eva, Fanny) ; PAS Nina (ni session vivante ni abonnement), ni un compte qui n\'est pas bêta',
      releves, [al.id, bo.id, ca.id, da.id, ev.id, fa.id].sort());
    vrai('population : Nina existe, sa session est échue et elle n\'a aucun abonnement — c\'est bien le cas que la liste doit écarter', !!m.S.personneParId(ni.id) && !releves.includes(ni.id) && m.S.pushCompterDe(ni.id) === 0);
    /* le balayeur */
    const retires = m.S.pushNonJoignablesPurger(ABS);
    v('⛔ le balayeur retire les abonnements d\'Alice et de Carole (rien ne les connecte) et GARDE ceux de Bruno et de David (jeton valable), du compte par téléphone (jeton valable) et de Fanny (session vivante, aucun jeton)',
      [retires, m.S.pushCompterDe(al.id), m.S.pushCompterDe(ca.id), m.S.pushCompterDe(bo.id), m.S.pushCompterDe(da.id), m.S.pushCompterDe(compte.id), m.S.pushCompterDe(fa.id), abosAvant - retires], [2, 0, 0, 1, 1, 1, 1, 4]);
    v('   rejoué, il ne retire plus rien (idempotent)', m.S.pushNonJoignablesPurger(ABS), 0);

    /* le plafond absolu d'un jeton d'appareil : David a 400 jours glissants, mais plus de 365 depuis la dernière preuve par SMS */
    m.h.t += 335 * JOUR;
    const exp = m.brut().prepare('SELECT exp, cree FROM appareil_tel WHERE h = ?').get('tel-david');
    vrai('population : au jour 375 le jeton de David n\'a PAS échu (400 jours glissants) mais son plafond absolu de 365 jours est passé', exp.exp > m.h.t && exp.cree + ABS <= m.h.t);
    v('⛔ le jeton de David ne le rend plus joignable (le plafond absolu compte, comme à la reconnexion automatique) ; ni celui de Bruno (échu depuis longtemps) ; le compte par téléphone non plus',
      await essais([da, bo, compte]), [[0, 'non_joignable'], [0, 'non_joignable'], [0, 'non_joignable']]);
    /* contre-épreuve : un jeton posé tard est valable à la même date */
    m.S.telAppareilLier({ h: 'tel-frais', personne: ev.id, nom: 'tél', ttlMs: 400 * JOUR });
    m.abonne(ev.id);
    v('   contre-épreuve : Eva (session échue depuis longtemps, mais un jeton d\'appareil posé AUJOURD\'HUI) reçoit à la même date', await essais([ev]), [[1, null]]);
    m.S.fermer();
  }

  /* ══ 10. LA NOTIFICATION D'ESSAI ET /health ══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa notification d\'essai part tout de suite à tous les appareils de la personne ; /health ne publie que des nombres');
  {
    const m = monter();
    const al = m.pers('Alice');
    const a1 = m.abonne(al.id), a2 = m.abonne(al.id);
    m.ouverts[al.id] = 3;
    const r = await m.push.essai(al.id);
    v('⛔ l\'essai ne ATTEND PAS d\'acquittement (la personne veut voir ce qui se passe) : tous les appareils, tout de suite, même avec des flux ouverts', [r.appareils, r.envoyes, m.minuteurs.length], [2, 2, 0]);
    const clair = JSON.parse(P.dechiffrer(a1, m.envois.find(e => e.url === a1.sub.endpoint).corps));
    v('la charge de l\'essai dit ce qu\'elle est', [clair.type, clair.tag, clair.url, clair.corps], ['essai', 'essai', '/', 'Les notifications fonctionnent sur cet appareil.']);
    m.reponse.statut = (r2) => r2.url.href === a2.sub.endpoint ? 500 : 201;
    const r3 = await m.push.essai(al.id);
    v('un appareil qui échoue n\'empêche pas l\'autre : 1 envoyé sur 2', [r3.appareils, r3.envoyes], [2, 1]);
    const bo = m.pers('Bruno');
    v('une personne sans appareil : 0 sur 0 (la page dit « aucun appareil »)', await m.push.essai(bo.id), { envoyes: 0, appareils: 0, raison: 'aucun_appareil' });
    const sante = m.push.sante();
    v('/health : actif, abonnements, envoyés et échecs des 24 dernières heures — des nombres', [sante.actif, sante.abonnements, sante.envoyes24h, sante.echecs24h], [true, 2, 3, 1]);
    const texte = JSON.stringify(sante);
    vrai('⛔ rien d\'un point d\'accès, d\'une clé, d\'un identifiant dans /health', !texte.includes('fcm.googleapis') && !texte.includes(a1.sub.keys.p256dh) && !texte.includes(a1.sub.keys.auth) && !texte.includes(al.id) && !/https?:/.test(texte));
    v('les clés de /health sont exactement celles que la surveillance connaît', Object.keys(sante).sort(), ['abonnements', 'actif', 'echecs24h', 'envoyes24h']);
    m.h.t += 25 * 3600000;
    v('au bout de 24 heures les compteurs repartent de zéro (fenêtre glissante)', [m.push.sante().envoyes24h, m.push.sante().echecs24h], [0, 0]);
    const journaux = JSON.stringify(m.journal);
    vrai('⛔ le journal du module n\'a retenu ni point d\'accès ni clé', !journaux.includes('fcm.googleapis') && !journaux.includes(a1.sub.keys.p256dh));
    m.S.fermer();
  }

  termine = true;
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exitCode = 1; termine = true; fin(); });
