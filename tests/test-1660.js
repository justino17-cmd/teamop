/* ══ OP GESTION — MESSAGERIE : TOURNER L'APPAREIL NE CACHE PLUS LA CONVERSATION (re-test final, 17 octobre 2026) ═══════════════════════════════════
   Le re-test au navigateur (64 configurations, puis un second agent chargé de le réfuter) : entrée dans la Messagerie en portrait, puis le passage en paysage
   GARDAIT `scrollY`. La liste, raccourcie, passait sous la rangée de saisie collée : 129 à 236 px de la dernière bulle cachés, 0 à 70 px de conversation
   visibles, jusqu'à ce qu'on pousse la page. Le défaut existait avant k01 (90 à 121 px).
   Première écriture du correctif : « la page était-elle EN BAS ? » (tolérance 4 px). Le second re-test l'a prise en défaut dans le cas ORDINAIRE : sans la barre
   « Reprendre », la page n'a que 10 à 31 px de défilement sous la rangée (le rembourrage du bas), `scrollY` reste à 0, et rien ne revenait (160 px cachés en
   paysage, 32 configurations sur 32 ; de même après un envoi ou le choix d'une conversation, qui redessinent la vue sans la barre).
   Désormais `msgTourner` demande ce que voit la personne — la FIN de la conversation se voyait-elle (`msgFinCachee`, le test de `msgAmener`) ? —, suivi au
   défilement par `msgFinSuivre` (une fois par image, jamais pendant l'entrée de la vue ni pendant une rotation), et une rotation (la LARGEUR change) la ramène.
   Ce banc EXÉCUTE les vraies `msgFinCachee`, `msgFinSuivre` et `msgTourner` dans un faux monde dont on fixe la géométrie ; le comportement au navigateur fait foi
   dans la sonde du re-test (scratchpad de la session du 17 octobre 2026, retest-r9). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const c = JSON.stringify(a) === JSON.stringify(b); c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + JSON.stringify(a) + ' au lieu de ' + JSON.stringify(b))); };
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const bloc = debut => { const i = SRC.indexOf(debut); if (i < 0) return ''; let n = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') n++; else if (SRC[k] === '}') { n--; if (!n) return SRC.slice(i, k + 1); } } return ''; };

const ETAT = ligne('let _msgLargeur='), CACHEE = bloc('function msgFinCachee(){'), RELIRE = bloc('function msgFinRelire('), SUIVRE = bloc('function msgFinSuivre(){'), TOURNER = bloc('function msgTourner(e){');
const PLUS = ligne('function msgAjusterPlus(){'), VEILLE = ligne('let _msgVeille=');
console.log('\n── 1660 · 1. la population ──');
vrai('msgFinCachee, msgFinRelire, msgFinSuivre, msgTourner, msgAjusterPlus et leur état sont trouvés dans le fichier réel', ETAT.length > 20 && CACHEE.length > 150 && RELIRE.length > 100 && SUIVRE.length > 80 && TOURNER.length > 150 && PLUS.length > 60 && VEILLE.length > 10,
  [ETAT.length, CACHEE.length, RELIRE.length, SUIVRE.length, TOURNER.length, PLUS.length, VEILLE.length]);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', ['function msgFinCachee(', 'function msgFinRelire(', 'function msgFinSuivre(', 'function msgTourner('].map(n => SRC.split(n).length - 1), [1, 1, 1, 1]);
vrai('⛔ la mise en page qui change sans défilement relit la marque, en ne pouvant que la RELEVER (msgAjusterPlus → msgAjuster puis msgFinRelire(true))', /msgAjuster\(\); msgFinRelire\(true\);/.test(PLUS));
vrai('les écouteurs : resize ET orientationchange → msgTourner, défilement → msgFinSuivre', /addEventListener\('resize',msgTourner\);\s*window\.addEventListener\('orientationchange',msgTourner\);\s*window\.addEventListener\('scroll',msgFinSuivre,\{passive:true\}\)/.test(SRC));
vrai('msgAmener partage le même test (msgFinCachee) et note la fin vue, y compris quand la liste se voit en entier', /if\(!msgFinCachee\(\)\)\{ _msgFinVue=true; return false; \}/.test(SRC) && /bas\(\); const y0=window\.scrollY; _msgFinVue=true;/.test(SRC));
vrai('la vue, à la fin de son rendu, note que la fin se voit (la liste est collée en bas ; msgAmener amène la page si la rangée la cache)', /msgAjuster\(\); msgAjusterVeiller\(\); _msgFinVue=true;/.test(SRC));
vrai('⛔ plus aucune trace de la première écriture (« la page est-elle en bas ? »)', !/msgPageEnBas|_msgPageBas/.test(SRC));

/* un faux monde : la liste a un bas, la rangée de saisie et la barre d'onglets un haut (en coordonnées d'écran) ; une horloge et des images à la main */
function monde(o) {
  const g = { listeBas: o.listeBas, rangee: o.rangee, onglets: o.onglets || 0 }, raf = [];
  const rect = f => ({ getBoundingClientRect: () => f() });
  const els = { 'msg-list': rect(() => ({ top: 200, bottom: g.listeBas })), 'msg-saisie': rect(() => ({ top: g.rangee, bottom: g.rangee + 60 })),
    content: { classList: { contains: c => c === 'entre' && !!g.entre } } };
  if (g.onglets) els.tabbar = rect(() => ({ top: g.onglets, bottom: g.onglets + 60 }));
  const w = { innerWidth: o.l || 375, innerHeight: o.h || 667 };
  const ctx = { window: w, current: o.vue || 'messagerie', $: id => els[id] || null, getComputedStyle: () => ({ display: 'flex' }),
    Date: { now: () => ctx.__t }, __t: 1000000, __amene: 0, __ajuste: 0,
    requestAnimationFrame: f => { raf.push(f); return raf.length; }, msgAmener: () => { ctx.__amene++; return true; }, msgAjuster: () => { ctx.__ajuste++; } };
  ctx.__g = g; ctx.__images = () => { while (raf.length) raf.shift()(); };
  vm.createContext(ctx);
  vm.runInContext(VEILLE + '\n' + PLUS + '\n' + ETAT + '\n' + CACHEE + '\n' + RELIRE + '\n' + SUIVRE + '\n' + TOURNER + '\nthis.F = { msgAjusterPlus, msgFinCachee, msgFinSuivre, msgTourner, etat: () => ({ l: _msgLargeur, vue: _msgFinVue }), poser: (l, vue) => { _msgLargeur = l; _msgFinVue = vue; } };', ctx);
  return ctx;
}
const tourner = (c, l, h, type) => { c.window.innerWidth = l; c.window.innerHeight = h; c.F.msgTourner({ type: type || 'resize' }); };

