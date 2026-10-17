/* ══ PLANNING — L'AIDE NE PROMET QUE CE QUE LA PERSONNE PEUT FAIRE (technicien#10) ═══════════════
   Un technicien lisait, sous la barre du planning, « double-cliquez une case vide pour créer » alors
   qu'il ne peut pas créer (planMultiVide sort sur !canCat('int','ajouter')) ; « Alt + glisser =
   dupliquer » était promis à tous ceux qui peuvent déplacer, alors que planDup refuse sans le droit
   d'ajouter. L'aide des trois vues (Multi, Semaine, Jour) passe désormais par UNE fonction, planAide,
   que ce banc EXÉCUTE pour chaque combinaison de droits, puis il recense par le texte (commentaires
   retirés) que les trois vues l'appellent et qu'aucune n'écrit plus la phrase à la main. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function corps(nom) { const m = new RegExp('function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0;
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }

const src = corps('planAide');
vrai('planAide existe dans le code', src.length > 0);
const D = { planifier: false, creer: false };
const W = { canPlan: () => D.planifier, canCat: (g, d) => g === 'int' && d === 'ajouter' && D.creer };
vm.createContext(W);
if (src) vm.runInContext(src, W);
const aide = (pl, cr, ...a) => { D.planifier = pl; D.creer = cr; return W.planAide ? W.planAide(...a) : '<erreur>'; };
const G = 'Glissez', L = 'Lecture seule';

console.log('— vues Multi et Semaine (glisser + double-clic)');
{ const h = aide(false, false, G, true);
  vrai('technicien (ni déplacer ni créer) : aucune aide, aucune ligne vide', h === '', h);
  const a = aide(true, true, G, true);
  vrai('droits complets : glisser, dupliquer et double-clic', /Glissez/.test(a) && /Alt \+ glisser = dupliquer/.test(a) && /double-cliquez/.test(a), a);
  const b = aide(true, false, G, true);
  vrai('peut déplacer sans pouvoir créer : glisser seul (ni dupliquer, ni double-clic)', /Glissez/.test(b) && !/dupliquer/.test(b) && !/double-cliquez/.test(b), b);
  const c = aide(false, true, G, true);
  vrai('peut créer sans pouvoir déplacer : le double-clic seul (pas de « glissez »)', !/Glissez/.test(c) && !/dupliquer/.test(c) && /double-cliquez/.test(c), c); }
console.log('— vue Jour (glisser + lecture seule, pas de double-clic)');
{ const h = aide(false, false, G, false, L);
  vrai('sans le droit de déplacer : la mention « lecture seule », rien d\'autre', /Lecture seule/.test(h) && !/double-cliquez/.test(h) && !/Glissez/.test(h), h);
  const a = aide(true, true, G, false, L);
  vrai('droits complets : glisser + dupliquer, sans double-clic ni lecture seule', /Glissez/.test(a) && /dupliquer/.test(a) && !/double-cliquez/.test(a) && !/Lecture seule/.test(a), a);
  const b = aide(true, false, G, false, L);
  vrai('peut déplacer sans pouvoir créer : pas de « dupliquer »', /Glissez/.test(b) && !/dupliquer/.test(b), b); }

console.log('— les trois vues passent par planAide');
const nAppels = (SRC.match(/\$\{planAide\(/g) || []).length;
vrai('trois appels de planAide (Multi, Semaine, Jour)', nAppels === 3, nAppels);
vrai('plus aucune phrase d\'aide écrite à la main hors de planAide', (SRC.replace(src, '').match(/double-cliquez une case vide/g) || []).length === 0);
vrai('plus de « Alt + glisser = dupliquer » écrit à la main hors de planAide', (SRC.replace(src, '').match(/Alt \+ glisser = dupliquer/g) || []).length === 0);

console.log('\n════ test-1271 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
