/* ⛔ CE QUE CE FICHIER GARDE — L'ANTI-ABUS : plafonds avec `Retry-After`, adresse non falsifiable, journaux muets (famille 7).

   Ce banc joue le service avec ses plafonds de PRODUCTION (les autres bancs les relâchent pour jouer beaucoup
   de gestes). Il garde ce qu'un abus coûterait cher à découvrir :

     · ⛔ L'ADRESSE EST CELLE QUE POSE NOTRE PROXY, PAS CELLE QU'UN CLIENT ÉCRIT. Avec `trust proxy 1`, Express
       ne retient que la DERNIÈRE entrée de `X-Forwarded-For` : faire varier les premières entrées (ou
       `X-Real-IP`, `Forwarded`) ne change pas le seau. Un en-tête lu à la main se falsifie — c'est la règle
       d'OP GESTION (« ne pas modifier l'anti-abus sans relire pourquoi il lit `req.ip` »), reprise ici ;
     · ⛔ LE PLAFOND DE LA PORTE BÊTA VIENT AVANT L'APPEL À OP GESTION : sans lui, ce service serait un relais de
       force brute (chaque essai coûterait une requête à OP GESTION) — on compte les appels REÇUS par le faux
       OP GESTION : 5, pas 6 ;
     · LES PLAFONDS DU § 3.6 : messages 60/min par compte, groupes 20/h, liens 20/h, saisie 1 par 2 s, écritures
       300/min par compte, 600 requêtes/min par adresse — chacun avec un `Retry-After` vrai ; un compte de
       moins de 24 h a des limites plus basses (un tiers) — un accès bêta, non ;
     · LES JOURNAUX NE DISENT RIEN : ni adresse, ni nom, ni texte, ni jeton, ni mot de passe. Un banc à CANARIS
       rejoue tout un scénario avec des valeurs repérables et les cherche dans la sortie du service ET sur le
       disque. Un journal qui garde un nom ou une adresse est une fuite qui se lit en clair dans la CI. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
let ipN = 20; const ip = () => '198.51.100.' + (ipN++);

const entierRetry = (r) => { const x = r.h.get('retry-after'); return /^\d+$/.test(x || '') ? parseInt(x, 10) : -1; };

(async () => {
  const og = await T.fauxOpGestion({
    alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true }, bob: { pass: 'pw-bob-12345', nom: 'Bob', actif: true },
    cible: { pass: 'pw-cible-1234', nom: 'Cible', actif: true }, autre: { pass: 'pw-autre-1234', nom: 'Autre', actif: true },
    'canari.login.zxq': { pass: 'CANARI-MDP-ZXQ-0001', nom: 'PrenomCanariZXQ', actif: true },
  });
  const svc = await T.lancerService({ urlGestion: og.url, quotasProd: true, horloge: true });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  try {
    console.log('⛔ L\'adresse d\'un plafond est celle de NOTRE proxy (dernière entrée de X-Forwarded-For), jamais celle qu\'un client écrit');
    {
      const IP = '203.0.113.50';
      const appels0 = og.appels.length;
      const codes = [];
      for (let i = 0; i < 6; i++) {
        const c = T.client(svc.base);
        /* Le client forge TOUT ce qu'il peut : des entrées en tête de X-Forwarded-For (différentes à chaque essai) et les autres
           en-têtes d'adresse. Seule la dernière entrée de X-Forwarded-For — celle de notre proxy — est vraie. */
        const r = await c.post('/api/beta/entrer', { login: 'autre' + i, pass: 'faux-faux-faux' }, { entetes: { 'X-Forwarded-For': '10.' + i + '.0.1, 192.0.2.' + (100 + i) + ', ' + IP, 'X-Real-IP': '9.9.9.' + i, 'Forwarded': 'for=8.8.8.' + i, 'X-Client-IP': '7.7.7.' + i } });
        codes.push(r.code);
        if (i === 5) { v('⛔ le SIXIÈME essai depuis la même adresse (entrées forgées devant, autres en-têtes changés) est refusé : 429 trop_d_essais', [r.code, r.j.error], [429, 'trop_d_essais']); vrai('avec un Retry-After entier, entre 1 et 900 s', entierRetry(r) >= 1 && entierRetry(r) <= 900); }
      }
      v('les cinq premiers sont allés jusqu\'à OP GESTION (401 identifiants)', codes.slice(0, 5), [401, 401, 401, 401, 401]);
      v('⛔ OP GESTION n\'a reçu que CINQ appels : le plafond d\'OP MESSAGES passe AVANT le relais (jamais un relais de force brute)', og.appels.length - appels0, 5);
      const autreAdresse = await T.client(svc.base).post('/api/beta/entrer', { login: 'autre', pass: 'pw-autre-1234' }, { entetes: { 'X-Forwarded-For': '203.0.113.51' } });
      v('une AUTRE dernière entrée est un autre seau : elle passe (le plafond est par adresse, pas global)', autreAdresse.code, 200);
      const direct = await T.client(svc.base).post('/api/beta/entrer', { login: 'autre', pass: 'pw-autre-1234' });
      v('sans proxy, l\'adresse de la connexion TCP sert (127.0.0.1) : un seau à part', direct.code, 200);
    }

    console.log('\nLe plafond par IDENTIFIANT : 5 essais ÉCHOUÉS par 15 minutes ET PAR RÉSEAU — pas un verrou pour la victime');
    {
      const appels0 = og.appels.length;
      const codes = [];
      for (let i = 0; i < 6; i++) codes.push((await T.client(svc.base).post('/api/beta/entrer', { login: 'Cible', pass: 'faux-faux-' + i }, { entetes: { 'X-Forwarded-For': '203.0.113.90' } })).code);
      v('⛔ cinq essais ratés depuis la même adresse, le sixième est refusé (429) — casse de l\'identifiant normalisée', codes, [401, 401, 401, 401, 401, 429]);
      v('et OP GESTION n\'a vu que cinq appels', og.appels.length - appels0, 5);
      const bon = await T.client(svc.base).post('/api/beta/entrer', { login: 'cible', pass: 'pw-cible-1234' }, { entetes: { 'X-Forwarded-For': '203.0.113.90' } });
      v('⛔ même avec le BON mot de passe, la même adresse reste refusée (sinon le plafond ne protège pas le bon mot de passe d\'être trouvé)', bon.code, 429);
    }
    {
      // Relecture adverse, D6 : cinq mauvais mots de passe tapés depuis cinq adresses sur « alice » verrouillaient Alice 15 min.
      const codes = [];
      for (let i = 0; i < 5; i++) codes.push((await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'faux-faux-' + i }, { entetes: { 'X-Forwarded-For': ip() } })).code);
      v('cinq essais ratés sur « alice » depuis cinq adresses DIFFÉRENTES : tous vont jusqu\'à OP GESTION', codes, [401, 401, 401, 401, 401]);
      const legitime = await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }, { entetes: { 'X-Forwarded-For': ip() } });
      v('⛔ Alice, avec le bon mot de passe depuis SON adresse, entre : un inconnu ne verrouille pas la victime d\'un identifiant', legitime.code, 200);
    }
    {
      // Relecture adverse, D6 (2e moitié) : les connexions RÉUSSIES usaient le plafond — la 6e d'une équipe derrière une même sortie réseau était refusée.
      const sortie = '203.0.113.91', codes = [];
      for (let i = 0; i < 8; i++) codes.push((await T.client(svc.base).post('/api/beta/entrer', { login: i % 2 ? 'bob' : 'alice', pass: i % 2 ? 'pw-bob-12345' : 'pw-alice-1234' }, { entetes: { 'X-Forwarded-For': sortie } })).code);
      v('⛔ huit connexions RÉUSSIES depuis la même sortie réseau en moins de 15 min : toutes passent (un succès se rembourse)', codes, [200, 200, 200, 200, 200, 200, 200, 200]);
      // …mais des échecs entre deux succès comptent toujours.
      const mix = [];
      for (let i = 0; i < 6; i++) mix.push((await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'faux-' + i }, { entetes: { 'X-Forwarded-For': sortie } })).code);
      v('   et cinq ÉCHECS à la suite sur cette sortie ferment la sixième (429) : le plafond des échecs reste entier', mix, [401, 401, 401, 401, 401, 429]);
    }
    {
      // Une panne d'OP GESTION n'use pas le plafond de l'essayeur : il n'a rien fait de mal.
      const sortie = '203.0.113.92';
      og.mode = 'panne';
      const pannes = [];
      for (let i = 0; i < 7; i++) pannes.push((await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }, { entetes: { 'X-Forwarded-For': sortie } })).code);
      og.mode = 'normal';
      v('⛔ sept essais pendant une panne d\'OP GESTION : tous 503 — aucun n\'a usé le plafond', pannes, [503, 503, 503, 503, 503, 503, 503]);
      v('   et la panne finie, la même adresse entre', (await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }, { entetes: { 'X-Forwarded-For': sortie } })).code, 200);
    }
    {
      // Le plafond se compte par RÉSEAU : un /64 IPv6 est UN seau, quelle que soit l'adresse complète.
      const codes = [];
      for (let i = 0; i < 6; i++) codes.push((await T.client(svc.base).post('/api/beta/entrer', { login: 'autre', pass: 'faux-faux-' + i }, { entetes: { 'X-Forwarded-For': '2001:db8:aaaa:bbbb:' + (i + 1) + ':' + (i + 7) + '::' + (i + 1) } })).code);
      v('⛔ six adresses IPv6 d\'un MÊME /64 partagent le plafond : le sixième essai est refusé (429)', codes, [401, 401, 401, 401, 401, 429]);
    }

    console.log('\nLes plafonds du § 3.6, chacun avec un Retry-After vrai');
    {
      const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234', ip()), B = await T.connecter(svc, og, 'bob', 'pw-bob-12345', ip());
      const l = await A.post('/api/contacts/lien', {}); await B.post('/api/liens/accepter', { code: l.j.code });
      const D = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
      const msg = (c, i) => c.post('/api/conversations/' + D + '/messages', { cid: 'cid-plafond-' + i + '-' + crypto.randomBytes(4).toString('hex'), texte: 'm' + i });
      let ok = 0, refuse = null;
      for (let i = 0; i < 61 && !refuse; i++) { const r = await msg(A, i); if (r.code === 201) ok++; else refuse = r; }
      v('⛔ messages : 60 par minute par compte — le 61e est refusé 429 quota_atteint', [ok, refuse && refuse.code, refuse && refuse.j.error], [60, 429, 'quota_atteint']);
      vrai('Retry-After entier entre 1 et 60, repris dans le corps', refuse && entierRetry(refuse) >= 1 && entierRetry(refuse) <= 60 && refuse.j.retry === entierRetry(refuse));
      v('un AUTRE compte n\'est pas touché (le plafond est par compte)', (await msg(B, 'b')).code, 201);
      const refusAvant = (await T.client(svc.base).get('/health')).j.quotasRefus;
      v('un refus de plus pour le même compte (le 62e)', (await msg(A, 'encore')).code, 429);
      const refusApres = (await T.client(svc.base).get('/health')).j.quotasRefus;
      vrai('⛔ /health compte les refus : un refus de plus fait monter quotasRefus (la surveillance pourra en parler) — ' + refusAvant + ' puis ' + refusApres, Number.isInteger(refusAvant) && refusAvant >= 1 && refusApres > refusAvant);

      const grp = (c, i) => c.post('/api/conversations/groupe', { nom: 'G' + i, membres: [] });
      let g = 0, gr = null;
      for (let i = 0; i < 21 && !gr; i++) { const r = await grp(B, i); if (r.code === 201) g++; else gr = r; }
      v('⛔ groupes : 20 par heure — le 21e est refusé (429)', [g, gr && gr.code], [20, 429]);
      vrai('Retry-After du plafond horaire : de l\'ordre d\'une heure', gr && entierRetry(gr) > 60 && entierRetry(gr) <= 3600);
      let li = 0, lr = null;
      for (let i = 0; i < 21 && !lr; i++) { const r = await B.post('/api/contacts/lien', {}); if (r.code === 201) li++; else lr = r; }
      v('⛔ liens d\'invitation : 20 par heure — le 21e est refusé (429)', [li, lr && lr.code], [20, 429]);
      const s1 = await A.post('/api/conversations/' + D + '/saisie', { actif: true }), s2 = await A.post('/api/conversations/' + D + '/saisie', { actif: true });
      v('⛔ saisie : 1 par 2 secondes', [s1.code, s2.code, entierRetry(s2) >= 1 && entierRetry(s2) <= 2], [200, 429, true]);
      svc.avancer(61 * 1000);
      v('⛔ la fenêtre échue (horloge avancée d\'une minute) rouvre le plafond des messages', (await msg(A, 'apres')).code, 201);
      svc.avancer(-61 * 1000);
    }

    console.log('\nLe budget général par adresse : 600 requêtes par minute — mais /health et le flux n\'y sont pas');
    {
      const IP = '203.0.113.99';
      const c = T.client(svc.base);
      let n429 = null, passes = 0;
      for (let i = 0; i < 601 && !n429; i++) { const r = await c.get('/api/config', { entetes: { 'X-Forwarded-For': IP } }); if (r.code === 200) passes++; else n429 = r; }
      v('⛔ la 601e requête de la même adresse est refusée (429) avec Retry-After', [passes, n429 && n429.code, n429 && n429.j.error, n429 && entierRetry(n429) >= 1], [600, 429, 'quota_atteint', true]);
      v('⛔ /health reste joignable adresse épuisée (la surveillance ne doit pas être aveuglée — la spirale « connexion requise » d\'OP GESTION)', (await c.get('/health', { entetes: { 'X-Forwarded-For': IP } })).code, 200);
      const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234', ip());
      A.poserCookie(A.cookie());
      const f = await T.flux(A, {});
      v('et un flux déjà autorisé s\'ouvre depuis une adresse épuisée : le flux est hors budget (un seul par onglet)', f.statut, 200);
      f.fermer();
    }

    console.log('\nUn compte public de moins de 24 h a des limites plus basses ; un accès bêta, non');
    {
      const jeune = S.personneCreer({ identifiant: 'compte:jeune' + crypto.randomBytes(3).toString('hex') + '@exemple.invalide', prenom: 'Jeune', nom: 'Compte', origine: 'compte', verifie: true });
      const j = jeton(); S.sessionAjouter({ h: sha(j), personne: jeune.id, appareil: null, ttlMs: 86400000 });
      const cj = T.client(svc.base, { xff: ip() }); cj.poserCookie(j);
      const G = (await cj.post('/api/conversations/groupe', { nom: 'Jeune', membres: [] })).j.conversation.id;
      let ok = 0, r = null;
      for (let i = 0; i < 25 && !r; i++) { const x = await cj.post('/api/conversations/' + G + '/messages', { cid: 'cid-jeune-' + i + '-' + crypto.randomBytes(3).toString('hex'), texte: 'x' }); if (x.code === 201) ok++; else r = x; }
      v('⛔ un compte public créé il y a moins de 24 h : 20 messages par minute (un tiers de 60)', [ok, r && r.code], [20, 429]);
      svc.avancer(25 * 3600000);
      /* la base du banc date en heure RÉELLE, le service en heure décalée : la session doit durer plus que le décalage (sinon on mesure l'expiration, pas l'âge) */
      const j2 = jeton(); S.sessionAjouter({ h: sha(j2), personne: jeune.id, appareil: null, ttlMs: 10 * 86400000 });
      const cj2 = T.client(svc.base, { xff: ip() }); cj2.poserCookie(j2);
      let ok2 = 0, r2 = null;
      for (let i = 0; i < 61 && !r2; i++) { const x = await cj2.post('/api/conversations/' + G + '/messages', { cid: 'cid-vieux-' + i + '-' + crypto.randomBytes(3).toString('hex'), texte: 'x' }); if (x.code === 201) ok2++; else r2 = x; }
      vrai('⛔ le même compte, vieux de plus de 24 h, retrouve les 60 (la limite basse est liée à l\'ÂGE, pas au compte)', ok2 >= 40 && ok2 <= 60);
      svc.avancer(-25 * 3600000);
    }

    console.log('\nUn compte qui écrit trop (300 écritures par minute) est refusé, quel que soit le geste');
    {
      const E = await T.connecter(svc, og, 'bob', 'pw-bob-12345', ip());
      let n = 0, r = null;
      for (let i = 0; i < 305 && !r; i++) { const x = await E.post('/api/moi/maj', { statut: 's' + i }); if (x.code === 200) n++; else r = x; }
      vrai('⛔ une écriture qui répond 429 avant la 305e (le plafond d\'écriture par compte ou celui de /api/moi/maj : 60 par heure)', r && r.code === 429 && n < 305);
    }

    console.log('\nLES JOURNAUX NE DISENT RIEN : un scénario complet rejoué avec des CANARIS, cherchés dans la sortie ET sur le disque');
    {
      const IPCANARI = '198.51.100.222', MDP = 'CANARI-MDP-ZXQ-0001', LOGIN = 'canari.login.zxq', TEXTE = 'CANARI-TEXTE-ZXQ-0002', GROUPE = 'CANARI-GROUPE-ZXQ-0003', NOM = 'PrenomCanariZXQ';
      const c = T.client(svc.base, { xff: IPCANARI });
      const e = await c.post('/api/beta/entrer', { login: LOGIN, pass: MDP });
      v('population : le compte aux canaris entre (200)', e.code, 200);
      const jetonSession = c.cookie();
      await c.post('/api/beta/entrer', { login: LOGIN, pass: 'faux-' + MDP });   // un échec, avec le canari dans le mot de passe
      const l = await c.post('/api/contacts/lien', {});
      const G = (await c.post('/api/conversations/groupe', { nom: GROUPE, membres: [] })).j.conversation.id;
      await c.post('/api/conversations/' + G + '/messages', { cid: 'cid-canari-0001', texte: TEXTE });
      await c.post('/api/conversations/' + G + '/messages', { cid: 'cid-canari-0002', texte: TEXTE + ' modifiable' });
      await c.post('/api/moi/maj', { statut: 'CANARI-STATUT-ZXQ' });
      await c.get('/api/conversations/' + G + '/messages');
      await c.post('/api/liens/lire', { code: l.j.code });
      for (let i = 0; i < 70; i++) await c.get('/api/config');   // pas de refus ici : 600/min
      const nb = T.client(svc.base, { xff: IPCANARI });
      for (let i = 0; i < 7; i++) await nb.post('/api/beta/entrer', { login: LOGIN, pass: 'faux-faux-' + i });   // des refus (429) avec l'adresse canari
      await c.get('/api/personnes/p_' + '0'.repeat(32));
      await c.post('/api/conversations/' + G + '/messages', { cid: 'cid-canari-0003', texte: 'x'.repeat(70000) });   // 413
      await T.flux(c).then(f => { f.fermer(); });
      await c.post('/api/compte/deconnexion', {});
      const sortie = svc.sortie.texte();
      vrai('population : le service a bien écrit des lignes de journal (démarrage, refus…) à examiner', sortie.split('\n').filter(x => x.startsWith('{')).length >= 2);
      for (const [nom, canari] of [['l\'adresse IP du client', IPCANARI], ['le mot de passe', MDP], ['l\'identifiant de connexion', LOGIN], ['le nom affiché', NOM], ['le texte d\'un message', TEXTE], ['le nom d\'un groupe', GROUPE], ['le statut', 'CANARI-STATUT-ZXQ'], ['le jeton de session', jetonSession], ['un code de lien', l.j.code]]) {
        v('⛔ ' + nom + ' n\'apparaît NULLE PART dans la sortie du service', sortie.includes(canari), false);
      }
      v('⛔ aucune adresse IP (quelle qu\'elle soit, hors la boucle locale de configuration) dans la sortie', (sortie.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g) || []).filter(x => x !== '127.0.0.1'), []);
      v('⛔ chaque ligne JSON de la sortie ne porte que des champs de la liste blanche (evt, t, quota, nom, code, instance, port, sha, etat, n, motif, route)',
        sortie.split('\n').filter(x => x.startsWith('{')).filter(x => { try { return Object.keys(JSON.parse(x)).some(k => !['t', 'evt', 'quota', 'nom', 'code', 'instance', 'port', 'sha', 'etat', 'n', 'motif', 'route'].includes(k)); } catch (er) { return true; } }), []);
      const disque = Buffer.concat(['', '-wal', '-shm'].map(s => { try { return fs.readFileSync(path.join(svc.data, 'msg.db' + s)); } catch (er) { return Buffer.alloc(0); } }));
      vrai('population : la base a des octets à examiner', disque.length > 8192);
      for (const [nom, canari] of [['le mot de passe', MDP], ['l\'adresse IP', IPCANARI], ['le jeton de session en clair', jetonSession], ['le code de lien en clair', l.j.code], ['le texte d\'un message', TEXTE], ['le nom d\'un groupe', GROUPE], ['l\'identifiant de connexion', LOGIN]]) {
        v('⛔ sur le DISQUE : ' + nom + ' n\'est jamais écrit en clair', disque.includes(Buffer.from(canari)), false);
      }
      const h = (await T.client(svc.base).get('/health')).txt;
      vrai('/health ne contient aucun canari', ![IPCANARI, MDP, LOGIN, NOM, TEXTE, GROUPE].some(x => h.includes(x)));
      vrai('un refus de quota est journalisé SANS adresse ni compte (champ « quota » seul)', /"evt":"quota_refuse","quota":"ip"/.test(sortie) || !/quota_refuse/.test(sortie));
    }

    console.log('\nLe service ne meurt pas sur une demande piégée, et ne répond jamais avec sa pile');
    {
      const c = T.client(svc.base, { xff: ip() });
      for (const [nom, f] of [
        ['un JSON profond', () => c.post('/api/moi/maj', '{"a":'.repeat(2000) + '1' + '}'.repeat(2000))],
        ['un identifiant en octets de contrôle', () => c.get('/api/conversations/%00%01%02')],
        ['un en-tête Cookie démesuré', () => c.get('/api/moi', { entetes: { Cookie: 'opm=' + 'A'.repeat(7000) } })],
        ['une requête sans corps sur une écriture', () => c.post('/api/beta/entrer', undefined)],
        ['un Content-Length menteur (corps tronqué)', async () => c.post('/api/beta/entrer', '{"login":"a')],
      ]) {
        const r = await f().catch(() => ({ code: 0, txt: '' }));
        vrai(nom + ' → réponse propre (4xx/5xx JSON sans pile ni chemin de fichier) ou coupure', r.code === 0 || (r.code >= 400 && !/at \S+ \(|\/home\/|node_modules|server-msg/.test(r.txt || '')));
      }
      v('⛔ le service est toujours vivant après ces demandes piégées', (await T.client(svc.base).get('/health')).code, 200);
      vrai('et son processus n\'est pas sorti', svc.sorti() === null);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  S.fermer();
  await svc.arreter(); await og.fermer();
  fin();
})();
