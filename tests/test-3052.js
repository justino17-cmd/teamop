/* ⛔ CE QUE CE FICHIER GARDE — L'ANTI-ABUS DE L'INVITÉ SANS COMPTE (Justin, 26 octobre 2026) : un lien qui circule est une porte que n'importe qui peut pousser. Les plafonds sont ceux de PRODUCTION (le banc ne les relâche pas).

     1. PAR ADRESSE, JAMAIS PAR EN-TÊTE : l'adresse se lit par `req.ip` (nginx a posé `trust proxy`), jamais par l'en-tête brut — un client qui écrit une fausse adresse en tête de `X-Forwarded-For` ne change pas de seau, et `X-Real-IP`
        n'est lu par personne. Deux adresses vraiment différentes ont chacune le leur ;
     2. L'APERÇU : soixante par minute et par adresse (429 avec `Retry-After`) ;
     3. LES ESSAIS ET LES ENTRÉES SONT COMPTÉS À PART : attendre un organisateur absent (la page redemande toutes les 30 s) ne consomme PAS le droit d'entrer — douze entrées par heure et par adresse, quatre-vingt-dix essais ;
     4. LA PORTE : cinq invités sans compte attendent au plus dans une même salle (409 `invites_attente_max`), et le sixième entre dès qu'une place se libère ; quatre au plus dans la salle (409 `invites_max` à l'admission, avec le
        maximum) ; la CAPACITÉ de la salle reste la première limite (409 `appel_complet`) ; « tout admettre » respecte les deux ;
     5. RÉGÉNÉRER : dix par heure et par réunion ;
     6. UN REFUS N'ÉCRIT RIEN : les essais refusés (quota, salle absente, porte pleine) ne laissent aucune ligne d'invité.
   ⛔ Un compteur qu'on n'a jamais vu atteindre sa limite ne prouve rien : chaque plafond est franchi, puis sa limite relue. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (150 s)'); process.exit(1); }, 150000).unref();

(async () => {
  const B = await O.monter({ quotasProd: true });
  const { svc, S } = B;
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  const depuis = (xff) => T.client(svc.base, { nomCookie: 'opm-i', xff });
  try {
    const ana = B.pers('Ana'), a1 = B.cl(ana);
    const rid = await B.programmer(a1), jeton = await B.lien(a1, rid);

    /* ═══ 1 & 2. L'ADRESSE ET L'APERÇU ═══ */
    console.log('1. par adresse (req.ip), jamais par en-tête : l\'aperçu, soixante par minute');
    const A = depuis('203.0.113.7');
    const codes = [];
    for (let i = 0; i < 61; i++) codes.push((await A.post('/api/invite/apercu', { jeton })).code);
    v('⛔ soixante aperçus passent (200), le soixante et unième est refusé (429)', [codes.slice(0, 60).every(c => c === 200), codes[60]], [true, 429]);
    const r429 = await A.post('/api/invite/apercu', { jeton });
    vrai('… le refus dit quand revenir (`Retry-After`, et `retry` dans le corps)', Number(r429.h.get('retry-after')) > 0 && r429.j.retry > 0 && r429.j.error === 'quota_atteint');
    const faux = depuis('1.1.1.1, 203.0.113.7');          // fausse adresse de tête, vraie adresse à droite (celle que nginx ajoute)
    v('⛔ une fausse adresse écrite en tête de `X-Forwarded-For` ne donne PAS un seau neuf : toujours 429', (await faux.post('/api/invite/apercu', { jeton })).code, 429);
    const reel = depuis('1.1.1.1, 198.51.100.9');
    v('… une autre adresse VRAIE (à droite) a son propre seau : 200', (await reel.post('/api/invite/apercu', { jeton })).code, 200);
    const viaReal = await T.client(svc.base, { xff: '203.0.113.7' }).appel('POST', '/api/invite/apercu', { jeton }, { entetes: { 'X-Real-IP': '9.9.9.9' } });
    v('… `X-Real-IP` n\'est lu par personne : l\'adresse reste celle de `req.ip` (429)', viaReal.code, 429);

    /* ═══ 3. LES ESSAIS ET LES ENTRÉES SONT COMPTÉS À PART ═══ */
    console.log('2. les essais et les entrées se comptent à part');
    const ana2 = B.pers('Ana2'), a2 = B.cl(ana2), rid2 = await B.programmer(a2), j2 = await B.lien(a2, rid2);
    const C = depuis('192.0.2.50');
    const essais = [];
    for (let i = 0; i < 30; i++) essais.push((await C.post('/api/invite/entrer', { jeton: j2, nom: 'Paul' })).code);
    v('population : trente essais devant une salle fermée — tous 409 `pas_ouverte`', [essais.length, new Set(essais).size, essais[0]], [30, 1, 409]);
    v('⛔ … rien n\'est écrit', un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE reunion = ?', rid2).n, 0);
    const sid2 = await B.entrerSalle(a2, rid2, 'audio');
    const premiere = await C.post('/api/invite/entrer', { jeton: j2, nom: 'Paul' });
    v('⛔ l\'attente n\'a PAS consommé le droit d\'entrer : l\'organisateur arrive, le client entre (201) malgré trente essais', premiere.code, 201);
    /* douze entrées par heure et par adresse : on refuse chaque nouvel arrivant pour libérer la porte */
    let creees = 1;
    for (let i = 0; i < 11; i++) { const g = await B.invite(j2, 'G' + i, '', depuis('192.0.2.50')); if (g.rep.code === 201) { creees++; await a2.post('/api/salles/' + sid2 + '/refuser', { uid: g.id }); } }
    await a2.post('/api/salles/' + sid2 + '/refuser', { uid: premiere.j.invite.id });
    v('population : douze entrées depuis la même adresse en une heure', creees, 12);
    const treizieme = await depuis('192.0.2.50').post('/api/invite/entrer', { jeton: j2, nom: 'Treize' });
    v('⛔ la TREIZIÈME est refusée (429 `quota_atteint`, avec `Retry-After`)', [dit(treizieme), Number(treizieme.h.get('retry-after')) > 0], [[429, 'quota_atteint'], true]);
    v('… et ne laisse aucune ligne : douze lignes d\'invité, pas treize', un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE reunion = ?', rid2).n, 12);
    const autre = await depuis('192.0.2.51').post('/api/invite/entrer', { jeton: j2, nom: 'Autre réseau' });
    v('une AUTRE adresse n\'est pas touchée : elle entre (201)', autre.code, 201);

    /* ═══ 4. LA PORTE ═══ */
    console.log('3. la porte : cinq qui attendent, quatre dedans, la capacité de la salle en premier');
    const ana3 = B.pers('Ana3'), a3 = B.cl(ana3), rid3 = await B.programmer(a3), j3 = await B.lien(a3, rid3);
    const sid3 = await B.entrerSalle(a3, rid3, 'audio');          // en audio : six places
    const g = [];
    for (let i = 0; i < 5; i++) g.push(await B.invite(j3, 'Invité' + i, '', depuis('198.51.100.' + (20 + i))));
    v('population : cinq invités attendent à la porte — tous acceptés', g.map(x => x.rep.code), [201, 201, 201, 201, 201]);
    const sixieme = await B.invite(j3, 'Sixième', '', depuis('198.51.100.30'));
    v('⛔ le SIXIÈME est refusé : 409 `invites_attente_max`, et il ne laisse aucune ligne', [dit(sixieme.rep), un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE appel = ?', sid3).n], [[409, 'invites_attente_max'], 5]);
    v('… et aucun cookie n\'a été posé', sixieme.c.cookie(), null);
    await a3.post('/api/salles/' + sid3 + '/refuser', { uid: g[4].id });
    const septieme = await B.invite(j3, 'Septième', '', depuis('198.51.100.31'));
    v('une place se libère (un refus) : le suivant entre (201)', septieme.rep.code, 201);
    const admis = [];
    for (let i = 0; i < 4; i++) admis.push((await a3.post('/api/salles/' + sid3 + '/admettre', { uid: g[i].id })).code);
    v('Ana admet quatre invités (200 chacun)', admis, [200, 200, 200, 200]);
    const cinq = await a3.post('/api/salles/' + sid3 + '/admettre', { uid: septieme.id });
    v('⛔ le CINQUIÈME admis est refusé : 409 `invites_max`, avec le maximum (4)', [dit(cinq), cinq.j.max], [[409, 'invites_max'], 4]);
    v('… il attend toujours à la porte', un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid3, septieme.id).statut, 'attente');
    const tous = await a3.post('/api/salles/' + sid3 + '/admettre', { tous: true });
    v('« tout admettre » ne passe pas non plus la limite (rien de plus n\'entre : 409 `appel_complet` ou 200 sans admis)', [tous.code === 200 ? tous.j.admis : 0, un('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = \'present\' AND uid LIKE \'g\\_%\' ESCAPE \'\\\'', sid3).n], [0, 4]);
    /* la capacité de la salle : six places en audio (Ana + quatre invités = 5 ; un compte de plus = 6 ; un septième est refusé) */
    const ben = B.pers('Ben'), b3 = B.cl(ben);
    S.contactLier(ana3.id, ben.id); S.contactLier(ben.id, ana3.id);
    await a3.post('/api/reunions/' + rid3 + '/inviter', { uids: [ben.id], notifier: false });
    const benEntre = await b3.post('/api/reunions/' + rid3 + '/rejoindre', { type: 'audio' });
    v('population : un compte de plus entre — la salle compte six (Ana, quatre invités sans compte, Ben)', [benEntre.code, un('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = \'present\'', sid3).n], [200, 6]);
    await a3.post('/api/salles/' + sid3 + '/refuser', { uid: septieme.id });
    const ana3b = await a3.post('/api/appels/' + sid3 + '/quitter', {});
    vrai('(Ana quitte pour libérer une place d\'hôte : Ben garde la salle)', ana3b.code === 200);
    /* — la capacité seule : une salle de personnes sans plafond d'invités atteint — */
    const ana4 = B.pers('Ana4'), a4 = B.cl(ana4), rid4 = await B.programmer(a4), j4 = await B.lien(a4, rid4);
    const sid4 = await B.entrerSalle(a4, rid4, 'audio');
    const comptes = [];
    for (let i = 0; i < 4; i++) { const p = B.pers('Cpt' + i); S.contactLier(ana4.id, p.id); S.contactLier(p.id, ana4.id); await a4.post('/api/reunions/' + rid4 + '/inviter', { uids: [p.id], notifier: false }); const c = B.cl(p); comptes.push(await c.post('/api/reunions/' + rid4 + '/rejoindre', { type: 'audio' })); }
    v('population : Ana et quatre comptes sont dans la salle (cinq sur six)', [comptes.map(r => r.code), un('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = \'present\'', sid4).n], [[200, 200, 200, 200], 5]);
    const u1 = await B.invite(j4, 'Dernier', '', depuis('198.51.100.40')), u2 = await B.invite(j4, 'Trop', '', depuis('198.51.100.41'));
    const a_1 = await a4.post('/api/salles/' + sid4 + '/admettre', { uid: u1.id }), a_2 = await a4.post('/api/salles/' + sid4 + '/admettre', { uid: u2.id });
    v('⛔ la salle n\'a plus qu\'UNE place : le premier invité entre (200), le second est refusé par la CAPACITÉ (409 `appel_complet`, max 6)', [a_1.code, dit(a_2), a_2.j.max], [200, [409, 'appel_complet'], 6]);

    /* ═══ 5. RÉGÉNÉRER ═══ */
    console.log('4. régénérer : dix par heure et par réunion');
    const ana5 = B.pers('Ana5'), a5 = B.cl(ana5), rid5 = await B.programmer(a5);
    await B.lien(a5, rid5);
    const reg = [];
    for (let i = 0; i < 11; i++) reg.push((await a5.post('/api/reunions/' + rid5 + '/invite/regenerer', {})).code);
    v('⛔ dix régénérations passent (200), la onzième est refusée (429)', [reg.slice(0, 10).every(c => c === 200), reg[10]], [true, 429]);
    v('… et le dernier jeton émis est le dernier qui vit (un seul jeton vivant par réunion)', un('SELECT COUNT(*) AS n FROM reunion WHERE id = ? AND inv_h IS NOT NULL', rid5).n, 1);

    /* ═══ 6. LES QUATRE AUTRES PLAFONDS DE L'ENTRÉE, UN PAR UN ═══
       Chacun doit être le SEUL à refuser : on les isole par la forme de la charge (une seule adresse qui insiste, une foule d'adresses sur un même lien, des entrées refusées une à une). */
    console.log('5. les essais par adresse (90), par lien (240), les entrées par lien (60), « redemander » (20)');
    const ana6 = B.pers('Ana6'), a6 = B.cl(ana6), rid6 = await B.programmer(a6), j6 = await B.lien(a6, rid6);       // salle jamais ouverte : 409 `pas_ouverte`, rien n'est écrit
    const D = depuis('192.0.2.90');
    const e90 = [];
    for (let i = 0; i < 91; i++) e90.push((await D.post('/api/invite/entrer', { jeton: j6, nom: 'Paul' })).code);
    v('⛔ quatre-vingt-dix essais depuis une même adresse passent (409 `pas_ouverte`), le quatre-vingt-onzième est refusé (429)', [e90.slice(0, 90).every(c => c === 409), e90[90]], [true, 429]);
    const ana7 = B.pers('Ana7'), a7 = B.cl(ana7), rid7 = await B.programmer(a7), j7 = await B.lien(a7, rid7);
    const parLien = [];
    for (let i = 0; i < 241; i++) parLien.push((await depuis('10.7.' + Math.floor(i / 250) + '.' + (i % 250 + 1)).post('/api/invite/entrer', { jeton: j7, nom: 'Paul' })).code);
    v('⛔ deux cent quarante essais sur UN lien, chacun d\'une adresse différente, passent (409) ; le deux cent quarante et unième est refusé (429) : l\'adresse seule ne protège pas un lien qui circule',
      [parLien.slice(0, 240).every(c => c === 409), parLien[240]], [true, 429]);
    const ana8 = B.pers('Ana8'), a8 = B.cl(ana8), rid8 = await B.programmer(a8), j8 = await B.lien(a8, rid8), sid8 = await B.entrerSalle(a8, rid8, 'audio');
    const cree = [];
    for (let i = 0; i < 61; i++) {
      const g = await B.invite(j8, 'C' + i, '', depuis('10.8.0.' + (i + 1)));
      cree.push(g.rep.code);
      if (g.rep.code === 201) await a8.post('/api/salles/' + sid8 + '/refuser', { uid: g.id });
    }
    v('⛔ soixante entrées sur UN lien, chacune d\'une adresse différente, créent un invité (201) ; la soixante et unième est refusée (429)', [cree.slice(0, 60).every(c => c === 201), cree[60]], [true, 429]);
    v('… et elle ne laisse aucune ligne : soixante lignes d\'invité', un('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE reunion = ?', rid8).n, 60);
    const ana9 = B.pers('Ana9'), a9 = B.cl(ana9), rid9 = await B.programmer(a9), j9 = await B.lien(a9, rid9);
    await B.entrerSalle(a9, rid9, 'audio');
    const q9 = await B.invite(j9, 'Marc', '', depuis('10.9.0.1'));
    const red = [];
    for (let i = 0; i < 21; i++) red.push((await q9.c.post('/api/invite/redemander', {})).code);
    v('⛔ vingt « redemander » par invité passent (200), le vingt et unième est refusé (429)', [red.slice(0, 20).every(c => c === 200), red[20]], [true, 429]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
