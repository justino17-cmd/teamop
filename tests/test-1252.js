/* ══ g06 · ENREGISTRER UNE FACTURE : retour à l'écran Factures, jamais vide, jamais en double ═════════════
   facturation#10 — « Créer » / « Enregistrer » d'une facture appelait `docListView('factures')` : un tableau nu
   (0 carte, 0 filtre, pas de bouton Payée / Valider / Envoyer / FX / Excel) à la place de l'écran Factures. Les
   devis, eux, gardent leur liste.
   facturation#15 — une facture sans aucune ligne remplie se créait à 0,00 € et consommait un numéro continu.
   facturation#2 (sa part) — on pouvait CRÉER une facture sous un numéro déjà porté (deux appareils qui émettent
   avant de s'être vus) ou en donner un déjà pris en éditant. Dans la même série seulement ; un double déjà en base
   reste éditable tant qu'on ne lui change pas son numéro.
   facturation#4/#11 (par le formulaire) — le statut « Payée » se quitte aussi par le formulaire : même règle que le
   bouton ↩︎ (la ligne de registre et la validation compta partent ; sans le droit Comptabilité, rien ne bouge).
   ⛔ Les refus se font AVANT la première écriture : un refus tardif aurait réécrit la fiche du client (adresse,
   téléphone) pour un document qui n'existe pas, ou retiré une ligne de registre d'une facture non enregistrée.

   Ce banc EXÉCUTE la vraie `saveDoc`, avec la vraie `docTot`, `factQuitterPayee` et `factLignesRegistre`.        */
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

console.log('\n── 1252 · 0. la population ──');
const NOMS = ['function saveDoc(', 'function factQuitterPayee(', 'function factLignesRegistre(', 'function factRegistreRetirer('];
const CODE = NOMS.map(bloc); const DT = bloc('function docTot(d){'), LTL = ligne('const ligTotLigne='), LHT = ligne('const ligHT=');
v('les fonctions sont trouvées', CODE.map(c => c.length > 80).concat(!!DT, !!LTL, !!LHT), Array(7).fill(true));
v('⛔ une seule définition de saveDoc', SRC.split('function saveDoc(').length - 1, 1);

function monde(opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __toasts: [], __logs: [], __saves: 0, __ferme: 0, __nav: [], __finance: opts.finance !== false,
    __reponse: opts.confirme !== false, __confirms: [],
    db: { factures: [
        { id: 'f1', num: 'FAC-2026-001', clientId: 'c1', date: '2026-10-01', statut: 'payee', tva: 0, valideCompta: true, lignes: [{ designation: 'x', qte: 1, pu: 120 }] },
        { id: 'f2', num: 'FAC-2026-002', clientId: 'c1', date: '2026-10-02', statut: 'envoyee', tva: 0, lignes: [{ designation: 'y', qte: 1, pu: 50 }] },
        { id: 'f3', num: 'FAC-2026-009', clientId: 'c1', date: '2026-10-03', statut: 'brouillon', tva: 0, lignes: [{ designation: 'z', qte: 1, pu: 10 }] },
        { id: 'f4', num: 'FAC-2026-009', clientId: 'c1', date: '2026-10-04', statut: 'brouillon', tva: 0, lignes: [{ designation: 'z2', qte: 1, pu: 10 }] }],
      devis: [{ id: 'd1', num: 'DV-2026-001', clientId: 'c1', date: '2026-10-01', statut: 'brouillon', tva: 20, lignes: [{ designation: 'd', qte: 1, pu: 10 }] }],
      registres: [{ id: 'r1', montant: 120, mode: 'VIR', factureId: 'f1', interId: '' }],
      clients: [{ id: 'c1', nom: 'Boulangerie', adresse: 'ancienne adresse' }] },
    currentUser: { id: 'u1' }, current: opts.current || 'factures', formLignes: [{ designation: 'Dératisation', qte: 1, pu: 80 }] };
  vm.createContext(ctx);
  vm.runInContext(`
    function esc(s){ return String(s==null?'':s); } function eur(n){ return Number(n||0).toFixed(2).replace('.',',')+' €'; }
    const DOC={ factures:{coll:'factures',titre:'Facture',un:'facture',prefix:'FAC'}, devis:{coll:'devis',titre:'Devis',un:'devis',prefix:'DV'} };
    ${ligne('const DOC_NATURES=')}
    const REG_MODES={VIR:['VIR','Virement']};
    var views={ factures(){ __nav.push('views.factures'); } };
    function docListView(k,x){ __nav.push('docListView('+k+','+!!x+')'); } function go(v){ __nav.push('go('+v+')'); }
    var __id=0; function uid(){ return 'n'+(++__id); }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){ __ferme++; } function logEvent(a,b){ __logs.push(a+' | '+b); }
    function confirm(m){ __confirms.push(String(m)); return __reponse; }
    function permGarde(){ return true; } function canCat(){ return true; } function isFinanceMgr(){ return __finance; }
    function clientPropose(){ return true; } var document={ getElementById(id){ return id==='doc-cli-adr'?{value:'nouvelle adresse'}:null; } };
    function FormData(t){ return Object.entries(t); }
    ${LTL}\n${LHT}\n${DT}\n${CODE.join('\n')}`, ctx);
  return ctx;
}
const ev = champs => ({ preventDefault() {}, target: Object.assign({ num: 'FAC-2026-050', clientId: 'c1', date: '2026-10-16', tva: '20', statut: 'brouillon', notes: '', rapportModele: '' }, champs) });
const nbF = W => W.db.factures.length;

