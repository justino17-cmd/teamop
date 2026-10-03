/* ⛔ CE QUE CE FICHIER GARDE — LES PIÈCES, JOUÉES CONTRE LE VRAI SERVICE EN HTTP (famille 3, modèle `test-903`) : photos, vocaux, fichiers, photos de profil, et les deux
   interrupteurs de confidentialité RÉCIPROQUES.

   `server-msg/index.js` tel qu'il sera déployé, dans un processus isolé (configuration, données, clé, port libre à lui — jamais `msg*.teamop.fr`), avec un faux OP GESTION pour la
   porte bêta. `test-942` éprouve le module des pièces seul (scellage, types, métadonnées) ; celui-ci dit que ces pièces sont BRANCHÉES (la leçon de `test-726` : un défaut de
   câblage passe sous les bancs de modules) : qu'un dépôt atteint le disque scellé, qu'une route refuse ce qu'elle doit, que les droits de lecture sont ceux de SERVEUR.md § 3.3.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · UNE PIÈCE NE SE LIT QUE SI LE MESSAGE QUI LA PORTE SE LIT : pas avant son arrivée dans le groupe, pas supprimé, pas masqué « pour moi », pas échu, pas retiré du groupe ;
       tant qu'elle n'est pas envoyée elle est à son dépositaire seul. Et le refus est le MÊME que pour une pièce qui n'existe pas ;
     · UNE LONGUEUR EST OBLIGATOIRE (411) ET LE MAXIMUM SE JUGE AVANT DE LIRE (413 immédiat sur une annonce de 100 Mo) ;
     · LE TYPE SE JUGE AUX OCTETS (415) et ce qui est servi « en ligne » est une image ou un son jugés aux octets — un SVG déposé comme fichier, un PNG déposé comme fichier, sont
       servis en `application/octet-stream` + `attachment` ;
     · UN MESSAGE ATTACHE SES PIÈCES OU N'EXISTE PAS : la pièce d'un autre, d'une autre conversation, du mauvais genre, déjà envoyée — aucune n'est attachable (404 `piece_inconnue`), et rien
       n'est à moitié attaché ; un renvoi (même `cid`) ne fait ni deux messages ni deux attachements ;
     · LES PIÈCES PARTENT AVEC CE QUI LES PORTE, FICHIER COMPRIS : « supprimer pour tous », un éphémère échu, une pièce jamais envoyée (24 h), une photo remplacée, une conversation
       disparue — et l'identifiant est noté dans `purge`. Le FICHIER se garde sans l'aide de la réconciliation (qui ôte aussi un fichier sans ligne de plus de dix minutes) : ceux du temps
       sont datés dans le futur pour qu'elle ne les voie pas ;
     · UNE IMAGE « BOURRÉE » DE MILLIONS DE SEGMENTS VIDES (11,6 Mo, quatre dépôts en parallèle d'un seul compte) est REFUSÉE sans que le processus du service gagne plus de 300 Mo ni que /health gèle,
       et la réserve de mémoire d'images pleine répond 429 « dans un instant » puis se rend (relecture du gardien, B1) ;
     · LE NOM D'UN FICHIER NE VOYAGE PAS DANS L'ADRESSE (le journal d'accès d'un proxy l'écrirait) : en-tête `X-OPM-Nom` encodé, ancien paramètre refusé, nom long coupé SANS perdre son extension ;
     · LE BALAYEUR N'EST PAS UNE GARDE : sur un service dont il ne passe jamais, une pièce échue (éphémère échu, jamais envoyée depuis 24 h) ne se lit plus et ne s'attache plus, et un
       message marqué supprimé n'ouvre plus sa pièce — l'échéance se juge à la lecture et à l'attachement, pas seulement quand le balayeur passe ;
     · RIEN DE CE QUI EST ENVOYÉ N'EST EN CLAIR SUR LE DISQUE (un canari dans une photo, un vocal, un fichier et son nom : absent de TOUS les fichiers sous OPMSG_DATA) ni dans les journaux ;
     · LES INTERRUPTEURS SONT RÉCIPROQUES : qui coupe sa présence ne la montre pas (même en se déconnectant puis en revenant) ET ne voit celle de personne ; qui coupe ses confirmations de lecture ne montre pas son « Lu » ET ne voit
       celui de personne — dans une conversation à deux comme dans un groupe. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { piecesConfig } = require(path.join(T.SERVICE, 'config.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 15);
const aleatoire = () => crypto.randomBytes(6).toString('hex');
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-943-'));
const PNG = F.png();

const LOGINS = ['alice', 'bruno', 'carla', 'dave', 'eve', 'fred', 'gina'];
const COMPTES = () => Object.fromEntries(LOGINS.map(l => [l, { pass: 'pw-' + l + '-1234', nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }]));

/* ══ 0. LA MIGRATION 3 — avant tout service : une base d'AVANT, des données qui doivent survivre ═══════════════════════════════════════ */
function migration() {
  console.log('La migration 3 : `message` reconstruite sans perdre une ligne, `piece` créée, les types photo et fichier acceptés');
  const chemin = path.join(bac, 'ancienne.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
  const mk = (migrations) => ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations });
  const v2 = mk(MIGRATIONS.slice(0, 2));
  const al = v2.personneCreer({ identifiant: 'beta:alice', prenom: 'Alice', nom: 'A', origine: 'beta', verifie: true });
  const bo = v2.personneCreer({ identifiant: 'beta:bob', prenom: 'Bob', nom: 'B', origine: 'beta', verifie: true });
  v2.contactLier(al.id, bo.id);
  const g = v2.convCreerGroupe({ createur: al.id, nom: 'Groupe d\'avant', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
  const m1 = v2.messageEnvoyer({ conv: g.id, auteur: al.id, cid: 'cid-avant-0001', texte: 'écrit AVANT la migration 3' });
  v2.messageReagir({ conv: g.id, seq: m1.seq, uid: bo.id, emoji: '👍' });
  v2.messageSupprimer({ conv: g.id, seq: m1.seq, uid: bo.id, pour: 'moi', admin: false });
  const m2 = v2.messageEnvoyer({ conv: g.id, auteur: bo.id, cid: 'cid-avant-0002', texte: 'un second, de Bob' });
  v('une base d\'AVANT est au schéma 2', v2.schema(), 2);
  v2.fermer();

  const v3 = mk(MIGRATIONS);
  v('⛔ rouverte avec la migration 3 : schéma 3', v3.schema(), 3);
  vrai('⛔ une copie « avant-v3 » a été gardée AVANT de reconstruire la table', fs.existsSync(chemin + '.avant-v3'));
  v('les messages d\'avant sont intacts (texte, auteur, numéro), pour Alice comme pour Bob', [v3.messagesDe(g.id, al.id).messages.filter(m => m.type === 'texte').map(m => m.texte), v3.messagesDe(g.id, bo.id).messages.filter(m => m.type === 'texte').map(m => m.texte)],
    [['écrit AVANT la migration 3', 'un second, de Bob'], ['un second, de Bob']]);
  v('⛔ la réaction et le masque « supprimer pour moi » survivent (les tables enfants nomment « message » : le renommage les a rattachées à la table neuve)', [v3.reactionsDe(g.id, m1.seq).length, v3.messagesDe(g.id, bo.id).messages.some(m => m.seq === m1.seq)], [1, false]);
  v('le renvoi d\'un `cid` déjà utilisé reste idempotent (UNIQUE(conv, auteur, cid) a été recréé)', v3.messageEnvoyer({ conv: g.id, auteur: bo.id, cid: 'cid-avant-0002', texte: 'doublon' }).deja, true);
  const brut = new (require('node:sqlite').DatabaseSync)(chemin);
  brut.exec('PRAGMA foreign_keys = ON');
  v('aucune ligne orpheline après la reconstruction (foreign_key_check)', brut.prepare('PRAGMA foreign_key_check').all().length, 0);
  v('les clés étrangères sont REMISES en marche après la migration', brut.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  const tables = brut.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(x => x.name);
  vrai('la table `piece` existe, `message_v3` n\'est plus là', tables.includes('piece') && !tables.includes('message_v3'));
  const index = brut.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map(x => x.name);
  vrai('les index sont là, dont celui des éphémères de `message` (recréé) et ceux de `piece`', ['message_expire', 'piece_proprio', 'piece_message', 'piece_expire'].every(i => index.includes(i)));
  const ins = (type) => { try { brut.prepare("INSERT INTO message(conv, seq, id, auteur, cid, ts, type) VALUES(?, ?, ?, ?, ?, 1, ?)").run(g.id, 900 + Math.floor(Math.random() * 90000), 'm_t' + aleatoire(), al.id, 'c' + aleatoire(), type); return true; } catch (e) { return false; } };
  v('⛔ `message.type` accepte maintenant « photo » et « fichier » (et toujours « vocal »), et refuse un type inventé', [ins('photo'), ins('fichier'), ins('vocal'), ins('texte'), ins('pirate')], [true, true, true, true, false]);
  brut.prepare('DELETE FROM message WHERE conv = ? AND seq = ?').run(g.id, m1.seq);
  v('⛔ la clé étrangère de `reaction` suit la table reconstruite : supprimer le message supprime sa réaction (cascade)', brut.prepare('SELECT COUNT(*) AS n FROM reaction WHERE conv = ? AND seq = ?').get(g.id, m1.seq).n, 0);
  const piece = (genre, conv) => { try { brut.prepare("INSERT INTO piece(id, proprio, conv, genre, taille, mime, cree) VALUES(?, ?, ?, ?, 10, 'x', 1)").run('f_' + aleatoire(), al.id, conv, genre); return true; } catch (e) { return false; } };
  v('⛔ `piece` : un message a toujours sa conversation (une photo sans conversation est refusée), une photo de profil peut n\'en avoir aucune, un genre inventé est refusé', [piece('photo', null), piece('avatar', null), piece('photo', g.id), piece('pirate', g.id)], [false, true, true, false]);
  vrai('⛔ `piece.taille` doit être positive (une pièce vide ne se range pas)', (() => { try { brut.prepare("INSERT INTO piece(id, proprio, conv, genre, taille, mime, cree) VALUES('f_vide', ?, NULL, 'avatar', 0, 'x', 1)").run(al.id); return false; } catch (e) { return true; } })());
  brut.close();
  const vu = (d) => JSON.stringify([d.messagesDe(g.id, al.id).messages.map(m => [m.seq, m.type, m.texte, m.auteur]), d.messagesDe(g.id, bo.id).messages.map(m => [m.seq, m.type, m.texte, m.auteur])]);
  const avantRejeu = vu(v3);
  vrai('population : la base à rejouer porte des messages (le contrôle ne compare pas du vide)', JSON.parse(avantRejeu)[0].length >= 5);
  v3.fermer();
  /* rejouable : le compteur remis à 2, la migration 3 repasse sur des tables déjà migrées sans rien perdre */
  const brut2 = new (require('node:sqlite').DatabaseSync)(chemin); brut2.exec('PRAGMA user_version = 2'); brut2.close();
  const v3b = mk(MIGRATIONS);
  v('⛔ la migration 3 REJOUÉE sur une base déjà migrée ne perd rien : les messages (numéro, type, texte, auteur) sont les mêmes pour Alice et pour Bob, le schéma est 3', [vu(v3b) === avantRejeu, v3b.schema()], [true, 3]);
  v3b.fermer();
}

/* ══ 0 bis. LE GESTIONNAIRE DE LECTURE, DÉPENDANCES INJECTÉES (relecture du gardien, A1) ══════════════════════════════════════════════════════════
   Une course lecture / suppression ne se joue pas à coup sûr sur un vrai service : la fenêtre entre la garde et l'ouverture du fichier dure une centaine de microsecondes. On monte donc le VRAI
   gestionnaire `pieces.lire` avec un stockage et un disque de papier, et on le met dans chacune des deux situations — la ligne existe encore, la ligne a disparu — pour chaque façon d'échouer. */
async function gestionnaireLecture() {
  console.log('Le gestionnaire de lecture, dépendances injectées : une pièce effacée pendant qu\'on la lit n\'est pas une pièce « illisible »');
  const { installerPieces } = require(path.join(T.SERVICE, 'routes-pieces.js'));
  const H = {}, etat = { illisibles: 0 }, journal = [];
  const decor = { existe: true, taille: null, erreurLecture: null };
  installerPieces(H, {
    config: { pieces: piecesConfig({}), quotas: {} }, stockage: { pieceExiste: () => decor.existe }, quotas: {}, hub: {}, horloge: Date.now, reservations: {}, disque: { libreMo: () => 1e9 },
    pieces: { taille: async () => decor.taille, lire: async function* () { if (decor.erreurLecture) throw decor.erreurLecture; yield Buffer.from('x'); } },
    piecesEtat: etat, journaliser: (nom) => journal.push(nom),
  });
  const piece = { id: 'f_' + 'a'.repeat(32), taille: 1, mime: 'application/octet-stream', genre: 'fichier', nom: 'x.bin' };
  const jouer = () => new Promise((ok) => {
    const rep = { code: null, corps: null, detruite: false };
    const fin = () => ok(rep);
    const res = { destroyed: false, writableEnded: false, headersSent: false,
      status(c) { rep.code = c; return this; }, set() { return this; }, json(o) { rep.corps = o; fin(); return this; }, write() { return true; }, end() { this.writableEnded = true; rep.code = rep.code || 200; fin(); },
      destroy() { this.destroyed = true; rep.detruite = true; fin(); }, on() {}, off() {} };
    H['pieces.lire']({ piece, headers: {}, method: 'GET' }, res, () => {});
  });
  const cas = async (existe, taille, erreurLecture) => { Object.assign(decor, { existe, taille, erreurLecture }); const avant = etat.illisibles; const rep = await jouer(); return { rep, compte: etat.illisibles - avant }; };
  let c = await cas(true, null, null);
  v('population : le fichier manque ET sa ligne existe encore (une vraie perte) : 404, comptée « illisible », et journalisée', [c.rep.code, c.compte, journal.length], [404, 1, 1]);
  c = await cas(false, null, null);
  v('⛔ le fichier manque et sa LIGNE AUSSI a disparu (supprimée entre la garde et l\'ouverture) : 404, et RIEN n\'est compté — personne n\'a rien perdu', [c.rep.code, c.compte], [404, 0]);
  c = await cas(true, 999, null);
  v('la taille du fichier ne colle pas à celle de la ligne, la ligne existe : comptée', [c.rep.code, c.compte], [404, 1]);
  c = await cas(false, 999, null);
  v('⛔ …et la ligne a disparu entre-temps : non comptée', [c.rep.code, c.compte], [404, 0]);
  c = await cas(true, 1, Object.assign(new Error('x'), { code: 'piece_corrompue' }));
  v('un bloc qui ne s\'authentifie pas en cours de lecture, la ligne existe : la connexion est coupée et la pièce comptée', [c.rep.detruite, c.compte], [true, 1]);
  c = await cas(false, 1, Object.assign(new Error('x'), { code: 'introuvable' }));
  v('⛔ le fichier disparaît PENDANT la lecture parce que la pièce vient d\'être supprimée : connexion coupée, mais non comptée', [c.rep.detruite, c.compte], [true, 0]);
  c = await cas(true, 1, null);
  v('contre-épreuve : une lecture saine rend 200 et ne compte rien', [c.rep.code, c.compte], [200, 0]);
}

(async () => {
  migration();
  await gestionnaireLecture();
  const og = await T.fauxOpGestion(COMPTES());
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: {
    balayageMs: 150, presenceGraceMs: 300, pulsationMs: 400,
    pieces: { photoMax: 200000, vocalMax: 300000, fichierMax: 600000, avatarMax: 100000, bloc: 4096 },
    quotas: { piece: { max: 100000, fenetreMs: 3600000 }, moi_avatar: { max: 100000, fenetreMs: 3600000 } } } });
  const compte = (login, s) => T.connecter(s || svc, og, login, 'pw-' + login + '-1234');
  const lienContact = async (a, b) => { const l = await a.post('/api/contacts/lien', { max: 1 }); return b.post('/api/liens/accepter', { code: l.j.code }); };
  const directe = async (a, b) => (await a.post('/api/conversations/directe', { uid: b.moi.id })).j.conversation.id;
  const groupe = async (a, nom, autres, extra) => (await a.post('/api/conversations/groupe', Object.assign({ nom, membres: autres.map(x => x.moi.id) }, extra || {}))).j.conversation.id;
  const envoyer = (c, conv, corps) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'cid-' + aleatoire() }, corps));
  const deposer = (c, o) => F.deposer(c, o);
  const lire = (c, id, o) => F.lirePiece(c, id, o);
  const photo = async (c, conv, buf) => { const d = await deposer(c, { conv, genre: 'photo', corps: buf || PNG }); if (d.code !== 201) throw new Error('dépôt de photo refusé : ' + d.code + ' ' + d.txt); return d.j.id; };
  const base = () => T.lireBase(path.join(svc.data, 'msg.db'));
  const requete = (sql, ...a) => { const d = base(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  const fichierDe = (id) => path.join(svc.data, 'pieces', id.slice(2, 4), id);
  const tousLesFichiers = (dossier, sortie = []) => { for (const e of fs.readdirSync(dossier, { withFileTypes: true })) { const p = path.join(dossier, e.name); if (e.isDirectory()) tousLesFichiers(p, sortie); else sortie.push(p); } return sortie; };
  const piecesSurDisque = () => fs.existsSync(path.join(svc.data, 'pieces')) ? tousLesFichiers(path.join(svc.data, 'pieces')).filter(p => /\/f_[0-9a-f]{32}$/.test(p)) : [];
  const disparu = async (id) => att(() => !fs.existsSync(fichierDe(id)) && requete('SELECT 1 FROM piece WHERE id = ?', id).length === 0, 6000);
  const purge = (id) => requete("SELECT genre FROM purge WHERE objet = ?", id).map(r => r.genre);
  let A, B, C, D;
  try {
    A = await compte('alice'); B = await compte('bruno'); C = await compte('carla'); D = await compte('dave');
    await lienContact(A, B); await lienContact(A, C);
    await lienContact(B, C);
    const DAB = await directe(A, B), G = await groupe(A, 'Chantier', [B, C]);

    /* ═══ 1. DÉPOSER, ENVOYER, LIRE : une photo ═════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne photo : déposée, pas lisible tant qu\'elle n\'est pas envoyée, lisible des membres une fois envoyée, jamais des autres');
    let idPhoto;
    {
      const d = await deposer(A, { conv: G, genre: 'photo', corps: PNG });
      v('le dépôt répond 201 {id, taille, mime} : un identifiant « f_ » de 128 bits, la taille RANGÉE, le type JUGÉ aux octets', [d.code, /^f_[0-9a-f]{32}$/.test(d.j.id), d.j.taille, d.j.mime], [201, true, PNG.length, 'image/png']);
      idPhoto = d.j.id;
      const l = await lire(A, idPhoto);
      v('⛔ le dépositaire la relit, octet pour octet', [l.code, l.buf.equals(PNG)], [200, true]);
      v('⛔ en-têtes de sûreté d\'une pièce : type, « inline » (une image), nosniff, sandbox, jamais de cache, plages acceptées, longueur exacte',
        [l.h.get('content-type'), l.h.get('content-disposition'), l.h.get('x-content-type-options'), l.h.get('content-security-policy'), l.h.get('cache-control'), l.h.get('accept-ranges'), l.h.get('content-length')],
        ['image/png', 'inline', 'nosniff', "sandbox; default-src 'none'", 'private, no-store', 'bytes', String(PNG.length)]);
      vrai('   et aucun en-tête Access-Control-* (pas de CORS)', ![...l.h.keys()].some(k => /^access-control-/.test(k)));
      v('⛔ tant qu\'elle n\'est pas envoyée, un MEMBRE de la conversation ne la lit pas (404) — elle est à son dépositaire seul', [(await lire(B, idPhoto)).code, (await lire(C, idPhoto)).code, (await lire(D, idPhoto)).code], [404, 404, 404]);
      /* ⛔ remarque 1 du gardien : TOUTES les réponses de /api/pieces* portent la CSP « sandbox », les refus compris (avant : la politique de la PAGE, `script-src 'self'`, sur chaque erreur) */
      {
        const SANDBOX = "sandbox; default-src 'none'", essais = [];
        const noter = (nom, code, h) => essais.push({ nom, code, csp: h.get('content-security-policy') });
        let r = await lire(D, idPhoto); noter('étranger', r.code, r.h);
        r = await lire(A, 'f_' + '0'.repeat(32)); noter('identifiant inconnu', r.code, r.h);
        r = await lire(A, 'pas-un-identifiant'); noter('identifiant mal formé', r.code, r.h);
        let x = await fetch(svc.base + '/api/pieces/' + idPhoto); noter('sans session', x.status, x.headers);
        x = await fetch(svc.base + '/API/PIECES/' + idPhoto); noter('sans session, casse différente (le routeur ne la distingue pas)', x.status, x.headers);
        r = await deposer(A, { genre: 'photo', corps: PNG }); noter('dépôt sans conversation', r.code, r.h);
        x = await fetch(svc.base + '/api/pieces?conv=' + G + '&genre=photo', { method: 'POST', headers: { Cookie: A.enteteCookie(), 'Content-Type': 'application/octet-stream' }, body: PNG }); noter('dépôt sans l\'en-tête X-OPM', x.status, x.headers);
        x = await fetch(svc.base + '/api/pieces/' + idPhoto, { method: 'DELETE', headers: { Cookie: A.enteteCookie(), Origin: svc.base, 'X-OPM': '1' } }); noter('méthode non prévue', x.status, x.headers);
        vrai('population : huit refus de natures différentes (' + [...new Set(essais.map(e => e.code))].sort().join(', ') + ')', essais.length === 8 && essais.every(e => e.code >= 400) && new Set(essais.map(e => e.code)).size >= 3);
        v('⛔ …et TOUS portent « sandbox; default-src \'none\' » (ceux qui ne le portent pas, nommés)', essais.filter(e => e.csp !== SANDBOX).map(e => e.nom + ' (' + e.code + ') : ' + e.csp), []);
        const page = await fetch(svc.base + '/'), moi = await fetch(svc.base + '/api/moi', { headers: { Cookie: A.enteteCookie() } });
        v('contre-épreuve : la page elle-même et le reste de l\'API gardent la politique de la page (script-src \'self\', sans sandbox) — la sandbox ne couvre que /api/pieces*', [page.status, moi.status, [page, moi].map(q => /script-src 'self'/.test(q.headers.get('content-security-policy')) && !/sandbox/.test(q.headers.get('content-security-policy')))], [200, 200, [true, true]]);
      }
      const ligne = requete('SELECT proprio, conv, genre, taille, mime, attachee, expire, nom_ch FROM piece WHERE id = ?', idPhoto)[0];
      v('la ligne : à Alice, pour ce groupe, genre photo, non attachée, avec une échéance à 24 h', [ligne.proprio === A.moi.id, ligne.conv === G, ligne.genre, ligne.attachee, ligne.expire - Date.now() > 23 * 3600000 && ligne.expire - Date.now() <= 24 * 3600000 + 5000], [true, true, 'photo', null, true]);
      vrai('le fichier est rangé sous pieces/<2 caractères>/<id>, SCELLÉ (l\'en-tête annonce « OPMP », le PNG n\'y est pas en clair)', (() => { const f = fs.readFileSync(fichierDe(idPhoto)); return f.subarray(0, 4).toString() === 'OPMP' && !f.includes(Buffer.from('IHDR')); })());

      const fb = await T.flux(B);
      await fb.attendre(e => e.event === 'bonjour');
      const m = await envoyer(A, G, { type: 'photo', pieces: [{ id: idPhoto, w: 8, h: 8 }] });
      v('envoyer le message photo : 201 {seq, ts, id}', [m.code, Number.isInteger(m.j.seq)], [201, true]);
      const ev = await fb.attendre(e => e.event === 'message' && e.data.type === 'photo');
      v('⛔ Bruno reçoit l\'événement tout de suite (temps réel) : type photo, et la MÉTA (pas le contenu) — l\'identifiant de la pièce, ses dimensions, sa taille', [ev && ev.data.meta.pieces.map(p => [p.id, p.w, p.h, p.taille]), ev && ev.data.texte === undefined], [[[idPhoto, 8, 8, PNG.length]], true]);
      fb.fermer();
      v('⛔ envoyée, la pièce se lit : Bruno et Carla (membres) 200, Dave (étranger) 404', [(await lire(B, idPhoto)).code, (await lire(C, idPhoto)).code, (await lire(D, idPhoto)).code], [200, 200, 404]);
      v('et ses octets sont les mêmes pour Bruno', (await lire(B, idPhoto)).buf.equals(PNG), true);
      const ligne2 = requete('SELECT attachee, expire FROM piece WHERE id = ?', idPhoto)[0];
      v('la ligne est attachée au message (son numéro) et n\'expire plus', [ligne2.attachee === m.j.seq, ligne2.expire], [true, null]);
      const msgs = (await B.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.type === 'photo');
      v('GET messages : type photo, méta avec la pièce, pas de texte', [msgs.type, msgs.meta.pieces[0].id, msgs.texte], ['photo', idPhoto, null]);
      v('⛔ l\'aperçu de la liste dit « Photo » (jamais l\'identifiant ni un texte vide)', (await B.get('/api/conversations')).j.conversations.find(c => c.id === G).apercu.texte, 'Photo');
      const id2 = await photo(A, G);
      await envoyer(A, G, { type: 'photo', pieces: [{ id: idPhoto = idPhoto, w: 8, h: 8 }, { id: id2, w: 4, h: 4 }] }).then(r => v('une pièce déjà envoyée ne s\'envoie pas une 2e fois', [r.code, r.j.error], [404, 'piece_inconnue']));
      const id3 = await photo(A, G);
      const m2 = await envoyer(A, G, { type: 'photo', pieces: [{ id: id2, w: 640, h: 480 }, { id: id3, w: 800, h: 600 }] });
      v('deux photos dans un message : 201', m2.code, 201);
      v('⛔ l\'aperçu dit « 2 photos »', (await B.get('/api/conversations')).j.conversations.find(c => c.id === G).apercu.texte, '2 photos');
    }

    /* ═══ 2. UN VOCAL : durée et barres bornées, l'aperçu, la lecture par plages ═════════════════════════════════════════════════ */
    console.log('\nUn vocal : sa forme d\'onde est bornée, l\'aperçu dit la durée, la lecture se fait par plages');
    {
      const son = F.webm(20000);
      const d = await deposer(A, { conv: G, genre: 'vocal', corps: son });
      v('le dépôt d\'un son webm : 201, type audio/webm', [d.code, d.j.mime], [201, 'audio/webm']);
      const bars = [6, 14, 18, 10, 16, 6, 12, 18, 9, 14];
      const r = await envoyer(A, G, { type: 'vocal', piece: d.j.id, dur: 8.04, bars });
      v('envoyer le vocal : 201', r.code, 201);
      const m = (await B.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.type === 'vocal');
      v('la méta : la pièce, la durée (arrondie au dixième), les barres telles quelles', [m.meta.piece, m.meta.dur, m.meta.bars, m.meta.taille], [d.j.id, 8, bars, son.length]);
      v('⛔ l\'aperçu dit « Message vocal · 0:08 »', (await B.get('/api/conversations')).j.conversations.find(c => c.id === G).apercu.texte, 'Message vocal · 0:08');
      const l = await lire(B, d.j.id);
      v('Bruno lit le vocal : audio/webm, inline, octets exacts', [l.code, l.h.get('content-type'), l.h.get('content-disposition'), l.buf.equals(son)], [200, 'audio/webm', 'inline', true]);
      const cas = [['bytes=0-9', 206, 'bytes 0-9/20004', son.subarray(0, 10)], ['bytes=4090-4100', 206, 'bytes 4090-4100/20004', son.subarray(4090, 4101)], ['bytes=19990-', 206, 'bytes 19990-20003/20004', son.subarray(19990)], ['bytes=-5', 206, 'bytes 19999-20003/20004', son.subarray(19999)], ['bytes=0-99999', 206, 'bytes 0-20003/20004', son]];
      for (const [range, code, cr, attendu] of cas) {
        const x = await lire(B, d.j.id, { range });
        v('⛔ Range « ' + range + ' » : ' + code + ', Content-Range « ' + cr + ' », les bons octets', [x.code, x.h.get('content-range'), x.buf.equals(attendu), x.h.get('content-length')], [code, cr, true, String(attendu.length)]);
      }
      for (const range of ['bytes=20004-', 'bytes=99999-100000', 'bytes=-0', 'bytes=5-2']) {
        const x = await lire(B, d.j.id, { range });
        v('⛔ Range « ' + range + ' » : 416 avec « bytes */20004 » (jamais des octets)', [x.code, x.h.get('content-range'), x.buf.length < 100 ? x.j && x.j.error : 'trop'], [416, 'bytes */20004', 'plage_invalide']);
      }
      for (const range of ['bytes=0-1,5-6', 'octets=0-3', 'bytes=abc']) {
        const x = await lire(B, d.j.id, { range });
        v('un Range illisible ou à plusieurs plages (« ' + range + ' ») est ignoré : 200, tout le fichier (RFC 7233)', [x.code, x.buf.equals(son)], [200, true]);
      }
      const hd = await lire(B, d.j.id, { methode: 'HEAD' });
      v('HEAD : les en-têtes de la pièce, aucun octet', [hd.code, hd.h.get('content-length'), hd.buf.length], [200, '20004', 0]);
      const bornes = [['durée nulle', { dur: 0 }], ['durée de 601 s', { dur: 601 }], ['durée en texte', { dur: '8' }], ['durée absente', { dur: undefined }], ['64 barres + 1', { bars: Array(65).fill(10) }], ['barres vides', { bars: [] }], ['une barre à 101', { bars: [101] }], ['une barre fractionnaire', { bars: [5.5] }], ['une barre négative', { bars: [-1] }], ['barres non tableau', { bars: 'abc' }]];
      const d2 = await deposer(A, { conv: G, genre: 'vocal', corps: F.ogg(2000) });
      for (const [nom, extra] of bornes) {
        const x = await envoyer(A, G, Object.assign({ type: 'vocal', piece: d2.j.id, dur: 5, bars }, extra));
        v('⛔ vocal refusé (400 champ_invalide) : ' + nom, [x.code, x.j.error], [400, 'champ_invalide']);
      }
      v('…et aucune de ces tentatives n\'a attaché la pièce (elle est toujours à envoyer)', requete('SELECT attachee FROM piece WHERE id = ?', d2.j.id)[0].attachee, null);
      v('64 barres pile (le maximum) et une onde de valeurs 0 et 100 passent', (await envoyer(A, G, { type: 'vocal', piece: d2.j.id, dur: 600, bars: Array.from({ length: 64 }, (_, i) => i % 2 ? 100 : 0) })).code, 201);
    }

    /* ═══ 3. UN FICHIER : n'importe quoi, servi en pièce jointe ═══════════════════════════════════════════════════════════════════ */
    console.log('\nUn fichier : n\'importe quoi est accepté, mais JAMAIS servi en ligne — et son nom ne peut rien injecter');
    {
      const svg = F.svg('<script>alert("pwn")</script>'), nom = 'Rapport été 2026 (final).svg';
      const d = await deposer(A, { conv: G, genre: 'fichier', nom, corps: svg });
      v('un SVG déposé comme FICHIER : 201, servi en application/octet-stream', [d.code, d.j.mime], [201, 'application/octet-stream']);
      const m = await envoyer(A, G, { type: 'fichier', piece: d.j.id, nom: 'IGNORE.exe', taille: 1 });
      v('envoyer : 201 (le `nom` et la `taille` du corps de la requête sont IGNORÉS)', m.code, 201);
      const msg = (await B.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.type === 'fichier');
      v('⛔ la méta porte le nom et la taille de la PIÈCE, pas ceux du corps', [msg.meta.nom, msg.meta.taille, msg.meta.piece], [nom, svg.length, d.j.id]);
      v('⛔ l\'aperçu dit « Fichier · <nom> »', (await B.get('/api/conversations')).j.conversations.find(c => c.id === G).apercu.texte, 'Fichier · ' + nom);
      const l = await lire(B, d.j.id);
      vrai('⛔ servi en pièce jointe : octet-stream, « attachment », nom ASCII de repli et nom réel en filename*=UTF-8\'\' — JAMAIS « inline »',
        l.code === 200 && l.h.get('content-type') === 'application/octet-stream' && /^attachment; filename="Rapport _t_ 2026 \(final\)\.svg"; filename\*=UTF-8''Rapport%20%C3%A9t%C3%A9%202026%20%28final%29\.svg$/.test(l.h.get('content-disposition')) && l.buf.equals(svg));
      v('et avec la sandbox et nosniff (le SVG ne s\'exécuterait pas même ouvert à la main)', [l.h.get('content-security-policy'), l.h.get('x-content-type-options')], ["sandbox; default-src 'none'", 'nosniff']);
      const png = await deposer(A, { conv: G, genre: 'fichier', nom: 'dessin.png', corps: PNG });
      const lp = await lire(A, png.j.id);
      v('⛔ un PNG déposé comme FICHIER (une vraie image !) est servi en attachment + octet-stream : c\'est le GENRE qui décide du « en ligne », jamais la signature', [png.j.mime, lp.h.get('content-type'), /^attachment/.test(lp.h.get('content-disposition'))], ['application/octet-stream', 'application/octet-stream', true]);
      const html = await deposer(A, { conv: G, genre: 'fichier', nom: 'page.html', corps: F.html() });
      const lh = await lire(A, html.j.id);
      v('un HTML déposé comme fichier : octet-stream + attachment', [lh.h.get('content-type'), /^attachment/.test(lh.h.get('content-disposition'))], ['application/octet-stream', true]);
      const piege = await deposer(A, { conv: G, genre: 'fichier', nom: 'a.pdf"\r\nSet-Cookie: pirate=1\r\n/../etc', corps: F.pdf(300) });
      const lg = await lire(A, piege.j.id);
      vrai('⛔ un nom piégé (guillemets, retours à la ligne, barres) : l\'en-tête reste UNE ligne, sans Set-Cookie, sans barre', piege.code === 201 && !/[\r\n]/.test(lg.h.get('content-disposition')) && !lg.h.get('set-cookie') && (lg.h.get('content-disposition').match(/"/g) || []).length === 2);
      const grand = crypto.randomBytes(100000);
      const dg = await deposer(A, { conv: G, genre: 'fichier', nom: 'gros.bin', corps: grand });
      const lg2 = await lire(A, dg.j.id);
      v('⛔ un fichier de 100 000 octets (25 blocs de 4 Kio) revient exact, et une plage à cheval sur quatre blocs aussi', [lg2.buf.equals(grand), (await lire(A, dg.j.id, { range: 'bytes=4000-20000' })).buf.equals(grand.subarray(4000, 20001))], [true, true]);
    }

    /* ═══ 4. LES REFUS DU DÉPÔT ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes refus du dépôt : chacun avec son code, dans l\'ordre, AVANT d\'avoir lu le corps');
    {
      const comptePieces = () => requete('SELECT COUNT(*) AS n FROM piece')[0].n;
      const n0 = comptePieces(), f0 = piecesSurDisque().length;
      const chemin = (extra) => '/api/pieces?' + new URLSearchParams(Object.assign({ conv: G, genre: 'photo' }, extra)).toString();
      v('sans session : 401', (await deposer(T.client(svc.base), { conv: G, genre: 'photo', corps: PNG })).code, 401);
      let r = await deposer(A, { conv: G, genre: 'photo', corps: F.svg() });
      v('⛔ un SVG comme photo : 415 type_refuse', [r.code, r.j.error], [415, 'type_refuse']);
      r = await deposer(A, { conv: G, genre: 'photo', corps: F.html() });
      v('un HTML comme photo : 415', r.code, 415);
      r = await deposer(A, { conv: G, genre: 'photo', corps: F.pdf() });
      v('un PDF comme photo : 415', r.code, 415);
      r = await deposer(A, { conv: G, genre: 'vocal', corps: PNG });
      v('⛔ une image comme vocal : 415', r.code, 415);
      r = await deposer(A, { conv: G, genre: 'photo', corps: F.webm() });
      v('un son comme photo : 415', r.code, 415);
      r = await deposer(A, { conv: G, genre: 'photo', corps: F.jpeg().subarray(0, 60) });
      v('⛔ un JPEG tronqué (métadonnées non retirables de bout en bout) : 415, rien de rangé', r.code, 415);
      r = await deposer(A, { conv: G, genre: 'photo', corps: PNG, entetes: { 'Content-Type': 'image/png' } });
      v('⛔ le type de la REQUÊTE doit être application/octet-stream (un client ne décide rien par son Content-Type) : 415', [r.code, r.j.error], [415, 'type_refuse']);
      r = await deposer(A, { conv: G, genre: 'photo', corps: PNG, entetes: { 'Content-Type': 'application/json' } });
      v('un corps annoncé en JSON : 415 aussi (le lecteur JSON du service n\'a pas à y toucher)', [r.code], [415]);
      r = await deposer(A, { conv: G, genre: 'diaporama', corps: PNG });
      v('un genre inconnu : 400', [r.code, r.j.error], [400, 'champ_invalide']);
      r = await deposer(A, { genre: 'photo', corps: PNG });
      v('sans conversation (hors avatar) : 400', r.code, 400);
      r = await deposer(A, { conv: G, genre: 'avatar', corps: PNG });
      v('un avatar ne porte pas de conversation : 400', r.code, 400);
      r = await deposer(A, { conv: G, genre: 'fichier', corps: F.pdf() });
      v('un fichier sans nom : 400', r.code, 400);
      r = await deposer(A, { conv: G, genre: 'fichier', nom: ' \u0000​ ', corps: F.pdf() });
      v('un nom fait de caractères de contrôle : 400', r.code, 400);
      /* ⛔ LE NOM NE VOYAGE PLUS DANS L'ADRESSE (relecture du gardien, B2) : l'adresse entière est écrite par le journal d'accès d'un proxy */
      r = await deposer(A, { conv: G, genre: 'fichier', nom: 'ok.pdf', query: { nom: 'ancien.pdf' }, corps: F.pdf() });
      v('⛔ l\'ancien paramètre `?nom=` est REFUSÉ (400 champ_invalide), même quand le bon en-tête est là — un client d\'avant le saurait, au lieu de le voir ignoré', [r.code, r.j.error], [400, 'champ_invalide']);
      r = await deposer(A, { conv: G, genre: 'photo', query: { nom: 'x' }, corps: PNG });
      v('…pour TOUS les genres : une photo qui porte `?nom=` est refusée aussi', r.code, 400);
      r = await deposer(A, { conv: G, genre: 'fichier', entetes: { 'X-OPM-Nom': '%E0%A4%A' }, corps: F.pdf() });
      v('un en-tête de nom mal encodé (pourcentage tronqué) : 400', r.code, 400);
      r = await deposer(A, { conv: G, genre: 'fichier', entetes: { 'X-OPM-Nom': 'a'.repeat(2049) }, corps: F.pdf() });
      v('un en-tête de nom de plus de 2 048 signes : 400', r.code, 400);
      const inconnue = 'c_' + '0'.repeat(32);
      const rD = await deposer(D, { conv: G, genre: 'photo', corps: PNG }), rI = await deposer(D, { conv: inconnue, genre: 'photo', corps: PNG }), rM = await deposer(D, { conv: 'pas-un-id', genre: 'photo', corps: PNG });
      v('⛔ un NON-MEMBRE qui dépose : 404 introuvable, EXACTEMENT comme pour une conversation qui n\'existe pas ou un identifiant mal formé', [rD.code, rD.txt, rI.code, rI.txt, rM.code, rM.txt], [404, '{"error":"introuvable"}', 404, '{"error":"introuvable"}', 404, '{"error":"introuvable"}']);
      r = await F.deposerBrut(A, { chemin: chemin(), entetes: {}, morceaux: [PNG.subarray(0, 30), PNG.subarray(30)] });
      v('⛔ SANS Content-Length (envoi fractionné, chunked) : 411 longueur_requise — on ne sait pas, avant de lire, si cela tiendra', [r.code, r.j.error], [411, 'longueur_requise']);
      r = await F.deposerBrut(A, { chemin: chemin(), entetes: { 'Content-Length': 'abc' }, corps: Buffer.alloc(0) }).catch(() => ({ code: 400 }));
      vrai('   une longueur illisible est refusée aussi (400 du protocole, ou 411)', [400, 411].includes(r.code));
      r = await F.deposerBrut(A, { chemin: chemin(), corps: Buffer.alloc(0) });
      v('un corps vide : 400', r.code, 400);

      const t0 = Date.now();
      for (const [genre, max] of [['photo', 200000], ['vocal', 300000], ['fichier', 600000], ['avatar', 100000]]) {
        const sans = genre === 'avatar' ? { genre } : { conv: G, genre };
        const q = '/api/pieces?' + new URLSearchParams(sans).toString();
        const x = await F.deposerBrut(A, { chemin: q, entetes: Object.assign({ 'Content-Length': String(max + 1) }, genre === 'fichier' ? { 'X-OPM-Nom': 'x.bin' } : {}), morceaux: [Buffer.alloc(100, 1)] });
        v('⛔ ' + genre + ' annoncé à ' + (max + 1) + ' octets (maximum ' + max + ') : 413 piece_trop_lourde AVEC le maximum — la réponse part sans attendre le corps', [x.code, x.j.error, x.j.max], [413, 'piece_trop_lourde', max]);
      }
      const enorme = await F.deposerBrut(A, { chemin: chemin(), entetes: { 'Content-Length': '104857600' }, morceaux: [PNG] });
      vrai('⛔ 100 Mo annoncés pour un maximum de 200 Ko : 413 en ' + (Date.now() - t0) + ' ms, SANS que les 100 Mo aient été envoyés', enorme.code === 413 && Date.now() - t0 < 5000);
      v('…et rien n\'a été rangé par tous ces refus (ni ligne, ni fichier)', [comptePieces() - n0, piecesSurDisque().length - f0, fs.existsSync(path.join(svc.data, 'pieces', 'tmp')) ? fs.readdirSync(path.join(svc.data, 'pieces', 'tmp')).length : 0], [0, 0, 0]);

      /* un client qui s'en va avant la fin : rien n'est rangé */
      await new Promise((ok) => {
        const s = net.connect(svc.port, '127.0.0.1', () => {
          const cookie = A.enteteCookie();
          s.write('POST ' + chemin({ genre: 'vocal' }) + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc.base + '\r\nX-OPM: 1\r\nCookie: ' + cookie + '\r\nContent-Type: application/octet-stream\r\nContent-Length: 20000\r\n\r\n');
          s.write(F.webm(3000));
          setTimeout(() => { s.destroy(); ok(); }, 150);
        });
        s.on('error', () => ok());
      });
      await T.dort(300);
      v('⛔ un client qui coupe au milieu d\'un envoi (3 000 octets sur 20 000) : AUCUNE ligne, aucun fichier, aucun temporaire', [comptePieces() - n0, piecesSurDisque().length - f0, fs.existsSync(path.join(svc.data, 'pieces', 'tmp')) ? fs.readdirSync(path.join(svc.data, 'pieces', 'tmp')).length : 0], [0, 0, 0]);
      r = await deposer(A, { conv: G, genre: 'vocal', corps: F.webm(500) });
      v('contre-épreuve : le service dépose encore après tous ces refus', r.code, 201);
      const accents = await deposer(A, { conv: G, genre: 'fichier', nom: 'Rapport été 🙂 (final).pdf', corps: F.pdf(300) });
      const nomLu = async (id) => { const l = await lire(A, id); return decodeURIComponent(String(l.h.get('content-disposition')).split("UTF-8''")[1]); };
      v('⛔ un nom accentué, avec un émoji et des parenthèses, traverse l\'en-tête et revient intact au téléchargement', [accents.code, await nomLu(accents.j.id)], [201, 'Rapport été 🙂 (final).pdf']);
      const longue = await deposer(A, { conv: G, genre: 'fichier', nom: 'rapport-'.repeat(40) + 'final.pdf', corps: F.pdf(300) });
      const nomLong = await nomLu(longue.j.id);
      v('⛔ un nom de 329 signes est coupé à 120 en GARDANT « .pdf » (le fichier téléchargé reste un pdf)', [longue.code, Array.from(nomLong).length, nomLong.endsWith('final.pdf') || nomLong.endsWith('.pdf')], [201, 120, true]);
    }

    /* ═══ 5. LES DROITS D'ENVOI : ce qu'un message peut citer ═════════════════════════════════════════════════════════════════════ */
    console.log('\nUn message cite des pièces : à l\'envoyeur, du bon genre, de la bonne conversation, non encore envoyées — sinon 404, et rien n\'est à moitié attaché');
    {
      const autreG = await groupe(A, 'Autre groupe', [B]);
      const pA = await photo(A, G), pB = await photo(B, G), pAutre = await photo(A, autreG);
      let r = await envoyer(B, G, { type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }] });
      v('⛔ citer la pièce D\'UN AUTRE : 404 piece_inconnue', [r.code, r.j.error], [404, 'piece_inconnue']);
      r = await envoyer(A, G, { type: 'photo', pieces: [{ id: pAutre, w: 8, h: 8 }] });
      v('⛔ citer une pièce déposée pour une AUTRE conversation : 404', [r.code, r.j.error], [404, 'piece_inconnue']);
      r = await envoyer(A, G, { type: 'vocal', piece: pA, dur: 3, bars: [5] });
      v('⛔ citer une photo comme VOCAL (mauvais genre) : 404', [r.code, r.j.error], [404, 'piece_inconnue']);
      r = await envoyer(A, G, { type: 'fichier', piece: pA });
      v('citer une photo comme fichier : 404', r.code, 404);
      r = await envoyer(A, G, { type: 'photo', pieces: [{ id: 'f_' + '1'.repeat(32), w: 8, h: 8 }] });
      v('citer une pièce qui n\'existe pas : 404', [r.code, r.j.error], [404, 'piece_inconnue']);
      r = await envoyer(A, G, { type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }, { id: 'f_' + '2'.repeat(32), w: 8, h: 8 }] });
      v('⛔ deux pièces dont la SECONDE est invalide : 404, et la première n\'est PAS attachée (tout ou rien)', [r.code, requete('SELECT attachee FROM piece WHERE id = ?', pA)[0].attachee], [404, null]);
      r = await envoyer(A, G, { type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }, { id: pA, w: 8, h: 8 }] });
      v('la même pièce deux fois dans un message : 400', r.code, 400);
      for (const [nom, pieces] of [['aucune pièce', []], ['11 pièces (le maximum est 10)', Array.from({ length: 11 }, () => ({ id: pA, w: 8, h: 8 }))], ['largeur absente', [{ id: pA, h: 8 }]], ['largeur nulle', [{ id: pA, w: 0, h: 8 }]], ['hauteur fractionnaire', [{ id: pA, w: 8, h: 1.5 }]], ['côté de 20 001', [{ id: pA, w: 20001, h: 8 }]], ['identifiant mal formé', [{ id: 'f_zz', w: 8, h: 8 }]], ['pas un tableau', 'pA']]) {
        const x = await envoyer(A, G, { type: 'photo', pieces });
        v('photo refusée (400) : ' + nom, [x.code, x.j.error], [400, 'champ_invalide']);
      }
      v('type inconnu, ou texte à la place d\'une pièce : 400', [(await envoyer(A, G, { type: 'diaporama', pieces: [] })).code, (await envoyer(A, G, { type: 'photo' })).code, (await envoyer(A, G, { type: 'fichier' })).code], [400, 400, 400]);
      const cid1 = 'cid-renvoi-' + aleatoire();
      const m1 = await A.post('/api/conversations/' + G + '/messages', { cid: cid1, type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }] });
      const m2 = await A.post('/api/conversations/' + G + '/messages', { cid: cid1, type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }] });
      v('⛔ un RENVOI (même cid, réponse perdue) : 201 puis 200 {deja:true}, le MÊME numéro, un seul message, la pièce attachée une seule fois',
        [m1.code, m2.code, m2.j.deja, m2.j.seq === m1.j.seq, (await A.get('/api/conversations/' + G + '/messages')).j.messages.filter(x => x.meta && x.meta.pieces && x.meta.pieces.some(p => p.id === pA)).length, requete('SELECT attachee FROM piece WHERE id = ?', pA)[0].attachee === m1.j.seq], [201, 200, true, true, 1, true]);
      v('⛔ un renvoi qui cite une pièce de plus ne l\'attache PAS (le premier envoi a fait foi)', [(await A.post('/api/conversations/' + G + '/messages', { cid: cid1, type: 'photo', pieces: [{ id: pA, w: 8, h: 8 }, { id: pB, w: 8, h: 8 }] })).j.deja, requete('SELECT attachee FROM piece WHERE id = ?', pB)[0].attachee], [true, null]);
      r = await envoyer(B, G, { type: 'photo', pieces: [{ id: pB, w: 8, h: 8 }] });
      v('et Bruno envoie sa propre photo : 201', r.code, 201);
      v('un message de pièce ne se MODIFIE pas : 409 type_invalide', (await A.post('/api/conversations/' + G + '/messages/modifier', { seq: m1.j.seq, texte: 'x' })).code, 409);
      const react = await A.post('/api/conversations/' + G + '/messages/reagir', { seq: m1.j.seq, emoji: '👍' });
      v('mais on peut RÉAGIR à une photo, et y répondre', [react.code, (await envoyer(B, G, { type: 'texte', texte: 'belle photo', reponse_a: m1.j.seq })).code], [200, 201]);
      v('un message texte reste un message texte (ni pièce, ni méta)', (await envoyer(A, G, { texte: 'bonjour' })).code, 201);
    }

    /* ═══ 6. LES DROITS DE LECTURE ════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes droits de lecture : arrivée après le message, retrait du groupe, message supprimé ou masqué — chacun refuse (404), et le fichier part avec la suppression');
    {
      const Gl = await groupe(A, 'Lecture', [B]);
      const p1 = await photo(A, Gl), m1 = await envoyer(A, Gl, { type: 'photo', pieces: [{ id: p1, w: 8, h: 8 }] });
      v('population : Bruno (membre depuis le début) lit', (await lire(B, p1)).code, 200);
      /* Carla arrive APRÈS la photo */
      const ajout = await A.post('/api/conversations/' + Gl + '/membres/ajouter', { uids: [C.moi.id] });
      v('Carla est ajoutée au groupe', ajout.code, 200);
      const p2 = await photo(A, Gl), m2 = await envoyer(A, Gl, { type: 'photo', pieces: [{ id: p2, w: 8, h: 8 }] });
      v('⛔ une photo envoyée AVANT l\'arrivée de Carla : 404 (depuis_seq) ; celle d\'APRÈS : 200', [(await lire(C, p1)).code, (await lire(C, p2)).code], [404, 200]);
      v('Carla ne voit pas non plus le message d\'avant dans l\'historique (cohérent)', (await C.get('/api/conversations/' + Gl + '/messages')).j.messages.some(x => x.seq === m1.j.seq), false);
      /* masquer pour moi */
      await B.post('/api/conversations/' + Gl + '/messages/supprimer', { seq: m2.j.seq, pour: 'moi' });
      v('⛔ « supprimer pour moi » : Bruno ne lit plus la photo (404), Alice et Carla si (200) — le fichier reste, il sert encore les autres', [(await lire(B, p2)).code, (await lire(A, p2)).code, (await lire(C, p2)).code, fs.existsSync(fichierDe(p2))], [404, 200, 200, true]);
      /* retirer du groupe */
      await A.post('/api/conversations/' + Gl + '/membres/retirer', { uid: B.moi.id });
      v('⛔ retiré du groupe : Bruno ne lit plus RIEN de ce groupe (404), même la photo d\'avant', [(await lire(B, p1)).code, (await lire(B, p2)).code], [404, 404]);
      /* quitter */
      await C.post('/api/conversations/' + Gl + '/quitter', {});
      v('⛔ Carla quitte : plus de lecture non plus', (await lire(C, p2)).code, 404);
      /* supprimer pour tous */
      const sup = await A.post('/api/conversations/' + Gl + '/messages/supprimer', { seq: m1.j.seq, pour: 'tous' });
      v('supprimer pour TOUS : 200', sup.code, 200);
      v('⛔ la pièce de ce message est effacée : 404 pour Alice même (l\'auteur), la ligne ET le fichier disparus', [(await lire(A, p1)).code, await disparu(p1)], [404, true]);
      v('⛔ son identifiant est noté dans `purge` (comme un éphémère), pour qu\'une restauration rejoue l\'effacement', purge(p1), ['piece']);
      v('une pièce d\'un AUTRE message du même groupe n\'est pas touchée', [(await lire(A, p2)).code, fs.existsSync(fichierDe(p2))], [200, true]);
      v('supprimer deux fois pour tous ne casse rien (idempotent)', (await A.post('/api/conversations/' + Gl + '/messages/supprimer', { seq: m1.j.seq, pour: 'tous' })).code, 200);
      /* ⛔ A1 au service : 25 suppressions « pour tous » pendant que huit lectures de la même photo courent — aucune pièce n'est comptée « illisible » (avant le correctif : des centaines, l'alarme restait allumée) */
      const illisibles = async () => (await (await fetch(svc.base + '/health')).json()).pieces.illisibles;
      const ill0 = await illisibles(), Gc = await groupe(A, 'Course', [B]);       // un groupe à part : Bruno a été retiré de celui-ci plus haut
      let lus = 0, perdus = 0, coupees = 0;
      /* une lecture que la suppression rattrape EN COURS DE ROUTE voit sa connexion coupée net (le service ne rend jamais d'octets faux) : `fetch` jette, c'est une lecture perdue comme les autres */
      const lireCourse = (c, id) => lire(c, id).catch(() => ({ code: 0 }));
      for (let k = 0; k < 25; k++) {
        const pk = await photo(A, Gc), mk = await envoyer(A, Gc, { type: 'photo', pieces: [{ id: pk, w: 8, h: 8 }] });
        const avant = Array.from({ length: 4 }, () => lireCourse(B, pk));        // quatre lectures déjà parties…
        await new Promise((ok) => setImmediate(ok));
        const rs = await Promise.all([A.post('/api/conversations/' + Gc + '/messages/supprimer', { seq: mk.j.seq, pour: 'tous' }), ...Array.from({ length: 4 }, () => lireCourse(B, pk)), ...avant]);   // …la suppression et quatre autres dans leur sillage
        for (const r of rs.slice(1)) { if (r.code === 200) lus++; else if (r.code === 0) coupees++; else perdus++; }
      }
      vrai('population : les 200 lectures se sont réparties entre « lue », « 404 » et « connexion coupée » (' + lus + ' lues, ' + perdus + ' refusées, ' + coupees + ' coupées) — les suppressions et les lectures se sont bien croisées', lus + perdus + coupees === 200 && lus > 0 && perdus + coupees > 0);
      v('⛔ …et aucune pièce n\'a été comptée « illisible » par ces courses', (await illisibles()) - ill0, 0);
      /* un administrateur supprime le message d'un autre */
      const Gm = await groupe(A, 'Modération', [B]);
      const pb = await photo(B, Gm); const mb = await envoyer(B, Gm, { type: 'photo', pieces: [{ id: pb, w: 8, h: 8 }] });
      await A.post('/api/conversations/' + Gm + '/messages/supprimer', { seq: mb.j.seq, pour: 'tous' });
      v('un administrateur qui supprime pour tous le message d\'un membre emporte aussi sa pièce', [(await lire(B, pb)).code, await disparu(pb)], [404, true]);
    }

    /* ═══ 7. LE TEMPS : un éphémère échu, une pièce jamais envoyée ═══════════════════════════════════════════════════════════════ */
    console.log('\nLe temps : un message éphémère échu emporte ses pièces, une pièce jamais envoyée part au bout de 24 h');
    {
      const Ge = await groupe(A, 'Éphémère', [B], { ephemere_s: 86400 });
      const pe = await photo(A, Ge); await envoyer(A, Ge, { type: 'photo', pieces: [{ id: pe, w: 8, h: 8 }] });
      const pOrph = await photo(A, G), pAvatar = (await deposer(A, { genre: 'avatar', corps: PNG })).j.id;
      /* ⛔ LA RÉCONCILIATION EST UNE SECONDE CHANCE, et elle masquait l'oubli d'effacer : le balayeur ôte aussi, toutes les dix passes, un fichier SANS ligne de plus de dix minutes. Avec l'horloge
         avancée de 25 h, nos fichiers (écrits à l'instant) ont l'air vieux d'un jour — le fichier d'un éphémère échu partait donc quand même, et un balayeur qui oublie `effacerPieces` restait vert.
         On date les fichiers dans le FUTUR (+26 h) : ils ont l'air tout neufs (« pas un fichier tout neuf »), et seul l'effacement explicite peut les ôter. */
      const futur = new Date(Date.now() + 26 * 3600000);
      for (const id of [pe, pOrph, pAvatar]) fs.utimesSync(fichierDe(id), futur, futur);
      v('population : trois pièces vivantes et lisibles (une attachée à un éphémère, une jamais envoyée, une photo de profil jamais posée)', [(await lire(B, pe)).code, (await lire(A, pOrph)).code, (await lire(A, pAvatar)).code], [200, 200, 200]);
      svc.avancer(25 * 3600000);
      v('⛔ 25 h plus tard : le message éphémère est échu, sa pièce est effacée (ligne et fichier) et plus lisible', [await disparu(pe), (await lire(B, pe)).code], [true, 404]);
      v('⛔ la pièce jamais envoyée a expiré : ligne et fichier partis, 404 même pour son dépositaire', [await disparu(pOrph), (await lire(A, pOrph)).code], [true, 404]);
      v('⛔ la photo de profil jamais posée aussi', [await disparu(pAvatar), (await lire(A, pAvatar)).code], [true, 404]);
      v('tout cela est noté dans `purge` (trois pièces)', [purge(pe), purge(pOrph), purge(pAvatar)], [['piece'], ['piece'], ['piece']]);
      svc.avancer(-25 * 3600000);
      const pOk = await photo(A, G), mOk = await envoyer(A, G, { type: 'photo', pieces: [{ id: pOk, w: 8, h: 8 }] });
      svc.avancer(48 * 3600000);
      await T.dort(600);
      v('⛔ une pièce ENVOYÉE n\'expire jamais d\'elle-même (48 h plus tard elle se lit encore)', [mOk.code, (await lire(A, pOk)).code], [201, 200]);
      svc.avancer(-48 * 3600000);
    }

    /* ═══ 8. LES PHOTOS DE PROFIL ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa photo de profil : la mienne se pose et se retire, mes contacts la lisent, les étrangers non, un blocage la cache — et mes contacts l\'apprennent tout de suite');
    {
      const E = await compte('eve'), Fr = await compte('fred');
      await lienContact(E, Fr);
      const fe = await T.flux(Fr); await fe.attendre(e => e.event === 'bonjour');
      const fd = await T.flux(D); await fd.attendre(e => e.event === 'bonjour');
      const dep = await deposer(E, { genre: 'avatar', corps: PNG });
      v('le dépôt d\'une photo de profil : 201, type image/png', [dep.code, dep.j.mime], [201, 'image/png']);
      v('pas encore posée : à son dépositaire seul', [(await lire(E, dep.j.id)).code, (await lire(Fr, dep.j.id)).code], [200, 404]);
      const pose = await E.post('/api/moi/avatar', { piece: dep.j.id });
      v('poser : 200 et `moi.avatar` porte l\'identifiant', [pose.code, pose.j.moi.avatar], [200, dep.j.id]);
      v('⛔ une fois posée : Fred (contact) la lit, Dave (étranger sans contact ni conversation commune) non', [(await lire(Fr, dep.j.id)).code, (await lire(D, dep.j.id)).code], [200, 404]);
      v('et c\'est servi en ligne (une image)', (await lire(Fr, dep.j.id)).h.get('content-disposition'), 'inline');
      v('⛔ l\'identifiant arrive dans `GET /api/contacts` de Fred, `GET /api/personnes/:id` et `GET /api/moi`', [(await Fr.get('/api/contacts')).j.contacts.find(c => c.id === E.moi.id).avatar, (await Fr.get('/api/personnes/' + E.moi.id)).j.personne.avatar, (await E.get('/api/moi')).j.moi.avatar], [dep.j.id, dep.j.id, dep.j.id]);
      const ev = await fe.attendre(e => e.event === 'personne' && e.data.uid === E.moi.id);
      vrai('⛔ Fred est PRÉVENU tout de suite (événement `personne`) — sans rafraîchir', !!ev);
      await T.dort(250);
      v('Dave, qui n\'a aucun lien avec Eve, n\'est PAS prévenu', fd.evenements.filter(e => e.event === 'personne').length, 0);
      v('une pièce peut être posée comme photo de profil par son seul propriétaire : Fred ne peut pas poser celle d\'Eve', [(await Fr.post('/api/moi/avatar', { piece: dep.j.id })).code, (await Fr.post('/api/moi/avatar', { piece: dep.j.id })).j.error], [404, 'piece_inconnue']);
      v('poser deux fois la même est sans effet (200) et ne supprime rien', [(await E.post('/api/moi/avatar', { piece: dep.j.id })).code, fs.existsSync(fichierDe(dep.j.id))], [200, true]);
      const ph = await photo(E, await directe(E, Fr));
      v('⛔ une pièce de genre PHOTO ne peut pas devenir photo de profil : 404', (await E.post('/api/moi/avatar', { piece: ph })).code, 404);
      /* remplacer */
      const dep2 = await deposer(E, { genre: 'avatar', corps: F.png({ couleur: [10, 120, 200] }) });
      const rem = await E.post('/api/moi/avatar', { piece: dep2.j.id });
      v('remplacer par une autre photo : 200, la nouvelle est posée', [rem.code, rem.j.moi.avatar], [200, dep2.j.id]);
      v('⛔ l\'ANCIENNE est effacée (ligne et fichier) et noté dans `purge`', [await disparu(dep.j.id), purge(dep.j.id)], [true, ['piece']]);
      v('Fred lit la nouvelle, plus l\'ancienne', [(await lire(Fr, dep2.j.id)).code, (await lire(Fr, dep.j.id)).code], [200, 404]);
      /* blocage */
      await E.post('/api/contacts/bloquer', { uid: Fr.moi.id });
      v('⛔ Eve BLOQUE Fred : il ne lit plus sa photo (404) et l\'identifiant n\'est même plus rendu dans sa liste de contacts', [(await lire(Fr, dep2.j.id)).code, (await Fr.get('/api/contacts')).j.contacts.find(c => c.id === E.moi.id).avatar], [404, null]);
      v('Eve, elle, voit toujours la sienne', (await lire(E, dep2.j.id)).code, 200);
      await E.post('/api/contacts/debloquer', { uid: Fr.moi.id });
      v('débloqué, Fred la relit', (await lire(Fr, dep2.j.id)).code, 200);
      /* mauvaises demandes */
      v('poser une pièce inconnue ou un identifiant mal formé : 404 / 400', [(await E.post('/api/moi/avatar', { piece: 'f_' + '3'.repeat(32) })).code, (await E.post('/api/moi/avatar', { piece: 'x' })).code, (await E.post('/api/moi/avatar', {})).code, (await E.post('/api/moi/avatar', { piece: 5 })).code], [404, 400, 400, 400]);
      /* retirer */
      const ret = await E.post('/api/moi/avatar', { piece: null });
      v('⛔ retirer (null) : 200, plus d\'avatar, la photo effacée (ligne et fichier)', [ret.code, ret.j.moi.avatar, await disparu(dep2.j.id)], [200, null, true]);
      v('retirer quand il n\'y en a pas : 200 sans erreur', (await E.post('/api/moi/avatar', { piece: null })).code, 200);
      fe.fermer(); fd.fermer();
    }

    /* ═══ 9. LA PHOTO D'UN GROUPE ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa photo d\'un groupe : posée par un administrateur (message système), lue par ses membres seuls, effacée avec le groupe');
    {
      const E = await compte('eve'), Fr = await compte('fred'), Gi = await compte('gina');
      await lienContact(E, Fr); await lienContact(E, Gi);
      const Gg = await groupe(E, 'Avec photo', [Fr]);
      const dep = await deposer(E, { genre: 'avatar', corps: PNG });
      const r = await E.post('/api/conversations/' + Gg + '/maj', { avatar_piece: dep.j.id });
      v('un administrateur pose la photo du groupe : 200, `conversation.avatar` porte l\'identifiant', [r.code, r.j.conversation.avatar], [200, dep.j.id]);
      const sys = (await Fr.get('/api/conversations/' + Gg + '/messages')).j.messages.filter(m => m.type === 'systeme').map(m => m.meta.k);
      v('⛔ un message système trace le changement (« avatar »)', sys.includes('avatar'), true);
      v('⛔ les membres la lisent (200), pas un étranger (404)', [(await lire(Fr, dep.j.id)).code, (await lire(E, dep.j.id)).code, (await lire(Gi, dep.j.id)).code], [200, 200, 404]);
      v('la liste des conversations porte l\'avatar du groupe', (await Fr.get('/api/conversations')).j.conversations.find(c => c.id === Gg).avatar, dep.j.id);
      v('⛔ un membre non administrateur ne la change pas : 403', (await Fr.post('/api/conversations/' + Gg + '/maj', { avatar_piece: null })).code, 403);
      v('⛔ une pièce déposée par UN AUTRE n\'est pas posable (404 piece_inconnue)', [(await E.post('/api/conversations/' + Gg + '/maj', { avatar_piece: (await deposer(Fr, { genre: 'avatar', corps: PNG })).j.id })).code], [404]);
      const dir = await directe(E, Fr);
      v('une conversation à deux n\'a pas de photo de groupe : 400', (await E.post('/api/conversations/' + dir + '/maj', { avatar_piece: dep.j.id })).code, 400);
      v('un identifiant mal formé : 400 ; l\'ancien nom du champ (`avatar`) : 400', [(await E.post('/api/conversations/' + Gg + '/maj', { avatar_piece: 'x' })).code, (await E.post('/api/conversations/' + Gg + '/maj', { avatar: 'x' })).code], [400, 400]);
      const dep2 = await deposer(E, { genre: 'avatar', corps: F.png({ couleur: [0, 90, 0] }) });
      await E.post('/api/conversations/' + Gg + '/maj', { avatar_piece: dep2.j.id });
      v('⛔ remplacer : l\'ancienne photo du groupe est effacée (ligne et fichier)', [await disparu(dep.j.id), (await lire(Fr, dep2.j.id)).code], [true, 200]);
      const retire = await E.post('/api/conversations/' + Gg + '/maj', { avatar_piece: null });
      v('⛔ retirer (null) : l\'avatar disparaît, la pièce aussi, un message système « avatar_retire »', [retire.j.conversation.avatar, await disparu(dep2.j.id), (await Fr.get('/api/conversations/' + Gg + '/messages')).j.messages.some(m => m.type === 'systeme' && m.meta.k === 'avatar_retire')], [null, true, true]);
      /* à la création */
      const dep3 = await deposer(E, { genre: 'avatar', corps: PNG });
      const cre = await E.post('/api/conversations/groupe', { nom: 'Né avec sa photo', membres: [Fr.moi.id], avatar_piece: dep3.j.id });
      v('créer un groupe AVEC sa photo (avatar_piece) : 201 et l\'avatar est posé, sans message « avatar » en plus', [cre.code, cre.j.conversation.avatar, (await E.get('/api/conversations/' + cre.j.conversation.id + '/messages')).j.messages.filter(m => m.type === 'systeme').map(m => m.meta.k)], [201, dep3.j.id, ['groupe_cree']]);
      v('⛔ créer un groupe avec la photo d\'un autre : 404, et AUCUN groupe n\'est créé', await (async () => { const n = (await E.get('/api/conversations')).j.conversations.length; const x = await E.post('/api/conversations/groupe', { nom: 'Volé', membres: [Fr.moi.id], avatar_piece: (await deposer(Fr, { genre: 'avatar', corps: PNG })).j.id }); return [x.code, (await E.get('/api/conversations')).j.conversations.length - n]; })(), [404, 0]);
      /* ⛔ remarque 7 du gardien : celui qui a posé la photo du groupe puis le quitte (ou en est retiré) ne la lit plus — un droit de « dépositaire » ne survit pas à l'appartenance */
      const Gx = await groupe(E, 'Photo d\'un ancien', [Fr]);
      const depX = await deposer(E, { genre: 'avatar', corps: PNG });
      await E.post('/api/conversations/' + Gx + '/maj', { avatar_piece: depX.j.id });
      v('population : la photo du groupe se lit de celui qui l\'a posée (200), d\'un membre (200), pas d\'un étranger (404)', [(await lire(E, depX.j.id)).code, (await lire(Fr, depX.j.id)).code, (await lire(Gi, depX.j.id)).code], [200, 200, 404]);
      v('Eve quitte le groupe (Fred, seul membre restant, devient administrateur)', (await E.post('/api/conversations/' + Gx + '/quitter', {})).code, 200);
      v('⛔ celle qui a posé la photo et a QUITTÉ le groupe ne la lit plus (404) ; le membre qui reste, si (200)', [(await lire(E, depX.j.id)).code, (await lire(Fr, depX.j.id)).code], [404, 200]);
      v('…et le groupe ne lui rend plus rien non plus : elle ne le voit plus dans sa liste', (await E.get('/api/conversations')).j.conversations.some(c => c.id === Gx), false);
      v('revenue dans le groupe, elle relit la photo (c\'est bien l\'appartenance qui décide, pas un état figé)', [(await Fr.post('/api/conversations/' + Gx + '/membres/ajouter', { uids: [E.moi.id] })).code, (await lire(E, depX.j.id)).code], [200, 200]);
      v('⛔ retirée par l\'administrateur, elle ne la lit plus', [(await Fr.post('/api/conversations/' + Gx + '/membres/retirer', { uid: E.moi.id })).code, (await lire(E, depX.j.id)).code], [200, 404]);
      v('contre-épreuve : sa PROPRE photo de profil, elle la lit toujours (le droit de la personne sur elle-même ne tient pas au groupe)', await (async () => { const d = await deposer(E, { genre: 'avatar', corps: PNG }); await E.post('/api/moi/avatar', { piece: d.j.id }); return (await lire(E, d.j.id)).code; })(), 200);
      /* tout le monde part : la conversation disparaît, sa photo avec */
      const Gs = await groupe(E, 'Éphémère de groupe', [Gi]);
      const dep4 = await deposer(E, { genre: 'avatar', corps: PNG }), ph = await photo(E, Gs);
      await E.post('/api/conversations/' + Gs + '/maj', { avatar_piece: dep4.j.id });
      await envoyer(E, Gs, { type: 'photo', pieces: [{ id: ph, w: 8, h: 8 }] });
      await Gi.post('/api/conversations/' + Gs + '/quitter', {});
      await E.post('/api/conversations/' + Gs + '/quitter', {});
      v('⛔ le DERNIER membre part : la conversation disparaît et ses pièces avec elle — la photo du groupe et les photos des messages (lignes ET fichiers)', [await disparu(dep4.j.id), await disparu(ph)], [true, true]);
      v('   et leurs identifiants sont notés dans `purge`', [purge(dep4.j.id), purge(ph)], [['piece'], ['piece']]);
    }

    /* ═══ 10. RIEN EN CLAIR SUR LE DISQUE, RIEN DANS LES JOURNAUX ═════════════════════════════════════════════════════════════════ */
    console.log('\nRien en clair : un canari dans une photo, un vocal, un fichier et son nom — absent de TOUS les fichiers de données et de la sortie du service');
    {
      const Gc = await groupe(A, 'Canaris', [B]);
      const CAN = { gps: 'ZXCANARIQGPS48N', son: 'ZXCANARIQSONPRIVE', fic: 'ZXCANARIQCONTENU', nom: 'ZXCANARIQNOMFICHIER', xmp: 'ZXCANARIQXMPPHOTO' };
      const jpg = F.jpeg({ exif: CAN.gps, xmp: CAN.xmp });
      const son = Buffer.concat([F.webm(100), Buffer.from(CAN.son.repeat(50))]);
      const fic = Buffer.concat([F.pdf(100), Buffer.from(CAN.fic.repeat(50))]);
      vrai('population : chaque canari ÉTAIT dans ce qui a été envoyé', jeton(jpg, CAN.gps) && jeton(jpg, CAN.xmp) && jeton(son, CAN.son) && jeton(fic, CAN.fic));
      const dj = await deposer(A, { conv: Gc, genre: 'photo', corps: jpg }), ds = await deposer(A, { conv: Gc, genre: 'vocal', corps: son }), df = await deposer(A, { conv: Gc, genre: 'fichier', nom: CAN.nom + '.pdf', corps: fic });
      await envoyer(A, Gc, { type: 'photo', pieces: [{ id: dj.j.id, w: 8, h: 8 }] }); await envoyer(A, Gc, { type: 'vocal', piece: ds.j.id, dur: 4, bars: [6, 9] }); await envoyer(A, Gc, { type: 'fichier', piece: df.j.id });
      const relue = await lire(B, dj.j.id);
      v('⛔ la photo servie a perdu son EXIF et son XMP (retirés à l\'écriture)', [jeton(relue.buf, CAN.gps), jeton(relue.buf, CAN.xmp), relue.buf.length < jpg.length], [false, false, true]);
      v('le vocal et le fichier, eux, reviennent exacts', [(await lire(B, ds.j.id)).buf.equals(son), (await lire(B, df.j.id)).buf.equals(fic)], [true, true]);
      const dossiers = tousLesFichiers(svc.data);
      vrai('population : le dossier de données porte la base, son journal, et au moins trois fichiers de pièces (' + dossiers.length + ' fichiers)', dossiers.some(f => /msg\.db$/.test(f)) && piecesSurDisque().length >= 3);
      const trouves = [];
      for (const f of dossiers) { const b = fs.readFileSync(f); for (const [k, c] of Object.entries(CAN)) if (b.includes(Buffer.from(c))) trouves.push(k + ' dans ' + path.basename(f)); }
      v('⛔ AUCUN canari (contenu, nom de fichier, EXIF, XMP) dans AUCUN fichier de données — la base, son WAL, les pièces', trouves, []);
      const sortie = svc.sortie.texte();
      vrai('population : le service a écrit un journal (' + sortie.split('\n').filter(Boolean).length + ' lignes)', sortie.split('\n').filter(Boolean).length >= 1);
      v('⛔ aucun canari, aucun nom de fichier et aucun identifiant COMPLET de pièce dans ce que le service a écrit', [Object.values(CAN).filter(c => sortie.includes(c)), /\bf_[0-9a-f]{32}\b/.test(sortie), sortie.includes('.pdf')], [[], false, false]);
      const h = await T.client(svc.base).get('/health');
      vrai('⛔ /health ne porte aucun identifiant de pièce ni de personne', !/\b[pcmf]_[0-9a-f]{32}\b/.test(h.txt));
      const piecesEnBase = requete('SELECT COUNT(*) AS n, COALESCE(SUM(taille), 0) AS o FROM piece')[0];
      v('/health.pieces compte les pièces et les octets (ceux de la base)', [h.j.pieces.n, h.j.pieces.octets], [piecesEnBase.n, piecesEnBase.o]);
      /* le PNG avec un texte caché, et le WebP avec son EXIF, par la route */
      const png = F.png({ avant: [['tEXt', Buffer.from('Comment\0ZXCANARIQPNG')], ['eXIf', Buffer.from('ZXCANARIQPNGEXIF')]] });
      const wp = F.webp({ exif: 'ZXCANARIQWEBPEXIF', xmp: 'ZXCANARIQWEBPXMP' });
      const dp = await deposer(A, { conv: Gc, genre: 'photo', corps: png }), dw = await deposer(A, { conv: Gc, genre: 'photo', corps: wp });
      const lp = await lire(A, dp.j.id), lw = await lire(A, dw.j.id);
      v('⛔ PNG et WebP aussi : métadonnées retirées par la route', [jeton(lp.buf, 'ZXCANARIQ'), jeton(lw.buf, 'ZXCANARIQ'), lp.h.get('content-type'), lw.h.get('content-type')], [false, false, 'image/png', 'image/webp']);
    }

    /* ═══ 11. LES PIÈCES ABÎMÉES ET LE BALAYEUR ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne pièce abîmée se compte dans /health ; un fichier sans ligne est effacé par le balayeur (mais pas un fichier tout neuf)');
    {
      const Ga = await groupe(A, 'Abîmées', [B]);
      const big = crypto.randomBytes(30000);
      const d = await deposer(A, { conv: Ga, genre: 'fichier', nom: 'abime.bin', corps: big });
      await envoyer(A, Ga, { type: 'fichier', piece: d.j.id });
      const sante0 = (await T.client(svc.base).get('/health')).j.pieces.illisibles;
      const f = fs.readFileSync(fichierDe(d.j.id)); f[16 + 4 * (12 + 4096 + 16) + 20] ^= 0xFF; fs.writeFileSync(fichierDe(d.j.id), f);   // un octet du bloc 4
      const intact = await lire(B, d.j.id, { range: 'bytes=0-100' });
      v('⛔ un bloc abîmé ne gêne pas une plage qui ne le touche pas (Range ne déchiffre que ce qu\'il faut)', [intact.code, intact.buf.equals(big.subarray(0, 101))], [206, true]);
      const abimee = await fetch(svc.base + '/api/pieces/' + d.j.id, { headers: { Cookie: B.enteteCookie() } }).then(async r => { try { const b = Buffer.from(await r.arrayBuffer()); return { code: r.status, n: b.length, ok: true }; } catch (e) { return { code: 0, n: 0, ok: false }; } }, () => ({ code: 0, n: 0, ok: false }));
      vrai('⛔ lire toute la pièce abîmée : la connexion est COUPÉE, le client ne reçoit jamais le fichier complet ni des octets faux (' + JSON.stringify(abimee) + ')', abimee.ok === false || abimee.n < big.length);
      v('⛔ et /health COMPTE la pièce illisible (une erreur avalée sans trace est la panne silencieuse type)', await att(async () => (await T.client(svc.base).get('/health')).j.pieces.illisibles > sante0, 5000), true);
      fs.unlinkSync(fichierDe(d.j.id));
      const manque = await lire(B, d.j.id);
      v('un fichier qui MANQUE alors que sa ligne existe : 404, comptée aussi', [manque.code, (await T.client(svc.base).get('/health')).j.pieces.illisibles >= sante0 + 2], [404, true]);
      /* le balayeur */
      const orphelin = 'f_' + crypto.randomBytes(16).toString('hex'), recent = 'f_' + crypto.randomBytes(16).toString('hex');
      for (const id of [orphelin, recent]) { fs.mkdirSync(path.dirname(fichierDe(id)), { recursive: true }); fs.writeFileSync(fichierDe(id), 'OPMP-orphelin'); }
      const vieux = new Date(Date.now() - 3600000); fs.utimesSync(fichierDe(orphelin), vieux, vieux);
      fs.mkdirSync(path.join(svc.data, 'pieces', 'tmp'), { recursive: true });
      const tmpVieux = path.join(svc.data, 'pieces', 'tmp', 'c'.repeat(24)); fs.writeFileSync(tmpVieux, 'x'); const tresVieux = new Date(Date.now() - 7200000); fs.utimesSync(tmpVieux, tresVieux, tresVieux);
      v('⛔ le balayeur efface un fichier sans ligne de plus de dix minutes — et un temporaire de plus d\'une heure', [await att(() => !fs.existsSync(fichierDe(orphelin)) && !fs.existsSync(tmpVieux), 12000)], [true]);
      v('⛔ …mais PAS un fichier tout neuf sans ligne (un envoi qui vient de ranger le sien n\'a pas forcément encore sa ligne)', fs.existsSync(fichierDe(recent)), true);
    }

    /* ═══ 12. LA CONFIDENTIALITÉ : DEUX INTERRUPTEURS RÉCIPROQUES ═════════════════════════════════════════════════════════════════ */
    console.log('\nLa confidentialité : la présence et les confirmations de lecture sont RÉCIPROQUES — comme WhatsApp, appliquées par le service');
    {
      const E = await compte('eve'), Fr = await compte('fred'), Gi = await compte('gina');
      await lienContact(E, Fr); await lienContact(E, Gi); await lienContact(Fr, Gi);
      const dEF = await directe(E, Fr), gEFG = await groupe(E, 'Trio', [Fr, Gi]);
      const base0 = await E.get('/api/moi/confidentialite');
      v('par défaut : trouvable « tous », présence et accusés allumés', base0.j, { trouvable: 'tous', presence: true, accuses: true });
      for (const [nom, corps] of [['rien du tout', {}], ['un champ inconnu seul', { couleur: 'bleu' }], ['une présence non booléenne', { presence: 'non' }], ['des accusés en nombre', { accuses: 0 }], ['un « trouvable » inventé', { trouvable: 'mes-amis' }]]) {
        const x = await E.post('/api/moi/confidentialite', corps);
        v('⛔ refusé (400 champ_invalide) : ' + nom, [x.code, x.j.error], [400, 'champ_invalide']);
      }
      v('et rien n\'a changé', (await E.get('/api/moi/confidentialite')).j, base0.j);
      v('sans session : 401', (await T.client(svc.base).post('/api/moi/confidentialite', { presence: false })).code, 401);

      /* --- la présence --- */
      let fE = await T.flux(E);
      const fF = await T.flux(Fr), fG = await T.flux(Gi);
      for (const f of [fE, fF, fG]) await f.attendre(e => e.event === 'bonjour');
      v('population : Eve voit Fred et Gina en ligne, Fred voit Eve', [(await E.get('/api/contacts')).j.contacts.filter(c => [Fr.moi.id, Gi.moi.id].includes(c.id)).map(c => c.en_ligne), (await Fr.get('/api/contacts')).j.contacts.find(c => c.id === E.moi.id).en_ligne], [[true, true], true]);
      const off = await E.post('/api/moi/confidentialite', { presence: false });
      v('Eve coupe « Afficher quand je suis en ligne » : 200, l\'état complet est rendu', [off.code, off.j], [200, { ok: true, trouvable: 'tous', presence: false, accuses: true }]);
      v('⛔ elle ne voit plus la présence de PERSONNE (Fred et Gina sont en ligne, la liste dit « hors ligne »)', (await E.get('/api/contacts')).j.contacts.map(c => c.en_ligne), [false, false]);
      const hors = await fF.attendre(e => e.event === 'presence' && e.data.uid === E.moi.id && e.data.en_ligne === false);
      vrai('⛔ Fred est PRÉVENU tout de suite que la présence d\'Eve s\'éteint (« hors ligne »)', !!hors);
      v('⛔ Fred ne voit plus Eve en ligne dans sa liste', (await Fr.get('/api/contacts')).j.contacts.find(c => c.id === E.moi.id).en_ligne, false);
      v('…mais voit toujours Gina (la réciprocité ne touche que celle qui a coupé)', (await Fr.get('/api/contacts')).j.contacts.find(c => c.id === Gi.moi.id).en_ligne, true);
      /* un contact se connecte / se déconnecte : Eve, présence coupée, ne reçoit RIEN */
      const nE2 = fE.evenements.filter(e => e.event === 'presence').length;
      fG.fermer();
      await fF.attendre(e => e.event === 'presence' && e.data.uid === Gi.moi.id && e.data.en_ligne === false, 6000);
      let fG2 = await T.flux(Gi); await fG2.attendre(e => e.event === 'bonjour');
      await fF.attendre(e => e.event === 'presence' && e.data.uid === Gi.moi.id && e.data.en_ligne === true, 6000);
      v('⛔ Gina part puis revient : Fred l\'apprend, EVE (présence coupée) n\'en reçoit AUCUN événement de présence', fE.evenements.filter(e => e.event === 'presence').length, nE2);
      /* ⛔ L'AUTRE MOITIÉ, « je ne montre pas » : Eve (présence coupée) se DÉCONNECTE puis REVIENT — Fred, qui voit les présences, n'apprend RIEN d'elle. Gina fait le TÉMOIN : ses deux
         événements arrivent chez Fred APRÈS ceux qu'Eve aurait produits (elle part 700 ms plus tard, la grâce est de 300), donc « aucun événement d'Eve » se lit une fois que tout a eu lieu —
         et le témoin prouve que le flux de Fred fonctionnait pendant ce temps. */
      const nFE = fF.evenements.filter(e => e.event === 'presence' && e.data.uid === E.moi.id).length;
      fE.fermer();
      await T.dort(700);
      fE = await T.flux(E); await fE.attendre(e => e.event === 'bonjour');
      fG2.fermer();
      await fF.attendre(e => e.event === 'presence' && e.data.uid === Gi.moi.id && e.data.en_ligne === false, 6000);
      fG2 = await T.flux(Gi); await fG2.attendre(e => e.event === 'bonjour');
      const nTemoin = fF.evenements.filter(e => e.event === 'presence' && e.data.uid === Gi.moi.id).length;
      const revenue = await att(() => fF.evenements.filter(e => e.event === 'presence' && e.data.uid === Gi.moi.id && e.data.en_ligne === true).length >= 2, 6000);
      vrai('population : le témoin (Gina) est parti puis revenu chez Fred, APRÈS la déconnexion et le retour d\'Eve (' + nTemoin + ' événements d\'elle déjà vus)', revenue);
      v('⛔ Eve (présence coupée) se déconnecte puis revient : Fred n\'apprend RIEN d\'elle — ni « hors ligne » ni « en ligne »', fF.evenements.filter(e => e.event === 'presence' && e.data.uid === E.moi.id).length, nFE);
      /* rallumer */
      const nF = fF.evenements.filter(e => e.event === 'presence' && e.data.uid === E.moi.id && e.data.en_ligne === true).length;
      await E.post('/api/moi/confidentialite', { presence: true });
      vrai('⛔ Eve rallume : Fred l\'apprend tout de suite (« en ligne », Eve est là)', await att(() => fF.evenements.filter(e => e.event === 'presence' && e.data.uid === E.moi.id && e.data.en_ligne === true).length > nF, 6000));
      v('et Eve revoit Fred et Gina en ligne', (await E.get('/api/contacts')).j.contacts.map(c => c.en_ligne), [true, true]);
      /* par POST /api/moi/maj aussi (l'ancienne porte) */
      await E.post('/api/moi/maj', { prefs: { presence: false } });
      v('⛔ l\'ancienne porte (`POST /api/moi/maj {prefs}`) applique la MÊME règle réciproque', [(await E.get('/api/contacts')).j.contacts.map(c => c.en_ligne), (await Fr.get('/api/contacts')).j.contacts.find(c => c.id === E.moi.id).en_ligne], [[false, false], false]);
      await E.post('/api/moi/confidentialite', { presence: true });
      fG2.fermer();

      /* --- les confirmations de lecture : une conversation à deux, puis un groupe --- */
      const luDe = async (c, conv, uid) => ((await c.get('/api/conversations/' + conv)).j.membres.find(m => m.id === uid) || {}).lu_seq;
      const m1 = await envoyer(E, dEF, { texte: 'un' }), g1 = await envoyer(E, gEFG, { texte: 'groupe un' });
      await Fr.post('/api/conversations/' + dEF + '/lu', { seq: m1.j.seq }); await Fr.post('/api/conversations/' + gEFG + '/lu', { seq: g1.j.seq });
      await fE.attendre(e => e.event === 'lu' && e.data.uid === Fr.moi.id && e.data.conv === dEF);
      v('population : par défaut Eve voit que Fred a lu — dans la conversation à deux ET dans le groupe', [await luDe(E, dEF, Fr.moi.id), await luDe(E, gEFG, Fr.moi.id)], [m1.j.seq, g1.j.seq]);
      const off2 = await E.post('/api/moi/confidentialite', { accuses: false });
      v('Eve coupe ses confirmations de lecture : 200', [off2.code, off2.j.accuses], [200, false]);
      v('⛔ elle ne voit plus le « Lu » de personne : lu_seq de Fred est null, dans la conversation à deux comme dans le groupe', [await luDe(E, dEF, Fr.moi.id), await luDe(E, gEFG, Fr.moi.id), await luDe(E, gEFG, Gi.moi.id)], [null, null, null]);
      v('⛔ et sa propre lecture lui reste visible (son compteur est à elle)', await luDe(E, dEF, E.moi.id) !== null, true);
      const m2 = await envoyer(Fr, dEF, { texte: 'deux' }), g2 = await envoyer(Gi, gEFG, { texte: 'groupe deux' });
      const luAutres = () => fE.evenements.filter(e => e.event === 'lu' && e.data.uid !== E.moi.id).length;
      const nLu = luAutres();
      await Fr.post('/api/conversations/' + dEF + '/lu', { seq: m2.j.seq }); await Gi.post('/api/conversations/' + gEFG + '/lu', { seq: g2.j.seq });
      await E.post('/api/conversations/' + dEF + '/lu', { seq: m2.j.seq });
      await fF.attendre(e => e.event === 'lu' && e.data.uid === E.moi.id, 800);
      await T.dort(300);
      v('⛔ Eve ne reçoit AUCUN événement « lu » des autres (Fred et Gina viennent de lire) tant qu\'elle a coupé les siens', luAutres() - nLu, 0);
      v('⛔ ET son « Lu » n\'est rendu à personne : Fred ne voit pas qu\'Eve a lu (conversation à deux et groupe)', [await luDe(Fr, dEF, E.moi.id), await luDe(Fr, gEFG, E.moi.id)], [null, null]);
      v('…mais Fred voit toujours celui de Gina dans le groupe (la réciprocité ne touche que celle qui a coupé)', await luDe(Fr, gEFG, Gi.moi.id), g2.j.seq);
      const evUn = fF.evenements.filter(e => e.event === 'lu' && e.data.uid === E.moi.id).length;
      v('et Fred ne reçoit aucun événement « lu » d\'Eve', evUn, 0);
      /* l'événement `personne` : les co-membres relisent les « Lu » */
      vrai('⛔ couper les accusés prévient les co-membres (événement `personne`) : ils relisent les « Lu »', !!(await fF.attendre(e => e.event === 'personne' && e.data.uid === E.moi.id, 3000)));
      await E.post('/api/moi/confidentialite', { accuses: true });
      v('⛔ Eve rallume : elle revoit le « Lu » de Fred, et Fred celui d\'Eve', [await luDe(E, dEF, Fr.moi.id), await luDe(Fr, dEF, E.moi.id)], [m2.j.seq, m2.j.seq]);
      /* par l'ancienne porte aussi */
      await E.post('/api/moi/maj', { prefs: { accuses: false } });
      v('⛔ l\'ancienne porte (`POST /api/moi/maj {prefs}`) applique la MÊME règle', await luDe(E, dEF, Fr.moi.id), null);
      await E.post('/api/moi/maj', { prefs: { accuses: true } });
      for (const f of [fE, fF]) f.fermer();
      /* trouvable garde son comportement */
      const tr = await E.post('/api/moi/confidentialite', { trouvable: 'personne' });
      v('« qui peut me trouver » se règle toujours, seul, sans toucher aux deux autres', [tr.code, tr.j], [200, { ok: true, trouvable: 'personne', presence: true, accuses: true }]);
      await E.post('/api/moi/confidentialite', { trouvable: 'tous', presence: false, accuses: false });
      v('les trois ensemble en une seule demande', (await E.get('/api/moi/confidentialite')).j, { trouvable: 'tous', presence: false, accuses: false });
      await E.post('/api/moi/confidentialite', { presence: true, accuses: true });
    }

    /* ═══ 13. L'ESPACE UTILISÉ, LES CONFIGURATIONS ═════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'espace utilisé, les maximums annoncés, la configuration');
    {
      const E = await compte('gina');
      const s0 = await E.get('/api/moi/stockage');
      v('GET /api/moi/stockage : {utilise, max} — rien déposé, le quota de départ (2 Go)', [s0.code, s0.j.utilise, s0.j.max], [200, 0, 2147483648]);
      const G2 = await groupe(E, 'Stock', []);
      const d = await deposer(E, { conv: G2, genre: 'fichier', nom: 'a.bin', corps: crypto.randomBytes(30000) });
      v('⛔ l\'espace utilisé compte les octets RANGÉS', (await E.get('/api/moi/stockage')).j.utilise, 30000);
      const m = await envoyer(E, G2, { type: 'fichier', piece: d.j.id });
      await E.post('/api/conversations/' + G2 + '/messages/supprimer', { seq: m.j.seq, pour: 'tous' });
      v('⛔ supprimer le message RENDS l\'espace', await att(async () => (await E.get('/api/moi/stockage')).j.utilise === 0, 6000), true);
      v('sans session : 401', (await T.client(svc.base).get('/api/moi/stockage')).code, 401);
      const cfg = (await T.client(svc.base).get('/api/config')).j;
      v('GET /api/config annonce les maximums des pièces (la page refuse AVANT d\'envoyer)', cfg.limites.pieces, { photo_max: 200000, vocal_max: 300000, fichier_max: 600000, avatar_max: 100000, par_message: 10, quota: 2147483648 });
      /* la configuration refuse ce qui n'a pas de sens */
      const refus = (c) => { try { piecesConfig(c); return null; } catch (e) { return e.code; } };
      v('⛔ une configuration absurde REFUSE le démarrage : maximum négatif, quota nul, fractionnaire, bloc qui n\'est pas une puissance de deux, texte', [refus({ photoMax: -1 }), refus({ quotaPersonne: 0 }), refus({ depotsHeure: 1.5 }), refus({ bloc: 5000 }), refus({ vocalMax: '10' }), refus({ simultanes: 0 })], Array(6).fill('CONFIG'));
      v('et une configuration juste (ou absente) donne les valeurs de départ de SERVEUR.md § 5.6 : 12 Mo, 10 Mo, 25 Mo, 2 Go, 60 envois par heure, 24 h, blocs de 64 Kio', (() => { const c = piecesConfig(undefined); return [c.photoMax, c.vocalMax, c.fichierMax, c.quotaPersonne, c.depotsHeure, c.orphelineMs, c.bloc]; })(), [12582912, 10485760, 26214400, 2147483648, 60, 86400000, 65536]);
      v('⛔ les réglages de LENTEUR (A2, A4) ont des valeurs de départ — 64 Ko/s après 30 s pour un envoi, 30 s d\'attente et 10 minutes au plus pour une lecture — et des bornes : un débit nul, une grâce nulle, un plafond de durée d\'une milliseconde refusent le démarrage', [(() => { const c = piecesConfig(undefined); return [c.depotDebitMin, c.depotGraceMs, c.lectureAttenteMs, c.lectureMaxMs]; })(), refus({ depotDebitMin: 0 }), refus({ depotGraceMs: 0 }), refus({ lectureAttenteMs: 1 }), refus({ lectureMaxMs: 10 }), refus({ depotDebitMin: 100000.5 })], [[65536, 30000, 30000, 600000], 'CONFIG', 'CONFIG', 'CONFIG', 'CONFIG', 'CONFIG']);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }

  /* ═══ 14. UN SERVICE AUX PLAFONDS BAS : quota, envois par heure, envois en même temps, disque ═════════════════════════════════════ */
  console.log('\nLes plafonds : le quota par personne (402), les envois par heure (429 + Retry-After), les envois en même temps (429), le plancher de disque (503)');
  const svc2 = await T.lancerService({ urlGestion: og.url, horloge: true, config: { pieces: { quotaPersonne: 400000, fichierMax: 300000, photoMax: 300000, bloc: 4096, parPersonne: 2, simultanes: 3 }, quotas: { piece: { max: 12, fenetreMs: 3600000 } } } });
  try {
    const E = await compte('eve', svc2), Fr = await compte('fred', svc2);
    await lienContact(E, Fr);
    const g = await groupe(E, 'Plafonds', [Fr]);
    const fic = (n) => crypto.randomBytes(n);
    const r1 = await deposer(E, { conv: g, genre: 'fichier', nom: '1.bin', corps: fic(150000) }), r2 = await deposer(E, { conv: g, genre: 'fichier', nom: '2.bin', corps: fic(150000) });
    v('deux fichiers de 150 000 octets sur un quota de 400 000 : 201 et 201', [r1.code, r2.code], [201, 201]);
    const r3 = await deposer(E, { conv: g, genre: 'fichier', nom: '3.bin', corps: fic(150000) });
    v('⛔ le troisième dépasserait le quota : 402 quota_atteint, avec ce qui est utilisé et le maximum', [r3.code, r3.j.error, r3.j.portee, r3.j.utilise, r3.j.max], [402, 'quota_atteint', 'stockage', 300000, 400000]);
    v('   (402, pas 429 : la phrase « réessaie dans un instant » serait fausse)', r3.h.get('retry-after'), null);
    v('⛔ le quota est PAR PERSONNE : Fred dépose, lui', (await deposer(Fr, { conv: g, genre: 'fichier', nom: 'f.bin', corps: fic(150000) })).code, 201);
    v('un dépôt qui tient dans ce qui reste (100 000) passe : 201', (await deposer(E, { conv: g, genre: 'fichier', nom: '4.bin', corps: fic(100000) })).code, 201);
    v('…et il ne reste plus rien : un octet de plus est refusé (402)', (await deposer(E, { conv: g, genre: 'fichier', nom: '5.bin', corps: fic(1) })).code, 402);
    const m = await envoyer(E, g, { type: 'fichier', piece: r1.j.id });
    await E.post('/api/conversations/' + g + '/messages/supprimer', { seq: m.j.seq, pour: 'tous' });
    v('⛔ supprimer le message d\'un fichier de 150 000 octets rend la place : on dépose de nouveau', await att(async () => (await deposer(E, { conv: g, genre: 'fichier', nom: '6.bin', corps: fic(140000) })).code === 201, 6000), true);

    /* deux envois EN MÊME TEMPS : le quota réserve la taille annoncée avant de lire */
    const Gi = await compte('gina', svc2);
    const lentement = (c, taille, retenir) => new Promise((ok) => {
      const s = net.connect(svc2.port, '127.0.0.1', () => {
        s.write('POST /api/pieces?genre=avatar HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc2.base + '\r\nX-OPM: 1\r\nCookie: ' + c.enteteCookie() + '\r\nContent-Type: application/octet-stream\r\nContent-Length: ' + taille + '\r\nConnection: close\r\n\r\n');
        s.write(PNG.subarray(0, 40));
      });
      let rep = ''; s.on('data', d => { rep += d; });
      s.on('close', () => ok(rep)); s.on('error', () => ok(rep));
      retenir.push({ s, c, taille });
    });
    const tenus = [];
    const p1 = lentement(Gi, 30000, tenus);
    await T.dort(200);
    const p2 = lentement(Gi, 30000, tenus);
    await T.dort(200);
    const p3 = await deposer(Gi, { genre: 'avatar', corps: PNG });
    v('⛔ deux envois lents de la même personne en cours (le maximum « par personne » est 2) : le TROISIÈME reçoit 429 quota_atteint (simultane) avec Retry-After', [p3.code, p3.j.error, p3.j.portee, p3.h.get('retry-after')], [429, 'quota_atteint', 'simultane', '5']);
    for (const t of tenus) t.s.destroy();
    await Promise.all([p1, p2]);
    await T.dort(300);
    v('…et une fois les envois lents coupés, la personne dépose de nouveau (rien n\'est resté réservé)', (await deposer(Gi, { genre: 'avatar', corps: PNG })).code, 201);

    /* le plafond d'envois par heure : 12 sur ce service (Eve en a déjà fait 10 et refusé 2…) */
    const H1 = await compte('dave', svc2);
    let derniere = null, nok = 0;
    for (let i = 0; i < 14; i++) { derniere = await deposer(H1, { genre: 'avatar', corps: PNG }); if (derniere.code === 201) nok++; else break; }
    v('⛔ au 13e envoi de la même heure : 429 quota_atteint avec Retry-After (et son `retry` dans le corps)', [nok, derniere.code, derniere.j.error, Number(derniere.h.get('retry-after')) >= 1, derniere.j.retry >= 1], [12, 429, 'quota_atteint', true, true]);
    svc2.avancer(3600000 + 60000);
    v('une heure plus tard, la fenêtre est neuve : 201', (await deposer(H1, { genre: 'avatar', corps: PNG })).code, 201);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); console.log(svc2.sortie.texte().slice(-800)); process.exitCode = 1; }
  await svc2.arreter();

  /* le plancher de disque : la taille ANNONCÉE ne doit pas faire passer sous le seuil */
  const libreMo = (() => { const s = fs.statfsSync(os.tmpdir()); return Number(s.bavail) * Number(s.bsize) / 1048576; })();
  const marge3 = 300;   // 300 Mo entre l'espace libre et le plancher : un envoi annoncé à 200 Mo y tient seul, deux non (remarque 3 du gardien) — et 100 Mo de jeu des deux côtés si le disque bouge pendant le banc
  const svc3 = await T.lancerService({ urlGestion: og.url, config: { disqueMinMo: Math.max(1, Math.floor(libreMo) - marge3), pieces: { fichierMax: 500 * 1048576 } } });
  try {
    const Fr = await compte('fred', svc3);
    const avant = await deposer(Fr, { genre: 'avatar', corps: PNG });
    v('population : sous le plancher (' + Math.max(1, Math.floor(libreMo) - marge3) + ' Mo) avec ' + Math.floor(libreMo) + ' Mo libres, un petit dépôt passe', avant.code, 201);
    await lienContact(Fr, await compte('gina', svc3));
    const gr = (await Fr.post('/api/conversations/groupe', { nom: 'Disque', membres: [] })).j.conversation.id;
    const x = await F.deposerBrut(Fr, { chemin: '/api/pieces?' + new URLSearchParams({ conv: gr, genre: 'fichier' }), entetes: { 'Content-Length': String(400 * 1048576), 'X-OPM-Nom': 'enorme.bin' }, morceaux: [Buffer.alloc(100, 1)] });
    v('⛔ un dépôt ANNONCÉ à 400 Mo qui ferait passer le disque sous son plancher : 503 disque_plein, AVANT d\'avoir lu le corps (ce service ne doit jamais priver OP GESTION de disque)', [x.code, x.j.error], [503, 'disque_plein']);
    /* ⛔ remarque 3 du gardien : le plancher soustrait les dépôts EN COURS. Un dépôt annoncé à 200 Mo tient seul sous la marge de 300 Mo ; un second de 200 Mo, non — l'espace libre ne baisse qu'à mesure
       que les octets arrivent, et avant le correctif seize dépôts « qui tenaient chacun » vidaient le disque ensemble. */
    const entetesLent = (nom, taille) => ({ 'Content-Length': String(taille), 'X-OPM-Nom': nom }), cheminLent = '/api/pieces?' + new URLSearchParams({ conv: gr, genre: 'fichier' });
    const lent3 = (taille) => new Promise((ok) => {
      const s = net.connect(svc3.port, '127.0.0.1', () => {
        s.write('POST ' + cheminLent + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc3.base + '\r\nX-OPM: 1\r\nX-OPM-Nom: lent.bin\r\nCookie: ' + Fr.enteteCookie() + '\r\nContent-Type: application/octet-stream\r\nContent-Length: ' + taille + '\r\nConnection: close\r\n\r\n');
        s.write(Buffer.alloc(100, 1));
      });
      let rep = ''; s.on('data', d => { rep += d; });
      s.on('close', () => ok({ rep, s })); s.on('error', () => ok({ rep, s }));
      lent3.sockets.push(s);
    });
    lent3.sockets = [];
    const ENV = 200 * 1048576;
    const premier = lent3(ENV);
    await T.dort(400);
    const seul = await F.deposerBrut(Fr, { chemin: cheminLent, entetes: entetesLent('second.bin', ENV), morceaux: [Buffer.alloc(100, 1)], delaiMs: 2500 });
    v('⛔ un premier dépôt de 200 Mo est EN COURS (tient seul sous la marge) : un second de 200 Mo est refusé tout de suite, 503 disque_plein — ensemble ils passeraient sous le plancher', [seul.code, seul.j && seul.j.error], [503, 'disque_plein']);
    const petit = await deposer(Fr, { conv: gr, genre: 'fichier', nom: 'petit.bin', corps: Buffer.alloc(1000, 2) });
    v('…alors qu\'un petit dépôt, lui, passe encore (c\'est de la place qui manque, pas un refus général)', petit.code, 201);
    for (const s of lent3.sockets) s.destroy();
    await premier;
    await T.dort(400);
    const apres = await F.deposerBrut(Fr, { chemin: cheminLent, entetes: entetesLent('troisieme.bin', ENV), morceaux: [Buffer.alloc(100, 1)], delaiMs: 1500 });
    v('⛔ le premier dépôt coupé REND sa place : un dépôt de 200 Mo est de nouveau accepté (il attend son corps — pas de 503)', [apres.code, apres.j && apres.j.error], [0, 'delai']);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await svc3.arreter();

  /* ═══ 9. LE BALAYEUR N'EST PAS UNE GARDE ══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe balayeur n\'est pas une garde : tant qu\'il n\'a pas passé, une pièce échue ne se lit plus et ne s\'attache plus');
  /* ⛔ Sur les autres services du banc le balayeur passe toutes les 150 ms : une pièce échue y disparaît avant qu'on la relise, et la vérification d'échéance FAITE À LA LECTURE (puis à
     l'attachement) ne se voyait pas — retirée, tout restait vert. Ici le balayeur ne passe qu'une fois par heure : la ligne de la pièce est encore là, et c'est l'échéance qui refuse.
     En production la fenêtre est celle de `balayageMs` (une minute) : un message éphémère échu ne doit pas rester lisible par sa photo pendant ce temps. */
  const svc4 = await T.lancerService({ urlGestion: og.url, horloge: true, config: { balayageMs: 3600000, pieces: { photoMax: 200000, bloc: 4096 }, quotas: { piece: { max: 1000, fenetreMs: 3600000 } } } });
  try {
    const A4 = await compte('alice', svc4), B4 = await compte('bruno', svc4);
    await lienContact(A4, B4);
    const ligne4 = (id) => { const d = T.lireBase(path.join(svc4.data, 'msg.db')); try { return d.prepare('SELECT 1 FROM piece WHERE id = ?').all(id).length; } finally { d.close(); } };
    const ge = await groupe(A4, 'Éphémère', [B4], { ephemere_s: 86400 }), gd = await groupe(A4, 'Durable', [B4]);
    const pe4 = await photo(A4, ge), pe4m = await envoyer(A4, ge, { type: 'photo', pieces: [{ id: pe4, w: 8, h: 8 }] });
    const po4 = await photo(A4, gd);
    const av4 = (await deposer(A4, { genre: 'avatar', corps: PNG })).j.id;                 // une photo de profil déposée, jamais posée
    const pd4 = await photo(A4, gd), pd4m = await envoyer(A4, gd, { type: 'photo', pieces: [{ id: pd4, w: 8, h: 8 }] });
    v('population : la photo d\'un éphémère (lue par Bruno), une pièce jamais envoyée (lue par son dépositaire), la photo d\'un message durable (lue par Bruno), une photo de profil déposée et pas posée (lue par son dépositaire seul) — toutes lisibles', [pe4m.code, (await lire(B4, pe4)).code, (await lire(A4, po4)).code, (await lire(B4, pd4)).code, (await lire(A4, av4)).code, (await lire(B4, av4)).code], [201, 200, 200, 200, 200, 404]);
    /* « supprimé » : « supprimer pour tous » efface la ligne de la pièce DANS la même transaction, donc cet état n'existe pas par l'API — il existe après une restauration ou une version d'avant.
       On le fabrique à la main : le droit de lire ne doit pas dépendre de ce que l'effacement a bien eu lieu. */
    const bd = new (require('node:sqlite').DatabaseSync)(path.join(svc4.data, 'msg.db'));
    bd.exec('PRAGMA busy_timeout = 5000');
    const marque = bd.prepare('UPDATE message SET supprime_le = ? WHERE conv = ? AND seq = ?').run(Date.now(), gd, pd4m.j.seq);
    bd.close();
    v('⛔ un message marqué « supprimé » dont la ligne de pièce est encore là : la pièce ne se lit plus (ni par Bruno ni par son auteur)', [Number(marque.changes), ligne4(pd4), (await lire(B4, pd4)).code, (await lire(A4, pd4)).code], [1, 1, 404, 404]);
    svc4.avancer(25 * 3600000);
    v('⛔ un message éphémère échu que le balayeur n\'a PAS ôté (sa photo est encore en base) : elle ne se lit plus, même par son auteur', [ligne4(pe4), (await lire(B4, pe4)).code, (await lire(A4, pe4)).code], [1, 404, 404]);
    v('⛔ une pièce déposée il y a 25 h et jamais envoyée, encore en base : elle ne se lit plus, même par son dépositaire', [ligne4(po4), (await lire(A4, po4)).code], [1, 404]);
    v('⛔ une photo de profil déposée il y a 25 h et jamais posée, encore en base : elle ne se lit plus, même par son dépositaire', [ligne4(av4), (await lire(A4, av4)).code], [1, 404]);
    const mEch = await envoyer(A4, gd, { type: 'photo', pieces: [{ id: po4, w: 8, h: 8 }] });
    v('⛔ …et elle ne s\'attache plus : 404 piece_inconnue (c\'est l\'échéance qui refuse, pas le balayeur), et la ligne est toujours là', [mEch.code, mEch.j.error, ligne4(po4)], [404, 'piece_inconnue', 1]);
    svc4.avancer(-25 * 3600000);
    const frais = await photo(A4, gd), mFrais = await envoyer(A4, gd, { type: 'photo', pieces: [{ id: frais, w: 8, h: 8 }] });
    v('contre-épreuve : une pièce déposée À L\'HEURE s\'attache et se lit (le refus ci-dessus vient bien de l\'échéance)', [mFrais.code, (await lire(B4, frais)).code], [201, 200]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await svc4.arreter();

  /* ═══ 10. UNE IMAGE « BOURRÉE » DE MORCEAUX VIDES : REFUSÉE, ET LE SERVICE NE BOUGE PAS (relecture du gardien, B1) ═══════════════════════════════════ */
  console.log('\nUne image « bourrée » (11,6 Mo, 2,9 millions de segments vides), quatre dépôts en même temps d\'un seul compte : refusés, le service ne bouge pas (B1)');
  /* ⛔ Réglages PAR DÉFAUT du service (photo 12 Mo, 96 Mo de mémoire d'images) : c'est là que l'attaque jouait. Avant le correctif : les quatre dépôts ACCEPTÉS (201) et rangés, le processus de 92 à
     1 215 Mo (l'unité plafonne à 1 Go), `/health` gelé 3,7 s. On mesure le processus du service lui-même (/proc), pas le banc. */
  const svc5 = await T.lancerService({ urlGestion: og.url, horloge: true, config: { pieces: { memoireImages: 108 * 1048576 }, quotas: { piece: { max: 1000, fenetreMs: 3600000 } } } });   // 108 Mo : quatre dépôts de 12 Mo (24 Mo chacun) y tiennent, il reste 12 Mo
  try {
    const A5 = await compte('alice', svc5), B5 = await compte('bruno', svc5), C5 = await compte('carla', svc5);
    await lienContact(A5, B5); await lienContact(A5, C5); await lienContact(B5, C5);
    const g5 = await groupe(A5, 'Images', [B5, C5]);
    const rssDe = (pid) => { try { return Math.round(parseInt(fs.readFileSync('/proc/' + pid + '/status', 'utf8').match(/VmRSS:\s+(\d+)/)[1], 10) / 1024); } catch (e) { return -1; } };
    const lignes5 = () => { const d = T.lireBase(path.join(svc5.data, 'msg.db')); try { return d.prepare('SELECT COUNT(*) AS n FROM piece').get().n; } finally { d.close(); } };
    const pid = svc5.enfant.pid, bourre = F.jpegBourre(2900000), depart = rssDe(pid);
    vrai('population : le JPEG bourré pèse plus de 11 Mo, le service tourne (' + depart + ' Mo) et ne porte aucune pièce', bourre.length > 11 * 1048576 && depart > 0 && lignes5() === 0);
    let pic = depart; const lat = [];
    const releve = setInterval(() => { pic = Math.max(pic, rssDe(pid)); }, 25);
    const sonde = setInterval(async () => { const t = Date.now(); try { await fetch(svc5.base + '/health'); lat.push(Date.now() - t); } catch (e) { /* ne répond pas : pas de mesure */ } }, 50);
    const rs = await Promise.all([1, 2, 3, 4].map(() => deposer(A5, { conv: g5, genre: 'photo', corps: bourre })));
    clearInterval(releve); clearInterval(sonde);
    v('⛔ quatre dépôts en parallèle d\'un seul compte : les quatre sont REFUSÉS (415 type_refuse), aucun n\'est rangé', [rs.map(r => r.code), rs.map(r => r.j && r.j.error), lignes5()], [[415, 415, 415, 415], Array(4).fill('type_refuse'), 0]);
    vrai('⛔ le service ne bouge pas : le processus gagne moins de 300 Mo (avant : +1 120 Mo, tué par l\'unité) — départ ' + depart + ' Mo, pic ' + pic + ' Mo', pic - depart < 300);
    vrai('⛔ …et la boucle n\'est pas gelée : /health répond en moins de 1,5 s pendant les dépôts (avant : 3,7 s) — ' + lat.length + ' mesures, la plus lente ' + Math.max(0, ...lat) + ' ms', lat.length >= 1 && Math.max(...lat) < 1500);

    /* 10 bis : la réserve de mémoire d'images est presque PLEINE (quatre dépôts de 12 Mo annoncés = 4 x 24 Mo = 96 Mo sur 108) : une photo de 7 Mo (14 Mo à réserver) reçoit un 429 « dans un instant »
       alors qu'une petite image passe encore, et la grosse passe quand la réserve se libère */
    const tete = F.jpeg().subarray(0, 40);                                               // la signature JPEG suffit : le type est jugé sur les premiers octets, la réserve se prend ensuite
    const tenir = (c) => {
      const sk = net.connect(svc5.port, '127.0.0.1', () => {
        sk.write('POST /api/pieces?conv=' + g5 + '&genre=photo HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc5.base + '\r\nX-OPM: 1\r\nCookie: ' + c.enteteCookie() + '\r\nContent-Type: application/octet-stream\r\nContent-Length: ' + (12 * 1048576) + '\r\nConnection: close\r\n\r\n');
        sk.write(tete);
      });
      sk.on('error', () => {});
      sk.reponse = ''; sk.on('data', (d) => { sk.reponse += d; });
      return sk;
    };
    const tenus = [tenir(A5), tenir(A5), tenir(B5), tenir(B5)];
    await T.dort(500);          // les quatre dépôts retenus ont lu leur début et réservé AVANT que le suivant n'arrive : s'il passait devant, il tiendrait la mémoire que le quatrième réclame (vérifié plus bas)
    const grosse = F.jpeg({ donnees: Buffer.alloc(7 * 1048576, 0x12) }), petite = F.jpeg();
    vrai('population : la grosse photo pèse 7 Mo (14 Mo à réserver, il en reste 12), la petite quelques centaines d\'octets', grosse.length > 7 * 1048576 && grosse.length < 7.1 * 1048576 && petite.length < 1000);
    const envoi = (corps) => deposer(C5, { conv: g5, genre: 'photo', corps });
    let refus = null;
    for (let k = 0; k < 60 && !(refus && refus.code === 429); k++) { refus = await envoi(grosse); if (refus.code !== 429) await T.dort(100); }
    v('⛔ la réserve est presque pleine : la photo de 7 Mo est refusée TOUT DE SUITE, 429 « dans un instant » (portee simultane, Retry-After 2)', [refus.code, refus.j.error, refus.j.portee, refus.h.get('retry-after'), refus.j.retry], [429, 'quota_atteint', 'simultane', '2', 2]);
    v('…alors qu\'une petite image passe encore (c\'est de la MÉMOIRE qui manque, pas un refus général)', (await envoi(petite)).code, 201);
    vrai('population : les quatre dépôts retenus tiennent toujours — aucun n\'a reçu de réponse (sinon la réserve n\'était pas pleine pour la bonne raison)', tenus.every((sk) => sk.reponse === ''));
    for (const sk of tenus) sk.destroy();
    vrai('⛔ les dépôts abandonnés RENDENT la réserve : la photo de 7 Mo passe (201) dès qu\'ils sont coupés', await att(async () => (await envoi(grosse)).code === 201, 10000));
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await svc5.arreter();

  /* ═══ 11. UN ENVOI LENT NE TIENT PAS UNE PLACE (relecture du gardien, A4) ═════════════════════════════════════════════════════ */
  console.log('\nUn envoi qui n\'avance pas rend sa place : 408 « delai_depasse », la place et la réservation de quota rendues, la réponse lue même si le client continue d\'envoyer (A4)');
  /* ⛔ Sans tampon devant le service (Caddy, accès direct), un envoi qui annonce 25 Mo et en envoie un octet par seconde tenait une des places — et une des « par personne » — 300 s. Ici : 64 Ko/s
     après 30 s en production, 100 Ko/s après 0,8 s pour le banc. */
  const svc6 = await T.lancerService({ urlGestion: og.url, horloge: true, config: { pieces: { depotGraceMs: 800, depotDebitMin: 100000, parPersonne: 2, simultanes: 4, quotaPersonne: 400000, fichierMax: 300000, bloc: 4096 }, quotas: { piece: { max: 1000, fenetreMs: 3600000 } } } });
  try {
    const A6 = await compte('alice', svc6), B6 = await compte('bruno', svc6);
    await lienContact(A6, B6);
    const g6 = await groupe(A6, 'Lents', [B6]);
    const lignes6 = () => { const d = T.lireBase(path.join(svc6.data, 'msg.db')); try { return d.prepare('SELECT COUNT(*) AS n FROM piece').get().n; } finally { d.close(); } };
    /* un client brut : les en-têtes, `premiers` octets, puis (en option) un octet par `goutte` ms pendant `duree` ms — et il lit la réponse quand elle vient */
    const brut6 = (c, { taille, premiers = 100, goutte = 0, duree = 0, nom = 'lent.bin' }) => new Promise((ok) => {
      const t0 = Date.now(); let rep = '', fermee = false, t408 = null;
      const s = net.connect(svc6.port, '127.0.0.1', () => {
        s.write('POST /api/pieces?' + new URLSearchParams({ conv: g6, genre: 'fichier' }) + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc6.base + '\r\nX-OPM: 1\r\nX-OPM-Nom: ' + nom + '\r\nCookie: ' + c.enteteCookie() + '\r\nContent-Type: application/octet-stream\r\nContent-Length: ' + taille + '\r\n\r\n');
        s.write(Buffer.alloc(premiers, 3));
        if (goutte) { const i = setInterval(() => { if (fermee || Date.now() - t0 > duree) return clearInterval(i); try { s.write(Buffer.alloc(1, 4)); } catch (e) { clearInterval(i); } }, goutte); }
      });
      s.on('data', (d) => { rep += d; if (t408 === null && /HTTP\/1\.1 \d{3}/.test(rep)) t408 = Date.now() - t0; });
      const fin = () => { if (fermee) return; fermee = true; ok({ rep, ms: Date.now() - t0, reponduEn: t408 }); };
      s.on('close', fin); s.on('error', fin);
      setTimeout(() => { try { s.destroy(); } catch (e) { /* déjà fermée */ } fin(); }, 12000).unref();
    });
    const code6 = (r) => (/^HTTP\/1\.1 (\d{3})/.exec(r.rep) || [])[1];
    const l1 = await brut6(A6, { taille: 300000, goutte: 100, duree: 2500 });
    v('⛔ un envoi qui annonce 300 000 octets et en envoie UN par dixième de seconde : 408 delai_depasse, lu par le client qui CONTINUE d\'envoyer (la réponse n\'est pas effacée par une coupure de la connexion)', [code6(l1), /"error":"delai_depasse"/.test(l1.rep), /connection: close/i.test(l1.rep)], ['408', true, true]);
    vrai('   …entre la grâce (0,8 s) et quelques secondes de plus — pas le délai de Node (' + l1.reponduEn + ' ms avant la réponse, ' + l1.ms + ' ms avant la fermeture)', l1.reponduEn >= 700 && l1.reponduEn < 4000 && l1.ms < 9000);
    /* la place ET la réservation sont rendues : « par personne » vaut 2 et le quota 400 000 pour des envois annoncés de 300 000 */
    const suite = [];
    for (let k = 0; k < 3; k++) suite.push(code6(await brut6(A6, { taille: 300000 })));
    v('⛔ trois envois lents de suite du même compte (2 places « par personne », quota de 400 000 pour 300 000 annoncés) : trois 408 — ni 429 « simultane » ni 402 « stockage », donc la place et la réservation ont été RENDUES', suite, ['408', '408', '408']);
    const [pa, pb] = await Promise.all([brut6(A6, { taille: 150000 }), brut6(A6, { taille: 150000 })]);
    v('…deux en même temps (le maximum « par personne » ; 150 000 annoncés chacun, car le quota réserve les tailles ANNONCÉES) : deux 408', [code6(pa), code6(pb)], ['408', '408']);
    v('   la personne n\'a rien d\'utilisé : ses envois coupés n\'ont rien rangé', [(await A6.get('/api/moi/stockage')).j.utilise, lignes6()], [0, 0]);
    /* un envoi qui part vite puis s'arrête : le crédit de la grâce s'use, puis il est coupé */
    const l4 = await brut6(A6, { taille: 300000, premiers: 30000 });
    v('⛔ 30 000 octets d\'un coup puis plus rien : coupé aussi, un peu plus tard qu\'un envoi qui n\'a rien donné (le crédit de la grâce)', [code6(l4), l4.reponduEn >= 800 && l4.reponduEn < 4500], ['408', true]);
    /* contre-épreuve : un envoi honnête mais lent (6 morceaux de 50 000 octets espacés de 100 ms, ~500 Ko/s) passe */
    const idHonnete = await new Promise((ok) => {
      const corps = crypto.randomBytes(300000); let rep = '';
      const s = net.connect(svc6.port, '127.0.0.1', async () => {
        s.write('POST /api/pieces?' + new URLSearchParams({ conv: g6, genre: 'fichier' }) + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: ' + svc6.base + '\r\nX-OPM: 1\r\nX-OPM-Nom: honnete.bin\r\nCookie: ' + A6.enteteCookie() + '\r\nContent-Type: application/octet-stream\r\nContent-Length: 300000\r\nConnection: close\r\n\r\n');
        for (let i = 0; i < 300000; i += 50000) { await T.dort(100); s.write(corps.subarray(i, i + 50000)); }
      });
      s.on('data', (d) => { rep += d; }); s.on('close', () => ok(rep)); s.on('error', () => ok(rep));
    });
    v('⛔ contre-épreuve : un envoi lent mais au-dessus du débit minimal (6 morceaux de 50 000 octets espacés de 100 ms) passe : 201', /^HTTP\/1\.1 201/.test(idHonnete), true);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await svc6.arreter();

  /* ═══ 12. UN LECTEUR LENT NE TIENT PAS UN FICHIER OUVERT (relecture du gardien, A2) ═══════════════════════════════════════════ */
  console.log('\nUn lecteur qui ne lit plus, ou qui lit un filet, est coupé : le fichier ouvert et la connexion sont rendus (A2)');
  /* ⛔ Chaque lecture garde DEUX descripteurs (la connexion et le fichier). On les compte dans /proc, sur le processus du service lui-même. Avant : un client qui cessait de lire les gardait pour toujours.
     DEUX services, un butoir chacun : l'autre est réglé à une heure. Un lecteur « lent » qui lit par à-coups voit son `drain` arriver par salves (la fenêtre TCP ne se rouvre pas octet par octet) :
     les deux butoirs dans un même service s'éclipsaient l'un l'autre, et retirer l'un ne faisait tomber que ce que l'autre laissait voir. */
  const nbFd = (pid) => { try { return fs.readdirSync('/proc/' + pid + '/fd').length; } catch (e) { return -1; } };
  const grosCorps = crypto.randomBytes(48 * 1048576), sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
  const monter12 = async (cfgPieces) => {
    const sv = await T.lancerService({ urlGestion: og.url, horloge: true, config: { pieces: Object.assign({ fichierMax: 48 * 1048576 }, cfgPieces), quotas: { piece: { max: 1000, fenetreMs: 3600000 } } } });
    const A = await compte('alice', sv), B = await compte('bruno', sv);
    await lienContact(A, B);
    const g = await groupe(A, 'Gros', [B]);
    const dep = await deposer(A, { conv: g, genre: 'fichier', nom: 'gros.bin', corps: grosCorps });
    const m = await envoyer(A, g, { type: 'fichier', piece: dep.j.id });
    const get = 'GET /api/pieces/' + dep.j.id + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nCookie: ' + B.enteteCookie() + '\r\nConnection: close\r\n\r\n';
    return { sv, A, B, id: dep.j.id, deposOk: dep.code === 201 && m.code === 201, get, pid: sv.enfant.pid };
  };
  const entier12 = async (X) => { const e = await lire(X.B, X.id); return [e.code, e.buf.length, sha(e.buf) === sha(grosCorps)]; };

  /* a. l'ATTENTE : des lecteurs qui ne lisent rien */
  const X7 = await monter12({ lectureAttenteMs: 1500, lectureMaxMs: 3600000 });
  try {
    vrai('population : le fichier de 48 Mo est déposé et envoyé, et le processus du service a des descripteurs à compter (' + nbFd(X7.pid) + ')', X7.deposOk && nbFd(X7.pid) > 5);
    const base7 = nbFd(X7.pid);
    const geles = [0, 1, 2].map(() => { const s = net.connect(X7.sv.port, '127.0.0.1', () => s.write(X7.get)); s.on('error', () => {}); return s; });
    await T.dort(300);
    const pendant = nbFd(X7.pid);
    vrai('population : trois lecteurs gelés tiennent chacun une connexion ET un fichier (' + base7 + ' descripteurs avant, ' + pendant + ' pendant)', pendant - base7 >= 6);
    let apres = pendant; const t0 = Date.now();
    while (Date.now() - t0 < 8000 && apres > base7 + 1) { await T.dort(100); apres = nbFd(X7.pid); }
    v('⛔ au bout de l\'attente permise (1,5 s) le service les COUPE et rend les descripteurs (' + (Date.now() - t0) + ' ms)', apres <= base7 + 1, true);
    vrai('   …et le journal le dit : « piece_lecture_coupee » pour cause d\'attente (sans identifiant ni nom)', /"evt":"piece_lecture_coupee","motif":"attente"/.test(X7.sv.sortie.texte()) && !/piece_lecture_coupee[^\n]*f_[0-9a-f]{32}/.test(X7.sv.sortie.texte()));
    for (const s of geles) s.destroy();
    v('⛔ contre-épreuve : un lecteur ordinaire reçoit les 48 Mo, octet pour octet (l\'attente ne touche que ceux qui ne lisent plus)', await entier12(X7), [200, 48 * 1048576, true]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await X7.sv.arreter();

  /* b. la DURÉE : un lecteur qui lit un filet, jamais arrêté assez longtemps pour être gelé */
  const X8 = await monter12({ lectureAttenteMs: 3600000, lectureMaxMs: 5000 });
  try {
    const base8 = nbFd(X8.pid);
    let recu = 0;
    const filet = net.connect(X8.sv.port, '127.0.0.1', () => filet.write(X8.get));
    filet.on('error', () => {});
    filet.on('data', (d) => { recu += d.length; filet.pause(); setTimeout(() => filet.resume(), 200); });
    await T.dort(2500);
    const enCours = nbFd(X8.pid), recuA = recu;
    vrai('population : à mi-chemin le lecteur-filet lit encore (' + Math.round(recuA / 1024) + ' Ko reçus) et le service tient sa connexion et son fichier (' + base8 + ' → ' + enCours + ' descripteurs)', recuA > 0 && enCours - base8 >= 2);
    await T.dort(4500);
    const apres8 = nbFd(X8.pid);
    v('⛔ passé le plafond de durée d\'une lecture (5 s), le service coupe même celui qui lit « juste assez vite » : descripteurs rendus, fichier loin d\'être arrivé (' + Math.round(recu / 1048576) + ' Mo sur 48)', [apres8 <= base8 + 1, recu < 48 * 1048576], [true, true]);
    vrai('   …et le journal le dit : cause « duree »', /"evt":"piece_lecture_coupee","motif":"duree"/.test(X8.sv.sortie.texte()));
    filet.destroy();
    v('⛔ contre-épreuve : un lecteur ordinaire reçoit les 48 Mo, octet pour octet, bien avant le plafond', await entier12(X8), [200, 48 * 1048576, true]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  await X8.sv.arreter();

  fs.rmSync(bac, { recursive: true, force: true });
  await svc.arreter(); await og.fermer();
  fin();
})();

function jeton(b, c) { return b.includes(Buffer.from(c, 'latin1')); }
