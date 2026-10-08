/* ══ test-998 — L'AGENDA PERSONNEL : DES ÉVÉNEMENTS À SOI, AVEC UN RAPPEL — LE VRAI SERVICE, L'HORLOGE AVANCÉE AU GESTE ══════════════════════════════════════════════════
   Le chantier du 6 octobre 2026 qui prépare l'agent « Pro Assistant » (`server-msg/routes-agenda.js`, migration 13). Ce banc parle au VRAI service en HTTP :
     · l'heure est LOCALE et son fuseau dit : le lundi 26 octobre 2026 à 14:00 de Paris est 13:00 UTC (l'heure d'hiver est revenue la veille) ; une journée entière va de minuit à
       minuit dans son fuseau (le dimanche 25 octobre dure 25 heures) ;
     · les refus se disent par leur code (titre vide, heure invalide, fin avant début, fuseau inconnu, rappel invalide, trop long) ;
     · ⛔ L'ÉVÉNEMENT D'UN AUTRE n'existe pas pour moi : le lire, le modifier ou le supprimer répond 404, et la liste ne le montre pas ;
     · ⛔ LE RAPPEL PART UNE FOIS, à l'heure (la notification de la personne), jamais après le début ; un événement modifié recalcule le sien ;
     · supprimé, il est noté au registre des purges (une restauration ne le ramène pas) ; il part dans l'export des données ; titre, lieu et note sont scellés en base.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const MDP = { alice: 'pw-alice-agenda1', bob: 'pw-bob-agenda12', carla: 'pw-carla-agenda1' };
const TITRE = 'Dentiste QXW', LIEU = 'Cabinet du centre QXW', NOTE = 'Apporter la carte QXW';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true }, carla: { pass: MDP.carla, nom: 'Carla Roux', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { reunions: { planificateurMs: 150, bailMs: 2000 } } });
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  try {
    const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob);
    const maintenant = () => Date.now() + (svc.decalage || 0);
    void maintenant;

    console.log('\n1. Créer : l\'heure locale, son fuseau, la journée entière');
    const r1 = await A.post('/api/agenda', { titre: TITRE, lieu: LIEU, note: NOTE, debut: '2026-10-26T14:00', fin: '2026-10-26T14:45', tz: 'Europe/Paris', rappel: 15 });
    v('201, et l\'instant est celui de Paris APRÈS le changement d\'heure : 14:00 → 13:00 UTC, 45 minutes', [r1.code, r1.j.evenement && r1.j.evenement.debut, r1.j.evenement && r1.j.evenement.fin - r1.j.evenement.debut],
      [201, Date.UTC(2026, 9, 26, 13, 0), 45 * 60000]);
    const E = r1.j.evenement;
    v('   il rend ce qu\'on a écrit (titre, lieu, note, rappel, fuseau, pas une journée entière)', [E.titre, E.lieu, E.note, E.rappel, E.tz, E.journee], [TITRE, LIEU, NOTE, 15, 'Europe/Paris', false]);
    const r2 = await A.post('/api/agenda', { titre: 'Vacances', debut: '2026-10-25', journee: true, tz: 'Europe/Paris' });
    v('une journée entière (le 25 octobre, jour du changement d\'heure) : de minuit à minuit À PARIS — 25 heures', [r2.code, r2.j.evenement.debut, r2.j.evenement.fin, r2.j.evenement.fin - r2.j.evenement.debut],
      [201, Date.UTC(2026, 9, 24, 22, 0), Date.UTC(2026, 9, 25, 23, 0), 25 * 3600000]);
    const r3 = await A.post('/api/agenda', { titre: 'Sans fin', debut: '2026-11-02T09:00', tz: 'America/New_York' });
    v('sans fin : une heure ; un autre fuseau (New York, 09:00 → 14:00 UTC)', [r3.code, r3.j.evenement.debut, r3.j.evenement.fin - r3.j.evenement.debut], [201, Date.UTC(2026, 10, 2, 14, 0), 3600000]);

    console.log('\n2. Les refus se disent');
    const refus = [
      [{ debut: '2026-10-26T14:00' }, 'titre_vide'], [{ titre: '   ', debut: '2026-10-26T14:00' }, 'titre_vide'],
      [{ titre: 'x'.repeat(121), debut: '2026-10-26T14:00' }, 'champ_invalide'], [{ titre: 'A', debut: '26/10/2026 14h' }, 'heure_invalide'],
      [{ titre: 'A', debut: '2026-02-30T14:00' }, 'heure_invalide'], [{ titre: 'A', debut: '2026-10-26T14:00', fin: '2026-10-26T13:00' }, 'fin_avant_debut'],
      [{ titre: 'A', debut: '2026-10-26T14:00', tz: 'Mars/Olympus' }, 'fuseau_inconnu'], [{ titre: 'A', debut: '2026-10-26T14:00', rappel: 7 }, 'rappel_invalide'],
      [{ titre: 'A', debut: '2026-10-01T14:00', fin: '2026-12-01T14:00' }, 'evenement_trop_long'], [{ titre: 'A', debut: '2026-10-26T14:00', lieu: 'y'.repeat(301) }, 'champ_invalide'],
      [{ titre: 'A', debut: '2026-10-26T14:00', journee: 'oui' }, 'champ_invalide'],
    ];
    const rep = [];
    for (const [b, code] of refus) { const r = await A.post('/api/agenda', b); rep.push(r.code === 400 && r.j.error === code ? true : r.code + ' ' + (r.j && r.j.error)); }
    v('titre vide ou trop long, heure illisible ou impossible, fin avant début, fuseau inconnu, rappel hors liste, trop long, lieu trop long, « journée » mal typée : 400, chacun SON code', rep, refus.map(() => true));

    console.log('\n3. ⛔ L\'événement d\'un autre n\'existe pas pour moi');
    const fen = '?du=' + Date.UTC(2026, 9, 1) + '&au=' + Date.UTC(2026, 11, 1);
    const la = await A.get('/api/agenda' + fen), lb = await B.get('/api/agenda' + fen);
    v('Alice voit SES trois événements (dans l\'ordre), Bob aucun', [la.code, la.j.evenements.map(e => e.titre), lb.j.evenements.length], [200, ['Vacances', TITRE, 'Sans fin'], 0]);
    v('Bob lit, modifie, supprime celui d\'Alice : 404 les trois fois — et il n\'a pas bougé', [(await B.post('/api/agenda/' + E.id + '/maj', { titre: 'Pris' })).code, (await B.post('/api/agenda/' + E.id + '/supprimer')).code,
      (await A.get('/api/agenda' + fen)).j.evenements.find(e => e.id === E.id).titre], [404, 404, TITRE]);
    v('une fenêtre absente, à l\'envers ou de plus de 92 jours : 400', [(await A.get('/api/agenda')).code, (await A.get('/api/agenda?du=10&au=5')).code, (await A.get('/api/agenda?du=0&au=' + 100 * 86400000)).code], [400, 400, 400]);
    v('⛔ titre, lieu et note sont SCELLÉS en base (aucun en clair)', [sql("SELECT COUNT(*) AS n FROM evenement WHERE CAST(titre_ch AS TEXT) LIKE '%QXW%' OR CAST(lieu_ch AS TEXT) LIKE '%QXW%' OR CAST(note_ch AS TEXT) LIKE '%QXW%'").n,
      sql('SELECT COUNT(*) AS n FROM evenement').n], [0, 3]);

    console.log('\n4. Modifier');
    const m1 = await A.post('/api/agenda/' + E.id + '/maj', { titre: 'Dentiste (déplacé) QXW', debut: '2026-10-27T09:30', fin: '2026-10-27T10:00' });
    v('le titre et l\'horaire changent, le reste est gardé', [m1.code, m1.j.evenement.titre, m1.j.evenement.debut, m1.j.evenement.lieu, m1.j.evenement.rappel], [200, 'Dentiste (déplacé) QXW', Date.UTC(2026, 9, 27, 8, 30), LIEU, 15]);
    const m2 = await A.post('/api/agenda/' + E.id + '/maj', { lieu: null });
    v('« lieu: null » l\'efface', [m2.code, m2.j.evenement.lieu], [200, '']);

    console.log('\n5. ⛔ Le rappel part une fois, à l\'heure');
    const t0 = Date.now();
    const debutLocal = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, '0'); return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
    const bientot = Math.ceil((t0 + 30 * 60000) / 60000) * 60000;   // dans une demi-heure, à la minute
    const rr = await A.post('/api/agenda', { titre: 'Appeler le plombier', debut: debutLocal(bientot), tz: 'UTC', rappel: 15 });
    vrai('population : un événement dans 30 minutes, rappel 15 minutes avant (il attend)', rr.code === 201 && rr.j.evenement.rappelEnAttente === true, rr.j);
    const rappels = async () => ((await A.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'agenda_rappel');
    await T.dort(600);
    v('rien ne part avant l\'échéance', (await rappels()).length, 0);
    svc.avancer(16 * 60000);
    const parti = await T.attendre(async () => (await rappels()).length === 1, 8000, 100);
    vrai('l\'échéance passée : UN rappel arrive à Alice', parti);
    const n = (await rappels())[0];
    v('   il dit le titre et le temps qui reste (« Dans 14 minutes », à la minute près)', [n && n.titre, n && /^Dans 1[3-5] minutes$/.test(n.texte)], ['Appeler le plombier', true], n && n.texte);
    /* ⛔ marqué LU d'abord : un rappel qui repartirait REMPLACE la notification non lue d'avant (même événement) — compter les non lues ne le verrait pas */
    await A.post('/api/notifications/lues', { toutes: true });
    await T.dort(800);
    v('⛔ il ne repart pas aux tours suivants (le rappel lu reste seul, aucun neuf)', [(await rappels()).length, (await rappels()).filter(x => !x.lue).length], [1, 0]);
    v('   Bob n\'a rien reçu', ((await B.get('/api/notifications')).j.notifications || []).filter(x => x.type === 'agenda_rappel').length, 0);
    /* un événement qui a COMMENCÉ pendant un arrêt : son rappel n'est pas envoyé après coup */
    const t1 = Date.now() + 16 * 60000;
    const rr2 = await A.post('/api/agenda', { titre: 'Déjà commencé', debut: debutLocal(Math.ceil((t1 + 20 * 60000) / 60000) * 60000), tz: 'UTC', rappel: 15 });
    vrai('population : un second événement, rappel en attente', rr2.j.evenement.rappelEnAttente === true);
    svc.avancer(60 * 60000);
    await T.attendre(() => Number(sql('SELECT COUNT(*) AS n FROM evenement WHERE id = ? AND rappel_a IS NULL', rr2.j.evenement.id).n) === 1, 8000, 100);
    v('⛔ l\'événement a commencé avant que le service ne passe : son rappel est ABANDONNÉ, pas envoyé', (await rappels()).filter(x => x.titre === 'Déjà commencé').length, 0);
    /* modifier l'horaire recalcule le rappel ; modifier le seul titre ne le relance pas */
    const m3 = await A.post('/api/agenda/' + rr.j.evenement.id + '/maj', { titre: 'Plombier (rappelé)' });
    v('modifier le titre d\'un événement dont le rappel est parti ne le relance pas', m3.j.evenement.rappelEnAttente, false);
    const loin = Math.ceil((Date.now() + 70 * 60000 + 61 * 60000) / 60000) * 60000;
    const m4 = await A.post('/api/agenda/' + rr.j.evenement.id + '/maj', { debut: debutLocal(loin), fin: debutLocal(loin + 1800000) });
    v('modifier son horaire le recalcule (il attend de nouveau)', m4.j.evenement.rappelEnAttente, true);

    console.log('\n6. Supprimer, exporter');
    const ex = await A.post('/api/compte/export', {});
    vrai('l\'export des données d\'Alice porte son agenda (titre, lieu, note en clair : ce sont les siens)', ex.code === 200 && /"agenda":\[/.test(ex.txt) && ex.txt.includes('Dentiste (déplacé) QXW') && ex.txt.includes(NOTE), ex.code);
    const s1 = await A.post('/api/agenda/' + E.id + '/supprimer');
    v('supprimer : 200, puis 404 (déjà parti)', [s1.code, (await A.post('/api/agenda/' + E.id + '/supprimer')).code], [200, 404]);
    v('il est noté au registre des purges (une restauration ne le ramène pas)', Number(sql("SELECT COUNT(*) AS n FROM purge WHERE genre = 'evenement' AND objet = ?", E.id).n), 1);
    v('un identifiant mal formé : 404', (await A.post('/api/agenda/e_pasunid/maj', { titre: 'x' })).code, 404);

    /* ═══ 7. (8 octobre 2026) COCHER, REPORTER, LE MESSAGE D'ORIGINE — « cocher un rappel fait », « voir le message », « reporter » ═══ */
    console.log('\n7. ⛔ Cocher, reporter, et le message d\'où vient un rappel');
    { const l = await A.post('/api/contacts/lien', {}); await B.post('/api/liens/accepter', { code: l.j.code }); }
    const AB = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
    const env = await B.post('/api/conversations/' + AB + '/messages', { cid: 'cid-agenda-' + Date.now().toString(36), texte: 'Rappelle le client QXW demain' });
    const seq = env.j && env.j.seq;
    vrai('population : une directe Alice ↔ Bob, et le message de Bob (son rang)', Number.isSafeInteger(seq) && seq > 0, env.j);
    const bientot2 = Math.ceil((Date.now() + 3 * 3600000) / 60000) * 60000;
    const rs = await A.post('/api/agenda', { titre: 'Rappel : Rappelle le client QXW', debut: debutLocal(bientot2), tz: 'UTC', rappel: 0, source: { conv: AB, seq } });
    v('« Me le rappeler » : l\'événement garde le CHEMIN vers le message (conversation, rang) — pas une copie', [rs.code, rs.j.evenement && rs.j.evenement.source, rs.j.evenement && rs.j.evenement.fait], [201, { conv: AB, seq }, null]);
    const RS = rs.j.evenement;
    /* ⛔ un pointeur ne se pose QUE sur un message qu'on peut lire */
    const C0 = await T.connecter(svc, og, 'carla', MDP.carla);
    const autre = await C0.post('/api/agenda', { titre: 'Espion', debut: debutLocal(bientot2), tz: 'UTC', source: { conv: AB, seq } });
    v('⛔ Carla, qui n\'est pas de la conversation, ne peut pas y pointer (400 source_invalide) — même réponse qu\'un message qui n\'existe pas', [autre.code, autre.j.error, (await A.post('/api/agenda', { titre: 'x', debut: debutLocal(bientot2), tz: 'UTC', source: { conv: AB, seq: seq + 999 } })).j.error],
      [400, 'source_invalide', 'source_invalide']);
    v('   une source mal formée : 400', [(await A.post('/api/agenda', { titre: 'x', debut: debutLocal(bientot2), tz: 'UTC', source: { conv: 'c_x', seq: 1 } })).code, (await A.post('/api/agenda', { titre: 'x', debut: debutLocal(bientot2), tz: 'UTC', source: 'AB' })).code], [400, 400]);
    v('⛔ la source ne s\'écrit JAMAIS par « maj » (posée à la création seulement)', (await A.post('/api/agenda/' + RS.id + '/maj', { titre: 'Rappel : renommé', source: { conv: AB, seq: 1 } })).j.evenement.source, { conv: AB, seq });
    /* cocher */
    const f1 = await A.post('/api/agenda/' + RS.id + '/fait', { fait: true });
    v('cocher : fait (l\'instant), et il ne sonnera plus (plus d\'échéance en attente)', [f1.code, typeof f1.j.evenement.fait, f1.j.evenement.rappelEnAttente], [200, 'number', false]);
    v('   noté en base (`fait`), l\'échéance effacée', [Number(sql('SELECT fait IS NOT NULL AS f FROM evenement WHERE id = ?', RS.id).f), sql('SELECT rappel_a FROM evenement WHERE id = ?', RS.id).rappel_a], [1, null]);
    const f2 = await A.post('/api/agenda/' + RS.id + '/fait', { fait: false });
    v('décocher : à faire, et son rappel (à l\'heure, dans 3 h) se repose', [f2.j.evenement.fait, f2.j.evenement.rappelEnAttente], [null, true]);
    v('⛔ cocher celui d\'un autre : 404 ; un corps sans booléen : 400', [(await B.post('/api/agenda/' + RS.id + '/fait', { fait: true })).code, (await A.post('/api/agenda/' + RS.id + '/fait', { fait: 'oui' })).code], [404, 400]);
    /* reporter */
    await A.post('/api/agenda/' + RS.id + '/fait', { fait: true });
    const t2 = Date.now() + 16 * 60000 + 60 * 60000;          // l'horloge du SERVICE : la section 5 l'a avancée de 16 puis de 60 minutes
    const p1 = await A.post('/api/agenda/' + RS.id + '/reporter', { dans: 10 });
    const d1 = p1.j.evenement.debut - t2;
    v('reporter de 10 min : l\'heure est CALCULÉE par le service (dans 10 à 11 min, à la minute), la durée gardée, décoché, et il sonnera', [p1.code, d1 >= 10 * 60000 && d1 <= 11 * 60000 + 2000, p1.j.evenement.debut % 60000, p1.j.evenement.fin - p1.j.evenement.debut, p1.j.evenement.fait, p1.j.evenement.rappelEnAttente],
      [200, true, 0, RS.fin - RS.debut, null, true]);
    const p2 = await A.post('/api/agenda/' + RS.id + '/reporter', { dans: 'demain' });
    const loc = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(p2.j.evenement.debut);
    v('reporter à demain : 9 h dans SON fuseau (UTC ici), le jour suivant', [p2.code, loc, Math.round((p2.j.evenement.debut - t2) / 86400000) <= 1 && p2.j.evenement.debut > t2], [200, '09:00', true]);
    const sansRappel = (await A.post('/api/agenda', { titre: 'Sans rappel', debut: debutLocal(bientot2), tz: 'UTC' })).j.evenement;
    v('   un événement SANS rappel en reçoit un « à l\'heure » quand on le reporte (on reporte pour qu\'il sonne)', [(await A.post('/api/agenda/' + sansRappel.id + '/reporter', { dans: 60 })).j.evenement.rappel], [0]);
    const jour = (await A.post('/api/agenda', { titre: 'Journée', debut: '2026-12-01', journee: true, tz: 'UTC' })).j.evenement;
    v('   une journée entière ne se reporte que d\'un jour (10 min : 400 ; demain : 200, toujours une journée)', [(await A.post('/api/agenda/' + jour.id + '/reporter', { dans: 10 })).code, (await A.post('/api/agenda/' + jour.id + '/reporter', { dans: 'demain' })).j.evenement.journee],
      [400, true]);
    v('⛔ des valeurs hors liste : 400 (« 5 », « lundi », un nombre en texte) ; celui d\'un autre : 404', [(await A.post('/api/agenda/' + RS.id + '/reporter', { dans: 5 })).code, (await A.post('/api/agenda/' + RS.id + '/reporter', { dans: 'lundi' })).code,
      (await A.post('/api/agenda/' + RS.id + '/reporter', { dans: '10' })).code, (await B.post('/api/agenda/' + RS.id + '/reporter', { dans: 10 })).code], [400, 400, 400, 404]);
    /* la notification d'un rappel ouvre SA fiche : l'adresse porte l'identifiant de l'événement */
    v('   la liste rend la source et l\'état « fait » (ce que la page lit)', ((await A.get('/api/agenda?du=' + (t2 - 86400000) + '&au=' + (t2 + 5 * 86400000))).j.evenements || []).filter(x => x.id === RS.id).map(x => [x.source && x.source.seq, x.fait]), [[seq, null]]);

    /* ═══ 8. (8 octobre 2026) L'AGENDA PERSO ET L'AGENDA PRO — « il faudrait bien séparer l'agenda perso et pro » (migration 25, `evenement.cote`) ═══ */
    console.log('\n8. ⛔ L\'agenda Perso et l\'agenda Pro : chaque événement dit de quel côté il est');
    const jourC = '2026-11-20', fenC = '?du=' + Date.UTC(2026, 10, 19) + '&au=' + Date.UTC(2026, 10, 22);
    const cPro = await A.post('/api/agenda', { titre: 'Revue client', debut: jourC + 'T10:00', tz: 'Europe/Paris', cote: 'pro' });
    const cPerso = await A.post('/api/agenda', { titre: 'Piscine', debut: jourC + 'T18:00', tz: 'Europe/Paris', cote: 'perso' });
    const cSans = await A.post('/api/agenda', { titre: 'Sans côté', debut: jourC + 'T12:00', tz: 'Europe/Paris' });
    v('créé du côté où l\'on est : Pro, Perso ; ⛔ sans côté, rien n\'est inventé (null : la page le déduit)', [cPro.code, cPro.j.evenement.cote, cPerso.code, cPerso.j.evenement.cote, cSans.code, cSans.j.evenement.cote],
      [201, 'pro', 201, 'perso', 201, null]);
    const refusC = [];
    for (const c of ['travail', 'Pro', '', true, 1, ['pro'], { pro: 1 }]) { const r = await A.post('/api/agenda', { titre: 'Refusé', debut: jourC + 'T09:00', tz: 'Europe/Paris', cote: c }); refusC.push(r.code + ' ' + (r.j && r.j.error)); }
    v('⛔ un côté hors de « perso » | « pro » : 400 champ_invalide (« travail », une majuscule, vide, un booléen, un nombre, une liste, un objet)', refusC, Array(7).fill('400 champ_invalide'));
    const cotes = async () => Object.fromEntries(((await A.get('/api/agenda' + fenC)).j.evenements || []).map(e => [e.titre, e.cote]));
    v('la liste rend le côté de chacun, dans l\'ordre des heures (et aucun refusé n\'a été créé)', await cotes(), { 'Revue client': 'pro', 'Sans côté': null, 'Piscine': 'perso' });
    const mC1 = await A.post('/api/agenda/' + cPro.j.evenement.id + '/maj', { cote: 'perso' });
    v('le changer de côté : 200, Perso — le reste ne bouge pas (titre, heure)', [mC1.code, mC1.j.evenement.cote, mC1.j.evenement.titre, mC1.j.evenement.debut], [200, 'perso', 'Revue client', cPro.j.evenement.debut]);
    const mC2 = await A.post('/api/agenda/' + cPro.j.evenement.id + '/maj', { titre: 'Revue client (déplacée)' });
    v('⛔ une modification SANS côté le garde (Perso)', [mC2.code, mC2.j.evenement.cote], [200, 'perso']);
    const mC3 = await A.post('/api/agenda/' + cPro.j.evenement.id + '/maj', { cote: 'travail' });
    v('⛔ un côté invalide à la modification : 400, et rien n\'a bougé', [mC3.code, mC3.j.error, (await cotes())['Revue client (déplacée)']], [400, 'champ_invalide', 'perso']);
    const mC4 = await A.post('/api/agenda/' + cPro.j.evenement.id + '/maj', { cote: null });
    v('« cote: null » rend le côté déduit (null)', [mC4.code, mC4.j.evenement.cote], [200, null]);
    v('⛔ Bob ne range pas l\'événement d\'Alice (404), et rien n\'a bougé', [(await B.post('/api/agenda/' + cPerso.j.evenement.id + '/maj', { cote: 'pro' })).code, (await cotes()).Piscine], [404, 'perso']);
    const colC = (e) => sql('SELECT cote FROM evenement WHERE id = ?', e.j.evenement.id).cote;
    v('la base : la colonne `cote` porte le côté posé, NULL ailleurs (jamais une valeur inventée)', [colC(cPerso), colC(cSans), colC(cPro)], ['perso', null, null]);
    const cSrc = await A.post('/api/agenda', { titre: 'Rappel rangé Pro', debut: jourC + 'T15:00', tz: 'Europe/Paris', source: { conv: AB, seq }, cote: 'pro' });
    v('« Me le rappeler » : le côté de la conversation d\'origine voyage avec la source (la page l\'envoie)', [cSrc.code, cSrc.j.evenement.cote, cSrc.j.evenement.source && cSrc.j.evenement.source.seq], [201, 'pro', seq]);
    /* l'export : UN par jour et par personne (Alice a eu le sien en section 6) — c'est Bob qui exporte ici */
    await B.post('/api/agenda', { titre: 'Bob Pro', debut: jourC + 'T08:00', tz: 'Europe/Paris', cote: 'pro' }); await B.post('/api/agenda', { titre: 'Bob Perso', debut: jourC + 'T20:00', tz: 'Europe/Paris', cote: 'perso' });
    const ex2 = await B.post('/api/compte/export', {});
    const ag2 = ex2.code === 200 ? (JSON.parse(ex2.txt).agenda || []).map(e => [e.titre, e.cote]) : ex2.code;
    v('l\'export porte le côté de chaque événement (c\'est une donnée de la personne)', ag2, [['Bob Pro', 'pro'], ['Bob Perso', 'perso']]);
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
