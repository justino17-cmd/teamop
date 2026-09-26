/* ══ QUELS SÉLECTEURS CSS COÛTENT — les statistiques du moteur de styles, écran par écran ══════════════════════
   Trace avec la catégorie « blink.debug » : chaque recalcul de styles porte, par sélecteur, le temps passé, le
   nombre d'essais et de correspondances. On dessine un écran (rendreVueSure) et on additionne.
   Usage : node scratchpad/perf-selecteurs.js <base.json> <vue>[,<vue>…] [ralenti=4]
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, VUES, RAL] = process.argv.slice(2); const RALENTI = +(RAL || 4);
const ms = x => (x >= 100 ? Math.round(x) : Math.round(x * 10) / 10) + ' ms';
(async () => {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); window.confirm=()=>true; window.alert=()=>{};` });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(3000);
  await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){} return 1;`);
  await S.c.envoyer('Emulation.setCPUThrottlingRate', { rate: RALENTI });
  const evts = []; let fini; S.c.sur(m => { if (m.method === 'Tracing.dataCollected') evts.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') fini(); });
  for (const vue of VUES.split(',')) {
    await S.ev(`current=${JSON.stringify(vue)}; rendreVueSure(${JSON.stringify(vue)}); void document.body.offsetHeight; return 1;`);
    evts.length = 0; const finiP = new Promise(r => { fini = r; });
    await S.c.envoyer('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: process.env.SANS_STATS ? ['devtools.timeline'] : ['devtools.timeline', 'disabled-by-default-blink.debug'] } });
    await S.ev(`for(let i=0;i<3;i++){ current=${JSON.stringify(vue)}; rendreVueSure(${JSON.stringify(vue)}); void document.body.offsetHeight; } return 1;`);
    await S.c.envoyer('Tracing.end'); await finiP;
    const somme = n => evts.filter(e => e.name === n && e.ph === 'X').reduce((s, e) => s + e.dur, 0) / 3000;
    const stats = new Map(); let nStats = 0;
    for (const e of evts) { const ss = e.args && (e.args.selector_stats || (e.args.data && e.args.data.selector_stats)); if (!ss) continue; nStats++;
      for (const x of (ss.selector_timings || [])) { const k = x.selector; const o = stats.get(k) || { us: 0, essais: 0, ok: 0, rapides: 0 };
        o.us += x['elapsed (us)'] || 0; o.essais += x.match_attempts || 0; o.ok += x.match_count || 0; o.rapides += x.fast_reject_count || 0; stats.set(k, o); } }
    const noeuds = await S.ev(`return document.getElementById('content').getElementsByTagName('*').length;`);
    console.log(`\n══ ${vue} (${noeuds} nœuds) — par tour : styles ${ms(somme('UpdateLayoutTree'))} · mise en page ${ms(somme('Layout'))} · ${nStats} relevés de sélecteurs ══`);
    const tri = [...stats.entries()].sort((a, b) => b[1].us - a[1].us); const tout = tri.reduce((s, x) => s + x[1].us, 0);
    console.log(`  temps de sélecteurs relevé : ${ms(tout / 3000)} par tour, ${stats.size} sélecteurs essayés`);
    for (const [k, o] of tri.slice(0, +(process.env.TOP || 25))) console.log(`  ${ms(o.us / 3000).padStart(8)}  essais ${String(Math.round(o.essais / 3)).padStart(6)}  ok ${String(Math.round(o.ok / 3)).padStart(5)}  ${k.slice(0, 150)}`);
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
