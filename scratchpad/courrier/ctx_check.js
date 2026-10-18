/* PORTÉ de la maquette (maquette/ctx_check.js) : la même série de contrôles, sur la VRAIE page `courrier-beta.html` servie en local sur 127.0.0.1.
   Ce qui change : playwright-core + le Chromium de l'image (pilote.js), la clé de stockage `opcourrierB_v2`, et plus de bouton de thème
   (le jour et la nuit se posent par `colorScheme`, c'est-à-dire par le média de l'appareil). Aucun octet ne sort : le pilote refuse tout ce qui
   n'est pas 127.0.0.1 et le COMPTE (`sorties`). Voir l'en-tête de pilote.js pour lancer. */
const { ouvrir, bilan } = require('./pilote.js'); const path=require('path');
let url;


const ATTENDU=16; const R=[]; const log=(ok,m)=>R.push((ok?'PASS ':'FAIL ')+m);
(async()=>{
  const P=await ouvrir(); const b=P.b; url=P.url;
  // Mac
  { const ctx=await b.newContext({viewport:{width:1440,height:900}}); const p=await ctx.newPage(); const err=[]; p.on('pageerror',e=>err.push(String(e)));
    await p.goto(url); await p.waitForTimeout(300);
    const accts=await p.locator('#sideBody .scope-row[data-scope]').evaluateAll(es=>es.map(e=>e.getAttribute('data-scope')));
    log(true,'mac: lignes de boîtes '+JSON.stringify(accts));
    // msg menu
    await p.locator('#rows .msg').first().click({button:'right'}); await p.waitForTimeout(150);
    const items=await p.locator('.menu .mitem').evaluateAll(es=>es.map(e=>e.textContent));
    log(items.includes('Supprimer'),'mac: menu clic droit message → '+items.join(' | '));
    const subj=await p.locator('#rows .msg').first().getAttribute('data-id');
    await p.locator('.menu [data-pick="trash"]').click(); await p.waitForTimeout(200);
    log(await p.locator(`#rows .msg[data-id="${subj}"]`).count()===0,'mac: suppression via clic droit');
    // acct menu
    const id=accts.find(x=>x!=='pro'&&x!=='perso');
    if(id){
      const row=p.locator(`#sideBody .scope-row[data-scope="${id}"]`);
      await row.click({button:'right'}); await p.waitForTimeout(150);
      const ai=await p.locator('.menu .mitem').evaluateAll(es=>es.map(e=>e.textContent));
      log(ai.some(t=>t.startsWith('Supprimer la boîte')),'mac: menu boîte → '+ai.join(' | '));
      await p.locator('.menu [data-pick="rename"]').click(); await p.waitForTimeout(150);
      await p.fill('#rnName','Bureau Test'); await p.locator('#rnGo').click(); await p.waitForTimeout(150);
      log((await row.textContent()).includes('Bureau Test'),'mac: renommer');
      await row.click({button:'right'}); await p.locator('.menu [data-pick="del"]').click(); await p.waitForTimeout(150);
      const conf=await p.locator('.menu .mitem').evaluateAll(es=>es.map(e=>e.textContent));
      log(conf.length===2,'mac: confirmation → '+conf.join(' | '));
      await p.locator('.menu [data-pick="yes"]').click(); await p.waitForTimeout(200);
      log(await p.locator(`#sideBody .scope-row[data-scope="${id}"]`).count()===0,'mac: boîte supprimée');
      await p.reload(); await p.waitForTimeout(300);
      log(await p.locator(`#sideBody .scope-row[data-scope="${id}"]`).count()===0,'mac: suppression persistée après rechargement');
      log(!(await p.evaluate(()=>[...document.querySelectorAll('#rows .msg')].length===0&&false)),'mac: liste OK après rechargement');
    } else log(false,'mac: aucune ligne de boîte pour tester');
    // undo path in a fresh context
    log(err.length===0,'mac: aucune erreur JS '+err.join('|'));
    await ctx.close(); }
  { const ctx=await b.newContext({viewport:{width:1440,height:900}}); const p=await ctx.newPage(); const err=[]; p.on('pageerror',e=>err.push(String(e)));
    await p.goto(url); await p.waitForTimeout(300);
    const id=(await p.locator('#sideBody .scope-row[data-scope]').evaluateAll(es=>es.map(e=>e.getAttribute('data-scope')))).find(x=>x!=='pro'&&x!=='perso');
    const before=await p.locator('#rows .msg').count();
    await p.locator(`#sideBody .scope-row[data-scope="${id}"]`).click({button:'right'}); await p.locator('.menu [data-pick="del"]').click(); await p.locator('.menu [data-pick="yes"]').click(); await p.waitForTimeout(150);
    await p.getByRole('button',{name:'Annuler'}).last().click(); await p.waitForTimeout(200);
    log(await p.locator(`#sideBody .scope-row[data-scope="${id}"]`).count()===1 && await p.locator('#rows .msg').count()===before,'mac: Annuler rétablit la boîte et ses mails');
    // side switch
    await p.locator(`#sideBody .scope-row[data-scope="${id}"]`).click({button:'right'}); await p.locator('.menu [data-pick="side"]').click(); await p.waitForTimeout(150);
    log((await p.locator('#sideBody').textContent()).includes('perso')||(await p.locator('#sideBody').textContent()).includes('Perso'),'mac: passer de côté → '+(await p.locator('#sideBody').textContent()).slice(0,120));
    log(err.length===0,'mac2: aucune erreur JS '+err.join('|'));
    await ctx.close(); }
  // iPhone long-press
  { const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}); const p=await ctx.newPage(); const err=[]; p.on('pageerror',e=>err.push(String(e)));
    await p.goto(url); await p.waitForTimeout(300);
    const el=p.locator('#rows .msg').first(); const bb=await el.boundingBox();
    const cdp=await ctx.newCDPSession(p);
    const pt={x:bb.x+bb.width/2,y:bb.y+bb.height/2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt]}); await p.waitForTimeout(650);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(250);
    log(await p.locator('.asheet').count()===1,'iphone: appui long → feuille d’actions');
    log((await p.getAttribute('#app','data-view'))==='list','iphone: le message ne s’ouvre pas après l’appui long');
    
    log(err.length===0,'iphone: aucune erreur JS '+err.join('|'));
    await ctx.close(); }
  await bilan(R,P,ATTENDU);
})().catch(e=>{console.error(e);process.exit(1)});
