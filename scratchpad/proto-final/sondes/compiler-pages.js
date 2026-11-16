// Compile le <script> de chaque page d'apercu/ donnée (scripts SANS src) : scripts/verifier-syntaxe.js ne lit pas apercu/, et deux lots fusionnés sans conflit
// peuvent déclarer deux fois le même nom (la page meurt à l'ouverture, aucun banc ne le voit). Usage : node compiler-pages.js [page.html …] — sans argument : les pages de l'atelier.
const fs = require('fs'), path = require('path');
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..', '..');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['apercu/prototype-op-gestion.html', 'apercu/prototype-documents.html'];
let ko = 0;
for (const p of pages) {
  const s = fs.readFileSync(path.join(RACINE, p), 'utf8'), blocs = [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!blocs.length) { console.log('  ✗', p, ': aucun script (population vide)'); ko++; continue; }
  blocs.forEach((b, i) => { try { new Function(b); console.log('  ✓', p, 'script', i + 1, '(' + b.length + ' car.)'); } catch (e) { console.log('  ✗', p, 'script', i + 1, ':', e.message); ko++; } });
}
console.log(`\n== ${ko ? 0 : pages.length} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
