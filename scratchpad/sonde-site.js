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
      const img = await ev(`const L=[...document.images]; for(const i of L){ i.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,60)); }
        await Promise.all(L.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,4000);}))); scrollTo(0,0);
        return {n:L.length, ok:L.filter(i=>i.complete&&i.naturalWidth>0).length, ko:L.filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.currentSrc||i.src)};`);
      vrai(lbl + ' : ' + img.ok + '/' + img.n + ' images chargées', img.n > 0 && img.ok === img.n, img.ko.join(' '));
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
        const petites = await ev(`const S='.mode,.pilule,.burger,.bouton,.lien-suite,.segment button,.metier-puce,.besoin,.faq .q button,.tuile-f,.teaser,.pack>a,.formule .cta,.menu-mobile a,.pied .cols a,.pied .ligne a,.bandeau-creer,.app-carte>a,.commencer .boutons a';
          return [...document.querySelectorAll(S)].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden'; })
            .map(e=>{ const b=e.getBoundingClientRect(), a=getComputedStyle(e,'::after'); const ext=a.content&&a.content!=='none'&&a.position==='absolute'?Math.max(0,-parseFloat(a.top||0))+Math.max(0,-parseFloat(a.bottom||0)):0;
              return {t:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,30), h:Math.round(b.height+ext)}; }).filter(x=>x.h<44);`);
        vrai(lbl + ' : cibles au doigt ≥ 44 px', petites.length === 0, petites.slice(0, 6).map(x => x.t + ' ' + x.h).join(' · '));
      }

      /* ── les gestes ── (une page qui plante se COMPTE comme un échec : elle n'arrête pas la sonde) */
      try {
      /* ── v2, 27 septembre au soir : le bouton jour / nuit (Justin : « je veux vraiment un mode jour et un mode nuit ») ──
         Toucher force l'autre mode, les ÉCRANS DES APPAREILS suivent (leurs <source> suivent l'appareil sinon), le choix
         survit au rechargement ; toucher encore revient au mode de l'appareil et efface le choix. */
      if (pg === 'index') {
        const nuitVoulue = mode === 'light', FOND = { dark: 'rgb(11, 20, 38)', light: 'rgb(255, 255, 255)' };
        const lire = `const imgs=[...document.querySelectorAll('.ap-iphone img,.ap-mac img')]; for(const i of imgs){ i.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,40)); }
          await Promise.all(imgs.map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r; setTimeout(r,3000);}))); scrollTo(0,0);
          return {theme:document.documentElement.getAttribute('data-theme'), fond:getComputedStyle(document.body).backgroundColor, memo:localStorage.getItem('teamop_site_mode'),
            n:imgs.length, nuit:imgs.filter(i=>/-nuit(-1x)?\.webp$/.test(i.currentSrc)).length, jour:imgs.filter(i=>/-jour(-1x)?\.webp$/.test(i.currentSrc)).length,
            dit:document.querySelector('.mode').getAttribute('aria-label'), vu:!document.querySelector('.mode').hidden};`;
        await toucher(P, '.mode'); await dormir(300);
        const a = await ev(lire);
        vrai(lbl + ' : ☀︎/☾ passe ' + (nuitVoulue ? 'en nuit' : 'en jour') + ' (fond, mémoire, libellé)', a.vu && a.theme === (nuitVoulue ? 'dark' : 'light') && a.fond === FOND[nuitVoulue ? 'dark' : 'light']
          && a.memo === (nuitVoulue ? 'nuit' : 'jour') && a.dit === (nuitVoulue ? 'Passer en mode jour' : 'Passer en mode nuit'), JSON.stringify(a));
        vrai(lbl + ' : et les ' + a.n + ' écrans d\'appareil passent ' + (nuitVoulue ? 'de nuit' : 'de jour'), a.n >= 3 && (nuitVoulue ? a.nuit : a.jour) === a.n, JSON.stringify(a));
        await cdp('Page.reload', {}); await dormir(1000);
        const b = await ev(lire);
        vrai(lbl + ' : le choix survit au rechargement (posé avant le premier rendu)', b.theme === a.theme && b.fond === a.fond && (nuitVoulue ? b.nuit : b.jour) === b.n, JSON.stringify(b));
        await toucher(P, '.mode'); await dormir(300);
        const c = await ev(lire);
        vrai(lbl + ' : toucher encore revient au mode de l\'appareil, et oublie le choix', c.theme === null && c.memo === null && c.fond === FOND[mode] && (mode === 'dark' ? c.nuit : c.jour) === c.n, JSON.stringify(c));
      }
      /* ── v2 : chaque case de « Ce que fait OP GESTION » a son appareil, et il ne glisse pas dans sa case ──
         (la boucle des images, plus haut, vient d'appeler scrollIntoView sur chacune : en `overflow:hidden` la case
         défilait et l'iPhone perdait sa tête — c'est ce contrôle-ci qui le voit) */
      if (pg === 'elan') {
        const vues = await ev(`return [...document.querySelectorAll('.tuile-f .vue')].map(v=>{ const a=v.querySelector('.ap-iphone,.ap-mac'), i=v.querySelector('img');
          return {st:v.scrollTop, d:Math.round(a.getBoundingClientRect().top - v.getBoundingClientRect().top), img:!!(i&&i.complete&&i.naturalWidth>0)}; });`);
        vrai(lbl + ' : les dix cases ont leur appareil, image chargée', vues.length === 10 && vues.every(x => x.img), JSON.stringify(vues));
        vrai(lbl + ' : aucun appareil n\'a glissé dans sa case (défilement 0, posé en haut)', vues.every(x => x.st === 0 && x.d >= 0 && x.d <= 20), JSON.stringify(vues.filter(x => x.st || x.d < 0 || x.d > 20)));
      }
      if (!P.tac && pg === 'index') {
        const r = await rect('.nav-liens a[data-fly="applications"]');
        await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await dormir(500);
        const o = await ev(`const f=document.getElementById('fly-applications'); return {ouvert:f.classList.contains('ouvert'), op:getComputedStyle(f).opacity, liens:f.querySelectorAll('a').length};`);
        vrai(lbl + ' : le volet « Applications » s\'ouvre au survol', o.ouvert && o.op === '1' && o.liens === 4, JSON.stringify(o));
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
        await toucher(P, '#formules-gestion .formule:nth-child(2) .d');
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
          vrai(lbl + ' : le courriel part vers support@teamop.fr', mail.startsWith('mailto:support@teamop.fr?subject='));
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
