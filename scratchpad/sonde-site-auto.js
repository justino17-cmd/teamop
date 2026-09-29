/* Sonde : le jour et la nuit du site suivent l'appareil, sans bouton — dans un vrai Chromium, sur les 18 pages servies.
   Justin, 29 septembre 2026, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux que
   ça soit automatique ».
   Pour chaque page (les 8 du site et les 10 voisines), chaque profil (téléphone 360 et 390, bureau) et chaque mode de
   l'appareil (jour, nuit) :
   · aucun bouton ☀︎/☾ ni son coin, aucune demande de mode.js, aucun mode forcé (data-theme) ;
   · un choix rangé par l'ancien bouton (l'AUTRE mode) ne force rien et il est EFFACÉ au chargement ;
   · le fond est celui du mode de l'appareil, et une seule couleur de barre (theme-color) s'applique, la bonne ;
   · l'appareil change de mode, la page suit SANS recharger (et revient) ;
   · rien ne déborde de côté (mesuré deux fois, puis on demande à la page si elle bouge), l'en-tête tient ;
   · aucune exception JavaScript.
   Et la TRANSITION : une page d'avant restée en cache (son HTML d'avant le retrait — commit 798d4ca~1, fixe : il ne
   disparaît pas quand main avance —, avec sa vieille tête qui reposait le mode et son bouton caché), servie avec les
   feuilles et le mode.js neufs, suit elle aussi l'appareil. Puis avec l'ANCIEN mode.js (celui qu'un service worker garde
   tant qu'aucune page ne le redemande) : il démasque le bouton, et la garde des feuilles le tient caché (relecture
   adverse du 29 septembre au soir).
   Contre-épreuve : RACINE=<un arbre de main> fait tourner la même sonde sur les pages d'avant — elle doit tomber.
   Usage : node scratchpad/sonde-site-auto.js     (127.0.0.1 seulement — rien ne sort d'ici)
           RACINE=/chemin/vers/main node scratchpad/sonde-site-auto.js   (contre-épreuve) */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os');
const { spawn, execFileSync } = require('child_process');
const DEPOT = path.join(__dirname, '..');
const RACINE = process.env.RACINE || DEPOT;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; if (!bon || process.env.BAVARD) console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };

const SITE = ['index', 'tarifs', 'applications', 'creer', 'elan', 'metiers', 'opmessages', 'pourquoi'].map(x => x + '.html');
const VOISINES = ['espace.html', 'connexion.html', 'reinit.html', 'recap-abonnement.html?formule=pro', 'merci.html', 'mentions-legales.html',
  'confidentialite.html', 'sous-traitance.html', 'registre-traitements.html', '404.html'];
const PAGES = process.env.SEULES ? process.env.SEULES.split(',') : SITE.concat(VOISINES);
const PROFILS = [
  { nom: 'téléphone-360', w: 360, h: 780, tac: true, dpr: 3 },
  { nom: 'téléphone-390', w: 390, h: 844, tac: true, dpr: 3 },
  { nom: 'bureau', w: 1440, h: 900, tac: false, dpr: 1 },
];
const FOND = { light: 'rgb(255, 255, 255)', dark: 'rgb(11, 20, 38)' };

