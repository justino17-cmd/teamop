/* ══ j01 · r4#3, r4#4, r4#5, r4#6 — MESSAGERIE : LA RANGÉE DE SAISIE TIENT À L'ÉCRAN, RIEN PAR-DESSUS ═════════════════
   Quatre défauts nés de la même constante. La hauteur de la conversation (#msg-list) était « 100dvh − 396 / 430 / 446 px −
   --tabh » : un haut de page de Mac recopié. Mesuré au navigateur (retest2/h03, couture-a2, a3, c) :
     · r4#5 la barre « Reprendre » du multitâche (+75 px en tête de #content) repoussait la carte sous la rangée de saisie
       collante : 22 px de la dernière bulle cachés (iPhone), 18 (Android), 17 (SE) ;
     · r4#6 sur iPad en paysage (1024×768, 1180×820) et iPhone couché (844×390) le champ de saisie tombait HORS de l'écran à
       l'ouverture (763-807 pour 768 ; 489-533 pour 390) — l'en-tête de page y est plus haut de 76 px ;
     · r4#4 le bouton flottant OP MESSAGES (56 px, z-index 37) recouvrait les 48 px de droite d'« Envoyer » (elementFromPoint
       au bord droit = le flot, le toucher ouvrait son lien) ;
     · r4#3 la couture des deux premiers (rapport de synthèse), mêmes causes.
   La hauteur se DÉDUIT désormais : `msgAjuster()` mesure où la liste commence et ce qui est posé dessous, le CSS retranche
   `100dvh` et `--tabh`. Ce banc EXÉCUTE la vraie `msgAjuster` (faux DOM, mesures posées à la main) et lit le CSS RÉEL pour
   ce qu'il doit dire. Le comportement entier (neuf appareils × avec/sans barre × avec/sans flot, encoches posées, deux
   lectures) : scratchpad/gestion/correctifs/j01/sonde-messagerie.js — c'est elle qui fait foi pour la mise en page. */
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
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const nettoie = s => s.replace(/\s+/g, ' ');

console.log('\n── 1601 · 0. la population ──');
const AJ = bloc('function msgAjuster(){'), PLUS = ligne('function msgAjusterPlus(){'), VEIL = bloc('function msgAjusterVeiller(){'),
  VUE = bloc('views.messagerie=function(){'), ADD = ligne('async function msgAddPhoto(e){'), CLR = ligne('function msgClearPhoto(){');
