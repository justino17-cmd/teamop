/* ══ LE CALENDRIER — FUSEAUX, HEURES LOCALES, RÉCURRENCES ═══════════════════════════════════════════════════════════════════════
 *
 * Module PUR : aucune base, aucune horloge, aucun réseau. Tout ce qu'une réunion programmée sait du temps passe ici — l'enregistrement (heure locale → instant), les
 * occurrences d'une série, l'échéance d'un rappel, et ce que le fichier `.ics` (`ics.js`) dit à un agenda. UNE seule définition : le service et l'agenda de la personne
 * doivent calculer la même heure, sinon le rappel de la réunion n'arrive pas quand l'agenda sonne.
 *
 * ⛔ LES HEURES D'UNE SÉRIE SE CALCULENT DANS LE FUSEAU DE LA RÉUNION, JAMAIS EN AJOUTANT 7 × 24 H. Une réunion hebdomadaire « le lundi à 14:00, Paris » reste à 14:00 à Paris
 * quand l'heure d'hiver arrive (le 25 octobre 2026) : son instant UTC, lui, change d'une heure. Ajouter 604 800 000 ms à chaque semaine la décalerait d'une heure pour tous les
 * invités, du jour au lendemain, sans qu'aucune erreur ne le dise. La série est donc définie par une DATE LOCALE (jour, jour de la semaine ou jour du mois) et une HEURE
 * LOCALE ; chaque occurrence est résolue en instant à son tour.
 * ⛔ LES CAS LIMITES SUIVENT LA RFC 5545 (§ 3.3.5), parce que c'est ce que l'agenda de la personne fera de notre `.ics` :
 *   · une heure locale qui N'EXISTE PAS (le trou du passage à l'heure d'été : 02:30 le 29 mars 2026 à Paris) est lue avec le décalage d'AVANT le trou — elle tombe donc à 03:30 ;
 *   · une heure locale AMBIGUË (le passage à l'heure d'hiver : 02:30 le 25 octobre 2026 à Paris, vécue deux fois) est la PREMIÈRE ;
 *   · un mois sans le jour demandé (le 31 d'une série mensuelle) SAUTE ce mois, et ne compte pas dans « N fois » — il n'est pas décalé au 30 ni au dernier jour.
 * ⛔ « 1 JOUR AVANT » EST UN JOUR CIVIL, PAS 86 400 SECONDES (VALARM `TRIGGER:-P1D`, RFC 5545 § 3.3.6) : le rappel de la veille part à la même heure LOCALE que la réunion, la
 * veille, même si un changement d'heure s'est glissé entre les deux. Les rappels en minutes et en heures sont, eux, des durées exactes.
 *
 * Aucune bibliothèque : `Intl.DateTimeFormat` connaît la base des fuseaux (IANA) ; le service tourne sur le Node officiel (ICU complet).
 */
'use strict';

const MIN = 60000, JOUR = 86400000;
const REPETITIONS = ['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle'];
/* Les rappels qu'une réunion propose (en minutes avant le début) : 5 min · 15 min · 1 h · 1 jour. */
const RAPPELS_PERMIS = [5, 15, 60, 1440];
/* Des garde-fous, pas des règles métier : une réunion ne se place pas avant 2000 ni après 2100 (les calculs de fuseau n'ont pas de sens au-delà), et une boucle
   d'occurrences ne court jamais plus de ce nombre de périodes, quoi qu'on lui donne (une série sans fin, un jour qui n'existe jamais). 40 000 jours couvrent une série
   QUOTIDIENNE de 2000 à 2100 (36 500) : une série sans fin ne s'arrête donc pas en silence au bout de quatorze ans. Une période avant la fenêtre ne coûte qu'un calcul de date
   (jamais un fuseau) : atteindre 2090 depuis 2026 est de l'ordre de la milliseconde. */
const T_MIN = Date.UTC(2000, 0, 1), T_MAX = Date.UTC(2100, 0, 1);
const PERIODES_MAX = 40000;

const pad = (n, l = 2) => String(n).padStart(l, '0');

