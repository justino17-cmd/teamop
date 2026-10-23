/* ══ g13 · TÂCHES — planning#12 (titre d'espaces, note sans espace) ═════════════════════════════════════════════
   planning#12 : (a) `saveTache` ne coupait pas les espaces du titre, et `required` ne voit pas les espaces : une
   tâche au titre « ␣␣␣ » était enregistrée (une carte sans nom dans la liste, et dans le journal) ; (b) une note
   sans espace (une URL longue) débordait de la carte, parce que la note n'avait aucune règle de césure — la colonne
   (`.pl-info`) peut rétrécir, mais le texte, lui, ne se coupe pas tout seul.

   Ce banc EXÉCUTE la vraie `saveTache` (le titre, l'enregistrement, le refus) et la vraie `views.taches` (le HTML
   de la carte) extraites d'app.html. Le débordement lui-même se mesure au navigateur :
   scratchpad/gestion/correctifs/g13/taches-debordement.js.                                                    */
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
const ST = bloc('function saveTache(e,id){'), VT = bloc('views.taches=function(){'), MT = bloc('function mesTaches(){');
console.log('\n── 1142 · 0. la population ──');
v('les fonctions sont trouvées', [ST.length > 300, VT.length > 1500, MT.length > 60], [true, true, true]);
v('⛔ une seule définition de saveTache et de la vue', [SRC.split('function saveTache(').length - 1, SRC.split('views.taches=function(').length - 1], [1, 1]);

function monde(taches) {
  const content = { innerHTML: '' };
  const ctx = { console, JSON, Math, Date, Set, Object, Array, String, Number,
    db: { taches, techniciens: [{ id: 'tS', nom: 'Sophie Martin' }], clients: [] }, currentUser: { id: 'uA', role: 'admin' },
    __content: content, __toasts: [], __saves: 0, __log: [] };
  vm.createContext(ctx);
  vm.runInContext(`
    var tacheFilter='toutes';
    function $(){ return __content; }
    function permGarde(){ return true; } function can(){ return true; } function canCat(){ return true; }
    function toast(m){ __toasts.push(String(m)); } function champManque(m){ toast(m); return false; } function champDe(f,n){ return f&&f.elements?f.elements[n]||null:null; } /* champManque (audit apple-design, point 33) : ici, son message seul — test-2850 éprouve le reste */ function save(){ __saves++; } function closeModal(){}
    function logEvent(t,d){ __log.push([t,d]); } var __id=0; function uid(){ return 't'+(++__id); }
    function todayISO(){ return '2026-10-16'; } function myTechId(){ return null; }
    function setHeader(){} function emptyState(){ return ''; }
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function techName(){ return ''; } function clientName(){ return ''; } function fmtShort(i){ return i; }
    var views={}; function FormData(t){ return Object.entries(t); }
    ${MT}
    ${ST}
    ${VT}`, ctx);
  return ctx;
}
const sauver = (W, id, champs) => W.saveTache({ preventDefault() {}, target: Object.assign({ titre: '', techId: '', echeance: '', prio: 'normale', clientId: '', note: '' }, champs) }, id);

console.log('\n── 1142 · 1. ⛔ planning#12 — le titre ──');
{ const W = monde([]);
  sauver(W, '', { titre: '   ' });
  v('⛔⛔ un titre fait d\'espaces : REFUSÉ (rien d\'enregistré, rien dans le journal)', [W.db.taches.length, W.__saves, W.__log.length], [0, 0, 0]);
  vrai('… et on dit pourquoi', W.__toasts.some(t => /titre/i.test(t)), W.__toasts);
  sauver(W, '', { titre: '' });
  v('un titre vide l\'est aussi', W.db.taches.length, 0);
  sauver(W, '', { titre: '  \t  ' });
  v('⛔ … y compris tabulation et espaces mêlés', W.db.taches.length, 0); }
{ const W = monde([]);
  sauver(W, '', { titre: '  Rappeler Dupont  ', note: 'à 9h' });
  v('contre-épreuve : un vrai titre est enregistré, sans ses espaces de bord', [W.db.taches.length, (W.db.taches[0] || {}).titre], [1, 'Rappeler Dupont']);
  vrai('… le journal reçoit le titre propre aussi', W.__log[0] && W.__log[0][1] === 'Rappeler Dupont', W.__log);
  v('… et la tâche est bien créée « à faire »', [W.db.taches[0].fait, W.__saves], [false, 1]); }
{ const W = monde([{ id: 't9', titre: 'Commander des postes', note: 'x', fait: false }]);
  sauver(W, 't9', { titre: '   ' });
  v('⛔ MODIFIER une tâche vers un titre vide est refusé : le titre d\'avant reste', [W.db.taches[0].titre, W.__saves], ['Commander des postes', 0]);
  sauver(W, 't9', { titre: ' Commander des postes (urgent) ', note: 'x' });
  v('contre-épreuve : le renommer proprement marche', W.db.taches[0].titre, 'Commander des postes (urgent)'); }

console.log('\n── 1142 · 2. ⛔ planning#12 — la note sans espace ne déborde plus de la carte ──');
{ const LONGUE = 'https://exemple.fr/' + 'a'.repeat(300);
  const W = monde([{ id: 't1', titre: 'Lire le lien', note: LONGUE, fait: false }]);
  W.views.taches();
  const html = W.__content.innerHTML;
  const m = html.match(/<div style="([^"]*)">https:\/\/exemple\.fr\/a+<\/div>/);
  vrai('la note est rendue dans la carte (l\'enregistrement a eu lieu : le HTML la porte)', !!m, html.slice(0, 200));
  vrai('⛔⛔ … et son style autorise la césure n\'importe où (overflow-wrap:anywhere) — sans quoi une URL sort de la carte', !!m && /overflow-wrap:\s*anywhere/.test(m[1]), m && m[1]);
  vrai('… et la colonne peut rétrécir (min-width:0) pour que la règle prenne', !!m && /min-width:\s*0/.test(m[1]), m && m[1]);
  const t = html.match(/<div class="pl-title" style="([^"]*)">Lire le lien/);
  vrai('le TITRE aussi (même cause : un titre fait d\'une URL)', !!t && /overflow-wrap:\s*anywhere/.test(t[1]), t && t[1]); }

console.log(`\n════ test-1142 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
