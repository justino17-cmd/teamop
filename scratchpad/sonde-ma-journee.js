/* ══ « MA JOURNÉE » — L'ÉCRAN DU TECHNICIEN, AU TÉLÉPHONE, AVEC DES NOMS LONGS ══════════════════
   Tous les audits d'écrans tournent en ADMINISTRATEUR : l'écran qu'un technicien ouvre chaque matin
   (Interventions → « Ma journée », `renderIntTechDay` / `intTechCard`) n'y paraît jamais. C'est
   pourtant l'écran le plus ouvert au téléphone. On se connecte donc comme un technicien, on lui
   donne une journée réaliste (en retard, aujourd'hui dont une en cours, demain, cette semaine,
   plus tard, terminées), on ouvre toutes les sections, et on demande à la PAGE si elle tient.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-ma-journee.js [profil]   (SOURCE=<beta d'avant> pour la contre-épreuve) */
const path=require('path'), fs=require('fs');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil, DONNEES_LONGUES } = require(path.join(__dirname,'profils.js'));
(async()=>{
  let ko=0;
  for (const nom of (process.argv[2]?[process.argv[2]]:['petitand','tel','ipad','bureau'])) {
    const P=profil(nom); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    await S.ev(DONNEES_LONGUES);
    const n=await S.ev(`const t=db.techniciens[0]; const J=d=>shiftDay(todayISO(),d);
      const plan=[[-1,'planifiee'],[0,'encours'],[0,'planifiee'],[0,'planifiee'],[1,'planifiee'],[3,'planifiee'],[12,'planifiee'],[-2,'terminee'],[-3,'terminee']];
      db.interventions.slice(0,plan.length).forEach((i,k)=>{ i.techId=t.id; i.techIds=[t.id]; i.date=J(plan[k][0]); i.heure=String(8+k).padStart(2,'0')+':30'; i.statut=plan[k][1]; if(plan[k][1]==='encours') i.debutReel=Date.now()-3600000; });
      const u={id:'u-tech',prenom:'Jean-Christophe',nom:'Delacroix-Montgolfier',role:'technicien',techId:t.id,username:'jc',pass:'x',actif:true,pref:{}};
      db.users.push(u); save(); try{ localStorage.setItem('elanB_onboarded_'+u.id,'1'); }catch(e){}
      currentUser=u; window._intViewInit=0; enterApp(u); return db.interventions.filter(i=>(i.techIds||[]).includes(t.id)).length;`);
    await dormir(1500);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); go('interventions'); window.scrollTo(0,0); return 1;`); await dormir(1800);
    /* le rappel du matin (une fois par jour et par personne) : son message ne doit ni tomber à un mot
       par ligne ni passer sous ses boutons, et la boîte doit tenir dans l'écran */
    const ban=await S.ev(`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=document.getElementById('fdr-banner'); if(!b) return null;
      const bb=b.getBoundingClientRect(), sp=b.querySelector('span'), sb=sp.getBoundingClientRect(); const bt=[...b.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
      const touche=bt.some(x=>Math.min(x.right,sb.right)-Math.max(x.left,sb.left)>1&&Math.min(x.bottom,sb.bottom)-Math.max(x.top,sb.top)>1);
      /* et il ne se pose sur rien de ce qui flotte déjà en bas : la bulle d'aide, la barre d'onglets */
      const flottants=[...document.querySelectorAll('#assistant > .fab, #tabbar')].filter(x=>{ const q=getComputedStyle(x); return q.display!=='none'&&q.visibility!=='hidden'; }).map(x=>x.getBoundingClientRect());
      const pose=flottants.some(x=>Math.min(x.right,bb.right)-Math.max(x.left,bb.left)>1&&Math.min(x.bottom,bb.bottom)-Math.max(x.top,bb.top)>1);
      return {gauche:Math.round(bb.left), droite:Math.round(bb.right), texte:Math.round(sb.width), deborde:sp.scrollWidth>sp.clientWidth+1, touche, pose, flottants:flottants.length};`);
    if(process.env.CAPTURE_RAPPEL){ await S.ev(`try{ closeAsst(); }catch(e){} return 1;`); await dormir(500); const png=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('/tmp/sonde-ma-journee-rappel-'+nom+'.png',Buffer.from(png.data,'base64')); }
    await S.ev(`const b=document.getElementById('fdr-banner'); if(b) b.remove(); try{ closeAsst(); }catch(e){} return 1;`); await dormir(400);
    const r=await S.ev(`document.querySelectorAll('#content details').forEach(d=>d.open=true);
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; await new Promise(r=>setTimeout(r,700));
      const cards=[...document.querySelectorAll('#content .card[onclick^="detailIntervention"]')];
      const o={vue:(document.querySelector('.topbar h1,#pg-title')||{}).textContent||'', cartes:cards.length, depasse:0, texteMin:9999, titreMax:0, page:document.documentElement.scrollWidth, exemple:null};
      cards.forEach(c=>{ const cb=c.getBoundingClientRect(); const ligne=c.firstElementChild; if(!ligne) return;
        [...ligne.children].forEach(x=>{ const b=x.getBoundingClientRect(); if(b.right>cb.right+0.5) o.depasse++; });
        const txt=ligne.children[1]; if(txt){ const w=Math.round(txt.getBoundingClientRect().width); o.texteMin=Math.min(o.texteMin,w);
          const t=txt.firstElementChild; const lh=parseFloat(getComputedStyle(t).lineHeight)||18; o.titreMax=Math.max(o.titreMax,Math.round(t.getBoundingClientRect().height/lh)); }
        if(!o.exemple) o.exemple=[...ligne.children].map(x=>{ const b=x.getBoundingClientRect(); return Math.round(b.left-cb.left)+'→'+Math.round(b.right-cb.left); }).join(' | ')+' (carte '+Math.round(cb.width)+')'; });
      window.scrollTo(9999,window.scrollY); await new Promise(r=>setTimeout(r,60)); o.glisse=window.scrollX; window.scrollTo(0,window.scrollY); return o;`);
    const fautes=[];
    if(r.cartes<6) fautes.push('population : '+r.cartes+' cartes ('+n+' interventions posées)');
    if(r.page>P.w||r.glisse>0) fautes.push('la page glisse ('+r.page+' px pour '+P.w+')');
    if(r.depasse) fautes.push(r.depasse+' morceau(x) hors de leur carte');
    if(r.texteMin<180) fautes.push('colonne de texte à '+r.texteMin+' px');
    if(!ban) fautes.push('population : le rappel du matin n’a pas paru');
    else { if(ban.gauche<0||ban.droite>P.w) fautes.push('rappel hors de l’écran ('+ban.gauche+'→'+ban.droite+')');
      if(ban.texte<200) fautes.push('rappel : message sur '+ban.texte+' px'); if(ban.deborde) fautes.push('rappel : un mot déborde'); if(ban.touche) fautes.push('rappel : le message passe sous un bouton'); if(ban.pose) fautes.push('rappel posé sur la bulle d’aide ou la barre d’onglets'); }
    console.log((fautes.length?'✗ ':'✓ ')+nom.padEnd(9)+String(P.w).padStart(5)+' px · '+r.cartes+' cartes · texte ≥ '+r.texteMin+' px · titre ≤ '+r.titreMax+' lignes · '+r.exemple+(ban?' · rappel '+ban.texte+' px':'')+(fautes.length?'  → '+fautes.join(' · '):''));
    if(fautes.length) ko++;
    if(process.env.CAPTURE){ const png=await S.c.envoyer('Page.captureScreenshot',{format:'png'}); fs.writeFileSync('/tmp/sonde-ma-journee-'+nom+'.png',Buffer.from(png.data,'base64')); }
    S.fermer();
  }
  console.log(ko?'\n  '+ko+' ✗':'\n  tout tient'); process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
