/* LA CONVERSATION DES QUINZE AUTRES AGENTS (22 octobre 2026) — Justin écrit à un agent dans la Tour (« Parler »), l'agent répond.
 *
 * Hugo garde son module (`agent-hugo.js`, qui a aussi un travail de fond). Ceux-ci n'ont, pour l'instant, que la CONVERSATION : un agent
 * qui ne répondait jamais, alors que la Tour proposait de lui parler.
 *
 * ⛔ Dans cette conversation un agent ne FAIT RIEN : il rend du texte. Rien ne se propose, ne se dépose ni ne s'exécute par ce chemin ;
 *    tout geste passe par une demande que Justin valide. Le `system` de chaque agent le dit, et ce module n'appelle de toute façon
 *    ni `proposer`, ni `deposer`, ni `rappelClient` — le banc (test-2861) le vérifie sur les registres du serveur après chaque réponse.
 * ⛔ Un agent à l'ARRÊT (ou en pause) ne répond pas, ne lit rien, n'appelle pas Claude : on le vérifie ICI avant même de relever les faits
 *    (le relevé de `/health` serait un appel pour rien), puis `cerveau.penser` et `conversations.parler` le revérifient — trois fois.
 * ⛔ Ce que Claude reçoit : l'historique du fil (huit messages, adresses et numéros masqués) et un bloc FAITS. Le bloc ne contient que des
 *    NOMBRES, des BOOLÉENS et des valeurs d'une LISTE FERMÉE ou un numéro de dossier — jamais un nom, une adresse, un téléphone, une note
 *    ni un texte écrit par un client. Les fonctions qui relèvent les faits sont injectées et rendent déjà des formes fermées ; `fermer`
 *    est la SECONDE barrière, pour le jour où l'une d'elles laisserait passer une chaîne libre : elle devient `null`, pas du texte.
 * ⛔ Une chaîne qui n'est pas dans la liste ne devient jamais « à peu près ». Ajouter une valeur à `LISTE` est un geste conscient.
 */
'use strict';

const FORME_DOSSIER = /^DOS-\d{6}$/;
const HISTORIQUE_N = 8;
const REPONSE_MAX = 600;            /* ce que `conversations.parler` garde : on coupe ICI, à une fin de phrase, plutôt que de laisser couper en plein mot */
const JETONS = 500;                 /* la réponse tient en 600 caractères (~200 jetons) : 500 laissent de la marge sans laisser un agent bavard coûter plus */
const MESSAGE_MAX = 1000;

/* Les valeurs de texte qui peuvent entrer dans un fait : celles d'une liste, écrites ICI et nulle part ailleurs. */
const LISTE = new Set(['pro', 'business', 'premium', 'gratuit', 'essai', 'paye', 'impaye', 'aucun', 'inconnu', 'autre',
  'arret', 'brouillon', 'auto', 'OP GESTION', 'OP MESSAGES', 'en attente', 'traitée', 'classée']);
const LISTE_BAS = new Map([...LISTE].map(x => [x.toLowerCase(), x]));
const CLE_FAIT = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;

/* Seconde barrière : on ne garde d'un fait que ce qui est fermé. */
function fermer(v, prof) {
  prof = prof || 0;
  if (prof > 5) return null;
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    if (v === '') return '';
    if (FORME_DOSSIER.test(v)) return v;
    return LISTE_BAS.get(v.trim().toLowerCase()) || null;
  }
  if (Array.isArray(v)) return v.slice(0, 50).map(x => fermer(x, prof + 1));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).slice(0, 60)) if (CLE_FAIT.test(k)) o[k] = fermer(v[k], prof + 1);
    return o;
  }
  return null;
}

/* Une adresse électronique ou un numéro de téléphone ne part jamais chez Claude, même écrit par Justin. Neuf chiffres au moins : une date
   (« 2026-10-22 », huit) ou un numéro de dossier (six) ne sont pas des téléphones. */
