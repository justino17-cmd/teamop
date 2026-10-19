/* Reproduction (22 octobre) : trois boîtes de MÊME nom « TEAM OP », une sans dossier Archives (OVH). On clique chaque dossier et chaque boîte, on relève exceptions, requêtes en erreur, rendu.
   NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/repro-boites.js [avant|apres]   — captures dans $CAPTURES. 127.0.0.1 uniquement. */
const { ouvrir } = require('./pilote.js');
const { demarrer } = require('./serveur-banc.js');
const fs = require('fs'), path = require('path');
const TAG = process.argv[2] || 'avant';
const CAP = process.env.CAPTURES || '/tmp/claude-0/captures-courrier'; fs.mkdirSync(CAP, { recursive: true });
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
(async () => {
  const S = await demarrer({ messages: false, boites: [{ email: 'support@teamop.fr' }, { email: 'controle@teamop.fr' }, { email: 'contact@teamop.fr', sans: ['Archives'] }] });
  const P = await ouvrir();
  const tailles = process.env.TAILLES ? process.env.TAILLES.split(',') : ['1440x900', '1920x1080', '820x1180', '390x844'];
  for (const t of tailles) {
    const [w, h] = t.split('x').map(Number); const mobile = w < 500;
    const ctx = await P.ctxPour({ viewport: { width: w, height: h }, colorScheme: 'light', isMobile: mobile, hasTouch: w < 1000, deviceScaleFactor: mobile ? 2 : 1 });
    const err = [], http = [];
    await ctx.route(/^https:\/\/api\.teamop\.fr\//, async (route) => {
      const rq = route.request(), u = new URL(rq.url());
      if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
      const hd = Object.assign({}, rq.headers(), { host: '127.0.0.1:' + S.port }); delete hd['content-length'];
      const r = await fetch('http://127.0.0.1:' + S.port + u.pathname + u.search, { method: rq.method(), headers: hd, body: rq.method() === 'GET' ? undefined : rq.postData() });
      const body = await r.text(); if (r.status >= 400) http.push(rq.method() + ' ' + u.pathname + u.search.slice(0, 80) + ' → ' + r.status + ' ' + body.slice(0, 100));
      route.fulfill({ status: r.status, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body });
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => err.push(String(e.stack || e).split('\n').slice(0, 3).join(' | '))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); });
    await p.goto(P.base + '/apercu/tour.html'); await p.fill('#lg-id', 'Patron'); await p.fill('#lg-pass', S.MDP); await p.press('#lg-pass', 'Enter');
    await p.waitForSelector('.tab[data-t="support"]', { state: 'attached', timeout: 20000 }); await p.waitForTimeout(800);
    await p.evaluate(() => setTab('support')); await p.waitForSelector('[data-opcourrier]', { timeout: 15000 }); await p.waitForTimeout(3000);
    const sr = (f, a) => p.evaluate(([s, fn, arg]) => (new Function('root', 'arg', 'return (' + fn + ')(root,arg)'))(eval(s), arg), [SR, f.toString(), a]);
    const etat = () => sr((root) => ({ boites: [...root.querySelectorAll('.scope-row')].map(r => r.querySelector('.sn').textContent + ' / ' + r.querySelector('.ss').textContent + (r.getAttribute('aria-current') === 'true' ? ' [cur]' : '')),
      dossier: (root.querySelector('.folder.active .sn') || {}).textContent, liste: [...root.querySelectorAll('#rows .msg')].map(x => x.textContent.replace(/\s+/g, ' ').slice(0, 50)).slice(0, 4), vide: ((root.querySelector('#rows .empty') || {}).textContent || '').replace(/\s+/g, ' '),
      lecture: ((root.querySelector('#readScroll') || {}).textContent || '').replace(/\s+/g, ' ').slice(0, 80), toast: ((root.querySelector('#toast') || {}).textContent || '').slice(0, 120), de: ((root.querySelector('#statusList,#listStatus') || {}).textContent || '') }));
    console.log('\n=== ' + t + ' ===');
    console.log('initial', JSON.stringify(await etat()));
    await p.screenshot({ path: path.join(CAP, `${TAG}-${t}-initial.png`) });
    const dossiers = ['Archive', 'Indésirables', 'Corbeille', 'Envoyés', 'Brouillons', 'Programmés', 'Signatures', 'Envois TeamOP', 'Marqués'];
    const cliqueBoite = async (i) => { await sr((root, k) => root.querySelectorAll('.scope-row')[k].click(), i); await p.waitForTimeout(500); };
    const cliqueDossier = async (nom) => sr((root, n) => { const b = [...root.querySelectorAll('.folder')].find(x => x.querySelector('.sn').textContent.trim() === n); if (b) b.click(); return !!b; }, nom);
    const phone = mobile;
    for (const k of [1, 0, 2, 3]) {   // 0 = « Toutes » quand elle est là
      const avant = await etat();
      for (const d of dossiers) {
        if (phone) { await sr((root) => { const b = root.querySelector('#btnNav'); if (b) b.click(); }); await p.waitForTimeout(300); }
        const ok = await cliqueDossier(d); await p.waitForTimeout(900);
        if (k === 1 && ok) console.log(' dossier', d, JSON.stringify(await etat()).slice(0, 380));
        if (k === 1 && ok && ['Archive', 'Indésirables'].includes(d)) await p.screenshot({ path: path.join(CAP, `${TAG}-${t}-${d}.png`) });
      }
      if (phone) { await sr((root) => { const b = root.querySelector('#btnNav'); if (b) b.click(); }); await p.waitForTimeout(300); }
      await cliqueBoite(k); await p.waitForTimeout(900);
      const apres = await etat();
      console.log(` clic boîte #${k} (dossier avant: ${avant.dossier}) → dossier ${apres.dossier} · liste ${JSON.stringify(apres.liste)} · boîtes ${JSON.stringify(apres.boites)}`);
      if (!['inbox', 'Réception', 'Boîte de réception'].includes(apres.dossier)) console.log('   >>> DÉFAUT : la boîte cliquée n’ouvre pas la Réception');
      if (k === 1) await p.screenshot({ path: path.join(CAP, `${TAG}-${t}-boite1.png`) });
    }
    // archiver un message de la boîte sans Archives
    await cliqueBoite(3); await p.waitForTimeout(800);
    if (phone) { await sr((root) => { const b = root.querySelector('#btnNav'); if (b) b.click(); }); await p.waitForTimeout(300); }
    await cliqueDossier('Boîte de réception'); await p.waitForTimeout(800);
    await sr((root) => { const m = root.querySelector('#rows .msg'); if (m) m.click(); }); await p.waitForTimeout(1500);
    await sr((root) => { const b = root.querySelector('[data-act="archive"]'); if (b) b.click(); }); await p.waitForTimeout(2500);
    console.log('archiver (boîte sans Archives):', JSON.stringify((await etat()).toast));
    await p.screenshot({ path: path.join(CAP, `${TAG}-${t}-archiver-sans-dossier.png`) });
    // lecture vide
    console.log('lecture vide: ', JSON.stringify(await sr((root) => { const e = root.querySelector('#reading .empty, #readScroll .empty, .reading-empty'); if (!e) return 'aucun élément vide trouvé'; const r = e.getBoundingClientRect(), pr = root.querySelector('#reading').getBoundingClientRect(); return { texte: e.textContent.replace(/\s+/g, ' '), left: Math.round(r.left), right: Math.round(r.right), lectureL: Math.round(pr.left), lectureR: Math.round(pr.right), debordeD: r.right > pr.right + 1, scrollW: e.scrollWidth, clientW: e.clientWidth }; })));
    console.log('exceptions JS:', err.length, err.slice(0, 5)); console.log('HTTP en erreur:', http.slice(0, 8));
    await ctx.close();
  }
  S.arreter(); await P.fermer();
})().catch(e => { console.error('ECHEC', e); process.exit(1); });
