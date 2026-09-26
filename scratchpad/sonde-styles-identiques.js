/* ══ DEUX VERSIONS, LE MÊME ÉCRAN, À LA PROPRIÉTÉ PRÈS ══════════════════════════════════════════════════════════
   Une réécriture de CSS « sans rien changer à l'écran » se PROUVE : on ouvre l'ancienne bêta et la nouvelle sur la
   même base, on dessine chaque rubrique (et quelques fiches), et on compare le STYLE CALCULÉ de chaque élément de la
   page — toutes les propriétés, pas une liste choisie. Une seule différence, n'importe où, se nomme (élément,
   propriété, avant → après). Les animations sont figées à t=0 des deux côtés : sans ça, le halo du fond (boucle
   infinie) ferait crier la sonde à chaque passage.
   Usage : node scratchpad/sonde-styles-identiques.js <base.json> <ancienne.html> <nouvelle.html> [largeur=390] [jour|nuit]
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, ANC, NOUV, LARG, MODE] = process.argv.slice(2);
const larg = +(LARG || 390), mode = MODE || 'jour';
async function releve(source) {
  const base = fs.readFileSync(BASE, 'utf8');
  const S = await ouvrir({ source });
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', larg < 800 ? { width: larg, height: 844, deviceScaleFactor: 3, mobile: true } : { width: larg, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: mode === 'nuit' ? 'dark' : 'light' }] });
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  /* l'heure est FIGÉE (même instant dans les deux pages) : sinon « il y a 3 min », la ligne de l'heure du planning
     ou un compte à rebours différeraient pour une raison qui n'a rien à voir avec la feuille */
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{ const T0=Date.UTC(2026,8,24,8,30); const D=Date; let k=0;
    class F extends D{ constructor(...a){ if(a.length) super(...a); else super(T0 + (k++)); } static now(){ return T0 + (k++); } }
    window.Date=F; window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}}));
    window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||''; Math.random=(()=>{ let x=42; return ()=>((x=(x*16807)%2147483647)/2147483647); })(); })();` });
  /* une boîte de dialogue native qui passerait quand même (beforeunload…) bloquerait la page : on l'accepte */
  S.c.sur(m => { if (m.method === 'Page.javascriptDialogOpening') S.c.envoyer('Page.handleJavaScriptDialog', { accept: true }).catch(() => {}); });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(2500);
  const ecrans = await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){}
    const v=[]; NAV.forEach(s=>s.items.forEach(it=>{ if(views[it.k]) v.push({t:'vue',k:it.k}); }));
    (typeof SOUS_CATS==='object'?Object.keys(SOUS_CATS):[]).forEach(k=>{ if(views[k]&&!v.some(x=>x.k===k)) v.push({t:'vue',k}); });
    if(views.boiteMail&&!v.some(x=>x.k==='boiteMail')) v.push({t:'vue',k:'boiteMail'});
    const i1=db.interventions.find(i=>i.statut!=='terminee'), i2=db.interventions.find(i=>i.statut==='terminee');
    if(i1) v.push({t:'int',k:i1.id}); if(i2) v.push({t:'int',k:i2.id});
    if(db.clients[0]&&typeof ficheClient==='function') v.push({t:'cli',k:db.clients[0].id});
    if(db.boxes[0]&&typeof openBox==='function') v.push({t:'box',k:db.boxes[0].id});
    v.push({t:'toast',k:'toast'});
    return v;`);
  const out = {};
  const avecDelai = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ err: 'délai dépassé (' + ms + ' ms)' }), ms))]);
  let rang = 0;
  for (const e of ecrans) {
    process.stderr.write(`  [${path.basename(source)}] ${++rang}/${ecrans.length} ${e.t} ${e.k}\n`);
    out[e.t + ':' + e.k] = await avecDelai(S.ev(`try{ closeModal(true); }catch(_){}
      try{ const t=${JSON.stringify(e.t)}, k=${JSON.stringify(e.k)};
        if(t==='vue'){ current=k; rendreVueSure(k); } else if(t==='int') detailIntervention(k); else if(t==='cli') ficheClient(k); else if(t==='box') openBox(k); else toast('Message de contre-épreuve'); }catch(err){ return {err:String(err)}; }
      await new Promise(r=>setTimeout(r,${JSON.stringify(e.k)}==='boiteMail'?600:150));
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      document.getAnimations().forEach(a=>{ try{ a.pause(); a.currentTime=0; }catch(_){} });
      const chemin=el=>{ const p=[]; while(el&&el!==document.documentElement){ const par=el.parentElement; if(!par) break; p.push(el.tagName+[...par.children].indexOf(el)); el=par; } return p.reverse().join('/'); };
      const res={}; let n=0;
      const els=[document.documentElement,...document.documentElement.querySelectorAll('*')].filter(x=>!/^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|TEMPLATE|NOSCRIPT)$/.test(x.tagName));
      for(const el of els){ const cs=getComputedStyle(el); let s=''; for(let i=0;i<cs.length;i++){ const p=cs[i]; s+=p+':'+cs.getPropertyValue(p)+';'; }
        for(const ps of ['::before','::after']){ const c2=getComputedStyle(el,ps); if(c2.content&&c2.content!=='none'&&c2.content!=='normal'){ s+=ps+'{'; for(let i=0;i<c2.length;i++){ const p=c2[i]; s+=p+':'+c2.getPropertyValue(p)+';'; } s+='}'; } }
        res[chemin(el)]=s; n++; }
      return {n, res};`), 60000);
    if (out[e.t + ':' + e.k] && out[e.t + ':' + e.k].err && /délai/.test(out[e.t + ':' + e.k].err)) { process.stderr.write('  ⚠ écran bloqué, on arrête ce relevé\n'); break; }
  }
  const exceptions = S.exceptions.slice(); S.fermer();
  return { out, exceptions };
}
(async () => {
  const A = await releve(ANC), B = await releve(NOUV);
  let ecr = 0, els = 0, diffs = 0; const rapport = [];
  for (const k of Object.keys(A.out)) {
    const a = A.out[k], b = B.out[k];
    if (!a || !b || a.err || b.err) { rapport.push(`⚠ ${k} : ${(a && a.err) || (b && b.err) || 'absent d’un côté'}`); continue; }
    ecr++; els += a.n;
    const cles = new Set([...Object.keys(a.res), ...Object.keys(b.res)]);
    for (const c of cles) {
      if (a.res[c] === b.res[c]) continue;
      diffs++;
      if (rapport.length < 60) {
        if (!a.res[c] || !b.res[c]) { rapport.push(`✗ ${k} · ${c} : élément ${a.res[c] ? 'disparu' : 'apparu'}`); continue; }
        const pa = Object.fromEntries(a.res[c].split(';').filter(Boolean).map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
        const pb = Object.fromEntries(b.res[c].split(';').filter(Boolean).map(x => { const i = x.indexOf(':'); return [x.slice(0, i), x.slice(i + 1)]; }));
        const props = [...new Set([...Object.keys(pa), ...Object.keys(pb)])].filter(p => pa[p] !== pb[p]).slice(0, 6);
        rapport.push(`✗ ${k} · ${c.slice(-80)} : ` + props.map(p => `${p} « ${(pa[p] || '∅').slice(0, 40)} » → « ${(pb[p] || '∅').slice(0, 40)} »`).join(' ; '));
      }
    }
  }
  console.log(`largeur ${larg}, ${mode} : ${ecr} écrans comparés, ${els} éléments, ${diffs} différence(s) de style calculé ; exceptions ${A.exceptions.length} / ${B.exceptions.length}`);
  rapport.forEach(x => console.log('  ' + x));
  process.exit(diffs ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });
