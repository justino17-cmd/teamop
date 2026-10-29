/* CONSTRUIRE LE VRAI PROMPT D'UN AGENT, AVEC LE VRAI MODULE — SANS RÉSEAU (28 octobre 2026).
 *
 * Les prompts des agents ne sont pas des fichiers : ils sont FABRIQUÉS par le code (`server/agent-*.js`) à partir d'un courriel, d'un fil, de faits fermés, des
 * connaissances de Louis, des tâches en cours. Une évaluation qui recopierait un prompt à la main évaluerait un prompt qui n'existe nulle part. Ce fichier monte donc,
 * dans un dossier jetable, les MÊMES établis que les bancs `test-28xx`/`test-29xx` (`tests/banc-agents-courrier.js` pour le courrier, `tests/banc-plateforme.js`
 * pour la messagerie) : les vrais `agents.js`, `conversations.js`, `cerveau.js`, `agent-camille.js`, `agent-lea.js`, `agent-chloe.js`, `agent-equipe.js`. Seul l'appel
 * réseau, `appeler`, est remplacé : il GARDE la requête que le module allait envoyer à Anthropic (`system`, `messages`, `tools`, `thinking`, `max_tokens` — exactement),
 * puis la confie à `repondre(requete)` — un modèle simulé ou le vrai.
 *
 * ⛔ On ne garde que la PREMIÈRE requête du rédacteur visé. Les suivantes (réécriture après le contrôle qualité, relecture du juge, Louis, les autres agents réveillés par
 * un @tous) reçoivent une réponse neutre, SANS appeler `repondre` : une évaluation paie un appel par cas, jamais cinq.
 * ⛔ Un module qui n'appelle pas Claude (plafond, horaires, filtre du code) est une ERREUR du cas, dite avec ce que le module a rendu : un cas qui n'évalue rien ne doit pas
 * passer pour un cas réussi (« une assertion sur un ensemble vide passe et ne prouve rien »).
 * ⛔ Rien de réel : adresses `@exemple-3132.fr`, noms inventés. Aucun courriel ni dossier de client n'entre ici, et la clé de l'API n'est jamais lue par ce fichier.
 */
'use strict';
const path = require('path');
const RACINE = path.join(__dirname, '..', '..');
const S = f => path.join(RACINE, 'server', f);

const NOMS = {}; for (const a of require(S('agents.js')).AGENTS) NOMS[a.id] = a.nom;
const clone = x => JSON.parse(JSON.stringify(x));
const attendre = ms => new Promise(r => setTimeout(r, ms));

/* La réponse du modèle (`{texte, actions}`) au format que `cerveau.js` lit : un texte seul, ou un objet avec des appels d'outil. */
const versCerveau = r => {
  const actions = Array.isArray(r && r.actions) ? r.actions : [];
  return actions.length ? { texte: String(r.texte || ''), actions, stop_reason: 'tool_use' } : { texte: String(r && r.texte || ''), stop_reason: 'end_turn' };
};

/* Capteur commun : la première requête dont le `system` commence par `debut` est confiée à `repondre`, les suivantes reçoivent la même réponse sans nouvel appel. */
function capteur(debut, repondre) {
  const etat = { requete: null, reponse: null, erreur: null, vues: 0 };
  let enCours = null;
  const claude = async (requete) => {
    etat.vues++;
    if (!String(requete.system).startsWith(debut)) return etat.reponse ? versCerveau(etat.reponse) : { texte: 'RAS' };   // un autre rédacteur (un collègue réveillé par @tous) : réponse neutre
    if (!enCours) {
      etat.requete = clone(requete);
      enCours = Promise.resolve().then(() => repondre(clone(requete))).then(r => { etat.reponse = r; }, e => { etat.erreur = e; });
    }
    await enCours;
    if (etat.erreur) throw etat.erreur;
    return versCerveau(etat.reponse);
  };
  return { etat, claude };
}

function terminer(etat, ou, rendu) {
  if (etat.erreur) throw etat.erreur;
  if (!etat.requete) throw new Error('le module n’a pas appelé Claude (' + ou + ') — il a rendu : ' + JSON.stringify(rendu).slice(0, 300));
  return { requete: etat.requete, reponse: etat.reponse };
}

/* ═══ le courrier entrant de Camille ═══ */
async function courrier(vars, repondre) {
  const { monter } = require(path.join(RACINE, 'tests', 'banc-agents-courrier.js'));
  const debut = 'Tu es Camille, l’assistante « Courrier et support »';
  const { etat, claude } = capteur(debut, repondre);
  const Z = monter({ modes: { camille: 'brouillon' }, sansChloe: true, claude });
  try {
    const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<pf3132@exemple-3132.fr>', de: 'prospect@exemple-3132.fr', deNom: 'Expéditeur', pour: 'contact@teamop.fr',
      objet: 'Bonjour', texte: '', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }, vars.mail || {});
    Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m;
    const r = await Z.camille.surNouveauMessage({ boiteId: m.boite, dossier: m.dossier, uid: m.uid, mid: m.mid, ts: m.ts });
    return terminer(etat, 'courrier', r);
  } finally { Z.nettoyer(); }
}

