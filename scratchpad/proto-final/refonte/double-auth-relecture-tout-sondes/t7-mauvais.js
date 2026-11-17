const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; 
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await D.entrer(c,'marc'); await L.aller(c.p,'entreprise'); await c.p.waitForTimeout(600); await S.avancer(c,6);
 const e0=await D.compte(c,'marc'); log('avant',e0);
 await c.p.click('[data-ent="carte|banque"]'); await c.p.waitForTimeout(400);
 await D.confirmer(c,'marc',{ok:false}); 
 for(const ms of [100,400,900]){ await c.p.waitForTimeout(ms); log('t+',ms,'conf?',!!(await D.conf(c)),'toasts:',await c.p.evaluate(()=>[...document.querySelectorAll('.toast, #toast, [role=status]')].map(t=>t.innerText.slice(0,80)).join('|'))); }
 log('après',await D.compte(c,'marc'), 'fenêtre', await c.p.evaluate(()=>secuFenetreValide('marc')));
 log('téléphone:', await c.p.evaluate(()=>{const e=document.querySelector('#opsec [data-ops="msg"]');return e&&e.innerText}));
 log('ERRJS',c.err.slice(0,5)); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
