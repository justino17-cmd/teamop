/* ══ REFONTE POINT 3 — LE GABARIT DES LISTES ══════════════════════════════════════════════
   Dossier de refonte : « Listes (25 catégories, même gabarit) — recherche en pilule, filtres
   segmentés 3 positions (curseur animé .42 s), lignes ≥ 64 px ».

   ⛔ ON NE RÉÉCRIT PAS VINGT-CINQ VUES. Chacune a sa logique métier, ses colonnes, ses filtres ;
   les réécrire en une passe, c'est vingt-cinq occasions de casser un écran qu'un technicien
   ouvre tous les jours, pour un gain de forme. On relève ce qu'elles PARTAGENT DÉJÀ.

   ⛔ ET CE QU'ELLES PARTAGENT A ÉTÉ MESURÉ, PAS SUPPOSÉ. La première écriture visait `.pl-row`
   et `.list-tbl` « parce que c'est ce qu'une liste utilise ». Relevé écran par écran au
   navigateur : Véhicules et Tâches rendent des `.pl-row`, Techniciens un `.list-tbl` avec des
   `tr.row-clk`, et Interventions / Clients / Fournisseurs rendent chaque ligne comme une
   `.card`. La recherche, elle, partage une CLASSE (`.search-inp`, 32 emplois) et non une
   structure. Un nom n'est pas un contenu — il a fallu ouvrir les écrans pour le savoir.

   Trois pièges gardés ici :
   1. ⛔ `segEligible` IGNORE LE CURSEUR. Sans ça, `segInit` se défait au second passage : le
      curseur qu'il vient d'ajouter fait que le groupe cesse d'être éligible. Mesuré : trois
      appels laissaient ZÉRO curseur, et le repositionnement au redimensionnement ne marchait
      plus jamais.
   2. ⛔ LE CURSEUR EST À `top:0`. La transformation part du bord du GROUPE, rembourrage
      compris : un `top` non nul s'AJOUTE. Mesuré : 3 px trop bas.
   3. ⛔ ON NE TRANSFORME PAS CE QUI N'EST PAS UN SEGMENTÉ — cinq chips, ou un bouton d'action
      dans le groupe, et le curseur coulissant sauterait d'une ligne à l'autre.

   ⚠️ Le glissement, les 44 px et les hauteurs réelles sont mesurés au navigateur
   (`scratchpad/sonde-gabarit.js`, 31 ✓, sur les VRAIS écrans).                              */
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

/* Un faux DOM minimal : la mécanique ne lit que `children`, `classList` et `matches`.
   ⚠️ `matches` est arrivé le 22 septembre 2026, le jour où le segmenté du tableau de bord a
   rejoint la même mécanique : c'est la famille qui dit comment s'appelle un enfant. */
const faux=(classes,tag)=>({ tag:tag||'span',
  classList:{ contains:c=>classes.indexOf(c)>=0 },
  matches:s=>String(s).split(',').some(x=>{ x=x.trim(); if(!x) return false;
    return x.charAt(0)==='.' ? classes.indexOf(x.slice(1))>=0 : x===(tag||'span'); }) });
const groupe=(enfants)=>({ children:enfants, tag:'div',
  classList:{ contains:c=>c==='filters' },
  matches:s=>String(s).split(',').some(x=>x.trim()==='.filters') });

