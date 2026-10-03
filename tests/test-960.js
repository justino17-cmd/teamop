/* ⛔ CE QUE CE FICHIER GARDE — LES ESPACES PROFESSIONNELS, LEURS CANAUX, LES INVITATIONS ET LA FORMULE, MODULES SEULS (famille 2 de SERVEUR.md § 3.11, étape 5).

   `server-msg/stockage.js` (la migration 5) et `server-msg/formule.js` montés avec le VRAI stockage — un fichier de base, une clé et une horloge injectés. Pas de HTTP ici :
   `test-905` joue les gardes, `test-961` les routes, `test-962` Stripe. Celui-ci dit que ce qui est RANGÉ et DÉCIDÉ est juste :

     · la migration 5 est numérotée, rejouable, garde une copie, et ses quatre tables entrent dans les TROIS listes écrites à la main (le 3 octobre, en oublier une a fait échouer
       chaque sauvegarde) ;
     · un espace : un propriétaire, des membres, un nom scellé au repos ; trois espaces au plus par propriétaire ; un non-membre reçoit « rien », la même chose qu'un espace inexistant ;
     · les INVITATIONS : un lien meurt expiré, révoqué, épuisé — et avec le droit de son créateur ; rejoindre ne consomme rien deux fois ; un code d'espace n'ouvre que les invitations ;
     · les RÔLES et les départs : le propriétaire ne part ni ne se rétrograde (il passe la main) ; qui sort d'un espace sort de TOUS ses canaux, dans la même transaction, et c'est noté ;
     · les CANAUX : une conversation de genre `canal`, public = tous les membres de l'espace, privé = ceux qu'un administrateur y met ; le rôle dans un canal est le rôle dans l'espace ;
       l'administrateur d'un espace ne lit PAS un canal privé dont il n'est pas membre ;
     · les COLLÈGUES : ils s'écrivent sans être contacts, sauf blocage ; « Contacts de l'entreprise » ne liste que MON espace ;
     · un compte effacé sort de ses espaces (la propriété passe, ou l'espace est dissous) ;
     · l'ABONNEMENT rangé : ce que Stripe a dit, jamais ce qu'une requête prétend ; un abonnement ne s'attache qu'à un espace ;
     · la FORMULE : Perso / Pro / impayé décidée par UNE fonction ; le sursis de sept jours se compte entre deux LECTURES de Stripe (une panne ne suspend personne) ; le drapeau de la bêta est
       lu à un seul endroit ;
     · les quatre genres de PURGE neufs sont rejoués hors ligne sur une copie restaurée — et ce qui est arrivé APRÈS l'effacement n'est pas effacé.

   ⚠️ UNE LIMITE ASSUMÉE, jouée ici pour qu'on ne la découvre pas par surprise : un canal PRIVÉ dont le dernier administrateur est parti n'a plus personne qui puisse le gérer (le rôle dans un canal
   est le rôle dans l'espace, et l'administrateur de l'espace n'y est pas membre). Il continue de servir ses membres ; pour le gérer, le propriétaire nomme administrateur de l'espace l'un d'eux.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { creerFormule, SURSIS_MS } = require(path.join(T.SERVICE, 'formule.js'));
const { DatabaseSync } = require('node:sqlite');

const JOUR = 86400000;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-960-'));
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
/* Un code d'invitation à l'espace `e`, créé par `par` : le code en clair (que seule la personne qui le distribue connaît) et son empreinte */
function invitation(S, e, par, { max = 10, jours = 7 } = {}) {
  const code = crypto.randomBytes(16).toString('base64url'), h = sha(code);
  S.lienCreer({ h, genre: 'espace', cible: e, par, ttlMs: jours * JOUR, max });
  return { code, h };
}
const rejoindre = (S, e, par, uid, max = Infinity) => { const i = invitation(S, e, par); return S.invitationAccepter({ h: i.h, uid, max }); };
/* Un espace : Ana propriétaire, Ben puis Cleo membres (arrivés à une seconde d'écart : « le plus ancien » se lit), un canal public (les trois) et un canal privé (Ana, Ben) ; Dan est dehors */
function atelier(opts = {}) {
  const a = neuf(opts), S = a.S;
  const ana = pers(S, 'Ana'), ben = pers(S, 'Ben'), cleo = pers(S, 'Cleo'), dan = pers(S, 'Dan');
  const e = S.espaceCreer({ nom: 'Entreprise ELAN', proprio: ana.id }).id;
  a.h.t += 1000; rejoindre(S, e, ana.id, ben.id); a.h.t += 1000; rejoindre(S, e, ana.id, cleo.id); a.h.t += 1000;
  const pub = S.canalCreer({ espace: e, par: ana.id, nom: 'général', prive: false, membres: [] }).id;
  a.h.t += 1000;   // (deux canaux de la même milliseconde se rangent par identifiant, donc au hasard : l'ordre de la liste se LIT)
  const priv = S.canalCreer({ espace: e, par: ana.id, nom: 'direction', prive: true, membres: [ben.id] }).id;
  return Object.assign(a, { ana, ben, cleo, dan, e, pub, priv });
}
const roleCanal = (S, c, u) => { const m = S.convPourMembre(c, u); return m ? m.moi.role : null; };
const ABO = (o) => Object.assign({ client: 'cus_banc960', abonnement: 'sub_banc960', statut: 'active', places: 5, fin_periode: null, annule: false, impaye: false }, o || {});

