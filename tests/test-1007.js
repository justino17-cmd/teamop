/* ══ L'AGENDA, QUATRE GESTES DE JUSTIN (15 octobre 2026) : LA DURÉE SOUS « DÉBUT », « Y ALLER », « COLLER UNE CONFIRMATION », L'APPUI LONG ══════════════════════════
   Justin, captures de la bêta à l'appui : « quand on sélectionne l'heure de début, il faudrait qu'on puisse choisir ce que ça va durer, 30 minutes, une heure ou plus » ;
   « il faudrait pouvoir l'ouvrir à partir de n'importe quel GPS qui est installé sur un téléphone » ; « l'application fait déjà agenda » (plus d'« Ajouter à mon calendrier » dans
   la fiche d'un rendez-vous) et, à la question posée : « quand les gens prennent un rendez-vous sur un site ou autre, ils peuvent l'ajouter à notre calendrier, mais par
   l'application » — d'où « Coller une confirmation » ; enfin l'appui long sur un rendez-vous de l'agenda : « marquer effectué, et ça s'affiche en vert ».

   Ce que ce fichier garde — les VRAIES fonctions de la page (l'aperçu, la source de Justin), exécutées dans un bac à sable :
   1. `lireConfirmation` / `lireIcs` : ce qu'un mail ou un SMS de confirmation donne (date, heure, durée, adresse, avec qui, pour quoi) — Doctolib, un SMS de garage, un mail
      transféré (la date de l'EN-TÊTE ne compte pas), une date de RÉSERVATION non plus, un fichier .ics collé (UTC et fuseau nommé), « 24h/24 », « 3.5 km », le 31 février…
      ⛔ ce qu'on ne trouve pas, on ne l'invente pas (null) ; ⛔ un texte immense ne fige pas la page (borné, mesuré) ;
   2. la durée : `htmlDuree` (30 min, 1 h, « Plus… » jusqu'à 8 h, une durée tapée à la main dite telle quelle), `choisirDuree` / `debutDuree` / `finDuree` sur de faux champs —
      la fin SUIT : une durée la pose, un début changé la déplace d'autant, une fin changée redit sa durée ;
   3. « Y aller » : `liensGps` selon l'appareil (Android : le choix du téléphone ; Apple : Plans ; partout : Google Maps ; Waze en voiture), ⛔ l'adresse ENCODÉE (rien ne
      s'échappe de son paramètre), ⛔ le schéma de chaque lien est le NÔTRE, `destinationGps` (l'arrivée du calcul d'abord ; un lien de visio n'est pas une adresse) ;
   4. le texte de la page, sans commentaires : plus de lien .ics dans la fiche d'un rendez-vous ; « Coller » seulement pour un rendez-vous NEUF ; ⛔ la lecture ne parle à
      personne (aucun `fetch`, aucune `source.` — le texte collé reste sur l'appareil) ; ⛔ aucune assertion arrière dans tout le script (un Safari d'avant iOS 16.4 refuserait la
      page ENTIÈRE) ; « Y aller » dans le menu de l'appui long ; la coche verte d'un rendez-vous fait.
   La couture au navigateur (iPhone, bureau de nuit) : tests/sonde-opmessages-agenda-geste.js. */
