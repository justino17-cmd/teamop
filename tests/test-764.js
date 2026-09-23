/* ══ v722 — LE GESTE SUR LA BARRE, ET LES DEUX BOUTONS QUI SE MARCHAIENT DESSUS ═════════
   Justin, 22 septembre 2026, deux fois : « le glissement du doigt sur la barre marche
   toujours pas », et, capture à l'appui, « encore un bug d'affichage ».

   DEUX DÉFAUTS, MESURÉS AU NAVIGATEUR AVEC DE VRAIS ÉVÉNEMENTS TACTILES :

   1. ⛔ LA BARRE ÉTAIT EXCLUE DU GESTE, ET C'EST LÀ QUE LE DOIGT VA. `#tabbar` figurait dans
      `SWIPE_HORS`. Glisser sur le CONTENU marchait dans les deux sens ; glisser sur la
      BARRE ne faisait **rien**. Rien ne le disait à l'écran : la pastille est là, sous le
      doigt, elle a l'air de se prendre — et elle ne bouge pas.
      ⚠️ Corollaire : un balayage qui FINIT sur un onglet déclenche le `click` de cet onglet.
      Le geste dit « un cran à droite », le clic dit « va sur Boxes » — deux navigations pour
      un seul geste, et c'est la seconde qui gagne. On avale donc le clic qui suit un
      balayage ENGAGÉ, et seulement celui-là : un tap n'est jamais engagé (il faut 12 px).

   2. ⛔ DEUX BOUTONS FLOTTANTS DANS LE MÊME COIN, et c'est le plus haut qui gagne. Sur le
      Planning, « Voir sur la carte » (153×44, z-index 900) se posait sur la bulle
      d'assistance (58×58, z-index 46) : bulle **recouverte à 83 %** et **INATTEIGNABLE**.
      Sur Accueil et Interventions la même bulle est atteignable et couverte à 3 % — c'est la
      COMPARAISON qui désigne le Planning, pas une impression.

   ⚠️ UN FAUX DÉFAUT ÉCARTÉ, NOMMÉ POUR QU'IL NE REVIENNE PAS : « le geste ne marche que dans
   un sens ». Il marche dans les deux — le premier essai glissait vers la droite DEPUIS LE
   PREMIER ONGLET, où il n'y a rien à gauche. Un banc qui aurait « corrigé » ça aurait ajouté
   une navigation circulaire que personne n'a demandée.

   ⛔⛔ ET LE 23 SEPTEMBRE 2026, LA BARRE A CHANGÉ DE GESTE. Justin, au doigt : « ça marche,
   mais ça fait pas du tout comme sur Instagram. Moi je voudrais qu'on soit appuyé sur la
   bulle et qu'on déplace la bulle avec notre doigt. Là on glisse comme si on descendait sur
   une page Internet. » Le balayage de PAGE poussait la pastille à l'OPPOSÉ du doigt — juste
   pour une page, contre-nature pour un objet qu'on tient. La barre a désormais son geste à
   elle, `ongletsBulle` : on attrape la bulle, elle suit la main, et l'onglet sous elle est
   celui qu'on obtient. Le balayage de page reste sur le CONTENU. La section 1 dit donc
   l'inverse de ce qu'elle disait la veille — et la section 6 garde la bulle.

   ⛔ Ce fichier garde le CÂBLAGE. Le geste lui-même se mesure au navigateur
   (`scratchpad/sonde-geste.js`), parce qu'un balayage est une suite d'événements dans le
   temps et qu'aucune expression régulière ne joue ça.                                     */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);
const faux=(t,c)=>v(t,!!c,false);

/* ⛔ On vise du CODE, sur un texte dont les commentaires de bloc en début de ligne sont
   retirés — ce dépôt nomme ses fonctions dans les commentaires qui les expliquent. */
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');

console.log('\n══ 0. LA POPULATION EXISTE ══\n');
vrai('le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(NU));
const HORS=(NU.match(/const SWIPE_HORS=\[([^\]]*)\]/)||[])[1];
vrai('la liste d’exclusion est trouvée', !!HORS);

