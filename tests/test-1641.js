/* ══ test-1641 · CLIENTS AU TÉLÉPHONE : LES DEUX BARRES DE PUCES NE SE RECOUVRENT PLUS ══
   Lot k02, bug r5#2 (retest i03) : sur un iPhone (390) ou un Android (360), jour ou nuit, l'écran Clients pose deux
   segmentés à la suite — le type (Tous · Pros · Particuliers) et l'étiquette (Tous · VIP). Mesuré : première barre
   x=0–249, seconde x=217–348, soit 32 px de recouvrement ; « Tous » de la seconde recouvre la fin de « Particuliers », que
   le doigt ne peut plus toucher (elementFromPoint rend « Tous »). iPad et Mac : rien (marges à 0).

   Cause. Au téléphone, `html[data-refonte] .filters` pose `margin-left/right: calc(0px - var(--rf-marge))` (-16 px) pour
   une rangée qui défile bord à bord, avec son rembourrage de 16 px. Un segmenté (`.filters.seg-on`) a `padding:3px` : le
   rembourrage ne compense plus rien, la barre est décalée de 16 px à gauche, et la marge droite de l'une (-16) plus la gauche
   de l'autre (-16) les superposent. Les deux barres de views.clients ne posaient que `margin-bottom:10px`.

   Correctif borné : la classe `cli-barre` sur ces deux barres seulement, et une règle `.filters.seg-on.cli-barre{margin-left:0;
   margin-right:8px}` — QUE dans l'état segmenté (avec cinq puces ou plus, la barre redevient une rangée qui défile et garde son
   débordement bord à bord). Les autres segmentés (Tâches, Registre, Demandes, Historique, Bons) portaient le même
   décalage de 16 px (x=0) sans se recouvrir avec rien : ils sont corrigés par le lot c2-filtres-alignes (test-1682), qui a généralisé la règle.

   Ce banc REJOUE LA CASCADE (tests/outils-cascade-app.js, avec un `>` strict) pour la barre telle que views.clients l'écrit,
   et garde la RELATION : marges gauche et droite jamais négatives au téléphone, donc aucun recouvrement entre voisines.
   La preuve au navigateur : scratchpad/gestion/correctifs/k02/sonde-clients-large.js (320 à 1440 px, jour et nuit : 12
   mesures, 0 recouvrement, fin de « Particuliers » atteignable 12/12) et sonde-clients-bande.js (la contre-épreuve).    */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
/* ⛔ seuls les blocs qui COMMENCENT une ligne sont des commentaires (CLAUDE.md : un nettoyage naïf avale 107 Ko d'app.html) */
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
/* ⚠️ l'outil découpe les listes de sélecteurs sur CHAQUE virgule, y compris dans `[style*="repeat(3,1fr)"]` : il en sort des
   « sélecteurs » fantômes (`1fr)"]`) qu'il croit vrais pour tout élément. On écarte ce qui ne commence pas comme un sélecteur. */
const REGLES = C.regles(CSS).filter(r => /^[a-z.#\[*]/i.test(r.sel));
/* ⚠️ le second défaut de l'outil : il traite `A > B` comme `A B` (ex. `html[data-refonte] .content-map > .filters.seg-on`
   passerait pour vrai ici). On rend le `>` strict pour le dernier combinateur : le composé avant `>` doit viser le PARENT. */
function dernierEnfant(sel) {
  let prof = 0, k = -1;
  for (let i = 0; i < sel.length; i++) { const c = sel[i]; if (c === '(' || c === '[') prof++; else if (c === ')' || c === ']') prof--; else if (c === '>' && !prof) k = i; }
  return k;
}
function reglesPour(chaine) {
  return REGLES.filter(r => {
    const k = dernierEnfant(r.sel); if (k < 0) return true;
    const tete = r.sel.slice(0, k).trim(), queue = r.sel.slice(k + 1).trim();
    if (!tete || /\s/.test(queue.replace(/\([^)]*\)|\[[^\]]*\]/g, ''))) return true;   // queue complexe : on garde (l'outil peut crier à tort, jamais se taire)
    return C.selecteurVise(tete, chaine.slice(0, -1));
  });
}
const gagne = (chaine, w, prop, enL) => C.gagnant(reglesPour(chaine), chaine, w, prop, enL);

console.log('\n── 1641 · 0. la population ──');
vrai('des règles sont lues (la cascade rejouée n\'est pas sur du néant)', REGLES.length > 3000, REGLES.length);
const nF = REGLES.filter(r => /\.filters/.test(r.sel)).length;
vrai('des règles visent .filters', nF >= 20, nF);

