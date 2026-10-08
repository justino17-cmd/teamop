/* ⛔ CE QUE CE FICHIER GARDE — LES HEURES DE TRAVAIL CÔTÉ PRO (familles 1 et 3 : le MODULE `heures-pro.js` seul, puis le VRAI service en HTTP, son balayeur qui tourne
   pour de bon et son horloge AVANCÉE, un FAUX SERVICE PUSH dont chaque charge est DÉCHIFFRÉE ; la base ouverte à côté).

   8 octobre 2026, Justin : « il faut bien différencier le pro et le perso, que tout soit à part » — et « ajouter les nouvelles fonctions si tu as des idées ». Le Pro a ses
   heures (`prefs.heures_pro`, dans le fuseau de la personne). Ce que le service promet :
     · ⛔ HORS des heures, un message ou une mention d'une conversation que la personne range côté PRO ne fait sonner AUCUN de ses appareils (`push.js`, `retenable`) ;
     · ⛔ le PERSO n'est jamais retenu, à aucune heure ; ce qui n'est pas un message (un ajout à un groupe) passe ;
     · à la REPRISE des heures (le balayeur passe chaque minute), UNE notification résume — « En dehors de tes heures : nouveaux messages pro dans une conversation, dont une
       mention » —, sans un nom ni un mot du texte ; ⛔ une conversation LUE entre-temps n'y est pas comptée, et rien ne part quand tout a été lu ;
     · ⛔ PAS AVANT : tant que l'heure n'est pas venue, le résumé attend ;
     · ensuite, le Pro sonne de nouveau ; coupé (`heures_pro: null`), rien n'est retenu ;
     · ⛔ la route n'écrit qu'un réglage exact ({ jours 1..7 sans doublon, debut, fin } en minutes, début ≠ fin, rien d'autre) — `null` le coupe.
   Le module : une plage qui passe minuit appartient au jour où elle COMMENCE ; l'heure d'été et d'hiver se lisent dans le fuseau ; ⛔ un réglage ou un fuseau illisibles
   ne coupent RIEN (on entend ses messages plutôt que de les perdre en silence).
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien n'a sonné » est prouvé par une SENTINELLE (une notification qui, elle, doit arriver APRÈS). */
'use strict';
const path = require('path');
const crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const H = require(path.join(T.SERVICE, 'heures-pro.js'));

