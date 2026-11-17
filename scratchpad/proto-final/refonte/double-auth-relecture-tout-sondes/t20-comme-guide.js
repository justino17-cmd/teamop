const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 log('avant: vu(sm)=',await c.p.evaluate(()=>localStorage.getItem('opg_proto_nv_vu_sm')));
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(600); await S.avancer(c,6);
 await (await c.p.$('[data-eqx="fiche|sm"], [data-eq="fiche|sm"]')).click(); await c.p.waitForTimeout(700);
 await c.p.click('[data-cnx="comme|sm"]'); await c.p.waitForTimeout(500); await D.confirmer(c,'marc',{ok:true}); await c.p.waitForTimeout(2500);
 log('guide ouvert ?',await c.p.evaluate(()=>!!document.getElementById('nv')&&getComputedStyle(document.getElementById('nv')).display!=='none'),'| vu(sm)=',await c.p.evaluate(()=>localStorage.getItem('opg_proto_nv_vu_sm')));
 await R.cap(c,'comme-guide'); log((await R.txt(c,'#nv')||'').slice(0,200));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,500));process.exit(1)});
