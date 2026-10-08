/* ══ LES HEURES DE TRAVAIL CÔTÉ PRO ══════════════════════════════════════════════════════════════════════════════════════════
 *
 * Justin, 8 octobre 2026 : « il faut bien différencier le pro et le perso, que tout soit à part ». Le Pro a ses heures : en dehors, ses
 * messages et ses mentions ne font sonner aucun appareil — le service les RETIENT, comme pendant une réunion (`push.js`), et UNE
 * notification les résume quand les heures reprennent. Rien n'est perdu : les messages sont là, la pastille les compte.
 * Les APPELS sonnent toujours (on ne retient pas une urgence) ; le Perso n'est jamais touché.
 *
 * Le réglage (`prefs.heures_pro`) : { jours: [1..7] (lundi = 1, comme ISO 8601), debut, fin } en MINUTES depuis minuit, dans le fuseau
 * de la personne (`personne.tz`, tenu à jour par sa page ; à défaut Europe/Paris). `null` (le défaut) : coupé — rien ne change pour qui
 * ne règle rien.
 * ⛔ UNE PLAGE QUI PASSE MINUIT (22 h → 6 h, une équipe de nuit) APPARTIENT AU JOUR OÙ ELLE COMMENCE : le samedi 2 h d'une nuit
 *   commencée le vendredi est DANS les heures, même si le samedi n'est pas coché.
 * ⛔ UN RÉGLAGE ILLISIBLE, UN FUSEAU INCONNU NE COUPENT RIEN : la personne entend ses messages pro comme avant, plutôt que de les perdre
 *   en silence. La route refuse d'écrire un réglage invalide (`reglageValide`) ; ceci est la seconde garde, pour une base d'avant.
 */
'use strict';

const FUSEAU_DEFAUT = 'Europe/Paris';
const JOURS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MINUTES_JOUR = 1440;

/* Un formateur par fuseau (en construire un à chaque notification coûterait ; il y a peu de fuseaux) — borné : un fuseau par personne au pire. */
const formateurs = new Map();
function formateur(tz) {
  let f = formateurs.get(tz);
  if (!f) {
    if (formateurs.size >= 500) formateurs.clear();
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formateurs.set(tz, f);
  }
  return f;
}

/* Le réglage tel que la route l'accepte : des jours entiers 1..7, sans doublon, au moins un ; deux minutes entières 0..1439, différentes
   (une plage de 24 h n'est pas une plage : c'est « coupé »). Rien d'autre dans l'objet. */
function reglageValide(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
  const cles = Object.keys(r).sort().join(',');
  if (cles !== 'debut,fin,jours') return false;
  const { jours, debut, fin } = r;
  if (!Array.isArray(jours) || jours.length < 1 || jours.length > 7) return false;
  if (!jours.every(j => Number.isInteger(j) && j >= 1 && j <= 7) || new Set(jours).size !== jours.length) return false;
  if (!Number.isInteger(debut) || !Number.isInteger(fin) || debut < 0 || debut >= MINUTES_JOUR || fin < 0 || fin >= MINUTES_JOUR) return false;
  return debut !== fin;
}

/* L'instant `t` (ms) vu dans le fuseau `tz` → { jour: 1..7 (lundi = 1), minute: 0..1439 }, ou null si le fuseau est inconnu. */
function instantLocal(t, tz) {
  let parts;
  try { parts = formateur(tz || FUSEAU_DEFAUT).formatToParts(new Date(t)); } catch (e) { return null; }
  const v = {};
  for (const p of parts) v[p.type] = p.value;
  const jour = JOURS_EN.indexOf(v.weekday) + 1, h = Number(v.hour), m = Number(v.minute);
  if (jour < 1 || !Number.isInteger(h) || !Number.isInteger(m)) return null;
  return { jour, minute: h * 60 + m };
}

/* Dans la plage ? Une plage de jour (debut < fin) : le jour coché, de debut (inclus) à fin (exclu). Une plage de nuit (debut > fin) : du
   jour coché à `debut` jusqu'au LENDEMAIN à `fin` (exclu). */
function dansLaPlage(r, jour, minute) {
  if (r.debut < r.fin) return r.jours.includes(jour) && minute >= r.debut && minute < r.fin;
  const veille = jour === 1 ? 7 : jour - 1;
  return (r.jours.includes(jour) && minute >= r.debut) || (r.jours.includes(veille) && minute < r.fin);
}

/* → vrai quand l'instant `t` tombe HORS des heures de travail de la personne. Un réglage absent ou invalide, un fuseau inconnu : faux. */
function horsHeures(reglage, tz, t) {
  if (!reglageValide(reglage)) return false;
  const l = instantLocal(t, tz);
  if (!l) return false;
  return !dansLaPlage(reglage, l.jour, l.minute);
}

module.exports = { reglageValide, horsHeures, instantLocal, FUSEAU_DEFAUT };
