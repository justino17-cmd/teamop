/* ══ test-1421 · BOÎTE MAIL : LE VOLET DE LECTURE NE SE FAIT PAS ÉCRASER PAR LES TROIS COLONNES ══
   Lot h03, bug appareils#1 (sonde « bug-boitemail-lecture.js », 2 essais identiques) : à 1024 px de large le volet de
   lecture mesurait 116 px (192 à 1100, 258 sur iPad paysage 1180, 512 à 1440) : le sujet passait sur huit lignes d'un
   mot, « Supprimer » était coupé, « À : clie… » aussi.

   Cause. `_mailDesktop()` choisissait les trois colonnes sur la largeur de la FENÊTRE (≥ 960), alors que le volet de
   lecture est ce qui reste après le menu latéral permanent (258 à 272 px), les marges de la page (2 × 24 ou 34 px),
   la colonne des dossiers (212) et la liste (`minmax(290px,390px)`, qui prend son maximum avant le volet) :
   à 1024, 1024 − 258 − 48 − 212 − 390 = 116. Et la grille ne cédait rien à la lecture.

   Ce banc GARDE LA RELATION, pas un chiffre : pour CHAQUE largeur de fenêtre de 960 à 1600 px, ou bien l'application
   empile (la mise en page éprouvée entre 781 et 959), ou bien le volet de lecture de la grille RÉELLE de views.boiteMail
   fait au moins 340 px. La grille est lue dans le code, `_mailDesktop` est EXÉCUTÉ, et la place du volet se calcule avec le
   chrome mesuré (sondes du lot : menu 258 px au bureau, 272 sur tablette — on prend le pire —, marges de page
   24 px jusqu'à 1180, 34 px au-dessus : `@media (min-width:781px) and (max-width:1180px)` / `(min-width:1181px)`).
   ⛔ Contrainte de COUPLAGE : `_mailDesktop()` (≥ N) et les requêtes CSS de la pile (`max-width:N-1`) et de l'action
   d'écrire (`min-width:N`) se répondent. Si N bouge, les trois bougent — ce banc lit le N de la constante et
   exige les deux autres. La preuve au navigateur : scratchpad/gestion/correctifs/h03/sonde-mail.js.            */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const MIN_LECTURE = 340;

