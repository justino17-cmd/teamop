#!/usr/bin/env node
/* ══ VÉRIFIER LE RELAIS D'APPELS (coturn) — UN PETIT CLIENT TURN ÉCRIT À LA MAIN, ET CE QU'IL PROUVE ═══════════════════════════════════════════
 *
 * Usage, sur le VPS, en root (le fichier de l'instance n'est lisible que par root et par le service) :
 *
 *      node /opt/opmsg/<instance>/current/outils/verifier-relais.js beta        (ou prod)
 *
 * Ce que ça répond, ligne à ligne, ✓ ou ✗ :
 *   · le relais ACCEPTE nos identifiants (ceux que `GET /api/ice` fabriquerait pour une personne) : une allocation réussit ;
 *   · il REFUSE un mauvais identifiant (401) et un identifiant PÉRIMÉ (l'échéance est dans le nom d'utilisateur) ;
 *   · il REFUSE de relayer vers la machine elle-même et vers les réseaux privés (127.0.0.1, 10/8, 172.16/12, 192.168/16, 169.254.169.254, 100.64/10) — sans cela un appel pourrait demander au relais
 *     d'envoyer des paquets à `127.0.0.1:8080` (OP GESTION) ou au service de métadonnées de l'hébergeur ;
 *   · il ACCEPTE une adresse publique (la contre-épreuve : un relais qui refuse tout serait « sûr » et inutile) ;
 *   · en TLS (5349), son certificat est valide pour le nom annoncé aux pages.
 *
 * ⛔ AUCUN SECRET NE S'AFFICHE : ni le secret partagé, ni un identifiant fabriqué, ni l'adresse de relais obtenue. Justin recolle toutes les sorties du VPS dans la conversation (règle du 24 septembre
 * 2026) : la sortie de ce fichier ne porte que des ✓/✗ et des codes de réponse. Une erreur de configuration dit CE QUI manque, jamais la valeur.
 *
 * Le client lui-même (messages STUN/TURN construits et lus à la main : RFC 5389 et RFC 5766, identifiants à long terme calculés avec MD5, intégrité HMAC-SHA1) sert aussi à la SONDE du dépôt
 * (`tests/sonde-opmessages-relais.js`), qui l'oppose à un VRAI coturn. Aucune dépendance : `dgram`, `net`, `tls`, `crypto`.
 */
'use strict';
const dgram = require('dgram'), net = require('net'), tls = require('tls'), crypto = require('crypto'), fs = require('fs');

const COOKIE = 0x2112A442;
const TYPE = { ALLOCATION: 0x0003, RAFRAICHIR: 0x0004, PERMISSION: 0x0008 };
const ATTR = { NOM: 0x0006, INTEGRITE: 0x0008, ERREUR: 0x0009, DUREE: 0x000d, PAIR: 0x0012, DOMAINE: 0x0014, NONCE: 0x0015, RELAIS: 0x0016, FAMILLE: 0x0017, TRANSPORT: 0x0019 };

/* ── les messages ─────────────────────────────────────────────────────────────────────────────── */
function attr(type, valeur) {
  const pad = (4 - valeur.length % 4) % 4, b = Buffer.alloc(4 + valeur.length + pad);
  b.writeUInt16BE(type, 0); b.writeUInt16BE(valeur.length, 2); valeur.copy(b, 4);
  return b;
}
/* → le message entier. Avec `cleIntegrite`, l'attribut MESSAGE-INTEGRITY clôt le message : HMAC-SHA1 de tout ce qui précède, la longueur de l'en-tête comptant DÉJÀ ses 24 octets (RFC 5389 § 15.4). */
function message(type, attrs, txid, cleIntegrite) {
  let corps = Buffer.concat(attrs);
  const tete = (long) => { const h = Buffer.alloc(20); h.writeUInt16BE(type, 0); h.writeUInt16BE(long, 2); h.writeUInt32BE(COOKIE, 4); txid.copy(h, 8); return h; };
  if (cleIntegrite) {
    const avant = Buffer.concat([tete(corps.length + 24), corps]);
    corps = Buffer.concat([corps, attr(ATTR.INTEGRITE, crypto.createHmac('sha1', cleIntegrite).update(avant).digest())]);
  }
  return Buffer.concat([tete(corps.length), corps]);
}
function lire(buf) {
  if (buf.length < 20 || buf.readUInt32BE(4) !== COOKIE) return null;
  const long = buf.readUInt16BE(2);
  if (buf.length < 20 + long) return null;
  const attrs = new Map();
  let o = 20;
  while (o + 4 <= 20 + long) {
    const t = buf.readUInt16BE(o), l = buf.readUInt16BE(o + 2);
    if (!attrs.has(t)) attrs.set(t, buf.subarray(o + 4, o + 4 + l));
    o += 4 + l + (4 - l % 4) % 4;
  }
  return { type: buf.readUInt16BE(0), txid: buf.subarray(8, 20), attrs, taille: 20 + long };
}
const codeErreur = (m) => { const e = m.attrs.get(ATTR.ERREUR); return e && e.length >= 4 ? (e[2] & 7) * 100 + e[3] : null; };

