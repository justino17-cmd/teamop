/* Sonde du PROTOTYPE d'OP MESSAGES (apercu/prototype-op-messages.html, 13 novembre 2026) — page autonome, données fictives.
   Lancer depuis la racine du dépôt : node scratchpad/sonde-proto-messages.js   (captures dans le dossier donné par CAPS, sinon aucune capture n'est gardée ailleurs que dans cap/)
   Chaque route × cinq profils (Mac, Windows, iPad, iPhone, Android) × jour et nuit : erreurs JavaScript, débordement latéral. CAP=tout ou CAP=route,route pour capturer ; PROFILS=mac,iphone pour restreindre. */
// Sonde du prototype OP MESSAGES : chaque route, par profil d'appareil, jour et nuit. Erreurs JS, débordement latéral, captures.
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html');
const CAPS = process.env.CAPS || path.join(require('os').tmpdir(), 'proto-opmsg-cap'); fs.mkdirSync(CAPS, { recursive: true });
const PROFILS = [
  { n: 'mac', w: 1440, h: 900 }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true },
  { n: 'iphone', w: 393, h: 852, tactile: true, dsf: 3 }, { n: 'android', w: 360, h: 780, tactile: true, dsf: 3 },
  /* 13 novembre 2026, « tout type d'appareil » : la tablette couchée, la tablette Android, le téléphone couché, le petit portable, le grand écran */
  { n: 'ipad-paysage', w: 1180, h: 820, tactile: true }, { n: 'android-tablette', w: 800, h: 1280, tactile: true }, { n: 'iphone-paysage', w: 852, h: 393, tactile: true },
  { n: 'android-grand', w: 412, h: 915, tactile: true }, { n: 'portable', w: 1024, h: 700 }, { n: 'grand-ecran', w: 1920, h: 1080 },
];
const ROUTES = ['aujourdhui', 'messages', 'messages-x-equipe', 'messages-x-marc', 'messages-x-james', 'appels', 'appels-x-a1', 'agenda', 'agenda-x-e0', 'courrier', 'contacts-x-marc', 'reglages', 'idees'];
(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null;
  const b = await chromium.launch(); let fautes = 0, vus = 0;
  for (const p of PROFILS) { if (seuls && !seuls.includes(p.n)) continue;
    for (const theme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: p.w < 500, deviceScaleFactor: process.env.CAP ? 2 : 1, colorScheme: theme });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push('JS ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
      await page.goto(FICHIER); await page.waitForTimeout(200);
      for (const r of ROUTES) {
        await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(520);
        if (r === 'courrier') await page.waitForFunction(() => { const h = document.querySelector('#zone-courrier-pro [data-opcourrier]'); return h && h.shadowRoot && h.shadowRoot.querySelectorAll('#rows .msg').length > 0; }, null, { timeout: 8000 }).catch(() => {});
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
          /* le Courrier est le VRAI module (arbre d'ombre) : on compte ses lignes, pas le texte de la scène */
          sc: location.hash === '#courrier' ? (() => { const h = document.querySelector('#zone-courrier-pro [data-opcourrier]'); return h && h.shadowRoot ? h.shadowRoot.querySelectorAll('#rows .msg').length * 1000 : 0; })() : document.querySelector('#scene').innerHTML.length,
          hors: Array.from(document.querySelectorAll('#scene *, #bande *, #barre-bas *, #courrier-fixe, #courrier-fixe > div:not([hidden])')).filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; let a = e.parentElement; while (a) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { const ar = a.getBoundingClientRect(); if (r.right > ar.right + 1 || r.left < ar.left - 1) return false; } a = a.parentElement; } return r.right > innerWidth + 1 || r.left < -1; }).slice(0, 3).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().right)) }));
        vus++;
        if (m.sw > p.w + 1 || m.hors.length || m.sc < 200) { fautes++; console.log('✗', p.n, theme, r, JSON.stringify(m)); }
        if (process.env.CAP && (process.env.CAP === 'tout' || process.env.CAP.split(',').includes(r))) await page.screenshot({ path: path.join(CAPS, `${p.n}-${theme}-${r}.png`) });
      }
      if (errs.length) { fautes += errs.length; console.log('✗ erreurs', p.n, theme, errs.slice(0, 5)); }
      await ctx.close();
    } }
  console.log(`${vus} écrans vus · ${fautes} faute(s)`); await b.close(); process.exit(fautes ? 1 : 0);
})();
