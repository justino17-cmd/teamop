/* INÈS — le contrôle qualité (23 octobre 2026). Catégories de la Tour : Agents, Rapport.
 *
 * Justin : « je veux une vraie équipe d'entreprise ». Chaque jour Inès RELIT ce que les agents ont envoyé ou décidé, avec des critères ÉCRITS, signale ce qu'elle trouve à l'agent
 * concerné et à Victor dans la messagerie, et prépare sa part « qualité » des réunions du lundi et du vendredi.
 *
 * Ce qu'elle relit :
 *  · LES COURRIELS PARTIS (le registre des brouillons : `envoyes()`) selon le cahier §8 — « Bonjour, » sans prénom, jamais « je suis Justin », vouvoiement, ni titres en capitales ni markdown,
 *    aucun crochet, aucune signature écrite par le modèle, TeamOP et OP GESTION présentés avec le « 15 € », quatre à sept questions de découverte au premier mail, l'essai seulement APRÈS le
 *    retour, aucun autre prix, aucune remise, aucune promesse, aucune adresse ni lien étranger (la règle `refusDe` de `agents-connaissance.js`, REPRISE : une seule définition de ce qui est
 *    interdit) ;
 *  · LE JOURNAL DES AGENTS : un agent dont plus de 30 % des gestes du jour sont des erreurs (au moins cinq gestes) ;
 *  · LES VALIDATIONS qui vieillissent : une demande en attente depuis plus de cinq jours expire à sept.
 *
 * ⛔ INÈS RELIT PAR LE CODE, ET NE PARLE PAS À CLAUDE : le texte d'un courriel envoyé à un client reste sur le serveur. Ce qui sort de sa lecture, ce sont des identifiants de critères (une liste
 *    fermée, `CRITERES`), des nombres et le prénom de l'agent — jamais un extrait, un objet, une adresse, un nom d'entreprise.
 * ⛔ ELLE NE CORRIGE RIEN, NE RETIRE RIEN, N'ENVOIE RIEN : un courriel parti est parti. Elle signale (une fois par jour, un seul message, ceux qui ont des fautes cités par leur nom et Victor) ;
 *    c'est l'agent — et Victor, qui arbitre — qui ajuste. Et rien ne l'oblige à parler : sans faute, pas de message (elle ne noie pas le fil), mais ses chiffres entrent dans le point de Victor.
 * ⛔ UN CONTRÔLE QUI N'A RIEN À LIRE LE DIT. Registre des courriels illisible ou absent : « pas relu », jamais « tout est conforme » ; le jour est noté comme tel.
 * ⛔ CES CRITÈRES SONT MÉCANIQUES ET BORNÉS : une phrase correcte peut en tromper un (vouvoiement). Ils signalent à relire, ils ne jugent pas. Ils ne remplacent pas le contrôle qualité d'AVANT
 *    l'envoi (celui qui décide si un courriel part) : ils le recoupent après coup.
 * Toutes les dépendances sont INJECTÉES.
 */
'use strict';
const K = require('./agents-connaissance');
const AC = require('./agent-conversation');
const O = require('./plateforme-outils');

const ID = 'ines';
const JOUR = 86400000;
const HEURE_RELECTURE = 7 * 60 + 30;          // 7 h 30, heure de Paris : avant le point de Victor
const JOURS_GARDES = 14;
const PREMIER_PASSAGE_JOURS = 30;   // la fenêtre du TOUT PREMIER passage (ensuite : depuis le dernier passage, sans borne)
const ERREURS_TAUX = 0.3, ERREURS_MIN_GESTES = 5;
const VALIDATION_ANCIENNE_JOURS = 5;           // elles expirent à 7

