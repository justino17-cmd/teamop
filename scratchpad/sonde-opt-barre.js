/* ══ LA BARRE « ORDRE PROPOSÉ » SUR LA CARTE, AU TÉLÉPHONE ═══════════════════════════════════════
   Après « Optimiser la tournée » → Aperçu, une barre se pose sur la carte : ordre proposé, gain,
   Appliquer / Détail / ✕. Elle était centrée par `left:50%` + `translateX(-50%)` : une boîte
   absolue à largeur automatique ne se mesure alors que sur la MOITIÉ de son cadre — 164 px sur un
   téléphone de 360. La carte (Leaflet) vient d'un CDN et ne se charge pas ici : on pose un cadre
   `#plm-map` de la largeur du contenu, et on appelle la vraie `planOptBarre()`.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sonde-opt-barre.js   (SOURCE=<beta d'avant> pour la contre-épreuve)   */
const path=require('path');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil } = require(path.join(__dirname,'profils.js'));
(async()=>{
  let ko=0;
  for (const nom of ['petitand','tel','ipad','bureau']) {
    const P=profil(nom); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);
    await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
      currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
    await dormir(1200);
    await S.ev(`setPlatForce('${P.plat}'); go('planning'); return 1;`); await dormir(2500);
    const r=await S.ev(`const mp=document.createElement('div'); mp.id='plm-map'; mp.style.cssText='position:relative;height:420px;background:#cfd8dc';
      /* pose, appel et lecture dans le MÊME tour : le Planning redessine #content en différé, et une
         attente entre les deux laissait parfois la carte factice emportée avec lui */
      document.getElementById('content').prepend(mp); OPT.res={cA:{min:95,km:42.3},cP:{min:83,km:38.9}}; planOptBarre();
      const b=document.getElementById('opt-barre'); if(!b) return {mort:'la barre n’a pas paru'}; const bb=b.getBoundingClientRect(), mb=mp.getBoundingClientRect();
      /* une LIGNE = des morceaux qui se chevauchent en hauteur (le texte et les boutons n'ont pas le
         même haut : compter les « top » distincts comptait deux lignes pour une) */
      const rs=[...b.children].map(x=>x.getBoundingClientRect()).sort((x,y)=>x.top-y.top); let lignes=0, bas=-1;
      rs.forEach(x=>{ if(x.top>=bas-1){ lignes++; bas=x.bottom; } else bas=Math.max(bas,x.bottom); });
      return {carte:Math.round(mb.width), barre:Math.round(bb.width), haut:Math.round(bb.height), lignes, gauche:Math.round(bb.left-mb.left), droite:Math.round(mb.right-bb.right)};`);
    const fautes=[]; if(r.mort){ console.log('✗ '+nom+' → '+r.mort); ko++; S.fermer(); continue; }
    if(r.gauche<0||r.droite<0) fautes.push('sort de la carte');
    /* ou bien tout tient sur une ligne, ou bien la barre prend toute la largeur qu'on lui donne */
    if(r.lignes>1 && r.barre < r.carte-20-2) fautes.push(r.lignes+' lignes dans '+r.barre+' px, alors que la carte en offre '+(r.carte-20));
    if(r.lignes>2) fautes.push(r.lignes+' lignes');
    console.log((fautes.length?'✗ ':'✓ ')+nom.padEnd(9)+String(P.w).padStart(5)+' px · carte '+r.carte+' · barre '+r.barre+'×'+r.haut+' · '+r.lignes+' ligne(s)'+(fautes.length?'  → '+fautes.join(' · '):''));
    if(fautes.length) ko++;
    S.fermer();
  }
  console.log(ko?'\n  '+ko+' ✗':'\n  elle tient partout'); process.exit(ko?1:0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
