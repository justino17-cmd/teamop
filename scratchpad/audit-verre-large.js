/* ⛔ L'AUDIT PRÉCÉDENT NE REGARDAIT QU'UNE LISTE DE CLASSES QUE J'AVAIS ÉCRITE MOI-MÊME.
   C'est une population choisie, donc un résultat choisi. Ici on interroge TOUS les éléments
   du document, sans liste : c'est la seule façon de répondre « partout ». */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
(async()=>{
  const S=await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'J',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(800); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  const RUBS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k);`);

  const SONDE=`
    const rgba=s=>{const m=(s||'').match(/[\\d.]+/g); return m?{a:m.length>3?+m[3]:1}:null;};
    const out=[]; let vus=0, avecFiltre=0;
    for(const e of document.querySelectorAll('*')){
      const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) continue;
      const st=getComputedStyle(e);
      if(st.visibility==='hidden'||st.display==='none'||+st.opacity<0.05) continue;
      vus++;
      const bf=(st.backdropFilter||st.webkitBackdropFilter||'none'); if(bf==='none') continue;
      avecFiltre++;
      const bg=rgba(st.backgroundColor), img=st.backgroundImage;
      const al=(img==='none')?[]:[...img.matchAll(/rgba?\\([^)]*?,\\s*([\\d.]+)\\s*\\)/g)].map(m=>+m[1]).filter(a=>a<=1);
      const imgMax=al.length?Math.max(...al):(img==='none'?0:1);
      const a=(bg?bg.a:0);
      if(a>=0.02||imgMax>=0.02) continue;          /* il y a de la matière : ce n'est pas une lentille */
      out.push({ tag:e.tagName.toLowerCase(),
        cls:e.className.toString().trim().replace(/\\s+/g,' ').slice(0,40),
        id:e.id||'', txt:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,16),
        w:Math.round(b.width),h:Math.round(b.height), bf:bf.slice(0,44) });
    }
    return {vus,avecFiltre,nus:out};`;

  const tot={vus:0,avecFiltre:0}; const nus=[];
  for(const prof of ['iosweb','macweb']){
    const tac=prof==='iosweb';
    await S.c.envoyer('Emulation.setDeviceMetricsOverride', tac?{width:390,height:844,deviceScaleFactor:3,mobile:true}:{width:1440,height:900,deviceScaleFactor:2,mobile:false});
    await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:tac,maxTouchPoints:tac?5:1});
    for(const th of ['light','dark']){
      await S.ev(`setPlatForce('${prof}'); setThemePref('${th}'); return 1;`); await dormir(240);
      for(const k of RUBS){
        try{ await S.ev(`go('${k}'); return 1;`); }catch(e){ continue; }
        await dormir(180);
        let r; try{ r=await S.ev(SONDE); }catch(e){ continue; }
        tot.vus+=r.vus; tot.avecFiltre+=r.avecFiltre;
        r.nus.forEach(x=>{x.prof=prof;x.theme=th;x.rub=k;nus.push(x);});
      }
      console.log('  '+prof+' · '+th+' — cumul : '+tot.vus+' éléments vus, '+tot.avecFiltre+' avec backdrop-filter, '+nus.length+' sans matière');
    }
  }
  console.log('\n══ TOUTES LES LENTILLES SANS MATIÈRE, SANS LISTE DE CLASSES ══\n');
  console.log('  population : '+tot.vus+' éléments visibles parcourus · '+tot.avecFiltre+' portent un backdrop-filter');
  const par={}; nus.forEach(x=>{ const k=x.tag+'.'+x.cls.split(' ').slice(0,2).join('.');
    const e=(par[k]=par[k]||{n:0,rubs:new Set(),bf:x.bf,min:1e9}); e.n++; e.rubs.add(x.rub); e.min=Math.min(e.min,Math.min(x.w,x.h)); });
  Object.entries(par).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>
    console.log(`   ${String(v.n).padStart(5)}×  ${String(v.rubs.size).padStart(2)} rubriques  côté min ${String(v.min).padStart(3)}px  ${v.bf.padEnd(40)}  ${k}`));
  if(!nus.length) console.log('   aucune.');
  fs.writeFileSync(__dirname+'/audit-large.json',JSON.stringify({tot,nus}));
  console.log('\n   exceptions JS :',JSON.stringify(S.exceptions.slice(0,4)));
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('MORTE:',e&&e.stack||e);process.exit(2);});
