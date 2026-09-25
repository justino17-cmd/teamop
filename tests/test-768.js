/* ══════════════════════════════════════════════════════════════════════════════════════
   test-768 — LA BARRE DU HAUT DU TÉLÉPHONE : LE NOM NE SE COUPE PLUS

   Trouvé le 22 septembre 2026 en auditant les écrans profonds, sur une capture : « OP GEST… »
   en haut de TOUTES les rubriques, sur les quatre profils téléphone. Mesuré au navigateur :

   | où | marque avant | après |
   |---|---|---|
   | rubriques (`body.ctx`), 390 px | 56 à 72 px pour 82 — coupée | 183/183 |
   | hors rubrique, 375 px | 70/82 — coupée | retirée (règle existante étendue) |
   | hors rubrique, 360 px | 55/82 — coupée | retirée |

   ⛔⛔ DEUX CAUSES, ET LA PREMIÈRE ÉTAIT DÉCRITE COMME CORRIGÉE DANS LE CODE LUI-MÊME.
   1. La marque et le titre réduit se RELAIENT au même endroit (« les deux ne sont jamais
      montrés en même temps »). Mais le titre, à opacité 0, gardait `flex:1 1 auto` : il
      occupait 108 à 123 px INVISIBLES. Le palier tablette avait corrigé exactement ce
      défaut — pour la tablette. Une moitié de règle, encore.
   2. Hors rubrique, la synchro, l'avatar et la recherche restent dans la barre : le seuil
      « le nom s'efface plutôt que se couper », posé à 340 px, ne suffisait pas là.
   ⚠️ Et le commentaire du code disait « il tient à 390 » — mesuré quand la barre portait
   moins de choses. Une mesure écrite vieillit comme un chiffre de ce fichier.

   ⛔⛔ ET LE MÊME JOUR, LE CORRECTIF A FAIT NAÎTRE TROIS DÉFAUTS — mesurés au navigateur
   (scratchpad/sonde-barre.js : 3 largeurs × 3 rubriques × les deux états de défilement) :
   · hors rubrique (tableau de bord), le titre réduit reste `display:none` même défilé : la
     marque tombait à 0 px et RIEN ne prenait sa place — synchro, cloche et recherche
     sautaient à gauche au premier défilement. La marque ne cède donc sa place qu'en `.ctx` ;
   · `display:none` sur la marque retirait aussi sa PLACE : à 360 px les ronds se tassaient
     à gauche derrière « Créer », un quart de barre vide. `visibility:hidden` garde la place ;
   · `.topbar{gap:8px}` du palier téléphone n'avait JAMAIS pris (`gap:10px!important` plus
     loin, même spécificité) : 81 px de marque pour 85 à 390 px — « OP GESTIO… » sur l'écran
     d'accueil. Et « Créer » faisait 46 px ici, 38 ailleurs, entre des ronds de 44.
   ⛔ Ce banc lit le CODE (commentaires retirés) des deux fichiers servis. La preuve de
   comportement vit dans les sondes du scratchpad (sonde-barre.js).
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* découpe d'un bloc @media par compteur d'accolades — une tranche vide passe au vert sur tout */
function blocMedia(src, entete) {
  const blocs = []; let i = 0;
  while ((i = src.indexOf(entete, i)) >= 0) {
    const o = src.indexOf('{', i); let p = 1, j = o + 1;
    while (j < src.length && p > 0) { if (src[j] === '{') p++; else if (src[j] === '}') p--; j++; }
    blocs.push(src.slice(o + 1, j - 1)); i = j;
  }
  return blocs;
}

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  const tel = blocMedia(SRC, '@media(max-width:560px)').find(b => /\.topbar \.topbar-brand\{/.test(b)) || '';
  vrai('population : le bloc téléphone de la barre est trouvé', tel.length > 200, tel.length + ' caractères');

  vrai('⛔ tant qu’on ne défile pas, le titre invisible ne prend AUCUNE largeur',
    /body:not\(\.rf-haut\) \.topbar \.topbar-title\{flex:0 0 0!important;width:0;overflow:hidden\}/.test(tel));
  vrai('⛔ dès qu’on défile, c’est la marque qui cède sa largeur au titre — en rubrique (.ctx)',
    /body\.rf-haut\.ctx \.topbar \.topbar-brand\{flex:0 0 0!important;width:0;overflow:hidden\}/.test(tel));
  vrai('⛔ … et SEULEMENT là : hors rubrique aucun titre ne la remplace, les ronds sauteraient à gauche',
    !/body\.rf-haut \.topbar \.topbar-brand\{flex:0 0 0/.test(SRC));
  vrai('⛔ l’écart du palier téléphone prend vraiment (8 px, contre le 10 px !important de la refonte)',
    /html\[data-refonte\] body \.topbar\{gap:8px!important\}/.test(tel));
  vrai('⛔ on ne bascule PAS display sur le titre (le fondu doit survivre)',
    !/rf-haut[^{]*\.topbar-title\{[^}]*display:none/.test(SRC));

  const hors = blocMedia(SRC, '@media(max-width:389px)').join('\n');
  vrai('⛔ hors rubrique, sous 390 px, la marque s’efface plutôt que se couper — en gardant sa PLACE',
    /body:not\(\.ctx\) \.topbar \.topbar-brand\{visibility:hidden\}/.test(hors));
  vrai('… et la règle d’origine, sous 340 px pour tous, garde aussi la place',
    blocMedia(SRC, '@media(max-width:339px)').some(b => /\.topbar \.topbar-brand\{visibility:hidden\}/.test(b)));
  vrai('⛔ plus aucun display:none sur la marque de la barre au téléphone (les ronds se tassaient à gauche)',
    ![...blocMedia(SRC, '@media(max-width:389px)'), ...blocMedia(SRC, '@media(max-width:339px)')]
      .some(b => /\.topbar \.topbar-brand\{display:none/.test(b)));
  const doigt = blocMedia(SRC, '@media (pointer:coarse)').find(b => /\.menu-btn/.test(b)) || '';
  vrai('population : le premier bloc « au doigt » est trouvé', doigt.length > 2000, doigt.length + ' caractères');
  vrai('⛔ « Créer » a la taille des ronds de la barre (44), partout',
    /html\[data-refonte\] \.topbar \.creer-btn\{min-height:44px;height:44px\}/.test(doigt));

  /* ⛔ L'EN-TÊTE DE CARTE QUI PORTE DES BOUTONS — trouvé par l'audit des écrans profonds :
     « Rédiger » coupé au bord de sa carte (fiche intervention), et la page ENTIÈRE qui
     glissait de côté en Comptabilité › Synthèse (« Factures → » au-delà de l'écran). */
  const carte = blocMedia(SRC, '@media(max-width:560px)').find(b => /\.card-head\{flex-wrap:wrap/.test(b)) || '';
  vrai('population : le bloc téléphone des en-têtes de carte est trouvé', carte.length > 40, carte.length + ' caractères');
  vrai('⛔ au téléphone, un en-tête de carte passe à la ligne', /html\[data-refonte\] \.card-head\{flex-wrap:wrap;row-gap:10px\}/.test(carte));
  vrai('⛔ … et la rangée de boutons écrite en ligne aussi', /\.card-head > span\[style\*="display:flex"\]\{flex-wrap:wrap\}/.test(carte));
  vrai('… sans donner flex:1 au titre (sinon il rétrécirait au lieu de laisser descendre les boutons)',
    !/\.card-head h3\{[^}]*flex:\s*1/.test(SRC));

  /* la bascule elle-même : sans la classe, les deux règles ci-dessus ne veulent rien dire */
  vrai('⛔ la classe « rf-haut » est toujours posée au défilement',
    /document\.body\.classList\.toggle\('rf-haut',v\)/.test(SRC));
}

console.log('\n═══ test-768 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
