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
 *
 * LA FIN D'ABONNEMENT (23 octobre 2026) — Justin : « On ne fera pas de remboursement. Une personne qui s'abonne pour le mois et après il arrête, c'est son choix. Mais il
 * faut qu'il arrête l'abonnement. » Hugo reçoit une demande FERMÉE (la tâche `resilier_fin_periode` que Camille lui dépose quand l'expéditeur authentifié est l'adresse du
 * compte, ou une demande de Justin) et programme la fin de l'abonnement À LA FIN DE LA PÉRIODE réglée — `resilier(slug)`, que l'index branche sur `stripe-resiliation.js` : jamais
 * d'annulation immédiate, jamais de remboursement. Puis il accuse réception au client (le courriel est composé par le code et signé Hugo, `agents-courriers-ops.js`), met Justin
 * au courant dans son fil, et dit à l'équipe (le groupe « Clients ») que c'est fait — par un numéro de dossier, jamais un nom.
 * ⛔ « brouillon » : Hugo DÉPOSE la fin d'abonnement en validation (`resilier_fin_periode`) au lieu de l'exécuter ; « auto » : il l'exécute. L'accusé part seul dans les deux cas
 * dès que la fin est programmée (Justin a validé, ou le mode « auto » l'autorise).
 * ⛔ Il ne PREND que les tâches qu'il sait faire (`prendre(ID, TYPES_TACHES)`), et il refuse tout ce qui est douteux (plusieurs abonnements dont l'un n'est pas sûrement à elle, Stripe
 * illisible) en le DISANT à Justin — une résiliation n'est jamais devinée.
 * ⛔ Il répond aussi à une demande de collègue sur un paiement (`verifier_paiement`) : « payé », « en impayé », « aucun paiement » ou « je ne sais pas » — jamais un montant, jamais un nom.
 */
'use strict';
const crypto = require('crypto');
const SLUG = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const FORMULES = ['pro', 'business', 'premium'];
const PAR_PASSAGE = 20;            // demandes déposées au plus par passage : un client en trop attend le suivant
/* Un NOM D'ENTREPRISE a la forme d'un nom : des lettres, des chiffres, des espaces et quelques signes, court. Une phrase (ou n'importe quoi
   d'autre) ne devient jamais un nom d'accès sous les yeux de Justin : le client est laissé à un humain. */
