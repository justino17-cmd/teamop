const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const { PROFILS, poserProfil } = require(path.join(__dirname, 'profils.js'));
(async () => {
  const S = await ouvrir({});
  await S.ev(`window.horsLigneDebut=function(){}; const h=document.getElementById('hl-ecran'); if(h)h.remove();
    if(!db.users.length){db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}});save();}
    currentUser=db.users[0]; enterApp(currentUser); return 1;`);
  await dormir(1500);
  for (const nomP of ['tel', 'bureau']) {
    const P = PROFILS[nomP]; await poserProfil(S, P); await S.ev(`setPlatForce('${P.plat}'); return 1;`);
    for (const v of ['dashboard', 'interventions', 'clients']) {
      await S.ev(`go('${v}'); return 1;`); await dormir(1200);
      console.log(nomP, v, JSON.stringify(await S.ev(`const b=document.querySelector('.ph-back'); if(!b) return null; const r=b.getBoundingClientRect(), cs=getComputedStyle(b);
        const rg=document.createRange(); rg.selectNodeContents(b); const t=rg.getBoundingClientRect();
        return {txt:b.textContent.trim(), larg:Math.round(r.width), pad:cs.paddingLeft+' / '+cs.paddingRight, margeDroite:+(r.right-t.right).toFixed(1), margeGauche:+(t.left-r.left).toFixed(1), coupe:b.scrollWidth>b.clientWidth+1, fond:cs.backgroundColor, flou:cs.backdropFilter, ombre:cs.boxShadow.slice(0,60), rayon:cs.borderRadius};`)));
    }
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
