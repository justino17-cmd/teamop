/* ══ LES DROITS DE DÉPART : UNE SEULE LISTE, RÔLE PAR RÔLE (v752) ══════════════════════════════
   Justin, 26 septembre 2026 : « Fais ta liste ». Ce qu'un compte voit au menu dans une entreprise
   NEUVE, tant que personne n'a rien coché ni décoché, vient désormais d'UNE liste complète —
   `defaultPerms()` — pour les cinq rôles et toutes les rubriques.

   Jusqu'à la v751, deux sources décidaient, et elles ne disaient pas la même chose : une ancienne
   table de trois rôles, et, pour tout le reste, la règle générale de la reprise. Mesuré avec les
   vraies fonctions : divergence dans les deux sens, la règle générale aurait retiré Comptabilité
   à la comptabilité, « Assistant devis » menait tous les rôles à un cadenas, et « Devis
   xylophage » dépendait du réglage d'AFFICHAGE du téléphone qui faisait la reprise.

   Ce banc EXÉCUTE les vraies fonctions du fichier livré — la liste, le vrai `seed()`, le vrai
   `migrate()`, la reprise (`reprendreDroitsImplicites`, `moduleHeriteRole`, `CAPS_HERITE`),
   `moduleReglage` et `userSeesModule`, sur la vraie table du menu (`NAV`, `SOUS_CATS`) :
   1. la population ;
   2. la liste est COMPLÈTE : chaque rubrique et sous-catégorie, pour chaque rôle, un booléen ;
   3. une entreprise NEUVE voit EXACTEMENT la liste — quel que soit l'appareil qui fait la reprise ;
   4. aucune impasse : une rubrique dont l'écran exige un droit que le rôle n'a pas d'office reste
      fermée (et le banc vérifie que l'écran l'exige TOUJOURS, sinon la règle serait périmée) ;
   5. les décisions de métier tiennent (ancres) ;
   6. ⛔ RIEN NE CHANGE CHEZ UNE ENTREPRISE QUI EXISTE (ELAN) : avec la vraie liste ou une liste
      EMPOISONNÉE, chaque rôle voit la même chose — la liste ne se lit que pour une base neuve ;
   7. une entreprise d'AVANT qui fait sa reprise maintenant retrouve la règle d'hier, à l'identique.
   Le comportement dans la vraie page (menu d'un technicien d'une entreprise neuve, après un vrai
   `save()`) est dans `scratchpad/sonde-droits-depart.js`.                                        */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* Découpe par accolades appariées sur le texte BRUT — la méthode de test-731, qui exécute déjà
   le vrai seed() et le vrai migrate() avec elle. */
function bloc(debut) {
  const i = BRUT.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = BRUT.indexOf('{', i); k < BRUT.length; k++) {
    if (BRUT[k] === '{') p++; else if (BRUT[k] === '}') { p--; if (!p) return BRUT.slice(i, k + 1); } }
  return '';
}
const constante = (debut, fin) => { const i = BRUT.indexOf(debut); if (i < 0) return ''; const j = BRUT.indexOf(fin, i); return j < 0 ? '' : BRUT.slice(i, j + fin.length); };
const ligne = debut => { const i = BRUT.indexOf(debut); return i < 0 ? '' : BRUT.slice(i, BRUT.indexOf('\n', i)); };

console.log('\n── 820 · 1. la population ──');
const P = {
  NAV: constante('const NAV = [', '\n];'), SOUS_CATS: ligne('const SOUS_CATS=['), CAPS_HERITE: constante('const CAPS_HERITE = {', '\n};'),
  defaultPerms: bloc('function defaultPerms(){'), moduleHeriteRole: bloc('function moduleHeriteRole(role,k){'),
  reprise: bloc('function reprendreDroitsImplicites(){'), moduleReglage: bloc('function moduleReglage(u,k){'),
  userSeesModule: bloc('function userSeesModule(u,k){'), seed: bloc('function seed(){'), migrate: bloc('function migrate('),
  slugNom: bloc('function slugNom('), idCatalogue: bloc('function idCatalogue('), vueAssistant: bloc('views.assistantDevis=function(){'),
};
v('toutes les pièces sont trouvées dans le fichier réel', Object.keys(P).filter(k => !P[k]), []);
v('… une seule définition de defaultPerms', BRUT.split('function defaultPerms(').length - 1, 1);

