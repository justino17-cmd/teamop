const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'windows', nuit=process.argv[3]==='nuit';
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`bal-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const mes=async(nom,zone)=>{ const d=await L.deborde(c); const dg=await L.doigts(c.p,zone||'body'); const bad=(d.bouge>0)||dg.petits.length||dg.champs.length||dg.ecrases.length; log(` [${nom}] ${bad?'✗':'✓'}`,bad?JSON.stringify({bouge:d.bouge,cou:d.coupable,petits:dg.petits,champs:dg.champs,ecr:dg.ecrases}):''); };
 await mes('connexion','#cnx');
 // activation A/B/C pour Julie (secrétariat)
 const mdp=await S.provisoire(c,'julie'); await S.connecter(c,'julie',mdp); await S.attendreSel(c,'#cn-form-activer',4000); await c.p.waitForTimeout(400); await R.cap(c,tag+'-A'); await mes('A','#cnx');
 await S.telephone(c,'julie'); await c.p.evaluate(()=>document.querySelector('#opsec [data-ops="commencer"]').click()); await S.pin(c,'135792'); await S.pin(c,'135792'); await R.cap(c,tag+'-tel-activer'); await mes('tel activer','#opsec');
 await c.p.evaluate(()=>document.querySelector('#opsec [data-ops="scanner"]').click()); await c.p.waitForTimeout(1300); await R.cap(c,tag+'-tel-ouvert'); await mes('tel ouvert','#opsec');
 await S.fermerTel(c); await c.p.click('#cn-form-activer button[type=submit]'); await S.attendreSel(c,'#cn-form-verifier',4000); await R.cap(c,tag+'-B'); await mes('B','#cnx');
 const code6=await c.p.evaluate(()=>secuTotp(SECU.comptes.julie.tel.cle,secuMaint())); await c.p.fill('#cn-code6',code6); await c.p.click('#cn-form-verifier button[type=submit]'); await S.attendreSel(c,'#cn-form-premier',4000);
 await c.p.fill('#cn-n1','abc'); await c.p.fill('#cn-n2','abc'); await c.p.click('#cn-form-premier button[type=submit]'); await c.p.waitForTimeout(400); await R.cap(c,tag+'-C-erreur'); await mes('C erreur','#cnx');
 // les autres admin screens via Marc
 await c.p.evaluate(()=>sessionFermer()); await c.p.waitForTimeout(1200);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 for(const [nom,r] of [['securite','securite'],['equipe','equipe']]){ await L.aller(c.p,r); await c.p.waitForTimeout(900); await R.cap(c,tag+'-'+nom); await mes(nom,'#contenu'); }
 await L.aller(c.p,'entreprise'); await c.p.waitForTimeout(700); await S.avancer(c,6); await c.p.click('[data-ent="carte|banque"]'); await c.p.waitForTimeout(600); await R.cap(c,tag+'-conf'); await mes('conf','#sec-conf');
 await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300);
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(600); await (await c.p.$('[data-eqx="fiche|lr"], [data-eq="fiche|lr"]')).click(); await c.p.waitForTimeout(700); await c.p.evaluate(()=>{const e=document.querySelector('.cn-acces'); e&&e.scrollIntoView({block:'center'})}); await R.cap(c,tag+'-fiche'); await mes('fiche','#calque');
 await c.p.click('[data-sec2="deverrouiller|lr"]'); await c.p.waitForTimeout(500); await R.cap(c,tag+'-dev'); await mes('dev','#calque');
 log('ERRJS',c.err.slice(0,3)); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,700));process.exit(1)});
