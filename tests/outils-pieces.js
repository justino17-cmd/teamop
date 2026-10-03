/* ══ OUTILS COMMUNS DES BANCS DES PIÈCES (tests/test-942, 943, 944, la sonde, les mutations) ═════════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il fabrique :
 *   · des images, des sons et des fichiers dont la STRUCTURE est vraie — assez pour que `server-msg/pieces.js` les parcoure de bout en
 *     bout — avec des CANARIS posés dans leurs métadonnées (GPS, XMP, IPTC, commentaire, texte PNG, EXIF WebP) ;
 *   · un PNG réellement décodable (il se dessine dans un vrai navigateur : la sonde le prend pour une photo) ;
 *   · les gestes HTTP d'un dépôt de pièce (corps binaire, `Content-Length`, `X-OPM`, `Origin`), par `fetch` ou par `http` brut.
 * ⛔ Un canari est une chaîne qu'on cherche ensuite dans les octets rangés : si le test affirme « absent », il prouve d'abord que le
 * canari était PRÉSENT dans ce qu'il a envoyé (une assertion sur un ensemble vide passe et ne prouve rien). */
'use strict';
const crypto = require('crypto'), zlib = require('zlib'), http = require('http');

/* ── CRC-32 (PNG) ── */
const TABLE_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

/* ── PNG : de vrais morceaux (longueur, type, données, CRC) ── */
function morceauPng(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'latin1'), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
/* Un PNG décodable. `avant` : des morceaux [type, Buffer] posés entre IHDR et IDAT ; `apres` : des octets collés après IEND. */
function png({ w = 8, h = 8, couleur = [200, 40, 40], avant = [], apres = Buffer.alloc(0) } = {}) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const ligne = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { ligne[1 + x * 3] = couleur[0]; ligne[2 + x * 3] = couleur[1]; ligne[3 + x * 3] = couleur[2]; }
  const brut = Buffer.concat(Array.from({ length: h }, () => ligne));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), morceauPng('IHDR', ihdr), ...avant.map(([t, d]) => morceauPng(t, d)),
    morceauPng('IDAT', zlib.deflateSync(brut)), morceauPng('IEND', Buffer.alloc(0)), apres]);
}

/* ── JPEG : une structure vraie (pas forcément décodable) ── */
const seg = (marqueur, data) => { const l = Buffer.alloc(4); l[0] = 0xFF; l[1] = marqueur; l.writeUInt16BE(data.length + 2, 2); return Buffer.concat([l, data]); };
function jpeg({ exif, xmp, iptc, com, icc, mpf, adobe = true, apres = Buffer.alloc(0), donnees } = {}) {
  const entropie = donnees || Buffer.concat([Buffer.from([0x12, 0x34, 0xFF, 0x00, 0x56]), Buffer.from([0xFF, 0xD0]), Buffer.from([0x78, 0xFF, 0x00, 0x9A, 0xBC])]);   // un octet bourré (FF00) et un redémarrage (RST0) : dans les données
  const parts = [Buffer.from([0xFF, 0xD8]), seg(0xE0, Buffer.concat([Buffer.from('JFIF\0', 'latin1'), Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0])]))];
  if (exif) parts.push(seg(0xE1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), Buffer.from(exif, 'latin1')])));
  if (xmp) parts.push(seg(0xE1, Buffer.concat([Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'latin1'), Buffer.from(xmp, 'latin1')])));
  if (iptc) parts.push(seg(0xED, Buffer.concat([Buffer.from('Photoshop 3.0\0', 'latin1'), Buffer.from(iptc, 'latin1')])));
  if (com) parts.push(seg(0xFE, Buffer.from(com, 'latin1')));
  if (icc) parts.push(seg(0xE2, Buffer.concat([Buffer.from('ICC_PROFILE\0', 'latin1'), Buffer.from([1, 1]), Buffer.from(icc, 'latin1')])));
  if (mpf) parts.push(seg(0xE2, Buffer.concat([Buffer.from('MPF\0', 'latin1'), Buffer.from(mpf, 'latin1')])));
  if (adobe) parts.push(seg(0xEE, Buffer.concat([Buffer.from('Adobe\0', 'latin1'), Buffer.from([0, 100, 0, 0, 0, 0, 1])])));
  parts.push(seg(0xDB, Buffer.concat([Buffer.from([0]), Buffer.alloc(64, 8)])));
  parts.push(seg(0xC0, Buffer.from([8, 0, 8, 0, 8, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])));
  parts.push(seg(0xC4, Buffer.concat([Buffer.from([0x00]), Buffer.alloc(16, 0), Buffer.from([0])])));
  parts.push(seg(0xDA, Buffer.from([3, 1, 0, 2, 0x11, 3, 0x11, 0, 63, 0])));
  parts.push(entropie, Buffer.from([0xFF, 0xD9]), apres);
  return Buffer.concat(parts);
}
const JPEG_ENTROPIE = Buffer.concat([Buffer.from([0x12, 0x34, 0xFF, 0x00, 0x56]), Buffer.from([0xFF, 0xD0]), Buffer.from([0x78, 0xFF, 0x00, 0x9A, 0xBC])]);

