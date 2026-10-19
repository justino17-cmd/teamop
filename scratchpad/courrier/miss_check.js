/* PORTÉ de la maquette (maquette/miss_check.js) : la même série de contrôles, sur le MODULE `opcourrier.js` monté dans la page d'essai (source de démonstration), servi en local sur 127.0.0.1.
   Ce qui change : playwright-core + le Chromium de l'image (pilote.js), la clé de stockage `opcourrierEssai_ui`, et plus de bouton de thème
   (le jour et la nuit se posent par `colorScheme`, c'est-à-dire par le média de l'appareil). Aucun octet ne sort : le pilote refuse tout ce qui
   n'est pas 127.0.0.1 et le COMPTE (`sorties`). Voir l'en-tête de pilote.js pour lancer. */
const { ouvrir, bilan } = require('./pilote.js'); const path=require('path');
let url;


const ATTENDU=50; const R=[]; const log=(ok,m)=>R.push((ok?'PASS ':'FAIL ')+m);
async function run(b,label,vp,scheme){
  const ctx=await b.newContext({viewport:vp,colorScheme:scheme}); const p=await ctx.newPage(); const err=[]; p.on('pageerror',e=>err.push(String(e)));
  await p.goto(url); await p.waitForTimeout(300);
  const phone=vp.width<700, drawer=vp.width<1000;
  log((await p.evaluate(()=>window.__compte))>0,label+': pastille de l’hôte — onCompter a reçu '+await p.evaluate(()=>window.__compte));
  // compose: signature + PJ + autosave
  await p.locator('#btnCompose').click(); await p.waitForTimeout(200);
  const body=await p.inputValue('#cBody'); log(body.includes('-- \nCamille Moreau'),label+': signature insérée');
  await p.setInputFiles('#cFile',[{name:'contrat.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(200000)},{name:'photo.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(50000)}]);
  log(await p.locator('#cAtt .att').count()===2,label+': 2 pièces jointes ajoutées');
  await p.setInputFiles('#cFile',[{name:'gros.zip',mimeType:'application/zip',buffer:Buffer.alloc(26*1024*1024)}]);
  log(await p.locator('#cAtt .att').count()===2,label+': fichier > 25 Mo refusé');
  await p.locator('#cAtt [data-rm="1"]').click(); log(await p.locator('#cAtt .att').count()===1,label+': retirer une pièce jointe');
  await p.fill('#cTo','client@exemple.fr'); await p.fill('#cSub','Contrat test'); await p.waitForTimeout(1800);
  log((await p.textContent('#cSaved')).includes('Brouillon enregistré'),label+': brouillon auto → '+await p.textContent('#cSaved'));
  const d=await p.evaluate(()=>{const r=JSON.parse(localStorage.getItem('opcourrierEssai_ui')); return r.user.filter(m=>m.folder==='drafts'&&m.subject==='Contrat test').map(m=>m.att.length);});
  log(d.length===1&&d[0]===1,label+': brouillon persisté avec sa PJ '+JSON.stringify(d));
  await p.locator('#cSend').click(); await p.waitForTimeout(5600);
  const sent=await p.evaluate(()=>{const r=JSON.parse(localStorage.getItem('opcourrierEssai_ui')); return r.user.filter(m=>m.subject==='Contrat test').map(m=>m.folder+':'+m.att.length);});
  log(sent.length===1&&sent[0]==='sent:1',label+': envoyé, un seul exemplaire, PJ gardée '+JSON.stringify(sent));
  // settings
  if(drawer){ await p.locator('#btnNav').click(); await p.waitForTimeout(250); }
  await p.locator('[data-settings]').click(); await p.waitForTimeout(200);
  log(await p.locator('#stNotif').count()===1&&await p.locator('[data-sig]').count()>=1,label+': écran Réglages');
  await p.fill('[data-sig="a1"]','Camille Moreau\nGérante — Atelier Moreau');
  await p.locator('#stTest').click(); await p.waitForTimeout(500);
  log((await p.textContent('#toast')).includes('Nouveau message'),label+': notification nouveau mail → '+(await p.textContent('#toast')).slice(0,70));
  await p.locator('#toast button').first().click(); await p.waitForTimeout(400);
  log(await p.locator('.thread').count()===1,label+': conversation affichée sous le message');
  if(!phone){ log(await p.locator('#rows .tcount').count()>=1,label+': compteur de conversation dans la liste'); }
  await p.locator('.th-item summary').first().click(); await p.waitForTimeout(100);
  log(await p.locator('.th-item[open]').count()===1,label+': déplier un message de la conversation');
  await p.reload(); await p.waitForTimeout(300);
  await p.locator('#btnCompose').click(); await p.waitForTimeout(150);
  log((await p.inputValue('#cBody')).includes('Gérante — Atelier Moreau'),label+': nouvelle signature gardée après rechargement');
  // Annuler on mac keeps draft
  await p.fill('#cSub','Brouillon annulé');
  await p.locator('#cCancel').click(); await p.waitForTimeout(200);
  if(phone){ log(await p.locator('#cDiscard').count()===1,label+': Annuler propose Supprimer/Enregistrer'); await p.locator('[data-dpick="discard"]').click(); }
  else log((await p.textContent('#toast')).includes('Brouillon'),label+': Annuler garde le brouillon → '+(await p.textContent('#toast')));
  const hs=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1); log(!hs,label+': pas de défilement horizontal');
  
  log(err.length===0,label+': aucune erreur JS '+err.join('|'));
  await ctx.close();
}
(async()=>{ const P=await ouvrir(); const b=P.b; url=P.url;
  await run(b,'mac',{width:1440,height:900},'light'); await run(b,'ipad',{width:820,height:1180},'dark'); await run(b,'iphone',{width:390,height:844},'dark');
  await bilan(R,P,ATTENDU); })().catch(e=>{console.error(e);process.exit(1)});
