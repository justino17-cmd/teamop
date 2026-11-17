const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit'; const ecr=c=>R.txt(c,'#opsec .ops-ecran');
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const log=(...a)=>console.log(...a); const kb=await S.provisoire(c,'kb');
 await S.connecter(c,'karim',kb); await S.lireNombre(c); await S.telephone(c,'kb');
 for(let i=0;i<5;i++){ if(!await R.vis(c,'#opsec [data-ops="pin-touche"]')) break; await R.pinR(c,'000000'); }
 log('tel après 5 PIN:',(await ecr(c)).slice(0,260)); await R.cap(c,`efface-${profil}-tel`);
 // la personne retente
 await R.fermeTel(c); await c.p.evaluate(()=>{ const a=[...document.querySelectorAll('#cnx a,#cnx button')].find(b=>/Annuler/.test(b.textContent)); a&&a.click(); }); await c.p.waitForTimeout(500);
 await S.connecter(c,'karim',kb); await S.attendreSel(c,'#cn-form-confirme',3000); await c.p.waitForTimeout(400); await R.cap(c,`efface-${profil}-pc`);
 log('PC:',(await R.txt(c,'#cnx')).slice(0,420));
 // le téléphone peut-il l'approuver ?
 await S.telephone(c,'kb'); await c.p.waitForTimeout(300); const e1=await ecr(c); log('tel de Karim:',e1.slice(0,300));
 const bouton=await c.p.evaluate(()=>[...document.querySelectorAll('#opsec .ops-ecran button')].map(b=>b.textContent.trim()));
 log('boutons du téléphone:',bouton);
 const nb=await c.p.evaluate(()=>SECU.demandes.filter(d=>d.k==='kb'&&d.etat==='attente').length);
 log('demandes en attente pour Karim:',nb,'| carte sur le téléphone:',await c.p.evaluate(()=>!!document.querySelector('#opsec .ops-carte')));
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,800));process.exit(1)});
