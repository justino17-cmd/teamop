const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c); await S.avancer(c,6);
 const routes=await c.p.evaluate(()=>[...new Set(CATS.flatMap(g=>(g.vues||g.items||g.v||[]).map?(g.vues||g.items||g.v||[]).map(x=>x.k||x[0]||x):[]))].filter(x=>typeof x==='string'));
 log('routes:',routes.join(','));
 const lire=async()=>c.p.evaluate(()=>{const t=document.getElementById('contenu').innerText.replace(/[  ]/g,' ');const h=document.getElementById('contenu').innerHTML;return {iban:(t.match(/FR\d\d[ \d]{10,}/g)||[]).slice(0,2),ibanHtml:/FR76\s?\d{4}/.test(h),bic:/BIC[^\n]{0,30}[A-Z]{6}[A-Z0-9]{2}/.test(t)}});
 for(const r of routes){ await L.aller(c.p,r).catch(()=>{}); await c.p.waitForTimeout(500); const x=await lire(); if(x.iban.length||x.ibanHtml) log('IBAN en clair sur',r,JSON.stringify(x)); }
 // comptabilité : tous les groupes et sous-onglets
 await L.aller(c.p,'comptabilite'); await c.p.waitForTimeout(800);
 const groupes=await c.p.$$eval('[data-cx^="grp|"]',e=>e.map(x=>x.getAttribute('data-cx')));
 for(const g of groupes){ await c.p.click('[data-cx="'+g+'"]'); await c.p.waitForTimeout(500);
   const subs=await c.p.$$eval('#contenu [data-cx^="sec|"], #contenu .cx-nav2 button',e=>[...new Set(e.filter(x=>x.offsetParent).map(x=>x.getAttribute('data-cx')||x.textContent.trim()))]);
   for(const s of subs.slice(0,12)){ const sel=s.startsWith('sec|')?'#contenu [data-cx="'+s+'"]':null; if(sel){ const el=await c.p.$(sel+':visible'); if(!el) continue; await el.click().catch(()=>{}); await c.p.waitForTimeout(350); } const x=await lire(); const t=await R.txt(c,'#contenu'); const conf=!!(await D.conf(c)); if(x.iban.length||x.ibanHtml||/Relevé bancaire|rapprochement|Rapprochement/.test(t)&&false) log('  IBAN en clair',g,s,JSON.stringify(x)); if(conf){ log('  (conf demandée par',g,s,')'); await c.p.keyboard.press('Escape'); } }
   log(g,'sous-onglets:',subs.join(','));
 }
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
