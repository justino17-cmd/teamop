/* ══ LA CONFIGURATION ET LA GARDE DE DÉMARRAGE D'OP COURRIER (serveur de signature) ═══════════════════════════════════════════
 *
 * Tout vient de l'ENVIRONNEMENT : `OPCOURRIER_CONFIG` (un fichier JSON, 0600), `OPCOURRIER_DATA` (un dossier), `OPCOURRIER_INSTANCE`
 * (`beta` ou `prod`), `PORT` (8092 par défaut), `OPCOURRIER_SHA` (posé par l'installation), et la clé maître : le credential systemd
 * `kek` (`$CREDENTIALS_DIRECTORY/kek`), à défaut `OPCOURRIER_KEK` (64 hexadécimaux — les bancs). Jamais en base, jamais dans le dépôt.
 *
 * ⛔ LA GARDE DE SÉPARATION. Ce service n'est NI OP GESTION NI OP MESSAGES : sa configuration, ses données et sa clé ne vivent jamais
 * sous `/opt/teamop`, `/etc/teamop`, `/opt/opmsg` ni `/etc/opmsg`. Refusé ICI, au démarrage, AVANT de créer un dossier ou un fichier :
 * une unité mal copiée écrirait sinon des PDF de contrats dans le dossier d'une autre installation (sauvegardée avec elle, lisible par elle).
 * Un chemin se compare RÉSOLU (`..`, liens symboliques suivis quand le chemin existe).
 *
 * Réglages du fichier JSON :
 *   origines    ["https://teamop.fr"]   les pages qui ont le droit d'appeler ce service depuis un navigateur (CORS). Absent : aucune.
 *   gestion     {url, timeoutMs}        OP GESTION, qui dit QUI est la personne (`GET /api/monitor/moi`). `https://` obligatoire, sauf boucle locale (bancs).
 *   yousign     {cleApi, secretWebhook, sandbox, urlApi?}   posés par `configurer-yousign.js` (saisie masquée). `sandbox` vaut true par DÉFAUT.
 *   signature   {moteur:'yousign'|'interne', urlPublique, smtp:{host,port,secure,user,pass,from}}   `moteur` vaut 'yousign' par DÉFAUT : le moteur interne (signature maison) est livré ÉTEINT
 *               et ne s'allume que par ce réglage. `urlPublique` : l'adresse que les signataires voient dans leur lien (https, ou boucle locale pour les bancs).
 *               `smtp` : la boîte TeamOP qui envoie le code à usage unique (saisie masquée : `configurer-signature.js`).
 *   retentionJours (90) / retentionAnnuleJours (30) / brouillonJours (7)   combien de temps une demande finie / annulée / jamais activée est gardée.
 *   quotas      {nom:{max,fenetreMs}}   surcharge des plafonds (bancs).
 */
'use strict';
const fs = require('fs'), path = require('path');

const INTERDITS = ['/opt/teamop', '/etc/teamop', '/opt/opmsg', '/etc/opmsg'];

function resoudre(p, profondeur = 0) {
  let r = path.resolve(String(p));
  // le plus long préfixe qui EXISTE est résolu (liens suivis, même pendants), le reste est rajouté tel quel
  let reste = '';
  while (r && r !== path.dirname(r)) {
    try { return path.join(fs.realpathSync(r), reste); } catch (e) { /* ci-dessous */ }
    try {
      if (profondeur < 8 && fs.lstatSync(r).isSymbolicLink()) return path.join(resoudre(path.resolve(path.dirname(r), fs.readlinkSync(r)), profondeur + 1), reste);
    } catch (e) { /* n'existe pas */ }
    reste = path.join(path.basename(r), reste); r = path.dirname(r);
  }
  return path.join(r, reste);
}
function sousInterdit(p) {
  const r = resoudre(p);
  return INTERDITS.find((i) => r === i || r.startsWith(i + path.sep)) || null;
}
const boucleLocale = (h) => h === '127.0.0.1' || h === 'localhost' || h === '[::1]';

function urlValide(u, nom, boucleOk) {
  let x; try { x = new URL(String(u)); } catch (e) { throw new Error(nom + ' : adresse illisible'); }
  if (x.protocol === 'https:') return x.origin;
  if (x.protocol === 'http:' && boucleOk && boucleLocale(x.hostname)) return x.origin;
  throw new Error(nom + ' : https obligatoire (l\'http n\'est admis qu\'en boucle locale)');
}

