/* ══ L'ORIGINE D'UNE ERREUR SE LIT DANS LA PILE, PAS DANS L'ÉCRAN OUVERT ═══════════════════

   La moitié APPLICATION du correctif du 15 septembre 2026. Les deux autres (le courriel au
   client qui nommait un écran au hasard, et le libellé de la Tour) sont publiées — voir
   `tests/test-703.js`. Celle-ci attend sa phrase : elle n'apporte rien aux clients, elle
   n'améliore que nos diagnostics.

   Ce qu'elle ajoute : `tmOrigine(stack)` rend le premier cadre NOMMÉ de la pile. L'application
   n'est pas minifiée — contrepartie du fichier unique — donc les noms sont les vrais, et
   `boxPoserProduits` dans un dossier vaut dix minutes de recherche.

   ⚠️ LA FONCTION EST EXTRAITE DU FICHIER LIVRÉ ET EXÉCUTÉE SUR DE VRAIES PILES, des deux
   familles de navigateurs — les téléphones de terrain sont des deux côtés. Une fonction qui lit
   du texte produit par quelqu'un d'autre se teste sur ce texte-là, pas sur l'idée qu'on s'en
   fait. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
function extraire(nom) {
  const i = APP.indexOf('function ' + nom + '(');
  if (i < 0) return '';
  let j = APP.indexOf('{', i), n = 0, k = j;
  for (; k < APP.length; k++) { if (APP[k] === '{') n++; else if (APP[k] === '}') { n--; if (!n) break; } }
  return APP.slice(i, k + 1);
}
const SRC = extraire('tmOrigine');
console.log('\n── 704 · l\'origine se lit dans la pile ──');
v('tmOrigine est trouvée dans app.html', SRC.length > 200, true);
const tmOrigine = new Function(SRC + '; return tmOrigine;')();

/* ── Chrome / Edge : «     at nom (url:ligne:col) » ────────────────────────────────────── */
v('Chrome — la première fonction nommée est rendue', tmOrigine(
  'TypeError: x is not a function\n' +
  '    at boxPoserProduits (https://teamop.fr/app.html:12345:67)\n' +
  '    at saveBox (https://teamop.fr/app.html:12000:12)'), 'boxPoserProduits');
v('Chrome — `async` devant le nom ne gêne pas', tmOrigine(
  '    at async syncPush (https://teamop.fr/app.html:7200:9)'), 'syncPush');
v('Chrome — `new` devant le nom ne gêne pas', tmOrigine(
  '    at new Devis (https://teamop.fr/app.html:900:3)'), 'Devis');
v('Chrome — un nom pointé est gardé entier', tmOrigine(
  '    at views.planning (https://teamop.fr/app.html:10200:4)'), 'views.planning');

/* ── Safari / Firefox : « nom@url:ligne:col » ──────────────────────────────────────────── */
v('Safari — la première fonction nommée est rendue', tmOrigine(
  'boxPoserProduits@https://teamop.fr/app.html:12345:67\n' +
  'saveBox@https://teamop.fr/app.html:12000:12'), 'boxPoserProduits');
v('Firefox — même écriture, même résultat', tmOrigine(
  'intStockDeduire@https://teamop.fr/app.html:8080:15\n' +
  'promise callback*intValider@https://teamop.fr/app.html:8000:2'), 'intStockDeduire');

/* ⛔ LE CADRE DE LA SENTINELLE EST TOUJOURS EN HAUT D'UN SIGNALEMENT. Le rendre comme origine
   serait exactement la faute qu'on corrige : une valeur qui a l'air d'une réponse et n'en est
   pas une. */
v('⛔ la sentinelle ne s\'accuse pas elle-même', tmOrigine(
  '    at tmPush (https://teamop.fr/app.html:4850:3)\n' +
  '    at tmFlush (https://teamop.fr/app.html:4860:3)\n' +
  '    at produitCreer (https://teamop.fr/app.html:9000:7)'), 'produitCreer');
v('⛔ ni l\'enveloppe `rep` de la vigie', tmOrigine(
  '    at rep (https://teamop.fr/app.html:4776:5)\n' +
  '    at fusionnerBases (https://teamop.fr/app.html:6100:9)'), 'fusionnerBases');
/* ⛔ ET LA FAUTE REFAITE EN LA CORRIGEANT : le filtre testait le nom ENTIER, donc « Promise$ »
   ne mordait pas sur « Promise.then » — la sentinelle rendait « Promise.then » comme origine
   d'une erreur venue de `boxAdj`, deux cadres plus bas. On filtre sur la RACINE du nom.
   Attrapé par ce banc, pas par une relecture : c'est la raison d'être de la ligne suivante. */
v('⛔ les enveloppes natives ne sont l\'origine de rien, même pointées', tmOrigine(
  '    at Promise.then (<anonymous>)\n' +
  '    at Array.forEach (<anonymous>)\n' +
  '    at boxAdj (https://teamop.fr/app.html:11000:2)'), 'boxAdj');
v('… Object.keys non plus', tmOrigine(
  '    at Object.keys (<anonymous>)\n    at recEmpreinte (https://teamop.fr/app.html:6000:1)'), 'recEmpreinte');

/* ── Ce qu'on ne sait pas, on le dit : chaîne vide, jamais une valeur inventée ─────────── */
[['pile absente', undefined], ['pile vide', ''], ['pile nulle', null],
 ['pile sans aucun cadre nommé', '    at <anonymous>:1:1\n    at https://teamop.fr/app.html:12:3'],
 ['objet à la place d\'une pile', {}], ['nombre', 42]].forEach(([nom, x]) => {
  v('« ' + nom + ' » rend une chaîne vide, pas une invention', tmOrigine(x), '');
});
/* ⚠️ La sentinelle ne doit JAMAIS faire tomber l'application : c'est sa première règle. */
v('⛔ elle ne jette jamais, même sur une pile hostile', (() => {
  try { tmOrigine({ toString(){ throw new Error('hostile'); } }); return 'pas jeté'; }
  catch (e) { return 'A JETÉ : ' + e.message; } })(), 'pas jeté');
v('une pile énorme est bornée', tmOrigine(
  Array.from({length: 400}, () => '    at <anonymous> (x:1:1)').join('\n') +
  '\n    at trouveMoi (https://teamop.fr/app.html:1:1)'), '');
v('… et un nom très long est coupé',
  tmOrigine('    at ' + 'a'.repeat(200) + ' (x:1:1)').length, 60);

console.log('\n── 704 · elle voyage à côté de l\'écran ouvert, pas à sa place ──');
v('l\'application envoie l\'origine ET l\'écran ouvert',
  /categorie:tmCat\(\),origine:tmOrigine\(stack\)/.test(APP), true);
/* Le commentaire de `tmCat` doit continuer de dire ce que la valeur n'est PAS : c'est lui qui
   empêche quelqu'un de la reprendre un jour pour désigner une cause. */
v('⛔ `tmCat` porte l\'avertissement sur ce qu\'elle ne dit pas',
  /nomme L'ÉCRAN OUVERT au moment[\s\S]{0,400}Ce n'est PAS l'endroit d'où vient l'erreur/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
