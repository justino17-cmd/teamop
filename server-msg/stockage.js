/* ══ LE STOCKAGE D'OP MESSAGES — TOUT LE SQL, ET RIEN QUE LUI ════════════════════════════════
 *
 * Un fichier SQLite (`msg.db`) par instance, en WAL, `synchronous=FULL` : « acquitté » veut dire
 * « durable ». Si la mesure montre un retard de boucle trop grand, on groupera les validations
 * par tour de boucle, puis un `worker_thread` — mais jamais `NORMAL`.
 *
 * ⛔ TOUT L'ACCÈS SQL PASSE PAR ICI. Aucune requête ailleurs dans `server-msg/` : un cloisonnement
 * qui n'a qu'une porte se surveille, et si Node casse un jour l'API de `node:sqlite` (module
 * encore expérimental), changer de moteur ne touche que ce fichier. `tests/test-901.js` refuse
 * tout `.prepare(` / `.exec(` hors de ce module, et ici tout argument de requête qui n'est pas
 * un littéral (concaténation = injection SQL qui attend).
 * ⛔ REQUÊTES PARAMÉTRÉES SEULEMENT. Une valeur venue du monde entre par `?`, jamais dans le
 * texte de la requête.
 *
 * ⛔ DES MIGRATIONS NUMÉROTÉES (`PRAGMA user_version`), chacune REJOUABLE (`IF NOT EXISTS`), avec
 * un `VACUUM INTO` conservé avant chaque migration d'une base existante. Le modèle (SERVEUR.md
 * § 3.2) accueille déjà les colonnes des étapes suivantes (espace, pièce, réunion) : les
 * tables qui leur manquent arriveront en migration 2, 3… sans toucher à celles-ci.
 *
 * ⛔ DEUX GARANTIES DE MODÈLE, GARDÉES PAR `tests/test-901.js` :
 *   · UNICITÉ `UNIQUE(conv, auteur, cid)` : un renvoi (réseau coupé après l'envoi) ne fait
 *     JAMAIS deux messages. Et `seq` s'attribue DANS la transaction : deux envois simultanés
 *     ne reçoivent pas le même numéro.
 *   · `lu_seq` est MONOTONE : un appareil en retard qui renvoie un vieux « lu » ne fait pas
 *     redevenir non lus des messages déjà lus.
 *
 * ⛔ LE SCELLAGE VIT ICI AUSSI : le corps, les noms de groupes, les adresses et les textes de
 * notification sont scellés (`scelle.js`) à l'écriture et ouverts à la lecture, avec des données
 * associées qui lient chaque chiffré à SA ligne.
 *
 * ⛔ UN OBJET SANS DROIT N'EXISTE PAS. Les fonctions qui rendent un objet « pour un membre »
 * (`convPourMembre`) rendent `null` aussi bien pour « n'existe pas » que pour « tu n'en es pas
 * membre » : l'appelant répond 404 dans les deux cas, jamais 403.
 *
 * Les événements (`journal`) ne portent PAS de liste de destinataires : on les déduit des
 * membres AU MOMENT DE LA LECTURE (`evenementsPour`). Un message dans un groupe de 256 n'écrit
 * qu'une ligne, et un membre retiré cesse de recevoir dès l'écriture de son retrait.
 */
const fs = require('fs'), crypto = require('crypto');

const MAX_MEMBRES = 1024;
const DELAI_MODIF_MS = 15 * 60 * 1000;
const JOURNAL_JOURS = 7, JOURNAL_LIGNES = 10000;
const TAILLE_PORTEE = 2048;   // un texte de 2 Ko ou moins est porté dans l'événement
const GENRES_SEQ = ['msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_expire', 'msg_reaction'];
const PUSH_MAX = 10;   // dix appareils au plus par personne : le plus ancien part au onzième

/* ══ LES MIGRATIONS ════════════════════════════════════════════════════════════════════════ */
const MIGRATIONS = [
  { v: 1, sql: [
    `CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS personne(
       id TEXT PRIMARY KEY,
       email_h TEXT UNIQUE,
       email_ch BLOB,
       verifie_le INTEGER,
       sel BLOB, mdp BLOB, params TEXT,
       prenom TEXT NOT NULL DEFAULT '', nom TEXT NOT NULL DEFAULT '',
       avatar_piece TEXT,
       statut TEXT NOT NULL DEFAULT '',
       langue TEXT NOT NULL DEFAULT 'fr', tz TEXT NOT NULL DEFAULT 'Europe/Paris',
       prefs TEXT NOT NULL DEFAULT '{}',
       etat TEXT NOT NULL DEFAULT 'actif',
       suppression_le INTEGER, age_ok INTEGER, cgu_v TEXT,
       origine TEXT NOT NULL DEFAULT 'compte' CHECK(origine IN ('compte','beta')),
       essais INTEGER NOT NULL DEFAULT 0, bloque_jusqua INTEGER,
       cree INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS session(
       h TEXT PRIMARY KEY,
       personne TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       appareil TEXT, cree INTEGER NOT NULL, vu INTEGER NOT NULL, exp INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS session_personne ON session(personne)`,
    `CREATE TABLE IF NOT EXISTS jeton(
       h TEXT PRIMARY KEY,
       personne TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       genre TEXT NOT NULL CHECK(genre IN ('verif','mdp','email')),
       exp INTEGER NOT NULL, cible_ch BLOB)`,
    `CREATE TABLE IF NOT EXISTS contact(
       de TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       vers TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       etat TEXT NOT NULL CHECK(etat IN ('ok','bloque')),
       depuis INTEGER NOT NULL,
       PRIMARY KEY(de, vers))`,
    `CREATE INDEX IF NOT EXISTS contact_vers ON contact(vers)`,
    `CREATE TABLE IF NOT EXISTS lien(
       h TEXT PRIMARY KEY,
       genre TEXT NOT NULL CHECK(genre IN ('contact','groupe','espace','reunion')),
       cible TEXT,
       par TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       cree INTEGER NOT NULL, exp INTEGER NOT NULL, restants INTEGER NOT NULL,
       approbation INTEGER NOT NULL DEFAULT 0, revoque INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS conversation(
       id TEXT PRIMARY KEY,
       type TEXT NOT NULL CHECK(type IN ('direct','groupe','canal','reunion')),
       espace TEXT,
       nom_ch BLOB, avatar_piece TEXT,
       annonces_seules INTEGER NOT NULL DEFAULT 0,
       ephemere_s INTEGER NOT NULL DEFAULT 0,
       dernier_seq INTEGER NOT NULL DEFAULT 0,
       dernier_ts INTEGER NOT NULL,
       cree_par TEXT, cree INTEGER NOT NULL,
       cle_directe TEXT UNIQUE)`,
    `CREATE TABLE IF NOT EXISTS membre(
       conv TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       role TEXT NOT NULL DEFAULT 'membre' CHECK(role IN ('admin','membre')),
       depuis_seq INTEGER NOT NULL DEFAULT 1,
       lu_seq INTEGER NOT NULL DEFAULT 0, recu_seq INTEGER NOT NULL DEFAULT 0,
       muet_jusqua INTEGER NOT NULL DEFAULT 0,
       epingle INTEGER NOT NULL DEFAULT 0, archive INTEGER NOT NULL DEFAULT 0,
       quitte_le INTEGER, rejoint INTEGER NOT NULL,
       PRIMARY KEY(conv, uid))`,
    `CREATE INDEX IF NOT EXISTS membre_uid ON membre(uid, quitte_le)`,
    `CREATE TABLE IF NOT EXISTS message(
       conv TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
       seq INTEGER NOT NULL,
       id TEXT NOT NULL UNIQUE,
       auteur TEXT NOT NULL,
       cid TEXT NOT NULL,
       ts INTEGER NOT NULL,
       type TEXT NOT NULL CHECK(type IN ('texte','systeme','piece','vocal','appel')),
       corps_ch BLOB, meta_ch BLOB,
       repond_a INTEGER, modifie INTEGER, supprime_le INTEGER, expire_ts INTEGER,
       PRIMARY KEY(conv, seq),
       UNIQUE(conv, auteur, cid))`,
    `CREATE INDEX IF NOT EXISTS message_expire ON message(expire_ts) WHERE expire_ts IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS reaction(
       conv TEXT NOT NULL, seq INTEGER NOT NULL, uid TEXT NOT NULL,
       emoji TEXT NOT NULL, ts INTEGER NOT NULL,
       PRIMARY KEY(conv, seq, uid),
       FOREIGN KEY(conv, seq) REFERENCES message(conv, seq) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS msg_masque(
       conv TEXT NOT NULL, seq INTEGER NOT NULL, uid TEXT NOT NULL,
       PRIMARY KEY(conv, seq, uid),
       FOREIGN KEY(conv, seq) REFERENCES message(conv, seq) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS journal(
       gid INTEGER PRIMARY KEY AUTOINCREMENT,
       genre TEXT NOT NULL, conv TEXT, uid TEXT, ref TEXT, ts INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS journal_ts ON journal(ts)`,
    `CREATE TABLE IF NOT EXISTS notification(
       id TEXT PRIMARY KEY,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       type TEXT NOT NULL, titre_ch BLOB, texte_ch BLOB, cible TEXT,
       ts INTEGER NOT NULL, lue INTEGER NOT NULL DEFAULT 0)`,
    `CREATE INDEX IF NOT EXISTS notification_uid ON notification(uid, ts)`,
    `CREATE TABLE IF NOT EXISTS purge(objet TEXT NOT NULL, genre TEXT NOT NULL, quand INTEGER NOT NULL)`,
    `PRAGMA user_version = 1`,
  ] },
  /* ── 2 : LE TÉLÉPHONE (2 octobre 2026) ───────────────────────────────────────────────────────────────────────
     Décision de Justin : le compte PERSO naît et se connecte par NUMÉRO DE TÉLÉPHONE. Quatre choses entrent :
       · `personne.origine` accepte 'telephone' — SQLite ne change pas un CHECK en place : la table est RECONSTRUITE (procédure
         officielle : clés étrangères coupées HORS transaction, copie, suppression, renommage). Le lanceur de migrations sait
         le faire (`sansFk`) ; une copie `.avant-v2` de la base est gardée avant, comme pour toute migration d'une base qui a vécu ;
       · `personne.trouvable` : « qui peut me trouver par mon numéro » (tous | personne) ;
       · `code_tel`, `appareil_tel` : le code à usage unique (haché, jamais en clair, lié à l'APPAREIL qui l'a demandé — `ap_h` : les faux
         essais d'un autre appareil ne brûlent pas le code de la personne) et le jeton d'appareil (haché) qui évite un SMS ;
       · `sms_tentative` : les plafonds par numéro et par réseau, DURABLES (une ligne par SMS et par clé, des EMPREINTES HMAC — jamais un
         numéro ni une adresse en clair — gardées 2 jours) : ils ne se perdent ni au redémarrage ni quand une table mémoire se remplit ;
       · `sms_envoi` : UNE LIGNE PAR SMS (date, pays, coût en micro-euros) — jamais un numéro. C'est ce qui rend les budgets en euros
         DURABLES : un redémarrage ne remet pas le budget du jour à zéro. `sms_bouclier` : les pays passés en mode « preuve de travail ».
         `recherche_tel` : les recherches de contact par numéro (plafond par compte et par jour). */
  { v: 2, sansFk: true, sql: [
    `CREATE TABLE personne_v2(
       id TEXT PRIMARY KEY,
       email_h TEXT UNIQUE,
       email_ch BLOB,
       verifie_le INTEGER,
       sel BLOB, mdp BLOB, params TEXT,
       prenom TEXT NOT NULL DEFAULT '', nom TEXT NOT NULL DEFAULT '',
       avatar_piece TEXT,
       statut TEXT NOT NULL DEFAULT '',
       langue TEXT NOT NULL DEFAULT 'fr', tz TEXT NOT NULL DEFAULT 'Europe/Paris',
       prefs TEXT NOT NULL DEFAULT '{}',
       etat TEXT NOT NULL DEFAULT 'actif',
       suppression_le INTEGER, age_ok INTEGER, cgu_v TEXT,
       origine TEXT NOT NULL DEFAULT 'compte' CHECK(origine IN ('compte','beta','telephone')),
       essais INTEGER NOT NULL DEFAULT 0, bloque_jusqua INTEGER,
       cree INTEGER NOT NULL,
       trouvable TEXT NOT NULL DEFAULT 'tous' CHECK(trouvable IN ('tous','personne')))`,
    `INSERT INTO personne_v2(id, email_h, email_ch, verifie_le, sel, mdp, params, prenom, nom, avatar_piece, statut, langue, tz, prefs, etat,
                             suppression_le, age_ok, cgu_v, origine, essais, bloque_jusqua, cree)
       SELECT id, email_h, email_ch, verifie_le, sel, mdp, params, prenom, nom, avatar_piece, statut, langue, tz, prefs, etat,
              suppression_le, age_ok, cgu_v, origine, essais, bloque_jusqua, cree FROM personne`,
    `DROP TABLE personne`,
    `ALTER TABLE personne_v2 RENAME TO personne`,
    `CREATE TABLE IF NOT EXISTS code_tel(
       num_h TEXT PRIMARY KEY, code_h TEXT NOT NULL,
       cree INTEGER NOT NULL, exp INTEGER NOT NULL, essais INTEGER NOT NULL DEFAULT 0, ap_h TEXT)`,
    `CREATE TABLE IF NOT EXISTS appareil_tel(
       h TEXT PRIMARY KEY,
       personne TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       nom TEXT, cree INTEGER NOT NULL, vu INTEGER NOT NULL, exp INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS appareil_tel_personne ON appareil_tel(personne)`,
    `CREATE TABLE IF NOT EXISTS sms_envoi(
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       ts INTEGER NOT NULL, pays TEXT NOT NULL, cout INTEGER NOT NULL,
       etat TEXT NOT NULL CHECK(etat IN ('reserve','envoye','incertain','refuse')))`,
    `CREATE INDEX IF NOT EXISTS sms_envoi_ts ON sms_envoi(ts)`,
    `CREATE INDEX IF NOT EXISTS sms_envoi_pays ON sms_envoi(pays, ts)`,
    `CREATE TABLE IF NOT EXISTS sms_tentative(
       id INTEGER PRIMARY KEY AUTOINCREMENT, sms INTEGER NOT NULL, k TEXT NOT NULL, ts INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS sms_tentative_k ON sms_tentative(k, ts)`,
    `CREATE INDEX IF NOT EXISTS sms_tentative_sms ON sms_tentative(sms)`,
    `CREATE TABLE IF NOT EXISTS sms_bouclier(
       pays TEXT PRIMARY KEY, depuis INTEGER NOT NULL, jusqua INTEGER NOT NULL, motif TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS recherche_tel(
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE, ts INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS recherche_tel_uid ON recherche_tel(uid, ts)`,
    `PRAGMA user_version = 2`,
  ] },
  /* ── 3 : LES PIÈCES (2 octobre 2026) ────────────────────────────────────────────────────────────────────────────
     Photos, vocaux, fichiers, photos de profil. Deux choses entrent :
       · `piece` : une ligne par pièce (le CONTENU est un fichier scellé sur le disque, `pieces.js`). `taille` est celle du clair RANGÉ
         (après retrait des métadonnées) et alimente le quota par personne ; `mime` est celui qui sera SERVI, jugé aux octets ; `nom_ch` le
         nom du fichier, scellé ; `attachee` le numéro du message qui la porte (NULL tant qu'elle n'est pas envoyée) ; `expire` la date où
         une pièce jamais attachée (ou une photo de profil jamais posée) part — NULL dès qu'elle sert. Un message de pièce a toujours sa
         conversation ; seule une photo de profil peut n'en avoir aucune (`conv` ne se pose que pour l'avatar d'un groupe) ;
       · `message.type` accepte 'photo' et 'fichier' : SQLite ne change pas un CHECK en place, la table est RECONSTRUITE (procédure
         officielle, comme la migration 2 : clés étrangères coupées HORS transaction, copie, suppression, renommage, contrôle des
         orphelins). Les tables qui la citent (`reaction`, `msg_masque`) gardent leur définition : elles nomment « message », et le
         renommage les rattache à la table neuve. L'index des éphémères est recréé. Une copie `.avant-v3` est gardée avant. */
  { v: 3, sansFk: true, sql: [
    `CREATE TABLE message_v3(
       conv TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
       seq INTEGER NOT NULL,
       id TEXT NOT NULL UNIQUE,
       auteur TEXT NOT NULL,
       cid TEXT NOT NULL,
       ts INTEGER NOT NULL,
       type TEXT NOT NULL CHECK(type IN ('texte','systeme','piece','vocal','appel','photo','fichier')),
       corps_ch BLOB, meta_ch BLOB,
       repond_a INTEGER, modifie INTEGER, supprime_le INTEGER, expire_ts INTEGER,
       PRIMARY KEY(conv, seq),
       UNIQUE(conv, auteur, cid))`,
    `INSERT INTO message_v3(conv, seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, modifie, supprime_le, expire_ts)
       SELECT conv, seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, modifie, supprime_le, expire_ts FROM message`,
    `DROP TABLE message`,
    `ALTER TABLE message_v3 RENAME TO message`,
    `CREATE INDEX IF NOT EXISTS message_expire ON message(expire_ts) WHERE expire_ts IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS piece(
       id TEXT PRIMARY KEY,
       proprio TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       conv TEXT REFERENCES conversation(id) ON DELETE CASCADE,
       genre TEXT NOT NULL CHECK(genre IN ('photo','vocal','fichier','avatar')),
       taille INTEGER NOT NULL CHECK(taille > 0),
       mime TEXT NOT NULL,
       nom_ch BLOB,
       attachee INTEGER,
       cree INTEGER NOT NULL,
       expire INTEGER,
       CHECK(genre = 'avatar' OR conv IS NOT NULL))`,
    `CREATE INDEX IF NOT EXISTS piece_proprio ON piece(proprio)`,
    `CREATE INDEX IF NOT EXISTS piece_message ON piece(conv, attachee) WHERE attachee IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS piece_expire ON piece(expire) WHERE expire IS NOT NULL`,
    `PRAGMA user_version = 3`,
  ] },
  /* ── 4 : LES NOTIFICATIONS PUSH ET LA SUPPRESSION DE COMPTE (3 octobre 2026) ────────────────────────────────────
     Deux choses entrent, et AUCUNE table n'est reconstruite (pas de `sansFk`) :
       · `push` : un abonnement par appareil (le « point d'accès » que le navigateur donne, et les deux clés qui chiffrent ce qu'on lui envoie). Le point d'accès est
         UNE CAPACITÉ — qui le connaît peut écrire à cet appareil — donc il est SCELLÉ au repos comme une adresse (`endpoint_ch`), et seule son empreinte HMAC
         (`endpoint_h`, UNIQUE) sert à le retrouver : un point d'accès ne s'inscrit qu'une fois, pour une seule personne (« un appareil, une personne »). Les clés
         `p256dh_ch` et `auth_ch` sont scellées aussi. `echecs` compte les échecs de suite (le service push qui ne répond plus finit par faire retirer l'abonnement),
         `derniere_ok` la dernière livraison, `cree` la dernière INSCRIPTION (la page réinscrit son abonnement à chaque ouverture : les appareils qu'on n'ouvre plus
         sont les plus anciens, et ce sont eux qui partent quand on dépasse dix) ;
       · l'index de la suppression programmée : `personne.suppression_le` existe depuis la migration 1 (la date où le compte s'efface, NULL tant que rien n'est demandé),
         le balayeur la cherche à chaque passage — l'index partiel garde cette recherche à zéro coût tant que personne ne demande rien. */
  { v: 4, sql: [
    `CREATE TABLE IF NOT EXISTS push(
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       endpoint_h TEXT NOT NULL UNIQUE,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       endpoint_ch BLOB NOT NULL, p256dh_ch BLOB NOT NULL, auth_ch BLOB NOT NULL,
       echecs INTEGER NOT NULL DEFAULT 0, derniere_ok INTEGER, cree INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS push_uid ON push(uid, cree)`,
    `CREATE INDEX IF NOT EXISTS personne_suppression ON personne(suppression_le) WHERE suppression_le IS NOT NULL`,
    `PRAGMA user_version = 4`,
  ] },
];

