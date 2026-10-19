/* PORTÉ de la maquette (maquette/sign_check.js) : la même série de contrôles, sur le MODULE `opcourrier.js` monté dans la page d'essai (source de démonstration), servi en local sur 127.0.0.1.
   Ce qui change : playwright-core + le Chromium de l'image (pilote.js), la clé de stockage `opcourrierEssai_ui`, et plus de bouton de thème
   (le jour et la nuit se posent par `colorScheme`, c'est-à-dire par le média de l'appareil). Aucun octet ne sort : le pilote refuse tout ce qui
   n'est pas 127.0.0.1 et le COMPTE (`sorties`). Voir l'en-tête de pilote.js pour lancer. */
const { ouvrir, bilan } = require('./pilote.js'); const path=require('path');
let url;

 const ATTENDU=48; const R=[]; const log=(ok,m)=>R.push((ok?'PASS ':'FAIL ')+m);
async function nav(p,drawer){ if(drawer){ await p.locator('#btnNav').click(); await p.waitForTimeout(250);} }
async function run(b,label,vp,scheme){
  const ctx=await b.newContext({viewport:vp,colorScheme:scheme}); const p=await ctx.newPage(); const err=[]; p.on('pageerror',e=>err.push(String(e)));
  await p.goto(url); await p.waitForTimeout(300); const drawer=vp.width<1000;
  await nav(p,drawer); log(await p.locator('.folder[data-folder="sign"]').count()===1,label+': dossier Signatures visible côté Pro');
  await p.locator('.folder[data-folder="sign"]').click(); await p.waitForTimeout(300);
  await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
  log(await p.locator('#sgGo').count()===1,label+': feuille « Envoyer pour signature »');
  await p.locator('#sgGo').click(); await p.waitForTimeout(100);
  log((await p.textContent('#toast')).includes('PDF'),label+': refus sans PDF');
  await p.selectOption('#sgType','Contrat de maintenance');
  await p.fill('#sgN0','Claire Dubois'); await p.fill('#sgE0','claire.dubois@sarl-mercier.fr');
  await p.locator('#sgTpl').click(); await p.waitForTimeout(100);
  await p.locator('#sgGo').click(); await p.waitForTimeout(100);
  log((await p.textContent('#toast')).includes('Mobile'),label+': mobile exigé en signature avancée');
  await p.fill('#sgP0','06 12 34 56 78');
  await p.locator('#sgGo').click(); await p.waitForTimeout(400);
  log(await p.locator('.sign-card').count()===1,label+': demande créée et suivie');
  log((await p.textContent('#rows')).includes('En attente'),label+': statut dans la liste');
  await p.locator('[data-act="signSim"]').click(); await p.waitForTimeout(250);
  log((await p.textContent('.sign-card')).includes('À vous de signer'),label+': client a signé → contre-signature');
  await p.locator('[data-act="signMe"]').click(); await p.waitForTimeout(300);
  const box=await p.locator('#spPad').boundingBox();
  await p.mouse.move(box.x+20,box.y+100); await p.mouse.down(); for(let i=1;i<15;i++) await p.mouse.move(box.x+20+i*15,box.y+100+(i%2?-30:30)); await p.mouse.up();
  await p.fill('#spCode','123456'); await p.locator('#spGo').click(); await p.waitForTimeout(300);
  log((await p.textContent('.sign-card')).includes('Télécharger le PDF signé'),label+': document signé par tous');
  log(await p.locator('.attbar .att').count()===3,label+': PDF signé + dossier de preuve joints');
  const n=await p.evaluate(()=>{const r=JSON.parse(localStorage.getItem('opcourrierEssai_ui')); return r.user.filter(m=>/^Document signé/.test(m.subject)).map(m=>m.folder);});
  log(n.length===1&&n[0]==='inbox',label+': mail « Document signé » dans la réception '+JSON.stringify(n));
  // compose entry
  await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
  log(await p.locator('#sgGo').count()===1,label+': bouton composer = nouvelle demande dans Signatures'); await p.locator('#sgCancel').click();
  if(vp.width<700){ await p.goto(url); await p.waitForTimeout(300); }
  await nav(p,drawer); await p.locator('.folder[data-folder="inbox"]').click(); await p.waitForTimeout(250);
  await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
  await p.fill('#cTo','t.berger@berger-batiment.fr'); await p.fill('#cSub','Devis cuisine');
  await p.setInputFiles('#cFile',[{name:'Devis-cuisine.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(9000)}]);
  await p.locator('#cSignBtn').click(); await p.waitForTimeout(250);
  log(await p.inputValue('#sgE0')==='t.berger@berger-batiment.fr' && (await p.textContent('#sgDocs')).includes('Devis-cuisine.pdf') && await p.inputValue('#sgType')==='Devis',label+': « Faire signer » depuis le composer pré-remplit');
  await p.locator('#sgCancel').click(); await p.waitForTimeout(150);
  // reading entry
  const devis=p.locator('#rows .msg',{hasText:'Devis chantier'}); if(await devis.count()){ await devis.first().click(); await p.waitForTimeout(350);
    log(await p.locator('[data-act="signFrom"]').count()===1,label+': « Faire signer » sur un PDF reçu'); }
  // perso side hides folder
  if(vp.width<700){ await p.goto(url); await p.waitForTimeout(300); }
  if(vp.width>=700) await nav(p,drawer); await p.locator('.sptab.sp-perso').click(); await p.waitForTimeout(250);
  if(drawer && !(await p.locator('#app.nav-open').count())) await nav(p,drawer);
  log(await p.locator('.folder[data-folder="sign"]').count()===0,label+': pas de Signatures côté Perso');
  const hs=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1); log(!hs,label+': pas de défilement horizontal');
  log(err.length===0,label+': aucune erreur JS '+err.join('|')); await ctx.close();
}
(async()=>{ const P=await ouvrir(); const b=P.b; url=P.url;
  await run(b,'mac',{width:1440,height:900},'light'); await run(b,'ipad',{width:820,height:1180},'dark'); await run(b,'iphone',{width:390,height:844},'dark');
  await bilan(R,P,ATTENDU); })().catch(e=>{console.error(e);console.log(R.join('\n'));process.exit(1)});
