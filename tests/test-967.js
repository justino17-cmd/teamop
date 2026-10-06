/* ⛔ CE QUE CE FICHIER GARDE — UN GROS FICHIER PASSE, AVEC LES RÉGLAGES DE DÉPART (famille 3 : le VRAI service, en HTTP).

   Justin, 6 octobre 2026, capture à l'appui (« Ce fichier est trop lourd ») : « je voulais que tout le monde puisse envoyer autant de fichiers, avec les poids qu'ils veulent ».
   Le maximum d'un fichier passe de 25 Mo à 5 Go (« je veux 5 Go », le même soir), l'espace d'une personne de 2 Go à 50 Go, et une lecture entière a six heures.

   `test-943` joue les pièces avec des maximums RÉDUITS exprès (quelques centaines de Ko) : il ne peut pas voir qu'avec la configuration de départ — celle du VPS — un fichier de
   40 Mo était refusé. Celui-ci lance le service SANS réglage de pièces et vérifie :
     · `/api/config` annonce 5 Go par fichier et 50 Go d'espace (la page refuse AVANT d'envoyer d'après ces chiffres : un maximum oublié côté service se verrait ici) ;
     · un fichier de 40 Mo se dépose (201), part dans une conversation, et l'autre le relit OCTET POUR OCTET ;
     · une annonce au-delà de 5 Go est refusée tout de suite (413 avec le maximum), sans qu'un octet soit lu ;
     · le délai de requête de Node ne coupe plus un envoi long : il se DÉDUIT du maximum et de la garde de débit (lu sur le fichier réel) ;
     · mais un corps ORDINAIRE envoyé au compte-gouttes est coupé en trente secondes, et un LECTEUR qui ne lit plus est coupé au débit minimal (relecture du gardien : joués, pas lus).
   La partie proxy (nginx/Caddy laissent passer ce maximum) est gardée par `test-931`, qui compare `piecesConfig()` aux deux fichiers de proxy. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), net = require('net');
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
    v('/api/config : 5 Go par fichier, 50 Go d\'espace par personne (une photo reste à 12 Mo : la page la réduit avant l\'envoi)', [cfg.limites.pieces.fichier_max, cfg.limites.pieces.quota, cfg.limites.pieces.photo_max], [5120 * Mo, 51200 * Mo, 12 * Mo]);
    const st = (await A.get('/api/moi/stockage')).j;
    v('/api/moi/stockage : le maximum de l\'espace est 50 Go', st.max, 51200 * Mo);

    console.log('\n2. Un fichier de 40 Mo — refusé avant le 6 octobre 2026 (25 Mo au plus)');
    const corps = crypto.randomBytes(40 * Mo);
    const d = await F.deposer(A, { conv, genre: 'fichier', nom: 'video-chantier.mov', corps });
    v('le dépôt répond 201 et range les 40 Mo', [d.code, d.j && d.j.taille], [201, corps.length]);
    const m = await A.post('/api/conversations/' + conv + '/messages', { cid: 'cid-' + crypto.randomBytes(6).toString('hex'), type: 'fichier', piece: d.j.id });
    v('il part dans la conversation (201)', m.code, 201);
    const lu = await F.lirePiece(B, d.j.id);
    v('l\'autre le relit en entier, octet pour octet', [lu.code, lu.buf.length, crypto.createHash('sha256').update(lu.buf).digest('hex') === crypto.createHash('sha256').update(corps).digest('hex')], [200, corps.length, true]);

    console.log('\n3. Au-delà de 5 Go : refusé tout de suite, sans lire');
    const t0 = Date.now();
    const r = await F.deposerBrut(A, { chemin: '/api/pieces?conv=' + conv + '&genre=fichier', entetes: { 'Content-Length': String(5120 * Mo + 1), 'X-OPM-Nom': 'trop.bin' }, delaiMs: 8000 });
    v('5 Go + 1 octet annoncés : 413 piece_trop_lourde, avec le maximum (5 Go)', [r.code, r.j && r.j.error, r.j && r.j.max], [413, 'piece_trop_lourde', 5120 * Mo]);
    vrai('…et la réponse arrive sans attendre le corps (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 4000);

    console.log('\n4. Le délai de requête de Node ne coupe plus un envoi long');
    const src = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'index.js'), 'utf8'));
    vrai('server.requestTimeout se déduit du maximum et du débit minimal (300 s par défaut coupaient un gros fichier)', /server\.requestTimeout = Math\.ceil\(config\.pieces\.fichierMax \/ config\.pieces\.depotDebitMin\) \* 1000 \+ config\.pieces\.depotGraceMs;/.test(src));

    console.log('\n5. Un corps ORDINAIRE envoyé au compte-gouttes est coupé (relecture du gardien, A1) — le délai de 22 h ne vaut que pour une pièce');
    {
      const s2 = await T.lancerService({ urlGestion: og.url, config: { corpsLentMs: 1500 } });
      try {
        const u = new URL(s2.base);
        const goutte = () => new Promise((ok) => {
          const sock = net.connect(+u.port, u.hostname); let ferme = false, t0 = Date.now();
          sock.on('close', () => { ferme = true; ok(Date.now() - t0); }); sock.on('error', () => {});
          sock.write('POST /api/contacts/lien HTTP/1.1\r\nHost: ' + u.host + '\r\nContent-Type: application/json\r\nContent-Length: 60000\r\n\r\n{');
          const iv = setInterval(() => { if (ferme) return clearInterval(iv); sock.write(' '); }, 300);
          setTimeout(() => { clearInterval(iv); if (!ferme) { sock.destroy(); ok(-1); } }, 8000);
        });
        const d = await goutte();
        vrai('⛔ un POST qui annonce 60 Ko et en envoie un octet toutes les 300 ms : la connexion est FERMÉE par le service (' + d + ' ms, délai réglé à 1,5 s) — pas tenue 22 h', d > 0 && d < 5000);
        const A2 = await T.connecter(s2, og, 'alice', 'pw-alice-1234');
        const ln = await A2.post('/api/contacts/lien', { max: 1 });
        vrai('contre-épreuve : un corps normal passe (le lien de contact se crée : ' + ln.code + ')', ln.code === 200 || ln.code === 201);
      } finally { await s2.arreter(); }
    }

    console.log('\n6. Un LECTEUR qui ne lit plus est coupé (relecture du gardien, A2) — une lecture a six heures, pas un lecteur arrêté');
    {
      const s3 = await T.lancerService({ urlGestion: og.url, config: { pieces: { lectureDebitMin: 1024 * 1024, lectureAttenteMs: 8000 }, quotas: { piece: { max: 1000, fenetreMs: 3600000 } } } });
      try {
        const A3 = await T.connecter(s3, og, 'alice', 'pw-alice-1234'), B3 = await T.connecter(s3, og, 'bruno', 'pw-bruno-1234');
        const l3 = await A3.post('/api/contacts/lien', { max: 1 }); await B3.post('/api/liens/accepter', { code: l3.j.code });
        const c3 = (await A3.post('/api/conversations/directe', { uid: B3.moi.id })).j.conversation.id;
        const gros = crypto.randomBytes(40 * Mo);
        const d3 = await F.deposer(A3, { conv: c3, genre: 'fichier', nom: 'gros.bin', corps: gros });
        vrai('population : 40 Mo déposés', d3.code === 201);
        const u = new URL(s3.base);
        /* un lecteur AU COMPTE-GOUTTES : un morceau, puis 400 ms de pause, et ainsi de suite — assez souvent pour que la connexion se vide avant l'attente (800 ms, la garde d'avant ne le
           voit jamais : 8 s ici), trop peu pour le débit minimal (1 Mo/s ici). C'est le cas du gardien : un lecteur qui se vide « un peu toutes les 29 s » tenait six heures. */
        const fige = () => new Promise((ok) => {
          const sock = net.connect(+u.port, u.hostname); let recu = 0, fini = false, premier = true;
          const fin = (x) => { if (fini) return; fini = true; ok(x); };
          sock.on('data', (c) => { recu += c.length; premier = false; sock.pause(); setTimeout(() => { if (!fini) sock.resume(); }, 400); });
          sock.on('close', () => fin({ recu })); sock.on('error', () => {});
          sock.write('GET /api/pieces/' + d3.j.id + ' HTTP/1.1\r\nHost: ' + u.host + '\r\nCookie: ' + A3.enteteCookie() + '\r\nConnection: close\r\n\r\n');
          setTimeout(() => { sock.destroy(); fin({ recu, delai: true }); }, 22000);
        });
        const r = await fige();
        /* ⛔ ce que reçoit le lecteur ne tranche pas (les tampons de la boucle locale tiennent plusieurs Mo, coupé ou non il lit le même filet) : c'est le SERVICE qui le dit, dans son journal */
        await T.attendre(() => /"evt":"piece_lecture_coupee","motif":"(lent|attente)"/.test(s3.sortie.texte()), 25000, 100);
        const motif = (/"evt":"piece_lecture_coupee","motif":"([a-z]+)"/.exec(s3.sortie.texte()) || [])[1] || 'aucun';
        /* ⚠️ sur la boucle locale, les tampons du noyau (plusieurs Mo) retardent le « drain » au-delà de l'attente : c'est elle qui coupe la première ici, avant le seau. Le seau lui-même
           (une avance ne se capitalise pas) est la MÊME fonction que celle du dépôt, éprouvée à horloge fausse par test-942 ; ce banc garde que le lecteur est bien coupé PAR LE SERVICE. */
        vrai('⛔ un lecteur au compte-gouttes est COUPÉ par le service — le journal le dit (« ' + motif + ' », ' + Math.round(r.recu / 1048576) + ' Mo reçus sur 40)', motif === 'lent' || motif === 'attente');
        const entier = await F.lirePiece(A3, d3.j.id);
        v('contre-épreuve : un lecteur qui lit normalement reçoit les 40 Mo entiers', [entier.code, entier.buf.length], [200, gros.length]);
      } finally { await s3.arreter(); }
    }
  } finally {
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