function lireKek(env) {
  let hex = '';
  if (env.CREDENTIALS_DIRECTORY) { try { hex = fs.readFileSync(path.join(env.CREDENTIALS_DIRECTORY, 'kek'), 'utf8').trim(); } catch (e) { /* repli ci-dessous */ } }
  if (!hex && env.OPCOURRIER_KEK) hex = String(env.OPCOURRIER_KEK).trim();
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('clé maître absente ou illisible (64 hexadécimaux attendus, credential systemd « kek »)');
  return Buffer.from(hex, 'hex');
}

function charger(env = process.env) {
  const instance = env.OPCOURRIER_INSTANCE;
  if (instance !== 'beta' && instance !== 'prod') throw new Error('OPCOURRIER_INSTANCE doit valoir beta ou prod');
  if (!env.OPCOURRIER_CONFIG) throw new Error('OPCOURRIER_CONFIG manque (fichier JSON de configuration)');
  if (!env.OPCOURRIER_DATA) throw new Error('OPCOURRIER_DATA manque (dossier des données)');
  for (const [nom, p] of [['OPCOURRIER_CONFIG', env.OPCOURRIER_CONFIG], ['OPCOURRIER_DATA', env.OPCOURRIER_DATA]]) {
    const i = sousInterdit(p);
    if (i) throw new Error(nom + ' est sous ' + i + ' : ce service n\'est pas celui d\'une autre application, il n\'y range rien');
  }
  let brut;
  try { brut = JSON.parse(fs.readFileSync(env.OPCOURRIER_CONFIG, 'utf8')); } catch (e) { throw new Error('configuration illisible (' + (e.code || 'JSON invalide') + ')'); }
  if (!brut || typeof brut !== 'object') throw new Error('configuration : un objet JSON est attendu');
  const mode = fs.statSync(env.OPCOURRIER_CONFIG).mode & 0o077;
  if (mode && !env.OPCOURRIER_BANC) throw new Error('la configuration doit être en 0600 (elle porte la clé Yousign)');
  const kek = lireKek(env);
  const g = brut.gestion || {};
  const y = brut.yousign || {};
  const origines = (Array.isArray(brut.origines) ? brut.origines : []).map((o) => urlValide(o, 'origines', true));
  const urlApiOfficielle = y.sandbox === false ? 'https://api.yousign.app' : 'https://api-sandbox.yousign.app';
  let urlApi = urlApiOfficielle;
  if (y.urlApi) {
    const u = urlValide(y.urlApi, 'yousign.urlApi', true);
    if (u !== urlApiOfficielle && !boucleLocale(new URL(u).hostname)) throw new Error('yousign.urlApi : seules les adresses officielles ou la boucle locale sont admises');
    urlApi = u;
  }
  const sg = brut.signature || {}, sm = sg.smtp && typeof sg.smtp === 'object' ? sg.smtp : null;
  const signature = {
    moteur: sg.moteur === 'interne' ? 'interne' : 'yousign',
    urlPublique: sg.urlPublique ? urlValide(sg.urlPublique, 'signature.urlPublique', true) : '',
    smtp: sm && typeof sm.host === 'string' && sm.host && typeof sm.from === 'string' && /@/.test(sm.from)
      ? { host: sm.host, port: Number(sm.port) || 0, secure: !!sm.secure, user: typeof sm.user === 'string' ? sm.user : '', pass: typeof sm.pass === 'string' ? sm.pass : '', from: sm.from } : null,
  };
  return {
    instance, kek, signature,
    data: path.resolve(env.OPCOURRIER_DATA),
    port: Number(env.PORT) || 8092,
    sha: /^[0-9a-f]{7,40}$/.test(env.OPCOURRIER_SHA || '') ? env.OPCOURRIER_SHA : '',
    origines,
    gestion: { url: urlValide(g.url || 'https://api.teamop.fr', 'gestion.url', true), timeoutMs: Number(g.timeoutMs) || 4000 },
    yousign: {
      cleApi: typeof y.cleApi === 'string' ? y.cleApi : '', secretWebhook: typeof y.secretWebhook === 'string' ? y.secretWebhook : '',
      sandbox: y.sandbox !== false, urlApi,
    },
    retentionJours: Number(brut.retentionJours) || 90,
    retentionAnnuleJours: Number(brut.retentionAnnuleJours) || 30,
    brouillonJours: Number(brut.brouillonJours) || 7,
    quotas: brut.quotas || {},
  };
}

module.exports = { charger, sousInterdit, INTERDITS };
