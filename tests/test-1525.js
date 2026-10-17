/* ══ SECTEURS — UN DÉPARTEMENT DONT UN ARRONDISSEMENT EST COUVERT N'EST PAS « NON COUVERT » ══════════════════════
   Lot i03 (17 octobre 2026), bug r3#15. « Départements (données) » regroupe les interventions par DÉPARTEMENT
   (clé « 13 », « 75 ») puis demandait techForKey('13') : un technicien qui couvre « 13001 Marseille » porte la clé
   à 5 chiffres '13001', pas '13' — la ligne disait « 13 — Bouches-du-Rhône · 2 intervention(s) · Non couvert »
   alors que techForClient donnait bien Marc Marseille pour ces clients.
   ⛔ Ce qu'on NE change PAS : techForKey. Il sert aussi l'affectation automatique d'un client (techForClient) :
   un client d'Aix (13100 → clé « 13 ») ne doit pas être confié au technicien de Marseille 1er. Seule la ligne du
   département apprend à dire « couvert en partie ». Le banc EXÉCUTE la vraie views.secteurs, avec les vraies
   fonctions de clés (cpToKey, parseTechDepts, keyForClient, techForKey…).                                       */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const FNS = ['function cpEstArrondissement(', 'function depDeKey(', 'function depFromCp(', 'function cpToKey(', 'function keyLabel(', 'function deptCodeFromName(',
  'function parseTechDepts(', 'function keyForClient(', 'function techForClient(', 'function techForKey(', 'function techCouvrantEnPartie(', 'function deptColor('];
const NOMS = ligne('const DEPT_NAMES='), BIG = ligne('const BIG_CITIES=');
const SECT = bloc('views.secteurs=function(){');
vrai('(population) views.secteurs et les fonctions de clés sont trouvées', SECT.length > 1500 && !!NOMS && !!BIG && bloc('function cpToKey(').length > 50 && bloc('function techForKey(').length > 50);

function monde(techs, clients, ints, vues) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, __html: '',
    db: { techniciens: techs, clients, interventions: ints } };
  vm.createContext(ctx);
  const defs = FNS.map(f => bloc(f)).filter(Boolean);
  vm.runInContext(`${NOMS}\n${BIG}\n${defs.join('\n')}\n${ligne('function cleEstArrondissement(')}
    var norm=function(s){ return String(s||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().trim(); };
    function setHeader(){} function esc(s){ return String(s==null?'':s); } function initials(n){ return String(n).slice(0,2); }
    function techColor(){ return '#2d6a4f'; } function encreSur(){ return '#fff'; } function badge(m,k){ return '<span class="st st-green">'+m[k].l+'</span>'; }
    function visibleTechniciens(l){ return l.filter(t=>${JSON.stringify(vues || null)}===null || ${JSON.stringify(vues || null)}.includes(t.id)); }
    function canCat(){ return false; } var $=function(){ return { set innerHTML(v){ __html=v; } }; };
    var views={}; ${SECT}`, ctx);
  ctx.views.secteurs();
  return ctx;
}
const ligneDe = (h, dep) => h.split('<div class="pl-row" style="cursor:default">').find(seg => new RegExp('^<span[^>]*>' + dep + '</span>').test(seg)) || '';
const clients = [
  { id: 'v6', nom: 'Marseille 1er', codePostal: '13001' }, { id: 'v7', nom: 'Paris 8e', codePostal: '75008' }, { id: 'v8', nom: 'Aix', codePostal: '13100' },
  { id: 'v9', nom: 'Nantes', codePostal: '44000' }];
const ints = [{ id: 'i1', clientId: 'v6' }, { id: 'i2', clientId: 'v6' }, { id: 'i3', clientId: 'v7' }, { id: 'i4', clientId: 'v8' }, { id: 'i5', clientId: 'v9' }];
const techs = [{ id: 'T1', nom: 'Marc Marseille', departements: '13001 Marseille' }, { id: 'T2', nom: 'Pia Paris', departements: '75008' }, { id: 'T3', nom: 'Nora Nantes', departements: '44' }];

console.log('— le scénario du testeur');
{ const W = monde(techs, clients, ints); const h = W.__html;
  const l13 = ligneDe(h, '13'), l75 = ligneDe(h, '75'), l44 = ligneDe(h, '44');
  vrai('(population) les trois lignes de département sont là', !!l13 && !!l75 && !!l44, h.length);
  vrai('⛔ 13 (Marc couvre 13001) : plus « Non couvert »', !/Non couvert/.test(l13), l13);
  vrai('… et la ligne le dit : couvert en partie, par Marc Marseille', /Marc Marseille/.test(l13) && /en partie/.test(l13), l13);
  vrai('⛔ 75 (Pia couvre 75008) : plus « Non couvert »', !/Non couvert/.test(l75) && /Pia Paris/.test(l75), l75);
  vrai('44 (département entier) : le nom, sans « en partie »', /Nora Nantes/.test(l44) && !/en partie/.test(l44), l44); }

console.log('— ce qui reste vrai');
{ const W = monde([techs[2]], clients, ints); const l13 = ligneDe(W.__html, '13');
  vrai('aucun technicien en 13 : « Non couvert » reste', /Non couvert/.test(l13), l13); }
{ const W = monde([techs[0]], clients, ints); const l13 = ligneDe(W.__html, '13'); const l75 = ligneDe(W.__html, '75');
  vrai('Marc ne couvre pas Paris : 75 reste « Non couvert »', /Non couvert/.test(l75), l75);
  vrai('(témoin) 13 est couvert en partie', !/Non couvert/.test(l13), l13);
  vrai('⛔ techForKey n\'est PAS élargi : un client d\'Aix (13100, clé « 13 ») n\'est pas confié à Marc (13001)',
    vm.runInContext("techForClient('v8')", W) === undefined && vm.runInContext("techForClient('v6')", W).id === 'T1', 0); }
{ const W = monde(techs, clients, ints, ['T2']); const l13 = ligneDe(W.__html, '13');
  vrai('un technicien hors du périmètre : « Couvert en partie » sans son nom (la règle de la v735)', !/Marc Marseille/.test(l13) && /Couvert en partie/.test(l13) && !/Non couvert/.test(l13), l13); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
