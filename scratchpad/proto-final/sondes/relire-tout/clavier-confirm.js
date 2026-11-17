// RELECTURE ADVERSE (suite de clavier.js) : dans la confirmation « Abandonner ce devis ? », que font Tab, Maj+Tab, Entrée, Espace, Échap ?
const X=require('./lib2.js'), {A,L}=X, v=L.v;
const pr=process.env.PROFIL||'windows', tag='conf-'+pr;
(async()=>{
  const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis'); const f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await f.locator('#vv-objet').fill('Du contenu'); await f.locator('#vv-objet').press('Tab'); await p.waitForTimeout(200);
  const etat=async(m)=>{ const e=await f.evaluate(()=>({d:!!document.querySelector('.dialogue'),act:(document.activeElement.textContent||document.activeElement.id||document.activeElement.tagName).trim().slice(0,24),r:document.activeElement.dataset&&document.activeElement.dataset.r})); const ferme=await p.evaluate(()=>{const z=document.getElementById('opdz'); return !z||z.hidden;}); console.log('  '+m+' → dialogue',e.d,'· focus « '+e.act+' » data-r='+e.r+' · atelier fermé',ferme); return {...e,ferme}; };
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); let e=await etat('Échap');
  await p.keyboard.press('Tab'); await p.waitForTimeout(200); e=await etat('Tab');
  v(`${tag} · Tab déplace le focus de « Continuer » à « Abandonner »`,e.r==='1',e);
  await p.keyboard.press('Enter'); await p.waitForTimeout(1200); e=await etat('Entrée');
  v(`${tag} · Entrée sur « Abandonner » ferme la confirmation ET le compositeur`,!e.d&&e.ferme,e);
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,600));process.exit(2);});
