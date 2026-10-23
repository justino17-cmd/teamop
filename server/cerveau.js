/* LE CERVEAU DES AGENTS (19 octobre 2026) — l'unique endroit où un agent appelle Claude.
 *
 * ⛔ Il n'AGIT sur rien : il rend du TEXTE. Ce que l'agent en fait passe par `peutAgir`, `proposer` ou `parler`, comme avant.
 * ⛔ Pas d'appel si l'agent n'a pas le droit d'agir (arrêt, pause, état illisible) — vérifié ICI, à chaque appel.
 * ⛔ Le BUDGET se tient ici : `agents-budget.json` {mois, parAgent:{id: dollars}}. Le plafond d'un agent est celui de son registre
 *    (`plafondUsd`) ; le total du mois ne dépasse jamais `TOTAL_USD` (195 $ : le crédit est de 200 $). Le coût est une ESTIMATION
 *    par les jetons rendus par l'API (tarif par million, constantes ci-dessous) : on se trompe vers le HAUT. Budget illisible ou
 *    non écrit → pas d'appel (« on ne sait pas » = on ne dépense pas). Le vrai plafond reste celui du workspace de la Console.
 * ⛔ La clé est `agents.cleApi` (jamais celle du Devis IA). Pas de clé → pas d'appel, et la raison se dit.
 * ⛔ Rien d'une personne n'entre dans le prompt par ce module : l'appelant décide de ce qu'il envoie, et envoie des FORMES FERMÉES.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const F = 'agents-budget.json';
const TOTAL_USD = 195;
const MODEL = 'claude-sonnet-5';
const USD_ENTREE_M = 3.5, USD_SORTIE_M = 17.5;   /* un peu au-dessus du tarif : on estime vers le haut */
const MAX_TOKENS = 600;
/* Ce qu'un appelant peut demander (`opts.maxTokens`) : borné des deux côtés. Sous 100, même « Bonjour » peut être coupé ; au-dessus de 4000,
   un agent qui boucle ferait payer une réponse sans fin sur un budget partagé de 195 $. */
const MAX_TOKENS_MIN = 100, MAX_TOKENS_MAX = 4000;
const TIMEOUT_MS = 30000;
/* `opts.reflechir === true` : la réponse d'un agent qui CONVERSE (23 octobre 2026, Justin : « des agents qui réfléchissent comme des humains »).
   La réflexion est alors adaptative — le modèle décide s'il en a besoin — et elle est prise SUR `max_tokens` : on laisse donc 3000 jetons (la
   réponse, elle, reste bornée à 600 caractères par l'appelant). Sans `reflechir`, rien ne change : `thinking` désactivé, 600 jetons. */
const MAX_TOKENS_REFLEXION = 3000;
function jetonsDemandes(opts) {
  const n = opts && typeof opts === 'object' ? opts.maxTokens : undefined;
  if (typeof n !== 'number' || !Number.isFinite(n)) return opts && typeof opts === 'object' && opts.reflechir === true ? MAX_TOKENS_REFLEXION : MAX_TOKENS;
  return Math.min(Math.max(Math.floor(n), MAX_TOKENS_MIN), MAX_TOKENS_MAX);
}
/* Les OUTILS qu'un agent peut appeler (tool use de l'API) : une liste FERMÉE que l'appelant écrit, jamais un réglage venu d'ailleurs. On ne garde
   d'une définition que son nom, sa description et son schéma d'entrée — une définition mal formée est écartée, pas corrigée. */
const NOM_OUTIL = /^[a-z][a-z_]{0,39}$/;
function outilsValides(opts) {
  const l = opts && typeof opts === 'object' && Array.isArray(opts.outils) ? opts.outils : [];
  const sortie = [];
  for (const o of l.slice(0, 12)) {
    if (!o || typeof o !== 'object' || typeof o.name !== 'string' || !NOM_OUTIL.test(o.name) || typeof o.description !== 'string') continue;
    const sc = o.input_schema;
    if (!sc || typeof sc !== 'object' || sc.type !== 'object' || !sc.properties || typeof sc.properties !== 'object') continue;
    sortie.push({ name: o.name, description: o.description.slice(0, 1500), input_schema: sc });
  }
  return sortie;
}

