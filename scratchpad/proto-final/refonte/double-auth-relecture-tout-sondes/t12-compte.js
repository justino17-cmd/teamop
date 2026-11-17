const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit', qui=process.argv[4]||'kb';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`cpt-${qui}-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 let mdp0=await S.provisoire(c,qui);
 if(!['kb','lr'].includes(qui)) await D.tous(c); const rg={ok:await R.entrer(c,qui)}; v('connecté',rg.ok);
 // ouvrir « Mon compte » par un vrai clic (pied du menu ou menu téléphone)
 const narrow=c.largeur<1100;
 if(!(await c.p.$('[data-cnx="moncompte"] >> visible=true'))){ const m=await c.p.$('#barre-bas [data-go="menu"], #barre-bas button:has-text("Menu"), [aria-label="Menu"]'); log('ouvre menu via',!!m); if(m){ await m.click(); await c.p.waitForTimeout(500);} }
 const mc=await c.p.$('[data-cnx="moncompte"] >> visible=true'); v('« Mon compte » trouvé et visible',!!mc); await mc.scrollIntoViewIfNeeded();
 await mc.click(); await c.p.waitForTimeout(800); await R.cap(c,tag+'-compte'); log('COMPTE:',(await R.txt(c,'.panneau, #calque')||'').slice(0,1400));
 const dg=await L.doigts(c.p,'#calque'); log('  cibles:',dg.petits.join(' ; '),'| champs:',dg.champs.join(' ; '),'| écrasés:',dg.ecrases.join(' ; ')); const d=await L.deborde(c); log('  débord',JSON.stringify(d));
 // défiler jusqu'en bas du panneau et capturer
 await c.p.evaluate(()=>{const p=document.querySelector('#calque .panneau, #calque'); if(p) p.scrollTop=99999}); await c.p.waitForTimeout(300); await R.cap(c,tag+'-compte-bas');
 // changer mdp : cas d'erreur
 await c.p.click('[data-sec2="mdp"]'); await c.p.waitForTimeout(500);
 const essai=async(a0,a1,a2)=>{ await c.p.fill('#sec-m0',a0); await c.p.fill('#sec-m1',a1); await c.p.fill('#sec-m2',a2); await c.p.click('[data-sec2="mdp-ok"]'); await c.p.waitForTimeout(300); return c.p.evaluate(()=>document.getElementById('sec-merr')&&document.getElementById('sec-merr').textContent); };
 log('actuel faux:',await essai('xxxxxxxxxxxxx','cheval agrafe batterie 2','cheval agrafe batterie 2'));
 log('court:',await essai(mdp0,'abc','abc'));
 log('diff:',await essai(mdp0,'cheval agrafe batterie 2','cheval agrafe batterie 3'));
 log('même:',await essai(mdp0,mdp0,mdp0));
 await R.cap(c,tag+'-mdp-erreur');
 // 30 mauvais mots de passe actuels : verrou ?
 for(let i=0;i<8;i++) await essai('faux-faux-faux-'+i,'cheval agrafe batterie 2','cheval agrafe batterie 2');
 log('apres 8 faux (compte):',await D.compte(c,qui));
 if(!['kb','lr'].includes(qui)) mdp0='cheval agrafe batterie '+qui; const neuf='cheval agrafe batterie 2'; log('bon:',JSON.stringify(await essai(mdp0,neuf,neuf)),'| toast:',await c.p.evaluate(()=>document.body.innerText.includes('Mot de passe changé')));
 await R.cap(c,tag+'-mdp-ok');
 v('le mot de passe n’est dans aucun champ après',!(await c.p.evaluate(n=>[...document.querySelectorAll('input')].some(i=>i.value.includes(n)),neuf)));
 v('ni dans le rangement',!(await S.rangement(c)).includes(neuf));
 // se déconnecter, ancien refusé, nouveau accepté
 await c.p.evaluate(()=>{ try{fermerPanneau()}catch(e){} }); 
 const so=await c.p.$('[data-cnx="sortir"]'); if(so && await R.vis(c,'[data-cnx="sortir"]')) await so.click(); else await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1500);
 log('message de sortie:',(await R.txt(c,'#cnx')).slice(0,300));
 await R.cap(c,tag+'-sortie');
 await S.connecter(c,S.ID[qui],mdp0); log('ancien:',await S.erreur(c));
 await S.connecter(c,S.ID[qui],neuf); v('nouveau accepté (demande de confirmation)', await S.attendreSel(c,'#cn-form-confirme',4000));
 log('ERRJS',c.err.slice(0,3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
