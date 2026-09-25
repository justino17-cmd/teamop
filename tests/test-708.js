/* ⛔ CE QUE CE FICHIER GARDE — l'écran de secours doit voir une box VIDÉE, pas seulement une box
   DISPARUE.

   15 septembre 2026, au soir. Justin, d'ELAN : « il n'y a que les box ». Le défaut de
   `boxFusionFine` corrigé le matin même (v678) n'avait supprimé aucune box : il avait vidé leur
   STOCK, ligne par ligne. Or « Remettre » ne comparait que des identifiants — et une box vidée
   garde le sien. L'écran des copies de sauvegarde annonçait donc « rien ne manque » et ne
   proposait aucun bouton : le stock de toute une entreprise dormait dans les copies, illisible
   depuis l'écran censé le rendre.

   Mesuré avant correction, sur le calcul exact de l'écran : une box de 3 lignes ramenée à 0
   donnait `manque = 0`. Aucun bouton.

   Les deux règles que la remise ne doit jamais casser, et que ce banc éprouve :
   1. ⛔ une quantité VIVANTE ne se réécrit jamais — c'est « le stock d'une box ne se réécrit
      pas en bloc », appliqué à la restauration ;
   2. ⛔ ce que l'équipe a retiré EXPRÈS (`db.boxDecisions`) ne revient pas — sinon on rend à
      trente équipes ce qu'elles avaient écarté à la main. */

const fs = require('fs');
const vm = require('vm');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('Une box vidée se voit et se récupère (vraies fonctions exécutées)');

/* ── le DÉTECTEUR : le bloc réel de sauvegardeOuvrir, borné par deux repères de texte ── */
const dDeb = APP.indexOf('let boxLignes=[], boxTotal=0;');
/* La borne va JUSQU'AU BLOC RENDU, pas seulement jusqu'au comptage : un détecteur juste qui
   n'affiche aucun bouton ne récupère rien. On exécute donc aussi le gabarit réel. */
const dFin = APP.indexOf('const li=lignes.map(');
v('le détecteur est retrouvé dans le fichier livré', dDeb > -1 && dFin > dDeb, true);
const DETECT = APP.slice(dDeb, dFin);

/* ── la REMISE : extraction par comptage d'accolades, comme les autres suites ── */
function extraire(nom) {
  const d = APP.indexOf('function ' + nom + '(');
  if (d < 0) return null;
  let i = APP.indexOf('{', d), p = 0;
  for (; i < APP.length; i++) { const c = APP[i]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return APP.slice(d, i + 1); } }
  return null;
}
const REMISE = extraire('sauvegardeRemettreStock');
v('la vraie fonction de remise est extraite du fichier livré', !!REMISE, true);

/* ── le banc ─────────────────────────────────────────────────────────────────────────── */
function banc(opts) {
  const ctx = {
    db: JSON.parse(JSON.stringify(opts.db)),
    base: JSON.parse(JSON.stringify(opts.copie)),
    window: {}, journal: [], toasts: [],
    boxDecision: function (b) { return (ctx.db.boxDecisions || []).find(d => d && d.id === b.id) || null; },
    esc: s => String(s), save: () => { ctx.sauve = (ctx.sauve || 0) + 1; },
    logEvent: (t, d) => ctx.journal.push(t + ' · ' + d),
    toast: m => ctx.toasts.push(String(m)), closeModal: () => {}, refreshEcran: () => {},
    adminSeul: () => true,   // v738 : réservée à l'administrateur — gardé par test-790
    Date: Date, JSON: JSON, Map: Map, Object: Object, String: String, Array: Array,
  };
  vm.createContext(ctx);
  vm.runInContext(DETECT + '\nthis.boxLignes=boxLignes; this.boxTotal=boxTotal; this.boxBloc=boxBloc;', ctx);
  vm.runInContext(REMISE, ctx);
  ctx.window._sauvBase = ctx.base;
  return ctx;
}

const COPIE = { boxes: [
  { id: 'b1', nom: 'Cuisine — Le Gourmet', stock: { p1: { ctn: 2, u: 40 }, p2: { ctn: 0, u: 12 }, p3: { ctn: 1, u: 7 } }, _ms: { p1: 100, p2: 100, p3: 100 } },
  { id: 'b2', nom: 'Réserve', stock: { p9: { ctn: 0, u: 5 } }, _ms: { p9: 100 } },
] };

