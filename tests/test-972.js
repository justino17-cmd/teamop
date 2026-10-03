/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS PROGRAMMÉES, LE STOCKAGE SEUL (famille 1 de SERVEUR.md § 3.11, étape 6).

   `server-msg/stockage.js` (la migration 7) monté avec le VRAI stockage — un fichier de base, une clé et une horloge injectés. Pas de HTTP ici : `test-973` joue les routes, `test-974` le planificateur,
   `test-905` les gardes. Celui-ci dit que ce qui est RANGÉ est juste, et que ce qui s'efface ne revient pas :

     · la migration 7 est numérotée (celle des espaces, la 6, n'a pas bougé), rejouable, garde sa copie, et ses cinq tables entrent dans les TROIS listes écrites à la main ;
       une base DÉJÀ au schéma 6 la reçoit sans rien perdre ;
     · une réunion : une conversation de genre `reunion` (la MÊME mécanique que les groupes), un hôte administrateur, des invités, un titre et un lieu SCELLÉS au repos ; un non-invité ne voit RIEN ;
     · modifier : le titre renomme la conversation, l'HORAIRE remet les réponses « en attente » (celui qui avait décliné l'ancienne heure ne doit pas manquer la nouvelle) ; annuler se note ;
       supprimer emporte la conversation, se note, et dit à chacun que la réunion n'existe plus ;
     · inviter, retirer (noté), répondre, régler ses rappels ; l'hôte ne se retire pas et ne répond pas ;
     · le BAIL du planificateur : une seule instance, expirable ; le REGISTRE des rappels : un rappel ne part qu'une fois ;
     · les genres de purge neufs (`reunion_invite`, `reunion_annulee`) sont rejoués hors ligne sur une copie restaurée — et ce qui est arrivé APRÈS l'effacement n'est pas effacé ;
     · un compte effacé : hôte, la réunion passe au plus ancien invité qui n'a pas décliné (sinon elle part) ; invité, sa ligne part — et le REJEU d'un effacement après une restauration ne
       réécrit RIEN au registre, quel que soit le cas ;
     · une restauration ne laisse ni un bail copié ni des rappels qui se renverraient.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const STOCK = require(path.join(T.SERVICE, 'stockage.js'));
const { ouvrir, MIGRATIONS } = STOCK;
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');

const MIN = 60000, JOUR = 86400000;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-972-'));
process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } });
let n = 0;
function neuf(opts = {}) {
  const chemin = path.join(bac, 'msg-' + (++n) + '.db');
  const kek = opts.kek || crypto.randomBytes(32);
  const h = { t: 1790000000000 };
  const S = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: opts.migrations });
  return { S, chemin, kek, h, brut: () => new DatabaseSync(chemin) };
}
const pers = (S, nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++n), prenom: nom, nom: 'Test', origine: 'beta', verifie: true });
const lance = (f) => { try { f(); return null; } catch (e) { return e.code || e.message; } };
const octets = (chemin) => { let b = Buffer.alloc(0); for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) { /* absent */ } } return b; };
const compte = (db, sql, ...p) => Number(db.prepare(sql).get(...p).n);
const registre = (chemin) => STOCK.ouvrir.copie.purgeLire(chemin);
/* un atelier : Ana (hôte), Ben, Cleo, Dan (invités, arrivés à une seconde d'écart : « le plus ancien » se lit), Eli dehors */
function atelier(opts = {}) {
  const a = neuf(opts), S = a.S;
  const ana = pers(S, 'Ana'), ben = pers(S, 'Ben'), cleo = pers(S, 'Cleo'), dan = pers(S, 'Dan'), eli = pers(S, 'Eli');
  return Object.assign(a, { ana, ben, cleo, dan, eli });
}
const DEBUT = 1790000000000 + 2 * JOUR;
/* une réunion de l'atelier */
function reunion(a, extra) {
  const o = Object.assign({ hote: a.ana.id, titre: 'Point hebdo TITRE-CANARI', lieu: 'Salle LIEU-CANARI', debut: DEBUT, fin: DEBUT + 3600000, tz: 'Europe/Paris', rep: 'aucune', n: null, jusqua: null, rappels: [15], invites: [a.ben.id, a.cleo.id, a.dan.id], prochain: DEBUT }, extra || {});
  a.h.t += 1000;
  return Object.assign({ o }, a.S.reunionCreer(o));
}
const evenements = (S, uid) => S.evenementsPour(uid, 0, 1000).evenements;
const reunionEvents = (S, uid) => evenements(S, uid).filter(e => e.event === 'reunion');
const statuts = (S, id, uid) => { const r = S.reunionPourMembre(id, uid); return r ? r.invites.map(i => i.prenom + ':' + i.statut) : null; };

console.log('La migration 7 : numérotée, rejouable, avec sa copie, et ses cinq tables dans les TROIS listes');
{
  const DERNIERE = MIGRATIONS[MIGRATIONS.length - 1].v;
  const celle = MIGRATIONS.filter(m => m.sql.some(s => /CREATE TABLE IF NOT EXISTS reunion\(/.test(s)));
  v('population : UNE migration crée les réunions, et elle porte le numéro qui suit toutes les précédentes (jamais un numéro supposé)', [celle.length, celle[0] && celle[0].v, MIGRATIONS.filter(m => m.v < (celle[0] || {}).v).length], [1, 7, 6]);
  const six = MIGRATIONS.filter(m => m.v === 6);
  vrai('⛔ la 6 est celle des ESPACES et n\'a pas bougé : aucune table de réunion n\'y est rangée (une base au schéma 6 croirait les avoir)', six.length === 1 && six[0].sql.some(s => /espace\(/.test(s)) && !six[0].sql.some(s => /reunion|rappel|planif_bail|courrier_envoi/.test(s)));
  vrai('les numéros se suivent sans trou (1 à ' + DERNIERE + ')', MIGRATIONS.map(m => m.v).join() === Array.from({ length: DERNIERE }, (_, i) => i + 1).join());
  vrai('elle crée les cinq tables', ['reunion(', 'reunion_invite(', 'rappel(', 'planif_bail(', 'courrier_envoi('].every(m => celle[0].sql.some(s => s.includes(m))));
  vrai('elle ne modifie aucune table qui existe (pas d\'ALTER : la migration reste rejouable)', !celle[0].sql.some(s => /^\s*ALTER\b/i.test(s)));
  const a = neuf();
  v('une base neuve est au schéma de la dernière migration', a.S.schema(), DERNIERE);
  const cinq = ['reunion', 'reunion_invite', 'rappel', 'planif_bail', 'courrier_envoi'];
  const brut = a.brut();
  const tables = brut.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map(r => r.name);
  vrai('les cinq tables existent', cinq.every(t => tables.includes(t)));
  brut.close();
  v('⛔ les TROIS listes écrites à la main nomment les cinq : TABLES_COMPTEES, la sonde de la base vivante, le comptage de la copie',
    [cinq.filter(t => !STOCK.ouvrir.copie.TABLES_COMPTEES.includes(t)), cinq.filter(t => !(t in a.S.sonde().nonVides)), cinq.filter(t => !(t in (STOCK.ouvrir.copie.controlerFichier(a.chemin).lignes || {})))], [[], [], []]);

  /* ⛔ LA BASE QUI EST EN SERVICE : au schéma 6 (les espaces, sur la bêta). Elle reçoit la 7 et RIEN de ce qu'elle porte ne bouge — et une copie « avant-v7 » est gardée avant de la toucher. */
  const vive = MIGRATIONS.filter(m => m.v <= 6);
  const g = neuf({ migrations: vive });
  const gAna = pers(g.S, 'Ana'), gBen = pers(g.S, 'Ben');
  g.S.contactLier(gAna.id, gBen.id);
  const gEsp = g.S.espaceCreer({ nom: 'Avant la 7', proprio: gAna.id }).id;
  const pop6 = [g.S.schema(), g.S.contactsDe(gAna.id).length, g.S.espacePourMembre(gEsp, gAna.id).espace.nom];
  g.S.fermer();
  const br6 = g.brut();
  const sansReunion6 = compte(br6, `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'reunion'`);
  br6.close();
  v('population : une base du schéma 6, sans réunion, avec un contact et un espace', [pop6, sansReunion6], [[6, 1, 'Avant la 7'], 0]);
  const g7 = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t });
  v('⛔ rouverte avec la migration 7 : schéma ' + DERNIERE + ', le contact et l\'espace sont intacts', [g7.schema(), g7.contactsDe(gAna.id).length, g7.espacePourMembre(gEsp, gAna.id).espace.nom], [DERNIERE, 1, 'Avant la 7']);
  vrai('⛔ une copie « avant-v7 » est gardée avant de migrer une base qui a vécu — et PAS de « avant-v6 » (la 6 était déjà faite)', fs.existsSync(g.chemin + '.avant-v7') && !fs.existsSync(g.chemin + '.avant-v6'));
  const cop = new DatabaseSync(g.chemin + '.avant-v7');
  v('la copie est la base d\'AVANT : schéma 6, sans la table des réunions', [cop.prepare('PRAGMA user_version').get().user_version, compte(cop, `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'reunion'`)], [6, 0]);
  cop.close();
  const gB = pers(g7, 'Cleo');
  g7.contactLier(gAna.id, gB.id);
  const r = g7.reunionCreer({ hote: gAna.id, titre: 'Après la 7', lieu: '', debut: DEBUT, fin: DEBUT + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [gB.id], prochain: DEBUT });
  v('… et une réunion se crée sur cette base migrée', g7.reunionPourMembre(r.id, gB.id).reunion.titre, 'Après la 7');
  g7.fermer();
  const re = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t });
  v('⛔ la migration REJOUÉE sur une base déjà migrée ne perd rien (la réunion, ses invités, l\'espace)', [re.schema(), re.reunionPourMembre(r.id, gB.id).invites.length, re.espacePourMembre(gEsp, gAna.id).espace.nom], [DERNIERE, 2, 'Avant la 7']);
  re.fermer();
}

