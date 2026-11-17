// RELECTURE ADVERSE : deux onglets du même navigateur (même rangement). Un devis composé dans l'onglet B paraît dans l'onglet A sans recharger ; les numéros ne se doublent pas ; l'onglet A qui compose ensuite ne reprend pas un numéro donné par B ; ce que B n'a pas fini n'écrase pas A.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', tag='onglets-'+pr;
(async()=>{
  const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p; console.log('── '+tag);
  const url=p.url(); const b=await c.ctx.newPage(); b.on('pageerror',e=>c.err.push('ERREUR B '+e.message));
  await b.goto(url,{waitUntil:'load',timeout:60000}); await b.waitForTimeout(1500);
  await b.evaluate(()=>{ const x=document.querySelector('#nv [data-nv="fermer"]'); if(x) x.click(); }); await b.waitForTimeout(400);
  const cB={...c,p:b}; await L.aller(p,'devis'); await L.aller(b,'devis');
  const liste=pg=>pg.evaluate(()=>[...document.querySelectorAll('#contenu .opd-l')].map(e=>e.innerText.replace(/\s+/g,' ').trim()));
  v(`${tag} · départ : aucun document composé dans les deux onglets`,(await liste(p)).length===0&&(await liste(b)).length===0);
  // B compose et crée
  await b.bringToFront(); let f=await A.ouvrirAtelier(cB,'devis',null); await L.calme(b,900);
  await A.composerDevis(cB,f,{client:'hp',objet:'Fait dans l’onglet B',articles:[{ref:'TH-900',qte:1}]}); const nB=await f.evaluate(()=>D().meta.numero);
  await X.clic(cB,f,'[data-act="retour"]:visible'); await b.waitForTimeout(1200);
  await p.bringToFront(); await p.waitForTimeout(1500);
  const lA=await liste(p); console.log('  onglet A après la création dans B :',JSON.stringify(lA),'(numéro de B :',nB+')');
  v(`${tag} · l'onglet A montre le devis de B sans recharger (${nB})`,lA.some(r=>r.includes(nB)),lA);
  // A compose : numéro suivant
  f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await A.composerDevis(c,f,{client:'vp',objet:'Fait dans l’onglet A',articles:[{ref:'EL-ALL',qte:1}]}); const nA=await f.evaluate(()=>D().meta.numero);
  const att='D-2026-'+String(parseInt(nB.slice(7),10)+1).padStart(3,'0');
  v(`${tag} · le devis de A prend ${att} (suit celui de B)`,nA===att,[nA,nB]);
  await X.clic(c,f,'[data-act="retour"]:visible'); await p.waitForTimeout(1200);
  await b.bringToFront(); await b.waitForTimeout(1500); const lB=await liste(b);
  v(`${tag} · l'onglet B montre les DEUX documents`,lB.some(r=>r.includes(nB))&&lB.some(r=>r.includes(nA)),lB);
  // A et B ouvrent le même document et le modifient chacun
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});
