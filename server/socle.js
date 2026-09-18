/* ══ LE SOCLE — TOUT LE SQL DE TEAMOP, ET RIEN QUE LUI ═══════════════════════════════════════
 *
 * Étape 1 du plan de bascule (`PLAN-OP-SOCLE.md` §2.2, §2.3, étape 1). Ce fichier porte le
 * stockage qui remplacera Firestore : un fichier SQLite par entreprise, chiffré au repos.
 *
 * ⛔ IL EST LIVRÉ **INERTE**. Sans `socle.actif: true` dans `/opt/teamop/config.json`, aucune
 * route ne le monte et rien ne l'appelle. Le retour arrière ne demande donc pas de déploiement :
 * on éteint le drapeau. C'est ce qui permet de le déployer chez un client qui travaille sans
 * rien risquer — il existe et il ne sert pas.
 *
 * ⛔ TOUT L'ACCÈS SQL PASSE PAR ICI. Aucune requête ailleurs, jamais. Même discipline que les
 * 27 registres actuels, qui ont chacun une seule fonction d'écriture (`espacesEcrire`,
 * `sauvRefus`). Deux raisons : un cloisonnement qui n'a qu'une porte se surveille, et si Node
 * casse un jour l'API de `node:sqlite` — c'est un module expérimental — le passage à
 * `better-sqlite3` tient dans une trentaine de lignes d'adaptateur, ici et nulle part ailleurs.
 *
 * ⛔ UN FICHIER PAR ENTREPRISE — le cloisonnement devient STRUCTUREL. `socle/<t>/base.db`. Il
 * n'y a pas de `WHERE entreprise_id` à oublier : la connexion EST le cloisonnement. Avec une
 * trentaine de routes à écrire, le filtre oublié est le défaut de masse le plus probable ; ici
 * il n'a aucun endroit où naître. Fermer une entreprise = effacer son fichier.
 * ⚠️ En WAL, « le fichier » en fait TROIS — `base.db`, `-wal`, `-shm`. N'effacer que le premier
 * laisse un journal qui peut porter des écritures non fusionnées : une suppression INCOMPLÈTE
 * et silencieuse. `effacerEntreprise` les enlève tous les trois, et le banc l'exige.
 *
 * ⚠️ L'EXCEPTION, NOMMÉE COMME TELLE : `socle-annuaire.db` est commun et porte une colonne `t`.
 * C'est exactement là que les trous se creusent, donc elle n'a QU'UN SEUL accesseur, dont le
 * PREMIER ARGUMENT EST `t`, obligatoire. Elle n'est pas qu'une commodité : un comptage
 * inter-entreprises est 21× plus lent en fichier-par-client, et la Tour agrège sur toutes les
 * entreprises. Elle lit donc l'annuaire et ne balaie JAMAIS les fichiers par entreprise.
 *
 * ⛔ LA TABLE S'APPELLE `diagnostic`, PAS `acces`. `acces.json` existe déjà et désigne les CODES
 * d'accès d'espace. Dans un dépôt qui a déjà supprimé quelque chose sur la foi d'un nom trompeur
 * (`FOURNISSEURS_ELAN`), un homonyme est une mine.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');

const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const SOCLE_DIR = path.join(DATA_DIR, 'socle');
const ANNUAIRE_PATH = path.join(DATA_DIR, 'socle-annuaire.db');
const SCHEMA_VERSION = '1';

/* `node:sqlite` est intégré à Node : zéro dépendance npm, donc zéro surface d'attaque de plus
   sur le composant le plus critique, et aucun module natif à compiler au déploiement — un
   `npm ci` qui échoue, c'est le service à l'arrêt. Le module avertit qu'il est expérimental :
   c'est un risque assumé et nommé, et c'est la raison du paragraphe « une seule porte » plus
   haut. Le `require` est paresseux pour qu'un serveur dont le socle est éteint démarre même si
   le module venait à disparaître d'une version de Node. */
