/* ══ LE FICHIER .ICS — UNE RÉUNION, OU TOUTE SA SÉRIE, POUR L'AGENDA DE LA PERSONNE (RFC 5545) ═══════════════════════════════════════
 *
 * Fait main, sans bibliothèque (décision du dépôt : chaque dépendance est une surface d'attaque, et un `.ics` n'est que du texte). Module PUR : il reçoit une réunion déjà
 * lue en base et rend le texte du fichier — aucun accès à la base, à l'horloge ni au réseau.
 *
 * ⛔ LE FICHIER DIT LA MÊME HEURE QUE LE SERVICE. Une réunion sans répétition est écrite en UTC (`DTSTART:20261026T130000Z`) : l'agenda de la personne la montre dans SON fuseau. Une
 * SÉRIE est écrite en heure locale avec son fuseau (`DTSTART;TZID=Europe/Paris:…` + un `VTIMEZONE` + un `RRULE`) : c'est l'agenda qui répète « le lundi à 14:00, à Paris », et il le
 * fait à travers le changement d'heure — exactement comme `calendrier.js`. Un `RRULE` en UTC, lui, aurait décalé la réunion d'une heure pour tout le monde le 25 octobre 2026.
 * ⛔ LE `VTIMEZONE` SE DÉDUIT DE LA BASE DES FUSEAUX DE NODE (`Intl`), PAS D'UNE TABLE RECOPIÉE : on sonde les changements de décalage autour de la réunion. Si les changements suivent
 * une règle annuelle (« le dernier dimanche d'octobre à 03:00 »), la règle est écrite (`RRULE:FREQ=YEARLY`) et vaut pour toutes les années de la série ; sinon (le Maroc, un fuseau
 * dont la règle a changé) chaque changement est écrit à sa date (`RDATE`) pour la période qu'on a sondée.
 * ⛔ LES CAS LIMITES DE LA RFC : `UNTIL` est en UTC quand `DTSTART` porte un fuseau ; `UNTIL` et `COUNT` ne vont JAMAIS ensemble (quand la série porte les deux limites, le nombre exact
 * d'occurrences est écrit en `COUNT`) ; un mois sans le 31 n'a pas d'occurrence (`BYMONTHDAY=31` les ignore, et ne les compte pas) ; « 1 jour avant » est `TRIGGER:-P1D` (un jour
 * civil) pour une série, et la durée exacte pour une occurrence écrite en UTC.
 * ⛔ UN TEXTE VENU DU MONDE (le titre, le lieu) ne peut JAMAIS ouvrir une ligne ou un composant du fichier : les sauts de ligne, la barre oblique inverse, le point-virgule et la
 * virgule sont échappés (§ 3.3.11), les caractères de contrôle retirés, et les lignes de plus de 75 octets sont repliées SANS couper un caractère UTF-8 en deux (§ 3.1).
 */
'use strict';
const cal = require('./calendrier');

const CRLF = '\r\n';
const DOMAINE = 'opmessages.teamop.fr';
const PRODID = '-//TEAM OP//OP MESSAGES//FR';
const JOURS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const p2 = (n, l) => String(n).padStart(l || 2, '0');

