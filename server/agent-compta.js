/* MARGAUX, COMPTABLE DE LA TOUR — ÉTAPE 1 : le point de l'argent, les factures Stripe vérifiées, le calendrier de la loi, les réglages de Justin (28 octobre 2026).
 *
 * Justin : « je veux un agent pro pour les devis, les factures et la compta — pour moi, pour la Tour, pas pour OP GESTION ». Margaux garde son nom, son fil, sa signature et ses relances : elle gagne
 * QUATRE outils fermés (`point_compta`, `verifier_factures`, `calendrier_compta`, `regler_compta`) et des rappels. Rien d'autre : aucun PDF, aucune pièce jointe, aucun courrier, aucun droit Stripe de plus.
 *
 * Chaque règle ci-dessous est dans le CODE, et `tests/test-3160.js` à `test-3164.js` tombent si on la retire :
 *   · ⛔ UN OUTIL N'AGIT QUE SUR UN MESSAGE DE JUSTIN, DANS LE FIL PRIVÉ DE MARGAUX (`c.de === 'justin'`, `c.fil === 'margaux'`). Un collègue (Victor, Camille…) qui la réveille n'obtient rien ; Justin qui
 *     demande dans un groupe reçoit « je te réponds dans notre fil privé » et AUCUN chiffre. Margaux reste dans `SANS_CONSIGNE_LIBRE`, et aucun outil d'ici n'est dans `OUTILS_PROPRES_DELEGABLES`
 *     (Victor ne peut pas les déclencher, même sous la racine de Justin).
 *   · ⛔ LES CHIFFRES SONT ÉCRITS PAR LE CODE, JAMAIS PAR CLAUDE. Ils arrivent dans le fil en lignes « système » de 300 signes au plus (`conversations.systeme`), que la messagerie ne relit jamais à Claude
 *     (`messagesDe` les écarte). Le modèle ne reçoit des outils que « fait » ou « refusé » : aucun chiffre de TeamOP ne part chez Anthropic (`sous-traitance.html` reste vraie, il n'y a rien à y changer), et
 *     sa réponse tient en une phrase sans chiffre. ⚠️ Le piège serait d'écrire le point comme un message de Margaux (`parler`) : il entrerait dans l'historique que Claude relit au tour suivant.
 *   · ⛔ UN CHIFFRE ILLISIBLE SE DIT (« Stripe illisible, je ne donne aucun chiffre »), il ne devient jamais un zéro : `compta-stripe.js`.
 *   · ⛔ MARGAUX N'A TOUJOURS PAS LE DROIT DE REMBOURSER, DE FAIRE UN AVOIR, D'ANNULER : ce fichier ne reçoit AUCUNE fonction d'écriture, et n'en a pas non plus la clé.
 *   · ⛔ AUCUN MONTANT, NOM, ADRESSE NI NUMÉRO DE FACTURE dans le journal des agents (`agents.noter`) ni dans les annonces de « Équipe » (`agent-faits.js`, table fermée) : ni leur nombre, ni leur somme.
 *   · ⛔ `regler_compta` ne note QUE ce que Justin a écrit lui-même : la valeur doit se retrouver dans son message (même méthode que `dossier_non_cite`), dans un fichier écrit en entier par un temporaire puis un
 *     renommage, jamais par-dessus un fichier illisible.
 *   · Les rappels (J-30, J-7 d'une échéance de la loi) sont des lignes de Margaux dans son fil, UNE fois chacun : la marque est posée sur disque AVANT d'écrire.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const CAL = require('./compta-calendrier');

const ID = 'margaux';
const F = 'compta-reglages.json';
const TOOLS = ['point_compta', 'verifier_factures', 'calendrier_compta', 'regler_compta'];
const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VIDE = { type: 'object', properties: {}, additionalProperties: false };

/* Ce que Justin doit avoir DIT pour qu'une valeur soit notée (sur le texte normalisé : sans accent, en minuscules). Une valeur qu'il n'a pas dite est refusée. */
const DIT_REGIME = { franchise: /franchise|293|non assujetti|pas assujetti|sans tva|pas de tva/, micro: /micro/, reel: /\breel\b/, inconnu: /sais pas|inconnu|pas sur|ignore/ };
const SUJET_PLATEFORME = /plateforme|\bpdp\b|\bpa\b|facture\w* electronique|reception/;
const DIT_PLATEFORME = { oui: /\boui\b|choisi|designe|c'est fait|deja|\bpris\b|\bok\b/, non: /\bnon\b|pas encore|pas choisi|pas designe|aucune|pas fait|pas de plateforme|n'ai pas/, inconnu: /sais pas|inconnu|pas sur|ignore/ };
const DIT_AUCUN_EXPERT = /pas d'expert|aucun expert|sans expert|pas d expert|n'ai pas d'expert|pas de comptable|aucun comptable/;
const COURRIEL = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;

