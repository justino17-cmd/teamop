/* ══ OP MESSAGES — L'AGENDA À 320 PX : LA BARRE DES JOURS AU DOIGT ET LE TITRE DE LA FEUILLE « NOUVEAU RENDEZ-VOUS » (lot m21, amélioration « évidente » appareils@5) ══════════════
   Relevé du 17 octobre 2026 (testeurs, iPhone SE à 320 px) :
     · la barre des sept jours de la semaine (.sem-jours) tombe à 37,7 px par colonne — la zone qui répond fait 38 px de large, sous les 44 px du reste de la page : la page de 320 px
       n'a que 288 px de contenu (16 px de marge de chaque côté) pour sept colonnes et six écarts de 4 px ;
     · le titre de la feuille « Nouveau rendez-vous » est coupé en « Nouveau rendez-… » (171 px de texte pour 156 px de place entre « Annuler » et « Créer »).
   Le calcul montre que 360 px (Android) était déjà sous le plancher : 43,4 px. Ce qui est retenu : les écarts passent de 4 à 2 px SOUS 380 px (360 px : 45,1), puis tombent et la barre
   déborde dans la marge (-11 px de chaque côté) SOUS 352 px (relecture : avec des écarts de 2 px la colonne vaut (largeur − 44) / 7, soit 42,9 px à 344 px — Galaxy Z Fold replié — et moins de 44 jusqu'à 351 px) — 310 / 7 = 44,3 px par colonne, sans défilement latéral ni changement de forme ailleurs (390 et 430 px ne bougent pas) ; et le titre de la feuille passe à 15 px sous 340 px (il tient sur une ligne, comme partout). Raccourcir le titre en « Rendez-vous » n'est PAS
   retenu : le mot « Nouveau » distingue une création d'une fiche ouverte (`feuille-titre`, « Rendez-vous » seul = la fiche d'un rendez-vous existant).
   Ce banc REJOUE la feuille réelle : il calcule la colonne (largeur − 2 marges de page + débord − écarts) / 7 sur TOUTE la plage 320–480 px au pas de 1 px, puis à 320, 344, 351, 352, 360, 375, 390 et 430 px, et lit la taille du titre. La zone qui répond et
   la coupe du titre sont mesurées au navigateur par tests/sonde-opmessages-contrastes.js (§ 320 px). ⛔ Population comptée d'abord. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

/* les déclarations d'un sélecteur dans l'ordre de la feuille, pour un contexte : on les rejoue, raccourcis compris */
function rejouer(sel, ctx) {
  const o = { gap: 0, ml: 0, mr: 0 };
  for (const r of L.regles) {
    if (!r.sels.includes(sel) || !C.applique(r.cond, ctx)) continue;
    for (const m of r.corps.matchAll(/(^|[;\s])(gap|column-gap|margin|margin-inline|margin-left|margin-right)\s*:\s*([^;]+)/g)) {
      const p = m[2], val = m[3].trim().split(/\s+/);
      const px = s => { const x = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(s || ''); return x ? +x[1] : 0; };
      if (p === 'gap' || p === 'column-gap') o.gap = px(val[val.length - 1]);
      else if (p === 'margin') { const [t, d, b, g] = val.length === 1 ? [val[0], val[0], val[0], val[0]] : val.length === 2 ? [val[0], val[1], val[0], val[1]] : val.length === 3 ? [val[0], val[1], val[2], val[1]] : val; o.mr = px(d); o.ml = px(g); }
      else if (p === 'margin-inline') { o.ml = px(val[0]); o.mr = px(val.length > 1 ? val[1] : val[0]); }
      else if (p === 'margin-left') o.ml = px(val[0]); else o.mr = px(val[0]);
    }
  }
  return o;
}
const padPage = (() => { const m = /\.contenu\s*\{[^}]*padding:[^;]*max\((\d+)px,\s*env\(safe-area-inset-right/.exec(L.css); return m ? +m[1] : 0; })();
v('(population) le contenu de la page a sa marge latérale de 16 px (lue dans .contenu)', padPage, 16);

const colonne = largeur => { const r = rejouer('.sem-jours', { largeur, tactile: true }); return { r, col: (largeur - 2 * padPage - r.ml - r.mr - 6 * r.gap) / 7 }; };
/* TOUTE la plage, pas cinq largeurs choisies (relecture du 17 octobre : à 344 px — Galaxy Z Fold replié — la colonne faisait 42,9 px et le banc ne l'échantillonnait pas) */
{ let pire = null, n = 0;
  for (let largeur = 320; largeur <= 480; largeur++) { n++; const { col } = colonne(largeur); if (!pire || col < pire.col) pire = { largeur, col }; }
  vrai('(population) ' + n + ' largeurs rejouées, de 320 à 480 px au pas de 1 px', n === 161);
  vrai('de 320 à 480 px, aucune colonne ne passe sous 44 px (la plus étroite : ' + pire.col.toFixed(1) + ' px à ' + pire.largeur + ' px)', pire.col >= 44); }
for (const largeur of [320, 344, 351, 352, 360, 375, 390, 430]) {
  const { r, col } = colonne(largeur);
  vrai('à ' + largeur + ' px : une colonne de la barre des jours fait ≥ 44 px (' + col.toFixed(1) + ' : marges ' + r.ml + '/' + r.mr + ', écart ' + r.gap + ')', col >= 44);
}
/* au-delà de 340 px la barre garde sa forme (écarts, marges de la page) : on n'a pas déformé les autres appareils */
{ const r = rejouer('.sem-jours', { largeur: 390, tactile: true }); v('à 390 px : la barre garde ses écarts de 4 px et ne déborde pas dans la marge', [r.gap, r.ml, r.mr], [4, 0, 0]); }

const taille = (largeur) => { let t = null; for (const r of L.regles) if (r.sels.includes('.feuille-barre h2') && C.applique(r.cond, { largeur })) { const m = /(^|[;\s])font-size\s*:\s*(\d+)px/.exec(r.corps); if (m) t = +m[2]; } return t; };
vrai('le titre de la feuille à 320 px : 15 px (171 px de texte à 17 px pour 156 px de place → 151 px à 15 px)', taille(320) === 15);
v('le titre de la feuille à 390 px : 17 px, inchangé', taille(390), 17);
fin();