(async () => {
  /* la TRANSITION : le HTML d'avant le retrait (celui qu'un navigateur ou le service worker a pu garder), sous /ancien/ —
     ⛔ un `git show` qui échoue se DIT : une transition jouée sur un ensemble vide passerait au vert sans rien prouver */
  const AVANT = '798d4ca~1';
  const ANCIEN = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-auto-ancien-'));
  const PAGES_AVANT = ['index.html', 'tarifs.html', 'espace.html', 'connexion.html', 'mentions-legales.html'];
  for (const f of PAGES_AVANT) fs.writeFileSync(path.join(ANCIEN, f), execFileSync('git', ['-C', DEPOT, 'show', AVANT + ':' + f]));
  const MODEJS_AVANT = execFileSync('git', ['-C', DEPOT, 'show', AVANT + ':vitrine/v2/mode.js']);
  let modeJsAncien = false;
  const pp = await libre(), pc = await libre();
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.json': 'application/json' };
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (u === '/') u = '/index.html';
    const base = u.startsWith('/ancien/') ? ANCIEN : RACINE, rel = u.startsWith('/ancien/') ? u.slice(8) : u;
    const x = path.join(base, rel); if (!x.startsWith(base)) { r.writeHead(403); return r.end(); }
    if (modeJsAncien && u === '/vitrine/v2/mode.js') { r.writeHead(200, { 'Content-Type': 'text/javascript' }); return r.end(MODEJS_AVANT); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(x)] || 'text/html;charset=utf-8' }); r.end(d); });
  });
  await new Promise(r => srv.listen(pp, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + pp;
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-auto-')), 'about:blank'], { stdio: 'ignore', detached: true });
  const tuer = () => { try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} };
  process.on('exit', tuer); for (const s of ['SIGINT', 'SIGTERM']) process.once(s, () => { tuer(); process.exit(130); });
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const A = new Map(); let EXC = [], REQ = [];
  ws.addEventListener('message', e => { const m = JSON.parse(e.data);
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') EXC.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    if (m.method === 'Network.requestWillBeSent') REQ.push(m.params.request.url);
  });
  const cdp = (me, pa) => new Promise((res, rej) => { const i = ++id; A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Network.enable');
  await cdp('Network.setCacheDisabled', { cacheDisabled: true });
  /* aucun service worker : on mesure la page, pas une copie */
  await cdp('Network.setBypassServiceWorker', { bypass: true }).catch(() => {});
  const ev = async e => { const r = await cdp('Runtime.evaluate', { expression: '(async()=>{' + e + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text); return r.result.value; };
  const aller = async u => { await cdp('Page.navigate', { url: B + '/' + u }); await dormir(900); };
  const media = async m => { await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: m }, { name: 'prefers-reduced-motion', value: 'reduce' }] }); await dormir(300); };
  const ETAT = `const h=document.documentElement; await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const metas=[...document.querySelectorAll('meta[name="theme-color"]')].filter(m=>!m.media||matchMedia(m.media).matches).map(m=>m.content);
    return { theme:h.getAttribute('data-theme'), memo:localStorage.getItem('teamop_site_mode'), fond:getComputedStyle(document.body).backgroundColor,
      boutons:document.querySelectorAll('.mode,.coin-mode').length, boutonsVus:[...document.querySelectorAll('.mode')].filter(b=>!b.hidden&&b.offsetWidth>0).length, barre:metas };`;
  const DEBORD = `await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
    const d1=document.documentElement.scrollWidth-innerWidth; await new Promise(r=>setTimeout(r,700)); void document.body.offsetWidth;
    const d2=document.documentElement.scrollWidth-innerWidth; let bouge=0; if(d1>1&&d2>1){ scrollTo(9999,scrollY); await new Promise(r=>requestAnimationFrame(r)); bouge=scrollX; scrollTo(0,scrollY); }
    /* l'en-tête du site : la pastille « Espace client » et le menu tiennent dans l'écran, sans se chevaucher */
    const vis=e=>e&&e.offsetWidth>0&&getComputedStyle(e).visibility!=='hidden';
    const p=document.querySelector('.nav-droite .pilule'), b=document.querySelector('.nav-droite .burger, .burger');
    let tete=null; if(vis(p)){ const rp=p.getBoundingClientRect(), rb=vis(b)?b.getBoundingClientRect():null;
      tete={ dedans: rp.left>=0 && rp.right<=innerWidth+0.5 && (!rb || rb.right<=innerWidth+0.5), chevauche: !!rb && rb.left<rp.right-0.5 && rb.right>rp.left+0.5, h:Math.round(rp.height) }; }
    return { bouge, tete };`;

  for (const P of PROFILS) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: P.tac });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: P.tac, maxTouchPoints: 5 });
    for (const mode of ['light', 'dark']) {
      const autre = mode === 'light' ? 'dark' : 'light', ancienChoix = mode === 'light' ? 'nuit' : 'jour';
      await media(mode);
      for (const pg of PAGES) {
        const lbl = pg.replace(/\?.*/, '') + ' · ' + P.nom + ' · ' + (mode === 'light' ? 'jour' : 'nuit');
        /* 1. l'ancien bouton avait rangé l'AUTRE mode : on le range, puis on recharge */
        await aller(pg); await ev(`localStorage.setItem('teamop_site_mode', ${JSON.stringify(ancienChoix)}); return 1;`);
        EXC = []; REQ = [];
        await cdp('Page.reload', {}); await dormir(900);
        const a = await ev(ETAT);
        v(lbl + ' : aucun bouton, aucun mode forcé, l\'ancien choix « ' + ancienChoix + ' » effacé', [a.boutons, a.theme, a.memo], [0, null, null]);
        v(lbl + ' : le fond est celui de l\'appareil', a.fond, FOND[mode]);
        v(lbl + ' : une seule couleur de barre, celle du mode', a.barre, [mode === 'light' ? '#f0f3f8' : '#0b1426']);
        v(lbl + ' : aucune demande de mode.js', REQ.filter(u => /mode\.js/.test(u)).length, 0);
        const d = await ev(DEBORD);
        v(lbl + ' : rien ne déborde de côté', d.bouge, 0);
        if (d.tete) v(lbl + ' : l\'en-tête tient (« Espace client » et le menu dans l\'écran, sans se chevaucher)', [d.tete.dedans, d.tete.chevauche], [true, false]);
        /* 2. l'appareil change de mode : la page suit sans recharger, et revient */
        await media(autre); const b = await ev(ETAT);
        v(lbl + ' : l\'appareil passe ' + (autre === 'dark' ? 'en nuit' : 'en jour') + ', la page suit sans recharger', [b.fond, b.barre], [FOND[autre], [autre === 'light' ? '#f0f3f8' : '#0b1426']]);
        await media(mode); const c = await ev(ETAT);
        v(lbl + ' : et revient avec lui', c.fond, FOND[mode]);
        v(lbl + ' : aucune exception JavaScript', EXC.filter(x => !/Failed to fetch|NetworkError|net::|api\.teamop\.fr/.test(x)), []);
      }
    }
  }

  /* ── la TRANSITION : une page d'avant (main) restée en cache, avec les feuilles et le mode.js neufs ── */
  if (!process.env.RACINE) {
    console.log('\n── transition : les pages d'avant (vieille tête, bouton caché) face aux fichiers neufs ──');
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    const avant = fs.readdirSync(ANCIEN);
    v('population de la transition : ' + avant.length + ' pages d\'avant, chacune avec son bouton et son mode.js',
      [avant.length, avant.filter(f => { const t = fs.readFileSync(path.join(ANCIEN, f), 'utf8'); return /class="mode"/.test(t) && /v2\/mode\.js/.test(t); }).length],
      [PAGES_AVANT.length, PAGES_AVANT.length]);
    v('   et l\'ancien mode.js est bien celui qui démasquait le bouton', /modeBtn\.hidden = false/.test(String(MODEJS_AVANT)), true);
    for (const f of avant) for (const mode of ['light', 'dark']) {
      await media(mode);
      const ancienChoix = mode === 'light' ? 'nuit' : 'jour';
      await aller('ancien/' + f); await ev(`localStorage.setItem('teamop_site_mode', ${JSON.stringify(ancienChoix)}); return 1;`);
      await cdp('Page.reload', {}); await dormir(1200);
      const a = await ev(ETAT);
      const lbl = 'ancien ' + f + ' · ' + (mode === 'light' ? 'jour' : 'nuit');
      v(lbl + ' : sa vieille tête reposait « ' + ancienChoix + ' » — il suit quand même l\'appareil (fond), le choix est effacé, rien n\'est forcé',
        [a.fond, a.memo, a.theme], [FOND[mode], null, null]);
      v(lbl + ' : son vieux bouton reste caché (plus rien ne le montre)', a.boutonsVus, 0);
    }
    /* l'ANCIEN mode.js, gardé par un service worker : le choix a déjà été effacé par une page neuve (c'est le seul état
       atteignable, relecture adverse), il démasque le bouton — la garde des feuilles doit le tenir caché */
    console.log('\n── transition : les pages d\'avant avec l\'ANCIEN mode.js et les feuilles neuves ──');
    modeJsAncien = true;
    for (const f of avant) for (const mode of ['light', 'dark']) {
      await media(mode);
      await aller('ancien/' + f); await ev(`localStorage.removeItem('teamop_site_mode'); return 1;`);
      EXC = [];
      await cdp('Page.reload', {}); await dormir(1200);
      const a = await ev(ETAT + '');
      const demasque = await ev(`const b=document.querySelector('.mode'); return !!b && b.hidden===false;`);
      const lbl = 'ancien ' + f + ' + ancien mode.js · ' + (mode === 'light' ? 'jour' : 'nuit');
      v(lbl + ' : (population) l\'ancien script a bien tourné et démasqué le bouton', demasque, true);
      v(lbl + ' : ⛔ le bouton reste invisible (la garde des feuilles), et la page suit l\'appareil', [a.boutonsVus, a.fond], [0, FOND[mode]]);
      v(lbl + ' : aucune exception JavaScript', EXC.filter(x => !/Failed to fetch|NetworkError|net::|api\.teamop\.fr/.test(x)), []);
    }
    modeJsAncien = false;
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  tuer(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
