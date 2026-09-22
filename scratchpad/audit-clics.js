/* ══ AUDIT DES CLICS — PASSE B : ON APPUIE VRAIMENT SUR CHAQUE BOUTON ═══════════════════
   Justin, 22 septembre 2026 : « bouton par bouton, catégorie par catégorie ».
   `audit-total.js` MESURE ce qui est rendu. Il ne clique pas — et un bouton peut être
   parfaitement dessiné, parfaitement atteignable, et jeter une exception au premier appui.

   Ce qu'on cherche, NOMMÉ AVANT de chercher :
   1. ERREUR — le clic jette. C'est le défaut qui se voit chez le client.
   2. INERTE — le clic ne change RIEN d'observable : ni fenêtre, ni vue, ni écran, ni
      message. Ce n'est pas forcément un défaut (un bouton peut écrire dans la base sans
      rien repeindre) : on le RAPPORTE, on ne l'accuse pas.
   3. ÉCARTÉ — ce qu'on refuse de cliquer, NOMMÉ un par un (une déconnexion tuerait la
      passe). « Pas de plafond silencieux » : ce qui est sauté est écrit.

   ⛔ PIÈGES ENCODÉS ICI, tous payés dans ce dépôt :
   · UNE RÉFÉRENCE PRISE AVANT LE CLIC EST MORTE APRÈS — `rendreVueSure` réécrit `#content`.
     On ne garde donc AUCUN nœud : on ré-énumère et on vise par INDEX à chaque tour.
   · UNE EXCEPTION DANS UN ÉCOUTEUR NE REMONTE PAS À `el.click()` — elle part au gestionnaire
     global. On écoute donc `Runtime.exceptionThrown`, et on le PROUVE avec un bouton
     volontairement cassé avant de croire un zéro.
   · `document.body.innerHTML` CONTIENT LE CODE SOURCE (fichier unique) — on lit `#content`.
   · L'ÉCRAN « CONNEXION REQUISE » couvre tout au premier contrôle de santé raté.
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.                                   */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));

