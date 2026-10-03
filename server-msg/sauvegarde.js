/* ══ LA SAUVEGARDE HORS SITE D'OP MESSAGES — chiffrée, relue, et rendue à celui qui la lira un jour ═════════════════════════
 *
 * Étape 3 de `design/opmessages/SERVEUR.md`. Imité de `server/sauvegarde.js` (OP GESTION), JAMAIS importé : les deux services se
 * séparent (décision de Justin, 22 septembre et 1er octobre 2026), et ce qui a coûté cher à l'un sert de leçon à l'autre sans
 * partager une ligne à l'exécution. Le client S3 est la COPIE de celui d'OP GESTION (`lib/s3.js`, identique octet pour octet :
 * `tests/test-950.js` l'exige) ; le reste est écrit pour une base SQLite plutôt que pour un dossier de fichiers.
 *
 * ⛔ CE QUE CE MODULE FAIT, TOUTES LES HEURES :
 *   1. un INSTANTANÉ cohérent de `msg.db` (`stockage.instantane` : l'API de sauvegarde de SQLite, par petits pas — le service
 *      continue d'écrire pendant la copie) ;
 *   2. il le COMPRESSE et le CHIFFRE en AES-256-GCM avec une clé qui ne sert QU'À ÇA (`sauvegarde.cle`), jamais la clé maître ;
 *   3. il le DÉPOSE dans un coffre S3 à part (son propre bucket, sa propre paire de clés), sous `<instance>/base/` ;
 *   4. il le RELIT : retéléchargement, empreinte, déchiffrement, `quick_check` et comptage des lignes sur une copie temporaire,
 *      comparés à l'instantané. Tant que ces étapes n'ont pas abouti, la passe est un ÉCHEC — même si le dépôt a répondu 200 ;
 *   5. il envoie les PIÈCES (photos, vocaux, fichiers : scellées, immuables) qui ne sont pas encore au coffre, et retire du coffre
 *      celles qui n'existent plus ici ;
 *   6. il applique la RÉTENTION (14 jours par défaut) — seulement après une archive relue.
 *
 * ⛔ UNE SAUVEGARDE QU'ON N'A PAS RELUE N'EST PAS UNE SAUVEGARDE. Le succès de l'envoi ne prouve que l'envoi. Une archive qui ne se
 * relit pas est RETIRÉE du coffre (sinon la rétention la compte comme une copie valable, et trente passes plus tard il ne reste
 * plus une seule copie saine sans que rien ne l'ait dit) et l'échec se DIT dans `/health` (`sauvegarde.echecs`).
 *
 * ⛔ ET RIEN NE S'ALLUME TOUT SEUL. Sans bloc `sauvegarde` dans la configuration, le module est INERTE : aucune minuterie, aucun
 * appel réseau, `/health` dit `configuree:false`. C'est l'état de la bêta tant que Justin n'a pas créé le coffre. Une
 * configuration PRÉSENTE mais invalide, elle, REFUSE le démarrage (`lireConfigSauvegarde`) — comme les SMS : une sauvegarde qui
 * échoue en silence à 3 h du matin est pire qu'un service qui dit tout de suite qu'il est mal réglé.
 *
 * ⛔ DEUX CLÉS POUR RELEVER CETTE SAUVEGARDE AILLEURS, PAS UNE — et le jour où l'on en a besoin, c'est la deuxième qu'on oublie :
 *   · `sauvegarde.cle` ouvre l'ENVELOPPE (l'archive de la base) ;
 *   · la clé maître (`/etc/opmsg/<instance>.kek`) ouvre les DONNÉES : tout ce qui est dans la base — messages, noms, numéros — y est
 *     scellé par elle, et elle n'est PAS dans l'archive. Avec la première seule, on obtient une base qui s'ouvre parfaitement et ne
 *     rend pas un mot. Le service refuse d'ailleurs de démarrer avec une clé de sauvegarde ÉGALE à la clé maître : la perte d'une
 *     seule des deux ne doit pas emporter l'autre.
 *
 * ⚠️ CE QU'UNE ARCHIVE NE DIT PAS : les messages éphémères et supprimés APRÈS elle y sont encore. La restauration rejoue donc le
 * registre des purges (`outils/restaurer.js`, `stockage.copie.rejouerPurge`). Et la rétention est de 14 jours : une archive garde
 * un message supprimé jusqu'à ce qu'elle sorte du coffre — c'est dit dans la politique de confidentialité, pas ici.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const { spawn } = require('child_process');
const s3mod = require('./lib/s3');

/* Le format est écrit en toutes lettres en tête d'archive : celui qui la lira un jour sera peut-être quelqu'un d'autre, sur une
   machine neuve, sans ce dépôt sous les yeux. Disposition :
     ligne 1 : le magique, qui nomme le format et ses algorithmes ;
     ligne 2 : un JSON {v, instance, date, schema} — QUI EST L'ARCHIVE : de quelle instance, prise à quel instant, de quel schéma ;
     12 octets de vecteur d'initialisation, puis le chiffré (une base SQLite compressée par gzip), puis les 16 octets d'étiquette
     d'authentification GCM À LA FIN (c'est GCM qui l'impose).
   ⛔ LES DEUX PREMIÈRES LIGNES SONT LES DONNÉES ASSOCIÉES (AAD) du chiffrement : l'étiquette ne se vérifie que si elles sont
   exactement celles de la fabrication. Une archive de la bêta recopiée sous le préfixe de la production, ou une vieille archive
   rebaptisée avec la date d'aujourd'hui, ne s'ouvre plus — au lieu d'être restaurée de bonne foi. */
const MAGIQUE = 'OPMSG-SAUV-1 aes-256-gcm gzip sqlite\n';
const TAILLE_IV = 12, TAILLE_TAG = 16, MAX_ENTETE = 2048;
const SUFFIXE = '.msgbak';
const DOSSIER_BASE = 'base/', DOSSIER_PIECES = 'pieces/';
const NOM_ETAT = 'sauvegarde-etat.json', NOM_ESSAI = 'sauvegarde-essai.json', NOM_TMP = '.sauvegarde-tmp';
/* GCM n'est sûr que jusqu'à ~64 Gio par message : au-delà, la sauvegarde REFUSE (et le dit) plutôt que de chiffrer de travers. */
const MAX_OCTETS_GCM = 32 * 1024 * 1024 * 1024;
const GARDER_AU_MOINS = 3;