/* Les critères : une liste FERMÉE. `phrase` complète « … a … » : ce que l'agent lit. */
const CRITERES = {
  salutation: 'ne commence pas par « Bonjour, »',
  nom_justin: 'écrit le prénom du patron (la voix est celle de l’entreprise)',
  tutoiement: 'tutoie le client',
  markdown: 'garde de la mise en forme parasite (astérisques, dièses, accents graves)',
  capitales: 'a un titre en capitales',
  crochet: 'laisse un passage entre crochets',
  signature: 'porte une signature écrite (c’est le serveur qui la pose)',
  longueur: 'est trop court ou trop long',
  presentation: 'ne présente pas TeamOP, OP GESTION et le « 15 € »',
  questions: 'n’a pas entre quatre et sept questions de découverte',
  essai_tot: 'parle de l’essai avant le retour du client',
  objet: 'a un objet vide ou hors bornes',
  adresse: 'cite une adresse électronique étrangère',
  lien: 'cite un lien étranger',
  promesse: 'fait une promesse commerciale (gratuit, remise, garanti, sans engagement…)',
  telephone: 'cite un numéro de téléphone',
  prix: 'donne un autre prix que « 15 € »',
  remise: 'donne un pourcentage',
};
/* ce que `K.refusDe` répond, rangé dans les critères ci-dessus */
const DE_REFUS = { 'objet hors bornes': 'objet', 'texte hors bornes': 'longueur', 'adresse étrangère': 'adresse', 'lien étranger': 'lien', 'promesse commerciale': 'promesse', 'numéro de téléphone': 'telephone', 'prix étranger': 'prix', 'pourcentage': 'remise' };

