/* HUGO — paiements et accès (premier agent de l'équipe, 19 octobre 2026).
 *
 * Ce que Justin a décidé : Hugo VÉRIFIE par relecture de Stripe (pas de webhook), PRÉPARE, et c'est Justin qui VALIDE la
 * création d'un espace. Hugo ne crée donc rien : quand un client qui n'a pas d'espace a un abonnement payé SÛREMENT à lui
 * (`paiement` : les règles de rattachement du serveur, jamais les siennes), il DÉPOSE une demande « creer_espace » dans la file
 * de validations. Rien d'autre.
 *
 * ⛔ Hugo n'appelle PAS Claude et ne lit AUCUN texte venu de l'extérieur : il compare des faits (un abonnement, une adresse, un
 * nom d'accès) et n'écrit que des FORMES FERMÉES (`SCHEMAS.creer_espace` : un nom d'accès, une formule). Le nom que le client
 * a saisi n'entre jamais dans la demande — seul le nom d'accès, réduit à [a-z0-9], y figure. Une phrase de client ne peut donc
 * pas influencer ce que Justin voit, ni ce qu'un autre agent reçoit.
 * ⛔ « On ne sait pas » ne propose rien : Stripe illisible (`null`), abonnement douteux, formule illisible → aucune demande.
 * ⛔ Une demande refusée ne revient pas : `dejaPropose` couvre tous les statuts, sauf « expirée » (une proposition que
 * personne n'a regardée en sept jours peut être refaite).
 * ⛔ Il redemande `peutAgir` AVANT CHAQUE demande : une pause posée pendant le passage l'arrête net.
 * Toutes les dépendances sont INJECTÉES : le module ne touche ni `index.js`, ni Stripe, ni le disque lui-même.
 */
'use strict';
const SLUG = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const FORMULES = ['pro', 'business', 'premium'];
const PAR_PASSAGE = 20;            // demandes déposées au plus par passage : un client en trop attend le suivant
const CLIENTS_MAX = 500;
/* Un NOM D'ENTREPRISE a la forme d'un nom : des lettres, des chiffres, des espaces et quelques signes, court. Une phrase (ou n'importe quoi
   d'autre) ne devient jamais un nom d'accès sous les yeux de Justin : le client est laissé à un humain. */
