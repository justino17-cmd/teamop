/* ══ k01 · r5#6 — MESSAGERIE : APRÈS UNE ROTATION EN DIRECT, LA CONVERSATION RESTE COLLÉE EN BAS ═══════════════════════
   Mesuré au navigateur (retest3/j01/rot.js, verif-2.js) : iPad 820×1180 → 1180×820, 20 messages, liste en bas ;
   après la rotation le dernier message a 0 px de visible sur 61 et `enBas` vaut false ; iPhone 390×844 → 844×390 pareil.
   Rouvrir la rubrique la recolle. Le commentaire de `msgAjuster` promettait « si la liste était collée en bas, elle y reste ».
   Deux mécanismes, un seul remède :
     1. sur tablette, top / sous / bas sont IDENTIQUES avant et après (373) : `dejaBon` sortait avant tout recollage, alors que
        la hauteur de la liste avait changé par `100dvh` ;
     2. sur téléphone ils changent, mais « était-elle en bas ? » était lu APRÈS : le CSS avait déjà raccourci la liste, scrollTop
        n'avait pas bougé, le dernier message était sorti par le bas de la zone — donc « pas en bas ».
   Remède : l'état « collée en bas » se RETIENT (`_msgBas`, posé par la vue et par l'événement scroll de la liste) avant que la
   fenêtre change ; tourner l'appareil ne défile pas la liste, la marque reste juste. Ce banc EXÉCUTE la vraie `msgAjuster` (faux DOM
   dont la hauteur change SANS événement de défilement, comme un navigateur) ; le comportement entier fait foi dans la sonde :
   scratchpad/gestion/correctifs/k01/rotation.js (iPad, iPhone, Android, Mac × en bas / remontée × aller-retour). */
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
const AJ = bloc('function msgAjuster(){'), VUE = bloc('views.messagerie=function(){');

console.log('\n── 1630 · 0. la population ──');
vrai('msgAjuster et la vue sont trouvées', AJ.length > 600 && VUE.length > 3000, [AJ.length, VUE.length]);
v('⛔ une seule définition de msgAjuster (une seconde gagnerait partout, en silence)', SRC.split('function msgAjuster(').length - 1, 1);

/* Un faux monde où la liste a une vraie géométrie : scrollHeight fixe (900), clientHeight qui CHANGE à la rotation, scrollTop qui
   NE BOUGE PAS (un navigateur ne défile pas une liste qu'on raccourcit), et un événement `scroll` qu'on ne tire que pour un
   vrai défilement. `tournerEn(h)` = la fenêtre change : la hauteur CSS de la liste suit, et rien d'autre. */
function monde(o) {
  const reg = {}, ecoutes = {};
  const mk = (id, p) => { const e = Object.assign({ id, offsetTop: 0, offsetParent: null, offsetHeight: 0, mt: 0, attrs: {}, props: {}, scrollTop: 0, scrollHeight: 0, clientHeight: 0,
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, setAttribute(n, x) { this.attrs[n] = String(x); } }, p);
    e.style = { setProperty: (k, x) => { e.props[k] = x; }, getPropertyValue: k => e.props[k] || '' }; reg[id] = e; return e; };
  const html = mk('html', {});
  const corps = mk('body', { parentElement: html });
  const content = mk('content', { offsetTop: o.top, offsetParent: corps, pb: 22, parentElement: corps });
  const ml = mk('msg-list', { offsetParent: content, scrollHeight: 900, clientHeight: o.hauteur, mb: 0,
    addEventListener: (n, f) => { (ecoutes[n] = ecoutes[n] || []).push(f); } });
  /* comme un navigateur : l'écriture de scrollTop est bornée au défilement POSSIBLE à cet instant ; raccourcir la liste ne le déplace pas */
  { let st = 900 - o.hauteur; Object.defineProperty(ml, 'scrollTop', { get: () => st, set: x => { st = Math.max(0, Math.min(x, ml.scrollHeight - ml.clientHeight)); } }); }
  mk('msg-saisie', { offsetHeight: 62, mt: 10, parentElement: content });
  mk('msg-photo-prev', { offsetHeight: 0, mt: 10 });
  const ctx = { console, JSON, Math, Number, parseFloat, current: 'messagerie', __reg: reg,
    getComputedStyle: e => ({ marginTop: (e.mt || 0) + 'px', marginBottom: (e.mb || 0) + 'px', paddingBottom: (e.pb || 0) + 'px', borderBottomWidth: '0px' }), $: id => reg[id] || null, document: { body: corps } };
  vm.createContext(ctx); vm.runInContext(AJ, ctx);
  ctx.ml = ml;
  /* le défilement de l'utilisateur : scrollTop change, le navigateur tire `scroll` */
  ctx.defiler = (st) => { ml.scrollTop = st; (ecoutes.scroll || []).forEach(f => f()); };
  /* la rotation : seule la hauteur CSS de la liste change (100dvh) ; top / sous / bas peuvent rester identiques (tablette) ou changer (téléphone) */
  ctx.tourner = (h, topNeuf) => { ml.clientHeight = h; if (topNeuf !== undefined) content.offsetTop = topNeuf; };
  ctx.enBas = () => ml.scrollHeight - ml.scrollTop - ml.clientHeight < 4;
  return ctx;
}
const run = (code, c) => { try { return vm.runInContext(code, c); } catch (e) { return undefined; } };
/* ce que fait la vue : liste neuve collée en bas, puis mesure */
const ouvrir = (c) => { c.ml.scrollTop = c.ml.scrollHeight - c.ml.clientHeight; c.ml._msgBas = true; return run('msgAjuster()', c); };

