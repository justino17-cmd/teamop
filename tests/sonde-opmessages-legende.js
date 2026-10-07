/* ══ SONDE — LA LÉGENDE SOUS LES PHOTOS, DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════════════════════════
   Demandé le 6 octobre 2026 : « quand j'envoie une photo, il faudrait pouvoir mettre un texte en dessous, comme WhatsApp ». La sonde joue, au doigt
   (iPhone) et à la souris (bureau), contre le VRAI service :
     1. choisir une photo n'envoie RIEN : l'aperçu s'ouvre (la photo en grand, « Ajouter une légende… ») ;
     2. la croix annule : rien ne part ;
     3. deux photos : on en retire une (sa croix), on écrit la légende, la flèche envoie UN message ;
     4. la bulle montre la photo et, dessous, la légende — chez l'envoyeur et chez l'autre ;
     5. au bureau, Entrée envoie depuis la légende ; Échap ferme l'aperçu ;
     6. « Modifier la légende » dans le menu du message.
   ⛔ 7 octobre 2026, capture du bureau : « bug d'affichage quand on envoie des photos ». Une VRAIE photo (2 400 px, 3 000 px de haut) sortait de l'écran,
      coupée — la grille de la scène n'avait pas de piste définie, donc `max-height: 100%` ne bornait rien ; et le champ de la légende, mesuré pendant
      que l'aperçu était encore caché, restait écrasé à moitié. Les petites images de 64 px ne pouvaient voir ni l'un ni l'autre : la sonde joue
      désormais des photos plus grandes que l'écran, en large ET en haut, et lit le champ au pixel près.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-legende.js          CAPTURES=/dossier pour les images.  Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
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
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234' };
const IPHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const BUREAU = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
const PNG_A = F.png({ w: 64, h: 48, couleur: [30, 140, 220] }), PNG_B = F.png({ w: 48, h: 64, couleur: [220, 90, 40] });
const PNG_LARGE = F.png({ w: 2400, h: 1500, couleur: [40, 160, 90] }), PNG_HAUTE = F.png({ w: 1200, h: 3000, couleur: [160, 60, 160] });
/* la photo tient dans sa scène et dans l'écran, entière ; la barre du bas reste dans l'écran ; le champ de légende n'est pas écrasé (sa ligne entière se voit) */
const tenue = () => {
  const i = document.getElementById('ep-grande'), s = document.querySelector('.ep-scene'), ta = document.getElementById('ep-legende'), env = document.getElementById('ep-envoyer');
  const a = i.getBoundingClientRect(), c = s.getBoundingClientRect(), t = ta.getBoundingClientRect(), e = env.getBoundingClientRect();
  return { charge: i.complete && i.naturalWidth > 0, grande: i.naturalWidth > innerWidth || i.naturalHeight > innerHeight,
    dansScene: a.top >= c.top - 1 && a.bottom <= c.bottom + 1 && a.left >= c.left - 1 && a.right <= c.right + 1,
    dansEcran: a.top >= 0 && a.left >= 0 && a.right <= innerWidth + 1 && a.bottom <= innerHeight + 1,
    proportions: Math.abs(a.width / a.height - i.naturalWidth / i.naturalHeight) < 0.03,
    barre: e.bottom <= innerHeight + 1 && e.top >= c.bottom - 1,
    champ: t.height >= 40 && ta.scrollHeight <= ta.clientHeight + 1 };
};

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOTS.alice, nom: 'Alice Martin', actif: true }, bruno: { pass: MOTS.bruno, nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    /* Alice et Bruno deviennent contacts par le service ; leur conversation directe existe */
    const A0 = await T.connecter(svc, og, 'alice', MOTS.alice), B0 = await T.connecter(svc, og, 'bruno', MOTS.bruno);
    const lien = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: lien.j.code });
    const conv = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    const derniers = async () => (await B0.get('/api/conversations/' + conv + '/messages')).j.messages;

    for (const [nomPf, pf] of [['iPhone', IPHONE], ['bureau', BUREAU]]) {
      console.log('\n── ' + nomPf + ' ──');
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', baseURL: svc.base }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(9000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
      const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
      const visible = (id) => page.evaluate(x => { const e = document.getElementById(x); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
      const toucher = async (sel) => { const l = page.locator(sel).filter({ visible: true }).first(); if (pf.hasTouch) await l.tap(); else await l.click(); };
      const capture = async (nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, nomPf + '-' + nom + '.png') }); };
      const choisir = (...bufs) => page.locator('#compo-fichier').setInputFiles(bufs.map((buf, i) => ({ name: 'photo' + i + '.png', mimeType: 'image/png', buffer: buf })));

      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOTS.alice); await toucher('#c-entrer');
      vrai('population : Alice est connectée', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      await page.evaluate((id) => { location.hash = '#messages/' + id; }, conv);
      vrai('population : la conversation avec Bruno est ouverte', await attendre(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }));
      const nAvant = (await derniers()).length;

      /* 1 et 2 — choisir n'envoie rien ; la croix annule */
      await choisir(PNG_A);
      vrai('1. choisir une photo ouvre l\'aperçu (la photo en grand)', await attendre(() => { const e = document.getElementById('envoi-photos'); const i = document.getElementById('ep-grande'); return !!e && !e.hidden && !!i && i.complete && i.naturalWidth > 0; }));
      v('   le titre dit « Photo », le champ « Ajouter une légende… », une seule photo : pas de vignettes', await page.evaluate(() => [document.getElementById('ep-titre').textContent, document.getElementById('ep-legende').placeholder, document.querySelectorAll('#ep-vignettes .ep-vig').length]), ['Photo', 'Ajouter une légende…', 0]);
      const geo = await page.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const e = r('ep-envoyer'), f = r('ep-fermer'), l = r('ep-legende'); return { e: [Math.round(e.width), Math.round(e.height)], f: [Math.round(f.width), Math.round(f.height)], dedans: e.right <= innerWidth && l.left >= 0, bas: Math.round(innerHeight - e.bottom) }; });
      v('   la flèche et la croix répondent sur 44 px, tout tient dans l\'écran', [geo.e, geo.f, geo.dedans], [[44, 44], [44, 44], true]);
      v('⛔ le champ « Ajouter une légende… » n\'est pas écrasé (sa ligne se voit en entier)', (await page.evaluate(tenue)).champ, true);
      await capture('1-apercu');
      await page.waitForTimeout(400);
      v('⛔ rien n\'est parti tant qu\'on n\'a pas touché la flèche', (await derniers()).length, nAvant);
      await toucher('#ep-fermer');
      vrai('2. la croix ferme l\'aperçu', await attendre(() => document.getElementById('envoi-photos').hidden));

      /* 2 bis — une VRAIE photo, plus grande que l'écran : en large, puis en haut */
      for (const [nomG, buf] of [['large (2 400 × 1 500)', PNG_LARGE], ['haute (1 200 × 3 000)', PNG_HAUTE]]) {
        await choisir(buf);
        vrai('population : la photo ' + nomG + ' est chargée, et plus grande que l\'écran', await attendre(() => { const e = document.getElementById('envoi-photos'), i = document.getElementById('ep-grande'); return !e.hidden && i.complete && i.naturalWidth > 0 && (i.naturalWidth > innerWidth || i.naturalHeight > innerHeight); }));
        await page.waitForTimeout(120);
        const g = await page.evaluate(tenue);
        v('⛔ photo ' + nomG + ' : entière dans sa scène ET dans l\'écran, sans déformation ; la barre de légende dessous, dans l\'écran ; le champ entier',
          [g.dansScene, g.dansEcran, g.proportions, g.barre, g.champ], [true, true, true, true, true]);
        await capture('2-' + (buf === PNG_LARGE ? 'large' : 'haute'));
        await toucher('#ep-fermer');
        await attendre(() => document.getElementById('envoi-photos').hidden);
      }
      await page.waitForTimeout(400);
      v('⛔ … et rien n\'est parti', (await derniers()).length, nAvant);

      /* 3 — deux photos, on en retire une, la légende, la flèche */
      await choisir(PNG_A, PNG_B);
      vrai('3. deux photos : deux vignettes, « 2 photos »', await attendre(() => document.querySelectorAll('#ep-vignettes .ep-vig').length === 2 && document.getElementById('ep-titre').textContent === '2 photos'));
      await toucher('[data-ep-retirer="1"]');
      vrai('   la croix d\'une vignette la retire : « Photo », plus de bande', await attendre(() => document.querySelectorAll('#ep-vignettes .ep-vig').length === 0 && document.getElementById('ep-titre').textContent === 'Photo'));
      const LEG = 'Compteur du local — ' + nomPf;
      await page.locator('#ep-legende').fill(LEG);
      await capture('2-legende');
      await toucher('#ep-envoyer');
      vrai('   la flèche ferme l\'aperçu', await attendre(() => document.getElementById('envoi-photos').hidden));
      const arrive = await T.attendre(async () => { const l = await derniers(); return l.length === nAvant + 1 && l[l.length - 1]; }, 9000);
      v('⛔ UN message est parti : une photo ET sa légende', arrive && [arrive.type, arrive.texte, arrive.meta && arrive.meta.pieces.length], ['photo', LEG, 1]);

      /* 4 — la bulle */
      vrai('4. chez Alice, la bulle montre la photo puis, DESSOUS et à sa largeur, la légende', await attendre((leg) => { const ms = document.querySelectorAll('#conv-messages .msg.de-moi'); const m = ms[ms.length - 1]; if (!m) return false; const ph = m.querySelector('.photos'), lg = m.querySelector('.bulle.legende'); if (!ph || !lg) return false; const a = ph.getBoundingClientRect(), c = lg.getBoundingClientRect(); return lg.textContent === leg && a.bottom <= c.top + 4 && Math.abs(a.width - c.width) <= 2 && Math.abs(a.right - c.right) <= 2; }, LEG));
      await capture('3-bulle');

      /* 5 — au bureau : Entrée envoie depuis la légende ; Échap ferme */
      if (!pf.hasTouch) {
        await choisir(PNG_B);
        await attendre(() => !document.getElementById('envoi-photos').hidden);
        await page.locator('#ep-legende').fill('Envoyée par Entrée');
        await page.keyboard.press('Enter');
        const par = await T.attendre(async () => { const l = await derniers(); const x = l[l.length - 1]; return x && x.texte === 'Envoyée par Entrée' && x; }, 9000);
        vrai('5. au bureau, Entrée envoie depuis la légende', !!par);
        await choisir(PNG_A);
        await attendre(() => !document.getElementById('envoi-photos').hidden);
        await page.keyboard.press('Escape');
        vrai('   Échap ferme l\'aperçu sans rien envoyer', await attendre(() => document.getElementById('envoi-photos').hidden));
      }

      /* 6 — « Modifier la légende » */
      /* le bouton d'actions se cache au doigt (appui long) : on le déclenche comme la page le fait, par son clic */
      const ouvrirMenu = () => page.evaluate(() => { const ms = document.querySelectorAll('#conv-messages .msg.de-moi'); const bt = ms[ms.length - 1].querySelector('[data-actions]'); bt.click(); });
      await ouvrirMenu();
      vrai('6. le menu de la photo propose « Modifier la légende »', await attendre(() => Array.from(document.querySelectorAll('#menu-msg .menu-action')).some(b => b.textContent === 'Modifier la légende')));
      await page.keyboard.press('Escape');
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }

    /* chez Bruno */
    const ctxB = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', baseURL: svc.base }, IPHONE));
    const pB = await ctxB.newPage(); pB.setDefaultTimeout(9000);
    await pB.goto(svc.base + '/');
    await pB.locator('#c-login').fill('bruno'); await pB.locator('#c-pass').fill(MOTS.bruno); await pB.locator('#c-entrer').tap();
    await pB.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 12000 });
    await pB.evaluate((id) => { location.hash = '#messages/' + id; }, conv);
    vrai('⛔ chez Bruno, la photo reçue porte sa légende dessous', await pB.waitForFunction(() => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre .bulle.legende.recue')).some(x => /Compteur du local/.test(x.textContent)), null, { timeout: 12000, polling: 100 }).then(() => true, () => false));
    vrai('   et la liste des conversations dit « 📷 … »', await pB.evaluate(() => /📷/.test(document.body.textContent)));
    if (DOSSIER) await pB.screenshot({ path: path.join(DOSSIER, 'bruno-recue.png') });
    await ctxB.close();
  } finally {
    await b.close(); await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
