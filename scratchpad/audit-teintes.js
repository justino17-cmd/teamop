/* ══ AUDIT DES TEINTES, ÉTAPE 3 — LES NEUF COULEURS, ÉCRAN PAR ÉCRAN ═══════════════════
   Justin, 22 septembre 2026 : « 1 après 2 après 3 ». Étape 3 : les sept teintes qui
   n'avaient été balayées que par leurs jetons. Ici on regarde les ÉCRANS : 9 teintes ×
   2 thèmes × 42 rubriques = 756 écrans rendus, et sur chacun :

   1. TEXTE EN ACCENT — tout élément dont l'encre est une couleur d'accent, mesuré contre
      son VRAI fond (on remonte les ancêtres et on compose les fonds translucides jusqu'à
      un fond opaque). Seuil AA : 4,5:1, ou 3:1 pour un gros texte (≥ 24 px, ou ≥ 18,66 px
      gras). C'est le risque des teintes CLAIRES — orange, cyan, graphite de nuit.
   2. ENCRE SUR UN APLAT D'ACCENT — tout élément dont le FOND est un aplat d'accent et qui
      porte du texte : son encre contre cet aplat. C'est le risque d'un `color:#fff` écrit
      en dur, invisible sur le graphite de nuit (#F5F5F7).
   3. RESTE DE VERT — une couleur du vert par défaut qui survit à une autre teinte.

   ⛔ CE QUE LES DEUX PREMIÈRES VERSIONS DE LA SONDE DES TEINTES ONT APPRIS :
   · les noms de jetons se relisent dans la page, jamais de mémoire (cinq noms inventés) ;
   · une propriété personnalisée rend son TEXTE (« color-mix(…) »), pas une couleur : on
     résout sur un vrai élément, et on refuse de tourner si la cible ne se résout pas ;
   · la pastille d'initiales d'un technicien (span.av) porte SA couleur (TECH_PALETTE16),
     pas l'accent : écartée nommément après contre-épreuve ;
   · on compte la POPULATION de chaque famille : un zéro sur rien ne se cite pas.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                    */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
/* PLAT=winweb : la même passe SANS le verre (Android, Windows, tout ce qui n'est pas Safari 26) —
   les fonds y sont opaques, la composition est donc exacte ; sous le verre, elle ignore le flou
   et les pastilles se vérifient au pixel. */