console.log('\nUne réunion : une conversation de genre `reunion`, un hôte, des invités, un titre et un lieu scellés');
{
  const a = atelier(), S = a.S;
  const r = reunion(a);
  const vue = S.reunionPourMembre(r.id, a.ana.id);
  v('l\'hôte la lit : titre, lieu, horaire, fuseau, répétition, rappels, version 0, non annulée', [vue.reunion.titre, vue.reunion.lieu, vue.reunion.debut, vue.reunion.fin, vue.reunion.tz, vue.reunion.repetition, vue.reunion.rappels, vue.reunion.version, vue.reunion.annulee],
    ['Point hebdo TITRE-CANARI', 'Salle LIEU-CANARI', DEBUT, DEBUT + 3600000, 'Europe/Paris', 'aucune', [15], 0, false]);
  v('⛔ les invités : l\'hôte d\'abord (et « accepte » d\'office), puis les trois dans l\'ordre de l\'invitation, tous « en attente »', statuts(S, r.id, a.ana.id), ['Ana:accepte', 'Ben:attente', 'Cleo:attente', 'Dan:attente']);
  v('   chacun se lit lui-même dans la liste : l\'hôte est marqué `hote`, `moi` dit son rôle et sa réponse', [vue.invites.filter(i => i.hote).map(i => i.prenom), vue.moi, S.reunionPourMembre(r.id, a.ben.id).moi], [['Ana'], { hote: true, statut: 'accepte', rappels: [15], rappels_perso: false }, { hote: false, statut: 'attente', rappels: [15], rappels_perso: false }]);
  v('⛔ une personne qui n\'est PAS invitée reçoit « rien » — la même chose qu\'une réunion qui n\'existe pas (404 dans les deux cas, jamais 403)', [S.reunionPourMembre(r.id, a.eli.id), S.reunionPourMembre('r_' + '0'.repeat(32), a.ana.id)], [null, null]);
  const conv = S.convPourMembre(vue.reunion.conv, a.ben.id);
  v('sa conversation est de genre `reunion`, porte le TITRE, dit sa réunion, et l\'hôte y est administrateur, les invités membres', [conv.conv.type, conv.conv.nom, conv.conv.reunion, S.convPourMembre(vue.reunion.conv, a.ana.id).moi.role, conv.moi.role], ['reunion', 'Point hebdo TITRE-CANARI', r.id, 'admin', 'membre']);
  v('⛔ un non-invité n\'est pas membre de la conversation (même 404)', S.convPourMembre(vue.reunion.conv, a.eli.id), null);
  const liste = S.convListe(a.ben.id).filter(c => c.type === 'reunion');
  v('la liste des conversations de Ben porte la réunion (type, nom, identifiant de la réunion), avec le message d\'ouverture comme aperçu', [liste.length, liste[0].nom, liste[0].reunion, liste[0].apercu && liste[0].apercu.type, liste[0].non_lus], [1, 'Point hebdo TITRE-CANARI', r.id, 'systeme', 0]);
  v('une conversation de groupe ordinaire n\'a PAS ce champ (il est propre aux réunions)', (() => { const g = S.convCreerGroupe({ createur: a.ana.id, nom: 'Groupe', membres: [a.ben.id] }); return S.convListe(a.ana.id).find(c => c.id === g.id).reunion; })(), undefined);
  const ouverture = S.messagesDe(vue.reunion.conv, a.ben.id, { limite: 10 });
  vrai('le message d\'ouverture existe : un message système `reunion_creee`, de l\'hôte', ouverture && ouverture.messages.some(m => m.type === 'systeme' && m.meta && m.meta.k === 'reunion_creee' && m.auteur === a.ana.id));
  const fichier = octets(a.chemin);
  vrai('⛔ le titre et le lieu sont SCELLÉS au repos : ni dans le fichier de la base, ni dans son journal WAL (le nom d\'un client, d\'un chantier)', !fichier.includes(Buffer.from('TITRE-CANARI')) && !fichier.includes(Buffer.from('LIEU-CANARI')));
  vrai('   (contre-épreuve : le canari serait lisible s\'il ne l\'était pas — on le retrouve en clair dans un fichier qui le contient)', Buffer.concat([Buffer.from('xx TITRE-CANARI xx'), fichier]).includes(Buffer.from('TITRE-CANARI')));
  const ev = reunionEvents(S, a.ben.id);
  v('⛔ l\'événement de la création arrive à chaque participant (UNE ligne du journal, portée par la conversation) et ne dit que « relis » : identifiant, conversation, version — pas la liste des invités', [ev.length, ev[0].data], [1, { id: r.id, conv: vue.reunion.conv, version: 0 }]);
  v('   et pas à qui n\'est pas invité', reunionEvents(S, a.eli.id).length, 0);
  v('   (une seule ligne `reunion` dans le journal pour quatre participants)', compte(a.brut(), `SELECT COUNT(*) AS n FROM journal WHERE genre = 'reunion'`), 1);
  v('⛔ la liste de l\'agenda : la réunion est dans la fenêtre qui la contient, une version courte (nombre de participants, quatre visages, ma réponse)',
    (() => { const l = S.reunionsDe(a.ben.id, DEBUT - JOUR, DEBUT + JOUR); return [l.length, l[0].participants_n, l[0].participants.length, l[0].moi.statut, l[0].hote.prenom, l[0].invites]; })(), [1, 4, 4, 'attente', 'Ana', undefined]);
  v('   une fenêtre qui ne la touche pas (la veille de la veille) ne la liste pas ; un non-invité ne la voit jamais', [S.reunionsDe(a.ben.id, DEBUT - 10 * JOUR, DEBUT - 5 * JOUR).length, S.reunionsDe(a.eli.id, DEBUT - JOUR, DEBUT + JOUR).length], [0, 0]);
  const serie = reunion(a, { rep: 'hebdomadaire', n: 10, debut: DEBUT - 20 * JOUR, fin: DEBUT - 20 * JOUR + 3600000, titre: 'Série', prochain: DEBUT - 6 * JOUR });
  v('⛔ une SÉRIE commencée avant la fenêtre est dans la présélection (ses occurrences se calculent à l\'appelant), une réunion simple finie avant ne l\'est pas', [S.reunionsDe(a.ben.id, DEBUT, DEBUT + JOUR).map(x => x.titre), S.reunionsDe(a.ben.id, DEBUT, DEBUT + JOUR).filter(x => x.repetition === 'aucune').length],
    [['Série', 'Point hebdo TITRE-CANARI'], 1]);
  S.fermer();
}

console.log('\nLes plafonds : cent invités, trois cents réunions à venir par hôte');
{
  const a = atelier(), S = a.S;
  const cent = Array.from({ length: 100 }, (_, i) => pers(S, 'Inv' + i).id), cent1 = cent.concat([pers(S, 'Trop').id]);
  v('population : 101 personnes créées', cent1.length, 101);
  v('⛔ cent invités passent', lance(() => S.reunionCreer({ hote: a.ana.id, titre: 'Grande', lieu: '', debut: DEBUT, fin: DEBUT + MIN * 60, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: cent, prochain: DEBUT })), null);
  v('⛔ cent un invités : `trop_d_invites`, et RIEN n\'est écrit (ni conversation, ni réunion à moitié)', (() => { const avant = compte(a.brut(), 'SELECT COUNT(*) AS n FROM reunion'); const e = lance(() => S.reunionCreer({ hote: a.ana.id, titre: 'Trop', lieu: '', debut: DEBUT, fin: DEBUT + MIN * 60, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: cent1, prochain: DEBUT })); return [e, compte(a.brut(), 'SELECT COUNT(*) AS n FROM reunion') - avant, compte(a.brut(), `SELECT COUNT(*) AS n FROM conversation WHERE type = 'reunion'`)]; })(), ['trop_d_invites', 0, 1]);
  const id = S.reunionCreer({ hote: a.ben.id, titre: 'Cent', lieu: '', debut: DEBUT, fin: DEBUT + MIN * 60, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [], prochain: DEBUT }).id;
  v('⛔ inviter au-delà de cent : `trop_d_invites` (on compte les invités déjà là)', [lance(() => S.reunionInviter({ id, par: a.ben.id, uids: cent })), lance(() => S.reunionInviter({ id, par: a.ben.id, uids: [cent1[100]] }))], [null, 'trop_d_invites']);
  const b = atelier(), T2 = b.S;
  const creer = (i, prochain) => lance(() => T2.reunionCreer({ hote: b.ana.id, titre: 'R' + i, lieu: '', debut: DEBUT, fin: DEBUT + 60000, tz: 'UTC', rep: 'aucune', rappels: [], invites: [], prochain }));
  let echecs = 0;
  for (let i = 0; i < 295; i++) if (creer(i, DEBUT + i)) echecs++;
  for (let i = 0; i < 10; i++) if (creer(1000 + i, null)) echecs++;
  v('population : 295 réunions à venir et 10 réunions FINIES (sans prochaine occurrence), toutes créées', [echecs, compte(b.brut(), 'SELECT COUNT(*) AS n FROM reunion WHERE hote = ?', b.ana.id)], [0, 305]);
  v('⛔ trois cents réunions à venir par hôte, les finies NE COMPTENT PAS : les cinq suivantes passent (la 300e est la dernière), la 301e est refusée (`trop_de_reunions`)',
    [[1, 2, 3, 4, 5].map(i => creer(2000 + i, DEBUT + i)), creer(3000, DEBUT)], [[null, null, null, null, null], 'trop_de_reunions']);
  v('   une réunion ANNULÉE ne compte plus non plus (annuler en libère une)', (() => { const id = compte(b.brut(), 'SELECT COUNT(*) AS n FROM reunion') && b.brut().prepare('SELECT id FROM reunion WHERE hote = ? AND prochain IS NOT NULL LIMIT 1').get(b.ana.id).id; T2.reunionAnnuler({ id, par: b.ana.id }); return creer(4000, DEBUT); })(), null);
  S.fermer(); T2.fermer();
}

