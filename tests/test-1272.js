/* ══ PLANNING — UN TECHNICIEN CRÉÉ APRÈS UNE VISITE N'EST PLUS CACHÉ (admin#1) ═══════════════════
   planTechMSet() mémorisait l'ensemble des techniciens AFFICHÉS dès la première visite
   (localStorage elan_plan_techs) et n'y ajoutait jamais un technicien créé ensuite : le Planning
   annonçait « Filtre actif : 4 techniciens sur 5 », la colonne de la nouvelle personne n'existait pas
   et ses interventions disparaissaient. Il faut distinguer « décoché exprès » de « nouveau » : on
   mémorise aussi la liste des techniciens CONNUS. Ce banc exécute les vraies fonctions (planTechMSet,
   planTechMSave, planTechMToggle…) contre un localStorage simulé, en deux « sessions » (planTechM remis
   à null, comme un rechargement). Rien n'entre dans db. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function corps(nom) { const m = new RegExp('function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0;
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }

// la déclaration de l'état en mémoire : lue dans le code, pas recopiée
const decl = (SRC.match(/^let planJours=\[\][^\n]*;$/m) || [''])[0];
vrai('la ligne qui déclare l\'état du filtre est trouvée', decl.length > 0);
const FN = ['planTechMEcrire', 'planTechMSet', 'planTechMSave', 'planTechMToggle', 'planTechMTous'].map(corps).filter(Boolean).join('\n');
const MEM = {};   // le « localStorage » : survit à un rechargement
function session(db, extra) {
  const W = Object.assign({ db, localStorage: { getItem: k => (k in MEM ? MEM[k] : null), setItem: (k, v) => { MEM[k] = String(v); } },
    JSON, Set, Array, planFocusT: '', views: { planning() {} } }, extra || {});
  vm.createContext(W);
  vm.runInContext(decl.replace(/_planMap=null/, '_planMap=null') + '\n' + FN, W);
  return W;
}
const tech = id => ({ id, nom: id });
const ids = W => [...W.planTechMSet()].filter(Boolean).sort();
const dbBase = () => ({ techniciens: [tech('T1'), tech('T2'), tech('T3'), tech('T4')] });

console.log('— admin#1 : la nouvelle technicienne paraît');
{ for (const k of Object.keys(MEM)) delete MEM[k];
  const db = dbBase(); let W = session(db);
  vrai('première visite : tout le monde est affiché (population non vide)', ids(W).join() === 'T1,T2,T3,T4', ids(W));
  db.techniciens.push(tech('T5'));
  vrai('technicien créé pendant que le Planning reste en mémoire : affiché', ids(W).join() === 'T1,T2,T3,T4,T5', ids(W));
  W = session(db);   // rechargement
  vrai('après rechargement : toujours affiché (rien de caché)', ids(W).join() === 'T1,T2,T3,T4,T5', ids(W)); }
{ for (const k of Object.keys(MEM)) delete MEM[k];
  const db = dbBase(); let W = session(db); W.planTechMSet();
  W.planTechMSave();                               // visite faite, mémorisée
  db.techniciens.push(tech('T5'));                  // créée entre deux séances
  W = session(db);                                  // nouvelle séance
  vrai('créé entre deux séances : affiché à la séance suivante (le cas du rapport)', ids(W).join() === 'T1,T2,T3,T4,T5', ids(W));
  vrai('aucun filtre actif : 5 techniciens sur 5', W.planTechMSet().size === 6, W.planTechMSet().size); }

console.log('— un décochage VOULU reste voulu');
{ for (const k of Object.keys(MEM)) delete MEM[k];
  const db = dbBase(); let W = session(db);
  W.planTechMToggle('T3');                          // décoché exprès
  vrai('T3 décoché', !W.planTechMSet().has('T3'), ids(W));
  db.techniciens.push(tech('T5'));
  W = session(db);
  vrai('après rechargement et un nouveau technicien : T3 reste décoché', !W.planTechMSet().has('T3'), ids(W));
  vrai('et le nouveau paraît', W.planTechMSet().has('T5'), ids(W));
  W.planTechMTous(false);
  db.techniciens.push(tech('T6'));
  vrai('« Aucun » (tout décoché) : un technicien créé ensuite paraît quand même', W.planTechMSet().has('T6') && !W.planTechMSet().has('T1'), ids(W)); }

console.log('— réglage d\'avant (sans liste des connus)');
{ for (const k of Object.keys(MEM)) delete MEM[k];
  MEM.elan_plan_techs = JSON.stringify(['T1', 'T2', 'T4', '']);   // T3 décoché autrefois
  const db = dbBase(); let W = session(db);
  vrai('ne plante pas, T3 reste décoché (on ne devine pas)', ids(W).join() === 'T1,T2,T4', ids(W));
  db.techniciens.push(tech('T5'));
  vrai('un technicien créé ensuite paraît', W.planTechMSet().has('T5') && !W.planTechMSet().has('T3'), ids(W));
  W = session(db);
  vrai('et après rechargement aussi', W.planTechMSet().has('T5') && !W.planTechMSet().has('T3'), ids(W)); }

console.log('— rien dans db, localStorage seulement');
{ const db = dbBase(); const W = session(db); W.planTechMSet(); db.techniciens.push(tech('T9')); W.planTechMSet();
  vrai('db n\'a pas gagné de champ (seulement ses techniciens)', Object.keys(db).join() === 'techniciens', Object.keys(db)); }

console.log('\n════ test-1272 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
