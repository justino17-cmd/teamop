/* ══ g19 · stock#5 — LE SEUIL D'ALERTE DE LA FICHE EST LU PAR L'ÉTAT « À COMMANDER » ══════════════════
   La fiche produit promet : « Seuil d'alerte — quand le stock passe à ce niveau ou en dessous, une
   alerte apparaît ». La cloche (`computeNotifs`) l'a toujours lu (« Stock bas : ALTA 7000 (5/10) »),
   mais `boxEtat(u)` jugeait sur un seuil FIXE (<=0 Épuisé, <=2 À commander) et ignorait `p.seuil` :
   Stock, Produits, le compteur « À commander » et le bon créé depuis le Stock disaient « En stock »
   en vert pour ce même produit. Deux notions de seuil, deux verdicts sur la même ligne.

   `boxEtat(u, seuil)` : avec un seuil défini (> 0), « À commander » jusqu'au seuil INCLUS (comme la
   cloche : q <= seuil) ; sans seuil (0, vide, illisible) le comportement d'avant est INCHANGÉ. Les
   appelants qui jugent un TOTAL (Stock, Produits, bon créé depuis le Stock) passent le seuil de la
   fiche ; ceux qui jugent la part d'UNE box ne le passent pas (le seuil se compare au total : une
   box qui en tient 5 sur 50 n'est pas « à commander »). Ce banc EXÉCUTE les vraies fonctions.        */
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

console.log('\n── 1162 · 0. la population ──');
const BE = bloc('function boxEtat('), RS = bloc('function renderStockList(){'), SB = bloc('function stockExportBon(){'), VS = bloc('views.stock=function(){'), RP = bloc('function renderProduitsList(){');
vrai('boxEtat, renderStockList, stockExportBon et renderProduitsList sont trouvés', BE.length > 100 && RS.length > 1500 && SB.length > 500 && RP.length > 1000 && VS.length > 800, [BE.length, RS.length, SB.length, RP.length, VS.length]);
vrai('⛔ une seule définition de boxEtat (une seconde gagnerait partout, en silence)', SRC.split('function boxEtat(').length - 1 === 1);

function monde(extra) {
  const nodes = {};
  const propre = Object.assign({ JSON, Math, Date, Set, Map, Object, Array, String, Number, console, parseInt, parseFloat, isFinite, RegExp,
    esc: s => String(s == null ? '' : s), norm: s => String(s || '').toLowerCase(), emptyState: () => '', encreDonnee: () => '#000', catColor: () => '#000',
    CAT_LIST: ['Matériel'], categoriesProduit: () => ['Matériel'], stockSearch: '', stockFiltreManque: false, prdSearch: '', prdExpanded: {}, prdCataloguePont: () => '', prdBoxCount: () => 1,
    stockageVisible: () => true, visibleBoxes: l => l || [], estStockage: () => false, db: { bons: [], produits: [], boxes: [] }, nextNum: () => 'BC-1', uid: () => 'u1', todayISO: () => '2026-10-17', fullName: () => 'Moi', currentUser: {},
    logEvent() {}, save() {}, toast() {}, go() {}, __nodes: nodes,
    $: id => nodes[id] || (nodes[id] = { innerHTML: '' }) }, extra);
  const ctx = new Proxy(propre, { has: (t, k) => typeof k === 'string', get: (t, k) => k in t ? t[k] : (k === Symbol.unscopables ? undefined : (k in globalThis ? globalThis[k] : (() => ''))), set: (t, k, v) => { t[k] = v; return true; } });
  vm.createContext(ctx);
  vm.runInContext(`var views={};\n${BE}\n${RS}\n${SB}\n${RP}\n${VS}`, ctx);
  return ctx;
}

console.log('\n── 1162 · 1. boxEtat(u, seuil) ──');
{ const W = monde({});
  const k = (u, s) => W.boxEtat(u, s).k;
  v('⛔ le cas du rapport : 5 unités, seuil 10 → À commander (la cloche dit « Stock bas (5/10) »)', k(5, 10), 'aCommander');
  v('le seuil est INCLUS, comme la cloche (q <= seuil)', [k(10, 10), k(11, 10)], ['aCommander', 'enStock']);
  v('zéro est toujours Épuisé, seuil ou pas', [k(0, 10), k(0, 0), k(0)], ['epuise', 'epuise', 'epuise']);
  v('sans seuil (0, vide, absent, illisible) : l\'ancien comportement, inchangé', [k(5, 0), k(5, ''), k(5), k(5, undefined), k(5, null), k(5, NaN), k(5, 'abc'), k(5, -3)], Array(8).fill('enStock'));
  v('sans seuil, 1-2 u restent « À commander » et 3 u « En stock » (défaut de la box)', [k(1), k(2), k(3), k(2, 0), k(3, 0)], ['aCommander', 'aCommander', 'enStock', 'aCommander', 'enStock']);
  v('un seuil défini dit le dernier mot (seuil 1 : 2 u est en stock)', [k(1, 1), k(2, 1)], ['aCommander', 'enStock']);
  v('un seuil lu en texte (« 10 ») compte aussi', k(5, '10'), 'aCommander');
  v('le libellé et la couleur suivent l\'état', [W.boxEtat(5, 10).l, W.boxEtat(5, 10).c], ['À commander', 'var(--org)']);
}

