/* ⛔ CE QUE CE FICHIER GARDE — UNE RÉUNION SUR PLUSIEURS JOURS SE MONTRE CHAQUE JOUR, AVEC « JOUR 2 SUR 3 » (Justin, 26 octobre 2026, décision #17).

   Avant : l'agenda rangeait une réunion le jour où elle COMMENCE (`o.debut` dans le jour). Une réunion du vendredi 09:00 au dimanche 12:00 n'était dans le samedi ni dans le dimanche : celui qui ouvrait
   l'agenda du samedi ne voyait rien, alors qu'il était attendu. Le service renvoyait pourtant déjà l'occurrence (il rend toute occurrence qui TOUCHE la fenêtre). Maintenant `occurrencesDuJour` la range
   dans chacun de ses jours, avec son rang (`suite : { n, total }`), et la ligne, la puce de la grille et l'étiquette vocale de la case disent « jour 2 sur 3 ».

   « Plusieurs jours » = 24 heures ou plus : une soirée qui passe minuit (22:00 → 02:00) reste UN jour (la même règle que `jourFinDit`). Le rang se compte en jours de l'appareil (la minuit LOCALE) :
   le banc joue le dimanche du changement d'heure (25 octobre 2026, 25 heures) pour qu'un jour de 25 h ne devienne ni un jour de plus ni un jour de moins.

   Les VRAIES fonctions de la page sont extraites et exécutées, dans le fuseau de Paris :
     1. `suiteReunion` : 3 jours (23, 24, 25 octobre), 24 h pile sur deux jours, fin à minuit pile ; la soirée de 4 h qui passe minuit n'a pas de rang ; hors des jours, rien ;
     2. `occurrencesDuJour` : la réunion est dans les TROIS jours, avec son rang, et pas la veille ni le lendemain ; une réunion d'un jour n'est que dans le sien (contre-épreuve) ; les jours de suite passent AVANT ;
     3. `ligneReunion` : « Jour 2 sur 3 » sur la ligne, « Suite » dans la colonne de l'heure (le premier jour garde son heure), l'étiquette vocale le dit, `data-debut` reste celui de la réunion (la fiche s'ouvre
        sur la bonne date) ;
     4. `puceAgenda` et `caseJour` : la puce du premier jour garde l'heure, les suivantes disent « J2/3 », l'étiquette vocale de la case dit « (jour 2 sur 3) » sans une heure qui serait celle d'avant.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « absent » est précédé de la présence dans les jours voisins. */
'use strict';
process.env.TZ = 'Europe/Paris';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const loc = (a, m, j, h, mn) => new Date(a, m - 1, j, h || 0, mn || 0).getTime();            // une date à l'heure de Paris
const JOUR = (j) => loc(2026, 10, j);                                                          // minuit local du j octobre 2026
const R3 = { id: 'r_trois', titre: 'Séminaire', lieu: '', annulee: false, moi: { hote: false, statut: 'accepte', trajet: null }, hote: 'u_ana', participantsN: 3, salleOuverte: false,
  occurrences: [{ debut: loc(2026, 10, 23, 9), fin: loc(2026, 10, 25, 12) }] };                   // vendredi 09:00 → dimanche 12:00 (le dimanche du changement d'heure)
const R1 = { id: 'r_un', titre: 'Point', lieu: '', annulee: false, moi: { hote: false, statut: 'accepte', trajet: null }, hote: 'u_ana', participantsN: 2, salleOuverte: false,
  occurrences: [{ debut: loc(2026, 10, 24, 10), fin: loc(2026, 10, 24, 11) }] };
const heure = (t) => String(new Date(t).getHours()).padStart(2, '0') + ':' + String(new Date(t).getMinutes()).padStart(2, '0');

