// RELECTURE ADVERSE : l'atelier absent (404) puis revenu — « L'atelier ne s'ouvre pas », Réessayer, Fermer, Échap, focus, historique.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='absent-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  L.absents.add('apercu/prototype-documents.html');
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p;
  console.log('── '+tag);
  await L.aller(p,'devis'); const h0=await p.evaluate(()=>history.length);
  await L.toucher(c,'[data-opd="devis"]'); await p.waitForTimeout(1200);
  let e=await p.evaluate(()=>{const z=document.getElementById('opdz'); const a=z&&z.querySelector('.opdz-att'); return {ouvert:!!z&&!z.hidden,att:a?a.innerText.replace(/\s+/g,' '):'',attVisible:!!a&&!a.hidden,focus:document.activeElement&&(document.activeElement.dataset.opdz||document.activeElement.tagName)};});
  v(tag+' · pendant l\'attente : « Ouverture de l\'atelier… » et le focus sur « Fermer »',e.ouvert&&/Ouverture/.test(e.att)&&e.focus==='fermer',e);
  await L.capture(c,CAP+tag+'-attente.png');
  await p.waitForTimeout(8300);
  e=await p.evaluate(()=>{const z=document.getElementById('opdz'); const a=z.querySelector('.opdz-att'); return {att:a.innerText.replace(/\s+/g,' '),reess:!a.querySelector('[data-opdz="reessayer"]').hidden,focus:document.activeElement&&(document.activeElement.dataset.opdz||document.activeElement.tagName)};});
  v(tag+' · au bout de 8 s : « L\'atelier ne s\'ouvre pas. » + « Réessayer » + « Fermer »',/L’atelier ne s’ouvre pas/.test(e.att)&&e.reess&&/Fermer/.test(e.att),e);
  await L.capture(c,CAP+tag+'-echec.png');
  // Réessayer alors que l'atelier est toujours absent
  await L.toucher(c,'[data-opdz="reessayer"]'); await p.waitForTimeout(800);
  e=await p.evaluate(()=>{const a=document.querySelector('#opdz .opdz-att'); return a.innerText.replace(/\s+/g,' ');});
  v(tag+' · « Réessayer » repart sur « Ouverture de l\'atelier… »',/Ouverture/.test(e),e);
  // l'atelier revient
  L.absents.delete('apercu/prototype-documents.html');
  await p.waitForTimeout(8400);
  await L.toucher(c,'[data-opdz="reessayer"]'); await p.waitForTimeout(2500);
  const f=A.cadre(p); const ok=f?await f.evaluate(()=>!!document.querySelector('.voile, #vue-editeur:not([hidden])')).catch(()=>false):false;
  v(tag+' · l\'atelier revenu : « Réessayer » ouvre le compositeur demandé',ok,!!f);
  if(ok){ await p.keyboard.press('Escape'); await p.waitForTimeout(700); }
  v(tag+' · fermé, l\'historique est revenu à '+h0,(await p.evaluate(()=>history.length))>=h0&&(await p.evaluate(()=>location.hash))==='#devis');
  // 2e cas : Échap pendant l'attente
  L.absents.add('apercu/prototype-documents.html');
  const c2=await L.ouvrir({profil:pr,nuit,qui:'marc'}); await L.aller(c2.p,'devis'); await L.toucher(c2,'[data-opd="devis"]'); await c2.p.waitForTimeout(700);
  await c2.p.keyboard.press('Escape'); await c2.p.waitForTimeout(600);
  v(tag+' · Échap pendant l\'attente ferme la fenêtre d\'attente',await c2.p.evaluate(()=>{const z=document.getElementById('opdz'); return !z||z.hidden;}));
  v(tag+' · aucune erreur JavaScript (hors réseau attendu)',c.err.filter(x=>!/prototype-documents|404/.test(x)).length===0,c.err);
  await L.fin(c); await L.fin(c2); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
