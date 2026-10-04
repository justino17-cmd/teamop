/* ⛔ CE QUE CE FICHIER GARDE — LE FICHIER .ICS DES RÉUNIONS (`server-msg/ics.js`) : ce que l'AGENDA de la personne lira.

   Le fichier doit dire la même heure que le service, et c'est la seule chose qu'on ne peut pas vérifier en relisant le texte : un `VTIMEZONE` faux, un `RRULE` qui ne tient pas compte du
   changement d'heure, un `UNTIL` en heure locale — tout cela se lit très bien et décale la réunion d'une heure pour la personne, sans erreur. Ce banc fait donc ce qu'un agenda fait :
   il LIT le fichier avec un lecteur écrit ICI, qui n'importe rien de `calendrier.js` ni d'`ics.js` (il ne connaît `Intl` que pour rien : les décalages viennent du `VTIMEZONE` du texte),
   étend le `RRULE`, résout chaque heure locale selon la RFC 5545 et compare. Et le lecteur lui-même est éprouvé contre des FAITS écrits à la main, mesurés avec une autre
   implémentation de la base des fuseaux (le `zoneinfo` de Python, tzdata 2025b, PEP 495 — qui suit la même règle que la RFC pour une heure absente ou vécue deux fois) :
   un banc qui compare deux calculs de la même source garde un accord, pas une vérité.

   Les contrôles marqués ⛔ gardent ce dont la perte ne se verrait PAS :
     · une série hebdomadaire garde son heure LOCALE à travers le 25 octobre 2026, LUE DANS LE FICHIER : lundi 19 à 12:00 UTC, lundi 26 à 13:00 UTC ;
     · le fichier d'une série sur CHAQUE fuseau éprouvé (heures entières, demi-heures, trois quarts d'heure, hémisphère sud, fuseau sans règle annuelle, fuseau sans changement) rend les
       mêmes occurrences que le calendrier du service, à l'instant près, sur des heures qui tombent dans les trous et les doublons des changements d'heure ;
     · `UNTIL` est en UTC et `UNTIL` et `COUNT` ne s'écrivent jamais ensemble ;
     · un titre venu du monde ne peut ouvrir ni une ligne, ni un composant, ni une propriété (injection de lignes) ; aucune ligne ne dépasse 75 octets ; un caractère UTF-8 n'est jamais coupé ;
     · « 1 jour avant » est `-P1D` pour une série et la durée EXACTE (25 heures un jour de bascule) pour une occurrence écrite en UTC. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const C = require(path.join(T.SERVICE, 'calendrier.js'));
const I = require(path.join(T.SERVICE, 'ics.js'));

const U = (a, m, j, h = 0, mi = 0, s = 0) => Date.UTC(a, m - 1, j, h, mi, s);
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z').replace(':00Z', 'Z');
const PARIS = 'Europe/Paris';
const MAINTENANT = U(2026, 10, 3, 9, 30);
const local = (tz, texte) => { const p = C.lireLocal(texte); return C.instantLocal(p, tz); };
/* une réunion telle que le service la lit en base */
const reunion = (tz, texte, dureeMin, rep, extra) => {
  const debut = local(tz, texte);
  return Object.assign({ id: 'r0123456789abcdef', titre: 'Point hebdo', lieu: '', debut, fin: debut + dureeMin * 60000, tz, rep, n: null, jusqua: null, annulee: false, version: 0 }, extra || {});
};

