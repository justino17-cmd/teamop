/* ══ DEUX SÉLECTEURS, LES MÊMES ÉLÉMENTS ? — preuve d'équivalence sur le vrai DOM, rubrique par rubrique ════════
   Réécrire une règle `:has()` sans `:has()` ne se juge pas à la lecture : on dessine chaque rubrique du menu (et
   quelques fiches), et pour chaque paire (ancien, nouveau) on compare les ENSEMBLES d'éléments visés par
   querySelectorAll. Une seule différence, n'importe où, fait tomber la paire. La population est comptée : une paire
   qui ne vise rien nulle part ne prouve rien.
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. Usage : node scratchpad/sonde-selecteurs-equivalents.js <base.json> <paires.json>
   paires.json : [{ "nom": "...", "ancien": "sélecteur", "nouveau": "sélecteur" }, …] */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const [BASE, PAIRES] = process.argv.slice(2);
(async () => {
  const base = fs.readFileSync(BASE, 'utf8'), paires = JSON.parse(fs.readFileSync(PAIRES, 'utf8'));
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {});
  const larg = +(process.env.LARGEUR || 390);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', larg < 800 ? { width: larg, height: 844, deviceScaleFactor: 3, mobile: true } : { width: larg, height: 900, deviceScaleFactor: 1, mobile: false });
  await S.ev(`localStorage.setItem(STORE_KEY, ${JSON.stringify(base)}); localStorage.setItem('elanB_vierge_v1','1');
    localStorage.setItem('elanB_session','u0'); localStorage.setItem('elanB_onboarded_u0','1'); localStorage.setItem('elanB_sync_on','0');
    localStorage.setItem('elanB_lang','fr'); return 1;`);
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: `window.fetch=(u,o)=>Promise.resolve(new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}})); window.confirm=()=>true; window.alert=()=>{};` });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await S.c.envoyer('Page.reload', {});
  for (let i = 0; i < 150; i++) { await dormir(200); try { if (await S.ev('return !!(typeof currentUser!=="undefined"&&currentUser&&db&&db.interventions)')) break; } catch (e) {} }
  await dormir(2500);
  const ecrans = await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){}
    const v=[]; NAV.forEach(s=>s.items.forEach(it=>{ if(views[it.k]) v.push({t:'vue',k:it.k}); }));
    (typeof SOUS_CATS==='object'?Object.keys(SOUS_CATS):[]).forEach(k=>{ if(views[k]) v.push({t:'vue',k}); });
    ['boiteMail'].forEach(k=>{ if(views[k]&&!v.some(x=>x.k===k)) v.push({t:'vue',k}); });
    const i1=db.interventions.find(i=>i.statut!=='terminee'), i2=db.interventions.find(i=>i.statut==='terminee');
    if(i1) v.push({t:'int',k:i1.id}); if(i2) v.push({t:'int',k:i2.id});
    if(db.clients[0]&&typeof ficheClient==='function') v.push({t:'cli',k:db.clients[0].id});
    if(db.boxes[0]&&typeof openBox==='function') v.push({t:'box',k:db.boxes[0].id});
    return v;`);
  const res = paires.map(p => ({ ...p, ecrans: 0, vises: 0, ecarts: [] }));
  for (const e of ecrans) {
    const r = await S.ev(`try{ closeModal(true); }catch(_){}
      try{ ${JSON.stringify(e.t)}==='vue' ? (current=${JSON.stringify(e.k)}, rendreVueSure(${JSON.stringify(e.k)}))
        : ${JSON.stringify(e.t)}==='int' ? detailIntervention(${JSON.stringify(e.k)})
        : ${JSON.stringify(e.t)}==='cli' ? ficheClient(${JSON.stringify(e.k)}) : openBox(${JSON.stringify(e.k)}); }catch(err){ return {err:String(err)}; }
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const P=${JSON.stringify(paires)};
      return P.map(p=>{ let a,b; try{ a=new Set(document.querySelectorAll(p.ancien)); }catch(x){ return {err:'ancien : '+x.message}; }
        try{ b=new Set(document.querySelectorAll(p.nouveau)); }catch(x){ return {err:'nouveau : '+x.message}; }
        const seulA=[...a].filter(x=>!b.has(x)), seulB=[...b].filter(x=>!a.has(x));
        const d=x=>x.tagName.toLowerCase()+(x.className&&typeof x.className==='string'?'.'+x.className.trim().split(/\\s+/).join('.'):'')+' « '+(x.textContent||'').trim().slice(0,30)+' »';
        return {n:a.size, seulA:seulA.slice(0,3).map(d), nA:seulA.length, seulB:seulB.slice(0,3).map(d), nB:seulB.length}; });`);
    if (r && r.err) { console.log(`  ⚠ ${e.t} ${e.k} : ${r.err}`); continue; }
    r.forEach((x, i) => { if (x.err) { res[i].ecarts.push(e.k + ' : ' + x.err); return; }
      res[i].ecrans++; res[i].vises += x.n;
      if (x.nA || x.nB) res[i].ecarts.push(`${e.t} ${e.k} : ${x.nA} seulement ancien ${JSON.stringify(x.seulA)} · ${x.nB} seulement nouveau ${JSON.stringify(x.seulB)}`); });
  }
  let ko = 0;
  console.log(`${ecrans.length} écrans dessinés (largeur ${larg}), ${S.exceptions.length} exception(s)`);
  for (const p of res) {
    const bon = !p.ecarts.length && p.vises > 0; if (!bon) ko++;
    console.log(`${bon ? '  ✓' : '  ✗'} ${p.nom} — ${p.vises} éléments visés sur ${p.ecrans} écrans${p.vises ? '' : ' (⚠ population vide)'}`);
    p.ecarts.slice(0, 8).forEach(x => console.log('      ' + x));
  }
  S.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e.message); process.exit(2); });
