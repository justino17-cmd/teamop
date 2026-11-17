const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R;
(async()=>{
 const c=await S.ouvrir({profil:'mac'}); const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(700);
 await (await c.p.$('[data-eqx="fiche|kb"], [data-eq="fiche|kb"]')).click(); await c.p.waitForTimeout(800);
 log('boutons:',await c.p.$$eval('#calque button',e=>e.filter(x=>x.offsetParent).map(x=>x.textContent.trim().replace(/\s+/g,' ').slice(0,80)).filter(t=>/mot de passe|téléphone|Copier|Déconnecter|Ouvrir|Désactiver|lien/i.test(t))));
 log('fiche Connexion:',(await R.txt(c,'.cn-acces')||'').slice(0,700));
 await c.p.evaluate(()=>{const e=document.querySelector('.cn-acces'); e&&e.scrollIntoView({block:'center'})}); await R.cap(c,'fiche-actuelle');
 await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,600));process.exit(1)});
