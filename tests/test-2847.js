/* ══ test-2847 · LA FEUILLE « CRÉER » A LE VOILE DES FENÊTRES ═══════════════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 28. La feuille « Créer » est une fenêtre (role=dialog, aria-modal), mais son voile
   était un aplat sans flou quand celui de toute fenêtre (#overlay) floute la page à 20 px : sous elle, le tableau de bord restait
   net, la tâche modale pesait moins que le moindre menu.
   Ce banc REJOUE LA CASCADE pour le voile de « Créer » et celui d'une fenêtre (même teinte, même flou, fondus ; « moins de
   transparence » éteint le flou), puis EXÉCUTE le geste de la feuille (creerGeste, extrait d'app.html) au doigt simulé : tirée,
   le flou s'allège avec la couleur ; relâchée, plus rien en ligne. La preuve au pixel (la page sous le voile perd son détail,
   2,55 → 0,04 ; l'ancienne page : 2,55 → 1,66) : scratchpad/sonde-voile-creer.js.                                       */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = CODE.indexOf(debut); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(i, k + 1);
}

console.log('\n── 2847 · 1. le même voile que les fenêtres (la cascade rejouée) ──');
const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
const entier = (x) => { let a = 0, b = 0; for (const c of x) { if (c === '[') a++; else if (c === ']') a--; else if (c === '(') b++; else if (c === ')') b--; if (a < 0 || b < 0) return false; } return !a && !b; };
const tenus = (sel, ch) => [...sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => { const v = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return ch.some(e => { const x = (e.attrs || {})[m[1]]; if (x === undefined) return false; return m[2] === '=' ? x === v : m[2] === '^=' ? x.startsWith(v) : m[2] === '$=' ? x.endsWith(v) : m[2] === '*=' ? x.includes(v) : true; }); });
const juge = (rt) => (m, w) => { const c = m.toLowerCase(); if (c.includes('prefers-reduced-transparency')) return !!rt; if (/prefers-|hover:\s*none|\bprint\b/.test(c)) return false; return C.mediaVrai(m, w); };
const gg = (ch, w, prop, rt) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, w, prop, undefined, juge(rt)); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
for (const w of [390, 1280]) for (const theme of ['light', 'dark']) {
  const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': theme, 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr', 'data-kind': w > 780 ? 'desktop' : 'mobile' } }, body = { tag: 'body', classes: [], attrs: {} };
  const creer = [html, body, { tag: 'div', classes: ['creer-ov', 'on', 'vu'], attrs: { id: 'creer' }, id: 'creer' }];
  const fen = [html, body, { tag: 'div', classes: ['overlay', 'open'], attrs: { id: 'overlay' }, id: 'overlay' }];
  const quand = (w > 780 ? 'bureau' : 'téléphone') + ', ' + (theme === 'light' ? 'jour' : 'nuit');
  const fc = gg(creer, w, 'background'), ff = gg(fen, w, 'background'), bc = gg(creer, w, 'backdrop-filter'), bf = gg(fen, w, 'backdrop-filter');
  vrai('(' + quand + ') ouverte, la teinte du voile est celle d’une fenêtre (le scrim du thème)', fc === 'var(--scrim)' && ff === 'var(--scrim)', [fc, ff]);
  vrai('(' + quand + ') … et son flou aussi', !!bc && bc === bf && /^blur\(20px\) saturate\(140%\)$/.test(bc), [bc, bf]);
  const rc = gg(creer, w, 'backdrop-filter', true);
  vrai('(' + quand + ') « moins de transparence » : aucun flou', rc === 'none', rc);
  const tr = gg([html, body, { tag: 'div', classes: ['creer-ov'], attrs: { id: 'creer' }, id: 'creer' }], w, 'transition');
  vrai('(' + quand + ') le flou se FOND avec la couleur, à la même durée (ni surgi, ni coupé)', !!tr && /background-color var\(--d-2,\.24s\) ease/.test(tr) && /(^|,)backdrop-filter var\(--d-2,\.24s\) ease/.test(tr) && /-webkit-backdrop-filter var\(--d-2,\.24s\) ease/.test(tr), tr);
}