/* Le monde. `poison` remplace la liste par une autre, pour prouver qui la lit et qui ne la lit pas. */
function monde(opts) {
  const o = opts || {};
  const iCat = BRUT.indexOf('const CATALOGUE=');
  const cat = BRUT.slice(iCat, BRUT.indexOf('\n', BRUT.indexOf('];', iCat)));
  const liste = o.poison ? `function defaultPerms(){ return ${JSON.stringify(o.poison)}; }` : P.defaultPerms;
  let n = 0;
  return new Function('uid', 'BETA_ESSAI', 'ID_ADMIN_DEPART', 'CAT_LIST', 'DASH_DEFAULT', 'FOURS_VER', 'PRIX_VER', 'console', `
    let db = {}; const ASIDE = { v: false }; function showAside(){ return ASIDE.v; }
    function planBloque(){ return false; } function metierBloque(){ return false; }
    function logEvent(){} function userCap(){ return false; }
    ${cat}
    ${ligne('const isoDe = d =>')}
    ${ligne('const todayISO = () =>')}
    ${P.slugNom}
    ${P.idCatalogue}
    ${P.NAV}
    ${P.SOUS_CATS}
    ${P.CAPS_HERITE}
    ${liste}
    ${P.moduleHeriteRole}
    ${P.reprise}
    ${P.moduleReglage}
    ${P.userSeesModule}
    ${P.seed}
    ${P.migrate}
    return { NAV, SOUS_CATS, CAPS_HERITE, ASIDE, defaultPerms, moduleHeriteRole, seed, migrate,
      reprise: base => { db = base; return reprendreDroitsImplicites(); },
      voit: (base, role, k) => { db = base; return userSeesModule({ role }, k); } };`)(
    () => 'u' + (++n), false, 'admin0', [], [], 1, 1, { log() {}, warn() {}, error() {} });
}
let M = null;
try { M = monde(); } catch (e) { console.log('      (extraction : ' + e.message + ')'); }
vrai('⛔ les vraies fonctions s’exécutent ensemble (liste, seed, migrate, reprise, menu)', !!M);
if (!M) { console.log(`\n════ test-820 : ${ok} ✓ ${ko} ✗ ════`); process.exit(1); }

const ROLES = ['technicien', 'commercial', 'compta', 'dr', 'chefEquipe'];
const CLES = []; for (const g of M.NAV) for (const it of g.items) { CLES.push(it.k); for (const s of M.SOUS_CATS.filter(s => s.parent === it.k)) CLES.push(s.k); }
vrai('population : le menu a ses quarante rubriques et plus (' + CLES.length + ')', CLES.length >= 40);
v('population : les cinq rôles de la reprise sont les cinq de la liste, l’administrateur à part',
  Object.keys(M.CAPS_HERITE).filter(r => r !== 'admin').sort(), ROLES.slice().sort());

console.log('\n── 820 · 2. la liste est complète ──');
const L = M.defaultPerms();
v('⛔ les cinq rôles, et eux seuls', Object.keys(L).sort(), ROLES.slice().sort());
for (const r of ROLES) {
  const manque = CLES.filter(k => typeof (L[r] || {})[k] !== 'boolean');
  const inconnu = Object.keys(L[r] || {}).filter(k => !CLES.includes(k));
  v(`⛔ ${r} : une valeur pour chaque rubrique et sous-catégorie (${CLES.length})`, manque, []);
  v(`… ${r} : aucune clé que le menu ne connaît pas`, inconnu, []);
}
vrai('chaque appel rend une copie neuve (une base ne partage pas sa table avec la suivante)', M.defaultPerms() !== M.defaultPerms() && M.defaultPerms().technicien !== M.defaultPerms().technicien);

