/* ══ LA SIGNATURE CANONIQUE, CÔTÉ SERVEUR ═══════════════════════════════════════
 *
 * ⛔ CE FICHIER EST UNE COPIE MOT POUR MOT DE TROIS FONCTIONS D'`app.html`, ET C'EST ASSUMÉ.
 * L'étape 4 du socle (double écriture) ne se juge QUE par une chose : l'appareil calcule la
 * signature de ce qu'il a, le serveur recompose la même depuis ses lignes, et on compare. Si
 * les deux côtés ne calculent pas EXACTEMENT pareil, le contrôle crie tous les soirs pour rien,
 * on le débranche, et il ne reste plus rien pour dire que la double écriture est saine.
 *
 * ⚠️ POURQUOI UNE COPIE PLUTÔT QU'UN PARTAGE. `app.html` est servi tel quel par GitHub Pages :
 * pas de compilation, pas de bundler, « ce qui est écrit est ce qui est servi ». Le serveur,
 * lui, est du CommonJS sur un VPS. Il n'existe aucun endroit où ces trois fonctions pourraient
 * vivre UNE fois sans ajouter une étape de construction à une page de 3 Mo — ce que ce dépôt
 * refuse délibérément.
 *
 * ⛔ LA DIVERGENCE EST DONC GARDÉE PAR UN BANC, PAS PAR L'ESPOIR. `tests/test-734.js` :
 *   1. compare les TEXTES des trois fonctions, ici et dans `app.html` — ils doivent être
 *      identiques au caractère près ;
 *   2. et, plus fort, fait calculer les deux côtés sur le MÊME corpus et exige la MÊME valeur.
 * Le (2) est ce qui donne son sens au (1) : deux textes identiques qui rendraient deux
 * résultats différents seraient un piège, et deux textes différents qui rendent la même chose
 * ne sont qu'un avertissement.
 *
 * ⚠️ ET ON NE DÉCHIFFRE RIEN POUR LA CALCULER. L'empreinte de chaque corps est déjà stockée
 * en clair dans la colonne `empreinte` — c'est l'appareil qui l'a calculée avant de chiffrer.
 * La signature serveur ne lit donc que des colonnes : pas de déchiffrement, pas de 368 ms de
 * boucle d'événements gelée comme `verifier()`. */

function opCanon(x) {
  if (x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map(opCanon);
  const out = {};
  Object.keys(x).sort().forEach(k => { if (k !== '_m' && k !== '_ms') out[k] = opCanon(x[k]); });
  return out;
}
function opEmpreinte(r) {
  const t = JSON.stringify(opCanon(r)) || '';
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function opSignature(lignes) {
  const par = {};
  (lignes || []).forEach(l => {
    if (!l || !l.c) return;
    const c = l.c;
    (par[c] = par[c] || []).push(c + '|' + l.id + '|' + (+l.m || 0) + '|' + (l.sup ? 1 : 0) + '|' + (l.sup ? '' : (l.e || opEmpreinte(l.r))));
  });
  const cols = Object.keys(par).sort(), detail = {};
  let tout = '';
  cols.forEach(c => {
    /* Le TRI est ce qui rend la signature indépendante de l'ordre de service. Le serveur
       rend ses lignes par `seq`, le client les a dans l'ordre de `db` : sans tri, les deux
       divergeraient toujours, et pour rien. */
    const s = par[c].sort().join(',');
    detail[c] = { n: par[c].length, sig: opEmpreinte(s) };
    tout += c + '=' + detail[c].sig + ';';
  });
  return { sig: opEmpreinte(tout), par: detail };
}

module.exports = { opCanon, opEmpreinte, opSignature };
