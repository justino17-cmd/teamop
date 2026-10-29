/* L'ENSEMBLE DES CAS — le générateur que promptfoo appelle (`tests: file://cas/index.js`) et que le banc `test-3132` lit sans promptfoo.
 * Un cas = { description, vars, metadata, assert }. `vars.simule.bonne` / `vars.simule.mauvaise` : les deux réponses écrites à la main, rejouées par le fournisseur simulé ;
 * `metadata.attrape` : les assertions que la MAUVAISE réponse doit faire tomber (le banc le vérifie), `metadata.jeu` : « petit » (le jeu de l’évaluation réelle) ou « complet ». */
'use strict';
const TOUS = [].concat(require('./camille.js'), require('./lea.js'), require('./chloe.js'), require('./equipe.js'));
module.exports = function cas() { return TOUS; };
module.exports.TOUS = TOUS;