console.log('\n── 1660 · 2. msgFinCachee EXÉCUTÉE ──');
{
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 });
  v('la liste finit au-dessus de la rangée : la fin se voit', c.F.msgFinCachee(), false);
  c.__g.listeBas = 560;
  v('la liste passe sous la rangée collée : la fin est cachée', c.F.msgFinCachee(), true);
  c.__g.listeBas = 532;
  v('à 3 px sous la rangée : se voit (marge de 4 px, comme msgAmener)', c.F.msgFinCachee(), false);
  const d = monde({ listeBas: 620, rangee: 700, onglets: 600 });
  v('sous la barre d\'onglets seule : cachée', d.F.msgFinCachee(), true);
}
console.log('\n── 1660 · 3. le cas ORDINAIRE, sans « Reprendre » — celui que la première écriture ratait ──');
{
  /* sans barre, la page repose à scrollY 0 avec 10 à 31 px de marge : la fin de la liste est au-dessus de la rangée */
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.F.msgFinSuivre(); c.__images();
  v('le défilement de l\'entrée (scrollY 0, la page a 10 px de marge) : la fin se voit', c.F.etat().vue, true);
  c.__g.listeBas = 690; c.__g.rangee = 290; c.__g.onglets = 0;            // en paysage, la liste raccourcie passerait sous la rangée
  tourner(c, 667, 375); c.__images();
  v('⛔ portrait → paysage : msgAmener ramène la conversation', c.__amene, 1);
  v('…la liste se re-mesure aussi (msgAjusterPlus → msgAjuster)', c.__ajuste, 1);
}
{
  /* après un envoi ou le choix d'une conversation, la vue est redessinée sans la barre : la fin se voit, la vue l'a noté */
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  tourner(c, 667, 375); c.__images();
  v('⛔ après un envoi (vue redessinée, fin vue) puis une rotation : la conversation revient', c.__amene, 1);
}
{
  /* le troisième re-test : barre « Reprendre », la personne remonte voir les pastilles (fin cachée), puis touche ✕ — la barre part, la page reste
     en haut, la fin se voit de nouveau SANS un pixel de défilement ; seul le ResizeObserver le voit (msgAjusterPlus) */
  const c = monde({ listeBas: 520, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.__g.listeBas = 610; c.F.msgFinSuivre(); c.__images();
  v('(population) remontée : la fin est notée cachée', c.F.etat().vue, false);
  c.__g.listeBas = 505; c.F.msgAjusterPlus(); c.__images();               // ✕ : la barre part, la mise en page change, aucun défilement
  v('⛔ ✕ sur « Reprendre » : la mise en page relit la marque, la fin est vue', c.F.etat().vue, true);
  c.__g.listeBas = 690; c.__g.rangee = 290; c.__g.onglets = 0;
  tourner(c, 667, 375); c.__images();
  v('⛔ …puis on tourne : la conversation revient (160 px cachés avant)', c.__amene, 1);
}
{
  /* le quatrième re-test : la fenêtre RACCOURCIT sans défilement (la barre d'adresse revient, le clavier) — le bas du conteneur passe sous la rangée
     alors que la dernière bulle se voit encore ; la marque ne doit pas tomber (seul le doigt dit qu'on a quitté la fin), et la rotation ramène */
  const c = monde({ listeBas: 511, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.window.innerHeight = 611; c.__g.listeBas = 500; c.__g.rangee = 473; c.F.msgTourner({ type: 'resize' }); c.__images();
  v('⛔ la fenêtre raccourcit sans défilement (le bas du conteneur passe sous la rangée) : la marque reste « vue »', c.F.etat().vue, true);
  c.__g.listeBas = 690; c.__g.rangee = 290; c.__g.onglets = 0;
  tourner(c, 611, 375); c.__images();
  v('⛔ …puis on tourne : la conversation revient (134 à 220 px cachés avec la relecture qui baissait)', c.__amene, 1);
}
console.log('\n── 1660 · 4. la place de la personne est gardée ──');
{
  const c = monde({ listeBas: 520, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.__g.listeBas = 610; c.F.msgFinSuivre(); c.__images();                // elle remonte la page au doigt : la fin passe sous la rangée
  v('la personne remonte voir les pastilles : la fin est notée cachée', c.F.etat().vue, false);
  tourner(c, 667, 375); c.__images();
  v('⛔ puis elle tourne : rien n\'est amené, sa place est gardée', c.__amene, 0);
}
{
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  tourner(c, 375, 560); c.__images();
  v('⛔ la hauteur seule change (barre d\'outils, clavier) : rien n\'est amené', c.__amene, 0);
}
console.log('\n── 1660 · 5. ce qui ne doit pas fausser la mesure ──');
{
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.__g.entre = true; c.__g.listeBas = 640; c.F.msgFinSuivre(); c.__images();   // les cartes glissent : un rectangle lu là est décalé
  v('pendant l\'entrée de la vue (les cartes glissent), le défilement ne réécrit rien', c.F.etat().vue, true);
}
{
  /* iPhone : orientationchange arrive AVANT le nouveau innerWidth, puis le défilement, puis resize */
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(375, true);
  c.F.msgTourner({ type: 'orientationchange' });
  v('orientationchange avec l\'ancienne largeur : rien n\'est amené encore', c.__amene, 0);
  c.__g.listeBas = 690; c.__g.rangee = 290; c.__t += 100; c.F.msgFinSuivre(); c.__images();
  v('…un défilement pendant la rotation ne réécrit pas la fin vue (la géométrie est déjà la neuve)', c.F.etat().vue, true);
  c.__t += 100; tourner(c, 667, 375); c.__images();
  v('⛔ …puis resize avec la nouvelle largeur : la conversation revient', c.__amene, 1);
  c.__t += 2000; c.F.msgFinSuivre(); c.__images();
  v('passé la rotation, le défilement se suit de nouveau', c.F.etat().vue, false);
}
{
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600, vue: 'planning' }); c.F.poser(375, true);
  tourner(c, 667, 375); c.__images();
  v('hors de la messagerie : rien n\'est amené', c.__amene, 0);
}
{
  const c = monde({ listeBas: 500, rangee: 529, onglets: 600 }); c.F.poser(0, true);
  c.F.msgTourner({ type: 'resize' }); c.__images();
  v('le tout premier appel (largeur inconnue) n\'amène rien : il retient la largeur', [c.__amene, c.F.etat().l], [0, 375]);
}

console.log('\n════ test-1660 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
