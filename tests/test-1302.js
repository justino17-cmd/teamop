/* ══ 1302 · SECTEURS : UN ARRONDISSEMENT N'EST PAS UN CODE POSTAL QUI COMMENCE PAR 13, 69 OU 75 (admin#2, admin#3) ══
   Rapport du testeur, 16 octobre 2026 :
   · admin#2 — un client d'Aix (13100) ou de Villeurbanne (69100) donnait « Département Marseille 100e non couvert
     par un technicien » : `cpToKey` traitait 13/69/75 comme des VILLES (clé à 5 chiffres) et `keyLabel` lisait les
     trois derniers chiffres comme un numéro d'arrondissement.
   · admin#3 — « 2A » / « 2B » saisis dans le secteur d'un technicien n'étaient pas reconnus (`parseTechDepts` → []),
     les clients 20xxx étaient rangés sous « 20 », qu'aucun secteur ne peut couvrir ; et « 971 Guadeloupe » s'affichait
     « 97 » (la clé à trois chiffres des DOM était coupée à deux).

   Ce banc EXÉCUTE les vraies fonctions du fichier (DEPT_NAMES comprise) et la vraie vue Secteurs.            */
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

console.log('\n── 1302 · 0. la population ──');
const PIECES = {
  DEPT: ligne('const DEPT_NAMES='), BIG: ligne('const BIG_CITIES='), NORM: ligne('const norm = s =>'),
  ARR: bloc('function cpEstArrondissement('), DEPKEY: bloc('function depDeKey('), DEPCP: bloc('function depFromCp(cp){'), CPKEY: bloc('function cpToKey(cp){'),
  LABEL: bloc('function keyLabel(key){'), NAMECODE: bloc('function deptCodeFromName(s){'), PARSE: bloc('function parseTechDepts(str){'),
  KFC: bloc('function keyForClient(clientId){'), TFK: bloc('function techForKey(key,affectable){') + '\n' + bloc('function techAssignable(t){') + '\n' + bloc('function techCouvrantEnPartie(dep){'), DCOL: bloc('function deptColor(key){'), SECT: bloc('views.secteurs=function(){') };
v('toutes les pièces sont trouvées', Object.entries(PIECES).filter(([, x]) => !x).map(([k]) => k), []);
v('⛔ une seule définition de chaque fonction de secteur', ['cpToKey', 'keyLabel', 'parseTechDepts', 'depFromCp', 'techForKey', 'cpEstArrondissement', 'depDeKey'].map(n => SRC.split('function ' + n + '(').length - 1), [1, 1, 1, 1, 1, 1, 1]);

function monde(db) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, db, __html: '', __titre: '', views: {} };
  vm.createContext(ctx);
  vm.runInContext(`${PIECES.DEPT}\n${PIECES.BIG}\n${PIECES.NORM}\n${PIECES.ARR}\n${PIECES.DEPKEY}\n${PIECES.DEPCP}\n${PIECES.CPKEY}\n${PIECES.LABEL}\n${PIECES.NAMECODE}\n${PIECES.PARSE}\n${PIECES.KFC}\n${PIECES.TFK}\n${PIECES.DCOL}
    function setHeader(t){ __titre=t; } function visibleTechniciens(l){ return l; } function canCat(){ return false; } function techColor(){ return '#123456'; }
    function initials(n){ return String(n).charAt(0); } function esc(s){ return String(s); } function badge(o,k){ return '<span>'+o[k].l+'</span>'; } function encreSur(){ return '#fff'; }
    function $(){ return { set innerHTML(h){ __html=h; } }; }
    ${PIECES.SECT}`, ctx);
  return ctx;
}
const W = monde({ clients: [], techniciens: [], interventions: [] });
const f = (expr) => vm.runInContext(expr, W);

