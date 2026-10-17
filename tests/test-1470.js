/* ══ test-1470 — « REPORTER » REPOUSSE, IL N'AVANCE JAMAIS — LE VRAI SERVICE, L'HORLOGE AVANCÉE AU GESTE ═════════════════════════════════════════════
   17 octobre 2026, deux constats des agents de test (agenda#0, pro#2) : « Reporter 10 min / 1 h / Demain 9 h » (fiche d'un rendez-vous, menu d'appui long, fiche d'un rappel du tableau de bord)
   déplaçait l'événement à MAINTENANT + 10 min / + 1 h / demain 9 h, quelle que soit sa date : un rendez-vous du 28 octobre passait à dans 10 minutes (il AVANÇAIT de douze jours, sans
   confirmation, pendant que le menu dit « De 10 minutes »), un rappel de 05:47 passait à 01:48. « Reporter » a été conçu pour un rappel ÉCHU qu'on repousse — ce comportement-là reste vrai.
   La règle : la base du report est le PLUS TARD de « maintenant » et du début de l'événement.
     · un événement à venir se repousse à partir de SON début (28 oct. 10:00 → 10:10, 11:00) ; « demain » est le jour d'après le jour de cet événement ;
     · un événement déjà passé se repousse à partir de MAINTENANT (la règle d'avant, pour le rappel échu) ; « demain » est le jour d'après aujourd'hui ;
     · la durée est gardée, l'échéance du rappel suit le nouvel horaire, une journée entière ne se reporte que d'un jour (à partir de son jour s'il est à venir).
   Ce banc parle au VRAI service. Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const MDP = { alice: 'pw-alice-rep0001' };
const MIN = 60000, JOUR = 86400000;

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { reunions: { planificateurMs: 150, bailMs: 2000 } } });
  let avance = 0; const avancer0 = svc.avancer.bind(svc); svc.avancer = (ms) => { avance += ms; avancer0(ms); };
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  const p2 = (n) => String(n).padStart(2, '0');
  const debutLocal = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
  const jourLocal = (ms) => new Date(ms).toISOString().slice(0, 10);
  const maintenant = () => Date.now() + avance;
  const dans = (min) => Math.ceil((maintenant() + min * MIN) / MIN) * MIN;
  try {
    const A = await T.connecter(svc, og, 'alice', MDP.alice);
    const creer = async (b) => (await A.post('/api/agenda', Object.assign({ tz: 'UTC' }, b))).j.evenement;
    const rapp = (id) => Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', id).rappel_a);

    console.log('\n1. Un rendez-vous à venir : « Reporter » le repousse à partir de SON début, il ne le ramène pas à maintenant');
    const deb = dans(12 * 24 * 60);
    const E = await creer({ genre: 'rdv', titre: 'Dentiste QXR', debut: debutLocal(deb), rappels: [15] });
    const r1 = await A.post('/api/agenda/' + E.id + '/reporter', { dans: 10 });
    v('« 10 min » : 200, le début est l\'ancien + 10 min (le 12ᵉ jour d\'après, pas dans 10 minutes)', [r1.code, r1.j.evenement.debut], [200, deb + 10 * MIN]);
    vrai('   ⛔ et surtout il n\'AVANCE pas : le nouveau début est après l\'ancien', r1.j.evenement.debut > deb, r1.j.evenement);
    v('   la durée est gardée, l\'échéance du rappel (15 min avant) suit le nouvel horaire', [r1.j.evenement.fin - r1.j.evenement.debut, rapp(E.id)], [E.fin - E.debut, deb + 10 * MIN - 15 * MIN]);
    const r2 = await A.post('/api/agenda/' + E.id + '/reporter', { dans: 60 });
    v('« 1 h » ensuite : encore 1 h plus tard que le début d\'alors', [r2.code, r2.j.evenement.debut], [200, deb + 70 * MIN]);
    const r3 = await A.post('/api/agenda/' + E.id + '/reporter', { dans: 'demain' });
    const j3 = jourLocal(deb + 70 * MIN);
    v('« demain 9 h » : le lendemain du jour de l\'événement (pas de demain tout court), à 9 h', [r3.code, new Date(r3.j.evenement.debut).toISOString()], [200, new Date(Date.parse(j3 + 'T09:00:00Z') + JOUR).toISOString()]);

    console.log('\n2. Un rappel à 5 h (le constat du tableau de bord) : « 1 h » le laisse après son heure');
    const deb5 = dans(5 * 60);
    const P = await creer({ titre: 'Relire les plans QXR', debut: debutLocal(deb5), rappels: [15] });
    const q1 = await A.post('/api/agenda/' + P.id + '/reporter', { dans: 60 });
    v('« 1 h » : 6 h après maintenant (5 h + 1 h), jamais maintenant + 1 h', [q1.code, q1.j.evenement.debut], [200, deb5 + 60 * MIN]);

    console.log('\n3. Un événement DÉJÀ PASSÉ (le rappel échu qu\'on repousse) : à partir de maintenant, comme avant');
    const deb3 = dans(20);
    const R = await creer({ titre: 'Appeler le garage QXR', debut: debutLocal(deb3), rappels: [0] });
    svc.avancer(40 * MIN);
    const t3 = maintenant();
    vrai('   (l\'événement est passé de 20 minutes)', deb3 < t3, [deb3, t3]);
    const s1 = await A.post('/api/agenda/' + R.id + '/reporter', { dans: 10 });
    v('« 10 min » : dans 10 minutes d\'AUJOURD\'HUI (à la minute près)', [s1.code, s1.j.evenement.debut >= t3 + 10 * MIN && s1.j.evenement.debut <= t3 + 12 * MIN], [200, true]);
    const s2 = await A.post('/api/agenda/' + R.id + '/reporter', { dans: 'demain' });
    v('« demain 9 h » : demain, à 9 h, compté depuis aujourd\'hui', [s2.code, new Date(s2.j.evenement.debut).toISOString()], [200, new Date(Date.parse(jourLocal(maintenant()) + 'T09:00:00Z') + JOUR).toISOString()]);

    console.log('\n4. Une journée entière : seulement « demain », depuis son jour s\'il est à venir');
    const jd = dans(5 * 24 * 60);
    const J = await creer({ titre: 'Congé QXR', debut: jourLocal(jd), journee: true });
    const u1 = await A.post('/api/agenda/' + J.id + '/reporter', { dans: 'demain' });
    v('à venir : le lendemain de SON jour', [u1.code, jourLocal(u1.j.evenement.debut), u1.j.evenement.journee], [200, jourLocal(J.debut + JOUR), true]);
    const u2 = await A.post('/api/agenda/' + J.id + '/reporter', { dans: 10 });
    v('« 10 min » reste refusé (champ_invalide)', [u2.code, u2.j.error], [400, 'champ_invalide']);

    console.log('\n5. La page dit l\'heure RETENUE, et le bon jour (la VRAIE fonction `phraseReport` de la page, exécutée)');
    const PAGE = fs.readFileSync(path.join(__dirname, '..', 'apercu', 'opmessages', 'index.html'), 'utf8');
    const i0 = PAGE.indexOf('  function phraseReport('), i1 = i0 < 0 ? -1 : PAGE.indexOf('\n  }\n', i0);
    vrai('   la fonction est trouvée (une tranche vide passerait au vert sur tout)', i0 > 0 && i1 > i0, [i0, i1]);
    const ctx = { FMT_HEURE: new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }), FMT_DATE: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }) };
    vm.createContext(ctx); vm.runInContext(PAGE.slice(i0, i1 + 4) + '\nthis.f = phraseReport;', ctx, { timeout: 2000 });
    const n = new Date(), loc = (dj, h, mi) => new Date(n.getFullYear(), n.getMonth(), n.getDate() + dj, h, mi).getTime();
    const D12 = ctx.FMT_DATE.format(loc(12, 10, 10));
    v('aujourd\'hui à 12:34 : la phrase d\'avant', ctx.f(10, { debut: loc(0, 12, 34) }), 'Reporté à 12:34');
    v('demain 09:00 : la phrase d\'avant', ctx.f('demain', { debut: loc(1, 9, 0) }), 'Reporté à demain 09:00');
    v('⛔ « demain 9 h » d\'un rendez-vous dans 12 jours : le JOUR est dit, jamais « demain »', ctx.f('demain', { debut: loc(12, 9, 0) }), 'Reporté au ' + D12 + ' à 09:00');
    v('⛔ « 10 min » d\'un rendez-vous dans 12 jours : le jour aussi', ctx.f(10, { debut: loc(12, 10, 10) }), 'Reporté au ' + D12 + ' à 10:10');
    v('une journée entière : demain, ou le jour (sans heure)', [ctx.f('demain', { debut: loc(1, 0, 0), journee: true }), ctx.f('demain', { debut: loc(12, 0, 0), journee: true })], ['Reporté à demain', 'Reporté au ' + D12]);

    console.log('\n6. Les boutons « demain » disent le jour RETENU, et la phrase du toast est bien celle de phraseReport (le CODE, commentaires retirés)');
    const j0 = PAGE.indexOf('  function reportDemainJour('), j1 = j0 < 0 ? -1 : PAGE.indexOf('\n  }\n', j0);
    vrai('   la fonction est trouvée', j0 > 0 && j1 > j0, [j0, j1]);
    const ctx2 = { FMT_DATE: ctx.FMT_DATE }; vm.createContext(ctx2); vm.runInContext(PAGE.slice(j0, j1 + 4) + '\nthis.f = reportDemainJour;', ctx2, { timeout: 2000 });
    const D13 = ctx.FMT_DATE.format(loc(13, 0, 0)), D2 = ctx.FMT_DATE.format(loc(2, 0, 0));
    v('aujourd\'hui (à venir) : « demain » est bien demain, le libellé d\'avant (chaîne vide)', ctx2.f({ debut: loc(0, 23, 0) }), '');
    v('déjà passé (rappel échu) : la base est maintenant, donc demain tout court', ctx2.f({ debut: loc(-3, 8, 0) }), '');
    v('⛔ rendez-vous dans 12 jours : le bouton dit le 13ᵉ jour (le lendemain de l\'événement), jamais « demain »', ctx2.f({ debut: loc(12, 10, 0) }), D13);
    v('demain à 10 h : le lendemain est après-demain, et le bouton le dit', ctx2.f({ debut: loc(1, 10, 0) }), D2);
    const SANS = PAGE.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const coupe = (deb, long) => { const i = SANS.indexOf(deb); return i < 0 ? '' : SANS.slice(i, i + long); };
    const evt = coupe('async function evtReporter(', 700), choix = coupe("act === 'reporter-choix'", 400);
    vrai('   les deux tranches sont trouvées (une tranche vide passerait au vert sur tout)', evt.length > 0 && choix.length > 0, [evt.length, choix.length]);
    vrai('   evtReporter (fiche d\'un rappel) annonce par phraseReport(dans, …)', /mot\(phraseReport\(dans, \w+\)\)/.test(evt), evt);
    vrai('   reporter-choix (menu d\'appui long) annonce par phraseReport(dans, …)', /mot\(phraseReport\(dans, \w+\)\)/.test(choix), choix);
    vrai('   ⛔ l\'ancienne phrase « Reporté à demain » concaténée à la main n\'existe plus nulle part', !/'Reporté ' \+ \(dans/.test(SANS) && !/Reporté à demain/.test(SANS.replace(/return 'Reporté à demain'[^\n]*\n/, '')), null);
    vrai('   le menu d\'appui long fonde son libellé « demain » sur reportDemainJour(x.e)', /const jd = reportDemainJour\(x\.e\)[^;]*'À demain 9 h'/.test(SANS), null);
    vrai('   le libellé de la fiche (bouton « Demain 9 h ») le fonde sur reportDemainJour(e) et son aria-label aussi', /\)\(reportDemainJour\(e\)\)\.map/.test(SANS) && /'Reporter ' \+ \(v === 'demain' \? \(reportDemainJour\(e\)/.test(SANS), null);
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch((e) => { console.error(e); process.exit(1); });
