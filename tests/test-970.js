/* ⛔ CE QUE CE FICHIER GARDE — LE CALENDRIER DES RÉUNIONS (`server-msg/calendrier.js`) : fuseaux, heures locales, séries, rappels. Le module SEUL, sans base ni réseau.

   La bascule d'heure du 25 octobre 2026 à Paris est le cas que ce banc existe pour tenir (SERVEUR.md § 3.11, point 10) : une réunion hebdomadaire reste à la MÊME heure locale de part
   et d'autre, et son rappel aussi. Une série calculée en ajoutant 7 × 24 h à chaque semaine se décale d'une heure pour tous les invités, du jour au lendemain, SANS ERREUR.
   Les faits du monde réel (les dates des changements d'heure à Paris, New York, Sydney) sont ÉCRITS ICI à la main, depuis les règles publiques, et comparés à ce que la base des
   fuseaux (ICU) répond : le banc ne se croit pas sur parole, et ne recopie pas ce qu'il vérifie.

   Les contrôles marqués ⛔ gardent ce dont la perte ne se verrait PAS :
     · une série hebdomadaire garde son heure LOCALE à travers les deux changements d'heure de l'année ;
     · une heure locale qui n'existe pas (le trou de mars) est lue avec le décalage d'AVANT ; une heure vécue deux fois (octobre) est la PREMIÈRE — la règle de la RFC 5545, celle de l'agenda ;
     · un mois sans le 31 SAUTE ce mois, et ne compte pas dans « N fois » ;
     · « 1 jour avant » est un jour CIVIL : à la même heure locale la veille, même si 25 heures séparent les deux ;
     · une fenêtre d'occurrences contient son début et exclut sa fin, et rend exactement ce qu'on trouve en énumérant toute la série (propriété jouée sur des dizaines de fenêtres). */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const C = require(path.join(T.SERVICE, 'calendrier.js'));

const U = (a, m, j, h = 0, mi = 0, s = 0) => Date.UTC(a, m - 1, j, h, mi, s);
const iso = (t) => new Date(t).toISOString().replace('.000Z', 'Z');
const PARIS = 'Europe/Paris';
/* une série locale : la première occurrence est donnée en HEURE LOCALE du fuseau */
const serie = (tz, local, dureeMin, rep, extra) => {
  const [d, h] = local.split('T'), [a, m, j] = d.split('-').map(Number), [hh, mi] = h.split(':').map(Number);
  const debut = C.instantLocal({ a, m, j, h: hh, mi }, tz);
  return Object.assign({ debut, fin: debut + dureeMin * 60000, tz, rep, n: null, jusqua: null }, extra || {});
};
const locales = (s, du, au, max) => C.occurrences(s, du, au || C.T_MAX, max).map(o => C.formaterLocal(o.debut, s.tz));
const TOUT = (s) => C.occurrences(s, C.T_MIN, C.T_MAX, 5000);

console.log('Les fuseaux : un nom connu est rendu sous sa forme canonique, tout le reste est refusé');
{
  v('« europe/paris » (casse libre) → « Europe/Paris »', C.tzValide('europe/paris'), 'Europe/Paris');
  v('« UTC » et un fuseau à décalage fixe sont connus', [C.tzValide('UTC'), C.tzValide('Etc/GMT+5')], ['UTC', 'Etc/GMT+5']);
  v('« America/Argentina/Buenos_Aires » (trois niveaux) est connu, et GARDE le nom donné (ICU le rend sous l\'ancien nom « America/Buenos_Aires »)', C.tzValide('America/Argentina/Buenos_Aires'), 'America/Argentina/Buenos_Aires');
  v('   de même « Asia/Kolkata » (et non l\'ancien « Asia/Calcutta ») ; seule la casse se corrige', [C.tzValide('Asia/Kolkata'), C.tzValide('asia/kolkata'), C.tzValide('etc/gmt+5'), C.tzValide('utc')], ['Asia/Kolkata', 'asia/kolkata', 'Etc/GMT+5', 'UTC']);
  const refus = ['Mars/Phobos', '../x', '', 'Europe/Paris/../x', 'Europe/Paris\n', 'Europe Paris', ' Europe/Paris', '+01:00', 'a'.repeat(65), 'Europe/Paris/A/B/C', 'Europe//Paris', '/Europe/Paris', 'Europe/Paris;DROP', '<script>'];
  v('⛔ ' + refus.length + ' noms mal formés ou inconnus sont refusés (null)', refus.filter(x => C.tzValide(x) !== null), []);
  v('et ce qui n\'est pas une chaîne aussi', [undefined, null, 12, {}, [], true].filter(x => C.tzValide(x) !== null), []);
}