let sqlite = null;
function moteur() {
  if (!sqlite) sqlite = require('node:sqlite');
  return sqlite;
}

/* ══ LA CLÉ MAÎTRE ══════════════════════════════════════════════════════════════════════════
 * ⛔ ELLE N'EST PAS UN FICHIER DE `/opt/teamop`. Elle arrive par l'environnement, que systemd
 * remplit depuis un fichier situé HORS de `/opt` (`LoadCredential=` / `EnvironmentFile=`).
 * La raison est concrète, et deux architectures sur trois l'avaient oubliée : un instantané
 * IONOS est une image de VOLUME, un disque volé aussi. Ranger la clé dans l'arborescence
 * qu'elle protège ne protège que d'un disque éteint qu'on aurait démonté à la main. */
function kekDepuis(v) {
  const t = String(v || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(t)) return null;
  return Buffer.from(t, 'hex');
}
function kek() {
  const k = kekDepuis(process.env.TEAMOP_KEK);
  if (k) return k;
  /* systemd `LoadCredential=` dépose le secret dans un fichier dont le chemin est donné par
     `$CREDENTIALS_DIRECTORY` — hors de /opt, effacé à l'arrêt du service. */
  const dir = process.env.CREDENTIALS_DIRECTORY;
  if (dir) { try { return kekDepuis(fs.readFileSync(path.join(dir, 'teamop_kek'), 'utf8')); } catch (e) {} }
  return null;
}

/* ⛔ UNE CLÉ ABSENTE N'EST PAS UNE INSTALLATION NEUVE quand des bases existent déjà. Sans ce
   contrôle, une réinstallation qui tire une clé neuve démarre VERT : `/health` répond 200,
   SQLite ouvre parfaitement, et l'échec ne se voit qu'au déchiffrement, ligne par ligne, où il
   ressemble à de la corruption. On refuse de démarrer, et on dit quoi faire. */
function exigerKek() {
  const k = kek();
  if (k) return k;
  let bases = 0;
  try { bases = fs.readdirSync(SOCLE_DIR).length; } catch (e) {}
  const quoi = bases
    ? 'des bases existent déjà dans ' + SOCLE_DIR + ' : une clé absente est un INCIDENT, pas une installation neuve.\n'
      + '  Ne PAS en générer une neuve — les données deviendraient illisibles. Récupérer la clé du séquestre.'
    : 'aucune base n\'existe encore : générer la clé une seule fois et la déposer hors de /opt,\n'
      + '  puis en sceller DEUX copies dans deux lieux physiques distincts (voir PLAN-OP-SOCLE §2.3).';
  throw new Error('clé maître du socle absente (TEAMOP_KEK, 64 caractères hexadécimaux) — ' + quoi);
}

/* ══ L'ENVELOPPE ════════════════════════════════════════════════════════════════════════════
 * AES-256-GCM, préfixe `v1:` pour permettre une rotation ligne à ligne sans arrêt de service.
 * ⛔ L'AAD N'EST PAS DÉCORATIVE. GCM garantit l'intégrité du CORPS, pas sa FRAÎCHEUR ni sa
 * PLACE. Sans `maj_le` et `supprime_le` dedans, un `UPDATE enr SET maj_le=<dans dix ans>` sur
 * une ligne — script de rangement, restauration mal ciblée, intrus — la ferait gagner toutes
 * les fusions pour toujours, sans que rien ne se voie. Dans l'AAD, la ligne trafiquée CESSE DE
 * SE DÉCHIFFRER : elle se voit. Même raison pour `t|coll|id` : un bloc déplacé d'une entreprise
 * à une autre se déchiffrerait parfaitement s'il n'était pas lié à sa place. */
const PREFIXE = Buffer.from('v1:', 'utf8');

function sceller(cle, clair, aad) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', cle, iv);
  c.setAAD(Buffer.from(aad, 'utf8'));
  const chiffre = Buffer.concat([c.update(clair), c.final()]);
  return Buffer.concat([PREFIXE, iv, chiffre, c.getAuthTag()]);
}

