const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac'}); const log=(...a)=>console.log(...a);
 const H=k=>c.p.evaluate(k=>SECU.comptes[k].histo.map(h=>h.resultat+'|'+h.appareil+'|'+h.adresse+'|'+h.ts+'|'+(h.raisons||[]).length),k);
 // 1) activation réelle de Julie
 await S.activer(c,'julie',{pin:'135792'}); log('Julie après 1re connexion (activation):',JSON.stringify(await H('julie')));
 // 2) Karim : connexion habituelle (pas d'écran C)
 await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1500);
 const kb=await S.provisoire(c,'kb'); await S.connecter(c,'karim',kb); const n=await S.lireNombre(c); await S.approuver(c,'kb',n,'246802'); await S.attendreApp(c,10000,true);
 log('Karim après 1 connexion:',JSON.stringify(await H('kb')));
 // 3) Marc via tous + écran C
 await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1500); await D.tous(c); await R.entrer(c,'marc'); log('Marc (tous + écran C):',JSON.stringify(await H('marc')));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
