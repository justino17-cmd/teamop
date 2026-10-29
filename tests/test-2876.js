/* ══ test-2876 · L'ÉCRAN DES DROITS ET LES CATÉGORIES RETENUES PAR L'ENTREPRISE (relecture adverse de la v772) ═══════════════
   « Validation des mouvements » s'ouvre d'office à qui valide ou attend une validation (`validationsOuvertes`, v753). Quand TEAM OP
   ne retient pas cette rubrique pour l'entreprise, sa ligne reste affichée, grisée — mais sa valeur venait de
   `userSeesModule(u,'validations',false,true)`, qui compte cette ouverture d'office : « Valider » l'écrivait donc comme un
   réglage PROPRE de la personne (`acces.modules.validations=true`), qui lui restait quand la case de validation tombait ou que
   la rubrique était rouverte. La ligne ouverte évite ce piège avec `data-val-av` ; la branche « non retenue » l'ignorait.
   Correctif : la ligne grisée montre la valeur PROPRE (réglage de la personne, sinon liste du rôle, sinon fermé).
   Ce banc EXÉCUTE les vraies fonctions d'app.html ET de beta.html (`usrDroitsHtml`, `usrMenuLu`, `usrDroitsValider`, `catBloque`,
   `userSeesModule`…) : le HTML dessiné par la vraie fonction est relu en zone, puis « Valider » écrit ce qu'il écrit vraiment.
   Population comptée avant chaque absence. Le monde est celui de test-821 (la liste de départ et la reprise sont les vraies). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

function pieces(BRUT) {
  const bloc = debut => {
    const i = BRUT.indexOf(debut); if (i < 0) return '';
    let p = 0; for (let k = BRUT.indexOf('{', i); k < BRUT.length; k++) { if (BRUT[k] === '{') p++; else if (BRUT[k] === '}') { p--; if (!p) return BRUT.slice(i, k + 1); } }
    return '';
  };
  const constante = (debut, fin) => { const i = BRUT.indexOf(debut); if (i < 0) return ''; const j = BRUT.indexOf(fin, i); return j < 0 ? '' : BRUT.slice(i, j + fin.length); };
  const ligne = debut => { const i = BRUT.indexOf(debut); return i < 0 ? '' : BRUT.slice(i, BRUT.indexOf('\n', i)); };
  return {
    NAV: constante('const NAV = [', '\n];'), SOUS_CATS: ligne('const SOUS_CATS=['), VUE_PARENT: ligne('const VUE_PARENT='), CATS_TOUJOURS: ligne('const CATS_TOUJOURS='),
    avecSousCats: bloc('function avecSousCats(items){'),
    USER_CAPS: constante('const USER_CAPS=[', '\n];'), PERM_GRPS: ligne('const PERM_GRPS=['), PERM_GRP_OF: ligne('const PERM_GRP_OF='),
    PERM_SPECIAUX: ligne('const PERM_SPECIAUX={'), CAPS_HERITE: constante('const CAPS_HERITE = {', '\n};'), CAPS: ligne('const CAPS = Object.fromEntries('),
    defaultPerms: bloc('function defaultPerms(){'), moduleHeriteRole: bloc('function moduleHeriteRole(role,k){'), reprise: bloc('function reprendreDroitsImplicites(){'),
    tableDuRole: bloc('function tableDuRole(role){'), moduleReglage: bloc('function moduleReglage(u,k){'), userSeesModule: bloc('function userSeesModule(u,k,horsSusp'),
    capDeduitRegle: bloc('function capDeduitRegle(cap){'), userCap: bloc('function userCap(u,cap){'), can: bloc('function can(cap){'),
    catDeduitRegle: bloc('function catDeduitRegle(grp,droit){'), catDroit: bloc('function catDroit(u,grp,droit){'),
    valideSoumis: bloc('function valideSoumis(u){'), validationsOuvertes: bloc('function validationsOuvertes(u){'), validationsNote: bloc('function validationsNote(valideur){'),
    boxValidRequis: bloc('function boxValidRequis(){'), droitsBorner: bloc('function droitsBorner(nu,par){'),
    esc: ligne('const esc = s =>'), boxExclu: ligne('const boxExclu='), navLabel: bloc('function navLabel(k){'),
    catsCle: bloc('function catsCle(){'), catsConnues: bloc('function catsConnues(){'), catsListe: bloc('function catsListe(){'), catBloque: bloc('function catBloque(k){'),
    cats_: ligne('let _cats;'), catsConnues_: ligne('let _catsConnues;'),
    profilsDroits: bloc('function profilsDroits(){'), profilCompte: bloc('function profilCompte(pr){'), profilNomSw: ligne('const profilNomSw='),
    usrMenuLu: bloc('function usrMenuLu(zone,k){'), usrDroitsValider: bloc('function usrDroitsValider(uid,btn){'), usrDroitsHtml: bloc('function usrDroitsHtml(u,admin){'),
    /* l'explication d'une rubrique sous son nom (chantier métiers) : la vraie table et les deux vraies fonctions, pour que la ligne des droits se dessine telle qu'elle est servie */
    RUBRIQUES_INFO: constante('const RUBRIQUES_INFO={', '\n};'), rubExplication: ligne('function rubExplication(k){'), rubExplHtml: ligne('function rubExplHtml(k){'),
  };
}

