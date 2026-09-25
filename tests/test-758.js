/* ══ LA BARRE DU BAS : LA PASTILLE QUI GLISSE, ET LE DOIGT ═════════════════════════════════
   Écrit le 22 septembre 2026, après la vidéo d'iOS 26 envoyée par Justin : « pour la barre
   c'est pas mal mais je voudrais comme sur la vidéo, avec nos couleurs à nous, et le
   glissement du doigt pour changer ». Image par image, ce que la vidéo montre : le surligné
   de l'onglet actif n'est pas un fond qui s'allume, c'est UNE pastille qui GLISSE, visible en
   transit au milieu de la barre.

   Ce banc garde CINQ défauts, tous mesurés, aucun visible à la lecture :

   1. ⛔⛔ LA GÉOMÉTRIE CALCULÉE EN JAVASCRIPT DÉPEND DU MOMENT. On lisait `offsetWidth` de
      l'onglet actif et on le recopiait. Mesuré : 143 px pour un onglet de 76 — la mesure
      avait été prise quand la barre n'avait que trois onglets, et rien ne la reprenait (la
      barre occupe toute la largeur, donc SA taille ne change jamais ; et les onglets observés
      avaient été détruits par `innerHTML=`). Trois rustines n'ont pas suffi : double rAF,
      ResizeObserver, replacement à chaque rafraîchissement — bon une fois sur deux.
      La sortie est de ne plus MESURER : le CSS déduit la colonne d'un NUMÉRO.
   2. LE NAVIGATEUR ANNULE LE FLUX DE POINTEUR au premier mouvement horizontal
      (`pointercancel`), parce qu'il reprend la main pour le défilement. Un geste bâti sur les
      événements de POINTEUR ne peut pas marcher au doigt — les `touchmove`, eux, continuent.
   3. `innerHTML=` À CHAQUE RAFRAÎCHISSEMENT détruisait la pastille, et la neuve se reposait
      sans animation : elle SAUTAIT au lieu de glisser. Une signature évite la réécriture.
   4. LE DÉFILEMENT LATÉRAL GARDE LE GESTE. Le planning, les filtres et les tableaux se font
      glisser de côté : leur voler le doigt rendrait ces écrans inutilisables.
   5. LE PLAFOND DE LARGEUR. `#content` s'arrêtait à 1 796 sur une fenêtre de 2 000 — 204 px
      perdus à droite, sur TOUTES les rubriques.

   ⛔ Tous les motifs visent du CODE, sur un texte dont les commentaires sont RETIRÉS.
   La preuve fonctionnelle vit dans `scratchpad/sonde-glisse.js` (14 ✓ 0 ✗ au navigateur) et
   dans `scratchpad/trace-geste.js`, qui trace la décision du geste pas à pas. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');

let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '\n      → ' + (d === undefined ? '' : d))); };

/* ⛔ On découpe dans le texte BRUT et on nettoie après : l'ancre d'un bloc EST un commentaire,
   la chercher dans un texte déjà nettoyé rend −1 donc une tranche vide, et une tranche vide
   passe au vert sur tout. */
