/* ══ 1303 · MODULES OP : UN BOUTON QUI NE CHANGE RIEN ET UN TITRE QUI MENT (admin#4) ══
   Rapport du testeur, 16 octobre 2026 : « Afficher dans le menu / Masquer du menu » ne changeait que son propre
   libellé et `localStorage.elan_aside` ; le menu (administrateur comme technicien) restait identique, et le
   sous-titre disait « Masqués — interface 100 % Organilog » alors que les dix rubriques étaient dans le menu.

   MESURE (pas de câblage à l'aveugle — la décision se prend sur ce que le réglage commande vraiment) :
   `showAside()` n'est lu que dans le DÉFAUT de `userSeesModule` / `moduleHeriteRole`, c'est-à-dire pour une
   rubrique absente de la table du rôle. Or `defaultPerms()` donne une valeur à chaque rubrique du menu, pour
   chaque rôle (test-820) : ce défaut n'est plus atteint. Ce banc le MESURE avec les vraies fonctions —
   mêmes réponses réglage « affiché » ou « masqué » — puis garde l'écran : plus de bouton, plus de titre faux.
   `showAside()` reste (la reprise de la v585 le lit, test-820 la joue) : on retire ce qui ne servait à rien.   */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const tranche = (debut, fin) => { const i = SRC.indexOf(debut); if (i < 0) return ''; const j = SRC.indexOf(fin, i); return j < 0 ? '' : SRC.slice(i, j + fin.length); };

console.log('\n── 1303 · 0. la population ──');
const NAV = tranche('const NAV = [', '\n];'), DP = bloc('function defaultPerms(){'), TDR = bloc('function tableDuRole(role){'), MR = bloc('function moduleReglage(u,k){'),
  USM = bloc('function userSeesModule(u,k,horsSusp'), MOD = bloc('views.modulesElan=function(){'), SA = ligne('function showAside(){');
v('les pièces sont trouvées', [NAV.length > 1500, DP.length > 1500, !!TDR, !!MR, USM.length > 500, MOD.length > 400, !!SA], [true, true, true, true, true, true, true]);

console.log('\n── 1303 · 1. MESURE : le réglage « afficher dans le menu » ne commande plus rien ──');
function monde(aside) {
  const ctx = { console, JSON, Math, Object, Array, String, Set, RegExp, __aside: aside, localStorage: { getItem: k => (k === 'elan_aside' && ctx.__aside ? '1' : null) }, db: {} };
  vm.createContext(ctx);
  vm.runInContext(`${NAV}\n${DP}\n${TDR}\n${MR}\n${SA}
    function planBloque(){ return false; } function metierBloque(){ return false; } function catBloque(){ return false; } function validationsOuvertes(){ return false; }
    function estMetier3D(){ return true; }   /* v778 : le texte d'introduction de « Modules OP » dit « 3D » à la 3D seule */
    function rubExplication(){ return ''; } function rubExplHtml(){ return ''; }   /* v773 : les explications des rubriques sont le sujet de test-2953 */
    ${USM}
    db.permissions=defaultPerms();`, ctx);
  return ctx;
}
const A = monde(false), B = monde(true);
const aside = vm.runInContext("NAV.flatMap(function(g){ return g.items; }).filter(function(x){ return x.aside; }).map(function(x){ return x.k; })", A);
vrai('population : le menu compte des rubriques « mises de côté » (' + aside.length + ')', aside.length >= 8, aside);
for (const r of ['technicien', 'commercial', 'compta', 'dr', 'chefEquipe']) {
  const lire = W => aside.map(k => vm.runInContext(`userSeesModule({role:'${r}',acces:{}},'${k}')`, W));
  const a = lire(A), b = lire(B);
  vrai(r + ' : population : ' + a.filter(Boolean).length + ' rubriques ouvertes sur ' + aside.length + ' (une mesure qui ne compte que des fermées ne prouverait rien)', a.length === aside.length && (a.some(Boolean) || r === 'compta'), a);
  v('⛔ ' + r + ' : mêmes rubriques ouvertes, réglage « affiché » ou « masqué »', b, a);
}
v('contre-épreuve : le drapeau lu par showAside bascule bien (la mesure joue les deux états)', [vm.runInContext('showAside()', A), vm.runInContext('showAside()', B)], [false, true]);

console.log('\n── 1303 · 2. l’écran ne promet plus un bouton ni un état qui n’existent pas ──');
{ const rendu = { titre: '', sous: '', action: undefined, html: '' };
  const ctx = { console, JSON, Math, Object, Array, String, Set, RegExp, currentUser: { role: 'admin' }, db: {} };
  vm.createContext(ctx);
  vm.runInContext(`${NAV}
    function userSeesModule(){ return true; } function estMetier3D(){ return true; } function esc(s){ return String(s); } function rubExplication(){ return ''; } function rubExplHtml(){ return ''; }
    function setHeader(t,s,a){ __r.titre=t; __r.sous=s; __r.action=a; } function $(){ return { set innerHTML(h){ __r.html=h; } }; }
    ${SA}`, Object.assign(ctx, { __r: rendu, localStorage: { getItem: () => null } }));
  vm.runInContext('var views={}; ' + MOD, ctx); vm.runInContext('views.modulesElan()', ctx);
  vrai('l’écran se rend (la liste des rubriques mises de côté)', /pl-row/.test(rendu.html) && (rendu.html.match(/class="pl-row"/g) || []).length >= 5, rendu.html.length);   // v780 : les rubriques regroupées (cache:1) vivent dans leur écran parent
  vrai('⛔⛔ plus de bouton « Afficher dans le menu / Masquer du menu » (il ne changeait rien)', !rendu.action && !/Afficher dans le menu|Masquer du menu|elan_aside/.test(rendu.html + (rendu.action || '')), rendu.action);
  vrai('⛔⛔ le sous-titre ne dit plus « Masqués — interface 100 % Organilog »', !/Masqués|Organilog/.test(rendu.sous + rendu.titre + rendu.html), rendu.sous);
  vrai('… le texte ne promet plus de « ré-afficher dans le menu »', !/ré-afficher|réafficher/.test(rendu.html), rendu.html.slice(0, 300));
  vrai('… et il dit où se règle la place dans le menu (Permissions)', /Permissions/.test(rendu.html) || /Permissions/.test(rendu.sous), rendu.sous); }

console.log('\n── 1303 · 3. plus aucun écrivain de elan_aside dans l’application ──');
vrai('⛔ aucun `setItem(\'elan_aside\'…)` (le réglage ne s’écrit plus depuis nulle part)', !/setItem\(\s*['"]elan_aside['"]/.test(SRC));
vrai('showAside reste lu par la reprise de la v585 (test-820 la joue) : on ne retire que ce qui était mort', /function moduleHeriteRole\(role,k\)\{[\s\S]{0,400}showAside\(\)/.test(SRC));

console.log(`\n════ test-1303 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
