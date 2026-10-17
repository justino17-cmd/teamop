/* ══ g10 · clients#8 (1/2) — LA RECHERCHE GLOBALE TROUVE UN CLIENT COMME ON LE CHERCHE SUR LE TERRAIN ═════
   Mesuré au navigateur : « 0777000111 », « zed@exemple » et « Niort » rendaient « Aucun résultat » — `renderSearch`
   ne cherchait un client que dans son nom et son adresse — alors que le cas d'usage du terrain est « le client
   appelle » (on a son numéro, pas son nom). Et chaque famille était coupée à 6 résultats, sans « voir plus » :
   le septième « Dupont » n'existait pas pour l'écran.

   Ce banc EXÉCUTE la vraie `renderSearch` dans un bac à sable. Les clics de « voir plus » sont évalués tels
   qu'écrits dans le balisage rendu. Le périmètre (`visibleClients`) reste la seule porte : un client hors de
   ce que je vois ne se trouve ni par son nom, ni par son téléphone.                                         */
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

console.log('\n── 1133 · 0. la population ──');
const RS = bloc('function renderSearch(qq){'), NM = ligne('const norm = s =>'), ESC = ligne('const esc = s =>'), PLUS = bloc('function rechPlus(');
vrai('renderSearch est trouvée', RS.length > 1200, RS.length);
v('⛔ une seule définition de renderSearch', SRC.split('function renderSearch(').length - 1, 1);

function monde(clients, { cache = [] } = {}) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, __res: { innerHTML: '' },
    db: { clients, interventions: [], produits: [], boxes: [], vehicules: [], devis: [], factures: [], fournisseurs: [], techniciens: [] } };
  vm.createContext(ctx);
  vm.runInContext(`${NM.replace('const ', 'var ')}\n${ESC.replace('const ', 'var ')}
    var __cache=${JSON.stringify(cache)};
    function $(id){ return id==='gsearch-res' ? __res : null; } function rechVoit(){ return true; }
    function visibleClients(l){ return l.filter(c=>!__cache.includes(c.id)); } function visibleInts(l){ return l; } function visibleBoxes(l){ return l; }
    function visibleVehicules(l){ return l; } function visibleDocs(l){ return l; } function visibleTechniciens(l){ return l; }
    function clientName(){ return ''; } function fmtShort(){ return ''; } function vPlaque(){ return ''; }
    function closeModal(){} function ficheClient(){}
    ${PLUS}\nlet _rechPlus={}, _rechDerniere='';\n${RS}`, ctx);
  return ctx;
}
const lignes = W => (W.__res.innerHTML.match(/class="pl-row"/g) || []).length;
const titres = W => [...W.__res.innerHTML.matchAll(/class="pl-title">([^<]*)</g)].map(m => m[1]);
const recherche = (W, q) => { W.renderSearch(q); return titres(W); };
const clients = () => [
  { id: 'c1', nom: 'M. et Mme Durand', adresse: '4 rue Verte', ville: 'La Rochelle', tel: '05 46 00 11 22' },
  { id: 'c2', nom: 'Aaa Premier Client', adresse: '1 rue A', ville: 'Niort', codePostal: '79000', tel: '07 77 00 01 11', email: 'zed@exemple.fr', contact: 'Zoé Marchand' },
  { id: 'c3', nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Port', ville: 'La Rochelle', tel: '+33 6 12 34 56 78' }];

console.log('\n── 1133 · 1. un client se trouve par téléphone, e-mail, ville, code postal, contact ──');
{ const W = monde(clients());
  v('⛔ téléphone tapé collé (0777000111) — enregistré avec des espaces', recherche(W, '0777000111'), ['Aaa Premier Client']);
  v('… téléphone tapé avec des espaces (07 77 00)', recherche(W, '07 77 00'), ['Aaa Premier Client']);
  v('… téléphone tapé avec des points (07.77.00.01)', recherche(W, '07.77.00.01'), ['Aaa Premier Client']);
  v('⛔ e-mail (zed@exemple)', recherche(W, 'zed@exemple'), ['Aaa Premier Client']);
  v('⛔ ville (Niort)', recherche(W, 'Niort'), ['Aaa Premier Client']);
  v('… ville sans casse ni accent (la rochelle)', recherche(W, 'la rochelle').sort(), ['Boulangerie Au Bon Pain', 'M. et Mme Durand']);
  v('⛔ code postal (79000)', recherche(W, '79000'), ['Aaa Premier Client']);
  v('⛔ nom du contact (Marchand)', recherche(W, 'Marchand'), ['Aaa Premier Client']);
  v('rien ne ressemble : « Aucun résultat »', [recherche(W, '0999999999'), /Aucun résultat/.test(W.__res.innerHTML)], [[], true]); }

console.log('\n── 1133 · 2. ce qui marchait marche toujours, et le périmètre reste la seule porte ──');
{ const W = monde(clients());
  v('par le nom', recherche(W, 'durand'), ['M. et Mme Durand']);
  v('par l’adresse', recherche(W, 'rue du port'), ['Boulangerie Au Bon Pain']);
  v('un seul chiffre ne déclenche rien (deux lettres au moins)', [recherche(W, '0'), /Tapez au moins 2 lettres/.test(W.__res.innerHTML)], [[], true]); }
{ const W = monde(clients(), { cache: ['c2'] });
  v('⛔ un client hors de mon périmètre ne se trouve ni par son nom, ni par son téléphone, ni par son e-mail',
    [recherche(W, 'Aaa'), recherche(W, '0777000111'), recherche(W, 'zed@exemple')], [[], [], []]); }
{ const W = monde([{ id: 'x1', nom: 'Dernier', tel: '0612345678' }, { id: 'x2', nom: 'Autre', tel: '0699000012' }]);
  v('un numéro partiel de moins de trois chiffres ne ratisse pas tous les téléphones', recherche(W, '06'), []); }

console.log('\n── 1133 · 3. plus de plafond muet à six : « voir plus » ──');
{ const nombreux = Array.from({ length: 9 }, (_, k) => ({ id: 'd' + k, nom: 'Dupont ' + k, tel: '06000000' + k }));
  const W = monde(nombreux);
  W.renderSearch('dupont');
  v('six résultats d’abord', titres(W).filter(t => /^Dupont/.test(t)).length, 6);
  const plus = (W.__res.innerHTML.match(/onclick="(rechPlus\([^"]*\))"/) || [])[1];
  vrai('⛔ une ligne « voir les 3 autres » est proposée', !!plus && /3 autre/.test(W.__res.innerHTML), W.__res.innerHTML.slice(-400));
  if (plus) vm.runInContext(plus.replace(/&quot;/g, '"').replace(/&#39;/g, "'"), W);
  v('… son clic (évalué tel qu’écrit) montre les neuf', titres(W).filter(t => /^Dupont/.test(t)).length, 9);
  vrai('… et la ligne « voir plus » disparaît', !/rechPlus\(/.test(W.__res.innerHTML));
  W.renderSearch('dupont 1');
  v('une autre requête repart de six (rien n’est resté ouvert)', titres(W).filter(t => /^Dupont/.test(t)).length, 1);
  W.renderSearch('dupont');
  v('… et la famille est repliée de nouveau', titres(W).filter(t => /^Dupont/.test(t)).length, 6); }
{ const W = monde(Array.from({ length: 6 }, (_, k) => ({ id: 'e' + k, nom: 'Exact ' + k })));
  W.renderSearch('exact');
  vrai('exactement six : pas de ligne « voir plus » inutile', !/rechPlus\(/.test(W.__res.innerHTML) && titres(W).length === 6, titres(W).length); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
