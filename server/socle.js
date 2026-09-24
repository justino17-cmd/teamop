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
 * C'est exactement là que les trous se creusent. L'invariant n'est PAS « un seul accesseur » —
 * une version de ce commentaire l'a écrit et c'était faux, il y en a dix-huit : c'est que
 * TOUTE requête visant ses tables par entreprise (`entreprise`, `appareil`) porte un `t=?`,
 * à UNE exception près, la recherche par jeton, qui ne peut pas en avoir puisque c'est elle
 * qui fait naître `t`. C'est cet invariant-là que `tests/test-723.js` vérifie, en comptant les
 * requêtes sans `t` et en en exigeant exactement une. Elle n'est pas qu'une commodité : un comptage
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
/* Le nom du dossier d'instantané DANS l'archive. `sauvegarde.js` et `restaurer.js` s'en
   servent tous les deux : une seule constante, sinon les deux divergeront un jour. */
const SOCLE_INSTANTANE = 'socle-instantane';
/* Cinq minutes : au-delà, une date vient d'une horloge déréglée, pas d'un appareil hors ligne. */
const HORLOGE_MARGE_MS = 5 * 60000;
/* Bornes de forme. Généreuses — une fiche produit avec ses photos en base64 passe — mais
   RÉELLES : sans elles, un seul appareil authentifié remplit le disque du VPS, et le disque
   du VPS est celui de tous les clients. Les pièces jointes sortiront du corps à l'étape 3 ;
   ces bornes baisseront alors. */
const COLL_MAX = 40, ID_MAX = 200, CORPS_MAX = 512 * 1024;
/* Un filtre de lecture ne nomme que les collections d'UNE application : vingt suffit largement
   (la messagerie en a trois). La borne existe pour qu'une requête ne puisse pas fabriquer un
   `IN (...)` de mille éléments à chaque page. */
const COLLS_FILTRE_MAX = 20;
/* ⛔ L'EMPREINTE DU FILTRE VOYAGE AVEC LA RÉPONSE, ET C'EST CE QUI REND LE CURSEUR SÛR.
   Un curseur n'a de sens que pour le filtre qui l'a produit : un appareil qui passerait de
   « messagerie seule » à « tout », en gardant son curseur, sauterait DÉFINITIVEMENT tout ce
   que l'ancien filtre écartait — sans une erreur, sans un écran, sans rien. L'appelant range
   cette empreinte à côté de son curseur et repart de zéro dès qu'elle change.
   Triée : l'ordre des collections ne doit pas fabriquer deux empreintes pour un même filtre. */
const empreinteFiltre = (l) => (!l || !l.length) ? ''
  : crypto.createHash('sha256').update(l.slice().sort().join('\u0000')).digest('hex').slice(0, 16);
/* Une ligne déclare les pièces qu'elle référence (`f:[sha…]`). Un plafond, parce que la liste
   vient du réseau : une intervention en porte trois ou quatre, jamais deux cents. Ce qui
   dépasse est ignoré — la ligne passe quand même, on ne refuse pas du travail pour un
   registre de ménage. */
const FICHIERS_PAR_LIGNE_MAX = 200;
/* Le plafond du corps DÉCOMPRESSÉ — voir `desceller_corps`. */
const CLAIR_MAX = 16 * 1024 * 1024;
/* Le plafond du POIDS D'UNE RÉPONSE, compté sur le CLAIR — voir `depuis()`. */
const REPONSE_MAX = 8 * 1024 * 1024;
/* ⛔ LE CLOISONNEMENT NE S'ARRÊTE PAS AU FICHIER. Un fichier par entreprise sépare les
 * DONNÉES ; il ne sépare pas le DISQUE, et le disque du VPS est celui de TOUS les clients.
 * Sans plafond, un seul appareil authentifié écrit ~7 Go/h dans les limites du quota horaire,
 * remplit le disque, et ce n'est pas son entreprise qui tombe : c'est la plateforme. Deux
 * bornes, donc, et elles disent deux choses différentes :
 *   · `OCTETS_MAX` — ce qu'une entreprise a le droit d'occuper. Son problème, son message.
 *   · `DISQUE_PLANCHER` — ce qu'il reste sur le disque, quelle qu'en soit la cause (journaux,
 *     copies de sauvegarde, images). C'est le seul contrôle qui voie la VÉRITÉ, et il protège
 *     les autres. On lit `bavail` (ce qu'un non-root peut vraiment prendre) et PAS `bfree`,
 *     qui compte la réserve du superutilisateur. Même geste que `pieces.js`.
 * ⚠️ ET IL A UNE POLITIQUE D'ÉCHEC ÉCRITE : si `statfs` lève, on LAISSE PASSER et on le dit au
 * journal. Un contrôle de confort qui casserait le service en tombant serait pire que son
 * absence — mais un contrôle qui tombe en silence ne contrôle rien. */
const OCTETS_MAX_DEFAUT = 512 * 1024 * 1024;
const DISQUE_PLANCHER_DEFAUT = 2 * 1024 * 1024 * 1024;
function disquePlein(plancher) {
  try {
    const st = fs.statfsSync(SOCLE_DIR.replace(/\/socle$/, '') || '/');
    return (st.bavail * st.bsize) < (plancher || DISQUE_PLANCHER_DEFAUT);
  } catch (e) { console.error('socle: espace disque non mesurable, écriture laissée passer —', e.code || 'erreur'); return false; }
}

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
/* Le clair, sans l'analyse JSON : `depuis()` en a besoin pour PESER ce qu'il vient de
   décompresser, et décompresser deux fois pour mesurer serait payer deux fois le coût qu'on
   cherche justement à borner. */
function desceller_clair(dek, t, coll, id, majLe, supprimeLe, blob) {
  return zlib.gunzipSync(desceller(dek, blob, aadCorps(t, coll, id, majLe, supprimeLe)), { maxOutputLength: CLAIR_MAX });
}
function desceller_corps(dek, t, coll, id, majLe, supprimeLe, blob) {
  /* ⛔ LA BORNE D'ÉCRITURE PORTE SUR LE COMPRESSÉ, LA LECTURE DÉCOMPRESSE — il fallait donc
     une seconde borne, ici. `CORPS_MAX` accepte 512 Ko SCELLÉS ; du texte répété se comprime
     par mille, donc 512 Ko de chiffré peuvent rendre des centaines de mégaoctets en mémoire,
     en SYNCHRONE, sur la boucle d'événements de tous les clients. MESURÉ : 2,3 Go et 4,9 s de
     serveur gelé pour UNE requête — et il suffit d'avoir écrit la ligne une fois pour la
     rejouer à chaque lecture. `maxOutputLength` fait jeter zlib au lieu d'allouer.
     ⚠️ La borne est GÉNÉREUSE (16 Mo) : elle n'est pas là pour contraindre un usage réel,
     elle est là pour qu'il existe un plafond. */
  const clair = zlib.gunzipSync(desceller(dek, blob, aadCorps(t, coll, id, majLe, supprimeLe)), { maxOutputLength: CLAIR_MAX });
  return JSON.parse(clair.toString('utf8'));
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
  /* ⛔ LA MARCHE ARRIÈRE DE L'ÉTAPE 4, PAR ESPACE, ET CÔTÉ SERVEUR.
     Pendant la double écriture, l'appareil écrit Firestore COMME AUJOURD'HUI et pousse EN PLUS
     ses lignes ici. Si quelque chose va mal, il faut pouvoir couper la seconde écriture
     immédiatement — et « immédiatement » exclut de publier une version d'application et
     d'attendre que vingt téléphones se mettent à jour. Ce n'est pas un retour arrière, c'est
     une panne longue. Le drapeau est donc SERVEUR : une requête, et c'est coupé.
     ⛔ ET IL VAUT 0 PAR DÉFAUT. Une entreprise qui apparaît dans l'annuaire n'est pas en double
     écriture : il faut un geste, espace par espace, depuis la Tour. Le contraire ferait
     basculer une entreprise le jour où elle crée sa base, sans que personne l'ait décidé.
     ⚠️ `ALTER TABLE` plutôt qu'un `CREATE` modifié : la table existe déjà sur les bases créées
     avant, et `CREATE TABLE IF NOT EXISTS` ne les toucherait pas — la colonne manquerait, en
     silence, exactement sur les espaces les plus anciens. */
  try { db.exec("ALTER TABLE entreprise ADD COLUMN double INTEGER NOT NULL DEFAULT 0"); }
  catch (e) { /* déjà là : c'est le cas nominal après le premier démarrage */ }
  /* ⛔ LA BASCULE DE LA LECTURE — ÉTAPE 5, ET C'EST LE DRAPEAU QUI COMPTE LE PLUS DU CHANTIER.
     `double` décide où l'appareil ÉCRIT EN PLUS ; celui-ci décide où il LIT. Tant qu'il vaut
     `firestore`, le socle est un miroir que personne ne consulte : une ligne perdue ne se voit
     pas, mais elle ne casse rien non plus. Le jour où il vaut `socle`, le VPS devient la source
     de vérité de l'entreprise — et une ligne perdue devient une donnée perdue.
     ⛔ IL EST SERVEUR, PAR ESPACE, ET IL VAUT `firestore` PAR DÉFAUT. Le retour arrière doit
     coûter UNE REQUÊTE : Firestore reste à jour à la seconde près parce que la double écriture
     n'est PAS arrêtée en même temps. C'est très exactement pour ça qu'on ne l'arrête pas.
     ⚠️ Une CHAÎNE et pas un booléen : un troisième état viendra (`miroir`, l'étape 6), et un
     booléen qu'on élargit après coup est un booléen qu'on lit faux quelque part. */
  try { db.exec("ALTER TABLE entreprise ADD COLUMN lecture TEXT NOT NULL DEFAULT 'firestore'"); }
  catch (e) { /* déjà là */ }
  db.exec(`CREATE TABLE IF NOT EXISTS appareil (t TEXT NOT NULL, app_id TEXT NOT NULL, jeton_sha TEXT NOT NULL,
             exp INTEGER NOT NULL, cree_le INTEGER NOT NULL, vu_le INTEGER NOT NULL DEFAULT 0, nom TEXT NOT NULL DEFAULT '',
             revoque_le INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (t, app_id))`);
  /* ⛔ `rang` N'EST PAS DÉCORATIF, ET IL A COÛTÉ UNE SONDE. La chaîne était d'abord ordonnée
     par `(ts, id)` : MESURÉ le 18 septembre 2026, cinq lignes écrites dans la MÊME
     milliseconde se relisaient dans l'ordre de leurs `id` tirés au hasard, donc pas dans
     l'ordre où elles avaient été chaînées — `ancreVerifier()` rendait `ok:false` sur un
     journal parfaitement intact. Un journal qui crie au loup en permanence est un journal
     qu'on débranche, et c'est très exactement comme ça qu'on perd la seule chose opposable
     du dispositif. Le rowid de SQLite, lui, est monotone et n'a besoin ni d'horloge ni de
     hasard. ⚠️ AUTOINCREMENT (et pas le rowid nu) : sans lui, SQLite RÉEMPLOIE le rang d'une
     ligne effacée, et une chaîne dont les rangs reculent ne prouve plus rien. */
  db.exec(`CREATE TABLE IF NOT EXISTS diagnostic (rang INTEGER PRIMARY KEY AUTOINCREMENT,
             id TEXT NOT NULL UNIQUE, ts INTEGER NOT NULL, qui TEXT NOT NULL,
             t TEXT NOT NULL, motif TEXT NOT NULL, portee TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0,
             ip_h TEXT NOT NULL DEFAULT '', chaine_sha TEXT NOT NULL DEFAULT '')`);
  /* Les réglages de l'annuaire — ce qui doit survivre à un redémarrage. Il n'y en a qu'un
     aujourd'hui (la date du dernier envoi d'ancre) et c'est déjà une raison suffisante : une
     minuterie de 24 h sur un serveur qui redémarre plusieurs fois par jour ne se déclenche
     JAMAIS. Mémoire = remis à zéro à chaque déploiement ; disque = tenu. */
  db.exec('CREATE TABLE IF NOT EXISTS reglage (cle TEXT PRIMARY KEY, val TEXT)');
  db.exec('CREATE INDEX IF NOT EXISTS diagnostic_t ON diagnostic(t, ts DESC)');
  db.exec('CREATE INDEX IF NOT EXISTS appareil_jeton ON appareil(jeton_sha)');
  _annuaire = db;
  return db;
}

/* La DEK d'une entreprise : 32 octets tirés au hasard, scellés sous la clé maître avec `t` en
   AAD — donc la clé d'une entreprise ne peut pas être présentée comme celle d'une autre.
   Créée à la première ouverture, jamais régénérée : la régénérer rendrait ses lignes illisibles. */
