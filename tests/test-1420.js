/* ══ test-1420 · MESSAGERIE AU TÉLÉPHONE : LE CHAMP DE SAISIE ET « ENVOYER » NE PASSENT PAS SOUS LA BARRE D'ONGLETS ══
   Lot h03, bug appareils#0 (sonde de l'agent « appareils », 2 essais identiques) : sur un iPhone 390×844, page en
   haut, le champ « Message à toute l'équipe… » est à top=785 pour une barre d'onglets qui commence à 768 ;
   `elementFromPoint` au centre du champ rend l'ONGLET, et un vrai toucher lance go('planning').

   Cause. La hauteur de la carte de conversation (`#msg-list`) est écrite en ligne (`calc(100dvh - 320px)`), puis
   imposée deux fois par la feuille (`100dvh - 396px`, puis `100dvh - 430px` sous 959 px) — en !important, donc la
   feuille gagne. Aucune des trois ne retranche `--tabh`, la place que prend la barre : le champ, posé à la suite de la
   carte, tombe dans la zone de la barre. Le plancher de 240 px (`min-height`) empêche en plus de rattraper la
   place sur un iPhone SE (375×667).

   Ce banc ne garde pas un texte : il REJOUE LA CASCADE (tests/outils-cascade-app.js — média, spécificité, !important,
   ordre) pour l'élément `#msg-list` et pour la rangée de saisie, sur un iPhone, un iPhone SE, un Android, un iPad
   (sans barre d'onglets : ne doit PAS changer) et un bureau. Le modèle de mise en page vient d'une MESURE
   (scratchpad/gestion/correctifs/h03/sonde-messagerie.js) : haut de la carte à 353 px (les pastilles tiennent sur
   UNE ligne qui défile, même avec quatorze collègues de plus), 62 px de la carte au bas du champ avant correctif
   (marges 10 + 8 + hauteur du champ 44), plus le rembourrage de la rangée une fois posé (2 × padding), barre d'onglets
   qui commence `--tabh` + 4 px au-dessus du bas. Si une mise en page repousse quand même la carte, c'est la rangée
   collante (`position:sticky`) qui reste atteignable — la sonde le mesure.
   La preuve au navigateur (toucher réel, focus, vue inchangée) : la même sonde.                                  */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* toutes les feuilles de la page, dans l'ordre */
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS);
console.log('\n── 1420 · 0. la population ──');
vrai('des règles sont lues (la cascade rejouée n\'est pas sur du néant)', REGLES.length > 3000, REGLES.length);
const touchent = REGLES.filter(r => /#msg-list/.test(r.sel));
vrai('des règles visent #msg-list', touchent.length >= 3, touchent.length);

/* la vue : la carte (style en ligne) et la rangée de saisie, lues dans le CODE de views.messagerie */
const i0 = CODE.indexOf('views.messagerie=function(){'); const i1 = CODE.indexOf('let msgPhoto=', i0);
const VUE = i0 > 0 && i1 > i0 ? CODE.slice(i0, i1) : '';
vrai('views.messagerie est trouvée', VUE.length > 2000, VUE.length);
const carte = /<div class="card" style="([^"]*)" id="msg-list">/.exec(VUE);
vrai('la carte de la liste porte son style en ligne', !!carte);
const hEnLigne = carte ? (/height:([^;]+)/.exec(carte[1]) || [])[1] : undefined;
const minEnLigne = carte ? (/min-height:([^;]+)/.exec(carte[1]) || [])[1] : undefined;
const saisie = /<div ([^>]*)><div id="mention-pop"/.exec(VUE);
vrai('la rangée de saisie (celle qui porte la fenêtre des mentions) est trouvée', !!saisie);
const idSaisie = saisie ? (/id="([^"]+)"/.exec(saisie[1]) || [])[1] : undefined;
const posEnLigne = saisie ? (/position:([a-z]+)/.exec(saisie[1]) || [])[1] : undefined;
vrai('⛔ la rangée de saisie a un identifiant (la feuille doit pouvoir la viser)', idSaisie === 'msg-saisie', idSaisie);

