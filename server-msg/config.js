/* ══ LA CONFIGURATION ET LA GARDE DE DÉMARRAGE D'OP MESSAGES ═════════════════════════════════
 *
 * Tout vient de l'ENVIRONNEMENT : `OPMSG_CONFIG` (un fichier JSON), `OPMSG_DATA` (un dossier),
 * `OPMSG_INSTANCE` (`beta` ou `prod`), `PORT` (8091 par défaut), `OPMSG_SHA` (posé par le
 * déploiement), et la clé maître dans le credential systemd `kek` (`$CREDENTIALS_DIRECTORY/kek`).
 * ⛔ Aucun chemin, aucune adresse de machine, aucun domaine en dur dans le code : une machine
 * à lui, le jour venu, ne demande qu'une autre configuration.
 *
 * ⛔ LA GARDE DE SÉPARATION. Ce service n'est PAS OP GESTION : sa configuration, ses données et sa
 * clé ne vivent jamais sous `/opt/teamop` ni `/etc/teamop`. Refuser ICI, au démarrage, est la
 * dernière barrière — une unité mal copiée, un chemin collé de l'autre installation ferait sinon
 * écrire une base de messages dans le dossier d'OP GESTION (sauvegardée avec lui, lisible par
 * lui) sans que rien ne casse. Le refus passe AVANT toute création de dossier ou de fichier.
 *
 * ⛔ UN CHEMIN SE COMPARE RÉSOLU : un lien symbolique ou un `..` ne doit pas contourner la
 * garde (`/opt/opmsg/../teamop/data`). Les liens sont suivis quand le chemin existe.
 *
 * Réglages du fichier JSON (tous optionnels) :
 *   origines      ["https://…"]  Origines autorisées à écrire. Absent : l'origine DOIT être celle de
 *                                l'en-tête Host (même origine). Un tableau fixe l'exclusivité.
 *   cookie        {nom, secure}  `__Host-opm` et Secure par défaut. Seuls les bancs en http local
 *                                relâchent l'un ou l'autre.
 *   beta          {urlGestion, relectureMs, timeoutMs}   La porte (instance beta seulement).
 *   quotas        {nom:{max,fenetreMs}}   Surcharge des plafonds de départ (bancs).
 *   pieces        {photoMax, vocalMax, fichierMax, avatarMax, quotaPersonne, depotsHeure, orphelineMs, simultanes, parPersonne, bloc}
 *                                Les pièces (photos, vocaux, fichiers) : tailles maximales en octets, quota par personne, envois par heure,
 *                                durée de vie d'une pièce jamais envoyée, envois en même temps. Voir `piecesConfig` pour les valeurs de départ.
 *   disqueMinMo   plancher d'espace libre sous lequel les écritures refusent (503).
 *   pulsationMs, presenceGraceMs, balayageMs, relectureMs   Rythmes (bancs).
 */
const fs = require('fs'), path = require('path');

const INTERDITS = ['/opt/teamop', '/etc/teamop'];

function resolu(p) {
  const abs = path.resolve(String(p));
  // realpath si le chemin (ou son plus proche ancêtre existant) existe : suit les liens.
  let cur = abs; const reste = [];
  for (;;) {
    try { const r = fs.realpathSync(cur); return path.join(r, ...reste.reverse()); }
    catch (e) {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      reste.push(path.basename(cur)); cur = parent;
    }
  }
}

function sousArbre(p, racine) { return p === racine || p.startsWith(racine + path.sep); }

/* Lève `separation: <nom>` si un des chemins est sous un arbre d'OP GESTION. */
function verifierSeparation(chemins, interdits = INTERDITS) {
  for (const [nom, p] of Object.entries(chemins)) {
    if (!p) continue;
    const r = resolu(p);
    for (const interdit of interdits) {
      if (sousArbre(r, interdit) || sousArbre(path.resolve(String(p)), interdit)) {
        const e = new Error('separation: ' + nom + ' est sous ' + interdit + ' — OP MESSAGES ne vit jamais dans l\'arbre d\'OP GESTION');
        e.code = 'SEPARATION'; throw e;
      }
    }
  }
}

