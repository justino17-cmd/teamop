/* ══ OUTILS COMMUNS DES BANCS DES NOTIFICATIONS PUSH (tests/test-955 à 958, les mutations, la sonde) ═══════════════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il fabrique :
 *   · un APPAREIL de banc : une vraie paire de clés P-256 et un secret d'authentification, comme un navigateur en fabrique pour un abonnement push ;
 *   · de quoi DÉCHIFFRER ce que le service envoie (RFC 8291, « aes128gcm ») avec les clés de l'appareil : c'est la seule preuve de ce qui part VRAIMENT
 *     (un banc qui vérifie « le service a appelé le transport » ne dit rien de la charge) ;
 *   · de quoi vérifier la signature VAPID (le jeton ES256 de l'en-tête `Authorization`) contre la clé publique de l'instance ;
 *   · un FAUX SERVICE PUSH local (http, boucle locale) qui note chaque envoi, répond le statut qu'on lui dit, et sait attendre un envoi AU GESTE.
 * ⛔ Un banc qui attend une notification vise le GESTE (la réception), jamais le chronomètre : `attendre` sonde, le délai n'est qu'un plafond. */
'use strict';
const crypto = require('crypto'), http = require('http'), net = require('net');

/* ── un appareil : ce qu'un navigateur garde en secret, et ce qu'il envoie au service dans `PushSubscription.toJSON()` ── */
function appareil(endpoint) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return {
    ecdh, auth, publique: ecdh.getPublicKey(),
    sub: { endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } },
  };
}

/* ── RFC 8291 : déchiffre un corps `aes128gcm` avec la clé privée de l'appareil et son secret d'authentification → le texte en clair, ou lève ── */
function dechiffrer(app, corps) {
  const salt = corps.subarray(0, 16), rs = corps.readUInt32BE(16), idlen = corps[20];
  const cleServeur = corps.subarray(21, 21 + idlen), chiffre = corps.subarray(21 + idlen);
  if (idlen !== 65) throw new Error('identifiant de clé inattendu (' + idlen + ')');
  if (rs < 18) throw new Error('taille d\'enregistrement absurde');
  const secret = app.ecdh.computeSecret(cleServeur);
  const info = Buffer.concat([Buffer.from('WebPush: info\0', 'latin1'), app.publique, cleServeur]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', secret, app.auth, info, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'latin1'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'latin1'), 12));
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(chiffre.subarray(chiffre.length - 16));
  const clair = Buffer.concat([d.update(chiffre.subarray(0, chiffre.length - 16)), d.final()]);
  let i = clair.length - 1;
  while (i >= 0 && clair[i] === 0) i--;
  if (i < 0 || clair[i] !== 2) throw new Error('séparateur de fin d\'enregistrement absent');
  return clair.subarray(0, i).toString('utf8');
}

/* ── le jeton VAPID de l'en-tête `Authorization: vapid t=<jwt>, k=<clé>` : lu, et sa signature vérifiée contre la clé publique ── */
function lireVapid(entetes) {
  const brut = String(entetes.Authorization || entetes.authorization || '');
  const m = /^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/.exec(brut);
  if (!m) return null;
  const [t, c, s] = m[1].split('.');
  const entete = JSON.parse(Buffer.from(t, 'base64url').toString('utf8')), charge = JSON.parse(Buffer.from(c, 'base64url').toString('utf8'));
  return { entete, charge, cle: m[2], signature: Buffer.from(s, 'base64url'), signe: t + '.' + c };
}
function signatureVapidValide(v, clePublique) {
  if (!v || v.entete.alg !== 'ES256' || v.signature.length !== 64) return false;
  const pub = Buffer.from(clePublique, 'base64url');
  const jwk = { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33, 65).toString('base64url') };
  const cle = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return crypto.verify('sha256', Buffer.from(v.signe), { key: cle, dsaEncoding: 'ieee-p1363' }, v.signature);
}

/* ── un faux service push (http, boucle locale). `reponse` : le statut rendu (ou une fonction (requete) → statut) ; chaque envoi est NOTÉ ── */
async function fauxServicePush(opts) {
  const o = Object.assign({ statut: 201 }, opts || {});
  const etat = { envois: [], statut: o.statut, delaiMs: 0, cible: null, redirections: [] };
  const srv = http.createServer((req, res) => {
    const morceaux = [];
    req.on('data', d => morceaux.push(d));
    req.on('end', () => {
      const e = { chemin: req.url, methode: req.method, entetes: req.headers, corps: Buffer.concat(morceaux), t: Date.now() };
      etat.envois.push(e);
      const rep = () => {
        const st = typeof etat.statut === 'function' ? etat.statut(e) : etat.statut;
        if (st === 'silence') return;               // ne répond jamais : pour le délai
        if (st === 'coupe') { req.socket.destroy(); return; }
        if (typeof st === 'object' && st.redirige) { res.writeHead(st.code || 302, { Location: st.redirige }); res.end(); return; }
        res.writeHead(st, { 'Content-Type': 'text/plain' }); res.end(st === 201 ? '' : 'refus');
      };
      if (etat.delaiMs) setTimeout(rep, etat.delaiMs); else rep();
    });
  });
  const port = await new Promise((ok) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  etat.port = port; etat.hote = '127.0.0.1:' + port; etat.base = 'http://127.0.0.1:' + port;
  etat.endpoint = (id) => etat.base + '/push/' + (id || crypto.randomBytes(8).toString('hex'));
  etat.fermer = () => new Promise(r => { try { srv.closeAllConnections(); } catch (e) { /* déjà fermé */ } srv.close(() => r()); });
  /* attend le N-ième envoi reçu (AU GESTE) */
  etat.attendre = async (n = 1, plafond = 8000) => {
    const debut = Date.now();
    while (etat.envois.length < n) { if (Date.now() - debut > plafond) return null; await new Promise(r => setTimeout(r, 10)); }
    return etat.envois[n - 1];
  };
  return etat;
}

module.exports = { appareil, dechiffrer, lireVapid, signatureVapidValide, fauxServicePush };
