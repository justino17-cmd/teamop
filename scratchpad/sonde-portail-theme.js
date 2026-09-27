/* Sonde : les dix pages hors du site, AU THÈME DU SITE — jour ET nuit, téléphone ET bureau, au navigateur.
   Justin, 27 septembre 2026 au soir : « au niveau des connexions ou création de compte, j'ai pas mon thème ». Le banc
   (tests/test-836.js) garde le TEXTE des pages ; cette sonde regarde ce que le navigateur PEINT, sur les copies
   d'aperçu (apercu/), celles que Justin ouvre :
   · aucune erreur JavaScript ;
   · le fond de la page est celui du site (blanc le jour, #0b1426 la nuit), et aucune GRANDE surface n'est sombre le
     jour ni claire la nuit (« un mode est un mode ») ;
   · chaque texte se lit sur ce qu'il y a VRAIMENT derrière lui (fonds des ancêtres composés) : 4,5, ou 3 en grand ;
   · rien ne dépasse de côté au téléphone (mesuré deux fois, puis on demande à la page si elle bouge) ;
   · au doigt, aucune commande sous 44 px ;
   · aucune police de l'ancien habillage (DM Sans, Space Mono, Courier) ;
   · le bouton ☀︎/☾ est là, fait 44 px, n'est couvert par rien, bascule la page ET la mémoire ;
   · le choix fait sur le SITE se retrouve sur le portail, et inversement ;
   · le portail CONNECTÉ (le vrai serveur, un compte créé par la page elle-même) : le menu, les treize écrans,
     l'écran de l'équipe TeamOP et celui de l'administration.
   127.0.0.1 seulement : le dépôt est servi ici, l'API est le VRAI serveur (server/index.js) monté à côté, avec un
   facteur SMTP local. Données fictives (« Hygiène Exemple », camille@exemple.fr, code BIENVENUE3).
   Usage : node scratchpad/sonde-portail-theme.js        PHOTOS=1 : une capture par état (scratchpad/vues-portail/) */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(__dirname, 'vues-portail');
const PHOTOS = !!process.env.PHOTOS;
if (PHOTOS) fs.mkdirSync(SORTIE, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0; const echecs = [];
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; if (!bon) echecs.push(t);
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a).slice(0, 700))); };
const vrai = (t, c) => v(t, !!c, true);

const P = { telephone: { w: 390, h: 844, dpr: 2, tac: true }, bureau: { w: 1440, h: 900, dpr: 1, tac: false } };
const FOND = { light: 'rgb(255, 255, 255)', dark: 'rgb(11, 20, 38)' };

