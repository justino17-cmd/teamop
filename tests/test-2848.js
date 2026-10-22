/* ══ test-2848 · UN TOTAL RECALCULÉ À CHAQUE FRAPPE NE TREMBLE PAS ═══════════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 29. « Total HT · TVA · TTC » d'un devis ou d'une facture (#lig-tot) se recalcule à
   chaque chiffre tapé dans une quantité ou un prix, aligné à droite, en chiffres proportionnels : un « 1 » est plus étroit qu'un
   « 8 », toute la ligne glissait de quelques pixels à chaque frappe. Même chose pour le total d'un bon de commande (#bon-tot) et
   le trajet d'une tournée (#tournee-total).
   Ce banc REJOUE LA CASCADE : chacun de ces totaux, et ce qu'il contient, a des chiffres tabulaires. La preuve dans la page (on
   tape 1111 puis 8888 dans un prix, la position du TTC relevée à chaque frappe) : scratchpad/sonde-totaux.js.            */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
const entier = (x) => { let a = 0, b = 0; for (const c of x) { if (c === '[') a++; else if (c === ']') a--; else if (c === '(') b++; else if (c === ')') b--; if (a < 0 || b < 0) return false; } return !a && !b; };
const tenus = (sel, ch) => [...sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => { const v = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return ch.some(e => { const x = (e.attrs || {})[m[1]]; if (x === undefined) return false; return m[2] === '=' ? x === v : m[2] === '^=' ? x.startsWith(v) : m[2] === '$=' ? x.endsWith(v) : m[2] === '*=' ? x.includes(v) : true; }); });
const juge = (m, w) => !/prefers-|hover:\s*none|\bprint\b/.test(m.toLowerCase()) && C.mediaVrai(m, w);
const gg = (ch, prop) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, 390, prop, undefined, juge); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } }, body = { tag: 'body', classes: [], attrs: {} };

for (const [id, ecrit] of [['lig-tot', 'function ligTot('], ['bon-tot', 'function bonTotRefresh('], ['tournee-total', "$('tournee-total')"]]) {
  console.log('\n── 2848 · #' + id + ' ──');
  vrai('(population) le total existe dans la page, et une fonction le récrit', CODE.indexOf('id="' + id + '"') > 0 && CODE.indexOf(ecrit) > 0);
  const tot = { tag: 'div', classes: [], attrs: { id }, id };
  const v = gg([html, body, tot], 'font-variant-numeric');
  vrai('#' + id + ' : chiffres tabulaires', v === 'tabular-nums', v);
  const b = gg([html, body, tot, { tag: 'b', classes: [], attrs: {} }], 'font-variant-numeric');
  vrai('… et les montants en gras qu’il contient en héritent (aucune règle ne les remet en proportionnels)', b === null || b === 'tabular-nums', b);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
