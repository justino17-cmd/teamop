/* Sonde de l'écran de démarrage (#demarrage) — au navigateur, bêta locale 127.0.0.1. Garde de tests/test-3290.js.
   Usage : node scratchpad/base-elan-like.js /tmp/base.json && BASE=/tmp/base.json node scratchpad/sonde-demarrage.js */
/* le splash : visible avant le script, retiré à la connexion ET à l'entrée, de jour et de nuit ; le filet de 25 s */
const fs = require('fs');
const H = require('./perf-nuit-harnais.js');
let ok = 0, ko = 0; const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + ' ' + (d || '')); } };
(async () => {
  const { s, port } = await H.serveur(null); const br = await H.lancer();
  const base = fs.readFileSync(process.env.BASE || require('path').join(__dirname, 'base-elan-like.json'), 'utf8');
  for (const mode of ['light', 'dark']) {
    console.log('mode', mode);
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, colorScheme: mode, serviceWorkers: 'block' });
    const page = await ctx.newPage(); await page.addInitScript(H.INIT);
    /* avant le script : on retient le chargement du script géant pour regarder la page à mi-chemin */
    let relache; const garde = new Promise(r => relache = r);
    await page.route('**/beta.html', async route => { const rep = await route.fetch(); let t = await rep.text(); route.fulfill({ response: rep, body: t }); });
    await page.goto('http://127.0.0.1:' + port + '/beta.html', { waitUntil: 'domcontentloaded' });
    /* connexion (appareil neuf) */
    for (let i = 0; i < 60; i++) { if (await page.evaluate(() => getComputedStyle(document.getElementById('login')).display === 'flex')) break; await H.dormir(200); }
    let e = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('demarrage')).display, login: getComputedStyle(document.getElementById('login')).display }));
    v('écran de connexion affiché → le démarrage est retiré', e.login === 'flex' && e.d === 'none', JSON.stringify(e));
    await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0'); localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
    await page.reload({ waitUntil: 'load' });
    for (let i = 0; i < 80; i++) { if (await page.evaluate(() => getComputedStyle(document.getElementById('app-root')).display === 'flex')) break; await H.dormir(200); }
    e = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('demarrage')).display, app: getComputedStyle(document.getElementById('app-root')).display, vis: !!document.elementFromPoint(195, 400) }));
    v('application affichée → le démarrage est retiré', e.app === 'flex' && e.d === 'none', JSON.stringify(e));
    const sous = await page.evaluate(() => { const el = document.elementFromPoint(195, 420); return el ? (el.closest('#demarrage') ? 'DEMARRAGE' : el.tagName) : null; });
    v('rien du démarrage ne reste sous le doigt', sous !== 'DEMARRAGE', sous);
    /* la forme du document : avant le script, après #login et #app-root */
    const ordre = await page.evaluate(() => { const k = [...document.body.children].map(x => x.id).filter(Boolean); return { l: k.indexOf('login'), a: k.indexOf('app-root'), d: k.indexOf('demarrage') }; });
    v('il vient après #login et #app-root (le sélecteur frère le voit)', ordre.d > ordre.l && ordre.d > ordre.a && ordre.l >= 0, JSON.stringify(ordre));
    await ctx.close();
  }
  /* sans l'un ni l'autre : le démarrage est peint, puis le filet le retire */
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.route('**/*', r => { if (/beta\.html$/.test(r.request().url())) return r.fulfill({ status: 200, contentType: 'text/html', body: fs.readFileSync(require('path').resolve(__dirname, '..', 'beta.html'), 'utf8').replace(/<script>[\s\S]*?<\/script>/g, '') }); return r.continue(); });
  await page.goto('http://127.0.0.1:' + port + '/beta.html', { waitUntil: 'load' });
  let e = await page.evaluate(() => ({ d: getComputedStyle(document.getElementById('demarrage')).display, vis: getComputedStyle(document.getElementById('demarrage')).visibility }));
  v('page sans aucun script : le démarrage est peint (ni login ni app)', e.d === 'flex' && e.vis === 'visible', JSON.stringify(e));
  const anim = await page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'demarrageFiltre').length);
  v('le filet de 25 s est armé', anim === 1, anim);
  console.log(ok + ' ✓ ' + ko + ' ✗');
  await br.close(); s.close(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