function octetsIPv6(s) {
  const [tete, queue] = s.includes('::') ? s.split('::') : [s, ''];
  const gs = (x) => x === '' ? [] : x.split(':');
  const conv = (l) => l.flatMap(g => g.includes('.') ? g.split('.').map(Number) : [parseInt(g, 16) >> 8, parseInt(g, 16) & 255]);
  const a = conv(gs(tete)), b = conv(gs(queue));
  return Buffer.from([...a, ...new Array(16 - a.length - b.length).fill(0), ...b]);
}
/* XOR-PEER-ADDRESS d'une adresse IP et d'un port (RFC 5389 § 15.2) */
function adressePaire(ip, port, txid) {
  const v6 = net.isIP(ip) === 6, brut = v6 ? octetsIPv6(ip) : Buffer.from(ip.split('.').map(Number));
  const masque = Buffer.alloc(16); masque.writeUInt32BE(COOKIE, 0); txid.copy(masque, 4);
  const v = Buffer.alloc(4 + brut.length);
  v[1] = v6 ? 2 : 1; v.writeUInt16BE((port ^ (COOKIE >>> 16)) & 0xffff, 2);
  for (let i = 0; i < brut.length; i++) v[4 + i] = brut[i] ^ masque[i];
  return v;
}
function lireAdresse(v, txid) {
  const v6 = v[1] === 2, n = v6 ? 16 : 4, masque = Buffer.alloc(16); masque.writeUInt32BE(COOKIE, 0); txid.copy(masque, 4);
  const o = []; for (let i = 0; i < n; i++) o.push(v[4 + i] ^ masque[i]);
  const port = (v.readUInt16BE(2) ^ (COOKIE >>> 16)) & 0xffff;
  if (!v6) return { ip: o.join('.'), port };
  const g = []; for (let i = 0; i < 16; i += 2) g.push(((o[i] << 8) | o[i + 1]).toString(16));
  return { ip: g.join(':'), port };
}

/* ── les transports : UDP, TCP, TLS ───────────────────────────────────────────────────────────── */
/* → { echange(buf, attenteMs) → Promise<message lu>, fermer() }. Un échange attend la réponse de SON identifiant de transaction ; en UDP il est renvoyé jusqu'à trois fois (un paquet peut se perdre). */
function ouvrir({ hote, port, transport = 'udp', tls: optsTls }) {
  return new Promise((resolve, reject) => {
    const attentes = new Map();
    const livrer = (m) => { const k = m.txid.toString('hex'), a = attentes.get(k); if (a) { attentes.delete(k); a(m); } };
    const lien = (envoyer, fermer) => ({
      echange: (buf, attenteMs = 2000) => new Promise((ok, ko) => {
        const m = lire(buf), k = m.txid.toString('hex');
        let essais = 0, t = null;
        const fin = (r, e) => { clearTimeout(t); attentes.delete(k); if (e) ko(e); else ok(r); };
        attentes.set(k, (r) => fin(r));
        const tour = () => {
          if (++essais > (transport === 'udp' ? 3 : 1)) return fin(null, new Error('pas de réponse'));
          envoyer(buf); t = setTimeout(tour, transport === 'udp' ? Math.ceil(attenteMs / 3) : attenteMs);
        };
        tour();
      }),
      fermer,
    });
    if (transport === 'udp') {
      const s = dgram.createSocket(net.isIP(hote) === 6 ? 'udp6' : 'udp4');
      s.on('message', (b) => { const m = lire(b); if (m) livrer(m); });
      s.on('error', reject);
      resolve(lien((b) => s.send(b, port, hote), () => { try { s.close(); } catch (e) { /* déjà fermé */ } }));
      return;
    }
    let tampon = Buffer.alloc(0);
    const sur = (sock) => {
      sock.on('data', (d) => {
        tampon = Buffer.concat([tampon, d]);
        for (;;) {
          if (tampon.length < 20) return;
          if ((tampon[0] & 0xc0) !== 0) return;                           // un ChannelData ne nous concerne pas
          const total = 20 + tampon.readUInt16BE(2);
          if (tampon.length < total) return;
          const m = lire(tampon.subarray(0, total)); tampon = tampon.subarray(total);
          if (m) livrer(m);
        }
      });
      sock.on('error', reject);
    };
    if (transport === 'tcp') {
      const s = net.connect({ host: hote, port }, () => resolve(lien((b) => s.write(b), () => s.destroy())));
      sur(s);
    } else {
      const o = Object.assign({ host: hote, port, servername: net.isIP(hote) ? undefined : hote }, optsTls || {});
      const s = tls.connect(o, () => resolve(lien((b) => s.write(b), () => s.destroy())));
      sur(s);
    }
  });
}

