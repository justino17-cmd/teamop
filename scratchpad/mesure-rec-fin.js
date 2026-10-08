/* La carte « Enregistrement terminé » de la page, ouverte comme recFinOuvrir la remplit : ses trois gestes sont-ils VISIBLES et SOUS LE DOIGT sans défiler ? */
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const PAGE = process.argv[2] || 'file://' + require('path').join(__dirname, '..', 'apercu', 'opmessages', 'index.html');
(async () => {
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  let ko = 0;
  for (const [nom, w, h, ins, mobile] of [['iPhone portrait', 390, 844, [47, 0, 34, 0], true], ['iPhone SE portrait', 375, 667, [20, 0, 0, 0], true], ['iPhone paysage', 844, 390, [0, 47, 21, 47], true], ['iPhone SE paysage', 667, 375, [0, 0, 0, 0], true], ['Android paysage', 800, 360, [24, 0, 0, 0], true], ['bureau', 1280, 720, [0, 0, 0, 0], false], ['bureau bas', 1280, 500, [0, 0, 0, 0], false]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const [t, r, bo, l] = ins;
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: t, topMax: t, right: r, rightMax: r, bottom: bo, bottomMax: bo, left: l, leftMax: l } }).catch(e => console.log('encoches non simulées :', e.message));
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const $ = id => document.getElementById(id);
      $('rec-fin-info').textContent = 'Point équipe du lundi · 1 min 07 s · 2,4 Mo';
      $('rec-fin-absents').textContent = 'Pas là : Dan Banc, Fay Banc — l\'enregistrement leur parviendra dans la discussion de la réunion.'; $('rec-fin-absents').hidden = false;
      $('rec-fin-envoyer').hidden = false; $('rec-fin-garde').hidden = false; $('rec-fin').hidden = false;
      const carte = document.querySelector('.rec-fin-carte').getBoundingClientRect();
      const g = id => { const q = $(id).getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2; const dedans = q.top >= Math.max(0, carte.top) && q.bottom <= Math.min(innerHeight, carte.bottom) && q.left >= 0 && q.right <= innerWidth; const t = dedans ? document.elementFromPoint(x, y) : null; return { y: [Math.round(q.top), Math.round(q.bottom)], h: Math.round(q.height), sousLeDoigt: !!t && (t === $(id) || $(id).contains(t)) }; };
      const v = $('rec-fin-video').getBoundingClientRect();
      return { carte: [Math.round(carte.left), Math.round(carte.top), Math.round(carte.width), Math.round(carte.height)], video: [Math.round(v.width), Math.round(v.height)], envoyer: g('rec-fin-envoyer'), garder: g('rec-fin-garder'), jeter: g('rec-fin-jeter'), defileX: document.documentElement.scrollWidth > innerWidth };
    });
    const ok = m.envoyer.sousLeDoigt && m.garder.sousLeDoigt && m.jeter.sousLeDoigt && m.envoyer.h >= 44 && m.garder.h >= 44 && m.jeter.h >= 44;
    if (!ok) ko++;
    console.log((ok ? '✓ ' : '✗ ') + nom + ' ' + w + '×' + h + ' : ' + JSON.stringify(m));
    await ctx.close();
  }
  await b.close();
  console.log(ko ? ko + ' format(s) où un geste n\'est pas sous le doigt' : 'les trois gestes visibles et sous le doigt partout');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('mort :', e); process.exit(1); });
