/* ⛔ CE QUE CE FICHIER GARDE — QUE `espace.html` ET LE SERVEUR SE PARLENT VRAIMENT.

   C'est la règle cardinale de CLAUDE.md, et ce dépôt l'a payée trois fois le 20 septembre :
   deux moitiés justes chacune de son côté, chacune avec ses bancs verts, et qui ne se parlaient
   pas. `{lignes:[…]}` contre `b.enr` — 400, boucle quittée, INERTE EN SILENCE.

   Ce banc EXTRAIT `portailMaison()` du VRAI `espace.html` — pas une copie, pas une imitation —
   et le fait parler au VRAI `server/index.js` en HTTP sur 127.0.0.1. Un nom de champ qui change
   d'un côté doit faire tomber ce banc.

   ⛔ IL GARDE AUSSI CE QUI NE SE VOIT PAS :
   · qu'un refus remonte avec son MOTIF — un mot de passe faux et un serveur éteint ne doivent
     pas donner le même écran, c'est la panne `_mailboxes` de ce dépôt ;
   · que l'écran d'administration MORT (voir `firestore.rules:59`) refuse clairement au lieu de
     jeter une `TypeError` qui emporterait le reste de la page ;
   · que l'interrupteur FERMÉ laisse la page exactement comme avant. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const PAGE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
const MDP_ADMIN = 'mot-de-passe-du-banc-740';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'espace-740-'));
let enfant = null, facteurSrv = null;
/* Un facteur minuscule (le même que `test-741`) : le lien de vérification d'adresse naît DANS le
   courriel du serveur, et c'est lui qu'il faut suivre — un code d'accès ne part plus qu'à une
   adresse prouvée (`gardien`, C4). */
function facteur() {
  const recus = [];
  const srvS = require('net').createServer(c => {
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
  return { s: srvS, recus };
}
/* Quoted-printable et coupures de ligne : on relit le courriel comme un humain le lirait. */
const lisible = (m) => String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/* ── L'EXTRACTION ─────────────────────────────────────────────────────────────────────────────
   ⛔ ANCRÉE SUR LA FORME DU CODE, pas sur une phrase. Ce dépôt est très commenté : un motif qui
   vise une chaîne tombe dans le COMMENTAIRE qui l'explique, vingt lignes plus haut. On borne
   donc entre deux déclarations réelles. */
function extraire() {
  const i = PAGE.indexOf('const API_PORTAIL');
  const j = PAGE.indexOf('const _pv = portailMaison();');
  if (i < 0 || j < 0 || j <= i) return null;
  return PAGE.slice(i, j);
}

/* ── LE NAVIGATEUR, RÉDUIT À CE QUE L'ADAPTATEUR TOUCHE ───────────────────────────────────── */
/* ⛔ `graines` EXISTE PARCE QU'UN RECHARGEMENT NE SE SIMULE PAS EN DEUX TEMPS. L'adaptateur
   lit `localStorage` à SA CONSTRUCTION (`let jeton = localStorage.getItem(…)`), comme un vrai
   navigateur qui rouvre la page avec le rangement déjà rempli. Poser le jeton APRÈS coup
   fabriquait un adaptateur né sans jeton, et accusait la page de perdre la session. */
function fabriquer(base, graines) {
  const src = extraire();
  if (!src) return null;
  const rangement = new Map(Object.entries(graines || {}));
  const bac = {
    fetch: (u, o) => fetch(u, o),
    crypto: globalThis.crypto,
    TextEncoder,
    console: { warn: (...a) => bac._avertis.push(a.join(' ')), log: () => {}, error: () => {} },
    _avertis: [],
    location: { hostname: '127.0.0.1' },
    localStorage: {
      getItem: (k) => (rangement.has(k) ? rangement.get(k) : null),
      setItem: (k, x) => rangement.set(k, String(x)),
      removeItem: (k) => rangement.delete(k),
    },
    setTimeout, clearTimeout,
  };
  /* On remplace l'adresse de base par celle du banc — c'est la SEULE retouche, et elle porte
     sur une constante que la page calcule depuis `location`. Tout le reste est le vrai code. */
  const code = src.replace(/const API_PORTAIL = [\s\S]*?;\n/, "const API_PORTAIL = " + JSON.stringify(base) + ";\n");
  const f = new Function('fetch', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage',
    'setTimeout', 'clearTimeout', code + '\nreturn portailMaison();');
  return { api: f(bac.fetch, bac.crypto, bac.TextEncoder, bac.console, bac.location, bac.localStorage, bac.setTimeout, bac.clearTimeout), bac };
}

async function monter() {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP_ADMIN), comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
  }));
  const port = await new Promise(res => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, data, journal: () => journal };
}
const arreter = async () => {
  try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
};

