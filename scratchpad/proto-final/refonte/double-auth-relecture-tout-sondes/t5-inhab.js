const R=require('./rt.js'); const {S,L}=R; const PIN='246802';
const profil=process.argv[2]||'mac', nuit=process.argv[3]==='nuit';
let ok=0,ko=0; const v=(n,c,d)=>{ if(c){ok++;console.log('  ✓',n)}else{ko++;console.log('  ✗',n,'→',d===undefined?'':(typeof d==='string'?d:JSON.stringify(d)))} };
(async()=>{
 const c=await S.ouvrir({profil,nuit}); const tag=`inh-${profil}-${nuit?'nuit':'jour'}`; const log=(...a)=>console.log(...a);
 const kb=await S.provisoire(c,'kb');
 // case "autre ordinateur" cochée par un vrai clic
 await c.p.click('[data-sec="cases-demo"] label:has-text("autre ordinateur"), [data-sec="cases-demo"] input >> nth=0').catch(async()=>{ await c.p.evaluate(()=>document.querySelector('[data-sec="cases-demo"] input').click()); });
 await S.connecter(c,'karim',kb); await S.attendreSel(c,'#cn-form-confirme',4000);
 await R.cap(c,tag+'-rouge'); log('ECRAN:',(await R.txt(c)).slice(0,900));
 v('boîte rouge présente', await R.vis(c,'[data-sec="alerte-rouge"]'));
 v('role=alert sur la boîte rouge', await c.p.evaluate(()=>{const e=document.querySelector('[data-sec="alerte-rouge"]');return !!e&&(e.getAttribute('role')==='alert'||!!e.querySelector('[role=alert]'))}));
 v('pas de details code6', !(await c.p.evaluate(()=>!!document.querySelector('#cn-form-confirme details'))));
 const n=await S.lireNombre(c);
 await R.ouvrirTel(c); await R.pinR(c,PIN); await c.p.waitForTimeout(300); await R.cap(c,tag+'-tel-rouge'); log('TELCARTE:',(await R.txt(c,'#opsec .ops-carte')));
 v('carte rouge du téléphone', await c.p.evaluate(()=>{const e=document.querySelector('#opsec .ops-carte');return !!e&&e.classList.contains('rouge')}));
 // code 6 chiffres tapé quand même: via l'écran il n'y a pas de champ; la fonction de la page ?
 const refus=await c.p.evaluate(()=>{ try{ const x=SECU.comptes.kb; const code=secuTotp(x.tel.cle,secuMaint()); const d=SECU.demandes.find(d=>d.k==='kb'&&d.etat==='attente'); return typeof secuVerifierCode==='function'?String(secuVerifierCode(d,code)):'pas de fonction'}catch(e){return 'EXC '+e.message}}); log('   code refusé (fonction):',refus);
 await c.p.fill('#opsec [data-ops="nombre-champ"]',n); await c.p.click('#opsec [data-ops="approuver"]'); await c.p.waitForTimeout(700);
 log('toast:',await c.p.evaluate(()=>{const t=document.querySelector('#toast, .toast');return t?t.innerText:null}));
 v('app ouverte', await S.attendreApp(c,10000,true)); await c.p.waitForTimeout(700); await R.cap(c,tag+'-app');
 log('toast2:',await c.p.evaluate(()=>[...document.querySelectorAll('[role=status], #toast, .toast')].map(t=>t.innerText).join('|')));
 // seconde connexion depuis le même appareil: n'est plus rouge
 await c.p.evaluate(()=>{ try{ sessionFermer(); }catch(e){} }); await c.p.waitForTimeout(1500);
 log('retour connexion?', await c.p.evaluate(()=>!!document.getElementById('cn-form')), (await R.txt(c)).slice(0,200));
 // 2e connexion : "autre ordinateur" encore coché ? (la case reste cochée)
 log('case cochée ?', await c.p.evaluate(()=>[...document.querySelectorAll('[data-sec="cases-demo"] input')].map(i=>i.checked)));
 log('ERRJS',c.err.slice(0,5)); log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer();
})().catch(e=>{console.log('EXC',e);process.exit(1)});
