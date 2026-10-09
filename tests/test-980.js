/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À DEUX, LE STOCKAGE SEUL (famille 1 de SERVEUR.md § 3.11, étape 7).

   `server-msg/stockage.js` (la migration 8 et le bloc « appels ») monté avec le VRAI stockage — un fichier de base, une clé et une horloge injectés, qu'on AVANCE au geste (jamais un sommeil).
   Pas de HTTP ici : `test-981` joue les routes, `test-983` le service (le balayeur, les pushs, l'effacement et la restauration vécus), `test-905` les gardes. Celui-ci dit que ce qui est RANGÉ est juste :

     · la migration 8 est numérotée (la 7, celle des réunions, n'a pas bougé), n'ajoute que des tables, est rejouable, garde sa copie, et ses deux tables entrent dans les TROIS listes écrites à la main ;
     · un appel : deux participants (l'appelant a un appareil LIÉ dès le départ, l'appelé n'en a aucun), une sonnerie à ÉCHÉANCE, UN événement durable par participant à chaque changement d'état ;
     · ⛔ UNE PERSONNE N'EST QUE DANS UN APPEL : « occupée » se juge sur l'échéance (une sonnerie échue n'occupe plus personne, même avant que le balayeur l'ait écrite) ;
     · répondre LIE l'appareil ; le second appareil reçoit `appel_pris` ; l'appelant ne « répond » pas ; refuser, annuler, raccrocher, chacun à son état ; un appel fini ne change plus ;
     · ⛔ UN APPEL MANQUÉ FAIT UNE NOTIFICATION, UNE SEULE FOIS — et aucune d'un auteur bloqué ; la vue d'un appel rejoué en retard dit la FIN de l'appel ;
     · l'historique (bornes, filtre « manqués », rien de l'autre personne que son nom court), l'élagage, l'export ;
     · un compte effacé : ses appels se terminent, sa ligne part, l'autre garde l'appel sans nom ; le rejeu d'un effacement après une restauration ne réécrit rien ; la réparation du démarrage ;
     · une restauration ferme les appels qui sonnaient ou couraient, SANS notification.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const STOCK = require(path.join(T.SERVICE, 'stockage.js'));
const { ouvrir, MIGRATIONS } = STOCK;
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');

const SEC = 1000, MIN = 60000, JOUR = 86400000, SONNERIE = 45 * SEC;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-980-'));
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
const compte = (db, sql, ...p) => Number(db.prepare(sql).get(...p).n);
const jeton = () => crypto.randomBytes(16).toString('hex');
/* un atelier : Ana, Ben, Cleo, Dan (quatre personnes, Ana et Ben contacts), une horloge en main */
function atelier(opts = {}) {
  const a = neuf(opts), S = a.S;
  const ana = pers(S, 'Ana'), ben = pers(S, 'Ben'), cleo = pers(S, 'Cleo'), dan = pers(S, 'Dan');
  S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); S.contactLier(cleo.id, dan.id);
  return Object.assign(a, { ana, ben, cleo, dan, sa: jeton(), sb: jeton(), sb2: jeton(), sc: jeton() });
}
const lancer = (a, de, vers, type = 'audio', session) => a.S.appelCreer({ appelant: de.id, appele: vers.id, type, session: session || a.sa, sonnerieMs: SONNERIE });
const evenementsAppel = (S, uid) => S.evenementsPour(uid, 0, 1000).evenements.filter(e => e.event === 'appel');
const manques = (S, uid) => S.notifListe(uid, 50).filter(x => x.type === 'appel_manque');

console.log('La migration 8 : numérotée, rien que des tables, rejouable, avec sa copie, et ses deux tables dans les TROIS listes');
{
  const DERNIERE = MIGRATIONS[MIGRATIONS.length - 1].v;
  const celle = MIGRATIONS.filter(m => m.sql.some(s => /CREATE TABLE IF NOT EXISTS appel\(/.test(s)));
  v('population : UNE migration crée les appels, et elle suit toutes les précédentes', [celle.length, celle[0] && celle[0].v, MIGRATIONS.filter(m => m.v < (celle[0] || {}).v).length], [1, 8, 7]);
  vrai('elle est la HUITIÈME (les réunions sont la 7 et n\'ont pas bougé : aucune table d\'appel n\'y est rangée)', celle[0].v === 8 && MIGRATIONS.filter(m => m.v === 7).length === 1 && !MIGRATIONS.find(m => m.v === 7).sql.some(s => /CREATE TABLE IF NOT EXISTS appel(_part)?\(/.test(s)));
  vrai('les numéros se suivent sans trou (1 à ' + DERNIERE + ')', MIGRATIONS.map(m => m.v).join() === Array.from({ length: DERNIERE }, (_, i) => i + 1).join());
  vrai('elle crée les deux tables, et ne modifie aucune table qui existe (pas d\'ALTER : elle reste rejouable)', ['appel(', 'appel_part('].every(m => celle[0].sql.some(s => s.includes(m))) && !celle[0].sql.some(s => /^\s*ALTER\b/i.test(s)));
  const a = neuf();
  v('une base neuve est au schéma de la dernière migration', a.S.schema(), DERNIERE);
  const brut = a.brut();
  const tables = brut.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map(r => r.name);
  vrai('les deux tables existent', ['appel', 'appel_part'].every(t => tables.includes(t)));
  const sqlTable = brut.prepare(`SELECT sql FROM sqlite_master WHERE name = 'appel'`).get().sql;
  vrai('l\'état est borné par la base elle-même (CHECK) : sonne, en_cours, fini, manque, refuse, annule, occupe', ['sonne', 'en_cours', 'fini', 'manque', 'refuse', 'annule', 'occupe'].every(e => sqlTable.includes("'" + e + "'")));
  brut.close();
  const deux = ['appel', 'appel_part'];
  v('⛔ les TROIS listes écrites à la main nomment les deux : TABLES_COMPTEES, la sonde de la base vivante, le comptage de la copie',
    [deux.filter(t => !STOCK.ouvrir.copie.TABLES_COMPTEES.includes(t)), deux.filter(t => !(t in a.S.sonde().nonVides)), deux.filter(t => !(t in (STOCK.ouvrir.copie.controlerFichier(a.chemin).lignes || {})))], [[], [], []]);

  /* ⛔ LA BASE EN SERVICE : au schéma 7 (les réunions, sur la bêta). Elle reçoit la 8 et RIEN de ce qu'elle porte ne bouge — et une copie « avant-v8 » est gardée avant de la toucher. */
  /* Une base « du schéma 7 » comme celle qui est en service : le module d'AUJOURD'HUI n'en sait plus fabriquer (il écrit `reunion.attente`, une colonne de la migration 9). On la RETROGRADE donc : une base à jour
     qui a vécu (un contact, une réunion), à laquelle on retire ce que les migrations 8 et 9 ont ajouté. Que le code d'AVANT tourne sur la base d'APRÈS est gardé par `test-986`, dans l'autre sens. */
  const g = neuf();
  const gAna = pers(g.S, 'Ana'), gBen = pers(g.S, 'Ben');
  g.S.contactLier(gAna.id, gBen.id);
  const debutR = 1790000000000 + 2 * JOUR;
  const gR = g.S.reunionCreer({ hote: gAna.id, titre: 'Avant la 8', lieu: '', debut: debutR, fin: debutR + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [gBen.id], prochain: debutR }).id;
  const avant7 = [g.S.contactsDe(gAna.id).length, g.S.reunionPourMembre(gR, gBen.id).reunion.titre];
  g.S.fermer();
  const br7 = g.brut();
  br7.exec('DROP TABLE IF EXISTS appel_part; DROP TABLE IF EXISTS appel; DROP INDEX IF EXISTS reunion_code;');
  for (const c of ['attente', 'code_h', 'code_ch', 'code_le']) br7.exec('ALTER TABLE reunion DROP COLUMN ' + c);
  br7.exec('PRAGMA user_version = 7');
  const sansAppel7 = compte(br7, `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'appel'`);
  const pop7 = [Number(br7.prepare('PRAGMA user_version').get().user_version)].concat(avant7);
  br7.close();
  v('population : une base du schéma 7, sans appel, avec un contact et une réunion', [pop7, sansAppel7], [[7, 1, 'Avant la 8'], 0]);
  const g8 = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t });
  v('⛔ rouverte avec la migration 8 : schéma ' + DERNIERE + ', le contact et la réunion sont intacts', [g8.schema(), g8.contactsDe(gAna.id).length, g8.reunionPourMembre(gR, gBen.id).reunion.titre], [DERNIERE, 1, 'Avant la 8']);
  vrai('⛔ une copie « avant-v8 » est gardée avant de migrer une base qui a vécu — et PAS de « avant-v7 » (la 7 était déjà faite)', fs.existsSync(g.chemin + '.avant-v8') && !fs.existsSync(g.chemin + '.avant-v7'));
  const cop = new DatabaseSync(g.chemin + '.avant-v8');
  v('la copie est la base d\'AVANT : schéma 7, sans la table des appels', [cop.prepare('PRAGMA user_version').get().user_version, compte(cop, `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'appel'`)], [7, 0]);
  cop.close();
  const gC = pers(g8, 'Cleo');
  g8.contactLier(gAna.id, gC.id);
  const r = g8.appelCreer({ appelant: gAna.id, appele: gC.id, type: 'audio', session: jeton(), sonnerieMs: SONNERIE });
  v('… et un appel se lance sur cette base migrée', g8.appelVue(gC.id, r.id).etat, 'sonne');
  g8.fermer();
  const re = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t });
  v('⛔ la migration REJOUÉE sur une base déjà migrée ne perd rien (l\'appel, la réunion)', [re.schema(), re.appelVue(gC.id, r.id).etat, re.reunionPourMembre(gR, gBen.id).reunion.titre], [DERNIERE, 'sonne', 'Avant la 8']);
  re.fermer();
}

