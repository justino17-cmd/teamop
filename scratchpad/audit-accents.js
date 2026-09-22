/* ══ AUDIT DES COULEURS — LES NEUF ACCENTS, SUR LES 42 CATÉGORIES ═══════════════════════
   Justin, 22 septembre 2026 : « au niveau des couleurs du thème de l'application, t'as
   vérifié toutes les catégories par catégorie ? »

   Ce qu'on cherche, NOMMÉ AVANT de chercher :
   1. UN JETON MORT — `--acc-src` vide tue les treize jetons dérivés d'un coup, en silence.
      C'est arrivé à cinq accents sur huit pendant onze jours, et au VERT (la couleur par
      défaut, donc presque tout le monde) pendant une journée.
   2. UNE ENCRE SOUS LA BARRE — l'application peint TROIS aplats d'accent (`--acc`,
      `--acc-fill`, `--acc2`) et chacun a son encre. Une encre juste sur l'un peut tomber
      à 3,4:1 sur l'autre.
   3. UN RESTE DE VERT — une couleur écrite en dur qui ne suit pas l'accent choisi. On
      règle l'accent sur le VIOLET et on cherche le vert par défaut, catégorie par
      catégorie : ce qui reste vert n'a pas suivi.

   ⛔ PIÈGES ENCODÉS ICI :
   · une couleur issue de `color-mix()` revient en `color(srgb 0.10 0.41 0.31)` — des
     flottants 0–1. Lue comme du 0–255, elle donne du quasi-noir et un contraste de 20,9:1
     PARTOUT. Le lecteur reconnaît la FORME et JETTE ce qu'il ne sait pas lire ;
   · on passe par `setAccent()`, la VRAIE fonction — poser `data-accent` à la main ne
     rejoue pas `applyTheme` et laisse `--acc-rgb` sur la teinte précédente ;
   · l'écran « Connexion requise » couvre tout au premier contrôle de santé raté ;
   · on compte la POPULATION avant de croire un zéro.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                   */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version);
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2200);
  await S.ev(`window.confirm=()=>false;
    const st=document.createElement('style'); st.id='__masque';
    st.textContent='#overlay,#overlay2,.asst,.toast,.snack{display:none!important}';
    document.head.appendChild(st); return 1;`);

  /* ── le lecteur de couleur, conscient de la FORME ── */
  const LIRE=`
    const lire=(v)=>{ if(!v) return null; v=v.trim();
      let m=v.match(/^rgba?\\(([^)]+)\\)$/);
      if(m){ const p=m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
             if(p.length<3||p.some(isNaN)) return null; return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
      m=v.match(/^color\\(srgb ([^)]+)\\)$/);
      if(m){ const p=m[1].split(/[\\s\\/]+/).filter(Boolean).map(Number);
             if(p.length<3||p.some(isNaN)) return null;
             return {r:Math.round(p[0]*255),g:Math.round(p[1]*255),b:Math.round(p[2]*255),a:p.length>3?p[3]:1}; }
      m=v.match(/^#([0-9a-f]{6})$/i);
      if(m){ const n=parseInt(m[1],16); return {r:n>>16&255,g:n>>8&255,b:n&255,a:1}; }
      return null; };                       /* ⛔ on JETTE ce qu'on ne sait pas lire */
    const lum=c=>{ const f=x=>{x/=255; return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);};
      return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
    const contraste=(a,b)=>{ if(!a||!b) return null; const l1=lum(a),l2=lum(b);
      return Math.round(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05))*100)/100; };`;

  const ACCENTS=await S.ev(`return Object.keys(ACCENTS);`);
  console.log('  accents déclarés : '+ACCENTS.length+' — '+ACCENTS.join(', '));
  if(ACCENTS.length<8){ console.log('  ✗ population trop maigre'); S.fermer(); process.exit(4); }

  /* ⛔⛔ LES NOMS DE JETONS VIENNENT DU FICHIER, JAMAIS DE LA MÉMOIRE. Première exécution,
     22 septembre 2026 : j'avais écrit cette liste de tête et y avais mis `--acc-d`,
     `--acc-l`, `--acc-soft`, `--acc-brd`, `--acc-glow` — CINQ noms qui n'existent nulle
     part dans app.html, ni définis ni utilisés. Le banc a donc annoncé « 18 jetons morts »
     sur les dix-huit combinaisons : un faux intégral, sur du vide. On relit les jetons
     d'accent RÉELLEMENT écrits dans la page. */
  const JETONS=await S.ev(`
    const t=[...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n');
    const vus=new Set();
    (t.match(/--(?:acc|on-acc|on-fill)[a-z0-9-]*\\s*:/g)||[]).forEach(m=>vus.add(m.replace(/\\s*:$/,'')));
    (t.match(/var\\(\\s*(--(?:acc|on-acc|on-fill)[a-z0-9-]*)/g)||[]).forEach(m=>vus.add(m.replace(/.*\\(\\s*/,'')));
    vus.add('--acc-rgb');            /* posé en JavaScript par applyTheme, pas dans le CSS */
    return [...vus].sort();`);
  console.log('  jetons d’accent trouvés dans la page : '+JETONS.length+' — '+JETONS.join(' '));
  if(JETONS.length<5){ console.log('  ✗ population trop maigre'); S.fermer(); process.exit(6); }

  console.log('\n══ 1. LES NEUF ACCENTS × LES DEUX THÈMES : AUCUN JETON MORT ══\n');
  const morts=[], faibles=[];
  for(const th of ['dark','light']){
    for(const a of ACCENTS){
      const r=await S.ev(`
        try{ localStorage.setItem('elanB_theme','${th}'); }catch(e){}
        document.documentElement.setAttribute('data-theme','${th}');
        try{ setAccent('${a}'); }catch(e){}
        await new Promise(r=>setTimeout(r,90));
        ${LIRE}
        /* ⛔⛔ getPropertyValue('--acc') REND LE TEXTE DU JETON, PAS UNE COULEUR.
           Mesuré : « color-mix(in srgb,#000 22%,#1F7A5C) ». Un lecteur de couleur le
           rejette (à juste titre), et tous les contrastes sortaient à « ? » — donc
           « 0 encre sous la barre » sur zéro mesure. On RÉSOUT en posant la valeur sur un
           vrai élément et en relisant sa couleur calculée, qui, elle, est résolue. */
        let sonde=document.getElementById('__sonde-couleur');
        if(!sonde){ sonde=document.createElement('div'); sonde.id='__sonde-couleur';
          sonde.style.cssText='position:fixed;left:-9999px;top:0;width:8px;height:8px';
          document.body.appendChild(sonde); }
        const resoudre=(jeton)=>{ sonde.style.backgroundColor='';
          sonde.style.backgroundColor='var('+jeton+')';
          const v=getComputedStyle(sonde).backgroundColor;
          return (v && v!=='rgba(0, 0, 0, 0)') ? v : null; };
        const cs=getComputedStyle(document.documentElement);
        const j={}, res={};
        ${JSON.stringify(JETONS)}.forEach(k=>{ j[k]=cs.getPropertyValue(k).trim(); res[k]=resoudre(k); });
        const c=(x,y)=>contraste(lire(res[x]),lire(res[y]));
        return { th:document.documentElement.getAttribute('data-theme'),
                 acc:document.documentElement.getAttribute('data-accent'), j,
                 encre:{ 'sur --acc':c('--on-acc','--acc'), 'sur --acc-fill':c('--on-fill','--acc-fill'),
                         'sur --acc2':c('--on-acc2','--acc2') } };`);
      const vides=JETONS.filter(k=>!r.j[k]);   /* le jeton n'est pas écrit du tout */
      if(vides.length) morts.push({th,a,vides});
      Object.entries(r.encre).forEach(([ou,v])=>{ if(v!==null && v<4.5) faibles.push({th,a,ou,v}); });
      const ok=vides.length===0;
      console.log('  '+(ok?'✓':'✗')+' '+th.padEnd(6)+' '+a.padEnd(9)
        +' src '+(r.j['--acc-src']||'(VIDE)').padEnd(9)
        +' rgb '+(r.j['--acc-rgb']||'(VIDE)').padEnd(13)
        +' encres '+Object.values(r.encre).map(v=>v===null?'?':v.toFixed(2)).join(' / ')
        +(vides.length?'   ⛔ VIDES : '+vides.join(','):''));
    }
  }
  console.log('\n  jetons morts : '+morts.length+'  ·  encres sous 4,5:1 : '+faibles.length);
  faibles.forEach(f=>console.log('     ⚠ '+f.th+' · '+f.a+' · '+f.ou+' = '+f.v+':1'));

  console.log('\n══ 2. CE QUI RESTE VERT QUAND L’ACCENT EST VIOLET, CATÉGORIE PAR CATÉGORIE ══\n');
  /* on relève d'abord la teinte du VERT par défaut, puis on passe au violet et on la cherche */
  const vert=await S.ev(`try{ setAccent('green'); }catch(e){} await new Promise(r=>setTimeout(r,90));
    let sonde=document.getElementById('__sonde-couleur');
    if(!sonde){ sonde=document.createElement('div'); sonde.id='__sonde-couleur';
      sonde.style.cssText='position:fixed;left:-9999px;top:0;width:8px;height:8px'; document.body.appendChild(sonde); }
    const R=(k)=>{ sonde.style.backgroundColor=''; sonde.style.backgroundColor='var('+k+')';
      const v=getComputedStyle(sonde).backgroundColor; return (v&&v!=='rgba(0, 0, 0, 0)')?v:null; };
    return { acc:R('--acc'), fill:R('--acc-fill'), acc2:R('--acc2'),
             rgb:getComputedStyle(document.documentElement).getPropertyValue('--acc-rgb').trim() };`);
  console.log('  vert par défaut, RÉSOLU : '+JSON.stringify(vert));
  if(!vert.acc){ console.log('  ✗ la teinte de référence ne se résout pas — on n’interprète RIEN'); S.fermer(); process.exit(7); }
  await S.ev(`try{ setAccent('purple'); }catch(e){} await new Promise(r=>setTimeout(r,120)); return 1;`);
  const violet=await S.ev(`const s=document.getElementById('__sonde-couleur');
    s.style.backgroundColor=''; s.style.backgroundColor='var(--acc)';
    return getComputedStyle(s).backgroundColor;`);
  console.log('  violet appliqué : '+violet);
  if(violet===vert.acc){ console.log('  ✗ l’accent n’a pas changé — on n’interprète RIEN'); S.fermer(); process.exit(5); }

  const CATS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`);
  console.log('  catégories : '+CATS.length+'\n');
  const restes=[]; let vus=0;
  for(const k of CATS){
    await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(420);
    const r=await S.ev(`
      ${LIRE}
      /* ⛔ UN ZÉRO SUR UNE CIBLE VIDE NE VAUT RIEN — première exécution : les trois cibles
         étaient du texte « color-mix(…) », le lecteur les jetait, et « 0 reste vert »
         portait sur ZÉRO couleur cherchée. On prouve la cible avant de compter. */
      const cible=${JSON.stringify([vert.acc,vert.fill,vert.acc2].filter(Boolean))}.map(lire).filter(Boolean);
      if(!cible.length) return {n:0,trouves:[],cibleVide:true};
      const proche=(c)=>c && cible.some(t=>Math.abs(c.r-t.r)+Math.abs(c.g-t.g)+Math.abs(c.b-t.b)<=12);
      /* ⛔ CE QU'ON ÉCARTE, ET POURQUOI — nommé, sinon le prochain audit le retrouvera et le
         croira. span.av est la pastille d'initiales d'un technicien : sa couleur vient de
         techColor() / TECH_PALETTE16, dont la première entrée (#1E7A4E) tombe à 12 unités
         du vert d'accent une fois assombrie. Contre-épreuve du 22 septembre 2026 : la
         pastille rend EXACTEMENT la même couleur sous vert, violet et orange — elle n'a
         jamais suivi l'accent, et c'est voulu (on doit reconnaître quelqu'un d'un coup d'œil
         sur le planning, quelle que soit la teinte de l'application). */
      const ECARTES=['av'];
      const zone=document.getElementById('content'); if(!zone) return {n:0,trouves:[]};
      const tous=[...zone.querySelectorAll('*')];
      const trouves=[];
      tous.forEach(e=>{ const b=e.getBoundingClientRect(); if(b.width<4||b.height<4) return;
        if(typeof e.className==='string' && ECARTES.some(c=>e.classList.contains(c))) return;
        const s=getComputedStyle(e);
        ['color','backgroundColor','borderTopColor','fill'].forEach(p=>{
          const c=lire(s[p]); if(!c||c.a<0.25) return;
          if(proche(c)) trouves.push({ q:e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):''),
                                       p, v:s[p], t:(e.textContent||'').trim().slice(0,26) });
        });
      });
      return { n:tous.length, trouves:trouves.slice(0,6) };`);
    if(r.cibleVide){ console.log('  ✗ cible vide sur '+k+' — on s’arrête'); S.fermer(); process.exit(8); }
    vus+=r.n;
    if(r.trouves.length){ restes.push({k,...r}); console.log('  ⚠ '+k.padEnd(20)+' '+r.trouves.length+' élément(s) restés verts — ex. '+r.trouves[0].q+' ('+r.trouves[0].p+') « '+r.trouves[0].t+' »'); }
  }
  console.log('\n  population : '+vus+' éléments examinés sur '+CATS.length+' catégories');
  console.log('  catégories où du vert par défaut survit à un accent violet : '+restes.length);

  fs.writeFileSync(__dirname+'/audit-accents.json',JSON.stringify({version:S.version,morts,faibles,vert,violet,restes,vus}));
  console.log('\n  détail : scratchpad/audit-accents.json');
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
