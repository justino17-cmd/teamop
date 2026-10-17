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

/* ⛔ un RACCOURCI `padding:` écrit plus loin efface un `padding-right` posé avant lui (mutation éprouvée : la réserve du
   téléphone retirée laissait le banc vert, parce que la cascade rejouée ne comparait que la propriété nommée). On confronte donc
   `padding-right` ET `padding` selon !important, spécificité, ordre — et on lit le côté droit du raccourci (1 à 4 valeurs). */
/* seules les règles qui NOMMENT la rangée comptent : l'outil laisse passer les sélecteurs d'attribut (`[onclick^=…]`) comme s'ils s'appliquaient,
   et l'un d'eux, sans rapport, posait `padding:0` et masquait tout */
/* … et l'outil ne juge que la LARGEUR des médias : les règles du téléphone COUCHÉ (`max-height:520px`) se croiraient vraies sur un
   iPhone debout et masqueraient la règle qu'on garde ici (mutation éprouvée). Elles sont jugées à part, dans un second temps. */
const SAISIE = REGLES.filter(r => /#msg-saisie/.test(r.sel) && !r.media.some(m => /max-height/.test(m)));
function droiteGagnante(chaineEl, w) {
  const a = C.gagnant(SAISIE, chaineEl, w, 'padding-right', undefined), b = C.gagnant(SAISIE, chaineEl, w, 'padding', undefined);
  const plusFort = (x, y) => { if (!x) return false; if (!y) return true; if (x.imp !== y.imp) return x.imp; for (let i = 0; i < 3; i++) if (x.spec[i] !== y.spec[i]) return x.spec[i] > y.spec[i]; return x.ordre > y.ordre; };
  if (!a && !b) return null;
  if (plusFort(b, a)) { const t = b.v.trim().split(/\s+/); return { v: (t.length === 1 ? t[0] : t[1]), sel: b.sel + ' (raccourci padding)' }; }
  return { v: a.v, sel: a.sel };
}
const chaine = (barre, flot, kind) => [
  { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': kind || 'mobile' }, classes: [] },
  { tag: 'body', classes: [].concat(barre ? ['rf-onglets'] : [], flot ? ['msg-flot-on'] : []), attrs: {} },
  { tag: 'main', id: 'content', classes: ['content'], attrs: {} },
  { tag: 'div', id: 'msg-saisie', classes: [], attrs: {} }];

console.log('\n── 1602 · 1. la réserve gagne sous 781 px quand le flot est affiché ──');
for (const [nom, w] of [['iPhone 390', 390], ['Android 360', 360], ['SE 375', 375], ['iPhone 430', 430], ['780 px, la limite', 780]]) {
  const g2 = droiteGagnante(chaine(true, true), w);
  vrai(nom + ' : c\'est la propriété padding-right elle-même qui gagne (un raccourci `padding:` écrit plus loin ne l\'efface pas)', !!g2 && parseFloat(g2.v) >= 76, g2 && { v: g2.v, sel: g2.sel });
  const g3 = droiteGagnante(chaine(true, false), w);
  vrai(nom + ' : SANS le flot, pas de réserve (la rangée garde son rembourrage ordinaire)', !g3 || parseFloat(g3.v) < 76, g3 && { v: g3.v, sel: g3.sel });
}

console.log('\n── 1602 · 2. la relation : « Envoyer » finit à gauche du flot ──');
for (const [nom, W] of [['iPhone 390', 390], ['Android 360', 360], ['SE 375', 375]]) {
  const g = droiteGagnante(chaine(true, true), W);
  const p = g ? parseFloat(g.v) : 0;
  const marge = 16;                        // .content : 16 px de chaque côté
  const droiteEnvoyer = W - marge - p;     // le bord droit du contenu de la rangée
  const gaucheFlot = W - 16 - 56;          // right:16px, width:56px (règle .msg-flot)
  vrai(nom + ' : bord droit d\'« Envoyer » (' + droiteEnvoyer + ') < bord gauche du flot (' + gaucheFlot + ')', droiteEnvoyer < gaucheFlot, { droiteEnvoyer, gaucheFlot });
}

console.log('\n── 1602 · 3. contre-épreuves ──');
{
  const g = droiteGagnante(chaine(false, true), 600);
  vrai('même sans barre d\'onglets (téléphone sans onglets), le flot affiché réserve sa place', !!g && parseFloat(g.v) >= 76, g && { v: g.v, sel: g.sel });
  const d = droiteGagnante(chaine(false, true, 'desktop'), 1440);
  vrai('au bureau, la réserve (76 px) est toujours là, inchangée', !!d && parseFloat(d.v) >= 76, d && { v: d.v, sel: d.sel });
}
vrai('renderMsgFlottant reste le SEUL écrivain de la classe msg-flot-on (la règle en dépend)', (BRUT.match(/classList\.toggle\('msg-flot-on'/g) || []).length === 1);

console.log('\n── 1602 · 4. le téléphone couché (844×390) : la réserve existe aussi ──');
{
  const couche = REGLES.filter(r => /#msg-saisie/.test(r.sel) && r.media.some(m => /max-height:\s*520px/.test(m)));
  vrai('une règle de réserve (76 px) existe pour le flot sur un écran court', couche.some(r => /msg-flot-on #msg-saisie/.test(r.sel) && r.decls.some(d => d.p === 'padding-right' && parseFloat(d.v) >= 76)), couche.map(r => r.sel));
}

console.log(`\n════ test-1602 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
