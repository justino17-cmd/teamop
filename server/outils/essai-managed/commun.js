/* L'ESSAI « MANAGED AGENTS » — LES PIÈCES COMMUNES (30 octobre 2026).
 *
 * Justin : « réparer les nôtres + essai Anthropic ». On essaie le service « Managed Agents » d'Anthropic sur UN agent de surveillance (Max, en double),
 * pour juger la plateforme — SANS aucune donnée de client et SANS toucher au fonctionnement actuel. Le vrai Max (`agent-max.js`) ne change pas d'une
 * ligne et n'appelle toujours pas Claude ; l'essai est un second Max, hébergé chez Anthropic, qui lit les MÊMES chiffres que lui et dont le rapport est
 * rangé dans un fichier, jamais publié, jamais envoyé.
 *
 * ⛔ DÉSACTIVÉ PAR DÉFAUT : `config.agents.essaiManaged` absent (ou autre chose que `true` / `{ actif: true }`) = rien ne se monte, rien ne part.
 * ⛔ LA CLÉ N'ALLE QU'À api.anthropic.com : `baseURL` est TOUJOURS posée ici (sinon le SDK lirait ANTHROPIC_BASE_URL, et une variable d'environnement
 *    égarée enverrait la clé ailleurs). Seule exception, pour le banc : `TEAMOP_ESSAI_BASE_URL`, acceptée UNIQUEMENT si elle vise la boucle locale.
 * ⛔ AUCUN SECRET N'EST AFFICHÉ NI ÉCRIT : la clé est lue dans la configuration du VPS (`agents.cleApi`, comme `cerveau.js`) et ne sort jamais de ce
 *    processus ; le jeton de l'outil maison vit dans un fichier à part (`jeton`, mode 600) que ni les scripts ni le LISEZMOI ne montrent.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const URL_ANTHROPIC = 'https://api.anthropic.com';
/* le budget d'une session, en CENTIMES de dollar (la doc : « amount » en unités mineures, chaîne entière) — jamais absent, jamais hors de ces bornes */
const BUDGET_DEFAUT_CENTS = 50;
const BUDGET_MIN_CENTS = 10;
const BUDGET_MAX_CENTS = 200;
const OUTIL = 'faits_surveillance';
const DEFINITION = path.join(__dirname, 'definition');

function lireJson(f, repli) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return repli; } }

function chemins(env) {
  env = env || process.env;
  const config = env.TEAMOP_CONFIG || '/opt/teamop/config.json';
  const data = env.TEAMOP_DATA || '/opt/teamop/data';
  const dossier = path.join(data, 'essai-managed');
  return { config, data, dossier, etat: path.join(dossier, 'etat.json'), jeton: path.join(dossier, 'jeton'), rapports: path.join(dossier, 'rapports') };
}

/* L'interrupteur : `true` ou `{ actif: true, … }`, rien d'autre. Un objet sans `actif: true` est COUPÉ (on n'allume pas par accident). */
function reglage(config) {
  const r = config && config.agents && config.agents.essaiManaged;
  if (r === true) return { actif: true, budgetCents: BUDGET_DEFAUT_CENTS };
  if (r && typeof r === 'object' && r.actif === true) return { actif: true, budgetCents: budgetCents(r.budgetCents) };
  return { actif: false, budgetCents: BUDGET_DEFAUT_CENTS };
}
/* Le plafond de session est TOUJOURS posé : une valeur absente, folle ou hors bornes retombe dans [10, 200] centimes (50 par défaut). */
function budgetCents(x) {
  const n = typeof x === 'string' && /^\d{1,6}$/.test(x) ? Number(x) : x;
  if (typeof n !== 'number' || !Number.isInteger(n)) return BUDGET_DEFAUT_CENTS;
  return Math.max(BUDGET_MIN_CENTS, Math.min(BUDGET_MAX_CENTS, n));
}
const budgetSession = cents => ({ type: 'limit', max_list_cost: { amount: String(budgetCents(cents)), currency: 'USD' } });

function lireConfig(p) {
  const c = lireJson(p.config, null);
  return c && typeof c === 'object' ? c : null;
}

/* Le client Anthropic. `fabrique` (le banc) remplace le SDK ; sinon le vrai SDK, avec une adresse figée. */
function baseUrl(env) {
  env = env || process.env;
  const b = env.TEAMOP_ESSAI_BASE_URL;
  if (b) {
    let u; try { u = new URL(b); } catch (e) { throw new Error('TEAMOP_ESSAI_BASE_URL illisible'); }
    if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) throw new Error('TEAMOP_ESSAI_BASE_URL doit viser la boucle locale (la clé ne sort pas ailleurs)');
    return u.origin;
  }
  return URL_ANTHROPIC;
}
function client(cle, env) {
  const Anthropic = require('@anthropic-ai/sdk');
  const C = Anthropic.default || Anthropic;
  return new C({ apiKey: cle, baseURL: baseUrl(env), maxRetries: 2, timeout: 60000 });
}

function lireEtat(p) { const e = lireJson(p.etat, null); return e && typeof e === 'object' && !Array.isArray(e) ? e : { sessions: [] }; }
/* écrit en entier puis renomme : un état tronqué ferait perdre les identifiants à nettoyer (donc des sessions payantes oubliées) */
function ecrireEtat(p, etat) {
  fs.mkdirSync(p.dossier, { recursive: true });
  const tmp = p.etat + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(etat, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, p.etat);
}
/* Le jeton de l'outil maison : créé une fois (48 hexadécimaux, mode 600), jamais affiché. */
function jetonPoser(p) {
  fs.mkdirSync(p.dossier, { recursive: true });
  if (!lireJeton(p)) fs.writeFileSync(p.jeton, crypto.randomBytes(24).toString('hex') + '\n', { mode: 0o600 });
  try { fs.chmodSync(p.jeton, 0o600); } catch (e) {}
}
function lireJeton(p) { try { const t = fs.readFileSync(p.jeton, 'utf8').trim(); return /^[a-f0-9]{48}$/.test(t) ? t : ''; } catch (e) { return ''; } }

/* Un message d'erreur d'un appel Anthropic, SANS secret : le statut et le message de l'API, jamais l'objet complet (qui peut porter des en-têtes). */
function erreurDite(e) {
  const m = String((e && e.message) || e || 'erreur').replace(/sk-ant-[A-Za-z0-9_-]+/g, '[clé masquée]');
  return (e && e.status ? 'HTTP ' + e.status + ' — ' : '') + m.slice(0, 300);
}

function definition() {
  const agent = lireJson(path.join(DEFINITION, 'agent.json'), null);
  const environnement = lireJson(path.join(DEFINITION, 'environnement.json'), null);
  let systeme = '', grille = '';
  try { systeme = fs.readFileSync(path.join(DEFINITION, 'systeme.md'), 'utf8').trim(); grille = fs.readFileSync(path.join(DEFINITION, 'grille.md'), 'utf8').trim(); } catch (e) {}
  if (!agent || !environnement || !systeme || !grille) throw new Error('les fichiers de définition (definition/) sont illisibles');
  return { agent: Object.assign({}, agent, { system: systeme }), environnement, grille };
}

module.exports = { URL_ANTHROPIC, BUDGET_DEFAUT_CENTS, BUDGET_MIN_CENTS, BUDGET_MAX_CENTS, OUTIL, chemins, reglage, budgetCents, budgetSession, lireConfig, baseUrl, client,
  lireEtat, ecrireEtat, jetonPoser, lireJeton, erreurDite, definition, lireJson };
