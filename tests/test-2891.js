/* ⛔ CE QUE CE FICHIER GARDE — UN ABONNEMENT NE COMMENCE PAS SANS MÉTIER, ET LES RUBRIQUES CHOISIES VOYAGENT (serveur, 23 octobre 2026).

   Justin : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; ils cochent les catégories ».
   Le VRAI serveur, parlé en HTTP (127.0.0.1, des entreprises et des adresses fictives), avec un Stripe simulé DANS son processus :

     1. `GET /api/metiers` sert le référentiel — les métiers OUVERTS seulement, jamais un métier fermé ;
     2. `/api/clients/sync` (la demande d'accès de l'espace client) : une demande NEUVE sans métier est refusée (400
        `metier_requis`), un métier fermé aussi (`metier_ferme`), un inconnu aussi (`metier_inconnu`), des rubriques hors liste aussi
        (`cats_inconnues`) — et RIEN n'est rangé ; une demande valide est rangée AVEC ses rubriques, dans l'ordre du menu ; une
        demande d'avant cette règle, relayée telle quelle, passe (sinon toute la fiche d'un client d'avant serait refusée à chaque
        visite) ; une demande d'OP MESSAGES n'est pas concernée ;
     3. `/api/stripe/checkout` (la page de paiement) : une souscription NEUVE (aucune entreprise visée) exige un métier valide AVANT
        toute lecture de Stripe, et range le choix sur la fiche du client ; une entreprise qui existe déjà (ELAN, réglée avant ce
        chantier, sans métier) achète une place de plus sans être arrêtée ;
     4. la Tour pose le métier (`/api/monitor/espaces/metier`) : un métier fermé est refusé, comme au public.
   Chaque refus est contrôlé avec sa CONTRE-ÉPREUVE (le même corps avec un métier valide passe), et chaque « rien n'est rangé » avec
   sa population (la fiche existait vide AVANT). */
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
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2891-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const SRVN = nu(SRC);
const lit = nom => { const i = SRVN.indexOf('const ' + nom + ' = ['); if (i < 0) return null; const j = SRVN.indexOf('];', i); try { return vm.runInNewContext('(' + SRVN.slice(SRVN.indexOf('[', i), j + 1) + ')'); } catch (e) { return null; } };

