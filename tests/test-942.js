/* ⛔ CE QUE CE FICHIER GARDE — LE MODULE DES PIÈCES SEUL (`server-msg/pieces.js`) : scellage par blocs, types jugés aux octets, métadonnées retirées, quota.

   Ce banc ne lance ni service ni navigateur : il joue le module avec des octets fabriqués (`tests/outils-pieces.js`). Le câblage — que ces
   pièces atteignent bien le disque d'un vrai service, qu'une route les refuse — est `tests/test-943.js`.

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · LE TYPE SE JUGE AUX OCTETS : un SVG, un HTML, un PDF ne passent jamais pour une photo ; un JPEG ne passe pas pour un vocal ; un « fichier » n'est
       jamais servi en ligne, même s'il a la signature d'un JPEG ;
     · LES MÉTADONNÉES SONT RETIRÉES, et chaque ⛔ « absent » est précédé de sa population (le canari ÉTAIT dans ce qu'on a envoyé) ;
     · LE SCELLAGE EST PAR BLOCS ET LIE CHAQUE BLOC À SA PLACE : un bloc recopié d'une autre pièce, deux blocs permutés, un fichier tronqué à une
       frontière de bloc, un en-tête qui ment — tous refusés (`piece_corrompue`), jamais rendus tels quels ;
     · `Range` NE DÉCHIFFRE QUE LES BLOCS TOUCHÉS (un bloc abîmé plus loin ne gêne pas la lecture d'une plage qui ne le touche pas) ;
     · UN ENVOI QUI DÉPASSE S'ARRÊTE AU FIL DE L'EAU (on compte les octets pris au flux : il est infini) ;
     · UNE IMAGE « BOURRÉE » DE MILLIONS DE MORCEAUX VIDES EST REFUSÉE (plafond de segments), SANS MÉMOIRE NI BOUCLE, et les images en cours de nettoyage se partagent un plafond GLOBAL de mémoire ;
     · UN ENVOI INTERROMPU NE LAISSE RIEN sous le nom de la pièce ;
     · DEUX ENVOIS EN MÊME TEMPS NE DÉPASSENT PAS LE QUOTA ENSEMBLE. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
const P = require(path.join(T.SERVICE, 'pieces.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-942-'));
const kek = crypto.randomBytes(32), scelleur = creerScelleur(kek);
const cleDe = (g, id) => scelleur.deriver(g, 'piece', 'bloc', id);
const nouvelId = () => 'f_' + crypto.randomBytes(16).toString('hex');
let n = 0;
const neuf = (opts = {}) => { const d = path.join(bac, 'p' + (++n)); fs.mkdirSync(d, { recursive: true }); return P.creerPieces(Object.assign({ dossier: d, cle: cleDe }, opts)); };
const lireTout = async (pc, id, d, f) => { const o = []; for await (const b of pc.lire(id, d, f)) o.push(b); return Buffer.concat(o); };
const attrape = async (p) => { try { await p; return null; } catch (e) { return e.code || e.message; } };
const jeton = (b, canari) => b.includes(Buffer.from(canari, 'latin1'));

(async () => {
  /* ═══ 1. LES TYPES, JUGÉS AUX OCTETS ═══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('Les types sont jugés sur les premiers octets, jamais sur ce que dit le client');
  {
    const vues = { jpeg: F.jpeg(), png: F.png(), gif87: Buffer.concat([Buffer.from('GIF87a'), Buffer.alloc(20)]), gif89: F.gif(), webp: F.webp(), webm: F.webm(), ogg: F.ogg(), mp4: F.mp4(), mp3id3: F.mp3(), mp3trame: F.mp3Trame(), pdf: F.pdf(), svg: F.svg(), html: F.html(), zip: Buffer.from('PK\x03\x04abcdefghijklmnop', 'latin1'), exe: Buffer.from('MZ\x90\x00abcdefghijklmnop', 'latin1'), texte: Buffer.from('bonjour, voici ma photo'), vide: Buffer.alloc(0), court: Buffer.from([0xFF, 0xD8]) };
    const mime = (genre, k) => { const t = P.detecter(genre, vues[k].subarray(0, 16)); return t ? t.mime : null; };
    vrai('population : dix-huit échantillons d\'octets à juger', Object.keys(vues).length === 18);
    v('⛔ photo : JPEG, PNG, GIF (87a et 89a) et WebP passent, avec LEUR type', ['jpeg', 'png', 'gif87', 'gif89', 'webp'].map(k => mime('photo', k)), ['image/jpeg', 'image/png', 'image/gif', 'image/gif', 'image/webp']);
    v('⛔ photo : un SVG, un HTML, un PDF, un zip, un exécutable, un texte, un son, du vide, deux octets de JPEG ne passent PAS (415)', ['svg', 'html', 'pdf', 'zip', 'exe', 'texte', 'webm', 'mp3id3', 'vide', 'court'].map(k => mime('photo', k)), Array(10).fill(null));
    v('avatar : mêmes règles que la photo', [mime('avatar', 'png'), mime('avatar', 'svg'), mime('avatar', 'mp4')], ['image/png', null, null]);
    v('⛔ vocal : webm, ogg, mp4/m4a et mpeg (ID3 et trame) passent, avec LEUR type', ['webm', 'ogg', 'mp4', 'mp3id3', 'mp3trame'].map(k => mime('vocal', k)), ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/mpeg']);
    v('⛔ vocal : une image, un SVG, un HTML, un PDF, du vide ne passent PAS', ['jpeg', 'png', 'svg', 'html', 'pdf', 'zip', 'vide'].map(k => mime('vocal', k)), Array(7).fill(null));
    v('⛔ vocal : une trame « AAC en ADTS » (couche 00) ou à version réservée n\'est pas prise pour du mpeg', [P.mimeAudio(Buffer.from([0xFF, 0xF1, 0x50, 0x80])), P.mimeAudio(Buffer.from([0xFF, 0xE9, 0x50, 0x80]))], [null, null]);
    v('fichier : n\'importe quoi passe, TOUJOURS en application/octet-stream (même un SVG, même un JPEG)', ['svg', 'html', 'jpeg', 'exe', 'pdf'].map(k => mime('fichier', k)), Array(5).fill('application/octet-stream'));
    v('un genre inconnu ne passe pas', P.detecter('video', vues.png), null);
    vrai('⛔ `detecter` n\'a PAS de paramètre « type annoncé » : le type déclaré par le client ne peut pas être lu (2 paramètres : genre, octets)', P.detecter.length === 2);
    v('⛔ « en ligne » seulement pour une image ou un son jugés aux octets, jamais pour un fichier', [P.enLigne('photo', 'image/png'), P.enLigne('vocal', 'audio/webm'), P.enLigne('avatar', 'image/webp'), P.enLigne('fichier', 'image/png'), P.enLigne('fichier', 'audio/webm'), P.enLigne('photo', 'image/svg+xml'), P.enLigne('photo', 'text/html'), P.enLigne('fichier', 'application/octet-stream')], [true, true, true, false, false, false, false, false]);
  }

  /* ═══ 2. LES MÉTADONNÉES RETIRÉES ══════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLes métadonnées sont retirées côté serveur aussi (JPEG, PNG, WebP) — avec la preuve qu\'elles étaient là');
  {
    const CAN = { exif: 'ZXCANARIQGPS48.8566N', xmp: 'ZXCANARIQXMPAUTEUR', iptc: 'ZXCANARIQIPTCLEGENDE', com: 'ZXCANARIQCOMMENTAIRE', mpf: 'ZXCANARIQMPFAPERCU', apres: 'ZXCANARIQSECONDEIMAGE',
      /* la LISTE BLANCHE (relecture du gardien) : ce qu'une liste de ce qu'on retire laissait passer */
      jfxx: 'ZXCANARIQJFXXMINIATURE', miniature: 'ZXCANARIQJFIFMINIATURE', fpxr: 'ZXCANARIQFLASHPIX', jumbf: 'ZXCANARIQJUMBFC2PA', ducky: 'ZXCANARIQAPP14AUTRE' };
    const entree = F.jpeg({ exif: CAN.exif, xmp: CAN.xmp, iptc: CAN.iptc, com: CAN.com, mpf: CAN.mpf, icc: 'PROFILICC', jfxx: CAN.jfxx, miniature: CAN.miniature, fpxr: CAN.fpxr, jumbf: CAN.jumbf, ducky: CAN.ducky, apres: Buffer.concat([Buffer.from([0xFF, 0xD8]), Buffer.from(CAN.apres), Buffer.from([0xFF, 0xD9])]) });
    vrai('population : les onze canaris (GPS, XMP, IPTC, commentaire, index MPF, seconde image, miniature JFXX, miniature du segment JFIF, FlashPix, JUMBF, APP14 étranger) SONT dans le JPEG envoyé', Object.values(CAN).every(c => jeton(entree, c)));
    const sortie = P.retirerMetadonnees('image/jpeg', entree);
    v('⛔ JPEG : AUCUN des onze canaris n\'est dans ce qui est rangé — les miniatures (JFXX et celle du segment JFIF) qui peuvent montrer l\'image d\'avant une retouche partent avec le reste', Object.entries(CAN).filter(([, c]) => jeton(sortie, c)).map(([k]) => k), []);
    const iJ = sortie.indexOf(Buffer.from('JFIF\0', 'latin1'));
    vrai('⛔ JPEG : le segment JFIF reste, RÉÉCRIT sans miniature (16 octets, miniature 0 x 0) — les densités sont celles d\'origine', iJ > 2 && sortie.readUInt16BE(iJ - 2) === 16 && sortie[iJ + 12] === 0 && sortie[iJ + 13] === 0 && sortie.subarray(iJ + 5, iJ + 12).equals(Buffer.from([1, 1, 0, 0, 1, 0, 1])));
    vrai('⛔ JPEG : seuls restent APP0 JFIF, APP2 ICC_PROFILE et APP14 Adobe — aucun JFXX, aucun FPXR, aucun APP14 étranger, aucun APP1 ni APP11', (() => { const noms = []; let i = 2; while (i < sortie.length && sortie[i] === 0xFF) { const m = sortie[i + 1]; if (m === 0xDA || m === 0xD9) break; noms.push(m.toString(16)); i += 2 + sortie.readUInt16BE(i + 2); } return noms.filter(x => /^e/.test(x)).join(','); })() === 'e0,e2,ee');
    vrai('⛔ JPEG : ce qui compte reste — JFIF, profil de couleur, Adobe (sans lui un CMYK s\'inverse), et les DONNÉES de l\'image (octet bourré FF00 et redémarrage compris) à l\'identique',
      jeton(sortie, 'JFIF') && jeton(sortie, 'ICC_PROFILE') && jeton(sortie, 'Adobe') && sortie.includes(F.JPEG_ENTROPIE));
    vrai('JPEG : commence par SOI, finit par EOI (rien ne suit la fin de l\'image), et est plus court', sortie[0] === 0xFF && sortie[1] === 0xD8 && sortie[sortie.length - 2] === 0xFF && sortie[sortie.length - 1] === 0xD9 && sortie.length < entree.length);
    const sansRien = F.jpeg({ adobe: false });
    v('un JPEG sans aucune métadonnée ressort identique (octet pour octet)', P.retirerMetadonnees('image/jpeg', sansRien).equals(sansRien), true);
    v('⛔ un JPEG tronqué (pas de fin d\'image) est REFUSÉ plutôt que gardé : on ne garantit pas le retrait de ce qu\'on n\'a pas pu parcourir', await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/jpeg', entree.subarray(0, 60)))), 'type_refuse');
    v('⛔ un JPEG dont un segment annonce plus que le fichier est refusé', await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/jpeg', Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE1, 0xFF, 0xF0]), Buffer.alloc(40)])))), 'type_refuse');

    const CP = { texte: 'ZXCANARIQPNGTEXTE', exif: 'ZXCANARIQPNGEXIF', itxt: 'ZXCANARIQPNGITXT', ztxt: 'ZXCANARIQPNGZTXT', apres: 'ZXCANARIQPNGAPRES' };
    const pngIn = F.png({ avant: [['tEXt', Buffer.from('Comment\0' + CP.texte)], ['eXIf', Buffer.from(CP.exif)], ['iTXt', Buffer.from('XML:com.adobe.xmp\0\0\0\0\0' + CP.itxt)], ['zTXt', Buffer.from('Auteur\0\0' + CP.ztxt)], ['tIME', Buffer.alloc(7, 1)], ['gAMA', Buffer.from([0, 1, 0x86, 0xA0])]], apres: Buffer.from(CP.apres) });
    vrai('population : les cinq canaris PNG SONT dans le fichier envoyé (texte, eXIf, iTXt, zTXt, octets après IEND)', Object.values(CP).every(c => jeton(pngIn, c)));
    const pngOut = P.retirerMetadonnees('image/png', pngIn);
    v('⛔ PNG : aucun canari ne reste (tEXt, eXIf, iTXt, zTXt, ni ce qui suit IEND)', Object.entries(CP).filter(([, c]) => jeton(pngOut, c)).map(([k]) => k), []);
    const types = (b) => { const t = []; let i = 8; while (i + 12 <= b.length) { const l = b.readUInt32BE(i); t.push(b.toString('latin1', i + 4, i + 8)); i += 12 + l; } return t; };
    v('⛔ PNG : il reste IHDR, gAMA, IDAT, IEND — les CRC ne sont pas touchés (le fichier se décode)', types(pngOut), ['IHDR', 'gAMA', 'IDAT', 'IEND']);
    vrai('PNG : le fichier ressort décodable (zlib ouvre les données, la taille est celle d\'origine)', require('zlib').inflateSync(pngOut.subarray(pngOut.indexOf(Buffer.from('IDAT')) + 4, pngOut.indexOf(Buffer.from('IEND')) - 8)).length === 8 * (1 + 8 * 3));
    v('⛔ un PNG sans IEND (tronqué) est refusé', await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/png', pngIn.subarray(0, pngIn.length - 30)))), 'type_refuse');

    const CW = { exif: 'ZXCANARIQWEBPEXIF', xmp: 'ZXCANARIQWEBPXMP' };
    const wIn = F.webp({ exif: CW.exif, xmp: CW.xmp });
    vrai('population : les deux canaris WebP SONT dans le fichier envoyé, avec les drapeaux EXIF et XMP levés dans VP8X', jeton(wIn, CW.exif) && jeton(wIn, CW.xmp) && (wIn[20] & 0x0C) === 0x0C);
    const wOut = P.retirerMetadonnees('image/webp', wIn);
    v('⛔ WebP : ni EXIF ni XMP ne restent', [jeton(wOut, CW.exif), jeton(wOut, CW.xmp), jeton(wOut, 'EXIF'), jeton(wOut, 'XMP ')], [false, false, false, false]);
    vrai('⛔ WebP : les drapeaux EXIF et XMP de VP8X sont BAISSÉS (sinon un lecteur chercherait ce qu\'on a retiré), le drapeau d\'alpha reste', (wOut[20] & 0x0C) === 0 && (wOut[20] & 0x10) === 0x10);
    vrai('⛔ WebP : la taille du conteneur RIFF est recalculée (taille annoncée + 8 = longueur du fichier) et le bourrage du bloc impair est là', wOut.readUInt32LE(4) + 8 === wOut.length && jeton(wOut, 'image-webp-factice-impair'));
    v('⛔ un WebP dont un bloc dépasse le conteneur est refusé', await attrape(Promise.resolve().then(() => { const b = Buffer.from(wIn); b.writeUInt32LE(0x00FFFFFF, 16); return P.retirerMetadonnees('image/webp', b); })), 'type_refuse');
    /* GIF : commentaires, textes et extensions d'application autres que celles d'une animation partent ; l'animation reste */
    const CG = { com: 'ZXCANARIQGIFCOMMENTAIRE', xmp: 'ZXCANARIQGIFXMP', texte: 'ZXCANARIQGIFTEXTE', apres: 'ZXCANARIQGIFAPRES' };
    const gIn = F.gif({ commentaire: CG.com, xmp: CG.xmp, texte: CG.texte, netscape: true, images: 2, apres: Buffer.from(CG.apres, 'latin1') });
    vrai('population : les quatre canaris GIF (commentaire, XMP d\'application, texte simple, octets après le terminateur) SONT dans le fichier envoyé', Object.values(CG).every(c => jeton(gIn, c)));
    const gOut = P.retirerMetadonnees('image/gif', gIn);
    v('⛔ GIF : aucun des quatre canaris n\'est dans ce qui est rangé', Object.entries(CG).filter(([, c]) => jeton(gOut, c)).map(([k]) => k), []);
    const compte = (b, motif) => { let n = 0, i = b.indexOf(motif); while (i >= 0) { n++; i = b.indexOf(motif, i + 1); } return n; };
    vrai('⛔ GIF : l\'animation RESTE — NETSCAPE2.0 (les boucles), le contrôle graphique de chacune des deux images, les deux images, et le fichier finit par son terminateur',
      jeton(gOut, 'NETSCAPE2.0') && compte(gOut, Buffer.from([0x21, 0xF9, 4])) === 2 && compte(gOut, Buffer.from([0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0])) === 2 && gOut[gOut.length - 1] === 0x3B);
    v('un GIF sans rien à retirer ressort identique, octet pour octet', [P.retirerMetadonnees('image/gif', F.gif()).equals(F.gif()), P.retirerMetadonnees('image/gif', F.gif({ netscape: true, images: 3 })).equals(F.gif({ netscape: true, images: 3 }))], [true, true]);
    v('⛔ un GIF tronqué (sans terminateur), à bloc inconnu, ou dont un sous-bloc dépasse le fichier : refusé', [
      await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/gif', F.gif().subarray(0, F.gif().length - 1)))),
      await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/gif', Buffer.concat([F.gif().subarray(0, 19), Buffer.from([0x5A]), F.gif().subarray(19)])))),
      await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/gif', Buffer.concat([F.gif().subarray(0, 19), Buffer.from([0x21, 0xFE, 200, 1, 2, 3])])))),
    ], ['type_refuse', 'type_refuse', 'type_refuse']);
  }

  /* ═══ 2 bis. UNE IMAGE BOURRÉE DE MORCEAUX VIDES NE COÛTE NI MÉMOIRE NI BOUCLE (relecture du gardien, B1) ═════════════════════════════════════════ */
  console.log('\nUne image « bourrée » de millions de morceaux vides est refusée tout de suite — sans mémoire, sans boucle bloquée (B1)');
  {
    const MO = 1048576;
    const mesure = async (entree, mime) => {
      if (global.gc) global.gc();
      const avant = process.memoryUsage().rss, t0 = process.hrtime.bigint();
      const code = await attrape(Promise.resolve().then(() => P.retirerMetadonnees(mime, entree)));
      return { code, ms: Number((process.hrtime.bigint() - t0) / 1000000n), mo: Math.round((process.memoryUsage().rss - avant) / MO) };
    };
    const jb = F.jpegBourre(2900000), pb = F.pngBourre(1000000), wb = F.webpBourre(1500000);
    vrai('population : les trois images bourrées pèsent plus de 10 Mo chacune — le défaut ÉTAIT dans ce qu\'on envoie', [jb, pb, wb].every(b => b.length > 10 * MO));
    const rj = await mesure(jb, 'image/jpeg'), rp = await mesure(pb, 'image/png'), rw = await mesure(wb, 'image/webp');
    v('⛔ un JPEG de 2,9 M de segments vides, un PNG d\'1 M de morceaux, un WebP d\'1,5 M de blocs : tous REFUSÉS (415), aucun n\'est rangé', [rj.code, rp.code, rw.code], ['type_refuse', 'type_refuse', 'type_refuse']);
    vrai('⛔ …sans boucle ni mémoire : chacun en moins d\'une demi-seconde et pour moins de 100 Mo de plus (avant le correctif : 1,8 s et +350 Mo pour le JPEG, 1 s et +90 Mo pour le WebP)', [rj, rp, rw].every(r => r.ms < 500 && r.mo < 100));
    /* le plafond est sur le NOMBRE de morceaux, pas sur la taille : 3 000 segments vides ne pèsent que 12 Ko */
    v('⛔ le plafond porte sur le NOMBRE de segments, pas sur les octets : 3 000 segments JPEG vides (12 Ko) sont refusés', [F.jpegBourre(3000, 0xE3).length < 20000, await attrape(Promise.resolve().then(() => P.retirerMetadonnees('image/jpeg', F.jpegBourre(3000, 0xE3))))], [true, 'type_refuse']);
    /* contre-épreuves : ce qu'une vraie image atteint passe, et ressort NETTOYÉ comme avant */
    const mille = F.jpegBourre(1000, 0xE3);
    vrai('contre-épreuve : 1 000 segments APP3 (vingt fois ce que porte une photo) passent, et sortent retirés — il reste l\'image d\'origine, octet pour octet', P.retirerMetadonnees('image/jpeg', mille).equals(F.jpeg()) && mille.length > F.jpeg().length);
    const cinqP = F.pngBourre(5000), cinqW = F.webpBourre(5000);
    vrai('contre-épreuve : un PNG de 5 000 morceaux et un WebP de 5 000 blocs (bien plus que les vrais) passent, intacts (rien n\'y était à retirer)', P.retirerMetadonnees('image/png', cinqP).equals(cinqP) && P.retirerMetadonnees('image/webp', cinqW).equals(cinqW));

    /* ── le plafond GLOBAL de mémoire d'images : on RÉSERVE 2 × la taille annoncée (le corps et sa version nettoyée) avant de lire ── */
    const pcM = neuf({ memoireImages: 1 * MO });
    const gros = F.png({ avant: [['abCd', Buffer.alloc(400000, 1)]] });                 // 400 Ko : 800 Ko réservés sur 1 Mio
    vrai('population : l\'image d\'essai pèse 400 Ko, donc 800 Ko réservés — un seul dépôt tient dans 1 Mio', gros.length > 400000 && gros.length < 410000);
    let ouvrir; const porte = new Promise((ok) => { ouvrir = ok; });
    const premier = pcM.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxRetenu(gros, 100, porte), max: 5 * MO, attendu: gros.length });   // lit 100 octets, réserve, puis ATTEND
    const second = () => attrape(pcM.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(gros), max: 5 * MO, attendu: gros.length }));
    let refus = null;
    for (let k = 0; k < 100 && refus !== 'occupe'; k++) { refus = await second(); if (refus !== 'occupe') await new Promise((ok) => setTimeout(ok, 20)); }
    v('⛔ pendant qu\'un premier dépôt tient 800 Ko sur 1 Mio, un second est refusé TOUT DE SUITE (occupe) — et pas rangé', refus, 'occupe');
    ouvrir();
    v('…le premier se termine normalement', (await premier).taille, gros.length);
    v('⛔ la réserve est RENDUE : le même dépôt passe maintenant', await second(), null);
    v('⛔ la réserve est rendue aussi quand un dépôt ÉCHOUE (flux coupé avant la longueur annoncée), et le suivant passe', [await attrape(pcM.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(gros.subarray(0, 5000)), max: 5 * MO, attendu: gros.length })), await second()], ['incomplet', null]);
    v('⛔ un son et un fichier ne comptent PAS dans ce plafond (ils passent en flux, un bloc à la fois) : un fichier de 3 Mio passe sur 1 Mio de réserve', await attrape(pcM.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxDe(F.alea(3 * MO)), max: 5 * MO, attendu: 3 * MO })), null);
  }

  /* ═══ 3. LE SCELLAGE PAR BLOCS ═════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe scellage par blocs : aller-retour, plages, rien en clair sur le disque');
  {
    const pc = neuf({ bloc: 1024 });
    const tailles = [1, 2, 1023, 1024, 1025, 2048, 2049, 5632];
    const lus = [];
    for (const t of tailles) {
      const id = nouvelId(), data = Buffer.concat([Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), crypto.randomBytes(Math.max(0, t - 4))]).subarray(0, Math.max(t, 4));
      const r = await pc.deposer({ id, genre: 'vocal', flux: F.fluxDe(data, 300), max: 100000, attendu: data.length });
      lus.push([r.taille === data.length, (await lireTout(pc, id)).equals(data), (await pc.taille(id)) === data.length]);
    }
    v('⛔ aller-retour exact pour 1, 2, 1 023, 1 024, 1 025, 2 048, 2 049 et 5 632 octets (blocs de 1 Kio : une frontière pleine, une frontière +1, plusieurs blocs)',
      lus.map((x, i) => [Math.max(tailles[i], 4), ...x]).filter(x => !(x[1] && x[2] && x[3])).length, 0);
    vrai('population : huit tailles jouées', lus.length === 8);

    const id = nouvelId(), data = Buffer.concat([Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), crypto.randomBytes(5628)]);
    await pc.deposer({ id, genre: 'vocal', flux: F.fluxDe(data), max: 100000, attendu: data.length });
    const plages = [[0, 0], [0, 1023], [0, 1024], [1023, 1024], [1000, 3100], [1024, 2047], [5631, 5631], [4096, 5631], [0, 5631], [2500, 2500], [3071, 3072]];
    const faux = [];
    for (const [a, b] of plages) if (!(await lireTout(pc, id, a, b)).equals(data.subarray(a, b + 1))) faux.push(a + '-' + b);
    v('⛔ Range : onze plages (premier octet, dernier, frontières de bloc, plusieurs blocs, tout) rendent EXACTEMENT les bons octets', [plages.length, faux], [11, []]);
    v('une plage hors du fichier ou à l\'envers est refusée (plage_invalide), jamais lue', [await attrape(lireTout(pc, id, 0, 5632)), await attrape(lireTout(pc, id, 10, 5)), await attrape(lireTout(pc, id, -1, 5))], ['plage_invalide', 'plage_invalide', 'plage_invalide']);

    const secret = 'ZXCANARIQSONPRIVE-' + crypto.randomBytes(4).toString('hex');
    const clair = Buffer.concat([Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), Buffer.from(secret.repeat(40)), crypto.randomBytes(2000)]);
    const id2 = nouvelId();
    await pc.deposer({ id: id2, genre: 'vocal', flux: F.fluxDe(clair), max: 100000, attendu: clair.length });
    const disque = fs.readFileSync(pc.chemin(id2));
    vrai('population : le canari est répété dans le clair envoyé, et le fichier rangé a bien des octets à examiner (' + disque.length + ')', jeton(clair, secret) && disque.length > clair.length);
    v('⛔ le canari n\'apparaît PAS dans le fichier rangé (scellé, pas seulement renommé)', jeton(disque, secret) || jeton(disque, 'ZXCANARIQ'), false);
    v('le fichier est rangé sous pieces/<2 caractères>/<id> (les deux caractères viennent de l\'identifiant), pas dans un dossier à plat', path.relative(pc.dossier, pc.chemin(id2)), id2.slice(2, 4) + path.sep + id2);
    vrai('l\'en-tête annonce « OPMP », la version 1, la génération 1 et le bloc (log2 = 10)', disque.subarray(0, 4).toString() === 'OPMP' && disque[4] === 1 && disque[5] === 1 && disque[6] === 10);
    const stat = fs.statSync(pc.chemin(id2));
    v('la taille du fichier = en-tête + octets clairs + 28 octets par bloc (vecteur + étiquette)', stat.size, 16 + clair.length + Math.ceil(clair.length / 1024) * 28);
    v('le fichier est en 0600 (lisible par le seul utilisateur du service)', (stat.mode & 0o777).toString(8), '600');
    vrai('et deux écritures du MÊME clair ne donnent pas les mêmes octets (vecteur d\'initialisation tiré au hasard à chaque bloc)', await (async () => { const i3 = nouvelId(); await pc.deposer({ id: i3, genre: 'vocal', flux: F.fluxDe(clair), max: 100000 }); return !fs.readFileSync(pc.chemin(i3)).subarray(16, 200).equals(disque.subarray(16, 200)); })());
  }

  /* ═══ 4. UN BLOC N'EST PAS INTERCHANGEABLE ════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nUn bloc abîmé, recopié, permuté, ou un fichier tronqué : refusés — jamais rendus tels quels');
  {
    const pc = neuf({ bloc: 1024 });
    const mk = async (octetsDemandes) => { const id = nouvelId(), d = Buffer.concat([Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), crypto.randomBytes(octetsDemandes - 4)]); await pc.deposer({ id, genre: 'vocal', flux: F.fluxDe(d), max: 1 << 20 }); return { id, d }; };
    const STRIDE = 12 + 1024 + 16;
    const A = await mk(5000), B = await mk(5000);   // 5 blocs : 4 pleins + 1 de 904 octets
    const modif = (p, fn) => { const f = fs.readFileSync(pc.chemin(p)); fn(f); fs.writeFileSync(pc.chemin(p), f); };
    const sauve = (p) => fs.readFileSync(pc.chemin(p));
    const restaure = (p, b) => fs.writeFileSync(pc.chemin(p), b);

    const aSauve = sauve(A.id);
    modif(A.id, f => { f[16 + 2 * STRIDE + 12 + 5] ^= 0x01; });
    v('⛔ un octet retourné dans le bloc 2 : la lecture entière LÈVE piece_corrompue (jamais d\'octets faux rendus)', await attrape(lireTout(pc, A.id)), 'piece_corrompue');
    vrai('⛔ …mais une plage qui ne touche PAS ce bloc se lit encore (Range ne déchiffre que les blocs touchés), et une plage qui le touche lève',
      (await lireTout(pc, A.id, 0, 2047)).equals(A.d.subarray(0, 2048)) && (await attrape(lireTout(pc, A.id, 2048, 2100))) === 'piece_corrompue' && (await lireTout(pc, A.id, 3072, 4999)).equals(A.d.subarray(3072)));
    restaure(A.id, aSauve);
    vrai('contre-épreuve : le fichier remis tel quel se relit', (await lireTout(pc, A.id)).equals(A.d));

    modif(A.id, f => { f[16 + 3 * STRIDE + 12 + 1024] ^= 0x80; });   // un octet de l'étiquette du bloc 3
    v('⛔ une étiquette modifiée est refusée', await attrape(lireTout(pc, A.id, 3072, 3100)), 'piece_corrompue');
    restaure(A.id, aSauve);
    modif(A.id, f => { f[16 + STRIDE + 3] ^= 0x01; });   // un octet du vecteur d'initialisation du bloc 1
    v('⛔ un vecteur d\'initialisation modifié est refusé', await attrape(lireTout(pc, A.id, 1024, 1030)), 'piece_corrompue');
    restaure(A.id, aSauve);

    modif(A.id, f => { const b1 = Buffer.from(f.subarray(16 + STRIDE, 16 + 2 * STRIDE)), b2 = Buffer.from(f.subarray(16 + 2 * STRIDE, 16 + 3 * STRIDE)); b2.copy(f, 16 + STRIDE); b1.copy(f, 16 + 2 * STRIDE); });
    v('⛔ deux blocs PERMUTÉS dans la même pièce : refusés (le numéro de bloc est dans les données associées)', [await attrape(lireTout(pc, A.id, 1024, 1030)), await attrape(lireTout(pc, A.id, 2048, 2060))], ['piece_corrompue', 'piece_corrompue']);
    restaure(A.id, aSauve);

    const bSauve = sauve(B.id);
    modif(A.id, f => { bSauve.copy(f, 16 + STRIDE, 16 + STRIDE, 16 + 2 * STRIDE); });
    v('⛔ un bloc RECOPIÉ d\'une autre pièce, à la même place, de même taille : refusé (l\'identifiant de la pièce est dans les données associées, et chaque pièce a sa clé)', await attrape(lireTout(pc, A.id, 1024, 1030)), 'piece_corrompue');
    restaure(A.id, aSauve);

    modif(A.id, f => { f.fill(0, 16 + 4 * STRIDE, 16 + 4 * STRIDE + 12); });
    v('un vecteur remis à zéro est refusé', await attrape(lireTout(pc, A.id, 4096, 4100)), 'piece_corrompue');
    restaure(A.id, aSauve);

    /* tronqué à la frontière d'un bloc : le dernier bloc disparaît */
    fs.writeFileSync(pc.chemin(A.id), aSauve.subarray(0, 16 + 4 * STRIDE));
    v('⛔ fichier TRONQUÉ au dernier bloc, en-tête inchangé : la taille ne colle plus', await attrape(lireTout(pc, A.id)), 'piece_corrompue');
    /* tronqué ET en-tête réécrit pour annoncer la nouvelle taille : le drapeau « dernier » (authentifié) trahit le bloc 3 */
    const tronque = Buffer.from(aSauve.subarray(0, 16 + 4 * STRIDE)); tronque.writeBigUInt64BE(BigInt(4096), 8);
    fs.writeFileSync(pc.chemin(A.id), tronque);
    v('⛔ fichier tronqué ET en-tête recalculé pour s\'accorder : le dernier bloc n\'a pas le drapeau « dernier » dans ses données associées — refusé', await attrape(lireTout(pc, A.id, 3072, 4095)), 'piece_corrompue');
    restaure(A.id, aSauve);
    /* un octet ajouté */
    fs.writeFileSync(pc.chemin(A.id), Buffer.concat([aSauve, Buffer.from([0])]));
    v('un octet de trop en fin de fichier : refusé', await attrape(lireTout(pc, A.id)), 'piece_corrompue');
    restaure(A.id, aSauve);
    /* un en-tête qui ment */
    modif(A.id, f => { f.writeBigUInt64BE(BigInt(5001), 8); });
    v('⛔ un en-tête qui annonce une autre taille : refusé', await attrape(lireTout(pc, A.id)), 'piece_corrompue');
    restaure(A.id, aSauve);
    modif(A.id, f => { f[0] = 0x58; });
    v('un en-tête sans « OPMP » : refusé (ce n\'est pas une pièce)', [await attrape(lireTout(pc, A.id)), await pc.taille(A.id)], ['piece_corrompue', null]);
    restaure(A.id, aSauve);

    const autre = P.creerPieces({ dossier: pc.dossier, cle: (g, id) => creerScelleur(crypto.randomBytes(32)).deriver(g, 'piece', 'bloc', id), bloc: 1024 });
    v('⛔ une AUTRE clé maître ne lit rien (piece_corrompue)', await attrape(lireTout(autre, A.id)), 'piece_corrompue');
    v('une pièce qui n\'existe pas : introuvable', await attrape(lireTout(pc, nouvelId())), 'introuvable');
    v('un identifiant mal formé est refusé avant de toucher au disque (pas de chemin construit : « .. », « / »)', [await attrape(lireTout(pc, '../../etc/passwd')), await attrape(lireTout(pc, 'f_zz')), pc.existe('x') instanceof Promise], ['id_invalide', 'id_invalide', true]);
    vrai('contre-épreuve : la pièce intacte se relit après tout cela', (await lireTout(pc, A.id)).equals(A.d) && (await lireTout(pc, B.id)).equals(B.d));
  }

  /* ═══ 5. RECEVOIR UN FLUX ═════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nRecevoir un flux : le plafond s\'applique au fil de l\'eau, le type se juge avant de tout lire, un envoi interrompu ne laisse rien');
  {
    const pc = neuf({ bloc: 1024 });
    const sansRien = async () => { const o = []; for await (const f of pc.lister()) o.push(f.id); const tmp = fs.existsSync(path.join(pc.dossier, 'tmp')) ? fs.readdirSync(path.join(pc.dossier, 'tmp')) : []; return [o, tmp]; };

    const inf = F.fluxSansFin(4096, F.webm(20));
    const e1 = await attrape(pc.deposer({ id: nouvelId(), genre: 'vocal', flux: inf.flux, max: 50000 }));
    vrai('⛔ un flux SANS FIN est arrêté dès que le plafond est franchi : trop_gros, et le service n\'a pris que ~le plafond (' + inf.etat.pris + ' octets pour 50 000 de plafond)', e1 === 'trop_gros' && inf.etat.pris <= 50000 + 2 * 4096 + 20);
    v('…et il ne reste ni fichier ni temporaire', await sansRien(), [[], []]);
    const infPhoto = F.fluxSansFin(4096, F.png().subarray(0, 40));
    v('⛔ pareil pour une photo (tenue en mémoire) : le plafond la coupe avant d\'avoir tout lu', [await attrape(pc.deposer({ id: nouvelId(), genre: 'photo', flux: infPhoto.flux, max: 30000 })), infPhoto.etat.pris <= 30000 + 2 * 4096 + 40], ['trop_gros', true]);

    const svc = F.fluxSansFin(4096, F.svg());
    const e2 = await attrape(pc.deposer({ id: nouvelId(), genre: 'photo', flux: svc.flux, max: 12 << 20 }));
    vrai('⛔ un SVG envoyé comme photo est refusé (type_refuse) APRÈS LES PREMIERS OCTETS : le flux infini n\'a presque rien donné (' + svc.etat.pris + ' octets)', e2 === 'type_refuse' && svc.etat.pris < 20000);
    v('un son envoyé comme photo, une image envoyée comme vocal : type_refuse', [await attrape(pc.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(F.webm()), max: 1 << 20 })), await attrape(pc.deposer({ id: nouvelId(), genre: 'vocal', flux: F.fluxDe(F.png()), max: 1 << 20 }))], ['type_refuse', 'type_refuse']);
    v('un corps vide : vide', await attrape(pc.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxDe(Buffer.alloc(0)), max: 1 << 20 })), 'vide');
    v('⛔ une longueur annoncée qui n\'est pas celle reçue : incomplet', [await attrape(pc.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxDe(Buffer.alloc(3000, 1)), max: 1 << 20, attendu: 3001 })), await attrape(pc.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(F.png()), max: 1 << 20, attendu: 5 }))], ['incomplet', 'incomplet']);
    v('…et toujours rien sur le disque après tous ces refus', await sansRien(), [[], []]);

    /* un client qui s'en va au milieu : le flux lève */
    const coupe = { async *[Symbol.asyncIterator]() { yield F.webm(3000); yield Buffer.alloc(3000, 2); throw new Error('aborted'); } };
    const idc = nouvelId();
    v('⛔ un envoi interrompu par le client lève, et ne laisse RIEN sous le nom de la pièce ni dans tmp/', [await attrape(pc.deposer({ id: idc, genre: 'vocal', flux: coupe, max: 1 << 20 })), await pc.existe(idc), (await sansRien())[1]], ['aborted', false, []]);

    /* une photo : les métadonnées partent À L'ÉCRITURE, la taille rendue est celle de ce qui est rangé */
    const idp = nouvelId(), avecGps = F.jpeg({ exif: 'ZXCANARIQGPSDEPOT' });
    const r = await pc.deposer({ id: idp, genre: 'photo', flux: F.fluxDe(avecGps), max: 1 << 20, attendu: avecGps.length });
    const relue = await lireTout(pc, idp);
    vrai('population : le JPEG envoyé portait le canari GPS', jeton(avecGps, 'ZXCANARIQGPSDEPOT'));
    v('⛔ la photo déposée est rangée SANS son EXIF, et la taille rendue est celle de ce qui est rangé', [jeton(relue, 'ZXCANARIQGPSDEPOT'), r.taille === relue.length, r.taille < avecGps.length, r.mime], [false, true, true, 'image/jpeg']);
    v('⛔ aucun canari non plus dans le FICHIER rangé (le clair n\'a jamais touché le disque)', jeton(fs.readFileSync(pc.chemin(idp)), 'ZXCANARIQ'), false);
    v('un JPEG illisible (tronqué) envoyé comme photo : type_refuse', await attrape(pc.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(avecGps.subarray(0, 50)), max: 1 << 20 })), 'type_refuse');

    /* un fichier : n'importe quoi, rangé tel quel */
    const idf = nouvelId(), bin = F.svg('<script>alert("ZXCANARIQFICHIER")</script>');
    const rf = await pc.deposer({ id: idf, genre: 'fichier', flux: F.fluxDe(bin), max: 1 << 20, attendu: bin.length });
    vrai('un SVG déposé comme FICHIER est accepté mais typé application/octet-stream, et rendu tel quel', rf.mime === 'application/octet-stream' && (await lireTout(pc, idf)).equals(bin));
    v('un bloc plein exactement (1 024 octets, puis 2 048) : l\'écriture ne perd pas le drapeau « dernier »', await (async () => { const o = []; for (const t of [1024, 2048]) { const id = nouvelId(), d = crypto.randomBytes(t); await pc.deposer({ id, genre: 'fichier', flux: F.fluxDe(d, 512), max: 1 << 20 }); o.push((await lireTout(pc, id)).equals(d)); } return o; })(), [true, true]);
  }

  /* ═══ 5 bis. UN ENVOI QUI N'AVANCE PAS NE TIENT PAS UNE PLACE (relecture du gardien, A4) ═══════════════════════════════════════ */
  console.log('\nUn envoi qui n\'avance pas est coupé : un débit minimal après une grâce, jugé par une MINUTERIE (un envoi arrêté ne reçoit plus de morceau pour s\'en apercevoir)');
  {
    /* la formule, à horloge fausse : après `graceMs`, il faut avoir reçu `(écoulé − grâce) × débit` octets */
    let t = 0; const maintenant = () => t;
    const garde = (o) => { t = 0; return P.gardeDebit(Object.assign({ debitMin: 1000, graceMs: 1000, maintenant, pas: 5 }, o || {})); };
    const verdict = (g, ms) => Promise.race([g.vigile.then(() => 'tenue', (e) => e.code), new Promise((ok) => setTimeout(() => ok('en_vie'), ms))]);
    let g = garde(); t = 900;
    v('⛔ pendant la grâce rien n\'est exigé : un envoi qui n\'a encore RIEN reçu n\'est pas coupé', await verdict(g, 60), 'en_vie'); g.arreter();
    g = garde(); t = 1500;
    v('⛔ la grâce passée, un envoi qui n\'a rien reçu est coupé (trop_lent) — par la minuterie, sans qu\'aucun morceau n\'arrive', await verdict(g, 300), 'trop_lent');
    g = garde(); t = 1500; g.compter(500);
    v('…le crédit exact (500 octets exigés, 500 reçus) ne coupe pas ; un octet exigé de plus, si', [await verdict(g, 60), (t = 1501, await verdict(g, 300))], ['en_vie', 'trop_lent']);
    g = garde(); t = 0; let tenu = true;
    for (let k = 1; k <= 50; k++) { t = k * 100; g.compter(200); if (await verdict(g, 8) !== 'en_vie') { tenu = false; break; } }
    vrai('⛔ contre-épreuve : un envoi à bon débit (2 000 octets par seconde pour 1 000 exigés) n\'est JAMAIS coupé, cinq secondes durant (la grâce ne s\'use pas)', tenu && t === 5000); g.arreter();
    g = garde(); g.arreter(); t = 9000;
    v('une garde arrêtée ne coupe plus personne (le corps est lu en entier : le nettoyage et l\'écriture ne comptent pas dans le temps de l\'envoi)', await verdict(g, 80), 'en_vie');

    /* la garde dans `deposer` : une vraie minuterie, de vrais flux */
    const pc = neuf({ bloc: 1024 });
    const sansRien = async () => { const o = []; for await (const f of pc.lister()) o.push(f.id); const tmp = fs.existsSync(path.join(pc.dossier, 'tmp')) ? fs.readdirSync(path.join(pc.dossier, 'tmp')) : []; return [o, tmp]; };
    const jamais = new Promise(() => {});
    const bin = crypto.randomBytes(300000);
    const t0 = Date.now();
    const e1 = await attrape(pc.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxRetenu(bin, 100, jamais), max: 1 << 20, attendu: bin.length, debitMin: 100000, graceMs: 300 }));
    const dur1 = Date.now() - t0;
    vrai('⛔ un envoi qui s\'ARRÊTE après 100 octets est coupé (trop_lent) entre la grâce et une seconde de plus — il n\'attend pas le délai de Node (' + dur1 + ' ms)', e1 === 'trop_lent' && dur1 >= 250 && dur1 < 2500);
    v('…et il ne reste ni fichier ni temporaire', await sansRien(), [[], []]);
    /* une réserve de mémoire d'images JUSTE assez large pour une photo en cours (2 × le maximum) : si la coupure ne la rendait pas, la photo suivante serait refusée (`occupe`) */
    const pm = neuf({ bloc: 1024, memoireImages: 2 * (1 << 20) });
    const e2 = await attrape(pm.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxRetenu(F.jpeg({ exif: 'ZXCANARIQLENT' }), 60, jamais), max: 1 << 20, debitMin: 100000, graceMs: 300 }));
    v('⛔ pareil pour une photo (tenue en mémoire) : coupée, et la réserve de mémoire est rendue (une autre photo passe ensuite)', [e2, await attrape(pm.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(F.png()), max: 1 << 20, attendu: F.png().length, debitMin: 100000, graceMs: 300 }))], ['trop_lent', null]);
    /* un envoi honnête mais lent : 300 000 octets en 6 morceaux espacés de 100 ms, soit ~500 Ko/s pour 100 Ko/s exigés */
    const lent = { async *[Symbol.asyncIterator]() { for (let i = 0; i < bin.length; i += 50000) { await new Promise((ok) => setTimeout(ok, 100)); yield bin.subarray(i, i + 50000); } } };
    const idl = nouvelId();
    const rl = await attrape(pc.deposer({ id: idl, genre: 'fichier', flux: lent, max: 1 << 20, attendu: bin.length, debitMin: 100000, graceMs: 300 }));
    v('⛔ contre-épreuve : un envoi lent mais au-dessus du débit minimal (6 morceaux espacés de 100 ms) passe, intact', [rl, (await lireTout(pc, idl)).equals(bin)], [null, true]);
    /* une grâce n'est pas un débit : un premier morceau tardif (200 ms) puis un bon débit passe — la grâce couvre le démarrage */
    const demarrage = { async *[Symbol.asyncIterator]() { await new Promise((ok) => setTimeout(ok, 200)); yield bin.subarray(0, 150000); yield bin.subarray(150000); } };
    v('⛔ un démarrage tardif (200 ms avant le premier octet) est couvert par la grâce de 300 ms', await attrape(pc.deposer({ id: nouvelId(), genre: 'fichier', flux: demarrage, max: 1 << 20, attendu: bin.length, debitMin: 100000, graceMs: 300 })), null);
    /* sans réglage (le module seul), aucune garde : un envoi qui s'arrête un moment puis finit passe */
    const pause = { async *[Symbol.asyncIterator]() { yield bin.subarray(0, 1000); await new Promise((ok) => setTimeout(ok, 900)); yield bin.subarray(1000); } };
    v('sans `debitMin` (le module seul) il n\'y a aucune garde : un envoi qui s\'arrête 900 ms puis finit passe', await attrape(pc.deposer({ id: nouvelId(), genre: 'fichier', flux: pause, max: 1 << 20, attendu: bin.length })), null);
    /* aucune minuterie ne survit à un envoi : réussi, refusé tôt ou coupé — sinon chaque envoi en laisserait une, pour toujours */
    let appels = 0; const compteur = () => { appels++; return Date.now(); };
    const survie = async (nom, promesse, attendu) => { const r = await attrape(promesse); const avant = appels; await T.dort(700); return [nom, r, appels - avant]; };
    const ok1 = await survie('réussi', pc.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxDe(bin.subarray(0, 5000)), max: 1 << 20, attendu: 5000, debitMin: 1000, graceMs: 100000, maintenant: compteur }));
    const refuse1 = await survie('refusé tôt', pc.deposer({ id: nouvelId(), genre: 'photo', flux: F.fluxDe(F.svg()), max: 1 << 20, debitMin: 1000, graceMs: 100000, maintenant: compteur }));
    appels = 0;
    const coupe1 = await survie('coupé', pc.deposer({ id: nouvelId(), genre: 'fichier', flux: F.fluxRetenu(bin, 100, jamais), max: 1 << 20, attendu: bin.length, debitMin: 100000, graceMs: 300, maintenant: compteur }));
    vrai('population : la minuterie a bien tourné pendant l\'envoi coupé (' + appels + ' lectures de l\'horloge, dont ' + coupe1[2] + ' après)', appels - coupe1[2] > 0);
    v('⛔ aucune minuterie ne survit à un envoi : réussi, refusé tôt ou coupé, l\'horloge n\'est plus lue 700 ms après', [ok1[1], ok1[2], refuse1[1], refuse1[2], coupe1[1], coupe1[2]], [null, 0, 'type_refuse', 0, 'trop_lent', 0]);
    v('…et toujours rien sur le disque (hors la pièce réussie, le lent et le démarrage tardif)', (await sansRien())[1], []);
  }

  /* ═══ 6. LE DISQUE : LISTER, EFFACER, NETTOYER ════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe disque : lister, effacer, nettoyer les temporaires (le balayeur n\'a que cela à sa disposition)');
  {
    const pc = neuf({ bloc: 1024 });
    const ids = [];
    for (let i = 0; i < 4; i++) { const id = nouvelId(); ids.push(id); await pc.deposer({ id, genre: 'fichier', flux: F.fluxDe(crypto.randomBytes(100 + i)), max: 1 << 20 }); }
    const vus = []; for await (const f of pc.lister()) vus.push(f.id);
    v('⛔ lister() rend toutes les pièces du disque (et seulement elles : ni tmp/, ni un autre fichier)', vus.sort(), ids.slice().sort());
    fs.writeFileSync(path.join(pc.dossier, ids[0].slice(2, 4), 'intrus.txt'), 'x'); fs.mkdirSync(path.join(pc.dossier, 'zz'), { recursive: true }); fs.writeFileSync(path.join(pc.dossier, 'zz', ids[1]), 'x');
    const vus2 = []; for await (const f of pc.lister()) vus2.push(f.id);
    v('un fichier au nom étranger, ou dans un dossier qui n\'est pas hexadécimal, n\'est pas pris pour une pièce', vus2.sort(), ids.slice().sort());
    v('effacer: vrai la première fois, faux ensuite (un fichier déjà absent n\'est pas une erreur), et la pièce est partie', [await pc.effacer(ids[2]), await pc.effacer(ids[2]), await pc.existe(ids[2])], [true, false, false]);
    v('lire une pièce effacée : introuvable', await attrape(lireTout(pc, ids[2])), 'introuvable');
    fs.mkdirSync(path.join(pc.dossier, 'tmp'), { recursive: true });
    const vieux = path.join(pc.dossier, 'tmp', 'a'.repeat(24)), neufTmp = path.join(pc.dossier, 'tmp', 'b'.repeat(24));
    fs.writeFileSync(vieux, 'x'); fs.writeFileSync(neufTmp, 'x');
    const maintenant = Date.now();
    fs.utimesSync(vieux, new Date(maintenant - 7200000), new Date(maintenant - 7200000));
    v('⛔ nettoyerTmp(1 h) efface le temporaire vieux d\'un envoi interrompu par un arrêt du processus, garde le récent', [await pc.nettoyerTmp(3600000), fs.existsSync(vieux), fs.existsSync(neufTmp)], [1, false, true]);
  }

  /* ═══ 7. LE QUOTA ══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe quota par personne : deux envois en même temps ne le dépassent pas ensemble');
  {
    let utilise = 90;
    const R = P.creerReservations({ max: 100, utilise: () => utilise });
    const a = R.essayer('p1', 10);
    v('90 déjà utilisés sur 100 : 10 de plus passent (limite incluse)', a.ok, true);
    v('⛔ …et UN de plus ne passe plus — la réservation compte, même si rien n\'est encore écrit en base', [R.essayer('p1', 1).ok, R.reserve('p1')], [false, 10]);
    a.liberer();
    v('rendre la réservation rouvre la place (envoi échoué, ou terminé et compté par la base)', [R.reserve('p1'), R.essayer('p1', 6).ok], [0, true]);
    const b = R.essayer('p2', 6);
    v('⛔ deux envois de 6 chacun, en même temps : le premier passe, le SECOND est refusé — 90 + 6 + 6 dépasse 100', [b.ok, R.essayer('p2', 6).ok, R.essayer('p2', 4).ok], [true, false, true]);
    v('le refus dit où l\'on en est (utilisé, maximum)', R.essayer('p2', 50), { ok: false, utilise: 90, max: 100 });
    vrai('⛔ les personnes ne se prêtent pas leur quota : p3 passe alors que p1 et p2 ont tout réservé', R.essayer('p3', 10).ok);
    const c = R.essayer('p4', 1); c.liberer(); c.liberer();
    v('rendre deux fois ne rend pas deux fois (une réservation de 1, rendue deux fois, ne rouvre pas 2)', [R.reserve('p4'), R.essayer('p4', 10).ok, R.essayer('p4', 1).ok], [0, true, false]);
    utilise = 100;
    v('à plein : plus rien ne passe', R.essayer('p5', 1).ok, false);
    v('la table des réservations ne grossit pas : une fois tout rendu, elle est vide', (() => { const R2 = P.creerReservations({ max: 10, utilise: () => 0 }); const x = R2.essayer('a', 5); x.liberer(); return R2.taille(); })(), 0);
  }

  /* ═══ 8. L'EN-TÊTE DE TÉLÉCHARGEMENT ═══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nContent-Disposition : « inline » seulement pour ce qui s\'affiche, un nom de fichier ne peut rien injecter');
  {
    v('inline pour ce qui s\'affiche', P.dispositionDe(true, 'quoi-que-ce-soit.png'), 'inline');
    const att = P.dispositionDe(false, 'Rapport été 2026 (final).pdf');
    vrai('⛔ attachment, avec le nom ASCII de repli et le nom réel en filename*=UTF-8\'\' (accents encodés, parenthèses encodées)', /^attachment; filename="Rapport _t_ 2026 \(final\)\.pdf"; filename\*=UTF-8''Rapport%20%C3%A9t%C3%A9%202026%20%28final%29\.pdf$/.test(att));
    const piege = P.dispositionDe(false, 'a.pdf"\r\nSet-Cookie: pirate=1\r\nX: "\\../../etc/passwd');
    vrai('⛔ un nom piégé (guillemets, retours à la ligne, barres obliques) ne casse pas l\'en-tête : aucun CR/LF, exactement deux guillemets (ceux du nom), aucune barre, et le texte « Set-Cookie » reste DANS le nom entre guillemets (il n\'ouvre pas un en-tête)', !/[\r\n]/.test(piege) && (piege.match(/"/g) || []).length === 2 && !/[\\/]/.test(piege.replace(/UTF-8''.*/, '')) && /^attachment; filename="[^"]*Set-Cookie[^"]*"; filename\*=/.test(piege));
    vrai('un nom vide ou fait de contrôles devient « fichier »', /filename="fichier"/.test(P.dispositionDe(false, '')) && /filename="fichier"/.test(P.dispositionDe(false, null)) && /filename="_+"|filename="fichier"/.test(P.dispositionDe(false, '\u0000\u0001')));
    vrai('un nom de 300 signes est coupé à 120 signes (par points de code : un émoji n\'est pas coupé en deux)', Array.from(decodeURIComponent(P.dispositionDe(false, '😀'.repeat(300)).split("UTF-8''")[1])).length === 120 && !/%ED%A0/.test(P.dispositionDe(false, '😀'.repeat(300))));
  }

  /* ═══ 9. COUPER UN NOM EN GARDANT SON EXTENSION (le testeur : « .pdf » disparaissait au-delà de 120 signes) ═════════════════════════════════════════ */
  console.log('\nUn nom trop long est coupé dans son radical, jamais dans son extension');
  {
    const long = 'rapport-'.repeat(40) + 'final.pdf';
    const c = P.couperNom(long, 120);
    v('⛔ 329 signes coupés à 120 : le nom finit toujours par « .pdf » et pèse exactement 120 signes', [Array.from(long).length > 300, c.endsWith('.pdf'), Array.from(c).length, c.startsWith('rapport-rapport-')], [true, true, 120, true]);
    v('un nom qui tient (120 signes ou moins) n\'est pas touché', [P.couperNom('a.pdf', 120), P.couperNom('x'.repeat(120), 120).length], ['a.pdf', 120]);
    v('sans extension reconnaissable, on coupe simplement', [Array.from(P.couperNom('x'.repeat(300), 120)).length, P.couperNom('x'.repeat(300), 120).includes('.')], [120, false]);
    v('⛔ une « extension » démesurée (plus de 16 signes sans espace) n\'est pas gardée : le radical n\'est pas écrasé par elle', [Array.from(P.couperNom('a'.repeat(50) + '.' + 'b'.repeat(200), 120)).length, P.couperNom('a'.repeat(50) + '.' + 'b'.repeat(200), 120).startsWith('a'.repeat(50) + '.b')], [120, true]);
    v('⛔ l\'extension se garde par POINTS DE CODE : un émoji dans le radical n\'est pas coupé en deux (aucune moitié de paire de substitution)', (() => { const x = P.couperNom('😀'.repeat(200) + '.png', 120); return [x.endsWith('.png'), Array.from(x).length, /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(x)]; })(), [true, 120, false]);
    v('une extension à plusieurs points : seule la dernière compte', [P.couperNom('x'.repeat(200) + '.tar.gz', 120).endsWith('.tar.gz'), P.couperNom('x'.repeat(200) + '.tar.gz', 120).endsWith('x.gz')], [false, true]);
    /* Le geste complet : ce que le navigateur reçoit au téléchargement (c'est CET en-tête qui donne son type au fichier enregistré). */
    const tete = P.dispositionDe(false, long);
    const repli = (/filename="([^"]*)"/.exec(tete) || [])[1] || '', reel = decodeURIComponent((/filename\*=UTF-8''(.*)$/.exec(tete) || [])[1] || '');
    v('⛔ l\'en-tête de téléchargement d\'un nom de 329 signes garde « .pdf » dans le nom de repli ET dans le nom réel (filename*), 120 signes chacun', [repli.endsWith('.pdf'), reel.endsWith('.pdf'), Array.from(reel).length, repli.length], [true, true, 120, 120]);
  }

  fs.rmSync(bac, { recursive: true, force: true });
  fin();
})().catch((e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; try { fs.rmSync(bac, { recursive: true, force: true }); } catch (x) {} fin(); });
