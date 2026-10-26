/* ⛔ CE QUE CE FICHIER GARDE — « QUAND ÇA SE COUPE, LE LIEN EST MORT » (Justin, 26 octobre 2026) : la vie du lien et des sessions de l'invité sans compte, jouée sur le VRAI service avec de VRAIS flux d'événements.

     1. SON FLUX EST CELUI DE SA PLACE : ce qui arrive à Paul (admis, un signal d'un participant, une main levée dans la salle) lui arrive ; ce qui se dit dans la CONVERSATION de la réunion ne lui arrive JAMAIS (un compte, lui, le reçoit —
        la contre-épreuve) ;
     2. L'ORGANISATEUR TERMINE : Paul reçoit la fin de la réunion, puis son flux SE FERME ; sa session est coupée, le jeton est mort (« Cette réunion est terminée »), toute ouverture ultérieure le dit ;
     3. LE DERNIER COMPTE S'EN VA : même sort — la salle finit, les flux des invités se ferment ;
     4. LA RÉUNION EST ANNULÉE (ou supprimée) : même sort pour celui qui attend et celui qui est dedans ;
     5. RÉGÉNÉRER : l'ancien jeton MEURT (« Ce lien a été remplacé »), ceux qui attendaient avec lui sont renvoyés (flux fermé, session coupée), celui que l'organisateur a déjà fait entrer RESTE ; le nouveau jeton marche ;
     6. L'ÉCHÉANCE : le jeton d'une réunion passée est mort (fin de la réunion + fenêtre d'entrée), même s'il n'a jamais servi ; une session échue (six heures) est coupée et son flux se ferme au balayage ;
     7. REVENIR : une page rechargée reprend sa place (la session vit) ; partir pour de bon coupe la session, et le lien, lui, reste valable tant que la salle vit.
   ⛔ Un événement qu'on n'a pas reçu ne prouve rien : chaque absence est précédée d'une contre-épreuve qui montre que le flux, lui, reçoit. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (170 s)'); process.exit(1); }, 170000).unref();
const FETCH = globalThis.fetch;

/* le flux d'un invité : `GET /api/invite/flux` avec son cookie (T.flux ne lit que /api/flux) */
async function fluxInvite(c, chemin = '/api/invite/flux') {
  const ctrl = new AbortController();
  const h = { Accept: 'text/event-stream' }; const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
  const r = await FETCH(c.base + chemin, { headers: h, signal: ctrl.signal });
  const f = { statut: r.status, evenements: [], ferme: false };
  if (r.status !== 200) { f.fermer = () => {}; return f; }
  const etat = { tampon: '' }, lecteur = r.body.getReader(), dec = new TextDecoder();
  (async () => {
    try { for (;;) { const { done, value } = await lecteur.read(); if (done) break; T.analyserTrames(etat, dec.decode(value, { stream: true }), t => { if (!t.commentaire) f.evenements.push(t); }); } } catch (e) { /* coupé */ }
    f.ferme = true;
  })();
  f.fermer = () => { try { ctrl.abort(); } catch (e) { /* déjà */ } };
  f.attendre = (pred, plafond = 8000) => T.attendre(() => f.evenements.find(pred) || null, plafond, 5);
  f.attendreFerme = (plafond = 8000) => T.attendre(() => f.ferme, plafond, 10);
  f.donnees = (pred) => f.evenements.filter(pred).map(e => { try { return JSON.parse(e.data); } catch (x) { return null; } });
  return f;
}

