/* ══ AUDIT DES CLICS, ÉTAPE 2 — CHAQUE BOUTON, Y COMPRIS DANS CE QUI S'OUVRE ════════════
   Justin, 22 septembre 2026 : « tu finis de tout vérifier », puis « 1 après 2 après 3 ».
   Étape 2 : APPUYER sur chaque bouton de chaque rubrique ET de chaque fenêtre qu'elle
   ouvre (niveau 2), sur les deux profils (téléphone nuit, bureau jour).

   ⛔ CE QUE LA PREMIÈRE PASSE DE CLICS A APPRIS, ET QUI EST ENCODÉ ICI :
   · viser par INDEX ne clique pas : 49 frappes sur 1 027 atteignaient leur cible. On
     recense à NEUF avant chaque frappe et on vise par SIGNATURE ;
   · `current` est un `let` : `window.current` vaut toujours undefined — le « vue 0 » de la
     première passe venait de là ;
   · un zéro ne se croit qu'après deux contre-épreuves : un clic qui JETTE doit être vu, un
     clic SANS EFFET doit être vu comme inerte ;
   · une fenêtre n'est pas « ce qui vit dans #overlay » : on cherche la couche fixe qui
     couvre le centre, et on la referme comme un utilisateur (✕, Échap, le fond).
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.

   Usage : node scratchpad/audit-clics2.js <profil>  (voir scratchpad/profils.js)         */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const PROFIL=process.argv[2]||'tel';
/* les appareils vivent dans UNE table, partagée avec l'autre sonde (scratchpad/profils.js) */
const {profil,poserProfil}=require(path.join(__dirname,'profils.js'));
const P = profil(PROFIL);

/* ⛔ CE QU'ON NE CLIQUE PAS — sortir de la session, détruire la base d'essai, ou changer la
   langue de toute l'interface (les libellés suivants ne se reconnaîtraient plus). */
const ECARTS=[
  [/d[ée]connexion|se d[ée]connecter|quitter l.espace|changer d.espace|^quitter$/i,'sortirait de la session'],
  [/tout effacer|r[ée]initialiser|repartir [àa] neuf|vider la base|supprimer (le compte|l.espace|mon compte)/i,'détruit la base d’essai'],
  [/^(fran[çc]ais|english|espa[ñn]ol|deutsch|italiano|portugu[êe]s|nederlands|polski|rom[âa]n[ăa]|t[üu]rk[çc]e|العربية)$/i,'changerait la langue de toute l’interface'],
];

