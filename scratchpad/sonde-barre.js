/* ══ SONDE DE LA BARRE DU HAUT, AU TÉLÉPHONE — ce qu'elle montre, dans ses deux états ══════
   Deux états (défilé ou non, `body.rf-haut`) × deux familles d'écran (le tableau de bord,
   sans `.ctx` ; toute autre rubrique, avec) × plusieurs largeurs. Pour chacun : ce qui est
   VISIBLE dans la barre (rectangle, opacité, texte), et une capture de la barre seule.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1.
   Usage : node scratchpad/sonde-barre.js [largeur…]                                        */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require(path.join(__dirname,'pilote.js'));
const LARGEURS=(process.argv.slice(2).map(Number).filter(Boolean));
const W=LARGEURS.length?LARGEURS:[360,390,430];
const OUT='/tmp/barre'; fs.mkdirSync(OUT,{recursive:true});

(async()=>{
  const S=await ouvrir();
  console.log('  page mesurée : '+S.version);
  await S.c.envoyer('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  try{ await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0,topMax:47,bottomMax:34,leftMax:0,rightMax:0}}); }catch(e){}
  await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){}
    const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){}
    if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(1300);
  await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`);
  await dormir(2500);
  await S.ev(`try{ setPlatForce('iosweb'); }catch(e){} try{ setThemePref('dark'); }catch(e){} window.confirm=()=>false; return 1;`);
  await dormir(700);
  for(const w of W){
    await S.c.envoyer('Emulation.setDeviceMetricsOverride',{width:w,height:844,deviceScaleFactor:3,mobile:true});
    for(const rub of ['dashboard','archives','interventions']){
      for(const defile of [false,true]){
        await S.ev(`try{ closeModal(); }catch(e){} go('${rub}'); return 1;`);
        await dormir(900);
        await S.ev(`window.scrollTo(0, ${defile?600:0}); dispatchEvent(new Event('scroll')); return 1;`);
        await dormir(900);
        const r=await S.ev(`
          const tb=document.querySelector('.topbar'); const B=tb.getBoundingClientRect();
          const vis=[...tb.children].map(e=>{ const b=e.getBoundingClientRect(), st=getComputedStyle(e);
            return { n:e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/)[0]:''),
              x:Math.round(b.left), l:Math.round(b.width), op:+(+st.opacity).toFixed(2), disp:st.display,
              t:(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,22) }; })
            .filter(v=>v.disp!=='none' && v.l>0);
          return { ctx:document.body.classList.contains('ctx'), haut:document.body.classList.contains('rf-haut'),
            y:scrollY, barre:{y:Math.round(B.top),h:Math.round(B.height)}, vis };`);
        const nomf=OUT+'/'+w+'-'+rub+'-'+(defile?'defile':'haut')+'.png';
        const cap=await S.c.envoyer('Page.captureScreenshot',{format:'png',clip:{x:0,y:r.y,width:w,height:r.barre.y+r.barre.h+4,scale:1}});
        fs.writeFileSync(nomf,Buffer.from(cap.data,'base64'));
        console.log('\n  '+w+' px · '+rub+' · '+(defile?'DÉFILÉ':'en haut')+'  (ctx '+r.ctx+', rf-haut '+r.haut+', scrollY '+r.y+')  → '+nomf);
        for(const v of r.vis) console.log('     x '+String(v.x).padStart(4)+'  l '+String(v.l).padStart(4)+'  op '+v.op+'  '+v.n+(v.t?'  « '+v.t+' »':''));
      }
    }
  }
  if(S.exceptions.length) console.log('\n  ⛔ exceptions : '+S.exceptions.slice(0,5).join(' || '));
  S.fermer();
})().catch(e=>{ console.error('ÉCHEC', e); process.exit(1); });
