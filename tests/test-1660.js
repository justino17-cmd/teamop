/* ══ OP GESTION — MESSAGERIE : TOURNER L'APPAREIL NE CACHE PLUS LA CONVERSATION (re-test final, 17 octobre 2026) ═══════════════════════════════════
   Le re-test au navigateur (64 configurations, puis un second agent chargé de le réfuter) : entrée dans la Messagerie en portrait, la page amenée en bas par
   `msgAmener` — puis le passage en paysage GARDAIT `scrollY`. La liste, raccourcie, passait sous la rangée de saisie collée : 129 à 236 px de la dernière bulle
   cachés, 0 à 70 px de conversation visibles, jusqu'à ce qu'on pousse la page. Le défaut existait avant k01 (90 à 121 px).
   `msgTourner` (écouteur de `resize` et `orientationchange`) : si la LARGEUR change (une rotation — une barre d'outils qui se replie ou le clavier ne changent que
   la hauteur) ET que la page était en bas avant, elle y retourne par `msgAmener`. Si la personne était remontée lire les pastilles, sa place est gardée.
   Ce banc EXÉCUTE la vraie `msgTourner` et `msgPageEnBas`, avec une fenêtre simulée ; le comportement au navigateur fait foi dans la sonde
   scratchpad/gestion/correctifs/r6/sonde-rotation.js (session du 17 octobre 2026). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const c = JSON.stringify(a) === JSON.stringify(b); c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + JSON.stringify(a) + ' au lieu de ' + JSON.stringify(b))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const bloc = debut => { const i = SRC.indexOf(debut); if (i < 0) return ''; let n = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') n++; else if (SRC[k] === '}') { n--; if (!n) return SRC.slice(i, k + 1); } } return ''; };

const TOURNER = bloc('function msgTourner(){'), BAS = ligne('function msgPageEnBas(){'), ETAT = ligne('let _msgLargeur=');
console.log('\n── 1660 · 1. la population ──');
vrai('msgTourner, msgPageEnBas et leur état sont trouvés dans le fichier réel', TOURNER.length > 100 && BAS.length > 40 && ETAT.length > 10, [TOURNER.length, BAS.length, ETAT.length]);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', ['function msgTourner(', 'function msgPageEnBas('].map(n => SRC.split(n).length - 1), [1, 1]);
vrai('les écouteurs de la fenêtre sont msgTourner (resize ET orientationchange), plus msgAjusterPlus', /addEventListener\('resize',msgTourner\);\s*window\.addEventListener\('orientationchange',msgTourner\);/.test(SRC) && !/addEventListener\('resize',msgAjusterPlus\)/.test(SRC));
vrai('le défilement de la page tient « en bas » à jour (et seulement dans la messagerie)', /addEventListener\('scroll',\(\)=>\{ if\(current==='messagerie'\) _msgPageBas=msgPageEnBas\(\); \},\{passive:true\}\)/.test(SRC));

/* un monde : une fenêtre, une page, et ce que msgTourner appelle */
function monde(o) {
  const w = { innerWidth: o.l, innerHeight: o.h, scrollY: o.y || 0, ecouteurs: {} };
  const ctx = { window: w, document: { documentElement: { scrollHeight: o.page } }, current: o.vue || 'messagerie', __amene: 0, __ajuste: 0,
    requestAnimationFrame: f => { f(); return 1; }, msgAmener: () => { ctx.__amene++; return true; }, msgAjusterPlus: () => { ctx.__ajuste++; } };
  vm.createContext(ctx);
  vm.runInContext(ETAT + '\n' + BAS + '\n' + TOURNER + '\nthis.F = { msgTourner, msgPageEnBas, etat: () => ({ l: _msgLargeur, bas: _msgPageBas }), poser: (l, b) => { _msgLargeur = l; _msgPageBas = b; } };', ctx);
  return ctx;
}
console.log('\n── 1660 · 2. msgPageEnBas EXÉCUTÉE ──');
{
  const c = monde({ l: 375, h: 667, page: 742, y: 75 });
  v('page en bas (75 + 667 = 742) : vrai', c.F.msgPageEnBas(), true);
  c.window.scrollY = 0;
  v('page en haut : faux', c.F.msgPageEnBas(), false);
  c.window.scrollY = 72;
  v('à 3 px du bas : vrai (marge de 4 px, l\'arrondi d\'un écran Retina)', c.F.msgPageEnBas(), true);
}
console.log('\n── 1660 · 3. msgTourner EXÉCUTÉE ──');
{
  const c = monde({ l: 375, h: 667, page: 742, y: 75 }); c.F.poser(375, true);
  c.window.innerWidth = 667; c.window.innerHeight = 375; c.F.msgTourner();
  v('⛔ portrait → paysage, la page était en bas : msgAmener la ramène sur la conversation', c.__amene, 1);
  v('…la mesure de la liste passe aussi (msgAjusterPlus)', c.__ajuste, 1);
  v('…et la largeur retenue est la nouvelle', c.F.etat().l, 667);
  c.window.innerWidth = 375; c.window.innerHeight = 667; c.F.msgTourner();
  v('paysage → portrait, toujours en bas : elle y retourne encore', c.__amene, 2);
}
{
  const c = monde({ l: 375, h: 667, page: 742, y: 0 }); c.F.poser(375, false);
  c.window.innerWidth = 667; c.F.msgTourner();
  v('⛔ la personne était REMONTÉE lire les pastilles : on garde sa place (rien n\'est amené)', c.__amene, 0);
  v('…mais la liste se re-mesure', c.__ajuste, 1);
}
{
  const c = monde({ l: 375, h: 667, page: 742, y: 75 }); c.F.poser(375, true);
  c.window.innerHeight = 600; c.F.msgTourner();
  v('⛔ la hauteur seule change (barre d\'outils, clavier) : rien n\'est amené', c.__amene, 0);
  v('…la liste se re-mesure comme avant', c.__ajuste, 1);
}
{
  const c = monde({ l: 375, h: 667, page: 742, y: 75, vue: 'planning' }); c.F.poser(375, true);
  c.window.innerWidth = 667; c.F.msgTourner();
  v('hors de la messagerie : rien n\'est amené', c.__amene, 0);
}
{
  const c = monde({ l: 375, h: 667, page: 742, y: 75 }); c.F.poser(0, true);
  c.F.msgTourner();
  v('le tout premier appel (largeur inconnue) n\'amène rien : il retient la largeur', [c.__amene, c.F.etat().l], [0, 375]);
}
console.log('\n── 1660 · 4. qui pose « en bas » ──');
vrai('la vue, à la fin de son rendu, note si la page est en bas', /msgAjuster\(\); msgAjusterVeiller\(\); _msgPageBas=msgPageEnBas\(\);/.test(SRC));
vrai('msgAmener, quand elle amène la page en bas, le note aussi (aux deux passages)', /bas\(\); const y0=window\.scrollY; _msgPageBas=true;/.test(SRC) && /\{ bas\(\); _msgPageBas=true; \}/.test(SRC));

console.log('\n════ test-1660 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
