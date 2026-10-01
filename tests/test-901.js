/* ⛔ CE QUE CE FICHIER GARDE — LE STOCKAGE D'OP MESSAGES, MODULE SEUL (famille 2 de SERVEUR.md § 3.11).

   `server-msg/stockage.js` monté lui-même : clé, horloge et fichier injectés. Pas de HTTP ici — c'est
   `test-903` qui dit que les routes sont branchées. Celui-ci dit que ce qui est RANGÉ est juste :

     · le scellage (rien en clair sur le disque, une ligne recopiée ou permutée ne s'ouvre plus, une
       mauvaise clé est refusée net) ;
     · l'IDEMPOTENCE : un renvoi (`cid`) ne crée jamais un deuxième message — éprouvée sur DEUX
       passages, parce qu'un identifiant aléatoire reste cohérent avec lui-même dans un seul
       (la leçon d'`opIdDerive`, 20 septembre 2026) ;
     · `seq` contigu, attribué dans la transaction, qui ne bouge pas quand l'écriture échoue ;
     · `lu_seq` MONOTONE ; les non-lus ; la pierre tombale ; les éphémères (horloge injectable) ;
     · la VISIBILITÉ des événements (`evenementsPour`) : la même requête sert la reprise et le direct ;
     · aucun SQL hors de `stockage.js`, aucune concaténation dedans.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est
   précédé de la population qu'il aurait pu compter (`vrai('… : N lignes avant', N > 0)`). */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');

const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-901-'));
let n = 0;
function neuf(opts = {}) {
  const chemin = path.join(bac, 'msg-' + (++n) + '.db');
  const kek = opts.kek || crypto.randomBytes(32);
  const h = { t: 1790000000000 };
  const scelleur = opts.scelleur || creerScelleur(kek);
  const S = ouvrir({ chemin, scelleur, horloge: () => h.t, migrations: opts.migrations });
  const brut = () => new DatabaseSync(chemin);
  return { S, chemin, kek, h, brut, scelleur };
}
const pers = (S, nom) => S.personneCreer({ identifiant: 'beta:' + nom, prenom: nom, nom: 'Test', origine: 'beta', verifie: true });
const octets = (chemin) => {
  let b = Buffer.alloc(0);
  for (const s of ['', '-wal', '-shm']) { try { b = Buffer.concat([b, fs.readFileSync(chemin + s)]); } catch (e) {} }
  return b;
};
const lance = (f) => { try { f(); return null; } catch (e) { return e.code || e.message; } };