console.log('\nLancer un appel : deux participants, un appareil lié (celui de l\'appelant), une échéance, un événement durable chacun');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben, 'video');
  v('un identifiant a_… de 32 hexadécimaux, l\'état « sonne », pas occupé, aucune notification', [/^a_[0-9a-f]{32}$/.test(r.id), r.vue.etat, r.occupe, r.notif], [true, 'sonne', false, null]);
  const vueA = S.appelVue(a.ana.id, r.id), vueB = S.appelVue(a.ben.id, r.id);
  v('la vue de l\'appelante : sortante, vidéo, Ben en face, échéance à +45 s, appareil lié, pas de réponse, pas de fin', [vueA.sens, vueA.type, vueA.autre.prenom, vueA.sonne_jusqua - vueA.debut, vueA.lie, vueA.repondu, vueA.fin, vueA.manque], ['sortant', 'video', 'Ben', SONNERIE, true, null, null, false]);
  v('la vue de l\'appelé : entrante, Ana en face, AUCUN appareil lié (il n\'a pas répondu)', [vueB.sens, vueB.autre.prenom, vueB.lie, vueB.manque], ['entrant', 'Ana', false, false]);
  v('une vue ne porte QUE ces champs (jamais une adresse réseau, une empreinte de session ni une conversation)', Object.keys(vueA).sort(), ['autre', 'debut', 'duree_s', 'etat', 'fin', 'genre', 'id', 'lie', 'manque', 'motif', 'repondu', 'rev', 'sens', 'sonne_jusqua', 'type']);
  v('   et c\'est « deux » : le genre d\'un appel à deux ne change pas avec l\'étape 8 (les appels à plusieurs et les salles ont `test-986` à `test-989`)', vueA.genre, 'deux');
  v('⛔ la personne qui n\'y est pas ne la voit pas : vue nulle, laissez-passer nul (la garde répondra 404, comme pour un appel qui n\'existe pas)', [S.appelVue(a.cleo.id, r.id), S.appelAcces(r.id, a.cleo.id), S.appelAcces('a_' + '0'.repeat(32), a.ana.id)], [null, null, null]);
  const acces = S.appelAcces(r.id, a.ana.id);
  v('le laissez-passer de la garde : mon rôle, l\'empreinte de MA session liée, l\'autre participant, l\'échéance', [acces.role, acces.session, acces.autre === a.ben.id, acces.etat], ['appelant', a.sa, true, 'sonne']);
  v('celui de l\'appelé : sans session liée', [S.appelAcces(r.id, a.ben.id).role, S.appelAcces(r.id, a.ben.id).session], ['appele', null]);
  const eA = evenementsAppel(S, a.ana.id), eB = evenementsAppel(S, a.ben.id);
  v('⛔ UN événement durable par participant, et personne d\'autre', [eA.length, eB.length, evenementsAppel(S, a.cleo.id).length], [1, 1, 0]);
  v('   il porte la vue de CELUI qui le reçoit (sortante pour Ana, entrante pour Ben)', [eA[0].data.sens, eB[0].data.sens, eA[0].data.id === r.id], ['sortant', 'entrant', true]);
  v('population : une ligne d\'appel existe, et elle ne porte AUCUN texte libre (pas de motif tant que l\'appel n\'est pas fini : que des états et des dates)', [compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel'), compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel WHERE motif IS NOT NULL')], [1, 0]);
  v('l\'appel qui sonne est « actif » pour les deux, pas pour les autres', [S.appelActifDe(a.ana.id) === r.id, S.appelActifDe(a.ben.id) === r.id, S.appelActifDe(a.cleo.id)], [true, true, null]);
  v('   et il n\'est PAS dans l\'historique (qui ne garde que les appels finis)', [S.appelsListe(a.ana.id).length, S.appelActifVue(a.ana.id).id === r.id], [0, true]);
  const avantType = compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel');
  vrai('⛔ les types sont audio et vidéo, rien d\'autre : la BASE refuse un « visio » (CHECK), et rien n\'est écrit', lance(() => S.appelCreer({ appelant: a.cleo.id, appele: a.dan.id, type: 'visio', session: jeton(), sonnerieMs: SONNERIE })) !== null && compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel') === avantType);
}

