/* ══ SONDE — RIEN NE CHANGE DE TAILLE SOUS LE DOIGT (ni sous la souris) ═══════════════════════
   Vidéo de Justin, iPhone, 23 septembre 2026 à 13 h 02 : la carte des réglages du Planning
   BASCULAIT entre deux mises en page — 346 px de haut, puis 300, puis 346… Mesuré : la règle
   générale `html[data-refonte] .card{padding:22px 24px!important}` écrasait `.pf-bar{padding:0}`,
   SAUF au survol, où `.card.pf-bar:hover` (plus spécifique) reprenait la main. Sur un iPhone,
   poser le doigt déclenche le survol : la barre sautait sous le doigt.
   ⛔ Une sonde qui PHOTOGRAPHIE un instant ne voit pas ce défaut — il n'existe que pendant un
   geste. On le provoque donc : pour chaque élément que vise une règle de survol touchant la mise
   en page (recensées dans la feuille, `tests/test-780.js`), sur chaque rubrique, on FORCE le
   survol (`CSS.forcePseudoState`) et on compare sa taille de mise en page (`offsetWidth/Height`,
   qui ignorent les transformations — un léger soulèvement n'est pas un saut) et celle de son
   parent. Au téléphone (Safari 26) ET au bureau (Mac, souris), où le défaut existe aussi.
   ⛔ Population comptée : un « 0 saut » sur zéro élément essayé ne prouverait rien.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                     */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const SEL='.pf-bar,.kpi[onclick],.kpi.clickable,.card[onclick],.card.clickable,.olsec summary,.list-row,tr[onclick],.plg-tete.clic,.plg-mh,.plm-card';
