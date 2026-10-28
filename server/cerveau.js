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
 * ⛔ LE BUDGET DU JOUR (28 octobre 2026, Justin : « la limite des messages, ça va pas être possible » — l'heure était un mauvais garde-fou, le DOLLAR est le bon). `agents-budget.json` porte aussi
 *    `jour: { j, parAgent, nonRacine, racine, alertes }` (même écriture atomique ; il repart à zéro à minuit, heure de Paris) :
 *    · un appel SANS racine (un agent qui travaille seul : un courriel à traiter, une surveillance) est refusé (`plafond_jour`) quand l'agent a dépensé aujourd'hui max(1,50 $, 20 % de son plafond du
 *      mois), ou quand tout ce qui est sans racine dépasse 25 $ — Camille traite l'arriéré de courriels sans racine, on ne l'arrête pas en pleine tâche pour un centime ;
 *    · un appel AVEC racine (`opts.racine === true` : l'appelant l'a VALIDÉE contre un message de Justin, `conversations.racine`) n'a pas le plafond d'agent du jour : il est borné par les 4 $ de la
 *      racine (`conversations.js`) ;
 *    · UN FILET pour les deux : 60 $ par jour, tous appels confondus (`filet_jour`) — le jeton du pont volé fabrique au plus 60 racines par heure à 4 $, c'est ce filet qui le coupe ;
 *    · une alerte à 80 % du plafond d'un agent (une par agent et par jour), une à 100 %, une au filet : `ctx.surBudget({type, …})` — l'appelant décide d'une notification ou d'une ligne ;
 *    · le plafond mensuel de chaque agent et les 195 $ du total restent la dernière barrière, pour Justin aussi. Les seuils se règlent dans `config.agents.budgetJour` (jamais dans le dépôt).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { parisParties } = require('./agents-horaires');

const F = 'agents-budget.json';
/* Les seuils du jour (28 octobre 2026) : voir l'en-tête. `ctx.plafondsJour` les remplace champ par champ ; une valeur qui n'est pas un nombre positif garde le défaut. */
const JOUR_DEFAUT = { agentMin: 1.5, agentPct: 0.2, nonRacine: 25, filet: 60, alerte: 0.8 };
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
/* LA RECHERCHE SUR LE WEB (23 octobre 2026, Justin : « ils se renseignent sur ce qu'ils font, ils regardent un peu partout ») — l'outil de recherche CÔTÉ SERVEUR de
   l'API Messages : Anthropic la fait, notre serveur ne visite aucun site. `opts.recherche = { maxUses }` l'ajoute à la requête.
   ⛔ VERSION EXACTE : `web_search_20260209` (recherche avec filtrage dynamique) — la variante documentée pour Claude Sonnet 5, notre modèle ; `web_search_20250305` est la
      variante simple des modèles plus anciens (et de Vertex). Vérifié dans le SDK installé (`resources/messages/messages.d.ts`) ET dans la documentation de l'API le 23 octobre 2026.
      Le filtrage dynamique exécute du code CÔTÉ ANTHROPIC, à l'intérieur de l'outil : on ne déclare PAS `code_execution` à côté (un second environnement troublerait le modèle).
   ⛔ `max_uses` borne les recherches d'UNE requête (3 pour Léa) ; le plafond du JOUR est celui de l'appelant (`usage.server_tool_use.web_search_requests`, rendu par
      `penser` en `recherches`). Les erreurs de l'outil ne jettent pas (HTTP 200, un bloc `web_search_tool_result` d'erreur) : le texte final, lui, manque, et l'appelant continue sans.
   ⛔ `pause_turn` : la boucle côté serveur de l'API s'arrête à 10 itérations ; on renvoie la réponse telle quelle (SANS message « continue ») et le serveur reprend. Trois reprises
      au plus, puis on rend ce qu'on a. Les blocs de résultats ne sont jamais lus comme du texte : ce qu'un site contient est une DONNÉE, jamais une consigne.
   ⛔ Chaque recherche se PAIE en plus des jetons (10 $ les 1000 : 0,012 $ comptés, un peu au-dessus), et entre dans le budget de l'agent comme le reste. */
const OUTIL_RECHERCHE = 'web_search_20260209';
const USD_RECHERCHE = 0.012;
const REPRISES_PAUSE_MAX = 3;
const MAX_USES_MAX = 5;
function outilRecherche(opts) {
  const r = opts && typeof opts === 'object' ? opts.recherche : null;
  if (!r || typeof r !== 'object') return null;
  const n = Number.isInteger(r.maxUses) ? Math.min(Math.max(r.maxUses, 1), MAX_USES_MAX) : 2;
  return { type: OUTIL_RECHERCHE, name: 'web_search', max_uses: n, user_location: { type: 'approximate', country: 'FR', timezone: 'Europe/Paris' } };
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
  /* ⛔ LE PLAFOND DU MOIS SE BAISSE, JAMAIS SE RELÈVE (espace de test, 23 octobre 2026 : 10 $ pour tous les agents confondus). `ctx.plafondTotalUsd` n'est
     passé par `index.js` QUE si `config.espaceTest === true` ; absent, hors forme ou au-dessus de 195, c'est `TOTAL_USD` — la production ne change pas d'un chiffre. */
  const TOTAL = (typeof ctx.plafondTotalUsd === 'number' && Number.isFinite(ctx.plafondTotalUsd) && ctx.plafondTotalUsd > 0) ? Math.min(ctx.plafondTotalUsd, TOTAL_USD) : TOTAL_USD;
  /* ⛔ DANS LE SERVEUR DE TEST, ON RÉSERVE AVANT D'APPELER (relecture adverse, 23 octobre 2026). `penser` vérifie `total() >= TOTAL` AVANT l'appel et n'enregistre le coût qu'APRÈS : seize
     agents lancés ensemble (`@tous`, une réunion) passaient tous la vérification avec le même total, et le dépassement n'était borné que par leur nombre. Quand un plafond de test est
     fixé (`ctx.plafondTotalUsd`, que `index.js` ne passe QUE si `config.espaceTest === true`), chaque appel RÉSERVE le pire coût qu'il peut avoir (sortie au maximum demandé, entrée estimée à
     un jeton pour trois signes, recherches au maximum) ; la vérification compte les réservations des appels DÉJÀ en vol, et la réservation est rendue dès la réponse. Près du plafond,
     un seul appel passe à la fois — le dépassement possible est celui d'UN appel, plus celui de seize. Sans plafond de test,
     `reserver` vaut faux : le chemin de la production est celui d'avant, au caractère près. */
  const reserver = typeof ctx.plafondTotalUsd === 'number' && Number.isFinite(ctx.plafondTotalUsd) && ctx.plafondTotalUsd > 0;
  let enVol = 0;
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
  /* ── LE BUDGET DU JOUR ── */
  const P = Object.assign({}, JOUR_DEFAUT);
  if (ctx.plafondsJour && typeof ctx.plafondsJour === 'object') for (const k of Object.keys(JOUR_DEFAUT)) { const x = ctx.plafondsJour[k]; if (typeof x === 'number' && Number.isFinite(x) && x > 0) P[k] = x; }
  const surBudget = typeof ctx.surBudget === 'function' ? ctx.surBudget : null;
  const dire = x => { if (!surBudget) return; try { Promise.resolve(surBudget(x)).catch(() => {}); } catch (e) {} };
  const jourDe = () => { const p = parisParties(maintenant()); return p.annee + '-' + String(p.mois).padStart(2, '0') + '-' + String(p.jour).padStart(2, '0'); };
  const jourNeuf = () => ({ j: jourDe(), parAgent: {}, nonRacine: 0, racine: 0, alertes: {} });
  let etat = charger();
  if (!etat.jour || typeof etat.jour !== 'object' || Array.isArray(etat.jour) || typeof etat.jour.j !== 'string' || !etat.jour.parAgent || typeof etat.jour.parAgent !== 'object' || Array.isArray(etat.jour.parAgent)) etat.jour = jourNeuf();
  if (!etat.jour.alertes || typeof etat.jour.alertes !== 'object' || Array.isArray(etat.jour.alertes)) etat.jour.alertes = {};
  function ecrire() {
    if (illisible) return false;
    try { const f = path.join(DATA_DIR, F), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(etat)); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(F + ' non écrit :', e.message); return false; }
  }
  function moisCourant() { if (etat.mois !== mois()) etat = { mois: mois(), parAgent: {}, jour: etat.jour }; }
  /* minuit à Paris : le jour repart à zéro (les alertes aussi : une par agent et par jour) */
  function jourCourant() { if (!etat.jour || etat.jour.j !== jourDe()) etat.jour = jourNeuf(); return etat.jour; }
  const depenseJour = id => Number(jourCourant().parAgent[id]) || 0;
  const totalJour = () => (Number(jourCourant().nonRacine) || 0) + (Number(jourCourant().racine) || 0);
  /* le plafond d'un agent pour ses appels SANS racine, aujourd'hui */
  const plafondJourDe = id => Math.max(P.agentMin, P.agentPct * plafond(id));
  const alerte = (cle, x) => { const a = jourCourant().alertes; if (a[cle]) return; a[cle] = true; dire(x); };
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
    moisCourant(); jourCourant();
    if (depense(id) >= plafond(id)) return { ok: false, raison: 'plafond_agent' };
    if (total() >= TOTAL) return { ok: false, raison: 'plafond_total' };
    if (typeof system !== 'string' || !Array.isArray(messages) || !messages.length) return { ok: false, raison: 'requete' };
    /* ⛔ LE JOUR : `racine` n'est vrai que si l'appelant a validé la racine contre le registre (un message de Justin) ; le filet vaut pour tous, le plafond d'agent seulement sans racine */
    const racine = !!(opts && typeof opts === 'object' && opts.racine === true);
    if (totalJour() >= P.filet) { alerte('filet', { type: 'filet_jour', total: totalJour(), filet: P.filet }); return { ok: false, raison: 'filet_jour' }; }
    if (!racine && (depenseJour(id) >= plafondJourDe(id) || (Number(jourCourant().nonRacine) || 0) >= P.nonRacine)) {
      alerte('cent:' + id, { type: 'plafond_jour', agent: id, depense: depenseJour(id), plafond: plafondJourDe(id) });
      return { ok: false, raison: 'plafond_jour' };
    }
    let r;
    /* ⛔ `thinking: disabled`, EXPRÈS. Sans ce réglage, Claude Sonnet 5 réfléchit d'office (mode adaptatif) et cette réflexion est prise
       sur `max_tokens` : avec 600 jetons, elle pouvait manger toute la réponse, qui revenait VIDE — et un échec « vide » est tu par les
       agents (rien à dire dans le fil). Un agent muet sans le dire est exactement la panne qu'on ne voit pas. Ici l'agent converse, il ne
       raisonne pas à longue portée : tous les jetons vont à la réponse. */
    const reflechir = !!(opts && typeof opts === 'object' && opts.reflechir === true);
    const outils = outilsValides(opts);
    const recherche = outilRecherche(opts);
    const requete = { model: MODEL, max_tokens: jetonsDemandes(opts), thinking: reflechir ? { type: 'adaptive' } : { type: 'disabled' }, system, messages };
    /* `tool_choice: auto` : le modèle choisit d'appeler un outil ou de répondre — les seuls choix compatibles avec la réflexion. Et c'est le CODE
       de l'appelant qui valide chaque appel d'outil : ce que Claude « décide » n'est jamais exécuté tel quel. */
    /* `opts.forcerOutil` : UN outil nommé, imposé (`tool_choice: tool`) — seulement sans réflexion (l'API refuse les deux ensemble) et seulement un outil offert.
       Pour la parole qui a DIT ce qu'elle devait enregistrer sans l'enregistrer (les objectifs du lundi, examen du 26 octobre 2026 à 23 h 25). */
    const forcer = !reflechir && opts && typeof opts.forcerOutil === 'string' && outils.some(o => o.name === opts.forcerOutil) ? opts.forcerOutil : '';
    if (outils.length || recherche) { requete.tools = outils.concat(recherche ? [recherche] : []); requete.tool_choice = forcer ? { type: 'tool', name: forcer } : { type: 'auto' }; }
    let reserve = 0;
    if (reserver) {
      reserve = ((JSON.stringify(system).length + JSON.stringify(messages).length) / 3 * USD_ENTREE_M + requete.max_tokens * USD_SORTIE_M) / 1e6 + (recherche ? recherche.max_uses * USD_RECHERCHE : 0);
      if (total() + enVol >= TOTAL) return { ok: false, raison: 'plafond_total' };   // les appels DÉJÀ en vol comptent ; le sien, non : un seul appel peut passer juste sous le plafond (comme avant)
      enVol += reserve;
    }
    try { r = await (ctx.appeler || appelerAnthropic)(cle, requete); }
    catch (e) { enVol -= reserve; agents.noter(id, 'penser', { cible: 'claude', resultat: 'erreur', detail: String(e && e.message || e).slice(0, 120) }); return { ok: false, raison: 'erreur_api' }; }
    enVol -= reserve;
    /* les recherches se paient en plus : ce que l'API compte (`recherches`), à défaut — réponse sans le compte — le plafond demandé (on se trompe vers le HAUT) */
    const recherches = recherche ? (Number.isInteger(r.recherches) && r.recherches >= 0 ? r.recherches : recherche.max_uses) : 0;
    const cout = ((Number(r.entree) || 0) * USD_ENTREE_M + (Number(r.sortie) || 0) * USD_SORTIE_M) / 1e6 + recherches * USD_RECHERCHE;
    moisCourant(); etat.parAgent[id] = depense(id) + (Number.isFinite(cout) ? cout : 0);
    { /* le jour : la dépense va du côté « racine » ou « sans racine » ; une alerte à 80 % du plafond d'agent (sans racine) */
      const j = jourCourant(), c = Number.isFinite(cout) ? cout : 0;
      if (racine) j.racine = (Number(j.racine) || 0) + c; else { j.parAgent[id] = depenseJour(id) + c; j.nonRacine = (Number(j.nonRacine) || 0) + c; }
      if (!racine && depenseJour(id) >= P.alerte * plafondJourDe(id)) alerte('quatrevingts:' + id, { type: 'alerte_jour', agent: id, depense: depenseJour(id), plafond: plafondJourDe(id) });
      if (totalJour() >= P.alerte * P.filet) alerte('filet80', { type: 'alerte_filet', total: totalJour(), filet: P.filet });
    }
    if (!ecrire()) { agents.noter(id, 'penser', { cible: 'budget', resultat: 'erreur', detail: 'dépense non écrite : plus d’appel avant réparation' }); illisible = true; }
    const texte = String(r.texte || '').trim();
    /* Les appels d'outils rendus par l'API : un nom, un objet. Une forme inattendue est écartée ici ; la VALIDATION est celle de l'appelant. */
    const actions = [];
    if (outils.length && Array.isArray(r.actions)) for (const x of r.actions.slice(0, 8)) {
      if (x && typeof x.nom === 'string' && outils.some(o => o.name === x.nom) && x.entree && typeof x.entree === 'object' && !Array.isArray(x.entree)) actions.push({ id: String(x.id || ''), nom: x.nom, entree: x.entree });
    }
    if (!texte && actions.length) return { ok: true, texte: '', actions, cout, recherches };
    if (!texte) {
      /* Aucun texte parce que la réponse a atteint sa limite : ce n'est pas « vide », c'est « trop long » — l'appelant peut le DIRE
         (et le journal le garde, pour qu'on sache qu'il faut relever `maxTokens` plutôt que chercher une panne). */
      if (r.stop_reason === 'max_tokens') {
        agents.noter(id, 'penser', { cible: 'claude', resultat: 'erreur', detail: 'réponse coupée avant tout texte (max_tokens ' + requete.max_tokens + ')' });
        return { ok: false, raison: 'trop_long' };
      }
      return { ok: false, raison: 'vide' };
    }
    const sortie = outils.length ? { ok: true, texte, actions, cout } : { ok: true, texte, cout };
    if (recherche) sortie.recherches = recherches;
    return sortie;
  }
  const etatBudget = () => { const j = jourCourant(); return { illisible, mois: etat.mois, total: total(), plafondTotal: TOTAL, parAgent: Object.assign({}, etat.parAgent), cle: !!cle,
    /* le jour : de quoi dire à la Tour « aujourd'hui X $ / Y $ » — des nombres, jamais un texte */
    jour: { j: j.j, total: totalJour(), racine: Number(j.racine) || 0, nonRacine: Number(j.nonRacine) || 0, parAgent: Object.assign({}, j.parAgent), filet: P.filet, plafondNonRacine: P.nonRacine,
      plafondsAgent: Object.fromEntries(agents.AGENTS.map(a => [a.id, plafondJourDe(a.id)])) } }; };
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
  /* Une requête avec la recherche peut se mettre en PAUSE (`pause_turn`) : on renvoie sa réponse telle quelle, sans message de plus, et le serveur reprend. */
  const avecRecherche = Array.isArray(requete.tools) && requete.tools.some(t => t && t.type === OUTIL_RECHERCHE);
  let messages = requete.messages, entree = 0, sortie = 0, recherches = 0, rep, reprises = 0;
  for (;;) {
    rep = await client.messages.create(avecRecherche ? Object.assign({}, requete, { messages }) : requete);
    const u = rep.usage || {};
    entree += Number(u.input_tokens) || 0; sortie += Number(u.output_tokens) || 0;
    recherches += Number(u.server_tool_use && u.server_tool_use.web_search_requests) || 0;
    if (!(avecRecherche && rep.stop_reason === 'pause_turn' && reprises < REPRISES_PAUSE_MAX)) break;
    reprises++;
    messages = messages.concat([{ role: 'assistant', content: rep.content }]);
  }
  if (rep.stop_reason === 'refusal') return { texte: '', entree, sortie, stop_reason: rep.stop_reason, recherches };
  /* Les blocs `thinking` ne sont jamais lus ; les blocs `tool_use` deviennent des actions à valider. Avec la recherche, le texte rendu est celui qui SUIT le dernier bloc d'outil
     du serveur (la réponse finale) : ce que le modèle dit entre deux recherches (« je vais chercher… ») n'est pas la réponse. */
  let blocs = rep.content || [];
  if (avecRecherche) {
    let dernier = -1;
    blocs.forEach((b, i) => { if (b && (b.type === 'server_tool_use' || b.type === 'web_search_tool_result')) dernier = i; });
    if (dernier >= 0) blocs = blocs.slice(dernier + 1);
  }
  return { texte: blocs.filter(b => b.type === 'text').map(b => b.text).join('\n'), entree, sortie, stop_reason: rep.stop_reason, recherches,
    actions: blocs.filter(b => b.type === 'tool_use').map(b => ({ id: b.id, nom: b.name, entree: b.input })) };
}
module.exports.appelerAnthropic = appelerAnthropic;
module.exports.OUTIL_RECHERCHE = OUTIL_RECHERCHE;
module.exports.USD_RECHERCHE = USD_RECHERCHE;
