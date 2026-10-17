/* ══ OP MESSAGES — LE TABLEAU DE BORD : LE ROUGE EST POUR L'APPEL MANQUÉ, PAS POUR LA RAISON DE L'AFFICHER (lot m21, amélioration « évidente » pro@8) ═══════════════════════════════
   Relevé du 17 octobre 2026 (capture iPad, jour) : dans « Appels manqués importants », le nom de l'appelant (« Cléo Petit ») et la pastille « Collègue » étaient écrits en rouge
   alarmant (`--rouge-txt`) — or « Collègue », « Favori », « A appelé 3 fois » sont des INFORMATIONS sur la personne, pas une alerte. Le rouge dit « manqué » ; il a déjà sa place
   dans la liste des Appels (`.appel-nom-ligne.manque`, inchangée) et dans le libellé « Appel manqué » de la ligne, qui reste.
   Une couleur de texte est un jeton de TEXTE, jamais celui d'un aplat ou d'un statut (CLAUDE.md) : le nom reprend l'encre du texte (`--text`), la pastille un gris de légende
   (`--sub-meta`, ≥ 5:1) sur un voile neutre.
   Ce banc REJOUE la feuille réelle (tests/outils-css-msg.js), de jour et de nuit : ni le nom ni la pastille ne se lisent dans un jeton rouge, la pastille garde ≥ 4,5:1 sur son voile, et
   la liste des Appels GARDE son rouge pour un appel manqué (on n'a pas décoloré ce que l'utilisateur connaît). ⛔ Population comptée d'abord. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

/* le tableau range le nom dans `ligneAppel` (qui pose `manque` sur tout appel manqué) : on lit donc la règle la plus précise, celle du tableau, si elle existe */
const rouge = c => /rouge|red|#f[0-9a-f]4|#d70015|#ff453a/i.test(c || '');
const NOM_BORD = '#bord-appels .appel-nom-ligne.manque', NOM_APPELS = '.appel-nom-ligne.manque', RAISON = '.bord-raison';
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour', ctx = { nuit };
  const card = C.couleur('var(--card)', J);

  const nomApp = C.valeur(L, NOM_APPELS, 'color', ctx);
  vrai('(population) ' + mode + ' : la liste des Appels déclare une encre pour un appel manqué (' + nomApp + ')', !!nomApp);
  vrai(mode + ' : ⛔ la liste des APPELS garde son rouge pour un appel manqué (' + nomApp + ')', rouge(nomApp));

  const nomBord = C.valeur(L, NOM_BORD, 'color', ctx);
  vrai(mode + ' : le nom de l\'appelant au tableau de bord ne se lit plus en rouge (' + nomBord + ')', !!nomBord && !rouge(nomBord));
  if (nomBord) { const r = C.ratio(C.sur(C.couleur(nomBord, J), card), card); vrai(mode + ' : …et il tient ≥ 4,5:1 sur la carte (' + r.toFixed(2) + ')', r >= 4.5); }

  const fond = C.valeur(L, RAISON, 'background', ctx), encre = C.valeur(L, RAISON, 'color', ctx);
  vrai('(population) ' + mode + ' : la pastille de raison déclare un fond et une encre (' + fond + ' / ' + encre + ')', !!fond && !!encre);
  if (fond && encre) {
    vrai(mode + ' : la pastille « Collègue » n\'est pas rouge (' + fond + ' / ' + encre + ')', !rouge(fond) && !rouge(encre));
    const f = C.sur(C.couleur(fond, J), card), r = C.ratio(C.sur(C.couleur(encre, J), f), f);
    vrai(mode + ' : …et son texte tient ≥ 4,5:1 sur son voile (' + r.toFixed(2) + ')', r >= 4.5);
  }
}
fin();
