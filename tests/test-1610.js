/* ══ test-1610 · L'INDICE D'UN CHAMP (::placeholder) A SON PROPRE JETON, RÉGLÉ POUR LA SURFACE DU CHAMP ══════════
   Lot j02, bugs r4#8 à r4#11 (retest de h05 / appareils#9) : l'indice des champs prenait `--t3`, le jeton du texte
   discret posé sur la PAGE. Mesuré au pixel au Mac, par le vrai flou (SwiftShader), sous 4,5:1 :
     · Mac NUIT : recherche du Planning 4,01, du Planning général 3,87, fenêtre « Rechercher partout » 4,05 — l'indice
       est posé sur une pilule translucide teintée, elle-même sous une vitre qui sature le décor (fond ≈ rgb(55,76,123)) ;
     · la LOUPE du menu latéral : 3,20 la nuit, 3,64 le jour, partout — dans `.sidebar`, `--t3` vaut `--side-mut`, donc
       52 % d'encre : un texte « discret » sur du verre, pas un indice de champ.
   Une seule famille : un jeton réglé pour une autre surface. On ne touche NI `--t3` NI `--side-mut` (tout le texte
   secondaire de l'application bougerait ; design/THEME-REFERENCE.md, test-759) : l'indice a SON jeton, `--ph`, déclaré
   sur le champ lui-même (là, `--t1` est celui de la surface où il est posé : la page, une fenêtre, ou le menu latéral).

   Ce banc ne garde pas un texte, il garde ce que la règle GAGNE : la cascade de la page est rejouée
   (tests/outils-cascade-app.js — média, spécificité, !important, ordre) pour un champ de chaque surface, puis la
   couleur de l'indice est CALCULÉE (jeton × encre du thème × surface relevée au pixel) et comparée à 4,5:1.
   Les surfaces sont des MESURES (scratchpad/gestion/correctifs/j02/sonde-ph.js), pas des valeurs recopiées du CSS.
   La preuve au navigateur : cette sonde, avant/après, Mac et iPhone, jour et nuit, trois teintes.
   ⛔ RELECTURE DU LOT (r4#8) : l'encre `--t1` dépend aussi de la MARQUE, pas seulement du thème jour/nuit. Réglés pour TEAM OP
   (80 % / 68 %), les pourcentages laissaient l'indice d'OP GESTION (le second thème offert au choix, #E4EFEA / #0B3B2E) à
   3,66-3,85 la nuit et 4,19-4,49 le jour au pixel. Le banc rejoue donc la cascade, l'encre et les surfaces relevées pour LES
   DEUX marques ; sans cela, il ne gardait qu'un des deux thèmes que Justin a fixés.
   APP_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt.                          */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

/* toutes les feuilles de la page, dans l'ordre */
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS);
console.log('\n── 1610 · 0. la population ──');
vrai('des règles sont lues (la cascade rejouée n\'est pas sur du néant)', REGLES.length > 3000, REGLES.length);
/* les règles ::placeholder, rangées sans leur pseudo-élément (le moteur de cascade ne sait pas viser un pseudo-élément) */
const PH = REGLES.filter(r => /::placeholder\s*$/.test(r.sel)).map(r => Object.assign({}, r, { sel: r.sel.replace(/::placeholder\s*$/, '') }));
vrai('des règles ::placeholder existent', PH.length >= 1, PH.length);
/* les déclarations de --ph, partout où la feuille en pose une */
const JETON = REGLES.filter(r => r.decls.some(d => d.p === '--ph'));
vrai('le jeton --ph est déclaré par au moins une règle', JETON.length >= 1, JETON.length);

