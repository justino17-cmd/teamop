const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'iphone', nuit=process.argv[3]==='nuit', connecte=process.argv[4]!=='non';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const log=(...a)=>console.log(...a);
 const kb=await S.provisoire(c,'kb');
 if(connecte){ await S.connecter(c,'karim',kb); const n=await S.lireNombre(c); await S.approuver(c,'kb',n,PIN); await c.p.waitForTimeout(500); if(await R.vis(c,'#opsec [data-ops="revenir"]')) await c.p.click('#opsec [data-ops="revenir"]'); await S.attendreApp(c,12000,true); await c.p.waitForTimeout(1200); await c.p.evaluate(()=>{const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click();}); }
 await R.ouvrirTel(c); await c.p.waitForTimeout(300);
 await c.p.selectOption('#opsec [data-ops="qui"]','kb').catch(()=>{}); await c.p.waitForTimeout(300);
 await c.p.evaluate(()=>{const d=document.querySelector('#opsec .sec-demo'); if(d&&d.tagName==='DETAILS') d.open=true; const s=document.querySelector('#opsec .sec-demo summary'); if(s&&!document.querySelector('#opsec .sec-demo button')) s.click();}); await c.p.waitForTimeout(300);
 const btn=await c.p.$('#opsec .sec-demo button:has-text("Simuler une connexion pirate")'); await btn.scrollIntoViewIfNeeded(); await btn.click(); await c.p.waitForTimeout(600);
 await S.deverrouiller(c,'kb',PIN); await c.p.waitForTimeout(400);
 await c.p.evaluate(()=>{document.querySelector('#opsec .ops-ecran').scrollTop=0}); 
 await c.p.click('#opsec [data-ops="pas-moi"]'); await c.p.click('#opsec [data-ops="bloquer"]'); await c.p.waitForTimeout(900);
 const t=(await R.txt(c,'#opsec .ops-ecran'))||''; log(profil,'connecté:',connecte,'| message « Connexion bloquée » visible sur le téléphone:',/Connexion bloquée/.test(t),'| écran:',t.slice(0,140));
 await R.cap(c,`bloc-${profil}-${connecte?'co':'nonco'}`);
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
