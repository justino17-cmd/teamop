/* ══ LE PLANIFICATEUR DE RAPPELS DES RÉUNIONS — UNE SEULE INSTANCE, UN RAPPEL UNE SEULE FOIS ═══════════════════════════════════════════════════
 *
 * Toutes les 10 à 15 secondes (`reunions.planificateurMs`), UNE instance du service regarde les réunions dont la prochaine occurrence commence dans les 27 heures qui viennent et envoie
 * les rappels dus : une notification dans l'application (le flux) et, si la personne est joignable, une notification push (le lot 3, charge minimale re-jugée à l'instant de partir).
 *
 *   · LE BAIL. Une ligne (`planif_bail`) dit quelle instance planifie. Prise ou renouvelée à chaque tour tant qu'elle est libre, expirée ou la nôtre ; un arrêt BRUTAL ne la rend pas, elle
 *     EXPIRE (`bailMs`) et la suivante la prend. Une seconde instance qui ne la tient pas ne fait rien — et si elle faisait quand même, le registre des rappels l'empêcherait de doubler.
 *   · UN RAPPEL PART UNE SEULE FOIS. Sa ligne au registre (`rappel`, clé : réunion, occurrence, personne, délai) et sa notification s'écrivent dans la MÊME transaction
 *     (`stockage.rappelEnvoyer`) : un arrêt entre les deux est impossible, un redémarrage ne renvoie rien, deux instances ne se doublent pas.
 *   · QUAND UN RAPPEL EST DÛ. Le rappel « N minutes avant » d'une occurrence est dû à `echeanceRappel` (5, 15 minutes et 1 heure sont des DURÉES exactes ; « 1 jour » est le même instant LOCAL la
 *     veille : ni 24 heures de trop ni de moins le jour d'un changement d'heure). Mais il n'est JAMAIS dû si son échéance précède le dernier moment où quelque chose le rendait caduc :
 *     le changement d'HORAIRE de la réunion (`horaire_le`), l'arrivée de la personne (`cree`), son propre réglage de rappels (`rappels_le`), ou la RESTAURATION d'une base (`rappels_depuis`,
 *     posé par `apresRestauration` : le registre de la copie date d'avant le sinistre, un rappel qui précède la restauration est tenu pour traité). Une réunion créée dix minutes avant son
 *     début n'envoie pas de rappel « 15 minutes avant ».
 *   · LE RATTRAPAGE A UN SENS, OU IL EST ABANDONNÉ. Un rappel dû que le service n'a pas pu envoyer (arrêté, bail perdu) part TOUJOURS s'il peut encore servir — l'occurrence n'a pas commencé —, et son
 *     texte dit CE QUI RESTE (« Commence dans 9 minutes »), pas le délai d'origine. Si l'occurrence a COMMENCÉ, il est ABANDONNÉ : jamais de rappel pour une réunion en cours ou finie. L'abandon est
 *     COMPTÉ et JOURNALISÉ (`rappel_abandonne`, un nombre), jamais silencieux. Plusieurs délais échus pour la même personne et la même occurrence font UNE notification.
 *   · LA PROCHAINE OCCURRENCE. `reunion.prochain` est l'index que ce module lit : il le recalcule à chaque passage (la première occurrence non commencée, d'après `calendrier.js`), et une réunion
 *     dont une occurrence a commencé pendant un arrêt passe à la suivante sans rien renvoyer pour la première.
 *   · LA SANTÉ (`sante()`, publiée dans /health) : des NOMBRES et un booléen — jamais une réunion, une personne, un titre. L'âge du dernier tour et le nombre de tours de suite en échec sont
 *     surveillés ; un rappel qui ne part plus se voit là.
 *   · LE REGISTRE NE GROSSIT PAS : chaque heure, les rappels des occurrences de plus de deux jours et les envois de courriel de plus de huit jours sont élagués.
 *
 * ⛔ LE TEXTE D'UN RAPPEL, UN TITRE, UN NOM n'entrent jamais dans un journal : `journaliser` ne reçoit que des nombres et des états. Les erreurs sont journalisées par leur NOM seulement.
 * ⛔ L'horloge est INJECTÉE (`horloge`) et `tour()` est synchrone : un banc le joue au geste, sans dormir.
 */
'use strict';
const crypto = require('crypto');
const cal = require('./calendrier');
const { serieDe, texteRappel, creerNotifieur } = require('./reunions-outils');

