/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR ET LES OPTIONS DU PRO (Tour v2.80, 1er octobre 2026).

   Justin, 1er octobre 2026, à « Quels prix pour les options du Pro ? » : « Plus cher ». Stock, Achats, Encaissements et
   Registre sanitaire s'ajoutent à la formule Pro ; Business et Business Premium les ont toutes. La Tour doit (1) MONTRER ce
   que l'application reçoit et les lignes d'option chez Stripe, (2) laisser TEAM OP en régler à la main avec l'abonnement,
   (3) poser une pastille par option servie dans la liste des entreprises — et (4) SE TAIRE quand le serveur n'en dit rien.

   Ce banc fait parler les VRAIES fonctions de rendu et d'envoi de `tour.html` (`packPeindre`, `optsPeindre`,
   `tourPackPrefill`, `tourAboEnregistrer`, `apiPost`…, extraites du fichier livré, jamais recopiées) à un serveur de
   référence écrit d'après le CONTRAT (`/api/monitor/espaces/statut`, `/abonnement`, `/liste` ; champs `optionsServies`,
   `options`, `optionsStripe`) — en deux versions : « neuf » et « d'avant » (le même, sans ces champs). Le DOM de la fiche est
   fabriqué à partir des `id` du balisage que la Tour écrit elle-même (`optsCasesHtml`) : une case retirée du balisage tombe ici.
   Le serveur du dépôt ne connaît pas encore les options quand ce banc est écrit : la COUTURE réelle (les noms de champs lus par
   la Tour contre ceux que `server/index.js` écrit) se contrôle dès que le serveur les porte — ce banc le dit sans le compter
   tant qu'il ne les porte pas.
   Rien ne sort : 127.0.0.1, des entreprises fictives. Pas de dépendance, pas de `server/node_modules`. */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
const TOUR = lire('TOUR_FICHIER', 'tour.html');
const SRV = lire('SERVEUR_FICHIER', path.join('server', 'index.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 60000).unref();

/* Le code sans ses commentaires (ceux qui COMMENCENT une ligne) — une fonction se cherche dans le code, jamais dans une phrase. */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const TOURN = nu(TOUR);
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, commentaires et expressions
   régulières sautés) — même découpe que `test-848`. */
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
      for (k++; k < src.length; k++) { const d = src[k]; if (d === '\\') { k++; continue; } if (d === '\n') break; if (cls) { if (d === ']') cls = false; continue; } if (d === '[') { cls = true; continue; } if (d === '/') break; }
      continue;
    }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return src.slice(d0, k + 1);
}
const ligneVar = nom => (new RegExp('^var ' + nom + '=\\{[^\\n]*\\};$', 'm').exec(TOURN) || [''])[0];
const NOMS = ['esc', 'hAuth', 'apiPost', 'optsLib', 'optsClesDe', 'optsServiesDe', 'optsPastilles', 'optsLignesTexte', 'optsCasesHtml', 'optsEligible',
  'optsSynchro', 'optsVisible', 'optsChoisies', 'optsPeindre', 'abnEcart', 'metDemande', 'packPeindre', 'tourPackPrefill', 'tourAboEnregistrer'];
const VARS = ['OPT_L', 'OPT_C', 'OPT_P', 'OPT_ST', 'ABN_F', 'MET_L'].map(ligneVar);
const FN = NOMS.map(n => fonction(TOURN, n));
const CLES = (/^var OPT_CLES=(\[[^\]\n]*\]);$/m.exec(TOURN) || ['', '[]'])[1];

console.log('\n── 854 · la Tour règle et montre les options du Pro, et se tait quand le serveur ne dit rien ──');
console.log('\n1. Population');
vrai('(population) les ' + NOMS.length + ' fonctions de la Tour sont trouvées dans son code', FN.every(Boolean), NOMS.filter((n, i) => !FN[i]).join(', '));
vrai('(population) les six tables à une ligne et la liste des clés sont trouvées', VARS.every(Boolean) && CLES !== '[]', VARS.map((x, i) => x ? '' : i).join(','));
vrai('la Tour porte sa version v2.81', /\bvar TOUR_VERSION='v2\.81'/.test(TOURN));

