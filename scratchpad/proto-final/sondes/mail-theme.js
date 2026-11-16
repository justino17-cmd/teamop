// Sonde « thème » : Jour / Nuit / Auto du prototype changent le module EN DIRECT (lecture ouverte, sans le remonter), et la lecture reste lisible AU PIXEL
// sous le verre (le calcul ment : CLAUDE.md). On capture le rectangle de l'élément (jamais une géométrie recalculée) et on lit ses pixels.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
// contraste mesuré sur l'image : le fond = la couleur la plus fréquente ; l'encre = la moyenne des 2 % de pixels les plus éloignés du fond
const contraste = async (c, sel) => {
  const clip = await S(c, s => { const e = window.R().querySelector(s); if (!e) return null; e.scrollIntoView({ block:'nearest' }); const r = e.getBoundingClientRect(); return { x:Math.max(0, r.left), y:Math.max(0, r.top), width:Math.min(r.width, innerWidth - r.left), height:Math.min(r.height, 120) }; }, sel);
  if (!clip) return null; const png = await c.p.screenshot({ clip }); const b64 = png.toString('base64');
  return c.p.evaluate(async b => { const im = new Image(); im.src = 'data:image/png;base64,' + b; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height).data, L = (r, gg, bb) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(gg) + .0722 * f(bb); };
    const cnt = {}; for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3); cnt[k] = (cnt[k] || 0) + 1; }
    const fond = Object.keys(cnt).sort((a, z) => cnt[z] - cnt[a])[0].split(',').map(x => x * 8 + 4), Lf = L(...fond), liste = [];
    for (let i = 0; i < d.length; i += 4) { const l = L(d[i], d[i + 1], d[i + 2]); liste.push([(Math.max(l, Lf) + .05) / (Math.min(l, Lf) + .05), l]); }
    liste.sort((a, z) => z[0] - a[0]); const n = Math.max(3, Math.floor(liste.length * .02)); let s = 0; for (let i = 0; i < n; i++) s += liste[i][1]; const Le = s / n;
    return { fond:fond.join(','), ratio:Math.round(((Math.max(Le, Lf) + .05) / (Math.min(Le, Lf) + .05)) * 100) / 100, pixels:liste.length }; }, b64); };
(async () => {
  const c = await entrer({ profil:'mac' }), p = c.p;
  await ouvrirMsg(c, 'm1');
  await p.locator('#courrier-hote .msg.sel').first().click(); await p.waitForTimeout(300);
  await S(c, () => { window.__n = document.querySelector('[data-opcourrier]'); });
  const mesures = {};
  for (const mode of ['jour', 'nuit', 'jour', 'auto']) {
    await S(c, m => { document.querySelector('[data-modetheme="' + m + '"]').click(); }, mode); await lib.calme(p, 700);
    const e = await S(c, () => ({ mode:document.documentElement.dataset.mode, scheme:getComputedStyle(window.R().host).colorScheme, memeNoeud:document.querySelector('[data-opcourrier]') === window.__n, sujet:!!window.R().querySelector('.rsubj'), fond:getComputedStyle(window.R().querySelector('.opc')).getPropertyValue('--label').trim() }));
    const attendu = mode === 'jour' ? 'light' : mode === 'nuit' ? 'dark' : (e.mode === 'nuit' ? 'dark' : 'light');
    v('bascule « ' + mode + ' » en direct : le module change de thème sans être remonté, la lecture reste ouverte', e.scheme === attendu && e.memeNoeud && e.sujet, e);
    if (mode !== 'auto') { mesures[mode] = { corps:await contraste(c, '.rbody p'), titre:await contraste(c, '.rsubj'), ligne:await contraste(c, '.msg:not(.sel) .m-from'), apercu:await contraste(c, '.msg:not(.sel) .m-prev'), bouton:await contraste(c, '.hband .btn:not(.primary)'), lien:await contraste(c, '.hband .hliens .lnk') };
      await cap(c, 'theme-' + mode); } }
  for (const mode of ['jour', 'nuit']) for (const [k, seuil] of [['corps', 4.5], ['titre', 4.5], ['ligne', 4.5], ['apercu', 3.0], ['bouton', 4.5], ['lien', 3.0]]) { const m = mesures[mode][k];
    v('contraste au pixel en ' + mode + ' : ' + k + ' ≥ ' + seuil + ' (population ' + (m ? m.pixels : 0) + ' pixels)', !!m && m.pixels > 500 && m.ratio >= seuil, m); }
  if (process.env.DEBUG) console.log(JSON.stringify(mesures));
  v('le fond du jour et celui de la nuit diffèrent (la mesure ne lit pas deux fois la même chose)', mesures.jour.corps.fond !== mesures.nuit.corps.fond, [mesures.jour.corps.fond, mesures.nuit.corps.fond]);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await fin(c); await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