const erreur = (code) => Object.assign(new Error(code), { code });
const dormir = (ms) => new Promise(r => setTimeout(r, ms));

/* ══ LA CONFIGURATION — validée au démarrage, et par le script qui l'écrit ════════════════════════════════════════════════ */
/* La clé : 64 caractères hexadécimaux, ni plus ni moins. Un mot de passe « qu'on retiendra » donnerait une clé devinable — et une
   sauvegarde chiffrée avec un secret faible est une sauvegarde en clair qui se croit protégée. */
function cleDepuis(v) {
  const t = String(v === undefined || v === null ? '' : v).trim();
  if (!/^[0-9a-fA-F]{64}$/.test(t)) return null;
  return Buffer.from(t, 'hex');
}

/* Un entier borné ; `undefined` donne le défaut ; tout le reste (zéro, négatif, texte, décimal) REFUSE — on ne devine pas ce qu'une
   faute de frappe voulait dire. */
function entier(c, nom, defaut, min, max) {
  if (c[nom] === undefined || c[nom] === null) return defaut;
  const x = c[nom];
  if (!Number.isInteger(x) || x < min || x > max) {
    const e = new Error('config: sauvegarde.' + nom + ' doit être un entier entre ' + min + ' et ' + max + (min >= 1 ? ' (jamais 0)' : ''));
    e.code = 'CONFIG'; throw e;
  }
  return x;
}

/* Rend `null` quand il n'y a pas de bloc (module inerte), la configuration normalisée sinon, ou LÈVE `config: sauvegarde.<champ> …`
   (code `CONFIG`). ⛔ Aucun message ne cite une VALEUR : ce texte part dans le journal du démarrage, que Justin recolle. */
function lireConfigSauvegarde(c, { instance, kek } = {}) {
  if (c === undefined || c === null) return null;
  const refuse = (m) => { const e = new Error('config: sauvegarde.' + m); e.code = 'CONFIG'; return e; };
  if (typeof c !== 'object' || Array.isArray(c)) throw Object.assign(new Error('config: sauvegarde doit être un objet'), { code: 'CONFIG' });
  if (instance !== 'beta' && instance !== 'prod') throw refuse('instance inconnue (beta ou prod attendu)');

  const endpoint = String(c.endpoint || '').replace(/\/+$/, '');
  if (!endpoint) throw refuse('endpoint est obligatoire (l\'adresse du coffre S3)');
  /* Les données sont chiffrées avant de partir, mais la signature des requêtes, elle, ne doit pas voyager en clair : https, sauf la
     boucle locale (les bancs, un coffre sur la machine). */
  const boucleLocale = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?$/.test(endpoint);
  if (!boucleLocale && !/^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(endpoint)) throw refuse('endpoint doit commencer par « https:// » (« http:// » n\'est admis que pour la boucle locale)');
  const bucket = String(c.bucket || '');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw refuse('bucket est invalide (minuscules, chiffres, tirets et points ; le nom que TU as donné au bucket)');
  const region = c.region === undefined ? 'eu-central-4' : String(c.region);
  if (!/^[a-z]{2}-[a-z]+-\d+$/.test(region)) throw refuse('region est invalide (de la forme eu-central-4)');
  for (const k of ['accessKey', 'secretKey']) {
    if (typeof c[k] !== 'string' || !/^[\x21-\x7e]{3,200}$/.test(c[k])) throw refuse(k + ' est obligatoire (3 à 200 caractères imprimables, sans espace)');
  }

  const cle = cleDepuis(c.cle);
  if (!cle) throw refuse('cle doit faire 64 caractères hexadécimaux');
  /* Une clé « 0000…0 » ou « abab…ab » vient d'une faute de frappe ou d'un exemple recopié, pas d'un tirage. */
  if (new Set(String(c.cle).toLowerCase()).size < 8) throw refuse('cle est trop régulière pour être une vraie clé (générer 64 hexadécimaux au hasard)');
  /* ⛔ LA CLÉ DE SAUVEGARDE N'EST JAMAIS LA CLÉ MAÎTRE. Si c'était la même, une seule fuite — ou une seule perte — emporterait les
     deux. Comparée en temps constant, octet pour octet. */
  if (Buffer.isBuffer(kek) && kek.length === 32 && crypto.timingSafeEqual(cle, kek)) throw refuse('cle est la clé maître : la sauvegarde doit avoir sa PROPRE clé');

  let prefixe = c.prefixe === undefined ? instance + '/' : String(c.prefixe);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*\/$/.test(prefixe) || prefixe.length > 100 || /(^|\/)\.\.?(\/|$)/.test(prefixe)) throw refuse('prefixe est invalide (des dossiers séparés par « / », et finissant par « / »)');
  /* Deux instances dans un même coffre : celle de la bêta ne doit pas pouvoir écrire — ni effacer — sous le préfixe de la production. */
  const autre = instance === 'beta' ? 'prod' : 'beta';
  if (prefixe === autre + '/' || prefixe.startsWith(autre + '/')) throw refuse('prefixe appartient à l\'autre instance (' + autre + ')');

  const retentionJours = entier(c, 'retentionJours', 14, 1, 365);
  /* Le rythme : l'heure par défaut. `intervalleMs` est le rythme des BANCS (une passe en une fraction de seconde) : il n'existe
     que pour la bêta, et le script de configuration ne l'écrit jamais. */
  let intervalleMs;
  if (c.intervalleMs !== undefined) {
    if (instance !== 'beta') throw refuse('intervalleMs est réservé aux bancs (instance beta)');
    intervalleMs = entier(c, 'intervalleMs', 3600000, 200, 86400000);
  } else intervalleMs = entier(c, 'intervalleMin', 60, 5, 1440) * 60000;

  return Object.freeze({
    coffre: Object.freeze({ endpoint, region, bucket, accessKey: c.accessKey, secretKey: c.secretKey }),
    cle, prefixe, retentionJours, intervalleMs,
    retryMs: Math.min(600000, intervalleMs),
    delaiInitialMs: Math.min(30000, intervalleMs),
    piecesParPasse: entier(c, 'piecesParPasse', 500, 1, 100000),
    budgetPiecesMs: entier(c, 'budgetPiecesMs', 480000, 1000, 3600000),
  });
}

