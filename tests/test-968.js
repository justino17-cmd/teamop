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
   Et ce que la relecture du gardien a ajouté (8 octobre 2026) :
     · ⛔ le résumé compte le non-lu comme la PASTILLE (`convListe`, `non_lus`) : un message du système, un message supprimé pour tous, un message masqué pour soi ne sont
       pas « nouveaux » — et la définition est comparée à la pastille, conversation par conversation ;
     · ⛔ une réunion tenue HORS des heures : le Pro qui y arrive attend la reprise des HEURES (il ne part pas dans le résumé de la réunion, à 3 h du matin) ; le Perso,
       lui, se résume à la sortie de la réunion, comme avant ;
     · ⛔ la mémoire PLEINE laisse sonner (le banc la règle à 2 conversations et 1 personne : `push.retenusConvsMax`, `push.retenusPersonnesMax`) : la conversation de trop
       SONNE, la personne de trop SONNE — et le résumé déjà retenu de la première n'est pas effacé.
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
  /* les plafonds de la mémoire de ce qui est retenu (réunion, heures) : réglables — le banc les abaisse plus bas —, bornés, et un réglage absurde refuse le démarrage */
  const { pushConfig } = require(path.join(T.SERVICE, 'config.js'));
  const pcfg = (push) => pushConfig({ push }, {}, 'beta');
  const lance = (f) => { try { f(); return 'passe'; } catch (e) { return e.code; } };
  v('la mémoire retenue : 100 conversations par personne et 20 000 personnes par défaut', [pcfg({}).retenusConvsMax, pcfg({}).retenusPersonnesMax], [100, 20000]);
  v('⛔ zéro, au-delà des bornes, fractionnaire ou écrit en texte : le démarrage est REFUSÉ',
    [lance(() => pcfg({ retenusConvsMax: 0 })), lance(() => pcfg({ retenusConvsMax: 1001 })), lance(() => pcfg({ retenusPersonnesMax: 0 })), lance(() => pcfg({ retenusPersonnesMax: 1.5 })), lance(() => pcfg({ retenusConvsMax: '2' }))],
    Array(5).fill('CONFIG'));
  v('   et les bornes elles-mêmes passent', [pcfg({ retenusConvsMax: 1 }).retenusConvsMax, pcfg({ retenusConvsMax: 1000 }).retenusConvsMax, pcfg({ retenusPersonnesMax: 1 }).retenusPersonnesMax, pcfg({ retenusPersonnesMax: 1000000 }).retenusPersonnesMax], [1, 1000, 1, 1000000]);
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
  const svc = await T.lancerService({ horloge: true, env: { OPMSG_TEST_PUSH: fps.hote }, config: { balayageMs: 150, presenceGraceMs: 300, appels: { balayageMs: 100, perduMs: 600000 },
    push: { ackMs: 600, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid', retenusConvsMax: 2, retenusPersonnesMax: 1 } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const recus = (d) => fps.envois.filter(e => e.chemin === d.chemin).map(e => JSON.parse(P.dechiffrer(d, e.corps)));
  const attendreN = (d, n, ms) => T.attendre(() => recus(d).length >= n, ms || 8000, 10);
  const flux = [];
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
    /* attendre k notifications qui ne sont PAS des sonneries d'appel (une page ouverte retarde chaque push de `ackMs` : une sonnerie peut arriver après la mesure) */
    const attendreHA = (d, n0, k) => T.attendre(() => sansAppels(recus(d).slice(n0)).length >= k, 8000, 10);

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

    /* la reprise suivante : cinq minutes après le DÉBUT de la plage, le lendemain si besoin — l'étape d'après PROUVE où elle tombe */
    const versReprise = () => { const lm = H.instantLocal(Date.now() + decalage, 'Europe/Paris').minute; avancer(((((DANS2H - lm) % 1440) + 1440) % 1440 + 5) * 60000); };
    const lireTout = async (X, conv) => { const d = ((await X.get('/api/conversations/' + conv + '/messages')).j.messages || []).reduce((m, x) => Math.max(m, x.seq), 0); return (await X.post('/api/conversations/' + conv + '/lu', { seq: d })).code; };

    console.log('\n8. Ce que la pastille ne compte pas, le résumé ne le compte pas : un message du système, un supprimé, un masqué');
    const remis = await b.post('/api/moi/maj', { prefs: { heures_pro: reglage } });
    vrai('population : Ben remet ses heures, et l\'horloge du service est HORS de la plage', remis.code === 200 && horsMaintenant());
    v('population : Ben a tout lu dans « Chantier » et dans « Devis »', [await lireTout(b, PRO1), await lireTout(b, PRO2)], [200, 200]);
    const n6 = recus(dB).length;
    const efface = await envoyer(a, PRO1, 'Envoyé par erreur');
    const sup = await a.post('/api/conversations/' + PRO1 + '/messages/supprimer', { seq: efface.j.seq, pour: 'tous' });
    const ajout = await a.post('/api/conversations/' + PRO1 + '/membres/ajouter', { uids: [cleo.id] });
    const masque = await envoyer(a, PRO2, 'Une remarque');
    const supMoi = await b.post('/api/conversations/' + PRO2 + '/messages/supprimer', { seq: masque.j.seq, pour: 'moi' });
    await sentinelle();
    await attendreHA(dB, n6, 1);
    v('population : Ana écrit dans « Chantier » puis le supprime pour tous, y ajoute Cléo (un message du SYSTÈME) ; elle écrit dans « Devis », que Ben masque pour lui — rien n\'a sonné (seule la sentinelle)',
      [efface.code, sup.code, (ajout.j.ajoutes || []).length, masque.code, supMoi.code, sansAppels(recus(dB).slice(n6)).map(x => x.type)], [201, 200, 1, 201, 200, ['groupe']]);
    const l8 = Object.fromEntries(((await b.get('/api/conversations')).j.conversations || []).map(x => [x.id, x]));
    v('population : la pastille de Ben dit 0 dans les deux — et il y a bien quelque chose APRÈS ce qu\'il a lu',
      [l8[PRO1].non_lus, l8[PRO1].dernier_seq > l8[PRO1].lu_seq, l8[PRO2].non_lus, l8[PRO2].dernier_seq > l8[PRO2].lu_seq], [0, true, 0, true]);
    {
      const toutes = S.convListe(ben.id);
      const ecarts = toutes.filter(x => S.pushConvNonLue(ben.id, x.id) !== (x.non_lus > 0)).map(x => x.id + ' (' + x.non_lus + ')');
      vrai('⛔ la MÊME définition que la pastille, conversation par conversation (' + toutes.length + ' conversations : ' + toutes.filter(x => x.non_lus > 0).length + ' non lues, '
        + toutes.filter(x => !x.non_lus && x.dernier_seq > x.lu_seq).length + ' à 0 avec quelque chose après ce qui a été lu)',
        toutes.length >= 4 && toutes.some(x => x.non_lus > 0) && toutes.filter(x => !x.non_lus && x.dernier_seq > x.lu_seq).length >= 2 && !ecarts.length, ecarts);
    }
    versReprise();
    vrai('population : le lendemain, l\'horloge du service est DANS la plage (la reprise a lieu)', !horsMaintenant());
    const n7 = recus(dB).length;
    await T.dort(600);                                          // plusieurs passages du balayeur DANS les heures
    await sentinelle();
    await attendreHA(dB, n7, 1);
    v('⛔ à la reprise, AUCUN résumé : ni le supprimé, ni le message du système, ni le masqué ne sont « nouveaux » — la suivante est la sentinelle', sansAppels(recus(dB).slice(n7)).map(x => x.type), ['groupe']);

    console.log('\n9. Une réunion tenue HORS des heures : le Pro attend les heures, le Perso la sortie de la réunion — et la mémoire de la réunion, pleine, laisse sonner');
    const nG = recus(dB).length;
    const REU = (await a.post('/api/conversations/groupe', { nom: 'Réunion du soir', membres: [ben.id, cleo.id] })).j.conversation.id;
    const FAM = (await c.post('/api/conversations/groupe', { nom: 'Famille', membres: [ben.id] })).j.conversation.id;
    const VOI = (await c.post('/api/conversations/groupe', { nom: 'Voisins', membres: [ben.id] })).j.conversation.id;
    await attendreHA(dB, nG, 3);                                // les trois « ajouté au groupe » de Ben : comptés AVANT la mesure
    const dC = P.appareil(fps.endpoint('cleo')); dC.chemin = '/push/cleo';
    const abC = await c.post('/api/push/abonner', { sub: dC.sub });
    avancer(60 * 60000);                                        // la fin de la plage est passée
    vrai('population : l\'horloge du service est HORS de la plage, l\'appareil de Cléo est abonné', horsMaintenant() && abC.code === 200);
    const fB = await T.flux(b); flux.push(fB);                 // la page de Ben est ouverte pendant la réunion (elle n'acquitte rien : chaque push attend `ackMs`, puis part)
    const appel = await a.post('/api/appels', { conv: REU, type: 'audio' });
    const idA = appel.j && appel.j.appel && appel.j.appel.id;
    const rep = await b.post('/api/appels/' + idA + '/repondre', { accepte: true });
    const repC = await c.post('/api/appels/' + idA + '/repondre', { accepte: true });
    v('population : Ana lance l\'appel de « Réunion du soir », Ben et Cléo répondent — tous deux DANS la salle', [appel.code, rep.code, repC.code, S.enSalle(ben.id), S.enSalle(cleo.id)], [201, 200, 200, true, true]);
    await T.dort(800);                                          // les sonneries de l'appel (une page ouverte les retarde de `ackMs`) passent avant la mesure
    const n8 = recus(dB).length, nC8 = recus(dC).length;
    /* ⛔ L'ORDRE COMPTE, ET CE N'EST PAS CELUI DES ENVOIS : la page ouverte de Ben retarde chacune de SES charges de `ackMs`, celles de Cléo (sans page) partent tout de suite.
       Ben doit entrer le PREMIER dans la mémoire de la réunion (une personne au plus) : on attend que ses trois charges soient jugées (« Voisins » sonne), PUIS Ana écrit
       dans « Chantier », dont Cléo est membre depuis l'étape 8. (Une première version envoyait tout d'un trait : Cléo occupait la mémoire avant que Ben y arrive.) */
    await envoyer(c, PERSO, 'Ciné dimanche ?');
    await envoyer(c, FAM, 'Repas de famille');
    await envoyer(c, VOI, 'Fête des voisins');
    await attendreHA(dB, n8, 1);
    await envoyer(a, PRO1, 'Point du soir');
    await sentinelle();
    await attendreHA(dB, n8, 2);
    const s8 = sansAppels(recus(dB).slice(n8));
    v('⛔ pendant la réunion : le Pro est tenu par les HEURES, « Week-end » et « Famille » par la réunion — sa mémoire est pleine (2), « Voisins » SONNE ; puis la sentinelle',
      [s8.map(x => x.type), (s8[0] || {}).tag], [['message', 'groupe'], VOI]);
    vrai('⛔ Cléo, dans la même réunion : la mémoire des personnes est pleine (Ben l\'occupe) — le message de « Chantier » SONNE chez elle au lieu d\'être retenu',
      await attendreHA(dC, nC8, 1) && (sansAppels(recus(dC).slice(nC8))[0] || {}).tag === PRO1);
    const n9 = recus(dB).length;
    const q = await b.post('/api/appels/' + idA + '/quitter', {});
    vrai('Ben quitte la réunion : le résumé de la RÉUNION arrive', q.code === 200 && await attendreHA(dB, n9, 1));
    const rr = sansAppels(recus(dB).slice(n9))[0] || {};
    v('⛔ il ne compte QUE le Perso retenu — « Pendant la réunion : nouveaux messages dans 2 conversations » (« Week-end », « Famille ») ; le Pro, lui, attend les heures',
      [rr.type, rr.tag, rr.corps, rr.url], ['resume', 'resume-reunion', 'Pendant la réunion : nouveaux messages dans 2 conversations', '/']);
    await c.post('/api/appels/' + idA + '/quitter', {});
    await a.post('/api/appels/' + idA + '/quitter', {});
    const n10 = recus(dB).length;
    await sentinelle();
    await attendreHA(dB, n10, 1);
    v('⛔ … et rien d\'autre avant l\'heure (la suivante est la sentinelle)', sansAppels(recus(dB).slice(n10)).map(x => x.type), ['groupe']);
    fB.fermer();
    versReprise();
    vrai('population : le lendemain, l\'horloge du service est DANS la plage', !horsMaintenant());
    const n11 = recus(dB).length;
    vrai('à la reprise, le résumé des HEURES arrive', await attendreHA(dB, n11, 1));
    const rh = sansAppels(recus(dB).slice(n11))[0] || {};
    v('« En dehors de tes heures : nouveaux messages pro dans une conversation » — il ouvre « Chantier » (le message pro tenu pendant la réunion de la veille)',
      [rh.type, rh.tag, rh.corps, rh.url], ['resume', 'resume-heures', 'En dehors de tes heures : nouveaux messages pro dans une conversation', '/#messages/' + PRO1]);

    console.log('\n10. La mémoire des heures, pleine, laisse SONNER (le banc la règle à 2 conversations et 1 personne)');
    const nP = recus(dB).length;
    const PRO3 = (await a.post('/api/conversations/groupe', { nom: 'Planning', membres: [ben.id] })).j.conversation.id;
    await attendreHA(dB, nP, 1);                                // « ajouté au groupe » : compté AVANT la mesure
    const r3 = await b.post('/api/conversations/' + PRO3 + '/prefs', { cote: 'pro' });
    const hC = await c.post('/api/moi/maj', { tz: 'Europe/Paris', prefs: { heures_pro: reglage } });
    const rC = await c.post('/api/conversations/' + PERSO + '/prefs', { cote: 'pro' });        // « Week-end » est Pro pour Cléo : le côté est à CHACUN
    avancer(60 * 60000);
    v('population : « Planning » rangé Pro par Ben ; Cléo a posé ses heures, « Week-end » est Pro pour elle ; l\'horloge du service HORS de la plage',
      [r3.code, hC.code, rC.code, horsMaintenant()], [200, 200, 200, true]);
    const n12 = recus(dB).length;
    await envoyer(a, PRO1, 'Un');
    await envoyer(a, PRO2, 'Deux');
    await envoyer(a, PRO3, 'Trois');
    await sentinelle();
    await attendreHA(dB, n12, 2);
    const s12 = sansAppels(recus(dB).slice(n12));
    v('⛔ deux conversations retenues — la mémoire est pleine —, la TROISIÈME sonne (« Planning »), puis la sentinelle', [s12.map(x => x.type), (s12[0] || {}).tag], [['message', 'groupe'], PRO3]);
    const nC0 = recus(dC).length;
    await envoyer(b, PERSO, 'Je serai là');
    vrai('⛔ Cléo, hors de ses heures, dans une conversation Pro pour elle : la mémoire des personnes est pleine (Ben l\'occupe) — son message SONNE au lieu d\'être retenu',
      await attendreHA(dC, nC0, 1) && (sansAppels(recus(dC).slice(nC0))[0] || {}).type === 'message');
    versReprise();
    vrai('population : le lendemain, l\'horloge du service est DANS la plage', !horsMaintenant());
    const n13 = recus(dB).length;
    vrai('à la reprise, le résumé de Ben arrive — la personne de trop ne l\'a pas effacé', await attendreHA(dB, n13, 1));
    const r13 = sansAppels(recus(dB).slice(n13))[0] || {};
    v('« … nouveaux messages pro dans 2 conversations » (« Chantier » et « Devis » ; « Planning » a sonné), l\'application s\'ouvre sur la liste',
      [r13.tag, r13.corps, r13.url], ['resume-heures', 'En dehors de tes heures : nouveaux messages pro dans 2 conversations', '/']);
  } catch (err) {
    vrai('le banc s\'est déroulé sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    for (const x of flux) { try { x.fermer(); } catch (e) { /* déjà fermé */ } }
    await svc.arreter();
    await fps.fermer();
  }
  fin();
})();
