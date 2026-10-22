/* ══ SONDE — L'ESPACE CLIENT NE PREND PLUS UNE BOÎTE LUE POUR UN GEL (dossier du 22 octobre 2026, « 10639 ms ») ════════════════
   La vraie page `espace.html`, servie en 127.0.0.1, le chemin de SAFARI forcé (PerformanceObserver ne connaît plus « longtask » :
   la sentinelle mesure l'écart entre deux images, comme sur un Mac). Ce qu'on joue, dans cet ordre :
     1. une vraie boîte du navigateur (« ✅ Mot de passe modifié. ») laissée ouverte 10,6 s, puis fermée — rien ne doit partir ;
     2. un vrai gel de 3 s (une boucle qui tient le fil) — il DOIT partir, « Interface figée pendant ~3000 ms ».
   Les envois de la sentinelle sont relevés à la source (sendBeacon et la file du rangement : la file se vide dès l'envoi).
   SOURCE=fichier : la contre-épreuve (l'espace d'avant). ⛔ Rien ne part chez api.teamop.fr : sendBeacon est remplacé. */
const fs = require('fs'), path = require('path'), http = require('http'), { spawn } = require('child_process'), os = require('os'), net = require('net');
const SRC = process.env.SOURCE || path.join(__dirname, '..', 'espace.html');
const PAGE = fs.readFileSync(SRC, 'utf8');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const port = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
(async () => {
  const pp = await port(), pc = await port();
  const srv = http.createServer((q, r) => { if (q.url.split('?')[0] === '/espace.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); } r.writeHead(404); r.end(); }).listen(pp, '127.0.0.1');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esp-'));
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, '--user-data-dir=' + dir, 'about:blank'], { stdio: 'ignore', detached: true });
  let cible = null; for (let k = 0; k < 60 && !cible; k++) { await dormir(250); try { const l = await (await fetch('http://127.0.0.1:' + pc + '/json/list')).json(); cible = l.find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const att = {}, dialogues = [];
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && att[d.id]) { att[d.id](d); delete att[d.id]; } if (d.method === 'Page.javascriptDialogOpening') dialogues.push(d.params); };
  const cdp = (method, params) => new Promise(r => { const i = ++id; att[i] = r; ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  const ev = async (expr) => (await cdp('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true })).result.result.value;
  let ok = 0, ko = 0; const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });   // la fenêtre a le focus, comme celle qu'on regarde
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    try{ Object.defineProperty(PerformanceObserver,'supportedEntryTypes',{get:function(){ return []; }}); }catch(e){}
    window.__envois=[]; navigator.sendBeacon=function(u,b){ window.__envois.push(b); return true; };` });
  await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/espace.html' }); await dormir(3000);
  const lire = () => ev(`const t=[]; for(const b of window.__envois){ try{ t.push(...JSON.parse(await b.text()).reports.map(r=>r.message)); }catch(e){} }
    try{ t.push(...JSON.parse(localStorage.getItem('top_monitor_q')||'[]').map(r=>r.message)); }catch(e){} return t.filter(m=>/figée|bloquée/.test(m));`);
  const base = await ev(`return {raf:!!window.requestAnimationFrame, longtask:PerformanceObserver.supportedEntryTypes.indexOf('longtask')>=0, focus:document.hasFocus(), vis:document.visibilityState, sentinelle:!localStorage.getItem('top_monitor_off')};`);
  console.log('page mesurée :', path.basename(SRC), JSON.stringify(base));
  c('(population) le chemin de Safari est forcé (pas de longtask, requestAnimationFrame), la fenêtre a le focus et est visible', base.raf && !base.longtask && base.focus && base.vis === 'visible' && base.sentinelle, base);
  c('(population) au repos, rien n’est parti', (await lire()).length === 0, await lire());

  console.log('\n1. Une vraie boîte du navigateur, ouverte 10,6 s');
  await cdp('Runtime.evaluate', { expression: "setTimeout(()=>{ alert('✅ Mot de passe modifié.'); window.__fermee=Date.now(); },0)" });
  for (let k = 0; k < 20 && !dialogues.length; k++) await dormir(100);
  c('(population) la boîte est bien ouverte (« ' + (dialogues[0] && dialogues[0].message) + ' »)', dialogues.length === 1, dialogues);
  await dormir(10600);
  await cdp('Page.handleJavaScriptDialog', { accept: true }); await dormir(1500);
  const apresBoite = await lire();
  c('⛔ fermée après 10,6 s : aucun « Interface figée » n’est parti', apresBoite.length === 0, apresBoite);

  console.log('\n2. Un vrai gel de 3 s');
  await ev(`const t0=Date.now(); while(Date.now()-t0<3000){} return 1;`); await dormir(1500);
  const apresGel = await lire();
  c('⛔ un vrai gel part toujours : « ' + apresGel.join(' | ') + ' »', apresGel.length === 1 && /figée pendant (29|30|31)\d\d ms/.test(apresGel[0]), apresGel);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  try { process.kill(-ch.pid); } catch (e) {} srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
