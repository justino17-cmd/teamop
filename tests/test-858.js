/* ⛔ CE QUE CE FICHIER GARDE — LES OPTIONS DU PRO, DE BOUT EN BOUT : LA PAGE, LA ROUTE, LE SERVEUR, L'APPLICATION ET LA TOUR SE PARLENT (1er octobre 2026).

   Les options à la carte du Pro (Stock +9 €, Achats fournisseurs +6 €, Encaissements et compta +6 €, Registre sanitaire 3D +6 €, par
   utilisateur et par mois, l'année = 10 mois) ont été construites en cinq pièces, chacune avec ses bancs, chacune JUSTE : le serveur
   (`test-858`), l'application (`test-851`, contre un petit serveur qui rend la réponse du CONTRAT), la page de paiement (`test-853`,
   contre une réponse inventée), la Tour (`test-854`, contre un serveur de référence), le site (`test-855`). C'est la forme exacte du
   défaut que ce dépôt a déjà payé trois fois (CLAUDE.md : « les deux moitiés avaient chacune leurs bancs, chacune était JUSTE, et elles
   ne se parlaient pas ») — et ici il y en avait un de plus, trouvé à l'intégration : le lien « Ajouter » de l'application menait à
   une page qui envoyait TOUJOURS un `price`, donc un client déjà en Pro achetait un SECOND abonnement Pro.

   Ce banc fait parler les VRAIES fonctions des trois pages au VRAI serveur (`server/index.js` isolé, Stripe simulé DANS son processus,
   relu à chaque appel, qui NOTE ce qu'on lui crée) :
     1. l'application (`forfaitServeurSync`, `planBloque` extraits d'app.html) lit `/api/espaces/etat` et ouvre / ferme — une option
        payée ouvre ses rubriques et seulement elles ; impayée, mal couverte, d'une voisine d'adresse : fermée ; Business : tout, sans
        options ; Stripe muet : l'appareil garde ce qu'il savait ; rien ne s'écrit dans `db` ;
     2. la Tour (`tourPackPrefill`, `tourAboEnregistrer`) coche une option à la main : l'application l'ouvre ;
     3. la page de paiement (le script de recap-abonnement.html, son `fetch` branché sur le vrai serveur) : ce que la page envoie est ce
        que Stripe reçoit — bons tarifs, bonnes quantités, bon cycle ; le mode « ajout » ne crée jamais un second Pro ; les refus ;
     4. la BOUCLE : les lignes que la page a fait payer, posées comme l'abonnement que Stripe porterait ensuite, sont servies par le
        serveur et ouvertes par l'application.
   Les fichiers se remplacent par `APP_FICHIER`, `PAGE_FICHIER`, `TOUR_FICHIER`, `SERVEUR_FICHIER` : c'est ainsi que les mutations
   (`scratchpad/mutations-858/`) jouent une COPIE défectueuse, jamais le dépôt.
   Rien ne sort d'ici : 127.0.0.1, un Stripe simulé, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b858-'));
const vm = require('vm');
const enfants = [], facteurs = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } for (const f of facteurs) { try { f.s.close(); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 280 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 280000).unref();

console.log('\n── 858 · les options du Pro, de bout en bout : page, route, serveur, application, Tour ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)', '(price_\\w+)'\\]", 'm').exec(SRC) || []).slice(1);
  const P = { pro: prix('pro'), business: prix('business'), premium: prix('premium'), msgpro: prix('msgpro') };
  vrai('(population) les tarifs des formules du serveur sont lus (Pro, Business, Business Premium, OP MESSAGES)', Object.values(P).every(a => a.length === 2 && a.every(x => /^price_/.test(x))));
  const CLES = ['stock', 'achats', 'compta', 'sanitaire'];
  vrai('(population) la grille des options du serveur est lue (quatre clés, 9 / 6 / 6 / 6 €)', /const OPTIONS_CLES = \['stock', 'achats', 'compta', 'sanitaire'\];/.test(SRC)
    && /const OPTIONS_PRIX_MOIS = \{ stock: 9, achats: 6, compta: 6, sanitaire: 6 \};/.test(SRC));

  const RE_TABLE = /const STRIPE_PRIX_OPTION = \{[\s\S]*?\};/;
  /* ══ LES SERVEURS : une copie du dossier du serveur, dont la table d'options est celle qu'on veut ══════════════════════ */
  const OP = {}; for (const k of CLES) OP[k] = ['price_858' + k + 'M', 'price_858' + k + 'A'];
  const tablePleine = 'const STRIPE_PRIX_OPTION = {\n' + CLES.map(k => '  ' + (k + ':').padEnd(11) + "['" + OP[k][0] + "', '" + OP[k][1] + "']").join(',\n') + ' };';
  const tableVide = 'const STRIPE_PRIX_OPTION = {\n' + CLES.map(k => '  ' + (k + ':').padEnd(11) + "['', '']").join(',\n') + ' };';
  const tablePartielle = 'const STRIPE_PRIX_OPTION = {\n  stock:      [\'' + OP.stock[0] + "', ''],\n" + CLES.slice(1).map(k => '  ' + (k + ':').padEnd(11) + "['', '']").join(',\n') + ' };';
  vrai('(population) la table livrée se remplace en un seul endroit', (SRC.match(new RegExp(RE_TABLE.source, 'g')) || []).length === 1);
  let nCopie = 0;
  const copie = table => {
    const R = path.join(banc, 'srv' + (++nCopie)), D = path.join(R, 'server');
    fs.mkdirSync(D, { recursive: true });
    const src = path.dirname(SERVEUR);
    for (const f of fs.readdirSync(src)) if (/\.(js|json|sh)$/.test(f) && f !== 'index.js' && fs.statSync(path.join(src, f)).isFile()) fs.copyFileSync(path.join(src, f), path.join(D, f));
    /* (un serveur d'AVANT les options n'a pas de table : il se joue tel quel — c'est ainsi que les cas a à h se rejouent sur l'ancien code) */
    fs.writeFileSync(path.join(D, 'index.js'), RE_TABLE.test(SRC) ? SRC.replace(RE_TABLE, () => table) : SRC);
    try { fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(D, 'node_modules')); } catch (e) {}
    return path.join(D, 'index.js');
  };

  const MAINT = Date.now();
  const jour = n => new Date(MAINT + n * 86400000).toISOString().slice(0, 10);
  const cree = Math.floor(MAINT / 1000) - 3600;
  const avantBascule = Math.floor(Date.parse('2025-06-01T00:00:00Z') / 1000);
  const mail = x => x + '@exemple-858.fr';
  const code64 = t => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const NOM_OPT = { stock: 'OP GESTION — Option Stock', achats: 'OP GESTION — Option Achats fournisseurs', compta: 'OP GESTION — Option Encaissements et compta', sanitaire: 'OP GESTION — Option Registre sanitaire' };
  const IDS_OPT = new Set(Object.values(OP).flat());

  /* un monde : des entreprises, des abonnements Stripe, des comptes — construit par `monde()`, joué par `demarrer()` */
  function monde() {
    const M = { ENT: {}, subs: [], factures: {}, usages: {}, n: 0 };
    M.ent = (id, plus) => { const t = 't-' + id + '-858';
      M.ENT[id] = Object.assign({ t, nom: id, code: code64(t), ts: MAINT - 1000, email: mail(id), formule: 'pro', quantite: 1 }, plus || {});
      if (plus && plus.formule === undefined && 'formule' in plus) delete M.ENT[id].formule;
      return t; };
    /* lignes : [prixId, quantité] */
    M.sub = (id, status, lignes, plus) => { plus = plus || {}; const n = ++M.n;
      const s = { id: 'sub_' + id + '_' + n, object: 'subscription', status, created: plus.created || cree, metadata: plus.nonGrave ? {} : { espace: M.ENT[id].t },
        customer: { id: 'cus_' + id, email: plus.email || mail(id) }, current_period_end: plus.fin || Math.floor(MAINT / 1000) + 20 * 86400,
        items: { data: lignes.map(([px, q], i) => { const cle = CLES.find(k => OP[k].includes(px));
          return { id: 'si_' + n + '_' + i, quantity: q, price: { id: px, product: { name: cle ? NOM_OPT[cle] : 'OP GESTION' } } }; }) } };
      M.subs.push(s); return s; };
    M.facture = (sb, url, ouverte) => { M.factures[sb.id] = { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: url }, ouvertes: ouverte === false ? [] : [{ object: 'invoice', status: 'open', hosted_invoice_url: url }] }; };
    M.usage = (code, id, finLe) => { const u = M.usages[code] = M.usages[code] || { n: 0, equipes: {} }; u.n++; u.equipes[M.ENT[id].t] = { date: jour(-60), finLe, em: '' }; };
    return M;
  }
  const PRO = q => [P.pro[0], q], BUS = q => [P.business[0], q], OPL = (k, q) => [OP[k][0], q];

  let nsrv = 0;
  async function demarrer(M, plus) {
    plus = plus || {};
    const R = path.join(banc, 'run' + (++nsrv)), D = path.join(R, 'data');
    fs.mkdirSync(D, { recursive: true });
    const ETAT = path.join(R, 'stripe.json'), APPELS = path.join(R, 'appels.jsonl');
    const E = { muet: !!plus.muet, subs: M.subs, factures: M.factures };
    const poser = () => fs.writeFileSync(ETAT, JSON.stringify(E));
    poser();
    const espaces = M.ENT;
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(plus.espaces || espaces));
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(M.usages));
    /* le portail : un compte CONFIRMÉ et une session par entreprise qui paie (seul le sha256 du jeton est rangé, comme `comptes.js`) */
    const C = {}, J = {}, jetons = {};
    for (const id of Object.keys(M.ENT)) { const m = M.ENT[id].email; if (!m || C[m]) continue;
      C[m] = { v: true, pr: 'Banc', no: id, so: 'Banc ' + id };
      const brut = crypto.randomBytes(32).toString('hex'); J[sha(brut)] = { m, g: 'session', exp: MAINT + 86400000 }; jetons[id] = brut; }
    fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: J }));
    const dossiers = {}; for (const id of Object.keys(M.ENT)) if (M.ENT[id].email) dossiers[M.ENT[id].email] = { status: 'actif', plan: 'Business', planStatus: 'actif', cree: MAINT - 5000 };
    fs.writeFileSync(path.join(D, 'portail.json'), JSON.stringify({ d: dossiers, f: {}, a: [] }));
    const PRE = path.join(R, 'stripe-simule.js');
    fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const fs = require('fs'); let nSession = 0;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const E = JSON.parse(fs.readFileSync(${JSON.stringify(ETAT)}, 'utf8'));
  fs.appendFileSync(${JSON.stringify(APPELS)}, JSON.stringify({ u, corps: String((opts && opts.body) || '') }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (E.muet) return json({ error: { message: 'panne du banc' } }, 500);
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_858', url: 'https://checkout.stripe.com/c/pay/banc-858-' + (++nSession) });
  const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
  if (r1) { const id = decodeURIComponent(r1[1]); const sb = E.subs.find(x => x.id === id), f = E.factures[id] || {};
    if (!sb) return json({ error: { message: 'inconnu' } }, 404);
    return json(Object.assign({}, sb, { latest_invoice: f.latest_invoice === undefined ? null : f.latest_invoice })); }
  if (u.startsWith('https://api.stripe.com/v1/invoices')) { const id = new URL(u).searchParams.get('subscription'); return json({ data: ((E.factures[id] || {}).ouvertes || []).slice(0, 1), has_more: false }); }
  if (u.startsWith('https://api.stripe.com/v1/subscriptions')) return json({ data: E.subs, has_more: false });
  return json({ data: [], has_more: false });
};\n`);
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(R, 'config.json'), JSON.stringify(Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      adminPassHash: sha('mot-de-passe-858'), comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_858' },
      promos: [{ code: 'VIEUX-BANC-858', formule: 'premium', mois: 3 }, { code: 'PRO-BANC-858', formule: 'pro', mois: 3 }] },
      plus.smtp ? { smtp: { host: '127.0.0.1', port: plus.smtp, secure: false, user: 'banc', pass: 'banc', from: 'banc@exemple-858.fr' } } : {})));
    const PORT = 9300 + ((process.pid + nsrv * 11) % 600);
    let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, plus.fichier || SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(R, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(R, 'absente.json'),
        TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: String(plus.cacheMs || 600000), TEAMOP_STRIPE_IMPAYE_MS: '1000', TEAMOP_RAPPELS_DELAI_MS: '1000000' }, plus.env || {}),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e);
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + PORT;
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    if (!vivant) console.log(journal.slice(0, 1500));
    let ipN = 0;
    const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
        headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.' + (nsrv % 200) + '.' + (++ipN % 250) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
      let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
    const appelsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (x) { return []; } };
    const sessions = () => appelsStripe().filter(x => /\/v1\/checkout\/sessions/.test(x.u)).map(x => new URLSearchParams(x.corps));
    return { vivant, appel, R, D, B, E, poser, jetons, journal: () => journal, sessions, appelsStripe,
      etat: async id => (await appel('/api/espaces/etat', { t: M.ENT[id] ? M.ENT[id].t : id })).j,
      patron: async () => (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-858' })).j.token,
      lireReg: () => JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8')),
      arreter: () => new Promise(r => { if (e.exitCode !== null || e.signalCode) return r(); e.once('exit', () => r()); e.kill('SIGTERM'); }) };
  }
  /* ce que la réponse dit : [payé, formule, places, options (ou « ABSENT »)] */
  const OPT = j => ('options' in j) ? j.options : 'ABSENT';
  const VU = j => [j.paye === true, j.formule || null, j.places || null, OPT(j)];
  /* la forme que l'application grise sans rien écrire (suspension, sans formule) — et SANS options */
  const SUSP = j => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j) && !('options' in j);
  /* les lignes d'une page de paiement créée chez Stripe : [[tarif, quantité], …] */
  const lignesDe = s => { const o = []; for (let i = 0; i < 8; i++) { const p = s.get('line_items[' + i + '][price]'); if (p === null) break; o.push([p, s.get('line_items[' + i + '][quantity]')]); } return o; };
  const NOM_PRIX = px => { for (const k of CLES) { if (px === OP[k][0]) return k + ':M'; if (px === OP[k][1]) return k + ':A'; } for (const f of Object.keys(P)) { if (px === P[f][0]) return f + ':M'; if (px === P[f][1]) return f + ':A'; } return px; };
  const ligN = s => lignesDe(s).map(([px, q]) => NOM_PRIX(px) + '×' + q);

  /* ══ LES TROIS MOITIÉS QUE CE BANC FAIT PARLER ═════════════════════════════════════════════════════════════════════════
     1. l'APPLICATION : les vraies fonctions d'app.html (`forfaitServeurSync`, `planBloque`…), extraites du fichier livré ;
     2. la PAGE DE PAIEMENT : le vrai script de recap-abonnement.html, sur un faux document, dont le `fetch` va au vrai serveur ;
     3. la TOUR : les vraies fonctions de tour.html (`tourPackPrefill`, `tourAboEnregistrer`), contre le vrai serveur. */
  const APP = fs.readFileSync(process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(RACINE, 'app.html'), 'utf8');
  const PAGE = fs.readFileSync(process.env.PAGE_FICHIER ? path.resolve(process.env.PAGE_FICHIER) : path.join(RACINE, 'recap-abonnement.html'), 'utf8');
  const TOUR = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');

  /* ── 1. l'application ── */
  const bloc = (debut) => { const d0 = APP.indexOf(debut); if (d0 < 0) return ''; let p = 0;
    for (let k = APP.indexOf('{', d0); k < APP.length; k++) { if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(d0, k + 1); } } return ''; };
  const fonction = nom => bloc('async function ' + nom + '(') || bloc('function ' + nom + '(');
  const NOMS_APP = ['forfaitServeurSync', 'suspensionCle', 'suspensionPoser', 'suspensionSursis', 'suspensionGrise', 'accesSuspendu', 'suspensionBloque',
    'suspensionClasse', 'suspensionRappel', 'forfait', 'planBloque', 'optionsCle', 'optionsLire', 'optionsCharger', 'optionsPoser', 'optionServie', 'optionOuvre', 'optionsDe'];
  const FN_APP = NOMS_APP.map(fonction);
  const SRC_APP = { PLANS: bloc('const PLANS={'), PLAN_BLOQUE: bloc('const PLAN_BLOQUE={'), OPT: bloc('const OPTIONS_GESTION={'), SUSP: (/^let _susp = \{[^\n]*\};$/m.exec(APP) || [''])[0] };
  vrai('(population) les ' + NOMS_APP.length + ' fonctions de l\'application, PLANS, PLAN_BLOQUE, OPTIONS_GESTION et l\'état de suspension sont trouvés dans app.html (une tranche vide passerait sur tout)',
    FN_APP.every(f => f.length > 20) && !!SRC_APP.PLANS && !!SRC_APP.PLAN_BLOQUE && !!SRC_APP.OPT && !!SRC_APP.SUSP, NOMS_APP.filter((n, i) => !FN_APP[i]).join(','));
  /* un appareil : les vraies fonctions, et des témoins sur ce qu'il ÉCRIT (`save`) ou fait VOIR (`toast`) */
  function appareil(id, S, o) {
    o = o || {};
    const t = M.ENT[id] ? M.ENT[id].t : id;
    const LS = new Map([['elan_sync_team', t]]);
    const vu = { toasts: [], saves: 0 };
    const Z = { fetch: (u, x) => fetch(u, x), PUSH_API: S.B, toast: m => vu.toasts.push(String(m)), renderNav() {}, renderOnglets() {}, go() {}, save: () => { vu.saves++; },
      logEvent() {}, todayISO: () => '2026-10-01', espaceQuitter() {}, suiteRefresh() {}, views: {}, esc: s => String(s), metierBloque: () => false, alert() {}, location: { reload() {} },
      document: { getElementById: () => null, documentElement: { classList: { toggle() {} } }, addEventListener() {} } };
    Z.localStorage = { getItem: k => (LS.has(k) ? LS.get(k) : null), setItem: (k, x) => { LS.set(k, String(x)); }, removeItem: k => { LS.delete(k); } };
    const code = 'let STORE_KEY="elanB_banc858"; let currentUser={id:"u-admin",role:"admin"}; let current="dashboard";\n'
      + 'let db=' + JSON.stringify({ forfait: o.formule || (M.ENT[id] || {}).formule || 'pro', forfaitQty: 1, forfaitSrv: 'teamop' }) + '; let _opMsgOuvert=false;\n'
      + 'const BETA_ESSAI=false;\n' + SRC_APP.PLANS + ';\n' + SRC_APP.PLAN_BLOQUE + ';\n' + SRC_APP.OPT + ';\nvar _placesSrv=null,_placesSrvF="";\nvar _optsSrv;var _etatLuLe=0;\n' + SRC_APP.SUSP + '\n'
      + 'const userSeesModule=(u,k)=>!planBloque(k)&&!metierBloque(k);\n' + FN_APP.join('\n') + '\n'
      + 'return { sync: forfaitServeurSync, planBloque, forfait, accesSuspendu, db: () => db, opts: () => _optsSrv, setApi: u => { PUSH_API = u; } };';
    const noms = Object.keys(Z);
    const a = new Function(...noms, code)(...noms.map(k => Z[k]));
    a.vu = vu; a.LS = LS; return a;
  }
  const VUES = { stock: ['produits', 'stock', 'mouvements', 'saisieConso', 'boxes', 'carteBox', 'produitsDonnes', 'demandes', 'histoDemandes', 'brouillon', 'validations'],
    achats: ['fournisseurs', 'bons', 'commandes', 'boiteMail'], compta: ['comptabilite', 'telecollecte', 'enveloppes'], sanitaire: ['registre'] };
  const TOUTES = Object.values(VUES).flat();
  /* ce qui est OUVERT dans l'application, parmi toutes les rubriques d'option : la liste (triée) */
  const ouvert = a => TOUTES.filter(k => !a.planBloque(k)).sort();
  const attendu = cles => cles.flatMap(c => VUES[c]).filter((k, i, l) => l.indexOf(k) === i).sort();

  /* ── 2. la page de paiement : son vrai script, son `fetch` va au vrai serveur ── */
  const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/\s+/g, ' ');
  function conteneur(id) {
    let html = '', cache = {};
    const el = { id, _h: {}, style: {}, dataset: {}, get innerHTML() { return html; }, set innerHTML(h) { html = h; cache = {}; },
      addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
      querySelectorAll(sel) { if (cache[sel]) return cache[sel];
        const mk = (dataset, extra) => Object.assign({ dataset, _h: {}, focus() {}, addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); } }, extra || {});
        const r = [];
        if (sel === '[data-option]') for (const m of html.matchAll(/<input type="checkbox" data-option="(\w+)"( checked)?>/g)) r.push(mk({ option: m[1] }, { checked: !!m[2] }));
        else if (sel === '.cycle') for (const m of html.matchAll(/<button class="cycle[^"]*" data-cycle="(\w+)"/g)) r.push(mk({ cycle: m[1] }));
        else if (sel === '.puce-formule') for (const m of html.matchAll(/<button class="puce-formule[^"]*" data-formule="(\w+)"/g)) r.push(mk({ formule: m[1] }));
        return (cache[sel] = r); },
      querySelector() { return null; }, blur() {}, focus() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
    return el;
  }
  let nIp = 0;
  /* la page, exécutée : `id` désigne l'entreprise de l'appareil (sa session de compte, son marqueur d'espace) ; `S` le vrai serveur */
  function page(adresse, id, S, o) {
    o = o || {};
    const bloc0 = [...PAGE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(b => b.includes('const FORMULES = {'));
    let code = bloc0;
    /* les identifiants Stripe des options : ceux que le serveur de ce banc porte (la page livrée en est vide, tant que Justin n'a pas créé les tarifs) */
    for (const k of CLES) {
      const motif = new RegExp('(^  ' + k + ':\\s+\\{ mensuel: \')(\', annuel: \')(\' \\})', 'm');
      if (!motif.test(code)) throw new Error('banc : ligne STRIPE_PRICES_OPTIONS.' + k + ' introuvable');
      code = code.replace(motif, (_, a1, a2, a3) => a1 + OP[k][0] + a2 + OP[k][1] + a3);
    }
    const conts = {}, derniers = {}, envoye = [], reponses = [], urls = [];
    const document = { title: '', querySelectorAll() { return []; }, querySelector() { return null; },
      getElementById(i) { return /^(selecteurFormules|carteDroits|cartePaiement)$/.test(i) ? (conts[i] || (conts[i] = conteneur(i))) : (derniers[i] = conteneur(i)); } };
    const window = { location: { search: adresse, href: '', hostname: 'localhost' } };
    /* le `fetch` de la page va au VRAI serveur — la route, les en-têtes et le corps sont ceux que la page a construits */
    const fetchReel = async (url, opts) => {
      const hdr = Object.assign({}, opts.headers, { 'X-Forwarded-For': '10.7.' + (nsrv % 200) + '.' + (++nIp % 250) });
      if (/\/api\/stripe\/checkout$/.test(url)) envoye.push(JSON.parse(opts.body));
      const r = await fetch(S.B + url, { method: opts.method || 'GET', headers: hdr, body: opts.body });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (/\/api\/stripe\/checkout$/.test(url)) reponses.push({ s: r.status, j });
      return { ok: r.ok, status: r.status, json: async () => { if (j === null) throw new Error('pas du JSON'); return j; } };
    };
    const jeton = S.jetons[id];
    const api = new Function('window', 'document', 'history', 'localStorage', 'fetch', 'alert',
      code + '\n;return { optionsActives, compteLu, modeAjout: () => modeAjout, etat: () => ({ compteMsg, formuleActive, cycleAnnuel }) };')(
      window, document, { replaceState(a, b, u) { urls.push(u); } },
      { getItem: k => (k === 'teamop_portail_jeton' ? jeton : k === 'elan_sync_team' ? (o.sansEspace ? null : M.ENT[id].t) : null), removeItem() {} }, fetchReel, () => {});
    const html = () => conts.cartePaiement.innerHTML;
    const cases = () => conts.cartePaiement.querySelectorAll('[data-option]');
    return { api, envoye, reponses, urls, window, html, texte: () => texte(html()),
      clicCycle: nom => { for (const h of conts.cartePaiement.querySelectorAll('.cycle').find(x => x.dataset.cycle === nom)._h.click) h(); },
      cases, payer: async () => { await derniers.btnPayer._h.click[0](); } };
  }

  /* ── 3. la Tour : ses vraies fonctions, son vrai `apiPost` (réseau), le vrai serveur ── */
  const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const TOURN = nu(TOUR);
  function fonctionTour(src, nom) {
    const m = new RegExp('(^|\\n)[ \\t]*(?:async )?function ' + nom + '\\(').exec(src); if (!m) return '';
    const d0 = src.indexOf('function ' + nom + '(', m.index) - (/async function/.test(m[0]) ? 6 : 0);
    let k = src.indexOf('{', src.indexOf(')', d0)), prof = 0, q = null;
    for (; k < src.length; k++) {
      const c = src[k];
      if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
      if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); k = n < 0 ? src.length : n + 1; continue; }
      if (c === '/' && /(?:[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test(src.slice(Math.max(0, k - 12), k))) {
        let cls = false;
        for (k++; k < src.length; k++) { const d = src[k]; if (d === '\\') { k++; continue; } if (d === '\n') break; if (cls) { if (d === ']') cls = false; continue; } if (d === '[') { cls = true; continue; } if (d === '/') break; }
        continue;
      }
      if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
    }
    return src.slice(d0, k + 1);
  }
  const ligneVar = nom => (new RegExp('^var ' + nom + '=\\{[^\\n]*\\};$', 'm').exec(TOURN) || [''])[0];
  const NOMS_TOUR = ['esc', 'hAuth', 'apiPost', 'optsLib', 'optsClesDe', 'optsServiesDe', 'optsPastilles', 'optsLignesTexte', 'optsCasesHtml', 'optsEligible',
    'optsSynchro', 'optsVisible', 'optsChoisies', 'optsPeindre', 'abnEcart', 'metDemande', 'packPeindre', 'tourPackPrefill', 'tourAboEnregistrer'];
  const VARS_TOUR = ['OPT_L', 'OPT_C', 'OPT_P', 'OPT_ST', 'ABN_F', 'MET_L'].map(ligneVar);
  const FN_TOUR = NOMS_TOUR.map(n => fonctionTour(TOURN, n));
  const CLES_TOUR = (/^var OPT_CLES=(\[[^\]\n]*\]);$/m.exec(TOURN) || ['', '[]'])[1];
  vrai('(population) les ' + NOMS_TOUR.length + ' fonctions de la Tour et ses tables sont trouvées dans tour.html', FN_TOUR.every(Boolean) && VARS_TOUR.every(Boolean) && CLES_TOUR !== '[]', NOMS_TOUR.filter((n, i) => !FN_TOUR[i]).join(','));
  function tour(S, jeton) {
    const E = {}, toasts = [];
    const ctx = { fetch, JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console, document: { getElementById: id => E[id] || null },
      toast: t => toasts.push(String(t)), chargerEspaces: () => {}, CLI: { list: [], sel: '' }, ESP: { loaded: true, err: '', list: [] } };
    vm.createContext(ctx);
    vm.runInContext('var API="' + S.B + '", TOKEN=' + JSON.stringify(jeton) + ', PACK={nom:"",charge:false,err:"",d:null};\n' + VARS_TOUR.join('\n') + '\nvar OPT_CLES=' + CLES_TOUR + ';\n' + FN_TOUR.join('\n'), ctx);
    const html = vm.runInContext('optsCasesHtml()', ctx);
    for (const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) E[m[1]] = { id: m[1], hidden: /\bhidden\b/.test(m[0].replace(/id="[^"]*"/, '')), value: (/value="([^"]*)"/.exec(m[0]) || [])[1] || '', checked: false, disabled: false, innerHTML: '', textContent: '' };
    for (const id of ['abo-f', 'abo-q', 'abo-st', 'abo-fin', 'pack-info']) E[id] = { id, value: '', checked: false, disabled: false, innerHTML: '', textContent: '' };
    const attendre = async (cond) => { for (let i = 0; i < 400 && !cond(); i++) await dormir(10); return cond(); };
    return { ctx, E, toasts, attendre, etat: () => vm.runInContext('PACK', ctx), coche: (k, val) => { E['abo-o-' + k].checked = val; },
      regle: (id, val) => { E[id].value = val; ctx.optsSynchro(); } };
  }

  /* ══ LE MONDE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  const M = monde();
  const TOUS = CLES.map(k => OPL(k, 3));
  M.ent('s1'); M.sub('s1', 'active', [PRO(3)]); M.sub('s1', 'active', [OPL('stock', 3)]);                          // Pro × 3 + Stock × 3 payés
  M.ent('s2'); M.sub('s2', 'active', [PRO(3)]); const sImp = M.sub('s2', 'past_due', [OPL('stock', 3)]); M.facture(sImp, 'https://invoice.stripe.com/i/banc-858-s2');   // l'option IMPAYÉE
  M.ent('s3'); M.sub('s3', 'active', [PRO(3)]); M.sub('s3', 'active', [OPL('stock', 2)]);                          // couverture insuffisante (2 sur 3)
  M.ent('s4'); M.sub('s4', 'active', [PRO(3), ...TOUS]);                                                          // les quatre options
  M.ent('s5', { formule: 'business' }); M.sub('s5', 'active', [BUS(2)]);                                          // Business : tout, sans options
  M.ent('s6', { formule: 'business' }); M.sub('s6', 'active', [BUS(2)]); M.sub('s6', 'active', [OPL('stock', 2)]);  // Business + une option payée par erreur
  M.ent('s7'); M.ent('s8', { email: mail('s7') });                                                                  // adresse PARTAGÉE : l'option n'est pas sûrement à elle
  M.sub('s7', 'active', [PRO(1)], { nonGrave: true }); M.sub('s7', 'active', [OPL('stock', 1)], { nonGrave: true });
  M.ent('s9'); M.sub('s9', 'active', [PRO(3)]); M.sub('s9', 'active', [OPL('stock', 3)]); M.sub('s9', 'active', [OPL('achats', 3)]);   // Stock + Achats
  M.ent('t1', { quantite: 1 });                                                                                     // réglée à la main dans la Tour (rien chez Stripe)
  /* le paiement : chacune son entreprise, son compte confirmé */
  M.ent('c1');                                                                                                      // aucun abonnement : elle achète Pro + options ensemble
  M.ent('c6e'); M.sub('c6e', 'active', [PRO(3)]);                                                                   // Pro × 3 au mois
  M.ent('c6m'); M.sub('c6m', 'active', [[P.pro[1], 3]]);                                                            // Pro × 3 à l'année
  M.ent('c6h'); M.sub('c6h', 'active', [PRO(3)]); M.sub('c6h', 'active', [OPL('stock', 1)]);                        // Stock payé pour UNE place sur trois
  M.ent('c6g'); M.sub('c6g', 'active', [PRO(3)]); M.sub('c6g', 'active', [OPL('stock', 3)]);                        // Stock déjà servi
  M.ent('c6d', { formule: 'business' }); M.sub('c6d', 'active', [BUS(2)]);                                          // Business
  const S1 = await demarrer(M, { fichier: copie(tablePleine) });
  vrai('le vrai serveur démarre, isolé (tarifs d\'option posés sur une copie, Stripe simulé relu à chaque appel)', S1.vivant);
  if (!S1.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const PATRON = await S1.patron();
  vrai('(population) la Tour se connecte (jeton du patron)', !!PATRON);

  /* ══ 1. L'APPLICATION CONTRE LE SERVEUR : ce que le serveur sert, ce que l'application OUVRE ══════════════════════════════ */
  console.log('\n1. les VRAIES fonctions d\'app.html (forfaitServeurSync, planBloque) contre le VRAI serveur');
  const instantane = a => JSON.stringify(a.db());
  const joue = async (id, S) => { const a = appareil(id, S || S1); const avant = instantane(a); await a.sync(); return { a, avant }; };
  {
    const { a, avant } = await joue('s1');
    v('⛔⛔ Pro × 3 + Stock × 3 payés : le serveur sert `options: [stock]`, l\'application les range', [a.opts()], [['stock']]);
    v('   et ouvre EXACTEMENT les rubriques du Stock (produits, stock, boxes, mouvements…) — rien d\'Achats, de Compta, de Registre', ouvert(a), attendu(['stock']));
    vrai('⛔ …`comptabilite`, `bons` et `registre` restent FERMÉES', a.planBloque('comptabilite') && a.planBloque('bons') && a.planBloque('registre'));
    vrai('⛔ une option ne se range JAMAIS dans `db` : rien n\'est écrit (aucun `save`), `db` est identique octet pour octet', a.vu.saves === 0 && instantane(a) === avant, a.vu.saves);
    vrai('   la formule reste celle de l\'entreprise : Pro', a.forfait() === 'pro' && a.accesSuspendu() === false);
    /* le rangement de l'appareil : la copie vit sous la clé de l'espace, jamais dans la base */
    const cle = [...a.LS.keys()].find(k => /_opts$/.test(k));
    vrai('   la copie de l\'appareil est rangée à part (`…_opts`), avec l\'identifiant de l\'entreprise', !!cle && /stock/.test(a.LS.get(cle)) && a.LS.get(cle).includes(M.ENT.s1.t));
  }
  {
    const { a } = await joue('s2');
    v('⛔⛔ l\'option est IMPAYÉE (le Pro paie) : le serveur sert `options: []` — l\'application ne rouvre RIEN', [a.opts(), ouvert(a)], [[], []]);
    vrai('   et l\'entreprise n\'est pas suspendue pour autant (le Pro est payé)', a.accesSuspendu() === false && a.forfait() === 'pro');
  }
  {
    const { a } = await joue('s3');
    v('⛔ couverture STRICTE : Stock payé pour deux places sur trois — rien d\'ouvert (on ne perd pas d\'argent)', [a.opts(), ouvert(a)], [[], []]);
  }
  {
    const { a } = await joue('s4');
    v('⛔ les quatre options payées : toutes les rubriques s\'ouvrent', [a.opts(), ouvert(a)], [['achats', 'compta', 'sanitaire', 'stock'], attendu(['stock', 'achats', 'compta', 'sanitaire'])]);
  }
  {
    const { a } = await joue('s9');
    v('⛔ Stock + Achats : les rubriques des DEUX s\'ouvrent, Compta et Registre restent fermées', [ouvert(a), a.planBloque('comptabilite'), a.planBloque('registre')], [attendu(['stock', 'achats']), true, true]);
  }
  {
    const a5 = (await joue('s5')).a, a6 = (await joue('s6')).a;
    v('⛔⛔ Business : tout est ouvert SANS options (`options: []` — l\'application n\'en déduit aucun verrouillage)', [a5.opts(), ouvert(a5)], [[], attendu(CLES)]);
    v('   Business + une option payée par erreur : rien ne change', [a6.opts(), ouvert(a6)], [[], attendu(CLES)]);
  }
  {
    const { a } = await joue('s7');
    v('⛔⛔ une option payée à une ADRESSE PARTAGÉE (pas sûrement à l\'entreprise) : fermée — l\'option d\'une voisine n\'ouvre rien', [a.opts(), ouvert(a)], [[], []]);
  }
  {
    /* une entreprise dont le serveur ne répond pas : l'appareil GARDE ce qu'il savait — première lecture réussie, puis Stripe muet */
    const a = appareil('s1', S1); await a.sync();
    const muet = await demarrer(M, { fichier: copie(tablePleine), muet: true });
    const rep = await muet.etat('s1');
    vrai('(population) un serveur au Stripe MUET ne répond ni `options` ni verdict : `verificationImpossible`', !('options' in rep) && (rep.verificationImpossible === true), JSON.stringify(rep));
    a.setApi(muet.B); await a.sync();
    v('⛔⛔ Stripe muet : l\'appareil GARDE ce qu\'il savait (Stock servi) — un doute n\'ôte rien, ne donne rien', [a.opts(), ouvert(a)], [['stock'], attendu(['stock'])]);
    const neuf = appareil('s1', muet); await neuf.sync();
    v('⛔ … et un appareil qui n\'a JAMAIS rien lu n\'invente rien : tout fermé, aucune option', [neuf.opts() || [], ouvert(neuf)], [[], []]);
    await muet.arreter();
  }
  /* ══ 2. LA TOUR RÈGLE UNE OPTION À LA MAIN, L'APPLICATION L'OUVRE ═════════════════════════════════════════════════════════ */
  console.log('\n2. la Tour (vraies fonctions, vrai réseau) règle une option à la main → l\'application l\'ouvre');
  {
    const A0 = await joue('t1');
    vrai('(témoin) avant : rien n\'est payé — l\'entreprise est suspendue, aucune option', A0.a.accesSuspendu() === true && ouvert(A0.a).length === TOUTES.length - attendu([]).length + 0 && A0.a.opts() === undefined || A0.a.accesSuspendu() === true);
    const T = tour(S1, PATRON);
    T.ctx.tourPackPrefill('t1'); await T.attendre(() => T.etat().charge);
    vrai('la Tour LIT la fiche (vraie `tourPackPrefill`) : le bloc d\'options s\'ouvre', T.E['abo-opts'].hidden === false, JSON.stringify(T.etat()).slice(0, 200));
    T.E['abo-f'].value = 'pro'; T.E['abo-q'].value = '1'; T.E['abo-st'].value = 'actif'; T.regle('abo-st', 'actif');
    T.coche('compta', true);
    const n0 = T.toasts.length; T.ctx.tourAboEnregistrer('t1', null); await T.attendre(() => T.toasts.length > n0); await dormir(50);
    vrai('« Enregistrer » est reçu : le toast dit « Abonnement enregistré… + Compta »', T.toasts.some(x => /Abonnement enregistré : pro(?: ×1)? \+ Compta · actif/.test(x)), T.toasts.join(' | '));
    const e1 = await S1.etat('t1');
    v('⛔ le serveur sert maintenant : payée Pro, `options: [compta]`', [e1.paye, e1.formule, e1.options], [true, 'pro', ['compta']]);
    const { a } = await joue('t1');
    v('⛔⛔ l\'application OUVRE la rubrique cochée dans la Tour (Compta : comptabilité, télécollecte, enveloppes) — et seulement elle', [a.opts(), ouvert(a)], [['compta'], attendu(['compta'])]);
    /* on décoche, on enregistre : l'application referme */
    T.coche('compta', false); T.coche('stock', true);
    const n1 = T.toasts.length; T.ctx.tourAboEnregistrer('t1', null); await T.attendre(() => T.toasts.length > n1); await dormir(50);
    const { a: a2 } = await joue('t1');
    v('⛔ la Tour décoche Compta et coche Stock : l\'application suit (Stock ouvert, Compta refermée)', [a2.opts(), ouvert(a2)], [['stock'], attendu(['stock'])]);
    /* Business : la Tour n'envoie pas d'option, l'application a tout */
    T.regle('abo-f', 'business'); T.E['abo-q'].value = '1';
    const n2 = T.toasts.length; T.ctx.tourAboEnregistrer('t1', null); await T.attendre(() => T.toasts.length > n2); await dormir(50);
    const { a: a3 } = await joue('t1');
    v('⛔ la Tour passe l\'entreprise à Business : `options: []` (les cases n\'étaient plus envoyées), tout est ouvert', [a3.opts(), ouvert(a3)], [[], attendu(CLES)]);
  }

  /* ══ 3. LA PAGE DE PAIEMENT CONTRE LA VRAIE ROUTE : ce que la page demande est ce que Stripe reçoit ═══════════════════════ */
  console.log('\n3. la vraie page de paiement contre la vraie route /api/stripe/checkout — les lignes que Stripe reçoit');
  const dernier = () => { const s = S1.sessions(); return s[s.length - 1]; };
  const nSess = () => S1.sessions().length;
  const attendrePage = async p => { await p.api.compteLu; };
  let capture = null;   // les lignes du paiement d'ajout de c6e, rejouées plus bas par un serveur « après paiement »
  {
    /* ── mode normal : une entreprise SANS Pro payé achète son Pro et ses options ensemble ── */
    const p = page('?formule=pro&options=stock,compta&utilisateurs=2', 'c1', S1); await attendrePage(p);
    v('(population) la page lit ses deux options et les affiche cochées', p.api.optionsActives(), ['stock', 'compta']);
    const n = nSess(); await p.payer();
    v('⛔⛔ mode normal : le corps part avec price, quantity, ref, options — et Stripe reçoit Pro × 2, Stock × 2, Compta × 2 AU MOIS (tarifs du serveur)',
      [p.envoye.length, Object.keys(p.envoye[0]).sort(), nSess() - n, ligN(dernier())], [1, ['options', 'price', 'quantity', 'ref'], 1, ['pro:M×2', 'stock:M×2', 'compta:M×2']]);
    v('   la gravure : la session ET l\'abonnement portent l\'identifiant de l\'entreprise', [dernier().get('client_reference_id'), dernier().get('subscription_data[metadata][espace]')], [M.ENT.c1.t, M.ENT.c1.t]);
    vrai('   et la page s\'ouvre sur la page de paiement de Stripe', /^https:\/\/checkout\.stripe\.com\//.test(p.window.location.href), p.window.location.href);
    const pa = page('?formule=pro&options=stock,compta&utilisateurs=2&cycle=annuel', 'c1', S1); await attendrePage(pa);
    await pa.payer();
    v('⛔ à l\'ANNÉE : Pro, Stock et Compta au tarif annuel, même quantité', ligN(dernier()), ['pro:A×2', 'stock:A×2', 'compta:A×2']);
    const pb = page('?formule=business&options=stock&utilisateurs=1', 'c6d', S1); await attendrePage(pb);
    await pb.payer();
    v('⛔ Business : aucune option ne part (la page ne les envoie pas), Stripe reçoit Business seul', [pb.envoye[0].options, ligN(dernier())], [[], ['business:M×1']]);
  }
  {
    /* ── LE DOUBLE PRÉLÈVEMENT : un Pro déjà payé + le lien « Ajouter » de l'application ── */
    const lien = '?formule=pro&options=stock&utilisateurs=2';   // la page NORMALE (un lien du site, un ancien lien) — le serveur refuse, la page bascule
    const p = page(lien, 'c6e', S1); await attendrePage(p);
    const n = nSess(); await p.payer();
    v('⛔⛔ Pro déjà payé + page NORMALE + une option : le serveur refuse `utiliser_ajout` (409), RIEN n\'est créé chez Stripe', [p.reponses[0].s, p.reponses[0].j.error, nSess() - n], [409, 'utiliser_ajout', 0]);
    vrai('   la page BASCULE en mode ajout, avec le même panier, et le dit', p.api.modeAjout() === true && /ajoute, pour chaque utilisateur, au lieu d'un second abonnement Pro/.test(p.api.etat().compteMsg.texte) && p.urls[p.urls.length - 1] === '?formule=pro&ajout=options&options=stock', p.urls.join(' '));
    await p.payer();
    v('⛔⛔ le second clic envoie le corps de l\'AJOUT : des clés et la référence, ni price ni quantity', [Object.keys(p.envoye[1]).sort(), p.envoye[1].options], [['options', 'ref'], ['stock']]);
    v('⛔⛔ et Stripe ne reçoit QUE la ligne d\'option — Stock × 3 (les places du Pro payé, lues par le serveur), au mois, gravée à l\'entreprise : pas un second Pro',
      [nSess() - n, ligN(dernier()), dernier().get('subscription_data[metadata][espace]'), dernier().get('client_reference_id')], [1, ['stock:M×3'], M.ENT.c6e.t, M.ENT.c6e.t]);
    capture = lignesDe(dernier()).map(([px, q]) => [px, +q]);
  }
  {
    /* ── le lien de l'application, directement : le mode ajout est LE mode du lien (`ajout=options`) ── */
    const p = page('?formule=pro&ajout=options&options=stock,sanitaire', 'c6m', S1); await attendrePage(p);
    const n = nSess(); await p.payer();
    v('⛔ Pro payé À L\'ANNÉE : les deux options arrivent à l\'année (le cycle est celui du Pro payé, pas du corps — la page n\'en envoie pas)', [Object.keys(p.envoye[0]).sort(), nSess() - n, ligN(dernier())], [['options', 'ref'], 1, ['stock:A×3', 'sanitaire:A×3']]);
    const ph = page('?formule=pro&ajout=options&options=stock', 'c6h', S1); await attendrePage(ph);
    await ph.payer();
    v('⛔ Stock payé pour UNE place sur trois : on ne fait payer que ce qui MANQUE (2 places), jamais de nouveau les trois', ligN(dernier()), ['stock:M×2']);
    const pg = page('?formule=pro&ajout=options&options=stock', 'c6g', S1); await attendrePage(pg);
    const n2 = nSess(); await pg.payer();
    v('⛔ une option DÉJÀ servie : 409 `option_deja`, la page le dit (« déjà active »), rien chez Stripe', [pg.reponses[0].s, pg.reponses[0].j.error, /déjà active/.test(pg.api.etat().compteMsg.texte), nSess() - n2], [409, 'option_deja', true, 0]);
    const pd = page('?formule=pro&ajout=options&options=stock', 'c6d', S1); await attendrePage(pd);
    const n3 = nSess(); await pd.payer();
    v('⛔ une entreprise BUSINESS (pas de Pro) : 409 `formule_requise` — la page revient à la page normale, même panier', [pd.reponses[0].s, pd.reponses[0].j.error, pd.api.modeAjout(), n3 === nSess()], [409, 'formule_requise', false, true]);
    const pe = page('?formule=pro&ajout=options&options=stock', 'c6e', S1, { sansEspace: true }); await attendrePage(pe);
    const n4 = nSess(); await pe.payer();
    v('⛔ sans entreprise sur l\'appareil : la page ne PART PAS (la référence est obligatoire), elle dit pourquoi', [pe.envoye.length, nSess() - n4, /il faut l'entreprise concernée/.test(pe.api.etat().compteMsg.texte)], [0, 0, true]);
  }

  /* ══ 4. LA BOUCLE ENTIÈRE : ce que la page a fait payer est ce que l'application ouvre ════════════════════════════════════ */
  console.log('\n4. la boucle entière — la page paie, Stripe porte la ligne, le serveur la sert, l\'application l\'ouvre');
  {
    const M3 = monde();
    M3.ent('c6e'); M3.sub('c6e', 'active', [PRO(3)]);
    M3.sub('c6e', 'active', capture);   // l'abonnement que Stripe porte APRÈS le paiement : EXACTEMENT les lignes que la page a fait demander
    const S3 = await demarrer(M3, { fichier: copie(tablePleine) });
    const e = await S3.etat('c6e');
    v('⛔ le serveur, avec les lignes que le paiement a fait créer, sert : Pro × 3, options [stock] (la couverture est complète)', [e.paye, e.formule, e.places, e.options], [true, 'pro', 3, ['stock']]);
    const a = appareil('c6e', S3); await a.sync();
    v('⛔⛔ l\'application OUVRE le Stock après ce paiement — la couture entière tient (page → route → Stripe → serveur → application)', [a.opts(), ouvert(a)], [['stock'], attendu(['stock'])]);
    /* contre-épreuve : si la page avait fait payer UNE place (un second Pro, une option pour un seul), le Stock resterait FERMÉ */
    const M4 = monde();
    M4.ent('c6e'); M4.sub('c6e', 'active', [PRO(3)]); M4.sub('c6e', 'active', [PRO(1)]); M4.sub('c6e', 'active', [OPL('stock', 1)]);
    const S4 = await demarrer(M4, { fichier: copie(tablePleine) });
    const e4 = await S4.etat('c6e');
    v('(contre-épreuve) le défaut qu\'on corrige : un SECOND Pro × 1 + Stock × 1 sert 4 places et une option qui n\'en couvre qu\'une — rien d\'ouvert', [e4.places, e4.options], [4, []]);
    await S3.arreter(); await S4.arreter();
  }

  await S1.arreter();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