function desceller(cle, scelle, aad) {
  const b = Buffer.from(scelle);
  if (b.length < PREFIXE.length + 12 + 16) throw new Error('bloc trop court');
  if (!b.subarray(0, PREFIXE.length).equals(PREFIXE)) throw new Error('préfixe de version inconnu');
  const iv = b.subarray(PREFIXE.length, PREFIXE.length + 12);
  const tag = b.subarray(b.length - 16);
  const chiffre = b.subarray(PREFIXE.length + 12, b.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', cle, iv);
  d.setAAD(Buffer.from(aad, 'utf8'));
  d.setAuthTag(tag);
  return Buffer.concat([d.update(chiffre), d.final()]);
}

/* Le corps d'un enregistrement : JSON, compressé, puis scellé. La compression AVANT le
   chiffrement, parce qu'un chiffré ne se compresse pas — et les bases de ce produit sont
   pleines de champs répétés (catalogue, réglages), où gzip divise par cinq ou plus. */
const aadCorps = (t, coll, id, majLe, supprimeLe) => t + '|' + coll + '|' + id + '|' + majLe + '|' + supprimeLe;
const aadFichier = (t, sha) => t + '|' + sha;

function sceller_corps(dek, t, coll, id, majLe, supprimeLe, valeur) {
  return sceller(dek, zlib.gzipSync(Buffer.from(JSON.stringify(valeur), 'utf8')), aadCorps(t, coll, id, majLe, supprimeLe));
}
function desceller_corps(dek, t, coll, id, majLe, supprimeLe, blob) {
  return JSON.parse(zlib.gunzipSync(desceller(dek, blob, aadCorps(t, coll, id, majLe, supprimeLe))).toString('utf8'));
}

/* ══ L'ANNUAIRE — L'EXCEPTION, ET SA PORTE UNIQUE ═══════════════════════════════════════════
 * ⛔ Un seul accesseur, dont le PREMIER ARGUMENT est `t`, obligatoire. Un banc relit ce fichier
 * et exige zéro requête sur cette base sans `t` — le même esprit que le banc qui compte déjà
 * les écritures directes d'`espaces.json` et en exige zéro. */
let _annuaire = null;
function annuaire() {
  if (_annuaire) return _annuaire;
  fs.mkdirSync(path.dirname(ANNUAIRE_PATH), { recursive: true });
  const db = new (moteur().DatabaseSync)(ANNUAIRE_PATH);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA journal_size_limit=4194304;');
  db.exec(`CREATE TABLE IF NOT EXISTS entreprise (t TEXT PRIMARY KEY, dek BLOB NOT NULL, dek_gen INTEGER NOT NULL DEFAULT 1,
             kek_gen INTEGER NOT NULL DEFAULT 1, etat TEXT NOT NULL DEFAULT 'actif', seq INTEGER NOT NULL DEFAULT 0,
             octets INTEGER NOT NULL DEFAULT 0, cree_le INTEGER NOT NULL, ferme_le INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`CREATE TABLE IF NOT EXISTS appareil (t TEXT NOT NULL, app_id TEXT NOT NULL, jeton_sha TEXT NOT NULL,
             exp INTEGER NOT NULL, cree_le INTEGER NOT NULL, vu_le INTEGER NOT NULL DEFAULT 0, nom TEXT NOT NULL DEFAULT '',
             revoque_le INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (t, app_id))`);
  db.exec(`CREATE TABLE IF NOT EXISTS diagnostic (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, qui TEXT NOT NULL,
             t TEXT NOT NULL, motif TEXT NOT NULL, portee TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0,
             ip_h TEXT NOT NULL DEFAULT '', chaine_sha TEXT NOT NULL DEFAULT '')`);
  db.exec('CREATE INDEX IF NOT EXISTS diagnostic_t ON diagnostic(t, ts DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS appareil_jeton ON appareil(jeton_sha)');
  _annuaire = db;
  return db;
}

/* La DEK d'une entreprise : 32 octets tirés au hasard, scellés sous la clé maître avec `t` en
   AAD — donc la clé d'une entreprise ne peut pas être présentée comme celle d'une autre.
   Créée à la première ouverture, jamais régénérée : la régénérer rendrait ses lignes illisibles. */
function dekDe(t) {
  t = exigerT(t);
  const K = exigerKek();
  const db = annuaire();
  const l = db.prepare('SELECT dek FROM entreprise WHERE t=?').get(t);
  if (l && l.dek) return desceller(K, l.dek, t);
  const dek = crypto.randomBytes(32);
  db.prepare('INSERT INTO entreprise (t,dek,cree_le) VALUES (?,?,?)').run(t, sceller(K, dek, t), Date.now());
  return dek;
}

/* ══ LA BASE D'UNE ENTREPRISE ═══════════════════════════════════════════════════════════════ */
const _bases = new Map();

/* ⛔ ON REFUSE UN IDENTIFIANT SALE, ON NE LE NETTOIE PAS. Un `replace(/[^A-Za-z0-9_-]/g,'_')`
   paraît prudent et fait exactement l'inverse : MESURÉ le 18 septembre 2026, `a.b` et `a_b`
   retombaient sur le MÊME `socle/a_b/base.db` — deux entreprises, un fichier, et une lecture
   qui rend « unable to authenticate data » parce que l'AAD porte le `t` brut. Tout le
   cloisonnement structurel de ce fichier repose sur « un `t`, un chemin » : une fonction qui
   rapproche deux `t` distincts le perce. Les identifiants réels (`elan-34oc`,
   `opgestion-beta`) passent ; ce qui ne passe pas n'a rien à faire ici. */
const RE_T = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
function exigerT(t) {
  const s = String(t == null ? '' : t);
  if (!RE_T.test(s)) throw new Error('identifiant d\'entreprise refusé : « ' + s.slice(0, 32) + ' » — '
    + 'attendu 1 à 64 caractères parmi [A-Za-z0-9_-], commençant par une lettre ou un chiffre. '
    + 'Il n\'est PAS nettoyé : deux identifiants nettoyés vers le même nom partageraient un fichier.');
  return s;
}
const dossierDe = t => path.join(SOCLE_DIR, exigerT(t));
const baseDe = t => path.join(dossierDe(t), 'base.db');

function ouvrir(t) {
  t = exigerT(t);
  if (_bases.has(t)) return _bases.get(t);
  const K = exigerKek();
  fs.mkdirSync(dossierDe(t), { recursive: true });
  const db = new (moteur().DatabaseSync)(baseDe(t));
  /* `journal_size_limit` n'est pas un détail d'exploitation : MESURÉ le 18 septembre 2026, le
     WAL d'une base de 4,2 Mo restait à 4,3 Mo APRÈS son point de reprise, et ne redescendait
     jamais — chaque entreprise occupait le DOUBLE de sa taille sur un disque qui est le seul
     du VPS. Avec la limite, SQLite tronque le fichier au lieu de le réutiliser. */
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA journal_size_limit=4194304;');
  db.exec(`CREATE TABLE IF NOT EXISTS enr (coll TEXT NOT NULL, id TEXT NOT NULL, maj_le INTEGER NOT NULL,
             seq INTEGER NOT NULL, supprime_le INTEGER NOT NULL DEFAULT 0, par TEXT NOT NULL DEFAULT '',
             corps BLOB, empreinte TEXT, octets INTEGER, PRIMARY KEY (coll,id)) WITHOUT ROWID`);
  db.exec('CREATE INDEX IF NOT EXISTS enr_seq ON enr(seq)');
  db.exec(`CREATE TABLE IF NOT EXISTS journal (seq INTEGER PRIMARY KEY, ts INTEGER, coll TEXT, id TEXT,
             maj_le INTEGER, supprime INTEGER, par TEXT, utilisateur TEXT, ver TEXT, octets INTEGER,
             origine TEXT, empreinte TEXT, corps BLOB, corps_purge_le INTEGER NOT NULL DEFAULT 0)`);
  db.exec('CREATE INDEX IF NOT EXISTS journal_enr ON journal(coll, id, seq DESC)');
  db.exec('CREATE TABLE IF NOT EXISTS numero (prefixe TEXT, annee INTEGER, dernier INTEGER, PRIMARY KEY(prefixe,annee))');
  db.exec(`CREATE TABLE IF NOT EXISTS fichier (sha TEXT PRIMARY KEY, mime TEXT, octets INTEGER,
             cree_le INTEGER, cree_par TEXT, refs INTEGER)`);
  db.exec('CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT)');

  const lire = c => { const l = db.prepare('SELECT val FROM meta WHERE cle=?').get(c); return l ? l.val : null; };
  const poser = (c, v) => db.prepare('INSERT INTO meta (cle,val) VALUES (?,?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val').run(c, String(v));
  if (lire('seq') === null) poser('seq', '0');
  if (lire('schema') === null) poser('schema', SCHEMA_VERSION);

  /* ⛔ LE TÉMOIN DE CLÉ. Un HMAC d'une constante sous la clé maître, écrit à la création et
     comparé à chaque ouverture. Sans lui, une réinstallation qui tire une clé neuve démarre
     VERT — le serveur répond, SQLite ouvre — et l'échec ne se voit qu'au déchiffrement, ligne
     par ligne, où il ressemble à de la corruption. On refuse d'ouvrir, et on dit quoi faire. */
  const temoin = crypto.createHmac('sha256', K).update('teamop-socle-temoin-v1').digest('hex');
  const vu = lire('kek_temoin');
  if (vu === null) poser('kek_temoin', temoin);
  else if (vu !== temoin) {
    try { db.close(); } catch (e) {}
    throw new Error('⛔ la clé maître ne correspond PAS à la base de « ' + t +' ».\n'
      + '  Cette base a été créée avec une AUTRE clé. Ne rien écrire : les lignes existantes\n'
      + '  deviendraient un mélange illisible. Récupérer la bonne clé dans le séquestre\n'
      + '  (deux copies scellées, voir PLAN-OP-SOCLE §2.3), ou restaurer la base qui va avec.');
  }
  _bases.set(t, db);
  return db;
}

/* ══ ÉCRIRE — UNE SEULE TRANSACTION, TOUT OU RIEN ═══════════════════════════════════════════
 * `seq` s'alloue par `UPDATE meta … RETURNING` DANS la transaction, jamais par `MAX(seq)` qui
 * redescendrait après une purge du journal et rendrait deux fois le même rang.
 * ⛔ `seq` N'ENTRE JAMAIS DANS LE CORPS : l'y mettre le ferait entrer dans l'empreinte du
 * client, donc re-tamponner chaque enregistrement à chaque enregistrement, donc lui faire
 * battre sa propre pierre tombale — le défaut que `tests/test-639.js` surveille déjà.
 *
 * L'arbitrage, une seule règle : le plus récent gagne, à `maj_le` égal le serveur garde ce
 * qu'il a. Un refus n'est jamais silencieux — il porte un motif que l'écran peut dire, et
 * l'état du serveur, pour que l'appareil sache quoi faire.
 */
function pousser(t, lignes, ctx) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const c = ctx || {};
  const acceptes = [], refus = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    const suivant = db.prepare("UPDATE meta SET val=val+1 WHERE cle='seq' RETURNING val");
    const actuel = db.prepare('SELECT maj_le, supprime_le, seq FROM enr WHERE coll=? AND id=?');
    const poser = db.prepare(`INSERT INTO enr (coll,id,maj_le,seq,supprime_le,par,corps,empreinte,octets)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(coll,id) DO UPDATE SET
      maj_le=excluded.maj_le, seq=excluded.seq, supprime_le=excluded.supprime_le, par=excluded.par,
      corps=excluded.corps, empreinte=excluded.empreinte, octets=excluded.octets`);
    const tracer = db.prepare(`INSERT INTO journal (seq,ts,coll,id,maj_le,supprime,par,utilisateur,ver,octets,origine,empreinte,corps)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (const l of (lignes || [])) {
      const coll = String((l && l.c) || ''), id = String((l && l.id) || '');
      const majLe = parseInt(l && l.m, 10) || 0;
      const supprimeLe = parseInt(l && l.sup, 10) || 0;
      if (!coll || !id) { refus.push({ c: coll, id, motif: 'identite' }); continue; }
      /* ⛔ `maj_le` A UN PLANCHER À 1. La règle d'écartement par tombe du client est
         `tombe >= (enr._m || 0)` : un enregistrement daté 0 est tuable par n'importe quelle
         tombe de n'importe quelle époque. On refuse, avec un motif que l'écran peut dire —
         un refus silencieux ferait disparaître du travail sans que personne comprenne. */
      if (majLe < 1) { refus.push({ c: coll, id, motif: 'non_date' }); continue; }

      const a = actuel.get(coll, id);
      if (a && a.maj_le >= majLe) { refus.push({ c: coll, id, motif: 'conflit', serveur: a.maj_le }); continue; }

      /* ⛔ LE RANG S'ALLOUE APRÈS LE DERNIER REFUS POSSIBLE, jamais avant. Mesuré le
         18 septembre 2026 : un refus `corps_absent` faisait quand même monter `meta.seq`
         de 3 à 4 — un appareil qui rejoue une ligne malformée gonflait le compteur d'une
         entreprise sans rien écrire, et `depuis()` annonçait un rang qu'aucune ligne ne
         portait. Aucune donnée perdue, mais un compteur qui ment est un compteur qu'on
         cesse de croire. */
      let corps = null, empreinte = null, octets = 0;
      if (!supprimeLe) {
        if (l.r === undefined || l.r === null) { refus.push({ c: coll, id, motif: 'corps_absent' }); continue; }
        empreinte = String(l.e || '');
      }
      const seq = parseInt(suivant.get().val, 10);
      if (!supprimeLe) {
        corps = sceller_corps(dek, t, coll, id, majLe, supprimeLe, l.r);
        octets = corps.length;
      }
      poser.run(coll, id, majLe, seq, supprimeLe, String(c.app_id || ''), corps, empreinte, octets);
      /* Le journal garde le corps SCELLÉ : c'est lui qui permet de revenir à une version, et
         c'est lui que la purge à 90 jours videra (le reste de la ligne, lui, ne s'efface pas —
         l'historique de QUI a fait QUOI reste, sans le contenu). */
      tracer.run(seq, Date.now(), coll, id, majLe, supprimeLe ? 1 : 0, String(c.app_id || ''),
        String(c.utilisateur || ''), String(c.ver || ''), octets, String(c.origine || 'appareil'), empreinte, corps);
      acceptes.push({ c: coll, id, seq });
    }
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch (x) {} throw e; }

  const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10);
  majAnnuaire(t, seq);
  return { seq, acceptes: acceptes.length, refus };
}