console.log('\nLe décalage d\'un fuseau : les changements d\'heure tombent à l\'instant où le monde réel les place');
{
  const H = 3600000;
  /* Paris : l'heure d'été commence le dernier dimanche de mars à 01:00 UTC, l'heure d'hiver le dernier dimanche d'octobre à 01:00 UTC */
  v('Paris, 29 mars 2026 : +1 h à 00:59:59 UTC, +2 h à 01:00:00 UTC', [C.decalage(PARIS, U(2026, 3, 29, 0, 59, 59)) / H, C.decalage(PARIS, U(2026, 3, 29, 1, 0, 0)) / H], [1, 2]);
  v('⛔ Paris, 25 octobre 2026 : +2 h à 00:59:59 UTC, +1 h à 01:00:00 UTC (le dimanche de la bascule d\'hiver)', [C.decalage(PARIS, U(2026, 10, 25, 0, 59, 59)) / H, C.decalage(PARIS, U(2026, 10, 25, 1, 0, 0)) / H], [2, 1]);
  /* New York : le deuxième dimanche de mars à 07:00 UTC, le premier dimanche de novembre à 06:00 UTC */
  v('New York, 8 mars 2026 : −5 h puis −4 h à 07:00 UTC', [C.decalage('America/New_York', U(2026, 3, 8, 6, 59, 59)) / H, C.decalage('America/New_York', U(2026, 3, 8, 7, 0, 0)) / H], [-5, -4]);
  v('New York, 1er novembre 2026 : −4 h puis −5 h à 06:00 UTC', [C.decalage('America/New_York', U(2026, 11, 1, 5, 59, 59)) / H, C.decalage('America/New_York', U(2026, 11, 1, 6, 0, 0)) / H], [-4, -5]);
  /* Sydney (hémisphère sud : l'été y commence en octobre) : le premier dimanche d'avril à 03:00 locale (16:00 UTC la veille), le premier dimanche d'octobre à 02:00 locale (16:00 UTC la veille) */
  v('Sydney, 5 avril 2026 : +11 h puis +10 h', [C.decalage('Australia/Sydney', U(2026, 4, 4, 15, 59, 59)) / H, C.decalage('Australia/Sydney', U(2026, 4, 4, 16, 0, 0)) / H], [11, 10]);
  v('Sydney, 4 octobre 2026 : +10 h puis +11 h', [C.decalage('Australia/Sydney', U(2026, 10, 3, 15, 59, 59)) / H, C.decalage('Australia/Sydney', U(2026, 10, 3, 16, 0, 0)) / H], [10, 11]);
  v('des décalages qui ne sont pas des heures entières : l\'Inde +5 h 30, le Népal +5 h 45, les îles Chatham +13 h 45 (été)', [C.decalage('Asia/Kolkata', U(2026, 6, 1)) / 60000, C.decalage('Asia/Kathmandu', U(2026, 6, 1)) / 60000, C.decalage('Pacific/Chatham', U(2026, 1, 15)) / 60000], [330, 345, 825]);
  v('l\'île Lord Howe change d\'une DEMI-heure (+10:30 / +11)', [C.decalage('Australia/Lord_Howe', U(2026, 7, 1)) / 60000, C.decalage('Australia/Lord_Howe', U(2026, 1, 1)) / 60000], [630, 660]);
  v('UTC ne change jamais', [C.decalage('UTC', U(2026, 1, 1)), C.decalage('UTC', U(2026, 7, 1))], [0, 0]);
}

