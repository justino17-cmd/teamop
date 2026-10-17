/* ══ k01 · r5#5 (relecture) — MESSAGERIE SUR ÉCRAN COURT : LA CONVERSATION SE MONTRE À L'OUVERTURE ═════════════════════
   Le correctif du 3343a875 donne à la liste l'écran entier sous 420 px de haut, mais le haut de page (200 à 230 px, 75 de plus avec
   « Reprendre ») passe avant elle : à scroll 0 elle ne paraissait que de 0 à 72 px (36 px à 667×375, 0 avec « Reprendre »). La
   sonde et le banc 1631 ne regardaient que la hauteur de la liste, ou une page DÉJÀ défilée. Remède : `msgAmener()` amène la page
   en bas (là où la liste finit juste au-dessus de la rangée de saisie) à l'ENTRÉE dans la rubrique — `remonter` vrai dans
   `rendreVueSure`, après `multiProposer` — et quand on choisit une conversation (pastille). Jamais sur le rafraîchissement
   (même `views.messagerie()` rappelée par un enregistrement ou une minuterie : la personne garde sa place) ni hors écran court.
   Ce banc EXÉCUTE les vraies `msgAmener` et `rendreVueSure` ; le comportement entier fait foi dans la sonde navigateur
   scratchpad/gestion/correctifs/k01/ouverture.js (visible À L'OUVERTURE, sans aucun défilement, 6 gabarits × avec/sans Reprendre). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
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
const AM = bloc('function msgAmener(){'), FC = bloc('function msgFinCachee(){'), RV = bloc('function rendreVueSure(view,remonter){'), VUE = bloc('views.messagerie=function(){');

console.log('\n── 1633 · 0. la population ──');
/* (r6) le test « la fin de la conversation est-elle cachée ? » vit dans `msgFinCachee`, partagé avec la rotation (`msgTourner`, test-1660) */
vrai('msgAmener, msgFinCachee, rendreVueSure et la vue sont trouvées', AM.length > 200 && FC.length > 150 && RV.length > 800 && VUE.length > 3000, [AM.length, FC.length, RV.length, VUE.length]);
v('⛔ une seule définition de msgAmener et de rendreVueSure (une seconde gagnerait partout, en silence)', ['function msgAmener(', 'function rendreVueSure('].map(n => SRC.split(n).length - 1), [1, 1]);

/* un faux monde : la liste a un bas, la rangée de saisie (collée) et la barre d'onglets un haut ; la fenêtre note ses scrollTo (qui bougent
   scrollY, comme un navigateur) et tire à la main les images d'animation */
function monde(o) {
  const ap = [], raf = [];
  const rect = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) });
  const els = { 'msg-list': rect(o.listeHaut || 300, o.listeBas), 'msg-saisie': rect(o.rangeeHaut, o.rangeeHaut + 60) };
  if (o.onglets) els['tabbar'] = Object.assign(rect(o.onglets, o.onglets + 60), { style: 'ong' });
  const win = { scrollY: 0, scrollTo: (x, y) => { ap.push([x, y]); win.scrollY = y; } };
  const ctx = { console, current: o.current || 'messagerie', document: { documentElement: { scrollHeight: 1234 } }, window: win,
    getComputedStyle: e => ({ display: e === els['tabbar'] && o.ongletsCache ? 'none' : 'flex' }),
    requestAnimationFrame: f => { raf.push(f); return raf.length; }, $: id => els[id] || null };
  ctx.__ap = ap; ctx.__raf = raf; ctx.__win = win;
  ctx.__images = () => { while (raf.length) raf.shift()(); };
  vm.createContext(ctx); vm.runInContext(FC + '\n' + AM, ctx); return ctx;
}
const run = (code, c) => { try { return vm.runInContext(code, c); } catch (e) { return 'ERREUR ' + e.message; } };