console.log('\n── 1421 · 0. la population ──');
const ligneDesk = (/const _mailDesktop=[^\n]*/.exec(CODE) || [''])[0];
vrai('_mailDesktop est trouvée (une seule définition)', !!ligneDesk && CODE.split('const _mailDesktop=').length === 2, ligneDesk);
const i0 = CODE.indexOf('views.boiteMail=function(){'); const i1 = CODE.indexOf('function mailRow(', i0);
const VUE = i0 > 0 && i1 > i0 ? CODE.slice(i0, i1) : '';
vrai('views.boiteMail est trouvée', VUE.length > 3000, VUE.length);
const gm = /grid-template-columns:([^;'"]+);/.exec(VUE);
vrai('la grille des trois volets est lue dans le code de la vue', !!gm, gm && gm[1]);
const constLigne = (/const MAIL_TROIS_VOLETS=\d+;/.exec(CODE) || [''])[0];

/* _mailDesktop EXÉCUTÉE, à une largeur de fenêtre donnée */
function desktop(w) {
  const ctx = { window: { innerWidth: w } };
  vm.createContext(ctx);
  try { return !!vm.runInContext(constLigne + '\n' + ligneDesk + '\n_mailDesktop()', ctx); } catch (e) { return null; }
}
vrai('_mailDesktop s\'exécute', desktop(1440) !== null);

/* la place du volet de lecture : la grille réelle, le chrome mesuré */
function pistes(tpl) {
  const out = []; let cur = '', prof = 0;
  for (const c of tpl.trim()) { if (c === '(') prof++; if (c === ')') prof--; if (c === ' ' && !prof) { if (cur) out.push(cur); cur = ''; } else cur += c; }
  if (cur) out.push(cur); return out;
}
const nb = (s) => parseFloat(s);
function voletLecture(w) {
  const menu = 272, marge = w <= 1180 ? 24 : 34;
  const cadre = w - menu - 2 * marge;
  const p = pistes(gm ? gm[1] : '');
  if (p.length !== 3) return NaN;
  const col1 = /^[\d.]+px$/.test(p[0]) ? nb(p[0]) : NaN;
  let col2 = NaN; let m;
  if ((m = /^clamp\(([\d.]+)px,\s*([\d.]+)%,\s*([\d.]+)px\)$/.exec(p[1]))) col2 = Math.min(Math.max(+m[1], cadre * +m[2] / 100), +m[3]);
  else if ((m = /^minmax\(([\d.]+)px,\s*([\d.]+)px\)$/.exec(p[1]))) col2 = +m[2];   // mesuré : la liste prend son maximum avant le volet
  return cadre - col1 - col2;
}
vrai('le modèle redonne la mesure de la sonde AVANT correctif quand la grille est l\'ancienne (116 px à 1024 avec menu 258)',
  !/minmax\(290px,390px\)/.test(gm ? gm[1] : '') || Math.round(1024 - 258 - 48 - 212 - 390) === 116);

console.log('\n── 1421 · 1. à chaque largeur : ou bien on empile, ou bien le volet de lecture fait ≥ ' + MIN_LECTURE + ' px ──');
const trouves = []; const fautifs = [];
for (let w = 960; w <= 1600; w += 20) {
  const d = desktop(w);
  if (d) { const v = voletLecture(w); trouves.push(w); if (!(v >= MIN_LECTURE)) fautifs.push(w + ' px → volet ' + Math.round(v) + ' px'); }
}
vrai('des largeurs en trois volets sont jugées (population non vide)', trouves.length >= 10, trouves.length);
vrai('aucune largeur de 960 à 1600 px ne donne un volet de lecture sous ' + MIN_LECTURE + ' px', fautifs.length === 0, fautifs.slice(0, 4));
for (const w of [1024, 1100, 1180, 1280, 1440]) {
  const d = desktop(w), v = voletLecture(w);
  vrai(w + ' px : ' + (d ? 'trois volets, lecture ' + Math.round(v) + ' px' : 'pile (dossiers en pastilles, lecture en plein écran)'), d ? v >= MIN_LECTURE : true, { d, v });
}
vrai('un bureau large (1440 px) garde les trois volets', desktop(1440) === true);
vrai('un téléphone et une tablette portrait (781–959 px) restent en pile', [360, 390, 820, 959].every(w => desktop(w) === false));

console.log('\n── 1421 · 2. le COUPLAGE : le seuil de la constante, de la pile et de l\'action d\'écrire est le même nombre ──');
const N = +((/const MAIL_TROIS_VOLETS=(\d+);/.exec(CODE) || [])[1]);
vrai('le seuil est UNE constante nommée (MAIL_TROIS_VOLETS) lue par _mailDesktop', Number.isFinite(N) && /MAIL_TROIS_VOLETS/.test(ligneDesk), { N, ligneDesk });
const REG = C.regles(BRUT.match(/<style[^>]*>[\s\S]*?<\/style>/g).join('\n').replace(/<\/?style[^>]*>/g, ''));
const pile = REG.filter(r => /#mail-(app|mid|side)$/.test(r.sel) && r.media.some(m => /max-width/.test(m)));
const seuilsPile = [...new Set(pile.flatMap(r => r.media.map(m => +((/max-width:\s*(\d+)px/.exec(m) || [])[1]))))].filter(Boolean);
vrai('les règles de la PILE (cadre sans hauteur imposée, dossiers et liste sans habillage de volet) existent', pile.length >= 3, pile.length);
vrai('elles s\'arrêtent exactement au complément de _mailDesktop (max-width:' + (N - 1) + 'px)', seuilsPile.length === 1 && seuilsPile[0] === N - 1, { seuilsPile, attendu: N - 1 });
const actionEcrire = REG.filter(r => /\.ph-actions \.btn\[onclick="mailCompose\(\)"\]$/.test(r.sel) && r.decls.some(d => d.p === 'display' && d.v === 'none'));
vrai('la barre de titre ne cache « Écrire » (le volet le porte) qu\'à partir de min-width:' + N + 'px, là où le volet existe',
  actionEcrire.length >= 1 && actionEcrire.every(r => r.media.some(m => new RegExp('min-width:\\s*' + N + 'px').test(m))), actionEcrire.map(r => r.media));
vrai('aucune règle du courrier ne garde l\'ancien seuil 959/960', !REG.some(r => /#mail-(app|mid|side|pane)|mail-list|mailCompose/.test(r.sel) && r.media.some(m => /\b(959|960)px/.test(m))),
  REG.filter(r => /#mail-(app|mid|side|pane)|mail-list|mailCompose/.test(r.sel) && r.media.some(m => /\b(959|960)px/.test(m))).map(r => r.sel + ' @ ' + r.media));

console.log('\n── 1421 · 3. la ROTATION : l\'écouteur « resize » reconstruit la vue quand — et seulement quand — le mode franchit le seuil ──');
/* Relevé de la relecture : l'écouteur ajouté pour la rotation d'une tablette n'était gardé par aucun banc (retirer la
   ligne laissait 19 ✓ 0 ✗). On EXÉCUTE ici la vraie ligne du fichier dans un bac à sable : une fenêtre factice qui
   retient ses écouteurs, une vue `boiteMail` factice qui fait ce que fait la vraie en entrée (poser le mode rendu —
   vérifié dans le code de la vraie vue plus bas), et on joue des redimensionnements. */
const bloc = (/let _mailModeRendu=null;\s*try\{ window\.addEventListener\('resize'[^\n]*/.exec(CODE) || [''])[0];
vrai('la ligne de l\'écouteur « resize » est trouvée dans le code (pas dans un commentaire)', /addEventListener\('resize'/.test(bloc), bloc.slice(0, 80));
vrai('la vraie vue pose le mode rendu en entrée (`_mailModeRendu=D` juste après `const D=_mailDesktop()`)', /const D=_mailDesktop\(\);\s*_mailModeRendu=D;/.test(VUE));
function rotation() {
  const ecouteurs = []; let reconstruit = 0;
  const ctx = { window: { innerWidth: 1100, addEventListener: (t, f) => ecouteurs.push([t, f]) }, current: 'boiteMail', views: {} };
  ctx.views.boiteMail = () => { reconstruit++; vm.runInContext('_mailModeRendu=_mailDesktop()', ctx); };
  vm.createContext(ctx);
  try { vm.runInContext(constLigne + '\n' + ligneDesk + '\n' + bloc, ctx); } catch (e) { return null; }
  const redim = (w, vue) => { ctx.window.innerWidth = w; if (vue !== undefined) ctx.current = vue; ecouteurs.filter(e => e[0] === 'resize').forEach(e => e[1]()); return reconstruit; };
  return { ctx, ecouteurs, redim, nb: () => reconstruit, rendre: () => ctx.views.boiteMail() };
}
const R = rotation();
vrai('la ligne s\'exécute et pose UN écouteur « resize »', !!R && R.ecouteurs.filter(e => e[0] === 'resize').length === 1, R && R.ecouteurs.length);
if (R) {
  R.redim(1100); vrai('avant tout rendu de la vue (mode inconnu), un redimensionnement ne reconstruit rien', R.nb() === 0, R.nb());
  R.rendre(); const base = R.nb();
  R.redim(1000); R.redim(1150);
  vrai('1100 → 1000 → 1150 px (toujours en pile) : aucune reconstruction', R.nb() === base, R.nb() - base);
  R.redim(1300);
  vrai('1150 → 1300 px (la pile devient trois volets) : la vue est reconstruite UNE fois', R.nb() === base + 1, R.nb() - base);
  R.redim(1320); R.redim(1500);
  vrai('1300 → 1500 px (toujours trois volets) : pas de reconstruction de plus', R.nb() === base + 1, R.nb() - base);
  R.redim(820);
  vrai('1500 → 820 px (rotation inverse, retour à la pile) : reconstruite aussi', R.nb() === base + 2, R.nb() - base);
  R.redim(1400, 'dashboard');
  vrai('hors de la boîte mail (rubrique « dashboard »), franchir le seuil ne reconstruit pas la vue — elle écraserait l\'écran d\'une autre rubrique', R.nb() === base + 2, R.nb() - base);
}

console.log('\n── ' + 1421 + ' : ' + ok + ' ✓ ' + ko + ' ✗ ──');
process.exit(ko ? 1 : 0);