const erreur = (code) => Object.assign(new Error(code), { code });

function ouvrir({ chemin, scelleur, horloge = Date.now, migrations = MIGRATIONS, moteur }) {
  const { DatabaseSync } = moteur || require('node:sqlite');
  const db = new DatabaseSync(chemin);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_size_limit=4194304;');

  /* Les requêtes sont préparées une fois par texte. `Q` et `X` ne reçoivent QUE des littéraux
     (voir l'en-tête) : c'est ce qu'on vérifie par motif, et ce qui interdit la concaténation. */
  const cache = new Map();
  const Q = (sql) => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  const X = (sql) => db.exec(sql);
  const num = (x) => typeof x === 'bigint' ? Number(x) : x;

  let profondeur = 0;
  function tx(fn) {
    if (profondeur > 0) return fn();
    X('BEGIN IMMEDIATE'); profondeur++;
    try { const r = fn(); X('COMMIT'); return r; }
    catch (e) { try { X('ROLLBACK'); } catch (e2) {} throw e; }
    finally { profondeur--; }
  }

  const alea = (n) => crypto.randomBytes(n).toString('hex');
  const nouvelId = (prefixe) => prefixe + '_' + alea(16);

  /* ── Migrations ─────────────────────────────────────────────────────────────────────── */
  const versionActuelle = () => Number(Q('PRAGMA user_version').get().user_version);
  const existait = versionActuelle() > 0;   // une base NEUVE n'a rien à conserver
  for (const m of migrations) {
    const cur = versionActuelle();
    if (m.v <= cur) continue;
    /* Une copie cohérente AVANT de toucher une base qui a déjà vécu. */
    if (existait && cur > 0) { try { Q('VACUUM INTO ?').run(chemin + '.avant-v' + m.v); } catch (e) { if (!/already exists/i.test(String(e.message))) throw e; } }
    /* ⛔ Une migration qui RECONSTRUIT une table (`sansFk`) coupe les clés étrangères AVANT d'ouvrir la transaction — la commande est
       sans effet à l'intérieur d'une transaction — et les rallume après, en contrôlant qu'aucune ligne n'est restée orpheline. */
    if (m.sansFk === true) X('PRAGMA foreign_keys=OFF');
    X('BEGIN IMMEDIATE');
    try {
      for (const s of m.sql) X(s);
      if (m.sansFk === true && Q('PRAGMA foreign_key_check').all().length > 0) throw erreur('migration_orphelins');
      X('COMMIT');
    } catch (e) { try { X('ROLLBACK'); } catch (e2) {} if (m.sansFk === true) X('PRAGMA foreign_keys=ON'); throw e; }
    if (m.sansFk === true) X('PRAGMA foreign_keys=ON');
  }

  /* ── Le témoin de clé : un démarrage avec une MAUVAISE clé est refusé net ──────────── */
  const metaLire = (k) => { const r = Q('SELECT v FROM meta WHERE k = ?').get(k); return r ? r.v : null; };
  const metaPoser = (k, v) => { Q('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(k, v); };
  {
    const t = metaLire('kek_temoin');
    if (t === null) {
      metaPoser('kek_temoin', scelleur.sceller('meta', 'kek_temoin', 'temoin', 'opmsg-temoin-v1').toString('base64'));
      metaPoser('kek_gen', String(scelleur.generation));
    } else {
      let clair;
      try { clair = scelleur.ouvrir('meta', 'kek_temoin', 'temoin', Buffer.from(t, 'base64')); } catch (e) { clair = null; }
      if (clair !== 'opmsg-temoin-v1') { try { db.close(); } catch (e) {} throw erreur('cle_incorrecte'); }
    }
  }

  const sceller = (table, champ, aad, clair) => scelleur.sceller(table, champ, aad, clair);
  const ouvrirS = (table, champ, aad, blob) => scelleur.ouvrir(table, champ, aad, blob);
  const aadMsg = (conv, seq, auteur) => conv + '|' + seq + '|' + auteur;
  /* ⛔ UNE LIGNE ILLISIBLE RESTE UNE LIGNE ILLISIBLE (relecture adverse, 1er octobre 2026). Un chiffré qui ne
     s'ouvre pas (octet retourné sur le disque, restauration mélangée) levait jusque dans `convListe`, et UNE ligne
     abîmée rendait 500 sur la liste de TOUS les membres de la conversation et coupait la reprise d'un flux. On
     l'attrape à l'ouverture : la ligne se dit `illisible`, les autres continuent — et le compte s'en SOUVIENT
     (`/health`, `illisibles`), parce qu'une erreur avalée sans trace est la panne silencieuse type de ce dépôt. */
  let illisibles = 0;
  function ouvrirOuNull(table, champ, aad, blob) {
    try { return ouvrirS(table, champ, aad, blob); } catch (e) { illisibles++; return null; }
  }
  const nomDe = (id, blob) => blob ? ouvrirOuNull('conversation', 'nom_ch', id + '|nom', blob) : null;
  const debut = (s, n) => { const a = Array.from(String(s)); return a.length > n ? a.slice(0, n).join('') : String(s); };

  /* ── Le journal : une ligne par événement ───────────────────────────────────────────── */
  function journalAjouter(genre, conv, uid, ref) {
    const r = Q('INSERT INTO journal(genre, conv, uid, ref, ts) VALUES(?, ?, ?, ?, ?)').run(genre, conv || null, uid || null, ref == null ? null : String(ref), horloge());
    return num(r.lastInsertRowid);
  }

  /* ══ PERSONNES ═══════════════════════════════════════════════════════════════════════════ */
  const personneRang = (r) => r && ({
    id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, langue: r.langue, tz: r.tz, avatar: r.avatar_piece || null,
    prefs: (() => { try { return JSON.parse(r.prefs) || {}; } catch (e) { return {}; } })(),
    origine: r.origine, verifie: !!r.verifie_le, etat: r.etat, cree: r.cree,
  });
  function personneParIdentifiant(identifiant) {
    return personneRang(Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree FROM personne WHERE email_h = ?')
      .get(scelleur.hmac('personne', 'email_h', identifiant)));
  }
  /* `identifiant` est ce qui rend la personne unique : `beta:<login>` pour la porte bêta, l'adresse
     normalisée pour un compte public (étape 2). Il n'est jamais rangé en clair. */
  function personneCreer({ identifiant, prenom = '', nom = '', origine = 'compte', verifie = false }) {
    return tx(() => {
      const deja = personneParIdentifiant(identifiant);
      if (deja) return deja;
      const id = nouvelId('p'), t = horloge();
      Q('INSERT INTO personne(id, email_h, email_ch, verifie_le, prenom, nom, origine, cree) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, scelleur.hmac('personne', 'email_h', identifiant), sceller('personne', 'email_ch', id + '|email', identifiant),
          verifie ? t : null, debut(prenom, 60), debut(nom, 60), origine, t);
      return personneParId(id);
    });
  }
  function personneParId(id) {
    return personneRang(Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree FROM personne WHERE id = ?').get(id));
  }
  function personneIdentifiant(id) {
    const r = Q('SELECT email_ch FROM personne WHERE id = ?').get(id);
    return r && r.email_ch ? ouvrirS('personne', 'email_ch', id + '|email', r.email_ch) : null;
  }
  function personneMaj(id, c) {
    const cur = personneParId(id); if (!cur) return null;
    const n = {
      prenom: c.prenom !== undefined ? debut(c.prenom, 60) : cur.prenom,
      nom: c.nom !== undefined ? debut(c.nom, 60) : cur.nom,
      statut: c.statut !== undefined ? debut(c.statut, 140) : cur.statut,
      langue: c.langue !== undefined ? c.langue : cur.langue,
      tz: c.tz !== undefined ? c.tz : cur.tz,
      prefs: c.prefs !== undefined ? JSON.stringify(c.prefs) : JSON.stringify(cur.prefs),
    };
    Q('UPDATE personne SET prenom = ?, nom = ?, statut = ?, langue = ?, tz = ?, prefs = ? WHERE id = ?')
      .run(n.prenom, n.nom, n.statut, n.langue, n.tz, n.prefs, id);
    return personneParId(id);
  }

  /* ══ SESSIONS ════════════════════════════════════════════════════════════════════════════ */
  const SESSIONS_MAX = 10;
  function sessionAjouter({ h, personne, appareil, ttlMs }) {
    return tx(() => {
      const t = horloge();
      Q('INSERT INTO session(h, personne, appareil, cree, vu, exp) VALUES(?, ?, ?, ?, ?, ?)').run(h, personne, appareil || null, t, t, t + ttlMs);
      /* Dix appareils au plus : les plus anciens sont fermés — une session volée ne s'accumule pas.
         ⛔ ON RENDRE LEURS EMPREINTES : l'appelant ferme leurs flux. Une session supprimée dont le flux reste
         ouvert continuait de recevoir les messages pendant 24 h (relecture adverse, D3). */
      const evincees = Q('SELECT h FROM session WHERE personne = ? AND h NOT IN (SELECT h FROM session WHERE personne = ? ORDER BY vu DESC, cree DESC LIMIT ?)').all(personne, personne, SESSIONS_MAX).map(r => r.h);
      for (const e of evincees) Q('DELETE FROM session WHERE h = ?').run(e);
      return evincees;
    });
  }
  function sessionLire(h) {
    const r = Q('SELECT personne, exp, vu FROM session WHERE h = ?').get(h);
    if (!r) return null;
    if (r.exp <= horloge()) { Q('DELETE FROM session WHERE h = ?').run(h); return null; }
    return { personne: r.personne, exp: r.exp, vu: r.vu };
  }
  /* 30 jours GLISSANTS, mais une écriture par heure au plus : lire n'écrit pas à chaque requête. */
  function sessionToucher(h, ttlMs) {
    const t = horloge();
    Q('UPDATE session SET vu = ?, exp = ? WHERE h = ? AND vu < ?').run(t, t + ttlMs, h, t - 3600000);
  }
  function sessionSupprimer(h) { return num(Q('DELETE FROM session WHERE h = ?').run(h).changes); }
  function sessionsSupprimerPersonne(id) { return num(Q('DELETE FROM session WHERE personne = ?').run(id).changes); }
  /* Les autres sessions d'une personne : rend leurs empreintes (l'appelant ferme leurs flux — une session supprimée dont le flux reste ouvert continue de recevoir). */
  function sessionsSupprimerAutres(id, garderH) {
    return tx(() => {
      const hs = Q('SELECT h FROM session WHERE personne = ? AND h <> ?').all(id, garderH || '').map(r => r.h);
      for (const h of hs) Q('DELETE FROM session WHERE h = ?').run(h);
      return hs;
    });
  }
  function sessionsBetaActives() {
    const t = horloge();
    return Q(`SELECT DISTINCT p.id FROM personne p JOIN session s ON s.personne = p.id WHERE p.origine = 'beta' AND s.exp > ?`).all(t)
      .map(r => ({ id: r.id, bid: String(personneIdentifiant(r.id) || '').replace(/^beta:/, '') }));   // `bid` : l'identifiant du compte chez OP GESTION
  }

  /* ══ CONTACTS ════════════════════════════════════════════════════════════════════════════ */
  /* Deux lignes par relation : la ligne (de → vers) est le POINT DE VUE de `de`. `bloque` y dit
     « j'ai bloqué ». Une relation est mutuelle quand les deux lignes existent. */
  function contactLier(a, b) {
    return tx(() => {
      const t = horloge();
      Q('INSERT OR IGNORE INTO contact(de, vers, etat, depuis) VALUES(?, ?, ?, ?)').run(a, b, 'ok', t);
      Q('INSERT OR IGNORE INTO contact(de, vers, etat, depuis) VALUES(?, ?, ?, ?)').run(b, a, 'ok', t);
    });
  }
  function contactBloque(a, b) {
    return !!Q(`SELECT 1 AS x FROM contact WHERE etat = 'bloque' AND ((de = ? AND vers = ?) OR (de = ? AND vers = ?))`).get(a, b, b, a);
  }
  /* Mutuel ET aucun des deux n'a bloqué l'autre. */
  function contactActif(a, b) {
    const n = Q(`SELECT COUNT(*) AS n FROM contact WHERE etat = 'ok' AND ((de = ? AND vers = ?) OR (de = ? AND vers = ?))`).get(a, b, b, a).n;
    return n === 2;
  }
  function contactsDe(uid) {
    return Q(`SELECT p.id, p.prenom, p.nom, p.statut, p.avatar_piece, c.etat AS mon_etat, c.depuis,
                COALESCE((SELECT c2.etat FROM contact c2 WHERE c2.de = p.id AND c2.vers = c.de), 'retire') AS son_etat
              FROM contact c JOIN personne p ON p.id = c.vers
              WHERE c.de = ? ORDER BY p.prenom, p.nom, p.id`).all(uid)
      .map(r => ({ id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, avatar: r.son_etat === 'bloque' ? null : (r.avatar_piece || null), bloque: r.mon_etat === 'bloque', mutuel: r.son_etat !== 'retire', depuis: r.depuis }));
  }
  /* Ceux à qui `uid` peut montrer sa présence : mutuels et sans blocage dans aucun sens. */
  function contactsActifs(uid) {
    return Q(`SELECT c.vers AS id FROM contact c
              JOIN contact r ON r.de = c.vers AND r.vers = c.de
              WHERE c.de = ? AND c.etat = 'ok' AND r.etat = 'ok'`).all(uid).map(r => r.id);
  }
  /* ⛔ RETIRER NE LÈVE JAMAIS UN BLOCAGE. Les deux lignes d'une relation sont deux POINTS DE VUE ; la ligne `bloque`
     de l'un est SA décision. L'ancienne version supprimait les deux : le bloqué « retirait » son contact, la ligne de
     blocage de l'autre disparaissait avec, et il se rétablissait par le lien multi-usage encore valable (relecture
     adverse, D1). On ne supprime que les lignes `ok`. */
  function contactRetirer(a, b) {
    return tx(() => num(Q(`DELETE FROM contact WHERE etat = 'ok' AND ((de = ? AND vers = ?) OR (de = ? AND vers = ?))`).run(a, b, b, a).changes));
  }
  function contactEtat(a, b, etat) {
    return num(Q('UPDATE contact SET etat = ? WHERE de = ? AND vers = ?').run(etat, a, b).changes);
  }
  function contactLigne(a, b) { return Q('SELECT etat FROM contact WHERE de = ? AND vers = ?').get(a, b) || null; }
  /* `uid` peut-il voir la fiche de `autre` ? Contact, ou conversation commune encore active. */
  function peutVoir(uid, autre) {
    if (uid === autre) return true;
    if (contactLigne(uid, autre)) return true;
    return !!Q(`SELECT 1 AS x FROM membre a JOIN membre b ON a.conv = b.conv
                WHERE a.uid = ? AND b.uid = ? AND a.quitte_le IS NULL AND b.quitte_le IS NULL LIMIT 1`).get(uid, autre);
  }

  /* ══ LIENS (invitation de contact ou de groupe) ═════════════════════════════════════════ */
  function lienCreer({ h, genre, cible, par, ttlMs, max }) {
    const t = horloge();
    Q('INSERT INTO lien(h, genre, cible, par, cree, exp, restants) VALUES(?, ?, ?, ?, ?, ?, ?)').run(h, genre, cible || null, par, t, t + ttlMs, max);
  }
  /* Expiré, révoqué et épuisé répondent PAREIL (`null`) : ne pas dire lequel des trois. */
  /* ⛔ Un lien de groupe MEURT avec le droit de son créateur : si celui qui l'a créé n'est plus administrateur
     (rétrogradé, parti, retiré), son lien ne vaut plus rien. Sinon un droit retiré survivait dans un code déjà
     distribué (relecture du gardien, point 5). */
  function lienValide(h) {
    return Q(`SELECT genre, cible, par, restants FROM lien l WHERE h = ? AND revoque = 0 AND exp > ? AND restants > 0
              AND (genre <> 'groupe' OR EXISTS (SELECT 1 FROM membre m WHERE m.conv = l.cible AND m.uid = l.par AND m.role = 'admin' AND m.quitte_le IS NULL))`).get(h, horloge()) || null;
  }
  /* Révoquer : tous les liens d'un groupe (`cible`), ou tous les liens de contact d'une personne (`par`). */
  function liensRevoquerGroupe(conv) { return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'groupe' AND cible = ? AND revoque = 0`).run(conv).changes); }
  function liensRevoquerContact(par) { return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'contact' AND par = ? AND revoque = 0`).run(par).changes); }
  function lienApercu(h) {
    const l = lienValide(h); if (!l) return null;
    const par = personneParId(l.par); if (!par) return null;
    const o = { genre: l.genre, par: { id: par.id, prenom: par.prenom, nom: par.nom } };
    if (l.genre === 'groupe') {
      const c = Q('SELECT id, nom_ch FROM conversation WHERE id = ?').get(l.cible);
      if (!c) return null;
      o.groupe = { nom: nomDe(c.id, c.nom_ch), membres: num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(c.id).n) };
    }
    return o;
  }

  /* Accepter un lien : TOUT dans une transaction — le compteur `restants` ne baisse pas si
     l'effet (contact, arrivée dans le groupe) échoue ensuite. Un lien déjà « consommé » par la
     même personne (déjà contact, déjà membre) ne se décompte pas une seconde fois. */
  function lienAccepter({ h, uid }) {
    return tx(() => {
      const l = lienValide(h); if (!l) throw erreur('lien_invalide');
      const consommer = () => Q('UPDATE lien SET restants = restants - 1 WHERE h = ? AND restants > 0').run(h);
      if (l.genre === 'contact') {
        if (l.par === uid) throw erreur('lien_propre');
        if (contactBloque(l.par, uid)) throw erreur('lien_invalide');
        const deja = contactActif(l.par, uid);
        if (!deja) { contactLier(l.par, uid); consommer(); }
        return { genre: 'contact', par: l.par, deja };
      }
      if (l.genre === 'groupe') {
        const c = convBrute(l.cible); if (!c) throw erreur('lien_invalide');
        if (Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(c.id, uid)) return { genre: 'groupe', conv: c.id, deja: true, gid: 0 };
        consommer();
        const r = membresAjouter({ conv: c.id, par: null, uids: [uid] });
        return { genre: 'groupe', conv: c.id, deja: false, gid: r.gid };
      }
      throw erreur('lien_invalide');
    });
  }

  /* ══ CONVERSATIONS ═══════════════════════════════════════════════════════════════════════ */
  const cleDirecte = (a, b) => a < b ? a + '|' + b : b + '|' + a;

  function messageSysteme(conv, auteur, meta) {
    /* Un message système consomme un numéro comme les autres : l'ordre d'une conversation est un. */
    const r = envoyerDansTx({ conv, auteur, cid: 'sys:' + alea(8), type: 'systeme', texte: null, meta, repondA: null });
    return r;
  }

  /* ⛔ UN MESSAGE QUI CITE DES PIÈCES LES ATTACHE DANS LA TRANSACTION DE L'ENVOI : il les attache TOUTES ou n'existe pas. Chaque pièce citée doit être À L'ENVOYEUR,
     déposée pour CETTE conversation, du BON GENRE, non encore attachée et non échue — sinon `piece_inconnue` (404) et tout est défait (la pièce d'un autre, celle
     d'une autre conversation, une photo citée comme vocal, la même pièce deux fois : aucune n'est attachable). La méta rangée est construite ICI, d'après les LIGNES :
     le nom et la taille d'un fichier viennent de la pièce, jamais du corps de la requête (le corps ne décide pas de ce qu'une pièce est) ; la largeur, la hauteur, la durée
     et les barres viennent de l'appareil — la route les a bornées. */
  function piecesAttacher({ conv, auteur, seq, ts, type, pieces, vocal }) {
    const lignes = pieces.map(p => {
      const r = Q(`UPDATE piece SET attachee = ?, expire = NULL WHERE id = ? AND proprio = ? AND conv = ? AND genre = ? AND attachee IS NULL AND expire IS NOT NULL AND expire > ?`).run(seq, p.id, auteur, conv, type, ts);
      if (num(r.changes) !== 1) throw erreur('piece_inconnue');
      return Q('SELECT id, taille, nom_ch FROM piece WHERE id = ?').get(p.id);
    });
    if (type === 'photo') return { pieces: lignes.map((l, i) => ({ id: l.id, w: pieces[i].w, h: pieces[i].h, taille: l.taille })) };
    if (type === 'vocal') return { piece: lignes[0].id, dur: vocal.dur, bars: vocal.bars, taille: lignes[0].taille };
    const nom = lignes[0].nom_ch ? ouvrirOuNull('piece', 'nom_ch', lignes[0].id + '|nom', lignes[0].nom_ch) : null;
    return { piece: lignes[0].id, nom: nom || 'fichier', taille: lignes[0].taille };
  }

  function envoyerDansTx({ conv, auteur, cid, type, texte, meta, repondA, pieces, vocal }) {
    const dej = Q('SELECT seq, ts, id FROM message WHERE conv = ? AND auteur = ? AND cid = ?').get(conv, auteur, cid);
    if (dej) return { deja: true, seq: dej.seq, ts: dej.ts, id: dej.id };
    const c = Q('SELECT dernier_seq, ephemere_s FROM conversation WHERE id = ?').get(conv);
    if (!c) throw erreur('introuvable');
    /* ⛔ `seq` S'ATTRIBUE ICI, dans la transaction : lu au-dessus de BEGIN, deux envois simultanés
       recevraient le même numéro. */
    const seq = c.dernier_seq + 1, ts = horloge(), id = nouvelId('m');
    /* ⛔ APRÈS le contrôle du `cid` : un renvoi (réponse perdue) ne rejoue pas l'attachement des pièces, déjà fait par le premier envoi */
    if (pieces && pieces.length) meta = piecesAttacher({ conv, auteur, seq, ts, type, pieces, vocal });
    const corps = texte != null ? sceller('message', 'corps_ch', aadMsg(conv, seq, auteur), texte) : null;
    const metaCh = meta != null ? sceller('message', 'meta_ch', aadMsg(conv, seq, auteur), JSON.stringify(meta)) : null;
    const expire = c.ephemere_s > 0 ? ts + c.ephemere_s * 1000 : null;
    Q('INSERT INTO message(conv, seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, expire_ts) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(conv, seq, id, auteur, cid, ts, type, corps, metaCh, repondA == null ? null : repondA, expire);
    Q('UPDATE conversation SET dernier_seq = ?, dernier_ts = ? WHERE id = ?').run(seq, ts, conv);
    /* ⛔ ENVOYER N'EST PAS LIRE. Celui qui écrit a lu son propre message, pas ce qui précède : `lu_seq` ne suit son
       message que si RIEN n'attendait d'être lu (`lu_seq = seq - 1`). L'ancienne version le portait à `seq` quoi qu'il
       arrive, et un envoi sorti d'une file hors ligne marquait lus les messages d'autrui jamais vus (relecture
       adverse, D2). Monotone par construction : on ne fait qu'avancer d'un cran. */
    Q('UPDATE membre SET lu_seq = ? WHERE conv = ? AND uid = ? AND lu_seq = ?').run(seq, conv, auteur, seq - 1);
    const gid = journalAjouter('msg_nouveau', conv, null, seq);
    return { deja: false, seq, ts, id, gid };
  }

  function convBrute(id) { return Q('SELECT id, type, nom_ch, avatar_piece, annonces_seules, ephemere_s, dernier_seq, dernier_ts, cree_par, cree, cle_directe FROM conversation WHERE id = ?').get(id) || null; }
  const convRang = (c) => ({
    id: c.id, type: c.type, nom: nomDe(c.id, c.nom_ch), avatar: c.avatar_piece || null, annonces_seules: !!c.annonces_seules,
    ephemere_s: c.ephemere_s, dernier_seq: c.dernier_seq, dernier_ts: c.dernier_ts,
  });

  /* L'objet « pour un membre » : `null` pour inexistant COMME pour non-membre. */
  function convPourMembre(conv, uid) {
    const m = Q('SELECT conv, uid, role, depuis_seq, lu_seq, muet_jusqua, epingle, archive FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
    if (!m) return null;
    const c = convBrute(conv); if (!c) return null;
    return { conv: convRang(c), moi: { role: m.role, depuis_seq: m.depuis_seq, lu_seq: m.lu_seq, muet_jusqua: m.muet_jusqua, epingle: !!m.epingle, archive: !!m.archive } };
  }
  function membresActifs(conv) { return Q('SELECT uid FROM membre WHERE conv = ? AND quitte_le IS NULL').all(conv).map(r => r.uid); }
  /* ⛔ « ACCUSÉS DE LECTURE : NON » S'APPLIQUE : qui l'a coupé ne montre son `lu_seq` à PERSONNE d'autre (`null`), et
     `viewer` — celui qui regarde — voit toujours le sien. Le réglage était accepté et ne faisait rien (relecture
     adverse, D4). */
  const accuses = (prefs) => !(prefs && prefs.accuses === false);
  /* ⛔ LES CONFIRMATIONS DE LECTURE SONT RÉCIPROQUES (comme chez WhatsApp, et dans les groupes aussi — décision écrite dans SERVEUR.md § étape 4) : qui les
     coupe ne montre son « Lu » à personne ET ne voit celui de personne. La moitié « je ne montre pas » existait ; la moitié « je ne vois pas » manquait :
     une personne qui avait coupé ses accusés voyait quand même qui l'avait lue. Les deux moitiés se décident ici, à la lecture. */
  /* ⛔ L'AVATAR D'UNE PERSONNE NE SE MONTRE PAS À QUI ELLE A BLOQUÉ : un identifiant de photo rendu, dont le fichier répondrait 404, dirait « elle m'a bloqué » par
     la seule disparition de la photo ; ici l'identifiant n'est même pas rendu (même règle que `pieceVisible`). */
  function avatarPour(viewer, proprio, piece) {
    if (!piece) return null;
    if (viewer === proprio) return piece;
    const l = Q('SELECT etat FROM contact WHERE de = ? AND vers = ?').get(proprio, viewer);
    return l && l.etat === 'bloque' ? null : piece;
  }
  function membresDetail(conv, viewer) {
    const moi = personneParId(viewer), jeVois = accuses(moi && moi.prefs);
    return Q(`SELECT p.id, p.prenom, p.nom, p.avatar_piece, p.prefs, m.role, m.depuis_seq, m.lu_seq FROM membre m JOIN personne p ON p.id = m.uid
              WHERE m.conv = ? AND m.quitte_le IS NULL ORDER BY m.rejoint, m.rowid`).all(conv)
      .map(r => {
        let prefs = {}; try { prefs = JSON.parse(r.prefs) || {}; } catch (e) {}
        return { id: r.id, prenom: r.prenom, nom: r.nom, avatar: avatarPour(viewer, r.id, r.avatar_piece), role: r.role, depuis_seq: r.depuis_seq, lu_seq: (r.id === viewer || (accuses(prefs) && jeVois)) ? r.lu_seq : null };
      });
  }
  function nbAdmins(conv) { return num(Q(`SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL AND role = 'admin'`).get(conv).n); }

  function convDirecteObtenir(a, b) {
    return tx(() => {
      const cle = cleDirecte(a, b);
      let c = Q('SELECT id FROM conversation WHERE cle_directe = ?').get(cle);
      let cree = false;
      if (!c) {
        const id = nouvelId('c'), t = horloge();
        Q(`INSERT INTO conversation(id, type, dernier_ts, cree_par, cree, cle_directe) VALUES(?, 'direct', ?, ?, ?, ?)`).run(id, t, a, t, cle);
        /* Dans une conversation directe les deux sont `admin` : personne n'y est subalterne,
           et c'est ce qui permet à chacun de régler les messages éphémères. */
        Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'admin', 1, ?)`).run(id, a, t);
        Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'admin', 1, ?)`).run(id, b, t);
        c = { id }; cree = true;
      }
      return { id: c.id, cree };
    });
  }

  /* Rattache à un groupe une photo de profil NEUVE (déposée par `par`, jamais posée) : elle cesse d'expirer et devient celle du groupe.
     ⛔ Une photo déjà posée (chez une personne ou un autre groupe) n'est PAS rattachable : elle n'a plus d'échéance (`expire` nul), et la condition la refuse — sinon
     n'importe quel membre déposerait un identifiant vu ailleurs et ferait perdre sa photo à son propriétaire. */
  function avatarGroupeAttacher(conv, par, piece) {
    const r = Q(`UPDATE piece SET conv = ?, expire = NULL WHERE id = ? AND proprio = ? AND genre = 'avatar' AND conv IS NULL AND expire IS NOT NULL AND expire > ?`).run(conv, piece, par, horloge());
    if (num(r.changes) !== 1) throw erreur('piece_inconnue');
    Q('UPDATE conversation SET avatar_piece = ? WHERE id = ?').run(piece, conv);
  }
  /* Efface la LIGNE d'une pièce et note son identifiant dans `purge` ; rend [id] si une ligne est partie. Le FICHIER, lui, part par l'appelant
     (`pieces.js`) : ce module ne touche que la base. */
  function pieceEffacerLigne(id) {
    if (!num(Q('DELETE FROM piece WHERE id = ?').run(id).changes)) return [];
    Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'piece', horloge());
    return [id];
  }

  function convCreerGroupe({ createur, nom, membres, annonces_seules, ephemere_s, avatar_piece }) {
    return tx(() => {
      const id = nouvelId('c'), t = horloge();
      Q(`INSERT INTO conversation(id, type, nom_ch, annonces_seules, ephemere_s, dernier_ts, cree_par, cree) VALUES(?, 'groupe', ?, ?, ?, ?, ?, ?)`)
        .run(id, sceller('conversation', 'nom_ch', id + '|nom', nom), annonces_seules ? 1 : 0, ephemere_s || 0, t, createur, t);
      if (avatar_piece) avatarGroupeAttacher(id, createur, avatar_piece);
      Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'admin', 1, ?)`).run(id, createur, t);
      for (const u of membres) if (u !== createur) Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'membre', 1, ?)`).run(id, u, t);
      const s = messageSysteme(id, createur, { k: 'groupe_cree' });
      return { id, gid: s.gid };
    });
  }

  /* → { pieces } : les identifiants des pièces dont la LIGNE part avec la conversation (cascade) — l'appelant en efface les fichiers. Sans ce relevé, la cascade
     laisserait sur le disque des fichiers que plus aucune ligne ne réclame (le balayeur les rattraperait, plus tard). */
  function convSupprimer(id) {
    return tx(() => {
      const pieces = Q('SELECT id FROM piece WHERE conv = ?').all(id).map(r => r.id);
      for (const p of pieces) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(p, 'piece', horloge());
      Q('DELETE FROM lien WHERE genre = ? AND cible = ?').run('groupe', id);
      Q('DELETE FROM journal WHERE conv = ?').run(id);
      Q('DELETE FROM conversation WHERE id = ?').run(id);   // les membres, messages, réactions, pièces suivent (ON DELETE CASCADE)
      return { pieces };
    });
  }

  /* Ajoute des membres : un message système, un événement de conversation. Les numéros ne
     remontent PAS : un nouveau membre ne lit que ce qui suit son arrivée (`depuis_seq`). */
  function membresAjouter({ conv, par, uids, max = MAX_MEMBRES }) {
    return tx(() => {
      const c = convBrute(conv); if (!c) throw erreur('introuvable');
      if (c.type === 'direct') throw erreur('conversation_directe');
      const ajoutes = [];
      let n = num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(conv).n);
      for (const u of uids) {
        const m = Q('SELECT quitte_le FROM membre WHERE conv = ? AND uid = ?').get(conv, u);
        if (m && m.quitte_le === null) continue;
        if (n >= max) throw erreur('groupe_plein');
        const t = horloge(), ds = c.dernier_seq + 1 + ajoutes.length;
        if (m) Q(`UPDATE membre SET quitte_le = NULL, role = 'membre', depuis_seq = ?, lu_seq = ?, rejoint = ?, epingle = 0, archive = 0, muet_jusqua = 0 WHERE conv = ? AND uid = ?`).run(ds, ds - 1, t, conv, u);
        else Q(`INSERT INTO membre(conv, uid, role, depuis_seq, lu_seq, rejoint) VALUES(?, ?, 'membre', ?, ?, ?)`).run(conv, u, ds, ds - 1, t);
        n++; ajoutes.push(u);
        messageSysteme(conv, par || u, { k: par && par !== u ? 'membre_ajoute' : 'rejoint', uid: u });
      }
      const gid = ajoutes.length ? journalAjouter('conv_maj', conv, null, '') : 0;
      return { ajoutes, gid };
    });
  }

  function membreRetirer({ conv, par, uid }) {
    return tx(() => {
      const m = Q('SELECT role FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!m) throw erreur('introuvable');
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(horloge(), conv, uid);
      /* ⛔ Le retiré CONNAÎT les codes d'invitation du groupe : on les révoque tous (un administrateur en recrée un). */
      liensRevoquerGroupe(conv);
      messageSysteme(conv, par, { k: 'membre_retire', uid });
      const gid = journalAjouter('retire', conv, uid, '');
      return { gid };
    });
  }

  function membreQuitter({ conv, uid }) {
    return tx(() => {
      const c = convBrute(conv); if (!c) throw erreur('introuvable');
      if (c.type === 'direct') throw erreur('conversation_directe');
      const m = Q('SELECT role FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!m) throw erreur('introuvable');
      const autres = num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid <> ? AND quitte_le IS NULL').get(conv, uid).n);
      if (autres === 0) { const r = convSupprimer(conv); return { vide: true, gid: journalAjouter('retire', conv, uid, ''), conv, pieces: r.pieces }; }
      let promu = null;
      if (m.role === 'admin' && nbAdmins(conv) === 1) {
        /* Le dernier admin ne part pas sans successeur : le plus ancien membre prend la relève. */
        const s = Q(`SELECT uid FROM membre WHERE conv = ? AND uid <> ? AND quitte_le IS NULL ORDER BY rejoint, rowid LIMIT 1`).get(conv, uid);
        Q(`UPDATE membre SET role = 'admin' WHERE conv = ? AND uid = ?`).run(conv, s.uid);
        promu = s.uid;
      }
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(horloge(), conv, uid);
      if (promu) messageSysteme(conv, promu, { k: 'admin_promu', uid: promu });
      messageSysteme(conv, uid, { k: 'membre_parti', uid });
      const gid = journalAjouter('retire', conv, uid, '');
      return { gid, promu, vide: false, pieces: [] };
    });
  }

  function membreRole({ conv, par, uid, admin }) {
    return tx(() => {
      const m = Q('SELECT role FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!m) throw erreur('introuvable');
      const futur = admin ? 'admin' : 'membre';
      if (m.role === futur) return { change: false, gid: 0 };
      if (!admin && nbAdmins(conv) <= 1) throw erreur('dernier_admin');
      Q('UPDATE membre SET role = ? WHERE conv = ? AND uid = ?').run(futur, conv, uid);
      messageSysteme(conv, par, { k: admin ? 'admin_promu' : 'admin_retire', uid });
      const gid = journalAjouter('conv_maj', conv, null, '');
      return { change: true, gid };
    });
  }

  function convMaj({ conv, par, nom, annonces_seules, ephemere_s, avatar_piece }) {
    return tx(() => {
      const c = convBrute(conv); if (!c) throw erreur('introuvable');
      const faits = [], pieces = [];
      /* La photo du groupe : `null` la retire, un identifiant (déposé par l'administrateur qui agit, jamais posé) la pose et remplace l'ancienne, dont la ligne part. */
      if (avatar_piece !== undefined && c.type === 'groupe') {
        const cur = c.avatar_piece || null;
        if (avatar_piece === null) {
          if (cur) { Q('UPDATE conversation SET avatar_piece = NULL WHERE id = ?').run(conv); pieces.push(...pieceEffacerLigne(cur)); faits.push({ k: 'avatar_retire' }); }
        } else if (avatar_piece !== cur) {
          avatarGroupeAttacher(conv, par, avatar_piece);
          if (cur) pieces.push(...pieceEffacerLigne(cur));
          faits.push({ k: 'avatar' });
        }
      }
      if (nom !== undefined && c.type === 'groupe' && nom !== nomDe(c.id, c.nom_ch)) {
        Q('UPDATE conversation SET nom_ch = ? WHERE id = ?').run(sceller('conversation', 'nom_ch', conv + '|nom', nom), conv);
        faits.push({ k: 'renomme' });
      }
      if (annonces_seules !== undefined && c.type === 'groupe' && (annonces_seules ? 1 : 0) !== c.annonces_seules) {
        Q('UPDATE conversation SET annonces_seules = ? WHERE id = ?').run(annonces_seules ? 1 : 0, conv);
        faits.push({ k: 'annonces_seules', valeur: annonces_seules ? 1 : 0 });
      }
      if (ephemere_s !== undefined && ephemere_s !== c.ephemere_s) {
        Q('UPDATE conversation SET ephemere_s = ? WHERE id = ?').run(ephemere_s, conv);
        faits.push({ k: 'ephemere', valeur: ephemere_s });
      }
      for (const f of faits) messageSysteme(conv, par, f);
      const gid = faits.length ? journalAjouter('conv_maj', conv, null, '') : 0;
      return { change: faits.length > 0, gid, pieces };
    });
  }

  /* Réglages PERSONNELS d'une conversation : seul son titulaire les voit, ses autres appareils
     sont prévenus (un événement adressé à lui seul). */
  function membrePrefs({ conv, uid, muet_jusqua, epingle, archive }) {
    return tx(() => {
      const m = Q('SELECT muet_jusqua, epingle, archive FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!m) throw erreur('introuvable');
      Q('UPDATE membre SET muet_jusqua = ?, epingle = ?, archive = ? WHERE conv = ? AND uid = ?')
        .run(muet_jusqua !== undefined ? muet_jusqua : m.muet_jusqua, epingle !== undefined ? (epingle ? 1 : 0) : m.epingle, archive !== undefined ? (archive ? 1 : 0) : m.archive, conv, uid);
      const gid = journalAjouter('conv_maj', conv, uid, '');
      return { gid };
    });
  }

  /* ⛔ `lu_seq` MONTE, JAMAIS NE DESCEND. Le `WHERE lu_seq < ?` est ce qui protège un appareil en
     retard qui renvoie un vieux « lu » ; et on plafonne à `dernier_seq` : on ne lit pas un
     message qui n'existe pas encore. */
  function membreLu({ conv, uid, seq }) {
    return tx(() => {
      const c = Q('SELECT dernier_seq FROM conversation WHERE id = ?').get(conv);
      const m = Q('SELECT lu_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!c || !m) throw erreur('introuvable');
      const cible = Math.min(seq, c.dernier_seq);
      const r = Q('UPDATE membre SET lu_seq = ? WHERE conv = ? AND uid = ? AND lu_seq < ?').run(cible, conv, uid, cible);
      let gid = 0;
      /* Sans accusés, l'événement n'est adressé qu'à son titulaire (ses autres appareils) : les membres ne l'apprennent pas. */
      if (num(r.changes) > 0) gid = journalAjouter('lu', conv, accuses((personneParId(uid) || {}).prefs) ? null : uid, uid + ':' + cible);
      return { lu_seq: Math.max(m.lu_seq, cible), gid };
    });
  }

  /* « Photo », « 2 photos », « Message vocal · 0:08 », « Fichier · nom » : ce que la liste des conversations écrit à la place d'un texte. */
  function apercuPiece(type, meta) {
    if (type === 'photo') { const n = meta && Array.isArray(meta.pieces) ? meta.pieces.length : 1; return n > 1 ? n + ' photos' : 'Photo'; }
    if (type === 'vocal') {
      const s = meta && Number.isFinite(meta.dur) ? Math.max(0, Math.floor(meta.dur)) : null;
      return 'Message vocal' + (s === null ? '' : ' · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
    }
    return 'Fichier' + (meta && meta.nom ? ' · ' + meta.nom : '');
  }
  function convListe(uid) {
    const lignes = Q(`
      SELECT c.id, c.type, c.nom_ch, c.avatar_piece, c.annonces_seules, c.ephemere_s, c.dernier_seq, c.dernier_ts,
             m.role, m.lu_seq, m.depuis_seq, m.muet_jusqua, m.epingle, m.archive,
             (SELECT COUNT(*) FROM message x
                WHERE x.conv = c.id AND x.seq > m.lu_seq AND x.seq >= m.depuis_seq AND x.auteur <> m.uid
                  AND x.type <> 'systeme' AND x.supprime_le IS NULL AND (x.expire_ts IS NULL OR x.expire_ts > ?)
                  AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = m.uid)) AS non_lus,
             (SELECT COUNT(*) FROM membre y WHERE y.conv = c.id AND y.quitte_le IS NULL) AS membres_n
      FROM membre m JOIN conversation c ON c.id = m.conv
      WHERE m.uid = ? AND m.quitte_le IS NULL AND (c.type <> 'direct' OR c.dernier_seq > 0 OR c.cree_par = m.uid)
      ORDER BY m.epingle DESC, c.dernier_ts DESC, c.id`).all(horloge(), uid);
    return lignes.map(l => {
      const o = {
        id: l.id, type: l.type, nom: nomDe(l.id, l.nom_ch), avatar: l.avatar_piece || null, annonces_seules: !!l.annonces_seules, ephemere_s: l.ephemere_s,
        dernier_seq: l.dernier_seq, dernier_ts: l.dernier_ts, role: l.role, lu_seq: l.lu_seq, non_lus: num(l.non_lus),
        membres_n: num(l.membres_n), epingle: !!l.epingle, archive: !!l.archive, muet_jusqua: l.muet_jusqua, apercu: null, autre: null,
      };
      /* ⛔ Un éphémère ÉCHU n'est plus un aperçu, même si le balayeur n'est pas encore passé (il passe toutes les 60 s). */
      const p = Q(`SELECT seq, auteur, type, corps_ch, meta_ch, supprime_le FROM message x
                   WHERE x.conv = ? AND x.seq >= ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)
                     AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)
                   ORDER BY x.seq DESC LIMIT 1`).get(l.id, l.depuis_seq, horloge(), uid);
      if (p) {
        let clair = p.corps_ch && !p.supprime_le ? ouvrirOuNull('message', 'corps_ch', aadMsg(l.id, p.seq, p.auteur), p.corps_ch) : null;
        /* Une photo, un vocal, un fichier n'ont pas de texte : l'aperçu de la liste le DIT (« Photo », « 2 photos », « Message vocal · 0:08 », « Fichier · nom »),
           lu dans la méta scellée du message. Une méta illisible garde le mot seul — la liste ne tombe pas pour une ligne abîmée. */
        if (!p.supprime_le && (p.type === 'photo' || p.type === 'vocal' || p.type === 'fichier')) {
          let meta = null; try { meta = p.meta_ch ? JSON.parse(ouvrirS('message', 'meta_ch', aadMsg(l.id, p.seq, p.auteur), p.meta_ch)) : null; } catch (e) { meta = null; }
          clair = apercuPiece(p.type, meta);
        }
        o.apercu = { seq: p.seq, auteur: p.auteur, type: p.type, supprime: !!p.supprime_le, texte: clair === null ? null : debut(clair, 120) };
        /* ⛔ le NOM de l'auteur d'un aperçu de groupe : sans lui, la liste disait « Quelqu'un : … » pour tout membre qui n'est pas dans mes contacts (le cas
           central d'un groupe par lien) et ne le corrigeait qu'à l'ouverture. Seulement quelqu'un qui est MEMBRE ACTIF de cette conversation — ses noms
           sont déjà dans `membresDetail` de la même conversation, rien de plus n'est dit. */
        if (l.type === 'groupe' && p.type !== 'systeme' && p.auteur) {
          const a = Q(`SELECT p.id, p.prenom, p.nom FROM membre m JOIN personne p ON p.id = m.uid WHERE m.conv = ? AND m.uid = ? AND m.quitte_le IS NULL`).get(l.id, p.auteur);
          if (a) o.apercu.par = { id: a.id, prenom: a.prenom, nom: a.nom };
        }
        if (p.corps_ch && !p.supprime_le && clair === null) o.apercu.illisible = true;
      }
      if (l.type === 'direct') {
        const a = Q(`SELECT p.id, p.prenom, p.nom, p.avatar_piece, p.etat FROM membre m JOIN personne p ON p.id = m.uid WHERE m.conv = ? AND m.uid <> ?`).get(l.id, uid);
        if (a) {
          o.autre = { id: a.id, prenom: a.prenom, nom: a.nom, avatar: avatarPour(uid, a.id, a.avatar_piece) };
          if (a.etat === 'supprime') o.autre.supprime = true;   // ⛔ un compte supprimé n'a plus de nom : la page écrit « Compte supprimé » (un historique reste, comme chez WhatsApp)
        }
      }
      return o;
    });
  }

  /* L'autre participant d'une conversation directe (pour savoir si on peut encore lui écrire). */
  function autreDirect(conv, uid) {
    const r = Q(`SELECT m.uid FROM membre m JOIN conversation c ON c.id = m.conv WHERE m.conv = ? AND c.type = 'direct' AND m.uid <> ?`).get(conv, uid);
    return r ? r.uid : null;
  }
  /* Écrire dans une directe exige un contact mutuel ET aucun blocage ; un groupe n'a pas cette règle. */
  function ecritureAutorisee(conv, uid) {
    const c = convBrute(conv); if (!c) return false;
    if (c.type !== 'direct') return true;
    const autre = autreDirect(conv, uid);
    return !!autre && contactActif(uid, autre);
  }

  /* ══ MESSAGES ════════════════════════════════════════════════════════════════════════════ */
  function messageEnvoyer({ conv, auteur, cid, type = 'texte', texte = null, meta = null, repondA = null, pieces = null, vocal = null }) {
    return tx(() => envoyerDansTx({ conv, auteur, cid, type, texte, meta, repondA, pieces, vocal }));
  }
  function messageExiste(conv, seq) { return !!Q('SELECT 1 AS x FROM message WHERE conv = ? AND seq = ?').get(conv, seq); }

  const messageRang = (conv, r, moi, reactions) => {
    const o = { seq: r.seq, id: r.id, auteur: r.auteur, ts: r.ts, type: r.type, repond_a: r.repond_a, modifie: r.modifie || null, supprime: !!r.supprime_le, texte: null, meta: null, reactions: reactions || [] };
    if (r.auteur === moi) o.cid = r.cid;
    if (!r.supprime_le) {
      if (r.corps_ch) { o.texte = ouvrirOuNull('message', 'corps_ch', aadMsg(conv, r.seq, r.auteur), r.corps_ch); if (o.texte === null) o.illisible = true; }
      if (r.meta_ch) { try { o.meta = JSON.parse(ouvrirS('message', 'meta_ch', aadMsg(conv, r.seq, r.auteur), r.meta_ch)); } catch (e) { o.meta = null; } }
    }
    return o;
  }

  function messagesDe(conv, uid, { avantSeq = null, apresSeq = null, limite = 50 } = {}) {
    const m = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
    if (!m) return null;
    const lim = Math.max(1, Math.min(100, limite | 0 || 50));
    let rows, aPlus = false;
    if (apresSeq !== null) {
      rows = Q(`SELECT seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, modifie, supprime_le FROM message x
                WHERE x.conv = ? AND x.seq >= ? AND x.seq > ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)
                  AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)
                ORDER BY x.seq ASC LIMIT ?`).all(conv, m.depuis_seq, apresSeq, horloge(), uid, lim);
    } else {
      rows = Q(`SELECT seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, modifie, supprime_le FROM message x
                WHERE x.conv = ? AND x.seq >= ? AND x.seq < ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)
                  AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)
                ORDER BY x.seq DESC LIMIT ?`).all(conv, m.depuis_seq, avantSeq === null ? 9007199254740991 : avantSeq, horloge(), uid, lim + 1);
      if (rows.length > lim) { aPlus = true; rows.pop(); }
      rows.reverse();
    }
    const react = {};
    if (rows.length) {
      for (const r of Q('SELECT seq, uid, emoji FROM reaction WHERE conv = ? AND seq BETWEEN ? AND ? ORDER BY ts, uid').all(conv, rows[0].seq, rows[rows.length - 1].seq))
        (react[r.seq] = react[r.seq] || []).push({ uid: r.uid, emoji: r.emoji });
    }
    const sortie = { messages: rows.map(r => messageRang(conv, r, uid, react[r.seq])), a_plus: aPlus };
    /* ⛔ « Compte supprimé » : un message reste chez les autres quand son auteur efface son compte (comme chez WhatsApp), mais le nom, lui, est parti. La page ne peut pas le deviner
       (elle ne connaît que les membres actifs) : on lui dit lesquels des auteurs de CETTE page sont des comptes supprimés. Rien n'est dit des autres (absent quand il n'y en a pas). */
    const supprimes = [];
    for (const id of new Set(rows.map(r => r.auteur))) { const e = Q('SELECT etat FROM personne WHERE id = ?').get(id); if (e && e.etat === 'supprime') supprimes.push(id); }
    if (supprimes.length) sortie.supprimes = supprimes;
    return sortie;
  }

  function messageModifier({ conv, seq, auteur, texte }) {
    return tx(() => {
      const r = Q('SELECT auteur, ts, type, supprime_le FROM message WHERE conv = ? AND seq = ?').get(conv, seq);
      /* ⛔ UN MESSAGE D'AVANT L'ARRIVÉE N'EXISTE PAS : sans cette ligne, modifier le message d'un autre rendait 403 s'il existait et 404
         sinon — de quoi deviner l'existence d'un message qu'on n'a pas le droit de lire (relecture du gardien, remarque 4). */
      const m = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, auteur);
      if (!m || seq < m.depuis_seq) throw erreur('introuvable');
      if (!r || r.supprime_le) throw erreur('introuvable');
      if (r.auteur !== auteur) throw erreur('interdit');
      if (r.type !== 'texte') throw erreur('type');
      if (horloge() - r.ts > DELAI_MODIF_MS) throw erreur('delai');
      const t = horloge();
      Q('UPDATE message SET corps_ch = ?, modifie = ? WHERE conv = ? AND seq = ?').run(sceller('message', 'corps_ch', aadMsg(conv, seq, auteur), texte), t, conv, seq);
      return { gid: journalAjouter('msg_modifie', conv, null, seq), modifie: t };
    });
  }

  /* `pour:'moi'` ne retire le message qu'à son titulaire (un événement à lui seul) ; `'tous'`
     efface le corps TOUT DE SUITE et laisse une pierre tombale — un message supprimé ne doit pas
     rester lisible dans le fichier. */
  function messageSupprimer({ conv, seq, uid, pour, admin }) {
    return tx(() => {
      const r = Q('SELECT auteur, type, supprime_le FROM message WHERE conv = ? AND seq = ?').get(conv, seq);
      const m = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!r || !m || seq < m.depuis_seq) throw erreur('introuvable');
      if (pour === 'moi') {
        Q('INSERT OR IGNORE INTO msg_masque(conv, seq, uid) VALUES(?, ?, ?)').run(conv, seq, uid);
        return { gid: journalAjouter('msg_supprime', conv, uid, seq), pour: 'moi', pieces: [] };
      }
      if (r.type === 'systeme') throw erreur('type');
      if (r.auteur !== uid && !admin) throw erreur('interdit');
      if (r.supprime_le) return { gid: 0, deja: true, pour: 'tous', pieces: [] };
      Q('UPDATE message SET corps_ch = NULL, meta_ch = NULL, supprime_le = ?, modifie = NULL WHERE conv = ? AND seq = ?').run(horloge(), conv, seq);
      Q('DELETE FROM reaction WHERE conv = ? AND seq = ?').run(conv, seq);
      /* ⛔ « supprimer pour tous » EFFACE LES PIÈCES (la ligne ici, le fichier par l'appelant) : un message supprimé ne doit pas rester lisible dans le fichier d'une photo */
      const pieces = piecesDuMessageEffacer(conv, seq);
      return { gid: journalAjouter('msg_supprime', conv, null, seq), pour: 'tous', pieces };
    });
  }

  /* Une réaction par personne et par message : la même retire, une autre remplace. */
  function messageReagir({ conv, seq, uid, emoji }) {
    return tx(() => {
      const r = Q('SELECT supprime_le FROM message WHERE conv = ? AND seq = ?').get(conv, seq);
      const m = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!r || r.supprime_le || !m || seq < m.depuis_seq) throw erreur('introuvable');
      const cur = Q('SELECT emoji FROM reaction WHERE conv = ? AND seq = ? AND uid = ?').get(conv, seq, uid);
      if (!emoji || (cur && cur.emoji === emoji)) Q('DELETE FROM reaction WHERE conv = ? AND seq = ? AND uid = ?').run(conv, seq, uid);
      else Q('INSERT INTO reaction(conv, seq, uid, emoji, ts) VALUES(?, ?, ?, ?, ?) ON CONFLICT(conv, seq, uid) DO UPDATE SET emoji = excluded.emoji, ts = excluded.ts').run(conv, seq, uid, emoji, horloge());
      return { gid: journalAjouter('msg_reaction', conv, null, seq), reactions: reactionsDe(conv, seq) };
    });
  }
  function reactionsDe(conv, seq) { return Q('SELECT uid, emoji FROM reaction WHERE conv = ? AND seq = ? ORDER BY ts, uid').all(conv, seq).map(r => ({ uid: r.uid, emoji: r.emoji })); }

  /* Le balayeur des messages éphémères : la ligne ENTIÈRE part (corps compris) et l'identifiant
     est noté dans `purge`. Rend les conversations touchées pour prévenir les flux. */
  function purgerExpires(maxLignes = 500) {
    return tx(() => {
      const t = horloge();
      const dus = Q('SELECT conv, seq, id FROM message WHERE expire_ts IS NOT NULL AND expire_ts <= ? ORDER BY expire_ts LIMIT ?').all(t, maxLignes);
      const convs = new Set(), pieces = [];
      for (const d of dus) {
        pieces.push(...piecesDuMessageEffacer(d.conv, d.seq));   // ⛔ un éphémère échu emporte ses pièces (la ligne ici, le fichier par l'appelant)
        Q('DELETE FROM message WHERE conv = ? AND seq = ?').run(d.conv, d.seq);
        Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(d.id, 'message_ephemere', t);
        journalAjouter('msg_expire', d.conv, null, d.seq);   // ⛔ « expire », pas « supprimé pour tous » : la page le retire sans écrire « Message supprimé »
        convs.add(d.conv);
      }
      return { n: dus.length, convs: Array.from(convs), pieces };
    });
  }

  /* ══ PIÈCES — lignes, droits de lecture, photos de profil (migration 3) ═════════════════════════════════
     ⛔ CE BLOC NE TOUCHE JAMAIS LE DISQUE : il range et efface des LIGNES, et rend les identifiants dont l'appelant efface les fichiers (`pieces.js`). Toute ligne
     effacée note son identifiant dans `purge` (comme un message éphémère), pour qu'une restauration rejoue l'effacement. */
  /* Efface les lignes des pièces d'UN message (les fichiers suivent, par l'appelant). */
  function piecesDuMessageEffacer(conv, seq) {
    const sortie = [];
    for (const r of Q('SELECT id FROM piece WHERE conv = ? AND attachee = ?').all(conv, seq)) sortie.push(...pieceEffacerLigne(r.id));
    return sortie;
  }
  /* Une pièce déposée, pas encore attachée : elle expire dans `ttlMs` (24 h) si aucun message ne la porte. */
  function pieceCreer({ id, proprio, conv, genre, taille, mime, nom, ttlMs }) {
    const t = horloge();
    Q('INSERT INTO piece(id, proprio, conv, genre, taille, mime, nom_ch, attachee, cree, expire) VALUES(?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)')
      .run(id, proprio, conv || null, genre, taille, mime, nom ? sceller('piece', 'nom_ch', id + '|nom', nom) : null, t, t + ttlMs);
    return { id, taille, mime };
  }
  function pieceUtilise(proprio) { return num(Q('SELECT COALESCE(SUM(taille), 0) AS n FROM piece WHERE proprio = ?').get(proprio).n); }
  function pieceExiste(id) { return !!Q('SELECT 1 AS x FROM piece WHERE id = ?').get(id); }
  function pieceStats() {
    const r = Q('SELECT COUNT(*) AS n, COALESCE(SUM(taille), 0) AS octets FROM piece').get();
    return { n: num(r.n), octets: num(r.octets) };
  }
  /* ⛔ LE DROIT DE LIRE UNE PIÈCE tient en une fonction. `null` pour « n'existe pas » COMME pour « tu n'y as pas droit » (404 dans les deux cas, jamais 403).
       · une pièce de message : membre ACTIF de sa conversation, ET le message qui la porte est visible pour soi — pas avant son arrivée (`depuis_seq`), pas supprimé,
         pas échu, pas masqué « pour moi » ; ou son dépositaire, tant qu'elle n'est pas attachée (et pas échue) ;
       · une photo de profil : posée chez une personne → visible de qui peut voir cette personne (même règle que `GET /api/personnes/:id`, et pas de qui elle a bloqué) ;
         posée chez un groupe → ses membres actifs ; pas encore posée → son dépositaire seul. */
  function pieceVisible(uid, id) {
    const r = Q('SELECT id, proprio, conv, genre, taille, mime, nom_ch, attachee, expire FROM piece WHERE id = ?').get(id);
    if (!r) return null;
    const t = horloge();
    const rang = () => ({ id: r.id, proprio: r.proprio, conv: r.conv, genre: r.genre, taille: r.taille, mime: r.mime, attachee: r.attachee,
      nom: r.nom_ch ? ouvrirOuNull('piece', 'nom_ch', r.id + '|nom', r.nom_ch) : null });
    if (r.genre === 'avatar') {
      if (r.proprio === uid) return rang();
      if (r.expire !== null) return null;
      const pers = Q('SELECT id FROM personne WHERE avatar_piece = ?').get(id);
      if (pers) return peutVoir(uid, pers.id) && avatarPour(uid, pers.id, id) ? rang() : null;
      if (r.conv && Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) return rang();
      return null;
    }
    if (r.attachee === null) return r.proprio === uid && r.expire !== null && r.expire > t ? rang() : null;
    const m = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid);
    if (!m || r.attachee < m.depuis_seq) return null;
    const msg = Q('SELECT supprime_le, expire_ts FROM message WHERE conv = ? AND seq = ?').get(r.conv, r.attachee);
    if (!msg || msg.supprime_le || (msg.expire_ts !== null && msg.expire_ts <= t)) return null;
    if (Q('SELECT 1 AS x FROM msg_masque WHERE conv = ? AND seq = ? AND uid = ?').get(r.conv, r.attachee, uid)) return null;
    return rang();
  }
  /* Poser (identifiant) ou retirer (null) MA photo de profil. La pièce doit être À MOI, de genre « avatar », jamais posée (ni chez une personne ni chez un groupe),
     non échue — sinon `piece_inconnue`. L'ancienne photo est effacée (la ligne ici, le fichier par l'appelant). → { pieces: [identifiants à effacer] } */
  function avatarPersonnePoser(uid, piece) {
    return tx(() => {
      const cur = Q('SELECT avatar_piece FROM personne WHERE id = ?').get(uid);
      if (!cur) throw erreur('introuvable');
      if (piece !== null && piece === cur.avatar_piece) return { pieces: [] };   // déjà la sienne : rien à faire, rien à effacer
      if (piece !== null) {
        const r = Q(`UPDATE piece SET expire = NULL WHERE id = ? AND proprio = ? AND genre = 'avatar' AND conv IS NULL AND expire IS NOT NULL AND expire > ?`).run(piece, uid, horloge());
        if (num(r.changes) !== 1) throw erreur('piece_inconnue');
      }
      Q('UPDATE personne SET avatar_piece = ? WHERE id = ?').run(piece, uid);
      return { pieces: cur.avatar_piece ? pieceEffacerLigne(cur.avatar_piece) : [] };
    });
  }
  /* Les pièces jamais attachées (ou photos jamais posées) dont l'échéance est passée : les lignes partent, les fichiers suivent. */
  function piecesOrphelinesPurger(maxLignes = 500) {
    return tx(() => {
      const sortie = [];
      for (const r of Q('SELECT id FROM piece WHERE expire IS NOT NULL AND expire <= ? ORDER BY expire LIMIT ?').all(horloge(), maxLignes)) sortie.push(...pieceEffacerLigne(r.id));
      return sortie;
    });
  }
  /* Ceux à qui un changement de MON profil (photo, nom, statut) se dit : mes contacts et ceux qui partagent une conversation avec moi, SANS ceux avec qui un blocage
     existe dans un sens ou dans l'autre. Un identifiant seul voyage (`{uid}`) : la page relit ce qu'elle a le droit de voir. */
  function audiencePersonne(uid) {
    const ids = Q(`SELECT vers AS id FROM contact WHERE de = ? AND etat = 'ok'
                   UNION
                   SELECT b.uid AS id FROM membre a JOIN membre b ON a.conv = b.conv WHERE a.uid = ? AND a.quitte_le IS NULL AND b.quitte_le IS NULL AND b.uid <> ?`).all(uid, uid, uid).map(r => r.id);
    return ids.filter(x => x !== uid && !contactBloque(uid, x));
  }

  /* ══ NOTIFICATIONS DANS L'APPLICATION ════════════════════════════════════════════════════ */
  function notifCreer({ uid, type, titre, texte, cible }) {
    return tx(() => {
      const id = nouvelId('n'), t = horloge();
      Q('INSERT INTO notification(id, uid, type, titre_ch, texte_ch, cible, ts) VALUES(?, ?, ?, ?, ?, ?, ?)')
        .run(id, uid, type, sceller('notification', 'titre_ch', id + '|titre', titre || ''), sceller('notification', 'texte_ch', id + '|texte', texte || ''), cible || null, t);
      /* Deux cents au plus par personne : le reste est de l'historique qu'on ne relit pas. */
      Q('DELETE FROM notification WHERE uid = ? AND id NOT IN (SELECT id FROM notification WHERE uid = ? ORDER BY ts DESC, id DESC LIMIT 200)').run(uid, uid);
      return { id, gid: journalAjouter('notif', null, uid, id) };
    });
  }
  const notifRang = (r) => {
    const titre = ouvrirOuNull('notification', 'titre_ch', r.id + '|titre', r.titre_ch), texte = ouvrirOuNull('notification', 'texte_ch', r.id + '|texte', r.texte_ch);
    const o = { id: r.id, type: r.type, titre: titre === null ? '' : titre, texte: texte === null ? '' : texte, cible: r.cible, ts: r.ts, lue: !!r.lue };
    if (titre === null || texte === null) o.illisible = true;
    return o;
  };
  function notifListe(uid, limite = 50) {
    return Q('SELECT id, type, titre_ch, texte_ch, cible, ts, lue FROM notification WHERE uid = ? ORDER BY ts DESC, id DESC LIMIT ?').all(uid, Math.max(1, Math.min(200, limite | 0))).map(notifRang);
  }
  function notifLues(uid, ids) {
    if (ids === null) return num(Q('UPDATE notification SET lue = 1 WHERE uid = ? AND lue = 0').run(uid).changes);
    let n = 0;
    for (const id of ids) n += num(Q('UPDATE notification SET lue = 1 WHERE uid = ? AND id = ? AND lue = 0').run(uid, id).changes);
    return n;
  }
  function notifNonLues(uid) { return num(Q('SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND lue = 0').get(uid).n); }

  /* ══ LE JOURNAL : LIRE LES ÉVÉNEMENTS D'UNE PERSONNE ═════════════════════════════════════ */
  function journalMax() {
    const r = Q(`SELECT seq FROM sqlite_sequence WHERE name = 'journal'`).get();
    return r ? num(r.seq) : 0;
  }
  function journalMin() { const r = Q('SELECT MIN(gid) AS m FROM journal').get(); return r && r.m !== null ? num(r.m) : null; }

  /* ⛔ LA RÈGLE DE VISIBILITÉ TIENT EN UNE REQUÊTE, et c'est la MÊME pour la reprise (`Last-Event-ID`)
     et pour la diffusion en direct. Un événement concerne `uid` si :
       · il lui est adressé (`j.uid = uid`) ; ou
       · il porte sur une conversation dont `uid` est MEMBRE ACTIF — et, pour les événements d'un
         message, seulement si le message date d'APRÈS son arrivée (`depuis_seq`).
     Un membre retiré n'est plus membre actif : plus rien ne lui arrive, y compris ce qui était
     déjà écrit mais pas encore envoyé.
     ⛔ UN ACCUSÉ DE LECTURE (`lu`) NE SE REJOUE QU'À CEUX QUI ÉTAIENT LÀ : il porte l'identifiant de qui a lu et jusqu'où, pas un
     texte — mais un membre arrivé après (`rejoint`) apprenait, en rouvrant le flux à `Last-Event-ID: 0`, qui lisait quoi avant lui
     (relecture du gardien, 2 octobre 2026, remarque 3). */
  function evenementsPour(uid, apresGid, limite = 200) {
    const rows = Q(`
      SELECT j.gid, j.genre, j.conv, j.uid, j.ref, j.ts FROM journal j
      WHERE j.gid > ?
        AND ( j.uid = ?
              OR ( j.uid IS NULL AND j.conv IS NOT NULL AND EXISTS (
                     SELECT 1 FROM membre m WHERE m.conv = j.conv AND m.uid = ? AND m.quitte_le IS NULL
                       AND ( j.genre NOT IN ('msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_expire', 'msg_reaction') OR CAST(j.ref AS INTEGER) >= m.depuis_seq )
                       AND ( j.genre <> 'lu' OR j.ts > m.rejoint ) ) ) )
      ORDER BY j.gid LIMIT ?`).all(apresGid, uid, uid, limite);
    const evenements = [];
    /* les réglages de CELUI QUI REÇOIT, lus une fois pour tout le lot (un accusé de lecture n'arrive qu'à qui n'a pas coupé les siens) */
    let jeVois = null;
    const accusesVus = () => jeVois === null ? (jeVois = accuses((personneParId(uid) || {}).prefs)) : jeVois;
    for (const j of rows) { const e = materialiser(j, uid, accusesVus); if (e) evenements.push(e); }
    return { evenements, dernier: rows.length ? num(rows[rows.length - 1].gid) : apresGid, plein: rows.length >= limite };
  }

  /* ⛔ LE DERNIER IDENTIFIANT QUE CETTE PERSONNE A LE DROIT DE CONNAÎTRE — jamais le compteur global du journal. `bonjour`, `resync` et `/api/sync`
     rendaient `journalMax()` : n'importe quel compte, sans lien avec personne, lisait donc à tout instant combien d'événements le service avait écrits
     (relecture du gardien, 2 octobre 2026, remarque 3) — de quoi voir QUAND quelqu'un écrit n'importe où, y compris contre `presence:false` et `accuses:false`.
     Le plus grand identifiant d'un événement qui la CONCERNE est un point de reprise tout aussi bon : rien d'ultérieur ne la concerne, et
     `Last-Event-ID` rejoue ce qui suit. 0 quand rien ne la concerne encore. */
  function gidVisible(uid) {
    /* ⛔ la MÊME règle de visibilité que `evenementsPour`, recopiée À LA LETTRE (`tests/test-901.js` exige que chaque requête soit un littéral : pas de morceau partagé par
       interpolation) — et `tests/test-907.js` compare les deux sur des cas où elles divergeraient si l'une bougeait seule. */
    const r = Q(`SELECT MAX(j.gid) AS g FROM journal j
      WHERE ( j.uid = ?
              OR ( j.uid IS NULL AND j.conv IS NOT NULL AND EXISTS (
                     SELECT 1 FROM membre m WHERE m.conv = j.conv AND m.uid = ? AND m.quitte_le IS NULL
                       AND ( j.genre NOT IN ('msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_expire', 'msg_reaction') OR CAST(j.ref AS INTEGER) >= m.depuis_seq )
                       AND ( j.genre <> 'lu' OR j.ts > m.rejoint ) ) ) )`).get(uid, uid);
    return r && r.g !== null && r.g !== undefined ? num(r.g) : 0;
  }

  function materialiser(j, uid, accusesVus) {
    const gid = num(j.gid);
    switch (j.genre) {
      case 'msg_nouveau': {
        const seq = parseInt(j.ref, 10);
        const r = Q('SELECT seq, id, auteur, cid, ts, type, corps_ch, meta_ch, repond_a, supprime_le FROM message x WHERE x.conv = ? AND x.seq = ? AND (x.expire_ts IS NULL OR x.expire_ts > ?) AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)').get(j.conv, seq, horloge(), uid);
        if (!r) return null;   // purgé ou masqué depuis : l'événement de purge suit, ou il n'y a rien à dire
        const d = { conv: j.conv, seq: r.seq, id: r.id, auteur: r.auteur, ts: r.ts, type: r.type, repond_a: r.repond_a };
        if (r.auteur === uid) d.cid = r.cid;
        if (r.supprime_le) d.supprime = true;
        else {
          if (r.corps_ch) {
            const t = ouvrirOuNull('message', 'corps_ch', aadMsg(j.conv, r.seq, r.auteur), r.corps_ch);
            if (t === null) d.illisible = true;
            else if (Buffer.byteLength(t, 'utf8') <= TAILLE_PORTEE) d.texte = t; else d.relis = true;
          }
          if (r.meta_ch) { try { d.meta = JSON.parse(ouvrirS('message', 'meta_ch', aadMsg(j.conv, r.seq, r.auteur), r.meta_ch)); } catch (e) {} }
        }
        return { gid, event: 'message', data: d };
      }
      case 'msg_modifie': {
        const seq = parseInt(j.ref, 10);
        const r = Q('SELECT auteur, corps_ch, modifie, supprime_le FROM message WHERE conv = ? AND seq = ?').get(j.conv, seq);
        if (!r || r.supprime_le || !r.corps_ch) return null;
        const t = ouvrirOuNull('message', 'corps_ch', aadMsg(j.conv, seq, r.auteur), r.corps_ch);
        const d = { conv: j.conv, seq, modifie: r.modifie };
        if (t === null) d.illisible = true;
        else if (Buffer.byteLength(t, 'utf8') <= TAILLE_PORTEE) d.texte = t; else d.relis = true;
        return { gid, event: 'message_modifie', data: d };
      }
      case 'msg_supprime': return { gid, event: 'message_supprime', data: { conv: j.conv, seq: parseInt(j.ref, 10), pour: j.uid ? 'moi' : 'tous' } };
      case 'msg_expire': return { gid, event: 'message_supprime', data: { conv: j.conv, seq: parseInt(j.ref, 10), pour: 'expire' } };
      case 'msg_reaction': return { gid, event: 'reaction', data: { conv: j.conv, seq: parseInt(j.ref, 10), reactions: reactionsDe(j.conv, parseInt(j.ref, 10)) } };
      case 'conv_maj': return { gid, event: 'conversation', data: { conv: j.conv } };
      case 'retire': return { gid, event: 'retire', data: { conv: j.conv } };
      case 'lu': {
        const [u, s] = String(j.ref).split(':');
        /* ⛔ RÉCIPROQUE : qui a coupé ses accusés ne reçoit pas ceux des autres (les siens, venus de ses autres appareils, lui arrivent toujours) */
        if (u !== uid && typeof accusesVus === 'function' && !accusesVus()) return null;
        return { gid, event: 'lu', data: { conv: j.conv, uid: u, seq: parseInt(s, 10), ts: num(j.ts) } };
      }   // `ts` : l'heure de la lecture — c'est ce que la page écrit sous « Lu 14:06 »
      case 'notif': {
        const r = Q('SELECT id, type, titre_ch, texte_ch, cible, ts, lue FROM notification WHERE id = ? AND uid = ?').get(j.ref, uid);
        return r ? { gid, event: 'notification', data: notifRang(r) } : null;
      }
      default: return null;
    }
  }

  /* Élaguer : au-delà de 7 jours ou de 10 000 lignes un client en retard reçoit `resync`. */
  function journalElaguer() {
    return tx(() => {
      const t = horloge();
      let n = num(Q('DELETE FROM journal WHERE ts < ?').run(t - JOURNAL_JOURS * 86400000).changes);
      n += num(Q('DELETE FROM journal WHERE gid <= COALESCE((SELECT gid FROM journal ORDER BY gid DESC LIMIT 1 OFFSET ?), 0)').run(JOURNAL_LIGNES).changes);
      n += num(Q('DELETE FROM session WHERE exp <= ?').run(t).changes);
      return n;
    });
  }

  /* ══ TÉLÉPHONE — codes, appareils, journal des SMS, boucliers, recherches (migration 2) ═════════════════
     ⛔ Ce bloc ne reçoit JAMAIS un numéro en clair : `num_h` est l'empreinte HMAC calculée par l'appelant (`scelleur.hmac`), le code
     n'arrive que sous forme de hachage, et `sms_envoi` ne porte ni numéro ni empreinte — seulement la date, le pays et le coût. Le
     numéro d'une personne vit à UN endroit, scellé : `personne.email_ch` (identifiant `tel:+…`), comme une adresse e-mail. */

  /* Le code à usage unique : UN code en attente par numéro (en demander un neuf remplace l'ancien et remet les essais à zéro). */
  function telCodePoser({ num_h, code_h, exp, ap_h }) {
    Q(`INSERT INTO code_tel(num_h, code_h, cree, exp, essais, ap_h) VALUES(?, ?, ?, ?, 0, ?)
       ON CONFLICT(num_h) DO UPDATE SET code_h = excluded.code_h, cree = excluded.cree, exp = excluded.exp, essais = 0, ap_h = excluded.ap_h`).run(num_h, code_h, horloge(), exp, ap_h || null);
  }
  /* ⛔ UN ESSAI SE COMPTE AVANT D'ÊTRE JUGÉ : on incrémente puis on rend le hachage à comparer — jamais « comparer, puis compter si c'est
     faux » (un appel interrompu entre les deux donnerait un essai gratuit). Un code expiré ou à cinq essais est supprimé : usage unique,
     et il faut en redemander un (ce qui coûte un SMS, donc passe par tous les plafonds). Rend `null` si rien d'utilisable.
     ⛔ LE CODE EST LIÉ À L'APPAREIL QUI L'A DEMANDÉ (`ap_h`) : un autre appareil — celui d'un inconnu qui ne connaît que le numéro — ne
     peut ni le deviner ni le BRÛLER. Ses essais ne sont pas comptés sur le code de la personne (relecture adverse : cinq faux essais
     d'un tiers rendaient son vrai code inutilisable) ; il reçoit `null`, comme pour un code absent. */
  function telCodeEssayer(num_h, maxEssais, ap_h) {
    return tx(() => {
      const r = Q('SELECT code_h, exp, essais, ap_h FROM code_tel WHERE num_h = ?').get(num_h);
      if (!r) return null;
      if (r.exp <= horloge() || r.essais >= maxEssais) { Q('DELETE FROM code_tel WHERE num_h = ?').run(num_h); return null; }
      if (r.ap_h && r.ap_h !== ap_h) return null;
      Q('UPDATE code_tel SET essais = essais + 1 WHERE num_h = ?').run(num_h);
      if (r.essais + 1 >= maxEssais) Q('UPDATE code_tel SET exp = ? WHERE num_h = ?').run(0, num_h);   // le dernier essai épuise le code, juste ou faux : la ligne tombera au prochain passage
      return { code_h: r.code_h };
    });
  }
  function telCodeSupprimer(num_h) { return num(Q('DELETE FROM code_tel WHERE num_h = ?').run(num_h).changes); }
  function telCodeCree(num_h) { const r = Q('SELECT cree FROM code_tel WHERE num_h = ?').get(num_h); return r ? r.cree : null; }

  /* Le jeton d'appareil : 10 appareils au plus par personne (les plus anciens partent). Une valeur déjà liée à quelqu'un d'autre
     (un navigateur partagé) passe à la nouvelle personne : l'ancienne devra redemander un SMS, jamais l'inverse. */
  const APPAREILS_MAX = 10;
  function telAppareilLier({ h, personne, nom, ttlMs }) {
    return tx(() => {
      const t = horloge();
      Q(`INSERT INTO appareil_tel(h, personne, nom, cree, vu, exp) VALUES(?, ?, ?, ?, ?, ?)
         ON CONFLICT(h) DO UPDATE SET personne = excluded.personne, nom = excluded.nom, cree = excluded.cree, vu = excluded.vu, exp = excluded.exp`).run(h, personne, nom || null, t, t, t + ttlMs);
      Q('DELETE FROM appareil_tel WHERE personne = ? AND h NOT IN (SELECT h FROM appareil_tel WHERE personne = ? ORDER BY vu DESC, cree DESC LIMIT ?)').run(personne, personne, APPAREILS_MAX);
    });
  }
  /* `cree` est la date de la DERNIÈRE preuve par SMS de cet appareil (un nouveau lien la remet à jour). `absMs` borne la reconnexion SANS
     SMS : au-delà, quelle que soit l'activité, il faut une nouvelle preuve — sinon un numéro réattribué ou une SIM échangée laisserait
     l'ancien titulaire connecté pour toujours (le glissement de 180 jours ne s'arrête que sur une absence). */
  function telAppareilLire(h, absMs) {
    const r = Q('SELECT personne, exp, cree FROM appareil_tel WHERE h = ?').get(h);
    if (!r) return null;
    if (r.exp <= horloge() || (absMs && r.cree + absMs <= horloge())) { Q('DELETE FROM appareil_tel WHERE h = ?').run(h); return null; }
    return { personne: r.personne, exp: r.exp, cree: r.cree };
  }
  /* Glissant, une écriture par heure au plus (comme les sessions). */
  function telAppareilToucher(h, ttlMs) {
    const t = horloge();
    Q('UPDATE appareil_tel SET vu = ?, exp = ? WHERE h = ? AND vu < ?').run(t, t + ttlMs, h, t - 3600000);
  }
  function telAppareilSupprimer(h) { return num(Q('DELETE FROM appareil_tel WHERE h = ?').run(h).changes); }
  function telAppareilsSupprimerPersonne(id) { return num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(id).changes); }
  /* « Déconnecter les autres appareils » : tout sauf l'appareil d'où l'on le demande. */
  function telAppareilsSupprimerAutres(id, garderH) { return num(Q('DELETE FROM appareil_tel WHERE personne = ? AND h <> ?').run(id, garderH || '').changes); }
  function telAppareilsDe(id) { return num(Q('SELECT COUNT(*) AS n FROM appareil_tel WHERE personne = ? AND exp > ?').get(id, horloge()).n); }

  /* Le journal des SMS : une ligne par envoi, coût en micro-euros. « refuse » = le prestataire a refusé net, le coût est rendu. */
  function smsReserver({ pays, cout }) {
    return num(Q(`INSERT INTO sms_envoi(ts, pays, cout, etat) VALUES(?, ?, ?, 'reserve')`).run(horloge(), pays, cout).lastInsertRowid);
  }
  function smsRegler(id, { etat, cout }) {
    Q('UPDATE sms_envoi SET etat = ?, cout = ? WHERE id = ?').run(etat, cout, id);
  }
  /* Les plafonds par numéro et par réseau : des EMPREINTES (HMAC) et des dates, jamais un numéro ni une adresse. Durables : un redémarrage
     ne les remet pas à zéro, et aucune table mémoire à saturer ne les évince. Un SMS rendu (refus franc du prestataire) rend ses lignes. */
  function smsTentativesNoter(sms, cles, ts) { for (const k of cles) Q('INSERT INTO sms_tentative(sms, k, ts) VALUES(?, ?, ?)').run(sms, k, ts === undefined ? horloge() : ts); }
  function smsTentativesCompter(k, depuis) { return num(Q('SELECT COUNT(*) AS n FROM sms_tentative WHERE k = ? AND ts >= ?').get(k, depuis).n); }
  function smsTentativePremiere(k, depuis) { const r = Q('SELECT MIN(ts) AS t FROM sms_tentative WHERE k = ? AND ts >= ?').get(k, depuis); return r && r.t !== null ? num(r.t) : null; }
  function smsTentativesRendre(sms) { return num(Q('DELETE FROM sms_tentative WHERE sms = ?').run(sms).changes); }

  /* Les sommes d'une fenêtre : nombre et coût, tous pays (`pays` nul), un seul, ou tous SAUF une liste (`hors` : le total moins chaque pays de
     la liste — les requêtes restent des LITTÉRAUX, jamais un texte construit). Les envois refusés net ne comptent pas. */
  function smsSommes(depuis, pays, hors) {
    if (Array.isArray(hors) && hors.length) {
      const t = smsSommes(depuis);
      for (const p of hors) { const x = smsSommes(depuis, p); t.n -= x.n; t.cout -= x.cout; }
      return t;
    }
    const r = pays
      ? Q(`SELECT COUNT(*) AS n, COALESCE(SUM(cout), 0) AS cout FROM sms_envoi WHERE ts >= ? AND pays = ? AND etat <> 'refuse'`).get(depuis, pays)
      : Q(`SELECT COUNT(*) AS n, COALESCE(SUM(cout), 0) AS cout FROM sms_envoi WHERE ts >= ? AND etat <> 'refuse'`).get(depuis);
    return { n: num(r.n), cout: num(r.cout) };
  }
  function smsPremier(pays) { const r = Q(`SELECT MIN(ts) AS t FROM sms_envoi WHERE pays = ? AND etat <> 'refuse'`).get(pays); return r && r.t !== null ? num(r.t) : null; }
  function smsPaysSur(depuis) {
    return Q(`SELECT pays, COUNT(*) AS n, COALESCE(SUM(cout), 0) AS cout FROM sms_envoi WHERE ts >= ? AND etat <> 'refuse' GROUP BY pays ORDER BY cout DESC`).all(depuis)
      .map(r => ({ pays: r.pays, n: num(r.n), cout: num(r.cout) }));
  }
  /* L'élagage : chaque table a SA rétention. Le journal des SMS garde de quoi calculer l'emballement (la moyenne des jours précédents) ;
     un code expiré, lui, ne sert plus à rien (son empreinte de numéro n'a pas à rester) ; les plafonds ne regardent que les dernières 24 h. */
  function smsElaguer({ journalAvant, codesAvant, recherchesAvant, tentativesAvant, appareilsAbsMs }) {
    const t = horloge();
    let n = 0;
    n += num(Q('DELETE FROM sms_envoi WHERE ts < ?').run(journalAvant).changes);
    n += num(Q('DELETE FROM code_tel WHERE exp < ?').run(codesAvant).changes);
    n += num(Q('DELETE FROM recherche_tel WHERE ts < ?').run(recherchesAvant).changes);
    n += num(Q('DELETE FROM sms_tentative WHERE ts < ?').run(tentativesAvant).changes);
    n += num(Q('DELETE FROM sms_bouclier WHERE jusqua < ?').run(journalAvant).changes);
    n += num(Q('DELETE FROM appareil_tel WHERE exp < ?').run(t).changes);
    if (appareilsAbsMs) n += num(Q('DELETE FROM appareil_tel WHERE cree + ? < ?').run(appareilsAbsMs, t).changes);
    return n;
  }

  /* Les boucliers : un pays en mode « preuve de travail » jusqu'à une date. */
  function smsBouclierPoser({ pays, jusqua, motif }) {
    Q(`INSERT INTO sms_bouclier(pays, depuis, jusqua, motif) VALUES(?, ?, ?, ?)
       ON CONFLICT(pays) DO UPDATE SET jusqua = excluded.jusqua, motif = excluded.motif`).run(pays, horloge(), jusqua, motif);
  }
  function smsBouclierDe(pays) { const r = Q('SELECT jusqua, motif FROM sms_bouclier WHERE pays = ? AND jusqua > ?').get(pays, horloge()); return r ? { jusqua: num(r.jusqua), motif: r.motif } : null; }
  function smsBoucliers() { return Q('SELECT pays, jusqua, motif FROM sms_bouclier WHERE jusqua > ? ORDER BY pays').all(horloge()).map(r => ({ pays: r.pays, jusqua: num(r.jusqua), motif: r.motif })); }

  /* Les personnes qui ont un numéro : retrouvées par l'identifiant scellé `tel:+…`, avec leur réglage « qui peut me trouver ». */
  function telPersonneParNumero(identifiant) {
    const r = Q(`SELECT id, prenom, etat, trouvable, suppression_le FROM personne WHERE email_h = ? AND origine = 'telephone'`).get(scelleur.hmac('personne', 'email_h', identifiant));
    return r ? { id: r.id, prenom: r.prenom, etat: r.etat, trouvable: r.trouvable, suppression_le: r.suppression_le === null ? null : num(r.suppression_le) } : null;
  }
  function telTrouvableLire(id) { const r = Q('SELECT trouvable FROM personne WHERE id = ?').get(id); return r ? r.trouvable : null; }
  function telTrouvableMaj(id, valeur) { return num(Q('UPDATE personne SET trouvable = ? WHERE id = ?').run(valeur, id).changes); }

  /* Les recherches de contact par numéro : un compte ne peut pas parcourir l'annuaire. */
  function rechercheNoter(uid) { Q('INSERT INTO recherche_tel(uid, ts) VALUES(?, ?)').run(uid, horloge()); }
  function rechercheCompter(uid, depuis) { return num(Q('SELECT COUNT(*) AS n FROM recherche_tel WHERE uid = ? AND ts >= ?').get(uid, depuis).n); }
  function rechercheRendre(uid) { Q('DELETE FROM recherche_tel WHERE rowid = (SELECT MAX(rowid) FROM recherche_tel WHERE uid = ?)').run(uid); }

  /* ══ PUSH — les abonnements des appareils, la paire VAPID, qui reçoit quoi (migration 4) ══════════════════════════════
     ⛔ LE POINT D'ACCÈS D'UN APPAREIL EST UNE CAPACITÉ (qui le connaît peut lui écrire) : il est SCELLÉ au repos, jamais rendu à une autre personne, jamais écrit dans un
     journal ; seule son empreinte HMAC le retrouve. Les données associées lient chaque chiffré à SA ligne ET à son propriétaire (empreinte + personne + champ) : une ligne
     recopiée chez quelqu'un d'autre, ou deux champs permutés, ne s'ouvre plus. Ce bloc ne reçoit JAMAIS un contenu de message. */
  const hPush = (endpoint) => scelleur.hmac('push', 'endpoint_h', endpoint);
  const aadPush = (h, uid, champ) => h + '|' + uid + '|' + champ;
  /* Inscrit (ou réinscrit) un appareil. Un point d'accès déjà inscrit POUR UNE AUTRE PERSONNE lui est retiré et passe à celle-ci (« un appareil, une personne ») : la page réinscrit son
     abonnement à chaque ouverture, donc l'appareil prêté ou revendu suit son dernier utilisateur. → { neuf, transfere, retires } */
  function pushPoser({ uid, endpoint, p256dh, auth, max = PUSH_MAX }) {
    return tx(() => {
      const h = hPush(endpoint), t = horloge();
      const avant = Q('SELECT uid FROM push WHERE endpoint_h = ?').get(h);
      Q(`INSERT INTO push(endpoint_h, uid, endpoint_ch, p256dh_ch, auth_ch, echecs, derniere_ok, cree) VALUES(?, ?, ?, ?, ?, 0, NULL, ?)
         ON CONFLICT(endpoint_h) DO UPDATE SET uid = excluded.uid, endpoint_ch = excluded.endpoint_ch, p256dh_ch = excluded.p256dh_ch, auth_ch = excluded.auth_ch, echecs = 0, cree = excluded.cree`)
        .run(h, uid, sceller('push', 'endpoint_ch', aadPush(h, uid, 'endpoint'), endpoint), sceller('push', 'p256dh_ch', aadPush(h, uid, 'p256dh'), p256dh), sceller('push', 'auth_ch', aadPush(h, uid, 'auth'), auth), t);
      const retires = num(Q('DELETE FROM push WHERE uid = ? AND id NOT IN (SELECT id FROM push WHERE uid = ? ORDER BY cree DESC, id DESC LIMIT ?)').run(uid, uid, max).changes);
      return { neuf: !avant, transfere: !!avant && avant.uid !== uid, retires };
    });
  }
  /* Les appareils d'UNE personne, déchiffrés pour l'envoi. Une ligne qui ne s'ouvre pas est SAUTÉE (et comptée dans `illisibles`) : un appareil abîmé ne prive pas les autres. */
  function pushListe(uid) {
    const sortie = [];
    for (const r of Q('SELECT id, endpoint_h, endpoint_ch, p256dh_ch, auth_ch, echecs FROM push WHERE uid = ? ORDER BY cree DESC, id DESC').all(uid)) {
      const endpoint = ouvrirOuNull('push', 'endpoint_ch', aadPush(r.endpoint_h, uid, 'endpoint'), r.endpoint_ch);
      const p256dh = ouvrirOuNull('push', 'p256dh_ch', aadPush(r.endpoint_h, uid, 'p256dh'), r.p256dh_ch);
      const auth = ouvrirOuNull('push', 'auth_ch', aadPush(r.endpoint_h, uid, 'auth'), r.auth_ch);
      if (endpoint === null || p256dh === null || auth === null) continue;
      sortie.push({ id: num(r.id), endpoint, p256dh, auth, echecs: num(r.echecs) });
    }
    return sortie;
  }
  function pushCompterDe(uid) { return num(Q('SELECT COUNT(*) AS n FROM push WHERE uid = ?').get(uid).n); }
  function pushCompter() { return num(Q('SELECT COUNT(*) AS n FROM push').get().n); }
  /* ⛔ ne retire que les appareils de CETTE personne : l'empreinte d'un point d'accès qui est à une autre ne retire rien (même réponse que s'il n'existait pas). */
  function pushRetirer(uid, endpoint) { return num(Q('DELETE FROM push WHERE endpoint_h = ? AND uid = ?').run(hPush(endpoint), uid).changes); }
  function pushRetirerId(id) { return num(Q('DELETE FROM push WHERE id = ?').run(id).changes); }
  function pushOk(id) { Q('UPDATE push SET echecs = 0, derniere_ok = ? WHERE id = ?').run(horloge(), id); }
  /* Un échec de plus ; au `max`-ième de SUITE l'abonnement part (le service push ne répond plus, ou refuse nos clés). → { retire } */
  function pushEchec(id, max) {
    return tx(() => {
      const r = Q('SELECT echecs FROM push WHERE id = ?').get(id);
      if (!r) return { retire: false };
      if (r.echecs + 1 >= max) { Q('DELETE FROM push WHERE id = ?').run(id); return { retire: true }; }
      Q('UPDATE push SET echecs = echecs + 1 WHERE id = ?').run(id);
      return { retire: false };
    });
  }
  function pushSupprimerPersonne(uid) { return num(Q('DELETE FROM push WHERE uid = ?').run(uid).changes); }

  /* ⛔ LA PAIRE VAPID DE L'INSTANCE : la clé publique en clair (`meta.vapid_pub`, la page la lit), la PRIVÉE scellée (`meta.vapid_priv_ch`). Un abonnement est lié à la clé publique avec
     laquelle il a été créé : changer de paire plus tard ferait refuser tous les envois. La première paire posée GAGNE, donc, et reste. */
  function pushVapidLire() {
    const pub = metaLire('vapid_pub'), ch = metaLire('vapid_priv_ch');
    if (pub === null || ch === null) return null;
    let privee;
    try { privee = ouvrirS('meta', 'vapid_priv', 'vapid', Buffer.from(ch, 'base64')); } catch (e) { throw erreur('vapid_illisible'); }
    return { publique: pub, privee };
  }
  function pushVapidPoser({ publique, privee }) {
    return tx(() => {
      const deja = pushVapidLire();
      if (deja) return deja;
      metaPoser('vapid_pub', publique);
      metaPoser('vapid_priv_ch', sceller('meta', 'vapid_priv', 'vapid', privee).toString('base64'));
      return { publique, privee };
    });
  }

  /* Qui peut recevoir une notification pour le message `seq` de `conv` : les membres ACTIFS qui ont au moins un appareil abonné, pas l'auteur, pas en sourdine, arrivés avant ce message.
     (Un groupe de mille personnes dont trente ont activé les notifications coûte trente envois, pas mille.) */
  function pushDestinatairesMessage({ conv, seq, auteur }) {
    return Q(`SELECT DISTINCT m.uid AS uid FROM membre m JOIN push p ON p.uid = m.uid
              WHERE m.conv = ? AND m.quitte_le IS NULL AND m.uid <> ? AND m.muet_jusqua <= ? AND m.depuis_seq <= ? ORDER BY m.uid`).all(conv, auteur, horloge(), seq).map(r => r.uid);
  }
  /* ⛔ LA NOTIFICATION SE RE-JUGE AU MOMENT DE PARTIR (elle attend jusqu'à 5 s qu'une page l'acquitte) : la personne a pu mettre la conversation en sourdine, la quitter, ou l'auteur a pu
     supprimer le message « pour tous » — rien de tout cela ne doit partir quand même. */
  function pushMessageEncore({ uid, conv, seq }) {
    const m = Q('SELECT depuis_seq, muet_jusqua FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
    if (!m || m.muet_jusqua > horloge() || seq < m.depuis_seq) return false;
    const x = Q('SELECT supprime_le, expire_ts FROM message x WHERE x.conv = ? AND x.seq = ? AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)').get(conv, seq, uid);
    return !!x && !x.supprime_le && (x.expire_ts === null || x.expire_ts > horloge());
  }
  /* L'autre d'une conversation directe est-il un compte supprimé ? (pour dire « ce compte a été supprimé » à qui lui écrit, au lieu d'un « introuvable » muet) */
  function autreSupprime(conv, uid) {
    const a = autreDirect(conv, uid);
    if (!a) return false;
    const r = Q('SELECT etat FROM personne WHERE id = ?').get(a);
    return !!r && r.etat === 'supprime';
  }

  /* ══ COMPTE — export, suppression programmée, effacement (migration 4) ══════════════════════════════════════════
     ⛔ SUPPRIMER SON COMPTE SE FAIT EN DEUX TEMPS. (1) `suppressionProgrammer` : à l'instant, TOUT ce qui connecte la personne est coupé (sessions, jetons d'appareil, abonnements push,
     liens d'invitation) et l'échéance est posée — se reconnecter avant elle l'ANNULE (`suppressionAnnuler`). (2) `compteEffacer`, au passage du balayeur après l'échéance : l'identité part
     (numéro, nom, statut, photo, réglages, contacts, notifications, appareils), mais la LIGNE `personne` reste, VIDE, avec l'état « supprime ».
     ⛔ POURQUOI UNE LIGNE VIDE ET PAS UN DELETE. `piece.proprio` est une clé étrangère en cascade : supprimer la personne ferait disparaître les photos, vocaux et fichiers qu'elle a ENVOYÉS —
     et que les autres voient encore dans leurs conversations (le message resterait, sa pièce serait un trou). Les messages d'une personne qui s'en va restent chez les autres, avec l'auteur
     « Compte supprimé » (comme chez WhatsApp) : l'identifiant, lui, doit continuer de désigner quelqu'un. Il ne désigne plus personne : plus de numéro (`email_h` NULL — le numéro peut donc
     s'inscrire à NEUF, et ne retrouve jamais cette ligne), plus de nom, plus rien qui permette de se connecter. */
  function suppressionProgrammer(uid, echeance) {
    return tx(() => {
      if (!num(Q("UPDATE personne SET suppression_le = ? WHERE id = ? AND etat = 'actif'").run(echeance, uid).changes)) throw erreur('introuvable');
      const sessions = num(Q('DELETE FROM session WHERE personne = ?').run(uid).changes);
      const appareils = num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid).changes);
      const push = num(Q('DELETE FROM push WHERE uid = ?').run(uid).changes);
      Q('DELETE FROM jeton WHERE personne = ?').run(uid);
      Q('UPDATE lien SET revoque = 1 WHERE par = ? AND revoque = 0').run(uid);   // un lien d'invitation d'une personne qui s'en va ne ramène plus personne vers elle
      return { sessions, appareils, push, echeance };
    });
  }
  function suppressionAnnuler(uid) {
    return num(Q("UPDATE personne SET suppression_le = NULL WHERE id = ? AND etat = 'actif' AND suppression_le IS NOT NULL").run(uid).changes) > 0;
  }
  function suppressionLe(uid) {
    const r = Q('SELECT suppression_le FROM personne WHERE id = ?').get(uid);
    return r && r.suppression_le !== null && r.suppression_le !== undefined ? num(r.suppression_le) : null;
  }
  /* Les comptes dont l'échéance est passée (par paquets : un effacement est une transaction, pas mille). */
  function comptesEchus(limite = 10) {
    return Q(`SELECT id FROM personne WHERE etat = 'actif' AND suppression_le IS NOT NULL AND suppression_le <= ? ORDER BY suppression_le, id LIMIT ?`).all(horloge(), Math.max(1, limite | 0)).map(r => r.id);
  }
  /* L'effacement. TOUT dans une transaction, rejouable (une personne déjà effacée, ou dont la suppression a été annulée entre-temps, ne perd rien).
     → { effacee, pieces: [identifiants dont l'appelant efface les FICHIERS], convs: [conversations à rafraîchir], audience: [ceux à qui dire que ce profil a changé] } */
  function compteEffacer(uid) {
    return tx(() => {
      const p = Q('SELECT etat, suppression_le, avatar_piece FROM personne WHERE id = ?').get(uid);
      if (!p || p.etat !== 'actif' || p.suppression_le === null || p.suppression_le > horloge()) return { effacee: false, pieces: [], convs: [], audience: [] };
      const audience = audiencePersonne(uid);   // AVANT d'effacer les contacts : c'est eux qu'il faut prévenir
      const pieces = [], convs = [];
      /* chaque conversation : un groupe se quitte comme on le quitte (le dernier administrateur passe la main, le dernier membre emporte le groupe), une directe reste à l'autre — qui y garde
         son historique mais ne peut plus y écrire. Les messages, eux, restent. */
      for (const m of Q('SELECT m.conv AS conv, c.type AS type FROM membre m JOIN conversation c ON c.id = m.conv WHERE m.uid = ? AND m.quitte_le IS NULL').all(uid)) {
        if (m.type === 'direct') {
          Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(horloge(), m.conv, uid);
          const reste = num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(m.conv).n);
          if (reste === 0) pieces.push(...convSupprimer(m.conv).pieces);
          else journalAjouter('conv_maj', m.conv, null, '');
        } else {
          pieces.push(...(membreQuitter({ conv: m.conv, uid }).pieces || []));
        }
        convs.push(m.conv);
      }
      /* les pièces qui n'ont jamais servi (déposées, pas encore envoyées) et la photo de profil partent avec la personne ; celles qu'un message porte restent avec lui */
      for (const r of Q('SELECT id FROM piece WHERE proprio = ? AND expire IS NOT NULL').all(uid)) pieces.push(...pieceEffacerLigne(r.id));
      if (p.avatar_piece) pieces.push(...pieceEffacerLigne(p.avatar_piece));
      Q('DELETE FROM session WHERE personne = ?').run(uid);
      Q('DELETE FROM jeton WHERE personne = ?').run(uid);
      Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid);
      Q('DELETE FROM push WHERE uid = ?').run(uid);
      Q('DELETE FROM notification WHERE uid = ?').run(uid);
      Q('DELETE FROM contact WHERE de = ? OR vers = ?').run(uid, uid);
      Q('DELETE FROM lien WHERE par = ?').run(uid);
      Q('DELETE FROM recherche_tel WHERE uid = ?').run(uid);
      Q('DELETE FROM msg_masque WHERE uid = ?').run(uid);
      Q('DELETE FROM journal WHERE uid = ?').run(uid);
      Q('UPDATE membre SET muet_jusqua = 0, epingle = 0, archive = 0 WHERE uid = ?').run(uid);
      /* LA définition d'un compte effacé : plus d'identité (le numéro se libère), plus de nom, plus de mot de passe, plus de réglage — l'identifiant seul demeure, pour que « l'auteur » d'un message
         reste quelqu'un (de supprimé). `origine` et `cree` demeurent : ni l'un ni l'autre ne désigne personne. */
      Q(`UPDATE personne SET email_h = NULL, email_ch = NULL, verifie_le = NULL, sel = NULL, mdp = NULL, params = NULL, prenom = '', nom = '', avatar_piece = NULL, statut = '',
           langue = 'fr', tz = 'Europe/Paris', prefs = '{}', etat = 'supprime', suppression_le = NULL, age_ok = NULL, cgu_v = NULL, essais = 0, bloque_jusqua = NULL, trouvable = 'personne'
         WHERE id = ?`).run(uid);
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(uid, 'compte', horloge());
      return { effacee: true, pieces, convs, audience };
    });
  }

  /* ── de quoi composer l'export des données d'une personne (`compte.js`) : tout se lit avec les MÊMES règles de visibilité que l'application ── */
  function exportProfil(uid) {
    const r = Q('SELECT id, prenom, nom, statut, langue, tz, prefs, origine, cree, trouvable, age_ok, cgu_v FROM personne WHERE id = ?').get(uid);
    if (!r) return null;
    let prefs = {}; try { prefs = JSON.parse(r.prefs) || {}; } catch (e) { prefs = {}; }
    return { id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, langue: r.langue, fuseau: r.tz, origine: r.origine, cree: num(r.cree), trouvable: r.trouvable, prefs, age_ok: r.age_ok === null ? null : num(r.age_ok), cgu_v: r.cgu_v };
  }
  function exportConversationsIds(uid) { return Q('SELECT conv FROM membre WHERE uid = ? AND quitte_le IS NULL ORDER BY conv').all(uid).map(r => r.conv); }
  function exportPieces(uid) {
    return Q('SELECT id, genre, taille, cree FROM piece WHERE proprio = ? ORDER BY cree, id LIMIT 20001').all(uid).map(r => ({ id: r.id, genre: r.genre, taille: num(r.taille), cree: num(r.cree) }));   // une de plus que ce que l'export garde : c'est ce qui dit qu'il y en a plus
  }

  /* ══ AGRÉGATS POUR /health — des NOMBRES, jamais un identifiant ══════════════════════════ */
  function stats() {
    return {
      personnes: num(Q('SELECT COUNT(*) AS n FROM personne').get().n),
      conversations: num(Q('SELECT COUNT(*) AS n FROM conversation').get().n),
      messages: num(Q('SELECT COALESCE(SUM(dernier_seq), 0) AS n FROM conversation').get().n),
      sessions: num(Q('SELECT COUNT(*) AS n FROM session WHERE exp > ?').get(horloge()).n),
      journal: num(Q('SELECT COUNT(*) AS n FROM journal').get().n),
      illisibles,
    };
  }
  const schema = () => versionActuelle();
  function instantane(vers) { Q('VACUUM INTO ?').run(vers); }
  function fermer() { try { db.close(); } catch (e) {} }

  return {
    schema, instantane, fermer, tx, stats, metaLire, nouvelId, illisibles: () => illisibles,
    personneCreer, personneParIdentifiant, personneParId, personneIdentifiant, personneMaj,
    sessionAjouter, sessionLire, sessionToucher, sessionSupprimer, sessionsSupprimerPersonne, sessionsSupprimerAutres, sessionsBetaActives,
    contactLier, contactBloque, contactActif, contactsDe, contactsActifs, contactRetirer, contactEtat, contactLigne, peutVoir,
    lienCreer, lienValide, lienApercu, lienAccepter, liensRevoquerGroupe, liensRevoquerContact,
    convDirecteObtenir, convCreerGroupe, convSupprimer, convPourMembre, convListe, convMaj, membresActifs, membresDetail, nbAdmins,
    membresAjouter, membreRetirer, membreQuitter, membreRole, membrePrefs, membreLu, autreDirect, ecritureAutorisee,
    messageEnvoyer, messageExiste, messagesDe, messageModifier, messageSupprimer, messageReagir, reactionsDe, purgerExpires,
    pieceCreer, pieceVisible, pieceUtilise, pieceExiste, pieceStats, pieceEffacerLigne, avatarPersonnePoser, piecesOrphelinesPurger, audiencePersonne,
    notifCreer, notifListe, notifLues, notifNonLues,
    journalMax, journalMin, journalElaguer, evenementsPour, gidVisible,
    telCodePoser, telCodeEssayer, telCodeSupprimer, telCodeCree,
    telAppareilLier, telAppareilLire, telAppareilToucher, telAppareilSupprimer, telAppareilsSupprimerPersonne, telAppareilsSupprimerAutres, telAppareilsDe,
    smsTentativesNoter, smsTentativesCompter, smsTentativePremiere, smsTentativesRendre,
    smsReserver, smsRegler, smsSommes, smsPremier, smsPaysSur, smsElaguer, smsBouclierPoser, smsBouclierDe, smsBoucliers,
    telPersonneParNumero, telTrouvableLire, telTrouvableMaj, rechercheNoter, rechercheCompter, rechercheRendre,
    pushPoser, pushListe, pushCompterDe, pushCompter, pushRetirer, pushRetirerId, pushOk, pushEchec, pushSupprimerPersonne, pushVapidLire, pushVapidPoser,
    pushDestinatairesMessage, pushMessageEncore, autreSupprime,
    suppressionProgrammer, suppressionAnnuler, suppressionLe, comptesEchus, compteEffacer, exportProfil, exportConversationsIds, exportPieces,
  };
}

module.exports = { ouvrir, MIGRATIONS, MAX_MEMBRES, DELAI_MODIF_MS, TAILLE_PORTEE, GENRES_SEQ, PUSH_MAX };
