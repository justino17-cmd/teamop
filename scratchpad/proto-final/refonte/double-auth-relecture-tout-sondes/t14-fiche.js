const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`fiche-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const kbClair=await S.provisoire(c,'kb');
 await D.tous(c); await D.entrer(c,'marc'); await R.fermeTel(c);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(700);
 // ouvrir la fiche de Karim par clic
 const carte=await c.p.$('[data-eqx="fiche|kb"], [data-eq="fiche|kb"], .eq-carte:has-text("Karim")'); log('carte Karim:',!!carte);
 await carte.click(); await c.p.waitForTimeout(800); await R.cap(c,tag+'-fiche'); const ft=await R.txt(c,'.panneau, #calque'); log('FICHE:',ft.slice(0,1100));
 v('aucun mot de passe lisible dans la fiche', !ft.includes(kbClair) && !/Bienvenue17/.test(ft));
 const copier=await c.p.evaluate(()=>{const b=document.querySelector('[data-cnx="copier"]');return b&&b.dataset.t}); log('TEXTE COPIÉ:',JSON.stringify(copier)); v('texte à copier sans mot de passe', copier&&!copier.includes(kbClair)&&/je te le remets en main propre/.test(copier));
 const btns=await c.p.evaluate(()=>[...document.querySelectorAll('.panneau .actions button')].map(b=>b.textContent.trim())); log('boutons:',btns);
 const dg=await L.doigts(c.p,'#calque'); log('  cibles:',dg.petits.join(' ; '),'| écrasés:',dg.ecrases.join(' ; '));
 // Nouveau téléphone
 await c.p.click('[data-sec2="telephone|kb"]'); await c.p.waitForTimeout(500); await R.cap(c,tag+'-nvtel');
 await c.p.check('#sec-verif'); await S.avancer(c,6); await c.p.click('#sec-tel-ok'); await c.p.waitForTimeout(500);
 await D.confirmer(c,'marc',{ok:true}); await c.p.waitForTimeout(900); await R.cap(c,tag+'-nvtel-prov');
 const prov=await R.txt(c,'[data-sec="provisoire"]'); log('PROV:',prov); log('PANNEAU:',(await R.txt(c,'.panneau')).slice(0,400));
 const cpt=await D.compte(c,'kb'); v('Karim : téléphone retiré, code activation vide, appareils oubliés',!cpt.tel&&cpt.appareils===0,cpt);
 await c.p.click('[data-sec2="prov-ok"]'); await c.p.waitForTimeout(600);
 // le téléphone de Karim s'efface à la lecture
 await c.p.evaluate(()=>{ SECU.telCourant='kb'; if(!document.getElementById('opsec').hasAttribute('data-ouvert')) opsOuvrir(); opsDessiner(true); }); await c.p.waitForTimeout(500);
 log('TEL de Karim:',(await R.txt(c,'#opsec .ops-ecran')||'').slice(0,400)); await R.cap(c,tag+'-tel-revoque');
 // Karim se connecte avec l'ancien mdp / nouveau
 await R.fermeTel(c); await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1500);
 await S.connecter(c,'karim',kbClair); log('ancien mdp:',(await S.erreur(c)).slice(0,60));
 await S.connecter(c,'karim',prov); v('nouveau provisoire -> activation',await S.attendreSel(c,'#cn-form-activer',4000)); await R.cap(c,tag+'-reactivation');
 log('ERRJS',c.err.slice(0,3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,300));process.exit(1)});
