const D=require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`div-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 await D.tous(c); await R.entrer(c,'marc'); await R.fermeTel(c);
 // ── voir comme Sophie
 await L.aller(c.p,'equipe'); await c.p.waitForTimeout(600); await S.avancer(c,6);
 await (await c.p.$('[data-eqx="fiche|sm"], [data-eq="fiche|sm"]')).click(); await c.p.waitForTimeout(700);
 await c.p.click('[data-cnx="comme|sm"]'); await c.p.waitForTimeout(500);
 const conf=await D.conf(c); log('CONF:',conf&&conf.texte.slice(0,300)); v('fenêtre: « voir l’application comme Sophie »',conf&&/voir l’application comme Sophie/.test(conf.texte)); v('note « Elle n’est pas prévenue »?', conf&&/Rien ne lui est signalé|n’est pas prévenue/.test(conf.texte), conf&&conf.texte);
 await D.confirmer(c,'marc',{ok:true}); await c.p.waitForTimeout(1200); await c.p.evaluate(()=>{const b=document.querySelector('#nv [data-nv="fermer"]'); if(b) b.click();}); await c.p.waitForTimeout(500); await R.cap(c,tag+'-bande');
 const b=await R.txt(c,'.sec-bande'); log('BANDE:',b); v('bande « Tu vois l’application comme Sophie. »',/Tu vois l’application comme Sophie\./.test(b||''));
 // Sophie ne voit pas Sécurité
 const menu=await R.txt(c,'#menu'); v('menu de Sophie sans Sécurité ni Équipe',!/Sécurité/.test(menu),menu.slice(0,300));
 await c.p.evaluate(()=>{ location.hash='#securite'; }); await c.p.waitForTimeout(800); log('hash #securite en Sophie:',await c.p.evaluate(()=>location.hash),(await R.txt(c,'#contenu')).slice(0,120));
 v('#securite renvoie ailleurs pour Sophie',!/Qui s’est connecté de façon inhabituelle/.test(await R.txt(c,'#contenu')));
 const dg=await L.doigts(c.p,'.sec-bande'); log('bande cibles',dg.petits);
 const d=await L.deborde(c); log('débord',JSON.stringify(d));
 // Mon compte en voir-comme
 const mc=await c.p.$('[data-cnx="moncompte"]'); if(mc){ await mc.click(); await c.p.waitForTimeout(500); log('toast mon compte:',await c.p.evaluate(()=>document.body.innerText.includes('Pour ouvrir ton compte, reviens')));}
 // revenir
 await c.p.click('[data-sec2="revenir"]'); await c.p.waitForTimeout(1200); log('après revenir: session',await c.p.evaluate(()=>SESSION),'bande?',!!(await c.p.$('.sec-bande')));
 // ── déconnexion par le pied
 const so=await c.p.$('[data-cnx="sortir"]'); await so.click(); await c.p.waitForTimeout(1500); log('SORTIE:',(await R.txt(c,'#cnx')).slice(0,330));
 v('message « Tu es déconnecté. »',/Tu es déconnecté\./.test(await R.txt(c,'#cnx')));
 log('téléphone verrouillé après sortie ?',await c.p.evaluate(()=>Object.values(SECU.ui).every(u=>u.ecran!=='ouvert')));
 log('ERRJS',c.err.slice(0,3)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e.message.slice(0,800));process.exit(1)});
