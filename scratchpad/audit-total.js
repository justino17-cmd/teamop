/* ══ AUDIT TOTAL — CHAQUE CATÉGORIE, CHAQUE ÉLÉMENT CLIQUABLE ═══════════════════════════
   Justin, 22 septembre 2026 : « tu vas tout me vérifier un par un, bouton par bouton,
   catégorie par catégorie ».

   Ce qu'on cherche, NOMMÉ AVANT de chercher (sinon on trouve ce qu'on veut) :
   1. HORS DE L'ÉCRAN — un élément dont le rectangle sort à droite ou à gauche. C'est le
      défaut du menu « Jours » (81 px dehors) que personne n'avait signalé.
   2. RECOUVERT — un élément cliquable dont le centre rend QUELQU'UN D'AUTRE. C'est le
      défaut de la bulle d'assistance sous « Voir sur la carte » (83 % couverte).
   3. TRONQUÉ — un libellé dont le texte réel dépasse sa boîte. « Un libellé tronqué ne
      nomme rien » : sur une fiche, ça peut être le nom du client.
   4. CIBLE TROP PETITE — sous le plancher que la refonte se donne elle-même.
   5. ERREUR JAVASCRIPT — au rendu de chaque écran.

   ⛔ CE QU'ON NE FAIT PAS : cliquer. Cette passe MESURE ce qui est rendu. Les clics sont la
   passe B (`audit-clics.js`), avec `confirm()` qui répond NON pour ne rien détruire.

   ⛔ PIÈGES DE MESURE ENCODÉS ICI, tous payés aujourd'hui :
   · une fenêtre modale ou le panneau d'assistance s'ouvrent SEULS et couvrent l'écran : on
     les ferme par les fonctions de l'application, et on PROUVE que rien n'est devant ;
   · `#content` ne couvre pas l'écran quand la page est défilée ;
   · un élément de 0 px n'est pas un élément : on compte la population avant de croire un zéro.
   ⛔ Bêta uniquement, servie en 127.0.0.1.                                                */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

