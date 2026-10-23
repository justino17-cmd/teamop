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
 */
'use strict';
const crypto = require('crypto');

const F = 'agents-brouillons.json';
const MAX = 500;
const REF_BR = /^br[0-9a-f]{12}$/;
const OBJET_MAX = 200;
const TEXTE_MAX = 20000;
const RESUME_OBJET = 60;
const ROLES_BOITE = ['contact', 'support'];

/* Un objet de mail reçu entre dans un résumé que Justin lit : une ligne, sans signe de contrôle, courte, guillemets droits écartés. */
function objetCourt(t) {
  let s = '';
  for (const c of String(t || '')) { const k = c.charCodeAt(0); s += (k < 32 || k === 127 || k === 0x2028 || k === 0x2029) ? ' ' : c; }
  s = s.replace(/["“”«»]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > RESUME_OBJET ? s.slice(0, RESUME_OBJET - 1).trimEnd() + '…' : s;
}

/* Le résumé de la validation : une phrase fixe et ce qui l'identifie. Jamais un mot de Claude. */
function resumeDe(e) {
  if (e.source === 'courrier') return 'Réponse au mail “' + (objetCourt(e.objetRecu) || 'sans objet') + '” — à relire avant envoi';
  const qui = e.entreprise ? ' de ' + e.entreprise : '';
  if (e.source === 'demande') return 'Réponse à la demande' + qui + ' — à relire avant envoi';
  return 'Réponse à l’inscription' + qui + ' — à relire avant envoi';
}

module.exports = function brouillons(app, ctx) {
  const { agents, mail } = ctx;
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
    if (illisible()) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'registre des brouillons illisible' }); return { ok: false, raison: 'registre_illisible' }; }
    const a = String(o.a || '').trim().toLowerCase();
    if (!bonneAdresse(a)) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'destinataire invalide' }); return { ok: false, raison: 'destinataire' }; }
    const objet = String(o.objet || '').replace(/[\r\n]+/g, ' ').trim();
    const texte = String(o.texte || '').trim();
    if (!objet || objet.length > OBJET_MAX || !texte || texte.length > TEXTE_MAX) { agents.noter(agent, 'déposer un brouillon', { cible: o.source, resultat: 'refuse', detail: 'objet ou texte hors bornes' }); return { ok: false, raison: 'forme' }; }
    const source = ['inscription', 'demande', 'courrier'].includes(o.source) ? o.source : null;
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
    reg[ref] = { agent, a, objet, texte, enReponseA: rep, boiteId, source, entreprise: String(o.entreprise || '').slice(0, 50),
      objetRecu: source === 'courrier' ? objetCourt(o.objetRecu) : '', cree: maintenant(), etat: 'attente' };
    elaguer();
    if (!sauve()) { delete reg[ref]; return { ok: false, raison: 'ecriture' }; }

    /* Seul le mode « auto » ET la charte ouverte envoient sans Justin. Une charte illisible, un geste fermé, un mode « brouillon » : validation. */
    const auto = p.mode === 'auto' && direction && typeof direction.autorise === 'function' && direction.autorise('repondre_client').auto === true;
    if (auto) {
      try {
        await envoyer(ref);
        agents.noter(agent, 'réponse envoyée sans validation', { cible: source, resultat: 'ok', detail: 'mode auto, charte « répondre seul » ouverte' });
        return { ok: true, ref, voie: 'direct' };
      } catch (e) { return { ok: false, raison: 'envoi', ref }; }
    }
    const r = agents.proposer(agent, 'envoyer_mail', resumeDe(reg[ref]), { boite: role, fil: ref });
    if (!r.ok) { delete reg[ref]; sauve(); return { ok: false, raison: r.raison }; }
    return { ok: true, ref, voie: 'validation' };
  }

  /* Réécrire un brouillon qui attend encore (Léa, quand la demande d'application apporte plus que l'inscription). Même référence : la
     validation que Justin voit est la même, et son aperçu montre le texte à jour. */
  function reecrire(ref, objet, texte, source) {
    const e = reg[ref];
    if (!e || e.etat !== 'attente' || illisible()) return false;
    /* ⛔ Ce que Justin a corrigé à la main ne se réécrit JAMAIS : sa correction vaut plus que la mienne, et la perdre en silence ferait relire
       deux fois le même courriel. */
    if (e.corrige) return false;
    const o = String(objet || '').replace(/[\r\n]+/g, ' ').trim(), t = String(texte || '').trim();
    if (!o || o.length > OBJET_MAX || !t || t.length > TEXTE_MAX) return false;
    const avant = { objet: e.objet, texte: e.texte, source: e.source };
    e.objet = o; e.texte = t; if (source === 'demande') e.source = 'demande';
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
      await mail.envoyerAgent({ boiteId: e.boiteId, a: e.a, objet: e.objet, texte: e.texte, enReponseA: e.enReponseA });
      e.etat = 'envoye'; e.envoyeTs = maintenant(); sauve();
      agents.noter(e.agent, 'courriel envoyé', { cible: e.source, resultat: 'ok' });
    } catch (err) {
      e.etat = 'echec'; e.erreur = String(sansAdr(String((err && err.message) || err))).slice(0, 120); sauve();
      agents.noter(e.agent, 'courriel envoyé', { cible: e.source, resultat: 'erreur', detail: e.erreur });
      throw err;
    } finally { enEnvoi.delete(ref); }
  }

  /* Ce que l'écran peut montrer : jamais l'objet du mail reçu (il est dans le résumé), jamais l'erreur brute. */
  const vue = e => ({ agent: e.agent, a: e.a, objet: e.objet, texte: e.texte, source: e.source, entreprise: e.entreprise || '', etat: e.etat,
    signature: mail.signature ? mail.signature() : '' });

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
    res.json({ ok: true, brouillon: vue(e) });
  });

  /* L'exécuteur : ce qui s'exécute quand Justin accepte. Il n'a que `fil` — le destinataire, l'objet et le texte sont ceux du registre. */
  agents.executeur('envoyer_mail', async (params) => { await envoyer(params && params.fil); });

  return { deposer, reecrire, attenteDe, estCorrige, envoyer, illisible, vue: ref => (reg[ref] ? vue(reg[ref]) : null), compter: () => Object.keys(reg).length };
};
module.exports.resumeDe = resumeDe;
module.exports.objetCourt = objetCourt;
