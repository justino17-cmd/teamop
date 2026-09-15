/* ══ « EUX VOYAIENT TOUS LES BOX VIDES » ═══════════════════════════════════════════════════

   Justin, 15 septembre 2026, capture à l'appui : « moi j'ai bien les quantités du box, eux ne
   voyaient rien, ils voyaient tous les box vides ». La box « ELAN EASY STOCKAGE - Nantes »
   affichait 7 199 u chez l'administrateur et rien chez les techniciens.

   ⛔ CE N'ÉTAIT PAS LES DROITS. Vérifié d'abord au navigateur, sur UN SEUL appareil et SANS
   synchro (`scratchpad/sonde-box-vide.js`) : l'administrateur et le technicien voyaient la
   MÊME box à 7 199 u. Le défaut n'était donc pas dans l'affichage ni dans les permissions,
   mais dans ce qui arrivait sur leur appareil. C'est ce contrôle-là qui a fait gagner le temps.

   LA CAUSE, dans `boxFusionFine` : une ligne de stock sans horodatage dans `_ms` lisait
   `tA = 0` et `tB = 0`. Donc `tA >= tB` désignait la box gagnante, et `pid in cote` concluait
   « absente du côté gagnant = retirée ». Or elle n'avait jamais été retirée : elle n'était
   simplement pas datée. TOUTES les lignes antérieures à la maille fine sont dans ce cas — et
   la maille fine ne s'allume vraiment qu'une fois la version exigée depuis la Tour, ce qui a
   été fait le matin même.

   ⚠️ La garde `if(!objet(mA)||!objet(mB)) return null` ne protégeait pas : `{}` EST un objet.

   MESURÉ sur la fonction extraite du fichier livré, avant correction :
     200 lignes / 7 200 u  →  1 ligne / 36 u   (lignes non datées)
     200 lignes / 7 200 u  →  0 ligne / 0 u    (`_ms` vide des deux côtés)

   ⛔ ET LA GARANTIE INVERSE COMPTE AUTANT : un retrait VOLONTAIRE doit rester un retrait,
   sinon le produit qu'une équipe a sorti de sa box y revient tout seul à la fusion suivante.
   Un vrai retrait passe par `boxDecider` (`db.boxDecisions`) ET date sa ligne. C'est la
   présence de la DATE qui distingue une décision d'un silence. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 695 · une ligne de stock non datée n\'est pas une ligne supprimée ──');

/* La vraie fonction, extraite par comptage d'accolades. */
const d = APP.indexOf('function boxFusionFine(');
v('boxFusionFine est trouvée dans app.html', d > 0, true);
let n = 0, f = d;
for (let i = APP.indexOf('{', d); i < APP.length; i++) {
  if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) { f = i; break; } } }
const boxFusionFine = new Function(APP.slice(d, f + 1) + '; return boxFusionFine;')();

const T = 1757000000000;
const somme = b => Object.values((b && b.stock) || {}).reduce((t, x) => t + (+x || 0), 0);
const lignes = b => Object.keys((b && b.stock) || {}).length;

/* ── 1. Le cas d'ELAN : 200 lignes jamais datées, un appareil qui n'en connaît qu'une ── */
{
  const justin = { id: 'b1', _m: T + 1000, stock: {}, _ms: {} };
  for (let i = 0; i < 200; i++) justin.stock['p' + i] = 36;     // du stock, AUCUNE date
  justin._ms.p0 = T;                                            // une seule ligne datée
  const tech = { id: 'b1', _m: T + 2000, stock: { p0: 36 }, _ms: { p0: T + 2000 } };
  const r = boxFusionFine(tech, justin);                        // le technicien gagne (_m plus récent)
  v('⛔ les 199 lignes non datées sont GARDÉES', lignes(r), 200);
  v('⛔ … et leurs unités avec', somme(r), 7200);
  v('la ligne datée des deux côtés suit la plus récente', r.stock.p0, 36);
}

