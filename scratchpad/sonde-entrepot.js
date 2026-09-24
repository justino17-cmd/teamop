/* Mesure pour expliquer la question « entrepôt » à Justin : un produit à 40 unités dans une box,
   son stock général (p.qte) à 0 — que disent l'écran Stock et le catalogue Produits ? Bêta, 127.0.0.1. */
const fs=require('fs'), path=require('path');
const { ouvrir, dormir } = require('/home/user/teamop/scratchpad/pilote.js');
const OUT='/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/captures/entrepot';
(async()=>{
  const S=await ouvrir({}); console.log('page :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:430,height:932,deviceScaleFactor:2,mobile:true});
  await S.c.envoyer('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; window.confirm=()=>true; window.alert=()=>{};
    db.produits=(db.produits||[]).filter(p=>!/^p-ent/.test(p.id)).concat([{id:'p-ent1',nom:'ADVION GEL BLATTES 30G',ref:'ADV30',categorie:'Insecticides',unite:'u',qte:0,seuil:5}]);
    db.boxes=(db.boxes||[]).filter(b=>!/^bx-ent/.test(b.id)).concat([{id:'bx-ent1',nom:'Box Karim',actif:true,stock:{'p-ent1':{ctn:0,u:25}}},{id:'bx-ent2',nom:'Box Sofia',actif:true,stock:{'p-ent1':{ctn:0,u:15}}}]);
    db.users=(db.users||[]).filter(u=>u.id!=='uE').concat([{id:'uE',prenom:'Justin',nom:'Essai',login:'justin-essai',role:'admin',actif:true,pref:{}}]);
    save(); currentUser=db.users.find(u=>u.id==='uE'); enterApp(currentUser); await new Promise(r=>setTimeout(r,900)); try{ closeModal(true); }catch(e){} return 1;`);
  const cap=async n=>{ await dormir(500); const s=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync(path.join(OUT,n+'.png'),Buffer.from(s.data,'base64')); };
  // 1. l'écran Stock
  await S.ev(`stockSearch='ADVION'; go('stock'); await new Promise(r=>setTimeout(r,800)); return 1;`);
  const st=await S.ev(`const r=[...document.querySelectorAll('#stock-list .pl-row')].find(x=>/ADVION/.test(x.textContent)); return r?r.textContent.replace(/\\s+/g,' ').trim():'(absent)'`);
  console.log('STOCK      :', st); await cap('1-stock');
  // 2. le catalogue Produits
  await S.ev(`prdSearch='ADVION'; go('produits'); await new Promise(r=>setTimeout(r,900)); return 1;`);
  const pr=await S.ev(`const r=[...document.querySelectorAll('#content .pl-row')].find(x=>/ADVION/.test(x.textContent)); return r?r.textContent.replace(/\\s+/g,' ').trim():'(absent)'`);
  console.log('PRODUITS   :', pr); await cap('2-produits');
  // 3. l'alerte « stock bas » et ce qu'une livraison change
  const alerte=await S.ev(`return { qte:(db.produits.find(p=>p.id==='p-ent1')||{}).qte, notifs: computeNotifs().map(n=>String(n.txt||'').replace(/<[^>]+>/g,'')) }`);
  console.log('stock général et cloche :', JSON.stringify(alerte));
  console.log('exceptions :', S.exceptions.slice(0,3));
  S.fermer(); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