console.log('\nModifier : le titre renomme la conversation, l\'HORAIRE remet les réponses en attente');
{
  const a = atelier(), S = a.S;
  const r = reunion(a);
  const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
  a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'accepte' });
  a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.cleo.id, statut: 'decline' });
  a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.dan.id, statut: 'peutetre' });
  v('population : trois réponses différentes avant la modification', statuts(S, r.id, a.ana.id), ['Ana:accepte', 'Ben:accepte', 'Cleo:decline', 'Dan:peutetre']);
  const v0 = reunionEvents(S, a.ben.id).length;
  a.h.t += 1000;
  const m1 = S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Nouveau titre', lieu: 'Salle 2', rappels: [5, 60] });
  const vue1 = S.reunionPourMembre(r.id, a.ben.id);
  v('⛔ changer le TITRE et le LIEU : la version monte, la conversation prend le nouveau titre, les réponses RESTENT (l\'horaire n\'a pas bougé)',
    [m1.change, m1.horaire, m1.titre, m1.lieu, vue1.reunion.version, vue1.reunion.titre, vue1.reunion.lieu, vue1.reunion.rappels, S.convPourMembre(conv, a.cleo.id).conv.nom, statuts(S, r.id, a.ana.id)],
    [true, false, true, true, 1, 'Nouveau titre', 'Salle 2', [5, 60], 'Nouveau titre', ['Ana:accepte', 'Ben:accepte', 'Cleo:decline', 'Dan:peutetre']]);
  v('   un événement part vers les participants (la page relit)', reunionEvents(S, a.ben.id).length - v0, 1);
  const horaireAvant = S.reunionPlanif(r.id).horaire_le;
  a.h.t += 5000;
  const m2 = S.reunionModifier({ id: r.id, par: a.ana.id, debut: DEBUT + 3600000, fin: DEBUT + 7200000, prochain: DEBUT + 3600000 });
  const vue2 = S.reunionPourMembre(r.id, a.ben.id), plan2 = S.reunionPlanif(r.id);
  v('⛔ changer l\'HORAIRE : les réponses de tous les invités redeviennent « en attente » (celui qui avait décliné l\'ancienne heure ne manque pas la nouvelle), l\'hôte reste « accepte »',
    [m2.change, m2.horaire, vue2.reunion.debut, vue2.reunion.version, statuts(S, r.id, a.ana.id)], [true, true, DEBUT + 3600000, 2, ['Ana:accepte', 'Ben:attente', 'Cleo:attente', 'Dan:attente']]);
  v('   `horaire_le` date la modification de l\'HORAIRE (borne des rappels dus), et la prochaine occurrence est celle que l\'appelant a calculée', [plan2.horaire_le > horaireAvant, plan2.prochain], [true, DEBUT + 3600000]);
  const plan1 = (() => { a.h.t += 1000; S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Encore un titre' }); return S.reunionPlanif(r.id); })();
  v('⛔ changer le seul titre ne touche PAS `horaire_le` (un rappel qui n\'a pas pu partir pendant un arrêt reste dû)', plan1.horaire_le, plan2.horaire_le);
  v('⛔ ne rien changer n\'écrit rien : pas de version, pas d\'événement, pas de message', (() => { const ev0 = reunionEvents(S, a.ben.id).length, ver = S.reunionPourMembre(r.id, a.ana.id).reunion.version; const x = S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Encore un titre', lieu: 'Salle 2', rappels: [5, 60], debut: DEBUT + 3600000 }); return [x.change, x.gid, reunionEvents(S, a.ben.id).length - ev0, S.reunionPourMembre(r.id, a.ana.id).reunion.version - ver]; })(), [false, 0, 0, 0]);
  v('⛔ un invité ne modifie pas (`interdit`), personne ne modifie ce qui n\'existe pas (`introuvable`)', [lance(() => S.reunionModifier({ id: r.id, par: a.ben.id, titre: 'Piraté' })), lance(() => S.reunionModifier({ id: 'r_inconnue', par: a.ana.id, titre: 'x' })), S.reunionPourMembre(r.id, a.ana.id).reunion.titre], ['interdit', 'introuvable', 'Encore un titre']);
  const messagesSys = S.messagesDe(conv, a.ana.id, { limite: 50 }).messages.filter(m => m.type === 'systeme').map(m => m.meta.k + (m.meta.horaire === true ? '+horaire' : ''));
  v('le fil de la réunion dit ce qui s\'est passé : création, deux modifications de contenu, une d\'horaire', messagesSys.filter(k => k !== 'rejoint'), ['reunion_creee', 'reunion_modifiee', 'reunion_modifiee+horaire', 'reunion_modifiee']);
  S.fermer();
}

console.log('\nModifier dit CE QUI a changé : la route ne prévient que de ce qui se voit (le titre, le lieu, l\'horaire — pas un rappel)');
{
  const a = atelier(), S = a.S;
  const r = reunion(a);
  a.h.t += 1000;
  const mLieu = S.reunionModifier({ id: r.id, par: a.ana.id, lieu: 'Salle 3' });
  a.h.t += 1000;
  const mRappel = S.reunionModifier({ id: r.id, par: a.ana.id, rappels: [5] });
  a.h.t += 1000;
  const mTitre = S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Un autre titre' });
  v('un lieu seul : changé, c\'est le LIEU ; un rappel seul : changé, mais ni titre, ni lieu, ni horaire ; un titre seul : le TITRE', [[mLieu.change, mLieu.titre, mLieu.lieu, mLieu.horaire], [mRappel.change, mRappel.titre, mRappel.lieu, mRappel.horaire], [mTitre.change, mTitre.titre, mTitre.lieu, mTitre.horaire]],
    [[true, false, true, false], [true, false, false, false], [true, true, false, false]]);
  S.fermer();
}

console.log('\nAnnuler : la réunion reste (annulée), plus aucun rappel, et ça se NOTE');
{
  const a = atelier(), S = a.S;
  const r = reunion(a);
  a.h.t += 1000;
  const x = S.reunionAnnuler({ id: r.id, par: a.ana.id });
  const vue = S.reunionPourMembre(r.id, a.ben.id);
  v('⛔ annulée : le drapeau, la version qui monte, plus de prochaine occurrence (le planificateur ne la regarde plus)', [x.change, vue.reunion.annulee, vue.reunion.version, S.reunionPlanif(r.id).prochain, S.reunionsARappeler(DEBUT + 10 * JOUR)], [true, true, 1, null, []]);
  v('⛔ elle se NOTE au registre des purges (genre `reunion_annulee`, l\'identifiant de la réunion) — une archive d\'avant la rendrait active', registre(a.chemin).filter(e => e.genre === 'reunion_annulee').map(e => e.objet), [r.id]);
  v('annuler deux fois ne change rien et n\'écrit pas une deuxième ligne', (() => { a.h.t += 1000; const y = S.reunionAnnuler({ id: r.id, par: a.ana.id }); return [y.change, y.gid, registre(a.chemin).filter(e => e.genre === 'reunion_annulee').length]; })(), [false, 0, 1]);
  v('⛔ un invité n\'annule pas', lance(() => S.reunionAnnuler({ id: r.id, par: a.ben.id })), 'interdit');
  v('⛔ on ne modifie plus, n\'invite plus, ne répond plus une réunion annulée (`reunion_annulee`)', [lance(() => S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'x' })), lance(() => S.reunionInviter({ id: r.id, par: a.ana.id, uids: [a.eli.id] })), lance(() => S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'accepte' }))], ['reunion_annulee', 'reunion_annulee', 'reunion_annulee']);
  v('le chat reste ouvert : on peut y écrire après l\'annulation', (() => { const m = S.messageEnvoyer({ conv: vue.reunion.conv, auteur: a.ben.id, cid: 'cid-apres-annulation', texte: 'Dommage' }); return m.deja === false; })(), true);
  v('… et la réunion annulée est encore dans l\'agenda de chacun (marquée annulée)', S.reunionsDe(a.cleo.id, DEBUT - JOUR, DEBUT + JOUR).map(x => [x.titre, x.annulee]), [['Point hebdo TITRE-CANARI', true]]);
  S.fermer();
}