function dekDe(t, baseNeuve) {
  t = exigerT(t);
  const K = exigerKek();
  const db = annuaire();
  const l = db.prepare('SELECT dek FROM entreprise WHERE t=?').get(t);
  if (l && l.dek) {
    /* ⛔ UN REFUS DOIT DIRE QUOI FAIRE. Sans ce `catch`, une clé maître qui ne correspond pas
       remonte l'erreur brute de GCM (« Unsupported state or unable to authenticate data ») —
       exacte, illisible, et qui ressemble à de la corruption. Le témoin plus bas produisait le
       bon message, mais on n'y arrivait jamais : on échoue ICI, plus tôt. */
    try { return desceller(K, l.dek, t); }
    catch (e) {
      throw new Error('⛔ la clé maître ne correspond PAS à l\'annuaire de « ' + t + ' ».\n'
        + '  Cette installation a été faite avec une AUTRE clé. Ne rien écrire : les données\n'
        + '  existantes deviendraient un mélange illisible.\n'
        + '  Récupérer la bonne clé dans le séquestre (deux copies scellées, PLAN-OP-SOCLE §2.3).');
    }
  }
  /* ⛔ UNE CLÉ ABSENTE N'EST PAS UNE ENTREPRISE NEUVE QUAND SA BASE EXISTE DÉJÀ. Sans ce
     contrôle, un annuaire plus ancien que les fichiers — restauration partielle,
     `socle-annuaire.db` abîmé — faisait TIRER UNE CLÉ NEUVE sans un mot : toutes les données
     de l'entreprise devenaient illisibles d'un coup, le serveur restait VERT, l'application
     affichait une base vide, et les écritures suivantes étaient acceptées par-dessus — ce qui
     rendait le retour à l'ancien annuaire impossible sans perdre le travail du jour.
     REPRODUIT le 18 septembre 2026 : une ligne d'annuaire effacée, et `pousser()` acceptait
     une écriture scellée sous la clé neuve dans la même table que les anciennes.
     C'est le symétrique du témoin de clé maître, qui existait pour la KEK et manquait pour la
     DEK. ⛔ « Je n'ai rien » et « je ne sais plus lire » ne doivent JAMAIS rendre la même
     réponse — c'est la règle des trois états, appliquée au stockage.
     ⚠️ `baseNeuve` est passé par `ouvrir()`, qui SAIT si le fichier existait avant lui : à ce
     moment-là `new DatabaseSync()` l'a déjà créé, donc un `existsSync` ici dirait « elle
     existe » sur une entreprise parfaitement neuve et refuserait de la créer. */
  if (!baseNeuve && fs.existsSync(baseDe(t))) {
    throw new Error('⛔ la base de « ' + t + ' » existe mais sa clé n\'est PAS dans l\'annuaire.\n'
      + '  Ne rien écrire : une clé neuve rendrait ses données définitivement illisibles, et les\n'
      + '  écritures suivantes empêcheraient tout retour en arrière.\n'
      + '  L\'annuaire (socle-annuaire.db) est plus ancien que les bases, ou abîmé.\n'
      + '  Restaurer l\'annuaire qui va AVEC ces bases — voir PLAN-OP-SOCLE §2.3.');
  }
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
  const neuve = !fs.existsSync(baseDe(t));
  /* ⛔ ON SÈME LE COMPTEUR AVANT DE CRÉER LE FICHIER. Semé après, le balayage initial voyait
     déjà la base neuve, et le `_nbBases++` d'en bas la comptait une SECONDE fois : `/health`
     annonçait une base de trop, pour toujours, après le premier démarrage. Un compteur qui se
     trompe d'une unité est un compteur qu'on cesse de croire. */
  semerCompteurs();
  fs.mkdirSync(dossierDe(t), { recursive: true });
  const db = new (moteur().DatabaseSync)(baseDe(t));
  /* ⛔ TOUT CE QUI SUIT EST SOUS UN `try` QUI FERME. La base est OUVERTE à la ligne du dessus :
     à partir d'ici, n'importe quelle exception — un témoin qui refuse, `dekDe` qui refuse, une
     table qui ne se crée pas — emporte le descripteur de fichier avec elle. Et la base n'est
     pas encore dans `_bases`, donc PERSONNE ne peut plus la fermer.
     ⛔ MESURÉ le 19 septembre 2026, sur exactement le cas que la garde vise (base présente,
     annuaire absent) : **277 descripteurs pour 200 requêtes refusées**, plus un `-wal` laissé
     à côté. La limite systemd par défaut est à 1024 : quelques centaines de synchros retentées
     par une entreprise mal restaurée, et c'est `EMFILE` — plus AUCUNE route ne répond, pour
     tous les clients. La minuterie horaire de purge en fuyait un de plus par heure, seule.
     ⚠️ Les deux `try { db.close() }` des témoins plus bas deviennent redondants ; on les garde
     parce qu'ils ferment AVANT de lever, ce qui est plus clair à lire — mais c'est ce `catch`
     qui rend la propriété vraie sur TOUS les chemins, y compris ceux qu'on n'a pas prévus. */
  try {
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
  /* ⛔ QUELLE LIGNE RÉFÉRENCE QUELLE PIÈCE — ÉTAPE 3, ET C'EST CE QUI MANQUAIT POUR QUE LE
     MÉNAGE SOIT POSSIBLE. Aujourd'hui une pièce ne disparaît du disque du VPS que sur un geste
     du client (`pieceSupprimer` dans `app.html`) : un onglet fermé au mauvais moment, une
     coupure réseau, une suppression faite depuis un AUTRE appareil, et le fichier reste là
     POUR TOUJOURS. Le dossier grossit sans fin, et c'est `pieces.remplissage` de `/health` qui
     finit par crier — trop tard, quand les dépôts sont déjà refusés sur le terrain.
     ⚠️ C'est l'APPAREIL qui déclare (`f:[sha…]` sur la ligne), pas le serveur qui devine. Il
     POURRAIT deviner — il a la clé — mais ce serait un déchiffrement par ligne et par envoi,
     sur la boucle d'événements, pour une information que l'appareil connaît gratuitement
     puisqu'il vient d'écrire le corps. Même raisonnement que le poids des pièces, tenu en
     incrémental plutôt que rebalayé (voir l'en-tête de `pieces.js`, point 1).
     ⚠️ ET CE N'EST QU'UN REGISTRE : les octets vivent dans `pieces.js`, un seul stockage. En
     créer un second ici ferait diverger les deux le jour où l'un serait corrigé sans l'autre. */
  db.exec(`CREATE TABLE IF NOT EXISTS ligne_fichier (coll TEXT NOT NULL, id TEXT NOT NULL,
             sha TEXT NOT NULL, PRIMARY KEY (coll,id,sha)) WITHOUT ROWID`);
  db.exec('CREATE INDEX IF NOT EXISTS ligne_fichier_sha ON ligne_fichier(sha)');
  db.exec('CREATE TABLE IF NOT EXISTS meta (cle TEXT PRIMARY KEY, val TEXT)');

  const lire = c => { const l = db.prepare('SELECT val FROM meta WHERE cle=?').get(c); return l ? l.val : null; };
  const poser = (c, v) => db.prepare('INSERT INTO meta (cle,val) VALUES (?,?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val').run(c, String(v));
  if (lire('seq') === null) poser('seq', '0');
  if (lire('schema') === null) poser('schema', SCHEMA_VERSION);

  /* ⛔ LE TÉMOIN DE CLÉ. Un HMAC d'une constante sous la clé maître, écrit à la création et
     comparé à chaque ouverture. Sans lui, une réinstallation qui tire une clé neuve démarre
     VERT — le serveur répond, SQLite ouvre — et l'échec ne se voit qu'au déchiffrement, ligne
     par ligne, où il ressemble à de la corruption. On refuse d'ouvrir, et on dit quoi faire. */
  /* ⛔ DEUX TÉMOINS, PAS UN — ils répondent à deux questions différentes et disent quoi faire
     dans deux cas différents. Celui de la KEK : « ce serveur a-t-il la bonne clé maître ? ».
     Celui de la DEK : « cette base va-t-elle avec CETTE ligne d'annuaire ? ». Les confondre
     reviendrait à rendre la même réponse à deux pannes distinctes. */
  const temoinDek = crypto.createHmac('sha256', dekDe(t, neuve)).update('teamop-socle-dek-v1').digest('hex');
  const vuDek = lire('dek_temoin');
  if (vuDek === null) poser('dek_temoin', temoinDek);
  else if (vuDek !== temoinDek) {
    try { db.close(); } catch (e) {}
    _bases.delete(t);
    throw new Error('⛔ la clé de « ' + t + ' » ne correspond PAS à sa base.\n'
      + '  L\'annuaire porte une clé, la base en attend une autre : ils viennent de deux moments\n'
      + '  différents (restauration partielle, annuaire abîmé, base recopiée d\'ailleurs).\n'
      + '  ⛔ NE RIEN ÉCRIRE : chaque écriture mélangerait deux générations de clés dans la même\n'
      + '  table et rendrait le retour en arrière impossible.\n'
      + '  Restaurer l\'annuaire et les bases du MÊME instantané — voir PLAN-OP-SOCLE §2.3.');
  }

  const temoin = crypto.createHmac('sha256', K).update('teamop-socle-temoin-v1').digest('hex');
  const vu = lire('kek_temoin');
  if (vu === null) poser('kek_temoin', temoin);
  else if (vu !== temoin) {
    try { db.close(); } catch (e) {}
    _bases.delete(t);
    throw new Error('⛔ la clé maître ne correspond PAS à la base de « ' + t +' ».\n'
      + '  Cette base a été créée avec une AUTRE clé. Ne rien écrire : les lignes existantes\n'
      + '  deviendraient un mélange illisible. Récupérer la bonne clé dans le séquestre\n'
      + '  (deux copies scellées, voir PLAN-OP-SOCLE §2.3), ou restaurer la base qui va avec.');
  }
  _bases.set(t, db);
  if (neuve) _nbBases++;
  return db;
  } catch (e) {
    /* ⛔ ON FERME, PUIS ON RELÈVE TELLE QUELLE. Le message de refus porte ce qu'il faut faire :
       l'avaler ou le remplacer ferait perdre la seule chose utile de cette panne. */
    try { db.close(); } catch (x) {}
    _bases.delete(t);
    /* Une base NEUVE dont l'ouverture a échoué ne doit pas laisser un fichier vide derrière
       elle : au prochain passage, `neuve` vaudrait false et `dekDe` refuserait pour de bon. */
    if (neuve) { for (const sx of ['', '-wal', '-shm']) { try { fs.unlinkSync(baseDe(t) + sx); } catch (x) {} } }
    throw e;
  }
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
/* ⛔ CE QUI EST ENCORE RÉFÉRENCÉ, POUR QUE LE MÉNAGE SOIT POSSIBLE SANS ÊTRE DANGEREUX.
   Rend l'ensemble des `sha` qu'au moins une ligne VIVANTE cite. Le ménage des pièces se fait
   par différence : ce qui est sur le disque et n'est pas là-dedans n'intéresse plus personne.
   ⚠️ ET LE SENS DE LA COMPARAISON N'EST PAS INDIFFÉRENT. On liste ce qui EST référencé, jamais
   « ce qui est orphelin » : si cette fonction échoue ou rend une liste incomplète, l'appelant
   garde des fichiers en trop — un coût de disque. Dans l'autre sens, il en effacerait de
   vivants — des photos de terrain perdues. Quand une fonction peut se tromper, elle doit se
   tromper du côté qui ne détruit rien.
   ⚠️ Et le ménage ne doit PAS s'appuyer sur elle seule : une pièce vient d'être déposée et sa
   ligne n'est pas encore poussée. L'appelant doit donc épargner ce qui est récent — c'est à
   lui de le décider, pas à ce module qui ne connaît pas le disque.
   ⚠️ LE `supprime_le = 0` EST UNE SECONDE CEINTURE, ET IL FAUT LE SAVOIR AVANT D'ÉPROUVER CE
   MODULE. `pousser` efface déjà les références d'une ligne à chaque écriture, tombe comprise :
   il ne DEVRAIT donc jamais rester de ligne_fichier pour un enregistrement mort. Le retirer ne
   fait tomber aucun banc — mesuré le 20 septembre 2026 — parce que la première garde couvre
   déjà le cas, exactement comme la garde d'inertie d'`instantanerVers` que `CLAUDE.md` cite.
   On le garde quand même : il coûte zéro et il tient si quelqu'un ajoute un jour un chemin
   d'écriture qui oublie l'effacement. Mais on n'écrira pas qu'il est « gardé par un banc »,
   parce qu'il ne l'est pas et qu'aucun banc ne peut l'atteindre par l'API publique. */
function fichiersReferences(t) {
  t = exigerT(t);
  const out = new Set();
  try {
    const db = ouvrir(t);
    for (const r of db.prepare(`SELECT DISTINCT lf.sha FROM ligne_fichier lf
        JOIN enr e ON e.coll = lf.coll AND e.id = lf.id
        WHERE e.supprime_le = 0`).all()) out.add(r.sha);
  } catch (e) {}
  return out;
}
/* Ce qu'UNE ligne référence — pour la Tour, et pour comprendre d'où vient un fichier. */
function fichiersDeLigne(t, coll, id) {
  t = exigerT(t);
  try {
    return ouvrir(t).prepare('SELECT sha FROM ligne_fichier WHERE coll=? AND id=? ORDER BY sha').all(String(coll || ''), String(id || '')).map(r => r.sha);
  } catch (e) { return []; }
}
function pousser(t, lignes, ctx) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const c = ctx || {};
  const acceptes = [], refus = [];
  const maintenant = Date.now();
  let horlogeVues = 0;

  /* Les deux plafonds se lisent AVANT la transaction : refuser un lot entier coûte un
     aller-retour, écrire à moitié coûterait une base incohérente. Le poids est celui que
     `majAnnuaire` tient déjà à jour — aucune relecture de la base ici. */
  const octetsMax = parseInt(c.octetsMax, 10) || OCTETS_MAX_DEFAUT;
  if (disquePlein(c.disquePlancher)) {
    return { seq: rang(t), acceptes: 0, refus: (lignes || []).map(l => ({ c: String((l && l.c) || ''), id: String((l && l.id) || ''), motif: 'disque_plein' })) };
  }
  let occupe = 0;
  try { occupe = (annuaire().prepare('SELECT octets FROM entreprise WHERE t=?').get(t) || {}).octets || 0; } catch (e) {}
  if (occupe > octetsMax) {
    return { seq: rang(t), acceptes: 0, plein: true, octets: occupe, octetsMax,
      refus: (lignes || []).map(l => ({ c: String((l && l.c) || ''), id: String((l && l.id) || ''), motif: 'espace_plein' })) };
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const suivant = db.prepare("UPDATE meta SET val=val+1 WHERE cle='seq' RETURNING val");
    const actuel = db.prepare('SELECT maj_le, supprime_le, seq, empreinte, corps FROM enr WHERE coll=? AND id=?');
    /* La version du serveur, rendue AVEC le refus. ⛔ On ne détruit jamais ce qu'on refuse
       d'écrire et on dit où le retrouver : l'appareil adopte celle-ci et met la sienne de côté.
       Sans le corps, il ne pourrait qu'effacer le sien ou ignorer le refus. */
    const versionServeur = (a, coll, id) => {
      const o = { m: a.maj_le, sup: a.supprime_le, e: a.empreinte || '' };
      if (a.supprime_le || !a.corps) { o.r = null; return o; }
      try { o.r = desceller_corps(dek, t, coll, id, a.maj_le, a.supprime_le, a.corps); }
      catch (e) { o.r = null; o.illisible = true; }
      return o;
    };
    const poser = db.prepare(`INSERT INTO enr (coll,id,maj_le,seq,supprime_le,par,corps,empreinte,octets)
      VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(coll,id) DO UPDATE SET
      maj_le=excluded.maj_le, seq=excluded.seq, supprime_le=excluded.supprime_le, par=excluded.par,
      corps=excluded.corps, empreinte=excluded.empreinte, octets=excluded.octets`);
    const tracer = db.prepare(`INSERT INTO journal (seq,ts,coll,id,maj_le,supprime,par,utilisateur,ver,octets,origine,empreinte,corps)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const oublierRefs = db.prepare('DELETE FROM ligne_fichier WHERE coll=? AND id=?');
    const noterRef = db.prepare('INSERT OR IGNORE INTO ligne_fichier (coll,id,sha) VALUES (?,?,?)');

    for (const l of (lignes || [])) {
      const coll = String((l && l.c) || ''), id = String((l && l.id) || '');
      const majLe = parseInt(l && l.m, 10) || 0;
      const supprimeLe = parseInt(l && l.sup, 10) || 0;
      /* ⛔ TOUT LE DÉPÔT BORNE SES CHAÎNES (`monStr(x, n)`) ; ici rien ne les bornait. Un `id`
         d'un mégaoctet devenait une clé primaire, et `LOT_MAX` borne le NOMBRE de lignes, pas
         leur poids : 400 lignes peuvent peser les 6 Mo d'`express.json`. Le VPS n'a qu'un
         disque, et un disque plein ce n'est pas une entreprise à terre, c'est toutes. */
      if (!coll || !id) { refus.push({ c: coll.slice(0, 40), id: id.slice(0, 80), motif: 'identite' }); continue; }
      if (coll.length > COLL_MAX || id.length > ID_MAX) {
        refus.push({ c: coll.slice(0, 40), id: id.slice(0, 80), motif: 'identite_trop_longue' }); continue;
      }
      /* ⛔ `maj_le` A UN PLANCHER À 1. La règle d'écartement par tombe du client est
         `tombe >= (enr._m || 0)` : un enregistrement daté 0 est tuable par n'importe quelle
         tombe de n'importe quelle époque. On refuse, avec un motif que l'écran peut dire —
         un refus silencieux ferait disparaître du travail sans que personne comprenne. */
      if (majLe < 1) { refus.push({ c: coll, id, motif: 'non_date' }); continue; }

      /* ⛔ UNE HORLOGE DE TÉLÉPHONE EST FAUSSE PLUS SOUVENT QU'ON NE CROIT, et une date en
         avance gagne TOUS les arbitrages jusqu'à ce qu'elle soit rattrapée — des mois, si
         l'écart est de six mois. Aujourd'hui c'est totalement invisible. On refuse au-delà de
         cinq minutes, et on COMPTE, par entreprise, dans `meta` : le compteur est
         transactionnel de toute façon, et il survit au redémarrage — contrairement à une Map
         en mémoire, remise à zéro à chaque déploiement, donc plusieurs fois par jour. */
      if (majLe > maintenant + HORLOGE_MARGE_MS) {
        refus.push({ c: coll, id, motif: 'horlogeAvancee', ecartMin: Math.round((majLe - maintenant) / 60000) });
        horlogeVues++; continue;
      }

      const a = actuel.get(coll, id);
      if (a) {
        /* ⛔ L'ÉGALITÉ N'EST PAS TRANCHÉE PAR UN DÉPARTAGE SILENCIEUX. Un départage
           alphabétique sur l'appareil ferait gagner une version AMPUTÉE une fois sur deux :
           `syncAlleger` marque `horsNuage`/`photosHorsNuage` des enregistrements qui portent le
           MÊME id et le MÊME `_m` avec deux contenus différents — l'un avec ses quatre photos,
           l'autre sans. Les PDF signés et les photos de chantier disparaîtraient de tous les
           appareils à la fois, sans message. Le serveur NE TRANCHE PAS : il rend sa version. */
        if (majLe < a.maj_le) { refus.push({ c: coll, id, motif: 'perime', serveur: versionServeur(a, coll, id) }); continue; }
        if (majLe === a.maj_le) {
          /* Le renvoi idempotent est GRATUIT et il faut qu'il le reste : un appareil qui
             réémet son lot après une coupure ne doit pas récolter un mur de conflits.
             ⚠️ Il exige une empreinte DES DEUX CÔTÉS. Sans empreinte, on ne SAIT pas que les
             deux contenus sont les mêmes — et « je ne sais pas » se tranche vers le conflit,
             qui coûte un aller-retour, jamais vers l'acceptation, qui coûte une donnée. */
          const emp = String(l.e || '');
          const memeTombe = !!supprimeLe && !!a.supprime_le;
          const memeCorps = !supprimeLe && !a.supprime_le && emp && a.empreinte && emp === a.empreinte;
          if (memeTombe || memeCorps) { acceptes.push({ c: coll, id, seq: a.seq, noop: true }); continue; }
          refus.push({ c: coll, id, motif: 'conflit', serveur: versionServeur(a, coll, id) }); continue;
        }
      }

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
        /* ⛔ ON SCELLE AVANT D'ALLOUER LE RANG, parce que la TAILLE n'est connue qu'APRÈS le
           scellement et qu'elle peut encore refuser. La première version allouait entre les
           deux, et le commentaire d'à côté déclarait pourtant le défaut fermé. MESURÉ : cinq
           pousses d'un enregistrement de 800 Ko portaient `meta.seq` à 6 alors que le plus
           grand rang réellement en base restait 1. Et la conséquence était pire qu'un compteur
           qui ment : `/api/op/flux` compare `rang(t) > depuis` tandis que l'appareil reçoit
           `curseur` — donc le long-poll de CHAQUE appareil de l'entreprise répondait
           immédiatement, pour toujours, et dégénérait en boucle serrée jusqu'à épuiser le
           quota horaire de toute la boîte. Un seul enregistrement trop gros, envoyé par
           n'importe quel appareil authentifié, suffisait — et c'était irréversible sans
           intervention en base. Sceller pour rien quand on refuse coûte un peu de calcul :
           c'est le bon prix. */
        corps = sceller_corps(dek, t, coll, id, majLe, supprimeLe, l.r);
        octets = corps.length;
        if (octets > CORPS_MAX) { refus.push({ c: coll, id, motif: 'corps_trop_gros', octets, max: CORPS_MAX }); continue; }
      }
      const seq = parseInt(suivant.get().val, 10);
      poser.run(coll, id, majLe, seq, supprimeLe, String(c.app_id || ''), corps, empreinte, octets);
      /* ⛔ LES RÉFÉRENCES SE REMPLACENT EN BLOC, JAMAIS EN AJOUT. Une intervention dont on
         retire une photo doit PERDRE cette référence : n'ajouter que les nouvelles laisserait
         l'ancienne à jamais, donc la pièce indélébile, donc le ménage impossible — ce qu'on
         est précisément en train de réparer. Une tombe efface toutes les siennes.
         ⚠️ On borne et on valide chaque `sha` : c'est une chaîne qui vient du réseau, et tout
         le dépôt borne ses chaînes (voir `identite_trop_longue` vingt lignes plus haut). */
      oublierRefs.run(coll, id);
      if (!supprimeLe && Array.isArray(l.f)) {
        for (const sha of l.f.slice(0, FICHIERS_PAR_LIGNE_MAX)) {
          if (/^[0-9a-f]{64}$/.test(String(sha || ''))) noterRef.run(coll, id, String(sha));
        }
      }
      /* Le journal garde le corps SCELLÉ : c'est lui qui permet de revenir à une version, et
         c'est lui que la purge à 90 jours videra (le reste de la ligne, lui, ne s'efface pas —
         l'historique de QUI a fait QUOI reste, sans le contenu). */
      tracer.run(seq, Date.now(), coll, id, majLe, supprimeLe ? 1 : 0, String(c.app_id || ''),
        String(c.utilisateur || ''), String(c.ver || ''), octets, String(c.origine || 'appareil'), empreinte, corps);
      acceptes.push({ c: coll, id, seq });
    }
    if (horlogeVues) {
      db.prepare("INSERT INTO meta (cle,val) VALUES ('horloge_avancee',?) ON CONFLICT(cle) DO UPDATE SET val=CAST(val AS INTEGER)+?")
        .run(String(horlogeVues), horlogeVues);
    }
    db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch (x) {} throw e; }

  const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10);
  majAnnuaire(t, seq);
  return { seq, acceptes: acceptes.length, refus };
}

/* Le compteur de l'annuaire suit, pour que la Tour n'ait jamais à ouvrir les bases. */
/* Le poids du journal : chaque version conservée porte une COPIE scellée du corps, pendant
   90 jours. C'est de la place réelle sur le disque du VPS. */
function journalOctets(db) {
  return db.prepare('SELECT COALESCE(SUM(LENGTH(corps)),0) AS o FROM journal WHERE corps IS NOT NULL').get().o || 0;
}
function majAnnuaire(t, seq) {
  t = exigerT(t);
  const db = ouvrir(t);
  /* ⛔ LE PLAFOND DOIT COMPTER CE QUE LE DISQUE PORTE, PAS LA MOITIÉ. La première version ne
     sommait que `enr.octets` — les lignes VIVANTES — en ignorant la table `journal`, qui garde
     une copie scellée de CHAQUE version pendant 90 jours. MESURÉ : ×19,9 en dessous du réel
     sur une base qui a beaucoup changé. Un plafond qui compte le vingtième de ce qu'il protège
     n'est pas un plafond de sécurité, c'est une décoration — et le disque du VPS est celui de
     tous les clients. */
  const o = (db.prepare('SELECT COALESCE(SUM(octets),0) AS o FROM enr').get().o || 0) + journalOctets(db);
  annuaire().prepare('UPDATE entreprise SET seq=?, octets=? WHERE t=?').run(seq, o, t);
}

/* ⛔ LE RANG SEUL, À COÛT CONSTANT. `etat()` relit et hache TOUTE la base : MESURÉ 42 ms sur
 * 20 000 enregistrements, en synchrone. Le long-poll n'a besoin que de ce nombre-là, et il est
 * appelé à chaque sondage de chaque appareil : à 1 200 sondages/min, `etat()` bloquerait
 * 50 secondes de boucle d'événements sur 60 — le serveur mort pour TOUS les clients, depuis un
 * seul jeton parfaitement légitime. `etat()` reste pour le contrôle de non-régression, qui est
 * rare et qui, lui, a besoin de la signature. */
function rang(t) {
  t = exigerT(t);
  return parseInt(ouvrir(t).prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10) || 0;
}

/* ⛔ EXISTE-T-ELLE ? — SANS LA CRÉER. `ouvrir()` crée la base : toute garde écrite
 * `try { etat(t) } catch { 404 }` est donc du CODE MORT, et une faute de frappe dans la Tour
 * fabriquait une base vide, une ligne au journal opposable pour un `t` fantôme, et un
 * compteur qui monte sur `/health`. L'annuaire sait répondre sans rien ouvrir. */
function existe(t) {
  t = exigerT(t);
  if (annuaire().prepare('SELECT 1 FROM entreprise WHERE t=?').get(t)) return true;
  return fs.existsSync(baseDe(t));
}

/* ⛔ Y A-T-IL QUELQUE CHOSE À COUPER, À ROUVRIR OU À EFFACER — SANS RIEN OUVRIR NI CRÉER.
 * `existe()` répond mieux, mais il passe par `annuaire()`, qui CRÉE `socle-annuaire.db` quand
 * il manque : appelé sur un serveur où le socle n'a jamais tourné, il ferait NAÎTRE le socle
 * tout seul, drapeau éteint — exactement ce que l'étape 1 promet de ne pas faire.
 * Celle-ci ne fait que regarder le disque. Elle répond « peut-être », jamais « sûrement » :
 * un annuaire présent suffit à dire « va voir pour de bon », parce qu'une entreprise peut être
 * inscrite sans avoir encore de base. Les appelants traitent déjà `code:'ABSENT'` comme un
 * succès, donc un « peut-être » de trop ne coûte rien ; un « non » de trop coûterait la
 * coupure d'une entreprise. ⚠️ Elle NE LÈVE PAS sur un `t` invalide : elle répond non. C'est
 * une question sur le disque, pas une porte d'écriture. */
function presentSurDisque(t) {
  try { t = exigerT(t); } catch (e) { return false; }
  try { if (fs.existsSync(baseDe(t))) return true; } catch (e) {}
  try { return fs.existsSync(ANNUAIRE_PATH); } catch (e) { return false; }
}

/* ══ LIRE — LE DELTA, PAGINÉ PAR `seq` STRICTEMENT CROISSANTE ═══════════════════════════════ */
/* ⛔ `colls` : NE RENDRE QUE CE QUE L'APPLICATION QUI DEMANDE SAIT LIRE.
   Mesuré le 20 septembre 2026 : une entreprise qui utilise les DEUX applications télécharge sa
   base OP GESTION entière pour ouvrir une conversation — 1 200 fiches produit (338 Ko) contre
   300 messages (44 Ko), soit **88,5 % de transfert inutile**, sur un téléphone de terrain en
   4G. Et ça empire : la base d'ELAN a déjà dépassé le mégaoctet.

   ⛔ LE FILTRE EST DANS LE `WHERE`, PAS APRÈS LA LECTURE. Filtrer les lignes une fois lues
   laisserait `curseur` et `reste` parler de la base ENTIÈRE : l'appareil redemanderait la même
   page indéfiniment (le curseur n'avance pas sur ce qu'on jette) ou croirait qu'il lui reste
   du travail alors que non. Les DEUX requêtes portent donc le même filtre — celle qui lit
   comme celle qui compte. Une seule des deux filtrée est pire que zero : c'est un compteur qui
   ment.

   ⚠️ ET LE CURSEUR APPARTIENT AU FILTRE QUI L'A PRODUIT. Un appareil qui change de filtre
   doit repartir de zéro, sinon il saute définitivement tout ce que son ancien filtre écartait.
   C'est à l'appelant de le tenir : `/api/op/depuis` lui rend l'empreinte du filtre appliqué
   pour qu'il puisse le voir changer.

   ⛔ SANS `colls`, LA REQUÊTE EST RIGOUREUSEMENT CELLE D'AVANT. C'est la seule façon de
   n'avoir rien à craindre d'un parc mélangé : une version qui ne connaît pas le filtre ne
   l'envoie pas, donc reçoit tout, donc se comporte comme aujourd'hui. */
function depuis(t, apresSeq, max, colls) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const n = Math.min(400, Math.max(1, parseInt(max, 10) || 400));
  /* ⚠️ ON ASSAINIT, ON NE REFUSE PAS. Un filtre mal formé qui ferait répondre 400 couperait
     la synchro de l'appareil ; le laisser tomber lui rend TOUT, ce qui est seulement coûteux.
     Entre « trop » et « rien », on choisit trop — c'est la règle de ce dépôt sur les portes. */
  const filtre = Array.isArray(colls)
    ? colls.map(x => String(x || '')).filter(x => x && x.length <= COLL_MAX).slice(0, COLLS_FILTRE_MAX)
    : [];
  const ou = filtre.length ? ' AND coll IN (' + filtre.map(() => '?').join(',') + ')' : '';
  const lignes = db.prepare('SELECT coll,id,maj_le,seq,supprime_le,corps,empreinte FROM enr WHERE seq>?' + ou + ' ORDER BY seq LIMIT ?')
    .all(parseInt(apresSeq, 10) || 0, ...filtre, n);

  /* ⛔ UNE LIGNE ILLISIBLE NE FAIT PAS TOMBER LA LECTURE ENTIÈRE. Mesuré le 18 septembre 2026 :
     un seul `maj_le` trafiqué en base faisait jeter `depuis()` — donc l'entreprise ne
     synchronisait PLUS JAMAIS, ni ses 20 000 autres lignes, ni sa Réception, et sans aucun
     moyen de savoir laquelle. L'AAD est là pour rendre une ligne trafiquée VISIBLE, pas pour
     murer un client. On l'écarte, on la compte, et l'appelant remonte le compte. Ce qui ne se
     déchiffre pas ne se sert pas : on ne rend jamais un corps douteux. */
  /* ⛔ LA BORNE DE DÉCOMPRESSION EST PAR LIGNE ; LA RÉPONSE EN PORTE QUATRE CENTS. 16 Mo par
     ligne × 400 = 6,4 Go par requête, en synchrone, sur la boucle d'événements de tous les
     clients — et il suffit d'avoir écrit ces lignes une fois pour les rejouer à chaque lecture.
     On borne donc aussi le TOTAL : la page s'arrête là où elle devient trop lourde, et
     l'appareil reçoit un curseur qui lui fait redemander la suite. Rien n'est perdu, la
     pagination fait son travail — c'est précisément à ça qu'elle sert.
     ⛔ ON COMPTE LE CLAIR, PAS LE SCELLÉ, et une première version comptait le scellé « parce
     que la base le connaît sans rien déchiffrer ». C'était vrai et inutile : MESURÉ, 400 lignes
     de 400 Ko de texte répété pèsent presque rien une fois compressées, la borne ne se
     déclenchait jamais, et la requête gelait quand même le serveur 1 396 ms. Le coût qu'on veut
     borner est celui de la DÉCOMPRESSION — donc c'est lui qu'il faut mesurer. On décompresse de
     toute façon : on compte au passage, et on s'arrête à la ligne SUIVANTE. Le dépassement est
     donc borné par `CLAIR_MAX`, une seule fois. */
  const enr = []; const illisibles = [];
  let poids = 0, tronquee = false, dernierRendu = parseInt(apresSeq, 10) || 0;
  for (const l of lignes) {
    if (poids > REPONSE_MAX) { tronquee = true; break; }
    if (l.supprime_le) { enr.push({ c: l.coll, id: l.id, m: l.maj_le, s: l.seq, sup: l.supprime_le, r: null }); dernierRendu = l.seq; continue; }
    let r, clair;
    try { clair = desceller_clair(dek, t, l.coll, l.id, l.maj_le, l.supprime_le, l.corps); r = JSON.parse(clair.toString('utf8')); }
    catch (e) { illisibles.push({ c: l.coll, id: l.id, s: l.seq }); dernierRendu = l.seq; continue; }
    poids += clair.length;
    enr.push({ c: l.coll, id: l.id, m: l.maj_le, s: l.seq, sup: l.supprime_le, r });
    dernierRendu = l.seq;
  }

  const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10);
  /* ⛔ LE CURSEUR SE PREND SUR LES LIGNES LUES EN BASE, PAS SUR CELLES QU'ON REND. Le prendre
     sur `enr` ferait piétiner l'appareil pour toujours dès qu'une ligne illisible termine une
     page : il redemanderait éternellement la même page. */
  /* ⚠️ QUAND LA PAGE EST TRONQUÉE PAR LE POIDS, le curseur s'arrête à la DERNIÈRE ligne
     RÉELLEMENT RENDUE — pas à la dernière ligne lue en base, qui ferait sauter les suivantes. */
  const dernier = tronquee ? dernierRendu : (lignes.length ? lignes[lignes.length - 1].seq : (parseInt(apresSeq, 10) || 0));
  /* ⛔ LE MÊME FILTRE QUE LA LECTURE, SANS EXCEPTION. Un `reste` non filtré dirait à un
     appareil de messagerie qu'il lui reste 1 200 fiches produit à lire : il repagerait pour
     rien, éternellement, et l'écran resterait sur « chargement ». */
  const reste = db.prepare('SELECT COUNT(*) AS n FROM enr WHERE seq>?' + ou).get(dernier, ...filtre).n;
  return { seq, curseur: dernier, reste, enr, illisibles, tronquee, filtre: empreinteFiltre(filtre) };
}

/* ══ VÉRIFIER — LE CONTRÔLE COMPLET, HORS CHEMIN CHAUD ══════════════════════════════════════
 * Trois niveaux, du moins cher au plus cher, et il ne faut pas les confondre :
 *   · `rang()`     — un entier lu dans `meta`. C'est ce que le long-poll appelle, en permanence.
 *   · `etat()`     — compte et SIGNE sans rien déchiffrer. Mesuré 42 ms sur 20 000 lignes :
 *                    c'est le contrôle de non-régression, pas le chemin d'une synchro.
 *   · `verifier()` — déchiffre TOUT. Route d'administration, sur demande explicite, jamais
 *                    subie à l'ouverture d'un écran.
 * ⛔ Une version de ce commentaire disait que `etat()` était « ce qu'on appelle à chaque
 * synchro » : c'était vrai du code d'alors, et c'est précisément ce qui gelait le serveur
 * 50 secondes par minute. Il répond à la seule question qui compte après une restauration ou un
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
  /* ⛔ UN SEUL MOT, UN SEUL SENS. `octets` désignait ici les lignes VIVANTES et là-bas, dans le
     plafond, le total disque : deux comptes sous le même nom, c'est le genre d'ambiguïté qui
     fait qu'on règle un plafond en croyant en régler un autre. `octets` est désormais CE QUE
     LE PLAFOND COMPTE, et le détail est donné à côté. */
  const octetsVivants = db.prepare('SELECT COALESCE(SUM(octets),0) AS o FROM enr').get().o || 0;
  const octetsJournal = journalOctets(db);
  const octets = octetsVivants + octetsJournal;
  const lireMeta = c => { const l = db.prepare('SELECT val FROM meta WHERE cle=?').get(c); return parseInt(l && l.val, 10) || 0; };
  /* ⛔ ÉCRIT ET JAMAIS LU EST AUSSI GRAVE QUE CRÉÉ ET JAMAIS ÉCRIT. `echecs_enrolement` était
     rangé dans `meta` avec un commentaire affirmant que « la Tour la voit par /api/op/etat » —
     et `etat()` ne le rendait pas. Quelqu'un cherchant si un espace est mitraillé aurait ouvert
     la route, ne rien vu, et conclu qu'il ne l'était pas. */
  return { seq, parColl, octets, octetsVivants, octetsJournal, signature: h.digest('hex'),
    horlogeAvancee: lireMeta('horloge_avancee'), echecsEnrolement: lireMeta('echecs_enrolement') };
}

/* ══ LA SIGNATURE CANONIQUE — LE SEUL GARDE-FOU DE L'ÉTAPE 4 ════════════════════════
   Pendant la double écriture, l'appareil calcule la signature de ce qu'il a et le serveur
   recompose LA MÊME depuis ses lignes. Toute différence dit qu'une écriture s'est perdue quelque
   part — et c'est la seule chose qui puisse le dire, puisque personne ne LIT encore le socle.

   ⛔ `etat().signature` NE SUFFIT PAS, et c'est pour ça que celle-ci existe à côté. Elle hache
   `coll|id|maj_le|supprime_le` : elle voit une ligne manquante, une ligne en trop, une date qui
   change — mais PAS un CONTENU différent à date égale. Or c'est exactement ce qu'un
   `syncAlleger` mal placé produirait : le même `maj_le`, le même identifiant, une photo en
   moins. Le contrôle passerait au vert sur la panne qu'il existe pour voir.

   ⚠️ ON NE DÉCHIFFRE RIEN. L'empreinte de chaque corps est déjà en clair dans la colonne
   `empreinte` — c'est l'appareil qui l'a calculée avant de chiffrer. On ne lit donc que des
   colonnes : pas les 368 ms de boucle d'événements gelée que coûte `verifier()`.

   ⚠️ ET LE CALCUL LUI-MÊME VIT DANS `op-signature.js`, copie mot pour mot d'`app.html`, gardée
   par `tests/test-734.js` — lire l'en-tête de ce fichier avant d'y toucher. */
function signatureCanonique(t) {
  t = exigerT(t);
  const db = ouvrir(t);
  const lignes = db.prepare('SELECT coll,id,maj_le,supprime_le,empreinte FROM enr').all()
    .map(r => ({ c: r.coll, id: r.id, m: r.maj_le, sup: r.supprime_le, e: r.empreinte || '' }));
  return require('./op-signature').opSignature(lignes);
}

/* Referme la base d'une entreprise et la sort du cache : la prochaine lecture la rouvre.
   ⛔ EXPORTÉE POUR QU'UN BANC PUISSE COUPER UN RETOUR EN PLEIN VOL, et c'est délibéré — la même
   raison que le coffre injectable de `sauvegarde.js`. `retourAppliquer` écrit par lots de 100 et
   rend la main entre deux : le cas qui coûte est celui où le processus meurt au milieu, laissant
   une base à moitié revenue. Aucune API publique ne permet d'atteindre ce chemin, donc il ne
   serait éprouvé QUE par une vraie coupure, en production, sur la seule fonction dont on ne peut
   pas se permettre d'apprendre les défauts par l'usage. Fermer la base ici fait jeter le lot
   suivant : c'est exactement ce que fait une coupure, sans en attendre une. */
function fermerBase(t) {
  t = exigerT(t);
  try { const db = _bases.get(t); if (db) db.close(); } catch (e) {}
  _bases.delete(t);
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
  if (_nbBases !== null && _nbBases > 0) _nbBases--;

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

/* ⛔ LE COMPTEUR D'ÉCHECS D'ENRÔLEMENT VIT DANS `meta`, PAS EN MÉMOIRE. Une `Map` repart à zéro
 * à chaque redémarrage, donc à chaque push touchant `server/**` — plusieurs fois par jour les
 * jours chargés. Une campagne d'énumération ne laisserait alors aucune trace. Ici elle survit,
 * et la Tour la voit par `/api/op/etat`. */
function echecEnrolement(t) {
  try {
    t = exigerT(t);
    if (!existe(t)) return 0;   // ⛔ ne pas créer une base pour compter un échec sur un espace qui n'existe pas
    const db = ouvrir(t);
    db.prepare("INSERT INTO meta (cle,val) VALUES ('echecs_enrolement','1') ON CONFLICT(cle) DO UPDATE SET val=CAST(val AS INTEGER)+1").run();
    return parseInt(db.prepare("SELECT val FROM meta WHERE cle='echecs_enrolement'").get().val, 10) || 0;
  } catch (e) { return 0; }
}

/* ══ LA PURGE DU JOURNAL — ELLE EXISTE VRAIMENT MAINTENANT ══════════════════════════════════
 * ⛔ DEUX COMMENTAIRES DE CE FICHIER AFFIRMAIENT AU PRÉSENT QUE LE CORPS « SE PURGE À 90 JOURS ».
 * La colonne était créée, lue, et JAMAIS ÉCRITE : `gardien` l'a relevé le 18 septembre 2026.
 * C'est la règle « un nom n'est pas un contenu » appliquée à un commentaire, et le coût n'était
 * pas que de la confiance : chaque version de chaque enregistrement restait déchiffrable pour
 * toujours par la route de diagnostic, alors que `sous-traitance.html` promet une conservation
 * bornée. Le reste de la ligne n'est PAS effacé — l'historique de QUI a fait QUOI demeure, sans
 * le contenu. C'est ça, et seulement ça, que la promesse permet de garder. */
/* ══ REVENIR EN ARRIÈRE, POUR UNE ENTREPRISE, SANS TOUCHER AUX AUTRES ═══════════════════════
 * Demandé par Justin le 20 septembre 2026 : « s'il y a eu un bug, qu'on puisse les faire
 * retourner sur la sauvegarde d'avant ».
 *
 * ⛔ CE N'EST PAS UNE RESTAURATION DE FICHIERS, ET C'EST TOUT L'INTÉRÊT. L'archive hors site
 * est GLOBALE — toutes les entreprises plus `config.json` dans un seul `tar`. Restaurer une
 * entreprise depuis elle remettrait AUSSI toutes les autres à cette minute-là, c'est-à-dire
 * qu'on réparerait un client en cassant les vingt-neuf autres. Le journal du socle, lui, garde
 * chaque VERSION de chaque enregistrement, par entreprise, avec qui l'a écrite et quand. On
 * n'a donc pas besoin d'une photo toutes les heures : on a la seconde près, pendant
 * `JOURNAL_VIE_MS` (90 jours).
 *
 * ⛔⛔ ON ÉCRIT DE NOUVELLES LIGNES, ON NE RÉÉCRIT PAS L'HISTOIRE. Remettre l'ancien `maj_le`
 * serait refusé par `pousser()` comme `perime` — et ce refus a raison : les appareils lisent
 * « depuis `seq` », donc une ligne réécrite en place ne leur parviendrait JAMAIS. Ils
 * garderaient l'état cassé pendant que la Tour afficherait « revenu ». Le retour repose donc
 * l'ancien CORPS avec une date de MAINTENANT, par la même porte qu'un appareil. Trois
 * conséquences qu'il faut avoir en tête :
 *   · les appareils voient le retour arriver comme une modification ordinaire, et l'adoptent ;
 *   · le stock des box revient PRODUIT PAR PRODUIT — le socle décompose déjà chaque ligne de
 *     stock en `box_stock`, avec sa propre date, donc un retour bat le `_ms[produit]` local ;
 *   · et le retour est lui-même RÉVERSIBLE : l'état d'avant reste dans le journal, on revient
 *     à l'instant juste avant le retour.
 *
 * ⛔ CE QUI A ÉTÉ CRÉÉ APRÈS DOIT ÊTRE ENTERRÉ, sinon ce n'est pas un retour. « Rendre l'état
 * d'hier 14 h » en laissant en place tout ce qui a été écrit depuis, c'est rendre un MÉLANGE
 * des deux — et c'est précisément l'état qu'on essaie de quitter quand un bug a semé des
 * enregistrements. On pose donc une tombe sur ce qui n'existait pas à l'instant visé.
 *
 * ⛔ ET UN CORPS PURGÉ SE NOMME, IL NE SE SAUTE PAS. Au-delà de 90 jours, `purgerJournal` vide
 * le `corps` (la ligne, elle, reste : on sait QUI a fait QUOI, sans le contenu). Un retour qui
 * traverse cette frontière ne PEUT PAS rendre ces enregistrements. Les sauter en silence
 * rendrait un retour partiel présenté comme complet — la panne silencieuse type, et la même
 * confusion que `_mailboxes` : « rien à restaurer » et « je ne sais pas restaurer » ne sont
 * pas le même état. L'aperçu les compte et les nomme, et l'application REFUSE tant qu'on ne
 * lui a pas dit explicitement de continuer sans eux.
 */

/* Le repère court d'une ligne, pour un écran : la collection en clair, l'identifiant réduit à
   huit caractères de SHA-256. Assez pour distinguer deux lignes et reconnaître la même d'un
   appel à l'autre ; pas assez pour lire le nom d'une société ou d'un produit. */
function abreger(x) {
  return { coll: x.coll, ref: crypto.createHash('sha256').update(String(x.id || '')).digest('hex').slice(0, 8),
    tombe: x.tombe || undefined, ts: x.ts || undefined };
}

/* L'état d'UN enregistrement à un instant : la dernière version du journal à cette date-là.
   Une seule requête pour toute la base — un `MAX(seq)` groupé, puis la jointure. */
function etatAuJournal(db, instant) {
  return db.prepare(`SELECT j.coll, j.id, j.seq, j.ts, j.maj_le, j.supprime, j.empreinte, j.corps, j.corps_purge_le
    FROM journal j
    JOIN (SELECT coll, id, MAX(seq) AS s FROM journal WHERE ts <= ? GROUP BY coll, id) m
      ON m.coll = j.coll AND m.id = j.id AND m.s = j.seq`).all(instant);
}

/* Ce que le retour changerait, SANS RIEN ÉCRIRE. C'est la moitié qui compte : personne ne
   déclenche une écriture en masse sur la base d'un client sans avoir vu les nombres d'abord. */
/* ⛔⛔ ASYNCHRONE, ET C'EST LA MESURE QUI L'A EXIGÉ — deux fois de suite. Cette fonction ne
   faisait que lire, donc elle était synchrone ; mesurée à 40 ms sur une base aux proportions
   d'ELAN, c'était tolérable. Puis on lui a ajouté un DÉSCELLEMENT de contrôle par
   enregistrement (pour que le consentement porte sur des nombres vrais, et pas seulement sur
   les corps purgés) — et le coût a triplé : 123 ms à 3 000 fiches, 310 ms à 10 000, **552 ms à
   20 000**. C'est pire que les 368 ms de `verifier()`, que ce dépôt a déjà jugées inacceptables
   au point de rendre `apercu?verifier=1` optionnel.
   Elle rend donc la main comme `retourAppliquer`, tous les 200 enregistrements. Le total ne
   bouge pas ; il est rendu par morceaux, et plus personne n'attend une demi-seconde parce que
   quelqu'un a bougé un sélecteur de date. Re-mesuré après :

   | base           | total   | pire gel |
   |----------------|---------|----------|
   | 3 000 (ELAN)   | 119 ms  | **37 ms**|
   | 20 000         | 590 ms  | **187 ms**|

   ⚠️ Ce qui reste est le BALAYAGE du journal : une requête SQL, indivisible, qui grandit avec
   la base. C'est le même plancher que dans `retourAppliquer`, et c'est là qu'il faudra revenir
   le jour où une base dépasse 30 000 lignes — le plafond monte linéairement. */
async function retourApercu(t, instant) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const respirer = () => new Promise(r => setImmediate(r));
  let depuisPause = 0;
  const ts = parseInt(instant, 10) || 0;
  const maintenant = Date.now();
  if (!ts || ts > maintenant) { const e = new Error('instant requis, et dans le passé'); e.code = 'INSTANT'; throw e; }

  /* ⛔ LES DEUX BORNES DU POSSIBLE, ET ELLES NE SONT PAS LA MÊME. `journalDepuis` dit depuis
     quand on a une TRACE ; `corpsDepuis` depuis quand on a le CONTENU. Entre les deux, on sait
     qu'il s'est passé quelque chose et on ne sait pas quoi — c'est un troisième état, et il
     doit se voir à l'écran plutôt que se deviner. */
  const bornes = db.prepare(`SELECT MIN(ts) AS jd, MIN(CASE WHEN corps IS NOT NULL THEN ts END) AS cd,
    COUNT(*) AS n FROM journal`).get() || {};

  const avant = etatAuJournal(db, ts);
  const parCle = new Map();
  for (const j of avant) parCle.set(j.coll + '\u0000' + j.id, j);

  const vivants = db.prepare('SELECT coll,id,maj_le,supprime_le,empreinte FROM enr').all();
  const aRestaurer = [], aEnterrer = [], illisibles = [], inconnus = [];
  const par = {};
  const compter = (coll, quoi) => { (par[coll] = par[coll] || { restaure: 0, enterre: 0, illisible: 0 })[quoi]++; };
  let octets = 0;

  /* ⛔⛔ « ILLISIBLE » NE VEUT PAS DIRE « PURGÉ » — et ne compter que le second faussait le
     CONSENTEMENT. Relevé par `gardien` le 20 septembre 2026 : l'aperçu ne regardait que
     `corps_purge_le || !corps`. Un corps PRÉSENT mais que l'AES refuse (ligne trafiquée, clé qui
     ne correspond plus, bit retourné sur le disque) passait donc pour restaurable : le courriel
     de consentement annonçait « 0 enregistrement(s) ne peuvent PAS être ramenés », la personne
     autorisait sur ce chiffre, et le refus arrivait ensuite dans `refus[]`. Ce n'était pas
     silencieux — mais l'accord avait été donné sur un nombre faux, ce qui est pire qu'un refus
     franc. On DÉSCELLE donc pour de vrai avant de promettre.
     ⚠️ Le coût est réel : c'est un déchiffrement de plus par enregistrement à restaurer, sur une
     fonction déjà mesurée à 40 ms pour 3 000 fiches. C'est le prix d'un consentement qui porte
     sur des nombres vrais — et l'aperçu a un budget depuis aujourd'hui. */
  const lisible = (j) => {
    if (j.corps_purge_le || !j.corps) return false;
    try { desceller_clair(dek, t, j.coll, j.id, j.maj_le, j.supprime, j.corps); return true; }
    catch (e) { return false; }
  };
  const vus = new Set();
  for (const e of vivants) {
    if (++depuisPause >= 200) { depuisPause = 0; await respirer(); }
    const cle = e.coll + '\u0000' + e.id;
    vus.add(cle);
    const j = parCle.get(cle);
    if (!j) {
      /* Vivant maintenant, aucune trace à cette date : ou bien il a été créé APRÈS (donc il
         s'enterre), ou bien il n'a aucune ligne de journal du tout (ce qui ne devrait pas
         arriver — chaque `pousser` trace). On distingue, parce que les deux ne demandent pas
         la même chose : le premier est une décision, le second est une anomalie à regarder. */
      const jamais = db.prepare('SELECT 1 FROM journal WHERE coll=? AND id=? LIMIT 1').get(e.coll, e.id);
      if (!jamais) { inconnus.push({ coll: e.coll, id: e.id }); continue; }
      if (!e.supprime_le) { aEnterrer.push({ coll: e.coll, id: e.id }); compter(e.coll, 'enterre'); }
      continue;
    }
    if (j.supprime) {
      /* Supprimé à cette date, vivant maintenant → il a été recréé depuis : on ré-enterre. */
      if (!e.supprime_le) { aEnterrer.push({ coll: e.coll, id: e.id }); compter(e.coll, 'enterre'); }
      continue;
    }
    /* Présent des deux côtés : on ne repose QUE ce qui a changé. Comparer les empreintes
       évite de réécrire toute la base pour rien — et donc de doubler le poids du journal. */
    if (!e.supprime_le && e.empreinte && j.empreinte && e.empreinte === j.empreinte) continue;
    if (!lisible(j)) { illisibles.push({ coll: j.coll, id: j.id, ts: j.ts }); compter(j.coll, 'illisible'); continue; }
    aRestaurer.push({ coll: j.coll, id: j.id, seq: j.seq });
    octets += (j.corps && j.corps.length) || 0;
    compter(j.coll, 'restaure');
  }
  /* Et ce qui existait à cette date sans exister aujourd'hui : il faut le RESSUSCITER. Sans
     cette moitié, un retour ne rendrait jamais ce qu'un bug a effacé — c'est-à-dire le cas le
     plus probable de tous. */
  for (const j of avant) {
    if (++depuisPause >= 200) { depuisPause = 0; await respirer(); }
    const cle = j.coll + '\u0000' + j.id;
    if (vus.has(cle) || j.supprime) continue;
    if (!lisible(j)) { illisibles.push({ coll: j.coll, id: j.id, ts: j.ts }); compter(j.coll, 'illisible'); continue; }
    aRestaurer.push({ coll: j.coll, id: j.id, seq: j.seq });
    octets += (j.corps && j.corps.length) || 0;
    compter(j.coll, 'restaure');
  }

  return {
    instant: ts,
    journalDepuis: bornes.jd || null, corpsDepuis: bornes.cd || null, lignesJournal: bornes.n || 0,
    /* ⛔ LE DRAPEAU QUI DÉCIDE, et il est calculé ici plutôt que déduit à l'écran : un aperçu
       dont chaque appelant retire sa propre conclusion finit par en avoir deux. */
    troploin: !!(bornes.cd && ts < bornes.cd),
    nRestaurer: aRestaurer.length, nEnterrer: aEnterrer.length,
    nIllisibles: illisibles.length, nInconnus: inconnus.length,
    octetsEnPlus: octets, par,
    /* ⛔⛔ LES IDENTIFIANTS SONT ABRÉGÉS, PARCE QUE POUR CERTAINES COLLECTIONS L'IDENTIFIANT EST
       LE CONTENU — et le commentaire de la route affirmait le contraire. Relevé par `gardien` le
       20 septembre 2026, mesuré sur une vraie base : `db.societesStyle` est indexé par le NOM DE
       SOCIÉTÉ tapé par le client (« Boulangerie Durand SARL »), `idCatalogue` réduit un NOM DE
       PRODUIT, `plansSite` porte l'identifiant d'un client. Jusqu'à ~140 identifiants par appel
       sortaient ainsi d'une route sans session de diagnostic et sans trace, sur la foi d'un
       commentaire qui disait que ça n'arrivait pas — et ce commentaire aurait été cru.
       Ce dont l'écran a besoin, c'est de COMBIEN et DE QUELLE COLLECTION ; un repère court suffit
       à distinguer deux lignes entre elles. Qui a vraiment besoin de l'identifiant passe par
       `/api/monitor/op/journal`, qui exige une session de diagnostic, un motif, et laisse une
       ligne chaînée. C'est la bonne porte, et elle existe déjà. */
    illisibles: illisibles.slice(0, 50).map(abreger), inconnus: inconnus.slice(0, 50).map(abreger),
    apercu: aRestaurer.slice(0, 20).map(abreger)
      .concat(aEnterrer.slice(0, 20).map(x => Object.assign({ tombe: true }, abreger(x)))),
  };
}

/* ⛔⛔ LE RETOUR REND LA MAIN ENTRE CHAQUE LOT, ET C'EST UNE MESURE QUI L'A EXIGÉ. Tout ce que
   fait cette fonction est SYNCHRONE — `node:sqlite` l'est, gunzip et AES le sont — donc tant
   qu'elle tourne, la boucle d'événements de Node ne tourne pas, et AUCUN client d'AUCUNE
   entreprise n'est servi. Mesuré le 20 septembre 2026 sur une base aux proportions d'ELAN
   (3 000 fiches, toutes touchées) : le retour prenait 442 ms et une horloge battant toutes les
   10 ms dans le même processus a sauté pendant **448 ms**. Autrement dit : une demi-seconde
   pendant laquelle chaque technicien de chaque entreprise attend. Et ça monte linéairement —
   1 738 ms mesurées sur 10 000 fiches, et les bases grossissent.
   La parade tient en un `await` : `pousser()` travaille déjà par lots de 100, il suffit de
   laisser respirer entre deux. Un `setImmediate` place la reprise APRÈS les entrées/sorties en
   attente — donc après les requêtes des clients, qui sont exactement ce qu'on veut servir.

   ⚠️ CE QUI RESTE, MESURÉ, ET POURQUOI ON S'ARRÊTE LÀ. Après découpage :

   | base        | durée totale | pire bloc |
   |-------------|--------------|-----------|
   | 3 000 (ELAN)| ~500 ms      | **55 ms** |
   | 10 000      | ~1 700 ms    | **181 ms**|

   Le total ne bouge pas — il est juste rendu par morceaux. Le pire bloc, lui, n'est plus un lot
   mais un BALAYAGE du journal : une seule requête SQL, indivisible, qui grandit avec la base.
   Et il y en a DEUX par retour, parce que `retourAppliquer` appelle `retourApercu` puis
   reparcourt lui-même — le même travail, fait deux fois. On le laisse : mutualiser les deux
   demanderait de retoucher la fonction la plus délicate de ce fichier, juste après l'avoir
   éprouvée par mutation, pour gagner 150 ms sur un geste rare et délibéré. C'est un coût connu,
   pas un coût ignoré — et le jour où une base dépasse 30 000 lignes, c'est ICI qu'il faut
   revenir : le plafond monte linéairement.
   ⚠️ Conséquence à connaître et à ne pas prendre pour un défaut : rendre la main autorise un
   appareil à écrire PENDANT le retour. Sa ligne portera une date plus récente que celle du
   retour, donc `pousser()` refusera la nôtre (`perime`) — et ce refus est COMPTÉ et RENDU.
   C'est le bon arbitrage : quelqu'un qui travaille en ce moment gagne contre un retour, et on
   le dit au lieu de l'écraser en silence.
   ⛔ UN SEUL RETOUR À LA FOIS PAR ESPACE. Deux retours qui s'entrelacent poseraient deux dates
   différentes sur la même base : chacun défferait l'autre à moitié, et le journal deviendrait
   illisible pour celui qui voudrait revenir sur le retour. */
const _retoursEnVol = new Set();

/* Applique le retour. Écrit par `pousser()`, la MÊME porte qu'un appareil — donc les mêmes
   plafonds, les mêmes refus, la même trace au journal, et rien de neuf à auditer. */
async function retourAppliquer(t, instant, ctx) {
  t = exigerT(t);
  const c = ctx || {};
  if (_retoursEnVol.has(t)) { const e = new Error('un retour est déjà en cours'); e.code = 'ENCOURS'; throw e; }
  const ap = await retourApercu(t, instant);
  /* ⛔ ON REFUSE PAR DÉFAUT QUAND IL MANQUE DES CORPS. `sansLesIllisibles` est une décision
     explicite de celui qui déclenche, pas un réglage : un retour partiel peut être le bon
     choix, il ne peut pas être le choix par DÉFAUT. */
  if (ap.nIllisibles && c.sansLesIllisibles !== true) {
    const e = new Error('corps purgés'); e.code = 'PURGE'; e.apercu = ap; throw e;
  }
  if (ap.troploin && c.sansLesIllisibles !== true) {
    const e = new Error('instant antérieur au plus vieux corps gardé'); e.code = 'TROPLOIN'; e.apercu = ap; throw e;
  }

  _retoursEnVol.add(t);
  try {
  /* ⛔ DÉCLARÉE ICI, AVANT TOUT USAGE — et la première version ne l'était pas : `quandDebut`
     servait à la trace ouverte douze lignes plus haut que sa propre déclaration. Zone morte
     temporelle, la MÊME faute que `_maintenant` dans `opDecomposer` le même jour. Le banc l'a
     attrapée tout de suite parce qu'elle jette ; celle d'`opDecomposer` ne jetait pas. */
  const quandDebut = Date.now();
  /* ⛔ APRÈS les entrées/sorties en attente, pas avant : `setImmediate` reprend une fois les
     requêtes des clients servies, ce qui est le but. `setTimeout(…, 0)` reprendrait avant. */
  const respirer = () => new Promise(r => setImmediate(r));
  /* ⛔ ON RESPIRE APRÈS CHAQUE BALAYAGE, PAS SEULEMENT ENTRE LES LOTS — et c'est la mesure qui
     l'a montré. Le découpage en lots de 100 avait ramené le pire gel de 448 à 82 ms, mais un
     bloc restait deux fois plus gros que les autres. En l'isolant : le balayage du journal
     coûte 30 ms à lui seul, et `retourAppliquer` en fait DEUX (celui de l'aperçu qu'il appelle
     en tête, puis le sien) avant d'arriver au premier `await`. Trois coûts collés en un seul
     gel. Séparés, chacun redevient un bloc ordinaire. */
  await respirer();
  const db = ouvrir(t), dek = dekDe(t);
  /* Le rang AVANT d'écrire quoi que ce soit : tout ce qui portera un `seq` plus grand est ou
     bien notre propre travail, ou bien quelqu'un qui a écrit pendant qu'on rendait la main. */
  const rangDepart = rang(t);
  const ts = ap.instant;

  /* ⛔⛔ LA TRACE S'OUVRE AVANT LE PREMIER LOT, ELLE NE SE POSE PAS À LA FIN. `pousser()` ouvre
     une transaction PAR LOT de 100 : l'atomicité s'arrête là. Si le processus meurt entre deux
     lots, ou si un lot jette (disque, base fermée), l'exception sort d'ici, la route répond 503
     — et il ne restait AUCUNE trace qu'un retour avait été tenté, sur une base à moitié revenue.
     Le cas n'est pas théorique : `arretPropre` force `process.exit(0)` au bout de cinq secondes,
     et un push sur `main` touchant `server/**` déploie. Un retour sur 30 000 fiches dépasse ce
     délai. On ouvre donc la ligne en `etat:'en cours'` et on la referme en `'fini'` : un retour
     tronqué se voit, au lieu de se déduire d'un état bizarre trois semaines plus tard. */
  const noterRetour = (o) => {
    let liste = [];
    try { liste = JSON.parse((db.prepare("SELECT val FROM meta WHERE cle='retours'").get() || {}).val || '[]'); } catch (e) {}
    if (!Array.isArray(liste)) liste = [];
    liste = liste.filter(x => !(x && x.jeton === o.jeton));
    liste.unshift(o);
    if (liste.length > 50) liste.length = 50;
    db.prepare("INSERT INTO meta (cle,val) VALUES ('retours',?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val").run(JSON.stringify(liste));
  };
  const jetonRetour = String(quandDebut) + '-' + rangDepart;
  noterRetour({ jeton: jetonRetour, etat: 'en cours', instant: ts, faitLe: quandDebut,
    par: String(c.utilisateur || ''), attendus: (ap.nRestaurer || 0) + (ap.nEnterrer || 0) });
  const avant = etatAuJournal(db, ts);
  const parCle = new Map();
  for (const j of avant) parCle.set(j.coll + '\u0000' + j.id, j);
  await respirer();

  /* ⛔ PAR LOTS, PARCE QUE LE CORPS DE CHAQUE LIGNE EST EN MÉMOIRE PENDANT QU'ON POUSSE. Une
     base d'entreprise fait des milliers d'enregistrements et un corps peut peser 512 Ko
     scellés : tout descendre d'un coup, c'est le serveur de TOUS les clients qui tombe pour en
     réparer un. `pousser()` ouvre une transaction par lot — un lot raté n'écrit rien. */
  const LOT = 100;
  /* ⛔⛔ ON COMPTE CE QUE `pousser()` A ACCEPTÉ, PAS CE QU'ON LUI A TENDU — et la première
     version comptait le second, ce qui est un mensonge dans le cas EXACT où il fait le plus de
     dégâts. `pousser()` refuse le LOT ENTIER sur `espace_plein` ou `disque_plein` ; or un
     retour ajoute au journal une copie du corps de chaque ligne restaurée, donc il gonfle
     l'espace d'à peu près le poids de ce qu'il ramène : atteindre le plafond EN COURS de retour
     n'est pas un cas limite, c'est le cas probable sur une base déjà lourde. La Tour aurait
     alors annoncé « 100 remises en place » sur zéro écriture, et personne n'aurait su que la
     moitié de l'entreprise n'était pas revenue.
     On attribue donc chaque refus à ce qu'il était — une remise ou un enterrement — et on
     décompte. Un compte qui ne peut pas baisser n'est pas un compte, c'est une intention. */
  let restaures = 0, enterres = 0, refuses = [];
  /* ⛔ UNE SEULE DATE POUR TOUT LE RETOUR. Appeler `Date.now()` par ligne donnerait mille
     instants différents à ce qui est UN geste : l'historique deviendrait illisible, et un
     second retour « juste avant le premier » n'aurait pas d'instant net où viser. */
  const quand = quandDebut;

  let lot = [];
  /* Ce que CE lot contient, pour savoir à quoi attribuer un refus. */
  let genreDe = new Map();
  const envoyer = (lot) => {
    if (!lot.length) return;
    const r = pousser(t, lot, { app_id: 'retour', utilisateur: String(c.utilisateur || ''), ver: String(c.ver || ''), origine: 'retour',
      octetsMax: c.octetsMax, disquePlancher: c.disquePlancher });
    for (const x of (r.refus || [])) {
      refuses.push({ c: x.c, id: x.id, motif: x.motif });
      if (genreDe.get(String(x.c) + '\u0000' + String(x.id)) === 'tombe') enterres--; else restaures--;
    }
    genreDe = new Map();
  };
  const pousserAuLot = (ligne, genre) => {
    genreDe.set(String(ligne.c) + '\u0000' + String(ligne.id), genre);
    lot.push(ligne);
    if (genre === 'tombe') enterres++; else restaures++;
  };


  /* On refait le parcours ici plutôt que de trimballer les corps dans l'aperçu : l'aperçu est
     servi par une route de lecture, et il ne doit JAMAIS porter de données de client. */
  const vivants = db.prepare('SELECT coll,id,maj_le,supprime_le,empreinte FROM enr').all();
  const vus = new Set();
  for (const e of vivants) {
    const cle = e.coll + '\u0000' + e.id;
    vus.add(cle);
    const j = parCle.get(cle);
    if (!j) {
      const jamais = db.prepare('SELECT 1 FROM journal WHERE coll=? AND id=? LIMIT 1').get(e.coll, e.id);
      if (!jamais || e.supprime_le) continue;
      pousserAuLot({ c: e.coll, id: e.id, m: quand, sup: quand }, 'tombe');
    } else if (j.supprime) {
      if (e.supprime_le) continue;
      pousserAuLot({ c: e.coll, id: e.id, m: quand, sup: quand }, 'tombe');
    } else {
      if (!e.supprime_le && e.empreinte && j.empreinte && e.empreinte === j.empreinte) continue;
      if (j.corps_purge_le || !j.corps) continue;
      let r = null;
      try { r = JSON.parse(desceller_clair(dek, t, j.coll, j.id, j.maj_le, j.supprime, j.corps).toString('utf8')); }
      catch (err) { refuses.push({ c: j.coll, id: j.id, motif: 'illisible' }); continue; }
      pousserAuLot({ c: j.coll, id: j.id, m: quand, e: j.empreinte || '', r }, 'corps');
    }
    if (lot.length >= LOT) { envoyer(lot); lot = []; await respirer(); }
  }
  for (const j of avant) {
    const cle = j.coll + '\u0000' + j.id;
    if (vus.has(cle) || j.supprime) continue;
    if (j.corps_purge_le || !j.corps) continue;
    let r = null;
    try { r = JSON.parse(desceller_clair(dek, t, j.coll, j.id, j.maj_le, j.supprime, j.corps).toString('utf8')); }
    catch (err) { refuses.push({ c: j.coll, id: j.id, motif: 'illisible' }); continue; }
    pousserAuLot({ c: j.coll, id: j.id, m: quand, e: j.empreinte || '', r }, 'corps');
    if (lot.length >= LOT) { envoyer(lot); lot = []; await respirer(); }
  }
  envoyer(lot);

  /* ⛔⛔ CE QU'UN APPAREIL A CRÉÉ PENDANT LE RETOUR — relevé par `gardien` le 20 septembre 2026,
     et c'est le cas PROBABLE, pas un cas d'école. `vivants` est photographié avant le premier
     `await` ; depuis qu'on rend la main entre les lots, un enregistrement créé par un appareil
     pendant une respiration n'est ni dans `vivants` ni dans `avant`. Il SURVIVAIT au retour :
     aucune tombe ne le visait, il n'apparaissait ni dans `enterres` ni dans `refuses`, et le
     résultat était exactement le « MÉLANGE des deux états » que l'en-tête de ce bloc interdit —
     présenté comme un retour complet.
     Or on déclenche un retour précisément parce qu'un bug sème des enregistrements, et le bug
     continue de semer pendant les ~500 ms (3 000 fiches) à ~1 700 ms (10 000) que dure le geste.
     On repasse donc à la fin sur ce qui a un `seq` PLUS GRAND que le rang de départ. Deux
     garanties, et la seconde compte autant : on enterre, ET on le dit (`apparusPendant`), pour
     qu'un retour qui a dû courir après un bug encore vivant ne passe pas pour un retour propre.
     ⚠️ Une seule passe : si le bug sème encore après celle-ci, le compte le dira et le geste se
     rejoue. Boucler jusqu'à l'immobilité ferait tourner le serveur tant que le bug tourne. */
  let apparusPendant = 0;
  try {
    const neufs = db.prepare('SELECT coll,id FROM enr WHERE seq>? AND supprime_le=0').all(rangDepart);
    let lotN = [];
    for (const e of neufs) {
      if (parCle.has(e.coll + '\u0000' + e.id)) continue;   /* il existait à l'instant visé : déjà traité */
      lotN.push({ c: e.coll, id: e.id, m: Date.now(), sup: Date.now() });
      apparusPendant++;
      if (lotN.length >= LOT) { envoyer(lotN); lotN = []; await respirer(); }
    }
    envoyer(lotN);
  } catch (e) {}

  /* ⛔ ON NOTE LE RETOUR DANS `meta`, ET C'EST CE QUI PERMET DE LE DÉFAIRE. `faitLe` est
     l'instant juste AVANT la première écriture : revenir à celui-là rend l'état d'avant le
     retour. Sans cette trace, « annuler le retour » deviendrait une fouille dans le journal. */
  /* ⛔ `nRefuses` ET `refus`, DEUX NOMS — parce qu'ils ont porté le MÊME et que le banc l'a
     attrapé le 20 septembre 2026. La trace gardait un COMPTE sous `refuses`, la réponse une
     LISTE sous `refuses`, et l'`Object.assign` final mettait la trace en dernier : l'appelant
     recevait donc `refuses: 3` là où il attendait les trois lignes. Autrement dit un retour
     PARTIEL qui annonce trois refus sans jamais dire lesquels — exactement le refus muet que
     ce dépôt passe son temps à refuser ailleurs. */
  const trace = { jeton: jetonRetour, etat: 'fini', instant: ts, faitLe: quandDebut, finiLe: Date.now(),
    par: String(c.utilisateur || ''), restaures, enterres,
    nRefuses: refuses.length, illisibles: ap.nIllisibles, apparusPendant };
  noterRetour(trace);

  /* Même règle pour les refus : `c` est la collection, `id` serait le contenu. */
  return Object.assign({ ok: true, seq: rang(t) }, trace, {
    refus: refuses.slice(0, 50).map(x => ({ coll: x.c, motif: x.motif,
      ref: crypto.createHash('sha256').update(String(x.id || '')).digest('hex').slice(0, 8) })) });
  } finally { _retoursEnVol.delete(t); }
}

function retoursDe(t) {
  t = exigerT(t);
  try { const l = JSON.parse((ouvrir(t).prepare("SELECT val FROM meta WHERE cle='retours'").get() || {}).val || '[]');
    return Array.isArray(l) ? l : []; } catch (e) { return []; }
}

const JOURNAL_VIE_MS = 90 * 86400000;
function purgerJournal(t, avant) {
  t = exigerT(t);
  const db = ouvrir(t);
  const lim = parseInt(avant, 10) || (Date.now() - JOURNAL_VIE_MS);
  const r = db.prepare('UPDATE journal SET corps=NULL, corps_purge_le=? WHERE ts < ? AND corps IS NOT NULL AND corps_purge_le=0')
    .run(Date.now(), lim);
  const n = Number(r.changes || 0);
  /* ⛔ LA PURGE DOIT RENDRE LA PLACE AU COMPTEUR, sinon le plafond ne redescend jamais et une
     entreprise ancienne reste bloquée pour toujours alors qu'on vient de libérer son disque. */
  if (n) {
    const seq = parseInt(db.prepare("SELECT val FROM meta WHERE cle='seq'").get().val, 10) || 0;
    majAnnuaire(t, seq);
  }
  return n;
}

/* Toutes les entreprises, pour la minuterie quotidienne. Ne crée aucune base : ne visite que
   celles qui existent déjà sur le disque. */
function purgerToutesLesEntreprises() {
  let n = 0, bases = 0;
  let noms = []; try { noms = fs.readdirSync(SOCLE_DIR); } catch (e) { return { bases: 0, purgees: 0 }; }
  for (const d of noms) {
    if (!RE_T.test(d) || !fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))) continue;
    bases++; try { n += purgerJournal(d); } catch (e) {}
  }
  return { bases, purgees: n };
}

