/* ⛔ CE QUE CE FICHIER GARDE — LA MIGRATION 30 (l'invité sans compte) : une base d'AVANT, avec ses appels, ses salles et ses réunions, s'ouvre avec le code d'après sans rien perdre.
   `appel_part` est RECONSTRUITE sans la clé étrangère `uid → personne` (un invité sans compte y porte un identifiant `g_…`, qui n'est la ligne d'aucun compte) : toute colonne est recopiée telle quelle, l'index revient, une copie
   cohérente de la base d'avant est gardée, et la migration est REJOUABLE.

     1. une base au schéma 29 (le code d'avant) reçoit des comptes, une réunion, une salle ouverte avec trois participants (présent, à la porte, parti), leur présence (`premier`, `cumul`, `sorti`) ;
     2. le code d'après l'ouvre : le schéma passe à 30, une copie `.avant-v30` est gardée, TOUTES les lignes de salle sont là, avec chaque colonne identique ;
     3. la clé étrangère `uid → personne` est partie (un `g_…` s'y écrit), celle vers `appel` reste (supprimer l'appel emporte ses lignes), l'index `appel_part_uid` est revenu, les contraintes de rôle aussi ;
     4. le contrôle des clés étrangères ne trouve aucun orphelin ; rejouer la migration ne casse rien ;
     5. les tables neuves existent, avec leurs index (jeton unique par session) ; une session coupée (NULL) n'entre pas dans l'unicité.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : les lignes de la base d'avant sont comptées avant de comparer. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

(async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3056-'));
  const chemin = path.join(dossier, 'msg.db');
  const kek = crypto.randomBytes(32);
  const horloge = { t: Date.now() };
  const brut = (c = chemin) => new (require('node:sqlite').DatabaseSync)(c);
  const lire = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  try {
    console.log('1. une base au schéma 29 (le code d\'avant)');
    const anciennes = MIGRATIONS.filter(m => m.v <= 29);
    vrai('population : la liste des migrations d\'avant compte 29 migrations', anciennes.length === 29 && MIGRATIONS.length >= 30 && MIGRATIONS[MIGRATIONS.length - 1].v === 30);
    const S0 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => horloge.t, migrations: anciennes });
    vrai('(le code d\'après ouvre une base d\'avant : son schéma n\'est pas encore le 30 à cet instant)', lire('PRAGMA user_version')[0].user_version === 29);
    const mk = (n) => S0.personneCreer({ identifiant: 'beta:' + n + crypto.randomBytes(2).toString('hex'), prenom: n, nom: 'Banc', origine: 'beta', verifie: true });
    const ana = mk('Ana'), ben = mk('Ben'), cleo = mk('Cleo');
    const R = S0.reunionCreer({ hote: ana.id, titre: 'Réunion d\'avant', lieu: '', debut: Date.now() + 120000, fin: Date.now() + 3720000, tz: 'Europe/Paris', rep: 'aucune', rappels: [15], invites: [ben.id, cleo.id], prochain: Date.now() + 120000 }).id;
    /* la salle d'AVANT, écrite à la main dans le schéma d'avant (le code d'après lit déjà les tables de l'invité, il ne sait pas jouer sur un schéma 29) */
    const salle = { id: 'a_' + crypto.randomBytes(16).toString('hex') };
    horloge.t += 60000;
    { const d = brut(); try {
      d.exec('PRAGMA foreign_keys=ON');
      const t = horloge.t;
      d.prepare('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, repondu, genre, conv, reunion, capacite, attente, visio) VALUES(?, \'audio\', \'en_cours\', ?, ?, ?, \'reunion\', (SELECT conv FROM reunion WHERE id = ?), ?, 6, 1, 0)').run(salle.id, t, t, t, R, R);
      const ins = d.prepare('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen, premier, sorti, cumul) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      ins.run(salle.id, ana.id, 'appelant', 'sess-ana', 'present', 2, t, 1, t, null, 0);
      ins.run(salle.id, ben.id, 'appele', null, 'parti', 0, t, 1, t, t + 60000, 60000);
      ins.run(salle.id, cleo.id, 'appele', 'sess-cleo', 'attente', 0, t + 5, 0, null, null, 0);
    } finally { d.close(); } }
    const avant = lire('SELECT appel, uid, role, session, statut, grade, entre, gen, premier, sorti, cumul FROM appel_part ORDER BY uid');
    vrai('population : la salle d\'avant a trois lignes de participants (présent, à la porte, parti)', avant.length === 3 && new Set(avant.map(x => x.statut)).size === 3 && avant.some(x => x.premier !== null) && avant.some(x => x.cumul > 0));
    v('… le schéma d\'avant est bien le 29, sans table d\'invité', [lire('PRAGMA user_version')[0].user_version, lire('SELECT COUNT(*) AS n FROM sqlite_master WHERE name = \'invite_sans_compte\'')[0].n], [29, 0]);
    vrai('… et la clé étrangère vers `personne` y est (un `g_…` ne s\'y écrit pas)', /REFERENCES personne/.test(lire('SELECT sql FROM sqlite_master WHERE name = \'appel_part\'')[0].sql));
    let refuse = null;
    { const d = brut(); try { d.exec('PRAGMA foreign_keys=ON'); d.prepare('INSERT INTO appel_part(appel, uid, role, statut) VALUES(?, ?, \'appele\', \'attente\')').run(salle.id, 'g_' + '0'.repeat(32)); } catch (e) { refuse = String(e.message); } finally { d.close(); } }
    vrai('… preuve : écrire un `g_…` dans la salle d\'avant est REFUSÉ par la base (clé étrangère)', refuse !== null && /FOREIGN KEY/i.test(refuse));

    console.log('2. le code d\'après l\'ouvre');
    const S1 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => horloge.t });
    v('le schéma passe à 30', lire('PRAGMA user_version')[0].user_version, 30);
    vrai('⛔ une copie cohérente de la base d\'avant est gardée (`.avant-v30`) — et elle est au schéma 29', fs.existsSync(chemin + '.avant-v30') && (() => { const d = brut(chemin + '.avant-v30'); try { return d.prepare('PRAGMA user_version').get().user_version === 29; } finally { d.close(); } })());
    const apres = lire('SELECT appel, uid, role, session, statut, grade, entre, gen, premier, sorti, cumul FROM appel_part ORDER BY uid');
    v('⛔ TOUTES les lignes de salle sont là, colonne par colonne (session, statut, grade, entrée, génération, présence)', apres, avant);
    const sql = lire('SELECT sql FROM sqlite_master WHERE name = \'appel_part\'')[0].sql;
    vrai('⛔ la clé étrangère vers `personne` est partie, celle vers `appel` reste (avec sa cascade)', !/REFERENCES personne/.test(sql) && /REFERENCES appel\(id\) ON DELETE CASCADE/.test(sql));
    vrai('… le rôle reste borné (`appelant`, `appele`) et la clé primaire est (appel, uid)', /CHECK\(role IN \('appelant','appele'\)\)/.test(sql) && /PRIMARY KEY\(appel, uid\)/.test(sql));
    v('… l\'index sur `uid` est revenu', lire('SELECT name FROM sqlite_master WHERE type = \'index\' AND tbl_name = \'appel_part\' AND name = \'appel_part_uid\'').length, 1);
    { const d = brut(); try {
      d.exec('PRAGMA foreign_keys=ON');
      const gid = 'g_' + crypto.randomBytes(16).toString('hex');
      d.prepare('INSERT INTO appel_part(appel, uid, role, statut) VALUES(?, ?, \'appele\', \'attente\')').run(salle.id, gid);
      v('⛔ un invité sans compte s\'écrit maintenant dans la salle (`g_…`)', d.prepare('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND uid = ?').get(salle.id, gid).n, 1);
      let refusRole = null; try { d.prepare('INSERT INTO appel_part(appel, uid, role, statut) VALUES(?, ?, \'invente\', \'attente\')').run(salle.id, 'g_' + '1'.repeat(32)); } catch (e) { refusRole = String(e.message); }
      vrai('… un rôle inventé reste refusé', refusRole !== null && /CHECK/i.test(refusRole));
      let refusAppel = null; try { d.prepare('INSERT INTO appel_part(appel, uid, role, statut) VALUES(?, ?, \'appele\', \'attente\')').run('a_' + '0'.repeat(32), 'g_' + '2'.repeat(32)); } catch (e) { refusAppel = String(e.message); }
      vrai('… une salle qui n\'existe pas reste refusée (clé étrangère vers `appel`)', refusAppel !== null && /FOREIGN KEY/i.test(refusAppel));
    } finally { d.close(); } }
    v('⛔ le contrôle des clés étrangères ne trouve AUCUN orphelin', lire('PRAGMA foreign_key_check').length, 0);
    const enfants = lire('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ?', salle.id)[0].n;
    { const d = brut(); try { d.exec('PRAGMA foreign_keys=ON'); d.prepare('DELETE FROM appel WHERE id = ?').run(salle.id); } finally { d.close(); } }
    v('supprimer l\'appel emporte ses lignes de salle (la cascade vers `appel` a survécu à la reconstruction)', [enfants >= 4, lire('SELECT COUNT(*) AS n FROM appel_part WHERE appel = ?', salle.id)[0].n], [true, 0]);

    console.log('3. les tables neuves');
    const tabs = lire('SELECT name FROM sqlite_master WHERE type = \'table\' AND name IN (\'invite_sans_compte\', \'invite_lien_mort\') ORDER BY name').map(x => x.name);
    v('les deux tables existent', tabs, ['invite_lien_mort', 'invite_sans_compte']);
    v('… `reunion` porte les trois colonnes du jeton', lire('SELECT name FROM pragma_table_info(\'reunion\') WHERE name IN (\'inv_h\', \'inv_ch\', \'inv_le\') ORDER BY name').map(x => x.name), ['inv_ch', 'inv_h', 'inv_le']);
    { const d = brut(); try {
      d.exec('PRAGMA foreign_keys=ON');
      const ap = 'a_' + crypto.randomBytes(16).toString('hex');
      const a2 = S1.reunionCreer({ hote: ana.id, titre: 'Autre', lieu: '', debut: Date.now() + 120000, fin: Date.now() + 3720000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [], prochain: Date.now() + 120000 }).id;
      d.prepare('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, genre, reunion, capacite) VALUES(?, \'audio\', \'en_cours\', ?, ?, \'reunion\', ?, 6)').run(ap, Date.now(), Date.now(), a2);
      const ins = (id, h) => d.prepare('INSERT INTO invite_sans_compte(id, appel, reunion, nom_ch, session_h, cree, exp) VALUES(?, ?, ?, x\'00\', ?, ?, ?)').run(id, ap, a2, h, Date.now(), Date.now() + 1000);
      ins('g_' + '3'.repeat(32), 'h1');
      let doublon = null; try { ins('g_' + '4'.repeat(32), 'h1'); } catch (e) { doublon = String(e.message); }
      vrai('⛔ deux invités ne partagent JAMAIS la même session (unicité de l\'empreinte)', doublon !== null && /UNIQUE/i.test(doublon));
      ins('g_' + '5'.repeat(32), null); ins('g_' + '6'.repeat(32), null);
      v('… mais des sessions COUPÉES (NULL) peuvent être plusieurs', d.prepare('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE session_h IS NULL').get().n, 2);
      d.prepare('DELETE FROM appel WHERE id = ?').run(ap);
      v('supprimer la séance emporte ses invités (cascade)', d.prepare('SELECT COUNT(*) AS n FROM invite_sans_compte').get().n, 0);
    } finally { d.close(); } }

    console.log('4. rejouable');
    { const d = brut(); try {
      d.exec('PRAGMA foreign_keys=ON');
      const ap = 'a_' + crypto.randomBytes(16).toString('hex'), t = horloge.t;
      d.prepare('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, genre, capacite) VALUES(?, \'audio\', \'en_cours\', ?, ?, \'groupe\', 6)').run(ap, t, t);
      d.prepare('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen) VALUES(?, ?, \'appelant\', \'sess\', \'present\', 2, ?, 1)').run(ap, ana.id, t);
      d.prepare('INSERT INTO appel_part(appel, uid, role, session, statut, grade, entre, gen) VALUES(?, ?, \'appele\', \'sess-g\', \'attente\', 0, ?, 0)').run(ap, 'g_' + '7'.repeat(32), t);
    } finally { d.close(); } }
    const avantRejeu = lire('SELECT * FROM appel_part ORDER BY appel, uid');
    vrai('population : des lignes de salle existent à rejouer (' + avantRejeu.length + ')', avantRejeu.length >= 1);
    { const d = brut(); try { d.exec('PRAGMA user_version = 29'); } finally { d.close(); } }
    let echec = null; try { ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => horloge.t }); } catch (e) { echec = String(e && e.message); }
    v('⛔ la migration RE-jouée (compteur remis à 29, la colonne et les tables déjà là) ne casse pas', echec, null);
    v('… le schéma repasse à 30, les lignes de salle sont intactes et la clé étrangère toujours absente', [lire('PRAGMA user_version')[0].user_version, lire('SELECT * FROM appel_part ORDER BY appel, uid'), /REFERENCES personne/.test(lire('SELECT sql FROM sqlite_master WHERE name = \'appel_part\'')[0].sql)], [30, avantRejeu, false]);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* déjà */ } }
  fin();
})();
