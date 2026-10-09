/* Sonde des CARROUSELS d'écrans du site (aperçu, apercu/site/) — Justin, 8 octobre 2026 : « des défilements d'images avec
   l'iPhone, et qu'on le voie bien en entier, et aussi un Mac pour montrer que ça marche bien sur les deux ».
   Puis le 9 octobre, deux essais refusés, et sa règle : « une fois qu'on voit le Mac, ça change de page, on voit le téléphone, et
   c'est tout, et ça ne fait que ça ». Chaque carrousel et chaque case : UNE paire — le Mac, puis le téléphone du même écran —, sans
   légende, sans pastille, sans bouton.
   Chaque geste est JOUÉ dans un vrai Chromium (127.0.0.1 seulement, rien ne sort d'ici) :
   · partout (4 profils × jour / nuit × les pages à carrousel) : aucune exception ; chaque carrousel branché, DEUX écrans — le Mac
     puis le téléphone —, et rien à voir ni à toucher que les appareils (l'horloge est invisible) ; au repos, UN SEUL appareil se
     voit, dans chaque carrousel et chaque case ; CHAQUE écran (montré tour à tour) porte son appareil ENTIER, dans sa scène ;
     pendant la glissade, l'appareil qui part et celui qui arrive ne se chevauchent JAMAIS, rien ne se voit hors de la scène et la
     page ne déborde pas ; la page ne bouge pas de côté ; l'écran pas encore montré NE SE CHARGE PAS avant qu'on voie le carrousel,
     il se prépare quand on le voit ; l'écran affiché suit le mode (jour / nuit) ; chaque case passe d'elle-même du Mac au
     téléphone, en vague ; une page métier hors 3D ne montre que des écrans neutres ;
   · les gestes (bureau et téléphone) : il passe seul du Mac au téléphone, puis revient au Mac ; la souris posée dessus le fait
     attendre ; hors de l'écran il attend ; au doigt, glisser à gauche / à droite change d'appareil et un geste vertical non ;
     « animations réduites » : rien ne bouge seul, et au doigt l'appareil change SANS glisser.
   Usage : node scratchpad/sonde-carrousel.js      PAGES=index,elan PROFILS=bureau MODES=light node scratchpad/sonde-carrousel.js */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), os = require('os');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0; const echecs = [];