console.log('La migration 5 : numérotée, rejouable, avec sa copie, et ses quatre tables dans les TROIS listes');
{
  const DERNIERE = MIGRATIONS[MIGRATIONS.length - 1].v;
  const celle = MIGRATIONS.filter(m => m.sql.some(s => /CREATE TABLE IF NOT EXISTS espace\(/.test(s)));
  v('population : UNE migration crée les espaces, et elle porte le numéro qui suit toutes les précédentes (jamais un numéro supposé)', [celle.length, celle[0] && celle[0].v, MIGRATIONS.filter(m => m.v < (celle[0] || {}).v).length], [1, 5, 4]);
  vrai('elle crée les quatre tables et l\'index unique de l\'abonnement', ['espace(', 'espace_membre(', 'canal(', 'abonnement(', 'abonnement_stripe'].every(m => celle[0].sql.some(s => s.includes(m))));
  const a = neuf();
  v('une base neuve est au schéma de la dernière migration', a.S.schema(), DERNIERE);
  const brut = a.brut();
  const tables = brut.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all().map(r => r.name);
  vrai('les quatre tables existent', ['espace', 'espace_membre', 'canal', 'abonnement'].every(t => tables.includes(t)));
  brut.close();

  /* une base VIVANTE au schéma 4 (avant les espaces) reçoit la migration 5 : ses données restent, et une copie « avant-v5 » est gardée */
  const anciennes = MIGRATIONS.filter(m => m.v <= 4);
  const b = neuf({ migrations: anciennes });
  const ana = pers(b.S, 'Ana'), ben = pers(b.S, 'Ben');
  b.S.contactLier(ana.id, ben.id);
  v('population : une base du schéma 4, sans espace, avec des données', [b.S.schema(), b.S.contactsDe(ana.id).length], [4, 1]);
  b.S.fermer();
  const c = ouvrir({ chemin: b.chemin, scelleur: creerScelleur(b.kek), horloge: () => b.h.t });
  v('rouverte avec la migration 5 : schéma 5, données intactes', [c.schema(), c.contactsDe(ana.id).length], [DERNIERE, 1]);
  vrai('⛔ une copie « avant-v5 » est gardée avant de migrer une base qui a vécu', fs.existsSync(b.chemin + '.avant-v5'));
  const copie = new DatabaseSync(b.chemin + '.avant-v5');
  v('la copie est la base d\'AVANT : schéma 4, sans la table des espaces', [copie.prepare('PRAGMA user_version').get().user_version, compte(copie, `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'espace'`)], [4, 0]);
  copie.close();

  /* rejouable : le compteur remis à 4 sur une base qui porte DÉJÀ des espaces — la migration repasse sur des tables existantes sans rien effacer */
  const e0 = c.espaceCreer({ nom: 'Rejouée', proprio: ana.id }).id;
  c.fermer();
  const r = b.brut(); r.exec('PRAGMA user_version = 4'); r.close();
  let rejoue = null, d;
  try { d = ouvrir({ chemin: b.chemin, scelleur: creerScelleur(b.kek), horloge: () => b.h.t }); rejoue = [d.schema(), d.espacePourMembre(e0, ana.id).espace.nom]; } catch (e) { rejoue = 'ERREUR ' + e.message; }
  v('⛔ la migration 5 rejouée sur une base qui porte déjà des espaces ne casse rien et n\'efface rien', rejoue, [DERNIERE, 'Rejouée']);
  if (d) d.fermer();

  /* l'index unique : un abonnement Stripe ne s'attache qu'à UN espace, même par SQL direct */
  const w = atelier();
  w.S.abonnementPoser(w.e, ABO({ client: 'cus_unique', abonnement: 'sub_unique' }), { adopter: true });
  const autre = w.S.espaceCreer({ nom: 'Autre', proprio: w.ben.id }).id;
  v('⛔ le même abonnement Stripe sur un AUTRE espace est refusé (`abonnement_pris`)', lance(() => w.S.abonnementPoser(autre, ABO({ client: 'cus_unique', abonnement: 'sub_unique' }), { adopter: true })), 'abonnement_pris');
  const bw = w.brut();
  w.S.abonnementSession(autre, 'cs_pour_autre');
  v('… et l\'index le refuse aussi sans passer par le module (SQL direct)', lance(() => bw.prepare(`UPDATE abonnement SET abonnement = 'sub_unique' WHERE espace = ?`).run(autre)) !== null, true);

  /* les clés étrangères en cascade : dissoudre l'espace (ligne) emporte ses membres, ses canaux et son abonnement */
  const avant = [compte(bw, 'SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', w.e), compte(bw, 'SELECT COUNT(*) AS n FROM canal WHERE espace = ?', w.e), compte(bw, 'SELECT COUNT(*) AS n FROM abonnement WHERE espace = ?', w.e)];
  vrai('population avant : des membres, des canaux et un abonnement à emporter (' + avant.join(' · ') + ')', avant.every(x => x > 0));
  bw.exec('PRAGMA foreign_keys = ON');
  bw.prepare('DELETE FROM espace WHERE id = ?').run(w.e);
  v('⛔ supprimer la ligne de l\'espace emporte ses membres, ses canaux et son abonnement (ON DELETE CASCADE)', [compte(bw, 'SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', w.e), compte(bw, 'SELECT COUNT(*) AS n FROM canal WHERE espace = ?', w.e), compte(bw, 'SELECT COUNT(*) AS n FROM abonnement WHERE espace = ?', w.e)], [0, 0, 0]);
  bw.close();

  /* ⛔ LES TROIS LISTES écrites à la main disent les quatre tables */
  const tabl = ['espace', 'espace_membre', 'canal', 'abonnement'];
  const y = atelier();
  const cop = ouvrir.copie.controlerFichier(y.chemin);
  vrai('⛔ `TABLES_COMPTEES` (la sauvegarde) nomme les quatre tables neuves', tabl.every(t => ouvrir.copie.TABLES_COMPTEES.includes(t)));
  vrai('⛔ la sonde de la base vivante (`sonde().nonVides`) les nomme avec un vrai booléen', tabl.every(t => typeof y.S.sonde().nonVides[t] === 'boolean'));
  vrai('⛔ le comptage d\'une copie (`lignes`) les compte avec un vrai nombre', cop.ok && tabl.every(t => Number.isInteger(cop.lignes[t])));
  v('population : l\'espace de l\'atelier est bien compté (1 espace, 3 membres, 2 canaux) — les trois listes ne disent pas « zéro » par défaut', [cop.lignes.espace, cop.lignes.espace_membre, cop.lignes.canal], [1, 3, 2]);
  const noms = (o) => JSON.stringify(Object.keys(o).sort());
  vrai('les trois listes disent les mêmes tables', noms(cop.lignes) === JSON.stringify(ouvrir.copie.TABLES_COMPTEES.slice().sort()) && noms(y.S.sonde().nonVides) === JSON.stringify(ouvrir.copie.TABLES_COMPTEES.slice().sort()));
}

console.log('\nUn espace : propriétaire, membres, nom scellé, trois au plus — et un non-membre ne voit RIEN');
{
  const a = neuf(), S = a.S;
  const ana = pers(S, 'Ana'), ben = pers(S, 'Ben');
  const e = S.espaceCreer({ nom: 'SOCIETEZXCANARIQESPACE', proprio: ana.id });
  vrai('l\'identifiant d\'un espace est long et aléatoire (`e_` et 32 hexadécimaux), jamais devinable', /^e_[0-9a-f]{32}$/.test(e.id));
  const m = S.espacePourMembre(e.id, ana.id);
  v('le créateur est propriétaire ET administrateur de son espace', [m.espace.proprio, m.moi.role, m.espace.nom], [ana.id, 'admin', 'SOCIETEZXCANARIQESPACE']);
  vrai('population : la base contient des octets à examiner', octets(a.chemin).length > 8192);
  v('⛔ le NOM de l\'espace n\'apparaît pas en clair sur le disque (scellé)', octets(a.chemin).includes(Buffer.from('ZXCANARIQESPACE')), false);
  v('⛔ un non-membre reçoit `null` — exactement la même chose qu\'un espace qui n\'existe pas', [S.espacePourMembre(e.id, ben.id), S.espacePourMembre('e_' + '0'.repeat(32), ben.id)], [null, null]);
  v('… et il n\'a aucun espace dans sa liste ; Ana a le sien', [S.espacesDe(ben.id).length, S.espacesDe(ana.id).map(x => [x.nom, x.role, x.proprio, x.membres_n])], [0, [['SOCIETEZXCANARIQESPACE', 'admin', ana.id, 1]]]);
  v('renommer : `change` dit vrai, puis faux pour le même nom', [S.espaceMaj({ id: e.id, nom: 'Nouveau nom' }).change, S.espaceMaj({ id: e.id, nom: 'Nouveau nom' }).change, S.espacePourMembre(e.id, ana.id).espace.nom], [true, false, 'Nouveau nom']);
  v('renommer un espace qui n\'existe pas : `introuvable`', lance(() => S.espaceMaj({ id: 'e_' + '1'.repeat(32), nom: 'x' })), 'introuvable');
  /* trois espaces au plus par propriétaire */
  S.espaceCreer({ nom: 'Deux', proprio: ana.id }); S.espaceCreer({ nom: 'Trois', proprio: ana.id });
  v('population : Ana possède trois espaces', S.espacesDe(ana.id).filter(x => x.proprio === ana.id).length, 3);
  v('⛔ un quatrième est refusé (`trop_d_espaces`), et rien n\'est créé', [lance(() => S.espaceCreer({ nom: 'Quatre', proprio: ana.id })), S.espacesDe(ana.id).length], ['trop_d_espaces', 3]);
  /* vingt appartenances au plus : une personne ne se laisse pas inscrire dans mille espaces */
  const z = pers(S, 'Zed'), d = S.espaceCreer({ nom: 'Cible', proprio: ben.id }).id;
  const proprios = Array.from({ length: 7 }, (_, i) => pers(S, 'P' + i));
  let reussies = 0;
  for (const p of proprios) for (let k = 0; k < 3; k++) { const x = S.espaceCreer({ nom: 'E' + p.prenom + k, proprio: p.id }).id; if (lance(() => rejoindre(S, x, p.id, z.id)) === null) reussies++; }
  v('population : Zed a rejoint vingt espaces (' + reussies + ')', S.espacesDe(z.id).length, 20);
  v('⛔ le vingt-et-unième est refusé (`trop_d_espaces`) : on ne s\'inscrit pas dans mille espaces', lance(() => rejoindre(S, d, ben.id, z.id)), 'trop_d_espaces');
}

console.log('\nLes invitations : un lien expire, se révoque, s\'épuise — et meurt avec le droit de son créateur');
{
  const w = atelier(), S = w.S;
  const i = invitation(S, w.e, w.ana.id, { max: 2, jours: 3 });
  const ap = S.invitationApercu(i.h);
  v('l\'aperçu dit l\'espace (son nom, le nombre de membres) et qui invite — rien d\'autre', [Object.keys(ap).sort(), Object.keys(ap.espace).sort(), ap.espace.nom, ap.espace.membres, ap.par.prenom], [['espace', 'genre', 'par'], ['membres', 'nom'], 'Entreprise ELAN', 3, 'Ana']);
  v('⛔ un code inconnu ne dit rien (`null`), comme un code expiré', [S.invitationApercu(sha('inconnu')), S.invitationEspace(sha('inconnu'))], [null, null]);
  v('population : Dan n\'est dans aucun espace', S.espacesDe(w.dan.id).length, 0);
  const r1 = S.invitationAccepter({ h: i.h, uid: w.dan.id, max: Infinity });
  v('accepter : membre (pas administrateur), de l\'espace, et du canal PUBLIC — pas du privé', [r1.deja, S.espacePourMembre(w.e, w.dan.id).moi.role, S.convPourMembre(w.pub, w.dan.id) !== null, S.convPourMembre(w.priv, w.dan.id)], [false, 'membre', true, null]);
  vrai('il ne lit que ce qui SUIT son arrivée dans le canal public (comme un groupe)', S.convPourMembre(w.pub, w.dan.id).moi.depuis_seq > 1);
  const restants = () => w.brut().prepare('SELECT restants FROM lien WHERE h = ?').get(i.h).restants;
  const avantRestants = restants();
  const r2 = S.invitationAccepter({ h: i.h, uid: w.dan.id, max: Infinity });
  v('⛔ rejoindre une seconde fois ne consomme rien (`deja`), et ne recrée rien', [r2.deja, restants(), S.espaceMembresN(w.e)], [true, avantRestants, 4]);
  /* épuisé : max 2 — Dan en a pris une, Eve la seconde, Fred est refusé */
  const eve = pers(S, 'Eve'), fred = pers(S, 'Fred');
  S.invitationAccepter({ h: i.h, uid: eve.id, max: Infinity });
  v('⛔ épuisé (deux utilisations) : le troisième est refusé (`lien_invalide`), sans effet', [lance(() => S.invitationAccepter({ h: i.h, uid: fred.id, max: Infinity })), S.espacesDe(fred.id).length, S.invitationApercu(i.h)], ['lien_invalide', 0, null]);
  /* expiré */
  const j = invitation(S, w.e, w.ana.id, { max: 5, jours: 1 });
  w.h.t += 2 * JOUR;
  v('⛔ expiré : plus d\'aperçu, plus d\'acceptation', [S.invitationApercu(j.h), lance(() => S.invitationAccepter({ h: j.h, uid: fred.id, max: Infinity })), S.espacesDe(fred.id).length], [null, 'lien_invalide', 0]);
  /* révoqué : tous les liens vivants, chacun NOTÉ */
  const k1 = invitation(S, w.e, w.ana.id), k2 = invitation(S, w.e, w.ana.id);
  vrai('population : au moins deux liens vivants à révoquer (et un troisième, d\'un AUTRE espace, qui ne doit pas bouger)', S.invitationsVivantes(w.e) >= 2);
  const autre = S.espaceCreer({ nom: 'Autre', proprio: w.dan.id }).id, ka = invitation(S, autre, w.dan.id);
  const purgeAvant = S.purgeLignes().filter(x => x.genre === 'invitation').length;
  const nrev = S.invitationsRevoquer(w.e);
  vrai('révoquer rend le nombre de liens révoqués (' + nrev + ')', nrev >= 2);
  v('⛔ chaque lien révoqué est NOTÉ dans le registre des purges (genre `invitation`, l\'empreinte — jamais le code)', [S.purgeLignes().filter(x => x.genre === 'invitation').length - purgeAvant, S.purgeLignes().some(x => x.genre === 'invitation' && x.objet === k1.h), S.purgeLignes().some(x => x.objet === k1.code)], [nrev, true, false]);
  v('… les codes ne rouvrent plus rien, celui d\'un autre espace si', [S.invitationApercu(k1.h), S.invitationApercu(k2.h), lance(() => S.invitationAccepter({ h: k1.h, uid: fred.id, max: Infinity })), S.invitationApercu(ka.h) !== null], [null, null, 'lien_invalide', true]);
  v('révoquer ne compte plus rien à la seconde fois', S.invitationsRevoquer(w.e), 0);
  /* ⛔ le lien meurt avec le droit de son créateur : rétrogradé, retiré ou parti */
  const b = invitation(S, w.e, w.ben.id);
  v('population : Ben est membre simple — son lien ne vaut rien (il n\'est pas administrateur)', [S.invitationApercu(b.h), lance(() => S.invitationAccepter({ h: b.h, uid: fred.id, max: Infinity }))], [null, 'lien_invalide']);
  S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: true });
  const b2 = invitation(S, w.e, w.ben.id);
  vrai('promu administrateur, le lien qu\'il crée ouvre la porte', S.invitationApercu(b2.h) !== null);
  S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: false });
  v('⛔ RÉTROGRADÉ, le lien qu\'il avait distribué ne vaut plus rien', [S.invitationApercu(b2.h), lance(() => S.invitationAccepter({ h: b2.h, uid: fred.id, max: Infinity }))], [null, 'lien_invalide']);
  S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: true });
  const b3 = invitation(S, w.e, w.ben.id);
  vrai('population : promu de nouveau, son nouveau lien ouvre la porte', S.invitationApercu(b3.h) !== null);
  S.espaceMembreRetirer({ espace: w.e, uid: w.ben.id });
  v('⛔ RETIRÉ de l\'espace, son lien ne vaut plus rien', [S.invitationApercu(b3.h), lance(() => S.invitationAccepter({ h: b3.h, uid: fred.id, max: Infinity })), S.espacesDe(fred.id).length], [null, 'lien_invalide', 0]);
  /* complet : les places payées bornent */
  const g = atelier(), c = invitation(g.S, g.e, g.ana.id, { max: 9 });
  const restantsG = () => g.brut().prepare('SELECT restants FROM lien WHERE h = ?').get(c.h).restants;
  v('⛔ un espace COMPLET refuse (`espace_complet`) sans consommer le lien', [lance(() => g.S.invitationAccepter({ h: c.h, uid: g.dan.id, max: 3 })), restantsG(), g.S.espacesDe(g.dan.id).length], ['espace_complet', 9, 0]);
  v('… avec une place de plus, le même lien ouvre', [lance(() => g.S.invitationAccepter({ h: c.h, uid: g.dan.id, max: 4 })), g.S.espacesDe(g.dan.id).length, restantsG()], [null, 1, 8]);
  /* ⛔ UN CODE D'ESPACE N'OUVRE QUE LES INVITATIONS : ni contact, ni groupe */
  const h = atelier(), z = invitation(h.S, h.e, h.ana.id);
  v('⛔ par la route des contacts et des groupes, un code d\'espace ne dit rien (`lienApercu` null) et n\'accepte rien (`lien_invalide`)', [h.S.lienApercu(z.h), lance(() => h.S.lienAccepter({ h: z.h, uid: h.dan.id })), h.S.contactsDe(h.dan.id).length, h.S.espacesDe(h.dan.id).length], [null, 'lien_invalide', 0, 0]);
}

