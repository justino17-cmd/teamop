/* ══ LE SCELLÉ — AES-256-GCM, CLÉ MAÎTRE HORS BASE ═════════════════════════════════════════════════════════════════════════════
 * Tout ce qui est personnel et qui dort sur le disque (les PDF, les fiches des signataires) est scellé. La clé maître vient de
 * l'environnement ; deux sous-clés en dérivent (HKDF) pour ne pas servir à deux usages. Le « contexte » (identifiant de la demande,
 * nature de la pièce) entre dans l'authentification : un fichier recopié sous un autre nom ne s'ouvre pas.
 * Format : version(1) | iv(12) | tag(16) | chiffré.
 */
'use strict';
const crypto = require('crypto');

function creerScelle(kek) {
  if (!Buffer.isBuffer(kek) || kek.length !== 32) throw new Error('clé maître : 32 octets attendus');
  const sous = (but) => Buffer.from(crypto.hkdfSync('sha256', kek, Buffer.alloc(0), 'opcourrier:' + but, 32));
  const cles = { pdf: sous('pdf'), json: sous('json') };
  function sceller(buf, but, contexte) {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', cles[but], iv);
    c.setAAD(Buffer.from(String(contexte)));
    const ct = Buffer.concat([c.update(buf), c.final()]);
    return Buffer.concat([Buffer.from([1]), iv, c.getAuthTag(), ct]);
  }
  function ouvrir(buf, but, contexte) {
    if (!Buffer.isBuffer(buf) || buf.length < 29 || buf[0] !== 1) throw new Error('scellé illisible');
    const d = crypto.createDecipheriv('aes-256-gcm', cles[but], buf.subarray(1, 13));
    d.setAAD(Buffer.from(String(contexte)));
    d.setAuthTag(buf.subarray(13, 29));
    return Buffer.concat([d.update(buf.subarray(29)), d.final()]);
  }
  return {
    sceller, ouvrir,
    scellerJSON: (o, ctx) => sceller(Buffer.from(JSON.stringify(o)), 'json', ctx),
    ouvrirJSON: (b, ctx) => JSON.parse(ouvrir(b, 'json', ctx).toString('utf8')),
  };
}
module.exports = { creerScelle };
