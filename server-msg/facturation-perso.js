/* ══ PERSO+ — L'ABONNEMENT D'UNE PERSONNE (STRIPE, LE MÊME CLIENT, LE MÊME COMPTE QUE MESSAGES PRO) ═══════════════════════════════════════════════
 *
 * Décision de Justin, 4 octobre 2026 : « Pour le public au niveau des forfaits je veux que ça soit comme WhatsApp : appel, message, appel vidéo. Pour tout ce qui est réunion, ce qu'on peut proposer pour ceux
 * qui le veulent et qui ne sont pas une entreprise : il paye un forfait à 5 € par mois. Comme ça on ne perd pas d'argent — offrir les réunions aux personnes publiques, ce serait idiot. »
 * Une PERSONNE (pas un espace) paie 5 € TTC par mois (50 € l'année : dix mois pour douze, comme Pro) et peut alors ORGANISER des réunions (`formule.js` : `peutOrganiser`). Rien d'une entreprise : canaux,
 * invitations, annuaire, administration restent Pro seul.
 *
 * Ce fichier est la moitié « personne » de `facturation.js` : il en reçoit le CLIENT STRIPE (`stripe`, le même, donc le même compteur de pannes — `stripeEchecMin` de /health), l'exclusion par clé et les lecteurs
 * d'identifiants, et ne les recopie pas. Il ne s'instancie que par `creerFacturation`.
 *
 *   offres()   etat(uid)    ce qui se vend, et ce que Stripe a dit de CETTE personne, SANS réseau        paiement()   une session de paiement Stripe Checkout (un seul siège)
 *   portail()  relire(uid)  le portail de facturation (carte, résiliation) · relire Stripe pour UNE personne   annulationsTraiter()   arrêter le renouvellement (suppression DEMANDÉE), le rétablir (demande
 *                                                                                                          ANNULÉE) ou résilier (compte EFFACÉ) l'abonnement d'une personne qui s'en va
 *
 * ⛔ LE CORPS D'UNE REQUÊTE NE DÉCIDE JAMAIS DE CE QUI A ÉTÉ PAYÉ (SERVEUR.md § 3.8, intact) :
 *   · le TARIF vient de la configuration (`facturation.perso.prix`, une liste blanche) — le corps ne nomme qu'un rythme (« mensuel », « annuel ») ; il n'y a pas de quantité (un seul siège) ;
 *   · la PERSONNE vient de la session (jamais du corps) ; Stripe la reçoit en `client_reference_id = opmsg-perso:<personne>` ET en métadonnées de l'abonnement, et NOUS le revérifions quand on relit ;
 *   · l'ABONNEMENT d'une personne est celui que la session de paiement que NOUS avons ouverte désigne — jamais un identifiant donné par la page ; son tarif doit être l'un des NÔTRES (un tarif de Messages
 *     Pro ne donne PAS Perso+ : les deux listes sont disjointes, la configuration le refuse) ;
 *   · l'ÉTAT (payé, en retard) est celui que Stripe a dit à la dernière lecture : `formule.js` le lit dans la base, jamais dans une requête.
 * ⛔ LES ABONNEMENTS DE CE COMPTE STRIPE SONT PARTAGÉS avec OP GESTION, qui lit TOUTE la liste : un abonnement Perso+ ne porte donc JAMAIS la métadonnée `espace` (celle qu'OP GESTION lit pour rattacher un
 *   abonnement à une entreprise) — la nôtre s'appelle `opmsg_personne` — et son produit doit s'appeler « … messages … » (`configurer-stripe.js` le crée ainsi et REFUSE un autre nom) : alors OP GESTION le range
 *   en « OP MESSAGES » et aucune de ses décisions ne le lit (`tests/test-965.js`).
 * ⛔ QUI DEMANDE À PARTIR N'EST PLUS PRÉLEVÉ, ET QUI EST EFFACÉ N'EST PLUS ABONNÉ (Justin, 4 octobre 2026 : « le prélever pendant les quatorze jours est injuste, et appelle les contestations de paiement ») :
 *   à la DEMANDE de suppression, l'abonnement cesse de se renouveler chez Stripe (`cancel_at_period_end = true` : l'accès reste jusqu'à la fin de la période payée ou de l'effacement) ; si la personne ANNULE sa
 *   demande (elle se reconnecte), le renouvellement REVIENT — sauf si elle l'avait elle-même arrêté avant, par le portail : on ne réactive jamais ce qu'une personne a coupé elle-même ; à l'EFFACEMENT, résiliation
 *   immédiate. `stockage.js` NOTE chaque intention dans la transaction du geste (`abonnement_a_annuler`), ce fichier la FAIT chez Stripe et la REJOUE jusqu'à la confirmation. Un échec de Stripe se note
 *   (`essais`, `dernier`) et se rejoue au passage suivant ; il ne se perd pas, et `annulationAttenteMin` (/health) en dit l'AGE — jamais le nombre, jamais lequel. Une intention se confirme par Stripe
 *   (le drapeau lu sur l'abonnement rendu, `canceled`, ou une absence CONFIRMÉE), jamais par un silence.
 * ⛔ UNE PANNE NE SUSPEND PERSONNE : Stripe muet, clé refusée, réponse illisible — l'état connu reste (un abonnement payé reste payé jusqu'à une lecture qui dit le contraire).
 * Sans clé Stripe, ou sans tarif Perso+, tout est INERTE et le dit (503 `abonnement_non_ouvert`).
 */