console.log('\n── 1630 · 1. tablette : top, sous et bas IDENTIQUES après la rotation — le chemin `dejaBon` ──');
{
  const c = monde({ top: 373, hauteur: 641 });
  vrai('ouverture : mesurée et collée en bas', ouvrir(c) === true && c.enBas(), c.ml.scrollTop);
  c.tourner(281);   // 1180×820 : la liste raccourcit de 360 px, scrollTop reste
  vrai('contrôle du bac : la rotation a bien sorti le dernier message par le bas (pas en bas géométriquement)', !c.enBas(), [c.ml.scrollTop, c.ml.clientHeight]);
  const avant = JSON.stringify([c.ml.props['--msg-top'], c.ml.props['--msg-sous'], c.ml.props['--msg-bas']]);
  vrai('msgAjuster s\'exécute', run('msgAjuster()', c) === true);
  v('top / sous / bas n\'ont pas bougé (c\'est le cas où `dejaBon` sortait avant tout)', JSON.stringify([c.ml.props['--msg-top'], c.ml.props['--msg-sous'], c.ml.props['--msg-bas']]), avant);
  vrai('⛔ la liste est RECOLLÉE en bas après la rotation (dernier message visible)', c.enBas(), [c.ml.scrollTop, c.ml.scrollHeight, c.ml.clientHeight]);
}

console.log('\n── 1630 · 2. téléphone : top change, et la géométrie dit déjà « pas en bas » quand la fonction tourne ──');
{
  const c = monde({ top: 353, hauteur: 335 });
  ouvrir(c);
  c.tourner(65, 231);   // 844×390 : en-tête plus bas de 122 px, liste de 65 px, scrollTop inchangé
  vrai('contrôle du bac : plus en bas géométriquement', !c.enBas());
  run('msgAjuster()', c);
  v('la mesure est réécrite (top 231)', c.ml.props['--msg-top'], '231px');
  vrai('⛔ et la liste est recollée en bas (l\'état d\'AVANT la rotation est celui qui compte)', c.enBas(), [c.ml.scrollTop, c.ml.scrollHeight, c.ml.clientHeight]);
  c.tourner(335, 353); run('msgAjuster()', c);
  vrai('retour en portrait : toujours en bas', c.enBas());
}

console.log('\n── 1630 · 3. la liste remontée par l\'utilisateur ne se recolle PAS ──');
{
  const c = monde({ top: 373, hauteur: 641 });
  ouvrir(c);
  c.defiler(100);   // il relit un vieux message : le navigateur tire `scroll`
  c.tourner(281); run('msgAjuster()', c);
  v('lue plus haut avant la rotation : on ne la ramène pas de force en bas', c.ml.scrollTop, 100);
  c.defiler(900 - 281);   // il redescend jusqu'en bas à la main
  c.tourner(641); run('msgAjuster()', c);
  vrai('redescendue à la main (événement scroll), elle redevient « collée » et le reste', c.enBas() && c.ml._msgBas === true, [c.ml.scrollTop, c.ml._msgBas]);
}

console.log('\n── 1630 · 4. repli : aucune marque posée (vue construite par un autre chemin) — la géométrie sert, une fois ──');
{
  const c = monde({ top: 373, hauteur: 641 });
  c.ml.scrollTop = 900 - 641;   // pas de _msgBas posé
  vrai('sans marque, première mesure : la liste en bas est reconnue et la marque posée', run('msgAjuster()', c) === true && c.ml._msgBas === true, c.ml._msgBas);
  const d = monde({ top: 373, hauteur: 641 });
  d.ml.scrollTop = 50;
  run('msgAjuster()', d);
  v('sans marque, une liste lue plus haut n\'est pas ramenée en bas', d.ml.scrollTop, 50);
  const e = monde({ top: 373, hauteur: 641 });
  vrai('l\'écouteur de défilement est posé UNE fois, même si la mesure repasse dix fois', (() => { ouvrir(e); for (let i = 0; i < 10; i++) run('msgAjuster()', e); return e.ml._msgEcoute === true; })());
}

console.log('\n── 1630 · 5. le câblage : la vue pose la marque sur la liste NEUVE ──');
vrai('la vue colle la liste en bas ET le retient, avant de mesurer', /ml\.scrollTop=ml\.scrollHeight;\s*ml\._msgBas=true;\s*\}\s*msgAjuster\(\);\s*msgAjusterVeiller\(\);/.test(VUE), VUE.slice(-260));
vrai('msgAjuster lit la marque RETENUE (pas la géométrie seule) avant de décider', /const enBas=ml\._msgBas===undefined\?\(ml\.scrollHeight-ml\.scrollTop-ml\.clientHeight<4\):ml\._msgBas;/.test(AJ), AJ.slice(-900));
vrai('le chemin `dejaBon` recolle lui aussi', /if\(dejaBon\)\{[^}]*ml\.scrollTop=ml\.scrollHeight[^}]*return true;\s*\}/.test(AJ), AJ.slice(-700));

console.log(`\n════ test-1630 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
