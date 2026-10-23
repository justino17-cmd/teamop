/* Captures du tiroir du menu au téléphone, jour et nuit : ouvert (voile plein), puis tiré de 90 px au doigt (voile qui
   s'éclaircit avec lui) — pour REGARDER. Usage : node capture-tiroir.js <dossier>. ⛔ Bêta uniquement, 127.0.0.1. */
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
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  const shot = async (nom) => { const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, nom + '.png'); fs.writeFileSync(f, Buffer.from(img.data, 'base64')); console.log(f); };
  for (const theme of ['light', 'dark']) {
    await S.ev(`setThemePref('${theme}'); go('clients'); return 1;`); await dormir(1500);
    await S.ev(`document.getElementById('sidebar').classList.add('open'); const b=document.getElementById('sidebar-backdrop'); getComputedStyle(b).opacity;
      await Promise.race([Promise.all(b.getAnimations().map(a=>a.finished.catch(()=>0))), new Promise(r=>setTimeout(r,4000))]); return 1;`);
    await images(); await shot('tel-' + theme + '-ouvert');
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 220, y: 500, id: 1 }] });
    for (let x = 200; x >= 130; x -= 20) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 500, id: 1 }] }); await images(); }
    await images(); await shot('tel-' + theme + '-tire');
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(900);
    await S.ev(`document.getElementById('sidebar').classList.remove('open'); return 1;`); await dormir(600);
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });
