/* ══ test-2849 · UNE FENÊTRE OUVERTE NE FAIT PAS DÉFILER LA PAGE DERRIÈRE ELLE ═══════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 32. Mesuré dans la vraie page (scratchpad/sonde-fenetre-defile.js, origine 5 ✓ 6 ✗,
   corrigée 11 ✓) : au bureau, la molette sur une fenêtre ouverte faisait défiler la page dessous ; au téléphone, un glissement sur
   une petite fenêtre ou sur le voile de « Créer » emmenait la page de 163 px ; et une fenêtre rouverte commençait défilée (585 px)
   à la position de la précédente. « overscroll-behavior:contain » ne retient qu'un voile QUI DÉFILE : le voile défile donc
   toujours d'un pixel (un ::before invisible), et chaque ouverture le remet en haut.
   Ce banc REJOUE LA CASCADE pour les voiles (#overlay, #overlay2, « Créer »), relit le pseudo-élément du pixel et EXÉCUTE
   openModal / openSub avec un document simulé.                                                                              */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
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
const gg = (ch, w, prop) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, w, prop, undefined, juge); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } }, body = { tag: 'body', classes: [], attrs: {} };

console.log('\n── 2849 · 1. les voiles retiennent le défilement ──');
for (const w of [390, 1280]) for (const [nom, el] of [['#overlay', { tag: 'div', classes: ['overlay', 'open'], attrs: { id: 'overlay' }, id: 'overlay' }],
  ['#overlay2 (fenêtre secondaire)', { tag: 'div', classes: ['overlay', 'open'], attrs: { id: 'overlay2' }, id: 'overlay2' }]]) {
  const ch = [html, body, el], ob = gg(ch, w, 'overscroll-behavior'), oy = gg(ch, w, 'overflow-y'), pos = gg(ch, w, 'position');
  vrai('(' + w + ' px) ' + nom + ' : overscroll-behavior:contain', ob === 'contain', ob);
  vrai('(' + w + ' px) ' + nom + ' : … sur un conteneur qui défile (overflow-y:auto), fixé à l’écran (le pixel s’y mesure)', oy === 'auto' && pos === 'fixed', [oy, pos]);
}

/* la feuille « Créer » ne défile jamais : son voile ne laisse aucun défilement au doigt, et avale la molette. (Rendre son voile
   défilant comme celui des fenêtres cassait la chiquenaude qui la ferme : le navigateur prenait les premiers millimètres.) */
for (const w of [390, 1280]) {
  const t = gg([html, body, { tag: 'div', classes: ['creer-ov', 'on', 'vu'], attrs: { id: 'creer' }, id: 'creer' }], w, 'touch-action');
  vrai('(' + w + ' px) la feuille « Créer » : aucun défilement au doigt sur son voile (touch-action:none)', t === 'none', t);
}
{ const m = /\nfunction creerOuvrir\(\)\{[\s\S]*?\n\}/.exec(CODE), f = m ? m[0] : '';
  vrai('… et creerOuvrir avale la molette sur le voile (onwheel → preventDefault, un gestionnaire d’élément n’est pas passif)', /ov\.onwheel=e=>\{ e\.preventDefault\(\); \};/.test(f)); }

console.log('\n── 2849 · 2. le voile défile toujours d’un pixel (une fenêtre courte retient aussi) ──');
{ const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const m = /(^|[}\s])\.overlay::before\{([^}]*)\}/.exec(CSS), d = m ? m[2] : '';
  vrai('un ::before sur le voile des fenêtres', !!m);
  vrai('… positionné en absolu depuis le haut, d’un pixel plus haut que le voile (il crée un pixel à défiler)', /content:""/.test(d) && /position:absolute/.test(d) && /top:0/.test(d) && /height:calc\(100% \+ 1px\)/.test(d), d);
  vrai('… invisible et transparent au toucher (1 px de large, aucun fond, pointer-events:none)', /width:1px/.test(d) && !/background/.test(d) && /pointer-events:none/.test(d), d);
  const autres = (CSS.match(/\.(overlay|creer-ov)::before\s*\{/g) || []).length + (CSS.match(/#overlay2?::before/g) || []).length;
  vrai('aucune autre règle ne réécrit ce ::before (il ne sert qu’à ça)', autres === 1, autres); }

console.log('\n── 2849 · 3. une fenêtre ouverte commence en haut ──');
function fonction(nom) { const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return ''; const i = CODE.indexOf('\n', m.index + 1); return CODE.slice(m.index + 1, i); }
{ const OS = fonction('openSub');
  const ov2 = { scrollTop: 585, classList: { add() {}, remove() {} } }, m2 = { scrollTop: 40, innerHTML: '' };
  const ctx = { $: (id) => id === 'modal2' ? m2 : id === 'overlay2' ? ov2 : null, clearTimeout() {}, _subSortie: null };
  vm.createContext(ctx); let err = null; try { vm.runInContext(OS + '\nopenSub("<p>x</p>");', ctx); } catch (e) { err = e.message; }
  vrai('openSub remet le voile secondaire en haut (il était à 585 px)', !err && ov2.scrollTop === 0 && m2.scrollTop === 0, err || ov2.scrollTop); }
{ const m = /\n  m\.innerHTML=html; \$\('overlay'\)\.classList\.add\('open'\); m\.scrollTop=0; \$\('overlay'\)\.scrollTop=0;/.exec(CODE);
  vrai('openModal remet le voile en haut, avec la fenêtre (dans openModal même, pas ailleurs)', !!m && CODE.lastIndexOf('\nfunction ', m.index) === CODE.lastIndexOf('\nfunction openModal(', m.index)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
