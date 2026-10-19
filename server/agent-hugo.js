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

  return { passer };
};
module.exports.FORMULES = FORMULES;
