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

console.log('\n── 2849 · 3. une AUTRE fenêtre commence en haut ; la même, redessinée, garde sa place ──');
/* relecture adverse (partie X) : openModal remettait le voile en haut à CHAQUE appel — une teinte touchée dans « Thème et
   couleur » (themeCouleur se redessine par openModal) renvoyait la fenêtre tout en haut. Une fenêtre NOUVELLE (voile fermé, ou
   en train de partir) ou d'un autre titre revient en haut ; la même, redessinée, garde sa place. */
function bloc(nom) { const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1); }
const elt = (cl) => { const C = new Set(cl || []); const e = { scrollTop: 0, scrollHeight: 0, clientHeight: 0, innerHTML: '', className: '',
  classList: { add: (...x) => x.forEach(y => C.add(y)), remove: (...x) => x.forEach(y => C.delete(y)), contains: (x) => C.has(x), toggle: (x, on) => { if (on === undefined ? !C.has(x) : on) C.add(x); else C.delete(x); return C.has(x); } },
  querySelector: (sel) => { const m = /<h3>([^<]*)<\/h3>/.exec(e.innerHTML); return /h3/.test(sel) && m ? { textContent: m[1] } : null; } };
  Object.defineProperty(e, 'textContent', { get: () => e.innerHTML.replace(/<[^>]*>/g, ' ') }); return e; };
