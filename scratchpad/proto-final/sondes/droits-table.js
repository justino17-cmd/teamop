// COMPLÉTUDE de la table des gestes (étape 5 · D3) : sans navigateur. Recense tous les data-<famille>="verbe|…" de la page et demande à LA fonction de la page (geste, extraite du fichier,
// pas recopiée) comment chacun est classé. Un verbe qu'aucune liste ne nomme (« règle 4 ») ou une famille inconnue dont le verbe a la forme d'une écriture fait TOMBER le contrôle en le NOMMANT :
// c'est la garantie contre les voies qui écrivent des gestes neufs en parallèle. À rejouer à CHAQUE poussée.
const fs = require('fs'), vm = require('vm');
const { recenser, PAGE } = require('./droits-recensement.js'), L = require('../lib.js'), v = L.v;
const src = fs.readFileSync(PAGE, 'utf8');
const i0 = src.indexOf('const GESTES = {'), i1 = src.indexOf('const DROITS_REFUS = [];');
v('le bloc de la table est trouvé dans la page (une tranche vide passerait au vert sur tout)', i0 > 0 && i1 > i0, [i0, i1]);
const bloc = src.slice(i0, i1);
const ctx = vm.createContext({ route:'x', ROUTE_DROIT:{}, droitForme:() => 'equipe', eqDe:() => null, acteur:() => 'x' });
vm.runInContext(bloc + '\nthis.geste = geste; this.GESTES = GESTES; this.DROIT_CASES = DROIT_CASES; this.GESTE_ECRITURE = GESTE_ECRITURE;', ctx);
const { geste, GESTES, DROIT_CASES } = ctx;
const fam = recenser(src);
let nF = 0, nV = 0; const non = [], inconnus = [], compte = { c:0, m:0, s:0, l:0 }, parCat = {};
for (const [f, V] of Object.entries(fam)) { nF++;
  for (const verbe of Object.keys(V)) { nV++; const g = geste(f, verbe);
    if (!g) { compte.l++; continue; } compte[g.x]++; parCat[g.cat || '(écran)'] = (parCat[g.cat || '(écran)'] || 0) + 1;
    if (g.classe === false) (g.inconnu ? inconnus : non).push(f + '|' + verbe + ' (ligne ' + V[verbe][0] + ')'); } }
console.log(`  · ${nF} familles, ${nV} verbes : ${compte.c} créer, ${compte.m} modifier, ${compte.s} supprimer, ${compte.l} lecture ; par catégorie ${JSON.stringify(parCat)}`);
v('population : plus de 200 familles et de 900 verbes recensés', nF > 200 && nV > 900, { nF, nV });
v('chaque verbe d\'une famille CONNUE est nommé par la table (écriture, lecture, ou motif de lecture) : aucun « modifier » par défaut', non.length === 0, non.slice(0, 40));
v('chaque verbe d\'une famille INCONNUE a la forme d\'une lecture (sinon la famille entre dans la table)', inconnus.length === 0, inconnus.slice(0, 40));
// les familles de la table qui n'existent plus dans la page : une décision prise pour du vide (les verbes de data-vh construits à la volée ne se lisent pas : on ne compte que les familles)
const vides = Object.keys(GESTES).filter(f => !fam[f] && !fam.__dyn.has(f) && f !== 'action'); v('chaque famille de la table existe dans la page', vides.length === 0, vides);
// les cases qui ont un geste derrière elles : au moins une par catégorie qui a un écran (sinon la case « Créer » d'une rubrique ne mène à rien)
const cats = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
v('chaque catégorie a au moins une case de geste', cats.every(c => (c in DROIT_CASES) && DROIT_CASES[c].size > 0), Object.fromEntries(cats.map(c => [c, DROIT_CASES[c] ? [...DROIT_CASES[c]] : []])));
// la définition d'une écriture est UNE : la même expression que la page
v('GESTE_ECRITURE est celui de la page (une seule définition)', Object.prototype.toString.call(ctx.GESTE_ECRITURE) === '[object RegExp]' && src.split('const GESTE_ECRITURE').length === 2, null);
process.exit(L.bilan() ? 1 : 0);