function lireCle(dossier) {
  if (!dossier) { const e = new Error('cle: $CREDENTIALS_DIRECTORY absent — la clé maître arrive par le credential systemd « kek »'); e.code = 'CLE'; throw e; }
  let v;
  try { v = fs.readFileSync(path.join(dossier, 'kek'), 'utf8').trim(); }
  catch (e) { const er = new Error('cle: credential « kek » illisible'); er.code = 'CLE'; throw er; }
  if (!/^[0-9a-fA-F]{64}$/.test(v)) { const e = new Error('cle: le credential « kek » n\'est pas 64 caractères hexadécimaux'); e.code = 'CLE'; throw e; }
  return Buffer.from(v, 'hex');
}

/* ⛔ Les origines autorisées : la liste `origines`, OU la chaîne `origine` que l'installation écrit (`install-msg.sh`). Les deux
   noms n'étaient pas lus pareil — l'installation écrivait `origine`, le service lisait `origines` — et la clé était IGNORÉE : la
   vérification retombait sur « Origin = Host », sans que rien ne le dise (relecture du gardien, point 9). Une valeur qui n'est
   pas une origine (schéma, hôte, port — ni chemin, ni requête) REFUSE le démarrage plutôt que de relâcher la garde. */
function origines(cfg) {
  const liste = Array.isArray(cfg.origines) ? cfg.origines.map(String) : (typeof cfg.origine === 'string' && cfg.origine ? [cfg.origine] : null);
  const FORME = new RegExp('^https?:' + '//[A-Za-z0-9.-]+(:\\d{1,5})?$');   // schéma, hôte, port : ni chemin, ni requête
  if (liste && !liste.every(o => FORME.test(o))) { const e = new Error('config: origine invalide (attendu : schéma, hôte et port éventuel, sans chemin)'); e.code = 'CONFIG'; throw e; }
  return liste && liste.length ? liste : null;
}

/* ⛔ LES PIÈCES : les valeurs de départ sont celles de SERVEUR.md § 5.6 (photo 12 Mo, vocal 10 Mo, fichier 25 Mo, 2 Go par personne en Perso). Une valeur qui n'a pas
   de sens (négative, fractionnaire, hors bornes) REFUSE le démarrage plutôt que de tourner de travers : un quota à zéro fermerait toutes les pièces, un plafond à 10 Go
   tiendrait en mémoire des photos que rien n'arrête. `bloc` est la taille de bloc du scellage (une puissance de deux) : il ne change que les fichiers à venir, chaque fichier
   porte la sienne dans son en-tête. */
const Mo = 1048576;
const PIECES_DEFAUT = { photoMax: 12 * Mo, vocalMax: 10 * Mo, fichierMax: 25 * Mo, avatarMax: 2 * Mo, quotaPersonne: 2048 * Mo, depotsHeure: 60, orphelineMs: 24 * 3600000, simultanes: 16, parPersonne: 4, bloc: 65536 };
function piecesConfig(c) {
  const brut = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  const o = {};
  const bornes = { photoMax: [1, 256 * Mo], vocalMax: [1, 256 * Mo], fichierMax: [1, 1024 * Mo], avatarMax: [1, 64 * Mo], quotaPersonne: [1, 1024 * 1024 * Mo], depotsHeure: [1, 100000], orphelineMs: [1000, 30 * 86400000], simultanes: [1, 256], parPersonne: [1, 64], bloc: [256, 1 << 24] };
  for (const [k, [min, max]] of Object.entries(bornes)) {
    const v = brut[k] === undefined ? PIECES_DEFAUT[k] : brut[k];
    if (!Number.isInteger(v) || v < min || v > max) { const e = new Error('config: pieces.' + k + ' doit être un entier entre ' + min + ' et ' + max); e.code = 'CONFIG'; throw e; }
    o[k] = v;
  }
  if (!Number.isInteger(Math.log2(o.bloc))) { const e = new Error('config: pieces.bloc doit être une puissance de deux'); e.code = 'CONFIG'; throw e; }
  return o;
}