/* ══ L'HISTORIQUE D'UN ENREGISTREMENT ═══════════════════════════════════════════════════════
 * ⛔ C'EST LA ROUTE QUI JUSTIFIE LE CHANTIER. « Qui a vidé cette box, et quand » devient une
 * réponse en trois secondes au lieu d'une enquête — Firestore ne garde aucun historique, donc
 * la question n'avait tout simplement pas de réponse.
 * Le corps est rendu DÉCHIFFRÉ : cette fonction n'est appelée que derrière une ouverture de
 * diagnostic motivée et tracée. Une version illisible est marquée, jamais avalée — même règle
 * que `depuis()`, et pour la même raison : un trou silencieux dans un historique vaut moins
 * que pas d'historique du tout. */
function journalDe(t, coll, id, max) {
  t = exigerT(t);
  const db = ouvrir(t), dek = dekDe(t);
  const n = Math.min(200, Math.max(1, parseInt(max, 10) || 50));
  const ou = [], arg = [];
  if (coll) { ou.push('coll=?'); arg.push(String(coll)); }
  if (id) { ou.push('id=?'); arg.push(String(id)); }
  const lignes = db.prepare('SELECT seq,ts,coll,id,maj_le,supprime,par,utilisateur,ver,octets,origine,empreinte,corps,corps_purge_le'
    + ' FROM journal' + (ou.length ? ' WHERE ' + ou.join(' AND ') : '') + ' ORDER BY seq DESC LIMIT ?').all(...arg, n);
  return lignes.map(l => {
    const o = { s: l.seq, ts: l.ts, c: l.coll, id: l.id, m: l.maj_le, sup: !!l.supprime,
      par: l.par, u: l.utilisateur, ver: l.ver, octets: l.octets, origine: l.origine };
    if (l.supprime) { o.r = null; return o; }
    /* Le corps du journal se purge à 90 jours ; le reste de la ligne, lui, ne s'efface pas —
       l'historique de QUI a fait QUOI reste, sans le contenu. Dire lequel des deux cas on a
       sous les yeux évite de prendre une purge pour une avarie. */
    if (l.corps_purge_le || !l.corps) { o.r = null; o.purge = !!l.corps_purge_le; return o; }
    try { o.r = desceller_corps(dek, t, l.coll, l.id, l.maj_le, 0, l.corps); }
    catch (e) { o.r = null; o.illisible = true; }
    return o;
  });
}