console.log('\nUne heure locale devient un instant — selon la RFC 5545 pour les deux cas limites');
{
  const L = (a, m, j, h, mi, tz) => iso(C.instantLocal({ a, m, j, h, mi }, tz || PARIS));
  v('une heure ordinaire (14:00, 20 octobre 2026, Paris, été) → 12:00 UTC', L(2026, 10, 20, 14, 0), '2026-10-20T12:00:00Z');
  v('une heure ordinaire en hiver (14:00, 27 octobre 2026) → 13:00 UTC', L(2026, 10, 27, 14, 0), '2026-10-27T13:00:00Z');
  v('⛔ le TROU de mars : 02:30 le 29 mars 2026 n\'existe pas à Paris → le décalage d\'AVANT (+1 h) → 01:30 UTC, soit 03:30 à la montre', L(2026, 3, 29, 2, 30), '2026-03-29T01:30:00Z');
  v('   le premier instant d\'après le trou, 03:00, est 01:00 UTC ; 01:59 est 00:59 UTC', [L(2026, 3, 29, 3, 0), L(2026, 3, 29, 1, 59)], ['2026-03-29T01:00:00Z', '2026-03-29T00:59:00Z']);
  v('⛔ l\'heure VÉCUE DEUX FOIS : 02:30 le 25 octobre 2026 à Paris → la PREMIÈRE (heure d\'été, 00:30 UTC)', L(2026, 10, 25, 2, 30), '2026-10-25T00:30:00Z');
  v('   02:00 aussi (c\'est la première fois qu\'on la vit) ; 03:00 n\'est plus ambiguë : 02:00 UTC', [L(2026, 10, 25, 2, 0), L(2026, 10, 25, 3, 0)], ['2026-10-25T00:00:00Z', '2026-10-25T02:00:00Z']);
  v('New York : le trou (02:30, 8 mars 2026) → 03:30 à la montre (07:30 UTC) ; la double heure (01:30, 1er novembre) → la première, heure d\'été (05:30 UTC)',
    [L(2026, 3, 8, 2, 30, 'America/New_York'), L(2026, 11, 1, 1, 30, 'America/New_York')], ['2026-03-08T07:30:00Z', '2026-11-01T05:30:00Z']);
  v('Sydney : la double heure d\'avril (02:30, 5 avril 2026) → la première, heure d\'été (15:30 UTC la veille)', L(2026, 4, 5, 2, 30, 'Australia/Sydney'), '2026-04-04T15:30:00Z');
  v('un fuseau à décalage fixe : Kolkata 09:00 → 03:30 UTC', L(2026, 5, 5, 9, 0, 'Asia/Kolkata'), '2026-05-05T03:30:00Z');
  /* la propriété : hors trou et hors double heure, la montre du fuseau relit exactement l'heure demandée */
  let essais = 0, faux = [];
  for (const tz of [PARIS, 'America/New_York', 'Australia/Sydney', 'Asia/Kolkata', 'Pacific/Chatham', 'America/Sao_Paulo', 'UTC', 'Africa/Casablanca']) {
    for (let jour = 0; jour < 366; jour += 3) for (const [h, mi] of [[0, 0], [1, 15], [4, 45], [9, 0], [14, 30], [23, 59]]) {
      const base = U(2026, 1, 1 + jour), p = { a: new Date(base).getUTCFullYear(), m: new Date(base).getUTCMonth() + 1, j: new Date(base).getUTCDate(), h, mi };
      const t = C.instantLocal(p, tz), l = C.champsLocaux(t, tz);
      essais++;
      /* si le résultat ne relit pas l'heure demandée, ce doit être un trou : l'heure relue est alors plus tard (le décalage d'avant) */
      if (!(l.a === p.a && l.m === p.m && l.j === p.j && l.h === p.h && l.mi === p.mi)) { const l2 = Date.UTC(l.a, l.m - 1, l.j, l.h, l.mi), d2 = Date.UTC(p.a, p.m - 1, p.j, p.h, p.mi); if (!(l2 > d2 && l2 - d2 <= 2 * 3600000)) faux.push(tz + ' ' + JSON.stringify(p)); }
    }
  }
  vrai('population : ' + essais + ' heures locales résolues (8 fuseaux, une année)', essais > 2500);
  v('⛔ chaque résultat relit l\'heure demandée — ou, dans un trou, une heure PLUS TARD d\'au plus deux heures (jamais plus tôt, jamais ailleurs)', faux, []);
}

console.log('\nLes saisies d\'heure : une date qui n\'existe pas est refusée, une heure locale s\'écrit toujours pareil');
{
  v('« 2026-10-26T14:00 » est lue', C.lireLocal('2026-10-26T14:00'), { a: 2026, m: 10, j: 26, h: 14, mi: 0 });
  const mauvaises = ['2026-02-30T10:00', '2026-04-31T10:00', '2026-13-01T10:00', '2026-00-10T10:00', '2026-10-00T10:00', '2026-10-26T24:00', '2026-10-26T14:60', '2026-10-26 14:00', '2026-10-26T14:00:00', '2026-10-26T14:00Z', '26-10-26T14:00', '1999-12-31T23:59', '2100-01-01T00:00', '', 'demain', '2026-10-26T1:00', ' 2026-10-26T14:00', '2026-10-26T14:00 ', '2026-10-26T14:00\n'];
  v('⛔ ' + mauvaises.length + ' saisies mal formées ou impossibles sont refusées (le 30 février, le 31 avril, minuit à 24:00, un fuseau collé derrière…)', mauvaises.filter(x => C.lireLocal(x) !== null), []);
  v('le 29 février n\'existe que les années bissextiles', [C.lireLocal('2028-02-29T10:00') !== null, C.lireLocal('2026-02-29T10:00')], [true, null]);
  v('ce qui n\'est pas une chaîne n\'est pas une date', [undefined, null, 12, {}].filter(x => C.lireLocal(x) !== null || C.lireDate(x) !== null), []);
  v('« 2026-12-31 » est une date ; « 2026-12-32 » non', [C.lireDate('2026-12-31'), C.lireDate('2026-12-32')], [{ a: 2026, m: 12, j: 31 }, null]);
  v('formaterLocal est l\'inverse de lireLocal (hors trou) : l\'heure locale d\'un instant s\'écrit « AAAA-MM-JJTHH:MM »', [C.formaterLocal(U(2026, 10, 26, 13, 0), PARIS), C.formaterLocal(U(2026, 7, 1, 23, 30), 'America/New_York')], ['2026-10-26T14:00', '2026-07-01T19:30']);
  v('et le texte d\'un instant se dit dans le fuseau de celui qui le lit (« mardi 27 octobre à 13:00 » à Paris, « à 08:00 » à New York)', [C.dire(U(2026, 10, 27, 12, 0), PARIS), C.dire(U(2026, 10, 27, 12, 0), 'America/New_York')], ['mardi 27 octobre à 13:00', 'mardi 27 octobre à 08:00']);
  vrai('   un fuseau inconnu ne casse pas le texte (repli sur la date UTC)', /2026-10-27T12:00:00/.test(C.dire(U(2026, 10, 27, 12, 0), 'Mars/Phobos')));
}

