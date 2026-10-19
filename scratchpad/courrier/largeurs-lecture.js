/* Le volet de lecture vide (« Aucun message sélectionné ») à toutes les largeurs : centré, jamais coupé. NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/largeurs-lecture.js */
const { ouvrir } = require('./pilote.js'); const { demarrer } = require('./serveur-banc.js');
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
(async () => {
  const S = await demarrer({ messages: false, boites: [{ email: 'support@teamop.fr' }] }); const P = await ouvrir(); let mauvais = 0;
  const ctx = await P.ctxPour({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/^https:\/\/api\.teamop\.fr\//, async (route) => { const rq = route.request(), u = new URL(rq.url());
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const hd = Object.assign({}, rq.headers(), { host: '127.0.0.1:' + S.port }); delete hd['content-length'];
    const r = await fetch('http://127.0.0.1:' + S.port + u.pathname + u.search, { method: rq.method(), headers: hd, body: rq.method() === 'GET' ? undefined : rq.postData() });
    route.fulfill({ status: r.status, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: await r.text() }); });
  const p = await ctx.newPage(); await p.goto(P.base + '/apercu/tour.html'); await p.fill('#lg-id', 'Patron'); await p.fill('#lg-pass', S.MDP); await p.press('#lg-pass', 'Enter');
  await p.waitForSelector('.tab[data-t="support"]', { state: 'attached', timeout: 20000 }); await p.evaluate(() => setTab('support')); await p.waitForSelector('[data-opcourrier]'); await p.waitForTimeout(2500);
  for (const w of [1000, 1024, 1100, 1180, 1280, 1366, 1440, 1600, 1920, 2560, 820, 700, 600, 390, 320]) {
    await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(700);
    const r = await p.evaluate((s) => { const root = eval(s); const rd = root.querySelector('#reading'), e = root.querySelector('.reading-empty'); if (!e || !rd) return { aucun: true, fmt: root.querySelector('.app').getAttribute('data-fmt') };
      const b = e.querySelector('b'), rr = rd.getBoundingClientRect(), br = b.getBoundingClientRect(), z = document.getElementById('courrier-zone').getBoundingClientRect(), c = e.getBoundingClientRect();
      const cx = (br.left + br.right) / 2, px = (rr.left + rr.right) / 2;
      return { fmt: root.querySelector('.app').getAttribute('data-fmt'), lecture: [Math.round(rr.left), Math.round(rr.right)], zoneDroite: Math.round(z.right), fenetre: innerWidth, texte: [Math.round(br.left), Math.round(br.right)], coupe: b.scrollWidth > b.clientWidth + 1 || br.right > rr.right + 1 || br.left < rr.left - 1, decentre: Math.abs(cx - px) > 2, lignes: Math.round(br.height / 24) }; }, SR);
    if (r.aucun) { console.log(w, JSON.stringify(r)); continue; }
    const mal = r.coupe || r.decentre || r.zoneDroite > r.fenetre + 1; if (mal) mauvais++;
    console.log(w, mal ? 'MAUVAIS' : 'ok', JSON.stringify(r));
  }
  S.arreter(); await P.fermer(); process.exit(mauvais ? 1 : 0);
})();