console.log('\nLes rôles et les départs : le propriétaire passe la main ; qui sort d\'un espace sort de TOUS ses canaux, et c\'est noté');
{
  const w = atelier(), S = w.S;
  v('population : Ben est membre simple de l\'espace, du canal public ET du privé, au même rôle', [S.espacePourMembre(w.e, w.ben.id).moi.role, roleCanal(S, w.pub, w.ben.id), roleCanal(S, w.priv, w.ben.id)], ['membre', 'membre', 'membre']);
  v('⛔ promu administrateur de l\'espace : administrateur de ses DEUX canaux (le rôle dans un canal est le rôle dans l\'espace)', [S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: true }).change, roleCanal(S, w.pub, w.ben.id), roleCanal(S, w.priv, w.ben.id), roleCanal(S, w.pub, w.cleo.id)], [true, 'admin', 'admin', 'membre']);
  v('… le canal privé où Cleo n\'est pas ne change rien pour elle', roleCanal(S, w.priv, w.cleo.id), null);
  v('rétrogradé : membre partout', [S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: false }).change, roleCanal(S, w.pub, w.ben.id), roleCanal(S, w.priv, w.ben.id)], [true, 'membre', 'membre']);
  v('redire le rôle qu\'on a déjà ne change rien (`change` faux)', S.espaceRoleMembre({ espace: w.e, uid: w.ben.id, admin: false }).change, false);
  v('⛔ le PROPRIÉTAIRE ne se rétrograde pas, ne se retire pas, ne part pas (`proprio`)', [lance(() => S.espaceRoleMembre({ espace: w.e, uid: w.ana.id, admin: false })), lance(() => S.espaceMembreRetirer({ espace: w.e, uid: w.ana.id })), S.espacePourMembre(w.e, w.ana.id).moi.role], ['proprio', 'proprio', 'admin']);
  v('un rôle ou un retrait pour quelqu\'un qui n\'est pas dans l\'espace : `introuvable`', [lance(() => S.espaceRoleMembre({ espace: w.e, uid: w.dan.id, admin: true })), lance(() => S.espaceMembreRetirer({ espace: w.e, uid: w.dan.id }))], ['introuvable', 'introuvable']);

  /* retirer Ben : il sort de l'espace ET de ses deux canaux, et c'est NOTÉ (avec l'heure : un membre revenu APRÈS ne sera pas effacé par un rejeu) */
  const avant = S.purgeLignes().filter(x => x.genre === 'espace_membre').length;
  w.h.t += 5000;
  const r = S.espaceMembreRetirer({ espace: w.e, uid: w.ben.id });
  v('⛔ retirer Ben : il sort de l\'espace ET de ses deux canaux, public et privé', [S.espacePourMembre(w.e, w.ben.id), S.convPourMembre(w.pub, w.ben.id), S.convPourMembre(w.priv, w.ben.id), r.convs.slice().sort()], [null, null, null, [w.pub, w.priv].slice().sort()]);
  const lignes = S.purgeLignes().filter(x => x.genre === 'espace_membre');
  v('⛔ c\'est NOTÉ dans le registre des purges : une ligne `espace|personne|date`', [lignes.length - avant, lignes[lignes.length - 1].objet, lignes[lignes.length - 1].quand], [1, w.e + '|' + w.ben.id + '|' + w.h.t, w.h.t]);
  vrai('… les autres membres, eux, restent dans les canaux', S.convPourMembre(w.pub, w.cleo.id) !== null && S.convPourMembre(w.priv, w.ana.id) !== null);
  v('un membre retiré ne revient pas tout seul : sans nouvelle invitation, rien', [S.espacesDe(w.ben.id).length, S.canauxVisibles(w.e, w.ben.id).length], [0, 0]);

  /* quitter : le même geste que se faire retirer (Cleo part, avec ses canaux) */
  const x = S.espaceMembreRetirer({ espace: w.e, uid: w.cleo.id });
  v('quitter est sortir de tout, comme être retiré', [S.espacePourMembre(w.e, w.cleo.id), S.canauxVisibles(w.e, w.cleo.id).length, x.convs], [null, 0, [w.pub]]);

  /* un canal PRIVÉ dont le dernier membre part disparaît (pièces comprises), et le registre dit la conversation */
  const t = atelier(), T2 = t.S;
  T2.espaceRoleMembre({ espace: t.e, uid: t.ben.id, admin: true });
  const rh = T2.canalCreer({ espace: t.e, par: t.ben.id, nom: 'rh', prive: true, membres: [t.cleo.id] }).id;
  vrai('population : le canal « rh » a deux membres (Ben, Cleo) et Ana n\'en est pas', T2.membresActifs(rh).length === 2 && T2.convPourMembre(rh, t.ana.id) === null);
  T2.espaceMembreRetirer({ espace: t.e, uid: t.ben.id });
  vrai('Ben parti, le canal reste avec Cleo (il sert encore ses membres)', T2.canalDe(rh) !== null && T2.membresActifs(rh).join() === t.cleo.id);
  v('⚠️ LIMITE ASSUMÉE : plus aucun administrateur de l\'espace n\'y est membre — Ana ne le voit pas, ne le gère pas (`canalPourAdmin` rend null)', [T2.convPourMembre(rh, t.ana.id), T2.canalPourAdmin(t.e, rh, t.ana.id), T2.canalPourAdmin(t.e, rh, t.cleo.id)], [null, null, null]);
  T2.espaceRoleMembre({ espace: t.e, uid: t.cleo.id, admin: true });
  vrai('… et le remède est écrit : nommer administrateur de l\'espace l\'un de ses membres lui rend le canal', T2.canalPourAdmin(t.e, rh, t.cleo.id) !== null);
  const conv0 = T2.purgeLignes().filter(x => x.genre === 'conversation').length;
  T2.espaceRoleMembre({ espace: t.e, uid: t.cleo.id, admin: false });
  const rr = T2.espaceMembreRetirer({ espace: t.e, uid: t.cleo.id });
  v('⛔ le DERNIER membre d\'un canal privé qui part emporte le canal (et le registre dit la conversation effacée)', [T2.canalDe(rh), T2.purgeLignes().filter(x => x.genre === 'conversation').length - conv0, T2.purgeLignes().some(x => x.genre === 'conversation' && x.objet === rh), Array.isArray(rr.pieces)], [null, 1, true, true]);

  /* passer la main */
  const u = atelier(), U = u.S;
  v('⛔ passer la main : Ben est propriétaire ET administrateur, Ana reste administrateur ; dans les canaux aussi', [(() => { const r2 = U.espaceTransferer({ espace: u.e, de: u.ana.id, vers: u.ben.id }); return r2.convs.length; })(), U.espacePourMembre(u.e, u.ben.id).espace.proprio === u.ben.id, U.espacePourMembre(u.e, u.ben.id).moi.role, U.espacePourMembre(u.e, u.ana.id).moi.role, roleCanal(U, u.pub, u.ben.id)], [2, true, 'admin', 'admin', 'admin']);
  v('⛔ Ana, qui n\'est plus propriétaire, ne peut plus passer la main (`interdit`), et peut maintenant partir', [lance(() => U.espaceTransferer({ espace: u.e, de: u.ana.id, vers: u.cleo.id })), lance(() => U.espaceMembreRetirer({ espace: u.e, uid: u.ana.id }))], ['interdit', null]);
  const t2 = atelier(), V = t2.S;
  v('⛔ passer la main refuse : à soi-même, à qui n\'est pas dans l\'espace, à un compte dont la suppression est programmée, à qui possède déjà trois espaces',
    [lance(() => V.espaceTransferer({ espace: t2.e, de: t2.ana.id, vers: t2.ana.id })), lance(() => V.espaceTransferer({ espace: t2.e, de: t2.ana.id, vers: t2.dan.id })),
      (() => { V.suppressionProgrammer(t2.ben.id, t2.h.t + JOUR); return lance(() => V.espaceTransferer({ espace: t2.e, de: t2.ana.id, vers: t2.ben.id })); })(),
      (() => { for (let k = 0; k < 3; k++) V.espaceCreer({ nom: 'Possédé ' + k, proprio: t2.cleo.id }); return lance(() => V.espaceTransferer({ espace: t2.e, de: t2.ana.id, vers: t2.cleo.id })); })()],
    ['champ_invalide', 'introuvable', 'destinataire_invalide', 'trop_d_espaces']);
  v('… et un espace qui n\'existe pas : `introuvable` ; rien n\'a changé de propriétaire', [lance(() => V.espaceTransferer({ espace: 'e_' + '2'.repeat(32), de: t2.ana.id, vers: t2.ben.id })), V.espacePourMembre(t2.e, t2.ana.id).espace.proprio === t2.ana.id], ['introuvable', true]);
}