console.log('\n── 2891 · le métier est obligatoire à l\'abonnement, les rubriques voyagent ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const CATS_OK = lit('CATS_OK');
  vrai('(population) CATS_OK (38 rubriques cochables) est lu dans le code du serveur', Array.isArray(CATS_OK) && CATS_OK.length === 38);
  /* Le vrai `metiers.json` ouvre les vingt-trois métiers depuis le 23 octobre 2026 (la vingt-quatrième, la climatisation du 29 octobre, est déclarée en avance : tests/beta-en-avance.js) : le serveur de ce banc lit un référentiel FABRIQUÉ où
     les dix nouveaux restent fermés (tests/metiers-banc.js), pour que « un métier fermé est refusé » prouve quelque chose. */
  const REFB = require('./metiers-banc.js').ecrire(RACINE, banc);
  vrai('(population) le référentiel du banc est FABRIQUÉ : le vrai fichier ouvre ' + REFB.reel.ouverts.length + ' métiers, celui du banc ' + REFB.json.ouverts.length, REFB.reel.ouverts.length === REFB.reel.ordreMetiers.length - require('./beta-en-avance.js').PAS_ENCORE_OUVERTS.length && REFB.json.ouverts.length === 13);
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
  const mail = x => x + '@exemple-2891.fr';
  /* le monde : une entreprise sans métier (ELAN d'avant le chantier), payée, dont le compte du site paie une place de plus */
  const T_ELAN = 't-elan-2891';
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
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-2891'),
    comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_2891' } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-2891'), role: 'patron', actif: true, ts: MAINT }] }));
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
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_2891', url: 'https://checkout.stripe.com/c/pay/banc-2891-' + (++n) });
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
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-2891' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const clients = async () => { await dormir(500); return (await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []; };
  const fiche = async id => (await clients()).find(c => c.email === mail(id));
  const sessionsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => /\/v1\/checkout\/sessions/.test(x.u)); } catch (x) { return []; } };

  try {
    /* ══ 1. LE RÉFÉRENTIEL ══ */
    console.log('\n1. `GET /api/metiers` sert les métiers OUVERTS et leurs rubriques');
    const R = await appel('/api/metiers');
    vrai('la route répond 200, ok, sans authentification', R.s === 200 && R.j.ok === true, JSON.stringify(R.j).slice(0, 200));
    v('⛔ elle sert exactement les métiers ouverts du référentiel, dans son ordre', R.j.ouverts, METIERS.ordreMetiers.filter(k => OUVERTS.includes(k)));
    vrai('⛔ aucun métier fermé n\'en sort (ni dans la liste, ni dans les fiches)', NOUVEAUX.every(k => !R.j.ouverts.includes(k) && !(R.j.metiers || {})[k]) && !JSON.stringify(R.j).includes('Sécurité incendie'));
    v('   38 rubriques cochables, 4 « toujours », 10 groupes', [Object.keys(R.j.rubriques || {}).length, (R.j.toujours || []).length, (R.j.groupes || []).length], [38, 4, 10]);
    v('   le conseil servi pour le chauffage = les rubriques ouvertes par défaut du référentiel, dans l\'ordre du menu (sans les « toujours »)',
      (R.j.metiers.chauffage || {}).rubriques, CATS_OK.filter(c => METIERS.metiers.chauffage.rubriques.includes(c)));
    vrai('   chaque rubrique conseillée porte sa raison', Object.keys(R.j.metiers).every(k => R.j.metiers[k].rubriques.every(c => typeof R.j.metiers[k].pourquoi[c] === 'string' && R.j.metiers[k].pourquoi[c].length >= 20)));
    vrai('   la réponse se met en cache quelques minutes (elle part à chaque ouverture de l\'écran d\'abonnement)', /max-age=\d+/.test(R.h.get('cache-control') || ''), R.h.get('cache-control'));

    /* ══ 2. LA DEMANDE D'ACCÈS (le relais de l'espace client) ══ */
    console.log('\n2. La demande d\'accès : métier obligatoire et ouvert, rubriques en liste fermée');
    const avant = await fiche('demande');
    vrai('(population) la fiche du client de la demande n\'existe pas encore — « rien n\'est rangé » se mesurera sur du vide', !avant);
    const dem = (plus, date) => Object.assign({ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: date || (MAINT - 5000), besoin: 'Entretien annuel des chaudières', users: '3', code: '', lien: 'chaud-banc', metier: 'chauffage' }, plus || {});
    const sync = (id, demandes) => appel('/api/clients/sync', { nom: 'Banc ' + id, entreprise: 'Société ' + id, inscrit: MAINT, apps: ['OP GESTION'], demandes, plan: '', planStatus: 'actif' }, jetons[id]);
    const refus = async (titre, d, code) => { const r = await sync('demande', [d]); const f = await fiche('demande');
      v('⛔ ' + titre + ' → 400 `' + code + '`, avec un message lisible, et RIEN n\'est rangé', [r.s, r.j.error, typeof r.j.message === 'string' && r.j.message.length > 10, !f], [400, code, true, true]); };
    await refus('une demande NEUVE sans métier', dem({ metier: '' }), 'metier_requis');
    await refus('… un métier absent du corps', (() => { const d = dem(); delete d.metier; return d; })(), 'metier_requis');
    await refus('… un métier FERMÉ (« ' + FERME + ' » : l\'application publique ne le connaît pas, le client recevrait la 3D)', dem({ metier: FERME }), 'metier_ferme');
    await refus('… un métier inconnu', dem({ metier: 'boulangerie' }), 'metier_inconnu');
    await refus('… des rubriques hors liste', dem({ cats: ['planning', 'devis', 'nimportequoi'] }), 'cats_inconnues');
    await refus('… des rubriques qui ne se cochent jamais (le tableau de bord est toujours ouvert)', dem({ cats: ['planning', 'dashboard'] }), 'cats_inconnues');
    await refus('… des rubriques en double', dem({ cats: ['planning', 'planning'] }), 'cats_inconnues');
    await refus('… des rubriques qui ne sont pas un tableau', dem({ cats: 'planning' }), 'cats_inconnues');
    await refus('… une rubrique qui n\'est pas du texte', dem({ cats: ['planning', 42] }), 'cats_inconnues');
    const ok1 = await sync('demande', [dem({ cats: ['devis', 'planning', 'clients', 'interventions'] })]);
    const f1 = await fiche('demande');
    v('⛔ CONTRE-ÉPREUVE — la même demande avec un métier ouvert et des rubriques valides passe (200)', ok1.s, 200);
    v('   … elle est rangée avec son métier, SES RUBRIQUES (dans l\'ordre du menu, pas dans l\'ordre de la saisie)', f1 && f1.demandes.map(d => [d.metier, d.cats]), [['chauffage', CATS_OK.filter(c => ['devis', 'planning', 'clients', 'interventions'].includes(c))]]);
    const sans = await sync('demande', [dem(), dem({ date: MAINT - 4000, lien: 'autre-banc', cats: [] })]);
    const f2 = await fiche('demande');
    v('   sans rubriques, ou une liste vide : `cats: null` — la Tour part du conseil du métier', [sans.s, f2.demandes.map(d => d.cats)], [200, [null, null]]);
    const edit = await sync('demande', [dem({ cats: ['stock', 'produits'] })]);
    const f3 = await fiche('demande');
    v('   une demande MODIFIÉE (mêmes date et identité, rubriques changées) est revalidée puis rangée', [edit.s, f3.demandes.map(d => d.cats)], [200, [CATS_OK.filter(c => ['stock', 'produits'].includes(c))]]);
    const casse = await sync('demande', [dem({ cats: ['stock', 'nimportequoi'] })]);
    const f4 = await fiche('demande');
    v('⛔ … et modifiée avec une rubrique hors liste : refusée, l\'ancienne reste', [casse.s, casse.j.error, f4.demandes.map(d => d.cats)], [400, 'cats_inconnues', [CATS_OK.filter(c => ['stock', 'produits'].includes(c))]]);
    const toutes = await sync('demande', [dem({ cats: CATS_OK.slice() })]);
    v('   les 38 rubriques cochées passent', toutes.s, 200);

    /* la demande d'AVANT la règle : sans métier, relayée telle quelle */
    const fa = await fiche('ancien');
    vrai('(population) le client d\'avant la règle a bien une demande sans métier, rangée', fa && fa.demandes.length === 1 && !fa.demandes[0].metier);
    const rel = await sync('ancien', [ANCIENNE]);
    v('⛔ sa demande d\'avant, relayée telle quelle à chaque visite, PASSE (sinon toute sa fiche serait refusée pour toujours)', rel.s, 200);
    const rel2 = await sync('ancien', [Object.assign({}, ANCIENNE, { besoin: 'précision ajoutée au texte' })]);
    v('   … même avec un texte retouché (le métier et les rubriques n\'ont pas bougé)', rel2.s, 200);
    const rel3 = await sync('ancien', [ANCIENNE, dem({ metier: '', date: MAINT - 100 })]);
    v('⛔ … mais une demande NEUVE sans métier, glissée à côté de l\'ancienne, est refusée', [rel3.s, rel3.j.error], [400, 'metier_requis']);
    /* ⛔ UNE DEMANDE D'AVANT NE COUVRE QU'UNE DEMANDE : une seconde de même date (la neuve, Business Premium, 50 utilisateurs) ne passe pas dessous */
    const sec = Object.assign({}, ANCIENNE, { lien: 'second-banc', formule: 'Business Premium', users: '50' });
    const dbl = await sync('ancien', [ANCIENNE, sec]);
    v('⛔ deux demandes de MÊME DATE, la seconde neuve et sans métier : refusée (la première, d\'avant, ne la couvre pas)', [dbl.s, dbl.j.error], [400, 'metier_requis']);
    const dbl2 = await sync('ancien', [ANCIENNE, Object.assign({}, sec, { metier: 'chauffage' })]);
    v('   CONTRE-ÉPREUVE — la même seconde avec un métier ouvert passe, et la première, d\'avant, passe toujours', dbl2.s, 200);
    const dbl3 = await sync('ancien', [ANCIENNE, Object.assign({}, sec, { lien: 'ancien-banc' })]);
    v('⛔ … et la MÊME demande répétée (date, application et lien identiques) n\'a qu\'une seule couverture : la copie sans métier est refusée', [dbl3.s, dbl3.j.error], [400, 'metier_requis']);
    const rel4 = await sync('ancien', [Object.assign({}, ANCIENNE, { metier: FERME })]);
    v('   et l\'ancienne demande ne peut pas se voir donner un métier fermé', [rel4.s, rel4.j.error], [400, 'metier_ferme']);
    const rel5 = await sync('ancien', [Object.assign({}, ANCIENNE, { metier: 'peinture', cats: ['devis'] })]);
    const fa2 = await fiche('ancien');
    v('   ni la compléter d\'un métier ouvert : elle le prend (la modification est valide)', [rel5.s, fa2.demandes[0].metier, fa2.demandes[0].cats], [200, 'peinture', ['devis']]);

    /* ⛔ « D'OP GESTION » SE JUGE COMME LA TOUR LE JUGE : tout ce qui ne contient pas « messages » */
    for (const app of ['', 'op gestion', 'OP GESTION ', 'Op Gestion', 'GESTION', 'x']) {
      const rv = await sync('variantes', [dem({ app, metier: '', date: MAINT - 777 })]);
      v('⛔ une demande d\'application « ' + app + ' » sans métier est refusée (la Tour la range dans OP GESTION)', [rv.s, rv.j.error], [400, 'metier_requis']);
    }
    vrai('   (population) rien n\'a été rangé pour ce client', !(await fiche('variantes')));
    for (const app of ['OP MESSAGES', 'op messages', 'Messages']) {
      const rv = await sync('variantes', [dem({ app, metier: '', date: MAINT - 777 })]);
      v('   CONTRE-ÉPREUVE — « ' + app + ' » (la Tour la range dans OP MESSAGES) passe sans métier', rv.s, 200);
    }
    const msg = await sync('messages', [{ app: 'OP MESSAGES', formule: '', statut: 'nouveau', date: MAINT - 300, besoin: 'messagerie', users: '', code: '', lien: '', metier: '' }]);
    v('   une demande d\'OP MESSAGES n\'est pas un abonnement d\'OP GESTION : sans métier, elle passe', msg.s, 200);
    const rien = await sync('rien', []);
    v('   une fiche sans aucune demande passe aussi', rien.s, 200);

    /* ══ 3. LA PAGE DE PAIEMENT ══ */
    console.log('\n3. La page de paiement : une souscription neuve choisit son métier, avant tout appel à Stripe');
    const payer = (id, corps) => appel('/api/stripe/checkout', Object.assign({ price: prixPro, quantity: 1 }, corps || {}), jetons[id]);
    const n0 = sessionsStripe().length;
    const fp0 = await fiche('paie');
    vrai('(population) le client qui paie n\'a pas de fiche avant son premier paiement', !fp0);
    let r = await payer('paie');
    v('⛔ sans métier (et sans entreprise) → 400 `metier_requis`, message lisible, RIEN chez Stripe, aucune fiche ouverte', [r.s, r.j.error, typeof r.j.message === 'string' && r.j.message.length > 10, sessionsStripe().length - n0, !(await fiche('paie'))], [400, 'metier_requis', true, 0, true]);
    r = await payer('paie', { metier: FERME });
    v('⛔ un métier fermé → 400 `metier_ferme`, rien chez Stripe', [r.s, r.j.error, sessionsStripe().length - n0], [400, 'metier_ferme', 0]);
    r = await payer('paie', { metier: 'boulangerie' });
    v('   un métier inconnu → 400 `metier_inconnu`', [r.s, r.j.error], [400, 'metier_inconnu']);
    r = await payer('paie', { metier: 'chauffage', cats: ['devis', 'nimportequoi'] });
    v('   des rubriques hors liste → 400 `cats_inconnues`, rien chez Stripe', [r.s, r.j.error, sessionsStripe().length - n0], [400, 'cats_inconnues', 0]);
    r = await payer('paie', { metier: 'chauffage', cats: ['stock', 'devis', 'planning'] });
    v('⛔ CONTRE-ÉPREUVE — le même paiement avec un métier ouvert part chez Stripe (200, une page de paiement)', [r.s, /^https:\/\/checkout\.stripe\.com\//.test(r.j.url || ''), sessionsStripe().length - n0], [200, true, 1]);
    const fp = await fiche('paie');
    v('⛔ … et le choix est rangé sur la fiche du client (métier, rubriques dans l\'ordre du menu, source « paiement »), nom repris du compte du site',
      fp && [fp.choix.metier, fp.choix.cats, fp.choix.source, fp.entreprise, fp.demandes.length], ['chauffage', CATS_OK.filter(c => ['stock', 'devis', 'planning'].includes(c)), 'paiement', 'Société paie', 0]);
    r = await payer('paie', { metier: 'peinture' });
    const fp2 = await fiche('paie');
    v('   sans rubriques : `cats: null` ; un second paiement remplace le choix (le dernier fait foi)', [r.s, fp2.choix.metier, fp2.choix.cats], [200, 'peinture', null]);
    const sync2 = await sync('paie', []);
    const fp3 = await fiche('paie');
    v('⛔ le choix survit à la synchro suivante de l\'espace client (la fiche relayée ne le connaît pas)', [sync2.s, fp3.choix && fp3.choix.metier], [200, 'peinture']);
    r = await payer('elan', { ref: T_ELAN });
    v('⛔ une entreprise qui EXISTE déjà (ELAN, sans métier : réglée avant ce chantier) achète une place de plus SANS être arrêtée', [r.s, /^https:\/\/checkout\.stripe\.com\//.test(r.j.url || '')], [200, true]);
    vrai('   … et aucun choix n\'est inventé pour elle', !(await fiche('elan')) || !(await fiche('elan')).choix);
    /* ⛔ OP MESSAGES N'EST PAS UN ABONNEMENT D'OP GESTION : la page de paiement n'y demande pas de métier */
    const n1 = sessionsStripe().length;
    r = await payer('msg', { price: prixMsg });
    v('⛔ un tarif d\'OP MESSAGES sans métier part chez Stripe (200) — la page ne propose aucune liste pour en choisir un', [r.s, /^https:\/\/checkout\.stripe\.com\//.test(r.j.url || ''), sessionsStripe().length - n1], [200, true, 1]);
    vrai('   … et aucune fiche, aucun choix n\'est inventé', !(await fiche('msg')));
    r = await payer('msg', { price: prixPro });
    v('   CONTRE-ÉPREUVE — le même compte au tarif d\'OP GESTION, sans métier : refusé', [r.s, r.j.error], [400, 'metier_requis']);
    /* ⛔ LA FICHE NAÎT D'UNE PAGE DE PAIEMENT RENDUE, PAS D'UN CLIC */
    const fpa = await fiche('panne');
    vrai('(population) le compte « panne » n\'a pas de fiche', !fpa);
    r = await payer('panne', { metier: 'chauffage' });
    v('⛔ Stripe en panne (502) : aucune fiche n\'est ouverte pour un paiement qui n\'a pas eu de page', [r.s, !(await fiche('panne'))], [502, true]);
    r = await payer('ferme', { metier: 'chauffage' });
    v('⛔ un compte FERMÉ par la Tour ne recrée pas de fiche en cliquant « Payer » (la synchro lui répond 410)', [r.s, !(await fiche('ferme'))], [200, true]);
    r = await payer('curieux', { metier: 'chauffage' });
    const fc = await fiche('curieux');
    v('   CONTRE-ÉPREUVE — un paiement rendu range le choix sur une fiche marquée « de paiement »', [r.s, fc && fc.choix && fc.choix.metier, fc && fc.ficheDePaiement], [200, 'chauffage', true]);
    const liste = (await appel('/api/monitor/comptes-site', undefined, PATRON)).j.comptes || [];
    const lg = x => (liste.find(c => c.email === mail(x)) || {}).aUnEspace;
    v('⛔ un clic sur « Payer » ne fait PAS passer le compte pour « avec espace » ; deux comptes qui ont synchronisé leur espace client (« demande », « paie » : sa fiche relayée a remplacé la fiche de paiement), si', [lg('curieux'), lg('demande'), lg('paie')], [false, true, true]);
    r = await appel('/api/monitor/comptes-site/supprimer', { email: mail('demande') }, PATRON);
    v('   la fiche d\'une vraie entreprise protège toujours le compte (409)', r.s, 409);
    r = await appel('/api/monitor/comptes-site/supprimer', { email: mail('curieux') }, PATRON);
    v('⛔ … celle d\'un simple clic sur « Payer » ne l\'empêche plus : compte supprimé, et la fiche part avec lui', [r.s, !(await fiche('curieux'))], [200, true]);
    r = await payer('rien', { metier: 'chauffage', ref: 'inconnue-de-l-annuaire' });
    v('   une référence INCONNUE de l\'annuaire ne dispense pas de métier : la souscription est neuve', [r.s], [200]);
    r = await payer('rien', { ref: 'inconnue-de-l-annuaire' });
    v('   … sans métier elle est refusée', [r.s, r.j.error], [400, 'metier_requis']);

    /* ══ 4. LA TOUR POSE LE MÉTIER ══ */
    console.log('\n4. La Tour : un métier fermé est refusé comme au public');
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: FERME }, PATRON);
    v('⛔ poser un métier fermé → 400 « métier inconnu » (l\'application le lirait comme la 3D)', [r.s, r.j.error], [400, 'métier inconnu']);
    r = await appel('/api/monitor/espaces/metier', { nom: 'elan-banc', metier: 'chauffage' }, PATRON);
    v('   CONTRE-ÉPREUVE — un métier ouvert se pose', [r.s, r.j.metier], [200, 'chauffage']);
    const et = await appel('/api/espaces/etat', { t: T_ELAN });
    v('   et `/api/espaces/etat` le rend à l\'application', et.j.metier, 'chauffage');

    /* ══ 5. LE CODE ══ */
    console.log('\n5. Les trois portes passent par UNE vérification (dans le code)');
    const nChoix = (SRVN.match(/choixAbonnement\(/g) || []).length;
    v('⛔ `choixAbonnement` est appelée par la synchro et par le paiement (plus sa définition) — une troisième porte l\'appelle aussi, ou n\'existe pas', nChoix, 3);
    const iCh = SRVN.indexOf('if (choixPaiement) choixAbonnementNoter(');
    vrai('   ⛔ le choix n\'est rangé qu\'APRÈS la réponse de Stripe (après `!d.url`), jamais avant l\'appel', iCh > SRVN.indexOf('if (!r.ok || !d.url)') && SRVN.indexOf('if (!r.ok || !d.url)') > SRVN.indexOf("fetch('https://api.stripe.com/v1/checkout/sessions'"));
    vrai('   le refus du paiement vient AVANT la création de la page chez Stripe, et seul un tarif d\'OP GESTION l\'exige', /if \(!optionSeule && rangDuPrix >= 0 && !visees\.length\) \{\s*const c = choixAbonnement\(/.test(SRVN));
    vrai('   le refus du paiement vient AVANT la lecture de Stripe des options (avant `const qtes`)', SRVN.indexOf('let choixPaiement = null;') > 0 && SRVN.indexOf('let choixPaiement = null;') < SRVN.indexOf('const qtes = {};'));

    /* ══ 6. LE SERVEUR NE PART JAMAIS SANS LA PAGE QUI SAIT DEMANDER LE MÉTIER ══ */
    console.log('\n6. Le déploiement du serveur seul emporte la page de paiement et ses pièces (dans le code du script)');
    const PREP = nu(fs.readFileSync(path.join(RACINE, 'scripts', 'preparer-deploiement-serveur.sh'), 'utf8').replace(/^[ \t]*#.*$/gm, ' '));
    const lignesPages = PREP.split('\n').filter(l => /^\s*(?:PAGES_LIEES=\()|^\s*PAGES_LIEES=\(/.test(l));
    vrai('(population) le script déclare ses pages liées en DEUX formes (la normale, et celle de TOUR_EN_SERVICE=garder)', lignesPages.length === 2, lignesPages.length);
    for (const piece of ['recap-abonnement.html', 'metiers.json', 'rubriques-choix.js', 'rubriques-choix.css'])
      vrai('⛔ « ' + piece + ' » part avec le serveur dans les deux formes — sans elle le serveur exige un métier que la page ne sait pas demander (400 `metier_requis`)', lignesPages.every(l => ((/\(([^)]*)\)/.exec(l) || [])[1] || '').split(/\s+/).includes(piece)), lignesPages.map(l => l.includes(piece)).join('/'));   // le MOT entier : « apercu/recap-abonnement.html » ne vaut pas « recap-abonnement.html "
    vrai('   et ces pièces sont ajoutées au commit (`git add ... "${PAGES_LIEES[@]}"`), pas seulement relues par les bancs', /git add [\s\S]*"\$\{PAGES_LIEES\[@\]\}"/.test(PREP));
  } finally { fin(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
