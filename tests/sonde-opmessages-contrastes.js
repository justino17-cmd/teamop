/* ══ SONDE — LES CONTRASTES ET LES CIBLES AU DOIGT, AU PIXEL, DANS LA VRAIE PAGE SERVIE (lot m21, 17 octobre 2026) ═══════════════════════════════════════════════════════════════
   Les bancs test-1500 à test-1505 REJOUENT la feuille de style ; cette sonde mesure ce que l'ŒIL voit — sur des captures, Chromium en SwiftShader (le chemin `--disable-gpu` ne
   floute pas une vitre mince et fausserait la mesure : CLAUDE.md). Contre le VRAI service, sur une page connectée :
     1. L'AGENDA, au bureau (1440 px), de JOUR et de NUIT : les jours de la semaine (.mjour-nom), l'heure d'une pastille (.mjour-elt time) et l'en-tête des jours du mois passent 4,5:1
        (testeurs : 3,44 / 3,06 / 4,22 avant) ;
     2. LA BULLE ENVOYÉE contre le FOND CHOISI, à 390 px : les 72 combinaisons (8 fonds × 9 couleurs), jour et nuit — la bulle se distingue de son fond (≥ 1,5:1), son encre passe
        4,5:1 (testeurs : 9 sur 72 sous 1,5 de nuit avant). ⛔ Les 72 sont COMPTÉES avant de croire un zéro ;
     3. 320 PX (iPhone SE) et 344 PX (Galaxy Z Fold replié — relecture : la fenêtre 341–351 px restait sous 44 px) : la barre des sept jours répond sur ≥ 44 px de large, le titre « Nouveau rendez-vous » tient sur une ligne, rien ne pousse la page de côté ;
     4. LA SALLE, de nuit, au téléphone : « Rejoindre » (Avant d'entrer), « Terminer pour tous » et « Quitter » passent 4,5:1 ; les boutons des feuilles « Plus » et « Quitter la salle »
        répondent sur ≥ 44 px de haut (la zone qui répond, `elementFromPoint` sur la verticale du centre).
   ⛔ LA MESURE SE PROUVE D'ABORD : un étalon (#767676 sur blanc = 4,54:1) passe par le même lecteur de capture ; chaque absence est précédée de sa population.
   Lancer :   node tests/sonde-opmessages-contrastes.js   (CAPTURES=/dossier pour les images)   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };
const PARIS = 'Europe/Paris', H = 3600000, JOUR = 86400000;
const localDans = (t, tz) => { const p = {}; for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))) p[x.type] = x.value; return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute; };

/* ── un PNG lu sans dépendance (zlib + défiltrage) ── */
function lirePng(buf) {
  let o = 8, w = 0, h = 0, type = 6; const idat = [];
  while (o < buf.length) {
    const n = buf.readUInt32BE(o), t = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; if (d[8] !== 8 || (type !== 2 && type !== 6)) throw new Error('PNG non lu : profondeur ' + d[8] + ', type ' + type); } else if (t === 'IDAT') idat.push(d);
    o += 12 + n;
  }
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
/* le contraste d'un texte dans la capture de SA boîte : le fond = la couleur la plus fréquente, l'encre = le point le plus éloigné de lui */
function contrasteCapture(buf) {
  const { w, h, px, bpp } = lirePng(buf), compte = new Map();
  for (let i = 0; i < w * h; i++) { const k = px[i * bpp] + ',' + px[i * bpp + 1] + ',' + px[i * bpp + 2]; compte.set(k, (compte.get(k) || 0) + 1); }
  const fond = Array.from(compte.entries()).sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  let mieux = 1;
  for (const k of compte.keys()) { const c = k.split(',').map(Number); const r = contraste(c, fond); if (r > mieux) mieux = r; }
  return { fond, ratio: Math.round(mieux * 100) / 100 };
}
/* la couleur dominante d'un petit carré (le motif en points d'un fond n'en fait pas la couleur) */
function dominante(img, cx, cy, r) {
  const compte = new Map();
  for (let y = Math.max(0, cy - r); y <= Math.min(img.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(img.w - 1, cx + r); x++) { const i = (y * img.w + x) * img.bpp; const k = img.px[i] + ',' + img.px[i + 1] + ',' + img.px[i + 2]; compte.set(k, (compte.get(k) || 0) + 1); }
  return Array.from(compte.entries()).sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    /* l'espace d'Ana, abonné (une réunion se programme en Pro) */
    const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'Atelier Contrastes', proprio: A0.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_contrastes', abonnement: 'sub_contrastes', statut: 'active', places: 5 });
    { const code = crypto.randomBytes(16).toString('base64url'), h = crypto.createHash('sha256').update(code).digest('hex');
      S.lienCreer({ h, genre: 'espace', cible: E, par: A0.moi.id, ttlMs: JOUR, max: 5 }); S.invitationAccepter({ h, uid: B0.moi.id, max: Infinity }); }
    try { S.fermer && S.fermer(); } catch (e) { /* la base se rouvre à chaque appel du service */ }
    const conv = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    for (const [P, t] of [[B0, 'Salut Ana, tu es là ?'], [A0, 'Oui, je regarde les couleurs.'], [A0, 'Tout est lisible ?']]) await P.post('/api/conversations/' + conv + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2), texte: t });
    const auj = localDans(Date.now(), PARIS).slice(0, 10);
    const e1 = await A0.post('/api/agenda', { titre: 'Dentiste contrastes', debut: auj + 'T10:00', fin: auj + 'T10:30', tz: PARIS, cote: 'perso' });
    const e2 = await A0.post('/api/agenda', { titre: 'Point chantier contrastes', debut: auj + 'T14:00', fin: auj + 'T15:00', tz: PARIS, cote: 'pro' });
    v('population : deux événements sont posés aujourd\'hui (un Perso, un Pro)', [e1.code, e2.code], [201, 201]);
    const now = Date.now(), reu = await A0.post('/api/reunions', { titre: 'Réunion contrastes', debut: localDans(now - 5 * 60000, PARIS), fin: localDans(now + 55 * 60000, PARIS), tz: PARIS, invites: [B0.moi.id], notifier: false, cote: 'pro' });
    v('population : une réunion Pro qui démarre maintenant (Ben, collègue de l\'espace, est invité)', reu.code, 201);

    const PROFILS = {
      tel: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      se: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      fold: { viewport: { width: 344, height: 700 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    };
    const ouvrir = async (login, profil, nuit) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, colorScheme: nuit ? 'dark' : 'light', permissions: ['microphone', 'camera'] }, PROFILS[profil]));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, profil, nuit, erreurs: [], tactile: !!PROFILS[profil].hasTouch }; pages.push(X);
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      await page.waitForTimeout(700);        // le temps que l'application finisse de s'installer : un changement d'adresse posé trop tôt se perd
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = async (X, sel, texte) => { let l = X.page.locator(sel); if (texte) l = l.filter({ hasText: texte }); l = l.filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (X.tactile) await l.tap(); else await l.click(); };
    /* le contraste d'un élément, lu sur la capture de sa propre boîte (le verre, le voile : tout ce qui est peint dessous compte) */
    /* ⛔ on ne capture JAMAIS les coins : un bouton arrondi y laisse voir la page derrière, et « l'encre = le point le plus éloigné du fond » prend alors un coin pour du texte (relevé : « Rejoindre »
       à 2,53 au calcul se lisait 6,44 sur la capture entière de sa boîte). La capture est rognée de son rayon à gauche et à droite, et de quelques pixels en haut et en bas. */
    const ratioDe = async (X, sel, i) => {
      const l = X.page.locator(sel).filter({ visible: true }).nth(i || 0); if (!(await l.count())) return null;
      await l.scrollIntoViewIfNeeded().catch(() => {}); await X.page.waitForTimeout(120);
      const bb = await l.boundingBox(); if (!bb || bb.width < 8 || bb.height < 8) return null;
      const r = await l.evaluate(e => parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0), dx = Math.min(r, bb.height / 2, bb.width / 3);
      return contrasteCapture(await X.page.screenshot({ clip: { x: bb.x + dx, y: bb.y + 3, width: bb.width - 2 * dx, height: bb.height - 6 } })).ratio;
    };

    console.log('\n0. L\'étalon : la mesure se prouve avant de servir');
    {
      const X = await ouvrir('ana', 'bureau', false);
      await X.page.evaluate(() => { const d = document.createElement('div'); d.id = 'etalon'; d.style.cssText = 'position:fixed;left:0;top:200px;z-index:99999;background:#fff;color:#767676;font:700 40px sans-serif;padding:6px'; d.textContent = 'Étalon'; document.body.appendChild(d); });
      const r = contrasteCapture(await X.page.locator('#etalon').screenshot());
      vrai('#767676 sur blanc se lit 4,54:1 (' + r.ratio + ', fond ' + r.fond + ')', Math.abs(r.ratio - 4.54) < 0.05 && r.fond.join() === '255,255,255');
      await X.ctx.close();
    }

    console.log('\n1. L\'agenda au bureau, de jour et de nuit');
    for (const nuit of [false, true]) {
      const X = await ouvrir('ana', 'bureau', nuit), mode = nuit ? 'nuit' : 'jour';
      await X.page.evaluate(() => { location.hash = '#reunions'; });
      /* le choix Semaine | Mois est retenu par le COMPTE : la passe précédente a fini au mois, celle-ci repart de la semaine */
      await att(X, () => !!document.querySelector('#reu-vue-seg [data-reu-vue="semaine"]'));
      await toucher(X, '#reu-vue-seg [data-reu-vue="semaine"]');
      const grille = await att(X, () => !!document.querySelector('.sem-grille .mjour-nom') && !!document.querySelector('.sem-grille .mjour-elt time') && Array.from(document.querySelectorAll('.sem-grille .mjour-nom')).some(x => x.getClientRects().length));
      vrai('(population) ' + mode + ' : la semaine en grille est à l\'écran, avec ses noms de jour et au moins une pastille d\'événement' + (grille ? '' : ' — ' + JSON.stringify(await X.page.evaluate(() => ({ hash: location.hash, cote: document.documentElement.dataset.cote, noms: document.querySelectorAll('.sem-grille .mjour-nom').length, heures: document.querySelectorAll('.sem-grille .mjour-elt time').length, elts: document.querySelectorAll('.mjour-elt').length, vue: Array.from(document.querySelectorAll('main > section, .contenu > section')).filter(x => !x.hidden).map(x => x.id) })))), grille);
      await X.page.waitForTimeout(700);
      await capture(X, 'agenda-semaine-' + mode);
      const nom = await ratioDe(X, '.sem-grille .mjour-nom'), heure = await ratioDe(X, '.sem-grille .mjour-elt time');
      vrai(mode + ' : « Lun … Dim » passe 4,5:1 au pixel (' + nom + ')', nom !== null && nom >= 4.5);
      vrai(mode + ' : l\'heure d\'une pastille passe 4,5:1 au pixel (' + heure + ')', heure !== null && heure >= 4.5);
      await toucher(X, '#reu-vue-seg [data-reu-vue="mois"]');
      vrai('(population) ' + mode + ' : le mois est à l\'écran, son en-tête des jours lisible', await att(X, () => !document.getElementById('mois').hidden && Array.from(document.querySelectorAll('.mois-entete > *')).some(x => x.getClientRects().length)));
      const ent = await ratioDe(X, '.mois-entete > *');
      vrai(mode + ' : l\'en-tête des jours du mois passe 4,5:1 au pixel (' + ent + ')', ent !== null && ent >= 4.5);
      await X.ctx.close();
    }

    console.log('\n2. La bulle envoyée contre le fond choisi (8 fonds × 9 couleurs)');
    const FONDS = ['aucun', 'aube', 'ocean', 'foret', 'lavande', 'sable', 'corail', 'ardoise'], BULLES = ['defaut', 'bleu', 'vert', 'violet', 'orange', 'rose', 'graphite', 'sarcelle', 'bordeaux'];
    for (const nuit of [false, true]) {
      const X = await ouvrir('ana', 'tel', nuit), mode = nuit ? 'nuit' : 'jour';
      await X.page.evaluate(g => { location.hash = '#messages/' + g; }, conv);
      vrai('(population) ' + mode + ' : la conversation est ouverte, avec ses bulles envoyées', await att(X, () => document.documentElement.dataset.conv === '1' && document.querySelectorAll('#conv-messages .envoyee').length >= 2));
      await X.page.waitForTimeout(500);
      let n = 0; const faibles = [], illisibles = [];
      for (const f of FONDS) for (const bu of BULLES) {
        const geo = await X.page.evaluate(([f, bu]) => {
          const e = document.getElementById('conv-ecran'); e.dataset.fond = f; e.dataset.bulle = bu;
          const m = Array.from(document.querySelectorAll('#conv-messages .envoyee')).pop(); m.scrollIntoView({ block: 'center' });
          return new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => { const r = m.getBoundingClientRect(), s = getComputedStyle(m); ok({ x: r.left, y: r.top, w: r.width, h: r.height, fond: s.backgroundColor, encre: s.color }); })));
        }, [f, bu]);
        const img = lirePng(await X.page.screenshot());
        const k = PROFILS.tel.deviceScaleFactor;       // le facteur d'échelle de la capture
        const cy = Math.round((geo.y + geo.h / 2) * k), bulle = dominante(img, Math.round((geo.x + 7) * k), cy, 2), fond = dominante(img, Math.round((geo.x - 12) * k), cy, 3);
        const r = contraste(bulle, fond); n++;
        if (r < 1.5) faibles.push(bu + ' sur ' + f + ' ' + r.toFixed(2));
        const rgb = s => (/rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s) || []).slice(1, 4).map(Number);
        const re = contraste(rgb(geo.fond), rgb(geo.encre)); if (re < 4.5) illisibles.push(bu + ' ' + re.toFixed(2));
      }
      v('(population) ' + mode + ' : 72 combinaisons mesurées au pixel', n, 72);
      vrai(mode + ' : aucune bulle ne se confond avec son fond (< 1,5:1) — ' + faibles.length + ' sur ' + n + (faibles.length ? ' : ' + faibles.join(' · ') : ''), !faibles.length);
      vrai(mode + ' : l\'encre de chaque bulle passe 4,5:1' + (illisibles.length ? ' — ' + illisibles.join(' · ') : ''), !illisibles.length);
      await X.ctx.close();
    }

    console.log('\n3. À 320 px (iPhone SE)');
    {
      const X = await ouvrir('ana', 'se', false);
      await X.page.evaluate(() => { location.hash = '#reunions'; });
      await att(X, () => !!document.querySelector('#reu-vue-seg [data-reu-vue="semaine"]'));
      await toucher(X, '#reu-vue-seg [data-reu-vue="semaine"]');
      vrai('(population) la barre des sept jours est à l\'écran', await att(X, () => document.querySelectorAll('#sem-jours .jour').length === 7 && Array.from(document.querySelectorAll('#sem-jours .jour')).every(x => x.getClientRects().length)));
      await X.page.waitForTimeout(600);
      const zones = await X.page.evaluate(() => Array.from(document.querySelectorAll('#sem-jours .jour')).map(bt => { const r = bt.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const rep = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && h.closest('.jour') === bt; }; let w1 = 0, w2 = 0; for (let d = 1; d <= 60; d++) { if (rep(cx - d, cy)) w1 = d; else break; } for (let d = 1; d <= 60; d++) { if (rep(cx + d, cy)) w2 = d; else break; } return w1 + w2 + 1; }));
      vrai('la zone qui répond de chacun des sept jours fait ≥ 43 px de large (un pixel d\'arrondi près) : ' + zones.join(' '), zones.length === 7 && zones.every(z => z >= 43));
      const depasse = await X.page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; scrollTo(9999, scrollY); const sx = scrollX; scrollTo(0, scrollY); return sx; });
      v('la page ne glisse pas de côté (la barre déborde dans la marge, pas hors de l\'écran)', depasse, 0);
      await capture(X, 'se-agenda');
      await toucher(X, '#btn-agenda-plus');
      await att(X, () => { const d = document.getElementById('deroule'); return !!d && !d.hidden; });
      await toucher(X, '#deroule-liste .deroule-choix', /Rendez-vous/);
      vrai('(population) la feuille « Nouveau rendez-vous » est ouverte', await att(X, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous'));
      const t = await X.page.evaluate(() => { const h = document.getElementById('feuille-titre'); return { sw: h.scrollWidth, cw: h.clientWidth }; });
      vrai('⛔ le titre tient sur sa ligne : il n\'est plus coupé en « Nouveau rendez-… » (' + t.sw + ' pour ' + t.cw + ' px)', t.sw <= t.cw);
      await capture(X, 'se-feuille');
      v('aucune erreur JavaScript', X.erreurs, []);
      await X.ctx.close();
    }

    console.log('\n3 bis. À 344 px (Galaxy Z Fold replié)');
    {
      const X = await ouvrir('ana', 'fold', false);
      await X.page.evaluate(() => { location.hash = '#reunions'; });
      await att(X, () => !!document.querySelector('#reu-vue-seg [data-reu-vue="semaine"]'));
      await toucher(X, '#reu-vue-seg [data-reu-vue="semaine"]');
      vrai('(population) la barre des sept jours est à l\'écran', await att(X, () => document.querySelectorAll('#sem-jours .jour').length === 7 && Array.from(document.querySelectorAll('#sem-jours .jour')).every(x => x.getClientRects().length)));
      await X.page.waitForTimeout(600);
      const zones = await X.page.evaluate(() => Array.from(document.querySelectorAll('#sem-jours .jour')).map(bt => { const r = bt.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; const rep = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && h.closest('.jour') === bt; }; let w1 = 0, w2 = 0; for (let d = 1; d <= 60; d++) { if (rep(cx - d, cy)) w1 = d; else break; } for (let d = 1; d <= 60; d++) { if (rep(cx + d, cy)) w2 = d; else break; } return w1 + w2 + 1; }));
      vrai('⛔ à 344 px, la zone qui répond de chacun des sept jours fait ≥ 43 px de large (un pixel d\'arrondi près) : ' + zones.join(' '), zones.length === 7 && zones.every(z => z >= 43));
      const depasse = await X.page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; scrollTo(9999, scrollY); const sx = scrollX; scrollTo(0, scrollY); return sx; });
      v('à 344 px, la page ne glisse pas de côté', depasse, 0);
      v('aucune erreur JavaScript', X.erreurs, []);
      await X.ctx.close();
    }

    console.log('\n4. La salle, de nuit, au téléphone');
    {
      const X = await ouvrir('ana', 'tel', true);
      /* Ana est Pro (son espace est abonné) : « Pro » se touche dans le profil, comme au téléphone */
      await X.page.locator('.moi-pastille').filter({ visible: true }).first().tap();
      await att(X, () => !document.getElementById('vue-reglages').hidden && Array.from(document.querySelectorAll('.cote-seg-profil')).some(x => x.getClientRects().length));
      await X.page.locator('.cote-seg-profil [data-cote="pro"]').filter({ visible: true }).first().tap();
      await att(X, () => document.documentElement.dataset.cote === 'pro');
      await X.page.evaluate(id => { location.hash = '#reunions/' + id; }, reu.j.reunion.id);
      vrai('(population) la fiche de la réunion propose « Rejoindre »', await att(X, () => !!document.querySelector('#info-corps [data-reu="rejoindre"]')));
      await toucher(X, '#info-corps [data-reu="rejoindre"]');
      vrai('(population) la feuille « Avant d\'entrer » est ouverte', await att(X, () => document.getElementById('feuille-titre').textContent === 'Avant d\'entrer'));
      await X.page.waitForTimeout(700);
      const rej = await ratioDe(X, '#avant-rejoindre');
      vrai('⛔ « Rejoindre » passe 4,5:1 de nuit au pixel (' + rej + ' ; 2,53 avant)', rej !== null && rej >= 4.5);
      await capture(X, 'salle-avant');
      await toucher(X, '#avant-rejoindre');
      vrai('(population) la salle est ouverte', await att(X, () => document.documentElement.dataset.salle === '1', null, 15000));
      /* Ben (bureau) entre aussi : « Quitter la salle » ne demande confirmation qu'à l'hôte d'une salle où il reste quelqu'un */
      const Y = await ouvrir('ben', 'bureau', true);
      await Y.page.evaluate(id => { location.hash = '#reunions/' + id; }, reu.j.reunion.id);
      await att(Y, () => !!document.querySelector('#info-corps [data-reu="rejoindre"]'));
      await toucher(Y, '#info-corps [data-reu="rejoindre"]');
      await att(Y, () => document.getElementById('feuille-titre').textContent === 'Avant d\'entrer');
      await toucher(Y, '#avant-rejoindre');
      vrai('(population) Ben est dans la salle aussi : Ana en voit deux', await att(X, () => document.querySelectorAll('#salle-scene .salle-tuile').length >= 2, null, 20000));
      await X.page.waitForTimeout(800);
      const quit = await ratioDe(X, '#salle-quitter');
      vrai('⛔ « Quitter » (barre du haut) passe 4,5:1 au pixel (' + quit + ' ; 3,41 avant)', quit !== null && quit >= 4.5);
      /* la zone qui répond : la hauteur de chaque bouton d'une feuille, sur la verticale de son centre */
      const hauteurs = async (dans) => X.page.evaluate((dans) => Array.from(document.querySelectorAll(dans + ' .salle-btn, ' + dans + ' select')).filter(e => e.getClientRects().length).map(e => {
        e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), cy = r.top + r.height / 2;
        const rep = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h) || h.closest('.salle-btn, select') === e); };
        let h1 = 0, h2 = 0; for (let d = 1; d <= 80; d++) { if (rep(cx, cy - d)) h1 = d; else break; } for (let d = 1; d <= 80; d++) { if (rep(cx, cy + d)) h2 = d; else break; }
        return (e.textContent || e.tagName).trim().slice(0, 24) + ' ' + (h1 + h2 + 1);
      }), dans);
      await toucher(X, '#salle-plus'); await X.page.waitForTimeout(800);
      const plus = await hauteurs('#salle-panneau');
      vrai('(population) la feuille « Plus » montre ses boutons (' + plus.length + ')', plus.length >= 4);
      vrai('⛔ « Plus » : chaque bouton répond sur ≥ 43 px de haut (' + plus.join(' · ') + ')', plus.every(s => +s.split(' ').pop() >= 43));
      const term = await ratioDe(X, '#salle-panneau .salle-btn.danger');
      vrai('⛔ « Terminer pour tous » passe 4,5:1 au pixel (' + term + ' ; 3,41 avant)', term !== null && term >= 4.5);
      await X.page.keyboard.press('Escape'); await X.page.waitForTimeout(400);
      await toucher(X, '#salle-quitter'); await X.page.waitForTimeout(700);
      const qs = await hauteurs('#salle-panneau');
      vrai('(population) la confirmation « Quitter la salle » montre ses boutons (' + qs.length + ')', qs.length >= 2);
      vrai('⛔ « Quitter la salle » : chaque bouton répond sur ≥ 43 px de haut (' + qs.join(' · ') + ')', qs.every(s => +s.split(' ').pop() >= 43));
      await capture(X, 'salle-quitter');
      v('aucune erreur JavaScript', X.erreurs, []);
      await Y.ctx.close(); await X.ctx.close();
    }
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
