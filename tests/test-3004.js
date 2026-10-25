/* test-3004 — Chauffage / climatisation : le suivi des BOUTEILLES DE FLUIDE (25 octobre 2026).
   Le VRAI bloc CVC (cvc-monter.js). Le registre se déduit des fiches fluides (aucune donnée de plus) : une bouteille par identifiant (casse et espaces
   ignorés), ce qui en a été chargé, ce qui y a été récupéré, ses fluides, sa dernière utilisation ; un MÉLANGE de fluides récupérés dans une même bouteille
   est signalé en tête, et la fiche le demande avant d'enregistrer (une question : une bouteille rendue vide peut revenir sous le même numéro). */
const vm = require('vm');
const { monter, formulaire, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const fiche = (id, date, fluide, charge, recup, contenant) => ({ id, appareilId: 'a1', date, nature: 'Maintenance / entretien', fluide, charge, recup, contenant, attestation: 'AC-1' });
const BASE = { clients: [{ id: 'c1', nom: 'Hôtel du Port' }], appareils: [{ id: 'a1', clientId: 'c1', type: 'clim_split', marque: 'Daikin', fluide: 'R32' }],
  interventions: [
    { id: 'i1', clientId: 'c1', statut: 'terminee', date: '2026-09-01', appareilIds: ['a1'], fichesFluides: [fiche('f1', '2026-09-01', 'R32', 1.5, '', 'BT-001'), fiche('f2', '2026-09-01', 'R410A', '', 2, 'REC-7')] },
    { id: 'i2', clientId: 'c1', statut: 'terminee', date: '2026-10-05', appareilIds: ['a1'], fichesFluides: [fiche('f3', '2026-10-05', 'R32', 0.5, '', ' bt-001 '), fiche('f4', '2026-10-05', 'R32', '', 1, 'rec-7')] },
    { id: 'i3', clientId: 'c1', statut: 'encours', date: '2026-10-23', appareilIds: ['a1'] }], contrats: [] };
const W = monter({ db: cdc(BASE) });
const L = W.cvcBouteilles();
const bt = L.find(b => b.cle === 'BT-001'), rec = L.find(b => b.cle === 'REC-7');
vrai('(population) deux bouteilles, reconnues malgré la casse et les espaces', L.length === 2 && !!bt && !!rec, JSON.stringify(L));
vrai('la bouteille de charge : 2 kg chargés de R32, deux fiches, dernière le 5 octobre', bt.charge === 2 && bt.recup === 0 && bt.fluidesCharges.join() === 'R32' && bt.fiches === 2 && bt.dernier === '2026-10-05');
vrai('⛔ la bouteille de récupération : R410A puis R32 récupérés → MÉLANGE signalé, et en tête de liste', rec.melange === true && rec.recup === 3 && rec.fluidesRecup.join() === 'R410A,R32' && L[0] === rec);
vrai('   une bouteille qui n’a reçu qu’un fluide n’est pas un mélange', bt.melange === false);
vrai('   la fiche qu’on modifie ne compte pas (sauf)', W.cvcBouteilles('f4').find(b => b.cle === 'REC-7').melange === false);
const bloc = W.cvcBouteillesBloc();
vrai('le registre s’affiche dans les Tâches : les deux bouteilles, l’alerte de mélange en clair', /Bouteilles de fluide/.test(bloc) && /BT-001/.test(bloc) && /REC-7/.test(bloc) && /on ne mélange pas les fluides/.test(bloc) && /récupéré 3 kg/.test(bloc));
vrai('   hors métier à parc : rien', monter({ db: cdc(BASE), metier: 'nettoyage' }).cvcBouteillesBloc() === '');
vrai('   aucune fiche avec bouteille : rien (pas de carte vide)', monter({ db: { clients: [], appareils: [], interventions: [], contrats: [] } }).cvcBouteillesBloc() === '');
const FORM = o => formulaire(Object.assign({ date: '2026-10-23', nature: 'Récupération / démantèlement', fluide: 'R32', prp: '', charge: '', recup: '1', contenant: 'BT-NEUVE', bordereau: '',
  controle: false, resultat: '', vignette: '', fuiteLieu: '', attestation: 'AC-1', operateur: 'Tom', obs: '' }, o || {}));
const n = W2 => (W2.db.interventions.find(i => i.id === 'i3').fichesFluides || []).length;
{ const W2 = monter({ db: cdc(BASE) }); vm.runInContext("var __cf=[]; confirm=function(m){ __cf.push(m); return false; }", W2);
  W2.cvcFicheSauver({ preventDefault() {}, target: FORM({ contenant: 'Rec-7', fluide: 'R32' }) }, 'i3', 'a1', '');
  vrai('⛔ récupérer du R32 dans une bouteille qui a déjà reçu du R410A : la question est posée, et « non » n’enregistre rien', W2.__cf.length === 1 && /déjà servi à récupérer du R410A/.test(W2.__cf[0]) && n(W2) === 0, JSON.stringify(W2.__cf)); }
{ const W2 = monter({ db: cdc(BASE) }); vm.runInContext("var __cf=[]; confirm=function(m){ __cf.push(m); return true; }", W2);
  W2.cvcFicheSauver({ preventDefault() {}, target: FORM({ contenant: 'REC-7', fluide: 'R32' }) }, 'i3', 'a1', '');
  vrai('   « oui » (bouteille vidée et rendue) : la fiche est enregistrée', n(W2) === 1); }
{ const W2 = monter({ db: cdc(BASE) }); vm.runInContext("var __cf=[]; confirm=function(m){ __cf.push(m); return false; }", W2);
  W2.cvcFicheSauver({ preventDefault() {}, target: FORM({ contenant: 'BT-NEUVE' }) }, 'i3', 'a1', '');
  W2.cvcFicheSauver({ preventDefault() {}, target: FORM({ contenant: 'REC-7', fluide: 'R32', recup: '', charge: '0.4' }) }, 'i3', 'a1', '');
  vrai('   une bouteille neuve, ou une CHARGE depuis une bouteille : aucune question', W2.__cf.length === 0 && n(W2) === 2); }
{ const W2 = monter({ db: cdc(BASE) }); W2.cvcFicheForm('i3', 'a1', ''); const f = W2.__modals[W2.__modals.length - 1] || '';
  vrai('le formulaire propose les bouteilles déjà connues (liste de suggestions)', /list="cvc-bt"/.test(f) && /<datalist id="cvc-bt">/.test(f) && /value="BT-001"/.test(f) && /value="REC-7"/.test(f)); }
const APP = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.html'), 'utf8');
vrai('le registre est posé dans la vue des Tâches, après les entretiens à planifier', /cvcTachesBloc\(\):''\)\+\(typeof cvcBouteillesBloc==='function'\?cvcBouteillesBloc\(\):''\)/.test(APP));
console.log(`\ntest-3004 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
