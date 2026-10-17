/* ══ OP MESSAGES — LES BOUTONS PLEINS DE LA SALLE : UNE SURFACE, UNE ENCRE (lot m21 : « Rejoindre » de nuit, « Terminer pour tous » et « Quitter ») ═══════════════════════════════
   Relevé du 17 octobre 2026 (testeurs, au pixel) :
     · « Rejoindre » (la feuille « Avant d'entrer ») écrivait du blanc en dur sur `var(--accent)`, la teinte de TEXTE éclairci de nuit (#7ea2f0) : 2,53:1, le bouton principal pour
       entrer dans la salle. Les autres boutons pleins de la page posent `--fill` et son encre `--on-fill` — une surface, une encre ;
     · « Terminer pour tous » (.salle-btn.danger) et « Quitter » (.salle-quitter) : du blanc sur `--rouge` #ff453a, le rouge SYSTÈME des statuts (une couleur d'aplat pour un trait ou une
       pastille, où 3:1 suffit) : 3,41:1 pour 14–15 px gras, sur les boutons les plus importants de la salle.
   Ce banc REJOUE la feuille réelle (tests/outils-css-msg.js) : le fond et l'encre de chaque bouton, de jour ET de nuit, et exige 4,5:1. Il ne regarde pas un nom de jeton : un jeton
   qui change de valeur entre le jour et la nuit est exactement ce qui a fait tomber « Rejoindre ».
   ⛔ Il compte d'abord sa population (un contrôle sur un ensemble vide passe sur tout) : chaque règle visée doit exister ET résoudre un fond. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

const BOUTONS = [
  ['.avant-rejoindre', '« Rejoindre » (Avant d\'entrer)'],
  ['.salle-btn.danger', '« Terminer pour tous » (salle)'],
  ['.salle-quitter', '« Quitter » (barre du haut de la salle)'],
];
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour';
  vrai('(population) les jetons de ' + mode + ' sont lus (' + Object.keys(J).length + ')', Object.keys(J).length > 40);
  for (const [sel, nom] of BOUTONS) {
    const fond = C.valeur(L, sel, 'background', { nuit }), encre = C.valeur(L, sel, 'color', { nuit });
    vrai('(population) ' + sel + ' déclare un fond et une encre', fond && encre);
    if (!fond || !encre) continue;
    let r = 0, detail = '';
    try { const f = C.couleur(fond, J), e = C.couleur(encre, J); r = C.ratio(C.sur(e, C.sur(f, [0, 0, 0, 1])), C.sur(f, [0, 0, 0, 1])); detail = fond + ' / ' + encre + ' = ' + r.toFixed(2); } catch (err) { detail = String(err.message); }
    vrai(nom + ' — ' + mode + ' : l\'encre tient ≥ 4,5:1 sur son aplat (' + detail + ')', r >= 4.5);
  }
}
fin();
