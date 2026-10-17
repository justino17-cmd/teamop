/* ══ test-1422 · BOÎTE MAIL : LE PIED DE COLONNE (« Gérer mes boîtes » / « Connecter une boîte ») EST SYMÉTRIQUE ══
   Lot h03, bug appareils#11 (cosmétique, sonde « bugs-cosmetiques.js », 2 essais) : au bureau, les deux boutons du pied
   de la colonne des dossiers étaient à 14 px du bord gauche et 2 px du droit (−10 sur iPad paysage) — collés au
   séparateur.

   Cause (relevée au navigateur, pas devinée). Deux défauts qui s'ajoutaient :
     1. le pied portait `margin:10px -10px 0;padding:10px 12px 2px` EN LIGNE — écrit pour un cadre à 10 px de
        rembourrage, alors que la feuille impose `padding:14px 12px!important` à la colonne : la marge négative comptait
        sur un chiffre qui n'est plus celui de la feuille ;
     2. surtout, le pied est une grille à UNE piste `auto` : la piste prend la largeur du texte le plus long
        (« ＋ Connecter une boîte », en une ligne) quand elle est plus large que la colonne, et les boutons
        (`width:100%` de la piste) débordent à droite. `minmax(0,1fr)` fait de la piste la largeur de la colonne.
   Le correctif cesse de compter sur le rembourrage de la colonne : marges et rembourrage horizontaux du pied à zéro
   (c'est la colonne qui pose les 12 px, comme pour « Nouveau message »), et une piste qui ne déborde pas.

   Ce banc lit le style du pied dans le CODE de views.boiteMail (`APP_FICHIER` : une copie, pour éprouver le banc sans
   toucher au dépôt) et la cascade (tests/outils-cascade-app.js) pour le rembourrage de `#mail-side`.
   La preuve au pixel (margeG = margeD sur quatre appareils) : scratchpad/gestion/correctifs/h03/sonde-pied.js. */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

console.log('\n── 1422 · 0. la population ──');
const i0 = CODE.indexOf('views.boiteMail=function(){'); const i1 = CODE.indexOf('function mailRow(', i0);
const VUE = i0 > 0 && i1 > i0 ? CODE.slice(i0, i1) : '';
vrai('views.boiteMail est trouvée', VUE.length > 3000, VUE.length);
const pied = /<div ([^>]*)>\s*<button class="btn ghost sm"[^>]*onclick="mailBoxesManage\(\)">Gérer mes boîtes<\/button>\s*<button class="btn ghost sm"[^>]*onclick="mailConnect\(\)">＋ Connecter une boîte<\/button>/.exec(VUE);
vrai('le pied de colonne (les deux boutons) est trouvé', !!pied);
const st = pied ? (/style="([^"]*)"/.exec(pied[1]) || [])[1] || '' : '';
const prop = (n) => { const m = new RegExp('(?:^|;)\\s*' + n + ':([^;]+)').exec(st); return m ? m[1].trim() : undefined; };

/* « a b c d » → [gauche, droite] en px, selon la syntaxe CSS des raccourcis */
function gd(v) {
  if (v === undefined) return [0, 0];
  const t = v.split(/\s+/).map(x => parseFloat(x) || 0);
  if (t.length === 1) return [t[0], t[0]]; if (t.length === 2) return [t[1], t[1]]; if (t.length === 3) return [t[1], t[1]]; return [t[3], t[1]];
}
const [mg, md] = gd(prop('margin')), [pg, pd] = gd(prop('padding'));

console.log('\n── 1422 · 1. le pied ne compte pas sur le rembourrage de la colonne ──');
vrai('aucune marge horizontale négative (elle supposait un cadre à 10 px)', mg >= 0 && md >= 0, { mg, md });
vrai('marges gauche et droite égales', mg === md, { mg, md });
vrai('rembourrage horizontal du pied à zéro : c\'est la colonne qui pose les 12 px, comme pour « Nouveau message »', pg === 0 && pd === 0, { pg, pd });

console.log('\n── 1422 · 2. la piste de la grille ne déborde pas de la colonne ──');
const cols = prop('grid-template-columns');
vrai('le pied est une grille', /(^|;)\s*display:grid/.test(st));
vrai('⛔ sa piste est `minmax(0,1fr)` : une piste `auto` prend la largeur du texte le plus long et fait déborder les boutons à droite', cols === 'minmax(0,1fr)', cols);

console.log('\n── 1422 · 3. la colonne pose le même rembourrage des deux côtés (la symétrie vient d\'elle) ──');
const REG = C.regles(BRUT.match(/<style[^>]*>[\s\S]*?<\/style>/g).join('\n').replace(/<\/?style[^>]*>/g, ''));
const chaine = [{ tag: 'html', attrs: { 'data-refonte': '1' } }, { tag: 'body', classes: ['rf-onglets'] }, { tag: 'main', id: 'content', classes: ['content'] },
  { tag: 'div', id: 'mail-app' }, { tag: 'div', id: 'mail-side' }];
const gp = C.gagnant(REG, chaine, 1440, 'padding');
const pl = gp ? gd(gp.v.split(/\s+/).length === 2 ? gp.v : gp.v) : null;
vrai('la feuille impose un rembourrage à #mail-side', !!gp, gp);
vrai('et il est symétrique à gauche et à droite', !!pl && pl[0] === pl[1] && pl[0] > 0, pl);

console.log('\n── ' + 1422 + ' : ' + ok + ' ✓ ' + ko + ' ✗ ──');
process.exit(ko ? 1 : 0);