const NOM = /^[\p{L}\p{N} '’.&-]{2,50}$/u;
const MOTS_MAX = 6;           // clients examinés par passage

module.exports = function hugo(ctx) {
  const { agents, clients, espaceExiste, stripeListe, paiement, slug } = ctx;
  const conv = ctx.conversations && typeof ctx.conversations.parler === 'function' ? ctx.conversations : null;
  const ID = 'hugo';
  let enCours = false;
  let stripeHS = false;   // une panne de Stripe se DIT une fois, pas à chaque passage (toutes les 15 minutes)
  const dire = (texte, niveau) => { if (!conv) return; try { conv.parler(ID, ID, texte, { niveau }); } catch (e) {} };

  /* Un passage. Rend un compte-rendu COURT (jamais d'adresse) : `{saute}` (n'a pas le droit d'agir), `{stripe:false}` (on ne sait
     pas), ou `{examines, proposes, doutes}`. */
  async function passer() {
    if (enCours) return { saute: 'deja_en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(ID);
      if (!p.ok) return { saute: p.raison };
      let liste;
      try { liste = await stripeListe(); } catch (e) { liste = null; }
      if (!Array.isArray(liste)) {
        agents.noter(ID, 'relire Stripe', { cible: 'abonnements', resultat: 'erreur', detail: 'Stripe illisible : aucune demande déposée' });
        if (!stripeHS) { stripeHS = true; dire('Je n’arrive pas à lire Stripe : je ne peux pas vérifier les paiements, donc je ne propose aucune création d’espace tant que ça dure.', 'important'); }
        return { stripe: false };
      }
      if (stripeHS) { stripeHS = false; dire('Stripe répond de nouveau : je reprends la relecture des paiements.', 'info'); }
      let lus;
      try { lus = clients(); } catch (e) { lus = null; }
      if (!Array.isArray(lus)) { agents.noter(ID, 'lire les clients', { cible: 'clients', resultat: 'erreur', detail: 'liste des clients illisible' }); return { stripe: true, clients: false }; }
      let examines = 0, proposes = 0, doutes = 0;
      for (const c of lus.slice(0, CLIENTS_MAX)) {
        if (!c || typeof c.email !== 'string' || !c.email) continue;
        const nom = String(c.entreprise || '').trim();
        if (!NOM.test(nom) || nom.split(/\s+/).length > MOTS_MAX) { if (nom) { doutes++; agents.noter(ID, 'lire un nom', { cible: 'client', resultat: 'refuse', detail: 'nom d’entreprise hors forme : laissé à un humain' }); } continue; }
        const sl = slug(nom);
        if (!SLUG.test(sl)) continue;
        if (espaceExiste(c.email, sl)) continue;
        examines++;
        const v = paiement(c, sl, liste);
        if (!v || v.sur !== true) { if (v && v.doute) doutes++; continue; }
        if (!FORMULES.includes(v.formule)) { doutes++; agents.noter(ID, 'lire une formule', { cible: sl, resultat: 'refuse', detail: 'formule illisible : aucune demande' }); continue; }
        if (agents.dejaPropose(ID, 'creer_espace', sl)) continue;
        if (proposes >= PAR_PASSAGE) break;
        if (!agents.peutAgir(ID).ok) return { saute: agents.peutAgir(ID).raison, examines, proposes, doutes };   // pause en cours de route
        const r = agents.proposer(ID, 'creer_espace', 'Créer l’espace ' + sl + ' (formule ' + v.formule + ') — paiement Stripe relevé', { espace: sl, formule: v.formule });
        if (r.ok) proposes++;
        else if (r.raison === 'file_pleine' || r.raison === 'ecriture') break;
      }
      if (proposes > 0) dire('J’ai déposé ' + proposes + ' demande' + (proposes > 1 ? 's' : '') + ' de création d’espace (paiement relevé sur Stripe) : elle' + (proposes > 1 ? 's attendent' : ' attend') + ' ta validation dans « Validations ».', 'important');
      return { examines, proposes, doutes };
    } finally { enCours = false; }
  }

  /* ── la CONVERSATION : Justin écrit dans le fil de Hugo, Hugo répond (Claude). Il ne fait RIEN d'autre : il ne propose ni n'exécute
        par ce chemin. Le prompt ne reçoit que le texte de Justin et des FAITS fermés sur les dossiers qu'il nomme (jamais un nom, une
        adresse, un téléphone ni une note de client). ── */
  const cerveau = ctx.cerveau && typeof ctx.cerveau.penser === 'function' ? ctx.cerveau : null;
  const faits = ctx.faits && typeof ctx.faits === 'function' ? ctx.faits : null;
  const SYSTEM = 'Tu es Hugo, l’agent « Paiements et accès » de Team OP (logiciels OP GESTION et OP MESSAGES). Tu parles à Justin, le patron, en français, avec des phrases courtes et directes. ' +
    'Tu vois les paiements Stripe et l’état des espaces clients. Dans cette conversation tu ne peux RIEN faire : tu expliques, tu constates, et si une action te paraît utile tu dis laquelle — elle passera par une validation de Justin dans la Tour. ' +
    'Tu ne promets jamais d’avoir fait quelque chose. Si les faits fournis ne répondent pas à la question, tu dis que tu ne sais pas. Ne répète jamais d’adresse e-mail ni de numéro de téléphone.';
  async function repondre(texte) {
    if (!cerveau || !conv) return { saute: 'pas_de_cerveau' };
    const t = String(texte || '').slice(0, 1000);
    const numeros = [...new Set(t.toUpperCase().match(/DOS-\d{6}/g) || [])].slice(0, 3);
    let lignes = [];
    if (faits) for (const n of numeros) { let f = null; try { f = await faits(n); } catch (e) { f = null; } lignes.push(f ? JSON.stringify(f) : '{"numero":"' + n + '","lecture":"impossible"}'); }
    const system = SYSTEM + (lignes.length ? '\nFaits relevés par le serveur sur les dossiers cités (JSON, un par ligne) :\n' + lignes.join('\n') : '\nAucun dossier cité : tu n’as aucun fait client sous les yeux.');
    const r = await cerveau.penser(ID, system, [{ role: 'user', content: t }]);
    if (!r.ok) { if (r.raison === 'plafond_agent' || r.raison === 'plafond_total' || r.raison === 'pas_de_cle' || r.raison === 'erreur_api') dire('Je ne peux pas te répondre pour l’instant (' + ({ plafond_agent: 'mon budget du mois est atteint', plafond_total: 'le budget des agents est atteint', pas_de_cle: 'ma clé n’est pas posée', erreur_api: 'Claude ne répond pas' })[r.raison] + ').', 'important'); return { saute: r.raison }; }
    const d = conv.parler(ID, ID, r.texte, { niveau: 'info' });
    return d.ok ? { repondu: true } : { saute: d.raison };
  }

  return { passer, repondre };
};
module.exports.FORMULES = FORMULES;