const ADRESSE = /[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g;
const TEL = /\+?\d[\d .\-()]{6,}\d/g;
const sansTel = t => String(t || '').replace(TEL, m => (m.replace(/\D/g, '').length >= 9 ? '(numéro)' : m));

/* ── Qui est qui. Une entrée par agent du registre, SAUF Hugo (son module). `faits` : les relevés que le rôle a le droit de voir.
      `rien` : la règle « tu ne peux rien faire » est répétée à part — l'argent et la sécurité sont ce qu'on ne veut pas voir promis. ── */
const ROLES = {
  victor:  { faits: ['sante', 'equipe', 'courrier', 'clients'],
    mission: 'Tu coordonnes l’équipe d’agents : qui fait quoi, ce qui attend une validation de Justin, les tâches que les agents se passent. Tu réponds aussi dans le fil « Équipe », commun à tous.' },
  ines:    { faits: ['sante'],
    mission: 'Tu contrôles la qualité : tu relis le travail des autres agents et l’état du produit pour signaler ce qui cloche avant que Justin ne le découvre.' },
  camille: { faits: ['courrier', 'dossier', 'commercial'],
    mission: 'Tu t’occupes de TOUT le courrier de contact@ et de support@ : tu réponds aux questions sur l’application, tu passes les factures à Margaux et les problèmes techniques à Jules, tu transmets les demandes d’arrêt à Hugo (une demande fermée, seulement si l’expéditeur est sûr), tu refuses poliment les remboursements et tu remontes les litiges à Justin. Tu n’écris et n’envoies aucun courriel dans cette conversation : tu rends compte de ce que tu as fait.' },
  margaux: { faits: ['dossier'], rien: 'Tu ne peux RIEN faire sur l’argent : ni facture, ni remboursement, ni avoir, ni relance de paiement, ni écriture comptable. Tu expliques et tu proposes ; Justin décide.',
    mission: 'Tu t’occupes de la facturation et de la comptabilité : les factures, les paiements, ce que doit ou a payé un client.' },
  lea:     { faits: ['clients', 'dossier', 'commercial'],
    mission: 'Tu t’occupes de l’onboarding et de la fidélisation : à chaque nouvelle inscription tu te renseignes sur l’entreprise puis tu lui écris le premier courriel (il passe un contrôle qualité, puis part signé de ton prénom), et tu veilles à ce que les nouveaux clients démarrent bien dans l’application. Tu n’écris aucun courriel dans cette conversation : tu rends compte de ce que tu as fait.' },
  max:     { faits: ['sante'],
    mission: 'Tu es la sentinelle : tu surveilles la santé du serveur et du site (disponibilité, erreurs, sauvegardes, refus) et tu dis ce qui est anormal.' },
  nina:    { faits: ['sante'], rien: 'Tu ne peux RIEN faire sur la sécurité : tu ne changes aucun accès, aucun mot de passe, aucune règle ; tu n’effaces aucune donnée de client. Tu analyses et tu recommandes ; Justin décide.',
    mission: 'Tu t’occupes de la sécurité et du RGPD : les accès, les refus, les données personnelles, ce que la loi demande de protéger.' },
  theo:    { faits: ['sante'],
    mission: 'Tu t’occupes des sauvegardes et des données : la sauvegarde hors site est-elle faite, récente, restaurable ; les données de l’entreprise sont-elles à l’abri.' },
  jules:   { faits: ['sante'],
    mission: 'Tu t’occupes de la maintenance du code : les erreurs de l’application, les dépendances, ce qu’il faudrait corriger. Tu ne modifies aucun code dans cette conversation.' },
  chloe:   { faits: ['commercial'],
    mission: 'Tu écris la proposition sur mesure quand un prospect répond au premier courriel de Léa : la formule, les rubriques utiles à son métier, celles qu’on retire sans les facturer, les catégories qu’on peut créer pour lui, puis la semaine d’essai. Tu connais aussi les devis et les interventions d’OP GESTION. Tu n’écris aucun courriel dans cette conversation : tu rends compte de ce que tu as fait.' },
  emma:    { faits: [],
    mission: 'Tu t’occupes des réunions et de l’agenda : préparer, planifier et résumer les réunions de Justin.' },
  louis:   { faits: ['commercial'],
    mission: 'Tu tiens la base de connaissances de Léa, de Camille et de Chloé : tu proposes des entrées (une question, sa réponse) quand Camille n’a pas su répondre ou que Justin corrige un courriel ; Justin seul les valide, et seules les entrées validées servent. Tu expliques aussi OP GESTION simplement et tu écris les pages d’aide.' },
  sarah:   { faits: [],
    mission: 'Tu t’occupes de la communication : le ton, les annonces, les textes que Team OP adresse à ses clients et au public.' },
  lola:    { faits: [],
    mission: 'Tu t’occupes d’Instagram : idées de publications, légendes, calendrier. Tu ne publies rien dans cette conversation.' },
  noah:    { faits: [],
    mission: 'Tu t’occupes de la réputation et de la visibilité : les avis, la façon dont Team OP apparaît en ligne.' },
};

function systemDe(agent, r) {
  return 'Tu es ' + agent.nom + ', l’agent « ' + agent.role + ' » de Team OP. ' +
    'Team OP édite deux applications pour les entreprises de terrain (nettoyage, lutte anti-nuisibles) : OP GESTION, la gestion des interventions — planning, interventions et rapports PDF, contrats d’entretien, clients, devis et factures, stock, pointage — et OP MESSAGES, la messagerie, bientôt disponible. ' +
    'Tu parles à Justin, le fondateur, que tu tutoies comme un collègue, en français, avec des phrases courtes et concrètes.\n' +
    r.mission + '\n' +
    'Règles :\n' +
    '- Dans cette conversation tu ne peux RIEN exécuter : tout geste passe par une demande que Justin valide dans la Tour. Tu ne promets jamais d’avoir fait quelque chose.\n' +
    (r.rien ? '- ' + r.rien + '\n' : '') +
    '- Tu ne cites que les faits du bloc Faits ci-dessous. Si tu ne sais pas, tu le dis : tu n’inventes ni chiffre, ni nom, ni date.\n' +
    '- Ne répète jamais une adresse électronique ni un numéro de téléphone.\n' +
    '- Réponse courte : 600 caractères au plus, concrète, sans titre ni liste à puces.';
}

/* Ce qu'on dit dans le fil quand la réponse est impossible POUR UNE RAISON QUE JUSTIN PEUT LEVER OU DOIT SAVOIR. Les autres échecs
   (arrêt, pause, registre illisible, réponse vide) restent muets : un agent à l'arrêt ne parle pas. */
const CAUSES = {
  plafond_agent: 'mon budget du mois est atteint',
  plafond_total: 'le budget des agents est atteint',
  /* le budget du JOUR (28 octobre 2026, `cerveau.js`) : un agent qui travaille seul a dépensé sa part de la journée ; ou le filet de toute l'équipe est atteint. Il reprend demain matin. */
  plafond_jour: 'mon budget du jour est atteint : je reprends demain matin',
  filet_jour: 'le budget du jour de toute l’équipe est atteint : tout reprend demain matin',
  pas_de_cle: 'ma clé n’est pas posée',
  erreur_api: 'Claude ne répond pas',
  trop_long: 'ma réponse dépassait la longueur permise : pose-moi une question plus précise',
};

/* Couper à ≤ 600 caractères à une fin de phrase (sinon au dernier mot), au lieu de laisser `parler` trancher en plein mot. */
function raccourcir(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t.length <= REPONSE_MAX) return t;
  const tete = t.slice(0, REPONSE_MAX);
  const fin = Math.max(tete.lastIndexOf('. '), tete.lastIndexOf('! '), tete.lastIndexOf('? '));
  if (fin >= 200) return tete.slice(0, fin + 1);
  const mot = tete.lastIndexOf(' ');
  return (mot >= 200 ? tete.slice(0, mot) : tete.slice(0, REPONSE_MAX - 1)) + '…';
}

