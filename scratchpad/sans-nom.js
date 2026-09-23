/* ══ LES COMMANDES SANS NOM — CE QU'UN LECTEUR D'ÉCRAN NE PEUT PAS DIRE ═════════════════════
   Visibles, cliquables, et dont le nom accessible (texte non caché, aria-label, aria-labelledby,
   title, alt) est vide — sur les 41 rubriques. Écartés, et COMPTÉS : les conteneurs qui ne font
   que bloquer un clic (`onclick="event.stopPropagation()"`) et les cases de la grille du
   planning. Relève aussi les noms posés par `nommerIcone()` et vérifie que chaque élément à
   `data-tip` garde SON infobulle comme nom (`nommer()` passe après et doit gagner).
   Mesuré le 23 septembre 2026 : 13 sans nom au bureau et 14 au téléphone → 0 (v728).
   ⛔ Bêta uniquement, copie locale servie en 127.0.0.1.
   Usage : node scratchpad/sans-nom.js [profil]                                              */
const path=require('path');
const { ouvrir, dormir } = require(path.join(__dirname,'pilote.js')); const { profil, poserProfil } = require(path.join(__dirname,'profils.js'));
const PROFIL=process.argv[2]||'bureau';
(async()=>{
  const P=profil(PROFIL); const S=await ouvrir(process.env.SOURCE?{source:process.env.SOURCE}:{}); await poserProfil(S,P);   /* SOURCE=<beta d'avant> : la contre-épreuve */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`window.confirm=()=>true; window.alert=()=>{}; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500);
  await S.ev(`window.confirm=()=>false; try{ closeModal(); }catch(e){} setPlatForce('${P.plat}'); return 1;`); await dormir(1000);
  const CATS=await S.ev(`return NAV.flatMap(g=>g.items).map(x=>x.k).filter(k=>k&&views[k]);`);
  const RELEVE=`const nomDe=e=>{ if(e.getAttribute('aria-label')) return e.getAttribute('aria-label').trim();
      const lb=e.getAttribute('aria-labelledby'); if(lb) return lb.split(/\\s+/).map(i=>(document.getElementById(i)||{}).textContent||'').join(' ').trim();
      const t=(n=>{ let s=''; const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:x=>{ if(x.nodeType===1&&(x.getAttribute('aria-hidden')==='true'||getComputedStyle(x).display==='none')) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; }});
        let x; while((x=w.nextNode())){ if(x.nodeType===3) s+=x.nodeValue; else if(x.tagName==='IMG') s+=(x.alt||''); } return s.trim(); })(e);
      if(t) return t; return (e.title||'').trim(); };
    const vis=e=>{ const q=getComputedStyle(e), b=e.getBoundingClientRect(); return q.display!=='none'&&q.visibility!=='hidden'&&+q.opacity>0.05&&b.width>1&&b.height>1; };
    const action=e=>{ const oc=(e.getAttribute('onclick')||'x').split(' ').join(''); return !(oc==='event.stopPropagation()'||oc==='event.stopPropagation();'); };   /* un conteneur qui bloque le clic n'est pas une commande */
    const l=[...document.querySelectorAll('button,a[href],[onclick],[role=button]')].filter(e=>vis(e)&&!e.closest('#sidebar')&&action(e)&&!e.classList.contains('pg-cel')&&!nomDe(e));
    return l.map(e=>({tag:e.tagName.toLowerCase(), cls:(e.className||'').toString().split(' ').slice(0,2).join('.'), on:(e.getAttribute('onclick')||'').replace(/\\(.*$/,''), ic:[...e.querySelectorAll('svg.rf-ic')].length, dans:(e.closest('.overlay')?'fenêtre':(e.closest('#content')?'contenu':(e.closest('.topbar')?'barre':'autre')))}));`;
  const tot={}; let n=0, ecrans=0; const noms={}; let cellules=0; const tips={n:0,fideles:0};
  const NOMMES=`return [...document.querySelectorAll('#content [aria-label][title]')].filter(e=>e.querySelector('svg.rf-ic')&&!(e.textContent||'').trim()).map(e=>(e.getAttribute('onclick')||'').replace(/\\(.*$/,'')+' → « '+e.getAttribute('aria-label')+' »'+(e.getAttribute('role')?' ['+e.getAttribute('role')+']':''));`;
  for (const k of CATS) {
    await S.ev(`try{ closeModal(); }catch(e){} go('${k}'); window.scrollTo(0,0); return 1;`); await dormir(900);
    let l=await S.ev(RELEVE); ecrans++;
    /* ⚠ `nommer()` recopie les infobulles 40 ms APRÈS chaque rendu : un relevé tombé dans cet
       intervalle voit « sans nom » un élément qui en aura un. Seconde lecture, 400 ms plus tard :
       on ne garde que ce qui PERSISTE (même règle que les débordements). */
    if(l.length){ await dormir(400); l=await S.ev(RELEVE); }
    (await S.ev(NOMMES)).forEach(x=>{ noms[x]=(noms[x]||0)+1; });
    cellules+=await S.ev(`return document.querySelectorAll('#content .pg-cel').length;`);
    const tp=await S.ev(`return [...document.querySelectorAll('[data-tip]')].map(e=>e.getAttribute('aria-label')===(e.getAttribute('data-tip')||'').trim());`);
    tips.n+=tp.length; tips.fideles+=tp.filter(Boolean).length;
    l.forEach(x=>{ const c=x.tag+(x.cls?'.'+x.cls:'')+' '+(x.on||'—')+(x.ic?' [icône]':'')+' · '+x.dans; (tot[c]=tot[c]||{n:0,ou:new Set()}); tot[c].n++; tot[c].ou.add(k); n++; });
  }
  console.log('profil', PROFIL, '·', ecrans, 'rubriques · commandes visibles SANS NOM :', n);
  Object.entries(tot).sort((a,b)=>b[1].n-a[1].n).slice(0,40).forEach(([c,v])=>console.log(String(v.n).padStart(4)+'×  '+c+'   ['+[...v.ou].slice(0,5).join(', ')+(v.ou.size>5?'…':'')+']'));
  console.log('\n  commandes à icône seule qui ont reçu un nom :');
  Object.entries(noms).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log('   '+String(v).padStart(3)+'×  '+k));
  console.log('  (cases de la grille du planning, écartées : '+cellules+')');
  const menu=await S.ev(`const m=document.querySelector('.menu-btn'); return m?(m.getAttribute('aria-label')||'(aucun)'):'(pas de bouton)';`);
  console.log('  bouton du menu :', menu, '· éléments à data-tip nommés par LEUR infobulle, sur les 41 rubriques :', tips.fideles+'/'+tips.n);
  process.exitCode = (n || tips.fideles!==tips.n || !tips.n) ? 1 : 0;
  S.fermer(); process.exit(process.exitCode||0);
})().catch(e=>{ console.error('MORTE', e); process.exit(2); });