console.log('Les migrations (PRAGMA user_version) sont numérotées, rejouables, et gardent une copie');
{
  const a = neuf();
  v('une base neuve est au schéma 1', a.S.schema(), 1);
  const p = pers(a.S, 'alice');
  a.S.fermer();
  const b = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t });
  v('rouvrir ne rejoue rien et garde les données', b.personneParId(p.id).prenom, 'alice');
  b.fermer();
  // « rejouable » : on remet le compteur à zéro à la main, la migration 1 repasse sur des tables existantes
  const brut = a.brut(); brut.exec('PRAGMA user_version = 0'); brut.close();
  let rejouee = null; let c;
  try { c = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t }); rejouee = c.personneParId(p.id).prenom; } catch (e) { rejouee = 'ERREUR ' + e.message; }
  v('⛔ la migration 1 rejouée sur une base déjà migrée ne casse rien (IF NOT EXISTS) et n\'efface rien', rejouee, 'alice');
  if (c) c.fermer();

  const m2 = MIGRATIONS.concat([{ v: 2, sql: ['CREATE TABLE IF NOT EXISTS essai_v2(x INTEGER)', 'PRAGMA user_version = 2'] }]);
  const d = neuf({ migrations: MIGRATIONS });
  pers(d.S, 'avant'); d.S.fermer();
  const e = ouvrir({ chemin: d.chemin, scelleur: creerScelleur(d.kek), horloge: () => d.h.t, migrations: m2 });
  v('une migration 2 s\'applique une fois (schéma 2)', e.schema(), 2);
  vrai('⛔ une copie « avant-v2 » a été conservée (VACUUM INTO) avant de migrer une base qui a vécu', fs.existsSync(d.chemin + '.avant-v2'));
  const copie = new DatabaseSync(d.chemin + '.avant-v2');
  v('la copie est la base d\'AVANT (schéma 1, sans la table neuve)', [copie.prepare('PRAGMA user_version').get().user_version, copie.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='essai_v2'").get().n], [1, 0]);
  copie.close(); e.fermer();
  const f2 = neuf({ migrations: m2 });
  vrai('une base NEUVE n\'a pas de copie à garder (rien n\'a vécu)', !fs.existsSync(f2.chemin + '.avant-v1') && !fs.existsSync(f2.chemin + '.avant-v2'));
}

console.log('\nLe scellage : rien en clair sur le disque, une mauvaise clé est refusée');
{
  const a = neuf();
  const alice = pers(a.S, 'alice'), bob = pers(a.S, 'bob');
  a.S.contactLier(alice.id, bob.id);
  const g = a.S.convCreerGroupe({ createur: alice.id, nom: 'GROUPEZXCANARIQNOM', membres: [bob.id], annonces_seules: false, ephemere_s: 0 });
  a.S.messageEnvoyer({ conv: g.id, auteur: alice.id, cid: 'cid-canari-0001', texte: 'texte-ZXCANARIQCORPS' });
  a.S.notifCreer({ uid: bob.id, type: 'essai', titre: 'titre-ZXCANARIQTITRE', texte: 'texte-ZXCANARIQNOTIF', cible: g.id });
  const disque = octets(a.chemin);
  vrai('population : la base contient bien des octets à examiner', disque.length > 8192);
  for (const [nom, canari] of [['le corps du message', 'ZXCANARIQCORPS'], ['le nom du groupe', 'ZXCANARIQNOM'], ['le titre de notification', 'ZXCANARIQTITRE'], ['le texte de notification', 'ZXCANARIQNOTIF'], ['l\'identifiant de connexion (adresse)', 'beta:alice']]) {
    v('⛔ ' + nom + ' n\'apparaît pas en clair sur le disque', disque.includes(Buffer.from(canari)), false);
  }
  vrai('témoin : un champ qui DOIT rester en clair (le prénom affiché) l\'est — la recherche sait trouver', disque.includes(Buffer.from('alice')));
  const lu = a.S.messagesDe(g.id, bob.id).messages;
  vrai('et pourtant le service relit le texte, le nom, la notification', lu.some(m => m.texte === 'texte-ZXCANARIQCORPS') && a.S.convListe(bob.id)[0].nom === 'GROUPEZXCANARIQNOM' && a.S.notifListe(bob.id)[0].titre === 'titre-ZXCANARIQTITRE');
  const temoin = a.brut().prepare("SELECT v FROM meta WHERE k='kek_temoin'").get().v;
  vrai('le témoin de clé est lui-même scellé (il ne contient pas son clair)', !Buffer.from(temoin, 'base64').includes(Buffer.from('opmsg-temoin-v1')));
  a.S.fermer();
  v('⛔ une MAUVAISE clé est refusée au démarrage (pas de lecture de déchets)', lance(() => ouvrir({ chemin: a.chemin, scelleur: creerScelleur(crypto.randomBytes(32)), horloge: () => a.h.t })), 'cle_incorrecte');
  const ok = ouvrir({ chemin: a.chemin, scelleur: creerScelleur(a.kek), horloge: () => a.h.t });
  vrai('la bonne clé rouvre', ok.convListe(bob.id).length === 1);
  ok.fermer();
}

console.log('\nUne ligne recopiée ou permutée ne s\'ouvre plus (données associées conv|seq|auteur)');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const c1 = a.S.convDirecteObtenir(al.id, bo.id).id;
  const g = a.S.convCreerGroupe({ createur: al.id, nom: 'G2', membres: [bo.id], annonces_seules: false, ephemere_s: 0 });
  a.S.messageEnvoyer({ conv: c1, auteur: al.id, cid: 'cid-perm-0001', texte: 'premier' });
  a.S.messageEnvoyer({ conv: c1, auteur: al.id, cid: 'cid-perm-0002', texte: 'second' });
  a.S.messageEnvoyer({ conv: g.id, auteur: al.id, cid: 'cid-perm-0003', texte: 'ailleurs' });
  v('avant toute altération, tout s\'ouvre', a.S.messagesDe(c1, al.id).messages.map(m => m.texte), ['premier', 'second']);
  const brut = a.brut();
  const corps = (conv, seq) => brut.prepare('SELECT corps_ch FROM message WHERE conv = ? AND seq = ?').get(conv, seq).corps_ch;
  const poser = (conv, seq, blob) => brut.prepare('UPDATE message SET corps_ch = ? WHERE conv = ? AND seq = ?').run(blob, conv, seq);
  const c1s1 = corps(c1, 1), c1s2 = corps(c1, 2), gs2 = corps(g.id, 2);
  poser(c1, 1, c1s2); poser(c1, 2, c1s1);
  /* ⛔ Une ligne qui ne s'ouvre pas ne rend JAMAIS un texte qui n'est pas le sien : elle se dit `illisible`, sans
     texte, et les lignes saines de la même page continuent d'être lues (relecture adverse, D8 : avant, UNE ligne
     abîmée rendait 500 sur toute la conversation, et sur la liste de tous ses membres). */
  const illisible = (seqAbime, seqSain) => {
    const r = a.S.messagesDe(c1, al.id).messages, ab = r.find(m => m.seq === seqAbime), sa = r.find(m => m.seq === seqSain);
    return [ab && ab.illisible === true && ab.texte === null, !!sa && !sa.illisible && typeof sa.texte === 'string'];
  };
  const avantIll = a.S.stats().illisibles;
  poser(c1, 1, c1s2); poser(c1, 2, c1s1);
  v('⛔ deux corps PERMUTÉS dans une conversation → les deux lignes se disent illisibles, aucune ne rend le texte de l\'autre', [a.S.messagesDe(c1, al.id).messages.map(m => [m.illisible === true, m.texte])], [[[true, null], [true, null]]]);
  poser(c1, 1, c1s1); poser(c1, 2, c1s2);
  poser(c1, 1, gs2);
  v('⛔ un corps RECOPIÉ d\'une autre conversation → illisible, sans texte ; la ligne saine est lue', illisible(1, 2), [true, true]);
  poser(c1, 1, c1s1);
  brut.prepare('UPDATE message SET auteur = ? WHERE conv = ? AND seq = 1').run(bo.id, c1);
  v('⛔ l\'AUTEUR changé sur la ligne → illisible (il est dans les données associées)', illisible(1, 2), [true, true]);
  brut.prepare('UPDATE message SET auteur = ? WHERE conv = ? AND seq = 1').run(al.id, c1);
  const tronque = Buffer.from(c1s1); tronque[tronque.length - 1] ^= 0xff;
  poser(c1, 1, tronque);
  v('⛔ un octet modifié → illisible', illisible(1, 2), [true, true]);
  vrai('⛔ ces refus laissent une TRACE : le compteur `illisibles` du /health a monté (une erreur avalée sans trace est une panne silencieuse)', a.S.stats().illisibles >= avantIll + 5);
  v('la liste des conversations survit à la ligne abîmée, et son aperçu le dit', (() => { const l = a.S.convListe(al.id).find(x => x.id === c1); return [!!l, l.apercu && l.apercu.seq]; })(), [true, 2]);
  poser(c1, 2, tronque);
  v('⛔ même quand c\'est le DERNIER message qui est abîmé (celui que la liste montre) : la liste répond, l\'aperçu est illisible', (() => { const l = a.S.convListe(al.id).find(x => x.id === c1); return [l.apercu.illisible === true, l.apercu.texte]; })(), [true, null]);
  poser(c1, 2, c1s2);
  poser(c1, 1, c1s1);
  v('contre-épreuve : tout remis en place, tout s\'ouvre de nouveau', a.S.messagesDe(c1, al.id).messages.map(m => m.texte), ['premier', 'second']);
  brut.close();
}

