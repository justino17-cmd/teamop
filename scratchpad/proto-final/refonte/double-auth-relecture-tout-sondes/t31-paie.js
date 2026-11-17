const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 log('fenêtre valable ?',await c.p.evaluate(()=>secuFenetreValide('marc')));
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(1200);
 log('iframe cpsys ?',await c.p.evaluate(()=>!!document.querySelector('#cpsys iframe')));
 const g=await c.p.$$eval('[data-cx^="grp|"]',e=>e.map(x=>x.getAttribute('data-cx')+':'+x.textContent.trim())); log('groupes:',g);
 await c.p.click('[data-cx="grp|paie"]'); await c.p.waitForTimeout(900); await R.cap(c,'paie-onglet');
 const txt=await R.txt(c,'#contenu'); log('PAIE visible sans confirmation:',txt.slice(0,900));
 log('montants en € visibles:',(txt.match(/\d[\d  ]*[,.]\d\d\s?€/g)||[]).slice(0,12));
 const btn=await c.p.$$eval('#contenu [data-paie]',e=>e.filter(x=>x.offsetParent).map(x=>x.getAttribute('data-paie')+':'+x.textContent.trim().slice(0,30))); log('boutons paie:',btn);
 log('confirm ouverte ?',!!(await D.conf(c)));
 const sub=await c.p.$$eval('#contenu button, #contenu a',e=>e.filter(x=>x.offsetParent&&/Fiches de paie|Salariés|Charges et déclarations|Le mois/.test(x.textContent)&&x.textContent.length<30).map(x=>x.textContent.trim()+'|'+[...x.attributes].filter(a=>/^data-/.test(a.name)).map(a=>a.name+'='+a.value).join(','))); log('sous-onglets:',sub);
 for(const lib of ['Fiches de paie','Salariés','Charges et déclarations']){ const b=await c.p.$('#contenu button:has-text("'+lib+'"):visible'); if(!b) { log(lib,'introuvable'); continue; } await b.click(); await c.p.waitForTimeout(700); const t=await R.txt(c,'#contenu'); log(lib,'=> conf ouverte:',!!(await D.conf(c)),'| montants:',(t.match(/\d[\d  ]*[,.]\d\d\s?€/g)||[]).slice(0,8),'| extrait:',t.slice(t.indexOf(lib)>0?t.indexOf(lib):0,(t.indexOf(lib)>0?t.indexOf(lib):0)+260)); await R.cap(c,'paie-'+lib.slice(0,5)); }
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
