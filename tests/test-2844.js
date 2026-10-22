/* ══ test-2844 · REPLIER LE MENU, AU BUREAU, GLISSE AU LIEU DE SAUTER ═════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 23. Au-dessus de 780 px, « Replier le menu » devait faire glisser la barre
   latérale (transition de largeur, écrite pour ça, et majPlier replace la pastille APRÈS elle). Mais deux règles du tiroir du
   téléphone, sans média et en !important, posaient « transition:transform » à la même force : la transition de largeur ne
   tournait jamais, la barre passait de sa largeur à 0 en une image et le contenu se recalait d'un coup. Et son contenu
   devenait invisible à l'instant du clic : la barre se vidait avant de bouger.
   Ce banc REJOUE LA CASCADE (tests/outils-cascade-app.js) : au bureau, au téléphone, sous « réduire les animations », barre
   dépliée et repliée ; puis relit majPlier. La preuve image par image (la largeur prend des valeurs intermédiaires, le contenu
   s'efface avant de disparaître) : scratchpad/sonde-plier.js.                                                              */
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
/* l'outil tient pour vrai un média qu'il ne connaît pas, et pour faux « réduire les animations » : chaque cas passe son juge */
const juge = (sobre) => (m, w) => { const c = m.toLowerCase();
  if (c.includes('prefers-reduced-motion')) return !!sobre;
  if (/prefers-(reduced-transparency|contrast|color-scheme)|hover:\s*none|\bprint\b|pointer:\s*coarse/.test(c)) return false;
  return C.mediaVrai(m, w); };
const gg = (ch, w, prop, sobre) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, w, prop, undefined, juge(sobre)); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
const chaine = (replie, enfant) => [
  { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } },
  { tag: 'body', classes: replie ? ['rf-repliee'] : [], attrs: {} },
  { tag: 'nav', classes: ['sidebar'], attrs: { id: 'sidebar' }, id: 'sidebar' }].concat(enfant ? [{ tag: 'div', classes: ['nav-item'], attrs: {} }] : []);

console.log('\n── 2844 · 0. la population ──');
vrai('(population) la feuille est lue : plus de 3 000 règles', TOUT.length > 3000, TOUT.length);
const LARGEUR = /^width var\(--d-3\) var\(--ressort\),\s*opacity var\(--d-2\) var\(--e-sortie\)$/;

console.log('\n── 2844 · 1. au bureau, la barre glisse ──');
for (const w of [800, 1280, 1920]) for (const replie of [false, true]) {
  const t = gg(chaine(replie), w, 'transition');
  vrai('(' + w + ' px, ' + (replie ? 'repliée' : 'dépliée') + ') la transition qui gagne anime la LARGEUR et l’opacité (plus le transform du tiroir)', !!t && LARGEUR.test(t), t);
}
{ const wd = gg(chaine(true), 1280, 'width'), op = gg(chaine(true), 1280, 'opacity');
  vrai('repliée : largeur 0 et opacité 0 (ce que la transition anime)', wd === '0' && op === '0', [wd, op]); }

console.log('\n── 2844 · 2. le contenu s’efface avec elle, puis disparaît ──');
{ const v = gg(chaine(true, true), 1280, 'visibility'), t = gg(chaine(true, true), 1280, 'transition');
  vrai('repliée, son contenu devient invisible (clavier, lecteur d’écran)', v === 'hidden', v);
  vrai('⛔ … APRÈS le fondu : la visibilité attend --d-2 (cachée d’un coup, la barre se vidait avant de bouger)', !!t && /^visibility 0s linear var\(--d-2\)$/.test(t), t);
  const t2 = gg(chaine(false, true), 1280, 'transition');
  vrai('dépliée, rien n’attend : le contenu revient tout de suite (la règle de délai ne vise que la barre repliée)', !t2 || !/visibility 0s linear/.test(t2), t2); }

console.log('\n── 2844 · 3. le tiroir du téléphone n’a pas changé ──');
for (const w of [360, 390, 780]) {
  const t = gg(chaine(false), w, 'transition');
  vrai('(' + w + ' px) le tiroir glisse toujours par son transform (--d-4, ressort)', t === 'transform var(--d-4) var(--ressort)', t);
}

console.log('\n── 2844 · 4. réduire les animations ──');
for (const w of [390, 1280]) {
  const t = gg(chaine(false), w, 'transition', true), te = gg(chaine(true, true), w, 'transition', true);
  vrai('(' + w + ' px) aucune transition sur la barre', t === 'none', t);
  vrai('(' + w + ' px) … ni délai sur son contenu replié (la visibilité tombe avec la barre)', !te || !/visibility 0s linear/.test(te), te);
}

console.log('\n── 2844 · 5. la pastille du menu se replace APRÈS le glissement ──');
{ const m = /\nfunction majPlier\(replie\)\{[\s\S]*?setTimeout\(function\(\)\{ placerGlisse\(false\); \},(\d+)\)/.exec(CODE);
  const d3 = +((/--d-3:(\d+)ms/.exec(BRUT) || [])[1] || 0);
  vrai('majPlier replace la pastille après la durée du glissement (' + (m && m[1]) + ' ms ≥ --d-3 = ' + d3 + ' ms)', !!m && d3 > 0 && +m[1] >= d3, [m && m[1], d3]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
