/* ══ QUI FAIT RECALCULER TOUTE LA PAGE — éléments restylés à chaque dessin d'écran, et bissection des :has() ══════
   Un écran de 118 éléments qui coûte autant de styles qu'un écran de 700 : ce n'est pas l'écran qu'on restyle, c'est
   la page entière. On compte les éléments restylés (UpdateLayoutTree.elementCount), puis on retire des règles de la
   feuille (CSSOM, dans la page de mesure seulement) pour trouver celles qui provoquent ce recalcul global.
   Usage : node scratchpad/perf-invalidation.js <base.json> <vue> [ralenti=4]
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE — rien n'est écrit dans le fichier, la feuille est modifiée en mémoire. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, VUE, RAL] = process.argv.slice(2); const RALENTI = +(RAL || 4);
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
  const mesurer = async () => {
    await S.ev(`current=${JSON.stringify(VUE)}; rendreVueSure(${JSON.stringify(VUE)}); void document.body.offsetHeight; return 1;`);
    evts.length = 0; const finiP = new Promise(r => { fini = r; });
    await S.c.envoyer('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline'] } });
    await S.ev(`for(let i=0;i<3;i++){ current=${JSON.stringify(VUE)}; rendreVueSure(${JSON.stringify(VUE)}); void document.body.offsetHeight; } return 1;`);
    await S.c.envoyer('Tracing.end'); await finiP;
    const ul = evts.filter(e => e.name === 'UpdateLayoutTree' && e.ph === 'X');
    return { styles: ul.reduce((s, e) => s + e.dur, 0) / 3000, elements: Math.round(ul.reduce((s, e) => s + (((e.args || {}).elementCount) || 0), 0) / 3) };
  };
  const tous = await S.ev(`return {page: document.getElementsByTagName('*').length, contenu: document.getElementById('content').getElementsByTagName('*').length};`);
  const m0 = await mesurer();
  console.log(`${VUE} : ${tous.page} éléments dans la page, ${tous.contenu} dans #content`);
  console.log(`  tel quel : styles ${ms(m0.styles)} par dessin, ${m0.elements} éléments restylés`);
  /* bissection : les règles qui contiennent :has( — retirées toutes, puis par moitiés */
  const regles = await S.ev(`const out=[]; [...document.styleSheets].forEach((sh,si)=>{ let rs; try{ rs=sh.cssRules; }catch(e){ return; }
    const tour=(liste,chemin)=>{ [...liste].forEach((r,ri)=>{ const c=chemin.concat(ri); if(r.cssRules&&!r.selectorText){ tour(r.cssRules,c); return; }
      if(r.selectorText&&r.selectorText.indexOf(':has(')>=0) out.push({c:[si].concat(c), s:r.selectorText.slice(0,200)}); }); };
    tour(rs,[]); }); return out;`);
  console.log(`  ${regles.length} règles portent :has(`);
  /* on neutralise une règle en remplaçant son sélecteur par un sélecteur qui ne peut rien viser, et on remesure */
  await S.ev(`window.__regle=(c)=>{ let x=document.styleSheets[c[0]].cssRules; let r=null; for(let i=1;i<c.length;i++){ r=x[c[i]]; if(i<c.length-1) x=r.cssRules; } return r; };
    window.__neutre=(liste,on)=>{ for(const c of liste){ const r=window.__regle(c.c); if(!r) continue; if(on){ r.__s=r.__s||r.selectorText; r.selectorText='.__jamais__'; } else if(r.__s){ r.selectorText=r.__s; } } return 1; }; return 1;`);
  await S.ev(`return __neutre(${JSON.stringify(regles)}, true);`);
  const m1 = await mesurer();
  console.log(`  sans AUCUN :has() : styles ${ms(m1.styles)} par dessin, ${m1.elements} éléments restylés`);
  await S.ev(`return __neutre(${JSON.stringify(regles)}, false);`);
  if (m0.elements - m1.elements > tous.contenu) {
    /* chercher les coupables un par un parmi les candidates : retirer chacune seule et voir si le compte tombe */
    const coupables = [];
    for (const r of regles) {
      await S.ev(`return __neutre(${JSON.stringify([r])}, true);`);
      const m = await mesurer();
      await S.ev(`return __neutre(${JSON.stringify([r])}, false);`);
      if (m0.elements - m.elements > 200) { coupables.push({ ...r, gain: m0.elements - m.elements, styles: m.styles }); console.log(`  ⚠ ${String(m0.elements - m.elements).padStart(5)} éléments en moins (styles ${ms(m.styles)}) sans : ${r.s}`); }
    }
    fs.writeFileSync(path.join(path.dirname(BASE), `invalidation-${VUE}.json`), JSON.stringify({ m0, m1, tous, coupables }, null, 1));
  }
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