/* ── WebP : RIFF, VP8X (drapeaux EXIF 0x08 et XMP 0x04), un morceau d'image de longueur IMPAIRE (bourrage), EXIF, XMP ── */
function webp({ exif, xmp, vp8x = true } = {}) {
  const morceau = (type, data) => { const e = Buffer.alloc(8); e.write(type, 0, 'latin1'); e.writeUInt32LE(data.length, 4); return Buffer.concat([e, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const parts = [];
  if (vp8x) { const d = Buffer.alloc(10); d[0] = (exif ? 0x08 : 0) | (xmp ? 0x04 : 0) | 0x10; d[4] = 7; d[7] = 7; parts.push(morceau('VP8X', d)); }
  parts.push(morceau('VP8 ', Buffer.from('image-webp-factice-impair', 'latin1')));   // 25 octets : impair
  if (exif) parts.push(morceau('EXIF', Buffer.from(exif, 'latin1')));
  if (xmp) parts.push(morceau('XMP ', Buffer.from(xmp, 'latin1')));
  const corps = Buffer.concat(parts), tete = Buffer.alloc(12);
  tete.write('RIFF', 0, 'latin1'); tete.writeUInt32LE(4 + corps.length, 4); tete.write('WEBP', 8, 'latin1');
  return Buffer.concat([tete, corps]);
}
const gif = (corps = 'factice') => Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.from([1, 0, 1, 0, 0, 0, 0]), Buffer.from(corps, 'latin1'), Buffer.from([0x3B])]);

/* ── sons et fichiers ── */
const alea = (n) => crypto.randomBytes(n);
const webm = (n = 3000) => Buffer.concat([Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), alea(n)]);
const ogg = (n = 3000) => Buffer.concat([Buffer.from('OggS', 'latin1'), alea(n)]);
const mp4 = (n = 3000) => Buffer.concat([Buffer.from([0, 0, 0, 0x20]), Buffer.from('ftypM4A ', 'latin1'), alea(n)]);
const mp3 = (n = 3000) => Buffer.concat([Buffer.from('ID3', 'latin1'), alea(n)]);
const mp3Trame = (n = 3000) => Buffer.concat([Buffer.from([0xFF, 0xFB, 0x90, 0x00]), alea(n)]);
const pdf = (n = 500) => Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), alea(n)]);
const svg = (corps = '<script>alert(1)</script>') => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' + corps + '</svg>', 'utf8');
const html = (corps = '<script>alert(1)</script>') => Buffer.from('<!doctype html><html><body>' + corps + '</body></html>', 'utf8');

/* ── un flux qui ne se termine jamais, et compte ce qu'on lui a pris : « arrêt dès que la taille dépasse le maximum » ── */
function fluxSansFin(morceau = 4096, debut = Buffer.alloc(0)) {
  const etat = { pris: 0 };
  let premier = true;
  return { etat, flux: { [Symbol.asyncIterator]() { return { next: async () => { const b = premier && debut.length ? (premier = false, debut) : Buffer.alloc(morceau, 7); etat.pris += b.length; return { done: false, value: b }; } }; } } };
}
/* un flux fini, en morceaux de `n` octets */
function fluxDe(buf, n = 7000) { return { async *[Symbol.asyncIterator]() { for (let i = 0; i < buf.length; i += n) yield buf.subarray(i, Math.min(buf.length, i + n)); } }; }
/* un flux fini qui s'ARRÊTE après `avant` octets tant que `porte` (une promesse) n'est pas tenue : un dépôt « en cours » dont le banc décide quand il finit */
function fluxRetenu(buf, avant, porte, n = 7000) {
  return { async *[Symbol.asyncIterator]() {
    yield buf.subarray(0, avant);
    await porte;
    for (let i = avant; i < buf.length; i += n) yield buf.subarray(i, Math.min(buf.length, i + n));
  } };
}

/* ── les images « BOURRÉES » de morceaux vides (relecture du gardien, B1) : n segments JPEG APP0 vides (`FF E0 00 02`), n morceaux PNG `abCd` de longueur nulle, n blocs WebP `JUNK` vides.
      À 2,9 M de segments un JPEG pèse 11 Mo : l'attaque qui portait le service de 90 à 1 200 Mo. `marqueur` : l'octet du segment JPEG (0xE0 : APP0 ; 0xE3 : APP3, retiré à coup sûr). ── */
