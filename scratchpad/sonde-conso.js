/* ══ L'ANALYSE DE CONSOMMATION, AVEC DES CONSOMMATIONS ═════════════════════════════════════════
   La démonstration n'a AUCUNE consommation : l'écran « Consommation produits » s'y affiche vide,
   et douze audits d'appareils sont passés dessus sans rien voir. On pose donc des sorties de stock
   (3 produits, 2 personnes — dont un nom long), on ouvre le détail d'un produit ET celui d'une
   personne, et on demande à la PAGE si elle tient. Mesuré le 23 septembre 2026 : page à 529 px sur
   un Android de 360 avant correction (libellés et valeurs en largeur fixe, écrits en ligne).
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-conso.js   (SOURCE=<beta d'avant> pour la contre-épreuve)      */
const path=require('path'), fs=require('fs');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil } = require(path.join(__dirname,'profils.js'));
(async()=>{
  let ko=0;
  for (const nom of ['petitand','tel','ipad','bureau']) {
    const P=profil(nom); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
    const pid=await S.ev(`const ps=(db.produits||[]).slice(0,3); if(!ps.length) return null; const t=Date.now()-86400000; db.mouvements=db.mouvements||[];
      ps.forEach((x,i)=>{ [['Jean-Christophe Delacroix-Montgolfier',12+i*7],['Sophie Martin',5+i*3]].forEach(([qui,q])=>db.mouvements.push({id:uid(),type:'sortie',ts:t-i*3600000,produitId:x.id,qte:q,technicien:qui})); });
      save(); return ps[0].id;`);
    await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); consoOnglet='analyse'; go('saisieConso'); window.scrollTo(0,0); return 1;`); await dormir(2200);
    await S.ev(`try{ consoToggleProd('${pid}'); }catch(e){} return 1;`); await dormir(900);
    await S.ev(`try{ consoTogglePers(0); }catch(e){} return 1;`); await dormir(900);
    const lire=`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth; const W=${P.w};
      const rouleau=e=>{ for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){ const q=getComputedStyle(n); if(/auto|scroll|hidden|clip/.test(q.overflowX)&&n.getBoundingClientRect().right<=W+0.5) return true; } return false; };
      const l=[...document.querySelectorAll('#content *')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0&&b.right>W+0.5&&!rouleau(e); });
      const lignes=[...document.querySelectorAll('#content .bar-row, #content .cs-l')].length;
      const barres=[...document.querySelectorAll('#content .cs-bar, #content .bar-track')].map(e=>Math.round(e.getBoundingClientRect().width));
      return {page:document.documentElement.scrollWidth, lignes, barreMin:barres.length?Math.min(...barres):null, fautifs:l.filter(e=>!l.includes(e.parentElement)).slice(0,3).map(e=>(e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().right))};`;
    let r=await S.ev(lire); if(r.page>P.w+(P.tac?0:15)){ await dormir(700); r=await S.ev(lire); }
    const ok=r.lignes>=8 && r.page<=P.w+(P.tac?0:15) && r.barreMin>=40;
    if(!ok) ko++;
    console.log((ok?'  ✓ ':'  ✗ ')+nom.padEnd(9)+String(P.w).padStart(5)+'px  '+JSON.stringify(r));
    if(nom==='petitand'){ const png=await S.c.envoyer('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:600,width:P.w,height:1100,scale:1}}); fs.writeFileSync('/tmp/conso-'+(process.env.SOURCE?'avant':'apres')+'.png',Buffer.from(png.data,'base64')); }
    S.fermer();
  }
  process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