const vrai = (t, c, d) => { if (c) ok++; else { ko++; echecs.push(t + (d ? ' — ' + d : '')); console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };

const PROFILS_TOUS = [
  { nom: 'bureau', w: 1440, h: 900, tac: false, dpr: 1 },
  { nom: 'tablette', w: 820, h: 1180, tac: true, dpr: 2 },
  { nom: 'téléphone', w: 390, h: 844, tac: true, dpr: 3 },
  { nom: 'petit', w: 360, h: 740, tac: true, dpr: 2 },
];
const PROFILS = process.env.PROFILS ? PROFILS_TOUS.filter(p => process.env.PROFILS.split(',').includes(p.nom)) : PROFILS_TOUS;
const NEUTRES = ['logiciel-plombier', 'logiciel-electricien', 'logiciel-chauffage-climatisation', 'logiciel-nettoyage'];
const PAGES = (process.env.PAGES || ['index', 'applications', 'elan', 'logiciel-anti-nuisibles', 'logiciel-planning-interventions', 'logiciel-gestion-de-stock',
  'logiciel-devis-factures', 'logiciel-bons-de-commande', 'logiciel-pointage', 'logiciel-registre-sanitaire', ...NEUTRES].join(',')).split(',');
const MODES = (process.env.MODES || 'light,dark').split(',');
/* les gestes : sur ces pages et ces profils (le reste est couvert par les contrôles de chaque page) */
const GESTES = (process.env.GESTES || 'index,applications,logiciel-plombier').split(',');

(async () => {
  const pp = await libre(), pc = await libre();
  const T = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
    const x = path.join(RACINE, u); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(x)] || 'text/html;charset=utf-8' }); r.end(d); });
  });
  await new Promise(r => srv.listen(pp, '127.0.0.1', r));
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--remote-debugging-port=' + pc, '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-carrousel-')), 'about:blank'], { stdio: 'ignore', detached: true });
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
  /* ⛔ AMENER UN ÉLÉMENT AU MILIEU EN FAISANT DÉFILER LA FENÊTRE, JAMAIS PAR scrollIntoView : celui-ci fait défiler AUSSI un
     conteneur en `overflow: hidden` (il reste défilable par programme), ramène dans le champ l'appareil que ce conteneur coupait, et
     la mesure « entier » passait sur un iPhone coupé (mutation M9, 9 octobre 2026 — le piège que site.css décrit déjà). */
  const VOIR = `const voir=x=>{ const r=x.getBoundingClientRect(); scrollTo(scrollX, scrollY + r.top + r.height/2 - innerHeight/2); };`;
  const ev = async e => { const r = await cdp('Runtime.evaluate', { expression: '(async()=>{' + VOIR + e + '})()', awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(e.slice(0, 80) + ' : ' + ((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text)); return r.result.value; };
  const deuxImages = `await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));`;
  /* l'état d'un carrousel, lu dans le DOM : l'écran courant (la pastille), et ce que montre CHAQUE piste */
  const ETAT = `const etat=k=>{ const c=document.querySelectorAll('.carrousel')[k]; const pts=[...c.querySelectorAll('.c-point')];
      const pistes=[...c.querySelectorAll('.c-piste')].map(p=>[...p.children].map((v,j)=>v.classList.contains('c-on')?j:-1).filter(j=>j>=0));
      return { i:pts.findIndex(p=>p.getAttribute('aria-current')==='true'), n:pts.length, pistes, sort:c.querySelectorAll('.c-sort').length,
        pause:c.classList.contains('c-pause'), arrete:c.classList.contains('c-arrete'), pret:c.classList.contains('c-pret'),
        sens:c.classList.contains('c-avant')?'avant':c.classList.contains('c-arriere')?'arriere':'',
        cachees:[...c.querySelectorAll('.c-vue')].filter(v=>!v.classList.contains('c-on')).every(v=>v.getAttribute('aria-hidden')==='true'),
        app:(()=>{ const v=c.querySelector('.c-vue.c-on'); return !v?'':v.querySelector('.ap-iphone')&&!v.querySelector('.ap-mac')?'iphone':v.querySelector('.ap-mac')&&!v.querySelector('.ap-iphone')?'mac':'?'; })() }; };
    /* faire avancer un carrousel comme il le fait lui-même : la fin de l'animation de sa pastille active (invisible) */
    const avance=c=>{ const p=c.querySelector('.c-point[aria-current="true"] i'); if(p) p.dispatchEvent(new AnimationEvent('animationend',{animationName:'c-progres',bubbles:true})); };`;
  const etat = k => ev(ETAT + ` return etat(${k});`);
  const centre = (sel, k) => ev(`const e=document.querySelectorAll(${JSON.stringify(sel)})[${k || 0}]; if(!e) return null; voir(e); ${deuxImages}
    const b=e.getBoundingClientRect(); return {x:b.left+b.width/2, y:b.top+b.height/2, w:b.width, h:b.height};`);
  const toucher = async (P, x, y) => {
    if (P.tac) { await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await dormir(50); await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); }
  };
  /* un glissement au doigt : des pas de 25 px (ce Chromium ne transmet rien sous ~15 px — règle du dépôt) */
  const glisser = async (x, y, dx, dy) => {
    await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    const pas = 6; for (let s = 1; s <= pas; s++) { await cdp('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * s / pas, y: y + dy * s / pas }] }); await dormir(30); }
    await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const attendre = async (k, cond, ms) => { const t = Date.now(); let e; while (Date.now() - t < ms) { e = await etat(k); if (cond(e)) return e; await dormir(80); } return e; };
  const coherent = e => e.pistes.length === 1 && e.pistes.every(p => p.length === 1 && p[0] === e.i);

  for (const P of PROFILS) for (const mode of MODES) {
    console.log('— ' + P.nom + ' · ' + (mode === 'light' ? 'jour' : 'nuit'));
    for (const pg of PAGES) {
      const lbl = P.nom + '/' + mode + '/' + pg;
      await cdp('Emulation.setDeviceMetricsOverride', { width: P.w, height: P.h, deviceScaleFactor: P.dpr, mobile: P.tac });
      await cdp('Emulation.setTouchEmulationEnabled', { enabled: P.tac, maxTouchPoints: P.tac ? 5 : 1 });
      await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
      EXC.length = 0;
      try {
        await cdp('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/apercu/site/' + pg + '.html' }); await dormir(900);
        await ev(`const r=document.querySelector('.ruban-apercu'); if(r) r.remove(); return 1;`);
        /* AVANT de faire défiler : les écrans pas encore montrés ne sont ni affichés ni chargés */
        /* (une capture déjà AFFICHÉE ailleurs dans la page — la même dans le grand carrousel et dans une carte — arrive du cache
           dans l'écran caché, sans requête : elle n'est pas un chargement en avance, on la reconnaît à son adresse) */
        const avant = await ev(`const vue=i=>{ const v=i.closest('.c-vue'); return !v||getComputedStyle(v).display!=='none'; };
          const montree=new Set([...document.images].filter(i=>vue(i)&&i.currentSrc).map(i=>i.currentSrc));
          return [...document.querySelectorAll('.c-vue:not(.c-on)')].map(v=>{ const i=v.querySelector('img')||{};
            return { aff:getComputedStyle(v).display, w:(i.naturalWidth||0)&&!montree.has(i.currentSrc)?i.naturalWidth:0, src:(i.currentSrc||'').split('/').pop() }; });`);
        const nC = await ev(`return document.querySelectorAll('.carrousel').length;`), nP = await ev(`return document.querySelectorAll('.c-piste').length;`);
        vrai(lbl + ' : population — ' + nC + ' carrousel(s), ' + avant.length + ' écrans en attente', nC >= 1 && avant.length >= nC);
        /* (au chargement, un carrousel déjà à l'écran peut avoir préparé son suivant — dans CHACUN de ses appareils : le Mac + iPhone
           en prépare deux ; on tolère donc un écran préparé par piste, pas par carrousel) */
        const nonCharges = avant.filter(x => x.aff === 'none' && x.w === 0).length;
        vrai(lbl + ' : les écrans pas encore montrés ne se chargent pas (' + nonCharges + '/' + avant.length + ' en attente, non chargés)', nonCharges >= avant.length - nP, JSON.stringify(avant.filter(x => x.w > 0 || x.aff !== 'none').map(x => x.aff + ' ' + (x.w ? 'chargé ' : '') + x.src)));
        /* chaque carrousel branché, puis vu : son écran suivant se prépare (chargé), les autres attendent toujours */
        /* ⚠️ un écran caché dont l'image est AUSSI celle d'un écran affiché ailleurs dans la page (la même capture dans le
           grand carrousel et dans une carte) la reçoit du cache sans requête : ce n'est pas un chargement en avance */
        const branche = await ev(ETAT + `const L=[]; const cs=[...document.querySelectorAll('.carrousel')];
          const montree=()=>new Set([...document.images].filter(i=>{ const v=i.closest('.c-vue'); return (!v||getComputedStyle(v).display!=='none')&&i.currentSrc; }).map(i=>i.currentSrc));
          for(let k=0;k<cs.length;k++){ const c=cs[k]; voir(c); await new Promise(r=>setTimeout(r,1500));
            const vs=[...c.querySelectorAll('.c-piste')].map(p=>[...p.children]); const e=etat(k);
            const im=v=>v.querySelector('img'); const charge=v=>{ const i=im(v); return !!(i&&i.complete&&i.naturalWidth>0); };
            L.push({ genre:c.className.replace('carrousel','').trim(), n:e.n, longueurs:vs.map(x=>x.length), pret:e.pret,
              ordre:vs[0].map(v=>v.querySelector('.ap-mac')&&!v.querySelector('.ap-iphone')?'mac':v.querySelector('.ap-iphone')&&!v.querySelector('.ap-mac')?'iphone':'?').join('+'),
              courant:vs.every(x=>charge(x[e.i])), suivant:vs.every(x=>charge(x[(e.i+1)%x.length])),
              mode:vs.map(x=>(im(x[e.i]).currentSrc||'').split('/').pop()), cachees:e.cachees, coherent:(${coherent.toString()})(e),
              /* rien à voir ni à toucher que les appareils : aucun bouton, aucun texte ; l'horloge, invisible */
              touches:c.querySelectorAll('button,a,[tabindex],input').length, texte:[...c.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).length+[...c.querySelectorAll('p,figcaption,.c-legende')].length,
              horloge:(()=>{ const h=c.querySelector('.c-horloge'); if(!h) return 'absente'; const r=h.getBoundingClientRect(), st=getComputedStyle(h); return st.display==='none'?'display:none':(+st.opacity===0&&r.width<=1&&r.height<=1)?'invisible':'visible'; })() }); }
          return L;`);
        for (const [k, b] of branche.entries()) {
          const t = lbl + ' · carrousel ' + (k + 1) + ' (' + b.genre + ')';
          vrai(t + ' : branché — DEUX écrans, le Mac puis le téléphone (' + b.ordre + ')', b.pret && b.n === 2 && b.longueurs.length === 1 && b.longueurs[0] === 2 && b.ordre === 'mac+iphone' && b.genre.includes('c-paire'), JSON.stringify(b));
          vrai(t + ' : ⛔ rien à voir ni à toucher que les appareils (ni bouton, ni texte ; horloge ' + b.horloge + ')', b.touches === 0 && b.texte === 0 && b.horloge === 'invisible', JSON.stringify(b));
          /* (deux écrans : l'autre se prépare quand on voit le carrousel — il n'y a pas d'« autres » qui attendraient) */
          vrai(t + ' : l\'écran montré et l\'autre sont chargés, une fois le carrousel vu', b.courant && b.suivant, JSON.stringify(b));
          vrai(t + ' : l\'écran suit le mode (' + (mode === 'dark' ? 'nuit' : 'jour') + ')', b.mode.every(s => (mode === 'dark' ? /-nuit(-1x)?\.webp$/ : /-jour(-1x)?\.webp$/).test(s)), b.mode.join(' '));
          vrai(t + ' : un seul écran affiché, l\'autre caché aux lecteurs d\'écran', b.coherent && b.cachees, JSON.stringify(b));
        }
        /* ⛔ UN SEUL APPAREIL À LA FOIS (Justin, 9 octobre 2026 : « une fois le téléphone, une fois le Mac ») : au repos, dans chaque
           carrousel et chaque case, UN écran se voit, et il porte UN appareil — l'écran sorti, s'il reste un instant, est hors de la
           scène. Recensés depuis le DOM (`[data-carrousel]`) : carrousels ET cases. */
        const seul = await ev(`const L=[]; for(const c of document.querySelectorAll('[data-carrousel]')){ const sc=c.querySelector('.c-scene').getBoundingClientRect();
            const vus=[...c.querySelectorAll('.c-vue')].filter(v=>{ const s=getComputedStyle(v), r=v.getBoundingClientRect();
              return s.display!=='none'&&+s.opacity>.01&&Math.min(r.right,sc.right)-Math.max(r.left,sc.left)>1&&Math.min(r.bottom,sc.bottom)-Math.max(r.top,sc.top)>1; });
            L.push({quoi:c.className, vus:vus.length, appareils:vus.map(v=>v.querySelectorAll('.ap-iphone,.ap-mac').length).join('+')}); }
          return L;`);
        vrai(lbl + ' : population — ' + seul.length + ' carrousels et cases', seul.length >= 1);
        vrai(lbl + ' : ⛔ au repos, UN seul appareil se voit, partout', seul.every(x => x.vus === 1 && x.appareils === '1'), JSON.stringify(seul.filter(x => !(x.vus === 1 && x.appareils === '1')).slice(0, 4)));
        /* ⛔ L'APPAREIL EN ENTIER, À CHAQUE ÉCRAN : chaque écran est montré tour à tour (les autres masqués, l'horloge figée), et son
           appareil ne doit être coupé par aucun ancêtre ni sortir de la largeur posée (iPhone : le corps ; Mac : tout, socle compris) */
        const entiers = await ev(`const deux=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const cs=[...document.querySelectorAll('[data-carrousel]')]; cs.forEach(c=>c.style.setProperty('--c-duree','9999s')); await new Promise(r=>setTimeout(r,1500));
          const mesurer=(a,ou)=>{ const el=a.classList.contains('ap-iphone')?a.querySelector('.ap-iphone-corps'):a; const b=el.getBoundingClientRect(); let coupe=null;
            if(b.width<20) coupe='invisible ('+Math.round(b.width)+' px)';
            if(!coupe&&(b.left<-1||b.right>${P.w}+1)) coupe='hors largeur '+Math.round(b.left)+'→'+Math.round(b.right);
            for(let p=a.parentElement;p&&!coupe&&p!==document.body;p=p.parentElement){ const s=getComputedStyle(p); if(!/hidden|clip|auto|scroll/.test(s.overflow+s.overflowX+s.overflowY)) continue;
              if(p.scrollTop||p.scrollLeft){ coupe=(p.className||p.tagName)+' défilé de '+p.scrollLeft+'/'+p.scrollTop+' px : il ne montre plus ce que montre la page en arrivant'; break; }
              const r=p.getBoundingClientRect(); if(b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1) coupe=(p.className||p.tagName)+' coupe : '+[Math.round(r.left-b.left),Math.round(b.right-r.right),Math.round(r.top-b.top),Math.round(b.bottom-r.bottom)].join('/'); }
            return {quoi:ou+a.className, w:Math.round(b.width), coupe}; };
          const L=[];
          for(const c of cs){ const vs=[...c.querySelectorAll('.c-vue')];
            for(let j=0;j<vs.length;j++){ vs.forEach((v,k)=>{ v.style.display=k===j?'flex':'none'; if(k===j){ v.style.opacity='1'; v.style.animation='none'; } });
              const a=vs[j].querySelector('.ap-iphone,.ap-mac'); if(!a){ L.push({quoi:c.className+' écran '+j, coupe:'aucun appareil'}); continue; }
              voir(a); await deux(); L.push(mesurer(a,(c.closest('.tuile-f')?'case ':'carrousel ')+'écran '+(j+1)+' : ')); }
            vs.forEach(v=>{ v.style.display=''; v.style.opacity=''; v.style.animation=''; }); }
          /* les appareils hors carrousel (la racine en a ; l'aperçu, plus) */
          for(const a of document.querySelectorAll('.ap-iphone,.ap-mac')) if(!a.closest('[data-carrousel]')){ voir(a); await deux(); L.push(mesurer(a,'fixe ')); }
          cs.forEach(c=>c.style.removeProperty('--c-duree')); scrollTo(0,0); return L;`);
        vrai(lbl + ' : population — ' + entiers.length + ' écrans d\'appareil montrés tour à tour', entiers.length >= 2);
        vrai(lbl + ' : chaque appareil se voit EN ENTIER, à chaque écran', entiers.every(x => !x.coupe), JSON.stringify(entiers.filter(x => x.coupe).slice(0, 4)));
        /* ⛔ PENDANT LA GLISSADE : l'appareil qui part et celui qui arrive restent bord à bord — ils ne se chevauchent JAMAIS — et la
           page ne déborde pas de côté (l'appareil qui arrive vient de la droite : sans la coupe de la scène, il pousserait la page).
           Relevé à chaque image, sur le premier carrousel de la page et sur une case. */
        /* ⚠️ la PREMIÈRE glissade vers un écran le dessine pour la première fois : ce Chromium sans carte graphique met alors ~0,5 s
           à peindre la grande image du Mac, et pendant ce temps aucune image ne sort — on ne voit pas la glissade. On montre donc
           l'autre appareil une fois (à blanc), puis on relève les deux glissades suivantes, entre deux écrans déjà peints. */
        /* (trois cibles : le premier carrousel, la première carte — elle a de la page À CÔTÉ d'elle, là où une grande scène occupe
           toute la largeur d'un téléphone et ne laisse rien où fuir — et la première case) */
        const glisse = await ev(`const R=[]; const cibles=[document.querySelector('.carrousel'), document.querySelector('.carrousel.c-carte'), document.querySelector('.vue.alterne')].filter((x,k,a)=>x&&a.indexOf(x)===k);
          const aller=c=>{ const p=c.querySelector('.c-point[aria-current="true"] i'); p.dispatchEvent(new AnimationEvent('animationend',{animationName:'c-progres',bubbles:true})); };
          for(const c of cibles){ voir(c); await new Promise(r=>setTimeout(r,1200)); c.style.setProperty('--c-duree','9999s');
            /* (une case ne capte pas le toucher — pointer-events:none : on le lui rend le temps de la mesure, pour savoir ce qui se VOIT) */
            const pe=c.style.pointerEvents; c.style.pointerEvents='auto';
            aller(c); await new Promise(r=>setTimeout(r,1600));
            let images=0, glissade=0, deuxVus=0, chevauche=0, deborde=0, essais=0, fuites=0;
            for(const d of [1,2]){ aller(c); const t0=performance.now();
              while(performance.now()-t0<1300){ await new Promise(r=>requestAnimationFrame(r)); images++;
                if([...c.querySelectorAll('.c-vue.c-on,.c-vue.c-sort')].some(v=>v.getAnimations().some(a=>/^c-(entre|sort)/.test(a.animationName)&&a.playState==='running'))) glissade++;
                const aps=[...c.querySelectorAll('.c-vue.c-on .ap-iphone-corps,.c-vue.c-on .ap-mac,.c-vue.c-sort .ap-iphone-corps,.c-vue.c-sort .ap-mac')].map(e=>e.getBoundingClientRect());
                const sc=c.querySelector('.c-scene').getBoundingClientRect(); const dans=aps.filter(b=>Math.min(b.right,sc.right)-Math.max(b.left,sc.left)>1);
                if(dans.length===2){ deuxVus++; const [a,b]=dans; if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) chevauche++; }
                if(document.documentElement.scrollWidth>innerWidth) deborde++;
                /* ⛔ hors de la scène, rien ne se voit : là où un appareil dépasse le bord, on touche juste à côté — c'est la page qui
                   doit répondre, pas l'appareil (sans la coupe, il glisserait par-dessus la page : la page, elle, ne débordait pas,
                   site.css la coupe — c'est la mutation M12 qui l'a montré) */
                for(const e of c.querySelectorAll('.c-vue.c-on .ap-iphone-corps,.c-vue.c-on .ap-mac,.c-vue.c-sort .ap-iphone-corps,.c-vue.c-sort .ap-mac')){ const b=e.getBoundingClientRect(), y=(Math.max(b.top,0)+Math.min(b.bottom,innerHeight))/2;
                  for(const x of [b.left<sc.left-6?sc.left-4:null, b.right>sc.right+6?sc.right+4:null]){ if(x===null||x<0||x>=innerWidth||y<0||y>=innerHeight) continue; essais++;
                    const h=document.elementFromPoint(x,y); if(h&&h.closest('.c-vue')&&c.contains(h)) fuites++; } } } }
            const sc=c.querySelector('.c-scene').getBoundingClientRect(), place=sc.left>=8||innerWidth-sc.right>=8;
            c.style.pointerEvents=pe; c.style.removeProperty('--c-duree'); R.push({quoi:c.className, images, glissade, deuxVus, chevauche, deborde, essais, fuites, place}); }
          scrollTo(0,0); return R;`);
        for (const g of glisse) {
          /* (la glissade part vite — la courbe « ressort » d'Apple : l'appareil qui part quitte la scène en ~150 ms ; on exige donc
             d'avoir VU la glissade, et au moins une image où les deux appareils sont dans la scène) */
          vrai(lbl + ' · ' + g.quoi + ' : population — la glissade a été vue (' + g.glissade + ' images en glissade, ' + g.deuxVus + ' à deux appareils, sur ' + g.images + ')', g.glissade >= 10 && g.deuxVus >= 1, JSON.stringify(g));
          vrai(lbl + ' · ' + g.quoi + ' : ⛔ pendant la glissade, les deux appareils ne se chevauchent jamais, et la page ne déborde pas de côté', g.chevauche === 0 && g.deborde === 0, JSON.stringify(g));
          /* une scène qui occupe toute la largeur de l'écran n'a rien à côté d'elle : rien à essayer, et ce n'est pas un ✓ */
          if (g.place) vrai(lbl + ' · ' + g.quoi + ' : ⛔ l\'appareil qui glisse ne se voit jamais hors de sa scène (' + g.fuites + ' fuites sur ' + g.essais + ' essais)', g.essais >= 5 && g.fuites === 0, JSON.stringify(g));
          else vrai(lbl + ' · ' + g.quoi + ' : (pleine largeur) aucun appareil ne se voit hors de sa scène', g.fuites === 0, JSON.stringify(g));
        }
        vrai(lbl + ' : population — au moins une glissade relevée avec de la page à côté de sa scène', glisse.some(g => g.place && g.essais >= 5), JSON.stringify(glisse.map(g => [g.quoi.split(' ').slice(0, 2).join(' '), g.place, g.essais])));
        /* ⛔ LES CASES : chacune passe d'elle-même de l'iPhone au Mac du même écran, en vague (`--i`) ; le ⏸ des cases les arrête toutes */
        const cases = await ev(`const v=[...document.querySelectorAll('.tuile-f .vue')]; return {n:v.length, alterne:v.filter(x=>x.matches('.alterne[data-carrousel].c-pret')
          &&x.querySelectorAll('.c-vue').length===2&&x.querySelectorAll('.c-vue')[0].querySelector('.ap-mac')&&x.querySelectorAll('.c-vue')[1].querySelector('.ap-iphone')).length,
          boutons:document.querySelectorAll('[data-c-groupe],.c-groupe').length};`);
        if (cases.n) {
          vrai(lbl + ' : ⛔ chaque case porte le Mac, puis le téléphone (' + cases.alterne + '/' + cases.n + '), et aucun bouton au-dessus', cases.alterne === cases.n && cases.boutons === 0, JSON.stringify(cases));
          /* chaque case visible doit MONTRER le Mac, puis l'iPhone de nouveau (relevé toutes les 50 ms pendant 4 s, horloge à 1,2 s) */
          const bascule = await ev(`const g=document.querySelector('.bento'); voir(g.querySelector('.tuile-f')); await new Promise(r=>setTimeout(r,700));
            const vis=[...document.querySelectorAll('.vue.alterne')].filter(v=>{ const r=v.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; });
            vis.forEach(v=>v.style.setProperty('--c-duree','1.2s')); const vus=vis.map(()=>new Set()), arrets=vis.map(()=>0);
            const t0=performance.now(); while(performance.now()-t0<4000){ await new Promise(r=>setTimeout(r,50));
              vis.forEach((v,k)=>{ const on=v.querySelector('.c-vue.c-on'); if(on) vus[k].add(on.querySelector('.ap-mac')?'mac':on.querySelector('.ap-iphone')?'iphone':'?'); if(v.classList.contains('c-arrete')) arrets[k]++; }); }
            const R={visibles:vis.length, mac:vus.filter(x=>x.has('mac')&&x.has('iphone')&&x.size===2).length, vus:vus.map(x=>[...x].join('+')), arrets,
              retards:vis.map(v=>getComputedStyle(v.querySelector('.c-vue.c-on')).animationDelay), rangs:vis.map(v=>+getComputedStyle(v).getPropertyValue('--i'))};
            vis.forEach(v=>v.style.setProperty('--c-duree','9999s')); return R;`);
          vrai(lbl + ' : ⛔ les cases à l\'écran passent d\'elles-mêmes du Mac au téléphone, puis reviennent (' + bascule.mac + '/' + bascule.visibles + ')', bascule.visibles >= 1 && bascule.mac === bascule.visibles, JSON.stringify(bascule));
          vrai(lbl + ' : en vague — chaque case glisse 70 ms après la précédente (' + bascule.retards.join(' ') + ')', bascule.retards.every((d, k) => Math.abs(parseFloat(d) - bascule.rangs[k] * 0.07) < 0.001), JSON.stringify(bascule));
        }
        const cote = await ev(`const r=[]; for(const y of [0, document.documentElement.scrollHeight]){ scrollTo(9999,y); ${deuxImages} r.push(scrollX); } scrollTo(0,0);
          return {r, large:document.documentElement.scrollWidth, fen:innerWidth};`);
        vrai(lbl + ' : aucun défilement de côté', cote.r.every(x => x === 0) && cote.large <= P.w && cote.fen === P.w, JSON.stringify(cote));
        if (NEUTRES.includes(pg)) {
          const n = await ev(`return { cartes:document.querySelectorAll('.grande-carte .c-paire').length, macs:[...document.querySelectorAll('.grande-carte .c-paire')].filter(c=>c.querySelector('.ap-mac')&&c.querySelector('.ap-iphone')).length,
            ecrans:[...new Set([...document.querySelectorAll('main img')].filter(i=>/captures\\//.test(i.getAttribute('src'))).map(i=>i.getAttribute('src').split('/').pop().replace(/-(jour|nuit)(-1x)?\\.webp$/,'')))] };`);
          vrai(lbl + ' : ⛔ page métier hors 3D — l\'iPhone ET le Mac dans chaque carte, et rien que des écrans neutres (menus du 3D masqués)', n.cartes === 2 && n.macs === 2
            && n.ecrans.length >= 4 && n.ecrans.every(e => ['mac-factures-neutre', 'mac-compta-neutre', 'mac-connexion', 'iphone-factures-neutre', 'iphone-compta-neutre', 'iphone-connexion'].includes(e)), JSON.stringify(n));
        }

        /* ── les gestes : il passe seul du Mac au téléphone et revient ; la souris le fait attendre ; hors de l'écran il attend ; au
           doigt, glisser change d'appareil ; « animations réduites » : rien ne bouge seul, et au doigt ça change SANS glisser ── */
        if (mode === 'light' && GESTES.includes(pg) && (P.nom === 'bureau' || P.nom === 'téléphone')) {
          await ev(`document.querySelectorAll('.carrousel').forEach(c=>c.style.setProperty('--c-duree','1.2s')); return 1;`);
          const k = 0;
          await centre('.carrousel', k);
          let e0 = await etat(k);
          let e = await attendre(k, x => x.i !== e0.i, 2600);
          vrai(lbl + ' : il passe seul à l\'autre appareil (' + e0.app + ' → ' + e.app + '), qui arrive par la droite', e.i === (e0.i + 1) % 2 && e.sens === 'avant' && e0.app !== e.app && ['mac', 'iphone'].includes(e.app), JSON.stringify({ e0, e }));
          const e1 = await attendre(k, x => x.i !== e.i, 2600);
          vrai(lbl + ' : puis revient au premier, en avançant encore (' + e.app + ' → ' + e1.app + ')', e1.i === e0.i && e1.app === e0.app && e1.sens === 'avant', JSON.stringify(e1));
          await dormir(1000);
          e = await etat(k);
          vrai(lbl + ' : un seul écran affiché, plus rien en sortie', coherent(e) && e.sort === 0, JSON.stringify(e));
          if (!P.tac) {
            /* la souris posée dessus : il attend ; elle part : il reprend */
            const b = await centre('.carrousel .c-scene', k);
            await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
            e0 = await etat(k); await dormir(2800); e = await etat(k);
            vrai(lbl + ' : la souris posée dessus le fait attendre', e0.arrete && e.i === e0.i, JSON.stringify(e));
            await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 3, y: 3 });
            e = await attendre(k, x => x.i !== e0.i, 2600);
            vrai(lbl + ' : la souris partie, il reprend', e.i === (e0.i + 1) % 2 && !e.arrete, JSON.stringify(e));
          } else {
            /* au doigt : glisser à gauche, à droite ; un geste vertical ne change rien (l'horloge figée, seul le doigt décide) */
            await ev(`document.querySelectorAll('.carrousel')[${k}].style.setProperty('--c-duree','9999s'); return 1;`);
            const b = await centre('.carrousel .c-scene', k);
            await dormir(1000);
            e0 = await etat(k);
            await glisser(b.x + 60, b.y, -150, 6); e = await attendre(k, x => x.i !== e0.i, 1500);
            vrai(lbl + ' : glisser à gauche → l\'autre appareil, qui arrive par la droite', e.i === (e0.i + 1) % 2 && e.sens === 'avant', JSON.stringify(e));
            await dormir(1000);
            await glisser(b.x - 60, b.y, 150, -6); e = await attendre(k, x => x.i === e0.i, 1500);
            vrai(lbl + ' : glisser à droite → le premier, qui revient par la gauche', e.i === e0.i && e.sens === 'arriere', JSON.stringify(e));
            await dormir(1000);
            await glisser(b.x, b.y - 60, 20, 150); await dormir(1000); e = await etat(k);
            vrai(lbl + ' : un geste vertical ne change pas d\'appareil', e.i === e0.i, JSON.stringify(e));
            await ev(`document.querySelectorAll('.carrousel')[${k}].style.setProperty('--c-duree','1.2s'); return 1;`);
          }
          /* hors de l'écran : il attend */
          await ev(`scrollTo(0, document.documentElement.scrollHeight); return 1;`); await dormir(400);
          const loin = await etat(k); await dormir(2600);
          e = await etat(k);
          vrai(lbl + ' : hors de l\'écran, il attend', loin.arrete && e.i === loin.i, JSON.stringify({ loin, e }));
          await centre('.carrousel', k);
          e = await attendre(k, x => x.i !== loin.i, 3000);
          vrai(lbl + ' : revenu à l\'écran, il reprend', e.i === (loin.i + 1) % 2, JSON.stringify(e));
          /* « animations réduites » : rien ne bouge seul ; au doigt, l'appareil change SANS glisser */
          await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
          await cdp('Page.reload', {}); await dormir(900);
          await ev(`document.querySelectorAll('.carrousel').forEach(c=>c.style.setProperty('--c-duree','1.2s')); return 1;`);
          await centre('.carrousel', k);
          e0 = await etat(k); await dormir(2800); e = await etat(k);
          vrai(lbl + ' : « animations réduites » : rien ne bouge seul, le Mac reste', e0.pause && e.i === e0.i && e.app === 'mac', JSON.stringify(e));
          if (P.tac) {
            const b = await centre('.carrousel .c-scene', k);
            await glisser(b.x + 60, b.y, -150, 6);
            /* relevé à chaque image jusqu'à 700 ms APRÈS la bascule (l'écran attend que son image soit prête) */
            const anime = await ev(`const c=document.querySelectorAll('.carrousel')[${k}]; const t0=performance.now(); let vu=0, n=0, bascule=0;
              while(performance.now()-t0<3500&&!(bascule&&performance.now()-bascule>700)){ await new Promise(r=>requestAnimationFrame(r));
                if(!bascule&&c.querySelectorAll('.c-point')[1].getAttribute('aria-current')==='true') bascule=performance.now();
                if(!bascule) continue; n++;
                if([...c.querySelectorAll('.c-vue.c-on,.c-vue.c-sort')].some(v=>v.getAnimations().some(a=>/^c-(entre|sort)/.test(a.animationName)&&a.playState==='running'))) vu++; }
              return {vu, n, bascule:!!bascule};`);
            e = await etat(k);
            vrai(lbl + ' : « animations réduites » : au doigt, l\'autre appareil vient', e.i === 1 && coherent(e), JSON.stringify(e));
            vrai(lbl + ' : ⛔ « animations réduites » : il change SANS glisser (' + anime.vu + ' images en glissade sur ' + anime.n + ')', anime.bascule && anime.n >= 5 && anime.vu === 0, JSON.stringify(anime));
          }
          await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
        }
        vrai(lbl + ' : aucune exception', EXC.length === 0, EXC.slice(0, 3).join(' | '));
      } catch (err) { vrai(lbl + ' : la sonde a planté', false, err.message); }
    }
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  if (ko) { console.log('\nÉchecs :\n· ' + echecs.slice(0, 40).join('\n· ')); }
  ws.close(); srv.close(); tuer();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗', e.message); process.exit(2); });