(async () => {
  const base = {
    esc, maj1: (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : ''), CAP: { agenda: false, salles: false }, icone: () => '', duCote: () => true, coteReu: () => 'pro',
    FMT_HEURE: { format: heure }, FMT_JOUR_LONG: { format: (t) => 'jour ' + new Date(t).getDate() }, FMT_JOUR_COURT: { format: (t) => 'j' + new Date(t).getDate() },
    libelleHoraire: () => ({ h: '09:00 – 12:00', note: '', hz: '', ville: '' }), nomPersonne: () => 'Ana', MOI: { id: 'u_moi' },
    heureEmpilee: (d, f, premier) => '<span class="reunion-heure">' + (premier || heure(d)) + '</span>', plageLongue: () => 'de 09:00 à 12:00', plageHeures: () => '09:00 – 12:00',
    libelleEtat: () => '', peutDecaler: () => false, dureeSeance: () => '1 min', nombreElts: (l) => l.length + ' éléments', premierDuMois: (t) => { const d = new Date(t); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); },
  };
  const reu = { liste: [R3, R1], evenements: [], charge: true, mois: JOUR(1), jour: JOUR(24) };
  const M = P.monter({
    debutDeJour: P.ligne('const debutDeJour ='), plusJours: P.ligne('const plusJours ='), occTerminee: P.ligne('const occTerminee ='), termineeElt: P.ligne('const termineeElt ='),
    titreElt: P.ligne('const titreElt ='), journeeElt: P.ligne('const journeeElt ='), texteSuite: P.ligne('const texteSuite ='),
    suiteReunion: P.decl('function suiteReunion('), occurrencesDuJour: P.decl('function occurrencesDuJour('), ligneReunion: P.decl('function ligneReunion('),
    puceAgenda: P.decl('function puceAgenda('), caseJour: P.decl('function caseJour('),
  }, Object.assign({ reu }, base));
  const F = M.F;
  console.log('0. La population');
  v('(population) chaque morceau est trouvé', M.absents, []);

  console.log('\n1. `suiteReunion` : le rang d\'un jour');
  const oc = R3.occurrences[0];
  v('vendredi 09:00 → dimanche 12:00 (le 25 octobre dure 25 h) : jour 1, 2 et 3 sur 3 ; la veille et le lendemain, rien', [22, 23, 24, 25, 26].map(j => F.suiteReunion(oc, JOUR(j))), [null, { n: 1, total: 3 }, { n: 2, total: 3 }, { n: 3, total: 3 }, null]);
  v('24 heures pile (vendredi 09:00 → samedi 09:00) : deux jours — « jour 1 sur 2 », « jour 2 sur 2 »', [23, 24].map(j => F.suiteReunion({ debut: loc(2026, 10, 23, 9), fin: loc(2026, 10, 24, 9) }, JOUR(j))), [{ n: 1, total: 2 }, { n: 2, total: 2 }]);
  v('vendredi 09:00 → lundi 00:00 pile : trois jours (le lundi n\'est pas un jour de la réunion)', [23, 24, 25, 26].map(j => F.suiteReunion({ debut: loc(2026, 10, 23, 9), fin: loc(2026, 10, 26, 0) }, JOUR(j))), [{ n: 1, total: 3 }, { n: 2, total: 3 }, { n: 3, total: 3 }, null]);
  v('⛔ une soirée qui passe minuit (22:00 → 02:00, 4 h) reste UN jour : aucun rang, ni le premier jour ni le suivant', [23, 24].map(j => F.suiteReunion({ debut: loc(2026, 10, 23, 22), fin: loc(2026, 10, 24, 2) }, JOUR(j))), [null, null]);
  v('23 h 59 min sur deux jours (09:00 → 08:59 le lendemain) : moins de 24 h, un seul jour', F.suiteReunion({ debut: loc(2026, 10, 23, 9), fin: loc(2026, 10, 24, 8, 59) }, JOUR(23)), null);

  console.log('\n2. `occurrencesDuJour` : la réunion est dans chacun de ses jours');
  const jours = [22, 23, 24, 25, 26].map(j => F.occurrencesDuJour(JOUR(j)));
  v('⛔ le séminaire est dans le 23, le 24 et le 25 — pas le 22 ni le 26', jours.map(l => l.filter(x => x.r.id === 'r_trois').length), [0, 1, 1, 1, 0]);
  v('… avec son rang : 1/3, 2/3, 3/3', jours.slice(1, 4).map(l => l.find(x => x.r.id === 'r_trois').suite), [{ n: 1, total: 3 }, { n: 2, total: 3 }, { n: 3, total: 3 }]);
  v('… et c\'est TOUJOURS la même occurrence (même début : la fiche s\'ouvre sur la bonne date)', jours.slice(1, 4).map(l => l.find(x => x.r.id === 'r_trois').o.debut), [oc.debut, oc.debut, oc.debut]);
  v('⛔ la réunion d\'un jour n\'est que dans le sien (contre-épreuve), sans rang', jours.map(l => l.filter(x => x.r.id === 'r_un').map(x => x.suite)), [[], [], [null], [], []]);
  v('le 24 : le jour de suite du séminaire passe AVANT le point de 10:00 (il a commencé avant)', jours[2].map(x => x.r.id), ['r_trois', 'r_un']);
  const R3b = Object.assign({}, R3, { annulee: true });
  vrai('(population) une réunion ANNULÉE reste dans la liste de la source ; elle est rangée comme les autres (c\'est la ligne qui dit « Annulée »)', (() => { reu.liste = [R3b]; const l = F.occurrencesDuJour(JOUR(24)); reu.liste = [R3, R1]; return l.length === 1 && l[0].r.annulee; })());

  console.log('\n3. La ligne de la liste du jour');
  const x24 = jours[2].find(x => x.r.id === 'r_trois'), x23 = jours[1].find(x => x.r.id === 'r_trois'), x25 = jours[3].find(x => x.r.id === 'r_trois');
  const l24 = F.ligneReunion(x24.r, x24.o, x24.suite), l23 = F.ligneReunion(x23.r, x23.o, x23.suite);
  vrai('⛔ le samedi : « Jour 2 sur 3 » sur la ligne, « Suite » dans la colonne de l\'heure, l\'étiquette vocale dit « jour 2 sur 3 »', /Jour 2 sur 3/.test(l24) && /<span class="reunion-heure">Suite<\/span>/.test(l24) && /aria-label="[^"]*jour 2 sur 3/.test(l24));
  vrai('⛔ le vendredi (premier jour) : « Jour 1 sur 3 » ET son heure de début (09:00), pas « Suite »', /Jour 1 sur 3/.test(l23) && /<span class="reunion-heure">09:00<\/span>/.test(l23) && !/Suite/.test(l23));
  vrai('le dimanche : « Jour 3 sur 3 », « Suite »', /Jour 3 sur 3/.test(F.ligneReunion(x25.r, x25.o, x25.suite)) && /Suite/.test(F.ligneReunion(x25.r, x25.o, x25.suite)));
  vrai('⛔ `data-debut` est celui de la réunion les trois jours (la fiche s\'ouvre sur la bonne occurrence)', [l23, l24, F.ligneReunion(x25.r, x25.o, x25.suite)].every(h => h.includes('data-debut="' + oc.debut + '"')));
  const l1 = F.ligneReunion(R1, R1.occurrences[0], null);
  vrai('contre-épreuve : la réunion d\'un jour n\'a ni « Jour … sur … » ni « Suite » (appel sans rang), son heure est celle de son début', !/Jour \d sur/.test(l1) && !/Suite/.test(l1) && /<span class="reunion-heure">10:00<\/span>/.test(l1));
  vrai('un appelant qui n\'a pas de rang (le tableau de bord appelle `ligneReunion(r, o)`) garde l\'ancienne ligne', !/Jour \d sur/.test(F.ligneReunion(R3, oc)));

  console.log('\n4. La grille : la puce et la case');
  const p23 = F.puceAgenda(x23, JOUR(23)), p24 = F.puceAgenda(x24, JOUR(24)), p25 = F.puceAgenda(x25, JOUR(25));
  vrai('⛔ la puce du premier jour garde l\'heure (09:00) ; celles des jours suivants disent « J2/3 », « J3/3 »', /<time>09:00<\/time>/.test(p23) && /<time>J2\/3<\/time>/.test(p24) && /<time>J3\/3<\/time>/.test(p25));
  vrai('⛔ l\'étiquette vocale de chaque puce dit son rang (« jour 1 sur 3 », « jour 2 sur 3 », « jour 3 sur 3 »)', /aria-label="[^"]*jour 1 sur 3/.test(p23) && /aria-label="[^"]*jour 2 sur 3/.test(p24) && /aria-label="[^"]*jour 3 sur 3/.test(p25));
  vrai('la puce d\'un jour de suite est le même bouton que celle du premier (même `data-id`, même `data-debut`) : le focus et l\'ouverture n\'ont qu\'une identité', [p23, p24, p25].every(h => h.includes('data-id="r_trois"') && h.includes('data-debut="' + oc.debut + '"')));
  vrai('contre-épreuve : la puce d\'une réunion d\'un jour n\'a ni « J… » ni rang', !/<time>J\d/.test(F.puceAgenda({ r: R1, o: R1.occurrences[0], suite: null }, JOUR(24))) && !/jour \d sur/.test(F.puceAgenda({ r: R1, o: R1.occurrences[0], suite: null }, JOUR(24))));
  const c24 = F.caseJour(JOUR(24), JOUR(20), 3, false), c26 = F.caseJour(JOUR(26), JOUR(20), 3, false);
  vrai('⛔ la case du samedi : son étiquette vocale cite « Séminaire (jour 2 sur 3) » et NON « 09:00 Séminaire » (une heure qui serait celle du vendredi), puis « 10:00 Point »', /Séminaire \(jour 2 sur 3\), 10:00 Point/.test(c24) && !/09:00 Séminaire/.test(c24));
  vrai('le lundi (le lendemain de la fin) : la case est vide — rien de prévu', /rien de prévu/.test(c26) && !/Séminaire/.test(c26));
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