console.log('\n── 1252 · 1. facturation#10 — on revient à l\'écran Factures, pas au tableau nu ──');
{ const W = monde(); W.saveDoc(ev(), 'factures');
  v('création : une facture de plus, l\'écran Factures est redessiné', [nbF(W), W.__nav], [5, ['views.factures']]);
  vrai('… la fenêtre est fermée, un seul enregistrement', W.__ferme === 1 && W.__saves === 1, [W.__ferme, W.__saves]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-002', statut: 'envoyee', notes: 'relancée' }), 'factures', 'f2');
  v('modification : même retour, la facture est mise à jour sur place', [nbF(W), W.db.factures[1].notes, W.__nav], [4, 'relancée', ['views.factures']]); }
{ const W = monde({ current: 'dashboard' }); W.saveDoc(ev(), 'factures');
  v('créée depuis une autre rubrique (feuille « Créer ») : on mène à Factures par go()', W.__nav, ['go(factures)']); }
{ const W = monde(); W.saveDoc(ev({ num: 'DV-2026-050' }), 'devis');
  v('un devis garde SA liste (docListView), sans xylophage', W.__nav, ['docListView(devis,false)']); }

console.log('\n── 1252 · 2. facturation#15 — pas de facture sans ligne ──');
{ const W = monde(); W.formLignes = [];
  W.saveDoc(ev(), 'factures');
  v('aucune ligne : refusée, aucun numéro consommé, fenêtre ouverte', [nbF(W), W.__saves, W.__ferme, W.__nav], [4, 0, 0, []]);
  vrai('… et le toast le dit', W.__toasts.some(t => /au moins une ligne/i.test(t)), W.__toasts); }
{ const W = monde(); W.formLignes = [{ designation: '', qte: 1, pu: 0 }, { designation: '', pu: '' }];
  W.saveDoc(ev(), 'factures');
  v('que des lignes VIDES (ni désignation ni prix) : refusée aussi', [nbF(W), W.__saves], [4, 0]); }
{ const W = monde(); W.formLignes = [{ designation: '', qte: 1, pu: 0 }, { designation: 'Passage', qte: 1, pu: 0 }];
  W.saveDoc(ev(), 'factures');
  v('une ligne remplie (même à 0 €) : créée, la ligne vide est écartée comme avant', [nbF(W), W.db.factures[4].lignes.length], [5, 1]); }
{ const W = monde(); W.formLignes = [];
  W.saveDoc(ev({ num: 'FAC-2026-002', statut: 'envoyee' }), 'factures', 'f2');
  v('vider les lignes d\'une facture existante : refusé, la facture garde ses lignes', [W.db.factures[1].lignes.length, W.__saves], [1, 0]); }
{ const W = monde(); W.formLignes = [];
  W.saveDoc(ev({ num: 'DV-2026-050' }), 'devis');
  v('⛔ un DEVIS vide se prépare toujours (hors périmètre)', [W.db.devis.length, W.__nav], [2, ['docListView(devis,false)']]); }

console.log('\n── 1252 · 3. facturation#2 — un numéro déjà porté ne se redonne pas ──');
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-002' }), 'factures');
  v('création sous le numéro d\'une autre facture : refusée', [nbF(W), W.__saves, W.__ferme], [4, 0, 0]);
  vrai('… le toast nomme le numéro', W.__toasts.some(t => /FAC-2026-002/.test(t) && /déjà/.test(t)), W.__toasts); }
{ const W = monde(); W.saveDoc(ev({ num: ' fac-2026-002 ' }), 'factures');
  v('espaces et casse n\'y changent rien', nbF(W), 4); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-003', statut: 'envoyee' }), 'factures', 'f2');
  v('éditer en changeant le numéro vers un numéro LIBRE : accepté', [W.db.factures[1].num, W.__saves], ['FAC-2026-003', 1]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'envoyee' }), 'factures', 'f2');
  v('⛔ éditer en prenant le numéro d\'une AUTRE facture : refusé', [W.db.factures[1].num, W.__saves], ['FAC-2026-002', 0]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-002', statut: 'envoyee', notes: 'ok' }), 'factures', 'f2');
  v('éditer SANS changer son numéro : exclue de la comparaison avec elle-même', [W.db.factures[1].notes, W.__saves], ['ok', 1]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-009', notes: 'corrigée' }), 'factures', 'f3');
  v('un double DÉJÀ en base reste éditable tant qu\'on ne lui change pas son numéro (sinon on ne pourrait pas le corriger)', [W.db.factures[2].notes, W.__saves], ['corrigée', 1]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-009' }), 'factures');
  v('… mais on n\'en CRÉE pas un troisième', nbF(W), 4); }
{ const W = monde(); W.saveDoc(ev({ num: 'DV-2026-001' }), 'devis');
  v('devis : même règle dans la série des devis', [W.db.devis.length, W.__saves], [1, 0]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-001' }), 'devis');
  v('… et un devis peut porter le numéro d\'une facture (autres séries, aucun conflit)', [W.db.devis.length], [2]); }

console.log('\n── 1252 · 4. facturation#4/#11 par le formulaire — quitter « Payée » ──');
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'envoyee' }), 'factures', 'f1');
  v('payée → envoyée par le formulaire : statut changé, ligne de registre retirée, validation compta tombée',
    [W.db.factures[0].statut, W.db.registres.length, !!W.db.factures[0].valideCompta], ['envoyee', 0, false]); }
{ const W = monde({ finance: false }); W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'envoyee' }), 'factures', 'f1');
  v('⛔ sans le droit Comptabilité : rien ne bouge (statut, ligne, validation), la fenêtre reste ouverte', [W.db.factures[0].statut, W.db.registres.length, !!W.db.factures[0].valideCompta, W.__ferme, W.__saves], ['payee', 1, true, 0, 0]); }
{ const W = monde({ confirme: false }); W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'envoyee' }), 'factures', 'f1');
  v('confirmation refusée : rien ne bouge', [W.db.factures[0].statut, W.db.registres.length, W.__saves], ['payee', 1, 0]); }
{ const W = monde(); W.formLignes = []; W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'envoyee' }), 'factures', 'f1');
  v('⛔ ordre : un refus (aucune ligne) tombe AVANT le registre — la ligne n\'est pas retirée pour une facture non enregistrée', [W.db.factures[0].statut, W.db.registres.length], ['payee', 1]); }
{ const W = monde(); W.saveDoc(ev({ num: 'FAC-2026-001', statut: 'payee', notes: 'n' }), 'factures', 'f1');
  v('payée → payée (autre champ modifié) : le registre n\'est pas touché, aucune question', [W.db.registres.length, W.__confirms.length, W.db.factures[0].notes], [1, 0, 'n']); }
{ const W = monde(); W.db.clients[0].adresse = 'ancienne adresse'; W.formLignes = [];
  W.saveDoc(ev(), 'factures');
  v('refus : la fiche du client n\'a pas été réécrite', W.db.clients[0].adresse, 'ancienne adresse');
  const W2 = monde(); W2.saveDoc(ev(), 'factures');
  v('… contre-épreuve : un enregistrement RÉUSSI la réécrit (le test regarde bien là)', W2.db.clients[0].adresse, 'nouvelle adresse'); }

console.log('\n══ test-1252 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