const TEL=process.env.TEL==='1';                        /* profil téléphone : 390×844, tactile */
const PLAT=process.env.PLAT||(TEL?'iosweb':'macweb');
const RUB=(process.env.RUB||'').split(',').filter(Boolean);      /* rubriques à garder (vide = toutes) */
const ZPLUS=(process.env.ZONE_PLUS||'').split(',').filter(Boolean); /* chrome en plus : .sidebar, #tabbar… */
const FEN=process.env.FEN!=='0';                                  /* FEN=0 : sans les fenêtres */
const ACC_SEULS=(process.env.ACC||'').split(',').filter(Boolean);  /* teintes à garder (le vert reste : c'est la référence) */
const TH_SEULS=(process.env.TH||'').split(',').filter(Boolean);    /* thèmes à garder */
const TOUT=process.env.FAM==='tout';
const DETAIL=process.env.DETAIL==='1';                            /* DETAIL=1 : encre, fond et HTML de chaque reste */                              /* FAM=tout : TOUT texte, pas seulement l'accent */
const SUFFIXE=(TOUT?'-tout':'')+(TEL?'-tel':'')+(PLAT===(TEL?'iosweb':'macweb')?'':'-'+PLAT)+(ZPLUS.length?'-chrome':'')+(ACC_SEULS.length||TH_SEULS.length?'-extrait':'');

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',TEL?{width:390,height:844,deviceScaleFactor:2,mobile:true}:{width:1280,height:860,deviceScaleFactor:1,mobile:false});
  if(TEL) await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`window.confirm=()=>false; try{ setPlatForce('${PLAT}'); }catch(e){} return 1;`);
  console.log('  plateforme : '+PLAT+' · verre '+(await S.ev(`return document.documentElement.getAttribute('data-verre')||'éteint';`)));
  await dormir(5000);   /* les minuteurs de démarrage tirent avant qu'on mesure */
  await S.ev(`try{ closeModal(); }catch(e){} return 1;`);

  const ACCENTS=(await S.ev(`return Object.keys(ACCENTS);`)).filter(a=>!ACC_SEULS.length||ACC_SEULS.includes(a)||a==='green');
  const CATS=(await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`)).filter(k=>!RUB.length||RUB.includes(k));
  console.log('  teintes : '+ACCENTS.length+' · rubriques : '+CATS.length+' · thèmes : 2  → '+(ACCENTS.length*CATS.length*2)+' écrans');
  /* le plancher de population suit la demande : toutes les rubriques, ou celles qu'on a nommées */
  if(ACCENTS.length<(ACC_SEULS.length?1:8)||CATS.length<(RUB.length?RUB.length:20)){ console.log('  ✗ population trop maigre'); S.fermer(); process.exit(4); }

  const MESURE=`
    const lire=(v)=>{ if(!v) return null; v=v.trim();
      let m=v.match(/^rgba?\\(([^)]+)\\)$/);
      if(m){ const p=m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); if(p.length<3||p.some(isNaN)) return null;
             return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
      m=v.match(/^color\\(srgb ([^)]+)\\)$/);
      if(m){ const p=m[1].split(/[\\s\\/]+/).filter(Boolean).map(Number); if(p.length<3||p.some(isNaN)) return null;
             return {r:p[0]*255,g:p[1]*255,b:p[2]*255,a:p.length>3?p[3]:1}; }
      return null; };
    const lum=c=>{ const f=x=>{x/=255; return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);}; return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
    const ctr=(a,b)=>{ const l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); };
    const sur=(h,b)=>({ r:h.r*h.a+b.r*(1-h.a), g:h.g*h.a+b.g*(1-h.a), b:h.b*h.a+b.b*(1-h.a), a:1 });
    /* ── on résout les couleurs d'accent sur un VRAI élément ── */
    let so=document.getElementById('__so'); if(!so){ so=document.createElement('div'); so.id='__so';
      so.style.cssText='position:fixed;left:-9999px;top:0;width:8px;height:8px'; document.body.appendChild(so); }
    const res=k=>{ so.style.backgroundColor=''; so.style.backgroundColor='var('+k+')'; return lire(getComputedStyle(so).backgroundColor); };
    const ACC=['--acc','--acc-txt','--acc-fill','--acc2','--acc-fill-hover'].map(res).filter(c=>c&&c.a>0.9);
    if(!ACC.length) return {erreur:'cible vide'};
    const proche=(c,l,tol)=>c && l.some(t=>Math.abs(c.r-t.r)+Math.abs(c.g-t.g)+Math.abs(c.b-t.b)<=tol);
    /* ── le fond RÉEL : on compose les fonds des ancêtres jusqu'à un fond opaque ── */
    const base=lire(getComputedStyle(document.documentElement).backgroundColor);
    const pageFond=(base&&base.a>0.9)?base:(res('--bg')||{r:255,g:255,b:255,a:1});
    const fondDe=e=>{ const pile=[]; let n=e;
      while(n && n.nodeType===1){ const c=lire(getComputedStyle(n).backgroundColor); if(c&&c.a>0.01){ pile.push(c); if(c.a>0.99) break; } n=n.parentElement; }
      let f=(pile.length&&pile[pile.length-1].a>0.99)?pile.pop():pageFond;
      for(let i=pile.length-1;i>=0;i--) f=sur(pile[i],f); return f; };
    const ECARTES=['av'];   /* span.av : la couleur du TECHNICIEN, pas l'accent — contre-épreuve faite */
    const nom=e=>e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'');
    const zone=(typeof ZONE!=='undefined'&&ZONE)?[document.querySelector(ZONE)].filter(Boolean)
      :[document.getElementById('content'),document.querySelector('.topbar'),document.getElementById('page-head')]
         .concat(${JSON.stringify(ZPLUS)}.flatMap(q=>[...document.querySelectorAll(q)])).filter(Boolean);
    const out={ texteAcc:0, aplats:0, aplatsTous:0, textes:0, faibles:[], restes:[] };
    const vus=new Set();
    zone.forEach(z=>z.querySelectorAll('*').forEach(e=>{
      if(vus.has(e)) return; vus.add(e);
      if(typeof e.className==='string' && ECARTES.some(c=>e.classList.contains(c))) return;
      const b=e.getBoundingClientRect(); if(b.width<3||b.height<3) return;
      const st=getComputedStyle(e); if(st.visibility==='hidden'||st.display==='none'||+st.opacity<0.3) return;
      /* texte PROPRE à l'élément (pas celui de ses enfants) */
      const propre=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>0);
      const encre=lire(st.color), fond=lire(st.backgroundColor);
      const gros=parseFloat(st.fontSize)>=24 || (parseFloat(st.fontSize)>=18.66 && +st.fontWeight>=700);
      const seuil=gros?3:4.5;
      if(propre && proche(encre,ACC,6)){
        out.texteAcc++;
        const c=ctr(encre, fondDe(e));
        if(c<seuil) out.faibles.push({ genre:'texte en accent', n:nom(e), t:e.textContent.trim().slice(0,24), c:+c.toFixed(2), seuil });
      }
      if(fond && fond.a>0.9 && proche(fond,ACC,6) && propre){
        out.aplats++;
        const c=ctr(encre&&encre.a>0.5?encre:{r:0,g:0,b:0,a:1}, fond);
        if(c<seuil) out.faibles.push({ genre:'encre sur aplat', n:nom(e), t:e.textContent.trim().slice(0,24), c:+c.toFixed(2), seuil });
      }
      /* ⛔ TOUT APLAT COLORÉ, PAS SEULEMENT L'ACCENT : une pastille pleine orange, rouge ou
         d'une couleur de niveau porte aussi du texte — et color:#fff en dur y est le même
         piège. Saturation mesurée pour ne garder que les fonds COLORÉS (pas les gris). */
      if(fond && fond.a>0.9 && propre && !proche(fond,ACC,6)){
        const mx=Math.max(fond.r,fond.g,fond.b), mn=Math.min(fond.r,fond.g,fond.b);
        if(mx-mn>60){ out.aplatsTous++;
          const c=ctr(encre&&encre.a>0.5?encre:{r:0,g:0,b:0,a:1}, fond);
          if(c<seuil) out.faibles.push({ genre:'encre sur aplat coloré', n:nom(e), t:e.textContent.trim().slice(0,24), c:+c.toFixed(2), seuil }); }
      }
      /* ── 4. (FAM=tout) TOUT AUTRE TEXTE contre son vrai fond. La teinte ne colore pas que
         les lettres : elle colore les SURFACES (vitre teintée à 4 %, halos, sélections à
         14 %). Un texte ordinaire peut y tomber sans être lui-même en accent — mesuré le
         22 septembre 2026 : la pastille orange « non effectuées » à 4,38 au pixel sous la
         teinte orange. Une commande inactive est exemptée (WCAG 1.4.3). */
      if(${TOUT} && propre && encre && encre.a>0.05 && !proche(encre,ACC,6) && !e.closest('[disabled],[aria-disabled="true"]')){
        out.textes++;
        const f=fondDe(e), op=+st.opacity||1;
        const ink=(encre.a*op<0.999)?sur({r:encre.r,g:encre.g,b:encre.b,a:encre.a*op},f):encre;
        const c=ctr(ink,f);
        if(c<seuil) out.faibles.push({ genre:'texte ordinaire', n:nom(e), t:e.textContent.trim().slice(0,24), c:+c.toFixed(2), seuil,
          ...(${DETAIL}?{ encre:[ink.r,ink.g,ink.b].map(Math.round).join(','), fond:[f.r,f.g,f.b].map(Math.round).join(','), h:e.outerHTML.slice(0,220) }:{}) });
      }
      if(VERT && (proche(encre,VERT,6)||proche(fond,VERT,6)) && (propre||fond&&fond.a>0.5))
        out.restes.push({ n:nom(e), t:e.textContent.trim().slice(0,24) });
    }));
    return out;`;

  /* ⛔⛔ CONTRE-ÉPREUVE : un texte VOLONTAIREMENT illisible — encre d'accent sur aplat
     d'accent, 1:1 — doit être attrapé deux fois (texte en accent, encre sur aplat). Sans ça,
     « 0 contraste faible » peut vouloir dire « la sonde ne regarde rien ». */
  { await S.ev(`try{ setThemePref('dark'); setAccent('green'); go('dashboard'); }catch(e){} return 1;`); await dormir(500);
    const t=await S.ev(`const x=document.createElement('span'); x.id='__temoin'; x.textContent='témoin illisible';
      x.style.cssText='color:var(--acc-fill);background:var(--acc-fill);display:inline-block;padding:4px';
      document.getElementById('content').prepend(x); const VERT=null; ${MESURE}`);
    await S.ev(`const x=document.getElementById('__temoin'); if(x) x.remove(); return 1;`);
    const pris=(t&&t.faibles||[]).filter(f=>/témoin/.test(f.t)).map(f=>f.genre);
    console.log('  contre-épreuve — le témoin illisible est attrapé : '+(pris.length>=2?'OUI ✓ ('+pris.join(', ')+')':'NON ✗ '+JSON.stringify(pris)));
    if(pris.length<2){ S.fermer(); process.exit(7); } }
  /* ⛔ et la famille « texte ordinaire » a SON témoin : gris sur gris, 1,2:1. */
  if(TOUT){ await S.ev(`try{ go('dashboard'); }catch(e){} return 1;`); await dormir(400);
    const t=await S.ev(`const x=document.createElement('span'); x.id='__temoin2'; x.textContent='témoin gris';
      x.style.cssText='color:#8a8a8a;background:#9a9a9a;display:inline-block;padding:4px';
      document.getElementById('content').prepend(x); const VERT=null; ${MESURE}`);
    await S.ev(`const x=document.getElementById('__temoin2'); if(x) x.remove(); return 1;`);
    const pris=(t&&t.faibles||[]).filter(f=>/témoin gris/.test(f.t)).map(f=>f.genre);
    console.log('  contre-épreuve — le témoin gris est attrapé : '+(pris.includes('texte ordinaire')?'OUI ✓':'NON ✗ '+JSON.stringify(pris))+' · '+(t&&t.textes)+' textes ordinaires sur cet écran');
    if(!pris.includes('texte ordinaire')||!(t&&t.textes>20)){ S.fermer(); process.exit(8); } }

  const R={faibles:[],restes:[],texteAcc:0,aplats:0,aplatsTous:0,textes:0,ecrans:0,fenetres:0,fenRatees:[]};
  const FENETRES=[
    {nom:'Intervention', zone:'#overlay .modal', ouvrir:`formIntervention();`,
     puis:`try{ intNuis.add('Rats'); renderIntNuis(); }catch(e){} const m=document.querySelector('#int-meth button'); if(m) m.click();`},
    {nom:'Compte-rendu', zone:'#overlay .modal', ouvrir:`formRapport((db.interventions.find(i=>i.statut!=='terminee')||db.interventions[0]).id);`,
     puis:`for(const q of ['#rap-indices button','#rap-presta button']){ const b=document.querySelector(q); if(b) b.click(); }`},
    {nom:'fiche du nuisible', zone:'#overlay2 #modal2', ouvrir:`formIntervention(); intNuis.add('Rats'); renderIntNuis(); openNuisFiche('Rats');`,
     puis:`const oui=[...document.querySelectorAll('#modal2 button')].filter(b=>/^Oui$/.test(b.textContent.trim())); if(oui[0]) oui[0].click();
           const non=[...document.querySelectorAll('#modal2 button')].filter(b=>/^Non$/.test(b.textContent.trim())); if(non[1]) non[1].click();
           const ch=[...document.querySelectorAll('#modal2 button[data-o]')]; if(ch[0]) ch[0].click();`},
    {nom:'Nouvelle box', zone:'#overlay .modal', ouvrir:`formBox();`, puis:``},
    {nom:'Nouveau produit', zone:'#overlay .modal', ouvrir:`formProduit();`, puis:``},
    {nom:'Absence', zone:'#overlay .modal', ouvrir:`formAbsence();`, puis:``},
    {nom:'Devis xylophage', zone:'#overlay .modal', ouvrir:`formDevisXylo();`, puis:``},
  ];
  /* le vert par défaut, résolu une fois par thème, sert de cible aux « restes » */
  for(const th of ['dark','light'].filter(t=>!TH_SEULS.length||TH_SEULS.includes(t))){
    await S.ev(`try{ setThemePref('${th}'); }catch(e){} try{ setAccent('green'); }catch(e){} return 1;`); await dormir(200);
    const VERT=await S.ev(`let so=document.getElementById('__so'); if(!so){ so=document.createElement('div'); so.id='__so';
      so.style.cssText='position:fixed;left:-9999px;top:0;width:8px;height:8px'; document.body.appendChild(so); }
      return ['--acc','--acc-fill','--acc2'].map(k=>{ so.style.backgroundColor=''; so.style.backgroundColor='var('+k+')'; return getComputedStyle(so).backgroundColor; });`);
    for(const a of ACCENTS){
      await S.ev(`try{ setAccent('${a}'); }catch(e){} return 1;`); await dormir(160);
      for(const k of CATS){
        await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(330);
        await S.ev(`try{ closeModal(); }catch(e){} try{ tdbDetailFerme(); }catch(e){} return 1;`);
        const vert = a==='green' ? 'null' : JSON.stringify(VERT)+'.map(v=>{ const m=v.match(/^color\\(srgb ([^)]+)\\)$/)||v.match(/^rgba?\\(([^)]+)\\)$/); if(!m) return null; const p=m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return /srgb/.test(v)?{r:p[0]*255,g:p[1]*255,b:p[2]*255}:{r:p[0],g:p[1],b:p[2]}; }).filter(Boolean)';
        let o; try{ o=await S.ev(`const VERT=${vert}; ${MESURE}`); }catch(e){ continue; }
        if(!o || o.erreur){ console.log('  ✗ '+th+' '+a+' '+k+' : '+(o&&o.erreur)); S.fermer(); process.exit(6); }
        R.ecrans++; R.texteAcc+=o.texteAcc; R.aplats+=o.aplats; R.textes+=o.textes||0;
        o.faibles.forEach(x=>R.faibles.push({...x,ou:th+'/'+a+'/'+k}));
        o.restes.forEach(x=>R.restes.push({...x,ou:th+'/'+a+'/'+k}));
      }
      /* ⛔ LES FENÊTRES AUSSI, ET DANS L'ÉTAT « CHOISI ». Une pastille n'a d'aplat d'accent que
         cochée : on coche la première de chaque groupe, par la fonction ou le clic que
         l'application emploie elle-même — sinon on mesurerait des pastilles grises. */
      for(const F of (FEN?FENETRES:[])){
        await S.ev(`try{ closeModal(); }catch(e){} try{ closeSub(); }catch(e){} return 1;`); await dormir(150);
        try{ await S.ev(F.ouvrir+' return 1;'); }catch(e){ R.fenRatees.push(F.nom+' : '+String(e.message).slice(0,60)); continue; }
        await dormir(450);
        try{ await S.ev(F.puis+' return 1;'); }catch(e){}
        await dormir(250);
        const vert = a==='green' ? 'null' : JSON.stringify(VERT)+'.map(v=>{ const m=v.match(/^color\\(srgb ([^)]+)\\)$/)||v.match(/^rgba?\\(([^)]+)\\)$/); if(!m) return null; const p=m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return /srgb/.test(v)?{r:p[0]*255,g:p[1]*255,b:p[2]*255}:{r:p[0],g:p[1],b:p[2]}; }).filter(Boolean)';
        let o; try{ o=await S.ev(`const VERT=${vert}; const ZONE=${JSON.stringify(F.zone)}; ${MESURE}`); }catch(e){ R.fenRatees.push(F.nom+' : mesure'); continue; }
        if(!o || o.erreur){ R.fenRatees.push(F.nom+' : '+(o&&o.erreur)); continue; }
        R.fenetres++; R.texteAcc+=o.texteAcc; R.aplats+=o.aplats; R.aplatsTous+=o.aplatsTous||0; R.textes+=o.textes||0;
        o.faibles.forEach(x=>R.faibles.push({...x,ou:th+'/'+a+'/fenêtre '+F.nom}));
        o.restes.forEach(x=>R.restes.push({...x,ou:th+'/'+a+'/fenêtre '+F.nom}));
      }
      await S.ev(`try{ closeSub(); }catch(e){} try{ closeModal(); }catch(e){} return 1;`);
      console.log('  '+th.padEnd(6)+a.padEnd(9)+' — '+R.ecrans+' écrans + '+R.fenetres+' fenêtres, '+R.faibles.length+' contrastes faibles, '+R.restes.length+' restes de vert');
    }
  }
  const grouper=(l,f)=>{ const m={}; l.forEach(x=>{ const g=f(x); (m[g]=m[g]||[]).push(x); }); return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };
  console.log('\n════════ AUDIT DES TEINTES — ÉTAPE 3 ════════');
  console.log('  page mesurée : '+S.version);
  console.log('  population : '+R.ecrans+' écrans + '+R.fenetres+' fenêtres · '+R.texteAcc+' textes en accent mesurés · '+R.aplats+' encres sur aplat d’accent · '+R.aplatsTous+' encres sur un autre aplat coloré');
  if(TOUT) console.log('  + '+R.textes+' textes ordinaires mesurés (FAM=tout)');
  if(R.fenRatees.length) console.log('  ⚠ fenêtres non mesurées : '+R.fenRatees.length+' — '+[...new Set(R.fenRatees)].slice(0,6).join(' · '));
  console.log('\n══ CONTRASTES SOUS LE SEUIL : '+R.faibles.length+' ══');
  grouper(R.faibles.filter(x=>x.genre!=='texte ordinaire'),x=>x.genre+' · '+x.n+' « '+x.t.replace(/\d+/g,'#')+' »').slice(0,30).forEach(([g,v])=>{
    const pire=v.reduce((m,x)=>x.c<m.c?x:m,v[0]);
    console.log('   '+String(v.length).padStart(3)+'×  '+g+'   pire '+pire.c+':1 (seuil '+pire.seuil+') ['+pire.ou+']'); });
  if(TOUT){
    /* un défaut qui existe AUSSI en vert n'est pas celui d'une teinte : on le range à part */
    const ord=R.faibles.filter(x=>x.genre==='texte ordinaire');
    const cle=x=>{ const [th,,...ou]=x.ou.split('/'); return th+'/'+ou.join('/')+'|'+x.n+'|'+x.t.replace(/\d+/g,'#'); };
    const enVert=new Set(ord.filter(x=>x.ou.split('/')[1]==='green').map(cle));
    const propres=ord.filter(x=>x.ou.split('/')[1]!=='green'&&!enVert.has(cle(x)));
    const generaux=ord.filter(x=>x.ou.split('/')[1]==='green'||enVert.has(cle(x)));
    console.log('\n══ TEXTES ORDINAIRES SOUS LE SEUIL : '+ord.length+'  ('+generaux.length+' qui existent aussi en vert · '+propres.length+' propres à une teinte) ══');
    for(const [titre,l] of [['propres à une teinte',propres],['aussi en vert (généraux)',generaux]]){
      console.log('  — '+titre+' —');
      grouper(l,x=>x.n+' « '+x.t.replace(/\d+/g,'#')+' »').slice(0,40).forEach(([g,v])=>{
        const pire=v.reduce((m,x)=>x.c<m.c?x:m,v[0]);
        const ou=[...new Set(v.map(x=>x.ou.split('/').slice(0,2).join('/')))];
        console.log('   '+String(v.length).padStart(4)+'×  '+g+'   pire '+pire.c+':1 ['+pire.ou+']  · '+ou.length+' combinaisons'); });
    }
  }
  console.log('\n══ RESTES DE VERT SOUS UNE AUTRE TEINTE : '+R.restes.length+' ══');
  grouper(R.restes,x=>x.n+' « '+x.t+' »').slice(0,20).forEach(([g,v])=>console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ['+v[0].ou+']'));
  fs.writeFileSync(__dirname+'/audit-teintes'+SUFFIXE+'.json',JSON.stringify({version:S.version,...R}));
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