const PAR_VUE=60;

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :',S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} try{ mvtDemoPoser(); }catch(e){} return 1;`); await dormir(2000);
  /* Le planning semaine ne porte de cartes (`.plg-mh`) que si la semaine a des interventions :
     on en pose huit, réparties sur les techniciens — sinon la famille aurait une population nulle. */
  const posees=await S.ev(`const sem=weekDays(todayISO()), T=db.techniciens||[]; let n=0;
    db.interventions.slice(0,8).forEach((i,k)=>{ i.date=sem[k%6]; i.heure=String(8+(k%6)).padStart(2,'0')+':00'; i.duree=60; i.statut='planifiee';
      if(T.length){ i.techIds=[T[k%T.length].id]; i.techId=i.techIds[0]; } n++; }); save(); return n;`);
  console.log('interventions posées dans la semaine : '+posees);
  await S.ev(`if(document.startViewTransition&&!window.__vtSuivi){ window.__vtSuivi=1; window.__vtN=0; const o=document.startViewTransition.bind(document);
    document.startViewTransition=function(cb){ window.__vtN++; const vt=o(cb); const f=()=>{ window.__vtN--; }; vt.finished.then(f,f); return vt; }; } return 1;`);
  const calme=async()=>{ for(let i=0;i<50;i++){ if(await S.ev(`return !(window.__vtN>0) && !document.querySelector('.content.entre');`)) break; await dormir(100); }
    await S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`); };
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');

  const PROFILS=[{nom:'iPhone · Safari 26',plat:'iosweb',w:402,h:874,mobile:true},{nom:'Mac · Safari 26',plat:'macweb',w:1440,h:900,mobile:false}];
  const sauts=[]; let essais=0, vuesVues=0; const parFamille={}; SEL.split(',').forEach(s=>parFamille[s]=0);
  for(const P of PROFILS){
    await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:P.w,height:P.h,deviceScaleFactor:P.mobile?3:2,mobile:P.mobile});
    await S.c.envoyer('Emulation.setTouchEmulationEnabled',P.mobile?{enabled:true,maxTouchPoints:5}:{enabled:false});
    /* Un iPhone se déclare « sans survol, au doigt » : c'est ce qui allume le bloc `@media (hover:none)`
       de l'application. Sans ça, le téléphone simulé se comporterait comme une souris. */
    await S.c.envoyer('Emulation.setEmulatedMedia',{features:P.mobile?[{name:'hover',value:'none'},{name:'pointer',value:'coarse'}]:[{name:'hover',value:'hover'},{name:'pointer',value:'fine'}]});
    await S.ev(`setPlatForce('${P.plat}'); setThemePref('light'); return 1;`); await dormir(400);
    const media=await S.ev(`return {sansSurvol:matchMedia('(hover:none)').matches, doigt:matchMedia('(pointer:coarse)').matches};`);
    console.log(P.nom+' : (hover:none) '+media.sansSurvol+' · (pointer:coarse) '+media.doigt);
    /* ⚠️ Le téléphone DOIT se déclarer sans survol (c'est ce qui allume `@media (hover:none)`, comme
       sur un iPhone). Le « Mac », lui, se déclare AUSSI sans survol : Chromium sans écran n'a pas de
       souris, et `setEmulatedMedia` ignore ce critère. Sans effet sur la mesure : le survol est FORCÉ
       élément par élément, et ce que `(hover:none)` change (soulèvement, teinte) n'est pas une taille. */
    if(P.mobile && !media.sansSurvol){ console.log('⛔ le téléphone ne se déclare pas sans survol — mesure arrêtée'); S.fermer(); process.exit(2); }
    const vues=await S.ev(`return NAV.flatMap(s=>s.items).filter(it=>{ try{ return canSee(it); }catch(e){ return false; } }).map(it=>it.k)
      .concat(['carteBox','produitsDonnes']).filter((k,i,a)=>views[k]&&a.indexOf(k)===i);`);
    /* Les trois formes du planning ont chacune leurs cartes : « multi » (.plm-card), « semaine » et
       « jour » au bureau (.plg-mh — sous 700 px ce sont des listes). */
    vues.push('fiche:intervention','planning:semaine','planning:jour');
    for(const v of vues){
      const js=v==='fiche:intervention'?`go('interventions'); setTimeout(()=>{ try{ detailIntervention(db.interventions[0].id); }catch(e){} },300);`
        :v.startsWith('planning:')?`planMode='${v.split(':')[1]}'; go('planning');`:`go('${v}');`;
      await S.ev(`try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} try{ ${js} }catch(e){} return 1;`);
      if(v==='fiche:intervention') await dormir(700);
      await dormir(700); await calme();
      await S.ev(`try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} const b=document.getElementById('fdr-banner'); if(b) b.remove(); return 1;`);
      vuesVues++;
      const doc=await S.c.envoyer('DOM.getDocument',{depth:1});
      let ids=[]; try{ ids=(await S.c.envoyer('DOM.querySelectorAll',{nodeId:doc.root.nodeId,selector:SEL})).nodeIds; }catch(e){}
      for(const nodeId of ids.slice(0,PAR_VUE)){
        let obj; try{ obj=(await S.c.envoyer('DOM.resolveNode',{nodeId})).object; }catch(e){ continue; }
        const lire=async()=>(await S.c.envoyer('Runtime.callFunctionOn',{objectId:obj.objectId,returnByValue:true,functionDeclaration:
          `function(){ const cs=getComputedStyle(this), p=this.parentElement;
             return {w:this.offsetWidth,h:this.offsetHeight,pad:cs.padding,bord:cs.borderWidth,bc:cs.borderLeftColor,pw:p?p.offsetWidth:0,ph:p?p.offsetHeight:0,
                     mat:this.classList.contains('pf-bar')?[cs.backgroundColor,cs.backdropFilter||cs.webkitBackdropFilter||'',cs.boxShadow].join(' | '):'',
                     vis:!!(this.offsetWidth||this.offsetHeight), fam:${JSON.stringify(SEL.split(','))}.filter(s=>this.matches(s)),cl:(this.className&&this.className.baseVal!==undefined?this.className.baseVal:this.className)||this.tagName,
                     txt:(this.textContent||'').replace(/\\s+/g,' ').trim().slice(0,40)}; }`})).result.value;
        const a=await lire(); if(!a||!a.vis) continue;
        await S.c.envoyer('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});
        const b=await lire();
        await S.c.envoyer('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
        essais++; (a.fam||[]).forEach(f=>parFamille[f]++);
        const d=Math.max(Math.abs(a.w-b.w),Math.abs(a.h-b.h),Math.abs(a.pw-b.pw),Math.abs(a.ph-b.ph));
        /* La taille, la marge, l'épaisseur du bord ET la couleur de la BANDE DE GAUCHE — celle qui
           porte une information (le statut d'une intervention, le technicien d'une carte du
           planning) ; pour la barre du Planning, toute sa matière — elle ne doit changer en rien.
           Le FOND d'une carte cliquable se teinte et son liseré peut s'éclairer : c'est voulu. */
        if(d>=1||a.pad!==b.pad||a.bord!==b.bord||a.bc!==b.bc||a.mat!==b.mat) sauts.push({profil:P.nom,vue:v,cl:String(a.cl).slice(0,60),txt:a.txt,
          avant:a.w+'×'+a.h+' marge '+a.pad+' bord '+a.bord+' '+a.bc+(a.mat?' · '+a.mat:''),apres:b.w+'×'+b.h+' marge '+b.pad+' bord '+b.bord+' '+b.bc+(b.mat?' · '+b.mat:'')});
      }
    }
  }
  console.log(`\npopulation : ${vuesVues} écrans, ${essais} éléments essayés au survol`);
  console.log('   par famille : '+Object.entries(parFamille).map(([k,n])=>k+' '+n).join(' · '));
  const fam={}; sauts.forEach(s=>{ const k=s.profil+' · '+s.cl; (fam[k]=fam[k]||[]).push(s); });
  console.log(`éléments qui CHANGENT DE TAILLE au survol : ${sauts.length} (${Object.keys(fam).length} familles)`);
  for(const k in fam){ const s=fam[k][0]; console.log(`  · ${k} — ${fam[k].length}× (ex. ${s.vue}, « ${s.txt} ») : ${s.avant}  →  ${s.apres}`); }
  console.log('\nexceptions :',JSON.stringify(S.exceptions.slice(0,5)));
  console.log(`\n════ sonde-survol : ${sauts.length?0:1} ✓ ${sauts.length?1:0} ✗ (${sauts.length} saut(s) sur ${essais} essais) ════`);
  S.fermer(); process.exit(sauts.length||!essais?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