/* ── l'audit, joué DANS la page ── */
const AUDIT = `(async (largeur, mode) => {
  const trame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await trame(); void document.body.offsetWidth;
  const ruban = document.getElementById('apercu-ruban'); if (ruban) ruban.style.display = 'none';
  /* une couleur calculée peut revenir en rgb() OU en color(srgb 0–1) (color-mix) : on reconnaît la forme, sinon on jette */
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
    for (const x of ch) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== 'none') degrade = true; const c = lire(s.backgroundColor); if (c && c[3] > 0) f = sur(c, f); }
    return { f, degrade }; };
  const r = { fond: getComputedStyle(document.body).backgroundColor, theme: document.documentElement.getAttribute('data-theme'),
    grossier: matchMedia('(pointer:coarse)').matches, surfaces: [], textes: 0, faibles: [], degrades: 0, illisibles: 0, polices: [], cibles: [], debord: null, bouton: null, placeholders: [] };
  /* les grandes surfaces : rien de sombre le jour, rien de clair la nuit */
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e)) continue; const b = e.getBoundingClientRect(); if (b.width * b.height < 40000) continue;
    const c = lire(getComputedStyle(e).backgroundColor); if (!c || c[3] < 0.5) continue;
    const L = lum(sur(c, racineFond));
    if (mode === 'light' ? L < 0.6 : L > 0.12) r.surfaces.push(nom(e) + ' ' + getComputedStyle(e).backgroundColor + ' (' + Math.round(b.width) + '×' + Math.round(b.height) + ')');
  }
  /* chaque texte, sur ce qu'il y a vraiment derrière lui */
  const polices = new Set();
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('#apercu-ruban') || /^(SCRIPT|STYLE|NOSCRIPT|svg|path)$/i.test(e.tagName)) continue;
    const direct = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const champ = /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && e.type !== 'hidden' && e.type !== 'checkbox' && e.type !== 'radio';
    if (!direct && !champ) continue; if (!visible(e)) continue;
    const s = getComputedStyle(e); polices.add(s.fontFamily.split(',')[0].trim());
    const c = lire(s.color); if (!c) { r.illisibles++; continue; }
    const { f, degrade } = fondDe(e); if (degrade) { r.degrades++; continue; }
    let op = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) op *= +getComputedStyle(x).opacity;
    const encre = sur([c[0], c[1], c[2], c[3] * op], f);
    const k = ctr(encre, f), taille = parseFloat(s.fontSize), gras = +s.fontWeight >= 700;
    const seuil = (taille >= 24 || (taille >= 18.66 && gras)) ? 3 : 4.5;
    r.textes++;
    /* un champ désactivé (grisé exprès) et le texte d'un bouton désactivé ne comptent pas : WCAG les exempte */
    if (e.disabled || e.closest('button:disabled')) continue;
    if (k < seuil) r.faibles.push(nom(e) + ' « ' + (e.textContent || e.value || e.placeholder || '').trim().slice(0, 40) + ' » ' + k.toFixed(2) + ' < ' + seuil);
    if (champ && e.placeholder && !e.value) { const pc = lire(getComputedStyle(e, '::placeholder').color); if (pc) { const kp = ctr(sur(pc, f), f); if (kp < 3) r.placeholders.push(nom(e) + ' ' + kp.toFixed(2)); } }
  }
  r.polices = [...polices];
  /* au doigt : aucune commande sous 44 px */
  if (r.grossier) for (const e of document.querySelectorAll('button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, a.btn, .btn, .tab, .pill, .back, .btn-retour, .puce-formule, .cycle, .mode, .mdp-oeil, a.carte, .setrow, .appc, .faq-q, .sec-h')) {
    if (!visible(e) || e.closest('#apercu-ruban')) continue; const b = e.getBoundingClientRect();
    if (b.height < 43.5) r.cibles.push(nom(e) + ' ' + Math.round(b.width) + '×' + Math.round(b.height) + ' « ' + (e.textContent || e.placeholder || '').trim().slice(0, 30) + ' »');
  }
  /* le bouton ☀︎/☾ : là, 44 px, et pas couvert */
  const m = document.querySelector('.mode');
  if (m) { const b = m.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2, t = document.elementFromPoint(x, y);
    r.bouton = { visible: visible(m) && !m.hidden, w: Math.round(b.width), h: Math.round(b.height), libre: !!t && (t === m || m.contains(t)) }; }
  /* le débordement de côté : mesuré deux fois, puis on demande à la page si elle bouge */
  const mesure = () => document.documentElement.scrollWidth - largeur;
  const d1 = mesure(); await new Promise(res => setTimeout(res, 700)); await trame(); void document.body.offsetWidth; const d2 = mesure();
  let bouge = 0; if (d1 > 1 && d2 > 1) { scrollTo(9999, scrollY); await trame(); bouge = scrollX; scrollTo(0, scrollY); }
  r.debord = { d1, d2, bouge };
  if (ruban) ruban.style.display = '';
  return r;
})`;

