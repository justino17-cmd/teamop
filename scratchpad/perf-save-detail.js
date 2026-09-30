/* ══ save() À LA LOUPE — chaque étape, et les deux moitiés de recEmpreinte ═════════════════════════════════════
   Complète perf-lenteur.js : médianes sur 15 tours, processeur ralenti, base « façon ELAN ».
   ⛔ Bêta locale, 127.0.0.1, base SYNTHÉTIQUE. Usage : node scratchpad/perf-save-detail.js <base.json> [ralenti=4] */
const path = require('path'), fs = require('fs');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
const BASE = process.argv[2], RALENTI = +(process.argv[3] || 4);
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
  await dormir(2500);
  await S.ev(`try{ window.horsLigneDebut=function(){}; _horsLigne=false; }catch(e){} const h=document.getElementById('hl-ecran'); if(h) h.remove(); try{ closeModal(true); }catch(e){} window.syncEnabled=()=>true; return 1;`);
  await S.c.envoyer('Emulation.setCPUThrottlingRate', { rate: RALENTI });
  const R = await S.ev(`
    const med = a => { const b = a.slice().sort((x, y) => x - y); return Math.round(b[Math.floor(b.length / 2)] * 10) / 10; };
    const T = f => { const t = performance.now(); f(); return performance.now() - t; };
    const N = 15, r = {};
    const recs = []; collsFusion(db).forEach(c => (db[c] || []).forEach(x => { if (x && x.id != null) recs.push(x); }));
    r.population = { enregistrements: recs.length, collections: collsFusion(db).length };
    const REPL = (k, v) => { if (k === '_m' || k === '_ms') return undefined;
      if (typeof v === 'string' && v.length > 71 && v.charCodeAt(70) === 58 && v.charCodeAt(0) === 112 && v.startsWith('piece:')) {
        for (let q = 6; q < 70; q++) { const c = v.charCodeAt(q); if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return v; }
        return v.slice(0, 70); }
      return v; };
    const a = { recEmpreinte: [], avecFiltre: [], hachage: [], sansFiltre: [], copieSansFiltre: [] };
    let chaines = [], repli = 0, egales = 0;
    for (let k = 0; k < N; k++) {
      a.recEmpreinte.push(T(() => { for (const x of recs) recEmpreinte(x); }));
      a.avecFiltre.push(T(() => { chaines = recs.map(x => JSON.stringify(x, REPL) || ''); }));
      a.hachage.push(T(() => { for (const t of chaines) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } } }));
      a.sansFiltre.push(T(() => { for (const x of recs) JSON.stringify(x); }));
      repli = 0; egales = 0;
      a.copieSansFiltre.push(T(() => { for (let j = 0; j < recs.length; j++) { const x = recs[j]; const { _m, _ms, ...o } = x; const t = JSON.stringify(o);
        if (t.indexOf('"_m') >= 0 || t.indexOf('piece:') >= 0) repli++; else if (t === chaines[j]) egales++; } }));
    }
    for (const k in a) r[k] = med(a[k]);
    r.repli = repli; r.egales = egales; r.octets = chaines.reduce((s, t) => s + t.length, 0);
    /* les étapes de save() */
    const touche = i => { const c = db.clients[i % db.clients.length]; c.notes = (c.notes || '') + ' .'; };
    const b = { save: [], numPlafond: [], estampiller: [], stringify: [], rangement: [], retabli: [], badges: [], cloche: [], notifs: [], syncPush: [], annuaire: [] };
    let j = '';
    for (let k = 0; k < N; k++) {
      touche(k); b.save.push(T(() => save()));
      b.numPlafond.push(T(() => numPlafondRelever()));
      touche(k + 40); b.estampiller.push(T(() => estampiller()));
      b.stringify.push(T(() => { j = JSON.stringify(db); }));
      b.rangement.push(T(() => localStorage.setItem(STORE_KEY, j)));
      b.retabli.push(T(() => { try { baseRangementRetabli(); } catch (e) {} }));
      b.badges.push(T(() => refreshBadges()));
      b.cloche.push(T(() => updateBell()));
      b.notifs.push(T(() => computeNotifs()));
      b.syncPush.push(T(() => { if (typeof syncPush === 'function') syncPush(); }));
      b.annuaire.push(T(() => { if (typeof annuaireVeille === 'function') annuaireVeille(); }));
    }
    for (const k in b) r['save.' + k] = med(b[k]);
    r.octetsBase = j.length;
    return r;`);
  console.log(`page ${S.version} · processeur ×${RALENTI}`);
  for (const [k, v] of Object.entries(R)) console.log('  ' + k.padEnd(22) + ' ' + (typeof v === 'object' ? JSON.stringify(v) : v));
  console.log('  exceptions : ' + S.exceptions.length + (S.exceptions.length ? ' — ' + S.exceptions.slice(0, 2).join(' / ') : ''));
  S.fermer(); process.exit(0);
})().catch(e => { console.error('MESURE MORTE :', e.message); process.exit(2); });
