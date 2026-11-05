/* test-3260 — L'APERÇU PDF RESTE DANS L'APPLICATION, UN ENVOI NE S'ÉCHAPPE PLUS DANS MAIL, LA BÊTA N'A QU'UN ESPACE (v802, 5 novembre 2026).
 *
 * Trois défauts remontés par Justin sur la bêta 801, captures à l'appui :
 *   1. « Quand je fais aperçu pour le PDF, ça ouvre un autre lien, je voulais pas ça » — le bouton « Aperçu » de la fenêtre PDF ouvrait un
 *      onglet `blob:` ; Safari sur iPhone n'aurait de toute façon montré que la première page dans une <iframe>, Chrome sur Android rien.
 *      Les PDF de l'application se DESSINENT maintenant dans la fenêtre (`pdfLire` + `pdfDessinerPage` sur des <canvas>).
 *   2. « Pourquoi en mail le PDF s'ouvre pas, et pourquoi ça utilise pas le mail de l'application » — quand /api/sendmail refusait, srvMail
 *      ouvrait un brouillon `mailto:` (Mail du Mac) avec le texte du devis, SANS le PDF. Plus aucun brouillon : un envoi part par
 *      l'application, ou il ne part pas, et ça se dit.
 *   3. « Mon compte bêta ne synchronise toujours pas » — deux documents de bêta vivaient côte à côte (`elan-gestion-beta`, l'ancien nom jamais
 *      migré, et `opgestion-beta`). Le générateur fait converger l'ancien nom et l'appareil connecté sans espace vers `opgestion-beta`.
 * Ce banc EXÉCUTE : le lecteur PDF sur les vraies fabriques (devis, facture, bon) dans un faux contexte 2D qui note chaque texte dessiné ;
 * la vraie srvMail contre un serveur qui refuse et un serveur injoignable (aucune affectation `mailto:`) ; le vrai bloc de convergence de
 * beta.html sur un faux localStorage. Contre-épreuves : `MUTER=1` remet le brouillon mailto:, `MUTER=2` fait sauter un Tj au lecteur,
 * `MUTER=3` retire la migration de l'ancien nom. La preuve visuelle (iPhone, Android, iPad, Mac, Windows, jour et nuit ; rendu maison
 * contre poppler) est la sonde `scratchpad/viewer/` de la session. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RAC = path.join(__dirname, '..');
let APP = fs.readFileSync(path.join(RAC, 'app.html'), 'utf8'), BETA = fs.readFileSync(path.join(RAC, 'beta.html'), 'utf8');
if (process.env.MUTER === '1') APP = APP.replace("sur `true`). `sansMailto` et `mailtoBody` sont encore acceptés (des appelants les passent), ils ne changent plus rien.\n     `tests/test-3260.js`. */\n  return false;", "sur `true`). */\n  location.href='mailto:'+encodeURIComponent(to);\n  return false;");
if (process.env.MUTER === '2') APP = APP.replace("      case 'Tj': ecrire((o[0]||{}).s||''); break;", "      case 'Tj': if(Math.random()<2) break; ecrire((o[0]||{}).s||''); break;");
if (process.env.MUTER === '3') BETA = BETA.replace("if(t==='elan-gestion-beta'||(!t&&sess))", "if((!t&&sess))");
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), { obtenu: a, attendu: b });
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const tranche = (S, a, b) => { const i = S.indexOf(a), j = S.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : S.slice(i, j); };
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) return '';
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g; suite.lastIndex = d + h.length;
  const m = suite.exec(APP); let bout = APP.slice(d, m ? m.index : Math.min(APP.length, d + 80000));
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break; const t = bout.slice(0, k + 1); try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  return ''; }

console.log('\n── 3258 · 1. le lecteur PDF de l\'application, sur ses vraies fabriques ──');
const LECTEUR = tranche(APP, 'function pdfLire(s){', '/* Pose un PDF (chaîne d\'octets) dans une zone');
vrai('le lecteur est trouvé (pdfLire, pdfJetons, pdfDessinerPage)', ['function pdfLire(', 'function pdfJetons(', 'function pdfDessinerPage('].every(n => LECTEUR.includes(n)), LECTEUR.length);
const FN = ['const isoDe =', 'const DOC_COULEUR_DEFAUT=', 'function docCouleurEnt(', 'function docCachetPour(', 'function socNom(', 'function rapportSociete(',
  'function docEntete(', 'function docCoordLignes(', 'function socStyle(', 'function entSocUnique(', 'function entSocietes(', 'function entNom(', 'function entNomDoc(',
  'function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function _pdfCoupe(', 'function _pdfEnLignes(', 'function docPdfStr('];
