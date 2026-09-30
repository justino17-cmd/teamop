/* ⛔ CE QUE CE FICHIER GARDE — LE MÉTIER DE CHAQUE ENTREPRISE, DU PORTAIL JUSQU'À L'APPLICATION (v765, Tour v2.77).

   Justin, 29 septembre 2026 (nuit) : « je veux que chaque métier qu'on a sur le site, quand ils ont l'application, ça
   correspond à leur métier ; fais ça et active tous les packs, pour tous ». Mesuré le même soir : RIEN ne portait le
   métier. La demande d'accès ne le demandait pas ; la Tour l'affichait (« métier non renseigné ») sans aucun moyen de le
   régler (`/api/monitor/clients/metier` n'avait pas d'appelant) ; l'application ne le recevait jamais, et `db.metier` ne
   s'écrivait que par des cartes réservées à l'équipe TEAM OP. Toute entreprise partait en anti-nuisibles (3D) : un
   plombier recevait « Dératisation » et le registre sanitaire — pendant que le site vendait des pages plombier,
   électricien, chauffagiste et nettoyage.

   Quatre pièces, et c'est leur COUTURE qu'on garde, chacune par ses VRAIES fonctions contre le VRAI serveur :
     · le portail (`espace.html`) DEMANDE le métier : `sendRequest` le refuse vide et le range dans la demande,
       `cliResume` le relaie au serveur ;
     · le serveur le GARDE dans la demande (liste fermée), la Tour le POSE sur l'espace (`/api/monitor/espaces/metier`,
       liste fermée, garde de la Tour), et `/api/espaces/etat` le REND sur les réponses d'un espace vivant ;
     · la Tour (`tourAccepterDemande`, `tourMetierEnregistrer`, `packPeindre`) le pose à l'acceptation et le règle ensuite ;
     · l'application (`forfaitServeurSync` → `metierServeurAppliquer`) l'APPLIQUE : types d'intervention du pack,
       une seule écriture, rien pour une entreprise non réglée (ELAN reste en 3D).
   Et les quatre listes (app.html, serveur, Tour, portail) sont LA MÊME, dans le même ordre.
   Rien ne sort d'ici : 127.0.0.1, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const APP = lire('APP_FICHIER', 'app.html'), TOUR = lire('TOUR_FICHIER', 'tour.html'), PORTAIL = lire('PORTAIL_FICHIER', 'espace.html');
const SRV = fs.readFileSync(SERVEUR, 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b848-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

/* Le code sans ses commentaires (ceux qui COMMENCENT une ligne : les seuls que ce dépôt utilise pour expliquer du code) —
   un motif ou une fonction se cherche dans le code, jamais dans une phrase. */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const APPN = nu(APP), TOURN = nu(TOUR), PORTN = nu(PORTAIL), SRVN = nu(SRV);
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, gabarits, commentaires et
   expressions régulières sautés).
   ⚠️ Jusqu'au 30 septembre 2026, ni les commentaires de fin de ligne ni les expressions régulières n'étaient sautés, et le
   banc tombait juste PAR CHANCE : `forfaitServeurSync` porte `/…jusqu'au…/` — une apostrophe impaire — que compensait
   l'apostrophe de « s'il » dans un commentaire de fin de ligne. Le commentaire parti (v767), la tranche débordait de
   21 000 caractères et le bac à sable ne se compilait plus. */
function fonction(src, nom) {
  const m = new RegExp('(^|\\n)[ \\t]*(?:async )?function ' + nom + '\\(').exec(src); if (!m) return '';
  const d0 = src.indexOf('function ' + nom + '(', m.index) - (/async function/.test(m[0]) ? 6 : 0);
  let k = src.indexOf('{', src.indexOf('(', d0)), prof = 0, q = null;
  /* les paramètres par défaut n'ont pas d'accolade ici ; on part de la première accolade après la liste des paramètres */
  k = src.indexOf('{', src.indexOf(')', d0));
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); k = n < 0 ? src.length : n + 1; continue; }
    /* une barre oblique après un opérateur, une ouverture ou `return` ouvre une expression régulière ; après un nom, un
       nombre ou une fermeture, c'est une division */
    if (c === '/' && /(?:[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test(src.slice(Math.max(0, k - 12), k))) {
      let cls = false;
      for (k++; k < src.length; k++) {
        const d = src[k];
        if (d === '\\') { k++; continue; }
        if (d === '\n') break;
        if (cls) { if (d === ']') cls = false; continue; }
        if (d === '[') { cls = true; continue; }
        if (d === '/') break;
      }
      continue;
    }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return src.slice(d0, k + 1);
}
/* Un littéral (objet ou tableau) qui suit une déclaration, borné par ses crochets. */
function litteral(src, debut) {
  const d0 = src.indexOf(debut); if (d0 < 0) return '';
  const o = src.indexOf(debut.trim().slice(-1) === '[' ? '[' : '{', d0 + debut.length - 1);
  const ouv = src[o], ferm = ouv === '[' ? ']' : '}';
  let prof = 0, q = null, k = o;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === ouv) prof++; else if (c === ferm) { prof--; if (!prof) break; }
  }
  return src.slice(o, k + 1);
}
const evalue = txt => vm.runInNewContext('(' + txt + ')');