module.exports = function agentCompta(ctx) {
  const { agents, fichier } = ctx;
  const conv = ctx.conversations && typeof ctx.conversations.systeme === 'function' && typeof ctx.conversations.parler === 'function' ? ctx.conversations : null;
  const stripe = ctx.stripe && typeof ctx.stripe.pointArgent === 'function' ? ctx.stripe : null;       // `compta-stripe.js`
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const periodes = typeof ctx.periodes === 'function' ? ctx.periodes : null;       // → { ok:true, nombre, prochaine:'AAAA-MM-JJ'|'' } | { ok:false } — les périodes offertes (codes promo)
  const relances = typeof ctx.relances === 'function' ? ctx.relances : null;       // → { impayesSuivis, relancesParties, misesEnDemeurePreparees } (`agentMargaux.etat`) | null
  if (!agents || !fichier || !conv || !stripe) {
    return { passer: async () => ({ saute: 'pas_branchee' }), outilsEquipe: { outils: [], executer: async () => ({ ok: false, raison: 'pas_branche' }) } };
  }
  const reg = fichier.charger(F, {});
  if (!reg.rappels || typeof reg.rappels !== 'object' || Array.isArray(reg.rappels)) reg.rappels = {};
  const sauve = () => fichier.ecrire(F, reg);
  const illisible = () => fichier.illisible(F);

  /* ── les portes communes ── */
  function porte(c, ordre) {
    if (!c || c.de !== 'justin') return { ok: false, raison: 'pas_justin' };     // un collègue, un client relayé : rien, et pas de ligne (le refus est au journal)
    if (c.fil !== ID) {
      /* Justin l'a demandé dans un groupe : les chiffres de TeamOP ne s'écrivent que dans son fil privé */
      try { conv.systeme(c.fil, 'Les chiffres de TeamOP ne s’écrivent que dans notre fil privé : je te réponds là-bas (écris-moi dans « Margaux »).', { cle: 'compta-fil:' + c.fil, parHeure: true }); } catch (e) {}
      return { ok: false, raison: 'pas_fil_prive' };
    }
    if (!agents.peutAgir(ID).ok) return { ok: false, raison: 'arret' };
    return null;
  }
  /* Écrit des lignes dans le fil, par le SYSTÈME : une ligne par entrée, 300 signes au plus (le fil coupe en silence au-delà : on range avant). Rend vrai si TOUTES sont écrites. */
  function ecrire(fil, lignes) {
    for (const l of lignes) {
      if (String(l).length > 300) return false;
      let r; try { r = conv.systeme(fil, l); } catch (e) { r = null; }
      if (!r || r.ok !== true) return false;
    }
    return true;
  }
  const safe = (f, defaut) => { try { return f ? f() : defaut; } catch (e) { return defaut; } };
  const fait = (code, issue) => { try { agents.fait(ID, code, { issue: issue === 'echec' ? 'echec' : 'fait', raison: issue === 'echec' ? 'indisponible' : undefined }); } catch (e) {} };
  const journal = (action, resultat, detail) => { try { agents.noter(ID, action, { cible: 'compta', resultat, detail }); } catch (e) {} };

  /* ═══ 1. LE POINT DE L'ARGENT ═══ */
  const PLURIEL = (n, un, plusieurs) => n + ' ' + (n > 1 ? plusieurs : un);
  /* Les lignes du point. Un morceau qui n'est pas lisible se REMPLACE par sa phrase « illisible » — jamais par un zéro. */
  function lignesPoint(per, arg, abo, off, rel, now) {
    const ill = 'Stripe illisible, je ne donne aucun chiffre';
    const lignes = [];
    if (!arg.ok && !abo.ok) {
      lignes.push(ill + (abo.raison === 'perime' && abo.derniere ? ' (dernière lecture réussie : ' + CAL.moment(abo.derniere) + ')' : '') + '. L’encaissé, les abonnés, le revenu mensuel et les formules reviendront dès que Stripe répond.');
    } else {
      if (arg.ok) {
        const segs = ['Au ' + CAL.dateFr(CAL.jourDe(now)) + ' · encaissé en ' + per.libelle + (per.enCours ? ' (mois en cours)' : '') + ' : ' + (arg.payees === 0 ? '0 facture payée' : CAL.euros(arg.centimes / 100) + ' (' + PLURIEL(arg.payees, 'facture payée', 'factures payées') + ')'),
          'en attente : ' + arg.ouvertes, 'refusées : ' + arg.refusees, 'annulées : ' + arg.annulees];
        if (arg.horsEuro) segs.push(PLURIEL(arg.horsEuro, 'facture hors euro non comptée', 'factures hors euro non comptées'));
        lignes.push(...CAL.ranger(segs));
      } else lignes.push('Encaissé de ' + per.libelle + ' : ' + ill + '.');
      if (abo.ok) {
        lignes.push(...CAL.ranger(['Abonnés : ' + abo.payants + ' payants, ' + abo.essais + ' en essai, ' + abo.impayes + ' en impayé', 'revenu mensuel récurrent : ' + CAL.euros(abo.mrr) + ' (les mêmes chiffres que l’écran Abonnements)']));
      } else lignes.push('Abonnés et revenu mensuel : ' + ill + (abo.raison === 'perime' && abo.derniere ? ' (dernière lecture réussie : ' + CAL.moment(abo.derniere) + ')' : '') + '.');
    }
    /* par formule (Stripe) et périodes offertes (le registre des codes promo, qui n'est pas Stripe) */
    const f = [];
    if (abo.ok) {
      const p = abo.parFormule;
      f.push('Par formule (payants) : Pro ' + p.pro + ' · Business ' + p.business + ' · Business Premium ' + p.premium + (p.autres ? ' · autres ' + p.autres : ''));
    }
    if (off && off.ok === true) {
      f.push(off.nombre > 0 ? 'en période offerte (codes promo) : ' + PLURIEL(off.nombre, 'entreprise', 'entreprises') + (off.prochaine ? ', prochaine fin le ' + CAL.dateFr(off.prochaine) : '') : 'aucune entreprise en période offerte');
    } else f.push('périodes offertes : registre illisible, je ne donne aucun chiffre');
    lignes.push(...CAL.ranger(f));
    if (rel && Number.isInteger(rel.impayesSuivis) && Number.isInteger(rel.relancesParties) && Number.isInteger(rel.misesEnDemeurePreparees)) {
      lignes.push('Mes relances : ' + PLURIEL(rel.impayesSuivis, 'impayé suivi', 'impayés suivis') + ' · ' + PLURIEL(rel.relancesParties, 'relance partie', 'relances parties') + ' · ' + PLURIEL(rel.misesEnDemeurePreparees, 'mise en demeure préparée', 'mises en demeure préparées') + '.');
    } else lignes.push('Mes relances : je ne sais pas les lire pour l’instant, je ne donne aucun chiffre.');
    return lignes;
  }
  async function pointCompta(entree, c) {
    const g = porte(c); if (g) return g;
    /* LE SCHÉMA EST FERMÉ ICI AUSSI : une seule clé, `periode`, une valeur permise (ce mois, le mois dernier, l'un des douze derniers mois) */
    if (!entree || typeof entree !== 'object' || Array.isArray(entree) || Object.keys(entree).some(k => k !== 'periode') || typeof entree.periode !== 'string') return { ok: false, raison: 'forme' };
    const now = maintenant();
    const per = stripe.periodeDe(entree.periode, now);
    if (!per.ok) return { ok: false, raison: 'periode', ligne: 'Je ne lis que ce mois, le mois dernier ou l’un des douze derniers mois (AAAA-MM).' };
    const [arg, abo] = await Promise.all([stripe.pointArgent(entree.periode), stripe.abonnes()]);
    const off = safe(periodes, null), rel = safe(relances, null);
    const lignes = lignesPoint(per, arg, abo, off, rel, now);
    const lu = arg.ok && abo.ok;
    /* le journal : ce qui a été lu, en MOTS — jamais un montant, un nombre, un nom */
    journal('point compta', lu ? 'ok' : 'erreur', lu ? 'lu' : 'illisible : ' + [arg.ok ? '' : 'encaissé ' + arg.raison, abo.ok ? '' : 'abonnés ' + abo.raison].filter(Boolean).join(', '));
    if (!ecrire(c.fil, lignes)) return { ok: false, raison: 'ecriture' };
    fait('point_compta', lu ? 'fait' : 'echec');
    return { ok: true };
  }

  /* ═══ 2. LES FACTURES STRIPE VÉRIFIÉES ═══ */
  function lignesFactures(v, liste) {
    const ill = 'Stripe illisible, je ne donne aucun chiffre';
    const lignes = [];
    if (!v.ok) lignes.push('Factures de l’année : ' + ill + '.');
    else {
      const n = v.n, y = n.total, sur = x => x + ' sur ' + y;
      if (y === 0) lignes.push('Factures de ' + v.annee + ' lues chez Stripe : aucune émise pour l’instant, rien à vérifier.');
      else {
        lignes.push(...CAL.ranger(['Factures de ' + v.annee + ' lues chez Stripe (brouillons exclus) : ' + y, 'Numéro : ' + sur(n.numero), 'lien PDF : ' + sur(n.pdf), 'pied de page : ' + sur(n.pied), 'champs personnalisés : ' + sur(n.champs),
          'mention de franchise (293 B ou CIBS) : ' + sur(n.mention)]));
        lignes.push(...CAL.ranger(['Adresse du client : ' + sur(n.adresse), 'identifiant de TVA du client : ' + sur(n.tvaClient), 'période sur les lignes : ' + n.periode + ' sur ' + n.periodeLue + ' lues']));
        const tva = n.taxeLue === 0 ? 'TVA facturée : Stripe ne la montre pas, je ne donne aucun chiffre'
          : 'TVA facturée' + (n.taxeLue < y ? ' (sur ' + n.taxeLue + ' factures lisibles)' : '') + ' : ' + CAL.euros(n.taxeCts / 100) + (n.taxeCts === 0 ? ' (0 attendu en franchise)' : ' — en franchise elle devrait être nulle : ' + PLURIEL(n.taxeFacturees, 'facture concernée', 'factures concernées') + ' !');
        const num = v.numerotation.genre === 'client' ? 'numérotation : une séquence PAR CLIENT (' + v.numerotation.sequences + ' séries) — la loi demande une séquence chronologique et continue : à voir avec ton expert-comptable (réglage de numérotation dans Stripe)'
          : v.numerotation.genre === 'compte' ? 'numérotation : une seule série pour le compte, ' + (v.numerotation.trous || v.numerotation.doublons ? PLURIEL(v.numerotation.trous, 'trou', 'trous') + ' et ' + PLURIEL(v.numerotation.doublons, 'doublon', 'doublons') : 'sans trou ni doublon') + ' (à confirmer sur une vraie facture)'
          : 'numérotation : aucun numéro à examiner';
        lignes.push(...CAL.ranger([tva, num]));
      }
    }
    /* ce que l'API ne montre pas : une liste à cocher par Justin lui-même, dans Stripe */
    const cases = liste.map((a, i) => (i + 1) + ') ' + a.texte);
    lignes.push(...CAL.ranger(['À cocher toi-même dans les réglages de facture de Stripe (l’API ne le montre pas) :'].concat(cases), 290, ' '));
    lignes.push('Preuve : ces mentions viennent de service-public.fr (pages résumées, « extrait ») — à confirmer avec ton expert-comptable avant de les tenir pour obligatoires.');
    return lignes;
  }
  async function verifierFactures(entree, c) {
    const g = porte(c); if (g) return g;
    if (entree && typeof entree === 'object' && Object.keys(entree).length) return { ok: false, raison: 'forme' };
    const v = await stripe.verifierFactures();
    journal('vérifier les factures', v.ok ? 'ok' : 'erreur', v.ok ? 'lu' : 'illisible : ' + v.raison);
    if (!ecrire(c.fil, lignesFactures(v, CAL.A_COCHER))) return { ok: false, raison: 'ecriture' };
    fait('factures_verifiees', v.ok ? 'fait' : 'echec');
    return { ok: true };
  }

  /* ═══ 3. LE CALENDRIER ═══ */
  async function calendrierCompta(entree, c) {
    const g = porte(c); if (g) return g;
    if (entree && typeof entree === 'object' && Object.keys(entree).length) return { ok: false, raison: 'forme' };
    const now = maintenant();
    const cumul = await stripe.cumulAnnee();
    const lues = illisible() ? 'illisible' : 'lu';
    journal('calendrier compta', cumul.ok ? 'ok' : 'erreur', (cumul.ok ? 'cumul lu' : 'cumul illisible : ' + cumul.raison) + ' ; réglages ' + lues);
    const lignes = illisible() ? ['Mes réglages de compta sont illisibles : je ne les utilise pas tant que le fichier n’est pas réparé.'] : CAL.lignesCalendrier(reg, now, cumul);
    if (!ecrire(c.fil, lignes)) return { ok: false, raison: 'ecriture' };
    fait('calendrier_compta', 'fait');
    return { ok: true };
  }

  /* ═══ 4. LES RÉGLAGES ═══ */
  function reglerCompta(entree, c) {
    const g = porte(c); if (g) return g;
    const permis = ['regime', 'plateforme_reception', 'expert_comptable'];
    if (!entree || typeof entree !== 'object' || Array.isArray(entree)) return { ok: false, raison: 'forme' };
    const cles = Object.keys(entree);
    if (!cles.length || cles.some(k => !permis.includes(k))) return { ok: false, raison: 'forme' };
    if (illisible()) return { ok: false, raison: 'registre_illisible', ligne: 'Mes réglages de compta sont illisibles : je ne note rien tant que le fichier n’est pas réparé.' };
    const t = norm(c.texte).replace(/[’‘]/g, '\'');   // ce que JUSTIN a écrit, pas ce que le modèle croit (apostrophes droites)
    const avant = JSON.stringify(reg);
    const notes = [];
    if ('regime' in entree) {
      const v = entree.regime;
      if (!CAL.REGIMES.includes(v)) return { ok: false, raison: 'valeur' };
      if (!DIT_REGIME[v].test(t)) return { ok: false, raison: 'valeur_non_citee', ligne: 'Je ne note ton régime que si tu me le dis : franchise, micro-entreprise ou réel ?' };
      reg.regime = v; notes.push('régime : ' + CAL.REGIMES_LIBELLE[v]);
    }
    if ('plateforme_reception' in entree) {
      const v = entree.plateforme_reception;
      if (!CAL.PLATEFORMES.includes(v)) return { ok: false, raison: 'valeur' };
      if (!(v === 'inconnu' ? DIT_PLATEFORME.inconnu.test(t) : SUJET_PLATEFORME.test(t) && DIT_PLATEFORME[v].test(t) && (v === 'non' || !DIT_PLATEFORME.non.test(t)))) return { ok: false, raison: 'valeur_non_citee', ligne: 'Je ne note la plateforme que si tu me dis clairement si tu en as désigné une ou non.' };
      reg.plateforme = v; notes.push('plateforme de réception : ' + (v === 'oui' ? 'désignée' : v === 'non' ? 'pas désignée' : 'inconnue'));
    }
    if ('expert_comptable' in entree) {
      const e = entree.expert_comptable;
      if (!e || typeof e !== 'object' || Array.isArray(e) || Object.keys(e).some(k => !['nom', 'adresse', 'aucun'].includes(k))) return { ok: false, raison: 'forme' };
      if (e.aucun === true) {
        if (e.nom !== undefined || e.adresse !== undefined || !DIT_AUCUN_EXPERT.test(t)) return { ok: false, raison: 'valeur_non_citee', ligne: 'Je ne note « pas d’expert-comptable » que si tu me le dis.' };
        reg.expert = { aucun: true, nom: '', adresse: '' }; notes.push('expert-comptable : aucun');
      } else {
        const nom = typeof e.nom === 'string' ? e.nom.replace(/\s+/g, ' ').trim() : '', adr = typeof e.adresse === 'string' ? e.adresse.trim().toLowerCase() : '';
        if (nom.length < 3 || nom.length > 80 || adr.length > 160 || !COURRIEL.test(adr)) return { ok: false, raison: 'valeur' };
        /* le nom ET l'adresse doivent figurer, tels quels, dans le message de Justin */
        if (!t.includes(norm(nom)) || !String(c.texte || '').toLowerCase().includes(adr)) return { ok: false, raison: 'valeur_non_citee', ligne: 'Je ne note ton expert-comptable que si tu m’écris son nom et son adresse de courriel.' };
        reg.expert = { aucun: false, nom, adresse: adr }; notes.push('expert-comptable : noté');
      }
    }
    if (JSON.stringify(reg) === avant) return { ok: true };
    if (!sauve()) {                                    // jamais un « noté » qui ne l'est pas : on rend l'ancien état
      const ancien = JSON.parse(avant); for (const k of Object.keys(reg)) delete reg[k]; Object.assign(reg, ancien);
      return { ok: false, raison: 'ecriture', ligne: 'Je n’ai pas pu écrire mes réglages : rien n’est noté.' };
    }
    journal('réglage compta', 'ok', 'noté');
    ecrire(c.fil, ['J’ai noté — ' + notes.join(' ; ') + '.']);
    fait('reglage_compta', 'fait');
    return { ok: true };
  }

  /* ═══ LES OUTILS, tels que la messagerie les offre au modèle ═══ */
  function definitions() {
    const periodesOffertes = ['ce_mois', 'mois_dernier'].concat(stripe.moisPermis(maintenant()));
    return [
      { name: 'point_compta',
        description: 'Faire le point de l’ARGENT de TeamOP pour Justin : l’encaissé d’une période, les factures en attente ou refusées, les abonnés, le revenu mensuel, les formules, les périodes offertes, tes relances. À n’appeler que si Justin le demande, dans ce fil privé. ⛔ Le SERVEUR écrit lui-même tous les chiffres dans le fil : tu n’en écris AUCUN — ni montant, ni nombre, ni date de TeamOP — et tu ne les connais pas. Ta réponse tient en UNE phrase sans chiffre (par exemple « Voilà le point, il est juste en dessous »).',
        input_schema: { type: 'object', properties: { periode: { type: 'string', enum: periodesOffertes, description: 'ce_mois, mois_dernier, ou un mois AAAA-MM parmi les douze derniers' } }, required: ['periode'], additionalProperties: false } },
      { name: 'verifier_factures',
        description: 'Vérifier que les factures Stripe de l’année portent les mentions obligatoires (numéro, pied de page, mention de franchise, adresse et TVA du client, période, PDF, TVA facturée) et donner à Justin la liste de ce qu’il doit cocher lui-même dans Stripe. À n’appeler que si Justin le demande, dans ce fil privé. Le serveur écrit le bilan (des nombres) : tu n’écris AUCUN chiffre, aucun nom de client, aucun numéro de facture ; une phrase suffit.',
        input_schema: VIDE },
      { name: 'calendrier_compta',
        description: 'Dire à Justin les échéances de la loi qui touchent la compta de TeamOP (facturation électronique, mention de franchise, seuil de la franchise, déclarations, conservation), avec le niveau de preuve de chaque date. À n’appeler que si Justin le demande, dans ce fil privé. Le serveur écrit les dates et les seuils : tu n’en écris AUCUN, tu réponds en une phrase.',
        input_schema: VIDE },
      { name: 'regler_compta',
        description: 'Noter ce que JUSTIN vient de dire de sa compta : son régime (franchise en base de TVA, micro-entreprise, réel), s’il a désigné la plateforme agréée de réception des factures électroniques, son expert-comptable (nom et adresse de courriel). Seulement ce qu’il a écrit lui-même dans son dernier message : une valeur qu’il n’a pas dite est refusée. Au moins un champ.',
        input_schema: { type: 'object', properties: {
          regime: { type: 'string', enum: CAL.REGIMES },
          plateforme_reception: { type: 'string', enum: CAL.PLATEFORMES },
          expert_comptable: { type: 'object', properties: { nom: { type: 'string' }, adresse: { type: 'string', description: 'adresse de courriel' }, aucun: { type: 'boolean', description: 'vrai si Justin dit qu’il n’a pas d’expert-comptable' } }, additionalProperties: false } },
          additionalProperties: false } },
    ];
  }
  const OUTILS_EQUIPE = {
    get outils() { return definitions(); },
    executer: async (nom, entree, c) => {
      if (nom === 'point_compta') return pointCompta(entree, c);
      if (nom === 'verifier_factures') return verifierFactures(entree, c);
      if (nom === 'calendrier_compta') return calendrierCompta(entree, c);
      if (nom === 'regler_compta') return reglerCompta(entree, c);
      return { ok: false, raison: 'outil_inconnu' };
    },
  };

  /* ═══ LES RAPPELS (J-30, J-7) ET LA QUESTION SUR LA PLATEFORME ═══
     Une ligne de Margaux dans son fil, UNE fois chacune. ⛔ La marque est posée sur disque AVANT d'écrire : un redémarrage au milieu ne la fait pas partir deux fois ; un envoi qui échoue la retire
     (rien n'a été dit, on réessaiera). Les lignes viennent de la table du code, jamais du modèle. */
  let enCours = false;
  async function passer() {
    if (enCours) return { saute: 'deja_en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(ID);
      if (!p.ok) return { saute: p.raison };
      if (illisible()) { journal('rappels compta', 'refuse', 'réglages illisibles'); return { saute: 'registre_illisible' }; }
      const now = maintenant();
      let dits = 0;
      const dire = (cle, texte) => {
        reg.rappels[cle] = now;
        if (!sauve()) { delete reg.rappels[cle]; return false; }          // la marque d'abord
        let r; try { r = conv.parler(ID, ID, texte, { niveau: 'important' }); } catch (e) { r = null; }
        if (!r || r.ok !== true) { delete reg.rappels[cle]; sauve(); return false; }
        dits++;
        return true;
      };
      const q = CAL.questionPlateforme(reg, now);
      if (q && !reg.rappels['question:plateforme']) dire('question:plateforme', q);
      for (const d of CAL.rappelsDus(reg, now, reg.rappels)) {
        if (!agents.peutAgir(ID).ok) break;
        for (const s of d.sauter) reg.rappels[s] = -1;                      // un palier dépassé sans avoir été dit : sauté, on ne le dit pas après coup
        if (dire(d.id + ':' + d.palier, CAL.texteRappel(d.id, d.jours, now))) { journal('rappel compta', 'ok', d.palier); fait('rappel_compta', 'fait'); }
        else sauve();
      }
      return { rappels: dits };
    } finally { enCours = false; }
  }

  return { passer, outilsEquipe: OUTILS_EQUIPE, TOOLS };
};

/* L'ASSEMBLEUR : les outils de Margaux sont ceux de `agent-margaux.js` (la mise en demeure) PLUS ceux d'ici, derrière UNE entrée de `outilsAgents`. Les noms ne se recouvrent jamais (le premier gagne) ;
   un nom inconnu n'est exécuté par personne. `outils` est relu à chaque réveil (la liste des mois permis suit la date). */
module.exports.assembler = function assembler(...modules) {
  const mods = modules.filter(m => m && Array.isArray(m.outils) && typeof m.executer === 'function');
  const proprietaire = nom => mods.find(m => m.outils.some(t => t && t.name === nom));
  return {
    get outils() { const vus = new Set(), l = []; for (const m of mods) for (const t of m.outils) if (t && !vus.has(t.name)) { vus.add(t.name); l.push(t); } return l; },
    executer: async (nom, entree, c) => { const m = proprietaire(nom); return m ? m.executer(nom, entree, c) : { ok: false, raison: 'outil_inconnu' }; },
  };
};
module.exports.ID = ID;
module.exports.TOOLS = TOOLS;