const W = { console, Object, JSON, String, Math, Date, Array, Number, Uint8Array, Set, Map, RegExp, parseInt, parseFloat, atob: s => Buffer.from(s, 'base64').toString('latin1') };
W.db = { entreprise: { nom: 'Clim Banc', adresse: '1 rue du Banc', cp: '17000', ville: 'La Rochelle', siret: '11111111100011', iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'AGRIFRPP' }, societes: [], societesStyle: {}, interventions: [],
  clients: [{ id: 'c1', nom: 'Hôtel de la Plage', adresse: 'avenue de la Plage', cp: '17000', ville: 'Châtelaillon', email: 'h@exemple.invalid', tel: '0612345678' }] };
vm.createContext(W);
vm.runInContext(FN.map(decoupe).join('\n') + '\n' + LECTEUR + `
  function todayISO(){ return '2026-11-05'; } function encreSur(){ return '#fff'; }
  const ligTotLigne=l=>Math.round((Number(l.qte)||0)*(Number(l.pu)||0)*100)/100;
  this.pdfLire=pdfLire; this.pdfDessinerPage=pdfDessinerPage; this.docPdfStr=docPdfStr;`, W);
/* un faux contexte 2D : il ne dessine rien, il NOTE (textes, rectangles remplis), et mesure un texte à 0,5 em par signe */
const fauxCtx = () => { const n = { textes: [], remplis: 0, etat: [] };
  return { n, save() {}, restore() {}, setTransform() {}, transform() {}, translate() {}, scale() {}, beginPath() {}, closePath() {}, rect() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {},
    fill() { n.remplis++; }, stroke() {}, clip() {}, fillRect() {}, drawImage() {}, setLineDash() {}, fillText(t) { n.textes.push(String(t)); }, measureText: t => ({ width: String(t).length * 50 }),
    set fillStyle(x) {}, set strokeStyle(x) {}, set lineWidth(x) {}, set font(x) {}, set lineCap(x) {}, set lineJoin(x) {}, set textBaseline(x) {}, set lineDashOffset(x) {} }; };
const DETAIL = '• Rénovation complète d’installation avec remplacement de pompe : intervention réalisée en une seule visite avec test de fonctionnement, garantie pièces et main d’œuvre d’un an, et une fin de ligne FINZORQ.';
const lignes = Array.from({ length: 22 }, (_, k) => ({ designation: 'Ligne ' + (k + 1) + ' — fourniture et pose d’un équipement complet', qte: k + 1, pu: 100 }));
const dv = { id: 'd1', num: 'DEV-2026-003', clientId: 'c1', date: '2026-11-05', tva: 20, notes: DETAIL, lignes };
for (const [nom, pdf] of [['devis', W.docPdfStr('devis', dv, null)], ['facture', W.docPdfStr('factures', Object.assign({}, dv, { num: 'FA-2026-001', statut: 'envoyee' }), null)]]) {
  let pages = null; try { pages = W.pdfLire(pdf); } catch (e) { pages = String(e.message); }
  const attendu = +((/\/Count (\d+)/.exec(pdf) || [0, 0])[1]);
  vrai(nom + ' : pdfLire lit autant de pages que le PDF en déclare (' + attendu + ')', Array.isArray(pages) && pages.length === attendu && attendu >= 2, Array.isArray(pages) ? pages.length : pages);
  if (!Array.isArray(pages)) continue;
  const tj = [...pdf.matchAll(/\(((?:\\.|[^\\)])*)\) Tj/g)].length;
  let dessines = 0, inconnus = [], textes = [];
  for (const pg of pages) { const c = fauxCtx(); const r = W.pdfDessinerPage(c, pg, 1.5, {}); dessines += c.n.textes.length; textes = textes.concat(c.n.textes); inconnus = inconnus.concat(r.inconnus); }
  v(nom + ' : ⛔ chaque texte du PDF est dessiné (autant de fillText que de Tj)', dessines, tj);
  v(nom + ' : aucun opérateur inconnu (sinon l\'aperçu retombe sur le lecteur du navigateur)', inconnus, []);
  const tout = textes.join(' ');
  vrai(nom + ' : les accents, l\'euro et les apostrophes WinAnsi sont rendus en clair (é, ’, œ) — et la fin du DÉTAIL est là', /Rénovation/.test(tout) && /d’installation/.test(tout) && /œuvre/.test(tout) && /FINZORQ/.test(tout), tout.slice(0, 200));
}