console.log('\n⛔ Une personne n\'est que dans UN appel : occupée, et occupe_moi — jugé sur l\'échéance, pas sur l\'état');
{
  const a = atelier(), S = a.S;
  const r1 = lancer(a, a.ana, a.ben);
  const r2 = S.appelCreer({ appelant: a.cleo.id, appele: a.ben.id, type: 'audio', session: a.sc, sonnerieMs: SONNERIE });
  v('Cleo appelle Ben, déjà en ligne : l\'appel est écrit « occupé » d\'emblée (sans sonner), fin = maintenant', [r2.occupe, r2.vue.etat, r2.vue.fin === r2.vue.debut], [true, 'occupe', true]);
  const vb = S.appelVue(a.ben.id, r2.id);
  v('   Ben le lit « manqué » (entrant, non pris) ; Cleo, elle, n\'a rien d\'actif', [vb.manque, vb.sens, S.appelActifDe(a.cleo.id)], [true, 'entrant', null]);
  v('   Ben en reçoit UNE notification « appel manqué », et Ana (qui l\'appelle) n\'a pas été dérangée', [manques(S, a.ben.id).length, manques(S, a.ben.id)[0].texte, manques(S, a.ana.id).length], [1, 'Cleo Test vous a appelé.', 0]);
  v('⛔ l\'appel occupé ne tient PERSONNE : Ben n\'est toujours que dans l\'appel d\'Ana', [S.appelActifDe(a.ben.id) === r1.id, S.appelActifDe(a.cleo.id)], [true, null]);
  v('⛔ occupe_moi : celle qui est déjà dans un appel n\'en lance pas un second (rien n\'est écrit)', [lance(() => lancer(a, a.ana, a.cleo)), S.appelsActifs().length], ['occupe_moi', 1]);
  v('   Ben, qui répond à Ana, est aussi « occupé » pour ses propres appels sortants', lance(() => S.appelCreer({ appelant: a.ben.id, appele: a.cleo.id, type: 'audio', session: a.sb, sonnerieMs: SONNERIE })), 'occupe_moi');
  /* la sonnerie ÉCHUE n'occupe plus personne, même avant que le balayeur l'ait écrite « manqué » */
  a.h.t += SONNERIE + 1;
  v('⛔ la sonnerie d\'Ana est échue : ELLE ET BEN SONT LIBRES, bien que la ligne soit encore « sonne » (le balayeur n\'est pas passé)', [S.appelActifDe(a.ana.id), S.appelActifDe(a.ben.id), a.brut().prepare('SELECT etat FROM appel WHERE id = ?').get(r1.id).etat], [null, null, 'sonne']);
  const r3 = lancer(a, a.cleo, a.ben);
  v('   et Cleo joint Ben : elle SONNE (pas « occupé »)', [r3.occupe, r3.vue.etat], [false, 'sonne']);
}

