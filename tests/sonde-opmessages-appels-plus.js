/* ══ SONDE — LE SON, L'IMAGE ET L'ÉCRAN D'UN APPEL, DANS LA VRAIE PAGE SERVIE ══════════════════════════════════════════════════════════
   6 octobre 2026 : « toutes les options de toutes les applications de réunion… qu'on soit les meilleurs ». Premier lot, joué dans Chromium (micros et caméras FABRIQUÉS par le
   navigateur) contre le VRAI service, deux puis trois personnes :
     1. le micro est demandé PROPRE : réduction du bruit, annulation d'écho, gain automatique — à CHAQUE demande (l'appel, et le micro réactivé) ;
     2. l'écran reste ALLUMÉ pendant l'appel (Wake Lock demandé), et il est RENDU au raccroché ;
     3. « Réduire » (image dans l'image) paraît quand l'image de l'autre est vivante, et la met dans l'image ; l'image se referme avec l'appel ;
     4. dans un appel de groupe, « Plus › Son et image » propose le micro et la caméra de l'appareil ; changer de micro prend l'appareil choisi EXACTEMENT, arrête l'ancien,
        et l'appel continue (une seule piste de micro vivante).
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-appels-plus.js        Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc' };

(async () => {
  const og = await T.fauxOpGestion({ ana: { pass: MOTS.ana, nom: NOMS.ana, actif: true }, ben: { pass: MOTS.ben, nom: NOMS.ben, actif: true }, cleo: { pass: MOTS.cleo, nom: NOMS.cleo, actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], appels: { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    for (const [x, y] of [[A0, B0], [A0, C0], [B0, C0]]) { const l = await x.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }

    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 820 }, reducedMotion: 'reduce', locale: 'fr-FR', permissions: ['microphone', 'camera'] });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [] }; page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.addInitScript(() => {
        window.__contraintes = []; window.__pistes = []; window.__wl = { demandes: 0, rendus: 0 };
        const md = navigator.mediaDevices, g = md.getUserMedia.bind(md);
        md.getUserMedia = async function (c) { window.__contraintes.push(JSON.stringify(c)); const f = await g(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
        /* le Wake Lock d'un navigateur sans écran : on COMPTE ce que la page demande et rend — c'est ce comportement qu'on garde, pas l'écran du conteneur */
        try { Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async (k) => { window.__wl.demandes++; const o = new EventTarget(); o.type = k; o.release = async () => { window.__wl.rendus++; o.dispatchEvent(new Event('release')); }; return o; } } }); } catch (e) { /* rien */ }
      });
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(S); return S;
    };
    const appeler = async (S, noms, type) => {
      await S.page.locator('a[data-vue="appels"]').filter({ visible: true }).first().click();
      await S.page.locator('#btn-nouvel-appel').click();
      await S.page.waitForFunction(() => document.getElementById('feuille').dataset.mode === 'appel' && !document.getElementById('feuille').inert, null, { timeout: 8000 });
      for (const n of noms) await S.page.locator('#g-contacts .contact:has(.contact-nom:text-is("' + n + '"))').click();
      if (type === 'video') await S.page.locator('#g-choix .g-pilule[data-type="video"]').click();
      await S.page.locator('#g-creer').click();
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);

    console.log('\n1 à 3. Un appel VIDÉO à deux : Ana appelle Ben');
    const A = await ouvrir('ana'), B = await ouvrir('ben');
    await appeler(A, [NOMS.ben], 'video');
    vrai('population : Ben entend sonner', await att(B, () => { const r = document.getElementById('appel-repondre'); return !!r && r.getClientRects().length > 0; }));
    await B.page.locator('#appel-repondre').click();
    vrai('population : l\'appel est EN COURS des deux côtés', await att(A, () => /Vidéo activée|Appel en cours|Micro coupé/.test(document.getElementById('appel-statut').textContent)) && await att(B, () => /Vidéo activée|Appel en cours|Micro coupé/.test(document.getElementById('appel-statut').textContent)));
    const cA = await A.page.evaluate(() => window.__contraintes.map(x => JSON.parse(x)));
    const audios = cA.filter(c => c.audio);
    vrai('1. population : la page a demandé le micro (' + audios.length + ' fois)', audios.length >= 1);
    vrai('⛔ …et CHAQUE demande de micro le veut propre : réduction du bruit, annulation d\'écho, gain automatique', audios.length >= 1 && audios.every(c => c.audio.noiseSuppression === true && c.audio.echoCancellation === true && c.audio.autoGainControl === true));
    const wl = await A.page.evaluate(() => window.__wl);
    vrai('2. ⛔ l\'écran reste allumé : le Wake Lock est demandé pendant l\'appel (' + wl.demandes + ')', wl.demandes >= 1);
    const pipOk = await A.page.evaluate(() => document.pictureInPictureEnabled === true);
    if (pipOk) {
      vrai('3. « Réduire » (image dans l\'image) paraît quand l\'image de Ben est vivante', await att(A, () => { const p = document.getElementById('appel-pip'); return !!p && !p.hidden && p.getClientRects().length > 0; }, null, 20000));
      await A.page.locator('#appel-pip').click();
      vrai('   …et la toucher met la vidéo de Ben dans l\'image (document.pictureInPictureElement est sa vidéo)', await att(A, () => { const e = document.pictureInPictureElement; return !!e && !!e.closest('#appel-scene .tuile:not(.vous)'); }, null, 8000));
    } else vrai('3. (ce navigateur ne sait pas l\'image dans l\'image) : « Réduire » n\'est pas proposé', await A.page.evaluate(() => document.getElementById('appel-pip').hidden));
    await A.page.locator('#appel-raccrocher').click();
    vrai('population : l\'appel est raccroché', await att(A, () => !document.documentElement.dataset.appel));
    const apres = await A.page.evaluate(() => ({ wl: window.__wl, pip: !!document.pictureInPictureElement, vivantes: window.__pistes.filter(t => t.readyState === 'live').length }));
    v('⛔ au raccroché : l\'écran est RENDU, l\'image dans l\'image refermée, plus aucune piste vivante', [apres.wl.rendus >= 1, apres.pip, apres.vivantes], [true, false, 0]);
    await att(B, () => !document.documentElement.dataset.appel);

    console.log('\n4. Un appel de GROUPE : « Plus › Son et image » et le changement de micro');
    const C = await ouvrir('cleo');
    await appeler(A, [NOMS.ben, NOMS.cleo], 'audio');
    vrai('population : Ana est dans la salle', await att(A, () => document.documentElement.dataset.salle === '1' || !!document.getElementById('salle-ecran') && !document.getElementById('salle-ecran').hidden, null, 20000));
    vrai('population : Ana a son micro', await att(A, () => window.__pistes.some(t => t.kind === 'audio' && t.readyState === 'live'), null, 15000));
    await A.page.locator('#salle-plus').click();
    vrai('la rubrique « Son et image » est dans « Plus », avec le son amélioré dit en clair', await att(A, () => /Son et image/.test(document.getElementById('salle-panneau-corps').textContent) && /Réduction du bruit/.test(document.getElementById('salle-panneau-corps').textContent)));
    const micros = await A.page.evaluate(async () => (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications').map(d => d.deviceId));
    if (micros.length >= 2) {
      vrai('population : l\'appareil a ' + micros.length + ' micros — le menu « Micro » les propose', await att(A, () => { const s = document.querySelector('select[data-appareil="micro"]'); return !!s && s.options.length >= 3; }));
      const avant = await A.page.evaluate(() => window.__contraintes.length);
      await A.page.locator('select[data-appareil="micro"]').selectOption(micros[1]);
      vrai('⛔ choisir un micro le demande EXACTEMENT (deviceId exact), toujours propre', await att(A, ([n, id]) => window.__contraintes.slice(n).some(x => { const c = JSON.parse(x); return c.audio && c.audio.deviceId && c.audio.deviceId.exact === id && c.audio.noiseSuppression === true; }), [avant, micros[1]]));
      vrai('⛔ …l\'ancien micro est ARRÊTÉ : une seule piste de micro vivante', await att(A, () => window.__pistes.filter(t => t.kind === 'audio' && t.readyState === 'live').length === 1));
      vrai('   …et l\'appel continue (Ana est toujours dans la salle)', await A.page.evaluate(() => document.documentElement.dataset.appel === '1'));
    } else vrai('(population : ce navigateur ne fabrique qu\'UN micro) — le menu « Micro » n\'est pas proposé, rien à choisir', await A.page.evaluate(() => !document.querySelector('select[data-appareil="micro"]')));
    if (await A.page.evaluate(() => document.pictureInPictureEnabled === true)) vrai('« Image dans l\'image » est proposée dans « Plus »', await A.page.evaluate(() => !!document.querySelector('[data-sa="pip"]')));
    v('aucune erreur JavaScript, chez Ana, Ben et Cleo', A.erreurs.concat(B.erreurs, C.erreurs), []);
  } finally {
    for (const S of pages) { try { await S.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
