/* ⛔ CE QUE CE FICHIER GARDE — L'INVITÉ SANS COMPTE NE VOIT ET NE TOUCHE QUE LA SALLE (Justin, 26 octobre 2026 ; la règle de sécurité du 12 octobre : qui entre par le lien n'est JAMAIS promu).
   Le VRAI service, parlé en HTTP, avec une VRAIE session d'invité (à la porte, puis admis) :

     1. LA LISTE EST FERMÉE : le manifeste n'a que dix routes à garde G ou GS, toutes sous `/api/invite/` ; AUCUNE autre route du service — contacts, conversations, agenda, recherche, profil, pièces, espaces, facturation,
        réunions, salles, appels — n'accepte la session d'un invité : 401 `session_requise` partout, à la porte comme admis ; les routes publiques (P) ne disent rien de lui ;
     2. LES DEUX COOKIES NE SE PRÊTENT RIEN : le jeton d'invité posé sous le nom du cookie d'un compte ne vaut rien, le jeton d'un compte posé sous le nom du cookie d'invité non plus ;
     3. IL N'EST JAMAIS PROMU : ni hôte, ni co-hôte (403), ni successeur de l'organisateur qui s'en va (le suivant est un invité NOMMÉ), ni hôte par intérim ; quand le dernier COMPTE s'en va, la salle FINIT — un invité sans compte
        ne tient pas une salle ouverte ;
     4. SES GESTES SONT CEUX D'UN PARTICIPANT ORDINAIRE, MOINS CE QUI ENGAGE LES AUTRES : il lève la main, réagit, dit l'état de son micro et de sa caméra ; il ne partage pas son écran (403 `partage_interdit`), n'enregistre pas, ne dessine
        pas, n'ouvre ni sondage ni minuteur, n'admet ni n'exclut, ne verrouille pas — ces routes n'existent PAS pour lui (404) ;
     5. IL N'A PAS DE PLACE AILLEURS : pas de conversation créée, pas de contact, pas de ligne `personne` — la base ne gagne que sa ligne d'invité et sa ligne de salle.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : la boucle des routes compte sa population avant de conclure. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { MANIFESTE } = require(path.join(T.SERVICE, 'manifeste.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (150 s)'); process.exit(1); }, 150000).unref();

(async () => {
  const B = await O.monter();
  const { svc, S } = B;
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const un = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  try {
    const ana = B.pers('Ana'), ben = B.pers('Ben'), cleo = B.pers('Cleo');
    for (const p of [ben, cleo]) { S.contactLier(ana.id, p.id); S.contactLier(p.id, ana.id); }
    const a1 = B.cl(ana), b1 = B.cl(ben), c1 = B.cl(cleo);
    const rid = await B.programmer(a1, { invites: [ben.id, cleo.id] });
    const jeton = await B.lien(a1, rid);
    const sid = await B.entrerSalle(a1, rid, 'audio');
    const canari = 'Zorglub-Canari-Entreprise';
    const paul = await B.invite(jeton, 'Paul-Canari', canari);
    vrai('population : Paul attend à la porte', paul.rep.code === 201 && paul.rep.j.appel.moi.statut === 'attente');

    /* ═══ 1. LA LISTE EST FERMÉE ═══ */
    console.log('1. la liste est fermée : dix routes, toutes sous /api/invite/');
    const fermees = MANIFESTE.filter(r => ['G', 'GS'].includes(r.garde));
    v('⛔ le manifeste n\'a que DIX routes à garde G ou GS — et toutes sont sous `/api/invite/`', [fermees.length, fermees.every(r => r.p.startsWith('/api/invite/'))], [10, true]);
    v('… les voici (chemin et garde)', fermees.map(r => r.m + ' ' + r.p.replace('/api/invite/', '') + ' ' + r.garde).sort(),
      ['GET etat G', 'GET flux G', 'GET ice GS', 'POST main GS', 'POST media GS', 'POST quitter G', 'POST reaction GS', 'POST redemander G', 'POST signal GS', 'POST visio GS'].sort());
    const params = (p) => p.replace(/:[a-z]+/g, (m) => (m === ':id' ? 'c_' + '0'.repeat(32) : '1'));
    const hors = MANIFESTE.filter(r => !r.id.startsWith('invite.'));
    const sessions = [['à la porte', paul.c]];
    /* — Paul est admis pour la seconde passe — */
    const adm = await a1.post('/api/salles/' + sid + '/admettre', { uid: paul.id });
    vrai('population : Ana fait entrer Paul', adm.code === 200);
    sessions.push(['admis', paul.c]);
    let jouees = 0, refusees = 0, publiques = 0, fuites = [];
    for (const [quand, c] of sessions) {
      for (const r of hors) {
        const rep = await c.appel(r.m === 'FLUX' ? 'GET' : r.m, params(r.p), r.m === 'GET' ? undefined : {});
        jouees++;
        if (['P', 'B', 'LV', 'AD'].includes(r.garde)) {
          publiques++;
          if ((rep.txt || '').includes('Paul-Canari') || (rep.txt || '').includes(canari) || (rep.txt || '').includes(paul.id)) fuites.push(quand + ' ' + r.id);
          continue;
        }
        if (rep.code === 401 && rep.j && rep.j.error === 'session_requise') refusees++;
        else fuites.push(quand + ' ' + r.id + ' → ' + rep.code + ' ' + (rep.j && rep.j.error));
      }
    }
    vrai('population : ' + jouees + ' requêtes jouées (' + hors.length + ' routes × 2 états), dont ' + publiques + ' publiques', jouees === hors.length * 2 && hors.length >= 150 && publiques >= 20);
    v('⛔ TOUTE route qui n\'est pas de l\'invité refuse la session d\'invité : 401 `session_requise` (contacts, conversations, agenda, recherche, profil, pièces, espaces, réunions, salles, appels…)', [refusees, fuites], [jouees - publiques, []]);
    v('⛔ et les routes publiques ne disent rien de lui (ni son nom, ni son entreprise, ni son identifiant)', fuites.filter(x => !/→/.test(x)), []);

    /* ═══ 2. LES DEUX COOKIES NE SE PRÊTENT RIEN ═══ */
    console.log('2. les deux cookies ne se prêtent rien');
    const jetonInvite = paul.c.cookie();
    const sousCompte = T.client(svc.base); sousCompte.poserCookie(jetonInvite);
    v('⛔ le jeton d\'invité posé sous le nom du cookie d\'un COMPTE : 401 sur une route de compte', [dit(await sousCompte.get('/api/moi')), dit(await sousCompte.get('/api/contacts')), dit(await sousCompte.get('/api/conversations'))], [[401, 'session_requise'], [401, 'session_requise'], [401, 'session_requise']]);
    const sousInvite = T.client(svc.base, { nomCookie: 'opm-i' }); sousInvite.poserCookie(a1.cookie());
    v('⛔ le jeton d\'un compte posé sous le nom du cookie d\'INVITÉ : 401 sur une route d\'invité', [dit(await sousInvite.get('/api/invite/etat')), dit(await sousInvite.post('/api/invite/main', { actif: true }))], [[401, 'session_requise'], [401, 'session_requise']]);
    const inventes = [];
    for (const faux of ['opi_' + 'A'.repeat(43), 'opi_court', 'x', '', 'opi_' + 'A'.repeat(44), 'opm_' + 'A'.repeat(43)]) { const c = T.client(svc.base, { nomCookie: 'opm-i' }); c.poserCookie(faux); inventes.push((await c.get('/api/invite/etat')).code); }
    v('population : six jetons d\'invité inventés — aucun n\'ouvre rien (401)', inventes, [401, 401, 401, 401, 401, 401]);
    v('… et sans cookie du tout', (await T.client(svc.base).get('/api/invite/etat')).code, 401);

    /* ═══ 3. IL N'EST JAMAIS PROMU ═══ */
    console.log('3. il n\'est jamais promu : ni co-hôte, ni successeur, ni intérim ; le dernier compte parti, la salle finit');
    const cohote = await a1.post('/api/salles/' + sid + '/cohote', { uid: paul.id, actif: true });
    v('⛔ Ana ne peut pas nommer Paul co-hôte : 403 `interdit` (c\'est le service qui refuse, pas la page)', dit(cohote), [403, 'interdit']);
    v('… il reste grade 0', un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, paul.id).grade, 0);
    const bens = await B.entrerSalle(b1, rid, 'audio');
    v('population : Ben (invité NOMMÉ) entre : simple participant', [bens === sid, un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, ben.id).grade], [true, 0]);
    const cl3 = await B.entrerSalle(c1, rid, 'audio');
    vrai('population : Cléo (invitée nommée) est dans la salle aussi', cl3 === sid);
    await a1.post('/api/appels/' + sid + '/quitter', {});
    v('⛔ Ana PART : le suivant est un invité NOMMÉ (Ben, le plus ancien), jamais Paul', [un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, ben.id).grade, un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, paul.id).grade, un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, cleo.id).grade], [2, 0, 0]);
    const surP = await paul.c.post('/api/invite/main', { actif: true });
    v('Paul est toujours dans la salle (rien ne l\'a sorti) et lève la main (200)', [surP.code, un('SELECT statut FROM appel_part WHERE appel = ? AND uid = ?', sid, paul.id).statut], [200, 'present']);
    await b1.post('/api/appels/' + sid + '/quitter', {});
    v('Ben part : Cléo, nommée, devient l\'hôte du moment', [un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, cleo.id).grade, un('SELECT grade FROM appel_part WHERE appel = ? AND uid = ?', sid, paul.id).grade], [2, 0]);
    v('… et la salle vit encore', un('SELECT etat FROM appel WHERE id = ?', sid).etat, 'en_cours');
    const avantFin = un('SELECT inv_h FROM reunion WHERE id = ?', rid).inv_h;
    vrai('population : le lien d\'invité est vivant avant la fin', !!avantFin);
    await c1.post('/api/appels/' + sid + '/quitter', {});
    const apres = un('SELECT etat, motif FROM appel WHERE id = ?', sid);
    v('⛔ le DERNIER COMPTE part : Paul est seul dans la salle — elle FINIT (un invité sans compte ne tient pas une salle ouverte)', apres.etat, 'fini');
    v('… Paul est sorti (parti), sans grade, sans session', un('SELECT statut, grade, session FROM appel_part WHERE appel = ? AND uid = ?', sid, paul.id), { statut: 'parti', grade: 0, session: null });
    v('⛔ … sa session est coupée : plus rien ne s\'ouvre (401)', [(await paul.c.get('/api/invite/etat')).code, (await paul.c.post('/api/invite/main', { actif: true })).code], [401, 401]);
    v('⛔ … et le lien est mort avec la salle', [un('SELECT inv_h FROM reunion WHERE id = ?', rid).inv_h, dit(await T.client(svc.base).post('/api/invite/apercu', { jeton }))], [null, [410, 'reunion_terminee']]);

    /* ═══ 4. SES GESTES ═══ */
    console.log('4. ses gestes : ceux d\'un participant, moins ce qui engage les autres');
    const ana4 = B.pers('Ana4'), a4 = B.cl(ana4), rid4 = await B.programmer(a4), j4 = await B.lien(a4, rid4), sid4 = await B.entrerSalle(a4, rid4, 'audio');
    const q = await B.invite(j4, 'Quentin', 'Durand SA');
    await a4.post('/api/salles/' + sid4 + '/admettre', { uid: q.id });
    vrai('population : Quentin est admis', (await q.c.get('/api/invite/etat')).j.appel.moi.statut === 'present');
    v('il lève la main, réagit, dit l\'état de son micro et de sa caméra (200 chacun)', [(await q.c.post('/api/invite/main', { actif: true })).code, (await q.c.post('/api/invite/reaction', { emoji: 'pouce' })).code, (await q.c.post('/api/invite/media', { micro: false, camera: false })).code], [200, 200, 200]);
    v('une réaction hors liste : 400', (await q.c.post('/api/invite/reaction', { emoji: 'x' })).code, 400);
    v('⛔ il ne partage PAS son écran : 403 `partage_interdit` (annoncer un partage est refusé par le service)', dit(await q.c.post('/api/invite/media', { partage: true })), [403, 'partage_interdit']);
    v('… même quand l\'organisatrice autorise le partage à tous', (await a4.post('/api/salles/' + sid4 + '/partage', { actif: true })).code === 200 && dit(await q.c.post('/api/invite/media', { partage: true, micro: true }))[1], 'partage_interdit');
    const absentes = ['admettre', 'refuser', 'exclure', 'verrouiller', 'salle_attente', 'couper_micro', 'partage', 'rec', 'cohote', 'terminer', 'evt', 'annot', 'epingle', 'sondage', 'minuteur', 'presence', 'lien', 'regenerer', 'inviter'];
    const r404 = [];
    for (const g of absentes) r404.push([g, (await q.c.post('/api/invite/' + g, { uid: ana4.id, actif: true })).code]);
    v('⛔ population : dix-neuf gestes d\'organisateur sous `/api/invite/` — AUCUN n\'existe (404)', [r404.length, r404.filter(x => x[1] !== 404)], [19, []]);
    const surSalle = [];
    for (const g of ['admettre', 'exclure', 'terminer', 'rec', 'verrouiller', 'cohote']) surSalle.push((await q.c.post('/api/salles/' + sid4 + '/' + g, { uid: ana4.id, actif: true })).code);
    v('… ni par les routes d\'une salle ordinaire (401 : sa session n\'y est pas lue)', surSalle, [401, 401, 401, 401, 401, 401]);
    v('⛔ il lit le rapport de présence ? Non : c\'est l\'organisateur seul (401 pour lui)', (await q.c.get('/api/salles/' + sid4 + '/presence')).code, 401);
    const visio = await q.c.post('/api/invite/visio', {});
    v('le jeton de visio d\'un admis : il passe la garde (la salle est en maille ici : 409 `pas_de_visio`, pas 401)', dit(visio), [409, 'pas_de_visio']);

    /* ═══ 5. PAS DE PLACE AILLEURS ═══ */
    console.log('5. pas de compte, pas de contact, pas de conversation');
    const compte = (sql, ...a) => un(sql, ...a).n;
    const avantP = [compte('SELECT COUNT(*) AS n FROM personne'), compte('SELECT COUNT(*) AS n FROM conversation'), compte('SELECT COUNT(*) AS n FROM contact'), compte('SELECT COUNT(*) AS n FROM membre'), compte('SELECT COUNT(*) AS n FROM session')];
    const ana5 = B.pers('Ana5'), a5 = B.cl(ana5), rid5 = await B.programmer(a5), j5 = await B.lien(a5, rid5);
    await B.entrerSalle(a5, rid5, 'audio');
    const avantG = [compte('SELECT COUNT(*) AS n FROM personne'), compte('SELECT COUNT(*) AS n FROM conversation'), compte('SELECT COUNT(*) AS n FROM contact'), compte('SELECT COUNT(*) AS n FROM membre'), compte('SELECT COUNT(*) AS n FROM session'), compte('SELECT COUNT(*) AS n FROM invite_sans_compte')];
    const r5 = await B.invite(j5, 'Rémi', 'Atelier');
    const apresG = [compte('SELECT COUNT(*) AS n FROM personne'), compte('SELECT COUNT(*) AS n FROM conversation'), compte('SELECT COUNT(*) AS n FROM contact'), compte('SELECT COUNT(*) AS n FROM membre'), compte('SELECT COUNT(*) AS n FROM session'), compte('SELECT COUNT(*) AS n FROM invite_sans_compte')];
    vrai('population : Rémi est entré', r5.rep.code === 201);
    v('⛔ son entrée n\'a créé NI compte (`personne`), NI conversation, NI contact, NI membre, NI session de compte — rien qu\'une ligne d\'invité', [apresG.slice(0, 5), apresG[5] - avantG[5]], [avantG.slice(0, 5), 1]);
    vrai('population : les comptes comptés existent (' + avantP[0] + ' personnes)', avantP[0] >= 4);
    v('… son identifiant n\'est pas celui d\'un compte (`g_`, jamais `p_`) et n\'existe pas dans `personne`', [/^g_[0-9a-f]{32}$/.test(r5.id), compte('SELECT COUNT(*) AS n FROM personne WHERE id = ?', r5.id)], [true, 0]);
    const noms = un('SELECT nom_ch, ent_ch FROM invite_sans_compte WHERE id = ?', r5.id);
    vrai('⛔ son nom et son entreprise sont SCELLÉS dans la base (ni "Rémi" ni "Atelier" en clair dans la ligne)', Buffer.from(noms.nom_ch).indexOf('Rémi') < 0 && Buffer.from(noms.ent_ch).indexOf('Atelier') < 0);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