/* ── les contextes : un appareil = sa largeur, sa hauteur, la place de sa barre, ses ancêtres ── */
function ctx(nom, w, h, tabh, avecBarre) {
  const chaine = (id, classes) => [
    { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': avecBarre ? 'mobile' : 'desktop' }, classes: [] },
    { tag: 'body', classes: avecBarre ? ['rf-onglets'] : ['rf-onglets'], attrs: {} },
    { tag: 'main', id: 'content', classes: ['content'], attrs: {} },
    { tag: 'div', id, classes: classes || [], attrs: {} }];
  return { nom, w, h, tabh, avecBarre, carte: chaine('msg-list', ['card']), saisie: chaine('msg-saisie', []) };
}
const PHONES = [ctx('iPhone 390×844', 390, 844, 72, true), ctx('iPhone SE 375×667', 375, 667, 72, true), ctx('Android 360×800', 360, 800, 71, true)];

/* le modèle MESURÉ : haut de la carte, place sous la carte, haut de la barre */
const HAUT_CARTE = 353, SOUS_CARTE_NU = 62;
const HAUT_BARRE = (c) => c.h - c.tabh - 4;
console.log('\n── 1420 · 1. au téléphone, champ et « Envoyer » finissent AU-DESSUS de la barre ──');
for (const c of PHONES) {
  const g = C.gagnant(REGLES, c.carte, c.w, 'height', hEnLigne), m = C.gagnant(REGLES, c.carte, c.w, 'min-height', minEnLigne);
  const vars = { '--tabh': c.tabh };
  const H = C.px(g && g.v, { hauteur: c.h, vars }), M = C.px(m && m.v, { hauteur: c.h, vars });
  vrai(c.nom + ' : la hauteur gagnante se calcule', Number.isFinite(H), g && g.v);
  const pad = C.gagnant(REGLES, c.saisie, c.w, 'padding'), rembourrage = pad ? C.px(pad.v.split(/\s+/)[0], { hauteur: c.h, vars }) : 0;
  const bas = HAUT_CARTE + Math.max(H, Number.isFinite(M) ? M : 0) + SOUS_CARTE_NU + 2 * (rembourrage || 0);
  vrai(c.nom + ' : la hauteur gagnante retranche la barre (--tabh)', !!g && /var\(--tabh\)/.test(g.v), g && g.v + '  (' + g.sel + ')');
  vrai(c.nom + ' : le bas de la rangée de saisie (' + Math.round(bas) + ' px) est au-dessus de la barre (' + HAUT_BARRE(c) + ' px)',
    bas <= HAUT_BARRE(c), { H, M, bas, barre: HAUT_BARRE(c) });
  const p = C.gagnant(REGLES, c.saisie, c.w, 'position', posEnLigne), b = C.gagnant(REGLES, c.saisie, c.w, 'bottom');
  vrai(c.nom + ' : la rangée de saisie est collante (sticky) — elle reste atteignable quand des pastilles sur 3 lignes poussent la carte',
    !!p && p.v === 'sticky', p && p.v);
  vrai(c.nom + ' : elle se colle AU-DESSUS de la barre (bottom lit --tabh)', !!b && /var\(--tabh\)/.test(b.v), b && b.v);
}

console.log('\n── 1420 · 2. les appareils SANS barre d\'onglets ne bougent pas ──');
for (const c of [ctx('iPad 820×1180', 820, 1180, 0, false), ctx('bureau 1440×900', 1440, 900, 0, false)]) {
  const g = C.gagnant(REGLES, c.carte, c.w, 'height', hEnLigne);
  vrai(c.nom + ' : la hauteur de la carte ne retranche PAS --tabh (pas de barre à éviter)', !!g && !/--tabh/.test(g.v), g && g.v);
  const p = C.gagnant(REGLES, c.saisie, c.w, 'position', posEnLigne);
  vrai(c.nom + ' : la rangée de saisie n\'est pas collante', !p || p.v !== 'sticky', p && p.v);
}

console.log('\n── ' + 1420 + ' : ' + ok + ' ✓ ' + ko + ' ✗ ──');
process.exit(ko ? 1 : 0);