/* ── une session TURN : allouer, autoriser une adresse paire, rendre ─────────────────────────────── */
function session(lien) {
  let domaine = null, nonce = null, cle = null, nom = null;
  const txid = () => crypto.randomBytes(12);
  const signer = (utilisateur, motDePasse) => {
    nom = Buffer.from(utilisateur); cle = crypto.createHash('md5').update(utilisateur + ':' + domaine.toString() + ':' + motDePasse).digest();
  };
  const authentifies = () => [attr(ATTR.NOM, nom), attr(ATTR.DOMAINE, domaine), attr(ATTR.NONCE, nonce)];
  const echanger = async (type, attrs, avecCle) => {
    const m = await lien.echange(message(type, attrs, txid(), avecCle ? cle : null));
    if (m.type === (type | 0x0100)) return { ok: true, m };                 // 0x0100 : la réponse de réussite ; 0x0110 : la réponse d'erreur
    const code = codeErreur(m);
    if (code === 438 && m.attrs.get(ATTR.NONCE)) { nonce = m.attrs.get(ATTR.NONCE); return { ok: false, code, perime: true }; }
    return { ok: false, code };
  };
  return {
    /* → { ok:true, relais:{ip,port}, duree } | { ok:false, code } — la danse de l'authentification à long terme : une première demande sans identité (401 + domaine + nonce), puis la demande signée. */
    async allouer({ username, credential }, { famille } = {}) {
      const transport = attr(ATTR.TRANSPORT, Buffer.from([17, 0, 0, 0])), extra = famille === 6 ? [attr(ATTR.FAMILLE, Buffer.from([2, 0, 0, 0]))] : [];
      const premiere = await lien.echange(message(TYPE.ALLOCATION, [transport], txid(), null));
      if (premiere.type === (TYPE.ALLOCATION | 0x0100)) return { ok: false, code: 0, sansAuthentification: true };
      const c = codeErreur(premiere);
      if (c !== 401 || !premiere.attrs.get(ATTR.DOMAINE) || !premiere.attrs.get(ATTR.NONCE)) return { ok: false, code: c };
      domaine = premiere.attrs.get(ATTR.DOMAINE); nonce = premiere.attrs.get(ATTR.NONCE);
      signer(username, credential);
      let r = await echanger(TYPE.ALLOCATION, [attr(ATTR.NOM, nom), attr(ATTR.DOMAINE, domaine), attr(ATTR.NONCE, nonce), transport].concat(extra), true);
      if (r.perime) r = await echanger(TYPE.ALLOCATION, [attr(ATTR.NOM, nom), attr(ATTR.DOMAINE, domaine), attr(ATTR.NONCE, nonce), transport].concat(extra), true);
      if (!r.ok) return { ok: false, code: r.code };
      const a = r.m.attrs.get(ATTR.RELAIS), d = r.m.attrs.get(ATTR.DUREE);
      return { ok: true, relais: a ? lireAdresse(a, r.m.txid) : null, duree: d ? d.readUInt32BE(0) : null };
    },
    /* → { ok, code } : 200 → ok ; 403 « adresse interdite » → ok:false, code 403 */
    async permission(ip, port = 9) {
      const t = txid();
      const corps = [attr(ATTR.PAIR, adressePaire(ip, port, t))].concat(authentifies());
      let m = await lien.echange(message(TYPE.PERMISSION, corps, t, cle));
      if (codeErreur(m) === 438 && m.attrs.get(ATTR.NONCE)) {
        nonce = m.attrs.get(ATTR.NONCE);
        const t2 = txid();
        m = await lien.echange(message(TYPE.PERMISSION, [attr(ATTR.PAIR, adressePaire(ip, port, t2))].concat(authentifies()), t2, cle));
      }
      return m.type === (TYPE.PERMISSION | 0x0100) ? { ok: true, code: 200 } : { ok: false, code: codeErreur(m) };
    },
    /* rendre l'allocation (durée 0) : un relais qu'on ne rend pas la garde dix minutes, et le quota de l'utilisateur avec */
    async rendre() {
      if (!cle) return { ok: false, code: null };
      const d = Buffer.alloc(4);
      return echanger(TYPE.RAFRAICHIR, authentifies().concat([attr(ATTR.DUREE, d)]), true);
    },
    fermer() { lien.fermer(); },
  };
}