/* ══ LES NUMÉROS DE DOCUMENT — ON RÉSERVE UNE PLAGE, ON NE RENUMÉROTE JAMAIS ════════════════
 * ⛔ UN NUMÉRO ÉMIS NE SE RÉUTILISE PAS ET NE SE CORRIGE PAS. Le PDF est déjà fabriqué et déjà
 * parti (`envoiDoc()`, le comptable) : le client détient un document portant un numéro que la
 * base ne connaîtrait plus. Et les deux sources du client sont AMNÉSIQUES — l'archive est
 * plafonnée à 500, donc « le plus grand numéro existant » redescend.
 * On rend donc une PLAGE que l'appareil réserve quand il a du réseau et consomme hors ligne :
 * le doublon disparaît vraiment, au lieu d'être rattrapé après coup.
 * ⛔ `plancher` MONTE, IL NE DESCEND JAMAIS — c'est `db.numMax` côté client, même esprit : un
 * appareil en retard ne peut pas faire redescendre le compteur et réémettre un numéro déjà
 * sorti. On prend le MAXIMUM, jamais « le plus récent gagne ». */
function numeroReserver(t, prefixe, annee, n, plancher) {
  t = exigerT(t);
  const db = ouvrir(t);
  const p = String(prefixe || '').slice(0, 16), an = parseInt(annee, 10) || 0;
  if (!p || !an) throw new Error('prefixe et annee obligatoires');
  const combien = Math.min(200, Math.max(1, parseInt(n, 10) || 1));
  const sol = Math.max(0, parseInt(plancher, 10) || 0);
  db.exec('BEGIN IMMEDIATE');
  try {
    const l = db.prepare('SELECT dernier FROM numero WHERE prefixe=? AND annee=?').get(p, an);
    const dernier = Math.max(l ? (l.dernier || 0) : 0, sol);
    const de = dernier + 1, a = dernier + combien;
    db.prepare('INSERT INTO numero (prefixe,annee,dernier) VALUES (?,?,?) ON CONFLICT(prefixe,annee) DO UPDATE SET dernier=excluded.dernier')
      .run(p, an, a);
    db.exec('COMMIT');
    return { de, a };
  } catch (e) { try { db.exec('ROLLBACK'); } catch (x) {} throw e; }
}

