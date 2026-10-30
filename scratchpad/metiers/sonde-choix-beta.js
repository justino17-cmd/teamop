/* Sonde v777 : sur la bêta, « 🧰 Tester un métier » (Outils de bêta) change le pack ; « Mon métier » montre les 23 cartes.
   node scratchpad/metiers/sonde-choix-beta.js   (beta.html régénérée avant) */
const {demarrer,dormir}=require('./lib.js');
(async()=>{
  const S=await demarrer({demo:false}); let ok=0,ko=0; const v=(n,c,d)=>{ c?ok++:ko++; console.log((c?'  ✓ ':'  ✗ ')+n+(d?' — '+d:'')); };
  await S.ev(`window.confirm=()=>true; go('parametres'); return 1;`); await dormir(1500); await S.ranger();
  const r0=await S.ev(`const s=document.getElementById('beta-metier'); return {sel:!!s, n:s?s.options.length:0, val:s?s.value:'', cartes:document.querySelectorAll('.met-card').length, h:s?s.getBoundingClientRect().height:0, metier:metierId()};`);
  v('le sélecteur est dans Outils de bêta', r0.sel); v('il propose les 23 métiers', r0.n===23, r0.n);
  v('« Mon métier » montre les 23 cartes', r0.cartes===23, r0.cartes); v('il part sur le métier courant', r0.val===r0.metier, r0.val);
  for(const k of ['froid','chauffage','piscine']){
    await S.ev(`const s=document.getElementById('beta-metier'); s.value='${k}'; s.dispatchEvent(new Event('change')); return 1;`); await dormir(900);
    const r=await S.ev(`const s=document.getElementById('beta-metier'); const on=document.querySelector('.met-card.on .nm'); return {m:db.metier, sel:s&&s.value, on:on&&on.textContent, types:intTypes().slice(0,2), cat:categoriesProduit().slice(0,1), toast:(document.querySelector('.toast,#toast')||{}).textContent||''};`);
    v('« '+k+' » choisi au sélecteur → db.metier', r.m===k, r.m); v('  l\'écran redessiné le montre actif', r.sel===k&&!!r.on, r.on);
    v('  les types d\'intervention sont ceux du pack', JSON.stringify(r.types)===JSON.stringify(await S.ev(`return METIERS['${k}'].types.slice(0,2)`)), r.types.join(' · '));
  }
  // Remplir en grand nombre suit le pack
  const r2=await S.ev(`window.confirm=()=>true; const n0=db.interventions.length; betaRemplir(true); const neuves=db.interventions.slice(n0).filter(i=>/— test n°/.test(i.titre||'')); const T=METIERS[db.metier].types; return {n:neuves.length, hors:neuves.filter(i=>!T.includes(i.type)).length, rats:neuves.filter(i=>/Dératisation/.test(i.type)).length};`);
  v('« Remplir en grand nombre » : 400 interventions', r2.n===400, r2.n); v('  toutes aux types du pack choisi', r2.hors===0, r2.hors+' hors pack'); v('  aucune dératisation', r2.rats===0);
  await S.ev(`metierSet('3d'); return 1;`); await dormir(500);
  v('retour à la 3D', await S.ev(`return db.metier`)==='3d');
  await S.ev(`window.scrollTo(0,0); const s=document.getElementById('beta-metier'); s.scrollIntoView({block:'center'}); return 1;`); await dormir(400);
  await S.snap('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/choix-metier.png');
  console.log(`\n${ok} ✓ ${ko} ✗`); await S.fermer?.(); process.exit(ko?1:0);
})().catch(e=>{ console.error(e); process.exit(2); });
