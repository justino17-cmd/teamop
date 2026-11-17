const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'iphone', nuit=process.argv[3]==='nuit';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`app-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const mes=async(nom,zone)=>{ const d=await L.deborde(c); const dg=await L.doigts(c.p,zone||'body'); log(`  [${nom}] débord:`,JSON.stringify({bouge:d.bouge,sw:d.seconde,L:d.largeur,cou:d.coupable}),'| petits:',dg.petits.join(' ; '),'| champs<16:',dg.champs.join(' ; '),'| écrasés:',dg.ecrases.join(' ; ')); };
 await R.cap(c,tag+'-0connexion'); await mes('connexion','#cnx');
 const kb=await S.provisoire(c,'kb');
 await c.p.evaluate(()=>document.querySelector('[data-sec="cases-demo"] input').click());
 await S.connecter(c,'karim',kb); await S.attendreSel(c,'#cn-form-confirme',4000); await c.p.waitForTimeout(500);
 await R.cap(c,tag+'-1rouge'); await mes('rouge','#cnx');
 const nb=await c.p.evaluate(()=>{const e=document.querySelector('[data-sec="nombre"]');const r=e.getBoundingClientRect();const p=document.querySelector('[data-ops-ouvrir], .ops-pastille');const rp=p&&p.getBoundingClientRect();return {nb:[Math.round(r.top),Math.round(r.bottom),Math.round(r.height)],pastille:rp?[Math.round(rp.top),Math.round(rp.bottom)]:null,vh:innerHeight,fs:parseFloat(getComputedStyle(e).fontSize)}}); log('  nombre/pastille:',JSON.stringify(nb));
 const n=await S.lireNombre(c);
 // ouvrir le téléphone par le geste (pastille)
 await R.ouvrirTel(c); await c.p.waitForTimeout(500); await R.cap(c,tag+'-2tel-verrou'); await mes('tel verrou','#opsec');
 await R.pinR(c,PIN); await c.p.waitForTimeout(500); await R.cap(c,tag+'-3tel-carte'); await mes('tel carte','#opsec');
 // taper le nombre avec le vrai champ
 await c.p.click('#opsec [data-ops="nombre-champ"]'); await c.p.keyboard.type(n,{delay:60}); await c.p.waitForTimeout(200); await R.cap(c,tag+'-4tel-saisi');
 await c.p.click('#opsec [data-ops="approuver"]'); await c.p.waitForTimeout(900); await R.cap(c,tag+'-5apres');
 log('  après approbation: écran téléphone:',(await R.txt(c,'#opsec .ops-ecran')||'').slice(0,160));
 // revenir à l'application si vue étroite
 if(await R.vis(c,'#opsec [data-ops="revenir"]')){ await c.p.click('#opsec [data-ops="revenir"]'); await c.p.waitForTimeout(800); }
 log('  app ouverte ?',await S.attendreApp(c,12000,true)); await c.p.waitForTimeout(800);
 await R.cap(c,tag+'-6app');
 // éléments flottants après connexion (vue étroite)
 const flo=await c.p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e);return s.position==='fixed'&&e.getBoundingClientRect().width>0&&s.display!=='none'&&s.visibility!=='hidden'&&!/^(menu|barre-bas|calque|nv)$/.test(e.id)}).map(e=>(e.id||e.className).toString().slice(0,40)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)));
 log('  fixed visibles dans l’app:',flo.join(' ; '));
 log('ERRJS',c.err.slice(0,3)); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