/* ── 1) LE CAS D'ELAN : la box existe, son stock a disparu ── */
{
  const c = banc({ copie: COPIE, db: { boxes: [{ id: 'b1', nom: 'Cuisine — Le Gourmet', stock: {}, _ms: {} }], boxDecisions: [] } });
  v('⛔ une box VIDÉE est vue comme incomplète', c.boxTotal, 3);
  v('⛔ et un BOUTON est rendu — un compte juste sans bouton ne récupère rien', /onclick="sauvegardeRemettreStock\(\)"/.test(c.boxBloc), true);
  v('le bouton annonce le nombre exact', /Remettre les 3 ligne\(s\) de stock/.test(c.boxBloc), true);
  v('la box est nommée à l\'écran', /Cuisine — Le Gourmet/.test(c.boxBloc), true);
  v('l\'écran dit qu\'on ne touche pas aux quantités actuelles', /aucune quantité actuelle n'est modifiée/.test(c.boxBloc), true);
  v('… et elle est nommée, pas juste comptée', (c.boxLignes[0] || {}).nom, 'Cuisine — Le Gourmet');
  v('une box absente en entier n’est PAS comptée ici (l’autre bouton s’en charge)', c.boxLignes.length, 1);
  c.sauvegardeRemettreStock();
  const b = c.db.boxes[0];
  v('⛔ les trois lignes sont remises', Object.keys(b.stock).length, 3);
  v('… avec leur quantité exacte', b.stock.p1, { ctn: 2, u: 40 });
  v('⛔ et chaque ligne est DATÉE, sinon la fusion suivante la reprendrait', Object.keys(b._ms).filter(k => b._ms[k] > 1000000000000).length, 3);
  v('la base est enregistrée une seule fois', c.sauve, 1);
  v('une seule ligne de journal, pas une par box', c.journal.length, 1);
  v('… et elle dit ce qui a bougé', /3 ligne\(s\) de stock remise\(s\) dans 1 box/.test(c.journal[0] || ''), true);
}

/* ── 2) ⛔ UNE QUANTITÉ VIVANTE NE SE RÉÉCRIT JAMAIS ── */
{
  const c = banc({ copie: COPIE, db: { boxes: [{ id: 'b1', nom: 'Cuisine', stock: { p1: { ctn: 0, u: 3 } }, _ms: { p1: 900 } }], boxDecisions: [] } });
  v('⛔ une ligne encore présente n’est pas comptée comme manquante', c.boxTotal, 2);
  c.sauvegardeRemettreStock();
  const b = c.db.boxes[0];
  v('⛔ la quantité VIVANTE est intacte — 3 u, pas 40 u de la copie', b.stock.p1, { ctn: 0, u: 3 });
  v('… et sa marque n’a pas été rajeunie', b._ms.p1, 900);
  v('les deux autres lignes, elles, sont revenues', Object.keys(b.stock).sort(), ['p1', 'p2', 'p3']);
}

/* ── 3) ⛔ CE QUI A ÉTÉ RETIRÉ EXPRÈS NE REVIENT PAS ── */
{
  const c = banc({ copie: COPIE, db: {
    boxes: [{ id: 'b1', nom: 'Cuisine', stock: {}, _ms: {} }],
    boxDecisions: [{ id: 'b1', ecartes: { p2: 12345 } }] } });
  v('⛔ une ligne écartée à la main n’est pas comptée', c.boxTotal, 2);
  c.sauvegardeRemettreStock();
  const b = c.db.boxes[0];
  v('⛔ et elle n’est PAS remise — une restauration ne ressuscite pas une décision', 'p2' in b.stock, false);
  v('les deux autres sont bien revenues', Object.keys(b.stock).sort(), ['p1', 'p3']);
}

/* ── 4) CONTRE-TEST : rien ne manque → on ne propose rien et on n’écrit rien ── */
{
  const c = banc({ copie: COPIE, db: { boxes: [
    { id: 'b1', nom: 'Cuisine', stock: { p1: { ctn: 2, u: 40 }, p2: { ctn: 0, u: 12 }, p3: { ctn: 1, u: 7 } }, _ms: {} },
    { id: 'b2', nom: 'Réserve', stock: { p9: { ctn: 0, u: 5 } }, _ms: {} }], boxDecisions: [] } });
  v('⛔ CONTRE-TEST — rien ne manque, rien n’est proposé', c.boxTotal, 0);
  v('⛔ … et AUCUN bouton n’est rendu (un bouton qui ne fait rien apprend à cliquer pour rien)', c.boxBloc, '');
  c.sauvegardeRemettreStock();
  v('⛔ … et RIEN n’est enregistré (un écran de secours ne touche pas une base saine)', c.sauve, undefined);
  v('on le dit plutôt que de faire semblant', /Rien à remettre/.test(c.toasts[0] || ''), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