function charger(env = process.env) {
  const manque = (n) => { const e = new Error('config: ' + n + ' est obligatoire'); e.code = 'CONFIG'; return e; };
  const instance = env.OPMSG_INSTANCE;
  if (instance !== 'beta' && instance !== 'prod') { const e = new Error('config: OPMSG_INSTANCE doit valoir beta ou prod'); e.code = 'CONFIG'; throw e; }
  if (!env.OPMSG_CONFIG) throw manque('OPMSG_CONFIG');
  if (!env.OPMSG_DATA) throw manque('OPMSG_DATA');
  /* ⛔ LA GARDE D'ABORD — avant de lire la clé, avant de créer le moindre dossier. */
  verifierSeparation({ OPMSG_CONFIG: env.OPMSG_CONFIG, OPMSG_DATA: env.OPMSG_DATA, CREDENTIALS_DIRECTORY: env.CREDENTIALS_DIRECTORY });
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(env.OPMSG_CONFIG, 'utf8')); }
  catch (e) { const er = new Error('config: ' + (e && e.code === 'ENOENT' ? 'fichier introuvable' : 'fichier illisible ou JSON invalide')); er.code = 'CONFIG'; throw er; }
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) { const e = new Error('config: le fichier doit contenir un objet JSON'); e.code = 'CONFIG'; throw e; }
  const kek = lireCle(env.CREDENTIALS_DIRECTORY);
  const port = parseInt(env.PORT || '8091', 10);
  if (!(port > 0 && port < 65536)) { const e = new Error('config: PORT invalide'); e.code = 'CONFIG'; throw e; }
  /* ⛔ LA PORTE DE TEST DES CODES SMS : un fichier où le service écrit le code EN CLAIR, pour que les bancs jouent une inscription sans
     prestataire. Elle est FERMÉE en production : une variable d'environnement oubliée dans une unité systemd ne doit pas écrire des codes
     de connexion en clair sur le disque — le démarrage est refusé, avant toute création de dossier. */
  const testCodes = env.OPMSG_TEST_CODES ? path.resolve(String(env.OPMSG_TEST_CODES)) : null;
  if (testCodes && instance !== 'beta') { const e = new Error('config: OPMSG_TEST_CODES (porte de test des codes SMS) est refusée en production'); e.code = 'CONFIG'; throw e; }
  const cookie = Object.assign({ nom: '__Host-opm', secure: true }, cfg.cookie || {});
  /* Le préfixe __Host- impose Secure : un cookie « __Host-… » sans Secure est refusé par le
     navigateur, donc personne ne pourrait se connecter. On le refuse ICI plutôt qu'en production. */
  if (/^__Host-/.test(cookie.nom) && !cookie.secure) { const e = new Error('config: un cookie __Host- exige secure:true'); e.code = 'CONFIG'; throw e; }
  return {
    instance, port, kek,
    dataDir: path.resolve(env.OPMSG_DATA),
    sha: String(env.OPMSG_SHA || '').replace(/[^0-9a-zA-Z._-]/g, '').slice(0, 64) || 'inconnu',
    origines: origines(cfg),
    cookie,
    beta: Object.assign({ urlGestion: 'http://127.0.0.1:8080', relectureMs: 60000, timeoutMs: 5000 }, cfg.beta || {}),
    quotas: cfg.quotas && typeof cfg.quotas === 'object' ? cfg.quotas : {},
    pieces: piecesConfig(cfg.pieces),
    sms: cfg.sms && typeof cfg.sms === 'object' && !Array.isArray(cfg.sms) ? cfg.sms : {},   // validée par `lireConfigSms` (sms-garde.js)
    sauvegarde: cfg.sauvegarde === undefined ? null : cfg.sauvegarde,   // validée par `lireConfigSauvegarde` (sauvegarde.js) : absente = module inerte, invalide = démarrage refusé
    testCodes: testCodes,
    disqueMinMo: Number.isFinite(cfg.disqueMinMo) ? cfg.disqueMinMo : 512,
    pulsationMs: Number.isFinite(cfg.pulsationMs) ? cfg.pulsationMs : 20000,
    presenceGraceMs: Number.isFinite(cfg.presenceGraceMs) ? cfg.presenceGraceMs : 20000,
    balayageMs: Number.isFinite(cfg.balayageMs) ? cfg.balayageMs : 60000,
    minClient: Number.isInteger(cfg.minClient) ? cfg.minClient : 1,
  };
}

module.exports = { charger, verifierSeparation, lireCle, piecesConfig, INTERDITS };
