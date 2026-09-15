/* ══ TAPER UNE LETTRE NE REDESSINE PLUS UNE LISTE ENTIÈRE ══════════════════════════════════

   Justin, 15 septembre 2026 au soir, chez ELAN : « dès qu'ils font quelque chose dans une
   catégorie, où ils cherchent un produit, où ils écrivent, l'application rame, on doit taper
   lettre par lettre ».

   MESURÉ avant correction (base aux proportions d'ELAN, processeur ralenti ×4, sonde
   `scratchpad/sonde-saisie.js`) : taper « rongeur » coûtait **1 230 ms à la première lettre**
   puis ~300 ms à chacune des six suivantes. Le doigt va plus vite que l'écran.
   Après : **103 ms** puis 62 ms. Médiane 262 → 63 ms.

   ⛔ ET LE PROFILEUR A DÉSIGNÉ AUTRE CHOSE QUE LA RECHERCHE. 60 % du temps était passé dans le
   NAVIGATEUR (mise en page et peinture d'une liste reconstruite en entier) et 10,8 % dans
   `icones`, qui reparcourt tous les nœuds de texte du sous-arbre à chaque rendu. Filtrer
   220 produits ne coûte presque rien ; le refaire sept fois, si. La cause n'était pas le
   filtrage : c'était le nombre de rendus.

   Ce banc garde deux choses : que le rendu est bien DIFFÉRÉ sur tous les champs qui dessinent
   une longue liste, et que la VARIABLE, elle, est posée tout de suite — sinon le champ
   afficherait autre chose que ce qu'on a tapé. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('\n── 705 · le report de rendu existe, une seule fois ──');
v('rechDiffere n\'est définie qu\'une fois', (APP.match(/function rechDiffere\(/g) || []).length, 1);
/* Un seul minuteur, partagé : un seul champ a le focus à la fois. Deux minuteurs se
   marcheraient dessus le jour où deux champs coexistent, sans que ça se voie. */
v('elle annule le rendu précédent avant d\'en programmer un autre',
  /function rechDiffere\(fn\)\{ clearTimeout\(_rechT\); _rechT=setTimeout\(/.test(APP), true);
/* ⚠️ 170 ms : assez pour avaler une rafale, trop court pour se remarquer. Le chiffre est
   mesuré, pas choisi — le changer demande de re-mesurer, d'où ce contrôle. */
v('le délai est de 170 ms', /_rechT=setTimeout\(function\(\)\{ try\{ fn\(\); \}catch\(e\)\{\} \},170\);/.test(APP), true);
/* Un rendu différé qui arrive après un changement d'écran ne doit rien faire : c'est le `catch`
   ici, et la garde `if(!el) return;` dans chaque fonction de rendu. */
v('un rendu différé qui échoue ne casse rien', /try\{ fn\(\); \}catch\(e\)\{\}/.test(APP), true);

console.log('\n── 705 · les sept champs qui dessinent une longue liste ──');
/* Chaque entrée : le nom du champ, la variable posée TOUT DE SUITE, la fonction différée. */
[['fc-q', 'fcQ', 'renderFourCat'],
 ['prd-search', 'prdSearch', 'renderProduitsList'],
 ['boxprod-search', 'boxProdSearch', 'renderBoxProdList'],
 ['abp-search', 'bxpQ', 'renderAbpList'],
 ['conso', 'consoSearch', 'renderConsoRows']].forEach(([champ, vari, fn]) => {
  const re = new RegExp('oninput="' + vari + '=this\\.value;[^"]*rechDiffere\\(' + fn + '\\)');
  v(champ + ' : la variable est posée tout de suite, le rendu attend', re.test(APP), true);
  /* ⛔ Et l'ancien appel direct ne doit plus exister : le laisser à côté annulerait tout le
     gain sans qu'on s'en aperçoive, puisque la liste s'afficherait quand même. */
  v('… et ' + fn + ' n\'est plus appelée directement depuis un oninput',
    new RegExp('oninput="[^"]*;' + fn + '\\(\\)').test(APP), false);
});
v('bcat-q : le rendu attend aussi', /oninput="rechDiffere\(bonCatList\)"/.test(APP), true);
/* La recherche globale reçoit son texte en ARGUMENT : il faut le figer au moment de la frappe,
   sinon le rendu différé lirait `this.value` d'un champ qui n'existe peut-être plus. */
v('la recherche globale fige la valeur au moment de la frappe',
  /oninput="var _v=this\.value;rechDiffere\(function\(\)\{ renderSearch\(_v\); \}\)"/.test(APP), true);

console.log('\n── 705 · les fonctions de rendu supportent d\'arriver en retard ──');
/* C'est ce qui rend le report SÛR : si l'écran a changé entre la frappe et le rendu, la
   fonction ne trouve pas son conteneur et ne fait rien. Sans cette garde, un rendu différé
   écrirait dans le vide — ou pire, dans un élément détaché. */
['renderProduitsList', 'renderBoxProdList', 'bonCatList', 'renderConsoRows', 'renderSearch'].forEach(fn => {
  const i = APP.indexOf('function ' + fn + '(');
  const tete = i < 0 ? '' : APP.slice(i, i + 200);
  v(fn + ' sort si son conteneur a disparu', /const el=\$\('[a-z-]+'\); if\(!el(\|\||&&|\))/.test(tete), true);
});

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
