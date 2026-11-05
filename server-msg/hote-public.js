/* ══ UN SERVEUR QU'UNE PERSONNE NOUS DONNE EST UNE DESTINATION : IL DOIT ÊTRE PUBLIC ═══════════════════════════════════════════════
 *
 * Recopié de `server/hote-public.js` d'OP GESTION (commit 068db96b de main, audit de sécurité du 5 novembre 2026) et adapté — ce service
 * n'importe jamais `server/` (`tests/test-900.js`). Mêmes règles, à l'identique :
 *   · TOUT hôte, littéral compris, passe par `dns.lookup` (qui rend l'IPv4 sous sa forme normale) : `012.0.0.1` (octal : 10.0.0.1) n'est pas jugé sur sa forme brute ;
 *   · l'IPv6 est DÉPLIÉE ici en huit groupes et jugée sur LISTE BLANCHE (seulement 2000::/3, la seule plage d'Internet, sans la documentation 2001:db8::/32, Teredo 2001::/32 ni 6to4 2002::/16) :
 *     `::1`, `::7f00:1`, `::127.0.0.1`, `0:0:0:0:0:ffff:7f00:1`, `fec0::1`, `fc00::/7`, `fe80::/10`… sont refusées ;
 *   · une IPv4 est jugée en décimal strict ; les plages de documentation (192.0.2/24, 198.51.100/24, 203.0.113/24) sont refusées avec le reste du non-public ;
 *   · les adresses des interfaces de CETTE machine sont refusées aussi ;
 *   · le nom est résolu UNE fois, cinq secondes au plus, et la connexion se fait sur l'ADRESSE normalisée rendue — jamais sur le nom que le DNS d'un attaquant ferait changer entre la
 *     vérification et la connexion — avec le nom en `servername` pour que le certificat TLS se vérifie.
 * Différence avec l'original : la porte des bancs n'est PAS une variable d'environnement ici (`autoriseLocal` est une option, jamais posée par le service : la boucle locale des bancs passe
 * par le crochet de configuration de `boites-mail.js`, refusé en production).
 */
'use strict';
const dns = require('dns').promises;
const os = require('os');