/* ── Les fuseaux ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const TZ_FORME = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){0,2}$/;
const noms = new Map();      // fuseau demandé → nom canonique, ou null
function canonique(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !TZ_FORME.test(tz)) return null;
  if (noms.has(tz)) return noms.get(tz);
  let c = null;
  try { c = new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone; } catch (e) { c = null; }
  /* ICU rend le nom CANONIQUE de sa base, qui est parfois l'ancien (« Asia/Calcutta » pour « Asia/Kolkata », « America/Buenos_Aires » pour « America/Argentina/Buenos_Aires ») : on garde le nom
     que la personne a donné, et on ne corrige que la CASSE (« europe/paris » → « Europe/Paris »). */
  if (c !== null && c.toLowerCase() !== tz.toLowerCase()) c = tz;
  if (noms.size > 500) noms.clear();
  noms.set(tz, c);
  return c;
}
/* → le nom du fuseau (« europe/paris » → « Europe/Paris »), ou null s'il n'est pas connu. */
const tzValide = (tz) => canonique(tz);

const formateurs = new Map();
function formateur(tz) {
  let f = formateurs.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    if (formateurs.size > 200) formateurs.clear();
    formateurs.set(tz, f);
  }
  return f;
}
/* Les champs de la date et de l'heure LOCALES de l'instant `t` dans `tz`. */
function champsLocaux(t, tz) {
  const o = {};
  for (const p of formateur(tz).formatToParts(t)) if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10);
  return { a: o.year, m: o.month, j: o.day, h: o.hour === 24 ? 0 : o.hour, mi: o.minute, s: o.second };
}
/* Le décalage de `tz` à l'instant `t`, en millisecondes à l'est de UTC (Paris en été : +7 200 000). */
function decalage(tz, t) {
  const c = champsLocaux(t, tz);
  return Date.UTC(c.a, c.m - 1, c.j, c.h, c.mi, c.s) - Math.floor(t / 1000) * 1000;
}

/* Une heure locale (a, m, j, h, mi) → l'instant UTC, selon la RFC 5545 (voir l'en-tête : trou → décalage d'avant ; heure vécue deux fois → la première). */
function instantLocal(p, tz) {
  const naif = Date.UTC(p.a, p.m - 1, p.j, p.h, p.mi, p.s || 0);
  const avant = decalage(tz, naif - JOUR), apres = decalage(tz, naif + JOUR);
  const bons = [];
  for (const off of new Set([avant, apres])) {
    const c = naif - off, l = champsLocaux(c, tz);
    if (l.a === p.a && l.m === p.m && l.j === p.j && l.h === p.h && l.mi === p.mi) bons.push(c);
  }
  if (!bons.length) return naif - avant;      // l'heure n'existe pas : le décalage d'AVANT le trou
  return Math.min.apply(null, bons);          // vécue deux fois : la première
}

/* « 2026-10-26T14:00 » (heure locale, sans fuseau) → { a, m, j, h, mi }, ou null. Une date qui n'existe pas (le 31 avril) est refusée. */
function lireLocal(texte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(typeof texte === 'string' ? texte : '');
  if (!m) return null;
  const p = { a: +m[1], m: +m[2], j: +m[3], h: +m[4], mi: +m[5] };
  if (p.a < 2000 || p.a > 2099 || p.m < 1 || p.m > 12 || p.j < 1 || p.j > joursDansMois(p.a, p.m) || p.h > 23 || p.mi > 59) return null;
  return p;
}
/* « 2026-12-31 » → { a, m, j }, ou null. */
function lireDate(texte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof texte === 'string' ? texte : '');
  if (!m) return null;
  const d = { a: +m[1], m: +m[2], j: +m[3] };
  if (d.a < 2000 || d.a > 2099 || d.m < 1 || d.m > 12 || d.j < 1 || d.j > joursDansMois(d.a, d.m)) return null;
  return d;
}
const formaterDate = (d) => pad(d.a, 4) + '-' + pad(d.m) + '-' + pad(d.j);
/* L'instant `t` écrit en heure locale de `tz` : « 2026-10-26T14:00 ». */
function formaterLocal(t, tz) { const c = champsLocaux(t, tz); return formaterDate(c) + 'T' + pad(c.h) + ':' + pad(c.mi); }
/* L'instant `t` en toutes lettres, dans le fuseau demandé : « mardi 27 octobre à 14:00 ». Le texte d'une notification se compose dans le fuseau de CELUI QUI LA REÇOIT. */
function dire(t, tz) {
  try { return new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(t).replace(/ | /g, ' '); }
  catch (e) { return new Date(t).toISOString(); }
}

