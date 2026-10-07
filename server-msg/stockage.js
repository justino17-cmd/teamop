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
const DEMANDES_MAX = 50;   // demandes de contact qu'une personne voit « en attente » à la fois (relecture du gardien, A2)

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
  /* ── 5 : DE QUI PARLE UNE NOTIFICATION (3 octobre 2026) ──────────────────────────────────────────────────────────────────────────────────
     « Alice vous a ajouté au groupe. » porte le PRÉNOM d'Alice, scellé dans le texte de CELUI QUI REÇOIT. Le jour où Alice efface son compte, ce prénom restait chez les autres — dans leur liste
     de notifications et dans leur export de données (relevé par le gardien, 3 octobre 2026). `auteur` dit QUI est nommé, pour que l'effacement réécrive ces notifications (« Un compte
     supprimé ») ; NULL pour celles d'avant (aucun moyen de savoir de qui elles parlent). Aucune table reconstruite ; pas de clé étrangère (la ligne `personne` d'un compte effacé reste, vide). */
  { v: 5, sql: [
    `ALTER TABLE notification ADD COLUMN auteur TEXT`,
    `CREATE INDEX IF NOT EXISTS notification_auteur ON notification(auteur) WHERE auteur IS NOT NULL`,
    `PRAGMA user_version = 5`,
  ] },
  /* ── 6 : LES ESPACES PROFESSIONNELS ET MESSAGES PRO (3 octobre 2026) ──────────────────────────────────────────────────
     Une entreprise = un ESPACE : un nom, un propriétaire, des membres (administrateur ou membre), des canaux, un abonnement. Quatre tables neuves, AUCUNE table
     existante n'est reconstruite ni modifiée (la migration reste donc REJOUABLE : `IF NOT EXISTS` partout, pas d'`ALTER`) :
       · `espace` : l'identifiant (`e_…`), le nom SCELLÉ (une entreprise nomme ses clients, ses chantiers), le propriétaire (une personne : jamais supprimée, sa ligne reste
         vide — voir `compteEffacer`, qui passe la main avant), la date. Le propriétaire n'est pas une clé étrangère en cascade : supprimer une personne n'emporterait pas un espace ;
       · `espace_membre` : qui est dans quel espace, et son rôle. Une ligne PART quand on quitte ou qu'on est retiré (et l'effacement se note dans `purge`) : l'historique
         des messages, lui, vit dans les conversations ;
       · `canal` : ce qui fait d'une conversation de genre `canal` le canal d'UN espace, et s'il est privé. C'est une table à part et pas une colonne de `conversation` :
         ajouter une colonne n'est pas rejouable, et la colonne `conversation.espace` (écrite à l'étape 1, jamais lue) reste NULLE — une seule source de vérité ;
       · `abonnement` : le dernier état de l'abonnement Stripe d'un espace, TEL QUE STRIPE L'A DIT (jamais un état déduit du corps d'une requête). Aucun numéro de carte, aucune
         adresse : l'identifiant du client et de l'abonnement, le statut, les places, l'échéance. `impaye_depuis` date la PREMIÈRE lecture d'un impayé (le sursis de sept jours
         en part), `relu_le` la dernière lecture réussie. */
  { v: 6, sql: [
    `CREATE TABLE IF NOT EXISTS espace(
       id TEXT PRIMARY KEY,
       nom_ch BLOB NOT NULL,
       proprio TEXT NOT NULL REFERENCES personne(id),
       cree INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS espace_proprio ON espace(proprio)`,
    `CREATE TABLE IF NOT EXISTS espace_membre(
       espace TEXT NOT NULL REFERENCES espace(id) ON DELETE CASCADE,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       role TEXT NOT NULL DEFAULT 'membre' CHECK(role IN ('admin','membre')),
       depuis INTEGER NOT NULL,
       PRIMARY KEY(espace, uid))`,
    `CREATE INDEX IF NOT EXISTS espace_membre_uid ON espace_membre(uid)`,
    `CREATE TABLE IF NOT EXISTS canal(
       conv TEXT PRIMARY KEY REFERENCES conversation(id) ON DELETE CASCADE,
       espace TEXT NOT NULL REFERENCES espace(id) ON DELETE CASCADE,
       prive INTEGER NOT NULL DEFAULT 0,
       cree_par TEXT, cree INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS canal_espace ON canal(espace)`,
    `CREATE TABLE IF NOT EXISTS abonnement(
       espace TEXT PRIMARY KEY REFERENCES espace(id) ON DELETE CASCADE,
       client TEXT, abonnement TEXT,
       session TEXT, session_le INTEGER,
       statut TEXT NOT NULL DEFAULT 'aucun',
       places INTEGER NOT NULL DEFAULT 0,
       fin_periode INTEGER, annule INTEGER NOT NULL DEFAULT 0,
       impaye_depuis INTEGER, relu_le INTEGER,
       cree INTEGER NOT NULL)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS abonnement_stripe ON abonnement(abonnement) WHERE abonnement IS NOT NULL`,
    `PRAGMA user_version = 6`,
  ] },
  /* ── 7 : LES RÉUNIONS PROGRAMMÉES (3 octobre 2026) ───────────────────────────────────────────────────────────────────────────────────────────────
     Cinq tables neuves, AUCUNE table existante modifiée (la migration reste REJOUABLE : `IF NOT EXISTS` partout, pas d'`ALTER`) :
       · `reunion` : une réunion = UNE ligne, série comprise (la première occurrence, la répétition, sa fin). Le titre et le lieu sont SCELLÉS (une entreprise nomme ses clients et ses chantiers).
         `conv` est sa conversation (genre `reunion` : la MÊME mécanique que les groupes — flux, accusés, pièces, purge —, pas une seconde messagerie) ; `ON DELETE CASCADE` : la réunion part
         avec sa conversation. `hote` n'est pas une cascade : un hôte dont le compte s'efface passe la main (`reunionsQuitterTout`) ou emporte la réunion. `fin_serie` est le moment où plus AUCUNE occurrence ne court (NULL : une série « Jamais ») — posée à la création et à chaque changement d'horaire par `calendrier.finDeSerie` : l'agenda
         d'une personne écarte EN SQL les séries terminées, sans quoi six cents séries d'il y a vingt-six ans en occuperaient toutes les places ; `horaire_le` date la dernière
         modification de l'HORAIRE (un rappel dont l'échéance précède ce moment n'a jamais été dû pour cet horaire). `prochain` est le début de la prochaine occurrence non commencée — l'index
         du planificateur : il ne regarde que les réunions qui commencent dans la journée qui vient, jamais toutes les séries à chaque passage ;
       · `reunion_invite` : qui est invité, et sa réponse (en attente, accepte, décline, peut-être). L'HÔTE y a sa ligne (toujours « accepte ») : ses rappels et la liste « mes réunions » se
         lisent comme ceux d'un invité. `rappels` (JSON) est le choix de la personne ; NULL = le réglage de la réunion ;
       · `rappel` : le REGISTRE des rappels déjà envoyés (réunion, début de l'occurrence, personne, minutes avant) — la clé primaire est ce qui fait qu'un rappel ne part qu'UNE fois ;
       · `planif_bail` : le BAIL du planificateur (une ligne) : une seule instance envoie les rappels, même après un arrêt brutal (le bail expire) ;
       · `courrier_envoi` : une ligne par courriel d'invitation envoyé (qui l'a envoyé, l'EMPREINTE du destinataire — jamais son adresse —, quand) : les plafonds « dix par jour par compte, deux
         par semaine par destinataire » sont DURABLES, un redémarrage ne les remet pas à zéro. */
  { v: 7, sql: [
    `CREATE TABLE IF NOT EXISTS reunion(
       id TEXT PRIMARY KEY,
       conv TEXT NOT NULL UNIQUE REFERENCES conversation(id) ON DELETE CASCADE,
       hote TEXT NOT NULL REFERENCES personne(id),
       titre_ch BLOB NOT NULL, lieu_ch BLOB,
       debut INTEGER NOT NULL, fin INTEGER NOT NULL,
       tz TEXT NOT NULL,
       rep TEXT NOT NULL DEFAULT 'aucune' CHECK(rep IN ('aucune','quotidienne','hebdomadaire','mensuelle')),
       n INTEGER, jusqua TEXT,
       fin_serie INTEGER,
       rappels TEXT NOT NULL DEFAULT '[]',
       annulee INTEGER NOT NULL DEFAULT 0,
       version INTEGER NOT NULL DEFAULT 0,
       horaire_le INTEGER NOT NULL,
       prochain INTEGER,
       cree INTEGER NOT NULL, maj INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS reunion_hote ON reunion(hote)`,
    `CREATE INDEX IF NOT EXISTS reunion_prochain ON reunion(prochain) WHERE prochain IS NOT NULL AND annulee = 0`,
    `CREATE TABLE IF NOT EXISTS reunion_invite(
       reunion TEXT NOT NULL REFERENCES reunion(id) ON DELETE CASCADE,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       statut TEXT NOT NULL DEFAULT 'attente' CHECK(statut IN ('attente','accepte','decline','peutetre')),
       rappels TEXT, rappels_le INTEGER,
       invite_par TEXT,
       cree INTEGER NOT NULL, repondu INTEGER,
       PRIMARY KEY(reunion, uid))`,
    `CREATE INDEX IF NOT EXISTS reunion_invite_uid ON reunion_invite(uid)`,
    `CREATE TABLE IF NOT EXISTS rappel(
       reunion TEXT NOT NULL REFERENCES reunion(id) ON DELETE CASCADE,
       occurrence INTEGER NOT NULL,
       uid TEXT NOT NULL,
       avant INTEGER NOT NULL,
       ts INTEGER NOT NULL,
       PRIMARY KEY(reunion, occurrence, uid, avant))`,
    `CREATE INDEX IF NOT EXISTS rappel_occurrence ON rappel(occurrence)`,
    `CREATE TABLE IF NOT EXISTS planif_bail(
       id INTEGER PRIMARY KEY CHECK(id = 1),
       proprietaire TEXT NOT NULL, pris INTEGER NOT NULL, expire INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS courrier_envoi(
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       uid TEXT NOT NULL, dest_h TEXT NOT NULL, ts INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS courrier_envoi_uid ON courrier_envoi(uid, ts)`,
    `CREATE INDEX IF NOT EXISTS courrier_envoi_dest ON courrier_envoi(dest_h, ts)`,
    `PRAGMA user_version = 7`,
  ] },
  /* ── 8 : LES APPELS À DEUX, AUDIO ET VIDÉO (étape 7) ─────────────────────────────────────────────────────────────────────────────────────────────
     Deux tables neuves, AUCUNE table existante modifiée ni reconstruite (la migration reste REJOUABLE : `IF NOT EXISTS` partout, pas d'`ALTER`) — le code d'AVANT les appels ouvre donc sans mot dire une
     base au schéma 8 si un déploiement se replie (`deployer.sh` revient en arrière) ; ce qu'il ne sait pas faire (effacer l'historique d'un compte supprimé) est refait au démarrage du code neuf
     (`appelsReparer`, comme `reunionsReparer`) :
       · `appel` : UNE ligne par appel — son type (`audio` ou `video` : ce que la personne a demandé ; la caméra s'allume et s'éteint ensuite sans rien changer ici), son ÉTAT, l'instant où il a commencé
         à sonner (`cree`), l'échéance de la sonnerie (`sonne_jusqua` : au-delà, sans réponse, il est « manqué »), l'instant de la réponse (`repondu`) et de la fin (`fin`), et le MOTIF d'une fin qui n'est pas
         un raccrochage ordinaire (`perdu` : plus aucun signe d'un appareil ; `compte` : un compte effacé ; `bloque` ; `restauration`). États : `sonne` → `en_cours` → `fini` ; `sonne` → `manque` (45 s
         sans réponse), `refuse` (l'appelé), `annule` (l'appelant raccroche avant) ; `occupe` (l'appelé était déjà dans un appel : la ligne est écrite, l'appelé la lit « Manqué »). Aucun média, aucun SDP, aucune
         adresse réseau n'est JAMAIS rangé : le service relaie des signaux qu'il ne lit pas (`appels.js`) ;
       · `appel_part` : qui participe, et son rôle (`appelant`, `appele`) — la forme que prendra l'appel de groupe (étape 8). `session` est l'empreinte de la SESSION LIÉE à l'appel : celle qui l'a lancé,
         ou celle de l'appareil qui a répondu (le premier prend l'appel, les autres cessent de sonner). C'est la seule qui reçoit les signaux (SDP et candidats d'adresses) et qui peut raccrocher une fois
         l'appel en cours ; NULL tant que personne n'a répondu pour l'appelé. La ligne d'un compte effacé part (l'autre garde l'appel, sans nom), et l'appel part avec sa dernière ligne. */
  { v: 8, sql: [
    `CREATE TABLE IF NOT EXISTS appel(
       id TEXT PRIMARY KEY,
       type TEXT NOT NULL CHECK(type IN ('audio','video')),
       etat TEXT NOT NULL CHECK(etat IN ('sonne','en_cours','fini','manque','refuse','annule','occupe')),
       cree INTEGER NOT NULL,
       sonne_jusqua INTEGER NOT NULL,
       repondu INTEGER,
       fin INTEGER,
       motif TEXT)`,
    `CREATE INDEX IF NOT EXISTS appel_actif ON appel(etat) WHERE etat IN ('sonne','en_cours')`,
    `CREATE INDEX IF NOT EXISTS appel_cree ON appel(cree)`,
    `CREATE TABLE IF NOT EXISTS appel_part(
       appel TEXT NOT NULL REFERENCES appel(id) ON DELETE CASCADE,
       uid TEXT NOT NULL REFERENCES personne(id),
       role TEXT NOT NULL CHECK(role IN ('appelant','appele')),
       session TEXT,
       PRIMARY KEY(appel, uid))`,
    `CREATE INDEX IF NOT EXISTS appel_part_uid ON appel_part(uid)`,
    `PRAGMA user_version = 8`,
  ] },
  /* ── 9 : LES APPELS À PLUSIEURS ET LES SALLES DE RÉUNION EN MAILLE (étape 8) ───────────────────────────────────────────────────────────────────────
     AUCUNE table neuve, AUCUNE colonne retirée ni reconstruite : des colonnes AJOUTÉES (avec une valeur par défaut) aux trois tables qui existent déjà — le code d'AVANT (les appels à deux, en service sur la
     bêta) ouvre donc sans mot dire une base au schéma 9 si un déploiement se replie : il ne lit pas ces colonnes, et les lignes d'avant gardent la valeur qui les laisse ce qu'elles étaient (`genre` « deux »).
     Ce que le code d'avant ne sait pas faire sur une salle (la tenir : admettre, exclure, sortir quelqu'un qui part) se termine tout seul : sans pouls d'un appareil lié pendant 45 s il finit l'appel « connexion
     perdue » — un retour en arrière coupe les salles en cours, il n'en ressuscite ni n'en corrompt aucune.
       · `appel` — `genre` : « deux » (l'appel de l'étape 7, inchangé), « groupe » (lancé depuis un groupe ou des personnes choisies) ou « reunion » (la SALLE d'une réunion programmée) ; `conv` : la conversation
         du groupe ou de la réunion ; `reunion` : la réunion dont c'est la salle ; `capacite` : le nombre de personnes DANS la salle, posé à la création (quatre en vidéo, six en audio : ce que la maille tient) ;
         `verrou` : la salle est verrouillée (personne n'entre, hors l'hôte et les co-hôtes) ; `attente` : la salle d'attente est demandée (on y attend d'être admis) ; `partage_ok` : les participants peuvent
         partager leur écran (réglage que les PAGES honorent : le serveur ne voit pas un média) ; `rec_par` : la personne qui ENREGISTRE en local — le bandeau « REC » s'allume chez tous tant qu'elle y est ;
       · `appel_part` — `statut` : invite (la sonnerie court), attente (à la porte de la salle), present, parti (sorti, il peut revenir), refuse, manque, exclu (ne revient pas) ; `grade` : 0 participant,
         1 co-hôte, 2 hôte ; `entre` : l'instant de la dernière entrée ; `gen` : +1 à chaque entrée — une liaison pair à pair se refait quand la génération de l'autre change ;
       · `reunion` — `attente` : la salle d'attente demandée à la programmation ; `code_h`, `code_ch`, `code_le` : le lien d'invité (l'empreinte du code sert à le retrouver, le code scellé à le redire à
         l'hôte seul ; renouveler le lien en pose un autre et NOTE l'ancien dans le registre des purges — une archive d'avant ne le ramène pas). */
  { v: 9, sql: [
    `ALTER TABLE appel ADD COLUMN genre TEXT NOT NULL DEFAULT 'deux'`,
    `ALTER TABLE appel ADD COLUMN conv TEXT`,
    `ALTER TABLE appel ADD COLUMN reunion TEXT`,
    `ALTER TABLE appel ADD COLUMN capacite INTEGER`,
    `ALTER TABLE appel ADD COLUMN verrou INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE appel ADD COLUMN attente INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE appel ADD COLUMN partage_ok INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE appel ADD COLUMN rec_par TEXT`,
    `ALTER TABLE appel_part ADD COLUMN statut TEXT NOT NULL DEFAULT 'present'`,
    `ALTER TABLE appel_part ADD COLUMN grade INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE appel_part ADD COLUMN entre INTEGER`,
    `ALTER TABLE appel_part ADD COLUMN gen INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE reunion ADD COLUMN attente INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE reunion ADD COLUMN code_h TEXT`,
    `ALTER TABLE reunion ADD COLUMN code_ch BLOB`,
    `ALTER TABLE reunion ADD COLUMN code_le INTEGER`,
    `CREATE UNIQUE INDEX IF NOT EXISTS reunion_code ON reunion(code_h) WHERE code_h IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS appel_salle ON appel(genre, etat) WHERE genre <> 'deux'`,
    `CREATE INDEX IF NOT EXISTS appel_reunion ON appel(reunion) WHERE reunion IS NOT NULL`,
    `PRAGMA user_version = 9`,
  ] },
  /* ── 10 : PERSO+ — L'ABONNEMENT D'UNE PERSONNE (4 octobre 2026) ──────────────────────────────────────────────────────────────────────────────────
     Décision de Justin : les réunions se vendent à une PERSONNE, sans espace d'entreprise, 5 € par mois. Deux tables NEUVES, AUCUNE table existante modifiée ni reconstruite (la migration reste REJOUABLE :
     `IF NOT EXISTS` partout, pas d'`ALTER`) — le code d'AVANT ouvre donc sans mot dire une base au schéma 10 si un déploiement se replie : il ne lit pas ces tables, et personne n'y paie rien de plus que ce
     que Stripe prélève ; un compte qui s'efface pendant le repli laisse son abonnement vivant (le code neuf le retrouve et l'annule : voir `abonnement_a_annuler`).
       · `abonnement_perso` : le dernier état de l'abonnement Stripe d'UNE PERSONNE, TEL QUE STRIPE L'A DIT (jamais ce qu'une requête prétend). Même forme que `abonnement` (celui d'un espace), sans les places
         (un seul siège) ni le sursis (un impayé personnel ne garde pas l'organisation). Le propriétaire est la personne : pas de cascade (la ligne `personne` d'un compte effacé reste, vide) ;
       · `abonnement_a_annuler` : ce que le service doit FAIRE FAIRE à l'abonnement Perso+ d'une personne qui s'en va — UNE ligne par abonnement chez Stripe, `voulu` dit ce que Stripe doit devenir :
         `fin` (la personne a DEMANDÉ la suppression de son compte : l'abonnement cesse de se renouveler, il court jusqu'à la fin de la période payée), `renouveler` (elle a ANNULÉ sa demande : le
         renouvellement revient, sauf si elle l'avait elle-même arrêté avant) et `resilier` (le compte est EFFACÉ : résiliation immédiate, terminale). `avant` garde l'état du renouvellement AVANT notre geste
         (1 : arrêté, 0 : il se renouvelait) et `touche` dit si NOUS y avons touché — c'est ce qui interdit de réactiver ce qu'une personne a coupé elle-même ; `fait` dit que Stripe a confirmé l'état voulu
         (une ligne `fin` faite RESTE : c'est elle qui saura, si la personne revient, que le renouvellement est à rétablir). Sans cette table, un échec de Stripe laisserait la carte prélevée pendant les
         quatorze jours — ou pour toujours, pour un compte effacé : le geste de la personne se NOTE dans la même transaction que lui, et se REJOUE jusqu'à la confirmation (`essais`, `dernier`).
         Aucun nom, aucune adresse : l'identifiant de l'abonnement et du client chez Stripe, rien d'autre. */
  { v: 10, sql: [
    `CREATE TABLE IF NOT EXISTS abonnement_perso(
       personne TEXT PRIMARY KEY REFERENCES personne(id),
       client TEXT, abonnement TEXT,
       session TEXT, session_le INTEGER,
       statut TEXT NOT NULL DEFAULT 'aucun',
       fin_periode INTEGER, annule INTEGER NOT NULL DEFAULT 0,
       relu_le INTEGER,
       cree INTEGER NOT NULL)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS abonnement_perso_stripe ON abonnement_perso(abonnement) WHERE abonnement IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS abonnement_a_annuler(
       abonnement TEXT PRIMARY KEY,
       client TEXT,
       voulu TEXT NOT NULL DEFAULT 'resilier' CHECK (voulu IN ('fin', 'renouveler', 'resilier')),
       avant INTEGER, touche INTEGER NOT NULL DEFAULT 0, fait INTEGER NOT NULL DEFAULT 0,
       demande INTEGER NOT NULL, essais INTEGER NOT NULL DEFAULT 0, dernier INTEGER)`,
    `PRAGMA user_version = 10`,
  ] },
  /* ── 11 : l'IDENTIFIANT PUBLIC « Prénom#1234 » et les DEMANDES de contact (Justin, 5 octobre 2026 : « que l'on puisse ajouter des personnes qui ont déjà
         l'application… un petit système avec un hashtag » ; puis « Nom#1234 exact » et « demande à accepter »).
         `ident_base` est le prénom NORMALISÉ (minuscules, sans accent, [a-z0-9] seulement, « op » s'il ne reste rien) et `ident_num` quatre chiffres : le couple est UNIQUE. On ne
         retrouve quelqu'un que par l'identifiant EXACT — jamais par un nom seul : ce n'est pas un annuaire (SERVEUR.md § 2.5).
         `demande_contact` : (de → vers). `attente` tant que `vers` n'a pas répondu ; `refusee` reste en base pour que l'auteur ne puisse pas redemander en boucle (il voit
         toujours « en attente » : un refus ne se DIT pas) ; `masque` : l'auteur l'a retirée (elle disparaît alors AUSSI chez le destinataire, mais la ligne reste : redemander
         ne relance personne). `vers_prenom`, `vers_ident` : ce que l'auteur savait au moment de demander (le prénom, l'identifiant) — FIGÉS : qui refuse, se cache ou change de
         prénom n'est pas suivi par celui qui l'a demandé (relecture du gardien, A5). Une demande ACCEPTÉE n'existe plus : elle est devenue un contact. ── */
  { v: 11, sql: [
    `ALTER TABLE personne ADD COLUMN ident_base TEXT`,
    `ALTER TABLE personne ADD COLUMN ident_num INTEGER`,
    `CREATE UNIQUE INDEX IF NOT EXISTS personne_ident ON personne(ident_base, ident_num) WHERE ident_num IS NOT NULL`,
    `CREATE TABLE IF NOT EXISTS demande_contact(
       de TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       vers TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       etat TEXT NOT NULL DEFAULT 'attente' CHECK (etat IN ('attente', 'refusee')),
       masque INTEGER NOT NULL DEFAULT 0,
       vers_prenom TEXT NOT NULL DEFAULT '', vers_ident TEXT,
       ts INTEGER NOT NULL,
       PRIMARY KEY(de, vers))`,
    `CREATE INDEX IF NOT EXISTS demande_contact_vers ON demande_contact(vers, etat)`,
    `PRAGMA user_version = 11`,
  ] },
  /* ── 12 : le compte par ADRESSE E-MAIL, « comme Discord » (Justin, 6 octobre 2026 : le numéro de téléphone devient FACULTATIF). Le mot de passe vit déjà dans `personne`
         (`sel`, `mdp`, `params` : prévus dès la migration 1) ; l'adresse aussi (`email_h`, `email_ch` scellé, identifiant `mel:<adresse en minuscules>`). Il manquait le CODE à six chiffres
         envoyé par courriel : `code_mel`, une ligne par (adresse, but) — `inscription` porte, SCELLÉ, ce que la personne a saisi (prénom, nom, mot de passe DÉJÀ haché) jusqu'à la
         confirmation ; `reinit` ne porte rien. Le code n'est jamais en clair (`code_h`, une empreinte liée à l'adresse), il est lié à l'APPAREIL qui l'a demandé (`ap_h`, comme `code_tel`)
         et il vit quinze minutes. ── */
  { v: 12, sql: [
    `CREATE TABLE IF NOT EXISTS code_mel(
       adr_h TEXT NOT NULL,
       but TEXT NOT NULL CHECK (but IN ('inscription', 'reinit')),
       code_h TEXT NOT NULL,
       donnees BLOB,
       cree INTEGER NOT NULL, exp INTEGER NOT NULL,
       essais INTEGER NOT NULL DEFAULT 0,
       ap_h TEXT NOT NULL,
       PRIMARY KEY(adr_h, but, ap_h))`,
    /* la date du mot de passe : un changement se REJOUE après une restauration (registre `purge`, genre `mdp`) — une copie d'avant ne ramène pas le mot de passe qu'un intrus connaissait */
    `ALTER TABLE personne ADD COLUMN mdp_le INTEGER`,
    /* les appareils qui ont DÉJÀ prouvé le mot de passe d'un compte (relecture du gardien, C3) : le plafond d'essais par adresse ne vise que les AUTRES — un inconnu qui se trompe deux cents
       fois ne ferme pas la porte au propriétaire sur son propre appareil ; une connexion depuis un appareil inconnu prévient les autres (« Nouvel appareil connecté »). L'empreinte du jeton, jamais le jeton. */
    `CREATE TABLE IF NOT EXISTS appareil_mel(
       h TEXT NOT NULL, personne TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE, vu INTEGER NOT NULL,
       PRIMARY KEY(h, personne))`,
    `PRAGMA user_version = 12`,
  ] },
  /* ── 13 : l'AGENDA PERSONNEL (6 octobre 2026, le chantier qui prépare l'agent « Pro Assistant »). Un événement est à UNE personne : titre, lieu et note SCELLÉS (comme une réunion),
         l'horaire en instants UTC et son fuseau, `journee` pour une journée entière. `rappel` : les minutes avant (null : aucun) ; `rappel_a` : l'instant où il est DÛ, effacé quand il part
         (dans la même transaction que la notification) — un index partiel ne garde que ceux qui restent à envoyer. ── */
  { v: 13, sql: [
    `CREATE TABLE IF NOT EXISTS evenement(
       id TEXT PRIMARY KEY,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       titre_ch BLOB NOT NULL, lieu_ch BLOB, note_ch BLOB,
       debut INTEGER NOT NULL, fin INTEGER NOT NULL, journee INTEGER NOT NULL DEFAULT 0, tz TEXT NOT NULL,
       rappel INTEGER, rappel_a INTEGER,
       cree INTEGER NOT NULL, maj INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS evenement_uid ON evenement(uid, debut)`,
    `CREATE INDEX IF NOT EXISTS evenement_rappel ON evenement(rappel_a) WHERE rappel_a IS NOT NULL`,
    `PRAGMA user_version = 13`,
  ] },
  /* ── 14 : les FAVORIS de l'onglet Contacts (7 octobre 2026, « les catégories Contacts qui manquent »). Un favori est un point de vue, comme la ligne `contact` elle-même : il vit sur
         MA ligne (de = moi), et part avec elle quand le contact est retiré — on ne garde pas un favori orphelin qui renaîtrait au prochain ajout. ── */
  { v: 14, sql: [
    `ALTER TABLE contact ADD COLUMN favori INTEGER NOT NULL DEFAULT 0`,
    `PRAGMA user_version = 14`,
  ] },
  /* ── 15 (7 octobre 2026) : LE SUIVI D'UN DOCUMENT — qui l'a ouvert ou téléchargé, et quand (« savoir qui a reçu, qui a téléchargé le document : très important pour les patrons »).
     Une ligne par pièce ET par personne qui l'a lue (pas son auteur) : la première fois, la dernière, combien de fois (une par minute au plus). Elle part avec la pièce (CASCADE) et avec
     le COMPTE (`compteEffacer` : la ligne `personne` est anonymisée, pas supprimée — le CASCADE ne joue pas, l'effacement est écrit). Seul l'auteur de la pièce la lit (`pieceSuivi`), et
     seulement pour les gens qui voient le message ; la page d'un fichier reçu dit que son expéditeur voit le téléchargement. ── */
  { v: 15, sql: [
    `CREATE TABLE IF NOT EXISTS piece_acces(
       piece TEXT NOT NULL REFERENCES piece(id) ON DELETE CASCADE,
       uid TEXT NOT NULL REFERENCES personne(id) ON DELETE CASCADE,
       premier INTEGER NOT NULL, dernier INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 1,
       PRIMARY KEY(piece, uid))`,
    `CREATE INDEX IF NOT EXISTS piece_acces_uid ON piece_acces(uid)`,
    `PRAGMA user_version = 15`,
  ] },
];

const erreur = (code) => Object.assign(new Error(code), { code });
/* L'identifiant public : une normalisation, la même pour l'attribuer et pour le retrouver. Il ne prend que le PREMIER MOT du prénom : un compte bêta range son nom complet dans
   le prénom (« Alice Martin »), et l'identifiant ne doit pas porter un nom de famille (la sonde l'a vu : « AliceMartin#6439 »). « Marie Claire » → « Marie », « Jean-Pierre » reste
   entier. Taper « Alice Martin#6439 » retrouve aussi « Alice#6439 » : c'est le même premier mot. */
const premierMot = (p) => String(p || '').trim().split(/\s+/)[0] || '';
/* ⛔ TOUTES LES ÉCRITURES gardent leurs lettres : « Ахмед », « 李明 », « محمد » ont chacun leur base. Ne garder que [a-z0-9] les rangeait TOUS sous « op », et « #3321 » seul
   retrouvait n'importe lequel d'entre eux : une seule base à balayer pour toute une population (relecture du gardien, A4). Les accents tombent (« é » → « e »), la casse aussi. */
