/* ══ test-1006 — LE TRAJET D'UNE RÉUNION : CHACUN LE SIEN — LE VRAI SERVICE CONTRE UN FAUX IGN (aucun octet ne sort sur Internet) ═══════════════════════════════════════════════════
   14 octobre 2026, le lot 2 du trajet : « et pareil pour pro, pour les réunions ou rendez-vous » (Justin, sur la fiche « Nouveau rendez-vous » ; puis « Réunions + Rendez-vous Pro »). Le lot 1
   (`test-1005`) a donné son heure de départ à un rendez-vous ; ici, CHAQUE participant d'une réunion range la sienne (`reunion_invite.trajet_ch`, migration 29) :
     · le texte du départ n'existe qu'UNE fois (`texteDepart`, `trajet.js`) — un rendez-vous et une réunion le disent pareil, en retard aussi ;
     · (le fichier .ics d'une réunion est parti le 16 octobre 2026 : plus de fichier, donc plus d'alarme ni de trajet à y mettre) ;
     · la route (`POST /api/reunions/:id/trajet`) : un participant, pour lui ; ⛔ le lieu VERS LEQUEL le trajet a été calculé doit être celui de la réunion (`lieu_change`), une réunion sans
       lieu ou annulée n'en reçoit pas, le retirer se peut toujours ; soixante écritures par heure ;
     · ⛔ PERSONNE D'AUTRE NE LE LIT : ni l'organisateur, ni un autre invité, ni la liste des invités, ni l'agenda d'un autre — et il est SCELLÉ en base ;
     · le planificateur : « Il est temps de partir » à l'heure de partir de CHACUN, à chaque date d'une série ; en retard, il le dit ; à la minute d'un rappel, UNE notification ; un trajet posé
       après son heure ne sonne pas après coup (plancher `trajet_le`), un départ plus tardif sonne ; refusé, plus rien ;
     · ⛔ l'organisateur change le lieu : le trajet ne compte plus (la fiche le dit, avec les réglages d'avant), et ceux dont le trajet menait à l'ANCIEN lieu sont prévenus — même quand
       l'organisateur ne prévient personne ; le lieu revient : le trajet revaut ;
     · l'export le porte (périmé, il le dit) ; l'effacement du compte l'emporte ; ⛔ retiré ou remplacé, il ne revient pas avec une sauvegarde d'avant (le registre des purges, rejoué hors ligne) ;
     · une base d'avant la migration 29 la reçoit sans rien perdre ;
     · ⛔ le journal du service ne dit aucun lieu.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { fauxIgn } = require('./outils-trajet');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { texteDepart, avantDepart } = require(path.join(T.SERVICE, 'trajet.js'));
const { ouvrir: ouvrirBase, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const MIN = 60000, HEURE = 3600000, JOUR = 24 * HEURE;
const MDP = { alice: 'pw-alice-reutrj1', bob: 'pw-bob-reutrj01', claire: 'pw-claire-reutrj', dora: 'pw-dora-reutrj01', eve: 'pw-eve-reutrj001' };
const TJ = (o) => Object.assign({ minutes: 40, km: 31.2, mode: 'voiture', avance: 10, depart: 'domicile', depart_label: 'Domicile', vers_label: 'Clinique du Parc 69006 Lyon' }, o || {});
const hmUtc = (ms) => new Date(ms).toISOString().slice(11, 16);

(async () => {
  /* ══ 0. LE TEXTE DU DÉPART, UNE SEULE FOIS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n0. Le texte du départ (`texteDepart`), le même pour un rendez-vous et une réunion');
  const deb0 = Date.UTC(2026, 9, 26, 14, 0), ech0 = deb0 - avantDepart(TJ()) * MIN;
  v('à l\'heure de partir : la durée, le mode, l\'heure d\'arrivée voulue', texteDepart(TJ(), deb0, ech0, ech0, hmUtc), 'Il est temps de partir · 40 min en voiture, arrivée 13:50');
  v('   sans avance : « pour » l\'heure du début ; à pied : « à pied »', [texteDepart(TJ({ avance: 0 }), deb0, deb0 - 40 * MIN, deb0 - 40 * MIN, hmUtc), texteDepart(TJ({ mode: 'pied', minutes: 12, avance: 5 }), deb0, deb0 - 17 * MIN, deb0 - 17 * MIN, hmUtc)],
    ['Il est temps de partir · 40 min en voiture, pour 14:00', 'Il est temps de partir · 12 min à pied, arrivée 13:55']);
  v('   deux minutes de retard tout juste : encore « il est temps »', texteDepart(TJ(), deb0, ech0, ech0 + 2 * MIN, hmUtc), 'Il est temps de partir · 40 min en voiture, arrivée 13:50');
  v('⛔ au-delà de deux minutes : l\'heure qu\'il était, et l\'arrivée en partant MAINTENANT', texteDepart(TJ(), deb0, ech0, ech0 + 6 * MIN, hmUtc),
    'Il fallait partir à 13:10 · 40 min en voiture — en partant maintenant, arrivée vers 13:56');

  /* ══ LE SERVICE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true }, claire: { pass: MDP.claire, nom: 'Claire Roy', actif: true },
    dora: { pass: MDP.dora, nom: 'Dora Lenoir', actif: true }, eve: { pass: MDP.eve, nom: 'Eve Blanc', actif: true } });
  const ign = await fauxIgn();
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: { delaiMs: 800 } }, env: { OPMSG_TEST_TRAJET: ign.url.replace('http://', '') } });
  let avance = 0; const avancer0 = svc.avancer.bind(svc); svc.avancer = (ms) => { avance += ms; avancer0(ms); };
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  const tout = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).all(...a); } finally { d.close(); } };
  const octets = (b) => b instanceof Uint8Array || typeof b === 'string' ? Buffer.from(b) : null;
  const enClair = (req, mots, ...a) => tout(req, ...a).some(r => Object.values(r).some(b => { const o = octets(b); return !!o && mots.some(m => o.includes(m)); }));
  const p2 = (n) => String(n).padStart(2, '0');
  const local = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
  const maintenant = () => Date.now() + avance;
  const dans = (min) => Math.ceil((maintenant() + min * MIN) / MIN) * MIN;
  const CP = ign.CARNET.find(c => c.label === 'Clinique du Parc 69006 Lyon');
  try {
    const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob), C = await T.connecter(svc, og, 'claire', MDP.claire);
    const D = await T.connecter(svc, og, 'dora', MDP.dora), E = await T.connecter(svc, og, 'eve', MDP.eve);
    for (const P of [A, B, C, D, E]) { const r = await P.post('/api/moi/maj', { tz: 'UTC' }); if (r.code !== 200) throw new Error('fuseau : ' + r.code); }
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); const r = await y.post('/api/liens/accepter', { code: l.j.code }); if (r.code !== 200) throw new Error('lien refusé : ' + r.code); };
    await relier(A, B); await relier(A, C); await relier(A, D); await relier(A, E);
    const prog = async (titre, debut, o) => {
      const r = await A.post('/api/reunions', Object.assign({ titre, lieu: 'Clinique du Parc', debut: local(debut), fin: local(debut + HEURE), tz: 'UTC', invites: [B.moi.id, C.moi.id], rappels: [15], notifier: false }, o || {}));
      if (r.code !== 201) throw new Error(titre + ' : ' + r.code + ' ' + r.txt);
      return r.j.reunion.id;
    };
    const fiche = async (P, id) => (await P.get('/api/reunions/' + id)).j;
    const poser = (P, id, trajet, lieu) => P.post('/api/reunions/' + id + '/trajet', trajet === null ? { trajet: null } : { trajet, lieu: lieu === undefined ? 'Clinique du Parc' : lieu });
    const notifs = async (P, titre, type) => ((await P.get('/api/notifications')).j.notifications || []).filter(x => x.type === (type || 'reunion_rappel') && x.titre === titre);
    const lues = async () => { for (const P of [A, B, C]) await P.post('/api/notifications/lues', { toutes: true }); };
    const registre = (id, uid) => tout('SELECT occurrence, avant FROM rappel WHERE reunion = ? AND uid = ? ORDER BY occurrence, avant', id, uid).map(r => [Number(r.occurrence), Number(r.avant)]);

    console.log('\n1. La fiche : mon trajet, à moi seul');
    const M1 = await prog('Point QXR', dans(3 * 24 * 60));
    let fb = await fiche(B, M1);
    v('population : Bob est invité, la réunion a un lieu — et pas encore de trajet', [fb.reunion.lieu, fb.moi.trajet, fb.moi.trajet_perime], ['Clinique du Parc', null, null]);
    /* le chemin de la page : le service calcule VERS le lieu de la réunion (chez le faux IGN), puis la page range ce qu'il a calculé */
    const calc = await B.post('/api/trajet', { vers: fb.reunion.lieu, depuis: { type: 'position', lon: 2.2384627, lat: 48.8920334 }, mode: 'voiture' });
    vrai('population : le calcul aboutit (un vrai trajet, vers la clinique trouvée)', calc.code === 200 && calc.j.minutes > 10 && calc.j.vers.label === CP.label, calc.j);
    const tB = { minutes: calc.j.minutes, km: calc.j.km, mode: 'voiture', avance: 5, depart: 'position', depart_label: calc.j.depuis.label, vers_label: calc.j.vers.label };
    const avantPose = maintenant();
    const p1 = await poser(B, M1, tB, fb.reunion.lieu);
    v('200 : la fiche rendue porte MON trajet, tel quel', [p1.code, p1.j.moi && p1.j.moi.trajet, p1.j.moi && p1.j.moi.trajet_perime], [200, tB, null]);
    v('   relue, la fiche le garde', (await fiche(B, M1)).moi.trajet, tB);
    const fa = await A.get('/api/reunions/' + M1), fc = await C.get('/api/reunions/' + M1);
    v('⛔ l\'ORGANISATRICE ne le voit pas : son trajet à elle est vide, et rien de celui de Bob dans sa fiche (ni le lieu trouvé, ni « Ma position », ni les km)',
      [fa.j.moi.trajet, fa.txt.includes(CP.label), fa.txt.includes('Ma position'), fa.txt.includes(String(tB.km))], [null, false, false, false]);
    v('⛔ un autre invité non plus', [fc.j.moi.trajet, fc.txt.includes(CP.label), fc.txt.includes('Ma position')], [null, false, false]);
    v('⛔ la liste des invités ne porte aucun trajet (ni chez l\'organisatrice, ni chez Bob)', [fa.j.invites.map(x => Object.keys(x).sort().join(',')).filter(k => /trajet/.test(k)).length, p1.j.invites.some(x => 'trajet' in x)], [0, false]);
    const fen = '/api/reunions?du=' + (maintenant() - HEURE) + '&au=' + (maintenant() + 5 * JOUR);
    const ag = async (P) => { const r = await P.get(fen); return { r, x: (r.j.reunions || []).find(y => y.id === M1) }; };
    const agB = await ag(B), agA = await ag(A), agC = await ag(C);
    v('l\'agenda de Bob le porte (« Partir à … ») ; celui de l\'organisatrice et de Claire, non — et rien de celui de Bob dans leur réponse',
      [agB.x.moi.trajet, agA.x.moi.trajet, agC.x.moi.trajet, agA.r.txt.includes(CP.label), agC.r.txt.includes(CP.label)], [tB, null, null, false, false]);
    const com = await B.get('/api/personnes/' + A.moi.id + '/commun'), comM1 = (com.j.reunions || []).find(x => x.id === M1);
    v('⛔ la fiche de l\'organisatrice chez Bob (« en commun ») : la réunion y est, SANS le trajet de Bob — ni l\'adresse trouvée, ni « Ma position » (relecture du gardien)',
      [com.code, !!comM1, comM1 && 'trajet' in comM1.moi, com.txt.includes(CP.label), com.txt.includes('Ma position')], [200, true, false, false, false]);
    const flux = async (P) => { const r = await P.get('/api/sync?depuis=0'); return { r, m1: (r.j.evenements || []).filter(e => JSON.stringify(e).includes(M1)).length }; };
    const fxA = await flux(A), fxB = await flux(B), fxC = await flux(C);
    v('⛔ le flux (depuis le début) de l\'organisatrice, de Claire et de Bob lui-même : la réunion y passe, son trajet jamais — ni l\'adresse trouvée, ni « Ma position », ni les km (relecture du gardien)',
      [[fxA, fxB, fxC].map(x => x.r.code), [fxA, fxB, fxC].every(x => x.m1 > 0), [fxA, fxB, fxC].some(x => x.r.txt.includes(CP.label) || x.r.txt.includes('Ma position') || x.r.txt.includes('"km"'))],
      [[200, 200, 200], true, false]);
    const ligneB = sql('SELECT trajet_ch, trajet_le FROM reunion_invite WHERE reunion = ? AND uid = ?', M1, B.moi.id);
    v('⛔ en base : SCELLÉ (ni le lieu trouvé, ni d\'où l\'on part, ni le mode, ni les km en clair) ; posé à l\'heure du SERVICE', [!!ligneB.trajet_ch,
      enClair('SELECT trajet_ch FROM reunion_invite WHERE reunion = ?', ['Clinique', 'Ma position', 'voiture', String(tB.km)], M1), Number(ligneB.trajet_le) >= avantPose && Number(ligneB.trajet_le) <= maintenant() + 1000],
      [true, false, true]);
    v('   les autres lignes d\'invitation n\'ont rien', tout('SELECT uid FROM reunion_invite WHERE reunion = ? AND trajet_ch IS NOT NULL', M1).map(r => r.uid), [B.moi.id]);

    console.log('\n2. Les refus');
    v('sans `trajet` : 400 champ_invalide', [(await B.post('/api/reunions/' + M1 + '/trajet', {})).code, (await B.post('/api/reunions/' + M1 + '/trajet', {})).j.error], [400, 'champ_invalide']);
    const mauvais = [[], 'oui', 12, TJ({ minutes: 0 }), TJ({ minutes: 1441 }), TJ({ km: -1 }), TJ({ mode: 'velo' }), TJ({ avance: 7 }), TJ({ depart: 'bureau' }), TJ({ vers_label: '' })];
    const rm = []; for (const m of mauvais) rm.push((await poser(B, M1, m)).j.error);
    v('un trajet de forme fausse : 400 trajet_invalide (chacune)', rm, mauvais.map(() => 'trajet_invalide'));
    v('un trajet sans le lieu vers lequel il a été calculé : 400 champ_invalide', [(await B.post('/api/reunions/' + M1 + '/trajet', { trajet: TJ() })).j.error, (await B.post('/api/reunions/' + M1 + '/trajet', { trajet: TJ(), lieu: 12 })).j.error],
      ['champ_invalide', 'champ_invalide']);
    const lc = await poser(B, M1, TJ(), 'Tour Eiffel');
    v('⛔ calculé vers un AUTRE lieu que celui de la réunion : 409 lieu_change — et rien n\'est écrit', [lc.code, lc.j.error, (await fiche(B, M1)).moi.trajet], [409, 'lieu_change', tB]);
    v('   le lieu écrit avec d\'autres espaces est le même lieu', (await poser(B, M1, tB, '  Clinique   du Parc ')).code, 200);
    const nd = await poser(D, M1, TJ());
    v('⛔ quelqu\'un qui n\'est pas invité : 404 introuvable — la même réponse qu\'une réunion qui n\'existe pas', [nd.code, nd.j.error, (await poser(D, 'r_' + 'f'.repeat(32), TJ())).code], [404, 'introuvable', 404]);
    const M2 = await prog('Visio QXR', dans(3 * 24 * 60), { lieu: '' });
    v('une réunion SANS lieu : 400 trajet_invalide (un trajet ne mène nulle part)', [(await poser(B, M2, TJ(), '')).code, (await poser(B, M2, TJ(), '')).j.error], [400, 'trajet_invalide']);
    const M3 = await prog('Annulée QXR', dans(3 * 24 * 60));
    await poser(B, M3, TJ());
    await A.post('/api/reunions/' + M3 + '/annuler', { notifier: false });
    const an = await poser(B, M3, TJ());
    v('une réunion ANNULÉE : 409 reunion_annulee — et le retirer se peut toujours', [an.code, an.j.error, (await poser(B, M3, null)).code, sql('SELECT trajet_ch FROM reunion_invite WHERE reunion = ? AND uid = ?', M3, B.moi.id).trajet_ch], [409, 'reunion_annulee', 200, null]);
    const ret = await poser(B, M1, null);
    v('retirer (null) : la fiche n\'a plus de trajet, la ligne non plus', [ret.code, ret.j.moi.trajet, sql('SELECT trajet_ch, trajet_le FROM reunion_invite WHERE reunion = ? AND uid = ?', M1, B.moi.id)], [200, null, { trajet_ch: null, trajet_le: null }]);
    await poser(B, M1, tB);
    const M4q = await prog('Quota QXR', dans(3 * 24 * 60), { invites: [E.moi.id] });
    let ok = 0, refus = null;
    for (let i = 0; i < 70 && !refus; i++) { const r = await poser(E, M4q, TJ({ minutes: 20 + (i % 30) })); if (r.code === 200) ok++; else refus = [r.code, r.j.error]; }
    v('soixante écritures par heure et par personne, puis 429 quota_atteint', [ok, refus], [60, [429, 'quota_atteint']]);
    const rq = await poser(E, M4q, null);
    v('⛔ au plafond, RETIRER passe encore (son adresse s\'efface quand elle veut — relecture du gardien) ; poser, non', [rq.code, rq.j.moi && rq.j.moi.trajet, (await poser(E, M4q, TJ())).code], [200, null, 429]);
    const compte = () => [Number(sql('SELECT COUNT(*) AS n FROM journal').n), Number(sql('SELECT COUNT(*) AS n FROM purge').n)];
    const avantRien = compte(), rien = await poser(E, M4q, null);
    v('   retirer quand il n\'y a RIEN : 200, et rien ne s\'écrit (ni le journal, ni le registre des purges) — le retrait ne peut pas boucler plus que les poses', [rien.code, compte()], [200, avantRien]);

    console.log('\n3. L\'heure de PARTIR, pour chacun la sienne');
    await lues();
    const deb4 = dans(120);
    const M4 = await prog('Comité QXR', deb4);
    await poser(B, M4, TJ());
    await T.dort(500);
    v('rien ne part avant l\'heure de partir', [(await notifs(B, 'Comité QXR')).length, (await notifs(C, 'Comité QXR')).length, (await notifs(A, 'Comité QXR')).length], [0, 0, 0]);
    svc.avancer(71 * MIN);
    vrai('l\'heure de partir de BOB arrive (le début, moins 40 min de trajet, moins 10 d\'avance) : sa notification', await T.attendre(async () => (await notifs(B, 'Comité QXR')).length === 1, 8000, 100));
    v('   « Il est temps de partir » : la durée, le mode, l\'heure d\'arrivée qu\'il veut', (await notifs(B, 'Comité QXR'))[0].texte, 'Il est temps de partir · 40 min en voiture, arrivée ' + hmUtc(deb4 - 10 * MIN));
    await T.dort(500);
    v('⛔ ni l\'organisatrice ni Claire (pas de trajet) ne reçoivent rien à cette heure-là', [(await notifs(A, 'Comité QXR')).length, (await notifs(C, 'Comité QXR')).length], [0, 0]);
    v('   au registre : la clé du départ est NÉGATIVE (-50), celle d\'un rappel ne l\'est jamais', registre(M4, B.moi.id), [[deb4, -50]]);
    await lues();
    svc.avancer(35 * MIN);
    vrai('15 min avant : le rappel ordinaire, pour les trois', await T.attendre(async () => (await notifs(B, 'Comité QXR')).length === 2 && (await notifs(C, 'Comité QXR')).length === 1 && (await notifs(A, 'Comité QXR')).length === 1, 8000, 100));
    const rB = (await notifs(B, 'Comité QXR')).find(x => !x.lue);
    vrai('   « Commence dans 1x minutes » chez Bob aussi (son départ ne remplace pas ses rappels)', rB && /^Commence dans 1[2-5] minutes/.test(rB.texte), rB && rB.texte);
    v('   et rien de plus', [(await notifs(B, 'Comité QXR')).length, registre(M4, B.moi.id)], [2, [[deb4, -50], [deb4, 15]]]);
    await lues();

    console.log('\n4. Un départ de PLUS d\'une heure (la réunion est encore « lointaine ») sonne aussi');
    const deb4b = dans(180);
    const M4b = await prog('Lointain QXR', deb4b, { rappels: [] });
    await poser(B, M4b, TJ({ minutes: 85, avance: 5 }));
    svc.avancer(91 * MIN);
    vrai('   90 min avant : le départ', await T.attendre(async () => (await notifs(B, 'Lointain QXR')).length === 1, 8000, 100));
    v('   son texte', (await notifs(B, 'Lointain QXR'))[0].texte, 'Il est temps de partir · 85 min en voiture, arrivée ' + hmUtc(deb4b - 5 * MIN));
    await lues();

    console.log('\n5. En retard, il le dit');
    const deb5 = dans(60);
    const M5 = await prog('Retard QXR', deb5, { rappels: [] });
    await poser(B, M5, TJ({ minutes: 20, avance: 10 }));
    svc.avancer(36 * MIN);                                                                   // le service est resté arrêté jusqu'à six minutes APRÈS l'heure de partir
    const tRetard = maintenant();
    vrai('   le départ sonne EN RETARD', await T.attendre(async () => (await notifs(B, 'Retard QXR')).length === 1, 8000, 100));
    const tVu = maintenant(), nr = (await notifs(B, 'Retard QXR'))[0];
    const mr = /^Il fallait partir à (\d\d:\d\d) · 20 min en voiture — en partant maintenant, arrivée vers (\d\d:\d\d)$/.exec((nr && nr.texte) || '');
    v('⛔ « Il fallait partir à … — en partant maintenant, arrivée vers … »', [!!mr, mr && mr[1], !!mr && [hmUtc(tRetard + 20 * MIN), hmUtc(tVu + 20 * MIN)].includes(mr[2])], [true, hmUtc(deb5 - 30 * MIN), true], nr && nr.texte);
    await lues();

    console.log('\n6. Le départ et un rappel à la même minute : une notification');
    const deb6 = dans(60);
    const M6 = await prog('Même minute QXR', deb6);
    await poser(B, M6, TJ({ minutes: 10, avance: 5, mode: 'pied', depart: 'position', depart_label: 'Ma position' }));
    svc.avancer(46 * MIN);
    vrai('⛔ UNE notification part chez Bob — et c\'est le départ qu\'elle dit', await T.attendre(async () => (await notifs(B, 'Même minute QXR')).length === 1, 8000, 100));
    v('   « Il est temps de partir · 10 min à pied, arrivée … »', (await notifs(B, 'Même minute QXR'))[0].texte, 'Il est temps de partir · 10 min à pied, arrivée ' + hmUtc(deb6 - 5 * MIN));
    await T.dort(600);
    v('   et rien d\'autre ; les deux clés sont notées (le rappel ne repartira pas)', [(await notifs(B, 'Même minute QXR')).length, registre(M6, B.moi.id)], [1, [[deb6, -15], [deb6, 15]]]);
    vrai('   Claire, elle, a son rappel ordinaire', await T.attendre(async () => (await notifs(C, 'Même minute QXR')).length === 1 && /^Commence dans/.test((await notifs(C, 'Même minute QXR'))[0].texte), 8000, 100));
    await lues();

    console.log('\n7. Un trajet posé APRÈS son heure ne sonne pas ; un départ plus tardif, si');
    const deb7 = dans(60);
    const M7 = await prog('Tardif QXR', deb7, { rappels: [] });
    svc.avancer(35 * MIN);                                                                   // la réunion commence dans 25 minutes
    await poser(B, M7, TJ({ minutes: 30, avance: 0 }));
    await T.dort(900);
    v('⛔ trente minutes de trajet, posé vingt-cinq minutes avant : l\'heure de partir est déjà passée QUAND il est posé — rien ne sonne après coup (plancher `trajet_le`)', [(await notifs(B, 'Tardif QXR')).length, registre(M7, B.moi.id)], [0, []]);
    await poser(B, M7, TJ({ minutes: 10, avance: 0 }));
    svc.avancer(16 * MIN);                                                                   // dix minutes avant le début : sa nouvelle heure de partir
    vrai('recalculé à dix minutes : le départ, à sa nouvelle heure', await T.attendre(async () => (await notifs(B, 'Tardif QXR')).length === 1, 8000, 100));
    v('   son texte, et sa clé (une autre que celle du trajet d\'avant)', [(await notifs(B, 'Tardif QXR'))[0].texte, registre(M7, B.moi.id)], ['Il est temps de partir · 10 min en voiture, pour ' + hmUtc(deb7), [[deb7, -10]]]);
    await lues();

    console.log('\n8. L\'organisatrice change le lieu : le trajet ne compte plus — et ceux qui en avaient un sont prévenus');
    const deb8 = dans(240);
    const M8 = await prog('Lieu QXR', deb8, { rappels: [] });
    const deM8 = async (P, type) => ((await P.get('/api/notifications')).j.notifications || []).filter(x => x.type === type && x.cible === M8);
    await poser(B, M8, TJ());
    const mod1 = await A.post('/api/reunions/' + M8 + '/modifier', { lieu: 'Tour Eiffel', notifier: false });
    v('population : le lieu change, sans prévenir personne', [mod1.code, mod1.j.reunion.lieu], [200, 'Tour Eiffel']);
    vrai('⛔ Bob (son trajet menait à l\'ANCIEN lieu) est prévenu QUAND MÊME', await T.attendre(async () => (await deM8(B, 'reunion_modifiee')).length === 1, 5000, 100));
    const recalc = /a modifié la réunion\. Le lieu a changé : votre trajet est à recalculer\.$/;
    vrai('   « … Le lieu a changé : votre trajet est à recalculer. »', recalc.test((await deM8(B, 'reunion_modifiee'))[0].texte), (await deM8(B, 'reunion_modifiee'))[0].texte);
    await T.dort(400);
    v('⛔ Claire (pas de trajet) : rien — l\'organisatrice ne prévenait personne', (await deM8(C, 'reunion_modifiee')).length, 0);
    fb = await fiche(B, M8);
    v('la fiche de Bob : plus de trajet, mais ses réglages d\'avant (« périmé »), pour le refaire d\'un geste', [fb.moi.trajet, fb.moi.trajet_perime], [null, TJ()]);
    v('   son agenda : plus de « Partir à »', ((await B.get('/api/reunions?du=' + (deb8 - HEURE) + '&au=' + (deb8 + HEURE))).j.reunions || []).filter(x => x.id === M8).map(x => x.moi.trajet), [null]);
    const mod1b = await A.post('/api/reunions/' + M8 + '/modifier', { titre: 'Lieu QXR bis', notifier: true });
    vrai('un second changement (le titre, en prévenant) : la notification de Claire arrive', mod1b.code === 200 && await T.attendre(async () => (await deM8(C, 'reunion_modifiee')).length === 1, 5000, 100));
    const nB = await deM8(B, 'reunion_modifiee'), nC = await deM8(C, 'reunion_modifiee');
    v('⛔ elle REMPLACE celle de Bob — et lui redit que son trajet est à refaire (il mène toujours à l\'ancien lieu) ; Claire, sans trajet, ne lit rien de tel',
      [nB.length, recalc.test(nB[0].texte), /recalculer/.test(nC[0].texte)], [1, true, false], nB.map(x => x.texte));
    svc.avancer(195 * MIN);                                                                  // cinq minutes après l'heure où il aurait fallu partir pour la clinique
    await T.dort(900);
    v('⛔ son heure de partir passe : RIEN ne sonne (le trajet menait ailleurs)', [(await deM8(B, 'reunion_rappel')).length, registre(M8, B.moi.id)], [0, []]);
    const mod2 = await A.post('/api/reunions/' + M8 + '/modifier', { lieu: 'Clinique du Parc', notifier: true });
    v('le lieu REVIENT à celui du calcul : le trajet revaut', [mod2.code, (await fiche(B, M8)).moi.trajet, (await fiche(B, M8)).moi.trajet_perime], [200, TJ(), null]);
    vrai('   la notification de Bob est remplacée — SANS « à recalculer » : son trajet est de nouveau juste',
      await T.attendre(async () => { const l = await deM8(B, 'reunion_modifiee'); return l.length === 1 && /a modifié la réunion\.$/.test(l[0].texte); }, 5000, 100), (await deM8(B, 'reunion_modifiee')).map(x => x.texte));
    vrai('   et son départ, passé pendant ce temps, sonne EN RETARD — comme après un arrêt du service',
      await T.attendre(async () => { const l = await deM8(B, 'reunion_rappel'); return l.length === 1 && /^Il fallait partir à /.test(l[0].texte); }, 8000, 100), (await deM8(B, 'reunion_rappel')).map(x => x.texte));
    await lues();
    const mod3 = await A.post('/api/reunions/' + M8 + '/modifier', { lieu: '', notifier: false });
    v('population : l\'organisatrice RETIRE le lieu (sans prévenir)', [mod3.code, mod3.j.reunion.lieu], [200, ''], mod3.txt);
    vrai('⛔ Bob (son trajet menait au lieu retiré) est prévenu : « Le lieu a été retiré : votre heure de départ ne compte plus. » — jamais « à recalculer », il n\'y a plus rien à recalculer',
      await T.attendre(async () => { const l = await deM8(B, 'reunion_modifiee'); return l.length > 0 && /a modifié la réunion\. Le lieu a été retiré : votre heure de départ ne compte plus\.$/.test(l[0].texte); }, 5000, 100),
      (await deM8(B, 'reunion_modifiee')).map(x => x.texte));
    v('   sa fiche : plus de trajet (il ne mène nulle part), ses réglages gardés (« périmé » : la page lui laisse le retirer)', [(await fiche(B, M8)).moi.trajet, (await fiche(B, M8)).moi.trajet_perime], [null, TJ()]);
    await lues();

    console.log('\n9. Refuser : plus de départ');
    const deb9 = dans(120);
    const M9 = await prog('Refus QXR', deb9, { rappels: [] });
    await poser(B, M9, TJ());
    const rep = await B.post('/api/reunions/' + M9 + '/reponse', { statut: 'decline' });
    svc.avancer(71 * MIN);
    await T.dort(900);
    v('⛔ Bob a refusé : son heure de partir passe sans rien', [rep.code, (await notifs(B, 'Refus QXR')).length, registre(M9, B.moi.id)], [200, 0, []]);
    await lues();

    console.log('\n10. Une série : un départ à chaque date');
    const deb10 = dans(120);
    const M10 = await prog('Série QXR', deb10, { rappels: [], repetition: 'quotidienne', n: 3 });
    await poser(B, M10, TJ());
    svc.avancer(71 * MIN);
    vrai('   la première date : son départ', await T.attendre(async () => (await notifs(B, 'Série QXR')).length === 1, 8000, 100));
    svc.avancer(JOUR);
    vrai('   le lendemain : le départ de la deuxième date', await T.attendre(async () => (await notifs(B, 'Série QXR')).length === 2, 8000, 100));
    v('   chaque date a SA ligne au registre', registre(M10, B.moi.id), [[deb10, -50], [deb10 + JOUR, -50]]);
    await lues();

    console.log('\n12. L\'export, l\'effacement du compte');
    await A.post('/api/reunions/' + M8 + '/modifier', { lieu: '3 avenue de la Gare', notifier: false });       // le trajet de Bob pour M8 ne mène plus au lieu
    const exB = await B.post('/api/compte/export', {}), exA = await A.post('/api/compte/export', {});
    const XB = exB.code === 200 ? JSON.parse(exB.txt) : {}, XA = exA.code === 200 ? JSON.parse(exA.txt) : {};
    const dans_ = (X, id) => ((X.reunions || []).find(x => x.id === id) || {}).trajet;
    v('l\'export de Bob porte SON trajet ; celui qui mène à un ancien lieu aussi, dit « périmé » (ce sont ses données)', [exB.code, dans_(XB, M1), dans_(XB, M8)], [200, tB, Object.assign(TJ(), { perime: true })]);
    v('⛔ l\'export de l\'organisatrice ne porte rien de celui de Bob', [exA.code, dans_(XA, M1), exA.txt.includes(CP.label)], [200, null, false]);
    await poser(C, M1, TJ({ depart: 'adresse', depart_label: '12 Rue des Lilas 78000 Versailles' }));
    vrai('population : Claire a un trajet', !!sql('SELECT trajet_ch FROM reunion_invite WHERE reunion = ? AND uid = ?', M1, C.moi.id).trajet_ch);
    const S2 = ouvrirBase({ chemin: BASE, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    S2.suppressionProgrammer(C.moi.id, Date.now() - 1000);
    const eff = S2.compteEffacer(C.moi.id); S2.fermer();
    v('⛔ l\'effacement du compte emporte ses trajets — et rien de ceux des autres', [eff.effacee, Number(sql('SELECT COUNT(*) AS n FROM reunion_invite WHERE uid = ?', C.moi.id).n), !!sql('SELECT trajet_ch FROM reunion_invite WHERE reunion = ? AND uid = ?', M1, B.moi.id).trajet_ch],
      [true, 0, true]);

    console.log('\n13. Un trajet retiré ou remplacé ne revient pas avec une sauvegarde d\'avant');
    {
      const O = require('./outils-sauvegarde');
      const bz = O.creerBase();
      try {
        const zoe = bz.pers('zoe'), yan = bz.pers('yan'), ugo = bz.pers('ugo');
        const t0 = bz.h.t + 3 * JOUR;
        const r = bz.S.reunionCreer({ hote: zoe.id, titre: 'Sauvegarde QXR', lieu: 'Clinique du Parc', debut: t0, fin: t0 + HEURE, tz: 'UTC', rep: 'aucune', rappels: [15], invites: [yan.id, ugo.id], prochain: t0, finSerie: t0 + HEURE });
        const copie = async (nom) => { const x = path.join(bz.dossier, nom); await bz.S.instantane(x); return x; };
        const poserZ = (uid, t) => bz.S.reunionTrajetPoser({ id: r.id, uid, trajet: t, lieu: 'Clinique du Parc' });
        poserZ(yan.id, TJ({ depart: 'adresse', depart_label: 'Ancienne adresse de Yan' })); poserZ(ugo.id, TJ({ depart_label: 'Domicile de Ugo' }));
        const c0 = await copie('c0.db');
        bz.h.t += MIN; poserZ(yan.id, TJ({ depart: 'adresse', depart_label: 'Nouvelle adresse de Yan' }));         // remplacé
        const c1 = await copie('c1.db');
        bz.h.t += MIN; poserZ(yan.id, null);                                                                       // retiré
        bz.h.t += MIN; poserZ(yan.id, TJ({ depart: 'adresse', depart_label: 'Troisième adresse de Yan' }));        // reposé après
        const c2 = await copie('c2.db');
        const reg = ouvrirBase.copie.purgeLire(bz.chemin).filter(x => x.genre === 'reunion_trajet');
        v('le registre note le trajet REMPLACÉ et RETIRÉ (objet réunion|personne|instant) — rien pour un trajet posé la première fois', reg.map(x => x.objet.split('|').slice(0, 2).join('|')), [r.id + '|' + yan.id, r.id + '|' + yan.id]);
        const lire = (chemin) => { const S = ouvrirBase({ chemin, scelleur: creerScelleur(bz.kek) }); try { return [yan.id, ugo.id].map(u => { const t = S.reunionPourMembre(r.id, u).moi.trajet; return t && t.depart_label; }); } finally { S.fermer(); } };
        const regTout = ouvrirBase.copie.purgeLire(bz.chemin);
        const b0 = ouvrirBase.copie.rejouerPurge(c0, regTout), b1 = ouvrirBase.copie.rejouerPurge(c1, regTout), b2 = ouvrirBase.copie.rejouerPurge(c2, regTout);
        v('⛔ restaurer une copie d\'avant le remplacement, ou d\'avant le retrait : l\'adresse de départ de Yan ne revient pas (le trajet d\'Ugo, si) ; la copie d\'après garde le trajet reposé',
          [lire(c0), lire(c1), lire(c2), b0.trajetsRetires, b1.trajetsRetires, b2.trajetsRetires || 0, b0.ignorees + b1.ignorees + b2.ignorees],
          [[null, 'Domicile de Ugo'], [null, 'Domicile de Ugo'], ['Troisième adresse de Yan', 'Domicile de Ugo'], 1, 1, 0, 0]);
        const encore = ouvrirBase.copie.rejouerPurge(c2, regTout);
        v('   rejoué deux fois : rien de plus', [encore.trajetsRetires || 0, encore.ajoutees, lire(c2)], [0, 0, ['Troisième adresse de Yan', 'Domicile de Ugo']]);
      } finally { bz.nettoyer(); }
    }

    console.log('\n14. Une base d\'avant la migration 29');
    {
      const O = require('./outils-sauvegarde');
      const fs = require('fs');
      const bz = O.creerBase();
      try {
        const S28 = ouvrirBase({ chemin: path.join(bz.dossier, 'v28.db'), scelleur: creerScelleur(bz.kek), horloge: () => bz.h.t, migrations: MIGRATIONS.filter(m => m.v <= 28) });
        const zoe = S28.personneCreer({ identifiant: 'beta:zoe28', prenom: 'Zoe', nom: 'Banc', origine: 'beta', verifie: true }), yan = S28.personneCreer({ identifiant: 'beta:yan28', prenom: 'Yan', nom: 'Banc', origine: 'beta', verifie: true });
        const t0 = bz.h.t + 3 * JOUR;
        const r = S28.reunionCreer({ hote: zoe.id, titre: 'Ancienne QXR', lieu: 'Clinique du Parc', debut: t0, fin: t0 + HEURE, tz: 'UTC', rep: 'aucune', rappels: [15], invites: [yan.id], prochain: t0, finSerie: t0 + HEURE });
        let avant29;
        try { S28.reunionTrajetPoser({ id: r.id, uid: yan.id, trajet: TJ(), lieu: 'Clinique du Parc' }); avant29 = 'écrit'; } catch (e) { avant29 = e.code; }
        v('au schéma 28 : la fiche lit « aucun trajet », et en poser un se refuse (indisponible) sans rien casser', [S28.reunionPourMembre(r.id, yan.id).moi.trajet, avant29, S28.reunionPlanif(r.id).participants.map(p => p.trajet)], [null, 'indisponible', [null, null]]);
        S28.fermer();
        const S29 = ouvrirBase({ chemin: path.join(bz.dossier, 'v28.db'), scelleur: creerScelleur(bz.kek), horloge: () => bz.h.t });
        try {
          const cols = T.lireBase(path.join(bz.dossier, 'v28.db')).prepare(`SELECT name FROM pragma_table_info('reunion_invite')`).all().map(c => c.name);
          v('rouverte : la migration 29 ajoute les deux colonnes ; la réunion et ses invités sont là', [cols.includes('trajet_ch'), cols.includes('trajet_le'), S29.reunionPourMembre(r.id, yan.id).invites.length], [true, true, 2]);
          S29.reunionTrajetPoser({ id: r.id, uid: yan.id, trajet: TJ(), lieu: 'Clinique du Parc' });
          v('   et un trajet s\'y pose', S29.reunionPourMembre(r.id, yan.id).moi.trajet, TJ());
          vrai('   la copie de sécurité d\'avant la migration existe', fs.existsSync(path.join(bz.dossier, 'v28.db.avant-v29')));
        } finally { S29.fermer(); }
      } finally { bz.nettoyer(); }
    }

    console.log('\n15. Le journal du service');
    const sortie = svc.sortie.texte();
    vrai('⛔ aucun lieu, aucune adresse de départ, aucun titre dans toute la sortie du service', !/Clinique|Eiffel|Lilas|Gare|Ma position|QXR/.test(sortie), (sortie.match(/.{0,60}(Clinique|Eiffel|Lilas|Gare|Ma position|QXR).{0,60}/) || [])[0]);
  } catch (e) {
    console.log('  ✗ exception : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    await svc.arreter();
    await ign.fermer();
    await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });      // ⛔ un banc qui meurt le DIT, avec ses comptes
