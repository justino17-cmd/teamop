/* ⛔ CE QUE CE FICHIER GARDE — LA MATRICE D'ACCÈS : chaque route, contre chaque profil (famille 4).

   `server-msg/manifeste.js` est UNE DONNÉE : chaque route y a sa garde. Ce banc part du MÊME tableau et
   joue CHAQUE route contre six profils — anonyme, jeton invalide, compte non confirmé, personne
   confirmée mais non-membre, membre, administrateur — avec une table de ce qui doit se passer :

        P public · S session · V session ET adresse confirmée · M membre · A administrateur · B bêta

   ⛔ UNE ROUTE ABSENTE DE LA MATRICE FAIT TOMBER LE BANC (et une ligne de matrice sans route aussi) :
   ajouter une route au manifeste oblige à dire, ICI, ce qu'elle doit refuser à qui. Et il n'existe aucun
   autre chemin d'enregistrement (`app.get(`… hors de la boucle de montage : zéro), sinon une route
   montée « à côté » n'aurait jamais de ligne.
   ⛔ UN OBJET SANS DROIT RÉPOND 404, JAMAIS 403 : pour chaque route M/A, la réponse faite à un non-membre
   d'une conversation qui EXISTE est identique, octet pour octet, à celle d'une conversation qui
   n'existe pas — c'est ce qui empêche de sonder l'existence d'une conversation.
   ⛔ UN REFUS N'ÉCRIT RIEN : l'état de toute la base est relevé avant et après chaque cellule refusée.
   ⛔ L'AUTORITÉ NE VIENT PAS DU CORPS : un `{auteur, uid, role}` envoyé pour se faire passer pour un autre
   est ignoré (cellule dédiée).

   Les fixtures sont écrites DIRECTEMENT dans la base par le module de stockage (WAL : deux processus, une
   base — comme `test-724`), ce qui permet d'avoir un compte NON CONFIRMÉ, que la porte bêta ne fabrique
   jamais (elle confirme par construction). Les gardes se jouent, elles, par le VRAI service en HTTP. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { MANIFESTE } = require(path.join(T.SERVICE, 'manifeste.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');

/* La TABLE : pour chaque route, la requête VALIDE (jouée par un acteur qui en a le droit) et son code. */
const T_OK = [200, 201];
const MATRICE = {
  'health':             { ok: () => ['GET', '/health'], codes: [200] },
  'config':             { ok: () => ['GET', '/api/config'], codes: [200] },
  'beta.entrer':        { ok: () => ['POST', '/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }], codes: [200] },
  'compte.deconnexion': { ok: () => ['POST', '/api/compte/deconnexion', {}], codes: [200] },
  'moi':                { ok: () => ['GET', '/api/moi'], codes: [200] },
  'moi.maj':            { ok: () => ['POST', '/api/moi/maj', { statut: 'ok' }], codes: [200] },
  'flux':               { ok: () => ['FLUX', '/api/flux'], codes: [200] },
  'sync':               { ok: () => ['GET', '/api/sync'], codes: [200] },
  'notif.liste':        { ok: () => ['GET', '/api/notifications'], codes: [200] },
  'notif.lues':         { ok: () => ['POST', '/api/notifications/lues', { toutes: true }], codes: [200] },
  'contacts':           { ok: () => ['GET', '/api/contacts'], codes: [200] },
  'contacts.lien':      { ok: () => ['POST', '/api/contacts/lien', {}], codes: [201] },
  'contacts.liens.revoquer': { ok: () => ['POST', '/api/contacts/liens/revoquer', {}], codes: [200] },
  'contacts.retirer':   { ok: (F, a) => ['POST', '/api/contacts/retirer', { uid: F.cibleDe(a) }], codes: [200] },
  'contacts.bloquer':   { ok: (F, a) => ['POST', '/api/contacts/bloquer', { uid: F.cibleDe(a) }], codes: [200] },
  'contacts.debloquer': { prep: (F, S, a) => S.contactEtat(a, F.cibleDe(a), 'bloque'), ok: (F, a) => ['POST', '/api/contacts/debloquer', { uid: F.cibleDe(a) }], codes: [200] },
  'liens.lire':         { ok: (F) => ['POST', '/api/liens/lire', { code: F.code }], codes: [200] },
  'liens.accepter':     { ok: (F) => ['POST', '/api/liens/accepter', { code: F.code }], codes: [200] },
  'personnes.lire':     { ok: (F) => ['GET', '/api/personnes/' + F.A], codes: [200] },
  'conv.liste':         { ok: () => ['GET', '/api/conversations'], codes: [200] },
  'conv.directe':       { ok: (F, a) => ['POST', '/api/conversations/directe', { uid: a === F.A ? F.B : F.A }], codes: T_OK },
  'conv.groupe':        { ok: () => ['POST', '/api/conversations/groupe', { nom: 'Nouveau', membres: [] }], codes: [201] },
  'conv.lire':          { ok: (F) => ['GET', '/api/conversations/' + F.G], codes: [200] },
  'conv.maj':           { ok: (F) => ['POST', '/api/conversations/' + F.G + '/maj', { nom: 'Renommé' }], codes: [200] },
  'conv.membres.ajouter': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/membres/ajouter', { uids: [F.C] }], codes: [200] },
  'conv.membres.retirer': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/membres/retirer', { uid: F.B }], codes: [200] },
  'conv.admins':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/admins', { uid: F.B, admin: true }], codes: [200] },
  'conv.lien':          { ok: (F) => ['POST', '/api/conversations/' + F.G + '/lien', {}], codes: [201] },
  'conv.liens.revoquer': { ok: (F) => ['POST', '/api/conversations/' + F.G + '/liens/revoquer', {}], codes: [200] },
  'conv.quitter':       { ok: (F) => ['POST', '/api/conversations/' + F.G + '/quitter', {}], codes: [200] },
  'conv.prefs':         { ok: (F) => ['POST', '/api/conversations/' + F.G + '/prefs', { epingle: true }], codes: [200] },
  'conv.lu':            { ok: (F) => ['POST', '/api/conversations/' + F.G + '/lu', { seq: 1 }], codes: [200] },
  'conv.saisie':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/saisie', { actif: true }], codes: [200] },
  'msg.liste':          { ok: (F) => ['GET', '/api/conversations/' + F.G + '/messages'], codes: [200] },
  'msg.envoyer':        { ok: (F) => ['POST', '/api/conversations/' + F.G + '/messages', { cid: 'cid-' + crypto.randomBytes(6).toString('hex'), texte: 'bonjour' }], codes: [201] },
  'msg.modifier':       { ok: (F, a) => ['POST', '/api/conversations/' + F.G + '/messages/modifier', { seq: F.seqDe(a), texte: 'modifié' }], codes: [200] },
  'msg.supprimer':      { ok: (F, a) => ['POST', '/api/conversations/' + F.G + '/messages/supprimer', { seq: F.seqDe(a), pour: 'tous' }], codes: [200] },
  'msg.reagir':         { ok: (F) => ['POST', '/api/conversations/' + F.G + '/messages/reagir', { seq: 1, emoji: '👍' }], codes: [200] },
  /* Le téléphone (étape 2). Les trois routes PUBLIQUES passent la garde pour tout le monde : `tel.code` avec un numéro belge NEUF à chaque
     cellule (un plafond « 1 par 60 s par numéro » refuserait la deuxième sinon), `tel.verifier` avec un code que personne n'a demandé — la
     réponse d'une garde P qui a passé est le 401 uniforme `code_invalide`, et `tel.appareil` sans jeton d'appareil le 401 `appareil_inconnu`. */
  'tel.code':           { ok: () => ['POST', '/api/tel/code', { numero: '+3247' + String(crypto.randomInt(1000000, 9999999)) }], codes: [200] },
  'tel.verifier':       { ok: () => ['POST', '/api/tel/verifier', { numero: '+32470123456', code: '000000' }], codes: [401] },
  'tel.appareil':       { ok: () => ['POST', '/api/tel/appareil', {}], codes: [401] },
  'moi.confidentialite.lire': { ok: () => ['GET', '/api/moi/confidentialite'], codes: [200] },
  'moi.confidentialite': { ok: () => ['POST', '/api/moi/confidentialite', { trouvable: 'tous' }], codes: [200] },
  'contacts.chercher':  { ok: () => ['POST', '/api/contacts/chercher', { numero: '+32470999888' }], codes: [200] },
  'contacts.ajouter':   { ok: (F) => ['POST', '/api/contacts/ajouter', { id: F.A }], codes: [400, 404] },   // sans recherche préalable, ou son propre identifiant : la garde V a passé, le geste dit non
};

/* Ce que chaque garde doit répondre à chaque profil : { code, error } ou 'passe'. */
const PROFILS = ['anonyme', 'invalide', 'nonconfirme', 'nonmembre', 'membre', 'admin'];
const ATTENDU = {
  P: { anonyme: 'passe', invalide: 'passe', nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  B: { anonyme: 'passe', invalide: 'passe', nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  S: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: 'passe', nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  V: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [403, 'adresse_non_confirmee'], nonmembre: 'passe', membre: 'passe', admin: 'passe' },
  M: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: 'passe', admin: 'passe' },
  A: { anonyme: [401, 'session_requise'], invalide: [401, 'session_requise'], nonconfirme: [404, 'introuvable'], nonmembre: [404, 'introuvable'], membre: [403, 'interdit'], admin: 'passe' },
};

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const lire = T.lireBase;
  const instantane = () => {
    const d = lire(path.join(svc.data, 'msg.db'));
    try { return ['personne', 'conversation', 'membre', 'message', 'reaction', 'msg_masque', 'lien', 'notification', 'contact', 'journal'].map(t => d.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(CAST(rowid AS TEXT))),0) AS s FROM ' + t).get().n).join(',') + '|' + d.prepare('SELECT COALESCE(SUM(lu_seq),0) AS a, COALESCE(SUM(role=\'admin\'),0) AS b, COALESCE(SUM(epingle),0) AS c FROM membre').get().a; } finally { d.close(); }
  };
  try {
    console.log('Le manifeste et la matrice disent la MÊME chose');
    {
      const ids = MANIFESTE.map(r => r.id);
      v('⛔ aucune route du manifeste n\'est absente de la matrice', ids.filter(i => !MATRICE[i]), []);
      v('⛔ aucune ligne de matrice ne vise une route qui n\'existe plus', Object.keys(MATRICE).filter(i => !ids.includes(i)), []);
      v('les identifiants du manifeste sont uniques, et chaque (méthode, chemin) aussi', [new Set(ids).size === ids.length, new Set(MANIFESTE.map(r => r.m + ' ' + r.p)).size === ids.length], [true, true]);
      v('toutes les gardes du manifeste sont connues de la table des attentes', MANIFESTE.filter(r => !ATTENDU[r.garde]).map(r => r.id), []);
      vrai('population : au moins 30 routes à jouer', MANIFESTE.length >= 30);
      const sources = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'app.js'), 'utf8')) + T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'routes.js'), 'utf8')) + T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'index.js'), 'utf8'));
      v('⛔ aucune route enregistrée EN DEHORS de la boucle de montage du manifeste (app.get/post/put/delete/all/use(\'/api…\' : zéro)', (sources.match(/\bapp\.(get|post|put|patch|delete|all)\(/g) || []).length + (sources.match(/\bapp\.use\(\s*['"`]\/(?!api['"`])/g) || []).length, 0);
      vrai('et le montage lit bien le manifeste (une seule boucle, `app[r.m.toLowerCase()]`)', (sources.match(/app\[r\.m\.toLowerCase\(\)\]\(/g) || []).length === 1);
      const c = T.client(svc.base);
      for (const [m, p] of [['GET', '/api/inconnue'], ['POST', '/api/inconnue'], ['GET', '/api/conversations/x/inconnue'], ['POST', '/api/moi'], ['GET', '/api/beta/entrer'], ['GET', '/api/conversations/' + 'c_' + '0'.repeat(32) + '/maj']]) {
        const r = await c.appel(m, p, m === 'POST' ? {} : undefined);
        v('méthode ou chemin hors manifeste : ' + m + ' ' + p + ' → 404 (pas 405, pas 200)', r.code, 404);
      }
    }

    // ── Les personnes (fixtures écrites par le module de stockage) ─────────────────────────
    const nouvellePers = (nom, confirme) => S.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(3).toString('hex'), prenom: nom, nom: 'Matrice', origine: confirme ? 'beta' : 'compte', verifie: confirme });
    const A = nouvellePers('Ana', true), B = nouvellePers('Ben', true), C = nouvellePers('Cleo', true), N = nouvellePers('Nina', false), Z = nouvellePers('Zed', true);
    for (const p of [B, C]) S.contactLier(A.id, p.id);
    let K = {};
    vrai('population : une personne NON CONFIRMÉE existe (la porte bêta n\'en fabrique jamais)', N.verifie === false && A.verifie === true);

    const acteurs = { nonconfirme: N, nonmembre: C, membre: B, admin: A };
    const session = (p) => { const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 }); return j; };
    const clientDe = (profil) => {
      const c = T.client(svc.base);
      if (profil === 'invalide') c.poserCookie(jeton());
      else if (acteurs[profil]) c.poserCookie(session(acteurs[profil]));
      return c;
    };
    let cellules = 0, refusSansEffet = 0, refusAvecEffet = [];

    console.log('\nCHAQUE route contre CHAQUE profil');
    for (const r of MANIFESTE) {
      const M = MATRICE[r.id];
      /* La fixture de CETTE route : un groupe neuf (Ana admin, Ben membre, Cleo dehors), un message de chacun,
         un lien d'invitation de Zed, un contact bloquable par acteur. */
      /* Un contact NEUF par acteur et par route : la route précédente a pu retirer ou bloquer le sien. */
      K = { [A.id]: nouvellePers('K1', true), [B.id]: nouvellePers('K2', true), [C.id]: nouvellePers('K3', true) };
      for (const [u, k] of Object.entries(K)) S.contactLier(u, k.id);
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Matrice ' + r.id, membres: [B.id], annonces_seules: false, ephemere_s: 0 }).id;
      const mA = S.messageEnvoyer({ conv: G, auteur: A.id, cid: 'cid-fx-ana-0001', texte: 'de Ana' }), mB = S.messageEnvoyer({ conv: G, auteur: B.id, cid: 'cid-fx-ben-0001', texte: 'de Ben' });
      const code = crypto.randomBytes(16).toString('base64url');
      S.lienCreer({ h: sha(code), genre: 'contact', cible: null, par: Z.id, ttlMs: 3600000, max: 50 });
      const F = { A: A.id, B: B.id, C: C.id, G, code, seqDe: (a) => a === A.id ? mA.seq : mB.seq, cibleDe: (a) => K[a] ? K[a].id : A.id };
      // 404 et non 403 : un non-membre d'une conversation qui existe n'apprend RIEN de plus qu'avec une qui n'existe pas.
      // ⚠️ AVANT la boucle des profils : la cellule « admin » de `conv.membres.ajouter` fait de Cleo un membre.
      if (r.garde === 'M' || r.garde === 'A') {
        const c = clientDe('nonmembre');
        const reel = M.ok(F, C.id), faux = M.ok(Object.assign({}, F, { G: 'c_' + '0'.repeat(32) }), C.id);
        const a = await c.appel(reel[0], reel[1], reel[2]), b = await c.appel(faux[0], faux[1], faux[2]);
        v('⛔ ' + r.id + ' : la réponse faite à un NON-MEMBRE d\'une conversation qui existe est identique à celle d\'une conversation INEXISTANTE (même code, même corps)', [a.code, a.txt], [b.code, b.txt]);
      }
      for (const profil of PROFILS) {
        const acteur = acteurs[profil];
        const attendu = ATTENDU[r.garde][profil];
        const c = clientDe(profil);
        const ok = M.ok(F, acteur && acteur.id);
        if (M.prep && attendu === 'passe' && acteur) M.prep(F, S, acteur.id);
        const avant = instantane();
        let code_, err_;
        if (ok[0] === 'FLUX') {
          const f = await T.flux(c);
          code_ = f.statut; err_ = f.corps && f.corps.error; f.fermer();
        } else {
          const rep = await c.appel(ok[0], ok[1], ok[2]);
          code_ = rep.code; err_ = rep.j && rep.j.error;
        }
        cellules++;
        if (attendu === 'passe') {
          vrai(r.id + ' [' + r.garde + '] × ' + profil + ' → passe la garde et réussit (' + M.codes.join('/') + ')', M.codes.includes(code_));
        } else {
          v(r.id + ' [' + r.garde + '] × ' + profil + ' → ' + attendu[0] + ' ' + attendu[1], [code_, err_], attendu);
          const apres = instantane();
          if (apres === avant) refusSansEffet++; else refusAvecEffet.push(r.id + '×' + profil);
        }
      }
    }
    v('⛔ ' + cellules + ' cellules jouées = routes × profils (aucune sautée en silence)', cellules, MANIFESTE.length * PROFILS.length);
    vrai('population : des refus ont bien été relevés avant/après (' + refusSansEffet + ')', refusSansEffet >= 60);
    v('⛔ AUCUN refus n\'a écrit quoi que ce soit (instantané de la base identique avant/après)', refusAvecEffet, []);

    console.log('\nUn identifiant mal formé est un 404, jamais une erreur de format qui distinguerait les cas');
    {
      const c = clientDe('admin');
      for (const id of ['x', 'c_', 'c_zzzz', 'C_' + '0'.repeat(32), 'c_' + '0'.repeat(31), 'c_' + '0'.repeat(33), '..', '%00', 'c_' + '0'.repeat(32) + '%20']) {
        const a = await c.get('/api/conversations/' + id), b = await c.get('/api/conversations/' + id + '/messages');
        v('« ' + id + ' » → 404 introuvable (lecture et messages)', [a.code, a.j && a.j.error, b.code], [404, 'introuvable', 404]);
      }
      v('une fiche personne mal formée : 404', (await c.get('/api/personnes/x')).code, 404);
    }

    console.log('\nL\'autorité ne vient pas du corps : un auteur, un uid ou un rôle envoyés sont ignorés');
    {
      const F = {}; const G = S.convCreerGroupe({ createur: A.id, nom: 'Usurpation', membres: [B.id], annonces_seules: false, ephemere_s: 0 }).id;
      const cB = clientDe('membre');
      const r = await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-usurp-0001', texte: 'je me fais passer pour Ana', auteur: A.id, uid: A.id, role: 'admin', conv: 'c_' + '1'.repeat(32) });
      const lu = (await cB.get('/api/conversations/' + G + '/messages')).j.messages.find(m => m.seq === r.j.seq);
      v('⛔ l\'auteur du message est la SESSION (Ben), pas le champ `auteur`', lu.auteur, B.id);
      const p = await cB.post('/api/conversations/' + G + '/maj', { nom: 'Pirate', role: 'admin' });
      v('⛔ un membre non administrateur qui ajoute `role:"admin"` à sa demande reste refusé (403)', p.code, 403);
      const q = await cB.post('/api/moi/maj', { prenom: 'Ben', id: A.id, verifie: false, origine: 'compte', etat: 'suspendu' });
      const moi = (await cB.get('/api/moi')).j.moi;
      v('⛔ /api/moi/maj ignore id, verifie, origine, etat : la personne reste elle-même, confirmée, bêta, active', [q.code, moi.id === B.id, moi.verifie, moi.origine, moi.etat], [200, true, true, 'beta', 'actif']);
      void F;
    }

    console.log('\nUn blocage coupe l\'écriture dans la directe (404, comme si elle n\'existait pas) mais pas la lecture de l\'historique');
    {
      const D = S.convDirecteObtenir(A.id, B.id).id;
      S.messageEnvoyer({ conv: D, auteur: A.id, cid: 'cid-bloc-0001', texte: 'avant le blocage' });
      const cA = clientDe('admin'), cB = clientDe('membre');
      v('population : avant le blocage, Ben écrit à Ana', (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0002', texte: 'salut' })).code, 201);
      S.contactEtat(A.id, B.id, 'bloque');
      const e = await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0003', texte: 'je suis bloqué' });
      v('⛔ Ben, BLOQUÉ par Ana, n\'écrit plus : 404 introuvable (il ne doit pas apprendre qu\'il est bloqué)', [e.code, e.j.error], [404, 'introuvable']);
      const e2 = await cA.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0004', texte: 'je bloque et j\'écris' });
      v('Ana, qui a bloqué, n\'écrit pas non plus tant qu\'elle n\'a pas débloqué', e2.code, 404);
      v('l\'historique reste lisible des deux côtés', [(await cA.get('/api/conversations/' + D + '/messages')).code, (await cB.get('/api/conversations/' + D + '/messages')).code], [200, 200]);
      v('⛔ Ben ne peut plus ouvrir de directe avec Ana (404) tant qu\'il est bloqué', (await cB.post('/api/conversations/directe', { uid: A.id })).code, 404);
      v('⛔ ni réagir dans cette directe', (await cB.post('/api/conversations/' + D + '/messages/reagir', { seq: 1, emoji: '👍' })).code, 404);
      S.contactEtat(A.id, B.id, 'ok');
      v('débloqué, l\'écriture reprend', (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0005', texte: 'de nouveau' })).code, 201);
      S.contactRetirer(A.id, B.id); S.contactLier(A.id, B.id);
      v('retirer le contact coupe aussi l\'écriture (jusqu\'à ce qu\'ils redeviennent contacts)', await (async () => { S.contactRetirer(A.id, B.id); const r = (await cB.post('/api/conversations/' + D + '/messages', { cid: 'cid-bloc-0006', texte: 'plus contact' })).code; S.contactLier(A.id, B.id); return r; })(), 404);
    }

    console.log('\nUn groupe « seuls les admins écrivent » : le membre est refusé (403 annonces_seules), l\'administrateur écrit');
    {
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Annonces', membres: [B.id], annonces_seules: true, ephemere_s: 0 }).id;
      const cA = clientDe('admin'), cB = clientDe('membre');
      const m = await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00001', texte: 'moi aussi' });
      v('⛔ un membre simple : 403 annonces_seules', [m.code, m.j.error], [403, 'annonces_seules']);
      v('l\'administrateur écrit', (await cA.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00002', texte: 'annonce' })).code, 201);
      v('le membre peut toujours LIRE', (await cB.get('/api/conversations/' + G + '/messages')).code, 200);
      v('et réagir (une réaction n\'est pas un message)', (await cB.post('/api/conversations/' + G + '/messages/reagir', { seq: 2, emoji: '👍' })).code, 200);
      await cA.post('/api/conversations/' + G + '/maj', { annonces_seules: false });
      v('l\'administrateur rouvre le groupe : le membre écrit', (await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-ann-00003', texte: 'ouvert' })).code, 201);
    }

    console.log('\nPersonne qui a quitté ou été retiré n\'a plus aucun droit sur la conversation');
    {
      const G = S.convCreerGroupe({ createur: A.id, nom: 'Départs', membres: [B.id, C.id], annonces_seules: false, ephemere_s: 0 }).id;
      const cB = clientDe('membre'), cC = clientDe('nonmembre'), cA = clientDe('admin');
      v('population : Ben lit le groupe', (await cB.get('/api/conversations/' + G)).code, 200);
      await cB.post('/api/conversations/' + G + '/quitter', {});
      v('⛔ après avoir QUITTÉ : 404 en lecture, en messages, en écriture', [(await cB.get('/api/conversations/' + G)).code, (await cB.get('/api/conversations/' + G + '/messages')).code, (await cB.post('/api/conversations/' + G + '/messages', { cid: 'cid-dep-00001', texte: 'x' })).code], [404, 404, 404]);
      await cA.post('/api/conversations/' + G + '/membres/retirer', { uid: C.id });
      v('⛔ après avoir été RETIRÉE par un admin : 404 partout', [(await cC.get('/api/conversations/' + G)).code, (await cC.get('/api/conversations/' + G + '/messages')).code, (await cC.post('/api/conversations/' + G + '/lu', { seq: 1 })).code], [404, 404, 404]);
      v('et la conversation n\'est plus dans sa liste', (await cC.get('/api/conversations')).j.conversations.some(c => c.id === G), false);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  S.fermer();
  await svc.arreter(); await og.fermer();
  fin();
})();