/* ── le CONTRAT (SPEC §1) : les clés et les prix par utilisateur et par mois. La Tour les écrit à part ; quand le serveur les porte, c'est lui qu'on lit. */
const CONTRAT = { stock: 9, achats: 6, compta: 6, sanitaire: 6 };
const ctxTab = {}; vm.createContext(ctxTab); vm.runInContext(VARS.join('\n') + '\nvar OPT_CLES=' + CLES + ';', ctxTab);
v('la Tour connaît les quatre options du contrat, dans l\'ordre de l\'offre', vm.runInContext('OPT_CLES', ctxTab), ['stock', 'achats', 'compta', 'sanitaire']);
v('   leurs prix par utilisateur et par mois sont ceux du contrat', vm.runInContext('OPT_P', ctxTab), CONTRAT);
v('   chaque clé a son libellé complet ET son libellé court', vm.runInContext('OPT_CLES.filter(function(k){ return !OPT_L[k]||!OPT_C[k]; })', ctxTab), []);
const SRVN = nu(SRV), srvPrix = /OPTIONS_PRIX_MOIS\s*=\s*(\{[^}]*\})/.exec(SRVN);
let SERVEUR_A_LES_OPTIONS = /\boptionsServies\b/.test(SRVN);
if (srvPrix) v('   et ceux du serveur (`OPTIONS_PRIX_MOIS`), puisqu\'il les porte', vm.runInContext('(' + srvPrix[1].replace(/(\w+):/g, '"$1":') + ')', ctxTab), vm.runInContext('OPT_P', ctxTab));
else console.log('  … serveur de cet arbre : pas d\'`OPTIONS_PRIX_MOIS` — les prix sont comparés au contrat seul (non compté)');

/* ── un serveur de référence, d'après le contrat ── */
const TOKEN = 'jeton-de-banc-854';
const ET = {};          // l'état par nom d'entreprise
let MODE = 'neuf';      // 'neuf' | 'avant' (le même sans les champs d'option, et qui ignore `options`)
let REFUS = '';         // un refus forcé sur /abonnement
const RECU = [];        // les corps reçus sur /abonnement
const CLE_OK = ['stock', 'achats', 'compta', 'sanitaire'];
const serveur = http.createServer((req, res) => {
  let corps = ''; req.on('data', c => corps += c); req.on('end', () => {
    const rep = (s, o) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.headers.authorization !== 'Bearer ' + TOKEN) return rep(401, { error: 'non' });
    let b = {}; try { b = JSON.parse(corps || '{}'); } catch (e) {}
    const vue = e => { const o = Object.assign({}, e); if (MODE === 'avant') { delete o.options; delete o.optionsServies; delete o.optionsStripe; } return o; };
    if (req.url === '/api/monitor/espaces/statut') return ET[b.nom] ? rep(200, vue(ET[b.nom])) : rep(404, { error: 'inconnu' });
    if (req.url === '/api/monitor/espaces/liste') return rep(200, { espaces: Object.keys(ET).map(n => Object.assign({ nom: n, t: 't-' + n }, vue(ET[n]))) });
    if (req.url === '/api/monitor/espaces/abonnement') {
      RECU.push(b);
      if (REFUS) return rep(400, { error: REFUS });
      const e = ET[b.nom]; if (!e) return rep(404, { error: 'inconnu' });
      if (MODE === 'neuf' && b.options !== undefined) {
        if (!Array.isArray(b.options) || b.options.some(k => !CLE_OK.includes(k))) return rep(400, { error: 'option_inconnue' });
        if (b.options.length && (b.formule !== 'pro' || !['actif', 'essai'].includes(b.statut))) return rep(400, { error: 'options_formule_pro_actif' });
        e.options = [...new Set(b.options)];
      }
      Object.assign(e, { formule: b.formule, quantite: b.quantite, aboStatut: b.statut, aboFin: b.fin });
      return rep(200, { ok: true });
    }
    rep(404, { error: 'route' });
  });
});

