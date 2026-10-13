/* ══ test-1004 — LE RENDEZ-VOUS PERSONNEL : AVEC QUI, PLUSIEURS RAPPELS, ET « AJOUTER À MON CALENDRIER » — LE VRAI SERVICE, L'HORLOGE AVANCÉE AU GESTE ══════════════════════════════
   13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous, comme ça les personnes peuvent gérer leurs rendez-vous personnels avec des rappels et tout » ; puis « ils peuvent aussi
   l'ajouter à leur agenda, comme Apple fait ». Un rendez-vous est un événement de l'agenda personnel (`server-msg/routes-agenda.js`, migration 27) de genre 'rdv'. Ce banc parle au VRAI service :
     · il a TOUJOURS une heure (jamais « toute la journée »), un « avec qui » scellé en base comme le titre, et jusqu'à TROIS rappels (rangés le plus éloigné d'abord) ;
     · ⛔ les rappels partent DANS L'ORDRE, chacun une fois : quand l'un part, l'échéance passe au suivant — calculée par le service, jamais par la page ; le texte dit « avec qui » ;
     · le genre se choisit à la création et ne change pas ; « avec qui » n'appartient qu'au rendez-vous ; `rappel` (un seul, la page d'avant) reste accepté, jamais avec `rappels` ;
     · cocher, décocher, reporter, modifier gardent la liste ; une ligne d'avant la migration (ni genre ni liste) se lit comme un événement à son rappel seul ;
     · « Ajouter à mon calendrier » : `GET /api/agenda/:id/ics` rend un VRAI fichier (RFC 5545 : CRLF, lignes repliées à 75 octets, texte échappé), ses rappels en `VALARM` — « la veille »
       d'un rendez-vous le dimanche du changement d'heure dure 25 heures ; une journée entière s'écrit en DATES ; celui d'un autre n'existe pas (404) ;
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
    const f2 = await A.post('/api/agenda/' + rf.id + '/fait', { fait: false });
    v('décocher : l\'échéance revient au PREMIER rappel encore à venir (1 h avant)', [f2.j.evenement.rappelEnAttente, Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', rf.id).rappel_a)], [true, deb4 - 60 * 60000]);
    const p1 = await A.post('/api/agenda/' + rf.id + '/reporter', { dans: 'demain' });
    v('reporter à demain 9 h : la liste est gardée (en base aussi), avec qui aussi, l\'échéance est 1 h avant le nouvel horaire', [p1.code, p1.j.evenement.rappels, sql('SELECT rappels FROM evenement WHERE id = ?', rf.id).rappels, p1.j.evenement.avec,
      Number(sql('SELECT rappel_a FROM evenement WHERE id = ?', rf.id).rappel_a)], [200, [60, 15], '[60,15]', 'M. Blanc', p1.j.evenement.debut - 60 * 60000]);

    console.log('\n6. « Ajouter à mon calendrier » : le fichier .ics');
    const ics = (c, id) => c.get('/api/agenda/' + id + '/ics');
    /* le dimanche 25 octobre 2026, l'heure d'hiver revient à 3 h : « la veille à la même heure » (samedi 14:00, encore en heure d'été) est 25 heures avant */
    const NOTE = 'Apporter les résultats d\'analyse, la carte vitale et l\'ordonnance du mois dernier — sans oublier la lettre du médecin traitant.';
    const rv = await A.post('/api/agenda', { genre: 'rdv', titre: 'Cardiologue, Dr Lemoine', avec: 'Dr Lemoine, cardiologue', lieu: 'Clinique; bâtiment B', note: NOTE, debut: '2026-10-25T14:00', fin: '2026-10-25T14:30',
      tz: 'Europe/Paris', rappels: [1440, 60, 0] });
    const RV = rv.j.evenement;
    const f = await ics(A, RV.id);
    v('200, un calendrier, en pièce jointe nommée d\'après le rendez-vous, jamais mis en cache', [f.code, (f.h.get('content-type') || '').split(';')[0], f.h.get('content-disposition'), f.h.get('cache-control')],
      [200, 'text/calendar', 'attachment; filename="rendez-vous-cardiologue-dr-lemoine.ics"', 'no-store']);
    const brut = f.txt;
    v('⛔ chaque ligne finit par CRLF (aucun saut de ligne nu), et le fichier aussi', [/(^|[^\r])\n/.test(brut), brut.endsWith('\r\n')], [false, true]);
    const physiques = brut.split('\r\n').filter(Boolean);
    v('⛔ aucune ligne de plus de 75 octets (elles sont REPLIÉES — la note l\'exige)', [physiques.filter(l => Buffer.byteLength(l, 'utf8') > 75).length, physiques.some(l => l.startsWith(' '))], [0, true]);
    const lignes = brut.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
    const val = (k) => (lignes.find(l => l.startsWith(k + ':') || l.startsWith(k + ';')) || '').replace(/^[^:]*:/, '');
    v('l\'enveloppe : un VCALENDAR de version 2.0 qui porte UN événement', [lignes[0], val('VERSION'), lignes.filter(l => l === 'BEGIN:VEVENT').length, lignes[lignes.length - 1]], ['BEGIN:VCALENDAR', '2.0', 1, 'END:VCALENDAR']);
    v('un identifiant STABLE (le même à chaque téléchargement : un second import met à jour, il ne double pas)', [val('UID'), (await ics(A, RV.id)).txt.replace(/\r\n /g, '').split('\r\n').find(l => l.startsWith('UID:'))],
      ['agenda-' + RV.id + '@opmessages.invalid', 'UID:agenda-' + RV.id + '@opmessages.invalid']);
    v('l\'heure en UTC : 14:00 de Paris le 25 octobre (heure d\'hiver) = 13:00 UTC, jusqu\'à 13:30', [val('DTSTART'), val('DTEND')], ['20261025T130000Z', '20261025T133000Z']);
    v('le titre, le lieu : ÉCHAPPÉS (« , » → « \\, », « ; » → « \\; »)', [val('SUMMARY'), val('LOCATION')], ['Cardiologue\\, Dr Lemoine', 'Clinique\\; bâtiment B']);
    const desc = val('DESCRIPTION');
    vrai('« avec qui » et la note sont dans la description (pas dans le titre)', desc.startsWith('Avec : Dr Lemoine\\, cardiologue\\n\\n') && desc.includes('carte vitale') && desc.endsWith('Rendez-vous ajouté depuis OP MESSAGES.'), desc);
    const trig = lignes.filter(l => l.startsWith('TRIGGER:')).map(l => l.slice(8));
    v('⛔ trois rappels → trois VALARM : à l\'heure (PT0S), 1 h avant, et « la veille » = 25 HEURES avant (samedi 14:00, encore en heure d\'été)', trig, ['PT0S', '-PT1H', '-PT25H']);
    v('   chaque alarme s\'affiche et dit le titre', [lignes.filter(l => l === 'ACTION:DISPLAY').length, lignes.filter(l => l === 'DESCRIPTION:Rappel : Cardiologue\\, Dr Lemoine').length], [3, 3]);
    /* une journée entière : des DATES (la fin exclue est le lendemain), « la veille » un jour civil */
    const rj = await A.post('/api/agenda', { titre: 'Réveillon', debut: '2026-12-24', journee: true, tz: 'Europe/Paris', rappel: 1440 });
    const fj = await ics(A, rj.j.evenement.id);
    const lj = fj.txt.replace(/\r\n /g, '').split('\r\n');
    v('une journée entière : DTSTART/DTEND en dates (le 24, fin exclue le 25), « la veille » = -P1D, libre (TRANSPARENT), un fichier « evenement-… », sans « Avec : »',
      [fj.code, lj.find(l => l.startsWith('DTSTART')), lj.find(l => l.startsWith('DTEND')), lj.filter(l => l.startsWith('TRIGGER:')), lj.find(l => l.startsWith('TRANSP')), /filename="evenement-reveillon\.ics"/.test(fj.h.get('content-disposition') || ''), /Avec :/.test(fj.txt)],
      [200, 'DTSTART;VALUE=DATE:20261224', 'DTEND;VALUE=DATE:20261225', ['TRIGGER:-P1D'], 'TRANSP:TRANSPARENT', true, false]);
    const sansR = await ics(A, r4.j.evenement.id);
    v('un rendez-vous sans rappel : aucun VALARM', [sansR.code, /BEGIN:VALARM/.test(sansR.txt)], [200, false]);
    v('⛔ le rendez-vous d\'Alice n\'existe pas pour Bob (404, comme un inconnu) ; un identifiant mal formé : 404', [(await ics(B, RV.id)).code, (await ics(A, 'e_' + '0'.repeat(32))).code, (await ics(A, 'e_pasunid')).code],
      [404, 404, 404]);
    const anon = T.client(svc.base);
    v('⛔ sans session : 401, et rien du rendez-vous dans la réponse', [(await anon.get('/api/agenda/' + RV.id + '/ics')).code, /Lemoine/.test((await anon.get('/api/agenda/' + RV.id + '/ics')).txt)], [401, false]);

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
    ecrire('UPDATE evenement SET rappels = ? WHERE id = ?', '{abîmé', E.id);
    const abime = await m({});
    v('⛔ une liste abîmée en base se lit comme le rappel seul — jamais une erreur', [abime.code, abime.j.evenement.rappels], [200, [1440]]);
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
