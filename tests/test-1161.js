/* ══ g19 · stock#4 — « ＋ LISTE » LIT LE PRIX COMME UN FRANÇAIS L'ÉCRIT ═══════════════════════════════
   `plAnalyse` lisait le prix par `parseFloat((x).replace(',','.'))` : « 1 234,50 » devenait 1 €
   (l'espace arrête parseFloat), « 1.234,50 » devenait 1,234 € (le point des milliers lu comme décimale),
   et « -5 » était accepté tel quel. Ces prix faux se retrouvent dans les bons de commande créés depuis
   le stock (`prixUnitaireHT`), alors que la fiche « ＋ Produit » impose min=0.

   Ce banc EXÉCUTE la vraie `plAnalyse` (et `plPrix`, la lecture d'un prix) dans un bac à sable, puis
   `plValider` : une ligne au prix illisible ou négatif est SIGNALÉE dans l'aperçu et n'est PAS ajoutée ;
   une ligne sans prix reste valide (le prix est facultatif). La fiche naît par `produitCreer`.      */
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

console.log('\n── 1161 · 0. la population ──');
const PA = bloc('function plAnalyse(){'), PV = bloc('function plValider(){'), PP = bloc('function plPrix(');
vrai('plAnalyse et plValider sont trouvés', PA.length > 800 && PV.length > 500, [PA.length, PV.length]);
vrai('⛔ une seule définition de plAnalyse et de plPrix (une seconde gagnerait partout, en silence)',
  SRC.split('function plAnalyse(').length - 1 === 1 && SRC.split('function plPrix(').length - 1 === 1);
vrai('plPrix existe (la lecture d\'un prix français a UN endroit)', PP.length > 100, PP.length);

function monde(texte) {
  const apercu = { innerHTML: '' }, compte = { textContent: '' }, zone = { value: texte };
  const creees = [];
  const propre = { JSON, Math, Date, Set, Map, Object, Array, String, Number, console, parseInt, parseFloat, isFinite, RegExp,
    $: id => id === 'pl-texte' ? zone : id === 'pl-apercu' ? apercu : id === 'pl-count' ? compte : null,
    CAT_LIST: ['TP18 — Insecticide', 'TP14 — Rodenticide', 'Matériel'], rangerCatFour: () => '',
    /* v773 : la liste du métier (ici la 3D) et la catégorie d'une ligne collée — la 3D garde sa liste et son traducteur */
    categoriesProduit: () => ['TP18 — Insecticide', 'TP14 — Rodenticide', 'Matériel'], categorieListe: (c, n) => (['TP18 — Insecticide', 'TP14 — Rodenticide', 'Matériel'].includes(c) ? c : ''), catColor: () => '#000', encreDonnee: () => '#000',
    esc: s => String(s == null ? '' : s), db: { produits: [] }, permGarde: () => true, toast() {}, logEvent() {}, save() {}, closeModal() {},
    produitCle: p => String(p.nom || '').toLowerCase(), idProduit: n => 'id_' + n, prdOnglet: '', views: { produits() {} },
    produitCreer: (f) => { creees.push(f); propre.db.produits.push(f); return f; } };
  const ctx = new Proxy(propre, { has: (t, k) => typeof k === 'string', get: (t, k) => k in t ? t[k] : (k === Symbol.unscopables ? undefined : (k in globalThis ? globalThis[k] : (() => ''))), set: (t, k, v) => { t[k] = v; return true; } });
  vm.createContext(ctx);
  vm.runInContext(`var _plLignes=[], _plRefus=[];\n${PP}\n${PA}\n${PV}`, ctx);
  return { ctx, apercu, creees, analyser: () => { ctx.plAnalyse(); return vm.runInContext('_plLignes', ctx); }, refus: () => vm.runInContext('typeof _plRefus!=="undefined"?_plRefus:null', ctx) };
}
const prix = txt => { const W = monde(txt); return W.analyser().map(x => x.prix); };