/* Le compteur de l'annuaire suit, pour que la Tour n'ait jamais à ouvrir les bases. */
function majAnnuaire(t, seq) {
  t = exigerT(t);
  const db = ouvrir(t);
  const o = db.prepare('SELECT COALESCE(SUM(octets),0) AS o FROM enr').get().o || 0;
  annuaire().prepare('UPDATE entreprise SET seq=?, octets=? WHERE t=?').run(seq, o, t);
}

/* ══ LIRE — LE DELTA, PAGINÉ PAR `seq` STRICTEMENT CROISSANTE ═══════════════════════════════ */
function depuis(t, apresSeq, max) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const n = Math.min(400, Math.max(1, parseInt(max, 10) || 400));
  const lignes = db.prepare('SELECT coll,id,maj_le,seq,supprime_le,corps,empreinte FROM enr WHERE seq>? ORDER BY seq LIMIT ?')
    .all(parseInt(apresSeq, 10) || 0, n);

  /* ⛔ UNE LIGNE ILLISIBLE NE FAIT PAS TOMBER LA LECTURE ENTIÈRE. Mesuré le 18 septembre 2026 :
     un seul `maj_le` trafiqué en base faisait jeter `depuis()` — donc l'entreprise ne
     synchronisait PLUS JAMAIS, ni ses 20 000 autres lignes, ni sa Réception, et sans aucun
     moyen de savoir laquelle. L'AAD est là pour rendre une ligne trafiquée VISIBLE, pas pour
     murer un client. On l'écarte, on la compte, et l'appelant remonte le compte. Ce qui ne se
     déchiffre pas ne se sert pas : on ne rend jamais un corps douteux. */
  const enr = []; const illisibles = [];
  for (const l of lignes) {
    if (l.supprime_le) { enr.push({ c: l.coll, id: l.id, m: l.maj_le, s: l.seq, sup: l.supprime_le, r: null }); continue; }
    let r;
    try { r = desceller_corps(dek, t, l.coll, l.id, l.maj_le, l.supprime_le, l.corps); }
    catch (e) { illisibles.push({ c: l.coll, id: l.id, s: l.seq }); continue; }
    enr.push({ c: l.coll, id: l.id, m: l.maj_le, s: l.seq, sup: l.supprime_le, r });
  }

  const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10);
  /* ⛔ LE CURSEUR SE PREND SUR LES LIGNES LUES EN BASE, PAS SUR CELLES QU'ON REND. Le prendre
     sur `enr` ferait piétiner l'appareil pour toujours dès qu'une ligne illisible termine une
     page : il redemanderait éternellement la même page. */
  const dernier = lignes.length ? lignes[lignes.length - 1].seq : (parseInt(apresSeq, 10) || 0);
  const reste = db.prepare('SELECT COUNT(*) AS n FROM enr WHERE seq>?').get(dernier).n;
  return { seq, curseur: dernier, reste, enr, illisibles };
}