/* ── les surfaces : un champ = sa balise, ses classes, ses ancêtres ── */
const MARQUES = ['teamop', 'opgestion'];
const html = (theme, mq) => ({ tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-verre': '1', 'data-marque': mq, 'data-theme': theme, 'data-kind': 'desktop' } });
const chaine = (theme, mq, milieu, classesInput) => [html(theme, mq), { tag: 'body', classes: ['rf-onglets'], attrs: {} }, ...milieu, { tag: 'input', classes: classesInput || [], attrs: { placeholder: 'Rechercher' } }];
const SURFACES = {
  'contenu (recherche d\'une liste)': (t, mq) => chaine(t, mq, [{ tag: 'main', id: 'content', classes: ['content'], attrs: {} }, { tag: 'div', classes: ['card'], attrs: {} }], ['search-inp']),
  'pilule du Planning': (t, mq) => chaine(t, mq, [{ tag: 'main', id: 'content', classes: ['content'], attrs: {} }, { tag: 'div', classes: ['card', 'pf-bar'], attrs: {} }, { tag: 'span', classes: ['pf-inw'], attrs: {} }]),
  'loupe du menu latéral': (t, mq) => chaine(t, mq, [{ tag: 'aside', id: 'sidebar', classes: ['sidebar'], attrs: {} }, { tag: 'div', classes: ['nav-loupe'], attrs: {} }]),
  'fenêtre « Rechercher partout »': (t, mq) => chaine(t, mq, [{ tag: 'div', id: 'overlay', classes: ['overlay', 'open'], attrs: {} }, { tag: 'div', classes: ['modal'], attrs: {} }]),
};
const VUE = 1440;

console.log('\n── 1610 · 1. ce que la cascade donne à l\'indice de chaque champ ──');
const pxCoul = {};
for (const mq of MARQUES) for (const [nom0, f] of Object.entries(SURFACES)) {
  const nom = nom0 + ' [' + mq + ']';
  for (const th of ['dark', 'light']) {
    const ch = f(th, mq);
    const g = C.gagnant(PH, ch, VUE, 'color'), o = C.gagnant(PH, ch, VUE, 'opacity');
    vrai(nom + ' (' + th + ') : l\'indice prend `var(--ph)`, pas `--t3`', !!g && g.v === 'var(--ph)', g && g.v + '  ← ' + g.sel);
    vrai(nom + ' (' + th + ') : `opacity:1` (Firefox n\'estompe pas l\'indice une seconde fois)', !!o && o.v === '1', o && o.v);
    const j = C.gagnant(JETON, ch, VUE, '--ph');
    vrai(nom + ' (' + th + ') : `--ph` est déclaré sur le champ lui-même (ce n\'est pas un héritage de la page)', !!j && /^color-mix\(\s*in srgb\s*,\s*var\(--t1\)\s+\d+(\.\d+)?%\s*,\s*transparent\s*\)$/.test(j.v), j && j.v);
    if (j) { const m = /var\(--t1\)\s+(\d+(?:\.\d+)?)%/.exec(j.v); if (m) pxCoul[mq + '|' + nom + th] = +m[1] / 100; }
  }
}
/* un pourcentage par MARQUE et par THÈME (la nuit a ses surfaces de champ vives, le jour des surfaces claires, et l'encre
   d'OP GESTION est plus verte que celle de TEAM OP) — jamais un par écran */
const ALPHA = {};
for (const mq of MARQUES) {
  ALPHA[mq] = {};
  for (const th of ['dark', 'light']) {
    const parts = [...new Set(Object.entries(pxCoul).filter(([k]) => k.startsWith(mq + '|') && k.endsWith(th)).map(([, v]) => v))];
    vrai('[' + mq + '] un seul pourcentage d\'encre pour toutes les surfaces du thème ' + th + ' (un jeton, pas une rustine par écran)', parts.length === 1, parts);
    ALPHA[mq][th] = parts[0] || 0;
  }
  vrai('[' + mq + '] l\'indice de nuit est plus encré que celui de jour (les surfaces de nuit sont à mi-luminance)', ALPHA[mq].dark > ALPHA[mq].light, ALPHA[mq]);
}

console.log('\n── 1610 · 2. la couleur de l\'indice, CALCULÉE sur les surfaces relevées au pixel, tient 4,5:1 ──');
const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/* l'encre `--t1` de chaque thème, lue dans la feuille (teamop, verre) — pas recopiée */
function encre(mq, theme) {
  const m = new RegExp('html\\[data-marque="' + mq + '"\\]\\[data-verre\\]\\[data-theme="' + theme + '"\\]\\{[^}]*?--t1:(#[0-9A-Fa-f]{6})').exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ' '));
  return m ? hex(m[1]) : null;
}
const T1 = {};
for (const mq of MARQUES) {
  T1[mq] = { dark: encre(mq, 'dark'), light: encre(mq, 'light') };
  vrai('[' + mq + '] l\'encre du texte de nuit est lue dans la feuille', !!T1[mq].dark, T1[mq].dark);
  vrai('[' + mq + '] l\'encre du texte de jour est lue dans la feuille', !!T1[mq].light, T1[mq].light);
}
vrai('les deux marques n\'ont pas la même encre de jour (sinon le banc ne distinguerait rien)', String(T1.teamop.light) !== String(T1.opgestion.light), [T1.teamop.light, T1.opgestion.light]);
/* Surfaces RELEVÉES (sonde-ph.js, Mac 1440×900, SwiftShader, teinte verte) : le pixel de fond sous le meilleur trait de l'indice.
   Ce sont les PIRES surfaces trouvées (le contraste mesuré le plus bas du recensement), pas des moyennes. */
