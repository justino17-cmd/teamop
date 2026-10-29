/* GARDE-RÉSEAU — « RIEN NE SORT AILLEURS QU'À ANTHROPIC », TENU PAR LE CODE ET NON PAR UN RÉGLAGE (28 octobre 2026).
 *
 * Chargé AVANT promptfoo (`NODE_OPTIONS=--require …/garde-reseau.js`, posé par `lancer.sh`) : il remplace `connect` et `write` des sockets de Node, donc ce que
 * fait n'importe quel module de l'arbre — promptfoo, undici, le SDK d'Anthropic — passe par lui, et il refuse toute connexion vers un hôte qui n'est pas
 * dans `TEAMOP_PF_HOTES` (liste séparée par des virgules ; vide = AUCUN hôte distant). La boucle locale reste permise.
 *
 * ⛔ POURQUOI UN GARDE ET PAS LE SEUL RÉGLAGE `PROMPTFOO_DISABLE_TELEMETRY=1`. Lu dans le code de promptfoo 0.125.1 (`telemetry.ts`) : `record()` appelle
 *    `recordTelemetryDisabled()` quand la télémétrie est COUPÉE, qui envoie un évènement « telemetry disabled » par `fetchWithProxy(R_ENDPOINT)` — un POST vers
 *    `r.promptfoo.app` portant un identifiant d'utilisateur (et l'adresse du compte s'il y en a un). Le réglage coupe PostHog, pas ce POST-là. Une promesse
 *    écrite dans une doc n'est pas une garde (CLAUDE.md, « une garde décrite n'est pas une garde ») : le garde refuse la connexion elle-même.
 * ⛔ Un PROXY (HTTPS_PROXY) ne contourne pas le garde : l'hôte du proxy est permis, mais la ligne `CONNECT hôte:port` qu'on lui écrit est lue avant de
 *    partir, et le TLS posé sur un tunnel déjà ouvert est contrôlé par son `servername`.
 * ⛔ On ne JETTE pas dans `connect` : l'erreur arrive sur le socket (`EGARDERESEAU`), comme n'importe quel échec de connexion, pour que le code appelant
 *    (undici) la traite par ses chemins ordinaires. Le message nomme l'hôte refusé et rien d'autre — jamais un chemin, une requête ni un en-tête.
 */
'use strict';
const net = require('net');
const tls = require('tls');

const liste = v => String(v || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const hote = h => String(h == null ? '' : h).trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
const hotesProxy = () => {
  const s = new Set();
  for (const k of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']) {
    const v = process.env[k]; if (!v) continue;
    try { s.add(hote(new URL(/^[a-z]+:\/\//i.test(v) ? v : 'http://' + v).hostname)); } catch (e) { /* une valeur illisible n'ouvre rien */ }
  }
  return s;
};
const AUTORISES = new Set(liste(process.env.TEAMOP_PF_HOTES).map(hote));
const PROXYS = hotesProxy();
const LOCAL = h => h === 'localhost' || h === '::1' || h === '0.0.0.0' || /^127\.\d+\.\d+\.\d+$/.test(h);
/* `comme` : 'direct' (la cible de la connexion) ou 'tunnel' (la cible d'un CONNECT : l'hôte du proxy n'y vaut rien, seul un hôte permis passe) */
const permis = (h, comme) => !!h && (LOCAL(h) || AUTORISES.has(h) || (comme !== 'tunnel' && PROXYS.has(h)));

const dejaDit = new Set();
function refus(h) {
  const e = new Error('garde-réseau : connexion vers « ' + h + ' » refusée (permis : ' + (AUTORISES.size ? [...AUTORISES].join(', ') : 'aucun hôte distant') + ')');
  e.code = 'EGARDERESEAU';
  if (!dejaDit.has(h)) { dejaDit.add(h); try { process.stderr.write(e.message + '\n'); } catch (x) { /* rien */ } }
  return e;
}

/* L'hôte visé par les arguments de `Socket.connect` : (options[, cb]) · (port[, hôte][, cb]) · (chemin[, cb]) — un chemin est un socket Unix, local par nature */
function hoteDe(args) {
  let a = args[0];
  /* ⛔ `net.connect()` appelle `socket.connect(normalise)` avec la forme DÉJÀ NORMALISÉE : un tableau `[options, rappel]`, pas un objet. Lu comme un objet, il n'a ni `path` ni `host` et
     passait pour « localhost » : le garde laissait sortir toute connexion ouverte par `net.connect` (pris par le banc test-3132, qui visait un hôte hors liste). */
  if (Array.isArray(a)) a = a[0];
  if (a && typeof a === 'object') return a.path ? null : (a.host || 'localhost');
  if (typeof a === 'string' && !/^\d+$/.test(a)) return null;
  return typeof args[1] === 'string' ? args[1] : 'localhost';
}

const connectOrig = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const h = hoteDe(args);
  if (h !== null && !permis(hote(h), 'direct')) {
    const e = refus(hote(h));
    process.nextTick(() => { try { this.destroy(e); } catch (x) { /* déjà détruit */ } });
    return this;
  }
  return connectOrig.apply(this, args);
};

const tlsOrig = tls.connect;
tls.connect = function (...args) {
  const o = args[0] && typeof args[0] === 'object' ? args[0] : {};
  /* TLS posé sur un socket DÉJÀ ouvert (le tunnel d'un proxy) : la cible n'est plus dans le socket mais dans `servername` ; sans socket, c'est `connect` qui juge */
  if (o.socket) {
    const h = hote(o.servername || o.host || '');
    if (!permis(h, 'tunnel')) {
      const e = refus(h || '(inconnu)');
      try { o.socket.destroy(); } catch (x) { /* rien */ }
      const s = new tls.TLSSocket(new net.Socket());
      process.nextTick(() => { try { s.destroy(e); } catch (x) { /* rien */ } });
      return s;
    }
  }
  return tlsOrig.apply(this, args);
};

/* Le tunnel d'un proxy : la ligne « CONNECT hôte:port HTTP/1.1 » est la première chose écrite sur le socket du proxy. On la lit avant qu'elle parte. */
const ecrireOrig = net.Socket.prototype.write;
net.Socket.prototype.write = function (chunk, ...reste) {
  if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
    const debut = chunk.slice(0, 300).toString('latin1');
    if (debut.startsWith('CONNECT ')) {
      const m = /^CONNECT (\[[^\]]+\]|[^\s:]+):(\d+)/.exec(debut);
      const h = m ? hote(m[1]) : '';
      if (!permis(h, 'tunnel')) {
        const e = refus(h || '(inconnu)');
        process.nextTick(() => { try { this.destroy(e); } catch (x) { /* rien */ } });
        return false;
      }
    }
  }
  return ecrireOrig.call(this, chunk, ...reste);
};

module.exports = { permis, AUTORISES, hoteDe };
