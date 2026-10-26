/* ⛔ CE QUE CE FICHIER GARDE — LE LIEN « INVITÉ (SANS COMPTE) » ET L'ENTRÉE À LA PORTE (Justin, 26 octobre 2026 : « ils cliquent sur le lien, ils peuvent rejoindre la réunion. Moi je valide que c'est bien eux »).
   Le VRAI service, dans un processus isolé, parlé en HTTP. Un client VIERGE (aucun compte, aucun cookie de compte) ouvre un lien, se présente, et ATTEND à la porte de la salle.

     1. LE JETON : 192 bits (24 octets tirés au hasard, 32 caractères), différent d'une réunion à l'autre et stable pour une même réunion ; JAMAIS rangé en clair — la base ne porte que son EMPREINTE (HMAC) et le jeton SCELLÉ,
        et le jeton ne se retrouve nulle part dans les octets de la base ni de son journal ; il vaut pour UNE réunion (le jeton d'une autre n'ouvre pas celle-ci) ;
     2. L'APERÇU est public et n'est que le titre et l'organisateur — aucun identifiant, aucun participant, aucun horaire ; un jeton faux, mal formé ou absent : la MÊME réponse (410 `lien_invalide`) ;
     3. L'ENTRÉE : sans salle ouverte, 409 `pas_ouverte` et RIEN n'est écrit (ni ligne, ni cookie) ; salle ouverte, le client arrive TOUJOURS à la porte — même quand la salle d'attente n'est pas demandée —, son cookie de
        session est `HttpOnly` et `SameSite=Strict`, sans date ; il lit sa place et rien d'autre (ni qui est dedans, ni combien, ni les identifiants internes de la réunion) ;
     4. L'ORGANISATEUR le voit : « Paul — Plomberie Durand · invité sans compte » (les champs `invite_sans_compte` et `entreprise`), et choisit « Faire entrer » ou « Refuser » (les gestes d'une salle ordinaire) ;
     5. LE NOM EST BORNÉ ET NETTOYÉ : 60 signes, 80 pour l'entreprise, les caractères de commande et de renversement du sens du texte tombent, les espaces se replient ; vide ou invisible : `nom_requis` ;
        un nom hostile (`<img onerror>`) est gardé comme du TEXTE, rendu en JSON avec `nosniff` — c'est la page qui l'écrit en `textContent` (`test-3053`) ;
     6. UN INVITÉ REFUSÉ N'ENTRE PAS ET UN INVITÉ JAMAIS ADMIS NON PLUS : ni relais (`ice`), ni signal, ni main levée, ni jeton de visio, et la salle ne lui relaie rien (`salleSessions`).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque absence est précédée de la population qu'elle aurait pu compter. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const O = require('./outils-invite');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

(async () => {
  const B = await O.monter();
  const { svc, S } = B;
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const lignes = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  const dit = (r) => [r.code, r.j && r.j.error];
  try {
    const ana = B.pers('Ana'), ben = B.pers('Ben');
    S.contactLier(ana.id, ben.id); S.contactLier(ben.id, ana.id);
    const a1 = B.cl(ana), b1 = B.cl(ben);
    const rid = await B.programmer(a1, { invites: [ben.id] });

    /* ═══ 1. LE JETON ═══ */
    console.log('1. le jeton : 192 bits, stable, propre à la réunion, jamais en clair');
    const jeton = await B.lien(a1, rid);
    vrai('le jeton fait 32 caractères d\'alphabet d\'adresse (24 octets tirés au hasard = 192 bits)', /^[A-Za-z0-9_-]{32}$/.test(jeton));
    v('le même organisateur relit le MÊME jeton (le lien est stable tant qu\'il vit)', await B.lien(a1, rid), jeton);
    const autres = new Set([jeton]);
    for (let i = 0; i < 24; i++) { const r2 = await B.programmer(a1, { titre: 'R' + i }); autres.add(await B.lien(a1, r2)); }
    v('population : vingt-cinq réunions, vingt-cinq jetons DIFFÉRENTS', autres.size, 25);
    const SRC = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'stockage.js'), 'utf8'));
    vrai('le jeton est tiré par `crypto.randomBytes(24)` (192 bits) — jamais d\'horloge ni de `Math.random`', /function inviteLienPoser[\s\S]{0,400}crypto\.randomBytes\(24\)/.test(SRC) && !/function inviteLienPoser[\s\S]{0,400}Math\.random/.test(SRC));
    const r0 = lignes('SELECT inv_h, inv_ch, inv_le FROM reunion WHERE id = ?', rid)[0];
    vrai('la base porte l\'EMPREINTE du jeton (64 hexadécimaux), son jeton SCELLÉ (un blob) et l\'instant de pose', /^[0-9a-f]{64}$/.test(r0.inv_h) && r0.inv_ch && r0.inv_ch.length > 20 && r0.inv_le > 0);
    vrai('… et l\'empreinte n\'EST PAS le jeton', r0.inv_h !== jeton && !r0.inv_h.includes(jeton));
    /* le jeton ne se retrouve dans AUCUN octet de la base ni de son journal WAL (la copie a été faite après un point de contrôle : on lit les trois fichiers) */
    const octets = ['msg.db', 'msg.db-wal', 'msg.db-shm'].map(f => { try { return fs.readFileSync(path.join(svc.data, f)); } catch (e) { return Buffer.alloc(0); } });
    vrai('population : les octets de la base ont été lus (' + octets.reduce((n, b) => n + b.length, 0) + ' o)', octets.reduce((n, b) => n + b.length, 0) > 50000);
    v('⛔ le jeton ne figure en clair dans AUCUN fichier de la base (ni msg.db, ni le journal WAL, ni la mémoire partagée)', octets.map(b => b.includes(Buffer.from(jeton))), [false, false, false]);
    vrai('⛔ ni sous une forme d\'URL : le fragment non plus (`i=<jeton>`)', octets.every(b => !b.includes(Buffer.from('i=' + jeton))));

    /* ═══ 2. L'APERÇU ═══ */
    console.log('2. l\'aperçu : le titre et l\'organisateur, rien d\'autre');
    const anon = T.client(svc.base);
    const ap = await anon.post('/api/invite/apercu', { jeton });
    v('un anonyme lit l\'aperçu (200)', ap.code, 200);
    v('⛔ il ne contient que le titre et l\'organisateur — pas un identifiant, un horaire, un participant, un lieu', [Object.keys(ap.j), Object.keys(ap.j.reunion).sort()], [['reunion'], ['organisateur', 'titre']]);
    v('… le titre de la réunion et le nom de son organisateur', [ap.j.reunion.titre, ap.j.reunion.organisateur], ['Devis Durand', 'Ana Banc']);
    v('… l\'aperçu n\'est jamais mis en cache', ap.h.get('cache-control'), 'no-store');
    const faux = [['inconnu', 'A'.repeat(32)], ['trop court', jeton.slice(0, 31)], ['trop long', jeton + 'x'], ['caractères interdits', jeton.slice(0, 30) + '<>'], ['vide', ''], ['absent', undefined], ['un nombre', 12345678901234567890123456789012], ['un objet', { x: 1 }]];
    const reponses = [];
    for (const [nom, j] of faux) { const r = await anon.post('/api/invite/apercu', { jeton: j }); reponses.push([nom, r.code, r.txt]); }
    v('⛔ population : huit jetons faux ou mal formés — TOUS la même réponse (410 `lien_invalide`, mêmes octets)', [reponses.length, new Set(reponses.map(x => x[1] + x[2])).size, reponses[0][1]], [8, 1, 410]);
    v('un corps absent ou une liste : le même 410 (jamais un 500)', [dit(await anon.post('/api/invite/apercu', undefined)), dit(await anon.post('/api/invite/apercu', [jeton]))], [[410, 'lien_invalide'], [410, 'lien_invalide']]);

    /* ═══ 3. L'ENTRÉE À LA PORTE ═══ */
    console.log('3. l\'entrée : rien tant que la salle n\'est pas ouverte, puis TOUJOURS à la porte');
    const avant = lignes('SELECT COUNT(*) AS n FROM invite_sans_compte')[0].n;
    const c0 = B.clientInvite();
    const sans = await c0.post('/api/invite/entrer', { jeton, nom: 'Paul', entreprise: 'Plomberie Durand' });
    v('sans salle ouverte : 409 `pas_ouverte`', dit(sans), [409, 'pas_ouverte']);
    v('⛔ … et RIEN n\'est écrit : ni ligne d\'invité, ni cookie', [lignes('SELECT COUNT(*) AS n FROM invite_sans_compte')[0].n, c0.cookie(), sans.h.getSetCookie().length], [avant, null, 0]);
    const sidAna = await B.entrerSalle(a1, rid, 'audio');
    vrai('population : Ana ouvre la salle (organisatrice, grade 2) — la salle d\'attente n\'est PAS demandée', sidAna && lignes('SELECT attente, etat FROM appel WHERE id = ?', sidAna)[0].attente === 0);
    const p = await B.invite(jeton, 'Paul', 'Plomberie Durand');
    v('la salle ouverte et tenue : Paul est accepté (201)', p.rep.code, 201);
    const sc = p.rep.h.getSetCookie().find(x => x.startsWith('opm-i=')) || '';
    vrai('population : le service a posé le cookie de session de l\'invité', /^opm-i=opi_[A-Za-z0-9_-]{43};/.test(sc));
    vrai('⛔ le cookie est `HttpOnly` (la page ne le lit pas) et `SameSite=Strict`, sur tout le site', /;\s*HttpOnly/i.test(sc) && /;\s*SameSite=Strict/i.test(sc) && /;\s*Path=\//i.test(sc));
    vrai('⛔ … et SANS date : un cookie de SESSION, il part avec le navigateur (ni `Max-Age` ni `Expires`)', !/max-age|expires/i.test(sc));
    vrai('la réponse n\'est jamais mise en cache', p.rep.h.get('cache-control') === 'no-store');
    v('⛔ il arrive TOUJOURS à la porte, même sans salle d\'attente demandée', [p.rep.j.attente, p.rep.j.appel.moi.statut, p.rep.j.appel.moi.grade], [true, 'attente', 0]);
    const vuePaul = p.rep.j.appel;
    v('⛔ à la porte il ne lit ni qui est dedans, ni combien, ni les identifiants internes de la réunion', [vuePaul.membres, vuePaul.autre, vuePaul.nb, vuePaul.participants, vuePaul.conv, vuePaul.reunion, vuePaul.rec, vuePaul.en_attente], [[], null, 0, [], null, null, null, 0]);
    v('… il lit le titre de la réunion (et rien de plus de ce qui la décrit)', vuePaul.titre, 'Devis Durand');
    v('⛔ de la salle il ne lit AUCUN éphémère (ni mains levées, ni états de micro, ni épingle) tant qu\'il attend', [p.rep.j.salle.mains, p.rep.j.salle.etats, p.rep.j.salle.epingle, p.rep.j.salle.sondage], [[], {}, null, null]);
    vrai('⛔ le partage d\'écran lui est annoncé interdit (`partage_ok` faux) et les outils de l\'organisateur absents', vuePaul.partage_ok === false && p.rep.j.salle.outils === false);

    /* ═══ 4. L'ORGANISATEUR LE VOIT ═══ */
    console.log('4. l\'organisateur voit « Paul — Plomberie Durand · invité sans compte » et choisit');
    const lire = async (c, sid) => (await c.get('/api/salles/' + sid)).j;
    const L = await lire(a1, sidAna);
    const ligneP = (L.appel.participants || []).find(x => x.id === p.id);
    vrai('population : Paul figure dans la liste de l\'organisatrice', !!ligneP);
    v('⛔ sa ligne : son nom, son entreprise, le drapeau « sans compte », à la porte, grade 0', [ligneP.prenom, ligneP.nom, ligneP.entreprise, ligneP.invite_sans_compte, ligneP.statut, ligneP.grade], ['Paul', '', 'Plomberie Durand', true, 'attente', 0]);
    v('… elle compte une personne qui attend', L.appel.en_attente, 1);
    vrai('population : un compte ordinaire de la liste ne porte PAS le drapeau', (L.appel.participants || []).filter(x => x.id === ana.id).every(x => x.invite_sans_compte === undefined));
    const bs = await B.entrerSalle(b1, rid, 'audio');
    v('Ben (invité NOMMÉ, un compte) entre normalement : pas à la porte', (await lire(b1, bs)).appel.moi.statut, 'present');
    const adm = await a1.post('/api/salles/' + sidAna + '/admettre', { uid: p.id });
    v('Ana « fait entrer » Paul avec le geste ordinaire (200)', adm.code, 200);
    const LP = await p.c.get('/api/invite/etat');
    v('Paul est dans la salle', [LP.code, LP.j.appel.moi.statut, LP.j.appel.moi.grade], [200, 'present', 0]);
    v('⛔ admis, il voit ceux qui sont dedans — et eux seulement', (LP.j.appel.participants || []).map(x => x.id).sort(), [ana.id, ben.id, p.id].sort());
    v('… il y est signalé sans compte à ses pairs (et pas les comptes)', (LP.j.appel.participants || []).filter(x => x.invite_sans_compte).map(x => x.id), [p.id]);
    v('⛔ il n\'est jamais hôte ni co-hôte', [LP.j.appel.moi.grade, (LP.j.appel.participants || []).find(x => x.id === p.id).grade], [0, 0]);
    v('l\'identifiant de la réunion et de sa conversation restent cachés', [LP.j.appel.conv, LP.j.appel.reunion], [null, null]);
    v('il lit le relais (identifiants éphémères), maintenant qu\'il est admis', (await p.c.get('/api/invite/ice')).code, 200);

    /* ═══ 5. LE NOM EST BORNÉ ET NETTOYÉ ═══ */
    console.log('5. le nom et l\'entreprise : bornés, nettoyés, jamais du balisage');
    /* (un compte est dans UNE salle à la fois : chaque partie a son organisateur) */
    const ana5 = B.pers('Ana5'), a5 = B.cl(ana5);
    const rid5 = await B.programmer(a5), j5 = await B.lien(a5, rid5);
    await B.entrerSalle(a5, rid5, 'audio');
    const longNom = 'N'.repeat(200), longEnt = 'E'.repeat(300);
    const g1 = await B.invite(j5, '  Paul\u0000‮   \n  Durand​ ', longEnt);
    v('les caractères de commande et de renversement tombent, les espaces se replient ; l\'entreprise est bornée à 80 signes', [g1.rep.j.invite.nom, g1.rep.j.invite.entreprise.length], ['Paul Durand', 80]);
    const g2 = await B.invite(j5, longNom, '');
    v('le nom est borné à 60 signes', g2.rep.j.invite.nom.length, 60);
    const g3 = await B.invite(j5, '😀 Zoé', 'Plomberie d\'Été & Fils');
    v('les lettres, les émojis et les esperluettes passent tels quels', [g3.rep.j.invite.nom, g3.rep.j.invite.entreprise], ['😀 Zoé', 'Plomberie d\'Été & Fils']);
    const sansNom = [['vide', ''], ['espaces', '    '], ['invisible', '​‮\u0000'], ['un nombre', 42], ['absent', undefined]];
    const refus5 = [];
    for (const [nom, val] of sansNom) { const c = B.clientInvite(); const r = await c.post('/api/invite/entrer', { jeton: j5, nom: val }); refus5.push([nom, r.code, r.j && r.j.error, c.cookie()]); }
    v('⛔ population : cinq noms vides, invisibles ou de mauvais type — aucun n\'entre, aucun cookie', refus5.map(x => [x[1], x[3]]), [[400, null], [400, null], [400, null], [400, null], [400, null]]);
    v('… les trois premiers disent `nom_requis`', refus5.slice(0, 3).map(x => x[2]), ['nom_requis', 'nom_requis', 'nom_requis']);
    const hostile = '<img src=x onerror=alert(1)>';
    const g4 = await B.invite(j5, hostile, '"><script>alert(2)</script>');
    v('⛔ un nom hostile est GARDÉ comme du texte (il n\'est ni retiré ni interprété)', [g4.rep.code, g4.rep.j.invite.nom, g4.rep.j.invite.entreprise], [201, hostile, '"><script>alert(2)</script>']);
    vrai('… la réponse est du JSON, avec `nosniff` : un navigateur ne l\'interprète jamais comme une page', /application\/json/.test(g4.rep.h.get('content-type')) && g4.rep.h.get('x-content-type-options') === 'nosniff');
    const sid5 = g4.appel;
    const L5 = await lire(a5, sid5);
    vrai('… l\'organisatrice le lit tel quel dans sa liste (c\'est SA page qui l\'écrit en texte : test-3053, la sonde navigateur)', (L5.appel.participants || []).some(x => x.prenom === hostile));

    /* ═══ 6. REFUSÉ, OU JAMAIS ADMIS : N'ENTRE PAS ═══ */
    console.log('6. un invité refusé n\'entre pas, un invité jamais admis non plus');
    const ana6 = B.pers('Ana6'), a6 = B.cl(ana6);
    const rid6 = await B.programmer(a6), j6 = await B.lien(a6, rid6);
    const sid6 = await B.entrerSalle(a6, rid6, 'audio');
    const marc = await B.invite(j6, 'Marc', 'Rival SA'), nina = await B.invite(j6, 'Nina', '');
    vrai('population : Marc et Nina attendent à la porte', marc.rep.code === 201 && nina.rep.code === 201);
    const ref = await a6.post('/api/salles/' + sid6 + '/refuser', { uid: marc.id });
    v('Ana refuse Marc (le geste ordinaire : 200)', ref.code, 200);
    const em = await marc.c.get('/api/invite/etat');
    v('Marc lit son refus : sa place est « refusé »', [em.code, em.j.appel.moi.statut], [200, 'refuse']);
    const essais = [['redemander', await marc.c.post('/api/invite/redemander', {})], ['ice', await marc.c.get('/api/invite/ice')], ['signal (offre vers Ana)', await marc.c.post('/api/invite/signal', { a: ana6.id, type: 'offre', donnees: { sdp: 'v=0' } })],
      ['main', await marc.c.post('/api/invite/main', { actif: true })], ['réaction', await marc.c.post('/api/invite/reaction', { emoji: 'pouce' })], ['état du micro', await marc.c.post('/api/invite/media', { micro: true })], ['jeton de visio', await marc.c.post('/api/invite/visio', {})]];
    v('⛔ population : sept gestes essayés par l\'invité REFUSÉ — AUCUN ne réussit', essais.map(([n, r]) => [n, r.code >= 400]), essais.map(([n]) => [n, true]));
    v('… et il ne redemande pas : 403 `refuse`', dit(essais[0][1]), [403, 'refuse']);
    v('⛔ … le relais n\'est pas à lui : 404', essais[1][1].code, 404);
    const ses = S.salleSessions(sid6).map(x => x.uid);
    v('⛔ la salle ne lui relaie rien : il n\'est dans aucune liste de sessions présentes', [ses.includes(marc.id), ses.includes(nina.id), ses.includes(ana6.id)], [false, false, true]);
    const nl = [['ice', await nina.c.get('/api/invite/ice')], ['signal (offre)', await nina.c.post('/api/invite/signal', { a: ana6.id, type: 'offre', donnees: { sdp: 'v=0' } })], ['main', await nina.c.post('/api/invite/main', { actif: true })], ['visio', await nina.c.post('/api/invite/visio', {})]];
    v('⛔ Nina, JAMAIS ADMISE (elle attend toujours) : ni relais, ni signal, ni main, ni visio', nl.map(([n, r]) => [n, r.code >= 400]), nl.map(([n]) => [n, true]));
    const versNina = await a6.post('/api/appels/' + sid6 + '/signal', { a: nina.id, type: 'offre', donnees: { sdp: 'v=0' } });
    v('⛔ et l\'inverse : Ana ne peut pas relayer un signal vers quelqu\'un qui attend (409 `appel_pas_en_cours`)', dit(versNina), [409, 'appel_pas_en_cours']);
    const exc = await a6.post('/api/salles/' + sid6 + '/exclure', { uid: nina.id });
    v('Ana exclut Nina (le geste ordinaire : 200)', exc.code, 200);
    v('⛔ exclue, elle n\'a plus de place : ses routes de salle répondent 404', [(await nina.c.get('/api/invite/ice')).code, (await nina.c.post('/api/invite/main', { actif: true })).code], [404, 404]);
    v('… et elle ne revient pas (403 `exclu`)', dit(await nina.c.post('/api/invite/redemander', {})), [403, 'exclu']);

    /* ═══ le jeton d'une autre réunion n'ouvre pas celle-ci ═══ */
    console.log('7. le jeton vaut pour UNE réunion');
    const ana7 = B.pers('Ana7'), a7 = B.cl(ana7);
    const rid7 = await B.programmer(a7), j7 = await B.lien(a7, rid7);
    const x = await B.invite(j7, 'Xavier', '');
    v('⛔ le jeton d\'une réunion dont la salle n\'est pas ouverte n\'entre dans AUCUNE autre salle (409 `pas_ouverte`), quoique celles de Devis Durand soient ouvertes', dit(x.rep), [409, 'pas_ouverte']);
    v('… aucune ligne d\'invité n\'a été écrite pour lui', lignes('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE reunion = ?', rid7)[0].n, 0);
    vrai('population : une salle de Devis Durand est bien ouverte pendant cet essai', lignes('SELECT COUNT(*) AS n FROM appel WHERE etat IN (\'sonne\', \'en_cours\')')[0].n >= 3);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { await B.arreter(); }
  fin();
})();
