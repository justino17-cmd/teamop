/* LA FIN D'ABONNEMENT « À LA FIN DE LA PÉRIODE » — le seul geste d'écriture vers Stripe qu'un agent déclenche (23 octobre 2026).
 *
 * Justin : « On ne fera pas de remboursement. Une personne qui s'abonne pour le mois et après il arrête, c'est son choix. Mais il faut
 * qu'il arrête l'abonnement. » Arrêter, c'est `cancel_at_period_end = true` : l'abonnement NE SE RENOUVELLE PAS, l'accès court jusqu'à la fin de
 * la période déjà réglée (CGV art. 6), et rien n'est remboursé ni coupé avant. Ce fichier ne sait faire que cela.
 *
 * ⛔ PAS DE BIBLIOTHÈQUE : l'API de Stripe s'appelle par `fetch` (règle de CLAUDE.md). `fetch` est INJECTÉ — les bancs lui donnent un Stripe local, jamais
 *    api.stripe.com.
 * ⛔ JAMAIS D'ANNULATION IMMÉDIATE : aucune requête `DELETE`, aucun `/cancel`, aucun remboursement, aucun avoir. Le banc relit le texte de ce fichier et
 *    exige leur absence.
 * ⛔ On ne croit pas Stripe sur parole : la réponse doit DIRE `cancel_at_period_end: true` (ou une date `cancel_at`) — sinon c'est un échec, et l'appelant ne
 *    prévient pas le client d'une fin qui n'est pas programmée.
 * ⛔ Idempotent : l'en-tête `Idempotency-Key` est dérivé de l'abonnement et du jour — rejouer la demande dans la même journée ne fait rien de plus.
 * ⛔ Le module ne lit rien d'une personne : il reçoit des identifiants d'abonnement Stripe (`sub_…`), validés par leur forme.
 */
'use strict';

const FORME_ABO = /^sub_[A-Za-z0-9]{1,80}$/;
const BASE = 'https://api.stripe.com';
const DELAI_MS = 12000;

/* La fin de période d'un abonnement lu chez Stripe, en secondes (0 si illisible) : sur l'abonnement, sinon sur sa première ligne (versions récentes de l'API). */
function finPeriode(sb) {
  const sec = x => { const n = parseInt(x, 10); return n > 0 ? n : 0; };
  const lignes = (sb && sb.items && Array.isArray(sb.items.data)) ? sb.items.data : [];
  return sec(sb && sb.current_period_end) || sec((lignes[0] || {}).current_period_end);
}
/* La fin PROGRAMMÉE d'un abonnement (secondes) : `cancel_at` si Stripe la date, sinon la fin de période quand `cancel_at_period_end` est posé ; 0 = rien de programmé. */
function finProgrammee(sb) {
  const sec = x => { const n = parseInt(x, 10); return n > 0 ? n : 0; };
  if (!sb || typeof sb !== 'object') return 0;
  return sec(sb.cancel_at) || (sb.cancel_at_period_end === true ? (finPeriode(sb) || sec(sb.trial_end) || 0) : 0);
}
/* Le jour (AAAA-MM-JJ, heure de Paris) d'un instant en secondes. */
function jourParis(sec) {
  if (!(sec > 0)) return '';
  const p = {};
  for (const x of new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(sec * 1000))) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day;
}

/* Programmer la fin de CET abonnement à la fin de sa période.
   `o` : { aboId, sk, entetes(sk, extra) → en-têtes, fetch?, base?, jour? }.
   Rend { ok:true, deja:boolean, finSec, finLe } ou { ok:false, raison } avec raison ∈ forme | sans_cle | stripe_http | stripe_illisible | non_programmee | reseau.
   `deja` : l'abonnement avait DÉJÀ une fin programmée (on ne fait rien, on rend la date). Jette jamais. */
async function programmerFin(o) {
  o = o || {};
  const f = typeof o.fetch === 'function' ? o.fetch : globalThis.fetch;
  const base = typeof o.base === 'string' && /^https?:\/\//.test(o.base) ? o.base.replace(/\/+$/, '') : BASE;
  if (typeof o.aboId !== 'string' || !FORME_ABO.test(o.aboId)) return { ok: false, raison: 'forme' };
  if (typeof o.sk !== 'string' || !o.sk) return { ok: false, raison: 'sans_cle' };
  const entetes = typeof o.entetes === 'function' ? o.entetes : ((sk, extra) => Object.assign({ Authorization: 'Bearer ' + sk }, extra || {}));
  const url = base + '/v1/subscriptions/' + encodeURIComponent(o.aboId);
  const lire = async (reponse) => { let d = null; try { d = await reponse.json(); } catch (e) { d = null; } return d; };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DELAI_MS);
  try {
    /* 1. on relit l'abonnement : s'il a déjà une fin programmée, il n'y a rien à écrire (et la date à dire est la sienne) */
    const r0 = await f(url, { headers: entetes(o.sk), signal: ctrl.signal });
    const d0 = await lire(r0);
    if (!r0.ok || !d0 || typeof d0 !== 'object') return { ok: false, raison: r0.ok ? 'stripe_illisible' : 'stripe_http' };
    const deja = finProgrammee(d0);
    if (deja) return { ok: true, deja: true, finSec: deja, finLe: jourParis(deja) };
    /* 2. on programme la fin de période */
    const jour = typeof o.jour === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.jour) ? o.jour : new Date().toISOString().slice(0, 10);
    const r1 = await f(url, { method: 'POST', signal: ctrl.signal,
      headers: entetes(o.sk, { 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': 'teamop-fin-periode-' + o.aboId + '-' + jour }),
      body: new URLSearchParams({ cancel_at_period_end: 'true' }).toString() });
    const d1 = await lire(r1);
    if (!r1.ok || !d1 || typeof d1 !== 'object') return { ok: false, raison: r1.ok ? 'stripe_illisible' : 'stripe_http' };
    /* 3. on ne croit que ce que Stripe DIT avoir fait */
    const fin = finProgrammee(d1);
    if (!fin) return { ok: false, raison: 'non_programmee' };
    return { ok: true, deja: false, finSec: fin, finLe: jourParis(fin) };
  } catch (e) {
    return { ok: false, raison: 'reseau' };
  } finally { clearTimeout(t); }
}

module.exports = { programmerFin, finPeriode, finProgrammee, jourParis, FORME_ABO };
