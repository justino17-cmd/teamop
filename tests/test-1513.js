/* ══ i02 · r3#16 — LA VUE JOUR (LISTE, TÉLÉPHONE) N'INVITE À GLISSER QUE CELUI QUI PEUT PLANIFIER ═══════════════
   `planDayListHtml` écrivait « Glissez une carte sur un technicien pour la réassigner » sans condition : seul le
   suffixe « sur un jour… » dépendait de `canPlan()`. Un technicien (qui n'a pas « Déplacer le planning ») lisait une
   invitation à un geste que `planDropTech` refuse ensuite par un toast. Les autres vues du planning passent par
   `planAide` (« ne promet QUE ce que la personne peut faire ») ; celle-ci l'avait oublié.

   Ce banc EXÉCUTE la vraie `planDayListHtml` dans les deux cas (peut planifier / ne peut pas) et lit le texte rendu.
   La vue Jour en colonnes (Mac) dit déjà « Lecture seule » : on vérifie que la liste dit la même chose.        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (CLAUDE.md) — un motif vise du code. */
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

console.log('\n── 1513 · 0. la population ──');
const PDL = bloc('function planDayListHtml(');
vrai('planDayListHtml est trouvée (une tranche vide passerait au vert sur tout)', PDL.length > 1500, PDL.length);
v('⛔ une seule définition', SRC.split('function planDayListHtml(').length - 1, 1);

function rendre(peut) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, parseInt,
    db: { techniciens: [{ id: 't1', nom: 'Marc' }] }, __peut: peut };
  vm.createContext(ctx);
  vm.runInContext(`var planSel='2026-10-17', ABS_TYPES={};
    function canPlan(){ return __peut; } function fmtLong(d){ return d; } function shiftDay(d){ return d; } function todayISO(){ return '2026-10-17'; }
    function planTechMSet(){ return new Set(['t1','']); } function intTechIds(i){ return i.techIds||[]; } function absentOn(){ return null; }
    function techColor(){ return '#000'; } function initials(n){ return String(n).slice(0,2); } function esc(s){ return String(s); }
    function planIntCard(i){ return '<div data-carte="'+i.id+'">carte</div>'; }
    ${PDL}`, ctx);
  return vm.runInContext('planDayListHtml([{id:"i1",date:"2026-10-17",techIds:["t1"]}])', ctx);
}
const sans = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

console.log('\n── 1513 · 1. ⛔ qui NE peut PAS planifier ne lit pas d\'invitation à glisser ──');
{ const h = rendre(false);
  vrai('population : la liste est rendue (une ligne par technicien, la carte y est)', /data-ligne="t1"/.test(h) && /data-carte="i1"/.test(h), h.slice(0, 200));
  vrai('⛔ aucune invitation « Glissez »', !/Glissez/.test(sans(h)), sans(h));
  vrai('… il lit pourquoi : lecture seule, et le droit nommé (comme la vue Jour en colonnes)', /Lecture seule — le droit « Déplacer le planning » est requis/.test(sans(h)), sans(h));
}
console.log('\n── 1513 · 2. contre-épreuve : qui PEUT planifier garde l\'invitation, en entier ──');
{ const h = rendre(true);
  vrai('l\'invitation est là, avec la partie « sur un jour »', /Glissez une carte sur un technicien pour la réassigner · sur un jour \(vue Semaine\/Mois\) pour changer la date/.test(sans(h)), sans(h));
  vrai('… et pas de « Lecture seule »', !/Lecture seule/.test(sans(h)), sans(h));
}
console.log('\n════ test-1513 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
