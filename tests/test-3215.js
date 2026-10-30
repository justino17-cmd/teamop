/* ⛔ CE QUE CE FICHIER GARDE — PLUSIEURS MÉTIERS À LA CRÉATION D'UNE APPLICATION, ET LE BOUTON « TESTER L'APPLICATION » AVANT LES RUBRIQUES (30 octobre 2026).

   Justin : « le client peut choisir plusieurs métiers, mais si par exemple chauffage plus clim il fait que la clim et pas le chauffage, il peut choisir que clim » ;
   « 3 métiers maximum » ; « plus 10 € par métier, toutes taxes comprises » ; « j'aimerais bien qu'il puisse tester l'application avant de cocher décocher les cases » ;
   « en haut le bouton tester l'application ». Le VRAI serveur parlé en HTTP, les VRAIES fonctions du site (`rubriques-choix.js`) et le VRAI générateur de la page :

     1. SERVEUR — `metiers` (2 ou 3 clés connues, distinctes, le principal en tête, pas de 3D avec un autre) est accepté partout où `metier` l'est
        (`/api/clients/sync`, `/api/stripe/checkout`, `/api/monitor/espaces/metier`) et refusé sinon (400 `metiers_invalides`) ; une demande SANS `metiers`
        se comporte exactement comme avant ; la variante du chauffage est permise dès que le chauffage est DANS la liste, quel que soit son rang ;
     2. la liste est rangée sur la demande (avec `metiersEnPlus`), sur `fiche.choix` et sur l'espace, et `/api/espaces/etat` la rend (principal en tête)
        SEULEMENT quand il y en a plus d'un ; les gardes de la Tour (`siVide`, métier inchangé) la couvrent comme la variante ;
     3. SITE — la règle du choix (3 au plus, la 3D seule, un refus qui se dit), le prix (+10 € TTC par métier en plus), le bloc de variante visible dès que le
        chauffage est dans la sélection, l'adresse de la démonstration (`metiers=`, `cats` omis tant que rien n'est touché) ;
     4. la page : le bouton « Tester l'application » est dans le bandeau du haut ET avant la section des rubriques ; la racine PUBLIÉE ne change pas.
   Chaque refus a sa contre-épreuve (le même corps valide passe). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const SRC = fs.readFileSync(SERVEUR, 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3215-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SRVN = nu(SRC);
const lit = nom => { const i = SRVN.indexOf('const ' + nom + ' = ['); if (i < 0) return null; const j = SRVN.indexOf('];', i); try { return vm.runInNewContext('(' + SRVN.slice(SRVN.indexOf('[', i), j + 1) + ')'); } catch (e) { return null; } };

console.log('\n── 3215 · le métier est obligatoire à l\'abonnement, les rubriques voyagent ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const CATS_OK = lit('CATS_OK');
  const CATS_BASE = lit('CATS_BASE');   // 30 octobre 2026 : la base s'ajoute d'office à toute liste choisie
  const avecBase = l => CATS_OK.filter(c => l.includes(c) || CATS_BASE.includes(c));
  vrai('(population) CATS_OK (38 rubriques cochables) est lu dans le code du serveur', Array.isArray(CATS_OK) && CATS_OK.length === 38);
  /* Le vrai `metiers.json` ouvre les vingt-trois métiers depuis le 23 octobre 2026 : le serveur de ce banc lit un référentiel FABRIQUÉ où
     les dix nouveaux restent fermés (tests/metiers-banc.js), pour que « un métier fermé est refusé » prouve quelque chose. */
  const REFB = require('./metiers-banc.js').ecrire(RACINE, banc);
  vrai('(population) le référentiel du banc est FABRIQUÉ : le vrai fichier ouvre ' + REFB.reel.ouverts.length + ' métiers, celui du banc ' + REFB.json.ouverts.length, REFB.reel.ouverts.length >= 23 && REFB.json.ouverts.length === 13);
  const METIERS = REFB.json;
  const OUVERTS = METIERS.ouverts, NOUVEAUX = METIERS.ordreMetiers.filter(k => !OUVERTS.includes(k));
  vrai('(population) le référentiel ferme encore des métiers (' + NOUVEAUX.length + ') — sinon « un métier fermé est refusé » ne prouverait rien', NOUVEAUX.length >= 1, NOUVEAUX.length);
  const FERME = NOUVEAUX[0];
  const prixPro = (/^\s*pro: \['(price_\w+)', '(price_\w+)'\]/m.exec(SRC) || [])[1];
  vrai('(population) le tarif Pro du serveur est lu', /^price_/.test(prixPro || ''), prixPro);
  const prixMsg = (/^\s*msgpro: \['(price_\w+)'/m.exec(SRC) || [])[1];
  vrai('(population) le tarif OP MESSAGES du serveur est lu, et ce n\'est pas celui d\'OP GESTION', /^price_/.test(prixMsg || '') && prixMsg !== prixPro, prixMsg);

  const MAINT = Date.now();
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const code64 = t => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t + '-' + 'x'.repeat(20) })).toString('base64');
  const mail = x => x + '@exemple-3215.fr';
  /* le monde : une entreprise sans métier (ELAN d'avant le chantier), payée, dont le compte du site paie une place de plus */
  const T_ELAN = 't-elan-3215';
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ [cle('elan-banc')]: { t: T_ELAN, nom: 'elan-banc', email: mail('elan'), ts: MAINT - 1000, code: code64(T_ELAN),
    formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 } }));
  const COMPTES = ['demande', 'ancien', 'messages', 'paie', 'elan', 'rien', 'variantes', 'msg', 'panne', 'curieux', 'ferme'], C = {}, J = {}, jetons = {};
  for (const id of COMPTES) { C[mail(id)] = { v: true, pr: 'Banc', no: id, so: 'Société ' + id };
    const brut = crypto.randomBytes(32).toString('hex'); J[sha(brut)] = { m: mail(id), g: 'session', exp: MAINT + 86400000 }; jetons[id] = brut; }
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ emails: [mail('ferme')] }));   // un compte que la Tour a FERMÉ
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: J }));
  /* le client d'AVANT cette règle : une demande d'OP GESTION sans métier, déjà rangée (date 111) */
  const ANCIENNE = { app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: 111, besoin: 'ancienne demande', users: '2', code: '', lien: 'ancien-banc', metier: '' };
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({ [mail('ancien')]: { email: mail('ancien'), nom: 'Ancien Client', entreprise: 'Ancien SARL', inscrit: MAINT - 9e6, apps: [], demandes: [ANCIENNE], plan: '', planStatus: '', promo: '', majTs: MAINT - 8e6, noteInterne: '', metier: '', metierPar: '', demandesTraitees: {} } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-3215'),
    comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_3215' } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-3215'), role: 'patron', actif: true, ts: MAINT }] }));
  /* Stripe simulé DANS le processus du serveur : il note chaque appel, et ne répond que ce qu'il faut à un paiement */
  const APPELS = path.join(banc, 'appels.jsonl');
  const PRE = path.join(banc, 'stripe-simule.js');
  fs.writeFileSync(PRE, require('./metiers-banc.js').preload(RACINE, REFB.chemin) + `const vrai = globalThis.fetch; const fs = require('fs'); let n = 0;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  fs.appendFileSync(${JSON.stringify(APPELS)}, JSON.stringify({ u, corps: String((opts && opts.body) || '') }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions') && String((opts && opts.body) || '').includes('panne')) return json({ error: { message: 'Stripe en panne (banc)' } }, 502);   // le compte « panne » : Stripe refuse de créer la page
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_3215', url: 'https://checkout.stripe.com/c/pay/banc-3215-' + (++n) });
  return json({ data: [], has_more: false });
};\n`);
  const PORT = 9400 + (process.pid % 90); let B = 'http://127.0.0.1:' + PORT;
  let journal = '', ipN = 0;
  const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(e); e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant, journal.slice(0, 800));
  if (!vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
      headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.' + (++ipN % 250) + '.' + (process.pid % 250) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {}, h: r.headers }; };
  let PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-3215' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const clients = async () => { await dormir(500); return (await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []; };
  const fiche = async id => (await clients()).find(c => c.email === mail(id));
  const sessionsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => /\/v1\/checkout\/sessions/.test(x.u)); } catch (x) { return []; } };



  try {
    const OPRUB = require(path.join(RACINE, 'rubriques-choix.js'));
    vrai('(population) METIERS_OK : au moins quatre métiers ouverts, dont la 3D et le chauffage', ['3d', 'chauffage', 'plomberie', 'electricite'].every(k => OUVERTS.includes(k)), OUVERTS.join());
    const payer = (id, corps) => appel('/api/stripe/checkout', Object.assign({ price: prixPro, quantity: 1 }, corps || {}), jetons[id]);
    const dem = (plus, date) => Object.assign({ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: date || (MAINT - 5000), besoin: 'Entretien', users: '3', code: '', lien: 'mm-banc', metier: 'plomberie' }, plus || {});
    const sync = (id, demandes) => appel('/api/clients/sync', { nom: 'Banc ' + id, entreprise: 'Société ' + id, inscrit: MAINT, apps: ['OP GESTION'], demandes, plan: '', planStatus: 'actif' }, jetons[id]);
    const lire = async id => ((await fiche(id)) || {}).demandes || [];

    /* ══ 1. /api/clients/sync : la demande d'accès ══ */
    console.log('\n1. `/api/clients/sync` : la liste des métiers');
    let envoyees = [];
    const ajoute = async (t, plus, attendu) => {
      const d0 = dem(plus, MAINT - 4000 - envoyees.length);
      const r = await sync('demande', envoyees.concat([d0]));
      if (r.s === 200) envoyees = envoyees.concat([d0]);
      return { r, d: (await lire('demande')).find(x => x.lien === d0.lien) };
    };
    let x = await ajoute('deux', { lien: 'm2', metier: 'plomberie', metiers: ['plomberie', 'electricite'] });
    v('⛔ deux métiers : 200, rangés tels quels (principal en tête), `metier` reste le premier, 1 en plus', [x.r.s, x.d && x.d.metier, x.d && x.d.metiers, x.d && x.d.metiersEnPlus], [200, 'plomberie', ['plomberie', 'electricite'], 1]);
    x = await ajoute('trois', { lien: 'm3', metier: 'plomberie', metiers: ['plomberie', 'electricite', 'chauffage'], variante: 'climatisation' });
    v('⛔ trois métiers dont le chauffage EN TROISIÈME + « climatisation seulement » : 200, la variante est rangée, 2 en plus', [x.r.s, x.d && x.d.metiers, x.d && x.d.variante, x.d && x.d.metiersEnPlus], [200, ['plomberie', 'electricite', 'chauffage'], 'climatisation', 2]);
    x = await ajoute('chauffage principal', { lien: 'm3b', metier: 'chauffage', metiers: ['chauffage', 'plomberie'], variante: 'chauffage' });
    v('   le chauffage principal + un autre métier : la variante passe aussi', [x.r.s, x.d && x.d.variante, x.d && x.d.metiersEnPlus], [200, 'chauffage', 1]);
    x = await ajoute('compat', { lien: 'm0', metier: 'plomberie' });
    v('⛔ COMPAT — une demande SANS `metiers` (l\'application v773, une page d\'avant) : 200, `metiers` null, 0 en plus, comme avant', [x.r.s, x.d && x.d.metiers, x.d && x.d.metiersEnPlus, x.d && x.d.metier], [200, null, 0, 'plomberie']);
    x = await ajoute('un seul', { lien: 'm1', metier: 'electricite', metiers: ['electricite'] });
    v('   une liste d\'UN métier = la même chose que pas de liste : rien n\'est rangé de plus', [x.r.s, x.d && x.d.metiers, x.d && x.d.metiersEnPlus], [200, null, 0]);
    x = await ajoute('null', { lien: 'm1b', metier: 'electricite', metiers: null });
    v('   `metiers: null` = pas de liste (200)', [x.r.s, x.d && x.d.metiers], [200, null]);
    const rangees = (await lire('demande')).length;
    vrai('(population) les six demandes valides sont bien rangées avant les refus', rangees === 6, rangees);
    const refus = [
      ['QUATRE métiers', { metier: 'plomberie', metiers: ['plomberie', 'electricite', 'chauffage', 'serrurerie'] }],
      ['un doublon', { metier: 'plomberie', metiers: ['plomberie', 'plomberie'] }],
      ['le premier n\'est pas le principal', { metier: 'plomberie', metiers: ['electricite', 'plomberie'] }],
      ['la 3D avec un autre métier (en second)', { metier: 'plomberie', metiers: ['plomberie', '3d'] }],
      ['la 3D principale avec un autre métier', { metier: '3d', metiers: ['3d', 'plomberie'] }],
      ['un métier inconnu', { metier: 'plomberie', metiers: ['plomberie', 'astronaute'] }],
      ['un métier FERMÉ', { metier: 'plomberie', metiers: ['plomberie', FERME] }],
      ['une liste vide', { metier: 'plomberie', metiers: [] }],
      ['un texte au lieu d\'un tableau', { metier: 'plomberie', metiers: 'plomberie,electricite' }],
      ['une clé qui n\'est pas un texte', { metier: 'plomberie', metiers: ['plomberie', 7] }],
      ['la variante du chauffage donnée à deux métiers SANS chauffage', { metier: 'plomberie', metiers: ['plomberie', 'electricite'], variante: 'deux' }]
    ];
    for (const [t, corps] of refus) {
      const r = await sync('demande', envoyees.concat([dem(Object.assign({ lien: 'refus', date: MAINT - 100 }, corps))]));
      const attendu = /variante/.test(t) ? 'variante_inconnue' : 'metiers_invalides';
      v('⛔ ' + t + ' → 400 `' + attendu + '`, rien de plus n\'est rangé', [r.s, r.j.error, (await lire('demande')).length], [400, attendu, rangees]);
    }
    vrai('   la 3D SEULE passe (contre-épreuve de « la 3D est seule »)', (await sync('demande', envoyees.concat([dem({ lien: '3d-seule', date: MAINT - 90, metier: '3d', metiers: ['3d'] })]))).s === 200);
    /* le relais : le portail renvoie la fiche entière, parfois d'une page qui ne connaît pas `metiers` */
    const dejaLa = await lire('demande');
    const sansListe = dejaLa.map(d => { const c = Object.assign({}, d); delete c.metiers; delete c.metiersEnPlus; return c; });
    const rel = await sync('demande', sansListe);
    const apres = await lire('demande');
    v('⛔ le relais d\'une fiche SANS le champ (page d\'avant) ne perd pas la liste déjà rangée', [rel.s, (apres.find(d => d.lien === 'm3') || {}).metiers, (apres.find(d => d.lien === 'm3') || {}).metiersEnPlus], [200, ['plomberie', 'electricite', 'chauffage'], 2]);

    /* relecture `gardien` : une demande MODIFIÉE se juge sur ce qu'elle dit — pas sur la liste que la demande d'avant portait */
    const base3 = (await lire('demande')).find(d => d.lien === 'm3');
    const sansM = Object.assign({}, base3); delete sansM.metiers; delete sansM.metiersEnPlus;
    const autres = (await lire('demande')).filter(d => d.lien !== 'm3');
    const rA = await sync('demande', autres.concat([Object.assign({}, sansM, { cats: ['taches', 'absences'], variante: null })]));
    const apresA = (await lire('demande')).find(d => d.lien === 'm3');
    v('⛔ cas A — la demande MODIFIÉE renvoyée sans `metiers` : 200, la liste n\'est plus (la demande ne la porte plus), 0 en plus', [rA.s, apresA && apresA.metiers, apresA && apresA.metiersEnPlus], [200, null, 0]);
    const base3b = (await lire('demande')).find(d => d.lien === 'm3b');
    const sansMb = Object.assign({}, base3b); delete sansMb.metiers; delete sansMb.metiersEnPlus;
    const rB = await sync('demande', (await lire('demande')).filter(d => d.lien !== 'm3b').concat([Object.assign({}, sansMb, { metier: 'electricite', variante: null })]));
    const apresB = (await lire('demande')).find(d => d.lien === 'm3b');
    v('⛔ cas B — le MÉTIER change et la demande est renvoyée sans `metiers` : 200 (pas de 400 à tort), liste vide, nouveau métier rangé', [rB.s, apresB && apresB.metier, apresB && apresB.metiers], [200, 'electricite', null]);

    /* ══ 2. LE PAIEMENT ══ */
    console.log('\n2. `/api/stripe/checkout` : la liste voyage avec le choix');
    let r = await payer('paie', { metier: 'plomberie', metiers: ['plomberie', 'chauffage'], variante: 'climatisation', cats: ['devis'] });
    vrai('paiement avec deux métiers dont le chauffage en second : une page Stripe', r.s === 200 && /^https:\/\/checkout\.stripe\.com\//.test(r.j.url || ''), JSON.stringify(r.j).slice(0, 200));
    const fp = await fiche('paie');
    v('   rangé sur la fiche (`choix`) : métier, liste, variante', fp && [fp.choix.metier, fp.choix.metiers, fp.choix.variante], ['plomberie', ['plomberie', 'chauffage'], 'climatisation']);
    const n0 = sessionsStripe().length;
    for (const [t, corps] of [['quatre métiers', { metier: 'plomberie', metiers: ['plomberie', 'electricite', 'chauffage', 'serrurerie'] }], ['la 3D avec un autre', { metier: '3d', metiers: ['3d', 'plomberie'] }], ['un doublon', { metier: 'plomberie', metiers: ['plomberie', 'plomberie'] }]]) {
      r = await payer('paie', corps);
      v('⛔ paiement : ' + t + ' → 400 `metiers_invalides`, rien chez Stripe', [r.s, r.j.error, sessionsStripe().length - n0], [400, 'metiers_invalides', 0]);
    }
    r = await payer('paie', { metier: 'plomberie' });
    vrai('   CONTRE-ÉPREUVE — le même paiement sans liste part (200)', r.s === 200, JSON.stringify(r.j).slice(0, 160));
    const fq = await fiche('paie');
    v('   … et la liste redevient « aucune » sur la fiche', fq && fq.choix.metiers, null);

    /* ══ 3. LA TOUR POSE, L'APPLICATION REÇOIT ══ */
    console.log('\n3. La Tour pose la liste ; `/api/espaces/etat` la rend');
    const ETAT = async () => (await appel('/api/espaces/etat', { t: T_ELAN })).j;
    const TOUR = corps => appel('/api/monitor/espaces/metier', Object.assign({ nom: 'elan-banc' }, corps), PATRON);
    /* ⛔ DÉFAUT FERMÉ : tant que la facturation des métiers en plus n'existe pas, l'application ne REÇOIT pas la liste (relecture `gardien`, 30 octobre 2026) */
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'chauffage'], variante: 'climatisation' });
    let ef = await ETAT();
    v('⛔ serveur FERMÉ (défaut) : la Tour pose la liste (rangée), mais `/api/espaces/etat` ne rend NI `metiers` NI la variante portée par la liste', [r.s, r.j.metiers, ef.metier, 'metiers' in ef, ef.variante], [200, ['plomberie', 'chauffage'], 'plomberie', false, null]);
    v('   … le chauffage PRINCIPAL garde sa variante, liste ou pas (comme avant)', [(await TOUR({ metier: 'chauffage', metiers: ['chauffage', 'plomberie'], variante: 'deux' })).s, (await ETAT()).variante, 'metiers' in (await ETAT())], [200, 'deux', false]);
    await TOUR({ metier: 'plomberie' });
    /* le MÊME monde, serveur OUVERT (`"metiersServis": true`) : une copie de l'annuaire et de la Tour, sur un autre port */
    const banc2 = banc + '-ouvert', D2 = path.join(banc2, 'data'); fs.mkdirSync(banc2, { recursive: true }); fs.cpSync(D, D2, { recursive: true });
    fs.copyFileSync(path.join(banc, 'monitor.json'), path.join(banc2, 'monitor.json'));
    fs.writeFileSync(path.join(banc2, 'config.json'), JSON.stringify(Object.assign(JSON.parse(fs.readFileSync(path.join(banc, 'config.json'), 'utf8')), { metiersServis: true })));
    const PORT2 = PORT + 100, B2 = 'http://127.0.0.1:' + PORT2;
    const e2 = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc2, 'config.json'), TEAMOP_DATA: D2, PORT: String(PORT2), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e2); e2.stdout.on('data', d => { journal += d; }); e2.stderr.on('data', d => { journal += d; });
    let vivant2 = false; B = B2;
    for (let i = 0; i < 150 && !vivant2; i++) { try { vivant2 = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant2) await dormir(100); }
    vrai('le second serveur (réglage `metiersServis` ouvert) démarre', vivant2, journal.slice(0, 400));
    PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-3215' })).j.token;
    vrai('(population) la Tour se connecte au second serveur', typeof PATRON === 'string' && PATRON.length > 10);
    const e0 = await ETAT();
    vrai('(population) l\'espace de départ a un métier lisible et pas de liste', !('metiers' in e0), JSON.stringify(e0).slice(0, 200));
    r = await TOUR({ metier: 'plomberie' });
    let et = await ETAT();
    v('⛔ COMPAT — un seul métier : la réponse d\'état n\'a PAS de clé `metiers` (exactement la réponse d\'avant)', [r.s, et.metier, 'metiers' in et], [200, 'plomberie', false]);
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'chauffage'], variante: 'climatisation' });
    et = await ETAT();
    v('⛔ serveur OUVERT — la Tour pose deux métiers + la variante du chauffage (second) : l\'état rend `metier` principal, `metiers`, `variante`', [r.s, r.j.metiers, et.metier, et.metiers, et.variante], [200, ['plomberie', 'chauffage'], 'plomberie', ['plomberie', 'chauffage'], 'climatisation']);
    for (const [t, corps] of [['quatre', { metier: 'plomberie', metiers: ['plomberie', 'electricite', 'chauffage', 'serrurerie'] }], ['3d + un autre', { metier: '3d', metiers: ['3d', 'plomberie'] }], ['premier ≠ principal', { metier: 'plomberie', metiers: ['chauffage', 'plomberie'] }], ['une liste sans métier', { metier: '', metiers: ['plomberie', 'chauffage'] }], ['vide', { metier: 'plomberie', metiers: [] }]]) {
      r = await TOUR(corps); const e = await ETAT();
      v('⛔ la Tour : ' + t + ' → 400 `metiers_invalides`, l\'état ne bouge pas', [r.s, r.j.error, e.metiers], [400, 'metiers_invalides', ['plomberie', 'chauffage']]);
    }
    r = await TOUR({ metier: 'plomberie' });
    et = await ETAT();
    v('   une Tour d\'AVANT (sans le champ) re-pose le même métier : la liste et la variante restent', [r.s, et.metiers, et.variante], [200, ['plomberie', 'chauffage'], 'climatisation']);
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'electricite'], siVide: true });
    et = await ETAT();
    v('⛔ `siVide` + même métier : une SECONDE demande acceptée ne remplace pas la liste (garde), le principal non plus', [r.s, r.j.garde, et.metiers], [200, true, ['plomberie', 'chauffage']]);
    /* relecture `gardien` — la garde ne vaut que si une liste est DÉJÀ rangée, et n'écarte pas une variante dite dans le même corps */
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie'] });
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'electricite'], siVide: true });
    et = await ETAT();
    v('⛔ `siVide` + même métier + AUCUNE liste rangée : la demande POSE la liste (pas de `garde`)', [r.s, r.j.garde, et.metiers], [200, undefined, ['plomberie', 'electricite']]);
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'serrurerie', 'peinture'], siVide: true });
    et = await ETAT();
    v('   CONTRE-ÉPREUVE — une liste déjà rangée est gardée (`garde`), la nouvelle ne passe pas', [r.s, r.j.garde, et.metiers], [200, true, ['plomberie', 'electricite']]);
    r = await TOUR({ metier: 'chauffage', metiers: ['chauffage', 'plomberie'] });
    r = await TOUR({ metier: 'chauffage', metiers: ['chauffage', 'serrurerie'], variante: 'climatisation', siVide: true });
    et = await ETAT();
    v('⛔ `siVide`, liste gardée, variante NEUVE dans le même corps : la liste reste, la variante est posée', [r.s, r.j.garde, et.metiers, et.variante], [200, undefined, ['chauffage', 'plomberie'], 'climatisation']);
    r = await TOUR({ metier: 'chauffage', metiers: ['chauffage', 'serrurerie'], variante: 'deux', siVide: true });
    et = await ETAT();
    v('   … et si la variante est AUSSI déjà posée : tout est gardé (`garde`)', [r.s, r.j.garde, et.metiers, et.variante], [200, true, ['chauffage', 'plomberie'], 'climatisation']);
    r = await TOUR({ metier: 'plomberie' });
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'electricite', 'serrurerie'] });
    et = await ETAT();
    v('   CONTRE-ÉPREUVE — le geste de la fiche (sans `siVide`) la change bien (3 métiers) ; la variante, sans chauffage, disparaît', [r.s, et.metiers, et.variante], [200, ['plomberie', 'electricite', 'serrurerie'], null]);
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie'] });
    et = await ETAT();
    v('   `[métier]` retire la liste : plus de clé `metiers` dans l\'état', [r.s, 'metiers' in et], [200, false]);
    r = await TOUR({ metier: 'plomberie', metiers: ['plomberie', 'chauffage'] });
    r = await TOUR({ metier: 'electricite' });
    et = await ETAT();
    v('⛔ changer le métier PRINCIPAL retire la liste (elle ne survit pas à un autre principal)', [r.s, et.metier, 'metiers' in et], [200, 'electricite', false]);
    r = await TOUR({ metier: 'plomberie' });
    et = await ETAT();
    v('⛔ … et revenir au premier principal SANS liste ne ressuscite pas l\'ancienne (elle n\'est pas restée en réserve dans l\'annuaire)', [r.s, et.metier, 'metiers' in et], [200, 'plomberie', false]);
    const fnum = (await fiche('demande'));
    vrai('   la fiche de la Tour (`/api/monitor/clients`) porte la liste de la demande', fnum && fnum.demandes.some(d => Array.isArray(d.metiers) && d.metiers.length === 2));

    /* ══ 4. LE SITE : LA RÈGLE DU CHOIX (fonctions pures de la page) ══ */
    console.log('\n4. Le choix des métiers (les vraies fonctions de `rubriques-choix.js`)');
    let c = [];
    const tape = k => { const o = OPRUB.basculerMetier(c, k); c = o.choix; return o.refus; };
    v('le premier métier choisi est le principal', [tape('plomberie'), c], ['', ['plomberie']]);
    v('   le deuxième s\'ajoute à la suite', [tape('chauffage'), c], ['', ['plomberie', 'chauffage']]);
    v('   le troisième aussi', [tape('electricite'), c], ['', ['plomberie', 'chauffage', 'electricite']]);
    const refus4 = tape('serrurerie');
    v('⛔ le QUATRIÈME est refusé, poliment, la liste ne bouge pas', [/Trois métiers au maximum/.test(refus4), c], [true, ['plomberie', 'chauffage', 'electricite']]);
    v('   retoucher un métier choisi le RETIRE (et libère la place)', [tape('chauffage'), c], ['', ['plomberie', 'electricite']]);
    v('   CONTRE-ÉPREUVE — la place libérée accepte un nouveau métier', [tape('serrurerie'), c], ['', ['plomberie', 'electricite', 'serrurerie']]);
    v('   « en faire le principal » : passe en tête, les autres gardent leur ordre', OPRUB.faireLePrincipal(c, 'serrurerie'), ['serrurerie', 'plomberie', 'electricite']);
    v('   … et sur le principal ou un absent : rien ne change', [OPRUB.faireLePrincipal(c, 'plomberie'), OPRUB.faireLePrincipal(c, 'absent')], [c, c]);
    c = ['plomberie'];
    const r3d = tape('3d');
    v('⛔ la 3D ne s\'ajoute pas à un autre métier : refus qui le DIT, la liste ne bouge pas', [/3D.*seule/.test(r3d), c], [true, ['plomberie']]);
    c = [];
    tape('3d');
    const rApres3d = tape('plomberie');
    v('⛔ … et aucun métier ne s\'ajoute à la 3D', [/3D.*seule/.test(rApres3d), c], [true, ['3d']]);
    v('   CONTRE-ÉPREUVE — la 3D se retire, puis un autre métier passe', [tape('3d'), tape('plomberie'), c], ['', '', ['plomberie']]);
    v('   une clé qui n\'a pas la forme d\'une clé est ignorée', [OPRUB.basculerMetier(['plomberie'], '<b>').choix, OPRUB.basculerMetier(['plomberie'], 7).choix], [['plomberie'], ['plomberie']]);
    v('le prix : 0, 1 puis 2 métiers en plus = 0, 10, 20 € TTC par mois', [[], ['a'], ['a', 'b'], ['a', 'b', 'c']].map(l => [OPRUB.metiersEnPlus(l), OPRUB.prixEnPlus(l)]), [[0, 0], [0, 0], [1, 10], [2, 20]]);
    v('la variante est visible dès que le chauffage est dans la sélection, à n\'importe quel rang', [[], ['plomberie'], ['chauffage'], ['plomberie', 'chauffage'], ['plomberie', 'electricite', 'chauffage']].map(OPRUB.varianteVisible), [false, false, true, true, true]);

    /* ══ 5. L'ADRESSE DE LA DÉMONSTRATION ══ */
    console.log('\n5. L\'adresse de « Tester l\'application » (la vraie `OpRub.lienDemo`)');
    const DEMO = '/apercu/demo.html';
    v('aucun métier : l\'adresse nue (la démonstration générale)', OPRUB.lienDemo(DEMO, '', '', null, []), DEMO);
    v('un métier, aucune rubrique touchée : `metier=` + `metiers=`, PAS de `cats`', OPRUB.lienDemo(DEMO, 'plomberie', '', null, ['plomberie']), '/apercu/demo.html?metier=plomberie&metiers=plomberie');
    v('trois métiers : `metier=` est le principal, `metiers=` les trois dans l\'ordre', OPRUB.lienDemo(DEMO, 'plomberie', '', null, ['plomberie', 'electricite', 'serrurerie']), '/apercu/demo.html?metier=plomberie&metiers=plomberie,electricite,serrurerie');
    v('⛔ le chauffage en SECOND + « climatisation seulement » : la variante part', OPRUB.lienDemo(DEMO, 'plomberie', 'climatisation', null, ['plomberie', 'chauffage']), '/apercu/demo.html?metier=plomberie&metiers=plomberie,chauffage&variante=climatisation');
    v('   la variante sans chauffage dans la liste est jetée', OPRUB.lienDemo(DEMO, 'plomberie', 'climatisation', null, ['plomberie', 'electricite']), '/apercu/demo.html?metier=plomberie&metiers=plomberie,electricite');
    v('   avec des rubriques touchées : `cats` vient en dernier', OPRUB.lienDemo(DEMO, 'chauffage', 'deux', ['planning', 'devis'], ['chauffage', 'plomberie']), '/apercu/demo.html?metier=chauffage&metiers=chauffage,plomberie&variante=deux&cats=planning,devis');
    v('   l\'ancien appel (quatre arguments) donne la même adresse qu\'avant', OPRUB.lienDemo(DEMO, 'chauffage', 'climatisation', ['planning']), '/apercu/demo.html?metier=chauffage&variante=climatisation&cats=planning');
    const sale = OPRUB.lienDemo(DEMO, 'plomberie', '', null, ['plomberie', 'a&b=c', '<x>', 'electricite', 'serrurerie', 'peinture']);
    v('⛔ encodé et borné : une clé mal formée est jetée, trois au plus', decodeURIComponent((/metiers=([^&]*)/.exec(sale) || [])[1] || '').split(','), ['plomberie', 'electricite', 'serrurerie']);
    vrai('   aucun caractère de requête ne passe', !/[<>]|a&b/.test(sale), sale);
    v('   une liste dont le premier n\'est pas le principal est jetée (elle dirait deux choses)', OPRUB.lienDemo(DEMO, 'plomberie', '', null, ['electricite', 'plomberie']), '/apercu/demo.html?metier=plomberie');

    /* ══ 6. LA PAGE ══ */
    console.log('\n6. La page `creer.html` : où est le bouton');
    const apercu = fs.readFileSync(path.join(RACINE, 'apercu', 'site', 'creer.html'), 'utf8'), racine = fs.readFileSync(path.join(RACINE, 'creer.html'), 'utf8');
    const iHaut = apercu.indexOf('id="tester-haut"'), iBloc = apercu.indexOf('id="tester-bloc"'), iRub = apercu.indexOf('id="rubriques-demande"'), iMetiers = apercu.indexOf('id="metiers-choix"'), iEtapes = apercu.indexOf('class="etapes3"'), iVar = apercu.indexOf('id="variante-chauffage"');
    vrai('(population) tous les repères sont trouvés dans la page', [iHaut, iBloc, iRub, iMetiers, iEtapes, iVar].every(i => i > 0), [iHaut, iBloc, iRub, iMetiers, iEtapes, iVar].join());
    vrai('⛔ le bouton du HAUT est dans le bandeau (avant les étapes), le second APRÈS les métiers et AVANT la section « Vos rubriques »', iHaut < iEtapes && iMetiers < iBloc && iBloc < iRub, [iHaut, iEtapes, iMetiers, iBloc, iRub].join());
    vrai('   la variante reste dans la section des métiers (avant le bouton)', iMetiers < iVar && iVar < iBloc);
    vrai('   les deux boutons ouvrent la démonstration de l\'aperçu dans un onglet qui garde `window.opener`, et sont visibles d\'emblée (pas `hidden`)',
      /<a class="bouton-test plein" id="tester-haut" data-tester href="\/apercu\/demo\.html" data-demo="\/apercu\/demo\.html" target="_blank" rel="opener">/.test(apercu)
      && /<div class="tester-bloc" id="tester-bloc"><a class="bouton-test" id="tester-app" data-tester href="\/apercu\/demo\.html" data-demo="\/apercu\/demo\.html" target="_blank" rel="opener">/.test(apercu));
    vrai('   la phrase d\'accroche et celle de la section des rubriques sont écrites', /choisissez les options qui correspondent à vos besoins/.test(apercu) && /Essayez votre application avant de choisir vos rubriques/.test(apercu));
    vrai('   le prix est dit : « Chaque métier en plus : +10 € TTC par mois. »', /Chaque métier en plus[\s  ]*:[\s  ]*\+10[\s  ]*€ TTC par mois\./.test(apercu));
    vrai('   l\'ordre, le refus et le total ont leur place (le refus est un `role="status"`)', /id="metiers-ordre"/.test(apercu) && /id="metiers-refus" role="status"/.test(apercu) && /id="metiers-total"/.test(apercu));
    vrai('la racine PUBLIÉE (30 octobre 2026) porte le bouton du haut', /tester-haut/.test(racine));
    const SITE = nu(fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8'));
    vrai('   le script de la page appelle les VRAIES règles (`basculerMetier`, `faireLePrincipal`, `varianteVisible`, `prixEnPlus`) et met à jour LES DEUX boutons',
      /OpRub\.basculerMetier\(choix, k\)/.test(SITE) && /OpRub\.faireLePrincipal\(choix, k\)/.test(SITE) && /OpRub\.varianteVisible\(ms\)/.test(SITE) && /OpRub\.prixEnPlus\(/.test(SITE) && /\$\$\('\[data-tester\]'/.test(SITE));
    vrai('   la demande par e-mail porte `METIERS : …` et les clés, la session garde `metiers`', /'METIERS : '/.test(SITE) && /\[metiers ' \+ ms\.join\(','\)/.test(SITE) && /metiers: metiersCourants\(\)/.test(SITE));
    vrai('   les `cats` ne partent vers la démonstration que si le client a touché à la grille (`etatRub.touche`)', /etatRub && etatRub\.touche \? window\.OpRub\.liste\(etatRub\) : null/.test(SITE));
    const tour = fs.readFileSync(path.join(RACINE, 'apercu', 'tour.html'), 'utf8');
    vrai('   la Tour (aperçu) affiche la liste d\'une demande et la transmet à l\'acceptation', /pas encore facturé, ni appliqué dans l’application/.test(tour) && /d\.metiers\.length>1/.test(tour) && /metiers:\(Array\.isArray\(dm\.metiers\)/.test(tour));
  } finally { fin(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