/* ── Le texte ───────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* Une valeur de type TEXT (RFC 5545 § 3.3.11) : « \ » → « \\ », « ; » → « \; », « , » → « \, », un saut de ligne → « \n ». Aucun autre caractère de contrôle ne passe. */
function texte(s) {
  const propre = String(s == null ? '' : s)
    .replace(/\r\n|\r|\u0085|\u2028|\u2029/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  return propre.split('\n').map((l) => l.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')).join('\\n');
}
/* Une ligne de contenu est repliée à 75 octets (la suite commence par une espace, comptée dans les 75) ; jamais au milieu d'un caractère UTF-8. */
function plier(ligne) {
  const buf = Buffer.from(ligne, 'utf8');
  if (buf.length <= 75) return ligne;
  const morceaux = [];
  let debut = 0;
  while (debut < buf.length) {
    const max = morceaux.length === 0 ? 75 : 74;
    let fin = Math.min(buf.length, debut + max);
    if (fin < buf.length) while (fin > debut && (buf[fin] & 0xC0) === 0x80) fin--;   // un octet de continuation (10xxxxxx) : on recule jusqu'au début du caractère
    morceaux.push(buf.slice(debut, fin).toString('utf8'));
    debut = fin;
  }
  return morceaux.join(CRLF + ' ');
}

/* ── Les dates ──────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const enUtc = (t) => {
  const d = new Date(t);
  return p2(d.getUTCFullYear(), 4) + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
};
const enLocal = (t, tz) => {
  const c = cal.champsLocaux(t, tz);
  return p2(c.a, 4) + p2(c.m) + p2(c.j) + 'T' + p2(c.h) + p2(c.mi) + p2(c.s);
};
/* Un décalage en millisecondes → « +0100 », « -0500 », « +0545 » (TZOFFSETFROM / TZOFFSETTO). */
const decalTexte = (ms) => { const m = Math.round(Math.abs(ms) / 60000); return (ms < 0 ? '-' : '+') + p2(Math.floor(m / 60)) + p2(m % 60); };
/* Une durée négative en minutes → « -PT15M », « -PT1H », « -PT25H »… */
function declencheur(minutes) {
  if (minutes % 60 === 0) return '-PT' + (minutes / 60) + 'H';
  return '-PT' + minutes + 'M';
}

/* ── Le VTIMEZONE ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* Les changements de décalage de `tz` entre les instants `de` et `a` : [{ t, avant, apres }] — `t` est la première seconde vécue avec le nouveau décalage. On échantillonne une fois
   par semaine (deux changements ne tombent jamais à moins d'une semaine l'un de l'autre dans la base des fuseaux), puis on cherche la seconde exacte par bissection. */
function transitions(tz, de, a) {
  const sortie = [];
  let t = de, o = cal.decalage(tz, t);
  while (t < a) {
    const n = Math.min(t + 7 * cal.JOUR, a), on = cal.decalage(tz, n);
    if (on === o) { t = n; continue; }
    let bas = t, haut = n;
    while (haut - bas > 1000) {
      const milieu = Math.floor((bas + haut) / 2000) * 1000;
      if (cal.decalage(tz, milieu) === o) bas = milieu; else haut = milieu;
    }
    const apres = cal.decalage(tz, haut);
    sortie.push({ t: haut, avant: o, apres });
    t = haut; o = apres;
  }
  return sortie;
}
function nomCourt(tz, t) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(t).find((x) => x.type === 'timeZoneName');
    return p ? p.value : '';
  } catch (e) { return ''; }
}
/* La date et l'heure LOCALES (avec le décalage d'AVANT : celui que la RFC donne à DTSTART d'un changement) d'une transition. */
const localAvant = (tr) => new Date(tr.t + tr.avant);
const texteLocal = (d) => p2(d.getUTCFullYear(), 4) + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds());

/* Les changements d'un même sens suivent-ils UNE règle annuelle ? → { mois, jour (0 = dimanche), rang (−1 : le dernier, 1 à 5), heure } ou null. Deux changements au moins : une règle
   ne se déduit pas d'un seul. */
function regleAnnuelle(trs) {
  if (trs.length < 2) return null;
  const premier = trs[0], l0 = localAvant(premier);
  const dernier = (d) => d.getUTCDate() + 7 > cal.joursDansMois(d.getUTCFullYear(), d.getUTCMonth() + 1);
  const rang = (d) => Math.ceil(d.getUTCDate() / 7);
  const memeHeure = (d) => d.getUTCHours() === l0.getUTCHours() && d.getUTCMinutes() === l0.getUTCMinutes() && d.getUTCSeconds() === l0.getUTCSeconds();
  for (const tr of trs) {
    const d = localAvant(tr);
    if (tr.avant !== premier.avant || tr.apres !== premier.apres || d.getUTCMonth() !== l0.getUTCMonth() || d.getUTCDay() !== l0.getUTCDay() || !memeHeure(d)) return null;
  }
  if (trs.every((tr) => dernier(localAvant(tr)))) return { mois: l0.getUTCMonth() + 1, jour: l0.getUTCDay(), rang: -1 };
  const r0 = rang(l0);
  if (trs.every((tr) => rang(localAvant(tr)) === r0)) return { mois: l0.getUTCMonth() + 1, jour: l0.getUTCDay(), rang: r0 };
  return null;
}

