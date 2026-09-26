/* ══ LES RÈGLES :has() QUI COÛTENT — recherche gloutonne sur des gestes réels ═══════════════════════════════════
   Pour chaque configuration (un ensemble de règles neutralisées dans la page de mesure, CSSOM en mémoire), on joue
   des scénarios réels et on compte les éléments RESTYLÉS (trace, UpdateLayoutTree.elementCount). À chaque tour on
   retire la règle qui fait tomber le plus le total ; on s'arrête quand plus aucune ne fait gagner au-delà du bruit.
   Le compte ne dépend pas du ralenti : on mesure à ×1 pour aller vite.
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. Usage : node scratchpad/perf-has-glouton.js <base.json> [seuil=60] */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, SEUIL_] = process.argv.slice(2); const SEUIL = +(SEUIL_ || 60);
const SCENARIOS = {
  'tableau de bord': `rendreVueSure('dashboard')`,
  clients: `rendreVueSure('clients')`,
  box: `rendreVueSure('boxes')`,
  interventions: `rendreVueSure('interventions')`,
  factures: `rendreVueSure('factures')`,
  'fiche intervention': `detailIntervention(window.__intId)`,
  'écriture de style': `document.querySelectorAll('[data-sonde-ecr]').forEach((e,i)=>{ e.style.transform='translateX('+(window.__k=(window.__k||0)+1)%2+'px)'; })`,
  toast: `toast('Mesure '+(window.__k=(window.__k||0)+1))`,
  'boîte mail': `rendreVueSure('boiteMail')`,
};
(async () => {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  if (process.env.BUREAU) await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  else await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); window.confirm=()=>true; window.alert=()=>{};` });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(3000);
  const pop = await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){}
    window.__intId=(db.interventions.find(i=>i.statut!=='terminee')||{}).id;
    const c=[...document.querySelectorAll('.sidebar a, .nav-item, #tabbar .tab, .topbar button')].filter(e=>e.getClientRects().length).slice(0,3); c.forEach((e,i)=>e.setAttribute('data-sonde-ecr',i));
    const out=[]; [...document.styleSheets].forEach((sh,si)=>{ let rs; try{ rs=sh.cssRules; }catch(e){ return; }
      const tour=(liste,chemin)=>{ [...liste].forEach((r,ri)=>{ const k=chemin.concat(ri); if(r.cssRules&&!r.selectorText){ tour(r.cssRules,k); return; }
        if(r.selectorText&&r.selectorText.indexOf(':has(')>=0) out.push({c:[si].concat(k), s:r.selectorText}); }); };
      tour(rs,[]); });
    window.__regles=out;
    window.__regle=(c)=>{ let x=document.styleSheets[c[0]].cssRules; let r=null; for(let i=1;i<c.length;i++){ r=x[c[i]]; if(i<c.length-1) x=r.cssRules; } return r; };
    window.__poser=(ens)=>{ const on=new Set(ens); window.__regles.forEach((g,i)=>{ const r=window.__regle(g.c); if(!r) return; r.__s=r.__s||r.selectorText; r.selectorText=on.has(i)?'.__jamais__':r.__s; }); return 1; };
    return {intId:window.__intId, ecr:c.length, regles:out.length};`);
  console.log(`population : ${pop.regles} règles :has(), ${pop.ecr} éléments pour l'écriture de style, intervention ${pop.intId ? 'trouvée' : 'ABSENTE'}`);
  const evts = []; let fini; S.c.sur(m => { if (m.method === 'Tracing.dataCollected') evts.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') fini(); });
  const regles = await S.ev('return window.__regles.map(r=>r.s)');
  const mesurer = async (ens) => {
    await S.ev(`return __poser(${JSON.stringify(ens)});`);
    const res = {};
    for (const [nom, code] of Object.entries(SCENARIOS)) {
      let meilleur = Infinity;
      for (let essai = 0; essai < 2; essai++) {
        await S.ev(`${code}; void document.body.offsetHeight; return 1;`);   // à blanc
        evts.length = 0; const finiP = new Promise(r => { fini = r; });
        await S.c.envoyer('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline'] } });
        await S.ev(`for(let i=0;i<2;i++){ ${code}; void document.body.offsetHeight; } return 1;`);
        await S.c.envoyer('Tracing.end'); await finiP;
        const n = evts.filter(e => e.name === 'UpdateLayoutTree' && e.ph === 'X').reduce((s, e) => s + (((e.args || {}).elementCount) || 0), 0) / 2;
        meilleur = Math.min(meilleur, n);
      }
      res[nom] = Math.round(meilleur);
    }
    res.total = Object.values(res).reduce((a, b) => a + b, 0);
    return res;
  };
  const aff = (t, r) => console.log(`${t.padEnd(70).slice(0, 70)} total ${String(r.total).padStart(6)} · ` + Object.entries(r).filter(([k]) => k !== 'total').map(([k, v]) => `${k} ${v}`).join(' · '));
  const r0 = await mesurer([]); aff('TEL QUEL', r0);
  const rTout = await mesurer(regles.map((_, i) => i)); aff('SANS AUCUNE :has() (plancher)', rTout);
  let ens = [], cour = r0; const retenues = [];
  for (let tour = 1; tour <= 15; tour++) {
    let best = null;
    for (let i = 0; i < regles.length; i++) { if (ens.includes(i)) continue;
      const r = await mesurer(ens.concat(i)); if (!best || r.total < best.r.total) best = { i, r }; }
    const gain = cour.total - best.r.total;
    if (gain < SEUIL) { console.log(`tour ${tour} : meilleur gain ${gain} < ${SEUIL} — arrêt`); break; }
    ens.push(best.i); cour = best.r; retenues.push({ tour, regle: regles[best.i], gain, apres: best.r });
    aff(`tour ${tour} : −${gain} sans « ${regles[best.i].slice(0, 90)} »`, best.r);
  }
  fs.writeFileSync(path.join(path.dirname(BASE), process.env.BUREAU ? 'has-glouton-bureau.json' : 'has-glouton.json'), JSON.stringify({ r0, rTout, retenues }, null, 1));
  console.log('\nrègles retenues, dans l’ordre :'); retenues.forEach(x => console.log(`  ${x.tour}. (−${x.gain}) ${x.regle}`));
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
