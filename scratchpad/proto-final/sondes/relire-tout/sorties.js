// RELECTURE ADVERSE : toutes les sorties du compositeur (Échap, croix « ‹ OP GESTION », Retour du navigateur, Continuer/Abandonner), devis ET contrat.
const X=require('./lib2.js'), {A,L}=X, CAP=X.CAP, v=L.v;
const pr=process.env.PROFIL||'mac', nuit=process.env.NUIT==='1', tag='sorties-'+pr+(nuit?'-nuit':'-jour');
(async()=>{
  const c=await L.ouvrir({profil:pr,nuit,qui:'marc'}); const p=c.p;
  console.log('── '+tag);
  const nbDocs=()=>p.evaluate(()=>(typeof ATD!=='undefined'?ATD.docs.length:-1));
  const atelierOuvert=()=>p.evaluate(()=>{const z=document.getElementById('opdz'); return !!z&&!z.hidden&&getComputedStyle(z).visibility!=='hidden';});
  const conf=async f=>f.evaluate(()=>{const e=[...document.querySelectorAll('.dialogue')].map(x=>x.innerText.replace(/\s+/g,' ')); return e.join(' | ');});
  for(const type of ['devis','contrat']){
    const page=type==='devis'?'devis':'contrats', objet=type==='devis'?'#vv-objet':'#vv-titre';
    await L.aller(p,page); const h0=await p.evaluate(()=>history.length), n0=await nbDocs();
    // ── A. Échap avec du contenu : confirmation, Continuer, puis Échap + Abandonner
    let f=await A.ouvrirAtelier(c,type,null); v(`${tag} ${type} · s'ouvre`,!!f); if(!f) continue; await L.calme(p,900);
    v(`${tag} ${type} · UNE entrée d'historique poussée à l'ouverture (${h0} → ${await p.evaluate(()=>history.length)})`,(await p.evaluate(()=>history.length))===h0+1);
    v(`${tag} ${type} · le focus est dans l'atelier (Échap marche)`,(await L.etat(p)).focus==='IFRAME#' || /IFRAME/.test((await L.etat(p)).focus||''),(await L.etat(p)).focus);
    // Échap SANS contenu : ferme tout de suite
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    v(`${tag} ${type} · Échap sans rien avoir écrit : l'atelier se ferme sans confirmation`,!(await atelierOuvert()),await L.etat(p));
    v(`${tag} ${type} · l'entrée d'historique est consommée (${h0})`,(await p.evaluate(()=>history.length))>=h0 && (await p.evaluate(()=>location.hash))==='#'+page,await p.evaluate(()=>location.hash));
    // avec contenu
    f=await A.ouvrirAtelier(c,type,null); await L.calme(p,900);
    await f.locator(objet).fill('Contenu à ne pas perdre'); await p.waitForTimeout(300);
    await f.locator(objet).blur?0:0; await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    let t=await conf(f); v(`${tag} ${type} · Échap avec du contenu : la confirmation « Abandonner ce ${type} ? » paraît`,/Abandonner/.test(t)&&await atelierOuvert(),t.slice(0,160));
    await L.capture(c,CAP+`${tag}-${type}-confirmation.png`);
    // Échap sur la confirmation = Continuer ?
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    t=await conf(f); v(`${tag} ${type} · Échap sur la confirmation la ferme et garde le compositeur`,!/Abandonner/.test(t)&&await atelierOuvert()&&(await f.locator(objet).inputValue())==='Contenu à ne pas perdre',t.slice(0,120));
    // croix
    await X.clic(c,f,'.vv-retour'); await p.waitForTimeout(500); t=await conf(f);
    v(`${tag} ${type} · la croix « ‹ OP GESTION » avec contenu : confirmation`,/Abandonner/.test(t),t.slice(0,120));
    // Continuer
    await X.clic(c,f,'.dialogue button[data-r="0"]').catch(()=>{}); await p.waitForTimeout(500);
    v(`${tag} ${type} · « Continuer » garde tout`,await atelierOuvert()&&(await f.locator(objet).inputValue())==='Contenu à ne pas perdre');
    // Abandonner
    await X.clic(c,f,'.vv-retour'); await p.waitForTimeout(400); await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(900);
    v(`${tag} ${type} · « Abandonner » ferme l'atelier`,!(await atelierOuvert()),await L.etat(p));
    v(`${tag} ${type} · rien n'a été créé (${n0} document(s))`,(await nbDocs())===n0);
    f=await A.ouvrirAtelier(c,type,null); await L.calme(p,900);
    v(`${tag} ${type} · rouvert après « Abandonner » : vide (pas de reprise)`,(await f.locator(objet).inputValue())==='',await f.locator(objet).inputValue());
    // ── C. Retour du navigateur avec du contenu
    await f.locator(objet).fill('Saisie avant Retour'); await p.waitForTimeout(300);
    const hb=await p.evaluate(()=>history.length);
    await p.goBack().catch(()=>{}); await p.waitForTimeout(900);
    v(`${tag} ${type} · Retour du navigateur : l'atelier se ferme et l'écran dessous reste (${await p.evaluate(()=>location.hash)})`,!(await atelierOuvert())&&(await p.evaluate(()=>location.hash))==='#'+page,await L.etat(p));
    f=await A.ouvrirAtelier(c,type,null); await L.calme(p,900);
    const val=await f.locator(objet).inputValue(); const toast=await f.evaluate(()=>(document.querySelector('.toast')||{}).innerText||'');
    console.log(`  · ${type} : après Retour puis réouverture, le champ vaut « ${val} », toast « ${toast.replace(/\s+/g,' ')} »`);
    v(`${tag} ${type} · après Retour, la saisie est soit reprise AVEC le dire, soit perdue — pas reprise en silence`,val===''||/repris/i.test(toast),[val,toast]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    if(await f.locator('.dialogue').count()){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(800); }
    else if(await atelierOuvert()){ await X.clic(c,f,'.vv-retour'); await p.waitForTimeout(500); if(await f.locator('.dialogue').count()){ await X.clic(c,f,'.dialogue button[data-r="1"]'); await p.waitForTimeout(800); } }
    v(`${tag} ${type} · tout est refermé`,!(await atelierOuvert()));
    await L.aller(p,'accueil');
  }
  v(tag+' · aucune erreur JavaScript',c.err.length===0,c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan()?1:0);
})().catch(e=>{console.log('ERREUR SONDE',e.message.slice(0,500));process.exit(2);});
