/* SONDE — la synchro d'OP GESTION SANS FIREBASE, mesurée dans la vraie page, deux appareils.
   ⛔ Bêta seulement (copie régénérée depuis app.html, préfixe elanB_), servie sur 127.0.0.1, et le
   VRAI serveur (server/index.js) lancé à part, isolé, avec un Firebase de banc sur 127.0.0.1.
   La page et l'API sont servies à la MÊME adresse (un mandataire relaie /api et /health), comme
   le sera la production le jour où le site est servi par le VPS — et sans toucher au CORS.
   Ce qu'on mesure :
     1. une entreprise dont le document vit chez Firebase le retrouve sur NOTRE serveur (copie) ;
     2. un changement fait sur A arrive sur B, et en combien de temps ;
     3. A coupé du réseau : rien ne part, rien ne se perd ; le réseau revenu, B reçoit ;
     4. aucune requête ne part vers Google (Firebase supprimé) — sur les DEUX appareils.
   Usage : node sonde-doc-serveur.js   (SOURCE=chemin d'un app.html, sinon celui du dépôt) */
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), net = require('net'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const RACINE = '/home/user/teamop', CHROME = '/opt/pw-browsers/chromium';
const SCR = '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0; const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log((bon ? '  ✓ ' : '  ✗ ') + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const procs = []; const fin = () => procs.forEach(p => { try { p.kill('SIGKILL'); } catch (e) {} });
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ SONDE FIGÉE'); process.exit(3); }, 240000).unref();

(async () => {
  /* ── la page : la bêta, régénérée depuis l'app.html voulu ── */
  const src = process.env.SOURCE || path.join(RACINE, 'app.html');
  const tmpApp = path.join(SCR, 'sonde-doc-app.html'), copie = path.join(SCR, 'sonde-doc-beta.html');
  fs.copyFileSync(src, tmpApp);
  execFileSync(process.execPath, [path.join(RACINE, 'beta-build.js'), copie], { cwd: path.dirname(tmpApp) === RACINE ? RACINE : RACINE, stdio: 'ignore',
    env: Object.assign({}, process.env) });
  let PAGE = fs.readFileSync(copie, 'utf8');
  if (src !== path.join(RACINE, 'app.html')) { /* beta-build lit ./app.html : on régénère à partir de la source voulue */
    const s0 = fs.readFileSync(src, 'utf8');
    fs.writeFileSync(path.join(SCR, 'app.html'), s0);
    execFileSync(process.execPath, [path.join(RACINE, 'beta-build.js'), copie], { cwd: SCR, stdio: 'ignore' });
    PAGE = fs.readFileSync(copie, 'utf8');
  }
  const AVANT = "const PUSH_API='https://api.teamop.fr'";
  if (PAGE.split(AVANT).length !== 2) { console.log('  ✗ PUSH_API introuvable dans la page'); process.exit(2); }
  PAGE = PAGE.replace(AVANT, "const PUSH_API=''");
  console.log('page :', (PAGE.match(/const APP_VERSION = '([^']+)'/) || [])[1]);

  /* ── un Firebase de banc : jeton d'administration + Firestore ── */
  const paire = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const G = { docs: {}, lectures: 0 };
  const google = http.createServer((q, r) => { let c = ''; q.on('data', d => { c += d; }); q.on('end', () => {
    if (q.method === 'POST' && q.url === '/token') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"access_token":"jeton-sonde","expires_in":3600}'); }
    const m = /documents\/([^/]+)\/([^/?]+)$/.exec(q.url);
    if (q.method === 'GET' && m) { G.lectures++; const d = G.docs[decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2])];
      if (!d) { r.writeHead(404, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND', message: 'Document "projects/elan-gestion/databases/(default)/documents/' + decodeURIComponent(m[1]) + '/' + decodeURIComponent(m[2]) + '" not found.' } })); }
      r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify(d)); }
    r.writeHead(404); r.end(); }); });
  await new Promise(res => google.listen(0, '127.0.0.1', res));
  const GURL = 'http://127.0.0.1:' + google.address().port;

  /* ── le vrai serveur ── */
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'sdoc-'));
  const K = 'CLE-SONDE-' + crypto.randomBytes(8).toString('hex');
  const T = 'ent-sonde' + crypto.randomBytes(3).toString('hex');
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({ sonde: { slug: 'sonde', nom: 'Sonde', email: 's@exemple.fr', t: T,
    code: Buffer.from(JSON.stringify({ t: T, k: K })).toString('base64'), ts: 1 } }));
  fs.writeFileSync(path.join(banc, 'data', 'versions.json'), JSON.stringify({ min: 700, enLigne: 'enLigne', maj: 1, par: 'sonde', minFirestore: 748 }));
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'sonde' }));
  fs.writeFileSync(path.join(banc, 'fb.json'), JSON.stringify({ client_email: 'sonde@exemple.iam', private_key: paire.privateKey }));
  const PAPI = await portLibre();
  let journal = '';
  const api = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PAPI),
      TEAMOP_FB_ADMIN: path.join(banc, 'fb.json'), TEAMOP_FB_OAUTH_URL: GURL + '/token', TEAMOP_FIRESTORE_URL: GURL }) });
  procs.push(api); api.stdout.on('data', d => { journal += d; }); api.stderr.on('data', d => { journal += d; });
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:' + PAPI + '/health')).ok) break; } catch (e) {} await dormir(100); }

  /* ── la page et l'API à la même adresse ── */
  const PP = await portLibre();
  const statique = http.createServer((q, r) => {
    const u = q.url.split('?')[0];
    if (u.startsWith('/api/') || u === '/health') {
      const p = http.request({ host: '127.0.0.1', port: PAPI, path: q.url, method: q.method, headers: q.headers }, pr => { r.writeHead(pr.statusCode, pr.headers); pr.pipe(r); });
      p.on('error', () => { try { r.writeHead(502); r.end(); } catch (e) {} }); q.pipe(p); return;
    }
    if (u === '/beta.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    if (u === '/sw.js') { r.writeHead(404); return r.end(); }
    const x = path.join(RACINE, u.replace(/^\/+/, '')); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200); r.end(d); });
  });
  await new Promise(res => statique.listen(PP, '127.0.0.1', res));
  const BASE = 'http://127.0.0.1:' + PP;

  /* ── le navigateur, trois contextes isolés (le « 695 » qui produit le document, A et B) ── */
  const PC = await portLibre();
  const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + PC,
    '--user-data-dir=' + path.join(banc, 'ch'), 'about:blank'], { stdio: 'ignore' }); procs.push(ch);
  let wsUrl = null; for (let i = 0; i < 150; i++) { await dormir(100); try { wsUrl = (await (await fetch('http://127.0.0.1:' + PC + '/json/version')).json()).webSocketDebuggerUrl; break; } catch (e) {} }
  const ws = new WebSocket(wsUrl); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let id = 0; const att = new Map(), ecout = [];
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && att.has(m.id)) { const a = att.get(m.id); att.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); } else ecout.forEach(f => f(m)); });
  const cdp = (method, params, sessionId) => new Promise((res, rej) => { const i = ++id; att.set(i, { res, rej }); ws.send(JSON.stringify(Object.assign({ id: i, method, params: params || {} }, sessionId ? { sessionId } : {}))); });
  const requetes = {};
  ecout.push(m => { if (m.method === 'Network.requestWillBeSent' && m.sessionId) (requetes[m.sessionId] = requetes[m.sessionId] || []).push(m.params.request.url); });
  const exceptions = {};
  ecout.push(m => { if (m.method === 'Runtime.exceptionThrown' && m.sessionId) { const d = m.params.exceptionDetails; (exceptions[m.sessionId] = exceptions[m.sessionId] || []).push(String((d.exception && d.exception.description) || d.text).split('\n')[0]); } });
  async function appareil() {
    const { browserContextId } = await cdp('Target.createBrowserContext');
    const { targetId } = await cdp('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
    await cdp('Runtime.enable', {}, sessionId); await cdp('Network.enable', {}, sessionId); await cdp('Page.enable', {}, sessionId);
    const ev = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text); return r.result.value; };
    const aller = async () => { await cdp('Page.navigate', { url: BASE + '/beta.html' }, sessionId);
      for (let i = 0; i < 200; i++) { await dormir(100); try { if (await ev('return typeof db!=="undefined"&&!!db&&typeof syncPush==="function"&&document.readyState==="complete";')) return true; } catch (e) {} } return false; };
    return { sessionId, ev, aller };
  }

  try {
    /* 0. le « téléphone 695 » : il chiffre une base avec la clé de l'entreprise, sans synchro */
    const P = await appareil(); await P.aller();
    await P.ev(`localStorage.setItem('elanB_sync_on','0'); localStorage.setItem('elanB_sync_team',${JSON.stringify(T)}); localStorage.setItem('elanB_sync_secret',${JSON.stringify(K)}); return 1;`);
    const docFb = await P.ev(`
      const base=migrate(seed());
      base.users=[{id:'u-sonde',prenom:'Sonde',nom:'Admin',login:'sonde',role:'admin',actif:true,_m:1727000000000,pref:{theme:'dark'},prefTs:{theme:1727000000000}},
                  {id:'u-deux',prenom:'Deux',nom:'Techni',login:'deux',role:'technicien',actif:true,_m:1727000000000}];
      base.usersSupprimes=[{id:'u-vieux',ts:1726000000000},{id:'u-vieux2',ts:1726000000001}];
      /* une base LOURDE comme celle d'ELAN : au-delà du budget du nuage, l'envoi coupe le journal */
      const hasard=n=>{ const a=new Uint8Array(n); crypto.getRandomValues(a); return btoa(String.fromCharCode.apply(null,a)); };
      base.journal=Array.from({length:500},(x,i)=>({id:'jl'+i,ts:1727000000000+i*1000,type:'sonde',txt:hasard(1800)}));
      base.clients=[{id:'cl-fire',nom:'Client venu de Firebase',ville:'Nulle-part',_m:1727000000100}];
      const e=await syncEncrypt(JSON.stringify(base));
      return {enc:e.enc,iv:e.iv,salt:e.salt,z:e.z?1:0};`);
    const f = {}; const o = Object.assign({}, docFb, { ts: 1727000000200, writer: 'dev-695', at: '2026-09-25T09:00:00.000Z', by: 'Technicien 695', ver: '695', verNum: 695 });
    for (const k of Object.keys(o)) f[k] = typeof o[k] === 'number' ? { integerValue: String(o[k]) } : { stringValue: o[k] };
    G.docs['elan_teams/' + T] = { fields: f, updateTime: '2026-09-25T09:00:00.000001Z' };
    v('le document « 695 » est chiffré par la vraie syncEncrypt', !!(docFb.enc && docFb.iv && docFb.salt), true);

    /* 1. deux appareils à jour rejoignent l'entreprise */
    const A = await appareil(), B = await appareil();
    for (const X of [A, B]) { await X.aller();
      await X.ev(`localStorage.setItem('elanB_sync_team',${JSON.stringify(T)}); localStorage.setItem('elanB_sync_secret',${JSON.stringify(K)}); localStorage.removeItem('elanB_sync_on'); return 1;`);
      await X.aller(); }
    const attendreQue = async (X, cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await X.ev('return !!(' + cond + ');')) return Date.now() - t0; } catch (e) {} await dormir(100); } return -1; };
    const tA = await attendreQue(A, `_syncGotInitial && (db.clients||[]).some(c=>c.id==='cl-fire')`, 30000);
    const tB = await attendreQue(B, `_syncGotInitial && (db.clients||[]).some(c=>c.id==='cl-fire')`, 30000);
    v('⛔ A reçoit la base de Firebase par NOTRE serveur (copie au premier accès)', tA >= 0, true);
    v('⛔ B aussi', tB >= 0, true);
    v('   Firebase n\'a été lu qu\'UNE fois pour les deux', G.lectures, 1);
    const fichiers = fs.readdirSync(path.join(banc, 'data', 'documents')).sort();
    v('   l\'original de Firebase est gardé à part sur le serveur', fichiers.includes(T + '.firebase.json'), true);

    /* 2. LA BOUCLE : A et B connectés, au repos — combien d'écritures ? */
    const ecrire = s => (requetes[s] || []).filter(u => u.indexOf('/api/doc/ecrire') >= 0).length;
    for (const X of [A, B]) await X.ev(`window.__sigs=[]; const o=baseSignature; baseSignature=function(d){ const s=o(d); try{ window.__sigs.push(s); }catch(e){} return s; };
      window.__toasts=0; const t0=toast; toast=function(){ window.__toasts++; return t0.apply(this,arguments); }; return 1;`);
    await A.ev(`currentUser=db.users.find(u=>u.id==='u-sonde'); try{ enterApp(currentUser); }catch(e){} return !!currentUser;`);
    await B.ev(`currentUser=db.users.find(u=>u.id==='u-deux')||db.users.find(u=>u.id==='u-sonde'); try{ enterApp(currentUser); }catch(e){} return !!currentUser;`);
    for (const X of [A, B]) await X.ev(`window.__saves=[]; const s0=save; save=function(){ try{ window.__saves.push((new Error().stack||'').split('\\n').slice(2,6).map(l=>l.trim().replace(/\\(.*\\)/,'').replace(/^at /,'')).join(' < ')); }catch(e){} return s0.apply(this,arguments); }; return 1;`);
    await dormir(4000);
    const a0 = ecrire(A.sessionId), b0 = ecrire(B.sessionId);
    await A.ev(`db.clients.push({id:'cl-a',nom:'Ajouté par A',ville:'Ici'}); save(); return 1;`);
    await dormir(30000);
    const a1 = ecrire(A.sessionId) - a0, b1 = ecrire(B.sessionId) - b0;
    console.log('      écritures en 30 s après UN seul changement : A=' + a1 + ' B=' + b1);
    console.log('      toasts : A=' + await A.ev('return window.__toasts') + ' B=' + await B.ev('return window.__toasts'));
    v('⛔ (base lourde) UN changement ne déclenche pas une boucle d\'écritures (≤ 3 en 30 s au total)', a1 + b1 <= 3, true);
    for (const [nom, X] of [['A', A], ['B', B]]) {
      const sv = await X.ev(`const c={}; (window.__saves||[]).forEach(x=>{ c[x]=(c[x]||0)+1; }); return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,8);`);
      console.log('      ' + nom + ' — save() appelés depuis :\n        ' + sv.map(x => x[1] + ' × ' + x[0]).join('\n        '));
    }
    /* quelle partie de la signature change entre avant et après fusion, à la réception */
    for (const [nom, X] of [['A', A], ['B', B]]) {
      const diffs = await X.ev(`const s=window.__sigs, out=[]; for(let i=0;i+1<s.length;i++){ const p=s[i].split(/[|§#]/), q=s[i+1].split(/[|§#]/); if(p.length!==q.length){ out.push('longueurs '+p.length+'/'+q.length); continue; } p.forEach((x,j)=>{ if(x!==q[j]) out.push((x.split(':')[0]||('#'+j))+' : '+x.slice(0,160)+'  ⇒  '+q[j].slice(0,160)); }); } return out.slice(0,12);`);
      console.log('      ' + nom + ' — parties de signature qui changent d\'un appel au suivant :\n        ' + diffs.join('\n        '));
    }
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})();
