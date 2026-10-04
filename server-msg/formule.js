/* ══ LA FORMULE — UNE SEULE FONCTION DÉCIDE : PERSO, PERSO+, PRO, OU IMPAYÉ ═══════════════════════════════════════════════════════════
 *
 * Messages Pro est un abonnement PAR ESPACE (une entreprise, toutes ses places dans un seul abonnement). `formuleDe` est la SEULE fonction qui dise ce qu'une
 * personne ou un espace a le droit de faire ; le garde `PRO` des routes, la liste des espaces, l'état de l'abonnement et les places la LISENT, aucune ne la recopie.
 * Les lots suivants (réunions programmées, appels de groupe) viendront y lire leur droit au même endroit : ce fichier est le point de décision unique.
 *
 *   formuleDe({ espace })    → la formule d'UN espace
 *   formuleDe({ personne })  → la meilleure formule de la personne : ses espaces (administrateur ou non : une place payée vaut Pro pour son titulaire) ET son abonnement PERSONNEL (Perso+)
 *   peutOrganiser(uid)       → { ok, formule, raison? } : la personne peut-elle ORGANISER (programmer une réunion, tenir les outils de l'organisateur) ? Pro OU Perso+ — l'UNIQUE définition
 *   → { formule: 'pro' | 'perso_plus' | 'perso' | 'impaye', motif, sursis_jusqua?, origine? }
 *
 *   · 'pro'     un abonnement PAYÉ (Stripe dit `active` ou `trialing`, rien d'autre), ou un impayé encore dans ses sept jours de sursis (motif `sursis`) ;
 *   · 'impaye'  `past_due` ou `unpaid` depuis plus de sept jours : seules les fonctions Pro refusent (créer un espace, un canal, inviter), l'historique et tout le reste de
 *               la messagerie continuent, rien n'est effacé ;
 *   · 'perso'   aucun abonnement vivant (jamais abonné, résilié, paiement jamais abouti) ;
 *   · 'perso_plus'  un abonnement PERSONNEL payé (Stripe dit `active` ou `trialing`) : une PERSONNE, sans espace d'entreprise — tout le Perso, plus les RÉUNIONS (les créer, les programmer, tenir les outils de
 *               l'organisateur). Perso+ n'ouvre AUCUNE fonction d'entreprise (canaux, invitations, annuaire, administration) : celles-là restent `pro`, qui comprend tout ce que Perso+ ouvre.
 *               Un abonnement personnel en retard (`past_due`, `unpaid`) est un `impaye` d'origine `perso_plus`, SANS sursis : pas d'organisation tant que ce n'est pas réglé (le reste de la messagerie continue).
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
/* ⛔ LE LIBELLÉ DU FORFAIT PERSONNEL : un seul endroit. Le nom est PROVISOIRE (« Perso+ ») : la page le lit du service (`/api/moi/perso-plus`), jamais recopié ; renommer ici suffit à l'écran.
   (Le nom du PRODUIT chez Stripe, lui, se règle à la création des tarifs — `configurer-stripe.js` — et doit contenir « messages », voir `facturation.js`.) */
const NOM_PERSO_PLUS = 'Perso+';
const RANG = { perso: 0, impaye: 1, perso_plus: 2, pro: 3 };
/* ce qui ouvre l'ORGANISATION d'une réunion : Pro, ou Perso+ — jamais « impaye », jamais « perso » */
const FORMULES_ORGANISATEUR = ['pro', 'perso_plus'];
/* ⛔ UNE RÉUNION COMPTE AU PLUS DIX PERSONNES, ORGANISATEUR COMPRIS — Perso+ comme Pro (Justin, 4 octobre 2026). C'est UNE constante, lue par le service (les invitations, l'entrée par le lien) et publiée à la page
   (`/api/config`, `limites.reunion_personnes`) : aucune autre copie du nombre. Perso+ s'arrête à 10, sans supplément possible. ⚠️ Ce n'est PAS la capacité de la salle : sans serveur de visio, une salle tient quatre
   personnes en vidéo et six en audio (`appels.capaciteDe`, SERVEUR.md § 5) — dix est le nombre de PERSONNES d'une réunion (invités compris), jamais une promesse de salle. Un appel de GROUPE n'est pas concerné. */