console.log('\nUne réunion sans répétition : une seule occurrence');
{
  const s = serie(PARIS, '2026-10-20T14:00', 60, 'aucune');
  v('une occurrence, au début et à la fin donnés', TOUT(s).map(o => [iso(o.debut), iso(o.fin), o.rang]), [['2026-10-20T12:00:00Z', '2026-10-20T13:00:00Z', 0]]);
  v('une fenêtre qui ne la contient pas : rien', [C.occurrences(s, U(2026, 10, 21), U(2026, 11, 1)).length, C.occurrences(s, U(2026, 10, 1), U(2026, 10, 20)).length], [0, 0]);
  v('⛔ la fenêtre CONTIENT son début et EXCLUT sa fin : [début de la réunion, +1 ms) la voit, [−1 ms, début) non', [C.occurrences(s, s.debut, s.debut + 1).length, C.occurrences(s, s.debut - 1, s.debut).length, C.occurrences(s, s.debut + 1, s.debut + 5).length], [1, 0, 0]);
  v('une fenêtre vide ou inversée ne rend rien', [C.occurrences(s, s.debut, s.debut).length, C.occurrences(s, s.debut + 10, s.debut).length], [0, 0]);
  v('premiereApres : la réunion future ; passée, null', [C.premiereApres(s, U(2026, 10, 1)).debut === s.debut, C.premiereApres(s, s.debut), C.premiereApres(s, s.debut, true).debut === s.debut], [true, null, true]);
  v('occurrenceA : vrai pour son début exact, faux à une minute près', [!!C.occurrenceA(s, s.debut), C.occurrenceA(s, s.debut + 60000)], [true, null]);
  v('compter : 1', C.compter(s, 100), 1);
}

