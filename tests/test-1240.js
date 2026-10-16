/* ══ LES TABLEAUX DE LISTE (Devis, Contrats…) NE SONT PLUS COUPÉS — g03, ventes#0 et ventes#1 ══════════
   Mesuré au navigateur sur la bêta (scratchpad/gestion/correctifs/g03/sonde-tableaux.js) :
   · téléphone (360 / 390 px) : le dernier <td> d'un devis porte `white-space:nowrap` EN LIGNE, huit boutons côte
     à côte ; la ligne est une carte de 280 à 308 px et `.tbl{overflow:hidden}` la coupe — ✎ Modifier, → facture et
     🗑 Supprimer à x = 441 à 499 sur un écran de 390, inatteignables même au doigt ;
   · iPad (820 px) : le menu latéral reste posé, la carte du tableau fait 450 px et le tableau 893 à 1 036 px — les
     boutons à x = 1 286 dans une carte qui s'arrête à 796.
   Ce que le banc garde : ce que la FEUILLE gagne, pas une phrase. Le balisage est relu dans le texte de `docListView` et de
   `views.contrats` : leur dernière cellule porte bien le `nowrap` en ligne — donc
   la règle qui le défait doit porter `!important` (un style en ligne bat la feuille) —, et la feuille doit
   (1) faire passer cette cellule à la ligne, (2) la ranger en rangées sous 781 px, (3) mettre le tableau en
   cartes quand SA carte est étroite (requête de CONTENEUR sur `.tbl-wrap`, jamais sur `#content`).
   La preuve au pixel : sonde-tableaux.js (8/8 boutons atteignables à 360, 390 et 820 px). */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
/* seuls les blocs qui COMMENCENT une ligne sont retirés (CLAUDE.md : le motif naïf avale 107 000 caractères) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* le bloc @media / @container qui CONTIENT la position i ('' au premier niveau) */
function enveloppes(i) {
  const out = []; let prof = 0;
  for (let j = i; j > 0; j--) {
    const c = SRC[j];
    if (c === '}') prof++;
    else if (c === '{') {
      if (prof === 0) { const d = SRC.lastIndexOf('\n', j); const tete = SRC.slice(d + 1, j).trim(); if (/^@(media|container)/.test(tete)) out.push(tete); }
      else prof--;
    }
  }
  return out;
}
/* toutes les règles dont le sélecteur EST exactement `sel` (début de ligne), avec leur corps et leurs enveloppes */
function regles(sel) {
  const res = []; let i = -1;
  while ((i = SRC.indexOf(sel + '{', i + 1)) >= 0) {
    const av = SRC[i - 1]; if (av && !/[\s}]/.test(av)) continue;   // pas la fin d'un sélecteur plus long
    const ligneDebut = SRC.lastIndexOf('\n', i) + 1;
    if (SRC.slice(ligneDebut, i).trim() !== '') continue;           // le sélecteur COMMENCE sa ligne : c'est du code, pas une phrase
    res.push({ corps: SRC.slice(i + sel.length + 1, SRC.indexOf('}', i)), env: enveloppes(i) });
  }
  return res;
}

console.log('── 1240 · 1. le balisage réel : la dernière cellule garde son nowrap EN LIGNE ──');
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(SRC); if (!m) return '';
  let k = SRC.indexOf('{', m.index), prof = 0, q = null;
  for (; k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return SRC.slice(m.index + 1, k + 1);
}
const corpsDoc = fonction('docListView');
vrai('docListView est trouvée', corpsDoc.length > 500, corpsDoc.length);
const ctr = (() => { const i = SRC.indexOf('views.contrats=function(){'); return i < 0 ? '' : SRC.slice(i, i + 6000); })();
vrai('views.contrats est trouvée', ctr.length > 500);
const nowrapDoc = /<td style="text-align:right;white-space:nowrap">/.test(corpsDoc);
const nowrapCtr = /<td style="text-align:right;white-space:nowrap">/.test(ctr);
vrai('la cellule de gestes des devis porte `white-space:nowrap` en ligne', nowrapDoc);
vrai('la cellule de gestes des contrats porte `white-space:nowrap` en ligne', nowrapCtr);
/* ce balisage-là ne change pas (lot Documents/Factures) : c'est donc la feuille qui doit le défaire */

console.log('── 1240 · 2. la feuille défait le nowrap (avec !important) ──');
const rN = regles('html[data-refonte] .list-tbl td:last-child').filter(r => /white-space:\s*normal\s*!important/.test(r.corps) && r.env.length === 0);
vrai('`.list-tbl td:last-child{white-space:normal!important}` existe au premier niveau', rN.length === 1, rN.length);

console.log('── 1240 · 3. sous 781 px : la cellule se range en rangées ──');
const rT = regles('html[data-refonte] .list-tbl td:last-child:not(:empty)').filter(r => r.env.some(e => /^@media\s*\(max-width:\s*780px\)/.test(e)));
vrai('sous 780 px, la dernière cellule passe en rangées (flex + wrap)', rT.length === 1 && /display:\s*flex/.test(rT[0].corps) && /flex-wrap:\s*wrap/.test(rT[0].corps), rT.map(r => r.corps));

console.log('── 1240 · 4. tablette : le tableau passe en cartes quand SA carte est étroite ──');
const cont = regles('html[data-refonte] .tbl-wrap:has(>.list-tbl)');
vrai('`.tbl-wrap` qui porte un tableau de liste est un conteneur nommé (inline-size)', cont.length === 1 && /container:\s*tbl-liste\s*\/\s*inline-size/.test(cont[0].corps), cont.map(r => r.corps));
vrai('jamais de container-type sur #content', !/#content\s*\{[^}]*container(-type)?\s*:/.test(SRC));
const dansConteneur = sel => regles(sel).filter(r => r.env.some(e => /^@container\s+tbl-liste\s*\(max-width:\s*\d+px\)/.test(e)));
const bloc = dansConteneur('html[data-refonte] .list-tbl,html[data-refonte] .list-tbl tbody,html[data-refonte] .list-tbl tr,html[data-refonte] .list-tbl td');
vrai('dans le conteneur étroit, table, lignes et cellules passent en blocs', bloc.length === 1 && /display:\s*block/.test(bloc[0].corps), bloc.length);
vrai('… la requête vise l\'écran large (781 px et plus) : le téléphone a déjà ses cartes', bloc.length === 1 && bloc[0].env.some(e => /^@media\s*\(min-width:\s*781px\)/.test(e)));
vrai('dans le conteneur étroit, l\'en-tête du tableau disparaît', dansConteneur('html[data-refonte] .list-tbl thead').length === 1);
const tr = dansConteneur('html[data-refonte] .list-tbl tr');
vrai('dans le conteneur étroit, chaque ligne est une carte', tr.length === 1 && /border-radius:\s*12px/.test(tr[0].corps));
const dernier = dansConteneur('html[data-refonte] .list-tbl td:last-child:not(:empty)');
vrai('dans le conteneur étroit, la rangée de gestes passe à la ligne', dernier.length === 1 && /flex-wrap:\s*wrap/.test(dernier[0].corps));
const seuil = (/@container\s+tbl-liste\s*\(max-width:\s*(\d+)px\)/.exec(SRC) || [])[1];
vrai('le seuil est au-dessus de la carte d\'un iPad (450 à 850 px) et sous celle d\'un ordinateur (990 px et plus)', +seuil >= 850 && +seuil < 990, seuil);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
