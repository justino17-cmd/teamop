const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit', qui=process.argv[4]||'kb';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`fcn-${qui}-${profil}-${nuit?'nuit':'jour'}`;
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(700);
 const carte=await c.p.$(`[data-eqx="fiche|${qui}"], [data-eq="fiche|${qui}"]`); await carte.scrollIntoViewIfNeeded(); await carte.click(); await c.p.waitForTimeout(800);
 await c.p.evaluate(()=>{const e=document.querySelector('.cn-acces'); e&&e.scrollIntoView({block:'center'})}); await c.p.waitForTimeout(400);
 await R.cap(c,tag); console.log((await R.txt(c,'.cn-acces')).slice(0,600)); const dg=await L.doigts(c.p,'.cn-acces'); console.log('petits',dg.petits,'ecr',dg.ecrases);
 const d=await L.deborde(c); console.log(JSON.stringify(d));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,1500));process.exit(1)});
