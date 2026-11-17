const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
const ecr=c=>R.txt(c,'#opsec .ops-ecran');
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`tel-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const kb=await S.provisoire(c,'kb');
 // 5 PIN faux sur le téléphone de Karim
 await S.connecter(c,'karim',kb); await S.lireNombre(c); await S.telephone(c,'kb');
 for(let i=1;i<=5;i++){ await c.p.waitForTimeout(150); if(!await R.vis(c,'#opsec [data-ops="pin-touche"]')) break; await R.pinR(c,'111111'.replace(/1/g,String(i)).slice(0,6)==='111111'?'000000':'000000'); const t=await ecr(c); log(' essai',i,':',t.slice(0,170)); }
 await R.cap(c,tag+'-pin5');
 const t5=await ecr(c); v('au 5e PIN faux: téléphone effacé avec le message exact',/Trop de codes PIN erronés : le compte a été effacé de ce téléphone\. Demande à un administrateur de te donner un nouveau téléphone\./.test(t5),t5.slice(0,200));
 v('le compte n’a plus de téléphone utilisable (la demande de connexion ne peut plus être approuvée)',await c.p.evaluate(()=>!!SECU.comptes.kb.tel&&SECU.comptes.kb.tel.efface===true));
 // et la connexion en cours : que dit l'ordinateur ?
 log('ordinateur:',(await R.txt(c,'#cnx')).slice(0,300));
 // reconnexion de Karim après effacement
 await c.p.evaluate(()=>{ const a=[...document.querySelectorAll('#cnx a,#cnx button')].find(b=>/Annuler/.test(b.textContent)); a&&a.click(); }); await c.p.waitForTimeout(500);
 await S.connecter(c,'karim',kb); log('Karim après effacement:',(await R.txt(c,'#cnx')).slice(0,300));
 v('une personne au téléphone effacé n’est pas bloquée sur une demande sans issue',await c.p.evaluate(()=>!!document.getElementById('cn-form-activer')||!!document.getElementById('cn-form-confirme')), '');
 // Hors ligne
 await L.fermer();
 const c2=await S.ouvrir({profil,nuit}); const kb2=await S.provisoire(c2,'kb');
 await c2.p.evaluate(()=>{ SECU.horsLigne=true; opsDessiner(true); opsDemo(); });
 await S.connecter(c2,'karim',kb2); const n=await S.lireNombre(c2); await S.telephone(c2,'kb'); await R.pinR(c2,PIN); await c2.p.waitForTimeout(400);
 log('HORS LIGNE tel:',(await ecr(c2)).slice(0,300));
 await c2.p.click('#opsec [data-ops="code6"]').catch(()=>{}); await c2.p.waitForTimeout(300);
 const code=await c2.p.evaluate(()=>secuTotp(SECU.comptes.kb.tel.cle,secuMaint()));
 await c2.p.click('#cnx summary'); await c2.p.fill('#cn-code6',code); await c2.p.click('#cnx details button'); v('hors ligne: le code à 6 chiffres ouvre l’application',await S.attendreApp(c2,8000,true));
 // inactivité 15 min
 await c2.p.waitForTimeout(800); await S.avancer(c2,16); await c2.p.waitForTimeout(1500);
 log('après 16 min:',(await R.txt(c2,'#cnx')||'').slice(0,330)); v('message d’inactivité exact',/Tu as été déconnecté : 15 minutes sans rien toucher\. Reconnecte-toi\./.test(await R.txt(c2,'#cnx')||''));
 log('ERRJS',c.err.slice(0,3),c2.err.slice(0,3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,800));process.exit(1)});
