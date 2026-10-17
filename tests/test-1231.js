/* ══ g20 · UNE DEMANDE SUIT TOUS LES BONS QUI EN SORTENT (achats#3) ═════════════════════════════════════
   Constat (agents de test de la bêta, 16 octobre 2026) : une demande à deux produits de deux fournisseurs
   est validée (un bon sans fournisseur naît, `d.bonId`), puis « ✓ Prêt » SÉPARE ce bon par fournisseur
   (`bonSeparer` : le second bon copie `demandeId`, mais la demande ne connaît que `d.bonId`, le premier).
   `demandeEtat` ne lisait que ce premier bon : dès qu'il était livré, la demande passait à « Reçue » et
   sortait de « En cours » (« Rien en cours — tout est traité ») alors que le bon ORCAD était encore « Prêt
   à envoyer ». La moitié non commandée n'était plus suivie nulle part.

   Ce banc EXÉCUTE les vraies `bonSeparer`, `demandeEtat`, `demandeEnCours` (et `demandeBons` quand elle
   existe), avec la vraie `bonFourName`, sur le chemin réel : valider → séparer → livrer.                 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const STATV = ligne('const STATV='), STATBC = ligne('const STATBC='), DE = bloc('function demandeEtat(d){'), DC = bloc('function demandeEnCours(d){'),
  SEP = bloc('function bonSeparer(id){'), BFN = bloc('function bonFourName(l,selName){'), DB = bloc('function demandeBons('),
  DUP = bloc('function bonDupliquer(id){'), BV = bloc('function bonValider(id){'), BGR = bloc('function bonGroupes(fournisseurId){'), BLO = ligne('const bonLivOf=');

console.log('\n── 1231 · 0. la population ──');
v('les morceaux sont trouvés', [!!STATV, !!STATBC, DE.length > 200, DC.length > 150, SEP.length > 400, BFN.length > 100], [true, true, true, true, true, true]);
v('⛔ une seule définition de demandeEtat, demandeEnCours, bonSeparer', ['demandeEtat', 'demandeEnCours', 'bonSeparer'].map(n => SRC.split('function ' + n + '(').length - 1), [1, 1, 1]);

function monde() {
  const ctx = { console, JSON, Math, Date, Set, Object, Array, String, Number, __log: [], __n: 1,
    db: { demandes: [], fournisseurs: [{ id: 'fA', nom: 'ARMOSA' }, { id: 'fO', nom: 'ORCAD' }],
      produits: [{ id: 'pa', nom: 'Gel', fournisseurs: ['ARMOSA'] }, { id: 'po', nom: 'Piège', fournisseurs: ['ORCAD'] }], bons: [] } };
  vm.createContext(ctx);
  vm.runInContext(`${STATV}\n${STATBC}\n${BFN}\n${DB}\n${DE}\n${DC}\n${SEP}
    const produit = id => db.produits.find(p=>p.id===id) || {};
    const fournName=id=>{ const f=db.fournisseurs.find(x=>x.id===id); return f?f.nom:''; };
    function nextNum(){ return 'BC-2026-00'+(++__n); } var _u=0; function uid(){ return 'b'+(++_u+10); }
    function logEvent(a,b){ __log.push(a); } function save(){}
    ${bloc('function numDejaPris(')}   /* bonValider refuse un numéro déjà pris (lot des numéros) : la vraie */`, ctx);
  return ctx; }
// le chemin réel : demande validée -> un bon SANS fournisseur (bonId/demandeId) -> « Prêt » le sépare par fournisseur
function scenario() {
  const W = monde();
  W.db.demandes.push({ id: 'd1', num: 'DC-1', statut: 'valide', bonId: 'b1' });
  W.db.bons.push({ id: 'b1', demandeId: 'd1', numero: 'BC-2026-001', fournisseurId: '', statut: 'prete',
    lignes: [{ produitId: 'pa', designation: 'Gel', quantite: 4 }, { produitId: 'po', designation: 'Piège', quantite: 2 }] });
  const n = W.bonSeparer('b1');
  return { W, n, d: W.db.demandes[0], b1: W.db.bons[0], b2: W.db.bons[1] }; }

console.log('\n── 1231 · 1. le bon séparé reste rattaché à sa demande ──');
{ const { W, n, b1, b2 } = scenario();
  v('population : le bon a été séparé en 2 (1 bon de plus)', [n, W.db.bons.length], [1, 2]);
  v('les deux bons portent des fournisseurs différents', [W.db.fournisseurs.find(f => f.id === b1.fournisseurId).nom, W.db.fournisseurs.find(f => f.id === b2.fournisseurId).nom], ['ARMOSA', 'ORCAD']);
  v('le second bon copie bien demandeId (la demande peut le retrouver)', b2.demandeId, 'd1'); }

console.log('\n── 1231 · 2. achats#3 — le premier bon livré ne clôt pas la demande ──');
{ const { W, d, b1, b2 } = scenario();
  b1.statut = 'livree';
  const e = W.demandeEtat(d);
  vrai('⛔ « Reçue » n’est PAS annoncé tant que le bon ORCAD n’est pas livré (avant le correctif : Reçue)', e.l !== 'Reçue', e);
  vrai('… l’état dit où on en est (1/2)', /1\/2/.test(e.l), e);
  v('⛔ la demande reste EN COURS (avant : false, « tout est traité »)', W.demandeEnCours(d), true);
  b2.statut = 'envoyee';
  v('le second bon qui avance ne change pas le verdict : encore en cours', [W.demandeEnCours(d), W.demandeEtat(d).l !== 'Reçue'], [true, true]);
  b2.statut = 'livree';
  v('les DEUX bons livrés : Reçue', W.demandeEtat(d).l, 'Reçue');
  v('… et la demande sort de « En cours »', W.demandeEnCours(d), false); }

console.log('\n── 1231 · 3. aucun bon livré : on voit le moins avancé ──');
{ const { W, d, b1, b2 } = scenario();
  b1.statut = 'envoyee'; b2.statut = 'prete';
  const e = W.demandeEtat(d);
  vrai('Acceptée · Prêt à envoyer (le bon qui n’est pas parti), avec le nombre de bons', /^Acceptée · Prêt à envoyer/.test(e.l) && /2 bons/.test(e.l), e);
  v('en cours', W.demandeEnCours(d), true); }

console.log('\n── 1231 · 4. un bon annulé n’est plus attendu ──');
{ const { W, d, b1, b2 } = scenario();
  b1.statut = 'livree'; b2.statut = 'annulee';
  v('un livré + un annulé : Reçue, plus en cours', [W.demandeEtat(d).l, W.demandeEnCours(d)], ['Reçue', false]);
  b1.statut = 'annulee';
  v('tous annulés : Commande annulée, plus en cours', [W.demandeEtat(d).l, W.demandeEnCours(d)], ['Commande annulée', false]); }

console.log('\n── 1231 · 5. un seul bon : comportement d’avant, inchangé ──');
{ const W = monde();
  W.db.demandes.push({ id: 'd2', statut: 'valide', bonId: 'x1' }, { id: 'd3', statut: 'valide' }, { id: 'd4', statut: 'enAttente' }, { id: 'd5', statut: 'refuse' });
  W.db.bons.push({ id: 'x1', demandeId: 'd2', statut: 'envoyee', lignes: [] });
  v('envoyée : « Acceptée · Envoyée », en cours', [W.demandeEtat(W.db.demandes[0]).l, W.demandeEnCours(W.db.demandes[0])], ['Acceptée · Envoyée', true]);
  W.db.bons[0].statut = 'livree';
  v('livrée : Reçue, plus en cours', [W.demandeEtat(W.db.demandes[0]).l, W.demandeEnCours(W.db.demandes[0])], ['Reçue', false]);
  W.db.bons[0].statut = 'annulee';
  v('annulée : Commande annulée, plus en cours', [W.demandeEtat(W.db.demandes[0]).l, W.demandeEnCours(W.db.demandes[0])], ['Commande annulée', false]);
  v('validée sans bon : Acceptée, rien à suivre', [W.demandeEtat(W.db.demandes[1]).l, W.demandeEnCours(W.db.demandes[1])], ['Acceptée', false]);
  v('en attente : en cours', [W.demandeEtat(W.db.demandes[2]).l, W.demandeEnCours(W.db.demandes[2])], ['En attente', true]);
  v('refusée : plus en cours', [W.demandeEtat(W.db.demandes[3]).l, W.demandeEnCours(W.db.demandes[3])], ['Refusée', false]); }

/* ─── relecture : les deux AUTRES chemins qui créent un bon à partir d'un bon de demande ─── */
console.log('\n── 1231 · 6. « 🔁 Recommander » ne rouvre pas une demande déjà reçue (bonDupliquer) ──');
v('les morceaux sont trouvés', [DUP.length > 300, BV.length > 1500, BGR.length > 80, BLO.length > 80], [true, true, true, true]);
v('⛔ une seule définition de bonDupliquer et de bonValider', ['bonDupliquer', 'bonValider'].map(n => SRC.split('function ' + n + '(').length - 1), [1, 1]);
{ const W = monde();
  vm.runInContext(`${DUP}
    var currentUser={ id:'u1' }; function logEvent(){} function save(){} function uid(){ return 'cp'+(++__n); } function peutCommander(){ return true; } function refusCommander(){} function todayISO(){ return '2026-10-16'; } function fullName(){ return 'Zoé'; }
    function bonNum(b){ return b.numero; } function closeModal(){} function formBon(){} function toast(){}
    function nextNum(){ return 'BC-2026-9'+(++__n); }`, W);
  W.db.demandes.push({ id: 'd1', num: 'DC-1', statut: 'valide', bonId: 'b1' });
  W.db.bons.push({ id: 'b1', demandeId: 'd1', numero: 'BC-2026-001', fournisseurId: 'fA', statut: 'livree', dateReception: '2026-10-10', lignes: [{ produitId: 'pa', designation: 'Gel', quantite: 4 }] });
  const d = W.db.demandes[0];
  v('avant la recommande : Reçue, plus en cours', [W.demandeEtat(d).l, W.demandeEnCours(d)], ['Reçue', false]);
  W.bonDupliquer('b1');
  const copie = W.db.bons[1];
  vrai('population : la recommande existe, en brouillon, avec ses lignes', W.db.bons.length === 2 && copie.statut === 'brouillon' && copie.lignes.length === 1, W.db.bons.length);
  vrai('⛔ la copie ne porte PAS le lien de la demande d’origine (avant : demandeId copié)', !copie.demandeId, copie.demandeId);
  v('⛔ la demande reste « Reçue » et hors de « En cours » tant que le brouillon de recommande existe', [W.demandeEtat(d).l, W.demandeEnCours(d)], ['Reçue', false]);
  v('le bon d’origine garde son lien', W.db.bons[0].demandeId, 'd1'); }

console.log('\n── 1231 · 7. un bon de demande rouvert et séparé par le formulaire (bonValider) garde ses bons suivis ──');
function monde7(champs, avecDemande) {
  const W = monde();
  W.__form = champs; W.__toasts = [];
  vm.runInContext(`${BFN}\n${BGR}\n${BLO}\n${BV}
    var bonLignes=[], bonSites=[{}], bonsFilter='', current='bons', views={ bons(){} };
    function FormData(f){ return Object.entries(__form); } function $(i){ return i==='bonform' ? {} : null; }
    function alert(){} function bonQteTot(){ return { ctn:1, u:1, conv:1 }; } function bonMemorise(){} function fullName(){ return 'Zoé'; }
    var currentUser={ id:'u1' }; function closeModal(){} function go(){} function toast(m){ __toasts.push(m); }
    function nextNum(){ return 'BC-2026-9'+(++__n); }`, W);
  W.db.demandes.push({ id: 'd1', num: 'DC-1', statut: 'valide', bonId: 'b1' });
  W.db.bons.push({ id: 'b1', demandeId: avecDemande ? 'd1' : undefined, numero: 'BC-2026-001', fournisseurId: '', statut: 'brouillon', lignes: [] });
  vm.runInContext(`bonLignes=[{ produitId:'pa', designation:'Gel', quantite:4 }, { produitId:'po', designation:'Piège', quantite:2 }];`, W);
  return W; }
{ const W = monde7({ numero: 'BC-2026-001', date: '2026-10-16', fournisseurId: '', boxId: '', statut: 'prete', notes: '', societe: '' }, true);
  W.bonValider('b1');
  const bons = W.db.bons, d = W.db.demandes[0];
  vrai('population : la validation a séparé le bon en deux (ARMOSA, ORCAD)', bons.length === 2 && bons.map(b => W.db.fournisseurs.find(f => f.id === b.fournisseurId) ? W.db.fournisseurs.find(f => f.id === b.fournisseurId).nom : '?').sort().join() === 'ARMOSA,ORCAD', bons.map(b => b.fournisseurId));
  v('le bon d’origine garde son lien', bons[0].demandeId, 'd1');
  v('⛔ le bon SUPPLÉMENTAIRE porte le même demandeId (avant : absent, invisible à la demande)', bons[1].demandeId, 'd1');
  bons[0].statut = 'livree';
  vrai('⛔ le premier bon livré ne clôt pas la demande (avant : « Reçue », « Rien en cours »)', W.demandeEtat(d).l !== 'Reçue' && W.demandeEnCours(d) === true, W.demandeEtat(d)); }
{ const W = monde7({ numero: 'BC-2026-050', date: '2026-10-16', fournisseurId: '', boxId: '', statut: 'prete', notes: '', societe: '' }, false);
  W.bonValider('');
  vrai('création d’un bon neuf sans demande : aucun demandeId inventé', W.db.bons.length === 3 && W.db.bons.slice(1).every(b => !b.demandeId), W.db.bons.map(b => b.demandeId)); }

console.log('\n══ test-1231 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
