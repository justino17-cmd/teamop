/* Photographier l'aperçu du site (apercu/site/) pour le montrer à Justin — et le REGARDER avant de le dire fini.
   127.0.0.1 seulement : le dépôt est servi ici, rien ne sort. Rend des PNG dans SORTIE (défaut : scratchpad/vues-site/).
   Chaque vue : une page, un profil (bureau 1440 / téléphone 390), un mode (jour / nuit), et un élément à cadrer.
   Usage : node scratchpad/vue-site.js            SEULES=elan-bureau-jour node scratchpad/vue-site.js */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SORTIE = process.env.SORTIE || path.join(__dirname, 'vues-site');
fs.mkdirSync(SORTIE, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

const P = { bureau: { w: 1440, h: 900, dpr: 1, tac: false }, bureau2: { w: 1440, h: 900, dpr: 2, tac: false }, telephone: { w: 390, h: 844, dpr: 2, tac: true } };
/* geste : du JavaScript joué dans la page avant la photo ; cadre : l'élément photographié (sinon la fenêtre) */
const VUES = [
  { nom: 'elan-bureau-jour', page: 'elan', p: 'bureau', mode: 'light', cadre: '#fonctions' },
  { nom: 'elan-bureau-nuit', page: 'elan', p: 'bureau', mode: 'dark', cadre: '#fonctions' },
  { nom: 'elan-telephone-jour', page: 'elan', p: 'telephone', mode: 'light', cadre: '.bento', hMax: 2600 },
  { nom: 'tarifs-bureau-jour', page: 'tarifs', p: 'bureau', mode: 'light', cadre: '#formules-gestion' },
  { nom: 'tarifs-bureau-jour-pro', page: 'tarifs', p: 'bureau', mode: 'light', cadre: '#formules-gestion', clic: '#formules-gestion .formule:nth-child(2) .d' },
  { nom: 'tarifs-bureau-nuit-msg', page: 'tarifs', p: 'bureau', mode: 'dark', cadre: '#formules-msg', geste: `document.getElementById('onglet-msg').click();`, clic: '#formules-msg .formule:nth-child(1) .d' },
  { nom: 'accueil-bureau-jour', page: 'index', p: 'bureau', mode: 'light' },
  { nom: 'accueil-bureau-bouton-nuit', page: 'index', p: 'bureau', mode: 'light', clic: '.mode' },
  { nom: 'case-stock-hd', page: 'elan', p: 'bureau2', mode: 'light', cadre: '.bento .tuile-f:nth-child(3)' },
  { nom: 'case-partout-hd', page: 'elan', p: 'bureau2', mode: 'light', cadre: '.bento .tuile-f:nth-child(10)' },
  { nom: 'case-stock-debug', page: 'elan', p: 'bureau2', mode: 'light', cadre: '.bento .tuile-f:nth-child(3)', geste: `const st=document.createElement('style'); st.textContent='.tuile-f .vue{outline:4px solid red!important;outline-offset:-4px} .tuile-f .ap-iphone{outline:4px solid blue!important}'; document.head.appendChild(st);` },
  { nom: 'accueil-telephone-nuit', page: 'index', p: 'telephone', mode: 'dark' },
];

(async () => {
  const seules = process.env.SEULES ? process.env.SEULES.split(',') : null;
  const pp = await libre(), pc = await libre();
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    const x = path.join(RACINE, u); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(x)] || 'text/html;charset=utf-8' }); r.end(d); });
  });
  await new Promise(r => srv.listen(pp, '127.0.0.1', r));
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'vue-site-')), 'about:blank'], { stdio: 'ignore', detached: true });
  const tuer = () => { try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} };
  process.on('exit', tuer);
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const A = new Map(), EXC = [];
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') EXC.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); });
  const cdp = (me, pa) => new Promise((res, rej) => { const i = ++id; A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  const ev = async e => { const r = await cdp('Runtime.evaluate', { expression: '(async()=>{' + e + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result.value; };
  const rapport = [];
  for (const V of VUES) {
    if (seules && !seules.includes(V.nom)) continue;
    const pr = P[V.p];
    await cdp('Emulation.setDeviceMetricsOverride', { width: pr.w, height: pr.h, deviceScaleFactor: pr.dpr, mobile: pr.tac });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: pr.tac, maxTouchPoints: pr.tac ? 5 : 1 });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: V.mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    EXC.length = 0;
    await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/apercu/site/' + V.page + '.html' }); await dormir(900);
    await ev(`try{ localStorage.removeItem('teamop_site_mode'); }catch(e){} document.documentElement.removeAttribute('data-theme'); return 1;`);
    await cdp('Page.reload', {}); await dormir(900);
    /* le ruban « Aperçu » n'est pas la page : masqué pour la photo */
    await ev(`const r=document.querySelector('.ruban-apercu'); if(r) r.style.display='none'; return 1;`);
    if (V.geste) { await ev(V.geste + ' return 1;'); await dormir(300); }
    if (V.clic) {
      const r = await ev(`const e=document.querySelector(${JSON.stringify(V.clic)}); if(!e) return null; e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2, y:b.top+b.height/2};`);
      if (!r) throw new Error(V.nom + ' : rien à toucher (' + V.clic + ')');
      if (pr.tac) { await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await dormir(60); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
      await dormir(700);
    }
    /* les images paresseuses : on descend jusqu'à chacune, on attend qu'elles soient là */
    const img = await ev(`const L=[...document.images]; for(const i of L){ i.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,40)); }
      await Promise.all(L.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,4000);}))); scrollTo(0,0);
      return {n:L.length, ok:L.filter(i=>i.complete&&i.naturalWidth>0).length, nuit:L.filter(i=>/-nuit/.test(i.currentSrc)).length, jour:L.filter(i=>/-jour/.test(i.currentSrc)).length};`);
    const etat = await ev(`return {theme:document.documentElement.getAttribute('data-theme'), fond:getComputedStyle(document.body).backgroundColor, mode:localStorage.getItem('teamop_site_mode'),
      phare:[...document.querySelectorAll('.formule.phare .n b')].map(b=>b.textContent), mesure:(()=>{ const t=document.querySelectorAll('.tuile-f')[2]; if(!t||!t.querySelector('.vue')) return null; const R=e=>{const b=e.getBoundingClientRect(); return [Math.round(b.top),Math.round(b.bottom)]}; const a=t.querySelector('.ap-iphone'); return {vue:R(t.querySelector('.vue')), app:R(a), corps:R(a.querySelector('.ap-iphone-corps')), ecran:R(a.querySelector('.ap-iphone-ecran')), img:R(a.querySelector('img'))}; })()};`);
    let clip = null;
    if (V.cadre) clip = await ev(`const e=document.querySelector(${JSON.stringify(V.cadre)}); e.scrollIntoView({block:'start'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect(); return {x:0, y:b.top+scrollY, width:innerWidth, height:Math.min(b.height, ${V.hMax || 4000}), scale:1};`);
    else clip = await ev(`scrollTo(0,0); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return {x:0,y:0,width:innerWidth,height:innerHeight,scale:1};`);
    await dormir(250);
    const cap = await cdp('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    const f = path.join(SORTIE, V.nom + '.png'); fs.writeFileSync(f, Buffer.from(cap.data, 'base64'));
    rapport.push({ vue: V.nom, images: img.ok + '/' + img.n, ecransNuit: img.nuit, ecransJour: img.jour, theme: etat.theme, fond: etat.fond, memoire: etat.mode, bleue: etat.phare.join(' / '), mesure: etat.mesure, erreurs: EXC.slice() });
    console.log(V.nom, JSON.stringify(rapport[rapport.length - 1]));
  }
  ws.close(); srv.close(); tuer();
})().catch(e => { console.error('✗', e.message); process.exit(2); });