/* ══ VÉRIFIER — LE CONTRÔLE COMPLET, HORS CHEMIN CHAUD ══════════════════════════════════════
 * `etat()` compte et signe sans rien déchiffrer : c'est ce qu'on appelle à chaque synchro.
 * `verifier()` déchiffre TOUT — c'est cher, donc c'est une route d'administration, jamais le
 * chemin d'un appareil. Il répond à la seule question qui compte après une restauration ou un
 * doute sur la clé : est-ce que tout se relit ? */
function verifier(t) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  let lues = 0; const illisibles = [];
  for (const l of db.prepare('SELECT coll,id,maj_le,seq,supprime_le,corps FROM enr WHERE supprime_le=0 ORDER BY seq').all()) {
    try { desceller_corps(dek, t, l.coll, l.id, l.maj_le, l.supprime_le, l.corps); lues++; }
    catch (e) { illisibles.push({ c: l.coll, id: l.id, s: l.seq }); }
  }
  return { lues, illisibles, ok: illisibles.length === 0 };
}

/* ══ L'ÉTAT — LE CONTRÔLE DE NON-RÉGRESSION ════════════════════════════════════════════════
 * L'appareil calcule sa signature, le serveur recompose la même depuis ses lignes. Toute
 * différence se voit AVANT qu'on bascule quoi que ce soit. La signature ne regarde QUE ce qui
 * identifie et date : ni `seq` (rang serveur, absent du client), ni le corps (le client peut
 * l'écrire autrement sans que ce soit une divergence). */