console.log('\nL\'idempotence : un renvoi ne fait jamais deux messages — éprouvée sur DEUX passages');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const c = a.S.convDirecteObtenir(al.id, bo.id).id;
  const cids = Array.from({ length: 20 }, (_, i) => 'cid-' + String(i).padStart(8, '0'));
  const passage = () => cids.map(cid => a.S.messageEnvoyer({ conv: c, auteur: al.id, cid, texte: 'm ' + cid }));
  const p1 = passage();
  vrai('population : 20 messages créés au premier passage', p1.length === 20 && p1.every(r => r.deja === false));
  const p2 = passage();
  v('⛔ le DEUXIÈME passage ne crée rien : tout est « déjà »', p2.every(r => r.deja === true), true);
  v('et rend les MÊMES numéros que le premier', p2.map(r => r.seq), p1.map(r => r.seq));
  v('une seule ligne par cid dans la base', a.brut().prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ?').get(c).n, 20);
  v('les numéros sont contigus de 1 à 20', p1.map(r => r.seq), Array.from({ length: 20 }, (_, i) => i + 1));
  const autre = a.S.messageEnvoyer({ conv: c, auteur: bo.id, cid: cids[0], texte: 'même cid, autre auteur' });
  v('le même cid d\'un AUTRE auteur est un autre message (l\'unicité porte sur conv+auteur+cid)', [autre.deja, autre.seq], [false, 21]);
}