/* ── les contrôles ────────────────────────────────────────────────────────────────────────────── */
const ADRESSES_REFUSEES = [['127.0.0.1', 'la machine elle-même (127.0.0.1)'], ['10.1.2.3', 'le réseau privé 10/8'], ['172.16.5.5', 'le réseau privé 172.16/12'], ['192.168.1.1', 'le réseau privé 192.168/16'],
  ['169.254.169.254', 'le service de métadonnées de l\'hébergeur (169.254/16)'], ['100.64.1.1', 'le réseau partagé 100.64/10'], ['0.0.0.1', 'l\'adresse nulle 0/8']];
const ADRESSE_PUBLIQUE = '93.184.216.34';

/* → [{ nom, ok, detail }] — jamais une valeur secrète dans `detail`. `identifiants(âge)` fabrique { username, credential } ; âge « perime » en rend un dont l'échéance est passée. */
async function controles({ hote, port, portTls = null, transports = ['udp', 'tcp'], identifiants, hoteTls = null, optsTls = null }) {
  const r = [];
  const noter = (nom, ok, detail, avis) => r.push({ nom, ok: !!ok, detail: detail || '', avis: !!avis });
  for (const transport of transports) {
    let lien = null;
    try { lien = await ouvrir({ hote, port, transport }); } catch (e) { noter('le relais répond en ' + transport.toUpperCase() + ' sur ' + port, false, e && e.code ? String(e.code) : 'pas de connexion'); continue; }
    try {
      const s = session(lien);
      const a = await s.allouer(identifiants('bon'));
      noter('(' + transport.toUpperCase() + ') le relais ACCEPTE nos identifiants : une allocation réussit', a.ok, a.ok ? '' : 'code ' + a.code);
      if (a.ok) {
        for (const [ip, quoi] of ADRESSES_REFUSEES) {
          const p = await s.permission(ip);
          noter('(' + transport.toUpperCase() + ') il REFUSE de relayer vers ' + quoi, !p.ok && p.code === 403, p.ok ? 'ACCEPTÉ — le relais atteindrait cette adresse' : 'code ' + p.code);
        }
        const pub = await s.permission(ADRESSE_PUBLIQUE);
        noter('(' + transport.toUpperCase() + ') il ACCEPTE une adresse publique (contre-épreuve : il ne refuse pas tout)', pub.ok, pub.ok ? '' : 'code ' + pub.code);
        await s.rendre();
      }
      s.fermer();
    } catch (e) { noter('(' + transport.toUpperCase() + ') échange avec le relais', false, e && e.message ? e.message : 'erreur'); try { lien.fermer(); } catch (x) { /* fermé */ } }
    for (const [age, attendu, quoi] of [['mauvais', 401, 'un identifiant FAUX'], ['perime', 401, 'un identifiant PÉRIMÉ']]) {
      let l2 = null;
      try {
        l2 = await ouvrir({ hote, port, transport });
        const a = await session(l2).allouer(identifiants(age));
        noter('(' + transport.toUpperCase() + ') il REFUSE ' + quoi, !a.ok && (a.code === attendu || a.code === 438), a.ok ? 'ACCEPTÉ' : 'code ' + a.code);
      } catch (e) { noter('(' + transport.toUpperCase() + ') il REFUSE ' + quoi, false, e && e.message ? e.message : 'erreur'); }
      finally { if (l2) l2.fermer(); }
    }
  }
  if (portTls) {
    let l3 = null;
    try {
      l3 = await ouvrir({ hote: hoteTls || hote, port: portTls, transport: 'tls', tls: optsTls || {} });
      const s = session(l3);
      const a = await s.allouer(identifiants('bon'));
      noter('(TLS) le certificat est valide pour le nom annoncé et le relais y accepte nos identifiants', a.ok, a.ok ? '' : 'code ' + a.code, true);
      if (a.ok) await s.rendre();
    } catch (e) { noter('(TLS) le certificat est valide pour le nom annoncé', false, e && e.code ? String(e.code) : (e && e.message ? e.message : 'erreur'), true); }
    finally { if (l3) l3.fermer(); }
  }
  return r;
}