/* ══ LES NOMS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Le nom d'une archive porte l'instant en ISO, sans deux-points (interdits sur certains systèmes de fichiers, pénibles dans une
   URL), MILLISECONDES COMPRISES : deux passes dans la même seconde — un banc, une reprise — ne s'écrasent pas. Il se trie dans
   l'ordre chronologique, ce dont la rétention et la restauration se servent. */
const nomDe = (ts) => new Date(ts).toISOString().replace(/[:.]/g, '-');   // 2026-10-02T14-03-00-123Z
const isoDeNom = (nom) => nom.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1:$2:$3.$4Z');
function dateDeNom(nom) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(String(nom));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], +m[7]);
  /* Un mois 13 ou un 31 février se « normalisent » en date valide : on exige l'aller-retour. */
  return Number.isFinite(t) && nomDe(t) === nom ? t : null;
}
const cleBase = (prefixe, ts) => prefixe + DOSSIER_BASE + nomDe(ts) + SUFFIXE;
/* Une clé du coffre → l'archive qu'elle désigne, ou `null` : ce qui n'est pas EXACTEMENT `<préfixe>base/<date>.msgbak` n'est pas à nous. */
function archiveDeCle(prefixe, cle) {
  const pre = prefixe + DOSSIER_BASE;
  if (typeof cle !== 'string' || !cle.startsWith(pre) || !cle.endsWith(SUFFIXE)) return null;
  const nom = cle.slice(pre.length, -SUFFIXE.length);
  const ts = dateDeNom(nom);
  return ts === null ? null : { cle, nom, ts };
}

/* ⛔ LA RÉTENTION EST UNE FONCTION PURE, ET C'EST DÉLIBÉRÉ : c'est le seul endroit du module qui EFFACE des archives. Une erreur ici
   ne rend pas une sauvegarde bancale, elle supprime la dernière copie de tout. Séparée du réseau, elle s'éprouve sur des listes
   fabriquées, y compris les cas qui font peur. Le sens des garde-fous est toujours le même : DANS LE DOUTE, ON EFFACE MOINS.
     · on ne touche QU'À ce que ce module a écrit (`<préfixe>base/<date>.msgbak`) — un objet étranger n'est jamais compté ;
     · un réglage ABSURDE (0, négatif, pas un nombre) retombe sur le défaut de 14 jours, il ne veut pas dire « vide le coffre » ;
     · les TROIS plus récentes restent quoi qu'il arrive : un service arrêté trois semaines, puis relancé, n'efface pas ses seules
       copies au premier tour ;
     · si la plus récente est datée du FUTUR (l'horloge de cette machine retarde, ou a sauté), on n'efface rien : on ne sait plus
       quelle heure il est. */
function aElaguer(objets, { prefixe, maintenant, jours, garderAuMoins = GARDER_AU_MOINS } = {}) {
  if (!prefixe || !Number.isFinite(maintenant)) return [];
  const j = Number.isFinite(jours) && jours >= 1 ? jours : 14;
  const garde = Math.max(1, Number.isInteger(garderAuMoins) ? garderAuMoins : GARDER_AU_MOINS);
  const miens = [];
  for (const o of objets || []) { const a = o ? archiveDeCle(prefixe, o.cle) : null; if (a) miens.push(a); }
  if (miens.length <= garde) return [];
  miens.sort((a, b) => b.ts - a.ts);
  if (miens[0].ts > maintenant + 3600000) return [];
  const limite = maintenant - j * 86400000;
  return miens.slice(garde).filter(a => a.ts < limite).map(a => a.cle);
}

/* ══ FABRIQUER ET ROUVRIR UNE ARCHIVE ═══════════════════════════════════════════════════════════════════════════════════════ */
function enteteDe({ instance, date, schema }) {
  return Buffer.concat([Buffer.from(MAGIQUE, 'utf8'), Buffer.from(JSON.stringify({ v: 1, instance, date, schema }) + '\n', 'utf8')]);
}

/* Écrit l'archive chiffrée dans `sortie` et rend { octets, empreinte } (SHA-256 de ce qui PART — la recalculer en relisant le
   fichier mesurerait un autre fichier que celui envoyé). Tout passe en FLUX : la base, gzip, le chiffreur, le disque. Rien n'est tenu
   en mémoire — une base de plusieurs gigaoctets ne doit pas faire tomber le service pour tout le monde. */
async function fabriquer({ source, sortie, cle, meta }) {
  const taille = fs.statSync(source).size;
  if (taille > MAX_OCTETS_GCM) throw erreur('trop-volumineuse');
  const entete = enteteDe(meta);
  const iv = crypto.randomBytes(TAILLE_IV);
  const chiffreur = crypto.createCipheriv('aes-256-gcm', cle, iv);
  chiffreur.setAAD(entete);
  const empreinte = crypto.createHash('sha256');
  let octets = 0;
  const compter = (c) => { octets += c.length; empreinte.update(c); };
  const compteur = new Transform({ transform(c, e, cb) { compter(c); cb(null, c); } });
  const fichier = fs.createWriteStream(sortie, { mode: 0o600 });
  try {
    fichier.write(entete); compter(entete);
    fichier.write(iv); compter(iv);
    /* `pipeline` plutôt qu'un chaînage d'écouteurs : un flux sans écouteur `error` (disque plein, droit manquant) arrête le processus
       sous Node 22 — ici, le service de messagerie de tout le monde. Il surveille chaque maillon et respecte la contre-pression. */
    await pipeline(fs.createReadStream(source), zlib.createGzip({ level: 6 }), chiffreur, compteur, fichier, { end: false });
    const tag = chiffreur.getAuthTag(); compter(tag);
    await new Promise((res, rej) => fichier.end(tag, e => (e ? rej(e) : res())));
    return { octets, empreinte: empreinte.digest('hex') };
  } catch (e) {
    try { fichier.destroy(); } catch (x) { /* déjà détruit */ }
    throw e;
  }
}