module.exports = function cerveau(ctx) {
  const { DATA_DIR, agents } = ctx;
  const cle = ctx.cleApi || '';
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const mois = () => new Date(maintenant()).toISOString().slice(0, 7);
  let illisible = false;
  function charger() {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, F), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return { mois: mois(), parAgent: {} }; illisible = true; return { mois: mois(), parAgent: {} }; }
    try { const j = JSON.parse(brut); if (!j || typeof j.mois !== 'string' || !j.parAgent || typeof j.parAgent !== 'object' || Array.isArray(j.parAgent)) throw new Error('forme'); return j; }
    catch (e) { illisible = true; return { mois: mois(), parAgent: {} }; }
  }
  let etat = charger();
  function ecrire() {
    if (illisible) return false;
    try { const f = path.join(DATA_DIR, F), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(etat)); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(F + ' non écrit :', e.message); return false; }
  }
  function moisCourant() { if (etat.mois !== mois()) etat = { mois: mois(), parAgent: {} }; }
  const depense = id => Number(etat.parAgent[id]) || 0;
  const total = () => Object.values(etat.parAgent).reduce((s, x) => s + (Number(x) || 0), 0);
  const plafond = id => { const a = agents.AGENTS.find(x => x.id === id); return a ? a.plafondUsd : 0; };

  /* Une question à Claude. `appeler` est injectable (banc) : `(cle, requete) → {texte, entree, sortie, stop_reason}`.
     `opts.maxTokens` (facultatif) : la longueur permise de la réponse, bornée entre 100 et 4000 ; sans lui, 600.
     ⛔ On n'envoie JAMAIS `temperature`, `top_p` ni `top_k` : l'API les refuse en 400 depuis le 21 octobre 2026, et un agent qui les
        enverrait se tairait sur une erreur d'API. Le banc (test-2860) relit la requête et exige leur absence. */
  async function penser(id, system, messages, opts) {
    if (illisible) return { ok: false, raison: 'budget_illisible' };
    if (!cle) return { ok: false, raison: 'pas_de_cle' };
    const p = agents.peutAgir(id);
    if (!p.ok) return { ok: false, raison: p.raison };
    moisCourant();
    if (depense(id) >= plafond(id)) return { ok: false, raison: 'plafond_agent' };
    if (total() >= TOTAL_USD) return { ok: false, raison: 'plafond_total' };
    if (typeof system !== 'string' || !Array.isArray(messages) || !messages.length) return { ok: false, raison: 'requete' };
    let r;
    /* ⛔ `thinking: disabled`, EXPRÈS. Sans ce réglage, Claude Sonnet 5 réfléchit d'office (mode adaptatif) et cette réflexion est prise
       sur `max_tokens` : avec 600 jetons, elle pouvait manger toute la réponse, qui revenait VIDE — et un échec « vide » est tu par les
       agents (rien à dire dans le fil). Un agent muet sans le dire est exactement la panne qu'on ne voit pas. Ici l'agent converse, il ne
       raisonne pas à longue portée : tous les jetons vont à la réponse. */
    const reflechir = !!(opts && typeof opts === 'object' && opts.reflechir === true);
    const outils = outilsValides(opts);
    const requete = { model: MODEL, max_tokens: jetonsDemandes(opts), thinking: reflechir ? { type: 'adaptive' } : { type: 'disabled' }, system, messages };
    /* `tool_choice: auto` : le modèle choisit d'appeler un outil ou de répondre — les seuls choix compatibles avec la réflexion. Et c'est le CODE
       de l'appelant qui valide chaque appel d'outil : ce que Claude « décide » n'est jamais exécuté tel quel. */
    if (outils.length) { requete.tools = outils; requete.tool_choice = { type: 'auto' }; }
    try { r = await (ctx.appeler || appelerAnthropic)(cle, requete); }
    catch (e) { agents.noter(id, 'penser', { cible: 'claude', resultat: 'erreur', detail: String(e && e.message || e).slice(0, 120) }); return { ok: false, raison: 'erreur_api' }; }
    const cout = ((Number(r.entree) || 0) * USD_ENTREE_M + (Number(r.sortie) || 0) * USD_SORTIE_M) / 1e6;
    moisCourant(); etat.parAgent[id] = depense(id) + (Number.isFinite(cout) ? cout : 0);
    if (!ecrire()) { agents.noter(id, 'penser', { cible: 'budget', resultat: 'erreur', detail: 'dépense non écrite : plus d’appel avant réparation' }); illisible = true; }
    const texte = String(r.texte || '').trim();
    /* Les appels d'outils rendus par l'API : un nom, un objet. Une forme inattendue est écartée ici ; la VALIDATION est celle de l'appelant. */
    const actions = [];
    if (outils.length && Array.isArray(r.actions)) for (const x of r.actions.slice(0, 8)) {
      if (x && typeof x.nom === 'string' && outils.some(o => o.name === x.nom) && x.entree && typeof x.entree === 'object' && !Array.isArray(x.entree)) actions.push({ id: String(x.id || ''), nom: x.nom, entree: x.entree });
    }
    if (!texte && actions.length) return { ok: true, texte: '', actions, cout };
    if (!texte) {
      /* Aucun texte parce que la réponse a atteint sa limite : ce n'est pas « vide », c'est « trop long » — l'appelant peut le DIRE
         (et le journal le garde, pour qu'on sache qu'il faut relever `maxTokens` plutôt que chercher une panne). */
      if (r.stop_reason === 'max_tokens') {
        agents.noter(id, 'penser', { cible: 'claude', resultat: 'erreur', detail: 'réponse coupée avant tout texte (max_tokens ' + requete.max_tokens + ')' });
        return { ok: false, raison: 'trop_long' };
      }
      return { ok: false, raison: 'vide' };
    }
    return outils.length ? { ok: true, texte, actions, cout } : { ok: true, texte, cout };
  }
  const etatBudget = () => ({ illisible, mois: etat.mois, total: total(), plafondTotal: TOTAL_USD, parAgent: Object.assign({}, etat.parAgent), cle: !!cle });
  /* IMPUTER (l'examen de l'équipe, 23 octobre 2026) : une dépense faite ailleurs avec la MÊME clé — les appels de l'examen se font sur une équipe d'essai, avec son propre
     cerveau, donc hors de ce fichier de budget — compte pourtant dans les 195 $ du mois. Elle s'inscrit sous un nom qui n'est PAS celui d'un agent (« examen ») : aucun
     plafond d'agent n'en est entamé, seul le total du mois l'est. Rend faux (rien d'écrit) pour un nom d'agent, un montant hors forme, ou un budget illisible. */
  function imputer(nom, usd) {
    if (illisible || typeof nom !== 'string' || !/^[a-z]{1,20}$/.test(nom) || agents.AGENTS.some(a => a.id === nom)) return false;
    if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0 || usd > 50) return false;
    moisCourant(); etat.parAgent[nom] = depense(nom) + usd;
    if (!ecrire()) { agents.noter('systeme', 'imputer', { cible: 'budget', resultat: 'erreur', detail: 'dépense non écrite : plus d’appel avant réparation' }); illisible = true; return false; }
    return true;
  }
  return { penser, etatBudget, imputer, MODEL };
};

async function appelerAnthropic(cle, requete) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: cle, timeout: TIMEOUT_MS, maxRetries: 0 });
  const rep = await client.messages.create(requete);
  if (rep.stop_reason === 'refusal') return { texte: '', entree: (rep.usage || {}).input_tokens, sortie: (rep.usage || {}).output_tokens, stop_reason: rep.stop_reason };
  /* Les blocs `thinking` ne sont jamais lus ; les blocs `tool_use` deviennent des actions à valider. */
  const blocs = rep.content || [];
  return { texte: blocs.filter(b => b.type === 'text').map(b => b.text).join('\n'), entree: (rep.usage || {}).input_tokens, sortie: (rep.usage || {}).output_tokens, stop_reason: rep.stop_reason,
    actions: blocs.filter(b => b.type === 'tool_use').map(b => ({ id: b.id, nom: b.name, entree: b.input })) };
}
