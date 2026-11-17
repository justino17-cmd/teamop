/* Sonde du PROTOTYPE d'OP MESSAGES, côté Pro (apercu/prototype-op-messages.html, refait le 16 novembre 2026) — page autonome, données fictives.
   Lancer depuis la racine : node scratchpad/sonde-proto-messages.js      CAP=tout (ou CAP=route,route) garde des captures dans CAPS ; PROFILS=mac,iphone restreint.
   Chaque écran × onze profils d'appareil × jour et nuit : erreurs JavaScript, débordement latéral (contre la largeur POSÉE du profil), contenu réellement rendu. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html');
const CAPS = process.env.CAPS || path.join(require('os').tmpdir(), 'proto-opmsg-cap'); fs.mkdirSync(CAPS, { recursive: true });
const PROFILS = [
  { n: 'mac', w: 1440, h: 900 }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true },
  { n: 'iphone', w: 393, h: 852, tactile: true }, { n: 'android', w: 360, h: 780, tactile: true },
  { n: 'ipad-paysage', w: 1180, h: 820, tactile: true }, { n: 'android-tablette', w: 800, h: 1280, tactile: true }, { n: 'iphone-paysage', w: 852, h: 393, tactile: true },
  { n: 'android-grand', w: 412, h: 915, tactile: true }, { n: 'portable', w: 1024, h: 700 }, { n: 'grand-ecran', w: 1920, h: 1080 },
];
const ROUTES = ['accueil', 'activite', 'messages', 'messages/equipe', 'messages/marc', 'messages/sophie', 'contacts', 'contacts/karim', 'appels', 'appels/a1', 'reunions', 'reunions/e1', 'reunions/e6', 'agenda', 'courrier', 'profil'];
(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null;
  const b = await chromium.launch(); let fautes = 0, vus = 0;
  for (const p of PROFILS) { if (seuls && !seuls.includes(p.n)) continue;
    for (const theme of ['light', 'dark']) {
      const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: p.w < 500, deviceScaleFactor: process.env.CAP ? 2 : 1, colorScheme: theme, reducedMotion: 'reduce' });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push('JS ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
      await page.goto(FICHIER); await page.waitForTimeout(250);
      for (const r of ROUTES) {
        await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(300);
        if (r === 'courrier') await page.waitForFunction(() => { const h = document.querySelector('#zone-courrier [data-opcourrier]'); return h && h.shadowRoot && h.shadowRoot.querySelectorAll('#rows .msg').length > 0; }, null, { timeout: 8000 }).catch(() => {});
        const m = await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; res({ sw: document.documentElement.scrollWidth,
          /* le Courrier est le VRAI module (arbre d'ombre) : on compte ses lignes, pas le texte de la scène */
          sc: location.hash === '#courrier' ? (() => { const h = document.querySelector('#zone-courrier [data-opcourrier]'); return h && h.shadowRoot ? h.shadowRoot.querySelectorAll('#rows .msg').length * 1000 : 0; })() : document.querySelector('#scene').textContent.trim().length,
          hors: Array.from(document.querySelectorAll('#scene *, #onglets *, #cote *, #haut *')).filter((e) => { const r = e.getBoundingClientRect(); if (!r.width || e.closest('.epingles,.puces,.an-outils,.an-sous,.filtres')) return false; return r.right > innerWidth + 1 || r.left < -1; }).slice(0, 3).map((e) => e.className + '|' + e.textContent.trim().slice(0, 30)),
          theme: document.documentElement.dataset.theme }); }))));
        vus++;
        if (m.sw > p.w + 1 || m.hors.length || m.sc < 120 || m.theme !== theme) { fautes++; console.log('✗', p.n, theme, r, JSON.stringify(m)); }
        if (process.env.CAP && (process.env.CAP === 'tout' || process.env.CAP.split(',').includes(r))) await page.screenshot({ path: path.join(CAPS, `${p.n}-${theme}-${r.replace('/', '_')}.png`) });
      }
      /* le côté Perso */
      await page.evaluate(() => { changerMode('perso', true); });
      for (const r of ['messages', 'messages/famille', 'appels', 'agenda', 'contacts/cath', 'profil']) { await page.evaluate((h) => { location.hash = h; }, r); await page.waitForTimeout(280);
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sc: document.querySelector('#scene').textContent.trim().length, cote: document.documentElement.dataset.cote })); vus++;
        if (m.sw > p.w + 1 || m.sc < 120 || m.cote !== 'perso') { fautes++; console.log('✗', p.n, theme, 'perso:' + r, JSON.stringify(m)); }
        if (process.env.CAP && process.env.CAP.split(',').includes('perso')) await page.screenshot({ path: path.join(CAPS, `${p.n}-${theme}-perso-${r.replace('/', '_')}.png`) }); }
      if (errs.length) { fautes += errs.length; console.log('✗ erreurs', p.n, theme, errs.slice(0, 5)); }
      await ctx.close();
    } }
  console.log(`${vus} écrans vus · ${fautes} faute(s)`); await b.close(); process.exit(fautes ? 1 : 0);
})();
