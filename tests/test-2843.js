/* ══ test-2843 · LE PIED D'UNE FENÊTRE A LA MATIÈRE DE SON EN-TÊTE, SUR TÉLÉPHONE AUSSI ═══════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 22. Sur téléphone, le pied collant d'une fenêtre (« Enregistrer », « Annuler »)
   restait un aplat opaque (--bg1) sous un en-tête en verre : un long formulaire défilait sous un en-tête translucide et se
   coupait net, à ras du bouton, sur une barre pleine — deux matières aux deux bouts de la même feuille. La couche de la
   refonte ne passait le pied en verre qu'au-delà de 780 px, et seulement pour les fenêtres pleines.
   Ce banc REJOUE LA CASCADE (tests/outils-cascade-app.js) pour l'en-tête et le pied d'une fenêtre, au téléphone et au
   bureau, de jour et de nuit, puis sous « moins de transparence » et sous « plus de contraste » : il garde ce que les règles
   GAGNENT, pas leur texte. La preuve au pixel (le texte du formulaire se devine sous le pied, jour et nuit) :
   scratchpad/sonde-pied-fenetre.js.                                                                                    */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
/* ⚠️ l'outil tient [a^="…"] pour vrai et coupe naïvement aux virgules : on ne garde que les sélecteurs entiers dont chaque
   attribut à valeur est tenu par la chaîne (même recadrage que test-2837 et test-2842) ; et il tient pour vrai un média
   qu'il ne connaît pas (prefers-…) : chaque cas passe son propre juge */
const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
const entier = (x) => { let a = 0, b = 0; for (const c of x) { if (c === '[') a++; else if (c === ']') a--; else if (c === '(') b++; else if (c === ')') b--; if (a < 0 || b < 0) return false; } return !a && !b; };
const tenus = (sel, ch) => [...sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => { const v = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return ch.some(e => { const x = (e.attrs || {})[m[1]]; if (x === undefined) return false; return m[2] === '=' ? x === v : m[2] === '^=' ? x.startsWith(v) : m[2] === '$=' ? x.endsWith(v) : m[2] === '*=' ? x.includes(v) : true; }); });
const juge = (reglages) => (m, w) => { const c = m.toLowerCase();
  for (const [f, v] of [['prefers-reduced-transparency', 'rt'], ['prefers-contrast', 'cm'], ['prefers-reduced-motion', 'rm'], ['prefers-color-scheme', 'cs']]) if (c.includes(f)) return !!reglages[v];
  if (/hover:\s*none|\bprint\b/.test(c)) return false;
  return C.mediaVrai(m, w); };
const gg = (ch, w, prop, reglages) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, w, prop, undefined, juge(reglages || {})); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
const chaine = (theme, quoi, plein) => [
  { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': theme, 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } },
  { tag: 'body', classes: [], attrs: {} },
  { tag: 'div', classes: ['overlay', 'open'], attrs: { id: 'overlay' }, id: 'overlay' },
  { tag: 'div', classes: plein ? ['modal', 'full'] : ['modal'], attrs: {} },
  { tag: 'div', classes: [quoi], attrs: {} }];

console.log('\n── 2843 · 0. la population ──');
vrai('(population) la feuille est lue : plus de 3 000 règles', TOUT.length > 3000, TOUT.length);
const VERRE = /^color-mix\(in srgb,\s*var\(--card\) 80%,\s*transparent\)$/;
{ const h = gg(chaine('light', 'modal-head'), 390, 'background');
  vrai('(population) l’en-tête d’une fenêtre est bien en verre au téléphone (la référence du pied)', !!h && VERRE.test(h), h); }

console.log('\n── 2843 · 1. téléphone et bureau, jour et nuit : le pied a la matière de l’en-tête ──');
for (const [w, nom] of [[390, 'téléphone'], [360, 'petit Android'], [1280, 'bureau']]) for (const plein of (w > 780 ? [true] : [false, true])) for (const theme of ['light', 'dark']) {
  const quand = nom + (plein ? ', fenêtre pleine' : '') + ', ' + (theme === 'light' ? 'jour' : 'nuit');
  const pf = gg(chaine(theme, 'modal-foot', plein), w, 'background'), ph = gg(chaine(theme, 'modal-head', plein), w, 'background');
  const ff = gg(chaine(theme, 'modal-foot', plein), w, 'backdrop-filter'), fh = gg(chaine(theme, 'modal-head', plein), w, 'backdrop-filter');
  vrai('(' + quand + ') le pied est en verre, comme l’en-tête : même fond, même flou', !!pf && VERRE.test(pf) && pf === ph && !!ff && /blur\(22px\)/.test(ff) && ff === fh, [pf, ph, ff, fh]);
  const tf = gg(chaine(theme, 'modal-foot', plein), w, 'border-top-color');
  vrai('(' + quand + ') … séparé du formulaire par le même filet que l’en-tête (pas le trait de --brd)', tf === 'var(--rf-filet)', tf);
}

console.log('\n── 2843 · 2. les réglages du système ──');
for (const w of [390, 1280]) for (const theme of ['light', 'dark']) {
  const plein = w > 780, quand = (w > 780 ? 'bureau' : 'téléphone') + ', ' + (theme === 'light' ? 'jour' : 'nuit');
  const rt = { rt: true };
  const b = gg(chaine(theme, 'modal-foot', plein), w, 'background', rt), f = gg(chaine(theme, 'modal-foot', plein), w, 'backdrop-filter', rt);
  vrai('(' + quand + ') « moins de transparence » : le pied est plein, sans flou', b === 'var(--card)' && f === 'none', [b, f]);
  const cm = { cm: true };
  for (const quoi of ['modal-head', 'modal-foot']) {
    const bc = gg(chaine(theme, quoi, plein), w, 'background', cm), tc = gg(chaine(theme, quoi, plein), w, quoi === 'modal-head' ? 'border-bottom-color' : 'border-top-color', cm);
    vrai('(' + quand + ') « plus de contraste » : ' + (quoi === 'modal-head' ? 'l’en-tête' : 'le pied') + ' devient plein, filet net', bc === 'var(--vr-plein)' && tc === 'var(--t3)', [bc, tc]);
  }
}

console.log('\n── 2843 · 3. le flou ne survit pas à son fond (règle du dépôt : les deux moitiés se déclarent ensemble) ──');
{ const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const m = /@media\(max-width:780px\)\{\s*html\[data-refonte\] \.modal-foot\{([^}]*)\}\s*\}/.exec(CSS);
  vrai('la règle du téléphone pose le fond ET le flou, ensemble', !!m && /background:color-mix/.test(m[1]) && /backdrop-filter:blur/.test(m[1]) && /-webkit-backdrop-filter:blur/.test(m[1]), m && m[1]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