console.log('\nSupprimer : la réunion part avec sa conversation, se note, et chacun apprend qu\'elle n\'existe plus');
{
  const a = atelier(), S = a.S;
  const r = reunion(a);
  const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
  S.messageEnvoyer({ conv, auteur: a.ben.id, cid: 'cid-avant-suppression', texte: 'Un message qui ne doit pas rester' });
  a.h.t += 1000;
  const brut = a.brut();
  const avant = [compte(brut, 'SELECT COUNT(*) AS n FROM reunion'), compte(brut, 'SELECT COUNT(*) AS n FROM reunion_invite'), compte(brut, 'SELECT COUNT(*) AS n FROM message WHERE conv = ?', conv), compte(brut, 'SELECT COUNT(*) AS n FROM membre WHERE conv = ?', conv)];
  v('population : une réunion, quatre invitations, des messages, quatre membres', [avant[0], avant[1], avant[2] >= 2, avant[3]], [1, 4, true, 4]);
  v('un invité ne supprime pas', lance(() => S.reunionSupprimer({ id: r.id, par: a.ben.id })), 'interdit');
  const x = S.reunionSupprimer({ id: r.id, par: a.ana.id });
  const apres = [compte(brut, 'SELECT COUNT(*) AS n FROM reunion'), compte(brut, 'SELECT COUNT(*) AS n FROM reunion_invite'), compte(brut, 'SELECT COUNT(*) AS n FROM message WHERE conv = ?', conv), compte(brut, 'SELECT COUNT(*) AS n FROM membre WHERE conv = ?', conv), compte(brut, 'SELECT COUNT(*) AS n FROM conversation WHERE id = ?', conv)];
  v('⛔ la réunion, ses invitations, sa conversation, ses messages et ses membres sont partis (la cascade)', apres, [0, 0, 0, 0, 0]);
  v('   les quatre participants sont rendus (pour les prévenir) ; aucune pièce à effacer ici', [x.participants.length, x.pieces], [4, []]);
  v('⛔ la CONVERSATION est notée au registre (genre `conversation`) : une archive d\'avant ne ramène ni la réunion ni son chat', registre(a.chemin).filter(e => e.genre === 'conversation').map(e => e.objet), [conv]);
  const ev = [a.ana, a.ben, a.cleo, a.dan].map(p => reunionEvents(S, p.id).map(e => e.data));
  v('⛔ CHACUN reçoit un événement adressé « cette réunion n\'existe plus » (l\'événement de la conversation ne lui arriverait plus) — y compris ceux qui n\'ont rien vu d\'autre', ev.map(l => l.filter(d => d.supprime === true).map(d => d.id)), [[r.id], [r.id], [r.id], [r.id]]);
  v('   et pas à Eli, qui n\'était pas invité', reunionEvents(S, a.eli.id).length, 0);
  v('une réunion supprimée ne se supprime pas deux fois', lance(() => S.reunionSupprimer({ id: r.id, par: a.ana.id })), 'introuvable');
  S.fermer();
}

console.log('\nInviter, retirer, répondre, régler ses rappels');
{
  const a = atelier(), S = a.S;
  const r = reunion(a, { invites: [a.ben.id] });
  const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
  a.h.t += 1000;
  const i1 = S.reunionInviter({ id: r.id, par: a.ana.id, uids: [a.cleo.id, a.ben.id, a.ana.id, a.cleo.id] });
  v('⛔ inviter : les nouveaux seulement (l\'hôte, un déjà invité et un doublon sont ignorés), en attente, et dans la conversation', [i1.ajoutes, statuts(S, r.id, a.ana.id), S.convPourMembre(conv, a.cleo.id) !== null], [[a.cleo.id], ['Ana:accepte', 'Ben:attente', 'Cleo:attente'], true]);
  v('   inviter personne de nouveau ne fait rien (pas d\'événement, pas de version)', (() => { const ev0 = reunionEvents(S, a.ben.id).length, ver = S.reunionPourMembre(r.id, a.ana.id).reunion.version; const x = S.reunionInviter({ id: r.id, par: a.ana.id, uids: [a.ben.id] }); return [x.ajoutes, x.gid, reunionEvents(S, a.ben.id).length - ev0, S.reunionPourMembre(r.id, a.ana.id).reunion.version - ver]; })(), [[], 0, 0, 0]);
  v('un invité n\'invite pas', lance(() => S.reunionInviter({ id: r.id, par: a.ben.id, uids: [a.dan.id] })), 'interdit');
  a.h.t += 1000;
  v('⛔ l\'hôte ne se retire pas (il annule ou supprime) ; on ne retire pas qui n\'est pas invité', [lance(() => S.reunionRetirer({ id: r.id, par: a.ana.id, uid: a.ana.id })), lance(() => S.reunionRetirer({ id: r.id, par: a.ana.id, uid: a.eli.id }))], ['hote_non_retirable', 'introuvable']);
  const ev0 = reunionEvents(S, a.cleo.id).length;
  a.h.t += 1000;
  S.reunionRetirer({ id: r.id, par: a.ana.id, uid: a.cleo.id });
  v('⛔ retirer : la ligne d\'invitation part, Cleo ne voit plus la réunion ni sa conversation, les autres la voient sans elle', [S.reunionPourMembre(r.id, a.cleo.id), S.convPourMembre(conv, a.cleo.id), statuts(S, r.id, a.ana.id)], [null, null, ['Ana:accepte', 'Ben:attente']]);
  v('⛔ le retrait se NOTE deux fois, chacun par son genre : `reunion_invite` (réunion|personne|date) et `groupe_membre` (conversation|personne|date)',
    [registre(a.chemin).filter(e => e.genre === 'reunion_invite').map(e => e.objet.split('|').slice(0, 2).join('|')), registre(a.chemin).filter(e => e.genre === 'groupe_membre').map(e => e.objet.split('|').slice(0, 2).join('|'))], [[r.id + '|' + a.cleo.id], [conv + '|' + a.cleo.id]]);
  v('⛔ Cleo reçoit un événement ADRESSÉ « elle n\'existe plus pour toi » (son agenda la retire) — et c\'est tout ce qui lui reste : les événements de la réunion portés par la conversation ne lui parviennent plus, ceux d\'avant non plus (elle n\'en est plus membre)', (() => { const e = reunionEvents(S, a.cleo.id); return [ev0 >= 1, e.map(x => x.data)]; })(), [true, [{ id: r.id, supprime: true }]]);
  a.h.t += 1000; S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Après le retrait' });
  v('… et ce que l\'hôte modifie ensuite ne lui parvient plus', reunionEvents(S, a.cleo.id).filter(e => e.data.version === 3).length, 0);
  a.h.t += 1000;
  S.reunionInviter({ id: r.id, par: a.ana.id, uids: [a.cleo.id] });
  v('⛔ réinviter une personne retirée marche (elle redevient membre, en attente, avec une invitation NEUVE)', [statuts(S, r.id, a.ana.id), S.convPourMembre(conv, a.cleo.id) !== null], [['Ana:accepte', 'Ben:attente', 'Cleo:attente'], true]);

  /* répondre */
  const rep = (uid, statut) => S.reunionRepondre({ id: r.id, uid, statut });
  a.h.t += 1000; const ev1 = reunionEvents(S, a.ana.id).length;
  const p1 = rep(a.ben.id, 'accepte'), p2 = rep(a.ben.id, 'accepte');
  v('⛔ répondre : la réponse change et se dit ; la même réponse deux fois ne fait rien (pas d\'événement de plus)', [p1.change, p2.change, p2.gid, statuts(S, r.id, a.ana.id), reunionEvents(S, a.ana.id).length - ev1], [true, false, 0, ['Ana:accepte', 'Ben:accepte', 'Cleo:attente'], 1]);
  v('les quatre réponses existent : accepte, décline, peut-être, en attente', (() => { rep(a.cleo.id, 'decline'); const d = statuts(S, r.id, a.ana.id).slice(); rep(a.cleo.id, 'peutetre'); const e = statuts(S, r.id, a.ana.id).slice(); rep(a.cleo.id, 'attente'); return [d[2], e[2], statuts(S, r.id, a.ana.id)[2]]; })(), ['Cleo:decline', 'Cleo:peutetre', 'Cleo:attente']);
  v('⛔ l\'hôte ne répond pas à sa propre réunion (`hote_reponse`), un non-invité non plus (`introuvable`)', [lance(() => rep(a.ana.id, 'decline')), lance(() => rep(a.eli.id, 'accepte'))], ['hote_reponse', 'introuvable']);
  /* les rappels de la personne */
  const rr = S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [5, 1440] });
  const moiBen = S.reunionPourMembre(r.id, a.ben.id).moi;
  v('⛔ ses propres rappels : la liste de la personne remplace celle de la réunion pour ELLE seule, et l\'écran sait que c\'est un choix à elle', [moiBen.rappels, moiBen.rappels_perso, S.reunionPourMembre(r.id, a.ana.id).moi.rappels, S.reunionPourMembre(r.id, a.ana.id).moi.rappels_perso], [[5, 1440], true, [15], false]);
  S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: [] });
  v('   « aucun rappel » est un choix (une liste vide), distinct de « le réglage de la réunion » (null)', [S.reunionPourMembre(r.id, a.ben.id).moi.rappels, S.reunionPourMembre(r.id, a.ben.id).moi.rappels_perso], [[], true]);
  S.reunionRappelsPoser({ id: r.id, uid: a.ben.id, rappels: null });
  v('   null rend la main à la réunion', [S.reunionPourMembre(r.id, a.ben.id).moi.rappels, S.reunionPourMembre(r.id, a.ben.id).moi.rappels_perso], [[15], false]);
  v('un non-invité ne règle rien', lance(() => S.reunionRappelsPoser({ id: r.id, uid: a.eli.id, rappels: [5] })), 'introuvable');
  void rr;
  S.fermer();
}

