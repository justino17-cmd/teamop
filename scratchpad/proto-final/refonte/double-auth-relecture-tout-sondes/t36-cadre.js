const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(900);
 // fin de mois
 await c.p.click('[data-cx="grp|pilotage"]'); await c.p.waitForTimeout(400); const cl=await c.p.$('#contenu [data-cx="sec|cloture"]:visible'); await cl.click(); await c.p.waitForTimeout(700);
 const b=await c.p.$$eval('#contenu button',e=>e.filter(x=>x.offsetParent).map(x=>(x.getAttribute('data-cx')||x.getAttribute('data-cp')||x.getAttribute('data-cl')||'')+':'+x.textContent.trim().slice(0,40))); log('Fin de mois, boutons:',b.slice(0,25));
 // cadre : le bouton « Ouvrir dans la Comptabilité »
 const o=await c.p.$('#contenu button:has-text("Ouvrir dans la Comptabilité"):visible, #contenu [data-go*="comptab"]:visible'); log('bouton Ouvrir dans la Comptabilité ?',!!o);
 if(o){ await o.click(); await c.p.waitForTimeout(1500); log('iframe ?',await c.p.evaluate(()=>!!document.querySelector('#cpsys iframe'))); }
 const fr=c.p.frames().find(f=>/prototype-comptabilite/.test(f.url())); log('cadre trouvé ?',!!fr);
 if(fr){ const tabs=await fr.evaluate(()=>[...document.querySelectorAll('button,a')].filter(x=>x.offsetParent).map(x=>x.textContent.trim().slice(0,24)+'|'+[...x.attributes].filter(a=>/^data-/.test(a.name)).map(a=>a.name+'='+a.value).join(',')).slice(0,40)); log('cadre boutons:',tabs);
   const bq=await fr.$('button:has-text("Banque"), [data-onglet*="banque"], a:has-text("Banque")'); log('onglet Banque du cadre ?',!!bq);
   if(bq){ await bq.click(); await c.p.waitForTimeout(900); log('conf demandée par le cadre:',!!(await D.conf(c)),'| texte cadre:',(await fr.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,300)))); await R.cap(c,'cadre-banque'); } }
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
