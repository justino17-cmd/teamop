/* ⛔ CE QUE CE FICHIER GARDE — UN GROS FICHIER PASSE, AVEC LES RÉGLAGES DE DÉPART (famille 3 : le VRAI service, en HTTP).

   Justin, 6 octobre 2026, capture à l'appui (« Ce fichier est trop lourd ») : « je voulais que tout le monde puisse envoyer autant de fichiers, avec les poids qu'ils veulent ».
   Le maximum d'un fichier passe de 25 Mo à 2 Go (comme WhatsApp), l'espace d'une personne de 2 Go à 20 Go, et une lecture entière a deux heures.

   `test-943` joue les pièces avec des maximums RÉDUITS exprès (quelques centaines de Ko) : il ne peut pas voir qu'avec la configuration de départ — celle du VPS — un fichier de
   40 Mo était refusé. Celui-ci lance le service SANS réglage de pièces et vérifie :
     · `/api/config` annonce 2 Go par fichier et 20 Go d'espace (la page refuse AVANT d'envoyer d'après ces chiffres : un maximum oublié côté service se verrait ici) ;
     · un fichier de 40 Mo se dépose (201), part dans une conversation, et l'autre le relit OCTET POUR OCTET ;
     · une annonce au-delà de 2 Go est refusée tout de suite (413 avec le maximum), sans qu'un octet soit lu ;
     · le délai de requête de Node ne coupe plus un envoi long (`requestTimeout` : six heures, lu sur le fichier réel).
   La partie proxy (nginx/Caddy laissent passer ce maximum) est gardée par `test-931`, qui compare `piecesConfig()` aux deux fichiers de proxy. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
const Mo = 1048576;

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Banc', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Banc', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url });
  try {
    const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234'), B = await T.connecter(svc, og, 'bruno', 'pw-bruno-1234');
    const l = await A.post('/api/contacts/lien', { max: 1 }); await B.post('/api/liens/accepter', { code: l.j.code });
    const conv = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;

    console.log('\n1. Les maximums de départ, annoncés à la page');
    const cfg = (await A.get('/api/config')).j;
    v('/api/config : 2 Go par fichier, 20 Go d\'espace par personne (une photo reste à 12 Mo : la page la réduit avant l\'envoi)', [cfg.limites.pieces.fichier_max, cfg.limites.pieces.quota, cfg.limites.pieces.photo_max], [2048 * Mo, 20480 * Mo, 12 * Mo]);
    const st = (await A.get('/api/moi/stockage')).j;
    v('/api/moi/stockage : le maximum de l\'espace est 20 Go', st.max, 20480 * Mo);

    console.log('\n2. Un fichier de 40 Mo — refusé avant le 6 octobre 2026 (25 Mo au plus)');
    const corps = crypto.randomBytes(40 * Mo);
    const d = await F.deposer(A, { conv, genre: 'fichier', nom: 'video-chantier.mov', corps });
    v('le dépôt répond 201 et range les 40 Mo', [d.code, d.j && d.j.taille], [201, corps.length]);
    const m = await A.post('/api/conversations/' + conv + '/messages', { cid: 'cid-' + crypto.randomBytes(6).toString('hex'), type: 'fichier', piece: d.j.id });
    v('il part dans la conversation (201)', m.code, 201);
    const lu = await F.lirePiece(B, d.j.id);
    v('l\'autre le relit en entier, octet pour octet', [lu.code, lu.buf.length, crypto.createHash('sha256').update(lu.buf).digest('hex') === crypto.createHash('sha256').update(corps).digest('hex')], [200, corps.length, true]);

    console.log('\n3. Au-delà de 2 Go : refusé tout de suite, sans lire');
    const t0 = Date.now();
    const r = await F.deposerBrut(A, { chemin: '/api/pieces?conv=' + conv + '&genre=fichier', entetes: { 'Content-Length': String(2048 * Mo + 1), 'X-OPM-Nom': 'trop.bin' }, delaiMs: 8000 });
    v('2 Go + 1 octet annoncés : 413 piece_trop_lourde, avec le maximum (2 Go)', [r.code, r.j && r.j.error, r.j && r.j.max], [413, 'piece_trop_lourde', 2048 * Mo]);
    vrai('…et la réponse arrive sans attendre le corps (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 4000);

    console.log('\n4. Le délai de requête de Node ne coupe plus un envoi long');
    const src = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'index.js'), 'utf8'));
    vrai('server.requestTimeout vaut six heures (300 s par défaut coupaient un fichier de 2 Go envoyé derrière Caddy)', /server\.requestTimeout = 6 \* 3600000;/.test(src));
  } finally {
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
