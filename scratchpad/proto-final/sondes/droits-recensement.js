// Recense tous les gestes DATA de la page : { famille: { verbe: [lignes] } } pour chaque data-<famille>="verbe|…" (hors data-id, data-* de valeur libre listés
// dans IGNORE), plus les clés de ACTIONS / ACTIONS_CREA. Sert de source à la table GESTES (page) ET à la sonde droits-table.js (complétude).
const fs = require('fs'), path = require('path');
const PAGE = path.join(process.env.RACINE || path.join(__dirname, '..', '..', '..'), 'apercu', 'prototype-op-gestion.html');   // RACINE : la copie mutée d'une contre-épreuve
function recenser(src) {
  src = src || fs.readFileSync(PAGE, 'utf8');
  const fam = {}, dyn = new Set(); const lignes = src.split('\n');
  lignes.forEach((l, i) => { const re = /data-([a-z][a-z0-9]*)="([A-Za-z0-9~_.-]+)(?:[|"])/g; let m; while ((m = re.exec(l))) { const f = m[1], v = m[2]; ((fam[f] = fam[f] || {})[v] = fam[f][v] || []).push(i + 1); }
    const rd = /data-([a-z][a-z0-9]*)="\$\{/g; while ((m = rd.exec(l))) dyn.add(m[1]); });
  Object.defineProperty(fam, '__dyn', { value:dyn, enumerable:false });   // les familles dont le verbe est construit à la volée (data-eqd="${k}|…") : on sait qu'elles existent, pas leurs verbes
  return fam;
}
module.exports = { recenser, PAGE };
if (require.main === module) { const f = recenser(); const n = Object.values(f).reduce((s, o) => s + Object.keys(o).length, 0); console.log(Object.keys(f).length + ' familles, ' + n + ' verbes'); if (process.argv[2] === '--json') console.log(JSON.stringify(Object.fromEntries(Object.entries(f).map(([k, o]) => [k, Object.keys(o)])))); }
