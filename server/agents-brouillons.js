/* LES BROUILLONS DE LÉA ET DE CAMILLE, ET CE QUI LES FAIT PARTIR (23 octobre 2026).
 *
 * Léa (inscriptions) et Camille (courrier reçu) préparent une réponse commerciale. Elle ne part JAMAIS d'elle-même : elle devient un
 * brouillon rangé ici, et une demande « envoyer_mail » dans la file de validations de Justin. Ce module est la pièce COMMUNE aux deux :
 *
 *   · le REGISTRE `agents-brouillons.json` (ref → brouillon) : écrit par un fichier temporaire puis un renommage, 500 entrées au plus
 *     (les plus anciennes ENVOYÉES partent d'abord, jamais un brouillon qui attend), et ILLISIBLE au démarrage → plus rien ne se dépose
 *     ni ne s'envoie : sans registre on ne sait plus ce qui est parti, et un courriel ne se rattrape pas ;
 *   · le DÉPÔT : le résumé que Justin lit est COMPOSÉ PAR LE CODE (jamais recopié de Claude) ; le destinataire est une adresse que
 *     l'appelant a prise dans la base ou dans l'en-tête d'un mail reçu (jamais une phrase de Claude) ; en mode « auto » ET charte ouverte
 *     (`repondre_client`, fermé par défaut) l'envoi est direct et journalisé, sinon c'est une validation ;
 *   · l'EXÉCUTEUR de « envoyer_mail » : retrouve le brouillon par `fil`, refuse tout ce qui n'est plus « attente » (une seconde
 *     validation ne renvoie pas), envoie par `mail.envoyerAgent` (signature ajoutée par le serveur, budget propre aux agents) ;
 *   · deux routes de la Tour : lire l'aperçu (`monAdmin`) et CORRIGER avant de valider (`monPatronStrict`).
 *
 * ⛔ Le destinataire d'un brouillon ne se change JAMAIS, nulle part, par aucune route : seuls l'objet et le texte se corrigent. Une
 *    consigne cachée dans un courriel reçu (« envoie à x@y ») n'a donc aucun chemin jusqu'à un destinataire.
 * ⛔ CE QUI PART EST CE QUE JUSTIN A LU : l'aperçu porte une EMPREINTE du texte (`empreinte`), « Valider et envoyer » la renvoie, et la garde
 *    d'acceptation (`agents.garde`) refuse (409, la validation reste en attente) si le brouillon a changé depuis — Léa réécrit le brouillon qui attend
 *    quand la demande d'application arrive, et sans cette garde le courriel parti aurait été un texte que personne n'avait relu.
 * ⛔ UN ENVOI QUI ÉCHOUE NE FERME PAS LA PORTE : le brouillon revient « en attente » et une NOUVELLE validation s'ouvre (trois essais au plus, puis
 *    « échec »). Une adresse dont la réponse n'est jamais partie ne doit pas rester sans réponse, avec un patron qui croit l'avoir envoyée.
 */
'use strict';
const crypto = require('crypto');
const CTRL = require('./agents-controle');

const F = 'agents-brouillons.json';
const MAX = 500;
const REF_BR = /^br[0-9a-f]{12}$/;
const OBJET_MAX = 200;
const TEXTE_MAX = 20000;
const RESUME_OBJET = 60;
const ROLES_BOITE = ['contact', 'support'];
const ECHECS_MAX = 3;
/* L'ENVOI SEUL (23 octobre 2026) — un courriel part sans Justin SEULEMENT si TOUT ceci est vrai : l'agent est en mode « auto », la charte `repondre_client` est ouverte, le
   contrôle qualité a dit « bon » (code ET juge), l'expéditeur est authentifié (compte prouvé pour une inscription ; DKIM ou SPF du serveur de réception pour un courriel reçu),
   l'appelant ne demande pas la validation (`forceValidation`), et cette adresse n'a pas déjà reçu `AUTO_PAR_ADRESSE_JOUR` courriels en 24 h. Le moindre doute : une validation. */