const RELEVES = [
  ['teamop', 'nuit', 'dark', 'pilule du Planning', [55, 76, 123]],
  ['teamop', 'nuit', 'dark', 'pilule du Planning général', [57, 79, 122]],
  ['teamop', 'nuit', 'dark', 'fenêtre « Rechercher partout »', [57, 76, 116]],
  ['teamop', 'nuit', 'dark', 'loupe du menu latéral', [53, 79, 132]],
  ['teamop', 'jour', 'light', 'loupe du menu latéral', [235, 241, 244]],
  ['teamop', 'jour', 'light', 'liste la plus grise (Mouvements)', [224, 227, 233]],
  /* OP GESTION (sonde-ph.js avec MARQUE=opgestion, Mac 1440×900, SwiftShader) : les pires fonds du recensement */
  ['opgestion', 'nuit', 'dark', 'pilule du Planning', [59, 111, 98]],
  ['opgestion', 'nuit', 'dark', 'pilule du Planning général', [60, 114, 99]],
  ['opgestion', 'nuit', 'dark', 'loupe du menu latéral', [54, 110, 96]],
  ['opgestion', 'nuit', 'dark', 'fenêtre « Rechercher partout »', [28, 92, 74]],
  ['opgestion', 'jour', 'light', 'liste la plus grise (Mouvements)', [221, 228, 227]],
  ['opgestion', 'jour', 'light', 'pilule du Planning', [228, 236, 235]],
  ['opgestion', 'jour', 'light', 'pilule du Planning général', [231, 236, 236]],
  ['opgestion', 'jour', 'light', 'loupe du menu latéral', [231, 242, 240]],
];
const compose = (encreRGB, a, fond) => encreRGB.map((v, i) => Math.round(v * a + fond[i] * (1 - a)));
for (const [mq, nom, th, ou, fond] of RELEVES) {
  const e = T1[mq][th], al = ALPHA[mq][th]; if (!e || !al) { vrai('[' + mq + '] ' + nom + ' · ' + ou + ' : calculable', false); continue; }
  const ph = compose(e, al, fond), r = ratio(ph, fond), saisi = ratio(e, fond);
  vrai('[' + mq + '] ' + nom + ' · ' + ou + ' : l\'indice ' + ph.join(',') + ' sur ' + fond.join(',') + ' = ' + r.toFixed(2) + ':1 (≥ 4,5)', r >= 4.5, r);
  /* l'encre PLEINE d'OP GESTION de nuit ne passe qu'à 4,72 au pire : l'indice y vaut le texte, il n'a pas de marge à perdre */
  vrai('[' + mq + '] ' + nom + ' · ' + ou + ' : et n\'est pas plus contrasté que le texte saisi (' + r.toFixed(2) + ' ≤ ' + saisi.toFixed(2) + ')', r <= saisi + 1e-9, [r, saisi]);
}
/* la contre-épreuve : l'ANCIEN réglage (--t3 de nuit #ABB3C2, 52 % d'encre pour la loupe) tombait bel et bien sous 4,5 sur ces mêmes surfaces — le banc n'est pas indulgent */
vrai('contre-épreuve : l\'ancien indice de nuit (#ABB3C2) sur la pilule du Planning était sous 4,5', ratio(hex('#ABB3C2'), [55, 76, 123]) < 4.5, ratio(hex('#ABB3C2'), [55, 76, 123]));
vrai('contre-épreuve : l\'ancienne loupe de jour (52 % d\'encre) était sous 4,5', ratio(compose(T1.teamop.light || [0, 0, 0], .52, [235, 241, 244]), [235, 241, 244]) < 4.5);
vrai('contre-épreuve : l\'ancienne loupe de nuit (52 % d\'encre) était sous 4,5', ratio(compose(T1.teamop.dark || [255, 255, 255], .52, [53, 79, 132]), [53, 79, 132]) < 4.5);
/* la contre-épreuve de la relecture : les pourcentages de TEAM OP (80 % la nuit, 68 % le jour) appliqués à l'encre d'OP GESTION tombent sous 4,5 */
vrai('contre-épreuve : 80 % de l\'encre d\'OP GESTION de nuit sur la pilule du Planning général est sous 4,5 (3,66 mesuré)', ratio(compose(T1.opgestion.dark || [255, 255, 255], .8, [60, 114, 99]), [60, 114, 99]) < 4.5);
vrai('contre-épreuve : 68 % de l\'encre d\'OP GESTION de jour sur Mouvements est sous 4,5 (4,19 mesuré)', ratio(compose(T1.opgestion.light || [0, 0, 0], .68, [221, 228, 227]), [221, 228, 227]) < 4.5);

console.log('\n── 1610 · 3. on n\'a PAS retouché le texte secondaire de l\'application ──');
/* --t3 et --side-mut gardent leur valeur : test-759 les compare au document ; ici on garde l'intention du correctif */
const SANS = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('--t3 de nuit du thème TEAM OP reste #ABB3C2', /data-theme="dark"\]\{[^}]*--t3:#ABB3C2/.test(SANS));
vrai('--side-mut sous le verre reste un mélange à 52 % de l\'encre', /--side-mut:color-mix\(in srgb,var\(--vr-encre\) 52%,transparent\)/.test(SANS));
const fautives = REGLES.filter(r => /::placeholder\s*$/.test(r.sel) && r.decls.some(d => d.p === 'color' && !/^var\(--ph\)$/.test(d.v)));
vrai('aucune règle ::placeholder ne pose une autre couleur que `var(--ph)`', fautives.length === 0, fautives.map(r => r.sel + ' → ' + r.decls.map(d => d.p + ':' + d.v).join(';')));

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
