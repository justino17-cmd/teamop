/* Captures de l'état APPUYÉ (forcé par CSS.forcePseudoState) au téléphone, jour et nuit : une case du Planning général
   et la barre d'outils du planning — pour REGARDER le voile d'appui. Usage : node capture-appui.js <dossier>.
   ⛔ Bêta uniquement, copie locale en 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  await S.c.envoyer('DOM.enable'); await S.c.envoyer('CSS.enable');
  const forcer = async (sel, on) => { const doc = await S.c.envoyer('DOM.getDocument', { depth: 1 }); const q = await S.c.envoyer('DOM.querySelector', { nodeId: doc.root.nodeId, selector: sel });
    if (!q.nodeId) return false; await S.c.envoyer('CSS.forcePseudoState', { nodeId: q.nodeId, forcedPseudoClasses: on ? ['active'] : [] }); return true; };
  const finir = () => S.ev(`await Promise.race([Promise.all(document.getAnimations().filter(a=>a.transitionProperty).map(a=>a.finished.catch(()=>0))), new Promise(r=>setTimeout(r,2000))]); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return 1;`);
  const shot = async (nom, sel) => { const r = await S.ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,400)); const b=e.getBoundingClientRect(); return {x:Math.max(0,b.left-30)+scrollX,y:Math.max(0,b.top-30)+scrollY,width:Math.min(innerWidth,b.width+60),height:b.height+60};`);
    if (!r) { console.log('absent : ' + sel); return; } await finir();
    const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png', clip: Object.assign(r, { scale: 1 }) }); const f = path.join(OUT, nom + '.png'); fs.writeFileSync(f, Buffer.from(img.data, 'base64')); console.log(f); };
  for (const theme of ['light', 'dark']) {
    await S.ev(`setThemePref('${theme}'); go('planningGeneral'); return 1;`); await dormir(2500);
    const cel = '.pg-cel[onclick]'; await shot(theme + '-pg-repos', cel); await forcer(cel, true); await shot(theme + '-pg-appui', cel); await forcer(cel, false);
    const nav = '.pf-nav u[onclick]'; await shot(theme + '-nav-repos', '.pf-nav'); await forcer(nav, true); await shot(theme + '-nav-appui', '.pf-nav'); await forcer(nav, false);
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });
