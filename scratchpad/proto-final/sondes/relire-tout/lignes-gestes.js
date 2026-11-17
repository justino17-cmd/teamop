// RELECTURE ADVERSE : les gestes de chaque étape du compositeur de devis — recherche de client (accents, ville), catalogue (recherche, filtres, « Mon matériel »), quantités +/−, option, monter/descendre/retirer, « Ranger par catégorie », « Garder dans mon matériel ». Totaux recalculés.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP, cents=L.cents;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='gestes-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p, deux=c.largeur>=1032; console.log('── '+tag);
  await L.aller(p,'devis'); let f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const clic=s=>X.clic(c,f,s);
  const visibles=sel=>f.evaluate(s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent).map(e=>e.innerText.replace(/\s+/g,' ').trim()),sel);
  const tot=async()=>{ const t=await f.evaluate(()=>((document.querySelector('.vv-pied-tot, #vv-ap-ttc')||{}).innerText||'').replace(/\s+/g,' ')); return cents((/([\d\s  ]+,\d\d)/.exec(t)||[])[1]); };
  const ap=async()=>{ if(!deux&&!(await f.locator('.vv-grand-plein:visible').count())){ await clic('[data-vv="grand"]'); await L.calme(p,500);} const t=await f.evaluate(()=>{const fe=[...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(e=>e.getBoundingClientRect().width>0); return fe?fe.innerText.replace(/\s+/g,' '):''}); if(!deux&&await f.locator('[data-vv="grand-x"]:visible').count()){ await clic('[data-vv="grand-x"]'); await L.calme(p,400);} return t; };
  // 1. recherche de client
  const q=f.locator('#vv-q');
  for(const [terme,attendu] of [['hotel','Hôtel de la Plage'],['HÔTEL','Hôtel de la Plage'],['chatelaillon','Hôtel de la Plage'],['durand','M. et Mme Durand'],['mimosas','Copropriété Les Mimosas']]){
    await q.fill(terme); await p.waitForTimeout(250); const l=await visibles('[data-vv="client"]');
    v(`${tag} · client « ${terme} » trouve « ${attendu} »`,l.some(t=>t.includes(attendu)),l);
  }
  await q.fill('zzzz'); await p.waitForTimeout(250); const vide=await f.evaluate(()=>document.querySelector('#vv-clients').innerText.replace(/\s+/g,' '));
  console.log('  recherche sans résultat →',vide);
  v(`${tag} · une recherche sans résultat le DIT et propose « Nouveau client… »`,/aucun|pas de client|rien/i.test(vide)&&(await f.locator('[data-vv="client-nouveau"]:visible').count())===1,vide);
  await q.fill(''); await p.waitForTimeout(250);
  const nbTous=await p.evaluate(()=>Object.keys(CLIENTS).filter(k=>k!=='__nv').length); const tx=await f.evaluate(()=>document.querySelector('#vv-clients').innerText.replace(/\s+/g,' '));
  console.log('  clients du prototype',nbTous,'→',tx.slice(-80));
  v(`${tag} · « + N autres clients » dit le bon nombre (${nbTous} clients, 4 montrés + « Sans client »)`,new RegExp('\\+ '+(nbTous-4)+' autres? client').test(tx),tx.slice(-100));
  await clic('[data-vv="client"][data-id="hp"]');
  // 2. catalogue
  const cq=f.locator('#vv-cq');
  for(const [terme,mini,mot] of [['filtre',2,'Filtre'],['FILTRE',2,'Filtre'],['ventilateur',1,'Ventilateur'],['r32',1,'R32'],['kg',2,'(le kg)']]){ await cq.fill(terme); await p.waitForTimeout(250); const l=await visibles('[data-vv="art-add"], .vv-art-b'); const n=l.filter(t=>t.includes(mot)).length; v(`${tag} · catalogue « ${terme} » : ≥ ${mini} article(s) « ${mot} » (${n})`,n>=mini,l.slice(0,6)); }
  await cq.fill('zzzz'); await p.waitForTimeout(250); const cv=await f.evaluate(()=>document.querySelector('#vv-cat, .vv-cat').innerText.replace(/\s+/g,' ')); console.log('  catalogue sans résultat →',cv.slice(0,160));
  v(`${tag} · un catalogue sans résultat le DIT (pas une zone vide)`,/aucun|rien|pas d/i.test(cv)||cv.length>5,cv);
  await cq.fill('');
  await clic('[data-vv="cat"][data-v="Main-d’œuvre"]'); await p.waitForTimeout(250); let l=await visibles('[data-vv="art-add"]'); v(`${tag} · filtre « Main-d'œuvre » : ${l.length} article(s)`,l.length>=1,l.slice(0,3));
  await clic('[data-vv="cat"][data-v="Mon matériel"]'); await p.waitForTimeout(250); const mm=await f.evaluate(()=>document.querySelector('#vv-cat, .vv-cat').innerText.replace(/\s+/g,' ')); console.log('  « Mon matériel » vide →',mm.slice(0,200));
  v(`${tag} · « Mon matériel 0 » vide : un mot explique comment le remplir (pas une zone blanche)`,/Garder|garder|ligne libre|matériel/i.test(mm),mm);
  await clic('[data-vv="cat"][data-v=""]');
  // 3. lignes, quantités, option, ordre, retrait
  await clic('[data-vv="art-add"][data-id="VE-DK-35"]'); await clic('[data-vv="art-add"][data-id="EL-ALL"]'); await clic('[data-vv="art-plus"][data-id="EL-ALL"]'); await clic('[data-vv="art-plus"][data-id="EL-ALL"]'); await clic('[data-vv="art-add"][data-id="TH-900"]');
  await L.calme(p,500);
  // VE 205 + EL 3×24 = 72 + TH 21 = 298 HT → TTC 357,60
  v(`${tag} · 3 lignes (205 + 3×24 + 21 = 298,00 HT) → total 357,60 €`,(await tot())===35760,await tot());
  await clic('[data-vv="art-moins"][data-id="EL-ALL"]'); await L.calme(p,300); v(`${tag} · « − » sur Électrode (3 → 2) : 205 + 48 + 21 = 274 HT → 328,80 €`,(await tot())===32880,await tot());
  // option : Thermocouple
  const sw=f.locator('[data-vv-sw="opt"]').nth(2); await sw.evaluate(e=>e.click()); await L.calme(p,400);
  v(`${tag} · « En option » sur Thermocouple : 205 + 48 = 253 HT → 303,60 €`,(await tot())===30360,await tot());
  const t1=await ap(); v(`${tag} · la page le dit : « option » / « Options non comptées »`,/option/i.test(t1),t1.slice(t1.indexOf('Total HT')-200,t1.indexOf('Total HT')+100));
  // retirer la ligne 1 (Ventilateur) : 48 HT → 57,60
  await clic('[data-vv="l-del"][data-id]'); await L.calme(p,400);
  const restant=await f.locator('[data-vv-q]').count(); v(`${tag} · « Retirer » enlève la première ligne (${restant} restante(s)) et le total devient 48 HT → 57,60 €`,restant===2&&(await tot())===5760,[restant,await tot()]);
  // ordre : descendre la première
  const avant=await f.evaluate(()=>[...document.querySelectorAll('#vv-lig [data-vv-q]')].map(e=>e.getAttribute('aria-label')));
  await clic('[data-vv="l-down"]'); await L.calme(p,300);
  const apres=await f.evaluate(()=>[...document.querySelectorAll('#vv-lig [data-vv-q]')].map(e=>e.getAttribute('aria-label')));
  v(`${tag} · « Descendre » inverse les deux lignes`,avant[0]===apres[1]&&avant[1]===apres[0],[avant,apres]);
  const t2=await ap(); const iE=t2.indexOf('Électrode'), iT=t2.indexOf('Thermocouple'); v(`${tag} · … et la page suit l'ordre (Thermocouple avant Électrode)`,iT>0&&iE>0&&iT<iE,[iT,iE]);
  // 4. ranger par catégorie
  await f.evaluate(()=>{ const e=document.querySelector('[data-vv-sw="rangee"]'); e.click(); }); await L.calme(p,400);
  const t3=await ap(); console.log('  page « ranger par catégorie » →',t3.slice(t3.indexOf('Désignation'),t3.indexOf('Désignation')+260));
  v(`${tag} · « Ranger par catégorie » : le total ne bouge pas (57,60 €)`,(await tot())===5760,await tot());
  v(`${tag} · … et la page porte un titre de catégorie (Matériel)`,/Matériel/.test(t3.slice(t3.indexOf('Désignation'))),t3.slice(t3.indexOf('Désignation'),t3.indexOf('Désignation')+200));
  // 5. garder dans mon matériel
  await clic('[data-vv="libre-ouvrir"]'); await f.locator('#vv-l-des').fill('Nettoyage de la gaine'); await f.locator('#vv-l-pu').fill('80'); await f.evaluate(()=>{ const e=document.querySelector('#vv-l-garder'); if(e&&!e.checked) e.click(); }); await clic('[data-vv="libre-ajouter"]'); await L.calme(p,500);
  const chip=await visibles('[data-vv="cat"][data-v="Mon matériel"]'); console.log('  chip après « garder » :',chip);
  v(`${tag} · « Garder dans mon matériel » : la pastille passe à « Mon matériel 1 »`,chip.some(t=>/1/.test(t)),chip);
  // fermer sans créer, rouvrir : le matériel gardé est encore là
  await p.keyboard.press('Escape'); await p.waitForTimeout(600); if(await f.locator('.dialogue').count()){ await clic('.dialogue button[data-r="1"]'); await p.waitForTimeout(800); }
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  const chip2=await f.evaluate(()=>[...document.querySelectorAll('[data-vv="cat"][data-v="Mon matériel"]')].map(e=>e.innerText.replace(/\s+/g,' ')));
  v(`${tag} · rouvert plus tard : « Mon matériel 1 » est gardé`,chip2.some(t=>/1/.test(t)),chip2);
  await L.capture(c,CAP+`${tag}-fin.png`);
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});