console.log('\n── 848 · le métier de chaque entreprise, du portail jusqu\'à l\'application ──');
(async () => {
  console.log('\n1. Une seule liste de métiers, dans les quatre pièces');
  const ordreApp = evalue(litteral(APPN, 'const METIERS_ORDRE=['));
  const METIERS_APP = evalue(litteral(APPN, 'const METIERS={'));
  const ordreSrv = evalue(litteral(SRVN, 'const METIERS_OK = ['));
  const lblSrv = evalue(litteral(SRVN, 'const METIERS_LBL = {'));
  const lblTour = evalue(litteral(TOURN, 'var MET_L={'));
  const lblPort = evalue(litteral(PORTN, 'const METIER_L={'));
  vrai('(population) les quatre listes se lisent dans le CODE (app.html, serveur, Tour, portail) et portent treize métiers (les douze du site, plus « Autre »)',
    [ordreApp, ordreSrv, Object.keys(lblTour), Object.keys(lblPort)].every(l => Array.isArray(l) && l.length === 13), JSON.stringify(ordreApp));
  v('⛔ le serveur accepte exactement les métiers de l\'application, dans le même ordre (METIERS_OK = METIERS_ORDRE)', ordreSrv, ordreApp);
  v('⛔ la Tour propose exactement ces métiers (MET_L)', Object.keys(lblTour), ordreApp);
  v('⛔ le portail demande exactement ces métiers (METIER_L)', Object.keys(lblPort), ordreApp);
  /* Jusqu'au 30 septembre 2026, le portail ajoutait « Un autre métier » à la main, hors de METIER_L : une valeur que le
     serveur jetait. « autre » est désormais un pack — une option écrite en plus ferait DEUX « autre » dans la liste. */
  v('   … et n\'en ajoute aucun à la main dans son <select> (les options viennent toutes de METIER_L)',
    [...PORTN.matchAll(/<option value="([a-z0-9]+)"/g)].map(m => m[1]).filter(k => Object.prototype.hasOwnProperty.call(lblPort, k)), []);
  v('⛔ chaque métier a un pack dans l\'application (METIERS)', ordreApp.map(k => !!(METIERS_APP[k] && METIERS_APP[k].nom)), ordreApp.map(() => true));
  const noms = ordreApp.map(k => METIERS_APP[k].nom);
  v('   les libellés sont ceux des packs, partout (serveur, Tour, portail)', [ordreApp.map(k => lblSrv[k]), ordreApp.map(k => lblTour[k]), ordreApp.map(k => lblPort[k])], [noms, noms, noms]);
  v('   les douze autres packs portent leurs propres types d\'intervention ; le 3D garde la liste historique', ordreApp.map(k => Array.isArray(METIERS_APP[k].types) && METIERS_APP[k].types.length > 3),
    [false, true, true, true, true, true, true, true, true, true, true, true, true]);
  const hors3D = ordreApp.filter(k => k !== '3d');
  v('⛔ chaque pack hors 3D masque les quatre modules du 3D (registre, carte des box, devis xylophage, box) — un maçon ne reçoit pas le registre sanitaire',
    hors3D.map(k => ['registre', 'carteBox', 'devisXylo', 'boxes'].every(m => (METIERS_APP[k].masque || []).indexOf(m) >= 0)), hors3D.map(() => true));
  v('   … et porte la fiche de rapport de son métier : des prestations et des relevés à lui',
    hors3D.map(k => Array.isArray(METIERS_APP[k].presta) && METIERS_APP[k].presta.length >= 5 && Array.isArray(METIERS_APP[k].releves) && METIERS_APP[k].releves.length >= 2),
    hors3D.map(() => true));
  v('⛔ aucun pack hors 3D ne parle de nuisibles (c\'était le défaut : un plombier recevait « Dératisation ») — « Autre » compris',
    hors3D.filter(k => /dératis|désinsect|xylophag|nuisible|rongeur|cafard|punaise|termite/i.test([METIERS_APP[k].nom, METIERS_APP[k].sous].concat(METIERS_APP[k].types, METIERS_APP[k].presta).join(' | '))), []);

  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  /* ══ LES DONNÉES : trois entreprises, et le compte confirmé d'un plombier qui fait sa demande ══ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const esp = (t, nom, email, o) => Object.assign({ t, nom, email, ts: MAINT - 1000 }, o || {});
  /* ⚠️ L'annuaire range une entreprise sous `espSlug(nom)` — lettres et chiffres SEULS : « plombier-banc » vit sous
     « plombierbanc ». La première version de ce banc l'avait rangée avec son tiret : toutes les routes de la Tour
     répondaient 404, et c'est le BANC qui avait tort (le serveur ne crée jamais une telle clé). */
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const CODE_PLO = Buffer.from(JSON.stringify({ t: 't-plo-848', k: 'k-plo-848-' + 'x'.repeat(20), a: 'paul', n: 'plombier-banc' }), 'utf8').toString('base64').replace(/=+$/, '');
  const CODE_ANC = Buffer.from(JSON.stringify({ t: 't-anc-848', k: 'k-anc-848-' + 'z'.repeat(20), a: 'anne', n: 'ancien-sans-t' }), 'utf8').toString('base64').replace(/=+$/, '');
  const espaces = {
    /* une entrée d'AVANT : pas de `t` en clair (il vit dans son code), un abonnement réglé à la main */
    [cle('ancien-sans-t')]: { nom: 'ancien-sans-t', email: 'anc@exemple-848.fr', ts: MAINT - 1000, code: CODE_ANC, formule: 'premium', quantite: 1, aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 },
    /* ⚠️ PAYÉES (abonnement réglé à la main dans la Tour) : depuis le 30 septembre 2026, une entreprise qui ne paie pas est
       servie SUSPENDUE, sans formule — c'est la réponse AVEC formule qu'on veut ici, comme chez un client qui paie. */
    [cle('plombier-banc')]: esp('t-plo-848', 'plombier-banc', 'plo@exemple-848.fr', { formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', code: CODE_PLO, aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 }),
    [cle('elan-banc')]: esp('t-ela-848', 'elan-banc', 'ela@exemple-848.fr', { formule: 'premium', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 }),
    /* une entreprise qui ne paie RIEN (ni abonnement, ni code) : suspendue — et son métier est réglé */
    [cle('suspendue-banc')]: esp('t-sus-848', 'suspendue-banc', 'sus@exemple-848.fr', { formule: 'pro', quantite: 1, metier: 'peinture' }),
    [cle('sans-formule')]: esp('t-sans-848', 'sans-formule', 'sans@exemple-848.fr', { metier: 'nettoyage' }),
    [cle('ecrit-main')]: esp('t-main-848', 'ecrit-main', 'main@exemple-848.fr', { formule: 'pro', quantite: 1, metier: 'boulangerie' })
  };
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  const MAIL = 'plo@exemple-848.fr', brut = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [MAIL]: { v: true, pr: 'Paul', no: 'Plombier', so: 'Plomberie Banc' } },
    j: { [sha(brut)]: { m: MAIL, g: 'session', exp: MAINT + 86400000 } } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha('mot-de-passe-848'), comptes: { actif: true } }));
  const PORT = 9800 + (process.pid % 90), B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant);
  if (!vivant) { console.log(journal.slice(0, 1500)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const etat = async nom => (await appel('/api/espaces/etat', { t: espaces[cle(nom)].t })).j;
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-848' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);

  try {
    console.log('\n2. Le portail DEMANDE le métier (les vraies `sendRequest` et `cliResume` d\'espace.html)');
    const noms2 = ['lienSlug', 'sendRequest', 'planNom', 'cliResume'];
    const src2 = noms2.map(n => fonction(PORTN, n));
    const ligneMet = (/^[ \t]*const METIER_L=\{[^\n]*\};$/m.exec(PORTN) || [''])[0];
    vrai('(population) sendRequest, planNom, cliResume et la liste des métiers sont trouvés dans le code du portail', src2.every(Boolean) && !!ligneMet, noms2.filter((n, i) => !src2[i]).join(', '));
    const portail = (valeurs) => {
      const el = {}; const ecrits = [], fil = [], vues = [];
      for (const [id, val] of Object.entries(valeurs)) el[id] = { value: val, innerHTML: '', scrollIntoView() {} };
      el['req-msg'] = { innerHTML: '', scrollIntoView() {} };
      const docRef = (nom, id) => ({ set: async (o) => { ecrits.push({ nom, id, o: JSON.parse(JSON.stringify(o)) }); },
        collection: () => ({ add: async (m) => { fil.push(m); } }) });
      const ctx = { window: { _demCode: null, _demEdit: null, _demConfirm: false }, JSON, Object, Array, String, Date, Math, parseInt, Promise, setTimeout,
        $: id => el[id] || null, document: { getElementById: id => el[id] || null },
        fetch: async (u) => ({ ok: true, json: async () => (/\/espaces\/libre/.test(u) ? { libre: true } : {}) }),
        fs: { collection: nom => ({ doc: id => docRef(nom, id) }) }, FV: { serverTimestamp: () => 'TS' },
        auth: { currentUser: { email: MAIL } }, openView: v => vues.push(v), verifCodeDemande: async () => null,
        clientApps: () => [], APPS: {}, promoInfo: () => null };
      vm.createContext(ctx);
      vm.runInContext('var _meDoc={}; const esc=s=>String(s==null?"":s);\n' + ligneMet + '\n' + src2.join('\n') + '\nthis.sendRequest=sendRequest; this.cliResume=cliResume;', ctx);
      return { ctx, el, ecrits, fil, vues };
    };
    const FORM = { 'r-app': 'OP GESTION', 'r-company': 'Plomberie Banc', 'r-besoin': 'Dépannages et entretien', 'r-users': '3', 'r-code': '', 'r-formule': 'Pro',
      'r-prenom': 'Paul', 'r-nom': 'Plombier', 'r-tel': '06 12 34 56 78', 'r-lien': 'plomberie-banc' };
    let P = portail(Object.assign({}, FORM, { 'r-metier': '' }));
    await P.ctx.sendRequest('u-848');
    vrai('⛔ sans métier, la demande ne part pas — et la page dit ce qui manque', P.ecrits.length === 0 && /il manque[^<]*<b>[^<]*métier/.test(P.el['req-msg'].innerHTML), P.el['req-msg'].innerHTML);
    P = portail(Object.assign({}, FORM, { 'r-metier': 'chauffage' }));
    await P.ctx.sendRequest('u-848');
    const dem = ((P.ecrits.find(e => e.nom === 'teamop_requests') || {}).o || {}).demandes || [];
    v('⛔ avec un métier, la demande part et le PORTE (metier: « chauffage »)', dem.map(d => d.metier), ['chauffage']);
    vrai('   le fil de la demande le dit (« métier Chauffage / Climatisation »)', P.fil.some(m => /métier Chauffage \/ Climatisation/.test(m.text || '')), JSON.stringify(P.fil.map(m => m.text)));
    const resume = P.ctx.cliResume({ email: MAIL }, { demandes: [dem[0], { app: 'OP GESTION', metier: 'n-importe-quoi<b>', date: 1 }] });
    v('⛔ la fiche relayée à la Tour (`cliResume`) garde le métier de chaque demande', resume.demandes.map(d => d.metier), ['chauffage', 'n-importe-quoi<b>']);
    /* ⛔ v767 — un dossier d'avant qui porte « Gratuit » (ou « Découverte », son ancien nom) n'a plus d'abonnement : la
       fiche relayée à la Tour ne dit pas « Gratuit » (la vraie `planNom`, par la vraie `cliResume`) */
    v('⛔ un dossier d\'avant en « Gratuit » ou « Découverte » : la fiche relayée ne porte plus de formule ; « Pro » passe',
      ['Gratuit', 'découverte', ' Découverte ', 'Pro'].map(p => P.ctx.cliResume({ email: MAIL }, { plan: p, demandes: [] }).plan), ['', '', '', 'Pro']);
    v('   … et le choix de formule du formulaire n\'offre plus « Gratuit » (Justin, 29 septembre 2026 : l\'application est payante)',
      /\$\{\['Pro','Business','Business Premium'\]\.map\(o=>/.test(PORTN) && !/\['Gratuit','Pro','Business','Business Premium'\]/.test(PORTN), true);

    console.log('\n3. Le serveur GARDE le métier demandé (liste fermée) — `/api/clients/sync`, la vraie session du plombier');
    const rs = await appel('/api/clients/sync', resume, brut);
    v('la fiche arrive (200)', rs.s, 200);
    const cli = ((await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []).find(c => c.email === MAIL) || {};
    v('⛔ la Tour lit le métier DEMANDÉ ; une valeur hors liste ne passe pas (vide, jamais du texte du client)', (cli.demandes || []).map(d => d.metier), ['chauffage', '']);

    console.log('\n4. La Tour le POSE sur l\'espace, et le serveur le REND (`/api/espaces/etat`)');
    v('avant tout réglage : le métier n\'est pas servi (vide)', (await etat('plombier-banc')).metier, '');
    v('⛔ sans la garde de la Tour, la route refuse — le PATRON seul, comme la formule (un métier hors 3D retire Boxes et Registre)', (await appel('/api/monitor/espaces/metier', { nom: 'plombier-banc', metier: 'plomberie' })).s, 403);
    v('⛔ un métier hors liste est refusé (400), rien ne change', [(await appel('/api/monitor/espaces/metier', { nom: 'plombier-banc', metier: 'boulangerie' }, PATRON)).s, (await etat('plombier-banc')).metier], [400, '']);
    v('   un espace inconnu : 404', (await appel('/api/monitor/espaces/metier', { nom: 'inconnu-848', metier: 'plomberie' }, PATRON)).s, 404);
    const r1 = await appel('/api/monitor/espaces/metier', { nom: 'plombier-banc', metier: 'plomberie' }, PATRON);
    v('⛔ la Tour règle « plomberie » (200)', [r1.s, r1.j.metier], [200, 'plomberie']);
    const E1 = await etat('plombier-banc');
    v('⛔ /api/espaces/etat le rend — sur la réponse d\'une entreprise AVEC formule', [E1.metier, !!E1.formule], ['plomberie', true]);
    v('   la Tour le relit dans le statut de l\'espace', (await appel('/api/monitor/espaces/statut', { nom: 'plombier-banc' }, PATRON)).j.metier, 'plomberie');
    await dormir(300);
    const disque = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('⛔ il est ÉCRIT dans l\'annuaire (il survit à un redémarrage)', (disque[cle('plombier-banc')] || {}).metier, 'plomberie');
    /* « Revoir le lien de connexion » (la même route que l'ouverture) RECONSTRUIT la fiche de zéro et ne reporte que ce
       qu'on lui nomme — c'est déjà arrivé à OP MESSAGES. Sans le report, le métier retombait à « non réglé ». */
    const rl = await appel('/api/monitor/espaces', { nom: 'plombier-banc', code: CODE_PLO, email: 'plo@exemple-848.fr' }, PATRON);
    v('⛔ « Lien de connexion » redonné (la fiche est reconstruite) : le métier RESTE', [rl.s, (await etat('plombier-banc')).metier, (await appel('/api/monitor/espaces/statut', { nom: 'plombier-banc' }, PATRON)).j.metier], [200, 'plomberie', 'plomberie']);
    /* ⛔⛔ … ET L'ABONNEMENT RÉGLÉ À LA MAIN AUSSI (30 septembre 2026). La reconstruction le perdait : l'entreprise retombait
       sur Stripe, qui ne la connaît pas — et depuis qu'une entreprise qui ne paie pas est suspendue, ce simple geste de la
       Tour l'aurait COUPÉE. */
    /* ⛔ `gardien` R2 (30 septembre 2026) : une entrée d'AVANT ne porte pas `t` en clair — il vit dans son code. La garde « ce
       nom est à une autre entreprise » ne lisait que `prev.t` : le nom d'une entrée d'avant, repris avec le code d'une AUTRE
       entreprise, passait — et, depuis que cette route reporte l'abonnement réglé à la main, l'autre héritait de son « actif ». */
    const CODE_AUTRE = Buffer.from(JSON.stringify({ t: 't-autre-848', k: 'k-autre-848-' + 'y'.repeat(20) }), 'utf8').toString('base64').replace(/=+$/, '');
    /* ⚠️ Joué SANS adresse et avec la MÊME adresse : avec une AUTRE adresse, c'est la garde « déjà relié à une autre
       adresse », plus bas dans la route, qui refuse — elle cachait celle-ci (mutation M31 du 30 septembre 2026 : ne lire que
       `prev.t` ne faisait rien tomber, la première version de ce contrôle n'envoyait qu'une autre adresse). */
    const rR2a = await appel('/api/monitor/espaces', { nom: 'ancien-sans-t', code: CODE_AUTRE }, PATRON);
    const rR2b = await appel('/api/monitor/espaces', { nom: 'ancien-sans-t', code: CODE_AUTRE, email: 'anc@exemple-848.fr' }, PATRON);
    const rR2 = await appel('/api/monitor/espaces', { nom: 'ancien-sans-t', code: CODE_AUTRE, email: 'autre@exemple-848.fr' }, PATRON);
    await dormir(300);
    const anc2 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'))[cle('ancien-sans-t')] || {};
    v('⛔ le nom d\'une entrée d\'avant (sans `t`, il vit dans son code), repris avec le code d\'une AUTRE entreprise — sans adresse, avec la sienne, avec une autre : refusé (409) les trois fois — la fiche et son abonnement restent les siens',
      [rR2a.s, rR2b.s, rR2.s, anc2.code === CODE_ANC, anc2.aboStatut], [409, 409, 409, true, 'actif']);
    /* ⛔ un code SANS identifiant d'espace n'enregistre rien (seconde relecture de `gardien`, 30 septembre 2026) : la garde « ce
       nom est à une autre entreprise » ne pouvait rien comparer — l'entrée était réécrite sans `t`, avec l'abonnement réglé à
       la main de la précédente, et l'entreprise d'origine sortait de l'annuaire */
    const CODE_SANS_T = Buffer.from(JSON.stringify({ k: 'k-sans-t-848-' + 'w'.repeat(20) }), 'utf8').toString('base64').replace(/=+$/, '');
    const rSansT = await appel('/api/monitor/espaces', { nom: 'ancien-sans-t', code: CODE_SANS_T }, PATRON);
    const rSansT2 = await appel('/api/monitor/espaces', { nom: 'nouveau-sans-t', code: CODE_SANS_T }, PATRON);
    await dormir(300);
    const regSansT = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('⛔ un code sans identifiant d\'espace : refusé (400), sur un nom connu comme sur un nom neuf — la fiche d\'avant reste la sienne',
      [rSansT.s, rSansT2.s, (regSansT[cle('ancien-sans-t')] || {}).code === CODE_ANC, (regSansT[cle('ancien-sans-t')] || {}).aboStatut, regSansT[cle('nouveau-sans-t')]],
      [400, 400, true, 'actif', undefined]);
    /* (témoin) la même entrée redonnée avec SON code — « Revoir le lien » d'une entreprise d'avant — passe, et garde son
       abonnement : la garde ne refuse que l'identifiant d'une AUTRE entreprise */
    const rR2c = await appel('/api/monitor/espaces', { nom: 'ancien-sans-t', code: CODE_ANC }, PATRON);
    await dormir(300);
    const anc3 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'))[cle('ancien-sans-t')] || {};
    v('   (témoin) la même entrée redonnée avec SON code : acceptée (200), son identifiant et son abonnement restent',
      [rR2c.s, anc3.t, anc3.aboStatut], [200, 't-anc-848', 'actif']);
    const E2 = await etat('plombier-banc'), st2 = (await appel('/api/monitor/espaces/statut', { nom: 'plombier-banc' }, PATRON)).j;
    v('⛔⛔ … et l\'abonnement réglé à la main RESTE : toujours payée, servie avec sa formule — pas suspendue', [E2.formule, E2.paye, E2.suspendu, st2.paye, st2.aboStatut], ['pro', true, false, true, 'actif']);
    /* ⛔ ce que cette réponse dit à qui connaît `t` (seconde relecture de `gardien`, 30 septembre 2026) : ni le NOM de la personne
       de la Tour qui a réglé l'abonnement, ni le chemin du paiement — la Tour, gardée, garde le motif complet */
    v('⛔ … et son motif public ne nomme personne : « accès actif » — la Tour, elle, lit qui l\'a réglé',
      [E2.motif, /Banc/.test(String(st2.motif || ''))], ['accès actif', true]);
    v('⛔ une entreprise SANS formule reçoit aussi son métier (la réponse qui sort avant la formule)', (await etat('sans-formule')).metier, 'nettoyage');
    const ES = await etat('suspendue-banc');
    v('⛔ une entreprise qui ne paie pas est SUSPENDUE (sans formule) — et reçoit AUSSI son métier', [ES.suspendu, ES.sursisJours, ES.formule, ES.paye, ES.metier], [true, 0, undefined, false, 'peinture']);
    v('⛔ une valeur hors liste écrite à la main dans l\'annuaire n\'est jamais servie', (await etat('ecrit-main')).metier, '');
    v('⛔ ELAN (jamais réglée) ne reçoit rien : l\'application ne bougera pas', (await etat('elan-banc')).metier, '');
    /* les cinq réponses d'un espace vivant, lues dans le CODE de la route : la réponse « impayé » (qui demande Stripe), celle
       d'une vérification impossible et celle du DOUTE (Stripe ou registre des codes illisible, 30 septembre 2026) portent le
       métier comme les deux que ce banc joue */
    const route = (() => { const i = SRVN.indexOf("app.post('/api/espaces/etat'"); const j = SRVN.indexOf('\n});', i); return i > 0 ? SRVN.slice(i, j) : ''; })();
    const reponses = route.match(/res\.json\(\{ ok: true[^;]*\}\)/g) || [];
    v('⛔ (code de la route) les cinq réponses d\'un espace vivant portent `metier` — seule la fermeture n\'en a pas besoin',
      [reponses.length, reponses.filter(r => /\bmetier\b/.test(r)).length, reponses.filter(r => /ferme: true/.test(r)).length], [6, 5, 1]);

    console.log('\n5. L\'application l\'APPLIQUE (les vraies `forfaitServeurSync` et `metierServeurAppliquer` d\'app.html, v' + ((/APP_VERSION = '(\d+)'/.exec(APP) || [])[1] || '?') + ')');
    /* (le bandeau « Paye ton abonnement » n'existe plus depuis la v767 : ce qui n'est pas payé est suspendu — `accesSuspendu`) */
    const NOMS5 = ['forfaitServeurSync', 'metierServeurAppliquer', 'metierId', 'metierPack', 'intTypes', 'suspensionCle', 'suspensionPoser', 'suspensionSursis', 'suspensionGrise', 'accesSuspendu', 'suspensionClasse', 'suspensionRappel', 'forfait'];
    const FN5 = NOMS5.map(n => fonction(APPN, n));
    const PLANS_SRC = litteral(APPN, 'const PLANS={'), SUSP = (/^let _susp = \{[^\n]*\};$/m.exec(APPN) || [''])[0];
    const INT_TYPES_SRC = (/^const INT_TYPES = \[[^\n]*\];$/m.exec(APPN) || [''])[0];
    vrai('(population) les fonctions, PLANS, METIERS, INT_TYPES et l\'état de suspension sont trouvés dans le fichier réel',
      FN5.every(Boolean) && !!PLANS_SRC && !!SUSP && !!INT_TYPES_SRC && /metierServeurAppliquer\(j\)/.test(FN5[0]), NOMS5.filter((n, i) => !FN5[i]).join(', '));
    const appareil = (nom, base) => {
      const E = espaces[cle(nom)];
      const LS = new Map([['elan_sync_team', E.t]]);
      const vu = { toasts: [], saves: 0, nav: 0, vues: 0, journal: [], ordre: [] };
      const doc = { getElementById: () => null, createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} } };
      const code = 'let STORE_KEY="elanB_banc848"; let currentUser={id:"u-admin",role:"admin"}; let current="interventions";\n'
        + 'let db=' + JSON.stringify(Object.assign({ forfait: E.formule || 'gratuit', forfaitQty: 1, forfaitSrv: 'teamop' }, base || {})) + '; let _opMsgOuvert=false;\n'
        + 'const METIERS=' + litteral(APPN, 'const METIERS={') + ';\n' + INT_TYPES_SRC + '\nconst BETA_ESSAI=false;\n'
        + PLANS_SRC.replace(/^/, 'const PLANS=') + ';\nvar _placesSrv=null,_placesSrvF="";\n' + SUSP + '\n' + FN5.join('\n')
        + '\nreturn { sync: forfaitServeurSync, appliquer: metierServeurAppliquer, metierId, intTypes, db: () => db, suspendu: accesSuspendu };';
      const f = new Function('fetch', 'localStorage', 'PUSH_API', 'toast', 'renderNav', 'go', 'save', 'logEvent', 'todayISO', 'espaceQuitter', 'suiteRefresh', 'views', 'document', 'esc', code);
      const a = f((u, o) => fetch(u, o), { getItem: k => (LS.has(k) ? LS.get(k) : null), setItem: (k, x) => LS.set(k, String(x)), removeItem: k => LS.delete(k) },
        B, m => vu.toasts.push(String(m)), () => { vu.nav++; }, () => {}, () => { vu.saves++; vu.ordre.push('save'); }, (t, d) => { vu.journal.push(t + ' · ' + d); vu.ordre.push('journal'); }, () => new Date().toISOString().slice(0, 10),
        () => {}, () => {}, { interventions: () => { vu.vues++; } }, doc, s => String(s));
      a.vu = vu; return a;
    };
    const A = appareil('plombier-banc');
    v('   (témoin) avant : l\'appareil est en 3D (le pack historique)', [A.metierId(), A.intTypes()[1]], ['3d', 'Dératisation']);
    await A.sync();
    v('⛔ après l\'ouverture : l\'application est en PLOMBERIE, avec ses types d\'intervention', [A.db().metier, A.metierId(), A.intTypes()[0]], ['plomberie', 'plomberie', 'Dépannage fuite']);
    vrai('   le journal le dit (« réglé par TEAM OP »), le menu et l\'écran se redessinent, l\'administrateur est prévenu',
      A.vu.journal.some(l => /Métier de l’entreprise · Plomberie — réglé par TEAM OP/.test(l)) && A.vu.nav >= 1 && A.vu.vues >= 1 && A.vu.toasts.some(t => /Application réglée pour : Plomberie/.test(t)),
      JSON.stringify([A.vu.journal, A.vu.nav, A.vu.vues, A.vu.toasts]));
    /* ⛔ la ligne de journal AVANT l'enregistrement : `logEvent` ne range rien. Écrite après le save(), elle n'existait
       qu'en mémoire — la sonde au navigateur l'a vue disparaître au rechargement (scratchpad/sonde-metier-serveur.js) */
    v('⛔ la ligne de journal est écrite AVANT l\'enregistrement (sinon elle disparaît si l\'application se ferme)', A.vu.ordre.slice(0, 2), ['journal', 'save']);
    const s1 = A.vu.saves, j1 = A.vu.journal.length, t1 = A.vu.toasts.length;
    await A.sync();
    v('⛔ une seconde ouverture n\'écrit RIEN de plus pour le métier (pas de save, pas de ligne, pas de message)',
      [A.vu.journal.filter(l => /Métier/.test(l)).length, A.vu.toasts.length - t1, A.vu.saves - s1], [1, 0, 0]);
    await appel('/api/monitor/espaces/metier', { nom: 'plombier-banc', metier: 'electricite' }, PATRON);
    await A.sync();
    v('⛔ la Tour change le métier : l\'application suit à l\'ouverture suivante', [A.metierId(), A.intTypes().includes('Tableau électrique') || A.intTypes().some(x => /lectri|Tableau/.test(x))], ['electricite', true]);
    await appel('/api/monitor/espaces/metier', { nom: 'plombier-banc', metier: '' }, PATRON);
    const avantVide = A.vu.saves;
    await A.sync();
    v('⛔ la Tour retire le métier (vide) : l\'application GARDE le sien — « non réglé » ne remet personne en 3D', [A.metierId(), A.vu.saves - avantVide], ['electricite', 0]);
    const EL = appareil('elan-banc');
    await EL.sync();
    v('⛔ ELAN (jamais réglée) : rien ne change — pas de métier écrit, toujours la 3D, aucune ligne de journal',
      [EL.db().metier, EL.metierId(), EL.vu.journal.filter(l => /Métier/.test(l)).length], [undefined, '3d', 0]);
    const EL2 = appareil('elan-banc', { metier: '3d' });
    await EL2.sync();
    v('   une entreprise déjà réglée par elle-même (3D écrit) : rien ne change non plus', [EL2.db().metier, EL2.vu.journal.length], ['3d', 0]);
    const SF = appareil('sans-formule');
    await SF.sync();
    v('⛔ sans formule attribuée, le métier s\'applique quand même (il est lu AVANT le test sur la formule)', SF.metierId(), 'nettoyage');
    const SU = appareil('suspendue-banc');
    await SU.sync();
    v('⛔ SUSPENDUE : le métier s\'applique aussi, l\'accès est suspendu, et `db.forfait` n\'est PAS réécrit (le règlement rend tout)',
      [SU.metierId(), SU.suspendu(), SU.db().forfait], ['peinture', true, 'pro']);
    v('   (témoin) une entreprise PAYÉE n\'est pas suspendue', A.suspendu(), false);
    const X = appareil('elan-banc');
    v('⛔ une valeur étrangère n\'entre jamais (hors liste, propriété héritée, pas une chaîne)',
      ['boulangerie', '__proto__', 'toString', 'constructor', 42, null].map(m => X.appliquer({ metier: m })).concat([X.db().metier === undefined]), [false, false, false, false, false, false, true]);
    v('   une réponse de serveur d\'AVANT (sans le champ) : rien', X.appliquer({ ok: true, formule: 'pro' }), false);

    console.log('\n6. La Tour (vraies `tourAccepterDemande`, `tourMetierEnregistrer`, `packPeindre`) contre ce serveur');
    const NOMS6 = ['hAuth', 'apiPost', 'metDemande', 'tourMetierEnregistrer', 'packPeindre', 'tourAccepterDemande'];
    const FN6 = NOMS6.map(n => fonction(TOURN, n));
    const ligneMetL = (/^var MET_L=\{[^\n]*\};$/m.exec(TOURN) || [''])[0];
    vrai('(population) les fonctions et la liste des métiers sont trouvées dans le code de la Tour', FN6.every(Boolean) && !!ligneMetL, NOMS6.filter((n, i) => !FN6[i]).join(', '));
    const tourCtx = (els, cliList, sel) => {
      const toasts = [], panneaux = [], prefills = [];
      const el = {}; for (const [id, val] of Object.entries(els || {})) el[id] = { value: val, innerHTML: '', textContent: '', disabled: false };
      const ctx = { fetch, JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console,
        document: { getElementById: id => el[id] || null },
        toast: t => toasts.push(String(t)), tourPanneau: h => panneaux.push(String(h)), tourPackPrefill: n => prefills.push(n), chargerClients: () => {}, chargerEspaces: () => {},
        prompt: () => 'paul', tourIdentDefaut: () => 'paul', tourMdpDefaut: () => 'Mdp-848-provisoire',
        tourEspaceDe: async () => ({ nom: 'plombier-banc', slug: 'plombier-banc', annuaire: 1, mdp: '' }),
        espSlugJs: s => String(s), esc: s => String(s == null ? '' : s), jsq: s => String(s), ST: {}, ABN_F: {}, abnEcart: () => '',
        lgMessagePoser: () => {}, tourCopie: () => {}, tourMailAcces: () => {} };
      vm.createContext(ctx);
      vm.runInContext('var API=' + JSON.stringify(B) + ', TOKEN=' + JSON.stringify(PATRON) + '; var CLI={list:' + JSON.stringify(cliList || []) + ', sel:' + JSON.stringify(sel || '') + '}; var PACK={nom:"",charge:true,err:"",d:null}; var LG_MSG_MODELE="", LG_MAIL="", LG_ZONE="";\n'
        + ligneMetL + '\n' + FN6.join('\n'), ctx);
      return { ctx, el, toasts, panneaux, prefills };
    };
    /* l'acceptation : la VRAIE fiche du plombier, telle que la Tour la charge du serveur (sa demande « chauffage ») */
    const T = tourCtx({}, [cli], MAIL);
    await T.ctx.tourAccepterDemande(MAIL, 'Plomberie Banc');
    v('⛔ « Accepter la demande » pose le métier DEMANDÉ sur l\'espace (le serveur le rend)', (await etat('plombier-banc')).metier, 'chauffage');
    /* le message de bienvenue n'est pas dans le panneau : `tourAccepterDemande` le range dans LG_MSG_MODELE, que
       `lgMessagePoser` recopie dans la zone de texte et dans le lien « Mail » */
    vrai('   et le message de bienvenue le dit (« réglée pour ton métier : Chauffage / Climatisation »)', /réglée pour ton métier : Chauffage \/ Climatisation\./.test(T.ctx.LG_MSG_MODELE || ''), String(T.ctx.LG_MSG_MODELE || '').slice(0, 300));
    const APP2 = appareil('plombier-banc');
    await APP2.sync();
    v('⛔ LA COUTURE ENTIÈRE : demande du portail → acceptation dans la Tour → l\'application du client est en chauffage',
      [APP2.metierId(), APP2.intTypes().length > 3 && !APP2.intTypes().includes('Dératisation')], ['chauffage', true]);
    /* la fiche : enregistrer à la main, et ce que la liste propose */
    const T2 = tourCtx({ 'met-f': 'serrurerie' }, [cli], MAIL);
    await T2.ctx.tourMetierEnregistrer('plombier-banc', null);
    v('⛔ « Enregistrer le métier » (fiche) : serrurerie, rendue par le serveur', (await etat('plombier-banc')).metier, 'serrurerie');
    const T3 = tourCtx({ 'met-f': 'boulangerie' }, [cli], MAIL);
    const avant3 = (await etat('plombier-banc')).metier;
    await T3.ctx.tourMetierEnregistrer('plombier-banc', null);
    v('⛔ une valeur hors liste dans la liste de la Tour : refusée AVANT le serveur, rien ne change', [T3.toasts.some(t => /Métier inconnu/.test(t)), (await etat('plombier-banc')).metier], [true, avant3]);
    const T4 = tourCtx({ 'met-f': '', 'met-info': '', 'pack-info': '' }, [cli], MAIL);
    vm.runInContext('PACK={nom:"plombier-banc",charge:true,err:"",d:{formule:"pro",quantite:1,metier:""}}; packPeindre();', T4.ctx);
    vrai('   non réglé : la liste propose le métier DEMANDÉ et la ligne dit « à enregistrer »',
      T4.el['met-f'].value === 'chauffage' && /non réglé[\s\S]*Demandé[\s\S]*Chauffage \/ Climatisation[\s\S]*à enregistrer/.test(T4.el['met-info'].innerHTML), T4.el['met-info'].innerHTML);
    vm.runInContext('PACK={nom:"plombier-banc",charge:true,err:"",d:{formule:"pro",quantite:1,metier:"nettoyage"}}; packPeindre();', T4.ctx);
    vrai('   réglé : la liste montre le métier de l\'espace, la ligne le dit', T4.el['met-f'].value === 'nettoyage' && /Métier réglé[\s\S]*Nettoyage \/ Propreté/.test(T4.el['met-info'].innerHTML), T4.el['met-info'].innerHTML);
  } catch (e) {
    ko++; console.log('  ✗ le banc a JETÉ : ' + (e && e.stack || e));
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
