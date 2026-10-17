/* ══ g13 · PLANNING GÉNÉRAL — planning#9 (« absence en cours ») et planning#10 (compteurs du bandeau) ═══════════
   planning#9 : sous le nom d'une personne, `views.planningGeneral` écrivait « absence en cours » dès qu'une
   absence validée recoupait la PÉRIODE affichée — une absence du 20 au 21/10 vue le 16/10 passait pour déjà
   commencée, et ses heures planifiées disparaissaient du sous-titre. « En cours » ne se dit que pour une absence
   qui recoupe AUJOURD'HUI ; une absence à venir dans la période se dit « absence du 20 au 21/10 », et les heures
   restent visibles.
   planning#10 : le compteur « N interventions · N absence » partait de la liste NON filtrée : décocher Sophie
   dans « Équipe » (3 / 4) laissait « 14 interventions · 1 absence » alors que 8 étaient à l'écran. Le compteur se
   calcule sur le périmètre affiché (les personnes retenues par le filtre Équipe ET la recherche).

   Ce banc EXÉCUTE la vraie `views.planningGeneral` extraite d'app.html, dans un bac à sable (le DOM est un
   simple objet qui capte `#content`). Sondes navigateur : scratchpad/gestion/correctifs/g13/ (pgabs.js, pg2.js). */
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
const PG = bloc('views.planningGeneral=function(){'), PERS = bloc('function pgPersSet(){');
const SH = bloc('function shiftDay('), HM = bloc('function fmtHmin('), PID = bloc('function planIntDe(');
const PGL = bloc('function pgAbsLib('), IDX = SRC.indexOf('const ABS_INFO={');
console.log('\n── 1141 · 0. la population ──');
v('les fonctions sont trouvées', [PG.length > 3000, PERS.length > 100, SH.length > 40, HM.length > 40, PID.length > 40], [true, true, true, true, true]);
v('⛔ une seule définition de la vue (une seconde gagnerait partout, en silence)', SRC.split('views.planningGeneral=function(').length - 1, 1);

/* « aujourd'hui » = 16/10/2026 ; la période affichée = 7 jours à partir d'aujourd'hui (16 → 22/10). */
function monde(absences, ints, pers) {
  const content = { innerHTML: '' };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, parseInt,
    db: { techniciens: [{ id: 'tS', nom: 'Sophie Martin' }, { id: 'tK', nom: 'Karim Benali' }, { id: 'tL', nom: 'Léa Dupuis' }], absences, interventions: ints },
    __content: content, __pers: pers };
  vm.createContext(ctx);
  vm.runInContext(`
    var pgRef='', pgFiltre='tout', pgQ='', pgPers=null, pgFocus='', current='planningGeneral';
    var localStorage={ getItem(){ return null; }, setItem(){} };
    function $(){ return __content; }
    function todayISO(){ return '2026-10-16'; }
    function pgPortee(){ return 7; }
    function setHeader(){} function norm(s){ return String(s||'').toLowerCase(); }
    function visibleInts(l){ return l; }
    function esc(s){ return String(s==null?'':s); }
    function ico(){ return ''; } function initials(n){ return String(n||'').split(' ').map(x=>x[0]).join(''); }
    function techColor(){ return '#0a0'; } function fmtLong(i){ return i; }
    function fmtShort(i){ return i.slice(8)+'/'+i.slice(5,7); }
    function actAll(){ return []; } function actTitre(a){ return ''; }
    function planTechsOf(i){ return i.techIds||(i.techId?[i.techId]:[]); }
    function planCouleurDans(){ return '#0a0'; } function planBoutAutres(){ return null; } function encreSur(){ return '#fff'; }
    function clientName(){ return ''; } function pgFocusBande(){ return ''; } function pgAjuste(){}
    function setTimeout(){} var window={ addEventListener(){}, _pgResize:true };
    function absStatut(a){ return (a&&a.statut)||'validee'; } function absValidee(a){ return absStatut(a)==='validee'; }
    function absInfo(t){ return { l: t==='maladie'?'Maladie':'Congés payés', c:'#c80' }; }
    const document={ getElementById(){ return null; } };
    var views={};
    ${PERS.replace('pgPers=new Set(Array.isArray(sauv)?sauv.filter(x=>connus.indexOf(x)>=0):connus);', 'pgPers=new Set(__pers||connus);')}
    ${SH}
    ${HM}
    ${PID}
    ${PGL}
    ${bloc('function techAssignable(t){')}\n${bloc('function techsAffichees(jours){')}\n${bloc('function intTechIds(i){')}   /* 17 oct. 2026 : les lignes du Planning général lisent la règle des comptes désactivés (jouée par test-1820) */
    ${PG}`, ctx);
  return ctx;
}
const sousTitres = html => [...html.matchAll(/<b>([^<]*)<\/b><small>([^<]*)<\/small>/g)].map(m => [m[1], m[2]]);
const abs = (id, techId, du, au, extra) => Object.assign({ id, techId, type: 'maladie', du, au, statut: 'validee' }, extra || {});
const int = (id, techId, date, duree) => ({ id, techId, date, heure: '09:00', duree: duree || 60, titre: 'Passage ' + id, statut: 'planifiee' });