/* le balisage, lu dans le CODE de la vue (pas dans un commentaire) */
const i0 = CODE.indexOf('views.clients=function()');
vrai('views.clients est trouvée', i0 > 0, i0);
const VUE = CODE.slice(i0, i0 + 20000);
const typeBar = /const typeBar=[^`]*`<div class="([^"]*)" style="([^"]*)"/.exec(VUE);
const tagBar = /const tagBar=[^`]*`<div class="([^"]*)" style="([^"]*)"/.exec(VUE);
vrai('la barre de type (Tous · Pros · Particuliers) est trouvée', !!typeBar);
vrai('la barre d\'étiquette est trouvée', !!tagBar);
vrai('les deux barres sont consécutives dans la vue : recherche+typeBar+tagBar', /recherche\+typeBar\+tagBar/.test(VUE));
for (const [nom, b] of [['type', typeBar], ['étiquette', tagBar]]) if (b) vrai('la barre ' + nom + ' porte la classe cli-barre', /\bcli-barre\b/.test(b[1]), b[1]);

const html = { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': 'mobile' }, classes: [] };
const base = [html, { tag: 'body', classes: ['rf-onglets'], attrs: {} }, { tag: 'main', id: 'content', classes: ['content'], attrs: {} }];
const barre = (b, extra) => ({ tag: 'div', classes: b[1].split(/\s+/).filter(Boolean).concat(extra || []), attrs: { class: b[1] } });
const enLigne = (style, prop) => { const m = new RegExp('(?:^|;)\\s*' + prop + ':\\s*([^;]+)').exec(style || ''); return m ? m[1].trim() : undefined; };
const marge = (b, w, cote, extra) => {
  const ch = base.concat(barre(b, extra));
  const g = gagne(ch, w, 'margin-' + cote, enLigne(b[2], 'margin-' + cote));
  return { g, px: g ? C.px(g.v, { vars: { '--rf-marge': 16 }, hauteur: 900 }) : 0 };   // aucune règle : marge initiale, 0
};

const LARGEURS = [320, 360, 390, 430, 820, 1440];
console.log('\n── 1641 · 1. en segmenté (2 à 4 puces), les marges ne sont jamais négatives : pas de recouvrement entre voisines ──');
for (const [nom, b] of [['type', typeBar], ['étiquette', tagBar]]) {
  if (!b) continue;
  for (const w of LARGEURS) {
    const gl = marge(b, w, 'left', ['seg-on']), dr = marge(b, w, 'right', ['seg-on']);
    vrai(w + ' px · barre ' + nom + ' : la marge gauche gagnante se calcule', Number.isFinite(gl.px), gl.g && gl.g.v);
    vrai(w + ' px · barre ' + nom + ' : marge gauche ≥ 0 (' + gl.px + ' px, ' + (gl.g && gl.g.sel) + ')', gl.px >= 0, gl.g && gl.g.v);
    vrai(w + ' px · barre ' + nom + ' : marge droite ≥ 0 (' + dr.px + ' px, ' + (dr.g && dr.g.sel) + ')', dr.px >= 0, dr.g && dr.g.v);
  }
}
if (typeBar && tagBar) for (const w of LARGEURS) {
  const m1 = marge(typeBar, w, 'right', ['seg-on']).px, m2 = marge(tagBar, w, 'left', ['seg-on']).px;
  vrai(w + ' px : marge droite de la 1re + marge gauche de la 2de ≥ 0 (' + m1 + ' + ' + m2 + ') — l\'écart, qui valait -32 au téléphone', m1 + m2 >= 0, [m1, m2]);
}

console.log('\n── 1641 · 2. contre-épreuve : sans segmenté, la barre reste une rangée qui défile bord à bord ──');
for (const [nom, b] of [['type', typeBar], ['étiquette', tagBar]]) {
  if (!b) continue;
  for (const w of [320, 390, 430]) {
    const gl = marge(b, w, 'left', []), dr = marge(b, w, 'right', []);
    vrai(w + ' px · barre ' + nom + ' (≥ 5 puces, pas de seg-on) : marges -16 px (le débordement bord à bord est gardé)', gl.px === -16 && dr.px === -16, [gl.px, dr.px]);
  }
}
console.log('\n── 1641 · 3. un AUTRE segmenté (sans cli-barre) : posé sur la marge de la colonne depuis le lot c2-filtres-alignes ──');
/* c2-filtres-alignes (test-1682) : cette contre-épreuve gardait « la règle n'est pas devenue générale » (un segmenté sans cli-barre
   gardait les -16 px de la feuille, donc x=0 : Tâches, Registre, Demandes, Historique, Bons). C'était l'ANCIEN comportement fautif
   de ces cinq écrans — la règle est devenue générale EXPRÈS (`.filters.seg-on{margin-left:0;margin-right:0}`). On garde l'autre
   moitié : sans cli-barre, le segmenté n'a PAS les 8 px de marge droite des barres de Clients. */
{
  const autre = { tag: 'div', classes: ['filters', 'seg-on'], attrs: { class: 'filters seg-on', style: 'margin-bottom:10px' } };
  for (const w of [360, 390]) {
    const gl = gagne(base.concat(autre), w, 'margin-left', undefined), dr = gagne(base.concat(autre), w, 'margin-right', undefined);
    vrai(w + ' px : un segmenté sans cli-barre a ses marges à 0 (' + (gl && gl.v) + ' / ' + (dr && dr.v) + ') — plus de décalage de 16 px', !!gl && gl.v === '0' && !!dr && dr.v === '0', [gl && gl.v, dr && dr.v]);
  }
}

console.log('\n══ test-1641 : ' + ok + ' ✓ ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
