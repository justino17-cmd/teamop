const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:process.argv[2]||'mac'}); const log=(...a)=>console.log(...a);
 const perso='cheval agrafe batterie correcte';
 await S.activer(c,'marc',{pin:'135792',mdp:perso,guide:false});
 const r=await c.p.evaluate(({perso})=>{ const out=[]; const w=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_ALL); let n; while(n=w.nextNode()){ const t=n.nodeType===3?n.nodeValue:(n.nodeType===1?n.outerHTML.slice(0,0)+[...n.attributes].map(a=>a.value).join(' '):''); if(t.includes(perso)){ const e=n.nodeType===3?n.parentElement:n; out.push({tag:e.tagName,id:e.id,cls:String(e.className).slice(0,50),inDemo:!!e.closest('.sec-demo'),chemin:(function(x){const p=[];while(x&&x!==document.documentElement){p.push(x.tagName+(x.id?'#'+x.id:'')+(x.className&&typeof x.className==='string'?'.'+x.className.split(' ')[0]:''));x=x.parentElement}return p.slice(0,5).join('<')})(e),txt:t.slice(0,120)}); } } return out; },{perso});
 log(JSON.stringify(r,null,1)); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
