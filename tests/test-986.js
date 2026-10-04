/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS À PLUSIEURS ET LES SALLES, LE STOCKAGE SEUL (famille 1 de SERVEUR.md § 3.11, étape 8).

   `server-msg/stockage.js` (la migration 9 et le bloc « salles ») monté avec le VRAI stockage — un fichier de base, une clé et une horloge injectés, qu'on AVANCE au geste (jamais un sommeil).
   Pas de HTTP ici : `test-987` joue les routes, `test-988` les réunions (le lien, la fenêtre, la salle d'attente), `test-989` le service (le balayeur, la restauration, l'effacement vécus), `test-905` les gardes.
   Celui-ci dit que ce qui est RANGÉ est juste :

     · la migration 9 n'ajoute que des COLONNES et des index (aucune table neuve, rien de reconstruit), est rejouable, garde sa copie, et le code d'AVANT — les appels à deux — tourne sur la base d'APRÈS ;
     · une salle : l'hôte entre d'emblée, chaque invité sonne ou est « manqué » tout de suite s'il est dans un appel, un événement durable par personne concernée ;
     · ⛔ ENTRER est jugé dans UNE transaction, dans cet ordre : un droit (membre du groupe, invité de la réunion — sinon le MÊME refus qu'une salle inconnue), l'exclusion, la fin, l'appareil, un autre appel,
       le verrou (hôte et co-hôtes exceptés), la capacité, la salle d'attente ;
     · l'hôte qui part passe la main — un co-hôte d'abord, sinon le plus ancien — et la salle finit avec son dernier occupant ;
     · ⛔ EXCLURE : la personne ne revient pas, ne lit plus la salle, ne figure plus dans aucune liste ; un co-hôte n'exclut ni l'hôte ni un autre co-hôte ;
     · l'hôte seul nomme un co-hôte, termine, commence l'enregistrement ; chaque réglage est une écriture de l'hôte ou d'un co-hôte PRÉSENT ;
     · ce que chacun VOIT : la liste des présents seulement à qui est dedans, la salle d'attente aux seuls hôtes, un exclu rien ;
     · une sonnerie échue fait UN manqué par invité, une fois ; un compte effacé SORT de la salle (elle continue pour les autres) ; l'export ne nomme personne.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const STOCK = require(path.join(T.SERVICE, 'stockage.js'));
const { ouvrir, MIGRATIONS } = STOCK;
const M9 = MIGRATIONS.filter(m => m.v <= 9);          // les migrations jusqu'à la 9 : ce que ce banc éprouve ; les suivantes ont leurs propres bancs
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');

const SEC = 1000, MIN = 60000, JOUR = 86400000, SONNERIE = 45 * SEC;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-986-'));
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
/* un atelier : cinq personnes (Ana, Ben, Cleo, Dan, Eve), toutes contacts d'Ana, une horloge en main ; chacune une session */
function atelier(opts = {}) {
  const a = neuf(opts), S = a.S;
  const ana = pers(S, 'Ana'), ben = pers(S, 'Ben'), cleo = pers(S, 'Cleo'), dan = pers(S, 'Dan'), eve = pers(S, 'Eve');
  for (const p of [ben, cleo, dan, eve]) S.contactLier(ana.id, p.id);
  return Object.assign(a, { ana, ben, cleo, dan, eve, sa: jeton(), sb: jeton(), sc: jeton(), sd: jeton(), se: jeton() });
}
const sess = (a, p) => ({ [a.ana.id]: a.sa, [a.ben.id]: a.sb, [a.cleo.id]: a.sc, [a.dan.id]: a.sd, [a.eve.id]: a.se })[p.id];
/* Une salle d'Ana (vidéo, quatre places) : Ben, Cleo et Dan sonnent. */
const salle = (a, opts = {}) => a.S.appelCreerGroupe({ appelant: a.ana.id, invites: opts.invites || [a.ben.id, a.cleo.id, a.dan.id], type: opts.type || 'video', session: a.sa, sonnerieMs: SONNERIE, capacite: opts.capacite === undefined ? 4 : opts.capacite, conv: opts.conv || null, attente: opts.attente });
const entre = (a, id, p) => a.S.appelRepondre({ id, uid: p.id, session: sess(a, p), accepte: true });
const evenementsAppel = (S, uid) => S.evenementsPour(uid, 0, 1000).evenements.filter(e => e.event === 'appel');
const manques = (S, uid) => S.notifListe(uid, 50).filter(x => x.type === 'appel_manque');
const statuts = (S, id, uids) => uids.map(u => (S.appelAcces(id, u) || { statut: null }).statut);
const gradeDe = (S, id, u) => (S.appelAcces(id, u) || { grade: null }).grade;

console.log('La migration 9 : numérotée, que des COLONNES et des index, rejouable, avec sa copie ; le code d\'AVANT tourne sur la base d\'APRÈS');
{
  const DERNIERE = MIGRATIONS[MIGRATIONS.length - 1].v;
  const m9 = MIGRATIONS.filter(m => m.v === 9);
  /* ⛔ ce banc garde la migration 9 : il ne dit pas qu'elle est la DERNIÈRE (la 10, Perso+, est venue après) — il la rejoue seule (`M9`) quand il vérifie ce qu'elle fait à une base du schéma 8 */
  v('population : UNE migration 9, après la 8 des appels à deux', [m9.length, DERNIERE >= 9, MIGRATIONS.filter(m => m.v < 9).length], [1, true, 8]);
  vrai('les numéros se suivent sans trou (1 à 9, puis la suite)', MIGRATIONS.map(m => m.v).join().startsWith('1,2,3,4,5,6,7,8,9') && MIGRATIONS.every((m, i) => m.v === i + 1));
  const sqls = m9[0].sql;
  const ajouts = sqls.filter(s => /^ALTER TABLE \w+ ADD COLUMN /.test(s));
  v('population : seize colonnes ajoutées, trois index, la version — et RIEN d\'autre', [ajouts.length, sqls.filter(s => /^CREATE (UNIQUE )?INDEX IF NOT EXISTS /.test(s)).length, sqls.filter(s => /^PRAGMA user_version = 9$/.test(s)).length, sqls.length], [16, 3, 1, 20]);
  vrai('⛔ aucune table créée, aucune supprimée, aucune reconstruite, aucun renommage (le code d\'avant garde ses tables telles quelles : un retour en arrière du déploiement reste possible)', !sqls.some(s => /\b(CREATE TABLE|DROP|RENAME|INSERT INTO|DELETE FROM|UPDATE )\b/i.test(s)) && !m9[0].sansFk);
  vrai('chaque colonne neuve a un défaut ou accepte le vide (une ligne écrite par le code d\'avant ne casse rien) : NOT NULL ⇒ DEFAULT', ajouts.filter(s => /NOT NULL/.test(s)).every(s => /DEFAULT/.test(s)));
  const a = neuf();
  const brut = a.brut();
  const colonnes = (t) => brut.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map(r => r.name);
  v('les trois tables portent les colonnes neuves', [['genre', 'conv', 'reunion', 'capacite', 'verrou', 'attente', 'partage_ok', 'rec_par'].filter(c => !colonnes('appel').includes(c)), ['statut', 'grade', 'entre', 'gen'].filter(c => !colonnes('appel_part').includes(c)), ['attente', 'code_h', 'code_ch', 'code_le'].filter(c => !colonnes('reunion').includes(c))], [[], [], []]);
  v('et les trois index', brut.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('reunion_code', 'appel_salle', 'appel_reunion') ORDER BY name`).all().map(r => r.name), ['appel_reunion', 'appel_salle', 'reunion_code']);
  v('⛔ le code d\'un lien est UNIQUE (l\'index est partiel : plusieurs réunions sans lien sont permises)', [/UNIQUE/i.test(brut.prepare(`SELECT sql FROM sqlite_master WHERE name = 'reunion_code'`).get().sql)], [true]);
  brut.close();
  const deux = ['appel', 'appel_part'];
  v('⛔ les TROIS listes écrites à la main nomment toujours les mêmes tables (aucune table neuve : la 9 n\'en ajoute pas)', [deux.filter(t => !STOCK.ouvrir.copie.TABLES_COMPTEES.includes(t)), deux.filter(t => !(t in a.S.sonde().nonVides))], [[], []]);

  /* ⛔ LE CODE D'AVANT SUR LA BASE D'APRÈS : exactement les requêtes de l'étape 7 (un appel à deux écrit SANS les colonnes neuves). Les défauts font de lui un appel « deux », avec ses deux lignes. */
  const S = a.S, ana = pers(S, 'Ana'), ben = pers(S, 'Ben');
  S.contactLier(ana.id, ben.id);
  const x = neuf();
  const vieux = x.brut();
  const idV = 'a_' + crypto.randomBytes(16).toString('hex');
  // (la base de `x` est NEUVE : elle a le schéma 9 ; le code d'avant n'y ajoute que ses colonnes anciennes)
  const A1 = pers(x.S, 'Ana'), B1 = pers(x.S, 'Ben');
  x.S.contactLier(A1.id, B1.id);
  vieux.prepare('INSERT INTO appel(id, type, etat, cree, sonne_jusqua, fin) VALUES(?, ?, ?, ?, ?, ?)').run(idV, 'audio', 'sonne', x.h.t, x.h.t + SONNERIE, null);
  vieux.prepare('INSERT INTO appel_part(appel, uid, role, session) VALUES(?, ?, ?, ?)').run(idV, A1.id, 'appelant', jeton());
  vieux.prepare('INSERT INTO appel_part(appel, uid, role, session) VALUES(?, ?, ?, ?)').run(idV, B1.id, 'appele', null);
  vieux.close();
  const vueV = x.S.appelVue(B1.id, idV);
  v('⛔ un appel écrit par le code d\'AVANT est lu par le code neuf comme un appel À DEUX (genre « deux »), entrant pour Ben', [vueV.genre, vueV.sens, vueV.etat, vueV.autre.id === A1.id, vueV.groupe], ['deux', 'entrant', 'sonne', true, undefined]);
  const rep = x.S.appelRepondre({ id: idV, uid: B1.id, session: jeton(), accepte: true });
  v('   Ben y répond avec le code neuf : « en cours »', [rep.etat, x.S.appelActifDe(B1.id) === idV], ['en_cours', true]);
  x.S.appelQuitter({ id: idV, uid: B1.id, session: x.S.appelAcces(idV, B1.id).session });
  v('   et le raccroche : fini', x.S.appelVue(A1.id, idV).etat, 'fini');
  /* et dans l'autre sens : les requêtes de l'étape 7 lisent une salle sans casser (elles ignorent seulement ce qu'elles ne connaissent pas) */
  const b = atelier(); const r = salle(b); entre(b, r.id, b.ben);
  const lecteur = b.brut();
  const ancien = lecteur.prepare('SELECT id, type, etat, cree, sonne_jusqua, repondu, fin, motif FROM appel WHERE id = ?').get(r.id);
  const parts = lecteur.prepare('SELECT uid, role, session FROM appel_part WHERE appel = ? ORDER BY role, uid').all(r.id);
  lecteur.close();
  v('le SELECT de l\'étape 7 lit une salle (quatre lignes d\'appel_part, l\'état, le type) sans erreur', [ancien.etat, ancien.type, parts.length, parts.filter(p => p.role === 'appelant').length], ['en_cours', 'video', 4, 1]);

  /* ⛔ LA BASE EN SERVICE : au schéma 8 (les appels à deux, sur la bêta). On la RETROGRADE (une base à jour qui a vécu, sans ce que la 9 ajoute) puis on la rouvre avec la 9 : rien de ce qu'elle porte ne bouge. */
  const g = neuf();
  const gA = pers(g.S, 'Ana'), gB = pers(g.S, 'Ben');
  g.S.contactLier(gA.id, gB.id);
  const debutR = g.h.t + 2 * JOUR;
  const gR = g.S.reunionCreer({ hote: gA.id, titre: 'Avant la 9', lieu: '', debut: debutR, fin: debutR + 3600000, tz: 'Europe/Paris', rep: 'aucune', rappels: [], invites: [gB.id], prochain: debutR }).id;
  const gC = g.S.appelCreer({ appelant: gA.id, appele: gB.id, type: 'audio', session: jeton(), sonnerieMs: SONNERIE });
  g.S.appelFinir({ id: gC.id, motif: null });
  const avant8 = [g.S.contactsDe(gA.id).length, g.S.reunionPourMembre(gR, gB.id).reunion.titre, g.S.appelVue(gA.id, gC.id).etat];
  g.S.fermer();
  const br = g.brut();
  br.exec('DROP INDEX IF EXISTS reunion_code; DROP INDEX IF EXISTS appel_salle; DROP INDEX IF EXISTS appel_reunion;');
  for (const c of ['genre', 'conv', 'reunion', 'capacite', 'verrou', 'attente', 'partage_ok', 'rec_par']) br.exec('ALTER TABLE appel DROP COLUMN ' + c);
  for (const c of ['statut', 'grade', 'entre', 'gen']) br.exec('ALTER TABLE appel_part DROP COLUMN ' + c);
  for (const c of ['attente', 'code_h', 'code_ch', 'code_le']) br.exec('ALTER TABLE reunion DROP COLUMN ' + c);
  br.exec('PRAGMA user_version = 8');
  const pop8 = [Number(br.prepare('PRAGMA user_version').get().user_version), compte(br, `SELECT COUNT(*) AS n FROM pragma_table_info('appel') WHERE name = 'genre'`), compte(br, 'SELECT COUNT(*) AS n FROM appel')];
  br.close();
  v('population : une base du schéma 8, sans la colonne « genre », avec un appel, une réunion et un contact', [pop8, avant8], [[8, 0, 1], [1, 'Avant la 9', 'annule']]);
  const g9 = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t, migrations: M9 });
  v('⛔ rouverte avec la migration 9 : schéma 9, le contact, la réunion et l\'appel sont intacts, l\'appel est « deux »', [g9.schema(), g9.contactsDe(gA.id).length, g9.reunionPourMembre(gR, gB.id).reunion.titre, g9.appelVue(gA.id, gC.id).etat, g9.appelVue(gA.id, gC.id).genre], [9, 1, 'Avant la 9', 'annule', 'deux']);
  vrai('⛔ une copie « avant-v9 » est gardée avant de migrer une base qui a vécu — et PAS de « avant-v8 » (la 8 était déjà faite)', fs.existsSync(g.chemin + '.avant-v9') && !fs.existsSync(g.chemin + '.avant-v8'));
  const cop = new DatabaseSync(g.chemin + '.avant-v9');
  v('la copie est la base d\'AVANT : schéma 8, sans la colonne « genre »', [cop.prepare('PRAGMA user_version').get().user_version, compte(cop, `SELECT COUNT(*) AS n FROM pragma_table_info('appel') WHERE name = 'genre'`)], [8, 0]);
  cop.close();
  g9.fermer();
  /* rejouable : le compteur remis à 8 sur une base qui a déjà les colonnes (une restauration, une main maladroite) ne fait pas échouer l'ouverture */
  const rj = g.brut(); rj.exec('PRAGMA user_version = 8'); rj.close();
  const g9b = ouvrir({ chemin: g.chemin, scelleur: creerScelleur(g.kek), horloge: () => g.h.t, migrations: M9 });
  v('⛔ la migration REJOUÉE sur une base qui a déjà ses colonnes : pas d\'échec « duplicate column », rien ne se perd', [g9b.schema(), g9b.reunionPourMembre(gR, gB.id).reunion.titre, g9b.appelVue(gA.id, gC.id).etat], [9, 'Avant la 9', 'annule']);
  g9b.fermer();
}

console.log('\nLancer une salle : l\'hôte entre d\'emblée, chaque invité sonne ou est « manqué » tout de suite, un événement durable par personne');
{
  const a = atelier(), S = a.S;
  /* Dan est déjà dans un appel (à deux, avec Eve) : il ne sonnera pas, il lira « manqué » */
  const ailleurs = S.appelCreer({ appelant: a.eve.id, appele: a.dan.id, type: 'audio', session: a.se, sonnerieMs: SONNERIE });
  S.appelRepondre({ id: ailleurs.id, uid: a.dan.id, session: a.sd, accepte: true });
  a.h.t += SEC;
  const r = salle(a);
  v('un identifiant a_… de 32 hexadécimaux, l\'état « sonne », pas « occupé » ; Ben et Cleo sonnent, Dan est occupé', [/^a_[0-9a-f]{32}$/.test(r.id), r.vue.etat, r.occupe, r.sonnent.sort().join() === [a.ben.id, a.cleo.id].sort().join(), r.occupes], [true, 'sonne', false, true, [a.dan.id]]);
  const vueA = S.appelVue(a.ana.id, r.id), vueB = S.appelVue(a.ben.id, r.id), vueD = S.appelVue(a.dan.id, r.id);
  v('la vue de l\'hôte : groupe, sortante, vidéo, quatre places, un présent (elle), appareil lié, hôte (grade 2)', [vueA.genre, vueA.groupe, vueA.sens, vueA.type, vueA.capacite, vueA.nb, vueA.lie, vueA.moi], ['groupe', true, 'sortant', 'video', 4, 1, true, { statut: 'present', grade: 2, gen: 1 }]);
  v('la vue d\'un invité qui sonne : entrante, « invite », aucun appareil lié, ne voit PERSONNE dans la salle (ni qui est dedans ni qui attend) — seulement combien', [vueB.sens, vueB.moi.statut, vueB.lie, vueB.participants, vueB.nb, vueB.en_attente], ['entrant', 'invite', false, [], 1, 0]);
  v('⛔ Dan, occupé ailleurs, lit « manqué » d\'emblée (sans sonner), avec UNE notification ; Ben et Cleo n\'en ont aucune', [vueD.manque, vueD.moi.statut, manques(S, a.dan.id).length, manques(S, a.ben.id).length, manques(S, a.cleo.id).length], [true, 'manque', 1, 0, 0]);
  v('⛔ UN événement durable par personne concernée (l\'hôte, les deux qui sonnent, celui qui est occupé), et Eve, qui n\'y est pas, ne reçoit RIEN', [evenementsAppel(S, a.ana.id).length, evenementsAppel(S, a.ben.id).length, evenementsAppel(S, a.cleo.id).length, evenementsAppel(S, a.dan.id).length - evenementsAppel(S, a.dan.id).filter(e => e.data.id === ailleurs.id).length, evenementsAppel(S, a.eve.id).filter(e => e.data.id === r.id).length], [1, 1, 1, 1, 0]);
  v('⛔ la salle de l\'hôte est « active » pour elle, pour les invités qui sonnent ; pas pour Dan (il est ailleurs), pas pour Eve', [S.appelActifDe(a.ana.id) === r.id, S.appelActifDe(a.ben.id) === r.id, S.appelActifDe(a.cleo.id) === r.id, S.appelActifDe(a.dan.id) === ailleurs.id, S.appelActifDe(a.eve.id) === ailleurs.id], [true, true, true, true, true]);
  v('⛔ occupe_moi : celle qui est déjà dans un appel n\'en lance pas un second (rien n\'est écrit)', [lance(() => salle(a)), compte(a.brut(), 'SELECT COUNT(*) AS n FROM appel')], ['occupe_moi', 2]);
  v('une vue de salle ne porte QUE ces champs (jamais une adresse réseau ni l\'empreinte d\'une session)', Object.keys(vueA).sort(), ['attente', 'autre', 'capacite', 'conv', 'debut', 'duree_s', 'en_attente', 'etat', 'fin', 'genre', 'groupe', 'id', 'lie', 'manque', 'membres', 'moi', 'motif', 'nb', 'partage_ok', 'participants', 'rec', 'repondu', 'reunion', 'sens', 'sonne_jusqua', 'titre', 'type', 'verrou']);
  /* tous occupés : personne ne peut sonner, l'appel est écrit « occupé » et ne démarre pas */
  const b = atelier(), S2 = b.S;
  const e1 = S2.appelCreer({ appelant: b.eve.id, appele: b.ben.id, type: 'audio', session: b.se, sonnerieMs: SONNERIE });
  S2.appelRepondre({ id: e1.id, uid: b.ben.id, session: b.sb, accepte: true });
  const tous = salle(b, { invites: [b.ben.id] });
  v('⛔ si PERSONNE ne peut sonner, l\'appel est écrit « occupé » (fin = maintenant) et l\'hôte n\'y reste pas', [tous.occupe, tous.vue.etat, S2.appelActifDe(b.ana.id), statuts(S2, tous.id, [b.ana.id, b.ben.id])], [true, 'occupe', null, ['parti', 'manque']]);
  v('   et l\'hôte peut en lancer un autre tout de suite', lance(() => salle(b, { invites: [b.cleo.id] })), null);
  /* les invités sont dédoublonnés, et l'hôte n'est jamais son propre invité */
  const c = atelier();
  const dd = salle(c, { invites: [c.ben.id, c.ben.id, c.ana.id, c.cleo.id] });
  v('les invités sont dédoublonnés et l\'hôte n\'est pas son propre invité : trois lignes (l\'hôte, Ben, Cleo)', [compte(c.brut(), 'SELECT COUNT(*) AS n FROM appel_part WHERE appel = ?', dd.id), dd.sonnent.length], [3, 2]);
}

console.log('\n⛔ ENTRER est jugé dans UNE transaction : le droit, l\'exclusion, la fin, l\'appareil, un autre appel, le verrou, la capacité, la salle d\'attente');
{
  const a = atelier(), S = a.S;
  const r = salle(a);
  a.h.t += 3 * SEC;
  const rb = entre(a, r.id, a.ben);
  v('Ben répond : il est PRÉSENT, l\'appareil est LIÉ, l\'appel court (deux présents), l\'heure de réponse est maintenant', [rb.vue.moi.statut, rb.vue.lie, rb.etat, rb.vue.repondu === a.h.t, rb.attente, rb.deja], ['present', true, 'en_cours', true, false, false]);
  v('   le numéro de passage (`gen`) de Ben vaut 1 (sa première entrée), celui de l\'hôte aussi', [S.appelAcces(r.id, a.ben.id).session === a.sb, rb.vue.moi.gen, S.appelVue(a.ana.id, r.id).moi.gen], [true, 1, 1]);
  v('⛔ le MÊME appareil qui rejoint deux fois reçoit la même vue (`deja`), sans écrire', (() => { const e = evenementsAppel(S, a.ben.id).length; const x = S.appelRejoindre({ id: r.id, uid: a.ben.id, session: a.sb }); return [x.deja, evenementsAppel(S, a.ben.id).length === e]; })(), [true, true]);
  v('⛔ un SECOND appareil de Ben ne vole pas sa place : `appel_pris`', lance(() => S.appelRejoindre({ id: r.id, uid: a.ben.id, session: jeton() })), 'appel_pris');
  /* le droit : un étranger n'entre pas, et reçoit EXACTEMENT ce que reçoit celui qui frappe à une salle inconnue */
  const inconnu = 'a_' + '0'.repeat(32);
  v('⛔ un étranger (ni invité, ni membre d\'un groupe de la salle) : `introuvable`, comme pour une salle qui n\'existe pas', [lance(() => S.appelRejoindre({ id: r.id, uid: a.eve.id, session: a.se })), lance(() => S.appelRejoindre({ id: inconnu, uid: a.eve.id, session: a.se }))], ['introuvable', 'introuvable']);
  v('⛔ un appel à DEUX n\'est pas une salle : `introuvable` aussi', (() => { const b = atelier(); const d = b.S.appelCreer({ appelant: b.ana.id, appele: b.ben.id, type: 'audio', session: b.sa, sonnerieMs: SONNERIE }); return lance(() => b.S.appelRejoindre({ id: d.id, uid: b.ben.id, session: b.sb })); })(), 'introuvable');
  /* le verrou : l'invité qui n'est pas entré n'entre plus ; l'hôte et un co-hôte, si */
  S.salleCohote({ id: r.id, par: a.ana.id, uid: a.ben.id, actif: true });
  S.salleVerrou(r.id, a.ana.id, true);
  v('⛔ salle VERROUILLÉE : l\'invité qui n\'est pas entré reçoit `verrouillee`', lance(() => entre(a, r.id, a.cleo)), 'verrouillee');
  v('   … mais pas le co-hôte qui revient (il part, puis rentre) : le verrou ne ferme pas la porte à ceux qui la tiennent', (() => { S.appelPartir({ id: r.id, uid: a.ben.id, session: a.sb }); const x = S.appelRejoindre({ id: r.id, uid: a.ben.id, session: a.sb }); return [x.vue.moi.statut, x.vue.moi.gen]; })(), ['present', 2]);
  S.salleVerrou(r.id, a.ana.id, false);
  /* la capacité : quatre places en vidéo ; la cinquième personne reçoit `appel_complet`, qui n'écrit rien. Eve n'est pas invitée : elle est MEMBRE du groupe d'où l'appel est lancé, c'est son droit d'entrer. */
  entre(a, r.id, a.cleo); entre(a, r.id, a.dan);
  v('population : quatre présents (Ana, Ben, Cleo, Dan) sur quatre places', [S.appelVue(a.ana.id, r.id).nb, S.appelVue(a.ana.id, r.id).capacite], [4, 4]);
  const b = atelier(), S2 = b.S;
  const conv2 = S2.convCreerGroupe({ createur: b.ana.id, nom: 'Équipe', membres: [b.ben.id, b.cleo.id, b.dan.id, b.eve.id], annonces_seules: false, ephemere_s: 0 }).id;
  const rg = salle(b, { invites: [b.ben.id, b.cleo.id, b.dan.id], conv: conv2 });
  for (const p of [b.ben, b.cleo, b.dan]) entre(b, rg.id, p);
  const avantE = [compte(b.brut(), 'SELECT COUNT(*) AS n FROM appel_part'), evenementsAppel(S2, b.eve.id).length];
  v('⛔ salle PLEINE : Eve, membre du groupe, reçoit `appel_complet` et le refus n\'écrit RIEN (ni ligne ni événement)', [lance(() => S2.appelRejoindre({ id: rg.id, uid: b.eve.id, session: b.se })), compte(b.brut(), 'SELECT COUNT(*) AS n FROM appel_part'), evenementsAppel(S2, b.eve.id).length], ['appel_complet', avantE[0], avantE[1]]);
  v('contre-épreuve : un participant PART, Eve entre — la capacité ne ferme pas la route ; sa ligne est celle d\'une personne qui n\'était pas invitée (rôle appelé, passage 1)', (() => { S2.appelPartir({ id: rg.id, uid: b.dan.id, session: b.sd }); const x = S2.appelRejoindre({ id: rg.id, uid: b.eve.id, session: b.se }); return [x.vue.moi.statut, x.vue.nb, x.vue.moi.gen, compte(b.brut(), `SELECT COUNT(*) AS n FROM appel_part WHERE appel = ? AND uid = ? AND role = 'appele'`, rg.id, b.eve.id)]; })(), ['present', 4, 1, 1]);
  v('⛔ le droit se juge à CHAQUE entrée : Eve sort, on la retire du groupe — elle n\'entre plus (`introuvable`), bien qu\'elle ait une ligne « parti » dans la salle', (() => { S2.appelPartir({ id: rg.id, uid: b.eve.id, session: b.se }); S2.membreRetirer({ conv: conv2, par: b.ana.id, uid: b.eve.id }); return [statuts(S2, rg.id, [b.eve.id]), lance(() => S2.appelRejoindre({ id: rg.id, uid: b.eve.id, session: b.se })), S2.sallesOuvertes(b.eve.id)]; })(), [['parti'], 'introuvable', []]);
  /* la fin : on n'entre pas dans une salle finie */
  const f = atelier(); const rf = salle(f); entre(f, rf.id, f.ben); f.S.salleTerminer({ id: rf.id, par: f.ana.id });
  v('⛔ une salle FINIE ne se rejoint plus : `appel_fini`', lance(() => f.S.appelRejoindre({ id: rf.id, uid: f.cleo.id, session: f.sc })), 'appel_fini');
  /* occupé ailleurs : Dan est dans un appel à deux avec Eve quand la salle d'Ana l'appelle (il lit « manqué »), puis il veut la rejoindre */
  const o = atelier();
  const x2 = o.S.appelCreer({ appelant: o.eve.id, appele: o.dan.id, type: 'audio', session: o.se, sonnerieMs: SONNERIE }); o.S.appelRepondre({ id: x2.id, uid: o.dan.id, session: o.sd, accepte: true });
  const ro = salle(o, { invites: [o.ben.id, o.dan.id] });
  v('⛔ celui qui est déjà dans un AUTRE appel n\'entre pas : `occupe_moi` (rien n\'est écrit) — il lui faut d\'abord raccrocher', [statuts(o.S, ro.id, [o.dan.id]), lance(() => o.S.appelRejoindre({ id: ro.id, uid: o.dan.id, session: o.sd }))], [['manque'], 'occupe_moi']);
  o.S.appelQuitter({ id: x2.id, uid: o.dan.id, session: o.sd });
  v('   … raccroché, il entre (« manqué » devient « présent »)', o.S.appelRejoindre({ id: ro.id, uid: o.dan.id, session: o.sd }).vue.moi.statut, 'present');
}

console.log('\nLa salle d\'attente : on attend à la porte, l\'hôte admet (un, ou tous dans la limite des places) ou refuse ; on peut redemander');
{
  const a = atelier(), S = a.S;
  const r = salle(a, { attente: true, invites: [a.ben.id, a.cleo.id, a.dan.id, a.eve.id], capacite: 3 });
  const rb = entre(a, r.id, a.ben);
  v('salle d\'attente allumée : Ben, invité, ATTEND (`attente`), n\'est pas dedans, ne compte pas parmi les présents, et ne lit pas la liste', [rb.attente, rb.vue.moi.statut, S.appelVue(a.ana.id, r.id).nb, rb.vue.participants, S.appelActifDe(a.ben.id) === r.id], [true, 'attente', 1, [], true]);
  v('   l\'appel ne COURT pas tant que personne n\'a été admis (un seul présent)', S.appelVue(a.ana.id, r.id).etat, 'sonne');
  entre(a, r.id, a.cleo); entre(a, r.id, a.dan);
  v('⛔ l\'HÔTE seul voit la salle d\'attente (trois personnes à la porte) ; un invité à la porte ne voit rien', [S.appelVue(a.ana.id, r.id).en_attente, S.appelVue(a.ana.id, r.id).participants.filter(p => p.statut === 'attente').length, S.appelVue(a.ben.id, r.id).en_attente], [3, 3, 0]);
  const ad = S.salleAdmettre({ id: r.id, par: a.ana.id, uid: a.ben.id });
  v('Ana admet Ben : il est PRÉSENT (gen 1), l\'appel court, il lit maintenant la liste (Ana, lui, et Eve qui sonne encore)', [ad.admis, ad.restent, S.appelVue(a.ben.id, r.id).moi.statut, S.appelVue(a.ben.id, r.id).moi.gen, S.appelVue(a.ana.id, r.id).etat, S.appelVue(a.ben.id, r.id).participants.length], [[a.ben.id], [], 'present', 1, 'en_cours', 3]);
  const tousAd = S.salleAdmettre({ id: r.id, par: a.ana.id, tous: true });
  v('⛔ « admettre tous » respecte la capacité (trois places : Ana, Ben, et UNE de plus) : le premier arrivé entre, le reste attend', [tousAd.admis.length, tousAd.restent.length, S.appelVue(a.ana.id, r.id).nb, S.appelVue(a.ana.id, r.id).en_attente], [1, 1, 3, 1]);
  v('⛔ la salle PLEINE : admettre quelqu\'un de plus → `appel_complet`, et personne ne bouge', [lance(() => S.salleAdmettre({ id: r.id, par: a.ana.id, tous: true })), S.appelVue(a.ana.id, r.id).nb], ['appel_complet', 3]);
  const restant = S.appelVue(a.ana.id, r.id).participants.find(p => p.statut === 'attente').id;
  S.salleRefuser({ id: r.id, par: a.ana.id, uid: restant });
  v('Ana REFUSE celui qui reste : « refusé », il n\'est plus à la porte, la salle d\'attente est vide', [S.appelAcces(r.id, restant).statut, S.appelVue(a.ana.id, r.id).en_attente], ['refuse', 0]);
  v('⛔ refuser quelqu\'un qui n\'attend pas, ou n\'est pas là : `introuvable` (rien n\'est écrit)', [lance(() => S.salleRefuser({ id: r.id, par: a.ana.id, uid: a.ben.id })), lance(() => S.salleRefuser({ id: r.id, par: a.ana.id, uid: a.eve.id }))], ['introuvable', 'introuvable']);
  S.appelPartir({ id: r.id, uid: a.cleo.id, session: a.sc });
  const pers2 = [a.cleo, a.dan].find(p => p.id === restant);
  v('⛔ un REFUSÉ peut redemander (l\'hôte qui ne veut plus le voir l\'exclut) : il retourne à la porte', S.appelRejoindre({ id: r.id, uid: restant, session: sess(a, pers2) }).attente, true);
  v('⛔ un participant qui n\'est ni hôte ni co-hôte n\'admet personne (`interdit`), un étranger non plus (`introuvable`)', [lance(() => S.salleAdmettre({ id: r.id, par: a.ben.id, tous: true })), lance(() => S.salleAdmettre({ id: r.id, par: a.eve.id, tous: true }))], ['interdit', 'introuvable']);
  v('⛔ l\'hôte et ses co-hôtes passent la porte sans attendre (le verrou et la salle d\'attente sont pour les autres)', (() => { S.salleCohote({ id: r.id, par: a.ana.id, uid: a.ben.id, actif: true }); S.appelPartir({ id: r.id, uid: a.ben.id, session: a.sb }); const x = S.appelRejoindre({ id: r.id, uid: a.ben.id, session: a.sb }); return [x.attente, x.vue.moi.statut, x.vue.moi.grade]; })(), [false, 'present', 1]);
}

console.log('\n⛔ L\'hôte qui part passe la main (un co-hôte, sinon le plus ancien), et la salle finit avec son dernier occupant');
{
  const a = atelier(), S = a.S;
  const r = salle(a, { invites: [a.ben.id, a.cleo.id, a.dan.id] });
  a.h.t += SEC; entre(a, r.id, a.ben);
  a.h.t += SEC; entre(a, r.id, a.cleo);
  a.h.t += SEC; entre(a, r.id, a.dan);
  S.salleCohote({ id: r.id, par: a.ana.id, uid: a.dan.id, actif: true });
  v('population : quatre présents, un hôte (Ana), un co-hôte (Dan, arrivé le DERNIER)', [S.appelVue(a.ana.id, r.id).nb, gradeDe(S, r.id, a.ana.id), gradeDe(S, r.id, a.dan.id), gradeDe(S, r.id, a.ben.id)], [4, 2, 1, 0]);
  a.h.t += SEC;
  const q = S.appelPartir({ id: r.id, uid: a.ana.id, session: a.sa });
  v('⛔ Ana part : le CO-HÔTE (Dan) prend la main, pas le plus ancien (Ben) ; Ana n\'est plus hôte', [gradeDe(S, r.id, a.dan.id), gradeDe(S, r.id, a.ben.id), S.appelVue(a.ana.id, r.id).moi, q.fini], [2, 0, { statut: 'parti', grade: 0, gen: 1 }, false]);
  v('   l\'appareil d\'Ana est DÉLIÉ (plus un signal ne lui serait relayé), et ceux qui restent apprennent son départ (événement durable)', [S.appelAcces(r.id, a.ana.id).session, Object.keys(q.gids).sort().join() === [a.ana.id, a.ben.id, a.cleo.id, a.dan.id].sort().join()], [null, true]);
  S.appelPartir({ id: r.id, uid: a.dan.id, session: a.sd });
  v('⛔ sans co-hôte, c\'est la personne ENTRÉE la plus tôt qui prend la main (Ben avant Cleo)', [gradeDe(S, r.id, a.ben.id), gradeDe(S, r.id, a.cleo.id)], [2, 0]);
  S.appelPartir({ id: r.id, uid: a.ben.id, session: a.sb });
  v('   Cleo reste seule : elle est hôte, la salle COURT encore', [gradeDe(S, r.id, a.cleo.id), S.appelVue(a.cleo.id, r.id).etat], [2, 'en_cours']);
  const dernier = S.appelPartir({ id: r.id, uid: a.cleo.id, session: a.sc });
  v('⛔ le DERNIER qui part finit la salle : « fini » (elle avait couru), sa durée se lit, plus personne n\'est « actif »', [dernier.fini, S.appelVue(a.cleo.id, r.id).etat, S.appelVue(a.cleo.id, r.id).duree_s, [a.ana, a.ben, a.cleo, a.dan].map(p => S.appelActifDe(p.id))], [true, 'fini', 3, [null, null, null, null]]);
  v('   tout le monde est « parti » ; aucun hôte ne subsiste (grade 0 partout)', [statuts(S, r.id, [a.ana.id, a.ben.id, a.cleo.id, a.dan.id]), [a.ana, a.ben, a.cleo, a.dan].map(p => gradeDe(S, r.id, p.id))], [['parti', 'parti', 'parti', 'parti'], [0, 0, 0, 0]]);
  v('⛔ sortir d\'une salle finie est sans effet (`deja`), jamais une erreur', S.appelPartir({ id: r.id, uid: a.ben.id, session: a.sb }).deja, true);
  /* l'appareil qui n'est pas le lien ne fait pas partir */
  const b = atelier(); const rb = salle(b); entre(b, rb.id, b.ben);
  v('⛔ un AUTRE appareil de Ben ne le fait pas quitter : `appareil_non_lie` — sauf le service qui juge (motif « perdu »)', [lance(() => b.S.appelPartir({ id: rb.id, uid: b.ben.id, session: jeton() })), lance(() => b.S.appelPartir({ id: rb.id, uid: b.ben.id, session: jeton(), motif: 'perdu' }))], ['appareil_non_lie', null]);
  v('   Ben est « parti » par le service ; la salle court pour Ana', [b.S.appelAcces(rb.id, b.ben.id).statut, b.S.appelVue(b.ana.id, rb.id).etat], ['parti', 'en_cours']);
  /* l'appelant raccroche avant toute réponse : « annulée », les invités ont manqué quelque chose */
  const c = atelier(); const rc = salle(c);
  c.h.t += 8 * SEC;
  const fc = c.S.appelPartir({ id: rc.id, uid: c.ana.id, session: c.sa });
  v('⛔ l\'hôte raccroche AVANT toute réponse : « annulé », les trois invités ont MANQUÉ (une notification chacun), et l\'état de chaque ligne le dit', [fc.fini, c.S.appelVue(c.ben.id, rc.id).etat, manques(c.S, c.ben.id).length, manques(c.S, c.cleo.id).length, manques(c.S, c.dan.id).length, statuts(c.S, rc.id, [c.ben.id, c.cleo.id, c.dan.id])], [true, 'annule', 1, 1, 1, ['manque', 'manque', 'manque']]);
  const encore = c.S.appelPartir({ id: rc.id, uid: c.ana.id, session: c.sa });
  v('   le geste répété ne réécrit rien (`deja`, aucune notification de plus)', [encore.deja, manques(c.S, c.ben.id).length], [true, 1]);
  /* tous refusent */
  const d = atelier(); const rd = salle(d, { invites: [d.ben.id, d.cleo.id] });
  d.S.appelRepondre({ id: rd.id, uid: d.ben.id, session: d.sb, accepte: false });
  v('un invité REFUSE la sonnerie : « refusé » pour lui, la salle continue de sonner pour les autres', [d.S.appelAcces(rd.id, d.ben.id).statut, d.S.appelVue(d.ana.id, rd.id).etat, d.S.appelActifDe(d.ben.id), d.S.appelActifDe(d.cleo.id) === rd.id], ['refuse', 'sonne', null, true]);
  const dr = d.S.appelRepondre({ id: rd.id, uid: d.cleo.id, session: d.sc, accepte: false });
  v('⛔ le DERNIER invité refuse : tous ont refusé, l\'appel finit « refusé » (pas « annulé »), l\'hôte reste libre', [dr.etat, d.S.appelVue(d.ana.id, rd.id).etat, d.S.appelActifDe(d.ana.id), manques(d.S, d.ben.id).length], ['refuse', 'refuse', null, 0]);
}

console.log('\n⛔ EXCLURE : la personne ne revient pas, ne lit plus la salle, ne figure dans aucune liste ; la hiérarchie protège l\'hôte');
{
  const a = atelier(), S = a.S;
  const r = salle(a);
  for (const p of [a.ben, a.cleo, a.dan]) entre(a, r.id, p);
  S.contactLier(a.ana.id, a.eve.id);
  const ex = S.salleExclure({ id: r.id, par: a.ana.id, uid: a.dan.id });
  v('Ana exclut Dan (présent) : sa ligne dit « exclu », sans grade, sans appareil ; il n\'est plus « actif » ; la salle court pour les autres', [ex.deja, ex.etait, S.appelVue(a.dan.id, r.id).moi, S.appelActifDe(a.dan.id), S.appelVue(a.ana.id, r.id).nb], [false, 'present', { statut: 'exclu', grade: 0, gen: 1 }, null, 3]);
  v('⛔ le laissez-passer d\'un exclu est NUL (la garde répondra 404, comme pour une salle inconnue), sa vue ne montre aucun participant', [S.appelAcces(r.id, a.dan.id), S.appelVue(a.dan.id, r.id).participants, S.appelVue(a.dan.id, r.id).rec], [null, [], null]);
  v('⛔ l\'exclu qui REVIENT : `exclu` — même s\'il est membre du groupe, même avec un autre appareil', [lance(() => S.appelRejoindre({ id: r.id, uid: a.dan.id, session: a.sd })), lance(() => S.appelRejoindre({ id: r.id, uid: a.dan.id, session: jeton() })), lance(() => S.appelRepondre({ id: r.id, uid: a.dan.id, session: a.sd, accepte: true }))], ['exclu', 'exclu', 'exclu']);
  v('   il ne fait pas partie des salles qu\'on lui propose de rejoindre, ni de ce qu\'il voit des appels actifs', [S.sallesOuvertes(a.dan.id).map(x => x.id).includes(r.id), S.appelActifVue(a.dan.id)], [false, null]);
  v('exclure une SECONDE fois est sans effet (`deja`)', S.salleExclure({ id: r.id, par: a.ana.id, uid: a.dan.id }).deja, true);
  v('⛔ on n\'exclut ni soi-même ni quelqu\'un qui n\'est pas là (`introuvable`) ni l\'hôte (`interdit`)', [lance(() => S.salleExclure({ id: r.id, par: a.ana.id, uid: a.ana.id })), lance(() => S.salleExclure({ id: r.id, par: a.ana.id, uid: a.eve.id })), lance(() => S.salleExclure({ id: r.id, par: a.ben.id, uid: a.ana.id }))], ['introuvable', 'introuvable', 'interdit']);
  S.salleCohote({ id: r.id, par: a.ana.id, uid: a.ben.id, actif: true });
  v('⛔ un CO-HÔTE exclut un participant (Cleo : ok) mais NI l\'hôte (`interdit`) NI un autre co-hôte', [lance(() => S.salleExclure({ id: r.id, par: a.ben.id, uid: a.ana.id })), (() => { S.salleCohote({ id: r.id, par: a.ana.id, uid: a.cleo.id, actif: true }); return lance(() => S.salleExclure({ id: r.id, par: a.ben.id, uid: a.cleo.id })); })()], ['interdit', 'interdit']);
  v('   et l\'HÔTE exclut un co-hôte (Cleo) : « exclu », sans grade', (() => { S.salleExclure({ id: r.id, par: a.ana.id, uid: a.cleo.id }); return [S.appelVue(a.cleo.id, r.id).moi.statut, S.appelVue(a.cleo.id, r.id).moi.grade]; })(), ['exclu', 0]);
  v('⛔ exclure quelqu\'un qui est seulement INVITÉ (il n\'est pas venu) lui ferme aussi la porte', (() => { const b = atelier(); const rb = salle(b); entre(b, rb.id, b.ben); b.S.salleExclure({ id: rb.id, par: b.ana.id, uid: b.cleo.id }); return lance(() => b.S.appelRejoindre({ id: rb.id, uid: b.cleo.id, session: b.sc })); })(), 'exclu');
  v('⛔ un participant sans grade n\'exclut personne : `interdit` ; un étranger non plus : `introuvable`', (() => { const b = atelier(); const rb = salle(b); entre(b, rb.id, b.ben); entre(b, rb.id, b.cleo); return [lance(() => b.S.salleExclure({ id: rb.id, par: b.ben.id, uid: b.cleo.id })), lance(() => b.S.salleExclure({ id: rb.id, par: b.eve.id, uid: b.cleo.id }))]; })(), ['interdit', 'introuvable']);
}

console.log('\nLes réglages de l\'hôte : le verrou, la salle d\'attente, le partage, l\'enregistrement, le co-hôte, la fin pour tous');
{
  const a = atelier(), S = a.S;
  const r = salle(a);
  for (const p of [a.ben, a.cleo]) entre(a, r.id, p);
  v('par défaut : ni verrouillée, ni salle d\'attente, partage permis, pas d\'enregistrement', [S.appelVue(a.ben.id, r.id).verrou, S.appelVue(a.ben.id, r.id).attente, S.appelVue(a.ben.id, r.id).partage_ok, S.appelVue(a.ben.id, r.id).rec], [false, false, true, null]);
  S.salleVerrou(r.id, a.ana.id, true); S.salleAttente(r.id, a.ana.id, true); S.sallePartage(r.id, a.ana.id, false);
  v('l\'hôte règle : verrou, salle d\'attente, partage interdit — chacun le lit', [S.appelVue(a.ben.id, r.id).verrou, S.appelVue(a.ben.id, r.id).attente, S.appelVue(a.ben.id, r.id).partage_ok], [true, true, false]);
  v('⛔ un participant (sans grade) ne règle RIEN (`interdit`), un étranger non plus (`introuvable`), et rien n\'est écrit', (() => { const avant = S.appelVue(a.ana.id, r.id); return [lance(() => S.salleVerrou(r.id, a.ben.id, false)), lance(() => S.salleAttente(r.id, a.ben.id, false)), lance(() => S.sallePartage(r.id, a.ben.id, true)), lance(() => S.salleVerrou(r.id, a.eve.id, false)), JSON.stringify(S.appelVue(a.ana.id, r.id)) === JSON.stringify(avant)]; })(), ['interdit', 'interdit', 'interdit', 'introuvable', true]);
  S.salleCohote({ id: r.id, par: a.ana.id, uid: a.ben.id, actif: true });
  v('un CO-HÔTE règle (verrou levé)', (() => { S.salleVerrou(r.id, a.ben.id, false); return S.appelVue(a.ben.id, r.id).verrou; })(), false);
  /* l'enregistrement : le bandeau « REC » chez tous, tant que celui qui enregistre est là ; l'hôte seul le commence */
  v('⛔ le bandeau REC : seul l\'HÔTE le commence (le co-hôte : `interdit`)', lance(() => S.salleRec(r.id, a.ben.id, true)), 'interdit');
  S.salleRec(r.id, a.ana.id, true);
  v('l\'hôte enregistre : tous le lisent (`rec.par` = l\'hôte), un exclu non', [S.appelVue(a.ben.id, r.id).rec, S.appelVue(a.cleo.id, r.id).rec], [{ par: a.ana.id }, { par: a.ana.id }]);
  v('un co-hôte peut l\'ÉTEINDRE (il retire le bandeau)', (() => { S.salleRec(r.id, a.ben.id, false); return S.appelVue(a.cleo.id, r.id).rec; })(), null);
  S.salleRec(r.id, a.ana.id, true);
  S.appelPartir({ id: r.id, uid: a.ana.id, session: a.sa });
  v('⛔ l\'hôte qui enregistrait PART : le bandeau s\'éteint (personne n\'enregistre plus), et la salle reste ouverte', [S.appelVue(a.cleo.id, r.id).rec, S.appelVue(a.cleo.id, r.id).etat], [null, 'en_cours']);
  /* le co-hôte : l'hôte seul */
  const b = atelier(); const rb = salle(b); for (const p of [b.ben, b.cleo]) entre(b, rb.id, p);
  v('⛔ le co-hôte se nomme par l\'hôte seul (`interdit` sinon) ; on ne nomme ni soi-même ni quelqu\'un qui n\'est pas là (`introuvable`)', [lance(() => b.S.salleCohote({ id: rb.id, par: b.ben.id, uid: b.cleo.id, actif: true })), lance(() => b.S.salleCohote({ id: rb.id, par: b.ana.id, uid: b.ana.id, actif: true })), lance(() => b.S.salleCohote({ id: rb.id, par: b.ana.id, uid: b.eve.id, actif: true }))], ['interdit', 'introuvable', 'introuvable']);
  v('   nommer puis retirer : grade 1 puis 0', (() => { b.S.salleCohote({ id: rb.id, par: b.ana.id, uid: b.ben.id, actif: true }); const g1 = gradeDe(b.S, rb.id, b.ben.id); b.S.salleCohote({ id: rb.id, par: b.ana.id, uid: b.ben.id, actif: false }); return [g1, gradeDe(b.S, rb.id, b.ben.id)]; })(), [1, 0]);
  /* terminer */
  v('⛔ terminer pour tous : l\'hôte seul (`interdit` pour un co-hôte)', (() => { b.S.salleCohote({ id: rb.id, par: b.ana.id, uid: b.ben.id, actif: true }); return lance(() => b.S.salleTerminer({ id: rb.id, par: b.ben.id })); })(), 'interdit');
  const t = b.S.salleTerminer({ id: rb.id, par: b.ana.id });
  v('l\'hôte termine : « fini », motif « termine », tout le monde est « parti », personne n\'est plus actif', [t.etat, b.S.appelVue(b.ana.id, rb.id).motif, statuts(b.S, rb.id, [b.ana.id, b.ben.id, b.cleo.id]), [b.ana, b.ben, b.cleo].map(p => b.S.appelActifDe(p.id))], ['fini', 'termine', ['parti', 'parti', 'parti'], [null, null, null]]);
  v('⛔ un réglage sur une salle FINIE, ou la terminer une seconde fois : `appel_fini` (la route le dit 409 ; la garde, elle, refuse déjà l\'ex-hôte, qui n\'est plus PRÉSENT)', [lance(() => b.S.salleVerrou(rb.id, b.ana.id, true)), lance(() => b.S.salleTerminer({ id: rb.id, par: b.ana.id }))], ['appel_fini', 'appel_fini']);
}

console.log('\nCe que chacun VOIT : la liste des présents à qui est dedans, un exclu rien, les salles à rejoindre');
{
  const a = atelier(), S = a.S;
  const conv = S.convCreerGroupe({ createur: a.ana.id, nom: 'Équipe terrain', membres: [a.ben.id, a.cleo.id, a.dan.id], annonces_seules: false, ephemere_s: 0 }).id;
  const r = salle(a, { invites: [a.ben.id, a.cleo.id], conv });
  a.h.t += SEC; entre(a, r.id, a.ben);
  const vA = S.appelVue(a.ana.id, r.id), vB = S.appelVue(a.ben.id, r.id), vC = S.appelVue(a.cleo.id, r.id);
  v('le titre de la salle est le nom du groupe', [vA.titre, vA.conv === conv], ['Équipe terrain', true]);
  v('⛔ qui est DEDANS lit la liste (présents + invités qui sonnent encore) ; elle porte prénom, nom, grade — jamais de session', [vB.participants.map(p => p.prenom + ':' + p.statut + ':' + p.grade), vB.participants.every(p => !('session' in p))], [['Ana:present:2', 'Ben:present:0', 'Cleo:invite:0'], true]);
  v('⛔ qui sonne encore (Cleo) ne la lit pas : seulement combien sont dedans', [vC.participants, vC.nb], [[], 2]);
  v('« ma » ligne : l\'état, le grade, le passage', [vB.moi, vC.moi], [{ statut: 'present', grade: 0, gen: 1 }, { statut: 'invite', grade: 0, gen: 0 }]);
  v('les salles à REJOINDRE d\'un membre du groupe : celle-ci (Dan n\'y est pas encore), avec son titre et le nombre de présents ; Cleo, qui sonne, la voit aussi', [S.sallesOuvertes(a.dan.id).map(x => [x.id === r.id, x.titre, x.nb, x.capacite, x.genre]), S.sallesOuvertes(a.cleo.id).length], [[[true, 'Équipe terrain', 2, 4, 'groupe']], 1]);
  v('   mais pas celle où l\'on est déjà PRÉSENT (Ben), ni celle d\'un groupe où l\'on n\'est pas (Eve)', [S.sallesOuvertes(a.ben.id), S.sallesOuvertes(a.eve.id)], [[], []]);
  v('⛔ un membre RETIRÉ du groupe n\'a plus la salle dans ses salles à rejoindre, et n\'y entre pas (`introuvable`)', (() => { S.membreRetirer({ conv, par: a.ana.id, uid: a.dan.id }); return [S.sallesOuvertes(a.dan.id), lance(() => S.appelRejoindre({ id: r.id, uid: a.dan.id, session: a.sd }))]; })(), [[], 'introuvable']);
  v('le roster d\'une salle finie reste lisible de ceux qui y étaient (l\'historique), jamais des autres', (() => { S.appelPartir({ id: r.id, uid: a.ben.id, session: a.sb }); S.salleTerminer({ id: r.id, par: a.ana.id }); return [S.appelVue(a.ana.id, r.id).etat, S.appelVue(a.eve.id, r.id)]; })(), ['fini', null]);
}

console.log('\n⛔ Une sonnerie échue : UN manqué par invité, une fois — la salle continue pour ceux qui y sont, ou finit si l\'hôte est resté seul');
{
  const a = atelier(), S = a.S;
  const r = salle(a);
  a.h.t += 5 * SEC; entre(a, r.id, a.ben);
  v('avant l\'échéance : rien à échoir', S.appelsEchoir(a.h.t + SONNERIE - 6 * SEC), []);
  a.h.t += SONNERIE;
  const f = S.appelsEchoir(a.h.t);
  v('à l\'échéance : Cleo et Dan (qui sonnaient encore) ont MANQUÉ, une notification chacun ; Ben, qui est entré, n\'a rien', [f.length, f[0].groupe, f[0].notifs.length, statuts(S, r.id, [a.cleo.id, a.dan.id, a.ben.id]), manques(S, a.cleo.id).length, manques(S, a.dan.id).length, manques(S, a.ben.id).length], [1, true, 2, ['manque', 'manque', 'present'], 1, 1, 0]);
  v('   la salle COURT toujours (deux présents), les manqués sont dans leur historique « manqués »', [S.appelVue(a.ana.id, r.id).etat, S.appelsListe(a.cleo.id, { manques: true }).length], ['en_cours', 1]);
  a.h.t += 10 * SEC;
  const avant = [evenementsAppel(S, a.cleo.id).length, manques(S, a.cleo.id).length];
  v('⛔ un SECOND passage ne refait RIEN : ni événement ni notification', [S.appelsEchoir(a.h.t), evenementsAppel(S, a.cleo.id).length, manques(S, a.cleo.id).length], [[], avant[0], avant[1]]);
  v('un manqué ne REVIENT pas dans la salle comme invité : il peut la rejoindre (il est membre/invité), `gen` 1', (() => { const x = S.appelRejoindre({ id: r.id, uid: a.cleo.id, session: a.sc }); return [x.vue.moi.statut, x.vue.moi.gen]; })(), ['present', 1]);
  /* l'hôte resté seul à l'échéance : la salle finit « manquée » */
  const b = atelier(), S2 = b.S;
  const rb = salle(b);
  b.h.t += SONNERIE;
  const fb = S2.appelsEchoir(b.h.t);
  v('⛔ personne n\'est venu : à l\'échéance la salle finit « manquée » (fin = l\'échéance), l\'hôte est libre, trois manqués notifiés', [fb.length, S2.appelVue(b.ana.id, rb.id).etat, S2.appelVue(b.ana.id, rb.id).fin - S2.appelVue(b.ana.id, rb.id).debut, S2.appelActifDe(b.ana.id), manques(S2, b.ben.id).length + manques(S2, b.cleo.id).length + manques(S2, b.dan.id).length], [1, 'manque', SONNERIE, null, 3]);
  /* un invité bloqué par l'hôte : aucune notification d'un auteur bloqué */
  const c = atelier(), S3 = c.S;
  S3.contactEtat(c.ben.id, c.ana.id, 'bloque');
  const rc = salle(c, { invites: [c.ben.id, c.cleo.id] });
  c.h.t += SONNERIE; S3.appelsEchoir(c.h.t);
  v('⛔ Ben, qui a bloqué Ana, n\'a AUCUNE notification d\'elle (Cleo, si)', [manques(S3, c.ben.id).length, manques(S3, c.cleo.id).length, S3.appelVue(c.ben.id, rc.id).etat], [0, 1, 'manque']);
}

console.log('\nUn compte effacé SORT de la salle ; elle continue pour les autres ; l\'export de l\'historique ne nomme personne');
{
  const a = atelier(), S = a.S;
  const r = salle(a);
  a.h.t += SEC; entre(a, r.id, a.ben);
  a.h.t += SEC; entre(a, r.id, a.cleo);
  S.salleCohote({ id: r.id, par: a.ana.id, uid: a.cleo.id, actif: true });
  const reveil = S.appelsQuitterTout(a.ana.id);
  v('⛔ le compte de l\'HÔTE est effacé : il sort (sa ligne part), le co-hôte (Cleo) prend la main, la salle continue pour les autres', [S.appelAcces(r.id, a.ana.id), gradeDe(S, r.id, a.cleo.id), S.appelVue(a.ben.id, r.id).etat, S.appelVue(a.ben.id, r.id).nb, reveil.sort().join() === [a.ben.id, a.cleo.id, a.dan.id].sort().join()], [null, 2, 'en_cours', 2, true]);
  v('   les autres ne lisent plus Ana : sa ligne a disparu de la salle (et « l\'appelant » avec elle)', [S.appelVue(a.ben.id, r.id).participants.map(p => p.prenom).sort(), S.appelVue(a.ben.id, r.id).autre], [['Ben', 'Cleo', 'Dan'], null]);
  S.appelsQuitterTout(a.ben.id); S.appelsQuitterTout(a.cleo.id);
  v('⛔ les deux derniers présents effacés : la salle FINIT (« fini », motif « compte »), l\'invité resté à la sonnerie (Dan) l\'a MANQUÉ (sa ligne le dit, dans son historique « manqués ») mais n\'est pas notifié — celui qui l\'appelait n\'existe plus —, et n\'est plus « actif »', [S.appelVue(a.dan.id, r.id).etat, S.appelVue(a.dan.id, r.id).motif, S.appelActifDe(a.dan.id), manques(S, a.dan.id).length, S.appelsListe(a.dan.id, { manques: true }).length], ['fini', 'compte', null, 0, 1]);
  const e = S.appelsQuitterTout(a.ana.id);
  v('rejouable : sans appel, rien à faire', e, []);
  /* l'export */
  const b = atelier(), S2 = b.S;
  const rb = salle(b); b.h.t += SEC; entre(b, rb.id, b.ben); b.h.t += 40 * SEC; S2.appelPartir({ id: rb.id, uid: b.ben.id, session: b.sb }); S2.appelPartir({ id: rb.id, uid: b.ana.id, session: b.sa });
  const ex = S2.exportAppels(b.ben.id);
  v('l\'export de Ben : une ligne, `groupe` vrai, l\'identifiant de l\'hôte (jamais de nom)', [ex.length, ex[0].groupe, JSON.stringify(ex).includes('Ana'), Object.keys(ex[0]).sort()], [1, true, false, ['avec_id', 'date', 'duree_s', 'etat', 'groupe', 'id', 'sens', 'type']]);
}

fin();