/* ── la ligne de commande ─────────────────────────────────────────────────────────────────────── */
async function principal(argv) {
  const instance = argv[0];
  if (instance !== 'beta' && instance !== 'prod') { console.log('usage : node verifier-relais.js <beta|prod>'); return 2; }
  const chemin = process.env.OPMSG_CONFIG || '/etc/opmsg/' + instance + '.json';
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(chemin, 'utf8')); }
  catch (e) { console.log('✗ la configuration de l\'instance ' + instance + ' est illisible (' + (e && e.code === 'ENOENT' ? 'absente' : e && e.code === 'EACCES' ? 'droits : lancer en root' : 'JSON invalide') + ')'); return 1; }
  const { appelsConfig } = require('../config');
  const { identifiantsRelais } = require('../appels');
  let a;
  try { a = appelsConfig(cfg, instance); } catch (e) { console.log('✗ ' + String(e.message).replace(/^config: /, '')); return 1; }
  const relais = a.relais;
  if (!relais) { console.log('✗ aucun relais n\'est configuré pour ' + instance + ' : lancer install-turn.sh ' + instance); return 1; }
  const uid = 'p_' + '0'.repeat(32), maintenant = Date.now();
  const identifiants = (age) => {
    if (age === 'perime') return identifiantsRelais({ secret: relais.secret, ttlS: -3600 }, uid, maintenant);
    const id = identifiantsRelais(relais, uid, maintenant);
    return age === 'mauvais' ? { username: id.username, credential: crypto.randomBytes(20).toString('base64') } : id;
  };
  console.log('── Le relais d\'appels de l\'instance ' + instance);
  const res = await controles({ hote: '127.0.0.1', port: relais.port, portTls: relais.portTls, identifiants, hoteTls: relais.hote });
  let mal = 0;
  let avis = 0;
  for (const c of res) {
    console.log((c.ok ? '  ✓ ' : c.avis ? '  ⚠️ ' : '  ✗ ') + c.nom + (c.ok || !c.detail ? '' : ' — ' + c.detail));
    if (!c.ok && c.avis) avis++; else if (!c.ok) mal++;
  }
  if (avis) console.log('\n   ⚠️ ' + avis + ' avis (le TLS passe par le NOM public du serveur : un DNS pas encore en place, ou un hébergeur qui ne rebouche pas son propre adresse, le fait échouer sans que le relais soit en cause).');
  console.log(mal ? '\n⛔ ' + mal + ' contrôle(s) en échec.' : '\n✓ Le relais fait ce qu\'il doit.');
  console.log('   (Ce contrôle part de CE serveur : il ne dit pas si les ports sont ouverts dans le panneau de l\'hébergeur — voir INSTALLER-LE-SERVEUR.md.)');
  return mal ? 1 : 0;
}

module.exports = { message, lire, ouvrir, session, controles, adressePaire, lireAdresse, codeErreur, ADRESSES_REFUSEES, ADRESSE_PUBLIQUE };
if (require.main === module) principal(process.argv.slice(2)).then((c) => process.exit(c), () => { console.log('✗ erreur inattendue'); process.exit(1); });