const NOM = /^[\p{L}\p{N} '’.&-]{2,50}$/u;
const MOTS_MAX = 6;           // mots au plus dans un nom d'entreprise (au-delà, c'est une phrase)
const FORME_DOSSIER = /^DOS-\d{6}$/;
const TYPES_TACHES = ['resilier_fin_periode', 'verifier_paiement'];   // ce que Hugo sait faire lui-même
const TACHES_PAR_PASSAGE = 10;
const OPS = require('./agents-courriers-ops');

module.exports = function hugo(ctx) {
  const { agents, clients, espaceExiste, stripeListe, paiement, slug } = ctx;
  const conv = ctx.conversations && typeof ctx.conversations.parler === 'function' ? ctx.conversations : null;
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));
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
      /* les demandes de ses collègues d'abord : elles ne dépendent pas de la lecture de Stripe qui suit */
      try { await traiterTaches(); } catch (e) { agents.noter(ID, 'tâches', { cible: 'file', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); }
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
      const horsForme = [];     // les clients qui ONT PAYÉ et dont le nom ne peut pas devenir un nom d'accès : Justin le sait UNE fois
      /* (28 octobre 2026, Justin : « sans limite ») TOUS les clients sont lus : l'ancien `slice(0, 500)` laissait le cinq-centième client et les suivants sans espace, même payés. Le plafond qui
         reste est celui des DÉPÔTS par passage (`PAR_PASSAGE`), pas celui des clients regardés. */
      for (const c of lus) {
        if (!c || typeof c.email !== 'string' || !c.email) continue;
        const nom = String(c.entreprise || '').trim();
        if (!NOM.test(nom) || nom.split(/\s+/).length > MOTS_MAX) {
          if (nom) {
            doutes++;
            /* Un nom hors forme n'est plus un simple compteur : si CE client a payé (le serveur en est sûr) et n'a pas d'espace, personne d'autre ne le verra — Justin le saura, une fois. */
            let sur = false;
            try { if (!espaceExiste(c.email, '')) { const v0 = paiement(c, slugSur(nom), liste); sur = !!(v0 && v0.sur === true); } } catch (e) { sur = false; }
            if (sur) horsForme.push(c.email);
          }
          continue;
        }
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
      if (horsForme.length) await signalerNomsHorsForme(horsForme);
      if (proposes > 0) dire('J’ai déposé ' + proposes + ' demande' + (proposes > 1 ? 's' : '') + ' de création d’espace (paiement relevé sur Stripe) : elle' + (proposes > 1 ? 's attendent' : ' attend') + ' ta validation dans « Validations ».', 'important');
      return { examines, proposes, doutes };
    } finally { enCours = false; }
  }

  /* Le nom d'un client qui a payé n'a pas la forme d'un nom d'accès (une phrase, trop de mots) : Hugo ne devine rien. Il le DIT à Justin — une seule fois par client (l'empreinte de
     l'adresse est rangée, jamais l'adresse ni le nom) : le rejouer à chaque passage de quinze minutes noierait le fil, et ne le dire qu'au journal le laissait sans espace pour toujours. */
  const empreinteClient = email => crypto.createHash('sha256').update('hugo-nom:' + String(email).toLowerCase()).digest('hex').slice(0, 24);
  const slugSur = nom => { let sl = ''; try { sl = String(slug(nom) || ''); } catch (e) { sl = ''; } return SLUG.test(sl) ? sl : 'x'; };
  async function signalerNomsHorsForme(emails) {
    const nouveaux = [];
    for (const em of emails) { const h = empreinteClient(em); if (!reg.nomsSignales[h] && !nouveaux.some(n => n.h === h)) nouveaux.push({ h }); }
    if (!nouveaux.length) return 0;
    /* la marque est posée AVANT de parler (sur disque) : un redémarrage au milieu ne redit pas le même client */
    for (const n of nouveaux) reg.nomsSignales[n.h] = maintenant();
    const cles = Object.keys(reg.nomsSignales);
    if (cles.length > 2000) for (const k of cles.sort((a, b) => reg.nomsSignales[a] - reg.nomsSignales[b]).slice(0, cles.length - 2000)) delete reg.nomsSignales[k];
    if (!sauve()) { for (const n of nouveaux) delete reg.nomsSignales[n.h]; return 0; }
    agents.noter(ID, 'lire un nom', { cible: 'client', resultat: 'refuse', detail: nouveaux.length + ' client(s) payé(s) au nom d’entreprise hors forme : Justin prévenu' });
    dire(nouveaux.length + ' ' + (nouveaux.length > 1 ? 'clients ont payé mais leur nom' : 'client a payé mais son nom') + ' d’entreprise n’a pas la forme d’un nom d’accès (une phrase, trop de mots…) : je ne crée pas leur espace et je ne devine rien. À faire à la main depuis la Tour ; je ne le redirai pas.', 'important');
    return nouveaux.length;
  }

  /* ── LA FIN D'ABONNEMENT ET LA VÉRIFICATION D'UN PAIEMENT ───────────────────────────────────────────────────────────────────── */
  const resilier = typeof ctx.resilier === 'function' ? ctx.resilier : null;                 // (slug) → { etat, finMs, adresse } — l'index le branche sur Stripe
  const documents = ctx.documents && typeof ctx.documents.courrier === 'function' ? ctx.documents : null;
  const dossierDe = typeof ctx.dossierDe === 'function' ? ctx.dossierDe : (() => '');         // (slug) → 'DOS-000123' | ''
  const espaceDeDossier = typeof ctx.espaceDeDossier === 'function' ? ctx.espaceDeDossier : (() => '');   // ('DOS-000123') → slug | ''
  const faitsPaiement = typeof ctx.faits === 'function' ? ctx.faits : null;
  const fich = ctx.fichier || null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const F = 'agents-hugo.json';
  const reg = fich ? fich.charger(F, { resiliations: {} }) : { resiliations: {} };
  if (!reg.resiliations || typeof reg.resiliations !== 'object' || Array.isArray(reg.resiliations)) reg.resiliations = {};
  if (!reg.nomsSignales || typeof reg.nomsSignales !== 'object' || Array.isArray(reg.nomsSignales)) reg.nomsSignales = {};
  const sauve = () => (fich ? fich.ecrire(F, reg) : true);
  const registreIllisible = () => !!(fich && fich.illisible(F));
  const nomDe = id => { const a = agents.AGENTS.find(x => x.id === id); return a ? a.nom : String(id); };
  /* Un message pour l'équipe (le groupe « Clients ») : seulement un numéro de dossier et des faits fermés. Le collègue qui a fait la demande est cité (@) pour qu'il le lise. */
  const direClients = (texte, niveau) => { if (!conv) return; try { conv.parler(ID, 'clients', texte, { niveau: niveau || 'info' }); } catch (e) {} };
  const citation = de => (de && de !== 'justin' && agents.AGENTS.some(a => a.id === de) ? '@' + de + ' ' : '');
  const jourLong = ms => OPS.dateLongue(ms);

  /* Programmer la fin, dire ce qui s'est passé. `o` : { de, valide } — `valide` : Justin vient d'accepter la validation (le mode « brouillon » n'empêche pas l'accusé). */
  async function executerResiliation(slug, o) {
    o = o || {};
    if (!resilier) return { ok: false, raison: 'pas_de_stripe' };
    if (registreIllisible()) { agents.noter(ID, 'fin d’abonnement', { cible: 'registre', resultat: 'refuse', detail: 'registre de Hugo illisible' }); return { ok: false, raison: 'registre_illisible' }; }
    const dossier = dossierDe(slug) || '';
    const qui = citation(o.de);
    let r; try { r = await resilier(slug); } catch (e) { r = { etat: 'echec' }; }
    if (!r || typeof r !== 'object') r = { etat: 'echec' };
    agents.noter(ID, 'fin d’abonnement', { cible: dossier || 'espace', resultat: (r.etat === 'ok' || r.etat === 'deja') ? 'ok' : 'erreur', detail: String(r.etat) });
    const dos = dossier ? 'du dossier ' + dossier : 'd’une entreprise';
    if (r.etat === 'ok' || r.etat === 'deja') {
      const avant = reg.resiliations[slug];
      const memeFin = !!(avant && avant.finMs === r.finMs && avant.accuse !== 'echec');
      let accuse = memeFin ? 'deja' : 'aucun';
      if (!memeFin) {
        const m = OPS.accuseResiliation({ finMs: r.finMs });
        if (m && documents && r.adresse) {
          let c; try { c = await documents.courrier({ agent: ID, a: r.adresse, objet: m.objet, texte: m.texte, source: 'resiliation', dossier, porte: 'aucune', valide: o.valide === true }); } catch (e) { c = { ok: false }; }
          accuse = c && c.ok ? c.voie : 'echec';
        } else accuse = 'echec';
      }
      reg.resiliations[slug] = { ts: maintenant(), finMs: r.finMs, accuse };
      sauve();
      const quand = jourLong(r.finMs);
      const mail = { direct: 'Accusé de réception envoyé au client.', validation: 'L’accusé de réception attend ta validation.', deja: 'Le client a déjà reçu son accusé.', echec: 'L’accusé de réception n’a PAS pu partir : à envoyer à la main.', aucun: '' }[accuse];
      dire('Fin d’abonnement programmée ' + dos + ' : il s’arrête le ' + (quand || 'à la fin de la période') + ' (fin de période, aucun remboursement). ' + mail + (r.etat === 'deja' ? ' (elle l’était déjà.)' : ''), accuse === 'echec' ? 'urgent' : 'important');
      direClients(qui + 'c’est fait pour le dossier ' + (dossier || '(sans numéro)') + ' : l’abonnement s’arrête le ' + (quand || 'à la fin de la période') + '. ' + mail, 'info');
      return { ok: true, etat: r.etat, accuse };
    }
    const raisons = { rien: 'il n’a aucun abonnement actif à arrêter', doute: 'plusieurs abonnements dont l’un n’est pas sûrement à lui', illisible: 'je ne peux pas lire Stripe pour l’instant', inconnu: 'l’entreprise est introuvable', echec: 'Stripe a refusé ou n’a pas répondu' };
    dire('Je n’ai PAS programmé la fin d’abonnement ' + dos + ' : ' + (raisons[r.etat] || 'raison inconnue') + '. Il faut que tu regardes.', 'urgent');
    direClients(qui + 'je n’ai pas pu programmer la fin d’abonnement du dossier ' + (dossier || '(sans numéro)') + ' : ' + (raisons[r.etat] || 'raison inconnue') + '. J’ai prévenu Justin.', 'info');
    return { ok: false, raison: r.etat };
  }

  /* La DEMANDE : en « auto » Hugo exécute ; en « brouillon » il dépose une validation (une seule à la fois par entreprise). */
  async function demanderFinAbonnement(slug, o) {
    o = o || {};
    const p = agents.peutAgir(ID);
    if (!p.ok) return { saute: p.raison };
    if (typeof slug !== 'string' || !SLUG.test(slug)) return { saute: 'forme' };
    if (p.mode !== 'auto') {
      if (agents.enAttentePour('resilier_fin_periode', 'espace', slug)) return { propose: true, deja: true };
      const dossier = dossierDe(slug);
      const d = agents.proposer(ID, 'resilier_fin_periode', 'Programmer la fin d’abonnement' + (dossier ? ' (' + dossier + ')' : '') + ' à la fin de la période réglée — demande du client, reçue ' + (o.de === 'justin' ? 'par toi' : 'par ' + nomDe(o.de)) + ' ; rien n’est coupé avant', { espace: slug });
      if (!d.ok) return { saute: d.raison };
      dire('J’ai déposé la fin d’abonnement ' + (dossier ? 'du dossier ' + dossier : 'd’une entreprise') + ' dans « Validations » : tu valides, je programme la fin de période et j’accuse réception au client.', 'important');
      return { propose: true };
    }
    return executerResiliation(slug, o);
  }

  /* « A-t-il payé ? » — la réponse d'un collègue-demandeur, dite dans le groupe : oui / non / impayé / je ne sais pas. Jamais un montant ni un nom. */
  async function verifierPaiement(k) {
    const slug = k.params.espace, dossier = dossierDe(slug) || '';
    const qui = citation(k.de);
    if (!dossier || !faitsPaiement) { direClients(qui + 'je ne retrouve pas de dossier pour cette demande de vérification : je ne peux pas te répondre.', 'info'); return { ok: false, resume: 'dossier introuvable' }; }
    let f = null; try { f = await faitsPaiement(dossier); } catch (e) { f = null; }
    const etat = f && f.paiement && typeof f.paiement.etat === 'string' ? f.paiement.etat : 'inconnu';
    const phrase = { paye: 'il a payé : l’abonnement est à jour', impaye: 'son paiement est en IMPAYÉ (carte refusée) : l’accès payant est suspendu jusqu’au règlement', aucun: 'je ne vois aucun paiement', inconnu: 'je ne sais pas : Stripe ne m’a pas répondu' }[etat] || 'je ne sais pas';
    direClients(qui + 'dossier ' + dossier + ' : ' + phrase + '.', 'info');
    return { ok: etat !== 'inconnu', resume: etat };
  }

  /* Les tâches que Hugo a reçues de ses collègues. Une à la fois, jamais deux passages en même temps ; chaque tâche se clôt (faite ou en échec). */
  let tachesEnCours = false;
  async function traiterTaches() {
    if (tachesEnCours) return { saute: 'deja_en_cours' };
    if (typeof agents.prendre !== 'function') return { saute: 'pas_de_file' };   // pas de file de tâches (un socle réduit) : rien à prendre, et rien à redemander à `peutAgir`
    tachesEnCours = true;
    try {
      let n = 0, faites = 0;
      while (n < TACHES_PAR_PASSAGE) {
        if (!agents.peutAgir(ID).ok) break;
        const k = agents.prendre(ID, TYPES_TACHES);
        if (!k) break;
        n++;
        let res;
        try {
          if (k.type === 'resilier_fin_periode') {
            /* Deux formes de la même demande (`AUTRES_FORMES_TACHE`, agents.js) : `{ espace }` (Justin, la file de validations) ou `{ dossier }` (Camille, qui ne connaît que le numéro de dossier
               du client). Le dossier se retrouve en espace ICI, par l'annuaire du serveur : un dossier qu'on ne retrouve pas ne devine aucun espace, il se DIT à Justin. */
            let slug = k.params.espace || '';
            if (!slug && k.params.dossier) { try { slug = (await espaceDeDossier(k.params.dossier)) || ''; } catch (e) { slug = ''; } }
            if (!slug) {
              dire('Je n’ai PAS programmé la fin d’abonnement du dossier ' + (k.params.dossier || '(sans numéro)') + ' : je ne retrouve pas d’entreprise pour ce numéro. Il faut que tu regardes.', 'urgent');
              res = { ok: false, resume: 'dossier introuvable' };
            } else {
              const r = await demanderFinAbonnement(slug, { de: k.de });
              res = { ok: !!(r && (r.ok || r.propose)), resume: r && (r.etat || (r.propose ? 'déposée en validation' : r.raison || r.saute)) };
            }
          }
          else res = await verifierPaiement(k);
        } catch (e) { res = { ok: false, resume: 'erreur' }; agents.noter(ID, 'tâche', { cible: k.type, resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) }); }
        agents.terminer(k.id, ID, res.ok ? 'ok' : 'echec', String(res.resume || ''));
        if (res.ok) faites++;
      }
      return { prises: n, faites };
    } finally { tachesEnCours = false; }
  }

  /* L'OUTIL de la messagerie (`agent-equipe.js`) : Justin écrit « @hugo, arrête l'abonnement du dossier DOS-000123 à la fin de la période ». ⛔ Il n'agit QUE si le message qui
     réveille Hugo est de Justin : un collègue passe par la tâche fermée, un texte de client n'arrive jamais jusqu'ici. */
  const OUTILS_EQUIPE = {
    outils: [{ name: 'programmer_fin_abonnement',
      description: 'Programmer la fin de l’abonnement OP GESTION d’un client À LA FIN DE LA PÉRIODE DÉJÀ RÉGLÉE (jamais d’arrêt immédiat, jamais de remboursement). À n’utiliser que si Justin le demande en citant un numéro de dossier (DOS- et six chiffres).',
      input_schema: { type: 'object', properties: { dossier: { type: 'string' } }, required: ['dossier'], additionalProperties: false } }],
    executer: async (nom, entree, c) => {
      if (nom !== 'programmer_fin_abonnement') return { ok: false, raison: 'outil_inconnu' };
      if (!c || c.de !== 'justin') return { ok: false, raison: 'pas_justin', ligne: 'Hugo ne programme une fin d’abonnement que sur une demande de Justin : un collègue passe par la demande fermée.' };
      const dossier = String((entree && entree.dossier) || '').toUpperCase();
      if (!FORME_DOSSIER.test(dossier)) return { ok: false, raison: 'dossier', ligne: 'Hugo n’a pas reçu un numéro de dossier valide (DOS- et six chiffres).' };
      /* ⛔ Le dossier doit VENIR du message de Justin : le modèle lit tout le fil, y compris ce que des collègues relaient d'un client — « le numéro vient du fil » ne vaut pas « Justin l'a cité ». */
      if (!(String((c && c.texte) || '').toUpperCase().match(/DOS-\d{6}/g) || []).includes(dossier)) return { ok: false, raison: 'dossier_non_cite', ligne: 'Hugo ne programme une fin d’abonnement que pour un dossier que Justin cite lui-même dans son message.' };
      const slug = await espaceDeDossier(dossier);
      if (!slug) return { ok: false, raison: 'espace', ligne: 'Hugo ne trouve pas d’espace pour le dossier ' + dossier + '.' };
      const r = await demanderFinAbonnement(slug, { de: 'justin' });
      return { ok: !!(r && (r.ok || r.propose)), raison: r && (r.raison || r.saute) };
    },
  };

  /* L'exécuteur de la validation « resilier_fin_periode » : Justin a accepté, Hugo programme la fin et accuse réception. */
  if (typeof agents.executeur === 'function') agents.executeur('resilier_fin_periode', async (params) => {
    const r = await executerResiliation(params && params.espace, { de: 'justin', valide: true });
    if (!r.ok) throw new Error('fin d’abonnement non programmée : ' + r.raison);
  });

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
    const t = String(sansAdr(texte) || '').slice(0, 1000);   /* même un message de Justin ne fait partir aucune adresse chez Anthropic */
    const numeros = [...new Set(t.toUpperCase().match(/DOS-\d{6}/g) || [])].slice(0, 3);
    let lignes = [];
    if (faits) for (const n of numeros) { let f = null; try { f = await faits(n); } catch (e) { f = null; } lignes.push(f ? JSON.stringify(f) : '{"numero":"' + n + '","lecture":"impossible"}'); }
    const system = SYSTEM + '\n' + require('./agents-fiches').bloc('hugo') + (lignes.length ? '\nFaits relevés par le serveur sur les dossiers cités (JSON, un par ligne) :\n' + lignes.join('\n') : '\nAucun dossier cité : tu n’as aucun fait client sous les yeux.');
    const r = await cerveau.penser(ID, system, [{ role: 'user', content: t }]);
    if (!r.ok) { if (r.raison === 'plafond_agent' || r.raison === 'plafond_total' || r.raison === 'pas_de_cle' || r.raison === 'erreur_api') dire('Je ne peux pas te répondre pour l’instant (' + ({ plafond_agent: 'mon budget du mois est atteint', plafond_total: 'le budget des agents est atteint', pas_de_cle: 'ma clé n’est pas posée', erreur_api: 'Claude ne répond pas' })[r.raison] + ').', 'important'); return { saute: r.raison }; }
    const d = conv.parler(ID, ID, r.texte, { niveau: 'info' });
    return d.ok ? { repondu: true } : { saute: d.raison };
  }

  return { passer, repondre, traiterTaches, demanderFinAbonnement, executerResiliation, outilsEquipe: OUTILS_EQUIPE };
};
module.exports.FORMULES = FORMULES;
