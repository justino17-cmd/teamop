/* ══ k01 · r5#5 et r5#4 — MESSAGERIE SUR ÉCRAN COURT : LA CONVERSATION N'EST PLUS UNE LISTE DE 0 À 80 PX ═══════════════════
   Mesuré au navigateur (retest3/j01/verif-1.js, verif-1b.js, verif-0.js) :
     · r5#5 téléphone couché de 360 à 375 px de haut (SE 667×375, Android 640×360, iPhone 812×375) : la liste faisait 80 px (48 sur
       iPhone, sans barre d'onglets), POSÉE dans le flux sous la rangée de saisie collante : 36 / 21 / 41 px visibles au repos, 0 avec
       la barre « Reprendre » ;
     · r5#4 téléphone debout dont le clavier rogne la fenêtre (375×667 → 375×367) : même plancher de 80 px, liste sous la barre.
   Décision (k01) : sous 420 px de haut la liste ignore le haut de page (`--msg-top`) et prend l'écran moins ce qui est collé en bas,
   plancher 140 px ; la page défile pour la lire, le champ reste collé. Les anciens planchers (80, 48) passent à 140 et 120.
   Ce banc REJOUE LA CASCADE du CSS réel (tests/outils-cascade-app.js : spécificité, !important, ordre) pour la fenêtre décrite —
   largeur ET hauteur —, puis calcule la hauteur que le navigateur donnerait à #msg-list. La preuve au pixel :
   scratchpad/gestion/correctifs/k01/court.js (12 cas, encoches posées, avec/sans « Reprendre »). */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* toutes les feuilles <style> de la page */
const FEUILLES = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(FEUILLES);
console.log('\n── 1631 · 0. la population ──');
vrai('les règles sont lues (des milliers), dont les règles de #msg-list', REGLES.length > 2000 && REGLES.filter(r => /#msg-list\[data-ajuste\]/.test(r.sel)).length >= 5, [REGLES.length, REGLES.filter(r => /#msg-list\[data-ajuste\]/.test(r.sel)).length]);

/* une condition de média pour une fenêtre l×h : largeur ET hauteur (l'outil du dépôt ne lit que la largeur) */
function mediaOk(cond, w, h) {
  const c = cond.toLowerCase();
  if (/\bprint\b/.test(c) || /prefers-reduced-motion|hover:\s*none/.test(c)) return false;
  const parts = c.match(/\((?:min|max)-(?:width|height):\s*[\d.]+px\)/g) || [];
  return parts.every(p => { const m = /\((min|max)-(width|height):\s*([\d.]+)px\)/.exec(p); const x = m[2] === 'width' ? w : h; return m[1] === 'min' ? x >= +m[3] : x <= +m[3]; });
}
/* la hauteur que reçoit #msg-list : { kind, onglets (body.rf-onglets), w, h, vars } */
function hauteurListe(o) {
  const regles = REGLES.filter(r => r.media.every(m => mediaOk(m, o.w, o.h))).map(r => Object.assign({}, r, { media: [] }));
  const chaine = [
    { tag: 'html', classes: [], attrs: { 'data-refonte': '', 'data-kind': o.kind } },
    { tag: 'body', classes: o.onglets ? ['rf-onglets'] : [], attrs: {} },
    { tag: 'div', id: 'content', classes: ['content'], attrs: {} },
    { tag: 'div', id: 'msg-list', classes: ['card'], attrs: { 'data-ajuste': '1' } },
  ];
  const g = C.gagnant(regles, chaine, o.w, 'height', 'calc(100dvh - 320px)');
  if (!g) return { h: NaN, g };
  /* env(...) = 0 (pas d'encoche posée) ; var(--x, repli) = la variable posée, sinon le repli — l'outil commun ne lit que var(--x) nu */
  const valeur = g.v.replace(/env\([^)]*\)/g, '0px').replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (m, n, rep) => o.vars[n] !== undefined ? o.vars[n] + 'px' : (rep || 'NaN'));
  return { h: C.px(valeur, { hauteur: o.h, vars: o.vars }), g };
}
const VARS = (top, tabh) => ({ '--msg-top': top, '--msg-sous': 72, '--msg-bas': 22, '--tabh': tabh === undefined ? 76 : tabh });

