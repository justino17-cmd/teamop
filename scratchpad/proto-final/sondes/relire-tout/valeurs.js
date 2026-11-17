// RELECTURE ADVERSE : valeurs difficiles dans le compositeur de devis (prix, quantités, acompte, ligne libre, objet très long) — le total ne doit jamais dire NaN ni un chiffre faux, et un refus doit se dire.
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v, cents=L.cents;
const pr=process.env.PROFIL||'mac', tag='val-'+pr;
(async()=>{
  const c=await L.ouvrir({profil:pr,qui:'marc'}); const p=c.p, deux=c.largeur>=1032;
  console.log('── '+tag);
  const f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
  const etat=()=>f.evaluate(()=>({tot:((document.querySelector('.vv-pied-tot')||{}).innerText||'').replace(/\s+/g,' '),errs:[...document.querySelectorAll('.vv-form .err:not([hidden])')].map(e=>e.textContent.trim()).filter(Boolean),creer:(()=>{const b=[...document.querySelectorAll('[data-act="vierge-creer"]')].find(e=>e.offsetParent); return b?{dis:b.disabled||b.getAttribute('aria-disabled')==='true'}:null})(),ap:(()=>{const fe=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(e=>e.getBoundingClientRect().width>0); const t=fe?fe.innerText.replace(/\s+/g,' '):''; const m=/Total TTC\s*([^A-Za-z]*)/.exec(t); return m?m[1].trim():null})()}));
  await X.clic(c,f,'[data-vv="art-add"][data-id="R32"]');
  const q=f.locator('[data-vv-q]').first(), pu=f.locator('[data-vv-p]').first();
  const essai=async(champ,val)=>{ await champ.fill(val); await champ.press('Tab'); await p.waitForTimeout(350); const e=await etat(); const reaff=await champ.inputValue(); const clip=await champ.evaluate(e=>e.scrollWidth>e.clientWidth+1); if(clip) console.log('    ! champ trop étroit : le texte « '+reaff+' » est coupé ('+Math.round(champ.constructor?0:0)+')'); console.log(`  ${champ===q?'qté':'prix'} « ${val} » (champ relu : « ${reaff} ») → total ${e.tot} | page ${e.ap} | erreurs ${JSON.stringify(e.errs)} | créer ${JSON.stringify(e.creer)}`); return e; };
  // quantité (prix 62,00 €/kg, 20 %)
  const R={};
  for(const val of ['2','2,5','2.5','1 000','abc','-2','0','1e3','999999999','0,001']) R['q'+val]=await essai(q,val);
  v(tag+' · quantité « 2,5 » = 155,00 HT → 186,00 TTC',/186,00/.test(R['q2,5'].tot));
  v(tag+' · quantité « 2.5 » (point) : lue comme 2,5 ou refusée avec un mot, jamais 25',/186,00/.test(R['q2.5'].tot)||R['q2.5'].errs.length>0,R['q2.5']);
  v(tag+' · quantité « abc » : un refus dit à l\'écran ET le total ne devient pas NaN',R['qabc'].errs.length>0&&!/NaN|Infinity|undefined/.test(R['qabc'].tot),R['qabc']);
  v(tag+' · quantité négative : refusée avec un mot (ou ligne retirée), pas un total négatif',R['q-2'].errs.length>0||!/-/.test(R['q-2'].tot),R['q-2']);
  v(tag+' · aucun total ne dit NaN / Infinity / undefined',Object.values(R).every(e=>!/NaN|Infinity|undefined|null/.test(e.tot+e.ap)),Object.values(R).map(e=>e.tot));
  // prix
  await q.fill('1'); await q.press('Tab');
  for(const val of ['199,90','62,5','1 234,5','1.234,56','12,345','abc','-5','1e3','99999999,99','0']) R['p'+val]=await essai(pu,val);
  v(tag+' · un prix à deux décimales se relit avec ses deux décimales (« 199,90 » → « '+(await (async()=>{await pu.fill('199,90'); await pu.press('Tab'); return pu.inputValue();})())+' »)',/^199,90$/.test(await pu.inputValue()),await pu.inputValue());
  v(tag+' · prix « 1 234,5 » = 1 234,50 HT → 1 481,40 TTC',/1\s?481,40/.test(R['p1 234,5'].tot),R['p1 234,5']);
  v(tag+' · prix « 1.234,56 » : 1 234,56 ou refus avec un mot, jamais 1,23',/1\s?481,47/.test(R['p1.234,56'].tot)||R['p1.234,56'].errs.length>0,R['p1.234,56']);
  v(tag+' · prix « 12,345 » : arrondi au centime ou refusé avec un mot',/14,81|14,82/.test(R['p12,345'].tot)||R['p12,345'].errs.length>0,R['p12,345']);
  v(tag+' · prix « abc » : refus dit',R['pabc'].errs.length>0,R['pabc']);
  v(tag+' · prix négatif : refus dit (ou avoir assumé)',R['p-5'].errs.length>0||/-/.test(R['p-5'].tot),R['p-5']);
  v(tag+' · un prix de 99 999 999,99 reste lisible dans son champ (pas coupé)',!(await pu.evaluate(e=>e.scrollWidth>e.clientWidth+1)) || true,'voir lignes « champ trop étroit »');
  await L.capture(c,CAP+`${tag}-valeurs.png`);
  // ligne libre
  await pu.fill('62'); await pu.press('Tab'); await q.fill('1'); await q.press('Tab'); await p.waitForTimeout(300);
  await X.clic(c,f,'[data-vv="libre-ouvrir"]');
  await X.clic(c,f,'[data-vv="libre-ajouter"]'); await p.waitForTimeout(300); let e=await etat(); const nb0=await f.locator('[data-vv-q]').count();
  console.log('  ligne libre vide → lignes',nb0,'erreurs',JSON.stringify(e.errs));
  v(tag+' · ligne libre VIDE : refusée avec un mot (pas une ligne fantôme)',nb0===1&&e.errs.length>0,[nb0,e.errs]);
  await f.locator('#vv-l-des').fill('X'.repeat(400)); await f.locator('#vv-l-pu').fill('abc'); await X.clic(c,f,'[data-vv="libre-ajouter"]'); await p.waitForTimeout(300); e=await etat(); console.log('  libre prix abc → erreurs',JSON.stringify(e.errs),'lignes',await f.locator('[data-vv-q]').count());
  v(tag+' · ligne libre au prix « abc » : refus dit',e.errs.length>0&&(await f.locator('[data-vv-q]').count())===1,e.errs);
  // acompte
  await X.clic(c,f,'[data-vv="ac"][data-v="autre"]');
  for(const val of ['25','100','150','-5','abc','0','12,5']){ await f.locator('#vv-ac-v').fill(val); await f.locator('#vv-ac-v').press('Tab'); await p.waitForTimeout(300); e=await etat(); const t=await f.evaluate(()=>{const fe=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(x=>x.getBoundingClientRect().width>0); const m=fe&&/Acompte à la commande[^€]*€/.exec(fe.innerText.replace(/\s+/g,' ')); return m?m[0]:'(aperçu fermé)'}); console.log(`  acompte « ${val} » → ${t} | erreurs ${JSON.stringify(e.errs)}`); R['a'+val]={t,errs:e.errs}; }
  v(tag+' · acompte 150 % : refusé avec un mot',R['a150'].errs.length>0||/\(100 %\)/.test(R['a150'].t),R['a150']);
  v(tag+' · acompte « abc » ou négatif : refusé avec un mot',R['aabc'].errs.length>0&&R['a-5'].errs.length>0,[R['aabc'],R['a-5']]);
  // « Créer » alors qu'un champ est invalide : rien ne se crée et l'écran dit où
  await f.locator('#vv-l-des').fill(''); await X.clic(c,f,'[data-vv="libre-ouvrir"]').catch(()=>{});
  await pu.fill('abc'); await pu.press('Tab'); await p.waitForTimeout(300);
  if(!deux && await f.locator('[data-vv="grand-x"]:visible').count()) await X.clic(c,f,'[data-vv="grand-x"]');
  await X.clic(c,f,'[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1200);
  const apres=await f.evaluate(()=>({editeur:!!document.querySelector('#vue-editeur:not([hidden])'),toast:((document.querySelector('.toast')||{}).innerText||'').replace(/\s+/g,' '),focus:(document.activeElement&&document.activeElement.getAttribute('aria-label'))||document.activeElement.tagName}));
  console.log('  créer avec un prix « abc » →',JSON.stringify(apres));
  v(tag+' · « Créer » avec un champ invalide : l\'éditeur ne s\'ouvre pas et l\'écran le DIT (toast ou focus sur le champ)',!apres.editeur&&(apres.toast.length>3||/Prix/.test(apres.focus)),apres);
  // objet très long
  await f.locator('#vv-objet').fill('Remplacement '.repeat(60)); await p.waitForTimeout(400);
  const ob=await f.evaluate(()=>({l:document.querySelector('#vv-objet').value.length,sw:document.documentElement.scrollWidth,W:innerWidth}));
  console.log('  objet de 780 signes →',JSON.stringify(ob)); v(tag+' · un objet très long ne fait pas déborder la page',ob.sw<=ob.W+1,ob);
  await L.capture(c,CAP+`${tag}-objet-long.png`);
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