/* Lit l'en-tête d'une archive SANS la déchiffrer : { entete (les octets qui servent d'AAD), meta, debutChiffre, taille, iv }. */
function lireEntete(chemin) {
  let fd;
  try { fd = fs.openSync(chemin, 'r'); } catch (e) { throw erreur('archive-introuvable'); }
  try {
    const taille = fs.fstatSync(fd).size;
    const tampon = Buffer.alloc(Math.min(MAX_ENTETE + TAILLE_IV, taille));
    fs.readSync(fd, tampon, 0, tampon.length, 0);
    if (tampon.length < MAGIQUE.length || !tampon.subarray(0, MAGIQUE.length).equals(Buffer.from(MAGIQUE, 'utf8'))) throw erreur('entete-absent');
    const finMeta = tampon.indexOf(0x0a, MAGIQUE.length);
    if (finMeta < 0 || finMeta > MAX_ENTETE) throw erreur('entete-illisible');
    let meta;
    try { meta = JSON.parse(tampon.subarray(MAGIQUE.length, finMeta).toString('utf8')); } catch (e) { throw erreur('entete-illisible'); }
    if (!meta || typeof meta !== 'object' || meta.v !== 1) throw erreur('version-inconnue');
    if (typeof meta.instance !== 'string' || typeof meta.date !== 'string') throw erreur('entete-illisible');
    const debutIv = finMeta + 1, debutChiffre = debutIv + TAILLE_IV;
    if (taille <= debutChiffre + TAILLE_TAG) throw erreur('trop-courte');
    return { entete: tampon.subarray(0, debutIv), meta, iv: tampon.subarray(debutIv, debutChiffre), debutChiffre, taille };
  } finally { fs.closeSync(fd); }
}

/* Déchiffre et décompresse `archive` dans `vers` (un fichier : la base). `attendu` = { instance, date } fait REFUSER une archive
   d'une autre instance ou rebaptisée : le même contrôle que l'étiquette GCM, dit en clair AVANT de lire le moindre octet.
   ⛔ L'étiquette GCM n'est vérifiée qu'au DERNIER octet : une archive modifiée se lit normalement jusqu'au bout, puis `final()` lève.
   Le fichier n'est donc posé sous son vrai nom qu'APRÈS cette vérification — jamais un fichier à moitié déchiffré qui aurait l'air
   d'une base. Rend { meta, octets }. */
async function ouvrirArchive(archive, cle, vers, attendu) {
  const h = lireEntete(archive);
  if (attendu && attendu.instance && h.meta.instance !== attendu.instance) throw erreur('instance-differente');
  if (attendu && attendu.date && h.meta.date !== attendu.date) throw erreur('date-differente');
  const tag = Buffer.alloc(TAILLE_TAG);
  const fd = fs.openSync(archive, 'r');
  try { fs.readSync(fd, tag, 0, TAILLE_TAG, h.taille - TAILLE_TAG); } finally { fs.closeSync(fd); }
  const dechiffreur = crypto.createDecipheriv('aes-256-gcm', cle, h.iv);
  dechiffreur.setAAD(h.entete);
  dechiffreur.setAuthTag(tag);
  const partiel = vers + '.partiel';
  try {
    await pipeline(fs.createReadStream(archive, { start: h.debutChiffre, end: h.taille - TAILLE_TAG - 1 }), dechiffreur, zlib.createGunzip(), fs.createWriteStream(partiel, { mode: 0o600 }));
    fs.renameSync(partiel, vers);
  } catch (e) {
    try { fs.unlinkSync(partiel); } catch (x) { /* absent */ }
    throw erreur('dechiffrement-impossible');
  }
  return { meta: h.meta, octets: fs.statSync(vers).size };
}

/* Le SHA-256 d'un fichier, en flux. */
function empreinteFichier(chemin) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256'); let n = 0;
    const s = fs.createReadStream(chemin);
    s.on('data', (c) => { n += c.length; h.update(c); });
    s.on('error', reject);
    s.on('end', () => resolve({ hex: h.digest('hex'), octets: n }));
  });
}

/* ⛔ LE CONTRÔLE D'UNE COPIE SE FAIT DANS UN AUTRE PROCESSUS. `quick_check` parcourt toutes les pages et `COUNT(*)` toutes les lignes :
   sur une base de plusieurs gigaoctets c'est des dizaines de secondes de calcul SYNCHRONE — la boucle d'événements du service, les
   flux, les messages de tout le monde, figés. `node:sqlite` est synchrone ; un processus enfant, lui, ne gêne personne. */
function controlerEnProcessus(chemin, delaiMs = 900000) {
  return new Promise((resolve) => {
    let fini = false;
    const clore = (r) => { if (fini) return; fini = true; clearTimeout(minuteur); resolve(r); };
    const p = spawn(process.execPath, [path.join(__dirname, 'outils', 'controler.js'), chemin], { stdio: ['ignore', 'pipe', 'ignore'] });
    const minuteur = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà sorti */ } clore({ ok: false, motif: 'controle-delai' }); }, delaiMs);
    let sortie = '';
    p.stdout.on('data', (d) => { sortie += d; if (sortie.length > 200000) { try { p.kill('SIGKILL'); } catch (e) { /* déjà sorti */ } } });
    p.on('error', () => clore({ ok: false, motif: 'controle-impossible' }));
    p.on('close', () => { let r; try { r = JSON.parse(sortie); } catch (e) { r = { ok: false, motif: 'controle-illisible' }; } clore(r); });
  });
}

/* Les archives de base d'un coffre, la plus récente en tête. `{ ok:false, statut }` si le coffre ne répond pas. */
async function listerArchives(client, prefixe) {
  const r = await client.lister(prefixe + DOSSIER_BASE);
  if (!r || !r.ok) return { ok: false, statut: r && r.statut };
  const archives = [];
  for (const o of r.objets || []) { const a = archiveDeCle(prefixe, o.cle); if (a) archives.push(Object.assign(a, { octets: o.octets, modifie: o.modifie })); }
  archives.sort((a, b) => b.ts - a.ts);
  return { ok: true, archives };
}

/* ⛔ CE QUI EST UNE PIÈCE, ET RIEN D'AUTRE. Le service range chaque pièce à `pieces/<2 hexa>/f_<32 hexa>` (les deux premiers hexadécimaux de
   l'identifiant, `pieces.js` → `cheminDe`) ; ses dépôts EN COURS vivent à côté, dans `pieces/tmp/<hasard>`. Le miroir n'envoyait « tout fichier
   qui n'est pas caché » : les dépôts en cours partaient au coffre, y restaient, et REVENAIENT à la restauration (gardien, 3 octobre 2026). Il
   ne prend plus que ce qui a exactement la forme d'une pièce — et la restauration non plus ne remet rien d'autre : le coffre est une entrée
   de confiance limitée. `test-950` relie cette forme à celle que `pieces.js` écrit vraiment (si l'une change, l'autre le dit). */
