const R=require('./rt.js'); const {S,L}=R;
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit', qui=process.argv[4]||'marc', pin=process.argv[5]||'135792';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`act-${qui}-${profil}-${nuit?'nuit':'jour'}`;
 const log=(...a)=>console.log(...a);
 // connexion erronée d'abord
 await c.p.fill('#cn-id',S.ID[qui]); await c.p.fill('#cn-mdp','mauvais-mdp-1'); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(700);
 log('ERR1:',await S.erreur(c));
 const mdp=await S.provisoire(c,qui);
 await c.p.fill('#cn-mdp',mdp); await c.p.click('#cn-form button[type=submit]'); await c.p.waitForTimeout(900);
 log('ECRAN A?',await S.attendreSel(c,'#cn-form-activer',4000));
 // bouton sans téléphone activé
 await c.p.click('#cn-form-activer button[type=submit]'); await c.p.waitForTimeout(400); log('A sans tel:',await S.erreur(c));
 await R.cap(c,tag+'-A');
 log('ouvrirTel',await R.ouvrirTel(c)); await R.cap(c,tag+'-tel0'); log('TEL0:',(await R.tel(c)).slice(0,300));
 await c.p.click('#opsec [data-ops="commencer"]'); await c.p.waitForTimeout(300); log('TEL pin1:',(await R.tel(c)).slice(0,200)); await R.cap(c,tag+'-pin1');
 await R.pinR(c,'123456'); log('PIN simple:',(await R.tel(c)).slice(0,200));
 await R.pinR(c,pin); await R.pinR(c,'111222'); log('PIN diff:',(await R.tel(c)).slice(0,200));
 await R.pinR(c,pin); await R.pinR(c,pin); log('apres pin:',(await R.tel(c)).slice(0,300)); await R.cap(c,tag+'-activer');
 // scanner
 await c.p.click('#opsec [data-ops="scanner"]'); await c.p.waitForTimeout(1500); log('apres scan:',(await R.tel(c)).slice(0,500)); await R.cap(c,tag+'-active');
 await R.fermeTel(c);
 await c.p.click('#cn-form-activer button[type=submit]'); await c.p.waitForTimeout(600); log('B?',await S.attendreSel(c,'#cn-form-verifier',4000)); await R.cap(c,tag+'-B'); log('B:',(await R.txt(c)).slice(0,500));
 // mauvais code
 await c.p.fill('#cn-code6','000000'); await c.p.click('#cn-form-verifier button[type=submit]'); await c.p.waitForTimeout(500); log('B faux:',await S.erreur(c));
 // vrai code lu sur le téléphone
 await R.ouvrirTel(c); const code=await c.p.evaluate(()=>{const e=document.querySelector('#opsec [data-ops="code6"]');return e?e.textContent.replace(/\s/g,''):null}); log('code lu',code);
 if(!code){ await R.pinR(c,pin).catch(()=>{}); log('tel:',(await R.tel(c)).slice(0,300)); }
 const code2=await c.p.evaluate(()=>{const e=document.querySelector('#opsec [data-ops="code6"]');return e?e.textContent.replace(/\s/g,''):null}); 
 await R.fermeTel(c); await c.p.fill('#cn-code6',code2||'000000'); await c.p.click('#cn-form-verifier button[type=submit]'); await c.p.waitForTimeout(800);
 log('C?',await S.attendreSel(c,'#cn-form-premier',4000)); await R.cap(c,tag+'-C'); log('C:',(await R.txt(c)).slice(0,600));
 const essais=[['court','abc'],['courant','climservices17'],['repet','aaaaaaaaaaaaaaa'],['diff',['cheval agrafe batterie','cheval agrafe batterie X']],['prov',mdp]];
 for(const [n,v] of essais){ const a=Array.isArray(v)?v:[v,v]; await c.p.fill('#cn-n1',a[0]); await c.p.fill('#cn-n2',a[1]); await c.p.click('#cn-form-premier button[type=submit]'); await c.p.waitForTimeout(400); log('C',n,':',await S.erreur(c)); }
 const perso='cheval agrafe batterie correcte'; await c.p.fill('#cn-n1',perso); await c.p.fill('#cn-n2',perso); await c.p.click('#cn-form-premier button[type=submit]'); await c.p.waitForTimeout(1500);
 log('app ouverte?',await S.attendreApp(c,15000,true)); await c.p.waitForTimeout(1200); await R.cap(c,tag+'-app');
 log('rangement:',(await S.rangement(c)).replace(/\n/g,' | ').slice(0,600));
 log('ERRJS',c.err.slice(0,5));
 await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
