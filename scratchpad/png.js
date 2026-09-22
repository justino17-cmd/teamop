/* Décodeur PNG minimal (sans dépendance) — sert à lire les VRAIS pixels peints par Chrome.
   ⛔ Mesurer un dégradé autrement que sur des pixels, c'est le recalculer soi-même : on
   refait alors l'erreur du navigateur au lieu de la constater. */
const zlib = require('zlib');
function decoder(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
  let o = 8, w = 0, h = 0, prof = 0, type = 0, idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), tag = buf.toString('ascii', o + 4, o + 8);
    const d = buf.slice(o + 8, o + 8 + len);
    if (tag === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; type = d[9];
      if (prof !== 8) throw new Error('profondeur ' + prof + ' non gérée'); }
    else if (tag === 'IDAT') idat.push(d);
    else if (tag === 'IEND') break;
    o += 12 + len;
  }
  const canaux = type === 6 ? 4 : type === 2 ? 3 : type === 0 ? 1 : type === 4 ? 2 : 0;
  if (!canaux) throw new Error('type de couleur ' + type + ' non géré');
  const brut = zlib.inflateSync(Buffer.concat(idat));
  const ligne = w * canaux, out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(ligne), p = 0;
  for (let y = 0; y < h; y++) {
    const f = brut[p++]; const cur = Buffer.from(brut.slice(p, p + ligne)); p += ligne;
    for (let i = 0; i < ligne; i++) {
      const a = i >= canaux ? cur[i - canaux] : 0, b = prev[i], c = i >= canaux ? prev[i - canaux] : 0;
      if (f === 1) cur[i] = (cur[i] + a) & 255;
      else if (f === 2) cur[i] = (cur[i] + b) & 255;
      else if (f === 3) cur[i] = (cur[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        cur[i] = (cur[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255; }
    }
    for (let x = 0; x < w; x++) { const s = x * canaux, d = (y * w + x) * 4;
      if (canaux >= 3) { out[d] = cur[s]; out[d + 1] = cur[s + 1]; out[d + 2] = cur[s + 2]; out[d + 3] = canaux === 4 ? cur[s + 3] : 255; }
      else { out[d] = out[d + 1] = out[d + 2] = cur[s]; out[d + 3] = canaux === 2 ? cur[s + 1] : 255; } }
    prev = cur;
  }
  return { w, h, data: out };
}
const px = (img, x, y) => { x = Math.max(0, Math.min(img.w - 1, Math.round(x))); y = Math.max(0, Math.min(img.h - 1, Math.round(y)));
  const i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
/* Luminance relative WCAG */
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const contraste = (a, b) => { const L1 = lum(a), L2 = lum(b); const h = Math.max(L1, L2), l = Math.min(L1, L2);
  return Math.round(((h + .05) / (l + .05)) * 100) / 100; };
module.exports = { decoder, px, lum, contraste };
