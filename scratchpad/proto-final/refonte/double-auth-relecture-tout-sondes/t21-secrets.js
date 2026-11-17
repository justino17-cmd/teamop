const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 const provs={}; for(const k of ['marc','julie','sm','kb','lr','tl']) provs[k]=await S.provisoire(c,k);
 log('provisoires lus dans la démo:',Object.values(provs).every(x=>x&&x.length>=15));
 const scan=async(etape,secrets)=>{ const r=await c.p.evaluate(({secrets})=>{ const out=[]; const cl=document.documentElement.cloneNode(true); cl.querySelectorAll('.sec-demo').forEach(e=>e.remove()); const html=cl.outerHTML;
    const attrs=[...cl.querySelectorAll('*')].flatMap(e=>[...e.attributes].map(a=>a.name+'='+a.value)).join('\n'); const nodes=cl.querySelectorAll('input,textarea'); const vals=[...document.querySelectorAll('input,textarea')].filter(i=>!i.closest('.sec-demo')).map(i=>i.value).join('\n');
    for(const [n,s] of Object.entries(secrets)){ if(!s) continue; if(html.includes(s)) out.push(n+' dans le HTML'); if(attrs.includes(s)) out.push(n+' dans un attribut'); if(vals.includes(s)) out.push(n+' dans un champ'); try{ if(location.href.includes(s)||window.name.includes(s)||document.cookie.includes(s)) out.push(n+' dans adresse/name/cookie'); for(let i=0;i<localStorage.length;i++){ const v=localStorage.getItem(localStorage.key(i))+localStorage.key(i); if(v.includes(s)) out.push(n+' dans localStorage'); } for(let i=0;i<sessionStorage.length;i++){ if((sessionStorage.getItem(sessionStorage.key(i))+sessionStorage.key(i)).includes(s)) out.push(n+' dans sessionStorage'); } }catch(e){} }
    return out; },{secrets}); log(etape.padEnd(40),r.length?('✗ '+r.join(' | ')):'✓ aucun secret'); };
 const sec={...Object.fromEntries(Object.entries(provs).map(([k,v])=>['prov-'+k,v]))};
 await scan('départ (provisoires)',sec);
 // Marc active (PIN 135792 / mdp perso)
 const pin='135792', perso='Zorglub-pamplemousse-87';
 await S.activer(c,'marc',{pin,mdp:perso}); await c.p.waitForTimeout(1500); await c.p.evaluate(()=>{const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click();}); await c.p.waitForTimeout(500);
 const s2={...sec,pin_marc:pin,mdp_marc:perso}; await scan('après activation de Marc (en session)',s2);
 // grâce à la fenêtre de confirmation, un nombre
 await S.avancer(c,6); await L.aller(c.p,'entreprise'); await c.p.waitForTimeout(500);
 await c.p.click('[data-ent="carte|banque"]'); await c.p.waitForTimeout(500);
 const n=await S.lireNombre(c); await scan('fenêtre de confirmation ouverte (nombre)',{...s2,nombre_de_confirmation:' '+n+' '});
 // note: le nombre est le texte de son élément (par construction) ; on vérifie qu'il n'est pas dans un attribut
 const nAttr=await c.p.evaluate(n=>[...document.querySelectorAll('*')].some(e=>[...e.attributes].some(a=>/^data-/.test(a.name)&&a.value===n)),n); log('nombre dans une data- :',nAttr);
 await S.approuver(c,'marc',n,pin); await c.p.waitForTimeout(900);
 const iban=await c.p.evaluate(()=>[...document.querySelectorAll('.panneau input')].map(i=>i.value).join('|')); log('IBAN entier visible après confirmation:',/FR76/.test(iban));
 await scan('après confirmation IBAN',s2);
 // fermer le panneau puis attendre l'expiration : l'IBAN doit disparaître du DOM
 await c.p.evaluate(()=>{ try{ fermerPanneau() }catch(e){} }); await c.p.waitForTimeout(400);
 const ibanDom=await c.p.evaluate(()=>{const h=document.documentElement.outerHTML; return /FR76\s?\d{4}/.test(h.replace(/<script[\s\S]*?<\/script>/g,''))}); log('IBAN en clair dans le DOM (hors script) panneau fermé:',ibanDom);
 // journal
 const j=await c.p.evaluate(()=>JSON.stringify((SECU.journal||[]).concat(typeof JOURNAL!=='undefined'?JOURNAL:[])));
 log('journal contient un secret ?',Object.entries(s2).filter(([k,x])=>x&&j.includes(x)).map(([k])=>k));
 // mots interdits dans le texte affiché
 log('ERRJS',c.err.slice(0,3)); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