console.log('\n── 1141 · 1. ⛔ planning#9 — « absence en cours » ──');
{ const W = monde([abs('a1', 'tK', '2026-10-20', '2026-10-21')], [], null);
  W.views.planningGeneral();
  const st = Object.fromEntries(sousTitres(W.__content.innerHTML));
  v('⛔⛔ une absence du 20 au 21/10 vue le 16/10 n\'est PAS « en cours »', /en cours/.test(st['Karim Benali']), false);
  vrai('… elle se dit avec ses dates : « absence du 20 au 21/10 »', st['Karim Benali'] === 'absence du 20 au 21/10', st['Karim Benali']);
  v('contre-épreuve : une personne sans absence reste « libre »', st['Sophie Martin'], 'libre'); }
{ const W = monde([abs('a1', 'tK', '2026-10-15', '2026-10-17')], [], null);
  W.views.planningGeneral();
  const st = Object.fromEntries(sousTitres(W.__content.innerHTML));
  v('⛔ contre-épreuve : une absence qui recoupe AUJOURD\'HUI (15 → 17/10) est bien « en cours »', st['Karim Benali'], 'absence en cours'); }
{ const W = monde([abs('a1', 'tK', '2026-10-20', '2026-10-20')], [int('i1', 'tK', '2026-10-17', 90), int('i2', 'tK', '2026-10-19', 30)], null);
  W.views.planningGeneral();
  const st = Object.fromEntries(sousTitres(W.__content.innerHTML));
  vrai('⛔ les heures planifiées ne disparaissent pas du sous-titre (2h + « absence le 20/10 »)', /2h/.test(st['Karim Benali']) && /absence le 20\/10/.test(st['Karim Benali']), st['Karim Benali']); }
{ const W = monde([abs('a1', 'tK', '2026-10-15', '2026-10-30', { statut: 'attente' })], [], null);
  W.views.planningGeneral();
  v('contre-épreuve : une demande EN ATTENTE ne dit rien (seules les validées bloquent le planning)', Object.fromEntries(sousTitres(W.__content.innerHTML))['Karim Benali'], 'libre'); }
{ const W = monde([abs('a1', 'tK', '2026-10-30', '2026-11-02')], [], null);
  W.views.planningGeneral();
  v('contre-épreuve : une absence HORS de la période (30/10) ne dit rien', Object.fromEntries(sousTitres(W.__content.innerHTML))['Karim Benali'], 'libre'); }

