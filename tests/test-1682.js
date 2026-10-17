/* ══ test-1682 · LES RANGÉES DE FILTRES EN SEGMENTÉ SONT POSÉES SUR LA MARGE DE LA COLONNE, PAS DÉCALÉES DE 16 PX ══
   Lot c2-filtres-alignes (suite du lot k02, test-1641). Au téléphone, six écrans — Tâches, Registre, Demandes (donc « Historique
   des demandes »), Historique, Bons (deux barres) — posaient leur barre de puces à x=0 au lieu de x=16 : collée au bord de l'écran,
   16 px à gauche de la colonne, alors que Clients, Produits, Boxes, Comptabilité… sont alignés.

   Cause. Au téléphone, `html[data-refonte] .filters` donne `margin-left/right: calc(0px - var(--rf-marge))` (-16 px) : une rangée
   qui défile bord à bord, avec un rembourrage de 16 px qui ramène le premier chip sur la colonne. Dès que la barre est un
   SEGMENTÉ (`.filters.seg-on` : 2 à 4 puces, padding 3 px), ou qu'elle écrit son propre `padding:3px` (la piste de Bons, reconnue
   par `.filters[style*="padding:3px"]`), le rembourrage ne compense plus rien : la marge de -16 décale la barre. Les écrans alignés
   l'étaient par hasard, parce qu'ils écrivent `margin:0 0 8px` en ligne (le raccourci efface aussi les marges latérales) ; ceux-ci
   n'écrivent que `margin-bottom` / `margin-top`.

   Correctif, MÊME mécanisme que k02 (une règle de feuille gardée par l'état segmenté, `.cli-barre` en est le cas particulier avec
   ses 8 px de marge droite) mais sans classe par écran : `.filters.seg-on` et `.filters[style*="padding:3px"]` reviennent à 0 (une
   barre inline-flex prend au plus la place qui lui reste : elle ne dépasse pas la colonne, rien d'autre à poser). Une rangée de cinq puces ou plus, qui
   n'est PAS un segmenté, garde son débordement bord à bord voulu.

   Ce banc REJOUE LA CASCADE (tests/outils-cascade-app.js, `>` strict) pour chaque barre telle que sa vue l'écrit — lue dans le CODE de
   app.html, jamais dans un commentaire —, à 320, 360, 390, 430 px (téléphones) et 820 px (iPad). La preuve au navigateur, qui MESURE
   la position réelle et la contre-épreuve : scratchpad/gestion/correctifs-c2/c2-filtres-alignes/sonde-filtres.js.                   */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
/* ⛔ seuls les blocs qui COMMENCENT une ligne sont des commentaires (CLAUDE.md : un nettoyage naïf avale 107 Ko d'app.html) */
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS).filter(r => /^[a-z.#\[*]/i.test(r.sel));   // l'outil découpe sur chaque virgule, y compris dans `[style*="a,b"]`
function dernierEnfant(sel) {
  let prof = 0, k = -1;
  for (let i = 0; i < sel.length; i++) { const c = sel[i]; if (c === '(' || c === '[') prof++; else if (c === ')' || c === ']') prof--; else if (c === '>' && !prof) k = i; }
  return k;
}
function reglesPour(chaine) {
  const dernier = chaine[chaine.length - 1], styleCible = (dernier.attrs && dernier.attrs.style) || '';
  return REGLES.filter(r => {
    /* ⚠️ l'outil traite `[style*="x"]` comme « l'attribut style existe » : la règle de la piste de Bons (`padding:3px`) passerait pour
       vraie sur TOUTE barre qui écrit un style. On exige ici que le style contienne vraiment le fragment visé. */
    for (const m of r.sel.matchAll(/\[style\*=["']([^"']*)["']\]/g)) if (!styleCible.includes(m[1])) return false;
    const k = dernierEnfant(r.sel); if (k < 0) return true;
    const tete = r.sel.slice(0, k).trim(), queue = r.sel.slice(k + 1).trim();
    if (!tete || /\s/.test(queue.replace(/\([^)]*\)|\[[^\]]*\]/g, ''))) return true;
    return C.selecteurVise(tete, chaine.slice(0, -1));
  });
}
const gagne = (chaine, w, prop, enL) => C.gagnant(reglesPour(chaine), chaine, w, prop, enL);