module.exports = function agentConversation(ctx) {
  const { agents, conversations, cerveau } = ctx;
  const faits = ctx.faits && typeof ctx.faits === 'object' ? ctx.faits : {};
  /* ⛔ PAS le `sansAdresses` du serveur : il garde l'initiale et le DOMAINE (« j***@entreprise.fr »), très bien pour un journal que Justin lit,
     pas pour ce qui part chez Anthropic — le domaine d'un client EST un nom de client. Ici, tout devient « (adresse) ». */
  const sansAdr = t => String(t || '').replace(ADRESSE, '(adresse)');
  if (!agents || !Array.isArray(agents.AGENTS) || !conversations || typeof conversations.historique !== 'function' || typeof conversations.parler !== 'function' || !cerveau || typeof cerveau.penser !== 'function') {
    return { ids: [], repondre: async () => ({ saute: 'pas_de_cerveau' }) };
  }
  const registre = new Map(agents.AGENTS.map(a => [a.id, a]));
  const ids = agents.AGENTS.map(a => a.id).filter(id => id !== 'hugo' && ROLES[id]);
  const IDS = new Set(ids);
  const SYSTEM = {}; for (const id of ids) SYSTEM[id] = systemDe(registre.get(id), ROLES[id]);
  /* La mémoire d'équipe de l'agent (leçons et objectifs des réunions, `reunions.js`) : injectée, lue À CHAQUE réponse (elle change chaque semaine). */
  const memoire = id => { try { return typeof ctx.memoire === 'function' ? String(ctx.memoire(id) || '') : ''; } catch (e) { return ''; } };
  const masquer = t => sansTel(sansAdr(String(t || '')));
  const nettoyer = t => masquer(t).replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX);

  /* L'historique du fil en messages pour Claude : `user` (Justin, ou un autre agent dans « Équipe », nommé) et `assistant` (l'agent),
     consécutifs fusionnés, jamais un `assistant` en tête, TOUJOURS un `user` à la fin. Le message que Justin vient d'écrire est déjà dans
     l'historique (la route l'enregistre avant d'appeler) ; s'il n'y est pas (ou si un agent a parlé après lui), on l'ajoute. */
  function messagesDe(fil, id, texte) {
    const brut = [];
    for (const m of conversations.historique(fil, HISTORIQUE_N)) {
      const t = nettoyer(m.texte); if (!t) continue;
      if (m.de === id) brut.push({ role: 'assistant', texte: t });
      else if (m.de === 'justin') brut.push({ role: 'user', texte: t });
      else brut.push({ role: 'user', texte: '[' + ((registre.get(m.de) || {}).nom || 'un agent') + ' a écrit dans le fil Équipe] ' + t });
    }
    while (brut.length && brut[0].role === 'assistant') brut.shift();
    if (!brut.length || brut[brut.length - 1].role !== 'user') { const t = nettoyer(texte); if (t) brut.push({ role: 'user', texte: t }); }
    const messages = [];
    for (const m of brut) {
      const dernier = messages[messages.length - 1];
      if (dernier && dernier.role === m.role) dernier.content += '\n' + m.texte; else messages.push({ role: m.role, content: m.texte });
    }
    return messages;
  }

  /* Les numéros de dossier cités par Justin dans les derniers messages, du plus récent au plus ancien, trois au plus. */
  function dossiersCites(fil) {
    const vus = [];
    const lus = conversations.historique(fil, HISTORIQUE_N).filter(m => m.de === 'justin').reverse();
    for (const m of lus) for (const n of (String(m.texte).toUpperCase().match(/DOS-\d{6}/g) || [])) if (!vus.includes(n) && vus.length < 3) vus.push(n);
    return vus;
  }

  async function lire(f, ...args) {
    if (typeof faits[f] !== 'function') return null;
    try { const r = await faits[f](...args); return r == null ? null : fermer(r); } catch (e) { return null; }
  }

  async function blocFaits(id, fil) {
    const voulus = ROLES[id].faits;
    if (!voulus.length) return '\nBloc Faits : aucun fait n’est fourni à ton rôle — tu ne connais que ta mission ; pour tout chiffre ou toute donnée, tu dis que tu ne sais pas.';
    const lignes = [];
    for (const f of voulus) {
      if (f === 'dossier') {
        const nums = dossiersCites(fil);
        if (!nums.length) { lignes.push('dossier : aucun dossier cité, tu n’as aucun fait client sous les yeux'); continue; }
        for (const n of nums) { const r = await lire('dossier', n); lignes.push('dossier ' + n + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r)); }
        continue;
      }
      const r = await lire(f);
      lignes.push(f + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r));
    }
    return '\nBloc Faits (relevés par le serveur à l’instant — ta seule source de chiffres ; « lecture impossible » veut dire que tu ne sais pas) :\n' + lignes.join('\n');
  }

  const dire = (id, fil, texte, niveau) => { try { return conversations.parler(id, fil, texte, { niveau }); } catch (e) { return { ok: false, raison: 'erreur' }; } };

  async function travail(fil, texte) {
    const id = fil === 'equipe' ? 'victor' : fil;
    if (!IDS.has(id)) return { saute: 'pas_de_cerveau' };
    const p = agents.peutAgir(id);
    if (!p.ok) return { saute: p.raison };          /* à l'arrêt : ni faits, ni Claude, ni mot */
    const messages = messagesDe(fil, id, texte);
    if (!messages.length) return { saute: 'vide' };
    const system = SYSTEM[id] + memoire(id) + await blocFaits(id, fil);
    const r = await cerveau.penser(id, system, messages, { maxTokens: JETONS });
    if (!r.ok) {
      if (Object.prototype.hasOwnProperty.call(CAUSES, r.raison)) dire(id, fil, 'Je ne peux pas te répondre pour l’instant (' + CAUSES[r.raison] + ').', 'important');
      return { saute: r.raison };
    }
    const d = dire(id, fil, raccourcir(masquer(r.texte)), 'info');
    return d.ok ? { repondu: true } : { saute: d.raison };
  }
  /* (La réponse de Claude passe par les mêmes masques qu'un message de Justin, mais n'est pas coupée à 1000 caractères : `raccourcir` la borne.) */

  /* Une réponse à la fois par fil : deux messages de Justin rapprochés donnent deux réponses dans l'ordre, la seconde voyant la première
     (sinon l'historique aurait deux questions et une réponse arrivée « avant » l'autre). */
  const files = new Map();
  function repondre(fil, texte) {
    const f = String(fil || '');
    const suite = (files.get(f) || Promise.resolve()).catch(() => {}).then(() => travail(f, texte));
    files.set(f, suite);
    const nettoie = () => { if (files.get(f) === suite) files.delete(f); };
    suite.then(nettoie, nettoie);
    return suite;
  }

  return { ids, repondre };
};
module.exports.ROLES = ROLES;
module.exports.fermer = fermer;
module.exports.LISTE = LISTE;
/* Repris par la messagerie des agents (`agent-equipe.js`) : une seule définition de la coupe, des masques et des phrases de panne. */
module.exports.raccourcir = raccourcir;
module.exports.sansTel = sansTel;
module.exports.ADRESSE = ADRESSE;
module.exports.CAUSES = CAUSES;
module.exports.FORME_DOSSIER = FORME_DOSSIER;
