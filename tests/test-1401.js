/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE NE PROPOSE PAS À L'HÔTE PAR INTÉRIM CE QUE LE SERVICE LUI REFUSE (m01, 16 octobre 2026).

   `test-1400` joue le SERVICE : l'invité nommé qui entre avant l'organisateur n'exclut pas, ne verrouille pas, ne règle pas la salle, n'enregistre pas, ne nomme pas de co-hôte, ne fait pas taire tout le monde. Ici, la PAGE :
   le service dit `moi.interim` (`source-serveur.js` le passe à la salle), et l'écran retire les commandes correspondantes — « Plus › Sécurité » (verrou, salle d'attente, partage des participants), « Enregistrer »,
   « Retirer de la salle », « Nommer co-hôte », « Demander à tous de couper le micro » — et `salleAgir` refuse le geste si une commande restée affichée le laissait partir. La preuve de bout en bout, au navigateur
   et contre le vrai service, est la sonde `sonde-interim.js` (scratchpad du lot m01) ; ce banc, lui, lit le CODE (commentaires retirés : le correctif est abondamment commenté) et le mute.

   Un motif de banc vise du code, jamais une phrase : tout est cherché dans la source SANS ses commentaires ; chaque ancre est prouvée trouvée avant d'être crue (une tranche vide passerait au vert). */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();

const brut = fs.readFileSync(path.join(T.RACINE, 'apercu/opmessages/index.html'), 'utf8');
const SRC = T.sansCommentaires(brut);
const SERV = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public/source-serveur.js'), 'utf8'));
const PUB = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public/opmsg-ui.js'), 'utf8'));

/* le corps d'une fonction déclarée au premier niveau de l'écran : de son en-tête à la prochaine déclaration de même niveau */
function corps(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  const suite = src.slice(i + entete.length), m = suite.search(/\n  (async )?function \w+\(|\n  const \w+ = /);
  return suite.slice(0, m < 0 ? suite.length : m);
}
const salleAgir = corps(SRC, 'async function salleAgir(act, el) {'), htmlPlus = corps(SRC, 'function htmlPlus(A) {'), htmlParticipants = corps(SRC, 'function htmlParticipants(A) {');
const recPossible = (SRC.match(/const salleRecPossible = A => \{[^\n]*\n/) || [''])[0];

console.log('Les ancres sont trouvées (une tranche vide passerait au vert sur tout)');
vrai('salleAgir, htmlPlus, htmlParticipants, salleRecPossible : quatre morceaux de code non vides', salleAgir.length > 500 && htmlPlus.length > 2000 && htmlParticipants.length > 1500 && recPossible.length > 100);
vrai('la page servie (opmsg-ui.js) porte les mêmes morceaux : le générateur l\'a régénérée', PUB.includes('async function salleAgir(act, el) {') && PUB.includes('function htmlPlus(A) {'));

console.log('\nLe service dit `interim`, la page le lit');
vrai('source-serveur.js passe `moi.interim` de la vue du service à la salle (seulement présent)', /interim: !!\(v\.moi && v\.moi\.interim && st === 'present'\)/.test(SERV));

console.log('\nCe que la page ne propose plus à l\'intérimaire');
const SEC = (htmlPlus.match(/\n\s*if \(hote[^\n]*\) \{\n[^\n]*\n\s*h \+= '<div class="salle-rub"><span>Sécurité/) || [''])[0];
vrai('« Sécurité » (verrou, salle d\'attente, partage des participants) n\'est montrée qu\'à un hôte QUI N\'EST PAS intérimaire', /if \(hote && !s\.moi\.interim\) \{/.test(SEC));
vrai('« Retirer de la salle » : refusé à l\'intérimaire', /if \(s\.outils && !s\.moi\.interim && /.test(htmlParticipants) && /data-sa="retirer-demander"/.test(htmlParticipants));
vrai('« Nommer co-hôte » : refusé à l\'intérimaire', /if \(s\.moi\.proprietaire && !s\.moi\.interim\) h \+= '<button type="button" class="salle-btn presse" data-sa="cohote"/.test(htmlParticipants));
vrai('« Demander à tous de couper le micro » : refusé à l\'intérimaire', /if \(hote && s\.outils && !s\.moi\.interim && presents\.length\) h \+= [^\n]*data-sa="couper-tous"/.test(htmlParticipants));
vrai('« Enregistrer » et « Arrêter l\'enregistrement » (celui d\'un autre) : refusés à l\'intérimaire', /inter = !!s\.moi\.interim/.test(recPossible) && /!!s\.moi\.hote && !inter && !!s\.rec/.test(recPossible) && /\(s\.moi\.grade \| 0\) >= 2 && !inter && !!s\.outils/.test(recPossible));
vrai('… et une commande restée affichée (page périmée, panneau ouvert avant le changement de rôle) est arrêtée par `salleAgir` pour les huit gestes',
  /if \(s\.moi\.interim && \['couper-tous', 'cohote', 'retirer-demander', 'retirer-confirmer', 'verrou', 'attente', 'partage-ok', 'rec'\]\.includes\(act\)\) \{ mot\([^\n]*\); return; \}\n\s*switch \(act\) \{/.test(salleAgir));

console.log('\nCe qu\'elle garde : la porte, et le geste individuel');
vrai('admettre / refuser à l\'entrée restent à tout hôte (rien de `interim` autour de leur bloc)', /const attendent = hote \? s\.membres\.filter/.test(htmlParticipants) && !/'admettre'/.test(salleAgir.slice(0, 600)));
vrai('demander à UNE personne de couper son micro reste proposé (`s.outils` seulement)', /\(s\.outils \? '<button type="button" class="salle-btn presse" data-sa="couper"/.test(htmlParticipants));

fin();
