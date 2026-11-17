const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 const H=k=>c.p.evaluate(k=>SECU.comptes[k].histo.map(h=>h.resultat+'|'+h.appareil+'|'+h.ts%1000000+'|'+(h.raisons||[]).length),k);
 await c.p.evaluate(()=>secuProvisoireNeuf('kb'));   // ce que fait « Reposer un mot de passe provisoire » (téléphone inchangé)
 const prov=await c.p.evaluate(()=>SECU.comptes.kb.prov); await S.connecter(c,'karim',prov); const n=await S.lireNombre(c); await S.approuver(c,'kb',n,'246802'); await c.p.waitForTimeout(600);
 if(await R.vis(c,'#opsec [data-ops="revenir"]')){ await c.p.click('#opsec [data-ops="revenir"]'); await c.p.waitForTimeout(500); }
 log('à l’écran C ?',await S.attendreSel(c,'#cn-form-premier',3000),'| histoire avant C:',JSON.stringify(await H('kb')));
 await c.p.fill('#cn-n1','Zorglub-pamplemousse-87'); await c.p.fill('#cn-n2','Zorglub-pamplemousse-87'); await c.p.click('#cn-form-premier button[type=submit]'); await S.attendreApp(c,10000,true);
 log('après C:',JSON.stringify(await H('kb')));
 await c.p.evaluate(()=>{ const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click(); });
 const mc=await c.p.$('[data-cnx="moncompte"] >> visible=true'); if(mc){ await mc.click(); await c.p.waitForTimeout(700); }
 log('Mon compte, historique:',(await R.txt(c,'.sec-histo')||'').slice(0,300));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
