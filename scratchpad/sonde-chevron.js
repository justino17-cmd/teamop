/* Sonde B5 : combien de chevrons porte une ligne de la liste des box, et quelle forme a le chevron
   CSS (deux règles `.pl-row[onclick]::after` se superposent). Bêta locale, 127.0.0.1. */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
  const r=await S.ev(`
    db.users=(db.users||[]).filter(u=>u.id!=='u-chv');
    db.users.push({id:'u-chv',prenom:'Justin',nom:'Sonde',login:'chv',role:'admin',actif:true,pref:{}});
    db.boxes=(db.boxes||[]).filter(b=>!/^bx-chv/.test(b.id));
    db.boxes.push({id:'bx-chv-1',numero:'B-01',nom:'Cuisine',ville:'Nantes',actif:true,stock:{}},{id:'bx-chv-2',numero:'B-02',nom:'Réserve',ville:'Rezé',actif:true,stock:{}});
    const u=db.users.find(x=>x.id==='u-chv'); currentUser=u; enterApp(u);
    await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){}
    go('boxes'); await new Promise(r=>setTimeout(r,900));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    /* Une ligne AVEC bouton, injectée : la question posée est celle du SÉLECTEUR (règle du dépôt). */
    const t=document.createElement('div'); t.className='pl-row'; t.setAttribute('onclick','void 0'); t.id='chv-avec-bouton';
    t.innerHTML='<div class="pl-info"><div class="pl-title">Ligne avec bouton</div></div><button class="btn sm">Agir</button>';
    document.getElementById('boxes-list').appendChild(t);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rows=[...document.querySelectorAll('#boxes-list .pl-row')];
    return { n: rows.length, lignes: rows.map(row=>{
      const cs=getComputedStyle(row,'::after');
      const ecrits=[...row.querySelectorAll('span')].filter(s=>s.textContent.trim()==='›').length;
      return { id: row.id||row.textContent.trim().slice(0,18), ecrits, apres: cs.content, pos: cs.position, bT: cs.borderTopWidth+' '+cs.borderTopStyle, bR: cs.borderRightWidth+' '+cs.borderRightStyle,
        bB: cs.borderBottomWidth+' '+cs.borderBottomStyle, tr: cs.transform, w: cs.width, op: cs.opacity };
    }), autres: (()=>{ const r=document.querySelector('.pl-row[onclick]'); return r?1:0; })() };`);
  console.log(JSON.stringify(r,null,1));
  await S.fermer();
})().catch(e=>{ console.error(e); process.exit(1); });