console.log('\n⛔ Le 25 octobre 2026 : une réunion HEBDOMADAIRE ne se décale pas — ni son heure locale, ni son rappel');
{
  const lundi = serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { n: 4 });
  const occ = TOUT(lundi);
  v('4 lundis à 14:00 locales : 19 et 26 octobre, 2 et 9 novembre', occ.map(o => C.formaterLocal(o.debut, PARIS)), ['2026-10-19T14:00', '2026-10-26T14:00', '2026-11-02T14:00', '2026-11-09T14:00']);
  v('⛔ avant la bascule 12:00 UTC, après 13:00 UTC : l\'instant bouge d\'une heure, l\'heure LOCALE jamais', occ.map(o => iso(o.debut)), ['2026-10-19T12:00:00Z', '2026-10-26T13:00:00Z', '2026-11-02T13:00:00Z', '2026-11-09T13:00:00Z']);
  v('⛔ la durée est une durée exacte : 1 h après comme avant', occ.map(o => (o.fin - o.debut) / 60000), [60, 60, 60, 60]);
  /* un modèle FAUX, pour s'assurer que le banc le verrait : ajouter 7 × 24 h à chaque semaine */
  const naif = [0, 1, 2, 3].map(k => lundi.debut + k * 7 * 86400000);
  v('contre-épreuve : le calcul NAÏF (+7 × 24 h) donne 13:00 puis 14:00… locale — il est bel et bien différent, donc le banc le voit', naif.map(t => C.formaterLocal(t, PARIS)), ['2026-10-19T14:00', '2026-10-26T13:00', '2026-11-02T13:00', '2026-11-09T13:00']);
  /* son rappel : « 15 minutes avant », « 1 heure avant » sont des durées exactes ; la veille est un jour civil */
  v('le rappel de 15 minutes part 15 minutes avant, de part et d\'autre de la bascule (13:45 locales)', occ.map(o => C.formaterLocal(C.echeanceRappel(o.debut, 15, PARIS), PARIS)), ['2026-10-19T13:45', '2026-10-26T13:45', '2026-11-02T13:45', '2026-11-09T13:45']);
  v('le rappel de la VEILLE part à 14:00 locales le dimanche (le lundi 26 : le dimanche 25 octobre, jour de la bascule, à 14:00)', occ.map(o => C.formaterLocal(C.echeanceRappel(o.debut, 1440, PARIS), PARIS)), ['2026-10-18T14:00', '2026-10-25T14:00', '2026-11-01T14:00', '2026-11-08T14:00']);

  /* le dimanche : la série traverse la bascule JUSTE DEDANS */
  const dim = serie(PARIS, '2026-10-11T14:00', 90, 'hebdomadaire', { n: 4 });
  const od = TOUT(dim);
  v('⛔ un dimanche à 14:00 : 11, 18 et 25 octobre (le jour de la bascule) puis 1er novembre — toujours 14:00 locales', od.map(o => C.formaterLocal(o.debut, PARIS)), ['2026-10-11T14:00', '2026-10-18T14:00', '2026-10-25T14:00', '2026-11-01T14:00']);
  v('   les instants : 12:00, 12:00, 13:00, 13:00 UTC', od.map(o => iso(o.debut).slice(11, 16)), ['12:00', '12:00', '13:00', '13:00']);
  v('⛔ « 1 jour avant » le dimanche 25 octobre = le SAMEDI 24 à 14:00 locales, soit 25 heures plus tôt (un jour civil), pas 24', [C.formaterLocal(C.echeanceRappel(od[2].debut, 1440, PARIS), PARIS), (od[2].debut - C.echeanceRappel(od[2].debut, 1440, PARIS)) / 3600000], ['2026-10-24T14:00', 25]);
  v('   et 24 heures la semaine d\'avant (rien à signaler : pas de bascule entre les deux)', (od[1].debut - C.echeanceRappel(od[1].debut, 1440, PARIS)) / 3600000, 24);
  v('   « 1 heure avant » reste une durée exacte, bascule ou non', od.map(o => (o.debut - C.echeanceRappel(o.debut, 60, PARIS)) / 60000), [60, 60, 60, 60]);

  /* l'heure ambiguë de la nuit de la bascule : 02:30 */
  const nuit = serie(PARIS, '2026-10-18T02:30', 30, 'hebdomadaire', { n: 3 });
  const on = TOUT(nuit);
  v('⛔ un dimanche à 02:30 (l\'heure vécue deux fois le 25 octobre) : la PREMIÈRE, 00:30 UTC ; le 1er novembre, 01:30 UTC', on.map(o => iso(o.debut)), ['2026-10-18T00:30:00Z', '2026-10-25T00:30:00Z', '2026-11-01T01:30:00Z']);
  v('   à la montre : 02:30 les trois dimanches', on.map(o => C.formaterLocal(o.debut, PARIS)), ['2026-10-18T02:30', '2026-10-25T02:30', '2026-11-01T02:30']);

  /* le trou de mars */
  const mars = serie(PARIS, '2026-03-22T02:30', 30, 'hebdomadaire', { n: 3 });
  const om = TOUT(mars);
  v('⛔ un dimanche à 02:30 à travers le trou du 29 mars (02:30 n\'existe pas) : 01:30 UTC, soit 03:30 ; le 22 mars 01:30 UTC ; le 5 avril 00:30 UTC (02:30 d\'été)', om.map(o => iso(o.debut)), ['2026-03-22T01:30:00Z', '2026-03-29T01:30:00Z', '2026-04-05T00:30:00Z']);
  v('   à la montre : 02:30, 03:30, 02:30 — le trou est lu avec le décalage d\'avant, et la semaine suivante retrouve 02:30', om.map(o => C.formaterLocal(o.debut, PARIS)), ['2026-03-22T02:30', '2026-03-29T03:30', '2026-04-05T02:30']);
}

