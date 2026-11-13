/* Sonde des CIBLES TACTILES d'OP Courrier (13 novembre 2026) — ce qu'un doigt touche, sous 40 px, sur iPhone, Android, iPad (portrait et paysage) :
   réception, lecture, rédaction. Elle part de TOUT ce qui se touche dans l'arbre d'ombre (jamais d'une liste de classes) et dit sa population.
   Trouvé ce jour-là : « Sélectionner » à 28 px et les réponses rapides à 30 px sur iPad (le plancher était posé sur le format téléphone, pas sur le doigt).
   Puis le segmenté « Tous / Non lus / Marqués » à 30 px sur un iPad en paysage (format ordinateur, au doigt).
   Restent SOUS 40 px, nommés : les champs de saisie (36 px, hauteur d'un champ) ; les réponses rapides et le segmenté sont dessinés à 36 px, leur ZONE QUI RÉPOND fait 44 px (vérifiée ici).
   Lancer : NODE_PATH=<dossier de playwright-core> node scratchpad/courrier/cibles-tactiles.js   (voir l'en-tête de pilote.js) — sort en 1 au moindre écart. */
const { ouvrir } = require('./pilote.js');
const SEUIL = +process.env.SEUIL || 40;
(async () => {
  const P = await ouvrir(); const tout = {}; let pop = 0, zonesCourtes = 0;
  for (const p of [{ n: 'iphone', w: 393, h: 852 }, { n: 'android', w: 360, h: 780 }, { n: 'ipad', w: 820, h: 1180 }, { n: 'ipad-paysage', w: 1180, h: 820 }]) {
    const ctx = await P.ctxPour({ viewport: { width: p.w, height: p.h }, hasTouch: true, isMobile: p.w < 500 });
    const page = await ctx.newPage(); await page.goto(P.avec('mode=demo&cotes=pro,perso&cle=cib_' + p.n)); await page.waitForTimeout(500);
    const releve = async (etat) => { const l = await page.evaluate((seuil) => { const sr = document.querySelector('[data-opcourrier]').shadowRoot; const out = []; let n = 0, rq = 0;
        sr.querySelectorAll('button,a[href],select,input:not([type=hidden]):not([type=file]),[role=button],[data-act],.msg,.folder,.srow').forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return; const top = sr.elementFromPoint(cx, cy); if (!top || !(top === e || e.contains(top) || top.contains(e))) return; n++;
          /* la zone qui RÉPOND : l'élément, ou son label */
          let h = r.height, w = r.width; const lab = e.closest('label'); if (lab) { const lr = lab.getBoundingClientRect(); h = Math.max(h, lr.height); w = Math.max(w, lr.width); }
          /* une zone étendue par un pseudo-élément (réponses rapides) : on demande à la page qui répond 3 px au-dessus et au-dessous */
          if (h < seuil && e.closest('.rquick,.seg')) { const haut = sr.elementFromPoint(cx, r.top - 3), bas = sr.elementFromPoint(cx, r.bottom + 3); if (haut === e && bas === e) h += 8; else rq++; }
          if (h < seuil || w < seuil) out.push((e.id ? '#' + e.id : '.' + String(e.className).split(' ').filter(Boolean).join('.')) + (e.dataset.act ? '[' + e.dataset.act + ']' : '') + ' ' + Math.round(w) + '×' + Math.round(h)); });
        return { out, n, rq }; }, SEUIL); zonesCourtes += l.rq; pop += l.n; l.out.forEach((x) => { const k = x.replace(/ \d+×\d+$/, ''); (tout[k] = tout[k] || new Set()).add(p.n + ':' + etat + ' ' + x.match(/\d+×\d+$/)[0]); }); };
    const tel = p.w < 700;
    await releve('ouverture');
    if (tel) { const f = page.locator('.folder[data-folder="inbox"]').first(); if (await f.isVisible().catch(() => false)) { await f.click(); await page.waitForTimeout(300); await releve('liste'); } }
    const l1 = page.locator('#rows .msg').first(); if (await l1.isVisible().catch(() => false)) { await l1.click(); await page.waitForTimeout(350); await releve('lecture'); }
    const c = page.locator('#btnCompose').first(); if (await c.isVisible().catch(() => false)) { await c.click(); await page.waitForTimeout(350); await releve('ecrire'); await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await ctx.close();
  }
  console.log('population : ' + pop + ' cibles touchables relevées');
  Object.keys(tout).sort().forEach((k) => console.log(k + '  ←  ' + Array.from(tout[k]).slice(0, 5).join(' ; ')));
  const ADMIS = ['#search', '#cTo', '#cSub', '#cFrom', '#cCc', '#cBcc'];                       // des champs de saisie : 36 px, on y écrit, on ne les vise pas
  const ecarts = Object.keys(tout).filter((k) => !ADMIS.includes(k));
  console.log(Object.keys(tout).length + ' famille(s) sous ' + SEUIL + ' px, dont ' + ecarts.length + ' hors des champs de saisie' + (ecarts.length ? ' : ' + ecarts.join(', ') : '') + ' · zones qui répondent trop courtes : ' + zonesCourtes);
  await P.fermer(); process.exit(ecarts.length || zonesCourtes || pop < 100 ? 1 : 0);
})();
