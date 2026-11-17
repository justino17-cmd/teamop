const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const profil=process.argv[2]||'android', nuit=process.argv[3]==='nuit', qui=process.argv[4]||'sm';
 const c=await S.ouvrir({profil,nuit}); const log=(...a)=>console.log(...a);
 await D.tous(c); log('entré',await R.entrer(c,qui));
 const bt=await c.p.$$eval('button, a',els=>els.filter(e=>e.offsetParent&&/Menu/.test(e.textContent)&&e.textContent.length<20).map(e=>e.tagName+':'+e.textContent.trim()+':'+(e.getAttribute('data-go')||e.getAttribute('data-rl')||e.id||e.className)));
 log('candidats Menu:',bt);
 await c.p.click('button:has-text("Menu"):visible'); await c.p.waitForTimeout(700); await R.cap(c,`menu-${profil}-${qui}`);
 log('moncompte visible:',await R.vis(c,'[data-cnx="moncompte"]'),'| présent:',await c.p.evaluate(()=>[...document.querySelectorAll('[data-cnx="moncompte"]')].map(e=>{const r=e.getBoundingClientRect();return Math.round(r.top)+'/'+Math.round(r.height)+'/'+getComputedStyle(e).display+'/'+(e.closest('#menu')?'#menu':'ailleurs')})));
 log('menu texte:',(await R.txt(c,'#menu')).slice(-300));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
