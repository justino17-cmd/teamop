/* ══ k01 · r5#7 — BOÎTE MAIL EN TROIS VOLETS, HORS BUREAU : LE CADRE FINIT SUR L'ÉCRAN, LA PAGE NE DÉFILE PLUS ══════════════
   Mesuré au navigateur (retest3/j01/verif-3.js, hp2.js) : iPad 1180×820 : #mail-app de 260 à 822 pour un écran de 820, #content
   à 918, 98 px de défilement de page ; Android 1200×800 : 49 px ; Mac 1300×760 : 0 px. Deux causes, et la première annoncée par le
   retesteur était FAUSSE (le vérificateur l'a relevé) :
     1. la hauteur du cadre : `html[data-refonte] #mail-app{height:calc(100dvh - 258px)!important}` — 258 est calé sur l'en-tête
        d'un Mac (cadre à 194 px). Sur tablette / Android large l'en-tête est plus haut (cadre à 260 / 211 px) : le cadre dépasse
        avant même le rembourrage ;
     2. le rembourrage bas de `.content` : 96 px (règle `@media (min-width:781px) and (max-width:1180px)` et sa jumelle ≥ 1181) et non
        22 px comme au bureau (`html[data-kind="desktop"] .content{padding-bottom:22px}`) — rien d'équivalent pour kind=mobile.
        (Ce n'est PAS `body.rf-onglets .content`, qui vit dans `@media (max-width:780px)`.)
   Remède : `mailAjuster()` mesure où le cadre commence (`--mail-top`) et ce qui reste sous lui (`--mail-bas`) ; le CSS retranche les
   deux, et ramène le rembourrage de la page à 22 px, hors bureau et dès 1180 px (le seuil des trois volets). Le bureau garde ses
   constantes. Ce banc EXÉCUTE la vraie `mailAjuster` (faux DOM) et REJOUE la cascade du CSS réel ; la preuve au pixel :
   scratchpad/gestion/correctifs/k01/courrier.js (9 gabarits × avec/sans « Reprendre ») — avant : iPad 2 px de dépassement et 98 px de
   défilement, Android 49 px ; après : 0 px partout, le Mac inchangé (cadre 194-696 à 1300×760). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('./outils-cascade-app.js');
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
const AJ = bloc('function mailAjuster(){'), VUE = bloc('views.boiteMail=function(){');
const run = (code, c) => { try { return vm.runInContext(code, c); } catch (e) { return undefined; } };

console.log('\n── 1632 · 0. la population ──');
vrai('mailAjuster et la vue sont trouvées', AJ.length > 500 && VUE.length > 3000, [AJ.length, VUE.length]);
v('⛔ une seule définition de chaque (une seconde gagnerait partout, en silence)', ['function mailAjuster(', 'function mailAjusterPlus(', 'function mailAjusterVeiller('].map(n => SRC.split(n).length - 1), [1, 1, 1]);

/* ── 1. mailAjuster EXÉCUTÉE ── */
function monde(o) {
  const reg = {}; const ecr = [];
  const mk = (id, p) => { const e = Object.assign({ id, offsetTop: 0, offsetParent: null, attrs: {}, props: {}, pb: 0, mb: 0,
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, setAttribute(n, x) { this.attrs[n] = String(x); ecr.push('attr:' + n); },
    removeAttribute(n) { delete this.attrs[n]; ecr.push('-attr:' + n); } }, p);
    e.style = { setProperty: (k, x) => { e.props[k] = x; ecr.push('prop:' + k); }, getPropertyValue: k => e.props[k] || '' }; reg[id] = e; return e; };
  const html = mk('html', {});
  const corps = mk('body', { parentElement: html, pb: o.padCorps || 0 });
  /* le rembourrage de #content dépend de data-ajuste, comme le CSS : 96 px tant que le cadre n'est pas ajusté (tablette), 22 ensuite */
  const content = mk('content', { offsetTop: o.hautContenu, offsetParent: corps, parentElement: corps });
  Object.defineProperty(content, 'pb', { get: () => (reg['mail-app'] && reg['mail-app'].attrs['data-ajuste'] === '1' && !o.bureau) ? 22 : (o.padBase === undefined ? 96 : o.padBase) });
  mk('mail-app', { offsetTop: o.hautCadre, offsetParent: content, parentElement: content, mb: o.margeCadre || 0 });
  const ctx = { console, JSON, Math, Number, parseFloat, current: o.vue || 'boiteMail', __reg: reg, __ecr: ecr, innerWidth: o.largeur,
    getComputedStyle: e => ({ marginBottom: (e.mb || 0) + 'px', paddingBottom: (e.pb || 0) + 'px', borderBottomWidth: '0px' }), $: id => reg[id] || null };
  vm.createContext(ctx); vm.runInContext('const MAIL_TROIS_VOLETS=1180; const _mailDesktop=()=>window.innerWidth>=MAIL_TROIS_VOLETS;\n' + AJ, Object.assign(ctx, { window: { innerWidth: o.largeur } }));
  return ctx;
}
const lire = (c, k) => c.__reg['mail-app'].props[k];
console.log('\n── 1632 · 1. la mesure : où le cadre commence, ce qui reste dessous ──');
{
  /* iPad 1180×820 : #content à 236 px de haut, le cadre 24 px plus bas (barre de connexion mail) — 260 en tout */
  const c = monde({ largeur: 1180, hautContenu: 236, hautCadre: 24 });
  vrai('elle s\'exécute (renvoie vrai) en trois volets', run('mailAjuster()', c) === true);
  v('--mail-top = la chaîne des offsetTop (24 + 236), PAS un rectangle (décalé par l\'entrée en glissant)', lire(c, '--mail-top'), '260px');
  v('data-ajuste posé AVANT la lecture : le rembourrage compté est celui d\'APRÈS (22), pas les 96 px d\'avant', [c.__reg['mail-app'].attrs['data-ajuste'], lire(c, '--mail-bas')], ['1', '22px']);
  const n = c.__ecr.length; run('mailAjuster()', c);
  vrai('une seconde mesure identique ne réécrit rien (l\'observateur ne peut pas boucler)', c.__ecr.length === n, c.__ecr.slice(n));
  c.__reg['content'].offsetTop = 300; run('mailAjuster()', c);
  v('une mesure qui change se réécrit (barre « Reprendre » posée après le rendu)', lire(c, '--mail-top'), '324px');
}
{
  const c = monde({ largeur: 1180, hautContenu: 236, hautCadre: 24, padCorps: 8, margeCadre: 4 });
  run('mailAjuster()', c);
  v('le rembourrage du <body> (8) et la marge basse du cadre (4) comptent aussi : 22 + 8 + 4', lire(c, '--mail-bas'), '34px');
}
{
  const c = monde({ largeur: 1024, hautContenu: 236, hautCadre: 24 });
  c.__reg['mail-app'].attrs['data-ajuste'] = '1';
  vrai('en pile (< 1180 px) rien n\'est mesuré, et un ajustement d\'avant la rotation est RETIRÉ', run('mailAjuster()', c) === false && c.__reg['mail-app'].attrs['data-ajuste'] === undefined && !lire(c, '--mail-top'), c.__ecr);
}
{
  const c = monde({ largeur: 1180, hautContenu: 236, hautCadre: 24, vue: 'planning' });
  vrai('hors de la boîte mail : rien ne se mesure ni ne s\'écrit', run('mailAjuster()', c) === false && c.__ecr.length === 0, c.__ecr);
}