/* ── les états à regarder : page, adresse, et ce qu'on joue avant l'audit ── */
const RELIE = `localStorage.setItem('elan_sync_team','hygiene-exemple'); localStorage.setItem('elan_entreprise_nom','Hygiène Exemple');`;
const ETATS = [
  { nom: 'espace-connexion', chemin: '/apercu/espace.html' },
  { nom: 'espace-creer', chemin: '/apercu/espace.html', geste: `authTab('signup');` },
  { nom: 'espace-erreur', chemin: '/apercu/espace.html', geste: `_err('auth-err','Identifiants incorrects.');` },
  { nom: 'espace-retour-paiement', chemin: '/apercu/espace.html?retour=recap-abonnement.html%3Fformule%3Dpro' },
  { nom: 'espace-equipe', chemin: '/apercu/espace.html', geste: `renderTeamAuth(); document.getElementById('team-err').innerHTML='<div class="err">Identifiants incorrects.</div>';` },
  { nom: 'connexion-adresse', chemin: '/apercu/connexion.html?choix=1' },
  { nom: 'connexion-inconnue', chemin: '/apercu/connexion.html?choix=1', geste: `adrMsg('var(--m-body)',adrPasBonne('plombier-du-coin'));` },
  { nom: 'connexion-relie', chemin: '/apercu/connexion.html?choix=1', avant: RELIE },
  { nom: 'connexion-repli', chemin: '/apercu/connexion.html?choix=1', avant: `localStorage.setItem('elan_sync_team','elan-gestion');` },
  { nom: 'connexion-entreprise', chemin: '/apercu/connexion.html?e=hygiene-exemple', attente: 2500,
    geste: `cxCodeAfficher(); cxMsg('var(--m-warn)','Cette entreprise ne connaît pas encore la connexion par identifiant.'); document.getElementById('cx-adr').textContent='teamop.fr/e/'+'une-entreprise-au-nom-vraiment-tres-long-pour-voir';` },
  { nom: 'connexion-envoye', chemin: '/apercu/connexion.html?choix=1', geste: `adrMsg('var(--m-ok)','📧 Si « hygieneexemple » est bien inscrite chez TEAM OP, son lien de connexion vient de partir.');` },
  { nom: 'reinit-form', chemin: '/apercu/reinit.html?mode=resetPassword&jeton=exemple', geste: `document.getElementById('p1').value='court'; enregistrer();` },
  { nom: 'reinit-ok', chemin: '/apercu/reinit.html?mode=resetPassword&jeton=exemple', geste: `montre('etape-ok');` },
  { nom: 'reinit-ko', chemin: '/apercu/reinit.html' },
  { nom: 'recap-pro', chemin: '/apercu/recap-abonnement.html?formule=pro', geste: `promoValider();` },
  { nom: 'recap-premium-annuel', chemin: '/apercu/recap-abonnement.html?formule=premium', geste: `document.querySelector('.cycle[data-cycle=annuel]').click();` },
  { nom: 'recap-gratuit', chemin: '/apercu/recap-abonnement.html?formule=gratuit' },
  { nom: 'recap-messages', chemin: '/apercu/recap-abonnement.html?formule=msgpro' },
  { nom: 'merci', chemin: '/apercu/merci.html' },
  { nom: 'mentions', chemin: '/apercu/mentions-legales.html' },
  { nom: 'confidentialite', chemin: '/apercu/confidentialite.html' },
  { nom: 'sous-traitance', chemin: '/apercu/sous-traitance.html' },
  { nom: 'registre', chemin: '/apercu/registre-traitements.html' },
  { nom: '404', chemin: '/apercu/404.html' },
];

