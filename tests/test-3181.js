/* ⛔ CE QUE CE FICHIER GARDE — LA VARIANTE DU CHAUFFAGE / CLIMATISATION, LA BASE VERROUILLÉE ET LE BOUTON « TESTER L'APPLICATION » (30 octobre 2026).

   Justin : « juste chauffage clim… vous faites les deux, ou juste chauffage, ou juste clim » ; « planning, rendez-vous, suivi de chantier, stock,
   encaissement, facturation, photo et compte rendu, gestion client, contrat, c'est obligatoire qu'on le pose… il faut faire des choses qui peuvent pas
   décocher » ; « un bouton tester l'application ».
   Le VRAI serveur parlé en HTTP, la VRAIE grille (`rubriques-choix.js`) et le VRAI générateur de la page de création :

     1. `GET /api/metiers` sert la base (8 clés, celles de `CATS_BASE`) — l'écran dit ce que le serveur range ;
     2. la grille : la base est cochée d'office, NON décochable (à la main, ni par « Tout cocher »), et part toujours avec la demande ;
     3. la VARIANTE : `/api/clients/sync` (demande d'accès) et `/api/stripe/checkout` (paiement) acceptent `deux`, `chauffage`, `climatisation` pour le
        chauffage, REFUSENT toute autre valeur (400 `variante_inconnue`) et toute variante donnée à un autre métier ; le format d'AVANT (sans le champ)
        passe tel quel ; la base s'ajoute aux rubriques d'une demande neuve, et « rien coché » reste « rien » ;
     4. la Tour pose la variante (`/api/monitor/espaces/metier`) ; `/api/espaces/etat` rend `metier: 'chauffage'` pour les trois (l'application
        d'aujourd'hui ne connaît pas la climatisation) ET la vraie `variante` (la bêta) ; changer de métier la retire ;
     5. le bouton « Tester l'application » : l'adresse bâtie par la VRAIE fonction de la page pour trois cas ; l'aperçu l'a, la racine PUBLIÉE non.
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
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3181-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SRVN = nu(SRC);
const lit = nom => { const i = SRVN.indexOf('const ' + nom + ' = ['); if (i < 0) return null; const j = SRVN.indexOf('];', i); try { return vm.runInNewContext('(' + SRVN.slice(SRVN.indexOf('[', i), j + 1) + ')'); } catch (e) { return null; } };

console.log('\n── 3181 · le métier est obligatoire à l\'abonnement, les rubriques voyagent ──');
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
  vrai('(population) le référentiel du banc est FABRIQUÉ : le vrai fichier ouvre ' + REFB.reel.ouverts.length + ' métiers, celui du banc ' + REFB.json.ouverts.length, REFB.reel.ouverts.length === REFB.reel.ordreMetiers.length && REFB.json.ouverts.length === 13);
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
  const mail = x => x + '@exemple-3181.fr';
  /* le monde : une entreprise sans métier (ELAN d'avant le chantier), payée, dont le compte du site paie une place de plus */
  const T_ELAN = 't-elan-3181';
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
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-3181'),
    comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_3181' } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-3181'), role: 'patron', actif: true, ts: MAINT }] }));
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
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_3181', url: 'https://checkout.stripe.com/c/pay/banc-3181-' + (++n) });
  return json({ data: [], has_more: false });
};\n`);
  const PORT = 9400 + (process.pid % 90), B = 'http://127.0.0.1:' + PORT;
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
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-3181' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const clients = async () => { await dormir(500); return (await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []; };
  const fiche = async id => (await clients()).find(c => c.email === mail(id));
  const sessionsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => /\/v1\/checkout\/sessions/.test(x.u)); } catch (x) { return []; } };


  try {
    const OPRUB = require(path.join(RACINE, 'rubriques-choix.js'));
    const BASE_ATTENDUE = ['planning', 'planningGeneral', 'interventions', 'rapports', 'factures', 'stock', 'clients', 'contrats'];
    vrai('(population) CATS_BASE est lu dans le code du serveur : les huit rubriques de Justin', JSON.stringify(CATS_BASE) === JSON.stringify(BASE_ATTENDUE) && BASE_ATTENDUE.every(k => CATS_OK.includes(k)), CATS_BASE);
    const payer = (id, corps) => appel('/api/stripe/checkout', Object.assign({ price: prixPro, quantity: 1 }, corps || {}), jetons[id]);
    const dem = (plus, date) => Object.assign({ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: date || (MAINT - 5000), besoin: 'Entretien', users: '3', code: '', lien: 'var-banc', metier: 'chauffage' }, plus || {});
    const sync = (id, demandes) => appel('/api/clients/sync', { nom: 'Banc ' + id, entreprise: 'Société ' + id, inscrit: MAINT, apps: ['OP GESTION'], demandes, plan: '', planStatus: 'actif' }, jetons[id]);
    const avecBase = l => CATS_OK.filter(k => l.includes(k) || BASE_ATTENDUE.includes(k));

    /* ══ 1. LE RÉFÉRENTIEL SERT LA BASE ══ */
    console.log('\n1. `GET /api/metiers` sert la base');
    const R = await appel('/api/metiers');
    v('⛔ `base` = les huit clés de CATS_BASE, toutes cochables', R.j.base, BASE_ATTENDUE);

    /* ══ 2. LA GRILLE : LA BASE NE SE DÉCOCHE PAS ══ */
    console.log('\n2. La vraie grille : la base est cochée d\'office et verrouillée');
    const e0 = OPRUB.etat(R.j, 'plomberie');
    vrai('(population) le conseil de la plomberie ne contient PAS « contrats » : la base l\'ajoute vraiment', !R.j.metiers.plomberie.rubriques.includes('contrats') && e0.choisies.contrats === true);
    vrai('toute la base est cochée au départ', BASE_ATTENDUE.every(k => e0.choisies[k]));
    for (const k of BASE_ATTENDUE) OPRUB.bascule(e0, k);
    vrai('⛔ toucher la case de chacune des huit ne la décoche pas', BASE_ATTENDUE.every(k => e0.choisies[k] && OPRUB.liste(e0).includes(k)));
    const avantT = !!e0.choisies.taches; OPRUB.bascule(e0, 'taches');
    vrai('   CONTRE-ÉPREUVE — une rubrique hors base se bascule bien', !!e0.choisies.taches !== avantT);
    const e1 = OPRUB.etat(R.j, 'plomberie'); for (const k of Object.keys(e1.choisies)) if (!BASE_ATTENDUE.includes(k)) OPRUB.bascule(e1, k);
    v('   on décoche TOUT ce qui peut l\'être : il reste exactement la base (jamais une application vide)', OPRUB.liste(e1), avecBase([]));
    OPRUB.changerMetier(e1, 'serrurerie'); OPRUB.revenirAuConseil(e1); OPRUB.tout(e1);
    vrai('   changer de métier, revenir au conseil, « Tout cocher » : la base reste cochée', BASE_ATTENDUE.every(k => e1.choisies[k]));
    const html = OPRUB.html(OPRUB.etat(R.j, 'chauffage'), 'x');
    vrai('⛔ la page la montre « incluse dans toutes les applications », sans case à cocher', html.includes('Incluses dans toutes les applications') && BASE_ATTENDUE.every(k => html.includes('data-rub-base="' + k + '"') && !html.includes('data-rub="' + k + '"')));
    const sansBase = OPRUB.etat(Object.assign({}, R.j, { base: undefined }), 'plomberie');
    vrai('   CONTRE-ÉPREUVE — sans `base` dans le référentiel (page d\'avant), rien ne change : « stock » se décoche encore', (OPRUB.bascule(sansBase, 'stock'), !sansBase.choisies.stock) && OPRUB.base(sansBase.ref).length === 0);

    /* ══ 3. LA VARIANTE ET LA BASE CÔTÉ SERVEUR ══ */
    console.log('\n3. Le serveur valide la variante et range la base');
    const lire = async id => ((await fiche(id)) || {}).demandes || [];
    let dejaEnvoyees = [];
    for (const vv of ['deux', 'chauffage', 'climatisation']) {
      dejaEnvoyees = dejaEnvoyees.concat([dem({ variante: vv, date: MAINT - 4000 - dejaEnvoyees.length, lien: 'v-' + vv, cats: ['devis'] })]);
      const r = await sync('variantes', dejaEnvoyees);
      const d = (await lire('variantes')).find(x => x.lien === 'v-' + vv);
      v('⛔ chauffage + « ' + vv + ' » : 200, la variante est rangée telle quelle, la base ajoutée à `devis`', [r.s, d && d.variante, d && d.metier, d && d.cats], [200, vv, 'chauffage', avecBase(['devis'])]);
    }
    const avant = await lire('variantes');
    vrai('(population) les trois demandes sont bien rangées avant les refus', avant.length === 3, avant.length);
    for (const [t, corps] of [['une valeur hors liste', dem({ variante: 'tout', lien: 'x1', date: MAINT - 100 })], ['la casse change (« Climatisation »)', dem({ variante: 'Climatisation', lien: 'x2', date: MAINT - 101 })], ['un nombre', dem({ variante: 1, lien: 'x3', date: MAINT - 102 })], ['un tableau', dem({ variante: ['deux'], lien: 'x4', date: MAINT - 103 })], ['une variante donnée à la PLOMBERIE', dem({ metier: 'plomberie', variante: 'chauffage', lien: 'x5', date: MAINT - 104 })]]) {
      const r = await sync('variantes', dejaEnvoyees.concat([corps]));
      v('⛔ ' + t + ' → 400 `variante_inconnue` et RIEN de plus n\'est rangé', [r.s, r.j.error, (await lire('variantes')).length], [400, 'variante_inconnue', 3]);
    }
    const sansChamp = await sync('rien', [dem({ lien: 'sans', cats: ['devis'] })]);
    const dSans = (await lire('rien'))[0];
    v('   le format d\'AVANT (sans `variante`) passe tel quel : variante `null`', [sansChamp.s, dSans && dSans.variante, dSans && dSans.metier], [200, null, 'chauffage']);
    const plom = await sync('rien', [dem({ lien: 'sans', cats: ['devis'] }), dem({ metier: 'plomberie', variante: '', lien: 'plom', date: MAINT - 3000 })]);
    v('   une variante vide donnée à un autre métier = « pas choisie » (200)', [plom.s, ((await lire('rien')).find(x => x.lien === 'plom') || {}).variante], [200, null]);
    const vide = await sync('rien', [dem({ lien: 'sans', cats: ['devis'] }), dem({ metier: 'plomberie', lien: 'plom', date: MAINT - 3000 }), dem({ lien: 'vide', cats: [], date: MAINT - 2000 })]);
    v('   « rien coché » reste `null` (la Tour part du conseil du métier) : la base ne transforme pas « rien » en « seulement la base »', [vide.s, ((await lire('rien')).find(x => x.lien === 'vide') || {}).cats], [200, null]);
    const dAvant = (await lire('rien')).find(x => x.lien === 'sans');
    const relais = await sync('rien', await lire('rien'));
    v('   le relais d\'une fiche déjà rangée repasse (200) sans changer ses rubriques', [relais.s, ((await lire('rien')).find(x => x.lien === 'sans') || {}).cats], [200, dAvant.cats]);

    /* le paiement : même vérification, même rangement sur la fiche */
    let r = await payer('paie', { metier: 'chauffage', variante: 'climatisation', cats: ['devis'] });
    vrai('paiement chauffage + climatisation : une page Stripe', r.s === 200 && /^https:\/\/checkout\.stripe\.com\//.test(r.j.url || ''), JSON.stringify(r.j).slice(0, 200));
    const fp = await fiche('paie');
    v('   rangé sur la fiche : métier, variante, rubriques + base, source « paiement »', fp && [fp.choix.metier, fp.choix.variante, fp.choix.cats, fp.choix.source], ['chauffage', 'climatisation', avecBase(['devis']), 'paiement']);
    const n0 = sessionsStripe().length;
    r = await payer('paie', { metier: 'chauffage', variante: 'les-deux' });
    v('⛔ paiement avec une variante hors liste → 400 `variante_inconnue`, rien chez Stripe', [r.s, r.j.error, sessionsStripe().length - n0], [400, 'variante_inconnue', 0]);
    r = await payer('paie', { metier: 'peinture', variante: 'chauffage' });
    v('⛔ paiement : variante donnée à la peinture → 400, rien chez Stripe', [r.s, r.j.error, sessionsStripe().length - n0], [400, 'variante_inconnue', 0]);
    r = await payer('paie', { metier: 'chauffage' });
    vrai('   CONTRE-ÉPREUVE — le même paiement sans variante part (200)', r.s === 200, JSON.stringify(r.j).slice(0, 160));

    /* ══ 4. LA TOUR POSE, L'APPLICATION REÇOIT ══ */
    console.log('\n4. La Tour pose la variante ; `/api/espaces/etat` la rend');
    const ETAT = async () => (await appel('/api/espaces/etat', { t: T_ELAN })).j;
    for (const vv of ['deux', 'chauffage', 'climatisation']) {
      r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'chauffage', variante: vv }, PATRON);
      const et = await ETAT();
      v('⛔ « ' + vv + ' » posée : l\'application d\'aujourd\'hui reçoit `metier: chauffage`, la bêta reçoit la vraie variante', [r.s, r.j.variante, et.metier, et.variante], [200, vv, 'chauffage', vv]);
    }
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'chauffage', variante: 'tout' }, PATRON);
    v('   la Tour ne peut pas poser une variante hors liste (400), et l\'ancienne reste', [r.s, (await ETAT()).variante], [400, 'climatisation']);
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'chauffage' }, PATRON);
    v('   une Tour d\'AVANT (sans le champ) re-pose le même métier : la variante reste', [r.s, (await ETAT()).variante], [200, 'climatisation']);
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'plomberie' }, PATRON);
    const et2 = await ETAT();
    v('   un autre métier retire la variante (elle ne survit pas au chauffage) : `null`, le métier suit', [r.s, et2.metier, et2.variante], [200, 'plomberie', null]);
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'plomberie', variante: 'deux' }, PATRON);
    v('   une variante donnée à la plomberie par la Tour → 400', [r.s], [400]);
    vrai('   `variante` figure sur chacune des réponses d\'un espace vivant (cinq `res.json` d\'état, lus dans le code)', (SRVN.match(/metier, cats, variante, versionMin/g) || []).length === 5);

    /* ══ 5. LE BOUTON « TESTER L'APPLICATION » : L'ADRESSE QUE BÂTIT LA VRAIE FONCTION ══ */
    console.log('\n5. Le lien de la démonstration (la vraie `OpRub.lienDemo`)');
    const DEMO = '/apercu/demo.html';
    v('un métier simple', OPRUB.lienDemo(DEMO, 'plomberie', '', ['planning', 'devis']), '/apercu/demo.html?metier=plomberie&cats=planning,devis');
    v('chauffage + variante', OPRUB.lienDemo(DEMO, 'chauffage', 'climatisation', ['planning', 'clients']), '/apercu/demo.html?metier=chauffage&variante=climatisation&cats=planning,clients');
    v('   la variante d\'un autre métier est ignorée', OPRUB.lienDemo(DEMO, 'plomberie', 'climatisation', ['planning']), '/apercu/demo.html?metier=plomberie&cats=planning');
    const eD = OPRUB.etat(R.j, 'chauffage'); OPRUB.bascule(eD, 'devis'); OPRUB.bascule(eD, 'vehicules');
    const decoche = OPRUB.liste(eD);
    const lienD = OPRUB.lienDemo(DEMO, 'chauffage', 'deux', decoche);
    const catsLien = decodeURIComponent((/cats=([^&]*)/.exec(lienD) || [])[1] || '').split(',');
    vrai('(population) le conseil du chauffage contenait « devis » et « véhicules » avant qu\'on les décoche', R.j.metiers.chauffage.rubriques.includes('devis') && R.j.metiers.chauffage.rubriques.includes('vehicules'));
    vrai('trois cas : des rubriques décochées — le lien ne porte QUE les cochées, base comprise', !catsLien.includes('devis') && !catsLien.includes('vehicules') && BASE_ATTENDUE.every(k => catsLien.includes(k)) && catsLien.length === decoche.length, catsLien.join());
    const sale = OPRUB.lienDemo(DEMO, 'chauffage', 'deux', ['planning', '<script>', 'a&b=c', 'x y'].concat(Array.from({ length: 100 }, (_, i) => 'k' + i)));
    const cSale = decodeURIComponent(/cats=([^&]*)/.exec(sale)[1]).split(',');
    vrai('   encodé et borné : une clé qui n\'a pas la forme d\'une clé est jetée, 60 au plus', cSale.length === 60 && cSale[0] === 'planning' && !/[<>&= ]/.test(cSale.join('')) && !/%3C|<|%20/.test(sale));
    v('   un métier qui n\'a pas la forme d\'un identifiant : l\'adresse nue', OPRUB.lienDemo(DEMO, 'a&b', 'deux', ['planning']), DEMO);

    const apercu = fs.readFileSync(path.join(RACINE, 'apercu', 'site', 'creer.html'), 'utf8'), racine = fs.readFileSync(path.join(RACINE, 'creer.html'), 'utf8');
    vrai('⛔ l\'aperçu porte le bouton (vers LA démonstration de l\'aperçu), les trois variantes (« Les deux » cochée d\'office) et le JSON avec la base',
      /id="tester-app" href="\/apercu\/demo\.html" data-demo="\/apercu\/demo\.html" target="_blank" rel="noopener"/.test(apercu) && /name="variante" value="deux" checked/.test(apercu)
      && /name="variante" value="chauffage"/.test(apercu) && /name="variante" value="climatisation"/.test(apercu) && /"base":\["planning","planningGeneral"/.test(apercu));
    vrai('⛔ la racine PUBLIÉE ne porte rien de tout ça', !/tester-app|name="variante"|variante-chauffage|"base":/.test(racine));
    const SITE = nu(fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8'));
    vrai('   le script de la page câble le lien sur la vraie fonction, au choix du métier, de la variante et à chaque case', /OpRub\.lienDemo\(lienTest\.getAttribute\('data-demo'\)/.test(SITE) && /addEventListener\('change', majTest\)/.test(SITE) && /OpRub\.monter\(grille, etatRub, 'cr', majTest\)/.test(SITE));
    vrai('   la demande par e-mail DIT la variante', /VARIANTE : /.test(SITE));
    const tour = fs.readFileSync(path.join(RACINE, 'apercu', 'tour.html'), 'utf8');
    vrai('   la Tour (aperçu) lit la variante d\'une demande et la transmet avec le métier à l\'acceptation', /variante:dm\.variante\|\|undefined/.test(tour) && /climatisation seulement/.test(tour));
  } finally { fin(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
