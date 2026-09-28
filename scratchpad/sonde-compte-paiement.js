/* Sonde : « UN COMPTE AVANT DE PAYER », joué au doigt dans un vrai navigateur, de bout en bout.
   Justin, 27 septembre 2026, nuit : « ils peuvent pas payer s'ils ont pas de compte créé, pour que nous on ait un vrai
   suivi de qui fait quoi ». Le banc (tests/test-839.js) exécute le script de la page dans un faux document ; cette
   sonde regarde ce qu'un client VIT, dans Chromium (SwiftShader), contre le VRAI serveur :
   1. la page de paiement sans compte : « Créer mon compte pour payer » — lisible, 44 px, rien ne déborde ;
   2. on TOUCHE le bouton : le portail s'ouvre, dit « vous reviendrez automatiquement à votre paiement » ;
   3. on remplit le VRAI formulaire d'inscription et on le valide : retour AUTOMATIQUE sur la page de paiement, qui dit
      « Confirmez votre adresse » (et à quelle adresse) ; « Renvoyer le lien » le dit, le relais le reçoit ;
   4. on ouvre le VRAI lien reçu (reinit.html) : « Adresse e-mail vérifiée » ; retour sur la page de paiement :
      « Paiement rattaché à votre compte » ;
   5. on touche « Continuer vers le paiement » : le navigateur part vers la page Stripe rendue par le serveur (Stripe
      est simulé DANS le processus serveur : ce qu'il reçoit est lu, rien ne sort de la machine), au nom du compte ;
   6. le service tombe : « Le service TEAM OP ne répond pas » ; il revient : « Réessayer » rend la page prête ;
   7. « Changer de compte » : la session est rendue, le portail se rouvre sur le formulaire (pas de retour automatique).
   B. « on verrouille » (Justin, 28 septembre 2026) : l'appareil est relié (`elan_sync_team`) à l'entreprise d'un AUTRE
      compte — la page dit « Seul le compte de l'entreprise peut payer pour elle », rien ne part vers Stripe, la page
      reste prête ; relié à SON entreprise, le paiement s'ouvre et l'abonnement porte l'entreprise.
   Chaque écran est audité : aucune erreur JavaScript, chaque texte lisible sur son fond RÉEL (4,5 ; 3 en grand), au
   doigt aucune commande sous 44 px, rien ne dépasse de côté. Jour ET nuit, téléphone ET bureau.
   127.0.0.1 seulement, données fictives (camille…@exemple.fr).
   Usage : node scratchpad/sonde-compte-paiement.js
           RACINE_SERVIE=/chemin/copie-de-main  CHEMIN=/  → la page EN SERVICE d'une copie de main (pas de thème : le
           fond et les grandes surfaces ne sont pas jugés, seules NOS commandes le sont au doigt)
           SERVEUR=/chemin/server/index.js → un AUTRE serveur que celui de la racine servie (la page en service face au
           serveur de la branche : l'état d'après les deux publications)
           PROFILS=telephone  MODES=light  pour une passe courte ; PHOTOS=1 : une capture par écran */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const DEPOT = path.join(__dirname, '..');
const RACINE = process.env.RACINE_SERVIE ? path.resolve(process.env.RACINE_SERVIE) : DEPOT;
const CHEMIN = process.env.CHEMIN || '/apercu/';          // '/apercu/' : les copies au thème ; '/' : les pages de la racine
const THEME = CHEMIN === '/apercu/' || fs.readFileSync(path.join(RACINE, 'recap-abonnement.html'), 'utf8').includes('/vitrine/v2/theme.css');
const PROFILS = process.env.PROFILS ? process.env.PROFILS.split(',') : ['telephone', 'bureau'];
const MODES = process.env.MODES ? process.env.MODES.split(',') : ['light', 'dark'];
const PHOTOS = !!process.env.PHOTOS, SORTIE = path.join(__dirname, 'vues-compte');
if (PHOTOS) fs.mkdirSync(SORTIE, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0; const echecs = [];
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; if (!bon) echecs.push(t);
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a).slice(0, 700))); };
const vrai = (t, c) => v(t, !!c, true);
const P = { telephone: { w: 390, h: 844, dpr: 2, tac: true }, bureau: { w: 1440, h: 900, dpr: 1, tac: false } };