(async()=>{
  const S=await ouvrir();
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
    const W=innerWidth, TACTILE=${P.tac};
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
    const out={ vus:tous.length, hors:[], tronques:[], petits:[], candidats:0 };
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
      if(TACTILE && b.height<37.5 && !e.closest('.tbl') && e.tagName!=='A' && e.tagName!=='LABEL'
         && !(e.tagName==='INPUT' && /checkbox|radio/.test(e.type)))
        out.petits.push({ n:nom(e), t, h:Math.round(b.height*10)/10 });
    }
    /* ⛔ CE QUI NE SE CLIQUE PAS SE LIT AUSSI. « OP GEST… » a échappé à trois audits parce
       qu'ils ne mesuraient que les cibles cliquables. Les titres, sous-titres et étiquettes
       de la racine ET de la barre du haut sont désormais relus. */
    out.titres=[];
    const TIT='.topbar-brand,.topbar-title h1,.ph-title,.ph-sub,.modal-head h3,.card-head h3,.card-title,.kpi-lbl,.sheet-head h3,h1,h2,h3';
    const titres=[...new Set([...R.querySelectorAll(TIT),...document.querySelectorAll('.topbar .topbar-brand,.topbar .topbar-title h1')])]
      .filter(vis).filter(e=>!dansTiroirFerme(e));
    out.vus+=titres.length;
    for(const e of titres){
      if(e.scrollWidth>e.clientWidth+2 && getComputedStyle(e).overflow!=='visible')
        out.titres.push({ n:nom(e), t:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,34),
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
      out.push({ n:nom(cliq(e)), t:(e.textContent||e.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,28), par:nom(cliq(d)) });
    }
    return out;`;

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
             actifs, empreinte:h.length+':'+e,
             toast:[...document.querySelectorAll('.toast,.snack,.notif-toast')].map(t=>(t.textContent||'').trim().slice(0,30)).join('¦') };`;

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
      /* ⛔ LES CHIFFRES SONT GOMMÉS DE LA SIGNATURE. Premier passage au téléphone : la tuile
         « 571 Mouvements au journal » a été frappée QUARANTE ET UNE fois, parce que chaque
         clic d'ailleurs (les simulations de la bêta) changeait son compteur, donc sa
         signature — et Mouvements a fini au plafond de temps sur une seule tuile. */
      const cle=n+'|'+t.replace(/\\d+/g,'#'); occ[cle]=(occ[cle]||0)+1;
      out.push({ sig:cle+'#'+occ[cle], t, n, genre });
    }));
    return out;`;
  const FRAPPER=(sig)=>RECENSER.replace('return out;',
    `const i=out.findIndex(o=>o.sig===${JSON.stringify(sig)}); if(i<0) return false; [...vu][i].click(); return true;`);

  /* ⛔⛔ DEUX CONTRE-ÉPREUVES AVANT DE CROIRE UN ZÉRO */
  { const n0=S.exceptions.length;
    await S.ev(`const b=document.createElement('button'); b.textContent='témoin';
      b.onclick=function(){ throw new Error('SONDE-TEMOIN'); }; document.getElementById('content').appendChild(b); b.click(); b.remove(); return 1;`);
    await dormir(300);
    const vu=S.exceptions.slice(n0).some(x=>/SONDE-TEMOIN/.test(x));
    console.log('  contre-épreuve 1 — un clic qui jette est '+(vu?'VU ✓':'INVISIBLE ✗'));
    if(!vu){ S.fermer(); process.exit(3); }
    await S.ev(`const b=document.createElement('button'); b.id='__muet'; b.textContent='muet'; b.style.cssText='position:fixed;left:-9999px';
      b.onclick=function(){}; document.body.appendChild(b); return 1;`);
    await dormir(300);
    const a=await S.ev(ETAT); await S.ev(`document.getElementById('__muet').click(); return 1;`); await dormir(300); const b=await S.ev(ETAT);
    await S.ev(`const x=document.getElementById('__muet'); if(x) x.remove(); return 1;`);
    const inerte=JSON.stringify(a)===JSON.stringify(b);
    console.log('  contre-épreuve 2 — un clic sans effet est '+(inerte?'VU comme inerte ✓':'INVISIBLE ✗'));
    if(!inerte){ console.log('      ce qui a bougé : '+JSON.stringify(a).slice(0,160)+' → '+JSON.stringify(b).slice(0,160)); S.fermer(); process.exit(5); } }

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

  let CATS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`);
  /* essai court : SEULES=interventions,clients — pour prouver la sonde avant la vraie passe */
  if(process.env.SEULES){ const s=process.env.SEULES.split(','); CATS=CATS.filter(k=>s.includes(k)); }
  console.log('  catégories : '+CATS.length);
  if(CATS.length<20 && !process.env.SEULES){ console.log('  ✗ population trop maigre'); S.fermer(); process.exit(4); }

  const PARGENRE=1e9, PARCAT_SEC=260, SOUSVUES_MAX=0;
  const sousVues={}; let plafonnees=0;   /* ⛔ pas de plafond silencieux : on compte ce qu'on saute */
  const vus=new Set(), R={hors:[],couverts:[],tronques:[],petits:[],titres:[],erreurs:[],spontanees:[],inertes:[]};
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
  const auditer=async(cle,sorte,racine)=>{
    let o=null; try{ o=await S.ev(SONDE(racine)); }catch(e){ R.erreurs.push({ou:cle,e:'sonde : '+String(e.message).slice(0,90)}); return; }
    if(!o) return;
    let cv=[]; try{ cv=await S.ev(COUVERTS(racine)); }catch(e){}
    audits++; elements+=o.vus; par[sorte]++;
    const aProuver = o.hors.length || (P.tac && o.petits.length) || (o.titres||[]).length || cv.length;
    const preuve = aProuver ? await photographier(cle) : null;
    if(preuve){ [o.hors,o.petits,o.titres||[],cv].forEach(l=>l.forEach(x=>{ x.preuve=preuve; })); }
    o.hors.forEach(x=>R.hors.push({...x,ou:cle})); o.tronques.forEach(x=>R.tronques.push({...x,ou:cle}));
    o.petits.forEach(x=>R.petits.push({...x,ou:cle})); cv.forEach(x=>R.couverts.push({...x,ou:cle}));
    (o.titres||[]).forEach(x=>R.titres.push({...x,ou:cle}));
  };
  const norme=s=>(s||'').replace(/\d+/g,'#').replace(/\s+/g,' ').trim().slice(0,40);

  /* ── NIVEAU 2 : dans une fenêtre, on appuie sur chaque commande. Avant chaque frappe on
     s'assure que la fenêtre est OUVERTE — sinon on la rouvre par le même clic de niveau 1. ── */
  let clics2=0, fenetres2=0, plafond2=0; const rates2=[];
  const RECENSER2=(sel)=>RECENSER
    .replace("const zones=[document.getElementById('content'),document.querySelector('#page-head .ph-actions'),\n                 document.getElementById('topbar-actions')].filter(Boolean);",
             "const zones=[document.querySelector("+JSON.stringify(sel)+")].filter(Boolean);")
    .replace("const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,[onclick],.pl-row,.list-row';",
             "const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,.seg button,[onclick],.pl-row,.list-row,label,input[type=checkbox],input[type=radio],select';");
  const niveau2=async(k, sig1, ov, cle)=>{
    fenetres2++; const faits=new Set(); const t0=Date.now();
    for(let tour=0; tour<80; tour++){
      if(Date.now()-t0>100000){ plafond2++; break; }
      let o=await S.ev(`return ${OUVERTE};`);
      if(!o || o.titre!==ov.titre){
        await ranger(); await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(420);
        const ok=await S.ev(FRAPPER(sig1)); if(!ok){ rates2.push(cle+' : impossible de rouvrir'); break; }
        await dormir(650); o=await S.ev(`return ${OUVERTE};`);
        if(!o || o.titre!==ov.titre){ rates2.push(cle+' : ne se rouvre pas pareil'); break; }
      }
      const R2=RECENSER2(o.sel);
      /* ⛔ garde RÉELLE : le recensement doit viser la fenêtre et rien d'autre (l'ancienne
         garde cherchait « document.querySelector( », déjà présent dans l'original : creuse) */
      if(R2===RECENSER || !R2.includes('document.querySelector('+JSON.stringify(o.sel)+')')){ rates2.push(cle+' : recensement non ciblé'); break; }
      const liste=await S.ev(R2);
      const c=liste.find(x=>!faits.has(x.sig) && !ECARTS.some(([re])=>re.test(x.t)));
      if(!c) break;
      faits.add(c.sig);
      const nErr=S.exceptions.length;
      const ok=await S.ev(R2.replace('return out;',
        `const i=out.findIndex(o=>o.sig===${JSON.stringify(c.sig)}); if(i<0) return false; [...vu][i].click(); return true;`));
      if(!ok) continue;
      clics2++; await dormir(480);
      const neuves=S.exceptions.slice(nErr);
      if(neuves.length) R.erreurs.push({ou:cle+' → « '+c.t+' »', e:neuves.join(' | ').slice(0,200)});
    }
    await ranger();
  };

  for(const k of CATS){
    const t0=Date.now(); const cliques=new Set(), parGenre={};
    await S.ev(`try{ go('${k}'); }catch(e){} window.scrollTo(0,0); window.dispatchEvent(new Event('scroll')); return 1;`); await attendreVue(); await ranger();
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
      /* ── inertie : rien n'a bougé du tout ── */
      if(!neuves.length && apres.vue===avant.vue && JSON.stringify(apres.ov)===JSON.stringify(avant.ov)
         && apres.empreinte===avant.empreinte && apres.titre===avant.titre && apres.toast===avant.toast)
        R.inertes.push({ou:k, t:cible.t, n:cible.n});
      /* ── niveau 2 : une fenêtre neuve s'est ouverte → on appuie sur tout ce qu'elle contient ── */
      if(sorte==='fenetre' && !vus.has(cle)){ vus.add(cle); await niveau2(k, cible.sig, apres.ov, cle); }

      await ranger();
      await S.ev(`try{ if(document.documentElement.getAttribute('data-theme')!=='${P.theme==='light'?'light':'dark'}') setThemePref('${P.theme}'); }catch(e){}
        try{ if((localStorage.getItem('elanB_lang')||'fr')!=='fr') setLang('fr'); }catch(e){}
        try{ go('${k}'); }catch(e){} return 1;`);
      await attendreVue();
    }
    console.log('  '+k.padEnd(20)+' '+String(cliques.size).padStart(3)+' clics · '+vus.size+' écrans profonds distincts jusqu’ici');
  }

  const grouper=(l,f)=>{ const m={}; l.forEach(x=>{ const g=f(x); (m[g]=m[g]||[]).push(x); }); return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };
  console.log('\n════════ AUDIT DES CLICS, ÉTAPE 2 — '+PROFIL+' ════════');
  console.log('  page mesurée : '+S.version);
  console.log('  niveau 1 : '+clics+' clics réels sur '+CATS.length+' rubriques');
  console.log('  niveau 2 : '+clics2+' clics réels dans '+fenetres2+' fenêtres distinctes');
  if(Object.keys(sautes).length) console.log('  ⚠ rubriques arrêtées au plafond de temps : '+Object.keys(sautes).join(', '));
  console.log('  ⚠ fenêtres arrêtées au plafond de temps : '+plafond2);
  console.log('  ⚠ fenêtres qu’on n’a pas pu rouvrir pour continuer : '+rates2.length);
  rates2.slice(0,10).forEach(x=>console.log('      · '+x));
  console.log('  ⚠ couches qu’il a fallu CACHER (ni ✕, ni Échap, ni le fond) : '+fermees.length);
  [...new Set(fermees)].slice(0,10).forEach(x=>console.log('      · '+x));
  console.log('\n══ CLICS QUI JETTENT : '+R.erreurs.length+' ══');
  R.erreurs.slice(0,30).forEach(x=>console.log('   '+x.ou+'\n      '+x.e));
  console.log('\n══ CLICS SANS EFFET OBSERVABLE (niveau 1) : '+R.inertes.length+'  — à VÉRIFIER, pas à accuser ══');
  grouper(R.inertes,x=>x.n+' « '+x.t+' »').slice(0,25).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ['+[...new Set(v.map(y=>y.ou))].slice(0,4).join(', ')+']'));
  fs.writeFileSync(__dirname+'/audit-clics2-'+PROFIL+'.json',JSON.stringify({version:S.version,profil:PROFIL,clics,clics2,fenetres2,plafond2,rates2,fermees,erreurs:R.erreurs,inertes:R.inertes},null,0));
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