(async () => {
  /* ── 1. le VRAI serveur, isolé, avec son facteur ── */
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('server/node_modules absent : sonde impossible'); process.exit(2); }
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-portail-'));
  const data = path.join(BANC, 'data'); fs.mkdirSync(data, { recursive: true });
  const facteur = net.createServer(c => { c.write('220 sonde\r\n'); let t = '', corps = false;
    c.on('data', d => { t += d; let i; while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; c.write('250 ok\r\n'); } continue; }
      const h = l.toUpperCase(); if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-sonde\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH')) c.write('235 ok\r\n'); else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  const portSmtp = await new Promise(r => facteur.listen(0, '127.0.0.1', () => r(facteur.address().port)));
  const vap = require(path.join(RACINE, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
  const cfg = path.join(BANC, 'config.json');
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'sonde',
    adminPassHash: crypto.createHash('sha256').update('sonde-admin').digest('hex'), comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'sonde@teamop.fr' } }));
  const portApi = await libre();
  const srv = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: data, PORT: String(portApi) }), stdio: 'ignore' });
  let vivant = false; for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch('http://127.0.0.1:' + portApi + '/health')).ok; } catch (e) {} }
  vrai('le vrai serveur répond (/health)', vivant);

  /* ── 2. le dépôt servi, et /api relayé au serveur : même origine, comme sur teamop.fr ── */
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const pp = await libre();
  const web = http.createServer((q, r) => {
    if (q.url.startsWith('/api/') || q.url === '/health') {
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

  /* ── 3. le navigateur (SwiftShader : le chemin qu'emprunte un vrai appareil pour le flou) ── */
  const pc = await libre();
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-portail-nav-')), 'about:blank'], { stdio: 'ignore', detached: true });
  const tuer = () => { try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} try { srv.kill('SIGKILL'); } catch (e) {} };
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
  /* ⛔ rien ne sort : une adresse qui n'est pas 127.0.0.1 est coupée net (api.teamop.fr compris) */
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.method !== 'Fetch.requestPaused') return;
    const u = m.params.request.url; if (/^https?:\/\/127\.0\.0\.1[:/]/.test(u) || u.startsWith('data:')) cdp('Fetch.continueRequest', { requestId: m.params.requestId }).catch(() => {});
    else cdp('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {}); });
  const ev = async (e, attendre = true) => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: attendre, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result.value; };
  const profil = async (p, mode) => { const pr = P[p];
    await cdp('Emulation.setDeviceMetricsOverride', { width: pr.w, height: pr.h, deviceScaleFactor: pr.dpr, mobile: pr.tac });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: pr.tac, maxTouchPoints: pr.tac ? 5 : 1 });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] }); };
  const aller = async (chemin, avant, attente) => {
    await cdp('Page.navigate', { url: B + chemin }); await dormir(700);
    await ev(`(()=>{ try{ localStorage.clear(); sessionStorage.clear(); }catch(e){} ${avant || ''} return 1; })()`);
    await cdp('Page.navigate', { url: B + chemin }); await dormir(attente || 900); };
  const photo = async nomf => { if (!PHOTOS) return;
    const clip = await ev(`(()=>({x:0,y:0,width:innerWidth,height:Math.min(3600,document.documentElement.scrollHeight),scale:1}))()`);
    const cap = await cdp('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
    fs.writeFileSync(path.join(SORTIE, nomf + '.png'), Buffer.from(cap.data, 'base64')); };
  const juger = async (etiquette, p, mode) => {
    const r = await ev(AUDIT + `(${P[p].w}, '${mode}')`);
    v(etiquette + ' : aucune erreur JavaScript', EXC.splice(0), []);
    v(etiquette + ' : le fond de la page est celui du site', r.fond, FOND[mode]);
    v(etiquette + ' : aucune grande surface ' + (mode === 'light' ? 'sombre le jour' : 'claire la nuit'), r.surfaces, []);
    vrai(etiquette + ' : des textes mesurés (' + r.textes + ', ' + r.degrades + ' sur un dégradé, ' + r.illisibles + ' couleur illisible)', r.textes >= 5 && r.illisibles === 0);
    v(etiquette + ' : chaque texte se lit sur son fond réel', r.faibles, []);
    v(etiquette + ' : chaque indication de champ se lit (≥ 3)', r.placeholders, []);
    v(etiquette + ' : aucune police de l\'ancien habillage', r.polices.filter(f => /DM Sans|Space Mono|Courier/i.test(f)), []);
    if (p === 'telephone') {
      vrai(etiquette + ' : le navigateur se sait « au doigt » (pointer: coarse)', r.grossier);
      v(etiquette + ' : aucune commande sous 44 px', r.cibles, []);
      v(etiquette + ' : rien ne dépasse de côté (la page ne bouge pas)', r.debord.bouge, 0);
    }
    v(etiquette + ' : le bouton ☀︎/☾ est là, 44 px, libre', r.bouton && [r.bouton.visible, r.bouton.w, r.bouton.h, r.bouton.libre], [true, 44, 44, true]);
    return r;
  };

  /* ── 4. les états des dix pages ── */
  console.log('\n══ LES DIX PAGES, JOUR ET NUIT, TÉLÉPHONE ET BUREAU ══');
  for (const p of ['telephone', 'bureau']) for (const mode of ['light', 'dark']) {
    await profil(p, mode);
    for (const E of ETATS) {
      await aller(E.chemin, E.avant, E.attente);
      if (E.geste) { await ev(`(()=>{ ${E.geste} ; try{ document.activeElement.blur(); }catch(e){} return 1; })()`); await dormir(400); }
      await juger(E.nom + ' · ' + p + ' · ' + (mode === 'light' ? 'jour' : 'nuit'), p, mode);
      await photo(E.nom + '-' + p + '-' + (mode === 'light' ? 'jour' : 'nuit'));
    }
  }

  /* ── 5. le bouton ☀︎/☾ bascule la page ET la mémoire, et le choix passe du site au portail ── */
  console.log('\n══ LE CHOIX ☀︎/☾ : IL BASCULE, IL SE SOUVIENT, IL VOYAGE ══');
  await profil('telephone', 'light');
  const toucher = async sel => { const b = await ev(`(()=>{ const e=document.querySelector(${JSON.stringify(sel)}); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await dormir(60);
    await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(500); };
  const etat = () => ev(`(()=>({theme:document.documentElement.getAttribute('data-theme'), fond:getComputedStyle(document.body).backgroundColor, memoire:localStorage.getItem('teamop_site_mode'), bouton:document.querySelector('.mode').getAttribute('aria-label'), barre:[...document.querySelectorAll('meta[name=theme-color]')].map(m=>m.media)}))()`);
  for (const E of [{ n: 'espace', c: '/apercu/espace.html' }, { n: 'connexion', c: '/apercu/connexion.html?choix=1' }, { n: 'recap', c: '/apercu/recap-abonnement.html?formule=pro' }, { n: 'mentions', c: '/apercu/mentions-legales.html' }, { n: '404', c: '/apercu/404.html' }]) {
    await aller(E.c);
    await toucher('.mode'); let e = await etat();
    v(E.n + ' : toucher ☀︎/☾ passe la page en nuit, et s\'en souvient', [e.theme, e.fond, e.memoire, e.bouton], ['dark', FOND.dark, 'nuit', 'Passer en mode jour']);
    v(E.n + '    et la barre du navigateur suit (la couleur de nuit prend la main)', e.barre, ['not all', 'all']);
    await toucher('.mode'); e = await etat();
    v(E.n + ' : le retoucher revient au mode de l\'appareil, et oublie le choix', [e.theme, e.fond, e.memoire], [null, FOND.light, null]);
  }
  await aller('/apercu/site/index.html'); await toucher('.mode');
  await cdp('Page.navigate', { url: B + '/apercu/connexion.html?choix=1' }); await dormir(900);
  let e = await etat();
  v('⛔ la nuit choisie sur le SITE se retrouve sur la connexion (sans rien toucher)', [e.theme, e.fond, e.memoire], ['dark', FOND.dark, 'nuit']);
  await cdp('Page.navigate', { url: B + '/apercu/espace.html' }); await dormir(900); e = await etat();
  v('   et sur le portail', [e.theme, e.fond], ['dark', FOND.dark]);
  await toucher('.mode'); await cdp('Page.navigate', { url: B + '/apercu/site/tarifs.html' }); await dormir(900); e = await etat();
  v('   le jour repris sur le portail se retrouve sur le site', [e.theme, e.fond, e.memoire], [null, 'rgb(255, 255, 255)', null]);

  /* ── 6. le portail CONNECTÉ : un compte créé par la page elle-même, puis chaque écran ── */
  console.log('\n══ LE PORTAIL CONNECTÉ (VRAI SERVEUR) : LE MENU ET SES TREIZE ÉCRANS ══');
  const DOC = `{ prenom:'Camille', nom:'Exemple', company:'Hygiène Exemple', tel:'06 00 00 00 00', status:'encours', apps:['elan'], plan:'Business', planStatus:'actif',
    promo:{ code:'BIENVENUE3', until: Date.now()+20*86400000, mois:3, apps:['elan','opmsg'] },
    demandes:[{ date: Date.now()-86400000, app:'OP GESTION', users:5, formule:'Business', besoin:'Planning des interventions et stock des box pour une équipe de cinq.', company:'Hygiène Exemple', tel:'06 00 00 00 00', lien:'hygiene-exemple', statut:'encours' },
              { date: Date.now()-9*86400000, app:'OP GESTION', users:2, formule:'Pro', besoin:'Premier essai.', statut:'fourni' }],
    docs:[{ name:'Facture n°12 — septembre 2026', url:'#' }] }`;
  for (const p of ['telephone', 'bureau']) for (const mode of ['light', 'dark']) {
    await profil(p, mode);
    await aller('/apercu/espace.html');
    const cree = await ev(`(async()=>{ try{ await auth.createUserWithEmailAndPassword('camille.${p}.${mode}@exemple.fr','un-mot-de-passe-solide'); }catch(e){ return 'refus : '+((e&&e.code)||e); }
      for(let i=0;i<50;i++){ await new Promise(r=>setTimeout(r,100)); if(/Bonjour/.test(document.getElementById('space').textContent)) return 'ok'; } return 'pas de menu'; })()`);
    v('connecté · ' + p + ' · ' + mode + ' : la page crée le compte et affiche le menu', cree, 'ok');
    if (cree !== 'ok') continue;
    await ev(`(()=>{ try{ if(typeof _unsubReqs==='function') _unsubReqs(); }catch(e){} _curView='menu'; paintClient(_meUser, ${DOC}); return 1; })()`); await dormir(300);
    const tag = (p === 'telephone' ? 'tel' : 'bureau') + '-' + (mode === 'light' ? 'jour' : 'nuit');
    await juger('menu · ' + tag, p, mode); await photo('connecte-menu-' + tag);
    for (const vue of ['apps', 'demandes', 'abo', 'docs', 'info', 'bill', 'email', 'pass', 'notif', 'news', 'faq', 'support', 'del']) {
      await ev(`(()=>{ openView('${vue}'); ${vue === 'faq' ? "document.querySelectorAll('.faq')[0]&&document.querySelectorAll('.faq')[0].classList.add('open');" : ''} return 1; })()`); await dormir(vue === 'news' || vue === 'support' ? 1200 : 350);
      if (vue === 'info') await ev(`(()=>{ _ok('info-msg','Informations enregistrées.'); return 1; })()`);
      if (vue === 'pass') await ev(`(()=>{ _err('pw-err','Le nouveau mot de passe doit faire au moins 8 caractères.'); return 1; })()`);
      await juger(vue + ' · ' + tag, p, mode); await photo('connecte-' + vue + '-' + tag);
    }
    /* l'écran d'administration, sur des demandes fictives (le vrai n'est ouvert qu'à l'adresse de Justin) */
    await ev(`(()=>{ const faux = n => ({ empty:false, forEach(fn){ (n==='teamop_news' ? [{id:'n1',data:()=>({title:'Nouveau : la tournée du jour',text:'Carte, temps de trajet et ordre optimisé.',tag:'nouveau',audience:'public',ts:{toDate:()=>new Date()}})}]
        : [{id:'c1',data:()=>({company:'Hygiène Exemple',name:'Camille Exemple',email:'camille@exemple.fr',status:'nouveau',apps:[],besoin:'Planning et stock.',demandes:[{date:Date.now(),app:'OP GESTION',users:5,formule:'Business'}],promo:{code:'BIENVENUE3',until:Date.now()+86400000*20}})},
           {id:'c2',data:()=>({company:'Nettoyage Démo',email:'demo@exemple.fr',status:'fourni',apps:['elan']})}]).forEach(fn); } });
      const q = n => { const o = { orderBy(){return o;}, where(){return o;}, limit(){return o;}, get(){ return Promise.resolve(faux(n)); }, onSnapshot(cb){ cb(faux(n)); return ()=>{}; }, doc(){ return o; } }; return o; };
      fs.collection = q; renderAdmin({ uid:'admin', email:'admin@exemple.fr' }); return 1; })()`); await dormir(500);
    await juger('administration · ' + tag, p, mode); await photo('connecte-admin-' + tag);
    await ev(`(async()=>{ try{ await auth.signOut(); }catch(e){} return 1; })()`); await dormir(300);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗' + (echecs.length ? '\n\nÉCHECS :\n· ' + echecs.slice(0, 80).join('\n· ') : ''));
  ws.close(); web.close(); facteur.close(); tuer();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ la sonde est tombée : ' + (e && e.stack || e)); process.exit(2); });