/* Les entrées d'un HTML dessiné par la vraie fonction, relues comme le fait la page : une case par `data-d`, ses attributs `data-*` en dataset. */
function zoneDe(html) {
  const ins = [];
  const re = /<input type="checkbox" data-d="([^"]+)"([^>]*)>/g; let m;
  while ((m = re.exec(html))) {
    const attrs = m[2], dataset = {};
    attrs.replace(/ data-([a-z-]+)="([^"]*)"/g, (_, n, v) => { dataset[n.replace(/-([a-z])/g, (__, c) => c.toUpperCase())] = v; return ''; });
    ins.push({ checked: /(^| )checked( |$)/.test(attrs.replace(/ data-[a-z-]+="[^"]*"/g, '')), disabled: /(^| )disabled( |$)/.test(attrs.replace(/ data-[a-z-]+="[^"]*"/g, '')), dataset: Object.assign({ d: m[1] }, dataset) });
  }
  return { ins, querySelector(sel) { const x = /\[data-d="([^"]+)"\]/.exec(sel); if (!x) return null; return ins.find(i => i.dataset.d === x[1]) || null; },
    querySelectorAll() { return []; }, closest() { return null; } };
}

function monde(P, o) {
  o = o || {};
  const ctx = { Object, JSON, String, Set, Array, Math, console: { log() {}, warn() {}, error() {} }, localStorage: { getItem: () => null, setItem() {} },
    document: null, __plan: o.plan || [] };
  vm.createContext(ctx);
  vm.runInContext(`
    const BETA_ESSAI=false; const STORE_KEY='elan_gestion_v2';
    var currentUser=null; var db = { users: [], boxes: [], vehicules: [], profilsDroits: [] };
    function planBloque(k){ return __plan.includes(k); } function metierBloque(){ return false; } function capTxt(s){ return s; } function sansBox(){ return false; }
    function logEvent(){} function save(){} function toast(){} function t(x){ return x; }
    function estStockage(){ return false; } function showAside(){ return false; }
    function userBoxVoit(){} function userVehiculeVoit(){} function fullName(u){ return ((u.prenom||'')+' '+(u.nom||'')).trim()||u.login||''; }
    function btnFait(){ return false; } var views = { utilisateurs(){} }; function setTimeout(){}
    ${P.NAV}
    ${P.SOUS_CATS}
    ${P.VUE_PARENT}
    ${P.CATS_TOUJOURS}
    ${P.cats_}
    ${P.catsConnues_}
    ${P.avecSousCats}
    ${P.USER_CAPS}
    ${P.PERM_GRPS}
    ${P.PERM_GRP_OF}
    ${P.PERM_SPECIAUX}
    ${P.CAPS_HERITE}
    ${P.CAPS}
    ${P.esc}
    ${P.boxExclu}
    ${[P.catsCle, P.catsConnues, P.catsListe, P.catBloque].join('\n')}
    ${[P.defaultPerms, P.moduleHeriteRole, P.reprise, P.tableDuRole, P.moduleReglage, P.userSeesModule, P.capDeduitRegle, P.userCap, P.can,
       P.catDeduitRegle, P.catDroit, P.valideSoumis, P.validationsOuvertes, P.validationsNote, P.boxValidRequis, P.droitsBorner, P.navLabel].join('\n')}
    ${[P.profilsDroits, P.profilCompte, P.profilNomSw].join('\n')}
    ${[P.RUBRIQUES_INFO, P.rubExplication, P.rubExplHtml].join('\n')}
    ${[P.usrMenuLu, P.usrDroitsValider, P.usrDroitsHtml].join('\n')}
    db.permissions = defaultPerms(); reprendreDroitsImplicites();
    this.db = db; this.html = usrDroitsHtml; this.valider = usrDroitsValider; this.menuLu = usrMenuLu; this.voit = userSeesModule; this.bloque = catBloque;
    this.cats = c => { _cats = c; };
    this.poser = (k, x) => { if (k === 'currentUser') currentUser = x; if (k === 'document') document = x; };
  `, ctx);
  return ctx;
}