console.log('\n── 3258 · 2. plus aucun onglet pour un aperçu ──');
const corps = (nom) => { const i = CODE.indexOf('function ' + nom + '('); if (i < 0) return ''; const fins = ['\nfunction ', '\nasync function ', '\nviews.', '\nconst ', '\nlet '].map(m => CODE.indexOf(m, i + 10)).filter(x => x > 0); return CODE.slice(i, Math.min(...fins)); };
const feuille = corps('pdfFeuille');
vrai('la fenêtre PDF est plein écran et dessine le document DANS la fenêtre (pdfAfficher)', /pdff pdff-plein/.test(feuille) && /await pdfAfficher\(document\.getElementById\('pdff-vue'\),chaine,/.test(feuille), feuille.slice(0, 120));
vrai('⛔ plus de bouton « Aperçu » qui ouvrait un onglet', !/b\('voir'/.test(feuille));
vrai('⛔ pdfFAction n\'ouvre jamais d\'onglet', !/window\.open/.test(corps('pdfFAction')));
for (const f of ['pdfApercuGrand', '_bonPdfOpenObj', 'ptPdf', 'papImplApercu'])
  vrai(f + ' passe par la fenêtre PDF de l\'application, sans window.open', /pdfFeuille\(\{/.test(corps(f)) && !/window\.open/.test(corps(f)), corps(f).slice(0, 160));
vrai('l\'aperçu du Devis IA se dessine aussi (pdfApercuPoser → pdfAfficher)', /await pdfAfficher\(box,chaine,\{url:u\}\)/.test(corps('pdfApercuPoser')));
vrai('un opérateur inconnu ou un échec : repli sur le lecteur du navigateur DANS la zone (iframe), jamais un onglet', /const repli=/.test(corps('pdfAfficher')) && /<iframe title="Aperçu du document"/.test(corps('pdfAfficher')) && !/window\.open/.test(corps('pdfAfficher')));

console.log('\n── 3258 · 3. la vraie srvMail : un envoi qui échoue ne s\'échappe plus dans Mail ──');
const FNM = tranche(APP, 'async function envoiBoiteResoudre(', '/* un courriel IDENTIQUE');
vrai('srvMail et ses aides sont trouvées', FNM.includes('async function srvMail('), FNM.length);
const monde = (o) => { const M = { console, JSON, String, Math, Date, Array, Number, Object, Promise, parseInt, encodeURIComponent, __req: [], __toasts: [], __hrefs: [], __rep: o.rep };
  M.fetch = async (u, init) => { if (/\/api\/sendmail/.test(u)) M.__req.push(JSON.parse(init.body)); if (o.panne) throw new Error('réseau'); const r = M.__rep; return { ok: r.ok, status: r.status, json: async () => r.body || {} }; };
  M.location = {}; Object.defineProperty(M.location, 'href', { set(x) { M.__hrefs.push(String(x)); }, get() { return 'http://essai/app.html'; } });
  M.document = { getElementById: () => null }; M.MutationObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };
  M.openModal = () => {}; M.closeModal = () => {}; M.toast = t => M.__toasts.push(String(t)); M.pushNotify = () => {};
  M.localStorage = { _: {}, getItem(k) { return this._[k] || null; }, setItem(k, x) { this._[k] = String(x); } }; M.navigator = { userAgent: '' };
  vm.createContext(M);
  vm.runInContext(`const PUSH_API='http://essai'; const BETA_ESSAI=false; let _srvMailErr=''; let _mailboxes=[]; async function loadMailboxes(){ return _mailboxes; }
    async function enteteEquipe(h){ return h||{}; } function syncTeam(){ return 'ent-3258'; } function todayISO(){ return '2026-11-05'; }
    function mailBoxFor(){ return ${o.boite ? JSON.stringify(o.boite) : 'null'}; } function can(){ return true; } var currentUser={ id:'u1', role:'admin' };
    var db={ mailFrom:'Toka Clim', entreprise:${JSON.stringify(o.ent || {})}, users:[{id:'u1',role:'admin'}] }; function mailBrandName(){ return 'Toka Clim'; }
    function esc(x){ return String(x==null?'':x); } function entPose(k,v){ db.entreprise[k]=v; } function save(){} function confirm(){ return false; }
    function mailConnect(){} function oauthBoutonsHtml(){ return ''; } function oauthBoutonsMontrer(){}
    ${FNM}
    this.srvMail=srvMail;`, M); return M; };
(async () => {
  const atts = [{ filename: 'Devis-DEV-2026-003.pdf', content: 'JVBERi0x' }];
  for (const [cas, o] of [['le serveur d\'envoi refuse (pas de boîte, adresse de Mon entreprise)', { ent: { email: 'contact@toka.invalid' }, rep: { ok: false, status: 403, body: { error: 'accès refusé' } } }],
      ['la boîte de l\'entreprise refuse', { boite: { user: 'f@toka.invalid', pass: 'x', host: 'smtp.essai' }, rep: { ok: false, status: 500, body: { error: 'Invalid login' } } }],
      ['le serveur est injoignable', { ent: { email: 'contact@toka.invalid' }, panne: true }]]) {
    const M = monde(o);
    const r = await M.srvMail('client@dehors.invalid', 'Devis DEV-2026-003 — Toka Clim', 'Bonjour', '', 'devis', null, { atts, mailtoBody: 'Bonjour (texte)' });
    v(cas + ' : srvMail rend faux (le devis reste brouillon)', r, false);
    v(cas + ' : ⛔ AUCUN brouillon mailto: ouvert (le client ne reçoit pas un devis sans devis)', M.__hrefs, []);
    vrai(cas + ' : l\'écran dit que rien n\'est parti', M.__toasts.some(t => /rien n.est parti/i.test(t)), M.__toasts);
  }
  const M = monde({ ent: { email: 'contact@toka.invalid' }, rep: { ok: true, status: 200 } });
  const r = await M.srvMail('client@dehors.invalid', 'Devis', 'Bonjour', '', 'devis', null, { atts });
  vrai('un envoi accepté part PAR L\'APPLICATION, PDF joint, au nom de l\'entreprise (réponse à Mon entreprise)', r === true && M.__req.length === 1 && M.__req[0].atts[0].filename === 'Devis-DEV-2026-003.pdf' && M.__req[0].brand && M.__req[0].brand.replyTo === 'contact@toka.invalid', M.__req);
  vrai('⛔ plus aucune affectation `location.href=\'mailto:` dans srvMail (texte du code, commentaires retirés)', !/mailto:/.test(corps('srvMail')));

  console.log('\n── 3258 · 4. la bêta n\'a qu\'un espace ──');
  const bloc = tranche(BETA, '(function betaEspaceUnique(){', '(function espaceHerite(){');
  vrai('le bloc de convergence est dans beta.html, AVANT espaceHerite', bloc.length > 100 && BETA.indexOf('(function betaEspaceUnique(){') < BETA.indexOf('(function espaceHerite(){'), bloc.length);
  vrai('… et il n\'existe pas dans app.html (la production n\'a qu\'une entreprise par appareil, choisie par son lien)', !APP.includes('(function betaEspaceUnique('));
  vrai('betaEspaceRejoindre ne fait rien hors de la bêta', /function betaEspaceRejoindre\(\)\{ if\(!BETA_ESSAI\) return;/.test(APP));
  const joue = (ls, ss) => { const L = { _: Object.assign({}, ls), getItem(k) { return this._[k] === undefined ? null : this._[k]; }, setItem(k, x) { this._[k] = String(x); } };
    const S = { _: Object.assign({}, ss || {}), getItem(k) { return this._[k] === undefined ? null : this._[k]; } };
    const B = { localStorage: L, sessionStorage: S }; vm.createContext(B);
    vm.runInContext(`const FB_TEAM='opgestion-beta'; const SYNC_SECRET_DEFAULT='SECRET-DEFAUT';\n` + bloc, B); return L._; };
  const SD = 'SECRET-DEFAUT';
  v('l\'ancien nom (elan-gestion-beta) passe sur opgestion-beta, sa clé reste la même (rien ne devient illisible)',
    (x => [x.elanB_sync_team, x.elanB_sync_secret, x.elanB_espace_migre])(joue({ elanB_sync_team: 'elan-gestion-beta', elanB_sync_secret: SD })), ['opgestion-beta', SD, 'elan-gestion-beta']);
  v('un appareil connecté (session) sans espace rejoint opgestion-beta', (x => [x.elanB_sync_team, x.elanB_sync_secret, x.elanB_sync_on])(joue({ elanB_session: 'u1' })), ['opgestion-beta', SD, '1']);
  v('… une session dans sessionStorage compte aussi', joue({}, { elanB_session: 'u1' }).elanB_sync_team, 'opgestion-beta');
  v('un appareil NEUF sans session ne rejoint rien avant la connexion (la connexion le rattache)', joue({}).elanB_sync_team, undefined);
  v('⛔ un appareil sur un AUTRE espace (une entreprise, par un lien) ne bouge pas tout seul', joue({ elanB_sync_team: 'ent-xyz', elanB_sync_secret: 'cle-ent', elanB_session: 'u1' }).elanB_sync_team, 'ent-xyz');
  v('l\'espace de la bêta reste tel quel', joue({ elanB_sync_team: 'opgestion-beta', elanB_sync_secret: SD }).elanB_sync_team, 'opgestion-beta');
  v('une synchro coupée exprès (sync_on=0) le reste', joue({ elanB_sync_team: 'elan-gestion-beta', elanB_sync_on: '0' }).elanB_sync_on, '0');
  vrai('rejoindre la bêta depuis un autre espace passe par espaceQuitter (on n\'emporte pas les données d\'une entreprise) et une confirmation',
    /function betaEspaceRejoindre\(\)\{[\s\S]{0,700}confirm\([\s\S]{0,400}espaceQuitter\(\);/.test(BETA));
  /* le 403 d'une route mail, dit en geste : la VRAIE courrierRefusBeta (partagée par la Boîte mail et la connexion Google/Microsoft), jouée */
  { const RB = decoupe('function courrierRefusBeta(){');
    const joueRB = (beta, autre, jeton) => { const S = { BETA_ESSAI: beta, window: {}, setTimeout: () => 0, betaEspaceAutre: () => autre, betaEspaceRejoindre() {},
      localStorage: { getItem: k => k === 'elan_beta_jeton' ? jeton : null } }; vm.createContext(S); vm.runInContext(RB + ';this.r=courrierRefusBeta();', S); return S.r; };
    vrai('(tranche trouvée) courrierRefusBeta', RB.length > 200, RB.length);
    v('la Boîte mail de la bêta dit QUOI FAIRE sur un 403 : autre espace → le rejoindre ; sans jeton → se reconnecter ; en règle → rien ; production → rien',
      [/rejoins l’espace de la bêta/.test(joueRB(true, 'teste', 'j')), /déconnecte-toi puis reconnecte-toi une fois/.test(joueRB(true, '', null)), joueRB(true, '', 'j'), joueRB(false, 'teste', null)],
      [true, true, '', '']);
    vrai('… et la source du Courrier comme la connexion par autorisation passent par elle sur un 403', /if\(r\.status===403\)\{ const m=courrierRefusBeta\(\); if\(m\) return new Error\(m\); \}/.test(CODE) && /if\(cb&&r\.status===403\)\{ const m=courrierRefusBeta\(\); if\(m\) return dire\(m\); \}/.test(CODE)); }
  console.log(`\n${ok} ✓  ${ko} ✗`); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc interrompu : ' + (e && e.stack || e)); console.log(`\n${ok} ✓  ${ko + 1} ✗`); process.exit(1); });