console.log('\n── 1162 · 2. Stock : la liste, le compteur, le bon ──');
{ const lignes = () => [
    { p: { id: 'alta', nom: 'ALTA 7000', seuil: 10 }, eff: 5, boxes: [{ nom: 'Box A', u: 5 }] },
    { p: { id: 'gel', nom: 'Gel blattes', seuil: 0 }, eff: 5, boxes: [{ nom: 'Box A', u: 5 }] },
    { p: { id: 'ok', nom: 'Gants', seuil: 4 }, eff: 40, boxes: [{ nom: 'Box A', u: 40 }] },
    { p: { id: 'vide', nom: 'Piège', seuil: 3 }, eff: 0, boxes: [] }];
  const W = monde({ stockLines: lignes });
  W.renderStockList();
  const html = W.$('stock-list').innerHTML;
  const section = nom => { const i = html.indexOf(nom); return i < 0 ? '' : html.slice(i, html.indexOf('<div style="font-size:11.5px', i + 5) < 0 ? undefined : html.indexOf('<div style="font-size:11.5px', i + 5)); };
  vrai('population : les trois sections existent', /À commander \(/.test(html) && /En stock \(/.test(html) && /Épuisé \(/.test(html));
  vrai('⛔ ALTA 7000 (5 u, seuil 10) est rangé « À commander », plus « En stock »', /data-pid="alta"/.test(section('À commander (')) && !/data-pid="alta"/.test(section('En stock (')), section('À commander ('));
  vrai('contre-épreuve : Gel blattes (5 u, SANS seuil) reste « En stock » — l\'ancien comportement', /data-pid="gel"/.test(section('En stock (')) && !/data-pid="gel"/.test(section('À commander (')));
  vrai('contre-épreuve : Gants (40 u, seuil 4) reste « En stock »', /data-pid="ok"/.test(section('En stock (')));
  vrai('Piège (0 u) reste « Épuisé »', /data-pid="vide"/.test(section('Épuisé (')));
  W.views.stock();
  const kpi = (W.$('content').innerHTML.match(/>(\d+)<\/div><div class="kpi-lbl">À commander/) || [])[1];
  v('⛔ le compteur « À commander » du Stock compte ALTA 7000 et Piège (2), pas Gel ni Gants', kpi, '2');
  W.stockFiltreManque = true; W.renderStockList();
  const h2 = W.$('stock-list').innerHTML;
  vrai('⛔ le filtre « À commander » garde ALTA 7000 et écarte le reste en stock', /data-pid="alta"/.test(h2) && /data-pid="vide"/.test(h2) && !/data-pid="ok"/.test(h2) && !/data-pid="gel"/.test(h2), h2.length);
  W.stockExportBon();
  const bon = W.db.bons[0];
  v('⛔ le bon créé depuis le Stock reprend ALTA 7000 (et Piège), pas Gel ni Gants', bon && bon.lignes.map(l => l.produitId).sort(), ['alta', 'vide']);
}

console.log('\n── 1162 · 3. Produits : l\'état de la fiche ──');
{ const prods = [{ id: 'alta', nom: 'ALTA 7000', seuil: 10, categorie: 'Matériel' }, { id: 'gel', nom: 'Gel blattes', seuil: 0, categorie: 'Matériel' }];
  const W = monde({ prdSearch: 'a', produitsVisibles: () => prods, stockTotaux: () => ({ alta: 5, gel: 5 }), stockVoitTout: () => true, formProduit() {} });
  W.renderProduitsList();
  const html = W.$('prd-list').innerHTML;
  const ligne = id => { const i = html.indexOf("formProduit('" + id + "')"); return html.slice(i, html.indexOf('</div>\n', i + 400) < 0 ? i + 1200 : html.indexOf('pl-row', i + 10) < 0 ? undefined : html.indexOf('pl-row', i + 10)); };
  vrai('population : les deux lignes sont rendues', ligne('alta').length > 50 && ligne('gel').length > 50);
  vrai('⛔ ALTA 7000 (5 u, seuil 10) est « À commander » dans Produits', /À commander/.test(ligne('alta')) && !/En stock/.test(ligne('alta')), ligne('alta').slice(0, 400));
  vrai('contre-épreuve : Gel blattes (5 u, sans seuil) reste « En stock »', /En stock/.test(ligne('gel')) && !/À commander/.test(ligne('gel')));
}
console.log('\n' + (ok + ko) + ' contrôles — ' + ok + ' ✓ ' + ko + ' ✗');
console.log('════ test-1162 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