console.log('\n══ 1. ⛔ LA BARRE A SON PROPRE GESTE — LE BALAYAGE DE PAGE N’Y PART PLUS ══\n');
/* ⚠️ Ce contrôle disait l'inverse le 22 septembre (« `#tabbar` n'est plus exclu »), et c'était
   juste ce jour-là : la barre n'avait AUCUN geste à elle. Depuis le 23 elle a la bulle, et
   deux machines sur le même doigt navigueraient deux fois — la page poussant la bulle dans
   le sens contraire de la main qui la tient. Une barre exclue SANS geste reste le défaut du
   22 : la section 6 exige que la bulle existe. */
vrai('⛔ `#tabbar` est écarté du balayage de PAGE (la bulle a le sien)', /'#tabbar'/.test(HORS||''));
/* ⚠️ Ce qui reste exclu l’est pour une vraie raison : un tiroir, un voile, un panneau et la
   barre du haut ne sont pas des rubriques qu’on parcourt. Les retirer ferait naviguer
   pendant qu’on fait autre chose. */
['.sidebar','#overlay','.topbar'].forEach(s=>
  vrai(`… et « ${s} » reste exclu (ce n’est pas une rubrique qu’on parcourt)`, (HORS||'').includes(s)));
/* La bulle d'aide Leia (`#assistant`) a été retirée le 23 septembre 2026 : son entrée part avec elle. */
vrai('… et la bulle d’aide retirée n’y est plus', !(HORS||'').includes('#assistant'));

console.log('\n══ 2. ⛔ LE CLIC QUI SUIT UN BALAYAGE EST AVALÉ ══\n');
const GESTE=(()=>{ const d=NU.indexOf('function ongletsGeste(){');
  if(d<0) return ''; const f=NU.indexOf('\nfunction ',d+10); return NU.slice(d, f>0?f:d+9000); })();
vrai('population : le corps de ongletsGeste est trouvé', GESTE.length>2000);
vrai('⛔ un horodatage marque la fin d’un balayage ENGAGÉ', /finBalayage=Date\.now\(\)/.test(GESTE));
vrai('… il n’est posé QUE dans relacher(), après le test d’engagement',
  /if\(!engage\)\{ actif=false; return; \}\s*finBalayage=Date\.now\(\)/.test(GESTE.replace(/\s*\n\s*/g,' ')));
vrai('⛔ un écouteur de clic en CAPTURE le lit', /addEventListener\('click'[\s\S]{0,400}?,true\)/.test(GESTE));
vrai('… et il n’avale que ce qui touche la barre', /closest\('#tabbar'\)/.test(GESTE));
vrai('… et seulement juste après le geste (fenêtre courte)', /Date\.now\(\)-finBalayage>\d{2,3}/.test(GESTE));
vrai('⛔ il empêche vraiment la navigation du clic (les onglets ont un onclick en ligne)',
  /preventDefault\(\);\s*e\.stopPropagation\(\)/.test(GESTE));

console.log('\n══ 2 bis. ⛔ UN GESTE, UNE SEULE NAVIGATION ══\n');
/* Le défaut le plus coûteux des deux, et le moins visible : pile d'appel à l'appui, le
   balayage faisait `go('dashboard')`, puis le navigateur traitait le MÊME mouvement
   horizontal comme SON geste « retour » — `popstate` → `goBack()` → retour à la rubrique de
   départ. À l'écran : « ça ne marche pas », alors que ça marche et se fait annuler.
   ⚠️ On n'a PAS coupé le geste du navigateur (`overscroll-behavior-x`) : tout le bloc
   d'historique existe pour que le retour système marche. On ignore le DOUBLON, pas la porte. */
vrai('⛔ le balayage se signale au niveau global (l’historique vit dans un autre bloc)',
  /window\._balayageFin=finBalayage/.test(GESTE));
{ const t=NU.replace(/\s*\n\s*/g,' ');
  const d=t.indexOf("addEventListener('popstate'");
  vrai('population : l’écouteur de popstate est trouvé', d>0);
  const bloc=t.slice(d, d+900);
  vrai('⛔ il ignore un popstate qui suit un balayage', /window\._balayageFin\|\|0/.test(bloc));
  vrai('… dans une fenêtre courte, pas pour toujours', /<\s*\d{3}\)/.test(bloc));
  /* ⚠️ On borne sur le dÉBUT du garde et sur la ligne qui le SUIT — pas sur le premier
     `return;` venu : il y en a un plus haut (`if(nous)`), et la tranche s'arrêtait avant le
     `pushState`. Une tranche mal bornée rend un verdict faux, c'est la règle du dépôt. */
  const d2=bloc.indexOf('window._balayageFin'), f2=bloc.indexOf('var pile=');
  vrai('population : le garde est borné des deux côtés', d2>0 && f2>d2);
  vrai('⛔ … et il REMET l’entrée ignorée (sinon l’historique prend un cran de retard)',
       d2>0 && f2>d2 && /history\.pushState/.test(bloc.slice(d2,f2)));
  vrai('… le retour système ordinaire passe toujours', /goBack\(\)/.test(bloc)); }
