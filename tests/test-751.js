/* ══ REFONTE POINT 1 — LA NAVIGATION ══════════════════════════════════════════════════════
   Dossier de refonte de Justin : « barre d'onglets à 4 catégories personnalisable (Paramètres
   et appui long) ; bureau : sidebar permanente 236 px, pas de tiroir ni d'onglets ; bouton
   messagerie flottant ».

   Ce que ce banc garde, et pourquoi chaque point a déjà coûté quelque chose ici :

   1. ⛔ LA BARRE VIT HORS DE `#content`. `rendreVueAnimee` réécrit `#content` à chaque
      navigation : la barre « Reprendre » du multitâche, posée dedans, a été mesurée ABSENTE à
      100, 300, 600, 1 200 et 2 500 ms. Même piège, même parade.
   2. ⛔ `go()` NE RECONSTRUIT PAS LA BARRE, il ne repeint que l'état actif. La reconstruire
      rattacherait ses écouteurs à chaque navigation — dix navigations, dix appuis longs.
   3. ⛔ UN ONGLET NE POINTE JAMAIS VERS UN ÉCRAN INTERDIT. Un choix fait avant qu'un droit soit
      retiré renverrait au tableau de bord avec un cadenas, sans explication.
   4. ⛔ LE CHOIX SUIT LA PERSONNE (`prefEcrire`), pas l'appareil — comme le thème et la couleur.
   5. ⛔ FORCER UN RENDU DOIT FORCER *TOUT* LE RENDU. Mesuré : `autonome` restait celui qu'on
      avait mesuré, donc forcer « ios27 » (installée) depuis un navigateur ne sortait jamais la
      pilule flottante — et le contre-essai « dans Safari, barre plate » passait au vert pour
      cette mauvaise raison, n'ayant jamais vu le cas installé.

   ⚠️ Ce banc ne voit pas les pixels : la pilule, la pastille tonale d'Android, les 236 px et la
   place réservée sous la barre sont mesurés au navigateur (`scratchpad/sonde-nav.js`, 41 ✓).  */
const fs=require('fs'); const APP=fs.readFileSync(__dirname+'/../app.html','utf8');
let ok=0,ko=0;
const v=(t,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++;console.log('  ✓ '+t);}
  else {ko++;console.log('  ✗ '+t+'\n      attendu : '+JSON.stringify(b)+'\n      obtenu  : '+JSON.stringify(a));} };
const vrai=(t,c)=>v(t,!!c,true);

function decoupe(h){ const d=APP.indexOf(h); if(d<0) throw new Error('introuvable : '+h);
  const suite=/\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex=d+h.length;
  const m=suite.exec(APP); const fin=m?m.index:Math.min(APP.length,d+80000);
  let bout=APP.slice(d,fin);
  for(;;){ const k=Math.max(bout.lastIndexOf('}'),bout.lastIndexOf(';')); if(k<0) break;
    const t=bout.slice(0,k+1);
    try{ new Function(t); return t; }catch(e){ bout=bout.slice(0,k); } }
  throw new Error('fin introuvable : '+h); }

/* v747 : `ongletsLire` lit par `prefLocalLire` (la mémoire de repli d'un appareil plein — test-808) :
   fournie ici avec sa mémoire, la garde d'une fonction extraite va avec elle. */
const CODE=['const _prefVue={};','function prefLocalLire(k){',
  'const ONGLETS_DEFAUT=','const ONGLETS_MAX=','function ongletsDispo(){','function ongletItem(k){',
  'function ongletsLire(){'].map(h=>decoupe(h)).join('\n');

/* On rejoue le menu et les droits : rien d'autre n'est lu par ces fonctions. */
const monter=(navVu, range)=>new Function('navVu','range',`
  const NAV=navVu;
  const canSee=it=>it.vu!==false;
  const localStorage={getItem:()=>range, setItem(){}, removeItem(){}};
  ${CODE}
  return { ongletsLire, ongletsDispo, ongletItem, ONGLETS_MAX, ONGLETS_DEFAUT };`)(navVu,range);

const MENU=[
  {g:'Tableau de bord', items:[{k:'dashboard',l:'Tableau de bord'},{k:'statistiques',l:'Stats',vu:false},{k:'audit',l:'Audit',vu:false}]},
  {g:'Planification',  items:[{k:'planning',l:'Planning'},{k:'taches',l:'Tâches'}]},
  {g:'Interventions',  items:[{k:'interventions',l:'Interventions',b:'int'}]},
  {g:'Clients',        items:[{k:'clients',l:'Clients',b:'cli'}]},
  {g:'Stock',          items:[{k:'boxes',l:'Boxes',b:'box'},{k:'produits',l:'Produits'}]},
];

