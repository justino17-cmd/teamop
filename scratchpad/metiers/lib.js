/* Bibliothèque des sondes du chantier métiers : pilote.js (copie locale de beta.html en 127.0.0.1) + entrée dans l'app. */
const fs=require('fs'), path=require('path');
const {ouvrir,dormir}=require('./pilote.js');
const {PROFILS,poserProfil}=require('./profils.js');
const RACINE=path.join(__dirname,'..','..');
async function demarrer(o){
  o=o||{};
  const S=await ouvrir({source:o.source||process.env.SOURCE||path.join(RACINE,'beta.html')});
  S.dormir=dormir;
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){}; return 1;`);
  await S.ev(`if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; try{ localStorage.setItem('elanB_onboarded_'+currentUser.id,'1'); localStorage.setItem('elanB_push_ask_'+currentUser.id,'1'); localStorage.setItem('elanB_photo_prompt_'+currentUser.id,'1'); }catch(e){}
    if(typeof enterApp==='function') enterApp(currentUser); return 1;`);
  await dormir(1400);
  if(o.demo!==false){ await S.ev(`window.confirm=()=>true; try{ betaRemplir(false); }catch(e){} return 1;`); await dormir(2500); }
  S.ranger=async()=>{ for(let k=0;k<4;k++){
    await S.ev(`const b=[...document.querySelectorAll('button,.btn')].find(x=>/Plus tard/.test(x.textContent||'')); if(b) b.click(); try{ closeModal(); }catch(e){} return 1;`);
    await dormir(250);
    const reste=await S.ev(`const o=document.querySelector('#overlay'); return !!(o && getComputedStyle(o).display!=='none' && o.getBoundingClientRect().width>100);`);
    if(!reste) return true; } return false; };
  S.profil=async(nom,theme)=>{ const P=PROFILS[nom]||o.perso; await poserProfil(S,P);
    await S.ev(`try{ setPlatForce('${P.plat}'); }catch(e){} try{ setThemePref('${theme||P.theme}'); }catch(e){} return 1;`); await dormir(700); return P; };
  S.snap=async(fichier,clip)=>{ const a={format:'png'}; if(clip) a.clip=Object.assign({scale:1},clip);
    const cap=await S.c.envoyer('Page.captureScreenshot',a); fs.mkdirSync(path.dirname(fichier),{recursive:true}); fs.writeFileSync(fichier,Buffer.from(cap.data,'base64')); return fichier; };
  S.metier=async(k)=>{ await S.ev(`db.metier='${k}'; try{ renderNav(); }catch(e){} return 1;`); await dormir(200); };
  return S;
}
module.exports={demarrer,dormir,PROFILS,RACINE};