faux('⛔ on n’a PAS coupé le geste du navigateur à la racine',
  /html\{[^}]*overscroll-behavior-x:\s*(none|contain)/.test(NU.replace(/\s*\n\s*/g,'')));

console.log('\n══ 3. LE GESTE RESTE CE QU’IL ÉTAIT AILLEURS ══\n');
vrai('⛔ il s’écoute toujours sur le DOCUMENT, pas sur #content',
  /const zone=document;/.test(GESTE));
vrai('⛔ le TACTILE reste la source pour un doigt (le pointeur est annulé au 1ᵉʳ mouvement)',
  /addEventListener\('touchmove'/.test(GESTE) && /addEventListener\('touchstart'/.test(GESTE));
vrai('… et le POINTEUR reste réservé à la souris', /pointerType!=='mouse'/.test(GESTE));
vrai('⛔ « Plus » n’est toujours pas une destination de balayage', /k!=='_plus'/.test(GESTE));
vrai('… un défilement horizontal sous le doigt garde la priorité', /swipeDefileH\(cible\)/.test(GESTE));

console.log('\n══ 4. ⛔ LES DEUX BOUTONS FLOTTANTS NE SE MARCHENT PLUS DESSUS ══\n');
{ const t=NU.replace(/\s*\n\s*/g,'');
  /* v732 : au téléphone, « Voir sur la carte » a QUITTÉ le calque flottant — empilé sur la bulle,
     il couvrait le bandeau des jours, le zoom et les Réglages (vidéo de Justin du 23 septembre).
     Il ne peut donc plus se poser sur elle ; test-781 garde son nouveau placement. Au-dessus de
     780 px, il flotte toujours, monté au-dessus de la bulle. */
  vrai('⛔ au téléphone, « Voir sur la carte » ne flotte plus (il ne peut plus couvrir la bulle)',
       /html\[data-refonte\] body \.plm-fab\{display:none!important\}/.test(t));
  /* 23 septembre 2026 : la bulle d'aide Leia est RETIRÉE (Justin : « on supprime totalement »).
     La règle qui montait « Voir sur la carte » au-dessus d'elle était conditionnée à sa présence
     (`:has`) — c'est ce qui permettait de la retirer sans laisser de trou. Elle part avec elle :
     une règle qui attend un élément qui n'existe plus est du code mort qui a l'air d'une garde. */
  vrai('⛔ ailleurs, plus aucune règle ne le monte au-dessus d’une bulle disparue', !/#assistant/.test(t));
  vrai('⛔ … et plus aucune bulle d’aide dans la page', !/id="assistant"/.test(t) && !/class="fab"/.test(t)); }

console.log('\n══ 4 bis. ⛔ LES MENUS DE LA BARRE D’OUTILS NE SE MESURENT PAS SUR LEUR BOUTON ══\n');
/* Justin, capture à l'appui : une colonne blanche au milieu de l'écran avec
   « A / A / I. / J » — les PREMIÈRES LETTRES des techniciens, une par ligne.
   ⛔ TROISIÈME FOIS DANS LA JOURNÉE QU'UNE MOITIÉ DE RÈGLE SURVIT À L'AUTRE :
   `html[data-refonte] .pf-dd{flex:0 1 auto}` a rendu aux menus leur largeur naturelle —
   c'est juste — mais la règle téléphone du panneau (`.pf-pan{left:0;right:0;width:auto}`)
   avait été écrite quand `.pf-dd` prenait TOUTE la largeur. Le panneau héritait donc de la
   largeur du BOUTON : 42 px sur un bouton d'icône.
   ⚠️ Et son jumeau : `.pf-pan.large` (0,2,0) bat cette règle (0,1,0) et gardait
   `width:330px` ancré à GAUCHE — le menu « Jours » sortait de 81 px à droite de l'écran
   (x 141→471 sur 390 de large). Les deux sont mesurés dans `scratchpad/sonde-menus.js`. */
{ const t=NU.replace(/\s*\n\s*/g,'');
  vrai('⛔ le bloc conteneur du panneau est la RANGÉE, pas le bouton',
    /html\[data-refonte\] \.pf-row\{position:relative\}/.test(t) &&
    /html\[data-refonte\] \.pf-dd\{position:static\}/.test(t));
  const m=t.match(/html\[data-refonte\] \.pf-pan,html\[data-refonte\] \.pf-pan\.large\{([^}]*)\}/);
  vrai('⛔ … et la règle vise AUSSI `.pf-pan.large`, qui la battait en spécificité', !!m);
  if(m) vrai('… en forçant largeur et ancrage (sinon la règle de base reprend la main)',
             /left:0!important/.test(m[1]) && /right:0!important/.test(m[1]) && /width:auto!important/.test(m[1]));
  /* ⚠️ La correction est bornée au téléphone : sur ordinateur le panneau garde sa largeur
     DESSINÉE (285 ou 330) et s'ouvre sous son bouton. L'étaler « pour faire pareil » serait
     une régression — la contre-épreuve est dans la sonde. */
  const i0=t.indexOf('@media(max-width:700px){');
  vrai('population : le bloc téléphone est trouvé', i0>0);
  vrai('⛔ … et la correction vit DEDANS (l’ordinateur n’est pas touché)',
       t.indexOf('html[data-refonte] .pf-row{position:relative}') > i0); }
/* ⛔ C'EST LE LIBELLÉ QUI COMPTE, PAS LE DÉTAIL. Mesuré dans la même passe :
   « Réduire aux heures de travail » rendait 10 px de visible pour 209 px de texte — le
   détail horaire gardait sa largeur naturelle et mangeait le nom de l'option. */
{ const t=NU.replace(/\s*\n\s*/g,'');
  vrai('⛔ le libellé d’option a un plancher de largeur', /\.pf-opt b\{[^}]*min-width:min\(/.test(t));
  vrai('⛔ … et le détail se coupe le premier', /\.pf-opt small\{[^}]*min-width:0/.test(t));
  vrai('⛔ … le détail peut passer à la ligne quand il ne tient pas', /\.pf-opt\{[^}]*flex-wrap:wrap/.test(t));
  vrai('⛔ … et un libellé trop long se replie plutôt que de se tronquer',
       /\.pf-opt b\{[^}]*white-space:normal/.test(t)); }

console.log('\n══ 6. ⛔ LA BULLE QU’ON ATTRAPE ══\n');
const BULLE=(()=>{ const d=NU.indexOf('function ongletsBulle(bar){');
  if(d<0) return ''; const f=NU.indexOf('\nfunction ',d+10); return NU.slice(d, f>0?f:d+12000); })();
vrai('population : le corps de ongletsBulle est trouvé', BULLE.length>2500);
v('⛔ une seule définition (une seconde gagnerait partout, en silence)', (NU.match(/function ongletsBulle\(/g)||[]).length, 1);
vrai('⛔ elle est posée avec la barre, à côté de l’appui long', /ongletsPresse\(bar\);\s*ongletsBulle\(bar\);/.test(NU));
vrai('… et ses écouteurs ne s’empilent pas quand la barre se redessine', /if\(!bar \|\| bar\._bulle\) return; bar\._bulle=true;/.test(BULLE));
/* ⛔⛔ LE SENS. C'est tout le reproche de Justin : la pastille filait à l'opposé du doigt.
   La cible de la bulle est la position du DOIGT moins l'endroit où on l'a prise — pas un
   décalage inversé, pas un recentrage sous le doigt. */
vrai('⛔⛔ la bulle va où va le doigt, à l’endroit où on l’a prise (cible = doigt − prise)', /let t=s\.x-s\.prise;/.test(BULLE));
vrai('⛔ … la prise est mesurée sur la bulle VISIBLE, pas sur l’onglet actif', /prise:surBulle\?x-pc:0/.test(BULLE));
vrai('⛔ pas de projection de vitesse : ce qui est allumé au lâcher est ce qu’on obtient', !/swipeProjeter/.test(BULLE));
vrai('⛔ l’onglet sous la bulle s’allume en passant', /classList\.toggle\('survol',n===j\)/.test(BULLE));
vrai('⛔ « Plus » n’est pas une place pour la bulle (colonnes)', /o\.k!=='_plus'/.test(BULLE));
vrai('⛔ … et un geste parti de « Plus » ne l’attrape pas', /tab\.dataset\.tab==='_plus'\) return;/.test(BULLE));
vrai('⛔ le bord résiste en ressort (on ne bute pas, on ne sort pas)', /const elastique=/.test(BULLE) && /elastique\(t-z,dim\)/.test(BULLE));
vrai('⛔ le TACTILE pour un doigt', /bar\.addEventListener\('touchstart'/.test(BULLE) && /bar\.addEventListener\('touchend'/.test(BULLE));
vrai('⛔ … le déplacement non passif, retenu seulement une fois engagé',
  /bar\.addEventListener\('touchmove'[\s\S]{0,260}if\(bouger\(t\.clientX,t\.clientY\) && e\.cancelable\) e\.preventDefault\(\);[\s\S]{0,20}\{passive:false\}\)/.test(BULLE));
vrai('⛔ touchcancel rend la bulle à sa place', /bar\.addEventListener\('touchcancel',\(\)=>abandon\(\)/.test(BULLE));
vrai('… et le POINTEUR reste réservé à la souris', /pointerType!=='mouse'/.test(BULLE));
/* ⛔ Posée dès l'appui, la capture de pointeur ferait partir le `click` sur la BARRE (ancêtre
   commun) au lieu de l'onglet : un simple clic de souris n'ouvrirait plus rien. */
vrai('⛔ la capture de pointeur n’est posée qu’une fois le geste ENGAGÉ',
  /s\.engage=true;[\s\S]{0,200}setPointerCapture/.test(BULLE) &&
  !/const debut=[\s\S]{0,1600}?setPointerCapture[\s\S]{0,40}const bouger/.test(BULLE));
vrai('⛔ un geste, une navigation : l’horodatage ne se pose qu’après un geste ENGAGÉ',
  /if\(!st\.engage\)\{[^\n]*return; \}[^\n]*\n\s*finBulle=Date\.now\(\)/.test(BULLE));
vrai('⛔ … le clic qui suit est avalé, en capture, dans une fenêtre courte',
  /addEventListener\('click',e=>\{\s*if\(Date\.now\(\)-finBulle>\d{3}\) return;\s*e\.preventDefault\(\); e\.stopPropagation\(\);\s*\},true\)/.test(BULLE));
vrai('⛔ … et le bloc d’historique est prévenu (le « retour » du navigateur ne défait rien)', /window\._balayageFin=finBulle/.test(BULLE));
vrai('le sens de l’écran suit le sens de la bulle', /_sensForce = st\.iOn<0 \? '' : \(j>st\.iOn \? 'avant' : 'retour'\)/.test(BULLE));
/* ⛔ PENDANT QU'UN DOIGT LA TIENT, ELLE EST À LUI : un rafraîchissement de la barre (synchro,
   pastilles) ne doit pas la renvoyer à son onglet en plein geste. */
{ const d=NU.indexOf('function tabCurPlacer('), f=NU.indexOf('\nfunction ',d+10);
  const TCP=d>0?NU.slice(d,f):'';
  vrai('population : tabCurPlacer est trouvé', TCP.length>200);
  vrai('⛔ tabCurPlacer ne touche pas une bulle tenue en main', /if\(bar\.classList\.contains\('tire'\)\) return;/.test(TCP)); }
/* ⛔ L'APPUI LONG. Tenue une demi-seconde avant de glisser, la bulle ne doit pas ouvrir le
   choix des onglets ; et depuis `touch-action:none`, un doigt qui tremble d'un pixel ne doit
   plus désarmer l'appui long ailleurs. */
{ const d=NU.indexOf('function ongletsPresse('), f=NU.indexOf('\nfunction ',d+10);
  const PR=d>0?NU.slice(d,f):'';
  vrai('population : ongletsPresse est trouvé', PR.length>300);
  vrai('⛔ un appui tenu SUR la bulle est une prise, pas le menu', /if\(bar\.classList\.contains\('tire'\)\) return;/.test(PR));
  vrai('⛔ l’appui long se désarme au MOUVEMENT (8 px), pas au premier pointermove', /Math\.hypot\(e\.clientX-px,e\.clientY-py\)>8/.test(PR));
  faux('… et plus au moindre pointermove', /\['pointerup','pointercancel','pointermove','pointerleave'\]/.test(PR)); }
{ const t=NU.replace(/\s*\n\s*/g,'');
  /* ⛔ Sans lui, le navigateur reprend la main dès que le doigt dévie : la bulle s'arrête net. */
  vrai('⛔ la barre ne laisse pas le navigateur défiler sous le doigt', /\.tabbar\{touch-action:none;/.test(t));
  vrai('… ni sélectionner du texte, ni ouvrir la loupe d’iOS', /\.tabbar\{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none\}/.test(t));
  /* ⛔⛔ MESURÉ : `scale` s'applique AVANT `transform`, donc un `transform:translateX(D)`
     tenu en main glissait de 1,06 × D — 8,5 px de retard sur le doigt à deux onglets. */
  vrai('⛔⛔ la position vit dans `translate` (que `scale` ne multiplie pas)',
    /\.tab-cur\{[^}]*translate:calc\(var\(--tab-i\) \* \(100% \+ var\(--tab-gout\)\) \+ var\(--tab-dx\)\)/.test(t));
  faux('⛔ … et plus dans `transform`', /\.tab-cur\{[^}]*transform:translateX\(calc\(var\(--tab-i\)/.test(t));
  vrai('tenue en main, elle se soulève (échelle)', /\.tabbar\.tire \.tab-cur\{scale:1\.\d+ 1\.\d+/.test(t));
  vrai('⛔ … et le mouvement réduit l’en dispense', /@media \(prefers-reduced-motion: reduce\)\{\.tabbar\.tire \.tab-cur\{scale:1\}/.test(t));
  vrai('⛔ l’onglet survolé prend l’encre de l’onglet actif, refonte comprise',
    /html\[data-refonte\] \.tabbar \.tab\.survol\{color:var\(--t1\)!important\}/.test(t));
  vrai('⛔ … et l’onglet de départ s’éteint tant que la bulle l’a quitté',
    /html\[data-refonte\] \.tabbar\.tire \.tab\.on:not\(\.survol\)\{color:var\(--t3\)!important\}/.test(t));
  vrai('l’onglet où le doigt s’est posé ne reste pas rétréci pendant tout le geste', /\.tabbar\.tire \.tab:active\{transform:none\}/.test(t));
  /* Le compteur recopié du menu : un TOTAL, pas du nouveau — sur une icône de barre il se lit
     « à traiter ». Retiré de la barre le 23 septembre 2026 ; le menu garde les siens. */
  faux('⛔ plus de compteur de fiches posé sur les icônes de la barre', /tab-b/.test(NU)); }

console.log('\n══ 5. LA MESURE QUI GARDE LE RESTE EXISTE ══\n');
const P=__dirname+'/../scratchpad/sonde-geste.js';
vrai('scratchpad/sonde-geste.js existe', fs.existsSync(P));
const SONDE=fs.existsSync(P)?fs.readFileSync(P,'utf8'):'';
vrai('… elle joue de VRAIS événements tactiles', /dispatchTouchEvent/.test(SONDE));
vrai('… sur la barre ET sur le contenu', /barre/i.test(SONDE) && /contenu/i.test(SONDE));
vrai('… et elle vérifie qu’un simple tap marche encore', /tap/i.test(SONDE));
vrai('⛔ elle relève la BULLE sous le doigt, dans le même sens', /bulle/i.test(SONDE) && /MÊME SENS/.test(SONDE));
/* ⛔ Mesuré le 23 septembre 2026 : ce Chromium ne transmet aucun mouvement de moins de ~15 px.
   Une sonde qui compare la bulle aux positions ENVOYÉES accuse l'application d'un retard
   qu'elle n'a pas. */
vrai('⛔ … comparée au doigt que la PAGE a reçu, pas à celui qu’on a envoyé', /__DX/.test(SONDE) && /recu/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));
const P2=__dirname+'/../scratchpad/sonde-menus.js';
vrai('scratchpad/sonde-menus.js existe', fs.existsSync(P2));
const S2=fs.existsSync(P2)?fs.readFileSync(P2,'utf8'):'';
vrai('… elle ouvre CHAQUE bouton de la barre (on ne suppose pas lequel ouvre un panneau)',
     /pf-bar button/.test(S2));
vrai('… elle porte la contre-épreuve ORDINATEUR', /CONTRE-ÉPREUVE/.test(S2) && /1440/.test(S2));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(S2));

console.log(`\n════ test-764 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko?1:0);
