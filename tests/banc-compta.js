/* ⛔ L'ÉTABLI COMMUN DE test-3160 À test-3164 (28 octobre 2026) — Margaux, comptable de la Tour, étape 1. Ce n'est pas une suite (son nom ne commence pas par `test-`).
 *
 * Ce qu'il fournit :
 *   · les VRAIES fonctions de conversion de `server/index.js` (`stripePaiement`, `stripeClient`, `stripeEur`, `monStr`), extraites du fichier réel et exécutées dans un bac à sable : le module de la compta
 *     reçoit exactement ce que l'index lui branche, pas une copie du banc ;
 *   · un faux Stripe de FACTURES (`fauxStripe`) qui parle comme l'API (`created[gte]`, `created[lt]`, `limit`, `starting_after`, `has_more`), note chaque chemin lu, et sait tomber en panne ;
 *   · un constructeur de facture (`facture`) et un constructeur d'abonnement lu par la Tour (`abo`).
 * Rien ne sort : aucune requête réseau, aucune clé.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');

const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
/* le code sans ses commentaires : on ancre sur la DÉCLARATION (le fichier est très commenté, un nom apparaît souvent dans une phrase) */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function blocDans(CODE, nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '\\') { k++; continue; }   // un antislash saute le caractère suivant (une expression régulière comme /^https:\/\//)
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
const bloc = nom => blocDans(CODE, nom);
const ligne = nom => { const m = new RegExp('\\nconst ' + nom + ' = [^\\n]*;').exec(CODE); return m ? m[0].trim() : ''; };

