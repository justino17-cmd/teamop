// RELECTURE ADVERSE : qui voit « Composer un devis » / « Composer un contrat » ? (gérant, secrétariat, chef d'équipe, technicien…) — et peut-on forcer par l'adresse ou par le code ?
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', tag='roles-'+pr;
(async()=>{
  console.log('── '+tag);
  for(const qui of ['marc','julie','kb','sm','lr','tl']){
    const c=await L.ouvrir({profil:pr,qui}); const p=c.p;
    const role=await p.evaluate(()=>({r:ROLE,devis:!!rlPermis('devis'),contrats:!!rlPermis('contrats'),nav:[...document.querySelectorAll('[data-go]')].map(e=>e.dataset.go)}));
    await p.evaluate(()=>{ location.hash='#devis'; }); await L.calme(p,800);
    const d=await p.evaluate(()=>({hash:location.hash,h1:(document.querySelector('#contenu h1')||{}).textContent,btn:[...document.querySelectorAll('[data-opd]')].map(b=>b.textContent.trim()),rapide:!![...document.querySelectorAll('[data-dv="nouveau"]')].length}));
    await p.evaluate(()=>{ location.hash='#contrats'; }); await L.calme(p,800);
    const k=await p.evaluate(()=>({hash:location.hash,h1:(document.querySelector('#contenu h1')||{}).textContent,btn:[...document.querySelectorAll('[data-opd]')].map(b=>b.textContent.trim()),rapide:!![...document.querySelectorAll('[data-go="contrat-nouveau"]')].length}));
    console.log(`  ${qui} : rôle ${role.r} devis=${role.devis} contrats=${role.contrats} · page Devis → ${d.hash} « ${d.h1} » boutons ${JSON.stringify(d.btn)} rapide=${d.rapide} · page Contrats → ${k.hash} « ${k.h1} » boutons ${JSON.stringify(k.btn)} rapide=${k.rapide}`);
    v(`${tag} ${qui} · le bouton « Composer un devis » n'existe que si le rôle a le droit`,(d.btn.includes('Composer un devis'))===role.devis,[role,d]);
    v(`${tag} ${qui} · le bouton « Composer un contrat » n'existe que si le rôle a le droit`,(k.btn.includes('Composer un contrat'))===role.contrats,[role,k]);
    // forcer : par le code
    await p.evaluate(()=>{ try{ opdOuvrir('devis'); }catch(e){} try{ opdOuvrir('contrat'); }catch(e){} }); await p.waitForTimeout(900);
    const ouvert=await p.evaluate(()=>{const z=document.getElementById('opdz'); return !!z&&!z.hidden;});
    v(`${tag} ${qui} · forcer l'ouverture par le code : ${role.devis||role.contrats?'permis':'refusé'}`,ouvert===(role.devis||role.contrats),ouvert);
    if(ouvert){ await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
    const toast=await p.evaluate(()=>(document.querySelector('#toast')||{}).innerText||'');
    if(!(role.devis||role.contrats)) v(`${tag} ${qui} · le refus se DIT (toast : « ${toast.replace(/\s+/g,' ').slice(0,80)} »)`,/rôle/.test(toast),toast);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
