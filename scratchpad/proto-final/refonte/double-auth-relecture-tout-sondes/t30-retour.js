const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 for(const [profil,nuit,qui] of [['iphone',false,'kb'],['ipad',false,'kb'],['mac',false,'kb'],['petit',true,'kb']]){
 const c=await S.ouvrir({profil,nuit}); const kb=await S.provisoire(c,qui); const rg=await R.entrer(c,qui);
 if(!(await c.p.$('[data-cnx="moncompte"] >> visible=true'))){ const m=await c.p.$('button:has-text("Menu"):visible'); if(m){ await m.click(); await c.p.waitForTimeout(500);} }
 const mc=await c.p.$('[data-cnx="moncompte"] >> visible=true'); await mc.scrollIntoViewIfNeeded(); await mc.click(); await c.p.waitForTimeout(800);
 const r=await c.p.evaluate(()=>[...document.querySelectorAll('#calque button, #calque a')].filter(b=>/Retour/.test(b.textContent)).map(b=>{const r=b.getBoundingClientRect();return {cls:b.className,top:Math.round(r.top),h:Math.round(r.height),vis:r.height>0&&getComputedStyle(b).visibility!=='hidden'}}));
 console.log(profil,nuit?'nuit':'jour','boutons « Retour »:',JSON.stringify(r)); await R.cap(c,`retour-${profil}`); await L.fermer(); }
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
