/* ⛔ CE QUE CE FICHIER GARDE — LE PONT DES AGENTS, CÔTÉ OP MESSAGES (28 octobre 2026, `server-msg/pont-agents.js`).

   Justin : « tu vas implanter OP MESSAGES à la place » — la messagerie des seize agents de la Tour s'affiche dans OP MESSAGES. Ce banc lance le VRAI
   service d'OP MESSAGES (processus isolé, bêta, 127.0.0.1) avec un OP GESTION de poche pour la porte, et joue les cinq routes du pont comme la Tour les joue :
   · ⛔ INERTE sans configuration, et FERMÉ sans les trois preuves (boucle locale, aucun en-tête de proxy, secret comparé à son empreinte) — même 404 qu'une route
     inconnue, octet pour octet ; le secret de l'administration n'ouvre pas le pont ; un bloc invalide, ou en production, REFUSE le démarrage ;
   · installer : les personnes-robots, l'espace, les groupes, une directe par agent — IDEMPOTENT (rien de nouveau au second appel), les nouveaux membres seuls entrent,
     rien n'est renommé ; Justin et les robots sont COLLÈGUES (il leur écrit sans demande de contact) ;
   · poster : au nom d'un ROBOT, jamais de Justin (sauf l'import, avec sa date et son état lu) ; un robot n'écrit que là où il est MEMBRE ET dans une conversation du pont ;
     `cid` idempotent ; Justin voit le message en direct sur son flux ;
   · nouveaux : ce que JUSTIN écrit et supprime — rien d'un robot, rien d'un autre compte, rien de ce que le pont a recopié de la Tour (`cid` « tour-… »), rien de la
     ligne « Justin a créé le groupe » ;
   · supprimer : le message part pour tous, Justin le voit partir ;
   · avatar (les PHOTOS, 28 octobre 2026) : une image posée sur un robot ou sur un groupe, en UNE transaction, SANS message système ; refus de toute cible hors de la table (une directe,
     une clé héritée) ; 411 / 413 / 415 ; l'empreinte du corps REÇU vérifiée ; la même empreinte ne réécrit rien ; l'ancienne photo disparaît (ligne ET fichier) ; Justin lit la pièce
     par la vraie route, une personne étrangère au pont n'y a pas droit ; `installer` rend ce qui est déjà posé.
   · transcrire (LES VOCAUX, 28 octobre 2026) : un vocal de Justin sort de `nouveaux` comme `genre:'vocal'` (sa durée, jamais sa pièce) ; `POST /api/pont/transcrire` en demande le texte par le MÊME
     chemin et les MÊMES budgets que la page (un seul calcul par vocal, l'ouvrier reçoit les octets exacts) ; le texte revient en événement `transcription` (prête, vide, échec) ; chaque refus est un
     200 `{ ok:false, raison }` (jamais un 404, que la Tour prend pour un secret refusé) — absente, indisponible, occupée, « mes vocaux », budget, trop long, introuvable ; le plafond du pont.
   Il saute de lui-même sans `server-msg/node_modules` (comme les autres bancs du service). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const P = require('./outils-pieces');
const http = require('http');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const ACCES_JUSTIN = 'ba1b2c3d4e5', ACCES_INTRUS = 'bf1e2d3c4b5';
const SECRET = crypto.randomBytes(32).toString('hex'), SECRET_ADMIN = crypto.randomBytes(32).toString('hex');
const H = { 'X-OPM-Pont': SECRET };
const AGENTS = [{ id: 'victor', nom: 'Victor', role: 'Chef d’orchestre' }, { id: 'lea', nom: 'Léa', role: 'Onboarding et fidélisation' }, { id: 'max', nom: 'Max', role: 'Sentinelle' }];
const GROUPES = [{ fil: 'equipe', nom: 'Équipe', membres: ['victor', 'lea', 'max'] }, { fil: 'clients', nom: 'Clients', membres: ['lea'] }];

/* LE FAUX OUVRIER DE TRANSCRIPTION (comme `test-1000`) : il note chaque travail (octets, langue, secret) et répond quand le banc le lui dit */
const SECRET_OUVRIER = 'OuvrierPont-BANC-' + 'Zk'.repeat(18);
function fauxOuvrier() {
  const o = { travaux: [], enAttente: [], sansSecret: 0, panne: false };
  o.serveur = http.createServer((q, r) => {
    const rep = (code, j) => { r.writeHead(code, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
    if (o.panne) { q.socket.destroy(); return; }
    if (q.headers.authorization !== 'Bearer ' + SECRET_OUVRIER) { o.sansSecret++; q.resume(); return rep(401, { error: 'non_autorise' }); }
    if (q.method === 'GET' && q.url === '/sante') { q.resume(); return rep(200, { ok: true, sha: 'banc0000', occupe: false }); }
    if (q.method === 'POST' && q.url === '/transcrire') {
      const morceaux = []; q.on('data', d => morceaux.push(d));
      q.on('end', () => { const t = { octets: Buffer.concat(morceaux), langue: q.headers['x-langue'], repondre: rep }; o.travaux.push(t); o.enAttente.push(t); });
      return;
    }
    q.resume(); rep(404, { error: 'introuvable' });
  });
  o.ecouter = () => new Promise(ok => o.serveur.listen(0, '127.0.0.1', () => { o.port = o.serveur.address().port; ok(); }));
  o.relacher = (code, j) => { const t = o.enAttente.shift(); if (t) t.repondre(code, j); return !!t; };
  return o;
}
let n = 0; const cid = () => 'banc3090-' + (++n).toString().padStart(4, '0');

(async () => {
  const og = await T.fauxOpGestion({
    justin: { pass: 'pw-justin-3090', actif: true, nom: 'Justin', id: ACCES_JUSTIN },
    intrus: { pass: 'pw-intrus-3090', actif: true, nom: 'Intrus', id: ACCES_INTRUS },
  });
  let svc = null;
  try {
    /* ── 0 · inerte sans configuration ── */
    console.log('0. Sans `pont` dans la configuration : les cinq routes sont INERTES');
    {
      const s0 = await T.lancerService({ urlGestion: og.url });
      try {
        const c = T.client(s0.base);
        const inconnue = await c.get('/api/pont/inexistante');
        const rs = [await c.post('/api/pont/installer', {}, { entetes: H }), await c.post('/api/pont/poster', {}, { entetes: H }), await c.get('/api/pont/nouveaux', { entetes: H }), await c.post('/api/pont/supprimer', {}, { entetes: H }), await c.post('/api/pont/avatar?cible=victor', {}, { entetes: H })];
        v('(population) cinq routes appelées avec un secret quelconque', rs.length, 5);
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
      v('⛔ une photo avant d\'installer : 409, rien n\'est écrit', [(await nu.post('/api/pont/avatar?cible=victor', {}, pont)).j.error, T.lireBase(path.join(svc.data, 'msg.db')).prepare("SELECT COUNT(*) AS n FROM piece").get().n], ['pont_non_installe', 0]);
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

    /* ── 9 · les photos ── */
    console.log('\n9. Les photos : un robot, un groupe — posées en silence, lisibles de Justin seul');
    {
      const octets = (x) => Buffer.isBuffer(x) ? x : Buffer.from(String(x));
      /* POST /api/pont/avatar, au `http` brut : le secret SEUL (ni Origin ni en-tête maison), la longueur et l'empreinte que le banc choisit */
      const avatar = (cible, corps, o = {}) => new Promise((resolve, reject) => {
        const h = Object.assign({ 'X-OPM-Pont': SECRET, 'Content-Type': 'application/octet-stream' }, o.entetes || {});
        if (o.empreinte !== null) h['X-OPM-Empreinte'] = o.empreinte || sha(octets(corps));
        if (!o.chunked && h['Content-Length'] === undefined) h['Content-Length'] = String(octets(corps).length);
        const q = http.request({ host: '127.0.0.1', port: svc.port, method: 'POST', path: '/api/pont/avatar' + (cible === null ? '' : '?cible=' + (o.brut ? cible : encodeURIComponent(cible))), headers: h, agent: false }, (r) => {
          const parts = []; r.on('data', d => parts.push(d)); r.on('end', () => { const txt = Buffer.concat(parts).toString('utf8'); let j = null; try { j = JSON.parse(txt); } catch (e) {} resolve({ code: r.statusCode, j, txt, h: r.headers }); });
        });
        q.setTimeout(8000, () => { q.destroy(); resolve({ code: 0, j: null, txt: 'délai' }); });
        q.on('error', (e) => resolve({ code: 0, j: null, txt: String(e && e.code) }));
        q.end(octets(corps));
      });
      const fichiersPieces = () => { const sortie = []; const marche = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const c = path.join(d, e.name); if (e.isDirectory()) marche(c); else if (/^f_[0-9a-f]{32}$/.test(e.name)) sortie.push(e.name); } }; marche(svc.data); return sortie; };
      const lignesPieces = () => { const d = T.lireBase(base); try { return d.prepare("SELECT id FROM piece WHERE genre = 'avatar'").all().map(r => r.id); } finally { d.close(); } };
      const msgsDe = async (c) => (await justin.get('/api/conversations/' + c + '/messages')).j.messages.length;
      const lire = async (c, id) => P.lirePiece(c, id);
      const BLEU = P.png({ w: 16, h: 16, couleur: [10, 120, 200] }), ROUGE = P.png({ w: 16, h: 16, couleur: [200, 10, 10] }), VERT = P.png({ w: 16, h: 16, couleur: [10, 160, 40] });
      const CANARI = 'ZXCANARIQGPS48.8566N';
      const AVEC_EXIF = P.jpeg({ exif: CANARI });

      const l0 = (await justin.get('/api/conversations')).j.conversations;
      v('(population) au moins quatre directes et deux groupes, aucune n\'a de photo, aucune pièce de genre avatar n\'existe', [l0.filter(c => c.type === 'direct').length >= 4, l0.filter(c => c.type === 'groupe').length >= 2, l0.filter(c => c.type === 'direct' ? c.autre.avatar : c.avatar).length, lignesPieces().length, fichiersPieces().length], [true, true, 0, 0, 0]);
      v('`installer` rend `avatars` : vide tant qu\'aucune photo n\'est posée', (await nu.post('/api/pont/installer', { agents: AGENTS.concat([{ id: 'nina', nom: 'Nina', role: 'Sécurité' }]), groupes: GROUPES }, pont)).j.avatars, {});

      /* ── les refus : tous AVANT d'écrire quoi que ce soit ── */
      const inconnue = await nu.get('/api/pont/inexistante');
      const rien = async (nom, r, code, erreur) => v(nom, [r.code, r.j && r.j.error, lignesPieces().length, fichiersPieces().length], [code, erreur, 0, 0]);
      await rien('⛔ une cible inconnue : 400, rien d\'écrit', await avatar('zzz', BLEU), 400, 'champ_invalide');
      await rien('⛔ sans cible : 400', await avatar(null, BLEU), 400, 'champ_invalide');
      await rien('⛔ « justin » (la personne, pas un robot) : 400', await avatar('justin', BLEU), 400, 'champ_invalide');
      await rien('⛔ l\'IDENTIFIANT d\'une conversation directe (sa photo est celle de l\'autre personne) : 400', await avatar(conv.Victor, BLEU), 400, 'champ_invalide');
      await rien('⛔ l\'identifiant d\'un groupe (on vise le FIL, pas l\'identifiant) : 400', await avatar(conv['Équipe'], BLEU), 400, 'champ_invalide');
      await rien('⛔ « __proto__ » (clé héritée) : 400', await avatar('__proto__', BLEU), 400, 'champ_invalide');
      await rien('⛔ « constructor » (forme valide, clé héritée de la table) : 400', await avatar('constructor', BLEU), 400, 'champ_invalide');
      await rien('⛔ « valueof », « tostring » (même piège, autres clés de Object.prototype) : 400', [await avatar('valueof', BLEU), await avatar('tostring', BLEU)].find(r => r.code !== 400) || { code: 400, j: { error: 'champ_invalide' } }, 400, 'champ_invalide');
      await rien('⛔ deux cibles à la fois (un tableau) : 400', await avatar('victor&cible=max', BLEU, { brut: true }), 400, 'champ_invalide');
      await rien('⛔ l\'empreinte ABSENTE : 400', await avatar('victor', BLEU, { empreinte: null }), 400, 'champ_invalide');
      await rien('⛔ une empreinte mal formée : 400', await avatar('victor', BLEU, { empreinte: 'abc' }), 400, 'champ_invalide');
      await rien('⛔ l\'empreinte d\'un AUTRE corps : 400, ni ligne ni fichier laissés', await avatar('victor', BLEU, { empreinte: sha(ROUGE) }), 400, 'champ_invalide');
      await rien('⛔ un texte qui n\'est pas une image : 415 type_refuse', await avatar('victor', 'bonjour, ceci n\'est pas une image'), 415, 'type_refuse');
      await rien('⛔ une page HTML : 415', await avatar('victor', '<html><script>alert(1)</script></html>'), 415, 'type_refuse');
      await rien('⛔ un SVG : 415 (jamais servi en ligne)', await avatar('victor', '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 415, 'type_refuse');
      await rien('⛔ le type de la REQUÊTE n\'est pas octet-stream : 415', await avatar('victor', BLEU, { entetes: { 'Content-Type': 'image/png' } }), 415, 'type_refuse');
      const json = JSON.stringify({ a: 'x'.repeat(70000) });
      await rien('⛔ …ni un corps étiqueté JSON, même au-delà de 64 Ko (le lecteur JSON ne l\'avale pas : 415, pas 413)', await avatar('victor', json, { entetes: { 'Content-Type': 'application/json' } }), 415, 'type_refuse');
      const chunk = await avatar('victor', BLEU, { chunked: true, entetes: { 'Transfer-Encoding': 'chunked' } });
      await rien('⛔ un envoi fractionné, sans longueur : 411', chunk, 411, 'longueur_requise');
      await rien('⛔ une longueur ANNONCÉE au-delà du maximum (2 Mo) : 413, avant d\'avoir lu le corps', await avatar('victor', BLEU, { entetes: { 'Content-Length': String(3 * 1048576) } }), 413, 'piece_trop_lourde');
      const court = await avatar('victor', BLEU, { entetes: { 'Content-Length': String(BLEU.length + 50) } });
      v('…(la requête qui ment sur sa longueur : pas de photo posée, ni ligne ni fichier)', [court.code === 200, lignesPieces().length, fichiersPieces().length], [false, 0, 0]);
      const sansSecret = await T.client(svc.base).post('/api/pont/avatar?cible=victor', BLEU.toString('latin1'), { sansOrigine: true, sansEntete: true });
      v('⛔ sans le secret : le MÊME 404 qu\'une route inconnue', [sansSecret.code, sansSecret.txt === inconnue.txt], [404, true]);
      v('⛔ derrière un proxy (X-Forwarded-For), le bon secret : le MÊME 404', await (async () => { const r = await avatar('victor', BLEU, { entetes: { 'X-Forwarded-For': '203.0.113.9' } }); return [r.code, r.txt === inconnue.txt]; })(), [404, true]);
      v('…et rien n\'a été écrit par tous ces refus', [lignesPieces().length, fichiersPieces().length], [0, 0]);

      /* ── poser sur un ROBOT ── */
      const msgs0 = { Victor: await msgsDe(conv.Victor), Equipe: await msgsDe(conv['Équipe']), Clients: await msgsDe(conv.Clients) };
      const f1 = fluxJ.evenements.length;
      const ok1 = await avatar('victor', BLEU);
      v('une photo posée sur le robot de Victor : 200, « deja » faux', [ok1.code, ok1.j], [200, { ok: true, deja: false }]);
      const aprVictor = (await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv.Victor);
      vrai('⛔ Justin voit une photo sur la directe de Victor (c\'est celle du robot)', aprVictor && typeof aprVictor.autre.avatar === 'string' && aprVictor.autre.avatar.length > 8);
      const picV1 = aprVictor.autre.avatar;
      const dl = await lire(justin, picV1);
      v('⛔ Justin télécharge la pièce par la VRAIE route GET : 200, une image PNG (signature lue), du type image/png', [dl.code, dl.buf.subarray(0, 8).toString('hex'), /^image\/png/.test(dl.h.get('content-type') || '')], [200, '89504e470d0a1a0a', true]);
      vrai('…les octets lus SONT ceux qui ont été envoyés (une image propre : rien à retirer)', dl.buf.equals(BLEU));
      const intrusLit = await lire(intrus, picV1);
      v('⛔ une personne étrangère au pont (l\'autre accès bêta) ne lit RIEN : 404', intrusLit.code, 404);
      v('⛔ …et sans session du tout : refusé (401 ou 404), jamais l\'image', await (async () => { const r = await P.lirePiece(T.client(svc.base), picV1); return [[401, 404].includes(r.code), r.buf.subarray(0, 4).toString('hex') === '89504e47']; })(), [true, false]);
      const evP = await fluxJ.attendre(e => e.event === 'personne', 8000);
      vrai('Justin est PRÉVENU en direct (un événement « personne » sur son flux) : ses écrans relisent', !!evP && fluxJ.evenements.length > f1);
      v('⛔ AUCUN message n\'a été ajouté dans le fil de Victor', await msgsDe(conv.Victor), msgs0.Victor);
      v('une seule pièce de genre avatar existe, un seul fichier', [lignesPieces().length, fichiersPieces().length], [1, 1]);
      v('la même photo posée deux fois (même empreinte) : 200 « deja », RIEN n\'est écrit (même pièce, même fichier)', await (async () => { const r = await avatar('victor', BLEU); return [r.code, r.j, lignesPieces().length, fichiersPieces().length, ((await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv.Victor).autre.avatar) === picV1]; })(), [200, { ok: true, deja: true }, 1, 1, true]);
      v('…« deja » se décide sur l\'EMPREINTE annoncée (la Tour n\'envoie pas le corps de nouveau) : même un corps différent, avec la même empreinte, ne réécrit rien', await (async () => { const r = await avatar('victor', ROUGE, { empreinte: sha(BLEU) }); return [r.code, r.j && r.j.deja, lignesPieces().length]; })(), [200, true, 1]);

      /* ── remplacer ── */
      const r2 = await avatar('victor', ROUGE);
      const picV2 = (await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv.Victor).autre.avatar;
      v('une photo différente : 200 et la pièce CHANGE', [r2.code, r2.j.deja, picV2 !== picV1], [200, false, true]);
      v('⛔ l\'ancienne pièce a disparu : 404 à la lecture, ligne ET fichier effacés (une seule de chaque reste)', await (async () => { await T.attendre(() => fichiersPieces().length === 1, 4000, 25); return [(await lire(justin, picV1)).code, lignesPieces().length, fichiersPieces().length, (await lire(justin, picV2)).buf.equals(ROUGE)]; })(), [404, 1, 1, true]);

      /* ── les métadonnées sont retirées (le seul chemin d'écriture d'un fichier image) ── */
      const rj = await avatar('max', AVEC_EXIF);
      const picM = (await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv.Max).autre.avatar;
      const lj = await lire(justin, picM);
      v('⛔ un JPEG avec un EXIF GPS : le canari est dans ce qui part, et ABSENT de ce qui est rangé', [rj.code, AVEC_EXIF.includes(Buffer.from(CANARI)), lj.code, lj.buf.includes(Buffer.from(CANARI)), lj.buf.subarray(0, 2).toString('hex')], [200, true, 200, false, 'ffd8']);

      /* ── poser sur le Système et sur un GROUPE ── */
      const rs = await avatar('systeme', VERT);
      v('le robot « Système » reçoit sa photo', [rs.code, rs.j.deja], [200, false]);
      const evG0 = fluxJ.evenements.length;
      const rg = await avatar('equipe', BLEU);
      v('une photo posée sur le GROUPE « equipe » : 200', [rg.code, rg.j.deja], [200, false]);
      const lg = (await justin.get('/api/conversations')).j.conversations.filter(c => c.type === 'groupe');
      const eq = lg.find(c => c.id === conv['Équipe']), cl = lg.find(c => c.id === conv.Clients);
      vrai('⛔ la liste de Justin porte la photo du groupe « Équipe » — et pas celle de « Clients »', eq && typeof eq.avatar === 'string' && cl && !cl.avatar);
      const dg = await lire(justin, eq.avatar);
      v('⛔ Justin (membre) télécharge la photo du groupe par la vraie route GET : une image PNG, les octets envoyés', [dg.code, dg.buf.equals(BLEU)], [200, true]);
      v('⛔ une personne étrangère au groupe : 404', (await lire(intrus, eq.avatar)).code, 404);
      const evCm = await fluxJ.attendre(e => e.event === 'conversation' && e.data && e.data.conv === conv['Équipe'], 8000);
      vrai('Justin est prévenu (la conversation a changé) : ses écrans la relisent', !!evCm && fluxJ.evenements.length > evG0);
      const tout = (await seqDe(conv['Équipe']));
      v('⛔ AUCUN message système « a changé la photo du groupe » : ni dans « Équipe » ni dans « Clients »', [tout.filter(x => x.type === 'systeme' && x.meta && /avatar/.test(JSON.stringify(x.meta))).length, tout.length === msgs0.Equipe, await msgsDe(conv.Clients) === msgs0.Clients], [0, true, true]);
      const dbq = T.lireBase(base);
      let table, proprioGroupe, proprioV;
      try {
        table = JSON.parse(dbq.prepare("SELECT v FROM meta WHERE k = 'pont_agents'").get().v);
        proprioGroupe = (dbq.prepare('SELECT proprio FROM piece WHERE id = ?').get(eq.avatar) || {}).proprio;
        proprioV = (dbq.prepare('SELECT proprio FROM piece WHERE id = ?').get(picV2) || {}).proprio;
      } finally { dbq.close(); }
      v('⛔ la pièce du GROUPE appartient au robot « Système » ; celle du robot de Victor, à Victor', [proprioGroupe === table.robots.systeme, proprioV === table.robots.victor, !!table.robots.systeme && table.robots.systeme !== table.robots.victor], [true, true, true]);
      /* remplacer la photo du groupe : l'ancienne part */
      const rg2 = await avatar('equipe', ROUGE);
      const eq2 = (await justin.get('/api/conversations')).j.conversations.find(c => c.id === conv['Équipe']);
      await T.attendre(() => fichiersPieces().length === lignesPieces().length, 4000, 25);
      v('⛔ remplacer la photo du groupe : la nouvelle pièce, l\'ancienne n\'est plus lisible (404), lignes et fichiers concordent', [rg2.code, eq2.avatar !== eq.avatar, (await lire(justin, eq.avatar)).code, (await lire(justin, eq2.avatar)).buf.equals(ROUGE), fichiersPieces().length === lignesPieces().length], [200, true, 404, true, true]);

      /* ── l'installation rend ce qui est posé ── */
      const attendu = { victor: sha(ROUGE), max: sha(AVEC_EXIF), systeme: sha(VERT), equipe: sha(ROUGE) };
      const inst = await nu.post('/api/pont/installer', { agents: AGENTS.concat([{ id: 'nina', nom: 'Nina', role: 'Sécurité' }]), groupes: GROUPES }, pont);
      v('⛔ `installer` rend `avatars` : l\'empreinte SOURCE de chaque cible déjà posée, et rien d\'autre', inst.j.avatars, attendu);
      v('…un second appel rend la même chose (idempotent), et ne crée rien', (await nu.post('/api/pont/installer', { agents: AGENTS.concat([{ id: 'nina', nom: 'Nina', role: 'Sécurité' }]), groupes: GROUPES }, pont)).j.creees, { personnes: 0, conversations: 0, membres: 0 });
      /* un second service sur la MÊME base ne change rien : la table vit dans la base (sauvegardée avec elle) */
      v('…la table du pont porte les empreintes dans la base (`meta`), pas en mémoire', await (async () => { const d = T.lireBase(base); try { return Object.keys(JSON.parse(d.prepare("SELECT v FROM meta WHERE k = 'pont_agents'").get().v).avatars).sort(); } catch (e) { return String(e && e.message); } finally { d.close(); } })(), Object.keys(attendu).sort());

      /* ── les photos ne se posent que sur une table installée avec ces cibles ── */
      v('⛔ une photo pour un agent PAS ENCORE installé (« hugo ») : 400', (await avatar('hugo', BLEU)).code, 400);
      v('…et l\'agent ajouté à l\'installation peut en recevoir une', (await avatar('nina', VERT)).code, 200);

      /* ── un groupe RECRÉÉ n'a plus la photo que la table croyait lui avoir posée ── */
      const GP = [{ fil: 'equipe', nom: 'Équipe', membres: ['victor', 'lea', 'max'] }, { fil: 'clients', nom: 'Clients', membres: ['lea'] }];
      const AG4 = AGENTS.concat([{ id: 'nina', nom: 'Nina', role: 'Sécurité' }]);
      v('une photo sur « clients » : posée et rendue par `installer`', [(await avatar('clients', VERT)).code, (await nu.post('/api/pont/installer', { agents: AG4, groupes: GP }, pont)).j.avatars.clients], [200, sha(VERT)]);
      v('Justin QUITTE le groupe « Clients »', (await justin.post('/api/conversations/' + conv.Clients + '/quitter', {})).code, 200);
      const re = await nu.post('/api/pont/installer', { agents: AG4, groupes: GP }, pont);
      v('⛔ l\'installation recrée le groupe (une conversation de plus) et OUBLIE sa photo : `avatars` n\'a plus « clients », mais garde les autres', [re.j.creees.conversations, 'clients' in re.j.avatars, re.j.avatars.equipe === sha(ROUGE), re.j.avatars.victor === sha(ROUGE)], [1, false, true, true]);
      v('…et la photo de la même cible peut être reposée (ce n\'est pas « deja »)', (await avatar('clients', VERT)).j, { ok: true, deja: false });

      /* ── un robot NEUF n'hérite pas d'une empreinte que la table gardait d'un robot de même nom (base restaurée à moitié) ── */
      {
        const { DatabaseSync } = require('node:sqlite');
        const w = new DatabaseSync(base);
        try {
          const lu = JSON.parse(w.prepare("SELECT v FROM meta WHERE k = 'pont_agents'").get().v);
          lu.avatars.hugo = sha('une photo que ce robot-là n\'a jamais eue');
          w.prepare("UPDATE meta SET v = ? WHERE k = 'pont_agents'").run(JSON.stringify(lu));
        } finally { w.close(); }
        const neuf = await nu.post('/api/pont/installer', { agents: AG4.concat([{ id: 'hugo', nom: 'Hugo', role: 'Veille' }]), groupes: GP }, pont);
        v('⛔ un robot créé à l\'instant (« hugo ») NE reprend PAS l\'empreinte oubliée dans la table : `avatars` ne la rend pas, et sa première photo est posée', [neuf.j.creees.personnes, 'hugo' in neuf.j.avatars, (await avatar('hugo', BLEU)).j], [1, false, { ok: true, deja: false }]);
      }

      /* ── ⛔ UNE RÉINSTALLATION PENDANT LE DÉPÔT : la photo ne s'attache pas à l'ANCIEN groupe (relecture de `gardien`, 28 octobre 2026) ──
         L'envoi est tenu à mi-corps (la longueur annoncée, la moitié des octets), le temps que Justin quitte le groupe et que l'installation le RECRÉE ; puis l'autre moitié part. */
      {
        const avantLignes = lignesPieces().length;
        const courant = async () => (await justin.get('/api/conversations')).j.conversations.filter(c => c.type === 'groupe' && c.nom === 'Clients');
        const ancien = (await courant())[0];
        let recree = null;
        const reponse = await new Promise((resolve) => {
          const q = http.request({ host: '127.0.0.1', port: svc.port, method: 'POST', path: '/api/pont/avatar?cible=clients', agent: false,
            headers: { 'X-OPM-Pont': SECRET, 'Content-Type': 'application/octet-stream', 'Content-Length': String(BLEU.length), 'X-OPM-Empreinte': sha(BLEU) } }, (r) => {
            const parts = []; r.on('data', d => parts.push(d)); r.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch (e) {} resolve({ code: r.statusCode, j }); });
          });
          q.setTimeout(8000, () => { q.destroy(); resolve({ code: 0, j: null }); });
          q.on('error', () => resolve({ code: 0, j: null }));
          const moitie = Math.floor(BLEU.length / 2);
          q.write(BLEU.subarray(0, moitie));
          setTimeout(async () => {
            await justin.post('/api/conversations/' + ancien.id + '/quitter', {});
            const re2 = await nu.post('/api/pont/installer', { agents: AG4.concat([{ id: 'hugo', nom: 'Hugo', role: 'Veille' }]), groupes: GP }, pont);
            recree = re2.j && re2.j.creees && re2.j.creees.conversations;
            q.end(BLEU.subarray(moitie));
          }, 400);
        });
        const maintenant = (await courant())[0];
        await T.attendre(() => fichiersPieces().length === lignesPieces().length, 4000, 25);
        const dbr = T.lireBase(base); let tab;
        try { tab = JSON.parse(dbr.prepare("SELECT v FROM meta WHERE k = 'pont_agents'").get().v); } finally { dbr.close(); }
        v('(population) le groupe a bien été recréé pendant le dépôt : une autre conversation', [!!ancien, !!maintenant, maintenant && maintenant.id !== ancien.id, recree], [true, true, true, 1]);
        v('⛔ la photo déposée pendant la réinstallation est REFUSÉE (409 cible_changee) : aucune pièce de plus, le fichier est parti, et la table ne dit pas « posée » pour le groupe neuf', [reponse.code, reponse.j && reponse.j.error, lignesPieces().length, fichiersPieces().length === lignesPieces().length, 'clients' in (tab.avatars || {}), maintenant && !maintenant.avatar], [409, 'cible_changee', avantLignes, true, false, true]);
        const apres = await avatar('clients', BLEU);
        const maint2 = (await courant())[0];
        v('…et la reprise de la Tour (même image, même cible) pose la photo sur le groupe NEUF', [apres.code, apres.j.deja, !!(maint2 && maint2.avatar)], [200, false, true]);
      }

      /* ── le budget : un emballement côté Tour s'arrête (429), et les refus ne coûtent rien ── */
      const avantBudget = lignesPieces().length;
      const reponses = []; for (let i = 0; i < 130; i++) reponses.push(await avatar('victor', ROUGE));
      const limitees = reponses.filter(r => r.code === 429);
      v('⛔ au-delà de 120 photos par minute : 429 quota_atteint (avec Retry-After), les précédentes « deja »', [limitees.length > 0, limitees.length > 0 && limitees[0].j.error + (/^\d+$/.test(limitees[0].h['retry-after'] || '') ? '' : ' sans Retry-After'), reponses.slice(0, 5).every(r => r.code === 200 && r.j.deja === true), lignesPieces().length], [true, 'quota_atteint', true, avantBudget]);
    }

    /* ── 10 · rien ne fuit ── */
    console.log('\n10. Le secret n\'est dans aucune sortie, ni /health');
    {
      const sortie = svc.sortie.texte();
      v('⛔ ni le secret ni son empreinte dans les journaux du service', [sortie.includes(SECRET), sortie.includes(sha(SECRET))], [false, false]);
      const h = await nu.get('/health');
      v('⛔ ni dans /health, qui ne dit rien du pont', [JSON.stringify(h.j).includes(SECRET), JSON.stringify(h.j).includes(sha(SECRET)), /pont/i.test(JSON.stringify(h.j))], [false, false, false]);
      const adm = await T.client(svc.base).get('/api/admin/sante', { entetes: { 'X-OPM-Admin': SECRET_ADMIN } });
      v('l\'administration continue de servir avec SON secret (le pont ne l\'a pas déplacée)', adm.code, 200);
      v('⛔ et le secret du pont n\'ouvre pas l\'administration', (await T.client(svc.base).get('/api/admin/sante', { entetes: { 'X-OPM-Admin': SECRET } })).code, 404);
    }

    /* ── 11 · les vocaux de Justin ── */
    console.log('\n11. Les vocaux : le pont demande le texte, par le même chemin et les mêmes budgets que la page');
    {
      const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
      /* ① un service SANS ouvrier : « absente » — un 200, jamais un 404 (la Tour prendrait un 404 pour un secret refusé) */
      const sonVocal = async (cl, cv, marque, dur) => {
        const corps = Buffer.concat([P.webm(3000), Buffer.from('VOCAL-' + marque)]);
        const d = await P.deposer(cl, { conv: cv, genre: 'vocal', corps });
        const m = await cl.post('/api/conversations/' + cv + '/messages', { cid: cid(), type: 'vocal', piece: d.j.id, dur, bars: [6, 14, 18, 10, 16, 6, 12, 18, 9, 14] });
        return { corps, seq: m.j.seq, code: m.code };
      };
      const vA = await sonVocal(justin, conv.Victor, 'A', 4);
      v('(population) le vocal de Justin est parti (201)', vA.code, 201);
      const sans = await nu.post('/api/pont/transcrire', { fil: 'victor', seq: vA.seq }, pont);
      v('⛔ sans ouvrier installé : 200 { ok:false, raison:"absente" } (JAMAIS un 404 ni un 5xx : la Tour les prend pour un refus du secret ou une panne)', [sans.code, sans.j], [200, { ok: false, raison: 'absente' }]);
      const nvA = (await nu.get('/api/pont/nouveaux?depuis=0', pont)).j.evenements.filter(x => x.type === 'message' && x.genre === 'vocal');
      v('⛔ le vocal sort de `nouveaux` comme `genre:"vocal"` : sa durée et son numéro, AUCUN texte et AUCUNE pièce', nvA.map(x => [x.fil, x.seq, x.texte, x.dur, Object.keys(x).sort().join(',')]), [['victor', vA.seq, null, 4, 'dur,fil,genre,gid,seq,texte,ts,type']]);
      const sondage = await justin.post('/api/conversations/' + conv.Victor + '/messages', { type: 'sondage', cid: cid(), question: 'On fait quoi ?', choix: ['a', 'b'] });
      v('(contre-épreuve) un sondage de Justin reste "autre", sans texte : la Tour garde sa note « ne lisent que le texte »', (await nu.get('/api/pont/nouveaux?depuis=0', pont)).j.evenements.filter(x => x.seq === sondage.j.seq).map(x => [x.genre, x.texte]), [['autre', null]]);
      v('⛔ un fil inconnu : 400 ; un numéro absent du corps : 400 ; sans secret : le même 404 que toute route inconnue',
        [(await nu.post('/api/pont/transcrire', { fil: 'inconnu', seq: 1 }, pont)).code, (await nu.post('/api/pont/transcrire', { fil: 'victor' }, pont)).code, (await nu.post('/api/pont/transcrire', { fil: 'victor', seq: vA.seq })).code], [400, 400, 404]);

      /* ② un service AVEC ouvrier */
      const W = fauxOuvrier(); await W.ecouter();
      const trCfg = { url: 'http://127.0.0.1:' + W.port, secret: SECRET_OUVRIER, sondeMs: 60, delaiSondeMs: 1000, delaiBaseMs: 5000, delaiParSMs: 100, file: 3, parPersonne: 2, budgetHeureS: 50, essais: 2, parHeure: 20, dureeMaxS: 60 };
      const s2 = await T.lancerService({ urlGestion: og.url, config: { pont: { actif: true, secretSha256: sha(SECRET), justin: ACCES_JUSTIN }, transcription: trCfg } });
      try {
        const n2 = T.client(s2.base);
        await n2.post('/api/pont/installer', { agents: AGENTS, groupes: GROUPES }, pont);
        const j2 = await T.connecter(s2, og, 'justin', 'pw-justin-3090');
        const c2 = (await j2.get('/api/conversations')).j.conversations.find(c => c.type === 'direct' && c.autre.prenom === 'Victor').id;
        vrai('(population) l\'ouvrier est sondé et répond', await att(async () => { const h = (await (await fetch(s2.base + '/health')).json()).transcription; return h && h.ok === true; }));
        const top = (await n2.get('/api/pont/nouveaux', pont)).j.curseur;
        const v1 = await sonVocal(j2, c2, 'B', 4);
        const ev1 = await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.some(x => x.genre === 'vocal'));
        vrai('le vocal de Justin remonte', !!ev1);
        const r1 = await n2.post('/api/pont/transcrire', { fil: 'victor', seq: v1.seq }, pont);
        v('le pont demande le texte : { ok:true, etat:"attente" }', [r1.code, r1.j], [200, { ok: true, etat: 'attente' }]);
        await att(() => W.travaux.length === 1);
        vrai('⛔ l\'ouvrier reçoit les octets EXACTS du vocal (déchiffrés par le service), le secret de l\'ouvrier, la langue de l\'auteur', W.travaux[0].octets.equals(v1.corps) && W.travaux[0].langue === 'fr' && W.sansSecret === 0);
        v('⛔ redemander pendant le calcul ne relance rien : UN seul travail, toujours « attente »', [(await n2.post('/api/pont/transcrire', { fil: 'victor', seq: v1.seq }, pont)).j.etat, W.travaux.length], ['attente', 1]);
        W.relacher(200, { ok: true, texte: 'Bonjour JETON-QWZK, peux-tu faire le point sur la semaine ?', langue: 'fr' });
        const ev2 = await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.find(x => x.type === 'transcription'));
        const t2 = (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.find(x => x.type === 'transcription');
        vrai('(population) l\'événement `transcription` est là', !!ev2 && !!t2);
        v('⛔ le texte revient en événement : fil, numéro, état, texte, langue — et rien d\'autre', t2 && [t2.fil, t2.seq, t2.etat, t2.texte, t2.langue, Object.keys(t2).sort().join(',')], ['victor', v1.seq, 'prete', 'Bonjour JETON-QWZK, peux-tu faire le point sur la semaine ?', 'fr', 'etat,fil,gid,langue,seq,texte,type']);
        v('redemander un vocal déjà transcrit : { ok:true, etat:"prete" }, aucun calcul de plus', [(await n2.post('/api/pont/transcrire', { fil: 'victor', seq: v1.seq }, pont)).j, W.travaux.length], [{ ok: true, etat: 'prete' }, 1]);

        /* le texte long : au-delà de la portée d'un événement (2 048 octets), le pont relit le texte ENTIER */
        const long = ('mot' + 'a'.repeat(5) + ' ').repeat(500).trim();      // ~3 500 signes
        const vL = await sonVocal(j2, c2, 'L', 3);
        await n2.post('/api/pont/transcrire', { fil: 'victor', seq: vL.seq }, pont); await att(() => W.travaux.length === 2);
        W.relacher(200, { ok: true, texte: long, langue: 'fr' });
        const tL = await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.find(x => x.type === 'transcription' && x.seq === vL.seq));
        const tL2 = (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.find(x => x.type === 'transcription' && x.seq === vL.seq);
        v('⛔ un texte de plus de 2 048 octets arrive ENTIER (le pont relit ce que l\'événement n\'a pas porté)', [!!tL, tL2 && tL2.etat, tL2 && tL2.texte === long], [true, 'prete', true]);

        /* les états qui ne sont pas un texte : vide, échec (retentable, puis définitif) */
        const vV = await sonVocal(j2, c2, 'V', 3);
        await n2.post('/api/pont/transcrire', { fil: 'victor', seq: vV.seq }, pont); await att(() => W.travaux.length === 3);
        W.relacher(200, { ok: true, texte: '', langue: 'fr' });
        const tV = await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.find(x => x.type === 'transcription' && x.seq === vV.seq));
        v('un vocal sans parole : { etat:"vide" }, aucun texte', tV && (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.filter(x => x.seq === vV.seq && x.type === 'transcription').map(x => [x.etat, x.texte]), [['vide', undefined]]);
        const vE = await sonVocal(j2, c2, 'E', 3);
        await n2.post('/api/pont/transcrire', { fil: 'victor', seq: vE.seq }, pont); await att(() => W.travaux.length === 4);
        W.relacher(500, { error: 'echec', etape: 'sortie' });
        await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.some(x => x.seq === vE.seq && x.etat === 'echec'));
        const redemande = await n2.post('/api/pont/transcrire', { fil: 'victor', seq: vE.seq }, pont);
        v('⛔ un échec se RETENTE (le pont redemande) : { ok:true, etat:"attente" }, un second calcul part', [redemande.j, await att(() => W.travaux.length === 5)], [{ ok: true, etat: 'attente' }, true]);
        W.relacher(500, { error: 'echec', etape: 'sortie' });
        await att(async () => (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements.filter(x => x.seq === vE.seq && x.etat === 'echec').length === 2);
        const defin = await n2.post('/api/pont/transcrire', { fil: 'victor', seq: vE.seq }, pont);
        v('…puis, les essais épuisés (2), l\'échec est DÉFINITIF et l\'ouvrier n\'est plus appelé', [defin.j, W.travaux.length], [{ ok: true, etat: 'echec', definitif: true }, 5]);

        /* les refus : tous des 200 { ok:false, raison } */
        const refus = async (seq) => (await n2.post('/api/pont/transcrire', { fil: 'victor', seq }, pont));
        v('⛔ un numéro qui n\'existe pas : { ok:false, raison:"introuvable" } — un 200', [(await refus(99999)).code, (await refus(99999)).j], [200, { ok: false, raison: 'introuvable' }]);
        const txt = await j2.post('/api/conversations/' + c2 + '/messages', { cid: cid(), texte: 'un simple texte' });
        v('⛔ un message qui n\'est PAS un vocal : "introuvable" (le pont ne devine pas ce qu\'il ne peut pas transcrire)', (await refus(txt.j.seq)).j, { ok: false, raison: 'introuvable' });
        const vLong = await sonVocal(j2, c2, 'T', 120);
        v('⛔ un vocal plus long que ce que transcrit l\'ouvrier (60 s) : "trop_long"', (await refus(vLong.seq)).j, { ok: false, raison: 'trop_long' });
        const robot = (await nu.post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: 'Réponse de Victor', cid: cid() }] }, pont)).j.resultats[0].seq;
        v('⛔ un message d\'un ROBOT n\'est pas transcrit non plus (c\'est un texte)', (await refus(robot)).j, { ok: false, raison: 'introuvable' });

        /* le budget de l'heure et la place par personne : les MÊMES que ceux de la page */
        const consomme = []; for (const m of ['p1', 'p2']) consomme.push(await sonVocal(j2, c2, m, 5));
        const rp1 = await refus(consomme[0].seq), rp2 = await refus(consomme[1].seq);
        const vTrois = await sonVocal(j2, c2, 'p3', 5);
        const rp3 = await refus(vTrois.seq);
        v('⛔ DEUX vocaux de Justin en calcul au plus : le troisième est refusé "mes_vocaux" (la règle de la page, pas une règle de plus)', [rp1.j.etat, rp2.j.etat, rp3.j.raison], ['attente', 'attente', 'mes_vocaux']);
        const pageRefus = await j2.post('/api/conversations/' + c2 + '/messages/transcrire', { seq: vTrois.seq });
        v('…et la PAGE, au nom de la même personne, est refusée de la même façon (429 transcription_en_cours) : un seul compteur', [pageRefus.code, pageRefus.j.error], [429, 'transcription_en_cours']);
        const suivant = async (texte) => { await att(() => W.enAttente.length > 0); W.relacher(200, { ok: true, texte, langue: 'fr' }); };      // l'ouvrier ne prend qu'UN travail à la fois : on relâche celui qui est arrivé
        await suivant('un');
        await att(async () => (await refus(vTrois.seq)).j.etat === 'attente');                                                  // une place s'est libérée : le troisième part
        await suivant('deux'); await suivant('trois');
        await att(async () => { const e = (await n2.get('/api/pont/nouveaux?depuis=' + top, pont)).j.evenements; return [consomme[0].seq, consomme[1].seq, vTrois.seq].every(q => e.some(x => x.seq === q && x.etat === 'prete')); });
        const vBudget = await sonVocal(j2, c2, 'bud', 55);
        v('⛔ le BUDGET de secondes de l\'heure (50 s) se compte sur les vocaux du pont comme sur ceux de la page : "budget", avec son attente', [(await refus(vBudget.seq)).j.raison, (await refus(vBudget.seq)).j.attente > 0], ['budget', true]);
        v('…et la page voit le même budget épuisé (429 transcription_budget)', (await j2.post('/api/conversations/' + c2 + '/messages/transcrire', { seq: vBudget.seq })).j.error, 'transcription_budget');

        /* l'ouvrier en panne */
        W.panne = true;
        await att(async () => (await (await fetch(s2.base + '/health')).json()).transcription.ok === false, 8000);
        const vPanne = await sonVocal(j2, c2, 'panne', 3);
        v('⛔ l\'ouvrier ne répond plus : "indisponible" (un 200 — la Tour retentera, pas de panne du pont)', (await refus(vPanne.seq)).j, { ok: false, raison: 'indisponible' });
        W.panne = false;

        /* ③ le plafond du pont lui-même */
        const reps = []; for (let i = 0; i < 75; i++) reps.push((await n2.post('/api/pont/transcrire', { fil: 'victor', seq: 99999 }, pont)).code);
        v('⛔ au-delà de 60 demandes par minute : 429 quota_atteint (un emballement de la Tour s\'arrête ici)', [reps.includes(429), (await n2.post('/api/pont/transcrire', { fil: 'victor', seq: 99999 }, pont)).j.error], [true, 'quota_atteint']);
        const sortie2 = s2.sortie.texte();
        v('⛔ ni le secret du pont ni celui de l\'ouvrier dans les journaux du service', [sortie2.includes(SECRET), sortie2.includes(SECRET_OUVRIER)], [false, false]);
        v('⛔ ni le texte d\'un vocal (JETON-QWZK) dans les journaux', sortie2.includes('JETON-QWZK'), false);
      } finally { await s2.arreter(); try { W.serveur.close(); } catch (e) {} }
    }
    fluxJ.fermer();
  } finally {
    if (svc) await svc.arreter();
    await og.fermer();
  }
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => fin());