console.log('\n══ 1. QUI DEVIENT UN SEGMENTÉ, ET QUI NON ══\n');
{ const M=new Function(
    decoupe('const SEG_MAX=')+'\n'+
    decoupe('const SEG_FAMILLES=[')+'\n'+
    decoupe('function segFamille(g){')+'\n'+
    decoupe('function segEligible(g,fam){')+'\n'+
    'return { segEligible, SEG_MAX };')();
  const chip=()=>faux(['chip']);
  v('deux chips : segmenté', (M.segEligible(groupe([chip(),chip()]))||[]).length, 2);
  v('trois chips : segmenté (la maquette en demande trois)', (M.segEligible(groupe([chip(),chip(),chip()]))||[]).length, 3);
  v('quatre chips : segmenté', (M.segEligible(groupe([chip(),chip(),chip(),chip()]))||[]).length, 4);
  v('⛔ CINQ chips : PAS de segmenté (le curseur sauterait de ligne en ligne)',
    M.segEligible(groupe([chip(),chip(),chip(),chip(),chip()])), null);
  v('⛔ UN seul chip : pas de segmenté (il n\'y a rien à choisir)', M.segEligible(groupe([chip()])), null);
  v('⛔ un bouton d\'action dans le groupe : pas de segmenté',
    M.segEligible(groupe([chip(),chip(),faux(['btn'],'button')])), null);
  v('le maximum est quatre', M.SEG_MAX, 4);
  /* ⛔⛔ LE PIÈGE QUI A COÛTÉ : le curseur est un ENFANT du groupe. */
  v('⛔⛔ LE CURSEUR N\'EST PAS UN ENFANT ÉTRANGER — sinon segInit se défait au second passage',
    (M.segEligible(groupe([faux(['seg-cur']),chip(),chip()]))||[]).length, 2);
  v('   … même avec quatre chips', (M.segEligible(groupe([faux(['seg-cur']),chip(),chip(),chip(),chip()]))||[]).length, 4);
  v('   … et un curseur PLUS un bouton étranger reste refusé',
    M.segEligible(groupe([faux(['seg-cur']),chip(),chip(),faux(['btn'],'button')])), null);
}

console.log('\n══ 2. CE QUI EST GARDÉ DANS LE CODE ══\n');
const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
const corps=(nom)=>{ const i=NU.indexOf('function '+nom+'('); if(i<0) return '';
  const bornes=['\nfunction ','\nviews.','\nconst ','\nlet ','\nasync function ']
    .map(b=>NU.indexOf(b,i+10)).filter(x=>x>0);
  const j=bornes.length?Math.min(...bornes):-1;
  return NU.slice(i, j<0? i+2600 : j); };
{ const i=corps('segInit');
  vrai('⛔ un groupe non éligible est NETTOYÉ (classe et curseur retirés)',
    /classList\.remove\('seg-on'\)/.test(i) && /\.remove\(\)/.test(i));
  vrai('⛔ les écouteurs ne s\'empilent pas (drapeau)', /g\._seg/.test(i));
  vrai('⛔ l\'écouteur est en CAPTURE, pour passer avant l\'onclick de la vue', /\},true\)/.test(i));
  const po=corps('segPoser');
  vrai('⛔ le curseur est un ENFANT du groupe (pas un élément flottant qui se décalerait au défilement)',
    /g\.insertBefore\(cur,g\.firstChild\)/.test(po));
  vrai('⛔ un groupe sans chip actif cache son curseur au lieu de le laisser n\'importe où',
    /if\(!actif\)/.test(po) && /opacity='0'/.test(po));
  vrai('⛔ une largeur nulle (groupe caché) ne pose pas un curseur à zéro', /!rg\.width\|\|!ra\.width/.test(po));
  vrai('le premier placement ne s\'anime pas', /cur\.style\.transition = anime \? '' : 'none'/.test(po));
  vrai('⛔ le gabarit se pose APRÈS l\'écriture de l\'écran, jamais depuis go()',
    /multiProposer\(view\); \}catch\(_e\)\{\}[\s\S]{0,220}segInit\(\$\('content'\)\)/.test(NU) && !/segInit\(/.test(corps('go')));
  vrai('un redimensionnement replace les curseurs, sans les animer',
    /window\.addEventListener\('resize',segRepositionner\)/.test(NU));
}