console.log('\n── 820 · 3. une entreprise NEUVE voit exactement la liste — quel que soit l’appareil ──');
function neuve(aside) {
  M.ASIDE.v = aside;
  const base = M.seed(); M.migrate(base); M.reprise(base);   // premier chargement : seed, migrate, puis boot() fait la reprise
  const vu = {}; for (const r of ROLES) vu[r] = CLES.filter(k => M.voit(base, r, k));
  M.ASIDE.v = false; return { base, vu };
}
const N0 = neuve(false), N1 = neuve(true);
for (const r of ROLES) {
  v(`⛔ ${r} voit exactement la liste`, N0.vu[r], CLES.filter(k => L[r][k]));
  v(`… ${r} : identique quand l’appareil qui fait la reprise affiche les modules mis de côté`, N1.vu[r], N0.vu[r]);
}
vrai('la reprise a bien tourné (les cases d’action sont posées)', !!(N0.base.permsRepris && N0.base.permissions.technicien.caps));
vrai('… et elle n’a ajouté AUCUNE rubrique aux tables de la liste', ROLES.every(r => Object.keys(N0.base.permissions[r]).filter(k => k !== 'caps').length === CLES.length));

console.log('\n── 820 · 4. aucune impasse ──');
/* Une rubrique ouverte dont l'écran exige un droit d'action que le rôle n'a pas d'office, c'est un
   cadenas au bout du menu. La relation se RELIT dans l'écran : si elle change, ce banc le dit. */
