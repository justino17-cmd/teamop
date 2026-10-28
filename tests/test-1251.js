/* ══ g06 · ANNULER UN PAIEMENT NE LAISSE PAS L'EURO DEUX FOIS AU REGISTRE ═══════════════════════════════════
   facturation#4 — « Annuler le paiement » (↩︎) d'une facture pointée par virement remettait la facture à
   « Envoyée » mais LAISSAIT sa ligne au registre des encaissements. Re-pointer le virement ajoutait une
   seconde ligne : le registre portait 130 € pour une facture de 120 €. Supprimer la facture laissait aussi
   une ligne orpheline. Le registre est la règle « un euro = une ligne » : une ligne née du pointage d'une
   facture (`factureId`, aucune intervention) meurt avec le paiement qui l'a créée.
   ⚠️ Une ligne qui porte AUSSI `interId` est l'encaissement sur place d'une intervention (carte, espèces) :
   l'argent a bien été pris, l'annulation du paiement de la facture ne l'efface pas — elle appartient à
   l'intervention. On la garde, et le banc le vérifie.
   facturation#11 — annuler le paiement d'une facture déjà validée par la compta la laissait « Envoyée · validée
   compta » : en repayant, elle redevenait « Validée » sans nouveau contrôle. La validation tombe avec le paiement.
   Droits : le registre est de la COMPTABILITÉ. Qui peut annuler une facture (Ventes › Modifier) mais n'a pas
   « Voir / gérer la comptabilité » ne peut pas effacer sa ligne : le geste est refusé EN ENTIER (pas à moitié).

   Ce banc EXÉCUTE les vraies factSetStatut, delFacture, comptaVirementOk, regAdd, et l'aide qui retire la ligne. */
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

console.log('\n── 1251 · 0. la population ──');
const NOMS = ['function factSetStatut(', 'function delFacture(', 'function comptaVirementOk(', 'function regAdd(', 'function factLignesRegistre(', 'function factRegistreRetirer(', 'function factQuitterPayee(', 'function docEmis('];
const CODE = {}; NOMS.forEach(n => { CODE[n] = bloc(n); });
v('les fonctions sont trouvées', NOMS.map(n => CODE[n].length > 40), NOMS.map(() => true));
v('⛔ une seule définition de chacune', NOMS.map(n => SRC.split(n).length - 1), NOMS.map(() => 1));
const DT = bloc('function docTot(d){'), LTL = ligne('const ligTotLigne='), LHT = ligne('const ligHT=');

function monde(opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __toasts: [], __confirms: [], __logs: [], __saves: 0, __rendus: 0,
    __reponse: opts.confirme !== false, __finance: opts.finance !== false, __ventesModifier: opts.modifier !== false, __ventesSupprimer: opts.supprimer !== false,
    db: { factures: [{ id: 'f1', num: 'FAC-2026-001', clientId: 'c1', date: '2026-10-01', statut: 'envoyee', tva: 0, lignes: [{ designation: 'x', qte: 1, pu: 120 }] }],
      registres: [], clients: [{ id: 'c1', nom: 'Boulangerie' }] },
    currentUser: { id: 'u1', prenom: 'Justin', nom: 'Roux' }, current: 'factures' };
  vm.createContext(ctx);
  vm.runInContext(`
    function esc(s){ return String(s==null?'':s); } function eur(n){ return Number(n||0).toFixed(2).replace('.',',')+' €'; }
    const FACT_ST={brouillon:{l:'En attente'},envoyee:{l:'Envoyée'},payee:{l:'Payée'},retard:{l:'En retard'}};
    const REG_MODES={VIR:['VIR','Virement'],CB:['CB','Carte bancaire'],ESP:['ESP','Espèces']};
    var views={ factures(){ __rendus++; }, comptabilite(){ __rendus++; } };
    var __id=0; function uid(){ return 'n'+(++__id); } function todayISO(){ return '2026-10-16'; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){} function logEvent(a,b){ __logs.push(a+' | '+b); }
    function confirm(m){ __confirms.push(String(m)); return __reponse; }
    function canCat(g,d){ return d==='supprimer' ? __ventesSupprimer : __ventesModifier; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast('Modifier '+q+' n\\'est pas autorisé'); return false; }
    function isFinanceMgr(){ return __finance; }
    function clientName(id){ return ((db.clients||[]).find(c=>c.id===id)||{}).nom||'—'; }
    function fullName(u){ return u.prenom+' '+u.nom; } function techName(){ return ''; }
    function FormData(t){ return Object.entries(t); }
    ${LTL}\n${LHT}\n${DT}
    ${NOMS.map(n => CODE[n]).join('\n')}`, ctx);
  return ctx;
}
const reg = W => W.db.registres.map(l => [l.factureId, l.interId, l.montant]);
const pointer = (W, montant) => W.comptaVirementOk({ preventDefault() {}, target: { fid: 'f1', montant: String(montant), date: '2026-10-16' } });

