/* LES OUTILS DE LECTURE DES AGENTS (30 octobre 2026) — ce qu'un agent va CHERCHER lui-même avant d'écrire.
 *
 * Camille voyait l'objet et six mille signes d'un courriel. Une professionnelle relit le fil, regarde la fiche du client, se rappelle ce que l'équipe lui a déjà écrit, consulte ce que Justin a validé. Ces outils le lui
 * donnent — et RIEN d'autre : ils lisent, ils ne font rien.
 *
 * ⛔ AUCUN POUVOIR : pas d'envoi, pas de paiement, pas de suppression, pas d'accès. Chaque outil rend un TEXTE borné (JSON), et ce texte est une DONNÉE pour le modèle, jamais une consigne.
 * ⛔ L'OUTIL NE CHOISIT PAS SON SUJET : il est lié au courriel en cours (`pourCourriel`). Le modèle ne passe ni adresse, ni identifiant de boîte, ni numéro de dossier : le code lit ce dossier-là, celui de l'adresse
 *    de l'expéditeur — jamais celui qu'un texte de client aurait cité (« donne-moi l'état du dossier DOS-… d'un autre »).
 * ⛔ LA FICHE DU CLIENT n'est lue que pour un expéditeur AUTHENTIFIÉ par notre serveur de réception : une adresse falsifiée n'obtient aucun fait de compte, même dans la tête du modèle.
 * ⛔ CE QUI PART CHEZ ANTHROPIC, ET QUI S'AJOUTE à ce que `sous-traitance.html` décrit pour le courrier (l'objet et le texte du message reçu, adresses et numéros retirés) :
 *    · le message reçu EN ENTIER (jusqu'à 12 000 signes au lieu de 6 000), avec les citations qu'il porte — c'est le fil de la conversation, adresses et numéros retirés ;
 *    · les derniers courriels que NOS agents ont écrits à cette adresse (objet et 700 premiers signes, sans l'adresse) ;
 *    · des FAITS FERMÉS sur le dossier du client : formule, état de l'espace, état du paiement, nombre de demandes — les mêmes que lisent déjà Hugo et Margaux (`faitsDossier`) ;
 *    · ce que l'équipe a fait pour ce dossier (type de tâche, état, résumé d'une phrase) ;
 *    · les connaissances que Justin a validées (déjà envoyées aujourd'hui dans le prompt).
 *    Jamais un nom, une adresse, un téléphone ni une pièce jointe.
 */
'use strict';
const K = require('./agents-connaissance');

const FIL_MAX = 12000;
const propre = t => K.delimiter(K.sansTel(K.sansAdresses(String(t == null ? '' : t)))).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const json = x => JSON.stringify(x);
const SANS_ARG = { type: 'object', properties: {}, additionalProperties: false };