console.log('\n══ 3. LE STYLE ══\n');
{ const titre='LE GABARIT DES LISTES — un seul pour les vingt-cinq (point 3 de la refonte)';
  const i0=APP.indexOf(titre);
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  /* ⛔ Borner au bloc SUIVANT, pas à `</style>` : une tranche qui va jusqu'à la fin de la
     feuille avale tout ce qu'on écrira plus bas. Déjà payé sur test-750 et test-751. */
  const suivant=APP.indexOf('/* ══', i0+titre.length), style=APP.indexOf('</style>', i0);
  const fin=(suivant>0&&(style<0||suivant<style))?suivant:style;
  const css=(i0>0?APP.slice(i0, fin>0?fin:i0+9000):'').replace(/\/\*[\s\S]*?\*\//g,' ');
  v('   … et il a de la matière', css.length>2000, true);
  vrai('⛔ le curseur est à top:0 (un top non nul s\'ajoute à la transformation)',
    /position:absolute;top:0;left:0/.test(css));
  vrai('la durée est celle de la maquette', /transition:transform \.42s cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ rien ne s\'applique sans la classe posée par segEligible',
    /html\[data-refonte\] \.filters\.seg-on\{/.test(css));
  vrai('⛔ 44 px sous le doigt sur téléphone', /min-height:44px/.test(css));
  vrai('⛔ les trois formes de ligne relevées au navigateur sont couvertes',
    /\.pl-row\{min-height:64px\}/.test(css) && /\.tbl\.list-tbl tbody tr\{min-height:64px\}/.test(css)
    && /\.tbl tr\.row-clk\{min-height:64px\}/.test(css));
  vrai('⛔ la recherche vise la CLASSE partagée, mesurée, pas une structure supposée',
    /html\[data-refonte\] input\.search-inp\{/.test(css));
  vrai('… et aussi les champs écrits à la main, reconnus par leur invite',
    /input\[placeholder\^="Rechercher"\]/.test(css));
  vrai('⛔ le mouvement réduit fait SAUTER le curseur au lieu de le faire glisser',
    /prefers-reduced-motion: reduce/.test(css));
  vrai('Windows reprend ses coins droits', /html\[data-os="windows"\] \.filters\.seg-on/.test(css));
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)) return false;
    if(sel.indexOf('/*')>=0||sel.indexOf('*')===0) return false;
    return sel.indexOf('html[')<0;
  });
  v('⛔⛔ AUCUNE règle du bloc ne touche un écran sans passer par un attribut',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(Boolean), []);
}


console.log('\n══ 4. DEUX FAMILLES, UNE SEULE MÉCANIQUE ══\n');
/* ⛔⛔ DEUX SEGMENTÉS QUI FONT LA MÊME CHOSE, C'EST UN DE TROP. `.filters` a reçu le curseur
   coulissant le 21 septembre 2026 ; `.tdb-seg` — le choix de période du tableau de bord — ne
   l'a jamais eu, et personne ne l'a vu parce que les deux se RESSEMBLENT. Justin l'a vu de ses
   yeux le 22. Ce qui est gardé ici, ce n'est pas « la table existe » : c'est que la MÊME
   fonction rend un verdict juste pour les DEUX familles. On l'exécute. */
{ const M=new Function(
    decoupe('const SEG_MAX=')+'\n'+
    decoupe('const SEG_FAMILLES=[')+'\n'+
    decoupe('function segFamille(g){')+'\n'+
    decoupe('function segEligible(g,fam){')+'\n'+
    'return { SEG_FAMILLES, segFamille, segEligible };')();

  /* Un faux élément qui sait répondre à `matches` — c'est tout ce que la mécanique lit. */
  const el=(tag,classes)=>{ classes=classes||[];
    return { tag, children:[],
      classList:{ contains:c=>classes.indexOf(c)>=0 },
      matches:s=>String(s).split(',').some(x=>{ x=x.trim(); if(!x) return false;
        return x.charAt(0)==='.' ? classes.indexOf(x.slice(1))>=0 : x===tag; }) }; };
  const grp=(tag,classes,enfants)=>{ const g=el(tag,classes); g.children=enfants; return g; };
  const chip=()=>el('span',['chip']);
  const seg =(on)=>el('span', on?['on']:[]);
  const cur =()=>el('span',['seg-cur']);

  v('les deux familles sont déclarées, et pas une de plus',
    M.SEG_FAMILLES.map(f=>f.sel), ['.filters','.tdb-seg']);
  v('chacune dit comment elle nomme ses enfants', M.SEG_FAMILLES.map(f=>f.enfant), ['.chip','span']);
  v('… et comment elle nomme son état actif', M.SEG_FAMILLES.map(f=>f.actif), ['active','on']);

  const gf=grp('div',['filters'],[chip(),chip(),chip()]);
  const gt=grp('div',['tdb-seg'],[seg(),seg(true),seg(),seg()]);
  v('un groupe .filters est reconnu comme tel', M.segFamille(gf).sel, '.filters');
  v('⛔ un groupe .tdb-seg AUSSI — c\'est tout le sujet', M.segFamille(gt).sel, '.tdb-seg');
  v('un élément inconnu retombe sur la première famille (rien ne plante)',
    M.segFamille(el('div',[])).sel, '.filters');

  v('.filters : trois chips font un segmenté', (M.segEligible(gf)||[]).length, 3);
  v('⛔ .tdb-seg : quatre spans font un segmenté (« Aujourd\'hui / 7 / 14 / Le mois »)',
    (M.segEligible(gt)||[]).length, 4);
  v('⛔ la famille décide de l\'ENFANT : des spans nus dans .filters ne sont pas des chips',
    M.segEligible(grp('div',['filters'],[seg(),seg(),seg()])), null);
  v('⛔ cinq périodes : plus de segmenté, même pour .tdb-seg',
    M.segEligible(grp('div',['tdb-seg'],[seg(),seg(),seg(),seg(),seg()])), null);
  v('⛔ un bouton étranger dans .tdb-seg : refusé',
    M.segEligible(grp('div',['tdb-seg'],[seg(),seg(),el('button',['btn'])])), null);
  /* ⛔⛔ CELLE-CI EST LA PLUS TRAÎTRE DE TOUTES, ET ELLE N'EXISTE QUE POUR `.tdb-seg` : le
     curseur EST un `<span>`. Sans l'exclusion, un groupe de quatre périodes en compte cinq au
     second passage, cesse d'être éligible, et perd le curseur qu'on vient de lui poser. */
  v('⛔⛔ le curseur — un SPAN — ne se compte pas comme une cinquième période',
    (M.segEligible(grp('div',['tdb-seg'],[cur(),seg(),seg(true),seg(),seg()]))||[]).length, 4);
}