/* ═══ Léa : l'inscription ou la demande d'application ═══ */
async function lea(vars, repondre) {
  const { monter } = require(path.join(RACINE, 'tests', 'banc-agents-courrier.js'));
  const { etat, claude } = capteur('Tu es Léa, l’assistante « Onboarding et fidélisation »', repondre);
  const Z = monter({ modes: { lea: 'brouillon' }, sansChloe: true, claude });
  try {
    const l = Object.assign({ source: 'demande', email: 'prospect@exemple-3132.fr', entreprise: 'Entreprise Test', metier: 'nettoyage', users: 3, formule: '', besoin: '' }, vars.lea || {});
    const r = l.source === 'inscription' ? await Z.lea.surInscription({ email: l.email, entreprise: l.entreprise }) : await Z.lea.surDemande(l);
    return terminer(etat, 'léa', r);
  } finally { Z.nettoyer(); }
}

/* ═══ Chloé : la proposition, après la réponse d'un prospect à Léa ═══ */
async function chloe(vars, repondre) {
  const { monter, CHLOE_DEBUT } = require(path.join(RACINE, 'tests', 'banc-agents-courrier.js'));
  const { etat, claude } = capteur(CHLOE_DEBUT, repondre);
  const c = Object.assign({ adresse: 'prospect@exemple-3132.fr', texte: '', contexte: { entreprise: 'Toka Clim', metier: 'chauffage', users: 4, formule: 'pro' } }, vars.chloe || {});
  const Z = monter({ modes: { chloe: 'brouillon' }, sansChloe: true, claude, contexteClient: () => Object.assign({}, c.contexte) });
  try {
    const r = await Z.chloe.surReponse({ adresse: c.adresse, texte: c.texte, objetRecu: 'Re : TeamOP — OP GESTION pour votre activité', mid: '<pf3132-chloe@exemple-3132.fr>', boiteId: 'b-contact', dossier: 'INBOX', uid: 1, authentifie: true });
    return terminer(etat, 'chloé', r);
  } finally { Z.nettoyer(); }
}

/* ═══ la messagerie de l'équipe : Justin (ou un collègue) écrit dans un fil, l'agent cité répond avec ses outils ═══ */
async function equipe(vars, repondre) {
  const { monter } = require(path.join(RACINE, 'tests', 'banc-plateforme.js'));
  const id = vars.agent, nom = NOMS[id];
  if (!nom) throw new Error('agent inconnu : ' + id);
  const e = Object.assign({ fil: id, de: 'justin', texte: '', faits: {}, taches: [] }, vars.equipe || {});
  const { etat, claude } = capteur('Tu es ' + nom + ', l’agent « ', repondre);
  /* UN SEUL réveil nous intéresse : celui de l'agent visé. Les autres (un @tous réveille tout le fil) répondent « RAS » sans rien coûter (voir `capteur`). */
  let autres = 0;
  const visé = async (requete) => {
    if (!String(requete.system).startsWith('Tu es ' + nom + ', l’agent « ')) { autres++; return { texte: 'RAS' }; }
    return claude(requete);
  };
  let eq = null; const attente = [];
  const B = monter({ claude: visé, surMessage: m => { if (!eq) return null; const p = eq.surMessage(m); attente.push(p); return p; } });
  try {
    const f = {};
    for (const k of Object.keys(e.faits || {})) { const t = e.faits[k]; f[k] = async (n) => (n === undefined ? clone(t) : (t && t[n] !== undefined ? clone(t[n]) : { numero: n, existe: false })); }
    eq = require(S('agent-equipe.js'))({ agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, faits: f,
      /* Victor reçoit son sixième outil (« arbitrer ») : comme en production, où le module d'arbitrage est monté */
      arbitrer: () => ({ ok: true }) });
    for (const t of e.taches) { const r = B.agents.consigner('justin', t.pour, t.texte); if (!r.ok) throw new Error('tâche non posée (' + t.pour + ') : ' + r.raison); }
    const r = e.de === 'justin' ? B.conversations.justinEcrit(e.fil, e.texte) : B.conversations.parler(e.de, e.fil, e.texte, { niveau: 'info', prof: 1 });
    if (!r || !r.ok) throw new Error('le message n’a pas été écrit dans le fil « ' + e.fil + ' » : ' + JSON.stringify(r).slice(0, 200));
    for (let i = 0; i < 40 && !etat.requete; i++) await attendre(25);
    await Promise.allSettled(attente);
    for (let i = 0; i < 10 && attente.length; i++) { const n = attente.length; await Promise.allSettled(attente); if (attente.length === n) break; }
    /* `autres` : les collègues réveillés en plus (un @tous réveille tout le fil) — comptés, pour que le banc prouve qu'ils ont bien été réveillés ET qu'aucun n'a coûté un appel */
    return Object.assign(terminer(etat, 'messagerie · ' + nom, { mentions: r.mentions }), { autres });
  } finally { B.nettoyer(); }
}

const CANAUX = { courrier, lea, chloe, equipe };

/* Le point d'entrée : `vars.canal` choisit le module, `repondre(requete)` rend `{texte, actions?}`. Rend `{ requete, reponse }` (et `autres`, pour la messagerie). */
async function jouer(vars, repondre) {
  const f = CANAUX[vars && vars.canal];
  if (!f) throw new Error('canal inconnu : ' + (vars && vars.canal) + ' (permis : ' + Object.keys(CANAUX).join(', ') + ')');
  return f(vars, repondre);
}

module.exports = { jouer, CANAUX, NOMS };
