/* test-2999 — Chauffage / climatisation : pas de fiche fluides sans n° d'attestation de capacité (24 octobre 2026).
   Seule une entreprise titulaire de cette attestation manipule des fluides frigorigènes (code de l'environnement, art. R543-99) et la fiche d'intervention porte son
   numéro : `cvcFicheSauver` (le VRAI bloc CVC, monté par cvc-monter.js) refuse une fiche sans lui et le DIT ; le champ se pré-remplit avec le dernier numéro saisi
   (`cvcDerniereAttestation`). */
const { monter, formulaire, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const BASE = { clients: [{ id: 'c1', nom: 'Hôtel du Port' }],
  appareils: [{ id: 'a2', clientId: 'c1', type: 'clim_split', marque: 'Daikin', fluide: 'R410A', charge: 2.5 }],
  interventions: [
    { id: 'i1', clientId: 'c1', statut: 'terminee', date: '2025-11-20', appareilIds: ['a2'], fichesFluides: [{ id: 'f1', appareilId: 'a2', date: '2025-11-20', nature: 'Contrôle d’étanchéité', fluide: 'R410A', attestation: 'AC-ANCIEN' }] },
    { id: 'i0', clientId: 'c1', statut: 'terminee', date: '2026-03-02', appareilIds: ['a2'], fichesFluides: [{ id: 'f0', appareilId: 'a2', date: '2026-03-02', nature: 'Contrôle d’étanchéité', fluide: 'R410A', attestation: 'AC-2026-77' }] },
    { id: 'i2', clientId: 'c1', statut: 'encours', date: '2026-10-23', type: 'Maintenance', appareilIds: ['a2'] }], contrats: [] };
const FORM = o => formulaire(Object.assign({ date: '2026-10-23', nature: 'Contrôle d’étanchéité', fluide: 'R410A', prp: '', charge: '0', recup: '0', contenant: '', bordereau: '',
  controle: true, resultat: 'conforme', vignette: 'bleue', fuiteLieu: '', attestation: 'AC-2026-77', operateur: 'Tom', obs: '' }, o || {}));
const SOUMET = (W, o) => W.cvcFicheSauver({ preventDefault() {}, target: FORM(o) }, 'i2', 'a2', '');
const fiches = W => (W.db.interventions.find(i => i.id === 'i2').fichesFluides || []).length;
{
  const W = monter({ db: cdc(BASE), today: '2026-10-23' });
  SOUMET(W, { attestation: '' });
  v('⛔ sans n° d’attestation : la fiche n’est PAS enregistrée, et l’écran le dit', [fiches(W), W.__saves, W.__toasts.some(t => /attestation de capacité de l’opérateur est obligatoire/.test(t))], [0, 0, true]);
  SOUMET(W, { attestation: '   ' });
  v('   des espaces seuls ne comptent pas pour un numéro', fiches(W), 0);
  SOUMET(W, {});
  v('   avec son numéro : la fiche est enregistrée', [fiches(W), W.db.interventions.find(i => i.id === 'i2').fichesFluides[0].attestation], [1, 'AC-2026-77']);
}
v('le champ se pré-remplit avec le DERNIER numéro saisi (par date), celui de l’entreprise', monter({ db: cdc(BASE) }).cvcDerniereAttestation(), 'AC-2026-77');
v('   aucune fiche avant : vide (rien d’inventé)', monter({ db: { clients: [], appareils: [], interventions: [], contrats: [] } }).cvcDerniereAttestation(), '');
console.log(`\ntest-2999 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
