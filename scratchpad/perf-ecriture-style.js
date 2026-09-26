/* ══ UNE ÉCRITURE DE STYLE EN LIGNE, ET CE QU'ELLE FAIT RESTYLER ═══════════════════════════════════════════════
   Hypothèse à prouver : `body.rf-onglets:has(#msg-flot[style*="flex"]) …` fait réévaluer :has() à CHAQUE
   écriture d'attribut style, n'importe où dans la page — donc chaque `el.style.x = …` (la bulle de la barre
   d'onglets le fait à chaque mouvement du doigt) coûterait un restylage de toute la page.
   On écrit un style en ligne sur trois éléments ordinaires et on compte les éléments restylés, avec et sans la règle.
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. Usage : node scratchpad/perf-ecriture-style.js <base.json> [ralenti=4] */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, RAL] = process.argv.slice(2); const RALENTI = +(RAL || 4);
(async () => {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir({ mobile: true, ...(process.env.SOURCE ? { source: process.env.SOURCE } : {}) });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); window.confirm=()=>true; window.alert=()=>{};` });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(3000);
  await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){} return 1;`);
  await S.c.envoyer('Emulation.setCPUThrottlingRate', { rate: RALENTI });
  const evts = []; let fini; S.c.sur(m => { if (m.method === 'Tracing.dataCollected') evts.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') fini(); });
  const cibles = await S.ev(`const c=[...document.querySelectorAll('#content .card, .sidebar a, .nav-item, #tabbar .tab')].filter(e=>e.offsetParent).slice(0,3);
    c.forEach((e,i)=>e.setAttribute('data-sonde-ecr',i)); return {n:c.length, body:document.body.className, page:document.getElementsByTagName('*').length};`);
  const mesurer = async (etiq) => {
    evts.length = 0; const finiP = new Promise(r => { fini = r; });
    await S.c.envoyer('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline'] } });
    const t = await S.ev(`const a=[]; for(let k=0;k<10;k++){ const t0=performance.now();
        document.querySelectorAll('[data-sonde-ecr]').forEach(e=>{ e.style.transform = 'translateX(' + (k%2) + 'px)'; });
        void document.body.offsetHeight; a.push(performance.now()-t0); } a.sort((x,y)=>x-y); return a[5];`);
    await S.c.envoyer('Tracing.end'); await finiP;
    const ul = evts.filter(e => e.name === 'UpdateLayoutTree' && e.ph === 'X');
    const el = Math.round(ul.reduce((s, e) => s + (((e.args || {}).elementCount) || 0), 0) / 10);
    console.log(`  ${etiq.padEnd(44)} ${String(Math.round(t * 10) / 10).padStart(6)} ms par écriture · ${el} éléments restylés`);
    return el;
  };
  console.log(`page de ${cibles.page} éléments, body « ${cibles.body} », ${cibles.n} éléments écrits (transform en ligne), ×${RALENTI}, format téléphone`);
  const avec = await mesurer('tel quel');
  await S.ev(`const tour=l=>{ for(const r of [...l]){ if(r.cssRules&&!r.selectorText){ tour(r.cssRules); continue; }
      if(r.selectorText&&r.selectorText.indexOf('#msg-flot[style')>=0){ r.__s=r.selectorText; r.selectorText='.__jamais__'; } } };
    for(const sh of document.styleSheets){ try{ tour(sh.cssRules); }catch(e){} } return 1;`);
  const sans = await mesurer('sans la règle #msg-flot[style*="flex"]');
  await S.ev(`const tour=l=>{ for(const r of [...l]){ if(r.cssRules&&!r.selectorText){ tour(r.cssRules); continue; }
      if(r.selectorText&&r.selectorText.indexOf(':has(')>=0){ r.selectorText='.__jamais__'; } } };
    for(const sh of document.styleSheets){ try{ tour(sh.cssRules); }catch(e){} } return 1;`);
  const aucun = await mesurer('sans aucune règle :has()');
  console.log(avec > 4 * Math.max(1, sans) ? '  ⇒ confirmé : une écriture de style en ligne fait restyler la page entière, à cause de cette règle' : '  ⇒ hypothèse NON confirmée');
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