console.log('\nLe bail du planificateur : une seule instance, et un arrêt brutal ne le bloque pas');
{
  const a = neuf(), S = a.S;
  v('population : aucun bail au départ', S.bailLire(), null);
  v('le premier le prend', S.bailPrendre({ proprietaire: 'instance-A', ttlMs: 45000 }), true);
  v('⛔ une AUTRE instance ne le prend pas tant qu\'il vit', S.bailPrendre({ proprietaire: 'instance-B', ttlMs: 45000 }), false);
  a.h.t += 10000;
  v('le détenteur le renouvelle (et garde sa date de prise)', (() => { const avant = S.bailLire(); const ok = S.bailPrendre({ proprietaire: 'instance-A', ttlMs: 45000 }); const apres = S.bailLire(); return [ok, apres.pris === avant.pris, apres.expire - avant.expire]; })(), [true, true, 10000]);
  a.h.t += 44999;
  v('⛔ une seconde avant son échéance, l\'autre est encore refusée', S.bailPrendre({ proprietaire: 'instance-B', ttlMs: 45000 }), false);
  a.h.t += 2;
  v('⛔ l\'échéance passée (l\'instance A est morte sans le rendre) : l\'autre le prend, et c\'est elle qui le tient', [S.bailPrendre({ proprietaire: 'instance-B', ttlMs: 45000 }), S.bailLire().proprietaire], [true, 'instance-B']);
  v('⛔ A, revenue, ne le reprend pas à B', S.bailPrendre({ proprietaire: 'instance-A', ttlMs: 45000 }), false);
  v('rendre un bail qui n\'est pas le sien ne fait rien ; le rendre libère', [S.bailRendre('instance-A'), S.bailLire() !== null, S.bailRendre('instance-B'), S.bailLire()], [false, true, true, null]);
  v('… et la table n\'a jamais plus d\'une ligne', (() => { S.bailPrendre({ proprietaire: 'x', ttlMs: 1 }); a.h.t += 5; S.bailPrendre({ proprietaire: 'y', ttlMs: 1 }); return compte(a.brut(), 'SELECT COUNT(*) AS n FROM planif_bail'); })(), 1);
  S.fermer();
}

console.log('\nLes rappels : le registre fait qu\'un rappel ne part qu\'UNE fois (la notification et sa ligne, dans la même transaction)');
{
  const a = atelier(), S = a.S;
  const r = reunion(a, { invites: [a.ben.id] });
  const brut = a.brut();
  const nNotifs = (uid) => compte(brut, `SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'reunion_rappel'`, uid);
  const envoi = () => S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT, uid: a.ben.id, avant: 15, titre: 'Point', texte: 'Commence dans 15 minutes.', cible: r.id });
  const e1 = envoi(), e2 = envoi(), e3 = envoi();
  v('⛔ le même rappel (réunion, occurrence, personne, minutes) envoyé trois fois ne crée qu\'UNE notification : la première rend la notification, les suivantes `null`', [!!e1 && typeof e1.id === 'string', e2, e3, nNotifs(a.ben.id)], [true, null, null, 1]);
  v('le registre le sait', [S.rappelDejaEnvoye(r.id, DEBUT, a.ben.id, 15), S.rappelDejaEnvoye(r.id, DEBUT, a.ben.id, 60), S.rappelDejaEnvoye(r.id, DEBUT + JOUR, a.ben.id, 15), S.rappelDejaEnvoye(r.id, DEBUT, a.ana.id, 15)], [true, false, false, false]);
  const e4 = S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT, uid: a.ben.id, avant: 60, titre: 'Point', texte: 'Commence dans 1 heure.', cible: r.id });
  const e5 = S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT + 7 * JOUR, uid: a.ben.id, avant: 15, titre: 'Point', texte: 'Commence dans 15 minutes.', cible: r.id });
  v('mais un autre délai, une autre occurrence, une autre personne sont d\'autres rappels', [!!e4, !!e5, !!S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT, uid: a.ana.id, avant: 15, titre: 'Point', texte: 'x', cible: r.id }), nNotifs(a.ben.id), nNotifs(a.ana.id)], [true, true, true, 3, 1]);
  const notif = S.notifListe(a.ben.id).find(x => x.type === 'reunion_rappel');
  v('la notification porte le titre, le texte et la réunion pour cible ; elle est lisible', [notif.titre, notif.texte !== '', notif.cible], ['Point', true, r.id]);
  v('⛔ une transaction qui échoue après le registre défait aussi la ligne du registre (rien n\'est « envoyé » sans sa notification)', (() => {
    const avant = compte(brut, 'SELECT COUNT(*) AS n FROM rappel');
    let faute = null;
    try { S.tx(() => { S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT + 2 * JOUR, uid: a.ben.id, avant: 5, titre: 'X', texte: 'Y', cible: r.id }); throw new Error('panne après le registre'); }); } catch (e) { faute = e.message; }
    return [faute, compte(brut, 'SELECT COUNT(*) AS n FROM rappel') - avant];
  })(), ['panne après le registre', 0]);
  const hasard = S.rappelsElaguer(DEBUT + JOUR);
  v('le registre ne grossit pas : on élague les occurrences passées (ici : deux lignes de l\'occurrence DEBUT, pas celle d\'une semaine plus tard)', [hasard, compte(brut, 'SELECT COUNT(*) AS n FROM rappel WHERE occurrence >= ?', DEBUT + JOUR)], [3, 1]);
  {
    const occ = DEBUT + 30 * JOUR, avant = nNotifs(a.ben.id);
    const plusieurs = S.rappelEnvoyer({ reunion: r.id, occurrence: occ, uid: a.ben.id, avants: [60, 15], titre: 'Point', texte: 'Commence dans 9 minutes.', cible: r.id });
    const encore = S.rappelEnvoyer({ reunion: r.id, occurrence: occ, uid: a.ben.id, avants: [60, 15], titre: 'Point', texte: 'x', cible: r.id });
    const un = S.rappelEnvoyer({ reunion: r.id, occurrence: occ, uid: a.ben.id, avant: 15, titre: 'Point', texte: 'x', cible: r.id });
    const partiel = S.rappelEnvoyer({ reunion: r.id, occurrence: occ, uid: a.ben.id, avants: [15, 5], titre: 'Point', texte: 'Commence dans 4 minutes.', cible: r.id });
    v('⛔ plusieurs délais échus (un arrêt les a laissés s\'accumuler) font UNE notification et sont TOUS notés ; les renvoyer ne crée rien ; un ensemble dont UN délai est neuf notifie (et le note) — deux notifications en tout, pas quatre',
      [!!plusieurs, S.rappelDejaEnvoye(r.id, occ, a.ben.id, 60), S.rappelDejaEnvoye(r.id, occ, a.ben.id, 15), encore, un, !!partiel, S.rappelDejaEnvoye(r.id, occ, a.ben.id, 5), nNotifs(a.ben.id) - avant], [true, true, true, null, null, true, true, 2]);
  }
  {
    const b = atelier(), T2 = b.S;
    const x = reunion(b, { prochain: DEBUT }), y = reunion(b, { prochain: DEBUT + 5 * JOUR, titre: 'Plus tard' }), z = reunion(b, { prochain: DEBUT + 1000, titre: 'Annulée' }), f = reunion(b, { prochain: null, titre: 'Finie' });
    T2.reunionAnnuler({ id: z.id, par: b.ana.id });
    T2.reunionRepondre({ id: x.id, uid: b.cleo.id, statut: 'decline' });
    v('⛔ ce que le planificateur lit : les réunions dont la prochaine occurrence commence avant la borne — ni les annulées, ni les finies, ni les trop lointaines', [T2.reunionsARappeler(DEBUT + JOUR), T2.reunionsARappeler(DEBUT + 6 * JOUR).sort()], [[x.id], [x.id, y.id].sort()]);
    const plan = T2.reunionPlanif(x.id);
    v('   et ses participants qui n\'ont pas décliné (Cleo a décliné : elle n\'est pas rappelée), avec leurs rappels (null = le réglage de la réunion)', [plan.participants.map(p => p.uid).sort(), plan.defaut, plan.participants.every(p => p.rappels === null), plan.titre, plan.prochain], [[b.ana.id, b.ben.id, b.dan.id].sort(), [15], true, 'Point hebdo TITRE-CANARI', DEBUT]);
    v('   un compte effacé n\'est pas rappelé (population : quatre invitations, un compte effacé, un décliné)', (() => { b.S.suppressionProgrammer(b.dan.id, b.h.t + 1); b.h.t += 10; b.S.compteEffacer(b.dan.id); return b.S.reunionPlanif(x.id).participants.map(p => p.uid).sort(); })(), [b.ana.id, b.ben.id].sort());
    void f;
    T2.fermer();
  }
  S.fermer();
}

