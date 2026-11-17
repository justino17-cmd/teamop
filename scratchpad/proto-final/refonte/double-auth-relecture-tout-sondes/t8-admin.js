const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`adm-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const MSG='Identifiant ou mot de passe incorrect, ou compte verrouillé. Si tu es sûr de toi, préviens ton administrateur.';
 const leaClair=await S.provisoire(c,'lr'); log('mdp de Léa (démo):',leaClair);
 // Léa verrouillée: bon mot de passe refusé
 await S.connecter(c,'lea',leaClair); v('Léa verrouillée: phrase générique', (await S.erreur(c))===MSG, await S.erreur(c));
 await D.tous(c); const rg=await D.entrer(c,'marc'); v('Marc connecté',rg.ok);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(900); await R.cap(c,tag+'-equipe');
 log('BANDEAU:',await R.txt(c,'.sec-bandeau'));
 v('bandeau rouge « 1 compte verrouillé : Léa Roux. »', /1 compte verrouillé : Léa Roux\./.test(await R.txt(c,'.sec-bandeau')||''));
 await c.p.click('[data-sec2="voir"]'); await c.p.waitForTimeout(800); await R.cap(c,tag+'-securite');
 log('SECU PAGE:',(await R.txt(c,'#contenu')).slice(0,900));
 // déverrouiller par le bouton de la page
 await c.p.click('[data-sec2="deverrouiller|lr"]'); await c.p.waitForTimeout(500); await R.cap(c,tag+'-dev-panneau');
 v('bouton grisé tant que la case n’est pas cochée', await c.p.evaluate(()=>document.getElementById('sec-tel-ok').disabled));
 // clic forcé malgré disabled
 await c.p.evaluate(()=>{const b=document.getElementById('sec-tel-ok'); b.disabled=false; b.click(); b.disabled=true;}); await c.p.waitForTimeout(400);
 v('clic forcé sans case: rien (pas de fenêtre de confirmation, compte toujours verrouillé)', !(await D.conf(c)) && await c.p.evaluate(()=>!!SECU.comptes.lr.verrou), await c.p.evaluate(()=>!!SECU.comptes.lr.verrou));
 await c.p.check('#sec-verif'); v('bouton ouvert après la case', !(await c.p.evaluate(()=>document.getElementById('sec-tel-ok').disabled)));
 await S.avancer(c,6); // la fenêtre de 5 min de la connexion est écoulée
 await c.p.click('#sec-tel-ok'); await c.p.waitForTimeout(500); const conf=await D.conf(c); log('CONF:',conf&&conf.texte.slice(0,200)); v('confirmation demandée avec la phrase « déverrouiller le compte de Léa »', conf&&/déverrouiller le compte de Léa/.test(conf.texte));
 v('Léa toujours verrouillée tant que non confirmé', await c.p.evaluate(()=>!!SECU.comptes.lr.verrou));
 await D.confirmer(c,'marc',{ok:true}); await c.p.waitForTimeout(800); await R.cap(c,tag+'-prov');
 const prov=await R.txt(c,'[data-sec="provisoire"]'); log('PROV affiché:',prov); v('panneau avec nouveau provisoire', !!prov && prov!==leaClair, prov);
 log('PANNEAU:',(await R.txt(c,'.panneau')).slice(0,400));
 v('aucun bouton Copier dans le panneau', !(await c.p.evaluate(()=>/Copier/.test(document.querySelector('.panneau').innerText))));
 await c.p.click('[data-sec2="prov-ok"]'); await c.p.waitForTimeout(500);
 v('« Terminé » efface le provisoire du DOM', !(await c.p.evaluate(p=>document.body.innerHTML.includes(p),prov)) || await c.p.evaluate(p=>{const d=document.querySelector('.sec-demo');const h=document.body.innerHTML.split(p).length-1;return h<=1},prov));
 log('occurrences du provisoire dans le DOM après Terminé:', await c.p.evaluate(p=>document.body.innerHTML.split(p).length-1,prov));
 // Marc se déconnecte; Léa se connecte: ancien mdp mort, nouveau ok
 await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1500);
 await S.connecter(c,'lea',leaClair); v('ancien mot de passe de Léa refusé', (await S.erreur(c))===MSG, await S.erreur(c));
 const nouveau=await c.p.evaluate(()=>SECU.comptes.lr.prov); await S.connecter(c,'lea',nouveau); 
 log('apres nouveau prov:',(await R.txt(c,'#cnx')).slice(0,500));
 await R.cap(c,tag+'-lea-apres');
 log('ERRJS',c.err.slice(0,5)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