'use strict';
process.env.TZ = 'Europe/Paris';                // l'heure de l'appareil : une confirmation se lit en heure LOCALE
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(script);
const CSS = ((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]).replace(/\/\*[\s\S]*?\*\//g, ' ');

/* le corps d'une déclaration, de son début à SA dernière accolade (les chaînes et les gabarits sont sautés) */
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const jusqua = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const M = {
  esc: ligne('const esc = '), estUrl: ligne('const estUrl = '), dureeTr: ligne('const dureeTr = '),
  DUREES_PLUS: ligne('const DUREES_PLUS = '), minutesMur: ligne('const minutesMur = '), minutesEntre: ligne('const minutesEntre = '), plusMinutes: ligne('const plusMinutes = '), ATTR_DUREE: ligne('const ATTR_DUREE = '),
  htmlDuree: decl('function htmlDuree('), dureeChamps: ligne('const dureeChamps = '), peindreDuree: decl('function peindreDuree('), etatDuree: ligne('const etatDuree = '),
  choisirDuree: decl('function choisirDuree('), debutDuree: decl('function debutDuree('), finDuree: ligne('function finDuree('),
  liensGps: decl('function liensGps('), htmlLiensGps: jusqua('const htmlLiensGps = ', 'data-gps-fermer>Annuler</button>\';'), destinationGps: ligne('const destinationGps = '),
  MOIS_FR: decl('const MOIS_FR = '), MOTIFS_RDV: jusqua('const MOTIFS_RDV = ', ']];'), sansAccents: ligne('const sansAccents = '), p2c: ligne('const p2c = '),
  dateJuste: ligne('const dateJuste = '), instantMural: decl('function instantMural('), localDeInstant: ligne('const localDeInstant = '), bornerDuree: ligne('const bornerDuree = '),
  propre: decl('const propre = '), lireIcs: decl('function lireIcs('), lireConfirmation: decl('function lireConfirmation('),
};

/* ═══ le bac à sable : les vraies fonctions, de faux champs ═══ */
function bac(os) {
  const notes = { evts: [], peints: [] };
  const champ = (id, valeur) => ({ id, value: valeur, dispatchEvent(e) { notes.evts.push(id + ':' + e.type); return true; } });
  const zone = (id) => { let html = ''; return { id, hidden: false, contains: () => false, get outerHTML() { return html; }, set outerHTML(h) { html = h; notes.peints.push(id); } }; };
  const E = {};
  const ctx = {
    Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, encodeURIComponent, console, Infinity,
    document: { documentElement: { dataset: { os: os || '' } }, activeElement: null },
    Event: class { constructor(t) { this.type = t; } },
    $: id => E[id] || null,
    reu: { formEvt: { duree: 60 }, form: { duree: 60 } },
  };
  vm.createContext(ctx);
  vm.runInContext(Object.values(M).join('\n') + '\nthis.F = { lireConfirmation, lireIcs, htmlDuree, minutesEntre, plusMinutes, dureeChamps, choisirDuree, debutDuree, finDuree, liensGps, htmlLiensGps, destinationGps, DUREES_PLUS, bornerDuree, dateJuste, instantMural };', ctx);
  return { F: ctx.F, ctx, E, notes, champ, zone };
}

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées dans la page');
  v('(population) chaque morceau est trouvé', Object.keys(M).filter(k => !M[k]), []);
  const B = bac('ios'), F = B.F;
  vrai('(population) le bac à sable les exécute', typeof F.lireConfirmation === 'function' && typeof F.htmlDuree === 'function' && typeof F.liensGps === 'function');

  /* ═══ 1. LIRE UNE CONFIRMATION ═══ */
  console.log('\n1. « Coller une confirmation » : ce que le texte donne, et rien d\'inventé');
  const MAINT = new Date(2026, 9, 15, 10, 0).getTime();        // jeudi 15 octobre 2026, 10:00 (Paris)
  const L = t => F.lireConfirmation(t, MAINT);
  /* ⛔ une lecture qui gèle FAIT TOMBER le banc, elle ne le fige pas : chronométrée dans le bac à sable, coupée à 2 s (Infinity) */
  const chrono = t => { B.ctx.__t = t; const t0 = process.hrtime.bigint(); try { vm.runInContext('F.lireConfirmation(__t, ' + MAINT + ')', B.ctx, { timeout: 2000 }); } catch (e) { return Infinity; } return Number(process.hrtime.bigint() - t0) / 1e6; };
  const pick = (r, ...k) => k.map(x => r[x]);
  v('Doctolib : le jour, l\'heure, le médecin, la rue ET la ville (ligne suivante) ; pour quoi : « Médecin »', pick(L(`Bonjour,
Votre rendez-vous avec Dr Sophie Martin (Médecin généraliste) est confirmé.
Jeudi 22 octobre 2026 à 14:30
Cabinet médical
12 rue des Lilas
78000 Versailles
Pensez à apporter votre carte Vitale.`), 'debut', 'avec', 'lieu', 'titre'), ['2026-10-22T14:30', 'Dr Sophie Martin', '12 rue des Lilas, 78000 Versailles', 'Médecin']);
  v('⛔ une date de RÉSERVATION n\'est pas le rendez-vous ; « (30 min) » est sa durée ; « chez le dentiste » → « Dentiste »', pick(L(`Rendez-vous réservé le 12/10/2026.
Votre rendez-vous chez le dentiste : lundi 3 novembre à 9h15 (30 min) au 4 avenue Foch, 75116 Paris.`), 'debut', 'duree', 'lieu', 'titre'), ['2026-11-03T09:15', 30, '4 avenue Foch, 75116 Paris', 'Dentiste']);
  v('un SMS de garage : « le 17/10 de 8h30 à 10h » → 8 h 30, une heure et demie ; l\'adresse sans virgule', pick(L(`GARAGE DUPONT : votre véhicule est attendu le 17/10 de 8h30 à 10h. 3 rue de la Gare 17000 La Rochelle. Rép STOP au 36111`), 'debut', 'duree', 'lieu', 'titre'), ['2026-10-17T08:30', 90, '3 rue de la Gare 17000 La Rochelle', 'Garage']);
  v('« demain à 14h30 chez Coiffure Line » : demain se compte depuis AUJOURD\'HUI, « chez » dit avec qui', pick(L(`Rappel : RDV demain à 14h30 chez Coiffure Line. Annulation au 05 46 00 00 00`), 'debut', 'avec', 'titre'), ['2026-10-16T14:30', 'Coiffure Line', 'Coiffeur']);
  v('« après-demain » et « aujourd\'hui » aussi', [L('RDV après-demain à 8h').debut, L('Votre rendez-vous aujourd\'hui à 17h45').debut], ['2026-10-17T08:00', '2026-10-15T17:45']);
  v('⛔ un mail TRANSFÉRÉ : la date de « … a écrit : » ne compte pas', pick(L(`Le mer. 14 oct. 2026 à 09:12, Doctolib <no-reply@doctolib.fr> a écrit :
> Votre rendez-vous du vendredi 30 octobre 2026 à 11h00 avec Dr Paul Henry est confirmé.
> Adresse : 8 boulevard Carnot, 17000 La Rochelle`), 'debut', 'avec', 'lieu'), ['2026-10-30T11:00', 'Dr Paul Henry', '8 boulevard Carnot, 17000 La Rochelle']);
  v('⛔ l\'en-tête d\'un transfert Gmail (« De : / Date : / Objet : ») ne compte pas non plus', pick(L(`---------- Forwarded message ---------
De : Mairie <rdv@mairie.fr>
Date : mer. 14 oct. 2026 à 09:12
Objet : Confirmation
À : moi@exemple.fr

Votre rendez-vous : jeudi 29 octobre 2026 à 9h40, 1 place de Verdun, 17000 La Rochelle.`), 'debut', 'lieu'), ['2026-10-29T09:40', '1 place de Verdun, 17000 La Rochelle']);
  /* ⛔ un en-tête PASSÉ ne serait jamais choisi (une date passée cède la place) : le cas qui prouve, c'est le mail reçu AUJOURD'HUI, avec son heure */
  v('⛔ un mail transféré reçu AUJOURD\'HUI : la date de « … a écrit : », avec son heure, ne compte toujours pas', L(`Le jeu. 15 oct. 2026 à 09:12, Doctolib <no-reply@doctolib.fr> a écrit :
> Votre rendez-vous du vendredi 30 octobre 2026 à 11h00 est confirmé.`).debut, '2026-10-30T11:00');
  v('⛔ … ni celle d\'un transfert Gmail (« Date : » entouré de « De : » et « Objet : »)', L(`De : Mairie <rdv@mairie.fr>
Date : jeu. 15 oct. 2026 à 09:12
Objet : Confirmation

Votre rendez-vous : jeudi 29 octobre 2026 à 9h40.`).debut, '2026-10-29T09:40');
  /* les deux gardes de l'en-tête se couvrent l'une l'autre (mutation G22 : l'heure écartée suffisait) — chacune a son cas */
  v('⛔ la DATE d\'en-tête (aujourd\'hui) n\'est pas prise quand le rendez-vous n\'a pas d\'heure', pick(L(`Le jeu. 15 oct. 2026, Doctolib <no-reply@doctolib.fr> a écrit :
> Votre rendez-vous du vendredi 30 octobre 2026 est confirmé.`), 'date', 'heure'), ['2026-10-30', null]);
  v('⛔ l\'HEURE d\'un en-tête (« Envoyé : … 14:02 ») ne se colle pas à la date du rendez-vous juste au-dessus', pick(L(`Votre rendez-vous du 30 octobre est confirmé.
Envoyé : mardi 13 octobre 2026 14:02`), 'date', 'heure'), ['2026-10-30', null]);
  v('⛔ une réservation faite AUJOURD\'HUI, avec son heure, n\'est pas le rendez-vous', L('Rendez-vous pris le 15/10/2026 à 09:30 sur Doctolib.\nVotre rendez-vous : lundi 19 octobre à 11h.').debut, '2026-10-19T11:00');
  v('« Envoyé : » (Outlook) non plus', L(`Envoyé : mardi 13 octobre 2026 08:00
Votre RDV est fixé au 21/10/2026 à 15h.`).debut, '2026-10-21T15:00');
  v('« Date : 05/11/2026 » SEULE (sans « De : » autour) est bien la date du rendez-vous — la préfecture', pick(L(`Votre demande de rendez-vous est confirmée.
Motif : Passeport
Date : 05/11/2026
Heure : 10:20
Lieu : Mairie de La Rochelle, place de l'Hôtel de Ville, 17000 La Rochelle`), 'debut', 'titre'), ['2026-11-05T10:20', 'Mairie']);
  v('« Durée : 45 min » ; « Kinésithérapie » → « Kiné »', pick(L(`Kinésithérapie — Mme Durand
Le mardi 20 octobre à 18 h 15. Durée : 45 min`), 'debut', 'duree', 'titre'), ['2026-10-20T18:15', 45, 'Kiné']);
  v('« Durée : 1 h 30 » → 90 min', L('Le 20/10/2026 à 9h. Durée : 1 h 30').duree, 90);
  v('les espaces insécables du français (« 14 h 30 », « 22 octobre ») se lisent', L('Rendez-vous le 22 octobre à 14 h 30').debut, '2026-10-22T14:30');
  v('un fichier .ics collé tel quel (UTC) : l\'heure de Paris, sa durée, son titre et son lieu déséchappés', pick(L(`BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20261021T120000Z
DTEND:20261021T123000Z
SUMMARY:Consultation\\, Dr Martin
LOCATION:12 rue des Lilas\\, 78000 Versailles
END:VEVENT
END:VCALENDAR`), 'debut', 'duree', 'titre', 'lieu'), ['2026-10-21T14:00', 30, 'Consultation, Dr Martin', '12 rue des Lilas, 78000 Versailles']);
  v('un .ics à fuseau NOMMÉ (New York, 9 h) → 15 h à Paris, une heure', pick(L(`BEGIN:VEVENT
DTSTART;TZID=America/New_York:20261021T090000
DTEND;TZID=America/New_York:20261021T100000
SUMMARY:Call
END:VEVENT`), 'debut', 'duree'), ['2026-10-21T15:00', 60]);
  v('⛔ au changement d\'heure (dimanche 25 octobre 2026), un .ics à fuseau nommé reste juste', L(`BEGIN:VEVENT
DTSTART;TZID=Europe/Paris:20261025T023000
DTEND;TZID=Europe/Paris:20261025T033000
SUMMARY:Nuit
END:VEVENT`).debut, '2026-10-25T02:30');
  v('⛔ rien de reconnaissable : rien d\'inventé (ni date, ni heure, ni lieu, ni titre)', pick(L(`Merci pour votre commande, à bientôt !`), 'date', 'heure', 'debut', 'lieu', 'titre', 'avec', 'duree'), [null, null, null, null, null, null, null]);
  v('⛔ un texte vide, ou rien du tout : rien', [L('').date, L('   ').date, F.lireConfirmation(null, MAINT).date, F.lireConfirmation(undefined, MAINT).titre], [null, null, null, null]);
  v('une date déjà passée cette année, sans année : l\'an prochain', L('RDV le 2 mars à 10h').debut, '2027-03-02T10:00');
  v('une date sans heure : la date seule (l\'heure reste celle de la fiche)', pick(L('Votre rendez-vous du 28 octobre est confirmé.'), 'date', 'heure', 'debut'), ['2026-10-28', null, null]);
  v('⛔ « 24h/24 » n\'est pas une heure', L('Service client 24h/24. Votre RDV : 23/10/2026 à 16h').debut, '2026-10-23T16:00');
  v('⛔ « 3.5 km » n\'est pas le 3 mai', L('Le cabinet est à 3.5 km. Rendez-vous le 19 octobre à 9h').debut, '2026-10-19T09:00');
  v('« 15.10.2026 » (avec l\'année) et « 2026-10-30 » (ISO) se lisent', [L('Termin am 30.10.2026 um 10:00').debut, L('Créneau : 2026-10-30 10:30').debut], ['2026-10-30T10:00', '2026-10-30T10:30']);
  v('« 1er novembre »', L('Rendez-vous le dimanche 1er novembre 2026 à 10h30').debut, '2026-11-01T10:30');
  v('l\'heure AVANT la date, sur la même ligne', L('Rendez-vous à 15h, le 27 octobre.').debut, '2026-10-27T15:00');
  v('« avec Maître Leroy, notaire » → avec Maître Leroy, « Notaire »', pick(L('Rendez-vous avec Maître Leroy, notaire, le 4 novembre 2026 à 11h00'), 'avec', 'titre'), ['Maître Leroy', 'Notaire']);
  v('« auprès de Mme Petit »', L('Votre entretien auprès de Mme Petit le 9 novembre à 14h').avec, 'Mme Petit');
  v('« Scanner » : le médical oui, « scanner le QR code » non', [L('Votre scanner du genou le 5/11/2026 à 8h30').titre, L('Rendez-vous le 5/11/2026 à 8h30 chez Mme Petit. Pensez à scanner le QR code à l\'accueil.').titre], ['Imagerie', 'Mme Petit']);
  v('une réservation de restaurant', pick(L('Votre réservation pour 4 personnes au restaurant Le Port est confirmée pour le samedi 24 octobre à 20h30.'), 'debut', 'titre'), ['2026-10-24T20:30', 'Restaurant']);
  v('⛔ le 31 février n\'existe pas : la date suivante est prise', L('RDV le 31/02/2027 à 10h, sinon le 01/03/2027 à 11h').debut, '2027-03-01T11:00');
  v('une plage avec un tiret (« 14:00 - 14:45 ») ; le contrôle technique ; « route de … »', pick(L('Contrôle technique le 26/10/2026, 14:00 - 14:45, 22 route de Nantes 17000 La Rochelle'), 'debut', 'duree', 'titre', 'lieu'), ['2026-10-26T14:00', 45, 'Contrôle technique', '22 route de Nantes 17000 La Rochelle']);
  v('⛔ « arriver 10 min avant » n\'est pas l\'heure', L('Le docteur vous recevra le 22/10 à 16h30. Merci d\'arriver 10 min avant.').debut, '2026-10-22T16:30');
  v('⛔ une durée hors des bornes (12 h au plus) n\'est pas retenue', [L('Le 20/10/2026 de 8h à 23h').duree, L('Le 20/10/2026 à 9h. Durée : 2 min').duree, F.bornerDuree(720), F.bornerDuree(721), F.bornerDuree(5), F.bornerDuree(4)], [null, null, 720, null, 5, null]);
  v('« Adresse : » sur sa propre ligne, quand aucune rue n\'est reconnue', L('Rendez-vous le 30/10/2026 à 10h.\nAdresse :\nCentre commercial Les Minimes, 17000 La Rochelle').lieu, 'Centre commercial Les Minimes, 17000 La Rochelle');
  v('la date juste : années bornées, mois et jours réels', [F.dateJuste(2026, 2, 29), F.dateJuste(2028, 2, 29), F.dateJuste(1999, 1, 1), F.dateJuste(2026, 13, 1)], ['', '2028-02-29', '', '']);
  v('un fuseau inconnu ne casse rien : null', F.instantMural(2026, 10, 21, 9, 0, 'Pas/Un_Fuseau'), null);
  v('un .ics d\'Apple, de Google ou d\'Outlook porte d\'abord son FUSEAU (VTIMEZONE, des DTSTART de 1970) : seul le bloc de l\'événement compte', pick(L(`BEGIN:VCALENDAR
PRODID:-//Apple Inc.//macOS 15.0//EN
BEGIN:VTIMEZONE
TZID:Europe/Paris
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
DTSTART:19810329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
DTSTART:19961027T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTART;TZID=Europe/Paris:20261104T091500
DTEND;TZID=Europe/Paris:20261104T100000
SUMMARY:Ostéopathe
LOCATION:4 avenue Foch\\, 75116 Paris
BEGIN:VALARM
TRIGGER:-PT1H
END:VALARM
END:VEVENT
END:VCALENDAR`), 'debut', 'duree', 'titre', 'lieu'), ['2026-11-04T09:15', 45, 'Ostéopathe', '4 avenue Foch, 75116 Paris']);
  v('⛔ « Adresse e-mail : … » n\'est pas un lieu — même sans « @ » ; « Adresse : … » en est un', [L('RDV le 30/10/2026 à 10h. Votre adresse e-mail : jean@exemple.fr').lieu, L('RDV le 30/10/2026 à 10h. Adresse électronique : jean@exemple.fr').lieu,
    L('RDV le 30/10/2026 à 10h. Votre adresse mail : celle de votre espace client').lieu, L('RDV le 30/10/2026 à 10h.\nAdresse : Centre commercial Les Minimes').lieu], [null, null, null, 'Centre commercial Les Minimes']);
  {
    /* ⛔ LE GEL (relecture du 15 octobre 2026) : deux quantificateurs côte à côte sur les mêmes blancs (« \\s*:?\\s* ») font un retour arrière cubique — « 1 » et 3 000 espaces
       coûtaient 10,5 s, « adresse » et 3 000 retours à la ligne 46,5 s : la page gelait au collage d'un mail riche. Chaque forme dangereuse est jouée, chronomètre en main */
    const formes = { 'un chiffre et 6 000 espaces': '1' + ' '.repeat(6000) + 'x', '« adresse » et 6 000 retours à la ligne': 'adresse' + '\n'.repeat(6000),
      '« adresse : » et des blancs mêlés': 'adresse :' + ' \n'.repeat(3000), 'un chiffre et des blancs mêlés': '1' + '\n '.repeat(3000) + 'x', '« durée » et 6 000 espaces': 'durée' + ' '.repeat(6000) + 'x',
      '« 14h » et 6 000 espaces': '14h' + ' '.repeat(6000) + 'x', '« a écrit » et 6 000 espaces': 'a écrit' + ' '.repeat(6000) + 'x', 'une citation (« > ») et 6 000 espaces': '>' + ' '.repeat(6000) + 'x',
      '« 12 rue » et 6 000 espaces': '12 rue' + ' '.repeat(6000) + 'x', '6 000 « , » au bord d\'une rue': '12 rue A' + ', '.repeat(6000) + 'x', '« chez X » et 6 000 espaces': 'chez Garage' + ' '.repeat(6000) + 'x',
      '5 000 dates sur 5 000 lignes': '1/1\n'.repeat(5000), '3 000 dates et 3 000 heures': '1/1 1h '.repeat(3000) };
    const lents = [];
    for (const [nom, t] of Object.entries(formes)) { const ms = chrono(t); if (ms > 300) lents.push(nom + ' : ' + (ms === Infinity ? 'plus de 2 s' : Math.round(ms) + ' ms')); }
    v('⛔ aucune forme dangereuse ne fige la lecture (chacune en moins de 300 ms ; population : ' + Object.keys(formes).length + ' formes)', lents, []);
    /* et un mélange TIRÉ AU SORT (graine fixe : le même à chaque passage) sur l'alphabet des expressions — chiffres, blancs, h, :, /, virgules, mots-clés */
    let graine = 1015;
    const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
    const ALPHA = ['1', '2', '0', ' ', ' ', ' ', '\n', '\t', 'h', ':', '/', '.', ',', '-', '(', ')', ' rue ', ' adresse ', ' durée ', ' a écrit ', '> ', ' de ', ' le ', ' à ', ' chez ', 'Dr ', ' octobre ', ' avec ', ' min', '\u202f'];
    const melanges = []; let pire = 0;
    for (let k = 0; k < 12; k++) { let t = ''; while (t.length < 20000) { const c = ALPHA[Math.floor(hasard() * ALPHA.length)]; t += hasard() < 0.15 ? c.repeat(1 + Math.floor(hasard() * 400)) : c; } melanges.push(t.slice(0, 20000)); }
    for (const t of melanges) pire = Math.max(pire, chrono(t));
    vrai('⛔ douze mélanges de 20 000 signes tirés au sort : le pire en moins de 500 ms', pire < 500, Math.round(pire) + ' ms');
  }
  {
    /* ⛔ un texte immense (un mail entier collé deux cents fois) ne fige pas la page : la lecture est bornée à 20 000 signes, et mesurée */
    const bloc = 'Le cabinet est ouvert du lundi au vendredi de 8h à 19h. Rendez-vous le 12/11/2026 à 9h. 12 rue des Lilas 78000 Versailles. ';
    const ms = chrono(bloc.repeat(2000)), r = L(bloc.repeat(2000));
    v('⛔ 240 000 signes collés : lu en moins de 300 ms, et la date est trouvée', [ms < 300, r.debut], [true, '2026-11-12T09:00'], Math.round(ms) + ' ms');
    const pire = '1/1 '.repeat(5000) + 'à 9h';
    const ms2 = chrono(pire);
    vrai('⛔ 5 000 dates en rafale : lues en moins de 300 ms', ms2 < 300, Math.round(ms2) + ' ms');
  }

  /* ═══ 2. LA DURÉE ═══ */
  console.log('\n2. La durée sous « Début » : 30 min, 1 h, « Plus… » — la fin suit');
  v('l\'heure murale : 10:00 → 11:30 dure 90 min ; une fin avant le début dure moins que rien', [F.minutesEntre('2026-10-15T10:00', '2026-10-15T11:30'), F.minutesEntre('2026-10-15T10:00', '2026-10-15T09:00'), F.minutesEntre('2026-10-15T10:00:30', '2026-10-15T10:30')], [90, -60, 30]);
  v('ajouter une durée passe minuit (et la fin d\'un mois)', [F.plusMinutes('2026-10-15T23:30', 60), F.plusMinutes('2026-10-31T23:00', 90)], ['2026-10-16T00:30', '2026-11-01T00:30']);
  /* ⛔ sous V8 (Chrome, Node), `Date.parse(':00Z')` rend l'an 2000 : un champ VIDÉ faisait une durée de 234 825 h, et la fin partait vingt-sept ans plus tard */
  v('⛔ un champ vidé ou à moitié tapé ne fait ni une durée ni une fin', [F.minutesEntre('', '2026-10-15T09:00'), F.minutesEntre('2026-10-15T09:00', ''), F.minutesEntre('2026-10-15', '2026-10-15T09:00'), F.minutesEntre(null, undefined),
    F.plusMinutes('', 30), F.plusMinutes('2026-10-15T09', 30), F.plusMinutes('2026-10-15T09:00', NaN)], [null, null, null, null, '', '', '']);
  v('⛔ « Plus… » : au-delà d\'une heure seulement, jusqu\'à 8 h', [JSON.stringify(F.DUREES_PLUS), F.DUREES_PLUS.every(m => m > 60 && m <= 480)], ['[90,120,150,180,240,300,360,480]', true]);
  const etatsChips = h => Array.from(h.matchAll(/data-duree="(\d+)" aria-pressed="(true|false)"/g)).map(x => x[1] + (x[2] === 'true' ? '✓' : ''));
  const choixPlus = h => { const s = /<select [^>]*class="duree-plus( actif)?"[\s\S]*?<\/select>/.exec(h); return s ? { actif: !!s[1], choisi: (/<option value="([^"]*)"[^>]*selected[^>]*>([^<]*)</.exec(s[0]) || []).slice(1) } : null; };
  { const h = F.htmlDuree('ev', 30); v('30 min : la pastille « 30 min » est choisie, « Plus… » au repos', [etatsChips(h), choixPlus(h)], [['30✓', '60'], { actif: false, choisi: ['', 'Plus…'] }]); }
  { const h = F.htmlDuree('ev', 60); v('1 h : « 1 h » est choisie', etatsChips(h), ['30', '60✓']); }
  { const h = F.htmlDuree('ev', 120); v('2 h : aucune pastille, « Plus… » dit « 2 h » et s\'allume', [etatsChips(h), choixPlus(h)], [['30', '60'], { actif: true, choisi: ['120', '2 h'] }]); }
  { const h = F.htmlDuree('ev', 45); v('⛔ une durée tapée à la main (45 min) se DIT : « 45 min », choisie et inerte', [etatsChips(h), choixPlus(h), /<option value="autre" selected disabled>45 min<\/option>/.test(h)], [['30', '60'], { actif: true, choisi: ['autre', '45 min'] }, true]); }
  { const h = F.htmlDuree('ev', 135); vrai('… « 2 h 15 » aussi', /<option value="autre" selected disabled>2 h 15<\/option>/.test(h), h.slice(0, 300)); }
  { const h = F.htmlDuree('ev', null); v('pas de durée (une fin avant le début) : rien n\'est choisi', [etatsChips(h), choixPlus(h)], [['30', '60'], { actif: false, choisi: ['', 'Plus…'] }]); }
  v('caché pour « toute la journée » ; le préfixe de la réunion donne ses propres identifiants', [/^<div class="champ duree" id="ev-duree" hidden>/.test(F.htmlDuree('ev', 60, true)), /id="rf-duree"[^>]*>[\s\S]*id="rf-duree-t"[\s\S]*aria-labelledby="rf-duree-t"[\s\S]*id="rf-duree-plus"/.test(F.htmlDuree('rf', 60))], [true, true]);
  vrai('le menu « Plus… » se nomme (« Plus d\'une heure »), le groupe aussi (« Durée »)', /<select id="ev-duree-plus" class="duree-plus" aria-label="Plus d&#39;une heure">|<select id="ev-duree-plus" class="duree-plus" aria-label="Plus d'une heure">/.test(F.htmlDuree('ev', 60)) && /role="group" aria-labelledby="ev-duree-t"/.test(F.htmlDuree('ev', 60)));
  {
    const X = bac('ios'), { E, notes } = X;
    E['ev-debut'] = X.champ('ev-debut', '2026-10-20T14:00'); E['ev-fin'] = X.champ('ev-fin', '2026-10-20T15:00'); E['ev-duree'] = X.zone('ev-duree');
    X.ctx.reu.formEvt = { duree: 60 };
    X.F.choisirDuree('ev', 30);
    v('« 30 min » : la fin = le début + 30 min, signalée (ce qui suit la fin suit), la durée retenue, le trio repeint', [E['ev-fin'].value, notes.evts, X.ctx.reu.formEvt.duree, notes.peints.length], ['2026-10-20T14:30', ['ev-fin:input'], 30, 1]);
    X.F.choisirDuree('ev', 240);
    v('« 4 h » (Plus…) : 18:00', [E['ev-fin'].value, X.ctx.reu.formEvt.duree], ['2026-10-20T18:00', 240]);
    E['ev-debut'].value = '2026-10-20T16:15'; notes.evts.length = 0;
    X.F.debutDuree('ev');
    v('le début change (16:15) : la fin se déplace d\'autant (20:15) — la durée est gardée', [E['ev-fin'].value, notes.evts, X.ctx.reu.formEvt.duree], ['2026-10-20T20:15', ['ev-fin:input'], 240]);
    E['ev-debut'].value = '2026-10-20T16'; notes.evts.length = 0;
    X.F.debutDuree('ev');
    v('⛔ un début à moitié tapé : rien ne bouge', [E['ev-fin'].value, notes.evts], ['2026-10-20T20:15', []]);
    E['ev-debut'].value = '2026-10-20T16:15'; E['ev-fin'].value = '2026-10-20T17:00';
    X.F.finDuree('ev');
    v('la fin changée à la main (17:00) redit sa durée : 45 min', X.ctx.reu.formEvt.duree, 45);
    E['ev-fin'].value = '2026-10-20T15:00';
    X.F.finDuree('ev');
    v('⛔ une fin AVANT le début ne fait pas une durée : la précédente est gardée', X.ctx.reu.formEvt.duree, 45);
    E['ev-debut'].value = '2026-10-20T16:15'; E['ev-fin'].value = ''; notes.peints.length = 0;
    X.F.finDuree('ev');
    v('⛔ la fin VIDÉE : la durée gardée (45 min), et le trio ne dit aucune durée', [X.ctx.reu.formEvt.duree, /aria-pressed="true"|selected disabled|duree-plus actif/.test(E['ev-duree'].outerHTML)], [45, false]);
    E['ev-fin'].value = '2026-10-20T15:00';
    E['ev-debut'].value = ''; notes.evts.length = 0;
    X.F.choisirDuree('ev', 60);
    v('⛔ sans début, une durée ne pose rien', [E['ev-fin'].value, notes.evts], ['2026-10-20T15:00', []]);
    /* la réunion : le même trio, sur `reu.form` */
    E['rf-debut'] = X.champ('rf-debut', '2026-10-21T09:00'); E['rf-fin'] = X.champ('rf-fin', '2026-10-21T10:00'); E['rf-duree'] = X.zone('rf-duree');
    X.ctx.reu.form = { duree: 60 }; notes.evts.length = 0;
    X.F.choisirDuree('rf', 90); E['rf-debut'].value = '2026-10-21T13:30'; X.F.debutDuree('rf');
    v('une réunion : 1 h 30 posée, puis le début à 13:30 → la fin à 15:00, sur sa propre fiche', [E['rf-fin'].value, X.ctx.reu.form.duree, X.ctx.reu.formEvt.duree, notes.evts], ['2026-10-21T15:00', 90, 45, ['rf-fin:input', 'rf-fin:input']]);
  }

  /* ═══ 3. Y ALLER ═══ */
  console.log('\n3. « Y aller » : les applications de guidage du téléphone');
  const cles = (os, mode) => bac(os).F.liensGps('8 rue Lafayette, 17000 La Rochelle', mode).map(x => x[0]);
  v('iPhone, iPad, Mac : Plans, Google Maps, Waze', [cles('ios'), cles('ipados'), cles('macos')], [['plans', 'google', 'waze'], ['plans', 'google', 'waze'], ['plans', 'google', 'waze']]);
  v('Android : « Choisir une application » (le choix du téléphone : TOUTES celles qui y sont installées) d\'abord', cles('android'), ['autre', 'google', 'waze']);
  v('un ordinateur Windows ou Linux, un appareil inconnu : Google Maps et Waze', [cles('windows'), cles('linux'), cles('')], [['google', 'waze'], ['google', 'waze'], ['google', 'waze']]);
  v('à pied : pas de Waze (il ne guide qu\'en voiture)', [cles('ios', 'pied'), cles('android', 'pied')], [['plans', 'google'], ['autre', 'google']]);
  {
    const l = bac('android').F.liensGps('8 rue Lafayette, 17000 La Rochelle', 'voiture'), h = Object.fromEntries(l.map(x => [x[0], x[2]]));
    v('les adresses : le choix d\'Android (geo:), Google Maps en voiture, Waze qui guide', [h.autre, h.google, h.waze], ['geo:0,0?q=8%20rue%20Lafayette%2C%2017000%20La%20Rochelle',
      'https://www.google.com/maps/dir/?api=1&destination=8%20rue%20Lafayette%2C%2017000%20La%20Rochelle&travelmode=driving', 'https://waze.com/ul?q=8%20rue%20Lafayette%2C%2017000%20La%20Rochelle&navigate=yes']);
    const p = Object.fromEntries(bac('ios').F.liensGps('Gare', 'pied').map(x => [x[0], x[2]]));
    v('Plans et Google Maps à pied', [p.plans, p.google], ['maps://?daddr=Gare&dirflg=w', 'https://www.google.com/maps/dir/?api=1&destination=Gare&travelmode=walking']);
  }
  {
    /* ⛔ une adresse piégée (un « & » qui ajouterait un paramètre, un « # », une autre adresse, du HTML) ne sort pas de son paramètre et ne change pas le schéma */
    const piege = 'Rue A & B #3?x=1&navigate=no <img src=x onerror=alert(1)> javascript:alert(1)';
    const SCHEMAS = ['geo:0,0?q=', 'maps://?daddr=', 'https://www.google.com/maps/dir/?api=1&destination=', 'https://waze.com/ul?q='];
    const tous = ['android', 'ios', 'windows'].flatMap(os => bac(os).F.liensGps(piege, 'voiture'));
    v('⛔ chaque lien commence par un de NOS schémas, et l\'adresse y est ENCODÉE (ni &, ni #, ni espace, ni < >)', tous.map(([, , href]) => {
      const s = SCHEMAS.find(x => href.startsWith(x)), reste = s ? href.slice(s.length) : '';
      const param = reste.split(/&(?:dirflg|travelmode|navigate)=/)[0];
      return !!s && !/[&#\s<>?=]/.test(param) && decodeURIComponent(param) === piege;
    }), tous.map(() => true), tous.map(x => x[2]));
    const html = bac('ios').F.htmlLiensGps(piege, 'voiture');
    v('⛔ le menu : l\'adresse s\'affiche échappée (aucune balise), les pages s\'ouvrent à part (_blank, noopener noreferrer), Plans sur place', [/<img/.test(html), /&lt;img src=x onerror=alert\(1\)&gt;/.test(html),
      (html.match(/target="_blank" rel="noopener noreferrer"/g) || []).length, /data-gps="plans" href="maps:[^"]*" rel="noopener noreferrer"/.test(html), /data-gps-fermer>Annuler<\/button>$/.test(html)], [false, true, 2, true, true]);
  }
  v('la destination : l\'arrivée trouvée par le calcul d\'abord, sinon le lieu écrit, ⛔ jamais un lien de visio', [F.destinationGps('8 rue Lafayette', { vers_label: '8 Rue La Fayette 17000 La Rochelle' }), F.destinationGps('  Gare  ', null),
    F.destinationGps('https://visio.exemple.fr/salle', null), F.destinationGps('', null), F.destinationGps('x'.repeat(400), null).length], ['8 Rue La Fayette 17000 La Rochelle', 'Gare', '', '', 300]);

  /* ═══ 4. LE TEXTE DE LA PAGE ═══ */
  console.log('\n4. Le texte de la page (sans commentaires)');
  const fiche = decl('function rendreFormEvenement(');
  vrai('(population) la fiche d\'un rendez-vous est trouvée', fiche.length > 2000, fiche.length);
  v('⛔ plus d\'« Ajouter à mon calendrier » dans la fiche : ni `adresseIcsEvenement`, ni lien .ics, ni le texte', [/adresseIcsEvenement/.test(fiche), /data-evt="ics"/.test(fiche), /Ajouter à mon calendrier/.test(fiche)], [false, false, false]);
  v('« Coller une confirmation » : seulement pour un rendez-vous NEUF, la zone bornée à 20 000 signes, comme la lecture', [/const coller = !e && rdv \?/.test(fiche), /id="ev-coller-texte"[^>]*maxlength="20000"/.test(fiche), /String\(texte \|\| ''\)\.slice\(0, 20000\)/.test(M.lireConfirmation)], [true, true, true]);
  vrai('la durée suit « Début » dans la fiche, et la réunion la porte aussi', /id="ev-debut"[\s\S]{0,400}\+\s*htmlDuree\('ev', duree0, journee\)\s*\+\s*'<div class="champ"><label for="ev-fin">/.test(fiche) && /htmlDuree\('rf', minutesEntre\(initial\.debut, initial\.fin\)\)\s*\+\s*'<div class="champ"><label for="rf-fin">/.test(decl('function rendreFormReunion(') || JS));
  {
    const corps = ['function lireConfirmation(', 'function lireIcs(', 'function evtCollerRemplir(', 'async function evtCollerOuvrir('].map(decl);
    vrai('(population) les quatre corps de la lecture sont trouvés', corps.every(c => c.length > 200), corps.map(c => c.length));
    v('⛔ la lecture ne parle à personne : ni fetch, ni XMLHttpRequest, ni sendBeacon, ni la source (le texte collé reste sur l\'appareil)', corps.map(c => /\bfetch\(|XMLHttpRequest|sendBeacon|\bsource\.|WebSocket/.test(c)), [false, false, false, false]);
  }
  v('⛔ AUCUNE assertion arrière dans tout le script (un Safari d\'avant iOS 16.4 refuserait la page entière)', (script.match(/\(\?<[=!]/g) || []).length, 0);
  {
    const menu = decl('function htmlMenuAgenda(');
    vrai('(population) le menu de l\'appui long est trouvé', menu.length > 1000, menu.length);
    v('l\'appui long propose « Y aller » — pour un rendez-vous ni fait ni passé, et pour une réunion ni annulée, ni terminée, ni passée (test-857 le joue)', [/if \(!e\.fait && x\.o\.fin > Date\.now\(\) && destinationGps\(e\.lieu, e\.trajet\)\) h \+= a\('gps', 'Y aller'/.test(menu), /if \(!r\.annulee && !se && x\.o\.fin > Date\.now\(\) && destinationGps\(r\.lieu, r\.moi\.trajet\)\) h \+= a\('gps', 'Y aller'/.test(menu), /a\('fait', e\.fait \? 'Remettre à faire' : 'Marquer comme fait'\)/.test(menu)], [true, true, true]);
    const clic = decl('async function clicMenuAgenda(');
    /* par précaution : Chromium suit un lien retiré pendant son propre clic (mesuré), rien ne le promet des autres moteurs — le menu se ferme une fois le clic fini, des DEUX chemins */
    v('un lien de « Y aller » touché ferme son menu une fois le clic fini — celui de l\'appui long et celui d\'une fiche', [/if \(e\.target\.closest\('a\[data-gps\]'\)\) \{ setTimeout\(fermerMenu, 0\); return; \}/.test(clic),
      /if \(m0\.gps\) \{ if \(e\.target\.closest\('a\[data-gps\]'\)\) setTimeout\(fermerMenu, 0\);/.test(JS)], [true, true]);
    vrai('le sous-menu « Y aller » met le focus sur la première application, pas sur « Annuler »', /querySelector\('a\[href\], button'\)/.test(ligne('function sousMenuAgenda(')));
    v('⛔ au bureau, « Y aller » ouvert d\'une fiche se place sous SON bouton (sinon : à l\'endroit du dernier clic droit, ou dans le coin)', [/placerMenuAgenda\(\);/.test(decl('function ouvrirMenuGps(')),
      /if \(!m0 \|\| !\(m0\.agenda \|\| m0\.gps\)\) return;/.test(decl('function placerMenuAgenda(')), /m0\.agenda \? retrouverAgenda\(m0\.declencheur, m0\.cle\) : m0\.declencheur/.test(decl('function placerMenuAgenda('))], [true, true, true]);
    {
      /* sans calcul possible (le service ne calcule pas), la fiche garde « Y aller » — joué : la VRAIE `peindreTrajet`, une fausse zone (un motif sur son texte passait encore avec un `return` devant) */
      const z = { innerHTML: '', contains: () => false }, E = { 'ev-trajet-zone': z, 'ev-lieu': { value: '8 rue Lafayette' } };
      const cx = { String, $: id => E[id] || null, reu: { formEvt: { rdv: true, tr: { calc: null } } }, trajetPossible: () => false, document: { activeElement: null }, htmlTrajet: () => 'CALCUL' };
      vm.createContext(cx);
      vm.runInContext([M.estUrl, M.destinationGps, ligne('const BOUTON_GPS_EVT = '), decl('function peindreTrajet(')].join('\n') + '\nthis.peindre = peindreTrajet;', cx);
      cx.peindre(); const avecLieu = z.innerHTML;
      E['ev-lieu'].value = 'https://visio.exemple.fr/salle'; cx.peindre(); const visio = z.innerHTML;
      E['ev-lieu'].value = ''; cx.peindre(); const sansLieu = z.innerHTML;
      cx.trajetPossible = () => true; E['ev-lieu'].value = '8 rue Lafayette'; cx.peindre(); const possible = z.innerHTML;
      v('sans calcul possible, la zone ne garde que « Y aller » ; vide (un lien de visio, aucun lieu), elle se cache ; le calcul possible, la zone entière', [/data-evt="gps"/.test(avecLieu) && !/hidden/.test(avecLieu),
        /hidden/.test(visio) && !/data-evt/.test(visio), /hidden/.test(sansLieu) && !/data-evt/.test(sansLieu), possible], [true, true, true, 'CALCUL'], [avecLieu, visio, sansLieu]);
    }
  }
  {
    /* « Y aller » suit le lieu qu'on TAPE : sans calcul, la zone ne se repeint pas — le bouton seul paraît ou s'en va (la sonde le joue au doigt) */
    const g = decl('function gpsSynchro('), saisie = JS.slice(JS.indexOf("if (id === 'ev-lieu' || id === 'ev-tr-adresse') {"), JS.indexOf("if (id === 'ev-lieu' || id === 'ev-tr-adresse') {") + 200);
    vrai('(population) `gpsSynchro` et la saisie du lieu sont trouvées', g.length > 100 && saisie.length > 100, [g.length, saisie.length]);
    v('« Y aller » suit le lieu tapé : la saisie l\'appelle ; il pose le MÊME bouton que la zone, ou le retire', [/trajetTape\(id\); if \(id === 'ev-lieu'\) gpsSynchro\(\);/.test(saisie), /insertAdjacentHTML\('beforeend', BOUTON_GPS_EVT\)/.test(g),
      /else if \(!oui && b\) b\.remove\(\)/.test(g), /\? BOUTON_GPS_EVT : ''/.test(decl('function htmlTrajet('))], [true, true, true, true]);
  }
  vrai('un rendez-vous fait se voit en vert : la coche ronde devant son titre (ligne) et sa case teintée (mois, semaine)', /\(e\.fait \? '<span class="fait-vert" aria-hidden="true">' \+ icone\('i-coche'\) \+ '<\/span>' : ''\)/.test(decl('function ligneEvenement(')) &&
    /\.fait-vert \{[^}]*background: var\(--vert\)/.test(CSS) && /\.mjour-elt\.fait \{[^}]*background: color-mix\(in srgb, var\(--vert\)/.test(CSS));
  vrai('⛔ le menu « Plus… » garde 16 px (Safari zoomerait), et 44 px de haut au doigt', /\.champ \.duree-plus \{[^}]*font-size: 16px/.test(CSS) && /@media \(pointer: coarse\) \{ \.champ \.duree-plus \{ height: 44px; \} \}/.test(CSS));
  fin();
})().catch(e => { console.error(e); process.exit(1); });
