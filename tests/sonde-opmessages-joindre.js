/* ══ SONDE — LE « + » À LA SOURIS ET AU DOIGT (la vraie page servie, le vrai service) ══
   7 octobre 2026, capture à l'appui : « quand je clique sur le +, il faudrait pas que ça se mette comme ça » — au bureau, la grille s'ouvrait AU MILIEU de la
   conversation, sous un voile. À la souris, le menu SORT du « + » (une liste comme Messages sur Mac, collée au bouton, sans voile) ; au doigt, la grille
   reste la feuille du bas. ⛔ Mesuré, pas relu : le rectangle du menu contre celui du bouton.   Lancer : node tests/sonde-opmessages-joindre.js  (CAPTURES=/dossier) */
const path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
let pw; for (const c of ['playwright-core', '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core']) { try { pw = require(c); break; } catch (e) {} }
const DOSSIER = process.env.CAPTURES;
(async () => {
  const og = await T.fauxOpGestion({ ana: { pass: 'pw-ana-12345678', nom: 'Ana Banc', actif: true }, ben: { pass: 'pw-ben-12345678', nom: 'Ben Banc', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'] });
  const A0 = await T.connecter(svc, og, 'ana', 'pw-ana-12345678'), B0 = await T.connecter(svc, og, 'ben', 'pw-ben-12345678');
  { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
  const G = (await A0.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B0.moi.id] })).j.conversation.id;
  const res = {};
  for (const [nom, opts] of [['bureau', { viewport: { width: 1280, height: 800 } }], ['telephone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR' }, opts)); const page = await ctx.newPage();
    const err = []; page.on('pageerror', e => err.push(String(e.message)));
    await page.goto(svc.base + '/'); await page.locator('#c-login').fill('ana'); await page.locator('#c-pass').fill('pw-ana-12345678'); await page.locator('#c-entrer').click();
    await page.waitForFunction(() => !document.getElementById('app').hidden && document.getElementById('moi-nom').textContent.trim());
    await page.evaluate(g => { location.hash = '#messages/' + g; }, G); await page.waitForFunction(() => document.documentElement.dataset.conv === '1');
    await page.locator('#compo-plus').click(); await page.waitForTimeout(500);
    res[nom] = await page.evaluate(() => {
      const m = document.getElementById('menu-msg'), p = document.getElementById('compo-plus'), f = document.getElementById('menu-fond');
      const a = m.getBoundingClientRect(), q = p.getBoundingClientRect();
      return { menu: [Math.round(a.left), Math.round(a.top), Math.round(a.right), Math.round(a.bottom)], plus: [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)], fond: getComputedStyle(f).backgroundColor, colonnes: getComputedStyle(m).gridTemplateColumns.split(' ').length, vw: innerWidth, vh: innerHeight };
    });
    res[nom].err = err;
    if (DOSSIER) await page.screenshot({ path: path.join(DOSSIER, 'plus-' + nom + '.png') });
    await ctx.close();
  }
  const B = res.bureau, P = res.telephone;
  vrai('au bureau : le menu sort du « + » — juste au-dessus (≤ 16 px), aligné sur son bord gauche (± 12 px) : ' + JSON.stringify([B.menu, B.plus]), B.menu[3] <= B.plus[1] && B.plus[1] - B.menu[3] <= 16 && Math.abs(B.menu[0] - B.plus[0]) <= 12);
  v('au bureau : une liste (une colonne), sans voile sur la conversation', [B.colonnes, B.fond], [1, 'rgba(0, 0, 0, 0)']);
  vrai('au doigt : la grille (trois colonnes), la feuille du bas sous un voile', P.colonnes === 3 && P.fond !== 'rgba(0, 0, 0, 0)' && P.menu[3] > P.vh - 40);
  v('aucune erreur JavaScript', [B.err, P.err], [[], []]);
  await b.close(); await svc.arreter(); await og.fermer();
  fin();
})().catch(e => { console.error(e); process.exit(1); });