function ipv4Privee(a) {
  if (!/^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(String(a))) return true;
  const p = String(a).split('.').map(Number);
  if (p.some(x => x > 255)) return true;
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
/* IPv6 → huit groupes de 16 bits, ou null si la forme n'est pas une adresse (zone « % », trop de groupes, hexadécimal invalide…). */
function ipv6Groupes(a) {
  let s = String(a || '').toLowerCase();
  if (!s || s.indexOf('%') >= 0 || !/^[0-9a-f:.]+$/.test(s)) return null;
  let queue = [];
  const v4 = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(s);           // une IPv4 en fin d'adresse : deux groupes de plus
  if (v4) { const p = v4[2].split('.').map(Number); if (p.some(x => !(x >= 0 && x <= 255))) return null; queue = [(p[0] << 8) | p[1], (p[2] << 8) | p[3]]; s = v4[1].replace(/:$/, v4[1].endsWith('::') ? ':' : ''); }
  const moities = s.split('::');
  if (moities.length > 2) return null;
  const lire = (t) => t === '' ? [] : t.split(':').map(g => /^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN);
  const avant = lire(moities[0]), apres = moities.length === 2 ? lire(moities[1]) : [];
  if (avant.concat(apres).some(Number.isNaN)) return null;
  const n = avant.length + apres.length + queue.length;
  let g;
  if (moities.length === 2) { if (n > 7) return null; g = avant.concat(new Array(8 - n).fill(0), apres, queue); }
  else { if (n !== 8) return null; g = avant.concat(queue); }
  return g.length === 8 ? g : null;
}
/* Liste BLANCHE : seule 2000::/3 est Internet ; on retire la documentation (2001:db8::/32), Teredo (2001::/32) et 6to4 (2002::/16). Tout le reste est refusé. */
function ipv6Privee(a) {
  const g = ipv6Groupes(a);
  if (!g) return true;
  if ((g[0] & 0xe000) !== 0x2000) return true;
  if (g[0] === 0x2001 && (g[1] === 0x0db8 || g[1] === 0)) return true;
  if (g[0] === 0x2002) return true;
  return false;
}
function ipv6Normale(a) { const g = ipv6Groupes(a); return g ? g.map(x => x.toString(16)).join(':') : ''; }
function adressePrivee(a, famille) {
  const f = famille || (/^[\d.]+$/.test(String(a)) ? 4 : 6);
  return f === 4 ? ipv4Privee(a) : ipv6Privee(a);
}
/* Les adresses de cette machine : une interface publique du VPS joint ses propres services, filtrés de l'extérieur. */
function adressesLocales() {
  const s = new Set();
  try { for (const l of Object.values(os.networkInterfaces() || {})) for (const x of (l || [])) { if (!x || !x.address) continue; s.add(x.family === 'IPv6' || x.family === 6 ? ipv6Normale(x.address) : String(x.address)); } } catch (e) { /* aucune interface lisible : rien de plus à refuser */ }
  return s;
}

/* → { ip, nom } : l'adresse publique, NORMALISÉE, à joindre pour cet hôte. Jette une erreur `code` :
   'hote_invalide' (forme), 'hote_introuvable' (ne se résout pas, ou DNS trop lent), 'hote_non_public' (au moins UNE adresse n'est pas publique — un nom qui en porte une seule, même mêlée
   à des publiques, est refusé : le client de messagerie choisit parmi elles). */
async function hotePublic(hote, opts) {
  const o = opts || {};
  const nom = String(hote == null ? '' : hote).trim().toLowerCase();
  const erreur = (code, message) => { const e = new Error(message); e.code = code; return e; };
  if (!nom || nom.length > 253 || !/^[a-z0-9._:-]+$/.test(nom) || /^\.|\.\.|\.$/.test(nom)) throw erreur('hote_invalide', 'serveur de messagerie invalide');
  const autoriseLocal = o.autoriseLocal === true;
  const nonPublic = () => erreur('hote_non_public', 'ce serveur de messagerie n\'est pas joignable depuis Internet');
  if (!autoriseLocal && (nom === 'localhost' || /\.(local|localhost|internal|lan|home|corp)$/.test(nom))) throw nonPublic();
  let liste;
  /* 5 s au plus : `dns.lookup` passe par le pool de threads de Node, partagé avec les fichiers et le chiffrement — un nom dont le serveur DNS traîne ne doit pas l'occuper. */
  const delai = (p) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('délai DNS')), o.delaiMs || 5000); p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); ko(e); }); });
  try { liste = await delai(Promise.resolve().then(() => (o.lookup || ((h) => dns.lookup(h, { all: true, verbatim: true })))(nom))); }
  catch (e) { throw erreur('hote_introuvable', 'serveur de messagerie introuvable'); }
  if (!Array.isArray(liste) || !liste.length) throw erreur('hote_introuvable', 'serveur de messagerie introuvable');
  const norm = liste.map(x => { const f = (x && (x.family === 6 || x.family === 'IPv6')) ? 6 : 4; const a = String((x && x.address) || '');
    return { f, a: f === 6 ? ipv6Normale(a) : a, brut: a }; });
  if (!autoriseLocal) {
    const locales = adressesLocales();
    if (norm.some(x => !x.a || adressePrivee(x.brut, x.f) || locales.has(x.a))) throw nonPublic();
  }
  /* IPv4 d'abord : c'est ce que la quasi-totalité des fournisseurs de messagerie sert sans surprise. */
  const choix = norm.find(x => x.f === 4) || norm[0];
  return { ip: choix.a || choix.brut, nom };
}

module.exports = { hotePublic, adressePrivee, ipv4Privee, ipv6Privee, ipv6Groupes };
