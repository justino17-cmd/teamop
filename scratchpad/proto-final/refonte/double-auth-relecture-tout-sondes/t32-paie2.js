const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'windows',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(1000); await c.p.click('[data-cx="grp|paie"]'); await c.p.waitForTimeout(700);
 for(const lib of ['Fiches de paie','Salariés','Charges et déclarations']){ await c.p.click('#contenu button:has-text("'+lib+'"):visible'); await c.p.waitForTimeout(600);
   const t=await R.txt(c,'#contenu'); log(lib,'| conf:',!!(await D.conf(c)),'| nb montants:',(t.match(/\d[\d  ]*[,.]\d\d\s?€/g)||[]).length);
   const b=await c.p.$$eval('#contenu [data-paie]',e=>e.filter(x=>x.offsetParent).map(x=>x.getAttribute('data-paie').split('|')[0]+':'+x.textContent.trim().slice(0,22).replace(/\s+/g,' '))); log('   boutons:',b.join(' ; ')); }
 // essais de gestes d'écriture/envoi sans fenêtre
 for(const a of ['comptabiliser','dsn','distribuer','envoiok','validerfiches']){ const b=await c.p.$('#contenu [data-paie^="'+a+'"]:visible'); if(!b){ log(a,': pas de bouton visible ici'); continue; } await b.click({timeout:3000}).catch(()=>{}); await c.p.waitForTimeout(500); const cf=await D.conf(c); log(a,'=> conf:',cf?cf.texte.slice(0,110):false); if(cf){ await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300);} }
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