console.log('\n── 1251 · 1. facturation#4 — pointer, annuler, re-pointer : UN euro, UNE ligne ──');
{ const W = monde(); pointer(W, 120);
  v('population : le pointage crée UNE ligne liée à la facture, et la facture est payée', [reg(W), W.db.factures[0].statut], [[['f1', '', 120]], 'payee']);
  W.factSetStatut('f1', 'envoyee');
  v('⛔ « Annuler le paiement » : la facture repasse Envoyée…', W.db.factures[0].statut, 'envoyee');
  v('… ET la ligne du registre est retirée', reg(W), []);
  vrai('… l\'annulation est écrite au journal, avec le numéro', W.__logs.some(l => /registre/i.test(l) && /FAC-2026-001/.test(l)), W.__logs);
  vrai('… une confirmation a été demandée, qui nomme le montant', W.__confirms.length === 1 && /120,00 €/.test(W.__confirms[0]), W.__confirms);
  pointer(W, 120);
  v('⛔ re-pointer : le registre vaut 120 € (une ligne), pas 240', [reg(W).length, reg(W).reduce((s, l) => s + l[2], 0)], [1, 120]); }
{ /* les lignes qui ne sont pas à elle ne bougent pas */
  const W = monde(); pointer(W, 120);
  W.db.registres.push({ id: 'r9', montant: 10, mode: 'CB', interId: '', factureId: '', clientNom: 'Autre' });
  W.db.registres.push({ id: 'r8', montant: 50, mode: 'ESP', interId: 'i7', factureId: 'f1' });
  W.db.registres.push({ id: 'r7', montant: 30, mode: 'VIR', interId: '', factureId: 'f2' });
  v('population : le pointage + 3 lignes qui ne sont pas à lui, avant', W.db.registres.length, 4);
  W.factSetStatut('f1', 'envoyee');
  v('… et 3 lignes après (seule la sienne est partie)', W.db.registres.length, 3);
  v('une ligne sans facture, une ligne d\'une AUTRE facture : intactes', W.db.registres.filter(l => ['r9', 'r7'].includes(l.id)).length, 2);
  v('⛔ la ligne d\'ENCAISSEMENT SUR PLACE (interId + factureId) est gardée : l\'argent a été pris', W.db.registres.filter(l => l.id === 'r8').length, 1); }
{ /* sans ligne liée : pas de question */
  const W = monde(); W.db.factures[0].statut = 'payee';
  W.factSetStatut('f1', 'envoyee');
  v('payée « à la main » (aucune ligne) : l\'annulation passe, sans confirmation', [W.db.factures[0].statut, W.__confirms.length], ['envoyee', 0]); }
{ /* refus de la confirmation : rien ne bouge */
  const W = monde({ confirme: false }); pointer(W, 120); const saves = W.__saves;
  W.factSetStatut('f1', 'envoyee');
  v('confirmation refusée : la facture reste payée et la ligne reste', [W.db.factures[0].statut, reg(W).length, W.__saves], ['payee', 1, saves]); }
{ /* droits : le registre est de la comptabilité */
  const W = monde(); pointer(W, 120); W.__finance = false; const saves = W.__saves;
  W.factSetStatut('f1', 'envoyee');
  v('⛔ sans le droit Comptabilité : le geste est refusé EN ENTIER (statut inchangé, ligne gardée)', [W.db.factures[0].statut, reg(W).length, W.__saves], ['payee', 1, saves]);
  vrai('… et il le dit', W.__toasts.some(t => /compta/i.test(t)), W.__toasts); }
{ const W = monde({ modifier: false }); pointer(W, 120);
  W.factSetStatut('f1', 'envoyee');
  v('sans la case Ventes › Modifier : refusé comme avant (permGarde reste en première instruction)', [W.db.factures[0].statut, reg(W).length], ['payee', 1]); }
{ const W = monde(); pointer(W, 120); W.factSetStatut('f1', 'payee');
  v('payée → payée : ne retire rien', [W.db.factures[0].statut, reg(W).length, W.__confirms.length], ['payee', 1, 0]); }
{ const W = monde(); W.factSetStatut('f1', 'payee');
  v('envoyée → payée par le bouton : la date est posée, aucune ligne n\'est ajoutée ni retirée', [W.db.factures[0].statut, W.db.factures[0].datePaiement, reg(W).length], ['payee', '2026-10-16', 0]); }