const PIECE_REL = /^[0-9a-f]{2}\/f_[0-9a-f]{32}$/;
const pieceRelOk = (rel) => typeof rel === 'string' && PIECE_REL.test(rel) && rel.slice(5, 7) === rel.slice(0, 2);

/* Les pièces d'un dossier local, à plat : { rel, chemin, taille }, `rel` avec des « / ». Une erreur de lecture NE SE TAIT PAS :
   une liste partielle ferait croire que des pièces n'existent plus — et la copie miroir les effacerait du coffre. `bilan.ignorees`
   compte ce qui a été vu et laissé (un dépôt en cours, un fichier étranger, un lien symbolique) : une absence se compte. */
async function parcourirPieces(racine, bilan) {
  const sortie = [];
  let ignorees = 0;
  for (const d of await fs.promises.readdir(racine, { withFileTypes: true })) {
    if (!d.isDirectory() || !/^[0-9a-f]{2}$/.test(d.name)) { ignorees++; continue; }
    for (const e of await fs.promises.readdir(path.join(racine, d.name), { withFileTypes: true })) {
      const rel = d.name + '/' + e.name;
      if (!e.isFile() || !pieceRelOk(rel)) { ignorees++; continue; }
      sortie.push({ rel, chemin: path.join(racine, d.name, e.name), taille: (await fs.promises.stat(path.join(racine, d.name, e.name))).size });
    }
  }
  sortie.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  if (bilan && typeof bilan === 'object') bilan.ignorees = ignorees;
  return sortie;
}

/* ══ LE MODULE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Les dépendances sont INJECTÉES — c'est la condition pour que la chaîne entière soit éprouvée ailleurs qu'en production, sur le
   seul mécanisme dont on ne peut pas se permettre d'apprendre les défauts par l'usage :
     cfg        la configuration validée (`lireConfigSauvegarde`), ou `null` : module inerte ;
     base       { instantane(vers, opts), sonde() } — la base vivante, vue par `stockage.js` ;
     controler  async (chemin) → { ok, schema, temoin, journalMax, lignes, … } — par défaut, un processus enfant ;
     client     le client S3 (`lib/s3.js`) ; par défaut celui que la configuration décrit ;
     horloge    `Date.now` ; journaliser    le journal du service (liste blanche de champs) ;
     disqueLibre  () → octets libres sur le disque des données. */
