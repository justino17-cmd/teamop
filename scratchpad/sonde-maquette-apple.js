/* Sonde de la maquette apercu/site-apple.html (29 septembre 2026, test-756) : servie sur 127.0.0.1, jamais teamop.fr.
   Ce qu'elle mesure dans le VRAI navigateur : aucune erreur JavaScript ; OP GESTION = trois cartes (Pro, Business,
   Business Premium), ni « Gratuit » ni « Le plus choisi » ; la bascule OP MESSAGES montre la note « rien n'est facturé
   d'ici là » et la cache au retour ; aucune page qui glisse de côté au téléphone (390 et 360 px), mesuré deux fois. */
const http = require('http'), fs = require('fs'), path = require('path'), net = require('net');
const { spawn } = require('child_process');
const RACINE = process.env.RACINE_SONDE || path.join(__dirname, '..');  /* contre-épreuve : RACINE_SONDE=<dossier> sert une autre copie */
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
let ok = 0, ko = 0; const v = (t, c, d) => { c ? ok++ : ko++; console.log('  ' + (c ? '✓' : '✗') + ' ' + t + (c ? '' : '  → ' + JSON.stringify(d))); };
(async () => {
  const pw = await libre(), pc = await libre();
  const srv = http.createServer((q, r) => { const f = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html;charset=utf-8' : f.endsWith('.png') ? 'image/png' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); r.end(d); }); }).listen(pw, '127.0.0.1');
  const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, 'about:blank'], { stdio: 'ignore' });
  let cibles; for (let i = 0; i < 50; i++) { try { cibles = await (await fetch('http://127.0.0.1:' + pc + '/json')).json(); if (cibles.length) break; } catch (e) {} await dormir(200); }
  const ws = new WebSocket(cibles.find(c => c.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const att = new Map(), erreurs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && att.has(m.id)) { att.get(m.id)(m); att.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') erreurs.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text); };
  const cdp = (me, pa) => new Promise(r => { const i = ++id; att.set(i, r); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); });
  /* une expression qui jette rend « undefined » : on le DIT, sinon la sonde accuse la page (vu à la première exécution) */
  const ev = async x => { const r = (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result;
    if (r.exceptionDetails) console.log('    (l\'expression a jeté : ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text) + ')');
    return r.result.value; };
  await cdp('Runtime.enable'); await cdp('Page.enable');
  const url = 'http://127.0.0.1:' + pw + '/apercu/site-apple.html';
  for (const [nom, l, h, mobile] of [['bureau', 1280, 900, false], ['téléphone 390', 390, 844, true], ['téléphone 360', 360, 780, true]]) {
    console.log('\n── ' + nom + ' ──');
    await cdp('Emulation.setDeviceMetricsOverride', { width: l, height: h, deviceScaleFactor: 1, mobile });
    await cdp('Page.navigate', { url }); await dormir(1500);
    const cartes = () => ev(`[...document.querySelectorAll('#prix .f .n')].map(e=>e.textContent)`);
    const g = await cartes();
    v('OP GESTION : Pro, Business, Business Premium', JSON.stringify(g) === JSON.stringify(['Pro', 'Business', 'Business Premium']), g);
    { const t = await ev(`[...document.body.innerText.matchAll(/.{0,40}(?:\\bGratuit\\b|[Pp]lus choisi|PLUS CHOISI|forfait gratuit).{0,40}/g)].map(m=>m[0])`);
      v('   ni la formule « Gratuit », ni « Le plus choisi », ni « forfait gratuit » dans le texte lu', Array.isArray(t) && t.length === 0, t); }
    v('   (le compte TEAM OP, lui, reste gratuit — comme sur le site : ce n\'est pas une formule)', await ev(`/compte TEAM OP : créez-le d'abord, c'est gratuit/.test(document.body.innerText)`));
    v('   la note d\'OP MESSAGES est cachée', await ev(`document.getElementById('note-msg').hidden===true && document.getElementById('note-msg').offsetHeight===0`));
    await ev(`document.getElementById('t-messages').click()`); await dormir(300);
    const m = await cartes();
    v('OP MESSAGES : Perso, Messages Pro, Messages Business Premium', JSON.stringify(m) === JSON.stringify(['Perso', 'Messages Pro', 'Messages Business Premium']), m);
    v('   … et la note « rien n\'est facturé d\'ici là » se voit', await ev(`(()=>{const n=document.getElementById('note-msg');return !n.hidden&&n.offsetHeight>0&&/rien n'est factur/.test(n.innerText)})()`));
    await ev(`document.getElementById('t-gestion').click()`); await dormir(300);
    v('retour à OP GESTION : la note se cache de nouveau', await ev(`document.getElementById('note-msg').hidden===true`));
    if (mobile) { /* deux lectures espacées, après deux trames et une lecture forcée (CLAUDE.md) */
      const lit = () => ev(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{void document.body.offsetWidth; window.scrollTo(9999,window.scrollY); r(window.scrollX)})))`);
      await ev(`document.getElementById('tarifs').scrollIntoView()`);
      const a = await lit(); await dormir(700); const b = await lit();
      v('la page ne glisse pas de côté (poussée à droite : ' + a + ' px, puis ' + b + ' px)', a === 0 && b === 0, [a, b]);
    }
  }
  v('aucune erreur JavaScript', erreurs.length === 0, erreurs);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); ws.close(); ch.kill('SIGKILL'); srv.close(); process.exit(ko ? 1 : 0);
})();
