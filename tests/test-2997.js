/* test-2997 — Chauffage / climatisation : les APPAREILS VISITÉS figurent dans le rapport d'intervention (24 octobre 2026).
   `rapportConstatLignes` est la source unique du rapport imprimé ET du PDF joint au courriel (test-802 § 5) : une ligne « Appareils visités » y paraît pour un métier qui
   a un parc (`metierGereParc`, le VRAI bloc CVC monté par cvc-monter.js), avec le libellé et l'emplacement de chaque appareil cité ; jamais pour un autre métier, jamais
   un appareil d'un autre client, jamais un appareil retiré du parc. Le banc EXÉCUTE la vraie fonction, extraite du fichier livré. */
const vm = require('vm');
const { monter, APP } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const d = APP.indexOf('\nfunction rapportConstatLignes('), f = APP.indexOf('\n  return rows; }', d);
v('(population) rapportConstatLignes est trouvée dans le fichier livré', d > 0 && f > d, true);
const SRC = APP.slice(d + 1, f + '\n  return rows; }'.length);
const db = { clients: [{ id: 'c1', nom: 'Martin' }, { id: 'c2', nom: 'Autre' }], interventions: [], contrats: [],
  appareils: [{ id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', modele: 'ThemaPlus', emplacement: 'Cuisine' },
    { id: 'a2', clientId: 'c1', type: 'pac_air_eau', marque: 'Daikin', modele: 'Altherma' },
    { id: 'a3', clientId: 'c2', type: 'chaudiere_gaz', marque: 'Vaillant', modele: 'ecoTEC' }] };
function lignes(metier, i) {
  const W = monter({ metier, db });
  Object.assign(W, { PRESTATION_ITEMS: [], libZones: () => 'Zones', traitementSummary: () => [], NUIS_TRAIT: {}, ficheSummary: () => [], metierRelevesLignes: () => [] });
  vm.runInContext(SRC + '\nthis.__rcl = rapportConstatLignes;', W);
  return W.__rcl(i);
}
const i = { id: 'i1', clientId: 'c1', type: 'Entretien annuel chaudière', appareilIds: ['a1', 'a2', 'a3', 'a-retire'] };
const L = lignes('chauffage', i), app = L.find(r => r[0] === 'Appareils visités');
v('⛔ chauffage : une ligne « Appareils visités », juste après la prestation', L.findIndex(r => r[0] === 'Appareils visités'), 1);
v('   avec le libellé et l’emplacement de chaque appareil du client ; ni celui d’un autre client, ni un appareil retiré du parc', !!app && /Saunier Duval/.test(app[1]) && /Cuisine/.test(app[1]) && /Daikin/.test(app[1]) && !/Vaillant/.test(app[1]), true);
v('⛔ un métier sans parc (3D) : aucune ligne, même avec des appareils cités', lignes('3d', i).some(r => r[0] === 'Appareils visités'), false);
v('   aucun appareil cité : aucune ligne', lignes('chauffage', { id: 'i2', clientId: 'c1', type: 'Dépannage' }).some(r => r[0] === 'Appareils visités'), false);
v('   seuls des appareils d’un autre client : aucune ligne (rien de vide)', lignes('chauffage', { id: 'i3', clientId: 'c1', appareilIds: ['a3'] }).some(r => r[0] === 'Appareils visités'), false);
console.log(`\ntest-2997 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
