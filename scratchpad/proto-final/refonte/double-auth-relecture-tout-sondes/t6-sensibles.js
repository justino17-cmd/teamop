// Gestes sensibles, au vrai clic, par le gérant : sans confirmation => rien ne se passe ; avec => ça reprend ; fenêtre de 5 minutes.
const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`sens-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 await D.tous(c); const rg=await D.entrer(c,'marc'); v('Marc connecté',rg.ok);
 log('fenêtre à la connexion ouverte ?', await c.p.evaluate(()=>secuFenetreValide('marc')));
 // 1. Mon entreprise : IBAN masqué ?
 await L.aller(c.p,'entreprise'); await c.p.waitForTimeout(800);
 const txtE=await R.txt(c,'#contenu'); log('IBAN visibles dans Mon entreprise:',(txtE.match(/FR[0-9•]{2}[ 0-9•]*/g)||[]).slice(0,5));
 v('IBAN en clair absent du contenu avant confirmation (FR76 …)', !/FR76\s?\d{4}/.test(txtE), (txtE.match(/FR76[ 0-9]*/g)||[]));
 await R.cap(c,tag+'-entreprise');
 // la fenêtre issue de la connexion vaut 5 minutes: on la fait expirer
 await S.avancer(c,6);
 v('après +6 min: fenêtre fermée', !(await c.p.evaluate(()=>secuFenetreValide('marc'))));
 // ouvrir la banque par clic réel
 const carte=await c.p.$('[data-ent="carte|banque"]'); v('carte banque trouvée',!!carte);
 const etat0=await c.p.evaluate(()=>({pan:!!document.querySelector('.panneau'),jr:typeof JOURNAL!=='undefined'?JOURNAL.length:-1}));
 await carte.click(); await c.p.waitForTimeout(500);
 const conf=await D.conf(c); v('fenêtre de confirmation avec la bonne phrase', conf&&/Pour voir ton IBAN et ta banque, OP GESTION vérifie que c’est bien toi\./.test(conf.texte), conf&&conf.texte);
 v('aucun panneau banque ouvert derrière', !(await c.p.evaluate(()=>/IBAN/.test((document.querySelector('.panneau')||{}).innerText||'')&&!!document.querySelector('.panneau'))), '');
 await R.cap(c,tag+'-conf');
 // focus piégé ?
 for(let i=0;i<12;i++) await c.p.keyboard.press('Tab');
 v('focus reste dans la fenêtre après 12 Tab', await c.p.evaluate(()=>!!document.activeElement.closest('#sec-conf')), await c.p.evaluate(()=>document.activeElement.outerHTML.slice(0,100)));
 // Échap
 await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300); v('Échap ferme la fenêtre', !(await D.conf(c)));
 v('et le geste n’a pas eu lieu', !(await c.p.evaluate(()=>/FR76/.test((document.querySelector('.panneau')||{}).innerText||''))));
 // mauvais nombre
 await carte.click(); await c.p.waitForTimeout(400);
 await D.confirmer(c,'marc',{ok:false}); await c.p.waitForTimeout(500);
 v('mauvais nombre: fenêtre fermée + toast exact', !(await D.conf(c)) && /Mauvais nombre : l’action est annulée par sécurité\./.test(await c.p.evaluate(()=>document.body.innerText)));
 v('fenêtre toujours fermée', !(await c.p.evaluate(()=>secuFenetreValide('marc'))));
 // bon nombre
 await c.p.evaluate(()=>{ const f=document.querySelector('[data-ent="carte|banque"]'); f&&f.scrollIntoView() }); await (await c.p.$('[data-ent="carte|banque"]')).click(); await c.p.waitForTimeout(400);
 await D.confirmer(c,'marc',{ok:true}); await c.p.waitForTimeout(900);
 const panel=await R.txt(c,'.panneau'); log('PANNEAU:',(panel||'').slice(0,400)); v('le geste reprend: panneau de la banque ouvert avec IBAN entier', /FR76/.test((await c.p.evaluate(()=>[...document.querySelectorAll('.panneau input')].map(i=>i.value).join('|')))), panel&&panel.slice(0,200));
 await R.cap(c,tag+'-banque-ouverte');
 // 5 minutes: +4 => encore valable, +2 => expirée (pas de prolongation même si on s'en sert)
 await S.avancer(c,4); v('+4 min: fenêtre valable', await c.p.evaluate(()=>secuFenetreValide('marc')));
 // un autre geste sensible pendant la fenêtre: achats virement
 await c.p.evaluate(()=>{ try{ closePanneau&&closePanneau() }catch(e){} }); 
 await L.aller(c.p,'achats'); await c.p.waitForTimeout(700);
 const vir=await c.p.$('[data-ac="virement"]'); log('bouton virement:',!!vir);
 if(vir){ await vir.click(); await c.p.waitForTimeout(500); v('pendant la fenêtre: pas de redemande (virement)', !(await D.conf(c))); await R.cap(c,tag+'-virement'); log('VIR:',(await R.txt(c,'.panneau')||'').slice(0,300)); }
 await S.avancer(c,2); await c.p.waitForTimeout(1500);
 v('+6 min au total: fenêtre expirée malgré l’usage', !(await c.p.evaluate(()=>secuFenetreValide('marc'))));
 log('toast IBAN re-masqué ?', await c.p.evaluate(()=>document.body.innerText.includes('Cinq minutes ont passé')));
 log('ERRJS',c.err.slice(0,5)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