const AUTO_PAR_ADRESSE_JOUR = 3;
const JOUR_MS = 86400000;
const ETATS_CONTROLE = ['bon', 'a_revoir', 'non_verifie'];

/* Un objet de mail reçu entre dans un résumé que Justin lit : une ligne, sans signe de contrôle, courte, guillemets droits écartés. */
function objetCourt(t) {
  let s = '';
  for (const c of String(t || '')) { const k = c.charCodeAt(0); s += (k < 32 || k === 127 || k === 0x2028 || k === 0x2029) ? ' ' : c; }
  s = s.replace(/["“”«»]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > RESUME_OBJET ? s.slice(0, RESUME_OBJET - 1).trimEnd() + '…' : s;
}

/* Ce que Justin a lu : l'empreinte de l'objet ET du texte (le destinataire ne se change pas). Une réécriture, une correction : une autre empreinte. */
const empreinteDe = e => crypto.createHash('sha256').update('brouillon:' + String(e.objet) + '\n' + String(e.texte)).digest('hex').slice(0, 32);

/* Le résumé de la validation : une phrase fixe et ce qui l'identifie. Jamais un mot de Claude. Le contrôle qualité s'y lit d'un coup d'œil. */
function resumeDe(e) {
  const marque = e.controle && e.controle.etat === 'a_revoir' ? ' — À REVOIR (contrôle qualité)' : e.controle && e.controle.etat === 'non_verifie' ? ' — contrôle non fait' : '';
  if (e.source === 'courrier') return 'Réponse au mail “' + (objetCourt(e.objetRecu) || 'sans objet') + '” — à relire avant envoi' + marque;
  const qui = e.entreprise ? ' de ' + e.entreprise : '';
  if (e.source === 'demande') return 'Réponse à la demande' + qui + ' — à relire avant envoi' + marque;
  if (e.source === 'proposition') return 'Proposition sur mesure' + qui + ' — à relire avant envoi' + marque;
  return 'Réponse à l’inscription' + qui + ' — à relire avant envoi' + marque;
}
/* Le verdict du contrôle qualité tel qu'on le range : une forme fermée (jamais un texte de l'appelant). Sans verdict, ou avec un verdict inconnu : « non vérifié » — jamais « bon ». */
function controleRange(c) {
  if (!c || typeof c !== 'object' || !ETATS_CONTROLE.includes(c.etat)) return { etat: 'non_verifie', fautes: [], juge: false };
  return { etat: c.etat, fautes: (Array.isArray(c.fautes) ? c.fautes : []).filter(x => typeof x === 'string' && CTRL.FAUTES[x]).slice(0, 12), juge: c.juge === true,
    raison: typeof c.raison === 'string' ? c.raison.slice(0, 80) : undefined,
    /* la note de la grille de relecture (`agents-grille.js`), quand le mode « travail » l'a posée : des entiers de 1 à 5 par critère connu, et leur moyenne — jamais un texte */
    notes: c.notes && typeof c.notes === 'object' && !Array.isArray(c.notes) ? Object.fromEntries(Object.entries(c.notes).filter(([k, v]) => /^[a-z_]{3,20}$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 5).slice(0, 10)) : undefined,
    moyenne: typeof c.moyenne === 'number' && Number.isFinite(c.moyenne) && c.moyenne >= 1 && c.moyenne <= 5 ? c.moyenne : undefined,
    /* la ou les phrases du courriel que le juge a citées pour un fait inventé (des fragments du courriel lui-même, vérifiés par `agents-controle.js`) : Justin lit LAQUELLE est en cause */
    citations: Array.isArray(c.citations) ? c.citations.filter(x => typeof x === 'string' && x).map(x => x.slice(0, 220)).slice(0, 3) : undefined };
}

module.exports = function brouillons(app, ctx) {
  const { agents, mail } = ctx;
  /* La signature de chaque agent (`agents-signature.js`), posée à l'envoi : à défaut d'un module branché, la signature par défaut (un registre vide). */
  const signatures = ctx.signatures && typeof ctx.signatures.composer === 'function' ? ctx.signatures : require('./agents-signature')(null, { agents, fichier: ctx.fichier || require('./agents-fichier')(ctx.DATA_DIR) });
  /* Ce que Louis apprend d'une correction de Justin (`agent-louis.js`) : un crochet, jamais attendu, jamais cause d'échec. */
  const surCorrection = typeof ctx.surCorrection === 'function' ? ctx.surCorrection : null;
  const monAdmin = ctx.monAdmin, monPatronStrict = ctx.monPatronStrict;
  const direction = ctx.direction || null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const fich = ctx.fichier || require('./agents-fichier')(ctx.DATA_DIR);
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses
    : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));

  const reg = fich.charger(F, {});
  const enEnvoi = new Set();
  const sauve = () => fich.ecrire(F, reg);
  const illisible = () => fich.illisible(F);

  /* Faire de la place : les envoyés d'abord, puis les échecs, puis — en dernier recours — les plus vieux qui attendent encore. */
  function elaguer() {
    const refs = Object.keys(reg);
    if (refs.length <= MAX) return;
    const rang = r => (reg[r].etat === 'envoye' ? 0 : reg[r].etat === 'echec' ? 1 : 2);
    refs.sort((x, y) => rang(x) - rang(y) || (reg[x].cree || 0) - (reg[y].cree || 0));
    for (const r of refs.slice(0, refs.length - MAX)) delete reg[r];
  }

  const bonneAdresse = a => typeof a === 'string' && a.length <= 160 && /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/.test(a);

  /* Déposer un brouillon : `o` = { agent, a, objet, texte, enReponseA, boiteId?, role?, source, entreprise, objetRecu? }.
     Rend { ok:true, ref, voie:'validation'|'direct' } ou { ok:false, raison }. Ne jette pas. */
  async function deposer(o) {
    o = o || {};
    const agent = o.agent;
    if (!agents.AGENTS.some(a => a.id === agent)) return { ok: false, raison: 'agent' };
    const p = agents.peutAgir(agent);
    if (!p.ok) return { ok: false, raison: p.raison };
    if (p.horsHeures) return { ok: false, raison: 'hors_heures' };       // l'astreinte (Max, Théo) veille hors des heures mais n'écrit JAMAIS à un client
    if (illisible()) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'registre des brouillons illisible' }); return { ok: false, raison: 'registre_illisible' }; }
    const a = String(o.a || '').trim().toLowerCase();
    if (!bonneAdresse(a)) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'destinataire invalide' }); return { ok: false, raison: 'destinataire' }; }
    const objet = String(o.objet || '').replace(/[\r\n]+/g, ' ').trim();
    const texte = String(o.texte || '').trim();
    if (!objet || objet.length > OBJET_MAX || !texte || texte.length > TEXTE_MAX) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'objet ou texte hors bornes' }); return { ok: false, raison: 'forme' }; }
    const source = ['inscription', 'demande', 'courrier', 'proposition'].includes(o.source) ? o.source : null;
    if (!source) return { ok: false, raison: 'source' };
    const rep = o.enReponseA && typeof o.enReponseA === 'object' && o.enReponseA.mid ? {
      mid: String(o.enReponseA.mid).slice(0, 300), boiteId: String(o.enReponseA.boiteId || '').slice(0, 40),
      dossier: String(o.enReponseA.dossier || '').slice(0, 200), uid: parseInt(o.enReponseA.uid, 10) || 0 } : null;
    const toutes = mail.boites() || [];
    const boiteId = (typeof o.boiteId === 'string' && o.boiteId) || mail.boiteParRole(ROLES_BOITE.includes(o.role) ? o.role : 'contact');
    /* Le rôle que la validation affiche est celui de la boîte qui ENVOIE : « support » seulement si son adresse commence par support@ — une
       réponse à un mail arrivé sur une autre boîte ne se présente pas à Justin comme partant de « contact ». */
    const laBoite = toutes.find(b => b.id === boiteId);
    const role = laBoite && /^support@/i.test(String(laBoite.email || '')) ? 'support' : 'contact';
    if (!boiteId || !laBoite) { agents.noter(agent, 'déposer un brouillon', { cible: source, resultat: 'refuse', detail: 'aucune boîte connectée' }); return { ok: false, raison: 'pas_de_boite' }; }
    const ref = 'br' + crypto.randomBytes(6).toString('hex');
    reg[ref] = { agent, a, objet, texte, enReponseA: rep, boiteId, role, source, entreprise: String(o.entreprise || '').slice(0, 50),
      objetRecu: source === 'courrier' ? objetCourt(o.objetRecu) : '', cree: maintenant(), etat: 'attente', controle: controleRange(o.controle), authentifie: o.authentifie === true, reecrit: o.reecrit === true };
    elaguer();
    if (!sauve()) { delete reg[ref]; return { ok: false, raison: 'ecriture' }; }

    /* Seul le mode « auto » ET la charte ouverte ET un contrôle « bon » ET un expéditeur authentifié envoient sans Justin. Une charte illisible, un geste fermé, un mode « brouillon »,
       un doute du contrôle ou de l'authentification, trop de courriels déjà partis vers cette adresse : validation — et la raison s'écrit au journal. */
    const pas = [];
    if (p.mode !== 'auto') pas.push('mode ' + p.mode);
    if (!(direction && typeof direction.autorise === 'function' && direction.autorise('repondre_client').auto === true)) pas.push('charte fermée');
    if (reg[ref].controle.etat !== 'bon') pas.push('contrôle ' + reg[ref].controle.etat.replace('_', ' '));
    if (o.authentifie !== true) pas.push('expéditeur non authentifié');
    if (o.forceValidation === true) pas.push('validation demandée');
    if (!pas.length && envoyesRecents(a) >= AUTO_PAR_ADRESSE_JOUR) pas.push('déjà ' + AUTO_PAR_ADRESSE_JOUR + ' courriels en 24 h à cette adresse');
    const auto = pas.length === 0;
    if (!auto && p.mode === 'auto') agents.noter(agent, 'réponse laissée à la validation', { cible: source, resultat: 'ok', detail: pas.join(' ; ') });
    if (auto) {
      reg[ref].direct = true;   // parti SANS Justin : le bilan de la journée le distingue
      try {
        await envoyer(ref);
        agents.noter(agent, 'réponse envoyée sans validation', { cible: source, resultat: 'ok', detail: 'mode auto, charte ouverte, contrôle qualité bon' + (reg[ref].controle.juge ? ' (code et juge)' : ' (gabarit)') });
        return { ok: true, ref, voie: 'direct' };
      } catch (e) {
        /* l'envoi direct a échoué : `envoyer` a rouvert une validation (le brouillon attend Justin) si elle a pu — sinon il est en « échec » */
        if (reg[ref] && reg[ref].etat === 'attente' && agents.enAttentePour('envoyer_mail', 'fil', ref)) return { ok: true, ref, voie: 'validation', envoiEchoue: true };
        return { ok: false, raison: 'envoi', ref };
      }
    }
    const r = agents.proposer(agent, 'envoyer_mail', resumeDe(reg[ref]), { boite: role, fil: ref });
    if (!r.ok) { delete reg[ref]; sauve(); return { ok: false, raison: r.raison }; }
    return { ok: true, ref, voie: 'validation' };
  }

  /* Réécrire un brouillon qui attend encore (Léa, quand la demande d'application apporte plus que l'inscription). Même référence : la
     validation que Justin voit est la même, et son aperçu montre le texte à jour. */
  function reecrire(ref, objet, texte, source, controle) {
    const e = reg[ref];
    if (!e || e.etat !== 'attente' || illisible()) return false;
    /* ⛔ Ce que Justin a corrigé à la main ne se réécrit JAMAIS : sa correction vaut plus que la mienne, et la perdre en silence ferait relire
       deux fois le même courriel. */
    if (e.corrige) return false;
    const o = String(objet || '').replace(/[\r\n]+/g, ' ').trim(), t = String(texte || '').trim();
    if (!o || o.length > OBJET_MAX || !t || t.length > TEXTE_MAX) return false;
    const avant = { objet: e.objet, texte: e.texte, source: e.source, controle: e.controle };
    e.objet = o; e.texte = t; if (source === 'demande') e.source = 'demande';
    e.controle = controleRange(controle); e.reecrit = true;   // le verdict suit le NOUVEAU texte : un contrôle « bon » d'avant ne couvre pas ce qu'on vient de réécrire
    if (!sauve()) { Object.assign(e, avant); return false; }
    return true;
  }

  /* Le brouillon d'un agent pour CETTE adresse qui attend encore la décision de Justin (validation en cours), ou null. */
  function attenteDe(agent, adresse) {
    const a = String(adresse || '').trim().toLowerCase();
    for (const ref of Object.keys(reg)) {
      const e = reg[ref];
      if (e.agent === agent && e.a === a && e.etat === 'attente' && agents.enAttentePour('envoyer_mail', 'fil', ref)) return ref;
    }
    return null;
  }

  /* Combien de brouillons de cet agent attendent encore Justin POUR CETTE ADRESSE ? (Camille : un expéditeur ne remplit pas la file à lui seul.) */
  function nombreEnAttente(agent, adresse) {
    const a = String(adresse || '').trim().toLowerCase();
    let n = 0;
    for (const ref of Object.keys(reg)) {
      const e = reg[ref];
      if (e.agent === agent && e.a === a && e.etat === 'attente' && agents.enAttentePour('envoyer_mail', 'fil', ref)) n++;
    }
    return n;
  }
  /* L'état d'un brouillon ('attente' | 'envoye' | 'echec') ou null s'il n'est plus au registre. Léa s'en sert : une adresse dont l'envoi est en échec définitif
     peut recevoir une nouvelle préparation, une adresse déjà servie non. */
  const etatDe = ref => (reg[ref] ? reg[ref].etat : null);

  /* Combien de courriels sont PARTIS vers cette adresse ces dernières 24 h ? (le plafond de l'envoi seul) */
  function envoyesRecents(adresse) {
    const a = String(adresse || '').trim().toLowerCase(), limite = maintenant() - JOUR_MS;
    let n = 0;
    for (const ref of Object.keys(reg)) { const e = reg[ref]; if (e.a === a && e.etat === 'envoye' && (e.envoyeTs || 0) > limite) n++; }
    return n;
  }
  /* Le BILAN par agent (des NOMBRES, pour la conversation : « qu'as-tu envoyé aujourd'hui ? ») : envoyés et partis seuls ces 24 h, en attente, dont « à revoir ». */
  function bilan() {
    const now = maintenant(), out = {};
    for (const ref of Object.keys(reg)) {
      const e = reg[ref], o = out[e.agent] || (out[e.agent] = { envoyes24h: 0, partisSeuls24h: 0, enAttente: 0, aRevoir: 0 });
      if (e.etat === 'envoye' && (e.envoyeTs || 0) > now - JOUR_MS) { o.envoyes24h++; if (e.direct) o.partisSeuls24h++; }
      if (e.etat === 'attente') { o.enAttente++; if (e.controle && e.controle.etat === 'a_revoir') o.aRevoir++; }
    }
    return out;
  }
  /* Le dernier courriel ENVOYÉ à cette adresse par l'un de ces agents dans les `jours` derniers jours (Camille reconnaît ainsi la réponse d'un prospect à Léa). */
  function dernierEnvoiA(adresse, ids, jours) {
    const a = String(adresse || '').trim().toLowerCase(), limite = maintenant() - (jours || 60) * JOUR_MS;
    let best = null;
    for (const ref of Object.keys(reg)) {
      const e = reg[ref];
      if (e.a === a && e.etat === 'envoye' && (!ids || ids.includes(e.agent)) && (e.envoyeTs || 0) > limite && (!best || e.envoyeTs > best.envoyeTs)) best = { ref, agent: e.agent, source: e.source, envoyeTs: e.envoyeTs, entreprise: e.entreprise || '' };
    }
    return best;
  }
  /* Le courriel ENVOYÉ dont le Message-ID est l'un de ceux-ci (le In-Reply-To / References d'une réponse reçue). */
  function parMessageId(mids, ids) {
    const l = (Array.isArray(mids) ? mids : []).map(x => String(x)).filter(Boolean);
    if (!l.length) return null;
    for (const ref of Object.keys(reg)) { const e = reg[ref]; if (e.etat === 'envoye' && e.mid && l.includes(e.mid) && (!ids || ids.includes(e.agent))) return { ref, agent: e.agent, a: e.a, source: e.source, entreprise: e.entreprise || '' }; }
    return null;
  }

  /* CE QUE L'ÉQUIPE A DÉJÀ ÉCRIT à cette adresse (30 octobre 2026, outils de lecture du mode « travail ») : les `n` derniers courriels PARTIS ou en attente, du plus récent au plus ancien — l'agent
     ne se répète pas et ne contredit pas ce qui a été dit. Ce sont les mots de nos agents (jamais ceux d'un client), bornés ; l'adresse n'en fait pas partie. */
  function historiqueA(adresse, n) {
    const a = String(adresse || '').trim().toLowerCase(), now = maintenant();
    return Object.keys(reg).map(ref => reg[ref]).filter(e => e.a === a && (e.etat === 'envoye' || e.etat === 'attente'))
      .sort((x, y) => (y.envoyeTs || y.cree || 0) - (x.envoyeTs || x.cree || 0)).slice(0, Math.min(Math.max(parseInt(n, 10) || 3, 1), 5))
      .map(e => ({ agent: e.agent, source: e.source, etat: e.etat, ilYAJours: Math.max(0, Math.floor((now - (e.envoyeTs || e.cree || now)) / JOUR_MS)), objet: objetCourt(e.objet), extrait: String(e.texte || '').slice(0, 700) }));
  }

  /* Justin a-t-il déjà corrigé ce brouillon ? Léa le demande AVANT d'appeler Claude : réécrire ce qu'on n'a pas le droit de réécrire serait payer pour rien. */
  const estCorrige = ref => !!(reg[ref] && reg[ref].corrige === true);

  /* L'ENVOI. Jette si le brouillon n'existe pas, n'attend plus, ou est déjà en train de partir. */
  async function envoyer(ref) {
    if (illisible()) throw new Error('registre des brouillons illisible');
    const e = REF_BR.test(String(ref)) ? reg[ref] : null;
    if (!e) throw new Error('brouillon introuvable');
    if (e.etat !== 'attente') throw new Error('brouillon déjà ' + (e.etat === 'envoye' ? 'envoyé' : 'en échec'));
    if (enEnvoi.has(ref)) throw new Error('envoi déjà en cours');
    enEnvoi.add(ref);
    try {
      const laBoite = (mail.boites() || []).find(b => b.id === e.boiteId);
      const r = await mail.envoyerAgent({ boiteId: e.boiteId, a: e.a, objet: e.objet, texte: e.texte, enReponseA: e.enReponseA,
        signature: signatures.composer(e.agent, laBoite && laBoite.email), deNom: (agents.AGENTS.find(x => x.id === e.agent) || {}).nom ? (agents.AGENTS.find(x => x.id === e.agent).nom + ' — TeamOP') : 'TeamOP' });
      e.etat = 'envoye'; e.envoyeTs = maintenant(); if (r && typeof r.messageId === 'string') e.mid = r.messageId.slice(0, 300); sauve();
      agents.noter(e.agent, 'courriel envoyé', { cible: e.source, resultat: 'ok' });
    } catch (err) {
      e.erreur = String(sansAdr(String((err && err.message) || err))).slice(0, 120);
      e.echecs = (e.echecs || 0) + 1;
      /* ⛔ Le brouillon n'est PAS fini : il revient « en attente » et Justin reçoit une nouvelle validation — sinon l'adresse reste sans réponse et lui
         croit l'avoir envoyée. Trois essais au plus ; sans place dans la file (ou agent à l'arrêt), l'échec est définitif et se dit. */
      e.etat = e.echecs < ECHECS_MAX && rouvrir(ref, e) ? 'attente' : 'echec';
      sauve();
      agents.noter(e.agent, 'courriel envoyé', { cible: e.source, resultat: 'erreur', detail: e.erreur + (e.etat === 'attente' ? ' — nouvelle validation ouverte' : ' — plus d’essai') });
      throw err;
    } finally { enEnvoi.delete(ref); }
  }

  /* Rouvrir une validation pour un brouillon dont l'envoi a échoué. Vrai si une validation attend (la sienne, ou celle qu'on vient d'ouvrir). */
  function rouvrir(ref, e) {
    if (agents.enAttentePour('envoyer_mail', 'fil', ref)) return true;
    const r = agents.proposer(e.agent, 'envoyer_mail', resumeDe(e) + ' (envoi échoué : à renvoyer)', { boite: e.role === 'support' ? 'support' : 'contact', fil: ref });
    return !!(r && r.ok);
  }

  /* Ce que l'écran peut montrer : jamais l'objet du mail reçu (il est dans le résumé), jamais l'erreur brute. */
  const vue = e => {
    const c = controleRange(e.controle), laBoite = (mail.boites() || []).find(b => b.id === e.boiteId);
    /* la signature montrée est CELLE QUI PARTIRA : celle de l'agent, pour la boîte qui envoie (pas celle du Courrier de Justin) */
    return { agent: e.agent, a: e.a, objet: e.objet, texte: e.texte, source: e.source, entreprise: e.entreprise || '', etat: e.etat,
      empreinte: empreinteDe(e), echecs: e.echecs || 0, signature: signatures.composer(e.agent, laBoite && laBoite.email),
      controle: { etat: c.etat, fautes: CTRL.phrasesDe(c.fautes), juge: c.juge, reecrit: e.reecrit === true, raison: c.raison, citations: c.citations }, authentifie: e.authentifie === true };
  };

  /* ── les routes de la Tour ── */
  app.get('/api/monitor/agents/brouillons', monAdmin, (req, res) => {
    if (illisible()) return res.status(503).json({ error: 'Le registre des brouillons est illisible' });
    const refs = String(req.query.refs || '').split(',').map(x => x.trim()).filter(x => REF_BR.test(x)).slice(0, 50);
    const out = {};
    for (const r of refs) if (reg[r]) out[r] = vue(reg[r]);
    res.json(out);
  });
  app.post('/api/monitor/agents/brouillons/modifier', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (illisible()) return res.status(503).json({ error: 'Le registre des brouillons est illisible : rien n’est modifié' });
    if (typeof b.ref !== 'string' || !REF_BR.test(b.ref) || !reg[b.ref]) return res.status(404).json({ error: 'Brouillon inconnu' });
    if (typeof b.objet !== 'string' || typeof b.texte !== 'string') return res.status(400).json({ error: 'Objet et texte attendus' });
    const objet = b.objet.replace(/[\r\n]+/g, ' ').trim(), texte = b.texte.trim();
    if (!objet || !texte) return res.status(400).json({ error: 'L’objet et le texte ne peuvent pas être vides' });
    if (objet.length > OBJET_MAX) return res.status(400).json({ error: 'Objet trop long (' + OBJET_MAX + ' caractères au plus)' });
    if (texte.length > TEXTE_MAX) return res.status(400).json({ error: 'Texte trop long (' + TEXTE_MAX + ' caractères au plus)' });
    const e = reg[b.ref];
    if (e.etat !== 'attente') return res.status(409).json({ error: 'Ce brouillon est déjà ' + (e.etat === 'envoye' ? 'envoyé' : 'en échec') + ' : plus rien à corriger' });
    const avant = { objet: e.objet, texte: e.texte, corrige: e.corrige };
    e.objet = objet; e.texte = texte; e.corrige = true;
    if (!sauve()) { Object.assign(e, avant); if (avant.corrige === undefined) delete e.corrige; return res.status(503).json({ error: 'Correction non enregistrée' }); }
    agents.noter(e.agent, 'brouillon corrigé', { cible: b.ref, qui: req.tourUser && req.tourUser.nom });
    /* Louis regarde ce que Justin a corrigé (sans attendre, sans jamais faire échouer la correction) : une connaissance PROPOSÉE, validée par Justin plus tard. */
    if (surCorrection) { try { Promise.resolve(surCorrection({ agent: e.agent, avant: avant.texte, apres: e.texte })).catch(() => {}); } catch (x) {} }
    res.json({ ok: true, brouillon: vue(e) });
  });

  /* L'exécuteur : ce qui s'exécute quand Justin accepte. Il n'a que `fil` — le destinataire, l'objet et le texte sont ceux du registre. */
  agents.executeur('envoyer_mail', async (params) => { await envoyer(params && params.fil); });

  /* La garde d'acceptation : « Valider et envoyer » renvoie l'empreinte du texte que Justin a sous les yeux. ⛔ Elle est EXIGÉE : une acceptation sans elle (un
     appel direct, une Tour d'avant) ne dit pas ce qui a été lu. Les agents en pause ne s'exécutent pas — accepter pendant la pause rendrait la validation
     « décidée » sans que rien parte, et le brouillon resterait en attente sans validation : on refuse, la validation reste là. */
  agents.garde('envoyer_mail', (params, corps) => {
    if (illisible()) return 'Le registre des brouillons est illisible : rien ne part';
    if (agents.enPause()) return 'Les agents sont en pause : reprends-les avant de valider cet envoi (la demande reste en attente)';
    const e = REF_BR.test(String(params && params.fil)) ? reg[params.fil] : null;
    if (!e || e.etat !== 'attente') return '';   // rien à comparer : l'exécution dira ce qui s'est passé (introuvable, déjà envoyé)
    if (!corps || corps.empreinte !== empreinteDe(e)) return 'Le brouillon a changé depuis que tu l’as lu, ou n’a pas été relu : recharge la page et relis-le avant de valider';
    return '';
  });

  /* Les courriels PARTIS depuis `depuis` (23 octobre 2026 : Inès les relit avec les critères écrits). L'objet, le texte, l'agent et la source — JAMAIS l'adresse du destinataire. `null` si le
     registre est illisible : « on ne sait pas » n'est pas « rien n'est parti ». */
  const envoyes = depuis => (illisible() ? null : Object.keys(reg).map(ref => ({ ref, e: reg[ref] })).filter(x => x.e && x.e.etat === 'envoye' && (x.e.envoyeTs || 0) >= (depuis || 0))
    .map(x => ({ ref: x.ref, agent: x.e.agent, source: x.e.source, objet: x.e.objet, texte: x.e.texte, ts: x.e.envoyeTs })));
  return { deposer, reecrire, historiqueA, attenteDe, nombreEnAttente, etatDe, estCorrige, envoyer, illisible, envoyes, envoyesRecents, dernierEnvoiA, parMessageId, bilan, vue: ref => (reg[ref] ? vue(reg[ref]) : null), compter: () => Object.keys(reg).length };
};
module.exports.resumeDe = resumeDe;
module.exports.objetCourt = objetCourt;
module.exports.empreinteDe = empreinteDe;
module.exports.ECHECS_MAX = ECHECS_MAX;
module.exports.AUTO_PAR_ADRESSE_JOUR = AUTO_PAR_ADRESSE_JOUR;
