const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac',nuit:process.argv[3]==='nuit'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 log('fenêtre ouverte ?',await c.p.evaluate(()=>secuFenetreValide('marc')));
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(900);
 for(const [g,s] of [['grp|tresorerie','sec|banque'],['grp|fiscal','sec|envoi'],['grp|fiscal','sec|ecritures']]){
   await c.p.click('[data-cx="'+g+'"]'); await c.p.waitForTimeout(500); const el=await c.p.$('#contenu [data-cx="'+s+'"]:visible'); if(!el){ log(g,s,'bouton introuvable'); continue; }
   await el.click(); await c.p.waitForTimeout(700); const t=await R.txt(c,'#contenu'); log(s,'=> conf:',!!(await D.conf(c)),'| extrait:',t.slice(t.indexOf('Comptabilité')>=0?t.indexOf('Comptabilité')+300:0,(t.indexOf('Comptabilité')>=0?t.indexOf('Comptabilité')+300:0)+380),'| montants:',(t.match(/\d[\d  ]*[,.]\d\d\s?€/g)||[]).length); await R.cap(c,'banque-'+s.replace('sec|','')); }
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
