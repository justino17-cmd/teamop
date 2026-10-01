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
    id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, langue: r.langue, tz: r.tz,
    prefs: (() => { try { return JSON.parse(r.prefs) || {}; } catch (e) { return {}; } })(),
    origine: r.origine, verifie: !!r.verifie_le, etat: r.etat, cree: r.cree,
  });
  function personneParIdentifiant(identifiant) {
    return personneRang(Q('SELECT id, prenom, nom, statut, langue, tz, prefs, origine, verifie_le, etat, cree FROM personne WHERE email_h = ?')
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
    return personneRang(Q('SELECT id, prenom, nom, statut, langue, tz, prefs, origine, verifie_le, etat, cree FROM personne WHERE id = ?').get(id));
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
    return Q(`SELECT p.id, p.prenom, p.nom, p.statut, c.etat AS mon_etat, c.depuis,
                COALESCE((SELECT c2.etat FROM contact c2 WHERE c2.de = p.id AND c2.vers = c.de), 'retire') AS son_etat
              FROM contact c JOIN personne p ON p.id = c.vers
              WHERE c.de = ? ORDER BY p.prenom, p.nom, p.id`).all(uid)
      .map(r => ({ id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, bloque: r.mon_etat === 'bloque', mutuel: r.son_etat !== 'retire', depuis: r.depuis }));
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

  function envoyerDansTx({ conv, auteur, cid, type, texte, meta, repondA }) {
    const dej = Q('SELECT seq, ts, id FROM message WHERE conv = ? AND auteur = ? AND cid = ?').get(conv, auteur, cid);
    if (dej) return { deja: true, seq: dej.seq, ts: dej.ts, id: dej.id };
    const c = Q('SELECT dernier_seq, ephemere_s FROM conversation WHERE id = ?').get(conv);
    if (!c) throw erreur('introuvable');
    /* ⛔ `seq` S'ATTRIBUE ICI, dans la transaction : lu au-dessus de BEGIN, deux envois simultanés
       recevraient le même numéro. */
    const seq = c.dernier_seq + 1, ts = horloge(), id = nouvelId('m');
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

  function convBrute(id) { return Q('SELECT id, type, nom_ch, annonces_seules, ephemere_s, dernier_seq, dernier_ts, cree_par, cree, cle_directe FROM conversation WHERE id = ?').get(id) || null; }
  const convRang = (c) => ({
    id: c.id, type: c.type, nom: nomDe(c.id, c.nom_ch), annonces_seules: !!c.annonces_seules,
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
  function membresDetail(conv, viewer) {
    return Q(`SELECT p.id, p.prenom, p.nom, p.prefs, m.role, m.depuis_seq, m.lu_seq FROM membre m JOIN personne p ON p.id = m.uid
              WHERE m.conv = ? AND m.quitte_le IS NULL ORDER BY m.rejoint, m.rowid`).all(conv)
      .map(r => {
        let prefs = {}; try { prefs = JSON.parse(r.prefs) || {}; } catch (e) {}
        return { id: r.id, prenom: r.prenom, nom: r.nom, role: r.role, depuis_seq: r.depuis_seq, lu_seq: (r.id === viewer || accuses(prefs)) ? r.lu_seq : null };
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

  function convCreerGroupe({ createur, nom, membres, annonces_seules, ephemere_s }) {
    return tx(() => {
      const id = nouvelId('c'), t = horloge();
      Q(`INSERT INTO conversation(id, type, nom_ch, annonces_seules, ephemere_s, dernier_ts, cree_par, cree) VALUES(?, 'groupe', ?, ?, ?, ?, ?, ?)`)
        .run(id, sceller('conversation', 'nom_ch', id + '|nom', nom), annonces_seules ? 1 : 0, ephemere_s || 0, t, createur, t);
      Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'admin', 1, ?)`).run(id, createur, t);
      for (const u of membres) if (u !== createur) Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'membre', 1, ?)`).run(id, u, t);
      const s = messageSysteme(id, createur, { k: 'groupe_cree' });
      return { id, gid: s.gid };
    });
  }

  function convSupprimer(id) {
    return tx(() => {
      Q('DELETE FROM lien WHERE genre = ? AND cible = ?').run('groupe', id);
      Q('DELETE FROM journal WHERE conv = ?').run(id);
      Q('DELETE FROM conversation WHERE id = ?').run(id);   // les membres, messages, réactions suivent (ON DELETE CASCADE)
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
      if (autres === 0) { convSupprimer(conv); return { vide: true, gid: journalAjouter('retire', conv, uid, ''), conv }; }
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
      return { gid, promu, vide: false };
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

  function convMaj({ conv, par, nom, annonces_seules, ephemere_s }) {
    return tx(() => {
      const c = convBrute(conv); if (!c) throw erreur('introuvable');
      const faits = [];
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
      return { change: faits.length > 0, gid };
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

  function convListe(uid) {
    const lignes = Q(`
      SELECT c.id, c.type, c.nom_ch, c.annonces_seules, c.ephemere_s, c.dernier_seq, c.dernier_ts,
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
        id: l.id, type: l.type, nom: nomDe(l.id, l.nom_ch), annonces_seules: !!l.annonces_seules, ephemere_s: l.ephemere_s,
        dernier_seq: l.dernier_seq, dernier_ts: l.dernier_ts, role: l.role, lu_seq: l.lu_seq, non_lus: num(l.non_lus),
        membres_n: num(l.membres_n), epingle: !!l.epingle, archive: !!l.archive, muet_jusqua: l.muet_jusqua, apercu: null, autre: null,
      };
      /* ⛔ Un éphémère ÉCHU n'est plus un aperçu, même si le balayeur n'est pas encore passé (il passe toutes les 60 s). */
      const p = Q(`SELECT seq, auteur, type, corps_ch, supprime_le FROM message x
                   WHERE x.conv = ? AND x.seq >= ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)
                     AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)
                   ORDER BY x.seq DESC LIMIT 1`).get(l.id, l.depuis_seq, horloge(), uid);
      if (p) {
        const clair = p.corps_ch && !p.supprime_le ? ouvrirOuNull('message', 'corps_ch', aadMsg(l.id, p.seq, p.auteur), p.corps_ch) : null;
        o.apercu = { seq: p.seq, auteur: p.auteur, type: p.type, supprime: !!p.supprime_le, texte: clair === null ? null : debut(clair, 120) };
        if (p.corps_ch && !p.supprime_le && clair === null) o.apercu.illisible = true;
      }
      if (l.type === 'direct') {
        const a = Q(`SELECT p.id, p.prenom, p.nom FROM membre m JOIN personne p ON p.id = m.uid WHERE m.conv = ? AND m.uid <> ?`).get(l.id, uid);
        if (a) o.autre = { id: a.id, prenom: a.prenom, nom: a.nom };
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
  function messageEnvoyer({ conv, auteur, cid, type = 'texte', texte = null, meta = null, repondA = null }) {
    return tx(() => envoyerDansTx({ conv, auteur, cid, type, texte, meta, repondA }));
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
    return { messages: rows.map(r => messageRang(conv, r, uid, react[r.seq])), a_plus: aPlus };
  }

  function messageModifier({ conv, seq, auteur, texte }) {
    return tx(() => {
      const r = Q('SELECT auteur, ts, type, supprime_le FROM message WHERE conv = ? AND seq = ?').get(conv, seq);
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
        return { gid: journalAjouter('msg_supprime', conv, uid, seq), pour: 'moi' };
      }
      if (r.type === 'systeme') throw erreur('type');
      if (r.auteur !== uid && !admin) throw erreur('interdit');
      if (r.supprime_le) return { gid: 0, deja: true, pour: 'tous' };
      Q('UPDATE message SET corps_ch = NULL, meta_ch = NULL, supprime_le = ?, modifie = NULL WHERE conv = ? AND seq = ?').run(horloge(), conv, seq);
      Q('DELETE FROM reaction WHERE conv = ? AND seq = ?').run(conv, seq);
      return { gid: journalAjouter('msg_supprime', conv, null, seq), pour: 'tous' };
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
      const convs = new Set();
      for (const d of dus) {
        Q('DELETE FROM message WHERE conv = ? AND seq = ?').run(d.conv, d.seq);
        Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(d.id, 'message_ephemere', t);
        journalAjouter('msg_expire', d.conv, null, d.seq);   // ⛔ « expire », pas « supprimé pour tous » : la page le retire sans écrire « Message supprimé »
        convs.add(d.conv);
      }
      return { n: dus.length, convs: Array.from(convs) };
    });
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
     déjà écrit mais pas encore envoyé. */
  function evenementsPour(uid, apresGid, limite = 200) {
    const rows = Q(`
      SELECT j.gid, j.genre, j.conv, j.uid, j.ref, j.ts FROM journal j
      WHERE j.gid > ?
        AND ( j.uid = ?
              OR ( j.uid IS NULL AND j.conv IS NOT NULL AND EXISTS (
                     SELECT 1 FROM membre m WHERE m.conv = j.conv AND m.uid = ? AND m.quitte_le IS NULL
                       AND ( j.genre NOT IN ('msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_expire', 'msg_reaction') OR CAST(j.ref AS INTEGER) >= m.depuis_seq ) ) ) )
      ORDER BY j.gid LIMIT ?`).all(apresGid, uid, uid, limite);
    const evenements = [];
    for (const j of rows) { const e = materialiser(j, uid); if (e) evenements.push(e); }
    return { evenements, dernier: rows.length ? num(rows[rows.length - 1].gid) : apresGid, plein: rows.length >= limite };
  }

  function materialiser(j, uid) {
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
      case 'lu': { const [u, s] = String(j.ref).split(':'); return { gid, event: 'lu', data: { conv: j.conv, uid: u, seq: parseInt(s, 10) } }; }
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
    const r = Q(`SELECT id, prenom, etat, trouvable FROM personne WHERE email_h = ? AND origine = 'telephone'`).get(scelleur.hmac('personne', 'email_h', identifiant));
    return r ? { id: r.id, prenom: r.prenom, etat: r.etat, trouvable: r.trouvable } : null;
  }
  function telTrouvableLire(id) { const r = Q('SELECT trouvable FROM personne WHERE id = ?').get(id); return r ? r.trouvable : null; }
  function telTrouvableMaj(id, valeur) { return num(Q('UPDATE personne SET trouvable = ? WHERE id = ?').run(valeur, id).changes); }

  /* Les recherches de contact par numéro : un compte ne peut pas parcourir l'annuaire. */
  function rechercheNoter(uid) { Q('INSERT INTO recherche_tel(uid, ts) VALUES(?, ?)').run(uid, horloge()); }
  function rechercheCompter(uid, depuis) { return num(Q('SELECT COUNT(*) AS n FROM recherche_tel WHERE uid = ? AND ts >= ?').get(uid, depuis).n); }
  function rechercheRendre(uid) { Q('DELETE FROM recherche_tel WHERE rowid = (SELECT MAX(rowid) FROM recherche_tel WHERE uid = ?)').run(uid); }

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
    notifCreer, notifListe, notifLues, notifNonLues,
    journalMax, journalMin, journalElaguer, evenementsPour,
    telCodePoser, telCodeEssayer, telCodeSupprimer, telCodeCree,
    telAppareilLier, telAppareilLire, telAppareilToucher, telAppareilSupprimer, telAppareilsSupprimerPersonne, telAppareilsSupprimerAutres, telAppareilsDe,
    smsTentativesNoter, smsTentativesCompter, smsTentativePremiere, smsTentativesRendre,
    smsReserver, smsRegler, smsSommes, smsPremier, smsPaysSur, smsElaguer, smsBouclierPoser, smsBouclierDe, smsBoucliers,
    telPersonneParNumero, telTrouvableLire, telTrouvableMaj, rechercheNoter, rechercheCompter, rechercheRendre,
  };
}

module.exports = { ouvrir, MIGRATIONS, MAX_MEMBRES, DELAI_MODIF_MS, TAILLE_PORTEE, GENRES_SEQ };
