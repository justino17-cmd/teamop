/* Preuve que la réécriture ne change RIEN à la souris : on aplatit les deux feuilles en suite de (médias, sélecteur,
   corps), on retire des chaînes de médias la seule condition « (hover:hover) » (vraie à la souris), on écarte l'ancien
   bloc (hover:none) (faux à la souris), on fusionne les règles consécutives de même corps (une liste coupée en deux), et
   les deux suites doivent être IDENTIQUES. Usage : node equivalence-survols.js ancien.html nouveau.html */
const fs = require('fs');
function plat(F) {
  const B = fs.readFileSync(F, 'utf8'), out = [];
  function finBloc(css, i) { let p = 1, k = i + 1, q = null; for (; k < css.length; k++) { const d = css[k];
    if (css.startsWith('/*', k)) { k = css.indexOf('*/', k + 2) + 1; continue; } if (q) { if (d === '\\') { k++; continue; } if (d === q) q = null; continue; }
    if (d === '"' || d === "'") { q = d; continue; } if (d === '{') p++; else if (d === '}') { if (!--p) return k; } } return -1; }
  function couper(sel) { const o = []; let p = 0, b = 0, deb = 0; for (let k = 0; k < sel.length; k++) { const c = sel[k];
    if (c === '(') p++; else if (c === ')') p--; else if (c === '[') b++; else if (c === ']') b--; else if (c === ',' && !p && !b) { o.push(sel.slice(deb, k)); deb = k + 1; } }
    o.push(sel.slice(deb)); return o.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean); }
  function parcourir(css, media) { let i = 0, deb = 0, q = null;
    while (i < css.length) { const c = css[i];
      if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? css.length : j + 2; continue; }
      if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; i++; continue; }
      if (c === '{') { const net = css.slice(deb, i).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(), k = finBloc(css, i), corps = css.slice(i + 1, k).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();
        if (net.startsWith('@')) {
          if (/^@media \( ?hover ?: ?none ?\)$/.test(net)) { /* faux à la souris */ }
          else if (/^@(media|supports|layer|container)/.test(net)) parcourir(css.slice(i + 1, k), /^@media \( ?hover ?: ?hover ?\)$/.test(net) ? media : media.concat([net]));
          else out.push({ m: media.join(' & '), p: [net], c: corps });
        } else out.push({ m: media.join(' & '), p: couper(net), c: corps });
        i = k + 1; deb = i; continue; }
      if (c === '}' || c === ';') deb = i + 1; i++; } }
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m; while ((m = re.exec(B))) parcourir(m[1], []);
  const g = []; for (const r of out) { const d = g[g.length - 1]; if (d && d.m === r.m && d.c === r.c) d.p.push(...r.p); else g.push({ m: r.m, p: r.p.slice(), c: r.c }); }
  return g.map(x => x.m + ' ¦ ' + x.p.slice().sort().join(',') + ' ¦ ' + x.c);
}
const a = plat(process.argv[2]), b = plat(process.argv[3]);
let diff = 0; const n = Math.max(a.length, b.length);
for (let k = 0; k < n; k++) if (a[k] !== b[k]) { if (diff++ < 6) console.log('≠ ' + k + '\n  ancien  : ' + (a[k] || '').slice(0, 220) + '\n  nouveau : ' + (b[k] || '').slice(0, 220)); }
console.log('groupes de règles : ancien ' + a.length + ' · nouveau ' + b.length + ' · différences : ' + diff);
process.exit(diff ? 1 : 0);