console.log('\nDissoudre un espace : ses canaux, leurs messages, ses invitations, son abonnement — tout part, et c\'est noté');
{
  const w = atelier(), S = w.S;
  S.messageEnvoyer({ conv: w.pub, auteur: w.ana.id, cid: 'cid-diss-0001', texte: 'bonjour tous' });
  S.messageEnvoyer({ conv: w.priv, auteur: w.ben.id, cid: 'cid-diss-0002', texte: 'direction' });
  const i = invitation(S, w.e, w.ana.id);
  S.abonnementPoser(w.e, ABO({ abonnement: 'sub_diss' }), { adopter: true });
  const d = w.brut();
  const cle = (sql, ...p) => compte(d, sql, ...p);
  const avant = [cle('SELECT COUNT(*) AS n FROM message WHERE conv IN (?, ?)', w.pub, w.priv) > 0, cle(`SELECT COUNT(*) AS n FROM lien WHERE genre = 'espace' AND cible = ?`, w.e) > 0, cle('SELECT COUNT(*) AS n FROM abonnement WHERE espace = ?', w.e) > 0, cle('SELECT COUNT(*) AS n FROM conversation WHERE id IN (?, ?)', w.pub, w.priv)];
  v('population avant : des messages, une invitation vivante, un abonnement et deux canaux à emporter', avant, [true, true, true, 2]);
  const purgeAvant = S.purgeLignes().length;
  const r = S.espaceSupprimer(w.e);
  v('⛔ dissoudre emporte l\'espace, ses membres, ses canaux (conversations ET messages), ses invitations et son abonnement', [S.espaceBrut(w.e), cle('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', w.e), cle('SELECT COUNT(*) AS n FROM canal WHERE espace = ?', w.e), cle('SELECT COUNT(*) AS n FROM conversation WHERE id IN (?, ?)', w.pub, w.priv), cle('SELECT COUNT(*) AS n FROM message WHERE conv IN (?, ?)', w.pub, w.priv), cle(`SELECT COUNT(*) AS n FROM lien WHERE genre = 'espace' AND cible = ?`, w.e), cle('SELECT COUNT(*) AS n FROM abonnement WHERE espace = ?', w.e)], [null, 0, 0, 0, 0, 0, 0]);
  v('… il rend ceux à prévenir (les trois membres) et les canaux touchés', [r.membres.slice().sort(), r.convs.slice().sort()], [[w.ana.id, w.ben.id, w.cleo.id].sort(), [w.pub, w.priv].sort()]);
  const reg = S.purgeLignes().slice(purgeAvant);
  v('⛔ c\'est NOTÉ : l\'espace (`espace`) ET chaque canal (`conversation`) — une archive d\'avant ne les ramène pas', [reg.filter(x => x.genre === 'espace').map(x => x.objet), reg.filter(x => x.genre === 'conversation').map(x => x.objet).sort()], [[w.e], [w.pub, w.priv].sort()]);
  v('un invité qui garde le code ne rouvre plus rien', [S.invitationApercu(i.h), lance(() => S.invitationAccepter({ h: i.h, uid: w.dan.id, max: Infinity }))], [null, 'lien_invalide']);
  v('dissoudre un espace déjà dissous : `introuvable`', lance(() => S.espaceSupprimer(w.e)), 'introuvable');
}

