/* ══ AUDIT DES ÉCRANS PROFONDS — CE QUI S'OUVRE QUAND ON APPUIE ══════════════════════════
   Justin, 22 septembre 2026 : « tu finis de tout vérifier » — puis « 1 après 2 après 3 ».
   Étape 1 : les écrans PROFONDS. `audit-total.js` parcourt les 42 rubriques par `go(k)` ;
   il ne voit ni une fiche d'intervention, ni un formulaire, ni une fenêtre, ni un
   sous-onglet. Ce sont pourtant les écrans où l'on SAISIT — ceux où un défaut coûte.

   ⛔ ON N'APPELLE PAS LES FONCTIONS À LA MAIN. Une sonde qui force un état que
   l'application ne produit jamais fabrique de faux défauts (règle du dépôt) : on atteint
   chaque écran profond par un VRAI clic, depuis une vraie rubrique, avec les données de la
   bêta. Ce qu'on audite existe donc pour un utilisateur.

   Trois sortes d'écrans profonds, reconnues APRÈS le clic :
   · FENÊTRE  — un `#overlay`/`#overlay2` qui n'était pas ouvert s'ouvre ;
   · FICHE    — le titre de la page change sans changer de rubrique (détail d'un élément) ;
   · SOUS-VUE — l'onglet, le filtre ou le segment actif change (les « sous-catégories »).
   Chacun est audité une fois par gabarit, avec les contrôles d'`audit-total.js` déjà
   éprouvés : hors de l'écran, recouvert (candidat CENTRÉ), tronqué, cible trop petite
   (téléphone), erreur JavaScript.

   ⛔ PIÈGES ENCODÉS ICI, tous payés aujourd'hui :
   · `pushPropose` ouvre « Notifications » 4 s après l'entrée et couvre tout : on le coupe
     à la SOURCE, on laisse tirer les minuteurs de démarrage, et on relève ce qui s'ouvre
     tout seul AVANT de cliquer — sinon une fenêtre spontanée passe pour un écran profond ;
   · on ne masque JAMAIS `#overlay` : c'est là que vivent les écrans qu'on cherche ;
   · une référence prise avant le clic est morte après : on recense à NEUF à chaque tour ;
   · on compte la POPULATION de chaque famille avant de croire un zéro.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.

   Usage : node scratchpad/audit-profond.js <profil>  (tel, bureau, se, promax, android,
           petitand, ipad, ipadh, mac14, mac27, win, winapp — voir scratchpad/profils.js)   */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const PROFIL=process.argv[2]||'tel';
/* les appareils vivent dans UNE table, partagée avec l'autre sonde (scratchpad/profils.js) */
const {profil,poserProfil,DONNEES_LONGUES}=require(path.join(__dirname,'profils.js'));
const P = profil(PROFIL);

/* ⛔ CE QU'ON NE CLIQUE PAS — sortir de la session, détruire la base d'essai, ou changer la
   langue de toute l'interface (les libellés suivants ne se reconnaîtraient plus). */
const ECARTS=[
  [/d[ée]connexion|se d[ée]connecter|quitter l.espace|changer d.espace|^quitter$/i,'sortirait de la session'],
  [/tout effacer|r[ée]initialiser|repartir [àa] neuf|vider la base|supprimer (le compte|l.espace|mon compte)/i,'détruit la base d’essai'],
  [/^(fran[çc]ais|english|espa[ñn]ol|deutsch|italiano|portugu[êe]s|nederlands|polski|rom[âa]n[ăa]|t[üu]rk[çc]e|العربية)$/i,'changerait la langue de toute l’interface'],
];

