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
const RDI = bloc('function rendreDirige('), VTT = bloc('function vtTaire(');
const GO = bloc('function go(view){'), RVA = bloc('function rendreVueAnimee('), RVS = bloc('function rendreVueSure(');
vrai('go, rendreVueAnimee et rendreVueSure sont trouvées', GO.length > 1500 && RVA.length > 250 && RVS.length > 400, [GO.length, RVA.length, RVS.length]);
vrai('rendreDirige et vtTaire (le chemin des transitions de vue) sont trouvées', RDI.length > 300 && VTT.length > 150, [RDI.length, VTT.length]);
vrai('⛔ une seule définition de chacune', ['function go(view){', 'function rendreVueAnimee(', 'function rendreVueSure('].every(n => SRC.split(n).length === 2));

function monde(depart, avecTransition) {
  const content = { scrollTop: 0, scrollHeight: 9000, clientHeight: 800, innerHTML: '', classList: { toggle() {}, add() {}, remove() {} } };
  const journal = [];
  const win = { scrollY: 0, scrollTo(x, y) { this.scrollY = y; journal.push('scrollTo ' + y); }, matchMedia: () => ({ matches: false }) };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, setTimeout: f => 0, clearTimeout() {},
    __content: content, __journal: journal, scrollY: 0,
    __vt: [],
    document: { startViewTransition: avecTransition ? function (cb) { ctx.__vt.push(cb); const p = Promise.resolve(); return { ready: p, finished: p, updateCallbackDone: p }; } : undefined, getElementById: () => ({ classList: { remove() {}, toggle() {} } }), querySelectorAll: () => [],
      documentElement: { classList: { add() {}, remove() {} } } },
    history: { replaceState() {} }, currentUser: { id: 'u', role: 'admin' }, window: win, matchMedia: () => ({ matches: !avecTransition }), // animations réduites : rendu synchrone ; sinon le rendu est DIFFÉRÉ (startViewTransition)
    NAV: [], $: id => id === 'content' ? content : { classList: { remove() {}, toggle() {} }, innerHTML: '' } };
  win.window = win; ctx.window = win; win.matchMedia = ctx.matchMedia;
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
    ${avecTransition ? VTT + '\n' + RDI : 'function rendreDirige(sens,rendu){ rendu(); }'}
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

console.log('\n── 1211 · ⛔ changer de rubrique ne passe plus par une transition de vue (audit apple-design, test-2833) ──');
// Pendant une transition de vue, le document entier est inerte : changer de rubrique, sans sens de déplacement, n'en a plus.
const jouerTransition = W => { const f = W.__vt.splice(0); f.forEach(cb => cb()); return f.length; };
{ const W = monde('parametres', true); W.__content.scrollTop = 2500; W.window.scrollY = 1080;
  W.go('clients');
  vrai('population : startViewTransition existe, et aucune transition n’est ouverte pour un changement de rubrique', typeof W.document.startViewTransition === 'function' && W.__vt.length === 0, W.__vt.length);
  const p = place(W);
  vrai('l’écran est rendu tout de suite, et remis en haut', p.contenu === 0 && p.fenetre === 0 && W.__content.innerHTML === 'c', p); }

console.log('\n── 1211 · ⛔ le chemin DIFFÉRÉ : une navigation qui a un sens (balayage d’onglet, retour) ──');
// Celle-là garde sa poussée : la vue s'écrit PLUS TARD, dans le rappel de startViewTransition, hors de go().
{ const W = monde('parametres', true); W.__content.scrollTop = 2500; W.window.scrollY = 1080;
  vm.runInContext("_sensForce='avant'", W);
  W.go('clients');
  vrai('population : la transition est bien OUVERTE et le rendu pas encore joué', W.__vt.length === 1 && W.__content.innerHTML === '', W.__vt.length);
  vrai('… l\'écran n\'a pas encore bougé', place(W).contenu === 2500, place(W));
  jouerTransition(W);
  const p = place(W);
  vrai('le rendu différé remet #content en haut', p.contenu === 0 && W.__content.innerHTML === 'c', p);
  vrai('… et la fenêtre aussi', p.fenetre === 0, p); }
{ const W = monde('clients', true); W.__content.scrollTop = 2500; W.window.scrollY = 1300;
  vm.runInContext("_sensForce='avant'", W);
  W.go('clients'); jouerTransition(W);
  vrai('chemin différé : un rafraîchissement go(current) GARDE sa place', place(W).contenu === 2500 && place(W).fenetre === 1300, place(W)); }
{ const W = monde('parametres', true); W.__content.scrollTop = 2500; vm.runInContext('__reprise=700', W);
  vm.runInContext("_sensForce='avant'", W);
  W.go('clients'); jouerTransition(W);
  vrai('chemin différé : la reprise du multitâche garde son défilement', W.__content.scrollTop === 700, place(W)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
