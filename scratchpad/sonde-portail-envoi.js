/* ══ SONDE — CE QUE LA PERSONNE VOIT QUAND ELLE DEMANDE UN E-MAIL (portail et page de connexion) ══
   `tests/test-831.js` joue les vraies fonctions contre le vrai serveur ; il ne voit pas le RENDU.
   Ici : la vraie page, dans un vrai Chromium, au format téléphone, un vrai clic sur le lien, puis
   on lit le message affiché (texte, couleur, visibilité) et on le photographie.

   ⛔ RIEN NE SORT VERS LA PRODUCTION. Sur 127.0.0.1, le portail parle à sa propre origine (servie
   ici, réponses imitées) ; la page de connexion vise `https://api.teamop.fr` EN DUR — toute requête
   `https://` est donc interceptée au niveau du navigateur (`Fetch.enable`) : la relance reçoit la
   réponse qu'on choisit, tout le reste est bloqué et COMPTÉ (`sortiesBloquees`).

   Usage : node scratchpad/sonde-portail-envoi.js            (les fichiers de la branche)
           SOURCE=main node scratchpad/sonde-portail-envoi.js (contre-épreuve : ceux de origin/main)
   Captures dans $CAPT (défaut : le scratchpad de session). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn, execFileSync } = require('child_process');
const RACINE = '/home/user/teamop', CHROME = '/opt/pw-browsers/chromium';
const SOURCE = process.env.SOURCE || '';
const CAPT = process.env.CAPT || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/portail-envoi' + (SOURCE ? '-' + SOURCE : '');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const lire = f => SOURCE ? execFileSync('git', ['-C', RACINE, 'show', 'origin/' + SOURCE + ':' + f]) : fs.readFileSync(path.join(RACINE, f));

/* La réponse que le « serveur » donne à la prochaine demande : 200, 400, 429, 502 ou 'coupe'. */
let MODE = 200, demandes = 0;
const sortiesBloquees = [];
function repondre(res, mode) {
  demandes++;
  if (mode === 'coupe') { res.socket.destroy(); return; }
  if (mode === 502) { res.writeHead(502, { 'Content-Type': 'text/html' }); res.end('<html>502 Bad Gateway</html>'); return; }
  const corps = mode === 200 ? { ok: true } : mode === 429 ? { error: 'trop_de_tentatives' } : { error: 'email_invalide' };
  res.writeHead(mode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(corps));
}
function serveur(port) {
  return http.createServer((q, r) => {
    const u = q.url.split('?')[0];
    if (u === '/api/compte/mdp/demander') return repondre(r, MODE);
    if (u === '/api/compte/moi') { r.writeHead(401, { 'Content-Type': 'application/json' }); r.end('{}'); return; }
    if (u.startsWith('/api/')) { r.writeHead(404, { 'Content-Type': 'application/json' }); r.end('{}'); return; }
    const f = u === '/' ? 'index.html' : u.slice(1);
    let d; try { d = lire(f); } catch (e) { r.writeHead(404); r.end(); return; }
    const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : f.endsWith('.json') ? 'application/json' : 'text/html;charset=utf-8';
    r.writeHead(200, { 'Content-Type': t }); r.end(d);
  }).listen(port, '127.0.0.1');
}

function cdp(ws) {
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { e(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } };
}

