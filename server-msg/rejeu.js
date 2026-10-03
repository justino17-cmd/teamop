/* ══ LE REJEU DES PURGES PAR LE SERVICE — ce qu'une restauration ne peut pas rejouer toute seule ═══════════════════════════════════════════════
 *
 * Une archive date d'avant ce que le service a effacé depuis. L'outil de restauration (`outils/restaurer.js`) rejoue le registre `purge` de la plus récente archive
 * qui s'ouvre sur la copie qu'il remet en service — HORS LIGNE, en SQL pur, sans la clé maître (`stockage.js` → `rejouerPurge`, genres déclarés 'copie' dans
 * `GENRES_PURGE`). Certains effacements ne s'y prêtent pas : supprimer un compte touche une dizaine de tables, applique des règles (qui devient administrateur d'un
 * groupe, ce qui reste d'une conversation directe) et passe par des fonctions du service. Pour ces genres, l'outil ne fait que RECOPIER la ligne dans la base
 * restaurée et lever le drapeau `meta.rejeu_service` ; c'est ICI, au premier démarrage du service sur cette base, qu'ils sont rejoués — avec les vraies fonctions.
 *
 * ⛔ COMMENT BRANCHER UN GENRE NEUF (le compte qu'on efface au bout de quatorze jours, par exemple) — quatre gestes, et le banc refuse de passer tant qu'il en manque un :
 *   1. écrire la ligne dans `purge(objet, genre, quand)` DANS LA MÊME TRANSACTION que l'effacement (un registre qui oublie est un effacement qui revient) ;
 *   2. déclarer le genre dans `GENRES_PURGE` (`stockage.js`) avec la valeur 'service' ;
 *   3. écrire ici sa fonction, `(stockage, entree, contexte) => void`, dans `GENRES_SERVICE` :
 *        · `entree` = { objet, genre, quand } ; `contexte` = ce que `index.js` met à disposition (`effacerPieces(ids)` pour retirer les FICHIERS d'une pièce, `horloge`) ;
 *        · IDEMPOTENTE : elle est rejouée à chaque démarrage tant qu'une entrée échoue, et sur une base où l'objet n'est peut-être plus (ou n'a jamais été) — ne rien
 *          trouver n'est pas une erreur ; SYNCHRONE (le magasin l'est) ; elle n'efface QUE ce que la ligne désigne, jamais « tout ce qui ressemble » ;
 *        · elle lève si elle échoue : le drapeau reste levé et le démarrage suivant recommence (le journal le dit : `rejeu` / `echec` / le genre) ;
 *   4. écrire le banc : une base qui porte l'objet, une archive prise AVANT l'effacement, le registre APRÈS, la restauration, le démarrage — l'objet ne revient pas
 *      (`tests/test-951.js` § « une restauration ne ressuscite rien » donne le modèle).
 * Un genre déclaré 'copie' se rejoue sans ce fichier : une branche de plus dans `rejouerPurge`, et son banc dans `tests/test-950.js` § 13.
 *
 * ⚠️ Ce qui n'est PAS rejoué, et ne le sera jamais : ce qui s'est passé APRÈS la dernière archive. Une suppression faite depuis l'heure de l'archive la plus récente
 * n'est dans aucun registre — c'est la même fenêtre que celle des messages écrits depuis (jusqu'à une heure) ; elle est dite dans `SERVEUR.md`.
 */
'use strict';

/* genre → (stockage, entree, contexte) => void. VIDE tant qu'aucun genre n'a besoin du service : le mécanisme est en place, le premier usage l'attend. */
const GENRES_SERVICE = {};

/* Rejoue, au démarrage, le registre de la base restaurée — seulement quand l'outil de restauration a levé le drapeau. Rend le bilan { fait, rejouees, echecs } ; ne lève
   jamais (un rejeu raté ne doit pas empêcher le service de servir ce qu'il peut) : l'échec se DIT au journal et laisse le drapeau levé pour le démarrage suivant. */
function rejouerAuDemarrage({ stockage, contexte = {}, genres = GENRES_SERVICE, journaliser = () => {} }) {
  const bilan = { fait: false, rejouees: 0, echecs: 0 };
  let aFaire = false;
  try { aFaire = stockage.rejeuAFaire(); } catch (e) { return bilan; }
  if (!aFaire) return bilan;
  bilan.fait = true;
  let entrees = [];
  try { entrees = stockage.purgeLignes(); } catch (e) { bilan.echecs++; journaliser('rejeu', { etat: 'echec', motif: 'registre-illisible' }); return bilan; }
  for (const e of entrees) {
    if (!Object.prototype.hasOwnProperty.call(genres, e.genre) || typeof genres[e.genre] !== 'function') continue;
    try {
      const r = genres[e.genre](stockage, e, contexte);
      if (r && typeof r.then === 'function') throw new Error('rejeu-asynchrone');   // le démarrage est synchrone : une promesse perdue serait un effacement qu'on croirait fait
      bilan.rejouees++;
    } catch (x) {
      bilan.echecs++;
      journaliser('rejeu', { etat: 'echec', motif: e.genre });
    }
  }
  if (bilan.echecs === 0) { try { stockage.rejeuTermine(); } catch (e) { bilan.echecs++; journaliser('rejeu', { etat: 'echec', motif: 'drapeau' }); } }
  journaliser('rejeu', { etat: bilan.echecs ? 'echec' : 'ok', n: bilan.rejouees });
  return bilan;
}

module.exports = { GENRES_SERVICE, rejouerAuDemarrage };
