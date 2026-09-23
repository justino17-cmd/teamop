/* ══ LA LISTE DES INTERVENTIONS, AVEC DES NOMS LONGS ═════════════════════════════════════════════
   La démonstration a des titres courts : douze audits d'appareils sont passés sur cette liste sans
   rien voir. Avec des valeurs réalistes (DONNEES_LONGUES : raisons sociales d'hôpitaux, noms
   composés) et des interventions PLANIFIÉES dans le futur (c'est ce qui fait paraître le compte à
   rebours, la colonne qui manquait), la colonne de texte tombait à 0 px à 360 et 390 px (titre sur
   treize lignes, page à 415 px) et à 87 px sur iPad portrait, menu latéral ouvert.
   On demande à la PAGE si elle tient, et à chaque ligne si ses morceaux restent chez elle.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-int-liste.js   (SOURCE=<beta d'avant> pour la contre-épreuve)   */
const path=require('path'), fs=require('fs');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil, DONNEES_LONGUES } = require(path.join(__dirname,'profils.js'));
(async()=>{
  let ko=0;
  for (const nom of (process.argv[2]?[process.argv[2]]:['petitand','tel','ipad','ipadh','bureau'])) {
    const P=profil(nom); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    const k=await S.ev(DONNEES_LONGUES);
    await S.ev(`const iso=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      /* les quatre formes de ligne : à venir (compte à rebours), en cours, terminée (« Rapport »), annulée (motif) */
      db.interventions.forEach((i,n)=>{ const f=n%4; i.date=iso; i.heure='14:30';
        i.statut=['planifiee','encours','terminee','annulee'][f]; if(f===3) i.motifAnnulation='Accès impossible : le gardien de la résidence était absent et le code a changé'; });
      save(); return 1;`);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); go('interventions'); window.scrollTo(0,0); return 1;`); await dormir(1800);
    await S.ev(`intView='liste'; views.interventions(); return 1;`); await dormir(1800);
    const r=await S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; await new Promise(r=>setTimeout(r,700));
      const rows=[...document.querySelectorAll('#content .pl-row[ondragstart]')]; const liste=rows[0]?rows[0].parentElement.parentElement:null;
      const o={liste:rows[0]?Math.round(rows[0].getBoundingClientRect().width):0, lignes:rows.length, decompte:0, deuxEtages:0, depasse:0, chevauche:0, texteMin:9999, titreMax:0, page:document.documentElement.scrollWidth};
      rows.forEach(row=>{ const rb=row.getBoundingClientRect(), kids=[...row.children];
        if(kids.some(x=>!x.classList.contains('pl-info')&&/\\d\\d:\\d\\d – \\d\\d:\\d\\d/.test(x.textContent))) o.decompte++;
        if(getComputedStyle(row).flexWrap==='wrap') o.deuxEtages++;
        kids.forEach(x=>{ const b=x.getBoundingClientRect(); if(b.right>rb.right+0.5||b.left<rb.left-0.5) o.depasse++; });
        for(let a=0;a<kids.length;a++) for(let b=a+1;b<kids.length;b++){ const x=kids[a].getBoundingClientRect(), y=kids[b].getBoundingClientRect();
          if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1 && Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1) o.chevauche++; }
        const info=row.querySelector('.pl-info'), t=row.querySelector('.pl-title');
        if(info) o.texteMin=Math.min(o.texteMin,Math.round(info.getBoundingClientRect().width));
        if(t){ const lh=parseFloat(getComputedStyle(t).lineHeight)||18; o.titreMax=Math.max(o.titreMax,Math.round(t.getBoundingClientRect().height/lh)); } });
      window.scrollTo(9999,window.scrollY); await new Promise(r=>setTimeout(r,60)); o.glisse=window.scrollX; window.scrollTo(0,window.scrollY);
      return o;`);
    const etroite=r.liste<=640;
    const fautes=[];
    if(r.lignes<6) fautes.push('population : '+r.lignes+' lignes');
    if(r.decompte<2||r.decompte>r.lignes-2) fautes.push('population : '+r.decompte+' compte(s) à rebours sur '+r.lignes+' lignes (il en faut avec ET sans)');
    if(r.page>P.w||r.glisse>0) fautes.push('la page glisse ('+r.page+' px pour '+P.w+')');
    if(r.depasse) fautes.push(r.depasse+' morceau(x) hors de leur ligne');
    if(r.chevauche) fautes.push(r.chevauche+' chevauchement(s)');
    if(r.texteMin<200) fautes.push('colonne de texte à '+r.texteMin+' px');
    if(etroite && r.deuxEtages!==r.lignes) fautes.push('liste de '+r.liste+' px : '+r.deuxEtages+'/'+r.lignes+' lignes sur deux étages');
    if(!etroite && r.deuxEtages) fautes.push('liste de '+r.liste+' px : '+r.deuxEtages+' lignes repliées sans raison');
    console.log((fautes.length?'✗ ':'✓ ')+nom.padEnd(9)+String(P.w).padStart(5)+' px · liste '+r.liste+' · texte ≥ '+r.texteMin+' px · titre ≤ '+r.titreMax+' lignes · '+r.decompte+' comptes à rebours sur '+r.lignes+' lignes'+(fautes.length?'  → '+fautes.join(' · '):''));
    if(fautes.length) ko++;
    if(process.env.CAPTURE){ await S.ev(`const r=document.querySelectorAll('#content .pl-row[ondragstart]'); const x=r[+(${JSON.stringify(process.env.CAPTURE_LIGNE||'1')})]; if(x) x.scrollIntoView({block:'start'}); window.scrollBy(0,-90); return 1;`); await dormir(500);
      const png=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('/tmp/sonde-int-liste-'+nom+'.png',Buffer.from(png.data,'base64')); }
    S.fermer();
  }
  console.log(ko?'\n  '+ko+' ✗':'\n  toutes tiennent'); process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
