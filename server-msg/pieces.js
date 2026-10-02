/* ══ LES PIÈCES D'OP MESSAGES — PHOTOS, VOCAUX, FICHIERS, PHOTOS DE PROFIL : SCELLÉES SUR LE DISQUE, PAR BLOCS ══════════════
 *
 * Ce module ne connaît NI la base NI le réseau : il reçoit un dossier, une fonction qui donne la clé d'une pièce, et (pour
 * recevoir) un flux d'octets. Tout le SQL des pièces est dans `stockage.js` ; tout le HTTP est dans `routes-pieces.js`. C'est ce
 * qui le rend testable seul (`tests/test-942.js`) : le scellage, les types, les métadonnées, le quota.
 *
 * ⛔ LE TYPE D'UNE PIÈCE SE JUGE SUR SES PREMIERS OCTETS, JAMAIS SUR CE QUE DIT LE CLIENT. Une « photo » qui n'est pas un JPEG, un
 * PNG, un WebP ou un GIF est refusée (415) ; un « vocal » qui n'est pas du webm, de l'ogg, du mp4/m4a ou du mpeg aussi. Un SVG est
 * du texte (du code, pour un navigateur) : il n'a aucune signature d'image, donc il ne passe JAMAIS pour une photo. Un « fichier »
 * peut être n'importe quoi — et sera servi en `application/octet-stream` + `attachment`, quelle que soit sa signature : ce qui est
 * servi « en ligne » (affiché par le navigateur) ne vient que des genres photo, vocal et avatar, jugés aux octets.
 *
 * ⛔ LES MÉTADONNÉES SONT RETIRÉES ICI AUSSI (le client ré-encode par un canvas, ce qui retire tout — mais le service ne croit pas
 * un client). JPEG : segments APP1 (Exif, XMP), APP13 (IPTC), commentaires, applications vendeur, et tout ce qui suit la fin de
 * l'image (un aperçu intégré, une seconde image Apple/Samsung, qui portent leur propre EXIF) ; PNG : eXIf, tEXt, iTXt, zTXt, tIME ;
 * WebP : EXIF et XMP. Un fichier de ces formats qu'on ne sait pas lire de bout en bout est REFUSÉ plutôt que gardé tel quel : on
 * ne garantit pas le retrait de ce qu'on n'a pas su parcourir. (GIF : gardé tel quel — le client n'en produit jamais.)
 *
 * ⛔ LE SCELLAGE EST PAR BLOCS. Un fichier est coupé en blocs de 64 Kio ; chaque bloc est chiffré en AES-256-GCM avec SON vecteur
 * d'initialisation et SON étiquette, et ses DONNÉES ASSOCIÉES sont `<id de la pièce>|<numéro de bloc>|<d|n>` (`d` : dernier bloc).
 * Trois conséquences, gardées par `tests/test-942.js` :
 *   · un bloc recopié d'une pièce dans une autre, ou deux blocs permutés dans la même, ne s'ouvre plus (l'authentification échoue
 *     au lieu de rendre les octets d'une autre place) ;
 *   · un fichier tronqué à une frontière de bloc ne passe pas pour complet (le drapeau « dernier » est authentifié, et la taille
 *     de l'en-tête doit coller à la taille du fichier) ;
 *   · `Range` ne déchiffre que les blocs qu'il faut : on lit 1 Mio au milieu de 25 Mio sans tout ouvrir.
 * Chaque pièce a SA clé (HKDF de la clé maître, sel = l'identifiant : `scelle.js`, `deriver`). Disposition :
 *   en-tête de 16 octets : « OPMP » · version · génération de clé · log2 du bloc · 0 · taille claire (8 octets, grand-boutiste)
 *   puis, bloc après bloc : vecteur (12) · texte chiffré (≤ bloc) · étiquette (16).
 * Écriture dans un fichier TEMPORAIRE puis renommage : un envoi interrompu ne laisse jamais une pièce à moitié écrite sous son nom.
 *
 * ⛔ AUCUNE PIÈCE SANS LIGNE, AUCUNE LIGNE SANS PIÈCE. Un fichier est renommé AVANT que sa ligne soit écrite (si le processus meurt
 * entre les deux, il reste un fichier sans ligne) ; `lister()` et `nettoyerTmp()` servent le balayeur, qui efface les fichiers que
 * plus aucune ligne ne réclame. Un fichier qu'on perdrait par une suppression de compte en cascade (la base efface les lignes, pas
 * les fichiers) est rattrapé de la même façon.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const fsp = fs.promises;

const erreur = (code) => Object.assign(new Error(code), { code });
const MAGIE = Buffer.from('OPMP', 'latin1');
const VERSION_FORMAT = 1, ENTETE = 16, IV = 12, ETIQUETTE = 16, BLOC_DEFAUT = 65536;
const ID_PIECE = /^f_[0-9a-f]{32}$/;
const MIME_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MIME_AUDIO = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
const GENRES = ['photo', 'vocal', 'fichier', 'avatar'];

/* ══ 1. LES TYPES, JUGÉS AUX OCTETS ═══════════════════════════════════════════════════════════════════════════════════ */
const octets = (b, deb, ...v) => v.every((x, i) => b[deb + i] === x);
function mimeImage(b) {
  if (b.length >= 3 && octets(b, 0, 0xFF, 0xD8, 0xFF)) return 'image/jpeg';
  if (b.length >= 8 && octets(b, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return 'image/png';
  if (b.length >= 6 && b.toString('latin1', 0, 3) === 'GIF' && /^8[79]a$/.test(b.toString('latin1', 3, 6))) return 'image/gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}
function mimeAudio(b) {
  if (b.length >= 4 && octets(b, 0, 0x1A, 0x45, 0xDF, 0xA3)) return 'audio/webm';                     // EBML : webm (ou matroska, servi de la même façon)
  if (b.length >= 4 && b.toString('latin1', 0, 4) === 'OggS') return 'audio/ogg';
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') return 'audio/mp4';                     // mp4 / m4a (Safari enregistre en mp4)
  if (b.length >= 3 && b.toString('latin1', 0, 3) === 'ID3') return 'audio/mpeg';
  /* une trame mpeg : 11 bits à 1, une version et une couche qui ne sont pas « réservées » (la couche 00 est de l'AAC en ADTS) */
  if (b.length >= 2 && b[0] === 0xFF && (b[1] & 0xE0) === 0xE0 && (b[1] & 0x18) !== 0x08 && (b[1] & 0x06) !== 0x00) return 'audio/mpeg';
  return null;
}
/* → { mime, famille:'image'|'audio'|'fichier' } ou null (415). `tete` : au moins les 16 premiers octets (ou tout, s'il y en a moins). */
function detecter(genre, tete) {
  if (genre === 'fichier') return { mime: 'application/octet-stream', famille: 'fichier' };
  if (genre === 'photo' || genre === 'avatar') { const m = mimeImage(tete); return m ? { mime: m, famille: 'image' } : null; }
  if (genre === 'vocal') { const m = mimeAudio(tete); return m ? { mime: m, famille: 'audio' } : null; }
  return null;
}
/* Ce qui peut s'afficher « en ligne » : une image ou un son jugés aux octets, jamais le genre « fichier ». */
const enLigne = (genre, mime) => genre !== 'fichier' && (MIME_IMAGES.includes(mime) || MIME_AUDIO.includes(mime));

/* L'en-tête `Content-Disposition` d'une pièce servie. « inline » pour ce qui s'affiche ; sinon « attachment » avec un nom ASCII de repli
   et le nom réel en `filename*=UTF-8''…` (RFC 5987). ⛔ Le nom vient du client : on retire les caractères de contrôle, les séparateurs
   de chemin et les guillemets — un retour à la ligne dans un en-tête serait une injection d'en-tête. */
function dispositionDe(inline, nom) {
  if (inline) return 'inline';
  const mots = Array.from(String(nom == null ? '' : nom).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿\/\\"]/g, '_').replace(/\s+/g, ' ').trim());
  const propre = mots.slice(0, 120).join('') || 'fichier';
  const ascii = propre.replace(/[^\x20-\x7e]/g, '_').replace(/[%;,]/g, '_');
  const utf8 = encodeURIComponent(propre).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return 'attachment; filename="' + ascii + '"; filename*=UTF-8\'\'' + utf8;
}

/* ══ 2. LES MÉTADONNÉES RETIRÉES ══════════════════════════════════════════════════════════════════════════════════════ */
/* JPEG : on parcourt les segments de bout en bout. Gardés : JFIF (APP0), profil de couleur (APP2 « ICC_PROFILE »), Adobe (APP14 : sans
   lui un CMYK s'affiche à l'envers), tables et image. Retirés : APP1 (Exif, XMP), APP3 à APP13, APP15, commentaires, et l'index MPF
   (APP2 « MPF » : il désigne des images annexes qu'on ne garde pas). Tout ce qui suit la fin de l'image (EOI) est jeté. */
function nettoyerJpeg(b) {
  if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) throw erreur('type_refuse');
  const sortie = [Buffer.from([0xFF, 0xD8])];
  let i = 2;
  for (;;) {
    if (i >= b.length || b[i] !== 0xFF) throw erreur('type_refuse');        // entre deux segments on est toujours sur un marqueur
    while (i < b.length && b[i] === 0xFF) i++;                              // octets de remplissage
    if (i >= b.length) throw erreur('type_refuse');
    const m = b[i++];
    if (m === 0xD9) { sortie.push(Buffer.from([0xFF, 0xD9])); break; }
    if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { sortie.push(Buffer.from([0xFF, m])); continue; }
    if (i + 2 > b.length) throw erreur('type_refuse');
    const long = b.readUInt16BE(i);
    if (long < 2 || i + long > b.length) throw erreur('type_refuse');
    const segment = b.subarray(i - 2, i + long);                            // « FF m » + longueur + données
    if (m === 0xDA) {                                                       // SOS : l'en-tête du balayage, puis les données entropiques
      sortie.push(segment);
      let j = i + long;
      while (j < b.length) {
        if (b[j] === 0xFF) {
          const n = b[j + 1];
          if (n === 0x00 || (n >= 0xD0 && n <= 0xD7)) { j += 2; continue; }  // octet bourré, ou marqueur de redémarrage : toujours dans les données
          if (n === 0xFF) { j++; continue; }
          break;                                                              // un vrai marqueur : fin des données
        }
        j++;
      }
      if (j >= b.length) throw erreur('type_refuse');                         // aucune fin d'image : tronqué
      sortie.push(b.subarray(i + long, j));
      i = j; continue;
    }
    const retire = m === 0xE1 || (m >= 0xE3 && m <= 0xED) || m === 0xEF || m === 0xFE
      || (m === 0xE2 && b.toString('latin1', i + 2, i + 6) === 'MPF\0');
    if (!retire) sortie.push(segment);
    i += long;
  }
  return Buffer.concat(sortie);
}
/* PNG : retire eXIf, tEXt, iTXt, zTXt et tIME ; jette tout ce qui suit IEND ; refuse un fichier dont la structure ne se parcourt pas. */
const CHUNKS_PNG_RETIRES = new Set(['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME']);
function nettoyerPng(b) {
  if (b.length < 8 + 12 || !octets(b, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) throw erreur('type_refuse');
  const sortie = [b.subarray(0, 8)];
  let i = 8, premier = true, fini = false;
  while (i + 12 <= b.length) {
    const long = b.readUInt32BE(i), type = b.toString('latin1', i + 4, i + 8);
    if (long > 0x7FFFFFFF || i + 12 + long > b.length) throw erreur('type_refuse');
    if (premier && type !== 'IHDR') throw erreur('type_refuse');
    premier = false;
    if (!CHUNKS_PNG_RETIRES.has(type)) sortie.push(b.subarray(i, i + 12 + long));
    i += 12 + long;
    if (type === 'IEND') { fini = true; break; }
  }
  if (!fini) throw erreur('type_refuse');
  return Buffer.concat(sortie);
}
/* WebP : retire les blocs EXIF et XMP, baisse leurs drapeaux dans VP8X, recalcule la taille du conteneur RIFF. */
function nettoyerWebp(b) {
  if (b.length < 12 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') throw erreur('type_refuse');
  const reste = b.readUInt32LE(4), fin = reste + 8;
  if (reste < 4 || fin > b.length) throw erreur('type_refuse');
  const blocs = [];
  let i = 12;
  while (i + 8 <= fin) {
    const type = b.toString('latin1', i, i + 4), long = b.readUInt32LE(i + 4);
    if (i + 8 + long > fin) throw erreur('type_refuse');
    const pad = long & 1, total = 8 + long + pad;
    if (type !== 'EXIF' && type !== 'XMP ') {
      const bloc = Buffer.alloc(8 + long + pad);                            // le bourrage manquant en fin de fichier est rétabli
      b.copy(bloc, 0, i, i + 8 + long);
      if (type === 'VP8X' && long >= 1) bloc[8] &= ~(0x08 | 0x04) & 0xFF;
      blocs.push(bloc);
    }
    i += total;
  }
  const corps = Buffer.concat(blocs), tete = Buffer.alloc(12);
  tete.write('RIFF', 0, 'latin1'); tete.writeUInt32LE(4 + corps.length, 4); tete.write('WEBP', 8, 'latin1');
  return Buffer.concat([tete, corps]);
}
function retirerMetadonnees(mime, b) {
  if (mime === 'image/jpeg') return nettoyerJpeg(b);
  if (mime === 'image/png') return nettoyerPng(b);
  if (mime === 'image/webp') return nettoyerWebp(b);
  return b;
}

/* ══ 3. LE QUOTA PAR PERSONNE ═════════════════════════════════════════════════════════════════════════════════════════ */
/* ⛔ DEUX ENVOIS EN MÊME TEMPS NE DÉPASSENT PAS LE QUOTA ENSEMBLE : ce que la base dit avoir déjà (`utilise`) ne contient pas les envois
   EN COURS. On réserve donc la taille annoncée dès l'ouverture de l'envoi, on la rend à la fin (réussie ou non). Le processus est
   monothread : la réservation est atomique. */
function creerReservations({ max, utilise }) {
  const enCours = new Map();
  return {
    /* → { ok:true, liberer() } ou { ok:false, utilise, max } */
    essayer(proprio, octetsDemandes) {
      const deja = utilise(proprio), reserve = enCours.get(proprio) || 0;
      if (deja + reserve + octetsDemandes > max) return { ok: false, utilise: deja, max };
      enCours.set(proprio, reserve + octetsDemandes);
      let rendu = false;
      return { ok: true, liberer() {
        if (rendu) return; rendu = true;
        const r = (enCours.get(proprio) || 0) - octetsDemandes;
        if (r > 0) enCours.set(proprio, r); else enCours.delete(proprio);
      } };
    },
    reserve: (proprio) => enCours.get(proprio) || 0,
    taille: () => enCours.size,
  };
}

/* ══ 4. LE DISQUE : ÉCRIRE, LIRE PAR PLAGE, EFFACER, BALAYER ═════════════════════════════════════════════════════════════ */
async function ecrireTout(fh, buf, pos) {
  let fait = 0;
  while (fait < buf.length) { const r = await fh.write(buf, fait, buf.length - fait, pos + fait); fait += r.bytesWritten; }
}

function creerPieces({ dossier, cle, generation = 1, bloc = BLOC_DEFAUT }) {
  if (!dossier) throw new Error('dossier_requis');
  if (!Number.isInteger(generation) || generation < 1 || generation > 255) throw new Error('generation_invalide');
  if (!Number.isInteger(Math.log2(bloc)) || bloc < 256 || bloc > (1 << 24)) throw new Error('bloc_invalide');
  const log2Bloc = Math.log2(bloc);
  const cheminDe = (id) => { if (!ID_PIECE.test(String(id))) throw erreur('id_invalide'); return path.join(dossier, id.slice(2, 4), id); };
  const aad = (id, i, dernier) => Buffer.from(id + '|' + i + '|' + (dernier ? 'd' : 'n'), 'utf8');

  /* Une écriture en cours : on ajoute des morceaux, on `finir()` (sync, renommage) ou on `abandonner()` (rien ne reste). */
  async function ouvrirEcriture(id) {
    cheminDe(id);
    const tmpDir = path.join(dossier, 'tmp');
    await fsp.mkdir(tmpDir, { recursive: true, mode: 0o700 });
    const tmp = path.join(tmpDir, crypto.randomBytes(12).toString('hex'));
    const fh = await fsp.open(tmp, 'wx', 0o600);
    const k = cle(generation, id);
    let tampon = Buffer.alloc(0), indice = 0, taille = 0, pos = ENTETE, termine = false;
    try { await ecrireTout(fh, Buffer.alloc(ENTETE), 0); } catch (e) { await fh.close().catch(() => {}); await fsp.unlink(tmp).catch(() => {}); throw e; }
    async function sceller(clair, dernier) {
      const iv = crypto.randomBytes(IV), c = crypto.createCipheriv('aes-256-gcm', k, iv);
      c.setAAD(aad(id, indice, dernier));
      const sortie = Buffer.concat([iv, c.update(clair), c.final(), c.getAuthTag()]);
      await ecrireTout(fh, sortie, pos);
      pos += sortie.length; indice++;
    }
    return {
      taille: () => taille,
      async ajouter(morceau) {
        taille += morceau.length;
        tampon = tampon.length ? Buffer.concat([tampon, morceau]) : morceau;
        /* ⛔ un bloc PLEIN n'est écrit que quand un octet de plus arrive : le dernier bloc d'un fichier (même plein) porte le drapeau « dernier » */
        while (tampon.length > bloc) { await sceller(tampon.subarray(0, bloc), false); tampon = tampon.subarray(bloc); }
      },
      async finir() {
        if (taille === 0) throw erreur('vide');
        await sceller(tampon, true);
        const e = Buffer.alloc(ENTETE);
        MAGIE.copy(e, 0); e[4] = VERSION_FORMAT; e[5] = generation; e[6] = log2Bloc; e.writeBigUInt64BE(BigInt(taille), 8);
        await ecrireTout(fh, e, 0);
        await fh.sync(); await fh.close(); termine = true;
        const dest = cheminDe(id);
        await fsp.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
        await fsp.rename(tmp, dest);
        return { taille };
      },
      async abandonner() { if (!termine) { await fh.close().catch(() => {}); await fsp.unlink(tmp).catch(() => {}); } },
    };
  }

  /* Reçoit une pièce depuis un flux d'octets : juge le type sur les premiers octets (avant d'avoir tout lu), applique le plafond AU FIL
     DE L'EAU (un flux qui dépasse `max` s'arrête là), retire les métadonnées d'une image, scelle, renomme.
     → { taille, mime } — `taille` est celle de ce qui est RANGÉ (après retrait des métadonnées). Lève : vide, type_refuse, trop_gros, incomplet. */
  async function deposer({ id, genre, flux, max, attendu }) {
    const it = flux[Symbol.asyncIterator]();
    let termine = false;
    const suivant = async () => {
      const r = await it.next();
      if (r.done) { termine = true; return null; }
      return Buffer.isBuffer(r.value) ? r.value : Buffer.from(r.value);
    };
    let tete = Buffer.alloc(0);
    while (tete.length < 16 && !termine) {
      const m = await suivant();
      if (m) { tete = Buffer.concat([tete, m]); if (tete.length > max) throw erreur('trop_gros'); }
    }
    if (!tete.length) throw erreur('vide');
    const t = detecter(genre, tete);
    if (!t) throw erreur('type_refuse');
    let total = tete.length;
    if (t.famille === 'image') {
      /* une image est tenue en mémoire (12 Mo au plus) le temps d'en retirer les métadonnées */
      const parts = [tete];
      while (!termine) { const m = await suivant(); if (!m) break; total += m.length; if (total > max) throw erreur('trop_gros'); parts.push(m); }
      if (attendu !== undefined && total !== attendu) throw erreur('incomplet');
      const propre = retirerMetadonnees(t.mime, Buffer.concat(parts));
      const w = await ouvrirEcriture(id);
      try { await w.ajouter(propre); const r = await w.finir(); return { taille: r.taille, mime: t.mime }; }
      catch (e) { await w.abandonner(); throw e; }
    }
    /* un son ou un fichier passe en flux : jamais plus d'un bloc en mémoire */
    const w = await ouvrirEcriture(id);
    try {
      await w.ajouter(tete);
      while (!termine) { const m = await suivant(); if (!m) break; total += m.length; if (total > max) throw erreur('trop_gros'); await w.ajouter(m); }
      if (attendu !== undefined && total !== attendu) throw erreur('incomplet');
      const r = await w.finir();
      return { taille: r.taille, mime: t.mime };
    } catch (e) { await w.abandonner(); throw e; }
  }

  /* La taille CLAIRE lue dans l'en-tête (sans rien déchiffrer), ou `null` si le fichier manque ou n'est pas une pièce. */
  async function taille(id) {
    const chemin = cheminDe(id);
    let fh;
    try { fh = await fsp.open(chemin, 'r'); } catch (e) { return null; }
    try {
      const e = Buffer.alloc(ENTETE), r = await fh.read(e, 0, ENTETE, 0);
      if (r.bytesRead < ENTETE || !e.subarray(0, 4).equals(MAGIE) || e[4] !== VERSION_FORMAT) return null;
      return Number(e.readBigUInt64BE(8));
    } finally { await fh.close(); }
  }

  /* Lit les octets CLAIRS [debut, fin] (inclusifs) en ne déchiffrant que les blocs touchés. Générateur asynchrone : un client qui s'en va
     arrête la lecture. Lève `piece_corrompue` dès qu'un bloc ne s'authentifie pas, que l'en-tête ment ou que la taille du fichier ne colle pas. */
  async function* lire(id, debut, fin) {
    const chemin = cheminDe(id);                                            // ⛔ un identifiant mal formé est refusé AVANT de toucher au disque
    let fh;
    try { fh = await fsp.open(chemin, 'r'); } catch (e) { throw erreur('introuvable'); }
    try {
      const st = await fh.stat(), e = Buffer.alloc(ENTETE), r = await fh.read(e, 0, ENTETE, 0);
      if (r.bytesRead < ENTETE || !e.subarray(0, 4).equals(MAGIE) || e[4] !== VERSION_FORMAT) throw erreur('piece_corrompue');
      const gen = e[5], lb = e[6];
      if (lb < 8 || lb > 24) throw erreur('piece_corrompue');
      const bs = 2 ** lb, total = Number(e.readBigUInt64BE(8)), nb = Math.ceil(total / bs);
      if (!(total > 0) || st.size !== ENTETE + total + nb * (IV + ETIQUETTE)) throw erreur('piece_corrompue');
      const d0 = debut === undefined ? 0 : debut, f0 = fin === undefined ? total - 1 : fin;
      if (!(d0 >= 0) || !(f0 < total) || d0 > f0) throw erreur('plage_invalide');
      let k;
      try { k = cle(gen, id); } catch (er) { throw erreur('piece_corrompue'); }
      for (let i = Math.floor(d0 / bs); i <= Math.floor(f0 / bs); i++) {
        const claire = Math.min(bs, total - i * bs), tampon = Buffer.alloc(IV + claire + ETIQUETTE);
        const lu = await fh.read(tampon, 0, tampon.length, ENTETE + i * (IV + bs + ETIQUETTE));
        if (lu.bytesRead !== tampon.length) throw erreur('piece_corrompue');
        const dec = crypto.createDecipheriv('aes-256-gcm', k, tampon.subarray(0, IV));
        dec.setAAD(aad(id, i, i === nb - 1)); dec.setAuthTag(tampon.subarray(IV + claire));
        let clair;
        try { clair = Buffer.concat([dec.update(tampon.subarray(IV, IV + claire)), dec.final()]); } catch (er) { throw erreur('piece_corrompue'); }
        const a = Math.max(d0, i * bs) - i * bs, z = Math.min(f0, i * bs + claire - 1) - i * bs;
        yield clair.subarray(a, z + 1);
      }
    } finally { await fh.close(); }
  }

  async function existe(id) { try { await fsp.access(cheminDe(id)); return true; } catch (e) { return false; } }
  /* Efface le fichier ; `true` s'il y en avait un. Un fichier déjà absent n'est pas une erreur (on efface pour que plus rien ne reste). */
  async function effacer(id) { try { await fsp.unlink(cheminDe(id)); return true; } catch (e) { if (e && e.code === 'ENOENT') return false; throw e; } }

  /* Tous les fichiers de pièces présents sur le disque : { id, chemin, mtime } — pour que le balayeur efface ceux que plus aucune ligne ne réclame. */
  async function* lister() {
    let dirs; try { dirs = await fsp.readdir(dossier); } catch (e) { return; }
    for (const d of dirs) {
      if (!/^[0-9a-f]{2}$/.test(d)) continue;
      let fichiers; try { fichiers = await fsp.readdir(path.join(dossier, d)); } catch (e) { continue; }
      for (const f of fichiers) {
        if (!ID_PIECE.test(f)) continue;
        const chemin = path.join(dossier, d, f);
        let st; try { st = await fsp.stat(chemin); } catch (e) { continue; }
        yield { id: f, chemin, mtime: st.mtimeMs };
      }
    }
  }
  /* Les fichiers temporaires d'un envoi interrompu par un arrêt du processus. */
  async function nettoyerTmp(ageMs, maintenant = Date.now()) {
    const tmpDir = path.join(dossier, 'tmp');
    let n = 0, noms; try { noms = await fsp.readdir(tmpDir); } catch (e) { return 0; }
    for (const f of noms) {
      try { const st = await fsp.stat(path.join(tmpDir, f)); if (maintenant - st.mtimeMs > ageMs) { await fsp.unlink(path.join(tmpDir, f)); n++; } } catch (e) { /* déjà parti */ }
    }
    return n;
  }

  return { deposer, taille, lire, existe, effacer, lister, nettoyerTmp, ouvrirEcriture, chemin: cheminDe, bloc, dossier };
}

module.exports = {
  creerPieces, creerReservations, detecter, enLigne, dispositionDe, retirerMetadonnees, nettoyerJpeg, nettoyerPng, nettoyerWebp, mimeImage, mimeAudio,
  ID_PIECE, GENRES, MIME_IMAGES, MIME_AUDIO, BLOC_DEFAUT, ENTETE, IV, ETIQUETTE,
};
