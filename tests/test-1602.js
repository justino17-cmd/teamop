/* ══ j01 · r4#4 — MESSAGERIE AU TÉLÉPHONE : LE BOUTON FLOTTANT OP MESSAGES NE RECOUVRE PLUS « ENVOYER » ══════════
   Mesuré au navigateur (retest2/h03/verif-1.js, couture-a2.js) sur iPhone 390×844, Android 360×800 et SE 375×667 :
   `#msg-flot` (56 px, z-index 37, à 16 px du bord et à `--tabh` + 14) tombe exactement sur la rangée de saisie collée à
   `--tabh` + 6 (lot h03). `elementFromPoint` à 6 px du bord droit d'« Envoyer » rend le flot, et le toucher y déclenche le
   clic du LIEN du flot au lieu d'envoyer ; le centre du bouton reste atteignable, d'où le « mineur ». La réserve de place
   existait au bureau (`@media (min-width:781px)`, 76 px) — pas sous 781 px.
   ⚠️ Latent aujourd'hui : le flot n'apparaît que si OP MESSAGES est ouvert pour l'entreprise (`opMsgDisponible()`, fermé
   par défaut — CLAUDE.md : OP MESSAGES se sépare). Le défaut reparaîtrait le jour où il rouvre.

   Ce banc REJOUE LA CASCADE de la feuille réelle (tests/outils-cascade-app.js : médias, spécificité, !important, ordre) pour la
   rangée de saisie, avec ou sans la classe `msg-flot-on` (posée sur <body> par renderMsgFlottant, le seul écrivain du bouton) :
   ce qu'on garde est ce que la règle GAGNE, pas son texte. Puis la RELATION : le bord droit du bouton « Envoyer » tombe à gauche
   du bord gauche du flot. La mesure réelle : scratchpad/gestion/correctifs/j01/sonde-messagerie.js (touchBordDroit). */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const REGLES = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));

console.log('\n── 1602 · 0. la population ──');
vrai('des règles sont lues', REGLES.length > 3000, REGLES.length);
vrai('des règles visent #msg-saisie', REGLES.filter(r => /#msg-saisie/.test(r.sel)).length >= 3, REGLES.filter(r => /#msg-saisie/.test(r.sel)).length);
vrai('la règle du flot lui-même est lue (56 px, à 16 px du bord)', REGLES.some(r => /^\.msg-flot$/.test(r.sel) && r.decls.some(d => d.p === 'right' && d.v === '16px') && r.decls.some(d => d.p === 'width' && d.v === '56px')));

const chaine = (barre, flot, kind) => [
  { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': kind || 'mobile' }, classes: [] },
  { tag: 'body', classes: [].concat(barre ? ['rf-onglets'] : [], flot ? ['msg-flot-on'] : []), attrs: {} },
  { tag: 'main', id: 'content', classes: ['content'], attrs: {} },
  { tag: 'div', id: 'msg-saisie', classes: [], attrs: {} }];

console.log('\n── 1602 · 1. la réserve gagne sous 781 px quand le flot est affiché ──');
for (const [nom, w] of [['iPhone 390', 390], ['Android 360', 360], ['SE 375', 375], ['iPhone 430', 430], ['780 px, la limite', 780]]) {
  const g2 = C.gagnant(REGLES, chaine(true, true), w, 'padding-right', undefined);
  vrai(nom + ' : c\'est la propriété padding-right elle-même qui gagne (un raccourci `padding:` écrit plus loin ne l\'efface pas)', !!g2 && parseFloat(g2.v) >= 76, g2 && { v: g2.v, sel: g2.sel });
  const g3 = C.gagnant(REGLES, chaine(true, false), w, 'padding-right', undefined);
  vrai(nom + ' : SANS le flot, pas de réserve (la rangée garde son rembourrage ordinaire)', !g3 || parseFloat(g3.v) < 76, g3 && { v: g3.v, sel: g3.sel });
}

console.log('\n── 1602 · 2. la relation : « Envoyer » finit à gauche du flot ──');
for (const [nom, W] of [['iPhone 390', 390], ['Android 360', 360], ['SE 375', 375]]) {
  const g = C.gagnant(REGLES, chaine(true, true), W, 'padding-right', undefined);
  const p = g ? parseFloat(g.v) : 0;
  const marge = 16;                        // .content : 16 px de chaque côté
  const droiteEnvoyer = W - marge - p;     // le bord droit du contenu de la rangée
  const gaucheFlot = W - 16 - 56;          // right:16px, width:56px (règle .msg-flot)
  vrai(nom + ' : bord droit d\'« Envoyer » (' + droiteEnvoyer + ') < bord gauche du flot (' + gaucheFlot + ')', droiteEnvoyer < gaucheFlot, { droiteEnvoyer, gaucheFlot });
}

console.log('\n── 1602 · 3. contre-épreuves ──');
{
  const g = C.gagnant(REGLES, chaine(false, true), 600, 'padding-right', undefined);
  vrai('même sans barre d\'onglets (téléphone sans onglets), le flot affiché réserve sa place', !!g && parseFloat(g.v) >= 76, g && { v: g.v, sel: g.sel });
  const d = C.gagnant(REGLES, chaine(false, true, 'desktop'), 1440, 'padding-right', undefined);
  vrai('au bureau, la réserve (76 px) est toujours là, inchangée', !!d && parseFloat(d.v) >= 76, d && { v: d.v, sel: d.sel });
}
vrai('renderMsgFlottant reste le SEUL écrivain de la classe msg-flot-on (la règle en dépend)', (BRUT.match(/classList\.toggle\('msg-flot-on'/g) || []).length === 1);

console.log(`\n════ test-1602 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