/* relecture planning#9 : « en cours » exige aussi que la période AFFICHÉE contienne aujourd'hui. */
{ const W = monde([abs('a1', 'tK', '2026-10-16', '2026-10-16')], [], null);
  vm.runInContext('pgRef="2026-10-26"', W);
  W.views.planningGeneral();
  const st = Object.fromEntries(sousTitres(W.__content.innerHTML));
  v('⛔⛔ une absence d\'aujourd\'hui seul (16/10), vue la semaine du 26/10 au 01/11 : « libre », pas « en cours »', st['Karim Benali'], 'libre'); }
{ const W = monde([abs('a1', 'tK', '2026-10-16', '2026-10-28')], [], null);
  vm.runInContext('pgRef="2026-10-26"', W);
  W.views.planningGeneral();
  const st = Object.fromEntries(sousTitres(W.__content.innerHTML));
  vrai('une absence qui a commencé avant et court dans la période affichée : pas « en cours » (aujourd\'hui n\'y est pas), elle se dit avec ses dates', !/en cours/.test(st['Karim Benali']) && /absence du/.test(st['Karim Benali']), st['Karim Benali']); }
{ const W = monde([abs('a1', 'tK', '2026-10-16', '2026-10-16')], [], null);
  vm.runInContext('pgRef="2026-10-12"', W);
  W.views.planningGeneral();
  v('contre-épreuve : la même absence vue la semaine du 12/10 (qui contient aujourd\'hui) est « en cours »', Object.fromEntries(sousTitres(W.__content.innerHTML))['Karim Benali'], 'absence en cours'); }

console.log('\n── 1141 · 2. ⛔ planning#10 — les compteurs du bandeau suivent le périmètre filtré ──');
const compteurs = html => { const m = html.match(/(\d+) intervention(?:s)?<i[^>]*><\/i>(\d+) absence/); return m ? [+m[1], +m[2]] : null; };
const INTS = [int('i1', 'tS', '2026-10-17'), int('i2', 'tS', '2026-10-18'), int('i3', 'tK', '2026-10-17'), int('i4', 'tL', '2026-10-19'), int('i5', 'tL', '2026-10-20'), int('i6', 'tL', '2026-10-21'),
  int('i7', '', '2026-10-17'), int('i8', 'tK', '2026-11-20')];
const ABSS = [abs('a1', 'tS', '2026-10-17', '2026-10-17'), abs('a2', 'tK', '2026-10-20', '2026-10-21'), abs('a3', 'tK', '2026-12-01', '2026-12-02')];
{ const W = monde(ABSS, INTS, null);
  W.views.planningGeneral();
  v('tout le monde coché : 7 interventions de la période (la 8ᵉ est en novembre), 2 absences', compteurs(W.__content.innerHTML), [7, 2]); }
{ const W = monde(ABSS, INTS, ['tK', 'tL', '']);
  W.views.planningGeneral();
  v('⛔⛔ Sophie décochée : ses 2 interventions et son absence ne comptent plus (5 interventions, 1 absence)', compteurs(W.__content.innerHTML), [5, 1]); }
{ const W = monde(ABSS, INTS, ['tS']);
  W.views.planningGeneral();
  v('⛔ Sophie seule : 2 interventions, 1 absence', compteurs(W.__content.innerHTML), [2, 1]); }
{ const ints = [{ id: 'm1', techIds: ['tS', 'tK'], date: '2026-10-17', heure: '09:00', duree: 60, titre: 'Mission à deux', statut: 'planifiee' }];
  const W = monde([], ints, ['tS', 'tK']);
  W.views.planningGeneral();
  v('une intervention partagée entre deux personnes affichées ne compte qu\'UNE fois', compteurs(W.__content.innerHTML), [1, 0]); }
{ const W = monde(ABSS, INTS, null);
  W.pgQ = 'karim';
  vm.runInContext('pgQ="karim"', W);
  W.views.planningGeneral();
  v('⛔ la recherche « karim » restreint aussi le compteur (ses 1 intervention de la période et ses 1 absence en période)', compteurs(W.__content.innerHTML), [1, 1]); }

console.log(`\n════ test-1141 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
