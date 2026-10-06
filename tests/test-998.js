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

const MDP = { alice: 'pw-alice-agenda1', bob: 'pw-bob-agenda12' };
const TITRE = 'Dentiste QXW', LIEU = 'Cabinet du centre QXW', NOTE = 'Apporter la carte QXW';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true } });
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
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
