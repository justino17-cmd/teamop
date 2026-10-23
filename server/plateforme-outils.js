/* LES PETITS OUTILS COMMUNS DES AGENTS DE LA PLATEFORME (23 octobre 2026) — l'heure de Paris, les phrases, les passages.
 * Rien ici ne lit une donnée : des fonctions pures.
 *
 * ⛔ L'HEURE QUE DIT UN AGENT EST CELLE DE PARIS (`Intl`, Europe/Paris), JAMAIS un décalage écrit en dur : le serveur tourne en UTC, et l'heure d'hiver arrive le
 *    25 octobre 2026 (`reunions.js` l'a payé). On réemploie son `parisParties` : une seule définition de « quelle heure est-il à Paris ».
 */
'use strict';
const { parisParties, tsParis, semaineIso } = require('./reunions');

const pad = n => (n < 10 ? '0' : '') + n;
/* « 14 h 05 » — « 9 h » pile — l'heure de Paris d'un instant */
function heureParis(ts) { const p = parisParties(ts); return p.heure + ' h' + (p.minute ? ' ' + pad(p.minute) : ''); }
const jourParis = ts => parisParties(ts).date;
/* un instant, dit comme un collègue : « à 14 h 05 » aujourd'hui, « hier à 14 h 05 », sinon « le 21 octobre à 14 h 05 » */
const MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function quand(ts, maintenant) {
  const p = parisParties(ts), n = parisParties(maintenant);
  const veille = parisParties(maintenant - 86400000);
  if (p.date === n.date) return 'à ' + heureParis(ts);
  if (p.date === veille.date) return 'hier à ' + heureParis(ts);
  return 'le ' + p.jour + ' ' + MOIS[p.mois] + ' à ' + heureParis(ts);
}
/* « 23 novembre 2026 » : un jour civil de Paris, en toutes lettres */
const dateLongue = ts => { const p = parisParties(ts); return p.jour + ' ' + MOIS[p.mois] + ' ' + p.annee; };
const cap = t => { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };
const court = (t, n) => { t = String(t == null ? '' : t).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const pluriel = (n, un, plus) => (n === 1 ? un : plus);
/* une liste dite à voix haute : « a », « a et b », « a, b et c » */
const liste = l => (l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1]);
/* un instant dit en jours entiers de Paris entre deux dates civiles (échéances) — jours civils, pas 24 h : un changement d'heure ne décale pas d'un jour */
function joursEntre(de, a) {
  const x = parisParties(de), y = parisParties(a);
  return Math.round((Date.UTC(y.annee, y.mois - 1, y.jour) - Date.UTC(x.annee, x.mois - 1, x.jour)) / 86400000);
}
/* « un mois après » une date, en mois civils (31 janvier + 1 mois = 28 février) : le délai légal d'une demande RGPD */
function plusUnMois(ts) {
  const p = parisParties(ts);
  const m = p.mois, a = p.annee + (m === 12 ? 1 : 0), mm = m === 12 ? 1 : m + 1;
  const dernier = new Date(Date.UTC(a, mm, 0)).getUTCDate();
  return tsParis(a, mm, Math.min(p.jour, dernier), 23, 59);
}
module.exports = { heureParis, jourParis, quand, dateLongue, cap, court, pluriel, liste, joursEntre, plusUnMois, parisParties, tsParis, semaineIso };