console.log('\n══ 1. QUATRE ONGLETS, TOUJOURS, ET TOUJOURS VALIDES ══\n');
{ const M=monter(MENU,'');
  v('sans rien de choisi, on retombe sur les quatre défauts', M.ongletsLire(), ['dashboard','interventions','planning','boxes']);
  v('il y en a exactement quatre', M.ongletsLire().length, 4);
  v('le maximum est bien quatre', M.ONGLETS_MAX, 4);
}
{ const M=monter(MENU,'clients,produits');
  const l=M.ongletsLire();
  v('un choix de deux est COMPLÉTÉ, pas laissé court', l.length, 4);
  v('… et le choix de la personne reste en tête', l.slice(0,2), ['clients','produits']);
}
{ const M=monter(MENU,'clients,produits,taches,planning,interventions,boxes');
  v('un choix trop long est coupé à quatre', M.ongletsLire(), ['clients','produits','taches','planning']);
}

console.log('\n══ 2. ⛔ JAMAIS UN ONGLET VERS UN ÉCRAN INTERDIT ══\n');
{ const M=monter(MENU,'audit,statistiques,clients,produits');
  const l=M.ongletsLire();
  v('les deux rubriques non visibles sont JETÉES', l.filter(k=>k==='audit'||k==='statistiques'), []);
  v('… et la barre est complétée à quatre', l.length, 4);
  v('⛔ tout ce qui reste est réellement visible',
    l.every(k=>M.ongletsDispo().some(i=>i.k===k)), true);
}
{ const M=monter(MENU,'nimportequoi,,  ,clients');
  const l=M.ongletsLire();
  v('une clé inventée est jetée', l.indexOf('nimportequoi'), -1);
  v('les vides aussi', l.filter(k=>!k).length, 0);
  v('et on a toujours quatre onglets', l.length, 4);
}
{ /* ⛔ LE CAS LIMITE QUI COMPTE : une personne qui ne voit presque rien. La barre ne doit pas
     inventer des onglets qu'elle n'a pas le droit d'ouvrir — quitte à en avoir moins. */
  const petit=[{g:'X',items:[{k:'interventions',l:'Interventions'},{k:'planning',l:'Planning'}]}];
  const M=monter(petit,'');
  v('deux rubriques visibles → deux onglets, pas quatre inventés', M.ongletsLire(), ['interventions','planning']);
  const rien=monter([{g:'X',items:[{k:'a',l:'A',vu:false}]}],'');
  v('aucune rubrique visible → aucune barre, et rien qui plante', rien.ongletsLire(), []);
}