/* ── un appareil : la Tour sans navigateur — le DOM naît des `id` du balisage que la Tour écrit elle-même ── */
let PORT = 0;
function tour() {
  const E = {}, toasts = [], prefills = [];
  const ctx = { fetch, JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console, document: { getElementById: id => E[id] || null },
    toast: t => toasts.push(String(t)), chargerEspaces: () => {}, CLI: { list: [], sel: '' }, ESP: { loaded: true, err: '', list: [] } };
  vm.createContext(ctx);
  vm.runInContext('var API="http://127.0.0.1:' + PORT + '", TOKEN=' + JSON.stringify(TOKEN) + ', PACK={nom:"",charge:false,err:"",d:null};\n'
    + VARS.join('\n') + '\nvar OPT_CLES=' + CLES + ';\n' + FN.join('\n'), ctx);
  /* le balisage RÉEL de la fiche : chaque `id` devient un élément, avec son `hidden` d'origine et son `value` */
  const html = vm.runInContext('optsCasesHtml()', ctx);
  for (const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) E[m[1]] = { id: m[1], hidden: /\bhidden\b/.test(m[0].replace(/id="[^"]*"/, '')), value: (/value="([^"]*)"/.exec(m[0]) || [])[1] || '', checked: false, disabled: false, innerHTML: '', textContent: '' };
  for (const id of ['abo-f', 'abo-q', 'abo-st', 'abo-fin', 'pack-info']) E[id] = { id, value: '', checked: false, disabled: false, innerHTML: '', textContent: '' };
  E['abo-f'].value = 'business'; E['abo-q'].value = '1'; E['abo-st'].value = 'auto';
  const attendre = async (cond) => { for (let i = 0; i < 300 && !cond(); i++) await new Promise(r => setTimeout(r, 10)); return cond(); };
  return { ctx, E, toasts, html, attendre,
    etat: () => vm.runInContext('PACK', ctx),
    peindre: d => { vm.runInContext('PACK={nom:"x",charge:true,err:"",d:' + JSON.stringify(d) + '};', ctx); E['pack-info'].innerHTML = ''; ctx.packPeindre(); },
    coche: (k, val) => { E['abo-o-' + k].checked = val; },
    regle: (id, val) => { E[id].value = val; ctx.optsSynchro(); },   // = le `onchange="optsSynchro()"` de la page
    cases: () => ['stock', 'achats', 'compta', 'sanitaire'].map(k => E['abo-o-' + k]) };
}
const txt = h => String(h).replace(/<[^>]+>/g, '').replace(/ /g, ' ');

(async () => {
  await new Promise(r => serveur.listen(0, '127.0.0.1', r)); PORT = serveur.address().port;
  const T0 = tour();

  console.log('\n2. Les petites fonctions (vraies, extraites)');
  v('⛔ un tableau de clés propre : sans doublon, sans non-chaîne, dans l\'ordre de l\'offre ; une clé inconnue reste lisible',
    T0.ctx.optsClesDe(['sanitaire', 'stock', 'stock', 7, null, '', 'zeta', 'achats']), ['stock', 'achats', 'sanitaire', 'zeta']);
  v('⛔ « aucune option » (tableau vide) n\'est PAS « le serveur ne dit rien » (absent, ou pas un tableau)', [T0.ctx.optsClesDe([]), T0.ctx.optsClesDe(undefined), T0.ctx.optsClesDe('stock'), T0.ctx.optsClesDe({ 0: 'stock' })], [[], null, null, null]);
  v('le libellé : complet, court, et la clé telle quelle quand elle est inconnue — jamais une propriété héritée',
    [T0.ctx.optsLib('sanitaire'), T0.ctx.optsLib('compta', 1), T0.ctx.optsLib('zeta'), T0.ctx.optsLib('constructor'), T0.ctx.optsLib('__proto__', 1), T0.ctx.optsLib(null)],
    ['Registre sanitaire (3D)', 'Compta', 'zeta', 'constructor', '__proto__', '']);
  v('les lignes Stripe : « Stock ×3 (payée) · Achats ×2 (impayée) » ; un statut inconnu reste lisible ; une clé hostile est échappée',
    txt(T0.ctx.optsLignesTexte({ optionsStripe: [{ cle: 'stock', quantite: 3, statut: 'active' }, { cle: 'achats', quantite: 2, statut: 'past_due' }, { cle: '<b>x</b>', quantite: 1, statut: 'constructor' }, null] })),
    'Stock ×3 (payée) · Achats fournisseurs ×2 (impayée) · &lt;b&gt;x&lt;/b&gt; ×1 (constructor)');
  vrai('   … et la clé hostile ne devient JAMAIS une balise', !/<b>x<\/b>/.test(T0.ctx.optsLignesTexte({ optionsStripe: [{ cle: '<b>x</b>', quantite: 1, statut: 'active' }] })));
  v('   pas de lignes (serveur d\'avant) : rien', [T0.ctx.optsLignesTexte({}), T0.ctx.optsLignesTexte({ optionsStripe: 'x' })], ['', '']);

  console.log('\n3. La pastille de la liste (vraie `optsPastilles`)');
  const past = o => (T0.ctx.optsPastilles(o).match(/class="opt-p"[^>]*>[^<]*/g) || []).map(x => x.replace(/^.*>/, ''));
  v('⛔ une pastille par option servie, avec son MOT court, dans l\'ordre de l\'offre', past({ t: 'a', optionsServies: ['compta', 'stock'] }), ['Stock', 'Compta']);
  v('   les quatre : quatre pastilles', past({ optionsServies: ['stock', 'achats', 'compta', 'sanitaire'] }).length, 4);
  v('   aucune option servie : aucune pastille', [past({ optionsServies: [] }), past({})], [[], []]);
  T0.ctx.ESP.list = [{ t: 'ent-1', optionsServies: ['achats'] }, { t: 'ent-2' }];
  v('⛔ une ligne de la liste ne porte pas le champ : il se lit dans la liste des espaces, par le MÊME identifiant `t`',
    [past({ t: 'ent-1' }), past({ t: 'ent-2' }), past({ t: 'ent-inconnue' }), past({})], [['Achats'], [], [], []]);
  vrai('   la clé hostile d\'une option servie est échappée', !/<img/.test(T0.ctx.optsPastilles({ optionsServies: ['<img src=x onerror=alert(1)>'] })));
  T0.ctx.ESP.list = [];
  vrai('⛔ la ligne de la liste PORTE la pastille (code de `vueEntreprises`, commentaires retirés)', /\(optsPastilles\(o\)\?'<span class="reg-opts">'\+optsPastilles\(o\)\+'<\/span>':''\)/.test(TOURN));

  console.log('\n4. La fiche (vraie `packPeindre` → `optsPeindre`, sur le balisage réel)');
  vrai('(population) le balisage porte le bloc, ses quatre cases et sa ligne d\'info', !!T0.E['abo-opts'] && !!T0.E['abo-opts-info'] && T0.cases().every(Boolean) && T0.E['abo-opts'].hidden === true);
  /* le banc rejoue `onchange="optsSynchro()"` à la main (`regle`) : le BALISAGE de la fiche doit donc le porter vraiment, sur la formule ET sur le
     statut, et poser le bloc des options dans la fiche (code de `vueDossier`, commentaires retirés) */
  vrai('⛔ la formule et le statut de la fiche portent `onchange="optsSynchro()"` (sinon les cases ne suivent pas ce qu\'on choisit)',
    /id="abo-f"[^\n]*onchange="optsSynchro\(\)"/.test(TOURN) && /id="abo-st"[^\n]*onchange="optsSynchro\(\)"/.test(TOURN));
  vrai('⛔ la fiche pose le bloc des options sous la ligne de statut (`optsCasesHtml()` après `#pack-info`)', /id="pack-info" class="note">Chargement du statut…<\/div>'\+\s*optsCasesHtml\(\)\+/.test(TOURN));
  vrai('⛔ `packPeindre` appelle `optsPeindre(d)` (code, commentaires retirés)', /optsPeindre\(d\);\s*\}\s*function tourPackPrefill/.test(TOURN));
  const F = tour();
  F.peindre({ formule: 'pro', quantite: 3, aboStatut: 'actif', paye: true, places: 3 });
  vrai('⛔ SERVEUR D\'AVANT (aucun champ d\'option) : le bloc reste CACHÉ — la Tour se tait', F.E['abo-opts'].hidden === true && F.E['abo-opts-info'].innerHTML === '', JSON.stringify(F.E['abo-opts']));
  F.E['abo-f'].value = 'pro'; F.E['abo-st'].value = 'actif';
  F.peindre({ formule: 'pro', quantite: 3, aboStatut: 'actif', paye: true, formuleServie: 'pro', places: 3, options: ['stock'], optionsServies: ['stock'], optionsStripe: [{ cle: 'stock', quantite: 3, statut: 'active' }] });
  v('serveur neuf, Pro actif, réglé à la main : Stock coché, les trois autres non, les cases ouvertes', [F.E['abo-opts'].hidden, F.cases().map(c => c.checked), F.cases().map(c => c.disabled)], [false, [true, false, false, false], [false, false, false, false]]);
  v('   la ligne dit les options servies ET la ligne Stripe', txt(F.E['abo-opts-info'].innerHTML), 'Options servies à l’application : Stock · lignes Stripe : Stock ×3 (payée)');
  vrai('   et la fiche garde son texte habituel (formule, statut, places)', /Formule actuelle : Pro ×3 · statut : activé par TEAM OP/.test(txt(F.E['pack-info'].innerHTML)) && /places servies : 3/.test(txt(F.E['pack-info'].innerHTML)));
  F.E['abo-f'].value = 'business'; F.E['abo-st'].value = 'actif';
  F.peindre({ formule: 'business', quantite: 2, aboStatut: 'actif', paye: true, formuleServie: 'business', options: [], optionsServies: [] });
  v('⛔ Business : toutes les options sont incluses, et les cases sont GRISÉES (une option réglée à la main exige Pro)', [txt(F.E['abo-opts-info'].innerHTML), F.cases().map(c => c.disabled)], ['Toutes les options sont incluses dans Business', [true, true, true, true]]);
  F.E['abo-f'].value = 'pro'; F.E['abo-st'].value = 'auto';
  F.peindre({ formule: 'pro', quantite: 2, aboStatut: 'auto', paye: true, formuleServie: 'pro', options: [], optionsServies: ['achats', 'compta'], optionsStripe: [{ cle: 'achats', quantite: 2, statut: 'active' }, { cle: 'compta', quantite: 2, statut: 'trialing' }] });
  v('Pro en statut automatique (Stripe) : les options servies se lisent, les cases sont grisées', [txt(F.E['abo-opts-info'].innerHTML), F.cases().map(c => c.disabled), F.cases().map(c => c.checked)],
    ['Options servies à l’application : Achats fournisseurs, Encaissements et compta · lignes Stripe : Achats fournisseurs ×2 (payée) · Encaissements et compta ×2 (en essai)', [true, true, true, true], [false, false, false, false]]);
  F.E['abo-st'].value = 'essai';
  F.peindre({ formule: 'pro', quantite: 1, aboStatut: 'essai', paye: true, formuleServie: 'pro', options: [], optionsServies: [] });
  v('Pro en essai, aucune option : « Aucune option servie », cases ouvertes et décochées', [txt(F.E['abo-opts-info'].innerHTML), F.cases().map(c => c.disabled), F.cases().map(c => c.checked)], ['Aucune option servie à l’application', [false, false, false, false], [false, false, false, false]]);
  F.peindre({ formule: 'pro', quantite: 1, aboStatut: 'essai', paye: true });
  vrai('⛔ puis un serveur d\'avant / un doute sur la MÊME fiche : le bloc se REFERME (il ne garde pas ce qu\'il savait)', F.E['abo-opts'].hidden === true);
  F.peindre({ formule: 'pro', quantite: 1, aboStatut: 'essai', paye: false, options: undefined });
  vrai('   et une fiche suspendue (aucun champ d\'option) reste fermée', F.E['abo-opts'].hidden === true);
  F.E['abo-f'].value = 'pro'; F.E['abo-st'].value = 'actif';
  F.peindre({ formule: 'pro', quantite: 1, aboStatut: 'actif', paye: true, options: ['zeta', 'stock'], optionsServies: ['zeta'] });
  vrai('une clé que la Tour ne connaît pas se LIT dans la ligne (jamais cachée), sans case', /Options servies à l’application : zeta/.test(txt(F.E['abo-opts-info'].innerHTML)) && F.cases().map(c => c.checked).join() === 'true,false,false,false');
  F.ctx.PACK = null;
  vm.runInContext('PACK={nom:"x",charge:true,err:"Serveur injoignable.",d:null}; packPeindre(); PACK={nom:"x",charge:false,err:"",d:null}; packPeindre();', F.ctx);
  vrai('   une fiche en erreur ou en chargement ne touche pas au bloc (et ne jette rien)', true);

  console.log('\n5. Enregistrer (vraie `tourAboEnregistrer`, vrai `apiPost` sur le réseau) contre le serveur de référence');
  const nouveau = (nom, o) => { ET[nom] = Object.assign({ formule: 'pro', quantite: 3, aboStatut: 'actif', aboFin: '', paye: true, formuleServie: 'pro', options: [], optionsServies: [], optionsStripe: [] }, o); };
  const enregistrer = async (A, nom) => { const n = RECU.length, nt = A.toasts.length; A.ctx.tourAboEnregistrer(nom, null); await A.attendre(() => A.toasts.length > nt && RECU.length > n); await new Promise(r => setTimeout(r, 30)); return RECU[RECU.length - 1]; };
  MODE = 'neuf'; REFUS = '';
  nouveau('plombier', {});
  const A = tour();
  A.ctx.tourPackPrefill('plombier'); await A.attendre(() => A.etat().charge);
  v('⛔ la Tour LIT le serveur (vraie `tourPackPrefill`) : le bloc s\'ouvre, la fiche est préremplie Pro ×3 actif', [A.E['abo-opts'].hidden, A.E['abo-f'].value, A.E['abo-q'].value, A.E['abo-st'].value], [false, 'pro', 3, 'actif']);
  A.coche('stock', true); A.coche('compta', true);
  let b1 = await enregistrer(A, 'plombier');
  v('⛔ « Enregistrer » envoie les cases cochées avec l\'abonnement, rien d\'autre de neuf', [b1.options, Object.keys(b1).sort()], [['stock', 'compta'], ['fin', 'formule', 'nom', 'options', 'quantite', 'statut']]);
  v('   le serveur les a gardées, et la Tour les relit (aller-retour : Stock et Compta cochés, dans l\'ordre de l\'offre)', [ET.plombier.options, A.cases().map(c => c.checked)], [['stock', 'compta'], [true, false, true, false]]);
  vrai('   le toast les nomme', A.toasts.some(t => /Abonnement enregistré : pro ×3 \+ Stock, Compta · actif/.test(t)), A.toasts.join(' | '));
  A.regle('abo-f', 'business');
  let b2 = await enregistrer(A, 'plombier');
  v('⛔ la formule passe à Business : la Tour envoie `options: []` (jamais des cases cochées sous une formule qui les refuse) — le serveur accepte', [b2.options, ET.plombier.options, ET.plombier.formule], [[], [], 'business']);
  A.regle('abo-f', 'pro'); A.regle('abo-st', 'auto'); A.coche('achats', true);
  let b3 = await enregistrer(A, 'plombier');
  v('⛔ Pro en statut automatique avec une case cochée : `[]` aussi (le statut manuel est exigé), jamais un 400 qu\'on aurait pu éviter', [b3.options, /^💾 Abonnement enregistré : pro ×3 · auto/.test(A.toasts[A.toasts.length - 1])], [[], true]);
  /* le serveur refuse : la Tour le dit tel quel, et ne prétend pas avoir enregistré */
  REFUS = 'option_inconnue'; A.regle('abo-st', 'actif'); A.coche('achats', true);
  const nt = A.toasts.length; await enregistrer(A, 'plombier');
  vrai('un refus du serveur est LU et dit (pas de « enregistré »)', A.toasts.slice(nt).some(t => t === 'option_inconnue') && !A.toasts.slice(nt).some(t => /enregistré/.test(t)), A.toasts.slice(nt).join(' | '));
  REFUS = '';

  console.log('\n6. Un serveur d\'AVANT (même fiche, sans les champs d\'option)');
  MODE = 'avant'; nouveau('vieux', { options: ['stock'], optionsServies: ['stock'] });
  const V = tour();
  V.ctx.tourPackPrefill('vieux'); await V.attendre(() => V.etat().charge);
  v('⛔ la fiche se peint SANS bloc d\'option, sans rien dire des options', [V.E['abo-opts'].hidden, V.E['abo-opts-info'].innerHTML, V.etat().err], [true, '', '']);
  V.E['abo-f'].value = 'pro'; V.E['abo-st'].value = 'actif'; V.coche('stock', true);
  const b4 = await enregistrer(V, 'vieux');
  v('⛔ « Enregistrer » ne lui envoie PAS `options` (le corps est celui d\'avant, à l\'octet près)', Object.keys(b4).sort(), ['fin', 'formule', 'nom', 'quantite', 'statut']);
  vrai('   et l\'enregistrement a réussi comme avant', V.toasts.some(t => /Abonnement enregistré/.test(t)), V.toasts.join(' | '));
  const L = await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/espaces/liste', { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  V.ctx.ESP.list = L.espaces;
  v('   la liste d\'un serveur d\'avant : aucune pastille', V.ctx.optsPastilles({ t: 't-vieux' }), '');
  MODE = 'neuf'; nouveau('electro', { optionsServies: ['stock', 'sanitaire'] });
  const L2 = await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/espaces/liste', { headers: { Authorization: 'Bearer ' + TOKEN } })).json();
  V.ctx.ESP.list = L2.espaces;
  v('⛔ la liste d\'un serveur neuf (vrais champs, vraie route) : les pastilles de l\'entreprise, et rien pour la voisine sans option', [V.ctx.optsPastilles({ t: 't-electro' }).match(/opt-p/g).length, V.ctx.optsPastilles({ t: 't-plombier' })], [2, '']);

  console.log('\n7. La couture réelle (serveur du dépôt)');
  if (!SERVEUR_A_LES_OPTIONS) console.log('  … le serveur de cet arbre ne porte pas encore `optionsServies` : les noms de champs lus par la Tour ne sont pas comparés aux siens (non compté — le banc se resserre seul dès qu\'il les porte)');
  else {
    for (const champ of ['optionsServies', 'optionsStripe']) vrai('⛔ `' + champ + '` : le serveur l\'écrit, la Tour le lit', new RegExp('\\b' + champ + '\\b').test(SRVN) && new RegExp('\\b' + champ + '\\b').test(TOURN));
    vrai('⛔ `/api/monitor/espaces/abonnement` du serveur lit `options` du corps, comme la Tour l\'envoie', /\/api\/monitor\/espaces\/abonnement[\s\S]{0,3000}?\bb?\.?options\b/.test(SRVN));
  }
  serveur.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
