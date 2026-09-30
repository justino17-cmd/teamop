/* ══ UN ÉCRAN, PROFILÉ — l'arbre des appels de rendreVueSure(vue), temps propre et total ═════════════════════════
   Usage : node scratchpad/perf-ecran.js <base.json> <vue>[,<vue>…] [ralenti=4] [seuil ms=3]
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE (chauffée par perf-chauffer.js). */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, VUES, RAL, SEUIL] = process.argv.slice(2);
const RALENTI = +(RAL || 4), SEUIL_MS = +(SEUIL || 3);
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
  for (const vue of VUES.split(',')) {
    /* un tour à blanc (compilation, caches), puis trois tours profilés */
    await S.ev(`current=${JSON.stringify(vue)}; rendreVueSure(${JSON.stringify(vue)}); void document.body.offsetHeight; return 1;`);
    await S.c.envoyer('Profiler.enable'); await S.c.envoyer('Profiler.setSamplingInterval', { interval: 100 });
    await S.c.envoyer('Profiler.start');
    const t = await S.ev(`const a=[]; for(let i=0;i<3;i++){ const t0=performance.now(); current=${JSON.stringify(vue)}; rendreVueSure(${JSON.stringify(vue)}); void document.body.offsetHeight; a.push(performance.now()-t0); } return a;`);
    const { profile } = await S.c.envoyer('Profiler.stop');
    const dt = {}; for (let i = 0; i < profile.samples.length; i++) dt[profile.samples[i]] = (dt[profile.samples[i]] || 0) + (profile.timeDeltas[i] || 0);
    const parId = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map();
    for (const n of profile.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
    const nom = n => { const f = n.callFrame; return (f.functionName || '(anonyme)') + (f.lineNumber >= 0 && f.url ? ':' + (f.lineNumber + 1) : ''); };
    const tot = new Map(); const totN = id => { if (tot.has(id)) return tot.get(id); const n = parId.get(id); let x = (dt[id] || 0) / 1000; for (const c of (n.children || [])) x += totN(c); tot.set(id, x); return x; };
    const racine = profile.nodes.find(n => !parent.has(n.id)); totN(racine.id);
    const lignes = []; const desc = (id, p) => { const n = parId.get(id), x = tot.get(id); if (x < SEUIL_MS * 3 || p > 18) return;
      if (!/^\((root|idle|program|garbage collector)\)$/.test(nom(n)) || p === 0) lignes.push('  '.repeat(p) + ms(x / 3).padStart(9) + '  ' + nom(n) + '  (propre ' + ms((dt[id] || 0) / 3000) + ')');
      for (const c of (n.children || []).slice().sort((a, b) => tot.get(b) - tot.get(a))) desc(c, p + 1); };
    desc(racine.id, 0);
    const noeuds = await S.ev(`return document.getElementById('content').getElementsByTagName('*').length;`);
    console.log(`\n══ ${vue} — ${t.map(ms).join(' · ')} (${noeuds} nœuds) — arbre par tour, nœuds ≥ ${SEUIL_MS} ms ══`);
    console.log(lignes.join('\n'));
  }
  console.log('\nexceptions : ' + S.exceptions.length + (S.exceptions.length ? ' — ' + S.exceptions.slice(0, 2).join(' / ') : ''));
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
