/* ══ RECHARGER OU FERMER LA PAGE PENDANT UN APPEL : LE NAVIGATEUR DEMANDE CONFIRMATION (lot m19, appels@6) ═══════════════════════════════════════
   Un rechargement termine l'appel des deux côtés en 160 ms : Ana retombait sur la liste Appels sans un mot. La page avait déjà une confirmation (`beforeunload`) pour un message encore
   « En attente » ; elle en demande désormais une AUSSI quand un appel est en cours (`etat.appelId`). Le message « L'appel a été interrompu par le rechargement » au retour n'est PAS fait :
   il exigerait de ranger un état sur l'appareil, ce que la page s'interdit (décision à demander à Justin).

   Ce que ce fichier garde — le VRAI écouteur de la page, extrait et EXÉCUTÉ avec un faux `etat` et une fausse `source` :
   1. un appel en cours, rien en attente : le navigateur est prié de demander (preventDefault + returnValue) ;
   2. ni appel ni message en attente : aucune demande (on ne demande pas pour rien — un navigateur qui s'habitue à une confirmation à chaque fermeture l'ignore) ;
   3. ⛔ la branche « message en attente » est INTACTE : un message en attente demande, avec ou sans appel ; une source sans `enAttente` (l'aperçu) ne jette pas ;
   4. ⛔ un départ voulu par la page (`etat.partir` : déconnexion, session morte) ne demande JAMAIS, appel en cours ou non — sans quoi la déconnexion d'une session morte, pendant un appel,
      ouvrirait une confirmation que personne ne peut satisfaire ;
   5. population : le motif a bien trouvé l'écouteur (sinon tout ce qui précède passerait sur du néant).
   La confirmation au navigateur (fermer la page pendant un appel) : scratchpad/messages/correctifs/m19/sonde-fin.js. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(process.env.OPMSG_RACINE || path.join(__dirname, '..'), 'apercu/opmessages/index.html'), 'utf8');
const JS = C.sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);

const i = JS.indexOf("window.addEventListener('beforeunload', e => {");
const j = i < 0 ? -1 : JS.indexOf('\n  });', i);
const texte = i < 0 || j < 0 ? '' : JS.slice(i, j + 6);
vrai('(population) l\'écouteur « beforeunload » est trouvé dans la page (' + texte.length + ' caractères)', texte.length > 80 && JS.split("addEventListener('beforeunload'").length === 2);

function jouer(etat, source) {
  let gestionnaire = null;
  new Function('window', 'etat', 'source', texte)({ addEventListener: (t, f) => { if (t === 'beforeunload') gestionnaire = f; } }, etat, source);
  if (!gestionnaire) return null;
  const e = { demande: false, returnValue: undefined, preventDefault() { this.demande = true; } };
  gestionnaire(e);
  return e.demande && e.returnValue === '';
}
const rien = { enAttente: () => 0 }, deux = { enAttente: () => 2 };
if (texte) {
  v('⛔ un appel en cours, rien en attente : le navigateur demande confirmation', jouer({ appelId: 'a_1', partir: false }, rien), true);
  v('ni appel ni message en attente : aucune demande', jouer({ appelId: null, partir: false }, rien), false);
  v('⛔ la branche d\'avant est intacte : un message en attente demande, sans appel', jouer({ appelId: null, partir: false }, deux), true);
  v('…et avec un appel aussi', jouer({ appelId: 'a_1', partir: false }, deux), true);
  v('une source sans `enAttente` (l\'aperçu) ne jette pas : sans appel rien, avec appel une demande', [jouer({ appelId: null, partir: false }, {}), jouer({ appelId: 'a_1', partir: false }, {})], [false, true]);
  v('⛔ un départ voulu par la page (`etat.partir`) ne demande JAMAIS : appel en cours, message en attente, ou les deux', [jouer({ appelId: 'a_1', partir: true }, rien), jouer({ appelId: null, partir: true }, deux), jouer({ appelId: 'a_1', partir: true }, deux)], [false, false, false]);
  v('la fin d\'un appel (appelId remis à null) lève la demande', jouer({ appelId: null, partir: false }, rien), false);
}
fin();
