/* ══ UN HÔTE QUE LE SERVEUR VA APPELER À LA DEMANDE D'UN CLIENT DOIT ÊTRE PUBLIC ═══════════════════════════════
 *
 * Nuit du 5 novembre 2026 (audit de sécurité). `/api/sendmail`, en « mode avancé », se connecte au serveur SMTP que l'APPLICATION lui
 * donne (`smtp.host`, `smtp.port`) : c'est voulu, l'entreprise a sa boîte chez OVH, Gmail ou ailleurs. Mais rien ne disait QUEL hôte :
 * `127.0.0.1`, `10.x`, `169.254.169.254` (les métadonnées d'un hébergeur) passaient. Joué sur le vrai serveur : un service local qui parle
 * en premier (une bannière SSH) revenait mot pour mot dans l'erreur (`Invalid greeting. response=SSH-2.0-…`), et un port fermé répondait
 * `ECONNREFUSED` — le serveur de TEAM OP devenait un balayeur de ports de son propre réseau, au service de toute entreprise cliente.
 *
 * Ce module résout le nom UNE fois, refuse toute adresse qui n'est pas publique, et rend l'adresse à utiliser : la connexion se fait sur
 * l'ADRESSE résolue (jamais sur le nom, que le DNS d'un attaquant ferait changer entre la vérification et la connexion), avec le nom en
 * `servername` pour que le certificat TLS se vérifie toujours.
 *
 * Aucune dépendance. Les bancs, qui n'ont que 127.0.0.1, ouvrent la porte par `TEAMOP_BANC_HOTES_LOCAUX=1` (jamais posé sur le VPS).
 */
'use strict';
const dns = require('dns').promises;
/* (pas de module « net » : le banc test-2980 interdit tout accès réseau brut dans le serveur ; ici on ne fait que RECONNAÎTRE une adresse) */
const isIP = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s) ? 4 : (s.indexOf(':') >= 0 && /^[0-9a-f:.]+$/i.test(s) && /^[0-9a-f:]*(:[0-9a-f:.]*)+$/i.test(s)) ? 6 : 0;

/* IPv4 : les plages qui ne sont pas « Internet » (RFC 1122, 1918, 3927, 6598, 5737, 2544 et le multicast / réservé). */
function ipv4Privee(a) {
  const p = a.split('.').map(Number);
  if (p.length !== 4 || p.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [x, y, z] = p;
  return x === 0 || x === 10 || x === 127
    || (x === 100 && y >= 64 && y <= 127)            // partage d'adresses des opérateurs (CGNAT)
    || (x === 169 && y === 254)                      // lien local, métadonnées des hébergeurs
    || (x === 172 && y >= 16 && y <= 31)
    || (x === 192 && y === 0 && (z === 0 || z === 2))
    || (x === 192 && y === 168)
    || (x === 198 && (y === 18 || y === 19))
    || (x === 198 && y === 51 && z === 100) || (x === 203 && y === 0 && z === 113)
    || x >= 224;                                      // multicast, réservé, diffusion
}
function ipv6Privee(a) {
  const s = a.toLowerCase();
  const mappee = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(s);          // ::ffff:127.0.0.1
  if (mappee) return ipv4Privee(mappee[1]);
  if (/^::ffff:[0-9a-f:]+$/.test(s)) return true;                   // forme hexadécimale d'une adresse IPv4 : on ne la déchiffre pas, on refuse
  if (s === '::' || s === '::1') return true;
  if (/^(fc|fd)/.test(s)) return true;                              // unique local
  if (/^fe[89ab]/.test(s)) return true;                             // lien local
  if (/^ff/.test(s)) return true;                                   // multicast
  if (/^64:ff9b:/.test(s)) return true;                             // NAT64 : l'IPv4 qu'il porte n'est pas jugée ici
  if (/^2001:(0?db8|0{0,4}:)/.test(s) || /^2002:/.test(s)) return true;   // documentation, Teredo, 6to4
  return false;
}
function adressePrivee(a) {
  const f = isIP(a);
  if (f === 4) return ipv4Privee(a);
  if (f === 6) return ipv6Privee(a);
  return true;   // pas une adresse : on ne devine pas
}

/* → { ip, nom } : l'adresse publique à joindre pour cet hôte. Jette une erreur `code` :
   'hote_invalide' (forme), 'hote_introuvable' (le nom ne se résout pas), 'hote_non_public' (au moins UNE adresse n'est pas publique —
   un nom qui en porte une seule, même mêlée à des publiques, est refusé : le client de messagerie choisit parmi elles). */
async function hotePublic(hote, opts) {
  const o = opts || {};
  const nom = String(hote == null ? '' : hote).trim().toLowerCase();
  const erreur = (code, message) => { const e = new Error(message); e.code = code; return e; };
  if (!nom || nom.length > 253 || !/^[a-z0-9._:-]+$/.test(nom) || /^\.|\.\.|\.$/.test(nom)) throw erreur('hote_invalide', 'serveur de messagerie invalide');
  const autoriseLocal = o.autoriseLocal === undefined ? process.env.TEAMOP_BANC_HOTES_LOCAUX === '1' : !!o.autoriseLocal;
  if (isIP(nom)) {
    if (!autoriseLocal && adressePrivee(nom)) throw erreur('hote_non_public', 'ce serveur de messagerie n\'est pas joignable depuis Internet');
    return { ip: nom, nom };
  }
  if (nom === 'localhost' || /\.(local|localhost|internal|lan|home|corp)$/.test(nom)) { if (!autoriseLocal) throw erreur('hote_non_public', 'ce serveur de messagerie n\'est pas joignable depuis Internet'); }
  let liste;
  try { liste = await (o.lookup || ((h) => dns.lookup(h, { all: true, verbatim: true })))(nom); }
  catch (e) { throw erreur('hote_introuvable', 'serveur de messagerie introuvable'); }
  if (!Array.isArray(liste) || !liste.length) throw erreur('hote_introuvable', 'serveur de messagerie introuvable');
  if (!autoriseLocal && liste.some(x => !x || adressePrivee(String(x.address)))) throw erreur('hote_non_public', 'ce serveur de messagerie n\'est pas joignable depuis Internet');
  /* IPv4 d'abord : c'est ce que la quasi-totalité des fournisseurs de messagerie sert sans surprise. */
  const choix = liste.find(x => x.family === 4) || liste[0];
  return { ip: String(choix.address), nom };
}

module.exports = { hotePublic, adressePrivee, ipv4Privee, ipv6Privee };