const HEURE = 3600000, JOUR = 86400000;
const HORIZON_MS = 27 * HEURE;            // « 1 jour avant » est au plus 25 heures le jour d'un changement d'heure ; une heure de marge
const PAR_TOUR = 500;                     // réunions LOINTAINES regardées par tour (celles qui commencent dans plus d'une heure : seuls les rappels « 1 jour avant » les concernent) ; le reste attend le tour suivant
const URGENT_MS = 65 * 60000;             // une réunion qui commence dans l'heure (le plus long des délais courts, plus cinq minutes de marge) est TOUJOURS regardée, quel que soit le nombre des autres
const OCCURRENCES_PAR_REUNION = 100;      // une série quotidienne arrêtée trois mois n'est pas parcourue en entier : sa prochaine occurrence est recalculée d'un trait
const ELAGAGE_PERIODE_MS = HEURE;
const RAPPELS_GARDES_MS = 2 * JOUR;       // un rappel d'une occurrence passée depuis plus de deux jours n'a plus rien à empêcher
const COURRIER_GARDE_MS = 8 * JOUR;       // le plus long plafond du courriel est de sept jours

function creerPlanificateur({ stockage, hub, config, horloge, journaliser, push, parTour }) {
  const cfg = config.reunions;
  const lot = Number.isInteger(parTour) && parTour >= 1 ? parTour : PAR_TOUR;
  const identite = 'pl-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  const notifieur = creerNotifieur({ stockage, hub, horloge, push });
  const etat = { actif: false, dernierTour: null, echecs: 0, abandonnes: 0, envoyes: 0, dernierElagage: 0, curseur: 0 };
  let minuteur = null, arrete = true;
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  const nomDe = (e) => (e && (e.code || e.name)) || 'Erreur';

  /* Le moment de la dernière restauration (0 : aucune) — un rappel dont l'échéance le précède est tenu pour traité. */
  function depuisRestauration() {
    const v = stockage.metaLire('rappels_depuis');
    const n = v === null || v === undefined ? 0 : parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }

  /* Une réunion : ses rappels dus à l'instant `t`, puis sa prochaine occurrence. */
  function traiter(id, t, depuis, bilan) {
    const r = stockage.reunionPlanif(id);
    if (!r) return;
    const serie = serieDe(r);
    /* depuis la prochaine occurrence ENREGISTRÉE (elle a pu commencer pendant un arrêt) jusqu'à l'horizon */
    const du = r.prochain !== null && r.prochain < t ? r.prochain : t;
    const occurrences = cal.occurrences(serie, du, t + HORIZON_MS + 1, OCCURRENCES_PAR_REUNION);
    const plancherReunion = Math.max(r.horaire_le, depuis);
    for (const o of occurrences) {
      for (const p of r.participants) {
        const avants = p.rappels !== null ? p.rappels : r.defaut;
        if (!avants.length) continue;
        const plancher = Math.max(plancherReunion, p.cree, p.rappels_le);
        const dus = [];
        for (const a of avants) {
          const echeance = cal.echeanceRappel(o.debut, a, r.tz);
          if (echeance < plancher || echeance > t) continue;                       // jamais dû, ou pas encore
          if (stockage.rappelDejaEnvoye(r.id, o.debut, p.uid, a)) continue;        // déjà parti
          dus.push(a);
        }
        if (!dus.length) continue;
        if (o.debut <= t) { bilan.abandonnes += dus.length; continue; }            // l'occurrence a COMMENCÉ : un rappel n'a plus de sens
        const texte = texteRappel(r, stockage.personneParId(p.uid), o.debut, t);
        const n = stockage.rappelEnvoyer({ reunion: r.id, occurrence: o.debut, uid: p.uid, avants: dus, titre: r.titre, texte, cible: r.id });
        if (!n) continue;                                                           // une autre instance, ou un tour d'avant, l'a déjà envoyé
        bilan.envoyes++;
        hub.reveiller({ uids: [p.uid] });
        notifieur.pousser({ uid: p.uid, type: 'reunion_rappel', reunion: r.id, titre: r.titre, texte, gid: n.gid, occurrence: o.debut });
      }
    }
    const suivante = cal.premiereApres(serie, t, true), prochain = suivante ? suivante.debut : null;
    if (prochain !== r.prochain) stockage.reunionProchainPoser(r.id, prochain);
  }

  /* UN TOUR. Synchrone, ne lève jamais. → { actif, reunions, envoyes, abandonnes } */
  function tour() {
    const t = horloge();
    const bilan = { actif: false, reunions: 0, envoyes: 0, abandonnes: 0 };
    let erreur = false;
    try {
      const avant = etat.actif;
      etat.actif = !!stockage.bailPrendre({ proprietaire: identite, ttlMs: cfg.bailMs });
      if (etat.actif !== avant) journal('planificateur', { etat: etat.actif ? 'actif' : 'perdu' });
      bilan.actif = etat.actif;
      if (etat.actif) {
        const depuis = depuisRestauration();
        /* Les réunions qui commencent dans l'heure sont TOUTES regardées à chaque tour (un rappel de 5 minutes ne tourne pas). Les plus lointaines (seuls leurs rappels « 1 jour avant » peuvent
           être dus) le sont PAR LOTS, en rotation : sans elle, les mêmes premières réunions occuperaient toujours la place et les suivantes n'auraient JAMAIS leur tour. */
        const urgentes = stockage.reunionsARappeler(t + URGENT_MS, 100000);
        const toutes = stockage.reunionsARappeler(t + HORIZON_MS, 100000);          // du plus proche au plus lointain : les urgentes en sont le début
        const lointaines = toutes.slice(urgentes.length);
        let regardees = urgentes;
        if (lointaines.length <= lot) { regardees = toutes; etat.curseur = 0; }
        else {
          const debut = etat.curseur < lointaines.length ? etat.curseur : 0;
          regardees = urgentes.concat(lointaines.slice(debut, debut + lot), lointaines.slice(0, Math.max(0, debut + lot - lointaines.length)));
          etat.curseur = (debut + lot) % lointaines.length;
        }
        for (const id of regardees) {
          bilan.reunions++;
          try { traiter(id, t, depuis, bilan); } catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }   // une réunion qui échoue n'arrête pas les autres
        }
        if (t - etat.dernierElagage >= ELAGAGE_PERIODE_MS) {
          try { stockage.rappelsElaguer(t - RAPPELS_GARDES_MS); stockage.courrierElaguer(t - COURRIER_GARDE_MS); etat.dernierElagage = t; }
          catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }
        }
      }
    } catch (e) { erreur = true; journal('planif_echec', { nom: nomDe(e) }); }
    etat.echecs = erreur ? etat.echecs + 1 : 0;
    etat.dernierTour = horloge();
    etat.abandonnes += bilan.abandonnes; etat.envoyes += bilan.envoyes;
    if (bilan.abandonnes) journal('rappel_abandonne', { n: bilan.abandonnes });   // abandonné, jamais en silence
    return bilan;
  }

  function planifier(delai) {
    if (arrete) return;
    minuteur = setTimeout(() => { tour(); planifier(cfg.planificateurMs); }, delai);
    if (minuteur.unref) minuteur.unref();
  }
  /* Démarre la boucle : un premier tour tout de suite (un redémarrage rattrape ce qu'un arrêt a laissé), puis un tour toutes les `planificateurMs`. */
  function demarrer() { if (!arrete) return; arrete = false; planifier(Math.min(1000, cfg.planificateurMs)); }
  /* Arrête la boucle et REND le bail : l'instance suivante n'attend pas son échéance. */
  function arreter() {
    arrete = true;
    if (minuteur) { clearTimeout(minuteur); minuteur = null; }
    try { stockage.bailRendre(identite); } catch (e) { /* la base est peut-être déjà fermée */ }
    etat.actif = false;
  }

  /* ⛔ /health : des nombres et un booléen — jamais une réunion, une personne, un titre. `ageS` : secondes depuis le dernier tour terminé (null : aucun encore). */
  function sante() {
    return {
      actif: etat.actif,
      ageS: etat.dernierTour === null ? null : Math.max(0, Math.round((horloge() - etat.dernierTour) / 1000)),
      echecs: etat.echecs,
      abandonnes: etat.abandonnes,
    };
  }

  return { tour, demarrer, arreter, sante, identite, etat };
}

module.exports = { creerPlanificateur, HORIZON_MS, PAR_TOUR, ELAGAGE_PERIODE_MS, RAPPELS_GARDES_MS, COURRIER_GARDE_MS };