console.log('\n══ 5. LE CURSEUR SUIT L\'ÉTAT ACTIF DE SA FAMILLE ══\n');
/* On EXÉCUTE `segPoser` sur les deux familles. Si l\'état actif redevenait « active » en dur,
   le segmenté du tableau de bord n\'aurait plus AUCUN curseur — exactement ce que Justin
   voyait. Un `grep` sur `fam.actif` ne l\'aurait pas prouvé. */
{ const rafs=[];
  const fauxDoc={ createElement:()=>({ className:'', style:{}, setAttribute(){} }) };
  const P=new Function('document','requestAnimationFrame',
    decoupe('const SEG_FAMILLES=[')+'\n'+
    decoupe('function segFamille(g){')+'\n'+
    decoupe('function segPoser(g,ch,anime,fam){')+'\n'+
    'return segPoser;')(fauxDoc, f=>rafs.push(f));

  const boite=(l,w)=>()=>({left:l,top:0,width:w,height:30});
  const seg=(actifCls,on,l)=>({ classList:{contains:c=>c===actifCls&&on}, getBoundingClientRect:boite(l,76) });
  const groupe2=(classes,actifCls,iActif)=>{ let cur=null;
    const enf=[0,1,2,3].map(i=>seg(actifCls,i===iActif,10+i*80));
    return { _cur:()=>cur, _enf:enf,
      matches:s=>String(s).split(',').some(x=>classes.indexOf(x.trim().slice(1))>=0),
      getBoundingClientRect:boite(0,340),
      querySelector:()=>cur, firstChild:null, insertBefore:(c)=>{ cur=c; } }; };

  const gt=groupe2(['tdb-seg'],'on',2);
  P(gt,gt._enf,false);
  vrai('⛔ .tdb-seg : un curseur EST posé (l\'état actif s\'y appelle « on », pas « active »)', !!gt._cur());
  v('   … à la bonne largeur', gt._cur()&&gt._cur().style.width, '76px');
  v('   … et sur la TROISIÈME période, pas sur la première',
    gt._cur()&&gt._cur().style.transform, 'translate(170px,0px)');

  const gf=groupe2(['filters'],'active',0);
  P(gf,gf._enf,false);
  vrai('.filters : rien n\'a régressé, le curseur est là', !!gf._cur());
  v('   … sur le premier chip', gf._cur()&&gf._cur().style.transform, 'translate(10px,0px)');

  const gv=groupe2(['tdb-seg'],'on',-1);
  P(gv,gv._enf,false);
  v('⛔ aucun segment actif : on ne pose pas un curseur au hasard', gv._cur(), null);
}

