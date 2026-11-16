// Compile le JavaScript de chaque page d'apercu/ passée en argument (par défaut : le prototype). verifier-syntaxe.js ne lit pas apercu/ :
// une page qui ne compile pas est une page BLANCHE, et deux lots fusionnés sans conflit peuvent déclarer deux fois le même nom.
const fs = require('fs'), path = require('path');
const dossier = path.join(__dirname, '..', '..', '..', 'apercu');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['prototype-op-gestion.html'];
let ko = 0;
for (const p of pages) { const s = fs.readFileSync(path.join(dossier, p), 'utf8'); let n = 0;
  for (const m of s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) { n++; try { new Function(m[1]); } catch (e) { ko++; console.log('✗', p, 'script', n, ':', e.message); } }
  console.log(n ? '✓' : '✗', p, ':', n, 'script(s) compilé(s)'); if (!n) ko++; }
process.exit(ko ? 1 : 0);
