/* Captures de la feuille « Créer » tirée de 140 px au doigt, jour et nuit — pour REGARDER (voile éclairci, feuille qui
   suit). Usage : node capture-creer.js <dossier>. ⛔ Bêta uniquement, 127.0.0.1. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); }catch(e){} enterApp(currentUser); return 1;`);
  await dormir(1200); await S.ev(`try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(1500);
  const P = PROFILS.tel; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
  const images = () => S.ev(`return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(1))));`);
  for (const theme of ['light', 'dark']) {
    await S.ev(`setThemePref('${theme}'); go('dashboard'); return 1;`); await dormir(1500);
    await S.ev(`creerOuvrir(); return 1;`); await dormir(300);
    await S.ev(`const f=document.querySelector('#creer .creer-sheet'); await Promise.race([Promise.all(f.getAnimations().map(a=>a.finished.catch(()=>0))), new Promise(r=>setTimeout(r,4000))]); return 1;`);   // la montée FINIE, pas un délai
    const p = await S.ev(`const f=document.querySelector('#creer .creer-sheet').getBoundingClientRect(); return {x:Math.round(f.left+f.width/2), y:Math.round(f.top+22)};`);
    await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] });
    for (let y = p.y + 20; y <= p.y + 140; y += 20) { await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y, id: 1 }] }); await images(); }
    await images(); const img = await S.c.envoyer('Page.captureScreenshot', { format: 'png' }); const f = path.join(OUT, 'creer-' + theme + '.png'); fs.writeFileSync(f, Buffer.from(img.data, 'base64')); console.log(f);
    await dormir(300); await S.c.envoyer('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(900);
    await S.ev(`try{ creerFermer(); }catch(e){} return 1;`); await dormir(600);
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('⛔ ' + e.message); process.exit(1); });
