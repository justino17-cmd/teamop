/* SONDE E — LE MENU DE BUREAU TIENT SUR UNE LIGNE, dans les trois langues. Pour chaque entrée du menu (`.nav-item`), à 1440 et 1100 px,
   en français, anglais et espagnol, jour et nuit : le nombre de lignes de son libellé (rectangles du texte), la largeur NATURELLE du
   libellé (copie en `white-space:nowrap`), la place qu'il a, et la MARGE qui reste. Une marge sous 8 px n'en est pas une : on mesure
   APRÈS, jamais sur le papier (CLAUDE.md : « deux pixels de marge ne sont pas une marge »). Mesure aussi la largeur du menu, le bord
   gauche de la page et d'une fenêtre plein écran (`.overlay.full`) : toutes doivent suivre le menu.
   Usage : OUT=/chemin node sonde-e.js   ⛔ bêta seulement. */
const path=require('path'), os=require('os');
const {demarrer,dormir}=require('./lib.js');
const OUT=process.env.OUT||path.join(os.tmpdir(),'op-metiers-sonde-e');
(async()=>{
  const S=await demarrer({demo:false});
  console.log('page',S.version);
  await S.ev(`window.confirm=()=>true; window.equipeTeamOP=()=>true; window.metierBloque=function(){ return false; }; try{ setLang('fr'); }catch(e){} return 1;`);
  let ok=0,ko=0; const ligne=(b,t)=>{ b?ok++:ko++; console.log((b?'  ✓ ':'  ✗ ')+t); };
  const pire={};
  for(const [pn,theme] of (process.env.PROFILS?process.env.PROFILS.split(',').map(x=>x.split(':')):[['bureau','light'],['bureau','dark'],['b1100','dark'],['b1100','light'],['mac27','dark'],['win','light']])){
    await S.profil(pn,theme);
    for(const lang of ['fr','en','es']){
      await S.ev(`setLang('${lang}'); try{ closeModal(); }catch(e){} go('dashboard'); renderNav(); return 1;`); await dormir(1000);
      const mes=()=>S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
        const sb=document.querySelector('.sidebar'), items=[...document.querySelectorAll('#nav .nav-item:not(.nav-item-fav)')];
        const out=items.map(it=>{ const w=document.createTreeWalker(it,NodeFilter.SHOW_TEXT); let tn=null,x; while(x=w.nextNode()){ if(x.nodeValue.trim()){ tn=x; break; } }
          if(!tn) return null; const r=document.createRange(); r.selectNodeContents(tn); const rects=[...r.getClientRects()].filter(q=>q.width>1);
          const lignes=new Set(rects.map(q=>Math.round(q.top))).size;
          const cs=getComputedStyle(it); const bo=it.getBoundingClientRect();
          const clone=document.createElement('span'); clone.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:'+getComputedStyle(tn.parentElement).font+';letter-spacing:'+cs.letterSpacing; clone.textContent=tn.nodeValue.trim(); document.body.appendChild(clone);
          const besoin=clone.getBoundingClientRect().width; clone.remove();
          const ico=it.querySelector('.ico'); const icoW=ico?ico.getBoundingClientRect().width+(parseFloat(getComputedStyle(ico).marginRight)||0):0;
          const place=bo.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-icoW-(parseFloat(cs.gap)||0)*(ico?1:0);
          return {l:tn.nodeValue.trim(), lignes, besoin:Math.round(besoin*10)/10, place:Math.round(place*10)/10, dep:it.scrollWidth>it.clientWidth+1}; }).filter(Boolean);
        const ov=document.querySelector('.overlay.full'); const content=document.querySelector('.content,#content');
        return {larg:Math.round(sb.getBoundingClientRect().width), contentX:Math.round(content.getBoundingClientRect().left), n:out.length, out};`);
      await mes(); await dormir(300); const r=await mes();
      const plusieurs=r.out.filter(o=>o.lignes>1), serres=r.out.filter(o=>o.place-o.besoin<8);
      const marge=Math.min(...r.out.map(o=>o.place-o.besoin));
      const tag=pn+' '+theme+' '+lang;
      pire[tag]={larg:r.larg,marge:Math.round(marge*10)/10,plusieurs:plusieurs.map(o=>o.l+' ('+o.besoin+'/'+o.place+')')};
      ligne(plusieurs.length===0 && serres.length===0, `${tag} : menu ${r.larg} px, ${r.n} entrées, ${plusieurs.length} sur plusieurs lignes${plusieurs.length?' ['+plusieurs.map(o=>o.l+' '+o.besoin+'/'+o.place).join(' ; ')+']':''}, marge la plus faible ${Math.round(marge*10)/10} px${serres.length?' — serrées : '+serres.slice(0,4).map(o=>o.l+' '+o.besoin+'/'+o.place).join(' ; '):''}`);
      /* la capture montre l'entrée la plus longue AU MILIEU du menu (elle est tout en bas de la liste : un haut de menu ne la montrerait pas) */
      await S.ev(`const v=document.querySelector('#nav .nav-item[data-view="validations"]'); if(v) v.scrollIntoView({block:'center'}); return 1;`); await dormir(300);
      await S.snap(`${OUT}/${pn}-${theme}-${lang}.png`,{x:0,y:0,width:Math.min(r.larg+60,520),height:900});
    }
  }
  // fenêtre plein écran et page : au bord du menu
  await S.profil('bureau','light'); await S.ev(`setLang('fr'); go('interventions'); formIntervention(); return 1;`); await dormir(1000);
  const bords=await S.ev(`const sb=document.querySelector('.sidebar').getBoundingClientRect(); const ov=document.querySelector('.overlay.full'); const o=ov?ov.getBoundingClientRect():null; return {menu:Math.round(sb.right), overlay:o?Math.round(o.left):null, ouvert:!!ov};`);
  ligne(bords.ouvert && bords.overlay===bords.menu, `la fenêtre plein écran commence au bord du menu : menu ${bords.menu}, fenêtre ${bords.overlay}`);
  console.log(JSON.stringify(pire));
  console.log('\n'+ok+' ✓  '+ko+' ✗   · erreurs de page : '+JSON.stringify(S.exceptions.slice(0,3)));
  S.fermer();
})().catch(e=>{console.error(e);process.exit(1)});
