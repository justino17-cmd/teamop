/* ══ OP MESSAGES — L'AGENDA : LES JOURS DE LA SEMAINE ET LES HEURES DES PASTILLES SE LISENT, DE JOUR COMME DE NUIT (lot m21) ═════════════════════════════════════════════════════════
   Relevé du 17 octobre 2026 (testeurs, au pixel, bureau) : « Lun … Dim » (.mjour-nom) à 3,44:1 en jour, et l'heure dans une pastille (.mjour-elt time) à 3,06:1 en jour et 4,22:1 en nuit,
   pour du texte de 12 px. Les deux étaient posés en `--sub` (rgba(60,60,67,.6) / rgba(220,228,250,.6)) : le gris « secondaire » d'Apple, fait pour un grand texte. La page a déjà
   `--sub-meta` (.8 de jour, .75 de nuit) pour les légendes de 11–13 px : c'est le jeton de TEXTE de ce rang, calculé ≥ 5:1 sur le fond, la carte et une ligne choisie.
   Même défaut, même ligne, même jeton : l'en-tête des jours du MOIS (.mois-entete) et le « +N » d'une case (.mjour-plus) étaient eux aussi en 12 px `--sub`.
   Ce banc REJOUE la feuille réelle (tests/outils-css-msg.js) : l'encre (un gris translucide !) est composée sur le fond qu'elle a vraiment — la carte, la pastille teintée par
   `color-mix(--accent 18 %)`, celle d'un jour entier (34 %), d'un fait (26 % de vert), au survol (30 %) — de jour et de nuit, et exige 4,5:1. Le pixel sous le verre est mesuré
   par tests/sonde-opmessages-contrastes.js (le calcul ne voit pas ce qu'une vitre laisse passer). ⛔ Population comptée d'abord : une règle absente ne passe pas pour juste. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

/* [sélecteur du texte, contexte, [les fonds sur lesquels il peut tomber : { sel: règle du fond | null, sur: 'card' | 'base' }]] */
const GRAND = { largeur: 1200 }, SOURIS = { largeur: 1200, tactile: false };
const TEXTES = [
  ['.sem-grille .mjour-nom', 'nom d\'un jour de la semaine (grille)', GRAND, [[null, '--card']]],
  ['.mois-entete', 'en-tête des jours du mois', { largeur: 390 }, [[null, '--base']]],
  ['.mjour-plus', '« +N » d\'une case', GRAND, [[null, '--card']]],
  ['.mjour-elt time', 'heure dans une pastille', GRAND, [
    ['.mjour-elt', '--card'], ['.mjour-elt.journee', '--card'], ['.mjour-elt.fait', '--card'], ['.mjour-elt:hover', '--card', SOURIS],
  ]],
];
let total = 0;
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour';
  vrai('(population) les jetons de ' + mode + ' sont lus (' + Object.keys(J).length + ')', Object.keys(J).length > 40);
  for (const [sel, nom, ctx0, fonds] of TEXTES) {
    const ctx = Object.assign({}, ctx0, { nuit });
    const encre = C.valeur(L, sel, 'color', ctx);
    vrai('(population) ' + sel + ' déclare une encre (' + encre + ')', encre);
    if (!encre) continue;
    for (const [selFond, jeton, ctxFond] of fonds) {
      const cf = Object.assign({}, ctx, ctxFond || {});
      let r = 0, detail = '';
      try {
        const page = C.couleur('var(' + jeton + ')', J);
        const fondRegle = selFond ? C.valeur(L, selFond, 'background', cf) : null;
        if (selFond && !fondRegle) throw new Error('aucun fond déclaré pour ' + selFond);
        const fond = fondRegle ? C.sur(C.couleur(fondRegle, J), page) : page;
        const e = C.couleur(encre, J);
        r = C.ratio(C.sur(e, fond), fond); total++;
        detail = encre + ' sur ' + (selFond || jeton) + ' = ' + r.toFixed(2);
      } catch (err) { detail = String(err.message); }
      vrai(nom + ' — ' + mode + ' : ≥ 4,5:1 (' + detail + ')', r >= 4.5);
    }
  }
}
vrai('(population) ' + total + ' combinaisons encre / fond mesurées', total === 2 * (1 + 1 + 1 + 4));
fin();
