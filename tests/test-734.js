/* ⛔ CE QUE CE FICHIER GARDE — QUE LES DEUX CÔTÉS CALCULENT LA MÊME SIGNATURE.

   L'étape 4 du socle (double écriture) ne se juge QUE par une chose : chaque nuit, l'appareil
   calcule la signature de ce qu'il a, le serveur recompose la même depuis ses lignes, et on
   compare. Personne ne LIT encore le socle — cette comparaison est donc la seule chose au
   monde qui puisse dire qu'une écriture s'est perdue en route.

   Si les deux côtés ne calculent pas EXACTEMENT pareil, le contrôle crie tous les soirs pour
   rien. Un contrôle qui crie pour rien se fait ignorer, puis débrancher — et il ne reste plus
   rien. Ce n'est pas une hypothèse : ce dépôt l'a déjà vécu avec `ancreVerifier`, qui rendait
   `ok:false` sur un journal parfaitement intact parce que deux lignes écrites dans la même
   milliseconde se relisaient dans le désordre.

   ⛔ IL Y A DONC DEUX COPIES DU MÊME CALCUL — `app.html` et `server/op-signature.js` — ET
   C'EST ASSUMÉ. `app.html` est servi tel quel par GitHub Pages (pas de compilation, « ce qui
   est écrit est ce qui est servi ») et le serveur est du CommonJS sur un VPS : il n'existe
   aucun endroit où ces fonctions pourraient vivre UNE fois sans ajouter une étape de
   construction à une page de 3 Mo, ce que ce dépôt refuse délibérément.

   La divergence est donc gardée par ce banc, pas par l'espoir, et il s'y prend de DEUX façons
   qui ne se remplacent pas :
     1. les TEXTES doivent être identiques au caractère près ;
     2. et les deux côtés, exécutés sur le MÊME corpus, doivent rendre la MÊME valeur.
   Le (2) donne son sens au (1) : deux textes identiques qui rendraient deux résultats
   différents seraient un piège, et deux textes différents rendant la même chose ne seraient
   qu'un avertissement. Le (1) seul se contournerait par un espace ; le (2) seul laisserait
   les copies dériver jusqu'au jour où le corpus du banc ne couvre plus le cas réel. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 260) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 260)); } };
const vrai = (t, a) => v(t, !!a, true);

console.log('\n── 734 · la signature canonique, des deux côtés (socle, étape 4) ──');

const bloc = (texte, sig) => { const i = texte.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = texte.indexOf('{', i); k < texte.length; k++) { if (texte[k] === '{') d++; else if (texte[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return texte.slice(i, f); };

const SERVEUR = fs.readFileSync(path.join(RACINE, 'server', 'op-signature.js'), 'utf8');
const FONCTIONS = ['function opCanon(', 'function opEmpreinte(', 'function opSignature('];

/* ══ 1. LES TEXTES ════════════════════════════════════════════════════════════════════════ */
for (const f of FONCTIONS) {
  const a = bloc(SRC, f), b = bloc(SERVEUR, f);
  vrai('⛔ ' + f.replace('function ', '').replace('(', '') + ' existe des deux côtés', !!a && !!b);
  v('   et son texte est identique au caractère près', a === b ? [] : [a.length + ' vs ' + b.length], []);
}
/* Et la bêta, régénérée depuis app.html : un calcul qui ne serait juste que d'un côté ne
   servirait à rien, puisque c'est sur la bêta que l'étape 4 se validera d'abord. */
{
  const B = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
  v('⛔ la bêta porte les MÊMES trois fonctions',
    FONCTIONS.filter(f => bloc(B, f) !== bloc(SRC, f)), []);
}

/* ══ 2. ⛔ LE MÊME CORPUS, LA MÊME VALEUR ═════════════════════════════════════════════════
   C'est le contrôle qui compte. Deux textes identiques qui rendraient deux résultats
   différents seraient un piège — et c'est exactement ce que produirait une dépendance
   implicite au contexte (un `Intl`, un `toLocaleString`, un ordre d'énumération). */
const client = new Function(FONCTIONS.map(f => bloc(SRC, f)).join('\n') + '\nreturn {opCanon,opEmpreinte,opSignature};')();
const serveur = require(path.join(RACINE, 'server', 'op-signature.js'));

const CORPUS = [
  { c: 'clients', id: 'c1', m: 1700000000000, e: 'abc' },
  { c: 'clients', id: 'c2', m: 1700000000001, e: 'def' },
  { c: 'clients', id: 'c-mort', m: 1700000000002, sup: 1700000000002 },
  { c: 'box_stock', id: 'bx1|p1', m: 1700000000003, e: 'ghi' },
  { c: 'box_stock', id: 'bx1|pRetire', m: 1700000000004, sup: 1700000000004 },
  { c: '_reglages', id: 'bloc', m: 0, e: 'jkl' },
  { c: 'interventions', id: 'accentué-é-à-ç', m: 1700000000005, e: 'mno' },
  { c: 'mailSent', id: '1700000000100-xyz', m: 0, e: 'pqr' },
];
v('⛔ la SIGNATURE est la même des deux côtés', client.opSignature(CORPUS).sig, serveur.opSignature(CORPUS).sig);
v('   et le détail par collection aussi', client.opSignature(CORPUS).par, serveur.opSignature(CORPUS).par);