console.log('\n── 1302 · 1. ⛔ admin#2 : seuls 13001-13016, 69001-69009, 75001-75020 sont des arrondissements ──');
v('⛔⛔ 13100 (Aix) est le département 13, pas « Marseille 100e »', [f("cpToKey('13100')"), f("keyLabel(cpToKey('13100'))")], ['13', '13 — Bouches-du-Rhône']);
v('⛔⛔ 69100 (Villeurbanne) est le département 69, pas « Lyon 100e »', [f("cpToKey('69100')"), f("keyLabel(cpToKey('69100'))")], ['69', '69 — Rhône']);
v('⛔ 75116 (Paris 16e, code alternatif) reste Paris 16e', [f("cpToKey('75116')"), f("keyLabel(cpToKey('75116'))")], ['75016', 'Paris 16e']);
v('⛔ 13200 (Arles), 13400 (Aubagne), 69130 (Écully) : le département', [f("cpToKey('13200')"), f("cpToKey('13400')"), f("cpToKey('69130')")], ['13', '13', '69']);
v('contre-épreuve : Marseille 13001, 13002, 13016 gardent leur arrondissement', [f("keyLabel(cpToKey('13001'))"), f("keyLabel(cpToKey('13002'))"), f("keyLabel(cpToKey('13016'))")], ['Marseille 1er', 'Marseille 2e', 'Marseille 16e']);
v('contre-épreuve : 13017 (n’existe pas) et 13000 ne sont PAS des arrondissements', [f("cpToKey('13017')"), f("cpToKey('13000')")], ['13', '13']);
v('contre-épreuve : Lyon 69001, 69009 ; 69010 n’existe pas', [f("keyLabel(cpToKey('69001'))"), f("keyLabel(cpToKey('69009'))"), f("cpToKey('69010')")], ['Lyon 1er', 'Lyon 9e', '69']);
v('contre-épreuve : Paris 75001, 75020 ; 75021 n’existe pas', [f("keyLabel(cpToKey('75001'))"), f("keyLabel(cpToKey('75020'))"), f("cpToKey('75021')")], ['Paris 1er', 'Paris 20e', '75']);
v('contre-épreuve : un autre département (33000) reste le département', [f("cpToKey('33000')"), f("keyLabel(cpToKey('33000'))")], ['33', '33 — Gironde']);
v('⛔ keyLabel ne lit plus une clé à 5 chiffres qui n’est pas un arrondissement comme tel (donnée d’avant)', [f("keyLabel('13100')"), f("keyLabel('69100')")], ['13 — Bouches-du-Rhône', '69 — Rhône']);
v('le secteur d’un technicien qui tape « 13100 » couvre le département', f("parseTechDepts('13100')"), ['13']);
v('… « Marseille 13002 » garde l’arrondissement, et un technicien « 13 » couvre 13002 comme 13100',
  [f("parseTechDepts('Marseille 13002')"), f("(function(){ db.techniciens=[{id:'t',nom:'T',departements:'13'}]; return [!!techForKey('13002'), !!techForKey('13')]; })()")], [['13002'], [true, true]]);

console.log('\n── 1302 · 2. ⛔ admin#3 : la Corse (2A / 2B) et les DOM à trois chiffres ──');
v('⛔⛔ « 2A Corse-du-Sud », « 2A », « 2b » sont reconnus', [f("parseTechDepts('2A Corse-du-Sud')"), f("parseTechDepts('2A')"), f("parseTechDepts('2b')")], [['2A'], ['2A'], ['2B']]);
v('⛔⛔ « 2B », « 2B Haute-Corse » sont reconnus', [f("parseTechDepts('2B')"), f("parseTechDepts('2B Haute-Corse')")], [['2B'], ['2B']]);
v('… le nom seul aussi (déjà le cas : Haute-Corse)', f("parseTechDepts('Haute-Corse')"), ['2B']);
v('⛔⛔ les codes postaux corses : 20000 et 20100 → 2A, 20200 et 20600 → 2B', [f("cpToKey('20000')"), f("cpToKey('20199')"), f("cpToKey('20200')"), f("cpToKey('20600')")], ['2A', '2A', '2B', '2B']);
v('⛔ … et leur libellé nomme le département (plus « 20 » sans nom)', [f("keyLabel(cpToKey('20000'))"), f("keyLabel(cpToKey('20200'))")], ['2A — Corse-du-Sud', '2B — Haute-Corse']);
v('⛔ un technicien « 2A » couvre un client 20000 ; « 2B » couvre 20200 mais pas 20000',
  f("(function(){ db.techniciens=[{id:'a',nom:'A',departements:'2A Corse-du-Sud'},{id:'b',nom:'B',departements:'2B'}]; return [(techForKey(cpToKey('20000'))||{}).id, (techForKey(cpToKey('20200'))||{}).id]; })()"), ['a', 'b']);
