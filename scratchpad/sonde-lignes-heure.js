/* ══ LES LIGNES « HEURE · TEXTE · STATUT » (Planning, Carte des interventions), NOMS LONGS ══════════
   Trouvées par le critère « texte écrasé » de l'audit (23 septembre 2026, en technicien, valeurs
   longues) : les cartes du Planning (`planIntCard`) laissaient 101 px au titre, la tournée de la
   Carte des interventions (`renderTournee`) 86 px à l'adresse. Cette sonde ouvre chaque vue qui les
   affiche, relit le même critère que l'audit (sous ~12 signes par ligne ET 4 lignes ou plus), et
   demande à la page si elle tient.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-lignes-heure.js   (SOURCE=<beta d'avant> pour la contre-épreuve) */
const path=require('path');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil, DONNEES_LONGUES } = require(path.join(__dirname,'profils.js'));
const MESURE=`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; await new Promise(r=>setTimeout(r,500));
  const rows=[...document.querySelectorAll('#content .pl-row')].filter(r=>r.querySelector(':scope > .pl-info') && r.querySelector(':scope > .st'));
  let ecrases=0, texteMin=9999, depasse=0;
  rows.forEach(row=>{ const rb=row.getBoundingClientRect(); const info=row.querySelector(':scope > .pl-info'); texteMin=Math.min(texteMin,Math.round(info.getBoundingClientRect().width));
    [...row.children].forEach(k=>{ const b=k.getBoundingClientRect(); if(b.right>rb.right+0.5) depasse++; });
    row.querySelectorAll('.pl-info *').forEach(e=>{ let t=''; for(const n of e.childNodes) if(n.nodeType===3) t+=n.nodeValue; if(t.trim().length<25) return;
      const cs=getComputedStyle(e); if(cs.display==='inline') return; const fz=parseFloat(cs.fontSize)||14, lh=parseFloat(cs.lineHeight)||fz*1.3;
      const w=e.clientWidth, lignes=Math.round(e.getBoundingClientRect().height/lh); if(w/(0.55*fz)<12 && lignes>=4) ecrases++; }); });
  window.scrollTo(9999,window.scrollY); await new Promise(r=>setTimeout(r,60)); const glisse=window.scrollX; window.scrollTo(0,window.scrollY);
  return {lignes:rows.length, ecrases, texteMin:rows.length?texteMin:null, depasse, page:document.documentElement.scrollWidth, glisse};`;
(async()=>{
  let ko=0; const tot={lignes:0};
  for (const nom of ['petitand','tel','ipad','bureau']) {
    const P=profil(nom); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    await S.ev(DONNEES_LONGUES);
    /* une journée pleine aujourd'hui : c'est elle que montrent les trois vues et la tournée */
    await S.ev(`db.interventions.slice(0,6).forEach((i,k)=>{ i.date=todayISO(); i.heure=String(8+k).padStart(2,'0')+':30'; i.statut=k%2?'planifiee':'encours'; }); save(); window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); return 1;`);
    const res=[];
    for (const mode of ['semaine','jour','mois']) {
      await S.ev(`planSel=todayISO(); planWeekRef=todayISO(); planMode='${mode}'; go('planning'); window.scrollTo(0,0); return 1;`); await dormir(1800);
      res.push(['planning/'+mode, await S.ev(MESURE)]);
    }
    await S.ev(`go('carteInt'); window.scrollTo(0,0); return 1;`); await dormir(3000);
    res.push(['carteInt', await S.ev(MESURE)]);
    const fautes=[]; let n=0;
    res.forEach(([v,r])=>{ n+=r.lignes; if(r.ecrases) fautes.push(v+' : '+r.ecrases+' texte(s) écrasé(s), texte à '+r.texteMin+' px'); if(r.depasse) fautes.push(v+' : '+r.depasse+' morceau(x) hors de leur ligne'); if(r.page>P.w||r.glisse>0) fautes.push(v+' : la page glisse'); });
    tot.lignes+=n;
    console.log((fautes.length?'✗ ':'✓ ')+nom.padEnd(9)+String(P.w).padStart(5)+' px · '+res.map(([v,r])=>v+' '+r.lignes+'L/'+(r.texteMin===null?'—':r.texteMin+'px')).join(' · ')+(fautes.length?'  → '+fautes.join(' · '):''));
    if(fautes.length) ko++;
    S.fermer();
  }
  if(tot.lignes<20){ console.log('\n  ✗ population trop maigre : '+tot.lignes+' lignes en tout'); process.exit(4); }
  console.log(ko?'\n  '+ko+' ✗':'\n  toutes tiennent ('+tot.lignes+' lignes mesurées)'); process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