/* ═══ 1. LE MODULE, SEUL ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n1. Le module : la plage, la nuit, l\'heure d\'été, le fuseau — et ce qui ne coupe rien');
{
  const SEM = { jours: [1, 2, 3, 4, 5], debut: 540, fin: 1080 };              // du lundi au vendredi, 9 h – 18 h
  const NUIT = { jours: [5], debut: 1320, fin: 360 };                          // le vendredi, 22 h – 6 h le lendemain
  const DIM = { jours: [7], debut: 1320, fin: 120 };                           // le dimanche, 22 h – 2 h : la nuit passe sur le lundi
  const h = (r, tz, iso) => H.horsHeures(r, tz, Date.parse(iso));
  v('une semaine de bureau à Paris (jeudi 8 octobre 2026) : 10 h dedans ; 8 h 59 et 18 h (la fin est EXCLUE) dehors ; samedi 10 h dehors',
    [h(SEM, 'Europe/Paris', '2026-10-08T08:00:00Z'), h(SEM, 'Europe/Paris', '2026-10-08T06:59:00Z'), h(SEM, 'Europe/Paris', '2026-10-08T16:00:00Z'), h(SEM, 'Europe/Paris', '2026-10-10T08:00:00Z')], [false, true, true, true]);
  v('⛔ le MÊME instant (10 h à Paris) est 4 h à Toronto : dehors — l\'heure se lit dans le fuseau de la personne', h(SEM, 'America/Toronto', '2026-10-08T08:00:00Z'), true);
  v('⛔ une nuit appartient au jour où elle COMMENCE : samedi 2 h (nuit du vendredi) dedans, samedi 6 h dehors, vendredi 21 h 59 dehors, dimanche 2 h dehors',
    [h(NUIT, 'Europe/Paris', '2026-10-10T00:00:00Z'), h(NUIT, 'Europe/Paris', '2026-10-10T04:00:00Z'), h(NUIT, 'Europe/Paris', '2026-10-09T19:59:00Z'), h(NUIT, 'Europe/Paris', '2026-10-11T00:00:00Z')], [false, true, true, true]);
  v('⛔ … et passe d\'une semaine à l\'autre : la nuit du dimanche couvre le lundi 1 h, pas le lundi 2 h', [h(DIM, 'Europe/Paris', '2026-10-11T23:00:00Z'), h(DIM, 'Europe/Paris', '2026-10-12T00:00:00Z')], [false, true]);
  v('⛔ l\'heure d\'hiver (25 octobre 2026) : lundi 26, 9 h 30 à Paris = 8 h 30 UTC, dedans ; 8 h 30 à Paris dehors',
    [h(SEM, 'Europe/Paris', '2026-10-26T08:30:00Z'), h(SEM, 'Europe/Paris', '2026-10-26T07:30:00Z')], [false, true]);
  v('⛔ l\'heure d\'été (29 mars 2026) : lundi 30, 9 h 30 à Paris = 7 h 30 UTC, dedans', h(SEM, 'Europe/Paris', '2026-03-30T07:30:00Z'), false);
  v('sans fuseau : Europe/Paris', [h(SEM, '', '2026-10-08T08:00:00Z'), h(SEM, null, '2026-10-08T06:00:00Z')], [false, true]);
  v('⛔ un fuseau INCONNU ne coupe rien (on entend ses messages plutôt que de les perdre)', h(SEM, 'Mars/Olympus', '2026-10-10T08:00:00Z'), false);
  const refuses = [null, undefined, [], 'lundi', { jours: [], debut: 540, fin: 1080 }, { jours: [1, 1], debut: 540, fin: 1080 }, { jours: [0], debut: 540, fin: 1080 }, { jours: [8], debut: 540, fin: 1080 },
    { jours: [1.5], debut: 540, fin: 1080 }, { jours: ['1'], debut: 540, fin: 1080 }, { jours: [1], debut: 540, fin: 540 }, { jours: [1], debut: -1, fin: 1080 }, { jours: [1], debut: 540, fin: 1440 },
    { jours: [1], debut: '540', fin: 1080 }, { jours: [1], debut: 540 }, { jours: [1], debut: 540, fin: 1080, x: 1 }, { jours: [1, 2, 3, 4, 5, 6, 7, 1], debut: 540, fin: 1080 }];
  v('⛔ dix-sept réglages REFUSÉS (vide, doublon, 0, 8, décimal, texte, début = fin, hors de 0..1439, un champ de moins, un de plus…)', refuses.map(r => H.reglageValide(r)), refuses.map(() => false));
  v('… et ils ne coupent rien', refuses.map(r => H.horsHeures(r, 'Europe/Paris', Date.parse('2026-10-10T03:00:00Z'))), refuses.map(() => false));
  v('trois réglages ACCEPTÉS (la semaine, une nuit, minuit pile)', [H.reglageValide(SEM), H.reglageValide(NUIT), H.reglageValide({ jours: [1, 2, 3, 4, 5, 6, 7], debut: 0, fin: 1439 })], [true, true, true]);
}

if (!require('fs').existsSync(path.join(T.SERVICE, 'node_modules'))) { console.log('\n  ⚠️ dépendances du service absentes : la partie service est sautée'); fin(); }
else (async () => {
  const P = require('./outils-push');
  const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
  const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
  const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
  const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
  const JOUR = 86400000;
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ horloge: true, env: { OPMSG_TEST_PUSH: fps.hote }, config: { balayageMs: 150, presenceGraceMs: 300, push: { ackMs: 600, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const recus = (d) => fps.envois.filter(e => e.chemin === d.chemin).map(e => JSON.parse(P.dechiffrer(d, e.corps)));
  const attendreN = (d, n, ms) => T.attendre(() => recus(d).length >= n, ms || 8000, 10);
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo');
    for (const [x, y] of [[ana, ben], [ana, cleo], [ben, cleo]]) S.contactLier(x.id, y.id);
    const a = cl(ana), b = cl(ben), c = cl(cleo);
    const PRO1 = (await a.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id] })).j.conversation.id;
    const PRO2 = (await a.post('/api/conversations/groupe', { nom: 'Devis', membres: [ben.id] })).j.conversation.id;
    const PERSO = (await c.post('/api/conversations/groupe', { nom: 'Week-end', membres: [ben.id] })).j.conversation.id;
    /* Ben range les deux groupes de travail côté Pro (le côté de CHACUN : Ana, elle, ne range rien) */
    const r1 = await b.post('/api/conversations/' + PRO1 + '/prefs', { cote: 'pro' }), r2 = await b.post('/api/conversations/' + PRO2 + '/prefs', { cote: 'pro' });
    const dB = P.appareil(fps.endpoint('ben')); dB.chemin = '/push/ben';
    const ab = await b.post('/api/push/abonner', { sub: dB.sub });
    const cotes = Object.fromEntries(((await b.get('/api/conversations')).j.conversations || []).map(x => [x.id, x.cote]));
    v('population : deux groupes de travail rangés Pro par Ben, un groupe d\'amis Perso, l\'appareil de Ben abonné', [r1.code, r2.code, cotes[PRO1], cotes[PRO2], cotes[PERSO], ab.code], [200, 200, 'pro', 'pro', 'perso', 200]);
    const envoyer = (X, conv, texte, mentions) => X.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'm_' + crypto.randomBytes(8).toString('hex'), texte }, mentions ? { mentions } : {}));
    let nSent = 0;
    const sentinelle = async () => { await c.post('/api/conversations/groupe', { nom: 'Sentinelle ' + (++nSent), membres: [ben.id] }); };
    const sansAppels = (l) => l.filter(x => x.type !== 'appel');

    console.log('\n2. La route : un réglage exact, ou rien');
    const mauvais = [{ jours: [], debut: 540, fin: 1080 }, { jours: [1, 1], debut: 540, fin: 1080 }, { jours: [8], debut: 540, fin: 1080 }, { jours: [1], debut: 540, fin: 540 }, { jours: [1], debut: 540, fin: 1080, x: 1 }, 'lundi', true, 42, []];
    const codes = []; for (const x of mauvais) codes.push((await b.post('/api/moi/maj', { prefs: { heures_pro: x } })).code);
    v('⛔ neuf réglages refusés : 400 champ_invalide', codes, mauvais.map(() => 400));
    v('… et rien ne s\'est écrit', (await b.get('/api/moi')).j.moi.prefs.heures_pro, undefined);

    /* l'heure du SERVICE (son horloge est la nôtre tant qu'on ne l'avance pas), vue à Paris : la plage commence dans deux heures, finit dans trois — tous les jours */
    const l = H.instantLocal(Date.now(), 'Europe/Paris');
    const DANS2H = (l.minute + 120) % 1440, DANS3H = (l.minute + 180) % 1440;
    const reglage = { jours: [7, 3, 1, 2, 4, 6, 5], debut: DANS2H, fin: DANS3H };
    /* ⛔ L'HORLOGE DU SERVICE, SUIVIE PAR LE BANC : chaque avance est comptée, et chaque étape PROUVE où elle tombe (dans la plage ou hors d'elle) — une première version
       avançait de 22 h « jusqu'au lendemain, dans la plage » et tombait une heure AVANT elle : son « aucun résumé » passait à vide, faute de reprise. */
    let decalage = 0;
    const avancer = (ms) => { decalage += ms; svc.avancer(ms); };
    const horsMaintenant = () => H.horsHeures({ jours: [1, 2, 3, 4, 5, 6, 7], debut: DANS2H, fin: DANS3H }, 'Europe/Paris', Date.now() + decalage);
    const ok = await b.post('/api/moi/maj', { tz: 'Europe/Paris', prefs: { heures_pro: reglage } });
    v('le réglage s\'écrit, les jours RANGÉS (lundi d\'abord)', [ok.code, JSON.stringify(ok.j.moi.prefs.heures_pro)], [200, JSON.stringify({ jours: [1, 2, 3, 4, 5, 6, 7], debut: DANS2H, fin: DANS3H })]);
    v('population : pour le service, il est maintenant HORS des heures de Ben', H.horsHeures(ok.j.moi.prefs.heures_pro, 'Europe/Paris', Date.now()), true);

    console.log('\n3. Hors des heures : le Pro ne sonne pas, le Perso sonne');
    const n0 = recus(dB).length;
    await envoyer(a, PRO1, 'Le chantier commence lundi');
    await envoyer(a, PRO1, '@Ben tu confirmes ?', [ben.id]);
    await envoyer(a, PRO2, 'Le devis est prêt');
    await envoyer(c, PERSO, 'Ciné samedi ?');
    await sentinelle();
    await attendreN(dB, n0 + 2);
    v('⛔ seuls le message PERSO et la sentinelle ont sonné — ni les deux messages pro, ni la mention', sansAppels(recus(dB).slice(n0)).map(x => x.type), ['message', 'groupe']);
    v('la mention est bien écrite dans l\'application (elle attend Ben)', ((await b.get('/api/notifications')).j.notifications || []).filter(x => x.type === 'mention').length, 1);

    console.log('\n4. Ben lit « Devis » sur un autre appareil ; ses heures reprennent : UN résumé, de ce qui reste à lire');
    const dernier = ((await b.get('/api/conversations/' + PRO2 + '/messages')).j.messages || []).reduce((m, x) => Math.max(m, x.seq), 0);
    v('population : Ben marque « Devis » comme lu', (await b.post('/api/conversations/' + PRO2 + '/lu', { seq: dernier })).code, 200);
    const n1 = recus(dB).length;
    await T.dort(500);                                          // plusieurs passages du balayeur (150 ms) TOUJOURS hors des heures
    v('⛔ pas avant l\'heure : rien n\'a sonné tant que les heures n\'ont pas repris', recus(dB).length, n1);
    avancer(125 * 60000);
    vrai('population : l\'horloge du service est maintenant DANS la plage', !horsMaintenant());
    vrai('le résumé arrive quand les heures reprennent', await attendreN(dB, n1 + 1));
    const r = sansAppels(recus(dB).slice(n1))[0] || {};
    v('« En dehors de tes heures : nouveaux messages pro dans une conversation, dont une mention » — « Devis », lu, n\'y est pas ; il ouvre « Chantier »',
      [r.type, r.corps, r.url, r.tag], ['resume', 'En dehors de tes heures : nouveaux messages pro dans une conversation, dont une mention', '/#messages/' + PRO1, 'resume-heures']);
    v('⛔ le résumé ne porte aucun mot du texte ni aucun nom', /chantier|devis|confirmes|Ana|Ben|Cleo/i.test(JSON.stringify(r)), false);

    console.log('\n5. Dans les heures : le Pro sonne, et aucun second résumé');
    const n2 = recus(dB).length;
    await envoyer(a, PRO1, 'Merci !');
    await attendreN(dB, n2 + 1);
    await sentinelle();
    await attendreN(dB, n2 + 2);
    v('le message pro SONNE, puis la sentinelle — ⛔ et aucun second résumé entre les deux', sansAppels(recus(dB).slice(n2)).map(x => x.type), ['message', 'groupe']);

    console.log('\n6. De nouveau hors des heures, tout lu avant la reprise : aucun résumé');
    avancer(60 * 60000 + 60000);                                // la fin de la plage est passée : dehors
    vrai('population : l\'horloge du service est HORS de la plage', horsMaintenant());
    const n3 = recus(dB).length;
    await envoyer(a, PRO1, 'Un dernier point');
    await sentinelle();
    await attendreN(dB, n3 + 1);
    v('population : hors des heures, le message pro n\'a pas sonné (seule la sentinelle)', sansAppels(recus(dB).slice(n3)).map(x => x.type), ['groupe']);
    const dernier1 = ((await b.get('/api/conversations/' + PRO1 + '/messages')).j.messages || []).reduce((m, x) => Math.max(m, x.seq), 0);
    await b.post('/api/conversations/' + PRO1 + '/lu', { seq: dernier1 });
    avancer((1440 + 120 + 5) * 60000 - decalage);               // le lendemain, cinq minutes après le DÉBUT de la plage
    vrai('population : le lendemain, l\'horloge du service est DANS la plage (la reprise a bien lieu)', !horsMaintenant());
    const n4 = recus(dB).length;
    await T.dort(600);
    await sentinelle();
    await attendreN(dB, n4 + 1);
    v('⛔ tout avait été lu : à la reprise, aucun résumé — la suivante est la sentinelle', sansAppels(recus(dB).slice(n4)).map(x => x.type), ['groupe']);

    console.log('\n7. Coupé : rien n\'est retenu');
    avancer(2 * 3600000);                                       // hors de la plage
    vrai('population : l\'horloge du service est HORS de la plage', horsMaintenant());
    const coupe = await b.post('/api/moi/maj', { prefs: { heures_pro: null } });
    v('Ben coupe ses heures de travail : le réglage disparaît', [coupe.code, coupe.j.moi.prefs.heures_pro], [200, undefined]);
    const n5 = recus(dB).length;
    await envoyer(a, PRO1, 'Tard le soir');
    await attendreN(dB, n5 + 1);
    v('⛔ coupé : le message pro sonne à toute heure', sansAppels(recus(dB).slice(n5)).map(x => x.type), ['message']);
  } catch (err) {
    vrai('le banc s\'est déroulé sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    await svc.arreter();
    await fps.fermer();
  }
  fin();
})();
