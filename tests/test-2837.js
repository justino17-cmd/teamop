/* ══ test-2837 · L'APPUI SE VOIT, TOUT DE SUITE, SUR LES 36 FAMILLES QUI NE RÉPONDAIENT PAS ═══════════════════════════════
   Audit apple-design du 21 octobre 2026, § 11 (« every tap gets an instant visual response »). Mesuré commande par
   commande (état :active forcé, toutes les rubriques, téléphone et Mac) : 36 familles ne changeaient en rien sous le
   doigt — cases et en-têtes des plannings, barre d'outils du planning, historique, compteurs d'absences, carte, en-têtes
   de catégorie des produits, graphique de consommation, logo, « Modifier » des favoris et fiche du compte au Mac — et la
   ligne en verre (.tf-rangee) répondait en 200 ms.
   Ce banc prend chaque famille telle que la page l'écrit (balise, classes, attributs, ancêtres), cherche les règles
   :active de la feuille qui la VISENT (le sélecteur rejoué par tests/outils-cascade-app.js, :is() déplié) et exige
   qu'une d'elles change ce qui se voit, sans transition qui retarde. La preuve dans la page, au toucher forcé :
   scratchpad/sonde-appui.js.                                                                                        */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* les règles des feuilles, avec leur chaîne de médias — le même parcours que test-2836 : C.regles coupe un sélecteur à
   CHAQUE virgule, y compris dans :is(…) et :not(…), et rendrait des morceaux de sélecteur */
function regles(B) {
  const out = [];
  const finBloc = (css, i) => { let p = 1, k = i + 1, q = null; for (; k < css.length; k++) { const d = css[k];
    if (css.startsWith('/*', k)) { k = css.indexOf('*/', k + 2) + 1; continue; } if (q) { if (d === '\\') { k++; continue; } if (d === q) q = null; continue; }
    if (d === '"' || d === "'") { q = d; continue; } if (d === '{') p++; else if (d === '}') { if (!--p) return k; } } return -1; };
  const parcourir = (css, base, media) => { let i = 0, deb = 0, q = null;
    while (i < css.length) { const c = css[i];
      if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? css.length : j + 2; continue; }
      if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; i++; continue; }
      if (c === '{') { const net = css.slice(deb, i).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(), k = finBloc(css, i);
        if (net.startsWith('@')) { if (/^@(media|supports|layer|container)/.test(net)) parcourir(css.slice(i + 1, k), base + i + 1, media.concat([net])); }
        else out.push({ sel: net, media, corps: css.slice(i + 1, k).replace(/\s+/g, ' ').trim(), pos: base + deb });
        i = k + 1; deb = i; continue; }
      if (c === '}' || c === ';') deb = i + 1; i++; } };
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = re.exec(B))) parcourir(m[1], m.index + m[0].indexOf('>') + 1, []);
  return out;
}
const REGLES = regles(BRUT).map(r => ({ sel: r.sel, media: r.media.map(m => m.replace(/^@media\s*/i, '')), decls: declarations(r.corps) }));
function declarations(corps) { return corps.split(';').map(x => x.trim()).filter(Boolean).map(x => { const k = x.indexOf(':');
  let v = x.slice(k + 1).trim(); const imp = /!important\s*$/i.test(v); v = v.replace(/\s*!important\s*$/i, ''); return { p: x.slice(0, k).trim().toLowerCase(), v, imp }; }); }
/* une liste de sélecteurs coupée aux virgules du premier niveau */
const couper = (sel) => { const o = []; let p = 0, deb = 0; for (let k = 0; k < sel.length; k++) { const c = sel[k];
  if (c === '(') p++; else if (c === ')') p--; else if (c === ',' && !p) { o.push(sel.slice(deb, k)); deb = k + 1; } }
  o.push(sel.slice(deb)); return o.map(s => s.trim()).filter(Boolean); };
/* :is(A, B)X → AX, BX (un niveau, ce que la feuille écrit) */
const deplier = (sel) => { const m = /:is\(((?:[^()]|\([^()]*\))*)\)/.exec(sel); if (!m) return [sel];
  return couper(m[1]).flatMap(a => deplier(sel.slice(0, m.index) + a + sel.slice(m.index + m[0].length))); };
/* les règles d'appui, chacune réduite à ce qu'elle VISE (l'état :active et ses gardes :not(:has(…)) ôtés) */
const APPUI = [];
for (const r of REGLES) for (const part of couper(r.sel)) {
  if (!/:active\b/.test(part)) continue;
  for (const d of deplier(part)) {
    const cible = d.replace(/:not\(:has\((?:[^()]|\([^()]*\))*\)\)/g, '').replace(/:active\b/g, '').replace(/\s+/g, ' ').trim();
    APPUI.push({ cible, decls: r.decls, media: r.media, sel: part });
  }
}
/* ⚠️ l'outil de cascade tient [a^="…"], [a*="…"], [a$="…"] pour vrais dès que l'attribut existe (il crie plutôt que de se
   taire) : ici, ce serait l'inverse — `[onclick^="intSelDay='"]:active` « couvrirait » toutes les familles. On exige
   donc qu'un élément de la chaîne SATISFASSE chaque sélecteur d'attribut à valeur de la cible. */
