/* Ce que coûte chaque pièce de l'enregistrement local de la salle (opmsg-ui.js, recDemarrer / recDessiner), mesuré sur une page ISOLÉE (quatre
   vidéos de la fausse caméra, une toile redessinée 24 fois par seconde, sa capture, l'encodeur) : images par seconde de la page (requestAnimationFrame),
   dessins par seconde, temps d'un dessin, octets produits.
   Usage : node scratchpad/mesure-cout-rec.js          les options de l'ancienne sonde de groupe (SwiftShader, le GPU émulé)
           node scratchpad/mesure-cout-rec.js --cpu    le rendu par le processeur (--disable-gpu)
   Mesuré le 9 octobre 2026 : sous SwiftShader 30 im/s au dessin seul, 19 avec la capture, 0,1 à 2 dès qu'un encodeur (VP8 ou VP9) lit la toile ;
   par le processeur, 30,4 im/s dans tous les cas, ~9 ms par dessin. Chromium de l'image, 127.0.0.1 seulement, aucune donnée. */
'use strict';
const http = require('http');
const { chromium } = require('/opt/node-tools/node_modules/playwright-core');

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#111">
<div id="t" style="display:grid;grid-template-columns:1fr 1fr;width:390px"></div>
<script>
window.essai = async function (o) {
  const t = document.getElementById('t'); t.innerHTML = '';
  const vids = [];
  for (let i = 0; i < 4; i++) { const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }); const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = s; v.style.width = '190px'; t.appendChild(v); await v.play(); vids.push(v); }
  const cv = document.createElement('canvas'); cv.width = o.w; cv.height = o.h; const g = cv.getContext('2d');
  let dessins = 0, dessinMs = 0;
  const dessiner = () => {
    const t0 = performance.now();
    g.imageSmoothingEnabled = true; if (o.lisse) g.imageSmoothingQuality = 'high';
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, cv.width, cv.height);
    const w = cv.width / 2, h = cv.height / 2;
    vids.forEach((v, i) => { g.drawImage(v, (i % 2) * w, Math.floor(i / 2) * h, w, h); g.fillStyle = '#fff'; g.font = '600 18px sans-serif'; g.fillText('Nom ' + i, (i % 2) * w + 12, Math.floor(i / 2) * h + h - 12); });
    dessinMs += performance.now() - t0; dessins++;
  };
  let rec = null, octets = 0, flux = null;
  if (o.capture) { flux = cv.captureStream(o.ips); }
  if (o.codec) { rec = new MediaRecorder(flux, { mimeType: 'video/webm;codecs=' + o.codec, videoBitsPerSecond: o.debit }); rec.ondataavailable = e => { octets += e.data.size; }; rec.start(1000); }
  const minuterie = setInterval(dessiner, Math.round(1000 / o.ips));
  await new Promise(r => setTimeout(r, 1500));            // la mise en route
  dessins = 0; dessinMs = 0;
  const tA = performance.now();
  const ips = await new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); });
  const duree = (performance.now() - tA) / 1000;
  const res = { ipsPage: Math.round(ips * 10) / 10, fenetreS: Math.round(duree * 10) / 10, dessinsParS: Math.round(dessins / duree * 10) / 10, msParDessin: dessins ? Math.round(dessinMs / dessins * 10) / 10 : null };
  clearInterval(minuterie);
  if (rec) { await new Promise(r => { rec.onstop = r; rec.stop(); }); res.koParS = Math.round(octets / 1024 / 5.5); }
  if (flux) flux.getTracks().forEach(x => x.stop());
  vids.forEach(v => v.srcObject.getTracks().forEach(x => x.stop()));
  return res;
};
</script>`;

(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(PAGE); }).listen(0, '127.0.0.1');
  await new Promise(r => srv.on('listening', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const CPU = process.argv.includes('--cpu');          // le chemin sans GPU émulé (rendu par le processeur), pour comparer à SwiftShader
  const ARGS = (CPU ? ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--mute-audio'] : ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'])
    .concat(['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']);
  console.log(CPU ? '── rendu par le PROCESSEUR (--disable-gpu)' : '── rendu par SwiftShader (les options de la sonde)');
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ARGS });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(url);
  const essais = [
    ['repos (rien n\'est dessiné)', { w: 2, h: 2, ips: 1, lisse: false }],
    ['dessin seul 1280×720, lissage « high »', { w: 1280, h: 720, ips: 24, lisse: true }],
    ['+ capture de la toile', { w: 1280, h: 720, ips: 24, lisse: true, capture: true }],
    ['+ encodeur VP8 2 Mb/s', { w: 1280, h: 720, ips: 24, lisse: true, capture: true, codec: 'vp8,opus', debit: 2000000 }],
    ['+ encodeur VP9 2 Mb/s (le réglage du téléphone)', { w: 1280, h: 720, ips: 24, lisse: true, capture: true, codec: 'vp9,opus', debit: 2000000 }],
    ['VP9, lissage par défaut', { w: 1280, h: 720, ips: 24, lisse: false, capture: true, codec: 'vp9,opus', debit: 2000000 }],
    ['VP9, 960×540', { w: 960, h: 540, ips: 24, lisse: true, capture: true, codec: 'vp9,opus', debit: 1500000 }],
    ['VP8, 960×540', { w: 960, h: 540, ips: 24, lisse: true, capture: true, codec: 'vp8,opus', debit: 1500000 }],
  ];
  for (const [nom, o] of essais) {
    const t = Date.now();
    let r; try { r = await page.evaluate((x) => window.essai(x), o); } catch (e) { r = { erreur: String(e.message).slice(0, 120) }; }
    console.log((nom + ' '.repeat(48)).slice(0, 48) + ' ' + JSON.stringify(r) + '  (' + Math.round((Date.now() - t) / 100) / 10 + ' s)');
  }
  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