async function main() {
  fs.mkdirSync(CAPT, { recursive: true });
  const pp = await portLibre(), pc = await portLibre();
  const srv = serveur(pp);
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-mdp-'));
  const nav = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, '--user-data-dir=' + profil, 'about:blank'], { stdio: 'ignore' });
  let cible = null;
  for (let i = 0; i < 100 && !cible; i++) { await dormir(100); try { cible = (await (await fetch('http://127.0.0.1:' + pc + '/json/list')).json()).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  const C = cdp(ws);
  await C.e('Page.enable'); await C.e('Runtime.enable');
  await C.e('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await C.e('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  /* ⛔ Toute requête https:// passe ici : la relance reçoit la réponse du MODE, le reste est bloqué. */
  await C.e('Fetch.enable', { patterns: [{ urlPattern: 'https://*' }] });
  C.sur(async m => {
    if (m.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = m.params;
    if (/^https:\/\/api\.teamop\.fr\/api\/espaces\/relance/.test(request.url)) {
      /* ⛔ La page vit sur une AUTRE origine : le navigateur demande d'abord la permission (OPTIONS),
         et une réponse sans `Access-Control-Allow-Headers: Content-Type` fait échouer le POST AVANT
         qu'il parte — la sonde lisait alors « Connexion internet requise » sur les quatre cas, y
         compris le 200 : c'était l'imitation qui refusait, pas la page. On répond comme le vrai serveur. */
      if (request.method === 'OPTIONS') return C.e('Fetch.fulfillRequest', { requestId, responseCode: 204, responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: 'Content-Type' }], body: '' });
      demandes++;
      if (MODE === 'coupe') return C.e('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' });
      const corps = MODE === 200 ? '{"ok":true,"envoye":true}' : MODE === 429 ? '{"error":"Trop de demandes"}' : '<html>502</html>';
      return C.e('Fetch.fulfillRequest', { requestId, responseCode: MODE === 'coupe' ? 0 : +MODE, responseHeaders: [{ name: 'Content-Type', value: MODE === 502 ? 'text/html' : 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(corps).toString('base64') });
    }
    sortiesBloquees.push(request.url.slice(0, 80));
    return C.e('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  });
  const ev = async (x) => { const r = await C.e('Runtime.evaluate', { expression: '(async()=>{' + x + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value; };
  const aller = async (u) => { await C.e('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/' + u }); for (let i = 0; i < 80; i++) { await dormir(100); if (await ev('return document.readyState') === 'complete') break; } await dormir(700); };
  /* Un vrai toucher au centre de l'élément, pas un `.click()` en JavaScript. */
  const toucher = async (sel) => {
    const b = await ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const r=e.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2; const h=document.elementFromPoint(x,y); return {x,y,w:r.width,h:r.height,sur:!!h&&(h===e||e.contains(h))};`);
    if (!b || !b.w || !b.sur) return b;
    for (const type of ['touchStart', 'touchEnd']) await C.e('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: b.x, y: b.y }] });
    return b;
  };
  const photo = async (sel, nom) => {
    const r = await ev(`const e=document.querySelector(${JSON.stringify(sel)}); const r=e.getBoundingClientRect(); return {x:Math.max(0,r.left-12),y:r.top+scrollY-12,w:Math.min(390,r.width+24),h:r.height+24};`);
    const img = await C.e('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 }, captureBeyondViewport: true });
    fs.writeFileSync(path.join(CAPT, nom + '.png'), Buffer.from(img.data, 'base64'));
  };
  const out = [];
  const lireMsg = (sel) => ev(`const e=document.querySelector(${JSON.stringify(sel)}); const cs=getComputedStyle(e); const k=e.querySelector('.err,.ok,.muted')||e; const ck=getComputedStyle(k); const r=e.getBoundingClientRect(); return {texte:e.textContent.trim().replace(/\\s+/g,' '), visible:cs.display!=='none'&&cs.visibility!=='hidden'&&r.height>4, couleur:ck.color, classe:k.className||''};`);

  /* ── 1. LE PORTAIL : « Mot de passe oublié ? » ── */
  const CAS_P = [[200, 'zoe@exemple.fr'], [400, 'pas-une-adresse'], [429, 'zoe@exemple.fr'], [502, 'zoe@exemple.fr'], ['coupe', 'zoe@exemple.fr']];
  for (const [mode, mail] of CAS_P) {
    await aller('espace.html');
    const pret = await ev(`return !!document.getElementById('a-email') && getComputedStyle(document.getElementById('a-email')).display!=='none' && document.getElementById('a-email').getBoundingClientRect().height>0`);
    await ev(`const i=document.getElementById('a-email'); i.value=${JSON.stringify(mail)}; return 1;`);
    MODE = mode; const d0 = demandes;
    const t = await toucher('a[onclick^="motDePasseOublie"]');
    for (let i = 0; i < 30; i++) { await dormir(100); const m = await lireMsg('#auth-err'); if (!/Envoi en cours/.test(m.texte) && m.texte) break; }
    const m = await lireMsg('#auth-err');
    await photo('#auth-err', 'portail-' + mode);
    out.push({ page: 'portail', mode, formulaire: pret, touche: !!(t && t.sur), demande: demandes - d0, ...m });
  }

  /* ── 2. LA PAGE DE CONNEXION : « me renvoyer le lien par e-mail » ── */
  for (const mode of [200, 429, 502, 'coupe']) {
    await aller('connexion.html');
    await ev(`const i=document.getElementById('adr-nom'); i.value='bernard-hygiene'; return 1;`);
    await toucher('a[onclick^="adrOubliee"]'); await dormir(300);
    MODE = mode; const d0 = demandes;
    const t = await toucher('#adr-err a[onclick^="entRelance"]');
    for (let i = 0; i < 30; i++) { await dormir(100); const m = await lireMsg('#adr-err'); if (!/me renvoyer le lien/.test(m.texte)) break; }
    const m = await lireMsg('#adr-err');
    await photo('#adr-err', 'connexion-' + mode);
    out.push({ page: 'connexion', mode, touche: !!(t && t.sur), demande: demandes - d0, ...m });
  }

  ws.close(); try { nav.kill('SIGKILL'); } catch (e) {} srv.close();
  let fautes = 0;
  for (const o of out) {
    const parti = /vient de partir/.test(o.texte), rouge = /rgb\(248, 113, 113\)|rgb\(2[0-9]{2}, [0-9]{1,2}, [0-9]{1,2}\)/.test(o.couleur);
    const attendu = o.mode === 200 ? parti : !parti;
    const faute = !o.touche || !o.demande || !o.visible || !attendu;
    if (faute) fautes++;
    console.log((faute ? '✗' : '✓') + ' ' + o.page.padEnd(9) + ' ' + String(o.mode).padEnd(5) + ' | touché:' + (o.touche ? 'oui' : 'NON') + ' demande:' + o.demande + ' visible:' + (o.visible ? 'oui' : 'NON') + ' couleur:' + o.couleur + (rouge ? ' (rouge)' : '') + '\n    « ' + o.texte.slice(0, 190) + ' »');
  }
  console.log('\n══ ' + (SOURCE ? 'origin/' + SOURCE : 'branche') + ' · ' + out.length + ' cas · ' + fautes + ' faux · sorties bloquées vers l\'extérieur : ' + sortiesBloquees.length + (sortiesBloquees.length ? ' (' + [...new Set(sortiesBloquees.map(u => u.replace(/^https:\/\/([^/]+).*/, '$1')))].join(', ') + ')' : '') + ' · captures : ' + CAPT);
  if (out.length !== 9) { console.log('⛔ POPULATION INCOMPLÈTE'); process.exit(2); }
  process.exit(fautes ? 1 : 0);
}
main().catch(e => { console.error('SONDE MORTE : ' + (e && e.stack || e)); process.exit(2); });