(async () => {
  const B = await O.monter();
  const { svc, S } = B;
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  const aper = (jeton) => T.client(svc.base).post('/api/invite/apercu', { jeton }).then(dit);
  try {
    /* ═══ 1. SON FLUX EST CELUI DE SA PLACE ═══ */
    console.log('1. son flux : sa place, pas la conversation');
    const ana = B.pers('Ana'), ben = B.pers('Ben');
    S.contactLier(ana.id, ben.id); S.contactLier(ben.id, ana.id);
    const a1 = B.cl(ana), b1 = B.cl(ben);
    const rid = await B.programmer(a1, { invites: [ben.id] });
    const jeton = await B.lien(a1, rid);
    const sid = await B.entrerSalle(a1, rid, 'audio');
    await B.entrerSalle(b1, rid, 'audio');
    const paul = await B.invite(jeton, 'Paul', 'Plomberie Durand');
    const fP = await fluxInvite(paul.c), fB = await T.flux(b1);
    vrai('population : les flux de Paul (invité) et de Ben (compte) sont ouverts', fP.statut === 200 && fB.statut === 200);
    await fP.attendre(e => e.event === 'bonjour');
    vrai('Paul reçoit le « bonjour » du flux', fP.evenements.some(e => e.event === 'bonjour'));
    await a1.post('/api/salles/' + sid + '/admettre', { uid: paul.id });
    const ev = await fP.attendre(e => e.event === 'appel' && JSON.parse(e.data).moi.statut === 'present');
    v('⛔ admis, Paul en est INFORMÉ par son flux (la vue de la salle, avec sa place « present »)', !!ev, true);
    const sg = await a1.post('/api/appels/' + sid + '/signal', { a: paul.id, type: 'offre', donnees: { sdp: 'v=0' } });
    v('Ana relaie une offre vers Paul (200)', sg.code, 200);
    const evS = await fP.attendre(e => e.event === 'signal');
    v('… Paul la reçoit sur son flux (de qui, de quel genre — le contenu n\'est pas lu par le service)', [!!evS, evS && JSON.parse(evS.data).de, evS && JSON.parse(evS.data).type], [true, ana.id, 'offre']);
    await a1.post('/api/salles/' + sid + '/main', { actif: true });
    const evM = await fP.attendre(e => e.event === 'salle_evt' && JSON.parse(e.data).k === 'main');
    vrai('… et la main levée d\'Ana dans la salle (un éphémère de salle)', !!evM);
    const conv = un('SELECT conv FROM reunion WHERE id = ?', rid).conv;
    const msg = await a1.post('/api/conversations/' + conv + '/messages', { cid: 'cid-3055-0001', texte: 'Message confidentiel pour l\'équipe' });
    v('Ana écrit dans la conversation de la réunion (201)', msg.code, 201);
    const evB = await fB.attendre(e => e.event === 'message' && /confidentiel/.test(JSON.stringify(e.data)));
    v('contre-épreuve : Ben, un compte, REÇOIT ce message sur son flux', !!evB, true);
    await T.dort(400);
    v('⛔ Paul ne le reçoit PAS — ni aucun événement de message, de conversation, de contact ou de présence', fP.evenements.filter(e => !['bonjour', 'appel', 'signal', 'salle_evt', 'pouls', 'resync', 'fin'].includes(e.event)).map(e => e.event), []);
    vrai('population : Paul a reçu au moins quatre événements (bonjour, appel, signal, main)', fP.evenements.length >= 4);

    /* ═══ 2. L'ORGANISATEUR TERMINE ═══ */
    console.log('2. l\'organisateur termine : la fin, puis le flux se ferme');
    const t = await a1.post('/api/salles/' + sid + '/terminer', {});
    v('Ana termine pour tous (200)', t.code, 200);
    const evFin = await fP.attendre(e => e.event === 'appel' && ['fini', 'annule'].includes(JSON.parse(e.data).etat));
    v('⛔ Paul reçoit la FIN de la réunion sur son flux', !!evFin, true);
    await fP.attendreFerme();
    v('⛔ … puis son flux SE FERME (le service le coupe)', fP.ferme, true);
    v('… sa session est morte : 401 partout', [(await paul.c.get('/api/invite/etat')).code, (await paul.c.post('/api/invite/main', { actif: true })).code, (await paul.c.get('/api/invite/ice')).code], [401, 401, 401]);
    v('⛔ et le lien aussi : « Cette réunion est terminée »', [await aper(jeton), dit(await B.invite(jeton, 'Retardataire', '').then(x => x.rep))], [[410, 'reunion_terminee'], [410, 'reunion_terminee']]);
    fB.fermer();

    /* ═══ 3. LE DERNIER COMPTE S'EN VA ═══ */
    console.log('3. le dernier compte s\'en va : la salle finit, le flux de l\'invité se ferme');
    const ana3 = B.pers('Ana3'), a3 = B.cl(ana3), rid3 = await B.programmer(a3), j3 = await B.lien(a3, rid3);
    const sid3 = await B.entrerSalle(a3, rid3, 'audio');
    const q = await B.invite(j3, 'Quentin', ''), fQ = await fluxInvite(q.c);
    await a3.post('/api/salles/' + sid3 + '/admettre', { uid: q.id });
    await fQ.attendre(e => e.event === 'appel' && JSON.parse(e.data).moi.statut === 'present');
    await a3.post('/api/appels/' + sid3 + '/quitter', {});
    await fQ.attendreFerme();
    v('⛔ Ana (le dernier compte) part : le flux de Quentin se ferme, la salle est finie, le lien est mort', [fQ.ferme, un('SELECT etat FROM appel WHERE id = ?', sid3).etat, await aper(j3)], [true, 'fini', [410, 'reunion_terminee']]);

    /* ═══ 4. LA RÉUNION EST ANNULÉE ═══ */
    console.log('4. la réunion est annulée : celui qui attend et celui qui est dedans sont coupés');
    const ana4 = B.pers('Ana4'), a4 = B.cl(ana4), rid4 = await B.programmer(a4), j4 = await B.lien(a4, rid4);
    const sid4 = await B.entrerSalle(a4, rid4, 'audio');
    const dedans = await B.invite(j4, 'Dedans', ''), porte = await B.invite(j4, 'Porte', '');
    await a4.post('/api/salles/' + sid4 + '/admettre', { uid: dedans.id });
    const fD = await fluxInvite(dedans.c), fPo = await fluxInvite(porte.c);
    await fD.attendre(e => e.event === 'bonjour'); await fPo.attendre(e => e.event === 'bonjour');
    const an = await a4.post('/api/reunions/' + rid4 + '/annuler', { notifier: false });
    v('Ana annule la réunion (200)', an.code, 200);
    await fD.attendreFerme(); await fPo.attendreFerme();
    v('⛔ les deux flux se ferment, les deux sessions sont mortes (401)', [fD.ferme, fPo.ferme, (await dedans.c.get('/api/invite/etat')).code, (await porte.c.get('/api/invite/etat')).code], [true, true, 401, 401]);
    v('… et le lien est mort : une réunion annulée n\'a plus de lien d\'invité', await aper(j4).then(x => x[0]), 410);

    /* ═══ 5. RÉGÉNÉRER ═══ */
    console.log('5. régénérer : l\'ancien meurt, ceux qui attendaient sont renvoyés, ceux qu\'on a fait entrer restent');
    const ana5 = B.pers('Ana5'), a5 = B.cl(ana5), rid5 = await B.programmer(a5), j5 = await B.lien(a5, rid5);
    const sid5 = await B.entrerSalle(a5, rid5, 'audio');
    const reste = await B.invite(j5, 'Reste', ''), attend = await B.invite(j5, 'Attend', '');
    await a5.post('/api/salles/' + sid5 + '/admettre', { uid: reste.id });
    const fR = await fluxInvite(reste.c), fA = await fluxInvite(attend.c);
    await fR.attendre(e => e.event === 'bonjour'); await fA.attendre(e => e.event === 'bonjour');
    const rg = await a5.post('/api/reunions/' + rid5 + '/invite/regenerer', {});
    v('Ana régénère le lien (200) : un autre jeton, l\'ancien est dit « ancien », un invité renvoyé', [rg.code, rg.j.jeton !== j5, rg.j.ancien, rg.j.coupes], [200, true, true, 1]);
    await fA.attendreFerme();
    v('⛔ celui qui ATTENDAIT avec l\'ancien est renvoyé : flux fermé, session coupée (401)', [fA.ferme, (await attend.c.get('/api/invite/etat')).code], [true, 401]);
    v('⛔ celui qu\'Ana avait fait ENTRER reste : sa session vit, sa place aussi', [(await reste.c.get('/api/invite/etat')).j.appel.moi.statut, fR.ferme], ['present', false]);
    v('⛔ l\'ancien jeton MEURT : « Ce lien a été remplacé » (410 `lien_remplace`) — à l\'aperçu comme à l\'entrée', [await aper(j5), dit((await B.invite(j5, 'Tard', '')).rep)], [[410, 'lien_remplace'], [410, 'lien_remplace']]);
    const neuf = await B.invite(rg.j.jeton, 'Nouveau', '');
    v('le NOUVEAU jeton marche : le client attend à la porte (201)', [neuf.rep.code, neuf.rep.j.appel.moi.statut], [201, 'attente']);
    v('… un seul jeton vit par réunion (l\'ancien n\'est plus qu\'une empreinte notée)', [un('SELECT COUNT(*) AS n FROM reunion WHERE id = ? AND inv_h IS NOT NULL', rid5).n, un('SELECT COUNT(*) AS n FROM invite_lien_mort WHERE reunion = ? AND motif = \'remplace\'', rid5).n], [1, 1]);
    const rg2 = await a5.post('/api/reunions/' + rid5 + '/invite/regenerer', {});
    v('une seconde régénération tue aussi le jeton précédent', [rg2.code, await aper(rg.j.jeton)], [200, [410, 'lien_remplace']]);
    fR.fermer();

    /* ═══ 7. REVENIR ═══ */
    console.log('6. revenir : la page rechargée reprend sa place ; partir coupe la session, pas le lien');
    const ana7 = B.pers('Ana7'), a7 = B.cl(ana7), rid7 = await B.programmer(a7), j7 = await B.lien(a7, rid7);
    const sid7 = await B.entrerSalle(a7, rid7, 'audio');
    const r7 = await B.invite(j7, 'Roger', 'Atelier');
    await a7.post('/api/salles/' + sid7 + '/admettre', { uid: r7.id });
    const rel = await r7.c.post('/api/invite/redemander', {});
    v('la page est rechargée : la session vit, il retrouve sa place (200, `deja`, présent) — sans repasser par la porte', [rel.code, rel.j.deja, rel.j.appel.moi.statut], [200, true, 'present']);
    const part = await r7.c.post('/api/invite/quitter', {});
    v('il part pour de bon (200)', part.code, 200);
    v('⛔ sa session est coupée (401) et son cookie effacé', [(await r7.c.get('/api/invite/etat')).code, part.h.getSetCookie().some(x => /^opm-i=;/.test(x) && /max-age=0/i.test(x))], [401, true]);
    v('⛔ le lien reste valable tant que la salle vit : il le rouvre et attend à nouveau à la porte (201)', (await B.invite(j7, 'Roger', 'Atelier')).rep.code, 201);

    /* ═══ 6. L'ÉCHÉANCE ═══ */
    console.log('7. l\'échéance : le lien d\'une réunion passée est mort, même jamais servi');
    const ana8 = B.pers('Ana8'), a8 = B.cl(ana8), rid8 = await B.programmer(a8), j8 = await B.lien(a8, rid8);
    v('population : le lien est vivant avant l\'échéance', await aper(j8).then(x => x[0]), 200);
    const gs = await B.invite(j8, 'Avant', '');
    vrai('population : une réunion DONT LA SALLE N\'A JAMAIS ÉTÉ OUVERTE (aucune entrée possible)', gs.rep.code === 409);
    svc.avancer(5 * 3600000);                                    // la réunion finissait dans une heure, la fenêtre d'entrée dure trois heures de plus : il y a cinq heures de plus
    v('⛔ cinq heures plus tard : le jeton est mort (410 `reunion_terminee`), à l\'aperçu comme à l\'entrée', [await aper(j8), dit((await B.invite(j8, 'Après', '')).rep)], [[410, 'reunion_terminee'], [410, 'reunion_terminee']]);
    v('… l\'organisateur qui redemande son lien en reçoit un NEUF (et l\'ancien reste mort)', await (async () => { const nj = await a8.post('/api/reunions/' + rid8 + '/invite/lien', {}); return [nj.code, nj.j.jeton !== j8]; })(), [200, true]);

    /* ═══ 7. SANS BALAYAGE : LA SESSION ÉCHUE ET LE JETON DE QUATORZE JOURS SE JUGENT D'EUX-MÊMES ═══
       Au balayage (une seconde), la session échue est coupée par la boucle de fond : la garde qui la juge à la LECTURE n'est alors jamais seule à la voir. Un second service dont le balayage ne repasse qu'au bout d'une minute
       (il passe une fois au démarrage) prouve chacune des deux gardes : la session lue après six heures, et le jeton d'une réunion très longue, mort quatorze jours après sa pose. */
    console.log('8. sans balayage : six heures pour la session, quatorze jours pour le jeton');
    const B2 = await O.monter({ service: { config: { appels: { balayageMs: 60000, perduMs: 600000 } } } });
    try {
      const raw2 = () => new (require('node:sqlite').DatabaseSync)(path.join(B2.svc.data, 'msg.db'));
      const ana9 = B2.pers('Ana9'), a9 = B2.cl(ana9), rid9 = await B2.programmer(a9), j9 = await B2.lien(a9, rid9);
      await B2.entrerSalle(a9, rid9, 'audio');
      const paul9 = await B2.invite(j9, 'Paul', 'Plomberie Durand');
      v('population : Paul est à la porte, sa session vit (200)', [paul9.rep.code, (await paul9.c.get('/api/invite/etat')).code], [201, 200]);
      /* une réunion de SIX SEMAINES : sa fin plus la fenêtre d'entrée dépasse de loin quatorze jours */
      const ana10 = B2.pers('Ana10'), a10 = B2.cl(ana10), rid10 = await B2.programmer(a10), j10 = await B2.lien(a10, rid10);
      { const d = raw2(); try { d.prepare('UPDATE reunion SET fin = ? WHERE id = ?').run(Date.now() + 42 * 86400000, rid10); } finally { d.close(); } }
      v('population : le jeton de la réunion longue est vivant (200)', (await T.client(B2.svc.base).post('/api/invite/apercu', { jeton: j10 })).code, 200);
      await T.dort(1600);                                       // le balayage du démarrage est passé : ni lui ni la boucle ne coupent plus rien d'ici une minute
      B2.svc.avancer(7 * 3600000);
      v('⛔ sept heures plus tard, SANS balayage : la session d\'invité est échue, elle est refusée à la lecture (401 `session_requise`)', dit(await paul9.c.get('/api/invite/etat')), [401, 'session_requise']);
      v('… le jeton de la réunion longue, lui, vit encore (200) : la fin de la réunion est dans six semaines', (await T.client(B2.svc.base).post('/api/invite/apercu', { jeton: j10 })).code, 200);
      B2.svc.avancer(15 * 86400000);
      v('⛔ quinze jours après sa pose : le jeton de la réunion longue est MORT (410 `reunion_terminee`), bien que la réunion finisse dans quatre semaines', dit(await T.client(B2.svc.base).post('/api/invite/apercu', { jeton: j10 })), [410, 'reunion_terminee']);
    } finally { await B2.arreter(); }
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
