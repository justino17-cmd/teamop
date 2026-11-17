// RELECTURE ADVERSE : le compositeur pendant qu'on change la taille de la fenêtre (rotation de la tablette, fenêtre de bureau qu'on rétrécit), avec l'aperçu plein écran ouvert ou non.
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v;
const pr=process.env.PROFIL||'ipad', nuit=process.env.NUIT==='1', tag='rot-'+pr+(nuit?'-nuit':'-jour');
const geo=f=>f.evaluate(()=>{ const vis=e=>e&&e.getBoundingClientRect().width>0&&e.offsetParent!==null; const r=e=>e?{x:Math.round(e.getBoundingClientRect().left),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)}:null;
  const fe=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(vis);
  return {W:innerWidth,H:innerHeight,fen:r(document.querySelector('.fenetre.vv-pl')),form:r(document.querySelector('.vv-form')),col:vis(document.querySelector('.vv-ap-sc')),grand:!!document.querySelector('.vv-grand'),feuille:fe?r(fe):null,bar:vis(document.querySelector('.vv-ap-bar')),sw:document.documentElement.scrollWidth}; });
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p;
  console.log('── '+tag);
  const f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
  await A.composerDevis; await X.clic(c,f,'[data-vv="client"][data-id="vp"]'); await X.clic(c,f,'[data-vv="art-add"][data-id="VE-DK-35"]'); await L.calme(p,500);
  const W0=c.largeur, H0=c.hauteur;
  let g=await geo(f); console.log('départ',JSON.stringify(g));
  // ouvrir l'aperçu plein écran si une colonne
  if(g.bar){ await X.clic(c,f,'[data-vv="grand"]'); await L.calme(p,500); }
  await p.setViewportSize({width:1180,height:820}); await L.calme(p,900); g=await geo(f);
  console.log('paysage 1180',JSON.stringify(g));
  v(tag+' · paysage 1180 : deux colonnes, la page ≥ 480 px ('+(g.feuille&&g.feuille.w)+')',g.col&&g.feuille&&g.feuille.w>=480&&g.form.w>=480,g);
  v(tag+' · paysage : plus d\'aperçu plein écran resté ouvert par-dessus (grand='+g.grand+')',!g.grand || g.col,g);
  v(tag+' · paysage : rien ne déborde',g.sw<=g.W+1,g.sw);
  await L.capture(c,CAP+`${tag}-paysage.png`);
  await p.setViewportSize({width:1024,height:768}); await L.calme(p,900); g=await geo(f);
  console.log('1024',JSON.stringify(g));
  v(tag+' · 1024 : cohérent (deux colonnes avec page ≥ 480 OU une colonne avec « Aperçu »)',(g.col&&g.feuille&&g.feuille.w>=480)||(!g.col&&g.bar),g);
  await L.capture(c,CAP+`${tag}-1024.png`);
  await p.setViewportSize({width:W0,height:H0}); await L.calme(p,900); g=await geo(f);
  console.log('retour',JSON.stringify(g));
  v(tag+' · retour à la taille de départ : la fenêtre couvre l\'écran',g.fen&&g.fen.w===g.W&&g.fen.h===g.H,g.fen);
  v(tag+' · … la page du devis suit toujours (Ventilateur extérieur)',await f.evaluate(()=>/Ventilateur/.test(document.body.innerText)));
  // bureau rétréci
  await p.setViewportSize({width:900,height:700}); await L.calme(p,800); g=await geo(f); console.log('900',JSON.stringify(g));
  v(tag+' · 900 px : une colonne + « Aperçu », rien ne déborde',!g.col&&g.bar&&g.sw<=g.W+1,g);
  await p.setViewportSize({width:1440,height:900}); await L.calme(p,900); g=await geo(f); console.log('1440',JSON.stringify(g));
  v(tag+' · 1440 px : deux colonnes, page ≥ 620',g.col&&g.feuille&&g.feuille.w>=620,g);
  await L.capture(c,CAP+`${tag}-1440.png`);
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
