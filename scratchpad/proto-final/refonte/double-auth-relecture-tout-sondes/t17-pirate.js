const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`pir-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const kb=await S.provisoire(c,'kb'); const MSG='Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
 // Karim connecté sur cet ordinateur
 await S.connecter(c,'karim',kb); let n=await S.lireNombre(c); await S.approuver(c,'kb',n,PIN); await c.p.waitForTimeout(500); if(await R.vis(c,'#opsec [data-ops="revenir"]')) await c.p.click('#opsec [data-ops="revenir"]');
 v('Karim connecté',await S.attendreApp(c,12000,true)); await c.p.waitForTimeout(1200); await c.p.evaluate(()=>{const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click();});
 // pirate par le vrai bouton du bloc Démonstration
 await R.ouvrirTel(c); await c.p.waitForTimeout(300);
 const btn=await c.p.$('#opsec .sec-demo button:has-text("Simuler une connexion pirate")'); await btn.scrollIntoViewIfNeeded(); await btn.click(); await c.p.waitForTimeout(600);
 log('avis:',(await R.txt(c,'#opsec .sec-avis')||'').slice(0,500));
 await R.cap(c,tag+'-pirate'); 
 // déverrouiller le téléphone de Karim avec le PIN et lire la carte
 await S.deverrouiller(c,'kb',PIN); await c.p.waitForTimeout(400); log('CARTE:',(await R.txt(c,'#opsec .ops-carte')).slice(0,500)); await R.cap(c,tag+'-carte-rouge');
 // Ce n'est pas moi → Annuler → rien
 await c.p.click('#opsec [data-ops="pas-moi"]'); await c.p.waitForTimeout(400); log('CONFIRM:',(await R.txt(c,'#opsec .ops-ecran')).slice(-300)); await R.cap(c,tag+'-bloquer?');
 await c.p.click('#opsec [data-ops="annuler"]'); await c.p.waitForTimeout(300);
 v('Annuler ne change rien: compte non verrouillé',await c.p.evaluate(()=>!SECU.comptes.kb.verrou&&!!SECU.sessions.kb));
 await c.p.click('#opsec [data-ops="pas-moi"]'); await c.p.click('#opsec [data-ops="bloquer"]'); await c.p.waitForTimeout(900); 
 log('après blocage tel:',(await R.txt(c,'#opsec .ops-ecran')).slice(0,400)); await R.cap(c,tag+'-bloque');
 v('session fermée (écran de connexion)', await c.p.evaluate(()=>!SESSION&&!!document.getElementById('cn-form')));
 log('message login:',(await R.txt(c,'#cnx')).slice(0,400));
 await R.fermeTel(c); await R.cap(c,tag+'-ecran-apres');
 await S.connecter(c,'karim',kb); v('Karim verrouillé: même phrase',(await S.erreur(c))===MSG, await S.erreur(c));
 // lien « Mot de passe oublié »
 const mo=await c.p.$('#cnx [data-cnx="oubli"]'); await mo.click(); await c.p.waitForTimeout(400); log('OUBLI:',(await R.txt(c,'#cn-aide, #cnx')).slice(-400));
 log('ERRJS',c.err.slice(0,3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,800));process.exit(1)});
