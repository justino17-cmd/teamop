/* Sonde B4 : le ✎ du stockage ne montre que ce qui a un sens pour lui, et ne PERD rien.
   Bêta locale, 127.0.0.1, iPhone 402 px. SOURCE=<bêta d'avant> pour la contre-épreuve. */
const path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
let ok=0,ko=0; const v=(t,a,b)=>{ const c=JSON.stringify(a)===JSON.stringify(b); c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+t+(c?'':'  → reçu '+JSON.stringify(a)+', attendu '+JSON.stringify(b))); };
(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); return 1;`);
  const mesure=async(id)=>S.ev(`
    try{ closeModal(true); }catch(e){}
    formBox(${JSON.stringify(id)}); await new Promise(r=>setTimeout(r,500));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const f=document.getElementById('boxform'); if(!f) return null;
    const vis=el=>{ const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
    const visibles=[...f.querySelectorAll('input[name],select[name],textarea[name]')].filter(vis).map(i=>i.name);
    const tous=[...new Set([...f.querySelectorAll('input[name],select[name],textarea[name]')].map(i=>i.name))];
    const titres=[...f.querySelectorAll('.form-sec')].filter(vis).map(x=>x.textContent.trim().split(/\\s+—/)[0]);
    return {visibles,tous,titres};`);
  const r=await S.ev(`
    db.users=(db.users||[]).filter(u=>u.id!=='u-sf'); db.users.push({id:'u-sf',prenom:'Justin',nom:'Sonde',login:'sf',role:'admin',actif:true,pref:{}});
    db.boxes=(db.boxes||[]).filter(b=>b.id!==STOCKAGE_ID&&b.id!=='bx-sf');
    db.boxes.push({id:STOCKAGE_ID,numero:'STOCK',nom:'Dépôt Rezé',adresse:'2 rue du Port',ville:'Rezé',codePostal:'44400',categorie:'TP14 — Rodenticide',groupe:'Agence Ouest',secteur:'44 Sud',frequence:'Mensuel',dateInstallation:'2026-01-05',prochaineVisite:'2026-10-01',actif:true,stock:{},visibleTous:false});
    db.boxes.push({id:'bx-sf',numero:'B-77',nom:'Cuisine',ville:'Nantes',categorie:'TP18',groupe:'Agence Ouest',secteur:'44 Nord',actif:true,stock:{}});
    const u=db.users.find(x=>x.id==='u-sf'); currentUser=u; enterApp(u); await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){}
    return 1;`);
  const st=await mesure('stockage'), bx=await mesure('bx-sf');
  console.log('  stockage — rubriques :', JSON.stringify(st&&st.titres));
  console.log('  box      — rubriques :', JSON.stringify(bx&&bx.titres));
  v('la population est là (deux formulaires ouverts, des champs)', !!(st&&bx&&st.tous.length>10&&bx.tous.length>10), true);
  const caches=['numero','categorie','groupe','secteur','dateInstallation','frequence','prochaineVisite'];
  v('⛔ le stockage ne MONTRE plus ses champs sans objet', caches.filter(n=>st.visibles.includes(n)), []);
  v('⛔ mais il les GARDE tous dans le formulaire (saveBox relit tout)', caches.filter(n=>!st.tous.includes(n)), []);
  v('   il montre toujours ce qui compte pour lui', ['nom','adresse','ville','tel','codePostal','respUserId','actif','notes'].filter(n=>!st.visibles.includes(n)), []);
  v('   une BOX, elle, montre tout comme avant', caches.filter(n=>!bx.visibles.includes(n)), []);
  /* L'enregistrement : les valeurs cachées repartent telles quelles. */
  const apres=await S.ev(`
    try{ closeModal(true); }catch(e){}
    formBox(STOCKAGE_ID); await new Promise(r=>setTimeout(r,400));
    const f=document.getElementById('boxform'); f.querySelector('[name=nom]').value='Dépôt Rezé (quai 2)';
    f.requestSubmit(); await new Promise(r=>setTimeout(r,600));
    const b=db.boxes.find(x=>x.id===STOCKAGE_ID);
    return {nom:b.nom,numero:b.numero,categorie:b.categorie,groupe:b.groupe,secteur:b.secteur,frequence:b.frequence,dateInstallation:String(b.dateInstallation||'').slice(0,10),prochaineVisite:String(b.prochaineVisite||'').slice(0,10)};`);
  v('   l\'enregistrement a bien eu lieu (le nom retapé est écrit)', apres.nom, 'Dépôt Rezé (quai 2)');
  v('⛔⛔ et RIEN de caché n\'a été perdu', [apres.numero,apres.categorie,apres.groupe,apres.secteur,apres.frequence,apres.dateInstallation,apres.prochaineVisite],
    ['STOCK','TP14 — Rodenticide','Agence Ouest','44 Sud','Mensuel','2026-01-05','2026-10-01']);
  const err=await S.ev(`return (window.__erreurs||[]).length;`);
  console.log('\n'+ok+' ✓  '+ko+' ✗'); await S.fermer(); process.exit(ko?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
