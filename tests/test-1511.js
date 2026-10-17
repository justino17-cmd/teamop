/* ══ i02 · r3#14 — LE TOAST DE « VALIDER » DIT CE QUI A ÉTÉ FAIT, PAS « PRÊT À ENVOYER » POUR DES BROUILLONS ═════
   `bonValider` (formulaire d'un bon) finissait par un toast écrit sans condition :
   « ✅ 2 bon(s) prêt(s) à envoyer — un par fournisseur ». Or les bons sont créés ou mis à jour avec
   `statut:f.statut` : sur un bon en brouillon (« En préparation », le cas d'un bon né d'une demande), les deux bons
   restaient en brouillon, la demande « En préparation (2 bons) », et le message annonçait autre chose. Le message
   suit désormais le statut réellement posé.

   Ce banc EXÉCUTE la vraie `bonValider` (extraite d'app.html) et lit le toast ET l'état de la base : le message ne
   se juge pas seul, on le compare à ce qui est écrit. Le numéro, la séparation par fournisseur/site et le lot
   « numDejaPris » de la vague 1 ne sont pas touchés (test-1170 les garde).                                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (CLAUDE.md) — un motif vise du code. */
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

console.log('\n── 1511 · 0. la population ──');
const BV = bloc('function bonValider(');
vrai('bonValider est trouvée (une tranche vide passerait au vert sur tout)', BV.length > 1500, BV.length);
v('⛔ une seule définition de bonValider', SRC.split('function bonValider(').length - 1, 1);

function monde(bons) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, isFinite, parseFloat,
    db: { bons: bons || [], fournisseurs: [], boxes: [], numMax: {} }, currentUser: { id: 'u1', prenom: 'A', nom: 'B' }, __toasts: [], __champs: {}, __groupes: {} };
  vm.createContext(ctx);
  vm.runInContext(`var bonLignes=[{designation:'Produit',qte:1}], bonSites=[{}], bonsFilter='', current='bons', __nav=0;
    var __id=0; function uid(){ return 'n'+(++__id); } var __num=0; function nextNum(){ return 'BC-AUTO-'+(++__num); }
    function toast(m){ __toasts.push(String(m)); } function save(){} function closeModal(){} function logEvent(){}
    function alert(m){ __toasts.push('ALERT '+m); } function go(){ __nav++; } var views={bons(){ __nav++; }};
    function $(i){ return i==='bonform'?{}:null; } function FormData(){ return Object.entries(__champs); }
    function bonQteTot(){ return {ctn:1,u:0}; } function bonMemorise(){} function numDejaPris(){ return null; }
    function fournName(){ return ''; } function bonGroupes(){ return __groupes; } function bonFourName(){ return ''; } function bonLivOf(s){ return {}; }
    function fullName(){ return 'A B'; }
    ${BV}`, ctx);
  return ctx;
}
const poser = (W, champs, groupes, sites) => { W.__champs = Object.assign({ numero: 'BC-1', date: '2026-10-17', statut: 'brouillon', fournisseurId: '', boxId: '', notes: '', societe: '' }, champs);
  W.__groupes = groupes || { '': [{ designation: 'P', qte: 1 }] };
  vm.runInContext('bonSites=' + JSON.stringify(sites || [{}]) + '; __champs=__champs;', W); };
const toast1 = W => W.__toasts[W.__toasts.length - 1] || '';

console.log('\n── 1511 · 1. ⛔ un bon BROUILLON ne s\'annonce pas « prêt à envoyer » ──');
{ const W = monde();
  poser(W, { statut: 'brouillon' }, { ARMOSA: [{ designation: 'A', qte: 1 }], ORCAD: [{ designation: 'B', qte: 1 }] });
  W.bonValider('');
  v('population : deux bons sont écrits, un par fournisseur', W.db.bons.map(b => b.statut), ['brouillon', 'brouillon']);
  vrai('⛔ … et le toast NE dit PAS « prêt(s) à envoyer » (les deux sont des brouillons)', !/prêt/i.test(toast1(W)), toast1(W));
  vrai('… il dit ce qui a été fait : 2 bons, gardés en préparation, un par fournisseur', /2 bon\(s\)/.test(toast1(W)) && /préparation/.test(toast1(W)) && /un par fournisseur/.test(toast1(W)), toast1(W));
}
console.log('\n── 1511 · 2. contre-épreuve : un bon réellement « Prêt à envoyer » le dit ──');
{ const W = monde();
  poser(W, { statut: 'prete' }, { ARMOSA: [{ designation: 'A', qte: 1 }], ORCAD: [{ designation: 'B', qte: 1 }] });
  W.bonValider('');
  v('population : deux bons au statut prete', W.db.bons.map(b => b.statut), ['prete', 'prete']);
  vrai('⛔ le toast garde « prêt(s) à envoyer — un par fournisseur » (rien n\'a changé pour ce cas)', /2 bon\(s\) prêt\(s\) à envoyer — un par fournisseur/.test(toast1(W)), toast1(W));
  poser(W, { statut: 'prete', numero: 'BC-2' }, { '': [{ designation: 'P', qte: 1 }] }, [{ nom: 'S1' }, { nom: 'S2' }]);
  W.bonValider('');
  vrai('… un par site aussi', /prêt\(s\) à envoyer/.test(toast1(W)) && /un par site/.test(toast1(W)), toast1(W));
}
console.log('\n── 1511 · 3. les autres statuts : le message ne ment sur aucun ──');
for (const st of ['envoyee', 'enLivraison', 'livree', 'annulee', 'partielle']) {
  const W = monde();
  poser(W, { statut: st });
  W.bonValider('');
  vrai(st + ' : le bon est écrit tel quel, et le toast ne dit ni « prêt » ni « préparation »', W.db.bons.length === 1 && W.db.bons[0].statut === st && !/prêt|préparation/i.test(toast1(W)) && /1 bon\(s\)/.test(toast1(W)), [W.db.bons.map(b => b.statut), toast1(W)]);
}
console.log('\n── 1511 · 4. modifier un bon existant en brouillon : même vérité ──');
{ const W = monde([{ id: 'b1', numero: 'BC-9', statut: 'brouillon' }]);
  poser(W, { statut: 'brouillon', numero: 'BC-9' });
  W.bonValider('b1');
  vrai('population : le bon d\'origine est modifié, pas dupliqué', W.db.bons.length === 1 && W.db.bons[0].id === 'b1', W.db.bons);
  vrai('… et le toast ne dit pas « prêt »', !/prêt/i.test(toast1(W)) && /1 bon\(s\)/.test(toast1(W)), toast1(W));
}
console.log('\n════ test-1511 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