console.log('\n══ 3. CE QUI EST GARDÉ DANS LE CODE ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const corps=(nom)=>{ const i=NU.indexOf('function '+nom+'('); if(i<0) return '';
  const bornes=['\nfunction ','\nviews.','\nconst ','\nlet ','\nasync function ']
    .map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const j=bornes.length?Math.min(...bornes):-1;
  return NU.slice(i, j<0? i+2600 : j); };

{ /* ⛔ 1 — la barre est SŒUR de .main, jamais dedans.
     ⚠️ LA PREMIÈRE VERSION DE CE CONTRÔLE NE VOYAIT RIEN. Elle demandait « y a-t-il un </div>
     entre #content et la barre ? » — et déplacer la barre juste après `#content></div>`, DANS
     `.main`, satisfaisait la question sans rien corriger : la mutation ne cassait rien.
     On compte donc les balises pour de vrai : on suit la profondeur depuis `<div class="main">`
     jusqu'à SA fermeture, et on exige que la barre soit APRÈS. Un motif juste sur une question
     fausse rend un verdict faux. */
  const shell=APP.slice(APP.indexOf('<div class="app" id="app-root"'), APP.indexOf('<div class="overlay"'));
  const finDe=(html,depart)=>{ let i=depart, p=0;
    const re=/<(\/?)div\b[^>]*?(\/?)>/g; re.lastIndex=depart;
    let m; while((m=re.exec(html))){ if(m[2]==='/') continue;
      p += m[1]==='/' ? -1 : 1; if(p===0) return m.index; }
    return -1; };
  const iMain=shell.indexOf('<div class="main">');
  const finMain=finDe(shell,iMain);
  const iBarre=shell.indexOf('id="tabbar"');
  const iMsg=shell.indexOf('id="msg-flot"');
  vrai('la barre existe dans le balisage', iBarre>0);
  vrai('le bloc .main est bien délimité (sinon ce qui suit est creux)', iMain>0 && finMain>iMain);
  vrai('⛔⛔ la barre est HORS de .main — donc hors de #content, que rendreVueAnimee réécrit',
    iBarre>finMain);
  vrai('⛔ le bouton flottant de la messagerie aussi', iMsg>finMain);
}
{ /* ⛔ 2 — go() repeint l'état, il ne reconstruit pas */
  const g=corps('go');
  vrai('⛔ go() appelle ongletsActif', /ongletsActif\(\)/.test(g));
  v('⛔⛔ … et JAMAIS renderOnglets (sinon les écouteurs s\'empilent)', /renderOnglets\(\)/.test(g), false);
  const act=corps('ongletsActif');
  vrai('ongletsActif ne touche que la classe', /classList\.toggle\('on'/.test(act));
  v('… et n\'écrit pas de HTML', /innerHTML/.test(act), false);
  vrai('c\'est renderNav qui construit la barre', /renderOnglets\(\)/.test(corps('renderNav')));
}
{ /* ⛔ les écouteurs ne s'empilent pas */
  const pr=corps('ongletsPresse');
  vrai('⛔ l\'appui long s\'attache UNE fois (drapeau)', /bar\._presse/.test(pr));
  vrai('⛔ il se désarme au MOUVEMENT (un défilement commence par un appui)', /pointermove/.test(pr));
  vrai('⛔ et il neutralise le clic qui suivrait', /preventDefault\(\)/.test(pr)&&/stopPropagation\(\)/.test(pr));
}
{ /* ⛔ 4 — le choix suit la personne */
  const ec=corps('ongletsEcrire');
  /* v747 : par `prefGarder` (un enregistrement qui échoue ne défait plus le geste) et `prefLocal`
     (la mémoire de repli d'un appareil plein) — la chaîne est JOUÉE dans test-808 § 3 bis. */
  vrai('⛔ le choix part sur la fiche de la personne', /prefGarder\('onglets'/.test(ec));
  vrai('… et sur l\'appareil', /prefLocal\('elan_onglets'/.test(ec));
  vrai('… et la barre se redessine AVANT l\'enregistrement', ec.indexOf('renderOnglets()')>0 && ec.indexOf('renderOnglets()')<ec.indexOf("prefGarder('onglets'"));
  vrai('la clé est déclarée dans PREF_CLES (donc elle voyage à la connexion)',
    /PREF_CLES=\{[^}]*onglets:/.test(NU));
  v('⛔ RIEN de tout ça n\'entre dans db en dehors de prefEcrire',
    /db\.[a-zA-Z]+\s*=\s*.*onglets/.test(ec), false);
}
{ /* ⛔ 5 — forcer un rendu force TOUT le rendu */
  const plats=NU.slice(NU.indexOf('const PLATS={'), NU.indexOf('const PLATS={')+1800);
  const n=(plats.match(/autonome:/g)||[]).length;
  v('⛔⛔ les DIX rendus déclarent « autonome » (sinon forcer ne force pas tout)', n, 10);
  vrai('… « installée » et « dans un navigateur » ne disent pas la même chose',
    /ios27:[^}]*autonome:1/.test(plats) && /iosweb:[^}]*autonome:0/.test(plats));
}
{ /* le CSS : rien ne s'applique sans attribut, et la place est réservée en bas */
/* ⛔ ON RETIRE LES COMMENTAIRES DE LA TRANCHE AVANT DE CHERCHER. Ce dépôt écrit de longues
   explications juste AU-DESSUS des règles qu'elles expliquent : un motif y trouve presque
   toujours ce qu'il cherche, et garde alors une PHRASE, pas un comportement. On ne cherche
   donc que dans le CSS nu. */
/* ⛔ UNE TRANCHE BORNÉE PAR `</style>` AVALE TOUT CE QU'ON AJOUTE APRÈS ELLE. Ce banc a viré
   au rouge le jour où les blocs « ＋ Créer » et « gabarit des listes » ont été écrits plus bas
   dans la MÊME feuille : la tranche les emportait, et leurs règles (`.tab`, `.creer-t`…)
   passaient pour des règles non gardées de CE bloc-ci. C'est la troisième forme du même piège
   — une découpe qui déborde rend toujours un verdict faux. On borne donc au DÉBUT du bloc
   suivant, repéré par son bandeau. */
const blocCss = (titre) => {
  const i0 = APP.indexOf(titre);
  if (i0 < 0) return { i0, css: '' };
  const suivant = APP.indexOf('/* \u2550\u2550', i0 + titre.length);
  const style = APP.indexOf('</style>', i0);
  const fin = (suivant > 0 && (style < 0 || suivant < style)) ? suivant : style;
  const brut = APP.slice(i0, fin > 0 ? fin : i0 + 9000);
  return { i0, css: brut.replace(/\/\*[\s\S]*?\*\//g, ' ') };
};
  const {i0, css} = blocCss('NAVIGATION — barre d\'onglets, tiroir, sidebar de bureau');
  vrai('⛔ le bloc de style de la navigation est trouvé (sinon tout ce qui suit est creux)', i0>0);
  v('   … et il a de la matière', css.length>2500, true);
  vrai('la barre est cachée par défaut', /\.tabbar\{[\s\S]{0,80}display:none/.test(css));
  vrai('⛔ elle sort sur une plateforme MOBILE', /html\[data-kind="mobile"\] \.tabbar\{display:flex\}/.test(css));
  vrai('⛔ … et sur une fenêtre étroite (une fenêtre de bureau rétrécie est un écran de téléphone)',
    /@media\(max-width:780px\)\{ \.tabbar\{display:flex\} \}/.test(css));
  vrai('⛔ JAMAIS sur un rendu bureau', /html\[data-kind="desktop"\] \.tabbar\{display:none!important\}/.test(css));
  /* ⛔ LES DEUX RÈGLES, PAS UNE. Le motif d'avant se contentait de la première trouvée :
     supprimer la règle de LARGEUR le laissait vert, alors qu'une fenêtre de bureau rétrécie
     montre la barre (elle a sa propre règle) et cacherait la dernière ligne des listes. */
  vrai('⛔ le contenu réserve la place sous la barre sur une plateforme mobile',
    /html\[data-kind="mobile"\] \.content\{padding-bottom:calc\(var\(--tabh\)/.test(css));
  vrai('⛔ … ET sur une fenêtre étroite, où la barre sort aussi',
    /@media\(max-width:780px\)\{ \.content\{padding-bottom:calc\(var\(--tabh\)/.test(css));
  vrai('   la hauteur réservée tient compte de la barre système du téléphone',
    /--tabh:calc\(\d+px \+ env\(safe-area-inset-bottom/.test(css));
  /* ⛔⛔ `--tabh` A UNE VALEUR PAR PLATEFORME DEPUIS LE 22 SEPTEMBRE 2026, ET C'EST TOUT
     L'INTÉRÊT : la pilule d'Apple ne prend pas la même place qu'une barre pleine, et Android
     garde ses 71 px figés. Six décalages étaient écrits EN DUR à côté (78, 98, 100, 76, 146,
     78) — resserrer la barre demandait de les retrouver tous. */
  const tabh = [...css.matchAll(/--tabh:calc\((\d+)px/g)].map(m => +m[1]);
  vrai('⛔ --tabh est déclinée par plateforme, pas unique', tabh.length >= 4, tabh.join(', '));
  vrai('⛔ la pilule en verre réserve plus qu’une barre pleine',
    tabh.length >= 2 && Math.max(...tabh) > Math.min(...tabh), tabh.join(', '));
  /* ⛔ 258 px, ET PAS LES 236 DU DOCUMENT — écart assumé et MESURÉ, pas un oubli. Avec la
     tuile d'icône ajoutée le 22 septembre 2026, il restait 149 px au libellé et
     « Consommation produits » en demande 163 : trois rubriques passaient sur deux lignes.
     Tronquer cache une information, rapetisser descend sous le plancher de lisibilité du
     terrain. La règle du dépôt tranche : une grille copiée d'une référence anglophone
     s'ÉLARGIT. Mesuré après : 171 px disponibles, zéro rubrique sur deux lignes. */
  vrai('la sidebar de bureau fait 258 px (élargie pour les libellés français)',
    /html\[data-kind="desktop"\] \.sidebar\{width:258px\}/.test(css));
  vrai('⛔ et le ☰ disparaît sur bureau', /html\[data-kind="desktop"\] \.menu-btn\{display:none!important\}/.test(css));
  vrai('⛔ la pilule flottante ne sort QUE sur du verre ET installée',
    /html\[data-verre="1"\]\[data-kind="mobile"\] \.tabbar\{/.test(css) &&
    /html\[data-verre="1"\]\[data-kind="mobile"\]:not\(\[data-autonome="1"\]\) \.tabbar\{/.test(css));
  /* ⚠ LA PASTILLE TONALE DE MATERIAL EST DEVENUE LA PASTILLE QUI GLISSE. Elle était posée
     sur l'ICÔNE de l'onglet actif ; depuis le 22 septembre 2026 c'est un seul objet qui se
     déplace d'un onglet à l'autre, et Material demande justement une tonale sur l'icône — on
     lui donne donc la forme et la place de cette tonale, au lieu d'en ajouter une seconde. */
  vrai('Android garde sa pastille tonale (c\'est désormais celle qui glisse)',
    /html\[data-os="android"\] \.tab-cur\{border-radius:999px;background:color-mix\(in srgb,var\(--acc\) 24%,transparent\)\}/.test(css));
  vrai('⛔ le tiroir en verre change AUSSI son encre (une encre pâle sur du verre clair ne se lit pas)',
    /html\[data-verre="1"\] \.sidebar\{[\s\S]{0,700}--side-ink:var\(--vr-encre\)/.test(css));
  /* ⛔⛔ LE CYCLE. `.sidebar` définit `--t1:var(--side-ink)` ; écrire `--side-ink:var(--t1)`
     sur elle referme une boucle, et une boucle rend TOUTES les variables qui y participent
     invalides — sans un mot, sans erreur, sans rien dans la console. Mesuré le 22 septembre
     2026 : `getComputedStyle(.sidebar).getPropertyValue('--t1')` rendait la chaîne VIDE, le
     titre de groupe sortait de la même encre que l'item (« deux Tableau de bord ») et la
     coupe valait rgba(0,0,0,0). L'encre se capture sur <html>, où `--t1` n'est pas redéfini. */
  vrai('⛔⛔ aucune règle ne referme le cycle --side-ink ↔ --t1 sur la sidebar',
    !/\.sidebar\{[^}]*--side-ink:var\(--t1\)/.test(css));
  /* La capture vit dans le bloc PLATEFORME, pas ici : on va la chercher dans sa propre
     tranche plutôt que d'élargir celle-ci — une tranche qui déborde rend un verdict faux. */
  { const {i0:iP, css:cssP} = blocCss("PLATEFORME — le rendu suit l'appareil");
    vrai('⛔ le bloc PLATEFORME est trouvé (sinon le contrôle qui suit est creux)', iP>0);
    vrai('⛔ l’encre de la page est capturée sur <html>, pas sur la sidebar',
      /html\[data-verre="1"\]\{[\s\S]{0,3000}--vr-encre:var\(--t1\)/.test(cssP)); }
  vrai('⛔ la transparence réduite éteint le flou de la barre et du tiroir',
    /prefers-reduced-transparency: reduce/.test(css));
  vrai('⛔ le mouvement réduit désactive l\'enfoncement des onglets',
    /prefers-reduced-motion: reduce/.test(css));
  /* contre-essai : aucune règle sans attribut ni classe de la refonte */
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)) return false;
    if(sel.indexOf('/*')>=0||sel.indexOf('*')===0) return false;
    return sel.indexOf('html[')<0 && sel.indexOf('.tab')<0 && sel.indexOf('.msg-flot')<0 && sel.indexOf(':root')<0;
  });
  v('⛔⛔ AUCUNE règle du bloc ne touche un écran existant sans le demander',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(Boolean), []);
}
{ /* le bouton flottant : conditionné, et jamais sur bureau */
  const mf=corps('msgFlottantOn');
  vrai('⛔ le bouton n\'existe que si OP MESSAGES est OUVERTE à l\'entreprise',
    /can\('opMessages'\)/.test(mf) && /planOpMsg\(\)/.test(mf) && /opMsgDisponible\(\)/.test(mf));
  vrai('… et il se redessine quand la suite change', /renderMsgFlottant\(\)/.test(corps('suiteRefresh')));
}

console.log('\n═══ test-751 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);