function etat(t) {
  t = exigerT(t);
  const db = ouvrir(t);
  const parColl = {};
  for (const l of db.prepare('SELECT coll, COUNT(*) AS n, COALESCE(SUM(octets),0) AS o FROM enr WHERE supprime_le=0 GROUP BY coll').all()) {
    parColl[l.coll] = { n: l.n, octets: l.o };
  }
  const h = crypto.createHash('sha256');
  for (const l of db.prepare('SELECT coll,id,maj_le,supprime_le FROM enr ORDER BY coll,id').all()) {
    h.update(l.coll + '\u0000' + l.id + '\u0000' + l.maj_le + '\u0000' + l.supprime_le + '\n');
  }
  const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10);
  const octets = db.prepare('SELECT COALESCE(SUM(octets),0) AS o FROM enr').get().o || 0;
  return { seq, parColl, octets, signature: h.digest('hex') };
}

/* ══ EFFACER UNE ENTREPRISE ═════════════════════════════════════════════════════════════════
 * ⛔ LES TROIS FICHIERS, PAS UN SEUL. En WAL, `base.db-wal` peut porter des écritures non
 * fusionnées : n'effacer que `base.db` laisse des données derrière soi, silencieusement. Et la
 * DEK part avec — une fois détruite, ce qui traînerait ailleurs (une sauvegarde, un instantané)
 * est du bruit. C'est la seule façon propre de tenir une promesse d'effacement. */