function identBase(prenom) {
  const b = Array.from(premierMot(prenom).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 24).join('');
  return b || 'op';
}
const identAfficher = (prenom, n) => (Array.from(premierMot(prenom).replace(/#+/g, '')).slice(0, 24).join('') || 'OP') + '#' + n;
/* « Hélène#4821 », « helene #4821 », « HÉLÈNE#4821 » → { base: 'helene', num: 4821 } ; tout le reste → null (un nom seul n'est pas un identifiant).
   Quatre chiffres (1000 à 9999) ; CINQ (10000 à 99999) pour un prénom dont les 9 000 numéros à quatre chiffres sont pris — un prénom courant ne bloque pas une inscription. */
function identLire(texte) {
  if (typeof texte !== 'string' || texte.length > 80) return null;
  const m = /^(.*)#\s*(\d{4,5})$/.exec(texte.trim());
  if (!m) return null;
  const n = Number(m[2]);
  return n >= 1000 && n <= 99999 && String(n) === m[2] ? { base: identBase(m[1]), num: n } : null;
}
/* un abonnement personnel FINI chez Stripe (ou jamais commencé) : on ne l'arrête, ne le rétablit ni ne le résilie plus */
const ABO_FINIS = ['canceled', 'incomplete_expired', 'aucun'];

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
      for (const s of m.sql) {
        /* ⛔ REJOUABLE : SQLite n'a pas de `ADD COLUMN IF NOT EXISTS`. Une migration rejouée sur une base qui a déjà sa colonne (le compteur remis à zéro à la main, une restauration) ne doit pas échouer
           sur « duplicate column name » — et SEULEMENT sur celle-là : toute autre erreur, y compris d'un `ALTER` sur une table absente, arrête la migration. */
        try { X(s); }
        catch (e) { if (!(/^\s*ALTER TABLE \w+ ADD COLUMN /i.test(s) && /duplicate column name/i.test(String(e && e.message)))) throw e; }
      }
      if (m.sansFk === true && Q('PRAGMA foreign_key_check').all().length > 0) throw erreur('migration_orphelins');
      X('COMMIT');
    } catch (e) { try { X('ROLLBACK'); } catch (e2) {} if (m.sansFk === true) X('PRAGMA foreign_keys=ON'); throw e; }
    if (m.sansFk === true) X('PRAGMA foreign_keys=ON');
  }

  /* ⛔ L'IDENTIFIANT PUBLIC n'existe qu'à partir du schéma 11 : une base ouverte avec des migrations plus anciennes (les bancs qui rejouent une migration d'avant, une copie
     restaurée) n'a pas ses colonnes, et chaque lecture d'une personne y planterait. Le schéma ne change plus après ce point : on le lit une fois. */
  const IDENT = versionActuelle() >= 11;
  /* le favori de l'onglet Contacts (migration 14) : une base ouverte à un schéma plus ancien (un banc de migration) n'a pas la colonne — on ne la lit pas, et poser un favori n'y fait rien */
  const FAVORI = versionActuelle() >= 14;
  const SUIVI = versionActuelle() >= 15;          // une base d'avant la migration 15 (bancs de migration) : rien n'est noté, le suivi dit « indisponible »

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
    identifiant: r.ident_num == null ? null : identAfficher(r.prenom, num(r.ident_num)),
  });
  function personneParIdentifiant(identifiant) {
    const h = scelleur.hmac('personne', 'email_h', identifiant);
    return personneRang(IDENT ? Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree, ident_num FROM personne WHERE email_h = ?').get(h)
      : Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree FROM personne WHERE email_h = ?').get(h));
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
      try { identAttribuer(id); } catch (e) { if (!e || e.code !== 'identifiant_plein') throw e; }   // un prénom saturé n'empêche pas de s'inscrire : sans identifiant, on reste joignable par numéro et par lien
      return personneParId(id);
    });
  }
  function personneParId(id) {
    return personneRang(IDENT ? Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree, ident_num FROM personne WHERE id = ?').get(id)
      : Q('SELECT id, prenom, nom, statut, langue, tz, avatar_piece, prefs, origine, verifie_le, etat, cree FROM personne WHERE id = ?').get(id));
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
    tx(() => {
      Q('UPDATE personne SET prenom = ?, nom = ?, statut = ?, langue = ?, tz = ?, prefs = ? WHERE id = ?')
        .run(n.prenom, n.nom, n.statut, n.langue, n.tz, n.prefs, id);
      if (n.prenom !== cur.prenom) { try { identAttribuer(id); } catch (e) { if (!e || e.code !== 'identifiant_plein') throw e; } }   // l'identifiant SUIT le prénom : « Camille#4821 » renommée « Cam » devient « Cam#4821 » (ou un autre numéro s'il est pris)
    });
    return personneParId(id);
  }

  /* ══ L'IDENTIFIANT PUBLIC « Prénom#1234 » ════════════════════════════════════════════════
     Le prénom normalisé + quatre chiffres tirés au hasard (1000 à 9999 ; cinq quand les quatre sont tous pris pour ce prénom). On le montre avec le prénom tel qu'il est écrit (« Hélène#4821 ») et on le RETROUVE sous
     toutes ses écritures (« helene#4821 », « Hélène #4821 ») : c'est la même normalisation des deux côtés. Un prénom sans lettre latine (« Ахмед ») se range sous « op » :
     son identifiant s'affiche « Ахмед#4821 » et se retrouve tel quel. Un numéro déjà pris pour ce prénom en donne un autre ; un compte qui change de prénom GARDE son numéro
     s'il est libre sous le nouveau prénom. Un prénom sans lettre ni chiffre se range sous « op ». */
  function identAttribuer(id) {
    if (!IDENT) return null;
    return tx(() => {
      const r = Q('SELECT prenom, ident_base, ident_num, etat FROM personne WHERE id = ?').get(id);
      if (!r || r.etat !== 'actif') return null;
      const base = identBase(r.prenom), libre = (n) => !Q('SELECT 1 AS x FROM personne WHERE ident_base = ? AND ident_num = ? AND id <> ?').get(base, n, id);
      if (r.ident_base === base && r.ident_num != null) return r.ident_num;
      let n = r.ident_num != null && libre(r.ident_num) ? r.ident_num : null;
      for (let i = 0; n === null && i < 40; i++) { const c = crypto.randomInt(1000, 10000); if (libre(c)) n = c; }
      /* le hasard a échoué quarante fois : le prénom est très demandé. Le premier libre à quatre chiffres, sinon cinq chiffres (au hasard, puis le premier libre) */
      const pris = n === null ? new Set(Q('SELECT ident_num FROM personne WHERE ident_base = ? AND ident_num IS NOT NULL').all(base).map(x => num(x.ident_num))) : null;
      for (let c = 1000; n === null && c < 10000; c++) if (!pris.has(c)) n = c;
      for (let i = 0; n === null && i < 40; i++) { const c = crypto.randomInt(10000, 100000); if (!pris.has(c)) n = c; }
      for (let c = 10000; n === null && c < 100000; c++) if (!pris.has(c)) n = c;
      if (n === null) throw erreur('identifiant_plein');   // 99 000 personnes au même prénom normalisé : on le dit plutôt que de tourner en rond
      Q('UPDATE personne SET ident_base = ?, ident_num = ? WHERE id = ?').run(base, n, id);
      return n;
    });
  }
  /* La personne derrière un identifiant EXACT (`{base, num}` rendu par `identLire`) — ou null. Les champs nécessaires au verdict de visibilité seulement. */
  function personneParIdent(base, n) {
    const r = Q('SELECT id, prenom, etat, trouvable, suppression_le FROM personne WHERE ident_base = ? AND ident_num = ?').get(base, n);
    return r ? { id: r.id, prenom: r.prenom, etat: r.etat, trouvable: r.trouvable, suppression_le: r.suppression_le === null ? null : num(r.suppression_le) } : null;
  }
  function identDe(id) { if (!IDENT) return null; const r = Q('SELECT prenom, ident_num FROM personne WHERE id = ?').get(id); return r && r.ident_num != null ? identAfficher(r.prenom, num(r.ident_num)) : null; }
  /* Les comptes d'avant la migration 11 reçoivent le leur au démarrage (rejouable : seuls ceux qui n'en ont pas). ⛔ Un prénom saturé (`identifiant_plein`) laisse CETTE
     personne sans identifiant, il n'empêche pas le service de démarrer. */
  function identCompleter() {
    let n = 0;
    for (const r of Q(`SELECT id FROM personne WHERE ident_num IS NULL AND etat = 'actif'`).all()) {
      try { if (identAttribuer(r.id) !== null) n++; } catch (e) { if (!e || e.code !== 'identifiant_plein') throw e; }
    }
    return n;
  }

  /* ══ LES DEMANDES DE CONTACT ═════════════════════════════════════════════════════════════
     Trouver quelqu'un par son identifiant ne crée PAS de contact : ça crée une demande, que la personne accepte ou refuse. Tant qu'elle n'a pas accepté, l'auteur ne voit ni
     sa présence ni son statut (rien n'est partagé : `peutVoir` lit les contacts). Deux demandes croisées valent un accord.
     ⛔ CE QUE L'AUTEUR PEUT APPRENDRE NE DÉPEND JAMAIS DE LA RÉPONSE DE L'AUTRE (relecture du gardien, A1-A2) : une demande refusée et une demande en attente se comportent à
     l'identique de son côté — retirer, redemander, plafond. Une ligne déjà là ne relance personne (`neuve: false`) : demander/retirer en boucle n'envoie qu'UNE notification.
     → { resultat: 'deja' | 'envoyee' | 'deja_envoyee' | 'acceptee', neuve } ; `demandes_plafond` au-delà de DEMANDES_MAX demandes que l'auteur voit en attente. */
  function demandeCreer(de, vers) {
    return tx(() => {
      if (contactActif(de, vers)) return { resultat: 'deja', neuve: false };
      const inverse = Q('SELECT etat, masque FROM demande_contact WHERE de = ? AND vers = ?').get(vers, de);
      if (inverse && inverse.masque === 0) {   // l'autre m'a demandé (et ne l'a pas retiré) : c'est un accord des deux côtés — même si je l'avais refusé, il le voit toujours « en attente »
        contactLier(de, vers);
        Q('DELETE FROM demande_contact WHERE (de = ? AND vers = ?) OR (de = ? AND vers = ?)').run(de, vers, vers, de);
        return { resultat: 'acceptee', neuve: true };
      }
      const deja = Q('SELECT masque FROM demande_contact WHERE de = ? AND vers = ?').get(de, vers);
      if (deja) {
        if (deja.masque === 0) return { resultat: 'deja_envoyee', neuve: false };
        if (num(Q('SELECT COUNT(*) AS n FROM demande_contact WHERE de = ? AND masque = 0').get(de).n) >= DEMANDES_MAX) throw erreur('demandes_plafond');
        Q('UPDATE demande_contact SET masque = 0 WHERE de = ? AND vers = ?').run(de, vers);   // retirée puis redemandée : de nouveau visible, sans nouvelle notification
        return { resultat: 'envoyee', neuve: false };
      }
      if (num(Q('SELECT COUNT(*) AS n FROM demande_contact WHERE de = ? AND masque = 0').get(de).n) >= DEMANDES_MAX) throw erreur('demandes_plafond');
      const p = Q('SELECT prenom, ident_num FROM personne WHERE id = ?').get(vers);
      Q('INSERT INTO demande_contact(de, vers, etat, masque, vers_prenom, vers_ident, ts) VALUES(?, ?, ?, 0, ?, ?, ?)')
        .run(de, vers, 'attente', premierMot(p && p.prenom), p && p.ident_num != null ? identAfficher(p.prenom, num(p.ident_num)) : null, horloge());
      return { resultat: 'envoyee', neuve: true };
    });
  }
  /* Ce que `uid` a reçu et attend de trancher : la personne qui demande (prénom, nom, identifiant) — jamais une demande retirée, ni quelqu'un qu'on a bloqué, ni un compte qui va disparaître. */
  function demandesRecues(uid) {
    return Q(`SELECT d.de AS id, d.ts, p.prenom, p.nom, p.ident_num FROM demande_contact d JOIN personne p ON p.id = d.de
              WHERE d.vers = ? AND d.etat = 'attente' AND d.masque = 0 AND p.etat = 'actif' AND p.suppression_le IS NULL
                AND NOT EXISTS (SELECT 1 FROM contact c WHERE c.etat = 'bloque' AND ((c.de = d.vers AND c.vers = d.de) OR (c.de = d.de AND c.vers = d.vers)))
              ORDER BY d.ts DESC, d.de LIMIT 200`).all(uid)
      .map(r => ({ id: r.id, prenom: r.prenom, nom: r.nom, identifiant: r.ident_num == null ? null : identAfficher(r.prenom, num(r.ident_num)), ts: num(r.ts) }));
  }
  /* Ce que `uid` a envoyé : toujours « en attente » à ses yeux, refusée comprise (un refus ne se dit pas), avec ce qu'il savait EN DEMANDANT (figé : rien de vivant sur l'autre). */
  function demandesEnvoyees(uid) {
    return Q(`SELECT vers AS id, ts, vers_prenom, vers_ident FROM demande_contact WHERE de = ? AND masque = 0 ORDER BY ts DESC, vers LIMIT 200`).all(uid)
      .map(r => ({ id: r.id, prenom: r.vers_prenom, identifiant: r.vers_ident || null, ts: num(r.ts) }));
  }
  /* `uid` répond à la demande de `de`. Accepter crée le contact mutuel et efface la demande ; refuser la garde, muette. → 'acceptee' | 'refusee'.
     Une demande retirée, d'un compte qui s'efface, ou d'une personne bloquée : introuvable. */
  function demandeRepondre(uid, de, accepter) {
    return tx(() => {
      const d = Q(`SELECT d.etat FROM demande_contact d JOIN personne p ON p.id = d.de WHERE d.de = ? AND d.vers = ? AND d.masque = 0 AND p.etat = 'actif' AND p.suppression_le IS NULL`).get(de, uid);
      if (!d || d.etat !== 'attente' || contactBloque(uid, de)) throw erreur('introuvable');
      if (accepter) {
        contactLier(uid, de);
        Q('DELETE FROM demande_contact WHERE (de = ? AND vers = ?) OR (de = ? AND vers = ?)').run(de, uid, uid, de);
        return 'acceptee';
      }
      Q(`UPDATE demande_contact SET etat = 'refusee' WHERE de = ? AND vers = ?`).run(de, uid);
      return 'refusee';
    });
  }
  /* L'auteur retire sa demande : elle quitte les deux listes, mais la LIGNE reste (masquée), que la demande ait été refusée ou non — sinon redemander dirait lequel des deux
     (« envoyee » contre « deja_envoyee » : relecture du gardien, A1) et relancerait l'autre à chaque fois (A2). */
  function demandeAnnuler(uid, vers) {
    return tx(() => {
      if (!num(Q('UPDATE demande_contact SET masque = 1 WHERE de = ? AND vers = ? AND masque = 0').run(uid, vers).changes)) throw erreur('introuvable');
      return true;
    });
  }
  /* Une demande, dans un sens ou dans l'autre : c'est assez pour que la personne qui la REÇOIT puisse bloquer celle qui l'envoie (A3). */
  const demandeEntre = (a, b) => !!Q('SELECT 1 AS x FROM demande_contact WHERE (de = ? AND vers = ?) OR (de = ? AND vers = ?)').get(a, b, b, a);


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
  /* Les sessions d'une personne NÉES AVANT l'instant `t` : rend leurs empreintes (l'appelant ferme leurs flux). Sert à la bêta : le mot de passe d'un accès
     a été remplacé à la Tour à `t`, les sessions ouvertes avec l'ancien tombent, celles qui viennent d'entrer avec le nouveau restent. */
  function sessionsSupprimerAvant(id, t) {
    return tx(() => {
      const hs = Q('SELECT h FROM session WHERE personne = ? AND cree < ?').all(id, t).map(r => r.h);
      for (const h of hs) Q('DELETE FROM session WHERE h = ?').run(h);
      return hs;
    });
  }
  /* Les autres sessions d'une personne : rend leurs empreintes (l'appelant ferme leurs flux — une session supprimée dont le flux reste ouvert continue de recevoir). */
  function sessionsSupprimerAutres(id, garderH) {
    return tx(() => {
      const hs = Q('SELECT h FROM session WHERE personne = ? AND h <> ?').all(id, garderH || '').map(r => r.h);
      for (const h of hs) Q('DELETE FROM session WHERE h = ?').run(h);
      return hs;
    });
  }
  /* ⛔ LES COMPTES BÊTA À RELIRE chez OP GESTION (`porte-beta.js` → `relire`) : ceux qui ont une session vivante, ET ceux qui ont un abonnement push — même sans session.
     Une session expire (30 jours sans usage), un abonnement non : ne relire que les sessions laissait un accès COUPÉ dans la Tour (la personne n'est plus de l'équipe) recevoir
     encore, sur son téléphone, « Nouveau message » — jusqu'à la fin des temps (relevé par le gardien, 3 octobre 2026). */
  function betaARelire() {
    const t = horloge();
    return Q(`SELECT p.id FROM personne p WHERE p.origine = 'beta'
              AND (EXISTS (SELECT 1 FROM session s WHERE s.personne = p.id AND s.exp > ?) OR EXISTS (SELECT 1 FROM push x WHERE x.uid = p.id)) ORDER BY p.id`).all(t)
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
    /* ⛔ une requête À PART pour les favoris (et non une colonne de plus ci-dessous) : la requête reste un littéral, et une base d'avant la 14 se lit sans elle */
    const fav = FAVORI ? new Set(Q(`SELECT vers FROM contact WHERE de = ? AND favori = 1 AND etat = 'ok'`).all(uid).map(r => r.vers)) : null;
    return Q(`SELECT p.id, p.prenom, p.nom, p.statut, p.avatar_piece, c.etat AS mon_etat, c.depuis,
                COALESCE((SELECT c2.etat FROM contact c2 WHERE c2.de = p.id AND c2.vers = c.de), 'retire') AS son_etat
              FROM contact c JOIN personne p ON p.id = c.vers
              WHERE c.de = ? ORDER BY p.prenom, p.nom, p.id`).all(uid)
      .map(r => ({ id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, avatar: r.son_etat === 'bloque' ? null : (r.avatar_piece || null), bloque: r.mon_etat === 'bloque', favori: !!fav && fav.has(r.id), mutuel: r.son_etat !== 'retire', depuis: r.depuis }));
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
  /* ⛔ BLOQUER, y compris quelqu'un qu'on n'a pas en contact. Des collègues d'un espace s'écrivent sans consentement (« Contacts de l'entreprise », `peutEcrire`) : sans un moyen de
     les bloquer, celui qui harcèle un collègue ne s'arrêterait jamais — `contactEtat` ne sait que changer une ligne qui existe. La ligne de blocage est donc CRÉÉE quand elle manque, pour
     qui on voit déjà seulement (`peutVoir` : un contact, une conversation ou un espace en commun) : on ne bloque pas un inconnu, et la réponse reste « introuvable ». */
  function contactBloquer(a, b) {
    return tx(() => {
      if (a === b) return 0;
      if (IDENT) Q(`UPDATE demande_contact SET etat = 'refusee' WHERE de = ? AND vers = ?`).run(b, a);   // bloquer celui qui m'a demandé vaut un refus : pour lui, toujours « en attente »
      if (num(Q('UPDATE contact SET etat = ? WHERE de = ? AND vers = ?').run('bloque', a, b).changes)) return 1;
      if (!peutVoir(a, b) && !(IDENT && demandeEntre(a, b))) return 0;   // ⛔ on peut bloquer quelqu'un qui nous a fait une demande, même sans contact (relecture du gardien, A3)
      Q('INSERT OR IGNORE INTO contact(de, vers, etat, depuis) VALUES(?, ?, ?, ?)').run(a, b, 'bloque', horloge());
      return 1;
    });
  }
  /* Débloquer : l'autre a encore sa ligne → la relation redevient mutuelle ; il ne l'a plus (retirée entre-temps) ou n'en a jamais eu (un collègue qu'on n'avait pas en contact) → la ligne de
     blocage disparaît avec le blocage, elle ne reste pas comme un « contact à moitié ». → faux si rien n'était bloqué. */
  function contactDebloquer(a, b) {
    return tx(() => {
      const l = Q('SELECT etat FROM contact WHERE de = ? AND vers = ?').get(a, b);
      if (!l || l.etat !== 'bloque') return false;
      if (Q('SELECT 1 AS x FROM contact WHERE de = ? AND vers = ?').get(b, a)) Q('UPDATE contact SET etat = ? WHERE de = ? AND vers = ?').run('ok', a, b);
      else Q('DELETE FROM contact WHERE de = ? AND vers = ?').run(a, b);
      return true;
    });
  }
  /* ⛔ UN FAVORI NE SE POSE QUE SUR UN CONTACT QUE J'AI (ma ligne `ok`) : pas sur un bloqué, pas sur un inconnu — la réponse est alors « introuvable », comme pour retirer. */
  function contactFavori(a, b, oui) {
    if (!FAVORI) return 0;
    return num(Q(`UPDATE contact SET favori = ? WHERE de = ? AND vers = ? AND etat = 'ok'`).run(oui ? 1 : 0, a, b).changes);
  }
  function contactLigne(a, b) { return Q('SELECT etat FROM contact WHERE de = ? AND vers = ?').get(a, b) || null; }
  /* Deux personnes qui partagent un ESPACE (des collègues). Ce n'est pas un contact : c'est ce qui leur permet de se trouver dans « Contacts de l'entreprise » et de s'écrire. */
  function collegues(a, b) {
    return !!Q(`SELECT 1 AS x FROM espace_membre x JOIN espace_membre y ON x.espace = y.espace WHERE x.uid = ? AND y.uid = ? LIMIT 1`).get(a, b);
  }
  /* `uid` peut-il voir la fiche de `autre` ? Contact, conversation commune encore active, ou espace commun. */
  function peutVoir(uid, autre) {
    if (uid === autre) return true;
    if (contactLigne(uid, autre)) return true;
    if (Q(`SELECT 1 AS x FROM membre a JOIN membre b ON a.conv = b.conv
           WHERE a.uid = ? AND b.uid = ? AND a.quitte_le IS NULL AND b.quitte_le IS NULL LIMIT 1`).get(uid, autre)) return true;
    return collegues(uid, autre);
  }
  /* ⛔ QUI PEUT S'ÉCRIRE, EN UNE FONCTION : des contacts mutuels sans blocage, OU des collègues d'un même espace — sauf si l'un a bloqué l'autre (un blocage est personnel :
     il tient face à un espace commun). Lue par la conversation directe, l'ajout à un groupe et la règle d'écriture d'une directe ; jamais recopiée. */
  function peutEcrire(a, b) {
    if (a === b) return false;
    if (contactActif(a, b)) return true;
    return !contactBloque(a, b) && collegues(a, b);
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
  /* ⛔ DE MÊME UN LIEN D'ESPACE : il meurt avec le droit de son créateur — un administrateur d'espace rétrogradé, parti ou retiré n'ouvre plus la porte de l'espace par
     un code qu'il avait distribué. */
  function lienValide(h) {
    return Q(`SELECT genre, cible, par, restants FROM lien l WHERE h = ? AND revoque = 0 AND exp > ? AND restants > 0
              AND (genre <> 'groupe' OR EXISTS (SELECT 1 FROM membre m WHERE m.conv = l.cible AND m.uid = l.par AND m.role = 'admin' AND m.quitte_le IS NULL))
              AND (genre <> 'espace' OR EXISTS (SELECT 1 FROM espace_membre x WHERE x.espace = l.cible AND x.uid = l.par AND x.role = 'admin'))`).get(h, horloge()) || null;
  }
  /* Révoquer : tous les liens d'un groupe (`cible`), ou tous les liens de contact d'une personne (`par`).
     ⛔ Les liens d'un GROUPE se révoquent en se NOTANT (genre `invitation`, comme ceux d'un espace) : une archive d'avant la révocation rendrait sinon le code — et la porte — à la personne
     qu'on vient de retirer, qui le connaît (relecture du gardien, 3 octobre 2026 ; le retrait lui-même se note aussi, `groupe_membre`). */
  function liensRevoquerGroupe(conv) {
    return tx(() => {
      const t = horloge();
      for (const l of Q(`SELECT h FROM lien WHERE genre = 'groupe' AND cible = ? AND revoque = 0`).all(conv)) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(l.h, 'invitation', t);
      return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'groupe' AND cible = ? AND revoque = 0`).run(conv).changes);
    });
  }
  function liensRevoquerContact(par) { return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'contact' AND par = ? AND revoque = 0`).run(par).changes); }
  function lienApercu(h) {
    const l = lienValide(h); if (!l) return null;
    if (l.genre === 'espace') return null;   // ⛔ un code d'invitation à un espace n'ouvre QUE `invitations/*` : par la route des contacts et des groupes, il ne dit rien (comme un code expiré)
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
    const rang = convRang(c);
    /* un CANAL dit à quel espace il appartient et s'il est privé — rien de plus (les autres conversations n'ont ces deux champs nulle part) */
    if (c.type === 'canal') { const k = canalDe(conv); if (k) { rang.espace = k.espace; rang.prive = k.prive; } }
    /* une conversation de RÉUNION dit laquelle (pour ouvrir sa fiche) ; les autres conversations n'ont pas ce champ */
    if (c.type === 'reunion') { const k = Q('SELECT id FROM reunion WHERE conv = ?').get(conv); if (k) rang.reunion = k.id; }
    return { conv: rang, moi: { role: m.role, depuis_seq: m.depuis_seq, lu_seq: m.lu_seq, muet_jusqua: m.muet_jusqua, epingle: !!m.epingle, archive: !!m.archive } };
  }
  function canalDe(conv) {
    const k = Q('SELECT espace, prive FROM canal WHERE conv = ?').get(conv);
    return k ? { espace: k.espace, prive: !!k.prive } : null;
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
     laisserait sur le disque des fichiers que plus aucune ligne ne réclame (le balayeur les rattraperait, plus tard).
     `noter: false` : le REJEU d'un effacement de compte après une restauration (`espaceQuitterTout`). La conversation qu'il retire est un artefact de la COPIE (un canal que le compte effacé
     faisait seul dans la copie, alors que le service vivant en avait d'autres) : l'écrire au registre le ferait retirer, à la restauration suivante, d'une copie où il a d'autres membres.
     Les pièces, elles, se notent toujours — leurs fichiers partent vraiment. */
  function convSupprimer(id, { noter = true } = {}) {
    return tx(() => {
      const pieces = Q('SELECT id FROM piece WHERE conv = ?').all(id).map(r => r.id);
      for (const p of pieces) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(p, 'piece', horloge());
      Q('DELETE FROM lien WHERE genre = ? AND cible = ?').run('groupe', id);
      Q('DELETE FROM journal WHERE conv = ?').run(id);
      /* ⛔ LA CONVERSATION ELLE-MÊME SE NOTE (gardien A3, 3 octobre 2026) : seules ses pièces l'étaient, si bien qu'une restauration d'une archive plus ancienne
         que cette suppression ramenait la conversation et tous ses messages. Genre `conversation`, rejoué hors ligne par `rejouerPurge`. */
      if (num(Q('DELETE FROM conversation WHERE id = ?').run(id).changes) > 0 && noter) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'conversation', horloge());   // les membres, messages, réactions, pièces suivent (ON DELETE CASCADE)
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

  /* ⛔ SORTIR D'UN GROUPE (retiré par un administrateur, ou parti de soi-même) SE NOTE DANS LE REGISTRE DES PURGES — `conversation|personne|date`, genre `groupe_membre` (`canal_membre` pour un
     canal privé : même geste, autre genre, pour que le registre dise de quoi il parle). Relecture du gardien, 3 octobre 2026 : seul le retrait d'un espace ou d'un canal se notait, si bien qu'une
     restauration d'une archive d'avant remettait dans un groupe la personne qu'on en avait retirée (ou qui l'avait quitté) — et lui rendait ses messages, ceux d'aujourd'hui compris. La date
     est celle de la sortie : le rejeu ne retire que celui qui était là AVANT (une personne ajoutée de nouveau depuis, `rejoint` plus récent, est une autre arrivée). */
  function sortieNoter(conv, uid, t, canal) {
    Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(conv + '|' + uid + '|' + t, canal ? 'canal_membre' : 'groupe_membre', t);
  }
  function membreRetirer({ conv, par, uid, canal = false }) {
    return tx(() => {
      const m = Q('SELECT role FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
      if (!m) throw erreur('introuvable');
      const t = horloge();
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, conv, uid);
      sortieNoter(conv, uid, t, canal);
      /* ⛔ Le retiré CONNAÎT les codes d'invitation du groupe : on les révoque tous (un administrateur en recrée un) — et chacun se note (`liensRevoquerGroupe`). */
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
      const t = horloge();
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, conv, uid);
      sortieNoter(conv, uid, t, false);
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
      if (nom !== undefined && (c.type === 'groupe' || c.type === 'canal') && nom !== nomDe(c.id, c.nom_ch)) {
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
             (SELECT COUNT(*) FROM membre y WHERE y.conv = c.id AND y.quitte_le IS NULL) AS membres_n,
             k.espace AS canal_espace, k.prive AS canal_prive, u.id AS reunion_id
      FROM membre m JOIN conversation c ON c.id = m.conv LEFT JOIN canal k ON k.conv = c.id LEFT JOIN reunion u ON u.conv = c.id
      WHERE m.uid = ? AND m.quitte_le IS NULL AND (c.type <> 'direct' OR c.dernier_seq > 0 OR c.cree_par = m.uid)
      ORDER BY m.epingle DESC, c.dernier_ts DESC, c.id`).all(horloge(), uid);
    return lignes.map(l => {
      const o = {
        id: l.id, type: l.type, nom: nomDe(l.id, l.nom_ch), avatar: l.avatar_piece || null, annonces_seules: !!l.annonces_seules, ephemere_s: l.ephemere_s,
        dernier_seq: l.dernier_seq, dernier_ts: l.dernier_ts, role: l.role, lu_seq: l.lu_seq, non_lus: num(l.non_lus),
        membres_n: num(l.membres_n), epingle: !!l.epingle, archive: !!l.archive, muet_jusqua: l.muet_jusqua, apercu: null, autre: null,
      };
      if (l.type === 'canal' && l.canal_espace) { o.espace = l.canal_espace; o.prive = !!l.canal_prive; }   // un canal dit son espace et s'il est privé ; les autres conversations n'ont pas ces champs
      if (l.type === 'reunion' && l.reunion_id) o.reunion = l.reunion_id;                                   // une conversation de réunion dit laquelle (pour ouvrir sa fiche)
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
          /* une photo LÉGENDÉE se dit par sa légende, précédée de l'appareil photo (comme WhatsApp) */
          clair = p.type === 'photo' && clair && clair.trim() ? '📷 ' + clair : apercuPiece(p.type, meta);
        }
        o.apercu = { seq: p.seq, auteur: p.auteur, type: p.type, supprime: !!p.supprime_le, texte: clair === null ? null : debut(clair, 120) };
        /* ⛔ le NOM de l'auteur d'un aperçu de groupe : sans lui, la liste disait « Quelqu'un : … » pour tout membre qui n'est pas dans mes contacts (le cas
           central d'un groupe par lien) et ne le corrigeait qu'à l'ouverture. Seulement quelqu'un qui est MEMBRE ACTIF de cette conversation — ses noms
           sont déjà dans `membresDetail` de la même conversation, rien de plus n'est dit. */
        if ((l.type === 'groupe' || l.type === 'canal') && p.type !== 'systeme' && p.auteur) {
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
    return !!autre && peutEcrire(uid, autre);
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
      if (r.type !== 'texte' && r.type !== 'photo') throw erreur('type');   // la légende d'une photo se modifie comme un message
      if (texte === null && r.type !== 'photo') throw erreur('vide');   // un message texte ne se vide pas ; une photo, si : sa légende est retirée
      if (horloge() - r.ts > DELAI_MODIF_MS) throw erreur('delai');
      const t = horloge();
      Q('UPDATE message SET corps_ch = ?, modifie = ? WHERE conv = ? AND seq = ?').run(texte === null ? null : sceller('message', 'corps_ch', aadMsg(conv, seq, auteur), texte), t, conv, seq);
      return { gid: journalAjouter('msg_modifie', conv, null, seq), modifie: t };
    });
  }

  /* `pour:'moi'` ne retire le message qu'à son titulaire (un événement à lui seul) ; `'tous'`
     efface le corps TOUT DE SUITE et laisse une pierre tombale — un message supprimé ne doit pas
     rester lisible dans le fichier. */
  function messageSupprimer({ conv, seq, uid, pour, admin }) {
    return tx(() => {
      const r = Q('SELECT id, auteur, type, supprime_le FROM message WHERE conv = ? AND seq = ?').get(conv, seq);
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
      /* ⛔ NOTÉ DANS `purge` : une sauvegarde prise AVANT ce geste porte encore le texte ; la restauration rejoue le registre
         (`rejouerPurge`, genre `message_supprime`) et le reblanchit — sinon un message « supprimé pour tous » reviendrait lisible. */
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(r.id, 'message_supprime', horloge());
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
      /* pas encore posée (`expire` encore daté) : son dépositaire seul, et seulement tant qu'elle n'est pas échue — comme toute pièce qu'aucun message ne porte.
         ⛔ Une fois POSÉE, le dépositaire n'a plus de droit propre (relecture du gardien, remarque 7) : la sienne se lit par `personne.avatar_piece` (il se voit toujours),
         celle d'un groupe par l'appartenance au groupe — un administrateur qui a posé la photo puis quitté le groupe (ou en a été retiré) ne la lit plus. */
      if (r.expire !== null) return r.proprio === uid && r.expire > t ? rang() : null;
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
  /* « REÇU » : la liste des conversations est arrivée sur un appareil de la personne — tout ce qu'elle annonçait (jusqu'au dernier message de chaque conversation) est donc arrivé
     chez elle, comme les deux coches grises. Une écriture par relecture de la liste, seulement là où quelque chose a bougé. */
  function membreRecuTout(uid) {
    Q(`UPDATE membre SET recu_seq = (SELECT c.dernier_seq FROM conversation c WHERE c.id = membre.conv)
       WHERE uid = ? AND quitte_le IS NULL AND recu_seq < (SELECT c.dernier_seq FROM conversation c WHERE c.id = membre.conv)`).run(uid);
  }
  /* ── LE SUIVI D'UN DOCUMENT (migration 15) ── noter une lecture : une pièce de conversation lue par quelqu'un d'autre que son auteur (la route l'a déjà jugée visible). */
  /* ⛔ DÉDOUBLONNÉ À LA MINUTE (relecture du gardien, C1-C2) : toute lecture compte — une plage qui ne part pas du début aussi (sinon `Range: bytes=1-` téléchargeait sans être vu) —,
     mais une rafale de plages (un lecteur, un gestionnaire de téléchargement, une boucle) n'en fait qu'une, et n'écrit rien : la base n'écrit qu'une fois par minute et par lecteur. */
  const SUIVI_FENETRE_MS = 60000;
  function pieceAccesNoter(piece, uid) {
    if (!SUIVI) return;
    const t = horloge();
    Q(`INSERT INTO piece_acces(piece, uid, premier, dernier, n) VALUES(?, ?, ?, ?, 1)
       ON CONFLICT(piece, uid) DO UPDATE SET dernier = excluded.dernier, n = n + 1 WHERE excluded.dernier - dernier > ?`).run(piece, uid, t, t, SUIVI_FENETRE_MS);
  }
  /* Qui a reçu, lu, ouvert (une photo, un vocal) ou téléchargé (un fichier) MA pièce — l'AUTEUR seul, sinon null (le même 404 qu'une pièce qui n'existe pas).
     Les gens : les membres d'aujourd'hui qui VOIENT le message (arrivés avant lui, pas masqué pour eux). « Reçu » est toujours dit (l'arrivée sur l'appareil, comme les deux coches
     grises) ; « lu » et l'ouverture d'une photo ou d'un vocal suivent la règle des confirmations de lecture (réciproque : qui les coupe ne les donne ni ne les voit) ;
     ⛔ le TÉLÉCHARGEMENT d'un fichier est toujours dit à son auteur — c'est le fichier qu'il a envoyé (comme un service de transfert de fichiers), et la page de confidentialité le dit. */
  /* l'export « Mes données » : les documents que J'ai ouverts ou téléchargés (ce que leurs auteurs voient de moi) */
  const exportPiecesOuvertes = (uid) => SUIVI ? Q('SELECT piece, premier, dernier, n FROM piece_acces WHERE uid = ? ORDER BY premier LIMIT 10000').all(uid).map(r => ({ piece: r.piece, premier: num(r.premier), dernier: num(r.dernier), n: num(r.n) })) : [];
  function pieceSuivi(id, viewer) {
    const p = Q('SELECT id, proprio, conv, genre, attachee FROM piece WHERE id = ?').get(id);
    if (!p || p.proprio !== viewer || !p.conv || p.genre === 'avatar' || p.attachee === null) return null;
    const msg = Q('SELECT supprime_le, expire_ts FROM message WHERE conv = ? AND seq = ?').get(p.conv, p.attachee);
    if (!msg || msg.supprime_le || (msg.expire_ts !== null && msg.expire_ts <= horloge())) return null;
    /* ⛔ L'AUTEUR DOIT ENCORE VOIR SON MESSAGE (relecture du gardien, B1) : parti du groupe, retiré, ou l'ayant masqué pour lui, il ne suit plus rien — sinon un salarié parti gardait
       la liste des membres d'aujourd'hui et leurs téléchargements datés. Les MÊMES règles que `pieceVisible`. */
    const mien = Q('SELECT depuis_seq FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(p.conv, viewer);
    if (!mien || p.attachee < mien.depuis_seq) return null;
    if (Q('SELECT 1 AS x FROM msg_masque WHERE conv = ? AND seq = ? AND uid = ?').get(p.conv, p.attachee, viewer)) return null;
    const jeVois = accuses((personneParId(viewer) || {}).prefs);
    const lignes = Q(`SELECT m.uid AS id, x.prenom, x.nom, x.avatar_piece, x.prefs, m.recu_seq, m.lu_seq FROM membre m JOIN personne x ON x.id = m.uid
                      WHERE m.conv = ? AND m.quitte_le IS NULL AND m.uid <> ? AND m.depuis_seq <= ?
                        AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = m.conv AND k.seq = ? AND k.uid = m.uid)
                      ORDER BY x.prenom, x.nom, x.id`).all(p.conv, viewer, p.attachee, p.attachee);
    const acces = new Map(SUIVI ? Q('SELECT uid, premier, dernier, n FROM piece_acces WHERE piece = ?').all(id).map(a => [a.uid, a]) : []);
    const fichier = p.genre === 'fichier';
    const membres = lignes.map(r => {
      let pr = {}; try { pr = JSON.parse(r.prefs) || {}; } catch (e) { pr = {}; }
      const ilDit = jeVois && accuses(pr), a = acces.get(r.id) || null;
      const voitOuverture = fichier || ilDit;
      return { id: r.id, prenom: r.prenom, nom: r.nom, avatar: avatarPour(viewer, r.id, r.avatar_piece), recu: num(r.recu_seq) >= p.attachee || num(r.lu_seq) >= p.attachee || !!a,
        lu: ilDit ? num(r.lu_seq) >= p.attachee : null,
        ouvert: voitOuverture ? (a ? { premier: num(a.premier), dernier: num(a.dernier), n: num(a.n) } : false) : null };
    });
    return { piece: id, genre: p.genre, suivi: SUIVI, membres };
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
                   SELECT b.uid AS id FROM membre a JOIN membre b ON a.conv = b.conv WHERE a.uid = ? AND a.quitte_le IS NULL AND b.quitte_le IS NULL AND b.uid <> ?
                   UNION
                   SELECT y.uid AS id FROM espace_membre x JOIN espace_membre y ON x.espace = y.espace WHERE x.uid = ? AND y.uid <> ?`).all(uid, uid, uid, uid, uid).map(r => r.id);
    return ids.filter(x => x !== uid && !contactBloque(uid, x));
  }

  /* ══ NOTIFICATIONS DANS L'APPLICATION ════════════════════════════════════════════════════ */
  /* `auteur` : la personne que le texte NOMME (celle qui a ajouté, mentionné) — l'effacement de son compte réécrit alors la notification (`notifsAnonymiser`). */
  /* `remplacer` : la nouvelle notification prend la place de celle du même type et de la même cible que la personne n'a PAS encore lue — une réunion modifiée deux cents fois laisse UNE notification
     (la dernière), pas deux cents (relecture du gardien, important n° 4). Une notification déjà lue reste : c'est de l'historique. */
  function notifCreer({ uid, type, titre, texte, cible, auteur, remplacer }) {
    return tx(() => {
      if (remplacer === true && cible) Q('DELETE FROM notification WHERE uid = ? AND type = ? AND cible = ? AND lue = 0').run(uid, type, cible);
      const id = nouvelId('n'), t = horloge();
      Q('INSERT INTO notification(id, uid, type, titre_ch, texte_ch, cible, ts, auteur) VALUES(?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, uid, type, sceller('notification', 'titre_ch', id + '|titre', titre || ''), sceller('notification', 'texte_ch', id + '|texte', texte || ''), cible || null, t, auteur || null);
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
      /* ⛔ UNE RÉUNION CHANGE : l'événement dit seulement « relis-la » (son identifiant, sa version), jamais la liste des invités — elle pèse, et chacun la relit avec SES droits. Une réunion qu'on ne
         voit plus (supprimée, ou on en a été retiré) se dit `supprime` : la page la retire de l'agenda. */
      case 'reunion': {
        const r = Q('SELECT u.id AS id, u.conv AS conv, u.version AS version FROM reunion u JOIN reunion_invite i ON i.reunion = u.id AND i.uid = ? WHERE u.id = ?').get(uid, j.ref);
        return { gid, event: 'reunion', data: r ? { id: r.id, conv: r.conv, version: num(r.version) } : { id: j.ref, supprime: true } };
      }
      /* ⛔ UN APPEL CHANGE : l'événement dit la VUE de l'appel pour CETTE personne, lue À L'INSTANT où on le lit — jamais l'état d'il y a une heure. Rejoué après une coupure, un appel qui sonnait dit
         qu'il est fini (la page n'a pas à faire sonner un téléphone pour un appel d'hier) ; un appel effacé (ou une personne qui n'y participe plus) ne dit rien. */
      case 'appel': {
        const vue = appelVue(uid, j.ref);
        return vue ? { gid, event: 'appel', data: vue } : null;
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
  /* ══ LE COMPTE PAR ADRESSE E-MAIL (migration 12) ══ — même discipline que `code_tel` : UN code par (adresse, but), un essai se compte AVANT d'être jugé, lié à l'appareil. */
  /* ⛔ CHAQUE APPAREIL A SON CODE (relectures du gardien, C2 puis N3) : un code par (adresse, but, APPAREIL), trois vivants au plus par (adresse, but). Un inconnu qui connaît l'adresse ne
     remplace pas le code que la personne vient de recevoir (C2), et il ne lui PREND pas la place non plus en demandant le premier (N3) : la personne reçoit le sien. Le même appareil
     remplace le sien. → true si le code est posé (alors seulement on l'envoie), false sinon (trois appareils ont déjà un code vivant) — la réponse à l'appelant est la même. */
  const CODES_MEL_VIVANTS = 3;
  function melCodePoser({ adr_h, but, code_h, exp, ap_h, donnees }) {
    const d = donnees === undefined || donnees === null ? null : sceller('code_mel', 'donnees', adr_h + '|' + but + '|' + ap_h, JSON.stringify(donnees));
    const t = horloge();
    return tx(() => {
      Q('DELETE FROM code_mel WHERE adr_h = ? AND but = ? AND exp <= ?').run(adr_h, but, t);
      const autres = num(Q('SELECT COUNT(*) AS n FROM code_mel WHERE adr_h = ? AND but = ? AND ap_h <> ?').get(adr_h, but, ap_h).n);
      if (autres >= CODES_MEL_VIVANTS) return false;
      Q(`INSERT INTO code_mel(adr_h, but, code_h, donnees, cree, exp, essais, ap_h) VALUES(?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(adr_h, but, ap_h) DO UPDATE SET code_h = excluded.code_h, donnees = excluded.donnees, cree = excluded.cree, exp = excluded.exp, essais = 0`)
        .run(adr_h, but, code_h, d, t, exp, ap_h);
      return true;
    });
  }
  /* → { code_h, donnees } ou null (absent, expiré, épuisé, ou demandé par un AUTRE appareil — ses essais ne brûlent pas le code de la personne) */
  function melCodeEssayer(adr_h, but, maxEssais, ap_h) {
    return tx(() => {
      const r = Q('SELECT code_h, donnees, exp, essais FROM code_mel WHERE adr_h = ? AND but = ? AND ap_h = ?').get(adr_h, but, ap_h);
      if (!r) return null;                                    // pas de code pour CET appareil : les essais d'un autre ne touchent pas celui de la personne
      if (r.exp <= horloge() || r.essais >= maxEssais) { Q('DELETE FROM code_mel WHERE adr_h = ? AND but = ? AND ap_h = ?').run(adr_h, but, ap_h); return null; }
      Q('UPDATE code_mel SET essais = essais + 1 WHERE adr_h = ? AND but = ? AND ap_h = ?').run(adr_h, but, ap_h);
      if (r.essais + 1 >= maxEssais) Q('UPDATE code_mel SET exp = 0 WHERE adr_h = ? AND but = ? AND ap_h = ?').run(adr_h, but, ap_h);
      let donnees = null;
      if (r.donnees) { try { donnees = JSON.parse(ouvrirS('code_mel', 'donnees', adr_h + '|' + but + '|' + ap_h, r.donnees)); } catch (e) { donnees = null; } }
      return { code_h: r.code_h, donnees };
    });
  }
  /* usage unique : un code accepté retire TOUS ceux de (adresse, but) — ceux des autres appareils ne servent plus à rien */
  function melCodeSupprimer(adr_h, but) { return num(Q('DELETE FROM code_mel WHERE adr_h = ? AND but = ?').run(adr_h, but).changes); }
  function melCodeCree(adr_h, but) { const r = Q('SELECT MAX(cree) AS c FROM code_mel WHERE adr_h = ? AND but = ?').get(adr_h, but); return r && r.c !== null ? num(r.c) : null; }
  function melCodesElaguer(avant) { return num(Q('DELETE FROM code_mel WHERE exp < ?').run(avant).changes); }
  /* Le mot de passe d'une personne : sel, empreinte et paramètres de scrypt (jamais le mot de passe). `null` si elle n'en a pas (compte bêta, compte par numéro). */
  function mdpLire(id) {
    const r = Q('SELECT sel, mdp, params FROM personne WHERE id = ?').get(id);
    return r && r.sel && r.mdp && r.params ? { sel: Buffer.from(r.sel), hash: Buffer.from(r.mdp), params: r.params } : null;
  }
  /* ══ L'AGENDA PERSONNEL (migration 13) ══ — tout se lit et s'écrit PAR SA PERSONNE : un identifiant d'un autre rend null (la route répond 404). */
  const evtRang = (r) => r ? {
    id: r.id, titre: ouvrirOuNull('evenement', 'titre_ch', r.id + '|titre', r.titre_ch) || '', lieu: r.lieu_ch ? (ouvrirOuNull('evenement', 'lieu_ch', r.id + '|lieu', r.lieu_ch) || '') : '',
    note: r.note_ch ? (ouvrirOuNull('evenement', 'note_ch', r.id + '|note', r.note_ch) || '') : '', debut: num(r.debut), fin: num(r.fin), journee: !!r.journee, tz: r.tz,
    rappel: r.rappel === null ? null : num(r.rappel), rappelEnAttente: r.rappel_a !== null, cree: num(r.cree), maj: num(r.maj),
  } : null;
  const scellerEvt = (id, champ, v) => v ? sceller('evenement', champ + '_ch', id + '|' + champ, v) : null;
  function evenementCreer({ uid, titre, lieu, note, debut, fin, journee, tz, rappel, rappelA }) {
    const id = nouvelId('e'), t = horloge();
    Q(`INSERT INTO evenement(id, uid, titre_ch, lieu_ch, note_ch, debut, fin, journee, tz, rappel, rappel_a, cree, maj) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, uid, sceller('evenement', 'titre_ch', id + '|titre', titre), scellerEvt(id, 'lieu', lieu), scellerEvt(id, 'note', note), debut, fin, journee ? 1 : 0, tz,
        rappel === null || rappel === undefined ? null : rappel, rappelA === null || rappelA === undefined ? null : rappelA, t, t);
    return evenementLire(uid, id);
  }
  function evenementLire(uid, id) { return evtRang(Q('SELECT * FROM evenement WHERE id = ? AND uid = ?').get(id, uid)); }
  /* `rappelA` : undefined garde l'échéance telle quelle (un rappel déjà parti ne repart pas), null l'efface, un nombre la pose. */
  function evenementMaj(uid, id, { titre, lieu, note, debut, fin, journee, tz, rappel, rappelA }) {
    const r = Q('SELECT id FROM evenement WHERE id = ? AND uid = ?').get(id, uid);
    if (!r) return null;
    return tx(() => {
      Q('UPDATE evenement SET titre_ch = ?, lieu_ch = ?, note_ch = ?, debut = ?, fin = ?, journee = ?, tz = ?, rappel = ?, maj = ? WHERE id = ? AND uid = ?')
        .run(sceller('evenement', 'titre_ch', id + '|titre', titre), scellerEvt(id, 'lieu', lieu), scellerEvt(id, 'note', note), debut, fin, journee ? 1 : 0, tz,
          rappel === null || rappel === undefined ? null : rappel, horloge(), id, uid);
      if (rappelA !== undefined) Q('UPDATE evenement SET rappel_a = ? WHERE id = ? AND uid = ?').run(rappelA === null ? null : rappelA, id, uid);
      return evenementLire(uid, id);
    });
  }
  /* supprimé, il est noté au registre des purges (genre `evenement`) : une restauration d'une archive d'avant ne le fait pas revenir */
  function evenementSupprimer(uid, id) {
    return tx(() => {
      const ok = num(Q('DELETE FROM evenement WHERE id = ? AND uid = ?').run(id, uid).changes) > 0;
      if (ok) Q(`INSERT INTO purge(objet, genre, quand) VALUES(?, 'evenement', ?)`).run(id, horloge());
      return ok;
    });
  }
  function evenementsCompter(uid) { return num(Q('SELECT COUNT(*) AS n FROM evenement WHERE uid = ?').get(uid).n); }
  /* ceux qui TOUCHENT la fenêtre [du, au) : commencés avant sa fin, finis après son début */
  function evenementsDe(uid, du, au, max) { return Q('SELECT * FROM evenement WHERE uid = ? AND debut < ? AND fin > ? ORDER BY debut, id LIMIT ?').all(uid, au, du, max).map(evtRang); }
  /* les rappels DUS (`rappel_a` passé), les plus anciens d'abord — seulement des personnes actives */
  function evenementsRappelsDus(t, max) {
    return Q(`SELECT e.* FROM evenement e JOIN personne p ON p.id = e.uid WHERE e.rappel_a IS NOT NULL AND e.rappel_a <= ? AND p.etat = 'actif' ORDER BY e.rappel_a, e.id LIMIT ?`).all(t, max)
      .map(r => Object.assign(evtRang(r), { uid: r.uid }));
  }
  /* ⛔ UN RAPPEL PART UNE FOIS : l'échéance s'efface et la notification s'écrit dans la MÊME transaction ; si l'échéance n'est plus là (une autre instance, un geste de la personne), rien ne part. */
  function evenementRappelEnvoyer(id, { titre, texte }) {
    return tx(() => {
      const r = Q('SELECT uid FROM evenement WHERE id = ? AND rappel_a IS NOT NULL').get(id);
      if (!r) return null;
      Q('UPDATE evenement SET rappel_a = NULL WHERE id = ?').run(id);
      return notifCreer({ uid: r.uid, type: 'agenda_rappel', titre, texte, cible: id, remplacer: true });
    });
  }
  function evenementRappelAbandonner(id) { return num(Q('UPDATE evenement SET rappel_a = NULL WHERE id = ? AND rappel_a IS NOT NULL').run(id).changes) > 0; }
  /* pour l'export de ses données : ses événements, en clair (ce sont les siens) */
  function exportEvenements(uid) { return versionActuelle() >= 13 ? Q('SELECT * FROM evenement WHERE uid = ? ORDER BY debut, id').all(uid).map(evtRang) : []; }
  /* L'âge et les conditions acceptés à l'inscription (colonnes prévues dès la migration 1) : la version des conditions est gardée, pour savoir lesquelles la personne a lues. */
  function personneConsentir(id, cguV) { return num(Q('UPDATE personne SET age_ok = 1, cgu_v = ? WHERE id = ?').run(String(cguV).slice(0, 20), id).changes) > 0; }
  /* `change: true` : un CHANGEMENT (pas la création du compte) — noté au registre des purges dans la même transaction, pour qu'une restauration ne ramène pas l'ancien mot de passe (C5). */
  function mdpPoser(id, { sel, hash, params }, { change = false } = {}) {
    return tx(() => {
      const t = horloge();
      const ok = num(Q('UPDATE personne SET sel = ?, mdp = ?, params = ?, mdp_le = ? WHERE id = ?').run(Buffer.from(sel), Buffer.from(hash), String(params), t, id).changes) > 0;
      if (ok && change) Q(`INSERT INTO purge(objet, genre, quand) VALUES(?, 'mdp', ?)`).run(id + '|' + t, t);   // `personne|date` : chaque changement a SA ligne (la recopie dédoublonne par objet)
      return ok;
    });
  }
  function appareilMelConnu(h, personne) { return !!Q('SELECT 1 AS x FROM appareil_mel WHERE h = ? AND personne = ?').get(h, personne); }
  function appareilMelNoter(h, personne) {
    return tx(() => {
      Q('INSERT INTO appareil_mel(h, personne, vu) VALUES(?, ?, ?) ON CONFLICT(h, personne) DO UPDATE SET vu = excluded.vu').run(h, personne, horloge());
      Q('DELETE FROM appareil_mel WHERE personne = ? AND h NOT IN (SELECT h FROM appareil_mel WHERE personne = ? ORDER BY vu DESC LIMIT 20)').run(personne, personne);   // vingt au plus
    });
  }
  function appareilsMelOublier(personne, garderH) { return num(Q('DELETE FROM appareil_mel WHERE personne = ? AND h <> ?').run(personne, garderH || '').changes); }
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
      /* Le onzième appareil chasse le plus ancien : c'est une révocation, elle se note comme les autres (voir `telAppareilSupprimer`). */
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ? AND h NOT IN (SELECT h FROM appareil_tel WHERE personne = ? ORDER BY vu DESC, cree DESC LIMIT ?)`).run(t, personne, personne, APPAREILS_MAX);
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
  /* ⛔ UNE RÉVOCATION D'APPAREIL SE NOTE DANS `purge` (genre `appareil`, l'empreinte du jeton — jamais le jeton) : sans cela, une restauration d'une archive d'avant la
     déconnexion ramenait un appareil « déconnecté » avec toute sa validité (gardien A3). L'expiration naturelle, elle, ne se note pas : la date d'échéance est dans la ligne. */
  function telAppareilSupprimer(h) {
    return tx(() => {
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE h = ?`).run(horloge(), h);
      return num(Q('DELETE FROM appareil_tel WHERE h = ?').run(h).changes);
    });
  }
  function telAppareilsSupprimerPersonne(id) {
    return tx(() => {
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ?`).run(horloge(), id);
      return num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(id).changes);
    });
  }
  /* « Déconnecter les autres appareils » : tout sauf l'appareil d'où l'on le demande. */
  function telAppareilsSupprimerAutres(id, garderH) {
    return tx(() => {
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ? AND h <> ?`).run(horloge(), id, garderH || '');
      return num(Q('DELETE FROM appareil_tel WHERE personne = ? AND h <> ?').run(id, garderH || '').changes);
    });
  }
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
    if (versionActuelle() >= 12) n += num(Q('DELETE FROM code_mel WHERE exp < ?').run(codesAvant).changes);   // les codes reçus par courriel (compte par adresse), même rétention
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
  /* Un REFUS de plus du service push à CET abonnement (une réponse 4xx qui ne dit ni « disparu » ni « tes clés sont refusées » : voir `push.js`). → { echecs } : le nombre de refus de suite, remis à zéro par une livraison
     (`pushOk`). Le RETRAIT n'est pas ici : il se juge dans `push.js`, qui sait l'heure du premier refus de la série — cinq refus en cinq minutes ne retirent personne (relevé par le gardien, 3 octobre 2026). */
  function pushEchec(id) {
    return tx(() => {
      Q('UPDATE push SET echecs = echecs + 1 WHERE id = ?').run(id);
      const r = Q('SELECT echecs FROM push WHERE id = ?').get(id);
      return { echecs: r ? num(r.echecs) : 0 };
    });
  }
  function pushSupprimerPersonne(uid) { return num(Q('DELETE FROM push WHERE uid = ?').run(uid).changes); }
  /* ⛔ UNE PERSONNE EST JOIGNABLE tant qu'elle peut revenir dans l'application sans rien prouver de neuf : une session vivante, ou un jeton d'appareil valable (échéance glissante ET
     plafond absolu, comme `telAppareilLire`). Sans l'un ni l'autre, elle n'est plus connectée nulle part : l'aperçu d'un message n'a rien à faire sur son écran verrouillé. Une session
     expire (30 jours sans usage), un abonnement push non — c'est ce qui laissait un téléphone recevoir encore les messages d'un compte dont plus rien ne tenait l'accès
     (relevé par le gardien, 3 octobre 2026). `absMs` : le plafond absolu d'un jeton d'appareil (`telephone.js`). */
  function pushJoignable(uid, absMs) {
    const t = horloge();
    if (Q('SELECT 1 AS x FROM session WHERE personne = ? AND exp > ? LIMIT 1').get(uid, t)) return true;
    return !!Q('SELECT 1 AS x FROM appareil_tel WHERE personne = ? AND exp > ? AND cree + ? > ? LIMIT 1').get(uid, t, absMs, t);
  }
  /* Le balayeur retire les abonnements des personnes qui ne sont plus joignables (la page redit son abonnement à la prochaine connexion : rien n'est perdu pour qui revient). */
  function pushNonJoignablesPurger(absMs) {
    const t = horloge();
    return num(Q(`DELETE FROM push WHERE uid NOT IN (SELECT personne FROM session WHERE exp > ?) AND uid NOT IN (SELECT personne FROM appareil_tel WHERE exp > ? AND cree + ? > ?)`).run(t, t, absMs, t).changes);
  }
  /* « Déconnecter les autres appareils » : tous les abonnements de la personne SAUF celui d'où elle le demande (son point d'accès, s'il le donne). Sans point d'accès, ou avec un point
     d'accès qu'elle n'a pas inscrit : tous — l'appareil se réabonne en une seconde, un téléphone perdu qui continue de recevoir les notifications ne se rattrape pas. */
  function pushRetirerAutres(uid, garder) {
    if (typeof garder === 'string' && garder.length > 0 && garder.length <= 2048) return num(Q('DELETE FROM push WHERE uid = ? AND endpoint_h <> ?').run(uid, hPush(garder)).changes);
    return pushSupprimerPersonne(uid);
  }

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
  /* ⛔ LA NOTIFICATION SE RE-JUGE AU MOMENT DE PARTIR (elle attend jusqu'à 5 s qu'une page l'acquitte) : la personne a pu mettre la conversation en sourdine, la quitter, bloquer l'autre d'une
     conversation directe, ou l'auteur a pu supprimer le message « pour tous » — rien de tout cela ne doit partir quand même. Et le message a pu être MODIFIÉ : on rend son état ACTUEL, pas
     celui du moment de l'envoi (un aperçu qui part avec l'ancien texte montre sur un écran verrouillé ce que l'auteur a corrigé — relevé par le gardien, 3 octobre 2026).
     → null (ne part pas) ou { type, texte (null si illisible), expire_ts (null si le message n'est pas éphémère) }. */
  function pushMessageEncore({ uid, conv, seq }) {
    const m = Q('SELECT depuis_seq, muet_jusqua FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
    if (!m || m.muet_jusqua > horloge() || seq < m.depuis_seq) return null;
    if (!ecritureAutorisee(conv, uid)) return null;   // une directe bloquée (ou sans contact mutuel) ne reçoit plus rien : la même règle que l'envoi
    const x = Q('SELECT auteur, type, corps_ch, supprime_le, expire_ts FROM message x WHERE x.conv = ? AND x.seq = ? AND NOT EXISTS (SELECT 1 FROM msg_masque k WHERE k.conv = x.conv AND k.seq = x.seq AND k.uid = ?)').get(conv, seq, uid);
    if (!x || x.supprime_le || (x.expire_ts !== null && x.expire_ts <= horloge())) return null;
    const texte = x.corps_ch ? ouvrirOuNull('message', 'corps_ch', aadMsg(conv, seq, x.auteur), x.corps_ch) : null;
    return { type: x.type, texte, expire_ts: x.expire_ts === null ? null : num(x.expire_ts) };
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
  /* ⛔ LA DEMANDE ET L'ANNULATION SE NOTENT DANS LE REGISTRE (genres « suppression_demandee » et « suppression_annulee », rejoués par le SERVICE, `rejeu.js`), dans la MÊME transaction.
     Rejoué par le gardien le 3 octobre 2026 : une restauration pendant le sursis ramenait une copie d'AVANT la demande — l'échéance n'y était plus, le compte n'était JAMAIS effacé
     alors que la personne croyait l'avoir demandé ; et une copie d'AVANT l'annulation ramenait l'échéance d'une personne revenue entre-temps — qui serait effacée à la minute où le
     balayeur passe. `objet` = « identifiant|échéance|marque » (la demande) et « identifiant|marque » (l'annulation) : la marque (4 octets au hasard) rend chaque ligne UNIQUE, car la
     restauration recopie le registre sans doublon sur (objet, genre) et deux demandes de même échéance, à la même milliseconde, ne doivent pas n'en faire qu'une.
     `{ rejeu: true }` : le REJEU de la ligne après une restauration — il pose (ou lève) l'échéance et ne refait que les coupures qu'une copie ne peut pas déjà porter ; il n'écrit PAS la
     ligne (elle est déjà dans le registre recopié) et une personne absente ou déjà effacée n'est pas une erreur. `depuis` : l'instant de la demande d'origine (les liens créés après
     lui sont ceux d'une personne revenue, on n'y touche pas). */
  function suppressionProgrammer(uid, echeance, { rejeu = false, depuis = 0 } = {}) {
    return tx(() => {
      if (!num(Q("UPDATE personne SET suppression_le = ? WHERE id = ? AND etat = 'actif'").run(echeance, uid).changes)) {
        if (rejeu) return { sessions: 0, appareils: 0, push: 0, echeance, posee: false };
        throw erreur('introuvable');
      }
      const sessions = num(Q('DELETE FROM session WHERE personne = ?').run(uid).changes);
      if (rejeu) {
        /* ni les appareils (la révocation de chacun est SA ligne du registre, rejouée hors ligne avec la règle « créé avant la révocation »), ni les abonnements push (la restauration
           vide la table) : les supprimer ici emporterait ceux d'une personne REVENUE depuis, dans une copie qui les porte. Les liens, eux, se datent. */
        Q('UPDATE lien SET revoque = 1 WHERE par = ? AND revoque = 0 AND cree <= ?').run(uid, depuis);
        persoAjuster(uid);   // l'abonnement Perso+ de la personne cesse de se renouveler — rejoué : la copie restaurée n'a peut-être pas la ligne, et Stripe, lui, n'a pas été restauré
        return { sessions, appareils: 0, push: 0, echeance, posee: true };
      }
      /* ⛔ UN APPAREIL COUPÉ ICI EST NOTÉ, comme toute révocation (« déconnecter les autres », onzième appareil) : sans la ligne, une restauration d'une copie d'avant la
         demande lui rendrait l'accès sans SMS (le registre des purges, `rejouerPurge`, genre `appareil`). */
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ?`).run(horloge(), uid);
      const appareils = num(Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid).changes);
      const push = num(Q('DELETE FROM push WHERE uid = ?').run(uid).changes);
      Q('DELETE FROM jeton WHERE personne = ?').run(uid);
      Q('UPDATE lien SET revoque = 1 WHERE par = ? AND revoque = 0').run(uid);   // un lien d'invitation d'une personne qui s'en va ne ramène plus personne vers elle
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(uid + '|' + echeance + '|' + alea(4), 'suppression_demandee', horloge());
      /* ⛔ QUI DEMANDE À PARTIR N'EST PLUS PRÉLEVÉ (Justin, 4 octobre 2026) : son abonnement Perso+ cesse de se renouveler chez Stripe — la demande est NOTÉE ici, dans la transaction de la demande
         (`persoAjuster`), le service la fait chez Stripe et la rejoue jusqu'à la confirmation. Rien n'est perdu si Stripe est muet ; l'accès, lui, reste jusqu'à la fin de la période payée. */
      persoAjuster(uid);
      return { sessions, appareils, push, echeance };
    });
  }
  function suppressionAnnuler(uid, { rejeu = false } = {}) {
    return tx(() => {
      const annulee = num(Q("UPDATE personne SET suppression_le = NULL WHERE id = ? AND etat = 'actif' AND suppression_le IS NOT NULL").run(uid).changes) > 0;
      if (annulee && !rejeu) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(uid + '|' + alea(4), 'suppression_annulee', horloge());
      if (annulee) persoAjuster(uid);   // le renouvellement revient — SAUF s'il avait été arrêté par la personne elle-même avant la demande (`avant`, `touche`)
      return annulee;
    });
  }
  function suppressionLe(uid) {
    const r = Q('SELECT suppression_le FROM personne WHERE id = ?').get(uid);
    return r && r.suppression_le !== null && r.suppression_le !== undefined ? num(r.suppression_le) : null;
  }
  /* Les comptes dont l'échéance est passée (par paquets : un effacement est une transaction, pas mille). */
  function comptesEchus(limite = 10) {
    return Q(`SELECT id FROM personne WHERE etat = 'actif' AND suppression_le IS NOT NULL AND suppression_le <= ? ORDER BY suppression_le, id LIMIT ?`).all(horloge(), Math.max(1, limite | 0)).map(r => r.id);
  }
  /* ⛔ LES NOTIFICATIONS DES AUTRES QUI NOMMENT LA PERSONNE s'écrivent « Un compte supprimé » quand son compte s'efface : « Alice vous a ajouté au groupe. » restait, avec son prénom, dans la liste et
     l'export de ceux qu'elle avait ajoutés (relevé par le gardien, 3 octobre 2026). On réécrit plutôt que de composer à l'affichage : le prénom n'est plus NULLE PART dans la base, pas seulement caché.
     `nom` : le nom d'affichage de la personne (une mention dans une conversation directe prend le nom de son auteur pour TITRE). Les notifications d'avant la migration 5 n'ont pas d'auteur connu :
     elles ne se retrouvent pas. → le nombre de notifications réécrites. */
  function notifsAnonymiser(uid, nom) {
    let n = 0;
    for (const r of Q('SELECT id, type, titre_ch FROM notification WHERE auteur = ?').all(uid)) {
      const texte = r.type === 'contact_ajoute' ? 'Un compte supprimé était dans vos contacts.' : r.type === 'contact_demande' ? 'Un compte supprimé voulait vous ajouter à ses contacts.' : r.type === 'mention' ? 'Un compte supprimé vous a mentionné.' : r.type === 'espace' ? 'Un compte supprimé a rejoint l\'espace.'
        : r.type === 'appel_manque' ? 'Un compte supprimé vous a appelé.' : r.type === 'reunion_invitation' ? 'Un compte supprimé vous a invité à une réunion.' : r.type === 'reunion_modifiee' ? 'Un compte supprimé a modifié une réunion.' : r.type === 'reunion_annulee' ? 'Un compte supprimé a annulé une réunion.'
        : 'Un compte supprimé vous a ajouté au groupe.';
      let titre = ouvrirOuNull('notification', 'titre_ch', r.id + '|titre', r.titre_ch);
      if (titre === null) titre = '';
      else if (r.type === 'mention' && nom && titre === nom) titre = 'Un compte supprimé';
      Q('UPDATE notification SET titre_ch = ?, texte_ch = ?, auteur = NULL WHERE id = ?').run(sceller('notification', 'titre_ch', r.id + '|titre', titre), sceller('notification', 'texte_ch', r.id + '|texte', texte), r.id);
      n++;
    }
    return n;
  }
  /* L'effacement. TOUT dans une transaction, rejouable (une personne déjà effacée, ou dont la suppression a été annulée entre-temps, ne perd rien).
     → { effacee, pieces: [identifiants dont l'appelant efface les FICHIERS], convs: [conversations à rafraîchir], audience: [ceux à qui dire que ce profil a changé],
         espacesOrphelins: [espaces PAYANTS que l'effacement a laissés sans membre, sans les dissoudre — voir `espaceQuitterTout`] } */
  /* ⛔ `{ rejeu: true }` : le REJEU d'un effacement après une restauration (`rejeu.js`, genre `compte`). La copie remise en service peut dater d'avant l'échéance — voire d'avant la
     demande (l'échéance n'y est pas encore posée) : le registre dit que l'effacement A EU LIEU, il se refait donc sans regarder l'échéance, et sans réécrire sa ligne (elle est déjà
     dans le registre recopié). Une personne déjà effacée ne perd rien de plus. */
  function compteEffacer(uid, { rejeu = false } = {}) {
    return tx(() => {
      const p = Q('SELECT etat, suppression_le, avatar_piece FROM personne WHERE id = ?').get(uid);
      if (!p || p.etat !== 'actif' || (!rejeu && (p.suppression_le === null || p.suppression_le > horloge()))) return { effacee: false, pieces: [], convs: [], audience: [] };
      const audience = audiencePersonne(uid);   // AVANT d'effacer les contacts (et de sortir des espaces) : c'est eux qu'il faut prévenir
      /* ⛔ SON ABONNEMENT PERSONNEL (Perso+) S'ANNULE AVEC ELLE : un compte effacé qui laisserait courir son abonnement serait prélevé pour toujours, pour quelqu'un qui n'existe plus. Depuis la DEMANDE, il ne se renouvelle déjà
         plus (`fin`) ; à l'effacement il est RÉSILIÉ, tout de suite. La résiliation est NOTÉE ici, dans la transaction de l'effacement (`abonnement_a_annuler`, `voulu` = `resilier`, terminal) — le service la rejoue chez
         Stripe jusqu'à ce que Stripe la confirme ; un échec de Stripe ne la perd pas. Rejoué après une restauration (`rejeu: true`) :
         la copie remise en service porte peut-être l'abonnement que l'effacement d'origine avait déjà fait résilier, et Stripe répond « déjà résilié ». Une session de paiement encore non résolue RESTE (le passage
         de relecture la résout : réglée, elle s'annule aussitôt) ; sans session, la ligne part avec la personne. */
      persoVersAnnulation(uid);
      const pn = Q('SELECT prenom, nom FROM personne WHERE id = ?').get(uid);
      notifsAnonymiser(uid, ((pn.prenom || '') + ' ' + (pn.nom || '')).trim());   // AVANT de vider le nom : c'est lui qu'il faut retrouver dans les titres
      const pieces = [], convs = [];
      /* ⛔ LES ESPACES D'ABORD : la personne en sort comme on en sort (la propriété passe, ou l'espace est dissous s'il n'a qu'elle), et ses canaux avec — sinon la boucle
         ci-dessous la ferait quitter un canal comme un groupe (le plus ancien membre y serait promu administrateur, ce qu'un canal n'admet pas : son rôle est celui de l'espace). */
      const sortis = espaceQuitterTout(uid, { rejeu });
      pieces.push(...sortis.pieces); convs.push(...sortis.convs);
      /* ⛔ PUIS SES RÉUNIONS : hôte, la réunion passe au plus ancien invité qui n'a pas décliné (ou part avec sa conversation faute de successeur) ; invité, sa ligne part. Avant la boucle ci-dessous : une
         conversation de réunion ne se « quitte » pas comme un groupe (personne n'y est promu administrateur de force). */
      const reunions = reunionsQuitterTout(uid, { rejeu });
      pieces.push(...reunions.pieces); convs.push(...reunions.convs);
      /* ⛔ PUIS SES APPELS : un appel en cours se termine (l'autre l'apprend), la ligne de la personne part — l'autre garde l'appel, sans nom. Rejoué avec le reste après une restauration (`rejeu`), sans rien écrire au registre. */
      const appelsReveil = appelsQuitterTout(uid);
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
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'appareil', ? FROM appareil_tel WHERE personne = ?`).run(horloge(), uid);
      Q('DELETE FROM appareil_tel WHERE personne = ?').run(uid);
      Q('DELETE FROM push WHERE uid = ?').run(uid);
      Q('DELETE FROM notification WHERE uid = ?').run(uid);
      Q('DELETE FROM contact WHERE de = ? OR vers = ?').run(uid, uid);
      if (IDENT) Q('DELETE FROM demande_contact WHERE de = ? OR vers = ?').run(uid, uid);
      if (versionActuelle() >= 12) Q('DELETE FROM appareil_mel WHERE personne = ?').run(uid);
      if (versionActuelle() >= 13) Q('DELETE FROM evenement WHERE uid = ?').run(uid);   // son agenda personnel part avec elle
      Q('DELETE FROM lien WHERE par = ?').run(uid);
      Q('DELETE FROM recherche_tel WHERE uid = ?').run(uid);
      Q('DELETE FROM msg_masque WHERE uid = ?').run(uid);
      /* le suivi des documents (migration 15) : ce que J'ai ouvert, et ce qu'on a ouvert de MES pièces — la ligne `personne` reste (anonymisée), le CASCADE ne joue pas */
      if (SUIVI) { Q('DELETE FROM piece_acces WHERE uid = ?').run(uid); Q('DELETE FROM piece_acces WHERE piece IN (SELECT id FROM piece WHERE proprio = ?)').run(uid); }
      Q('DELETE FROM journal WHERE uid = ?').run(uid);
      Q('UPDATE membre SET muet_jusqua = 0, epingle = 0, archive = 0 WHERE uid = ?').run(uid);
      /* LA définition d'un compte effacé : plus d'identité (le numéro se libère), plus de nom, plus de mot de passe, plus de réglage — l'identifiant seul demeure, pour que « l'auteur » d'un message
         reste quelqu'un (de supprimé). `origine` et `cree` demeurent : ni l'un ni l'autre ne désigne personne. */
      Q(`UPDATE personne SET email_h = NULL, email_ch = NULL, verifie_le = NULL, sel = NULL, mdp = NULL, params = NULL, prenom = '', nom = '', avatar_piece = NULL, statut = '',
           langue = 'fr', tz = 'Europe/Paris', prefs = '{}', etat = 'supprime', suppression_le = NULL, age_ok = NULL, cgu_v = NULL, essais = 0, bloque_jusqua = NULL, trouvable = 'personne'
         WHERE id = ?`).run(uid);
      if (IDENT) Q('UPDATE personne SET ident_base = NULL, ident_num = NULL WHERE id = ?').run(uid);   // l'identifiant public se libère avec le reste
      if (!rejeu) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(uid, 'compte', horloge());
      return { effacee: true, pieces, convs, audience, espacesOrphelins: sortis.orphelins, appels: appelsReveil };
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

  /* ══ RÉUNIONS PROGRAMMÉES (migration 7) ═══════════════════════════════════════════════════════════════════════════════════════
     Ce bloc range et lit : il ne décide JAMAIS d'une formule (c'est `formule.js`, par la garde PRO du manifeste), ne calcule JAMAIS une heure (c'est `calendrier.js`, appelé par les routes et le
     planificateur) et n'envoie rien (courriel, push : ce sont les routes et le planificateur). Ce qu'il tient, ce sont les INVARIANTS :
       · ⛔ UNE RÉUNION A UNE CONVERSATION (genre `reunion`) : mêmes messages, mêmes accusés, mêmes pièces, même flux, même purge. Ses participants SONT les membres de cette conversation ; la
         ligne `reunion_invite` porte en plus leur réponse et leurs rappels. L'hôte est administrateur de la conversation et a sa ligne (toujours « accepte ») ;
       · l'invité ne quitte pas la conversation d'une réunion (« Décliner » est son geste) ; l'hôte la supprime, ou l'annule ;
       · un événement `reunion` du journal est UNE ligne portée par la conversation (comme `conv_maj`) : il ne dit que « relis cette réunion » — jamais la liste des invités, qui pèse ;
       · supprimer une réunion supprime sa conversation : le registre des purges note la CONVERSATION (une restauration d'une archive plus ancienne ne la ramène pas) ; annuler se note aussi
         (`reunion_annulee`), parce qu'une archive d'avant rendrait une réunion annulée aux gens qui s'y rendraient ; retirer un invité se note (`reunion_invite`) ;
       · quand l'HORAIRE change, la réponse des invités redevient « en attente » : celui qui avait décliné l'ancienne heure ne doit pas manquer la nouvelle, faute de rappel. */
  const REUNIONS_HOTE_MAX = 300;      // réunions non finies qu'une personne tient comme hôte
  const INVITES_MAX = 100;            // invités d'une réunion, l'hôte non compris (SERVEUR.md § 3.3)
  const aadReunion = (id, champ) => id + '|' + champ;
  const listeEntiers = (texte) => { try { const a = JSON.parse(texte); return Array.isArray(a) ? a.filter(Number.isInteger) : []; } catch (e) { return []; } };
  function reunionBrute(id) {
    return Q('SELECT id, conv, hote, titre_ch, lieu_ch, debut, fin, tz, rep, n, jusqua, fin_serie, rappels, annulee, version, horaire_le, prochain, attente, cree, maj FROM reunion WHERE id = ?').get(id) || null;
  }
  const reunionTitre = (r) => ouvrirOuNull('reunion', 'titre_ch', aadReunion(r.id, 'titre'), r.titre_ch);
  const reunionLieu = (r) => r.lieu_ch ? ouvrirOuNull('reunion', 'lieu_ch', aadReunion(r.id, 'lieu'), r.lieu_ch) : '';
  const reunionRang = (r) => {
    const titre = reunionTitre(r), lieu = reunionLieu(r);
    const o = {
      id: r.id, conv: r.conv, titre: titre === null ? '' : titre, lieu: lieu === null ? '' : lieu, debut: num(r.debut), fin: num(r.fin), tz: r.tz, repetition: r.rep,
      n: r.n === null || r.n === undefined ? null : num(r.n), jusqua: r.jusqua || null, annulee: !!r.annulee, attente: !!r.attente, version: num(r.version), rappels: listeEntiers(r.rappels), cree: num(r.cree), maj: num(r.maj),
    };
    if (titre === null || lieu === null) o.illisible = true;
    return o;
  };
  const personneCourte = (viewer, id) => { const p = personneParId(id); return p ? { id: p.id, prenom: p.prenom, nom: p.nom, avatar: avatarPour(viewer, p.id, p.avatar) } : null; };

  /* La réunion « pour un participant » : `null` pour inexistante COMME pour « tu n'es pas invité » (404 dans les deux cas, jamais 403). */
  function reunionPourMembre(id, uid) {
    const moi = Q('SELECT statut, rappels FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, uid);
    if (!moi) return null;
    const r = reunionBrute(id); if (!r) return null;
    const rang = reunionRang(r);
    const invites = Q(`SELECT p.id, p.prenom, p.nom, p.avatar_piece, i.statut FROM reunion_invite i JOIN personne p ON p.id = i.uid
                       WHERE i.reunion = ? ORDER BY (i.uid = ?) DESC, i.cree, p.prenom, p.nom, p.id`).all(id, r.hote)
      .map(x => ({ id: x.id, prenom: x.prenom, nom: x.nom, avatar: avatarPour(uid, x.id, x.avatar_piece), statut: x.statut, hote: x.id === r.hote }));
    rang.hote = personneCourte(uid, r.hote);
    const perso = moi.rappels !== null && moi.rappels !== undefined;
    return { reunion: rang, invites, moi: { hote: uid === r.hote, statut: moi.statut, rappels: perso ? listeEntiers(moi.rappels) : rang.rappels, rappels_perso: perso } };
  }
  /* Les réunions d'une personne qui PEUVENT toucher la fenêtre [du, au) — une présélection : une série commencée avant la fenêtre est gardée, ses occurrences se calculent à l'appelant
     (`calendrier.js`). Une version courte de chaque (pas la liste des invités) : l'agenda en montre beaucoup. */
  function reunionsDe(uid, du, au, ids) {
    /* ⛔ L'AGENDA D'UN INVITÉ NE SE LAISSE PAS MASQUER. Les 600 places se donnaient dans l'ordre du DÉBUT de la série : six cents séries d'il y a vingt-six ans, terminées, prenaient toutes les places et
       l'invitation d'aujourd'hui n'apparaissait nulle part — sans autre moyen d'en sortir. Deux règles : une série TERMINÉE avant la fenêtre est écartée ici, par `fin_serie` (NULL : une série « Jamais »,
       toujours gardée) ; et l'ordre garde ce qui vient d'abord (`prochain`, la prochaine occurrence non commencée), ce qui n'a plus de prochaine occurrence passe après. */
    return Q(`SELECT r.id, r.conv, r.hote, r.titre_ch, r.lieu_ch, r.debut, r.fin, r.tz, r.rep, r.n, r.jusqua, r.rappels, r.annulee, r.attente, r.version, r.cree, r.maj, i.statut AS mon_statut, i.rappels AS mes_rappels,
                     (SELECT COUNT(*) FROM reunion_invite x WHERE x.reunion = r.id) AS participants_n
              FROM reunion_invite i JOIN reunion r ON r.id = i.reunion
              WHERE i.uid = ? AND r.debut < ? AND (r.rep <> 'aucune' OR r.fin > ?) AND (r.fin_serie IS NULL OR r.fin_serie > ?)
                AND (? IS NULL OR r.id IN (SELECT value FROM json_each(?)))
              ORDER BY (r.prochain IS NULL), r.prochain, r.debut, r.id LIMIT 600`).all(uid, au, du, du, ids ? 1 : null, JSON.stringify(ids || [])).map(r => {
      const rang = reunionRang(r);
      rang.hote = personneCourte(uid, r.hote);
      rang.participants_n = num(r.participants_n);
      rang.participants = Q(`SELECT p.id, p.prenom, p.nom, p.avatar_piece FROM reunion_invite x JOIN personne p ON p.id = x.uid WHERE x.reunion = ? ORDER BY (x.uid = ?) DESC, x.cree, p.id LIMIT 4`).all(r.id, r.hote)
        .map(x => ({ id: x.id, prenom: x.prenom, nom: x.nom, avatar: avatarPour(uid, x.id, x.avatar_piece) }));
      const perso = r.mes_rappels !== null && r.mes_rappels !== undefined;
      rang.moi = { hote: uid === r.hote, statut: r.mon_statut, rappels: perso ? listeEntiers(r.mes_rappels) : rang.rappels, rappels_perso: perso };
      return rang;
    });
  }
  const reunionParticipants = (id) => Q('SELECT uid FROM reunion_invite WHERE reunion = ? ORDER BY cree, uid').all(id).map(r => r.uid);
  /* CE QUE DEUX PERSONNES ONT EN COMMUN (la fiche d'un contact, 7 octobre 2026 : « voir s'ils participent à la même réunion ») — vu par `a` : seulement ce dont `a` fait PARTIE.
     Rien n'en sort que `a` ne pourrait lire en ouvrant chaque réunion, chaque groupe, chaque espace : la liste de ses invités, de ses membres. ⛔ Jamais l'agenda de `b` au-delà.
     Les réunions : les identifiants et le statut de `b` (la route les habille avec `reunionsDe(a)`, qui calcule les occurrences) ; les groupes et canaux (pas les directes, pas les réunions) ;
     les espaces. Plafonnés : une fiche, pas un export. */
  function enCommun(a, b, du, au) {
    /* les réunions COMMUNES qui peuvent toucher [du, au) — les mêmes bornes que `reunionsDe`, mais sur les seules réunions partagées : une personne à 600 réunions ne fait pas
       calculer tout son agenda pour une fiche, et une réunion commune n'est jamais éclipsée par les autres (relecture du gardien, 7 octobre 2026) */
    const reunions = new Map(Q(`SELECT i.reunion AS id, j.statut AS statut FROM reunion_invite i JOIN reunion_invite j ON j.reunion = i.reunion AND j.uid = ? JOIN reunion r ON r.id = i.reunion
                               WHERE i.uid = ? AND r.annulee = 0 AND r.debut < ? AND (r.rep <> 'aucune' OR r.fin > ?) AND (r.fin_serie IS NULL OR r.fin_serie > ?)
                               ORDER BY (r.prochain IS NULL), r.prochain, r.debut, r.id LIMIT 40`).all(b, a, au, du, du).map(r => [r.id, r.statut]));
    const groupes = Q(`SELECT c.id, c.type, c.nom_ch FROM conversation c
                         JOIN membre x ON x.conv = c.id AND x.uid = ? AND x.quitte_le IS NULL
                         JOIN membre y ON y.conv = c.id AND y.uid = ? AND y.quitte_le IS NULL
                       WHERE c.type IN ('groupe', 'canal') ORDER BY c.dernier_ts DESC, c.id LIMIT 30`).all(a, b).map(c => ({ id: c.id, type: c.type, nom: nomDe(c.id, c.nom_ch) || '' }));
    const espaces = Q(`SELECT e.id, e.nom_ch FROM espace e JOIN espace_membre x ON x.espace = e.id AND x.uid = ? JOIN espace_membre y ON y.espace = e.id AND y.uid = ? ORDER BY e.cree, e.id LIMIT 30`)
      .all(a, b).map(e => ({ id: e.id, nom: nomEspace(e) || '' }));
    return { reunions, groupes, espaces };
  }
  /* Le LAISSEZ-PASSER léger des gardes R et H (`app.js`) : { id, conv, hote (cette personne l'est-elle ?), annulee, statut } — `null` pour inexistante COMME pour « tu n'es pas invité ». Pas la liste
     des invités : chaque route lit ce dont elle a besoin. */
  function reunionAcces(id, uid) {
    const r = Q('SELECT u.id AS id, u.conv AS conv, u.hote AS hote, u.annulee AS annulee, i.statut AS statut FROM reunion u JOIN reunion_invite i ON i.reunion = u.id AND i.uid = ? WHERE u.id = ?').get(uid, id);
    return r ? { id: r.id, conv: r.conv, hote: r.hote === uid, annulee: !!r.annulee, statut: r.statut } : null;
  }

  /* Créer : la conversation, ses membres, la réunion, les lignes d'invitation, le message d'ouverture — TOUT dans une transaction. `prochain` : le début de la première occurrence non commencée
     (calculé par l'appelant avec `calendrier.js`), ou null. Les invités sont déjà jugés par l'appelant (`peutEcrire`). */
  /* ⛔ `plafond` : le nombre de PERSONNES d'une réunion, organisateur compris — la route le demande à `formule.plafondReunion(organisateur)` (une seule constante, `formule.js`) ; le stockage ne connaît ni les forfaits
     ni les entreprises. Refusé : `reunion_pleine`, qui porte le plafond (`max`) que la page écrit. Une réunion déjà plus grande (d'avant la règle) n'est pas rognée : on n'y AJOUTE seulement plus personne. */
  const pleine = (plafond) => Object.assign(erreur('reunion_pleine'), { max: plafond });
  function reunionCreer({ hote, titre, lieu, debut, fin, tz, rep, n, jusqua, rappels, invites, prochain, finSerie, attente, plafond = INVITES_MAX + 1 }) {
    return tx(() => {
      if (num(Q('SELECT COUNT(*) AS n FROM reunion WHERE hote = ? AND annulee = 0 AND prochain IS NOT NULL').get(hote).n) >= REUNIONS_HOTE_MAX) throw erreur('trop_de_reunions');
      const uids = Array.from(new Set(invites)).filter(u => u !== hote);
      if (uids.length > INVITES_MAX) throw erreur('trop_d_invites');
      if (uids.length + 1 > plafond) throw pleine(plafond);
      const id = nouvelId('r'), conv = nouvelId('c'), t = horloge();
      Q(`INSERT INTO conversation(id, type, nom_ch, dernier_ts, cree_par, cree) VALUES(?, 'reunion', ?, ?, ?, ?)`).run(conv, sceller('conversation', 'nom_ch', conv + '|nom', titre), t, hote, t);
      Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'admin', 1, ?)`).run(conv, hote, t);
      for (const u of uids) Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, 'membre', 1, ?)`).run(conv, u, t);
      Q('INSERT INTO reunion(id, conv, hote, titre_ch, lieu_ch, debut, fin, tz, rep, n, jusqua, fin_serie, rappels, annulee, version, horaire_le, prochain, attente, cree, maj) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)')
        .run(id, conv, hote, sceller('reunion', 'titre_ch', aadReunion(id, 'titre'), titre), lieu ? sceller('reunion', 'lieu_ch', aadReunion(id, 'lieu'), lieu) : null,
          debut, fin, tz, rep, n || null, jusqua || null, finSerie === undefined ? null : finSerie, JSON.stringify(rappels), t, prochain === undefined ? null : prochain, attente ? 1 : 0, t, t);
      Q(`INSERT INTO reunion_invite(reunion, uid, statut, cree, repondu) VALUES(?, ?, 'accepte', ?, ?)`).run(id, hote, t, t);
      for (const u of uids) Q(`INSERT INTO reunion_invite(reunion, uid, statut, invite_par, cree) VALUES(?, ?, 'attente', ?, ?)`).run(id, u, hote, t);
      messageSysteme(conv, hote, { k: 'reunion_creee' });
      return { id, conv, invites: uids, gid: journalAjouter('reunion', conv, null, id) };
    });
  }
  /* Modifier : seuls les champs PASSÉS changent. Un changement d'HORAIRE (début, fin, fuseau, répétition, fin de répétition) date `horaire_le`, remet la réponse des invités « en attente » et
     pose le nouveau `prochain` (calculé par l'appelant). → { change, horaire, titre, lieu, gid } */
  function reunionModifier({ id, par, titre, lieu, debut, fin, tz, rep, n, jusqua, rappels, prochain, finSerie, attente }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (r.annulee) throw erreur('reunion_annulee');
      const t = horloge();
      const ancienTitre = reunionTitre(r), ancienLieu = reunionLieu(r);
      const nouveau = {
        titre: titre !== undefined ? titre : ancienTitre, lieu: lieu !== undefined ? lieu : ancienLieu,
        debut: debut !== undefined ? debut : num(r.debut), fin: fin !== undefined ? fin : num(r.fin), tz: tz !== undefined ? tz : r.tz, rep: rep !== undefined ? rep : r.rep,
        n: n !== undefined ? (n || null) : (r.n === null ? null : num(r.n)), jusqua: jusqua !== undefined ? (jusqua || null) : (r.jusqua || null),
        rappels: rappels !== undefined ? JSON.stringify(rappels) : r.rappels,
      };
      const horaire = nouveau.debut !== num(r.debut) || nouveau.fin !== num(r.fin) || nouveau.tz !== r.tz || nouveau.rep !== r.rep || nouveau.n !== (r.n === null ? null : num(r.n)) || nouveau.jusqua !== (r.jusqua || null);
      const titreChange = nouveau.titre !== ancienTitre, lieuChange = nouveau.lieu !== ancienLieu;
      const rappelsChange = nouveau.rappels !== r.rappels;
      const attenteVoulue = attente === undefined ? (r.attente ? 1 : 0) : (attente ? 1 : 0), attenteChange = attenteVoulue !== (r.attente ? 1 : 0);
      if (!horaire && !titreChange && !lieuChange && !rappelsChange && !attenteChange) return { change: false, horaire: false, titre: false, lieu: false, gid: 0 };
      Q('UPDATE reunion SET titre_ch = ?, lieu_ch = ?, debut = ?, fin = ?, tz = ?, rep = ?, n = ?, jusqua = ?, fin_serie = ?, rappels = ?, attente = ?, version = version + 1, maj = ?, horaire_le = ?, prochain = ? WHERE id = ?')
        .run(titreChange ? sceller('reunion', 'titre_ch', aadReunion(id, 'titre'), nouveau.titre) : r.titre_ch,
          lieuChange ? (nouveau.lieu ? sceller('reunion', 'lieu_ch', aadReunion(id, 'lieu'), nouveau.lieu) : null) : r.lieu_ch,
          nouveau.debut, nouveau.fin, nouveau.tz, nouveau.rep, nouveau.n, nouveau.jusqua, horaire ? (finSerie === undefined ? null : finSerie) : (r.fin_serie === null || r.fin_serie === undefined ? null : num(r.fin_serie)),
          nouveau.rappels, attenteVoulue, t, horaire ? t : num(r.horaire_le),
          horaire ? (prochain === undefined ? null : prochain) : (r.prochain === null ? null : num(r.prochain)), id);
      if (titreChange) Q('UPDATE conversation SET nom_ch = ? WHERE id = ?').run(sceller('conversation', 'nom_ch', r.conv + '|nom', nouveau.titre), r.conv);
      if (horaire) Q(`UPDATE reunion_invite SET statut = 'attente', repondu = NULL WHERE reunion = ? AND uid <> ?`).run(id, r.hote);
      if (horaire || titreChange || lieuChange) messageSysteme(r.conv, par, { k: 'reunion_modifiee', horaire });
      return { change: true, horaire, titre: titreChange, lieu: lieuChange, gid: journalAjouter('reunion', r.conv, null, id) };
    });
  }
  /* Annuler : la réunion reste (les invités la voient « annulée », son chat aussi), plus aucun rappel ne part. Se note (`reunion_annulee`) : une archive d'avant la rendrait active. */
  function reunionAnnuler({ id, par }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (r.annulee) return { change: false, gid: 0 };
      const t = horloge();
      Q('UPDATE reunion SET annulee = 1, prochain = NULL, version = version + 1, maj = ? WHERE id = ?').run(t, id);
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'reunion_annulee', t);
      const salle = salleReunionFinir(id, 'annulee');          // la salle ouverte (des gens y sont) finit avec elle : ses occupants à réveiller
      messageSysteme(r.conv, par, { k: 'reunion_annulee' });
      return { change: true, gid: journalAjouter('reunion', r.conv, null, id), salle: salle ? Object.keys(salle.gids) : [] };
    });
  }
  /* Supprimer : la réunion part avec sa conversation, ses messages et ses pièces. Chaque participant reçoit un événement ADRESSÉ (l'événement de conversation ne lui arriverait plus : la
     conversation n'existe plus). → { pieces, participants, conv } */
  function reunionSupprimer({ id, par }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      const participants = reunionParticipants(id);
      salleReunionFinir(id, 'supprimee');         // la salle ouverte finit AVANT que sa conversation disparaisse
      for (const u of participants) journalAjouter('reunion', null, u, id);
      const x = convSupprimer(r.conv);   // notée au registre (genre `conversation`) ; la réunion, ses invitations et ses rappels suivent (ON DELETE CASCADE)
      return { pieces: x.pieces, participants, conv: r.conv };
    });
  }
  /* Inviter : les nouveaux entrent dans la conversation (un message d'arrivée) et reçoivent leur ligne. Une personne déjà invitée est ignorée. → { ajoutes, gid } */
  function reunionInviter({ id, par, uids, plafond = INVITES_MAX + 1 }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (r.annulee) throw erreur('reunion_annulee');
      const total = num(Q('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?').get(id).n), deja = total - 1;
      const nouveaux = [];
      for (const u of Array.from(new Set(uids))) {
        if (u === par || Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, u)) continue;
        if (deja + nouveaux.length >= INVITES_MAX) throw erreur('trop_d_invites');
        if (total + nouveaux.length >= plafond) throw pleine(plafond);          // la réunion compterait plus de personnes que son plafond : personne n'est ajouté (la transaction ne garde rien)
        nouveaux.push(u);
      }
      if (!nouveaux.length) return { ajoutes: [], gid: 0 };
      membresAjouter({ conv: r.conv, par, uids: nouveaux, max: INVITES_MAX + 1 });
      const t = horloge();
      for (const u of nouveaux) Q(`INSERT INTO reunion_invite(reunion, uid, statut, invite_par, cree) VALUES(?, ?, 'attente', ?, ?)`).run(id, u, par, t);
      Q('UPDATE reunion SET version = version + 1, maj = ? WHERE id = ?').run(t, id);
      return { ajoutes: nouveaux, gid: journalAjouter('reunion', r.conv, null, id) };
    });
  }
  /* Retirer un invité (l'hôte ne se retire pas : il annule ou supprime). Il sort de la conversation (noté, `groupe_membre`) ET de la réunion (noté, `reunion_invite`) ; son agenda en est prévenu par
     un événement adressé. */
  function reunionRetirer({ id, par, uid }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (uid === r.hote) throw erreur('hote_non_retirable');
      if (!Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, uid)) throw erreur('introuvable');
      const t = horloge();
      Q('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ?').run(id, uid);
      Q('DELETE FROM rappel WHERE reunion = ? AND uid = ?').run(id, uid);
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id + '|' + uid + '|' + t, 'reunion_invite', t);
      membreRetirer({ conv: r.conv, par, uid });
      Q('UPDATE reunion SET version = version + 1, maj = ? WHERE id = ?').run(t, id);
      journalAjouter('reunion', null, uid, id);
      return { gid: journalAjouter('reunion', r.conv, null, id) };
    });
  }
  /* ⛔ QUITTER UNE RÉUNION, c'est la sortie de l'INVITÉ — la seule : bloquer quelqu'un n'en retire personne, et une invitation qu'on n'a pas voulue ne devait pas rester dans un agenda sans issue
     (relecture du gardien, important n° 3). Même geste que le retrait par l'hôte, du côté de celui qui part : la ligne d'invitation part (noté, `reunion_invite`), la personne sort de la conversation de
     la réunion comme d'un groupe (noté, `groupe_membre` ; l'hôte et les autres lisent « a quitté la réunion »), ses rappels partent, son agenda est prévenu par un événement ADRESSÉ. L'hôte ne quitte pas
     (il annule ou supprime) ; qui n'est pas invité reçoit `introuvable`, comme pour une réunion qui n'existe pas. L'hôte peut réinviter. → { gid, conv, hote } */
  function reunionQuitter({ id, uid }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (!Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, uid)) throw erreur('introuvable');
      if (uid === r.hote) throw erreur('hote_non_quittable');
      const t = horloge();
      Q('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ?').run(id, uid);
      Q('DELETE FROM rappel WHERE reunion = ? AND uid = ?').run(id, uid);
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id + '|' + uid + '|' + t, 'reunion_invite', t);
      if (Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid)) membreQuitter({ conv: r.conv, uid });   // note `groupe_membre`, écrit « a quitté la réunion »
      Q('UPDATE reunion SET version = version + 1, maj = ? WHERE id = ?').run(t, id);
      journalAjouter('reunion', null, uid, id);
      return { gid: journalAjouter('reunion', r.conv, null, id), conv: r.conv, hote: r.hote };
    });
  }
  /* La réponse d'un invité. L'hôte n'a pas à répondre (il est « accepte » d'office). → { change, gid } */
  function reunionRepondre({ id, uid, statut }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      const i = Q('SELECT statut FROM reunion_invite WHERE reunion = ? AND uid = ?').get(id, uid); if (!i) throw erreur('introuvable');
      if (uid === r.hote) throw erreur('hote_reponse');
      if (r.annulee) throw erreur('reunion_annulee');
      if (i.statut === statut) return { change: false, gid: 0 };
      Q('UPDATE reunion_invite SET statut = ?, repondu = ? WHERE reunion = ? AND uid = ?').run(statut, horloge(), id, uid);
      return { change: true, gid: journalAjouter('reunion', r.conv, null, id) };
    });
  }
  /* Les rappels de CETTE personne pour cette réunion : une liste (même vide : « aucun »), ou null = le réglage de la réunion. La date du choix borne les rappels dus (aucun rappel dont l'échéance la précède). */
  function reunionRappelsPoser({ id, uid, rappels }) {
    return tx(() => {
      const r = reunionBrute(id); if (!r) throw erreur('introuvable');
      if (!num(Q('UPDATE reunion_invite SET rappels = ?, rappels_le = ? WHERE reunion = ? AND uid = ?').run(rappels === null ? null : JSON.stringify(rappels), horloge(), id, uid).changes)) throw erreur('introuvable');
      return { gid: journalAjouter('reunion', null, uid, id) };
    });
  }

  /* ── la salle d'une réunion qui disparaît (annulée, supprimée, sans hôte) finit avec elle : des gens y étaient peut-être ── */
  function salleReunionFinir(reunion, motif) {
    const id = salleDeReunion(reunion); if (!id) return null;
    const a = appelBrut(id);
    return salleFinirDans(id, a.etat === 'en_cours' ? 'fini' : 'annule', motif, horloge());
  }

  /* ══ LE LIEN D'INVITÉ D'UNE RÉUNION (migration 9) ═══════════════════════════════════════════════════════════════════════════════════════════════
     Un code de 128 bits, jamais rangé en clair : son EMPREINTE (`code_h`, HMAC) sert à le retrouver, le code SCELLÉ (`code_ch`) à le redire à l'hôte seul. L'hôte le lit (`reunionLien`) et le RENOUVELLE
     (`reunionLienRenouveler`) : le nouveau remplace l'ancien, qui MEURT — et l'ancien est NOTÉ au registre des purges (genre `reunion_lien`) : une restauration d'une archive d'avant le renouvellement ne
     rend pas la porte à qui connaissait l'ancien code. Le lien meurt aussi seul : annulée, ou une journée après la fin de la dernière occurrence ; une réunion qui se répète « jamais » ne finit pas, son lien non plus
     (tant qu'on ne le renouvelle pas). Expiré, renouvelé, annulé, inconnu : la MÊME réponse (`lien_invalide`). */
  const LIEN_GRACE_MS = 24 * 3600000;
  const RE_CODE_REUNION = /^[A-Za-z0-9_-]{22}$/;
  const aadCode = (id) => id + '|code';
  const empreinteCode = (code) => scelleur.hmac('reunion', 'code_h', code);
  function reunionLienPoser(id, t) {
    const code = crypto.randomBytes(16).toString('base64url');
    Q('UPDATE reunion SET code_h = ?, code_ch = ?, code_le = ? WHERE id = ?').run(empreinteCode(code), sceller('reunion', 'code_ch', aadCode(id), code), t, id);
    return code;
  }
  /* Le lien de l'hôte : celui qui existe, sinon un neuf. → { code } */
  function reunionLien({ id, par }) {
    return tx(() => {
      const r = Q('SELECT id, hote, annulee, code_h, code_ch FROM reunion WHERE id = ?').get(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (r.annulee) throw erreur('reunion_annulee');
      if (r.code_h && r.code_ch) { const c = ouvrirOuNull('reunion', 'code_ch', aadCode(id), r.code_ch); if (c !== null) return { code: c }; }
      return { code: reunionLienPoser(id, horloge()) };
    });
  }
  /* Renouveler : l'ancien code est noté puis remplacé, dans la même transaction. → { code, ancien: avait-il un lien ? } */
  function reunionLienRenouveler({ id, par }) {
    return tx(() => {
      const r = Q('SELECT id, hote, annulee, code_h FROM reunion WHERE id = ?').get(id); if (!r) throw erreur('introuvable');
      if (r.hote !== par) throw erreur('interdit');
      if (r.annulee) throw erreur('reunion_annulee');
      const t = horloge();
      if (r.code_h) Q('INSERT INTO purge(objet, genre, quand) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM purge WHERE objet = ? AND genre = ?)').run(r.code_h, 'reunion_lien', t, r.code_h, 'reunion_lien');
      const code = reunionLienPoser(id, t);
      Q('UPDATE reunion SET version = version + 1, maj = ? WHERE id = ?').run(t, id);
      return { code, ancien: !!r.code_h };
    });
  }
  /* Ce que le code désigne, ou null (la même chose pour un code inconnu, renouvelé, annulé ou échu). Ne rend que ce qu'il faut pour DÉCIDER de rejoindre : jamais un participant. */
  function reunionParCode(code) {
    if (typeof code !== 'string' || !RE_CODE_REUNION.test(code)) return null;
    const r = Q('SELECT id, fin_serie, rep FROM reunion WHERE code_h = ?').get(empreinteCode(code)); if (!r) return null;
    const b = reunionBrute(r.id); if (!b || b.annulee) return null;
    /* `fin_serie` d'une SÉRIE porte déjà un jour de marge au-delà de sa dernière occurrence (`calendrier.finDeSerie`) ; celle d'une réunion seule est sa fin : on y ajoute le jour. Le lien meurt donc un jour après la fin. */
    const grace = r.rep === 'aucune' ? LIEN_GRACE_MS : 0;
    if (r.fin_serie !== null && r.fin_serie !== undefined && num(r.fin_serie) + grace < horloge()) return null;
    const rang = reunionRang(b);
    return { id: b.id, conv: b.conv, hote: b.hote, titre: rang.titre, debut: rang.debut, fin: rang.fin, tz: rang.tz, repetition: rang.repetition, n: rang.n, jusqua: rang.jusqua, attente: rang.attente };
  }
  /* ⛔ ENTRER PAR LE LIEN : la personne devient INVITÉE de la réunion (« accepté »), membre de sa conversation — la discussion de la réunion est ouverte à qui est dedans —, et paraît dans son agenda. Une
     personne déjà invitée ne change pas. Le plafond des invités (cent) tient pour les liens aussi. → { reunion, ajoute, gid } */
  function reunionInviteParCode({ code, uid, plafonds }) {
    return tx(() => {
      const r = reunionParCode(code); if (!r) throw erreur('lien_invalide');
      if (Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(r.id, uid)) return { reunion: r.id, ajoute: false, gid: 0 };
      const total = num(Q('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?').get(r.id).n);
      if (total > INVITES_MAX) throw erreur('trop_d_invites');
      /* ⛔ LA ONZIÈME PERSONNE n'entre pas par le lien : `plafonds(organisateur)` (la route le donne : `formule.plafondReunion`) dit combien de personnes la réunion compte au plus, l'organisateur compris. Une personne DÉJÀ
         invitée (ci-dessus) n'est jamais refusée — elle compte déjà. */
      const plafond = typeof plafonds === 'function' ? plafonds(r.hote) : INVITES_MAX + 1;
      if (total >= plafond) throw pleine(plafond);
      try { membresAjouter({ conv: r.conv, par: null, uids: [uid], max: INVITES_MAX + 1 }); }
      catch (e) { if (e && e.code === 'groupe_plein') throw erreur('trop_d_invites'); throw e; }
      const t = horloge();
      Q(`INSERT INTO reunion_invite(reunion, uid, statut, invite_par, cree, repondu) VALUES(?, ?, 'accepte', NULL, ?, ?)`).run(r.id, uid, t, t);
      Q('UPDATE reunion SET version = version + 1, maj = ? WHERE id = ?').run(t, r.id);
      return { reunion: r.id, ajoute: true, gid: journalAjouter('reunion', r.conv, null, r.id) };
    });
  }

  /* ── pour le planificateur ── */
  /* Le bail : une seule instance envoie les rappels. Pris (ou renouvelé) tant qu'il est libre, expiré, ou le sien. Un arrêt brutal ne le rend pas : il EXPIRE (`ttlMs`). → vrai si on le tient. */
  function bailPrendre({ proprietaire, ttlMs }) {
    return tx(() => {
      const t = horloge();
      const b = Q('SELECT proprietaire, expire FROM planif_bail WHERE id = 1').get();
      if (b && b.proprietaire !== proprietaire && num(b.expire) > t) return false;
      Q(`INSERT INTO planif_bail(id, proprietaire, pris, expire) VALUES(1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET pris = CASE WHEN planif_bail.proprietaire = excluded.proprietaire THEN planif_bail.pris ELSE excluded.pris END, proprietaire = excluded.proprietaire, expire = excluded.expire`).run(proprietaire, t, t + ttlMs);
      return true;
    });
  }
  function bailRendre(proprietaire) { return num(Q('DELETE FROM planif_bail WHERE id = 1 AND proprietaire = ?').run(proprietaire).changes) > 0; }
  function bailLire() { const b = Q('SELECT proprietaire, pris, expire FROM planif_bail WHERE id = 1').get(); return b ? { proprietaire: b.proprietaire, pris: num(b.pris), expire: num(b.expire) } : null; }
  /* Les réunions dont la prochaine occurrence commence avant `avant` (instant UTC) : celles que le planificateur regarde. */
  function reunionsARappeler(avant, limite = 200) {
    return Q('SELECT id FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL AND prochain <= ? ORDER BY prochain, id LIMIT ?').all(avant, Math.max(1, limite | 0)).map(r => r.id);
  }
  /* ⛔ La même liste, PAR TRANCHES : celles qui commencent dans ]depuis, avant], dans l'ordre (prochain, id), à partir de la clé `apres` ({ prochain, id }, exclue) — la CLÉ de reprise d'un tour que son budget a coupé.
     Une clé et non un rang : entre deux tours des réunions sortent de la liste (leur prochaine occurrence a changé) et un rang glisserait, faisant sauter celles qui étaient juste derrière. → [{ id, prochain }] */
  function reunionsARappelerDe({ avant, depuis = -1, apres = null, limite = 200 }) {
    const a = apres || { prochain: -1, id: '' };
    return Q(`SELECT id, prochain FROM reunion WHERE annulee = 0 AND prochain IS NOT NULL AND prochain <= ? AND prochain > ? AND (prochain > ? OR (prochain = ? AND id > ?)) ORDER BY prochain, id LIMIT ?`)
      .all(avant, depuis, a.prochain, a.prochain, a.id, Math.max(1, limite | 0)).map(r => ({ id: r.id, prochain: num(r.prochain) }));
  }
  /* Une réunion et ses participants qui n'ont pas décliné (et dont le compte est vivant), pour juger les rappels. */
  function reunionPlanif(id) {
    const r = reunionBrute(id); if (!r) return null;
    const titre = reunionTitre(r);
    const participants = Q(`SELECT i.uid AS uid, i.statut AS statut, i.rappels AS rappels, i.rappels_le AS rappels_le, i.cree AS cree FROM reunion_invite i JOIN personne p ON p.id = i.uid
                            WHERE i.reunion = ? AND i.statut <> 'decline' AND p.etat = 'actif' ORDER BY i.cree, i.uid`).all(id)
      .map(x => ({ uid: x.uid, statut: x.statut, rappels: x.rappels === null || x.rappels === undefined ? null : listeEntiers(x.rappels), rappels_le: x.rappels_le === null || x.rappels_le === undefined ? 0 : num(x.rappels_le), cree: num(x.cree) }));
    return { id: r.id, conv: r.conv, hote: r.hote, titre: titre === null ? '' : titre, debut: num(r.debut), fin: num(r.fin), tz: r.tz, rep: r.rep, n: r.n === null ? null : num(r.n), jusqua: r.jusqua || null,
      defaut: listeEntiers(r.rappels), horaire_le: num(r.horaire_le), prochain: r.prochain === null ? null : num(r.prochain), participants };
  }
  function reunionProchainPoser(id, prochain) { return num(Q('UPDATE reunion SET prochain = ? WHERE id = ?').run(prochain, id).changes); }
  /* Un rappel part UNE seule fois : sa ligne au registre et la notification s'écrivent dans la MÊME transaction, la clé primaire (réunion, occurrence, personne, minutes) fait le reste.
     → la notification créée, ou null si ce rappel était déjà parti. */
  function rappelEnvoyer({ reunion, occurrence, uid, avant, avants, titre, texte, cible }) {
    return tx(() => {
      /* `avants` : plusieurs délais échus pour la même personne et la même occurrence (un arrêt les a laissés s'accumuler) — UNE notification les couvre tous, et tous sont notés : le
         plus court ne repart pas dix secondes après le plus long. Un délai déjà noté ne compte pas : si TOUS le sont, rien ne part. */
      let neufs = 0;
      for (const a of (Array.isArray(avants) && avants.length ? avants : [avant])) neufs += num(Q('INSERT OR IGNORE INTO rappel(reunion, occurrence, uid, avant, ts) VALUES(?, ?, ?, ?, ?)').run(reunion, occurrence, uid, a, horloge()).changes);
      if (neufs < 1) return null;
      return notifCreer({ uid, type: 'reunion_rappel', titre, texte, cible });
    });
  }
  /* ⛔ TOUS LES RAPPELS D'UNE RÉUNION, DANS UNE SEULE TRANSACTION : un COMMIT (donc un fsync, la base est en `synchronous=FULL`) par RÉUNION et non par rappel. Trois cents réunions de cent personnes,
     c'était trente mille COMMIT dans un seul tour de planificateur — trente-quatre secondes pendant lesquelles le service ne répondait plus. Le tout ou rien tient pour la réunion : un échec
     défait ses rappels ET leurs lignes au registre, le tour suivant les reprend. → un tableau, dans l'ordre du lot : la notification créée, ou null si ce rappel était déjà parti. */
  function rappelsEnvoyer(lot) { return tx(() => lot.map(x => rappelEnvoyer(x))); }
  const rappelDejaEnvoye = (reunion, occurrence, uid, avant) => !!Q('SELECT 1 AS x FROM rappel WHERE reunion = ? AND occurrence = ? AND uid = ? AND avant = ?').get(reunion, occurrence, uid, avant);
  /* Le registre d'UNE réunion en une lecture (au lieu de quatre par personne et par occurrence) : l'ensemble des clés « occurrence|personne|minutes ». */
  function rappelsEnvoyesDe(reunion) {
    const s = new Set();
    for (const r of Q('SELECT occurrence, uid, avant FROM rappel WHERE reunion = ?').all(reunion)) s.add(num(r.occurrence) + '|' + r.uid + '|' + num(r.avant));
    return s;
  }
  /* Le registre ne grossit pas : un rappel d'une occurrence passée depuis plus de `avant` n'a plus rien à empêcher. */
  function rappelsElaguer(avant) { return num(Q('DELETE FROM rappel WHERE occurrence < ?').run(avant).changes); }
  /* La charge qui part en push pour un rappel ou une notification de réunion est re-jugée à l'instant de partir : la réunion existe, la personne y est, elle n'est pas annulée, et — pour un rappel — l'occurrence n'a pas commencé. */
  function reunionEncore({ id, uid, occurrence, sourdine }) {
    const r = Q(`SELECT r.annulee AS annulee, r.conv AS conv, i.statut AS statut FROM reunion r JOIN reunion_invite i ON i.reunion = r.id AND i.uid = ? WHERE r.id = ?`).get(uid, id);
    if (!r) return false;
    /* ⛔ LA SOURDINE de la conversation de la réunion coupe les notifications de ses MODIFICATIONS (`sourdine: true`) — jamais un rappel, jamais une annulation (l'appelant ne la demande pas) */
    if (sourdine === true) { const m = Q('SELECT muet_jusqua FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(r.conv, uid); if (!m || num(m.muet_jusqua) > horloge()) return false; }
    if (occurrence !== undefined && occurrence !== null) return !r.annulee && r.statut !== 'decline' && num(occurrence) > horloge();
    return true;
  }
  /* Les plafonds du courriel d'invitation : combien ce compte en a envoyé depuis `depuis.compte`, combien ce destinataire (son empreinte) en a reçu depuis `depuis.destinataire`. */
  function courrierCompter({ uid, destH, depuis }) {
    return {
      compte: num(Q('SELECT COUNT(*) AS n FROM courrier_envoi WHERE uid = ? AND ts >= ?').get(uid, depuis.compte).n),
      destinataire: num(Q('SELECT COUNT(*) AS n FROM courrier_envoi WHERE dest_h = ? AND ts >= ?').get(destH, depuis.destinataire).n),
    };
  }
  /* Un envoi se RÉSERVE avant de partir (le plafond se vérifie et se prend dans le même souffle : deux demandes simultanées ne passent pas à deux quand il n'en reste qu'une) → l'identifiant de la
     ligne, que `courrierRetirer` rend si le courriel n'est finalement pas parti (un relais qui refuse ne consomme pas le plafond de la personne). */
  function courrierNoter({ uid, destH }) { return num(Q('INSERT INTO courrier_envoi(uid, dest_h, ts) VALUES(?, ?, ?)').run(uid, destH, horloge()).lastInsertRowid); }
  function courrierRetirer(id) { return num(Q('DELETE FROM courrier_envoi WHERE id = ?').run(id).changes) > 0; }
  function courrierElaguer(avant) { return num(Q('DELETE FROM courrier_envoi WHERE ts < ?').run(avant).changes); }
  /* Les réunions d'une personne, pour l'export de ses données (le titre et le lieu s'ouvrent : ce sont les siennes). */
  function exportReunions(uid) {
    return Q(`SELECT r.id AS id, r.titre_ch AS titre_ch, r.lieu_ch AS lieu_ch, r.debut AS debut, r.fin AS fin, r.tz AS tz, r.rep AS rep, r.n AS n, r.jusqua AS jusqua, r.annulee AS annulee, r.hote AS hote, i.statut AS statut
              FROM reunion_invite i JOIN reunion r ON r.id = i.reunion WHERE i.uid = ? ORDER BY r.debut, r.id`).all(uid).map(x => {
      const titre = reunionTitre(x), lieu = reunionLieu(x);
      return { id: x.id, titre: titre === null ? '' : titre, lieu: lieu === null ? '' : lieu, debut: num(x.debut), fin: num(x.fin), fuseau: x.tz, repetition: x.rep, n: x.n === null ? null : num(x.n), jusqua: x.jusqua || null,
        annulee: !!x.annulee, role: x.hote === uid ? 'hote' : 'invite', reponse: x.statut };
    });
  }
  /* ⛔ L'EFFACEMENT D'UN COMPTE ET SES RÉUNIONS (appelé par `compteEffacer`). Hôte : la réunion passe au plus ancien invité qui n'a pas décliné (celui qui a accepté d'abord ; à égalité, dans l'ORDRE où l'hôte les a invités) — il devient hôte et
     administrateur de la conversation —, ou, faute de successeur, elle part avec sa conversation. Invité : sa ligne part, il sort de la conversation. La sortie se NOTE (`reunion_invite`,
     `groupe_membre`) ; la conversation d'une réunion sans successeur aussi (`convSupprimer`). Rejouable : sans réunion, rien à faire.
     ⛔ `rejeu: true` N'ÉCRIT RIEN AU REGISTRE (comme `espaceQuitterTout`) : celui de la copie dit déjà ce que l'effacement d'origine a fait ; une ligne de plus serait rejouée à la restauration suivante
     contre des gens qui, dans le service vivant, y étaient encore. → { pieces, convs } */
  function reunionsQuitterTout(uid, { rejeu = false } = {}) {
    const pieces = [], convs = [], t = horloge();
    for (const r of Q('SELECT id, conv FROM reunion WHERE hote = ? ORDER BY id').all(uid)) {
      const suivant = Q(`SELECT i.uid AS uid FROM reunion_invite i JOIN personne p ON p.id = i.uid
                         WHERE i.reunion = ? AND i.uid <> ? AND i.statut <> 'decline' AND p.etat = 'actif' ORDER BY (i.statut = 'accepte') DESC, i.cree, i.rowid LIMIT 1`).get(r.id, uid);
      if (!suivant) { salleReunionFinir(r.id, 'supprimee'); pieces.push(...convSupprimer(r.conv, { noter: !rejeu }).pieces); convs.push(r.conv); continue; }
      Q('UPDATE reunion SET hote = ?, version = version + 1, maj = ? WHERE id = ?').run(suivant.uid, t, r.id);
      Q(`UPDATE membre SET role = 'admin' WHERE conv = ? AND uid = ?`).run(r.conv, suivant.uid);
      Q(`UPDATE reunion_invite SET statut = 'accepte', repondu = COALESCE(repondu, ?), invite_par = NULL WHERE reunion = ? AND uid = ?`).run(t, r.id, suivant.uid);
    }
    for (const x of Q('SELECT i.reunion AS id, r.conv AS conv FROM reunion_invite i JOIN reunion r ON r.id = i.reunion WHERE i.uid = ? ORDER BY i.reunion').all(uid)) {
      Q('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ?').run(x.id, uid);
      if (!rejeu) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(x.id + '|' + uid + '|' + t, 'reunion_invite', t);
      if (Q('SELECT 1 AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(x.conv, uid)) {
        Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, x.conv, uid);
        if (!rejeu) sortieNoter(x.conv, uid, t, false);
        journalAjouter('reunion', x.conv, null, x.id);
      }
      convs.push(x.conv);
    }
    Q('DELETE FROM rappel WHERE uid = ?').run(uid);
    Q('DELETE FROM courrier_envoi WHERE uid = ?').run(uid);
    return { pieces, convs };
  }
  /* ⛔ LA RÉPARATION AU DÉMARRAGE : ce qu'un retour en arrière a pu laisser. Le code d'avant les réunions ouvre sans mot dire une base au schéma 7 (la migration ne refuse pas un schéma plus récent) et
     efface un compte SANS connaître les réunions : l'invitation de la personne effacée reste, et une réunion dont elle était l'hôte garde un hôte qui n'est plus personne — sans successeur, sans
     main qui l'annule. Le démarrage du code neuf refait donc, pour chaque compte effacé qui laisse une trace dans les réunions, l'effacement de ses réunions (`reunionsQuitterTout` : l'hôte passe au
     plus ancien invité, ou la réunion part avec sa conversation ; l'invité sort). Rejouable : sans trace, rien à faire — un démarrage ordinaire n'écrit RIEN. → { personnes, pieces, convs } */
  function reunionsReparer() {
    return tx(() => {
      const ids = Q(`SELECT DISTINCT u.uid AS uid FROM (
                       SELECT i.uid AS uid FROM reunion_invite i JOIN personne p ON p.id = i.uid WHERE p.etat = 'supprime'
                       UNION
                       SELECT r.hote AS uid FROM reunion r JOIN personne p ON p.id = r.hote WHERE p.etat = 'supprime') u ORDER BY u.uid`).all().map(x => x.uid);
      const pieces = [], convs = [];
      for (const uid of ids) { const x = reunionsQuitterTout(uid); pieces.push(...x.pieces); convs.push(...x.convs); }
      return { personnes: ids.length, pieces, convs };
    });
  }

  /* ══ ESPACES, INVITATIONS, CANAUX, ABONNEMENT (migration 6) ════════════════════════════════════════════════════════════════
     Un ESPACE est une entreprise : un propriétaire, des membres (administrateur ou membre), des canaux, un abonnement. Ce bloc ne décide JAMAIS d'une formule ni ne parle à
     Stripe : il range et il lit (la formule est `formule.js`, Stripe est `facturation.js`). Ce qu'il tient, lui, ce sont les INVARIANTS :
       · ⛔ UN CANAL EST UNE CONVERSATION (genre `canal`) : mêmes messages, mêmes accusés, mêmes pièces, même flux, même purge — rien n'est réécrit. Ce qui change est qui en est
         membre : un canal PUBLIC a pour membres TOUS ceux de l'espace (ils y entrent et en sortent avec lui, jamais autrement), un canal PRIVÉ ceux qu'un administrateur y a mis
         (des membres de l'espace, toujours) ;
       · son rôle dans un canal est son rôle dans l'espace (administrateur de l'espace ⇔ administrateur du canal), tenu à jour quand le rôle change ;
       · un membre d'espace qui part ou qu'on retire sort de TOUS les canaux de l'espace dans la même transaction, et l'effacement se note dans `purge` ;
       · le propriétaire ne part jamais, ne se retire pas, ne se rétrograde pas : il passe d'abord la main (`espaceTransferer`) ;
       · un canal qui n'a plus aucun membre est supprimé (comme un groupe dont le dernier membre part), pièces comprises. */
  const ESPACES_PROPRIO_MAX = 3;      // espaces dont on est propriétaire (SERVEUR.md § 3.3)
  const ESPACES_MEMBRE_MAX = 20;      // espaces dont on est membre, invitations comprises : une personne ne se laisse pas inscrire dans mille espaces
  const CANAUX_MAX = 100;             // canaux par espace
  const aadEspace = (id) => id + '|nom';
  const nomEspace = (r) => r.nom_ch ? ouvrirOuNull('espace', 'nom_ch', aadEspace(r.id), r.nom_ch) : null;
  function espaceBrut(id) { return Q('SELECT id, nom_ch, proprio, cree FROM espace WHERE id = ?').get(id) || null; }
  const espaceRang = (r) => ({ id: r.id, nom: nomEspace(r), proprio: r.proprio, cree: num(r.cree) });
  function espaceMembresN(id) { return num(Q('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?').get(id).n); }

  function espaceCreer({ nom, proprio }) {
    return tx(() => {
      if (num(Q('SELECT COUNT(*) AS n FROM espace WHERE proprio = ?').get(proprio).n) >= ESPACES_PROPRIO_MAX) throw erreur('trop_d_espaces');
      if (num(Q('SELECT COUNT(*) AS n FROM espace_membre WHERE uid = ?').get(proprio).n) >= ESPACES_MEMBRE_MAX) throw erreur('trop_d_espaces');
      const id = nouvelId('e'), t = horloge();
      Q('INSERT INTO espace(id, nom_ch, proprio, cree) VALUES(?, ?, ?, ?)').run(id, sceller('espace', 'nom_ch', aadEspace(id), nom), proprio, t);
      Q(`INSERT INTO espace_membre(espace, uid, role, depuis) VALUES(?, ?, 'admin', ?)`).run(id, proprio, t);
      return { id };
    });
  }
  /* L'espace « pour un membre » : `null` pour inexistant COMME pour « tu n'en es pas membre » (404 dans les deux cas, jamais 403). */
  function espacePourMembre(id, uid) {
    const m = Q('SELECT role, depuis FROM espace_membre WHERE espace = ? AND uid = ?').get(id, uid);
    if (!m) return null;
    const e = espaceBrut(id); if (!e) return null;
    return { espace: espaceRang(e), moi: { role: m.role, depuis: num(m.depuis) } };
  }
  function espacesDe(uid) {
    return Q(`SELECT e.id, e.nom_ch, e.proprio, e.cree, m.role, (SELECT COUNT(*) FROM espace_membre x WHERE x.espace = e.id) AS membres_n
              FROM espace_membre m JOIN espace e ON e.id = m.espace WHERE m.uid = ? ORDER BY m.depuis, e.id`).all(uid)
      .map(r => Object.assign(espaceRang(r), { role: r.role, membres_n: num(r.membres_n) }));
  }
  function espacesIds(uid) { return Q('SELECT espace FROM espace_membre WHERE uid = ?').all(uid).map(r => r.espace); }
  /* Les membres, vus par `viewer`. Un administrateur (`tous`) lit le registre COMPLET — il gère la liste de son entreprise ; tout autre membre ne voit pas ceux avec qui un
     blocage existe, dans un sens ou dans l'autre (même règle que la fiche d'une personne). */
  function espaceMembres(espace, viewer, { tous = false } = {}) {
    const lignes = Q(`SELECT p.id, p.prenom, p.nom, p.statut, p.avatar_piece, m.role, m.depuis FROM espace_membre m JOIN personne p ON p.id = m.uid
                      WHERE m.espace = ? AND p.etat = 'actif' ORDER BY p.prenom, p.nom, p.id`).all(espace);
    const pr = Q('SELECT proprio FROM espace WHERE id = ?').get(espace);      // le propriétaire se montre : l'écran ne propose ni de le retirer ni de le rétrograder (le service le refuserait)
    return lignes.filter(r => tous || r.id === viewer || !contactBloque(viewer, r.id)).map(r => ({
      id: r.id, prenom: r.prenom, nom: r.nom, statut: r.statut, avatar: avatarPour(viewer, r.id, r.avatar_piece), role: r.role, depuis: num(r.depuis),
      proprio: !!pr && r.id === pr.proprio, moi: r.id === viewer, contact: r.id !== viewer && contactActif(viewer, r.id) }));
  }
  function espaceMaj({ id, nom }) {
    return tx(() => {
      const e = espaceBrut(id); if (!e) throw erreur('introuvable');
      Q('UPDATE espace SET nom_ch = ? WHERE id = ?').run(sceller('espace', 'nom_ch', aadEspace(id), nom), id);
      return { change: nom !== nomEspace(e) };
    });
  }

  /* Les canaux d'un espace, tels que `uid` les voit : ceux dont il est membre ACTIF (un canal privé qui ne le compte pas n'existe pas pour lui). */
  function canauxVisibles(espace, uid) {
    return Q(`SELECT k.conv AS id, k.prive, c.nom_ch, c.dernier_seq, c.dernier_ts, (SELECT COUNT(*) FROM membre x WHERE x.conv = k.conv AND x.quitte_le IS NULL) AS membres_n
              FROM canal k JOIN conversation c ON c.id = k.conv
              WHERE k.espace = ? AND EXISTS (SELECT 1 FROM membre m WHERE m.conv = k.conv AND m.uid = ? AND m.quitte_le IS NULL) ORDER BY k.cree, k.conv`).all(espace, uid)
      .map(r => ({ id: r.id, nom: nomDe(r.id, r.nom_ch), prive: !!r.prive, membres_n: num(r.membres_n), dernier_seq: num(r.dernier_seq), dernier_ts: num(r.dernier_ts) }));
  }
  /* Entre `uid` dans un canal (ou y revient) : il ne lit que ce qui suit son arrivée, comme dans un groupe. → true s'il vient d'y entrer. */
  function membreJoindre(conv, uid, role, t) {
    const c = Q('SELECT dernier_seq FROM conversation WHERE id = ?').get(conv);
    if (!c) throw erreur('introuvable');
    const ds = num(c.dernier_seq) + 1;
    const m = Q('SELECT quitte_le FROM membre WHERE conv = ? AND uid = ?').get(conv, uid);
    if (m && m.quitte_le === null) { Q('UPDATE membre SET role = ? WHERE conv = ? AND uid = ?').run(role, conv, uid); return false; }
    if (m) Q(`UPDATE membre SET quitte_le = NULL, role = ?, depuis_seq = ?, lu_seq = ?, rejoint = ?, epingle = 0, archive = 0, muet_jusqua = 0 WHERE conv = ? AND uid = ?`).run(role, ds, ds - 1, t, conv, uid);
    else Q(`INSERT INTO membre(conv, uid, role, depuis_seq, lu_seq, rejoint) VALUES(?, ?, ?, ?, ?, ?)`).run(conv, uid, role, ds, ds - 1, t);
    return true;
  }
  function canauxPublics(espace) { return Q('SELECT conv FROM canal WHERE espace = ? AND prive = 0 ORDER BY cree, conv').all(espace).map(r => r.conv); }
  function canauxDe(espace, uid) {
    return Q('SELECT m.conv AS conv FROM membre m JOIN canal k ON k.conv = m.conv WHERE k.espace = ? AND m.uid = ? AND m.quitte_le IS NULL').all(espace, uid).map(r => r.conv);
  }
  /* Retire `uid` de l'espace ET de tous ses canaux. Ne regarde PAS le propriétaire (l'appelant le fait). → { convs, pieces } : les canaux touchés, les pièces des canaux devenus vides.
     `noter: false` : le REJEU d'un effacement de compte (voir `espaceQuitterTout`) — la ligne `espace_membre` de l'effacement d'origine est DÉJÀ dans le registre recopié par la restauration. */
  function retirerDeEspace(espace, uid, { noter = true } = {}) {
    const t = horloge(), convs = canauxDe(espace, uid), pieces = [];
    for (const c of convs) {
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, c, uid);
      if (num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL').get(c).n) === 0) pieces.push(...convSupprimer(c, { noter }).pieces);   // le canal n'a plus personne : il part, pièces comprises
      else journalAjouter('conv_maj', c, null, '');
      journalAjouter('retire', c, uid, '');   // APRÈS la suppression éventuelle (elle efface le journal de la conversation) : celui qui part l'apprend toujours
    }
    Q('DELETE FROM espace_membre WHERE espace = ? AND uid = ?').run(espace, uid);
    /* ⛔ NOTÉ : une archive d'avant ce geste ramènerait le membre, ses canaux et tout ce qu'ils disent (un salarié parti reprendrait la lecture de l'entreprise) */
    if (noter) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(espace + '|' + uid + '|' + t, 'espace_membre', t);
    return { convs, pieces };
  }
  /* `revoquerLiens` : l'administrateur RETIRE quelqu'un (par opposition à quelqu'un qui part de lui-même).
     ⛔ LE RETIRÉ CONNAÎT LES CODES D'INVITATION DE L'ESPACE (relecture du gardien, 3 octobre 2026 : retiré, il ré-acceptait l'ancien lien — « deja: false » — et retrouvait l'espace ET ses
     canaux publics). Comme pour un groupe (`membreRetirer` → `liensRevoquerGroupe`), on les révoque TOUS dans la même transaction, chacun noté dans le registre (`invitationsRevoquer` :
     une archive d'avant ne rendrait pas la porte). Le choix plus fin — refuser le seul lien au seul retiré — protégerait la personne mais pas la porte : un ancien collègue qui connaît
     un code peut le passer à qui il veut, et il y a un coût à lever (un administrateur recrée un lien). Quitter de soi-même ne révoque rien : personne n'est chassé. */
  function espaceMembreRetirer({ espace, uid, revoquerLiens = false }) {
    return tx(() => {
      const e = espaceBrut(espace); if (!e) throw erreur('introuvable');
      if (!Q('SELECT 1 AS x FROM espace_membre WHERE espace = ? AND uid = ?').get(espace, uid)) throw erreur('introuvable');
      if (e.proprio === uid) throw erreur('proprio');
      const r = retirerDeEspace(espace, uid);
      r.liens = revoquerLiens ? invitationsRevoquer(espace) : 0;
      return r;
    });
  }
  function rolerCanaux(espace, uid, role) {
    const convs = canauxDe(espace, uid);
    for (const c of convs) { Q('UPDATE membre SET role = ? WHERE conv = ? AND uid = ?').run(role, c, uid); journalAjouter('conv_maj', c, null, ''); }
    return convs;
  }
  function espaceRoleMembre({ espace, uid, admin }) {
    return tx(() => {
      const e = espaceBrut(espace); if (!e) throw erreur('introuvable');
      const m = Q('SELECT role FROM espace_membre WHERE espace = ? AND uid = ?').get(espace, uid);
      if (!m) throw erreur('introuvable');
      if (e.proprio === uid) throw erreur('proprio');
      const futur = admin ? 'admin' : 'membre';
      if (m.role === futur) return { change: false, convs: [] };
      Q('UPDATE espace_membre SET role = ? WHERE espace = ? AND uid = ?').run(futur, espace, uid);
      return { change: true, convs: rolerCanaux(espace, uid, futur) };
    });
  }
  /* Passer la main : le nouveau propriétaire est un membre de l'espace, d'un compte actif dont la suppression n'est pas programmée ; il devient administrateur ; l'ancien reste administrateur. */
  function espaceTransferer({ espace, de, vers }) {
    return tx(() => {
      const e = espaceBrut(espace); if (!e) throw erreur('introuvable');
      if (e.proprio !== de) throw erreur('interdit');
      if (vers === de) throw erreur('champ_invalide');
      if (!Q('SELECT 1 AS x FROM espace_membre WHERE espace = ? AND uid = ?').get(espace, vers)) throw erreur('introuvable');
      const p = Q('SELECT etat, verifie_le, suppression_le FROM personne WHERE id = ?').get(vers);
      if (!p || p.etat !== 'actif' || !p.verifie_le || p.suppression_le !== null) throw erreur('destinataire_invalide');
      if (num(Q('SELECT COUNT(*) AS n FROM espace WHERE proprio = ?').get(vers).n) >= ESPACES_PROPRIO_MAX) throw erreur('trop_d_espaces');
      Q('UPDATE espace SET proprio = ? WHERE id = ?').run(vers, espace);
      Q(`UPDATE espace_membre SET role = 'admin' WHERE espace = ? AND uid = ?`).run(espace, vers);
      return { convs: rolerCanaux(espace, vers, 'admin') };
    });
  }
  /* Dissoudre : les canaux partent comme partent les conversations (pièces et registre compris), les invitations, l'abonnement et la liste des membres avec l'espace. → les personnes à prévenir.
     `noter: false` : seulement le rejeu d'un effacement de compte (`espaceQuitterTout`) — l'espace que la COPIE réduit à la personne effacée n'est pas un espace que le service vivant a dissous. */
  function espaceSupprimer(id, { noter = true } = {}) {
    return tx(() => {
      const e = espaceBrut(id); if (!e) throw erreur('introuvable');
      const pieces = [], convs = Q('SELECT conv FROM canal WHERE espace = ?').all(id).map(r => r.conv);
      const membres = Q('SELECT uid FROM espace_membre WHERE espace = ?').all(id).map(r => r.uid);
      for (const c of convs) pieces.push(...convSupprimer(c, { noter }).pieces);
      Q(`DELETE FROM lien WHERE genre = 'espace' AND cible = ?`).run(id);
      if (noter) Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(id, 'espace', horloge());
      Q('DELETE FROM espace WHERE id = ?').run(id);   // espace_membre, canal et abonnement suivent (ON DELETE CASCADE)
      return { pieces, convs, membres };
    });
  }
  /* L'effacement d'un compte (`compteEffacer`) : la personne sort de tous ses espaces. Propriétaire avec d'autres membres : la propriété passe au plus ancien administrateur, à
     défaut au plus ancien membre ; propriétaire seul : l'espace est dissous. Rejouable : sans espace, rien à faire. → { pieces, convs, orphelins }

     ⛔ MEMBRE **OU** PROPRIÉTAIRE (couture avec le rejeu des comptes du lot 3, 3 octobre 2026). Une restauration rejoue D'ABORD, hors ligne, les lignes `espace_membre` du registre : elles
     retirent la personne de la liste des membres d'une copie plus ancienne — mais la PROPRIÉTÉ ne s'écrit pas au registre, elle reste sur la ligne de l'espace. Quand le service rejoue ensuite
     l'effacement du compte (`rejeu.js`), il ne trouvait plus la personne dans AUCUN espace : l'espace gardait pour propriétaire un compte effacé, que personne ne pouvait plus gérer (la
     propriété ne se passe que depuis le propriétaire). On cherche donc aussi les espaces dont elle est propriétaire sans y être listée.
     ⛔ `rejeu: true` N'ÉCRIT RIEN AU REGISTRE : celui de la copie dit DÉJÀ ce qu'a fait l'effacement d'origine (la restauration l'a recopié) ; une ligne de plus — `espace_membre` à la date du
     rejeu, `espace` pour un espace que la copie réduit à la personne effacée — serait rejouée à la restauration SUIVANTE comme un fait, contre des gens qui, dans le service vivant, y étaient
     encore.
     ⛔ UN ESPACE DONT UN ABONNEMENT COURT (ou dont un paiement attend sa relecture) N'EST JAMAIS DISSOUS ICI, en direct comme au rejeu : dissoudre perdrait le seul lien avec un abonnement qui
     continuerait de prélever. La route de suppression de compte refuse (409) tant que la personne y est seule — mais l'effacement a lieu quatorze jours plus tard, et un autre membre a pu partir
     entre-temps ; et le rejeu, lui, ne parle pas à Stripe (la copie peut réduire l'espace à elle alors que le service vivant avait d'autres membres). Dans le doute, on efface moins : la personne
     en sort (la sortie se note en direct, c'est un fait), l'espace reste sans membre, et il est RENDU dans `orphelins` pour que l'appelant le dise au journal — à régler à la main, sur le
     tableau de bord de Stripe. */
  function espaceQuitterTout(uid, { rejeu = false } = {}) {
    const pieces = [], convs = [], orphelins = [];
    const ids = Q(`SELECT espace AS id FROM espace_membre WHERE uid = ? UNION SELECT id FROM espace WHERE proprio = ? ORDER BY 1`).all(uid, uid).map(r => r.id);
    for (const id of ids) {
      const e = espaceBrut(id); if (!e) continue;
      if (e.proprio === uid) {
        const suivant = Q(`SELECT uid FROM espace_membre WHERE espace = ? AND uid <> ? ORDER BY (role = 'admin') DESC, depuis, uid LIMIT 1`).get(e.id, uid);
        if (!suivant) {
          if (abonnementCourt(e.id)) { const x = retirerDeEspace(e.id, uid, { noter: !rejeu }); pieces.push(...x.pieces); convs.push(...x.convs); orphelins.push(e.id); continue; }
          const d = espaceSupprimer(e.id, { noter: !rejeu }); pieces.push(...d.pieces); convs.push(...d.convs); continue;
        }
        Q('UPDATE espace SET proprio = ? WHERE id = ?').run(suivant.uid, e.id);
        Q(`UPDATE espace_membre SET role = 'admin' WHERE espace = ? AND uid = ?`).run(e.id, suivant.uid);
        rolerCanaux(e.id, suivant.uid, 'admin');
      }
      const x = retirerDeEspace(e.id, uid, { noter: !rejeu });
      pieces.push(...x.pieces); convs.push(...x.convs);
    }
    return { pieces, convs, orphelins };
  }
  /* Un abonnement qui COURT, ou un paiement commencé dont personne n'a relu l'issue (`session` rangée) — la MÊME définition que `espacesAbonnesSeul`, qui la lit pour refuser une suppression. */
  function abonnementCourt(espace) {
    return Q(`SELECT 1 AS x FROM abonnement WHERE espace = ? AND ((abonnement IS NOT NULL AND statut NOT IN ('aucun', 'canceled', 'incomplete_expired')) OR session IS NOT NULL)`).get(espace) !== undefined;
  }
  /* Les espaces dont `uid` est le propriétaire ET le seul membre, avec un abonnement qui court — OU un paiement commencé dont personne n'a relu l'issue (`session` rangée) : supprimer son
     compte laisserait Stripe prélever pour un espace qui n'existe plus (relecture du gardien : payé, puis dissous avant que le service le sache). */
  function espacesAbonnesSeul(uid) {
    return Q(`SELECT e.id AS id FROM espace e JOIN abonnement a ON a.espace = e.id
              WHERE e.proprio = ? AND ((a.abonnement IS NOT NULL AND a.statut NOT IN ('aucun', 'canceled', 'incomplete_expired')) OR a.session IS NOT NULL)
                AND (SELECT COUNT(*) FROM espace_membre x WHERE x.espace = e.id) <= 1`).all(uid).map(r => r.id);
  }
  function exportEspaces(uid) {
    return Q('SELECT e.id, e.nom_ch, m.role, m.depuis FROM espace_membre m JOIN espace e ON e.id = m.espace WHERE m.uid = ? ORDER BY m.depuis, e.id').all(uid)
      .map(r => ({ id: r.id, nom: nomEspace(r), role: r.role, depuis: num(r.depuis) }));
  }

  /* ── les invitations : un lien (genre `espace`), le code n'existe qu'en clair chez celui qui le distribue, ici seule son empreinte ── */
  function invitationApercu(h) {
    const l = lienValide(h); if (!l || l.genre !== 'espace') return null;
    const e = espaceBrut(l.cible); if (!e) return null;
    const par = personneParId(l.par); if (!par) return null;
    return { genre: 'espace', par: { id: par.id, prenom: par.prenom, nom: par.nom }, espace: { nom: nomEspace(e), membres: espaceMembresN(e.id) } };
  }
  /* `max` : le nombre de membres au-delà duquel l'espace est complet (les places payées, ou l'infini) — calculé par l'appelant juste avant, sans attente entre les deux. */
  function invitationAccepter({ h, uid, max }) {
    return tx(() => {
      const l = lienValide(h); if (!l || l.genre !== 'espace') throw erreur('lien_invalide');
      const e = espaceBrut(l.cible); if (!e) throw erreur('lien_invalide');
      if (Q('SELECT 1 AS x FROM espace_membre WHERE espace = ? AND uid = ?').get(e.id, uid)) return { deja: true, espace: e.id, par: l.par, convs: [] };
      const n = espaceMembresN(e.id);
      if (n >= MAX_MEMBRES || n >= max) throw erreur('espace_complet');
      if (num(Q('SELECT COUNT(*) AS n FROM espace_membre WHERE uid = ?').get(uid).n) >= ESPACES_MEMBRE_MAX) throw erreur('trop_d_espaces');
      Q('UPDATE lien SET restants = restants - 1 WHERE h = ? AND restants > 0').run(h);
      const t = horloge();
      Q(`INSERT INTO espace_membre(espace, uid, role, depuis) VALUES(?, ?, 'membre', ?)`).run(e.id, uid, t);
      const convs = [];
      for (const c of canauxPublics(e.id)) { if (membreJoindre(c, uid, 'membre', t)) { journalAjouter('conv_maj', c, null, ''); convs.push(c); } }
      return { deja: false, espace: e.id, par: l.par, convs };
    });
  }
  /* L'espace qu'ouvre ce code, s'il est valable (non expiré, non révoqué, non épuisé, créé par un administrateur d'aujourd'hui) — ou `null`. */
  function invitationEspace(h) {
    const l = lienValide(h);
    return l && l.genre === 'espace' ? l.cible : null;
  }
  function espaceUids(id) { return Q('SELECT uid FROM espace_membre WHERE espace = ?').all(id).map(r => r.uid); }
  /* Révoque tous les liens d'invitation vivants d'un espace ; chacun se NOTE (une archive d'avant rendrait la porte à qui détient encore le code). → le nombre révoqué */
  function invitationsRevoquer(espace) {
    return tx(() => {
      const t = horloge();
      Q(`INSERT INTO purge(objet, genre, quand) SELECT h, 'invitation', ? FROM lien WHERE genre = 'espace' AND cible = ? AND revoque = 0`).run(t, espace);
      return num(Q(`UPDATE lien SET revoque = 1 WHERE genre = 'espace' AND cible = ? AND revoque = 0`).run(espace).changes);
    });
  }
  /* Les invitations qui servent encore (non révoquées, non échues, avec des places) : pour dire « 2 liens actifs » à l'administrateur. */
  function invitationsVivantes(espace) {
    return num(Q(`SELECT COUNT(*) AS n FROM lien l WHERE genre = 'espace' AND cible = ? AND revoque = 0 AND exp > ? AND restants > 0
                  AND EXISTS (SELECT 1 FROM espace_membre x WHERE x.espace = l.cible AND x.uid = l.par AND x.role = 'admin')`).get(espace, horloge()).n);
  }

  /* ── les canaux ── */
  function canalCreer({ espace, par, nom, prive, membres }) {
    return tx(() => {
      const e = espaceBrut(espace); if (!e) throw erreur('introuvable');
      const moi = Q('SELECT role FROM espace_membre WHERE espace = ? AND uid = ?').get(espace, par);
      if (!moi || moi.role !== 'admin') throw erreur('interdit');
      if (num(Q('SELECT COUNT(*) AS n FROM canal WHERE espace = ?').get(espace).n) >= CANAUX_MAX) throw erreur('trop_de_canaux');
      const roles = new Map(Q('SELECT uid, role FROM espace_membre WHERE espace = ?').all(espace).map(r => [r.uid, r.role]));
      const qui = prive ? [par].concat(Array.from(new Set(membres || [])).filter(u => u !== par)) : Array.from(roles.keys());
      if (qui.length > MAX_MEMBRES) throw erreur('groupe_plein');
      if (qui.some(u => !roles.has(u))) throw erreur('membre_inconnu');
      const id = nouvelId('c'), t = horloge();
      Q(`INSERT INTO conversation(id, type, nom_ch, annonces_seules, ephemere_s, dernier_ts, cree_par, cree) VALUES(?, 'canal', ?, 0, 0, ?, ?, ?)`).run(id, sceller('conversation', 'nom_ch', id + '|nom', nom), t, par, t);
      Q('INSERT INTO canal(conv, espace, prive, cree_par, cree) VALUES(?, ?, ?, ?, ?)').run(id, espace, prive ? 1 : 0, par, t);
      for (const u of qui) Q(`INSERT INTO membre(conv, uid, role, depuis_seq, rejoint) VALUES(?, ?, ?, 1, ?)`).run(id, u, roles.get(u), t);
      const s = messageSysteme(id, par, { k: 'canal_cree' });
      return { id, gid: s.gid };
    });
  }
  /* Un canal dont `uid` est membre ACTIF ET administrateur, dans CET espace — sinon `null` (404 : il n'existe pas pour lui). */
  function canalPourAdmin(espace, conv, uid) {
    const k = canalDe(conv);
    if (!k || k.espace !== espace) return null;
    const m = Q('SELECT role FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid);
    return m && m.role === 'admin' ? k : null;
  }
  function canalMembresAjouter({ conv, par, uids }) {
    return tx(() => {
      const k = canalDe(conv); if (!k) throw erreur('introuvable');
      if (!k.prive) throw erreur('canal_public');
      const roles = new Map(Q('SELECT uid, role FROM espace_membre WHERE espace = ?').all(k.espace).map(r => [r.uid, r.role]));
      if (uids.some(u => !roles.has(u))) throw erreur('membre_inconnu');
      const r = membresAjouter({ conv, par, uids });
      for (const u of r.ajoutes) Q('UPDATE membre SET role = ? WHERE conv = ? AND uid = ?').run(roles.get(u), conv, u);
      return r;
    });
  }
  function canalMembreRetirer({ conv, par, uid }) {
    return tx(() => {
      const k = canalDe(conv); if (!k) throw erreur('introuvable');
      if (!k.prive) throw erreur('canal_public');
      /* ⛔ LA HIÉRARCHIE DE L'ESPACE VAUT DANS SES CANAUX (relecture du gardien, 3 octobre 2026 : un simple administrateur retirait le propriétaire — ou un autre administrateur — d'un
         canal privé, et celui-ci n'y rentrait plus : on n'ouvre un privé qu'en en étant membre). Le rôle d'un canal est celui de l'espace, donc : seul le PROPRIÉTAIRE retire un administrateur,
         et PERSONNE ne retire le propriétaire (qui, lui, quitte un privé par « quitter »). La règle est ici, dans la fonction qui écrit, et pas seulement dans la route : un second chemin
         jusqu'à elle ne la contournerait pas. */
      const e = espaceBrut(k.espace), cible = Q('SELECT role FROM espace_membre WHERE espace = ? AND uid = ?').get(k.espace, uid);
      if (e && e.proprio === uid) throw erreur('interdit');
      if (cible && cible.role === 'admin' && (!e || e.proprio !== par)) throw erreur('interdit');
      return membreRetirer({ conv, par, uid, canal: true });   // le retrait se note (`canal_membre`) : une archive d'avant ramènerait sinon le retiré dans un canal privé
    });
  }
  /* Quitter un canal PRIVÉ (un canal public se quitte avec l'espace) : personne n'est promu à la place — le rôle dans un canal est le rôle dans l'espace. */
  function canalQuitter({ conv, uid }) {
    return tx(() => {
      const k = canalDe(conv); if (!k) throw erreur('introuvable');
      if (!k.prive) throw erreur('canal_public');
      if (!Q('SELECT 1 AS x FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid)) throw erreur('introuvable');
      const t = horloge();
      Q('INSERT INTO purge(objet, genre, quand) VALUES(?, ?, ?)').run(conv + '|' + uid + '|' + t, 'canal_membre', t);
      if (num(Q('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid <> ? AND quitte_le IS NULL').get(conv, uid).n) === 0) {
        const r = convSupprimer(conv);
        return { vide: true, gid: journalAjouter('retire', conv, uid, ''), conv, pieces: r.pieces };
      }
      Q('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(t, conv, uid);
      messageSysteme(conv, uid, { k: 'membre_parti', uid });
      return { vide: false, gid: journalAjouter('retire', conv, uid, ''), conv, pieces: [] };
    });
  }

  /* ── l'abonnement : le dernier état que STRIPE a dit (jamais ce qu'une requête prétend) ── */
  const orNul = (x) => x === null || x === undefined ? null : num(x);
  function abonnementLire(espace) {
    const r = Q('SELECT espace, client, abonnement, session, session_le, statut, places, fin_periode, annule, impaye_depuis, relu_le FROM abonnement WHERE espace = ?').get(espace);
    if (!r) return null;
    return { espace: r.espace, client: r.client, abonnement: r.abonnement, session: r.session, session_le: orNul(r.session_le), statut: r.statut, places: num(r.places),
      fin_periode: orNul(r.fin_periode), annule: !!r.annule, impaye_depuis: orNul(r.impaye_depuis), relu_le: orNul(r.relu_le) };
  }
  /* La session de paiement qu'on VIENT d'ouvrir pour cet espace (la dernière) : c'est elle, et elle seule, qui dira plus tard quel abonnement est le sien. */
  function abonnementSession(espace, session) {
    const t = horloge();
    Q('INSERT INTO abonnement(espace, session, session_le, cree) VALUES(?, ?, ?, ?) ON CONFLICT(espace) DO UPDATE SET session = excluded.session, session_le = excluded.session_le').run(espace, session, t, t);
  }
  /* On n'oublie QUE la session qu'on vient de relire (`session`) : si un paiement a rangé une session neuve entre-temps, elle reste. */
  function abonnementSessionOubliee(espace, session) { Q('UPDATE abonnement SET session = NULL, session_le = NULL WHERE espace = ? AND session = ?').run(espace, session); }
  /* Ce que Stripe a dit de l'abonnement de cet espace. `adopter` : l'abonnement vient d'être trouvé par la session (il remplace l'ancien et la session est consommée) ; sinon c'est
     la relecture de celui qu'on connaît (la session en attente, s'il y en a une, reste). `impaye` date la PREMIÈRE lecture d'un impayé : le sursis de sept jours en part, et
     une lecture « payé » l'efface. Un abonnement déjà attaché à un AUTRE espace ne s'attache pas (`abonnement_pris`). */
  function abonnementPoser(espace, { client, abonnement, statut, places, fin_periode, annule, impaye }, { adopter = false } = {}) {
    return tx(() => {
      const t = horloge();
      if (abonnement && Q('SELECT 1 AS x FROM abonnement WHERE abonnement = ? AND espace <> ?').get(abonnement, espace)) throw erreur('abonnement_pris');
      Q('INSERT INTO abonnement(espace, cree) VALUES(?, ?) ON CONFLICT(espace) DO NOTHING').run(espace, t);
      const a = Q('SELECT impaye_depuis, abonnement FROM abonnement WHERE espace = ?').get(espace);
      const meme = a.abonnement === (abonnement || null);
      const depuis = impaye ? (a.impaye_depuis !== null && meme ? num(a.impaye_depuis) : t) : null;
      if (adopter) Q('UPDATE abonnement SET client = ?, abonnement = ?, statut = ?, places = ?, fin_periode = ?, annule = ?, impaye_depuis = ?, relu_le = ?, session = NULL, session_le = NULL WHERE espace = ?')
        .run(client || null, abonnement || null, statut, places, fin_periode === undefined ? null : fin_periode, annule ? 1 : 0, depuis, t, espace);
      else Q('UPDATE abonnement SET client = ?, abonnement = ?, statut = ?, places = ?, fin_periode = ?, annule = ?, impaye_depuis = ?, relu_le = ? WHERE espace = ?')
        .run(client || null, abonnement || null, statut, places, fin_periode === undefined ? null : fin_periode, annule ? 1 : 0, depuis, t, espace);
    });
  }
  /* Les espaces à relire chez Stripe : ceux dont l'abonnement court encore (un abonnement résilié est un état final), et ceux dont une session de paiement n'est pas RÉSOLUE — sans borne
     d'âge : une session de plus de 24 h est relue jusqu'à ce que Stripe dise « expirée » (ou ne la connaisse plus) ; une session payée à la 23e heure, pendant une panne, doit être reconnue. */
  function abonnementsARelire(limite = 200) {
    return Q(`SELECT espace FROM abonnement
              WHERE (abonnement IS NOT NULL AND statut NOT IN ('canceled', 'incomplete_expired')) OR session IS NOT NULL
              ORDER BY COALESCE(relu_le, 0), espace LIMIT ?`).all(Math.max(1, limite | 0)).map(r => r.espace);
  }

  /* ── PERSO+ : l'abonnement d'une PERSONNE (migration 10) — le dernier état que STRIPE a dit, jamais ce qu'une requête prétend ──────────────────────────────────────────────────────────────────────
     Même discipline que l'abonnement d'un espace, avec une clé de plus petite taille : la personne. Ce bloc range et lit ; il ne parle pas à Stripe, ne décide d'aucune formule (`formule.js`). */
  function abonnementPersoLire(uid) {
    const r = Q('SELECT personne, client, abonnement, session, session_le, statut, fin_periode, annule, relu_le FROM abonnement_perso WHERE personne = ?').get(uid);
    if (!r) return null;
    return { personne: r.personne, client: r.client, abonnement: r.abonnement, session: r.session, session_le: orNul(r.session_le), statut: r.statut, fin_periode: orNul(r.fin_periode), annule: !!r.annule, relu_le: orNul(r.relu_le) };
  }
  /* La session de paiement qu'on VIENT d'ouvrir pour cette personne (la dernière) : c'est elle, et elle seule, qui dira plus tard quel abonnement est le sien. */
  function abonnementPersoSession(uid, session) {
    const t = horloge();
    Q('INSERT INTO abonnement_perso(personne, session, session_le, cree) VALUES(?, ?, ?, ?) ON CONFLICT(personne) DO UPDATE SET session = excluded.session, session_le = excluded.session_le').run(uid, session, t, t);
  }
  /* On n'oublie QUE la session qu'on vient de relire : si un paiement a rangé une session neuve entre-temps, elle reste. */
  function abonnementPersoSessionOubliee(uid, session) { Q('UPDATE abonnement_perso SET session = NULL, session_le = NULL WHERE personne = ? AND session = ?').run(uid, session); }
  /* Ce que Stripe a dit de l'abonnement de cette personne. `adopter` : l'abonnement vient d'être trouvé par la session (il remplace l'ancien et la session est consommée). Un abonnement déjà attaché à une
     AUTRE personne ne s'attache pas (`abonnement_pris`). */
  function abonnementPersoPoser(uid, { client, abonnement, statut, fin_periode, annule }, { adopter = false } = {}) {
    return tx(() => {
      const t = horloge();
      if (abonnement && Q('SELECT 1 AS x FROM abonnement_perso WHERE abonnement = ? AND personne <> ?').get(abonnement, uid)) throw erreur('abonnement_pris');
      Q('INSERT INTO abonnement_perso(personne, cree) VALUES(?, ?) ON CONFLICT(personne) DO NOTHING').run(uid, t);
      const ancien = Q('SELECT abonnement FROM abonnement_perso WHERE personne = ?').get(uid);
      if (adopter) Q('UPDATE abonnement_perso SET client = ?, abonnement = ?, statut = ?, fin_periode = ?, annule = ?, relu_le = ?, session = NULL, session_le = NULL WHERE personne = ?')
        .run(client || null, abonnement || null, statut, fin_periode === undefined ? null : fin_periode, annule ? 1 : 0, t, uid);
      else Q('UPDATE abonnement_perso SET client = ?, abonnement = ?, statut = ?, fin_periode = ?, annule = ?, relu_le = ? WHERE personne = ?')
        .run(client || null, abonnement || null, statut, fin_periode === undefined ? null : fin_periode, annule ? 1 : 0, t, uid);
      /* ⛔ ce qu'on attendait d'un abonnement qui n'est plus (remplacé par un autre, ou FINI chez Stripe) n'a plus de sens : sa ligne d'`abonnement_a_annuler` part avec lui — sinon un renouvellement arrêté pour un
         abonnement terminé resterait là pour toujours. Jamais une RÉSILIATION : elle ne se ferme que sur la parole de Stripe (`annulationFaite`). */
      if (ancien && ancien.abonnement && ancien.abonnement !== (abonnement || null)) Q("DELETE FROM abonnement_a_annuler WHERE abonnement = ? AND voulu <> 'resilier'").run(ancien.abonnement);
      if (abonnement && ABO_FINIS.includes(statut)) Q("DELETE FROM abonnement_a_annuler WHERE abonnement = ? AND voulu <> 'resilier'").run(abonnement);
    });
  }
  /* Les personnes à relire chez Stripe : celles dont l'abonnement court encore, et celles dont une session de paiement n'est pas RÉSOLUE (sans borne d'âge — comme pour un espace : payée à la 23e heure pendant
     une panne, elle doit finir reconnue). Une personne dont le compte est effacé y reste tant qu'une session attend : un paiement réglé APRÈS l'effacement s'annule dès qu'il est reconnu. */
  function abonnementsPersoARelire(limite = 200) {
    return Q(`SELECT personne FROM abonnement_perso
              WHERE (abonnement IS NOT NULL AND statut NOT IN ('canceled', 'incomplete_expired')) OR session IS NOT NULL
              ORDER BY COALESCE(relu_le, 0), personne LIMIT ?`).all(Math.max(1, limite | 0)).map(r => r.personne);
  }
  /* ⛔ Le passage d'un abonnement personnel à la RÉSILIATION (le compte est EFFACÉ) : s'il vit, sa résiliation est NOTÉE (`abonnement_a_annuler`, `resilier`) ; un abonnement déjà FINI chez Stripe n'a plus rien
     à résilier, et la ligne qui l'attendait (un renouvellement arrêté) part avec lui ; une session de paiement non résolue RESTE sur la ligne (la relecture la résout), sinon la ligne part.
     À APPELER DANS une transaction (`compteEffacer`, `abonnementPersoOrphelin`). */
  function persoVersAnnulation(uid) {
    const ap = Q('SELECT abonnement, client, statut, session FROM abonnement_perso WHERE personne = ?').get(uid);
    if (!ap) return;
    if (ap.abonnement) {
      if (ABO_FINIS.includes(ap.statut)) Q("DELETE FROM abonnement_a_annuler WHERE abonnement = ? AND voulu <> 'resilier'").run(ap.abonnement);
      else annulationAjouter({ abonnement: ap.abonnement, client: ap.client });
    }
    if (ap.session) Q(`UPDATE abonnement_perso SET abonnement = NULL, client = NULL, statut = 'aucun', fin_periode = NULL, annule = 0 WHERE personne = ?`).run(uid);
    else Q('DELETE FROM abonnement_perso WHERE personne = ?').run(uid);
  }
  /* ⛔ PERSO+ ET LA DEMANDE DE SUPPRESSION D'UN COMPTE (Justin, 4 octobre 2026 : « quelqu'un qui DEMANDE la suppression de son compte veut partir, et le prélever pendant les quatorze jours est injuste »).
     Ce que l'abonnement d'une personne DOIT devenir se DÉDUIT de l'état de la personne — jamais d'un geste isolé, qui se perdrait ou se rejouerait de travers — et se range en `abonnement_a_annuler` :
       · une suppression DEMANDÉE (`suppression_le` posée)  → `fin`        : il cesse de se renouveler chez Stripe ; l'accès reste jusqu'à la fin de la période payée ou jusqu'à l'effacement ;
       · la demande ANNULÉE (la personne se reconnecte)     → `renouveler` : le renouvellement revient — SAUF si NOUS n'y avions pas touché (`touche` = 0 : la personne l'avait arrêté elle-même, par le portail,
                                                                avant sa demande — on ne réactive JAMAIS ce qu'une personne a coupé elle-même) ;
       · le compte EFFACÉ                                   → `resilier`   : `persoVersAnnulation` ; terminal, rien ne la défait.
     IDEMPOTENT et appelé à chaque chemin qui change l'état (la demande, son annulation, leurs REJEUX après une restauration) ET après chaque relecture de Stripe (`facturation-perso.js`) : un abonnement dont le
     paiement n'est reconnu qu'APRÈS la demande reçoit son `fin` à ce moment-là, et un renouvellement que Stripe dit rétabli malgré la demande (la personne l'a remis par le portail) est refait. Une ligne `fin` FAITE
     reste (elle sait, si la personne revient, que le renouvellement est à rétablir) ; jamais de ligne pour un abonnement fini. → 'fin' | 'renouveler' | 'resilier' | null (rien à faire). */
  function persoAjuster(uid) {
    return tx(() => {
      const p = Q('SELECT etat, suppression_le FROM personne WHERE id = ?').get(uid);
      if (!p || p.etat !== 'actif') return null;                                  // un compte effacé : c'est la résiliation (`persoVersAnnulation`), pas ceci
      const ap = Q('SELECT abonnement, client, statut, annule FROM abonnement_perso WHERE personne = ?').get(uid);
      if (!ap || !ap.abonnement) return null;                                      // pas d'abonnement (encore) : le paiement reconnu plus tard rappelle ceci
      const x = Q('SELECT voulu, touche, fait FROM abonnement_a_annuler WHERE abonnement = ?').get(ap.abonnement);
      if (ABO_FINIS.includes(ap.statut)) {                                         // fini chez Stripe : rien à arrêter, rien à rétablir
        if (x && x.voulu !== 'resilier') Q('DELETE FROM abonnement_a_annuler WHERE abonnement = ?').run(ap.abonnement);
        return null;
      }
      if (x && x.voulu === 'resilier') return 'resilier';                          // une résiliation ne se défait JAMAIS
      const t = horloge();
      if (p.suppression_le !== null && p.suppression_le !== undefined) {
        if (!x) Q("INSERT INTO abonnement_a_annuler(abonnement, client, voulu, demande) VALUES(?, ?, 'fin', ?)").run(ap.abonnement, ap.client || null, t);
        else if (x.voulu !== 'fin') Q("UPDATE abonnement_a_annuler SET voulu = 'fin', fait = 0, essais = 0, dernier = NULL, demande = ? WHERE abonnement = ?").run(t, ap.abonnement);
        else if (num(x.fait) === 1 && !ap.annule) Q('UPDATE abonnement_a_annuler SET fait = 0, essais = 0, dernier = NULL, demande = ? WHERE abonnement = ?').run(t, ap.abonnement);   // Stripe dit qu'il se renouvelle encore : on le refait
        return 'fin';
      }
      if (!x) return null;                                                          // rien n'a été arrêté : rien à rétablir
      if (x.voulu === 'fin') {
        if (num(x.touche) === 0) { Q('DELETE FROM abonnement_a_annuler WHERE abonnement = ?').run(ap.abonnement); return null; }   // nous n'avons jamais touché à Stripe : l'état qu'il porte n'est pas le nôtre
        Q("UPDATE abonnement_a_annuler SET voulu = 'renouveler', fait = 0, essais = 0, dernier = NULL, demande = ? WHERE abonnement = ?").run(t, ap.abonnement);
      }
      return 'renouveler';
    });
  }
  /* Un paiement reconnu APRÈS l'effacement du compte : son abonnement passe à l'annulation et la ligne s'en va. */
  function abonnementPersoOrphelin(uid) { return tx(() => { persoVersAnnulation(uid); abonnementPersoNettoyer(uid); }); }
  /* Ce qui reste d'une ligne quand plus rien n'y attend : ni abonnement vivant, ni session — la personne n'a plus rien chez Stripe, et la ligne d'un compte effacé n'a plus de raison d'exister. */
  function abonnementPersoNettoyer(uid) {
    Q(`DELETE FROM abonnement_perso WHERE personne = ? AND session IS NULL AND (abonnement IS NULL OR statut IN ('canceled', 'incomplete_expired', 'aucun')) AND EXISTS (SELECT 1 FROM personne WHERE id = ? AND etat = 'supprime')`).run(uid, uid);
  }
  /* ── ce qu'il reste à faire chez Stripe pour une personne qui s'en va : NOTÉ dans la transaction de son geste (la demande, son annulation, l'effacement), rejoué jusqu'à la confirmation ── */
  /* La RÉSILIATION d'un compte effacé (terminale). Une ligne `fin` ou `renouveler` du même abonnement devient `resilier`, avec une attente neuve ; une résiliation déjà en attente garde son âge et ses essais. */
  function annulationAjouter({ abonnement, client }) {
    Q(`INSERT INTO abonnement_a_annuler(abonnement, client, voulu, demande) VALUES(?, ?, 'resilier', ?)
       ON CONFLICT(abonnement) DO UPDATE SET
         essais = CASE WHEN voulu = 'resilier' THEN essais ELSE 0 END,
         dernier = CASE WHEN voulu = 'resilier' THEN dernier ELSE NULL END,
         demande = CASE WHEN voulu = 'resilier' THEN demande ELSE excluded.demande END,
         client = COALESCE(client, excluded.client),
         voulu = 'resilier', fait = 0`).run(abonnement, client || null, horloge());
  }
  const ligneAnnulation = (r) => r ? { abonnement: r.abonnement, client: r.client, voulu: r.voulu, avant: orNul(r.avant), touche: num(r.touche), fait: num(r.fait) === 1, demande: num(r.demande), essais: num(r.essais), dernier: orNul(r.dernier) } : null;
  /* Ce qui attend Stripe (`fait` = 0), du plus ancien au plus récent. */
  function annulationsDues(limite = 50) {
    return Q('SELECT abonnement, client, voulu, avant, touche, fait, demande, essais, dernier FROM abonnement_a_annuler WHERE fait = 0 ORDER BY demande, abonnement LIMIT ?').all(Math.max(1, limite | 0)).map(ligneAnnulation);
  }
  function annulationLire(abonnement) { return ligneAnnulation(Q('SELECT abonnement, client, voulu, avant, touche, fait, demande, essais, dernier FROM abonnement_a_annuler WHERE abonnement = ?').get(abonnement)); }
  /* La personne a-t-elle changé d'avis pendant que le service parlait à Stripe ? À demander JUSTE AVANT de lui écrire : l'intention rangée doit être encore celle qu'on s'apprête à faire. */
  function annulationEncore(abonnement, voulu) { return !!Q('SELECT 1 AS x FROM abonnement_a_annuler WHERE abonnement = ? AND voulu = ? AND fait = 0').get(abonnement, voulu); }
  /* ⛔ SE SOUVENIR AVANT DE TOUCHER : l'état du renouvellement tel que Stripe le porte (`avant` : 1 = arrêté, 0 = il se renouvelait) et le fait que NOUS allons y toucher (`touche`) se rangent AVANT l'appel — un arrêt
     entre l'appel et sa confirmation n'oublie pas que le geste est le nôtre, et c'est ce qui permet de rétablir sans jamais réactiver ce que la personne avait coupé. → faux si l'intention a changé entre-temps (rien n'est rangé). */
  function annulationMemoriser(abonnement, voulu, { avant, touche }) {
    return num(Q('UPDATE abonnement_a_annuler SET avant = ?, touche = ? WHERE abonnement = ? AND voulu = ? AND fait = 0').run(avant, touche, abonnement, voulu).changes) > 0;
  }
  /* Stripe a CONFIRMÉ. Comparer-et-poser : seule la ligne qui porte encore l'intention accomplie se ferme — une personne qui change d'avis pendant l'appel ne voit pas sa nouvelle demande effacée.
     `fini` : l'abonnement est FINI chez Stripe (résilié, expiré, absent confirmé) — plus rien à faire, quelle que soit l'intention.
       · `fin`        : la ligne RESTE, `fait` ; elle sait ce que Stripe portait avant notre geste ;
       · `renouveler` : Stripe est revenu à l'état d'avant notre geste, la mémoire repart de zéro — et la ligne part, si l'intention n'a pas changé depuis ;
       · `resilier`   : la ligne part. */
  function annulationFaite(abonnement, voulu, { fini = false } = {}) {
    tx(() => {
      if (fini) { Q('DELETE FROM abonnement_a_annuler WHERE abonnement = ?').run(abonnement); return; }
      if (voulu === 'fin') Q("UPDATE abonnement_a_annuler SET fait = 1, essais = 0, dernier = NULL WHERE abonnement = ? AND voulu = 'fin'").run(abonnement);
      else if (voulu === 'renouveler') {
        Q('UPDATE abonnement_a_annuler SET avant = NULL, touche = 0 WHERE abonnement = ?').run(abonnement);
        Q("DELETE FROM abonnement_a_annuler WHERE abonnement = ? AND voulu = 'renouveler'").run(abonnement);
      } else Q("DELETE FROM abonnement_a_annuler WHERE abonnement = ? AND voulu = 'resilier'").run(abonnement);
    });
  }
  function annulationEchec(abonnement) { Q('UPDATE abonnement_a_annuler SET essais = essais + 1, dernier = ? WHERE abonnement = ?').run(horloge(), abonnement); }
  /* La plus ancienne demande encore en attente de Stripe (l'instant où l'intention a été notée), ou null : `/health` n'en publie que l'ÂGE, en minutes — jamais combien, ni lesquelles, ni de quel genre. */
  function annulationPlusAncienne() { const r = Q('SELECT MIN(demande) AS d FROM abonnement_a_annuler WHERE fait = 0').get(); return r && r.d !== null && r.d !== undefined ? num(r.d) : null; }

  /* ══ APPELS À DEUX (migration 8) ET APPELS À PLUSIEURS, SALLES DE RÉUNION (migration 9) ═══════════════════════════════════════════════════════════════
     Ce bloc range et lit : il ne relaie JAMAIS un signal (c'est `appels.js`), n'envoie aucun push, ne lit aucune horloge qu'on ne lui ait donnée (`horloge`, injectée), et ne sait rien d'un média. Ce qu'il tient,
     ce sont les INVARIANTS, chacun dans UNE transaction :
       · ⛔ UNE PERSONNE N'EST QUE DANS UN APPEL À LA FOIS : « occupée » veut dire un appel qui SONNE (sonnerie non échue) ou qui COURT — pour une salle, être DANS la salle, à sa porte (la salle d'attente) ou
         y être appelée tant que la sonnerie court. La sonnerie se juge sur son ÉCHÉANCE, pas sur l'état : un appel dont la sonnerie est échue n'occupe plus personne, même avant que le balayeur l'ait écrit
         « manqué ». Deux lancements simultanés ne passent pas à deux (le contrôle est dans la transaction) ;
       · ⛔ CHAQUE CHANGEMENT D'ÉTAT ÉCRIT SON ÉVÉNEMENT DURABLE (`appel`, adressé aux participants : la page relit la vue de l'appel, rien d'autre ne voyage) dans la MÊME transaction que le changement :
         un événement perdu avec une coupure se rejoue par `Last-Event-ID`, et la vue qu'il porte est celle de l'instant où on la lit (rejouée en retard, elle dit la fin de l'appel, pas une sonnerie fantôme) ;
       · ⛔ UN APPEL MANQUÉ FAIT UNE NOTIFICATION, UNE SEULE FOIS : le passage `sonne → manque` (pour une salle : `invite → manque`) et la notification s'écrivent dans la même transaction, gardés par l'état
         d'où l'on part — un redémarrage, un second balayeur ou une restauration ne la refont pas. (Le PUSH part ensuite, hors de la transaction : s'il se perd, la notification durable reste.) ;
       · l'appareil qui répond est LIÉ à l'appel (`appel_part.session`) ; le premier prend l'appel, un second reçoit `appel_pris` ;
       · un appel FINI ne change plus (toute fin est gardée par `etat IN ('sonne', 'en_cours')`).
     ⛔ UNE SALLE (genre « groupe » ou « reunion ») EST UN APPEL QUI SE TIENT À PLUSIEURS, et le SERVICE y impose ce qu'un navigateur ne peut pas contourner : qui entre (l'admission de la salle d'attente, le
     verrou, la capacité — quatre en vidéo, six en audio —, l'exclusion qui ne revient pas), qui est hôte (l'hôte qui part passe la main : un co-hôte, sinon le plus ancien présent), et à qui le signal est
     relayé (seulement entre participants PRÉSENTS — le serveur cesse de relayer celui d'un exclu). Ce qu'il ne peut pas imposer (couper le micro d'autrui, empêcher un navigateur modifié de garder une liaison
     déjà ouverte) reste une DEMANDE que les pages honorent, et l'écran le dit. */
  const GRADE_HOTE = 2, GRADE_COHOTE = 1;
  function appelBrut(id) { return Q('SELECT id, type, etat, cree, sonne_jusqua, repondu, fin, motif, genre, conv, reunion, capacite, verrou, attente, partage_ok, rec_par FROM appel WHERE id = ?').get(id) || null; }
  const appelPart = (id, uid) => Q('SELECT role, session, statut, grade, entre, gen FROM appel_part WHERE appel = ? AND uid = ?').get(id, uid) || null;
  const appelAutre = (id, uid) => { const r = Q('SELECT uid FROM appel_part WHERE appel = ? AND uid <> ? ORDER BY role, uid').get(id, uid); return r ? r.uid : null; };
  const appelParticipants = (id) => Q('SELECT uid, role, session, statut, grade, entre, gen FROM appel_part WHERE appel = ? ORDER BY role, uid').all(id);
  const sallePresents = (id) => num(Q(`SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = 'present'`).get(id).n);
  /* L'appel de cette personne qui sonne (sonnerie non échue), qui court, ou dont elle est à la porte — son identifiant, ou null. */
  function appelActifDe(uid) {
    const t = horloge();
    const r = Q(`SELECT a.id AS id FROM appel_part p JOIN appel a ON a.id = p.appel
                 WHERE p.uid = ? AND ( (a.genre = 'deux' AND (a.etat = 'en_cours' OR (a.etat = 'sonne' AND a.sonne_jusqua > ?)))
                                    OR (a.genre <> 'deux' AND a.etat IN ('sonne', 'en_cours') AND (p.statut IN ('present', 'attente') OR (p.statut = 'invite' AND a.sonne_jusqua > ?))) )
                 ORDER BY a.cree DESC, a.id DESC LIMIT 1`).get(uid, t, t);
    return r ? r.id : null;
  }
  /* Le titre d'une salle : celui de la réunion, sinon le nom de la conversation du groupe ; vide quand il n'y en a pas (la page nomme alors les personnes). */
  function salleTitre(a) {
    if (a.genre === 'reunion' && a.reunion) { const r = reunionBrute(a.reunion); if (r) { const t = reunionTitre(r); return t === null ? '' : t; } return ''; }
    if (a.conv) { const c = convBrute(a.conv); if (c && c.nom_ch) { const n = nomDe(c.id, c.nom_ch); return n === null ? '' : n; } }
    return '';
  }
  /* La vue d'un appel POUR `uid` : ce que l'événement `appel`, l'historique et les réponses des routes portent. Les personnes ne sont que des identifiants et des noms courts (la page les habille) ;
     jamais une adresse réseau, jamais le détail d'une session. `lie` : cette personne a un appareil LIÉ à l'appel (celui qui l'a lancé, ou qui a répondu) — pas lequel. `manque` : un appel ENTRANT que
     cette personne n'a pas pris (sonnerie échue, annulé par l'appelant, ou reçu pendant qu'elle était en ligne) — la liste « Manqués » et le rouge de l'historique. */
  function appelRangDe(uid, a, me, autre) {
    const sortant = me.role === 'appelant', abouti = a.repondu !== null && a.repondu !== undefined, fin = a.fin === null || a.fin === undefined ? null : num(a.fin);
    return {
      id: a.id, type: a.type, etat: a.etat, genre: 'deux', sens: sortant ? 'sortant' : 'entrant', manque: !sortant && (a.etat === 'manque' || a.etat === 'annule' || a.etat === 'occupe'),
      autre: autre ? personneCourte(uid, autre) : null, debut: num(a.cree), sonne_jusqua: num(a.sonne_jusqua), repondu: abouti ? num(a.repondu) : null, fin,
      duree_s: abouti && fin !== null ? Math.max(0, Math.round((fin - num(a.repondu)) / 1000)) : 0, motif: a.motif || null, lie: !!me.session,
    };
  }
  /* La vue d'une SALLE. Le roster (`participants`) n'est lu que par qui est DANS la salle : une personne à la porte, ou qu'on appelle encore, ne voit ni qui est dedans ni qui attend — seulement combien ils
     sont (`nb`). La salle d'attente (`en_attente`, et ses lignes) n'est lue que par l'hôte et les co-hôtes. Un exclu voit son état (`moi.statut` « exclu »), rien d'autre. */
  function appelRangGroupe(uid, a, me) {
    const sortant = me.role === 'appelant', abouti = a.repondu !== null && a.repondu !== undefined, fin = a.fin === null || a.fin === undefined ? null : num(a.fin);
    const termine = a.etat !== 'sonne' && a.etat !== 'en_cours', dedans = me.statut === 'present', hote = dedans && num(me.grade) >= GRADE_COHOTE;
    const lignes = Q(`SELECT p.uid AS uid, p.role AS role, p.statut AS statut, p.grade AS grade, p.gen AS gen, x.prenom AS prenom, x.nom AS nom, x.avatar_piece AS avatar_piece
                      FROM appel_part p JOIN personne x ON x.id = p.uid WHERE p.appel = ? ORDER BY (p.statut = 'present') DESC, p.grade DESC, p.entre, p.uid`).all(a.id);
    const court = (r) => ({ id: r.uid, prenom: r.prenom, nom: r.nom, avatar: avatarPour(uid, r.uid, r.avatar_piece) });
    const roster = me.statut === 'exclu' || !dedans ? [] : lignes.filter(r => r.statut === 'present' || r.statut === 'invite' || (r.statut === 'attente' && hote))
      .map(r => Object.assign(court(r), { statut: r.statut, grade: num(r.grade), gen: num(r.gen) }));
    const appelant = lignes.find(r => r.role === 'appelant');
    return {
      id: a.id, type: a.type, etat: a.etat, genre: a.genre, groupe: true, conv: a.conv || null, reunion: a.reunion || null, titre: salleTitre(a),
      sens: sortant ? 'sortant' : 'entrant', manque: !sortant && (me.statut === 'manque' || (termine && me.statut === 'invite')),
      autre: appelant && appelant.uid !== uid ? court(appelant) : null, membres: lignes.filter(r => r.uid !== uid).slice(0, 5).map(court),
      debut: num(a.cree), sonne_jusqua: num(a.sonne_jusqua), repondu: abouti ? num(a.repondu) : null, fin,
      duree_s: abouti && fin !== null ? Math.max(0, Math.round((fin - num(a.repondu)) / 1000)) : 0, motif: a.motif || null, lie: !!me.session,
      capacite: a.capacite === null || a.capacite === undefined ? null : num(a.capacite), verrou: !!a.verrou, attente: !!a.attente, partage_ok: !!a.partage_ok, rec: a.rec_par && me.statut !== 'exclu' ? { par: a.rec_par } : null,
      nb: lignes.filter(r => r.statut === 'present').length, en_attente: hote ? lignes.filter(r => r.statut === 'attente').length : 0,
      moi: { statut: me.statut, grade: num(me.grade), gen: num(me.gen) }, participants: roster,
    };
  }
  function appelVue(uid, id) {
    const me = appelPart(id, uid); if (!me) return null;
    const a = appelBrut(id); if (!a) return null;
    return a.genre === 'deux' ? appelRangDe(uid, a, me, appelAutre(id, uid)) : appelRangGroupe(uid, a, me);
  }
  /* Le LAISSEZ-PASSER léger de la garde AP (`app.js`) : { id, etat, role, session (l'empreinte de MA session liée, ou null), autre (l'autre participant d'un appel à deux), sonne_jusqua, genre, statut, grade… } —
     `null` pour inexistant COMME pour « tu n'y participes pas » COMME pour « tu en as été exclu » (404 dans tous les cas, jamais 403). */
  function appelAcces(id, uid) {
    const me = appelPart(id, uid); if (!me) return null;
    const a = appelBrut(id); if (!a) return null;
    if (a.genre !== 'deux' && me.statut === 'exclu') return null;
    return { id: a.id, etat: a.etat, type: a.type, role: me.role, session: me.session || null, autre: a.genre === 'deux' ? appelAutre(id, uid) : null, sonne_jusqua: num(a.sonne_jusqua), cree: num(a.cree),
      genre: a.genre, statut: me.statut, grade: num(me.grade), conv: a.conv || null, reunion: a.reunion || null, capacite: a.capacite === null || a.capacite === undefined ? null : num(a.capacite), verrou: !!a.verrou, attente: !!a.attente, partage_ok: !!a.partage_ok };
  }
  /* Les appels REÇUS par cette personne depuis `depuis` — tous, quelle qu'en soit l'issue (un appel « occupé » ou refusé a fait sonner ou noté un manqué tout de même) → { n, plusAncien }. C'est ce que le
     plafond « par personne appelée » compte : un appelant qui se heurte à un plafond bas ne dit rien des autres. */
  function appelsRecusDepuis(uid, depuis) {
    const r = Q(`SELECT COUNT(*) AS n, MIN(a.cree) AS plus FROM appel_part p JOIN appel a ON a.id = p.appel WHERE p.uid = ? AND p.role = 'appele' AND a.cree > ?`).get(uid, depuis);
    return { n: num(r.n), plusAncien: r.plus === null || r.plus === undefined ? null : num(r.plus) };
  }
  /* L'appel de cette personne qui sonne ou court, dans sa vue ; c'est ce que la page lit à son ouverture (`GET /api/appels`, `actif`) pour reprendre une sonnerie qu'elle a manquée. */
  function appelActifVue(uid) { const id = appelActifDe(uid); return id ? appelVue(uid, id) : null; }
  /* Le texte d'un appel manqué, et sa notification durable — DANS la transaction de l'appelant. Rien d'un auteur que le destinataire a bloqué (ou qui l'a bloqué) : la définition de la messagerie. L'`auteur`
     de la notification est l'appelant : l'effacement de son compte la réécrit (« Un compte supprimé vous a appelé. »). → { id, gid, uid, sourdine } ou null. */
  function appelNotifManque(id, type, appelant, appele) {
    if (contactBloque(appelant, appele)) return null;
    const p = personneParId(appelant);
    const nom = p ? ((p.prenom + ' ' + p.nom).trim() || 'Quelqu\'un') : 'Quelqu\'un';
    const n = notifCreer({ uid: appele, type: 'appel_manque', titre: 'Appel manqué', texte: nom + ' vous a appelé' + (type === 'video' ? ' en vidéo' : '') + '.', cible: id, auteur: appelant });
    return { id: n.id, gid: n.gid, uid: appele, sourdine: appelSourdine(appele, appelant) };
  }
  /* La conversation directe de ces deux personnes est-elle en sourdine pour `appele` ? (la sourdine coupe le PUSH d'un appel manqué, jamais la notification dans l'application) */
  function appelSourdine(appele, appelant) {
    return !!Q(`SELECT 1 AS x FROM membre m JOIN conversation c ON c.id = m.conv WHERE c.cle_directe = ? AND m.uid = ? AND m.quitte_le IS NULL AND m.muet_jusqua > ? LIMIT 1`).get(cleDirecte(appele, appelant), appele, horloge());
  }
  /* Écrit l'événement `appel` des participants. → { [uid]: gid }. Un appel à deux le dit aux DEUX ; une salle, à ceux qui y sont, y attendent ou y sont appelés, plus les `extra` nommés (celui qui vient de partir, d'être
     exclu ou refusé apprend SA fin — et plus rien ensuite : ceux qui sont partis ne reçoivent pas ce que les autres se disent). */
  function appelEvenements(id, extra) {
    const gids = {};
    const a = appelBrut(id);
    const lignes = !a || a.genre === 'deux' ? appelParticipants(id) : Q(`SELECT uid FROM appel_part WHERE appel = ? AND statut IN ('present', 'attente', 'invite') ORDER BY uid`).all(id);
    for (const p of lignes) gids[p.uid] = journalAjouter('appel', null, p.uid, id);
    for (const u of extra || []) if (gids[u] === undefined && appelPart(id, u)) gids[u] = journalAjouter('appel', null, u, id);
    return gids;
  }

  /* Lancer un appel : TOUT dans une transaction — le contrôle « occupé » de l'appelant (il ne fait pas deux appels), celui de l'appelé (écrit alors « occupe », jamais « sonne »), les deux lignes, les deux
     événements, et — appelé occupé — la notification du manqué. `session` : l'empreinte de la session de l'appelant (liée d'emblée). `sonnerieMs` : le délai de la sonnerie. */
  function appelCreer({ appelant, appele, type, session, sonnerieMs }) {
    return tx(() => {
      if (appelActifDe(appelant)) throw erreur('occupe_moi');
      const t = horloge(), id = nouvelId('a'), occupe = appelActifDe(appele) !== null;
      Q('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, fin) VALUES(?, ?, ?, ?, ?, ?)').run(id, type, occupe ? 'occupe' : 'sonne', t, t + sonnerieMs, occupe ? t : null);
      Q('INSERT INTO appel_part(appel, uid, role, session) VALUES(?, ?, ?, ?)').run(id, appelant, 'appelant', session || null);
      Q('INSERT INTO appel_part(appel, uid, role, session) VALUES(?, ?, ?, ?)').run(id, appele, 'appele', null);
      const gids = appelEvenements(id);
      return { id, occupe, gids, notif: occupe ? appelNotifManque(id, type, appelant, appele) : null, vue: appelVue(appelant, id) };
    });
  }
  /* ⛔ LANCER UN APPEL À PLUSIEURS (groupe ou personnes choisies) : TOUT dans une transaction. L'appelant entre, HÔTE, appareil lié d'emblée ; chaque invité dont la ligne est libre SONNE (`invite`), celui qui est
     déjà dans un appel est écrit « manqué » tout de suite (et reçoit la notification d'un manqué : il saura qu'on l'a appelé) ; si PERSONNE ne peut sonner, l'appel est écrit « occupé » et ne démarre pas.
     `invites` : déjà jugés par l'appelant (le droit de les joindre, les plafonds). `capacite` : quatre en vidéo, six en audio, posé ici et NE CHANGE PLUS pour cet appel.
     → { id, occupe, gids, notifs, sonnent, occupes, vue } */
  function appelCreerGroupe({ appelant, invites, type, session, sonnerieMs, capacite, conv, attente }) {
    return tx(() => {
      if (appelActifDe(appelant)) throw erreur('occupe_moi');
      const t = horloge(), id = nouvelId('a'), dispo = [], occupes = [];
      for (const u of Array.from(new Set(invites)).filter(x => x !== appelant)) (appelActifDe(u) ? occupes : dispo).push(u);
      const occupe = dispo.length === 0;
      Q('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, fin, genre, conv, capacite, attente) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, type, occupe ? 'occupe' : 'sonne', t, t + sonnerieMs, occupe ? t : null, 'groupe', conv || null, capacite, attente ? 1 : 0);
      Q('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(id, appelant, 'appelant', occupe ? null : (session || null), occupe ? 'parti' : 'present', GRADE_HOTE, t, 1);
      for (const u of dispo) Q('INSERT INTO appel_part(appel, uid, role, session, statut, grade, gen) VALUES(?, ?, ?, ?, ?, ?, ?)').run(id, u, 'appele', null, 'invite', 0, 0);
      const notifs = [];
      for (const u of occupes) {
        Q('INSERT INTO appel_part(appel, uid, role, session, statut, grade, gen) VALUES(?, ?, ?, ?, ?, ?, ?)').run(id, u, 'appele', null, 'manque', 0, 0);
        const n = appelNotifManque(id, type, appelant, u); if (n) notifs.push(n);
      }
      const gids = {};
      for (const u of [appelant].concat(dispo, occupes)) gids[u] = journalAjouter('appel', null, u, id);
      return { id, occupe, gids, notifs, sonnent: dispo, occupes, vue: appelVue(appelant, id) };
    });
  }
  /* L'appelé répond (accepte) ou refuse. Le premier appareil qui accepte PREND l'appel (sa session y est liée) ; un autre appareil de la même personne reçoit `appel_pris`, un appel qui n'est plus à
     l'état « sonne » `appel_fini`. Refuser finit l'appel pour TOUS les appareils de l'appelé. Rejouable : la même session qui répond deux fois reçoit la même vue (`deja`).
     Une SALLE : répondre, c'est y ENTRER (`appelRejoindre`), refuser c'est ne pas y venir (`appelPartir`) — l'appel continue pour les autres. */
  function appelRepondre({ id, uid, session, accepte }) {
    return tx(() => {
      const me = appelPart(id, uid), a = appelBrut(id);
      if (!me || !a) throw erreur('introuvable');
      if (a.genre !== 'deux') return accepte ? appelRejoindre({ id, uid, session }) : appelPartir({ id, uid, session });
      if (me.role !== 'appele') throw erreur('interdit');
      if (a.etat === 'en_cours') {
        if (accepte && me.session && me.session === session) return { deja: true, gids: {}, vue: appelVue(uid, id), etat: a.etat };
        throw erreur('appel_pris');
      }
      if (a.etat !== 'sonne' || num(a.sonne_jusqua) <= horloge()) throw erreur('appel_fini');
      const t = horloge();
      if (accepte) {
        Q('UPDATE appel_part SET session = ? WHERE appel = ? AND uid = ?').run(session, id, uid);
        Q(`UPDATE appel SET etat = 'en_cours', repondu = ? WHERE id = ? AND etat = 'sonne'`).run(t, id);
      } else {
        Q(`UPDATE appel SET etat = 'refuse', fin = ? WHERE id = ? AND etat = 'sonne'`).run(t, id);
      }
      return { deja: false, gids: appelEvenements(id), vue: appelVue(uid, id), etat: accepte ? 'en_cours' : 'refuse' };
    });
  }
  /* Raccrocher, annuler, refuser. Selon l'état et le rôle : `sonne` + appelant → « annule » (l'appelé a MANQUÉ cet appel : notification) ; `sonne` + appelé → « refuse » ; `en_cours` → « fini ».
     Un appel déjà fini : rien à faire (`deja`), c'est le cas ordinaire de la page qui raccroche après que l'autre l'a fait. Une session qui n'est pas celle LIÉE à l'appel ne le raccroche pas
     (`appareil_non_lie`) — l'appelé, tant qu'il n'a pas répondu, n'est lié à aucune. Une SALLE : on en SORT (`appelPartir`), elle continue pour les autres. */
  function appelQuitter({ id, uid, session }) {
    return tx(() => {
      const me = appelPart(id, uid), a = appelBrut(id);
      if (!me || !a) throw erreur('introuvable');
      if (a.genre !== 'deux') return appelPartir({ id, uid, session });
      if (a.etat !== 'sonne' && a.etat !== 'en_cours') return { deja: true, gids: {}, vue: appelVue(uid, id), etat: a.etat, notif: null };
      if (me.session && me.session !== session) throw erreur('appareil_non_lie');
      const etat = a.etat === 'en_cours' ? 'fini' : (me.role === 'appelant' ? 'annule' : 'refuse');
      return appelFinirDans(id, etat, null, horloge(), uid);
    });
  }
  /* La fin d'un appel à deux (à l'intérieur d'une transaction) : l'état, l'instant, le motif, les événements — et la notification du manqué quand l'appelant annule avant la réponse. */
  function appelFinirDans(id, etat, motif, fin, vuPar) {
    const a = appelBrut(id);
    if (a && a.genre !== 'deux') return salleFinirDans(id, etat, motif, fin, vuPar);
    if (!a || !num(Q(`UPDATE appel SET etat = ?, fin = ?, motif = ? WHERE id = ? AND etat IN ('sonne', 'en_cours')`).run(etat, fin, motif, id).changes)) return { deja: true, gids: {}, vue: vuPar ? appelVue(vuPar, id) : null, etat: a ? a.etat : null, notif: null };
    const parts = appelParticipants(id);
    const appelant = (parts.find(p => p.role === 'appelant') || {}).uid, appele = (parts.find(p => p.role === 'appele') || {}).uid;
    /* l'appelant a annulé (ou a disparu) pendant la sonnerie : l'appelé a manqué quelque chose */
    const notif = a.etat === 'sonne' && etat === 'annule' && appelant && appele ? appelNotifManque(id, a.type, appelant, appele) : null;
    return { deja: false, gids: appelEvenements(id), vue: vuPar ? appelVue(vuPar, id) : null, etat, notif };
  }
  /* Finir un appel de l'extérieur (le balayeur : appareil perdu ; un blocage…) : l'état qui convient à l'état actuel (un appel en cours est « fini », un appel qui sonne encore est « annulé ») — l'appelant
     disparu pendant la sonnerie fait donc MANQUER l'appel à l'appelé, comme s'il avait raccroché. */
  function appelFinir({ id, motif, fin }) {
    return tx(() => {
      const a = appelBrut(id); if (!a) return { deja: true, gids: {}, vue: null, etat: null, notif: null, notifs: [] };
      return appelFinirDans(id, a.etat === 'en_cours' ? 'fini' : 'annule', motif || null, fin === undefined ? horloge() : fin, null);
    });
  }
  /* Les sonneries ÉCHUES : `sonne → manque`, avec la notification de l'appelé — UNE transaction pour tout le lot, chaque appel gardé par `WHERE etat = 'sonne'`. → [{ id, appelant, appele, type, notif, gids }]
     Une SALLE dont la sonnerie est échue : chaque invité qui n'a pas répondu devient « manqué » (une notification chacun, une seule fois : la ligne ne repart pas de `invite`), et la salle où l'appelant est
     resté seul finit « manquée » — elle continue, sinon, pour ceux qui y sont. → { id, groupe: true, appelant, type, notifs, gids } */
  function appelsEchoir(t) {
    return tx(() => {
      const faits = [];
      for (const r of Q(`SELECT id, type FROM appel WHERE genre = 'deux' AND etat = 'sonne' AND sonne_jusqua <= ? ORDER BY sonne_jusqua, id LIMIT 200`).all(t)) {
        if (!num(Q(`UPDATE appel SET etat = 'manque', fin = sonne_jusqua WHERE id = ? AND etat = 'sonne'`).run(r.id).changes)) continue;
        const parts = appelParticipants(r.id), appelant = (parts.find(p => p.role === 'appelant') || {}).uid, appele = (parts.find(p => p.role === 'appele') || {}).uid;
        faits.push({ id: r.id, appelant, appele, type: r.type, gids: appelEvenements(r.id), notif: appelant && appele ? appelNotifManque(r.id, r.type, appelant, appele) : null });
      }
      for (const r of Q(`SELECT id, type, etat, sonne_jusqua FROM appel WHERE genre <> 'deux' AND etat IN ('sonne', 'en_cours') AND sonne_jusqua <= ? AND EXISTS (SELECT 1 FROM appel_part p WHERE p.appel = appel.id AND p.statut = 'invite') ORDER BY sonne_jusqua, id LIMIT 200`).all(t)) {
        const appelant = (Q(`SELECT uid FROM appel_part WHERE appel = ? AND role = 'appelant'`).get(r.id) || {}).uid;
        if (r.etat === 'sonne' && sallePresents(r.id) <= 1) {
          const f = salleFinirDans(r.id, 'manque', null, num(r.sonne_jusqua));
          if (!f.deja) faits.push({ id: r.id, groupe: true, appelant, type: r.type, notifs: f.notifs, gids: f.gids });
          continue;
        }
        const notifs = [], quand = [];
        for (const p of Q(`SELECT uid FROM appel_part WHERE appel = ? AND statut = 'invite' ORDER BY uid`).all(r.id)) {
          Q(`UPDATE appel_part SET statut = 'manque' WHERE appel = ? AND uid = ? AND statut = 'invite'`).run(r.id, p.uid);
          quand.push(p.uid);
          const n = appelNotifManque(r.id, r.type, appelant, p.uid); if (n) notifs.push(n);
        }
        faits.push({ id: r.id, groupe: true, appelant, type: r.type, notifs, gids: appelEvenements(r.id, quand) });
      }
      return faits;
    });
  }
  /* Les appels vivants (qui sonnent ou courent) avec leurs participants et l'empreinte de leur session liée : de quoi juger qui a disparu (`appels.js`). Borné. */
  function appelsActifs() {
    return Q(`SELECT id, etat, type, genre, cree, sonne_jusqua, repondu FROM appel WHERE etat IN ('sonne', 'en_cours') ORDER BY cree LIMIT 5000`).all()
      .map(a => ({ id: a.id, etat: a.etat, type: a.type, genre: a.genre, cree: num(a.cree), sonne_jusqua: num(a.sonne_jusqua), repondu: a.repondu === null ? null : num(a.repondu),
        parts: appelParticipants(a.id).map(p => ({ uid: p.uid, role: p.role, session: p.session || null, statut: p.statut, grade: num(p.grade) })) }));
  }
  /* L'historique d'une personne : les appels FINIS, du plus récent, bornés. `manques` : ses appels entrants qu'elle n'a pas pris (une salle où elle était appelée et n'est pas venue, comprise). */
  function appelsListe(uid, { manques = false, limite = 100 } = {}) {
    const lim = Math.max(1, Math.min(500, limite | 0));
    const ids = manques
      ? Q(`SELECT a.id AS id FROM appel_part p JOIN appel a ON a.id = p.appel
           WHERE p.uid = ? AND p.role = 'appele' AND ( (a.genre = 'deux' AND a.etat IN ('manque', 'annule', 'occupe'))
                                                    OR (a.genre <> 'deux' AND (p.statut = 'manque' OR (p.statut = 'invite' AND a.etat NOT IN ('sonne', 'en_cours')))) )
           ORDER BY a.cree DESC, a.id DESC LIMIT ?`).all(uid, lim)
      : Q(`SELECT a.id AS id FROM appel_part p JOIN appel a ON a.id = p.appel WHERE p.uid = ? AND a.etat NOT IN ('sonne', 'en_cours') ORDER BY a.cree DESC, a.id DESC LIMIT ?`).all(uid, lim);
    return ids.map(r => appelVue(uid, r.id)).filter(Boolean);
  }
  /* Un appel fini depuis longtemps n'est plus de l'historique, c'est une donnée personnelle qu'on garde pour rien. */
  function appelsElaguer(avant) { return num(Q(`DELETE FROM appel WHERE cree < ? AND etat NOT IN ('sonne', 'en_cours')`).run(avant).changes); }

  /* ══ LES SALLES — entrer, sortir, être admis, exclu ; l'hôte qui passe la main ══════════════════════════════════════════════════════════════════════
     ⛔ ENTRER, c'est une décision du SERVICE, jugée ici dans une transaction : l'appel vit, on n'en est pas exclu, l'appareil qui le tient est le même (ou il est libre), personne n'est dans un autre appel,
     la salle n'est pas verrouillée (sauf pour l'hôte et ses co-hôtes), la capacité n'est pas atteinte, la salle d'attente n'est pas demandée (sauf pour l'hôte et ses co-hôtes : on y attend d'être admis).
     Un compte qui n'a pas de ligne y entre s'il y a droit : un membre de la conversation du groupe, un invité de la réunion — sinon la MÊME réponse qu'une salle qui n'existe pas. */
  function appelRejoindre({ id, uid, session }) {
    return tx(() => {
      const a = appelBrut(id);
      if (!a || a.genre === 'deux') throw erreur('introuvable');
      const p = appelPart(id, uid);
      /* ⛔ LE DROIT SE JUGE À CHAQUE ENTRÉE, pas seulement la première : celui qu'on a retiré du groupe (ou de la réunion) depuis n'entre plus, même s'il a une ligne « parti » ou « manqué » dans la salle. Une salle
         de personnes CHOISIES (sans conversation) n'a que ses lignes pour droit. */
      const droit = a.genre === 'groupe'
        ? (a.conv ? !!convPourMembre(a.conv, uid) : !!p)
        : (a.genre === 'reunion' && !!a.reunion && !!Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(a.reunion, uid));
      if (!droit) throw erreur('introuvable');
      if (p && p.statut === 'exclu') throw erreur('exclu');
      if (a.etat !== 'sonne' && a.etat !== 'en_cours') throw erreur('appel_fini');
      if (p && p.statut === 'present') {
        if (p.session && p.session === session) return { deja: true, attente: false, gids: {}, vue: appelVue(uid, id), etat: a.etat };
        throw erreur('appel_pris');
      }
      if (p && p.statut === 'attente' && p.session === session) return { deja: true, attente: true, gids: {}, vue: appelVue(uid, id), etat: a.etat };
      const ailleurs = appelActifDe(uid);
      if (ailleurs && ailleurs !== id) throw erreur('occupe_moi');
      const t = horloge();
      const hoteReunion = a.genre === 'reunion' && a.reunion && (Q('SELECT hote FROM reunion WHERE id = ?').get(a.reunion) || {}).hote === uid;
      /* ⛔ UNE SALLE N'EST JAMAIS SANS MAÎTRE : quand personne n'y tient plus la porte (ni hôte ni co-hôte PRÉSENT — la salle d'une réunion qu'un invité ouvre avant l'organisateur), le premier qui entre en devient l'hôte PAR
         INTÉRIM. Il passe la porte sans attendre (personne ne pourrait l'admettre), et l'organisateur qui arrive reprend la main (plus bas). */
      const detenteur = num(Q(`SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = 'present' AND grade >= ?`).get(id, GRADE_COHOTE).n) > 0;
      const grade = (hoteReunion || !detenteur) ? GRADE_HOTE : (p ? num(p.grade) : 0), pouvoir = grade >= GRADE_COHOTE;
      if (a.verrou && !pouvoir) throw erreur('verrouillee');
      const attend = !!a.attente && !pouvoir;
      if (!attend && sallePresents(id) >= num(a.capacite)) throw erreur('appel_complet');
      const statut = attend ? 'attente' : 'present';
      if (p) Q('UPDATE appel_part SET statut = ?, session = ?, grade = ?, entre = ?, gen = gen + ? WHERE appel = ? AND uid = ?').run(statut, session, grade, t, attend ? 0 : 1, id, uid);
      else Q('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(id, uid, 'appele', session, statut, grade, t, attend ? 0 : 1);
      /* l'organisateur qui arrive REPREND la main : celui qui la tenait à sa place (le plus ancien, ou un co-hôte) devient co-hôte */
      if (hoteReunion && !attend) Q(`UPDATE appel_part SET grade = ? WHERE appel = ? AND uid <> ? AND grade = ?`).run(GRADE_COHOTE, id, uid, GRADE_HOTE);
      if (!attend) salleDemarrerSiDeux(id, t);
      return { deja: false, attente: attend, gids: appelEvenements(id, [uid]), vue: appelVue(uid, id), etat: appelBrut(id).etat };
    });
  }
  /* Deux personnes dans la salle : l'appel sonnait, il COURT (l'instant de la première réponse date `repondu`). */
  function salleDemarrerSiDeux(id, t) {
    if (sallePresents(id) >= 2) Q(`UPDATE appel SET etat = 'en_cours', repondu = COALESCE(repondu, ?) WHERE id = ? AND etat = 'sonne'`).run(t, id);
  }
  /* ⛔ SORTIR (raccrocher, quitter la salle, refuser la sonnerie, disparaître — `motif` « perdu » —, voir son compte effacé — « compte »). Une transaction :
       · présent → parti (l'appareil est délié : plus un signal ne lui est relayé) ; à la porte → parti ; sonnerie qui court → refusé. Déjà sorti : rien (`deja`) ;
       · l'HÔTE qui part passe la main : un co-hôte, sinon le plus ancien présent (l'entrée la plus ancienne) ; le bandeau REC s'éteint si c'est lui qui enregistrait ;
       · plus personne dedans : la salle FINIT (« annulée » si l'appelant raccroche avant toute réponse — les invités ont manqué quelque chose —, « fini » sinon) ; l'appelant resté seul, sans plus
         personne à la sonnerie, finit « refusé » (tous ont refusé) ou « manqué ».
     Une autre session que celle liée ne fait pas partir (`appareil_non_lie`), sauf quand c'est le service qui juge (`perdu`, `compte`). */
  function appelPartir({ id, uid, session, motif }) {
    return tx(() => {
      const a = appelBrut(id), p = appelPart(id, uid);
      if (!a || !p) throw erreur('introuvable');
      if (a.genre === 'deux') throw erreur('introuvable');
      if (a.etat !== 'sonne' && a.etat !== 'en_cours') return { deja: true, gids: {}, vue: appelVue(uid, id), etat: a.etat, notif: null, notifs: [] };
      if (p.session && session && p.session !== session && motif !== 'perdu' && motif !== 'compte') throw erreur('appareil_non_lie');
      return appelPartirDans(id, uid, motif || null);
    });
  }
  function appelPartirDans(id, uid, motif) {
    const a = appelBrut(id), p = appelPart(id, uid), t = horloge();
    if (!a || !p || (a.etat !== 'sonne' && a.etat !== 'en_cours')) return { deja: true, gids: {}, vue: p ? appelVue(uid, id) : null, etat: a ? a.etat : null, notif: null, notifs: [] };
    if (p.statut === 'present' || p.statut === 'attente') {
      Q(`UPDATE appel_part SET statut = 'parti', session = NULL, grade = CASE WHEN grade = ? THEN 0 ELSE grade END WHERE appel = ? AND uid = ?`).run(GRADE_HOTE, id, uid);
      if (a.rec_par === uid) Q('UPDATE appel SET rec_par = NULL WHERE id = ?').run(id);
      if (num(p.grade) === GRADE_HOTE && p.statut === 'present') {
        const s = Q(`SELECT uid FROM appel_part WHERE appel = ? AND statut = 'present' AND uid <> ? ORDER BY grade DESC, entre, uid LIMIT 1`).get(id, uid);
        if (s) Q('UPDATE appel_part SET grade = ? WHERE appel = ? AND uid = ?').run(GRADE_HOTE, id, s.uid);
      }
    } else if (p.statut === 'invite') {
      Q(`UPDATE appel_part SET statut = 'refuse', session = NULL WHERE appel = ? AND uid = ?`).run(id, uid);
    } else return { deja: true, gids: {}, vue: appelVue(uid, id), etat: a.etat, notif: null, notifs: [] };
    const dedans = sallePresents(id);
    if (dedans === 0) {
      const f = salleFinirDans(id, a.etat === 'en_cours' ? 'fini' : 'annule', motif, t, uid);
      return Object.assign(f, { fini: true, successeur: null });
    }
    if (a.etat === 'sonne' && dedans <= 1 && num(Q(`SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND statut = 'invite'`).get(id).n) === 0 && p.statut === 'invite') {
      const f = salleFinirDans(id, 'refuse', motif, t, uid);
      return Object.assign(f, { fini: true, successeur: null });
    }
    return { deja: false, fini: false, gids: appelEvenements(id, [uid]), vue: appelVue(uid, id), etat: a.etat, notif: null, notifs: [] };
  }
  /* La fin d'une salle (à l'intérieur d'une transaction) : l'état, l'instant, le motif ; chaque ligne rend sa place (présent → parti, à la porte → refusé, la sonnerie qui court → manqué, AVEC la
     notification de l'appel manqué) ; le bandeau REC s'éteint ; chaque participant reçoit l'événement de la fin. → { deja, gids, notifs, vue (pour `vuPar`), etat } */
  function salleFinirDans(id, etat, motif, fin, vuPar) {
    const a = appelBrut(id);
    if (!a || !num(Q(`UPDATE appel SET etat = ?, fin = ?, motif = ?, rec_par = NULL WHERE id = ? AND etat IN ('sonne', 'en_cours')`).run(etat, fin, motif || null, id).changes)) return { deja: true, gids: {}, notifs: [], notif: null, vue: vuPar ? appelVue(vuPar, id) : null, etat: a ? a.etat : null };
    const lignes = appelParticipants(id), appelant = (lignes.find(p => p.role === 'appelant') || {}).uid, notifs = [];
    for (const p of lignes) {
      if (p.statut === 'invite') {
        Q(`UPDATE appel_part SET statut = 'manque', session = NULL WHERE appel = ? AND uid = ?`).run(id, p.uid);
        const n = appelant ? appelNotifManque(id, a.type, appelant, p.uid) : null; if (n) notifs.push(n);
      } else if (p.statut === 'present') Q(`UPDATE appel_part SET statut = 'parti', session = NULL WHERE appel = ? AND uid = ?`).run(id, p.uid);
      else if (p.statut === 'attente') Q(`UPDATE appel_part SET statut = 'refuse', session = NULL WHERE appel = ? AND uid = ?`).run(id, p.uid);
    }
    const gids = {};
    for (const p of lignes) gids[p.uid] = journalAjouter('appel', null, p.uid, id);
    return { deja: false, gids, notifs, notif: null, vue: vuPar ? appelVue(vuPar, id) : null, etat };
  }

  /* ── ce que l'HÔTE et ses co-hôtes décident ── */
  const salleVivante = (id) => { const a = appelBrut(id); if (!a || a.genre === 'deux') throw erreur('introuvable'); if (a.etat !== 'sonne' && a.etat !== 'en_cours') throw erreur('appel_fini'); return a; };
  /* `par` doit être DANS la salle avec le grade voulu : la garde de la route l'a jugé, la transaction le rejuge (un hôte parti entre les deux ne commande plus rien). */
  function salleCommandant(id, par, gradeMin) {
    const p = appelPart(id, par);
    if (!p || p.statut !== 'present') throw erreur('introuvable');
    if (num(p.grade) < gradeMin) throw erreur('interdit');
    return p;
  }
  /* Admettre : la salle d'attente se vide dans la limite de la capacité (une seule personne, ou tout le monde — dans l'ordre d'arrivée). Ce qui ne rentre pas reste à la porte. → { admis, restent, gids } */
  function salleAdmettre({ id, par, uid, tous }) {
    return tx(() => {
      const a = salleVivante(id); salleCommandant(id, par, GRADE_COHOTE);
      const attendent = Q(`SELECT uid FROM appel_part WHERE appel = ? AND statut = 'attente' ORDER BY entre, uid`).all(id).map(r => r.uid).filter(u => tous === true || u === uid);
      if (!attendent.length) throw erreur('introuvable');
      const t = horloge(), admis = [];
      for (const u of attendent) {
        if (sallePresents(id) >= num(a.capacite)) break;
        Q(`UPDATE appel_part SET statut = 'present', gen = gen + 1, entre = ? WHERE appel = ? AND uid = ? AND statut = 'attente'`).run(t, id, u);
        admis.push(u);
      }
      if (!admis.length) throw erreur('appel_complet');
      salleDemarrerSiDeux(id, t);
      return { admis, restent: attendent.filter(u => !admis.includes(u)), gids: appelEvenements(id, admis) };
    });
  }
  /* Refuser : on ne laisse pas entrer (la personne peut redemander — l'hôte qui ne veut plus la voir l'exclut). */
  function salleRefuser({ id, par, uid }) {
    return tx(() => {
      salleVivante(id); salleCommandant(id, par, GRADE_COHOTE);
      if (!num(Q(`UPDATE appel_part SET statut = 'refuse', session = NULL WHERE appel = ? AND uid = ? AND statut = 'attente'`).run(id, uid).changes)) throw erreur('introuvable');
      return { gids: appelEvenements(id, [uid]) };
    });
  }
  /* ⛔ EXCLURE : la personne n'est plus participante (sa ligne dit « exclu », l'appareil délié, plus de grade) et NE REVIENT PAS — `appelRejoindre` la refuse (`exclu`). Un co-hôte exclut un participant ;
     seul l'hôte exclut un co-hôte ; on n'exclut ni l'hôte ni soi-même. → { gids, etait: l'état d'avant } */
  function salleExclure({ id, par, uid }) {
    return tx(() => {
      const a = salleVivante(id), moi = salleCommandant(id, par, GRADE_COHOTE);
      const p = appelPart(id, uid);
      if (!p || uid === par) throw erreur('introuvable');
      if (p.statut === 'exclu') return { deja: true, gids: {}, etait: 'exclu' };
      if (num(p.grade) >= GRADE_HOTE) throw erreur('interdit');
      if (num(p.grade) >= GRADE_COHOTE && num(moi.grade) < GRADE_HOTE) throw erreur('interdit');
      Q(`UPDATE appel_part SET statut = 'exclu', session = NULL, grade = 0 WHERE appel = ? AND uid = ?`).run(id, uid);
      if (a.rec_par === uid) Q('UPDATE appel SET rec_par = NULL WHERE id = ?').run(id);
      return { deja: false, gids: appelEvenements(id, [uid]), etait: p.statut };
    });
  }
  function salleReglage(id, par, colonne, valeur) {
    return tx(() => {
      salleVivante(id); salleCommandant(id, par, GRADE_COHOTE);
      if (colonne === 'verrou') Q('UPDATE appel SET verrou = ? WHERE id = ?').run(valeur ? 1 : 0, id);
      else if (colonne === 'attente') Q('UPDATE appel SET attente = ? WHERE id = ?').run(valeur ? 1 : 0, id);
      else if (colonne === 'partage_ok') Q('UPDATE appel SET partage_ok = ? WHERE id = ?').run(valeur ? 1 : 0, id);
      else throw erreur('champ_invalide');
      return { gids: appelEvenements(id) };
    });
  }
  const salleVerrou = (id, par, actif) => salleReglage(id, par, 'verrou', actif);
  const salleAttente = (id, par, actif) => salleReglage(id, par, 'attente', actif);
  const sallePartage = (id, par, actif) => salleReglage(id, par, 'partage_ok', actif);
  /* L'enregistrement LOCAL : le bandeau « REC » s'allume chez tous tant que la personne qui enregistre est dans la salle. Seul l'hôte le commence (la page de l'hôte enregistre, rien n'est envoyé au service) ;
     l'hôte ou un co-hôte l'éteint. */
  function salleRec(id, par, actif) {
    return tx(() => {
      const a = salleVivante(id);
      salleCommandant(id, par, actif ? GRADE_HOTE : GRADE_COHOTE);
      if (actif) Q('UPDATE appel SET rec_par = ? WHERE id = ?').run(par, id);
      else if (a.rec_par) Q('UPDATE appel SET rec_par = NULL WHERE id = ?').run(id);
      return { gids: appelEvenements(id) };
    });
  }
  /* Co-hôte : l'hôte seul promeut ou retire (une personne PRÉSENTE, jamais lui-même). */
  function salleCohote({ id, par, uid, actif }) {
    return tx(() => {
      salleVivante(id); salleCommandant(id, par, GRADE_HOTE);
      const p = appelPart(id, uid);
      if (!p || p.statut !== 'present' || uid === par) throw erreur('introuvable');
      Q('UPDATE appel_part SET grade = ? WHERE appel = ? AND uid = ?').run(actif ? GRADE_COHOTE : 0, id, uid);
      return { gids: appelEvenements(id) };
    });
  }
  /* Terminer pour tous : l'hôte seul. Chaque participant reçoit la fin. */
  function salleTerminer({ id, par }) {
    return tx(() => {
      const a = salleVivante(id); salleCommandant(id, par, GRADE_HOTE);
      return salleFinirDans(id, a.etat === 'en_cours' ? 'fini' : 'annule', 'termine', horloge(), par);
    });
  }
  /* Les appareils liés des personnes PRÉSENTES (le service relaie les événements de la salle à ceux-là seuls) → [{ uid, session }] */
  const appelAppelant = (id) => { const r = Q(`SELECT uid FROM appel_part WHERE appel = ? AND role = 'appelant'`).get(id); return r ? r.uid : null; };   // celui qui a lancé l'appel (un autre est devenu hôte depuis, jamais « l'appelant »)
  const salleSessions = (id) => Q(`SELECT uid, session FROM appel_part WHERE appel = ? AND statut = 'present' AND session IS NOT NULL ORDER BY uid`).all(id).map(r => ({ uid: r.uid, session: r.session }));
  /* ⛔ QUI ORGANISE UNE SALLE (Perso+) : le genre de la salle, et — pour un appel de groupe — la personne qui l'a LANCÉ (jamais l'hôte du moment : un autre est devenu hôte depuis, ce n'est pas lui qui paie). Une
     salle de RÉUNION n'a pas d'organisateur ici : sa réunion a été programmée par quelqu'un qui pouvait l'organiser, et ses outils lui restent. → { genre, organisateur } ou null (pas une salle). */
  function salleOrganisateur(id) {
    const a = appelBrut(id);
    if (!a || a.genre === 'deux') return null;
    return { genre: a.genre, organisateur: a.genre === 'groupe' ? appelAppelant(id) : null };
  }
  /* La salle de cette réunion, si elle est ouverte (qui sonne ou court) → son identifiant, ou null. */
  const salleDeReunion = (reunion) => { const r = Q(`SELECT id FROM appel WHERE reunion = ? AND genre = 'reunion' AND etat IN ('sonne', 'en_cours') ORDER BY cree DESC, id DESC LIMIT 1`).get(reunion); return r ? r.id : null; };
  /* ⛔ ENTRER DANS LA SALLE D'UNE RÉUNION PROGRAMMÉE : la salle est ouverte par le PREMIER qui entre (elle naît « en cours », personne n'y sonne) ; les suivants rejoignent celle qui est ouverte. Il faut être invité (l'hôte
     l'est toujours). La capacité vient du type demandé par celui qui ouvre : quatre en vidéo, six en audio. → comme `appelRejoindre`, plus { cree, id } */
  function salleReunionRejoindre({ reunion, uid, session, type, capacite }) {
    return tx(() => {
      const r = reunionBrute(reunion); if (!r) throw erreur('introuvable');
      if (!Q('SELECT 1 AS x FROM reunion_invite WHERE reunion = ? AND uid = ?').get(reunion, uid)) throw erreur('introuvable');
      if (r.annulee) throw erreur('reunion_annulee');
      let id = salleDeReunion(reunion), cree = false;
      if (!id) {
        if (appelActifDe(uid)) throw erreur('occupe_moi');
        const t = horloge();
        id = nouvelId('a'); cree = true;
        Q('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, repondu, genre, conv, reunion, capacite, attente) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, type, 'en_cours', t, t, t, 'reunion', r.conv, reunion, capacite, r.attente ? 1 : 0);
        Q('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen) VALUES(?, ?, ?, NULL, ?, 0, NULL, 0)').run(id, uid, 'appelant', 'parti');
      }
      const j = appelRejoindre({ id, uid, session });
      return Object.assign(j, { cree, id });
    });
  }
  /* Les salles OUVERTES où cette personne peut entrer et n'est pas : un appel de groupe de ses conversations (sonnerie qui court ou appel en cours), la salle d'une réunion où elle est invitée. Une version
     courte (pas le roster) : de quoi montrer « Rejoindre » dans la conversation, l'agenda et la fiche. Jamais une salle dont on est exclu, jamais celle où l'on est déjà. */
  function sallesOuvertes(uid) {
    const ids = Q(`SELECT a.id AS id FROM appel a
                   WHERE a.etat IN ('sonne', 'en_cours')
                     AND ( (a.genre = 'groupe' AND a.conv IN (SELECT conv FROM membre WHERE uid = ? AND quitte_le IS NULL))
                        OR (a.genre = 'reunion' AND a.reunion IN (SELECT reunion FROM reunion_invite WHERE uid = ?)) )
                     AND NOT EXISTS (SELECT 1 FROM appel_part p WHERE p.appel = a.id AND p.uid = ? AND p.statut IN ('exclu', 'present', 'attente'))
                   ORDER BY a.cree DESC, a.id DESC LIMIT 20`).all(uid, uid, uid);
    return ids.map(r => {
      const a = appelBrut(r.id);
      return { id: a.id, genre: a.genre, type: a.type, conv: a.conv || null, reunion: a.reunion || null, titre: salleTitre(a), nb: sallePresents(a.id), capacite: num(a.capacite), verrou: !!a.verrou, attente: !!a.attente, debut: num(a.cree) };
    });
  }
  /* ⛔ L'EFFACEMENT D'UN COMPTE ET SES APPELS (appelé par `compteEffacer`, rejoué par `appelsReparer`). Un appel à deux qui sonne ou court se TERMINE (l'autre l'apprend : événement durable) ; une SALLE, la
     personne en SORT (l'hôte passe la main, la salle continue pour les autres, ou finit si elle était seule) ; la ligne de la personne part (l'autre garde l'appel, sans nom : « Compte supprimé »), et l'appel part avec sa dernière
     ligne. Rejouable : sans appel, rien à faire — et rien n'est écrit au registre des purges : c'est `compteEffacer` qui est noté (genre « compte », rejoué par le service), et il refait ceci. → les personnes à réveiller. */
  function appelsQuitterTout(uid) {
    const reveil = [], t = horloge();
    for (const r of Q(`SELECT a.id AS id, a.etat AS etat, a.genre AS genre, p.role AS role FROM appel_part p JOIN appel a ON a.id = p.appel WHERE p.uid = ? AND a.etat IN ('sonne', 'en_cours') ORDER BY a.id`).all(uid)) {
      if (r.genre !== 'deux') { const f = appelPartirDans(r.id, uid, 'compte'); reveil.push(...Object.keys(f.gids).filter(u => u !== uid)); continue; }
      const etat = r.etat === 'en_cours' ? 'fini' : (r.role === 'appelant' ? 'annule' : 'refuse');
      Q(`UPDATE appel SET etat = ?, fin = ?, motif = 'compte' WHERE id = ? AND etat IN ('sonne', 'en_cours')`).run(etat, t, r.id);
      const autre = appelAutre(r.id, uid);
      if (autre) { journalAjouter('appel', null, autre, r.id); reveil.push(autre); }
    }
    const ids = Q('SELECT appel FROM appel_part WHERE uid = ?').all(uid).map(r => r.appel);
    Q('DELETE FROM appel_part WHERE uid = ?').run(uid);
    for (const id of ids) Q('DELETE FROM appel WHERE id = ? AND NOT EXISTS (SELECT 1 FROM appel_part WHERE appel = ?)').run(id, id);
    return Array.from(new Set(reveil));
  }
  /* Un blocage coupe aussi l'appel en cours entre ces deux personnes (l'appelant qui harcèle ne continue pas par la voix). → les personnes à réveiller. Une SALLE n'est pas un échange entre deux personnes :
     deux membres d'un même groupe qui se sont bloqués restent dans le groupe, donc dans son appel — le blocage ne les y sépare pas (comme il ne les sépare pas dans la conversation). */
  function appelsFinirEntre(a, b) {
    return tx(() => {
      const reveil = [];
      for (const r of Q(`SELECT x.appel AS id FROM appel_part x JOIN appel_part y ON y.appel = x.appel AND y.uid = ? JOIN appel c ON c.id = x.appel WHERE x.uid = ? AND c.genre = 'deux' AND c.etat IN ('sonne', 'en_cours') ORDER BY x.appel`).all(b, a)) {
        const f = appelFinir({ id: r.id, motif: 'bloque' });
        if (!f.deja) reveil.push(a, b);
      }
      return Array.from(new Set(reveil));
    });
  }
  /* ⛔ LA RÉPARATION AU DÉMARRAGE (comme `reunionsReparer`) : le code d'AVANT les appels ouvre une base au schéma 8 (ou 9) sans connaître ces tables, et efface un compte sans toucher à son historique d'appels. Le
     démarrage du code neuf refait, pour chaque compte effacé qui laisse une trace, ce que `compteEffacer` fait. Rejouable : sans trace, rien n'est écrit. → { personnes, reveil } */
  function appelsReparer() {
    return tx(() => {
      const ids = Q(`SELECT DISTINCT p.uid AS uid FROM appel_part p JOIN personne x ON x.id = p.uid WHERE x.etat = 'supprime' ORDER BY p.uid`).all().map(r => r.uid);
      const reveil = [];
      for (const uid of ids) reveil.push(...appelsQuitterTout(uid));
      return { personnes: ids.length, reveil };
    });
  }
  /* L'historique d'appels d'une personne, pour l'export de ses données. Les noms des autres n'y sont pas (un appel n'est pas une conversation : le fichier dit quand, combien, et quel identifiant). */
  function exportAppels(uid) {
    return appelsListe(uid, { limite: 500 }).map(a => ({ id: a.id, date: a.debut, type: a.type, sens: a.sens, etat: a.etat, duree_s: a.duree_s, avec_id: a.autre ? a.autre.id : null, groupe: a.genre !== 'deux' }));
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

  /* ══ L'INSTANTANÉ POUR LA SAUVEGARDE HORS SITE — l'API de sauvegarde de SQLite, sur une connexion À PART, en UN pas ══════════════
     ⛔ ON NE COPIE JAMAIS LE FICHIER VIVANT. En WAL, `msg.db` seul est un ancien état (ce qui vit dans `msg.db-wal` n'y est pas
     encore) et, copié pendant un point de reprise, il mélange deux états : la copie peut ne pas s'ouvrir, ou s'ouvrir et mentir.
     L'API de sauvegarde (`backup`) rend une image COHÉRENTE de la base, et Node la joue HORS de la boucle d'événements (un fil du
     pool) : le service continue de servir, de recevoir des messages, de pousser des flux pendant la copie.
     ⛔ MAIS PAS SUR LA CONNEXION DU SERVICE, ET PAS PAR PETITS PAS — deux défauts MESURÉS (Node 22.22, base de 1 Mo, un écrivain qui
     écrit à chaque tour de boucle, comme le service) qui rendent la copie « par pas sur la connexion du service » inutilisable :
       · le pas se joue sur un autre fil que le service : s'il tombe ENTRE le `BEGIN IMMEDIATE` et le `COMMIT` d'une écriture du
         service (une transaction tient en plusieurs appels), SQLite rend `SQLITE_BUSY`, que Node transmet comme une erreur nue —
         « not an error » — et la copie ÉCHOUE : 5 passes sur 20 en transactions explicites, 0 sur 20 en écritures simples. Sous
         une vraie charge, une passe sur trois aurait été perdue, sans cause lisible ;
       · avec plusieurs pas, toute écriture d'une AUTRE connexion fait recommencer la copie depuis le début : sur une base qui
         reçoit des messages, elle ne finirait jamais.
     Un lecteur à part (WAL : il ne bloque ni n'est bloqué par l'écrivain), un seul pas (`rate` au maximum) : la copie est l'état
     de la base au DÉBUT du pas, un instantané exact. MESURÉ : 30 passes sur 30, aucune erreur, aucune copie incohérente, face à
     l'écrivain ci-dessus ; une base de 90 Mo copiée en 250 ms sans que la boucle d'événements perde plus de 6 ms — contre 628 ms de
     boucle FIGÉE pour `VACUUM INTO` sur la même base.
     `VACUUM INTO` reste le repli d'une version de Node sans `backup` : cohérent aussi, mais il fige la boucle le temps de la copie
     — acceptable sur une petite base, pas sur une grosse.
     ⚠️ Rien n'est compté ici : compter les lignes d'une grosse base fige la boucle autant que la copier. La copie est comptée
     ensuite, à part (`controlerFichier`, dans un autre processus) ; la base VIVANTE n'est sondée que par `sonde()`, en O(1). */
  const PAS_UNIQUE = 2147483647;
  async function instantane(vers) {
    for (const suffixe of ['', '-wal', '-shm']) { try { fs.unlinkSync(vers + suffixe); } catch (e) { /* absent : c'est le cas normal */ } }
    const sqlite = moteur || require('node:sqlite');
    if (typeof sqlite.backup === 'function') {
      const lecteur = new sqlite.DatabaseSync(chemin);
      try {
        lecteur.exec('PRAGMA busy_timeout=5000;');
        const pages = await sqlite.backup(lecteur, vers, { rate: PAS_UNIQUE });
        return { methode: 'backup', pages: num(pages) };
      } finally { try { lecteur.close(); } catch (e) { /* déjà fermée */ } }
    }
    Q('VACUUM INTO ?').run(vers);
    return { methode: 'vacuum', pages: null };
  }
  /* La sonde de la base VIVANTE : le schéma, l'horloge du journal (un compteur qui ne fait que monter : `AUTOINCREMENT` survit à
     l'élagage) et, par table, « y a-t-il au moins une ligne ? ». Chaque réponse est en O(1) — jamais un `COUNT(*)` sur la base
     vivante. Elle sert à juger une copie : prise entre deux sondes, son horloge de journal doit tomber entre les deux. */
  function sonde() {
    const non = (f) => { try { return f().get() !== undefined; } catch (e) { if (/no such table/i.test(String(e && e.message))) return null; throw e; } };
    return {
      schema: versionActuelle(),
      journalMax: journalMax(),
      nonVides: {
        personne: non(() => Q('SELECT 1 FROM personne LIMIT 1')),
        contact: non(() => Q('SELECT 1 FROM contact LIMIT 1')),
        demande_contact: non(() => Q('SELECT 1 FROM demande_contact LIMIT 1')),
        evenement: non(() => Q('SELECT 1 FROM evenement LIMIT 1')),
        lien: non(() => Q('SELECT 1 FROM lien LIMIT 1')),
        conversation: non(() => Q('SELECT 1 FROM conversation LIMIT 1')),
        membre: non(() => Q('SELECT 1 FROM membre LIMIT 1')),
        message: non(() => Q('SELECT 1 FROM message LIMIT 1')),
        reaction: non(() => Q('SELECT 1 FROM reaction LIMIT 1')),
        msg_masque: non(() => Q('SELECT 1 FROM msg_masque LIMIT 1')),
        piece: non(() => Q('SELECT 1 FROM piece LIMIT 1')),
        journal: non(() => Q('SELECT 1 FROM journal LIMIT 1')),
        notification: non(() => Q('SELECT 1 FROM notification LIMIT 1')),
        purge: non(() => Q('SELECT 1 FROM purge LIMIT 1')),
        appareil_tel: non(() => Q('SELECT 1 FROM appareil_tel LIMIT 1')),
        sms_envoi: non(() => Q('SELECT 1 FROM sms_envoi LIMIT 1')),
        push: non(() => Q('SELECT 1 FROM push LIMIT 1')),
        espace: non(() => Q('SELECT 1 FROM espace LIMIT 1')),
        espace_membre: non(() => Q('SELECT 1 FROM espace_membre LIMIT 1')),
        canal: non(() => Q('SELECT 1 FROM canal LIMIT 1')),
        abonnement: non(() => Q('SELECT 1 FROM abonnement LIMIT 1')),
        abonnement_perso: non(() => Q('SELECT 1 FROM abonnement_perso LIMIT 1')),
        abonnement_a_annuler: non(() => Q('SELECT 1 FROM abonnement_a_annuler LIMIT 1')),
        reunion: non(() => Q('SELECT 1 FROM reunion LIMIT 1')),
        reunion_invite: non(() => Q('SELECT 1 FROM reunion_invite LIMIT 1')),
        rappel: non(() => Q('SELECT 1 FROM rappel LIMIT 1')),
        planif_bail: non(() => Q('SELECT 1 FROM planif_bail LIMIT 1')),
        courrier_envoi: non(() => Q('SELECT 1 FROM courrier_envoi LIMIT 1')),
        appel: non(() => Q('SELECT 1 FROM appel LIMIT 1')),
        appel_part: non(() => Q('SELECT 1 FROM appel_part LIMIT 1')),
        piece_acces: non(() => Q('SELECT 1 FROM piece_acces LIMIT 1')),
      },
    };
  }
  function fermer() { try { db.close(); } catch (e) {} }

  /* ══ LE REJEU DES PURGES PAR LE SERVICE — après une restauration (`rejeu.js`) ════════════════════════════════════════════════════
     L'outil de restauration travaille hors ligne, sans la clé maître : il rejoue en SQL pur les genres de purge qui s'y prêtent (`GENRES_PURGE`, plus bas),
     RECOPIE les autres dans la base qu'il remet en service, et lève ce drapeau (`meta.rejeu_service`). Le service, à son premier démarrage dessus, rejoue
     alors les genres qui sont à lui — ceux dont l'effacement touche plusieurs tables et passe par ses propres fonctions — puis baisse le drapeau. */
  const rejeuAFaire = () => metaLire('rejeu_service') !== null;
  const rejeuTermine = () => { Q('DELETE FROM meta WHERE k = ?').run('rejeu_service'); };
  /* Tout le registre, du plus ancien au plus récent : l'appelant ne garde que les genres qu'il sait rejouer. */
  function purgeLignes() {
    return Q('SELECT objet, genre, quand FROM purge ORDER BY quand, rowid').all().map(r => ({ objet: String(r.objet), genre: String(r.genre), quand: num(r.quand) }));
  }

  /* les comptes nés avant la migration 11 reçoivent leur identifiant public une fois, au démarrage (une copie d'un schéma plus ancien n'a pas la colonne : rien à faire) */
  if (IDENT) identCompleter();

  return {
    schema, instantane, sonde, fermer, tx, stats, metaLire, nouvelId, illisibles: () => illisibles,
    personneCreer, personneParIdentifiant, personneParId, personneIdentifiant, personneMaj,
    sessionAjouter, sessionLire, sessionToucher, sessionSupprimer, sessionsSupprimerPersonne, sessionsSupprimerAvant, sessionsSupprimerAutres, betaARelire,
    contactLier, contactBloque, contactActif, contactsDe, contactFavori, contactsActifs, contactRetirer, contactEtat, contactBloquer, contactDebloquer, contactLigne, peutVoir,
    lienCreer, lienValide, lienApercu, lienAccepter, liensRevoquerGroupe, liensRevoquerContact,
    collegues, peutEcrire,
    espaceCreer, espaceBrut, espacePourMembre, espacesDe, espacesIds, espaceMembres, espaceMembresN, espaceMaj, espaceMembreRetirer, espaceRoleMembre, espaceTransferer, espaceSupprimer, espaceQuitterTout, espacesAbonnesSeul, exportEspaces,
    invitationApercu, invitationAccepter, invitationsRevoquer, invitationsVivantes, invitationEspace, espaceUids,
    canalDe, canauxVisibles, canalCreer, canalPourAdmin, canalMembresAjouter, canalMembreRetirer, canalQuitter,
    abonnementLire, abonnementSession, abonnementSessionOubliee, abonnementPoser, abonnementsARelire,
    abonnementPersoLire, abonnementPersoSession, abonnementPersoSessionOubliee, abonnementPersoPoser, abonnementsPersoARelire, abonnementPersoNettoyer, abonnementPersoOrphelin,   // Perso+ : l'abonnement d'une personne
    persoAjuster, annulationAjouter, annulationsDues, annulationLire, annulationEncore, annulationMemoriser, annulationFaite, annulationEchec, annulationPlusAncienne,   // …et ce qu'il reste à faire chez Stripe quand la personne s'en va (arrêt du renouvellement, rétablissement, résiliation)
    convDirecteObtenir, convCreerGroupe, convSupprimer, convPourMembre, convListe, convMaj, membresActifs, membresDetail, nbAdmins,
    membresAjouter, membreRetirer, membreQuitter, membreRole, membrePrefs, membreLu, autreDirect, ecritureAutorisee,
    messageEnvoyer, messageExiste, messagesDe, messageModifier, messageSupprimer, messageReagir, reactionsDe, purgerExpires,
    pieceCreer, pieceVisible, pieceUtilise, pieceExiste, pieceStats, pieceEffacerLigne, avatarPersonnePoser, piecesOrphelinesPurger, audiencePersonne,
    notifCreer, notifListe, notifLues, notifNonLues,
    journalMax, journalMin, journalElaguer, evenementsPour, gidVisible,
    rejeuAFaire, rejeuTermine, purgeLignes,   // le rejeu des purges par le SERVICE après une restauration (rejeu.js)
    telCodePoser, telCodeEssayer, telCodeSupprimer, telCodeCree,
    melCodePoser, melCodeEssayer, melCodeSupprimer, melCodeCree, melCodesElaguer, mdpLire, mdpPoser, personneConsentir, appareilMelConnu, appareilMelNoter, appareilsMelOublier,
    evenementCreer, evenementLire, evenementMaj, evenementSupprimer, evenementsCompter, evenementsDe, evenementsRappelsDus, evenementRappelEnvoyer, evenementRappelAbandonner, exportEvenements,
    telAppareilLier, telAppareilLire, telAppareilToucher, telAppareilSupprimer, telAppareilsSupprimerPersonne, telAppareilsSupprimerAutres, telAppareilsDe,
    smsTentativesNoter, smsTentativesCompter, smsTentativePremiere, smsTentativesRendre,
    smsReserver, smsRegler, smsSommes, smsPremier, smsPaysSur, smsElaguer, smsBouclierPoser, smsBouclierDe, smsBoucliers,
    telPersonneParNumero, telTrouvableLire, telTrouvableMaj, rechercheNoter, rechercheCompter, rechercheRendre,
    identAttribuer, personneParIdent, identDe, identCompleter, demandeCreer, demandesRecues, demandesEnvoyees, demandeRepondre, demandeAnnuler,
    pushPoser, pushListe, pushCompterDe, pushCompter, pushRetirer, pushRetirerId, pushOk, pushEchec, pushSupprimerPersonne, pushJoignable, pushNonJoignablesPurger, pushRetirerAutres, pushVapidLire, pushVapidPoser,
    pushDestinatairesMessage, pushMessageEncore, autreSupprime,
    suppressionProgrammer, suppressionAnnuler, suppressionLe, comptesEchus, compteEffacer, exportProfil, exportConversationsIds, exportPieces,
    reunionPourMembre, reunionAcces, reunionsDe, reunionParticipants, enCommun, pieceAccesNoter, pieceSuivi, membreRecuTout, exportPiecesOuvertes, reunionCreer, reunionModifier, reunionAnnuler, reunionSupprimer, reunionInviter, reunionRetirer, reunionQuitter, reunionRepondre, reunionRappelsPoser, reunionsReparer,   // les réunions programmées
    reunionLien, reunionLienRenouveler, reunionParCode, reunionInviteParCode,   // …leur lien d'invité
    bailPrendre, bailRendre, bailLire, reunionsARappeler, reunionsARappelerDe, reunionPlanif, reunionProchainPoser, rappelEnvoyer, rappelsEnvoyer, rappelDejaEnvoye, rappelsEnvoyesDe, rappelsElaguer, reunionEncore,                             // …et le planificateur
    courrierCompter, courrierNoter, courrierRetirer, courrierElaguer, exportReunions,                                                                                                                  // …et le courriel d'invitation
    appelVue, appelAcces, appelActifDe, appelActifVue, appelsRecusDepuis, appelCreer, appelRepondre, appelQuitter, appelFinir, appelsEchoir, appelsActifs, appelsListe, appelsElaguer, appelsQuitterTout, appelsFinirEntre, appelsReparer, appelSourdine, exportAppels,   // les appels à deux
    appelCreerGroupe, appelRejoindre, appelPartir, salleAdmettre, salleRefuser, salleExclure, salleVerrou, salleAttente, sallePartage, salleRec, salleCohote, salleTerminer, salleSessions, salleDeReunion, appelAppelant, salleOrganisateur, salleReunionRejoindre, sallesOuvertes,   // …et à plusieurs : les salles
  };
}

/* ══ CE QUI TRAVAILLE SUR UN FICHIER DE COPIE — la sauvegarde hors site et sa restauration ════════════════════════════════
   ⛔ CES FONCTIONS NE TOUCHENT JAMAIS LA BASE VIVANTE : elles prennent un CHEMIN (l'instantané qu'on vient de faire, l'archive qu'on
   vient de rouvrir) et ouvrent leur propre connexion. Elles vivent ICI parce que « tout le SQL est dans `stockage.js` » (test-901) :
   la sauvegarde et la restauration ont besoin d'OUVRIR une base pour dire qu'elle est saine, et leur laisser un accès à
   `node:sqlite` rouvrirait la porte que ce module existe pour tenir fermée.
   ⚠️ Aucune ne déchiffre quoi que ce soit et aucune n'a besoin de la clé maître : « ce fichier est-il intact » et « sais-je le lire »
   sont deux questions, et seule la première est du ressort d'une sauvegarde.
   Rangées sur `ouvrir.copie` plutôt que dans `module.exports` : le service, lui, n'a pas à les connaître. */
const TABLES_COMPTEES = ['personne', 'contact', 'lien', 'conversation', 'membre', 'message', 'reaction', 'msg_masque', 'piece', 'journal', 'notification', 'purge', 'appareil_tel', 'sms_envoi', 'push', 'espace', 'espace_membre', 'canal', 'abonnement', 'abonnement_perso', 'abonnement_a_annuler', 'reunion', 'reunion_invite', 'rappel', 'planif_bail', 'courrier_envoi', 'appel', 'appel_part', 'demande_contact', 'evenement', 'piece_acces'];

function ouvrirCopie(chemin, { moteur, ecriture = false } = {}) {
  const { DatabaseSync } = moteur || require('node:sqlite');
  return new DatabaseSync(chemin, ecriture ? {} : { readOnly: true });
}

/* Le nombre de lignes de chaque table comptée. `null` : la table n'existe pas dans CETTE copie (une archive d'un schéma plus ancien
   n'a pas les tables des migrations suivantes) — ce n'est pas une erreur, et deux copies du même fichier donnent le même `null`. */
/* ⛔ TROIS LISTES DOIVENT DIRE LES MÊMES TABLES : `TABLES_COMPTEES`, la sonde de la base vivante (`sonde().nonVides`) et ce comptage-ci. Chacune
   s'écrit à la main (chaque requête reste un littéral : test-901). Le 3 octobre 2026, `piece` est entrée dans les deux premières et pas dans
   celle-ci : la sonde exigeait des pièces, la copie n'en comptait aucune, et DÈS LA PREMIÈRE PIÈCE chaque passe tombait en
   « copie-vide-piece » — plus aucune sauvegarde ne partait (gardien). test-950 § 13 bis compare désormais les trois. */
function lignesDe(d) {
  const n = (f) => { try { return Number(f().get().n); } catch (e) { if (/no such table/i.test(String(e && e.message))) return null; throw e; } };
  return {
    personne: n(() => d.prepare('SELECT COUNT(*) AS n FROM personne')),
    contact: n(() => d.prepare('SELECT COUNT(*) AS n FROM contact')),
    demande_contact: n(() => d.prepare('SELECT COUNT(*) AS n FROM demande_contact')),
    evenement: n(() => d.prepare('SELECT COUNT(*) AS n FROM evenement')),
    lien: n(() => d.prepare('SELECT COUNT(*) AS n FROM lien')),
    conversation: n(() => d.prepare('SELECT COUNT(*) AS n FROM conversation')),
    membre: n(() => d.prepare('SELECT COUNT(*) AS n FROM membre')),
    message: n(() => d.prepare('SELECT COUNT(*) AS n FROM message')),
    reaction: n(() => d.prepare('SELECT COUNT(*) AS n FROM reaction')),
    msg_masque: n(() => d.prepare('SELECT COUNT(*) AS n FROM msg_masque')),
    piece: n(() => d.prepare('SELECT COUNT(*) AS n FROM piece')),
    journal: n(() => d.prepare('SELECT COUNT(*) AS n FROM journal')),
    notification: n(() => d.prepare('SELECT COUNT(*) AS n FROM notification')),
    purge: n(() => d.prepare('SELECT COUNT(*) AS n FROM purge')),
    appareil_tel: n(() => d.prepare('SELECT COUNT(*) AS n FROM appareil_tel')),
    sms_envoi: n(() => d.prepare('SELECT COUNT(*) AS n FROM sms_envoi')),
    push: n(() => d.prepare('SELECT COUNT(*) AS n FROM push')),
    espace: n(() => d.prepare('SELECT COUNT(*) AS n FROM espace')),
    espace_membre: n(() => d.prepare('SELECT COUNT(*) AS n FROM espace_membre')),
    canal: n(() => d.prepare('SELECT COUNT(*) AS n FROM canal')),
    abonnement: n(() => d.prepare('SELECT COUNT(*) AS n FROM abonnement')),
    abonnement_perso: n(() => d.prepare('SELECT COUNT(*) AS n FROM abonnement_perso')),
    abonnement_a_annuler: n(() => d.prepare('SELECT COUNT(*) AS n FROM abonnement_a_annuler')),
    reunion: n(() => d.prepare('SELECT COUNT(*) AS n FROM reunion')),
    reunion_invite: n(() => d.prepare('SELECT COUNT(*) AS n FROM reunion_invite')),
    rappel: n(() => d.prepare('SELECT COUNT(*) AS n FROM rappel')),
    planif_bail: n(() => d.prepare('SELECT COUNT(*) AS n FROM planif_bail')),
    courrier_envoi: n(() => d.prepare('SELECT COUNT(*) AS n FROM courrier_envoi')),
    appel: n(() => d.prepare('SELECT COUNT(*) AS n FROM appel')),
    appel_part: n(() => d.prepare('SELECT COUNT(*) AS n FROM appel_part')),
    piece_acces: n(() => d.prepare('SELECT COUNT(*) AS n FROM piece_acces')),
  };
}

/* Ouvre une copie en LECTURE SEULE et dit si elle est saine : `quick_check` parcourt réellement les pages (il voit un « database disk
   image is malformed » qu'un `SELECT 1` ne verrait pas), puis le schéma, la présence du témoin de clé (jamais sa valeur), l'horloge
   du journal et le nombre de lignes de chaque table comptée.
   ⛔ UN FICHIER DE 0 OCTET N'EST PAS UNE BASE SAINE : SQLite ouvre un fichier vide sans broncher (il y voit une base neuve) et
   `quick_check` répond « ok » — c'est ce que laisse un disque plein pendant la copie. Sous 512 octets, on refuse. */
function controlerFichier(chemin, opts) {
  let d = null;
  try {
    let taille = 0;
    try { taille = fs.statSync(chemin).size; } catch (e) { return { ok: false, motif: 'fichier absent' }; }
    if (taille < 512) return { ok: false, motif: 'fichier vide ou tronqué (' + taille + ' octets)' };
    d = ouvrirCopie(chemin, opts);
    const verdicts = d.prepare('PRAGMA quick_check').all().map(r => String(Object.values(r)[0]));
    if (verdicts.length !== 1 || verdicts[0] !== 'ok') return { ok: false, motif: ('quick_check : ' + verdicts.slice(0, 3).join(' ; ')).slice(0, 160) };
    const schema = Number(d.prepare('PRAGMA user_version').get().user_version);
    let temoin = false;
    try { temoin = d.prepare(`SELECT 1 AS n FROM meta WHERE k = 'kek_temoin'`).get() !== undefined; } catch (e) { temoin = false; }
    let journalMax = 0;
    try { const r = d.prepare(`SELECT seq FROM sqlite_sequence WHERE name = 'journal'`).get(); journalMax = r ? Number(r.seq) : 0; } catch (e) { journalMax = 0; }
    const lignes = lignesDe(d);
    return { ok: true, taille, schema, temoin, journalMax, lignes, total: Object.values(lignes).reduce((a, x) => a + (x || 0), 0) };
  } catch (e) {
    return { ok: false, motif: String(e && e.message).slice(0, 160) };
  } finally { try { if (d) d.close(); } catch (e) { /* déjà fermée */ } }
}

/* ══ LES GENRES DE PURGE — ce que le registre peut dire, et QUI le rejoue ═══════════════════════════════════════════════════════
   Une ligne du registre `purge` dit : « cet objet a été effacé (ou vidé) à cet instant ». Une restauration ramène ce qu'une archive plus ancienne contenait
   encore ; le registre de la plus récente archive qui s'ouvre sert à le REPASSER. Chaque genre dit COMMENT :
     'copie'    rejoué HORS LIGNE, en SQL pur, sur le fichier de la copie (`rejouerPurge` — l'outil n'a pas la clé maître et ne lance pas le service) ;
     'service'  rejoué par le SERVICE à son premier démarrage sur la base restaurée (`rejeu.js`, `GENRES_SERVICE`) : l'effacement touche plusieurs tables et
                passe par des fonctions du service. La copie ne fait que recopier la ligne et lever le drapeau `rejeu_service`.
   ⛔ UN GENRE NEUF S'ÉCRIT ICI D'ABORD : `tests/test-950.js` (§ 13 quater) lit le code de CE fichier, relève chaque genre écrit dans `purge` (`INSERT INTO purge`)
   et exige qu'il soit déclaré ici, rejoué par celui qu'il désigne. Un effacement qu'aucune restauration ne rejoue est un effacement qui REVIENT — le défaut que ce
   registre existe pour empêcher (conversation supprimée, appareil déconnecté, compte effacé). Le mode d'emploi est dans `design/opmessages/SERVEUR.md`. */
const GENRES_PURGE = {
  message_ephemere: 'copie',   // un message échu : sa ligne part (avec ses réactions)
  message: 'copie',            // un message purgé par un autre chemin : idem
  message_supprime: 'copie',   // « supprimé pour tous » : le corps part, la pierre tombale reste
  piece: 'copie',              // une pièce (`piece_expiree`… : tout genre qui COMMENCE par « piece ») : sa ligne part, son identifiant est rendu pour retirer le fichier
  conversation: 'copie',       // une conversation supprimée (le dernier membre est parti) : elle part avec ses membres, messages, réactions et invitations
  appareil: 'copie',           // un jeton d'appareil révoqué (déconnexion, « déconnecter les autres », onzième appareil) — l'empreinte, jamais le jeton
  espace: 'copie',             // un espace dissous : sa ligne part (membres, canaux et abonnement avec elle), ses invitations et ses canaux aussi
  espace_membre: 'copie',      // quelqu'un sort d'un espace (il part, il est retiré, son compte s'efface) : `espace|personne|date` — il sort aussi de ses canaux
  invitation: 'copie',         // un lien d'invitation (à un espace ou à un groupe) révoqué : son empreinte — le code ne rouvre plus rien
  canal_membre: 'copie',       // quelqu'un sort d'un canal PRIVÉ (retiré, ou il le quitte) : `conversation|personne|date`
  reunion_invite: 'copie',     // un invité retiré d'une réunion (ou son compte effacé) : `reunion|personne|date` — sa ligne d'invitation part ; il sort aussi de sa conversation (`groupe_membre`)
  reunion_annulee: 'copie',    // une réunion ANNULÉE : une archive d'avant la rendrait active à ceux qui s'y rendraient. (Une réunion SUPPRIMÉE se note par sa conversation, genre `conversation`.)
  reunion_lien: 'copie',       // le lien d'invité d'une réunion RENOUVELÉ : l'empreinte de l'ancien code — une archive d'avant ne rend pas la porte à qui le connaissait
  groupe_membre: 'copie',      // quelqu'un sort d'un GROUPE (retiré par un administrateur, ou il le quitte) : `conversation|personne|date` — et si c'était le dernier administrateur, la copie promeut comme le service l'avait fait
  compte: 'service',           // un compte effacé au bout de ses quatorze jours : il touche dix tables et passe par `compteEffacer` — rejoué par le SERVICE (`rejeu.js`)
  suppression_demandee: 'service',   // la DEMANDE de suppression (l'échéance posée) : une copie d'avant ne doit pas la perdre — rejouée par le SERVICE, dans l'ordre du registre
  evenement: 'copie',                // un événement de l'agenda personnel SUPPRIMÉ : sa ligne part
  mdp: 'copie',                      // un mot de passe CHANGÉ (« mot de passe oublié ») : objet `personne|date` — une copie dont le mot de passe est plus ancien le perd (il faudra le réinitialiser), et ses sessions tombent
  suppression_annulee: 'service',    // l'ANNULATION (la personne est revenue) : une copie d'avant ne doit pas ramener l'échéance — idem
};

/* Le registre des purges d'une copie, tel quel : `{objet, genre, quand}`. Une copie sans cette table (très ancienne) en a un vide. */
function purgeLire(chemin, opts) {
  let d = null;
  try {
    d = ouvrirCopie(chemin, opts);
    return d.prepare('SELECT objet, genre, quand FROM purge ORDER BY quand, rowid').all().map(r => ({ objet: String(r.objet), genre: String(r.genre), quand: Number(r.quand) }));
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return [];
    throw e;
  } finally { try { if (d) d.close(); } catch (e) { /* déjà fermée */ } }
}

/* ⛔ REJOUER LE REGISTRE DES PURGES SUR UNE COPIE RESTAURÉE. Une archive date d'avant ce que le service a effacé depuis : un
   message éphémère expiré, une pièce retirée. Restaurer l'archive les ferait REVENIR — alors que la politique de confidentialité
   promet qu'ils sont partis. Le registre (`purge`) du service est ce qui s'en souvient ; la restauration prend celui de l'archive la
   PLUS RÉCENTE (il contient tout ce que les plus anciennes savaient) et l'applique à la copie qu'elle remet en service.
   Par genre : un message éphémère ou purgé (`message_ephemere`, `message`) disparaît avec ses réactions ; un message supprimé pour
   tous (`message_supprime`) perd son corps et garde sa pierre tombale ; une pièce (`piece…`) quitte sa table — et son identifiant
   est RENDU, pour que l'appelant retire aussi le fichier. Un genre inconnu n'efface RIEN (dans le doute, on efface moins) : il est
   compté « ignoré » et recopié.
   Les lignes du registre sont recopiées dans la copie (sans doublon) : la copie se souvient désormais de ce qu'elle vient d'oublier,
   et la sauvegarde suivante le portera. Une seule transaction : tout ou rien. */
function rejouerPurge(chemin, registre, opts) {
  const bilan = { lues: 0, messagesRetires: 0, messagesBlanchis: 0, pieces: [], conversationsRetirees: 0, appareilsRetires: 0, espacesRetires: 0, membresEspaceRetires: 0, invitationsRevoquees: 0, membresCanalRetires: 0, membresGroupeRetires: 0, groupesRepris: 0, invitesRetires: 0, reunionsAnnulees: 0, liensReunionRetires: 0, auService: 0, ignorees: 0, ajoutees: 0 };
  let d = null;
  try {
    d = ouvrirCopie(chemin, Object.assign({}, opts, { ecriture: true }));
    d.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const tablePiece = d.prepare(`SELECT 1 AS n FROM sqlite_master WHERE type = 'table' AND name = 'piece'`).get() !== undefined;
    const retirer = d.prepare('DELETE FROM message WHERE id = ?');
    const chercher = d.prepare('SELECT conv, seq, supprime_le FROM message WHERE id = ?');
    const blanchir = d.prepare('UPDATE message SET corps_ch = NULL, meta_ch = NULL, supprime_le = ?, modifie = NULL WHERE id = ?');
    const sansReactions = d.prepare('DELETE FROM reaction WHERE conv = ? AND seq = ?');
    const retirerPiece = tablePiece ? d.prepare('DELETE FROM piece WHERE id = ?') : null;
    const retirerLiens = d.prepare(`DELETE FROM lien WHERE genre = 'groupe' AND cible = ?`);
    const retirerJournal = d.prepare('DELETE FROM journal WHERE conv = ?');
    const retirerConv = d.prepare('DELETE FROM conversation WHERE id = ?');
    const tableAppareil = d.prepare(`SELECT 1 AS n FROM sqlite_master WHERE type = 'table' AND name = 'appareil_tel'`).get() !== undefined;
    /* Un appareil (re)lié APRÈS sa révocation (`cree` plus récent) est un autre appareil : seul celui qui existait au moment de la révocation part. */
    const retirerAppareil = tableAppareil ? d.prepare('DELETE FROM appareil_tel WHERE h = ? AND cree <= ?') : null;
    /* les ESPACES (migration 6) : une archive d'un schéma plus ancien n'a pas ces tables — rien à y retirer, la ligne du registre est quand même recopiée */
    const a = (nom) => d.prepare(`SELECT 1 AS n FROM sqlite_master WHERE type = 'table' AND name = ?`).get(nom) !== undefined;
    const tableEspace = a('espace') && a('espace_membre') && a('canal');
    const retirerCanauxDEspace = tableEspace ? d.prepare('DELETE FROM conversation WHERE id IN (SELECT conv FROM canal WHERE espace = ?)') : null;
    const retirerLiensEspace = d.prepare(`DELETE FROM lien WHERE genre = 'espace' AND cible = ?`);
    const retirerEspace = tableEspace ? d.prepare('DELETE FROM espace WHERE id = ?') : null;
    /* un membre ARRIVÉ APRÈS son retrait (`depuis` plus récent) est un autre arrivé : seul celui qui existait au moment du retrait part */
    const retirerMembreEspace = tableEspace ? d.prepare('DELETE FROM espace_membre WHERE espace = ? AND uid = ? AND depuis <= ?') : null;
    const sortirCanaux = tableEspace ? d.prepare('UPDATE membre SET quitte_le = ? WHERE uid = ? AND quitte_le IS NULL AND rejoint <= ? AND conv IN (SELECT conv FROM canal WHERE espace = ?)') : null;
    const sortirCanal = d.prepare('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ? AND quitte_le IS NULL AND rejoint <= ?');
    const revoquerLien = d.prepare(`UPDATE lien SET revoque = 1 WHERE h = ? AND genre IN ('espace', 'groupe') AND revoque = 0`);
    /* un GROUPE dont le dernier administrateur vient d'être sorti par le rejeu : le plus ancien membre le devient, comme `membreQuitter` le fait en direct (sinon la copie aurait un groupe que personne ne peut plus gérer) */
    const promouvoirGroupe = d.prepare(`UPDATE membre SET role = 'admin' WHERE rowid = (SELECT rowid FROM membre WHERE conv = ? AND quitte_le IS NULL ORDER BY rejoint, rowid LIMIT 1)
                                        AND NOT EXISTS (SELECT 1 FROM membre WHERE conv = ? AND role = 'admin' AND quitte_le IS NULL)
                                        AND (SELECT type FROM conversation WHERE id = ?) = 'groupe'`);
    /* les RÉUNIONS (migration 7) : une archive d'un schéma plus ancien n'a pas ces tables — rien à y retirer, la ligne du registre est quand même recopiée. Un invité RÉINVITÉ après son retrait (`cree`
       plus récent) est une autre invitation : seule celle qui existait au moment du retrait part. */
    const tableReunion = a('reunion') && a('reunion_invite');
    const retirerInvite = tableReunion ? d.prepare('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ? AND cree <= ?') : null;
    const annulerReunion = tableReunion ? d.prepare('UPDATE reunion SET annulee = 1, prochain = NULL WHERE id = ? AND annulee = 0') : null;
    /* le lien d'invité d'une réunion (migration 9) : une archive d'un schéma plus ancien n'a pas la colonne — rien à y retirer, la ligne du registre est quand même recopiée */
    const colonneCode = tableReunion && d.prepare(`SELECT 1 AS n FROM pragma_table_info('reunion') WHERE name = 'code_h'`).get() !== undefined;
    const retirerCode = colonneCode ? d.prepare('UPDATE reunion SET code_h = NULL, code_ch = NULL, code_le = NULL WHERE code_h = ?') : null;
    /* un mot de passe CHANGÉ (migration 12) : une copie qui porte un mot de passe PLUS ANCIEN que le changement le perd — peut-être celui qu'un intrus connaissait — et ses sessions et abonnements push
       d'avant tombent ; la personne passera par « mot de passe oublié ». Une archive d'un schéma plus ancien n'a pas la colonne : rien à y faire, la ligne est quand même recopiée. */
    const colonneMdpLe = d.prepare(`SELECT 1 AS n FROM pragma_table_info('personne') WHERE name = 'mdp_le'`).get() !== undefined;
    const oublierMdp = colonneMdpLe ? d.prepare('UPDATE personne SET sel = NULL, mdp = NULL, params = NULL WHERE id = ? AND mdp IS NOT NULL AND (mdp_le IS NULL OR mdp_le < ?)') : null;
    const sessionsAvant = d.prepare('DELETE FROM session WHERE personne = ? AND cree <= ?');
    const retirerEvenement = a('evenement') ? d.prepare('DELETE FROM evenement WHERE id = ?') : null;   // (migration 13 : une archive plus ancienne n'a pas la table)
    const pushAvant = a('push') ? d.prepare('DELETE FROM push WHERE uid = ? AND cree <= ?') : null;
    const recopier = d.prepare('INSERT INTO purge(objet, genre, quand) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM purge WHERE objet = ? AND genre = ?)');
    d.exec('BEGIN IMMEDIATE');
    try {
      for (const r of registre || []) {
        bilan.lues++;
        const genre = String(r.genre || '');
        if (genre === 'message_ephemere' || genre === 'message') {
          bilan.messagesRetires += Number(retirer.run(r.objet).changes);
        } else if (genre === 'message_supprime') {
          const l = chercher.get(r.objet);
          if (l && (l.supprime_le === null || l.supprime_le === undefined)) {
            blanchir.run(Number(r.quand) || 0, r.objet);
            sansReactions.run(l.conv, l.seq);
            bilan.messagesBlanchis++;
          }
        } else if (/^piece/.test(genre)) {
          if (retirerPiece) retirerPiece.run(r.objet);
          bilan.pieces.push(String(r.objet));
        } else if (genre === 'conversation') {
          retirerLiens.run(r.objet); retirerJournal.run(r.objet);
          bilan.conversationsRetirees += Number(retirerConv.run(r.objet).changes);
        } else if (genre === 'appareil') {
          if (retirerAppareil) bilan.appareilsRetires += Number(retirerAppareil.run(r.objet, Number(r.quand) || 0).changes);
        } else if (genre === 'espace') {
          /* un espace dissous : ses canaux (avec leurs messages), ses invitations, puis l'espace — ses membres et son abonnement partent avec lui (ON DELETE CASCADE) */
          if (retirerCanauxDEspace) retirerCanauxDEspace.run(r.objet);
          retirerLiensEspace.run(r.objet);
          if (retirerEspace) bilan.espacesRetires += Number(retirerEspace.run(r.objet).changes);
        } else if (genre === 'espace_membre') {
          const [esp, uid] = String(r.objet).split('|');
          if (esp && uid && retirerMembreEspace) {
            const q = Number(r.quand) || 0;
            bilan.membresEspaceRetires += Number(retirerMembreEspace.run(esp, uid, q).changes);
            sortirCanaux.run(q, uid, q, esp);
          }
        } else if (genre === 'invitation') {
          bilan.invitationsRevoquees += Number(revoquerLien.run(r.objet).changes);
        } else if (genre === 'canal_membre') {
          const [conv, uid] = String(r.objet).split('|');
          if (conv && uid) bilan.membresCanalRetires += Number(sortirCanal.run(Number(r.quand) || 0, conv, uid, Number(r.quand) || 0).changes);
        } else if (genre === 'groupe_membre') {
          const [conv, uid] = String(r.objet).split('|');
          if (conv && uid) {
            const sortis = Number(sortirCanal.run(Number(r.quand) || 0, conv, uid, Number(r.quand) || 0).changes);
            bilan.membresGroupeRetires += sortis;
            if (sortis > 0) bilan.groupesRepris += Number(promouvoirGroupe.run(conv, conv, conv).changes);
          }
        } else if (genre === 'reunion_invite') {
          const [reu, uid] = String(r.objet).split('|');
          if (reu && uid && retirerInvite) bilan.invitesRetires += Number(retirerInvite.run(reu, uid, Number(r.quand) || 0).changes);
        } else if (genre === 'reunion_annulee') {
          if (annulerReunion) bilan.reunionsAnnulees += Number(annulerReunion.run(r.objet).changes);
        } else if (genre === 'reunion_lien') {
          if (retirerCode) bilan.liensReunionRetires += Number(retirerCode.run(r.objet).changes);
        } else if (genre === 'evenement') {
          if (retirerEvenement) bilan.evenementsRetires = (bilan.evenementsRetires || 0) + Number(retirerEvenement.run(r.objet).changes);
        } else if (genre === 'mdp') {
          const q = Number(r.quand) || 0, uid = String(r.objet).split('|')[0];
          if (oublierMdp) bilan.mdpOublies = (bilan.mdpOublies || 0) + Number(oublierMdp.run(uid, q).changes);
          sessionsAvant.run(uid, q); if (pushAvant) pushAvant.run(uid, q);
        } else if (GENRES_PURGE[genre] === 'service') {
          bilan.auService++;   // recopiée seulement : le service la rejoue à son premier démarrage (`rejeu.js`) — ni « ignorée », ni faite ici
        } else {
          bilan.ignorees++;
        }
        bilan.ajoutees += Number(recopier.run(r.objet, genre, Number(r.quand) || 0, r.objet, genre).changes);
      }
      d.exec('COMMIT');
    } catch (e) { try { d.exec('ROLLBACK'); } catch (e2) { /* rien à défaire */ } throw e; }
    return bilan;
  } finally { try { if (d) d.close(); } catch (e) { /* déjà fermée */ } }
}

/* Les identifiants des pièces que la base d'une copie RÉCLAME (une ligne par pièce). La restauration les compare aux fichiers qu'elle a remis :
   une ligne sans fichier est une photo qui ne s'ouvrira pas. Une copie sans cette table (une archive d'avant les pièces) n'en réclame aucune. */
function pieceIds(chemin, opts) {
  let d = null;
  try {
    d = ouvrirCopie(chemin, opts);
    return d.prepare('SELECT id FROM piece ORDER BY id').all().map(r => String(r.id));
  } catch (e) {
    if (/no such table/i.test(String(e && e.message))) return [];
    throw e;
  } finally { try { if (d) d.close(); } catch (e) { /* déjà fermée */ } }
}

/* ⛔ CE QU'UNE RESTAURATION FAIT À LA BASE QU'ELLE REMET EN SERVICE, en plus de rejouer le registre (l'outil l'appelle sur la copie, une fois les purges rejouées) :
     · LES SESSIONS SONT VIDÉES. Une session est un cookie : celles de l'archive sont celles d'AVANT — dont des sessions révoquées depuis (rejoué par le gardien le
       3 octobre 2026 : l'ancien cookie d'une déconnexion répondait de nouveau 200). Aucun registre ne note une session fermée ; vider la table est la seule réponse sûre, et
       le prix est une reconnexion (les jetons d'appareil, eux, restent : ils évitent le SMS, et leurs révocations sont dans le registre) ;
     · LES ABONNEMENTS PUSH SONT VIDÉS, pour la même raison, en pire : un abonnement retiré (notifications désactivées, déconnexion, accès coupé, suppression de compte, refus 404/410
       du service push) n'est dans AUCUN registre, et une copie d'avant le ressuscite — la personne reçoit de nouveau des notifications sur un appareil qu'elle avait coupé, et
       l'aperçu d'un message sur l'écran verrouillé d'un téléphone qu'elle croyait déconnecté (rejoué par le gardien le 3 octobre 2026). Le prix est dit dans `SERVEUR.md` :
       chaque appareil se réabonne à la prochaine ouverture de l'application (la page redit son abonnement au démarrage) ; tant qu'elle n'est pas rouverte, aucune notification ;
     · LE DRAPEAU `rejeu_service` EST LEVÉ : le service, à son premier démarrage sur cette base, rejoue les genres de purge qui sont à lui (`rejeu.js`) puis le baisse.
   ⛔ LES TABLES DES ESPACES NE SONT PAS VIDÉES, et ce n'est pas un oubli (fusion avec le lot 3, 3 octobre 2026) : elles ne portent aucun ACCÈS qu'un registre ignore. Un membre retiré, un canal quitté, un lien
   révoqué, un espace dissous sont dans `purge` (`espace_membre`, `canal_membre`, `invitation`, `espace`) et rejoués par `rejouerPurge` ; la PROPRIÉTÉ passée à l'effacement d'un compte est refaite par le service
   (`espaceQuitterTout`, rejeu de `compte`). Un abonnement n'est pas un accès mais le dernier état que Stripe a dit, relu cinq secondes après le démarrage (`facturation.demarrer`) ; et `abonnement.session` n'est
   PAS à vider : c'est le pointeur vers un paiement que Stripe a peut-être reçu entre la copie et le sinistre — l'effacer le rendrait méconnaissable, et le client paierait deux fois.
   Rend { sessions, push } : le nombre de sessions et d'abonnements retirés. Une seule transaction. */
function apresRestauration(chemin, opts) {
  const bilan = { sessions: 0, push: 0, bails: 0, appels: 0 };
  let d = null;
  try {
    d = ouvrirCopie(chemin, Object.assign({}, opts, { ecriture: true }));
    d.exec('PRAGMA busy_timeout=5000;');
    d.exec('BEGIN IMMEDIATE');
    try {
      try { bilan.sessions = Number(d.prepare('DELETE FROM session').run().changes); }
      catch (e) { if (!/no such table/i.test(String(e && e.message))) throw e; }
      try { bilan.push = Number(d.prepare('DELETE FROM push').run().changes); }
      catch (e) { if (!/no such table/i.test(String(e && e.message))) throw e; }
      /* ⛔ LE BAIL DU PLANIFICATEUR n'est PAS celui de la base d'avant : un bail copié (une instance qui le tenait, un nom d'hôte, une échéance) ne doit ni bloquer le service restauré ni passer pour vivant.
         Et LES RAPPELS DE LA BASE D'AVANT ne se renvoient pas : le registre des rappels envoyés date de la copie, pas du sinistre — un rappel dont l'échéance précède la restauration est
         considéré traité (envoyé avant, ou abandonné), jamais envoyé une seconde fois (`rappels_depuis`, lu par le planificateur). */
      try { bilan.bails = Number(d.prepare('DELETE FROM planif_bail').run().changes); }
      catch (e) { if (!/no such table/i.test(String(e && e.message))) throw e; }
      /* ⛔ UN APPEL QUI SONNAIT OU COURAIT DANS L'ARCHIVE EST FINI : l'archive date d'avant le sinistre, et plus aucun appareil n'y est lié — un téléphone ne doit pas sonner pour un appel d'hier, et personne
         ne doit rester « occupé » à cause de lui. Une sonnerie devient « manqué » (SANS notification : celle qui existait déjà est dans la copie, une de plus serait une fausse alerte), un appel en cours
         « fini » avec le motif « restauration » et une durée nulle (on ne sait pas quand il s'est arrêté). */
      try { bilan.appels = Number(d.prepare(`UPDATE appel SET etat = CASE etat WHEN 'sonne' THEN 'manque' ELSE 'fini' END, fin = COALESCE(repondu, cree), motif = 'restauration' WHERE etat IN ('sonne', 'en_cours')`).run().changes); }
      catch (e) { if (!/no such table/i.test(String(e && e.message))) throw e; }
      /* ⛔ ET LES LIGNES DES SALLES RESTAURÉES RENDENT LEUR PLACE : plus personne n'est « présent », « à la porte » ni « appelé » dans une salle que la restauration vient de finir (la sonnerie devient « manqué », SANS
         notification — celle qui existait est déjà dans la copie), aucun appareil n'y est lié, et le bandeau REC s'éteint. Une archive d'avant la migration 9 n'a pas ces colonnes : rien à faire. */
      try {
        d.prepare(`UPDATE appel_part SET statut = CASE statut WHEN 'invite' THEN 'manque' WHEN 'present' THEN 'parti' WHEN 'attente' THEN 'refuse' ELSE statut END, session = NULL
                   WHERE appel IN (SELECT id FROM appel WHERE motif = 'restauration' AND genre <> 'deux')`).run();
        d.prepare(`UPDATE appel SET rec_par = NULL WHERE motif = 'restauration' AND genre <> 'deux'`).run();
      } catch (e) { if (!/no such (table|column)/i.test(String(e && e.message))) throw e; }
      const maintenant = opts && typeof opts.horloge === 'function' ? opts.horloge() : Date.now();
      d.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('rappels_depuis', String(maintenant));
      d.prepare('INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run('rejeu_service', String(Date.now()));
      d.exec('COMMIT');
    } catch (e) { try { d.exec('ROLLBACK'); } catch (e2) { /* rien à défaire */ } throw e; }
    return bilan;
  } finally { try { if (d) d.close(); } catch (e) { /* déjà fermée */ } }
}

ouvrir.copie = { controlerFichier, purgeLire, rejouerPurge, apresRestauration, pieceIds, GENRES_PURGE, TABLES_COMPTEES };

module.exports = { ouvrir, MIGRATIONS, MAX_MEMBRES, DELAI_MODIF_MS, TAILLE_PORTEE, GENRES_SEQ, PUSH_MAX, identLire, identBase, premierMot };
