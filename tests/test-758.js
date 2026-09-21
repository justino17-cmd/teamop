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
  vrai('⛔ … et la position aussi, sans un chiffre en dur',
    /transform:translateX\(calc\(var\(--tab-i\) \* \(100% \+ var\(--tab-gout\)\) \+ var\(--tab-dx\)\)\)/.test(css));
  vrai('la transition porte sur transform ET width (la barre peut changer de nombre d’onglets)',
    /transition:transform \.42s cubic-bezier\(\.32,\.72,0,1\),width \.42s cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ elle porte NOTRE accent, pas un gris neutre',
    /\.tab-cur\{[\s\S]{0,420}background:color-mix\(in srgb,var\(--acc\) 16%,transparent\)/.test(css));
  vrai('⛔ sur verre elle devient une CAPSULE, comme la barre qui la porte (concentricité)',
    /html\[data-verre="1"\]\[data-kind="mobile"\] \.tab-cur\{[\s\S]{0,120}border-radius:999px/.test(css));
  vrai('⛔ … et la marge de la pilule est reprise, sinon la pastille déborde',
    /html\[data-verre="1"\]\[data-kind="mobile"\] \.tabbar\{--tab-px:7px;--tab-py:7px\}/.test(css));
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
  vrai('⛔ la barre, le tiroir, les fenêtres et l’assistant sont écartés',
    /const SWIPE_HORS=\['#tabbar','\.sidebar','#overlay','#overlay2','#assistant','#login','\.topbar','\.creer-ov'\]/.test(NU));
  vrai('⛔ une fenêtre ouverte coupe le geste',
    /if\(document\.getElementById\('overlay'\) && document\.getElementById\('overlay'\)\.classList\.contains\('open'\)\) return;/.test(NU));
  /* ⛔ LA DOMINANCE, PAS SEULEMENT LA DISTANCE : un défilement vertical commence toujours par
     quelques pixels de travers. Sans elle, faire défiler changerait de rubrique. */
  vrai('⛔ un défilement vertical désarme le geste',
    /if\(Math\.abs\(dy\)>SWIPE_ENGAGE && Math\.abs\(dy\)>=Math\.abs\(dx\)\)\{ actif=false; return; \}/.test(NU));
  vrai('⛔ … et l’horizontale doit DOMINER', /Math\.abs\(dx\)<Math\.abs\(dy\)\*SWIPE_DOMINANCE/.test(NU));
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

console.log('\n═══ test-758 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
