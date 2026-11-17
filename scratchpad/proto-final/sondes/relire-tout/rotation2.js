// RELECTURE ADVERSE : rotation de la tablette / fenêtre qu'on agrandit, en deux scénarios — (a) SANS aperçu ouvert, (b) AVEC l'aperçu plein écran ouvert puis fermé après la rotation.
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v;
const pr=process.env.PROFIL||'ipad', tag='rot2-'+pr;
const geo=f=>f.evaluate(()=>{ const vis=e=>e&&e.getBoundingClientRect().width>0&&e.offsetParent!==null; const col=document.querySelector('.vv-ap-sc .feuille'); const r=e=>e?{x:Math.round(e.getBoundingClientRect().left),w:Math.round(e.getBoundingClientRect().width)}:null;
  return {W:innerWidth,colVisible:vis(document.querySelector('.vv-ap-sc')),feuilleCol:r(col),vs:(document.querySelector('.vv-ap-sc')||{style:{getPropertyValue:()=>''}}).style.getPropertyValue('--vs'),grand:!!document.querySelector('.vv-grand'),zoomLabel:[...document.querySelectorAll('[data-vv="zoom"][data-v="ajuster"]')].map(b=>b.textContent.trim()+(vis(b)?'':'(masqué)')).join(' ; ')}; });
(async()=>{
  console.log('── '+tag);
  for(const avecApercu of [false,true]){
    const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p;
    const f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
    await X.clic(c,f,'[data-vv="client"][data-id="vp"]'); await X.clic(c,f,'[data-vv="art-add"][data-id="VE-DK-35"]'); await L.calme(p,400);
    if(avecApercu){ await X.clic(c,f,'[data-vv="grand"]'); await L.calme(p,500); }
    await p.setViewportSize({width:1180,height:820}); await L.calme(p,900);
    if(avecApercu){ let g=await geo(f); console.log('  (b) apercu ouvert pendant la rotation :',JSON.stringify(g)); await X.clic(c,f,'[data-vv="grand-x"]'); await L.calme(p,700); }
    const g=await geo(f); console.log('  '+(avecApercu?'(b) après fermeture de l\'aperçu':'(a) rotation simple')+' :',JSON.stringify(g));
    await L.capture(c,CAP+`${tag}-${avecApercu?'b':'a'}-paysage.png`);
    v(`${tag} ${avecApercu?'(b)':'(a)'} · paysage 1180 : la page de la colonne de droite ≥ 480 px (${g.feuilleCol&&g.feuilleCol.w}) et le réglage dit « Ajuster · N % » pour de vrai`,g.colVisible&&g.feuilleCol&&g.feuilleCol.w>=480,g);
    await p.setViewportSize({width:1440,height:900}); await L.calme(p,900); const h=await geo(f);
    v(`${tag} ${avecApercu?'(b)':'(a)'} · puis 1440 px : la page ≥ 620 px (${h.feuilleCol&&h.feuilleCol.w})`,h.feuilleCol&&h.feuilleCol.w>=620,h);
    v(`${tag} ${avecApercu?'(b)':'(a)'} · aucune erreur JavaScript`,c.err.length===0,c.err);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
