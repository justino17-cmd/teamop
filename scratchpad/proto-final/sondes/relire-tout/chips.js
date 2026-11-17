// RELECTURE ADVERSE : les pastilles de catégorie du catalogue (Tout, Matériel, Main-d'œuvre, Entretien, Déplacement, Mon matériel) — combien d'articles derrière chacune, et que dit l'écran quand elle est vide ?
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='chips-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  const cat=await p.evaluate(()=>{ const P=opdDonnees(); const par={}; P.catalogue.forEach(x=>{ par[x.cat||'(vide)']=(par[x.cat||'(vide)']||0)+1; }); return {n:P.catalogue.length,par,noms:P.catalogue.filter(x=>/main|dépl|entret|pose|heure/i.test(x.des)).map(x=>x.des)}; });
  console.log('  catalogue envoyé par OP GESTION :',JSON.stringify(cat));
  await L.aller(p,'devis'); const f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const chips=await f.evaluate(()=>[...document.querySelectorAll('[data-vv="cat"]')].map(b=>({v:b.dataset.v,t:b.innerText.replace(/\s+/g,' ').trim()})));
  const res={};
  for(const ch of chips){ await X.clic(c,f,`[data-vv="cat"][data-v="${ch.v}"]`); await p.waitForTimeout(250);
    const info=await f.evaluate(()=>({n:[...document.querySelectorAll('[data-vv="art-add"]')].filter(e=>e.offsetParent).length,txt:(document.querySelector('#vv-cat, .vv-cat')||{innerText:''}).innerText.replace(/\s+/g,' ').trim().slice(0,120)}));
    res[ch.t]=info; console.log(`  pastille « ${ch.t} » → ${info.n} article(s) · « ${info.n?'':info.txt} »`); }
  const vides=Object.entries(res).filter(([k,x])=>x.n===0&&!/Mon matériel/.test(k)).map(([k])=>k);
  v(`${tag} · aucune pastille de catégorie ne mène à une liste vide (hors « Mon matériel »), sinon elle n'est pas proposée : vides = ${JSON.stringify(vides)}`,vides.length===0,[vides,res]);
  v(`${tag} · le catalogue propose de la main-d'œuvre et un déplacement (un devis de métier de terrain en a presque toujours) : ${JSON.stringify(cat.noms)}`,cat.noms.length>=2,cat);
  await X.clic(c,f,`[data-vv="cat"][data-v="Main-d’œuvre"]`); await p.waitForTimeout(300); await L.capture(c,CAP+tag+'-vide.png');
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});