(async()=>{
  const S=await ouvrir();
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1200);
  /* ⛔ UN ÉCRAN VIDE NE MONTRE AUCUN DÉFAUT DE MISE EN PAGE. On remplit avec le jeu de test
     de la bêta — c'est ce qui fait apparaître les listes, les cartes et les tableaux. */
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);
  await S.ev(`window.confirm=()=>false; return 1;`);   /* plus rien ne se confirme après */

  const ranger=async()=>{ for(let k=0;k<5;k++){
    await S.ev(`const b=[...document.querySelectorAll('button,.btn')].find(x=>/Plus tard|Fermer|Non merci/.test(x.textContent||''));
      if(b) b.click(); try{ closeModal(); }catch(e){} try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`);
    await dormir(220);
    const r=await S.ev(`const o=document.querySelector('#overlay');
      return !!(o && getComputedStyle(o).display!=='none' && o.getBoundingClientRect().width>100)
          || !!document.querySelector('.asst.open');`);
    if(!r) return true; } return false; };

  const SONDE=`
    const W=innerWidth;
    const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
      const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
    const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')
      +(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
    const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,a[href],[onclick],.pl-row,.list-row,.nav-item';
    /* ⛔⛔ DEUX FAMILLES DE FAUX POSITIFS, MESURÉES AU PREMIER TOUR ET ÉCARTÉES ICI — elles
       faisaient à elles seules 3 900 des 4 016 « hors de l'écran ». Un faux défaut coûte deux
       fois : le temps de le « corriger », puis celui de la garde inutile.
       1. LE TIROIR FERMÉ. La barre latérale vit à x −252 quand elle est repliée : c'est un
          tiroir qui glisse, pas un débordement. 3 612 cas.
       2. CE QUI DÉFILE LATÉRALEMENT PAR DESSEIN — la grille du planning, la frise du tableau
          de bord, une rangée de filtres trop longue. Un élément à x 371 dans un conteneur qui
          défile n'est pas hors de l'écran : il est plus loin dans le rouleau. */
    const dansTiroirFerme=e=>{ const s=e.closest('.sidebar'); return !!(s && !s.classList.contains('open')); };
    const dansRouleau=e=>{ let n=e.parentElement;
      while(n && n!==document.body){ try{ const st=getComputedStyle(n);
        if(/auto|scroll/.test(st.overflowX) && n.scrollWidth>n.clientWidth+4) return true; }catch(x){}
        n=n.parentElement; } return false; };
    const tous=[...new Set([...document.querySelectorAll(SEL)])]
      .filter(vis).filter(e=>!dansTiroirFerme(e));
    const out={ vus:tous.length, hors:[], couverts:[], tronques:[], petits:[] };
    for(const e of tous){
      const b=e.getBoundingClientRect();
      /* 1. HORS DE L'ÉCRAN (horizontal seulement : le vertical, c'est du défilement) */
      if((b.right>W+1.5 || b.left<-1.5) && !dansRouleau(e))
        out.hors.push({ n:nom(e), t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,26),
                        x:Math.round(b.left), d:Math.round(b.right), w:Math.round(b.width) });
      /* 2. RECOUVERT — ⛔⛔ ET LA PREMIÈRE VERSION DE CE CONTRÔLE RENDAIT 14 FAUX DÉFAUTS.
         Elle mesurait à la position où la page venait de s'ouvrir : tout ce qui se trouve
         alors sous la barre d'onglets était déclaré « couvert ». Mais une barre FIXE couvre
         par construction ce qui passe dessous — il suffit de faire défiler, et ça remonte.
         Ce n'est un défaut que si l'élément ne peut JAMAIS en sortir, c'est-à-dire s'il est
         encore dessous quand la page est AU BOUT de son défilement. C'est donc là qu'on
         mesure, et nulle part ailleurs. Un faux défaut coûte deux fois. */
      if(AU_BOUT && b.top>=0&&b.bottom<=innerHeight){
        const cx=b.left+b.width/2, cy=b.top+b.height/2;
        const d=document.elementFromPoint(cx,cy);
        /* ⚠️ Une icône SVG posée DANS le bouton voisin n'est pas un recouvrement : on remonte
           au premier ancêtre cliquable des deux et on compare CEUX-LÀ. */
        const cliq=x=>x&&x.closest?(x.closest('button,.btn,.chip,.tab,.pl-row,.list-row,[onclick]')||x):x;
        const de=cliq(d), ee=cliq(e);
        if(d && de!==ee && !e.contains(d) && !d.contains(e))
          out.couverts.push({ n:nom(e), t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,26), par:nom(d) });
      }
      /* 3. TRONQUÉ : on regarde l'élément ET son porteur de texte */
      const cibles=[e,...e.querySelectorAll('b,span,.tab-l,.pl-title,.plg-t')].slice(0,4);
      for(const t of cibles){
        if(!t.scrollWidth) continue;
        if(t.scrollWidth>t.clientWidth+2 && getComputedStyle(t).overflow!=='visible'){
          out.tronques.push({ n:nom(e), t:(t.textContent||'').trim().replace(/\\s+/g,' ').slice(0,26),
                              vu:Math.round(t.clientWidth), reel:Math.round(t.scrollWidth) });
          break; }
      }
      /* 4. CIBLE TROP PETITE — le plancher que la refonte se donne : 38 px */
      if(TACTILE && b.height<37.5 && !e.closest('.tbl') && e.tagName!=='A')
        out.petits.push({ n:nom(e), t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,26), h:Math.round(b.height*10)/10 });
    }
    return out;`;

  const RUBS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k);`);
  const R={hors:[],couverts:[],tronques:[],petits:[]}; let vus=0, ecrans=0;
  const err=[];

  for(const [prof,w,h,tac] of [['iosweb',390,844,true],['macweb',1440,900,false]]){
    await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:tac?3:2,mobile:tac});
    await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:tac,maxTouchPoints:tac?5:1});
    if(tac){ try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',
      {insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){} }
    for(const th of ['light','dark']){
      await S.ev(`setPlatForce('${prof}'); setThemePref('${th}'); return 1;`); await dormir(300);
      for(const k of RUBS){
        const avant=S.exceptions.length;
        try{ await S.ev(`go('${k}'); return 1;`); }catch(e){ continue; }
        await dormir(380);
        await ranger();
        /* passe 1 : en HAUT — débordement, troncature, cibles */
        let o; try{ o=await S.ev(`const TACTILE=${tac}, AU_BOUT=false; ${SONDE}`); }catch(e){ continue; }
        /* ⛔⛔ PASSE 2 — ET C'EST LA TROISIÈME VERSION DE CE CONTRÔLE, LES DEUX PREMIÈRES
           ÉTAIENT FAUSSES. Mesurer « qui est sous une barre FIXE » à une position de
           défilement donnée ne prouve RIEN : une barre fixe couvre par construction ce qui
           passe dessous, en haut comme en bas. La version 1 mesurait en haut (14 faux), la
           version 2 tout en bas (10 autres faux, sous la barre du HAUT cette fois).
           La seule question qui a un sens est : **existe-t-il une position où cet élément
           est atteignable ?** On amène donc chaque candidat au MILIEU de l'écran et on
           reregarde. S'il est encore couvert là, il l'est pour de bon. */
        try{
          const cand=await S.ev(`const TACTILE=${tac}, AU_BOUT=true; ${SONDE}`);
          const n=cand.couverts.length;
          o.couverts=[];
          for(let i=0;i<n && i<12;i++){
            const c=await S.ev(`
              const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
              const vis=e=>{const b=e.getBoundingClientRect(); const st=getComputedStyle(e);
                return b.width>6&&b.height>6&&st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05;};
              const cliq=x=>x&&x.closest?(x.closest('button,.btn,.chip,.tab,.pl-row,.list-row,[onclick]')||x):x;
              const tous=[...document.querySelectorAll('button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.pl-row,.list-row,a[href],[onclick]')].filter(vis);
              const e=tous[${i}] || null; if(!e) return null;
              /* un élément FIXE ne se centre pas : il est là où il est, on le juge tel quel */
              const fixe=getComputedStyle(e).position==='fixed' || !!e.closest('.tabbar,#assistant,.topbar,.fab');
              if(!fixe){ e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }
              await new Promise(r=>setTimeout(r,90));
              const b=e.getBoundingClientRect();
              if(b.top<0||b.bottom>innerHeight) return null;
              const d=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
              if(!d||d===e||e.contains(d)||d.contains(e)||cliq(d)===cliq(e)) return null;
              return { n:nom(cliq(e)), t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,26), par:nom(cliq(d)) };`);
            if(c) o.couverts.push(c);
          }
        }catch(e){ o.couverts=[]; }
        await S.ev(`window.scrollTo(0,0); const c=document.getElementById('content'); if(c) c.scrollTop=0; return 1;`);
        ecrans++; vus+=o.vus;
        const tag=prof+'/'+th+'/'+k;
        ['hors','couverts','tronques','petits'].forEach(f=>o[f].forEach(x=>R[f].push({...x,ou:tag})));
        if(S.exceptions.length>avant) err.push(tag+' : '+S.exceptions.slice(avant).join(' | ').slice(0,120));
      }
      console.log('  '+prof+' · '+th+' — '+ecrans+' écrans, '+vus+' éléments vus');
    }
  }

  const grouper=(l,cle)=>{ const m={}; l.forEach(x=>{ const k=cle(x); (m[k]=m[k]||[]).push(x); });
    return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };

  console.log('\n════════ AUDIT TOTAL ════════');
  console.log('  population : '+ecrans+' écrans rendus, '+vus+' éléments cliquables mesurés');
  console.log('  erreurs JavaScript : '+err.length);
  err.slice(0,8).forEach(e=>console.log('      '+e));

  console.log('\n══ 1. HORS DE L\'ÉCRAN : '+R.hors.length+' ══');
  grouper(R.hors,x=>x.n).slice(0,12).forEach(([k,v])=>
    console.log('   '+String(v.length).padStart(4)+'×  '+k.padEnd(30)+' ex. « '+v[0].t+' » x '+v[0].x+'→'+v[0].d+'  ['+v[0].ou+']'));

  console.log('\n══ 2. RECOUVERTS : '+R.couverts.length+' ══');
  grouper(R.couverts,x=>x.n+' ← '+x.par).slice(0,12).forEach(([k,v])=>
    console.log('   '+String(v.length).padStart(4)+'×  '+k.slice(0,60).padEnd(60)+' ex. « '+v[0].t+' »  ['+v[0].ou+']'));

  console.log('\n══ 3. LIBELLÉS TRONQUÉS : '+R.tronques.length+' ══');
  grouper(R.tronques,x=>x.n).slice(0,12).forEach(([k,v])=>
    console.log('   '+String(v.length).padStart(4)+'×  '+k.padEnd(30)+' ex. « '+v[0].t+' » '+v[0].vu+'/'+v[0].reel+'  ['+v[0].ou+']'));

  console.log('\n══ 4. CIBLES SOUS 38 px (téléphone) : '+R.petits.length+' ══');
  grouper(R.petits,x=>x.n).slice(0,12).forEach(([k,v])=>
    console.log('   '+String(v.length).padStart(4)+'×  '+k.padEnd(30)+' ex. « '+v[0].t+' » '+v[0].h+'px  ['+v[0].ou+']'));

  fs.writeFileSync(__dirname+'/audit-total.json',JSON.stringify({ecrans,vus,err,...R}));
  console.log('\n  détail complet : scratchpad/audit-total.json');
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
