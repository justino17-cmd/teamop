/* ══ g14 · technicien#7 — LES PASTILLES DU MENU SUIVENT LE PÉRIMÈTRE ════════════════════════════════════
   Mesuré : le badge « Clients » d'un technicien affichait 7 (db.clients) alors que sa liste en montre 4 — le nombre de clients de
   TOUTE l'entreprise fuyait dans le menu. Les commentaires de refreshBadges promettaient pourtant « jamais 19 box quand elle n'en
   voit qu'une » : seuls int, box et veh suivaient. Devis, factures et contrats se rattachent au client (visibleDocs).
   Ce banc EXÉCUTE la vraie refreshBadges avec les VRAIES visibleClients / visibleDocs / mesClientIds / creeParMoi ; seuls
   `can`, `perimetreUserIds` et `visibleInts` (le périmètre des interventions, déjà gardé ailleurs) sont des doubles.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
console.log('\n── 1212 · 0. la population ──');
const RB = bloc('function refreshBadges('), VC = bloc('function visibleClients('), VD = bloc('function visibleDocs('), MC = bloc('function mesClientIds('), CM = bloc('function creeParMoi(');
vrai('les fonctions sont trouvées', RB.length > 250 && VC.length > 100 && VD.length > 150 && MC.length > 80 && CM.length > 50, [RB.length, VC.length, VD.length, MC.length, CM.length]);
vrai('⛔ une seule définition de chacune', ['function refreshBadges(', 'function visibleClients(', 'function visibleDocs('].every(n => SRC.split(n).length === 2));

function monde(voirTout) {
  const els = ['int', 'cli', 'prd', 'box', 'env', 'veh', 'usr', 'dev', 'fac', 'ctr', 'four'].map(b => ({ dataset: { badge: b }, textContent: '0' }));
  const clients = [1, 2, 3, 4, 5, 6, 7].map(n => ({ id: 'c' + n, nom: 'Client ' + n }));
  const db = { clients,
    interventions: [{ id: 'i1', clientId: 'c1' }, { id: 'i2', clientId: 'c2' }, { id: 'i3', clientId: 'c3' }, { id: 'i4', clientId: 'c3' }, { id: 'i5', clientId: 'c4' }, { id: 'i6', clientId: 'c5' }, { id: 'i7', clientId: 'c6' }],
    produits: [{}, {}, {}], boxes: [], enveloppes: [], vehicules: [], users: [{}, {}, {}],
    devis: [{ id: 'd1', clientId: 'c1' }, { id: 'd2', clientId: 'c4' }, { id: 'd3', clientId: 'c7' }],
    factures: [{ id: 'f1', clientId: 'c2' }, { id: 'f2', clientId: 'c7' }, { id: 'f3', clientId: 'c6' }],
    contrats: [{ id: 't1', clientId: 'c3' }, { id: 't2', clientId: 'c6' }, { id: 't3', clientId: 'c7' }], fournisseurs: [{}, {}] };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __els: els, db, currentUser: { id: 'tech', role: 'technicien' },
    document: { querySelectorAll: s => s === '[data-badge]' ? els : [] } };
  vm.createContext(ctx);
  vm.runInContext(`
    function can(k){ return k==='voirTout' && ${!!voirTout}; }
    function perimetreUserIds(){ return null; }
    // le périmètre des interventions du technicien : les quatre premières clientes c1..c4 (i1..i5) — 4 clients atteints, pas 7
    function visibleInts(list){ return (list||[]).filter(i=>['i1','i2','i3','i4','i5'].indexOf(i.id)>=0); }
    function visibleBoxes(l){ return l||[]; } function visibleVehicules(l){ return l||[]; }
    ${MC}\n${CM}\n${VC}\n${VD}\n${RB}`, ctx);
  return ctx;
}
const lire = W => Object.fromEntries(W.__els.map(e => [e.dataset.badge, +e.textContent]));

console.log('\n── 1212 · un technicien : les pastilles suivent sa liste ──');
{ const W = monde(false); W.refreshBadges(); const b = lire(W);
  const vis = JSON.parse(JSON.stringify(vm.runInContext('visibleClients(db.clients)', W)));
  vrai('population : il voit 4 clients sur 7 (et pas 0, pas 7)', vis.length === 4 && W.db.clients.length === 7, vis.length);
  vrai('⛔ le badge « Clients » = ses 4 clients, pas les 7 de l\'entreprise', b.cli === 4, b.cli);
  vrai('devis : ceux de ses clients (2 sur 3)', b.dev === 2, b.dev);
  vrai('factures : celles de ses clients (1 sur 3)', b.fac === 1, b.fac);
  vrai('contrats : ceux de ses clients (1 sur 3)', b.ctr === 1, b.ctr);
  vrai('les badges déjà bornés ne bougent pas (interventions : ses 5)', b.int === 5, b.int);
  vrai('les listes que l\'écran montre en entier gardent leur total (produits 3, fournisseurs 2, utilisateurs 3)', b.prd === 3 && b.four === 2 && b.usr === 3, [b.prd, b.four, b.usr]); }

console.log('\n── 1212 · « Tout voir » sans périmètre : rien ne se perd ──');
{ const W = monde(true); W.refreshBadges(); const b = lire(W);
  vrai('clients 7, devis 3, factures 3, contrats 3', b.cli === 7 && b.dev === 3 && b.fac === 3 && b.ctr === 3, b); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
