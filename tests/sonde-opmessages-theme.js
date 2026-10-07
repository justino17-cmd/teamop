/* ══ SONDE — LE THÈME D'UNE CONVERSATION : SON FOND, LA COULEUR DE MES BULLES (la vraie page servie, deux navigateurs, au téléphone, de jour et de nuit) ══════════════════════════════
   7 octobre 2026 : « personnaliser les conversations, mettre des thèmes derrière, les bulles de couleurs ». Contre le VRAI service, Ana et Ben dans « Équipe », à 390 px :
     1. les infos de la conversation ont « Fond et couleurs » (« Par défaut ») ; la feuille montre un aperçu, sept fonds et huit couleurs ;
     2. Ana touche « Océan » puis « Violet » : l'aperçu ET l'écran de la conversation changent tout de suite ; le service l'a retenu ;
     3. ⛔ À ELLE SEULE : chez Ben, la même conversation garde le fond et les bulles par défaut ;
     4. ⛔ LISIBLE : le texte de ses bulles violettes passe 4,5:1 ; la date et les messages du système, posés sur le fond, aussi — de jour ET de nuit (au pixel, sur la capture) ;
     5. « Par défaut » remet tout ; aucune erreur JavaScript.
   Lancer :   node tests/sonde-opmessages-theme.js   (CAPTURES=/dossier pour les images)   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };

/* un PNG lu sans dépendance (zlib + défiltrage) : la couleur d'un point de la capture */
function lirePng(buf) {
  let o = 8, w = 0, h = 0, type = 6, idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; if (d[8] !== 8 || (type !== 2 && type !== 6)) throw new Error('PNG non lu : profondeur ' + d[8] + ', type ' + type); } else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  /* ⛔ la profondeur se LIT (relevé du 7 octobre : une capture est en RVB, 3 octets par point — la lire en RVBA rendait « 21:1 » partout, le chiffre extrême qui signe une mesure fausse) */
  const raw = zlib.inflateSync(Buffer.concat(idat)), bpp = type === 6 ? 4 : 3, ligne = w * bpp, px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (ligne + 1)], src = raw.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1));
    for (let x = 0; x < ligne; x++) {
      const a = x >= bpp ? px[y * ligne + x - bpp] : 0, b = y ? px[(y - 1) * ligne + x] : 0, c = x >= bpp && y ? px[(y - 1) * ligne + x - bpp] : 0;
      let v2 = src[x];
      if (f === 1) v2 += a; else if (f === 2) v2 += b; else if (f === 3) v2 += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v2 += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * ligne + x] = v2 & 255;
    }
  }
  return { w, h, px, bpp };
}
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const contraste = (a, b) => { const x = lum(...a), y = lum(...b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
/* le contraste d'un texte dans une capture de SA boîte : l'encre = le point le plus éloigné du fond, le fond = la couleur la plus fréquente */
function contrasteCapture(buf) {
  const { w, h, px, bpp } = lirePng(buf), compte = new Map();
  for (let i = 0; i < w * h; i++) { const k = px[i * bpp] + ',' + px[i * bpp + 1] + ',' + px[i * bpp + 2]; compte.set(k, (compte.get(k) || 0) + 1); }
  const fond = Array.from(compte.entries()).sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  let mieux = 1;
  for (const k of compte.keys()) { const c = k.split(',').map(Number); const r = contraste(c, fond); if (r > mieux) mieux = r; }
  return { fond, ratio: Math.round(mieux * 100) / 100 };
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B0.moi.id] })).j.conversation.id;
    for (const [P, t] of [[A0, 'On se voit demain ?'], [B0, 'Oui, à 9 h au dépôt.']]) await P.post('/api/conversations/' + G + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2), texte: t });
    const ouvrir = async (login, sombre) => {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: sombre ? 'dark' : 'light' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [] }; page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      await page.evaluate(g => { location.hash = '#messages/' + g; }, G);
      await page.waitForFunction(() => document.documentElement.dataset.conv === '1' && document.querySelectorAll('#conv-messages .msg').length >= 2, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const A = await ouvrir('ana', false), B = await ouvrir('ben', false);

    console.log('\n1. « Fond et couleurs »');
    await A.page.locator('#conv-titre').click();
    vrai('les infos de la conversation ont « Fond et couleurs » — « Par défaut »', await att(A, () => { const x = document.querySelector('#info-corps [data-act="theme"]'); return !!x && /Fond et couleurs/.test(x.textContent) && /Par défaut/.test(x.textContent); }));
    await A.page.waitForTimeout(400);
    await A.page.locator('#info-corps [data-act="theme"]').click();
    vrai('la feuille : un aperçu, huit choix de fond (dont « Par défaut »), neuf couleurs', await att(A, () => document.getElementById('feuille-titre').textContent === 'Fond et couleurs' && !!document.getElementById('theme-apercu') && document.querySelectorAll('.theme-fond').length === 8 && document.querySelectorAll('.theme-pastille').length === 9));

    console.log('\n2. Océan, bulles violettes');
    await A.page.locator('.theme-fond[data-fond="ocean"]').click();
    await A.page.locator('.theme-pastille[data-bulle="violet"]').click();
    vrai('l\'aperçu change tout de suite, et un seul choix est coché par rangée', await att(A, () => { const a = document.getElementById('theme-apercu'); return a.dataset.fond === 'ocean' && a.dataset.bulle === 'violet' && document.querySelectorAll('.theme-fond[aria-checked="true"]').length === 1 && document.querySelectorAll('.theme-pastille[aria-checked="true"]').length === 1; }));
    await capture(A, 'theme-1-feuille');
    vrai('le service l\'a retenu', await (async () => { for (let i = 0; i < 30; i++) { const l = (await A0.get('/api/conversations')).j; const c = (l.conversations || l).find(x => x.id === G); if (c && c.theme === 'ocean/violet') return true; await new Promise(r => setTimeout(r, 100)); } return false; })());
    await A.page.goBack(); await A.page.waitForTimeout(500);
    const ecranA = await A.page.evaluate(() => { const e = document.getElementById('conv-ecran'), m = document.querySelector('#conv-messages .envoyee'); return [e.dataset.fond, e.dataset.bulle, /gradient/.test(getComputedStyle(e).backgroundImage), getComputedStyle(m).backgroundColor, getComputedStyle(m).color]; });
    v('l\'écran de la conversation : fond Océan (un dégradé), ses bulles violettes à l\'encre blanche', ecranA, ['ocean', 'violet', true, 'rgb(122, 63, 200)', 'rgb(255, 255, 255)']);
    await capture(A, 'theme-2-conversation');

    console.log('\n3. À elle seule');
    const ecranB = await B.page.evaluate(() => { const e = document.getElementById('conv-ecran'), m = document.querySelector('#conv-messages .envoyee'); return [e.dataset.fond, e.dataset.bulle, getComputedStyle(m).backgroundColor !== 'rgb(122, 63, 200)']; });
    v('⛔ chez Ben, la même conversation garde le fond et les bulles par défaut', ecranB, ['aucun', 'defaut', true]);

    console.log('\n4. Lisible, de jour et de nuit');
    {
      /* la contre-épreuve du LECTEUR de contraste : du gris #767676 sur du blanc vaut 4,54:1 — s'il rend autre chose, c'est la mesure qui ment */
      const t = await A.page.evaluate(() => { const d = document.createElement('div'); d.id = 'etalon'; d.style.cssText = 'position:fixed;left:0;top:200px;z-index:99999;background:#fff;color:#767676;font:700 40px sans-serif;padding:6px'; d.textContent = 'Étalon'; document.body.appendChild(d); return true; });
      const r = contrasteCapture(await A.page.locator('#etalon').screenshot());
      await A.page.evaluate(() => document.getElementById('etalon').remove());
      vrai('contre-épreuve du lecteur : #767676 sur blanc se lit 4,54:1 (' + r.ratio + ', fond ' + r.fond + ')', t && Math.abs(r.ratio - 4.54) < 0.05 && r.fond.join() === '255,255,255');
    }
    const lisible = async (S, nom) => {
      const r = {};
      for (const [cle, sel] of [['bulle', '#conv-messages .envoyee'], ['date', '#conv-messages .datage'], ['systeme', '#conv-messages .systeme']]) {
        const el = S.page.locator(sel).first();
        if (!(await el.count())) { r[cle] = null; continue; }
        r[cle] = contrasteCapture(await el.screenshot()).ratio;
      }
      return r;
    };
    const jour = await lisible(A, 'jour');
    vrai('population : de jour, la bulle, la date et le message du système sont là (' + JSON.stringify(jour) + ')', jour.bulle !== null && jour.date !== null && jour.systeme !== null);
    vrai('de jour : tout passe 4,5:1 (' + JSON.stringify(jour) + ')', jour.bulle >= 4.5 && jour.date >= 4.5 && jour.systeme >= 4.5);
    const N = await ouvrir('ana', true);
    const ecranN = await N.page.evaluate(() => document.getElementById('conv-ecran').dataset.fond);
    const nuit = await lisible(N, 'nuit');
    v('de nuit, un autre appareil d\'Ana : le même thème (il suit le compte)', ecranN, 'ocean');
    vrai('de nuit : tout passe 4,5:1 (' + JSON.stringify(nuit) + ')', nuit.bulle >= 4.5 && nuit.date >= 4.5 && nuit.systeme >= 4.5);
    await capture(N, 'theme-3-nuit');

    console.log('\n5. Par défaut');
    await A.page.locator('#conv-titre').click(); await A.page.waitForTimeout(400);
    await A.page.locator('#info-corps [data-act="theme"]').click();
    await att(A, () => !!document.getElementById('theme-apercu'));
    await A.page.locator('.theme-fond[data-fond="aucun"]').click();
    await A.page.locator('.theme-pastille[data-bulle="defaut"]').click();
    await A.page.goBack(); await A.page.waitForTimeout(500);
    v('« Par défaut » remet tout', await A.page.evaluate(() => [document.getElementById('conv-ecran').dataset.fond, document.getElementById('conv-ecran').dataset.bulle]), ['aucun', 'defaut']);
    v('aucune erreur JavaScript', [A.erreurs, B.erreurs, N.erreurs], [[], [], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
