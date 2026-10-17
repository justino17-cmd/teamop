/* ══ g14 · accueil#2 — CHANGER DE RUBRIQUE REMET L'ÉCRAN EN HAUT ═══════════════════════════════════════
   Mesuré : Paramètres défilé à 2 500 px, on touche « Accueil » : le tableau de bord s'ouvrait à scrollY=1080 ; sur Mac,
   Clients s'ouvrait à 2 500 px sur 13 888. Ni go() ni rendreVueSure() ne remettaient jamais l'écran en haut.
   La règle : à une VRAIE navigation (view !== current), l'écran revient en haut APRÈS le rendu de la vue — mais
   · PAS lors de go(current) (rafraîchissement après un enregistrement : on garde sa place) ;
   · PAS au détriment de la reprise du multitâche (`multiProposer` rend e.y d'une fenêtre laissée en route).
   Ce banc EXÉCUTE les vraies go(), rendreVueAnimee() et rendreVueSure() (sans transition de vue : le chemin des
   « animations réduites », qui rend de façon synchrone) avec un #content qui défile et une fenêtre qui défile.    */
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
console.log('\n── 1211 · 0. la population ──');
const GO = bloc('function go(view){'), RVA = bloc('function rendreVueAnimee('), RVS = bloc('function rendreVueSure(');
vrai('go, rendreVueAnimee et rendreVueSure sont trouvées', GO.length > 1500 && RVA.length > 250 && RVS.length > 400, [GO.length, RVA.length, RVS.length]);
vrai('⛔ une seule définition de chacune', ['function go(view){', 'function rendreVueAnimee(', 'function rendreVueSure('].every(n => SRC.split(n).length === 2));

function monde(depart) {
  const content = { scrollTop: 0, scrollHeight: 9000, clientHeight: 800, innerHTML: '', classList: { toggle() {}, add() {}, remove() {} } };
  const journal = [];
  const win = { scrollY: 0, scrollTo(x, y) { this.scrollY = y; journal.push('scrollTo ' + y); }, matchMedia: () => ({ matches: false }) };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, setTimeout: f => 0, clearTimeout() {},
    __content: content, __journal: journal, scrollY: 0,
    document: { startViewTransition: undefined, getElementById: () => ({ classList: { remove() {}, toggle() {} } }), querySelectorAll: () => [],
      documentElement: { classList: { add() {}, remove() {} } } },
    history: { replaceState() {} }, currentUser: { id: 'u', role: 'admin' }, window: win, matchMedia: () => ({ matches: true }), // animations réduites : rendu synchrone
    NAV: [], $: id => id === 'content' ? content : { classList: { remove() {}, toggle() {} }, innerHTML: '' } };
  win.window = win; ctx.window = win;
  vm.createContext(ctx);
  vm.runInContext(`
    var current=${JSON.stringify(depart)}, _ecranRendu=null, _sensForce='', _modalForcee=false, VUE_PARENT={}, VUES_RETIREES={};
    var views={ parametres(){ $('content').innerHTML='p'; }, clients(){ $('content').innerHTML='c'; }, dashboard(){ $('content').innerHTML='d'; } };
    var __reprise=null;
    function multiCapturer(){} function accesSuspendu(){ return false; } function usageNote(){} function closeModal(){}
    function planPleinQuitteSiBesoin(){} function planDispReset(){} function placerGlisse(){} function multiPastilles(){}
    function ongletsActif(){} function updateBell(){} function segInit(){} function segObserver(){} function kpiTailler(){} function compterKpi(){}
    function canSee(){ return true; } function userSeesModule(){ return true; } function toast(){}
    function multiProposer(v){ if(__reprise!==null) $('content').scrollTop=__reprise; }
    function rendreDirige(sens,rendu){ rendu(); }
    ${GO}\n${RVA}\n${RVS}`, ctx);
  return ctx;
}
const place = W => ({ contenu: W.__content.scrollTop, fenetre: W.window.scrollY });

console.log('\n── 1211 · une vraie navigation remet l\'écran en haut ──');
{ const W = monde('parametres'); W.__content.scrollTop = 2500; W.window.scrollY = 1080;
  W.go('clients');
  const p = place(W);
  vrai('Paramètres défilé → Clients : #content est remonté à 0', p.contenu === 0, p);
  vrai('… et la fenêtre aussi (sur mobile c\'est la PAGE qui défile)', p.fenetre === 0, p);
  vrai('la vue a bien été rendue (population non vide)', W.__content.innerHTML === 'c', W.__content.innerHTML); }
{ const W = monde('parametres'); W.__content.scrollTop = 900; W.window.scrollY = 0;
  W.go('dashboard');
  vrai('Paramètres → Accueil : en haut', W.__content.scrollTop === 0 && W.window.scrollY === 0, place(W)); }

console.log('\n── 1211 · un rafraîchissement GARDE sa place ──');
{ const W = monde('clients'); W.__content.scrollTop = 2500; W.window.scrollY = 1300;
  W.go('clients');
  const p = place(W);
  vrai('go(current) (rafraîchissement après enregistrement) : #content garde sa place', p.contenu === 2500, p);
  vrai('… et la fenêtre aussi', p.fenetre === 1300, p); }

console.log('\n── 1211 · la reprise du multitâche garde son défilement ──');
{ const W = monde('parametres'); W.__content.scrollTop = 2500; W.eval = null;
  vm.runInContext('__reprise=700', W);
  W.go('clients');
  vrai('une vue laissée en route à 700 px y revient (multiProposer passe APRÈS la remise en haut)', W.__content.scrollTop === 700, place(W)); }

console.log('\n── 1211 · l\'ordre : en haut APRÈS le rendu de la vue ──');
{ const W = monde('parametres'); W.__content.scrollTop = 2500;
  vm.runInContext('views.clients=function(){ $("content").innerHTML="c"; __vu=$("content").scrollTop; }', W);
  W.go('clients');
  vrai('la remise en haut vient après l\'écriture de la vue (sinon une vue plus courte réécrit un défilement périmé)', W.__content.scrollTop === 0 && W.__content.innerHTML === 'c', place(W)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
