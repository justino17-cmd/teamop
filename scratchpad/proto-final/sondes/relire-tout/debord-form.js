// RELECTURE ADVERSE : dans la colonne des étapes (qui défile et coupe), aucun bouton, champ ni texte ne dépasse son bord droit ; avec des valeurs LONGUES (objet, article libre, titre de contrat).
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'petit', nuit=process.env.NUIT==='1', tag='debord-'+pr+(nuit?'-nuit':'-jour');
const sonde=f=>f.evaluate(()=>{ const F=document.querySelector('.vv-form'); if(!F) return {absent:true}; const R=F.getBoundingClientRect(), pad=parseFloat(getComputedStyle(F).paddingRight)||0, coup=[];
  for(const e of F.querySelectorAll('*')){ if(!e.offsetParent&&getComputedStyle(e).position!=='fixed') continue; const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) continue; if(e.closest('.vv-cat,.vv-ap-cadre,.feuille')) continue; if(e.closest('[hidden]')) continue;
    if(r.right>R.right-Math.min(pad,10)+0.5&&r.width<R.width*1.2){ coup.push(e.tagName+'.'+String(e.className).slice(0,30)+' « '+(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,28)+' » droite='+Math.round(r.right)+' bord='+Math.round(R.right)); } }
  return {sw:F.scrollWidth,cw:F.clientWidth,coup:[...new Set(coup)].slice(0,8)}; });
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  // devis, avec des textes longs
  let f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
  await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await f.locator('#vv-objet').fill('Remplacement complet du groupe extérieur et reprise de la liaison frigorifique, avec mise en service, essais et nettoyage du chantier'); 
  for(const r of ['EL-ALL','FC-300','NE-05']) await X.clic(c,f,`[data-vv="art-add"][data-id="${r}"]`);
  await X.clic(c,f,'[data-vv="libre-ouvrir"]'); await f.locator('#vv-l-des').fill('Fourniture et pose d\'une goulotte de protection pour la liaison frigorifique'); await f.locator('#vv-l-qte').fill('12,5'); await f.locator('#vv-l-pu').fill('1234,56'); await X.clic(c,f,'[data-vv="libre-ajouter"]');
  await L.calme(p,600);
  for(const e of ['client','objet','matos','cond','pres']){ await f.evaluate(k=>{ const b=document.querySelector('[data-vv="etape"][data-e="'+k+'"]'); if(b&&b.getAttribute('aria-expanded')==='false') b.click(); },e); await p.waitForTimeout(200); }
  await L.calme(p,500);
  let s=await sonde(f); console.log('  devis',JSON.stringify(s));
  v(tag+' · devis : la colonne des étapes ne défile pas de côté ('+s.sw+' ≤ '+s.cw+')',s.sw<=s.cw+1,s);
  v(tag+' · devis : rien ne dépasse le bord droit de la colonne',s.coup&&s.coup.length===0,s.coup);
  await L.capture(c,CAP+`${tag}-devis-long.png`);
  await f.evaluate(()=>{const F=document.querySelector('.vv-form'); F.scrollTop=F.scrollHeight*0.45;}); await L.calme(p,300); await L.capture(c,CAP+`${tag}-devis-long2.png`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); if(await f.locator('.dialogue').count()){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(800); }
  // contrat
  await L.aller(p,'contrats'); f=await A.ouvrirAtelier(c,'contrat',null); await L.calme(p,900);
  await X.clic(c,f,'[data-vv="client"][data-id="mi"]'); await f.locator('#vv-titre').fill('Entretien annuel de la climatisation et du chauffage de la copropriété Les Mimosas, bâtiments A, B et C');
  await f.locator('#vv-v-adresse').fill('21 boulevard Joffre, résidence Les Mimosas, bâtiment B, 17000 La Rochelle'); await f.locator('#vv-v-prix').fill('12345,67');
  await X.clic(c,f,'[data-vv="tpl"][data-v="pro"]'); await p.waitForTimeout(400);
  await X.clic(c,f,'[data-vv="ecrire-ouvrir"]'); await f.locator('#vv-e-titre').fill('Accès au site pour les interventions de maintenance préventive et curative'); await f.locator('#vv-e-texte').fill('Texte. '.repeat(30)); await X.clic(c,f,'[data-vv="ecrire-ajouter"]');
  await L.calme(p,600);
  for(const e of ['client','infos','arts','pres']){ await f.evaluate(k=>{ const b=document.querySelector('[data-vv="etape"][data-e="'+k+'"]'); if(b&&b.getAttribute('aria-expanded')==='false') b.click(); },e); await p.waitForTimeout(200); }
  await L.calme(p,500); s=await sonde(f); console.log('  contrat',JSON.stringify(s));
  v(tag+' · contrat : la colonne des étapes ne défile pas de côté ('+s.sw+' ≤ '+s.cw+')',s.sw<=s.cw+1,s);
  v(tag+' · contrat : rien ne dépasse le bord droit de la colonne',s.coup&&s.coup.length===0,s.coup);
  await f.evaluate(()=>{const F=document.querySelector('.vv-form'); F.scrollTop=F.scrollHeight*0.8;}); await L.calme(p,300); await L.capture(c,CAP+`${tag}-contrat-long.png`);
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
