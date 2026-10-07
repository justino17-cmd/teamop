/* ══ SONDE — OP MESSAGES SUR CHAQUE APPAREIL : CE QUE `data-plat` DÉCIDE, MESURÉ DANS LA VRAIE PAGE SERVIE ══════════════════════════════════════════════════════════
   7 octobre 2026 : « look Apple partout ; adapte le comportement selon data-plat : iPhone (tactile, barre d'onglets, encoches), iPad (menu latéral dès 781 px, pas de barre d'onglets),
   Mac (souris, verre si Safari 26), Windows et Android (même identité Apple, mais sans verre natif ni faux éléments système). Mesure au navigateur sur ces profils. »
   Chaque profil est un VRAI agent (l'en-tête User-Agent, les points de contact, l'écran, les encoches posées par `Emulation.setSafeAreaInsetsOverride` : un navigateur piloté les rend à 0
   sinon, CLAUDE.md). Pour chacun, contre le VRAI service :
     1. les attributs posés sur <html> (data-plat, data-os, data-kind, data-verre-natif) ;
     2. LA navigation : la barre d'onglets OU le menu latéral, jamais les deux, jamais aucune — et l'entrée du Profil (l'avatar au bout du titre, ou la carte du bas) ;
     3. la matière : le reflet du Liquid Glass sur la barre seulement là où il est natif ; les rayons des cartes du système (26 · 12 · 28 · 8 · 12 au Mac — 10 jusqu'au 7 octobre 2026, quand les Réglages du bureau ont grandi : lignes de 48 px, texte de 15) ;
     4. les encoches : le titre sous l'encoche du haut, la barre d'onglets au-dessus de celle du bas ;
     5. aucun écran ne glisse de côté (Messages, Contacts, Appels, Agenda, Profil — la page interrogée, `scrollTo` puis `scrollX`), aucune erreur JavaScript ;
     6. ⛔ aucun faux élément système : ni barre d'état, ni feux de fenêtre, ni barre d'adresse dessinés.
   ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-appareils.js     CAPTURES=/dossier pour les images (une par profil et par écran).
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOT = 'pw-alice-1234';
const UA = {
  ios26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  ios18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  macSafari26: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36'
};
/* nav : 'onglets' (barre du bas) ou 'menu' (barre latérale) ; rayon : celui d'une carte de Profil */
const PROFILS = [
  { nom: 'iPhone 393 · iOS 26 Safari', ua: UA.ios26, w: 393, h: 852, dpr: 3, touch: 5, mobile: true, insets: { top: 59, bottom: 34 }, plat: 'iosweb', os: 'ios', kind: 'mobile', natif: true, nav: 'onglets', rayon: 26 },
  { nom: 'iPhone 393 · iOS 18', ua: UA.ios18, w: 393, h: 852, dpr: 3, touch: 5, mobile: true, insets: { top: 59, bottom: 34 }, plat: 'ios18', os: 'ios', kind: 'mobile', natif: false, nav: 'onglets', rayon: 12 },
  { nom: 'iPad 820 portrait · iPadOS 26', ua: UA.macSafari26, w: 820, h: 1180, dpr: 2, touch: 5, mobile: true, insets: { top: 24, bottom: 20 }, plat: 'iosweb', os: 'ios', kind: 'tablette', natif: true, nav: 'menu', rayon: 26 },
  { nom: 'iPad 1180 paysage · iPadOS 26', ua: UA.macSafari26, w: 1180, h: 820, dpr: 2, touch: 5, mobile: true, insets: { top: 24, bottom: 20 }, plat: 'iosweb', os: 'ios', kind: 'tablette', natif: true, nav: 'menu', rayon: 26 },
  { nom: 'iPad mini 744 portrait', ua: UA.macSafari26, w: 744, h: 1133, dpr: 2, touch: 5, mobile: true, insets: { top: 24, bottom: 20 }, plat: 'iosweb', os: 'ios', kind: 'tablette', natif: true, nav: 'onglets', rayon: 26 },
  { nom: 'Mac 1440 · Safari 26', ua: UA.macSafari26, w: 1440, h: 900, dpr: 2, touch: 0, mobile: false, insets: null, plat: 'macweb', os: 'macos', kind: 'desktop', natif: true, nav: 'menu', rayon: 12 },
  { nom: 'Mac 1440 · Chrome', ua: UA.macChrome, w: 1440, h: 900, dpr: 2, touch: 0, mobile: false, insets: null, plat: 'macos14', os: 'macos', kind: 'desktop', natif: false, nav: 'menu', rayon: 12 },
  { nom: 'Windows 1366 · Edge', ua: UA.edge, w: 1366, h: 768, dpr: 1, touch: 0, mobile: false, insets: null, plat: 'winweb', os: 'windows', kind: 'desktop', natif: false, nav: 'menu', rayon: 8 },
  { nom: 'Android 412 · Chrome', ua: UA.android, w: 412, h: 915, dpr: 2.625, touch: 5, mobile: true, insets: { top: 32, bottom: 24 }, plat: 'androidweb', os: 'android', kind: 'mobile', natif: false, nav: 'onglets', rayon: 28 }
];
const VUES = [['messages', '#messages'], ['contacts', '#contacts'], ['appels', '#appels'], ['agenda', '#reunions'], ['profil', '#reglages']];

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOT, nom: 'Alice Martin', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await T.connecter(svc, og, 'alice', MOT), B = await T.connecter(svc, og, 'bruno', 'pw-bruno-1234');
    { const k = await A.post('/api/contacts/lien', {}); await B.post('/api/liens/accepter', { code: k.j.code }); }
    for (const pf of PROFILS.filter(p => !process.env.SEULS || process.env.SEULS.split(',').some(x => p.nom.includes(x)))) {
      console.log('\n── ' + pf.nom);
      const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, screen: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.touch > 0, userAgent: pf.ua, reducedMotion: 'reduce', locale: 'fr-FR' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      const cdp = await ctx.newCDPSession(page);
      if (pf.touch) await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: pf.touch }).catch(() => {});
      let encoches = false;
      if (pf.insets) encoches = await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, topMax: pf.insets.top, bottom: pf.insets.bottom, bottomMax: pf.insets.bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } }).then(() => true, () => false);
      const attendre = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 12000, polling: 50 }).then(() => true, () => false);
      await page.goto(svc.base + '/');
      await page.fill('#c-login', 'alice'); await page.fill('#c-pass', MOT);
      if (pf.touch) await page.tap('#c-entrer'); else await page.click('#c-entrer');
      vrai('population : Alice est connectée', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      const at = await page.evaluate(() => { const r = document.documentElement; return [r.dataset.plat, r.dataset.os, r.dataset.kind, r.hasAttribute('data-verre-natif')]; });
      v('1. <html> : data-plat, data-os, data-kind, verre natif', at, [pf.plat, pf.os, pf.kind, pf.natif]);
      for (const [nom, h] of VUES) {
        await page.evaluate(x => { location.hash = x; }, h);
        await attendre(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden; }, h === '#reunions' ? 'reunions' : h === '#reglages' ? 'reglages' : nom);
        await page.waitForTimeout(250);
        const m = await page.evaluate(async () => {
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
          const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
          window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
          return { onglets: vis(document.getElementById('tabs')), menu: vis(document.querySelector('.side')), sx, dep: document.documentElement.scrollWidth };
        });
        if (nom === 'messages') {
          v('2. la navigation : ' + (pf.nav === 'onglets' ? 'la barre d\'onglets, pas le menu' : 'le menu latéral, pas la barre d\'onglets'), [m.onglets, m.menu], pf.nav === 'onglets' ? [true, false] : [false, true]);
          const entree = await page.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none'; return { pastille: vis(Array.from(document.querySelectorAll('.moi-pastille')).find(e => !e.closest('[hidden]'))), carte: vis(document.getElementById('moi-carte')), menuProfil: !!document.querySelector('#nav-side [data-vue="reglages"], #tabs [data-vue="reglages"]') }; });
          v('…l\'entrée du Profil : ' + (pf.nav === 'onglets' ? 'l\'avatar au bout du titre' : 'la carte du bas') + ', jamais un onglet « Profil »', [entree.pastille, entree.carte, entree.menuProfil], pf.nav === 'onglets' ? [true, false, false] : [false, true, false]);
          if (pf.nav === 'onglets') {
            const reflet = await page.evaluate(() => getComputedStyle(document.getElementById('tabs')).boxShadow);
            v('3. le reflet du Liquid Glass sur la barre ' + (pf.natif ? '(natif : présent)' : '(pas natif : absent)') + ' — ' + reflet.slice(0, 160), /0px 1px 0px 0px inset|inset 0px 1px 0px/.test(reflet), pf.natif);
          }
          if (encoches) {
            const g = await page.evaluate(() => { const t = document.getElementById('titre-messages').getBoundingClientRect(), o = document.getElementById('tabs').getBoundingClientRect(); return { titre: Math.round(t.top), bas: Math.round(innerHeight - o.bottom), ongletsVus: o.height > 0 }; });
            vrai('4. les encoches (' + pf.insets.top + ' / ' + pf.insets.bottom + ') : le titre commence sous celle du haut (' + g.titre + ' px)' + (pf.nav === 'onglets' ? ', la barre flotte au-dessus de celle du bas (' + g.bas + ' px)' : ''), g.titre >= pf.insets.top && (pf.nav !== 'onglets' || g.bas >= pf.insets.bottom - 8));
          }
        }
        if (nom === 'profil') {
          const r = await page.evaluate(() => { const c = document.querySelector('#vue-reglages .carte'); return c ? parseFloat(getComputedStyle(c).borderTopLeftRadius) : null; });
          v('3. une carte du Profil : ' + pf.rayon + ' px de rayon (le système)', r, pf.rayon);
        }
        vrai('5. ' + nom + ' : rien ne glisse de côté (poussée ' + m.sx + ' px, largeur ' + m.dep + ' pour ' + pf.w + ')', m.sx === 0 && m.dep <= pf.w + 1);
        if (DOSSIER) { fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, pf.nom.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-' + nom + '.png') }); }
      }
      const faux = await page.evaluate(() => { const H = document.body.innerHTML; return [/class="[^"]*\b(?:status-?bar|statusbar|island|bezel|url-?bar|address-?bar|titlebar|traffic)\b/i.test(H), Array.from(document.querySelectorAll('*')).some(e => { const c = getComputedStyle(e).backgroundColor; return /rgb\(255, 95, 87\)|rgb\(254, 188, 46\)|rgb\(40, 200, 64\)/.test(c) && e.getClientRects().length; })]; });
      v('6. ⛔ aucun faux élément système (barre d\'état, feux de fenêtre, barre d\'adresse)', faux, [false, false]);
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