console.log('\nLes canaux : une conversation de genre `canal` ; public = tous les membres, privé = ceux qu\'on y met');
{
  const w = atelier(), S = w.S;
  v('le canal public : tous les membres de l\'espace, au rôle qu\'ils y ont ; il dit son espace', [S.membresActifs(w.pub).slice().sort(), roleCanal(S, w.pub, w.ana.id), roleCanal(S, w.pub, w.ben.id), S.canalDe(w.pub)], [[w.ana.id, w.ben.id, w.cleo.id].sort(), 'admin', 'membre', { espace: w.e, prive: false }]);
  v('le canal privé : le créateur et ceux qu\'il a choisis, personne d\'autre — pas même Cleo, membre de l\'espace', [S.membresActifs(w.priv).slice().sort(), S.convPourMembre(w.priv, w.cleo.id), S.canalDe(w.priv)], [[w.ana.id, w.ben.id].sort(), null, { espace: w.e, prive: true }]);
  const cv = S.convPourMembre(w.priv, w.ana.id).conv;
  v('une conversation de genre `canal` : son type, son espace et sa confidentialité sont dits à ses membres', [cv.type, cv.espace, cv.prive], ['canal', w.e, true]);
  vrai('le canal garde le nom scellé comme un groupe (jamais en clair sur le disque)', !octets(w.chemin).includes(Buffer.from('direction')) && S.convPourMembre(w.priv, w.ana.id).conv.nom === 'direction');
  const premier = S.messagesDe(w.pub, w.ana.id).messages[0];
  v('⛔ sa création est un message système (`canal_cree`), comme un groupe qui naît', [premier.type, premier.meta && premier.meta.k], ['systeme', 'canal_cree']);
  v('la liste des conversations de Cleo : le canal public, avec son espace — pas le privé', S.convListe(w.cleo.id).map(c => [c.type, c.espace || null, c.prive === undefined ? null : c.prive]), [['canal', w.e, false]]);
  v('⛔ qui ne fait pas partie de l\'espace ne voit AUCUN canal : ni dans la liste de l\'espace, ni par la conversation', [S.canauxVisibles(w.e, w.dan.id), S.convPourMembre(w.pub, w.dan.id)], [[], null]);
  v('les canaux visibles : Ana les deux, Cleo le public seulement', [S.canauxVisibles(w.e, w.ana.id).map(c => [c.nom, c.prive, c.membres_n]), S.canauxVisibles(w.e, w.cleo.id).map(c => [c.nom, c.prive])], [[['général', false, 3], ['direction', true, 2]], [['général', false]]]);
  /* qui crée un canal : un administrateur de l'espace */
  v('⛔ un membre simple ne crée pas de canal (`interdit`) ; un non-membre non plus ; rien n\'est créé', [lance(() => S.canalCreer({ espace: w.e, par: w.cleo.id, nom: 'x', prive: false })), lance(() => S.canalCreer({ espace: w.e, par: w.dan.id, nom: 'x', prive: false })), S.canauxVisibles(w.e, w.ana.id).length], ['interdit', 'interdit', 2]);
  v('un privé avec quelqu\'un qui n\'est pas de l\'espace : `membre_inconnu`, et rien n\'est créé', [lance(() => S.canalCreer({ espace: w.e, par: w.ana.id, nom: 'x', prive: true, membres: [w.dan.id] })), S.canauxVisibles(w.e, w.ana.id).length], ['membre_inconnu', 2]);
  /* la vie du canal public : il suit l'espace */
  const dan = w.dan;
  rejoindre(S, w.e, w.ana.id, dan.id);
  v('⛔ un nouvel arrivé entre dans le canal PUBLIC avec l\'espace — pas dans le privé', [S.convPourMembre(w.pub, dan.id) !== null, S.convPourMembre(w.priv, dan.id)], [true, null]);
  S.espaceMembreRetirer({ espace: w.e, uid: dan.id });
  v('… et en sort avec l\'espace', S.convPourMembre(w.pub, dan.id), null);
  rejoindre(S, w.e, w.ana.id, dan.id);
  v('revenu, il repart de ce qui suit son retour (pas de relecture de ce qu\'il ne devait plus voir)', S.convPourMembre(w.pub, dan.id).moi.depuis_seq >= S.messagesDe(w.pub, w.ana.id).messages.length, true);
  /* le canal privé : qui y entre, qui en sort */
  v('⛔ ajouter à un canal PRIVÉ : un membre de l\'espace, au rôle qu\'il y a ; pas un étranger ; pas un canal public', [S.canalMembresAjouter({ conv: w.priv, par: w.ana.id, uids: [w.cleo.id] }).ajoutes, roleCanal(S, w.priv, w.cleo.id), lance(() => S.canalMembresAjouter({ conv: w.priv, par: w.ana.id, uids: [pers(S, 'Etranger').id] })), lance(() => S.canalMembresAjouter({ conv: w.pub, par: w.ana.id, uids: [w.ben.id] }))], [[w.cleo.id], 'membre', 'membre_inconnu', 'canal_public']);
  const avantCm = S.purgeLignes().filter(x => x.genre === 'canal_membre').length;
  w.h.t += 3000;
  S.canalMembreRetirer({ conv: w.priv, par: w.ana.id, uid: w.cleo.id });
  v('⛔ retirer quelqu\'un d\'un canal privé est NOTÉ (`canal_membre`, `conversation|personne|date`) ; on ne retire personne d\'un canal public', [S.convPourMembre(w.priv, w.cleo.id), S.purgeLignes().filter(x => x.genre === 'canal_membre').length - avantCm, S.purgeLignes().some(x => x.genre === 'canal_membre' && x.objet === w.priv + '|' + w.cleo.id + '|' + w.h.t), lance(() => S.canalMembreRetirer({ conv: w.pub, par: w.ana.id, uid: w.ben.id }))], [null, 1, true, 'canal_public']);
  S.canalMembresAjouter({ conv: w.priv, par: w.ana.id, uids: [w.cleo.id] });
  v('⛔ quitter un canal privé ne promeut personne (le rôle d\'un canal est celui de l\'espace), est noté, et un canal public ne se quitte pas', [S.canalQuitter({ conv: w.priv, uid: w.cleo.id }).vide, roleCanal(S, w.priv, w.ben.id), S.purgeLignes().filter(x => x.genre === 'canal_membre').length - avantCm, lance(() => S.canalQuitter({ conv: w.pub, uid: w.ben.id }))], [false, 'membre', 2, 'canal_public']);
  v('quitter un canal où l\'on n\'est pas : `introuvable`', lance(() => S.canalQuitter({ conv: w.priv, uid: w.cleo.id })), 'introuvable');
  S.canalQuitter({ conv: w.priv, uid: w.ben.id });
  const dernier = S.canalQuitter({ conv: w.priv, uid: w.ana.id });
  v('⛔ le DERNIER membre qui quitte un canal privé l\'emporte (et le dit)', [dernier.vide, S.canalDe(w.priv), S.purgeLignes().some(x => x.genre === 'conversation' && x.objet === w.priv)], [true, null, true]);
  /* cent canaux au plus */
  const g = atelier(), G = g.S;
  let k = 2;
  while (k < 100) { G.canalCreer({ espace: g.e, par: g.ana.id, nom: 'c' + k, prive: false }); k++; }
  v('population : l\'espace porte cent canaux', G.canauxVisibles(g.e, g.ana.id).length, 100);
  v('⛔ le cent-et-unième est refusé (`trop_de_canaux`), et rien n\'est créé', [lance(() => G.canalCreer({ espace: g.e, par: g.ana.id, nom: 'de trop', prive: false })), G.canauxVisibles(g.e, g.ana.id).length], ['trop_de_canaux', 100]);
}

console.log('\n« Contacts de l\'entreprise » et les collègues : MON espace seulement, jamais un annuaire');
{
  const w = atelier(), S = w.S;
  const autre = S.espaceCreer({ nom: 'Autre entreprise', proprio: w.dan.id }).id, eve = pers(S, 'Eve');
  rejoindre(S, autre, w.dan.id, eve.id);
  v('les collègues partagent un espace ; qui n\'en partage aucun n\'est pas un collègue', [S.collegues(w.ana.id, w.ben.id), S.collegues(w.ben.id, w.cleo.id), S.collegues(w.ana.id, w.dan.id), S.collegues(w.ana.id, eve.id), S.collegues(w.dan.id, eve.id)], [true, true, false, false, true]);
  v('⛔ des collègues s\'écrivent SANS être contacts ; des étrangers non', [S.contactsDe(w.ana.id).length, S.peutEcrire(w.ana.id, w.ben.id), S.peutEcrire(w.cleo.id, w.ben.id), S.peutEcrire(w.ana.id, w.dan.id), S.peutEcrire(w.ana.id, w.ana.id)], [0, true, true, false, false]);
  v('des contacts mutuels s\'écrivent toujours (l\'ancienne règle), sans espace commun', (() => { S.contactLier(w.ana.id, eve.id); return S.peutEcrire(w.ana.id, eve.id) && S.peutEcrire(eve.id, w.ana.id); })(), true);
  /* ⛔ BLOQUER UN COLLÈGUE QU'ON N'A PAS EN CONTACT : `contactEtat` ne change qu'une ligne qui existe — sans `contactBloquer`, celui qui harcèle un collègue ne s'arrêterait jamais */
  v('population : Ana et Ben ne sont PAS contacts (aucune ligne entre eux) ; `contactEtat` ne peut donc rien bloquer ici', [S.contactLigne(w.ana.id, w.ben.id), S.contactEtat(w.ana.id, w.ben.id, 'bloque'), S.peutEcrire(w.ana.id, w.ben.id)], [null, 0, true]);
  v('⛔ `contactBloquer` CRÉE la ligne de blocage d\'un collègue ; il ne s\'écrivent plus, dans les deux sens', [S.contactBloquer(w.ana.id, w.ben.id), S.contactLigne(w.ana.id, w.ben.id), S.contactLigne(w.ben.id, w.ana.id), S.peutEcrire(w.ana.id, w.ben.id), S.peutEcrire(w.ben.id, w.ana.id)], [1, { etat: 'bloque' }, null, false, false]);
  v('… bloquer deux fois est le même geste ; la liste d\'Ana le montre bloqué, celle de Ben ne montre rien', [S.contactBloquer(w.ana.id, w.ben.id), S.contactsDe(w.ana.id).filter(c => c.id === w.ben.id).map(c => [c.prenom, c.bloque, c.mutuel]), S.contactsDe(w.ben.id).length], [1, [['Ben', true, false]], 0]);
  v('⛔ on ne bloque pas un inconnu (ni soi-même) : rien n\'est créé, la réponse reste « introuvable »', [S.contactBloquer(w.ana.id, w.dan.id), S.contactBloquer(w.ana.id, w.ana.id), S.contactLigne(w.ana.id, w.dan.id)], [0, 0, null]);
  v('… et débloquer un collègue fait DISPARAÎTRE la ligne (il n\'était pas un contact : elle ne reste pas à moitié) ; ils se réécrivent', [S.contactDebloquer(w.ana.id, w.ben.id), S.contactLigne(w.ana.id, w.ben.id), S.contactsDe(w.ana.id).filter(c => c.id === w.ben.id).length, S.peutEcrire(w.ana.id, w.ben.id)], [true, null, 0, true]);
  v('débloquer quand rien n\'est bloqué : faux (la route répond « introuvable »)', S.contactDebloquer(w.ana.id, w.ben.id), false);
  v('un CONTACT bloqué puis débloqué redevient mutuel (l\'autre a gardé sa ligne) — le comportement d\'avant, inchangé', (() => { S.contactLier(w.ana.id, eve.id); S.contactBloquer(w.ana.id, eve.id); const bloque = S.contactActif(w.ana.id, eve.id); S.contactDebloquer(w.ana.id, eve.id); return [bloque, S.contactActif(w.ana.id, eve.id)]; })(), [false, true]);
  /* ⛔ l'annuaire : les membres de CET espace */
  const lis = (viewer, tous) => S.espaceMembres(w.e, viewer, { tous }).map(m => m.prenom).sort();
  v('« Contacts de l\'entreprise » : les membres de MON espace — et personne d\'un autre (ni Dan, ni Eve)', [lis(w.cleo.id, false), lis(w.ana.id, true)], [['Ana', 'Ben', 'Cleo'], ['Ana', 'Ben', 'Cleo']]);
  v('chaque ligne dit son rôle, si c\'est moi, et si je l\'ai en contact', S.espaceMembres(w.e, w.ana.id, { tous: true }).map(m => [m.prenom, m.role, m.moi, m.contact]), [['Ana', 'admin', true, false], ['Ben', 'membre', false, false], ['Cleo', 'membre', false, false]]);
  v('la ligne ne porte ni adresse, ni numéro, ni identifiant de connexion', Object.keys(S.espaceMembres(w.e, w.ana.id, { tous: true })[0]).sort(), ['avatar', 'contact', 'depuis', 'id', 'moi', 'nom', 'prenom', 'role', 'statut']);
  S.contactBloquer(w.cleo.id, w.ben.id);
  v('⛔ un membre ne voit pas celui avec qui un blocage existe (dans un sens ou l\'autre) ; l\'administrateur lit le registre COMPLET de son entreprise', [lis(w.cleo.id, false), lis(w.ben.id, false), lis(w.ana.id, true), lis(w.ana.id, false)], [['Ana', 'Cleo'], ['Ana', 'Ben'], ['Ana', 'Ben', 'Cleo'], ['Ana', 'Ben', 'Cleo']]);
  S.contactDebloquer(w.cleo.id, w.ben.id);
  v('un compte supprimé ne figure plus dans l\'annuaire', (() => { const x = atelier(); x.S.suppressionProgrammer(x.cleo.id, x.h.t + 1); x.h.t += 10; x.S.compteEffacer(x.cleo.id); return x.S.espaceMembres(x.e, x.ana.id, { tous: true }).map(m => m.prenom).sort(); })(), ['Ana', 'Ben']);
  /* la fiche d'une personne se voit entre collègues, pas entre étrangers */
  v('⛔ la fiche d\'une personne : visible d\'un collègue, d\'un contact — pas d\'un étranger', [S.peutVoir(w.cleo.id, w.ben.id), S.peutVoir(w.dan.id, w.ana.id), S.peutVoir(eve.id, w.ana.id)], [true, false, true]);
  vrai('… (Eve est ici contact d\'Ana : c\'est le contact, pas l\'espace, qui la lui montre)', S.collegues(eve.id, w.ana.id) === false && S.contactLigne(eve.id, w.ana.id) !== null);
  v('un changement de MON profil prévient mes collègues (sans ceux avec qui un blocage existe)', (() => { S.contactBloquer(w.ana.id, w.cleo.id); const a = S.audiencePersonne(w.ana.id).slice().sort(); S.contactDebloquer(w.ana.id, w.cleo.id); return a; })(), [w.ben.id, eve.id].sort());
}

