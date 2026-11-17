const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`scen-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const MSG='Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
 const kb=await S.provisoire(c,'kb');
 // S1 : 5 mots de passe faux => verrou
 for(let i=1;i<=5;i++){ await S.connecter(c,'karim','faux-faux-faux'+i); }
 v('S1 5 faux => message générique', (await S.erreur(c))===MSG, await S.erreur(c));
 await S.connecter(c,'karim',kb); v('S1 verrou: bon mdp refusé, même phrase',(await S.erreur(c))===MSG, await S.erreur(c));
 v('S1 on reste sur la connexion', await c.p.evaluate(()=>!!document.getElementById('cn-form')&&!document.getElementById('cn-form-confirme')));
 log('   démo aide:',await R.txt(c,'[data-sec="cases-demo"]'));
 await S.avancer(c,14); await S.connecter(c,'karim',kb); v('S1 +14 min encore verrouillé',(await S.erreur(c))===MSG);
 await S.avancer(c,2); await S.connecter(c,'karim',kb); v('S1 +16 min: la demande part', await S.attendreSel(c,'#cn-form-confirme',3000));
 // mauvais nombre 
 let n=await S.lireNombre(c); const faux=String(10+((+n-10+1)%90)); await S.approuver(c,'kb',faux,PIN); await c.p.waitForTimeout(900);
 const e=await S.erreur(c); v('S2 mauvais nombre: retour connexion + message exact', e==='Mauvais nombre tapé sur le téléphone : la connexion a été annulée par sécurité.', e);
 log('   tel:',(await R.tel(c)).slice(0,0), await c.p.evaluate(()=>{const e=document.querySelector('#opsec [data-ops="msg"]');return e?e.innerText:null}));
 // 1 échec compté (le compteur avait été remis à zéro ? verrou doublé ?)
 const st=await c.p.evaluate(()=>{const x=SECU.comptes.kb;return {echecs:x.echecs,verrou:x.verrou&&x.verrou.n}}); log('   état karim',st);
 // reconnexion + expiration
 await S.connecter(c,'karim',kb); n=await S.lireNombre(c); await S.avancer(c,2); await c.p.waitForTimeout(1500);
 log('   après +2min:',(await R.txt(c)).slice(0,300));
 v('S3 expiration: texte « La demande a expiré. »',/La demande a expiré\./.test(await R.txt(c)));
 const rec=await c.p.evaluate(()=>[...document.querySelectorAll('#cnx button,#cnx a')].map(b=>b.textContent.trim()).filter(Boolean)); log('   boutons:',rec);
 await R.cap(c,tag+'-expire');
 // Recommencer
 const b=await c.p.$('#cnx button:has-text("Recommencer")'); if(b){ await b.click(); await c.p.waitForTimeout(500); v('S3 Recommencer ramène à la connexion', await c.p.evaluate(()=>!!document.getElementById('cn-form')));
 log('   champs vidés ?', await c.p.evaluate(()=>[document.getElementById('cn-id').value,document.getElementById('cn-mdp').value])); }
 // Annuler
 await S.connecter(c,'karim',kb); await S.lireNombre(c); await c.p.click('#cnx a:has-text("Annuler"), #cnx button:has-text("Annuler")'); await c.p.waitForTimeout(500);
 v('S4 Annuler => connexion', await c.p.evaluate(()=>!!document.getElementById('cn-form')&&!document.getElementById('cn-form-confirme')));
 v('S4 la demande est retirée du téléphone', await c.p.evaluate(()=>SECU.demandes.filter(d=>d.k==='kb'&&d.etat==='attente').length===0), await c.p.evaluate(()=>SECU.demandes.map(d=>d.k+d.etat)));
 // demandes: 6 en 15 min => 7e refusée
 let refus=null, nb=0; for(let i=0;i<8;i++){ await S.connecter(c,'karim',kb); const att=await S.attendreSel(c,'#cn-form-confirme',1500); if(!att){ refus=await S.erreur(c); break; } nb++; await c.p.click('#cnx a:has-text("Annuler"), #cnx button:has-text("Annuler")'); await c.p.waitForTimeout(250); }
 log('   demandes acceptées avant refus (déjà 3 faites avant: mauvais nombre, expirée, annulée):',nb,'refus:',refus);
 v('S5 limite de demandes atteinte avec message exact', refus==='Trop de demandes de connexion. Attends quelques minutes avant de réessayer.', refus);
 await S.avancer(c,16);
 // code à 6 chiffres
 await S.connecter(c,'karim',kb); await S.lireNombre(c);
 await c.p.click('#cnx summary'); await c.p.waitForTimeout(300); const code=await c.p.evaluate(()=>{const x=SECU.comptes.kb;return secuTotp(x.tel.cle,secuMaint())});
 log('   details:',await R.txt(c,'#cn-form-confirme details'));
 await c.p.fill('#cn-form-confirme input[inputmode="numeric"], #cn-form-confirme input[autocomplete="one-time-code"], #cn-code6',code); await c.p.click('#cn-form-confirme details button'); v('S6 code 6 chiffres accepté (habituelle)', await S.attendreApp(c,8000,true));
 await c.p.waitForTimeout(500); await R.cap(c,tag+'-app-code');
 log('ERRJS',c.err.slice(0,5)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer(); process.exit(ko?1:0);
})().catch(e=>{console.log('EXC',e);process.exit(1)});