async function effacementsRejoues() {
  console.log('\nLes effacements se REJOUENT sur une copie restaurée — et ce qui est arrivé APRÈS n\'est pas effacé');
  const lire = (chemin, sql, ...p) => { const d = new DatabaseSync(chemin, { readOnly: true }); try { return Number(d.prepare(sql).get(...p).n); } finally { d.close(); } };
  const copier = (src, nom) => { const dst = path.join(bac, nom + '-' + (++n) + '.db'); fs.copyFileSync(src, dst); return dst; };
  {
    const a = atelier(), S = a.S;
    const r = reunion(a);                                                                    // Ana (hôte), Ben, Cleo, Dan
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    const r2 = reunion(a, { titre: 'Autre', invites: [a.ben.id, a.cleo.id] });
    a.h.t += 1000;
    const avant = path.join(bac, 'avant-' + (++n) + '.db');
    await S.instantane(avant);                                                               // l'archive d'AVANT les effacements
    a.h.t += 5000; S.reunionRetirer({ id: r.id, par: a.ana.id, uid: a.cleo.id });           // Cleo retirée de la première
    a.h.t += 5000; S.reunionAnnuler({ id: r2.id, par: a.ana.id });                          // la seconde annulée
    const ap = registre(a.chemin);
    const copie = copier(avant, 'restauree');
    vrai('population : la copie d\'avant porte Cleo invitée à la première, la seconde active (non annulée), et deux conversations de réunion',
      lire(copie, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r.id, a.cleo.id) === 1 && lire(copie, 'SELECT annulee AS n FROM reunion WHERE id = ?', r2.id) === 0 && lire(copie, `SELECT COUNT(*) AS n FROM conversation WHERE type = 'reunion'`) === 2);
    const b1 = STOCK.ouvrir.copie.rejouerPurge(copie, ap);
    v('⛔ le registre rejoué : Cleo n\'est plus invitée (et plus membre de la conversation, par `groupe_membre`), la seconde réunion est ANNULÉE et sans prochaine occurrence, rien n\'est « ignoré »',
      [b1.invitesRetires, lire(copie, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r.id, a.cleo.id), lire(copie, 'SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', conv, a.cleo.id), b1.reunionsAnnulees, lire(copie, 'SELECT annulee AS n FROM reunion WHERE id = ?', r2.id), lire(copie, 'SELECT COUNT(*) AS n FROM reunion WHERE id = ? AND prochain IS NULL', r2.id), b1.ignorees],
      [1, 0, 0, 1, 1, 1, 0]);
    v('   les autres invités de la première sont intacts (l\'hôte, Ben, Dan)', lire(copie, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', r.id), 3);
    const b2 = STOCK.ouvrir.copie.rejouerPurge(copie, ap);
    v('⛔ rejouer deux fois ne change rien (idempotent)', [b2.invitesRetires, b2.reunionsAnnulees, b2.ajoutees], [0, 0, 0]);
    /* une invitation PLUS RÉCENTE que le retrait est une autre invitation */
    const cree = lire(avant, 'SELECT cree AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r.id, a.cleo.id);
    const reinvite = copier(avant, 'reinvite');
    const b3 = STOCK.ouvrir.copie.rejouerPurge(reinvite, ap.map(e => e.genre === 'reunion_invite' ? Object.assign({}, e, { quand: cree - 1 }) : e));
    v('⛔ une invitation plus RÉCENTE que le retrait est une autre invitation : le registre ne la retire pas', [b3.invitesRetires, lire(reinvite, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', r.id, a.cleo.id)], [0, 1]);
    S.fermer();
  }
  {
    /* la réunion SUPPRIMÉE : sa conversation est notée (genre `conversation`), la cascade emporte la réunion */
    const a = atelier(), S = a.S;
    const r = reunion(a, { titre: 'Supprimée', invites: [a.dan.id] });
    a.h.t += 1000;
    const avant = path.join(bac, 'avant-sup-' + (++n) + '.db');
    await S.instantane(avant);
    a.h.t += 5000;
    S.reunionSupprimer({ id: r.id, par: a.ana.id });
    const copie = copier(avant, 'sup');
    vrai('population : la copie d\'avant porte la réunion, ses deux invitations et sa conversation', lire(copie, 'SELECT COUNT(*) AS n FROM reunion WHERE id = ?', r.id) === 1 && lire(copie, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', r.id) === 2 && lire(copie, `SELECT COUNT(*) AS n FROM conversation WHERE type = 'reunion'`) === 1);
    const b4 = STOCK.ouvrir.copie.rejouerPurge(copie, registre(a.chemin));
    v('⛔ la réunion SUPPRIMÉE ne revient pas d\'une copie d\'avant : sa conversation part au rejeu (genre `conversation`), et la réunion et ses invitations avec elle (la cascade)',
      [b4.conversationsRetirees, lire(copie, 'SELECT COUNT(*) AS n FROM reunion WHERE id = ?', r.id), lire(copie, 'SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', r.id), lire(copie, `SELECT COUNT(*) AS n FROM conversation WHERE type = 'reunion'`)], [1, 0, 0, 0]);
    S.fermer();
  }
  {
    /* ── après la restauration : le bail copié et les rappels du passé ── */
    const c = atelier(); const rc = reunion(c);
    c.S.bailPrendre({ proprietaire: 'instance-copiee', ttlMs: 10 * 365 * JOUR });
    c.S.rappelEnvoyer({ reunion: rc.id, occurrence: DEBUT, uid: c.ben.id, avant: 15, titre: 'x', texte: 'y', cible: rc.id });
    const nom = path.join(bac, 'sinistre-' + (++n) + '.db');
    await c.S.instantane(nom);
    c.S.fermer();
    const t0 = 1790500000000;
    const ap = STOCK.ouvrir.copie.apresRestauration(nom, { horloge: () => t0 });
    const lu = () => { const d = new DatabaseSync(nom, { readOnly: true }); try { const meta = (k) => { const x = d.prepare('SELECT v FROM meta WHERE k = ?').get(k); return x ? x.v : null; }; return [Number(d.prepare('SELECT COUNT(*) AS n FROM planif_bail').get().n), meta('rappels_depuis'), meta('rejeu_service') !== null, Number(d.prepare('SELECT COUNT(*) AS n FROM rappel').get().n)]; } finally { d.close(); } };
    v('⛔ APRÈS UNE RESTAURATION : le bail copié est supprimé (il ne bloque pas le service restauré, une échéance de dix ans non plus), la date des rappels est posée (`rappels_depuis` : un rappel dont l\'échéance la précède est tenu pour traité), le registre des rappels est gardé, le drapeau du rejeu est levé',
      [ap.bails].concat(lu()), [1, 0, String(t0), true, 1]);
    const again = STOCK.ouvrir.copie.apresRestauration(nom, { horloge: () => t0 + 1000 });
    v('   rejouer cette étape ne casse rien (0 bail la seconde fois ; la date du dernier passage est gardée)', [again.bails, lu()[1]], [0, String(t0 + 1000)]);
    /* une archive d'AVANT les réunions (schéma 6) : aucune de ces tables */
    const vieille = neuf({ migrations: MIGRATIONS.filter(m => m.v <= 6) });
    vieille.S.fermer();
    const ap6 = STOCK.ouvrir.copie.apresRestauration(vieille.chemin, { horloge: () => t0 });
    v('⛔ une archive du schéma 6 (sans les tables des réunions) se restaure aussi : pas de bail à retirer, la date des rappels est posée quand même', [ap6.bails, ap6.sessions], [0, 0]);
    const b6 = STOCK.ouvrir.copie.rejouerPurge(vieille.chemin, [{ objet: 'r_x|p_y|1', genre: 'reunion_invite', quand: 1 }, { objet: 'r_x', genre: 'reunion_annulee', quand: 2 }]);
    v('   et rejouer les deux genres neufs sur elle ne casse rien (rien à retirer, mais la ligne du registre est recopiée)', [b6.invitesRetires, b6.reunionsAnnulees, b6.ignorees, b6.ajoutees], [0, 0, 0, 2]);
  }
}

function suiteEffacement() {
  console.log('\nUn compte effacé : hôte, la réunion passe au plus ancien invité qui n\'a pas décliné ; invité, sa ligne part');
  const efface = (w, p) => { w.S.suppressionProgrammer(p.id, w.h.t + 1000); w.h.t += 5000; return w.S.compteEffacer(p.id); };
  {
    const a = atelier(), S = a.S;
    const r = reunion(a);
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.dan.id, statut: 'accepte' });       // Dan, invité EN DERNIER, a accepté
    a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'decline' });       // Ben, invité en premier, a décliné ; Cleo reste en attente
    // Ordre attendu pour la relève : celui qui a ACCEPTÉ (Dan) avant le plus ancien non décliné (Cleo) ; jamais Ben (il a décliné).
    const avant = registre(a.chemin).length;
    const x = efface(a, a.ana);
    const vue = S.reunionPourMembre(r.id, a.dan.id);
    v('⛔ l\'hôte efface son compte : la réunion passe à celui qui a ACCEPTÉ (Dan, pourtant invité le dernier — avant Cleo, plus ancienne mais qui n\'a pas répondu), qui devient hôte et administrateur de la conversation ; Ben, qui a décliné, n\'est pas choisi',
      [x.effacee, vue.reunion.hote.id === a.dan.id, vue.moi.hote, S.convPourMembre(conv, a.dan.id).moi.role, vue.reunion.version], [true, true, true, 'admin', 1]);
    v('   l\'ancien hôte n\'est plus ni invité ni membre ; les autres restent, avec leurs réponses', [S.reunionPourMembre(r.id, a.ana.id), S.convPourMembre(conv, a.ana.id), statuts(S, r.id, a.dan.id)], [null, null, ['Dan:accepte', 'Ben:decline', 'Cleo:attente']]);
    v('⛔ son départ se NOTE : une ligne `reunion_invite` et une `groupe_membre` — et aucune ligne `conversation` (la réunion n\'est pas supprimée)',
      [registre(a.chemin).slice(avant).filter(e => e.genre === 'reunion_invite' || e.genre === 'groupe_membre' || e.genre === 'conversation').map(e => e.genre).sort()], [['groupe_membre', 'reunion_invite']]);
    v('   le nouvel hôte peut modifier, l\'ancien n\'a plus la main', [lance(() => S.reunionModifier({ id: r.id, par: a.dan.id, titre: 'Reprise' })), lance(() => S.reunionModifier({ id: r.id, par: a.ana.id, titre: 'Fantôme' }))], [null, 'interdit']);
    v('   le nouvel hôte est « accepte » (un hôte n\'a pas à répondre)', S.reunionPourMembre(r.id, a.dan.id).invites.find(i => i.hote).statut, 'accepte');
    S.fermer();
  }
  {
    /* personne n'a accepté : le plus ancien invité qui n'a pas décliné, DANS L'ORDRE où l'hôte les a invités (Ben d'abord, puis Cleo, puis Dan) */
    const a = atelier(), S = a.S;
    const r = reunion(a);
    a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'decline' });
    efface(a, a.ana);
    v('⛔ personne n\'a accepté : la réunion passe au plus ancien qui n\'a pas décliné, dans l\'ordre d\'invitation (Cleo : Ben a décliné)', S.reunionPourMembre(r.id, a.cleo.id).reunion.hote.id, a.cleo.id);
    S.fermer();
  }
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id, a.cleo.id] });
    a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'decline' });
    a.h.t += 1000; S.reunionRepondre({ id: r.id, uid: a.cleo.id, statut: 'decline' });
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    efface(a, a.ana);
    v('⛔ l\'hôte efface son compte et PERSONNE ne peut reprendre (tous ont décliné) : la réunion part avec sa conversation, et c\'est noté (genre `conversation`)',
      [a.brut().prepare('SELECT COUNT(*) AS n FROM reunion').get().n, a.brut().prepare('SELECT COUNT(*) AS n FROM conversation WHERE id = ?').get(conv).n, registre(a.chemin).filter(e => e.genre === 'conversation').map(e => e.objet)], [0, 0, [conv]]);
    S.fermer();
  }
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id] });
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    S.rappelEnvoyer({ reunion: r.id, occurrence: DEBUT, uid: a.ben.id, avant: 15, titre: 'x', texte: 'y', cible: r.id });
    S.courrierNoter({ uid: a.ben.id, destH: 'h'.repeat(64) });
    a.h.t += 1000;
    const avant = registre(a.chemin).length;
    efface(a, a.ben);
    v('⛔ un INVITÉ efface son compte : sa ligne part, il sort de la conversation, la réunion et l\'hôte restent', [statuts(S, r.id, a.ana.id), S.convPourMembre(conv, a.ben.id), S.reunionPourMembre(r.id, a.ana.id).moi.hote], [['Ana:accepte'], null, true]);
    v('   ses rappels envoyés et ses courriels comptés partent avec lui', [a.brut().prepare('SELECT COUNT(*) AS n FROM rappel WHERE uid = ?').get(a.ben.id).n, a.brut().prepare('SELECT COUNT(*) AS n FROM courrier_envoi WHERE uid = ?').get(a.ben.id).n], [0, 0]);
    v('   son départ se note (`reunion_invite`, `groupe_membre`)', registre(a.chemin).slice(avant).filter(e => e.genre === 'reunion_invite' || e.genre === 'groupe_membre').map(e => e.genre).sort(), ['groupe_membre', 'reunion_invite']);
    S.fermer();
  }

  console.log('\n⛔ LE REJEU D\'UN EFFACEMENT APRÈS UNE RESTAURATION NE RÉÉCRIT RIEN AU REGISTRE — quel que soit le cas (SERVEUR.md § 3.7.1, test-950 § 13 quinquies)');
  for (const cas of [
    { nom: 'hôte avec un successeur', hote: true, invites: ['ben', 'cleo'] },
    { nom: 'hôte sans successeur (la réunion part)', hote: true, invites: [] },
    { nom: 'invité', hote: false, invites: ['ben'] },
  ]) {
    const a = atelier(), S = a.S;
    const invites = cas.invites.map(p => a[p].id);
    const r = reunion(a, { invites: cas.hote ? invites : invites.concat([]) });
    a.h.t += 1000;
    const cible = cas.hote ? a.ana : a.ben;
    const avant = registre(a.chemin).length, lignesAvant = JSON.stringify(registre(a.chemin));
    const brut = a.brut();
    const reunionsAvant = compte(brut, 'SELECT COUNT(*) AS n FROM reunion');
    const rj = S.compteEffacer(cible.id, { rejeu: true });
    const apres = registre(a.chemin);
    v('⛔ ' + cas.nom + ' : le rejeu efface (' + (rj.effacee ? 'oui' : 'NON') + ') et n\'écrit AUCUNE ligne au registre', [rj.effacee, apres.length - avant, JSON.stringify(apres) === lignesAvant], [true, 0, true]);
    if (cas.hote && invites.length) v('   (population : la réunion a bien changé de mains — au PREMIER invité, dans l\'ordre où l\'hôte les a invités)', S.reunionPourMembre(r.id, a.ben.id).reunion.hote.id, a.ben.id);
    if (cas.hote && !invites.length) v('   (et la réunion est partie : population)', compte(brut, 'SELECT COUNT(*) AS n FROM reunion') - reunionsAvant, -1);
    const rj2 = S.compteEffacer(cible.id, { rejeu: true });
    v('   et le rejeu est idempotent : une personne déjà effacée ne perd rien de plus', [rj2.effacee, registre(a.chemin).length - avant], [false, 0]);
    S.fermer();
  }
  {
    /* le cas de la COPIE : après le rejeu hors ligne de `reunion_invite` et `groupe_membre`, l'hôte effacé est encore `hote` dans la réunion, sans ligne d'invitation ni appartenance — le service
       rejoue alors l'effacement et la réunion DOIT changer de mains */
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id, a.cleo.id] });
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    const brut = new DatabaseSync(a.chemin);
    brut.prepare('DELETE FROM reunion_invite WHERE reunion = ? AND uid = ?').run(r.id, a.ana.id);
    brut.prepare('UPDATE membre SET quitte_le = ? WHERE conv = ? AND uid = ?').run(a.h.t, conv, a.ana.id);
    brut.close();
    const rj = S.compteEffacer(a.ana.id, { rejeu: true });
    const vue = S.reunionPourMembre(r.id, a.ben.id);
    v('⛔ l\'hôte DÉJÀ sorti de la copie par le rejeu hors ligne (ni invitation, ni appartenance) est quand même remplacé au rejeu du service : la réunion n\'est pas laissée à un compte effacé',
      [rj.effacee, vue && vue.reunion.hote.id === a.ben.id, S.convPourMembre(conv, a.ben.id).moi.role], [true, true, 'admin']);
    S.fermer();
  }

  console.log('\nLes notifications d\'une réunion qui nomment son hôte s\'écrivent « Un compte supprimé » quand son compte s\'efface');
  {
    const a = atelier(), S = a.S;
    const types = ['reunion_invitation', 'reunion_modifiee', 'reunion_annulee'];
    for (const t of types) S.notifCreer({ uid: a.ben.id, type: t, titre: 'Point TITRE-DISTINCT', texte: 'Ana Test vous a invité à une réunion : mardi.', cible: 'r_x', auteur: a.ana.id });
    S.notifCreer({ uid: a.ben.id, type: 'reunion_rappel', titre: 'Point rappel', texte: 'Commence dans 15 minutes.', cible: 'r_x' });
    a.h.t += 1000;
    efface(a, a.ana);
    const lues = S.notifListe(a.ben.id);
    v('⛔ chaque notification d\'hôte est réécrite (ni son prénom ni son nom nulle part), le titre de la réunion reste ; le rappel n\'a pas d\'auteur et ne bouge pas',
      [lues.filter(x => types.includes(x.type)).map(x => x.type + ':' + x.texte).sort(), lues.some(x => /Ana/.test(x.texte + x.titre)), lues.find(x => x.type === 'reunion_rappel').texte, lues.filter(x => x.titre === 'Point TITRE-DISTINCT').length],
      [['reunion_annulee:Un compte supprimé a annulé une réunion.', 'reunion_invitation:Un compte supprimé vous a invité à une réunion.', 'reunion_modifiee:Un compte supprimé a modifié une réunion.'], false, 'Commence dans 15 minutes.', 3]);
    S.fermer();
  }

  console.log('\nL\'export des données d\'une personne porte ses réunions (titre, lieu, rôle, réponse)');
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id] });
    S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'peutetre' });
    const hote = S.exportReunions(a.ana.id), invite = S.exportReunions(a.ben.id);
    v('population : une réunion de chaque côté', [hote.length, invite.length], [1, 1]);
    v('⛔ l\'hôte et l\'invité retrouvent la réunion, chacun avec SON rôle et SA réponse ; un étranger n\'a rien', [hote[0].role, hote[0].reponse, invite[0].role, invite[0].reponse, hote[0].titre, invite[0].lieu, S.exportReunions(a.eli.id)], ['hote', 'accepte', 'invite', 'peutetre', 'Point hebdo TITRE-CANARI', 'Salle LIEU-CANARI', []]);
    S.fermer();
  }

  console.log('\nLe courriel d\'invitation : des plafonds DURABLES, comptés sur l\'empreinte du destinataire');
  {
    const a = neuf(), S = a.S;
    const ana = pers(S, 'Ana'), ben = pers(S, 'Ben');
    const H1 = 'a'.repeat(64), H2 = 'b'.repeat(64);
    const depuis = (t) => ({ compte: t - JOUR, destinataire: t - 7 * JOUR });
    S.courrierNoter({ uid: ana.id, destH: H1 }); a.h.t += 1000; S.courrierNoter({ uid: ana.id, destH: H1 }); a.h.t += 1000; S.courrierNoter({ uid: ana.id, destH: H2 }); S.courrierNoter({ uid: ben.id, destH: H1 });
    v('population : quatre envois notés', a.brut().prepare('SELECT COUNT(*) AS n FROM courrier_envoi').get().n, 4);
    v('⛔ par compte (sur 24 h) et par destinataire (sur 7 jours) : Ana a envoyé 3, H1 en a reçu 3 (deux d\'Ana, un de Ben), H2 un', [S.courrierCompter({ uid: ana.id, destH: H1, depuis: depuis(a.h.t) }), S.courrierCompter({ uid: ana.id, destH: H2, depuis: depuis(a.h.t) })], [{ compte: 3, destinataire: 3 }, { compte: 3, destinataire: 1 }]);
    a.h.t += 2 * JOUR;
    v('⛔ deux jours plus tard : le plafond du compte (24 h) est retombé à zéro, celui du destinataire (7 jours) court encore', S.courrierCompter({ uid: ana.id, destH: H1, depuis: depuis(a.h.t) }), { compte: 0, destinataire: 3 });
    v('⛔ DURABLE : un redémarrage du service ne remet pas les plafonds à zéro', (() => { S.fermer(); const re = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t }); try { return re.courrierCompter({ uid: ana.id, destH: H1, depuis: depuis(a.h.t) }); } finally { re.fermer(); } })(), { compte: 0, destinataire: 3 });
    const re2 = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t });
    a.h.t += 6 * JOUR;
    v('on élague ce qui est plus vieux que la semaine : le registre ne grossit pas (huit jours après les envois, les quatre lignes partent)', [re2.courrierElaguer(a.h.t - 7 * JOUR), a.brut().prepare('SELECT COUNT(*) AS n FROM courrier_envoi').get().n], [4, 0]);
    vrai('⛔ aucune adresse n\'est rangée : la table ne porte qu\'une empreinte', (() => { const cols = a.brut().prepare('PRAGMA table_info(courrier_envoi)').all().map(c => c.name); return cols.join() === 'id,uid,dest_h,ts'; })());
    re2.fermer();
  }

  console.log('\nLa charge d\'une notification de réunion est re-jugée à l\'instant de partir');
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id] });
    v('une réunion vivante, un invité vivant : valable ; sans occurrence, c\'est la seule existence qui compte', [S.reunionEncore({ id: r.id, uid: a.ben.id }), S.reunionEncore({ id: r.id, uid: a.ben.id, occurrence: DEBUT })], [true, true]);
    v('⛔ une occurrence qui a COMMENCÉ n\'est plus valable (un rappel dont le moment est passé ne part pas)', (() => { a.h.t = DEBUT + 1; return S.reunionEncore({ id: r.id, uid: a.ben.id, occurrence: DEBUT }); })(), false);
    a.h.t = DEBUT - 10 * MIN;
    S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'decline' });
    v('⛔ un invité qui décline n\'est plus rappelé', S.reunionEncore({ id: r.id, uid: a.ben.id, occurrence: DEBUT }), false);
    S.reunionRepondre({ id: r.id, uid: a.ben.id, statut: 'accepte' });
    S.reunionAnnuler({ id: r.id, par: a.ana.id });
    v('⛔ une réunion annulée non plus ; mais l\'existence seule reste vraie (pour dire « annulée »)', [S.reunionEncore({ id: r.id, uid: a.ben.id, occurrence: DEBUT }), S.reunionEncore({ id: r.id, uid: a.ben.id })], [false, true]);
    v('⛔ ni un étranger, ni une réunion inconnue', [S.reunionEncore({ id: r.id, uid: a.eli.id }), S.reunionEncore({ id: 'r_x', uid: a.ben.id })], [false, false]);
    S.fermer();
  }

  console.log('\nLa SOURDINE de la conversation coupe une MODIFICATION — jamais un rappel, jamais une annulation');
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id, a.cleo.id] });
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    S.membrePrefs({ conv, uid: a.ben.id, muet_jusqua: a.h.t + JOUR });
    v('population : Ben (en sourdine) et Cleo (sans) sont invités ; sans la sourdine demandée, la charge reste valable pour les deux (annulation, rappel)', [S.reunionEncore({ id: r.id, uid: a.ben.id }), S.reunionEncore({ id: r.id, uid: a.cleo.id })], [true, true]);
    v('⛔ une MODIFICATION (`sourdine: true`) n\'est plus valable pour Ben, qui l\'a coupée ; elle l\'est pour Cleo', [S.reunionEncore({ id: r.id, uid: a.ben.id, sourdine: true }), S.reunionEncore({ id: r.id, uid: a.cleo.id, sourdine: true })], [false, true]);
    v('⛔ un RAPPEL (une occurrence, aucune sourdine demandée) reste valable pour Ben : la sourdine ne coupe jamais un rappel qu\'il a lui-même choisi', S.reunionEncore({ id: r.id, uid: a.ben.id, occurrence: DEBUT }), true);
    a.h.t += JOUR + 1000;
    v('la sourdine échue ne coupe plus rien', S.reunionEncore({ id: r.id, uid: a.ben.id, sourdine: true }), true);
    S.membreRetirer({ conv, par: a.ana.id, uid: a.cleo.id });
    v('quelqu\'un qui n\'est plus membre de la conversation ne reçoit pas la modification (population : tout à l\'heure, avant son départ, elle lui était valable)', [S.reunionEncore({ id: r.id, uid: a.cleo.id, sourdine: true }), S.reunionEncore({ id: r.id, uid: a.ben.id, sourdine: true })], [false, true]);
    S.fermer();
  }

  console.log('\nLe laissez-passer des gardes R et H : la réunion, ma place, et rien de plus');
  {
    const a = atelier(), S = a.S;
    const r = reunion(a, { invites: [a.ben.id] });
    const conv = S.reunionPourMembre(r.id, a.ana.id).reunion.conv;
    v('l\'hôte et l\'invité : l\'identifiant, la conversation, qui je suis (hôte ou non), si elle est annulée, ma réponse — pas la liste des invités', [S.reunionAcces(r.id, a.ana.id), S.reunionAcces(r.id, a.ben.id)],
      [{ id: r.id, conv, hote: true, annulee: false, statut: 'accepte' }, { id: r.id, conv, hote: false, annulee: false, statut: 'attente' }]);
    v('⛔ un étranger et une réunion inconnue répondent la MÊME chose (`null`) : la garde en fait un 404 identique', [S.reunionAcces(r.id, a.eli.id), S.reunionAcces('r_' + '0'.repeat(32), a.ben.id)], [null, null]);
    S.reunionAnnuler({ id: r.id, par: a.ana.id });
    v('annulée : le laissez-passer le dit (la garde la laisse lire)', S.reunionAcces(r.id, a.ben.id).annulee, true);
    S.reunionRetirer({ id: r.id, par: a.ana.id, uid: a.ben.id });
    v('⛔ retiré : plus de laissez-passer (null), alors que la réunion existe toujours (population : l\'hôte passe)', [S.reunionAcces(r.id, a.ben.id), S.reunionAcces(r.id, a.ana.id) !== null], [null, true]);
    S.fermer();
  }
  fin();
}

effacementsRejoues().then(suiteEffacement).catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
