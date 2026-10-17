/* ══ g15 · accueil#0 — IMPORTER UN FICHIER JSON QUI N'EST PAS UNE SAUVEGARDE VIDAIT TOUTE LA BASE ═════════════
   `importData` faisait `db = migrate(JSON.parse(...))` sans regarder ce que le fichier contenait : `{}`, `[]` ou
   `{"foo":1}` se parsent, `migrate()` complète par des listes VIDES, et la base de l'entreprise — comptes compris,
   l'administrateur aussi — était remplacée, puis poussée à toute l'équipe par la synchro. Seul un fichier qui ne
   se parse pas était refusé.

   Ce banc EXÉCUTE la vraie `importData` (et son validateur `sauvegardeMotifRefus`) extraites d'app.html, avec un
   FileReader, un `confirm` et un `migrate` de bac à sable : il observe ce qui arrive à `db`, au `confirm` et au toast.
   `migrate` y est un double qui complète les listes manquantes comme le vrai (cols.forEach(d[c]=d[c]||[])) ; l'aller-
   retour avec le VRAI export est joué au navigateur (scratchpad/gestion/correctifs/g15/sonde-import.js).        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1280 · 0. la population ──');
const IMP = bloc('function importData(e){'), VAL = bloc('function sauvegardeMotifRefus(d){'), COLL = ligne('const COLLECTIONS_DONNEES=');
vrai('importData est trouvée', IMP.length > 200);
vrai('⛔ une seule définition de importData (une seconde gagnerait partout, en silence)', SRC.split('function importData(').length - 1 === 1);
vrai('COLLECTIONS_DONNEES est trouvée', COLL.length > 100);

const MIGRATE_COLS = ['users', 'techniciens', 'clients', 'interventions', 'boxes', 'enveloppes', 'produits', 'mouvements', 'vehicules', 'demandes', 'bons', 'journal', 'devis', 'factures', 'contrats', 'pointages', 'champsPerso', 'fournisseurs', 'messages', 'groupes', 'conducteurs', 'produitsDonnes', 'brouillons', 'telecollectes', 'taches', 'absences', 'chantiers', 'registres'];
function monde(confirmeOui) {
  const base = { users: [{ id: 'uA', role: 'admin', login: 'a' }], clients: [{ id: 'c1' }, { id: 'c2' }], interventions: [{ id: 'i1' }], produits: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, __toasts: [], __confirms: 0, __saves: 0, __pousses: 0, db: base };
  ctx.confirm = () => { ctx.__confirms++; return confirmeOui; };
  ctx.FileReader = function () { this.readAsText = function (f) { this.result = f.contenu; const me = this; Promise.resolve().then(() => me.onload && me.onload()); }; };
  vm.createContext(ctx);
  vm.runInContext(`${COLL.replace('const ', 'var ')}
    var _dbGen=0;
    function adminSeul(){ return true; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function renderNav(){} function go(){} function ombreRelever(){}
    function migrate(d){ ${JSON.stringify(MIGRATE_COLS)}.forEach(function(c){ d[c]=d[c]||[]; }); return d; }
    ${VAL}
    ${IMP}`, ctx);
  return ctx;
}
const jouer = async (contenu, oui = true, nom = 'x.json') => {
  const W = monde(oui); const avant = JSON.stringify(W.db);
  W.importData({ target: { files: [{ name: nom, contenu }], value: 'x' } });
  await new Promise(r => setTimeout(r, 20));
  return { W, intacte: JSON.stringify(W.db) === avant, toast: W.__toasts.join(' | '), confirms: W.__confirms, saves: W.__saves };
};

(async () => {
  console.log('\n── 1280 · 1. ce qui n\'est PAS une sauvegarde est refusé, base intacte, SANS confirm ──');
  for (const [nom, contenu] of [['{}', '{}'], ['[]', '[]'], ['{"foo":1}', '{"foo":1}'], ['null', 'null'], ['un nombre', '42'], ['une chaîne', '"texte"'],
    ['collections d\'un autre type', '{"clients":"oups","users":[]}'], ['comptes seuls, sans donnée', '{"users":[{"id":"u","role":"admin"}]}'],
    ['données sans aucun compte', '{"clients":[{"id":"c"}],"interventions":[]}'], ['données avec comptes vides', '{"clients":[{"id":"c"}],"users":[]}'],
    ['sans administrateur', '{"clients":[{"id":"c"}],"users":[{"id":"u","role":"technicien"}]}'], ['users en objet', '{"clients":[],"users":{"a":1}}']]) {
    const r = await jouer(contenu);
    vrai('« ' + nom + ' » : base INTACTE', r.intacte, r.W.db && Object.keys(r.W.db));
    vrai('« ' + nom + ' » : refus DIT (« refusé »), pas « Importé »', /refus/i.test(r.toast) && !/Importé/.test(r.toast), r.toast);
    vrai('« ' + nom + ' » : aucun confirm inutile, aucun save', r.confirms === 0 && r.saves === 0, [r.confirms, r.saves]);
  }
  { const r = await jouer('pas du json');
    vrai('contre-épreuve existante : un texte non JSON reste « Fichier invalide », base intacte', r.intacte && /Fichier invalide/.test(r.toast), r.toast); }

  console.log('\n── 1280 · 2. une VRAIE sauvegarde passe (chaque forme que produit exportData) ──');
  const exportComplet = {}; MIGRATE_COLS.forEach(c => { exportComplet[c] = []; });
  exportComplet.users = [{ id: 'uA', role: 'admin', login: 'a', prenom: 'A', nom: 'B' }, { id: 'uT', role: 'technicien', login: 't' }];
  exportComplet.clients = [{ id: 'c9', nom: 'Neuf' }]; exportComplet.permissions = {}; exportComplet.numMax = {}; exportComplet.entreprise = { nom: 'X' };
  { const r = await jouer(JSON.stringify(exportComplet, null, 2));
    vrai('un export complet : le confirm est posé, la base est remplacée, « Importé »', r.confirms === 1 && !r.intacte && /Importé/.test(r.toast) && r.W.db.clients[0].id === 'c9' && r.saves === 1, [r.confirms, r.toast]);
    vrai('… et migrate a complété les listes (la bêta n\'ajoute rien de contraire)', MIGRATE_COLS.every(c => Array.isArray(r.W.db[c]))); }
  { // une sauvegarde ANCIENNE : aucune collection récente (chantiers, registres, telecollectes…) — ce n'est pas un défaut
    const ancien = { users: [{ id: 'uA', role: 'admin' }], clients: [{ id: 'c1' }], interventions: [], produits: [] };
    const r = await jouer(JSON.stringify(ancien));
    vrai('une vieille sauvegarde sans collection récente est acceptée', r.confirms === 1 && /Importé/.test(r.toast) && Array.isArray(r.W.db.chantiers), r.toast); }
  { const ancien = { users: [{ id: 'uA', role: 'admin' }], techniciens: [] };
    const r = await jouer(JSON.stringify(ancien));
    vrai('une sauvegarde d\'une entreprise encore vide (comptes + une liste vide) est acceptée', r.confirms === 1 && /Importé/.test(r.toast), r.toast); }
  { const r = await jouer(JSON.stringify(exportComplet), false);
    vrai('contre-épreuve : le confirm REFUSÉ par la personne n\'importe rien', r.intacte && r.saves === 0 && r.confirms === 1, [r.intacte, r.saves]); }

  console.log('\n' + (ok + ko > 0 ? '' : '') + '══ test-1280 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