console.log('\nUn compte effacé sort de ses espaces : la propriété passe, ou l\'espace est dissous');
{
  const efface = (w, p) => { w.S.suppressionProgrammer(p.id, w.h.t + 1000); w.h.t += 5000; return w.S.compteEffacer(p.id); };
  /* propriétaire avec d'autres membres : le plus ancien ADMINISTRATEUR, à défaut le plus ancien membre */
  const a = atelier();
  const r = efface(a, a.ana);
  v('⛔ le propriétaire efface son compte : la propriété passe au plus ancien membre (Ben, arrivé avant Cleo) qui devient administrateur ; il sort des canaux', [r.effacee, a.S.espacePourMembre(a.e, a.ben.id).espace.proprio === a.ben.id, a.S.espacePourMembre(a.e, a.ben.id).moi.role, a.S.espacePourMembre(a.e, a.ana.id), a.S.membresActifs(a.pub).includes(a.ana.id), roleCanal(a.S, a.pub, a.ben.id)], [true, true, 'admin', null, false, 'admin']);
  v('… et c\'est noté (`espace_membre`), pour qu\'une archive d\'avant ne la ramène pas', a.S.purgeLignes().some(x => x.genre === 'espace_membre' && x.objet.startsWith(a.e + '|' + a.ana.id + '|')), true);
  const b = atelier();
  b.S.espaceRoleMembre({ espace: b.e, uid: b.cleo.id, admin: true });
  efface(b, b.ana);
  v('⛔ avec un administrateur parmi les membres, c\'est LUI qui reprend (Cleo, plus récente mais administrateur)', b.S.espacePourMembre(b.e, b.cleo.id).espace.proprio === b.cleo.id, true);
  /* propriétaire seul : l'espace est dissous */
  const c = neuf(), ana = pers(c.S, 'Ana'), e = c.S.espaceCreer({ nom: 'Seule', proprio: ana.id }).id;
  const canal = c.S.canalCreer({ espace: e, par: ana.id, nom: 'solo', prive: false }).id;
  efface(c, ana);
  v('⛔ propriétaire SEUL : l\'espace est dissous avec ses canaux, et c\'est noté', [c.S.espaceBrut(e), c.S.canalDe(canal), c.S.purgeLignes().some(x => x.genre === 'espace' && x.objet === e)], [null, null, true]);
  /* un membre simple : il sort, l'espace continue */
  const d = atelier();
  efface(d, d.cleo);
  v('un membre simple efface son compte : il sort de l\'espace et du canal, l\'espace continue', [d.S.espaceMembresN(d.e), d.S.membresActifs(d.pub).length, d.S.espacePourMembre(d.e, d.ana.id).espace.proprio === d.ana.id], [2, 2, true]);
  /* ⛔ supprimer son compte laisserait Stripe prélever pour un espace qui n'existe plus */
  const f = atelier();
  f.S.abonnementPoser(f.e, ABO({ abonnement: 'sub_seul' }), { adopter: true });
  v('un espace payé avec d\'autres membres n\'empêche pas de supprimer son compte', f.S.espacesAbonnesSeul(f.ana.id), []);
  const g = neuf(), seul = pers(g.S, 'Seule'), eg = g.S.espaceCreer({ nom: 'Payée seule', proprio: seul.id }).id;
  g.S.abonnementPoser(eg, ABO({ abonnement: 'sub_seule' }), { adopter: true });
  v('⛔ le propriétaire SEUL d\'un espace dont l\'abonnement court est signalé (le service refuse alors la suppression : 409 `espace_abonne`)', g.S.espacesAbonnesSeul(seul.id), [eg]);
  g.S.abonnementPoser(eg, ABO({ abonnement: 'sub_seule', statut: 'canceled' }));
  v('… résilié, plus de refus', g.S.espacesAbonnesSeul(seul.id), []);
  v('l\'export d\'une personne liste SES espaces (nom, rôle) — pas les membres des autres', f.S.exportEspaces(f.cleo.id).map(x => [x.nom, x.role, Object.keys(x).sort().join()]), [['Entreprise ELAN', 'membre', 'depuis,id,nom,role']]);
}

console.log('\nL\'abonnement rangé : ce que Stripe a dit, le sursis daté de la première lecture, les sessions de paiement');
{
  const w = atelier(), S = w.S, e = w.e;
  v('un espace jamais abonné n\'a pas de ligne d\'abonnement', S.abonnementLire(e), null);
  S.abonnementSession(e, 'cs_banc960_a');
  let a = S.abonnementLire(e);
  v('une session de paiement ouverte est rangée avec l\'heure ; l\'abonnement est « aucun »', [a.session, a.session_le, a.statut, a.abonnement], ['cs_banc960_a', w.h.t, 'aucun', null]);
  v('une session en attente fait relire l\'espace — 24 heures seulement', [S.abonnementsARelire().includes(e), (w.h.t += 25 * 3600000, S.abonnementsARelire().includes(e))], [true, false]);
  S.abonnementPoser(e, ABO({ statut: 'active', places: 5 }), { adopter: true });
  a = S.abonnementLire(e);
  v('⛔ adopter l\'abonnement que la session désigne : la session est consommée, le verdict est rangé', [a.abonnement, a.statut, a.places, a.session, a.session_le, a.relu_le, a.impaye_depuis], ['sub_banc960', 'active', 5, null, null, w.h.t, null]);
  /* le sursis part de la PREMIÈRE lecture d'un impayé, pas des suivantes */
  const t0 = w.h.t;
  S.abonnementPoser(e, ABO({ statut: 'past_due', impaye: true }));
  w.h.t += 2 * JOUR; S.abonnementPoser(e, ABO({ statut: 'past_due', impaye: true }));
  a = S.abonnementLire(e);
  v('⛔ un impayé relu deux jours plus tard garde sa PREMIÈRE date (le sursis ne repart pas à chaque lecture)', [a.impaye_depuis, a.relu_le], [t0, t0 + 2 * JOUR]);
  S.abonnementPoser(e, ABO({ statut: 'active' }));
  v('une lecture « payé » efface la date de l\'impayé', S.abonnementLire(e).impaye_depuis, null);
  w.h.t += JOUR; S.abonnementPoser(e, ABO({ statut: 'unpaid', impaye: true }));
  v('un impayé NEUF (après un règlement) repart de sa propre date', S.abonnementLire(e).impaye_depuis, w.h.t);
  /* un autre abonnement adopté remet la date à zéro : l'ancien retard n'est pas celui-là */
  w.h.t += JOUR; S.abonnementPoser(e, ABO({ abonnement: 'sub_banc960_bis', statut: 'past_due', impaye: true }), { adopter: true });
  v('un AUTRE abonnement adopté en retard repart de sa propre date (le retard de l\'ancien n\'est pas le sien)', S.abonnementLire(e).impaye_depuis, w.h.t);
  /* à relire : ceux qui vivent, jamais un résilié ; le moins récemment lu d'abord */
  const x = atelier(); x.S.abonnementPoser(x.e, ABO({ abonnement: 'sub_x', statut: 'canceled' }), { adopter: true });
  v('⛔ un abonnement résilié ou expiré est un état FINAL : il n\'est plus relu (sinon la passe relirait des milliers d\'espaces morts)', [x.S.abonnementsARelire().includes(x.e), (() => { x.S.abonnementPoser(x.e, ABO({ abonnement: 'sub_x', statut: 'incomplete_expired' })); return x.S.abonnementsARelire().includes(x.e); })(), (() => { x.S.abonnementPoser(x.e, ABO({ abonnement: 'sub_x', statut: 'incomplete' })); return x.S.abonnementsARelire().includes(x.e); })()], [false, false, true]);
  const st = S.facturationStats();
  v('les agrégats de /health : espaces, abonnés (payés seulement), impayés — des nombres', [Object.keys(st).sort(), Object.values(st).every(Number.isInteger), st.espaces, st.abonnes, st.impayes], [['abonnes', 'espaces', 'impayes'], true, 1, 0, 1]);
  vrai('l\'état rangé ne contient jamais de clé : ni `cle`, ni `secret` dans les colonnes de la table', (() => { const d = w.brut(); const cols = d.prepare('PRAGMA table_info(abonnement)').all().map(c => c.name); d.close(); return !cols.some(c => /cle|secret|token|jeton/i.test(c)); })());
}

