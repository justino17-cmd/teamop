/* ⛔ CE QUE CE FICHIER GARDE — LE PONT DES AGENTS, CÔTÉ OP MESSAGES (28 octobre 2026, `server-msg/pont-agents.js`).

   Justin : « tu vas implanter OP MESSAGES à la place » — la messagerie des seize agents de la Tour s'affiche dans OP MESSAGES. Ce banc lance le VRAI
   service d'OP MESSAGES (processus isolé, bêta, 127.0.0.1) avec un OP GESTION de poche pour la porte, et joue les quatre routes du pont comme la Tour les joue :
   · ⛔ INERTE sans configuration, et FERMÉ sans les trois preuves (boucle locale, aucun en-tête de proxy, secret comparé à son empreinte) — même 404 qu'une route
     inconnue, octet pour octet ; le secret de l'administration n'ouvre pas le pont ; un bloc invalide, ou en production, REFUSE le démarrage ;
   · installer : les personnes-robots, l'espace, les groupes, une directe par agent — IDEMPOTENT (rien de nouveau au second appel), les nouveaux membres seuls entrent,
     rien n'est renommé ; Justin et les robots sont COLLÈGUES (il leur écrit sans demande de contact) ;
   · poster : au nom d'un ROBOT, jamais de Justin (sauf l'import, avec sa date et son état lu) ; un robot n'écrit que là où il est MEMBRE ET dans une conversation du pont ;
     `cid` idempotent ; Justin voit le message en direct sur son flux ;
   · nouveaux : ce que JUSTIN écrit et supprime — rien d'un robot, rien d'un autre compte, rien de ce que le pont a recopié de la Tour (`cid` « tour-… »), rien de la
     ligne « Justin a créé le groupe » ;
   · supprimer : le message part pour tous, Justin le voit partir.
   Il saute de lui-même sans `server-msg/node_modules` (comme les autres bancs du service). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const ACCES_JUSTIN = 'ba1b2c3d4e5', ACCES_INTRUS = 'bf1e2d3c4b5';
const SECRET = crypto.randomBytes(32).toString('hex'), SECRET_ADMIN = crypto.randomBytes(32).toString('hex');
const H = { 'X-OPM-Pont': SECRET };
const AGENTS = [{ id: 'victor', nom: 'Victor', role: 'Chef d’orchestre' }, { id: 'lea', nom: 'Léa', role: 'Onboarding et fidélisation' }, { id: 'max', nom: 'Max', role: 'Sentinelle' }];
const GROUPES = [{ fil: 'equipe', nom: 'Équipe', membres: ['victor', 'lea', 'max'] }, { fil: 'clients', nom: 'Clients', membres: ['lea'] }];
let n = 0; const cid = () => 'banc3090-' + (++n).toString().padStart(4, '0');

(async () => {
  const og = await T.fauxOpGestion({
    justin: { pass: 'pw-justin-3090', actif: true, nom: 'Justin', id: ACCES_JUSTIN },
    intrus: { pass: 'pw-intrus-3090', actif: true, nom: 'Intrus', id: ACCES_INTRUS },
  });
  let svc = null;
  try {
    /* ── 0 · inerte sans configuration ── */
    console.log('0. Sans `pont` dans la configuration : les quatre routes sont INERTES');
    {
      const s0 = await T.lancerService({ urlGestion: og.url });
      try {
        const c = T.client(s0.base);
        const inconnue = await c.get('/api/pont/inexistante');
        const rs = [await c.post('/api/pont/installer', {}, { entetes: H }), await c.post('/api/pont/poster', {}, { entetes: H }), await c.get('/api/pont/nouveaux', { entetes: H }), await c.post('/api/pont/supprimer', {}, { entetes: H })];
        v('(population) quatre routes appelées avec un secret quelconque', rs.length, 4);
        v('⛔ chacune répond le MÊME 404 qu\'une route inconnue, octet pour octet', rs.map(r => [r.code, r.txt === inconnue.txt]), rs.map(() => [404, true]));
        v('(population) le 404 d\'une route inconnue est bien un 404 JSON', [inconnue.code, inconnue.j], [404, { error: 'introuvable' }]);
      } finally { await s0.arreter(); }
    }

    /* ── 1 · une configuration fausse REFUSE le démarrage ── */
    console.log('\n1. Une configuration fausse ou déplacée REFUSE le démarrage');
    {
      const refuse = async (nom, config, opts = {}) => {
        let sortie = null;
        try { const s = await T.lancerService(Object.assign({ urlGestion: og.url, config }, opts)); await s.arreter(); sortie = 'demarre'; }
        catch (e) { sortie = String(e.message); }
        vrai('⛔ ' + nom, sortie !== 'demarre' && /pont/.test(sortie) && !sortie.includes(SECRET) && !sortie.includes(sha(SECRET)), sortie.slice(0, 160));
      };
      const bon = { actif: true, secretSha256: sha(SECRET), justin: ACCES_JUSTIN };
      await refuse('une empreinte qui n\'est pas 64 hexadécimaux', { pont: Object.assign({}, bon, { secretSha256: 'abc' }) });
      await refuse('une empreinte trop régulière (copiée d\'un exemple)', { pont: Object.assign({}, bon, { secretSha256: 'ab'.repeat(32) }) });
      await refuse('un accès de Justin qui n\'a pas la forme d\'un identifiant', { pont: Object.assign({}, bon, { justin: 'justin' }) });
      await refuse('une clé inconnue dans le bloc', { pont: Object.assign({}, bon, { secret: SECRET }) });
      await refuse('un bloc qui n\'est pas un objet', { pont: 'oui' });
      await refuse('l\'empreinte de l\'ADMINISTRATION (un secret par pouvoir)', { admin: { secret: SECRET_ADMIN }, pont: Object.assign({}, bon, { secretSha256: sha(SECRET_ADMIN) }) });
      await refuse('la PRODUCTION (bêta d\'abord)', { pont: bon, formule: { toutOuvert: false } }, { instance: 'prod' });
      /* le contre-exemple : `actif` absent ou faux n'est pas une erreur, c'est un pont éteint */
      const s = await T.lancerService({ urlGestion: og.url, config: { pont: { actif: false, secretSha256: 'n\'importe quoi' } } });
      try { v('…mais `actif: false` éteint le pont sans rien vérifier d\'autre', (await T.client(s.base).get('/api/pont/nouveaux', { entetes: H })).code, 404); } finally { await s.arreter(); }
    }

    /* ── 2 · les trois preuves ── */
    svc = await T.lancerService({ urlGestion: og.url, config: { admin: { secret: SECRET_ADMIN }, pont: { actif: true, secretSha256: sha(SECRET), justin: ACCES_JUSTIN } } });
    const nu = T.client(svc.base);
    const post = (c, p, b, e) => c.post(p, b, e), pont = { entetes: H }, sansPage = { entetes: H, sansOrigine: true, sansEntete: true };
    console.log('\n2. Les trois preuves : boucle locale, aucun en-tête de proxy, le secret');
    {
      const inconnue = await nu.get('/api/pont/inexistante');
      const refus = [];
      refus.push(['sans secret', await nu.get('/api/pont/nouveaux')]);
      refus.push(['un mauvais secret', await nu.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': crypto.randomBytes(32).toString('hex') } })]);
      refus.push(['un secret mal formé', await nu.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': 'pas-un-secret' } })]);
      refus.push(['⛔ le secret de l\'ADMINISTRATION', await nu.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': SECRET_ADMIN } })]);
      refus.push(['⛔ l\'EMPREINTE du secret (ce que la configuration garde) présentée comme secret', await nu.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': sha(SECRET) } })]);
      refus.push(['⛔ le bon secret DERRIÈRE un proxy (X-Forwarded-For)', await nu.get('/api/pont/nouveaux', { entetes: Object.assign({ 'X-Forwarded-For': '203.0.113.9' }, H) })]);
      refus.push(['⛔ …X-Real-IP', await nu.get('/api/pont/nouveaux', { entetes: Object.assign({ 'X-Real-IP': '203.0.113.9' }, H) })]);
      refus.push(['⛔ …Forwarded', await nu.get('/api/pont/nouveaux', { entetes: Object.assign({ Forwarded: 'for=203.0.113.9' }, H) })]);
      refus.push(['⛔ …X-Forwarded-Proto', await nu.get('/api/pont/nouveaux', { entetes: Object.assign({ 'X-Forwarded-Proto': 'https' }, H) })]);
      refus.push(['⛔ une écriture, le bon secret, derrière un proxy', await nu.post('/api/pont/installer', { agents: AGENTS }, { entetes: Object.assign({ 'X-Forwarded-For': '203.0.113.9' }, H), sansOrigine: true, sansEntete: true })]);
      for (const [nom, r] of refus) v(nom + ' : le MÊME 404 qu\'une route inconnue', [r.code, r.txt === inconnue.txt], [404, true]);
      /* ⛔ LA PREUVE DE LA BOUCLE LOCALE : une connexion qui arrive d'une AUTRE adresse (127.0.0.2 est à la machine, mais n'est pas 127.0.0.1) avec le BON secret est refusée.
         Sur Linux, toute 127.x répond ; ailleurs l'adresse peut manquer — le banc le DIT au lieu de se taire. */
      const http = require('http');
      const depuis = (local, chemin, entetes) => new Promise((resolve) => {
        const q = http.request({ host: '127.0.0.1', port: svc.port, path: chemin, method: 'GET', localAddress: local, headers: entetes, agent: false }, (r) => { let b = ''; r.on('data', d => { b += d; }); r.on('end', () => resolve({ code: r.statusCode, txt: b })); });
        q.on('error', (e) => resolve({ erreur: e && e.code })); q.end();
      });
      const autre = await depuis('127.0.0.2', '/api/pont/nouveaux', H);
      if (autre.erreur) console.log('  — 127.0.0.2 absent de cette machine (' + autre.erreur + ') : la preuve « boucle locale » n\'est pas jouée ici');
      else {
        v('⛔ le bon secret depuis une AUTRE adresse (127.0.0.2) : le MÊME 404 qu\'une route inconnue', [autre.code, autre.txt === inconnue.txt], [404, true]);
        v('…et la contre-épreuve : le même appel depuis 127.0.0.1 est admis (409 « pas installé »)', (await depuis('127.0.0.1', '/api/pont/nouveaux', H)).code, 409);
      }
      const ok = await nu.get('/api/pont/nouveaux', pont);
      v('le bon secret, en direct : 409 « pas installé » (la garde a laissé passer — rien n\'est encore installé)', [ok.code, ok.j.error], [409, 'pont_non_installe']);
      v('…le secret en MAJUSCULES passe aussi (c\'est de l\'hexadécimal)', (await nu.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': SECRET.toUpperCase() } })).code, 409);
      v('⛔ poster avant d\'installer : 409, rien n\'est écrit', (await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: 'x', cid: cid() }] }, pont)).j.error, 'pont_non_installe');
      v('une écriture du pont n\'exige NI Origin NI en-tête maison (ce n\'est pas une page)', (await nu.post('/api/pont/installer', { agents: [] }, sansPage)).code, 400);
      v('…mais une écriture sans secret passe d\'abord par ce contrôle d\'origine et tombe sur le même 404', (await nu.post('/api/pont/installer', { agents: AGENTS }, { sansOrigine: true, sansEntete: true })).txt === inconnue.txt, true);
    }

    /* ── 3 · installer ── */
    console.log('\n3. Installer : robots, espace, groupes, directes — et IDEMPOTENT');
    const base = path.join(svc.data, 'msg.db');
    const compter = () => { const d = T.lireBase(base); try { const q = (t) => d.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n; return { personne: q('personne'), conversation: q('conversation'), membre: q('membre'), espace: q('espace'), espace_membre: q('espace_membre'), message: q('message'), lien: q('lien') }; } finally { d.close(); } };
    {
      const mauvais = [['sans agents', {}], ['un agent sans nom', { agents: [{ id: 'victor', nom: '' }] }], ['un identifiant d\'agent réservé (« systeme »)', { agents: [{ id: 'systeme', nom: 'X' }] }], ['deux agents au même identifiant', { agents: [AGENTS[0], AGENTS[0]] }],
        ['un groupe dont un membre n\'est pas un agent', { agents: AGENTS, groupes: [{ fil: 'equipe', nom: 'Équipe', membres: ['inconnu'] }] }], ['un groupe qui porte l\'identifiant d\'un agent', { agents: AGENTS, groupes: [{ fil: 'victor', nom: 'X', membres: [] }] }],
        ['un identifiant à majuscules', { agents: [{ id: 'Victor', nom: 'V' }] }]];
      for (const [nom, b] of mauvais) v('⛔ ' + nom + ' : 400, rien n\'est créé', [(await nu.post('/api/pont/installer', b, pont)).code, compter().personne], [400, 0]);
      const r1 = await nu.post('/api/pont/installer', { agents: AGENTS, groupes: GROUPES }, pont);
      v('l\'installation réussit : trois agents + le Système, cinq conversations (trois directes, deux groupes)', [r1.code, r1.j.ok, r1.j.robots.length, r1.j.fils.length], [200, true, 4, 5]);
      const avant = compter();
      v('(population) Justin + 4 robots, un espace de 5 membres, 5 conversations', [avant.personne, avant.espace, avant.espace_membre, avant.conversation], [5, 1, 5, 5]);
      const r2 = await nu.post('/api/pont/installer', { agents: AGENTS, groupes: GROUPES }, pont);
      v('⛔ un SECOND appel ne crée rien : mêmes comptes dans la base, bilan à zéro', [JSON.stringify(compter()), r2.j.creees], [JSON.stringify(avant), { personnes: 0, conversations: 0, membres: 0 }]);
      /* un agent neuf et un membre neuf : eux seuls entrent ; un groupe renommé dans la demande n'est PAS renommé là-bas */
      const r3 = await nu.post('/api/pont/installer', { agents: AGENTS.concat([{ id: 'nina', nom: 'Nina', role: 'Sécurité' }]), groupes: [{ fil: 'equipe', nom: 'AUTRE NOM', membres: ['victor', 'lea', 'max', 'nina'] }, GROUPES[1]] }, pont);
      v('un agent neuf : un robot, une directe, une place dans l\'espace et dans le groupe — rien d\'autre', [r3.j.creees.personnes, r3.j.creees.conversations, r3.j.creees.membres], [1, 1, 2]);
      const apres = compter();
      v('…soit exactement +1 personne, +1 conversation, +1 membre d\'espace et +3 lignes de membre (les deux de sa directe, le groupe)', [apres.personne - avant.personne, apres.conversation - avant.conversation, apres.espace_membre - avant.espace_membre, apres.membre - avant.membre], [1, 1, 1, 3]);
    }

    /* ── 4 · ce que voit Justin ── */
    console.log('\n4. Justin ouvre OP MESSAGES : ses agents sont là, et ce sont ses collègues');
    const avantPorte = compter().personne;
    const justin = await T.connecter(svc, og, 'justin', 'pw-justin-3090');
    const apresJustin = compter().personne;
    const intrus = await T.connecter(svc, og, 'intrus', 'pw-intrus-3090');
    let liste, conv = {};
    {
      v('⛔ Justin entre par la porte bêta et c\'est LA personne que le pont a installée (aucune personne de plus) ; l\'intrus, lui, en est une de plus', [avantPorte, apresJustin, compter().personne], [6, 6, 7]);
      liste = (await justin.get('/api/conversations')).j.conversations;
      const directes = liste.filter(c => c.type === 'direct'), groupes = liste.filter(c => c.type === 'groupe');
      v('sa liste porte les quatre directes (les trois agents + Nina) et les deux groupes', [directes.length, groupes.length], [4, 2]);
      v('…les directes portent le NOM de l\'agent', directes.map(c => c.autre.prenom).sort(), ['Léa', 'Max', 'Nina', 'Victor']);
      v('…les groupes portent les noms de la demande d\'origine (« Équipe », « Clients »)', groupes.map(c => c.nom).sort(), ['Clients', 'Équipe']);
      v('…et il y est ADMINISTRATEUR (il peut y supprimer le message d\'un agent)', groupes.map(c => c.role), ['admin', 'admin']);
      for (const c of directes) conv[c.autre.prenom] = c.id;
      for (const c of groupes) conv[c.nom] = c.id;
      const esp = (await justin.get('/api/espaces')).j.espaces;
      v('l\'espace PRO « Équipe TeamOP — agents » : il en est propriétaire, cinq robots y sont avec lui', [esp.length, esp[0].nom, esp[0].proprio, esp[0].membres_n], [1, 'Équipe TeamOP — agents', true, 6]);
      const ecrit = await justin.post('/api/conversations/' + conv.Victor + '/messages', { cid: 'justin-ecrit-0001', texte: 'Bonjour Victor' });
      v('⛔ COLLÈGUES : Justin écrit à Victor sans demande de contact ni invitation', ecrit.code, 201);
      const nouveau = (await intrus.get('/api/conversations')).j.conversations;
      v('⛔ un AUTRE compte bêta ne voit aucune conversation du pont', nouveau.length, 0);
      v('⛔ …ne lit pas la directe de Justin avec Victor (404 uniforme)', (await intrus.get('/api/conversations/' + conv.Victor + '/messages')).code, 404);
      v('⛔ …n\'y écrit pas (404 uniforme)', (await intrus.post('/api/conversations/' + conv.Victor + '/messages', { cid: 'intrus-0001', texte: 'je suis là' })).code, 404);
      const victorId = (await justin.get('/api/conversations/' + conv.Victor)).j.membres.find(m => m.prenom === 'Victor').id;
      v('(contre-épreuve) Justin, collègue de Victor, ouvre sa directe', (await justin.post('/api/conversations/directe', { uid: victorId })).code, 200);
      v('⛔ …l\'intrus ne peut pas ouvrir une conversation avec un robot (pas collègues, pas contacts : 404)', (await intrus.post('/api/conversations/directe', { uid: victorId })).code, 404);
      const cRobot = T.client(svc.base);
      const robot = await cRobot.post('/api/beta/entrer', { login: 'pont:victor', pass: 'nimporte' });
      v('⛔ un robot ne se connecte PAS (« pont:victor » n\'est pas un identifiant de la porte : refus, aucun cookie)', [robot.code >= 400, cRobot.cookie()], [true, null]);
    }

    /* ── 5 · poster ── */
    console.log('\n5. Poster : au nom d\'un robot, là où il est membre, une seule fois');
    const fluxJ = await T.flux(justin);
    let horsId = null;
    const seqDe = async (c) => { const m = (await justin.get('/api/conversations/' + c + '/messages')).j.messages; return m; };
    {
      const m1 = cid();
      const r = await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: 'Bonjour Justin, tout va bien côté équipe.', cid: m1 }] }, pont);
      v('un message de Victor dans son fil privé', [r.code, r.j.resultats[0].ok, r.j.resultats[0].deja], [200, true, false]);
      const ev = await fluxJ.attendre(e => e.event === 'message' && e.data.conv === conv.Victor && e.data.texte && /tout va bien/.test(e.data.texte), 8000);
      vrai('⛔ Justin le reçoit EN DIRECT sur son flux (pas au rafraîchissement)', !!ev);
      const mm = (await seqDe(conv.Victor)).find(x => x.texte && /tout va bien/.test(x.texte));
      const idRobot = (await justin.get('/api/conversations/' + conv.Victor)).j.membres.find(m => m.prenom === 'Victor').id;
      v('…l\'auteur est le ROBOT de Victor (pas Justin)', mm && mm.auteur, idRobot);
      const r2 = await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: 'Bonjour Justin, tout va bien côté équipe.', cid: m1 }] }, pont);
      v('⛔ le MÊME cid rejoué : « deja », même numéro, aucun doublon', [r2.j.resultats[0].deja, r2.j.resultats[0].seq, (await seqDe(conv.Victor)).filter(x => x.texte && /tout va bien/.test(x.texte)).length], [true, r.j.resultats[0].seq, 1]);

      const lot = await nu.post('/api/pont/poster', { messages: [
        { fil: 'equipe', de: 'systeme', texte: 'Léa a pris la tâche « relancer le devis ».', cid: cid() },
        { fil: 'equipe', de: 'max', texte: 'Sauvegarde du soir : tout est vert.', cid: cid() },
        { fil: 'inconnu', de: 'max', texte: 'perdu', cid: cid() },
        { fil: 'clients', de: 'victor', texte: 'Victor n\'est pas dans ce groupe', cid: cid() },
        { fil: 'victor', de: 'lea', texte: 'Léa dans le fil privé de Victor', cid: cid() },
        { fil: 'victor', de: 'justin', texte: 'au nom de Justin, sans import', cid: cid() },
        { fil: 'victor', de: 'fantome', texte: 'qui ?', cid: cid() },
        { fil: 'victor', de: 'victor', texte: '   ', cid: cid() },
        { fil: 'victor', de: 'victor', texte: 'cid trop court', cid: 'x' },
      ] }, pont);
      v('un lot de neuf : le premier réussit et NE FAIT PAS TOMBER les autres', lot.j.resultats.map(x => x.ok ? 'ok' : x.raison), ['ok', 'ok', 'fil_inconnu', 'pas_membre', 'pas_membre', 'justin_interdit', 'auteur_inconnu', 'champ_invalide', 'champ_invalide']);
      const equipe = await seqDe(conv['Équipe']);
      v('une ligne du SYSTÈME dans un groupe vient du robot « Système »', equipe.filter(x => x.texte && /Léa a pris la tâche/.test(x.texte)).length, 1);
      const privee = await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'systeme', texte: 'Victor est à l\'arrêt.', cid: cid() }] }, pont);
      const dansVictor = (await seqDe(conv.Victor)).find(x => x.texte && /Victor est à l'arrêt/.test(x.texte));
      v('…dans un fil PRIVÉ (une directe à deux), l\'agent du fil la porte, marquée « ℹ️ »', [privee.j.resultats[0].ok, dansVictor && dansVictor.texte, dansVictor && dansVictor.auteur], [true, 'ℹ️ Victor est à l\'arrêt.', idRobot]);
      v('⛔ rien n\'a été écrit pour les refusés (ni dans le fil de Victor, ni dans Clients)', [(await seqDe(conv.Victor)).filter(x => x.texte && /(perdu|Léa dans le fil|au nom de Justin|qui \?|cid trop court)/.test(x.texte)).length, (await seqDe(conv.Clients)).filter(x => x.texte).length], [0, 0]);

      /* ⛔ hors des conversations du pont : une conversation de Justin avec un robot, créée PAR LUI, n'est pas dans la table */
      const hors = (await justin.post('/api/conversations/groupe', { nom: 'Hors pont', membres: [(await justin.get('/api/conversations/' + conv.Victor)).j.membres.find(m => m.prenom === 'Victor').id] })).j;
      vrai('(population) un groupe « Hors pont » existe : Justin et Victor en sont membres', hors && hors.conversation && hors.conversation.id);
      horsId = hors.conversation.id;
      const tentes = await nu.post('/api/pont/poster', { messages: [
        { fil: horsId, de: 'victor', texte: 'dans une conversation hors pont, par son identifiant', cid: cid() },
        { fil: 'Hors pont', de: 'victor', texte: 'par son nom', cid: cid() },
        { fil: '__proto__', de: 'victor', texte: 'prototype', cid: cid() },
        { fil: 'constructor', de: 'victor', texte: 'constructeur', cid: cid() },
        { fil: 'toString', de: 'victor', texte: 'méthode', cid: cid() },
      ] }, pont);
      v('⛔ UN ROBOT N\'ÉCRIT PAS HORS DES CONVERSATIONS DU PONT — même membre de la conversation, même nommée par son identifiant ou par un nom de prototype', tentes.j.resultats.map(x => x.raison), ['fil_inconnu', 'fil_inconnu', 'fil_inconnu', 'fil_inconnu', 'fil_inconnu']);
      v('…et rien n\'est arrivé dans « Hors pont »', (await justin.get('/api/conversations/' + horsId + '/messages')).j.messages.filter(x => x.texte).length, 0);
      const horsAuteur = await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'toString', texte: 'x', cid: cid() }, { fil: 'victor', de: '__proto__', texte: 'x', cid: cid() }] }, pont);
      v('⛔ un auteur nommé comme un prototype n\'est pas un robot', horsAuteur.j.resultats.map(x => x.raison), ['auteur_inconnu', 'auteur_inconnu']);
      v('⛔ un lot vide, trop long, ou un corps qui n\'est pas un objet : 400', [(await nu.post('/api/pont/poster', { messages: [] }, pont)).code, (await nu.post('/api/pont/poster', { messages: Array.from({ length: 26 }, () => ({ fil: 'victor', de: 'victor', texte: 'x', cid: cid() })) }, pont)).code, (await nu.post('/api/pont/poster', [], pont)).code], [400, 400, 400]);
    }

    /* ── 6 · importer : date d'origine, état lu ── */
    console.log('\n6. L\'import : la date d\'origine, l\'état « lu », jamais sans le drapeau');
    {
      const hier = Date.now() - 86400000, avantHier = hier - 3600000;
      const non = await nu.post('/api/pont/poster', { messages: [{ fil: 'lea', de: 'lea', texte: 'sans import mais avec une date', cid: cid(), ts: hier }] }, pont);
      const tsLea = (await seqDe(conv['Léa'])).find(x => x.texte === 'sans import mais avec une date');
      v('⛔ une date envoyée SANS `import:true` est ignorée (le message naît à l\'heure du service)', [non.j.resultats[0].ok, tsLea && tsLea.ts > hier + 3600000], [true, true]);
      const imp = await nu.post('/api/pont/poster', { import: true, messages: [
        { fil: 'lea', de: 'justin', texte: 'Léa, relance le devis', cid: 'tour-aaaaaaaaaaa1', ts: avantHier, lu: true },
        { fil: 'lea', de: 'lea', texte: 'C\'est fait, il est parti.', cid: 'tour-aaaaaaaaaaa2', ts: hier, lu: true },
        { fil: 'lea', de: 'lea', texte: 'Autre chose : un client rappelle.', cid: 'tour-aaaaaaaaaaa3', ts: hier + 60000, lu: false },
        { fil: 'lea', de: 'lea', texte: 'sans date', cid: 'tour-aaaaaaaaaaa4' },
        { fil: 'lea', de: 'lea', texte: 'date dans le futur', cid: 'tour-aaaaaaaaaaa5', ts: Date.now() + 3600000 },
      ] }, pont);
      const sansTour = await nu.post('/api/pont/poster', { import: true, messages: [{ fil: 'lea', de: 'justin', texte: 'import sans marque', cid: 'autre-aaaaaaaaaaa1', ts: avantHier }] }, pont);
      v('⛔ un import dont le `cid` ne commence pas par « tour- » est refusé (sinon il reviendrait à la Tour par `nouveaux` : un écho)', sansTour.j.resultats.map(x => x.ok ? 'ok' : x.raison), ['champ_invalide']);
      v('l\'import : trois messages passent, le sans-date et le futur sont refusés', imp.j.resultats.map(x => x.ok ? 'ok' : x.raison), ['ok', 'ok', 'ok', 'champ_invalide', 'champ_invalide']);
      const l = (await seqDe(conv['Léa'])).filter(x => ['Léa, relance le devis', 'C\'est fait, il est parti.', 'Autre chose : un client rappelle.'].includes(x.texte));
      v('⛔ chaque message GARDE SA DATE D\'ORIGINE', l.map(x => x.ts), [avantHier, hier, hier + 60000]);
      const moiId = justin.moi.id;
      v('…le message de Justin importé est bien à SON nom (c\'est l\'historique de la Tour)', l[0].auteur, moiId);
      const cLea = (await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv['Léa']);
      v('⛔ l\'état « lu » est gardé : seul le message non lu de la Tour reste non lu chez Justin', cLea.non_lus, 1);
      const rejoue = await nu.post('/api/pont/poster', { import: true, messages: [{ fil: 'lea', de: 'justin', texte: 'Léa, relance le devis', cid: 'tour-aaaaaaaaaaa1', ts: avantHier, lu: true }] }, pont);
      v('⛔ L\'HISTORIQUE NE SE DUPLIQUE PAS : le rejouer rend « deja »', [rejoue.j.resultats[0].deja, (await seqDe(conv['Léa'])).filter(x => x.texte === 'Léa, relance le devis').length], [true, 1]);
    }

    /* ── 7 · nouveaux ── */
    console.log('\n7. Lire ce que Justin fait : ses messages et ses suppressions, rien d\'autre');
    {
      const tete = await nu.get('/api/pont/nouveaux', pont);
      v('sans `depuis`, le pont ne rend que le curseur d\'aujourd\'hui (rien à rejouer au premier démarrage)', [tete.code, tete.j.evenements, Number.isInteger(tete.j.curseur)], [200, [], true]);
      let cur = tete.j.curseur;
      /* lu depuis le TOUT DÉBUT : ce que le service écrit lui-même (« Justin a créé le groupe ») ne passe pas pour un message de Justin, et ses vrais messages y sont */
      const depuisZero = await nu.get('/api/pont/nouveaux?depuis=0', pont);
      vrai('(population) lu depuis le début, ses vrais messages sont là (« Bonjour Victor »)', depuisZero.j.evenements.some(x => x.texte === 'Bonjour Victor'));
      v('⛔ …et rien de ce que le SERVICE écrit à son nom (« Justin a créé le groupe », deux groupes) ne passe pour un message de lui', depuisZero.j.evenements.filter(x => x.type === 'message' && x.genre !== 'texte').length, 0);
      /* …et une conversation de Justin HORS du pont ne remonte pas : il y écrit, le pont n'y lit rien */
      const ailleurs = await justin.post('/api/conversations/' + horsId + '/messages', { cid: 'hors-pont-0001', texte: 'Un mot dans une conversation hors pont' });
      v('⛔ Justin écrit dans « Hors pont » (une conversation qui n\'est pas au pont) : ce message ne remonte JAMAIS', [ailleurs.code, (await nu.get('/api/pont/nouveaux?depuis=0', pont)).j.evenements.some(x => /hors pont/.test(x.texte || ''))], [201, false]);
      const e1 = await justin.post('/api/conversations/' + conv.Victor + '/messages', { cid: 'justin-ecrit-0002', texte: 'Victor, peux-tu faire le point ?' });
      const e2 = await justin.post('/api/conversations/' + conv['Équipe'] + '/messages', { cid: 'justin-ecrit-0003', texte: '@Léa et @Max, un point sur la semaine' });
      /* un message de Justin dont le cid commence par « tour- » est celui que le pont a recopié : il ne revient pas */
      await justin.post('/api/conversations/' + conv.Victor + '/messages', { cid: 'tour-bbbbbbbbbbb1', texte: 'recopié depuis la Tour' });
      /* un message d'un robot, un message de l'intrus (refusé) */
      await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: 'Réponse de Victor', cid: cid() }] }, pont);
      await intrus.post('/api/conversations/' + conv.Victor + '/messages', { cid: 'intrus-0002', texte: 'message de l\'intrus' });
      const r = await nu.get('/api/pont/nouveaux?depuis=' + cur, pont);
      v('seuls les DEUX messages de Justin remontent, avec leur texte, leur fil et leur numéro', r.j.evenements.map(x => [x.type, x.fil, x.genre, x.texte, x.seq]), [['message', 'victor', 'texte', 'Victor, peux-tu faire le point ?', e1.j.seq], ['message', 'equipe', 'texte', '@Léa et @Max, un point sur la semaine', e2.j.seq]]);
      v('⛔ ni la réponse du robot, ni le message « tour- » recopié, ni celui de l\'intrus, ni « Justin a créé le groupe »', r.j.evenements.length, 2);
      cur = r.j.curseur;
      v('…le curseur avance : la lecture suivante est vide', (await nu.get('/api/pont/nouveaux?depuis=' + cur, pont)).j.evenements, []);
      /* suppressions */
      const sRobot = (await seqDe(conv.Victor)).find(x => x.texte === 'Réponse de Victor');
      await justin.post('/api/conversations/' + conv.Victor + '/messages/supprimer', { seq: e1.j.seq, pour: 'tous' });
      await justin.post('/api/conversations/' + conv.Victor + '/messages/supprimer', { seq: sRobot.seq, pour: 'moi' });
      const dernier = (await seqDe(conv['Équipe'])).find(x => x.texte === 'Sauvegarde du soir : tout est vert.');
      await justin.post('/api/conversations/' + conv['Équipe'] + '/messages/supprimer', { seq: dernier.seq, pour: 'tous' });
      const s = await nu.get('/api/pont/nouveaux?depuis=' + cur, pont);
      v('⛔ ses suppressions remontent : son message (pour tous), le message d\'un agent « pour lui », celui d\'un agent dans un groupe où il est administrateur (pour tous)',
        s.j.evenements.map(x => [x.type, x.fil, x.seq, x.pour]), [['suppression', 'victor', e1.j.seq, 'tous'], ['suppression', 'victor', sRobot.seq, 'moi'], ['suppression', 'equipe', dernier.seq, 'tous']]);
      v('…le message supprimé pour tous n\'est pas relu comme un message neuf (déjà supprimé)', (await nu.get('/api/pont/nouveaux?depuis=' + tete.j.curseur, pont)).j.evenements.filter(x => x.type === 'message' && x.texte === 'Victor, peux-tu faire le point ?').length, 0);
      for (const q of ['depuis=abc', 'depuis=-1', 'depuis=1e3', 'depuis=' + '9'.repeat(16)]) v('⛔ `' + q.slice(0, 20) + '` : 400, jamais ignoré', (await nu.get('/api/pont/nouveaux?' + q, pont)).code, 400);
    }

    /* ── 8 · supprimer ── */
    console.log('\n8. Supprimer : la Tour retire un message, Justin le voit partir');
    {
      const r = await nu.post('/api/pont/poster', { messages: [{ fil: 'max', de: 'max', texte: 'Alerte à retirer', cid: cid() }] }, pont);
      const seq = r.j.resultats[0].seq;
      const f0 = fluxJ.evenements.length;
      const s = await nu.post('/api/pont/supprimer', { fil: 'max', seq }, pont);
      v('le message d\'un agent dans une DIRECTE est retiré pour tous', [s.code, s.j.ok], [200, true]);
      const ev = await fluxJ.attendre(e => e.event === 'message_supprime' && e.data.seq === seq && e.data.conv === conv.Max, 8000);
      vrai('⛔ Justin le voit partir en direct', !!ev && fluxJ.evenements.length > f0);
      const lu = (await seqDe(conv.Max)).find(x => x.seq === seq);
      v('…et son texte n\'est plus lisible (pierre tombale)', [lu.supprime, lu.texte], [true, null]);
      v('le supprimer deux fois : déjà fait, pas d\'erreur', (await nu.post('/api/pont/supprimer', { fil: 'max', seq }, pont)).j.deja, true);
      /* ⛔ relecture de `gardien` : un 404 ici (le même corps que la garde) laissait la suppression en tête de file de la Tour — plus rien ne partait */
      const inc = await nu.post('/api/pont/supprimer', { fil: 'max', seq: 9999 }, pont);
      v('⛔ un numéro inconnu : 200 « déjà retiré », JAMAIS 404 (sinon la file de la Tour reste bloquée)', [inc.code, inc.j.ok, inc.j.deja, inc.j.absent], [200, true, true, true]);
      v('⛔ un fil hors du pont, un numéro mal formé : 400', [(await nu.post('/api/pont/supprimer', { fil: 'Hors pont', seq: 1 }, pont)).code, (await nu.post('/api/pont/supprimer', { fil: 'max', seq: '1' }, pont)).code, (await nu.post('/api/pont/supprimer', { fil: 'max', seq: 0 }, pont)).code, (await nu.post('/api/pont/supprimer', { fil: '__proto__', seq: 1 }, pont)).code], [400, 400, 400, 400]);
      const sys = (await seqDe(conv['Équipe'])).find(x => x.meta && x.meta.k === 'groupe_cree');
      const ss = await nu.post('/api/pont/supprimer', { fil: 'equipe', seq: sys.seq }, pont);
      v('⛔ une ligne du SERVICE (« Justin a créé le groupe ») ne se supprime pas par le pont — et la file passe quand même (200 « rien à retirer »)', [ss.code, ss.j.deja, !(await seqDe(conv['Équipe'])).find(x => x.seq === sys.seq).supprime], [200, true, true]);
    }

    /* ── 9 · rien ne fuit ── */
    console.log('\n9. Le secret n\'est dans aucune sortie, ni /health');
    {
      const sortie = svc.sortie.texte();
      v('⛔ ni le secret ni son empreinte dans les journaux du service', [sortie.includes(SECRET), sortie.includes(sha(SECRET))], [false, false]);
      const h = await nu.get('/health');
      v('⛔ ni dans /health, qui ne dit rien du pont', [JSON.stringify(h.j).includes(SECRET), JSON.stringify(h.j).includes(sha(SECRET)), /pont/i.test(JSON.stringify(h.j))], [false, false, false]);
      const adm = await T.client(svc.base).get('/api/admin/sante', { entetes: { 'X-OPM-Admin': SECRET_ADMIN } });
      v('l\'administration continue de servir avec SON secret (le pont ne l\'a pas déplacée)', adm.code, 200);
      v('⛔ et le secret du pont n\'ouvre pas l\'administration', (await T.client(svc.base).get('/api/admin/sante', { entetes: { 'X-OPM-Admin': SECRET } })).code, 404);
    }
    fluxJ.fermer();
  } finally {
    if (svc) await svc.arreter();
    await og.fermer();
  }
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => fin());