/* ── Les dates civiles (sans heure, sans fuseau) ─────────────────────────────────────────────────────────────────────────────── */
const joursDansMois = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();
const ajouterJours = (d, n) => { const x = new Date(Date.UTC(d.a, d.m - 1, d.j + n)); return { a: x.getUTCFullYear(), m: x.getUTCMonth() + 1, j: x.getUTCDate() }; };
const numeroJour = (d) => Math.floor(Date.UTC(d.a, d.m - 1, d.j) / JOUR);
const jourSemaine = (d) => new Date(Date.UTC(d.a, d.m - 1, d.j)).getUTCDay();   // 0 = dimanche

/* ── Les séries ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* Une série : { debut, fin, tz, rep, n, jusqua } — `debut` et `fin` : la PREMIÈRE occurrence (instants UTC) ; `rep` : l'une des répétitions ; `n` : le nombre d'occurrences au
   plus (la première comprise) ou null ; `jusqua` : « 2026-12-31 », le DERNIER jour (inclus) où une occurrence peut commencer, ou null. Les deux ensemble : la première des
   deux limites qui arrive. */
function ancreDe(s) { return champsLocaux(s.debut, s.tz); }

/* La date locale du `k`-ième rang de la série (0 = la première) ; null si le rang tombe sur un jour qui n'existe pas (le 31 d'un mois de 30 jours). */
function dateDuRang(s, anc, k) {
  if (s.rep === 'quotidienne') return ajouterJours(anc, k);
  if (s.rep === 'hebdomadaire') return ajouterJours(anc, 7 * k);
  if (s.rep === 'mensuelle') {
    const idx = anc.a * 12 + (anc.m - 1) + k, a = Math.floor(idx / 12), m = (idx % 12) + 1;
    return anc.j <= joursDansMois(a, m) ? { a, m, j: anc.j } : null;
  }
  return k === 0 ? { a: anc.a, m: anc.m, j: anc.j } : null;
}

/* La limite de la série, en instant : le dernier moment du dernier jour permis (heure locale 23:59:59) ; null s'il n'y en a pas. */
function limiteDe(s) {
  if (!s.jusqua) return null;
  const d = lireDate(s.jusqua); if (!d) return null;
  return instantLocal({ a: d.a, m: d.m, j: d.j, h: 23, mi: 59, s: 59 }, s.tz);
}

/* Les occurrences dont le DÉBUT tombe dans [du, au), dans l'ordre, au plus `max`. → [{ debut, fin, rang }] (`rang` : 0 pour la première occurrence, 1 pour la suivante…,
   en ne comptant que les occurrences qui existent). Seules les occurrences proches de la fenêtre sont résolues en instants (un fuseau coûte plus cher qu'une date). */
function occurrences(s, du, au, max) {
  const sortie = [], plafond = max || 500;
  if (!(au > du)) return sortie;
  const duree = s.fin - s.debut, anc = ancreDe(s), limite = limiteDe(s);
  const dMin = champsLocaux(du - JOUR, s.tz), dMax = champsLocaux(au + JOUR, s.tz);
  const nMin = numeroJour(dMin), nMax = numeroJour(dMax);
  const nJusqua = s.jusqua ? numeroJour(lireDate(s.jusqua)) : null;
  let valides = 0;
  for (let k = 0; k < PERIODES_MAX; k++) {
    const d = dateDuRang(s, anc, k);
    if (s.rep === 'aucune' && k > 0) break;
    if (!d) continue;                                              // un jour qui n'existe pas : ni compté, ni décalé
    if (s.n && valides >= s.n) break;
    const nj = numeroJour(d);
    if (nJusqua !== null && nj > nJusqua + 1) break;               // au-delà de la limite (d'un jour, pour les cas d'heures limites)
    if (nj > nMax) break;                                          // après la fenêtre : rien d'autre à chercher
    const rang = valides; valides++;
    if (nj < nMin) continue;                                       // avant la fenêtre
    const t = k === 0 ? s.debut : instantLocal({ a: d.a, m: d.m, j: d.j, h: anc.h, mi: anc.mi }, s.tz);
    if (limite !== null && t > limite) break;
    if (t >= du && t < au) { sortie.push({ debut: t, fin: t + duree, rang }); if (sortie.length >= plafond) break; }
  }
  return sortie;
}

