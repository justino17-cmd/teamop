const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'windows',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(900);
 await c.p.click('[data-cx="grp|pilotage"]'); await c.p.waitForTimeout(400); await (await c.p.$('#contenu [data-cx="sec|cloture"]:visible')).click(); await c.p.waitForTimeout(700);
 const avant=await c.p.evaluate(()=>({envoye:typeof CP!=='undefined'?CP.envoye:null}));
 const b=await c.p.$('#contenu button:has-text("Envoyer ›"):visible'); log('bouton Envoyer ›',!!b,'| avant:',JSON.stringify(avant));
 await b.evaluate(e=>e.click()); await c.p.waitForTimeout(800);
 log('conf:',!!(await D.conf(c)),'| panneau/texte:',(await R.txt(c,'.panneau, #calque')||'').slice(0,260),'| après:',JSON.stringify(await c.p.evaluate(()=>({envoye:CP.envoye}))));
 await R.cap(c,'envoi-comptable');
 // Trésorerie > Banque : relevé sans confirmation, 2e profil
 await c.p.keyboard.press('Escape'); await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(600); await c.p.click('[data-cx="grp|tresorerie"]'); await c.p.waitForTimeout(400); await (await c.p.$('#contenu [data-cx="sec|banque"]:visible')).click(); await c.p.waitForTimeout(600);
 log('Banque: conf:',!!(await D.conf(c)),'| relevé visible:',/Relevé d’octobre/.test(await R.txt(c,'#contenu')));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
