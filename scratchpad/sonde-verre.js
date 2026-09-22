/* ══ SONDE — LE VERRE AU PIXEL ══════════════════════════════════════════════════════════
   Justin, 22 septembre 2026 : « ça fait hyper brillant, ça casse les écritures, c'est mal
   fini. » Ce que cette sonde mesure, sur les VRAIS pixels peints par Chrome :

   1. LA LENTILLE SANS MATIÈRE — `backdrop-filter` sur un fond entièrement transparent :
      l'élément ne montre pas une surface, il montre le décor déformé. Doit valoir ZÉRO.
   2. LE LISERÉ DE FUITE — un `blur(R)` échantillonne jusqu'à R px AU-DELÀ de l'élément :
      sur une pilule de 38 px avec R=18, le fond de page entre par le haut et par le bas.
      On mesure l'écart entre le BORD et le CŒUR de la surface, hors des lettres.
   3. LE CONTRASTE du texte sur sa propre surface.

   ⛔ QUATRE PIÈGES DE MESURE PAYÉS AVANT D'ARRIVER ICI, tous notés pour la prochaine fois :
   · parcourir la DIAGONALE d'un élément TRAVERSE LES LETTRES — on lisait « amplitude 0,94 »
     partout, c'était le contraste texte/fond et non un dégradé ;
   · une bande horizontale à 3 px du haut d'une PILULE SORT de l'élément par les bouts
     arrondis — on lisait la page d'à côté et on l'attribuait à la pilule ;
   · calculer des coordonnées d'écran depuis un `getBoundingClientRect` invite l'erreur de
     défilement et d'échelle. On DÉCOUPE la capture sur l'élément : l'image EST l'élément ;
   · une pilule et une carte ne se mesurent PAS pareil. Sur une carte, les rangées du milieu
     sont pleines de contenu : on lit la COLONNE de gauche (le rembourrage), jamais le cœur.
   ⛔ Bêta uniquement, servie en 127.0.0.1.                                                */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const {decoder,px,contraste,lum}=require(path.join(__dirname,'png.js'));

let ok=0,ko=0; const L=[];
const v=(t,a,b)=>{const bon=JSON.stringify(a)===JSON.stringify(b); bon?ok++:ko++;
  L.push((bon?'  ✓ ':'  ✗ ')+t+(bon?'':`\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`));};
const vrai=(t,c)=>v(t,!!c,true); const titre=t=>L.push('\n══ '+t+' ══\n');
const moy=a=>a.reduce((s,x)=>s+x,0)/a.length;