console.log('\n── 1682 · 0. la population ──');
vrai('des règles sont lues (la cascade rejouée n\'est pas sur du néant)', REGLES.length > 3000, REGLES.length);

/* la barre telle que sa vue l'écrit : le DERNIER `<div class="filters…">` avant une ancre propre à ses puces */
function barreAvant(ancre) {
  const i = CODE.indexOf(ancre);
  if (i < 0) return null;
  const j = CODE.lastIndexOf('<div class="filters', i);
  if (j < 0 || i - j > 600) return null;
  const m = /^<div class="([^"]*)"(?:\s+style="([^"]*)")?[^>]*>/.exec(CODE.slice(j));
  return m ? { classes: m[1], style: m[2] || '' } : null;
}
const BARRES = [
  ['Tâches', "${tacheFilter===k?'active':''}"],
  ['Registre (onglets)', "${registreTab==='passages'?'active':''}"],
  ['Demandes et Historique des demandes', "${demOnglet==='cours'?'active':''}"],
  ['Historique', "${histFilter===t?'active':''}"],
  ['Bons (piste Par box / Liste / …)', "bonsTab='${k}';views.bons()"],
  ['Bons (état)', "${bonsFilter==='attente'?'active':''}"],
].map(([nom, ancre]) => ({ nom, ancre, b: barreAvant(ancre) }));
for (const x of BARRES) vrai('la barre « ' + x.nom + ' » est trouvée dans le code', !!x.b, x.ancre);
for (const x of BARRES) if (x.b) {
  vrai('« ' + x.nom + ' » : aucune classe propre à l\'écran — le correctif est une règle de feuille, pas une règle par écran', x.b.classes.trim() === 'filters', x.b.classes);
  vrai('« ' + x.nom + ' » : aucune marge latérale écrite en ligne (sinon la cascade ne la décidait pas)', !/margin(-left|-right)?\s*:\s*[^;]*/.test(x.b.style.replace(/margin-(top|bottom)\s*:[^;]*/g, '')), x.b.style);
}

