// Connexion de tous les jours (Karim, téléphone prêt, PIN 246802) : bon nombre, mauvais nombre, expiration, annulation, code à 6 chiffres, comptes de tentatives.
const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`jour-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const mdp=await S.provisoire(c,'kb'); log('mdp karim lisible dans démo:',mdp);
 // 1 champ vide
 await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(300); log('vide:',await S.erreur(c));
 // 2 inconnu vs faux: mêmes messages ?
 await S.connecter(c,'zzz','Abcdefghijkl1'); const e1=await S.erreur(c);
 await S.connecter(c,'karim','faux-faux-faux1'); const e2=await S.erreur(c); log('inconnu:',e1===e2, '| faux:',e2);
 // aide sous la carte (échecs restants)
 log('aide demo:',await R.txt(c,'.sec-demo-cases, [data-sec="cases-demo"]'));
 // bonne connexion
 await c.p.fill('#cn-id','karim'); await c.p.fill('#cn-mdp',mdp); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(900);
 log('confirme?',await S.attendreSel(c,'#cn-form-confirme',4000));
 await R.cap(c,tag+'-confirme'); log('CONF:',(await R.txt(c)).slice(0,700));
 const n=await S.lireNombre(c); log('nombre',n);
 // le téléphone ne doit pas montrer le nombre
 await R.ouvrirTel(c); await c.p.waitForTimeout(300); log('TEL (verrou):',(await R.tel(c)).replace(/.*12:\d\d/,'').slice(0,200));
 // mauvais PIN
 await R.pinR(c,'000000').catch(e=>log('pin err',e.message.slice(0,80))); log('mauvais PIN:',(await R.tel(c)).slice(-250));
 await R.pinR(c,PIN); await c.p.waitForTimeout(500); await R.cap(c,tag+'-carte'); log('CARTE:',(await R.tel(c)).replace(/.*12:\d\d/,'').slice(0,700));
 const nombreDansTel=await c.p.evaluate(n=>document.getElementById('opsec').innerHTML.includes('>'+n+'<')||document.getElementById('opsec').innerText.includes(n),n); log('nombre dans le téléphone ?',nombreDansTel);
 // champ vide / 1 chiffre
 await c.p.click('#opsec [data-ops="approuver"]'); await c.p.waitForTimeout(300); log('approuver vide:',(await R.tel(c)).slice(-200));
 // lettres dans le champ
 await c.p.fill('#opsec [data-ops="nombre-champ"]','ab'); log('champ lettres:',await c.p.inputValue('#opsec [data-ops="nombre-champ"]'));
 await c.p.fill('#opsec [data-ops="nombre-champ"]','123'); log('champ 123:',await c.p.inputValue('#opsec [data-ops="nombre-champ"]'));
 // bon nombre
 await c.p.fill('#opsec [data-ops="nombre-champ"]',n); await c.p.click('#opsec [data-ops="approuver"]'); await c.p.waitForTimeout(500); log('apres approuver tel:',(await R.tel(c)).slice(-250));
 log('app?',await S.attendreApp(c,15000,true)); await c.p.waitForTimeout(800); await R.cap(c,tag+'-app');
 log('ERRJS',c.err.slice(0,5)); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
