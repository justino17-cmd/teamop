/* ══ LE STOCKAGE — SQLite (node:sqlite) POUR L'INDEX, DES FICHIERS SCELLÉS POUR LES PDF ═══════════════════════════════════════
 * La fiche d'une demande (signataires, adresses, événements) est UN document JSON SCELLÉ dans la colonne `corps` ; seules les colonnes
 * dont on cherche (proprio, état, identifiant Yousign, dates de purge) sont en clair, et aucune n'est une donnée personnelle (le
 * « proprio » est l'identifiant opaque du compte de la Tour). Les PDF vivent dans `pieces/`, un fichier scellé par pièce, écrit par
 * fichier temporaire puis renommage (un PDF tronqué ne se lit jamais).
 */
'use strict';
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');

function ouvrirStockage({ data, scelle, horloge = Date.now }) {
  fs.mkdirSync(path.join(data, 'pieces'), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(data, 'courrier.db'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS demandes (id TEXT PRIMARY KEY, proprio TEXT NOT NULL, ys_id TEXT, etat TEXT NOT NULL, cree INTEGER NOT NULL, purge INTEGER NOT NULL, corps BLOB NOT NULL);
    CREATE INDEX IF NOT EXISTS demandes_proprio ON demandes(proprio, cree);
    CREATE INDEX IF NOT EXISTS demandes_ys ON demandes(ys_id);
    CREATE TABLE IF NOT EXISTS evenements (id TEXT PRIMARY KEY, recu INTEGER NOT NULL);`);
  const q = {
    lire: db.prepare('SELECT corps FROM demandes WHERE id=?'),
    ecrire: db.prepare('INSERT INTO demandes(id,proprio,ys_id,etat,cree,purge,corps) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET ys_id=excluded.ys_id, etat=excluded.etat, purge=excluded.purge, corps=excluded.corps'),
    liste: db.prepare('SELECT id, corps FROM demandes WHERE proprio=? ORDER BY cree DESC LIMIT 200'),
    parYs: db.prepare('SELECT id FROM demandes WHERE ys_id=?'),
    echues: db.prepare('SELECT id FROM demandes WHERE purge<=?'),
    aRecuperer: db.prepare("SELECT id FROM demandes WHERE etat='signe'"),
    supprimer: db.prepare('DELETE FROM demandes WHERE id=?'),
    evt: db.prepare('INSERT OR IGNORE INTO evenements(id,recu) VALUES(?,?)'),
    evtOter: db.prepare('DELETE FROM evenements WHERE id=?'),
    evtVieux: db.prepare('DELETE FROM evenements WHERE recu<?'),
    compte: db.prepare('SELECT COUNT(*) AS n FROM demandes'),
  };
  const fichier = (id, genre) => path.join(data, 'pieces', id + '.' + genre);
  const sain = (s, re) => { if (!re.test(s)) throw new Error('nom interne refusé'); return s; };
  const ID = /^[0-9a-f]{24}$/, GENRE = /^(src|sig|preuve)[0-9]{0,2}$/;

  return {
    lire(id) { const r = q.lire.get(sain(id, ID)); return r ? scelle.ouvrirJSON(Buffer.from(r.corps), id) : null; },
    ecrire(rec) { q.ecrire.run(rec.id, rec.proprio, rec.ysId || null, rec.etat, rec.cree, rec.purge, scelle.scellerJSON(rec, rec.id)); },
    lister(proprio) { return q.liste.all(proprio).map((r) => { try { return scelle.ouvrirJSON(r.corps, r.id); } catch (e) { return null; } }).filter(Boolean); },
    idParYs: (ysId) => { const r = q.parYs.get(String(ysId)); return r ? r.id : null; },
    echues: (now) => q.echues.all(now).map((r) => r.id),
    signees: () => q.aRecuperer.all().map((r) => r.id),
    compter: () => q.compte.get().n,
    pieceEcrire(id, genre, buf) {
      const f = fichier(sain(id, ID), sain(genre, GENRE)), t = f + '.tmp' + process.pid;
      fs.writeFileSync(t, scelle.sceller(buf, 'pdf', id + ':' + genre), { mode: 0o600 }); fs.renameSync(t, f);
    },
    pieceLire(id, genre) {
      try { return scelle.ouvrir(fs.readFileSync(fichier(sain(id, ID), sain(genre, GENRE))), 'pdf', id + ':' + genre); }
      catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    },
    piecesEffacer(id, prefixe) {   // prefixe : 'src' | 'sig' | 'preuve' | undefined (tout)
      sain(id, ID);
      for (const f of fs.readdirSync(path.join(data, 'pieces'))) if (f.startsWith(id + '.') && (!prefixe || f.slice(id.length + 1).startsWith(prefixe))) fs.rmSync(path.join(data, 'pieces', f), { force: true });
    },
    supprimer(id) { sain(id, ID); this.piecesEffacer(id); q.supprimer.run(id); },
    /* idempotence du webhook : vrai si l'événement est NEUF (et le retient), faux s'il a déjà été vu */
    evenementNeuf: (eid) => q.evt.run(String(eid), horloge()).changes === 1,
    evenementOter: (eid) => q.evtOter.run(String(eid)),
    evenementsPurger: (avant) => q.evtVieux.run(avant),
    fermer() { try { db.close(); } catch (e) { /* déjà fermée */ } },
  };
}
module.exports = { ouvrirStockage };