console.log('\nRépondre : l\'appareil qui répond est LIÉ, le second reçoit appel_pris, l\'appelante ne « répond » pas');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben);
  v('⛔ l\'appelante ne répond pas à son propre appel (interdit) ; un étranger non plus (introuvable)', [lance(() => S.appelRepondre({ id: r.id, uid: a.ana.id, session: a.sa, accepte: true })), lance(() => S.appelRepondre({ id: r.id, uid: a.cleo.id, session: a.sc, accepte: true }))], ['interdit', 'introuvable']);
  /* ⛔ `rev`, la VERSION de la vue — l'appel à deux la porte depuis le 9 octobre 2026 au soir, comme la salle (`test-986`) : une vue « sonne » lue avant la réponse et rendue après elle remettait à l'écran
     en sonnerie un appel qui court. C'est le DERNIER événement `appel` de CETTE personne pour CET appel — jamais le compteur global (`gidVisible`) ; une fin vaut 0 (elle ne se périme pas). */
  const derA = () => evenementsAppel(S, a.ana.id).filter(e => e.data.id === r.id).slice(-1)[0], derB = () => evenementsAppel(S, a.ben.id).filter(e => e.data.id === r.id).slice(-1)[0];
  const sonneA = S.appelVue(a.ana.id, r.id), sonneB = S.appelVue(a.ben.id, r.id);
  v('⛔ « rev » d\'un appel qui sonne : l\'identifiant du dernier événement de CET appel adressé à CETTE personne (Ana, Ben : chacun le sien)', [sonneA.rev, sonneB.rev, sonneA.rev !== sonneB.rev], [derA().gid, derB().gid, true]);
  vrai('… jamais le compteur global du journal : aucun ne dépasse ce que la personne a le droit de connaître', sonneA.rev > 0 && sonneA.rev <= S.gidVisible(a.ana.id) && sonneB.rev <= S.gidVisible(a.ben.id));
  a.h.t += 7 * SEC;
  const rep = S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb, accepte: true });
  const coursA = S.appelVue(a.ana.id, r.id);
  v('⛔ la vue lue APRÈS la réponse a un « rev » plus grand (la page ne remplace jamais une vue par une plus petite), et c\'est l\'événement que le flux d\'Ana lui apporte pour ce geste',
    [coursA.etat, coursA.rev > sonneA.rev, coursA.rev, rep.vue.rev === derB().gid], ['en_cours', true, derA().gid, true]);
  v('Ben répond depuis son téléphone : « en cours », l\'appareil est LIÉ, l\'heure de réponse est maintenant', [rep.etat, rep.deja, rep.vue.lie, rep.vue.repondu === a.h.t, S.appelAcces(r.id, a.ben.id).session], ['en_cours', false, true, true, a.sb]);
  v('chacun reçoit un événement de plus (deux au total : lancé, répondu)', [evenementsAppel(S, a.ana.id).length, evenementsAppel(S, a.ben.id).length], [2, 2]);
  const avant = evenementsAppel(S, a.ben.id).length;
  const encore = S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb, accepte: true });
  v('le MÊME appareil qui répond deux fois reçoit la même vue (`deja`) sans rien écrire', [encore.deja, encore.vue.etat, evenementsAppel(S, a.ben.id).length], [true, 'en_cours', avant]);
  v('⛔ un SECOND appareil de Ben reçoit `appel_pris` (il ne vole pas l\'appel), et refuser non plus', [lance(() => S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb2, accepte: true })), lance(() => S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb2, accepte: false }))], ['appel_pris', 'appel_pris']);
  v('   l\'appareil lié reste le premier', S.appelAcces(r.id, a.ben.id).session, a.sb);
  /* refuser : l'appel finit pour tous les appareils de l'appelé */
  const r2 = lancer(a, a.cleo, a.dan, 'audio', a.sc);
  const ref = S.appelRepondre({ id: r2.id, uid: a.dan.id, session: jeton(), accepte: false });
  v('Dan refuse : « refusé » pour les deux, fin maintenant, aucun appareil lié chez lui, PAS « manqué » pour lui, aucune notification', [ref.etat, S.appelVue(a.dan.id, r2.id).etat, S.appelVue(a.cleo.id, r2.id).etat, S.appelVue(a.dan.id, r2.id).manque, S.appelVue(a.dan.id, r2.id).lie, manques(S, a.dan.id).length, manques(S, a.cleo.id).length], ['refuse', 'refuse', 'refuse', false, false, 0, 0]);
  v('⛔ un appel fini ne se répond plus : `appel_fini` (même si l\'appelé réessaie avec son appareil)', lance(() => S.appelRepondre({ id: r2.id, uid: a.dan.id, session: jeton(), accepte: true })), 'appel_fini');
  /* répondre APRÈS l'échéance : la sonnerie est échue, on ne la prend plus */
  const r3 = lancer(a, a.dan, a.cleo, 'audio', jeton());
  a.h.t += SONNERIE + 1;
  v('⛔ répondre à une sonnerie ÉCHUE (avant que le balayeur l\'ait écrite) : `appel_fini`', lance(() => S.appelRepondre({ id: r3.id, uid: a.cleo.id, session: jeton(), accepte: true })), 'appel_fini');
}