/* ── l'audit, joué DANS la page (le même que scratchpad/sonde-portail-theme.js) ── */
const AUDIT = `(async (largeur) => {
  const trame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await trame(); void document.body.offsetWidth;
  const ruban = document.getElementById('apercu-ruban'); if (ruban) ruban.style.display = 'none';
  const lire = c => { c = String(c || '').trim(); let m = /^rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)$/.exec(c);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = /^color\\(srgb\\s+([\\d.e-]+)\\s+([\\d.e-]+)\\s+([\\d.e-]+)(?:\\s*\\/\\s*([\\d.e-]+))?\\)$/.exec(c);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
    return null; };
  const sur = (c, f) => [0, 1, 2].map(i => c[i] * c[3] + f[i] * (1 - c[3])).concat(1);
  const lum = c => { const k = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]; };
  const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const nom = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
  const visible = e => { if (!e.getClientRects().length) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.1) return false; } return true; };
  const racineFond = (() => { const h = lire(getComputedStyle(document.documentElement).backgroundColor), b = lire(getComputedStyle(document.body).backgroundColor);
    if (h && h[3] > 0.5) return h; if (b && b[3] > 0.5) return b; return [255, 255, 255, 1]; })();
  const fondDe = e => { const ch = []; for (let x = e; x && x.nodeType === 1; x = x.parentElement) ch.unshift(x);
    let f = racineFond.slice(), degrade = false;
    for (const x of ch) { const s = getComputedStyle(x); const c = lire(s.backgroundColor);
      if (s.backgroundImage && s.backgroundImage !== 'none') degrade = true;
      else if (c && c[3] >= 0.95) degrade = false;   // une surface OPAQUE recouvre le dégradé d'un ancêtre : on repart d'elle
      if (c && c[3] > 0) f = sur(c, f); }
    return { f, degrade }; };
  const r = { textes: 0, faibles: [], degrades: 0, cibles: [], debord: null, grossier: matchMedia('(pointer:coarse)').matches };
  for (const e of document.querySelectorAll('#cartePaiement *, #auth-err, .compte-bloc, body > *')) {
    if (e.closest('#apercu-ruban') || /^(SCRIPT|STYLE|NOSCRIPT|svg|path)$/i.test(e.tagName)) continue;
    const direct = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!direct || !visible(e)) continue;
    const s = getComputedStyle(e), c = lire(s.color); if (!c) continue;
    const { f, degrade } = fondDe(e); if (degrade) { r.degrades++; continue; }
    let op = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) op *= +getComputedStyle(x).opacity;
    const k = ctr(sur([c[0], c[1], c[2], c[3] * op], f), f), taille = parseFloat(s.fontSize), gras = +s.fontWeight >= 700;
    r.textes++;
    if (e.disabled || e.closest('button:disabled')) continue;
    if (k < ((taille >= 24 || (taille >= 18.66 && gras)) ? 3 : 4.5)) r.faibles.push(nom(e) + ' « ' + e.textContent.trim().slice(0, 40) + ' » ' + k.toFixed(2));
  }
  if (r.grossier) for (const e of document.querySelectorAll('#btnPayer, .compte-geste')) {
    if (!visible(e)) continue; const b = e.getBoundingClientRect();
    if (b.height < 43.5) r.cibles.push(nom(e) + ' ' + Math.round(b.width) + '×' + Math.round(b.height));
  }
  const mesure = () => document.documentElement.scrollWidth - largeur;
  const d1 = mesure(); await new Promise(res => setTimeout(res, 700)); await trame(); void document.body.offsetWidth; const d2 = mesure();
  let bouge = 0; if (d1 > 1 && d2 > 1) { scrollTo(9999, scrollY); await trame(); bouge = scrollX; scrollTo(0, scrollY); }
  r.debord = bouge;
  if (ruban) ruban.style.display = '';
  return r;
})`;

