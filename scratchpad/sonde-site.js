/* Sonde du site vitrine « Marine » (apercu/site/) — chaque geste joué pour de vrai, dans un vrai Chromium.
   Garde du banc tests/test-835.js (qui relit le texte) : ici on CLIQUE, on SURVOLE, on TOUCHE, on tape au clavier.
   Profils : bureau (souris, 1440), tablette (doigt, 820), téléphone (doigt, 390) × jour / nuit.
   Mesures : aucune exception, toutes les images chargées (on fait défiler jusqu'à elles : elles sont paresseuses),
   aucun défilement de côté (on DEMANDE à la page si elle bouge — règle du dépôt), cibles au doigt ≥ 44 px,
   et les gestes : volet du menu, menu du téléphone, fenêtre d'une fonction (clic, flèches, Échap, retour du focus),
   onglets des tarifs (et l'ancre #opmessages), questions, demande « Créer » (le mailto part, et l'écran le dit).
   Usage : node scratchpad/sonde-site.js          (127.0.0.1 seulement — rien ne sort d'ici) */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const GEN = require('../scripts/site-marine.js');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0; const echecs = [];
const vrai = (t, c, d) => { if (c) ok++; else { ko++; echecs.push(t + (d ? ' — ' + d : '')); console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };

const PROFILS = [
  { nom: 'bureau', w: 1440, h: 900, tac: false, dpr: 1 },
  { nom: 'tablette', w: 820, h: 1180, tac: true, dpr: 2 },
  { nom: 'téléphone', w: 390, h: 844, tac: true, dpr: 2 },
];
const PAGES = (process.env.PAGES || 'index,applications,elan,opmessages,creer,metiers,tarifs,pourquoi').split(',');
if (process.env.PROFILS) { const garder = process.env.PROFILS.split(','); PROFILS.splice(0, PROFILS.length, ...PROFILS.filter(p => garder.includes(p.nom))); }
const MODES = (process.env.MODES || 'light,dark').split(',');

(async () => {
  const pp = await libre(), pc = await libre();
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    const x = path.join(RACINE, u); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(x)] || 'text/html;charset=utf-8' }); r.end(d); });
  });
  await new Promise(r => srv.listen(pp, '127.0.0.1', r));
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist',
    '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-site-')), 'about:blank'], { stdio: 'ignore', detached: true });
  const tuer = () => { try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} };
  process.on('exit', tuer); for (const s of ['SIGINT', 'SIGTERM']) process.once(s, () => { tuer(); process.exit(130); });
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
  const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const A = new Map(), EXC = [], NAVS = [];
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') EXC.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    if (m.method === 'Page.frameRequestedNavigation' || m.method === 'Page.frameScheduledNavigation') NAVS.push(m.params.url);
  });
  const cdp = (me, pa) => new Promise((res, rej) => { const i = ++id; A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  const ev = async e => { const r = await cdp('Runtime.evaluate', { expression: '(async()=>{' + e + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(e.slice(0, 80) + ' : ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
  const rect = sel => ev(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2,w:b.width,h:b.height};`);
  /* un geste = ce qu'un doigt ou une souris font, pas un .click() */
  const toucher = async (P, sel) => { const r = await rect(sel); if (!r || !r.w) return false;
    if (P.tac) { await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await dormir(60); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); }
    await dormir(450); return true; };
  const touche = async k => { const codes = { Escape: 27, ArrowRight: 39, ArrowLeft: 37, Tab: 9 };
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: codes[k] }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: codes[k] }); await dormir(350); };

  for (const P of PROFILS) for (const mode of MODES) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: P.tac });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: P.tac, maxTouchPoints: P.tac ? 5 : 1 });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
    console.log('— ' + P.nom + ' · ' + (mode === 'light' ? 'jour' : 'nuit'));
    for (const pg of PAGES) {
      const lbl = P.nom + '/' + mode + '/' + pg;
      EXC.length = 0;
      await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/apercu/site/' + pg + '.html' }); await dormir(900);
      /* toutes les images : on descend jusqu'à chacune (chargement paresseux), puis on relit */
      /* ⚠️ un écran de carrousel pas encore montré (`.c-vue` en display:none) ne se charge pas, EXPRÈS (carrousel.css) :
         il est hors du compte — scratchpad/sonde-carrousel.js garde son chargement au bon moment */
      const img = await ev(`const vue=i=>{ const v=i.closest('.c-vue'); return !v||getComputedStyle(v).display!=='none'; };
        const L=[...document.images].filter(vue); for(const i of L){ i.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,60)); }
        await Promise.all(L.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,4000);}))); scrollTo(0,0);
        return {n:L.length, ok:L.filter(i=>i.complete&&i.naturalWidth>0).length, ko:L.filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.currentSrc||i.src), attente:document.images.length-L.length};`);
      vrai(lbl + ' : ' + img.ok + '/' + img.n + ' images chargées' + (img.attente ? ' (' + img.attente + ' écrans de carrousel en attente)' : ''), img.n > 0 && img.ok === img.n, img.ko.join(' '));
      /* la page bouge-t-elle de côté ? on le lui demande, en haut ET en bas */
      const cote = await ev(`const r=[]; for(const y of [0, document.documentElement.scrollHeight]){ scrollTo(9999,y); await new Promise(q=>requestAnimationFrame(()=>requestAnimationFrame(q))); r.push(scrollX); } scrollTo(0,0);
        let pire=null; for(const e of document.querySelectorAll('body *')){ const b=e.getBoundingClientRect(); if(b.width&&b.right>innerWidth+1&&getComputedStyle(e).position!=='fixed'){ let p=e.parentElement, cache=false; while(p){ const s=getComputedStyle(p); if(/hidden|clip|auto|scroll/.test(s.overflowX)){cache=true;break;} p=p.parentElement; } if(!cache){ pire=(e.className||e.tagName)+' '+Math.round(b.right-innerWidth)+' px'; break; } } }
        return {r, pire, large:document.documentElement.scrollWidth, fen:innerWidth};`);
      /* ⛔ contre la largeur POSÉE de l'appareil, pas contre innerWidth : sur un téléphone, une page trop large
         élargit sa fenêtre avec elle, et « la page ne bouge pas » passait au vert (règle du dépôt, et contre-épreuve M12) */
      vrai(lbl + ' : aucun défilement de côté', cote.r.every(x => x === 0) && cote.large <= P.w && cote.fen === P.w, JSON.stringify(cote));
      /* la nuit est bien la nuit (et le jour le jour) : le fond du document suit le système */
      const fond = await ev(`return getComputedStyle(document.body).backgroundColor;`);
      vrai(lbl + ' : fond ' + fond, mode === 'dark' ? fond === 'rgb(11, 20, 38)' : fond === 'rgb(255, 255, 255)');
      /* au doigt : ce qui se touche fait 44 px de haut au moins */
      if (P.tac) {
        const petites = await ev(`const S='.pilule,.burger,.bouton,.lien-suite,.segment button,.metier-puce,.besoin,.faq .q button,.tuile-f,.teaser,.pack>a,.formule .cta,.menu-mobile a,.pied .cols a,.pied .ligne a,.bandeau-creer,.app-carte>a,.commencer .boutons a,.c-point,.c-lecture';
          return [...document.querySelectorAll(S)].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden'; })
            .map(e=>{ const b=e.getBoundingClientRect(), a=getComputedStyle(e,'::after'); const ext=a.content&&a.content!=='none'&&a.position==='absolute'?Math.max(0,-parseFloat(a.top||0))+Math.max(0,-parseFloat(a.bottom||0)):0;
              return {t:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30), h:Math.round(b.height+ext)}; }).filter(x=>x.h<44);`);
        vrai(lbl + ' : cibles au doigt ≥ 44 px', petites.length === 0, petites.slice(0, 6).map(x => x.t + ' ' + x.h).join(' · '));
      }

      /* ── les gestes ── (une page qui plante se COMPTE comme un échec : elle n'arrête pas la sonde) */
      try {
      /* ── 29 septembre 2026, Justin : « Sur le site je veux pas le bouton jour nuit, je veux que ça soit automatique ».
         Plus de bouton ; un choix rangé par l'ancien bouton est EFFACÉ et ne force rien ; et la page suit l'appareil EN
         DIRECT (on bascule le mode de l'appareil sans recharger : fond et écrans d'appareil suivent). ── */
      if (pg === 'index') {
        const autre = mode === 'dark' ? 'light' : 'dark', FOND = { dark: 'rgb(11, 20, 38)', light: 'rgb(255, 255, 255)' };
        const lire = `const imgs=[...document.querySelectorAll('.ap-iphone img,.ap-mac img')].filter(i=>{ const v=i.closest('.c-vue'); return !v||getComputedStyle(v).display!=='none'; }); for(const i of imgs){ i.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,40)); }
          await Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,3000);}))); scrollTo(0,0);
          return {theme:document.documentElement.getAttribute('data-theme'), fond:getComputedStyle(document.body).backgroundColor, memo:localStorage.getItem('teamop_site_mode'),
            n:imgs.length, nuit:imgs.filter(i=>/-nuit(-1x)?\.webp$/.test(i.currentSrc)).length, jour:imgs.filter(i=>/-jour(-1x)?\.webp$/.test(i.currentSrc)).length,
            boutons:document.querySelectorAll('.mode,[class*="coin-mode"]').length};`;
        const a = await ev(lire);
        vrai(lbl + ' : aucun bouton jour / nuit, aucun mode forcé', a.boutons === 0 && a.theme === null, JSON.stringify(a));
        /* le choix qu'avait rangé l'ancien bouton (l'AUTRE mode) : il est effacé au chargement et ne force rien */
        await ev(`localStorage.setItem('teamop_site_mode', ${JSON.stringify(mode === 'dark' ? 'jour' : 'nuit')}); return 1;`);
        await cdp('Page.reload', {}); await dormir(1000);
        const b = await ev(lire);
        vrai(lbl + ' : un ancien choix « ' + (mode === 'dark' ? 'jour' : 'nuit') + ' » ne force plus rien, et il est effacé', b.memo === null && b.theme === null && b.fond === FOND[mode]
          && (mode === 'dark' ? b.nuit : b.jour) === b.n && b.n >= 3, JSON.stringify(b));
        /* l'appareil change de mode, la page suit sans recharger */
        await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: autre }] }); await dormir(400);
        const c = await ev(lire);
        vrai(lbl + ' : l\'appareil passe ' + (autre === 'dark' ? 'en nuit' : 'en jour') + ', la page suit en direct (fond et ' + c.n + ' écrans)', c.fond === FOND[autre] && (autre === 'dark' ? c.nuit : c.jour) === c.n, JSON.stringify(c));
        await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] }); await dormir(400);
        const d = await ev(lire);
        vrai(lbl + ' : et revient avec lui', d.fond === FOND[mode] && (mode === 'dark' ? d.nuit : d.jour) === d.n, JSON.stringify(d));
      }
      /* ── un mode est un mode (Justin, 27 septembre au soir : « pourquoi là c'est blanc ? » de nuit, puis « sur le même
         jour il y a du sombre, pourquoi ? ») : recensées depuis le DOM, jamais depuis une liste, toutes les grandes
         surfaces peintes (≥ 40 000 px², opaques) — de jour aucune n'est sombre, de nuit aucune n'est claire. Les
         appareils et leurs écrans (du matériel et des captures) sont hors du compte. ── */
      const contre = await ev(`const jour = ${mode === 'light'}; const L = []; let n = 0;
        const lum = c => { const m = (c || '').match(/[\\d.]+/g); if (!m || m.length < 3) return null; const a = m.length > 3 ? +m[3] : 1; if (a < .5) return null;
          const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(+m[0]) + .7152 * f(+m[1]) + .0722 * f(+m[2]); };
        for (const e of document.querySelectorAll('body *')) {
          if (e.closest('.ap-iphone,.ap-mac,picture,.fenetre,.menu-mobile,.fly,.ruban-apercu')) continue;
          const r = e.getBoundingClientRect(); if (r.width * r.height < 40000) continue;
          const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .5) continue;
          const l = lum(cs.backgroundColor); if (l === null) continue; n++;
          if (jour ? l < .25 : l > .45) L.push(String(e.className || e.tagName).slice(0, 36) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' lum ' + l.toFixed(2)); }
        return { n, L };`);
      vrai(lbl + ' : population — ' + contre.n + ' grandes surfaces peintes relues', contre.n >= 2);
      vrai(lbl + ' : ' + (mode === 'light' ? 'rien de sombre sur la page de jour' : 'rien de clair sur la page de nuit'), contre.L.length === 0, contre.L.slice(0, 5).join(' · '));
      /* ── v2 : chaque case de « Ce que fait OP GESTION » a son appareil, et il ne glisse pas dans sa case ──
         (la boucle des images, plus haut, vient d'appeler scrollIntoView sur chacune : en `overflow:hidden` la case
         défilait et l'iPhone perdait sa tête — c'est ce contrôle-ci qui le voit) */
      if (pg === 'elan') {
        /* depuis le 8 octobre 2026 (Justin : « qu'on le voie bien en entier »), l'appareil d'une case est ENTIER, posé en bas
           de sa case : ni défilé, ni coupé — haut, bas, gauche, droite (carrousel.css) */
        const vues = await ev(`return [...document.querySelectorAll('.tuile-f .vue')].map(v=>{ const i=v.querySelector('img'), V=v.getBoundingClientRect(), T=v.closest('.tuile-f').getBoundingClientRect();
          const ap=[...v.querySelectorAll('.ap-iphone-corps,.ap-mac')].map(e=>e.getBoundingClientRect());
          return {st:v.scrollTop, dedans:ap.every(b=>b.top>=V.top-1&&b.bottom<=V.bottom+1&&b.left>=V.left-1&&b.right<=V.right+1&&b.bottom<=T.bottom+1), img:!!(i&&i.complete&&i.naturalWidth>0)}; });`);
        vrai(lbl + ' : les dix cases ont leur appareil, image chargée', vues.length === 10 && vues.every(x => x.img), JSON.stringify(vues));
        vrai(lbl + ' : chaque appareil est entier dans sa case (ni défilé, ni coupé)', vues.every(x => x.st === 0 && x.dedans), JSON.stringify(vues.filter(x => x.st || !x.dedans)));
      }
      /* ── 27 septembre au soir, les photos de Justin : la carte mise en avant était BLANCHE de nuit (et sombre le jour), et
         une bande vide restait sous le Mac. La carte suit le mode, teintée et éclairée d'un halo. Depuis le 8 octobre 2026
         (« qu'on le voie bien en entier »), une case à Mac montre le Mac ENTIER, 30 px au-dessus du bas de la case, partout. */
      if (pg === 'elan' || pg === 'opmessages') {
        const inv = await ev(`const t=document.querySelector('.tuile-f.inv'); if(!t) return null; const c=getComputedStyle(t), m=c.backgroundColor.match(/[\\d.]+/g).map(Number);
          const f=x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)}; return {fond:c.backgroundColor, lum:+(.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])).toFixed(3), halo:c.backgroundImage.slice(0,40), page:getComputedStyle(document.body).backgroundColor};`);
        vrai(lbl + ' : ⛔ la carte mise en avant suit le mode (' + (mode === 'dark' ? 'sombre la nuit' : 'claire le jour') + ')', inv && (mode === 'dark' ? inv.lum < .06 : inv.lum > .6), JSON.stringify(inv));
        if (inv) vrai(lbl + ' : et se détache de la page (teinte + halo)', inv.fond !== inv.page && /radial-gradient/.test(inv.halo), JSON.stringify(inv));
      }
      /* depuis le 9 octobre 2026 (Justin : « que l'iPhone et le Mac soient sur les mêmes »), chaque case montre le Mac ET l'iPhone,
         l'iPhone posé devant ; la photo ne dit pas lequel passe devant : on touche leur chevauchement */
      if (pg === 'elan') {
        const paires = await ev(`return [...document.querySelectorAll('.tuile-f .vue')].map(v=>{ const m=v.querySelector('.ap-mac'), i=v.querySelector('.ap-iphone'); if(!m||!i) return {duo:false};
          v.scrollIntoView({block:'center'}); const a=i.querySelector('.ap-iphone-ecran').getBoundingClientRect(), b=m.querySelector('.ap-mac-ecran').getBoundingClientRect();
          const x0=Math.max(a.left,b.left), x1=Math.min(a.right,b.right), y0=Math.max(a.top,b.top), y1=Math.min(a.bottom,b.bottom);
          /* une grande case pose l'iPhone À CÔTÉ du Mac (ils se touchent à peine) : rien à départager */
          if(x1-x0<6||y1-y0<6) return {duo:true, devant:true, cote:true};
          v.style.pointerEvents='auto'; const e=document.elementFromPoint((x0+x1)/2,(y0+y1)/2); v.style.pointerEvents='';
          return {duo:true, devant:!!(e&&e.closest('.ap-iphone'))}; });`);
        vrai(lbl + ' : les dix cases montrent le Mac ET l\'iPhone', paires.length === 10 && paires.every(x => x.duo), JSON.stringify(paires));
        vrai(lbl + ' : population — ' + paires.filter(x => !x.cote).length + ' cases où l\'iPhone chevauche le Mac', paires.filter(x => !x.cote).length >= 6, JSON.stringify(paires));
        vrai(lbl + ' : dans chaque case, l\'iPhone passe devant le Mac', paires.every(x => x.devant), JSON.stringify(paires.filter(x => !x.devant)));
      }
      if (!P.tac && pg === 'index') {
        const r = await rect('.nav-liens a[data-fly="applications"]');
        await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await dormir(500);
        const o = await ev(`const f=document.getElementById('fly-applications'); return {ouvert:f.classList.contains('ouvert'), op:getComputedStyle(f).opacity, liens:f.querySelectorAll('a').length};`);
        /* le nombre de liens se LIT dans le générateur (VOLETS) : écrit « 4 » à la main, ce contrôle tombait depuis que le volet
           porte les pages par fonction (29 septembre 2026) — un chiffre figé garde une croyance, pas un accord */
        const nVolet = GEN.VOLETS.applications.grands.length + GEN.VOLETS.applications.petits.length;
        vrai(lbl + ' : le volet « Applications » s\'ouvre au survol (' + nVolet + ' liens)', o.ouvert && o.op === '1' && o.liens === nVolet, JSON.stringify(o));
        await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: P.w / 2, y: 600 }); await dormir(700);
        vrai(lbl + ' : et se referme quand la souris part', await ev(`return !document.querySelector('.fly.ouvert');`));
      }
      if (P.nom === 'téléphone' && pg === 'index') {
        vrai(lbl + ' : les liens du bureau sont cachés', await ev(`return getComputedStyle(document.querySelector('.nav-liens')).display==='none';`));
        await toucher(P, '.burger');
        const m = await ev(`const m=document.querySelector('.menu-mobile'); return {vis:getComputedStyle(m).display, liens:m.querySelectorAll('a').length, exp:document.querySelector('.burger').getAttribute('aria-expanded'), bloque:document.documentElement.style.overflow};`);
        vrai(lbl + ' : le menu du téléphone s\'ouvre (' + m.liens + ' liens)', m.vis === 'block' && m.liens >= 15 && m.exp === 'true' && m.bloque === 'hidden', JSON.stringify(m));
        await toucher(P, '.burger');
        vrai(lbl + ' : et se referme', await ev(`return getComputedStyle(document.querySelector('.menu-mobile')).display==='none' && document.documentElement.style.overflow==='';`));
      }
      if (pg === 'elan' || pg === 'opmessages') {
        const donnees = await ev(`return JSON.parse(document.getElementById('fonctions-donnees').textContent).liste.map(f=>({t:f.titre,n:f.points.length}));`);
        await toucher(P, '.tuile-f[data-i="0"]');
        const f = await ev(`const f=document.querySelector('.fenetre'); return {ouverte:f.classList.contains('ouverte'), titre:f.querySelector('h2').textContent, li:f.querySelectorAll('li').length, focus:document.activeElement.className};`);
        vrai(lbl + ' : la fenêtre de « ' + donnees[0].t + ' » s\'ouvre, ' + donnees[0].n + ' points', f.ouverte && f.titre === donnees[0].t && f.li === donnees[0].n && f.focus === 'fermer', JSON.stringify(f));
        await touche('ArrowRight');
        vrai(lbl + ' : → passe à « ' + donnees[1].t + ' »', (await ev(`return document.querySelector('.fenetre h2').textContent;`)) === donnees[1].t);
        await touche('ArrowLeft'); await touche('ArrowLeft');
        vrai(lbl + ' : ← ← revient en boucle à la dernière', (await ev(`return document.querySelector('.fenetre h2').textContent;`)) === donnees[donnees.length - 1].t);
        await touche('Escape');
        const g = await ev(`return {ferme:!document.querySelector('.fenetre').classList.contains('ouverte'), focus:document.activeElement.getAttribute('data-i'), bloque:document.documentElement.style.overflow};`);
        vrai(lbl + ' : Échap referme et rend le focus à la tuile', g.ferme && g.focus === '0' && g.bloque === '', JSON.stringify(g));
        await toucher(P, '.tuile-f[data-i="1"]'); await toucher(P, '.fenetre .suiv');
        vrai(lbl + ' : le bouton « suivant » avance', (await ev(`return document.querySelector('.fenetre h2').textContent;`)) === donnees[2 % donnees.length].t);
        await toucher(P, '.fenetre .fermer');
        vrai(lbl + ' : le bouton de fermeture ferme', await ev(`return !document.querySelector('.fenetre').classList.contains('ouverte');`));
      }
      if (pg === 'tarifs') {
        await toucher(P, '#onglet-msg');
        const t = await ev(`return {msg:document.getElementById('formules-msg').offsetHeight, ges:document.getElementById('formules-gestion').offsetHeight, sel:document.getElementById('onglet-msg').getAttribute('aria-selected')};`);
        vrai(lbl + ' : l\'onglet OP MESSAGES montre ses formules et cache les autres', t.msg > 100 && t.ges === 0 && t.sel === 'true', JSON.stringify(t));
        await toucher(P, '#onglet-gestion');
        vrai(lbl + ' : et OP GESTION revient', await ev(`return document.getElementById('formules-gestion').offsetHeight>100 && document.getElementById('formules-msg').offsetHeight===0;`));
        await toucher(P, '.faq .q button');
        await dormir(400);
        const q = await ev(`const b=document.querySelector('.faq .q button'); return {exp:b.getAttribute('aria-expanded'), h:b.parentElement.querySelector('.r').getBoundingClientRect().height};`);
        vrai(lbl + ' : une question s\'ouvre', q.exp === 'true' && q.h > 30, JSON.stringify(q));
        /* v2 : la formule touchée devient la bleue — dans SON groupe, et le toucher ne quitte pas la page */
        await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/apercu/site/tarifs.html' }); await dormir(900);
        const bleues = g => ev(`await new Promise(r=>setTimeout(r,400)); const L=getComputedStyle(document.documentElement).getPropertyValue('--link').trim();
          const x=document.createElement('i'); x.style.color=L; document.body.appendChild(x); const lien=getComputedStyle(x).color; x.remove();
          const ph=[...document.querySelectorAll('${g} .formule.phare')]; return {noms:ph.map(f=>f.querySelector('.n b').textContent), cta:ph.map(f=>getComputedStyle(f.querySelector('.cta')).backgroundColor), lien, url:location.pathname};`);
        const d0 = await bleues('#formules-gestion');
        vrai(lbl + ' : au départ, la bleue est la recommandée (Business)', d0.noms.join() === 'Business' && d0.cta[0] === d0.lien, JSON.stringify(d0));
        /* « Pro » se trouve par son RANG dans les formules du générateur : depuis le retrait de Gratuit (29 septembre 2026), la
           deuxième carte est Business — le contrôle touchait la recommandée et attendait qu'elle devienne « Pro » */
        await toucher(P, '#formules-gestion .formule:nth-child(' + (GEN.FORMULES_GESTION.findIndex(f => f.cle === 'pro') + 1) + ') .d');
        const d1 = await bleues('#formules-gestion');
        vrai(lbl + ' : toucher « Pro » la rend bleue — elle seule, bouton compris, sans quitter la page', d1.noms.join() === 'Pro' && d1.cta[0] === d1.lien && /tarifs\.html$/.test(d1.url), JSON.stringify(d1));
        await toucher(P, '#onglet-msg');
        await toucher(P, '#formules-msg .formule:nth-child(1) .d');
        const d2 = await bleues('#formules-msg'), d3 = await bleues('#formules-gestion');
        vrai(lbl + ' : OP MESSAGES aussi (« Perso » devient la bleue, bouton compris)', d2.noms.join() === 'Perso' && d2.cta[0] === d2.lien, JSON.stringify(d2));
        vrai(lbl + ' : et OP GESTION garde la sienne (Pro)', d3.noms.join() === 'Pro', JSON.stringify(d3));
        await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/apercu/site/tarifs.html#opmessages' }); await dormir(900);
        vrai(lbl + ' : l\'ancre #opmessages ouvre sur OP MESSAGES', await ev(`return document.getElementById('onglet-msg').getAttribute('aria-selected')==='true' && document.getElementById('formules-msg').offsetHeight>100;`));
      }
      if (pg === 'creer') {
        await toucher(P, '.metier-puce[data-pack="plomberie"]'); await toucher(P, '.metier-puce[data-pack="3d"]');
        const m = await ev(`return [...document.querySelectorAll('.metier-puce[aria-pressed="true"]')].map(x=>x.getAttribute('data-pack'));`);
        vrai(lbl + ' : un seul métier à la fois (le dernier touché)', JSON.stringify(m) === '["3d"]', JSON.stringify(m));
        await toucher(P, '.besoin'); await toucher(P, '.besoin:nth-child(3)');
        await ev(`document.querySelector('input[type=email]').value='marie@exemple.fr'; document.querySelector('input[name=c4]').value='Entreprise Exemple'; return 1;`);
        NAVS.length = 0;
        await toucher(P, '.envoi .bouton'); await dormir(300);
        const avis = await ev(`const a=document.querySelector('.avis-envoi'); return {vu:!a.hidden&&a.offsetHeight>0, t:a.textContent.slice(0,60)};`);
        vrai(lbl + ' : l\'écran dit que la messagerie s\'ouvre (et pas « envoyée »)', avis.vu && !/envoy[ée]e\b/i.test(avis.t), JSON.stringify(avis));
        const mail = NAVS.find(u => /^mailto:/.test(u)) || '';
        if (mail) {
          const corps = decodeURIComponent((mail.split('body=')[1] || '').replace(/\+/g, ' '));
          vrai(lbl + ' : le courriel part vers contact@teamop.fr', mail.startsWith('mailto:contact@teamop.fr?subject='));
          vrai(lbl + ' : le métier en tête, puis les champs et les besoins', /^MÉTIER CHOISI : 3D — Anti-nuisibles  \[pack 3d\]\nPack : prêt/.test(corps) && /E-mail : marie@exemple\.fr/.test(corps) && /Besoins cochés : /.test(corps), corps.slice(0, 200));
        } else vrai(lbl + ' : la navigation mailto est observée', false, 'aucune navigation vue : ' + JSON.stringify(NAVS));
      }
      } catch (e) { vrai(lbl + ' : les gestes se jouent jusqu\'au bout', false, e.message.slice(0, 160)); }
      vrai(lbl + ' : aucune exception JavaScript', EXC.length === 0, EXC.slice(0, 3).join(' | '));
    }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  ws.close(); tuer(); srv.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ la sonde est morte :', e.message); process.exit(2); });