console.log('\nRaccrocher, annuler, refuser : l\'état qui convient à l\'état et au rôle, et le geste est sans effet une fois fini');
{
  const a = atelier(), S = a.S;
  /* annuler pendant la sonnerie : l'appelé l'a MANQUÉ, une notification, une fois */
  const r = lancer(a, a.ana, a.ben, 'video');
  a.h.t += 9 * SEC;
  const q = S.appelQuitter({ id: r.id, uid: a.ana.id, session: a.sa });
  v('Ana annule avant la réponse : « annulé » ; Ben l\'a manqué (entrant, non pris) et en est prévenu UNE fois', [q.etat, S.appelVue(a.ben.id, r.id).etat, S.appelVue(a.ben.id, r.id).manque, manques(S, a.ben.id).length, manques(S, a.ben.id)[0].texte, !!q.notif], ['annule', 'annule', true, 1, 'Ana Test vous a appelé en vidéo.', true]);
  v('⛔ une vue d\'appel FINI vaut « rev » 0 (une fin ne se périme pas : la page l\'applique toujours) — population : la vue existe, des deux côtés', [S.appelVue(a.ana.id, r.id).rev, S.appelVue(a.ben.id, r.id).rev, S.appelVue(a.ben.id, r.id).etat], [0, 0, 'annule']);
  v('   la notification vise l\'appel (cible), et Ana n\'en reçoit aucune', [manques(S, a.ben.id)[0].cible === r.id, S.notifListe(a.ben.id, 5)[0].type, manques(S, a.ana.id).length], [true, 'appel_manque', 0]);
  const avant = [evenementsAppel(S, a.ben.id).length, manques(S, a.ben.id).length];
  const q2 = S.appelQuitter({ id: r.id, uid: a.ana.id, session: a.sa });
  v('⛔ raccrocher un appel DÉJÀ fini : `deja`, rien d\'écrit — ni événement ni notification de plus', [q2.deja, evenementsAppel(S, a.ben.id).length, manques(S, a.ben.id).length], [true, avant[0], avant[1]]);
  v('Ana voit son appel dans l\'historique (sortant, annulé), Ben dans « manqués »', [S.appelsListe(a.ana.id)[0].etat, S.appelsListe(a.ana.id)[0].sens, S.appelsListe(a.ben.id, { manques: true }).length, S.appelsListe(a.ana.id, { manques: true }).length], ['annule', 'sortant', 1, 0]);

  /* refuser en quittant (l'appelé qui n'a pas répondu) */
  a.h.t += SEC;
  const r2 = lancer(a, a.ana, a.ben);
  const q3 = S.appelQuitter({ id: r2.id, uid: a.ben.id, session: jeton() });
  v('Ben « quitte » sans avoir répondu : c\'est un REFUS (« refusé »), sans notification pour Ana', [q3.etat, manques(S, a.ana.id).length], ['refuse', 0]);

  /* raccrocher pendant l'appel : « fini » avec sa durée (une seconde plus tard : l'historique se trie par date de lancement, deux appels de la même milliseconde se départageraient au hasard de leur identifiant) */
  a.h.t += SEC;
  const r3 = lancer(a, a.ana, a.ben);
  a.h.t += 3 * SEC;
  S.appelRepondre({ id: r3.id, uid: a.ben.id, session: a.sb, accepte: true });
  a.h.t += 125 * SEC;
  v('⛔ un autre appareil d\'Ana (une session valide, mais pas celle de l\'appel) ne raccroche pas : `appareil_non_lie`', lance(() => S.appelQuitter({ id: r3.id, uid: a.ana.id, session: jeton() })), 'appareil_non_lie');
  v('   ni un autre appareil de Ben', lance(() => S.appelQuitter({ id: r3.id, uid: a.ben.id, session: a.sb2 })), 'appareil_non_lie');
  const q4 = S.appelQuitter({ id: r3.id, uid: a.ben.id, session: a.sb });
  v('Ben raccroche depuis l\'appareil lié : « fini », durée 125 s, pas « manqué », aucune notification', [q4.etat, S.appelVue(a.ana.id, r3.id).duree_s, S.appelVue(a.ana.id, r3.id).etat, S.appelVue(a.ben.id, r3.id).manque, manques(S, a.ana.id).length, manques(S, a.ben.id).length], ['fini', 125, 'fini', false, 0, 1]);
  v('⛔ un étranger ne raccroche rien (introuvable)', lance(() => S.appelQuitter({ id: r3.id, uid: a.cleo.id, session: a.sc })), 'introuvable');
  v('l\'historique d\'Ana : trois appels finis, le plus récent d\'abord, rien d\'actif', [S.appelsListe(a.ana.id).map(x => x.etat), S.appelActifDe(a.ana.id)], [['fini', 'refuse', 'annule'], null]);
}

console.log('\n⛔ Une sonnerie échue fait UN appel manqué, UNE fois (balayeur : appelsEchoir)');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben);
  v('avant l\'échéance : rien à échoir', S.appelsEchoir(a.h.t + SONNERIE - 1), []);
  a.h.t += SONNERIE;
  const f1 = S.appelsEchoir(a.h.t);
  v('à l\'échéance PILE : l\'appel passe « manqué », l\'appelé a UNE notification, fin = l\'échéance', [f1.length, f1[0].id === r.id, S.appelVue(a.ben.id, r.id).etat, S.appelVue(a.ben.id, r.id).fin - S.appelVue(a.ben.id, r.id).debut, manques(S, a.ben.id).length, !!f1[0].notif], [1, true, 'manque', SONNERIE, 1, true]);
  v('   Ben le lit « manqué », Ana « manqué » sans le rouge (c\'est elle qui appelait), et chacun a un événement de plus', [S.appelVue(a.ben.id, r.id).manque, S.appelVue(a.ana.id, r.id).manque, evenementsAppel(S, a.ana.id).length, evenementsAppel(S, a.ben.id).length], [true, false, 2, 2]);
  a.h.t += 10 * SEC;
  const avant = [evenementsAppel(S, a.ben.id).length, manques(S, a.ben.id).length];
  v('⛔ un SECOND passage (ou un redémarrage, ou un second balayeur) ne refait RIEN : ni passage, ni événement, ni notification', [S.appelsEchoir(a.h.t), evenementsAppel(S, a.ben.id).length, manques(S, a.ben.id).length], [[], avant[0], avant[1]]);
  /* plusieurs échéances en un passage */
  const r2 = lancer(a, a.cleo, a.dan, 'video', a.sc), r3 = lancer(a, a.ana, a.ben, 'audio', a.sa);
  a.h.t += SONNERIE + 5;
  const f2 = S.appelsEchoir(a.h.t);
  v('population : deux sonneries échues en un passage → deux appels manqués, une notification chacun', [f2.map(x => x.id).sort(), [manques(S, a.dan.id).length, manques(S, a.ben.id).length]], [[r2.id, r3.id].sort(), [1, 2]]);
  vrai('   le type vidéo se lit dans le texte de la notification de Dan', manques(S, a.dan.id)[0].texte === 'Cleo Test vous a appelé en vidéo.');
}