console.log('\n── 2847 · 2. tirée au doigt, le flou s’allège avec la couleur ──');
const VIT = bloc('function vitesseRelache('), ELA = bloc('function elastique('), PROJ = bloc('function swipeProjeter('), CONST = (/const SWIPE_ENGAGE=[^;]*;/.exec(CODE) || [''])[0];
const GESTE = bloc('(function creerGeste(){');
vrai('(population) le geste de la feuille est trouvé', GESTE.length > 600, GESTE.length);
function monde(bfCalc) {
  const J = { ecoute: {}, horloge: 1000, fermee: 0 };
  const cl = (init) => { const s = new Set(init); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) }; };
  const f = { style: {}, getBoundingClientRect: () => ({ height: 450 }) };
  const ov = { style: {}, classList: cl(['creer-ov', 'on', 'vu']), querySelector: (s) => s === '.creer-sheet' ? f : null };
  const doc = { addEventListener: (t, fn) => { (J.ecoute[t] = J.ecoute[t] || []).push(fn); }, getElementById: (id) => id === 'creer' ? ov : null, documentElement: { dataset: { kind: 'mobile' } } };
  const ctx = { document: doc, console, Math, String, parseFloat, performance: { now: () => J.horloge }, matchMedia: () => ({ matches: true }),
    getComputedStyle: (x) => ({ backgroundColor: x === ov ? 'rgba(0, 0, 0, 0.35)' : '', backdropFilter: x === ov ? bfCalc : '' }), creerFermer: () => { J.fermee++; } };
  vm.createContext(ctx);
  try { vm.runInContext(CONST + '\n' + PROJ + '\n' + VIT + '\n' + ELA + '\n' + GESTE + ')();', ctx); } catch (e) { J.err = e.message; }
  const cible = { closest: (s) => s === '.creer-sheet' ? f : null }, tire = (t, e) => (J.ecoute[t] || []).forEach(fn => fn(e));
  return { J, f, ov, pose: (y) => tire('touchstart', { touches: [{ clientX: 200, clientY: y }], target: cible }),
    bouge: (y, ms) => { J.horloge += ms || 16; tire('touchmove', { touches: [{ clientX: 200, clientY: y }], cancelable: true, preventDefault() {} }); },
    leve: (ms) => { J.horloge += ms || 0; tire('touchend', { touches: [] }); } };
}
{ const M = monde('blur(20px) saturate(1.4)'); vrai('le code s’exécute', !M.J.err, M.J.err);
  M.pose(500); for (let y = 520; y <= 590; y += 10) M.bouge(y);
  const k = 1 - 90 / 450, bf = M.ov.style.backdropFilter || '', wb = M.ov.style.webkitBackdropFilter || '';
  const b = +((/blur\(([\d.]+)px\)/.exec(bf) || [])[1]), s = +((/saturate\(([\d.]+)\)/.exec(bf) || [])[1]);
  vrai('tirée de 90 px sur 450 : le flou suit la couleur (20 px × ' + k.toFixed(2) + ')', Math.abs(b - 20 * k) < 0.06 && Math.abs(s - (1 + 0.4 * k)) < 0.002, bf);
  vrai('… pour Safari aussi (-webkit-backdrop-filter)', wb === bf, wb);
  M.leve(300);
  vrai('relâchée après un arrêt : elle remonte, plus aucun flou ni couleur en ligne (la règle reprend)', M.J.fermee === 0 && M.ov.style.backdropFilter === '' && M.ov.style.webkitBackdropFilter === '' && M.ov.style.backgroundColor === '', [M.ov.style.backdropFilter, M.ov.style.backgroundColor]); }
{ const M = monde('none'); M.pose(500); for (let y = 520; y <= 590; y += 10) M.bouge(y);
  vrai('« moins de transparence » (flou calculé : none) : le geste n’en pose aucun', !M.ov.style.backdropFilter, M.ov.style.backdropFilter); M.leve(300); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