(async()=>{
  const S=await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(800); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; return 1;`);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}

  const couper=async(c,nom)=>{ const r=await S.c.envoyer('Page.captureScreenshot',
      {format:'png',clip:{x:c.x,y:c.y,width:c.width,height:c.height,scale:3},captureBeyondViewport:true});
    const b=Buffer.from(r.data,'base64'); if(nom) fs.writeFileSync(__dirname+'/'+nom,b); return decoder(b); };

  /* une PILULE : on ne lit que la partie droite (hors bouts arrondis) et les rangées sans encre */
  const profilPilule=(I)=>{ const x0=I.h*0.5, x1=I.w-I.h*0.5; if(x1-x0 < I.w*0.12) return null;
    const rang=f=>{const o=[];for(let i=0;i<=8;i++)o.push(lum(px(I,x0+(x1-x0)*i/8,Math.min(I.h-1,I.h*f))));return o;};
    const rim=moy([...rang(0.05),...rang(0.95)]), coeur=moy([...rang(0.20),...rang(0.80)]);
    return {rim,coeur,liseré:Math.abs(rim-coeur),fondTexte:px(I,I.w*0.5,I.h*0.20)}; };
  /* une CARTE : on lit la COLONNE de rembourrage à gauche, jamais le cœur (il porte le contenu) */
  const profilCarte=(I)=>{ const cx=I.w*0.02;
    const col=f=>lum(px(I,cx,Math.min(I.h-1,I.h*f)));
    const rim=moy([col(0.01),col(0.99)]), coeur=moy([col(0.25),col(0.5),col(0.75)]);
    /* ⛔ LE FOND DU TEXTE SE LIT DANS LE REMBOURRAGE, PAS AU CENTRE. Au centre d'une carte
       il y a du CONTENU (un graphique, une pastille de couleur, une ligne) : on mesurerait
       alors le contraste de l'encre contre un autre objet, pas contre la surface. Mesuré :
       ça rendait 2,69 sur une carte parfaitement lisible. */
    return {rim,coeur,liseré:Math.abs(rim-coeur),fondTexte:px(I,cx,I.h*0.5)}; };

  const mesurer=async(sel,filtre,type,etiq)=>{
    /* ⛔ on fait défiler AVANT de filtrer sur la fenêtre : sinon un élément sous la ligne de
       flottaison est écarté, et la sonde rend « aucune cible » sur un écran qui en porte. */
    const trouve=await S.ev(`
      const vis=e=>{const b=e.getBoundingClientRect(); const st=getComputedStyle(e);
        return b.width>40&&b.height>20&&st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05;};
      const e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(vis).find(x=>${filtre});
      if(!e) return null; e.scrollIntoView({block:'center'}); return 1;`);
    if(!trouve) return null;
    await dormir(450);
    const dit=await S.ev(`
      const vis=e=>{const b=e.getBoundingClientRect(); const st=getComputedStyle(e);
        return b.width>40&&b.height>20&&st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05;};
      const e=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(vis).find(x=>${filtre});
      if(!e) return null; const st=getComputedStyle(e), b=e.getBoundingClientRect();
      const al=(st.backgroundColor.match(/[\\d.]+/g)||[]);
      return { couleur:st.color, bf:(st.backdropFilter||st.webkitBackdropFilter||'none'),
               alpha: al.length>3?+al[3]:1, bgImg:st.backgroundImage==='none'?'none':'image',
               txt:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,16),
               w:Math.round(b.width),h:Math.round(b.height),
               clip:{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height} };`);
    if(!dit) return null;
    const I=await couper(dit.clip, etiq?etiq+'.png':null);
    const pr=(type==='pilule')?profilPilule(I):profilCarte(I);
    if(!pr) return null;
    const enc=(dit.couleur.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number);
    return {...dit,...pr,ctr:contraste(enc,pr.fondTexte)};
  };

  const R=[];
  for(const th of ['light','dark']){
    await S.ev(`setPlatForce('iosweb'); setThemePref('${th}'); go('parametres'); return 1;`); await dormir(1200);
    const seg=await mesurer('.filters.seg-on .chip','/Espa/.test(x.textContent)','pilule', th==='light'?'verre-seg-jour':'verre-seg-nuit');
    if(seg) R.push({th,fam:'pastille de segmenté',...seg});
    await S.ev(`go('interventions'); return 1;`); await dormir(1000);
    const lib=await mesurer('.filters:not(.seg-on) .chip','true','pilule', th==='light'?'verre-libre-jour':null);
    if(lib) R.push({th,fam:'pastille libre',...lib});
    const bt=await mesurer('.btn','x.getBoundingClientRect().height>=36','pilule',null);
    if(bt) R.push({th,fam:'bouton',...bt});
    const ca=await mesurer('.card','x.getBoundingClientRect().height>140','carte', th==='light'?'verre-carte-jour':null);
    if(ca) R.push({th,fam:'carte',...ca});
  }

  titre('0. LA SONDE REGARDE BIEN QUELQUE CHOSE');
  v('population : surfaces mesurées', R.length>=6, true);
  const fams=[...new Set(R.map(r=>r.fam))];
  L.push('      familles trouvées : '+fams.join(' · '));
  /* ⚠️ Une famille absente n'est pas une famille saine : on le DIT plutôt que de laisser
     croire que tout est mesuré. */
  ['pastille de segmenté','pastille libre','bouton','carte'].forEach(f=>{
    const n=R.filter(r=>r.fam===f).length;
    if(!n) L.push('      ⚠️ famille NON RENCONTRÉE sur ces écrans : '+f+' — rien n\'est conclu pour elle'); });
  L.push('');
  L.push('   thème  famille                taille   liseré   contraste  fond   backdrop-filter');
  R.forEach(r=>L.push(`   ${r.th.padEnd(6)} ${r.fam.padEnd(22)} ${(r.w+'×'+r.h).padStart(7)}  ${r.liseré.toFixed(3).padStart(6)}  ${String(r.ctr).padStart(7)}   ${String(r.alpha).padStart(4)}   ${r.bf.slice(0,24)}`));

  titre('1. ⛔ PLUS AUCUNE LOUPE SANS MATIÈRE');
  R.forEach(r=>vrai(`${r.th} · ${r.fam} : ${r.bf==='none'?'aucun filtre':'filtre AVEC matière'}`,
    r.bf==='none' || r.alpha>=0.02 || r.bgImg!=='none'));

  titre('2. LE LISERÉ DE FUITE, MESURÉ SUR LA SURFACE');
  R.forEach(r=>{ L.push(`      ${r.th} · ${r.fam} : bord ${r.rim.toFixed(3)} · cœur ${r.coeur.toFixed(3)}`);
    v(`${r.th} · ${r.fam} : le liseré reste sous 0,05`, r.liseré < 0.05, true); });

  titre('3. LE TEXTE RESTE LISIBLE SUR SA PROPRE SURFACE');
  R.forEach(r=>v(`${r.th} · ${r.fam} : contraste ${r.ctr} ≥ 4,5`, r.ctr >= 4.5, true));

  titre('4. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-verre : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
