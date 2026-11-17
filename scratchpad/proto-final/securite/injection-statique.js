// Recensement STATIQUE des interpolations non échappées dans du HTML (angle injection de l'audit de sécurité, 16 novembre 2026).
// Lit le JavaScript des pages du prototype par un vrai analyseur (acorn) : pour chaque gabarit à backticks qui contient du balisage,
// range chaque ${expression} dans « sûre » (passe par esc / un nombre / un littéral) ou « à voir » (le reste, avec sa ligne).
// Usage : node injection-statique.js [page …] [--json] ; sortie = résumé, ou la liste complète en JSON.
const fs = require('fs'), path = require('path'), acorn = require('/opt/node-tools/node_modules/acorn'), walk = require('/opt/node-tools/node_modules/acorn-walk');
const RACINE = path.join(__dirname, '..', '..', '..', 'apercu');
const pages = process.argv.slice(2).filter(a => !a.startsWith('--')); const json = process.argv.includes('--json');
const PAGES = pages.length ? pages : ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html', 'prototype-courrier.js'];
const ESC = new Set(['esc', 'escA', 'escAttr', 'echapper', 'htmlEsc', 'e']);
const NOMBRE = /^(Math\.|Number|parseInt|parseFloat|eur|euro|fmt|fm|nb|n2|pct|heures?|hh|dur|dureeTxt|dateFr|jourFr)/;
function scripts(src, f) { if (f.endsWith('.js')) return [{ code: src, off: 0 }]; const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g; const out = []; let m; while ((m = re.exec(src))) { if (/src=|type="?(application\/json|text\/template)/.test(m[1])) continue; out.push({ code: m[2], off: src.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1 }); } return out; }
function txt(code, n) { return code.slice(n.start, n.end).replace(/\s+/g, ' '); }
function sure(n, code) {
  switch (n.type) {
    case 'Literal': return true;
    case 'TemplateLiteral': return true; // ses propres ${} sont examinés à part
    case 'UnaryExpression': return n.operator !== 'typeof' || true;
    case 'BinaryExpression': return ['-', '*', '/', '%', '**', '<', '>', '<=', '>=', '==', '===', '!=', '!==', '|', '&', '^'].includes(n.operator) || (n.operator === '+' && sure(n.left, code) && sure(n.right, code));
    case 'ConditionalExpression': return sure(n.consequent, code) && sure(n.alternate, code);
    case 'LogicalExpression': return sure(n.left, code) && sure(n.right, code);
    case 'CallExpression': { const c = n.callee; const nom = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' ? txt(code, c) : '');
      if (c.type === 'Identifier' && ESC.has(c.name)) return true; if (NOMBRE.test(nom)) return true;
      if (c.type === 'MemberExpression' && c.property && ['toFixed', 'toLocaleString', 'toString'].includes(c.property.name) && !n.arguments.length) return c.property.name !== 'toString' ? true : false;
      if (c.type === 'MemberExpression' && c.property && c.property.name === 'join' && c.object.type === 'CallExpression' && c.object.callee.type === 'MemberExpression' && c.object.callee.property.name === 'map') return false; // à lire : le corps du map
      return false; }
    case 'MemberExpression': return n.property && n.property.name === 'length' && !n.computed;
    case 'ParenthesizedExpression': return sure(n.expression, code);
    default: return false; }
}
const res = [];
for (const f of PAGES) { const src = fs.readFileSync(path.join(RACINE, f), 'utf8');
  for (const s of scripts(src, f)) { let ast; try { ast = acorn.parse(s.code, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true }); } catch (e) { console.error('✗ analyse impossible', f, e.message); process.exit(2); }
    walk.full(ast, n => { if (n.type !== 'TemplateLiteral' || !n.expressions.length) return; const balisage = n.quasis.some(q => /<[a-zA-Z\/!]|\sstyle=|\shref=|\ssrc=|=["']$/.test(q.value.cooked || '')); if (!balisage) return;
      n.expressions.forEach((x, i) => { const ctx = (n.quasis[i].value.cooked || '').slice(-40).replace(/\s+/g, ' '); const enAttr = /=\s*["']?[^<>"']*$/.test(n.quasis[i].value.cooked || '') ; res.push({ page: f, ligne: x.loc.start.line + s.off, expr: txt(s.code, x).slice(0, 160), sure: sure(x, s.code), avant: ctx, attr: enAttr }); }); }); } }
const aVoir = res.filter(r => !r.sure);
if (json) console.log(JSON.stringify(aVoir, null, 0)); else { console.log('interpolations dans du balisage :', res.length, '· sûres :', res.length - aVoir.length, '· à voir :', aVoir.length); const par = {}; aVoir.forEach(r => par[r.page] = (par[r.page] || 0) + 1); console.log(par); }