const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
const attrsTenus = (cible, chaine) => [...cible.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => {   // ce qu'un :not() écarte n'est pas exigé
  const nom = m[1], op = m[2], val = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return chaine.some(e => { const a = (e.attrs || {})[nom]; if (a === undefined) return false; const x = String(a);
    return op === '=' ? x === val : op === '^=' ? x.startsWith(val) : op === '$=' ? x.endsWith(val) : op === '*=' ? x.includes(val)
      : op === '~=' ? x.split(/\s+/).includes(val) : op === '|=' ? (x === val || x.startsWith(val + '-')) : false; });
});
const VISIBLE = /^(background|background-color|box-shadow|opacity|filter|color|fill|transform|scale|outline|border-color)$/;
const HTML = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } };
const BODY = { tag: 'body', classes: [], attrs: {} };
const el = (tag, classes, attrs) => ({ tag, classes: classes || [], attrs: attrs || {} });
const O = { onclick: 'x()' };
const CONTENU = { tag: 'div', classes: ['content'], attrs: { id: 'content' }, id: 'content' };
/* les familles telles que la page les écrit — la population mesurée par l'audit (sauf la liste native et le lien
   d'attribution de la carte, nommés plus bas) */
const FAMILLES = [
  ['tableau de bord : la zone « N interventions »', [el('div', ['card']), el('div', ['tdb-rz'], O)]],
  ['tableau de bord : en-tête de jour', [el('div', ['tdb-grille']), el('div', ['tdb-jh', 'auj'], O)]],
  ['tableau de bord : la personne', [el('div', ['tdb-grille']), el('div', ['tdb-tec'], O)]],
  ['tableau de bord : la case du jour', [el('div', ['tdb-grille']), el('div', ['tdb-cel', 'auj'], O)]],
  ['tableau de bord : l’intervention dans la case', [el('div', ['tdb-cel'], O), el('div', ['tdb-pc'], O)]],
  ['historique : la ligne', [el('div', ['card']), el('div', ['tl-item'], O)]],
  ['Planning général : en-tête de jour (week-end)', [el('div', ['pg-g']), el('div', ['pg-hd', 'we'], O)]],
  ['Planning général : la personne', [el('div', ['pg-g']), el('div', ['pg-pers'], O)]],
  ['Planning général : la case', [el('div', ['pg-g']), el('div', ['pg-cel', 'auj'], O)]],
  ['Planning général : l’intervention dans la case', [el('div', ['pg-cel'], O), el('div', ['pg-pt'], O)]],
  ['Planning : l’en-tête d’une personne', [el('div', ['plm']), el('div', ['plg-tete', 'plm-th', 'clic', 'sep'], O)]],
  ['Planning : « ‹ période précédente »', [el('span', ['pf-nav']), el('u', [], O)]],
  ['Planning : « revenir à aujourd’hui »', [el('span', ['pf-nav']), el('span', ['auj'], O)]],
  ['Planning : le zoom « 100 % »', [el('span', ['pf-zoom']), el('b', [], O)]],
  ['Planning : le zoom « − / + »', [el('span', ['pf-zoom']), el('span', [], O)]],
  ['Planning : « Planning seul / carte à côté »', [el('span', ['pf-disp']), el('button', [], O)]],
  ['Planning : le menu « Équipe »', [el('div', ['pf-dd']), el('button', ['pf-b', 'act'], O)]],
  ['Absences : un compteur', [el('div', ['abs-cnts']), el('div', ['abs-cnt'], O)]],
  ['Produits : l’en-tête d’une catégorie', [el('div', []), el('div', ['prd-cat-h'], O)]],
  ['Consommation : une colonne du graphique', [el('svg', []), el('rect', [], O)]],
  ['Mac : le logo du menu', [el('aside', ['sidebar']), el('div', ['brand'], O)]],
  ['Mac : « Modifier » des favoris', [el('aside', ['sidebar']), el('button', ['nav-fav-edit'], O)]],
  ['Mac : la fiche du compte', [el('aside', ['sidebar']), el('div', ['suite-user'], O)]],
  ['Interventions (Mac) : « Voir au planning »', [el('div', ['tf-rangee'], O), el('button', ['tf-act', 'tf-large'], O)]],
  ['Carte : un bouton de zoom', [el('div', ['leaflet-bar', 'leaflet-control-zoom']), el('a', ['leaflet-control-zoom-in'], { href: '#' })]],
  ['Carte : un repère', [el('div', ['leaflet-marker-pane']), el('div', ['leaflet-marker-icon', 'leaflet-interactive', 'leaflet-zoom-animated'])]],
  ['Planning général : « Équipe », hors d’un menu déroulant', [el('div', ['pf-row']), el('button', ['pf-b'], O)]],
  ['Mouvements : une pastille de filtre écrite en ligne (sans classe)', [CONTENU, el('div', []), el('button', [], O)]],
  ['Mouvements : une ligne de journal écrite en ligne (sans classe)', [CONTENU, el('div', ['card']), el('div', [], O)]],
  ['Fournisseurs : une adresse e-mail (lien de texte)', [CONTENU, el('div', ['pl-row']), el('a', [], { href: 'mailto:x@y.z' })]],
];