(async () => {
  console.log('\n── sonde : un compte avant de payer · ' + (RACINE === DEPOT ? 'branche' : RACINE) + ' · pages ' + CHEMIN + (THEME ? ' (au thème)' : ' (en service, sans thème)') + ' ──');
  if (!fs.existsSync(path.join(DEPOT, 'server', 'node_modules'))) { console.log('server/node_modules absent : sonde impossible'); process.exit(2); }
  /* ── 1. le VRAI serveur (celui de la racine servie), son facteur, et Stripe simulé dans son processus ── */
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-compte-'));
  const data = path.join(BANC, 'data'); fs.mkdirSync(data, { recursive: true });
  const JOURNAL = path.join(BANC, 'stripe.jsonl');
  fs.writeFileSync(path.join(BANC, 'stripe-simule.js'), `const fs = require('fs'); const vrai = globalThis.fetch;
globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) { fs.appendFileSync(${JSON.stringify(JOURNAL)}, JSON.stringify({ url: u, corps: String((opts && opts.body) || '') }) + '\\n');
    return new Response(JSON.stringify(u.includes('/checkout/sessions') ? { url: 'https://checkout.stripe.com/c/pay/sonde' } : { data: [], has_more: false }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  return vrai.apply(this, arguments); };\n`);
  const courriers = [];
  const facteur = net.createServer(c => { c.write('220 sonde\r\n'); let t = '', corps = false, msg = '';
    c.on('data', d => { t += d; let i; while ((i = t.indexOf('\r\n')) >= 0) { let l = t.slice(0, i); t = t.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; courriers.push(msg); msg = ''; c.write('250 ok\r\n'); } else { if (l.startsWith('..')) l = l.slice(1); msg += l + '\n'; } continue; }
      const h = l.toUpperCase(); if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-sonde\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH')) c.write('235 ok\r\n'); else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  const portSmtp = await new Promise(r => facteur.listen(0, '127.0.0.1', () => r(facteur.address().port)));
  const vap = require(path.join(DEPOT, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
  const cfg = path.join(BANC, 'config.json');
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'sonde',
    adminPassHash: crypto.createHash('sha256').update('sonde-admin').digest('hex'), comptes: { actif: true }, stripe: { secretKey: 'sk_de_sonde' },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'sonde@teamop.fr' } }));
  /* « B — on verrouille » : l'annuaire des entreprises, posé AVANT le démarrage (le serveur ne le lit qu'une fois). Une
     entreprise par compte de la sonde, à l'adresse de ce compte — le patron qui a demandé son accès, puis ouvert son
     compte avec la même adresse : le cas réel —, et une VOISINE, à l'adresse de son propre patron. */
  const mailDe = (p, mode) => 'camille.' + p + '.' + mode + '@exemple.fr', tSienne = (p, mode) => 'sonde-' + p + '-' + mode + '-t';
  const annuaire = { 'voisine-sonde': { nom: 'La voisine', t: 'sonde-voisine-t', email: 'patron@voisine-exemple.fr', ts: 1, par: 'sonde', origine: 'sonde' } };
  for (const p of PROFILS) for (const mode of MODES) annuaire['sonde-' + p + '-' + mode] = { nom: 'Hygiène Exemple', t: tSienne(p, mode), email: mailDe(p, mode), ts: 1, par: 'sonde', origine: 'sonde' };
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify(annuaire));
  const portApi = await libre();
  const serveurServi = process.env.SERVEUR ? path.resolve(process.env.SERVEUR)
    : fs.existsSync(path.join(RACINE, 'server', 'index.js')) ? path.join(RACINE, 'server', 'index.js') : path.join(DEPOT, 'server', 'index.js');
  const SRC_SERVEUR = fs.readFileSync(serveurServi, 'utf8');
  const REGLE = /cm\.verifie\(payeur\)/.test(SRC_SERVEUR), REGLE_B = /compte_autre_entreprise/.test(SRC_SERVEUR);
  console.log('  serveur : ' + serveurServi.replace(os.tmpdir(), '…') + (REGLE ? ' (la route exige un compte' + (REGLE_B ? ', et celui de l\'entreprise' : '') + ')' : ' (route d\'avant : la page tient seule)'));
  const nm = path.join(path.dirname(serveurServi), 'node_modules');
  if (!fs.existsSync(nm)) try { fs.symlinkSync(path.join(DEPOT, 'server', 'node_modules'), nm); } catch (e) {}
  const srv = spawn(process.execPath, ['--require', path.join(BANC, 'stripe-simule.js'), serveurServi], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: data, PORT: String(portApi) }), stdio: 'ignore' });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch('http://127.0.0.1:' + portApi + '/health')).ok; } catch (e) {} }
  vrai('le vrai serveur répond', vivant);

  /* ── 2. la racine servie, /api relayé (même origine, comme sur teamop.fr) — et une PANNE qu'on peut déclencher ── */
  let panne = false;
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json' };
  const pp = await libre();
  const web = http.createServer((q, r) => {
    if (q.url.startsWith('/api/') || q.url === '/health') {
      if (panne) { r.writeHead(502, { 'Content-Type': 'text/html' }); return r.end('<html><body>502 Bad Gateway</body></html>'); }
      const p = http.request({ host: '127.0.0.1', port: portApi, path: q.url, method: q.method, headers: Object.assign({}, q.headers, { host: '127.0.0.1:' + portApi }) },
        x => { r.writeHead(x.statusCode, x.headers); x.pipe(r); });
      p.on('error', () => { r.writeHead(502); r.end(); }); q.pipe(p); return;
    }
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); const x = path.join(RACINE, u);
    if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(x)] || 'text/html;charset=utf-8' }); r.end(d); });
  });
  await new Promise(r => web.listen(pp, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + pp;

  /* ── 3. le navigateur ── */
  const pc = await libre();
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-compte-nav-')), 'about:blank'], { stdio: 'ignore', detached: true });
  const tuer = () => { try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} try { srv.kill('SIGKILL'); } catch (e) {} };
  process.on('exit', tuer);
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const A = new Map(), EXC = [], BLOQUES = [];
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') EXC.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text); });
  const cdp = (me, pa) => new Promise((res, rej) => { const i = ++id; A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  /* ⛔ AUCUN service worker ne s'installe : ici l'API est relayée sur la MÊME origine, et sw.js sert « le reste » (tout ce
     qui n'est pas une page) copie d'abord — il gardait donc la PREMIÈRE réponse de « qui suis-je » : « à confirmer » pour
     toujours (mesuré sur la page en service, 27 septembre 2026). En service, api.teamop.fr est une AUTRE origine, que
     sw.js laisse passer (« le reste du web ne nous regarde pas ») : ce n'est pas un défaut de la page, c'est la sonde. */
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "try{ Object.defineProperty(navigator, 'serviceWorker', { get: () => ({ register: () => Promise.reject(new Error('sonde : pas de service worker')), getRegistrations: () => Promise.resolve([]), addEventListener(){}, controller: null }) }); }catch(e){}" });
  /* ⛔ rien ne sort : toute adresse qui n'est pas 127.0.0.1 est coupée net — et NOTÉE (c'est ainsi qu'on voit partir vers Stripe) */
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method !== 'Fetch.requestPaused') return;
    const u = m.params.request.url;
    /* ⛔ pas de service worker ici : l'API est relayée sur la MÊME origine, il mettrait « qui suis-je » en cache et la page
       croirait un vieil état. En service, api.teamop.fr est une AUTRE origine, que sw.js laisse passer. */
    if (/\/sw\.js(\?|$)/.test(u)) { cdp('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); return; }
    if (/^https?:\/\/127\.0\.0\.1[:/]/.test(u) || u.startsWith('data:')) cdp('Fetch.continueRequest', { requestId: m.params.requestId }).catch(() => {});
    else { BLOQUES.push(u); cdp('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); } });
  const ev = async (e) => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result.value; };
  const profil = async (p, mode) => { const pr = P[p];
    await cdp('Emulation.setDeviceMetricsOverride', { width: pr.w, height: pr.h, deviceScaleFactor: pr.dpr, mobile: pr.tac });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: pr.tac, maxTouchPoints: pr.tac ? 5 : 1 });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] }); };
  const url = () => ev('location.href');
  const aller = async (chemin, attente) => { await cdp('Page.navigate', { url: B + chemin }); await dormir(attente || 1200); };
  /* toucher (téléphone) ou cliquer (bureau) au CENTRE de l'élément, amené au milieu de l'écran — et vérifier que c'est
     bien LUI qui est sous le doigt (une frappe qui tombe à côté ne compte pas : CLAUDE.md) */
  const toucher = async (p, sel) => {
    const b = await ev(`(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect();
      const x=r.left+r.width/2, y=r.top+r.height/2, t=document.elementFromPoint(x,y); return { x, y, w:r.width, h:r.height, dessus: !!t && (t===e || e.contains(t)) }; })()`);
    if (!b || !b.dessus || !b.w) return false;
    await dormir(150);
    if (P[p].tac) { await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await dormir(60); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 }); await dormir(40); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 }); }
    return true;
  };
  const taper = async (sel, texte) => ev(`(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); e.focus(); e.value=${JSON.stringify(texte)}; e.dispatchEvent(new Event('input',{bubbles:true})); return 1; })()`);
  const texteCarte = () => ev(`(document.getElementById('cartePaiement')||document.body).innerText.replace(/\\s+/g,' ')`);
  /* une lecture qui tombe pendant une navigation (« Inspected target navigated or closed ») compte pour « pas encore » :
     c'est justement le moment qu'on attend — la page part vers une autre */
  const attendre = async (fn, max = 60) => { for (let i = 0; i < max; i++) { let bon = false; try { bon = await fn(); } catch (e) {} if (bon) return true; await dormir(100); } return false; };
  /* ⛔ LA PAGE EN SERVICE PEINT SON FOND EN DÉGRADÉ, sous des cartes translucides : composer les fonds des ancêtres y
     devinerait. Le bloc du compte s'y mesure donc AU PIXEL (CLAUDE.md : « sous le verre, un contraste se lit au pixel ») :
     on capture le bloc, on lit son fond dans la bande de rembourrage du haut (médiane de 9 points), et on compare l'encre
     de chaque texte du bloc à CE fond-là. */
  const PNG = require(path.join(DEPOT, 'scratchpad', 'png.js'));
  const pixels = async () => {
    const blocs = await ev(`[...document.querySelectorAll('.compte-bloc')].filter(b => b.getClientRects().length).map(b => { b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect();
      const encres = [...b.querySelectorAll('*')].concat([b]).filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length && !e.closest('button'))
        .map(e => ({ t: e.textContent.trim().slice(0, 40), c: getComputedStyle(e).color, g: +getComputedStyle(e).fontWeight >= 700, f: parseFloat(getComputedStyle(e).fontSize) }));
      return { x: r.left, y: r.top, w: r.width, h: r.height, encres }; })`);
    const faibles = []; let n = 0;
    for (const b of blocs) {
      const cap = await cdp('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 } });
      const img = PNG.decoder(Buffer.from(cap.data, 'base64')), k = img.w / b.w;
      const pts = []; for (const fx of [0.2, 0.35, 0.5, 0.65, 0.8]) for (const fy of [3, 5]) pts.push(PNG.px(img, b.w * fx * k, fy * k));
      const med = [0, 1, 2].map(i => pts.map(q => q[i]).sort((a, c) => a - c)[Math.floor(pts.length / 2)]);
      for (const e of b.encres) { const c = PNG.lireCouleur(e.c); if (!c) continue; n++;
        const ct = PNG.contraste(c, med), seuil = (e.f >= 24 || (e.f >= 18.66 && e.g)) ? 3 : 4.5;
        if (ct < seuil) faibles.push('« ' + e.t + ' » ' + ct + ' < ' + seuil + ' sur rgb(' + med.join(',') + ')'); }
    }
    return { faibles, n, blocs: blocs.length };
  };
  const juger = async (etiquette, p) => {
    const r = await ev(AUDIT + `(${P[p].w})`);
    v(etiquette + ' : aucune erreur JavaScript', EXC.splice(0), []);
    if (THEME) {
      vrai(etiquette + ' : des textes mesurés (' + r.textes + ')', r.textes >= 5);
      v(etiquette + ' : chaque texte se lit sur son fond réel', r.faibles, []);
    } else {
      const px = await pixels();
      vrai(etiquette + ' : le bloc du compte, mesuré au pixel (' + px.blocs + ' bloc, ' + px.n + ' textes)', px.blocs >= 1 && px.n >= 1);
      v(etiquette + ' : chaque texte du bloc se lit sur son fond PEINT', px.faibles, []);
    }
    if (p === 'telephone') { v(etiquette + ' : au doigt, le bouton et les gestes du compte font 44 px', r.cibles, []); v(etiquette + ' : rien ne dépasse de côté', r.debord, 0); }
  };
  const photo = async nomf => { if (!PHOTOS) return;
    const cap = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(SORTIE, nomf + '.png'), Buffer.from(cap.data, 'base64')); };
  const stripe = () => { try { return fs.readFileSync(JOURNAL, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => x.url.includes('/checkout/sessions')); } catch (e) { return []; } };
  const qp = m => m.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16)));

  const RECAP = CHEMIN + 'recap-abonnement.html', ESPACE = CHEMIN + 'espace.html', REINIT = CHEMIN + 'reinit.html';
  for (const p of PROFILS) for (const mode of MODES) {
    const tag = (p === 'telephone' ? 'tel' : 'bureau') + '·' + (mode === 'light' ? 'jour' : 'nuit');
    console.log('\n══ ' + tag + ' ══');
    await profil(p, mode);
    await aller(RECAP); await ev('(()=>{ localStorage.clear(); sessionStorage.clear(); return 1; })()');
    // 1. sans compte
    await aller(RECAP + '?formule=business&utilisateurs=3');
    let t = await texteCarte();
    vrai(tag + ' · sans compte : « Créer mon compte pour payer » et « Un compte TEAM OP d\'abord »', t.includes('Créer mon compte pour payer') && t.includes('Un compte TEAM OP d\'abord.'));
    await juger(tag + ' · sans compte', p); await photo('1-sans-compte-' + tag);
    // 2. le toucher → le portail
    vrai(tag + ' · le bouton est touché (et c\'est bien lui sous le doigt)', await toucher(p, '#btnPayer'));
    await attendre(async () => /espace\.html$/.test(new URL(await url()).pathname));
    const u2 = await url();
    v(tag + ' · → le portail, avec le retour au paiement', [u2.replace(B, '').split('?')[0], decodeURIComponent(u2.split('retour=')[1] || '')], [ESPACE, 'recap-abonnement.html?formule=business&utilisateurs=3']);
    await dormir(600);
    vrai(tag + ' · le portail dit « vous reviendrez automatiquement à votre paiement » et ouvre « Créer un compte »',
      await ev(`document.body.innerText.includes('reviendrez automatiquement à votre paiement') && document.getElementById('a-submit').textContent.trim()==='Créer mon compte'`));
    // 3. le VRAI formulaire d'inscription
    const mail = mailDe(p, mode);
    await taper('#a-prenom', 'Camille'); await taper('#a-nom', 'Exemple'); await taper('#a-company', 'Hygiène Exemple');
    await taper('#a-email', mail); await taper('#a-pass', 'un-mot-de-passe-solide'); await taper('#a-pass2', 'un-mot-de-passe-solide');
    const n0 = courriers.length;
    vrai(tag + ' · « Créer mon compte » est touché', await toucher(p, '#a-submit'));
    /* ⚠️ sur le CHEMIN, pas sur l'adresse entière : l'adresse du portail porte « recap-abonnement.html » dans son ?retour= */
    const chemin = async () => new URL(await url()).pathname;
    const revenu = await attendre(async () => /recap-abonnement\.html$/.test(await chemin()), 80);
    vrai(tag + ' · ⛔ retour AUTOMATIQUE sur la page de paiement, avec le choix fait', revenu && decodeURIComponent(await url()).includes('formule=business&utilisateurs=3'));
    await attendre(async () => /Confirmez votre adresse/.test(await texteCarte()), 60);
    t = await texteCarte();
    vrai(tag + ' · « Confirmez votre adresse e-mail », à ' + mail, t.includes('Confirmez votre adresse e-mail.') && t.includes(mail));
    vrai(tag + ' · le courriel de confirmation est VRAIMENT parti (le relais l\'a reçu)', await attendre(async () => courriers.length > n0, 50));
    await juger(tag + ' · adresse à confirmer', p); await photo('3-a-confirmer-' + tag);
    const n1 = courriers.length;
    vrai(tag + ' · « Renvoyer le lien » est touché', await toucher(p, '#btnRenvoiLien'));
    await attendre(async () => /vient de partir/.test(await texteCarte()), 50);
    vrai(tag + ' · il dit « Un nouveau lien vient de partir » — et le relais le reçoit', /Un nouveau lien vient de partir/.test(await texteCarte()) && await attendre(async () => courriers.length > n1, 50));
    await juger(tag + ' · lien renvoyé', p);
    vrai(tag + ' · ⛔ rien n\'est parti vers Stripe tant que l\'adresse n\'est pas confirmée', stripe().length === 0 || stripe().every(s => !new URLSearchParams(s.corps).get('customer_email') || new URLSearchParams(s.corps).get('customer_email') !== mail));
    // 4. le VRAI lien de confirmation
    const jetons = courriers.map(qp).map(m => (/mode=verifyEmail&jeton=([0-9a-f]{64})/.exec(m) || [])[1]).filter(Boolean);
    vrai(tag + ' · le courriel porte le lien de confirmation', jetons.length >= 1);
    await aller(REINIT + '?mode=verifyEmail&jeton=' + jetons[jetons.length - 1], 1500);
    vrai(tag + ' · reinit.html : « Adresse e-mail vérifiée »', await ev(`document.body.innerText.includes('Adresse e-mail vérifiée')`));
    await aller(RECAP + '?formule=business&utilisateurs=3');
    await attendre(async () => /Paiement rattaché/.test(await texteCarte()), 60);
    t = await texteCarte();
    vrai(tag + ' · « Paiement rattaché à votre compte : ' + mail + ' »', t.includes('Paiement rattaché à votre compte') && t.includes(mail));
    vrai(tag + ' · le bouton : « Continuer vers le paiement »', t.includes('Continuer vers le paiement'));
    await juger(tag + ' · prêt', p); await photo('4-pret-' + tag);
    // 5. payer
    const s0 = stripe().length, b0 = BLOQUES.length;
    vrai(tag + ' · « Continuer vers le paiement » est touché', await toucher(p, '#btnPayer'));
    await attendre(async () => BLOQUES.slice(b0).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')), 80);
    vrai(tag + ' · ⛔ le navigateur part vers la page Stripe rendue par le serveur', BLOQUES.slice(b0).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')));
    const s1 = stripe().slice(s0), envoye = new URLSearchParams(s1[0] ? s1[0].corps : '');
    v(tag + ' · le serveur a ouvert UNE page de paiement, pour 3 abonnements', [s1.length, envoye.get('line_items[0][quantity]')], [1, '3']);
    if (REGLE) v(tag + ' · ⛔ au nom du compte (customer_email, et sur l\'abonnement)', [envoye.get('customer_email'), envoye.get('subscription_data[metadata][compte]')], [mail, mail]);
    // 6. le service tombe, puis revient
    panne = true;
    await aller(RECAP + '?formule=pro&utilisateurs=2');
    await attendre(async () => /ne répond pas/.test(await texteCarte()), 100);
    t = await texteCarte();
    vrai(tag + ' · service tombé : « Le service TEAM OP ne répond pas » — « rien n\'a été payé », bouton « Réessayer »', t.includes('Le service TEAM OP ne répond pas.') && t.includes('rien n\'a été payé') && t.includes('Réessayer'));
    await juger(tag + ' · service injoignable', p); await photo('6-injoignable-' + tag);
    panne = false;
    vrai(tag + ' · « Réessayer » est touché', await toucher(p, '#btnPayer'));
    vrai(tag + ' · le service revenu : la page est prête, sans avoir payé', await attendre(async () => /Paiement rattaché/.test(await texteCarte()), 80));
    // B. l'appareil est relié à une entreprise (`elan_sync_team`, ce que la page envoie en `ref`)
    const relier = t => ev(`(()=>{ ${t ? `localStorage.setItem('elan_sync_team', ${JSON.stringify(t)})` : `localStorage.removeItem('elan_sync_team')`}; return 1; })()`);
    await relier('sonde-voisine-t');
    const sB = stripe().length, bB = BLOQUES.length;
    vrai(tag + ' · B · « Continuer vers le paiement » est touché, l\'appareil relié à l\'entreprise d\'un AUTRE compte', await toucher(p, '#btnPayer'));
    if (REGLE_B) {
      await attendre(async () => /Seul le compte de l'entreprise peut payer pour elle/.test(await texteCarte()), 80);
      t = await texteCarte();
      vrai(tag + ' · ⛔ B · « Seul le compte de l\'entreprise peut payer pour elle » … « Rien n\'a été payé », sans « Réessayez »',
        t.includes('Seul le compte de l\'entreprise peut payer pour elle, et ce compte n\'est pas le sien.') && t.includes('Rien n\'a été payé.') && !t.includes('Réessayez dans un instant'));
      await dormir(400);
      v(tag + ' · ⛔ B · rien n\'est parti : aucune page Stripe ouverte, aucune navigation', [stripe().length - sB, BLOQUES.slice(bB).filter(u => /stripe\.com/.test(u)).length, new URL(await url()).pathname], [0, 0, RECAP]);
      vrai(tag + ' · B · la page reste prête (au nom du compte), « Changer de compte » offert, le bouton se retouche',
        t.includes('Paiement rattaché à votre compte') && t.includes(mail) && await ev(`!!document.getElementById('btnAutreCompte') && !document.getElementById('btnPayer').disabled`));
      await juger(tag + ' · B · autre entreprise', p); await photo('B-autre-entreprise-' + tag);
      // relié à SON entreprise : le paiement s'ouvre, et l'abonnement la porte
      await relier(tSienne(p, mode));
      const sS = stripe().length, bS = BLOQUES.length;
      vrai(tag + ' · B · relié à SON entreprise : « Continuer vers le paiement » est touché', await toucher(p, '#btnPayer'));
      await attendre(async () => BLOQUES.slice(bS).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')), 80);
      const eS = stripe().slice(sS), cS = new URLSearchParams(eS[0] ? eS[0].corps : '');
      v(tag + ' · ⛔ B · le navigateur part vers Stripe, l\'abonnement porte SON entreprise et SON compte',
        [BLOQUES.slice(bS).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')), eS.length, cS.get('client_reference_id'), cS.get('subscription_data[metadata][espace]'), cS.get('customer_email')],
        [true, 1, tSienne(p, mode), tSienne(p, mode), mail]);
      /* ⚠️ la page de Stripe (bloquée ici) n'est pas de notre origine : on revient d'abord, on délie ENSUITE */
      await aller(RECAP + '?formule=pro&utilisateurs=2'); await relier(''); await aller(RECAP + '?formule=pro&utilisateurs=2');
      vrai(tag + ' · retour sur la page : prête', await attendre(async () => /Paiement rattaché/.test(await texteCarte()), 80));
    } else {
      /* le serveur D'AVANT (en service tant que la page part seule) : il grave la référence telle quelle — la page publiée
         avant lui ne casse rien, le paiement s'ouvre comme la veille */
      await attendre(async () => BLOQUES.slice(bB).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')), 80);
      v(tag + ' · B · serveur d\'avant : la page part vers Stripe comme avant (rien ne casse)', [BLOQUES.slice(bB).some(u => u.startsWith('https://checkout.stripe.com/c/pay/sonde')), stripe().length - sB], [true, 1]);
      /* ⚠️ la page de Stripe (bloquée ici) n'est pas de notre origine : on revient d'abord, on délie ENSUITE */
      await aller(RECAP + '?formule=pro&utilisateurs=2'); await relier(''); await aller(RECAP + '?formule=pro&utilisateurs=2');
      vrai(tag + ' · retour sur la page : prête', await attendre(async () => /Paiement rattaché/.test(await texteCarte()), 80));
    }
    // 7. changer de compte
    vrai(tag + ' · « Ce n\'est pas vous ? Changer de compte » est touché', await toucher(p, '#btnAutreCompte'));
    await attendre(async () => /espace\.html$/.test(new URL(await url()).pathname), 80); await dormir(900);
    v(tag + ' · → le portail, session rendue : il reste sur le formulaire (pas de retour automatique)', [(await url()).replace(B, '').split('?')[0], await ev(`localStorage.getItem('teamop_portail_jeton')`), await ev(`!!document.getElementById('a-submit')`)], [ESPACE, null, true]);
    EXC.splice(0);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (echecs.length ? '\n\nÉCHECS :\n· ' + echecs.slice(0, 60).join('\n· ') : ''));
  ws.close(); web.close(); facteur.close(); tuer();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ la sonde est tombée : ' + (e && e.stack || e)); process.exit(2); });