console.log('\n══ 6. LE GLISSEMENT DU DOIGT ══\n');
/* Justin, 22 septembre 2026 : « par ici, avec le glissement du doigt ». Le comportement est
   mesuré au navigateur (`scratchpad/sonde-seg.js`, 11 ✓, sur le VRAI tableau de bord) ; ce qui
   est gardé ici, ce sont les quatre décisions qui ne se voient pas à l\'œil. */
{ const ge=corps('segGeste');
  vrai('⛔ le geste est BRANCHÉ — segInit l\'appelle (défini et jamais appelé, c\'est du code mort)',
    /segGeste\(g,fam\)/.test(corps('segInit')));
  vrai('⛔ un groupe qui DÉFILE garde le doigt pour lui (même règle que le planning)',
    /g\.scrollWidth>g\.clientWidth\+4/.test(ge));
  vrai('⛔ le point d\'arrivée est PROJETÉ — un coup sec vaut un glissement lent',
    /swipeProjeter\(vitesse\)/.test(ge));
  vrai('⛔⛔ on CLIQUE le segment choisi : son onclick porte déjà toute l\'action, on n\'en écrit pas une seconde',
    /l\[j\]\.click\(\)/.test(ge));
  vrai('⛔ le choix est borné aux deux bouts du groupe',
    /Math\.max\(0,Math\.min\(l\.length-1/.test(ge));
  /* ⚠ LA FORME A CHANGÉ LE 22 SEPTEMBRE AU SOIR : on n'abandonne plus sur |dy| >= |dx| —
     c'était le premier frémissement du pouce, et l'abandon était définitif. On attend que
     l'intention soit CLAIRE, avec la même exigence de dominance des deux côtés. Mesuré :
     le geste passait jusqu'à 11° d'angle, il passe à 18° — et le défilement reste protégé. */
  vrai('⛔ un mouvement VERTICAL FRANC rend la main au défilement de la page',
    /if\(ay>=SWIPE_ENGAGE && ay>ax\*SWIPE_DOMINANCE\)\{ actif=false; return; \}/.test(ge));
  vrai('⛔ … et tant que rien n’est significatif, on ATTEND au lieu de trancher',
    /if\(ax<SWIPE_ENGAGE && ay<SWIPE_ENGAGE\) return;/.test(ge));
  vrai('⛔ les écouteurs ne s\'empilent pas (drapeau)', /g\._segGeste/.test(ge));
  vrai('le doigt est suivi par des évènements TACTILES', /'touchstart'/.test(ge) && /'touchmove'/.test(ge) && /'touchend'/.test(ge));
  /* ⛔ LA LEÇON DE LA BARRE DU BAS, RECOPIÉE ICI : `pointercancel` part au PREMIER mouvement
     horizontal, le navigateur prenant le défilement à son compte. Un geste bâti dessus ne part
     jamais. `touchcancel`, lui, ne part que si le système reprend vraiment la main. */
  vrai('⛔⛔ PAS de pointercancel — il part au premier mouvement horizontal et tue le geste',
    /'touchcancel'/.test(ge) && !/pointercancel/.test(ge));
  vrai('la souris reste servie, et elle seule côté pointeur', (ge.match(/pointerType!=='mouse'/g)||[]).length>=3);
  vrai('⛔ mouvement réduit : le curseur ne se traîne pas sous le doigt', /prefers-reduced-motion: reduce/.test(ge));
  vrai('un changement se sent sous le doigt, s\'il y a de quoi', /navigator\.vibrate/.test(ge));
  /* ⛔ Le repositionnement au redimensionnement ne connaissait QUE `.filters` : le segmenté du
     tableau de bord gardait un curseur à la mauvaise place. */
  vrai('⛔ le redimensionnement replace les DEUX familles, pas seulement .filters',
    /querySelectorAll\('\.seg-on'\)/.test(corps('segRepositionner')));
}

console.log('\n══ 7. UN ÉCRAN QUI SE REDESSINE EN PARTIE GARDE SON CURSEUR ══\n');
/* ⛔⛔ Mesuré le 22 septembre 2026 sur les quatre périodes : « groupe présent · curseur NON ·
   écouteur false ». `segInit` n\'était appelé que par `rendreVueSure`, c\'est-à-dire au rendu
   COMPLET d\'une vue ; changer la période reconstruit la carte sans y repasser. Le geste
   marchait UNE fois — pire qu\'un geste absent. */
{ const so=corps('segObserver');
  vrai('⛔ l\'observateur est BRANCHÉ là où l\'écran s\'écrit vraiment',
    /segInit\(\$\('content'\)\); segObserver\(\);/.test(NU));
  vrai('il regarde le conteneur de la vue', /getElementById\('content'\)/.test(so));
  vrai('⛔ il voit les réécritures PARTIELLES, à toute profondeur',
    /childList:true,subtree:true/.test(so));
  /* ⛔ `segPoser` écrit le style du curseur : observer les attributs ferait boucler sans fin. */
  vrai('⛔⛔ il n\'observe PAS les attributs — segPoser écrit le curseur, ça bouclerait',
    !/attributes\s*:\s*true/.test(so));
  vrai('⛔ il est temporisé (une vue pose des dizaines de nœuds d\'affilée)',
    /clearTimeout\(_segObsMin\)/.test(so) && /setTimeout\(/.test(so));
  vrai('⛔ le précédent est DÉBRANCHÉ — sinon chaque rendu en empile un de plus',
    /_segObs\.disconnect\(\)/.test(so));
  vrai('il survit à un navigateur sans MutationObserver', /window\.MutationObserver/.test(so));
}

console.log('\n══ 8. LE STYLE DU SEGMENTÉ DU TABLEAU DE BORD ══\n');
{ const titre='LE PLANNING DU TABLEAU DE BORD';
  const i0=APP.indexOf(titre);
  vrai('⛔ le bloc de style est trouvé (sinon tout ce qui suit est creux)', i0>0);
  const suivant=APP.indexOf('/* ══', i0+titre.length), style=APP.indexOf('</style>', i0);
  const fin=(suivant>0&&(style<0||suivant<style))?suivant:style;
  const css=(i0>0?APP.slice(i0, fin>0?fin:i0+9000):'').replace(/\/\*[\s\S]*?\*\//g,' ');
  v('   … et il a de la matière', css.length>1200, true);
  /* ⛔ DEUX SURFACES POUR UNE MÊME CHOSE : la pastille du segment actif ET le curseur qui
     glisse feraient un halo autour d\'un halo, et le curseur arriverait sur un fond déjà peint. */
  vrai('⛔⛔ le segment actif ne peint plus sa propre pastille — c\'est le curseur qui le désigne',
    /\.tdb-seg span\.on\{background:none!important/.test(css) && /\.tdb-seg span\.on\{[^}]*box-shadow:none/.test(css));
  /* depuis le 23 septembre 2026 l'encre de l'accent y est MÊLÉE à l'encre principale : posée sur
     le curseur (plus clair que la carte), l'accent seul tombait à 2,87 au pixel (violet de nuit).
     La couleur dit toujours lequel est choisi — c'est ce que ce contrôle garde. */
  vrai('   … mais la couleur du texte reste (elle dit lequel est choisi sans le curseur)',
    /\.tdb-seg span\.on\{[^}]*color:(var\(--acc-txt\)|color-mix\(in srgb,var\(--acc-txt\) [5-9]\d%,var\(--t1\)\))/.test(css));
  /* ⛔ Mesuré sur la capture de Justin : « 7 jours », « 14 jours » et « Le mois » passaient À
     LA LIGNE — le groupe doublait de hauteur et le curseur devenait plus haut que large. */
  vrai('⛔⛔ aucune période ne passe à la ligne', /\.tdb-seg span\{[^}]*white-space:nowrap/.test(css)
    && /\.tdb-seg\{[^}]*flex-wrap:nowrap/.test(css));
  vrai('⛔ le groupe porte un contexte d\'empilement (le curseur est DERRIÈRE le texte)',
    /\.tdb-seg\{[^}]*isolation:isolate/.test(css) && /\.tdb-seg span\{[^}]*z-index:1/.test(css));
  vrai('⛔ le curseur est à top:0 (un top non nul s\'ajoute à la transformation)',
    /\.tdb-seg \.seg-cur\{[\s\S]{0,200}position:absolute;top:0;left:0/.test(css));
  vrai('⛔ il ne prend jamais le doigt à la place d\'une période',
    /\.tdb-seg \.seg-cur\{[\s\S]{0,200}pointer-events:none/.test(css));
  vrai('la durée est celle de la maquette, la même que pour .filters',
    /transition:transform \.42s cubic-bezier\(\.32,\.72,0,1\)/.test(css));
  vrai('⛔ 44 px sous le doigt sur téléphone', /max-width:780px[\s\S]{0,140}min-height:44px/.test(css));
  vrai('⛔ le mouvement réduit fait SAUTER le curseur au lieu de le faire glisser',
    /prefers-reduced-motion: reduce[\s\S]{0,140}\.tdb-seg \.seg-cur/.test(css));
  vrai('la nuit ne garde pas une pastille blanche', /data-theme="dark"\][\s\S]{0,40}\.tdb-seg \.seg-cur/.test(css));
  vrai('le verre le prend pour une matière, pas pour un aplat',
    /data-verre="1"\] \.tdb-seg \.seg-cur\{[\s\S]{0,260}backdrop-filter/.test(css));
  vrai('Windows reprend ses coins droits', /html\[data-os="windows"\] \.tdb-seg \.seg-cur/.test(css));
  const sansGarde=css.split('}').filter(r=>{ const sel=r.slice(0,r.indexOf('{')).trim();
    if(!sel||/^@/.test(sel)||/^from|^to/.test(sel)) return false;
    if(sel.indexOf('/*')>=0||sel.indexOf('*')===0) return false;
    return sel.indexOf('html[')<0;
  });
  v('⛔⛔ AUCUNE règle du bloc ne touche un écran sans passer par un attribut',
    sansGarde.map(r=>r.slice(0,50).trim()).filter(Boolean), []);
}


console.log('Le bac « À planifier » remplit sa rangée sur un téléphone');
/* ⛔ SIGNALÉ PAR JUSTIN LE 22 SEPTEMBRE 2026, CAPTURE À L'APPUI, PUIS REPRODUIT AU NAVIGATEUR.
   `.plg-trayrow .plg-mini{max-width:230px}` dans un conteneur de 398 px : la carte se cale à
   230, UNE seule tient par rangée, il reste 168 px de vide à droite — et le texte est coupé en
   même temps. Mesuré sur iPhone 430×932 avec des clients aux noms longs (ceux de sa base) :
   carte 230 px = 58 % du conteneur, 102 ellipses actives. Après correctif : 398 px, 100 %,
   0 px de vide, 0 ellipse.
   Le plafond garde un sens au BUREAU, où le bac s'étale sur plusieurs colonnes — on ne le
   retire donc que sous la rupture téléphone du dépôt (780 px). */
{ /* ⛔ ON NETTOIE LES COMMENTAIRES AVANT DE CHERCHER : le commentaire que ce correctif porte
     dans app.html cite `max-width:none` mot pour mot. Un motif qui tombe dessus garderait une
     explication, pas un comportement — la règle de CLAUDE.md, appliquée à elle-même. */
  const NU=APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm,' ').replace(/^[ \t]*\/\/.*$/gm,' ');
  vrai('le nettoyage a laissé du code',NU.length>APP.length*0.6);
  const i=NU.indexOf('@media(max-width:780px){ .plg-trayrow .plg-mini{');
  vrai('la règle téléphone du bac existe',i>0);
  const regle=i>0?NU.slice(i,NU.indexOf('}',NU.indexOf('{',i+40))+1):'';
  vrai('…elle lève le plafond',/max-width:none/.test(regle));
  vrai('…et elle laisse la carte GRANDIR',/flex:1 1 /.test(regle));
  /* ⚠ les deux vont ENSEMBLE : sans max-width:none, flex-grow ne peut pas dépasser 230 px.
     C'est le piège du correctif, et c'est pour ça qu'on l'éprouve ici plutôt qu'à l'œil. */
  vrai('les deux sont dans la MÊME règle',/max-width:none/.test(regle)&&/flex:1 1 /.test(regle));
  /* et le plafond du bureau n'a pas été emporté au passage */
  vrai('le bureau garde son plafond de 230 px',
    /\.plg-trayrow \.plg-mini\{min-width:150px;max-width:230px;flex:0 1 auto;margin:0\}/.test(NU));
  /* la rupture est bien celle du dépôt, pas une inventée */
  v('la rupture est celle des autres règles téléphone',(NU.match(/@media\(max-width:780px\)/g)||[]).length>=8,true); }

console.log('\n═══ test-753 : '+ok+' ✓ '+ko+' ✗ ═══\n');
process.exit(ko?1:0);