/* ══ L'ÉTAT D'UNE ENTREPRISE — CE QUI COUPE VRAIMENT ════════════════════════════════════════
 * ⛔ COUPER LES SESSIONS NE COUPE RIEN. Trouvé par `gardien` le 18 septembre 2026 et REPRODUIT :
 * `sessionsCouper()` révoque les jetons existants, puis l'appareil rappelle `/api/op/session`
 * avec LA MÊME CLÉ D'ÉQUIPE dans la seconde qui suit, reçoit un `app_id` neuf et un jeton de
 * 30 jours. La route répondait `{ok:true, coupees:1}` et la Tour affichait « révoqué » à côté
 * d'une ligne vivante du même nom — la panne nommée dans `CLAUDE.md` (« croire une entreprise
 * coupée alors qu'elle ne l'est pas »), avec un écran qui la maquille.
 * La cause : la coupure portait sur les SESSIONS, alors que le droit d'en ouvrir une vient de
 * la CLÉ, que la coupure ne touchait pas. C'est exactement la leçon de Firebase — un jeton
 * s'échange contre une session renouvelable, et refuser les nouveaux jetons ne suffit pas —
 * rejouée un an plus tard sur un second stockage. L'état vit donc dans l'annuaire, et
 * `/api/op/session` comme chaque requête authentifiée le relisent. */
