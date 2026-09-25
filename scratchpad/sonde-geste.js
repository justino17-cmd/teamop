/* ══ SONDE — LA BULLE QU'ON ATTRAPE, ET LE GLISSEMENT DU CONTENU ══════════════════════════
   Justin, 23 septembre 2026, après l'avoir essayé au doigt : « ça marche, mais ça fait pas du
   tout comme sur Instagram. Moi je voudrais qu'on soit appuyé sur la bulle et qu'on déplace
   la bulle avec notre doigt. Là on glisse comme si on descendait sur une page Internet. »

   Un geste est une SUITE D'ÉVÉNEMENTS DANS LE TEMPS : aucune expression régulière ne joue ça.
   Cette sonde envoie de VRAIS `Input.dispatchTouchEvent`, et relève la bulle IMAGE PAR IMAGE
   sous le doigt — c'est la seule façon de voir si elle suit la main ou si elle s'en éloigne.

   CE QU'ELLE EXIGE, dans l'ordre où Justin l'a dit :
   1. on appuie SUR la bulle : elle se soulève au contact ;
   2. on glisse : la bulle suit le doigt, DANS LE MÊME SENS, à l'endroit où on l'a prise ;
   3. on lâche : la rubrique sous la bulle s'ouvre — une seule navigation ;
   et tout ce qui ne doit PAS changer : le tap, « Plus », l'appui long pour choisir ses onglets
   (sur un AUTRE onglet), le glissement de PAGE sur le contenu, la souris.

   ⛔ PIÈGES DE MESURE DÉJÀ PAYÉS ICI, gardés pour la prochaine fois :
   · on part d'une rubrique du MILIEU : depuis la première, « vers la gauche » n'a rien à
     atteindre, et ça ressemble à un défaut de sens (faux défaut du 22 septembre) ;
   · le panneau d'assistance s'ouvre tout seul pour un compte jamais vu, et une fenêtre
     modale coupe les gestes : on range les deux AVANT chaque geste ;
   · une sonde qui dit « rien ne s'est passé » doit pouvoir dire SI le doigt est arrivé et
     SI un `go()` est parti : on compte les événements ET les navigations.
   · ⛔⛔ ON COMPARE LA BULLE AU DOIGT QUE LA PAGE A REÇU, PAS À CELUI QU'ON A ENVOYÉ. Mesuré le
     23 septembre 2026 : ce Chromium piloté ne transmet AUCUN `touchmove` de moins de ~15 px
     (seuil tactile du navigateur — 1, 2, 4, 8, 13 px : rien ; 17,6 px : reçu), même quand la
     page retient le contact par `preventDefault`. Et il livre les mouvements au rythme des
     IMAGES : relu trop tôt, le dernier n'est pas encore arrivé. La première version de cette
     sonde comparait la bulle aux positions ENVOYÉES et accusait l'application d'un retard de
     13 px qu'elle n'avait pas — la bulle était à 0,0 px du dernier doigt reçu. On relève donc
     le doigt côté page (`__DX`), on attend deux images après chaque mouvement, et on NOMME ce
     que le navigateur a retenu. Un iPhone, lui, transmet dès le premier pixel.
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
  L.push('      page mesurée : '+S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1000); await S.ev(`window.confirm=()=>true;window.alert=()=>{};return 1;`);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.ev(`setPlatForce('iosweb'); setThemePref('light'); return 1;`); await dormir(400);

  /* compteurs : événements reçus, navigations parties (avec leur origine), clics d'onglet */
  await S.ev(`
    window.__T=[]; window.__GO=[]; window.__CLK=[]; window.__DX=null;
    document.addEventListener('touchmove',e=>{ if(e.touches&&e.touches[0]) window.__DX=e.touches[0].clientX; },true);
    ['touchstart','touchmove','touchend','touchcancel','click'].forEach(t=>
      document.addEventListener(t,e=>{ window.__T.push(t); if(t==='click')
        window.__CLK.push((e.target&&e.target.closest&&e.target.closest('.tab'))?e.target.closest('.tab').dataset.tab:'(hors)'); },true));
    const _go=window.go; window.go=function(k){
      let via=''; try{ via=((new Error()).stack.split('\\n')[2]||'').trim().split(' ')[1]||''; }catch(e){}
      window.__GO.push(k+(via?'←'+via:'')); return _go.apply(this,arguments); };
    return 1;`);
  const remettre=()=>S.ev(`window.__T=[];window.__GO=[];window.__CLK=[]; return 1;`);
  const compteurs=()=>S.ev(`const c={}; window.__T.forEach(t=>c[t]=(c[t]||0)+1);
    return {evts:c, go:window.__GO.slice(), clics:window.__CLK.slice()};`);

  /* ⛔ On ferme le panneau d'assistance, les fenêtres modales ET le tiroir avant chaque geste. */
  const ranger=()=>S.ev(`try{ asstOpen=false; renderAsst(); }catch(e){} try{ closeModal(); }catch(e){}
    try{ document.getElementById('sidebar').classList.remove('open'); }catch(e){} return 1;`);
  const vue=()=>S.ev(`return current;`);
  const aller=async(k)=>{ await S.ev(`go('${k}'); return 1;`); await dormir(800); await ranger(); await dormir(300); await remettre(); };

  /* La géométrie : le centre VISUEL de la bulle (transformations comprises) et celui de
     chaque onglet — c'est ce que l'œil compare. */
  const geo=()=>S.ev(`const b=document.getElementById('tabbar'), c=document.getElementById('tab-cur');
    if(!b||!c) return null; const r=c.getBoundingClientRect();
    return { pc:r.left+r.width/2, pl:r.left, pr:r.right, dx:window.__DX, tire:b.classList.contains('tire'), vis:b.classList.contains('cur-on'),
      op:+getComputedStyle(c).opacity, echelle:getComputedStyle(c).scale,
      tabs:[...b.querySelectorAll('.tab')].map(t=>{ const q=t.getBoundingClientRect();
        return {k:t.dataset.tab, c:q.left+q.width/2, on:t.classList.contains('on'), sv:t.classList.contains('survol'),
                encre:getComputedStyle(t).color}; }) };`);
  const tD=(x,y)=>S.c.envoyer('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  const tM=(x,y)=>S.c.envoyer('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
  const tU=()=>S.c.envoyer('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  /* Deux images : le navigateur livre les mouvements tactiles au rythme de l'affichage. */
  const deuxImages=()=>S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  /* Un glissement suivi : on relève la bulle après CHAQUE mouvement du doigt, avec la
     position du doigt que la PAGE a reçue (`recu`, nul tant que le navigateur retient). */
  const suivre=async(x0,y,x1,pas)=>{
    const n=pas||16, rel=[];
    await S.ev(`window.__DX=null; return 1;`);
    await tD(x0,y); await deuxImages();
    const g0=await geo();
    for(let i=1;i<=n;i++){ const x=x0+(x1-x0)*i/n; await tM(x,y); await deuxImages(); const g=await geo(); rel.push({x,recu:g.dx,g}); }
    return {g0,rel};
  };
  const lacher=async()=>{ await tU(); await dormir(750); };
  const glisser=async(x0,y,x1)=>{ await suivre(x0,y,x1,14); await lacher(); };

  const bar=await S.ev(`
    const b=document.getElementById('tabbar'); if(!b) return null;
    const r=b.getBoundingClientRect();
    return { y:Math.round(r.y+r.height/2),
             vues:[...b.querySelectorAll('.tab')].map(t=>t.dataset.tab).filter(k=>k&&k!=='_plus'),
             bulle: b._bulle===true, geste: document._geste===true };`);

  titre('0. LA SONDE REGARDE BIEN QUELQUE CHOSE');
  vrai('population : la barre d’onglets existe', !!bar);
  if(!bar){ console.log(L.join('\n')); S.fermer(); process.exit(1); }
  vrai('population : la bulle a son geste (posé sur la barre)', bar.bulle);
  vrai('population : le glissement de PAGE est posé sur le document', bar.geste);
  vrai('population : au moins quatre rubriques (deux sens ET un saut de deux)', bar.vues.length>=4);
  const V=bar.vues, m=1;                       // on part de la DEUXIÈME rubrique : il y en a une de chaque côté
  L.push('      rubriques : '+V.join(' · ')+'   barre à y='+bar.y);
  L.push('      départ du milieu : « '+V[m]+' »');
  const centre=async(k)=>{ const g=await geo(); const t=g.tabs.find(x=>x.k===k); return t?Math.round(t.c):null; };

  titre('1. ⛔ ON APPUIE SUR LA BULLE : ELLE SE SOULÈVE AU CONTACT');
  await aller(V[m]);
  { const g=await geo(); const cOn=g.tabs.find(t=>t.on);
    vrai('population : la bulle est visible sous la rubrique de départ', g.vis && cOn && Math.abs(g.pc-cOn.c)<2);
    await tD(Math.round(g.pc), bar.y); await dormir(320);
    const h=await geo();
    vrai('⛔ au contact, sans bouger : elle est soulevée (`tire`)', h.tire);
    vrai('… et elle a grandi (échelle ≠ 1)', h.echelle && h.echelle!=='none' && h.echelle!=='1');
    L.push('      échelle tenue en main : '+h.echelle);
    await tU(); await dormir(700);
    const k=await geo();
    vrai('au lâcher sans glisser : elle se repose (plus soulevée)', !k.tire);
    v('… et on reste sur la même rubrique', await vue(), V[m]); }

  titre('2. ⛔ LA BULLE SUIT LE DOIGT — DANS LE MÊME SENS, À L’ENDROIT OÙ ON L’A PRISE');
  await aller(V[m]);
  { const cDep=await centre(V[m]), cArr=await centre(V[m+1]);
    /* On la prend DÉCENTRÉE (10 px à droite de son milieu) : elle ne doit pas sauter pour se
       centrer sous le doigt — c'est la différence entre tenir un objet et le rappeler. */
    const x0=cDep+10;
    const {g0,rel}=await suivre(x0,bar.y,cArr+10,16);
    const prise=x0-g0.pc;
    L.push('      prise à '+prise.toFixed(1)+' px du milieu de la bulle');
    const recus=rel.filter(p=>p.recu!=null), retenus=rel.length-recus.length;
    /* Avant le premier mouvement reçu, la bulle ne doit pas avoir bougé : rien n'est arrivé. */
    const avant=rel.filter(p=>p.recu==null).map(p=>Math.abs(p.g.pc-g0.pc));
    const ecarts=recus.map(p=>Math.abs(p.g.pc-(p.recu-prise)));
    const pire=ecarts.length?Math.max(...ecarts):99;
    L.push('      ⚠️ retenus par le navigateur (seuil tactile) : '+retenus+' mouvement(s), les '+(retenus?(rel[retenus-1].x-x0).toFixed(1):0)+' premiers px');
    L.push('      écart bulle ↔ doigt REÇU, image par image : '+ecarts.map(e=>e.toFixed(1)).join(' · '));
    vrai('population : seize relevés pendant le glissement', rel.length===16);
    vrai('population : au moins douze mouvements reçus par la page (sinon l’écart ne se mesure pas)', recus.length>=12);
    vrai('tant que rien n’est reçu, la bulle ne bouge pas (elle ne devine pas)', avant.every(e=>e<1));
    vrai('⛔ elle ne saute pas sous le doigt à la prise (écart au 1ᵉʳ mouvement reçu < 3 px)', ecarts.length && ecarts[0]<3);
    vrai('⛔⛔ elle suit le doigt image par image (pire écart < 3 px)', pire<3);
    const monte=rel.every((p,i)=>i===0 || p.g.pc>=rel[i-1].g.pc-0.5);
    vrai('⛔⛔ le doigt va à DROITE, la bulle va à DROITE (jamais à l’opposé)', monte && rel[rel.length-1].g.pc>g0.pc+40);
    vrai('pendant le geste elle reste soulevée', rel.every(p=>p.g.tire));
    const fin=rel[rel.length-1].g;
    v('⛔ l’onglet sous la bulle s’allume (c’est lui qu’on obtiendra)', (fin.tabs.find(t=>t.sv)||{}).k, V[m+1]);
    const dep=fin.tabs.find(t=>t.k===V[m]), sv=fin.tabs.find(t=>t.k===V[m+1]);
    vrai('⛔ … et l’onglet de départ s’éteint (une seule réponse allumée)', dep && sv && dep.encre!==sv.encre);
    await remettre(); await lacher();
    const C=await compteurs();
    v('⛔ au lâcher : la rubrique sous la bulle s’ouvre', await vue(), V[m+1]);
    v('⛔ … une seule navigation pour un seul geste', C.go.length, 1);
    v('⛔ … et aucun clic d’onglet n’a suivi', C.clics, []);
    const g=await geo(); const on=g.tabs.find(t=>t.on);
    vrai('… la bulle s’est posée exactement sur son onglet', on && on.k===V[m+1] && Math.abs(g.pc-on.c)<2); }

  titre('3. VERS LA GAUCHE, ET UN SAUT DE DEUX');
  await aller(V[m]);
  await glisser(await centre(V[m]), bar.y, await centre(V[m-1]));
  v('bulle glissée d’un cran à gauche', await vue(), V[m-1]);
  await aller(V[m]);
  await glisser(await centre(V[m]), bar.y, await centre(V[m+2]));
  v('bulle glissée de deux crans à droite', await vue(), V[m+2]);

  titre('4. ⛔ ON L’EMMÈNE ET ON LA RAMÈNE : ON NE VA NULLE PART');
  await aller(V[m]);
  { const c0=await centre(V[m]), c1=await centre(V[m+1]);
    await tD(c0,bar.y); await dormir(60);
    for(let i=1;i<=8;i++){ await tM(c0+(c1-c0)*i/8,bar.y); await dormir(22); }
    for(let i=7;i>=0;i--){ await tM(c0+(c1-c0)*i/8,bar.y); await dormir(22); }
    await remettre(); await lacher();
    const C=await compteurs();
    v('on reste sur la rubrique de départ', await vue(), V[m]);
    v('… sans aucune navigation', C.go, []); }

  titre('5. ⛔ PARTI D’UN AUTRE ONGLET : LA BULLE VIENT SOUS LE DOIGT, PUIS LE SUIT');
  await aller(V[m]);
  { const cA=await centre(V[m+1]), cB=await centre(V[m+2]);
    const {g0,rel}=await suivre(cA,bar.y,cB,16);
    const fin=rel[rel.length-1];
    L.push('      bulle à '+fin.g.pc.toFixed(1)+' pour un doigt reçu à '+(fin.recu==null?'—':fin.recu.toFixed(1)));
    vrai('population : le doigt est bien arrivé à la page', fin.recu!=null);
    vrai('⛔ en fin de glissement la bulle est sous le doigt (< 3 px)', fin.recu!=null && Math.abs(fin.g.pc-fin.recu)<3);
    /* Elle part de SA place (l'onglet actif) et rejoint le doigt : au moins un relevé la voit
       en chemin, ni à son point de départ ni déjà sous le doigt. */
    const enChemin=rel.filter(p=>p.recu!=null && Math.abs(p.g.pc-g0.pc)>3 && Math.abs(p.g.pc-p.recu)>3).length;
    L.push('      relevés où elle est EN CHEMIN vers le doigt : '+enChemin);
    vrai('… et elle y est VENUE, pas téléportée (au moins un relevé en chemin)', enChemin>=1);
    await remettre(); await lacher();
    const C=await compteurs();
    v('⛔ la rubrique sous la bulle s’ouvre', await vue(), V[m+2]);
    v('… une seule navigation', C.go.length, 1);
    /* ⛔ C'est ici que l'ANCIEN geste se trahirait : un balayage de page d'un onglet à l'autre
       aurait fait « un cran dans le sens du doigt », pas « l'onglet sous la bulle ». */
    vrai('… et pas celle d’un balayage de page (qui aurait fait un seul cran vers la gauche)', (await vue())!==V[m-1]); }

  titre('6. ⛔ LE BORD RÉSISTE, ET « PLUS » N’EST PAS UNE PLACE POUR LA BULLE');
  { const der=V[V.length-1];
    await aller(V[V.length-2]);
    const cD=await centre(V[V.length-2]), cPlus=await centre('_plus'), cDer=await centre(der);
    const {rel}=await suivre(cD,bar.y,Math.min(385,cPlus+30),18);
    const loin=Math.max(...rel.map(p=>p.g.pc));
    L.push('      doigt jusqu’à '+Math.min(385,cPlus+30)+' · bulle au plus loin '+loin.toFixed(1)+' · dernier onglet '+cDer);
    vrai('⛔ la bulle dépasse le dernier onglet de moins de 40 px (le ressort)', loin<cDer+40);
    vrai('… mais elle le dépasse un peu (elle résiste, elle ne bute pas)', loin>cDer+3);
    await lacher();
    v('au lâcher, c’est la dernière RUBRIQUE qui s’ouvre', await vue(), der);
    v('… et le tiroir ne s’est pas ouvert', await S.ev(`return document.getElementById('sidebar').classList.contains('open');`), false); }

  titre('7. LE TAP NE CHANGE PAS');
  await aller(V[m]);
  { const cible=await centre(V[m+1]);
    await tD(cible,bar.y); await dormir(60); await tU(); await dormir(800);
    const C=await compteurs();
    v('un tap sur un onglet l’ouvre', await vue(), V[m+1]);
    v('… par une seule navigation', C.go.length, 1); }
  await aller(V[m]);
  { const cP=await centre('_plus');
    await tD(cP,bar.y); await dormir(60); await tU(); await dormir(700);
    v('un tap sur « Plus » ouvre le tiroir', await S.ev(`return document.getElementById('sidebar').classList.contains('open');`), true);
    await ranger(); }

  titre('8. L’APPUI LONG : UNE PRISE SUR LA BULLE, LE CHOIX DES ONGLETS AILLEURS');
  await aller(V[m]);
  { const c0=await centre(V[m]);
    await tD(c0,bar.y); await dormir(900);
    const choix=await S.ev(`return !!document.getElementById('og-compte');`);
    await tU(); await dormir(600);
    v('⛔ tenue une seconde, la bulle n’ouvre PAS le choix des onglets (c’est une prise)', choix, false);
    await ranger(); }
  await aller(V[m]);
  { const c2=await centre(V[m+2]);
    await tD(c2,bar.y); await dormir(900);
    const choix=await S.ev(`return !!document.getElementById('og-compte');`);
    await tU(); await dormir(600);
    v('un appui long sur un AUTRE onglet ouvre toujours le choix', choix, true);
    v('… et ne navigue pas', await vue(), V[m]);
    await ranger(); }

  titre('9. LE GLISSEMENT DE PAGE SUR LE CONTENU RESTE CE QU’IL ÉTAIT');
  { let bons=0, faits=0; const rates=[], ecartes=[];
    for(const [sens,att] of [['gauche',V[m+1]],['droite',V[m-1]]]){
      for(const x0 of [70,120,160,200,240,280,320]){
        const x1 = sens==='gauche' ? Math.max(15,x0-200) : Math.min(375,x0+200);
        if(Math.abs(x1-x0)<120) continue;
        await aller(V[m]);
        const g=await S.ev(`const e=document.elementFromPoint(${x0},420);
          return { libre: !!e && !swipeExclu(e) && !swipeDefileH(e), cible: e?e.tagName.toLowerCase()+(e.id?'#'+e.id:''):'RIEN' };`);
        if(!g.libre){ ecartes.push(sens+' x'+x0+' : '+g.cible); continue; }
        await glisser(x0,420,x1);
        faits++; const a=await vue();
        if(a===att) bons++; else rates.push(sens+' x'+x0+'→'+x1+' = '+a);
      }
    }
    L.push('      '+bons+' / '+faits+' balayages du contenu arrivent au bon endroit');
    ecartes.forEach(e=>L.push('      ⚠️ écarté (le geste ne DOIT pas partir là) : '+e));
    vrai('population : au moins six balayages du contenu ont pu être joués', faits>=6);
    v('⛔ tous arrivent au bon endroit', rates, []); }

  titre('10. LA SOURIS (fenêtre de bureau rétrécie)');
  await aller(V[m]);
  { const c0=await centre(V[m]), c1=await centre(V[m+1]);
    const souris=(type,x,extra)=>S.c.envoyer('Input.dispatchMouseEvent',Object.assign({type,x,y:bar.y,button:'left',pointerType:'mouse'},extra||{}));
    await souris('mousePressed',c0,{buttons:1,clickCount:1}); await dormir(60);
    for(let i=1;i<=10;i++){ await souris('mouseMoved',c0+(c1-c0)*i/10,{buttons:1}); await dormir(24); }
    await souris('mouseReleased',c1,{buttons:0,clickCount:1}); await dormir(800);
    v('la bulle se tire aussi à la souris', await vue(), V[m+1]);
    await aller(V[m]);
    const c2=await centre(V[m+2]);
    await souris('mousePressed',c2,{buttons:1,clickCount:1}); await dormir(50);
    await souris('mouseReleased',c2,{buttons:0,clickCount:1}); await dormir(800);
    v('⛔ … et un simple clic de souris ouvre toujours l’onglet', await vue(), V[m+2]); }

  titre('11. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-geste : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
