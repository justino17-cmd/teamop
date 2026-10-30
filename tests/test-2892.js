/* ⛔ CE QUE CE FICHIER GARDE — LE MÉTIER ET LES RUBRIQUES, DE LA DEMANDE DU CLIENT JUSQU'À L'APPLICATION (23 octobre 2026).

   Justin : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; ils cochent les catégories ; et quand ils
   cochent, ça explique la catégorie » — puis, dans la Tour : la demande arrive PRÉ-COCHÉE avec le choix du client (sinon le conseil du
   métier), Justin ajuste, l'acceptation pose les rubriques retenues. Les deux moitiés ont chacune leurs bancs (`test-2891` : le serveur ;
   `test-848`, `test-2871` : une pièce) ; ici on tient la COUTURE ENTIÈRE, par les VRAIES fonctions de chaque page contre le VRAI serveur :

     1. le portail (`espace.html`) : le client choisit « chauffage » ; la grille se pré-coche selon le référentiel que le serveur sert ; il
        décoche « Stock » ; la demande part — relayée au serveur AVANT d'être écrite — avec son métier et ses rubriques ; sans métier elle ne
        part pas ; un métier fermé (page périmée) est refusé PAR LE SERVEUR et l'écran le dit, rien n'est écrit ; une panne du relais
        n'empêche pas d'écrire la demande ;
     2. la Tour (`tour.html`) : le référentiel se charge ; la grille de la demande arrive pré-cochée avec ce choix (20 rubriques, pas « Stock »),
        chaque case avec son explication et, pour le métier, sa raison ; sans choix du client, le conseil du métier ; un geste (cocher) se garde
        d'un rendu à l'autre ; la fiche montre aussi les explications ;
     3. l'acceptation (`demAccepter` → `tourAccepterDemande`) pose métier ET rubriques par les vraies routes, et `/api/espaces/etat` les rend à
        l'application ; tout coché = rien de restreint ; un refus du serveur se DIT dans le panneau.
   Rien ne sort d'ici : 127.0.0.1, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const PORT_SRC = lire('ESPACE_FICHIER', 'espace.html'), TOUR = lire('TOUR_FICHIER', 'tour.html');
const SRV = fs.readFileSync(SERVEUR, 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2892-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* le code sans ses commentaires (ceux qui COMMENCENT une ligne) — une fonction se cherche dans le code, jamais dans une phrase */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const PORTN = nu(PORT_SRC), TOURN = nu(TOUR), SRVN = nu(SRV);
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, gabarits, commentaires et expressions régulières sautés) */
function fonction(src, nom) {
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
const ligne = (src, re) => (re.exec(src) || [''])[0];

console.log('\n── 2892 · le métier et les rubriques, du portail à l\'application ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const OPRUB = require(path.join(RACINE, 'rubriques-choix.js'));
  const CATS_OK = evalue(litteral(SRVN, 'const CATS_OK = ['));
  /* Le vrai `metiers.json` ouvre les vingt-trois métiers depuis le 23 octobre 2026 : le serveur de ce banc lit un référentiel FABRIQUÉ où
     les dix nouveaux restent fermés (tests/metiers-banc.js) — c'est ce qui fait de « un métier fermé, page périmée » une vraie épreuve. */
  const REFB = require('./metiers-banc.js').ecrire(RACINE, banc);
  const PREM = path.join(banc, 'metiers-fermes.js'); fs.writeFileSync(PREM, require('./metiers-banc.js').preload(RACINE, REFB.chemin));
  const METIERS = REFB.json;
  const CONSEIL = k => CATS_OK.filter(c => METIERS.metiers[k].rubriques.includes(c));

  /* ══ LE MONDE : deux entreprises (qui paient), un compte du site vérifié, un patron ══ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const code = (t, nom) => Buffer.from(JSON.stringify({ t, k: 'k-' + t + '-' + 'x'.repeat(24), a: 'paul', n: nom }), 'utf8').toString('base64').replace(/=+$/, '');
  const paye = { formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 };
  const T_DN = 't-deuxnoms-2892', T_CH = 't-chauffe-2892', T_PL = 't-plomb-2892', T_TO = 't-tout-2892', T_RE = 't-refus-2892', T_RS = 't-restreint-2892', T_LI = 't-libre-2892';
  const esp = (t, nom) => Object.assign({ t, nom, email: cle(nom) + '@exemple-2892.fr', ts: MAINT - 1000, code: code(t, nom) }, paye);
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ [cle('chauffe-banc')]: esp(T_CH, 'chauffe-banc'), [cle('plomb-banc')]: esp(T_PL, 'plomb-banc'),
    [cle('tout-banc')]: esp(T_TO, 'tout-banc'), [cle('refus-banc')]: esp(T_RE, 'refus-banc'),
    /* deux entreprises DÉJÀ OUVERTES, à l'adresse de leur demande : l'une a restreint ses rubriques (trois), l'autre travaille avec tout (ELAN) */
    [cle('restreint-banc')]: Object.assign(esp(T_RS, 'restreint-banc'), { email: 'restreint@exemple-2892.fr', cats: ['factures', 'devis', 'clients'], catsPar: 'Banc', catsTs: MAINT - 500 }),
    [cle('libre-banc')]: Object.assign(esp(T_LI, 'libre-banc'), { email: 'libre@exemple-2892.fr' }),
    /* une entreprise à DEUX noms (même `t`) : l'ancien d'abord dans l'annuaire, le récent ensuite — l'application lit le plus récent (`espaceParT`) */
    [cle('deux-ancien')]: Object.assign(esp(T_DN, 'deux-ancien'), { ts: MAINT - 5000, metier: 'nettoyage' }),
    [cle('deux-recent')]: Object.assign(esp(T_DN, 'deux-recent'), { ts: MAINT - 1000, metier: 'plomberie' }) }));
  const MAIL = 'chantal@exemple-2892.fr', MAIL2 = 'paul@exemple-2892.fr';
  const brut = crypto.randomBytes(32).toString('hex'), brut2 = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [MAIL]: { v: true, pr: 'Chantal', no: 'Chaud', so: 'Chauffe Banc' }, [MAIL2]: { v: true, pr: 'Paul', no: 'Plomb', so: 'Plomb Banc' } },
    j: { [sha(brut)]: { m: MAIL, g: 'session', exp: MAINT + 86400000 }, [sha(brut2)]: { m: MAIL2, g: 'session', exp: MAINT + 86400000 } } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-2892'), comptes: { actif: true } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-2892'), role: 'patron', actif: true, ts: MAINT }] }));
  const PORT = 9500 + (process.pid % 90), B = 'http://127.0.0.1:' + PORT;
  let journal = '', ipN = 0;
  enfant = spawn(process.execPath, ['--require', PREM, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant, journal.slice(0, 800));
  if (!vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
      headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.' + (++ipN % 250) + '.' + (process.pid % 250) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-2892' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);
  const ficheClient = async email => { await dormir(500); return ((await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []).find(c => c.email === email); };
  const etat = async t => (await appel('/api/espaces/etat', { t })).j;
  const REF = (await appel('/api/metiers')).j;
  vrai('(population) le référentiel servi par le vrai serveur est là (13 métiers ouverts, 38 rubriques)', REF.ok === true && REF.ouverts.length === 13 && Object.keys(REF.rubriques).length === 38, JSON.stringify(REF).slice(0, 150));

  try {
    /* ══ 1. LE PORTAIL — les vraies fonctions d'espace.html ══ */
    console.log('\n1. Le portail (les vraies fonctions d\'espace.html) : le client choisit son métier, la grille se pré-coche, il décoche « Stock », la demande part');
    const NOMS_P = ['lienSlug', 'sendRequest', 'planNom', 'cliResume', 'cliSigne', 'ratEtat', 'ratMetiers', 'ratOptions', 'ratInit', 'ratRefCharger', 'ratZone', 'ratRepeindre', 'ratMonter', 'ratMetierChange', 'ratManque', 'ratChoix', 'cliRelayerDemande'];
    const FN_P = NOMS_P.map(n => fonction(PORTN, n));
    const L_METIER = ligne(PORTN, /^[ \t]*const METIER_L=\{[^\n]*\};$/m), L_REFUS = ligne(PORTN, /^[ \t]*const RAT_REFUS=\{[^\n]*\};$/m), L_SYNC = ligne(PORTN, /^[ \t]*const CLI_SYNC_URL=[^\n]*;$/m);
    vrai('(population) les dix-sept fonctions du portail, la liste des métiers, les refus et l\'adresse du relais sont trouvés dans son code', FN_P.every(Boolean) && !!L_METIER && !!L_REFUS && !!L_SYNC, NOMS_P.filter((n, i) => !FN_P[i]).join(', ') + [L_METIER, L_REFUS, L_SYNC].map(x => x ? '' : ' (une ligne manque)').join(''));
    const FORM = { 'r-app': 'OP GESTION', 'r-company': 'Chauffe Banc', 'r-besoin': 'Entretien annuel des chaudières', 'r-users': '3', 'r-code': '', 'r-formule': 'Pro',
      'r-prenom': 'Chantal', 'r-nom': 'Chaud', 'r-tel': '06 12 34 56 78', 'r-lien': 'chauffe-banc' };
    /* un navigateur de banc : des éléments par identifiant, dont la zone des rubriques qui se réécrit — la grille n'existe que si la zone la porte */
    const portail = (o) => {
      o = o || {};
      const el = {}, ecrits = [], fil = [], vues = [], relais = [];
      const faire = (id, extra) => (el[id] = Object.assign({ id, value: '', innerHTML: '', _h: {}, scrollIntoView() {}, addEventListener(t, f) { (this._h[t] = this._h[t] || []).push(f); }, removeEventListener() {} }, extra || {}));
      for (const [id, val] of Object.entries(Object.assign({}, FORM, o.form || {}))) faire(id, { value: val });
      faire('req-msg'); faire('r-metier', { value: (o.form && o.form['r-metier']) || '' }); faire('r-rub'); faire('r-rub-grille');
      const docRef = (nom, id) => ({ set: async (x) => { ecrits.push({ nom, id, o: JSON.parse(JSON.stringify(x)) }); }, collection: () => ({ add: async (m) => { fil.push(m); } }) });
      const ctx = { window: { _demCode: null, _demEdit: null, _demConfirm: false, fetch: true }, JSON, Object, Array, String, Date, Math, parseInt, Promise, setTimeout, console,
        /* la zone des rubriques ne rend la grille que si sa dernière écriture la porte (comme un vrai document) */
        $: id => (id === 'r-rub-grille' ? (/id="r-rub-grille"/.test(el['r-rub'].innerHTML) ? el['r-rub-grille'] : null) : (el[id] || null)),
        document: { getElementById: id => el[id] || null },
        fetch: async (u, opts) => { if (/\/espaces\/libre/.test(u)) return { ok: true, status: 200, json: async () => ({ libre: true }) };
          if (/clients\/sync/.test(u)) { relais.push(JSON.parse(opts.body)); if (o.relaisPanne) throw new Error('réseau coupé'); }
          return fetch(String(u).replace('https://api.teamop.fr', B), opts); },
        fs: { collection: nom => ({ doc: id => docRef(nom, id) }) }, FV: { serverTimestamp: () => 'TS' },
        auth: { currentUser: { email: MAIL, getIdToken: async () => brut } }, openView: x => vues.push(x), verifCodeDemande: async () => null,
        clientApps: () => [], APPS: {}, promoInfo: () => null, OpRub: OPRUB, sessionStorage: { getItem: () => null, setItem() {} }, API_PORTAIL: B };
      vm.createContext(ctx);
      vm.runInContext('var _meDoc={}; const esc=s=>String(s==null?"":s); const API_PORTAIL=' + JSON.stringify(B) + ';\n' + L_METIER + '\n' + L_REFUS + '\n' + L_SYNC + '\n'
        + FN_P.join('\n') + '\n' + NOMS_P.map(n => 'this.' + n + '=' + n + ';').join(''), ctx);
      return { ctx, el, ecrits, fil, vues, relais };
    };
    const compter = h => ({ cases: (h.match(/type="checkbox"/g) || []).length, cochees: (h.match(/ checked/g) || []).length, expl: (h.match(/class="rub-expl"/g) || []).length });
    const nouveau = portail();
    await nouveau.ctx.ratRefCharger();
    nouveau.ctx.ratInit(null);
    nouveau.ctx.ratRepeindre();
    const optsListe = [...nouveau.el['r-metier'].innerHTML.matchAll(/<option value="([a-z0-9]*)"/g)].map(m => m[1]);
    v('le référentiel est lu du vrai serveur, et la liste des métiers n\'offre que les métiers OUVERTS (le premier choix est vide)', optsListe, [''].concat(REF.ouverts));
    vrai('   avant tout choix de métier, la zone des rubriques DIT d\'en choisir un (elle ne reste pas vide)', /Choisissez votre métier/.test(nouveau.el['r-rub'].innerHTML), nouveau.el['r-rub'].innerHTML);

    /* sans métier, la demande ne part pas */
    await nouveau.ctx.sendRequest('u-chantal');
    vrai('⛔ sans métier, la demande ne part pas — l\'écran dit ce qui manque, rien n\'est écrit, rien n\'est relayé', nouveau.ecrits.length === 0 && nouveau.relais.length === 0 && /il manque[^<]*<b>[^<]*métier/.test(nouveau.el['req-msg'].innerHTML), nouveau.el['req-msg'].innerHTML);

    /* le client choisit « chauffage » : la grille se pré-coche selon le conseil que le SERVEUR sert */
    nouveau.el['r-metier'].value = 'chauffage'; nouveau.ctx.ratMetierChange();
    v('⛔ … et « il manque : métier » disparaît dès que le métier est choisi (il ne manquait que lui)', nouveau.el['req-msg'].innerHTML, '');
    { const deux = portail({ form: { 'r-tel': '' } }); await deux.ctx.ratRefCharger(); deux.ctx.ratInit(null); await deux.ctx.sendRequest('u-chantal');
      const avant = deux.el['req-msg'].innerHTML; deux.el['r-metier'].value = 'plomberie'; deux.ctx.ratMetierChange(); const apres = deux.el['req-msg'].innerHTML;
      vrai('   … sans effacer ce qui manque encore (téléphone et métier manquaient : le téléphone reste, le métier part)', /<b>[^<]*téléphone[^<]*métier/.test(avant) && /il manque : <b>téléphone<\/b>/.test(apres) && !/métier/.test(apres), { avant, apres }); }
    const g1 = nouveau.el['r-rub-grille'].innerHTML;
    /* 30 octobre 2026 : la BASE (CATS_BASE) est cochée d'office et NON décochable — montrée à part comme incluse, sans case. Les comptes de cases et de cochées la retirent. */
    const BASE = REF.base || [], NBASE = BASE.length;
    vrai('(population) le référentiel sert la base (8 rubriques) à l\'espace client — l\'écran dit ce que le serveur range', NBASE === 8, REF.base);
    const avecBase = l => CATS_OK.filter(k => l.includes(k) || BASE.includes(k));
    const VIS = k => CATS_OK.filter(c => !(REF.rubriques[c].seulement && !REF.rubriques[c].seulement.includes(k)) || METIERS.metiers[k].rubriques.includes(c) || (METIERS.metiers[k].proposees || {})[c]);
    v('⛔ « chauffage » choisi : la grille compte 32 rubriques (les six de la 3D n\'y sont pas : l\'application les masque), celles du conseil cochées, chacune avec son explication (+ les 4 incluses)',
      compter(g1), { cases: VIS('chauffage').length - NBASE, cochees: CONSEIL('chauffage').length - NBASE, expl: VIS('chauffage').length + 4 });
    v('   (population) elle masque bien six rubriques à ce métier — et la 3D les montre toutes', [38 - VIS('chauffage').length, VIS('3d').length], [6, 38]);
    v('   les cases cochées sont EXACTEMENT celles du référentiel pour le chauffage', OPRUB.liste(nouveau.ctx.window._rat.rub), CONSEIL('chauffage'));
    vrai('   chaque rubrique conseillée porte la raison propre au métier (« Pour votre métier »)', (g1.match(/class="rub-raison"/g) || []).length === CONSEIL('chauffage').length - NBASE, (g1.match(/class="rub-raison"/g) || []).length);
    vrai('   les quatre rubriques toujours présentes sont montrées comme INCLUSES, sans case à cocher',
      REF.toujours.every(t => g1.includes('>' + t.titre.replace(/&/g, '&amp;') + '<em class="rub-tag inclus">Incluse</em>')) && (g1.match(/rub-fixe/g) || []).length === 4 + NBASE);
    vrai('⛔ la base est montrée à part (« Incluses dans toutes les applications »), cochée, SANS case à cocher', g1.includes('Incluses dans toutes les applications') && BASE.every(k => g1.includes('data-rub-base="' + k + '"') && !g1.includes('data-rub="' + k + '"')));

    /* il décoche « Produits » */
    const bascule = (P, k) => P.el['r-rub-grille']._h.change[0]({ target: { getAttribute: a => (a === 'data-rub' ? k : null) } });
    bascule(nouveau, 'produits');
    v('⛔ il décoche « Produits » : la case est décochée, le compteur baisse', [OPRUB.liste(nouveau.ctx.window._rat.rub).includes('produits'), nouveau.el['r-rub-grille'].innerHTML.includes('id="r-produits" data-rub="produits" checked'), compter(nouveau.el['r-rub-grille'].innerHTML).cochees],
      [false, false, CONSEIL('chauffage').length - NBASE - 1]);
    bascule(nouveau, 'stock');
    vrai('⛔ « Stock » est de la base : toucher sa case ne la décoche pas', OPRUB.liste(nouveau.ctx.window._rat.rub).includes('stock'));
    /* « Tout cocher » puis « Revenir au conseil du métier » */
    nouveau.el['r-rub-grille']._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'tout' }) } });
    const toutes = compter(nouveau.el['r-rub-grille'].innerHTML).cochees;
    nouveau.el['r-rub-grille']._h.click[0]({ target: { closest: () => ({ getAttribute: () => 'conseil' }) } });
    v('   « Tout cocher » (38), puis « Revenir au conseil du métier » (le conseil, « Produits » inclus à nouveau)', [toutes, compter(nouveau.el['r-rub-grille'].innerHTML).cochees], [VIS('chauffage').length - NBASE, CONSEIL('chauffage').length - NBASE]);
    v('   « Tout cocher » ne coche que ce que la grille montre (jamais une rubrique de la 3D chez un chauffagiste)', OPRUB.liste(OPRUB.tout(OPRUB.etat(nouveau.ctx.window._rat.ref, 'chauffage'))), VIS('chauffage'));
    bascule(nouveau, 'produits');

    /* l'envoi : relayé au serveur AVANT d'être écrit */
    for (const [id, val] of Object.entries(FORM)) nouveau.el[id].value = val;
    nouveau.ctx.window._demEdit = null;
    await nouveau.ctx.sendRequest('u-chantal');
    const attendu = CONSEIL('chauffage').filter(k => k !== 'produits');
    const dem = ((nouveau.ecrits.find(e => e.nom === 'teamop_requests') || {}).o || {}).demandes || [];
    v('⛔ la demande part : écrite dans le dossier AVEC son métier et ses rubriques (« Produits » en moins, dans l\'ordre du menu)', dem.map(d => [d.metier, d.cats]), [['chauffage', attendu]]);
    v('   et relayée au serveur avant d\'être écrite (une fois, avec les mêmes rubriques)', nouveau.relais.map(r => r.demandes.map(d => [d.metier, d.cats])), [[['chauffage', attendu]]]);
    vrai('   le fil de la demande dit le nombre de rubriques', nouveau.fil.some(m => new RegExp(' · ' + attendu.length + ' rubriques').test(m.text || '')), JSON.stringify(nouveau.fil.map(m => m.text)));
    const fiche = await ficheClient(MAIL);
    v('⛔ la Tour (le vrai serveur) a la demande avec SON métier et SES rubriques', fiche && fiche.demandes.map(d => [d.metier, d.cats]), [['chauffage', attendu]]);

    /* un métier FERMÉ envoyé par une page périmée : le serveur REFUSE, l'écran le dit, rien n'est écrit */
    const perimee = portail({ form: { 'r-metier': 'incendie', 'r-company': 'Incendie Banc', 'r-lien': 'incendie-banc' } });
    perimee.ctx.window._rat = { ref: null, msg: '', metier: 'incendie', cats0: null, rub: null, enCours: true };   // une page qui n'a jamais lu le référentiel
    await perimee.ctx.sendRequest('u-chantal');
    vrai('⛔ un métier fermé, page périmée (aucun contrôle côté page) : le SERVEUR refuse, l\'écran DIT « pas encore ouvert », rien n\'est écrit',
      perimee.ecrits.length === 0 && perimee.relais.length === 1 && /Ce métier n’est pas encore ouvert/.test(perimee.el['req-msg'].innerHTML) && /Rien n'a été envoyé/.test(perimee.el['req-msg'].innerHTML), perimee.el['req-msg'].innerHTML);
    /* le même contrôle, côté page, quand elle a lu le référentiel */
    const avertie = portail({ form: { 'r-metier': 'incendie', 'r-lien': 'incendie-banc' } });
    await avertie.ctx.ratRefCharger();
    await avertie.ctx.sendRequest('u-chantal');
    vrai('   la page qui a lu le référentiel le refuse AVANT le serveur (rien n\'est relayé)', avertie.ecrits.length === 0 && avertie.relais.length === 0 && /pas encore ouvert/.test(avertie.el['req-msg'].innerHTML), avertie.el['req-msg'].innerHTML);
    /* des rubriques hors liste (page piratée) : refusées aussi */
    const piratee = portail({ form: { 'r-metier': 'chauffage', 'r-lien': 'pirate-banc' } });
    await piratee.ctx.ratRefCharger(); piratee.ctx.ratInit(null);
    piratee.ctx.window._rat.rub = { ref: Object.assign({}, piratee.ctx.window._rat.ref, { ordre: piratee.ctx.window._rat.ref.ordre.concat(['inventee']), rubriques: Object.assign({}, piratee.ctx.window._rat.ref.rubriques, { inventee: { titre: 'Inventée', groupe: 'Planification', explication: 'Une rubrique que le serveur ne connaît pas.' } }) }), metier: 'chauffage', choisies: { planning: true, inventee: true }, touche: true };
    await piratee.ctx.sendRequest('u-chantal');
    vrai('   des rubriques hors liste : le serveur refuse (`cats_inconnues`), l\'écran le dit, rien n\'est écrit', piratee.ecrits.length === 0 && /n’existe plus/.test(piratee.el['req-msg'].innerHTML), piratee.el['req-msg'].innerHTML);
    /* le relais en panne : la demande s'écrit quand même (comme avant) */
    const panne = portail({ relaisPanne: true, form: { 'r-metier': 'peinture', 'r-lien': 'panne-banc' } });
    await panne.ctx.ratRefCharger(); panne.ctx.ratInit(null); panne.ctx.ratMetierChange();
    await panne.ctx.sendRequest('u-chantal');
    vrai('⛔ le relais en panne (réseau coupé) ne bloque pas la demande : elle est écrite, le relais se refera à la prochaine visite', panne.ecrits.length === 1 && panne.relais.length === 1, JSON.stringify([panne.ecrits.length, panne.relais.length]));
    /* modifier une demande : la grille repart de SON choix */
    const edit = portail({ form: { 'r-metier': 'chauffage' } });
    await edit.ctx.ratRefCharger();
    edit.ctx.ratInit({ metier: 'chauffage', cats: ['devis', 'clients'] });
    edit.ctx.ratMonter();
    v('   modifier une demande : la grille repart de SON choix (pas du conseil), et chaque rubrique y reste expliquée', [OPRUB.liste(edit.ctx.window._rat.rub), compter(edit.el['r-rub-grille'].innerHTML).cochees], [avecBase(['devis', 'clients']), 1]);

    /* ══ 2. LA TOUR — la grille de la demande arrive pré-cochée ══ */
    console.log('\n2. La Tour (les vraies fonctions de tour.html) : la demande arrive avec le choix du client, chaque case expliquée');
    const NOMS_T = ['hAuth', 'apiGet', 'apiPost', 'srvRepond', 'srvMuet', 'msgErreur', 'refMetiersCharger', 'catExpl', 'catsExplicationsPeindre', 'demCatsDepart', 'catsChoixDe', 'demCatsCle', 'demCatsHtml', 'demCatsInfo', 'demCatBasculer',
      'demCatsTout', 'demCatsRevenir', 'sigleAdr', 'demAccepter', 'tourAccepterDemande', 'demPaiement', 'demEstGestion', 'metDemande', 'demEspace', 'catsEffet', 'catsPromesse'];
    const FN_T = NOMS_T.map(n => fonction(TOURN, n));
    const L_MET = ligne(TOURN, /^var MET_L=\{[^\n]*\};$/m), L_CATCLES = ligne(TOURN, /^var CAT_CLES=\[\]; CAT_L\.forEach[^\n]*$/m), CAT_L_SRC = litteral(TOURN, 'var CAT_L=[');
    vrai('(population) les 26 fonctions de la Tour, la liste des métiers, CAT_L et CAT_CLES sont trouvés dans son code', FN_T.every(Boolean) && !!L_MET && !!L_CATCLES && !!CAT_L_SRC, NOMS_T.filter((n, i) => !FN_T[i]).join(', '));
    const tour = (clients, plus) => {
      plus = plus || {};
      const toasts = [], panneaux = [], posts = [], el = {}, rend = [];
      const ctx = { fetch: async (u, o) => { if (o && o.method === 'POST') posts.push({ u: String(u), corps: JSON.parse(o.body) });
          if (plus.refuseCats && /espaces\/cats/.test(u)) return { ok: false, status: 400, json: async () => ({ error: 'catégorie inconnue : essai' }) };
          /* un SERVEUR D'AVANT le 24 octobre 2026 : il ignore `siVide` — un relais le retire avant de transmettre */
          if (plus.serveurAvant && /espaces\/metier/.test(u)) { const c = JSON.parse(o.body); delete c.siVide; o = Object.assign({}, o, { body: JSON.stringify(c) }); }
          return fetch(u, o); },
        JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console,
        document: { getElementById: id => el[id] || null, querySelectorAll: () => [] }, $: id => el[id] || null,
        toast: t => toasts.push(String(t)), tourPanneau: h => panneaux.push(String(h)), tourPackPrefill: () => {}, chargerClients: () => {}, chargerEspaces: () => {}, render: () => rend.push(1), setTab: () => {},
        prompt: () => 'paul', tourIdentDefaut: () => 'paul', tourMdpDefaut: () => 'Mdp-2892-provisoire', doLogout: () => {},
        tourEspaceDe: async (email, nom) => ({ nom: plus.espace || nom, slug: plus.espace || nom, annuaire: 1, mdp: '' }),
        espSlugJs: s => String(s), esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), jsq: s => String(s), ST: {}, ABN_F: {}, abnEcart: () => '',
        lgMessagePoser: () => {}, tourCopie: () => {}, tourMailAcces: () => {}, srvEtat: () => {}, INJOIGNABLE: 'injoignable', MYROLE: 'patron', TAB: 'demandes', API_X: 1 };
      vm.createContext(ctx);
      vm.runInContext('var API=' + JSON.stringify(B) + ', TOKEN=' + JSON.stringify(PATRON) + '; var ABO={abos:[]}; var DEM={vue:"atraiter",id:{},cats:{}}; var CATS_APPLIQUEES=false; var ENT={loaded:' + (plus.entNonLue ? 'false' : 'true') + ',liste:' + JSON.stringify(plus.ent || []) + '}; var REFM={d:null,err:"",enCours:false}; var CLI={list:' + JSON.stringify(clients) + ', sel:""}; var PACK={nom:"",charge:true,err:"",d:null}; var LG_MSG_MODELE="",LG_MAIL="",LG_ZONE="";\n'
        + 'var CAT_L=' + CAT_L_SRC + ';\n' + L_CATCLES + '\n' + L_MET + '\n' + FN_T.join('\n') + '\nthis.__DEM=function(){ return DEM; }; this.__REFM=function(){ return REFM; };', ctx);
      return { ctx, el, toasts, panneaux, posts, rend };
    };
    /* ce que la Tour lit du serveur : les clients, comme `chargerClients` */
    const cliChantal = await ficheClient(MAIL);
    const dChantal = cliChantal.demandes[0];
    const T0 = tour([cliChantal]);
    v('avant la lecture du référentiel : pas de pré-cochage inventé (« attente »), mais le choix du client, lui, se lit sans lui', [T0.ctx.demCatsDepart({ app: 'OP GESTION', metier: 'plomberie' }), T0.ctx.demCatsDepart(dChantal).source],
      [{ liste: null, source: 'attente' }, 'client']);
    await T0.ctx.refMetiersCharger();
    vrai('⛔ le référentiel se charge du vrai serveur par les vraies `apiGet` et `refMetiersCharger`', T0.ctx.__REFM().d && T0.ctx.__REFM().d.ok === true && T0.ctx.__REFM().d.ouverts.length === 13, JSON.stringify(T0.ctx.__REFM()).slice(0, 120));
    const dep = T0.ctx.demCatsDepart(dChantal);
    v('⛔ la demande arrive PRÉ-COCHÉE avec le choix du client (les 20 rubriques, pas « Produits »)', [dep.source, dep.liste], ['client', attendu]);
    const html = T0.ctx.demCatsHtml(cliChantal, 0, dChantal);
    const cle0 = T0.ctx.demCatsCle(MAIL, 0);
    v('   la grille de la demande : 38 cases, 20 cochées', [(html.match(/type="checkbox"/g) || []).length, (html.match(/ checked/g) || []).length], [38, attendu.length]);
    vrai('   « Produits » n\'est PAS cochée, « Devis » l\'est', !new RegExp('id="dc-' + cle0 + '-produits" checked').test(html) && new RegExp('id="dc-' + cle0 + '-devis" checked').test(html));
    vrai('   chaque case porte son EXPLICATION en petit (celle du référentiel, mot pour mot)', CATS_OK.every(k => html.includes('<small class="cat-expl">' + T0.ctx.esc(REF.rubriques[k].explication) + '</small>')));
    v('   et, pour chaque rubrique que le métier conseille (même décochée), la raison propre au métier (« Pour ce métier »)', (html.match(/class="cat-raison"><b>Pour ce métier/g) || []).length, CONSEIL('chauffage').length);
    vrai('   l\'info dit d\'où vient le pré-cochage et combien : « 20 rubriques sur 38 — pré-cochées avec le choix du client »', new RegExp('<b>' + attendu.length + ' rubriques sur 38</b> — pré-cochées avec le choix du client').test(html), html.slice(html.indexOf('dc-info'), html.indexOf('dc-info') + 260));
    vrai('   deux gestes : « Revenir au choix du client », « Tout cocher »', />Revenir au choix du client</.test(html) && />Tout cocher</.test(html));
    vrai('   sans choix du client, le geste dit « Revenir au conseil du métier » et nomme le métier', />Revenir au conseil du métier « Plomberie »</.test(T0.ctx.demCatsHtml({ email: MAIL2 }, 3, { app: 'OP GESTION', metier: 'plomberie' })));
    /* sans choix du client : le conseil du métier */
    const sansChoix = { email: MAIL2, demandes: [{ app: 'OP GESTION', metier: 'plomberie', cats: null, date: 5 }] };
    const dep2 = T0.ctx.demCatsDepart(sansChoix.demandes[0]);
    v('⛔ sans rubriques cochées par le client : le CONSEIL de son métier (plomberie), source « conseil »', [dep2.source, dep2.liste], ['conseil', CONSEIL('plomberie')]);
    v('   sans métier ni rubriques : rien (« aucun »), jamais un conseil inventé', T0.ctx.demCatsDepart({ app: 'OP GESTION' }), { liste: null, source: 'aucun' });
    v('   des rubriques inconnues dans la demande ne passent pas (filtrées sur les 38)', T0.ctx.demCatsDepart({ metier: 'plomberie', cats: ['devis', 'nimportequoi'] }).liste, ['devis']);
    /* l'état d'un geste se garde, en place */
    const cb = { checked: true, closest: () => ({ classList: { toggle() {} } }) };
    T0.el['dc-info-' + cle0] = { innerHTML: '' };
    T0.ctx.demCatBasculer(cle0, 'produits', cb);
    v('⛔ cocher « Produits » : l\'état de la demande le garde (dans l\'ordre du menu) et le compteur se met à jour EN PLACE', [T0.ctx.__DEM().cats[cle0].includes('produits'), T0.ctx.__DEM().cats[cle0].length, new RegExp((attendu.length + 1) + ' rubriques sur 38</b> — ajustées').test(T0.el['dc-info-' + cle0].innerHTML)], [true, attendu.length + 1, true]);
    const apres = T0.ctx.demCatsHtml(cliChantal, 0, dChantal);
    vrai('   un rendu complet de la Tour ne défait pas ce réglage (« Produits » reste cochée)', new RegExp('id="dc-' + cle0 + '-produits" checked').test(apres));
    const rendusAvant = T0.rend.length;
    T0.ctx.demCatsRevenir(cle0);
    v('   « Revenir au choix du client » : l\'état est effacé, la Tour se redessine', [T0.ctx.__DEM().cats[cle0], T0.rend.length - rendusAvant], [undefined, 1]);

    /* la fiche : les explications */
    const iPart = TOURN.indexOf('parts.cats=(function(){'), fPart = TOURN.indexOf('})();', iPart);
    const gab = (refCharge) => { const ctx = { CATS_APPLIQUEES: false, MYROLE: 'patron', CAT_L: evalue(CAT_L_SRC), nm: 'chauffe-banc', esc: T0.ctx.esc, jsq: s => String(s), parts: {}, catExpl: refCharge ? T0.ctx.catExpl : () => '' };
      vm.createContext(ctx); vm.runInContext(TOURN.slice(iPart, fPart + 5), ctx); return ctx.parts.cats; };
    const fi = gab(true);
    vrai('⛔ la fiche de l\'entreprise montre aussi l\'explication de chaque rubrique (référentiel lu), sous son titre', CATS_OK.every(k => fi.includes('data-expl="' + k + '">' + T0.ctx.esc(REF.rubriques[k].explication) + '</small>')) && (fi.match(/type="checkbox"/g) || []).length === 38);
    vrai('   référentiel pas encore lu : les cases sont là, l\'explication se complète en place à son arrivée (`data-expl`)', (gab(false).match(/data-expl="/g) || []).length === 38 && !/cat-expl" data-expl="stock">[^<]/.test(gab(false)));

    /* ══ 3. L'ACCEPTATION POSE MÉTIER ET RUBRIQUES — et l'application les reçoit ══ */
    console.log('\n3. L\'acceptation (demAccepter → tourAccepterDemande → le vrai serveur) pose le métier ET les rubriques retenues');
    /* a · le client a choisi (sans « Produits »), Justin ajoute « Produits » puis accepte */
    const Ta = tour([cliChantal], { espace: 'chauffe-banc' });
    await Ta.ctx.refMetiersCharger();
    Ta.ctx.demCatsHtml(cliChantal, 0, dChantal);
    const cleA = Ta.ctx.demCatsCle(MAIL, 0);
    Ta.ctx.demCatBasculer(cleA, 'produits', { checked: true, closest: () => null });
    Ta.el['dem-id-0-' + Ta.ctx.sigleAdr(MAIL)] = { value: 'paul' };
    await Ta.ctx.demAccepter(MAIL, 'chauffe-banc', 0, null);
    const choisiA = CATS_OK.filter(k => attendu.concat(['produits']).includes(k));
    const postCats = Ta.posts.filter(p => /espaces\/cats/.test(p.u));
    v('⛔ « Accepter » pose les rubriques que la grille montrait cochées (celles du client + « Produits » ajouté), par la route de la fiche', postCats.map(p => [p.corps.nom, p.corps.cats]), [['chauffe-banc', choisiA]]);
    v('   et le métier de la demande, dans le même mouvement', Ta.posts.filter(p => /espaces\/metier/.test(p.u)).map(p => p.corps.metier), ['chauffage']);
    const eA = await etat(T_CH);
    v('⛔ LA COUTURE ENTIÈRE : le vrai `/api/espaces/etat` rend à l\'application le métier ET les rubriques retenues', [eA.metier, eA.cats], ['chauffage', choisiA]);
    const pA = Ta.panneaux.join('\n');
    vrai('   le panneau d\'acceptation le DIT (« 21 rubriques sur 38 retenues », « ajustées par toi ») avec le chemin vers la fiche', new RegExp((attendu.length + 1) + ' rubriques sur 38 retenues').test(pA) && /ajustées par toi/.test(pA) && /tourCatsAller\('chauffe-banc'\)/.test(pA), pA.slice(0, 400));

    /* b · le client n'a rien coché : le conseil du métier se pose tout seul, sans toucher à la grille */
    const cliPaul = { email: MAIL2, entreprise: 'Plomb Banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '2', metier: 'plomberie', date: MAINT - 100 }] };
    const Tb = tour([cliPaul], { espace: 'plomb-banc' });
    await Tb.ctx.refMetiersCharger();
    await Tb.ctx.tourAccepterDemande(MAIL2, 'plomb-banc');
    const eB = await etat(T_PL);
    v('⛔ le client n\'a rien coché : l\'acceptation pose le CONSEIL de son métier (plomberie), et l\'application le reçoit', [eB.metier, eB.cats], ['plomberie', CONSEIL('plomberie')]);
    vrai('   le panneau dit « le conseil du métier »', /le conseil du métier/.test(Tb.panneaux.join('\n')), Tb.panneaux.join('\n').slice(0, 300));

    /* c · tout coché : rien de restreint (le champ est retiré) */
    const cliTout = { email: 'tout@exemple-2892.fr', entreprise: 'Tout Banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '1', metier: 'autre', cats: CATS_OK.slice(), date: MAINT - 50 }] };
    const Tc = tour([cliTout], { espace: 'tout-banc' });
    await Tc.ctx.refMetiersCharger();
    await Tc.ctx.tourAccepterDemande('tout@exemple-2892.fr', 'tout-banc');
    const eC = await etat(T_TO);
    v('   les 38 rubriques cochées : rien n\'est restreint (`cats` absent chez l\'application, pas un tableau de 38)', [eC.metier, eC.cats], ['autre', null]);

    /* d · référentiel illisible et rien de coché : on ne pose rien, on le DIT */
    const cliRien = { email: 'rien@exemple-2892.fr', entreprise: 'Rien Banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '1', metier: 'peinture', date: MAINT - 40 }] };
    const Td = tour([cliRien], { espace: 'refus-banc' });
    await Td.ctx.tourAccepterDemande('rien@exemple-2892.fr', 'refus-banc');   // référentiel pas lu
    const eD = await etat(T_RE);
    v('⛔ référentiel pas lu et rien coché : AUCUNE rubrique posée (tout reste ouvert), l\'espace est ouvert, et le panneau garde le rappel', [eD.cats, Td.posts.filter(p => /espaces\/cats/.test(p.u)).length, /Choisis ses catégories<\/b> dans sa fiche/.test(Td.panneaux.join('\n')), /référentiel des métiers n’était pas encore lu/.test(Td.panneaux.join('\n'))], [null, 0, true, true]);

    /* e · un refus du serveur se DIT dans le panneau */
    const Te = tour([cliRien], { espace: 'refus-banc', refuseCats: true });
    await Te.ctx.refMetiersCharger();
    await Te.ctx.tourAccepterDemande('rien@exemple-2892.fr', 'refus-banc');
    const pE = Te.panneaux.join('\n');
    vrai('⛔ un refus des rubriques par le serveur SE DIT dans le panneau (« Rubriques non posées »), avec la raison et le chemin vers la fiche — pas un toast qui passe', /Rubriques non posées/.test(pE) && /catégorie inconnue : essai/.test(pE) && /role="alert"/.test(pE) && /tourCatsAller\('refus-banc'\)/.test(pE), pE.slice(0, 400));
    const eE = await etat(T_RE);
    v('   et rien n\'a été restreint', eE.cats, null);

    /* f · aucune rubrique cochée : on n'ouvre rien de travers */
    const Tf = tour([cliChantal], { espace: 'chauffe-banc' });
    await Tf.ctx.refMetiersCharger();
    Tf.ctx.demCatsHtml(cliChantal, 0, dChantal);
    const cleF = Tf.ctx.demCatsCle(MAIL, 0);
    Tf.ctx.__DEM().cats[cleF] = [];
    Tf.el['dem-id-0-' + Tf.ctx.sigleAdr(MAIL)] = { value: 'paul' };
    const avantPosts = Tf.posts.length;
    await Tf.ctx.demAccepter(MAIL, 'chauffe-banc', 0, null);
    v('⛔ aucune rubrique cochée : l\'acceptation s\'arrête (« Coche au moins une rubrique »), rien n\'est ouvert, rien n\'est posé', [Tf.posts.length - avantPosts, Tf.toasts.some(t => /Coche au moins une rubrique/.test(t))], [0, true]);

    /* ══ 3 bis. UN ESPACE DÉJÀ OUVERT GARDE SES RUBRIQUES (relecture du 23 octobre 2026) ══
       Une entreprise qui travaille envoie une SECONDE demande : la grille part de ce que son espace a DÉJÀ — pas du conseil de son métier — et « Accepter »
       sans toucher à la grille ne retire rien. Avant, elle posait le conseil (20 à 36 rubriques) par-dessus, sans qu'aucun écran dise l'écart. */
    console.log('\n3 bis. Un espace déjà ouvert : la grille part de ses rubriques actuelles, et « Accepter » sans y toucher ne change rien');
    const ENT_REEL = ((await appel('/api/monitor/entreprises', undefined, PATRON)).j.entreprises) || [];
    const eRS = ENT_REEL.find(x => x.email === 'restreint@exemple-2892.fr'), eLI = ENT_REEL.find(x => x.email === 'libre@exemple-2892.fr');
    v('⛔ le vrai serveur sert à la Tour les rubriques actuelles de chaque espace (`cats` : le tableau dans l\'ordre du menu, ou `null` = tout)', [eRS && eRS.cats, eLI && eLI.cats], [CATS_OK.filter(k => ['factures', 'devis', 'clients'].includes(k)), null]);
    const TROIS = CATS_OK.filter(k => ['factures', 'devis', 'clients'].includes(k));
    const dRS = { app: 'OP GESTION', formule: 'Pro', users: '3', metier: 'chauffage', date: MAINT - 30 };   // le conseil du chauffage serait ~20 rubriques
    const cliRS = { email: 'restreint@exemple-2892.fr', entreprise: 'Restreint Banc', demandes: [dRS] };
    const cliLI = { email: 'libre@exemple-2892.fr', entreprise: 'Libre Banc', demandes: [Object.assign({}, dRS, { date: MAINT - 20 })] };
    const nbCats = p => p.filter(x => /espaces\/cats/.test(x.u));
    /* a · l'espace restreint : départ = ses trois rubriques */
    const Tg = tour([cliRS], { espace: 'restreint-banc', ent: ENT_REEL });
    await Tg.ctx.refMetiersCharger();
    v('   la grille part des rubriques ACTUELLES de l\'espace (3), pas du conseil du métier', [Tg.ctx.demCatsDepart(dRS, Tg.ctx.demEspace(cliRS.email)).liste, Tg.ctx.demCatsDepart(dRS, Tg.ctx.demEspace(cliRS.email)).source], [TROIS, 'espace']);
    vrai('   (population) le conseil du chauffage, lui, en compte bien plus que trois — la différence est ce que l\'ancien code aurait posé', Tg.ctx.demCatsDepart(dRS).liste.length > 10, Tg.ctx.demCatsDepart(dRS).liste.length);
    const htmlRS = Tg.ctx.demCatsHtml(cliRS, 0, dRS);
    vrai('⛔ la grille DIT « Espace déjà ouvert » et que les cases remplacent ses rubriques, et ne coche que ses trois', /Espace déjà ouvert/.test(htmlRS) && /3 sur 38/.test(htmlRS) && /les REMPLACE/.test(htmlRS) && (htmlRS.match(/type="checkbox"[^>]* checked/g) || []).length === 3 && /Revenir aux rubriques actuelles de l’espace/.test(htmlRS), [/Espace déjà ouvert/.test(htmlRS), /3 sur 38/.test(htmlRS), /les REMPLACE/.test(htmlRS), (htmlRS.match(/type="checkbox"[^>]* checked/g) || []).length, /Revenir aux rubriques actuelles de l’espace/.test(htmlRS)].join('/'));
    Tg.el['dem-id-0-' + Tg.ctx.sigleAdr(cliRS.email)] = { value: 'paul' };
    await Tg.ctx.demAccepter(cliRS.email, 'restreint-banc', 0, null);
    v('⛔ « Accepter » SANS toucher à la grille ne pose AUCUNE rubrique (et le vrai serveur garde les trois)', [nbCats(Tg.posts).length, (await etat(T_RS)).cats], [0, TROIS]);
    vrai('   le panneau le dit (« Rubriques de l’espace inchangées », 3 sur 38)', /Rubriques de l’espace inchangées/.test(Tg.panneaux.join('\n')) && /3 sur 38/.test(Tg.panneaux.join('\n')), Tg.panneaux.join('\n').slice(0, 300));
    /* b · un geste sur la grille, lui, remplace */
    const Th = tour([cliRS], { espace: 'restreint-banc', ent: ENT_REEL });
    await Th.ctx.refMetiersCharger();
    Th.ctx.demCatsHtml(cliRS, 0, dRS);
    Th.ctx.demCatBasculer(Th.ctx.demCatsCle(cliRS.email, 0), 'stock', { checked: true, closest: () => null });
    Th.el['dem-id-0-' + Th.ctx.sigleAdr(cliRS.email)] = { value: 'paul' };
    await Th.ctx.demAccepter(cliRS.email, 'restreint-banc', 0, null);
    const QUATRE = CATS_OK.filter(k => ['factures', 'devis', 'clients', 'stock'].includes(k));
    v('⛔ cocher « Stock » puis accepter : les rubriques deviennent les quatre, par la route de la fiche — et c\'est le seul cas', [nbCats(Th.posts).map(p => p.corps.cats), (await etat(T_RS)).cats], [[QUATRE], QUATRE]);
    vrai('   le panneau dit « ajustées par toi »', /ajustées par toi/.test(Th.panneaux.join('\n')));
    /* c · l'espace qui travaille avec tout (ELAN) */
    const Ti = tour([cliLI], { espace: 'libre-banc', ent: ENT_REEL });
    await Ti.ctx.refMetiersCharger();
    v('   un espace sans rubriques réglées part de TOUTES (38), pas du conseil', Ti.ctx.demCatsDepart(cliLI.demandes[0], Ti.ctx.demEspace(cliLI.email)).liste.length, 38);
    Ti.ctx.demCatsHtml(cliLI, 0, cliLI.demandes[0]);
    Ti.el['dem-id-0-' + Ti.ctx.sigleAdr(cliLI.email)] = { value: 'paul' };
    await Ti.ctx.demAccepter(cliLI.email, 'libre-banc', 0, null);
    v('⛔ l\'entreprise qui travaille avec tout : « Accepter » sans toucher ne lui retire RIEN (le conseil du chauffage ne se pose pas)', [nbCats(Ti.posts).length, (await etat(T_LI)).cats], [0, null]);
    vrai('   le panneau dit « toutes ouvertes »', /toutes ouvertes/.test(Ti.panneaux.join('\n')), Ti.panneaux.join('\n').slice(0, 200));
    /* d · la liste des entreprises n'est pas encore lue : on ne sait pas si l'espace existe — on ne pose rien sans un geste */
    const Tj = tour([cliLI], { espace: 'libre-banc', entNonLue: true });
    await Tj.ctx.refMetiersCharger();
    const htmlJ = Tj.ctx.demCatsHtml(cliLI, 0, cliLI.demandes[0]);
    vrai('   la grille avertit que la liste n\'est pas lue', /pas encore lue/.test(htmlJ), htmlJ.slice(0, 300));
    Tj.el['dem-id-0-' + Tj.ctx.sigleAdr(cliLI.email)] = { value: 'paul' };
    await Tj.ctx.demAccepter(cliLI.email, 'libre-banc', 0, null);
    v('⛔ liste des entreprises pas lue : « Accepter » sans toucher ne pose aucune rubrique (un espace existant ne se fait pas écraser par le conseil)', [nbCats(Tj.posts).length, (await etat(T_LI)).cats], [0, null]);
    /* e · les textes ne promettent pas ce que l'application ne fait pas */
    const infoRS = Tg.ctx.demCatsInfo(Tg.ctx.demCatsCle(cliRS.email, 0), { liste: TROIS, source: 'espace' });
    vrai('⛔ le compteur de la grille ne dit pas « l\'application ne montrera que celles-là » (elle ne lit pas encore les rubriques) mais ce qui est vrai', !/ne montrera/.test(infoRS) && /ne les applique pas encore/.test(infoRS), infoRS);

    /* ══ 3 ter. UNE SECONDE DEMANDE NE CHANGE PAS LE MÉTIER D'UN ESPACE DÉJÀ OUVERT (24 octobre 2026) ══
       Avant : l'acceptation reposait le métier de la demande sur un espace qui travaillait déjà — l'application changeait de types
       d'intervention, de fiche de terrain et de modules sans que personne l'ait décidé (seules les rubriques étaient protégées). */
    console.log('\n3 ter. Une seconde demande acceptée sur un espace qui a déjà un métier : le métier est GARDÉ, et la Tour le dit');
    v('(population) « chauffe-banc » a déjà un métier, posé par la première acceptation (§ 3 a, qui envoyait déjà `siVide`)', [(await etat(T_CH)).metier, Ta.posts.filter(p => /espaces\/metier/.test(p.u)).map(p => p.corps.siVide)], ['chauffage', [true]]);
    const cliSec = { email: MAIL, entreprise: 'Chauffe Banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '3', metier: 'plomberie', date: MAINT + 10 }] };
    const Tk = tour([cliSec], { espace: 'chauffe-banc' });
    await Tk.ctx.refMetiersCharger();
    await Tk.ctx.tourAccepterDemande(MAIL, 'chauffe-banc');
    v('⛔ l\'acceptation ne demande le métier de la demande que s\'il n\'y en a pas (`siVide`)', Tk.posts.filter(p => /espaces\/metier/.test(p.u)).map(p => [p.corps.metier, p.corps.siVide]), [['plomberie', true]]);
    v('⛔ LA COUTURE : l\'application reçoit toujours le métier d\'avant, pas celui de la seconde demande', (await etat(T_CH)).metier, 'chauffage');
    const pK = Tk.panneaux.join('\n');
    vrai('   le panneau le DIT : le métier gardé, celui de la demande, et où le changer', /Métier de l’espace gardé : Chauffage \/ Climatisation/.test(pK) && /sa demande dit « Plomberie »/.test(pK) && /dans sa fiche \(MÉTIER\)/.test(pK), pK.slice(0, 500));
    vrai('   le message de bienvenue nomme le métier RÉEL de l\'application, pas celui de la demande', /réglée pour ton métier : Chauffage \/ Climatisation\./.test(String(Tk.ctx.LG_MSG_MODELE)) && !/Plomberie/.test(String(Tk.ctx.LG_MSG_MODELE)), String(Tk.ctx.LG_MSG_MODELE).slice(0, 300));
    /* même métier que l'espace : rien n'est « gardé », rien à dire */
    const cliMeme = { email: MAIL, entreprise: 'Chauffe Banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '3', metier: 'chauffage', date: MAINT + 20 }] };
    const Tm = tour([cliMeme], { espace: 'chauffe-banc' });
    await Tm.ctx.refMetiersCharger();
    await Tm.ctx.tourAccepterDemande(MAIL, 'chauffe-banc');
    vrai('   la demande porte le métier de l\'espace : aucun encart « gardé »', !/Métier de l’espace gardé/.test(Tm.panneaux.join('\n')) && (await etat(T_CH)).metier === 'chauffage');
    /* le geste de la fiche (sans `siVide`) change toujours le métier : la protection ne fige rien */
    const rFiche = await appel('/api/monitor/espaces/metier', { nom: 'chauffe-banc', metier: 'plomberie' }, PATRON);
    v('⛔ le geste de la FICHE (sans `siVide`) change toujours le métier, et l\'application le reçoit', [rFiche.s, rFiche.j && rFiche.j.garde, (await etat(T_CH)).metier], [200, undefined, 'plomberie']);
    await appel('/api/monitor/espaces/metier', { nom: 'chauffe-banc', metier: 'chauffage' }, PATRON);
    /* une entreprise à deux noms : « le métier actuel » est celui que l'application reçoit, celui du nom le PLUS RÉCENT (pas le premier de l'annuaire) */
    v('(population) l\'entreprise à deux noms : l\'application reçoit le métier du nom le plus récent', (await etat(T_DN)).metier, 'plomberie');
    const rDeux = await appel('/api/monitor/espaces/metier', { nom: 'deux-ancien', metier: 'nettoyage', siVide: true }, PATRON);
    v('⛔ `siVide` posé par l\'ancien nom, avec le métier de l\'ancien nom : le serveur garde celui que l\'application reçoit (le plus récent), et le dit', [rDeux.s, rDeux.j && rDeux.j.garde, rDeux.j && rDeux.j.metier, (await etat(T_DN)).metier], [200, true, 'plomberie', 'plomberie']);
    const rMeme = await appel('/api/monitor/espaces/metier', { nom: 'deux-ancien', metier: 'plomberie', siVide: true }, PATRON);
    v('   le même métier que celui servi : rien de « gardé », l\'entreprise entière porte ce métier', [rMeme.j && rMeme.j.garde, (await etat(T_DN)).metier], [undefined, 'plomberie']);
    const rTxt = await appel('/api/monitor/espaces/metier', { nom: 'deux-recent', metier: 'nettoyage', siVide: 'oui' }, PATRON);
    v('   `siVide` vaut seulement `true` : « oui » n\'est pas une demande de garde (le geste passe, comme la fiche)', [rTxt.j && rTxt.j.garde, (await etat(T_DN)).metier], [undefined, 'nettoyage']);

    /* les deux ordres de publication : la Tour neuve devant un serveur d'avant ne PRÉTEND pas avoir gardé le métier */
    const Tn = tour([cliSec], { espace: 'chauffe-banc', serveurAvant: true });
    await Tn.ctx.refMetiersCharger();
    await Tn.ctx.tourAccepterDemande(MAIL, 'chauffe-banc');
    v('   Tour neuve, serveur d\'avant (le champ retiré en route) : le comportement d\'avant, et la Tour ne dit PAS « gardé » — elle annonce le métier vraiment posé', [(await etat(T_CH)).metier, /Métier de l’espace gardé/.test(Tn.panneaux.join('\n')), /réglée pour ton métier : Plomberie\./.test(String(Tn.ctx.LG_MSG_MODELE))], ['plomberie', false, true]);

    /* ══ 4. LES LISTES SE TIENNENT ══ */
    console.log('\n4. Les trois listes de métiers de secours disent la même chose que l\'interrupteur');
    const METIER_L = evalue(litteral(PORTN, 'const METIER_L={')), MET_L = evalue(litteral(TOURN, 'var MET_L={'));
    /* ces listes sont PUBLIÉES : elles se comparent au VRAI fichier (`REFB.reel`), pas au référentiel fabriqué que joue le serveur du banc */
    const RV = REFB.reel;
    v('⛔ la liste de secours du portail (`METIER_L`) = les métiers ouverts du VRAI référentiel (ouvrir un métier sans la mettre à jour fait tomber ce banc)', Object.keys(METIER_L), RV.ouverts);
    v('⛔ la liste de la Tour (`MET_L`) = les métiers ouverts du VRAI référentiel', Object.keys(MET_L), RV.ouverts);
    v('   les libellés sont ceux du référentiel', [Object.keys(METIER_L).map(k => METIER_L[k]), Object.keys(MET_L).map(k => MET_L[k])], [RV.ouverts.map(k => k === 'chauffage' ? 'Chauffage / Climatisation' : RV.metiers[k].nom), RV.ouverts.map(k => k === 'chauffage' ? 'Chauffage / Climatisation' : RV.metiers[k].nom)]   /* la Tour : « chauffage » porte aussi la climatisation (variante, 30 octobre 2026) */);
  } finally { fin(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a JETÉ : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