const EXIGE = { assistantDevis: 'devisIA' };
vrai('l’écran « Assistant devis » exige toujours « Utiliser Devis IA »', /if\(!can\('devisIA'\)/.test(P.vueAssistant), P.vueAssistant.slice(0, 120));
for (const r of ROLES) {
  const impasses = Object.entries(EXIGE).filter(([k, cap]) => L[r][k] && !M.CAPS_HERITE[r][cap]).map(([k]) => k);
  v(`⛔ ${r} : aucune rubrique ouverte qui mène à un cadenas`, impasses, []);
}

console.log('\n── 820 · 5. les décisions de métier tiennent ──');
const ouvert = (r, ks) => ks.filter(k => !L[r][k]), ferme = (r, ks) => ks.filter(k => L[r][k]);
v('la comptabilité garde Comptabilité, Statistiques, Enveloppes, Télécollecte, Factures',
  ouvert('compta', ['comptabilite', 'statistiques', 'enveloppes', 'telecollecte', 'factures']), []);
v('le technicien garde ses outils de terrain (registre, carte des box, consommation, demandes, commandes, brouillon, box)',
  ouvert('technicien', ['registre', 'carteBox', 'saisieConso', 'demandes', 'commandes', 'brouillon', 'boxes', 'stock', 'produitsDonnes']), []);
v('… et ne voit ni devis, ni factures, ni contrats, ni la comptabilité', ferme('technicien', ['devis', 'factures', 'contrats', 'comptabilite']), []);
v('le commercial voit la vente, pas le stock', [ouvert('commercial', ['devis', 'factures', 'contrats', 'clients']), ferme('commercial', ['stock', 'boxes', 'mouvements', 'produits'])], [[], []]);
v('⛔ personne d’autre que l’administrateur ne voit Utilisateurs', ROLES.filter(r => L[r].utilisateurs), []);

console.log('\n── 820 · 6. ⛔ rien ne change chez une entreprise qui existe ──');
/* Une base d'entreprise existante : ses tables sont écrites et sa reprise est faite. On la prend
   dans l'état où la v751 l'a laissée — tables écrites, quelques cases retouchées par
   l'administrateur, et même une clé ABSENTE (Produits donnés n'est jamais au menu, la reprise ne
   l'écrit pas) — puis on la charge avec la vraie liste et avec deux listes empoisonnées. */
function existante() {
  const base = M.seed(); M.migrate(base); M.reprise(base);
  base.permissions.technicien.telecollecte = false; base.permissions.commercial.boxes = true;
  delete base.permissions.dr.produitsDonnes; delete base.permissions.commercial.produitsDonnes;
  return JSON.parse(JSON.stringify(base));
}
const tout = val => Object.fromEntries(ROLES.map(r => [r, Object.fromEntries(CLES.map(k => [k, val]))]));
function charge(mondeX) {
  const base = existante(); mondeX.migrate(base); mondeX.reprise(base);
  const vu = {}; for (const r of ROLES) vu[r] = CLES.filter(k => mondeX.voit(base, r, k));
  return { vu, perms: JSON.stringify(base.permissions) };
}
const vrai0 = charge(M), ferme0 = charge(monde({ poison: tout(false) })), ouvert0 = charge(monde({ poison: tout(true) }));
v('⛔ liste tout FERMÉE : chaque rôle voit la même chose qu’avec la vraie liste', ferme0.vu, vrai0.vu);
v('⛔ liste tout OUVERTE : pareil', ouvert0.vu, vrai0.vu);
vrai('… et les tables de la base ne sont pas réécrites (octet pour octet)', ferme0.perms === vrai0.perms && ouvert0.perms === vrai0.perms);
vrai('population : la base existante porte bien une case retouchée et deux clés absentes',
  vrai0.perms.includes('"telecollecte":false') && !JSON.parse(vrai0.perms).dr.hasOwnProperty('produitsDonnes'));

console.log('\n── 820 · 7. une entreprise d’AVANT qui fait sa reprise maintenant retrouve la règle d’hier ──');
/* L'ancienne table de départ (jusqu'à la v751), telle que les entreprises d'avant l'ont reçue —
   une DONNÉE d'hier, pas une copie du code testé. La règle d'hier : ouvert, sauf l'administration
   et les modules mis de côté (appareil par défaut) ; DR et chef d'équipe : tout sauf Utilisateurs. */
const ANCIENNE = {
  technicien: { dashboard: true, planning: true, interventions: true, clients: true, rapports: true, registre: true, produits: true, boxes: true, stock: true, mouvements: true, enveloppes: false, demandes: true, commandes: true, vehicules: true, carteInt: true, carteBox: true, historique: true, pointage: true, devis: false, factures: false, contrats: false, messagerie: true, conducteurs: true, produitsDonnes: true, brouillon: true, saisieConso: true },
  commercial: { dashboard: true, planning: true, interventions: true, clients: true, rapports: true, registre: true, devis: true, factures: true, contrats: true, messagerie: true, carteInt: true, historique: true, pointage: true, demandes: true, produits: false, boxes: false, stock: false, mouvements: false, saisieConso: false, produitsDonnes: false, vehicules: false, conducteurs: false, carteBox: false, commandes: false, brouillon: false, enveloppes: false },
  compta: { dashboard: true, comptabilite: true, telecollecte: true, factures: true, devis: true, contrats: true, enveloppes: true, clients: true, planning: true, interventions: true, historique: true, rapports: true, messagerie: true, statistiques: true, registre: false, produits: false, boxes: false, stock: false, mouvements: false, saisieConso: false, produitsDonnes: false, vehicules: false, conducteurs: false, carteBox: false, carteInt: false, commandes: false, brouillon: false, demandes: false, archives: false, fournisseurs: false, secteurs: false, pointage: false },
};
const ITEMS = {}; for (const g of M.NAV) for (const it of g.items) ITEMS[it.k] = it;
const hier = (r, k) => (r === 'dr' || r === 'chefEquipe') ? k !== 'utilisateurs'
  : (ANCIENNE[r] && k in ANCIENNE[r]) ? ANCIENNE[r][k] : !(ITEMS[k] && (ITEMS[k].admin || ITEMS[k].aside));
const avant = M.seed(); avant.permissions = JSON.parse(JSON.stringify(ANCIENNE)); delete avant.permsRepris;
M.migrate(avant); M.reprise(avant);
for (const r of ROLES) v(`${r} : la reprise d’aujourd’hui rend exactement la règle d’hier`, CLES.filter(k => M.voit(avant, r, k)), CLES.filter(k => hier(r, k)));
vrai('… et migrate() n’a pas complété ses tables avec la nouvelle liste (dr et chef d’équipe viennent de la reprise)',
  !Object.prototype.hasOwnProperty.call(ANCIENNE, 'dr') && avant.permissions.dr.assistantDevis === true);

console.log(`\n════ test-820 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