console.log('\n`seq` s\'attribue dans la transaction et ne bouge pas quand l\'écriture échoue');
{
  let compte = 0, casse = -1;
  const vrai1 = creerScelleur(crypto.randomBytes(32));
  const sc = Object.assign({}, vrai1, { generation: vrai1.generation, hmac: vrai1.hmac, ouvrir: vrai1.ouvrir, sceller: (...x) => { compte++; if (compte === casse) throw new Error('panne simulée'); return vrai1.sceller(...x); } });
  const a = neuf({ scelleur: sc });
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const c = a.S.convDirecteObtenir(al.id, bo.id).id;
  a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0001', texte: 'un' });
  casse = compte + 2;   // le message ci-dessous scelle son corps (+1) puis son meta (+2) : on casse le meta
  const e = lance(() => a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0002', texte: 'deux', meta: { k: 'x' } }));
  v('l\'écriture échoue (la panne simulée remonte)', e, 'panne simulée');
  const brut = a.brut();
  v('⛔ rien n\'est resté de l\'écriture échouée : dernier_seq inchangé et pas de ligne orpheline',
    [brut.prepare('SELECT dernier_seq FROM conversation WHERE id = ?').get(c).dernier_seq, brut.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ?').get(c).n, brut.prepare("SELECT COUNT(*) AS n FROM journal WHERE genre = 'msg_nouveau'").get().n], [1, 1, 1]);
  const r = a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0002', texte: 'deux' });
  v('le renvoi réussit ensuite avec le numéro SUIVANT, sans trou', r.seq, 2);
  brut.close();
  const t = a.S.tx(() => { a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0003', texte: 'trois' }); return 'ok'; });
  const e2 = lance(() => a.S.tx(() => { a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0004', texte: 'quatre' }); throw new Error('annulé'); }));
  v('une transaction englobante qui échoue annule aussi ce que ses appels internes ont écrit', [t, e2, a.S.messagesDe(c, al.id).messages.map(m => m.seq)], ['ok', 'annulé', [1, 2, 3]]);
  /* ⛔ LE CAS CI-DESSUS NE JOUE PAS LA FENÊTRE QUI COMPTE : la panne simulée tombe AVANT la première écriture (on scelle
     avant d'insérer), donc retirer la transaction ne changeait rien — la mutation « seq hors transaction » survivait.
     Ici la panne tombe APRÈS l'insertion du message ET la mise à jour de `dernier_seq` : seul un ROLLBACK les défait. */
  const piege = a.brut(); piege.exec("CREATE TRIGGER panne_journal BEFORE INSERT ON journal WHEN NEW.genre = 'msg_nouveau' BEGIN SELECT RAISE(ABORT, 'panne-apres-insertion'); END"); piege.close();
  const e3 = lance(() => a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0005', texte: 'cinq' }));
  const b3 = a.brut();
  v('⛔ une panne APRÈS l\'insertion défait TOUT : ni message orphelin, ni dernier_seq avancé', [e3 !== null, b3.prepare('SELECT dernier_seq FROM conversation WHERE id = ?').get(c).dernier_seq, b3.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ? AND cid = ?').get(c, 'cid-seq-0005').n], [true, 3, 0]);
  b3.exec('DROP TRIGGER panne_journal'); b3.close();
  v('et le renvoi réussit ensuite avec le numéro suivant, sans trou', a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-seq-0005', texte: 'cinq' }).seq, 4);
}

console.log('\n`lu_seq` est monotone, et les non-lus se comptent juste');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const c = a.S.convDirecteObtenir(al.id, bo.id).id;
  for (let i = 1; i <= 6; i++) a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-lu-' + String(i).padStart(5, '0'), texte: 'm' + i });
  const nl = (u) => a.S.convListe(u)[0].non_lus;
  v('population : Bob a 6 non lus avant de lire', nl(bo.id), 6);
  v('Alice (l\'auteur) n\'a rien de non lu', nl(al.id), 0);
  a.S.membreLu({ conv: c, uid: bo.id, seq: 4 });
  v('lu jusqu\'à 4 → 2 non lus', nl(bo.id), 2);
  const r = a.S.membreLu({ conv: c, uid: bo.id, seq: 2 });
  v('⛔ un vieux « lu » (2 après 4) ne fait PAS redevenir non lus les messages déjà lus', [r.lu_seq, nl(bo.id), r.gid], [4, 2, 0]);
  a.S.membreLu({ conv: c, uid: bo.id, seq: 999 });
  v('on ne lit pas ce qui n\'existe pas : plafonné au dernier numéro', [nl(bo.id), a.S.convPourMembre(c, bo.id).moi.lu_seq], [0, 6]);
  a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-lu-00007x', texte: 'sept' });
  a.S.messageSupprimer({ conv: c, seq: 7, uid: al.id, pour: 'tous', admin: false });
  v('un message supprimé ne compte pas comme non lu', nl(bo.id), 0);
  a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-lu-00008x', texte: 'huit' });
  a.S.messageSupprimer({ conv: c, seq: 8, uid: bo.id, pour: 'moi', admin: false });
  v('un message masqué « pour moi » ne compte pas comme non lu', nl(bo.id), 0);
}

console.log('\nLa pierre tombale, le masquage, la modification, les réactions');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob'), ca = pers(a.S, 'carl');
  a.S.contactLier(al.id, bo.id); a.S.contactLier(al.id, ca.id);
  const g = a.S.convCreerGroupe({ createur: al.id, nom: 'Équipe', membres: [bo.id, ca.id], annonces_seules: false, ephemere_s: 0 }).id;
  a.S.messageEnvoyer({ conv: g, auteur: bo.id, cid: 'cid-tomb-0001', texte: 'SECRETZXQ à effacer' });   // seq 2 (le 1 est « groupe créé »)
  a.S.messageReagir({ conv: g, seq: 2, uid: al.id, emoji: '👍' });
  v('population : la réaction existe', a.S.reactionsDe(g, 2).length, 1);
  v('⛔ supprimer le message d\'un autre sans être admin → interdit', lance(() => a.S.messageSupprimer({ conv: g, seq: 2, uid: ca.id, pour: 'tous', admin: false })), 'interdit');
  a.S.messageSupprimer({ conv: g, seq: 2, uid: bo.id, pour: 'tous', admin: false });
  const brut = a.brut();
  const l = brut.prepare('SELECT corps_ch, supprime_le FROM message WHERE conv = ? AND seq = 2').get(g);
  v('⛔ le corps s\'efface TOUT DE SUITE (NULL) et une pierre tombale reste', [l.corps_ch, typeof l.supprime_le], [null, 'number']);
  vrai('le texte n\'est plus nulle part dans le fichier', !octets(a.chemin).includes(Buffer.from('SECRETZXQ')));
  v('les réactions du message supprimé sont parties', a.S.reactionsDe(g, 2).length, 0);
  const m = a.S.messagesDe(g, al.id).messages.find(x => x.seq === 2);
  v('la lecture rend « supprimé » sans texte', [m.supprime, m.texte], [true, null]);
  a.S.messageEnvoyer({ conv: g, auteur: bo.id, cid: 'cid-tomb-0002', texte: 'masquable' });   // seq 3
  a.S.messageSupprimer({ conv: g, seq: 3, uid: ca.id, pour: 'moi', admin: false });
  v('⛔ « supprimer pour moi » ne masque qu\'à Carl', [a.S.messagesDe(g, ca.id).messages.some(x => x.seq === 3), a.S.messagesDe(g, al.id).messages.some(x => x.seq === 3)], [false, true]);
  v('un admin de groupe peut supprimer pour tous le message d\'un autre', lance(() => a.S.messageSupprimer({ conv: g, seq: 3, uid: al.id, pour: 'tous', admin: true })), null);
  v('on ne supprime pas un message système pour tous', lance(() => a.S.messageSupprimer({ conv: g, seq: 1, uid: al.id, pour: 'tous', admin: true })), 'type');
  a.S.messageEnvoyer({ conv: g, auteur: bo.id, cid: 'cid-modif-0001', texte: 'avant' });   // seq 4
  v('⛔ seul l\'auteur modifie son message', lance(() => a.S.messageModifier({ conv: g, seq: 4, auteur: al.id, texte: 'piraté' })), 'interdit');
  a.S.messageModifier({ conv: g, seq: 4, auteur: bo.id, texte: 'après' });
  v('la modification est lue', a.S.messagesDe(g, al.id).messages.find(x => x.seq === 4).texte, 'après');
  a.h.t += 15 * 60 * 1000 + 1;
  v('⛔ au-delà de 15 minutes, plus de modification (horloge injectée)', lance(() => a.S.messageModifier({ conv: g, seq: 4, auteur: bo.id, texte: 'trop tard' })), 'delai');
  v('un message supprimé ne se modifie pas', lance(() => a.S.messageModifier({ conv: g, seq: 2, auteur: bo.id, texte: 'x' })), 'introuvable');
  a.S.messageReagir({ conv: g, seq: 4, uid: al.id, emoji: '👍' });
  a.S.messageReagir({ conv: g, seq: 4, uid: al.id, emoji: '❤️' });
  v('une personne a UNE réaction par message : la nouvelle remplace', a.S.reactionsDe(g, 4).map(r => r.emoji), ['❤️']);
  a.S.messageReagir({ conv: g, seq: 4, uid: al.id, emoji: '❤️' });
  v('la même réaction deux fois la retire', a.S.reactionsDe(g, 4).length, 0);
  brut.close();
}

console.log('\nLes messages éphémères (horloge injectable) — la ligne ENTIÈRE part, l\'identifiant est noté');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const eph = a.S.convCreerGroupe({ createur: al.id, nom: 'Éphémère', membres: [bo.id], annonces_seules: false, ephemere_s: 86400 }).id;
  const dur = a.S.convCreerGroupe({ createur: al.id, nom: 'Durable', membres: [bo.id], annonces_seules: false, ephemere_s: 0 }).id;
  a.S.messageEnvoyer({ conv: eph, auteur: al.id, cid: 'cid-eph-00001', texte: 'ZXEPHEMERE' });
  a.S.messageEnvoyer({ conv: dur, auteur: al.id, cid: 'cid-eph-00002', texte: 'ZXDURABLE' });
  // Une arrivée APRÈS le message éphémère : elle ne l'a jamais vu, l'annonce de sa purge ne la concerne pas non plus.
  const ev0 = pers(a.S, 'eve'); a.S.contactLier(al.id, ev0.id);
  a.S.membresAjouter({ conv: eph, par: al.id, uids: [ev0.id] });
  const seqEph = a.S.messagesDe(eph, al.id).messages.find(x => x.texte === 'ZXEPHEMERE').seq;
  const avant = a.S.purgerExpires();
  v('population : rien d\'échu au départ, et la purge n\'efface rien', avant.n, 0);
  a.h.t += 86400 * 1000 - 1;
  v('à une milliseconde de l\'échéance rien ne part', a.S.purgerExpires().n, 0);
  a.h.t += 2;
  const r = a.S.purgerExpires();
  v('à l\'échéance, le message éphémère part (les systèmes aussi : ils expirent comme les autres)', r.convs.includes(eph), true);
  const brut = a.brut();
  v('⛔ la ligne a DISPARU de la base (pas un simple corps vidé)', brut.prepare("SELECT COUNT(*) AS n FROM message WHERE conv = ? AND type = 'texte'").get(eph).n, 0);
  vrai('⛔ le texte n\'est plus nulle part dans le fichier', !octets(a.chemin).includes(Buffer.from('ZXEPHEMERE')));
  v('l\'identifiant est noté dans `purge`', brut.prepare("SELECT COUNT(*) AS n FROM purge WHERE genre = 'message_ephemere'").get().n >= 1, true);
  v('le message du groupe durable est intact', a.S.messagesDe(dur, al.id).messages.some(x => x.texte === 'ZXDURABLE'), true);
  v('un événement d\'EXPIRATION (pas de suppression « pour tous ») est écrit pour prévenir les flux', brut.prepare("SELECT COUNT(*) AS n FROM journal WHERE genre = 'msg_expire' AND conv = ?").get(eph).n >= 1, true);
  const expiree = (uid) => a.S.evenementsPour(uid, 0, 500).evenements.filter(e => e.event === 'message_supprime' && e.data.conv === eph && e.data.seq === seqEph).map(e => e.data.pour);
  v('⛔ l\'annonce de la purge dit « expire » à qui a vu le message', expiree(bo.id), ['expire']);
  v('⛔ …et ne dit RIEN à qui est arrivé après (elle ne doit pas apprendre qu\'un message a existé avant elle)', expiree(ev0.id), []);
  brut.close();
  a.S.convMaj({ conv: dur, par: al.id, ephemere_s: 604800 });
  a.S.messageEnvoyer({ conv: dur, auteur: al.id, cid: 'cid-eph-00003', texte: 'après réglage' });
  a.h.t += 604800 * 1000 + 1;
  a.S.purgerExpires();
  v('régler l\'éphémère ne touche pas ce qui existait (le message d\'avant reste), seul le suivant expire',
    a.S.messagesDe(dur, al.id).messages.filter(x => x.type === 'texte').map(x => x.texte), ['ZXDURABLE']);
}

console.log('\nUn objet sans droit n\'existe pas : null pour « inconnu » comme pour « pas membre »');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob'), ev = pers(a.S, 'eve');
  a.S.contactLier(al.id, bo.id);
  const c = a.S.convDirecteObtenir(al.id, bo.id).id;
  vrai('population : un membre voit bien la conversation', !!a.S.convPourMembre(c, al.id));
  const inconnue = a.S.convPourMembre('c_' + '0'.repeat(32), al.id), pasMembre = a.S.convPourMembre(c, ev.id);
  v('⛔ la même réponse (null) pour une conversation inexistante et pour un non-membre', [inconnue, pasMembre], [null, null]);
  v('⛔ les messages d\'une conversation dont on n\'est pas membre : null aussi', a.S.messagesDe(c, ev.id), null);
  a.S.messageEnvoyer({ conv: c, auteur: al.id, cid: 'cid-droit-0001', texte: 'privé' });
  v('un non-membre ne voit aucun événement de la conversation (population comptée d\'abord)', [a.S.evenementsPour(bo.id, 0).evenements.length > 0, a.S.evenementsPour(ev.id, 0).evenements.length], [true, 0]);
}

console.log('\nLa visibilité des événements : la même requête sert la reprise et le direct');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob'), ca = pers(a.S, 'carl');
  a.S.contactLier(al.id, bo.id); a.S.contactLier(al.id, ca.id);
  const g = a.S.convCreerGroupe({ createur: al.id, nom: 'G', membres: [bo.id], annonces_seules: false, ephemere_s: 0 }).id;
  a.S.messageEnvoyer({ conv: g, auteur: al.id, cid: 'cid-vis-00001', texte: 'avant carl' });
  const ajout = a.S.membresAjouter({ conv: g, par: al.id, uids: [ca.id] });
  a.S.messageEnvoyer({ conv: g, auteur: al.id, cid: 'cid-vis-00002', texte: 'après carl' });
  const evC = a.S.evenementsPour(ca.id, 0).evenements.filter(e => e.event === 'message');
  v('⛔ un nouveau membre ne reçoit PAS les événements d\'avant son arrivée (depuis_seq)', evC.map(e => e.data.texte || e.data.type), ['systeme', 'après carl'].map((x, i) => i === 0 ? 'systeme' : x));
  v('et sa lecture de l\'historique est bornée de la même façon', a.S.messagesDe(g, ca.id).messages.filter(m => m.type === 'texte').map(m => m.texte), ['après carl']);
  v('Bob, membre depuis le début, voit tout', a.S.messagesDe(g, bo.id).messages.filter(m => m.type === 'texte').map(m => m.texte), ['avant carl', 'après carl']);
  const dernierBob = a.S.evenementsPour(bo.id, 0).dernier;
  a.S.messageEnvoyer({ conv: g, auteur: al.id, cid: 'cid-vis-00003', texte: 'écrit avant le retrait' });
  a.S.membreRetirer({ conv: g, par: al.id, uid: bo.id });
  const apres = a.S.evenementsPour(bo.id, dernierBob).evenements;
  v('⛔ un membre retiré ne reçoit PLUS RIEN de la conversation — même un message déjà écrit mais pas encore envoyé', apres.filter(e => e.event === 'message').length, 0);
  v('mais il reçoit l\'événement qui lui dit qu\'il est parti', apres.map(e => e.event), ['retire']);
  v('et Carl, resté, reçoit bien le message (le contrôle ne coupe pas tout)', a.S.evenementsPour(ca.id, evC[evC.length - 1].gid).evenements.filter(e => e.event === 'message').length, 2);
  vrai('l\'ajout a écrit un événement de conversation (gid renvoyé)', ajout.gid > 0);
}

console.log('\nGroupes : dernier admin, départ, conversation vide');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob'), ca = pers(a.S, 'carl');
  a.S.contactLier(al.id, bo.id); a.S.contactLier(al.id, ca.id);
  const g = a.S.convCreerGroupe({ createur: al.id, nom: 'G', membres: [bo.id, ca.id], annonces_seules: false, ephemere_s: 0 }).id;
  v('⛔ le dernier administrateur ne se rétrograde pas', lance(() => a.S.membreRole({ conv: g, par: al.id, uid: al.id, admin: false })), 'dernier_admin');
  const q = a.S.membreQuitter({ conv: g, uid: al.id });
  v('⛔ le dernier admin qui part laisse la main au plus ANCIEN membre (Bob)', [q.promu, a.S.nbAdmins(g)], [bo.id, 1]);
  v('Alice n\'est plus membre', a.S.convPourMembre(g, al.id), null);
  a.S.membreQuitter({ conv: g, uid: ca.id });
  const brut = a.brut();
  const avantVide = brut.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ?').get(g).n;
  vrai('population : la conversation avait des messages (systèmes) avant le dernier départ', avantVide > 0);
  const dernier = a.S.membreQuitter({ conv: g, uid: bo.id });
  v('le dernier membre qui part emporte la conversation (messages compris, par cascade)', [dernier.vide, brut.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ?').get(g).n, brut.prepare('SELECT COUNT(*) AS n FROM conversation WHERE id = ?').get(g).n, brut.prepare('SELECT COUNT(*) AS n FROM membre WHERE conv = ?').get(g).n], [true, 0, 0, 0]);
  const d = a.S.convDirecteObtenir(al.id, bo.id).id;
  v('on ne « quitte » pas une conversation directe', lance(() => a.S.membreQuitter({ conv: d, uid: al.id })), 'conversation_directe');
  v('on n\'ajoute pas de monde à une directe', lance(() => a.S.membresAjouter({ conv: d, par: al.id, uids: [ca.id] })), 'conversation_directe');
  brut.close();
}

console.log('\nUne seule conversation directe par paire, quel que soit l\'ordre');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob');
  a.S.contactLier(al.id, bo.id);
  const x = a.S.convDirecteObtenir(al.id, bo.id), y = a.S.convDirecteObtenir(bo.id, al.id), z = a.S.convDirecteObtenir(al.id, bo.id);
  v('trois demandes (dans les deux sens), une seule conversation', [x.cree, y.cree, z.cree, new Set([x.id, y.id, z.id]).size], [true, false, false, 1]);
  v('une directe vide n\'apparaît que chez celle qui l\'a ouverte', [a.S.convListe(al.id).length, a.S.convListe(bo.id).length], [1, 0]);
}

console.log('\nLiens : expiré, épuisé et révoqué répondent pareil ; un lien se décompte une fois');
{
  const a = neuf();
  const al = pers(a.S, 'alice'), bo = pers(a.S, 'bob'), ca = pers(a.S, 'carl');
  const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
  a.S.lienCreer({ h: hash('un'), genre: 'contact', cible: null, par: al.id, ttlMs: 3600000, max: 1 });
  vrai('population : un lien valide existe', !!a.S.lienValide(hash('un')));
  a.S.lienAccepter({ h: hash('un'), uid: bo.id });
  v('⛔ un lien à usage unique, épuisé, répond comme un lien inconnu (null)', [a.S.lienValide(hash('un')), a.S.lienValide(hash('inconnu'))], [null, null]);
  v('et son acceptation par un autre est refusée « lien_invalide »', lance(() => a.S.lienAccepter({ h: hash('un'), uid: ca.id })), 'lien_invalide');
  a.S.lienCreer({ h: hash('deux'), genre: 'contact', cible: null, par: al.id, ttlMs: 1000, max: 5 });
  a.h.t += 1001;
  v('⛔ un lien expiré (horloge) répond comme un inconnu', a.S.lienValide(hash('deux')), null);
  a.S.lienCreer({ h: hash('trois'), genre: 'contact', cible: null, par: al.id, ttlMs: 3600000, max: 3 });
  a.S.lienAccepter({ h: hash('trois'), uid: ca.id });
  a.S.lienAccepter({ h: hash('trois'), uid: ca.id });
  v('⛔ la même personne qui rejoue le lien ne le décompte pas deux fois (restants 3 → 2, pas 1)', a.brut().prepare('SELECT restants FROM lien WHERE h = ?').get(hash('trois')).restants, 2);
  v('on n\'accepte pas son propre lien', lance(() => a.S.lienAccepter({ h: hash('trois'), uid: al.id })), 'lien_propre');
  a.S.contactBloque(al.id, bo.id);
  a.S.lienCreer({ h: hash('quatre'), genre: 'contact', cible: null, par: bo.id, ttlMs: 3600000, max: 3 });
  a.S.contactEtat(al.id, bo.id, 'bloque');
  v('⛔ un lien d\'une personne qu\'on a bloquée est « lien_invalide » (on ne le dit pas)', lance(() => a.S.lienAccepter({ h: hash('quatre'), uid: al.id })), 'lien_invalide');
}

console.log('\nSessions : échéance, glissement, dix appareils au plus');
{
  const a = neuf();
  const al = pers(a.S, 'alice');
  const MOIS = 30 * 86400000;
  a.S.sessionAjouter({ h: 'h-a', personne: al.id, appareil: 'tel', ttlMs: MOIS });
  vrai('population : la session se lit', !!a.S.sessionLire('h-a'));
  a.h.t += MOIS - 1000;
  vrai('à 1 s de l\'échéance elle vit encore', !!a.S.sessionLire('h-a'));
  a.S.sessionToucher('h-a', MOIS);
  a.h.t += 2000;
  v('⛔ l\'échéance a GLISSÉ (touchée à l\'approche de la fin) : elle vit encore après l\'ancienne date', !!a.S.sessionLire('h-a'), true);
  a.h.t += MOIS;
  v('sans nouvel usage elle meurt', a.S.sessionLire('h-a'), null);
  for (let i = 0; i < 12; i++) { a.h.t += 10; a.S.sessionAjouter({ h: 'h-' + i, personne: al.id, appareil: null, ttlMs: MOIS }); }
  v('⛔ douze connexions → dix sessions gardées, les PLUS ANCIENNES fermées', [a.brut().prepare('SELECT COUNT(*) AS n FROM session WHERE personne = ?').get(al.id).n, !!a.S.sessionLire('h-0'), !!a.S.sessionLire('h-11')], [10, false, true]);
  v('couper toutes les sessions d\'une personne', [a.S.sessionsSupprimerPersonne(al.id), a.S.sessionLire('h-11')], [10, null]);
}

console.log('\nL\'élagage du journal : 7 jours ou 10 000 lignes');
{
  const a = neuf();
  const brut = a.brut();
  brut.exec('BEGIN');
  const ins = brut.prepare("INSERT INTO journal(genre, conv, uid, ref, ts) VALUES('conv_maj', NULL, NULL, '', ?)");
  for (let i = 0; i < 10100; i++) ins.run(a.h.t);
  brut.exec('COMMIT');
  const avant = brut.prepare('SELECT COUNT(*) AS n FROM journal').get().n;
  vrai('population : 10 100 lignes avant l\'élagage', avant === 10100);
  a.S.journalElaguer();
  const apres = brut.prepare('SELECT COUNT(*) AS n, MIN(gid) AS m FROM journal').get();
  v('⛔ plus de 10 000 lignes → on garde les 10 000 dernières', [apres.n, apres.m], [10000, 101]);
  v('le plus petit numéro retenu se lit (pour décider d\'un `resync`)', a.S.journalMin(), 101);
  a.h.t += 7 * 86400000 + 1;
  a.S.journalElaguer();
  v('⛔ au-delà de 7 jours tout est élagué, et le plus grand numéro reste connu (AUTOINCREMENT)', [brut.prepare('SELECT COUNT(*) AS n FROM journal').get().n, a.S.journalMax(), a.S.journalMin()], [0, 10100, null]);
  brut.close();
}

console.log('\nTout le SQL vit dans stockage.js, et jamais concaténé');
{
  const code = (p) => T.sansCommentaires(fs.readFileSync(p, 'utf8'));
  const dossier = fs.readdirSync(T.SERVICE).filter(f => f.endsWith('.js')).concat(fs.readdirSync(path.join(T.SERVICE, 'public')).filter(f => f.endsWith('.js')).map(f => 'public/' + f));
  const ailleurs = [];
  for (const f of dossier) {
    if (f === 'stockage.js') continue;
    const c = code(path.join(T.SERVICE, f));
    if (/node:sqlite|DatabaseSync|\.prepare\(|\b(db|conn|database)\.exec\(|\b(SELECT\b[^;'"`]{0,60}\bFROM|INSERT INTO|DELETE FROM|CREATE TABLE|UPDATE\s+\w+\s+SET)\b/.test(c)) ailleurs.push(f);
  }
  v('⛔ aucun SQL ni aucun accès à la base hors de stockage.js', ailleurs, []);
  const s = code(path.join(T.SERVICE, 'stockage.js'));
  vrai('population : stockage.js contient des requêtes à examiner', (s.match(/\bQ\(/g) || []).length > 50);
  const fautes = [];
  let vus = 0, permis = 0;
  const re = /\b(Q|X|prepare|exec)\(\s*/g; let m;
  while ((m = re.exec(s))) {
    const deb = m.index + m[0].length, ch = s[deb];
    if (m[1] === 'exec' && !/db\.exec$/.test(s.slice(0, m.index + 4))) continue;
    if (/const (Q|X) =/.test(s.slice(Math.max(0, m.index - 12), m.index + 6))) continue;
    if (ch !== '\'' && ch !== '"' && ch !== '`') {
      /* Les TROIS endroits où un nom passe : la définition de `Q`, celle de `X`, et la boucle des
         migrations (un tableau de littéraux). Tout autre argument non littéral est une faute. */
      const extrait = s.slice(m.index, m.index + 14);
      if (/^(prepare\(sql\)|exec\(sql\)|X\(s\))/.test(extrait)) { permis++; continue; }
      fautes.push('argument non littéral : ' + s.slice(m.index, m.index + 40).replace(/\n/g, ' ')); continue;
    }
    let j = deb + 1;
    while (j < s.length && s[j] !== ch) { if (s[j] === '\\') j++; if (ch === '`' && s[j] === '$' && s[j + 1] === '{') { fautes.push('interpolation ${} dans une requête'); break; } j++; }
    const apres = s.slice(j + 1).match(/^\s*(\S)/);
    if (!apres || (apres[1] !== ')' && apres[1] !== ',')) fautes.push('littéral suivi de ' + (apres ? apres[1] : '?') + ' : ' + s.slice(m.index, m.index + 50).replace(/\n/g, ' '));
    vus++;
  }
  vrai("population : plus de 50 requêtes examinées une à une, et exactement trois noms passés (Q, X, boucle des migrations)", vus > 50 && permis === 3);
  v('⛔ chaque requête est un LITTÉRAL (ni concaténation, ni variable, ni ${})', fautes, []);
  const migs = MIGRATIONS.flatMap(x => x.sql);
  vrai('les migrations sont des littéraux aussi (pas de texte construit)', migs.every(x => typeof x === 'string'));
}

fs.rmSync(bac, { recursive: true, force: true });
fin();
