'use strict';
/* ══ LE MÉTIER DE L'ENTREPRISE, POUR LES DEUX GÉNÉRATEURS DE DEVIS ═══════════════════════════════════════════════════
   Deux routes font rédiger un devis par Claude : l'assistant (`/api/devis/agent`, server/agent-devis.js) et le « Devis IA »
   (`/api/devis/generer`, server/index.js). Toutes deux étaient écrites pour la 3D — dératisation, désinsectisation,
   Certibiocide, fourchettes de prix de la dératisation — et servies telles quelles à toute entreprise, nettoyage compris.

   Ce module n'a AUCUNE dépendance (ni le SDK d'Anthropic, ni Express) : les deux routes y lisent la MÊME décision, et un
   banc l'exécute sans rien monter.

   ⛔ OÙ LE MÉTIER SE LIT, ET POURQUOI — dans cet ordre, sans jamais en changer :
     1. l'ANNUAIRE du serveur, par l'identifiant d'équipe : `metierOk(espace.metier)`, exactement ce que `/api/espaces/etat`
        sert à l'application. Pour une entreprise de l'annuaire, le corps de la requête ne décide JAMAIS du métier : ce que
        le client écrit ne choisit pas le texte d'instruction d'une entreprise qui a déjà un métier réglé par la Tour.
     2. seulement si l'identifiant n'est PAS dans l'annuaire (la bêta `opgestion-beta`, la démonstration : des espaces
        techniques sans fiche), le champ `metier` du corps — borné à la liste fermée des métiers OUVERTS (`metierOk`). C'est
        ce qui laisse la bêta, où l'on choisit n'importe quel métier en local, parler à un cerveau cohérent. Choisir un
        texte d'instruction n'ouvre rien : ni formule, ni accès, ni donnée.
     3. sinon : le cerveau 3D, celui d'AVANT. Une entreprise de l'annuaire dont le métier n'est pas encore réglé (c'est le
        cas de toutes les entreprises existantes, ELAN comprise) garde exactement ce qu'elle avait — et l'application, elle,
        reste aussi en 3D tant que la Tour n'a pas posé le métier : les deux disent la même chose.
   Un métier inconnu ou fermé (`metierOk` rend '') tombe donc sur la 3D, pas sur le cerveau générique : c'est la décision
   « on ne retire rien à qui l'avait », écrite une fois. Le cerveau générique n'est servi qu'à un métier OUVERT et réglé. */

const METIER_3D = '3d';

/* '' (rien de réglé) et '3d' : le cerveau d'avant. */
const est3D = m => !m || m === METIER_3D;

/* `espaceDe(t)` : l'entrée de l'annuaire (ou null) — `espaceParT` du serveur. `metierOk(m)` : le métier s'il est OUVERT, sinon ''. */
function resoudreMetier(t, metierCorps, deps) {
  const espaceDe = deps && deps.espaceDe, metierOk = deps && deps.metierOk;
  if (typeof metierOk !== 'function') return '';
  const cle = String(t == null ? '' : t).trim().slice(0, 80);
  if (cle && typeof espaceDe === 'function') {
    const e = espaceDe(cle);
    if (e) return metierOk(e.metier) || '';
  }
  return metierOk(String(metierCorps == null ? '' : metierCorps).trim().toLowerCase().slice(0, 40)) || '';
}

/* Le vocabulaire d'un métier, tel que le référentiel (`metiers.json`) le porte : ses types d'intervention et ses prestations.
   Borné — ce texte entre dans une consigne, il reste court. `ref` : `metiersMod.ref`, ou null (fichier absent). */
function vocabulaireDe(ref, nomDe, cle) {
  const m = ref && ref.metiers && Object.prototype.hasOwnProperty.call(ref.metiers, cle) ? ref.metiers[cle] : null;
  const liste = a => (Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && x.trim()).slice(0, 20).map(x => x.trim().slice(0, 80));
  return { nom: String((nomDe && nomDe(cle)) || (m && m.nom) || '').slice(0, 80), types: liste(m && m.types), presta: liste(m && m.presta) };
}

/* TVA quand le modèle n'en a pas donné. La 3D garde 10 (comportement d'avant) ; les autres 20 : 10 est une règle du logement,
   que seul un utilisateur qui la connaît peut demander. */
const tvaParDefaut = metier => (est3D(metier) ? 10 : 20);

/* La phrase système du « Devis IA » (`/api/devis/generer`). Le texte 3D est celui d'AVANT, mot pour mot : un banc le compare. */
const DEVIS_SYS_3D = "Tu prépares des devis pour une entreprise française de gestion de nuisibles (dératisation, désinsectisation, désinfection, dépigeonnage) et petits travaux associés. À partir de la demande, produis un devis réaliste et sobre : des lignes claires (désignation précise, quantité, prix unitaire HT en euros, cohérent avec le marché français), la main d'œuvre et le déplacement en lignes séparées quand c'est pertinent, TVA 20 par défaut (10 seulement pour des travaux d'amélioration d'un logement de plus de 2 ans). « remarque » : 1 ou 2 phrases utiles pour le client (garantie, nombre de passages, conditions). Pas de lignes de remplissage.";

function devisSysPour(metier, voc) {
  if (est3D(metier)) return DEVIS_SYS_3D;
  const qui = metier === 'nettoyage'
    ? 'une entreprise française de nettoyage et de propreté (bureaux, copropriétés, commerces, remise en état, vitrerie, fin de chantier, entretien des sols)'
    : 'une entreprise française de terrain, métier : ' + ((voc && voc.nom) || 'non précisé');
  return 'Tu prépares des devis pour ' + qui + '. À partir de la demande, produis un devis réaliste et sobre : des lignes claires '
    + '(désignation précise, quantité, prix unitaire HT en euros, cohérent avec le marché français), la main d\'œuvre et le déplacement en lignes séparées '
    + 'quand c\'est pertinent, TVA 20 par défaut. « remarque » : 1 ou 2 phrases utiles pour le client (fréquence ou nombre de passages, conditions), '
    + 'sans promettre de garantie, de norme ni d\'obligation que la demande ne mentionne pas. Pas de lignes de remplissage.';
}

module.exports = { METIER_3D, est3D, resoudreMetier, vocabulaireDe, tvaParDefaut, devisSysPour, DEVIS_SYS_3D };
