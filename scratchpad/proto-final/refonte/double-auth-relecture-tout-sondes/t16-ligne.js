const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 for(const [profil,nuit] of [['iphone',false],['android',true],['petit',false]]) for(const qui of ['kb','sm','tl']){
 const c=await S.ouvrir({profil,nuit});
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(700);
 const carte=await c.p.$('[data-eqx="fiche|'+qui+'"], [data-eq="fiche|'+qui+'"]'); await carte.scrollIntoViewIfNeeded(); await carte.click(); await c.p.waitForTimeout(800);
 const m=await c.p.evaluate(()=>[...document.querySelectorAll('.cn-acces .ligne')].map(l=>{const s=l.children[0].getBoundingClientRect(),b=l.children[1].getBoundingClientRect(),P=l.getBoundingClientRect();const cs=getComputedStyle(l);return {lib:l.children[0].textContent.trim(),recouvre:b.left<s.right-1&&b.right>s.left&&Math.abs(b.top-s.top)<20,debordeDroite:Math.round(b.right-P.right),b:[Math.round(b.left),Math.round(b.right)],s:[Math.round(s.left),Math.round(s.right)],flex:cs.display+'/'+cs.flexWrap}}));
 console.log(qui,profil,nuit?'nuit':'jour',JSON.stringify(m.filter(x=>x.recouvre||x.debordeDroite>0)));
 await R.cap(c,`ligne-${profil}`); await L.fermer(); }
})().catch(e=>{console.log('EXC',e.message.slice(0,500));process.exit(1)});
