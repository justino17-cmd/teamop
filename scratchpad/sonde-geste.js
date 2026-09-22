/* ══ SONDE — LE GLISSEMENT ENTRE RUBRIQUES ══════════════════════════════════════════════
   Justin, 22 septembre 2026, deux fois : « le glissement du doigt sur la barre marche
   toujours pas ». Un balayage est une SUITE D'ÉVÉNEMENTS DANS LE TEMPS : aucune expression
   régulière ne joue ça. Cette sonde envoie de VRAIS `Input.dispatchTouchEvent`.

   DEUX DÉFAUTS MESURÉS ICI, et ils s'additionnaient :
   1. `#tabbar` figurait dans `SWIPE_HORS` : glisser sur la BARRE ne faisait RIEN, alors que
      c'est là que le doigt va — la pastille est sous lui, on la pousse.
   2. ⛔ LE MÊME DOIGT NAVIGUAIT DEUX FOIS. Pile d'appel à l'appui : le balayage faisait
      `go('dashboard')`, puis le navigateur traitait le MÊME mouvement horizontal comme SON
      geste « retour » — `popstate` → `goBack()` → retour à la rubrique de départ. À l'écran :
      « ça ne marche pas », alors que ça marche et se fait annuler.

   ⛔ TROIS PIÈGES DE MESURE PAYÉS ICI, notés pour la prochaine fois :
   · ⚠️ UN FAUX DÉFAUT : « le geste ne marche que dans un sens ». Il marche dans les deux — le
     premier essai glissait vers la droite DEPUIS LE PREMIER ONGLET, où il n'y a rien à
     gauche. Toute mesure part donc d'une rubrique du MILIEU, et on le dit.
   · le panneau d'assistance s'ouvre tout seul pour un compte jamais vu (`maybeWelcome`) et
     il est dans `SWIPE_HORS` : sans `renderAsst()`, la sonde mesurait 0/7 sur le contenu et
     l'aurait rapporté comme un défaut. Une fenêtre modale fait pareil.
   · une sonde qui dit « rien ne s'est passé » doit pouvoir dire SI le doigt est arrivé et SI
     un `go()` est parti. On compte les événements ET les navigations, pile d'appel comprise.
   ⛔ Bêta uniquement, servie en 127.0.0.1.                                                */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c)=>v(t,!!c,true);
const titre=t=>L.push('\n══ '+t+' ══\n');

