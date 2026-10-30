/* ══ g19 · stock#6 — « AUCUN MOUVEMENT » NE DIT PAS QUE LE JOURNAL EST VIDE QUAND IL NE L'EST PAS ═════
   `views.mouvements` n'affichait « Aucun mouvement ne correspond à ce filtre. » que pour un filtre de
   type ou de box ; une RECHERCHE sans résultat (ou le filtre « Validés » sans rien de validé) tombait
   sur « Aucun mouvement pour l'instant. Ils apparaîtront automatiquement dès que le stock bouge. » —
   faux, le journal contient des mouvements. Boxes et Produits donnés, eux, savent dire « ne correspond ».

   La règle : le message « pour l'instant » n'est dit que si le journal VISIBLE est réellement vide ;
   dès qu'il contient un mouvement et que la liste est vide, c'est qu'un filtre ou une recherche l'a
   vidée, et l'écran le dit. Ce banc EXÉCUTE la vraie `views.mouvements`.                              */
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

console.log('\n── 1163 · 0. la population ──');
const VM = bloc('views.mouvements=function(){');
vrai('views.mouvements est trouvée', VM.length > 5000, VM.length);
vrai('une seule définition de views.mouvements', SRC.split('views.mouvements=function(').length - 1 === 1);

const MBA = bloc('function mvtBoxActif(');
vrai('mvtBoxActif (la porte du filtre par box, fermée hors 3D) est trouvée', MBA.length > 20, MBA);
const PAS = /Aucun mouvement pour l.instant/, CORRESPOND = /Aucun mouvement ne correspond/;
function jouer(mouvements, filtres) {
  const nodes = {};
  const propre = { JSON, Math, Date, Set, Map, Object, Array, String, Number, console, parseInt, parseFloat, isFinite, RegExp,
    esc: s => String(s == null ? '' : s), sansBox: () => false, libBox: (a, b) => a, boxTxt: s => s, emptyState: (ic, titre) => '<p class="vide">' + titre + '</p>', setHeader() {}, APP_VERSION: '767',
    currentUser: { role: 'admin', prenom: 'Léa', nom: 'Roux' }, db: { mouvements, boxes: [{ id: 'b1', nom: 'Box A' }], bons: [], produits: [{ id: 'p1', nom: 'ALTA 7000' }], vehicules: [] },
    visibleMouvements: l => l, visibleRemises: l => l || [], visibleBoxes: l => l, produit: id => ({ id, nom: 'ALTA 7000', ref: 'R1' }), vehName: () => '', stockageVisible: () => true,
    $: id => nodes[id] || (nodes[id] = { innerHTML: '' }) };
  const ctx = new Proxy(propre, { has: (t, k) => typeof k === 'string', get: (t, k) => k in t ? t[k] : (k === Symbol.unscopables ? undefined : (k in globalThis ? globalThis[k] : (() => ''))), set: (t, k, v) => { t[k] = v; return true; } });
  vm.createContext(ctx);
  vm.runInContext(`var views={}, mvtFType='', mvtFBox='', mvtFQ='', mvtFBoxQ='', mvtMenuOuvert='', mvtMoisOuverts={}, mvtBoxOuverts={};\n${MBA}\n${VM}`, ctx);
  Object.keys(filtres || {}).forEach(k => vm.runInContext(k + '=' + JSON.stringify(filtres[k]), ctx));
  ctx.views.mouvements();
  return nodes.content.innerHTML;
}
const mvt = (extra) => Object.assign({ id: 'm1', ts: Date.now(), type: 'entree', produitId: 'p1', boxId: 'b1', qte: 1, technicien: 'Léa Roux', motif: 'Arrivage' }, extra);

console.log('\n── 1163 · 1. une recherche sans résultat n\'efface pas le journal ──');
{ const h = jouer([mvt()], { mvtFQ: 'zzzzzz' });
  vrai('population : le journal contient bien un mouvement (le compteur du jour le dit)', />\+1</.test(h) || /Mouvements au journal/.test(h));
  vrai('⛔ la recherche « zzzzzz » dit « Aucun mouvement ne correspond »', CORRESPOND.test(h), (h.match(/<p class="vide">[^<]*/) || [])[0]);
  vrai('⛔ … et ne dit PAS « pour l\'instant » (le journal n\'est pas vide)', !PAS.test(h));
}
console.log('\n── 1163 · 2. un filtre sans résultat non plus ──');
{ const h = jouer([mvt()], { mvtFType: 'valide' });
  vrai('⛔ le filtre « Validés » sans rien de validé : « ne correspond »', CORRESPOND.test(h) && !PAS.test(h), (h.match(/<p class="vide">[^<]*/) || [])[0]);
  const h2 = jouer([mvt()], { mvtFType: 'sortie' });
  vrai('le filtre « Retirés » sans sortie : « ne correspond »', CORRESPOND.test(h2) && !PAS.test(h2));
  const h3 = jouer([mvt()], { mvtFBox: 'autre-box' });
  vrai('une autre box sans mouvement : « ne correspond »', CORRESPOND.test(h3) && !PAS.test(h3));
}
console.log('\n── 1163 · 3. contre-épreuves ──');
{ const h = jouer([], {});
  vrai('journal réellement vide, aucun filtre : « pour l\'instant » (le message d\'origine reste)', PAS.test(h) && !CORRESPOND.test(h), (h.match(/<p class="vide">[^<]*/) || [])[0]);
  const hf = jouer([], { mvtFQ: 'abc' });
  vrai('journal vide ET une recherche tapée : on ne prétend pas qu\'un mouvement existe — « pour l\'instant »', PAS.test(hf) && !CORRESPOND.test(hf), (hf.match(/<p class="vide">[^<]*/) || [])[0]);
  const hp = jouer([mvt()], { mvtFQ: 'alta' });
  vrai('une recherche qui TROUVE (nom du produit) n\'affiche ni l\'un ni l\'autre message', !PAS.test(hp) && !CORRESPOND.test(hp) && /mvtToggleBox/.test(hp), (hp.match(/<p class="vide">[^<]*/) || [])[0]);
}
console.log('\n' + (ok + ko) + ' contrôles — ' + ok + ' ✓ ' + ko + ' ✗');
console.log('════ test-1163 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