/* Des corps, pas seulement des lignes : `opEmpreinte` est ce qui décide de `e`, donc de tout
   le reste. Les cas choisis sont ceux qui font diverger deux implantations naïves. */
const CORPS = [
  { a: 1, b: 'deux' },
  { b: 'deux', a: 1 },                                  // ordre d'insertion inversé
  { z: { y: 2, x: 1 }, a: [3, 2, 1] },                  // profondeur, et un tableau qui NE se trie pas
  { a: 1, _m: 99, _ms: { p: 1 } },                      // les tampons de transport
  { txt: 'é à ç — « guillemets » et \u0000 nul' },        // unicode et caractère nul
  { n: 0, f: false, vide: '', nul: null },              // les valeurs qu'on confond avec « absent »
  { grand: 'Z'.repeat(5000) },
  {},
  [1, 2, 3],
  'une chaîne', 42, null, true,
];
const ecarts = CORPS.filter(r => client.opEmpreinte(r) !== serveur.opEmpreinte(r))
  .map(r => String(JSON.stringify(r)).slice(0, 40));
v('⛔ l\'EMPREINTE est la même des deux côtés, sur douze formes', ecarts, []);

/* ⛔ ET LE TABLEAU NE SE TRIE PAS. Un objet a des clés sans ordre ; un tableau a un ORDRE, et
   c'est une donnée. Trier `[3,2,1]` rendrait la même empreinte que `[1,2,3]` — deux stocks
   différents passeraient pour identiques. */
vrai('⛔ un tableau réordonné change l\'empreinte (son ordre est une donnée)',
  serveur.opEmpreinte({ a: [1, 2, 3] }) !== serveur.opEmpreinte({ a: [3, 2, 1] }));
vrai('   là où un objet réordonné ne la change pas (ses clés n\'en ont pas)',
  serveur.opEmpreinte({ x: 1, y: 2 }) === serveur.opEmpreinte({ y: 2, x: 1 }));

/* ══ 3. LE CONTRE-TEST : LA SIGNATURE DOIT VOIR CE QU'ELLE EXISTE POUR VOIR ═══════════════
   ⛔ Un contenu DIFFÉRENT à date ÉGALE, c'est exactement ce qu'un `syncAlleger` mal placé
   produit : même identifiant, même `maj_le`, une photo en moins. `etat().signature` du socle
   ne hache que `coll|id|maj_le|supprime_le` — elle serait passée au vert sur cette panne-là.
   C'est toute la raison d'être de la signature canonique. */
{
  const ampute = CORPUS.map(l => (l.id === 'c1' ? Object.assign({}, l, { e: 'AMPUTE' }) : l));
  vrai('⛔ un contenu différent à date ÉGALE change la signature', serveur.opSignature(ampute).sig !== serveur.opSignature(CORPUS).sig);
  v('   et il change celle de SA collection seulement', 
    Object.keys(serveur.opSignature(ampute).par).filter(c => serveur.opSignature(ampute).par[c].sig !== serveur.opSignature(CORPUS).par[c].sig), ['clients']);
  const sansTombe = CORPUS.filter(l => l.id !== 'c-mort');
  vrai('⛔ une pierre tombale manquante se voit', serveur.opSignature(sansTombe).sig !== serveur.opSignature(CORPUS).sig);
  const melange = CORPUS.slice().reverse();
  v('⛔ mais l\'ORDRE DE SERVICE, lui, ne change rien (sinon ça crierait tous les soirs)',
    serveur.opSignature(melange).sig, serveur.opSignature(CORPUS).sig);
}

/* ══ 4. LA FONCTION DU SOCLE EN REND BIEN UNE ════════════════════════════════════════════
   `socle.signatureCanonique(t)` fait le pont : elle relit les colonnes et appelle le calcul
   commun. Sans ce contrôle, on aurait deux calculs justes et aucun pont entre eux. */
{
  let S = null;
  try { S = require(path.join(RACINE, 'server', 'socle.js')); } catch (e) {}
  if (!S) { console.log('  … server/node_modules absent — le pont n\'est pas éprouvé ici'); }
  else {
    vrai('⛔ le socle expose signatureCanonique', typeof S.signatureCanonique === 'function');
    const CODE = fs.readFileSync(path.join(RACINE, 'server', 'socle.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const corpsFn = bloc(CODE, 'function signatureCanonique(');
    vrai('   et elle passe par le calcul COMMUN, sans en refaire un', /op-signature/.test(corpsFn));
    vrai('   en lisant l\'empreinte DÉJÀ stockée, sans rien déchiffrer',
      /empreinte/.test(corpsFn) && !/desceller|dekDe/.test(corpsFn));
  }
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