console.log('\n── 1632 · 2. le câblage ──');
vrai('la vue mesure juste après avoir écrit son rendu (les deux chemins de sortie en profitent : chargement, puis rendu)', /<\/div>`;\s*mailAjuster\(\);\s*mailAjusterVeiller\(\);\s*loadMailboxes\(\)/.test(VUE), VUE.slice(VUE.indexOf('loadMailboxes') - 160, VUE.indexOf('loadMailboxes') + 20));
{
  const ecout = {}, obs = []; let nRO = 0;
  const ctx = { window: { addEventListener: (e) => { ecout[e] = (ecout[e] || 0) + 1; } }, $: id => ({ id }), document: { body: { id: 'body' } }, requestAnimationFrame: () => 1,
    ResizeObserver: function () { nRO++; this.observe = e => obs.push(e.id); }, mailAjusterPlus: () => {}, current: 'boiteMail' };
  vm.createContext(ctx); vm.runInContext('let _mailVeille=false, _mailRaf=0;\n' + SRC.slice(SRC.indexOf('function mailAjusterPlus('), SRC.indexOf('\n', SRC.indexOf('function mailAjusterPlus('))) + '\n' + bloc('function mailAjusterVeiller(){'), ctx);
  run('mailAjusterVeiller(); mailAjusterVeiller();', ctx);
  v('on veille la fenêtre (resize, orientationchange) UNE fois, même rappelée', [ecout.resize, ecout.orientationchange], [1, 1]);
  v('un seul ResizeObserver, sur #content et le <body>', [nRO, obs], [1, ['content', 'body']]);
}

console.log('\n── 1632 · 3. le CSS RÉEL, cascade rejouée ──');
const FEUILLES = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(FEUILLES);
/* `:not([data-kind="desktop"])` : l'outil commun le prend pour vrai ; ici on le juge pour de bon */
function gagne(o, prop, cible, enLigne) {
  const regles = REGLES.filter(r => {
    /* les règles de l'ÉTAT VIDE (`#mail-app:has(#mail-list > .card)`, aucune boîte connectée) : l'outil les croit toujours vraies ;
       on mesure ici la boîte REMPLIE, celle que Justin ouvre tous les jours */
    if (/#mail-app:has\(#mail-list/.test(r.sel)) return false;
    if (!/:not\(\[data-kind="desktop"\]\)/.test(r.sel)) return true;
    return o.kind !== 'desktop';
  }).map(r => Object.assign({}, r, { sel: r.sel.replace(/:not\(\[data-kind="desktop"\]\)/g, '') }));
  const chaine = [{ tag: 'html', classes: [], attrs: { 'data-refonte': '', 'data-kind': o.kind } }, { tag: 'body', classes: [], attrs: {} }, { tag: 'div', id: 'content', classes: ['content'], attrs: {} }]
    .concat(cible === 'cadre' ? [{ tag: 'div', id: 'mail-app', classes: [], attrs: { 'data-ajuste': '1' } }] : []);
  return C.gagnant(regles, chaine, o.w, prop, enLigne);
}
const hauteurCadre = (o) => { const g = gagne(o, 'height', 'cadre', 'calc(100dvh - 165px)'); if (!g) return { h: NaN };
  const val = g.v.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (m, n, rep) => o.vars && o.vars[n] !== undefined ? o.vars[n] + 'px' : (rep || 'NaN'));
  return { h: C.px(val, { hauteur: o.h }), g }; };
{
  const ipad = hauteurCadre({ w: 1180, h: 820, kind: 'mobile', vars: { '--mail-top': 260, '--mail-bas': 22 } });
  v('iPad 1180×820 : 820 − 260 − 22 = 538 px — le cadre finit à 798, sous le bas de l\'écran (il finissait à 822)', ipad.h, 538);
  const andro = hauteurCadre({ w: 1200, h: 800, kind: 'mobile', vars: { '--mail-top': 211, '--mail-bas': 22 } });
  v('Android 1200×800 : 800 − 211 − 22 = 567 px', andro.h, 567);
  const court = hauteurCadre({ w: 1200, h: 600, kind: 'mobile', vars: { '--mail-top': 211, '--mail-bas': 22 } });
  v('une fenêtre très basse garde le plancher de 440 px (la liste et le volet restent lisibles)', court.h, 440);
  const mac = hauteurCadre({ w: 1300, h: 760, kind: 'desktop', vars: { '--mail-top': 194, '--mail-bas': 22 } });
  v('⛔ le BUREAU garde sa constante : 760 − 258 = 502 px (cadre 194 → 696 mesuré), rien n\'est touché', [mac.h, mac.g && mac.g.v], [502, 'calc(100dvh - 258px)']);
  const pile = hauteurCadre({ w: 1179, h: 820, kind: 'mobile', vars: { '--mail-top': 260, '--mail-bas': 22 } });
  v('en pile (1179 px) : hauteur libre (auto), la règle des trois volets ne s\'applique pas', pile.g && pile.g.v, 'auto');
  const sansMesure = hauteurCadre({ w: 1180, h: 820, kind: 'mobile', vars: {} });
  vrai('sans mesure (--mail-top absent), la hauteur ne retombe pas sur 0 : plancher 440', sansMesure.h >= 440, sansMesure.h);
}
{
  const pad = (kind, w) => { const g = gagne({ w, h: 820, kind }, 'padding-bottom', 'content'); return g && g.v; };
  v('iPad 1180 de large : le rembourrage bas de la page passe à 22 px (96 avant)', pad('mobile', 1180), '22px');
  v('Android 1200 : 22 px aussi', pad('mobile', 1200), '22px');
  v('le bureau garde ses 22 px', pad('desktop', 1300), '22px');
  /* la règle est ancrée sur la présence du cadre ajusté : une autre rubrique de tablette garde son 96 px */
  vrai('⛔ le rembourrage de 22 px n\'est posé QUE sous une page qui porte le cadre ajusté (:has(> #mail-app[data-ajuste])), pas sur toute rubrique de tablette',
    REGLES.some(r => /:not\(\[data-kind="desktop"\]\) \.content:has\(> #mail-app\[data-ajuste\]\)$/.test(r.sel) && r.decls.some(d => d.p === 'padding-bottom' && d.v === '22px')
      && r.media.join('').includes('(min-width:1180px)')));
  const autre = [...SRC.matchAll(/\.content\{padding:24px var\(--rf-marge\) 96px\}/g)].length;
  vrai('la règle générale de la tablette (96 px) existe toujours pour les autres rubriques', autre >= 1, autre);
}

console.log(`\n════ test-1632 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