/* Les critères §8 sur UN courriel : `{ objet, texte, source }` → la liste des identifiants fautifs (sans doublon, dans l'ordre de CRITERES). Pur. */
function controler(c) {
  const objet = String((c && c.objet) || ''), texte = String((c && c.texte) || '').replace(/\r/g, '');
  const source = ['inscription', 'demande', 'courrier'].includes(c && c.source) ? c.source : 'courrier';
  const f = new Set();
  const lignes = texte.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lignes.length || lignes[0] !== 'Bonjour,') f.add('salutation');
  if (/\bjustin\b/i.test(objet + '\n' + texte)) f.add('nom_justin');
  if (/\b(tu|toi)\b/i.test(texte) || (/\b(ton|ta|tes)\s+\p{L}/iu.test(texte) && !/\b(vous|votre|vos)\b/i.test(texte))) f.add('tutoiement');
  if (/\*\*|__|`|^\s*#{1,6}\s|^\s*[*•]\s/m.test(texte)) f.add('markdown');
  if (lignes.some(l => { const lettres = l.replace(/[^\p{L}]/gu, ''); return lettres.length >= 10 && lettres === lettres.toUpperCase() && /\s/.test(l.trim()); })) f.add('capitales');
  if (/\[[^\]\n]{1,100}\]/.test(objet + '\n' + texte)) f.add('crochet');
  if (/équipe\s*team\s?op|assistante?\s+virtuel/i.test(texte) || (lignes.length && !/cordialement,?$/i.test(lignes[lignes.length - 1]))) f.add('signature');
  if (texte.length > 4500) f.add('longueur');
  const commercial = source === 'inscription' || source === 'demande';
  if (commercial && texte.length < 400) f.add('longueur');
  if (commercial && !(/team\s?op/i.test(texte) && /OP GESTION/.test(texte) && /15\s?€/.test(texte))) f.add('presentation');
  if (source === 'inscription') {
    const n = lignes.filter(l => /\?$/.test(l)).length;
    if (n < 4 || n > 7) f.add('questions');
    /* « essai » : permis seulement comme une suite (« ensuite », « puis », « après »…) dans la même phrase, jamais comme une offre immédiate */
    for (const phrase of texte.split(/(?<=[.!?])\s+/)) if (/essai/i.test(phrase) && !/(ensuite|puis|après|dès réception|une fois|suite à)/i.test(phrase)) f.add('essai_tot');
  }
  const refus = K.refusDe(objet, texte);
  if (refus && DE_REFUS[refus]) f.add(DE_REFUS[refus]);
  return Object.keys(CRITERES).filter(k => f.has(k));
}

module.exports = function agentInes(ctx) {
  const { agents, conversations, etat } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  /* injectés : `courriels(depuis)` → [{ agent, source, objet, texte }] ou null ; `attentes()` → [{ agent, type, ts }] ou null */
  const courriels = typeof ctx.courriels === 'function' ? ctx.courriels : (() => null);
  const attentes = typeof ctx.attentes === 'function' ? ctx.attentes : (() => (agents && typeof agents.attentes === 'function' ? agents.attentes() : null));
  if (!agents || !conversations || !etat) return { passer: async () => ({ saute: 'pas_de_dependances' }), qualite: () => null, etat: () => ({}) };
  const nomDe = id => ((agents.AGENTS || []).find(a => a.id === id) || {}).nom || id;
  const note = (action, o) => { try { agents.noter(ID, action, o); } catch (e) {} };
  const parler = (fil, texte, niveau) => { try { return conversations.parler(ID, fil, texte, { niveau }); } catch (e) { return { ok: false, raison: 'erreur' }; } };
  const dit = d => d.ok || d.raison === 'doublon';
  const IDS = new Set((agents.AGENTS || []).map(a => a.id));

  /* ── la relecture d'une fenêtre : des NOMBRES et des identifiants de critères ── */
  function relire(depuis, now) {
    const r = { depuis, jusqua: now, courriels: null, parAgent: {}, fautes: {}, erreurs: {}, anciennes: null };
    const liste = (() => { try { return courriels(depuis); } catch (e) { return null; } })();
    if (Array.isArray(liste)) {
      r.courriels = { envoyes: 0, conformes: 0 };
      for (const c of liste) {
        if (!c || !IDS.has(c.agent)) continue;
        const fautes = controler(c);
        r.courriels.envoyes++;
        const a = r.parAgent[c.agent] || (r.parAgent[c.agent] = { envoyes: 0, aReprendre: 0, fautes: {} });
        a.envoyes++;
        if (!fautes.length) r.courriels.conformes++;
        else { a.aReprendre++; for (const k of fautes) { a.fautes[k] = (a.fautes[k] || 0) + 1; r.fautes[k] = (r.fautes[k] || 0) + 1; } }
      }
    }
    /* le journal : les gestes du jour (un changement de mode ou ce que la réunion écrit n'est pas du travail) */
    if (!(agents.journalIllisible && agents.journalIllisible())) {
      const par = {};
      for (const e of agents.lireJournal()) {
        if (!e || e.ts < depuis || e.ts > now || !IDS.has(e.agent) || e.agent === ID || e.action === 'mode' || /^réunion/.test(String(e.action))) continue;
        const p = par[e.agent] || (par[e.agent] = { gestes: 0, erreurs: 0 });
        p.gestes++; if (e.resultat === 'erreur') p.erreurs++;
      }
      for (const [id, p] of Object.entries(par)) if (p.gestes >= ERREURS_MIN_GESTES && p.erreurs / p.gestes >= ERREURS_TAUX) r.erreurs[id] = p;
    }
    const att = (() => { try { return attentes(); } catch (e) { return null; } })();
    if (Array.isArray(att)) {
      const vieilles = att.filter(x => now - x.ts >= VALIDATION_ANCIENNE_JOURS * JOUR);
      r.anciennes = { n: vieilles.length, plusVieilleJours: vieilles.reduce((m, x) => Math.max(m, Math.floor((now - x.ts) / JOUR)), 0), parAgent: {} };
      for (const x of vieilles) if (IDS.has(x.agent)) r.anciennes.parAgent[x.agent] = (r.anciennes.parAgent[x.agent] || 0) + 1;
    }
    return r;
  }

  /* ── ce qu'elle DIT : un message à l'équipe (les agents concernés et Victor), une ligne à Justin pour les validations ── */
  function messageEquipe(r) {
    const lignes = [], cites = [];
    for (const id of Object.keys(r.parAgent)) {
      const a = r.parAgent[id];
      if (!a.aReprendre) continue;
      const crit = Object.entries(a.fautes).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, n]) => CRITERES[k] + (n > 1 ? ' (' + n + ' fois)' : ''));
      lignes.push('@' + nomDe(id) + ' : ' + a.aReprendre + ' ' + O.pluriel(a.aReprendre, 'courriel', 'courriels') + ' sur ' + a.envoyes + ' à reprendre — un courriel ' + O.liste(crit));
      cites.push(id);
    }
    for (const id of Object.keys(r.erreurs)) {
      const p = r.erreurs[id];
      lignes.push((cites.includes(id) ? '' : '@' + nomDe(id) + ' : ') + p.erreurs + ' ' + O.pluriel(p.erreurs, 'erreur', 'erreurs') + ' sur ' + p.gestes + ' gestes');
      if (!cites.includes(id)) cites.push(id);
    }
    if (!lignes.length) return '';
    return 'Relecture du jour (mes critères du cahier, mécaniques : à relire, pas un jugement). ' + lignes.join(' ; ') + '. @Victor, pour toi.';
  }

  let enCours = false;
  /* Un passage = « est-ce l'heure et n'ai-je pas déjà relu aujourd'hui ? », puis la relecture. `forcer` : le geste de la Tour (« Passer maintenant »). */
  async function passer(o) {
    if (enCours) return { saute: 'en_cours' };
    enCours = true;
    try {
      const p = agents.peutAgir(ID);
      if (!p.ok) return { saute: p.raison };
      if (etat.illisible()) return { saute: 'memoire_illisible' };
      const now = maintenant(), jour = O.jourParis(now), pp = O.parisParties(now), m = etat.agent(ID);
      const forcer = !!(o && o.forcer);
      if (!forcer) {
        if (m.relu === jour) return { saute: 'deja_relu' };
        if (pp.heure * 60 + pp.minute < HEURE_RELECTURE) return { saute: 'pas_l_heure' };
      }
      /* (28 octobre 2026, Justin : « sans limite ») Elle relit depuis son DERNIER PASSAGE, quel qu'il soit : l'ancienne borne de 24 h laissait sans relecture tout ce qui s'était envoyé pendant qu'elle
         ne passait pas (serveur arrêté, Inès à l'arrêt ou en pause trois jours — ces courriels-là n'étaient jamais contrôlés). Au tout premier passage, trente jours : de quoi un premier bilan lisible. */
      const depuis = m.depuis > 0 ? m.depuis : now - PREMIER_PASSAGE_JOURS * JOUR;
      const r = relire(depuis, now);
      /* le rapport du jour est rangé AVANT de parler : même si le fil refuse, les chiffres de la semaine existent */
      if (!m.jours || typeof m.jours !== 'object' || Array.isArray(m.jours)) m.jours = {};
      m.jours[jour] = { ts: now, courriels: r.courriels, fautes: r.fautes, agents: Object.keys(r.erreurs).length, anciennes: r.anciennes ? r.anciennes.n : null };
      for (const k of Object.keys(m.jours).sort().slice(0, Math.max(0, Object.keys(m.jours).length - JOURS_GARDES))) delete m.jours[k];
      m.relu = jour; m.depuis = now; m.dernier = now;
      m.derniere = { courriels: r.courriels ? r.courriels : null, aReprendre: Object.values(r.parAgent).reduce((s, a) => s + a.aReprendre, 0), erreurs: Object.keys(r.erreurs).length, anciennes: r.anciennes ? r.anciennes.n : null, plusVieilleJours: r.anciennes ? r.anciennes.plusVieilleJours : null };
      etat.sauver();
      let dits = 0;
      const msg = messageEquipe(r);
      if (msg) {
        const d = parler('equipe', AC.raccourcir(msg), 'info');
        if (dit(d)) { dits++; note('relecture signalée', { cible: 'qualité', resultat: 'propose', detail: Object.keys(r.fautes).join(',') || 'erreurs' }); }
        else note('relecture signalée', { cible: 'qualité', resultat: 'refuse', detail: d.raison });
      }
      if (r.anciennes && r.anciennes.n > 0) {
        const qui = Object.entries(r.anciennes.parAgent).map(([id, n]) => nomDe(id) + ' (' + n + ')');
        const urgent = r.anciennes.plusVieilleJours >= 6;
        const d = parler(ID, 'Justin, ' + r.anciennes.n + ' ' + O.pluriel(r.anciennes.n, 'demande d’agent attend', 'demandes d’agents attendent') + ' ta décision depuis plus de ' + VALIDATION_ANCIENNE_JOURS + ' jours (la plus ancienne : ' + r.anciennes.plusVieilleJours + ' jours ; elles expirent à 7). De : ' + O.liste(qui) + '.', urgent ? 'important' : 'info');
        if (dit(d)) { dits++; note('validations anciennes signalées', { cible: 'validations', resultat: 'propose', detail: r.anciennes.n + ' demande(s)' }); }
      }
      return { relu: true, courriels: r.courriels, fautes: r.fautes, erreurs: Object.keys(r.erreurs), anciennes: r.anciennes ? r.anciennes.n : null, dits };
    } catch (e) {
      note('passage', { cible: 'qualité', resultat: 'erreur', detail: String((e && e.message) || e).slice(0, 100) });
      return { saute: 'erreur' };
    } finally { enCours = false; }
  }

  /* ── sa part « qualité » des réunions (`reunions.js`, faits de la semaine) : les jours relus entre deux instants, additionnés. Des nombres et des identifiants de critères. ── */
  function qualite(debut, fin) {
    if (etat.illisible()) return null;
    const jours = etat.agent(ID).jours;
    if (!jours || typeof jours !== 'object') return { joursRelus: 0 };
    const sortie = { joursRelus: 0, courrielsEnvoyes: 0, courrielsConformes: 0, fautes: {}, joursSansLecture: 0, validationsAnciennes: 0 };
    for (const j of Object.values(jours)) {
      if (!j || j.ts < debut || j.ts > fin) continue;
      sortie.joursRelus++;
      if (j.courriels) { sortie.courrielsEnvoyes += j.courriels.envoyes; sortie.courrielsConformes += j.courriels.conformes; } else sortie.joursSansLecture++;
      for (const [k, n] of Object.entries(j.fautes || {})) if (CRITERES[k]) sortie.fautes[k] = (sortie.fautes[k] || 0) + n;
      if (typeof j.anciennes === 'number') sortie.validationsAnciennes = Math.max(sortie.validationsAnciennes, j.anciennes);
    }
    return sortie;
  }

  const resume = () => { const m = etat.agent(ID); return { dernier: m.dernier || 0, relu: m.relu || '', illisible: etat.illisible(), derniere: m.derniere || null }; };
  /* le relevé fermé donné à la conversation (Inès elle-même, Victor) : le dernier jour relu */
  const faits = { qualite: () => { const m = etat.agent(ID); if (!m.derniere) return { relueLe: 0 }; const d = m.derniere; return { relueLe: m.relu ? 1 : 0, courrielsEnvoyes: d.courriels ? d.courriels.envoyes : null, courrielsConformes: d.courriels ? d.courriels.conformes : null, courrielsAReprendre: d.aReprendre, agentsEnErreur: d.erreurs, validationsAnciennes: d.anciennes, plusVieilleValidationJours: d.plusVieilleJours }; } };
  return { passer, qualite, etat: resume, faits, controler };
};
module.exports.controler = controler;
module.exports.CRITERES = CRITERES;
module.exports.HEURE_RELECTURE = HEURE_RELECTURE;