const REUNION_PERSONNES_MAX = 10;

function creerFormule({ stockage, config }) {
  const toutOuvert = !!(config && config.formule && config.formule.toutOuvert === true);   // ⛔ le drapeau : lu ICI

  /* `reel` : la formule SANS le drapeau de la bêta — ce que Stripe et la base disent. La bêta ouvre tout pour qu'on puisse tout éprouver ; mais refuser un second paiement à qui a déjà Pro se juge sur le RÉEL,
     sinon le paiement de Perso+ ne s'essaierait jamais sur la bêta (tout y est « déjà Pro »). */
  function deEspace(id, reel) {
    if (toutOuvert && !reel) return { formule: 'pro', motif: 'beta' };
    const a = stockage.abonnementLire(id);
    if (!a || !STATUTS_VIVANTS.includes(a.statut)) return { formule: 'perso', motif: 'aucun' };
    if (STATUTS_PAYES.includes(a.statut)) return { formule: 'pro', motif: 'abonne' };
    /* un impayé : le sursis part de la première lecture, et ne se constate que par une lecture faite APRÈS lui */
    if (a.impaye_depuis !== null && a.relu_le !== null && a.relu_le - a.impaye_depuis >= SURSIS_MS) return { formule: 'impaye', motif: 'impaye' };
    return { formule: 'pro', motif: 'sursis', sursis_jusqua: a.impaye_depuis !== null ? a.impaye_depuis + SURSIS_MS : null };
  }

  /* L'abonnement PERSONNEL (Perso+), tel que Stripe l'a dit. ⛔ Payé = `active` ou `trialing`, et c'est tout. En retard (`past_due`, `unpaid`) : `impaye`, SANS sursis — « pas d'organisation » : une
     personne qui organise des réunions sans que son paiement passe ne les paie pas. Rien d'autre n'est retiré (la messagerie, les appels, les réunions où l'on est invité). */
  function dePersonnelle(uid) {
    const a = stockage.abonnementPersoLire(uid);
    if (!a || !STATUTS_VIVANTS.includes(a.statut)) return { formule: 'perso', motif: 'aucun' };
    if (STATUTS_PAYES.includes(a.statut)) return { formule: 'perso_plus', motif: 'abonne', origine: 'perso_plus' };
    return { formule: 'impaye', motif: 'impaye', origine: 'perso_plus' };
  }
  function dePersonne(uid, reel) {
    if (toutOuvert && !reel) return { formule: 'pro', motif: 'beta' };
    let meilleur = { formule: 'perso', motif: 'aucun' };
    for (const e of stockage.espacesIds(uid)) {
      const v = deEspace(e, reel);
      if (RANG[v.formule] > RANG[meilleur.formule]) meilleur = v;
      if (meilleur.formule === 'pro') break;
    }
    if (meilleur.formule !== 'pro') {
      const p = dePersonnelle(uid);
      if (RANG[p.formule] > RANG[meilleur.formule]) meilleur = p;
    }
    return meilleur;
  }
  /* ⛔ ORGANISER : Pro OU Perso+. `raison` dit POURQUOI pas, à la personne qui est concernée (c'est SA formule, pas celle d'un espace qu'elle ne gère pas) : « impaye » quand c'est SON abonnement
     personnel qui est en retard, « perso » sinon. Jugé sur la formule EFFECTIVE (la bêta ouvre tout). */
  function peutOrganiser(uid) {
    const v = dePersonne(uid, false);
    if (FORMULES_ORGANISATEUR.includes(v.formule)) return { ok: true, formule: v.formule, motif: v.motif };
    return { ok: false, formule: v.formule, motif: v.motif, raison: dePersonnelle(uid).formule === 'impaye' ? 'impaye' : 'perso' };
  }

  /* LA fonction. Un sujet qui n'est ni un espace ni une personne est une erreur de code, jamais un « perso » silencieux. */
  function formuleDe(sujet) {
    if (sujet && typeof sujet.espace === 'string') return deEspace(sujet.espace, sujet.reel === true);
    if (sujet && typeof sujet.personne === 'string') return dePersonne(sujet.personne, sujet.reel === true);
    throw new Error('formuleDe : un espace ou une personne');
  }

  /* ⛔ L'ENDROIT où le supplément « Grandes réunions » (Pro : 29 € par mois et par ENTREPRISE, jusqu'à 300 personnes, 4 grandes réunions par mois — OFFRE-PRO.md § 3) lèvera le plafond d'une réunion, le jour où il
     existera. ⛔ IL N'EST PAS ACTIVÉ ET NE SE VEND PAS : sans serveur de visio (LiveKit), une réunion tient 4 en vidéo et 6 en audio, dépasser dix est impossible, et vendre ce qu'on ne tient pas est interdit — pas de
     tarif Stripe, pas de route d'achat, pas de bouton. Cette fonction rend donc DIX pour tout le monde ; le jour venu, elle lira l'entreprise de l'organisateur (`organisateur`) et le supplément qu'elle a payé, ICI et
     nulle part ailleurs : les routes ne comparent jamais à la constante, elles demandent à cette fonction. */
  function plafondReunion(organisateur) {
    void organisateur;
    return REUNION_PERSONNES_MAX;
  }

  /* Les places d'un espace : ce que Stripe a dit (le nombre de places PAYÉES) tant que l'abonnement vit ; sans abonnement, la bêta n'en compte pas (tout est ouvert : `Infinity`),
     et ailleurs il n'y en a aucune (le propriétaire est seul, et rien n'invite sans formule Pro). Les places ne sont pas la formule : un impayé garde les siennes. */
  function placesDe(id) {
    const a = stockage.abonnementLire(id);
    if (a && STATUTS_VIVANTS.includes(a.statut) && a.places > 0) return a.places;
    return toutOuvert ? Infinity : 0;
  }

  /* ⛔ DES PLACES BAISSÉES SOUS LE NOMBRE DE MEMBRES NE RETIRENT PERSONNE (relecture du gardien, 3 octobre 2026) : le portail de Stripe change la quantité sans rien savoir de nos membres, et la
     conception avait écrit le contraire (« une baisse ne descend jamais sous le nombre de membres »). Le service ne retire donc personne — retirer quelqu'un sans que personne l'ait demandé serait
     pire — ; les liens d'invitation s'arrêtent (plus de place), tous les membres gardent leur accès, et l'ADMINISTRATEUR est prévenu, chiffres à l'appui (« 5 membres pour 3 places »).
     Cette fonction dit si c'est le cas : un abonnement qui VIT (payé ou en retard) dont les places sont inférieures au nombre de membres. Une seule définition, lue par l'état de l'abonnement
     ET par la fiche de l'espace — deux écrans qui calculeraient chacun le leur finiraient par se contredire. La frontière est STRICTE : autant de places que de membres, ce n'est pas un dépassement
     (c'est « complet »). Sans abonnement vivant (jamais abonné, résilié, la bêta qui ne compte pas) il n'y a pas de place payée à dépasser. */
  function placesDepassees(id, membres) {
    const a = stockage.abonnementLire(id);
    return !!(a && STATUTS_VIVANTS.includes(a.statut) && a.places > 0 && membres > a.places);
  }

  return { formuleDe, peutOrganiser, plafondReunion, placesDe, placesDepassees, toutOuvert: () => toutOuvert };
}

module.exports = { creerFormule, SURSIS_MS, STATUTS_PAYES, STATUTS_IMPAYES, STATUTS_VIVANTS, NOM_PERSO_PLUS, FORMULES_ORGANISATEUR, REUNION_PERSONNES_MAX };