function jpegBourre(n, marqueur = 0xE0) {
  const base = jpeg(), i = base.indexOf(Buffer.from([0xFF, 0xDB])), mid = Buffer.alloc(4 * n), seg = Buffer.from([0xFF, marqueur, 0x00, 0x02]);
  for (let k = 0; k < n; k++) seg.copy(mid, 4 * k);
  return Buffer.concat([base.subarray(0, i), mid, base.subarray(i)]);
}
function pngBourre(n) {
  const base = png(), i = base.indexOf(Buffer.from('IDAT', 'latin1')) - 4, mid = Buffer.alloc(12 * n), ch = Buffer.alloc(12);
  ch.write('abCd', 4, 'latin1');
  for (let k = 0; k < n; k++) ch.copy(mid, 12 * k);
  return Buffer.concat([base.subarray(0, i), mid, base.subarray(i)]);
}
function webpBourre(n) {
  const w = webp(), mid = Buffer.alloc(8 * n), ch = Buffer.alloc(8);
  ch.write('JUNK', 0, 'latin1');
  for (let k = 0; k < n; k++) ch.copy(mid, 8 * k);
  const corps = Buffer.concat([w.subarray(12), mid]), tete = Buffer.alloc(12);
  tete.write('RIFF', 0, 'latin1'); tete.writeUInt32LE(4 + corps.length, 4); tete.write('WEBP', 8, 'latin1');
  return Buffer.concat([tete, corps]);
}

/* ── le geste HTTP d'un dépôt : corps binaire, Content-Length (posé par fetch pour un Buffer), X-OPM, Origin, cookie du client ── */
async function deposer(c, { conv, genre, nom, corps, entetes, query } = {}) {
  const q = new URLSearchParams();
  if (conv) q.set('conv', conv);
  if (genre) q.set('genre', genre);
  if (nom !== undefined) q.set('nom', nom);
  for (const [k, val] of Object.entries(query || {})) q.set(k, val);
  const h = Object.assign({ 'Content-Type': 'application/octet-stream', Origin: c.base, 'X-OPM': '1' }, entetes || {});
  const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
  const r = await fetch(c.base + '/api/pieces?' + q.toString(), { method: 'POST', headers: h, body: corps });
  let j = null, txt = ''; try { txt = await r.text(); j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
  return { code: r.status, j, txt, h: r.headers };
}
/* Lire une pièce (l'en-tête `Range` en option). Rend aussi les OCTETS. */
async function lirePiece(c, id, { range, entetes, methode = 'GET' } = {}) {
  const h = Object.assign({}, entetes || {});
  const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
  if (range) h.Range = range;
  const r = await fetch(c.base + '/api/pieces/' + id, { method: methode, headers: h });
  const buf = Buffer.from(await r.arrayBuffer());
  return { code: r.status, h: r.headers, buf, txt: buf.length < 4096 ? buf.toString('utf8') : '' , j: (() => { try { return JSON.parse(buf.toString('utf8')); } catch (e) { return null; } })() };
}
/* Un dépôt par `http` brut : pour poser des en-têtes que `fetch` refuse ou réécrit (Content-Length absent, Transfer-Encoding: chunked, longueur mensongère). */
function deposerBrut(c, { chemin, entetes, corps, sansLongueur = false, morceaux, delaiMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(c.base);
    const h = Object.assign({ 'Content-Type': 'application/octet-stream', Origin: c.base, 'X-OPM': '1' }, entetes || {});
    const ck = c.enteteCookie(); if (ck) h.Cookie = ck;
    if (corps && !sansLongueur && h['Content-Length'] === undefined) h['Content-Length'] = String(corps.length);
    /* `agent: false` : une connexion à soi, fermée après la réponse. Les requêtes de ce helper MENTENT exprès (longueur annoncée plus grande que le corps envoyé) — sur une connexion
       réutilisée, la requête suivante serait avalée par le reste du corps promis et le banc verrait « socket hang up » un essai sur deux. */
    const req = http.request({ host: u.hostname, port: u.port, method: 'POST', path: chemin, headers: h, agent: false }, (res) => {
      const parts = []; res.on('data', d => parts.push(d)); res.on('end', () => { clearTimeout(delai); const txt = Buffer.concat(parts).toString('utf8'); let j = null; try { j = JSON.parse(txt); } catch (e) { j = null; } resolve({ code: res.statusCode, j, txt, h: res.headers }); });
    });
    /* ⛔ UN SERVICE QUI N'A PAS REFUSÉ ATTEND LE RESTE D'UN CORPS ANNONCÉ ÉNORME, et sans délai le banc se figeait : les mutations P13 et P16 « tombaient » en étant tuées par le lanceur au bout de cinq
       minutes, et la CI aurait attendu le délai du job. Le délai fait de cette attente une RÉPONSE (code 0, erreur « delai »), donc un ✗ qui dit ce qui s'est passé. */
    const delai = setTimeout(() => { req.destroy(); resolve({ code: 0, j: { error: 'delai' }, txt: 'aucune réponse en ' + delaiMs + ' ms', h: {} }); }, delaiMs);
    req.on('error', (e) => { clearTimeout(delai); reject(e); });
    if (morceaux) { (async () => { for (const m of morceaux) { req.write(m); await new Promise(r => setTimeout(r, 5)); } req.end(); })(); }
    else if (corps) req.end(corps); else req.end();
  });
}

module.exports = { crc32, png, jpeg, JPEG_ENTROPIE, webp, gif, webm, ogg, mp4, mp3, mp3Trame, pdf, svg, html, alea, fluxSansFin, fluxDe, fluxRetenu, jpegBourre, pngBourre, webpBourre, deposer, lirePiece, deposerBrut, morceauPng };