'use strict';
const { NOM_PERSO_PLUS, FORMULES_ORGANISATEUR, STATUTS_IMPAYES } = require('./formule');

const REF = 'opmsg-perso:';
const ID_PERSONNE = /^p_[0-9a-f]{32}$/;

function creerPerso(b) {
  const { stockage, cfg, formule, journaliser, stripe, exclusif, id, url, erreur, absenceConfirmee, noterEchec, echecActif, ID_SESSION, ID_ABO, ID_CLIENT, STATUTS_FINAUX, PANNES } = b;
  /* la configuration validée (`facturationConfig`) porte toujours `perso` ; un banc qui bâtit la sienne à la main n'en a pas — Perso+ y est alors inerte, comme sans tarif */
  const P = cfg.perso || { prix: {}, affichage: { mensuel: 5, annuel: 50 } };
  const PRIX = Object.values(P.prix);
  const ouvert = () => !!cfg.cle && PRIX.length > 0;
  const defaut = P.prix.mensuel ? 'mensuel' : 'annuel';
  const enCours = new Map();                     // personne → la relecture en cours (deux relectures de suite se partagent la même)
  let traitement = null;                         // la file de ce qu'il reste à faire chez Stripe, en cours de traitement (une passe à la fois)
  let relance = false;                           // un geste est arrivé PENDANT la passe : elle recommence quand elle a fini

  /* ── ce que Stripe dit d'un abonnement, ramené à ce qu'on range — ou `null` s'il n'est PAS le nôtre ──
     Il est le nôtre si la métadonnée que NOUS y avons gravée désigne cette personne ET qu'au moins une de ses lignes est un tarif Perso+ de la liste blanche. Une ligne d'un autre produit ne donne rien. */
  function lireAbonnement(sb, uid) {
    if (!sb || sb.object !== 'subscription' || !ID_ABO.test(String(sb.id))) return null;
    if (!sb.metadata || sb.metadata.opmsg_personne !== uid || sb.metadata.produit !== 'opmsg') return null;
    const lignes = sb.items && Array.isArray(sb.items.data) ? sb.items.data : [];
    const nos = lignes.filter(it => it && it.price && PRIX.includes(id(it.price)));
    if (!nos.length) return null;
    const fin = Number.isFinite(sb.current_period_end) ? sb.current_period_end : (Number.isFinite(nos[0].current_period_end) ? nos[0].current_period_end : null);
    const client = id(sb.customer);
    return { client: ID_CLIENT.test(client) ? client : null, abonnement: sb.id, statut: String(sb.status || ''), fin_periode: fin === null ? null : fin * 1000, annule: sb.cancel_at_period_end === true };
  }

  /* ── relire une personne : la session de paiement ouverte par NOUS, puis l'abonnement connu (la MÊME marche que pour un espace, sans les places) ── */
  async function relireImpl(uid) {
    let a = stockage.abonnementPersoLire(uid), adopte = false;
    if (a && a.session) {
      const sid0 = a.session, oublier = () => stockage.abonnementPersoSessionOubliee(uid, sid0);
      if (!ID_SESSION.test(sid0)) oublier();
      else {
        let cs; try { cs = await stripe('GET', '/v1/checkout/sessions/' + sid0); } catch (e) { if (e.code === 'introuvable') { oublier(); cs = null; } else throw e; }
        if (cs && cs.status === 'expired') oublier();
        else if (cs && cs.status === 'complete') {
          const sid = id(cs.subscription);
          if (cs.mode !== 'subscription' || cs.client_reference_id !== REF + uid || !ID_ABO.test(sid)) { oublier(); journaliser('facturation', { motif: 'session_incoherente' }); }
          else {
            let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + sid); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }
            const l = lireAbonnement(sb, uid);
            if (!l) { oublier(); journaliser('facturation', { motif: 'abonnement_non_reconnu' }); }
            else { stockage.abonnementPersoPoser(uid, l, { adopter: true }); adopte = true; journaliser('facturation', { etat: 'adopte' }); }
          }
        }
      }
      a = stockage.abonnementPersoLire(uid);
    }
    if (a && a.abonnement && !adopte && !STATUTS_FINAUX.includes(a.statut)) {
      if (!ID_ABO.test(a.abonnement)) return;
      let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + a.abonnement); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }
      if (sb === null) {
        if (await absenceConfirmee(a)) stockage.abonnementPersoPoser(uid, { client: a.client, abonnement: a.abonnement, statut: 'canceled', fin_periode: a.fin_periode, annule: false });
        else { noterEchec('abonnement_introuvable'); journaliser('facturation', { motif: 'abonnement_introuvable' }); }       // absence non confirmée : le dernier état connu reste, et la surveillance le voit venir
      } else {
        const l = lireAbonnement(sb, uid);
        if (l) stockage.abonnementPersoPoser(uid, l);
        else journaliser('facturation', { motif: 'abonnement_non_reconnu' });                                                 // plus reconnu comme le nôtre : on garde le dernier état, on ne le dit pas « résilié »
      }
    }
    /* ⛔ LA DEMANDE DE SUPPRESSION SUIT L'ABONNEMENT QU'ON VIENT DE LIRE : un paiement reconnu APRÈS la demande reçoit son arrêt de renouvellement à ce moment-là, et un renouvellement que Stripe dit rétabli malgré la
       demande (la personne l'a remis par le portail, ou le paiement n'a abouti que plus tard) est refait. Idempotent : sans demande en cours, ou déjà faite, rien ne change. */
    const voulu = stockage.persoAjuster(uid);
    if (voulu === 'fin' || voulu === 'renouveler') annulationsTraiter();                                                   // (ne rejette jamais : voir plus bas)
    /* ⛔ UN COMPTE DÉJÀ EFFACÉ dont le paiement n'est reconnu qu'APRÈS (la session était restée ouverte) : son abonnement ne doit pas courir — il passe à l'annulation, et la ligne s'en va avec. */
    const p = stockage.personneParId(uid);
    if (p && p.etat === 'supprime') { stockage.abonnementPersoOrphelin(uid); annulationsTraiter(); }                // (ne rejette jamais : voir plus bas)
  }
  function relire(uid) {
    if (!ouvert()) return Promise.reject(erreur('abonnement_non_ouvert'));
    if (enCours.has(uid)) return enCours.get(uid);
    const p = exclusif(uid, () => relireImpl(uid)).then(() => etat(uid)).finally(() => { enCours.delete(uid); });
    enCours.set(uid, p);
    return p;
  }
  /* la passe de relecture (dix minutes) lit ces personnes, une à une ; `facturation.js` la mène avec celle des espaces */
  const aRelire = (limite) => stockage.abonnementsPersoARelire(limite);

  /* ── ce que l'écran montre : l'état LOCAL (dernier dit par Stripe), sans réseau ──
     `formule` est l'EFFECTIVE (la bêta ouvre tout) ; `inclus_par_pro` se juge sur le RÉEL : une personne dont l'espace est Pro n'a pas besoin de Perso+, et la page ne lui montre jamais de prix. */
  function etat(uid) {
    const a = stockage.abonnementPersoLire(uid), v = formule.formuleDe({ personne: uid }), r = formule.formuleDe({ personne: uid, reel: true });
    return {
      nom: NOM_PERSO_PLUS, ouvert: ouvert(), mode: cfg.mode, tout_ouvert: formule.toutOuvert(),
      formule: v.formule, organiser: FORMULES_ORGANISATEUR.includes(v.formule), inclus_par_pro: r.formule === 'pro',
      abonnement: a && a.abonnement ? { statut: a.statut, fin_periode: a.fin_periode, annule: a.annule, relu_le: a.relu_le } : null,
      impaye: !!(a && a.abonnement && STATUTS_IMPAYES.includes(a.statut)),
      paiement_en_attente: !!(a && a.session),      // une session NON RÉSOLUE : quel que soit son âge, on ne sait pas si elle a été payée
      stripe_muet: echecActif(),
      defaut: ouvert() ? defaut : null,
      offres: ouvert() ? Object.keys(P.prix).map(k => ({ id: k, par: k === 'annuel' ? 'an' : 'mois', euros: P.affichage[k] })) : [],
    };
  }

  /* Le portail de facturation : changer la carte, résilier. Il faut un client Stripe (donc un paiement déjà fait). */
  async function portail({ personne, origine }) {
    if (!ouvert()) throw erreur('abonnement_non_ouvert');
    const a = stockage.abonnementPersoLire(personne);
    if (!a || !a.client || !ID_CLIENT.test(a.client)) throw erreur('pas_d_abonnement');
    const ps = await stripe('POST', '/v1/billing_portal/sessions', [['customer', a.client], ['return_url', origine + '/?abo=portail&p=1#reglages/entreprise']]);
    const u = url(ps.url);
    if (!u) throw erreur('reponse_illisible');
    return { url: u };
  }

  /* Une session de paiement pour CETTE personne. `adresse` : son adresse confirmée (ou null — un compte par numéro n'en a pas : Checkout la demande lui-même, et un reçu ne part pas « à personne »).
     ⛔ SOUS LE VERROU DE LA PERSONNE (`exclusif`) : deux « payer » en même temps ouvriraient deux sessions pour une seule retenue. ⛔ UNE SESSION ENCORE RANGÉE SE RELIT AVANT D'EN OUVRIR UNE AUTRE, quel âge
     qu'elle ait : ouverte, on la réutilise ; terminée, elle devient l'abonnement ; expirée ou inconnue, on en ouvre une neuve. ⛔ UN SEUL ABONNEMENT VIVANT : s'il y en a un, `abonnement_existant` AVEC le lien du
     portail. ⛔ QUI A DÉJÀ PRO (un espace payé) n'a pas besoin de Perso+ : `formule_deja_incluse`, rien n'est ouvert chez Stripe (le RÉEL, pas la bêta : sinon le paiement ne s'essaierait jamais). */
  async function paiement({ personne, cycle, origine, adresse }) {
    if (!ouvert()) throw erreur('abonnement_non_ouvert');
    const rythme = cycle === undefined ? defaut : cycle;
    if (typeof rythme !== 'string' || !Object.hasOwn(P.prix, rythme)) throw erreur('offre_inconnue');     // ⛔ `Object.hasOwn` : « constructor » ou « __proto__ » ne sont pas des tarifs
    return exclusif(personne, async () => {
      let a = stockage.abonnementPersoLire(personne);
      const existe = (x) => !!(x && x.abonnement && !STATUTS_FINAUX.includes(x.statut));
      const dejaAbonne = async () => {
        let lien = null; try { lien = (await portail({ personne, origine })).url; } catch (e) { lien = null; }
        throw erreur('abonnement_existant', { portail: lien });
      };
      if (existe(a)) {
        try { await relireImpl(personne); } catch (e) { /* Stripe muet : on se fie à ce qu'on sait */ }
        a = stockage.abonnementPersoLire(personne);
        if (existe(a)) await dejaAbonne();
      }
      if (formule.formuleDe({ personne, reel: true }).formule === 'pro') throw erreur('formule_deja_incluse');
      if (a && a.session) {
        if (ID_SESSION.test(a.session)) {
          let cs = null; try { cs = await stripe('GET', '/v1/checkout/sessions/' + a.session); } catch (e) { if (e.code !== 'introuvable') throw e; }
          if (cs && cs.status === 'open' && url(cs.url) && cs.client_reference_id === REF + personne) return { url: cs.url, reprise: true };
          if (cs && cs.status === 'complete') {
            await relireImpl(personne); a = stockage.abonnementPersoLire(personne);
            if (existe(a)) await dejaAbonne();
          } else if (cs && cs.status !== 'expired' && cs.status !== 'open') throw erreur('reponse_illisible');   // un état que Stripe ne connaît pas : on ne remplace pas une session dont on ne sait rien
        }
      }
      const paires = [
        ['mode', 'subscription'],
        ['line_items[0][price]', P.prix[rythme]], ['line_items[0][quantity]', '1'],
        ['client_reference_id', REF + personne],
        ['metadata[produit]', 'opmsg'], ['metadata[opmsg_personne]', personne],
        ['subscription_data[metadata][produit]', 'opmsg'], ['subscription_data[metadata][opmsg_personne]', personne],
        ['success_url', origine + '/?abo=retour&p=1#reglages/entreprise'], ['cancel_url', origine + '/?abo=annule&p=1#reglages/entreprise'],
        ['locale', 'fr'],
      ];
      if (adresse) paires.push(['customer_email', adresse]);
      const cs = await stripe('POST', '/v1/checkout/sessions', paires);
      const u = url(cs.url);
      if (!ID_SESSION.test(String(cs.id)) || !u) throw erreur('reponse_illisible');
      stockage.abonnementPersoSession(personne, cs.id);
      return { url: u };
    });
  }

  /* ── CE QU'IL RESTE À FAIRE CHEZ STRIPE QUAND UNE PERSONNE S'EN VA ─────────────────────────────────────────────────────────────────────────────────────────────
     Trois intentions, rangées par `stockage.js` dans la transaction du geste de la personne (voir `persoAjuster`) et FAITES ici, une par abonnement :
       · `fin`        (elle a DEMANDÉ la suppression de son compte) : l'abonnement cesse de se renouveler — `cancel_at_period_end = true` ; l'accès reste jusqu'à la fin de la période payée ou de l'effacement ;
       · `renouveler` (elle a ANNULÉ sa demande)                    : le renouvellement revient — `cancel_at_period_end = false` — SEULEMENT si c'est NOUS qui l'avions arrêté : ce que la personne a coupé
                                                                      elle-même (par le portail) AVANT sa demande ne se réactive JAMAIS ;
       · `resilier`   (le compte est EFFACÉ)                        : résiliation immédiate (DELETE), terminale.
     ⛔ L'ÉTAT D'AVANT SE LIT CHEZ STRIPE (`cancel_at_period_end` de l'abonnement VIVANT, pas ce que la base crut un jour) et se RANGE AVANT d'y toucher (`annulationMemoriser`) : un arrêt entre l'appel et sa confirmation
     n'oublie pas que le geste est le nôtre. ⛔ L'intention se redemande juste avant d'écrire (`annulationEncore`) : la personne a pu changer d'avis pendant la lecture.
     Une intention est CONFIRMÉE par la réponse de Stripe (le drapeau lu sur l'abonnement rendu, ou `canceled`), ou parce que l'abonnement est FINI (absence CONFIRMÉE comprise : `absenceConfirmee`, le client existe et
     la liste ne contient pas l'abonnement), jamais par un silence. ⛔ Avant d'écrire on RELIT l'abonnement et on vérifie qu'il est bien le nôtre (produit « opmsg », une personne désignée) : on ne touche jamais,
     depuis ce fichier, à l'abonnement d'un autre service du même compte Stripe. Un abonnement qu'on ne reconnaît pas reste dans la file — et c'est `annulationAttenteMin` qui crie, plutôt qu'un geste fait à l'aveugle.
     Chaque appel qui échoue se NOTE (`essais`, `dernier`) et se rejoue au passage suivant : rien ne se perd. */
  async function appliquer(x) {
    if (!ID_ABO.test(String(x.abonnement))) return 'fini';
    let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + x.abonnement); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }
    if (sb === null) {
      if (await absenceConfirmee({ client: x.client, abonnement: x.abonnement })) return 'fini';
      throw erreur('abonnement_introuvable');
    }
    if (STATUTS_FINAUX.includes(sb.status)) return 'fini';
    if (!sb.metadata || sb.metadata.produit !== 'opmsg' || !ID_PERSONNE.test(String(sb.metadata.opmsg_personne))) { journaliser('facturation', { motif: 'annulation_non_reconnue' }); throw erreur('abonnement_non_reconnu'); }
    if (x.voulu === 'resilier') {
      const r = await stripe('DELETE', '/v1/subscriptions/' + x.abonnement);
      if (!r || (r.status !== 'canceled' && r.status !== 'incomplete_expired')) throw erreur('reponse_illisible');
      return 'fait';
    }
    /* un paiement qui n'a pas abouti (`incomplete`) ne se renouvelle pas : Stripe l'expire seul sous vingt-quatre heures. Rien à arrêter, rien à rétablir — s'il aboutit plus tard, la relecture le voit se
       renouveler (`annule` faux) et remet l'intention à faire (`persoAjuster`). */
    if (sb.status === 'incomplete') return 'fait';
    const vif = sb.cancel_at_period_end === true;           // le renouvellement est-il arrêté chez Stripe, MAINTENANT ?
    if (x.voulu === 'fin') {
      if (vif) {                                              // déjà arrêté : par nous (un appel précédent dont la confirmation s'est perdue : `touche`), sinon par la personne — qui ne perd rien
        if (x.avant === null && !x.touche && !stockage.annulationMemoriser(x.abonnement, 'fin', { avant: 1, touche: 0 })) return 'change';
        return 'fait';
      }
      if (!stockage.annulationMemoriser(x.abonnement, 'fin', { avant: 0, touche: 1 })) return 'change';          // ⛔ AVANT de toucher : il se renouvelait, et c'est nous qui l'arrêtons
      const r = await stripe('POST', '/v1/subscriptions/' + x.abonnement, [['cancel_at_period_end', 'true']]);
      if (!r || r.cancel_at_period_end !== true) throw erreur('reponse_illisible');
      return 'fait';
    }
    /* renouveler : seulement ce que NOUS avons arrêté, et seulement s'il l'est encore */
    if (!x.touche || x.avant === 1 || !vif) return 'fait';
    if (!stockage.annulationEncore(x.abonnement, 'renouveler')) return 'change';
    const r = await stripe('POST', '/v1/subscriptions/' + x.abonnement, [['cancel_at_period_end', 'false']]);
    if (!r || r.cancel_at_period_end !== false) throw erreur('reponse_illisible');
    return 'fait';
  }
  const ETAT_JOURNAL = { fin: 'renouvellement_arrete', renouveler: 'renouvellement_retabli', resilier: 'annulee' };
  /* Une passe sur ce qui attend Stripe. Stripe qui ne répond pas arrête la passe après trois échecs de suite. */
  async function passe() {
    let faites = 0, ratees = 0, suite = 0, arret = false;
    for (const instantane of stockage.annulationsDues(50)) {
      const x = stockage.annulationLire(instantane.abonnement);   // la ligne d'AUJOURD'HUI : la personne a pu changer d'avis depuis le début de la passe
      if (!x || x.fait) continue;
      try {
        const v = await appliquer(x);
        if (v === 'change') continue;                          // la personne a changé d'avis pendant l'appel : l'intention neuve est reprise (passe suivante)
        stockage.annulationFaite(x.abonnement, x.voulu, { fini: v === 'fini' }); faites++; suite = 0; journaliser('facturation', { etat: ETAT_JOURNAL[x.voulu] });
      } catch (e) {
        stockage.annulationEchec(x.abonnement); ratees++;
        if (!PANNES.includes(e && e.code)) journaliser('stripe_echec', { motif: 'annulation' });
        if (PANNES.includes(e && e.code) && ++suite >= 3) { arret = true; break; }
      }
    }
    return { faites, ratees, arret };
  }
  /* Traite la file : une passe à la fois (le balayeur qui vient d'effacer un compte, la demande d'une personne et la passe des dix minutes se partagent la même). Un geste qui arrive PENDANT une passe la fait
     recommencer une fois qu'elle a fini (`relance`) — il n'attend pas dix minutes. */
  function annulationsTraiter() {
    if (traitement) { relance = true; return traitement; }
    if (!cfg.cle) return Promise.resolve({ faites: 0, ratees: 0, inerte: true });
    traitement = (async () => {
      let faites = 0, ratees = 0;
      /* ⛔ ne rejette JAMAIS : un rejet perdu ferait sortir le processus (`index.js`), et la file se relit de toute façon au passage suivant */
      try {
        do {
          relance = false;
          const r = await passe(); faites += r.faites; ratees += r.ratees;
          if (r.arret) break;                                  // Stripe est muet : on ne s'acharne pas, la passe des dix minutes reprendra
        } while (relance);
      } catch (e) { journaliser('stripe_echec', { motif: 'annulation_file' }); }
      finally { traitement = null; relance = false; }          // ⛔ dans le MÊME pas que le dernier test de `relance` : un geste qui arrive juste après démarre sa propre passe, il ne s'accroche pas à celle qui finit
      return { faites, ratees };
    })();
    return traitement;
  }
  /* minutes depuis lesquelles un geste attend Stripe (0 : aucun) — c'est `facturation.annulationAttenteMin` de /health, que la surveillance lit. Un AGE, jamais un nombre, un genre ni un identifiant. */
  function attenteMin(maintenant) {
    const d = stockage.annulationPlusAncienne();
    return d === null ? 0 : Math.max(0, Math.floor((maintenant - d) / 60000));
  }

  return { ouvert, etat, portail, paiement, relire, aRelire, annulationsTraiter, attenteMin, lireAbonnement };
}

module.exports = { creerPerso, REF };
