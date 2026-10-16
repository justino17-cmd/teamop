/* ══ test-1004 — LE RENDEZ-VOUS PERSONNEL : AVEC QUI, PLUSIEURS RAPPELS — LE VRAI SERVICE, L'HORLOGE AVANCÉE AU GESTE ══════════════════════════════
   13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous, comme ça les personnes peuvent gérer leurs rendez-vous personnels avec des rappels et tout » ; puis « ils peuvent aussi
   l'ajouter à leur agenda, comme Apple fait ». Un rendez-vous est un événement de l'agenda personnel (`server-msg/routes-agenda.js`, migration 27) de genre 'rdv'. Ce banc parle au VRAI service :
     · il a TOUJOURS une heure (jamais « toute la journée »), un « avec qui » scellé en base comme le titre, et jusqu'à TROIS rappels (rangés le plus éloigné d'abord) ;
     · ⛔ les rappels partent DANS L'ORDRE, chacun une fois : quand l'un part, l'échéance passe au suivant — calculée par le service, jamais par la page ; le texte dit « avec qui » ;
     · le genre se choisit à la création et ne change pas ; « avec qui » n'appartient qu'au rendez-vous ; `rappel` (un seul, la page d'avant) reste accepté, jamais avec `rappels` ;
     · cocher, décocher, reporter, modifier gardent la liste ; une ligne d'avant la migration (ni genre ni liste) se lit comme un événement à son rappel seul ;
     · « Ajouter à mon calendrier » (un fichier .ics) est parti le 16 octobre 2026 : plus de route `/ics`, plus de fichier ;
     · l'export des données porte le genre, « avec qui » et la liste des rappels.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const MDP = { alice: 'pw-alice-rdv0001', bob: 'pw-bob-rdv000001' };
const AVEC = 'Dr Lemoine QXR';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { reunions: { planificateurMs: 150, bailMs: 2000 } } });
  let avance = 0; const avancer0 = svc.avancer.bind(svc); svc.avancer = (ms) => { avance += ms; avancer0(ms); };      // l'horloge du service, suivie par le banc
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  const ecrire = (req, ...a) => { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(BASE); try { d.exec('PRAGMA busy_timeout = 2000'); return d.prepare(req).run(...a); } finally { d.close(); } };
  const p2 = (n) => String(n).padStart(2, '0');
  const debutLocal = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
  const maintenant = () => Date.now() + avance;
  const dans = (min) => Math.ceil((maintenant() + min * 60000) / 60000) * 60000;   // à la minute, sur l'horloge du SERVICE
  try {
    const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob);

    console.log('\n1. Créer un rendez-vous : avec qui, plusieurs rappels');
    const r1 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Cardiologue QXR', avec: AVEC, lieu: 'Clinique du parc', debut: debutLocal(dans(3 * 24 * 60)), tz: 'UTC', rappels: [60, 1440] });
    const E = r1.j && r1.j.evenement;
    v('201 : un rendez-vous, avec qui, ses deux rappels rangés le plus ÉLOIGNÉ d\'abord, et le premier dans `rappel` (ce que lit la page d\'avant)', [r1.code, E && E.genre, E && E.avec, E && E.rappels, E && E.rappel, E && E.journee],
      [201, 'rdv', AVEC, [1440, 60], 1440, false]);
    vrai('   il attend son premier rappel (la veille)', E && E.rappelEnAttente === true, E);
    v('   la base : le genre, la liste des rappels (JSON), le premier rappel ; et l\'échéance est celle de la veille', [sql('SELECT genre FROM evenement WHERE id = ?', E.id).genre, sql('SELECT rappels FROM evenement WHERE id = ?', E.id).rappels,
      Number(sql('SELECT rappel FROM evenement WHERE id = ?', E.id).rappel), Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', E.id).rappel_a)], ['rdv', '[1440,60]', 1440, E.debut - 86400000]);
    v('⛔ « avec qui » est SCELLÉ en base (rien en clair), comme le titre', [Number(sql("SELECT COUNT(*) AS n FROM evenement WHERE CAST(avec_ch AS TEXT) LIKE '%QXR%' OR CAST(titre_ch AS TEXT) LIKE '%QXR%'").n),
      Number(sql('SELECT COUNT(*) AS n FROM evenement WHERE avec_ch IS NOT NULL').n)], [0, 1]);
    const r2 = await A.post('/api/agenda', { titre: 'Courses', debut: debutLocal(dans(2 * 24 * 60)), tz: 'UTC', rappel: 15 });
    v('un événement de la page d\'avant (`rappel` seul) : un événement, sa liste d\'un rappel, personne avec qui ; la base ne range pas de liste (le rappel seul suffit)', [r2.code, r2.j.evenement.genre, r2.j.evenement.rappels, r2.j.evenement.rappel, r2.j.evenement.avec,
      sql('SELECT rappels FROM evenement WHERE id = ?', r2.j.evenement.id).rappels, sql('SELECT genre FROM evenement WHERE id = ?', r2.j.evenement.id).genre], [201, 'evenement', [15], 15, '', null, null]);
    const r3 = await A.post('/api/agenda', { titre: 'Banque', debut: debutLocal(dans(2 * 24 * 60)), tz: 'UTC', rappels: [5, 30] });
    v('un événement peut aussi avoir plusieurs rappels (la liste n\'est pas réservée au rendez-vous)', [r3.code, r3.j.evenement.genre, r3.j.evenement.rappels, r3.j.evenement.rappel], [201, 'evenement', [30, 5], 30]);
    const r4 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Coiffeur', debut: debutLocal(dans(2 * 24 * 60)), tz: 'UTC' });
    v('un rendez-vous sans « avec qui » ni rappel : permis', [r4.code, r4.j.evenement.genre, r4.j.evenement.avec, r4.j.evenement.rappels, r4.j.evenement.rappel, r4.j.evenement.rappelEnAttente], [201, 'rdv', '', [], null, false]);

    console.log('\n2. Les refus se disent');
    const d0 = debutLocal(dans(2 * 24 * 60));
    const refus = [
      [{ genre: 'rdv', titre: 'A', debut: d0.slice(0, 10), journee: true }, 'champ_invalide'],          // un rendez-vous a une heure
      [{ genre: 'reunion', titre: 'A', debut: d0 }, 'champ_invalide'], [{ genre: 'Rdv', titre: 'A', debut: d0 }, 'champ_invalide'], [{ genre: 1, titre: 'A', debut: d0 }, 'champ_invalide'],
      [{ genre: 'rdv', titre: 'A', debut: d0, rappels: [0, 5, 15, 30] }, 'rappel_invalide'], [{ genre: 'rdv', titre: 'A', debut: d0, rappels: [15, 15] }, 'rappel_invalide'],
      [{ genre: 'rdv', titre: 'A', debut: d0, rappels: [45] }, 'rappel_invalide'], [{ genre: 'rdv', titre: 'A', debut: d0, rappels: ['15'] }, 'rappel_invalide'],
      [{ genre: 'rdv', titre: 'A', debut: d0, rappels: '15' }, 'rappel_invalide'], [{ genre: 'rdv', titre: 'A', debut: d0, rappels: null }, 'rappel_invalide'],
      [{ genre: 'rdv', titre: 'A', debut: d0, rappels: [15], rappel: 15 }, 'champ_invalide'],
      [{ genre: 'rdv', titre: 'A', debut: d0, avec: 'y'.repeat(121) }, 'champ_invalide'], [{ genre: 'rdv', titre: 'A', debut: d0, avec: 12 }, 'champ_invalide'], [{ genre: 'rdv', titre: 'A', debut: d0, avec: ['x'] }, 'champ_invalide'],
      [{ titre: 'A', debut: d0, avec: 'Quelqu\'un' }, 'champ_invalide'],                                // « avec qui » n'est que celui d'un rendez-vous
    ];
    const avant = Number(sql('SELECT COUNT(*) AS n FROM evenement').n);
    const rep = [];
    for (const [b, code] of refus) { const r = await A.post('/api/agenda', Object.assign({ tz: 'UTC' }, b)); rep.push(r.code === 400 && r.j.error === code ? true : r.code + ' ' + (r.j && r.j.error)); }
    v('rendez-vous « toute la journée », genre inconnu (« reunion », une majuscule, un nombre), quatre rappels, un doublon, 45 min, des textes, pas une liste, `rappel` ET `rappels`, « avec qui » trop long ou mal typé, « avec qui » sur un événement : 400, chacun SON code',
      rep, refus.map(() => true));
    v('   et aucun n\'a été créé', Number(sql('SELECT COUNT(*) AS n FROM evenement').n), avant);
    v('   trois rappels, c\'est permis ; « avec qui » de 120 signes aussi', [(await A.post('/api/agenda', { genre: 'rdv', titre: 'Trois', debut: d0, tz: 'UTC', rappels: [0, 15, 1440] })).j.evenement.rappels,
      (await A.post('/api/agenda', { genre: 'rdv', titre: 'Long', debut: d0, tz: 'UTC', avec: 'é'.repeat(120) })).j.evenement.avec.length], [[1440, 15, 0], 120]);

    console.log('\n3. Modifier : le genre ne change pas, la liste se garde ou se remplace');
    const m = (b) => A.post('/api/agenda/' + E.id + '/maj', b);
    const m1 = await m({ titre: 'Cardiologue (contrôle) QXR' });
    v('le titre seul : la liste, « avec qui », l\'échéance en attente sont gardés', [m1.code, m1.j.evenement.rappels, m1.j.evenement.avec, m1.j.evenement.rappelEnAttente, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', E.id).rappel_a)],
      [200, [1440, 60], AVEC, true, E.debut - 86400000]);
    /* ⛔ une page d'AVANT renvoie `rappel` à chaque enregistrement (relecture du gardien) : le même premier rappel garde la liste qu'elle ne voit pas, un autre la remplace */
    const mr1 = await m({ rappel: 1440, note: 'Corrigée par une page d\'avant' });
    v('⛔ `rappel` seul ÉGAL au premier (une page d\'avant qui corrige la note) : la liste est GARDÉE, l\'échéance aussi', [mr1.code, mr1.j.evenement.rappels, mr1.j.evenement.note, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', E.id).rappel_a)],
      [200, [1440, 60], 'Corrigée par une page d\'avant', E.debut - 86400000]);
    v('   `rappel` seul DIFFÉRENT : il remplace la liste (puis la liste revient)', [(await m({ rappel: 60 })).j.evenement.rappels, (await m({ rappels: [60, 1440] })).j.evenement.rappels], [[60], [1440, 60]]);
    v('⛔ le genre ne change pas (un événement → 400) ; le redire tel quel passe', [(await m({ genre: 'evenement' })).j.error, (await m({ genre: 'rdv' })).code], ['champ_invalide', 200]);
    v('⛔ un événement ne devient pas un rendez-vous (400)', (await A.post('/api/agenda/' + r2.j.evenement.id + '/maj', { genre: 'rdv' })).j.error, 'champ_invalide');
    v('⛔ un rendez-vous ne passe pas « toute la journée » (400), et rien n\'a bougé', [(await m({ journee: true, debut: d0.slice(0, 10) })).j.error, (await m({})).j.evenement.journee], ['champ_invalide', false]);
    v('⛔ « avec qui » ne se pose pas sur un événement par la modification non plus (400)', (await A.post('/api/agenda/' + r2.j.evenement.id + '/maj', { avec: 'Bob' })).j.error, 'champ_invalide');
    const m2 = await m({ rappels: [15] });
    v('une liste d\'un rappel : elle remplace (la base ne range plus de liste, le rappel seul), et l\'échéance se recalcule', [m2.j.evenement.rappels, m2.j.evenement.rappel, sql('SELECT rappels FROM evenement WHERE id = ?', E.id).rappels,
      Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', E.id).rappel_a)], [[15], 15, null, E.debut - 15 * 60000]);
    const m3 = await m({ rappel: 30 });
    v('`rappel` seul (la page d\'avant) remplace la liste', [m3.j.evenement.rappels, m3.j.evenement.rappel], [[30], 30]);
    const m4 = await m({ rappels: [] });
    v('une liste vide : plus aucun rappel, plus rien en attente', [m4.j.evenement.rappels, m4.j.evenement.rappel, m4.j.evenement.rappelEnAttente, sql('SELECT rappel_a FROM evenement WHERE id = ?', E.id).rappel_a], [[], null, false, null]);
    const m5 = await m({ rappels: [1440, 60], avec: null });
    v('« avec: null » l\'efface (la colonne scellée aussi) ; la liste revient', [m5.j.evenement.avec, sql('SELECT avec_ch FROM evenement WHERE id = ?', E.id).avec_ch, m5.j.evenement.rappels, m5.j.evenement.rappelEnAttente],
      ['', null, [1440, 60], true]);
    v('⛔ le rendez-vous d\'Alice : Bob ne le modifie pas (404), ni sa liste', [(await B.post('/api/agenda/' + E.id + '/maj', { rappels: [0] })).code, (await m({})).j.evenement.rappels], [404, [1440, 60]]);
    await m({ avec: AVEC });

    console.log('\n4. ⛔ Les rappels partent dans l\'ordre, chacun une fois — et le texte dit avec qui');
    const deb = dans(70);
    const rc = await A.post('/api/agenda', { genre: 'rdv', titre: 'Kiné QXR', avec: 'Mme Roux', debut: debutLocal(deb), tz: 'UTC', rappels: [15, 60] });
    const RC = rc.j.evenement;
    v('population : un rendez-vous dans 70 minutes, rappels 1 h et 15 min avant ; l\'échéance est la PREMIÈRE (1 h avant)', [rc.code, RC.rappels, RC.rappelEnAttente, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', RC.id).rappel_a)],
      [201, [60, 15], true, deb - 60 * 60000]);
    const rappels = async () => ((await A.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'agenda_rappel' && n.titre === 'Kiné QXR');
    await T.dort(600);
    v('rien ne part avant l\'échéance', (await rappels()).length, 0);
    svc.avancer(12 * 60000);
    vrai('1 h avant : le PREMIER rappel arrive', await T.attendre(async () => (await rappels()).length === 1, 8000, 100));
    const n1 = (await rappels())[0];
    vrai('   il dit le temps qui reste ET avec qui (« Dans 58 minutes · avec Mme Roux »)', n1 && /^Dans 5[7-9] minutes · avec Mme Roux$/.test(n1.texte), n1 && n1.texte);
    v('   ⛔ l\'échéance est passée au SUIVANT (15 min avant), pas effacée', Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', RC.id).rappel_a), deb - 15 * 60000);
    await A.post('/api/notifications/lues', { toutes: true });
    await T.dort(800);
    v('   il ne repart pas aux tours suivants (le rappel lu reste seul)', [(await rappels()).length, (await rappels()).filter(x => !x.lue).length], [1, 0]);
    svc.avancer(46 * 60000);
    vrai('15 min avant : le SECOND rappel arrive', await T.attendre(async () => (await rappels()).length === 2, 8000, 100));
    const n2 = (await rappels()).find(x => !x.lue);
    vrai('   « Dans 12 minutes · avec Mme Roux »', n2 && /^Dans 1[1-4] minutes · avec Mme Roux$/.test(n2.texte), n2 && n2.texte);
    v('   et plus rien n\'attend (le dernier de la liste est parti)', sql('SELECT rappel_a FROM evenement WHERE id = ?', RC.id).rappel_a, null);
    await A.post('/api/notifications/lues', { toutes: true });
    svc.avancer(5 * 60000);
    await T.dort(800);
    v('⛔ aucun troisième (deux rappels, deux notifications)', (await rappels()).length, 2);
    /* un rendez-vous SANS « avec qui » : le texte n'invente rien */
    const deb2 = dans(40);
    const rs = await A.post('/api/agenda', { genre: 'rdv', titre: 'Pharmacie QXR', debut: debutLocal(deb2), tz: 'UTC', rappels: [30] });
    vrai('population : un rendez-vous sans « avec qui », rappel 30 min avant', rs.code === 201 && rs.j.evenement.rappelEnAttente === true, rs.j);
    svc.avancer(11 * 60000);
    const pharma = async () => ((await A.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'agenda_rappel' && n.titre === 'Pharmacie QXR');
    vrai('   son rappel part', await T.attendre(async () => (await pharma()).length === 1, 8000, 100));
    vrai('   ⛔ sans « · avec » (« Dans 29 minutes »)', /^Dans (2[8-9]|30) minutes$/.test(((await pharma())[0] || {}).texte || ''), ((await pharma())[0] || {}).texte);
    /* deux échéances déjà passées pendant un arrêt : un seul rappel part (le plus proche), pas une rafale */
    const deb3 = dans(100);
    const rr = await A.post('/api/agenda', { genre: 'rdv', titre: 'Dentiste QXR', debut: debutLocal(deb3), tz: 'UTC', rappels: [60, 30] });
    vrai('population : un rendez-vous dans 100 min, rappels 1 h et 30 min avant', rr.code === 201 && rr.j.evenement.rappelEnAttente === true);
    svc.avancer(75 * 60000);
    const dent = async () => ((await A.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'agenda_rappel' && n.titre === 'Dentiste QXR');
    vrai('   l\'horloge saute par-dessus les DEUX échéances : un rappel part', await T.attendre(async () => (await dent()).length >= 1, 8000, 100));
    await T.dort(800);
    v('   ⛔ un seul (pas de rafale), et plus rien n\'attend', [(await dent()).length, sql('SELECT rappel_a FROM evenement WHERE id = ?', rr.j.evenement.id).rappel_a], [1, null]);

    console.log('\n5. Cocher, décocher, reporter : la liste reste');
    const deb4 = dans(3 * 60);
    const rf = (await A.post('/api/agenda', { genre: 'rdv', titre: 'Garage QXR', avec: 'M. Blanc', debut: debutLocal(deb4), tz: 'UTC', rappels: [15, 60] })).j.evenement;
    const f1 = await A.post('/api/agenda/' + rf.id + '/fait', { fait: true });
    v('cocher : plus rien n\'attend, la liste est gardée', [f1.code, f1.j.evenement.rappelEnAttente, f1.j.evenement.rappels], [200, false, [60, 15]]);
    const fm = await A.post('/api/agenda/' + rf.id + '/maj', { note: 'Pneus avant', debut: debutLocal(deb4), rappels: [60, 15] });
    v('⛔ modifier un rendez-vous coché « fait » (la fiche renvoie l\'heure et les rappels) ne le RÉARME pas : il ne sonnera pas', [fm.code, fm.j.evenement.note, typeof fm.j.evenement.fait, fm.j.evenement.rappelEnAttente,
      sql('SELECT rappel_a FROM evenement WHERE id = ?', rf.id).rappel_a], [200, 'Pneus avant', 'number', false, null]);
    const f2 = await A.post('/api/agenda/' + rf.id + '/fait', { fait: false });
    v('décocher : l\'échéance revient au PREMIER rappel encore à venir (1 h avant)', [f2.j.evenement.rappelEnAttente, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', rf.id).rappel_a)], [true, deb4 - 60 * 60000]);
    const p1 = await A.post('/api/agenda/' + rf.id + '/reporter', { dans: 'demain' });
    v('reporter à demain 9 h : la liste est gardée (en base aussi), avec qui aussi, l\'échéance est 1 h avant le nouvel horaire', [p1.code, p1.j.evenement.rappels, sql('SELECT rappels FROM evenement WHERE id = ?', rf.id).rappels, p1.j.evenement.avec,
      Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', rf.id).rappel_a)], [200, [60, 15], '[60,15]', 'M. Blanc', p1.j.evenement.debut - 60 * 60000]);

    console.log('\n6. Un rendez-vous à trois rappels (le fichier .ics est parti le 16 octobre 2026 ; ce rendez-vous sert à l\'export et à la restauration)');
    /* le dimanche 25 octobre 2026, l'heure d'hiver revient à 3 h : un rendez-vous à trois rappels, dont « la veille » — réutilisé aux sections 7 et 8 (export, restauration) */
    const NOTE = 'Apporter les résultats d\'analyse, la carte vitale et l\'ordonnance du mois dernier — sans oublier la lettre du médecin traitant.';
    const rv = await A.post('/api/agenda', { genre: 'rdv', titre: 'Cardiologue, Dr Lemoine', avec: 'Dr Lemoine, cardiologue', lieu: 'Clinique; bâtiment B', note: NOTE, debut: '2026-10-25T14:00', fin: '2026-10-25T14:30',
      tz: 'Europe/Paris', rappels: [1440, 60, 0] });
    const RV = rv.j.evenement;

    console.log('\n7. L\'export des données, et les lignes d\'avant la migration');
    const ex = await A.post('/api/compte/export', {});
    const ag = ex.code === 200 ? (JSON.parse(ex.txt).agenda || []) : [];
    const x = ag.find(e => e.id === RV.id) || {};
    v('l\'export porte le genre, avec qui et la liste des rappels (ce sont les données de la personne)', [ex.code, x.genre, x.avec, x.rappels_minutes_avant, x.rappel_minutes_avant], [200, 'rdv', 'Dr Lemoine, cardiologue', [1440, 60, 0], 1440]);
    v('   un événement y dit son genre et sa liste d\'un rappel', [(ag.find(e => e.id === r2.j.evenement.id) || {}).genre, (ag.find(e => e.id === r2.j.evenement.id) || {}).rappels_minutes_avant], ['evenement', [15]]);
    /* une ligne écrite AVANT la migration 27 : ni genre, ni avec, ni liste — rien que le rappel seul */
    ecrire('UPDATE evenement SET genre = NULL, avec_ch = NULL, rappels = NULL WHERE id = ?', r3.j.evenement.id);
    const vieux = ((await A.get('/api/agenda?du=' + (maintenant() - 86400000) + '&au=' + (maintenant() + 5 * 86400000))).j.evenements || []).find(e => e.id === r3.j.evenement.id) || {};
    v('une ligne d\'avant : un événement, à son rappel seul (30), personne avec qui', [vieux.genre, vieux.rappels, vieux.rappel, vieux.avec], ['evenement', [30], 30, '']);
    /* ⛔ un retour en arrière du déploiement : le code d'AVANT récrit `rappel` sans connaître `rappels` — revenu au code neuf, la liste ne s'accorde plus avec lui : elle est périmée */
    const fenRv = '?du=' + Date.UTC(2026, 9, 24) + '&au=' + Date.UTC(2026, 9, 27);
    ecrire('UPDATE evenement SET rappel = 15 WHERE id = ?', RV.id);
    v('⛔ le code d\'avant a récrit le rappel (15) d\'un rendez-vous à trois rappels : la liste périmée n\'est plus crue, le rappel seul dit vrai', ((await A.get('/api/agenda' + fenRv)).j.evenements || []).filter(e => e.id === RV.id).map(e => [e.rappels, e.rappel]), [[[15], 15]]);
    ecrire('UPDATE evenement SET rappel = NULL WHERE id = ?', RV.id);
    v('   …ou l\'a retiré : plus aucun rappel (le retiré ne revient pas)', ((await A.get('/api/agenda' + fenRv)).j.evenements || []).filter(e => e.id === RV.id).map(e => e.rappels), [[]]);
    ecrire('UPDATE evenement SET rappels = ? WHERE id = ?', '[]', r2.j.evenement.id);
    v('   une liste VIDE en base, un rappel posé : c\'est le rappel qui dit vrai', ((await A.get('/api/agenda?du=' + (maintenant() - 86400000) + '&au=' + (maintenant() + 5 * 86400000))).j.evenements || []).filter(e => e.id === r2.j.evenement.id).map(e => e.rappels), [[15]]);
    ecrire('UPDATE evenement SET rappels = ? WHERE id = ?', '{abîmé', E.id);
    const abime = await m({});
    v('⛔ une liste abîmée en base se lit comme le rappel seul — jamais une erreur', [abime.code, abime.j.evenement.rappels], [200, [1440]]);

    console.log('\n8. ⛔ Après une RESTAURATION : une échéance d\'avant la restauration est tenue pour traitée (la règle des réunions)');
    {
      const debR1 = dans(3 * 60), debR2 = dans(3 * 60 + 5);
      const R1 = (await A.post('/api/agenda', { genre: 'rdv', titre: 'Restauré avant QXR', debut: debutLocal(debR1), tz: 'UTC', rappels: [1440, 60] })).j.evenement;
      const R2 = (await A.post('/api/agenda', { genre: 'rdv', titre: 'Restauré après QXR', debut: debutLocal(debR2), tz: 'UTC', rappels: [1440, 60] })).j.evenement;
      /* la copie restaurée ramène les échéances de « la veille » : R1 avant l'instant de la restauration (déjà parti avant la panne), R2 après (dû pendant l'arrêt, jamais parti) */
      const t0 = maintenant();
      ecrire("INSERT INTO meta(k, v) VALUES('rappels_depuis', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v", String(t0 - 10 * 60000));
      ecrire('UPDATE evenement SET rappel_a = ? WHERE id = ?', t0 - 20 * 60000, R1.id);
      ecrire('UPDATE evenement SET rappel_a = ? WHERE id = ?', t0 - 5 * 60000, R2.id);
      const de = async (titre) => ((await A.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'agenda_rappel' && n.titre === titre);
      vrai('population : l\'échéance de R2, d\'APRÈS la restauration, est rattrapée (son rappel part)', await T.attendre(async () => (await de('Restauré après QXR')).length === 1, 8000, 100));
      await T.dort(600);
      v('⛔ R1, d\'AVANT la restauration : rien ne part, et l\'échéance passe au rappel SUIVANT (1 h avant)', [(await de('Restauré avant QXR')).length, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', R1.id).rappel_a)], [0, debR1 - 60 * 60000]);
      svc.avancer(2 * 60 * 60000 + 2 * 60000);
      vrai('   …et ce rappel suivant, lui, part à son heure', await T.attendre(async () => (await de('Restauré avant QXR')).length === 1, 8000, 100));
    }
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