function entrepriseEtat(t) {
  t = exigerT(t);
  const l = annuaire().prepare('SELECT etat, ferme_le, double, lecture FROM entreprise WHERE t=?').get(t);
  /* ⚠️ L'ESPACE INCONNU REND `double:false`, ET C'EST LE BON SENS DU DÉFAUT. Une entreprise
     dont on ne sait rien n'est pas en double écriture. Le défaut inverse ferait pousser les
     données d'un espace que l'annuaire ne connaît pas — c'est-à-dire exactement le cas où on
     ne devrait rien écrire. */
  /* ⚠️ `lecture` RETOMBE SUR `firestore` DÈS QUE LE DOUTE EXISTE — colonne absente, valeur
     inconnue, espace inconnu. Le mauvais sens du défaut ferait lire le socle à une entreprise
     dont personne n'a décidé la bascule, c'est-à-dire lui servir une base potentiellement
     incomplète à la place de la sienne. Seule la chaîne EXACTE `socle` bascule. */
  const src = l && String(l.lecture || '') === 'socle' ? 'socle' : 'firestore';
  return l ? { etat: l.etat || 'actif', ferme_le: l.ferme_le || 0, double: !!l.double, lecture: src }
    : { etat: 'actif', ferme_le: 0, double: false, lecture: 'firestore' };
}

/* ⛔ ALLUMER OU COUPER LA DOUBLE ÉCRITURE D'UN ESPACE — la marche arrière de l'étape 4.
   ⚠️ COMME `entrepriseOuvrir`, ÇA NE DOIT PAS FAIRE NAÎTRE UNE ENTREPRISE. Un `INSERT` ici
   créerait une ligne d'annuaire — et une clé — pour un `t` mal tapé, donc un espace fantôme
   avec sa propre DEK. C'est le défaut que `entrepriseOuvrir` a déjà payé : on met à jour ce
   qui existe, et on DIT quand il n'y a rien.
   ⛔ Et elle rend l'ÉTAT OBTENU, pas un `ok` : croire une entreprise coupée alors qu'elle ne
   l'est pas est la panne silencieuse type de ce dépôt. */
function entrepriseDouble(t, actif) {
  t = exigerT(t);
  const db = annuaire();
  const n = db.prepare('UPDATE entreprise SET double=? WHERE t=?').run(actif ? 1 : 0, t).changes;
  if (!n) return { connue: false, double: false };
  /* ⚠️ ON RELIT AVEC UNE GARDE, MÊME APRÈS UN `UPDATE` QUI A DIT AVOIR CHANGÉ QUELQUE CHOSE.
     La ligne peut avoir disparu entre les deux (une fermeture d'entreprise en parallèle), et
     un `.get(t).double` sur `undefined` JETTE — donc un 503 à la Tour sur une course rarissime,
     au pire moment : celui où quelqu'un essaie justement de couper quelque chose. On rend ce
     qu'on a pu lire, et l'appelant voit l'ÉTAT OBTENU comme d'habitude. */
  const l = db.prepare('SELECT double FROM entreprise WHERE t=?').get(t);
  return { connue: true, double: !!(l && l.double) };
}

/* ⛔ BASCULER LA LECTURE D'UN ESPACE — l'étape 5, et son retour arrière.
   Mêmes règles que `entrepriseDouble`, pour les mêmes raisons : elle ne fait naître aucune
   entreprise, et elle rend l'ÉTAT OBTENU plutôt qu'un `ok`. ⛔ Et elle n'accepte que deux
   valeurs EXACTES : un `source` inconnu ne « fait rien » en silence, il retombe sur
   `firestore` — le seul défaut qui ne peut pas faire de mal. */
function entrepriseLecture(t, source) {
  t = exigerT(t);
  const src = String(source || '') === 'socle' ? 'socle' : 'firestore';
  const db = annuaire();
  const n = db.prepare('UPDATE entreprise SET lecture=? WHERE t=?').run(src, t).changes;
  if (!n) return { connue: false, lecture: 'firestore' };
  const l = db.prepare('SELECT lecture FROM entreprise WHERE t=?').get(t);
  return { connue: true, lecture: l && String(l.lecture || '') === 'socle' ? 'socle' : 'firestore' };
}

/* `ouvert:false` ferme ET coupe : les deux vont toujours ensemble, sinon on rejoue le défaut.
   ⛔ Rend le nombre de sessions coupées ET l'état obtenu — l'appelant doit pouvoir REMONTER
   un échec. Une coupure silencieusement ratée est pire que pas de coupure. */
function entrepriseOuvrir(t, ouvert) {
  t = exigerT(t);
  /* ⛔ FERMER UNE ENTREPRISE NE DOIT PAS LA FAIRE NAÎTRE. La première version faisait un
     `INSERT … VALUES (?, sceller(kek, randomBytes(32), t), …)` : elle CRÉAIT la ligne
     d'annuaire ET une clé neuve pour un `t` qui n'existait pas. Deux conséquences, chacune
     grave :
       · une faute de frappe dans la Tour fabriquait un espace fantôme, avec sa clé et une
         ligne au journal opposable, pendant que la vraie entreprise travaillait toujours ;
       · sur une entreprise dont l'annuaire a été perdu mais dont la base existe, elle
         FABRIQUAIT une clé neuve — court-circuitant exactement la garde de `dekDe` qu'on
         venait d'ajouter pour empêcher ça, et rendant ses données illisibles pour toujours.
     Elle ne crée donc plus rien : elle exige que l'entreprise existe, et passe par `dekDe`,
     qui porte la garde. */
  if (!existe(t)) {
    const e = new Error('aucun stockage pour « ' + t + ' » — rien à ouvrir ni à fermer');
    e.code = 'ABSENT'; throw e;
  }
  const n = Date.now();
  dekDe(t);   // ⛔ passe par la garde : une base sans sa clé d'annuaire s'arrête ICI
  const db = annuaire();
  const r = db.prepare('UPDATE entreprise SET etat=?, ferme_le=? WHERE t=?')
    .run(ouvert ? 'actif' : 'ferme', ouvert ? 0 : n, t);
  if (!Number(r.changes || 0)) { const e = new Error('ligne d\'annuaire introuvable pour « ' + t + ' »'); e.code = 'ABSENT'; throw e; }
  const coupees = ouvert ? 0 : sessionsCouper(t);
  return { etat: ouvert ? 'actif' : 'ferme', coupees };
}

/* ══ LES SESSIONS D'APPAREIL ════════════════════════════════════════════════════════════════
 * ⛔ `app_id` EST ALLOUÉ PAR LE SERVEUR, jamais choisi par l'appareil. Deux raisons, toutes
 * deux payantes : un appareil RÉVOQUÉ qui invente un `app_id` neuf reprendrait une session (la
 * Tour afficherait « révoqué » pendant qu'il lit) ; et un appareil qui se nomme `zzzz`
 * gagnerait toutes les égalités d'arbitrage.
 * ⚠️ CE QUE ÇA N'EMPÊCHE PAS, ET QU'UN COMMENTAIRE D'ICI A AFFIRMÉ À TORT : présenter l'`app_id`
 * d'un collègue VIVANT remplace bien son `jeton_sha` et le déconnecte. C'est le mécanisme
 * légitime de ré-enrôlement — un appareil qui réinstalle l'application a perdu son jeton mais
 * garde son `app_id`, et doit reprendre sa ligne — donc on ne peut pas le fermer sans casser
 * ce cas. `gardien` l'a mesuré le 18 septembre 2026 ; la phrase fausse est retirée plutôt que
 * le comportement, parce que c'est elle qui aurait empêché quelqu'un d'aller regarder.
 * Ce que ça coûte est borné : il faut DÉJÀ la clé d'équipe pour arriver ici, donc l'attaquant
 * a déjà accès à toutes les données de l'entreprise — il gagne une nuisance, pas un droit.
 * ⛔ C'est l'argument central de la tâche « révoquer UN appareil » : tant que l'identité d'un
 * appareil est un identifiant public et pas un secret à lui, elle ne peut pas porter de droit.
 * ⛔ SEUL LE sha256 DU JETON EST RANGÉ. Une base volée ne donne aucune session utilisable, et
 * une échéance rend la révocation par rotation possible — un jeton éternel ne se révoque pas.
 */
function sessionOuvrir(t, o) {
  t = exigerT(t);
  const db = annuaire(), n = Date.now();
  const c = o || {};
  const sha = String(c.jetonSha || '');
  if (!/^[0-9a-f]{64}$/.test(sha)) throw new Error('jetonSha attendu en sha256 hexadécimal');
  /* ⛔ L'`app_id` PRÉSENTÉ N'EST HONORÉ QUE S'IL EXISTE DÉJÀ POUR CETTE ENTREPRISE ET N'EST PAS
     RÉVOQUÉ. Sinon on en alloue un neuf — on ne « crée » jamais la ligne que l'appareil réclame,
     sans quoi choisir son identité redeviendrait possible par la porte de derrière. */
  let appId = String(c.appId || '');
  let connu = null;
  if (/^[0-9a-f]{32}$/.test(appId)) {
    connu = db.prepare('SELECT app_id, revoque_le FROM appareil WHERE t=? AND app_id=?').get(t, appId) || null;
    if (!connu || connu.revoque_le) { appId = ''; connu = null; }
  } else appId = '';
  if (!appId) appId = crypto.randomBytes(16).toString('hex');
  const exp = parseInt(c.exp, 10) || (n + 30 * 86400000);
  db.prepare(`INSERT INTO appareil (t,app_id,jeton_sha,exp,cree_le,vu_le,nom) VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(t,app_id) DO UPDATE SET jeton_sha=excluded.jeton_sha, exp=excluded.exp,
    vu_le=excluded.vu_le, nom=excluded.nom, revoque_le=0`)
    .run(t, appId, sha, exp, n, n, String(c.nom || '').slice(0, 60));
  return { app_id: appId, exp, nouveau: !connu };
}

/* ⛔ L'EXCEPTION, NOMMÉE : LA SEULE REQUÊTE D'ANNUAIRE SANS `t` — parce que c'est elle qui le
 * FAIT NAÎTRE. Tout le reste du socle reçoit `t` en premier argument ; ici on part d'un jeton et
 * on cherche à quelle entreprise il appartient. Il ne peut pas en être autrement : si l'appelant
 * annonçait `t`, une valeur du CORPS déciderait de ce qu'on lui sert — exactement l'interdit de
 * `CLAUDE.md`, généralisé aux données. `t` sort d'ici, il n'entre jamais par la requête.
 * ⚠️ IL N'Y EN A QU'UNE. `tests/test-723.js` compte les requêtes d'annuaire sans `t` et en
 * exige UNE SEULE — celle-ci. Une seconde, écrite un jour « pour aller plus vite », rouvrirait
 * la porte qu'on vient de fermer. */
function sessionParJeton(jetonSha) {
  const sha = String(jetonSha || '');
  if (!/^[0-9a-f]{64}$/.test(sha)) return null;
  const l = annuaire().prepare('SELECT t, app_id, exp, revoque_le FROM appareil WHERE jeton_sha=?').get(sha);
  if (!l || l.revoque_le || Date.now() > l.exp) return null;
  return { t: l.t, app_id: l.app_id, exp: l.exp };
}

/* Battement : on note qu'un appareil vit, sans toucher au jeton. Une écriture par requête
   coûterait cher pour rien — on ne réécrit que si la dernière trace a plus d'une minute. */
function sessionVue(t, appId) {
  t = exigerT(t);
  const n = Date.now();
  annuaire().prepare('UPDATE appareil SET vu_le=? WHERE t=? AND app_id=? AND vu_le < ?').run(n, t, String(appId || ''), n - 60000);
}

/* ⛔ COUPER DOIT COUPER, ET LE DIRE. La leçon des quatre portes de `fbRevoquerEquipe` : une
   coupure qui échoue en silence fait afficher « fermée » sur une entreprise qui lit et écrit
   encore. On rend le nombre de sessions coupées, et l'appelant le REMONTE. */
function sessionsCouper(t) {
  t = exigerT(t);
  const r = annuaire().prepare('UPDATE appareil SET revoque_le=? WHERE t=? AND revoque_le=0').run(Date.now(), t);
  return Number(r.changes || 0);
}

function appareilsDe(t) {
  t = exigerT(t);
  return annuaire().prepare('SELECT app_id, nom, cree_le, vu_le, exp, revoque_le FROM appareil WHERE t=? ORDER BY vu_le DESC').all(t);
}

/* ⛔ UNE LIGNE D'APPAREIL DOIT POUVOIR MOURIR, SINON LA CONDITION (a) DE L'ÉTAPE 5 NE CONVERGE
 * JAMAIS. Cette condition est « TOUS les appareils de l'entreprise parlent au VPS, constaté par
 * une LISTE NOMINATIVE ». Une liste qui ne fait que grossir ne se compare à rien : un téléphone
 * changé, un profil recréé, un stockage nettoyé, et la ligne d'hier reste là pour toujours. La
 * condition devient impossible — et ce dépôt sait ce qui arrive ensuite : une condition
 * impossible à remplir finit par être IGNORÉE (`server/index.js:2276`, exactement ce
 * raisonnement pour `cleEtat`). On ne veut pas d'une quatrième marche décorative.
 * ⚠️ ON NE SUPPRIME RIEN. Une ligne périmée sort du DÉNOMINATEUR, elle ne disparaît pas de la
 * liste : la Tour doit pouvoir dire « cet appareil n'est plus revenu depuis le 3 août », ce
 * qu'un effacement rendrait impossible. On qualifie, on ne détruit pas. */
const PEREMPTION_MS = 30 * 86400000;   // pas revu depuis 30 jours = hors du dénominateur

