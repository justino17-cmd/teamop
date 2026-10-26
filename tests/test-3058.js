/* ⛔ CE QUE CE FICHIER GARDE — L'INSISTANCE : UN REFUS TIENT, UN LIEN QUI CIRCULE NE REMPLIT RIEN, UN NOM NE SE FAIT PAS INVISIBLE (relecture du `gardien`, 26 octobre 2026).

     1. UN REFUS OU UNE EXCLUSION TIENT : l'organisateur qui a refusé ou exclu quelqu'un ne le revoit pas revenir avec un navigateur NEUF — le RÉSEAU (HMAC de la salle et de l'adresse vue par nginx, jamais l'adresse) n'entre
        plus dans CETTE salle (403 `refuse`, à l'entrée comme à « redemander »). Une autre adresse entre ; une autre salle aussi ; régénérer le lien n'est PAS un refus (il ne ferme aucun réseau) ;
     2. DEUX INVITÉS AU PLUS EN ATTENTE PAR RÉSEAU ET PAR SALLE, et un total de lignes d'invité par salle, refusés compris (`invitesLignesMax`) : cinq inconnus ne prennent pas les cinq places de la porte ;
     3. L'EMPREINTE DU RÉSEAU n'est pas l'adresse : la base ne porte aucune adresse ;
     4. LE NOM : ni invisible (U+2800, U+3164, remplisseurs hangul, jonctions, sélecteurs de variation, étiquettes), ni coupé par du faux (« Pa⁠ul » redevient « Paul »), ni noyé de marques combinantes (deux au plus par lettre),
        et il faut une lettre ou un chiffre — « ... » ou « ⠀⠀ » n'est pas un nom ;
     5. LE LIEN D'UNE RÉUNION ANNULÉE répond 409 `reunion_annulee` (jamais 500) ;
     6. « TOUT ADMETTRE » DIT ce qu'il a laissé à la porte (`invites_restent`), et la salle reçoit huit invités par défaut.
   ⛔ Une absence se prouve sur une population : chaque refus est précédé du contrôle que le même chemin laisse entrer un autre réseau. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const C = require(path.join(T.SERVICE, 'config.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (150 s)'); process.exit(1); }, 150000).unref();

(async () => {
  const B = await O.monter({ service: { config: { appels: { balayageMs: 1000, perduMs: 600000, invitesLignesMax: 7, invitesSalleMax: 2 } } } });
  const { svc } = B;
  const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = raw(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const tous = (sql, ...a) => { const d = raw(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  const depuis = (xff) => B.clientInvite(xff);
  try {
    console.log('0. les valeurs par défaut');
    v('population : la salle reçoit HUIT invités sans compte à la fois par défaut, deux par réseau, quarante lignes, deux minutes de grâce, trente jours de conservation',
      (({ invitesSalleMax, invitesReseauMax, invitesLignesMax, invitesGraceMs, invitesPurgeJours }) => [invitesSalleMax, invitesReseauMax, invitesLignesMax, invitesGraceMs, invitesPurgeJours])(C.appelsConfig({}, 'beta')), [8, 2, 40, 120000, 30]);

    /* ═══ 1. UN REFUS TIENT ═══ */
    console.log('1. un refus et une exclusion tiennent');
    const ana = B.pers('Ana'), a1 = B.cl(ana), rid = await B.programmer(a1), jeton = await B.lien(a1, rid), sid = await B.entrerSalle(a1, rid, 'audio');
    const R = '198.51.100.10';
    const p1 = await B.invite(jeton, 'Intrus', 'X', depuis(R));
    v('population : un invité attend depuis le réseau R (201)', p1.rep.code, 201);
    const ref = await a1.post('/api/salles/' + sid + '/refuser', { uid: p1.id });
    v('Ana le refuse (200)', ref.code, 200);
    const neuf = await B.invite(jeton, 'Intrus', 'X', depuis(R));
    v('⛔ un navigateur NEUF derrière la même adresse est refusé à l\'entrée : 403 `refuse`, aucun cookie, aucune ligne de plus', [dit(neuf.rep), neuf.c.cookie(), un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE appel = ?', sid).n], [[403, 'refuse'], null, 1]);
    const autre = await B.invite(jeton, 'Autre', '', depuis('198.51.100.11'));
    v('(contre-épreuve) une AUTRE adresse entre (201) : ce n\'est pas toute la salle qui est fermée', autre.rep.code, 201);
    const redem = await p1.c.post('/api/invite/redemander', {});
    v('le refusé lui-même ne revient pas non plus : « redemander » → 403 `refuse`', dit(redem), [403, 'refuse']);
    /* un second invité du MÊME réseau R déjà en attente AVANT le refus : « redemander » est fermé aussi (403 `refuse`) */
    const ana2 = B.pers('Ana2'), a2 = B.cl(ana2), rid2 = await B.programmer(a2), j2 = await B.lien(a2, rid2), sid2 = await B.entrerSalle(a2, rid2, 'audio');
    const q1 = await B.invite(j2, 'Q1', '', depuis(R)), q2 = await B.invite(j2, 'Q2', '', depuis(R));
    v('population : deux invités du réseau R attendent dans la salle 2 (201, 201)', [q1.rep.code, q2.rep.code], [201, 201]);
    await a2.post('/api/salles/' + sid2 + '/refuser', { uid: q1.id });
    const q2r = await q2.c.post('/api/invite/redemander', {});
    v('⛔ « redemander » du second, qui attendait avec lui, est fermé aussi : 403 `refuse` (le réseau est refusé dans cette salle)', dit(q2r), [403, 'refuse']);
    const horsSalle = await B.invite(jeton, 'Retour', '', depuis('198.51.100.10'));
    v('⛔ le refus est celui d\'UNE SALLE : la salle 1 reste fermée à R (403)…', dit(horsSalle.rep), [403, 'refuse']);
    const anaX = B.pers('AnaX'), aX = B.cl(anaX), ridX = await B.programmer(aX), jX = await B.lien(aX, ridX);
    await B.entrerSalle(aX, ridX, 'audio');
    v('… et une AUTRE salle reçoit R (201)', (await B.invite(jX, 'Libre', '', depuis(R))).rep.code, 201);
    /* l'exclusion : admis, puis exclu */
    const ana3 = B.pers('Ana3'), a3 = B.cl(ana3), rid3 = await B.programmer(a3), j3 = await B.lien(a3, rid3), sid3 = await B.entrerSalle(a3, rid3, 'audio');
    const E = '198.51.100.30';
    const e1 = await B.invite(j3, 'Exclu', '', depuis(E));
    await a3.post('/api/salles/' + sid3 + '/admettre', { uid: e1.id });
    v('population : l\'invité du réseau E est admis (statut présent)', un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid3, e1.id).statut, 'present');
    const ex = await a3.post('/api/salles/' + sid3 + '/exclure', { uid: e1.id });
    v('Ana l\'exclut (200)', ex.code, 200);
    v('⛔ un navigateur neuf derrière la même adresse est refusé : 403 `refuse`', dit((await B.invite(j3, 'Exclu', '', depuis(E))).rep), [403, 'refuse']);
    v('… un autre réseau entre (201)', (await B.invite(j3, 'Autre', '', depuis('198.51.100.31'))).rep.code, 201);
    /* régénérer n'est PAS un refus */
    const ana4 = B.pers('Ana4'), a4 = B.cl(ana4), rid4 = await B.programmer(a4), j4 = await B.lien(a4, rid4);
    await B.entrerSalle(a4, rid4, 'audio');
    const W = '198.51.100.40';
    const w1 = await B.invite(j4, 'Attend', '', depuis(W));
    const reg = await a4.post('/api/reunions/' + rid4 + '/invite/regenerer', {});
    vrai('population : l\'invité attendait, le lien est régénéré (il est renvoyé)', w1.rep.code === 201 && reg.code === 200 && reg.j.coupes === 1);
    v('⛔ régénérer n\'est PAS un refus : le même réseau entre avec le NOUVEAU lien (201)', (await B.invite(reg.j.jeton, 'Attend', '', depuis(W))).rep.code, 201);

    /* ═══ 2. UNE PORTE QUI NE SE REMPLIT PAS ═══ */
    console.log('2. deux par réseau, des lignes en nombre fini');
    const ana5 = B.pers('Ana5'), a5 = B.cl(ana5), rid5 = await B.programmer(a5), j5 = await B.lien(a5, rid5), sid5 = await B.entrerSalle(a5, rid5, 'audio');
    const N = '203.0.113.50';
    const n1 = await B.invite(j5, 'N1', '', depuis(N)), n2 = await B.invite(j5, 'N2', '', depuis(N)), n3 = await B.invite(j5, 'N3', '', depuis(N));
    v('⛔ DEUX attendent depuis un même réseau, le TROISIÈME est refusé : 409 `invites_attente_max`, sans cookie', [n1.rep.code, n2.rep.code, dit(n3.rep), n3.c.cookie()], [201, 201, [409, 'invites_attente_max'], null]);
    v('(contre-épreuve) un autre réseau entre (201)', (await B.invite(j5, 'Ailleurs', '', depuis('203.0.113.51'))).rep.code, 201);
    await n1.c.post('/api/invite/quitter', {});
    v('l\'un des deux repart : la place se libère, le troisième entre (201)', (await B.invite(j5, 'N3', '', depuis(N))).rep.code, 201);
    /* les lignes : refusés compris. 7 au plus dans cette salle : on en a 5 (n1, n2, n3 refusé sans ligne, ailleurs, n3 bis) → 4 */
    const compte = () => un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE appel = ?', sid5).n;
    let k = 0;
    while (compte() < 7 && k++ < 12) { const g = await B.invite(j5, 'L' + k, '', depuis('203.0.113.' + (100 + k))); if (g.rep.code !== 201) break; await a5.post('/api/salles/' + sid5 + '/refuser', { uid: g.id }); }
    v('population : la salle porte sept lignes d\'invité, dont des REFUSÉS', [compte(), un('SELECT COUNT(*) AS n FROM invite_sans_compte g JOIN appel_part p ON p.appel = g.appel AND p.uid = g.id WHERE g.appel = ? AND p.statut = \'refuse\'', sid5).n >= 3], [7, true]);
    const trop = await B.invite(j5, 'Trop', '', depuis('203.0.113.200'));
    v('⛔ la huitième ligne est refusée : 409 `invites_lignes_max` — refusés compris, personne n\'est « libéré » par un refus', [dit(trop.rep), compte()], [[409, 'invites_lignes_max'], 7]);

    /* ═══ 3. L'EMPREINTE N'EST PAS L'ADRESSE ═══ */
    console.log('3. l\'empreinte du réseau n\'est pas l\'adresse');
    const empreintes = tous('SELECT reseau_h FROM invite_sans_compte').map(r => r.reseau_h);
    vrai('population : ' + empreintes.length + ' lignes d\'invité portent une empreinte de réseau (64 hexadécimaux)', empreintes.length >= 10 && empreintes.every(h => /^[0-9a-f]{64}$/.test(h)));
    const octets = ['msg.db', 'msg.db-wal'].map(f => { try { return require('fs').readFileSync(path.join(svc.data, f)); } catch (e) { return Buffer.alloc(0); } });
    v('⛔ aucune des adresses jouées ne figure dans la base ni dans son journal', ['198.51.100.10', '198.51.100.30', '203.0.113.50'].map(ip => octets.some(b => b.includes(Buffer.from(ip)))), [false, false, false]);
    v('… deux lignes d\'un même réseau et d\'une même salle portent la MÊME empreinte, deux réseaux deux empreintes différentes', [new Set(tous('SELECT reseau_h FROM invite_sans_compte WHERE appel = ? AND reseau_h IS NOT NULL', sid3).map(r => r.reseau_h)).size >= 2, un('SELECT COUNT(DISTINCT reseau_h) AS n FROM invite_sans_compte WHERE appel = ?', sid5).n > 3], [true, true]);

    /* ═══ 4. LE NOM ═══ */
    console.log('4. le nom : ni invisible, ni noyé');
    const ana6 = B.pers('Ana6'), a6 = B.cl(ana6), rid6 = await B.programmer(a6), j6 = await B.lien(a6, rid6), sid6 = await B.entrerSalle(a6, rid6, 'audio');
    const invisibles = [['braille vide', '⠀⠀⠀'], ['remplisseur hangul', 'ㅤᅟᅠ'], ['largeur nulle et jonctions', '​‌‍⁠﻿'], ['sélecteurs de variation', '️︎'], ['étiquettes', '\u{e0041}\u{e0042}'], ['ponctuation seule', '...'], ['tirets', '— – —']];
    const rep = [];
    for (const [nom, val] of invisibles) { const c = depuis(); const r = await c.post('/api/invite/entrer', { jeton: j6, nom: val }); rep.push([nom, r.code, r.j && r.j.error, c.cookie()]); }
    v('⛔ population : sept « noms » sans une lettre ni un chiffre — AUCUN n\'entre (400 `nom_requis`), aucun cookie', rep.map(x => [x[1], x[2], x[3]]), invisibles.map(() => [400, 'nom_requis', null]));
    const propre = await B.invite(j6, 'Pa⁠u​l ㅤDurand️', '⠀⠀');
    v('⛔ les invisibles tombent SANS couper le mot : « Pa⁠u​l ㅤDurand » devient « Paul Durand » ; une entreprise qui n\'est que du vide devient VIDE', [propre.rep.j.invite.nom, propre.rep.j.invite.entreprise], ['Paul Durand', '']);
    const zalgo = 'Zoe' + '́̂̃̄̅̆̇̈'.repeat(6);
    const zg = await B.invite(j6, zalgo, '');
    v('⛔ les marques combinantes s\'arrêtent à DEUX par lettre : « Zoe » + 48 marques → « Zoe » + 2 marques (la lettre « e » les porte)', [[...zg.rep.j.invite.nom].length, (zg.rep.j.invite.nom.match(/\p{M}/gu) || []).length], [5, 2]);
    const emoji = await B.invite(j6, '😀 Zoé', 'Plomberie d\'Été & Fils');
    v('(contre-épreuve) un nom à lettres accentuées et un émoji passent tels quels', [emoji.rep.j.invite.nom, emoji.rep.j.invite.entreprise], ['😀 Zoé', 'Plomberie d\'Été & Fils']);

    /* ═══ 5. LE LIEN D'UNE RÉUNION ANNULÉE ═══ */
    console.log('5. une réunion annulée');
    const ana7 = B.pers('Ana7'), a7 = B.cl(ana7), rid7 = await B.programmer(a7);
    v('population : le lien d\'une réunion vivante est donné (200)', (await a7.post('/api/reunions/' + rid7 + '/invite/lien', {})).code, 200);
    const an = await a7.post('/api/reunions/' + rid7 + '/annuler', {});
    v('Ana annule la réunion (200)', an.code, 200);
    v('⛔ son lien invité répond 409 `reunion_annulee` — pas 500 — pour « Copier » comme pour « Régénérer »', [dit(await a7.post('/api/reunions/' + rid7 + '/invite/lien', {})), dit(await a7.post('/api/reunions/' + rid7 + '/invite/regenerer', {}))], [[409, 'reunion_annulee'], [409, 'reunion_annulee']]);

    /* ═══ 6. « TOUT ADMETTRE » DIT CE QU'IL LAISSE À LA PORTE ═══ */
    console.log('6. tout admettre : la salle en tient deux ici, il le dit');
    const ana8 = B.pers('Ana8'), a8 = B.cl(ana8), rid8 = await B.programmer(a8), j8 = await B.lien(a8, rid8), sid8 = await B.entrerSalle(a8, rid8, 'audio');
    const wa = [];
    for (let i = 0; i < 3; i++) wa.push(await B.invite(j8, 'Att' + i, '', depuis('192.0.2.' + (20 + i))));
    v('population : trois invités attendent (201 ×3)', wa.map(x => x.rep.code), [201, 201, 201]);
    const tout = await a8.post('/api/salles/' + sid8 + '/admettre', { tous: true });
    v('⛔ « tout admettre » en fait entrer DEUX (le maximum configuré) et DIT qu\'il en laisse UN à la porte : `invites_restent` 1, `invites_max` 2', [tout.code, tout.j.admis, tout.j.invites_restent, tout.j.invites_max], [200, 2, 1, 2]);
    v('… le troisième attend toujours', un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid8, wa[2].id).statut, 'attente');
    const ui = require('fs').readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8');
    vrai('⛔ et la PAGE de l\'organisateur le lit : elle écrit le nombre d\'invités laissés à la porte (`invites_restent`) à l\'organisateur', /r\.invites_restent > 0\) mot\(/.test(T.sansCommentaires(ui)));
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