console.log('\n── 1633 · 1. msgAmener EXÉCUTÉE — elle se décide sur ce qui est CACHÉ, pas sur la taille de l\'écran ──');
{
  /* 667×375 : liste 201→412, rangée collée à 237 : le bas de la liste est sous la rangée */
  const c = monde({ listeBas: 412, rangeeHaut: 237, onglets: 299 });
  v('liste cachée par la rangée collée : elle agit (rend vrai)', run('msgAmener()', c), true);
  v('⛔ la page est amenée tout en bas, tout de suite (scrollHeight)', c.__ap, [[0, 1234]]);
  c.__images();
  v('… et reprise UNE fois après deux images (la mesure de msgAjuster, l\'entrée de la page)', c.__ap, [[0, 1234], [0, 1234]]);
}
{
  const c = monde({ listeBas: 412, rangeeHaut: 237 }); run('msgAmener()', c); c.__win.scrollY = 90;   // la personne a défilé entre-temps
  c.__images(); v('⛔ la reprise ne tire pas la page sous le doigt de la personne qui a déjà défilé', c.__ap.length, 1);
}
{
  /* 375×667 + « Reprendre » : liste 434→574, rangée 529 : 45 px sous la rangée, sans qu'aucune media query « court » ne le dise */
  const c = monde({ listeHaut: 434, listeBas: 574, rangeeHaut: 529, onglets: 591 });
  v('⛔ un téléphone DEBOUT de 667 px avec « Reprendre » : la liste est sous la rangée, elle agit aussi', run('msgAmener()', c), true);
}
{
  /* sous la barre d'onglets seule (rangée plus bas) */
  const c = monde({ listeBas: 600, rangeeHaut: 640, onglets: 590 });
  v('liste sous la barre d\'onglets seule : elle agit', run('msgAmener()', c), true);
  const d = monde({ listeBas: 600, rangeeHaut: 640, onglets: 590, ongletsCache: true });
  v('… mais une barre d\'onglets MASQUÉE (iPad, Mac) ne compte pas', run('msgAmener()', d), false);
}
{
  /* 390×844 sans barre : liste 390→654, rangée 672 ; Mac : rangée sous la liste dans le flux */
  const c = monde({ listeHaut: 390, listeBas: 654, rangeeHaut: 672, onglets: 734 });
  v('liste entière au-dessus de la rangée (téléphone debout, Mac, iPad) : elle ne fait RIEN', [run('msgAmener()', c), c.__ap.length, c.__raf.length], [false, 0, 0]);
  const m = monde({ listeBas: 700, rangeeHaut: 704 });
  v('à 4 px près : une marge de mesure n\'est pas un recouvrement', [run('msgAmener()', m), m.__ap.length], [false, 0]);
}
{
  const c = monde({ listeBas: 412, rangeeHaut: 237, current: 'planning' });
  v('une autre rubrique : rien', [run('msgAmener()', c), c.__ap.length], [false, 0]);
  const d = monde({ listeBas: 412, rangeeHaut: 237 }); run('msgAmener()', d); run('current="planning"', d); const n = d.__ap.length; d.__images();
  v('⛔ la rubrique quittée entre-temps : la reprise ne tire pas la page de la nouvelle rubrique', d.__ap.length, n);
}
{
  const c = monde({ listeBas: 412, rangeeHaut: 237 }); c.__win.scrollTo = () => { throw new Error('boum'); };
  v('un scrollTo qui jette ne casse pas la vue (rend faux)', run('msgAmener()', c), false);
  const d = monde({ listeBas: 412, rangeeHaut: 237 }); d.$ = () => null;
  v('sans liste (vue pas encore écrite) : faux, sans exception', run('msgAmener()', d), false);
}

console.log('\n── 1633 · 2. rendreVueSure : seulement à l\'entrée, après multiProposer ──');
function vueMonde(view, remonter, courte) {
  const trace = [];
  const ctx = { console, currentUser: { id: 'u' }, __t: trace,
    views: { messagerie() { trace.push('vue'); }, planning() { trace.push('vue'); } },
    $: () => ({ scrollTop: 0, innerHTML: '' }), window: { scrollTo: () => {} },
    multiProposer: () => trace.push('multi'), msgAmener: () => { trace.push('amener'); return true; },
    segInit: () => {}, segObserver: () => {}, kpiTailler: () => {} };
  vm.createContext(ctx); vm.runInContext(RV, ctx); run(`rendreVueSure('${view}',${remonter})`, ctx); return trace;
}
v('entrée dans la messagerie : vue, barre de reprise, PUIS amener', vueMonde('messagerie', true), ['vue', 'multi', 'amener']);
v('⛔ rafraîchissement (remonter faux) : on ne bouge pas la page', vueMonde('messagerie', false), ['vue', 'multi']);
v('une autre rubrique : jamais', vueMonde('planning', true), ['vue', 'multi']);

console.log('\n── 1633 · 3. la pastille d\'une conversation ──');
vrai('⛔ la pastille amène la conversation choisie (dans le code, pas dans une phrase)', /onclick="msgSel='\$\{tab\.k\}';views\.messagerie\(\);msgAmener\(\)"/.test(VUE), VUE.slice(VUE.indexOf('onclick="msgSel'), VUE.indexOf('onclick="msgSel') + 90));
vrai('le rafraîchissement par envoi d\'un message ne l\'appelle pas (envoyerMsg garde la place)', !/function envoyerMsg\(\)[^\n]*msgAmener/.test(SRC) && !/msgAmener/.test(bloc('function envoyerMsg(')));
/* (r6, re-test final) un troisième appelant, voulu : `msgTourner`, quand l'appareil TOURNE et que la page était en bas (test-1660) — jamais sur un rafraîchissement */
v('msgAmener n\'est appelée que par la pastille, rendreVueSure et la rotation', (SRC.match(/msgAmener\(\)/g) || []).length - 1, 3);
vrai('…et la rotation ne l\'appelle que si la largeur a changé ET que la fin de la conversation se voyait', /if\(tourne&&vue&&current==='messagerie'\)[^\n]*msgAmener\(\)/.test(SRC));

console.log(`\n════ test-1633 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