console.log('\nLes séries quotidiennes et mensuelles');
{
  const q = serie(PARIS, '2026-10-23T03:00', 20, 'quotidienne', { n: 5 });
  v('⛔ tous les jours à 03:00 à travers la bascule (le 25 : 03:00 existe, une fois) : 03:00 locales, 5 fois', locales(q, 0), ['2026-10-23T03:00', '2026-10-24T03:00', '2026-10-25T03:00', '2026-10-26T03:00', '2026-10-27T03:00']);
  v('   les instants : 01:00, 01:00, 02:00 (le 25, après la bascule), 02:00, 02:00 UTC', TOUT(q).map(o => iso(o.debut).slice(11, 16)), ['01:00', '01:00', '02:00', '02:00', '02:00']);
  const m31 = serie(PARIS, '2026-01-31T10:00', 60, 'mensuelle', { n: 6 });
  v('⛔ le 31 de chaque mois : les mois de moins de 31 jours SAUTENT (février, avril, juin, septembre), et ne comptent pas dans « 6 fois »', locales(m31, 0), ['2026-01-31T10:00', '2026-03-31T10:00', '2026-05-31T10:00', '2026-07-31T10:00', '2026-08-31T10:00', '2026-10-31T10:00']);
  v('   et leur rang est celui des occurrences qui EXISTENT (0 à 5)', TOUT(m31).map(o => o.rang), [0, 1, 2, 3, 4, 5]);
  const m30 = serie(PARIS, '2026-01-30T10:00', 60, 'mensuelle', { n: 3 });
  v('le 30 : seul février saute', locales(m30, 0), ['2026-01-30T10:00', '2026-03-30T10:00', '2026-04-30T10:00']);
  const m29 = serie(PARIS, '2028-01-29T10:00', 60, 'mensuelle', { n: 3 });
  v('le 29 : février 2028 (bissextile) existe', locales(m29, 0), ['2028-01-29T10:00', '2028-02-29T10:00', '2028-03-29T10:00']);
  const m29b = serie(PARIS, '2027-01-29T10:00', 60, 'mensuelle', { n: 3 });
  v('   février 2027 non', locales(m29b, 0), ['2027-01-29T10:00', '2027-03-29T10:00', '2027-04-29T10:00']);
  const mois = serie(PARIS, '2026-11-15T09:00', 45, 'mensuelle', { n: 4 });
  v('à travers le changement d\'année : 15 novembre, 15 décembre, 15 janvier, 15 février, toujours 09:00 locales', locales(mois, 0), ['2026-11-15T09:00', '2026-12-15T09:00', '2027-01-15T09:00', '2027-02-15T09:00']);
  const ny = serie('America/New_York', '2026-10-30T09:00', 30, 'hebdomadaire', { n: 3 });
  v('⛔ New York, vendredi 09:00 : le 1er novembre (la bascule américaine) tombe entre le 30 octobre et le 6 novembre — 09:00 locales les trois fois, 13:00 UTC puis 14:00', [locales(ny, 0), TOUT(ny).map(o => iso(o.debut).slice(11, 16))], [['2026-10-30T09:00', '2026-11-06T09:00', '2026-11-13T09:00'], ['13:00', '14:00', '14:00']]);
  const sy = serie('Australia/Sydney', '2026-10-02T09:00', 30, 'quotidienne', { n: 3 });
  v('⛔ Sydney, tous les jours à 09:00, à travers la bascule du 4 octobre (hémisphère sud) : 09:00 locales, 23:00 UTC la veille puis 22:00', [locales(sy, 0), TOUT(sy).map(o => iso(o.debut).slice(0, 16))], [['2026-10-02T09:00', '2026-10-03T09:00', '2026-10-04T09:00'], ['2026-10-01T23:00', '2026-10-02T23:00', '2026-10-03T22:00']]);
}