const FEN = (t) => '<div class="modal-head"><h3>' + t + '</h3></div><p>…</p>';
for (const [nom, src] of [['openSub', bloc('openSub')], ['openModal', bloc('openModal')]]) {
  vrai('(population) ' + nom + ', voileBarre et fenetreSignature sont trouvées', src.length > 100 && bloc('voileBarre').length > 50 && bloc('fenetreSignature').length > 20);
  const m = elt(), ov = elt(), obs = [];
  const ctx = { $: (id) => (id === 'modal2' || id === 'modal') ? m : (id === 'overlay2' || id === 'overlay') ? ov : null, clearTimeout() {}, setTimeout() { return 0; }, _subSortie: null,
    kpiTailler() {}, window: {}, ResizeObserver: function (f) { this.observe = (x) => obs.push(x); } };
  vm.createContext(ctx); let err = null;
  try { vm.runInContext('var _multiHtml="";\n' + bloc('voileBarre') + '\n' + bloc('fenetreSignature') + '\n' + src, ctx); } catch (e) { err = e.message; }
  const ouvrir = (t, avant) => { if (avant) avant(); try { vm.runInContext(nom + '(' + JSON.stringify(FEN(t)) + ');', ctx); } catch (e) { err = e.message; } };
  ov.scrollTop = 585; ouvrir('Client');
  vrai(nom + ' : une fenêtre NOUVELLE (voile fermé, il gardait 585 px) commence en haut', !err && ov.scrollTop === 0 && m.scrollTop === 0, err || ov.scrollTop);
  ov.scrollTop = 420; ouvrir('Client');
  vrai('⛔ ' + nom + ' : la MÊME fenêtre redessinée (même titre, voile ouvert) garde sa place — 420 px', !err && ov.scrollTop === 420, err || ov.scrollTop);
  ov.scrollTop = 420; ouvrir('Devis');
  vrai(nom + ' : une AUTRE fenêtre ouverte par-dessus (autre titre) revient en haut', !err && ov.scrollTop === 0, err || ov.scrollTop);
  ov.scrollTop = 420; ouvrir('Devis', () => { ov.classList.add('ferme'); if (nom === 'openModal') { ov._nouvelle = true; ov.classList.remove('ferme'); } });
  vrai(nom + ' : une fenêtre rouverte pendant que la précédente PART (« ferme ») est une nouvelle — en haut, même titre', !err && ov.scrollTop === 0, err || ov.scrollTop);
  /* relecture adverse de la partie X : deux fenêtres à titre NU (un h3 sans .modal-head), enchaînées sans fermeture —
     « Copies de sauvegarde » puis « Copie du … » — passaient pour la même : la seconde s'ouvrait défilée */
  const NUE = (t, x) => '<h3 style="margin:0">' + t + '</h3><p>' + x + '</p>';
  ov.scrollTop = 420; try { vm.runInContext(nom + '(' + JSON.stringify(NUE('Copies de sauvegarde', '54 copies')) + ');', ctx); } catch (e) { err = e.message; }
  ov.scrollTop = 700; try { vm.runInContext(nom + '(' + JSON.stringify(NUE('Copie du 12 octobre', 'Remettre cette copie')) + ');', ctx); } catch (e) { err = e.message; }
  vrai('⛔ ' + nom + ' : une autre fenêtre à titre NU (sans .modal-head), ouverte par-dessus, revient en haut', !err && ov.scrollTop === 0, err || ov.scrollTop);
  ov.scrollTop = 300; try { vm.runInContext(nom + '(' + JSON.stringify(NUE('Copie du 12 octobre', 'Remettre cette copie')) + ');', ctx); } catch (e) { err = e.message; }
  vrai(nom + ' : … la même, redessinée, garde sa place', !err && ov.scrollTop === 300, err || ov.scrollTop);
  /* après le premier dessin, icones() change « ✕ » en dessin : le texte relu avant le redessin n'a plus le « ✕ », celui d'après
     l'a — la même fenêtre ne doit pas passer pour une autre (vu au doigt sur « Thème et couleur », sonde-relecture.js) */
  const AVEC_X = '<div class="modal-head"><h3>Thème et couleur</h3><button>✕</button></div><p>Teinte d’accentuation</p>';
  try { vm.runInContext(nom + '(' + JSON.stringify(AVEC_X) + ');', ctx); } catch (e) { err = e.message; }
  m.innerHTML = m.innerHTML.replace('✕', '<svg></svg>'); ov.scrollTop = 260;
  try { vm.runInContext(nom + '(' + JSON.stringify(AVEC_X) + ');', ctx); } catch (e) { err = e.message; }
  vrai('⛔ ' + nom + ' : la même fenêtre, dont « ✕ » est devenu une icône entre deux dessins, garde sa place (260 px)', !err && ov.scrollTop === 260, err || ov.scrollTop);
  vrai(nom + ' : … et le voile suit la taille de la fenêtre (un observateur, posé une fois, sur le voile ET la fenêtre)', obs.length === 2 && obs.includes(ov) && obs.includes(m), obs.length);
  ov.scrollHeight = 801; ov.clientHeight = 800; ouvrir('Devis');
  vrai(nom + ' : fenêtre courte (le seul pixel du ::before) : la barre est masquée (« sans-barre »)', ov.classList.contains('sans-barre'));
  ov.scrollHeight = 1400; vm.runInContext('voileBarre($("' + (nom === 'openSub' ? 'overlay2' : 'overlay') + '"))', ctx);
  vrai(nom + ' : fenêtre plus haute que l’écran : la barre revient', !ov.classList.contains('sans-barre'));
}
{ const env = /window\.openModal=function\(\)\{[\s\S]*?return ouvrirNatif\.apply\(this,arguments\);/.exec(CODE), e = env ? env[0] : '';
  vrai('l’enveloppe de openModal décide « nouvelle » AVANT de retirer « ferme » (une fenêtre qui part, puis une autre : en haut)',
    /ov\._nouvelle=!ov\.classList\.contains\('open'\)\|\|ov\.classList\.contains\('ferme'\); ov\.classList\.remove\('ferme'\);/.test(e), e.slice(-260)); }

console.log('\n── 2849 · 4. la barre du voile ne paraît que s’il y a de quoi défiler ──');
for (const w of [390, 1280]) {
  const ch = (cl) => [html, body, { tag: 'div', classes: cl, attrs: { id: 'overlay' }, id: 'overlay' }];
  vrai('(' + w + ' px) voile court (« sans-barre ») : scrollbar-width:none — le pixel du ::before ne fait plus paraître de barre', gg(ch(['overlay', 'open', 'sans-barre']), w, 'scrollbar-width') === 'none', gg(ch(['overlay', 'open', 'sans-barre']), w, 'scrollbar-width'));
  vrai('(' + w + ' px) voile qui défile vraiment : la barre reste celle de la page (mince)', gg(ch(['overlay', 'open']), w, 'scrollbar-width') !== 'none', gg(ch(['overlay', 'open']), w, 'scrollbar-width'));
}
{ const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  vrai('… et WebKit aussi (::-webkit-scrollbar masqué sur le voile court)', /\.overlay\.sans-barre::-webkit-scrollbar\{display:none\}/.test(CSS)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