/* LA TOUR (tour.html) : le même code sans commentaires, et les mêmes extractions — pour le banc de PARITÉ (test-3163) */
const SRC_TOUR = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');   // TOUR_FICHIER : rejouer le banc de parité contre une autre Tour (celle de main, par exemple)
const CODE_TOUR = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* `esc` tient sur UNE ligne et porte une expression régulière avec une apostrophe (/[&<>"']/) que le lecteur d'accolades prend pour une chaîne : on la prend à la ligne */
const blocTour = nom => (nom === 'esc' ? ((/\nfunction esc\(s\)\{[^\n]*\}(?=\n)/.exec(CODE_TOUR) || [''])[0].trim()) : blocDans(CODE_TOUR, nom));
const manqueTour = noms => noms.filter(n => !blocTour(n));
/* la valeur littérale d'une variable de la Tour, sur sa ligne : « var ABO={…}; » */
const valeurTour = nom => { const m = new RegExp('\\nvar ' + nom + '=(\\{[^\\n]*\\});').exec(CODE_TOUR); return m ? m[1] : '{}'; };

/* Les fonctions réelles de l'index. `manque` : ce qui n'a pas été trouvé (un banc qui ne trouve rien ne prouve rien : les suites le vérifient). */
function reel() {
  const src = [ligne('monStr'), ligne('stripeEur'), bloc('stripeClient'), bloc('stripePaiement')];
  const manque = ['monStr', 'stripeEur', 'stripeClient', 'stripePaiement'].filter((n, i) => !src[i]);
  const ctx = { Math, Number, String, parseInt, Object, Array };
  vm.createContext(ctx);
  vm.runInContext(src.join('\n') + '\nthis.stripePaiement = stripePaiement;', ctx);
  return { stripePaiement: ctx.stripePaiement, manque, src };
}

const sec = iso => Math.floor(Date.parse(iso) / 1000);
let nId = 0;
/* Une facture Stripe, telle que la liste la rend. `o` : { id, status, cents, centsDue, cree (ISO), payee (ISO), currency, number, footer, ... } — tout champ de `o.brut` écrase le défaut. */
function facture(o) {
  o = o || {};
  const id = o.id || 'in_banc' + (++nId);
  const status = o.status || 'paid';
  const cents = o.cents === undefined ? 1500 : o.cents;
  const cree = o.cree ? sec(o.cree) : sec('2026-10-10T09:00:00Z');
  const f = {
    id, object: 'invoice', status, currency: o.currency || 'eur', created: cree,
    amount_paid: status === 'paid' ? cents : 0, amount_due: o.centsDue === undefined ? cents : o.centsDue,
    attempted: o.attempted === true, paid: status === 'paid',
    status_transitions: status === 'paid' ? { paid_at: o.payee ? sec(o.payee) : cree } : {},
    customer: 'cus_' + id, customer_name: o.nom || 'Client ' + id, customer_email: o.courriel || ('facturation+' + id + '@exemple-banc.fr'),
    hosted_invoice_url: 'https://invoice.stripe.com/i/acct_banc/' + id,
    number: o.number === undefined ? 'BANC-' + String(nId).padStart(4, '0') : o.number,
    invoice_pdf: o.pdf === undefined ? 'https://pay.stripe.com/invoice/' + id + '/pdf' : o.pdf,
    footer: o.footer === undefined ? 'TVA non applicable, art. 293 B du CGI' : o.footer, description: o.description === undefined ? null : o.description,
    custom_fields: o.custom === undefined ? null : o.custom,
    customer_address: o.adresse === undefined ? { line1: '1 rue du Banc', postal_code: '17000', city: 'La Rochelle', country: 'FR' } : o.adresse,
    customer_tax_ids: o.tvaClient === undefined ? [] : o.tvaClient,
    total_taxes: o.taxes === undefined ? [] : o.taxes,
    lines: { data: [{ period: o.periode === undefined ? { start: cree, end: cree + 2592000 } : o.periode }] },
  };
  if (o.brut) Object.assign(f, o.brut);
  for (const k of (o.sans || [])) delete f[k];
  return f;
}

/* Le faux Stripe de factures : `lire(chemin)` rend la page demandée. `etat.panne` : jette ; `etat.reponse` : une réponse imposée ; `appels` : tous les chemins lus. */
function fauxStripe(liste) {
  const etat = { liste: liste || [], panne: false, reponse: null, appels: [], pages: 0 };
  const lire = async (chemin) => {
    etat.appels.push(chemin);
    if (etat.panne) throw new Error('stripe HTTP 500');
    if (typeof etat.reponse === 'function') return etat.reponse(chemin, etat);
    if (etat.reponse) return etat.reponse;
    const q = new URLSearchParams(chemin.slice(chemin.indexOf('?') + 1));
    const gte = q.has('created[gte]') ? +q.get('created[gte]') : -Infinity, lt = q.has('created[lt]') ? +q.get('created[lt]') : Infinity;
    const limite = Math.min(100, +q.get('limit') || 10);
    let l = etat.liste.filter(f => f.created >= gte && f.created < lt).sort((a, b) => b.created - a.created || (a.id < b.id ? 1 : -1));
    const apres = q.get('starting_after');
    if (apres) { const i = l.findIndex(f => f.id === apres); l = i >= 0 ? l.slice(i + 1) : []; }
    etat.pages++;
    return { object: 'list', data: l.slice(0, limite), has_more: l.length > limite };
  };
  return Object.assign(etat, { lire });
}

/* Un abonnement tel que `stripeAbosCalc` le range pour l'écran de la Tour */
let nAbo = 0;
function abo(statut, formule, montant, perio) {
  return { id: 'sub_banc' + (++nAbo), clientNom: 'Client ' + nAbo, clientEmail: 'abo' + nAbo + '@exemple-banc.fr', formule: formule || 'OP GESTION Pro', montant: montant === undefined ? 15 : montant, periodicite: perio || 'mois', statut, debut: 0, prochaine: 0 };
}

/* Un abonnement BRUT de Stripe (ce que `/v1/subscriptions` rend, client et produit développés) : le vrai `stripeAbosCalc` du serveur le range en ligne d'abonné. `statut` : active, trialing, past_due, canceled. */
let nSub = 0;
function sub(statut, produit, centimes, o) {
  o = o || {};
  const n = ++nSub;
  return { id: 'sub_brut' + n, object: 'subscription', status: statut, start_date: sec('2026-03-01T09:00:00Z'), current_period_end: sec('2026-11-15T09:00:00Z'),
    customer: { id: 'cus_brut' + n, name: o.nom || 'Entreprise Brute ' + n, email: o.courriel || 'compta+brut' + n + '@exemple-banc.fr' }, metadata: {},
    items: { data: [{ id: 'si_' + n, quantity: o.quantite || 1, price: { id: 'price_banc', unit_amount: centimes === undefined ? 1500 : centimes, recurring: { interval: o.intervalle || 'month', interval_count: 1 }, product: { name: produit || 'OP GESTION Pro' } } }] } };
}

/* Le texte d'un fichier SANS ses commentaires, chaînes et expressions régulières respectées (un `//` dans « https://… » ou dans /^https:\/\// n'est pas un commentaire). Pour les bancs qui lisent du CODE, jamais une phrase. */
function sansCommentaires(src) {
  let out = '', i = 0, q = null, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (q) { out += c; if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; prev = c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; out += ' '; continue; }
    if (c === '/' && (!prev || '(,=:[!&|?{};'.includes(prev) || /(?:return|typeof)\s*$/.test(out))) {      // une expression régulière
      let j = i + 1, classe = false;
      while (j < n) { const ch = src[j]; if (ch === '\\') { j += 2; continue; } if (ch === '[') classe = true; else if (ch === ']') classe = false; else if (ch === '/' && !classe) break; else if (ch === '\n') break; j++; }
      out += src.slice(i, j + 1); i = j + 1; prev = '/'; continue;
    }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}

module.exports = { sansCommentaires, reel, bloc, ligne, facture, fauxStripe, abo, sub, sec, RACINE, SRC, CODE, CODE_TOUR, blocTour, manqueTour, valeurTour };