function effacerEntreprise(t) {
  t = exigerT(t);
  /* `close()` fusionne le WAL et fait disparaître `-wal` et `-shm` tout seul — c'est pourquoi
     les trois `unlink` en comptent souvent UN. Ils ne sont pas décoratifs pour autant : après
     un redémarrage, le fichier n'est pas dans le cache, il n'y a personne pour le fermer, et
     les trois existent. */
  try { const db = _bases.get(t); if (db) db.close(); } catch (e) {}
  _bases.delete(t);
  for (const suffixe of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(baseDe(t) + suffixe); } catch (e) {}
  }
  try { fs.rmSync(dossierDe(t), { recursive: true, force: true }); } catch (e) {}
  try { annuaire().prepare('DELETE FROM entreprise WHERE t=?').run(t); } catch (e) {}
  try { annuaire().prepare('DELETE FROM appareil WHERE t=?').run(t); } catch (e) {}

  /* ⛔ ON CONSTATE, ON NE SUPPOSE PAS. Compter les `unlink` réussis ne dit rien : la réponse
     à « est-ce effacé ? » est « qu'est-ce qui reste sur le disque ? ». L'appelant ne doit
     JAMAIS annoncer une entreprise effacée sur autre chose que `ok:true` — c'est exactement
     la panne silencieuse type de ce dépôt (croire une entreprise coupée quand elle ne l'est
     pas). Et l'entrée d'annuaire compte autant que le fichier : sans elle, la DEK reste. */
  let restes = [];
  try { restes = fs.readdirSync(dossierDe(t)); } catch (e) {}
  const dossier = fs.existsSync(dossierDe(t));
  let annuaireReste = 1;
  try { annuaireReste = annuaire().prepare('SELECT COUNT(*) AS n FROM entreprise WHERE t=?').get(t).n; } catch (e) {}
  return { ok: !dossier && annuaireReste === 0, dossier, restes, annuaire: annuaireReste };
}

/* ══ LA SANTÉ, POUR /health — AGRÉGÉE, JAMAIS NOMINATIVE ════════════════════════════════════
 * `/health` est publique : elle ne dit jamais quelles entreprises existent. Un nombre et un
 * état, rien d'autre. Même discipline que le compteur de pièces jointes et celui des refus. */
function sante() {
  let bases = 0;
  try { bases = fs.readdirSync(SOCLE_DIR).filter(d => fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))).length; } catch (e) {}
  return { actif: true, bases, cle: !!kek() };
}

module.exports = {
  ouvrir, annuaire, dekDe, pousser, depuis, etat, verifier, effacerEntreprise, sante,
  exigerT,
  sceller, desceller, sceller_corps, desceller_corps, aadCorps, aadFichier,
  kekDepuis, exigerKek, SOCLE_DIR, ANNUAIRE_PATH, SCHEMA_VERSION,
};