console.log('\nLa formule : UNE fonction décide, le sursis se compte entre deux lectures, une panne ne suspend personne');
{
  const w = atelier(), S = w.S, e = w.e;
  const F = creerFormule({ stockage: S, config: { formule: { toutOuvert: false } } });
  const tout = (f) => f.formule + '/' + f.motif;
  v('jamais abonné : Perso', [tout(F.formuleDe({ espace: e })), tout(F.formuleDe({ personne: w.ana.id })), F.placesDe(e)], ['perso/aucun', 'perso/aucun', 0]);
  S.abonnementSession(e, 'cs_banc960_f');
  v('une session de paiement ouverte n\'est PAS un abonnement : toujours Perso', tout(F.formuleDe({ espace: e })), 'perso/aucun');
  S.abonnementPoser(e, ABO({ statut: 'incomplete', places: 5 }), { adopter: true });
  v('⛔ `incomplete` (le premier paiement n\'a pas abouti) : Perso, aucune place', [tout(F.formuleDe({ espace: e })), F.placesDe(e)], ['perso/aucun', 0]);
  for (const s of ['active', 'trialing']) { S.abonnementPoser(e, ABO({ statut: s, places: 7 })); v('⛔ payé = `' + s + '` : Pro, avec ses places', [tout(F.formuleDe({ espace: e })), F.placesDe(e)], ['pro/abonne', 7]); }
  v('une personne MEMBRE d\'un espace payé a la formule Pro, administrateur ou non (une place payée vaut Pro pour son titulaire) ; qui n\'est dans aucun espace payé reste Perso',
    [tout(F.formuleDe({ personne: w.ana.id })), tout(F.formuleDe({ personne: w.cleo.id })), tout(F.formuleDe({ personne: w.dan.id }))], ['pro/abonne', 'pro/abonne', 'perso/aucun']);
  for (const s of ['canceled', 'incomplete_expired', 'paused']) { S.abonnementPoser(e, ABO({ statut: s, places: 7 })); v('⛔ `' + s + '` n\'est pas payé : Perso, aucune place', [tout(F.formuleDe({ espace: e })), F.placesDe(e)], ['perso/aucun', 0]); }
  /* le sursis : sept jours entre deux LECTURES */
  const t0 = w.h.t;
  S.abonnementPoser(e, ABO({ statut: 'past_due', places: 7, impaye: true }));
  let f = F.formuleDe({ espace: e });
  v('⛔ `past_due` à la première lecture : encore Pro, en sursis jusqu\'à J+7, et il garde ses places', [tout(f), f.sursis_jusqua - t0 === SURSIS_MS, F.placesDe(e)], ['pro/sursis', true, 7]);
  w.h.t = t0 + 3 * JOUR; S.abonnementPoser(e, ABO({ statut: 'past_due', places: 7, impaye: true }));
  v('relu trois jours plus tard, toujours en retard : toujours Pro (sursis)', tout(F.formuleDe({ espace: e })), 'pro/sursis');
  w.h.t = t0 + 30 * JOUR;
  v('⛔ UNE PANNE NE SUSPEND PERSONNE : trente jours ont passé SANS aucune lecture réussie de Stripe — le temps ne court pas contre celui qui a peut-être payé entre-temps : toujours Pro', tout(F.formuleDe({ espace: e })), 'pro/sursis');
  S.abonnementPoser(e, ABO({ statut: 'past_due', places: 7, impaye: true }));
  f = F.formuleDe({ espace: e });
  v('⛔ la première lecture réussie qui suit et qui dit ENCORE le retard le constate : impayé (les fonctions Pro refusent), places gardées', [tout(f), F.placesDe(e)], ['impaye/impaye', 7]);
  v('… une personne membre d\'un espace en impayé a la formule « impayé » (au-dessus de Perso)', tout(F.formuleDe({ personne: w.cleo.id })), 'impaye/impaye');
  /* exactement sept jours : le seuil est « au moins sept jours entre deux lectures » */
  const g = atelier(); const Fg = creerFormule({ stockage: g.S, config: { formule: { toutOuvert: false } } });
  const tg = g.h.t; g.S.abonnementPoser(g.e, ABO({ statut: 'unpaid', impaye: true }));
  g.h.t = tg + SURSIS_MS - 1; g.S.abonnementPoser(g.e, ABO({ statut: 'unpaid', impaye: true }));
  const juste = tout(Fg.formuleDe({ espace: g.e }));
  g.h.t = tg + SURSIS_MS; g.S.abonnementPoser(g.e, ABO({ statut: 'unpaid', impaye: true }));
  v('⛔ le seuil : une milliseconde avant les sept jours, encore le sursis ; à sept jours pile, impayé (`unpaid` compte comme `past_due`)', [juste, tout(Fg.formuleDe({ espace: g.e }))], ['pro/sursis', 'impaye/impaye']);
  g.S.abonnementPoser(g.e, ABO({ statut: 'active' }));
  v('réglé, tout revient (Pro, plus de date de retard)', [tout(Fg.formuleDe({ espace: g.e })), g.S.abonnementLire(g.e).impaye_depuis], ['pro/abonne', null]);
  /* une personne de plusieurs espaces : la meilleure formule */
  const h = atelier(), Fh = creerFormule({ stockage: h.S, config: { formule: { toutOuvert: false } } });
  const e2 = h.S.espaceCreer({ nom: 'Seconde', proprio: h.dan.id }).id; rejoindre(h.S, e2, h.dan.id, h.cleo.id);
  h.S.abonnementPoser(h.e, ABO({ abonnement: 'sub_h1', statut: 'past_due', impaye: true })); h.h.t += 8 * JOUR; h.S.abonnementPoser(h.e, ABO({ abonnement: 'sub_h1', statut: 'past_due', impaye: true }));
  v('une personne dans deux espaces : la MEILLEURE des formules (un impayé et un Perso → impayé ; puis un payé → Pro)', [tout(Fh.formuleDe({ personne: h.cleo.id })), (h.S.abonnementPoser(e2, ABO({ abonnement: 'sub_h2', statut: 'active' }), { adopter: true }), tout(Fh.formuleDe({ personne: h.cleo.id })))], ['impaye/impaye', 'pro/abonne']);
  v('un sujet qui n\'est ni un espace ni une personne est une erreur de code, jamais un « Perso » silencieux', [lance(() => Fh.formuleDe({})), lance(() => Fh.formuleDe({ espace: 12 })), lance(() => Fh.formuleDe(null)), lance(() => Fh.formuleDe({ personne: { id: 'p_x' } }))], ['formuleDe : un espace ou une personne', 'formuleDe : un espace ou une personne', 'formuleDe : un espace ou une personne', 'formuleDe : un espace ou une personne']);
  v('la fonction ne reçoit que des identifiants : ni statut, ni places, ni formule venus d\'une requête ne s\'y glissent', [F.formuleDe.length, Object.keys(F.formuleDe({ espace: e, formule: 'pro', statut: 'active', places: 999 })).sort()], [1, ['formule', 'motif']]);
  /* la bêta : tout est ouvert, le drapeau est lu ICI */
  const B = creerFormule({ stockage: S, config: { formule: { toutOuvert: true } } });
  S.abonnementPoser(e, ABO({ statut: 'canceled' }));
  v('⛔ sur la bêta (`toutOuvert`) : Pro pour tout le monde, espace ou personne, abonné ou non — et les places ne se comptent pas (`Infinity`) sans abonnement', [tout(B.formuleDe({ espace: e })), tout(B.formuleDe({ personne: w.dan.id })), B.placesDe(w.e), B.toutOuvert()], ['pro/beta', 'pro/beta', Infinity, true]);
  v('… et l\'état de l\'abonnement reste celui que Stripe a dit (la bêta ne le falsifie pas)', S.abonnementLire(e).statut, 'canceled');
  v('le drapeau est faux par défaut : une configuration sans `formule` n\'ouvre rien', [creerFormule({ stockage: S, config: {} }).toutOuvert(), creerFormule({ stockage: S, config: { formule: {} } }).toutOuvert(), creerFormule({ stockage: S, config: { formule: { toutOuvert: 'oui' } } }).toutOuvert()], [false, false, false]);
  /* ⛔ le drapeau n'est lu qu'à UN endroit */
  const lireSrc = (f) => T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, f), 'utf8'));
  const fichiers = fs.readdirSync(T.SERVICE).filter(f => /\.js$/.test(f));
  const lecteurs = fichiers.filter(f => /\bconfig\.formule\b|\.formule\.toutOuvert\b|\bbrut\.toutOuvert\b/.test(lireSrc(f)));
  vrai('population : le service a des fichiers à examiner (' + fichiers.length + ')', fichiers.length >= 15 && fichiers.includes('formule.js'));
  v('⛔ le drapeau de la bêta est LU dans `formule.js` (la décision) et `config.js` (la validation) — nulle part ailleurs', lecteurs.sort(), ['config.js', 'formule.js']);
  v('… les autres fichiers ne le connaissent que par la fonction (`formule.toutOuvert()`)', fichiers.filter(f => !['formule.js', 'config.js'].includes(f) && /\btoutOuvert\b/.test(lireSrc(f)) && !/formule\.toutOuvert\(\)/.test(lireSrc(f))), []);
}

