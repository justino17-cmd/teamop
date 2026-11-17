// Recense tous les gestes DATA de la page : { famille: { verbe: [lignes] } } pour chaque data-<famille>="verbe|…" (hors data-id, data-* de valeur libre listés
// dans IGNORE), plus les clés de ACTIONS / ACTIONS_CREA. Sert de source à la table GESTES (page) ET à la sonde droits-table.js (complétude).
const fs = require('fs'), path = require('path');
const PAGE = path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-op-gestion.html');
function recenser(src) {
  src = src || fs.readFileSync(PAGE, 'utf8');
  const fam = {}; const lignes = src.split('\n');
  lignes.forEach((l, i) => { const re = /data-([a-z][a-z0-9]*)="([A-Za-z0-9~_.-]+)(?:[|"])/g; let m; while ((m = re.exec(l))) { const f = m[1], v = m[2]; ((fam[f] = fam[f] || {})[v] = fam[f][v] || []).push(i + 1); } });
  return fam;
}
module.exports = { recenser, PAGE };
if (require.main === module) { const f = recenser(); const n = Object.values(f).reduce((s, o) => s + Object.keys(o).length, 0); console.log(Object.keys(f).length + ' familles, ' + n + ' verbes'); if (process.argv[2] === '--json') console.log(JSON.stringify(Object.fromEntries(Object.entries(f).map(([k, o]) => [k, Object.keys(o)])))); }
