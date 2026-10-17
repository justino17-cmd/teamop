/* ══ OP MESSAGES — LA SALLE AU DOIGT : LES BOUTONS ET LES MENUS DES FEUILLES TIENNENT 44 PX (lot m21) ═══════════════════════════════════════════════════════════════════════════
   Relevé du 17 octobre 2026 (testeurs, `elementFromPoint` sur la verticale du centre, iPhone 390, Android 360, iPad 820, jour et nuit) : dans la salle, les boutons des feuilles
   « Plus », « Participants » et « Quitter la salle » répondaient sur 36 px de haut (`.salle-btn`, dont les trois de la confirmation « Quitter la salle », 241 × 36) et les menus
   Micro / Caméra / Sortie du son sur 40 px (`.salle-appareil select`) : sous le plancher tactile de 44 px que le reste de la page tient.
   La règle d'OP MESSAGES est la même partout dans cette feuille : le plancher se pose sous `(pointer: coarse)` — c'est le DOIGT qui décide, pas la largeur d'un téléphone (un iPad
   n'est ni un téléphone ni un ordinateur, et une tablette en paysage dépasse 1 000 px) — et le bureau, à la souris, garde ses boutons compacts (36 px).
   ⛔ `.salle-rang .salle-btn { min-height: 36px }` est PLUS spécifique que `.salle-btn` : une règle tactile posée sur `.salle-btn` seul serait battue dans toutes les rangées de la
   feuille Participants. Le banc exige donc le plancher sur CHAQUE sélecteur qui fixe la hauteur d'un bouton de la salle, pas sur la classe seule (la sonde au navigateur —
   tests/sonde-opmessages-contrastes.js — mesure la zone qui répond, la vérité).
   Ce banc REJOUE la feuille réelle (tests/outils-css-msg.js) ; il compte sa population d'abord. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);
const px = s => { const m = /^(\d+(?:\.\d+)?)px$/.exec(s || ''); return m ? +m[1] : 0; };

/* tout sélecteur de la feuille qui FIXE la hauteur minimale d'un bouton ou d'un menu de la salle : on les recense dans la feuille, on ne les énumère pas à la main */
const SALLE = L.regles.flatMap(r => r.sels).filter((s, i, a) => a.indexOf(s) === i)
  .filter(s => /(^|[ >])(\.salle-btn|\.salle-appareil select)(\.[a-z-]+)*$/.test(s) && !/\.salle-(form|suivi)/.test(s))
  .filter(s => L.regles.some(r => r.sels.includes(s) && /(^|[;\s])min-height\s*:/.test(r.corps)));
vrai('(population) la feuille fixe la hauteur de ' + SALLE.length + ' sélecteurs de boutons ou de menus de la salle : ' + SALLE.join(' · '), SALLE.length >= 3 && SALLE.includes('.salle-btn') && SALLE.includes('.salle-rang .salle-btn') && SALLE.includes('.salle-appareil select'));

for (const [nom, largeur] of [['iPhone 390', 390], ['Android 360', 360], ['iPad portrait 820', 820], ['iPad paysage 1180', 1180]]) {
  for (const s of SALLE) {
    const h = px(C.valeur(L, s, 'min-height', { tactile: true, largeur }));
    vrai(nom + ', au doigt : ' + s + ' garde ≥ 44 px (obtenu ' + h + ')', h >= 44);
  }
}
/* le bureau (souris) garde ses boutons compacts : on n'a pas gonflé la salle partout */
for (const s of ['.salle-btn', '.salle-rang .salle-btn']) {
  const h = px(C.valeur(L, s, 'min-height', { tactile: false, largeur: 1440 }));
  vrai('à la souris (1440 px) : ' + s + ' reste compact (' + h + ' px, < 44)', h > 0 && h < 44);
}
fin();