/* ══ LES GENRES DE PURGE : rejoués hors ligne sur une copie restaurée, sans effacer ce qui est arrivé APRÈS ═════════════════════════════════════════ */
(async () => {
  console.log('\nLes quatre genres de purge neufs sont rejoués sur une copie restaurée — pas ce qui est arrivé après');
  try {
    const w = atelier(), S = w.S;
    /* Le chemin de l'archive : un instantané de la base AVANT les effacements (ce que la sauvegarde horaire aurait rangé) */
    const archive = path.join(bac, 'archive-avant.db');
    const i1 = invitation(S, w.e, w.ana.id), i2 = invitation(S, w.e, w.ana.id);
    const priv2 = S.canalCreer({ espace: w.e, par: w.ana.id, nom: 'finance', prive: true, membres: [w.cleo.id] }).id;
    const second = S.espaceCreer({ nom: 'À dissoudre', proprio: w.ben.id }).id;
    const canalSecond = S.canalCreer({ espace: second, par: w.ben.id, nom: 'ouvert', prive: false }).id;
    S.messageEnvoyer({ conv: canalSecond, auteur: w.ben.id, cid: 'cid-purge-0001', texte: 'à effacer' });
    await S.instantane(archive);
    const ca = new DatabaseSync(archive);
    const dans = (sql, ...p) => compte(ca, sql, ...p);
    const liensVivants = dans(`SELECT COUNT(*) AS n FROM lien WHERE genre = 'espace' AND revoque = 0 AND cible = ?`, w.e);   // les deux d'ici, plus ceux par lesquels Ben et Cleo sont entrés
    v('population : l\'archive d\'AVANT contient Ben dans l\'espace et le canal, le canal privé « finance », le second espace et ses messages (le message système de sa création, le texte), des invitations vivantes',
      [dans('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ? AND uid = ?', w.e, w.ben.id), dans('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', w.pub, w.ben.id), dans('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', priv2, w.cleo.id), dans('SELECT COUNT(*) AS n FROM espace WHERE id = ?', second), dans('SELECT COUNT(*) AS n FROM message WHERE conv = ?', canalSecond), liensVivants >= 2],
      [1, 1, 1, 1, 2, true]);
    ca.close();
    /* …puis, dans la base VIVANTE : on révoque, on retire, on dissout */
    w.h.t += 10 * 1000;
    S.invitationsRevoquer(w.e);
    S.espaceMembreRetirer({ espace: w.e, uid: w.ben.id });
    S.canalMembreRetirer({ conv: priv2, par: w.ana.id, uid: w.cleo.id });
    S.espaceSupprimer(second);   // (le propriétaire Ben n'est plus dans le premier espace, pas dans le second)
    const registre = S.purgeLignes();
    v('population : le registre porte les quatre genres neufs', ['espace', 'espace_membre', 'invitation', 'canal_membre'].map(g => registre.filter(x => x.genre === g).length > 0), [true, true, true, true]);
    v('⛔ chaque genre neuf est déclaré (`GENRES_PURGE`), rejoué HORS LIGNE (« copie »)', ['espace', 'espace_membre', 'invitation', 'canal_membre'].map(g => ouvrir.copie.GENRES_PURGE[g]), ['copie', 'copie', 'copie', 'copie']);
    const bilan = ouvrir.copie.rejouerPurge(archive, registre);
    v('le rejeu dit ce qu\'il a fait : un espace, un membre, toutes les invitations vivantes, un membre de canal ; rien d\'ignoré', [bilan.espacesRetires, bilan.membresEspaceRetires, bilan.invitationsRevoquees === liensVivants, bilan.membresCanalRetires, bilan.ignorees], [1, 1, true, 1, 0]);
    const cb = new DatabaseSync(archive);
    const apres = (sql, ...p) => compte(cb, sql, ...p);
    v('⛔ l\'espace dissous ne revient pas : ni lui, ni ses canaux, ni leurs messages', [apres('SELECT COUNT(*) AS n FROM espace WHERE id = ?', second), apres('SELECT COUNT(*) AS n FROM canal WHERE espace = ?', second), apres('SELECT COUNT(*) AS n FROM conversation WHERE id = ?', canalSecond), apres('SELECT COUNT(*) AS n FROM message WHERE conv = ?', canalSecond)], [0, 0, 0, 0]);
    v('⛔ le membre retiré ne revient pas : plus dans l\'espace, plus dans ses canaux (il en est sorti, ses messages restent)', [apres('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ? AND uid = ?', w.e, w.ben.id), apres('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', w.pub, w.ben.id), apres('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', w.priv, w.ben.id)], [0, 0, 0]);
    v('… les autres membres, eux, y sont toujours (le rejeu ne touche que ce que le registre nomme)', [apres('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', w.e), apres('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND quitte_le IS NULL', w.pub)], [2, 2]);
    v('⛔ les invitations révoquées ne rouvrent plus rien', apres(`SELECT COUNT(*) AS n FROM lien WHERE genre = 'espace' AND revoque = 0 AND cible = ?`, w.e), 0);
    v('⛔ le membre retiré d\'un canal PRIVÉ n\'y revient pas', apres('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', priv2, w.cleo.id), 0);
    cb.close();
    void i1; void i2;
    const rejeu2 = ouvrir.copie.rejouerPurge(archive, registre);
    v('le rejeu est rejouable : une seconde passe ne change rien (et ne recopie rien)', [rejeu2.ajoutees, rejeu2.espacesRetires, rejeu2.membresEspaceRetires, rejeu2.invitationsRevoquees], [0, 0, 0, 0]);

    /* ⛔ ce qui est arrivé APRÈS l'effacement n'est pas effacé : un membre retiré puis REVENU est un autre arrivé */
    const t = atelier(), U = t.S;
    t.h.t += 1000; U.espaceMembreRetirer({ espace: t.e, uid: t.ben.id });
    const reg2 = U.purgeLignes();
    t.h.t += 60000; rejoindre(U, t.e, t.ana.id, t.ben.id);
    const apresRetour = path.join(bac, 'archive-apres-retour.db');
    await U.instantane(apresRetour);
    ouvrir.copie.rejouerPurge(apresRetour, reg2);
    const cc = new DatabaseSync(apresRetour);
    v('⛔ Ben, retiré puis REVENU avant l\'archive, y est toujours après le rejeu (son retour est postérieur au retrait : le rejeu ne l\'efface pas)', [compte(cc, 'SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ? AND uid = ?', t.e, t.ben.id), compte(cc, 'SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', t.pub, t.ben.id)], [1, 1]);
    cc.close();
    /* …et pour un canal privé : retiré, puis REMIS */
    const p = atelier(), P = p.S;
    p.h.t += 1000; P.canalMembreRetirer({ conv: p.priv, par: p.ana.id, uid: p.ben.id });
    const reg3 = P.purgeLignes();
    p.h.t += 60000; P.canalMembresAjouter({ conv: p.priv, par: p.ana.id, uids: [p.ben.id] });
    const apresCanal = path.join(bac, 'archive-apres-canal.db');
    await P.instantane(apresCanal);
    ouvrir.copie.rejouerPurge(apresCanal, reg3);
    const cd = new DatabaseSync(apresCanal);
    v('⛔ Ben, retiré du canal privé puis REMIS, y est toujours après le rejeu', compte(cd, 'SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', p.priv, p.ben.id), 1);
    cd.close();
    /* une archive d'AVANT la migration 5 (aucune table d'espace) : le rejeu ne casse pas, il recopie les lignes */
    const ancienne = neuf({ migrations: MIGRATIONS.filter(m => m.v <= 4) });
    pers(ancienne.S, 'Vieux'); ancienne.S.fermer();
    const bilanAncien = ouvrir.copie.rejouerPurge(ancienne.chemin, registre);
    v('⛔ une archive d\'avant les espaces (schéma 4, aucune table d\'espace) se rejoue sans erreur : il n\'y a rien à y retirer, les lignes sont recopiées', [bilanAncien.espacesRetires, bilanAncien.membresEspaceRetires, bilanAncien.invitationsRevoquees, bilanAncien.membresCanalRetires, bilanAncien.ajoutees > 0], [0, 0, 0, 0, true]);
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  }
  fin();
})();
