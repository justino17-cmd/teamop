/* ══ UN BOUTON QUI NE FAIT PAS CE QU'IL PROMET EST PIRE QU'UN BOUTON ABSENT ════════════════

   17 septembre 2026. Justin envoie une capture de la Tour : « Espaces techniques », et dessous
   « Espace par défaut — TEAM OP · 4 pers. / 7 j ». Il avait supprimé les entreprises DEUX JOURS
   plus tôt et demandait pourquoi ça s'affichait encore.

   Ce n'était pas un défaut d'affichage : la fenêtre de `cnxData` fait SEPT jours, elle
   contenait donc encore les connexions d'AVANT la suppression. Dans cinq jours, ça se serait
   effacé tout seul.

   ⛔ LE VRAI DÉFAUT ÉTAIT AILLEURS, et il était sérieux : le bouton « remise à zéro » de la
   Tour ne remettait à zéro QUE `echecs24`. Appuyer dessus ne changeait rien à « 4 pers. / 7 j ».
   On appuie, il ne se passe rien, et on conclut que l'écran est cassé — ou pire, on croit que
   des gens sont encore là.

   ⚠️ ET IL N'EFFACE TOUJOURS RIEN. `total` garde l'historique complet, et « Annuler » rend la
   totalité. Le jour où un incident ressort, on peut remonter AVANT la remise à zéro. C'est la
   différence entre un filigrane et une suppression, et ce banc la garde. */

const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ── la vraie fonction, extraite du fichier livré ────────────────────────────────────────── */
console.log('\n── 715 · cnxResume sort du serveur réel et s\'exécute ──');
const i0 = SRV.indexOf('function cnxResume(t) {');
v('la fonction est retrouvée', i0 > 0, true);
let n = 0, fin = i0;
for (let i = SRV.indexOf('{', i0); i < SRV.length; i++) {
  if (SRV[i] === '{') n++; else if (SRV[i] === '}') { n--; if (!n) { fin = i; break; } } }
const SRC = SRV.slice(i0, fin + 1);

const J = 86400000;
function banc(filigrane) {
  const now = Date.now();
  const ctx = { Date, Set, Math, JSON, console: { log() {}, warn() {}, error() {} } };
  /* Six connexions : trois d'il y a 5 et 6 jours (donc AVANT une suppression faite il y a
     2 jours), trois d'il y a 1 h. Plus deux échecs récents. C'est exactement la forme de ce
     que Justin avait sous les yeux. */
  ctx.cnxData = { esp: [
    { ev:'connexion', ts: now - 3600000,  login:'recent1', dev:'d1', version:'699' },
    { ev:'connexion', ts: now - 7200000,  login:'recent2', dev:'d2', version:'699' },
    { ev:'session',   ts: now - 10800000, login:'recent1', dev:'d1', version:'699' },
    { ev:'connexion', ts: now - 5*J,      login:'ancien1', dev:'d8', version:'690' },
    { ev:'connexion', ts: now - 6*J,      login:'ancien2', dev:'d9', version:'690' },
    { ev:'connexion', ts: now - 6*J,      login:'ancien3', dev:'d9', version:'690' },
    { ev:'echec',     ts: now - 1800000,  login:'ancien1' },
    { ev:'echec',     ts: now - 3600000,  login:'ancien2' },
  ] };
  ctx.zeroDe = () => filigrane;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { r: ctx.cnxResume('esp'), now };
}

console.log('\n── 715 · sans filigrane : tout compte, y compris ce qui date d\'avant ──');
{ const { r } = banc(0);
  v('5 personnes distinctes sur 7 jours', r.utilisateurs7, 5);
  v('… dont les 3 d\'avant la suppression', r.utilisateurs30, 5);
  v('4 appareils sur 7 jours', r.appareils7, 4);
  v('6 connexions sur 7 jours', r.connexions7, 6);
  v('2 échecs sur 24 h', r.echecs24, 2);
  v('et l\'historique complet fait 8 lignes', r.total, 8); }

console.log('\n── 715 · ⛔ AVEC le filigrane, TOUS les compteurs repartent de zéro ──');
/* ⛔ C'EST LE CONTRÔLE QUI TIENT LA PROMESSE DU BOUTON. Avant ce correctif, seul `echecs24`
   retombait : `utilisateurs7` restait à 5, et le patron regardait un écran qui n'avait pas
   bougé après avoir appuyé. */
{ const { r, now } = banc(Date.now() - 1000);   // posé il y a une seconde : plus rien après
  v('⛔ utilisateurs sur 7 j → 0', r.utilisateurs7, 0);
  v('⛔ utilisateurs sur 30 j → 0', r.utilisateurs30, 0);
  v('⛔ appareils sur 7 j → 0', r.appareils7, 0);
  v('⛔ connexions sur 7 j → 0', r.connexions7, 0);
  v('⛔ échecs sur 24 h → 0', r.echecs24, 0);
  v('⛔ et « dernière connexion » aussi', r.derniere, 0);
  v('⛔ … sans nom de dernier connecté', r.dernierLogin, '');
  /* ⚠️ MAIS RIEN N'EST DÉTRUIT. C'est la différence entre un filigrane et une suppression, et
     c'est ce qui permet de remonter avant l'incident le jour où il ressort. */
  v('⚠️ l\'historique complet est INTACT sur le disque', r.total, 8); }

console.log('\n── 715 · un filigrane posé AU MILIEU ne garde que ce qui suit ──');
{ const { r } = banc(Date.now() - 4*J);   // posé il y a 4 jours : les 3 anciennes sortent
  v('les 2 personnes récentes restent', r.utilisateurs7, 2);
  v('… les 3 d\'avant le filigrane sont parties', r.utilisateurs30, 2);
  v('3 connexions récentes', r.connexions7, 3);
  v('l\'historique reste entier', r.total, 8); }

console.log('\n── 715 · et la Tour cache un espace technique ÉTEINT, jamais un espace vivant ──');
/* ⛔ ON NE DÉBRANCHE PAS L'ALARME. Le panneau existe parce que cinq personnes sont restées une
   semaine sur l'espace partagé sans que rien ne le signale (commentaire de tour.html). Le
   critère est donc l'ACTIVITÉ, pas l'existence : éteint → il sort de l'écran tout seul ;
   quelqu'un y revient → il reparaît. */
{ const i = TOUR.indexOf("{cle:'technique'");
  const bloc = TOUR.slice(i, TOUR.indexOf('];', i));
  v('le filtre regarde la dernière activité', /r\.derniere>j7/.test(bloc), true);
  v('… les personnes sur 7 jours', /r\.utilisateurs7>0/.test(bloc), true);
  v('… et les échecs récents', /r\.echecs24>0/.test(bloc), true);
  /* ⚠️ Le contre-test : le panneau ne doit PAS disparaître parce qu'on l'a décidé, mais parce
     qu'il n'y a plus rien à dire. La condition reste un OU — un seul signal suffit à le faire
     reparaître. */
  v('⚠️ un SEUL signal suffit à le faire reparaître (c\'est un OU, pas un ET)',
    (bloc.match(/\|\|/g) || []).length >= 2, true);
  v('⛔ et « technique » reste la première condition', /x\.technique!==true\) return false/.test(bloc), true); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