console.log('\nRien d\'un auteur bloqué : un appel manqué ne fait AUCUNE notification (ni de l\'un à l\'autre, ni dans l\'autre sens)');
{
  const a = atelier(), S = a.S;
  S.contactEtat(a.ben.id, a.ana.id, 'bloque');           // Ben a bloqué Ana
  const r = lancer(a, a.ana, a.ben);
  a.h.t += SONNERIE;
  const f = S.appelsEchoir(a.h.t);
  v('population : la sonnerie est échue (un appel manqué)', [f.length, S.appelVue(a.ben.id, r.id).etat], [1, 'manque']);
  v('⛔ mais Ben, qui a bloqué Ana, n\'a AUCUNE notification d\'elle', [manques(S, a.ben.id).length, f[0].notif], [0, null]);
  const b = atelier(), S2 = b.S;
  S2.contactEtat(b.ana.id, b.ben.id, 'bloque');           // Ana a bloqué Ben : Ben appelle Ana (la route le refuse ; le stockage, lui, ne notifie pas)
  const r2 = S2.appelCreer({ appelant: b.ben.id, appele: b.ana.id, type: 'audio', session: b.sb, sonnerieMs: SONNERIE });
  b.h.t += SONNERIE; S2.appelsEchoir(b.h.t);
  v('   et dans l\'autre sens aussi (Ana a bloqué Ben, qui l\'appelle) : l\'appel est manqué, aucune notification pour elle', [S2.appelVue(b.ana.id, r2.id).etat, manques(S2, b.ana.id).length], ['manque', 0]);
}

console.log('\nL\'événement durable rejoué en RETARD dit la fin de l\'appel, pas une sonnerie fantôme');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben);
  const gidSonnerie = evenementsAppel(S, a.ben.id)[0].gid;
  a.h.t += 4 * SEC;
  S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb, accepte: true });
  a.h.t += 60 * SEC;
  S.appelQuitter({ id: r.id, uid: a.ana.id, session: a.sa });
  const rejoue = S.evenementsPour(a.ben.id, gidSonnerie - 1, 1000).evenements.filter(e => e.event === 'appel');
  v('population : les trois événements de Ben sont rejoués depuis le premier (lancé, répondu, raccroché)', rejoue.length, 3);
  v('⛔ chacun porte la vue d\'AUJOURD\'HUI (fini, 60 s) : rejouer « sonne » après coup ne ferait pas sonner un téléphone', rejoue.map(e => [e.data.etat, e.data.duree_s]), [['fini', 60], ['fini', 60], ['fini', 60]]);
  const apres = S.appelsElaguer(a.h.t + 400 * JOUR);
  v('l\'élagage emporte l\'appel fini (population : 1), ses participants avec, et les événements qui le portaient ne livrent plus rien', [apres, compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel_part'), S.evenementsPour(a.ben.id, gidSonnerie - 1, 1000).evenements.filter(e => e.event === 'appel').length], [1, 0, 0]);
}

console.log('\nL\'historique : les appels finis, du plus récent, bornés ; le filtre « manqués » ; rien de l\'autre que son nom court');
{
  const a = atelier(), S = a.S;
  const ids = [];
  for (let i = 0; i < 6; i++) {
    const r = lancer(a, a.ana, a.ben, i % 2 ? 'video' : 'audio', jeton());
    a.h.t += 2 * SEC;
    if (i % 3 === 0) { S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb, accepte: true }); a.h.t += (i + 1) * 10 * SEC; S.appelQuitter({ id: r.id, uid: a.ben.id, session: a.sb }); }
    else if (i % 3 === 1) S.appelQuitter({ id: r.id, uid: a.ana.id, session: S.appelAcces(r.id, a.ana.id).session });
    else { a.h.t += SONNERIE; S.appelsEchoir(a.h.t); }
    ids.push(r.id);
    a.h.t += 1000;
  }
  const liste = S.appelsListe(a.ben.id);
  v('population : six appels finis dans l\'historique de Ben, du plus récent au plus ancien', [liste.length, liste.map(x => x.id).join() === ids.slice().reverse().join()], [6, true]);
  v('états : fini, annulé, manqué, fini, annulé, manqué (dans l\'ordre du lancement)', liste.slice().reverse().map(x => x.etat), ['fini', 'annule', 'manque', 'fini', 'annule', 'manque']);
  v('⛔ « manqués » : seulement les ENTRANTS non pris (annulé et manqué), jamais un appel pris', [S.appelsListe(a.ben.id, { manques: true }).map(x => x.etat).sort(), S.appelsListe(a.ben.id, { manques: true }).every(x => x.sens === 'entrant' && x.manque)], [['annule', 'annule', 'manque', 'manque'], true]);
  v('   Ana, qui a lancé les six, n\'a aucun « manqué » (ses appels sortants ne le sont jamais)', S.appelsListe(a.ana.id, { manques: true }).length, 0);
  v('la limite borne la liste (1 à 500)', [S.appelsListe(a.ben.id, { limite: 2 }).length, S.appelsListe(a.ben.id, { limite: 0 }).length, S.appelsListe(a.ben.id, { limite: 100000 }).length], [2, 1, 6]);
  v('la durée d\'un appel pris se lit (fini à +10 s, +40 s) ; un appel non abouti dure 0', [liste.slice().reverse().filter(x => x.etat === 'fini').map(x => x.duree_s), liste.filter(x => x.etat !== 'fini').every(x => x.duree_s === 0)], [[10, 40], true]);
  const e = S.exportAppels(a.ben.id);
  v('l\'export de Ben : six lignes {id, date, type, sens, etat, duree_s, avec_id} — l\'identifiant de l\'autre, jamais son nom', [e.length, Object.keys(e[0]).sort(), e[0].avec_id === a.ana.id, JSON.stringify(e).includes('Ana')], [6, ['avec_id', 'date', 'duree_s', 'etat', 'groupe', 'id', 'sens', 'type'], true, false]);
}

