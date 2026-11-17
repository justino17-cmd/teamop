const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 for(const profil of ['iphone','android','petit','ipad','mac720','windows']){
  const c=await S.ouvrir({profil}); const kb=await S.provisoire(c,'kb'); const out={profil};
  for(const rouge of [false,true]){
    if(rouge) await c.p.evaluate(()=>document.querySelector('[data-sec="cases-demo"] input').click());
    await S.connecter(c,'karim',kb); await S.attendreSel(c,'#cn-form-confirme',4000); await c.p.waitForTimeout(500);
    out[rouge?'rouge':'normal']=await c.p.evaluate(()=>{const e=document.querySelector('[data-sec="nombre"]').getBoundingClientRect();const a=[...document.querySelectorAll('#cnx a,#cnx button')].find(b=>/Annuler/.test(b.textContent));const r=a&&a.getBoundingClientRect();return {nbTop:Math.round(e.top),nbBot:Math.round(e.bottom),vh:innerHeight,annulerBas:r?Math.round(r.bottom):null,hauteurPage:document.documentElement.scrollHeight}});
    await c.p.click('#cnx a:has-text("Annuler"), #cnx button:has-text("Annuler")'); await c.p.waitForTimeout(400);
  }
  console.log(JSON.stringify(out)); await L.fermer();
 }
})().catch(e=>{console.log('EXC',e);process.exit(1)});