v('les fonctions sont trouvées', [AJ.length > 300, !!PLUS, VEIL.length > 150, VUE.length > 3000, !!ADD, !!CLR], [true, true, true, true, true, true]);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', ['function msgAjuster(', 'function msgAjusterPlus(', 'function msgAjusterVeiller('].map(n => SRC.split(n).length - 1), [1, 1, 1]);

/* ── 1. msgAjuster EXÉCUTÉE ─────────────────────────────────────────────────────────────────── */
function monde(o) {
  const reg = {}, ecritures = [];
  const el = (id, p) => Object.assign({ id, offsetTop: 0, offsetParent: null, offsetHeight: 0, mt: 0, attrs: {}, props: {}, scrollTop: 0, scrollHeight: 0, clientHeight: 0,
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, setAttribute(n, x) { this.attrs[n] = String(x); ecritures.push('attr:' + n); },
    style: null, getBoundingClientRect() { return { top: o.leurre }; } }, p);
  const mk = (id, p) => { const e = el(id, p); e.style = { setProperty: (k, x) => { e.props[k] = x; ecritures.push('prop:' + k); }, getPropertyValue: k => e.props[k] || '' }; reg[id] = e; return e; };
  const html = mk('html', { pb: 0 });
  const corps = mk('body', { offsetTop: 0, pb: o.padCorps || 0, parentElement: html });
  const content = mk('content', { offsetTop: o.hautContenu, offsetParent: corps, pb: o.padContenu === undefined ? 22 : o.padContenu, parentElement: corps });
  const ml = mk('msg-list', { offsetTop: o.barre ? 75 : 0, offsetParent: content, scrollHeight: 900, clientHeight: 300, scrollTop: o.enBas === false ? 100 : 600, mb: o.mbListe || 0 });
  const sa = mk('msg-saisie', { offsetHeight: 62, mt: 10, mb: o.margeSaisie || 0, parentElement: content });
  const pv = mk('msg-photo-prev', { offsetHeight: o.photo ? 70 : 0, mt: 10 });
  const ctx = { console, JSON, Math, Number, parseFloat, current: o.vue || 'messagerie', window: { scrollY: o.scrollY || 0 }, __reg: reg, __ecr: ecritures,
    getComputedStyle: e => ({ marginTop: (e.mt || 0) + 'px', marginBottom: (e.mb || 0) + 'px', paddingBottom: (e.pb || 0) + 'px', borderBottomWidth: (e.bb || 0) + 'px' }), $: id => reg[id] || null, document: { body: corps } };
  vm.createContext(ctx); vm.runInContext(AJ, ctx);
  return ctx;
}
/* un morceau introuvable fait tomber les contrôles qui en dépendent au lieu de tuer le banc */
const run = (code, c) => { try { return vm.runInContext(code, c); } catch (e) { return undefined; } };
const lire = (c, id, k) => c.__reg[id].props[k];

console.log('\n── 1601 · 1. la mesure : où la liste commence, ce qui est posé dessous ──');
{
  const c = monde({ hautContenu: 297, leurre: 9999 });
  vrai('elle s\'exécute (renvoie vrai)', run('msgAjuster()', c) === true);
  v('--msg-top = la chaîne des offsetTop (liste 0 + #content 297), PAS getBoundingClientRect (décalé par l\'entrée en glissant)', lire(c, 'msg-list', '--msg-top'), '297px');
  v('--msg-sous = rangée de saisie 62 + sa marge 10 (aucun aperçu de photo : il est masqué)', lire(c, 'msg-list', '--msg-sous'), '72px');
  v('data-ajuste posé (le CSS mesuré remplace les constantes)', c.__reg['msg-list'].attrs['data-ajuste'], '1');
}
{
  const c = monde({ hautContenu: 297, photo: true });
  run('msgAjuster()', c);
  v('une photo jointe : l\'aperçu (70 + sa marge 10) s\'ajoute à ce qui est posé dessous', lire(c, 'msg-list', '--msg-sous'), '152px');
}

console.log('\n── 1601 · 2. r4#5 : la barre « Reprendre » (+75 px) décale la liste ; ce qui est dessous ne bouge pas ──');
{
  const sans = monde({ hautContenu: 297 }); run('msgAjuster()', sans);
  const avec = monde({ hautContenu: 297, barre: true }); run('msgAjuster()', avec);
  const d = parseInt(lire(avec, 'msg-list', '--msg-top')) - parseInt(lire(sans, 'msg-list', '--msg-top'));
  v('--msg-top suit la barre de 75 px (la hauteur CSS en retranche autant)', d, 75);
  v('--msg-sous est inchangé', lire(avec, 'msg-list', '--msg-sous'), lire(sans, 'msg-list', '--msg-sous'));
  /* le calcul que le CSS fait : 100dvh − top − sous − (--tabh + 6). Sur un iPhone 844 / --tabh 110 : la rangée finit sur la barre */
  const reste = (ih, c, tabh) => ih - parseInt(lire(c, 'msg-list', '--msg-top')) - parseInt(lire(c, 'msg-list', '--msg-sous')) - tabh - 6;
  v('la liste raccourcit exactement de la barre : plus de bulle sous la rangée', reste(844, sans, 110) - reste(844, avec, 110), 75);
}

console.log('\n── 1601 · 3. r4#6 : l\'en-tête plus haut d\'une tablette en paysage (+76 px) est compté, pas supposé ──');
{
  const mac = monde({ hautContenu: 297 }), ipad = monde({ hautContenu: 373 });
  run('msgAjuster()', mac); run('msgAjuster()', ipad);
  v('--msg-top vaut le vrai haut (373), pas le 297 du Mac', lire(ipad, 'msg-list', '--msg-top'), '373px');
  /* iPad 1024×768 sans barre : liste = 768 − 373 − 72 − 16 ; le bas de la rangée = 373 + liste + 72 = 752 ≤ 768 */
  const liste = Math.max(80, 768 - 373 - 72 - 16);
  vrai('le champ de saisie tient dans l\'écran (bas de la rangée ≤ 768)', 373 + liste + 72 <= 768, 373 + liste + 72);
  vrai('l\'ancienne constante (768 − 396) le faisait déborder de 39 px', 373 + (768 - 396) + 72 > 768 + 30);
}

console.log('\n── 1601 · 3 bis. relecture j01 : le bureau sans barre ne gagne AUCUN défilement vertical ──');
{
  /* Mac 1440×900 mesuré : #content porte 22 px de rembourrage bas, <body> 0. Le CSS retranche --msg-bas ; la page doit finir
     exactement sur 100dvh : top + liste + sous + bas = 900. Avec l'ancienne marge fixe de 16 px elle dépassait (14 px de
     défilement mesurés au navigateur, la rangée collait au bord) — la sonde ne lisait pas scrollMax. */
  const hauteurPage = (c, ih) => { const t = parseInt(lire(c, 'msg-list', '--msg-top')), so = parseInt(lire(c, 'msg-list', '--msg-sous')), ba = parseInt(lire(c, 'msg-list', '--msg-bas'));
    const liste = Math.max(80, ih - t - so - ba); return t + liste + so + ba; };
  /* la liste porte 18 px de marge basse (mesuré), la rangée 10 de marge haute : elles FUSIONNENT, le vide vaut 18 et non 10 */
  const mac = monde({ hautContenu: 297, mbListe: 18 }); run('msgAjuster()', mac);
  v('⛔ le vide liste → rangée est la marge FUSIONNÉE (max(18, 10) = 18, pas 10) : --msg-sous = rangée 62 + 18 = 80, et non 72', lire(mac, 'msg-list', '--msg-sous'), '80px');
  { const ph = monde({ hautContenu: 297, mbListe: 18, photo: true }); run('msgAjuster()', ph);
    v('avec l\'aperçu de photo visible : le vide liste → aperçu est fusionné (max(18, 10)), puis aperçu → rangée (10) : 62 + 70 + 10 + 18', lire(ph, 'msg-list', '--msg-sous'), '160px'); }
  v('--msg-bas = le rembourrage bas de #content (22 px), lu et pas supposé', lire(mac, 'msg-list', '--msg-bas'), '22px');
  v('Mac 1440×900 : la page finit EXACTEMENT sur l\'écran (0 px de défilement vertical)', hauteurPage(mac, 900), 900);
  vrai('l\'ancienne marge fixe de 16 px la faisait dépasser (6 px de trop avec ce rembourrage)', 297 + (900 - 297 - 72 - 16) + 72 + 22 > 900 + 5);
  const macb = monde({ hautContenu: 372 }); run('msgAjuster()', macb);
  v('même chose quand le haut de page est plus bas (372, barre « Reprendre ») : toujours 0 px de défilement', hauteurPage(macb, 900), 900);
  const tab = monde({ hautContenu: 297, padContenu: 96, padCorps: 8 }); run('msgAjuster()', tab);
  v('tablette : 96 px de #content + 8 px de <body> comptés (104), la page tient dans 768', [lire(tab, 'msg-list', '--msg-bas'), hauteurPage(tab, 768)], ['104px', 768]);
  const mar = monde({ hautContenu: 297, margeSaisie: 4 }); run('msgAjuster()', mar);
  v('la marge basse de la rangée elle-même compte aussi', lire(mar, 'msg-list', '--msg-bas'), '26px');
  const c2 = monde({ hautContenu: 297 }); run('msgAjuster()', c2); const n2 = c2.__ecr.length;
  run('msgAjuster()', c2); v('un rembourrage identique ne réécrit rien', c2.__ecr.length, n2);
  c2.__reg['content'].pb = 40; run('msgAjuster()', c2);
  v('un rembourrage qui change se re-mesure', lire(c2, 'msg-list', '--msg-bas'), '40px');
}

console.log('\n── 1601 · 4. stabilité et garde-fous ──');
{
  const c = monde({ hautContenu: 297 }); run('msgAjuster()', c); const n = c.__ecr.length;
  run('msgAjuster()', c);
  v('deuxième mesure identique : rien n\'est réécrit (l\'observateur ne peut pas boucler)', c.__ecr.length, n);
  c.__reg['content'].offsetTop = 372; run('msgAjuster()', c);
  v('une mesure différente se réécrit', lire(c, 'msg-list', '--msg-top'), '372px');
}
{
  const bas = monde({ hautContenu: 297, enBas: true }); run('msgAjuster()', bas);
  v('collée en bas, la liste y RESTE après le changement de hauteur', bas.__reg['msg-list'].scrollTop, 900);
  const haut = monde({ hautContenu: 297, enBas: false }); run('msgAjuster()', haut);
  v('lue plus haut, on ne la ramène pas de force en bas', haut.__reg['msg-list'].scrollTop, 100);
}
{
  const c = monde({ hautContenu: 297, vue: 'planning' });
  vrai('hors de la messagerie : rien ne se mesure ni ne s\'écrit', run('msgAjuster()', c) === false && c.__ecr.length === 0, c.__ecr);
}

console.log('\n── 1601 · 5. le câblage : qui appelle la mesure ──');
/* k01 (r5#6) : la vue retient aussi « collée en bas » (`_msgBas`) sur la liste neuve, avant de mesurer */
/* (r6) et note si la PAGE est en bas après la mesure : c'est ce que la rotation relit (`msgTourner`, test-1660) */
vrai('la vue mesure à la fin de son rendu', /ml\.scrollTop=ml\.scrollHeight;\s*ml\._msgBas=true;\s*\}\s*msgAjuster\(\);\s*msgAjusterVeiller\(\);\s*_msgPageBas=msgPageEnBas\(\);\s*\}$/.test(VUE), VUE.slice(-200));
vrai('ajouter une photo re-mesure (l\'aperçu pousse la rangée)', /msgAjusterPlus\(\)/.test(ADD));
vrai('retirer la photo re-mesure', /msgAjusterPlus\(\)/.test(CLR));
{
  const ecout = {}, obs = []; let nRO = 0;
  const ctx = { window: { addEventListener: (e, f) => { ecout[e] = (ecout[e] || 0) + 1; } }, $: id => ({ id }), document: { body: { id: 'body' } }, requestAnimationFrame: f => 1,
    ResizeObserver: function (cb) { nRO++; this.observe = e => obs.push(e.id); }, msgAjusterPlus: () => {}, msgTourner: () => {}, msgPageEnBas: () => true };
  vm.createContext(ctx); vm.runInContext('let _msgVeille=false, _msgRaf=0;\n' + PLUS + '\n' + VEIL, ctx);
  run('msgAjusterVeiller(); msgAjusterVeiller();', ctx);
  v('on veille la fenêtre (resize, orientationchange, et le défilement de la page pour la rotation) UNE fois, même rappelée', [ecout.resize, ecout.orientationchange, ecout.scroll], [1, 1, 1]);
  v('un seul ResizeObserver, sur #content et le <body> (la barre « Reprendre » arrive après le rendu)', [nRO, obs], [1, ['content', 'body']]);
}

console.log('\n── 1601 · 6. le CSS RÉEL ──');
const ajuste = [...SRC.matchAll(/#msg-list\[data-ajuste\]\s*\{([^}]*)\}/g)].map(m => nettoie(m[1]));
/* k01 (r5#4, r5#5) : deux règles de plus, pour l'écran COURT (< 420 px de haut) — test-1630 les garde */
v('cinq règles mesurées (de base, sous 781 px avec la barre d\'onglets, téléphone couché, et les deux de l\'écran court de k01)', ajuste.length, 5);
vrai('la règle de base retranche top, sous et --msg-bas (rembourrage bas mesuré, 16 px en repli) à 100dvh, avec un plancher, et lève le min-height de 240 px', /height:max\(140px,calc\(100dvh - var\(--msg-top,0px\) - var\(--msg-sous,0px\) - var\(--msg-bas,16px\)\)\)!important/.test(ajuste[0] || '') && /min-height:0!important/.test(ajuste[0] || ''), ajuste[0]);
vrai('celle du téléphone retranche en plus --tabh + 6 px (la rangée collante est posée là)', /var\(--msg-sous,0px\) - var\(--tabh\) - 6px\)\)!important/.test(ajuste[1] || ''), ajuste[1]);
vrai('le téléphone couché (écran court) : plancher abaissé (120 px depuis k01 ; 48 avant : une liste de 48 px ne lit rien) et rangée COLLÉE au bas de l\'écran — le champ reste atteignable quand en-tête + barre « Reprendre » + rangée dépassent 390 px',
  /max\(120px,calc\(100dvh - var\(--msg-top,0px\) - var\(--msg-sous,0px\) - 16px\)\)!important/.test(ajuste[2] || '')
  && /@media \(max-height:520px\) and \(max-width:959px\)\{\s*html\[data-refonte\]\[data-kind="mobile"\] #msg-list\[data-ajuste\]/.test(SRC)
  && /\[data-kind="mobile"\] #msg-saisie\{\s*position:sticky!important;bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 6px\)/.test(SRC), ajuste[2]);
const iBase = SRC.indexOf('#msg-list[data-ajuste]'), iMob = SRC.indexOf('#msg-list[data-ajuste]', iBase + 10);
{ const m = SRC.lastIndexOf('@media (max-width:780px){', iMob);
  vrai('la règle du téléphone est dans le @media (max-width:780px) du bloc « barre d\'onglets » (pas refermé avant elle)', m > 0 && m > iBase && !/\n\}/.test(SRC.slice(m, iMob)), [m, iBase, iMob]); }
const flot = [...SRC.matchAll(/(html\[data-refonte\][^{}]*msg-flot-on #msg-saisie)\s*\{\s*padding-right:76px\s*\}/g)].map(m => nettoie(m[1]));
v('⛔ r4#4 : la réserve du bouton flottant existe sous 781 px (sans barre, avec barre d\'onglets, téléphone couché)', flot, ['html[data-refonte] body.msg-flot-on #msg-saisie', 'html[data-refonte] body.rf-onglets.msg-flot-on #msg-saisie', 'html[data-refonte][data-kind="mobile"] body.msg-flot-on #msg-saisie']);
{
  const iSticky = SRC.indexOf('body.rf-onglets #msg-saisie{'), iRes = SRC.indexOf('body.rf-onglets.msg-flot-on #msg-saisie{');
  vrai('la réserve du téléphone vient APRÈS le `padding:8px` de la rangée collante (sinon il l\'efface)', iSticky > 0 && iRes > iSticky, [iSticky, iRes]);
}
vrai('les constantes d\'avant restent le repli sans script', /#msg-list\{\s*height:calc\(100dvh - 396px\)!important/.test(SRC) && /body\.rf-onglets #msg-list\{\s*height:calc\(100dvh - 446px - var\(--tabh\)\)!important/.test(SRC));

console.log(`\n════ test-1601 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
