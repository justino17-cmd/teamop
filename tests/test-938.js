/* ⛔ CE QUE CE FICHIER GARDE — L'ORDRE DU JOUR D'UNE RÉUNION ET LE COMPTE RENDU DE SA SÉANCE (famille 3 : le VRAI service, parlé en HTTP, une horloge qu'on avance ; la base ouverte à côté).

   8 octobre 2026, Justin (« fais tout ça ») : « un ordre du jour qu'on coche pendant la réunion, et un compte rendu automatique à la fin ». Ce que le service promet (migration 23, `routes-reunions.js`) :
     · l'organisateur pose l'ordre du jour en programmant ou en modifiant : vingt points de 200 signes au plus, une ligne vide ignorée, tout le reste REFUSÉ (et dit) ; le texte est SCELLÉ en base ;
     · retoucher la liste GARDE l'identifiant et la coche d'un point dont le texte ne change pas ; un invité ne la modifie pas ;
     · un PARTICIPANT coche ou décoche un point (l'organisateur ou un invité) ; un point inconnu se dit (404), un non-invité reçoit le même 404 qu'une réunion qui n'existe pas ;
     · ⛔ quand l'hôte TERMINE la séance pour tous, la conversation de la réunion reçoit UN compte rendu, de celui qui l'a terminée : le jour, la durée, les présents (et leur temps), les absents
       (avec leur réponse), l'ordre du jour (coché ou non), les documents partagés PENDANT la séance — une carte (`meta.k`) et le même texte ; terminer deux fois n'en fait pas deux ;
     · ⛔ et AUSSI quand la séance finit parce que le DERNIER s'en va — il quitte, ou son appareil se tait et le balayeur le sort (§ 4 bis : seul, « Quitter » ne demande rien) ;
     · un appel de GROUPE (pas une réunion) terminé n'en fait pas ;
     · une SÉRIE repart avec un ordre du jour décoché ; une réunion unique garde ses coches.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto'), fs = require('fs');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const PNG = F.png();

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { appels: { balayageMs: 1000, perduMs: 600000 } } });
  let decal = 0;
  const maintenant = () => Date.now() + decal;
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  const pers = (prenom) => S.personneCreer({ identifiant: 'beta:' + prenom + crypto.randomBytes(3).toString('hex'), prenom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); return c; };
  const dbOctets = () => Buffer.concat(fs.readdirSync(svc.data).filter(f => /^msg\.db/.test(f)).map(f => fs.readFileSync(path.join(svc.data, f))));
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cléo'), dan = pers('Dan'), eve = pers('Eve');
    for (const p of [ben, cleo, dan, eve]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve);
    const lire = async (X, R) => (await X.get('/api/reunions/' + R)).j;
    const odjDe = async (X, R) => ((await lire(X, R)).reunion || {}).ordre_du_jour;

    console.log('1. L\'organisateur pose l\'ordre du jour en programmant');
    const debut = maintenant() + 5 * MIN;
    const creer = (corps) => a1.post('/api/reunions', Object.assign({ titre: 'Revue chantier', debut, fin: debut + HEURE, invites: [ben.id, cleo.id, dan.id], notifier: false }, corps));
    v('⛔ vingt-et-un points : 400 ordre_du_jour_invalide (rien n\'est programmé)', dit(await creer({ ordre_du_jour: Array.from({ length: 21 }, (_, i) => 'Point ' + i) })), [400, 'ordre_du_jour_invalide']);
    v('⛔ un point de plus de 200 signes, un point qui n\'est pas un texte, une liste qui n\'en est pas une : 400', [dit(await creer({ ordre_du_jour: ['é'.repeat(201)] }))[0], dit(await creer({ ordre_du_jour: ['Budget', 42] }))[0], dit(await creer({ ordre_du_jour: 'Budget' }))[0]], [400, 400, 400]);
    const cr = await creer({ ordre_du_jour: ['Budget', '   ', 'Planning QXODJ', 'Sécurité'] });
    v('201 : la réunion est programmée', cr.code, 201);
    const R = cr.j.reunion.id, CONV = cr.j.reunion.conv;
    const o1 = await odjDe(a1, R);
    v('trois points (la ligne blanche est partie), chacun avec un identifiant court, aucun coché', [o1.map(x => x.texte), o1.every(x => /^[0-9a-f]{8}$/.test(x.id)), o1.some(x => x.fait)], [['Budget', 'Planning QXODJ', 'Sécurité'], true, false]);
    v('un invité (Ben) lit le même ordre du jour', (await odjDe(b1, R)).map(x => x.texte), ['Budget', 'Planning QXODJ', 'Sécurité']);
    v('⛔ le texte des points est SCELLÉ : « QXODJ » n\'est nulle part en clair dans la base (population : la base est lue — l\'identifiant de la réunion y est)', [dbOctets().includes(Buffer.from(R)), dbOctets().includes(Buffer.from('QXODJ'))], [true, false]);

    console.log('\n2. Un participant coche un point');
    const fC = await T.flux(c1);
    const idBudget = o1[0].id;
    const coche = await b1.post('/api/reunions/' + R + '/ordre-du-jour', { point: idBudget, fait: true });
    v('Ben coche « Budget » : 200, et la réponse dit la liste à jour', [coche.code, (coche.j.ordre_du_jour || []).map(x => x.fait)], [200, [true, false, false]]);
    v('Ana le voit coché', (await odjDe(a1, R)).map(x => x.fait), [true, false, false]);
    vrai('la page de Cléo l\'apprend (un événement « reunion » de la conversation)', !!(await fC.attendre(e => e.event === 'reunion' && e.data && e.data.id === R, 8000)));
    fC.fermer();
    v('⛔ un point inconnu : 404 point_introuvable ; « fait » qui n\'est pas un booléen : 400', [dit(await b1.post('/api/reunions/' + R + '/ordre-du-jour', { point: 'abcdef12', fait: true })), dit(await b1.post('/api/reunions/' + R + '/ordre-du-jour', { point: idBudget, fait: 'oui' }))[0]], [[404, 'point_introuvable'], 400]);
    const nonInvite = await e1.post('/api/reunions/' + R + '/ordre-du-jour', { point: idBudget, fait: false }), inexistante = await e1.post('/api/reunions/r_' + '0'.repeat(32) + '/ordre-du-jour', { point: idBudget, fait: false });
    v('⛔ Eve, pas invitée : le même 404 qu\'une réunion qui n\'existe pas — et rien n\'a bougé', [dit(nonInvite), dit(inexistante), (await odjDe(a1, R))[0].fait], [[404, 'introuvable'], [404, 'introuvable'], true]);

    console.log('\n3. Retoucher la liste garde ce qui ne change pas');
    const mod = await a1.post('/api/reunions/' + R + '/modifier', { ordre_du_jour: ['Budget', 'Planning (modifié)', 'Sécurité', 'Questions'], notifier: false });
    const o2 = await odjDe(a1, R);
    v('200 ; « Budget » GARDE son identifiant ET sa coche ; « Sécurité » garde son identifiant ; le point retouché et le nouveau en ont un neuf', [mod.code, o2.map(x => x.texte), o2[0].id === idBudget && o2[0].fait, o2[2].id === o1[2].id, o2[1].id !== o1[1].id], [200, ['Budget', 'Planning (modifié)', 'Sécurité', 'Questions'], true, true, true]);
    v('⛔ un invité ne modifie pas l\'ordre du jour (la porte de l\'hôte)', (await b1.post('/api/reunions/' + R + '/modifier', { ordre_du_jour: ['Rien'] })).code === 200, false);

    console.log('\n4. La séance, terminée pour tous : son compte rendu');
    await c1.post('/api/reunions/' + R + '/reponse', { statut: 'decline' });
    const photoAvant = await F.deposer(b1, { conv: CONV, genre: 'photo', corps: PNG });
    await b1.post('/api/conversations/' + CONV + '/messages', { cid: 'p_' + crypto.randomBytes(6).toString('hex'), type: 'photo', pieces: [{ id: photoAvant.j.id, w: 8, h: 8 }] });
    avancer(MIN);
    const s1 = await a1.post('/api/reunions/' + R + '/rejoindre', {});
    const SALLE = s1.j && s1.j.appel && s1.j.appel.id;
    vrai('population : Ana ouvre la salle de la réunion (une photo a été partagée AVANT la séance)', s1.code === 200 && !!SALLE && photoAvant.code === 201);
    avancer(2 * MIN); await b1.post('/api/reunions/' + R + '/rejoindre', {});
    avancer(3 * MIN);
    const photo = await F.deposer(b1, { conv: CONV, genre: 'photo', corps: PNG });
    await b1.post('/api/conversations/' + CONV + '/messages', { cid: 'p_' + crypto.randomBytes(6).toString('hex'), type: 'photo', pieces: [{ id: photo.j.id, w: 8, h: 8 }] });
    await a1.post('/api/reunions/' + R + '/ordre-du-jour', { point: (await odjDe(a1, R))[2].id, fait: true });
    avancer(10 * MIN);
    const crs = async (X) => ((await X.get('/api/conversations/' + CONV + '/messages')).j.messages || []).filter(m => m.meta && m.meta.k === 'compte_rendu');
    v('population : aucun compte rendu tant que la séance court', (await crs(a1)).length, 0);
    v('⛔ Ben (invité) ne termine pas la séance pour tous', (await b1.post('/api/salles/' + SALLE + '/terminer', {})).code === 200, false);
    const t1 = await a1.post('/api/salles/' + SALLE + '/terminer', {});
    v('Ana termine pour tous', t1.code, 200);
    const l = await crs(b1), m = l[0] || {}, x = m.meta || {};
    v('UN compte rendu, d\'Ana, dans la conversation de la réunion (Ben le lit)', [l.length, m.auteur], [1, ana.id]);
    v('la carte : le titre, une durée de 15 min (de l\'ouverture à la fin), deux présents (Ana puis Ben, avec leur temps), deux absents avec leur réponse',
      [x.titre, Math.round(x.duree_s / 60), x.presents_n, (x.presents || []).map(p => [p.nom, Math.round(p.duree_s / 60)]), x.absents_n, (x.absents || []).map(p => [p.nom, p.reponse])],
      ['Revue chantier', 15, 2, [['Ana Banc', 15], ['Ben Banc', 13]], 2, [['Cléo Banc', 'decline'], ['Dan Banc', 'attente']]]);
    v('l\'ordre du jour, coché ou non ; ⛔ UN document — celui de la séance, pas celui d\'avant', [x.points, x.documents], [[{ texte: 'Budget', fait: true }, { texte: 'Planning (modifié)', fait: false }, { texte: 'Sécurité', fait: true }, { texte: 'Questions', fait: false }], 1]);
    const lignes = String(m.texte || '').split('\n');
    v('le TEXTE dit la même chose (une version d\'avant, une notification, l\'export)', [lignes[0], /· 15 min$/.test(lignes[1]), lignes[2], lignes[3], lignes.slice(4)],
      ['📝 Compte rendu — Revue chantier', true, 'Présents (2) : Ana Banc (15 min), Ben Banc (13 min)', 'Absents (2) : Cléo Banc (a décliné), Dan Banc (sans réponse)', ['Ordre du jour :', '✓ Budget', '○ Planning (modifié)', '✓ Sécurité', '○ Questions', 'Documents partagés : 1']]);
    await a1.post('/api/salles/' + SALLE + '/terminer', {});
    v('⛔ terminer une seconde fois n\'en fait pas un second', (await crs(a1)).length, 1);
    v('⛔ Eve (pas invitée) ne lit pas la conversation de la réunion', (await e1.get('/api/conversations/' + CONV + '/messages')).code, 404);
    v('une réunion UNIQUE garde ses coches après la séance', (await odjDe(a1, R)).map(p => p.fait), [true, false, true, false]);

    /* ⛔ 4 bis (8 octobre 2026, test de A à Z sur la bêta) : la séance finit AUSSI quand le dernier s'en va — seul dans la salle, « Quitter » ne demande rien, et le compte rendu promis « à la fin
       de la réunion » ne venait jamais. */
    console.log('\n4 bis. La séance finie parce que le DERNIER s\'en va : son compte rendu aussi');
    const crsDe = async (conv) => ((await a1.get('/api/conversations/' + conv + '/messages')).j.messages || []).filter(mm => mm.meta && mm.meta.k === 'compte_rendu');
    const d3 = maintenant() + 2 * MIN;
    const r3 = await a1.post('/api/reunions', { titre: 'Point rapide', debut: d3, fin: d3 + HEURE, invites: [ben.id], notifier: false, ordre_du_jour: ['Un seul point'] });
    const R3 = r3.j.reunion.id, CONV3 = r3.j.reunion.conv;
    const S3 = (await a1.post('/api/reunions/' + R3 + '/rejoindre', {})).j.appel.id;
    await b1.post('/api/reunions/' + R3 + '/rejoindre', {});
    avancer(4 * MIN);
    const q1 = await b1.post('/api/appels/' + S3 + '/quitter', {});
    v('population : Ben s\'en va (la salle continue avec Ana) — aucun compte rendu encore', [q1.code, (await crsDe(CONV3)).length], [200, 0]);
    avancer(MIN);
    const q2 = await a1.post('/api/appels/' + S3 + '/quitter', {});
    const l3 = await crsDe(CONV3);
    v('⛔ Ana, la DERNIÈRE, s\'en va sans « Terminer pour tous » : UN compte rendu, à son nom — deux présents, la séance de 5 min',
      [q2.code, l3.length, l3[0] && l3[0].auteur, l3[0] && l3[0].meta.presents_n, l3[0] && Math.round(l3[0].meta.duree_s / 60)], [200, 1, ana.id, 2, 5]);
    const d4 = maintenant() + 2 * MIN;
    const r4 = await a1.post('/api/reunions', { titre: 'Point muet', debut: d4, fin: d4 + HEURE, notifier: false });
    const CONV4 = r4.j.reunion.conv;
    v('population : Ana ouvre seule la salle d\'une seconde réunion', (await a1.post('/api/reunions/' + r4.j.reunion.id + '/rejoindre', {})).code, 200);
    avancer(11 * MIN);                  // perduMs = 10 min : son appareil s'est tu, le balayeur la sort
    vrai('⛔ … et quand l\'appareil du dernier se TAIT (le balayeur le sort) : le compte rendu part aussi', await T.attendre(async () => (await crsDe(CONV4)).length === 1, 10000));
    const G2 = S.convCreerGroupe({ createur: ana.id, nom: 'Équipe 2', membres: [ben.id], annonces_seules: false, ephemere_s: 0 }).id;
    const ag2 = (await a1.post('/api/appels', { conv: G2, type: 'audio' })).j.appel.id;
    await b1.post('/api/appels/' + ag2 + '/repondre', { accepte: true });
    avancer(MIN);
    await b1.post('/api/appels/' + ag2 + '/quitter', {}); await a1.post('/api/appels/' + ag2 + '/quitter', {});
    const dansG2 = ((await a1.get('/api/conversations/' + G2 + '/messages')).j.messages || []);
    v('⛔ un appel de GROUPE que tout le monde quitte n\'en fait pas (population : la conversation est lue, l\'appel y est dit)', [dansG2.length > 0, dansG2.filter(mm => mm.meta && mm.meta.k === 'compte_rendu').length], [true, 0]);

    console.log('\n5. Un appel de groupe terminé n\'en fait pas ; une série repart décochée');
    const G = S.convCreerGroupe({ createur: ana.id, nom: 'Équipe', membres: [ben.id], annonces_seules: false, ephemere_s: 0 }).id;
    const ag = (await a1.post('/api/appels', { conv: G, type: 'audio' })).j.appel.id;
    await b1.post('/api/appels/' + ag + '/repondre', { accepte: true });
    avancer(2 * MIN);
    v('population : Ana termine l\'appel de groupe pour tous', (await a1.post('/api/salles/' + ag + '/terminer', {})).code, 200);
    const dansG = ((await a1.get('/api/conversations/' + G + '/messages')).j.messages || []);
    v('⛔ aucun compte rendu dans le groupe (population : la conversation est lue)', [Array.isArray(dansG), dansG.filter(mm => mm.meta && mm.meta.k === 'compte_rendu').length], [true, 0]);
    const d2 = maintenant() + 5 * MIN;
    const serie = await a1.post('/api/reunions', { titre: 'Point hebdo', debut: d2, fin: d2 + HEURE, repetition: 'hebdomadaire', invites: [ben.id], notifier: false, ordre_du_jour: ['Tour de table', 'Sécurité'] });
    const RS = serie.j.reunion.id;
    await a1.post('/api/reunions/' + RS + '/ordre-du-jour', { point: (await odjDe(a1, RS))[0].id, fait: true });
    v('population : la série est programmée, « Tour de table » coché', [serie.code, (await odjDe(a1, RS)).map(p => p.fait)], [201, [true, false]]);
    const s2 = (await a1.post('/api/reunions/' + RS + '/rejoindre', {})).j.appel.id;
    await b1.post('/api/reunions/' + RS + '/rejoindre', {});
    avancer(5 * MIN);
    await a1.post('/api/salles/' + s2 + '/terminer', {});
    const crS = ((await a1.get('/api/conversations/' + serie.j.reunion.conv + '/messages')).j.messages || []).filter(mm => mm.meta && mm.meta.k === 'compte_rendu');
    v('le compte rendu de la séance dit « Tour de table » coché…', crS.length === 1 && crS[0].meta.points.map(p => p.fait), [true, false]);
    v('⛔ … et la série repart DÉCOCHÉE pour la semaine prochaine (les points restent)', (await odjDe(a1, RS)).map(p => [p.texte, p.fait]), [['Tour de table', false], ['Sécurité', false]]);

    console.log('\n6. L\'export de ses données emporte l\'ordre du jour');
    const ex = await a1.post('/api/compte/export', {});
    const reu = ex.code === 200 ? ((ex.j && ex.j.reunions) || []).find(r => r.id === R) : null;
    v('l\'export d\'Ana dit l\'ordre du jour de « Revue chantier »', reu && reu.ordre_du_jour, [{ texte: 'Budget', fait: true }, { texte: 'Planning (modifié)', fait: false }, { texte: 'Sécurité', fait: true }, { texte: 'Questions', fait: false }]);
  } catch (err) {
    vrai('le banc s\'est déroulé sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    await svc.arreter();
  }
  fin();
})();