function creerSauvegarde(deps) {
  const { cfg, instance, dataDir, base } = deps;
  const horloge = deps.horloge || Date.now;
  const journaliser = deps.journaliser || (() => {});
  const client = cfg ? (deps.client || s3mod.client(cfg.coffre)) : null;
  const actif = !!(cfg && client);
  const controler = deps.controler || controlerEnProcessus;
  const cheminBase = deps.cheminBase || path.join(dataDir, 'msg.db');
  const disqueLibre = deps.disqueLibre || (() => { const s = fs.statfsSync(dataDir); return Number(s.bavail) * Number(s.bsize); });
  const ETAT_PATH = path.join(dataDir, NOM_ETAT), ESSAI_PATH = path.join(dataDir, NOM_ESSAI);
  const TMP_DIR = path.join(dataDir, NOM_TMP);

  /* L'état : la dernière passe, la dernière RÉUSSIE (de bout en bout), la dernière archive de base relue (qui règle le rythme), les
     échecs de suite, un dépôt éventuellement orphelin, et ce que le miroir des pièces a vu disparaître. Écrit par fichier
     temporaire puis renommage : un état tronqué par une coupure ferait croire qu'aucune sauvegarde n'a jamais eu lieu. */
  let etat = { v: 1, derniere: null, dernierSucces: null, baseTs: null, echecs: 0, histo: [], depot: null, pieces: { absentes: {} } };
  if (actif) {
    try {
      const lu = JSON.parse(fs.readFileSync(ETAT_PATH, 'utf8'));
      if (lu && typeof lu === 'object') etat = Object.assign(etat, lu);
    } catch (e) { /* pas d'état : première fois, ou fichier illisible — on repart de zéro, sans rien casser */ }
    if (!etat.pieces || typeof etat.pieces !== 'object') etat.pieces = { absentes: {} };
    if (!etat.pieces.absentes || typeof etat.pieces.absentes !== 'object') etat.pieces.absentes = {};
    if (!Number.isInteger(etat.echecs) || etat.echecs < 0) etat.echecs = 0;
  }
  function ecrireEtat() {
    try {
      const tmp = ETAT_PATH + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(etat), { mode: 0o600 });
      fs.renameSync(tmp, ETAT_PATH);
    } catch (e) { journaliser('sauvegarde', { etat: 'etat_non_ecrit', motif: e && e.code }); }
  }

  const nettoyerTmp = () => { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) { /* rien à retirer */ } };
  if (actif) { nettoyerTmp(); try { fs.mkdirSync(TMP_DIR, { recursive: true, mode: 0o700 }); } catch (e) { /* refait à la passe */ } }

  let enCours = false, arret = false, passeEnCours = null, minuterie = null, premier = null;

  /* Jugement d'un instantané contre la base VIVANTE, sondée juste avant et juste après (la copie est l'état de la base entre les deux).
     L'exactitude ne se prouve pas contre une base qui bouge : elle se prouve sur l'aller-retour (copie = relue, ligne à ligne). Ici
     on attrape le grossier — une copie d'un autre schéma, d'un autre fichier, d'une base vidée, d'un état d'avant la sonde. */
  function jugerCopie(avant, apres, copie) {
    if (copie.schema !== avant.schema || copie.schema !== apres.schema) return 'copie-schema';
    if (!copie.temoin) return 'copie-sans-temoin';
    if (copie.journalMax < avant.journalMax || copie.journalMax > apres.journalMax) return 'copie-horloge';
    for (const t of Object.keys(avant.nonVides || {})) {
      if (avant.nonVides[t] === true && apres.nonVides[t] === true && !(copie.lignes && copie.lignes[t] > 0)) return 'copie-vide-' + t;
    }
    return null;
  }

  async function lancer(raison) {
    if (!actif) return { ok: false, motif: 'inactive' };
    if (arret) return { ok: false, motif: 'arret' };
    if (enCours) return { ok: false, motif: 'deja-en-cours' };
    enCours = true;
    let termine; passeEnCours = new Promise((r) => { termine = r; });
    const t0 = horloge();
    const cleObjet = cleBase(cfg.prefixe, t0);
    const archive = path.join(TMP_DIR, 'archive.bin'), relue = path.join(TMP_DIR, 'relue.bin'), relueDb = path.join(TMP_DIR, 'relue.db'), instantaneDb = path.join(TMP_DIR, 'instantane.db');
    let baseOk = false;

    /* Une passe NOTÉE : la ligne va dans l'état, le journal ne reçoit que des nombres et un motif machine. */
    const noter = (ok, motif, extra) => {
      /* ⛔ UN ARRÊT N'EST PAS UN ÉCHEC : le service s'arrête à chaque déploiement, au milieu d'une passe si elle tombe mal. Compter ces
         arrêts-là ferait crier la surveillance à chaque mise en ligne. L'état est quand même écrit — il porte le marqueur de dépôt. */
      if (motif === 'arret') { ecrireEtat(); journaliser('sauvegarde', { etat: 'arret' }); return { ok: false, motif: 'arret', baseOk }; }
      const fin = horloge();
      const ligne = Object.assign({ ts: t0, ms: fin - t0, ok, baseOk, motif: motif || '', raison: raison || '' }, extra || {});
      if (ok) ligne.cle = cleObjet;
      etat.derniere = ligne;
      etat.histo = [ligne].concat(etat.histo || []).slice(0, 30);
      if (baseOk) etat.baseTs = t0;
      if (ok) { etat.dernierSucces = ligne; etat.echecs = 0; } else etat.echecs = (etat.echecs || 0) + 1;
      ecrireEtat();
      journaliser('sauvegarde', { etat: ok ? 'ok' : 'echec', motif: motif || '', n: Math.round(((extra && extra.octets) || 0) / 1024) });
      return Object.assign({}, ligne);
    };
    /* ⛔ UNE ARCHIVE RECALÉE NE RESTE PAS DANS LE COFFRE. À partir du dépôt l'objet EST là : tout échec qui suit laisse une archive
       dont on SAIT qu'elle est mauvaise, et la rétention la compterait comme une copie valable. Chaque refus passe donc par ici, et
       chaque refus l'efface. Si l'effacement lui-même échoue, le marqueur de dépôt RESTE : la passe suivante réessaiera. */
    const recaler = async (motif, extra) => {
      let retire = false;
      try { retire = !!(await client.effacerCle(cleObjet)).ok; } catch (e) { retire = false; }
      if (retire) etat.depot = null;
      return noter(false, motif, Object.assign({ retire }, extra));
    };

    try {
      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true, mode: 0o700 });
      for (const f of fs.readdirSync(TMP_DIR)) { try { fs.rmSync(path.join(TMP_DIR, f), { recursive: true, force: true }); } catch (e) { /* rien */ } }

      /* Un dépôt resté « en attente » d'une passe interrompue (arrêt du service, coupure) n'a jamais été relu : on le retire. */
      if (etat.depot && etat.depot.cle) {
        let retire = false;
        try { retire = !!(await client.effacerCle(etat.depot.cle)).ok; } catch (e) { retire = false; }
        if (retire) { etat.depot = null; ecrireEtat(); }
      }

      /* ⛔ LA PLACE AVANT LE TRAVAIL : la copie, l'archive, la relue et sa base peuvent peser ensemble plus de deux fois la base. Un
         disque qui se remplit ferait refuser les écritures (503) à tout le monde — ce service ne doit JAMAIS priver les gens de leurs
         messages pour se sauvegarder. */
      let poids = 0;
      for (const s of ['', '-wal']) { try { poids += fs.statSync(cheminBase + s).size; } catch (e) { /* absent */ } }
      let libre = Infinity; try { libre = disqueLibre(); } catch (e) { libre = Infinity; }   // une mesure impossible ne coupe pas la sauvegarde
      if (libre < poids * 2.5 + 64 * 1048576) return noter(false, 'disque-insuffisant');

      /* ── 1. L'instantané, sondé avant et après ── */
      const avant = base.sonde();
      let methode;
      try { methode = (await base.instantane(instantaneDb)).methode; }
      catch (e) { return noter(false, arret ? 'arret' : 'instantane-echec'); }
      const apres = base.sonde();
      if (arret) return noter(false, 'arret');
      const copie = await controler(instantaneDb);
      if (!copie || !copie.ok) return noter(false, 'instantane-illisible');
      const verdict = jugerCopie(avant, apres, copie);
      if (verdict) return noter(false, verdict);

      /* ── 2. L'archive : compressée, chiffrée, liée à son instance et à sa date ── */
      let faite;
      try {
        faite = await fabriquer({ source: instantaneDb, sortie: archive, cle: cfg.cle, meta: { instance, date: new Date(t0).toISOString(), schema: copie.schema } });
      } catch (e) { return noter(false, e && e.code === 'trop-volumineuse' ? 'trop-volumineuse' : 'archive-echec'); }
      try { fs.rmSync(instantaneDb, { force: true }); } catch (e) { /* libère la place avant l'envoi */ }
      if (arret) return noter(false, 'arret');

      /* ── 3. Le dépôt. Le marqueur est écrit AVANT : une passe tuée entre le dépôt et la relecture laisse un objet que personne
         n'a rouvert, et le marqueur dit à la passe suivante de le retirer. ── */
      etat.depot = { cle: cleObjet, ts: t0 };
      ecrireEtat();
      const dep = await client.poserCleFlux(cleObjet, archive, faite.octets, faite.empreinte);
      if (!dep.ok) {
        /* Un refus net (HTTP) n'a rien créé ; une coupure en route (statut 0) peut avoir créé l'objet sans que nous le sachions. */
        if (dep.statut === 0) return recaler('depot-0', { octets: faite.octets });
        etat.depot = null;
        return noter(false, 'depot-' + (dep.statut || 'erreur'), { octets: faite.octets });
      }

      /* Arrêté pendant l'envoi : l'objet est au coffre sans avoir été relu, et le marqueur de dépôt (déjà écrit) dit à la passe
         suivante de le retirer. On ne se lance pas dans une relecture que le service n'aura pas le temps de finir. */
      if (arret) return noter(false, 'arret');

      /* ── 4. LA RELECTURE : ce qu'on retélécharge, pas le fichier local ── */
      const relu = await client.lireCleVers(cleObjet, relue);
      if (!relu.ok) return recaler('relecture-' + (relu.statut || 'absente'), { octets: faite.octets });
      if (relu.octets !== faite.octets) return recaler('taille-differente', { octets: faite.octets, relu: relu.octets });
      if (relu.empreinte !== faite.empreinte) return recaler('empreinte-differente', { octets: faite.octets });
      try { await ouvrirArchive(relue, cfg.cle, relueDb, { instance, date: new Date(t0).toISOString() }); }
      catch (e) { return recaler('archive-illisible', { octets: faite.octets }); }
      const reouverte = await controler(relueDb);
      if (!reouverte || !reouverte.ok) return recaler('relue-illisible', { octets: faite.octets });
      if (JSON.stringify(reouverte.lignes) !== JSON.stringify(copie.lignes) || reouverte.schema !== copie.schema || reouverte.journalMax !== copie.journalMax || reouverte.temoin !== copie.temoin) {
        return recaler('comptes-differents', { octets: faite.octets });
      }
      /* L'archive de base est BONNE et au coffre : le marqueur a fait son travail, et le rythme se règle désormais sur elle. */
      etat.depot = null;
      baseOk = true;
      for (const f of [archive, relue, relueDb]) { try { fs.rmSync(f, { force: true }); } catch (e) { /* rien */ } }

      const extra = { octets: faite.octets, lignes: copie.total, schema: copie.schema, methode };

      /* ── 5. Les pièces, puis 6. la rétention. Un échec ici NE retire PAS l'archive de base (elle est relue, elle est bonne) mais la
         passe n'est pas « réussie » : `ageH` ne repart pas à zéro, `echecs` monte — la sauvegarde est INCOMPLÈTE, et ça se dit. ── */
      let motifPartiel = '';
      const p = await sauverPieces(t0);
      if (p) extra.pieces = { envoyees: p.envoyees, dejaLa: p.dejaLa, retirees: p.retirees, restantes: p.restantes, vides: p.vides, ignorees: p.ignorees };
      if (p && !p.ok) motifPartiel = p.motif;

      const liste = await client.lister(cfg.prefixe + DOSSIER_BASE);
      if (liste && liste.ok) {
        const vieilles = aElaguer(liste.objets, { prefixe: cfg.prefixe, maintenant: t0, jours: cfg.retentionJours });
        let n = 0;
        for (const c of vieilles) { const r = await client.effacerCle(c); if (r.ok) n++; }
        extra.elaguees = n;
        if (n < vieilles.length && !motifPartiel) motifPartiel = 'elagage-efface-' + (vieilles.length - n);
      } else if (!motifPartiel) motifPartiel = 'elagage-liste-' + ((liste && liste.statut) || 'erreur');

      return noter(!motifPartiel, motifPartiel, extra);
    } catch (e) {
      return noter(false, arret ? 'arret' : 'exception');
    } finally {
      enCours = false;
      nettoyerTmp();
      try { fs.mkdirSync(TMP_DIR, { recursive: true, mode: 0o700 }); } catch (e) { /* refait à la passe suivante */ }
      termine();
    }
  }

  /* ══ LES PIÈCES — un miroir incrémental du dossier `pieces/` ══════════════════════════════════════════════════════════════
     Elles sont scellées par le service (la clé maître) et IMMUABLES : un identifiant ne change jamais de contenu. Ce qui est déjà au
     coffre, à la même taille, ne repart donc pas. Chaque pièce envoyée est RELUE (empreinte), comme l'archive de base.
     ⛔ LA COPIE MIROIR EFFACE — et c'est ce qui la rend dangereuse. Trois garde-fous, parce qu'une copie qui vide le coffre le jour où
     le disque d'origine est vide est pire que pas de copie :
       · un dossier absent, illisible ou VIDE alors que le coffre en porte ne retire RIEN (un montage raté ressemble à ça) ;
       · une pièce n'est retirée du coffre que si elle manque ici à DEUX passes de suite (un passage de plus, soit une heure) ;
       · jamais plus de la moitié du coffre d'un coup (avec un plancher de 200) : un défaut de logique qui ferait croire que tout a
         disparu s'arrête là, et la passe l'ANNONCE (`pieces-suppression-massive`) au lieu de le taire. */
  async function sauverPieces(t0) {
    const racine = path.join(dataDir, 'pieces');
    let locales;
    const vu = { ignorees: 0 };
    try { locales = await parcourirPieces(racine, vu); }
    catch (e) { if (e && e.code === 'ENOENT') return null; return { ok: false, motif: 'pieces-lecture' }; }
    const prefixePieces = cfg.prefixe + DOSSIER_PIECES;
    const dist = await client.lister(prefixePieces);
    if (!dist || !dist.ok) return { ok: false, motif: 'pieces-liste-' + ((dist && dist.statut) || 'erreur') };
    const auCoffre = new Map();
    for (const o of dist.objets || []) if (typeof o.cle === 'string' && o.cle.startsWith(prefixePieces)) auCoffre.set(o.cle.slice(prefixePieces.length), o.octets);

    const bilan = { ok: true, motif: '', envoyees: 0, dejaLa: 0, retirees: 0, restantes: 0, vides: 0, ignorees: vu.ignorees };
    const aEnvoyer = [];
    for (const l of locales) {
      if (l.taille === 0) { bilan.vides++; continue; }
      if (auCoffre.get(l.rel) === l.taille) bilan.dejaLa++; else aEnvoyer.push(l);
    }
    const debut = horloge();
    const lot = aEnvoyer.slice(0, cfg.piecesParPasse);
    const copieTmp = path.join(TMP_DIR, 'piece.relue');
    let ratees = 0;
    for (const l of lot) {
      if (arret || horloge() - debut > cfg.budgetPiecesMs) break;
      const cle = prefixePieces + l.rel;
      try {
        const h = await empreinteFichier(l.chemin);
        if (h.octets === 0) { bilan.vides++; continue; }
        const dep = await client.poserCleFlux(cle, l.chemin, h.octets, h.hex);
        if (!dep.ok) { ratees++; continue; }
        const r = await client.lireCleVers(cle, copieTmp);
        if (!r.ok || r.octets !== h.octets || r.empreinte !== h.hex) { try { await client.effacerCle(cle); } catch (e) { /* le prochain passage l'écrasera */ } ratees++; continue; }
        bilan.envoyees++;
      } catch (e) { ratees++; }
    }
    try { fs.rmSync(copieTmp, { force: true }); } catch (e) { /* rien */ }
    bilan.restantes = Math.max(0, aEnvoyer.length - bilan.envoyees - ratees);
    if (ratees) { bilan.ok = false; bilan.motif = 'pieces-envoi-' + ratees; }

    /* La copie miroir : ce qui est au coffre et plus ici, vu à deux passes de suite. */
    const locauxRel = new Set(locales.map(l => l.rel));
    const vusAvant = etat.pieces.absentes || {};
    const absentes = {};
    for (const rel of auCoffre.keys()) if (!locauxRel.has(rel)) absentes[rel] = vusAvant[rel] || t0;
    const candidates = Object.keys(absentes).filter(rel => vusAvant[rel] !== undefined);
    /* « Vide » veut dire sans AUCUNE pièce lisible : un fichier de zéro octet (une pièce tronquée) ne fait pas un dossier plein. */
    const dossierVide = !locales.some(l => l.taille > 0) && auCoffre.size > 0;
    if (dossierVide) {
      etat.pieces.absentes = {};   // un dossier vide n'est pas une suite de suppressions : on n'en retient rien
    } else if (candidates.length > Math.max(200, Math.floor(auCoffre.size / 2))) {
      etat.pieces.absentes = absentes;
      if (bilan.ok) { bilan.ok = false; bilan.motif = 'pieces-suppression-massive'; }
    } else {
      for (const rel of candidates) {
        if (arret) break;
        const r = await client.effacerCle(prefixePieces + rel);
        if (r.ok) { bilan.retirees++; delete absentes[rel]; }
      }
      etat.pieces.absentes = Object.keys(absentes).length > 5000 ? {} : absentes;
    }
    return bilan;
  }

  /* ══ LA SANTÉ, POUR /health — des NOMBRES et un booléen, jamais un nom de bucket, un chemin, un motif ═════════════════════
     ⛔ `/health` est PUBLIQUE. « La dernière sauvegarde a échoué, motif depot-403 » est du renseignement d'exploitation : ça dit à
     qui interroge si la plateforme saurait se relever. Le motif est dans le journal du service, que Justin lit — pas ici.
       configuree   un bloc `sauvegarde` valide existe (et le module est donc actif) — `false` : jamais branchée, un CHOIX ;
       ageH         l'âge, en heures (une décimale), de la dernière passe réussie de bout en bout ; `null` : aucune à ce jour ;
       essaiJours   les jours depuis le dernier exercice de restauration RÉUSSI (`outils/restaurer.js essai`) ; `null` : jamais ;
       echecs       les passes ratées DE SUITE (0 quand la dernière a réussi). */
  function lireEssai() {
    try {
      const j = JSON.parse(fs.readFileSync(ESSAI_PATH, 'utf8'));
      return j && Number.isFinite(j.okTs) ? j : null;
    } catch (e) { return null; }
  }
  function sante() {
    if (!actif) return { configuree: false, ageH: null, essaiJours: null, echecs: 0 };
    const t = horloge(), s = etat.dernierSucces, essai = lireEssai();
    return {
      configuree: true,
      ageH: s ? Math.max(0, Math.round((t - s.ts) / 360000) / 10) : null,
      essaiJours: essai ? Math.max(0, Math.floor((t - essai.okTs) / 86400000)) : null,
      echecs: etat.echecs || 0,
    };
  }

  /* ══ LE RYTHME ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
     Une archive de base toutes les `intervalleMs` après la DERNIÈRE ARCHIVE RELUE (pas après la dernière passe réussie : une passe
     dont seules les pièces ont échoué ne doit pas faire refaire une base toutes les dix minutes — le coffre grossirait de 6 archives
     à l'heure). Un échec de la base se rejoue après `retryMs`, jamais plus vite : une panne du coffre ne doit ni remplir le journal
     ni taper sur l'hébergeur. */
  function due(maintenant) {
    const d = etat.derniere;
    if (d && !d.baseOk && maintenant - d.ts < cfg.retryMs) return false;
    return etat.baseTs === null || etat.baseTs === undefined || maintenant - etat.baseTs >= cfg.intervalleMs;
  }
  function tic() {
    if (!actif || enCours || arret) return;
    if (!due(horloge())) return;
    lancer('minuterie').catch(() => { /* `lancer` note tout ; rien ne doit remonter jusqu'à faire mourir le service */ });
  }
  function demarrer() {
    if (!actif || minuterie) return;
    const pas = Math.max(100, Math.min(60000, Math.floor(cfg.intervalleMs / 4)));
    minuterie = setInterval(tic, pas); minuterie.unref();
    premier = setTimeout(tic, cfg.delaiInitialMs); premier.unref();
  }
  async function arreter() {
    arret = true;
    if (minuterie) clearInterval(minuterie);
    if (premier) clearTimeout(premier);
    minuterie = null; premier = null;
    /* Le service a cinq secondes pour s'arrêter : on en laisse deux à la passe en cours pour reconnaître l'arrêt et nettoyer. */
    if (passeEnCours) await Promise.race([passeEnCours, dormir(2000)]);
  }

  return { actif, lancer, sante, demarrer, arreter, etat: () => JSON.parse(JSON.stringify(etat)), due: () => (actif ? due(horloge()) : false) };
}

module.exports = {
  creerSauvegarde, lireConfigSauvegarde, cleDepuis, aElaguer, fabriquer, ouvrirArchive, lireEntete, enteteDe,
  nomDe, isoDeNom, dateDeNom, cleBase, archiveDeCle, listerArchives, parcourirPieces, pieceRelOk, PIECE_REL, empreinteFichier, controlerEnProcessus,
  MAGIQUE, SUFFIXE, DOSSIER_BASE, DOSSIER_PIECES, NOM_ETAT, NOM_ESSAI, NOM_TMP, TAILLE_IV, TAILLE_TAG, GARDER_AU_MOINS, MAX_OCTETS_GCM,
};