(async()=>{
  const S=await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1000); await S.ev(`window.confirm=()=>true;window.alert=()=>{};return 1;`);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`); await dormir(400);

  /* compteurs : événements reçus, navigations parties (avec leur origine), clics */
  await S.ev(`
    window.__T=[]; window.__GO=[]; window.__CLK=[];
    ['touchstart','touchmove','touchend','touchcancel','click'].forEach(t=>
      document.addEventListener(t,e=>{ window.__T.push(t); if(t==='click')
        window.__CLK.push((e.target&&e.target.closest&&e.target.closest('.tab'))?e.target.closest('.tab').dataset.tab:'(hors)'); },true));
    window.addEventListener('popstate',()=>window.__T.push('popstate'),true);
    const _go=window.go; window.go=function(k){
      let via=''; try{ via=((new Error()).stack.split('\\n')[2]||'').trim().split(' ')[1]||''; }catch(e){}
      window.__GO.push(k+(via?'←'+via:'')); return _go.apply(this,arguments); };
    return 1;`);
  const remettre=()=>S.ev(`window.__T=[];window.__GO=[];window.__CLK=[]; return 1;`);
  const compteurs=()=>S.ev(`const c={}; window.__T.forEach(t=>c[t]=(c[t]||0)+1);
    return {evts:c, go:window.__GO.slice(), clics:window.__CLK.slice()};`);

  /* ⛔ On ferme le panneau d'assistance ET les fenêtres modales AVANT chaque geste : les deux
     sont dans SWIPE_HORS à juste titre, et une sonde qui en laisse une ouverte mesure
     « le geste ne marche pas » sur un écran où il ne DOIT pas marcher. */
  const ranger=()=>S.ev(`try{ asstOpen=false; renderAsst(); }catch(e){} try{ closeModal(); }catch(e){} return 1;`);
  const vue=()=>S.ev(`return current;`);
  const aller=async(k)=>{ await S.ev(`go('${k}'); return 1;`); await dormir(800); await ranger(); await dormir(250); };
  const glisser=async(x0,y,x1)=>{
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y}]});
    for(let i=1;i<=14;i++){ await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/14,y}]}); await dormir(14); }
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await dormir(700); };
  const libre=(x,y)=>S.ev(`const e=document.elementFromPoint(${x},${y});
    return { libre: !!e && !swipeExclu(e) && !swipeDefileH(e),
             cible: e?e.tagName.toLowerCase()+(e.id?'#'+e.id:''):'RIEN' };`);

  const bar=await S.ev(`
    const b=document.getElementById('tabbar'); if(!b) return null;
    const r=b.getBoundingClientRect();
    return { y:Math.round(r.y+r.height/2),
             vues:[...b.querySelectorAll('.tab')].map(t=>t.dataset.tab).filter(k=>k&&k!=='_plus'),
             geste: document._geste===true };`);

  titre('0. LA SONDE REGARDE BIEN QUELQUE CHOSE');
  vrai('population : la barre d’onglets existe', !!bar);
  if(!bar){ console.log(L.join('\n')); S.fermer(); process.exit(1); }
  vrai('population : le geste est posé sur le document', bar.geste);
  vrai('population : au moins trois rubriques (sinon un sens ne se teste pas)', bar.vues.length>=3);
  /* ⚠️ ON PART DU MILIEU. Depuis la PREMIÈRE rubrique, glisser vers la droite ne doit RIEN
     faire — c'est juste, et c'est ce qui m'a fait croire à un défaut de sens. */
  const milieu=bar.vues[1], avant=bar.vues[0], apres=bar.vues[2];
  L.push('      rubriques : '+bar.vues.join(' · ')+'   barre à y='+bar.y);
  L.push('      départ du milieu : « '+milieu+' » (précédente « '+avant+' », suivante « '+apres+' »)');

  titre('1. ⛔ LA COUVERTURE — six départs, deux zones, deux sens');
  let bons=0, faits=0; const rates=[], ecartes=[];
  for(const [zone,y] of [['la BARRE',bar.y],['le CONTENU',420]]){
    for(const [sens,att] of [['gauche',apres],['droite',avant]]){
      for(const x0 of [30,70,120,200,280,350]){
        const x1 = sens==='gauche' ? Math.max(15,x0-200) : Math.min(375,x0+200);
        if(Math.abs(x1-x0)<120) continue;
        await aller(milieu);
        const g=await libre(x0,y);
        if(!g.libre){ ecartes.push(zone+'/'+sens+' x'+x0+' : '+g.cible); continue; }
        await glisser(x0,y,x1);
        faits++; const a=await vue();
        if(a===att) bons++; else rates.push(zone+'/'+sens+' x'+x0+'→'+x1+' = '+a);
      }
    }
  }
  L.push('      '+bons+' / '+faits+' balayages arrivent au bon endroit');
  ecartes.forEach(e=>L.push('      ⚠️ écarté (le geste ne DOIT pas partir là) : '+e));
  vrai('population : au moins douze balayages ont pu être joués', faits>=12);
  v('⛔ tous arrivent au bon endroit', rates, []);

  titre('2. ⛔ LES BORNES — on ne boucle pas, et c’est voulu');
  await aller(bar.vues[0]);
  await glisser(70,bar.y,290);
  v('depuis la PREMIÈRE rubrique, vers la droite : on ne bouge pas', await vue(), bar.vues[0]);
  const dernier=bar.vues[bar.vues.length-1];
  await aller(dernier);
  await glisser(290,bar.y,70);
  v('depuis la DERNIÈRE, vers la gauche : on ne bouge pas', await vue(), dernier);

  titre('3. ⛔ UN GESTE, UNE SEULE NAVIGATION');
  /* C'est le défaut du 22 septembre : le balayage naviguait, et le geste « retour » du
     navigateur le défaisait aussitôt. On compte les `go()` partis pendant le geste. */
  await aller(milieu);
  await remettre();
  await glisser(70,bar.y,290);
  const C=await compteurs();
  L.push('      évts='+JSON.stringify(C.evts)+'  go='+JSON.stringify(C.go)+'  clics='+JSON.stringify(C.clics));
  vrai('population : le doigt est bien arrivé (touchstart + touchmove + touchend)',
       C.evts.touchstart===1 && C.evts.touchend===1 && (C.evts.touchmove||0)>5);
  v('⛔ une seule navigation pour un seul geste', C.go.length, 1);
  v('⛔ … et aucun clic d’onglet n’a suivi le balayage', C.clics, []);
  v('… on arrive bien d’un cran en arrière', await vue(), avant);

  titre('4. ⛔ LE TAP N’EST PAS AVALÉ PAR LE GARDE-CLIC');
  await aller(milieu);
  const c=await S.ev(`
    const t=[...document.querySelectorAll('#tabbar .tab')].find(x=>x.dataset.tab==='${apres}');
    if(!t) return null; const b=t.getBoundingClientRect();
    return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};`);
  vrai('population : l’onglet visé est trouvé', !!c);
  if(c){
    await remettre();
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x,y:c.y}]});
    await dormir(60);
    await S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await dormir(800);
    v('un simple tap navigue toujours', await vue(), apres);
  }

  titre('5. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-geste : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
