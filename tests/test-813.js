/* ⛔ CE QUE CE FICHIER GARDE — L'ARRIÈRE-GUICHET DU PORTAIL, LE JOUR OÙ IL QUITTE GOOGLE.

   Décision de Justin, 25 septembre 2026 : la mise à jour publique supprime Firebase. Le portail
   (`espace.html`) parle désormais à nos comptes (`comptes.js`) et à nos dossiers (`portail.js`).
   Relu le jour même, tout ce qui se passe DERRIÈRE le guichet parlait encore à Google — et rien
   ne cassait à l'écran :
     1. `cliSync` n'envoyait la fiche du client qu'avec un jeton Google : avec nos comptes il se
        taisait, et avec lui le circuit d'inscription (espace créé, adresse et code d'accès au
        client, récapitulatif au patron) et le relais des codes promo ;
     2. « accès activé » et la formule payée s'écrivaient chez Google, que le portail ne lit plus ;
     3. supprimer un compte du site n'effaçait que Google : compte, dossier et fil restaient ici ;
     4. la liste des comptes du site dans la Tour ne voyait que Google ;
     5. l'activation d'un code promo depuis le portail était jetée par le serveur sans un mot.

   ⛔ LA COUTURE, PAS LES MOITIÉS. On extrait les VRAIES fonctions de la page (`portailMaison`,
   `cliSync`, `cliResume`) et on les fait parler au VRAI serveur (`server/index.js`, isolé), avec
   un facteur SMTP et un Google de banc sur 127.0.0.1 — jeton d'administration SIGNÉ et vérifié,
   Firestore, Identity Toolkit. ⚠️ Jamais `api.teamop.fr`, jamais Google : c'est pour ça que
   l'adresse de l'Identity Toolkit est devenue redirigeable (`TEAMOP_IDTK_URL`, `urlBanc`). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b813-'));
let enfant = null, faux = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (faux) faux.close(); } catch (e) {}
  try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();

/* Le facteur du banc (le même que `test-741`) : ce que le serveur envoie, on le lit. */
function facteur() {
  const recus = [];
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  return { s, recus };
}
/* Quoted-printable en UTF-8 : chaque `=XX` est un OCTET, et un accent en fait deux. Décodé
   caractère par caractère, « Hygiène » devenait « HygiÃ¨ne » et ne se retrouvait plus. */
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
/* Le DESTINATAIRE se lit dans l'en-tête `To:`, pas n'importe où dans le message : le récapitulatif
   du patron cite l'adresse du client ET le lien de son espace — selon l'ordre d'arrivée des deux
   courriels, le banc lisait l'un pour l'autre (échec intermittent, mesuré). */
const courrierPour = (adresse, motif) => facteurSrv.recus.map(lisible).filter(m =>
  new RegExp('^To:[^\\n]*' + adresse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'mi').test(m) && (!motif || motif.test(m)));
const attendre = async (f, n) => { for (let i = 0; i < (n || 80); i++) { const x = f(); if (x) return x; await dormir(100); } return f(); };

/* ── LES VRAIES FONCTIONS DE LA PAGE ─────────────────────────────────────────────────────────
   ⛔ Ancrées sur des DÉCLARATIONS, pas sur des phrases : ce fichier est très commenté. */
function tranche(debut, finMarque) {
  const i = PAGE.indexOf(debut); if (i < 0) return '';
  const j = PAGE.indexOf(finMarque, i + debut.length); if (j < 0) return '';
  return PAGE.slice(i, j);
}
function fabriquer(base) {
  const adaptateur = tranche('const API_PORTAIL', 'const _pv = portailMaison();');
  const apps = tranche('const APPS={', '\n  const NEWS_TAGS');
  const relais = tranche('const CLI_SYNC_URL=', '/* 🎁 Codes promo');
  const promo = tranche('const APPS_PROMO=', 'async function promoActivate');
  if (!adaptateur || !apps || !relais || !promo) return null;
  const rangement = new Map(), session = new Map(), envois = [];
  const fetchEspion = (u, o) => { const p = fetch(u, o); envois.push({ u, o, p }); return p; };
  const code = adaptateur.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(base) + ';\n')
    + '\n' + apps + '\n' + relais + '\n' + promo
    + '\nreturn { pv: portailMaison(), cliSync, cliResume, promoInfo, clientApps };';
  const f = new Function('fetch', 'window', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', code);
  const fonctions = f(fetchEspion, { fetch: fetchEspion }, crypto.webcrypto, TextEncoder, { warn: () => {}, log: () => {}, error: () => {} },
    { hostname: '127.0.0.1' },
    { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) },
    { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, x) => session.set(k, String(x)), removeItem: k => session.delete(k) },
    setTimeout, clearTimeout);
  return Object.assign(fonctions, { envois, session });
}