const html = { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': 'mobile' }, classes: [] };
const base = [html, { tag: 'body', classes: ['rf-onglets'], attrs: {} }, { tag: 'main', id: 'content', classes: ['content'], attrs: {} }];
const enLigne = (style, prop) => { const m = new RegExp('(?:^|;)\\s*' + prop + ':\\s*([^;]+)').exec(style || ''); return m ? m[1].trim() : undefined; };
const marge = (b, w, cote, seg) => {
  const classes = b.classes.split(/\s+/).filter(Boolean).concat(seg ? ['seg-on'] : []);
  const ch = base.concat({ tag: 'div', classes, attrs: { class: classes.join(' '), style: b.style } });
  const g = gagne(ch, w, 'margin-' + cote, enLigne(b.style, 'margin-' + cote));
  return { g, px: g ? C.px(g.v, { vars: { '--rf-marge': 16 }, hauteur: 900 }) : 0 };
};

const TEL = [320, 360, 390, 430];
console.log('\n── 1682 · 1. au téléphone, une barre en segmenté est posée sur la marge de la colonne (0), jamais en débordement (-16) ──');
for (const x of BARRES) if (x.b) {
  /* la piste de Bons n'est pas un `.seg-on` (ses puces ne sont pas des `.chip`) : elle se reconnaît à son `padding:3px` écrit en ligne */
  const piste = /padding:3px/.test(x.b.style);
  for (const w of TEL) {
    const gl = marge(x.b, w, 'left', !piste), dr = marge(x.b, w, 'right', !piste);
    vrai(w + ' px · « ' + x.nom + ' » : marge gauche = 0 (' + gl.px + ' px, ' + (gl.g && gl.g.sel) + ')', gl.px === 0, gl.g && gl.g.v);
    vrai(w + ' px · « ' + x.nom + ' » : marge droite = 0 (' + dr.px + ' px, ' + (dr.g && dr.g.sel) + ')', dr.px === 0, dr.g && dr.g.v);
  }
}

{
  const piste = BARRES.find(x => /padding:3px/.test((x.b || {}).style || ''));
  vrai('la piste de Bons (padding:3px écrit en ligne) est identifiée', !!piste);
  if (piste) for (const w of TEL) {
    const g = gagne(base.concat({ tag: 'div', classes: ['filters'], attrs: { class: 'filters', style: piste.b.style } }), w, 'max-width', undefined);
    vrai(w + ' px · la piste de Bons plafonne à 100 % de sa colonne (320 px : 297 px de piste dans 288 de colonne, sortie de 9 px à droite)', !!g && g.v === '100%', g && g.v);
  }
}

console.log('\n── 1682 · 2. sur iPad et au bureau, rien ne bouge : marges à 0 (la règle des -16 px est un palier téléphone) ──');
for (const x of BARRES) if (x.b) {
  const piste = /padding:3px/.test(x.b.style);
  for (const w of [820, 1440]) {
    const gl = marge(x.b, w, 'left', !piste), dr = marge(x.b, w, 'right', !piste);
    vrai(w + ' px · « ' + x.nom + ' » : marges 0 / 0', gl.px === 0 && dr.px === 0, [gl.px, dr.px]);
  }
}

console.log('\n── 1682 · 3. contre-épreuves : ce qui doit rester où il est ──');
{
  /* une rangée de 5 puces ou plus n'est pas un segmenté : elle défile bord à bord, avec son rembourrage de 16 px */
  const rangee = { classes: 'filters', style: 'margin-bottom:10px' };
  for (const w of TEL) {
    const gl = marge(rangee, w, 'left', false), dr = marge(rangee, w, 'right', false);
    vrai(w + ' px · une rangée qui n\'est pas un segmenté garde son débordement bord à bord (-16 / -16)', gl.px === -16 && dr.px === -16, [gl.px, dr.px]);
  }
  /* les deux barres de Clients (k02) : 0 à gauche, 8 px à droite */
  for (const w of TEL) {
    const cli = { classes: 'filters cli-barre', style: 'margin-bottom:10px' };
    const gl = marge(cli, w, 'left', true), dr = marge(cli, w, 'right', true);
    vrai(w + ' px · les barres de Clients (cli-barre) restent à 0 / 8 px (k02)', gl.px === 0 && dr.px === 8, [gl.px, dr.px]);
  }
  /* une barre qui écrit sa marge en ligne (Produits : margin:0 0 8px) n'est pas touchée */
  const prod = { classes: 'filters', style: 'margin:0 0 8px' };
  for (const w of TEL) {
    const gl = marge(prod, w, 'left', true);
    vrai(w + ' px · une barre à `margin:0 0 8px` en ligne garde sa marge (' + gl.px + ')', gl.px === 0, gl.g && gl.g.v);
  }
  /* les segmentés posés sous une carte (`.content-map > .filters.seg-on`) gardent la marge de la colonne (!important) */
  const carte = [html, { tag: 'body', classes: ['rf-onglets'], attrs: {} }, { tag: 'main', id: 'content', classes: ['content', 'content-map'], attrs: {} },
    { tag: 'div', classes: ['filters', 'seg-on'], attrs: { class: 'filters seg-on', style: 'margin:0 0 10px' } }];
  const gc = gagne(carte, 390, 'margin-left', undefined);
  vrai('390 px · sous une carte, le segmenté garde la marge de la colonne (règle !important de .content-map, pas le 0 de la feuille)', !!gc && /\.content-map/.test(gc.sel) && /rf-marge/.test(gc.v), gc && [gc.sel, gc.v]);
}

console.log('\n══ test-1682 : ' + ok + ' ✓ ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