v('… « 20000 » tapé dans le secteur d’un technicien est la Corse-du-Sud', f("parseTechDepts('20000')"), ['2A']);
v('contre-épreuve : « 21 » (Côte-d’Or), « 20 » seul = les deux départements corses', [f("parseTechDepts('21')"), f("parseTechDepts('20')").sort()], [['21'], ['2A', '2B']]);
v('⛔⛔ 971 s’affiche « 971 — Guadeloupe », pas « 97 »', [f("keyLabel(cpToKey('97100'))"), f("cpToKey('97100')")], ['971 — Guadeloupe', '971']);
v('… 972, 974, 976 aussi', [f("keyLabel(cpToKey('97200'))"), f("keyLabel(cpToKey('97400'))"), f("keyLabel(cpToKey('97600'))")], ['972 — Martinique', '974 — La Réunion', '976 — Mayotte']);
v('… le secteur « 971 Guadeloupe » d’un technicien couvre un client 97100', f("(function(){ db.techniciens=[{id:'g',nom:'G',departements:'971 Guadeloupe'}]; return [parseTechDepts('971 Guadeloupe'), (techForKey(cpToKey('97100'))||{}).id, techForKey(cpToKey('97200'))||null]; })()"), [['971'], 'g', null]);
v('… et « 97100 » tapé dans un secteur donne 971', f("parseTechDepts('97100')"), ['971']);
v('contre-épreuve : un département ordinaire n’est pas touché', [f("parseTechDepts('33, 47')"), f("parseTechDepts('75 Paris')"), f("parseTechDepts('Gironde')")], [['33', '47'], ['75'], ['33']]);

console.log('\n── 1302 · 3. ⛔ la vraie vue Secteurs montre ces libellés ──');
{ const w = monde({ clients: [{ id: 'c1', nom: 'Aix', codePostal: '13100' }, { id: 'c2', nom: 'Villeurbanne', codePostal: '69100' }, { id: 'c3', nom: 'Pointe', codePostal: '97110' }, { id: 'c4', nom: 'Ajaccio', codePostal: '20000' }, { id: 'c5', nom: 'Marseille', codePostal: '13002' }],
    techniciens: [{ id: 't1', nom: 'Ana', departements: '2A' }, { id: 't2', nom: 'Bob', departements: '' }],
    interventions: ['c1', 'c2', 'c3', 'c4', 'c5'].map((c, i) => ({ id: 'i' + i, clientId: c })) });
  vm.runInContext('views.secteurs()', w);
  const h = w.__html;
  vrai('Aix (13100) paraît « 13 — Bouches-du-Rhône », jamais « Marseille 100e »', /13 — Bouches-du-Rhône/.test(h) && !/Marseille 100e/.test(h), h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600));
  vrai('Villeurbanne (69100) paraît « 69 — Rhône », jamais « Lyon 100e »', /69 — Rhône/.test(h) && !/Lyon 100e/.test(h));
  vrai('Guadeloupe paraît « 971 — Guadeloupe »', /971 — Guadeloupe/.test(h) && !/>97 — /.test(h));
  vrai('Ajaccio (20000) est couvert par le technicien « 2A » (la ligne « 2A — Corse-du-Sud » porte son nom)', /2A — Corse-du-Sud[\s\S]{0,400}?(Ana|Couvert)/.test(h.replace(/<[^>]+>/g, ' ')) , h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 900));
  vrai('Marseille 13002 est rangé avec le département 13 (2 interventions en tout)', /2 intervention\(s\)/.test(h), h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 700)); }

console.log('\n── 1302 · 4. la carte distingue les arrondissements des départements par la CLÉ ──');
{ const i0 = SRC.indexOf('if(showSecteurs){'); const zone = SRC.slice(i0, i0 + 2600);   // (le commentaire « Grandes villes » est retiré de SRC : on vise le CODE)
  vrai('population : la zone de la carte est trouvée', i0 > 0 && /secteurs\.filter\(/.test(zone), zone.length);
  vrai('⛔ plus de BIG_CITIES[dep.slice(0,2)] dans la carte (« 13 » est maintenant un DÉPARTEMENT, il irait en cercle d’arrondissement)', !/BIG_CITIES\[String\(s\.dep\)\.slice\(0,2\)\]/.test(zone));
  vrai('⛔ … les cercles vont aux clés d’arrondissement, les contours aux autres', /filter\(s=>cleEstArrondissement\(s\.dep\)\)/.test(zone) && /filter\(s=>!cleEstArrondissement\(s\.dep\)\)/.test(zone));
  const CE = bloc('function cleEstArrondissement(');
  v('cleEstArrondissement : 5 chiffres = arrondissement, le reste non', CE ? vm.runInNewContext(CE + ";[cleEstArrondissement('13002'),cleEstArrondissement('13'),cleEstArrondissement('971'),cleEstArrondissement('2A')]", { String }) : null, [true, false, false, false]); }

console.log(`\n════ test-1302 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
