// RELECTURE ADVERSE : « Devis rapide » et « Contrat rapide » — le chemin court tient-il toujours, à côté du compositeur ? Captures et contrôles de bout en bout.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='rapide-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis');
  v(`${tag} · « Devis rapide » est un bouton secondaire à côté de « Composer un devis » (principal)`,await p.evaluate(()=>{const r=document.querySelector('[data-dv="nouveau"]'),o=document.querySelector('[data-opd="devis"]'); return !!r&&!!o&&/gris/.test(r.className)&&!/gris/.test(o.className);}));
  await L.toucher(c,'[data-dv="nouveau"]'); await L.calme(p,600);
  const pan=await p.evaluate(()=>({h:(document.querySelector('#calque .panneau h2')||{}).textContent,champs:[...document.querySelectorAll('#calque .panneau input, #calque .panneau select')].map(e=>({id:e.id,h:Math.round(e.getBoundingClientRect().height),fs:parseFloat(getComputedStyle(e).fontSize)})),btn:[...document.querySelectorAll('#calque .panneau .btn')].map(b=>({t:b.textContent.trim(),h:Math.round(b.getBoundingClientRect().height)}))}));
  console.log('  panneau « Devis rapide » :',JSON.stringify(pan));
  v(`${tag} · le panneau « Nouveau devis » s'ouvre`,/Nouveau devis/.test(pan.h||''),pan);
  if(c.doigt) v(`${tag} · champs ≥ 16 px (pas de zoom d'iOS) et boutons ≥ 44 px`,pan.champs.every(x=>x.fs>=16)&&pan.btn.every(b=>b.h>=44),pan);
  await L.capture(c,CAP+tag+'-devis-panneau.png');
  await p.selectOption('#dvn-cli','vp').catch(()=>{}); await p.fill('#dvn-objet','Essai du chemin court'); await L.toucher(c,'[data-dvn="creer|1"]'); await L.calme(p,800);
  const apres=await p.evaluate(()=>({hash:location.hash,h1:(document.querySelector('#contenu h1')||{}).textContent}));
  console.log('  après « Préparer le devis » :',JSON.stringify(apres));
  v(`${tag} · « Préparer le devis » mène à la fiche du devis`,/devis-x-/.test(apres.hash),apres);
  await L.capture(c,CAP+tag+'-devis-fiche.png');
  await L.aller(p,'contrats');
  v(`${tag} · « Contrat rapide » est secondaire, « Composer un contrat » principal`,await p.evaluate(()=>{const r=document.querySelector('[data-go="contrat-nouveau"]'),o=document.querySelector('[data-opd="contrat"]'); return !!r&&!!o&&/gris/.test(r.className)&&!/gris/.test(o.className);}));
  await L.toucher(c,'[data-go="contrat-nouveau"]'); await L.calme(p,700); await L.capture(c,CAP+tag+'-contrat-rapide.png');
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});
