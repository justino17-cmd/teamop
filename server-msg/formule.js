/* ══ LA FORMULE — UNE SEULE FONCTION DÉCIDE : PERSO, PRO, OU IMPAYÉ ═════════════════════════════════════════════════════════════════
 *
 * Messages Pro est un abonnement PAR ESPACE (une entreprise, toutes ses places dans un seul abonnement). `formuleDe` est la SEULE fonction qui dise ce qu'une
 * personne ou un espace a le droit de faire ; le garde `PRO` des routes, la liste des espaces, l'état de l'abonnement et les places la LISENT, aucune ne la recopie.
 * Les lots suivants (réunions programmées, appels de groupe) viendront y lire leur droit au même endroit : ce fichier est le point de décision unique.
 *
 *   formuleDe({ espace })    → la formule d'UN espace
 *   formuleDe({ personne })  → la meilleure formule parmi les espaces dont la personne est membre (administrateur ou non : une place payée vaut Pro pour son titulaire)
 *   → { formule: 'pro' | 'perso' | 'impaye', motif, sursis_jusqua? }
 *
 *   · 'pro'     un abonnement PAYÉ (Stripe dit `active` ou `trialing`, rien d'autre), ou un impayé encore dans ses sept jours de sursis (motif `sursis`) ;
 *   · 'impaye'  `past_due` ou `unpaid` depuis plus de sept jours : seules les fonctions Pro refusent (créer un espace, un canal, inviter), l'historique et tout le reste de
 *               la messagerie continuent, rien n'est effacé ;
 *   · 'perso'   aucun abonnement vivant (jamais abonné, résilié, paiement jamais abouti).
 *
 * ⛔ LE DRAPEAU DE LA BÊTA EST LU ICI ET NULLE PART AILLEURS (comme `BETA_ESSAI` d'OP GESTION) : sur l'instance bêta tout est ouvert, sans paiement — une catégorie
 * masquée est une catégorie qu'on ne peut plus ÉPROUVER. `config.formule.toutOuvert` vaut vrai sur la bêta par défaut, et la production REFUSE de démarrer avec lui
 * (`config.js`) : une configuration copiée de l'une à l'autre ne doit pas offrir Messages Pro à tout le monde. Ouvert, la formule rendue est `pro` quoi que dise la facturation ;
 * l'ÉTAT de la facturation (statut, places, échéance) reste, lui, celui que Stripe a dit — c'est ce que la page montre.
 *
 * ⛔ UNE PANNE NE SUSPEND PERSONNE (SERVEUR.md § 3.8). Le verdict ne lit QUE le dernier état que Stripe a dit (`abonnement`), jamais l'horloge seule : le sursis de sept jours se
 * compte entre la PREMIÈRE lecture de l'impayé et la DERNIÈRE LECTURE RÉUSSIE (`relu_le`), pas jusqu'à « maintenant ». Si Stripe se tait (ou si le service ne le relit plus), le
 * temps ne court plus contre celui qui a peut-être payé entre-temps : l'impayé n'est constaté que par une lecture, faite plus de sept jours après la première, qui le dit encore.
 *
 * ⛔ UN CORPS DE REQUÊTE NE DÉCIDE JAMAIS DE CE QUI A ÉTÉ PAYÉ : cette fonction ne reçoit que des identifiants, et ne lit que la base.
 */
'use strict';

const SURSIS_MS = 7 * 86400000;
const STATUTS_PAYES = ['active', 'trialing'];
const STATUTS_IMPAYES = ['past_due', 'unpaid'];
/* un abonnement qui existe encore chez Stripe, payé ou en retard : c'est lui qui donne les places */
const STATUTS_VIVANTS = STATUTS_PAYES.concat(STATUTS_IMPAYES);
const RANG = { perso: 0, impaye: 1, pro: 2 };

function creerFormule({ stockage, config }) {
  const toutOuvert = !!(config && config.formule && config.formule.toutOuvert === true);   // ⛔ le drapeau : lu ICI

  function deEspace(id) {
    if (toutOuvert) return { formule: 'pro', motif: 'beta' };
    const a = stockage.abonnementLire(id);
    if (!a || !STATUTS_VIVANTS.includes(a.statut)) return { formule: 'perso', motif: 'aucun' };
    if (STATUTS_PAYES.includes(a.statut)) return { formule: 'pro', motif: 'abonne' };
    /* un impayé : le sursis part de la première lecture, et ne se constate que par une lecture faite APRÈS lui */
    if (a.impaye_depuis !== null && a.relu_le !== null && a.relu_le - a.impaye_depuis >= SURSIS_MS) return { formule: 'impaye', motif: 'impaye' };
    return { formule: 'pro', motif: 'sursis', sursis_jusqua: a.impaye_depuis !== null ? a.impaye_depuis + SURSIS_MS : null };
  }

  function dePersonne(uid) {
    if (toutOuvert) return { formule: 'pro', motif: 'beta' };
    let meilleur = { formule: 'perso', motif: 'aucun' };
    for (const e of stockage.espacesIds(uid)) {
      const v = deEspace(e);
      if (RANG[v.formule] > RANG[meilleur.formule]) meilleur = v;
      if (meilleur.formule === 'pro') break;
    }
    return meilleur;
  }

  /* LA fonction. Un sujet qui n'est ni un espace ni une personne est une erreur de code, jamais un « perso » silencieux. */
  function formuleDe(sujet) {
    if (sujet && typeof sujet.espace === 'string') return deEspace(sujet.espace);
    if (sujet && typeof sujet.personne === 'string') return dePersonne(sujet.personne);
    throw new Error('formuleDe : un espace ou une personne');
  }

  /* Les places d'un espace : ce que Stripe a dit (le nombre de places PAYÉES) tant que l'abonnement vit ; sans abonnement, la bêta n'en compte pas (tout est ouvert : `Infinity`),
     et ailleurs il n'y en a aucune (le propriétaire est seul, et rien n'invite sans formule Pro). Les places ne sont pas la formule : un impayé garde les siennes. */
  function placesDe(id) {
    const a = stockage.abonnementLire(id);
    if (a && STATUTS_VIVANTS.includes(a.statut) && a.places > 0) return a.places;
    return toutOuvert ? Infinity : 0;
  }

  return { formuleDe, placesDe, toutOuvert: () => toutOuvert };
}

module.exports = { creerFormule, SURSIS_MS, STATUTS_PAYES, STATUTS_IMPAYES, STATUTS_VIVANTS };