console.log('\nUn blocage coupe l\'appel qui court ou qui sonne entre les deux personnes (appelsFinirEntre)');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben);
  const r2 = lancer(a, a.cleo, a.dan, 'audio', a.sc);
  a.h.t += 3 * SEC;
  S.appelRepondre({ id: r2.id, uid: a.dan.id, session: jeton(), accepte: true });
  S.contactEtat(a.ben.id, a.ana.id, 'bloque');           // c'est ainsi que la route procède : le blocage est écrit, PUIS l'appel est coupé
  const reveil = S.appelsFinirEntre(a.ana.id, a.ben.id);
  v('Ana et Ben : l\'appel qui sonnait est fini (annulé, motif « bloque »), les deux sont à réveiller ; celui de Cleo et Dan ne bouge pas', [S.appelVue(a.ana.id, r.id).etat, S.appelVue(a.ana.id, r.id).motif, reveil.sort(), S.appelVue(a.cleo.id, r2.id).etat], ['annule', 'bloque', [a.ana.id, a.ben.id].sort(), 'en_cours']);
  v('⛔ Ben, qui a bloqué Ana, n\'a AUCUNE notification d\'appel manqué d\'elle (la coupure par blocage ne fait pas sonner l\'alerte d\'une personne bloquée)', [manques(S, a.ben.id).length, S.appelVue(a.ben.id, r.id).manque], [0, true]);
  v('rejouable : sans appel actif entre eux, rien à faire', S.appelsFinirEntre(a.ana.id, a.ben.id), []);
}

console.log('\n⛔ Un compte effacé : ses appels se terminent, sa ligne part, l\'autre garde l\'appel SANS NOM — et le rejeu après restauration ne réécrit rien');
{
  const a = atelier(), S = a.S;
  /* ancien appel pris, appel en cours, appel qui sonne vers elle */
  const vieux = lancer(a, a.ana, a.ben); a.h.t += 2 * SEC; S.appelRepondre({ id: vieux.id, uid: a.ben.id, session: a.sb, accepte: true }); a.h.t += 30 * SEC; S.appelQuitter({ id: vieux.id, uid: a.ana.id, session: a.sa });
  const courant = lancer(a, a.ana, a.cleo, 'video', jeton()); a.h.t += 2 * SEC; S.appelRepondre({ id: courant.id, uid: a.cleo.id, session: a.sc, accepte: true });
  const sonne = S.appelCreer({ appelant: a.dan.id, appele: a.ben.id, type: 'audio', session: jeton(), sonnerieMs: SONNERIE });
  v('population : Ana a un appel fini avec Ben, un appel en cours avec Cleo ; Dan fait sonner Ben', [S.appelsListe(a.ana.id).length, S.appelActifDe(a.ana.id) === courant.id, S.appelActifDe(a.ben.id) === sonne.id], [1, true, true]);
  const brut = a.brut();
  brut.prepare('UPDATE personne SET suppression_le = ? WHERE id = ?').run(a.h.t - 1, a.ana.id);
  brut.close();
  const avant = { cleo: evenementsAppel(S, a.cleo.id).length, ben: evenementsAppel(S, a.ben.id).length };
  const e = S.compteEffacer(a.ana.id);
  v('le compte est effacé', e.effacee, true);
  v('⛔ l\'appel en cours avec Cleo est FINI (motif « compte »), Cleo l\'apprend (un événement de plus) et elle est à réveiller', [S.appelVue(a.cleo.id, courant.id).etat, S.appelVue(a.cleo.id, courant.id).motif, evenementsAppel(S, a.cleo.id).length - avant.cleo, e.appels], ['fini', 'compte', 1, [a.cleo.id]]);
  v('⛔ l\'autre garde l\'appel SANS NOM : plus d\'« autre » (la page écrit « Compte supprimé »), et l\'appel est toujours là, terminé', [S.appelVue(a.cleo.id, courant.id).autre, S.appelVue(a.cleo.id, courant.id).sens, S.appelsListe(a.cleo.id).filter(x => x.id === courant.id).length], [null, 'entrant', 1]);
  v('l\'ancien appel avec Ben reste dans l\'historique de Ben, sans nom aussi (et l\'export de Ben ne nomme personne)', [S.appelsListe(a.ben.id).filter(x => x.id === vieux.id).length, (S.appelsListe(a.ben.id).find(x => x.id === vieux.id) || {}).autre, S.exportAppels(a.ben.id).find(x => x.id === vieux.id).avec_id], [1, null, null]);
  v('⛔ rien d\'Ana ne reste côté Ana : plus de ligne de participant, plus d\'appel actif, plus d\'historique', [compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel_part WHERE uid = ?', a.ana.id), S.appelActifDe(a.ana.id), S.appelsListe(a.ana.id).length], [0, null, 0]);
  v('l\'appel de Dan à Ben n\'a rien à voir : il sonne toujours', [S.appelActifDe(a.ben.id) === sonne.id, S.appelVue(a.ben.id, sonne.id).etat], [true, 'sonne']);
  /* un compte dont l'appel sonnait : « annulé » pour l'autre, qui l'a manqué ; la notification du manqué s'anonymise */
  const b = atelier(), S2 = b.S;
  const r = lancer(b, b.ana, b.ben);
  b.h.t += SONNERIE; S2.appelsEchoir(b.h.t);
  v('population : Ben a une notification « Ana Test vous a appelé. »', manques(S2, b.ben.id).map(x => x.texte), ['Ana Test vous a appelé.']);
  const br2 = b.brut(); br2.prepare('UPDATE personne SET suppression_le = ? WHERE id = ?').run(b.h.t - 1, b.ana.id); br2.close();
  S2.compteEffacer(b.ana.id);
  v('⛔ une fois Ana effacée, la notification ne porte plus son nom : « Un compte supprimé vous a appelé. »', manques(S2, b.ben.id).map(x => x.texte), ['Un compte supprimé vous a appelé.']);
  void r;
  /* le REJEU : la copie restaurée d'avant l'effacement porte le compte ENCORE actif, avec un appel qui court ; le service rejoue l'effacement (`rejeu`) */
  const c = atelier(), S3 = c.S;
  const rc = lancer(c, c.ana, c.ben); c.h.t += 2 * SEC; S3.appelRepondre({ id: rc.id, uid: c.ben.id, session: c.sb, accepte: true });
  const purgesAvant = compte(c.brut(), 'SELECT COUNT(*) AS n FROM purge');
  const rejeu = S3.compteEffacer(c.ana.id, { rejeu: true });
  v('⛔ le REJEU d\'un effacement termine l\'appel (motif « compte »), prévient Ben, retire la ligne d\'Ana — et n\'écrit RIEN au registre des purges', [rejeu.effacee, rejeu.appels, S3.appelVue(c.ben.id, rc.id).etat, S3.appelVue(c.ben.id, rc.id).motif, compte(c.brut(), 'SELECT COUNT(*) AS n FROM appel_part WHERE uid = ?', c.ana.id), compte(c.brut(), 'SELECT COUNT(*) AS n FROM purge')], [true, [c.ben.id], 'fini', 'compte', 0, purgesAvant]);
  v('   rejoué une seconde fois, il ne trouve plus de compte à effacer', S3.compteEffacer(c.ana.id, { rejeu: true }).effacee, false);
}

console.log('\nLa réparation du démarrage : le code d\'AVANT les appels efface un compte sans toucher à son historique d\'appels');
{
  const a = atelier(), S = a.S;
  const r = lancer(a, a.ana, a.ben); a.h.t += SEC; S.appelRepondre({ id: r.id, uid: a.ben.id, session: a.sb, accepte: true });
  const r2 = lancer(a, a.cleo, a.dan, 'audio', a.sc); a.h.t += SEC; S.appelRepondre({ id: r2.id, uid: a.dan.id, session: jeton(), accepte: false });
  S.fermer();
  /* le code d'avant ne connaît pas ces tables : il marque le compte supprimé et laisse les lignes */
  const brut = new DatabaseSync(a.chemin);
  brut.prepare(`UPDATE personne SET etat = 'supprime', prenom = '', nom = '' WHERE id = ?`).run(a.ana.id);
  brut.close();
  const S2 = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t });
  v('population : une ligne de participant d\'un compte supprimé traîne, et son appel courait', [compte(new DatabaseSync(a.chemin), 'SELECT COUNT(*) AS n FROM appel_part WHERE uid = ?', a.ana.id), S2.appelVue(a.ben.id, r.id).etat, S2.appelActifDe(a.ben.id) === r.id], [1, 'en_cours', true]);
  const rep = S2.appelsReparer();
  v('⛔ la réparation finit l\'appel (motif « compte »), retire la ligne, prévient Ben, ne touche pas à l\'appel des deux autres', [rep.personnes, rep.reveil, S2.appelVue(a.ben.id, r.id).etat, S2.appelVue(a.ben.id, r.id).motif, compte(new DatabaseSync(a.chemin), 'SELECT COUNT(*) AS n FROM appel_part WHERE uid = ?', a.ana.id), S2.appelVue(a.cleo.id, r2.id).etat], [1, [a.ben.id], 'fini', 'compte', 0, 'refuse']);
  v('rejouable : une seconde réparation ne trouve rien', [S2.appelsReparer().personnes, S2.appelsReparer().reveil], [0, []]);
  S2.fermer();
}