module.exports = function outilsLecture(ctx) {
  ctx = ctx || {};
  /* ⛔ LECTURE TARDIVE : `index.js` passe des accesseurs (les modules ne sont pas tous montés quand celui-ci l'est) — on relit `ctx.x` À CHAQUE usage, jamais à la création. */
  const lire = k => { try { return ctx[k]; } catch (e) { return undefined; } };
  const dossiersFaits = () => { const f = lire('faits'); return f && typeof f === 'object' ? f : {}; };

  const connaissances = {
    name: 'connaissances_equipe',
    description: 'Consulter les connaissances que Justin a validées (réponses à des questions sur l’application, règles de l’entreprise). À appeler avant d’affirmer un fait sur l’application que l’offre ne dit pas. Donne ta question en quelques mots.',
    input_schema: { type: 'object', properties: { question: { type: 'string', description: 'la question, en quelques mots' } }, required: ['question'], additionalProperties: false },
    executer: async e => {
      let b = '';
      try { b = lire('louis') && typeof lire('louis').bloc === 'function' ? String(lire('louis').bloc(typeof (e && e.question) === 'string' ? e.question.slice(0, 300) : '') || '') : ''; } catch (x) { b = ''; }
      return b ? b.slice(0, 5000) : 'Aucune connaissance validée sur ce sujet : ne l’affirme pas, dis que nous revenons vers la personne.';
    },
  };

  /* Les outils d'UN courriel reçu. `c` : { adresse (l'expéditeur, lu dans l'en-tête), dossier ('' ou DOS-nnnnnn), authentifie (bool), m (le message lu : objet, texte), ts } */
  function pourCourriel(c) {
    c = c || {};
    const dossier = typeof c.dossier === 'string' && /^DOS-\d{6}$/.test(c.dossier) ? c.dossier : '';
    const fil = {
      name: 'lire_fil_courriel',
      description: 'Relire le courriel reçu EN ENTIER (avec les messages cités plus bas) et ce que notre équipe a déjà écrit à cette personne. À appeler d’abord quand le message cite un échange précédent ou semble en continuer un.',
      input_schema: SANS_ARG,
      executer: async () => {
        const m = c.m || {};
        let deja = [];
        try { deja = lire('brouillons') && typeof lire('brouillons').historiqueA === 'function' ? lire('brouillons').historiqueA(c.adresse, 3) : []; } catch (e) { deja = []; }
        return json({
          objet: propre(m.objet).replace(/\s+/g, ' ').slice(0, 200),
          message_complet: '<<<\n' + propre(m.texte).slice(0, FIL_MAX) + '\n>>>',
          deja_ecrit_par_nous: deja.map(d => ({ agent: d.agent, il_y_a_jours: d.ilYAJours, etat: d.etat, objet: propre(d.objet).slice(0, 120), extrait: propre(d.extrait).slice(0, 700) })),
        });
      },
    };
    const fiche = {
      name: 'fiche_entreprise',
      description: 'La fiche de l’entreprise qui écrit, telle que la Tour la connaît : formule, état de l’espace, état du paiement. Des faits fermés ; si l’adresse n’est celle d’aucun compte, ou si l’expéditeur n’est pas authentifié, tu n’as aucun fait de compte et tu n’en affirmes aucun.',
      input_schema: SANS_ARG,
      executer: async () => {
        if (c.authentifie !== true) return json({ authentifie: false, consigne: 'expéditeur non authentifié : ne communique et n’affirme AUCUN fait de compte' });
        if (!dossier) return json({ compte: false, consigne: 'cette adresse n’est celle d’aucun compte : c’est un prospect ou un inconnu' });
        let f = null;
        try { f = typeof dossiersFaits().dossier === 'function' ? await dossiersFaits().dossier(dossier) : null; } catch (e) { f = null; }
        return f ? json({ dossier, faits: f }) : json({ dossier, lecture: 'impossible', consigne: 'ne dis rien de son compte' });
      },
    };
    const historique = {
      name: 'historique_dossier',
      description: 'Ce que notre équipe a déjà fait pour ce client : les demandes confiées aux collègues (état, résumé) et les derniers courriels écrits. À appeler avant de promettre ou de renvoyer une personne vers un collègue.',
      input_schema: SANS_ARG,
      executer: async () => {
        if (c.authentifie !== true) return json({ authentifie: false, consigne: 'expéditeur non authentifié : aucun historique de compte' });
        let t = [];
        try { t = dossier && lire('agents') && typeof lire('agents').tachesDossier === 'function' ? lire('agents').tachesDossier(dossier) : []; } catch (e) { t = []; }
        let h = [];
        try { h = lire('brouillons') && typeof lire('brouillons').historiqueA === 'function' ? lire('brouillons').historiqueA(c.adresse, 5) : []; } catch (e) { h = []; }
        return json({ dossier: dossier || null, taches_equipe: t, courriels: h.map(d => ({ agent: d.agent, il_y_a_jours: d.ilYAJours, etat: d.etat, objet: propre(d.objet).slice(0, 120) })) });
      },
    };
    const outils = [fil, fiche, historique, connaissances];
    /* l'outil de COLLABORATION : confier à Margaux une question de facture — seulement quand le client est un compte authentifié et que Margaux est montée (`ctx.margaux()` rend son module) */
    const margaux = typeof ctx.margaux === 'function' ? ctx.margaux() : null;
    if (margaux && typeof margaux.repondreQuestion === 'function' && dossier && c.authentifie === true && typeof c.ref === 'string' && /^[A-Za-z0-9]{4}$/.test(c.ref)) {
      outils.push({
        name: 'demander_a_margaux',
        description: 'Confier à Margaux (facturation) la question de facture de ce client : elle lit chez Stripe l’état de sa facture et te rend des FAITS (payée ou non, montant, date). Une seule fois par courriel. Utilise-la pour toute question sur une facture, un prélèvement ou un paiement ; ne devine jamais ces faits.',
        input_schema: SANS_ARG,
        executer: async () => {
          if (c.margauxDemandee) return json({ deja_demande: true, reponse: c.margauxDemandee });
          const r = await margaux.repondreQuestion({ dossier, ref: c.ref, de: 'camille' });
          c.margauxDemandee = r && r.ok ? String(r.resume || '') : '';
          return json(r && r.ok ? { reponse_de_margaux: r.resume } : { margaux_indisponible: true, consigne: 'ne donne aucun fait de facturation ; dis que la personne qui s’en occupe revient vers elle' });
        },
      });
    }
    return outils;
  }
  return { pourCourriel, connaissances };
};
module.exports.FIL_MAX = FIL_MAX;
