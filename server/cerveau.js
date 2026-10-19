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
const TIMEOUT_MS = 30000;

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

  /* Une question à Claude. `appeler` est injectable (banc) : `(cle, requete) → {texte, entree, sortie}`. */
  async function penser(id, system, messages) {
    if (illisible) return { ok: false, raison: 'budget_illisible' };
    if (!cle) return { ok: false, raison: 'pas_de_cle' };
    const p = agents.peutAgir(id);
    if (!p.ok) return { ok: false, raison: p.raison };
    moisCourant();
    if (depense(id) >= plafond(id)) return { ok: false, raison: 'plafond_agent' };
    if (total() >= TOTAL_USD) return { ok: false, raison: 'plafond_total' };
    if (typeof system !== 'string' || !Array.isArray(messages) || !messages.length) return { ok: false, raison: 'requete' };
    let r;
    try { r = await (ctx.appeler || appelerAnthropic)(cle, { model: MODEL, max_tokens: MAX_TOKENS, system, messages }); }
    catch (e) { agents.noter(id, 'penser', { cible: 'claude', resultat: 'erreur', detail: String(e && e.message || e).slice(0, 120) }); return { ok: false, raison: 'erreur_api' }; }
    const cout = ((Number(r.entree) || 0) * USD_ENTREE_M + (Number(r.sortie) || 0) * USD_SORTIE_M) / 1e6;
    moisCourant(); etat.parAgent[id] = depense(id) + (Number.isFinite(cout) ? cout : 0);
    if (!ecrire()) { agents.noter(id, 'penser', { cible: 'budget', resultat: 'erreur', detail: 'dépense non écrite : plus d’appel avant réparation' }); illisible = true; }
    const texte = String(r.texte || '').trim();
    if (!texte) return { ok: false, raison: 'vide' };
    return { ok: true, texte, cout };
  }
  const etatBudget = () => ({ illisible, mois: etat.mois, total: total(), plafondTotal: TOTAL_USD, parAgent: Object.assign({}, etat.parAgent), cle: !!cle });
  return { penser, etatBudget, MODEL };
};

async function appelerAnthropic(cle, requete) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: cle, timeout: TIMEOUT_MS, maxRetries: 0 });
  const rep = await client.messages.create(requete);
  if (rep.stop_reason === 'refusal') return { texte: '', entree: (rep.usage || {}).input_tokens, sortie: (rep.usage || {}).output_tokens };
  return { texte: (rep.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'), entree: (rep.usage || {}).input_tokens, sortie: (rep.usage || {}).output_tokens };
}