console.log('\n── 2837 · 0. la population ──');
vrai('les règles d’appui de la feuille sont lues (plus de 60)', APPUI.length > 60, APPUI.length);
vrai(FAMILLES.length + ' familles décrites (les 36 de l’audit, regroupées par forme d’écriture)', FAMILLES.length >= 26);

console.log('\n── 2837 · 1. chaque famille a un appui qui se voit, sans délai ──');
const W = 390;
for (const [nom, chaine] of FAMILLES) {
  const ch = [HTML, BODY].concat(chaine);
  const visent = APPUI.filter(a => a.media.every(m => C.mediaVrai(m, W) && !/prefers-reduced-motion|hover:\s*none/.test(m)) && C.selecteurVise(a.cible, ch) && attrsTenus(a.cible, ch));
  const voit = visent.filter(a => a.decls.some(d => VISIBLE.test(d.p) && !/^(none|inherit|initial|unset)$/.test(d.v.trim())));
  const lent = voit.filter(a => a.decls.some(d => /^transition(-duration)?$/.test(d.p) && /(^|\s)0?\.[1-9]\d*s|\b[1-9]\d{2,}ms|var\(--d-[1-9]\)/.test(d.v)));
  vrai(nom + ' : un appui VISIBLE la vise', voit.length > 0, visent.map(a => a.sel).slice(0, 3));
  vrai(nom + ' : … sans transition qui le retarde', voit.length > 0 && !lent.length, lent.map(a => a.sel).slice(0, 2));
}

console.log('\n── 2837 · 2. la ligne en verre répond tout de suite ──');
{ const ch = [HTML, BODY, el('div', ['tf-groupe']), el('div', ['tf-rangee'], O)];
  const visent = APPUI.filter(a => C.selecteurVise(a.cible, ch) && attrsTenus(a.cible, ch));
  const dur = visent.flatMap(a => a.decls.filter(d => d.p === 'transition-duration').map(d => d.v));
  vrai('.tf-rangee:active pose une durée d’entrée instantanée (--d-0) — elle répondait en 200 ms', dur.some(v => /var\(--d-0\)|^0m?s$/.test(v.trim())), dur); }

console.log('\n── 2837 · 2 bis. la cloche, le menu et les pastilles s’enfoncent tout de suite ──');
/* leur transition de relâcher (ressort, 280 ms) est écrite en !important : une durée d'appui sans !important perdait */
for (const [nom, cls] of [['la cloche', 'bell'], ['le bouton du menu', 'menu-btn'], ['une pastille', 'chip']]) {
  const ch = [HTML, BODY, el('div', ['topbar']), el('button', [cls], O)];
  const d = APPUI.filter(a => C.selecteurVise(a.cible, ch) && attrsTenus(a.cible, ch)).flatMap(a => a.decls.filter(x => x.p === 'transition-duration').map(x => x.v + (x.imp ? ' !important' : '')));
  vrai(nom + ' : durée d’appui instantanée, en !important (elle bat la transition du relâcher)', d.some(v => /var\(--d-0\)\s*!important|^0m?s !important/.test(v)), d);
}

console.log('\n── 2837 · 3. une case ne s’allume pas avec l’intervention qu’on touche ──');
for (const [cel, pt] of [['tdb-cel', 'tdb-pc'], ['pg-cel', 'pg-pt']]) {
  const parts = REGLES.flatMap(r => couper(r.sel)).filter(p => new RegExp('\\.' + cel + '\\b').test(p) && /:active/.test(p));
  vrai('.' + cel + ':active écarte l’appui d’une .' + pt + ' qu’elle contient (:active vaut aussi pour les parents)', parts.length > 0 && parts.every(p => new RegExp(':not\\(:has\\(\\.' + pt + ':active\\)\\)').test(p)), parts);
}

console.log('\n── 2837 · 4. l’en-tête de catégorie des produits porte sa classe ──');
{ const k = BRUT.indexOf('onclick="prdExpanded['), tag = k > 0 ? BRUT.slice(BRUT.lastIndexOf('<div', k), k) : '';
  vrai('l’en-tête qui plie une catégorie (onclick="prdExpanded[…]") porte class="prd-cat-h" — sans elle, rien ne le vise', k > 0 && /class="prd-cat-h"/.test(tag), tag.slice(0, 60)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
