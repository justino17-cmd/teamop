const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await D.entrer(c,'marc');
 await c.p.evaluate(()=>{ SECU.telCourant='kb'; opsDessiner(true); opsDemo(); });
 await c.p.evaluate(()=>[...document.querySelectorAll('#opsec .sec-demo button')].find(b=>b.textContent.trim()==='Simuler une connexion pirate').click()); await c.p.waitForTimeout(400);
 await D.confirmer; 
 await L.aller(c.p,'historique'); await c.p.waitForTimeout(900);
 await R.fermeTel(c); const b=await c.p.$('#contenu button:has-text("Sécurité"), #contenu [data-hf="securite"]'); if(b) await b.click(); await c.p.waitForTimeout(600);
 await R.cap(c,'journal-securite'); log((await R.txt(c,'#contenu')).slice(900,1700));
 await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