(async () => {
  console.log('\n══ 1. LE PORTAIL NE PARLE PLUS QU\'À NOTRE SERVEUR ══\n');
  {
    /* ⛔ SORTIE DE FIREBASE, décision de Justin du 25 septembre 2026. Ce bloc gardait jusque-là
       l'inverse — l'interrupteur `PORTAIL_SERVEUR` fermé, Firebase en service. Il est parti avec
       les trois balises du kit : un interrupteur qu'on refermerait sans elles ferait tomber la
       page sur `firebase` absent. `auth`, `fs` et `FV` viennent de l'adaptateur, sans repli. */
    const sansCom = PAGE.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    v('⛔ plus aucune trace de Firebase dans le code du portail',
      ['firebase', 'FB_CONFIG', 'PORTAIL_SERVEUR', 'gstatic.com/firebasejs'].filter(x => sansCom.indexOf(x) >= 0), []);
    vrai('   l\'adaptateur est monté sans condition', /const _pv = portailMaison\(\);\s*const auth = _pv\.auth, fs = _pv\.fs;/.test(sansCom));
    vrai('   et les valeurs spéciales viennent de lui', /const FV = _pv\.FieldValue;/.test(sansCom));
    /* ⛔ « MOT DE PASSE OUBLIÉ » NE PASSE PLUS PAR `/api/mdp/lien`, QUI FABRIQUE UN LIEN FIREBASE.
       Relevé le 25 septembre 2026 : tant que la clé d'administration est sur le VPS, cette route
       répondait « envoyé » — le client changeait un mot de passe Google qui ne sert plus, et la
       voie maison n'était jamais appelée. */
    v('⛔ « Mot de passe oublié » ne fabrique plus de lien Firebase', /\/api\/mdp\/lien/.test(sansCom), false);
    vrai('   il passe par l\'adaptateur (/api/compte/mdp/demander)', /async function mdpLien\(email, suite\)\{\s*await auth\.sendPasswordResetEmail\(email,\{url:suite\}\);/.test(sansCom)
      && /sendPasswordResetEmail\(email\)\{ await appel\('\/api\/compte\/mdp\/demander'/.test(sansCom));
    vrai('   et l\'écran de connexion dit aux clients déjà inscrits comment retrouver leur accès', /id="avis-demenagement"[^>]*>[^<]*Mot de passe oubli/.test(PAGE));
  }

  console.log('\n══ 2. LA VRAIE FONCTION DE LA PAGE, EXTRAITE ══\n');
  const S = await monter();
  if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 600) + '\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  const A = fabriquer(S.B);
  vrai('⛔ `portailMaison` s\'extrait d\'espace.html', !!A && !!A.api && !!A.api.auth && !!A.api.fs);
  if (!A) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  const { auth, fs: base, FieldValue } = A.api;
  let jeton0 = '';   // le jeton d'avant le changement de mot de passe — il doit mourir

  console.log('\n══ 3. CRÉER UN COMPTE, DEPUIS LA VRAIE PAGE ══\n');
  {
    let vus = [];
    auth.onAuthStateChanged(u => vus.push(u ? u.email : null));
    await dormir(300);
    v('   au départ, personne n\'est connecté', vus[vus.length - 1], null);
    const cred = await auth.createUserWithEmailAndPassword('zoe@exemple.fr', 'un-mot-de-passe-solide');
    v('   la création rend un utilisateur', cred.user.email, 'zoe@exemple.fr');
    v('   et son identifiant est son adresse', cred.user.uid, 'zoe@exemple.fr');
    await dormir(100);
    v('⛔ et l\'écran est prévenu du changement d\'état', vus[vus.length - 1], 'zoe@exemple.fr');
    v('   `currentUser` suit', auth.currentUser.email, 'zoe@exemple.fr');
  }

  console.log('\n══ 4. ⛔ UN REFUS REMONTE AVEC SON MOTIF ══\n');
  {
    /* ⛔ LA PAGE TRADUIT LES CODES (`authMsg`). Un refus sans code donnerait le même écran pour
       un mot de passe faux et un serveur éteint — exactement la panne `_mailboxes`. */
    let code = '';
    try { await auth.signInWithEmailAndPassword('zoe@exemple.fr', 'pas-le-bon'); }
    catch (e) { code = e.code || ''; }
    v('⛔ un mot de passe faux porte un code que la page sait traduire', code, 'auth/wrong-password');
    let code2 = '';
    try { await auth.createUserWithEmailAndPassword('zoe@exemple.fr', 'encore-autre-chose'); }
    catch (e) { code2 = e.code || ''; }
    v('⛔ une adresse déjà prise aussi', code2, 'auth/email-already-in-use');
  }

  console.log('\n══ 5. LE DOSSIER, LE FIL, LES NOUVEAUTÉS ══\n');
  {
    await auth.signInWithEmailAndPassword('zoe@exemple.fr', 'un-mot-de-passe-solide');
    const uid = auth.currentUser.uid;
    jeton0 = A.bac.localStorage.getItem('teamop_portail_jeton');
    await base.collection('teamop_requests').doc(uid).set({
      prenom: 'Zoé', nom: 'Bernard', company: 'Bernard Hygiène', app: 'elan', users: 3,
      createdAt: FieldValue.serverTimestamp(),
    });
    const d = await base.collection('teamop_requests').doc(uid).get();
    vrai('   le dossier existe', d.exists);
    v('   avec la société', d.data().company, 'Bernard Hygiène');
    vrai('⛔ et `serverTimestamp()` a donné une vraie date', typeof d.data().createdAt === 'number' && d.data().createdAt > 0);
    /* merge:true doit garder ce qui n'est pas dans le patch — c'est ce que la page attend
       partout (facturation, plan, documents posés à des moments différents). */
    await base.collection('teamop_requests').doc(uid).set({ tel: '0600000000' }, { merge: true });
    const d2 = await base.collection('teamop_requests').doc(uid).get();
    v('⛔ merge:true garde la société', d2.data().company, 'Bernard Hygiène');
    v('   et ajoute le téléphone', d2.data().tel, '0600000000');
    /* arrayUnion : la page s'en sert pour `promoUsed` et `docs`. */
    await base.collection('teamop_requests').doc(uid).set({ docs: FieldValue.arrayUnion('contrat.pdf') }, { merge: true });
    await base.collection('teamop_requests').doc(uid).set({ docs: FieldValue.arrayUnion('contrat.pdf', 'devis.pdf') }, { merge: true });
    const d3 = await base.collection('teamop_requests').doc(uid).get();
    /* ⛔ `docs` est un champ du SERVEUR : le client ne doit PAS pouvoir se l'attribuer. Ce
       contrôle dit donc l'inverse de ce qu'on croirait — et c'est la garde qui compte. */
    v('⛔ `docs` appartient au serveur, le client ne le pose pas', d3.data().docs, undefined);

    /* ⛔ LE FIL SE LIT PAR LES MÊMES MÉTHODES QUE `listenMsgs()` APPELLE, PAS PAR UN `fetch`.
       Ce contrôle n'existait pas au premier jet — j'avais laissé un `fetch` direct, qui
       court-circuitait justement la pièce à éprouver. Mesuré le 20 septembre 2026 :
       l'adaptateur n'exposait que `add`, donc `.orderBy('ts','asc')` valait `undefined` et
       `listenMsgs()` (espace.html) jetait une `TypeError` au premier affichage — TOUT l'écran
       « Messages » tombait. Les deux moitiés étaient justes ; elles ne se parlaient pas. */
    const fil = base.collection('teamop_threads').doc(uid).collection('msgs');
    await fil.add({ from: 'client', text: 'Bonjour !' });
    vrai('⛔ le fil porte `orderBy` — `listenMsgs` l\'appelle', typeof fil.orderBy === 'function');
    vrai('⛔ le fil porte `onSnapshot` — `listenMsgs` l\'appelle', typeof fil.onSnapshot === 'function');
    const qs = await fil.orderBy('ts', 'asc').get();
    v('   le message envoyé se relit', qs.size, 1);
    const prem = qs.docs[0].data();
    v('   avec le nom de champ que la page lit (`text`)', prem.text, 'Bonjour !');
    v('   et celui qu\'elle lit pour l\'émetteur (`from`)', prem.from, 'client');
    vrai('   et une date', typeof prem.ts === 'number' && prem.ts > 0);
    /* `onSnapshot` doit TIRER TOUT DE SUITE : sans premier battement, l'écran reste sur
       « Chargement… » et a l'air en panne. On mesure le tir, puis on coupe la sonde. */
    const vuFil = await new Promise((res2) => {
      let stop = null; const t = setTimeout(() => { if (stop) stop(); res2(null); }, 4000);
      stop = fil.orderBy('ts', 'asc').onSnapshot((r) => { clearTimeout(t); if (stop) stop(); res2(r); });
    });
    vrai('⛔ `onSnapshot` tire immédiatement, sans attendre un battement', !!vuFil && vuFil.size === 1);

    /* ⛔ `access` PORTE LE CODE D'ACTIVATION DE L'ESPACE. `espace.html` ne montre le bouton
       « 🚀 Activer mon espace » que si le message en porte un : c'est la seule porte d'entrée
       d'un nouveau client dans OP GESTION. Le laisser tomber murerait cette entrée. */
    const tour = await (await fetch(S.B + '/api/monitor/login', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'Patron', pass: MDP_ADMIN }) })).json();
    vrai('   la Tour se connecte', /^[a-f0-9]{48}$/.test(String(tour.token || '')));
    const rRefus = await fetch(S.B + '/api/monitor/portail/message', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tour.token },
      body: JSON.stringify({ email: 'zoe@exemple.fr', texte: 'Votre espace est prêt', access: 'CODE-ABCXYZ', accessName: 'Bernard Hygiène' }) });
    v('⛔ un code d\'accès vers une adresse jamais prouvée : refusé (409) — c\'est peut-être quelqu\'un qui a tapé son adresse', rRefus.status, 409);
    /* Zoé ouvre le lien reçu à la création de son compte : son adresse est prouvée. */
    let lettreV = '';
    for (let i = 0; i < 60 && !lettreV; i++) { lettreV = lisible(facteurSrv.recus.filter(m => /mode=verifyEmail/.test(lisible(m))).pop() || ''); if (!lettreV) await dormir(100); }
    const jv = (/reinit\.html\?mode=verifyEmail&jeton=([a-f0-9]{64})/.exec(lettreV.replace(/\s+/g, '')) || [])[1] || '';
    const rv = await fetch(S.B + '/api/compte/verifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jeton: jv }) });
    v('   le lien de vérification, reçu par courriel, prouve l\'adresse', [!!jv, rv.status], [true, 200]);
    const rAcc = await fetch(S.B + '/api/monitor/portail/message', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tour.token },
      body: JSON.stringify({ email: 'zoe@exemple.fr', texte: 'Votre espace est prêt',
        access: 'CODE-ABCXYZ', accessName: 'Bernard Hygiène' }) });
    v('   elle poste un message avec un code', rAcc.status, 200);
    const avecCode = (await fil.orderBy('ts', 'asc').get()).docs.map(d => d.data()).filter(m => m.access);
    v('⛔ le code d\'activation traverse jusqu\'à la page', (avecCode[0] || {}).access, 'CODE-ABCXYZ');
    v('   et le nom de l\'espace avec lui', (avecCode[0] || {}).accessName, 'Bernard Hygiène');

    /* ⛔ ET UN CLIENT NE PEUT PAS SE FABRIQUER CE BOUTON. On forge la requête à la main —
       l'adaptateur n'envoie que `texte`, mais un adaptateur n'est pas une garde : c'est le
       SERVEUR qui doit refuser. Même règle que `/api/clients/sync` : une valeur du CORPS ne
       décide jamais d'un accès. */
    const jetonClient = A.bac.localStorage.getItem('teamop_portail_jeton');
    const rFaux = await fetch(S.B + '/api/portail/message', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jetonClient },
      body: JSON.stringify({ texte: 'je me fabrique un accès', access: 'CODE-VOLE', accessName: 'moi' }) });
    v('   le client peut écrire dans son fil', rFaux.status, 200);
    const voles = (await fil.orderBy('ts', 'asc').get()).docs.map(d => d.data()).filter(m => m.access === 'CODE-VOLE');
    v('⛔ mais SON `access` est jeté — le corps d\'une requête ne donne jamais un accès', voles.length, 0);

    const news = await base.collection('teamop_news').orderBy('ts', 'desc').limit(30).get();
    v('   la liste des nouveautés répond', news.empty, true);
    let codeNews = '';
    try { await base.collection('teamop_news').add({ title: 'x' }); } catch (e) { codeNews = e.code || ''; }
    v('⛔ publier une nouveauté refuse CLAIREMENT (c\'était muet chez Firestore)', codeNews, 'portail/tour-seule');
  }

  console.log('\n══ 5 bis. ⛔ LE MOT DE PASSE ACTUEL EST VRAIMENT VÉRIFIÉ ══\n');
  {
    /* ⛔ `accReauth()` A RENDU `true` SANS RIEN CONTRÔLER PENDANT UNE JOURNÉE. Trois écrans
       d'`espace.html` redemandent le mot de passe avant un geste grave ; avec Firebase,
       `reauthenticateWithCredential` le vérifiait. Un champ « mot de passe actuel » qui ne
       regarde rien est pire qu'un champ absent : il fait croire à une garde. */
    vrai('⛔ `accReauth` NE rend plus `true` sans contrôler (le fichier servi)',
      /async function accReauth\(pass\)\{[^}]*\}[\s\S]{0,900}?await _pv\.auth\.confirmerMdp\(pass\); return true; \}/.test(PAGE));
    vrai('   l\'adaptateur porte `confirmerMdp`', typeof auth.confirmerMdp === 'function');
    let mauvais = '';
    try { await auth.confirmerMdp('pas-le-bon-du-tout'); } catch (e) { mauvais = e.code || ''; }
    v('⛔ un mot de passe faux est REFUSÉ, avec un code que la page traduit', mauvais, 'auth/wrong-password');
    v('   le bon passe', await auth.confirmerMdp('un-mot-de-passe-solide'), true);

    /* ⛔ CHANGER LE MOT DE PASSE DOIT MARCHER, PAS ENVOYER UN COURRIEL À LA FIN. L'écran fait
       saisir l'ancien, envoie un code à six chiffres, le fait retaper, puis demande le nouveau
       DEUX FOIS. Refuser après tout ça, c'est faire croire que ça a marché jusqu'au bout. */
    v('⛔ le changement de mot de passe aboutit', await auth.currentUser.updatePassword('un-autre-mot-de-passe-solide'), true);
    /* Le serveur coupe TOUTES les sessions et en rend une neuve : sans ça, la personne se
       ferait déconnecter de la page juste après avoir réussi son changement. */
    const jetonApres = A.bac.localStorage.getItem('teamop_portail_jeton');
    vrai('⛔ et la session de la page SURVIT (un jeton neuf est rangé)', /^[a-f0-9]{64}$/.test(String(jetonApres)));
    const moiApres = await (await fetch(S.B + '/api/compte/moi', { headers: { Authorization: 'Bearer ' + jetonApres } })).json();
    v('   et il vaut', (moiApres.compte || {}).email, 'zoe@exemple.fr');
    vrai('⛔ l\'ANCIEN mot de passe ne marche plus', await (async () => {
      try { await auth.confirmerMdp('un-mot-de-passe-solide'); return false; } catch (e) { return e.code === 'auth/wrong-password'; }
    })());
    v('   et le nouveau, oui', await auth.confirmerMdp('un-autre-mot-de-passe-solide'), true);
    /* ⚠️ Le jeton d'AVANT le changement doit être mort : c'est le geste qu'on fait quand on
       pense s'être fait voler quelque chose. */
    const vieux = await fetch(S.B + '/api/compte/moi', { headers: { Authorization: 'Bearer ' + jeton0 } });
    v('⛔ le jeton d\'AVANT le changement est coupé', vieux.status, 401);

    /* ⛔ ET SANS CONFIRMATION FRAÎCHE, ON NE CHANGE RIEN. Un adaptateur neuf n'a pas de
       fenêtre ouverte : `updatePassword` doit refuser, pas passer. */
    const C = fabriquer(S.B, { teamop_portail_jeton: A.bac.localStorage.getItem('teamop_portail_jeton') });
    let sansReauth = '';
    C.api.auth.onAuthStateChanged(() => {});
    await dormir(300);
    try { await C.api.auth.currentUser.updatePassword('encore-un-autre-solide'); }
    catch (e) { sansReauth = e.code || ''; }
    v('⛔ sans confirmation fraîche, le changement est refusé', sansReauth, 'auth/requires-recent-login');

    /* Remettre le mot de passe de départ : la section 7 se reconnecte avec. */
    await auth.confirmerMdp('un-autre-mot-de-passe-solide');
    await auth.currentUser.updatePassword('un-mot-de-passe-solide');
  }

  console.log('\n══ 5 ter. ⛔ LES DEUX ÉCRANS QUI REFUSENT LE FONT AVANT LA CÉRÉMONIE ══\n');
  {
    /* ⛔ `emSend` envoyait un code à six chiffres, le faisait retaper, et SEULEMENT LÀ
       `updateEmail` répondait « voyez le support ». C'est la leçon `_mailboxes` de ce dépôt :
       un refus tardif est un écran qui ment jusqu'à la dernière seconde. On lit le fichier
       SERVI, commentaires retirés — le motif ne doit pas tomber dans l'explication. */
    const nu = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const corps = (nom) => { const i = nu.indexOf('async function ' + nom + '('); return i < 0 ? '' : nu.slice(i, i + 900); };
    const em = corps('emSend'), del = corps('delGo');
    vrai('⛔ `emSend` refuse AVANT d\'envoyer le code', /if\(_pv\) return _err\(/.test(em) &&
      em.indexOf('if(_pv) return _err(') < em.indexOf('_sendCode'));
    vrai('⛔ `delGo` refuse AVANT de supprimer quoi que ce soit', /if\(_pv\) return _err\(/.test(del) &&
      del.indexOf('if(_pv) return _err(') < del.indexOf('.delete()'));
  }
  console.log('\n══ 5 quater. ⛔ HUIT ESSAIS FAUX BLOQUENT LE COMPTE ══\n');
  {
    /* ⛔ CE CONTRÔLE EXISTE PARCE QU'UNE MUTATION N'A RIEN CASSÉ. Retirer le compteur
       d'échecs de `confirmerMdp` laissait le banc à 52 ✓ 0 ✗ — et le défaut était bien réel :
       avec une session empruntée (un navigateur resté ouvert), `/api/compte/mdp/confirmer`
       devient un oracle où l'on essaie des mots de passe tranquillement, puis on change
       celui du client. La règle de CLAUDE.md s'applique mot pour mot : quand une mutation
       ne casse rien, la question n'est pas « le code est-il bon ? » mais « qu'est-ce que le
       banc ne joue pas ? ». Ici : le HUITIÈME essai. Un seul essai faux ne peut pas montrer
       un compteur.
       ⚠️ Compte à part : le blocage dure quinze minutes, il empoisonnerait tout ce qui suit. */
    const V = fabriquer(S.B);
    await V.api.auth.createUserWithEmailAndPassword('victime@exemple.fr', 'le-vrai-mot-de-passe');
    let bloque = '';
    for (let i = 0; i < 8; i++) {
      try { await V.api.auth.confirmerMdp('essai-faux-' + i); } catch (e) { bloque = e.code || ''; }
    }
    v('   les huit essais sont tous refusés', bloque, 'auth/wrong-password');
    /* ⛔ LE NEUVIÈME EST REFUSÉ MÊME AVEC LE BON MOT DE PASSE : c'est ça, le compteur. */
    let apres = 'pas-refusé';
    try { await V.api.auth.confirmerMdp('le-vrai-mot-de-passe'); }
    catch (e) { apres = e.code || ''; }
    v('⛔ au 9e, le BON mot de passe est refusé aussi — le compte est bloqué', apres, 'auth/wrong-password');
    /* Et le blocage tient aussi la porte d'à côté : `confirmerMdp` est la MÊME fonction que
       la connexion appelle. Deux copies auraient donné deux verrous, dont un ouvert. */
    const W = fabriquer(S.B);
    let parLaPorte = 'pas-refusé';
    try { await W.api.auth.signInWithEmailAndPassword('victime@exemple.fr', 'le-vrai-mot-de-passe'); }
    catch (e) { parLaPorte = e.code || ''; }
    v('⛔ et la CONNEXION est bloquée aussi — un seul verrou, pas deux', parLaPorte, 'auth/wrong-password');
  }
  console.log('\n══ 6. ⛔ L\'ÉCRAN D\'ADMINISTRATION MORT REFUSE SANS TOUT EMPORTER ══\n');
  {
    /* ⛔ Il est mort depuis le 18 septembre (`firestore.rules:59` — `allow read: if cestMoi`).
       On ne le porte pas. Mais il ne doit pas non plus jeter une `TypeError` qui emporterait le
       reste de l'écran : il rend une liste vide ET le dit dans la console. Un refus muet est ce
       qui a permis à ce défaut de vivre deux jours sans que personne le voie. */
    let jete = false, recu = null;
    try {
      const q = base.collection('teamop_requests').orderBy('createdAt', 'desc');
      const stop = q.onSnapshot(qs => { recu = qs; });
      stop();
    } catch (e) { jete = true; }
    vrai('⛔ il ne jette PAS', !jete);
    vrai('   il rend une liste vide', recu && recu.empty === true && recu.size === 0);
    vrai('⛔ et il le DIT dans la console, en nommant la Tour', A.bac._avertis.some(x => /Tour de contr/.test(x)));
  }

  console.log('\n══ 7. LA SESSION SURVIT À UN RECHARGEMENT ══\n');
  {
    /* Le jeton vit dans `localStorage` : rouvrir la page ne doit pas redemander le mot de
       passe. On refabrique un adaptateur sur le MÊME rangement pour le prouver. */
    const jeton = A.bac.localStorage.getItem('teamop_portail_jeton');
    vrai('   un jeton est rangé', /^[a-f0-9]{64}$/.test(String(jeton)));
    /* Un rechargement, c'est un adaptateur NEUF sur un rangement DÉJÀ REMPLI — pas un
       adaptateur vide qu'on garnit ensuite. */
    const A2 = fabriquer(S.B, { teamop_portail_jeton: jeton });
    let vu = 'pas-appelé';
    A2.api.auth.onAuthStateChanged(u => { vu = u ? u.email : null; });
    await dormir(400);
    v('⛔ après « rechargement », la session est retrouvée', vu, 'zoe@exemple.fr');
    await A2.api.auth.signOut();
    v('   et se déconnecter la coupe', A2.bac.localStorage.getItem('teamop_portail_jeton'), null);
  }

  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