(async()=>{
  const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{});   /* SOURCE=<beta d'avant> : la contre-épreuve */
  console.log('  page mesurée : '+S.version+'   ·   profil : '+PROFIL+' — '+P.lbl+' ('+P.plat+' '+P.w+'×'+P.h+', '+P.theme+')');

  await poserProfil(S,P);

  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){}
    const h=document.getElementById('hl-ecran'); if(h)h.remove();
    window.pushPropose=function(){};            /* « Notifications » : coupé à la source */
    return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0];
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){}
    if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);
  /* LONGUES=1 : les valeurs les plus longues plausibles (une seule copie : profils.js) */
  if(process.env.LONGUES){ const n=await S.ev(DONNEES_LONGUES); console.log('  données LONGUES posées sur '+n+' enregistrements'); if(!(n>50)){ console.log('  ✗ population trop maigre'); process.exit(4); } }
  /* ROLE=technicien : l'audit tourne EN TECHNICIEN. Tous les audits tournaient en administrateur, et
     l'écran qu'un technicien ouvre chaque matin (« Ma journée ») n'y paraissait jamais — mesuré le
     23 septembre 2026 : texte à 100 px au téléphone. On lui donne une vraie journée (en retard,
     aujourd'hui dont une en cours, demain, la semaine, plus tard, terminées). */
  const ROLE=process.env.ROLE||'';
  if(ROLE){ const n=await S.ev(`const t=db.techniciens[0]; if(!t) return 0; const J=d=>shiftDay(todayISO(),d);
      const plan=[[-1,'planifiee'],[0,'encours'],[0,'planifiee'],[0,'planifiee'],[1,'planifiee'],[3,'planifiee'],[12,'planifiee'],[-2,'terminee'],[-3,'terminee']];
      db.interventions.slice(0,plan.length).forEach((i,k)=>{ i.techId=t.id; i.techIds=[t.id]; i.date=J(plan[k][0]); i.heure=String(8+k).padStart(2,'0')+':30'; i.statut=plan[k][1]; if(plan[k][1]==='encours') i.debutReel=Date.now()-3600000; });
      const u={id:'u-'+${JSON.stringify(ROLE)},prenom:'Jean-Christophe',nom:'Delacroix-Montgolfier',role:${JSON.stringify(ROLE)},techId:t.id,username:'jc',pass:'x',actif:true,pref:{}};
      db.users.push(u); save(); try{ localStorage.setItem('elan_onboarded_'+u.id,'1'); localStorage.setItem('elanB_onboarded_'+u.id,'1'); localStorage.setItem('elanB_rappels_'+u.id,todayISO()); localStorage.setItem('elanB_fdr_'+todayISO()+'_'+u.id,'1'); }catch(e){}   /* les deux accueils du matin (Leia, rappel du bas) couvriraient l'écran : sonde-ma-journee.js les mesure */
      currentUser=u; window._intViewInit=0; enterApp(u); return db.interventions.filter(i=>(i.techIds||[]).includes(t.id)).length;`);
    console.log('  connecté en '+ROLE+' — '+n+' interventions à lui'); if(!(n>=6)){ console.log('  ✗ population trop maigre'); process.exit(4); }
    await dormir(1500); }
  await S.ev(`try{ setPlatForce('${P.plat}'); }catch(e){} try{ setThemePref('${P.theme}'); }catch(e){} try{ setAccent('green'); }catch(e){} return 1;`);

  /* ── LES GARDE-FOUS : plus rien ne se confirme, rien ne quitte la page ── */
  await S.ev(`
    window.confirm=()=>false; window.alert=()=>{}; window.prompt=()=>null; window.print=()=>{}; window.open=()=>null;
    try{ HTMLFormElement.prototype.submit=function(){}; }catch(e){}
    document.addEventListener('click',ev=>{ const a=ev.target&&ev.target.closest&&ev.target.closest('a[href]');
      if(a){ const h=a.getAttribute('href')||''; if(h&&!/^#|^javascript:/i.test(h)) ev.preventDefault(); } },true);
    return 1;`);

  /* ⛔⛔ UNE FENÊTRE N'EST PAS « CE QUI VIT DANS #overlay ». Deux essais l'ont prouvé : la
     feuille « Créer » (.creer-ov) et toute la famille .dp-fond — #td-det, #pg-perslist,
     #pjs-menu, #abs-tylist, créés à la volée et accrochés à <body> — échappaient au
     détecteur. #td-det, jamais refermé, a ensuite couvert tout le reste de l'exploration :
     118 « recouverts » qui n'existaient pas. On ne liste plus : on cherche TOUTE couche fixe
     qui couvre au moins la moitié de l'écran et qui n'est pas la charpente permanente. */
  const OUVERTE=`(()=>{
    const CHARPENTE='.topbar,#tabbar,.tabbar,.rf-tabs,.sidebar,#assistant,.fab,#app-root,.main,#content,#hl-ecran,#maj-bloque';
    const W=innerWidth, H=innerHeight;
    /* une couche qui couvre la moitié de l'écran couvre son centre : on demande au navigateur
       QUI est là, en trois points, et on remonte jusqu'à l'ancêtre fixe qui couvre — même
       généralité qu'un parcours de tous les éléments, cent fois moins cher */
    const vus=new Set(), couches=[];
    for(const [x,y] of [[W/2,H/2],[W/2,H*0.82],[W*0.18,H*0.5]]){
      for(const top of document.elementsFromPoint(x,y)){
        let e=top;
        while(e && e!==document.body && e!==document.documentElement){
          if(!vus.has(e)){ vus.add(e);
            const st=getComputedStyle(e);
            if(st.position==='fixed' && st.display!=='none' && st.visibility!=='hidden' && +st.opacity>=0.05
               && (!e.closest(CHARPENTE) || e.matches('#overlay,#overlay2,.creer-ov,.dp-fond'))){
              const r=e.getBoundingClientRect();
              if(r.width*r.height >= W*H*0.5 && !(e.parentElement&&e.parentElement.closest('#overlay,#overlay2,.creer-ov,.dp-fond')))
                couches.push({e, z:parseInt(st.zIndex)||0});
            } }
          e=e.parentElement; }
      }
    }
    if(!couches.length) return null;
    couches.sort((a,b)=>b.z-a.z);
    const L=couches[0].e;
    const panneau=L.querySelector('.modal,.dp,.creer-sheet,.sheet')||L;
    if(!L.id){ L.id='__couche-'+Math.random().toString(36).slice(2,8); }
    if(panneau!==L && !panneau.id){ panneau.id=L.id+'-p'; }
    const h=panneau.querySelector('.modal-head h3,.dp-hd,.sheet-head h3,h2,h3');
    const titre=((h&&h.textContent)||'').replace(/[✕×]/g,'').trim().replace(/\\s+/g,' ').slice(0,50);
    return { sel:'#'+panneau.id, couche:'#'+L.id, titre:titre||('('+(L.className||L.id).toString().slice(0,24)+')'), n:couches.length };
  })()`;
  const fermees=[];     /* ce qui n'a cédé ni à ✕, ni à Échap, ni au fond : À SIGNALER */
  const ranger=async()=>{ for(let k=0;k<8;k++){
    const o=await S.ev(`return ${OUVERTE};`);
    if(!o){ await S.ev(`try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`); return true; }
    const geste = k<3 ? 'croix' : k<5 ? 'echap' : k<7 ? 'fond' : 'force';
    await S.ev(`const L=document.querySelector(${JSON.stringify('X')}.replace('X',${JSON.stringify(o.couche)}));
      const P=document.querySelector(${JSON.stringify(o.sel)})||L;
      if('${geste}'==='croix'){
        const b=[...P.querySelectorAll('button,.btn,.x,.modal-close,[onclick]')].find(x=>
          /^(Plus tard|Fermer|Non merci|Annuler|Terminé|OK|✕|×)$/.test((x.textContent||'').trim()) || x.classList.contains('x') || x.classList.contains('modal-close'));
        if(b) b.click();
      } else if('${geste}'==='echap'){
        const ev=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
        (document.activeElement||document.body).dispatchEvent(ev); window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      } else if('${geste}'==='fond'){
        if(L) L.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        try{ closeModal2&&closeModal2(); }catch(e){} try{ closeModal(); }catch(e){} try{ creerFermer(); }catch(e){}
      } else { if(L) L.style.display='none'; }
      return 1;`);
    if(geste==='force') fermees.push(o.titre+' '+o.couche);
    await dormir(260); } return false; };

  /* ⛔ ON LAISSE TIRER LES MINUTEURS DE DÉMARRAGE, PUIS ON RELÈVE CE QUI S'EST OUVERT SEUL */
  await dormir(6500);
  const spontanees=[];
  for(let k=0;k<4;k++){ const o=await S.ev(`return ${OUVERTE};`); if(!o) break; spontanees.push(o.titre); await ranger(); }
  console.log('  fenêtres ouvertes toutes seules au démarrage : '+(spontanees.length?spontanees.join(' · '):'aucune'));

  /* ── LE CONTRÔLE D'AFFICHAGE, porté sur une RACINE (la zone de contenu ou la fenêtre) ── */
  const SONDE=(racine)=>`
    const R=${racine}; if(!R) return null;
    /* ⛔ LA LARGEUR DE L'APPAREIL, PAS innerWidth : sur téléphone, une page qui déborde ÉLARGIT la
       fenêtre de mise en page, et innerWidth avec elle — mesuré contre elle, rien ne dépasse
       jamais (23 septembre 2026 : Pointage et le libellé du Planning, invisibles à cet audit). */
    const W=${P.w}, TACTILE=${P.tac};
    const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
      const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
    const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')
      +(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
    const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,a[href],[onclick],.pl-row,.list-row,input,select,textarea,label';
    const dansTiroirFerme=e=>{ const s=e.closest('.sidebar'); return !!(s && !s.classList.contains('open')); };
    const dansRouleau=e=>{ let n=e.parentElement;
      while(n && n!==document.body){ try{ const st=getComputedStyle(n);
        if(/auto|scroll/.test(st.overflowX) && n.scrollWidth>n.clientWidth+4) return true; }catch(x){}
        n=n.parentElement; } return false; };
    const tous=[...new Set([...R.querySelectorAll(SEL)])].filter(vis).filter(e=>!dansTiroirFerme(e));
    const out={ vus:tous.length, hors:[], tronques:[], petits:[], candidats:0, denses:[], zoom:[], sousMenu:0 };
    const candidats=[];
    for(const e of tous){
      const b=e.getBoundingClientRect();
      const t=(e.textContent||e.value||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,28);
      if((b.right>W+1.5 || b.left<-1.5) && !dansRouleau(e))
        out.hors.push({ n:nom(e), t, x:Math.round(b.left), d:Math.round(b.right) });
      if(!/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName)){
        for(const c of [e,...e.querySelectorAll('b,span,.tab-l,.pl-title,.plg-t')].slice(0,4)){
          if(!c.scrollWidth) continue;
          if(c.scrollWidth>c.clientWidth+2 && getComputedStyle(c).overflow!=='visible'){
            const bulle=!!(c.title||e.title||c.closest('[title]'));
            out.tronques.push({ n:nom(e), t:(c.textContent||'').trim().replace(/\\s+/g,' ').slice(0,28),
                                vu:Math.round(c.clientWidth), reel:Math.round(c.scrollWidth), bulle }); break; }
        }
      }
      /* ⛔ LE RECTANGLE N'EST PAS LA CIBLE. On retient ici ce qui est DESSINÉ sous 38 px ; la
         zone qui répond vraiment se mesure plus bas, élément par élément. Les liens de texte
         restent hors du compte — sauf l'appel et le courriel, qu'on touche sur le terrain. */
      if(TACTILE && b.height<37.5 && e.tagName!=='LABEL'
         && (e.tagName!=='A' || /^(tel|mailto):/i.test(e.getAttribute('href')||''))
         && !(e.tagName==='INPUT' && /checkbox|radio/.test(e.type))){
        /* ⛔ ÉCARTÉS PAR DÉCISION ÉCRITE (app.html, bloc « au doigt ») : les cases des grilles
           de planning, de la frise, et les tableaux. Comptés à part et NOMMÉS. */
        if(e.closest('.pg-pt,.tdb-pc,.tdb-cel,.plm-card,.tbl')) out.denses.push(nom(e));
        else candidats.push({e, n:nom(e), t, h:Math.round(b.height*10)/10});
      }
    }
    /* LA ZONE QUI RÉPOND : sur la verticale du centre, combien de pixels d'affilée déclenchent
       CET élément — lui-même, son libellé, ou la rangée / l'enrobe qui fait suivre le tap
       (même règle que l'écouteur de l'application, recopiée pour mesurer ce qu'elle rend). */
    const CH='input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]),select,textarea';
    const declenche=(e,x,y)=>{
      const h=document.elementFromPoint(x,y); if(!h) return false;
      if(h===e||e.contains(h)) return true;
      const lab=h.closest&&h.closest('label'); if(lab&&lab.control===e) return true;
      if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !h.closest('input,select,textarea,button,a,label,.chip,[onclick],[contenteditable="true"]')){
        const r=h.closest('.frow');
        if(r){ const c=r.querySelectorAll(CH); return c.length===1&&c[0]===e; }
        for(let n=h,k=0; n&&n!==document.body&&k<4; n=n.parentElement,k++){
          const f=[...n.children].filter(x=>x.matches(CH));
          if(!f.length) continue;
          return f.length===1 && f[0]===e && n.getBoundingClientRect().height<=64;
        }
      }
      return false; };
    for(const c of candidats.slice(0,80)){
      c.e.scrollIntoView({block:'center',inline:'nearest'});
      await new Promise(r=>requestAnimationFrame(r));
      const b=c.e.getBoundingClientRect(), cx=b.left+b.width/2, cy=b.top+b.height/2;
      let eff=0;
      for(const sg of [1,-1]) for(let d=(sg>0?0:1); d<=30; d++){ const y=cy+sg*d;
        if(y<0||y>=innerHeight||cx<0||cx>=innerWidth) break;
        if(declenche(c.e,cx,y)) eff++; else break; }
      if(eff===0){ const h0=document.elementFromPoint(cx,cy); let menu=false;
        for(let n=h0;n&&n!==document.body;n=n.parentElement){ const st=getComputedStyle(n);
          if((st.position==='absolute'||st.position==='fixed')&&(parseInt(st.zIndex)||0)>=10
             &&!n.closest('.topbar,.tabbar,#tabbar,.rf-tabs,#assistant,.fab')){ menu=true; break; } }
        if(menu && h0 && !c.e.contains(h0)){ out.sousMenu++; continue; } }
      if(eff<37.5) out.petits.push({ n:c.n, t:c.t, h:c.h, eff });
    }
    out.candidats=candidats.length;
    /* ⛔ SAFARI ZOOME LA PAGE SUR UN CHAMP DE MOINS DE 16 PX, ET NE DÉZOOME JAMAIS. La règle
       tactile pose 16 px sur input[type=text] — un champ SANS attribut type (« Rechercher »
       de Mouvements, 13,2 px en style direct) lui échappait. On compte ce que le navigateur
       calcule, pas ce que la feuille croit viser. */
    if(TACTILE) for(const f of R.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=hidden]):not([type=button]):not([type=submit]),select,textarea')){
      if(!vis(f)||dansTiroirFerme(f)) continue;
      const fs=parseFloat(getComputedStyle(f).fontSize);
      if(fs<15.5) out.zoom.push({ n:nom(f), t:(f.placeholder||f.value||'').trim().slice(0,28), fs:Math.round(fs*10)/10 });
    }
    /* ⛔ CE QUI NE SE CLIQUE PAS SE LIT AUSSI. « OP GEST… » a échappé à trois audits parce
       qu'ils ne mesuraient que les cibles cliquables. Les titres, sous-titres et étiquettes
       de la racine ET de la barre du haut sont désormais relus. */
    out.titres=[]; out.titresBarre=[];
    const TIT='.topbar-brand,.topbar-title h1,.ph-title,.ph-sub,.modal-head h3,.card-head h3,.card-title,.kpi-lbl,.sheet-head h3,h1,h2,h3';
    const titres=[...new Set([...R.querySelectorAll(TIT),...document.querySelectorAll('.topbar .topbar-brand,.topbar .topbar-title h1')])]
      .filter(vis).filter(e=>!dansTiroirFerme(e));
    out.vus+=titres.length;
    for(const e of titres){
      if(e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='visible')
        /* le titre RÉDUIT de la barre (défilé, en rubrique) se coupe avec « … » comme sur iOS :
           le grand titre du contenu le porte en entier. Compté à part et nommé. */
        (e.closest('.topbar-title')&&getComputedStyle(e).textOverflow==='ellipsis'?out.titresBarre:out.titres)
          .push({ n:nom(e), t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,34),
                          vu:Math.round(e.clientWidth), reel:Math.round(e.scrollWidth), bulle:!!(e.title||e.closest('[title]')) });
    }
    return out;`;

  /* ⛔⛔ RECOUVERT — la version 3, la seule juste : on amène chaque élément au MILIEU de
     l'écran et on demande qui est dessus. Un élément FIXE se juge où il est. */
  const COUVERTS=(racine)=>`
    const R=${racine}; if(!R) return [];
    const nom=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
    const vis=e=>{const b=e.getBoundingClientRect(); const st=getComputedStyle(e);
      return b.width>6&&b.height>6&&st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05;};
    const cliq=x=>x&&x.closest?(x.closest('button,.btn,.chip,.tab,.pl-row,.list-row,[onclick],input,select,textarea,label')||x):x;
    const dansTiroirFerme=e=>{ const s=e.closest('.sidebar'); return !!(s && !s.classList.contains('open')); };
    const tous=[...R.querySelectorAll('button,.btn,.chip,.tab,.pl-row,.list-row,a[href],[onclick],input,select,textarea')]
      .filter(vis).filter(e=>!dansTiroirFerme(e)).slice(0,60);
    const out=[];
    for(const e of tous){
      const fixe=getComputedStyle(e).position==='fixed' || !!e.closest('.tabbar,#assistant,.topbar,.fab');
      if(!fixe){ e.scrollIntoView({block:'center',inline:'nearest'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }
      const b=e.getBoundingClientRect();
      if(b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth) continue;
      const d=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      if(!d||d===e||e.contains(d)||d.contains(e)||cliq(d)===cliq(e)) continue;
      out.push({ e, n:nom(cliq(e)), t:(e.textContent||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,28), par:nom(cliq(d)) });
    }
    /* ⛔ SECONDE LECTURE : un recouvrement se confirme 400 ms plus tard, ou il n'en est pas un */
    if(out.length){ await new Promise(r=>setTimeout(r,400)); }
    const reste=[];
    for(const x of out){ const e=x.e;
      const fixe=getComputedStyle(e).position==='fixed' || !!e.closest('.tabbar,#assistant,.topbar,.fab');
      if(!fixe){ e.scrollIntoView({block:'center',inline:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }
      const b=e.getBoundingClientRect(); if(b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth) continue;
      const d=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
      if(!d||d===e||e.contains(d)||d.contains(e)||cliq(d)===cliq(e)||d===document.documentElement) continue;
      /* ⛔ SOUS UN MENU OUVERT, C'EST VOULU. L'exploration ouvre des menus (« Toutes les box »,
         « Équipe ▾ ») et audite l'écran menu ouvert : ce qui est dessous est couvert par
         construction. Un panneau flottant = un ancêtre du recouvreur en position absolue ou
         fixe, z-index 10 ou plus, hors de la charpente (barres, bouton flottant). On le compte
         et on le NOMME à part ; il ne passe pas pour un défaut. */
      let menu=false;
      for(let n=d;n&&n!==document.body;n=n.parentElement){ const st=getComputedStyle(n);
        if((st.position==='absolute'||st.position==='fixed')&&(parseInt(st.zIndex)||0)>=10
           &&!n.closest('.topbar,.tabbar,#tabbar,.rf-tabs,#assistant,.fab')){ menu=true; break; } }
      reste.push({ n:x.n, t:x.t, par:nom(cliq(d)), menu }); }
    return reste;`;

  /* ── L'ÉTAT OBSERVABLE : c'est lui qui dit quelle sorte d'écran profond s'est ouvert ── */
  const ETAT=`
    const c=document.getElementById('content');
    const tt=document.querySelector('#page-head .ph-title, #page-head h1');
    const actifs=c?[...c.querySelectorAll('.on,.active,[aria-pressed="true"],[aria-selected="true"]')]
      .filter(e=>e.getBoundingClientRect().width>4).map(e=>(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,18)).filter(Boolean).slice(0,8).join('|'):'';
    /* ⛔ L'ONGLET « Liste » DE BONS NE PORTE AUCUNE CLASSE D'ÉTAT : son choix se lit dans le
       contenu, pas dans un .on/.active. Premier essai : 0 sous-vue sur 66 clics. On garde donc
       une EMPREINTE du contenu — c'est elle qui change quand on change d'onglet. */
    const h=c?c.innerHTML:''; let e=0; for(let i=0;i<h.length;i+=7) e=(e*31+h.charCodeAt(i))>>>0;
    return { vue:(typeof current!=='undefined'?current:''), ov:${OUVERTE}, titre:(tt?tt.textContent:'').trim().replace(/\\s+/g,' ').slice(0,50),
             actifs, empreinte:h.length+':'+e };`;

  /* recensement : on ne rend que des IDENTITÉS ; on vise ensuite par SIGNATURE */
  const RECENSER=`
    const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
      const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
    const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,[onclick],.pl-row,.list-row';
    const zones=[document.getElementById('content'),document.querySelector('#page-head .ph-actions'),
                 document.getElementById('topbar-actions')].filter(Boolean);
    const vu=new Set(), out=[], occ={};
    zones.forEach(z=>[...z.querySelectorAll(SEL)].forEach(e=>{
      if(vu.has(e)||!vis(e)) return;
      if([...e.querySelectorAll(SEL)].some(x=>vis(x))) return;       /* le plus profond gagne */
      vu.add(e);
      const t=(e.textContent||e.getAttribute('aria-label')||e.title||'').trim().replace(/\\s+/g,' ').slice(0,44);
      const n=e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
      /* le GENRE d'une cible : son gestionnaire, identifiants gommés — deux lignes d'une même
         liste ouvrent le même gabarit, on n'a pas besoin de les ouvrir toutes pour l'auditer */
      const oc=(e.getAttribute('onclick')||'').replace(/'[^']*[0-9][^']*'/g,"'…'").replace(/\\d+/g,'#').slice(0,60);
      const genre=oc||(n+'|'+t);
      const cle=n+'|'+t; occ[cle]=(occ[cle]||0)+1;
      out.push({ sig:cle+'#'+occ[cle], t, n, genre });
    }));
    return out;`;
  const FRAPPER=(sig)=>RECENSER.replace('return out;',
    `const i=out.findIndex(o=>o.sig===${JSON.stringify(sig)}); if(i<0) return false; [...vu][i].click(); return true;`);

  /* ⛔⛔ UNE TRANSITION DE VUE REND `html` À TOUT TEST DE POINTAGE — mesuré le 22 septembre
     2026 : 60 et 450 ms après go(), le centre d'un bouton rendait `html` ; à 1 200 ms,
     l'élément lui-même. C'est ce qui avait fabriqué 507 « recouverts sous html » sur la
     passe bureau. On attend donc la FIN RÉELLE : plus aucune animation ::view-transition
     ET le centre de l'écran de nouveau atteignable. Plafond 2,3 s, jamais un délai deviné. */
  const ATTENDRE_VUE=`await new Promise(r=>setTimeout(r,250));
    for(let i=0;i<20;i++){
      const vt=document.getAnimations().filter(a=>a.effect&&a.effect.pseudoElement&&/view-transition/.test(a.effect.pseudoElement)&&a.playState==='running').length;
      const c=document.elementFromPoint(innerWidth/2,innerHeight/2);
      if(!vt && c && c!==document.documentElement) return i;
      await new Promise(r=>setTimeout(r,100)); }
    return 99;`;
  const attendreVue=async()=>{ try{ await S.ev(ATTENDRE_VUE); }catch(e){} };

  let CATS=await S.ev(`return NAV.flatMap(g=>g.items).filter(x=>x.k&&views[x.k]&&(!${JSON.stringify(!!process.env.ROLE)}||canSee(x))).map(x=>x.k);`);
  /* essai court : SEULES=interventions,clients — pour prouver la sonde avant la vraie passe */
  if(process.env.SEULES){ const s=process.env.SEULES.split(','); CATS=CATS.filter(k=>s.includes(k)); }
  console.log('  catégories : '+CATS.length);
  if(CATS.length<(process.env.ROLE?6:20) && !process.env.SEULES){ console.log('  ✗ population trop maigre'); S.fermer(); process.exit(4); }

  /* Les plafonds tiennent une passe sur douze appareils dans un temps raisonnable. Pour la passe
     « bouton par bouton » (Justin, 23 septembre 2026), on les lève par l'environnement :
     TOUT=1 → chaque commande de chaque rubrique, chaque sous-vue distincte, sans limite de temps
     raisonnable. Les plafonds restent COMPTÉS et imprimés dans les deux modes. */
  const TOUT=!!process.env.TOUT;
  const PARGENRE=TOUT?999:4, PARCAT_SEC=TOUT?1500:150, SOUSVUES_MAX=TOUT?999:14;
  const sousVues={}; let plafonnees=0;   /* ⛔ pas de plafond silencieux : on compte ce qu'on saute */
  const vus=new Set(), R={pages:[],hors:[],couverts:[],tronques:[],petits:[],titres:[],erreurs:[],spontanees:[],denses:[],zoom:[],sousMenu:[],titresBarre:[]};
  let candidatsTotal=0, sousMenuCibles=0;
  const par={rubrique:0,fenetre:0,fiche:0,sousvue:0}, sautes={}; let clics=0, audits=0, elements=0;

  /* ⛔ UN DÉFAUT SE PROUVE PAR SA PHOTO, PRISE AU MOMENT OÙ ON LE TROUVE. Un chemin réécrit
     à la main pour « aller revoir » n'a pas retrouvé l'état que les vrais clics avaient
     atteint (« pas de Rédiger ») : on capture donc sur place, une fois par écran. */
  const PREUVES='/tmp/preuves'; try{ fs.mkdirSync(PREUVES,{recursive:true}); }catch(e){}
  let nPreuve=0;
  const photographier=async(cle)=>{ if(nPreuve>=60) return null;
    try{ const png=await S.c.envoyer('Page.captureScreenshot',{format:'png'});
      const f=PREUVES+'/'+PROFIL+'-'+String(++nPreuve).padStart(2,'0')+'.png';
      fs.writeFileSync(f,Buffer.from(png.data,'base64')); return f; }catch(e){ return null; } };
  /* ⛔ LA PAGE QUI GLISSE DE CÔTÉ. Le contrôle d'éléments ne regarde que ce qui se clique : une rangée
     d'indicateurs ou un libellé qui pousse la page lui échappe. On demande donc à la PAGE si elle
     dépasse la largeur de l'appareil, deux fois (règle du dépôt), et on nomme le plus haut élément
     qui dépasse sans être dans un cadre qui défile. */
  const PAGE=`await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    const W=${P.w}, marge=${P.tac?1:16};   /* au bureau, la barre de défilement verticale n'est pas un débordement */
    const sw=document.documentElement.scrollWidth; if(sw<=W+marge) return null;
    const rouleau=e=>{ for(let n=e.parentElement;n&&n!==document.body;n=n.parentElement){ const q=getComputedStyle(n); if(/auto|scroll|hidden|clip/.test(q.overflowX)&&n.getBoundingClientRect().right<=W+0.5) return true; } return false; };
    const tiroir=e=>{ const s=e.closest('.sidebar'); return !!(s&&!s.classList.contains('open')); };
    const l=[...document.querySelectorAll('body *')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0&&b.right>W+0.5&&getComputedStyle(e).position!=='fixed'&&!rouleau(e)&&!tiroir(e); });
    const h=l.filter(e=>!l.includes(e.parentElement))[0];
    return {page:sw, n:h?(h.tagName.toLowerCase()+(h.id?'#'+h.id:'')+(typeof h.className==='string'&&h.className?'.'+h.className.trim().split(/\\s+/).slice(0,2).join('.'):'')):'?', t:h?h.textContent.replace(/\\s+/g,' ').trim().slice(0,40):''};`;
  const auditer=async(cle,sorte,racine)=>{
    let o=null; try{ o=await S.ev(SONDE(racine)); }catch(e){ R.erreurs.push({ou:cle,e:'sonde : '+String(e.message).slice(0,90)}); return; }
    if(!o) return;
    try{ let pg=await S.ev(PAGE); if(pg){ await dormir(700); pg=await S.ev(PAGE); } if(pg) R.pages.push({...pg,ou:cle}); }catch(e){}
    let cv=[]; try{ cv=await S.ev(COUVERTS(racine)); }catch(e){}
    audits++; elements+=o.vus; par[sorte]++;
    const aProuver = o.hors.length || (P.tac && o.petits.length) || (o.titres||[]).length || cv.filter(x=>!x.menu).length;
    const preuve = aProuver ? await photographier(cle) : null;
    if(preuve){ [o.hors,o.petits,o.titres||[],cv].forEach(l=>l.forEach(x=>{ x.preuve=preuve; })); }
    o.hors.forEach(x=>R.hors.push({...x,ou:cle})); o.tronques.forEach(x=>R.tronques.push({...x,ou:cle}));
    o.petits.forEach(x=>R.petits.push({...x,ou:cle}));
    cv.forEach(x=>(x.menu?R.sousMenu:R.couverts).push({...x,ou:cle})); sousMenuCibles+=o.sousMenu||0;
    (o.titres||[]).forEach(x=>R.titres.push({...x,ou:cle}));
    (o.denses||[]).forEach(x=>R.denses.push({n:x,ou:cle})); (o.zoom||[]).forEach(x=>R.zoom.push({...x,ou:cle}));
    (o.titresBarre||[]).forEach(x=>R.titresBarre.push({...x,ou:cle}));
    candidatsTotal+=o.candidats||0;
  };
  const norme=s=>(s||'').replace(/\d+/g,'#').replace(/\s+/g,' ').trim().slice(0,40);

  for(const k of CATS){
    const t0=Date.now(); const cliques=new Set(), parGenre={};
    await S.ev(`try{ go('${k}'); }catch(e){} window.scrollTo(0,0); window.dispatchEvent(new Event('scroll')); return 1;`); await attendreVue(); await ranger();
    await auditer('rubrique '+k,'rubrique',`document.getElementById('content')`);
    for(let tour=0; tour<400; tour++){
      if(Date.now()-t0>PARCAT_SEC*1000){ sautes[k]=(sautes[k]||0)+1; break; }
      const liste=await S.ev(RECENSER);
      const cible=liste.find(c=>!cliques.has(c.sig) && !ECARTS.some(([re])=>re.test(c.t))
                              && (parGenre[c.genre]||0)<PARGENRE);
      if(!cible) break;
      cliques.add(cible.sig); parGenre[cible.genre]=(parGenre[cible.genre]||0)+1;
      const avant=await S.ev(ETAT); const nErr=S.exceptions.length;
      const ok=await S.ev(FRAPPER(cible.sig)); if(!ok) continue;
      clics++; await dormir(120); await attendreVue();
      const apres=await S.ev(ETAT);
      const neuves=S.exceptions.slice(nErr);
      if(neuves.length) R.erreurs.push({ou:k+' → « '+cible.t+' »',e:neuves.join(' | ').slice(0,200)});

      let sorte=null, cle=null, racine=null;
      if(apres.ov && (!avant.ov || apres.ov.titre!==avant.ov.titre)){
        if(spontanees.includes(apres.ov.titre)) R.spontanees.push(k+' → '+apres.ov.titre);
        else { sorte='fenetre'; cle='fenêtre « '+norme(apres.ov.titre||cible.t)+' »';
               racine=`document.querySelector(${JSON.stringify(apres.ov.sel)})`; }
      } else if(apres.vue===k && apres.titre && apres.titre!==avant.titre){
        sorte='fiche'; cle=k+' › fiche « '+norme(apres.titre)+' »'; racine=`document.getElementById('content')`;
      } else if(apres.vue===k && (apres.actifs!==avant.actifs || apres.empreinte!==avant.empreinte)){
        /* une sous-vue se nomme par le geste qui l'ouvre : « bons › Liste » */
        const n=(sousVues[k]=(sousVues[k]||0)+1);
        if(n<=SOUSVUES_MAX){ sorte='sousvue'; cle=k+' › « '+norme(cible.t)+' »'; racine=`document.getElementById('content')`; }
        else plafonnees++;
      }
      if(sorte && !vus.has(cle)){ vus.add(cle); await auditer(cle,sorte,racine); }

      await ranger();
      await S.ev(`try{ if(document.documentElement.getAttribute('data-theme')!=='${P.theme==='light'?'light':'dark'}') setThemePref('${P.theme}'); }catch(e){}
        try{ if((localStorage.getItem('elanB_lang')||'fr')!=='fr') setLang('fr'); }catch(e){}
        try{ go('${k}'); }catch(e){} return 1;`);
      await attendreVue();
    }
    console.log('  '+k.padEnd(20)+' '+String(cliques.size).padStart(3)+' clics · '+vus.size+' écrans profonds distincts jusqu’ici');
  }

  const grouper=(l,f)=>{ const m={}; l.forEach(x=>{ const g=f(x); (m[g]=m[g]||[]).push(x); }); return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };
  console.log('\n════════ AUDIT DES ÉCRANS PROFONDS — '+PROFIL+' ════════');
  console.log('  page mesurée : '+S.version);
  console.log('  population : '+clics+' clics depuis '+CATS.length+' rubriques → '+audits+' écrans profonds audités, '+elements+' éléments mesurés');
  console.log('     rubriques '+par.rubrique+' · fenêtres '+par.fenetre+' · fiches '+par.fiche+' · sous-vues '+par.sousvue);
  if(Object.keys(sautes).length) console.log('  ⚠ rubriques arrêtées au plafond de temps : '+Object.keys(sautes).join(', '));
  console.log('  sous-vues non auditées (plafond de '+SOUSVUES_MAX+' par rubrique) : '+plafonnees);
  console.log('  fenêtres spontanées rencontrées pendant l’exploration : '+R.spontanees.length);
  console.log('  ⚠ couches qu’il a fallu CACHER (ni ✕, ni Échap, ni le fond ne les fermaient) : '+fermees.length);
  [...new Set(fermees)].slice(0,12).forEach(x=>console.log('      · '+x));
  console.log('\n══ ERREURS JAVASCRIPT : '+R.erreurs.length+' ══');
  R.erreurs.slice(0,20).forEach(x=>console.log('   '+x.ou+'\n      '+x.e));
  console.log('\n══ PAGES QUI GLISSENT DE CÔTÉ (plus larges que l’appareil, '+P.w+' px) : '+R.pages.length+' ══');
  grouper(R.pages,x=>x.n).slice(0,15).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+' « '+v[0].t+' »   page '+v[0].page+' px   ex. '+v[0].ou));
  console.log('\n══ HORS DE L’ÉCRAN : '+R.hors.length+' ══');
  grouper(R.hors,x=>x.ou).slice(0,15).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. '+v[0].n+' « '+v[0].t+' » x '+v[0].x+'→'+v[0].d+(v[0].preuve?'   ['+v[0].preuve+']':'')));
  console.log('\n══ RECOUVERTS (candidat centré) : '+R.couverts.length+' ══');
  grouper(R.couverts,x=>x.ou).slice(0,15).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. '+v[0].n+' « '+v[0].t+' » sous '+v[0].par));
  console.log('     (sous un menu OUVERT par l’exploration, donc couverts exprès : '+R.sousMenu.length+' éléments sur '
    +new Set(R.sousMenu.map(x=>x.ou)).size+' écrans, et '+sousMenuCibles+' petites cibles — '
    +[...new Set(R.sousMenu.map(x=>x.ou))].slice(0,5).join(' · ')+')');
  console.log('\n══ TRONQUÉS SANS INFOBULLE : '+R.tronques.filter(x=>!x.bulle).length+'  (avec infobulle : '+R.tronques.filter(x=>x.bulle).length+') ══');
  grouper(R.tronques.filter(x=>!x.bulle),x=>x.ou).slice(0,15).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. '+v[0].n+' « '+v[0].t+' » '+v[0].vu+'/'+v[0].reel));
  console.log('\n══ TITRES COUPÉS : '+R.titres.length+' ══');
  grouper(R.titres,x=>x.n+' « '+x.t+' »').slice(0,15).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'  '+v[0].vu+'/'+v[0].reel+(v[0].bulle?' (infobulle)':'')+'   ex. '+v[0].ou));
  console.log('     (titre réduit de la barre, coupé avec « … » comme sur iOS — le grand titre du contenu le porte en entier : '
    +R.titresBarre.length+(R.titresBarre.length?' — '+[...new Set(R.titresBarre.map(x=>x.t))].slice(0,5).join(' · '):'')+')');
  if(P.tac){ console.log('\n══ CIBLES DONT LA ZONE QUI RÉPOND FAIT MOINS DE 38 px : '+R.petits.length+' ══');
    console.log('     population : '+candidatsTotal+' cibles DESSINÉES sous 38 px, chacune mesurée au doigt (rangée, libellé, enrobe compris)');
    console.log('     écartées par décision écrite (grilles de planning, frise, tableaux) : '+R.denses.length+' — '+[...new Set(R.denses.map(x=>x.n))].slice(0,6).join(', '));
    grouper(R.petits,x=>x.n+' « '+x.t+' »').slice(0,25).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   '+v[0].h+' px dessiné · '+v[0].eff+' px qui répondent   ex. '+v[0].ou+(v[0].preuve?'   ['+v[0].preuve+']':'')));
    console.log('\n══ CHAMPS SOUS 16 px (Safari zoome la page au toucher) : '+R.zoom.length+' ══');
    grouper(R.zoom,x=>x.n+' « '+x.t+' »').slice(0,25).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   '+v[0].fs+' px   ex. '+v[0].ou)); }
  console.log('\n══ LES ÉCRANS PROFONDS AUDITÉS ══');
  [...vus].forEach(v=>console.log('   · '+v));
  fs.writeFileSync(__dirname+'/audit-profond-'+PROFIL+(TOUT?'-tout':'')+(process.env.LONGUES?'-longues':'')+(process.env.ROLE?'-'+process.env.ROLE:'')+'.json',JSON.stringify({version:S.version,profil:PROFIL,tout:TOUT,sautes,plafonnees,clics,audits,elements,par,ecrans:[...vus],fermees,...R},null,0));
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
