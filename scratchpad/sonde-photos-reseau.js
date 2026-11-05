/* Sonde des photos d'une intervention sur un réseau lent (tests/test-3292.js). usage : BASE… node scratchpad/sonde-photos-reseau.js <base.json> <nbPhotos> [cpu] — temps pour récupérer les photos d'une intervention déposées sur le serveur (pièces), réseau 4G faible simulé */
const fs = require('fs'), http = require('http');
const H = require('./perf-nuit-harnais.js');
const [baseF, nS, cpuS, net] = process.argv.slice(2);
(async () => {
  const { s, port } = await H.serveur(null); const br = await H.lancer();
  const base = fs.readFileSync(baseF, 'utf8');
  const pieces = new Map(); let appels = 0, simultanes = 0, maxSim = 0;
  /* réseau simulé : 400 ms d'aller-retour, 1,6 Mbit/s PARTAGÉS à parts égales entre les transferts en cours (comme TCP) */
  const BW = 1.6e6 / 8, RTT = 400; const actifs = []; let tick = null;
  const avancer = () => { const dt = 0.02; const part = BW * dt / Math.max(1, actifs.length);
    for (let k = actifs.length - 1; k >= 0; k--) { const a = actifs[k]; a.reste -= part; if (a.reste <= 0) { actifs.splice(k, 1); simultanes--; a.fin(); } }
    if (!actifs.length) { clearInterval(tick); tick = null; } };
  const transferer = taille => new Promise(res => { setTimeout(() => { simultanes++; maxSim = Math.max(maxSim, simultanes); actifs.push({ reste: taille, fin: res }); if (!tick) tick = setInterval(avancer, 20); }, RTT); });
  const api = { close() { if (tick) clearInterval(tick); } }; const apiPort = 0;
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.addInitScript('window.__fetchReal = window.fetch.bind(window);'); await page.addInitScript(H.INIT);
  await page.addInitScript(`(() => { const f1 = window.fetch; window.fetch = function (u, o) { const s = String((u && u.url) || u); return /pieces\\/lire/.test(s) ? window.__fetchReal(u, o) : f1.apply(this, arguments); }; })();`);
  await page.route('https://api.teamop.fr/api/pieces/lire', async r => { appels++; const id = JSON.parse(r.request().postData() || '{}').id; const p = pieces.get(id);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (!p) { await transferer(300); return r.fulfill({ status: 404, headers: cors, body: '' }); }
    const body = JSON.stringify(p); await transferer(body.length); return r.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body }); });
  const cdp = await ctx.newCDPSession(page);
  await page.goto('http://127.0.0.1:' + port + '/' + (process.env.URLP || 'beta.html'), { waitUntil: 'load' }); await H.dormir(800);
  await page.evaluate(b => { localStorage.setItem(STORE_KEY, b); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_session', 'u0'); localStorage.setItem('elanB_onboarded_u0', '1'); localStorage.setItem('elanB_sync_on', '0'); localStorage.setItem('elanB_lang', 'fr'); }, base);
  await page.reload({ waitUntil: 'load' });
  for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__tRendu != null)) break; await H.dormir(250); }
  await H.dormir(2500);
  const fab = await page.evaluate(async n => {
    window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); try { closeModal(); } catch (e) {}
    const mk = k => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const x = c.getContext('2d');
      for (let i = 0; i < 260; i++) { x.fillStyle = `hsl(${(i * 37 + k * 53) % 360},${40 + (i % 50)}%,${30 + (i % 40)}%)`; x.fillRect((i * 97) % 1200, (i * 61) % 900, 60 + (i % 90), 40 + (i % 70)); }
      const im = x.getImageData(0, 0, 1200, 900); for (let i = 0; i < im.data.length; i += 4) { const r = (Math.random() * 40) | 0; im.data[i] ^= r; im.data[i + 1] ^= r; } x.putImageData(im, 0, 0);
      return c.toDataURL('image/jpeg', 0.72); };
    const out = [];
    for (let k = 0; k < n; k++) { const d = mk(k); const pid = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''); const e = await syncEncrypt(d); out.push({ pid, e }); }
    return out;
  }, +nS);
  fab.forEach(x => pieces.set(x.pid, x.e));
  await page.evaluate(async pids => { window.sauvKh = async () => ({ t: 'essai', kh: 'essai' }); _pieceCache.clear(); const i = db.interventions[0]; i.photos = pids.map(p => 'piece:' + p); window.__iid = i.id; }, fab.map(x => x.pid));
  if (+(cpuS || 4) > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +(cpuS || 4) });
  const r = await page.evaluate(async () => {
    const i = db.interventions.find(x => x.id === window.__iid); const t0 = performance.now(); let premiere = null, toutes = null;
    const N = i.photos.length;
    try { closeModal(); } catch (e) {}
    detailIntervention(i.id); intTab = 'docs'; fsTab = 'medias'; renderIntDetail(i.id);
    const sonde = setInterval(() => { const imgs = [...document.querySelectorAll('#int-detail-photos img')].filter(m => m.src.startsWith('data:'));
      if (premiere == null && imgs.length >= 1) premiere = performance.now() - t0; if (toutes == null && imgs.length >= N) toutes = performance.now() - t0; }, 20);
    for (let k = 0; k < 2000 && toutes == null; k++) await new Promise(r => setTimeout(r, 50));
    clearInterval(sonde);
    return { N, premiere: premiere == null ? null : Math.round(premiere), toutes: toutes == null ? null : Math.round(toutes) };
  });
  console.log('photos', nS, '· première photo À L\'ÉCRAN à', r.premiere, 'ms · toutes à', r.toutes, 'ms · appels', appels, '· max simultanés', maxSim, '· ×' + (cpuS || 4));
  await br.close(); s.close(); api.close();
})().catch(e => { console.error(e); process.exit(1); });