/* ══ LE LECTEUR INDÉPENDANT ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Un agenda minimal. Il ne sait RIEN du service : le texte du fichier, la RFC 5545, et de l'arithmétique sur des dates « naïves » (des millisecondes lues comme de l'UTC). */
function deplier(octets) {
  const texte = octets.toString('utf8');
  if (texte.includes('\uFFFD')) throw new Error('caractère UTF-8 coupé');
  if (!texte.endsWith('\r\n')) throw new Error('le fichier ne finit pas par CRLF');
  if (/(^|[^\r])\n/.test(texte)) throw new Error('un saut de ligne seul (sans CR)');
  const physiques = texte.split('\r\n').slice(0, -1);
  const lignes = [];
  for (const l of physiques) {
    if (Buffer.byteLength(l, 'utf8') > 75) throw new Error('ligne de plus de 75 octets : ' + l.slice(0, 40));
    if (l.startsWith(' ')) { if (!lignes.length) throw new Error('suite sans ligne'); lignes[lignes.length - 1] += l.slice(1); } else lignes.push(l);
  }
  return lignes;
}
function ligne(l) {
  const m = /^([A-Za-z0-9-]+)((?:;[A-Za-z0-9-]+=[^:;,"]+)*):(.*)$/.exec(l);
  if (!m) throw new Error('ligne de contenu illisible : ' + l.slice(0, 60));
  const params = {};
  for (const p of m[2].split(';').filter(Boolean)) { const k = p.indexOf('='); params[p.slice(0, k).toUpperCase()] = p.slice(k + 1); }
  return { nom: m[1].toUpperCase(), params, valeur: m[3] };
}
function arbre(octets) {
  const pile = [{ nom: 'RACINE', props: [], enfants: [] }];
  for (const l of deplier(octets)) {
    const p = ligne(l);
    if (p.nom === 'BEGIN') { const c = { nom: p.valeur, props: [], enfants: [] }; pile[pile.length - 1].enfants.push(c); pile.push(c); }
    else if (p.nom === 'END') { if (pile.length < 2 || pile[pile.length - 1].nom !== p.valeur) throw new Error('END sans BEGIN : ' + p.valeur); pile.pop(); }
    else pile[pile.length - 1].props.push(p);
  }
  if (pile.length !== 1) throw new Error('composant non fermé : ' + pile[pile.length - 1].nom);
  return pile[0].enfants;
}
const prop = (c, nom) => c.props.find((p) => p.nom === nom);
const props = (c, nom) => c.props.filter((p) => p.nom === nom);
const sans = (texte) => texte.replace(/\\([\s\S])/g, (m, c) => (c === 'n' || c === 'N' ? '\n' : c));   // une valeur TEXT lue, de gauche à droite, deux caractères à la fois (RFC 5545 § 3.3.11)
const naif = (s) => {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(s);
  if (!m) throw new Error('date illisible : ' + s);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
};
const decalageLu = (s) => { const m = /^([+-])(\d{2})(\d{2})$/.exec(s); if (!m) throw new Error('décalage illisible : ' + s); return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) * 60000; };
const regleLue = (s) => { const o = {}; for (const p of s.split(';')) { const k = p.indexOf('='); o[p.slice(0, k)] = p.slice(k + 1); } return o; };
const CODES = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
/* le « n-ième » (ou le dernier, n < 0) jour de semaine `w` du mois (a, m) → le numéro du jour */
function jourDuMois(a, m, w, n) {
  const premier = new Date(Date.UTC(a, m - 1, 1)).getUTCDay(), nb = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (n > 0) { const j = 1 + ((w - premier + 7) % 7) + (n - 1) * 7; return j <= nb ? j : null; }
  const dernierJour = new Date(Date.UTC(a, m - 1, nb)).getUTCDay();
  return nb - ((dernierJour - w + 7) % 7);
}
/* Un VTIMEZONE lu → { decalageA(u), enUtc(L) }, ou lève une exception si le composant est incomplet. */
function fuseauLu(vtz) {
  const etats = [];
  for (const c of vtz.enfants) {
    if (c.nom !== 'STANDARD' && c.nom !== 'DAYLIGHT') throw new Error('composant de fuseau inconnu : ' + c.nom);
    const de = decalageLu(prop(c, 'TZOFFSETFROM').valeur), vers = decalageLu(prop(c, 'TZOFFSETTO').valeur), ds = naif(prop(c, 'DTSTART').valeur);
    const debuts = new Set([ds]);
    for (const p of props(c, 'RDATE')) for (const d of p.valeur.split(',')) debuts.add(naif(d));
    const rr = prop(c, 'RRULE');
    if (rr) {
      const r = regleLue(rr.valeur), m = /^(-?\d)([A-Z]{2})$/.exec(r.BYDAY || '');
      if (r.FREQ !== 'YEARLY' || !m || !r.BYMONTH) throw new Error('règle de fuseau non prise en charge : ' + rr.valeur);
      for (let a = new Date(ds).getUTCFullYear(); a <= 2100; a++) {
        const j = jourDuMois(a, +r.BYMONTH, CODES[m[2]], +m[1]);
        if (j) debuts.add(Date.UTC(a, +r.BYMONTH - 1, j) + (ds - Math.floor(ds / 86400000) * 86400000));
      }
    }
    for (const L of debuts) etats.push({ u: L - de, de, vers });
  }
  etats.sort((a, b) => a.u - b.u);
  const decalageA = (u) => { let o = etats[0].de; for (const e of etats) { if (e.u <= u) o = e.vers; else break; } return o; };
  const decalages = new Set(); for (const e of etats) { decalages.add(e.de); decalages.add(e.vers); }
  return {
    etats, decalageA,
    /* l'heure locale L (naïve) → l'instant UTC : RFC 5545 § 3.3.5 — vécue deux fois : la première ; absente : le décalage d'AVANT le trou */
    enUtc(L) {
      const bons = [];
      for (const o of decalages) if (decalageA(L - o) === o) bons.push(L - o);
      if (bons.length) return Math.min.apply(null, bons);
      for (const e of etats) if (L >= e.u + e.de && L < e.u + e.vers) return L - e.de;
      throw new Error('heure locale introuvable');
    },
  };
}
/* Un VEVENT lu → les occurrences { debut, fin } (UTC), au plus `max`. */
function occurrencesLues(racine, max) {
  const cal = racine.find((c) => c.nom === 'VCALENDAR');
  const fuseaux = {};
  for (const c of cal.enfants.filter((x) => x.nom === 'VTIMEZONE')) fuseaux[prop(c, 'TZID').valeur] = fuseauLu(c);
  const evs = cal.enfants.filter((x) => x.nom === 'VEVENT');
  if (evs.length !== 1) throw new Error(evs.length + ' VEVENT');
  const ev = evs[0], ds = prop(ev, 'DTSTART'), de = prop(ev, 'DTEND'), rr = prop(ev, 'RRULE');
  if (!ds.params.TZID) {
    if (rr) throw new Error('RRULE sans fuseau');
    if (!ds.valeur.endsWith('Z') || !de.valeur.endsWith('Z')) throw new Error('un instant sans fuseau doit être en UTC');
    return [{ debut: naif(ds.valeur), fin: naif(de.valeur) }];
  }
  const fz = fuseaux[ds.params.TZID];
  if (!fz) throw new Error('TZID sans VTIMEZONE : ' + ds.params.TZID);
  if (de.params.TZID !== ds.params.TZID) throw new Error('DTEND dans un autre fuseau');
  const L0 = naif(ds.valeur), L1 = naif(de.valeur), duree = fz.enUtc(L1) - fz.enUtc(L0);
  const r = rr ? regleLue(rr.valeur) : { FREQ: 'AUCUNE' };
  if (r.COUNT && r.UNTIL) throw new Error('UNTIL et COUNT ensemble');
  const until = r.UNTIL ? (r.UNTIL.endsWith('Z') ? naif(r.UNTIL) : (() => { throw new Error('UNTIL doit être en UTC'); })()) : null;
  const sortie = [], d0 = new Date(L0);
  const heure = L0 - Math.floor(L0 / 86400000) * 86400000;
  for (let k = 0; k < 40000 && sortie.length < max; k++) {
    let L;
    if (r.FREQ === 'AUCUNE') { if (k > 0) break; L = L0; }
    else if (r.FREQ === 'DAILY') L = L0 + k * 86400000;
    else if (r.FREQ === 'WEEKLY') {
      if (CODES[r.BYDAY] !== d0.getUTCDay()) throw new Error('BYDAY ne désigne pas le jour de DTSTART');
      L = L0 + k * 7 * 86400000;
    } else if (r.FREQ === 'MONTHLY') {
      if (+r.BYMONTHDAY !== d0.getUTCDate()) throw new Error('BYMONTHDAY ne désigne pas le jour de DTSTART');
      const idx = d0.getUTCFullYear() * 12 + d0.getUTCMonth() + k, a = Math.floor(idx / 12), m = idx % 12;
      if (+r.BYMONTHDAY > new Date(Date.UTC(a, m + 1, 0)).getUTCDate()) continue;      // « ignorée, et pas comptée » (RFC 5545 § 3.3.10)
      L = Date.UTC(a, m, +r.BYMONTHDAY) + heure;
    } else throw new Error('FREQ non prise en charge : ' + r.FREQ);
    const u = fz.enUtc(L);
    if (until !== null && u > until) break;
    if (r.COUNT && sortie.length >= +r.COUNT) break;
    sortie.push({ debut: u, fin: u + duree });
  }
  return sortie;
}
/* ce que le CALENDRIER du service dit de la même réunion */
const serviceDit = (r, max) => C.occurrences({ debut: r.debut, fin: r.fin, tz: r.tz, rep: r.rep, n: r.n || null, jusqua: r.jusqua || null }, C.T_MIN, C.T_MAX, max).map((o) => ({ debut: o.debut, fin: o.fin }));
const agendaDit = (r, opts, max) => occurrencesLues(arbre(Buffer.from(I.fichier(r, Object.assign({ maintenant: MAINTENANT }, opts)), 'utf8')), max);

console.log('Le lecteur d\'abord : il lit un VTIMEZONE ÉCRIT À LA MAIN comme le monde réel, avant qu\'on lui fasse lire le nôtre');
{
  /* Le bloc que produisent les agendas du commerce pour Paris (TZNAME, règle annuelle depuis 1970) : écrit de mémoire des règles publiques de l'Union européenne. */
  const REFERENCE = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE', 'BEGIN:VEVENT', 'UID:x', 'DTSTAMP:20261003T093000Z', 'DTSTART;TZID=Europe/Paris:20261019T140000', 'DTEND;TZID=Europe/Paris:20261019T150000',
    'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3', 'SUMMARY:x', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  const occ = occurrencesLues(arbre(Buffer.from(REFERENCE)), 10);
  v('⛔ le lecteur lit « le lundi à 14:00, Paris » à travers la bascule : 19 octobre 12:00 UTC (heure d\'été), 26 octobre et 2 novembre 13:00 UTC (heure d\'hiver)', occ.map((o) => iso(o.debut)), ['2026-10-19T12:00Z', '2026-10-26T13:00Z', '2026-11-02T13:00Z']);
  v('   et la durée d\'une heure est gardée', occ.map((o) => (o.fin - o.debut) / 60000), [60, 60, 60]);
  const fz = fuseauLu(arbre(Buffer.from(REFERENCE))[0].enfants[0]);
  v('le lecteur, sur le bloc de référence : heure absente (29 mars 02:30) → le décalage d\'avant le trou ; heure vécue deux fois (25 octobre 02:30) → la première',
    [iso(fz.enUtc(U(2026, 3, 29, 2, 30))), iso(fz.enUtc(U(2026, 10, 25, 2, 30)))], ['2026-03-29T01:30Z', '2026-10-25T00:30Z']);
}

console.log('\nLes faits du monde réel (Python zoneinfo, tzdata 2025b) : le calendrier du service ET le fichier lisent la même heure');
{
  const FAITS = `Europe/Paris 2026-03-29T01:30 2026-03-29T00:30Z
Europe/Paris 2026-03-29T02:00 2026-03-29T01:00Z
Europe/Paris 2026-03-29T02:30 2026-03-29T01:30Z
Europe/Paris 2026-03-29T03:30 2026-03-29T01:30Z
Europe/Paris 2026-10-25T02:30 2026-10-25T00:30Z
Europe/Paris 2026-10-25T03:00 2026-10-25T02:00Z
Europe/Paris 2026-10-25T03:30 2026-10-25T02:30Z
Europe/Paris 2026-10-25T04:30 2026-10-25T03:30Z
Europe/Paris 2027-03-28T01:30 2027-03-28T00:30Z
Europe/Paris 2027-03-28T02:00 2027-03-28T01:00Z
Europe/Paris 2027-03-28T02:30 2027-03-28T01:30Z
Europe/Paris 2027-03-28T03:30 2027-03-28T01:30Z
Europe/Paris 2027-10-31T02:30 2027-10-31T00:30Z
Europe/Paris 2027-10-31T03:00 2027-10-31T02:00Z
Europe/Paris 2027-10-31T03:30 2027-10-31T02:30Z
Europe/Paris 2027-10-31T04:30 2027-10-31T03:30Z
Europe/Paris 2028-03-26T01:30 2028-03-26T00:30Z
Europe/Paris 2028-03-26T02:00 2028-03-26T01:00Z
Europe/Paris 2028-03-26T02:30 2028-03-26T01:30Z
Europe/Paris 2028-03-26T03:30 2028-03-26T01:30Z
Europe/Paris 2028-10-29T02:30 2028-10-29T00:30Z
Europe/Paris 2028-10-29T03:00 2028-10-29T02:00Z
Europe/Paris 2028-10-29T03:30 2028-10-29T02:30Z
Europe/Paris 2028-10-29T04:30 2028-10-29T03:30Z
America/New_York 2026-03-08T01:30 2026-03-08T06:30Z
America/New_York 2026-03-08T02:00 2026-03-08T07:00Z
America/New_York 2026-03-08T02:30 2026-03-08T07:30Z
America/New_York 2026-03-08T03:30 2026-03-08T07:30Z
America/New_York 2026-11-01T01:30 2026-11-01T05:30Z
America/New_York 2026-11-01T02:00 2026-11-01T07:00Z
America/New_York 2026-11-01T02:30 2026-11-01T07:30Z
America/New_York 2026-11-01T03:30 2026-11-01T08:30Z
Australia/Sydney 2026-04-05T02:30 2026-04-04T15:30Z
Australia/Sydney 2026-04-05T03:00 2026-04-04T17:00Z
Australia/Sydney 2026-04-05T03:30 2026-04-04T17:30Z
Australia/Sydney 2026-04-05T04:30 2026-04-04T18:30Z
Australia/Sydney 2026-10-04T01:30 2026-10-03T15:30Z
Australia/Sydney 2026-10-04T02:00 2026-10-03T16:00Z
Australia/Sydney 2026-10-04T02:30 2026-10-03T16:30Z
Australia/Sydney 2026-10-04T03:30 2026-10-03T16:30Z
Australia/Lord_Howe 2026-04-05T01:30 2026-04-04T14:30Z
Australia/Lord_Howe 2026-04-05T02:00 2026-04-04T15:30Z
Australia/Lord_Howe 2026-04-05T02:30 2026-04-04T16:00Z
Australia/Lord_Howe 2026-04-05T03:30 2026-04-04T17:00Z
Australia/Lord_Howe 2026-10-04T01:30 2026-10-03T15:00Z
Australia/Lord_Howe 2026-10-04T02:00 2026-10-03T15:30Z
Australia/Lord_Howe 2026-10-04T02:30 2026-10-03T15:30Z
Australia/Lord_Howe 2026-10-04T03:30 2026-10-03T16:30Z
Pacific/Chatham 2026-04-05T03:15 2026-04-04T13:30Z
Pacific/Chatham 2026-04-05T03:45 2026-04-04T15:00Z
Pacific/Chatham 2026-04-05T04:15 2026-04-04T15:30Z
Pacific/Chatham 2026-04-05T05:15 2026-04-04T16:30Z
Pacific/Chatham 2026-09-27T02:15 2026-09-26T13:30Z
Pacific/Chatham 2026-09-27T02:45 2026-09-26T14:00Z
Pacific/Chatham 2026-09-27T03:15 2026-09-26T14:30Z
Pacific/Chatham 2026-09-27T04:15 2026-09-26T14:30Z
Europe/London 2026-03-29T00:30 2026-03-29T00:30Z
Europe/London 2026-03-29T01:00 2026-03-29T01:00Z
Europe/London 2026-03-29T01:30 2026-03-29T01:30Z
Europe/London 2026-03-29T02:30 2026-03-29T01:30Z
Europe/London 2026-10-25T01:30 2026-10-25T00:30Z
Europe/London 2026-10-25T02:00 2026-10-25T02:00Z
Europe/London 2026-10-25T02:30 2026-10-25T02:30Z
Europe/London 2026-10-25T03:30 2026-10-25T03:30Z
America/Los_Angeles 2026-03-08T01:30 2026-03-08T09:30Z
America/Los_Angeles 2026-03-08T02:00 2026-03-08T10:00Z
America/Los_Angeles 2026-03-08T02:30 2026-03-08T10:30Z
America/Los_Angeles 2026-03-08T03:30 2026-03-08T10:30Z
America/Los_Angeles 2026-11-01T01:30 2026-11-01T08:30Z
America/Los_Angeles 2026-11-01T02:00 2026-11-01T10:00Z
America/Los_Angeles 2026-11-01T02:30 2026-11-01T10:30Z
America/Los_Angeles 2026-11-01T03:30 2026-11-01T11:30Z
Pacific/Auckland 2026-04-05T02:30 2026-04-04T13:30Z
Pacific/Auckland 2026-04-05T03:00 2026-04-04T15:00Z
Pacific/Auckland 2026-04-05T03:30 2026-04-04T15:30Z
Pacific/Auckland 2026-04-05T04:30 2026-04-04T16:30Z
Pacific/Auckland 2026-09-27T01:30 2026-09-26T13:30Z
Pacific/Auckland 2026-09-27T02:00 2026-09-26T14:00Z
Pacific/Auckland 2026-09-27T02:30 2026-09-26T14:30Z
Pacific/Auckland 2026-09-27T03:30 2026-09-26T14:30Z
Europe/Dublin 2026-03-29T00:30 2026-03-29T00:30Z
Europe/Dublin 2026-03-29T01:00 2026-03-29T01:00Z
Europe/Dublin 2026-03-29T01:30 2026-03-29T01:30Z
Europe/Dublin 2026-03-29T02:30 2026-03-29T01:30Z
Europe/Dublin 2026-10-25T01:30 2026-10-25T00:30Z
Europe/Dublin 2026-10-25T02:00 2026-10-25T02:00Z
Europe/Dublin 2026-10-25T02:30 2026-10-25T02:30Z
Europe/Dublin 2026-10-25T03:30 2026-10-25T03:30Z
Asia/Kolkata 2026-01-15T09:00 2026-01-15T03:30Z
Asia/Kolkata 2026-10-26T14:00 2026-10-26T08:30Z
Asia/Kathmandu 2026-01-15T09:00 2026-01-15T03:15Z
Asia/Kathmandu 2026-10-26T14:00 2026-10-26T08:15Z
Asia/Tokyo 2026-01-15T09:00 2026-01-15T00:00Z
Asia/Tokyo 2026-10-26T14:00 2026-10-26T05:00Z`.split('\n').map((l) => l.split(' '));
  vrai('la population : 94 faits, 12 fuseaux', FAITS.length === 94 && new Set(FAITS.map((f) => f[0])).size === 12);
  const ecartService = FAITS.filter(([tz, loc, utc]) => iso(local(tz, loc)) !== utc);
  v('⛔ le calendrier du service rend l\'instant du monde réel pour les 94 heures locales (dont les heures absentes et vécues deux fois)', ecartService, []);
  /* le fichier d'une série QUOTIDIENNE qui commence la VEILLE à la même heure locale : sa deuxième occurrence est le jour du fait, et c'est l'agenda indépendant qui la lit */
  const ecartFichier = [];
  for (const [tz, loc, utc] of FAITS) {
    const jour = loc.slice(0, 10), h = loc.slice(11);
    const veille = C.formaterDate(C.ajouterJours(C.lireDate(jour), -1));
    const reel = agendaDit(reunion(tz, veille + 'T' + h, 30, 'quotidienne', { n: 3 }), {}, 10).map((o) => iso(o.debut));
    if (reel[1] !== utc) ecartFichier.push(tz + ' ' + loc + ' → attendu ' + utc + ', fichier ' + reel[1]);
  }
  v('⛔ le FICHIER d\'une série quotidienne, relu par l\'agenda indépendant, retrouve l\'instant du monde réel pour chacune des 94 heures — absentes, vécues deux fois, ordinaires, demi-heures, trois quarts d\'heure', ecartFichier, []);
}

console.log('\nUne réunion sans répétition : écrite en UTC, sans VTIMEZONE');
{
  const r = reunion(PARIS, '2026-10-26T14:00', 60, 'aucune', { lieu: 'Salle Pasteur', titre: 'Revue de chantier' });
  const texte = I.fichier(r, { maintenant: MAINTENANT, rappels: [15] });
  const [cal] = arbre(Buffer.from(texte));
  const ev = cal.enfants.find((c) => c.nom === 'VEVENT');
  v('l\'enveloppe : VCALENDAR 2.0, PRODID de TEAM OP, METHOD:PUBLISH', [cal.nom, prop(cal, 'VERSION').valeur, prop(cal, 'PRODID').valeur, prop(cal, 'METHOD').valeur, prop(cal, 'CALSCALE').valeur], ['VCALENDAR', '2.0', '-//TEAM OP//OP MESSAGES//FR', 'PUBLISH', 'GREGORIAN']);
  v('un seul VEVENT, aucun VTIMEZONE (l\'instant est en UTC : l\'agenda le montre dans le fuseau de la personne)', [cal.enfants.filter((c) => c.nom === 'VEVENT').length, cal.enfants.filter((c) => c.nom === 'VTIMEZONE').length], [1, 0]);
  v('⛔ lundi 26 octobre 2026, 14:00 à Paris = 13:00 UTC (heure d\'hiver) ; la fin une heure après', [prop(ev, 'DTSTART').valeur, prop(ev, 'DTEND').valeur], ['20261026T130000Z', '20261026T140000Z']);
  v('le titre, le lieu, le statut, la description fixe', [sans(prop(ev, 'SUMMARY').valeur), sans(prop(ev, 'LOCATION').valeur), prop(ev, 'STATUS').valeur, sans(prop(ev, 'DESCRIPTION').valeur)], ['Revue de chantier', 'Salle Pasteur', 'CONFIRMED', 'Réunion programmée avec OP MESSAGES.']);
  v('l\'identifiant est celui de la réunion (stable : un deuxième téléchargement MET À JOUR l\'événement au lieu d\'en ajouter un) et son suffixe est celui que la RFC 2606 réserve aux noms qui ne désignent rien (aucun nom d\'hôte réel n\'est écrit en dur dans le service)', prop(ev, 'UID').valeur, 'reunion-r0123456789abcdef@opmessages.invalid');
  v('DTSTAMP est l\'heure du service (injectée), SEQUENCE la version de la réunion', [prop(ev, 'DTSTAMP').valeur, prop(ev, 'SEQUENCE').valeur], ['20261003T093000Z', '0']);
  v('sans lieu, pas de LOCATION', arbre(Buffer.from(I.fichier(Object.assign({}, r, { lieu: '' }), { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT').props.some((p) => p.nom === 'LOCATION'), false);
  v('⛔ deux fichiers de la même réunion, à la même heure du service, sont identiques (aucun identifiant ni horodatage aléatoire : un deuxième passage)', I.fichier(r, { maintenant: MAINTENANT, rappels: [15] }), texte);
  const annulee = arbre(Buffer.from(I.fichier(Object.assign({}, r, { annulee: true, version: 3 }), { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT');
  v('une réunion annulée : STATUS:CANCELLED, et la version monte (l\'agenda remplace l\'événement qu\'il avait)', [prop(annulee, 'STATUS').valeur, prop(annulee, 'SEQUENCE').valeur, prop(annulee, 'UID').valeur], ['CANCELLED', '3', prop(ev, 'UID').valeur]);
  v('le lecteur indépendant retrouve la même réunion', occurrencesLues(arbre(Buffer.from(texte)), 5).map((o) => [iso(o.debut), iso(o.fin)]), [['2026-10-26T13:00Z', '2026-10-26T14:00Z']]);
}

console.log('\nLes rappels : 5 min, 15 min, 1 h en durées exactes ; « 1 jour » en jour civil pour une série, en durée exacte pour une occurrence en UTC');
{
  const alarmes = (texte) => arbre(Buffer.from(texte))[0].enfants.find((c) => c.nom === 'VEVENT').enfants.filter((c) => c.nom === 'VALARM').map((a) => [prop(a, 'ACTION').valeur, prop(a, 'TRIGGER').valeur]);
  const r = reunion(PARIS, '2026-10-26T14:00', 60, 'aucune', { titre: 'Point' });
  v('5, 15, 60 minutes, dans l\'ordre, ACTION:DISPLAY', alarmes(I.fichier(r, { maintenant: MAINTENANT, rappels: [60, 5, 15] })), [['DISPLAY', '-PT5M'], ['DISPLAY', '-PT15M'], ['DISPLAY', '-PT1H']]);
  v('⛔ lundi 26 octobre 14:00 (après la bascule) : la veille à 14:00 est 24 heures avant → -PT24H', alarmes(I.fichier(r, { maintenant: MAINTENANT, rappels: [1440] })), [['DISPLAY', '-PT24H']]);
  const nuit = reunion(PARIS, '2026-10-26T00:30', 60, 'aucune', { titre: 'Point de nuit' });
  v('⛔ lundi 26 octobre 00:30 : la veille 00:30 est encore l\'heure d\'été → 25 heures avant, écrites telles quelles dans une réunion en UTC', alarmes(I.fichier(nuit, { maintenant: MAINTENANT, rappels: [1440] })), [['DISPLAY', '-PT25H']]);
  const s = reunion(PARIS, '2026-10-26T00:30', 60, 'hebdomadaire', { titre: 'Point de nuit' });
  v('⛔ la SÉRIE écrite en heure locale dit « un jour civil » (-P1D) : c\'est l\'agenda qui compte 25 heures le jour de la bascule', alarmes(I.fichier(s, { maintenant: MAINTENANT, rappels: [1440] })), [['DISPLAY', '-P1D']]);
  v('une occurrence de cette série, écrite en UTC, retombe sur la durée exacte', alarmes(I.fichier(s, { maintenant: MAINTENANT, rappels: [1440], occurrence: s.debut })), [['DISPLAY', '-PT25H']]);
  v('un rappel que le service ne connaît pas n\'entre pas dans le fichier (7 minutes, zéro, du texte, un doublon sans effet)', alarmes(I.fichier(r, { maintenant: MAINTENANT, rappels: [7, 0, '15', -5, null, 5] })), [['DISPLAY', '-PT5M']]);
  v('aucun rappel : aucun VALARM', alarmes(I.fichier(r, { maintenant: MAINTENANT })), []);
}

console.log('\nUne SÉRIE : l\'heure locale, le fuseau, la règle — lus par l\'agenda indépendant');
{
  const r = reunion(PARIS, '2026-10-12T14:00', 60, 'hebdomadaire', { n: 4, titre: 'Point hebdo' });
  const texte = I.fichier(r, { maintenant: MAINTENANT });
  const [cal] = arbre(Buffer.from(texte));
  const ev = cal.enfants.find((c) => c.nom === 'VEVENT');
  v('DTSTART et DTEND portent le fuseau et l\'heure LOCALE ; la règle dit le jour de la semaine et le nombre', [prop(ev, 'DTSTART').params.TZID, prop(ev, 'DTSTART').valeur, prop(ev, 'DTEND').valeur, prop(ev, 'RRULE').valeur], [PARIS, '20261012T140000', '20261012T150000', 'FREQ=WEEKLY;BYDAY=MO;COUNT=4']);
  v('le VTIMEZONE est présent, une fois, sous le TZID de la réunion', cal.enfants.filter((c) => c.nom === 'VTIMEZONE').map((c) => prop(c, 'TZID').valeur), [PARIS]);
  const vtz = cal.enfants.find((c) => c.nom === 'VTIMEZONE');
  v('Paris : la règle annuelle des deux changements (dernier dimanche de mars, 02:00, +1 → +2 ; dernier dimanche d\'octobre, 03:00, +2 → +1)',
    vtz.enfants.filter((c) => prop(c, 'RRULE')).map((c) => [c.nom, prop(c, 'TZOFFSETFROM').valeur, prop(c, 'TZOFFSETTO').valeur, prop(c, 'DTSTART').valeur.slice(9), prop(c, 'RRULE').valeur]),
    [['DAYLIGHT', '+0100', '+0200', '020000', 'FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU'], ['STANDARD', '+0200', '+0100', '030000', 'FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU']]);
  const occ = agendaDit(r, {}, 10);
  v('⛔ LU DANS LE FICHIER : lundi 12 et 19 octobre à 12:00 UTC (heure d\'été), lundi 26 octobre et 2 novembre à 13:00 UTC (heure d\'hiver) — l\'heure locale tient à travers le 25 octobre', occ.map((o) => iso(o.debut)), ['2026-10-12T12:00Z', '2026-10-19T12:00Z', '2026-10-26T13:00Z', '2026-11-02T13:00Z']);
  v('   et c\'est exactement ce que dit le calendrier du service', occ, serviceDit(r, 10));
  v('⛔ une série décalée de 7 × 24 h (la faute que le fichier évite) donnerait 12:00 UTC le 26 octobre : le lecteur ne s\'y trompe pas', iso(occ[2].debut) === '2026-10-26T13:00Z' && iso(occ[2].debut) !== iso(occ[1].debut + 7 * 86400000), true);
}

console.log('\nLes limites d\'une série : UNTIL en UTC, COUNT, jamais les deux ; un mois sans le 31 n\'a pas d\'occurrence');
{
  const r1 = reunion(PARIS, '2026-10-20T09:00', 30, 'quotidienne', { jusqua: '2026-10-27' });
  const e1 = arbre(Buffer.from(I.fichier(r1, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT');
  v('⛔ UNTIL est en UTC : le 27 octobre à 23:59:59 heure de Paris (hiver, +1 h) → 22:59:59Z', prop(e1, 'RRULE').valeur, 'FREQ=DAILY;UNTIL=20261027T225959Z');
  v('   le lecteur trouve huit jours (20 au 27 octobre inclus), comme le service', [agendaDit(r1, {}, 50).length, agendaDit(r1, {}, 50)], [8, serviceDit(r1, 50)]);
  const r1b = reunion(PARIS, '2026-10-20T00:30', 30, 'quotidienne', { jusqua: '2026-10-25' });
  const o1b = agendaDit(r1b, {}, 50);
  v('⛔ la dernière occurrence d\'un jour de bascule (25 octobre, 00:30 : encore l\'heure d\'été) est INCLUSE', [o1b.length, iso(o1b[o1b.length - 1].debut)], [6, '2026-10-24T22:30Z']);
  const r2 = reunion(PARIS, '2026-10-20T09:00', 30, 'quotidienne', { n: 5 });
  v('COUNT seul', prop(arbre(Buffer.from(I.fichier(r2, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'RRULE').valeur, 'FREQ=DAILY;COUNT=5');
  const r3 = reunion(PARIS, '2026-10-20T09:00', 30, 'quotidienne', { n: 50, jusqua: '2026-10-24' });
  const e3 = arbre(Buffer.from(I.fichier(r3, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT');
  v('⛔ les deux limites : la RFC interdit de les écrire ensemble → COUNT vaut le nombre d\'occurrences réelles (cinq jours, la limite arrive la première), pas de UNTIL', [prop(e3, 'RRULE').valeur, agendaDit(r3, {}, 99).length], ['FREQ=DAILY;COUNT=5', 5]);
  const r3b = reunion(PARIS, '2026-10-20T09:00', 30, 'quotidienne', { n: 3, jusqua: '2026-10-30' });
  v('   et quand le nombre arrive le premier : COUNT=3', [prop(arbre(Buffer.from(I.fichier(r3b, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'RRULE').valeur, agendaDit(r3b, {}, 99).length], ['FREQ=DAILY;COUNT=3', 3]);
  const r4 = reunion(PARIS, '2026-01-31T10:00', 60, 'mensuelle', { n: 4 });
  const e4 = arbre(Buffer.from(I.fichier(r4, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT');
  v('⛔ « le 31 » mensuel : BYMONTHDAY=31, et les mois de 30 jours ou moins sont SAUTÉS sans être comptés (31 janvier, 31 mars, 31 mai, 31 juillet)', [prop(e4, 'RRULE').valeur, agendaDit(r4, {}, 10).map((o) => C.formaterLocal(o.debut, PARIS).slice(0, 10))], ['FREQ=MONTHLY;BYMONTHDAY=31;COUNT=4', ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31']]);
  v('   comme le service', agendaDit(r4, {}, 10), serviceDit(r4, 10));
  const r5 = reunion('Pacific/Auckland', '2026-03-02T08:30', 45, 'hebdomadaire', {});
  const o5 = agendaDit(r5, {}, 60);
  v('une série SANS limite : le fichier est fini et l\'agenda répète (la règle n\'a ni COUNT ni UNTIL) ; ses 60 premières occurrences sont celles du service', [prop(arbre(Buffer.from(I.fichier(r5, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'RRULE').valeur, o5.length, o5], ['FREQ=WEEKLY;BYDAY=MO', 60, serviceDit(r5, 60)]);
}

console.log('\n⛔ LE FICHIER D\'UNE SÉRIE, SUR CHAQUE FUSEAU, DIT CE QUE DIT LE SERVICE — des heures qui tombent dans les trous et les doublons');
{
  /* Des fuseaux de toute nature : entiers, demi-heure, trois quarts d'heure, hémisphère sud, demi-heure de changement (Lord Howe), SANS règle annuelle exprimable en « n-ième jour de la
     semaine » (Jérusalem : le vendredi avant le dernier dimanche de mars ; Santiago, Le Caire, Nuuk, Gaza ; le Maroc et ses changements de ramadan), avec UN SEUL changement dans la période
     (Vancouver : l'heure d'été permanente depuis mars 2026), sans changement (le Brésil depuis 2019, l'Iran depuis 2022), UTC. */
  const ZONES = ['Europe/Paris', 'Europe/London', 'Europe/Dublin', 'America/New_York', 'America/Los_Angeles', 'America/Santiago', 'America/Sao_Paulo', 'Australia/Sydney', 'Australia/Lord_Howe', 'Pacific/Auckland', 'Pacific/Chatham',
    'Asia/Kolkata', 'Asia/Kathmandu', 'Asia/Tehran', 'Asia/Tokyo', 'Africa/Casablanca', 'Africa/Cairo', 'Asia/Jerusalem', 'America/Vancouver', 'America/Godthab', 'Asia/Gaza', 'Europe/Moscow', 'UTC', 'Etc/GMT+5'];
  const HEURES = ['00:30', '02:15', '02:30', '03:30', '23:30'];
  const ecarts = [], tailles = [];
  let essais = 0, occurrencesVues = 0;
  for (const tz of ZONES) {
    for (const h of HEURES) {
      for (const [rep, debut, plus] of [['quotidienne', '2026-03-01', { n: 420 }], ['hebdomadaire', '2026-03-02', { n: 120 }], ['mensuelle', '2026-01-31', { n: 20 }], ['quotidienne', '2026-10-01', { jusqua: '2027-04-15' }]]) {
        const r = reunion(tz, debut + 'T' + h, 45, rep, plus);
        const texte = I.fichier(r, { maintenant: MAINTENANT });
        const lues = occurrencesLues(arbre(Buffer.from(texte)), 600), attendues = serviceDit(r, 600);
        essais++; occurrencesVues += lues.length;
        if (JSON.stringify(lues) !== JSON.stringify(attendues)) {
          const i = lues.findIndex((o, k) => !attendues[k] || o.debut !== attendues[k].debut || o.fin !== attendues[k].fin);
          ecarts.push(tz + ' ' + rep + ' ' + h + ' : rang ' + i + ' agenda ' + (lues[i] ? iso(lues[i].debut) : '—') + ' service ' + (attendues[i] ? iso(attendues[i].debut) : '—') + ' (' + lues.length + '/' + attendues.length + ')');
        }
        tailles.push(texte.length);
      }
    }
  }
  vrai('la population : ' + essais + ' fichiers lus (' + ZONES.length + ' fuseaux × 5 heures × 4 séries), ' + occurrencesVues + ' occurrences comparées', essais === ZONES.length * 20 && occurrencesVues > 70000);
  v('⛔ ' + essais + ' fichiers : les occurrences lues par l\'agenda indépendant égalent celles du service, à l\'instant et à la durée près', ecarts, []);
  vrai('un fichier de série reste petit (moins de 6 Ko pour tous, même le fuseau sans règle annuelle qui énumère ses changements)', Math.max.apply(null, tailles) < 6000);
}

console.log('\nLe VTIMEZONE de chaque famille de fuseaux');
{
  const vtz = (tz, texteDebut, extra) => arbre(Buffer.from(I.fichier(reunion(tz, texteDebut || '2026-10-26T14:00', 60, 'hebdomadaire', extra || { n: 3 }), { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VTIMEZONE');
  const regles = (z) => z.enfants.filter((c) => prop(c, 'RRULE')).map((c) => c.nom + ' ' + prop(c, 'TZOFFSETFROM').valeur + '>' + prop(c, 'TZOFFSETTO').valeur + ' ' + prop(c, 'RRULE').valeur);
  v('New York : le deuxième dimanche de mars, le premier dimanche de novembre', regles(vtz('America/New_York')), ['DAYLIGHT -0500>-0400 FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'STANDARD -0400>-0500 FREQ=YEARLY;BYMONTH=11;BYDAY=1SU']);
  v('Sydney (hémisphère sud) : le premier dimanche d\'octobre, le premier dimanche d\'avril', regles(vtz('Australia/Sydney')), ['DAYLIGHT +1000>+1100 FREQ=YEARLY;BYMONTH=10;BYDAY=1SU', 'STANDARD +1100>+1000 FREQ=YEARLY;BYMONTH=4;BYDAY=1SU']);
  v('Lord Howe : des changements d\'une DEMI-heure (+10:30 ↔ +11:00)', regles(vtz('Australia/Lord_Howe')).map((x) => x.split(' ').slice(0, 2).join(' ')), ['DAYLIGHT +1030>+1100', 'STANDARD +1100>+1030']);
  v('Chatham : +12:45 ↔ +13:45', regles(vtz('Pacific/Chatham')).map((x) => x.split(' ').slice(0, 2).join(' ')), ['DAYLIGHT +1245>+1345', 'STANDARD +1345>+1245']);
  const inde = vtz('Asia/Kolkata');
  v('L\'Inde (+5:30) ne change jamais : un seul composant, de +0530 vers +0530, sans règle', inde.enfants.map((c) => [c.nom, prop(c, 'TZOFFSETFROM').valeur, prop(c, 'TZOFFSETTO').valeur, !!prop(c, 'RRULE'), !!prop(c, 'RDATE')]), [['STANDARD', '+0530', '+0530', false, false]]);
  v('le Népal (+5:45) de même', vtz('Asia/Kathmandu').enfants.map((c) => [prop(c, 'TZOFFSETTO').valeur]), [['+0545']]);
  /* Une série SANS FIN est sondée sur treize ans : assez pour voir qu'une règle supposée ne tient pas. (Une série qui s'arrête dans trois ans n'a besoin du fuseau que pour ces trois ans : la règle
     qu'on déduit y est juste, même si elle ne le serait pas en 2028.) */
  const jerusalem = vtz('Asia/Jerusalem', null, {});
  vrai('⛔ Jérusalem n\'a PAS de règle annuelle en « n-ième jour de la semaine » (le vendredi avant le dernier dimanche de mars : tantôt le quatrième vendredi, tantôt le cinquième) : sur une série sans fin, chaque changement est écrit à sa date (RDATE), jamais une règle fausse',
    jerusalem.enfants.some((c) => prop(c, 'RDATE')) && !jerusalem.enfants.some((c) => prop(c, 'RRULE')));
  const vancouverAvant = vtz('America/Vancouver', '2026-10-26T14:00', {});
  v('Vancouver : passé à l\'heure d\'été permanente en mars 2026. Sondé depuis 2025, il garde trois changements (mars 2025, novembre 2025, mars 2026), SANS règle (les passages vers l\'été et vers l\'hiver ne sont pas en nombre égal)',
    vancouverAvant.enfants.map((c) => [c.nom, prop(c, 'TZOFFSETFROM').valeur + '>' + prop(c, 'TZOFFSETTO').valeur, !!prop(c, 'RRULE'), prop(c, 'RDATE') ? prop(c, 'RDATE').valeur.split(',').length : 0]),
    [['STANDARD', '-0800>-0800', false, 0], ['DAYLIGHT', '-0800>-0700', false, 1], ['STANDARD', '-0700>-0800', false, 0]]);
  const vancouverApres = vtz('America/Vancouver', '2030-10-26T14:00', {});
  v('et pour une série de 2030, plus aucun changement : un seul composant, de -0700 vers -0700', vancouverApres.enfants.map((c) => [c.nom, prop(c, 'TZOFFSETFROM').valeur + '>' + prop(c, 'TZOFFSETTO').valeur, !!prop(c, 'RRULE'), !!prop(c, 'RDATE')]), [['STANDARD', '-0700>-0700', false, false]]);
  const brut = I.fichier(reunion(PARIS, '2026-10-26T14:00', 60, 'hebdomadaire', { n: 3 }), { maintenant: MAINTENANT });
  vrai('TZNAME est donné (une abréviation lisible) pour chaque composant qui change', arbre(Buffer.from(brut))[0].enfants.find((c) => c.nom === 'VTIMEZONE').enfants.every((c) => !!prop(c, 'TZNAME')));
  const tr = I.transitions(PARIS, U(2026, 1, 1), U(2027, 1, 1));
  v('⛔ les changements de Paris en 2026, à la seconde : 29 mars à 01:00:00 UTC (+1 h → +2 h), 25 octobre à 01:00:00 UTC (+2 h → +1 h)', tr.map((x) => [iso(x.t), x.avant / 3600000, x.apres / 3600000]), [['2026-03-29T01:00Z', 1, 2], ['2026-10-25T01:00Z', 2, 1]]);
  v('Lord Howe en 2026, à la seconde : 04 avril à 15:00 UTC (+11 → +10:30), 03 octobre à 15:30 UTC (+10:30 → +11)', I.transitions('Australia/Lord_Howe', U(2026, 1, 1), U(2027, 1, 1)).map((x) => [iso(x.t), x.avant / 3600000, x.apres / 3600000]), [['2026-04-04T15:00Z', 11, 10.5], ['2026-10-03T15:30Z', 10.5, 11]]);
  v('un fuseau qui ne change pas n\'a aucun changement', I.transitions('Asia/Kolkata', U(2026, 1, 1), U(2036, 1, 1)), []);
  /* L'ÉTAT DE DÉPART : tout VTIMEZONE commence par un composant qui ne change rien (de son décalage vers lui-même, depuis 1970) : un agenda qui lit une heure avant le premier changement
     ne devine pas. Il existe pour les trois formes de fuseau (règle annuelle, changements énumérés, aucun changement). */
  const departs = ['Europe/Paris', 'Africa/Casablanca', 'Asia/Kolkata'].map((tz) => { const c = vtz(tz).enfants[0]; return [tz, prop(c, 'DTSTART').valeur, prop(c, 'TZOFFSETFROM').valeur === prop(c, 'TZOFFSETTO').valeur, !prop(c, 'RRULE') && !prop(c, 'RDATE')]; });
  v('⛔ chaque VTIMEZONE (règle annuelle, changements énumérés, aucun changement) ouvre sur son état de départ : DTSTART:19700101T000000, même décalage des deux côtés, aucune règle', departs, [['Europe/Paris', '19700101T000000', true, true], ['Africa/Casablanca', '19700101T000000', true, true], ['Asia/Kolkata', '19700101T000000', true, true]]);
  /* Une série LONGUE sur un fuseau SANS règle annuelle : le VTIMEZONE doit couvrir toute la série, pas seulement dix ans (au-delà, l'agenda garderait le dernier décalage connu). */
  const longue = reunion('Asia/Jerusalem', '2026-03-02T09:00', 60, 'hebdomadaire', { n: 700 });
  const oLongue = agendaDit(longue, {}, 800);
  v('⛔ 700 lundis à Jérusalem (treize ans et demi, au-delà des dix ans par défaut) : le fichier décrit le fuseau jusqu\'à la dernière occurrence', [oLongue.length, JSON.stringify(oLongue) === JSON.stringify(serviceDit(longue, 800))], [700, true]);
  const bornee2 = reunion('Asia/Jerusalem', '2026-03-02T09:00', 60, 'quotidienne', { jusqua: '2042-12-31' });
  const oBornee = agendaDit(bornee2, {}, 7000);
  v('   de même une série quotidienne bornée par une date lointaine (31 décembre 2042) : plus de six mille jours, tous identiques à ceux du service', [oBornee.length > 6000, JSON.stringify(oBornee) === JSON.stringify(serviceDit(bornee2, 7000))], [true, true]);
  const lointain = reunion(PARIS, '2098-06-01T09:00', 60, 'hebdomadaire', {});
  const oL = agendaDit(lointain, {}, 120).filter((o) => o.debut < C.T_MAX);   // le service ne place rien après le 1er janvier 2100 : on compare jusque-là
  vrai('la population : une série de 2098 à 2100 compte plus de 80 occurrences', oL.length > 80);
  v('une série qui commence en 2098 (au bord de la période permise) est lue comme le service la compte', oL, serviceDit(lointain, 120));
}

console.log('\nDéduire une règle annuelle de changements observés : seulement quand TOUT concorde (la fonction seule, sur des changements fabriqués)');
{
  const H = 3600000;
  /* un changement « vers l'heure d'été » à l'instant UTC donné, du décalage `avant` vers `apres` */
  const tr = (a, m, j, h, avant, apres) => ({ t: U(a, m, j, h), avant: (avant === undefined ? 1 : avant) * H, apres: (apres === undefined ? 2 : apres) * H });
  const dernierDimanche = [tr(2025, 3, 30, 1), tr(2026, 3, 29, 1), tr(2027, 3, 28, 1)];
  v('le dernier dimanche de mars à la même heure, trois ans : la règle (mois 3, dimanche, dernier)', I.regleAnnuelle(dernierDimanche), { mois: 3, jour: 0, rang: -1 });
  v('⛔ un seul changement ne fait pas une règle', I.regleAnnuelle(dernierDimanche.slice(0, 1)), null);
  v('⛔ l\'une des années à une AUTRE heure : pas de règle', I.regleAnnuelle([tr(2025, 3, 30, 1), tr(2026, 3, 29, 2), tr(2027, 3, 28, 1)]), null);
  v('⛔ l\'une des années dans un AUTRE mois : pas de règle', I.regleAnnuelle([tr(2025, 3, 30, 1), tr(2026, 3, 29, 1), tr(2027, 4, 4, 1)]), null);
  v('⛔ une date FIXE (le 21 mars : un jour de semaine différent chaque année) n\'est pas « le n-ième dimanche » : pas de règle', I.regleAnnuelle([tr(2025, 3, 21, 1), tr(2026, 3, 21, 1), tr(2027, 3, 21, 1)]), null);
  v('⛔ le même jour de semaine mais tantôt le troisième, tantôt le dernier : pas de règle (Jérusalem : le vendredi avant le dernier dimanche)', I.regleAnnuelle([tr(2025, 3, 21, 1), tr(2026, 3, 29, 1), tr(2027, 3, 21, 1)]), null);
  v('⛔ le même dimanche de rang constant (le deuxième dimanche de mars, 2025 à 2027) : la règle est « le deuxième »', I.regleAnnuelle([tr(2025, 3, 9, 1), tr(2026, 3, 8, 1), tr(2027, 3, 14, 1)]), { mois: 3, jour: 0, rang: 2 });
  v('⛔ des décalages différents d\'une année à l\'autre (+1 → +2, puis +1 → +3) : pas de règle', I.regleAnnuelle([tr(2025, 3, 30, 1), tr(2026, 3, 29, 1, 1, 3), tr(2027, 3, 28, 1)]), null);
  /* le « dernier » passe avant le « n-ième » : tous les dimanches 25 à 31 sont des derniers dimanches, et le quatrième seulement quand le mois a quatre dimanches pleins */
  v('un quatrième dimanche qui est aussi le dernier (octobre 2026 : le 25) est lu « le dernier » quand tous le sont', I.regleAnnuelle([tr(2025, 10, 26, 1, 2, 1), tr(2026, 10, 25, 1, 2, 1), tr(2027, 10, 31, 1, 2, 1)]), { mois: 10, jour: 0, rang: -1 });
}

console.log('\nUne OCCURRENCE d\'une série : écrite en UTC, sans règle, identifiant propre');
{
  const s = reunion(PARIS, '2026-10-12T14:00', 60, 'hebdomadaire', { titre: 'Point hebdo' });
  const t26 = local(PARIS, '2026-10-26T14:00');
  const texte = I.fichier(s, { maintenant: MAINTENANT, occurrence: t26 });
  const ev = arbre(Buffer.from(texte))[0].enfants.find((c) => c.nom === 'VEVENT');
  v('⛔ le lundi 26 octobre seul : 13:00 UTC, aucun RRULE, aucun VTIMEZONE', [prop(ev, 'DTSTART').valeur, prop(ev, 'DTEND').valeur, !!prop(ev, 'RRULE'), arbre(Buffer.from(texte))[0].enfants.some((c) => c.nom === 'VTIMEZONE')], ['20261026T130000Z', '20261026T140000Z', false, false]);
  const uidSerie = prop(arbre(Buffer.from(I.fichier(s, { maintenant: MAINTENANT })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'UID').valeur;
  const uidOcc = prop(ev, 'UID').valeur;
  vrai('⛔ l\'identifiant de l\'occurrence n\'est PAS celui de la série (importer les deux ne remplace pas la série par une seule date), et il est stable', uidOcc !== uidSerie && uidOcc === prop(arbre(Buffer.from(I.fichier(s, { maintenant: MAINTENANT, occurrence: t26 })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'UID').valeur && /^reunion-r0123456789abcdef-20261026T130000Z@/.test(uidOcc));
  v('deux occurrences différentes ont deux identifiants différents', prop(arbre(Buffer.from(I.fichier(s, { maintenant: MAINTENANT, occurrence: local(PARIS, '2026-10-19T14:00') })))[0].enfants.find((c) => c.nom === 'VEVENT'), 'UID').valeur !== uidOcc, true);
  v('⛔ un instant qui n\'est PAS une occurrence de la série (un mardi, une heure à côté, avant le début) → null, pas un fichier au hasard',
    [I.fichier(s, { occurrence: local(PARIS, '2026-10-27T14:00') }), I.fichier(s, { occurrence: t26 + 60000 }), I.fichier(s, { occurrence: local(PARIS, '2026-10-05T14:00') })], [null, null, null]);
  const bornee = reunion(PARIS, '2026-10-12T14:00', 60, 'hebdomadaire', { n: 2 });
  v('au-delà de la fin de la série : null', I.fichier(bornee, { occurrence: local(PARIS, '2026-10-26T14:00') }), null);
  const simple = reunion(PARIS, '2026-10-26T14:00', 60, 'aucune', {});
  v('une réunion sans répétition : son occurrence est elle-même ; un autre instant : on la sert quand même (rien à comparer) — la route décide', typeof I.fichier(simple, { occurrence: simple.debut }), 'string');
}

console.log('\n⛔ UN TEXTE VENU DU MONDE NE PEUT OUVRIR NI UNE LIGNE, NI UN COMPOSANT, NI UNE PROPRIÉTÉ');
{
  const PROPRIETES = new Set(['UID', 'DTSTAMP', 'SEQUENCE', 'DTSTART', 'DTEND', 'RRULE', 'SUMMARY', 'LOCATION', 'DESCRIPTION', 'STATUS', 'TRANSP']);
  const forme = (titre, lieu, rep) => {
    const r = reunion(PARIS, '2026-10-26T14:00', 60, rep || 'aucune', { titre, lieu });
    const cal = arbre(Buffer.from(I.fichier(r, { maintenant: MAINTENANT, rappels: [15] })))[0];
    const ev = cal.enfants.find((c) => c.nom === 'VEVENT');
    return { composants: cal.enfants.map((c) => c.nom), evenements: cal.enfants.filter((c) => c.nom === 'VEVENT').length, proprietes: ev.props.map((p) => p.nom), horsListe: ev.props.filter((p) => !PROPRIETES.has(p.nom)).map((p) => p.nom), sousComposants: ev.enfants.map((c) => c.nom), titre: sans(prop(ev, 'SUMMARY').valeur), lieu: prop(ev, 'LOCATION') ? sans(prop(ev, 'LOCATION').valeur) : null };
  };
  const NORMAL = forme('Point', 'Salle');
  const ATTAQUES = [
    'x\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:y',
    'x\nATTENDEE;CN=Intrus:mailto:intrus@example.org',
    'x\rORGANIZER:mailto:intrus@example.org',
    'x\r\n DESCRIPTION:continuation',
    'x\u2028ATTENDEE:mailto:intrus@example.org',
    'x\u0085ATTENDEE:mailto:intrus@example.org',
    'x\u2029END:VCALENDAR',
    'x;TZID=Mars/Phobos:20261026T140000',
    'x\\nEND:VEVENT',
    '\\',
    'x\u0000y\u0007z\u001b[2J',
  ];
  const faux = [];
  for (const a of ATTAQUES) {
    for (const [titre, lieu] of [[a, 'Salle'], ['Point', a]]) {
      const f = forme(titre, lieu);
      if (f.evenements !== 1 || f.horsListe.length || JSON.stringify(f.proprietes) !== JSON.stringify(NORMAL.proprietes) || JSON.stringify(f.sousComposants) !== JSON.stringify(NORMAL.sousComposants) || JSON.stringify(f.composants) !== JSON.stringify(NORMAL.composants)) faux.push(JSON.stringify(a).slice(0, 50));
    }
  }
  v('la population : ' + ATTAQUES.length + ' attaques × titre et lieu = ' + ATTAQUES.length * 2 + ' fichiers, tous lus par le lecteur strict', ATTAQUES.length * 2, 22);
  v('⛔ aucune attaque ne crée un second VEVENT, une propriété de plus (ATTENDEE, ORGANIZER, un TZID), un sous-composant de plus, ni ne ferme VCALENDAR', faux, []);
  v('le texte survit à l\'aller-retour : virgules, points-virgules, barres obliques inverses, sauts de ligne (et il perd ses caractères de contrôle)', [forme('Budget, achats; reste \\ « fin »\nligne 2', 'Salle B, étage 2').titre, forme('a\u0000b\u0007c', '').titre, forme('x\r\ny', '').titre], ['Budget, achats; reste \\ « fin »\nligne 2', 'abc', 'x\ny']);
  v('⛔ une barre oblique inverse que la personne a tapée, suivie d\'un « n » ou d\'un point-virgule, reste ce qu\'elle a tapé (elle est échappée : sinon l\'agenda lirait un saut de ligne ou un séparateur)', [forme('a\\nb', 'c\\;d').titre, forme('a\\nb', 'c\\;d').lieu, forme('fin\\', '\\\\').titre, forme('fin\\', '\\\\').lieu], ['a\\nb', 'c\\;d', 'fin\\', '\\\\']);
  v('un titre vide reste une propriété SUMMARY vide (le service refuse un titre vide plus tôt) ; un lieu `null` ne crée pas de LOCATION', [forme('', null).titre, forme('t', null).lieu], ['', null]);
  /* le texte, propriété : toute chaîne aléatoire (mais fixée par une graine) aller-retour */
  let graine = 20261003; const hasard = (n) => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine % n; };
  const ALPHABET = ['a', 'n', 'N', 'Z', '0', ' ', ',', ';', '\\', '\n', '\r', '\r\n', ':', '=', '"', 'é', 'ç', 'œ', '€', '日', '本', '😀', '🇫🇷', '\u0000', '\u0007', '\u001f', '\u007f', '\u2028', '\u0085', '\t'];
  const normaliser = (s) => s.replace(/\r\n|\r|\u0085|\u2028|\u2029/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  const mauvais = [];
  for (let i = 0; i < 600; i++) {
    let s = ''; const n = hasard(120);
    for (let k = 0; k < n; k++) s += ALPHABET[hasard(ALPHABET.length)];
    const e = I.texte(s);
    if (sans(e) !== normaliser(s) || /[\r\n\u0085\u2028\u2029\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(e) || /(^|[^\\])(\\\\)*[;,]/.test(e)) mauvais.push(JSON.stringify(s).slice(0, 40));
  }
  v('⛔ 600 textes tirés au sort : relire un texte échappé rend le texte (aux sauts de ligne normalisés et aux contrôles retirés près) ; aucune virgule ni point-virgule n\'y reste non échappé ; aucun saut de ligne brut', mauvais, []);
}

console.log('\nLe pliage à 75 octets : jamais une ligne plus longue, jamais un caractère UTF-8 coupé');
{
  let graine = 7311; const hasard = (n) => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine % n; };
  const MORCEAUX = ['a', 'b', ' ', 'é', 'ç', '€', '日', '本', '語', '😀', '🇫🇷', 'ß'];
  const mauvais = []; let plies = 0;
  for (let i = 0; i < 2000; i++) {
    let s = 'SUMMARY:'; const n = hasard(90);
    for (let k = 0; k < n; k++) s += MORCEAUX[hasard(MORCEAUX.length)];
    const p = I.plier(s), physiques = p.split('\r\n');
    if (physiques.length > 1) plies++;
    const horsLimite = physiques.some((l) => Buffer.byteLength(l, 'utf8') > 75);
    const suites = physiques.slice(1).some((l) => !l.startsWith(' '));
    const recompose = physiques.map((l, k) => k ? l.slice(1) : l).join('');
    if (horsLimite || suites || recompose !== s || p.includes('\uFFFD') || Buffer.from(p, 'utf8').toString('utf8') !== p) mauvais.push(JSON.stringify(s).slice(0, 40));
  }
  vrai('la population : ' + plies + ' lignes pliées sur 2 000 (moins de la moitié, plus de mille : les deux cas sont joués)', plies > 1000 && plies < 2000);
  v('⛔ 2 000 lignes de longueur et de caractères tirés au sort : aucune physique ne dépasse 75 octets (l\'espace de suite comprise), chaque suite commence par une espace, déplier rend la ligne exacte, aucun caractère n\'est coupé', mauvais, []);
  const pile75 = 'X'.repeat(75), pile76 = 'X'.repeat(76);
  v('75 octets pile : aucune coupure ; 76 : une coupure, la suite porte l\'octet restant', [I.plier(pile75) === pile75, I.plier(pile76)], [true, 'X'.repeat(75) + '\r\n X']);
  const emoji = 'X'.repeat(73) + '😀';
  v('⛔ un caractère de quatre octets à cheval sur la limite passe tout entier à la ligne suivante', I.plier(emoji), 'X'.repeat(73) + '\r\n 😀');
  const long = reunion(PARIS, '2026-10-26T14:00', 60, 'aucune', { titre: 'Réunion de lancement du chantier « Résidence Les Hirondelles » — étape 3 : démolition, désamiantage et gros œuvre ' + '日本語'.repeat(30), lieu: 'https://exemple.test/salle/' + 'a'.repeat(120) });
  const cal = arbre(Buffer.from(I.fichier(long, { maintenant: MAINTENANT })))[0];
  const ev = cal.enfants.find((c) => c.nom === 'VEVENT');
  v('un titre et un lieu très longs : le fichier est lu sans erreur (aucune ligne > 75 octets), et le texte rendu est entier', [sans(prop(ev, 'SUMMARY').valeur) === long.titre, sans(prop(ev, 'LOCATION').valeur) === long.lieu], [true, true]);
}

console.log('\nLe nom du fichier téléchargé');
{
  v('ASCII, minuscules, tirets : « Point d\'équipe ☕ / budget » → reunion-point-d-equipe-budget.ics', I.nom({ titre: 'Point d\'équipe ☕ / budget' }), 'reunion-point-d-equipe-budget.ics');
  v('un titre sans lettre ni chiffre ASCII : reunion.ics', [I.nom({ titre: '日本語' }), I.nom({ titre: '' }), I.nom({})], ['reunion.ics', 'reunion.ics', 'reunion.ics']);
  const n = I.nom({ titre: 'a'.repeat(300) });
  vrai('un titre long est coupé à 40 caractères', /^reunion-a{40}\.ics$/.test(n));
  const piege = I.nom({ titre: '"; filename=../../etc/passwd\r\nSet-Cookie: x=1' });
  vrai('⛔ rien de ce qui pourrait refermer le guillemet de Content-Disposition, changer de nom ou ouvrir un en-tête n\'y survit', /^[a-z0-9.-]+$/.test(piege) && !/[.][.]|\//.test(piege));
}

console.log('\nUn fuseau qui n\'est pas celui du service ne produit pas de fichier au hasard');
{
  const r = reunion(PARIS, '2026-10-26T14:00', 60, 'hebdomadaire', {});
  v('⛔ le service ne passe que des fuseaux validés ; si un fuseau inconnu arrivait quand même, le fichier ne naît pas avec un décalage inventé (null)', ['Mars/Phobos', '', null, 12, '../x'].map((tz) => I.fichier(Object.assign({}, r, { tz }), { maintenant: MAINTENANT })), [null, null, null, null, null]);
}

fin();
