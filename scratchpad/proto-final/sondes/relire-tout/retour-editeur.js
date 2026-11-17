// RELECTURE ADVERSE : le Retour du navigateur (ou du téléphone) PENDANT qu'on est dans l'éditeur d'un document composé, ou devant la confirmation, ou deux fois de suite ; l'historique reste cohérent.
const X=require('./lib2.js'), {A,L}=X, v=L.v, CAP=X.CAP;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='retred-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p; console.log('── '+tag);
  const atelierOuvert=()=>p.evaluate(()=>{const z=document.getElementById('opdz'); return !!z&&!z.hidden;});
  await L.aller(p,'clients'); await L.aller(p,'devis'); const h0=await p.evaluate(()=>history.length);
  let f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await A.composerDevis(c,f,{client:'vp',objet:'Retour dans l’éditeur',articles:[{ref:'EL-ALL',qte:2}]}); await p.waitForTimeout(600);
  const num=await f.evaluate(()=>D().meta.numero);
  // une retouche dans l'éditeur (la quantité devient 5), puis Retour du navigateur
  const qte=f.locator('#vue-editeur .feuille tr:has-text("Électrode") div.ed.une').first();
  if(c.doigt){ await qte.tap(); await p.waitForTimeout(600); await f.getByLabel('Quantité').fill('5'); await X.clic(c,f,'.fenetre:has-text("Ligne de prix") button:has-text("Enregistrer")'); }
  else { await qte.click(); await p.keyboard.press('Control+A'); await p.keyboard.type('5'); await p.keyboard.press('Tab'); }
  await p.waitForTimeout(700);
  await p.goBack().catch(()=>{}); await p.waitForTimeout(1200);
  v(`${tag} · Retour du navigateur dans l'éditeur : l'atelier se ferme, l'écran dessous reste (#devis)`,!(await atelierOuvert())&&(await p.evaluate(()=>location.hash))==='#devis',await L.etat(p));
  await L.calme(p,500);
  const lg=await p.evaluate(()=>[...document.querySelectorAll('#contenu .opd-l')].map(e=>e.innerText.replace(/\s+/g,' ')));
  v(`${tag} · le devis créé est dans la liste (${num})`,lg.some(r=>r.includes(num)),lg);
  v(`${tag} · … avec la retouche faite juste avant le Retour (5 × 24 € HT = 144,00 € TTC)`,lg.some(r=>r.includes(num)&&/144,00/.test(r)),lg.filter(r=>r.includes(num)));
  // un second Retour quitte la page Devis (pas d'entrée fantôme)
  await p.goBack().catch(()=>{}); await p.waitForTimeout(800); const h=await p.evaluate(()=>location.hash);
  v(`${tag} · un second Retour va à la page d'avant (« ${h} »), pas sur une entrée fantôme de l'atelier`,h==='#clients',h);
  // Retour devant la confirmation d'abandon
  await L.aller(p,'devis'); f=await A.ouvrirAtelier(c,'devis',null); await L.calme(p,900);
  await f.locator('#vv-objet').fill('Brouillon à ne pas perdre'); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const dial=await f.evaluate(()=>!!document.querySelector('.dialogue'));
  await p.goBack().catch(()=>{}); await p.waitForTimeout(1000);
  const etat=await f.evaluate(()=>({d:!!document.querySelector('.dialogue')})).catch(()=>({d:'cadre caché'}));
  console.log('  Retour pendant la confirmation : dialogue avant',dial,'· atelier ouvert après',await atelierOuvert(),'· dialogue',JSON.stringify(etat));
  v(`${tag} · Retour pendant la confirmation : l'atelier se ferme proprement (pas de confirmation orpheline au prochain passage)`,!(await atelierOuvert()));
  f=await A.ouvrirAtelier(c,'devis','devis'); await L.calme(p,900);
  const orphelin=await f.evaluate(()=>!!document.querySelector('.dialogue'));
  v(`${tag} · réouvert : aucune confirmation orpheline ne couvre le compositeur`,!orphelin);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); if(await f.locator('.dialogue').count()){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(800); }
  v(`${tag} · aucune erreur JavaScript`,c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,700));process.exit(2);});