console.log('\n── 813 · l\'arrière-guichet du portail : inscription, statut payé, suppression, liste — sans Google ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ══ 1. UN GOOGLE DE BANC — jeton signé et vérifié, Firestore, Identity Toolkit ══════════════ */
  const paire = crypto.generateKeyPairSync('rsa', { modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const JETON = 'jeton-de-banc-' + crypto.randomBytes(6).toString('hex');
  const G = { requetes: 'ok', ecritures: [], suppressions: [], comptesSupprimes: [], lectures: 0,
    /* Les comptes du site encore chez Google (la Tour les liste aussi) */
    utilisateurs: [{ localId: 'uid-google-1', email: 'client.google@exemple.fr', createdAt: '1756000000000', lastLoginAt: '1757000000000', emailVerified: true }],
    /* Les dossiers d'inscription de Google, à reprendre */
    dossiers: [{ name: 'projects/elan-gestion/databases/(default)/documents/teamop_requests/uid-google-1', fields: {
      email: { stringValue: 'client.google@exemple.fr' }, prenom: { stringValue: 'Céline' }, nom: { stringValue: 'Google' },
      company: { stringValue: 'Hygiène Reprise' }, siret: { stringValue: '12345678900011' }, status: { stringValue: 'fourni' },
      plan: { stringValue: 'Pro' }, apps: { arrayValue: { values: [{ stringValue: 'elan' }] } },
      demandes: { arrayValue: { values: [{ mapValue: { fields: { app: { stringValue: 'OP GESTION' }, besoin: { stringValue: 'deux équipes' } } } }] } },
      createdAt: { timestampValue: '2026-08-01T08:00:00Z' } } }] };
  const lireCorps = (q) => new Promise(res => { let c = ''; q.on('data', d => { c += d; }); q.on('end', () => res(c)); });
  faux = http.createServer(async (q, r) => {
    const corps = await lireCorps(q);
    const json = (code, o) => { r.writeHead(code, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
    if (q.method === 'POST' && q.url === '/token') {
      const assertion = decodeURIComponent((/assertion=([^&]+)/.exec(corps) || [])[1] || '');
      const [h, p, s] = assertion.split('.');
      const bon = !!(h && p && s) && crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), paire.publicKey, Buffer.from(s, 'base64url'));
      return bon ? json(200, { access_token: JETON, expires_in: 3600 }) : json(400, { error: 'invalid_grant' });
    }
    /* Les clés publiques qui signent les jetons d'identité de Google (`fbVerifie`) : servies ici,
       le banc peut fabriquer un VRAI jeton signé — et prouver qu'il ne suffit plus (G1). */
    if (q.method === 'GET' && q.url === '/certs') return json(200, { 'k-banc': paire.publicKey });
    const autorise = q.headers.authorization === 'Bearer ' + JETON;
    /* Identity Toolkit */
    const mi = /^\/idtk\/projects\/elan-gestion\/accounts:(lookup|delete|batchGet|update)/.exec(q.url);
    if (mi) {
      if (!autorise) return json(401, {});
      let b = {}; try { b = JSON.parse(corps || '{}'); } catch (e) {}
      if (mi[1] === 'lookup') { const e = ((b.email || [])[0] || '').toLowerCase(); const u = G.utilisateurs.find(x => x.email === e); return json(200, u ? { users: [u] } : {}); }
      if (mi[1] === 'delete') { G.comptesSupprimes.push(b.localId); G.utilisateurs = G.utilisateurs.filter(x => x.localId !== b.localId); return json(200, {}); }
      if (mi[1] === 'batchGet') return json(200, { users: G.utilisateurs });
      return json(200, {});
    }
    /* Firestore */
    const mf = /^\/projects\/elan-gestion\/databases\/\(default\)\/documents\/([^?]+)(\?.*)?$/.exec(q.url);
    if (mf) {
      if (!autorise) return json(401, {});
      const chemin = decodeURIComponent(mf[1]);
      if (q.method === 'GET' && chemin === 'teamop_requests') {
        G.lectures++;
        if (G.requetes === 'panne') return json(500, { error: { code: 500 } });
        if (G.requetes === 'page2') return /pageToken=/.test(q.url) ? json(500, { error: { code: 500 } }) : json(200, { documents: G.dossiers, nextPageToken: 'suite' });
        return json(200, { documents: G.dossiers });
      }
      if (q.method === 'GET' && /^teamop_threads\/[^/]+\/msgs$/.test(chemin)) return json(200, { documents: [] });
      if (q.method === 'DELETE') { G.suppressions.push(chemin); return json(200, {}); }
      if (q.method === 'PATCH') { G.ecritures.push(chemin); return json(200, { name: chemin }); }
      if (q.method === 'GET') return json(404, { error: { code: 404, status: 'NOT_FOUND', message: 'Document "projects/elan-gestion/databases/(default)/documents/' + chemin + '" not found.' } });
    }
    json(404, {});
  });
  await new Promise(res => faux.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + faux.address().port;
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));

  /* ══ 2. LE VRAI SERVEUR, ISOLÉ ════════════════════════════════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-813';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: kh(MDP), comptes: { actif: true }, notifDemandes: 'patron@banc-teamop.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
    /* Un code FICTIF, nommé dans `scripts/verif-secrets.sh` : il n'existe pas sur le VPS. */
    promos: [{ code: 'TEST3', mois: 3, formule: 'premium' }] }));
  fs.writeFileSync(path.join(banc, 'firebase-admin.json'), JSON.stringify({ client_email: 'banc@elan-gestion.iam.gserviceaccount.com', private_key: paire.privateKey }));
  const PORT = 9600 + (process.pid % 300);
  let journal = '';
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'firebase-admin.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL,
      TEAMOP_IDTK_URL: GURL + '/idtk', TEAMOP_FB_CERTS_URL: GURL + '/certs' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre, comptes du portail allumés', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {}, txt }; };
  const tour = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', tour);

  try {
    const P = fabriquer(B);
    vrai('⛔ les vraies fonctions de la page s\'extraient (adaptateur, cliSync, cliResume, promoInfo)', P && P.pv && typeof P.cliSync === 'function');
    if (!P) throw new Error('extraction impossible');
    const { auth, fs: base } = P.pv;

    /* ══ 3. L'IMPORT DES DOSSIERS DE GOOGLE (C1) ═══════════════════════════════════════════════ */
    G.requetes = 'panne';
    let r = await appel('/api/monitor/portail/importer', {}, tour);
    v('⛔ Google refuse la lecture (500) : l\'import le DIT (503) au lieu d\'annoncer « rien à importer »', [r.s, r.j.error], [503, 'lecture_500']);
    G.requetes = 'page2';
    r = await appel('/api/monitor/portail/importer', {}, tour);
    v('⛔ la deuxième page refusée : l\'import s\'arrête avec son motif, il ne s\'arrête pas en silence sur la première', [r.s, r.j.error], [503, 'lecture_500']);
    G.requetes = 'ok';
    r = await appel('/api/monitor/portail/importer', {}, tour);
    v('l\'import reprend le dossier de Google et prépare son compte', [r.s, r.j.repris, r.j.comptesPrepares], [200, 1, 1]);

    /* ══ 4. UN NOUVEAU CLIENT S'INSCRIT PAR LE PORTAIL — le circuit entier ═════════════════════ */
    const cred = await auth.createUserWithEmailAndPassword('nouveau@exemple.fr', 'un-mot-de-passe-solide');
    const user = cred.user;
    /* La page ne tient qu'UNE session : on garde celle-ci avant d'en ouvrir une autre plus bas. */
    const jetonNouveau = await user.getIdToken();
    vrai('le client crée son compte par la vraie page', user && user.email === 'nouveau@exemple.fr');
    vrai('⛔ l\'utilisateur maison a un jeton à présenter (`getIdToken`) — sans lui, `cliSync` se taisait', typeof user.getIdToken === 'function' && /^[0-9a-f]{64}$/.test(await user.getIdToken()));
    const doc = base.collection('teamop_requests').doc(user.uid);
    await doc.set({ prenom: 'Nora', nom: 'Neuve', name: 'Nora Neuve', company: 'Hygiène Nouvelle', tel: '0600000000', status: 'nouveau',
      demandes: [{ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: Date.now(), besoin: 'deux techniciens', users: '2' }] }, { merge: true });
    let d = (await doc.get()).data();
    v('sa demande est rangée dans SON dossier', [d && d.company, d && d.demandes && d.demandes.length], ['Hygiène Nouvelle', 1]);

    /* ⛔ G1 (`gardien`, 3e passe) — UNE SESSION PROUVE LE MOT DE PASSE, PAS L'ADRESSE. N'importe qui
       crée un compte au nom de n'importe quelle adresse : tant qu'elle n'est pas PROUVÉE (le lien
       du courriel), la fiche n'entre pas — ni espace créé, ni code d'accès, ni récapitulatif. */
    v('son adresse n\'est pas encore prouvée, et la page le sait (`emailVerified`)', user.emailVerified, false);
    const avant0 = P.envois.length;
    P.cliSync(user, d);
    const envoi0 = await attendre(() => P.envois.slice(avant0).find(x => /\/api\/clients\/sync$/.test(x.u)), 30);
    const rep0 = envoi0 ? await envoi0.p : null;
    v('⛔ G1 — la fiche d\'une adresse NON prouvée est refusée (403)', [rep0 && rep0.status, rep0 && (await rep0.clone().json().catch(() => ({}))).error], [403, 'adresse_non_verifiee']);
    await dormir(300);
    v('   aucun espace n\'est créé, aucun code d\'accès ne part', [((await appel('/api/monitor/espaces/liste', undefined, tour)).j.espaces || []).some(e => String(e.email || '').toLowerCase() === 'nouveau@exemple.fr'),
      courrierPour('nouveau@exemple.fr', /teamop\.fr\/e\//).length], [false, 0]);
    v('   et la page retentera : un refus ne mémorise pas la fiche', P.session.get('top_client_sync'), undefined);

    /* Le lien de confirmation : parti à l'inscription, et redemandable depuis la page. */
    const lettresAvant = courrierPour('nouveau@exemple.fr', /mode=verifyEmail&jeton=/).length;
    vrai('le lien de confirmation est parti à l\'inscription', await attendre(() => courrierPour('nouveau@exemple.fr', /mode=verifyEmail&jeton=/).length >= 1));
    vrai('⛔ la page sait le redemander (`verifRenvoyer`, nouvelle route)', typeof P.pv.verifRenvoyer === 'function');
    /* Une fonction absente ne fait pas tomber le banc : les contrôles d'après doivent encore parler. */
    const renvoyer = typeof P.pv.verifRenvoyer === 'function' ? P.pv.verifRenvoyer : async () => ({ code: 0, j: {} });
    const renvois = [];
    for (let i = 0; i < 4; i++) renvois.push((await renvoyer()).code);
    v('   trois renvois dans l\'heure, pas un de plus', renvois, [200, 200, 200, 429]);
    const lettres = await attendre(() => { const l = courrierPour('nouveau@exemple.fr', /mode=verifyEmail&jeton=/); return l.length >= Math.max(lettresAvant, 1) + 3 ? l : null; });
    vrai('   et chaque renvoi porte un lien neuf', lettres);
    const jv = ((/mode=verifyEmail&jeton=([0-9a-f]{64})/.exec((lettres || []).slice(-1)[0] || '') || [])[1]) || '';
    r = await appel('/api/compte/verifier', { jeton: jv });
    v('le client ouvre le lien : son adresse est prouvée', r.s, 200);
    const user2 = await Promise.race([new Promise(res => { const stop = auth.onAuthStateChanged(u => { if (u) { stop(); res(u); } }); }), dormir(5000).then(() => null)]);
    v('   la page relit son compte : adresse prouvée', user2 && user2.emailVerified, true);
    v('   un renvoi n\'a plus lieu d\'être', [(await renvoyer()).code], [200]);
    v('   (et le serveur le dit)', (await appel('/api/compte/verifier/renvoyer', {}, jetonNouveau)).j.deja, true);

    const avantEnvois = P.envois.length;
    P.cliSync(user, d);
    const envoi = await attendre(() => P.envois.slice(avantEnvois).find(x => /\/api\/clients\/sync$/.test(x.u)), 30);
    vrai('⛔ `cliSync` ENVOIE la fiche (il se taisait avec nos comptes)', envoi);
    const rep = envoi ? await envoi.p : null;
    v('⛔ et le serveur l\'accepte sur la session maison, adresse prouvée — plus de jeton Google', rep && rep.status, 200);

    const aLui = await attendre(() => courrierPour('nouveau@exemple.fr', /teamop\.fr\/e\//).pop());
    vrai('⛔ le client reçoit l\'adresse de son espace, créé tout seul', aLui);
    vrai('   avec son code d\'accès de première connexion', aLui && /entrez votre code d'accès/.test(aLui));
    const auPatron = await attendre(() => courrierPour('patron@banc-teamop.fr', /Hygiène Nouvelle/).pop());
    vrai('⛔ et le patron reçoit le récapitulatif de la demande', auPatron);
    const clients = await appel('/api/monitor/clients', undefined, tour);
    const fiche = (clients.j.clients || []).find(c => c.email === 'nouveau@exemple.fr');
    v('⛔ la Tour voit le nouveau client, avec son entreprise', fiche && fiche.entreprise, 'Hygiène Nouvelle');
    const esp = await appel('/api/monitor/espaces/liste', undefined, tour);
    const sonEspace = (esp.j.espaces || []).find(e => String(e.email || '').toLowerCase() === 'nouveau@exemple.fr');
    vrai('   et son espace existe dans l\'annuaire', sonEspace);

    /* ══ 4 bis. G1 — SE FAIRE PASSER POUR UNE ENTREPRISE DONT ON NE POSSÈDE PAS LA BOÎTE ═══════════
       Une entreprise ouverte par la Tour, formule payante, adresse de contact publique (un camion,
       une facture). Avant : un compte créé à cette adresse — jamais prouvée — suffisait pour que
       `/api/clients/sync` la traite comme prouvée, et une demande « Gratuit » faisait passer
       l'entreprise au forfait gratuit (`espacePaye` : « gratuit » = payé). Deux chemins : nos
       comptes, et un jeton de Google (un compte Firebase se crée aussi pour n'importe quelle
       adresse, avec la clé publique de l'ancien site). */
    const codeVictime = Buffer.from(JSON.stringify({ t: 'ent-victime813', k: 'CLE-VICTIME-813' })).toString('base64');
    r = await appel('/api/monitor/espaces', { nom: 'Victime SARL', code: codeVictime, email: 'contact@victime.fr', origine: 'tour' }, tour);
    const rf = await appel('/api/monitor/espaces/formule', { nom: 'Victime SARL', formule: 'premium', quantite: 3 }, tour);
    const formuleVictime = async () => { const e = ((await appel('/api/monitor/espaces/liste', undefined, tour)).j.espaces || []).find(x => x.slug === 'victimesarl') || {}; return [e.formule, e.quantite]; };
    v('la Tour ouvre l\'espace d\'une entreprise cliente, en formule payante', [r.s, rf.s, await formuleVictime()], [200, 200, ['premium', 3]]);
    const demandeGratuite = { company: 'Victime SARL', demandes: [{ app: 'OP GESTION', formule: 'Gratuit', statut: 'nouveau', date: Date.now(), users: '1' }] };

    const jetonGoogle = (email) => { const now = Math.floor(Date.now() / 1000);
      const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k-banc', typ: 'JWT' })).toString('base64url');
      const p = Buffer.from(JSON.stringify({ aud: 'elan-gestion', iss: 'https://securetoken.google.com/elan-gestion', sub: 'uid-usurpateur', iat: now, exp: now + 3600, email, email_verified: false })).toString('base64url');
      return h + '.' + p + '.' + crypto.sign('RSA-SHA256', Buffer.from(h + '.' + p), paire.privateKey).toString('base64url'); };
    r = await appel('/api/clients/sync', demandeGratuite, jetonGoogle('contact@victime.fr'));
    v('⛔ G1 — un jeton de Google SIGNÉ, adresse jamais prouvée : refusé, le portail maison est allumé', r.s, 401);
    v('   la formule de l\'entreprise n\'a pas bougé', await formuleVictime(), ['premium', 3]);

    const U = fabriquer(B);   // un AUTRE onglet : sa session ne touche pas celle du client du dessus
    const usurpe = await U.pv.auth.createUserWithEmailAndPassword('contact@victime.fr', 'mot-de-passe-de-l-usurpateur');
    vrai('   l\'usurpateur ouvre un compte maison à l\'adresse de contact (rien ne l\'en empêche)', usurpe && usurpe.user && usurpe.user.emailVerified === false);
    const av = U.envois.length;
    U.cliSync(usurpe.user, demandeGratuite);
    const envU = await attendre(() => U.envois.slice(av).find(x => /\/api\/clients\/sync$/.test(x.u)), 30);
    v('⛔ G1 — et sa fiche est refusée : 403, adresse non prouvée', envU && (await envU.p).status, 403);
    await dormir(300);
    v('⛔ la formule de l\'entreprise n\'a pas bougé', await formuleVictime(), ['premium', 3]);
    v('   aucune fiche à son nom dans la Tour, aucun courriel parti chez la victime',
      [((await appel('/api/monitor/clients', undefined, tour)).j.clients || []).some(c => c.email === 'contact@victime.fr'),
        courrierPour('contact@victime.fr', /teamop\.fr\/e\/|code d'accès/).length], [false, 0]);

    /* ══ 5. « ACCÈS ACTIVÉ », ÉCRIT CHEZ NOUS — PLUS RIEN CHEZ GOOGLE ══════════════════════════ */
    d = (await doc.get()).data();
    for (let i = 0; i < 30 && !(d && d.status === 'fourni'); i++) { await dormir(100); d = (await doc.get()).data(); }
    v('⛔ le portail du client dit « accès activé » et OP GESTION (la fiche est écrite chez NOUS)', [d && d.status, d && d.apps], ['fourni', ['elan']]);
    v('⛔ et aucune fiche client n\'a été écrite chez Google (`teamop_requests`)', G.ecritures.filter(x => /^teamop_requests\//.test(x)), []);

    /* ══ 6. UN CODE PROMO ACTIVÉ SUR LE PORTAIL — par la VRAIE `promoActivate` ══════════════════
       Elle écrivait `promo` elle-même dans le dossier (Firestore) ; notre serveur réserve ce champ,
       et l'écriture était jetée sans un mot. Elle passe désormais par `/api/portail/promo`. */
    const pa = tranche('async function promoActivate(uid){', '/* ⏳ Alerte J-2');
    vrai('la vraie `promoActivate` s\'extrait de la page', pa.length > 300 && /_pv\.promoActiver\(/.test(pa));
    const ecrans = { 'promo-code': { value: '' }, 'promo-msg': { innerHTML: '' } }, vues = [], etat = { doc: d };
    const activer = new Function('document', 'esc', 'promoInfo', '_pv', 'openView', 'etat',
      'let _meDoc = etat.doc;\n' + pa + '\nreturn async (uid) => { await promoActivate(uid); etat.doc = _meDoc; };')(
      { getElementById: id => ecrans[id] || null }, x => String(x), P.promoInfo, P.pv, x => vues.push(x), etat);
    ecrans['promo-code'].value = 'INCONNU';
    await activer(user.uid);
    v('⛔ un code inconnu : la page le DIT, et n\'ouvre rien', [/Code inconnu/.test(ecrans['promo-msg'].innerHTML), vues.length], [true, 0]);
    ecrans['promo-code'].value = ' test3 ';
    await activer(user.uid);
    v('⛔ un code valide : accordé par le SERVEUR, la page ouvre « Mon abonnement »', [vues, etat.doc && etat.doc.promo && etat.doc.promo.code], [['abo'], 'TEST3']);
    d = (await doc.get()).data();
    v('⛔ l\'offre est dans le dossier, avec l\'échéance calculée par le serveur (3 mois de `config.promos`)',
      [d.promo && d.promo.code, d.promoUsed, Math.round(((d.promo && d.promo.until) - Date.now()) / 86400000)], ['TEST3', ['TEST3'], 90]);
    v('   la page la relit comme une offre en cours', !!P.promoInfo(d), true);
    const resume = P.cliResume(user, d);
    v('   et la fiche envoyée à la Tour la porte', resume.promoCode, 'TEST3');
    const avant2 = P.envois.length;
    P.session.clear();
    P.cliSync(user, d);
    const envoi2 = await attendre(() => P.envois.slice(avant2).find(x => /\/api\/clients\/sync$/.test(x.u)), 30);
    v('   le relais l\'accepte', envoi2 && (await envoi2.p).status, 200);
    const esp2 = await appel('/api/monitor/espaces/liste', undefined, tour);
    const e2 = (esp2.j.espaces || []).find(e => String(e.email || '').toLowerCase() === 'nouveau@exemple.fr') || {};
    v('⛔ le code atteint l\'espace de l\'entreprise (le serveur l\'a revérifié dans `config.promos`)', [e2.promoCode, e2.paye], ['TEST3', true]);

    /* Un jeton inventé ne passe pas pour une session. */
    r = await appel('/api/clients/sync', { email: 'nouveau@exemple.fr', demandes: [] }, 'f'.repeat(64));
    v('⛔ un jeton de 64 caractères inventé : refusé (401)', r.s, 401);

    /* ══ 7. LA LISTE DES COMPTES DU SITE, DANS LA TOUR ══════════════════════════════════════════ */
    r = await appel('/api/monitor/comptes-site', undefined, tour);
    const lignes = r.j.comptes || [];
    const parMail = {}; for (const x of lignes) parMail[x.email] = x;
    v('⛔ la Tour liste les comptes maison (le nouveau client) ET ceux de Google, une ligne par adresse',
      [!!parMail['nouveau@exemple.fr'], !!parMail['client.google@exemple.fr'], lignes.filter(x => x.email === 'client.google@exemple.fr').length], [true, true, 1]);
    v('   le compte repris de Google est marqué « chez nous », à poser', [parMail['client.google@exemple.fr'] && parMail['client.google@exemple.fr'].chezNous, parMail['client.google@exemple.fr'] && parMail['client.google@exemple.fr'].aPoser], [true, true]);
    v('   et le nouveau client porte son entreprise', parMail['nouveau@exemple.fr'] && parMail['nouveau@exemple.fr'].aUnEspace, true);

    /* ══ 8. SUPPRIMER UN COMPTE DU SITE — chez nous d'abord ════════════════════════════════════ */
    const essai = await auth.createUserWithEmailAndPassword('essai@exemple.fr', 'un-autre-mot-de-passe');
    await base.collection('teamop_requests').doc(essai.user.uid).set({ company: 'Essai' }, { merge: true });
    const jetonEssai = await essai.user.getIdToken();
    r = await appel('/api/monitor/comptes-site/supprimer', { email: 'essai@exemple.fr' }, tour);
    v('⛔ la Tour supprime un compte qui n\'existe que chez nous', [r.s, /supprimé chez TeamOP/.test(r.j.detail || '')], [200, true]);
    r = await appel('/api/portail/moi', undefined, jetonEssai);
    v('   sa session ne rouvre rien', r.s, 401);
    r = await appel('/api/compte/connexion', { email: 'essai@exemple.fr', h: crypto.createHash('sha256').update('teamop-portail:un-autre-mot-de-passe').digest('hex') });
    v('   et son mot de passe non plus', r.s, 401);
    const liste2 = ((await appel('/api/monitor/comptes-site', undefined, tour)).j.comptes || []).map(x => x.email);
    v('   il a disparu de la liste', liste2.indexOf('essai@exemple.fr'), -1);

    /* La porte « fermer un client » : code à six chiffres au patron, puis la fermeture. */
    r = await appel('/api/monitor/clients/retirer', { email: 'nouveau@exemple.fr' }, tour);
    v('fermer un client : le code de confirmation part au patron', [r.s, r.j.codeEnvoye], [200, true]);
    const lettreCode = await attendre(() => courrierPour('patron@banc-teamop.fr', /Code de confirmation : \d{6}/).pop());
    const codeF = ((/Code de confirmation : (\d{6})/.exec(lettreCode || '') || [])[1]) || '';
    r = await appel('/api/monitor/clients/retirer', { email: 'nouveau@exemple.fr', code: codeF }, tour);
    v('   la fermeture passe', [r.s, r.j.supprime], [200, true]);
    vrai('⛔ et le compte du site est supprimé CHEZ NOUS aussi (pas seulement chez Google)', /supprimé chez TeamOP/.test((r.j.compteSite && r.j.compteSite.motif) || ''));
    r = await appel('/api/portail/moi', undefined, jetonNouveau);
    v('   le client fermé n\'ouvre plus son portail', r.s, 401);
    const liste3 = ((await appel('/api/monitor/comptes-site', undefined, tour)).j.comptes || []).map(x => x.email);
    v('   ni la liste de la Tour', liste3.indexOf('nouveau@exemple.fr'), -1);

    v('⛔ du début à la fin, aucune donnée de client n\'est partie chez Google (aucune écriture Firestore hors version)',
      G.ecritures.filter(x => !/^teamop_config\//.test(x)), []);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-1500));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