/* Le composant VTIMEZONE de `tz`, valable pour les réunions qui commencent entre les années `a0` et `a1` (incluses). → les lignes (sans pliage). */
function vtimezone(tz, a0, a1) {
  const de = Date.UTC(Math.max(2000, a0 - 1), 0, 1), a = Date.UTC(Math.min(2099, a1 + 1) + 1, 0, 1);
  const trs = transitions(tz, de, a);
  const lignes = ['BEGIN:VTIMEZONE', 'TZID:' + tz];
  const composant = (genre, avant, apres, t, extra) => {
    lignes.push('BEGIN:' + genre, 'TZOFFSETFROM:' + decalTexte(avant), 'TZOFFSETTO:' + decalTexte(apres));
    const nom = nomCourt(tz, t);
    if (nom) lignes.push('TZNAME:' + texte(nom));
    for (const l of extra) lignes.push(l);
    lignes.push('END:' + genre);
  };
  /* L'état de départ : le décalage en vigueur au début de la période sondée, déclaré sous forme d'un composant qui ne change rien (de ce décalage vers lui-même). Sans lui, un
     agenda qui lit une heure avant le premier changement devine. */
  const o0 = cal.decalage(tz, de);
  const genreDepart = trs.length && trs[0].apres > trs[0].avant ? 'STANDARD' : (trs.length ? 'DAYLIGHT' : 'STANDARD');
  composant(genreDepart, o0, o0, de, ['DTSTART:19700101T000000']);
  const vers = (hausse) => trs.filter((tr) => (tr.apres > tr.avant) === hausse);
  const regleH = regleAnnuelle(vers(true)), regleB = regleAnnuelle(vers(false));
  if (trs.length && regleH && regleB && vers(true).length === vers(false).length) {
    for (const hausse of [true, false]) {
      const liste = vers(hausse), r = hausse ? regleH : regleB, tr = liste[0];
      composant(hausse ? 'DAYLIGHT' : 'STANDARD', tr.avant, tr.apres, tr.t, [
        'DTSTART:' + texteLocal(localAvant(tr)),
        'RRULE:FREQ=YEARLY;BYMONTH=' + r.mois + ';BYDAY=' + r.rang + JOURS[r.jour],
      ]);
    }
  } else {
    /* Pas de règle annuelle : chaque changement à sa date, groupés par (avant, après). */
    const groupes = new Map();
    for (const tr of trs) {
      const cle = tr.avant + '>' + tr.apres;
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(tr);
    }
    for (const liste of groupes.values()) {
      const tr = liste[0], extra = ['DTSTART:' + texteLocal(localAvant(tr))];
      if (liste.length > 1) extra.push('RDATE:' + liste.slice(1).map((x) => texteLocal(localAvant(x))).join(','));
      composant(tr.apres > tr.avant ? 'DAYLIGHT' : 'STANDARD', tr.avant, tr.apres, tr.t, extra);
    }
  }
  lignes.push('END:VTIMEZONE');
  return lignes;
}

/* ── La réunion ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* La règle de répétition (RRULE). `UNTIL` est en UTC (le fuseau est dans DTSTART) ; quand les deux limites existent, la RFC interdit de les écrire ensemble : le nombre exact
   d'occurrences (celui que `calendrier.js` compte) devient le `COUNT`. → le texte après « RRULE: », ou null (pas de répétition). */
function regleRepetition(r) {
  if (r.rep === 'aucune' || !cal.REPETITIONS.includes(r.rep)) return null;
  const c = cal.champsLocaux(r.debut, r.tz);
  const parties = [];
  if (r.rep === 'quotidienne') parties.push('FREQ=DAILY');
  else if (r.rep === 'hebdomadaire') parties.push('FREQ=WEEKLY', 'BYDAY=' + JOURS[cal.jourSemaine(c)]);
  else parties.push('FREQ=MONTHLY', 'BYMONTHDAY=' + c.j);
  const s = { debut: r.debut, fin: r.fin, tz: r.tz, rep: r.rep, n: r.n || null, jusqua: r.jusqua || null };
  if (s.n && s.jusqua) parties.push('COUNT=' + cal.compter(s, s.n + 1));
  else if (s.n) parties.push('COUNT=' + s.n);
  else if (s.jusqua) parties.push('UNTIL=' + enUtc(cal.limiteDe(s)));
  return parties.join(';');
}