/* La date locale de la DERNIÈRE occurrence d'une série bornée (par `n`, par `jusqua` ou par les deux) — un calcul de dates civiles, sans fuseau — ; null si la série n'a pas de fin. Sert à
   savoir jusqu'à quelle année un fichier .ics doit décrire le fuseau. */
function derniereDate(s) {
  const anc = ancreDe(s);
  if (s.rep === 'aucune') return { a: anc.a, m: anc.m, j: anc.j };
  if (!s.n && !s.jusqua) return null;
  const nJusqua = s.jusqua ? numeroJour(lireDate(s.jusqua)) : null;
  let derniere = null, valides = 0;
  for (let k = 0; k < PERIODES_MAX; k++) {
    const d = dateDuRang(s, anc, k);
    if (!d) continue;
    if (s.n && valides >= s.n) break;
    if (nJusqua !== null && numeroJour(d) > nJusqua) break;
    derniere = d; valides++;
  }
  return derniere;
}

/* La première occurrence qui commence APRÈS `t` (ou à `t` quand `inclus`), ou null. Une fenêtre de 100 jours suffit : le plus long trou d'une série est de 62 jours (un 31 mensuel). */
function premiereApres(s, t, inclus) {
  const du = inclus ? t : t + 1;
  const r = occurrences(s, du, du + 100 * JOUR, 1);
  return r.length ? r[0] : null;
}
/* `debut` est-il le début d'une occurrence de la série ? → l'occurrence, ou null. */
function occurrenceA(s, debut) {
  const r = occurrences(s, debut, debut + 1, 1);
  return r.length && r[0].debut === debut ? r[0] : null;
}
/* Le nombre d'occurrences de la série, compté jusqu'à `max` (au-delà on s'arrête : « plus de max »). Une série sans fin ni limite compte `max`. */
function compter(s, max) {
  let n = 0;
  const lim = max || 1000;
  const anc = ancreDe(s), limite = limiteDe(s);
  for (let k = 0; k < PERIODES_MAX && n < lim; k++) {
    if (s.rep === 'aucune' && k > 0) break;
    const d = dateDuRang(s, anc, k);
    if (!d) continue;
    if (s.n && n >= s.n) break;
    if (limite !== null) { const t = k === 0 ? s.debut : instantLocal({ a: d.a, m: d.m, j: d.j, h: anc.h, mi: anc.mi }, s.tz); if (t > limite) break; }
    n++;
  }
  return n;
}

/* Une série récurrente est définie par son HEURE LOCALE (c'est ce que l'agenda de la personne lira dans le `.ics`) : son premier instant est donc celui que cette heure locale
   désigne selon la RFC 5545 — pour une heure vécue deux fois, la première. Un instant donné en UTC qui tomberait dans la seconde passe serait, sinon, lu une heure plus tôt par
   l'agenda. Une réunion sans répétition garde son instant tel quel (son `.ics` le dit en UTC). → { debut, fin } */
function normaliserSerie(s) {
  if (s.rep === 'aucune') return { debut: s.debut, fin: s.fin };
  const c = champsLocaux(s.debut, s.tz), debut = instantLocal({ a: c.a, m: c.m, j: c.j, h: c.h, mi: c.mi }, s.tz);
  return { debut, fin: debut + (s.fin - s.debut) };
}

/* ── Les rappels ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* L'instant où part le rappel « `avantMin` minutes avant » l'occurrence qui commence à `debut`. 5 min, 15 min et 1 h sont des DURÉES exactes ; « 1 jour » (1440) est un JOUR CIVIL :
   la même heure locale la veille (voir l'en-tête). */
function echeanceRappel(debut, avantMin, tz) {
  if (avantMin !== 1440) return debut - avantMin * MIN;
  const c = champsLocaux(debut, tz), v = ajouterJours(c, -1);
  return instantLocal({ a: v.a, m: v.m, j: v.j, h: c.h, mi: c.mi }, tz);
}

module.exports = {
  MIN, JOUR, REPETITIONS, RAPPELS_PERMIS, T_MIN, T_MAX, PERIODES_MAX,
  tzValide, decalage, champsLocaux, instantLocal, lireLocal, lireDate, formaterDate, formaterLocal, dire,
  joursDansMois, ajouterJours, numeroJour, jourSemaine,
  occurrences, premiereApres, occurrenceA, compter, limiteDe, derniereDate, normaliserSerie, echeanceRappel,
};