console.log('\n── 1161 · 1. le prix se lit comme on l\'écrit en France ──');
v('« 1 234,50 » (espace) → 1234,5', prix('Produit A ; MABI ; 1 234,50'), [1234.5]);
v('« 1 234,50 » (espace insécable U+00A0) → 1234,5', prix('Produit A ; MABI ; 1 234,50'), [1234.5]);
v('« 1 234,50 » (espace fine insécable U+202F, celle de toLocaleString fr) → 1234,5', prix('Produit A ; MABI ; 1 234,50'), [1234.5]);
v('« 1.234,50 » (point des milliers, virgule décimale) → 1234,5', prix('Produit B ; MABI ; 1.234,50'), [1234.5]);
v('« 1,234.50 » (usage anglais) → 1234,5', prix('Produit B ; MABI ; 1,234.50'), [1234.5]);
v('« 24,90 » et « 24.90 » → 24,9', prix('P1 ; X ; 24,90\nP2 ; X ; 24.90'), [24.9, 24.9]);
v('« 1.234.567,89 » → 1234567,89', prix('P ; X ; 1.234.567,89'), [1234567.89]);
v('« 12 € » et « 12,5€ » : le symbole est retiré', prix('P1 ; X ; 12 €\nP2 ; X ; 12,5€'), [12, 12.5]);
v('un entier simple reste lu : « 24 » → 24', prix('P ; X ; 24'), [24]);
v('sans prix : 0 (le prix est facultatif, la ligne est valide)', prix('P1 ; X\nP2'), [0, 0]);

console.log('\n── 1161 · 2. un prix négatif ou illisible n\'entre pas ──');
{ const W = monde('Produit A ; MABI ; 1 234,50\nProduit C ; MABI ; -5\nProduit D ; MABI ; abc\nProduit E ; MABI ; 3,50');
  const l = W.analyser();
  v('⛔ « -5 » et « abc » ne sont PAS dans les lignes retenues', l.map(x => x.nom), ['Produit A', 'Produit E']);
  const r = W.refus();
  vrai('population : les deux lignes refusées sont gardées à part, avec leur nom et ce qui a été lu', Array.isArray(r) && r.length === 2 && r[0].nom === 'Produit C' && r[1].nom === 'Produit D', r);
  vrai('… et l\'aperçu les SIGNALE (la personne sait pourquoi il en manque)', /ignorée/.test(W.apercu.innerHTML) && /Produit C/.test(W.apercu.innerHTML) && /Produit D/.test(W.apercu.innerHTML), W.apercu.innerHTML.slice(0, 200));
  vrai('le compteur « Tout ajouter (N) » ne compte que les lignes retenues', W.ctx.$('pl-count').textContent === 2, W.ctx.$('pl-count').textContent);
  W.ctx.plValider();
  v('⛔ « Tout ajouter » ne crée AUCUNE fiche au prix négatif, et les prix valent ce qu\'on a lu', W.creees.map(f => [f.nom, f.prix]), [['Produit A', 1234.5], ['Produit E', 3.5]]);
  vrai('aucune fiche à prix négatif (la fiche ＋ Produit impose min=0)', W.creees.every(f => f.prix >= 0));
}
v('« -0,01 » est négatif aussi', (() => { const W = monde('P ; X ; -0,01'); return W.analyser().length; })(), 0);
v('un prix négatif seul ne fait pas disparaître une liste de 200+ lignes (aperçu résumé) : il est signalé', (() => {
  const t = Array.from({ length: 210 }, (_, i) => 'Produit ' + i + ' ; X ; ' + (i === 5 ? '-3' : '2,5')).join('\n'); const W = monde(t); const n = W.analyser().length;
  return [n, /ignorée/.test(W.apercu.innerHTML)]; })(), [209, true]);

console.log('\n── 1161 · 3. contre-épreuve : ce qui était juste reste juste ──');
v('« Nom ; Fournisseur ; Prix ; Référence ; Catégorie » : les cinq colonnes passent', (() => { const W = monde('Gel ; MABI ; 24,90 ; REF1 ; Matériel'); const l = W.analyser(); return [l.length, l[0].prix, l[0].ref, l[0].categorie]; })(), [1, 24.9, 'REF1', 'Matériel']);
v('une ligne sans nom est toujours ignorée, sans bruit', monde(' ; MABI ; 3').analyser().length, 0);
console.log('\n' + (ok + ko) + ' contrôles — ' + ok + ' ✓ ' + ko + ' ✗');
console.log('════ test-1161 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
