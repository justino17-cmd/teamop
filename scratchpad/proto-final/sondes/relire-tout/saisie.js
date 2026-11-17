// RELECTURE ADVERSE : la frappe vraie, touche par touche (délai de 70 ms) — le champ garde le focus et tout son texte pendant que la liste, le total et la page se redessinent.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', tag='saisie-'+pr;
(async()=>{
  const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p; console.log('── '+tag);
  await L.aller(p,'devis'); const f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const foc=()=>f.evaluate(()=>({id:document.activeElement.id||document.activeElement.getAttribute('data-vv-q')!==null&&'qte'||document.activeElement.getAttribute('data-vv-p')!==null&&'prix'||document.activeElement.tagName,val:document.activeElement.value}));
  const taper=async(sel,txt)=>{ await f.locator(sel).first().click(); await p.keyboard.type(txt,{delay:70}); await p.waitForTimeout(300); return foc(); };
  let r=await taper('#vv-q','mimosas'); v(`${tag} · recherche de client tapée au clavier : champ et texte intacts`,r.id==='vv-q'&&r.val==='mimosas',r);
  await X.clic(c,f,'[data-vv="client"][data-id="mi"]');
  r=await taper('#vv-objet','Remplacement de la pompe — été 2026'); v(`${tag} · objet tapé : intact`,r.id==='vv-objet'&&r.val==='Remplacement de la pompe — été 2026',r);
  r=await taper('#vv-cq','pompe'); v(`${tag} · recherche du catalogue tapée : intacte`,r.id==='vv-cq'&&r.val==='pompe',r);
  await X.clic(c,f,'[data-vv="art-add"][data-id="PR-250"]');
  await f.locator('[data-vv-q]').first().click(); await p.keyboard.press('Control+A'); await p.keyboard.type('12,5',{delay:70}); await p.waitForTimeout(400); r=await foc();
  v(`${tag} · quantité tapée « 12,5 » : le champ garde le focus et sa valeur (${JSON.stringify(r)})`,r.id==='qte'&&r.val==='12,5',r);
  await f.locator('[data-vv-p]').first().click(); await p.keyboard.press('Control+A'); await p.keyboard.type('119,95',{delay:70}); await p.waitForTimeout(400); r=await foc();
  v(`${tag} · prix tapé « 119,95 » : intact (${JSON.stringify(r)})`,r.id==='prix'&&r.val==='119,95',r);
  const tot=await f.evaluate(()=>((document.querySelector('.vv-pied-tot, #vv-ap-ttc')||{}).innerText||'').replace(/\s+/g,' '));
  // 12,5 × 119,95 = 1499,375 → 1 499,38 HT (arrondi) → TTC 1 799,25 (TVA 20 % = 299,88 ; 1499,38 + 299,88 = 1799,26 ?)
  console.log('  total :',tot);
  v(`${tag} · total TTC juste : 12,5 × 119,95 = 1 499,38 HT (arrondi) ; TVA 299,88 → 1 799,26 ± 0,01 (${tot})`,/1\s?79[89],2[5-7]/.test(tot),tot);
  await f.locator('#vv-mot').click(); await p.keyboard.type('Merci — à très vite !',{delay:60}); await p.waitForTimeout(300); r=await foc(); v(`${tag} · le mot pour le client tapé : intact`,r.val==='Merci — à très vite !',r);
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});