console.log('\n── 1251 · 2. facturation#11 — la validation comptable tombe avec le paiement ──');
{ const W = monde(); pointer(W, 120); W.db.factures[0].valideCompta = true;
  W.factSetStatut('f1', 'envoyee');
  v('⛔ annulée : plus « validée compta »', [W.db.factures[0].statut, !!W.db.factures[0].valideCompta], ['envoyee', false]);
  vrai('… et le journal le dit', W.__logs.some(l => /valid/i.test(l) && /FAC-2026-001/.test(l)), W.__logs);
  pointer(W, 120);
  v('… re-payée, elle n\'est pas « Validée » d\'office', !!W.db.factures[0].valideCompta, false); }
{ const W = monde(); W.db.factures[0].statut = 'payee'; W.db.factures[0].valideCompta = true;
  W.factSetStatut('f1', 'retard');
  v('payée validée → « En retard » (autre statut non payé) : même chose', [W.db.factures[0].statut, !!W.db.factures[0].valideCompta], ['retard', false]); }

console.log('\n── 1251 · 3. delFacture — pas de ligne orpheline ──');
/* comptable (28 octobre 2026, B2) : une facture ÉMISE ne se supprime plus (test-3150). Ce que ce § garde — la ligne de
   registre qui part avec la facture — ne vit donc plus que sur un BROUILLON : on y rejoue la même ligne de pointage. */
const brouillonPointe = W => { pointer(W, 120); W.db.factures[0].statut = 'brouillon'; };
{ const W = monde(); brouillonPointe(W); W.db.registres.push({ id: 'r8', montant: 50, mode: 'ESP', interId: 'i7', factureId: 'f1' });
  W.delFacture('f1');
  v('facture supprimée', W.db.factures.length, 0);
  v('⛔ sa ligne de pointage est retirée ; l\'encaissement sur place de l\'intervention est gardé', W.db.registres.map(l => l.id), ['r8']);
  vrai('… la confirmation prévient du registre', W.__confirms.length === 1 && /registre/i.test(W.__confirms[0]), W.__confirms);
  vrai('… le journal garde « Facture supprimée »', W.__logs.some(l => /Facture supprimée/.test(l)), W.__logs); }
{ const W = monde(); W.db.factures[0].statut = 'brouillon'; W.delFacture('f1');
  v('un brouillon sans ligne se supprime comme avant, avec la question d\'avant', [W.db.factures.length, /Supprimer cette facture/.test(W.__confirms[0])], [0, true]); }
{ const W = monde(); pointer(W, 120); W.delFacture('f1');
  v('⛔ la facture ÉMISE (payée) pointée ne se supprime pas, et sa ligne de registre reste', [W.db.factures.length, reg(W).length, W.__confirms.length], [1, 1, 0]); }
{ const W = monde(); brouillonPointe(W); W.__finance = false;
  W.delFacture('f1');
  v('⛔ sans le droit Comptabilité : la facture pointée n\'est pas supprimée (sinon sa ligne resterait orpheline)', [W.db.factures.length, reg(W).length], [1, 1]); }
{ const W = monde({ confirme: false }); brouillonPointe(W); W.delFacture('f1');
  v('confirmation refusée : rien ne change', [W.db.factures.length, reg(W).length], [1, 1]); }
{ const W = monde({ supprimer: false }); brouillonPointe(W); W.delFacture('f1');
  v('sans la case Supprimer : refusé comme avant', [W.db.factures.length, reg(W).length], [1, 1]); }

console.log('\n══ test-1251 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