console.log('\n⛔ Une restauration ferme les appels qui sonnaient ou couraient — SANS sonner, SANS notifier, et sans laisser personne « occupé »');
{
  const a = atelier(), S = a.S;
  const fini = lancer(a, a.ana, a.cleo); S.appelRepondre({ id: fini.id, uid: a.cleo.id, session: jeton(), accepte: false });
  const sonne = lancer(a, a.ana, a.ben);
  const court = lancer(a, a.cleo, a.dan, 'video', a.sc); a.h.t += 4 * SEC; S.appelRepondre({ id: court.id, uid: a.dan.id, session: jeton(), accepte: true });
  S.fermer();
  const avant = new DatabaseSync(a.chemin);
  const notifs = compte(avant, 'SELECT COUNT(*) AS n FROM notification'), evts = compte(avant, 'SELECT COUNT(*) AS n FROM journal');
  avant.close();
  const copie = path.join(bac, 'restauree.db');
  for (const s of ['', '-wal', '-shm']) { try { fs.copyFileSync(a.chemin + s, copie + s); } catch (e) { /* absent */ } }
  const bilan = STOCK.ouvrir.copie.apresRestauration(copie, { horloge: () => a.h.t + JOUR });
  v('population : la restauration a fermé les appels vivants — les DEUX qui sonnaient ou couraient, et pas celui qui était déjà fini', bilan.appels, 2);
  const R = ouvrir({ chemin: copie, scelleur: creerScelleur(a.kek), horloge: () => a.h.t + JOUR });
  v('⛔ la sonnerie est « manquée » (fin = lancement), l\'appel en cours « fini » avec le motif « restauration » et une durée nulle ; l\'appel déjà fini n\'a pas bougé', [R.appelVue(a.ben.id, sonne.id).etat, R.appelVue(a.ben.id, sonne.id).fin === R.appelVue(a.ben.id, sonne.id).debut, R.appelVue(a.dan.id, court.id).etat, R.appelVue(a.dan.id, court.id).motif, R.appelVue(a.dan.id, court.id).duree_s, R.appelVue(a.cleo.id, fini.id).etat, R.appelVue(a.cleo.id, fini.id).motif], ['manque', true, 'fini', 'restauration', 0, 'refuse', null]);
  v('⛔ personne n\'est plus « occupé » : aucun appel actif, et chacun peut appeler', [R.appelsActifs().length, R.appelActifDe(a.ana.id), R.appelActifDe(a.dan.id)], [0, null, null]);
  const apres = new DatabaseSync(copie);
  v('⛔ et RIEN n\'a été écrit pour faire sonner ou notifier : mêmes notifications, même journal qu\'avant', [compte(apres, 'SELECT COUNT(*) AS n FROM notification'), compte(apres, 'SELECT COUNT(*) AS n FROM journal')], [notifs, evts]);
  apres.close();
  v('rejouée, la restauration ne trouve plus rien à fermer', STOCK.ouvrir.copie.apresRestauration(copie, { horloge: () => a.h.t + JOUR }).appels, 0);
  R.fermer();
}

fin();
