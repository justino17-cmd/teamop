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
const {decoder,px,contraste,lum,lireCouleur}=require(path.join(__dirname,'png.js'));

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

  /* ⛔ ON PREND LA MÉDIANE, PAS LA MOYENNE. Deux pixels de contenu dans une goutttière, ou
     l'antialiasing d'un coin arrondi, suffisent à déplacer une moyenne : mesuré le
     22 septembre, la même carte rendait 0,228 à un tour et 0,005 au suivant. Un liseré de
     fuite, lui, est SYSTÉMATIQUE sur toute la bordure — la médiane le garde et jette le reste.
     ⚠️ Et on reste à 12 % du bord, pas à 5 % : sur une pilule de 44 px, 5 % vaut 2 px, en
     plein dans l'antialiasing du rayon. Un flou qui fuit déborde de bien plus que ça. */
  const med=a=>{const s=[...a].sort((x,y)=>x-y); const n=s.length;
    return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
  /* une PILULE (large et basse, très arrondie) : on ne lit que la partie droite, et les
     rangées sans encre, au-dessus et au-dessous de la ligne de texte. */
  const profilPilule=(I)=>{ const x0=I.h*0.5, x1=I.w-I.h*0.5; if(x1-x0 < I.w*0.10) return null;
    const rang=f=>{const o=[];for(let i=0;i<=14;i++)o.push(lum(px(I,x0+(x1-x0)*i/14,Math.min(I.h-1,I.h*f))));return o;};
    const rim=med([...rang(0.12),...rang(0.88)]), coeur=med([...rang(0.26),...rang(0.74)]);
    return {rim,coeur,liseré:Math.abs(rim-coeur),fondTexte:px(I,x0+(x1-x0)*0.5,I.h*0.12)}; };
  /* une CARTE : la colonne de rembourrage à gauche, jamais le cœur (il porte le contenu). */
  const profilCarte=(I)=>{ const col=(fx,fy)=>lum(px(I,I.w*fx,Math.min(I.h-1,I.h*fy)));
    const bande=(y0,y1)=>{const o=[];for(let i=0;i<=8;i++)for(const fx of [0.012,0.020,0.028])
      o.push(col(fx,y0+(y1-y0)*i/8));return o;};
    const rim=med([...bande(0.03,0.09),...bande(0.91,0.97)]), coeur=med(bande(0.30,0.70));
    return {rim,coeur,liseré:Math.abs(rim-coeur),fondTexte:px(I,I.w*0.020,I.h*0.5)}; };

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
    /* ⛔ On JETTE une couleur qu'on ne sait pas lire au lieu de la deviner — sinon on publie
       un contraste crédible et faux (cf. png.js). */
    const enc=lireCouleur(dit.couleur);
    return {...dit,...pr,encreLue:!!enc,ctr:enc?contraste(enc,pr.fondTexte):null};
  };

  /* ⛔ UNE FAMILLE ABSENTE N'EST PAS UNE FAMILLE SAINE. On cherche chaque famille sur
     PLUSIEURS écrans jusqu'à la trouver, et si on ne la trouve nulle part on le DIT —
     un ✓ sur un ensemble vide ne vaut rien.
     ⚠️ Et chaque forme a SA géométrie : une pilule (large et basse, très arrondie) se lit
     dans sa partie droite ; une carte se lit dans sa colonne de rembourrage. La barre
     d'onglets est une PILULE, pas une carte — mesurée comme une carte, elle rendait 0,155
     à un tour et 0,000 au suivant, c'est-à-dire un bruit de coin arrondi. */
  const FAMILLES=[
    {n:'pastille de segmenté', sel:'.filters.seg-on .chip', f:'true',                          g:'pilule', ecrans:['parametres','interventions','boxes']},
    {n:'curseur de segmenté',  sel:'.seg-cur',              f:'true',                          g:'pilule', ecrans:['parametres','interventions','boxes']},
    {n:'pastille libre',       sel:'.filters:not(.seg-on) .chip', f:'true',                    g:'pilule', ecrans:['contrats','factures','registre','clients','boiteMail','carteInt','messagerie']},
    {n:'bouton',               sel:'.btn',                  f:'x.getBoundingClientRect().height>=36', g:'pilule', ecrans:['dashboard','interventions']},
    {n:'piste segmentée',      sel:'.seg',                  f:'x.getBoundingClientRect().height<70', g:'pilule', ecrans:['pointage','planning','interventions','statistiques']},
    {n:'carte',                sel:'.card',                 f:'x.getBoundingClientRect().height>140', g:'carte',  ecrans:['dashboard','parametres']},
    {n:'KPI',                  sel:'.kpi',                  f:'x.getBoundingClientRect().height>60',  g:'carte',  ecrans:['dashboard','statistiques','stock']},
    /* ⛔ LA BARRE D'ONGLETS N'A PAS DE SURFACE LIBRE À MESURER : ses cinq onglets vont de
       y 7 à y 51 sur 58 px de haut — exactement les rangées qu'on lirait. Mesurée comme si
       elle en avait une, elle rendait 0,134 à un tour et 0,000 au suivant : c'était le HAUT
       d'une icône, pas un liseré. On la garde pour la loupe et le contraste, on DIT qu'on
       ne mesure pas son liseré plutôt que de publier un chiffre qui ne veut rien dire. */
    {n:"barre d'onglets",      sel:'.tabbar',               f:'true',                          g:'pilule', ecrans:['dashboard'], rempli:true},
    {n:'barre du haut',        sel:'.topbar',               f:'true',                          g:'pilule', ecrans:['dashboard']},
  ];
  const R=[], absentes=[];
  for(const th of ['light','dark']){
    await S.ev(`setPlatForce('iosweb'); setThemePref('${th}'); return 1;`); await dormir(300);
    for(const F of FAMILLES){
      let m=null;
      for(const e of F.ecrans){
        await S.ev(`go('${e}'); return 1;`); await dormir(800);
        m=await mesurer(F.sel,F.f,F.g, (th==='light'&&F.n==='pastille de segmenté')?'verre-seg-jour':null);
        if(m) break;
      }
        if(m) R.push({th,fam:F.n,rempli:F.rempli||false,...m}); else absentes.push(th+' · '+F.n);
    }
  }

  titre('0. LA SONDE REGARDE BIEN QUELQUE CHOSE');
  v('population : surfaces mesurées', R.length>=12, true);
  L.push('      familles trouvées : '+[...new Set(R.map(r=>r.fam))].join(' · '));
  absentes.forEach(a=>L.push('      ⚠️ NON RENCONTRÉE sur les écrans essayés : '+a+' — rien n\'est conclu pour elle'));
  v('⚠️ aucune famille introuvable (sinon son ✓ porterait sur du vide)', absentes, []);
  L.push('');
  L.push('   thème  famille                taille   liseré   contraste  fond   backdrop-filter');
  R.forEach(r=>L.push(`   ${r.th.padEnd(6)} ${r.fam.padEnd(22)} ${(r.w+'×'+r.h).padStart(7)}  ${r.liseré.toFixed(3).padStart(6)}  ${String(r.ctr===null?'?':r.ctr).padStart(7)}   ${String(r.alpha).padStart(4)}   ${r.bf.slice(0,24)}`));

  titre('1. ⛔ PLUS AUCUNE LOUPE SANS MATIÈRE');
  R.forEach(r=>vrai(`${r.th} · ${r.fam} : ${r.bf==='none'?'aucun filtre':'filtre AVEC matière'}`,
    r.bf==='none' || r.alpha>=0.02 || r.bgImg!=='none'));

  titre('2. LE LISERÉ DE FUITE, MESURÉ SUR LA SURFACE');
  R.forEach(r=>{ L.push(`      ${r.th} · ${r.fam} : bord ${r.rim.toFixed(3)} · cœur ${r.coeur.toFixed(3)}`);
    /* ⛔ LE SEUIL VIENT DE LA MESURE DU DÉFAUT, PAS D'UN GOÛT. La pastille cassée de la
       capture de Justin rendait cœur 0,679 contre bord 0,784, soit **0,105**. On garde
       0,08 : sous le défaut réel, au-dessus du bruit mesuré des surfaces saines. */
    if(r.rempli){ L.push('      → liseré NON MESURÉ : ses enfants couvrent la surface'); return; }
    v(`${r.th} · ${r.fam} : le liseré de fuite reste sous 0,08`, r.liseré < 0.08, true); });

  titre('3. LE TEXTE RESTE LISIBLE SUR SA PROPRE SURFACE');
  v('population : toutes les encres ont pu être LUES', R.filter(r=>!r.encreLue).map(r=>r.th+' · '+r.fam), []);
  R.forEach(r=>{ if(!r.encreLue){ L.push('      ⚠️ '+r.th+' · '+r.fam+' : encre illisible — rien conclu'); return; }
    v(`${r.th} · ${r.fam} : contraste ${r.ctr} ≥ 4,5`, r.ctr >= 4.5, true); });

  titre('4. ⛔ UNE SEULE MARQUE POUR L’ONGLET ACTIF');
  /* Le soulignement de 2,5 px est dessiné pour une bande d'onglets EN HAUT (coin arrondi en
     haut, `bottom:-1px`). Dans la pilule flottante du bas il tombe À L'INTÉRIEUR, en travers
     de la pastille qui désigne déjà l'onglet. On exige : pastille SANS trait en bas,
     trait CONSERVÉ en haut. */
  for(const prof of ['iosweb','ios27','ios18','android','androidweb']){
    for(const th of ['light','dark']){
      await S.ev(`setPlatForce('${prof}'); setThemePref('${th}'); go('dashboard'); return 1;`); await dormir(700);
      const r=await S.ev(`
        const bar=document.querySelector('.tabbar'); if(!bar) return {absent:true};
        const on=bar.querySelector('.tab.on'); if(!on) return {sansActif:true};
        const a=getComputedStyle(on,'::after'), cur=bar.querySelector('.tab-cur');
        const cs=cur?getComputedStyle(cur):null;
        return { pastille: !!(cur&&cs.display!=='none'&&+cs.opacity>0.05),
                 trait: a.content!=='none' && +a.opacity>0.05 && !/matrix\\(0/.test(a.transform) };`);
      if(r.absent||r.sansActif){ L.push('      ⚠️ '+prof+' · '+th+' : pas de barre d\'onglets — rien conclu'); continue; }
      vrai(`${prof} · ${th} : la pastille désigne l’onglet actif`, r.pastille);
      v(`${prof} · ${th} : … et elle est SEULE à le faire`, r.trait, false);
    }
  }
  /* ⚠️ LA CONTRE-ÉPREUVE, ET ELLE EST OBLIGATOIRE : une bande d'onglets qui N'EST PAS la
     barre du bas doit GARDER son trait — sinon on n'a pas corrigé un doublon, on a supprimé
     un marqueur. La seule vraie bande du haut de l'application est enfouie dans la fiche
     d'une intervention (onglet Docs), trois gestes plus loin et seulement s'il existe une
     intervention : on REPRODUIT son balisage exact ici. La question posée est celle du
     sélecteur — « est-ce que ma règle épargne un onglet hors de .tabbar ? » — et un
     élément représentatif y répond exactement. */
  for(const th of ['light','dark']){
    await S.ev(`setPlatForce('iosweb'); setThemePref('${th}'); go('dashboard'); return 1;`); await dormir(700);
    const r=await S.ev(`
      document.querySelectorAll('#essai-tabs').forEach(x=>x.remove());
      const d=document.createElement('div'); d.id='essai-tabs';
      d.innerHTML='<div class="tabs" style="margin:12px"><div class="tab active">M\u00e9dias</div><div class="tab">Signatures</div></div>';
      document.getElementById('content').prepend(d);
      /* ⛔ LE TRAIT ENTRE EN ANIMATION (refonteSouligne, remplissage 'both') : lu tout de
         suite, il vaut opacity:0 et scaleX(.2), c'est-à-dire son ÉTAT DE DÉPART. Une
         première version de cette contre-épreuve concluait donc « trait supprimé » sur un
         trait qui n'avait simplement pas encore paru. On attend deux trames ET la durée de
         l'animation avant de lire. */
      const t=d.querySelector('.tab.active');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      await new Promise(r=>setTimeout(r,520));
      const a=getComputedStyle(t,'::after');
      const res={ horsBarre: !t.closest('.tabbar'),
                  trait: a.content!=='none' && +a.opacity>0.05 && a.transform.indexOf('matrix(0')!==0,
                  op:a.opacity, h:a.height };
      d.remove(); return res;`);
    vrai(`population : l’onglet témoin est bien HORS de la barre du bas (${th})`, r.horsBarre);
    vrai(`⛔ CONTRE-ÉPREUVE (${th}) : une bande d’onglets du HAUT garde son trait`, r.trait);
  }

  titre('5. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x=>!/net::|Failed to load|favicon/i.test(x)), []);

  console.log(L.join('\n'));
  console.log(`\n════ sonde-verre : ${ok} ✓ ${ko} ✗ ════\n`);
  S.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.error('SONDE MORTE :',e&&e.stack||e);process.exit(2);});
