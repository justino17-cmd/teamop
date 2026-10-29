/* LES BRIQUES COMMUNES DES CAS (28 octobre 2026) — une assertion s'écrit en une ligne, et les textes de référence vivent ici, une fois.
 *
 * ⛔ Les placeholders de rubriques de Chloé s'écrivent ici `[[RUBRIQUES_CONSERVEES]]` : promptfoo passe les valeurs de cas dans un moteur de gabarits (Nunjucks) qui avalerait
 *    `{{…}}`. Le fournisseur les remet en `{{…}}` avant de rendre la réponse (`repondreSimule`).
 */
'use strict';

/* Une assertion : le fichier `assertions.js` (chemin relatif au fichier de configuration), la fonction, ses paramètres, et le nom sous lequel le rapport la compte. */
const a = (nom, config, metric) => Object.assign({ type: 'javascript', value: 'file://assertions.js:' + nom, metric: metric || nom }, config === undefined ? {} : { config });

/* Le courriel de vente que Léa ou Camille pourraient écrire : il passe le contrôle du serveur (`refusDe`), quatre questions numérotées, vouvoiement, un seul prix permis. */
const COURRIEL_VENTE = accroche => [
  'Objet : TeamOP — OP GESTION pour votre activité', '',
  'Bonjour,', '',
  accroche, '',
  'TeamOP édite OP GESTION, la gestion de vos interventions, sur ordinateur, tablette et téléphone, sans installation.', '',
  'Toute votre équipe travaille sur des informations à jour en temps réel : le planning des techniciens par jour, semaine ou mois, le suivi des interventions, les fiches clients et sites, et le rapport PDF envoyé au client.', '',
  'Notre différence : une formule sur mesure, où les catégories dont vous n’avez pas besoin sont retirées et ne vous sont pas facturées, et des tarifs maîtrisés, à partir de 15 € par mois et par utilisateur (TVA non applicable).', '',
  'Pour vous proposer une offre adaptée, pourriez-vous nous préciser :',
  '1. La taille de votre équipe ?', '2. Votre clientèle ?', '3. Les outils que vous utilisez aujourd’hui ?', '4. Vos attentes principales ?', '',
  'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.', '',
  'Nous restons à votre disposition par retour de mail ou par téléphone.', '',
  'Bien cordialement,'
].join('\n');

/* La proposition de Chloé (format : FORMULE, Objet, corps avec les deux emplacements de rubriques que le serveur remplit). */
const PROPOSITION = (formule, extra) => [
  'FORMULE : ' + formule,
  'Objet : Notre proposition pour votre entreprise', '',
  'Bonjour,', '',
  'Nous vous remercions pour vos réponses. Nous avons compris que votre équipe intervient chez des clients et cherche à mieux organiser ses interventions.', '',
  'La formule que nous vous proposons est OP GESTION ' + (formule === 'premium' ? 'Business Premium' : formule === 'business' ? 'Business' : 'Pro') + ', à ' + (formule === 'premium' ? '50' : formule === 'business' ? '25' : '15') +
    ' € par mois et par utilisateur (TVA non applicable), sans engagement de durée. Elle comprend le planning des interventions, les rapports avec photos et signature, et les devis et factures.', '',
  '[[RUBRIQUES_CONSERVEES]]', '', '[[RUBRIQUES_RETIREES]]', '',
  'Nous pouvons aussi créer pour vous une catégorie propre à votre activité, réservée à votre entreprise.', '',
  (extra ? extra + ' ' : '') + 'Si cette proposition vous convient, nous pourrons ensuite vous ouvrir une période d’essai d’une semaine pour la tester avec votre équipe.', '',
  'Nous restons à votre disposition par retour de mail ou par téléphone.', '',
  'Bien cordialement,'
].join('\n');

module.exports = { a, COURRIEL_VENTE, PROPOSITION };