function bloc(ancre) {
  const i0 = APP.indexOf(ancre);
  if (i0 < 0) return { i0: -1, css: '' };
  const suite = APP.indexOf('/* ══', i0 + 40), fin = APP.indexOf('</style>', i0);
  const b = (suite > 0 && (fin < 0 || suite < fin)) ? suite : fin;
  return { i0, css: APP.slice(i0, b > 0 ? b : i0 + 9000).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ') };
}

console.log('\n══ 1. LA PASTILLE : UNE SEULE, ET SA GÉOMÉTRIE EST DÉCLARATIVE ══\n');
{
  vrai('la pastille existe dans le balisage', /<span class="tab-cur" id="tab-cur" aria-hidden="true">/.test(APP));
  vrai('⛔ elle est muette pour un lecteur d’écran', /class="tab-cur"[^>]*aria-hidden="true"/.test(APP));
  /* ⛔ LA PREUVE NÉGATIVE D'ABORD : plus aucune mesure recopiée. C'est elle qui rendait le
     résultat bon une fois sur deux, et une rustine de plus l'aurait masquée sans la corriger. */
  vrai('⛔⛔ plus aucune largeur RECOPIÉE depuis un onglet',
    !/cur\.style\.width\s*=\s*on\.offsetWidth/.test(NU) && !/cur\.style\.transform[^\n]*offsetLeft/.test(NU));
  /* ⚠ On vise les rustines de LA PASTILLE, pas tout `ResizeObserver` du fichier : une autre
     fonctionnalité a parfaitement le droit d'en poser un. */
  vrai('⛔ … et plus d’observateur de taille pour rattraper une mesure périmée',
    !/tabCurObserver|_tabCurObs|tabCurRepositionner/.test(NU));
  vrai('le JavaScript ne pose qu’un NUMÉRO de colonne',
    /setProperty\('--tab-i',i\)/.test(NU) && /setProperty\('--tab-n',tabs\.length\)/.test(NU));
  vrai('⛔ et le décalage du doigt, en pixels', /setProperty\('--tab-dx',\(decalage\|\|0\)\+'px'\)/.test(NU));
  vrai('⛔ pas d’onglet actif = pas de pastille (elle ne reste pas sur le dernier connu)',
    /if\(i<0\|\|!tabs\.length\)\{ bar\.classList\.remove\('cur-on'\); return; \}/.test(NU));
}

console.log('\n══ 2. LE STYLE : la colonne se déduit, elle ne se copie pas ══\n');
{
  const { i0, css } = bloc('NAVIGATION — barre d\'onglets, tiroir, sidebar de bureau');
  vrai('⛔ le bloc de navigation est trouvé (sinon tout ce qui suit est creux)', i0 > 0);
  vrai('   … et il a de la matière', css.length > 2500, css.length + ' caractères');
  vrai('la barre porte les quatre variables de la pastille',
    /\.tabbar\{--tab-n:4;--tab-i:0;--tab-gout:2px;--tab-px:8px;--tab-py:6px;--tab-dx:0px\}/.test(css));
  vrai('⛔ la largeur se CALCULE depuis le nombre d’onglets',
    /width:calc\(\(100% - 2\*var\(--tab-px\) - \(var\(--tab-n\) - 1\)\*var\(--tab-gout\)\) \/ var\(--tab-n\)\)/.test(css));
  /* ⚠ `translateX` en pourcentage se rapporte à la largeur de l'ÉLÉMENT, c'est-à-dire
     exactement une colonne : d'où le déplacement sans un seul chiffre en dur. */
  /* ⛔⛔ LA POSITION VIT DANS `translate`, PLUS DANS `transform` — 23 septembre 2026. Tenue en
     main, la bulle grossit par la propriété `scale` ; or les propriétés individuelles passent
     AVANT `transform` : un `transform:translateX(D)` était donc multiplié par l'échelle, et la
     bulle prenait sur le doigt un retard qui croissait avec la distance (8,5 px à deux
     onglets, relevé image par image par `scratchpad/sonde-geste.js`). Le principe gardé ici ne
     change pas : la colonne se DÉDUIT de son numéro, sans un chiffre en dur. */
  vrai('⛔ … et la position aussi, sans un chiffre en dur (dans `translate`, que `scale` ne multiplie pas)',
    /translate:calc\(var\(--tab-i\) \* \(100% \+ var\(--tab-gout\)\) \+ var\(--tab-dx\)\)/.test(css));
  vrai('la transition porte sur la position ET la largeur (la barre peut changer de nombre d’onglets)',
    /transition:translate \.42s cubic-bezier\(\.32,\.72,0,1\),width \.42s cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ elle porte NOTRE accent, pas un gris neutre',
    /\.tab-cur\{[\s\S]{0,420}background:color-mix\(in srgb,var\(--acc\) 16%,transparent\)/.test(css));
  vrai('⛔ sur verre elle devient une CAPSULE, comme la barre qui la porte (concentricité)',
    /html\[data-verre="1"\]\[data-kind="mobile"\] \.tab-cur\{[\s\S]{0,120}border-radius:999px/.test(css));
  vrai('⛔ … et la marge de la pilule est reprise, sinon la pastille déborde',
    /html\[data-verre="1"\]\[data-kind="mobile"\] \.tabbar\{--tab-px:6px;--tab-py:6px\}/.test(css));
  /* ⛔⛔ LA BARRE PRENAIT 10,1 % DE L'ÉCRAN D'UN IPHONE, ET C'EST MESURÉ. Justin, 22 septembre
     2026 : « fais-la un peu plus petite, elle prend beaucoup de place sur l'écran ». La cause
     n'était pas la barre mais `.tab`, qui désigne DEUX choses dans ce fichier — les onglets de
     filtre (`padding:10px 14px!important`, pensé pour du texte) et les boutons de la barre du
     bas. Vingt pixels de rembourrage vertical sous une icône de 22.
     Mesuré après : 86 px → 68, soit 8,0 % de l'écran. Et le bouton reste à 44, le plancher
     tactile — c'est LUI qui fixe la hauteur maintenant, on ne descend pas en dessous. */
  vrai('⛔⛔ le bouton de la BARRE a son propre rembourrage, pas celui d’un onglet de filtre',
    /html\[data-refonte\] \.tabbar \.tab\{padding:4px 2px!important/.test(css));
  vrai('⛔ … et il garde le plancher tactile de 44 px',
    /html\[data-refonte\] \.tabbar \.tab\{[^}]*min-height:44px!important/.test(css));
  /* ⛔ DEUX SURFACES POUR UNE MÊME CHOSE FERAIENT UN HALO AUTOUR D'UN HALO. */
  vrai('⛔ l’onglet actif n’a PLUS de fond à lui', !/\.tab\.on\{background:rgba\(255,255,255,\.82\)\}/.test(css));
  vrai('⛔ les onglets passent au-dessus d’elle (sinon elle couvre l’icône qu’elle désigne)',
    /\.tab\{z-index:1\}/.test(css));
  vrai('⛔ le mouvement réduit ne laisse que le fondu',
    /@media \(prefers-reduced-motion: reduce\)\{ \.tab-cur\{transition:opacity/.test(css));
}

console.log('\n══ 3. LE GESTE : le TACTILE, pas le pointeur ══\n');
{
  /* ⛔⛔ LA LEÇON QUI COÛTE : `pointercancel` arrive au PREMIER mouvement horizontal, parce
     que le navigateur reprend la main pour le défilement. Les `touchmove`, eux, continuent. */
  vrai('⛔⛔ le départ du geste écoute le TACTILE',
    /zone\.addEventListener\('touchstart',e=>\{ const t=e\.touches&&e\.touches\[0\]/.test(NU));
  vrai('⛔ le mouvement aussi', /zone\.addEventListener\('touchmove',e=>\{ const t=e\.touches&&e\.touches\[0\]/.test(NU));
  vrai('⛔ le relâchement aussi', /zone\.addEventListener\('touchend',relacher/.test(NU));
  vrai('la souris garde le pointeur (fenêtre de bureau rétrécie)',
    /addEventListener\('pointerdown',e=>\{\s*if\(e\.pointerType!=='mouse'/.test(NU));
  /* ⛔ `pointercancel` N'ANNULE RIEN : il arrive à chaque geste horizontal. C'est
     `touchcancel` qui dit vraiment que le doigt a été perdu. */
  vrai('⛔ seul touchcancel annule le geste, jamais pointercancel',
    /zone\.addEventListener\('touchcancel'/.test(NU) && !/zone\.addEventListener\('pointercancel'/.test(NU));
  /* ⛔ L'écouteur est sur le DOCUMENT : `#content` ne couvre pas l'écran (mesuré : −390 → 900,
     et `elementFromPoint` rendait HTML au milieu de la page). */
  vrai('⛔⛔ il s’écoute sur le document, pas sur #content',
    /function ongletsGeste\(\)\{\s*const zone=document;/.test(NU));
}

console.log('\n══ 4. LES TROIS GARDES DU GESTE ══\n');
{
  vrai('⛔ le défilement LATÉRAL garde le doigt (planning, filtres, tableaux)',
    /function swipeDefileH\(n\)\{[\s\S]{0,400}\/auto\|scroll\/\.test\(st\.overflowX\) && n\.scrollWidth>n\.clientWidth\+4/.test(NU));
  /* ⛔⛔ ET SURTOUT QU'ELLE SOIT APPELÉE. La mutation « le défilement latéral perd sa garde »
     ne faisait tomber AUCUN des 48 contrôles : le banc gardait l'EXISTENCE de la fonction, pas
     son emploi. On pouvait donc la laisser en place et ne jamais s'en servir — le planning
     aurait perdu son défilement, et le banc serait resté vert.
     Quand une mutation ne casse rien, la question n'est pas « le code est-il bon » mais
     « qu'est-ce que le banc ne REGARDE pas ». Ici : le site d'appel. */
  vrai('⛔⛔ … et elle est VRAIMENT consultée au départ du geste',
    /const debut=\(x,y,cible\)=>\{[\s\S]{0,600}if\(swipeDefileH\(cible\)\) return;/.test(NU));
  vrai('⛔ … tout comme la liste des zones écartées',
    /const debut=\(x,y,cible\)=>\{[\s\S]{0,600}if\(swipeExclu\(cible\)\) return;/.test(NU));
  /* ⚠️ CE CONTRÔLE A CHANGÉ LE 22 SEPTEMBRE 2026, ET C'EST LA LEÇON QU'IL PORTE.
     Il exigeait `#tabbar` dans la liste des zones écartées — c'était la décision d'alors.
     Justin, deux fois : « le glissement du doigt SUR LA BARRE marche toujours pas ». Mesuré
     avec de vrais événements tactiles : glisser sur le contenu marchait, glisser sur la
     barre ne faisait RIEN — et c'est là que le doigt va, la pastille est sous lui.
     Un banc qui garde une décision périmée bloque la correction et a l'air d'avoir raison.
     Il est donc RECENTRÉ : on garde ce qui reste écarté pour une vraie raison (un tiroir,
     un voile, un panneau, la barre du haut ne sont pas des rubriques qu'on parcourt), et on
     exige que la barre, elle, ne le soit PLUS. Voir `tests/test-764.js`.
     ⚠️ ET IL A RECHANGÉ LE 23 SEPTEMBRE 2026 — même leçon, dans l'autre sens. Justin, au
     doigt : « ça marche, mais ça fait pas du tout comme sur Instagram ; je voudrais qu'on
     soit appuyé sur la bulle et qu'on la déplace avec le doigt ». Le balayage de PAGE poussait
     la pastille à l'opposé du doigt. La barre a désormais SON geste (`ongletsBulle`) : elle
     RETOURNE dans la liste, parce que deux machines sur un même doigt navigueraient deux fois.
     Le contrôle n'exige donc plus « pas écartée » mais « écartée ET dotée de son propre
     geste » — une barre écartée SANS geste, c'est le défaut du 22, et il retomberait rouge. */
  const HORS758=(NU.match(/const SWIPE_HORS=\[([^\]]*)\]/)||[])[1]||'';
  vrai('population : la liste des zones écartées est trouvée', HORS758.length>10);
  vrai('⛔ la barre d’onglets est écartée du balayage de PAGE (elle a son propre geste)',
    /'#tabbar'/.test(HORS758));
  vrai('⛔⛔ … et ce geste existe bien, posé avec la barre (sinon c’est le défaut du 22 : rien ne bouge)',
    /function ongletsBulle\(bar\)\{/.test(NU) && /ongletsPresse\(bar\);\s*ongletsBulle\(bar\);/.test(NU));
  vrai('⛔ le tiroir, les voiles, la connexion et la barre du haut restent écartés',
    ["'.sidebar'","'#overlay'","'#overlay2'","'#login'","'.topbar'","'.creer-ov'"]
      .every(s=>HORS758.includes(s)));
  /* La bulle d'aide Leia a été retirée le 23 septembre 2026 : une zone écartée qui n'existe plus
     serait un sélecteur qui ne trouve rien — l'entrée part avec elle. */
  vrai('… et plus d’entrée pour la bulle d’aide retirée', !HORS758.includes("'#assistant'"));
  vrai('⛔ une fenêtre ouverte coupe le geste',
    /if\(document\.getElementById\('overlay'\) && document\.getElementById\('overlay'\)\.classList\.contains\('open'\)\) return;/.test(NU));
  /* ⛔ LA DOMINANCE, PAS SEULEMENT LA DISTANCE : un défilement vertical commence toujours par
     quelques pixels de travers. Sans elle, faire défiler changerait de rubrique. */
  /* ⚠ LA FORME A CHANGÉ LE 22 SEPTEMBRE 2026 AU SOIR, ET C'ÉTAIT UN CORRECTIF, PAS UN
     RANGEMENT : l'ancienne abandonnait sur |dy| >= |dx|, donc au premier frémissement du
     pouce. Le détail est dans la section 7 ; ici on garde le COMPORTEMENT, des deux côtés. */
  vrai('⛔ un défilement vertical FRANC désarme le geste',
    /if\(ay>=SWIPE_ENGAGE && ay>ax\*SWIPE_DOMINANCE\)\{ actif=false; return; \}/.test(NU));
  vrai('⛔ … et l’horizontale doit DOMINER pour s’engager', /ax<ay\*SWIPE_DOMINANCE\) return;/.test(NU));
  vrai('⛔ en deçà de 12 px c’est un tap, pas un balayage', /const SWIPE_ENGAGE=12, SWIPE_DOMINANCE=1\.3/.test(NU));
}

console.log('\n══ 5. LA DÉCISION : la vélocité compte autant que la distance ══\n');
{
  /* La projection d'Apple (« Designing Fluid Interfaces ») : où le doigt AURAIT emmené
     l'objet. Un seuil de distance seul donne un geste tantôt trop mou, tantôt trop dur. */
  vrai('⛔ le point d’arrivée se PROJETTE, comme le défilement d’iOS',
    /function swipeProjeter\(vitesse\)\{ return \(vitesse\/1000\)\*SWIPE_DECEL\/\(1-SWIPE_DECEL\); \}/.test(NU));
  vrai('⛔ … et la décision se prend sur distance PLUS projection',
    /const arrivee=dx\+swipeProjeter\(vitesse\)/.test(NU));
  vrai('⛔ « Plus » n’est pas une rubrique : on ne balaye pas vers un tiroir',
    /const vues=l\.filter\(k=>k && k!=='_plus'\)/.test(NU));
  vrai('⛔ aux deux bouts, la pastille revient en place au lieu de sortir',
    /if\(k<0\|\|k>=vues\.length\)\{ tabCurPlacer\(true,0\); return; \}/.test(NU));
  /* Le sens de l'écran suit le sens du doigt : sinon le mouvement contredit la main. */
  vrai('⛔ l’écran entre du côté d’où vient le doigt',
    /_sensForce = aller>0 \? 'avant' : 'retour'/.test(NU));
  vrai('⛔ … et go() le consomme tout de suite (gardé, il enverrait la suivante du même côté)',
    /const _sens=_sensForce\|\|\(_retour\?'retour':''\); _sensForce='';/.test(NU));
  vrai('la pastille suit le doigt pendant le geste', /tabCurPlacer\(false,p\)/.test(NU));
  vrai('⛔ … bornée à un onglet (sinon elle sortirait de la barre)',
    /const p=Math\.max\(-largeur,Math\.min\(largeur, -dx\*0\.55\)\)/.test(NU));
}

console.log('\n══ 6. LA BARRE NE SE RÉÉCRIT PAS POUR RIEN ══\n');
{
  vrai('⛔ une signature évite la réécriture (sinon la pastille est détruite et SAUTE)',
    /const _sig = ongletsLire\(\)\.join\(','\);/.test(NU) && /if\(bar\.dataset\.sig===_sig && bar\.querySelector\('\.tab'\)\)/.test(NU));
  vrai('⛔ … et le raccourci replace la pastille EN ANIMANT', /tabCurPlacer\(true\);\s*return;\s*\}/.test(NU));
  vrai('la pastille est remise si une réécriture l’a emportée', /function tabCurPoser\(bar\)\{/.test(NU));
}

console.log('\n══ 7. L’ÉCRAN PREND TOUTE LA LARGEUR ══\n');
{
  /* Justin, capture à l'appui : « quand la barre est repliée, l'écran est décalé et ça ne
     prend pas tout l'écran ». Mesuré sur 2 000 px : #content s'arrêtait à 1 796. */
  vrai('⛔⛔ plus de plafond de largeur sur le contenu',
    !/html\[data-refonte\] \.content\{max-width:1560px\}/.test(NU));
  vrai('⛔ … et aucun autre plafond ne l’a remplacé',
    !/\.content\{[^}]*max-width:\s*\d+px/.test(NU));
  /* Le plafond avait sa raison — une ligne de texte de 1 800 px ne se lit plus — mais cette
     application affiche des cartes, des grilles et un planning, qui bornent déjà LEUR texte. */
  vrai('la marge latérale du bureau est conservée', /html\[data-refonte\]\{--rf-marge:34px\}/.test(NU));
}

console.log('\n══ 8. LES LIBELLÉS D’ONGLET ══\n');
{
  vrai('⛔ un libellé tronqué ne nomme rien : la table d’abréviations existe',
    /const ONGLET_COURT=\{dashboard:'Accueil',interventions:'Interv\.'/.test(NU));
  vrai('⛔ et le nom COMPLET reste pour un lecteur d’écran',
    /aria-label="\$\{esc\(t\(it\.l\)\)\}"[\s\S]{0,200}ongletCourt\(k,t\(it\.l\)\)/.test(NU));
  vrai('⛔ on ne descend pas sous 10 px (plancher lisible au soleil, avec des gants)',
    /\.tab-l\{font-size:10px/.test(NU));
}


console.log('\n══ 6. L’APPUI LONG ET LA FEUILLE DE RÉGLAGE ══\n');
/* ⛔⛔ UNE FEUILLE QUI SE RÉÉCRIT POUR CHANGER UN CHIFFRE JETTE LA POSITION DE LECTURE.
   Justin, 22 septembre 2026 : « quand je décoche ça me remonte à chaque fois en haut, et
   quand je coche un autre truc ça me remonte encore en haut ». Mesuré au navigateur : la
   liste des rubriques fait 3 051 px dans une fenêtre de 443 — SEPT écrans — et chaque bascule
   perdait 1 620 px, c'est-à-dire renvoyait tout en haut. Il fallait redescendre sept écrans
   entre deux choix.
   La cause tenait en une ligne : `ongletsBascule` rappelait `openModal(ongletsHtml())`, et
   `openModal` fait `innerHTML=` puis `scrollTop=0`.
   ⚠️ Le comportement est mesuré dans `scratchpad/sonde-repeint.js` (19 ✓ 0 ✗, sur la vraie
   feuille) : défilement conservé au pixel, renumérotation juste, voile levé, compteur suivi. */
{
  const corpsDe = (nom) => { const i = NU.indexOf('function ' + nom + '('); if (i < 0) return '';
    const b = ['\nfunction ', '\nviews.', '\nconst ', '\nlet ', '\nvar ']
      .map(x => NU.indexOf(x, i + 10)).filter(x => x > 0);
    return NU.slice(i, b.length ? Math.min(...b) : i + 2000); };

  const bas = corpsDe('ongletsBascule');
  vrai('⛔ la fonction de bascule est trouvée (sinon tout ce qui suit est creux)', bas.length > 120, bas.length + ' car');
  vrai('⛔⛔ elle ne RÉÉCRIT plus la feuille — c’est ça qui renvoyait en haut',
    !/openModal\(/.test(bas), bas.slice(0, 260));
  vrai('⛔ … elle REPEINT', /ongletsRepeindre\(\)/.test(bas));
  vrai('⛔ et « Réinitialiser » non plus ne réécrit pas',
    !/openModal\(/.test(corpsDe('ongletsDefaut')) && /ongletsRepeindre\(\)/.test(corpsDe('ongletsDefaut')));

  const rep = corpsDe('ongletsRepeindre');
  vrai('⛔ la fonction de repeint est trouvée', rep.length > 200, rep.length + ' car');
  /* ⛔⛔ TOUTES LES LIGNES, PAS CELLE QU'ON TOUCHE. Retirer la 2ᵉ rubrique RENUMÉROTE la 3ᵉ et
     la 4ᵉ, et le voile « plein » tombe sur les 38 autres. Un repeint qui ne viserait que la
     ligne cliquée laisserait l'écran faux — et faux en silence. */
  vrai('⛔⛔ il repasse sur TOUTES les lignes (la renumérotation touche les suivantes)',
    /querySelectorAll\('#modal \.pl-row\[data-onglet\]'\)/.test(rep));
  vrai('⛔ il renumérote (le rang est CALCULÉ depuis la position, pas figé)',
    /textContent\s*=\s*pris\s*\?\s*String\(i\s*\+\s*1\)/.test(rep), rep.slice(rep.indexOf('textContent'), rep.indexOf('textContent')+70));
  vrai('⛔ il lève ou repose le voile « plein » (il est porté par les 38 AUTRES lignes)',
    /style\.opacity/.test(rep) && /plein/.test(rep));
  vrai('⛔ il met le compteur à jour', /og-compte/.test(rep));
  vrai('⛔ … et l’état annoncé aux lecteurs d’écran', /aria-pressed/.test(rep));
  /* ⛔ IL NE TOUCHE AUCUN NŒUD DE STRUCTURE : c'est ce qui garantit que le défilement, la
     position de la liste et le focus survivent. Un `innerHTML=` ici et tout le correctif
     s'annule en silence. */
  vrai('⛔⛔ il n’écrit AUCUNE structure (innerHTML, remove, appendChild)',
    !/innerHTML|\.remove\(\)|appendChild|replaceChildren/.test(rep), rep.slice(0, 300));

  /* ⛔ LE TEXTE DU COMPTEUR N'A QU'UNE SEULE SOURCE. Deux copies — une dans le gabarit, une
     dans le repeint — diraient un jour deux choses différentes, et c'est le genre d'écart que
     personne ne remarque avant un client. */
  vrai('⛔ le libellé du compteur n’est écrit qu’à UN endroit',
    /function ongletsCompteTxt\(/.test(NU)
    && (NU.match(/ongletsCompteTxt\(/g) || []).length >= 3,
    (NU.match(/ongletsCompteTxt\(/g) || []).length + ' emplois');

  /* ⛔ LES DEUX ANCRES QUE LE REPEINT CHERCHE DOIVENT EXISTER DANS LE GABARIT. Sans elles il
     ne trouve rien, ne repeint rien, et passe au vert sur du néant. */
  const html = corpsDe('ongletsHtml');
  vrai('⛔ le gabarit pose bien la clé que le repeint cherche', /data-onglet="\$\{it\.k\}"/.test(html));
  vrai('⛔ … et la classe du rang', /class="og-rang"/.test(html));
  vrai('⛔ … et l’identifiant du compteur', /id="og-compte"/.test(html));

  /* L'appui long lui-même : 550 ms, et le clic de fin ne doit pas partir en navigation. */
  const pr = corpsDe('ongletsPresse');
  vrai('⛔ l’appui long est branché sur la barre et ouvre la feuille',
    /formOnglets\(\)/.test(pr) && /550/.test(pr));
  vrai('⛔ … et le clic qui termine l’appui est avalé (sinon on change de rubrique en lâchant)',
    /if\(long\)\{ e\.preventDefault\(\); e\.stopPropagation\(\)/.test(pr));
  vrai('⛔ … les écouteurs ne s’empilent pas', /bar\._presse/.test(pr));
}


console.log('\n══ 7. ON N’ÉLIMINE UN GESTE QU’UNE FOIS L’INTENTION CLAIRE ══\n');
/* ⛔⛔ LA RÈGLE D’ABANDON TUAIT LE BALAYAGE AU PREMIER FRÉMISSEMENT DU POUCE.
   Justin, 22 septembre 2026, vidéo à l’appui : « le glissement ne marche pas ». La règle
   abandonnait dès que |dy| dépassait 12 ET valait au moins |dx| — c’est-à-dire au premier
   échantillon d’un pouce, puisqu’un pouce DÉCOLLE avant de partir de côté. Et l’abandon était
   DÉFINITIF : le reste de la course, même franchement horizontal, ne comptait plus.
   Mesuré en rejouant le geste avec la dérive d’une vraie main (`scratchpad/diag-doigt.js`) :
   le balayage passait jusqu’à 11° d’angle et mourait au-delà. Après : 18°, à toutes les
   longueurs de course (160, 250, 320 px) — et un vrai défilement vertical ne change toujours
   rien, 3 essais sur 3.
   C’est ce qu’Apple dit de ne pas faire (Designing Fluid Interfaces §10) : reconnaître les
   gestes EN PARALLÈLE, n’éliminer les perdants qu’une fois l’intention claire. */
{
  const corpsDe = (nom) => { const i = NU.indexOf('function ' + nom + '('); if (i < 0) return '';
    const b = ['\nfunction ', '\nviews.', '\nconst ', '\nlet ', '\nvar ']
      .map(x => NU.indexOf(x, i + 10)).filter(x => x > 0);
    return NU.slice(i, b.length ? Math.min(...b) : i + 2600); };

  for (const [nom, quoi] of [['ongletsGeste','la barre du bas'], ['segGeste','le segmenté']]) {
    const c = corpsDe(nom);
    vrai('⛔ ' + quoi + ' : la fonction est trouvée', c.length > 300, nom + ' → ' + c.length + ' car');
    /* ⛔ L'ANCIENNE FORME NE DOIT PLUS EXISTER : c'est elle qui tuait le geste. */
    vrai('⛔⛔ ' + quoi + ' : il n’abandonne plus sur |dy| >= |dx| (le frémissement du pouce)',
      !/Math\.abs\(dy\)>SWIPE_ENGAGE && Math\.abs\(dy\)>=Math\.abs\(dx\)/.test(c), c.slice(0, 200));
    /* ⛔ TROIS ÉTATS, ET LE PREMIER EST « ON NE SAIT PAS ENCORE ». Sans lui, tout échantillon
       oblige à trancher, et trancher trop tôt c'est trancher au hasard. */
    vrai('⛔ ' + quoi + ' : il ATTEND tant que rien n’est significatif',
      /if\(ax<SWIPE_ENGAGE && ay<SWIPE_ENGAGE\) return;/.test(c));
    /* ⛔ LA DOMINANCE DES DEUX CÔTÉS — c'est elle qui protège le défilement vertical. Sans le
       facteur, un défilement un peu de travers volerait le geste à la page. */
    vrai('⛔⛔ ' + quoi + ' : il n’abandonne QUE sur un vertical FRANC (même dominance)',
      /if\(ay>=SWIPE_ENGAGE && ay>ax\*SWIPE_DOMINANCE\)\{ actif=false; return; \}/.test(c));
    vrai('⛔ ' + quoi + ' : et il ne s’engage QUE sur un horizontal franc',
      /if\(ax<SWIPE_ENGAGE \|\| ax<ay\*SWIPE_DOMINANCE\) return;/.test(c));
  }
  /* Les deux seuils restent partagés : deux copies donneraient deux gestes qui ne se
     ressemblent plus, sur le même écran. */
  vrai('⛔ les deux gestes partagent les mêmes seuils',
    /const SWIPE_ENGAGE=12, SWIPE_DOMINANCE=1\.3/.test(NU));
}

console.log('\n═══ test-758 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