/* ── 2. Le pire, et le plus banal : aucune date nulle part ── */
{
  const justin = { id: 'b1', _m: T + 1000, stock: {}, _ms: {} };
  for (let i = 0; i < 200; i++) justin.stock['p' + i] = 36;
  const tech = { id: 'b1', _m: T + 2000, stock: {}, _ms: {} };   // box vue, jamais remplie ici
  const r = boxFusionFine(tech, justin);
  v('⛔ une box vide ne vide plus celle de l\'équipe', somme(r), 7200);
  v('… toutes les lignes sont là', lignes(r), 200);
}

/* ── 3. ⛔ LA GARANTIE INVERSE : un retrait DATÉ reste un retrait ──
   Sans ça, un produit qu'une équipe a sorti de sa box y reviendrait à la fusion suivante. */
{
  const gagnante = { id: 'b1', _m: T + 2000, stock: { p1: 5 }, _ms: { p1: T + 2000, p2: T + 2000 } };
  const perdante = { id: 'b1', _m: T + 1000, stock: { p1: 3, p2: 9 }, _ms: { p1: T + 1000, p2: T + 1000 } };
  const r = boxFusionFine(gagnante, perdante);
  v('⛔ p2, retirée ET datée du côté gagnant, ne revient PAS', 'p2' in r.stock, false);
  v('p1 suit la quantité la plus récente', r.stock.p1, 5);
}
/* Le même retrait, mais daté du côté PERDANT : c'est lui qui a parlé en dernier sur cette ligne. */
{
  const gagnante = { id: 'b1', _m: T + 2000, stock: { p1: 5, p2: 9 }, _ms: { p1: T + 2000, p2: T } };
  const perdante = { id: 'b1', _m: T + 1000, stock: { p1: 3 }, _ms: { p1: T + 1000, p2: T + 5000 } };
  const r = boxFusionFine(gagnante, perdante);
  v('⛔ un retrait plus récent du côté perdant est respecté', 'p2' in r.stock, false);
}

/* ── 4. Un seul côté daté : c'est lui qui a exprimé quelque chose ── */
{
  const gagnante = { id: 'b1', _m: T + 2000, stock: {}, _ms: { p1: T + 2000 } };   // retirée ici, datée
  const perdante = { id: 'b1', _m: T + 1000, stock: { p1: 7 }, _ms: {} };          // présente, non datée
  const r = boxFusionFine(gagnante, perdante);
  v('⛔ une ligne datée du côté gagnant et absente = retirée', 'p1' in r.stock, false);
}
{
  const gagnante = { id: 'b1', _m: T + 2000, stock: {}, _ms: {} };                 // absente, NON datée
  const perdante = { id: 'b1', _m: T + 1000, stock: { p1: 7 }, _ms: { p1: T } };   // présente et datée
  const r = boxFusionFine(gagnante, perdante);
  v('une ligne datée seulement du côté perdant est gardée', r.stock.p1, 7);
}

/* ── 5. Rien d'autre n'a bougé ── */
{
  const g = { id: 'b1', nom: 'Nantes', _m: T + 2000, stock: { p1: 1 }, _ms: { p1: T + 2000 },
    arrivages: [{ id: 'a1', ts: 2 }], passages: [{ id: 's1', ts: 2 }] };
  const p = { id: 'b1', nom: 'AUTRE', _m: T, stock: { p1: 9 }, _ms: { p1: T },
    arrivages: [{ id: 'a2', ts: 1 }], passages: [{ id: 's2', ts: 1 }] };
  const r = boxFusionFine(g, p);
  v('les champs de la box gagnante sont conservés', r.nom, 'Nantes');
  v('les arrivages s\'unissent au lieu de s\'écraser', r.arrivages.length, 2);
  v('les passages aussi', r.passages.length, 2);
  v('le tampon de la gagnante est gardé', r._m, T + 2000);
}
v('⛔ un `_ms` qui n\'est pas un objet fait toujours retomber sur l\'ancienne règle',
  [boxFusionFine({ _ms: null, stock: {} }, { _ms: {}, stock: {} }),
   boxFusionFine({ _ms: [], stock: {} }, { _ms: {}, stock: {} })], [null, null]);

/* ── 6. Le correctif est bien dans le fichier livré ── */
v('⛔ la branche « aucune date des deux côtés » existe',
  /if\(!tA&&!tB\)\{ if\(pid in A\) st\[pid\]=A\[pid\]; else if\(pid in B\) st\[pid\]=B\[pid\]; return; \}/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