/* Les appareils qui COMPTENT : ni révoqués, ni périmés. C'est le dénominateur de (a). */
function appareilsVivants(t, fenetreMs) {
  const limite = Date.now() - (parseInt(fenetreMs, 10) || PEREMPTION_MS);
  return appareilsDe(t).filter(a => !a.revoque_le && (a.vu_le || 0) >= limite);
}

/* ══ LES VERDICTS DE CONTRÔLE — LA CONDITION (d) DE L'ÉTAPE 5 ══════════════════════════════
 * « Sept jours de signatures identiques. » ⛔ Le SERVEUR NE PEUT PAS LA CALCULER SEUL, et il
 * faut l'écrire plutôt que de bricoler une approximation : la signature du socle, il la connaît
 * (`signatureCanonique`), mais celle de Firestore vit dans l'appareil et nulle part ailleurs.
 * Seul l'appareil peut dire que les deux coïncident. Il le dit donc, et on le garde.
 * ⛔ CE QU'ON GARDE NE CONTIENT NI IDENTIFIANT NI CONTENU : un horodatage, un verdict, et des
 * NOMS DE COLLECTION avec des nombres. C'est exactement ce que l'appareil remonte déjà à la
 * Tour — et pour la même raison : savoir QUOI regarder n'oblige pas à lire les données du
 * client.
 * ⚠️ Soixante entrées glissantes : de quoi couvrir les sept jours exigés même si plusieurs
 * appareils contrôlent le même jour, sans faire grossir `meta` indéfiniment. */
const CONTROLES_MAX = 60;

function controleNoter(t, o) {
  t = exigerT(t);
  const db = ouvrir(t), c = o || {};
  let liste = [];
  try { liste = JSON.parse((db.prepare("SELECT val FROM meta WHERE cle='controles'").get() || {}).val || '[]'); } catch (e) { liste = []; }
  if (!Array.isArray(liste)) liste = [];
  liste.unshift({
    ts: Date.now(),
    app: String(c.app_id || '').slice(0, 32),
    ok: !!c.ok,
    /* Les écarts se rangent par NOM DE COLLECTION et NOMBRE, jamais autrement — et on borne,
       parce qu'une liste venue d'un appareil est une liste que quelqu'un peut allonger. */
    ecarts: (Array.isArray(c.ecarts) ? c.ecarts : []).slice(0, 12)
      .map(x => ({ coll: String((x && x.coll) || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 40),
                   a: parseInt(x && x.appareil, 10) || 0, s: parseInt(x && x.serveur, 10) || 0 }))
      .filter(x => x.coll),
  });
  if (liste.length > CONTROLES_MAX) liste.length = CONTROLES_MAX;
  db.prepare("INSERT INTO meta (cle,val) VALUES ('controles',?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val").run(JSON.stringify(liste));
  return liste.length;
}

/* ══ LES ATTESTATIONS — ÉTAPE 7 ════════════════════════════════════════════════════════════
 * ⛔ ON NE FERME PAS LA PORTE SUR UN CHIFFRE AGRÉGÉ, ON LA FERME SUR UNE LISTE NOMINATIVE.
 * « 9 appareils sur 12 ont attesté » ne dit pas quoi faire ; « il manque ces trois-là » permet
 * de demander à ces trois personnes d'ouvrir l'application. C'est la même leçon que la
 * condition (a) de l'étape 5, et elle vaut ici davantage : l'étape 7 est la dernière avant le
 * retrait de Firestore, donc la dernière où un oubli se rattrape.
 * ⚠️ Une attestation ne porte que des NOMBRES et une empreinte — jamais un contenu. Le `dev`
 * est l'identifiant local tiré au hasard par l'appareil, pas une personne.
 * ⚠️ Une par appareil, la dernière écrase la précédente : ce qu'on veut savoir est « cet
 * appareil a-t-il attesté, et que disait-il la dernière fois », pas l'historique. */
function attesterNoter(t, o) {
  t = exigerT(t);
  const db = ouvrir(t), c = o || {};
  const dev = String(c.dev || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
  if (!dev) { const e = new Error('dev requis'); e.code = 'DEV'; throw e; }
  let liste = [];
  try { liste = JSON.parse((db.prepare("SELECT val FROM meta WHERE cle='attestations'").get() || {}).val || '[]'); } catch (e) { liste = []; }
  if (!Array.isArray(liste)) liste = [];
  liste = liste.filter(x => x && x.dev !== dev);
  liste.unshift({
    dev, ts: Date.now(),
    ver: String(c.ver || '').replace(/[^0-9A-Za-z.-]/g, '').slice(0, 12),
    app: String(c.app_id || '').slice(0, 32),
    photoTs: parseInt(c.photoTs, 10) || 0,
    photoSig: String(c.photoSig || '').replace(/[^0-9a-z]/gi, '').slice(0, 32),
    pieces: parseInt(c.pieces, 10) || 0,
    relu: c.relu ? { ok: c.relu.ok === true,
      manquants: parseInt(c.relu.manquants, 10) || 0,
      piecesPerdues: parseInt(c.relu.piecesPerdues, 10) || 0 } : null,
  });
  if (liste.length > 200) liste.length = 200;
  db.prepare("INSERT INTO meta (cle,val) VALUES ('attestations',?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val").run(JSON.stringify(liste));
  return liste.length;
}

function attestationsDe(t) {
  t = exigerT(t);
  try { const l = JSON.parse((ouvrir(t).prepare("SELECT val FROM meta WHERE cle='attestations'").get() || {}).val || '[]');
    return Array.isArray(l) ? l : []; } catch (e) { return []; }
}

/* ⛔ QUI MANQUE À L'APPEL. On compare les appareils qui ont ATTESTÉ à ceux qui sont VIVANTS
 * (vus dans la fenêtre, non révoqués) — et on rend les identifiants des manquants, parce que
 * c'est la seule forme qui permette d'agir. L'appariement passe par `appareil.nom`, qui porte
 * le `dev-…` local : le même pont que la condition (a) de l'étape 5. */
function attestationEtat(t, fenetreMs) {
  const vivants = appareilsVivants(t, fenetreMs).map(a => String(a.nom || '')).filter(Boolean);
  const att = attestationsDe(t);
  const ontAtteste = new Set(att.map(a => a.dev));
  const manquants = vivants.filter(d => !ontAtteste.has(d));
  /* ⚠️ Attester ne suffit pas : une attestation qui dit « j'ai relu et il manque 12 fiches »
     est un ÉCHEC, pas une case cochée. On les compte à part. */
  const enEchec = att.filter(a => a.relu && !a.relu.ok);
  return { appareils: vivants.length, attestes: vivants.filter(d => ontAtteste.has(d)).length,
    manquants, enEchec: enEchec.length,
    complet: vivants.length > 0 && manquants.length === 0 && enEchec.length === 0,
    attestations: att };
}

function controlesDe(t) {
  t = exigerT(t);
  try { const l = JSON.parse((ouvrir(t).prepare("SELECT val FROM meta WHERE cle='controles'").get() || {}).val || '[]');
    return Array.isArray(l) ? l : []; } catch (e) { return []; }
}

/* ⛔ « SEPT JOURS SANS ÉCHEC » N'EST PAS « SEPT JOURS DE SIGNATURES IDENTIQUES ». Un espace
 * dont AUCUN appareil n'a contrôlé depuis sept jours n'a aucun échec à montrer — et il
 * passerait la condition (d) haut la main, sans qu'on sache rien de lui. C'est la confusion
 * exacte que ce dépôt a déjà payée avec `_mailboxes` : « vide » et « on n'a pas pu savoir » ne
 * sont pas le même état. On exige donc DEUX choses : aucun échec, ET au moins un contrôle
 * réussi CHAQUE jour de la fenêtre. Un jour muet fait tomber la condition. */
function controleSuite(t, jours) {
  const n = Math.max(1, parseInt(jours, 10) || 7);
  const liste = controlesDe(t);
  const jour = ts => Math.floor(ts / 86400000);
  const aujourdhui = jour(Date.now());
  const parJour = new Map();
  for (const c of liste) {
    const j = jour(c.ts || 0);
    if (aujourdhui - j >= n || j > aujourdhui) continue;
    const v = parJour.get(j) || { ok: 0, ko: 0 };
    if (c.ok) v.ok++; else v.ko++;
    parJour.set(j, v);
  }
  const manquants = [], echecs = [];
  for (let i = 0; i < n; i++) {
    const j = aujourdhui - i, v = parJour.get(j);
    if (!v) manquants.push(i); else if (v.ko) echecs.push(i);
  }
  return { jours: n, ok: !manquants.length && !echecs.length,
    joursMuets: manquants.length, joursEnEchec: echecs.length, controles: liste.length };
}

/* ══ LE JOURNAL DE DIAGNOSTIC — CHAÎNÉ PAR EMPREINTE ════════════════════════════════════════
 * ⛔ UN JOURNAL ÉCRIT PAR CELUI QU'IL SURVEILLE, SUR LA MACHINE QU'IL SURVEILLE, N'EST
 * OPPOSABLE À PERSONNE. Chaque ligne porte le sha256 de la précédente : retirer ou modifier une
 * ligne casse la chaîne de toutes les suivantes. Ça n'empêche pas de tout réécrire — c'est
 * l'ancre du jour, sortie de la machine (courriel), qui rend la réécriture détectable.
 * ⚠️ `ip_h` est un HACHÉ, jamais une adresse. ⛔ Ce journal est DESTINÉ à être lu par le client
 * depuis son espace — il ne l'est pas encore, aucune route client ne l'expose, et il faut
 * l'écrire au futur tant que c'est vrai. C'est pourtant le seul geste qui rendrait vérifiable
 * la promesse de `sous-traitance.html` : dette nommée, à livrer avant d'allumer chez un client.
 * En attendant, une adresse IP y désignerait une personne — d'où le haché. */
function diagnostic(t, o) {
  t = exigerT(t);
  const db = annuaire(), c = o || {};
  const prec = db.prepare('SELECT chaine_sha FROM diagnostic ORDER BY rang DESC LIMIT 1').get();
  const id = crypto.randomBytes(12).toString('hex');
  const ts = Date.now();
  const l = { id, ts, qui: String(c.qui || '').slice(0, 60), t, motif: String(c.motif || '').slice(0, 300),
    portee: String(c.portee || '').slice(0, 120), n: parseInt(c.n, 10) || 0, ip_h: String(c.ipH || '').slice(0, 64) };
  const chaine = crypto.createHash('sha256')
    .update(String((prec && prec.chaine_sha) || '') + '\n' + [l.id, l.ts, l.qui, l.t, l.motif, l.portee, l.n, l.ip_h].join('\u0000'))
    .digest('hex');
  db.prepare('INSERT INTO diagnostic (id,ts,qui,t,motif,portee,n,ip_h,chaine_sha) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(l.id, l.ts, l.qui, l.t, l.motif, l.portee, l.n, l.ip_h, chaine);
  return { ...l, chaine_sha: chaine };
}

function diagnosticsDe(t, max) {
  t = exigerT(t);
  return annuaire().prepare('SELECT rang,id,ts,qui,motif,portee,n,chaine_sha FROM diagnostic WHERE t=? ORDER BY rang DESC LIMIT ?')
    .all(t, Math.min(500, Math.max(1, parseInt(max, 10) || 100)));
}

/* L'ancre : le dernier maillon, plus le nombre de lignes. C'est ce qui part par courriel —
   deux nombres et une empreinte, aucun nom d'entreprise, aucun motif. */
/* ══ L'OBSERVATOIRE — ÉTAPE 6 : « LE MIROIR, UNE SEMAINE » ═════════════════════════════════
 * ⛔ L'ÉTAPE 6 NE LIVRE « RIEN », ET C'EST EXACTEMENT POURQUOI ELLE A BESOIN DE CE FICHIER.
 * Le plan dit : « on regarde le compteur de divergences rester à zéro, les compteurs de refus
 * et la charge ». Or ces compteurs vivaient dans des `Map` de `op-socle.js`, c'est-à-dire EN
 * MÉMOIRE — et tout push sur `main` touchant `server/**` déploie, donc redémarre. Les jours
 * chargés, plusieurs fois. **Une semaine d'observation sur un compteur qui repart à zéro
 * plusieurs fois par jour ne montre rien**, et montre « zéro », ce qui est pire : on conclurait
 * que tout va bien. Ce dépôt a déjà payé deux fois cette leçon exacte — la minuterie de l'ancre
 * et le compteur d'horloge : ce qui doit survivre au déploiement ne tient pas dans une variable.
 *
 * ⛔ CE QUI EST GARDÉ NE NOMME AUCUNE ENTREPRISE. `/health` est publique, et y faire figurer un
 * espace dirait au monde quelles entreprises existent. On garde des MOTIFS et des NOMBRES, par
 * jour. Le « chez qui » vit dans la Tour, derrière le mot de passe du patron.
 *
 * ⚠️ Un seau par JOUR, quatorze jours glissants : de quoi voir la semaine que l'étape 6 demande,
 * plus une semaine de recul pour comparer, et rien de plus. */
const OBS_JOURS = 14;
const obsJour = () => Math.floor(Date.now() / 86400000);

function obsLire() {
  try { const o = JSON.parse(reglageLire('observatoire') || '{}'); return (o && typeof o === 'object') ? o : {}; }
  catch (e) { return {}; }
}

/* ⛔ ÉCRITURE GROUPÉE, PAS UNE PAR REFUS. Un refus se compte par centaines quand quelque chose
 * va mal — c'est-à-dire au pire moment — et une écriture SQLite synchrone par refus ferait de
 * l'observatoire la cause de la panne suivante. On accumule en mémoire et on verse au plus une
 * fois par minute ; ce qui reste en vol à un redémarrage, c'est au maximum une minute de
 * comptage, contre la totalité aujourd'hui. */
let _obsEnVol = null, _obsVerseLe = 0;
const OBS_VERSEMENT_MS = 60000;

function obsNoter(famille, motif, n) {
  const j = String(obsJour());
  _obsEnVol = _obsEnVol || {};
  const f = (_obsEnVol[famille] = _obsEnVol[famille] || {});
  const d = (f[j] = f[j] || {});
  d[motif] = (d[motif] || 0) + (parseInt(n, 10) || 1);
  if (Date.now() - _obsVerseLe > OBS_VERSEMENT_MS) obsVerser();
}

function obsVerser() {
  if (!_obsEnVol) return;
  const enVol = _obsEnVol; _obsEnVol = null; _obsVerseLe = Date.now();
  try {
    const o = obsLire();
    for (const famille of Object.keys(enVol)) {
      const f = (o[famille] = o[famille] || {});
      for (const j of Object.keys(enVol[famille])) {
        const d = (f[j] = f[j] || {});
        for (const m of Object.keys(enVol[famille][j])) d[m] = (d[m] || 0) + enVol[famille][j][m];
      }
    }
    /* Élagage : au-delà de la fenêtre, on oublie. Un réglage qui grossit sans fin finit par
       peser sur chaque démarrage. */
    const limite = obsJour() - OBS_JOURS;
    for (const famille of Object.keys(o))
      for (const j of Object.keys(o[famille])) if (parseInt(j, 10) < limite) delete o[famille][j];
    reglagePoser('observatoire', JSON.stringify(o));
  } catch (e) {
    /* ⛔ UN OBSERVATOIRE QUI TOMBE NE DOIT RIEN CASSER. Il observe, il ne sert pas. Mais on ne
       reperd pas ce qu'on n'a pas pu écrire : on le remet en vol pour le prochain versement. */
    _obsEnVol = enVol;
  }
}

/* Le total d'une famille sur N jours, par motif. C'est ce que `/health` publie. */
function obsTotaux(famille, jours) {
  const n = Math.max(1, parseInt(jours, 10) || 7);
  const o = obsLire()[famille] || {};
  const depuis = obsJour() - n + 1;
  const out = {};
  for (const j of Object.keys(o)) {
    if (parseInt(j, 10) < depuis) continue;
    for (const m of Object.keys(o[j])) out[m] = (out[m] || 0) + o[j][m];
  }
  /* ⚠️ Ce qui est encore EN VOL compte aussi : sans ça, `/health` sous-déclare d'une minute,
     et un incident qui commence à la minute zéro ne se voit qu'à la minute suivante. */
  const vol = (_obsEnVol && _obsEnVol[famille]) || {};
  for (const j of Object.keys(vol)) {
    if (parseInt(j, 10) < depuis) continue;
    for (const m of Object.keys(vol[j])) out[m] = (out[m] || 0) + vol[j][m];
  }
  return out;
}

/* ══ LES LATENCES — « ET LA CHARGE » ═══════════════════════════════════════════════════════
 * ⛔ L'ANNEXE DU PLAN LE DIT SANS DÉTOUR : « la synchro devient plus vive » est affirmé sans
 * aucune mesure, et le schéma va dans l'autre sens — `PRAGMA synchronous=FULL`, c'est UN FSYNC
 * PAR POUSSE, sur le disque partagé d'un VPS. On ne peut pas arbitrer `FULL` contre
 * `NORMAL`+WAL sans le chiffre sous les yeux, et on ne peut pas savoir si le socle tient la
 * charge d'ELAN sans savoir ce que coûte une pousse.
 * ⚠️ On garde des QUANTILES, pas une moyenne : une moyenne cache exactement ce qui fait mal
 * (la pousse à 900 ms pendant que les autres sont à 8 ms). Un réservoir borné par route, remis
 * à zéro à chaque lecture de `/health` — donc ce que publie `/health` est la fenêtre depuis la
 * dernière lecture, ce qui est précisément ce qu'une surveillance horaire veut voir. */
const LAT_MAX = 500;              // mesures gardées par route
const _lat = new Map();           // route -> number[]

function latNoter(route, ms) {
  const r = String(route || '?').slice(0, 40);
  const v = +ms; if (!isFinite(v) || v < 0) return;
  let a = _lat.get(r); if (!a) { a = []; _lat.set(r, a); }
  /* Réservoir borné : au-delà, on remplace au hasard plutôt que de jeter les récentes ou les
     anciennes — les deux biaiseraient le quantile dans un sens qu'on ne saurait pas nommer. */
  if (a.length < LAT_MAX) a.push(v); else a[Math.floor(Math.random() * LAT_MAX)] = v;
}

function latQuantiles(vider) {
  const out = {};
  for (const [r, a] of _lat) {
    if (!a.length) continue;
    const t = a.slice().sort((x, y) => x - y);
    const q = (p) => t[Math.min(t.length - 1, Math.floor(p * t.length))];
    out[r] = { n: t.length, p50: Math.round(q(0.5)), p95: Math.round(q(0.95)), max: Math.round(t[t.length - 1]) };
  }
  if (vider !== false) _lat.clear();
  return out;
}

/* ══ LES DIVERGENCES, TOUTES ENTREPRISES CONFONDUES ════════════════════════════════════════
 * ⛔ C'EST LE COMPTEUR QUE L'ÉTAPE 6 DEMANDE DE REGARDER, ET IL N'EXISTAIT PAS. Les verdicts
 * sont rangés par espace (`meta.controles`) ; personne ne les réunissait, donc rien ne pouvait
 * dire « combien d'entreprises ont divergé cette semaine ». Un chiffre qu'il faut aller
 * chercher espace par espace n'est pas un chiffre qu'on regarde tous les jours.
 * ⚠️ On rend des NOMBRES D'ESPACES, jamais lesquels : `/health` est publique. */
function divergences(jours) {
  const n = Math.max(1, parseInt(jours, 10) || 7);
  const depuis = Date.now() - n * 86400000;
  let noms = []; try { noms = fs.readdirSync(SOCLE_DIR); } catch (e) { return { espaces: 0, avecEcart: 0, verdicts: 0, jours: n }; }
  let espaces = 0, avecEcart = 0, verdicts = 0, muets = 0;
  for (const d of noms) {
    if (!RE_T.test(d) || !fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))) continue;
    espaces++;
    let liste = []; try { liste = controlesDe(d); } catch (e) { continue; }
    const dedans = liste.filter(c => c && (c.ts || 0) >= depuis);
    verdicts += dedans.length;
    if (!dedans.length) muets++;
    else if (dedans.some(c => !c.ok)) avecEcart++;
  }
  return { espaces, avecEcart, muets, verdicts, jours: n };
}