console.log('\n── 1631 · 1. r5#5 : téléphones couchés de moins de 420 px de haut ──');
for (const [nom, o] of [
  ['SE 667×375', { w: 667, h: 375, kind: 'mobile', onglets: true }], ['Android 640×360', { w: 640, h: 360, kind: 'mobile', onglets: true }],
  ['iPhone 812×375 (sans barre d\'onglets)', { w: 812, h: 375, kind: 'mobile', onglets: false }], ['iPhone 844×390 (sans barre d\'onglets)', { w: 844, h: 390, kind: 'mobile', onglets: false }],
]) for (const [barre, top] of [['sans « Reprendre »', 201], ['avec « Reprendre »', 277]]) {
  const r = hauteurListe(Object.assign({ vars: VARS(top) }, o));
  vrai(nom + ' ' + barre + ' : la liste fait au moins 140 px (elle en faisait 48 à 80)', r.h >= 140, [r.h, r.g && r.g.sel]);
  /* elle ne dépend plus du haut de page : avec ou sans la barre, même hauteur */
  const autre = hauteurListe(Object.assign({ vars: VARS(top === 201 ? 277 : 201) }, o));
  vrai(nom + ' : la hauteur ne dépend pas du haut de page (la page défile, la liste garde sa taille)', r.h === autre.h, [r.h, autre.h]);
}
{
  const r = hauteurListe({ w: 667, h: 375, kind: 'mobile', onglets: true, vars: VARS(201) });
  v('SE 667×375 : 375 − 72 (rangée) − 76 (barre d\'onglets) − 14 = 213 px — la liste remplit l\'écran au-dessus de la rangée collée', r.h, 213);
  const t = hauteurListe({ w: 812, h: 375, kind: 'mobile', onglets: false, vars: VARS(201) });
  v('iPhone 812×375 sans barre : 375 − 72 − 0 (encoche basse non posée ici) − 14 = 289 px', t.h, 289);
}

console.log('\n── 1631 · 2. r5#4 : le clavier rogne la fenêtre d\'un téléphone debout (375×367) ──');
{
  const r = hauteurListe({ w: 375, h: 367, kind: 'mobile', onglets: true, vars: VARS(229) });
  vrai('la liste fait au moins 140 px (elle en faisait 78-80, et passait sous la barre)', r.h >= 140, [r.h, r.g && r.g.sel]);
  v('375×367 : 367 − 72 − 76 − 14 = 205 px', r.h, 205);
}

console.log('\n── 1631 · 3. ce qui ne doit PAS bouger ──');
{
  /* iPhone 390×844 : formule de j01 (haut mesuré, barre d'onglets, 6 px) */
  const r = hauteurListe({ w: 390, h: 844, kind: 'mobile', onglets: true, vars: VARS(390, 110) });
  v('iPhone 390×844 : 844 − 390 − 72 − 110 − 6 = 266 px, inchangé', r.h, 266);
  const b = hauteurListe({ w: 390, h: 844, kind: 'mobile', onglets: true, vars: VARS(466, 110) });
  v('iPhone 390×844 avec « Reprendre » : suit encore le haut de page (+76 → −76)', b.h, 190);
  const d = hauteurListe({ w: 1440, h: 900, kind: 'desktop', onglets: false, vars: VARS(297) });
  v('Mac 1440×900 : 900 − 297 − 72 − 22 = 509 px, inchangé', d.h, 509);
  const i = hauteurListe({ w: 1024, h: 768, kind: 'mobile', onglets: false, vars: VARS(373) });
  v('iPad 1024×768 (768 > 420 : pas un écran court) : 768 − 373 − 72 − 22 = 301 px, inchangé', i.h, 301);
  const s = hauteurListe({ w: 375, h: 667, kind: 'mobile', onglets: true, vars: VARS(434) });
  vrai('SE 375×667 avec « Reprendre » (plancher d\'avant : 80 px) : le plancher monte à 140 px', s.h === 140, s.h);
  /* 421 à 520 de haut : l'ancienne règle de j01, avec son plancher relevé de 48 à 120 */
  const m = hauteurListe({ w: 932, h: 430, kind: 'mobile', onglets: false, vars: VARS(340) });
  v('iPhone Pro Max couché 932×430 avec « Reprendre » : 430 − 340 − 72 − 16 < 0 → plancher 120 px (48 avant)', m.h, 120);
}

console.log('\n── 1631 · 4. la structure : où vivent les deux règles ──');
{
  const sel = REGLES.filter(r => r.decls.some(d => d.p === 'height' && /140px/.test(d.v) && /msg-sous/.test(d.v) && !/msg-top/.test(d.v)));
  const ms = sel.map(r => r.media.join(' & ') + ' | ' + r.sel);
  v('deux règles « écran court », toutes deux sous (max-height:420px) et (max-width:959px), l\'une pour la barre d\'onglets, l\'autre pour le téléphone sans barre', ms.sort(), [
    '(max-height:420px) and (max-width:959px) | html[data-refonte] body.rf-onglets #msg-list[data-ajuste]',
    '(max-height:420px) and (max-width:959px) | html[data-refonte][data-kind="mobile"] #msg-list[data-ajuste]'].sort());
  const ordre = o => REGLES.find(r => r.sel === o).ordre;
  vrai('elles viennent APRÈS les règles de j01 qu\'elles relèvent (même force : le rang gagne)',
    ordre('html[data-refonte][data-kind="mobile"] #msg-list[data-ajuste]') > 0 && sel.every(r => r.ordre > Math.max(...REGLES.filter(x => /#msg-list\[data-ajuste\]/.test(x.sel) && !sel.includes(x)).map(x => x.ordre))), sel.map(r => r.ordre));
}

console.log(`\n════ test-1631 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
