const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'windows',nuit:true}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(1000); await c.p.click('[data-cx="grp|paie"]'); await c.p.waitForTimeout(700);
 await c.p.click('#contenu button:has-text("Charges et déclarations"):visible'); await c.p.waitForTimeout(600);
 log('fenêtre:',await c.p.evaluate(()=>secuFenetreValide('marc')),'| PAIE.compta avant:',await c.p.evaluate(()=>JSON.stringify(PAIE.compta)));
 const b=await c.p.$('[data-paie="comptabiliser"]'); log('bouton:',await b.evaluate(e=>({dis:e.disabled,vis:!!e.offsetParent,txt:e.textContent.trim(),cls:e.className})));
 await b.evaluate(e=>e.click()); await c.p.waitForTimeout(700);
 log('conf:',!!(await D.conf(c)),'| PAIE.compta après:',await c.p.evaluate(()=>JSON.stringify(PAIE.compta)),'| toasts:',await c.p.evaluate(()=>[...document.querySelectorAll('.toast,#toast')].map(t=>t.innerText).join('|')));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