console.log('\nLa fin d\'une série : « N fois », « jusqu\'au », la première limite atteinte arrête');
{
  const sj = serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { jusqua: '2026-11-09' });
  v('⛔ « jusqu\'au 9 novembre » INCLUT ce jour-là (la dernière occurrence est le lundi 9 novembre à 14:00)', locales(sj, 0), ['2026-10-19T14:00', '2026-10-26T14:00', '2026-11-02T14:00', '2026-11-09T14:00']);
  const sj2 = serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { jusqua: '2026-11-08' });
  v('   « jusqu\'au 8 novembre » l\'exclut (le 9 est après)', locales(sj2, 0).length, 3);
  const avant = serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { jusqua: '2026-10-18' });
  v('   une limite AVANT la première occurrence : aucune occurrence', locales(avant, 0), []);
  const memej = serie(PARIS, '2026-10-19T14:00', 60, 'quotidienne', { jusqua: '2026-10-19' });
  v('   la limite le jour même : une seule occurrence', locales(memej, 0), ['2026-10-19T14:00']);
  const deux = serie(PARIS, '2026-10-19T14:00', 60, 'quotidienne', { n: 3, jusqua: '2026-12-31' });
  v('⛔ « 3 fois » ET « jusqu\'au 31 décembre » : la première limite atteinte arrête (3)', locales(deux, 0).length, 3);
  const deux2 = serie(PARIS, '2026-10-19T14:00', 60, 'quotidienne', { n: 50, jusqua: '2026-10-21' });
  v('   « 50 fois » ET « jusqu\'au 21 octobre » : 3 (la date arrive d\'abord)', locales(deux2, 0).length, 3);
  const sn = serie(PARIS, '2026-10-19T14:00', 60, 'quotidienne', { n: 1 });
  v('   « 1 fois » : la première seule', locales(sn, 0).length, 1);
  v('compter : « N fois » → N ; « jusqu\'au » → le bon nombre ; plafonné par `max`', [C.compter(serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { n: 12 }), 1000), C.compter(sj, 1000), C.compter(serie(PARIS, '2026-10-19T14:00', 60, 'quotidienne', { n: 400 }), 10)], [12, 4, 10]);
  const jours = C.compter(serie(PARIS, '2026-01-01T09:00', 30, 'quotidienne', { jusqua: '2026-12-31' }), 1000);
  v('un an de réunions quotidiennes : 365 occurrences', jours, 365);
  v('⛔ une série sans AUCUNE limite ne court pas sans fin : plafonnée par `max` (compter) et par la fenêtre (occurrences)', [C.compter(serie(PARIS, '2026-01-01T09:00', 30, 'quotidienne'), 800), C.occurrences(serie(PARIS, '2026-01-01T09:00', 30, 'quotidienne'), U(2026, 3, 1), U(2026, 3, 8)).length], [800, 7]);
}

console.log('\nUne fenêtre rend exactement ce qu\'on trouve en énumérant toute la série (propriété jouée sur plusieurs séries et plusieurs dizaines de fenêtres)');
{
  const series = [
    serie(PARIS, '2026-10-19T14:00', 60, 'hebdomadaire', { n: 30 }),
    serie(PARIS, '2026-01-31T10:00', 60, 'mensuelle', { n: 20 }),
    serie('America/New_York', '2026-03-06T08:30', 45, 'quotidienne', { jusqua: '2026-12-31' }),
    serie('Australia/Sydney', '2026-09-25T17:00', 120, 'hebdomadaire', { jusqua: '2027-06-30' }),
    serie(PARIS, '2026-03-22T02:30', 30, 'hebdomadaire', { n: 60 }),
    serie('Asia/Kolkata', '2026-05-05T09:00', 30, 'mensuelle', { jusqua: '2028-12-31' }),
  ];
  let fenetres = 0, ecarts = [], total = 0;
  for (const [i, s] of series.entries()) {
    const toutes = TOUT(s), tousTemps = toutes.map(o => o.debut);
    total += toutes.length;
    for (let f = 0; f < 12; f++) {
      /* des fenêtres de tailles variées, dont certaines tombent EXACTEMENT sur le début d'une occurrence */
      const du = f % 3 === 0 && toutes[(f * 2) % toutes.length] ? toutes[(f * 2) % toutes.length].debut : toutes[0].debut - 5 * 86400000 + f * 23 * 86400000 + 7 * 60000 * f;
      const au = du + [1, 86400000, 3 * 86400000, 20 * 86400000, 90 * 86400000, 400 * 86400000][f % 6];
      const attendu = toutes.filter(o => o.debut >= du && o.debut < au).map(o => o.debut + ':' + o.rang);
      const obtenu = C.occurrences(s, du, au).map(o => o.debut + ':' + o.rang);
      fenetres++;
      if (JSON.stringify(attendu) !== JSON.stringify(obtenu)) ecarts.push('série ' + i + ' fenêtre ' + f);
    }
    /* premiereApres sur chaque instant : strictement après, ou inclus */
    for (let k = 0; k < Math.min(tousTemps.length, 25); k++) {
      const t = tousTemps[k];
      const strict = C.premiereApres(s, t), inclus = C.premiereApres(s, t, true);
      if (!inclus || inclus.debut !== t) ecarts.push('série ' + i + ' inclus ' + k);
      if (k + 1 < tousTemps.length ? !(strict && strict.debut === tousTemps[k + 1]) : strict !== null) ecarts.push('série ' + i + ' strict ' + k);
      if (!C.occurrenceA(s, t) || C.occurrenceA(s, t + 1)) ecarts.push('série ' + i + ' occurrenceA ' + k);
    }
  }
  vrai('population : ' + series.length + ' séries, ' + total + ' occurrences énumérées, ' + fenetres + ' fenêtres comparées', series.length === 6 && total > 400 && fenetres === 72);
  v('⛔ toute fenêtre rend EXACTEMENT les occurrences (instant ET rang) de l\'énumération complète ; premiereApres et occurrenceA s\'accordent avec elle', ecarts, []);
  const dense = serie(PARIS, '2026-01-01T09:00', 30, 'quotidienne', { n: 500 });
  v('le plafond `max` coupe la liste ; sans plafond donné, 500 au plus', [C.occurrences(dense, C.T_MIN, C.T_MAX, 3).length, C.occurrences(dense, C.T_MIN, C.T_MAX).length], [3, 500]);
}

