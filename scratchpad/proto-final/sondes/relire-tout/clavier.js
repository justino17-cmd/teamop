// RELECTURE ADVERSE : au clavier seul (Windows, Mac) — focus à l'ouverture, ordre de Tab, indicateur de focus visible, Entrée sur un client, piège de focus, Échap.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'windows', nuit=process.env.NUIT==='1', tag='clav-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis');
  // ouvrir PAR LE CLAVIER : focus sur « Composer un devis » puis Entrée
  await p.evaluate(()=>document.querySelector('[data-opd="devis"]').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  const f=A.cadre(p); v(`${tag} · Entrée sur « Composer un devis » ouvre le compositeur`,!!f&&await f.evaluate(()=>!!document.querySelector('.fenetre.vv-pl')));
  const act=()=>f.evaluate(()=>{ const e=document.activeElement; if(!e) return null; const cs=getComputedStyle(e); return {t:e.tagName,id:e.id,vv:e.dataset&&e.dataset.vv,lib:(e.getAttribute('aria-label')||e.textContent||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,30),outline:cs.outlineStyle+' '+cs.outlineWidth,ombre:cs.boxShadow!=='none',vis:e.matches(':focus-visible')}; });
  let a=await act(); console.log('  focus à l\'ouverture :',JSON.stringify(a));
  v(`${tag} · le focus est dans le compositeur à l'ouverture (champ de recherche du client)`,a&&a.id==='vv-q',a);
  const suite=[]; let sansIndicateur=[];
  for(let i=0;i<14;i++){ await p.keyboard.press('Tab'); await p.waitForTimeout(80); const x=await act(); suite.push((x.id||x.vv||x.t)+':'+x.lib); if(x.vis&&!(/^(solid|auto|dotted|dashed)/.test(x.outline)&&!/^0px/.test(x.outline.split(' ')[1]||'0px'))&&!x.ombre) sansIndicateur.push(x); }
  console.log('  ordre de Tab :',suite.join(' → '));
  v(`${tag} · chaque élément qui prend le focus au clavier montre un indicateur (contour ou ombre) : ${sansIndicateur.length} sans`,sansIndicateur.length===0,sansIndicateur);
  // Entrée sur un client
  await f.evaluate(()=>document.querySelector('[data-vv="client"][data-id="vp"]').focus()); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  v(`${tag} · Entrée sur un client le choisit`,await f.evaluate(()=>document.querySelector('[data-vv="client"][data-id="vp"]').getAttribute('aria-pressed')==='true'||/Vieux Port/.test((document.querySelector('#vv-r-client')||{}).textContent||'')));
  // Espace sur un article
  await f.evaluate(()=>document.querySelector('[data-vv="art-add"][data-id="EL-ALL"]').focus()); await p.keyboard.press('Space'); await p.waitForTimeout(300);
  v(`${tag} · Espace sur un article l'ajoute`,await f.locator('[data-vv-q]').count()===1);
  // piège de focus : 90 Tab — le focus sort-il du cadre ?
  let sortis=0; for(let i=0;i<90;i++){ await p.keyboard.press('Tab'); if(i%3===0){ const dedans=await p.evaluate(()=>document.activeElement&&document.activeElement.tagName==='IFRAME'); if(!dedans) sortis++; } }
  v(`${tag} · 90 touches Tab : le focus reste dans le compositeur (sorties : ${sortis})`,sortis===0,sortis);
  // Échap avec contenu → confirmation → Échap → Entrée sur Abandonner
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  v(`${tag} · Échap avec du contenu : la confirmation paraît`,await f.evaluate(()=>!!document.querySelector('.dialogue')));
  await p.keyboard.press('Tab'); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
  const ferme=await p.evaluate(()=>{const z=document.getElementById('opdz'); return !z||z.hidden;});
  console.log('  après Tab + Entrée dans la confirmation : atelier fermé =',ferme);
  v(`${tag} · dans la confirmation, Tab puis Entrée atteint « Abandonner » et ferme`,ferme);
  v(`${tag} · après la fermeture, le focus revient sur « Composer un devis »`,await p.evaluate(()=>document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.opd==='devis'),await p.evaluate(()=>document.activeElement&&document.activeElement.outerHTML.slice(0,80)));
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});
