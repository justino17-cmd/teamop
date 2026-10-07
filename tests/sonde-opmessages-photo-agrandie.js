/* ══ SONDE — LA PHOTO AGRANDIE : EN ENTIER, ENREGISTRÉE, PARTAGÉE, D'UNE PHOTO À L'AUTRE (la vraie page servie) ══════════════════════════════════════════════════════════════
   7 octobre 2026, capture de Justin : « quand je clique sur la photo, ça ne l'affiche pas en entier, ça la coupe ; il faudrait aussi pouvoir télécharger les photos ». Contre le VRAI service, Ana
   reçoit de Ben un message de DEUX photos : une capture d'iPhone (1170 × 2532, haute) et une photo en largeur. Au bureau (1280 × 800) et au téléphone (390 × 844, encoches posées) :
     1. ⛔ la capture agrandie tient ENTIÈRE dans l'écran (son rectangle peint, contenu compris, dans la fenêtre), proportions gardées ;
     2. « Enregistrer » télécharge « photo-AAAAMMJJ-HHMM-1.png » ; la flèche → passe à la seconde (« 2 / 2 »), ← revient ; au clavier aussi ;
     3. le menu du message propose « Enregistrer les 2 photos ».
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-photo-agrandie.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };
(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code });
    const D = (await B0.post('/api/conversations/directe', { uid: A0.moi.id })).j;
    const conv = (D.conversation || D).id;
    const p1 = await F.deposer(B0, { conv, genre: 'photo', nom: 'capture.png', corps: F.png({ w: 1170, h: 2532, couleur: [30, 90, 200] }) });
    const p2 = await F.deposer(B0, { conv, genre: 'photo', nom: 'paysage.png', corps: F.png({ w: 1600, h: 900, couleur: [200, 120, 30] }) });
    const env = await B0.post('/api/conversations/' + conv + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2, 12), type: 'photo', pieces: [{ id: p1.j.id, w: 1170, h: 2532 }, { id: p2.j.id, w: 1600, h: 900 }] });
    vrai('population : Ben a envoyé à Ana un message de deux photos (une capture d\'iPhone, une en largeur)', env.code < 300, JSON.stringify(env.j).slice(0, 160));
    for (const [nomProfil, profil] of [['bureau', { viewport: { width: 1280, height: 800 } }], ['téléphone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }]]) {
      console.log('\n── ' + nomProfil + ' ──');
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', acceptDownloads: true }, profil));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
      if (profil.isMobile) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, topMax: 47, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } }).catch(() => {}); }
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill('ana'); await page.locator('#c-pass').fill(MOTS.ana); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 15000 });
      await page.evaluate(c => { location.hash = '#messages/' + c; }, conv);
      const att = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
      vrai('population : les deux photos sont dans la conversation, chargées', await att(() => Array.from(document.querySelectorAll('#conv-messages [data-photo] img')).filter(i => i.complete && i.naturalWidth > 0).length === 2, null, 20000));
      await page.locator('#conv-messages [data-photo]').first().click();
      vrai('la photo s\'ouvre en grand', await att(() => !document.getElementById('visionneuse').hidden && document.getElementById('visionneuse-img').naturalWidth === 1170));
      await page.waitForTimeout(200);
      const g = await page.evaluate(() => { const i = document.getElementById('visionneuse-img'), r = i.getBoundingClientRect(), W = innerWidth, H = innerHeight;
        /* le rectangle PEINT de l'image (object-fit: contain) : sa boîte, et dedans le contenu à ses proportions */
        const k = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight), pw = i.naturalWidth * k, ph = i.naturalHeight * k, x = r.left + (r.width - pw) / 2, y = r.top + (r.height - ph) / 2;
        return { haut: Math.round(y), bas: Math.round(y + ph), gauche: Math.round(x), droite: Math.round(x + pw), W, H, ratio: +(pw / ph).toFixed(3), boite: [Math.round(r.top), Math.round(r.bottom)] }; });
      v('⛔ la capture d\'iPhone tient ENTIÈRE dans l\'écran (rien ne sort en haut ni en bas), aux bonnes proportions (0,462) — ' + JSON.stringify(g), [g.haut >= 0, g.bas <= g.H, g.gauche >= 0, g.droite <= g.W, g.ratio, g.bas - g.haut > g.H * 0.45], [true, true, true, true, 0.462, true]);
      if (DOSSIER) { fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, 'photo-agrandie-' + (profil.isMobile ? 'telephone' : 'bureau') + '.png') }); }
      v('la barre : « 1 / 2 », précédente grisée, suivante active, Enregistrer', await page.evaluate(() => [document.getElementById('visionneuse-rang').textContent, document.getElementById('visionneuse-prec').disabled, document.getElementById('visionneuse-suiv').disabled, !document.getElementById('visionneuse-enregistrer').hidden]), ['1 / 2', true, false, true]);
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(() => null), page.locator('#visionneuse-enregistrer').click()]);
      vrai('« Enregistrer » télécharge la photo : « photo-AAAAMMJJ-HHMM-1.png »', !!dl && /^photo-\d{8}-\d{4}-1\.png$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
      if (dl) { const f = await dl.path().catch(() => null); vrai('   et c\'est bien la photo (une image PNG de 1170 × 2532)', !!f && fs.readFileSync(f).readUInt32BE(16) === 1170 && fs.readFileSync(f).readUInt32BE(20) === 2532); }
      await page.locator('#visionneuse-suiv').click();
      vrai('→ passe à la seconde photo : « 2 / 2 », la photo en largeur', await att(() => document.getElementById('visionneuse-rang').textContent === '2 / 2' && document.getElementById('visionneuse-img').naturalWidth === 1600 && document.getElementById('visionneuse-suiv').disabled));
      await page.keyboard.press('ArrowLeft');
      vrai('← au clavier revient à la première', await att(() => document.getElementById('visionneuse-rang').textContent === '1 / 2' && document.getElementById('visionneuse-img').naturalWidth === 1170));
      await page.keyboard.press('Escape');
      vrai('Échap ferme la photo', await att(() => document.getElementById('visionneuse').hidden));
      await page.evaluate(() => { const m = document.querySelector('#conv-messages [data-photo]').closest('.msg'); const p = m && m.querySelector('[data-actions]'); if (p) p.click(); else m.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })); });
      vrai('le menu du message propose « Enregistrer les 2 photos »', await att(() => !document.getElementById('menu-fond').hidden && Array.from(document.querySelectorAll('#menu-msg [data-menu="enregistrer"]')).some(x => x.textContent === 'Enregistrer les 2 photos')));
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