console.log('\nUne série récurrente part de SON heure locale : un instant donné en seconde passe d\'une heure ambiguë est ramené à la première');
{
  const seconde = U(2026, 10, 25, 1, 30);      // 02:30 locales, la SECONDE fois (heure d'hiver)
  const s = { debut: seconde, fin: seconde + 1800000, tz: PARIS, rep: 'hebdomadaire', n: 2, jusqua: null };
  const n = C.normaliserSerie(s);
  v('⛔ hebdomadaire : la série est ramenée à 00:30 UTC (la première 02:30), durée gardée — c\'est ce que l\'agenda lira dans le fichier', [iso(n.debut), n.fin - n.debut], ['2026-10-25T00:30:00Z', 1800000]);
  const u = C.normaliserSerie(Object.assign({}, s, { rep: 'aucune' }));
  v('une réunion sans répétition garde son instant exact (son fichier le dit en UTC)', [iso(u.debut), u.fin - u.debut], ['2026-10-25T01:30:00Z', 1800000]);
  const ord = C.normaliserSerie({ debut: U(2026, 10, 20, 12, 0), fin: U(2026, 10, 20, 13, 0), tz: PARIS, rep: 'quotidienne', n: 2, jusqua: null });
  v('une heure ordinaire ne bouge pas', iso(ord.debut), '2026-10-20T12:00:00Z');
}

console.log('\nLes rappels permis');
{
  v('cinq minutes, quinze minutes, une heure, un jour', C.RAPPELS_PERMIS, [5, 15, 60, 1440]);
  v('les répétitions connues', C.REPETITIONS, ['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle']);
  const t = U(2026, 7, 14, 10, 0);
  v('en plein été, sans bascule : 1 jour = 24 heures, 1 heure = 60 minutes', [(t - C.echeanceRappel(t, 1440, PARIS)) / 3600000, (t - C.echeanceRappel(t, 60, PARIS)) / 60000, (t - C.echeanceRappel(t, 5, PARIS)) / 60000], [24, 60, 5]);
  v('⛔ la réunion du lundi 26 octobre à 00:30 (heure d\'hiver) : « la veille » est dimanche à 00:30 (encore l\'heure d\'été, avant la bascule de 03:00) → 25 heures avant, et à la montre 00:30 des deux côtés',
    [(U(2026, 10, 25, 23, 30) - C.echeanceRappel(U(2026, 10, 25, 23, 30), 1440, PARIS)) / 3600000, C.formaterLocal(C.echeanceRappel(U(2026, 10, 25, 23, 30), 1440, PARIS), PARIS)], [25, '2026-10-25T00:30']);
}

console.log('\nUne série quotidienne SANS FIN ne s\'arrête pas en silence');
{
  const s = serie(PARIS, '2026-01-01T09:00', 30, 'quotidienne');
  const lointaines = C.occurrences(s, U(2099, 6, 1), U(2099, 6, 8));
  v('⛔ une série quotidienne commencée le 1er janvier 2026 a encore une occurrence chaque jour de juin 2099 (27 000 jours plus loin : une boucle plafonnée à quatorze ans les perdrait)', [lointaines.length, lointaines.map(o => C.formaterLocal(o.debut, PARIS))],
    [7, ['2099-06-01T09:00', '2099-06-02T09:00', '2099-06-03T09:00', '2099-06-04T09:00', '2099-06-05T09:00', '2099-06-06T09:00', '2099-06-07T09:00']]);
  const d = C.derniereDate(serie(PARIS, '2026-01-31T09:00', 30, 'mensuelle', { n: 4 }));
  v('la dernière date d\'une série bornée (le 31 mensuel quatre fois : janvier, mars, mai, juillet) ; sans fin : null ; une réunion seule : sa date', [d, C.derniereDate(s), C.derniereDate(serie(PARIS, '2026-03-05T09:00', 30, 'aucune'))], [{ a: 2026, m: 7, j: 31 }, null, { a: 2026, m: 3, j: 5 }]);
  v('et par une date limite, la plus proche des deux limites gagne', C.derniereDate(serie(PARIS, '2026-10-01T09:00', 30, 'quotidienne', { n: 50, jusqua: '2026-10-10' })), { a: 2026, m: 10, j: 10 });
}

fin();