/* Le texte du fichier .ics d'une réunion.
   · `r` : { id, titre, lieu, debut, fin, tz, rep, n, jusqua, annulee, version } — `debut` et `fin` : la première occurrence, en instants UTC ;
   · `opts.occurrence` : le début (UTC) d'UNE occurrence de la série — le fichier ne porte alors que celle-là ; sinon toute la série (ou la réunion seule) ;
   · `opts.rappels` : les minutes avant le début (5, 15, 60, 1440) des rappels de la personne qui télécharge ;
   · `opts.maintenant` : l'heure du service (DTSTAMP). */
function fichier(r, opts) {
  const o = opts || {};
  if (cal.tzValide(r.tz) === null) return null;   // le service ne passe que des fuseaux qu'il a validés ; un autre ne produit PAS un fichier au décalage inventé
  const serie = r.rep !== 'aucune' && o.occurrence == null;
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:' + PRODID, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const rappels = (o.rappels || []).filter((m) => cal.RAPPELS_PERMIS.includes(m)).sort((a, b) => a - b);
  let debut = r.debut, fin = r.fin, uid = 'reunion-' + r.id;
  if (o.occurrence != null) {
    const occ = r.rep === 'aucune' ? { debut: r.debut, fin: r.fin } : cal.occurrenceA({ debut: r.debut, fin: r.fin, tz: r.tz, rep: r.rep, n: r.n || null, jusqua: r.jusqua || null }, o.occurrence);
    if (!occ) return null;
    debut = occ.debut; fin = occ.fin;
    if (r.rep !== 'aucune') uid += '-' + enUtc(debut).replace(/[^0-9TZ]/g, '');
  }
  const event = ['BEGIN:VEVENT', 'UID:' + uid + '@' + DOMAINE, 'DTSTAMP:' + enUtc(o.maintenant == null ? Date.now() : o.maintenant), 'SEQUENCE:' + (r.version | 0)];
  if (serie) {
    /* Jusqu'à quelle année décrire le fuseau : la dernière occurrence d'une série bornée (au plus 30 ans), sinon dix ans — au-delà d'une règle annuelle, qui vaut pour toujours,
       un fuseau sans règle (le Maroc) n'est connu que sur la période sondée. */
    const a0 = cal.champsLocaux(debut, r.tz).a, derniere = cal.derniereDate({ debut: r.debut, fin: r.fin, tz: r.tz, rep: r.rep, n: r.n || null, jusqua: r.jusqua || null });
    const a1 = derniere ? Math.min(a0 + 30, derniere.a) : a0 + 10;
    lignes.push.apply(lignes, vtimezone(r.tz, a0, Math.max(a0, a1)));
    event.push('DTSTART;TZID=' + r.tz + ':' + enLocal(debut, r.tz), 'DTEND;TZID=' + r.tz + ':' + enLocal(fin, r.tz), 'RRULE:' + regleRepetition(r));
  } else {
    event.push('DTSTART:' + enUtc(debut), 'DTEND:' + enUtc(fin));
  }
  event.push('SUMMARY:' + texte(r.titre));
  if (r.lieu) event.push('LOCATION:' + texte(r.lieu));
  event.push('DESCRIPTION:' + texte('Réunion programmée avec OP MESSAGES.'));
  event.push('STATUS:' + (r.annulee ? 'CANCELLED' : 'CONFIRMED'), 'TRANSP:OPAQUE');
  for (const m of rappels) {
    /* Une série écrite en heure locale : « 1 jour » est un jour civil (-P1D). Une occurrence écrite en UTC n'a pas de jour civil : on écrit la durée exacte. */
    const declenche = m === 1440 && serie ? '-P1D' : declencheur(Math.round((debut - cal.echeanceRappel(debut, m, r.tz)) / cal.MIN));
    event.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + texte('Rappel : ' + r.titre), 'TRIGGER:' + declenche, 'END:VALARM');
  }
  event.push('END:VEVENT');
  for (const l of event) lignes.push(l);
  lignes.push('END:VCALENDAR');
  return lignes.map(plier).join(CRLF) + CRLF;
}

/* Un nom de fichier sûr (ASCII, sans guillemet ni séparateur) : « reunion-point-hebdo.ics ». */
function nom(r) {
  const base = String(r.titre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return 'reunion' + (base ? '-' + base : '') + '.ics';
}

module.exports = { fichier, nom, texte, plier, vtimezone, transitions, regleAnnuelle, regleRepetition, DOMAINE, PRODID };