function reglageLire(cle) { const l = annuaire().prepare('SELECT val FROM reglage WHERE cle=?').get(cle); return l ? l.val : null; }
function reglagePoser(cle, val) { annuaire().prepare('INSERT INTO reglage (cle,val) VALUES (?,?) ON CONFLICT(cle) DO UPDATE SET val=excluded.val').run(cle, String(val)); }

function ancre() {
  const db = annuaire();
  const d = db.prepare('SELECT rang, chaine_sha, ts FROM diagnostic ORDER BY rang DESC LIMIT 1').get();
  const n = db.prepare('SELECT COUNT(*) AS n FROM diagnostic').get().n;
  return { lignes: n, rang: (d && d.rang) || 0, sha: (d && d.chaine_sha) || '', dernier: (d && d.ts) || 0 };
}

/* ⛔ RELIRE LA CHAÎNE. Sans ce contrôle, « chaîné » est une affirmation, pas une propriété.
   Il recalcule chaque maillon depuis le premier et nomme la ligne où ça casse. */
function ancreVerifier() {
  const lignes = annuaire().prepare('SELECT rang,id,ts,qui,t,motif,portee,n,ip_h,chaine_sha FROM diagnostic ORDER BY rang').all();
  let prec = '', attenduRang = 0;
  for (const l of lignes) {
    /* Un rang qui saute est une ligne EFFACÉE : la chaîne des empreintes ne la verrait pas,
       puisque chaque maillon ne connaît que son prédécesseur immédiat. C'est le contrôle qui
       manquerait pour que « chaîné » veuille dire quelque chose. */
    if (l.rang !== ++attenduRang) return { ok: false, lignes: lignes.length, casse: l.id, le: l.ts, motif: 'rang manquant' };
    const attendu = crypto.createHash('sha256')
      .update(prec + '\n' + [l.id, l.ts, l.qui, l.t, l.motif, l.portee, l.n, l.ip_h].join('\u0000')).digest('hex');
    if (attendu !== l.chaine_sha) return { ok: false, lignes: lignes.length, casse: l.id, le: l.ts, motif: 'empreinte' };
    prec = l.chaine_sha;
  }
  return { ok: true, lignes: lignes.length };
}

/* ══ L'INSTANTANÉ POUR LA SAUVEGARDE ════════════════════════════════════════════════════════
 * ⛔ ON NE MET JAMAIS UN FICHIER SQLite VIVANT DANS UNE ARCHIVE. C'est le constat le plus grave
 * de la vérification du 18 septembre 2026, et il touchait quelque chose de DÉJÀ DÉPLOYÉ : la
 * sauvegarde nocturne archive `DATA_DIR` avec `tar`, à chaud. Les `.json` du dépôt supportent
 * ça (temporaire puis renommage, donc atomiques) et les `.jsonl` aussi (ajout en fin). SQLite
 * en WAL est une TROISIÈME famille, et c'est celle qui casse : `tar` lit `base.db`, un point de
 * reprise a lieu pendant l'archivage, `tar` lit ensuite `-wal` — et les deux moitiés ne vont
 * plus ensemble. MESURÉ : la base restaurée lève `database disk image is malformed` au premier
 * SELECT. ⛔ Et rien ne le voyait : la relecture COMPTE les entrées de `tar -t`, elle n'ouvre
 * aucune base — l'archive était déclarée « restaurable » toutes les nuits.
 *
 * `VACUUM INTO` est la réponse de SQLite à exactement cette question : il écrit une copie
 * COHÉRENTE, dans une transaction, sans WAL à côté, sans figer les écritures en cours. On
 * archive l'instantané et on EXCLUT les fichiers vivants.
 */
function instantanerVers(dossier) {
  /* ⛔ RIEN À COPIER = RIEN À CRÉER. C'est ICI que se décide l'inertie, pas dans l'appelant :
     tant que le socle dort, il n'y a ni annuaire ni base, donc cette fonction ne touche pas au
     disque et rend `{bases:0}`. L'en-tête de ce fichier promet « rien ne l'appelle » ; ce
     qu'elle doit vraiment promettre, c'est « rien ne se passe ». La version précédente mettait
     cette décision dans une condition d'`index.js` — qui s'est révélée être une zone morte
     temporelle et a tué toute la sauvegarde. La garde est plus sûre près de la donnée. */
  const annuaireLa = fs.existsSync(ANNUAIRE_PATH);
  let aFaire = [];
  try { aFaire = fs.readdirSync(SOCLE_DIR).filter(d => RE_T.test(d) && fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))); } catch (e) {}
  if (!annuaireLa && !aFaire.length) return { bases: 0, octets: 0, fichiers: [], echecs: [] };
  fs.mkdirSync(dossier, { recursive: true });
  for (const f of fs.readdirSync(dossier)) { try { fs.unlinkSync(path.join(dossier, f)); } catch (e) {} }
  const fait = [], echecs = [];
  const copier = (db, vers) => {
    /* Le chemin passe dans le SQL : on n'y met que des chemins qu'on a construits nous-mêmes,
       et l'apostrophe est doublée par principe — une seule porte, une seule règle. */
    db.exec("VACUUM INTO '" + String(vers).replace(/'/g, "''") + "'");
    return fs.statSync(vers).size;
  };
  let octets = 0;
  if (fs.existsSync(ANNUAIRE_PATH)) {
    const v = path.join(dossier, 'socle-annuaire.db');
    octets += copier(annuaire(), v); fait.push('socle-annuaire.db');
  }
  for (const d of aFaire) {
    const v = path.join(dossier, d + '.db');
    try {
      /* On passe par `ouvrir()` — donc par les deux témoins de clé. */
      octets += copier(ouvrir(d), v); fait.push(d + '.db');
    } catch (e) {
      /* ⛔ UNE BASE QU'ON NE SAIT PLUS OUVRIR NE DOIT PAS FAIRE ÉCHOUER LA SAUVEGARDE DES
         QUARANTE-NEUF AUTRES. La première version jetait : une seule entreprise au témoin de
         clé cassé — c'est-à-dire précisément une entreprise EN DIFFICULTÉ — et plus personne
         n'était sauvegardé, toutes les nuits, jusqu'à ce qu'on s'en aperçoive. C'est la même
         faute que « une ligne illisible bloquait toute l'entreprise », d'un cran au-dessus.
         ⛔ ET ON NE LA LAISSE PAS TOMBER POUR AUTANT : on recopie ses octets bruts. Un fichier
         abîmé se répare parfois ; un fichier absent de l'archive, jamais. Il est marqué, donc
         la restauration saura qu'il n'est pas passé par un instantané cohérent. */
      try { fs.copyFileSync(path.join(SOCLE_DIR, d, 'base.db'), v + '.brut'); octets += fs.statSync(v + '.brut').size; } catch (x) {}
      echecs.push(d);
      console.error('socle: instantané impossible pour une base — copie brute à la place (' + (e.code || 'témoin de clé'), ')');
    }
  }
  return { bases: fait.length, octets, fichiers: fait, echecs };
}

/* Le chemin inverse, pour la restauration : un instantané redevient une arborescence vivante. */
function restaurerDepuis(dossier, versDataDir) {
  const cible = versDataDir || DATA_DIR;
  let n = 0; const brutes = [];
  const poser = (source, vers) => {
    /* ⛔ ON N'ÉCRASE PAS UNE BASE VIVANTE EN LAISSANT SON JOURNAL À CÔTÉ. Un `-wal` orphelin
       appartient à l'ANCIENNE base : SQLite le rejouerait par-dessus la nouvelle et rendrait
       « database disk image is malformed ». Une restauration qui fabrique la corruption
       qu'elle répare est la pire des restaurations. */
    for (const suffixe of ['-wal', '-shm']) { try { fs.unlinkSync(vers + suffixe); } catch (e) {} }
    fs.copyFileSync(source, vers);
  };
  for (const f of fs.readdirSync(dossier)) {
    /* ⛔ LES COPIES BRUTES AUSSI. Une base en `.brut` est une base qu'on n'a PAS su instantaner
       — donc une entreprise DÉJÀ en difficulté. L'ignorer, c'est faire repartir précisément
       celle-là à VIDE, en silence : le pire résultat possible d'une restauration. On la remet,
       et on la NOMME à l'appelant pour qu'il sache qu'elle demande un examen. */
    const brut = f.endsWith('.db.brut');
    if (!f.endsWith('.db') && !brut) continue;
    const base = brut ? f.slice(0, -('.db.brut'.length)) : f.slice(0, -3);
    if (f === 'socle-annuaire.db' || f === 'socle-annuaire.db.brut') {
      poser(path.join(dossier, f), path.join(cible, 'socle-annuaire.db'));
      n++; if (brut) brutes.push('socle-annuaire.db'); continue;
    }
    if (!RE_T.test(base)) continue;
    fs.mkdirSync(path.join(cible, 'socle', base), { recursive: true });
    poser(path.join(dossier, f), path.join(cible, 'socle', base, 'base.db'));
    n++; if (brut) brutes.push(base);
  }
  if (brutes.length) console.error('⛔ ' + brutes.length + ' base(s) restaurée(s) depuis une COPIE BRUTE — à examiner : ' + brutes.join(', '));
  return n;
}

/* ⛔ LE CONTRÔLE D'INTÉGRITÉ D'UN FICHIER PASSE AUSSI PAR ICI. La sauvegarde et la restauration
 * ont besoin d'OUVRIR une base pour dire si elle est saine — et c'est justement ce qui manquait
 * (elles comptaient des noms de fichiers). Mais leur laisser faire leur propre `require('node:
 * sqlite')` rouvrirait la porte que ce fichier existe pour tenir fermée : `tests/test-723.js`
 * compte les requérants et en exige UN SEUL.
 * ⚠️ Cette fonction NE DÉCHIFFRE RIEN et n'a besoin d'aucune clé : « ce fichier est-il intact »
 * et « sais-je le lire » sont deux questions distinctes, et seule la première est du ressort
 * d'une sauvegarde. `quick_check` parcourt réellement les pages — c'est lui qui voit un
 * « database disk image is malformed » qu'un `SELECT 1` ne verrait pas. */
function controlerFichier(chemin) {
  let db = null;
  /* ⛔ UN FICHIER DE 0 OCTET N'EST PAS UNE BASE SAINE — et c'est exactement ce que laisse un
     disque plein pendant `VACUUM INTO`. SQLite OUVRE un fichier vide sans broncher (il y voit
     une base neuve), et `quick_check` répond « ok ». On l'aurait donc archivé, vérifié, et
     déclaré restaurable, pour zéro octet de données. */
  try {
    let taille = 0; try { taille = fs.statSync(chemin).size; } catch (e) {}
    if (taille < 512) return { ok: false, motif: 'fichier vide ou tronqué (' + taille + ' octets) — disque plein pendant la copie ?' };
    db = new (moteur().DatabaseSync)(chemin, { readOnly: true });
    const q = db.prepare('PRAGMA quick_check').get();
    const v = q && (q.quick_check || Object.values(q)[0]);
    if (String(v) !== 'ok') return { ok: false, motif: String(v).slice(0, 120) };
    return { ok: true, lignes: db.prepare('SELECT COUNT(*) AS n FROM enr').get().n };
  } catch (e) {
    /* Une base d'annuaire n'a pas de table `enr` : ce n'est pas une corruption. */
    if (/no such table/i.test(e.message)) return { ok: true, lignes: null };
    return { ok: false, motif: e.message.slice(0, 120) };
  } finally { try { if (db) db.close(); } catch (e) {} }
}

/* ══ FERMER PROPREMENT ══════════════════════════════════════════════════════════════════════
 * ⛔ SIGTERM ARRIVE À CHAQUE DÉPLOIEMENT — et un push sur `main` touchant `server/**` déploie.
 * Sans fermeture, le WAL n'est pas fusionné : la base reste cohérente (c'est tout l'intérêt du
 * WAL), mais le premier démarrage suivant doit le rejouer, et `-wal`/`-shm` traînent. On ferme. */
function fermer() {
  let bases = 0;
  for (const [t, db] of _bases) { try { db.close(); bases++; } catch (e) {} }
  _bases.clear();
  let annu = false;
  try { if (_annuaire) { _annuaire.close(); _annuaire = null; annu = true; } } catch (e) {}
  return { bases, annuaire: annu };
}

/* ══ LA SANTÉ, POUR /health — AGRÉGÉE, JAMAIS NOMINATIVE ════════════════════════════════════
 * `/health` est publique : elle ne dit jamais quelles entreprises existent. Un nombre et un
 * état, rien d'autre. Même discipline que le compteur de pièces jointes et celui des refus. */
/* ⛔ ELLE NE TOUCHE PAS AU DISQUE, ET C'EST ÉCRIT HUIT LIGNES AU-DESSUS DE SON APPEL. La
 * première version faisait `readdirSync(SOCLE_DIR)` plus un `existsSync` PAR ENTREPRISE, en
 * synchrone, à chaque `/health` — route PUBLIQUE et sans clé. C'est mot pour mot le défaut que
 * les pièces jointes avaient déjà payé (mesuré alors : 73 ms, tout le serveur gelé pour tout le
 * monde), réintroduit au même endroit, et il est LINÉAIRE DANS LE NOMBRE DE CLIENTS — donc
 * invisible aujourd'hui et grave quand ça marche. `gardien`, 18 septembre 2026.
 * ⚠️ `kek()` non plus : avec `LoadCredential`, c'était un `readFileSync` de la CLÉ MAÎTRE 600
 * fois par minute, à la demande de n'importe qui. On la lit une fois, au premier besoin. */
let _nbBases = null, _cle0 = null;
function semerCompteurs() {
  if (_nbBases !== null) return;
  /* UN SEUL balayage, à la première demande après un démarrage — le même geste que le
     compteur de poids des pièces jointes. Ensuite, on tient le nombre en incrémental. */
  try { _nbBases = fs.readdirSync(SOCLE_DIR).filter(d => RE_T.test(d) && fs.existsSync(path.join(SOCLE_DIR, d, 'base.db'))).length; }
  catch (e) { _nbBases = 0; }
  _cle0 = !!kek();
}
function sante() { semerCompteurs(); return { actif: true, bases: _nbBases, cle: _cle0 }; }

module.exports = {
  ouvrir, annuaire, dekDe, pousser, depuis, etat, rang, existe, presentSurDisque, verifier, effacerEntreprise, sante, fermer,
  exigerT, numeroReserver, journalDe,
  entrepriseEtat, entrepriseOuvrir, entrepriseDouble, entrepriseLecture, appareilsVivants, PEREMPTION_MS, controleNoter, controlesDe, controleSuite,
  obsNoter, obsVerser, obsTotaux, latNoter, latQuantiles, divergences, OBS_JOURS,
  retourApercu, retourAppliquer, retoursDe, fermerBase,
  attesterNoter, attestationsDe, attestationEtat, echecEnrolement, controlerFichier, reglageLire, reglagePoser, instantanerVers, restaurerDepuis, SOCLE_INSTANTANE, disquePlein, OCTETS_MAX_DEFAUT, DISQUE_PLANCHER_DEFAUT, purgerJournal, purgerToutesLesEntreprises,
  sessionOuvrir, sessionParJeton, sessionVue, sessionsCouper, appareilsDe,
  diagnostic, diagnosticsDe, ancre, ancreVerifier,
  sceller, desceller, sceller_corps, desceller_corps, aadCorps, aadFichier,
  kekDepuis, exigerKek, SOCLE_DIR, ANNUAIRE_PATH, SCHEMA_VERSION,
  fichiersReferences, fichiersDeLigne,
  signatureCanonique,
};