const valeurPropre = (u, k) => { const r = u.acces && u.acces.modules && Object.prototype.hasOwnProperty.call(u.acces.modules, k) ? u.acces.modules[k] : undefined; return r; };
for (const nomFichier of ['app.html', 'beta.html']) {
  const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', nomFichier), 'utf8');
  const P = pieces(BRUT);
  console.log('\n══ 2876/' + nomFichier + ' ══');
  const manque = Object.keys(P).filter(k => !P[k]);
  vrai('toutes les pièces sont trouvées dans le fichier réel', manque.length === 0, manque);
  let M = null; try { M = monde(P); } catch (e) { console.log('      (montage : ' + e.message + ')'); }
  vrai('les vraies fonctions s\'exécutent ensemble (liste de départ, reprise, catégories, éditeur des droits)', !!M);
  if (!M) continue;
  const interrupteur = h => { const m = /<input type="checkbox" data-d="mod_validations"[^>]*>/.exec(h); return m ? m[0] : ''; };
  const admin = { id: 'adm', role: 'admin' };
  const personne = (extra) => Object.assign({ id: 'uV', role: 'technicien', login: 'val', acces: { caps: {}, modules: {} } }, extra || {});
  const enregistrer = (u, html) => { M.db.users = [u]; M.poser('currentUser', admin); M.poser('document', { getElementById: id => id === 'usr-d-' + u.id ? zoneDe(html) : null }); M.valider(u.id); };

  console.log('\n── 1. « Validation des mouvements » NON retenue : l\'ouverture d\'office n\'est jamais écrite comme un réglage ──');
  M.cats(['planning', 'clients']);   // la rubrique n'est pas dans la liste de l'entreprise
  vrai('population : la rubrique est bien fermée par l\'entreprise (et « planning » ne l\'est pas)', M.bloque('validations') === true && M.bloque('planning') === false);
  { const u = personne({ acces: { caps: { validerDR: true }, modules: {} } });
    vrai('population : la personne VOIT la rubrique hors catégories, par l\'ouverture d\'office (sinon ce banc ne mesure rien)', M.voit(u, 'validations', false, true) === true && M.voit(u, 'validations') === false);
    const h = M.html(u, true), i = interrupteur(h);
    vrai('population : la ligne est dessinée', !!i, h.length);
    vrai('⛔ la ligne est grisée et ne montre PAS l\'ouverture d\'office (décochée : la valeur propre est « fermé »)', / disabled/.test(i) && !/ checked/.test(i), i);
    vrai('… elle n\'est PAS marquée « d\'office » (data-val-force : elle ne suit pas la case de validation, elle est grisée par l\'entreprise)', !/data-val-force/.test(i), i);
    egal('⛔⛔ ce que l\'éditeur LIT à l\'enregistrement (usrMenuLu) est la valeur PROPRE : fermé', M.menuLu(zoneDe(h), 'validations'), false);
    enregistrer(u, h);
    egal('⛔⛔ « Valider » n\'écrit PAS acces.modules.validations=true (l\'ouverture d\'office n\'est pas une décision)', valeurPropre(u, 'validations'), false);
    egal('… la case de validation, elle, est bien écrite', u.acces.caps.validerDR, true);
    vrai('… et toute autre ligne grisée s\'écrit comme avant (« factures » : retirée, à la valeur de la personne hors catégories)', typeof valeurPropre(u, 'factures') === 'boolean' && valeurPropre(u, 'factures') === M.voit(u, 'factures', false, true), valeurPropre(u, 'factures')); }
  { const u = personne({ boxValidDR: true });
    const h = M.html(u, true);
    enregistrer(u, h);
    egal('⛔ soumis à la validation (et non valideur) : pareil — rien d\'écrit', valeurPropre(u, 'validations'), false); }
  { const u = personne({ acces: { caps: { validerDR: true }, modules: { validations: true } } });
    const h = M.html(u, true), i = interrupteur(h);
    vrai('un réglage PROPRE ouvert : la ligne le montre (cochée, grisée)', / checked/.test(i) && / disabled/.test(i), i);
    enregistrer(u, h);
    egal('… et « Valider » le réécrit tel quel (ouvert)', valeurPropre(u, 'validations'), true); }
  { const u = personne({ acces: { caps: {}, modules: { validations: false } } });
    enregistrer(u, M.html(u, true));
    egal('un réglage PROPRE fermé, sans la case : reste fermé', valeurPropre(u, 'validations'), false); }

  console.log('\n── 2. contre-épreuves : retenue, ou sans réglage ──');
  M.cats(['planning', 'validations']);
  { const u = personne({ acces: { caps: { validerDR: true }, modules: {} } });
    const h = M.html(u, true), i = interrupteur(h);
    vrai('« Validation des mouvements » RETENUE : la ligne vivante d\'avant (ouverte d\'office, verrouillée)', / checked/.test(i) && /data-val-force="1"/.test(i) && !/data-val-cat/.test(i), i);
    enregistrer(u, h);
    egal('… et elle s\'écrit toujours à sa valeur propre (fermé)', valeurPropre(u, 'validations'), false); }
  M.cats(null);
  { const u = personne({ acces: { caps: { validerDR: true }, modules: {} } });
    const i = interrupteur(M.html(u, true));
    vrai('sans réglage de l\'entreprise : la ligne vivante, aucune trace de la branche « non retenue »', / checked/.test(i) && /data-val-force="1"/.test(i) && !/data-val-cat/.test(i), i); }
}
console.log('\n════ test-2876 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