/* ⛔ CE QU'ON NE CLIQUE PAS, ET POURQUOI — la liste est courte et elle est écrite. */
const ECARTS=[
  [/déconnexion|se déconnecter|quitter l'espace|changer d'espace/i,'sortirait de la session et tuerait la passe'],
  [/^(réinitialiser|repartir à neuf|tout effacer|vider la base)/i,'détruit la base d’essai sous la passe'],
];

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version);

  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const e=document.getElementById('hl-ecran'); if(e)e.remove(); return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; if(typeof enterApp==='function') enterApp(currentUser);
    try{ localStorage.setItem('elan_onboarded_'+currentUser.id,'1'); }catch(e){} return 1;`);
  await dormir(1200);
  await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);

  /* ── LES GARDE-FOUS. Après eux, plus rien ne se confirme et rien ne quitte la page. ── */
  await S.ev(`
    window.confirm=()=>false; window.alert=()=>{}; window.prompt=(q,d)=>null; window.print=()=>{};
    window.open=()=>null;
    try{ HTMLFormElement.prototype.submit=function(){}; }catch(e){}
    /* une ancre qui sort de la page tuerait la passe : on la neutralise à la capture */
    document.addEventListener('click',ev=>{ const a=ev.target&&ev.target.closest&&ev.target.closest('a[href]');
      if(a){ const h=a.getAttribute('href')||''; if(h&&!/^#|^javascript:/i.test(h)){ ev.preventDefault(); } } },true);
    return 1;`);

  const ranger=async()=>{ for(let k=0;k<6;k++){
    await S.ev(`const b=[...document.querySelectorAll('button,.btn')].find(x=>/Plus tard|Fermer|Non merci|Annuler/.test(x.textContent||''));
      if(b) b.click(); try{ closeModal(); }catch(e){} try{ if(typeof closeModal2==='function') closeModal2(); }catch(e){}
      try{ asstOpen=false; renderAsst(); }catch(e){} return 1;`);
    await dormir(200);
    const r=await S.ev(`const o=document.querySelector('#overlay'), o2=document.querySelector('#overlay2');
      const ouv=n=>!!(n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>100);
      return ouv(o)||ouv(o2)||!!document.querySelector('.asst.open');`);
    if(!r) return true; } return false; };

  /* ── LE RECENSEMENT D'UN ÉCRAN. On ne rend que des INDEX et des identités, jamais un nœud. ── */
  const RECENSER=`
    const vis=e=>{ const b=e.getBoundingClientRect(); if(b.width<6||b.height<6) return false;
      const st=getComputedStyle(e); return st.visibility!=='hidden'&&st.display!=='none'&&+st.opacity>0.05; };
    const SEL='button,.btn,.chip,.tab,.tchip,.pf-b,.pf-opt,.seg span,a[href],[onclick]';
    const zones=[document.getElementById('content'),document.querySelector('#page-head .ph-actions'),
                 document.getElementById('topbar-actions')].filter(Boolean);
    const vu=new Set(), out=[];
    zones.forEach(z=>[...z.querySelectorAll(SEL)].forEach(e=>{
      if(vu.has(e)||!vis(e)) return;
      /* un parent cliquable qui contient un enfant cliquable : on garde le plus profond */
      if([...e.querySelectorAll(SEL)].some(c=>vis(c))) return;
      vu.add(e);
      out.push({ t:(e.textContent||e.getAttribute('aria-label')||e.title||'').trim().replace(/\\s+/g,' ').slice(0,44),
                 n:e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'') });
    }));
    window.__cibles=out.length; return out;`;

  /* ── L'ÉTAT OBSERVABLE, avant et après : c'est lui qui dit « inerte » ou non. ── */
  const ETAT=`
    const c=document.getElementById('content');
    const ouv=n=>!!(n&&getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>100);
    return { vue:(window.current||''), len:(c?c.innerHTML.length:0),
             tete:(c?c.innerHTML.slice(0,400):''),
             ov:ouv(document.querySelector('#overlay'))||ouv(document.querySelector('#overlay2')),
             toast:!!document.querySelector('.toast,.snack,.notif-toast'),
             enfants:document.body.children.length };`;

  /* ⛔⛔ CONTRE-ÉPREUVE AVANT DE CROIRE UN ZÉRO : un bouton qui jette DOIT être vu.
     Sans ça, « 0 erreur » peut vouloir dire « la sonde ne regarde pas ». */
  const avantEssai=S.exceptions.length;
  await S.ev(`const b=document.createElement('button'); b.id='__casse'; b.textContent='essai';
    b.onclick=function(){ throw new Error('SONDE-TEMOIN'); };
    document.getElementById('content').appendChild(b); b.click(); b.remove(); return 1;`);
  await dormir(300);
  const temoinVu=S.exceptions.slice(avantEssai).some(x=>/SONDE-TEMOIN/.test(x));
  console.log('  contre-épreuve : un clic qui jette est '+(temoinVu?'VU ✓':'INVISIBLE ✗ — tout zéro ci-dessous est faux'));
  if(!temoinVu){ S.fermer(); process.exit(3); }

  /* ⛔ NAV EST UN TABLEAU DE GROUPES, PAS DE RUBRIQUES — `NAV.map(x=>x.k)` rend 42 `undefined`,
     donc ZÉRO catégorie, donc « 0 clic qui jette ». Le compteur de population l'a attrapé à la
     première exécution ; sans lui, cet audit annonçait un sans-faute sur du néant. */
  const CATS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`);
  console.log('  catégories jouées : '+CATS.length);
  if(CATS.length<20){ console.log('  ✗ POPULATION TROP MAIGRE — on n’audite rien, on s’arrête.'); S.fermer(); process.exit(4); }

  /* téléphone, thème nuit — c'est l'appareil de terrain */
  await S.ev(`try{ setPlatForce('ios27'); }catch(e){} try{ setTheme('dark'); }catch(e){} return 1;`);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await dormir(500);

  const R={err:[],inertes:[],ecartes:[]};
  let clics=0, ecrans=0, cibles=0;

  for(const k of CATS){
    await S.ev(`try{ go('${k}'); }catch(e){} return 1;`); await dormir(600); await ranger();
    const liste=await S.ev(RECENSER);
    if(!Array.isArray(liste)||!liste.length){ console.log('  '+k+' — 0 cible'); continue; }
    ecrans++; cibles+=liste.length;

    for(let i=0;i<liste.length;i++){
      const c=liste[i];
      const motif=ECARTS.find(([re])=>re.test(c.t));
      if(motif){ R.ecartes.push({ou:k,t:c.t,n:c.n,pourquoi:motif[1]}); continue; }

      const avant=await S.ev(ETAT);
      const nErr=S.exceptions.length;
      /* ⛔ on RÉ-ÉNUMÈRE et on vise par index : la référence d'avant est morte au redessin */
      const frappe=await S.ev(RECENSER.replace('return out;',
        `const e=[...vu][${i}]; if(!e) return {rate:true}; e.click(); return {rate:false};`));
      await dormir(280);
      clics++;
      const apres=await S.ev(ETAT);
      const neuves=S.exceptions.slice(nErr);
      if(neuves.length) R.err.push({ou:k,t:c.t,n:c.n,e:neuves.join(' | ').slice(0,160)});
      else if(!frappe.rate && apres.vue===avant.vue && apres.ov===avant.ov && !apres.toast
              && apres.len===avant.len && apres.tete===avant.tete && apres.enfants===avant.enfants)
        R.inertes.push({ou:k,t:c.t,n:c.n});

      /* on remet l'écran d'aplomb — seulement si quelque chose a bougé */
      if(apres.ov || apres.vue!==avant.vue || apres.len!==avant.len){
        await ranger();
        await S.ev(`try{ if(window.current!=='${k}') go('${k}'); }catch(e){} return 1;`);
        await dormir(320);
      }
    }
    console.log('  '+k+' — '+liste.length+' cibles');
  }

  const grouper=(l,cle)=>{ const m={}; l.forEach(x=>{ const g=cle(x); (m[g]=m[g]||[]).push(x); });
    return Object.entries(m).sort((a,b)=>b[1].length-a[1].length); };

  console.log('\n════════ AUDIT DES CLICS ════════');
  console.log('  page mesurée : '+S.version);
  console.log('  population : '+ecrans+' écrans, '+cibles+' cibles recensées, '+clics+' clics réels');
  console.log('\n══ 1. CLICS QUI JETTENT : '+R.err.length+' ══');
  grouper(R.err,x=>x.e.slice(0,70)).slice(0,15).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. « '+v[0].t+' » ['+v[0].ou+']'));
  console.log('\n══ 2. CLICS SANS EFFET OBSERVABLE : '+R.inertes.length+'  (à VÉRIFIER, pas à accuser) ══');
  grouper(R.inertes,x=>x.n).slice(0,15).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g.padEnd(28)+' ex. « '+v[0].t+' » ['+v[0].ou+']'));
  console.log('\n══ 3. ÉCARTÉS VOLONTAIREMENT : '+R.ecartes.length+' ══');
  grouper(R.ecartes,x=>x.pourquoi).forEach(([g,v])=>
    console.log('   '+String(v.length).padStart(3)+'×  '+g+'   ex. « '+v[0].t+' »'));

  fs.writeFileSync(__dirname+'/audit-clics.json',JSON.stringify({version:S.version,ecrans,cibles,clics,...R}));
  console.log('\n  détail complet : scratchpad/audit-clics.json');
  S.fermer(); process.exit(0);
})().catch(e=>{console.error('AUDIT MORT :',e&&e.stack||e);process.exit(2);});
