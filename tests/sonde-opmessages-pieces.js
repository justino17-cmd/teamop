/* ══ SONDE DE BOUT EN BOUT — LES PIÈCES D'OP MESSAGES, DANS DE VRAIS NAVIGATEURS ══════════════════════════════════════════════════════════
   `tests/test-944.js` fait parler le module de données de la page au vrai service ; `tests/sonde-opmessages-serveur.js` joue le parcours du texte. Celle-ci joue ce
   que seul un navigateur voit des PIÈCES : la VRAIE PAGE SERVIE (`server-msg/public/`), deux personnes dans deux navigateurs (Alice, iPhone 393, au doigt ; Bruno,
   bureau 1440, à la souris), le VRAI service, un OP GESTION factice — tout sur 127.0.0.1.

   Ce qu'elle joue : une photo choisie (réduite par un canvas à ≈ 250 Ko, « Envoi… » visible tant que le dépôt court, l'image paraît chez l'autre SANS recharger et se
   DESSINE : `naturalWidth` > 0 et la couleur de l'original), un fichier (nom, taille, téléchargement octet pour octet, trop lourd refusé avant tout envoi), un vocal ENREGISTRÉ
   (micro et interface de capture simulés par Chromium : `--use-fake-device-for-media-stream`) lu chez l'autre, la photo de profil (vue des contacts en direct), la photo d'un
   groupe à la création, les Réglages (interrupteurs réciproques, refus dit puis effacé par la réussite suivante, stockage, autres appareils), l'absence d'erreur dans la console
   et de débordement d'écran.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-pieces.js
              CAPTURES=/dossier   (une capture de chaque navigateur à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const T = require('./outils-msg');
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-pieces.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const PROFILS = {
  iphone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false, insets: null },
};
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand' };
const PHOTO_MAX = 307200, FICHIER_MAX = 716800, AVATAR_MAX = 204800;

/* ── les images : un PNG rouge de 8 × 8 (la couleur se relit), et une GRANDE image de bruit (2 400 × 1 600 : elle dépasse tout plafond, la réduction doit la ramener à ≈ 250 Ko) ── */
const ROUGE = [200, 40, 40];
const PNG_ROUGE = F.png({ couleur: ROUGE });
function pngBruit(w, h) {
  const ligne = w * 3 + 1, brut = crypto.randomBytes(ligne * h);
  for (let y = 0; y < h; y++) brut[y * ligne] = 0;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), F.morceauPng('IHDR', ihdr), F.morceauPng('IDAT', zlib.deflateSync(brut, { level: 1 })), F.morceauPng('IEND', Buffer.alloc(0))]);
}

async function ouvrir(b, base, pf) {
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: 'Europe/Paris', permissions: ['microphone'], baseURL: base, acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, nom: '?', base, erreurs: [], console: [], gestes: 0, envois: [], lectures: 0 };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('request', r => { if (/\/api\/pieces(\?|$)/.test(r.url()) && r.method() === 'POST') S.envois.push(r.url().replace(/^[^?]*\?/, '')); if (/\/api\/pieces\/f_/.test(r.url())) S.lectures++; });
  await page.addInitScript(() => {
    window.__plays = [];
    const p = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__plays.push(String(this.currentSrc || this.src).slice(0, 5)); return p.apply(this, arguments); };
  });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const nombre = (S, sel) => S.page.evaluate(s => document.querySelectorAll(s).length, sel);
async function attendre(S, fn, arg, ms) { try { await S.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }); return true; } catch (e) { return false; } }
async function verifier(titre, S, fn, arg, ms, vu) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else { const reste = vu ? await vu().catch(() => '?') : ''; v(titre, 'non vu à temps' + (reste ? ' ; vu : ' + reste : ''), 'vu'); }
  return ok;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
async function saisir(S, sel, texte) { await S.page.locator(sel).fill(texte); S.gestes++; }
/* un sélecteur de fichier : le geste qui l'ouvre, puis le fichier choisi */
async function choisirDansPlus(S, quoi, fichier) {
  await toucher(S, '#compo-plus');
  await S.page.waitForFunction(() => !document.getElementById('menu-fond').hidden, null, { timeout: 4000 });
  await dormir(450);                                       // la page ignore un clic dans les 350 ms qui suivent l'ouverture d'un menu (l'écho du geste qui l'a ouvert)
  await choisir(S, () => toucher(S, '#menu-msg [data-plus="' + quoi + '"]'), fichier);
}
async function choisir(S, geste, fichier) {
  const [fc] = await Promise.all([S.page.waitForEvent('filechooser', { timeout: 8000 }), geste()]);
  await fc.setFiles(fichier);
}
async function capture(S, nom) {
  if (!DOSSIER_CAPTURES) return;
  try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '-' + S.pf.nom.replace(/\W+/g, '') + '.png') }); } catch (e) { /* facultatif */ }
}
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
}
async function onglet(S, vue) { await retourListe(S); await toucher(S, 'a[data-vue="' + vue + '"]'); await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 }); }
async function retourListe(S) {
  const vis = await S.page.evaluate(() => { const e = document.getElementById('conv-retour'); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  if (vis) { await toucher(S, '#conv-retour'); await S.page.waitForFunction(() => document.documentElement.dataset.conv !== '1', null, { timeout: 4000 }).catch(() => {}); }
}
async function ouvrirConvAvec(S, nom) {
  await onglet(S, 'messages');
  await toucher(S, '#liste-conv .conv:has(.conv-nom:text-is("' + nom + '"))');
  await S.page.waitForFunction(n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(n), nom, { timeout: 8000 });
}
/* la largeur, deux fois, contre la largeur POSÉE du profil */
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length };
  });
  await mesure(); await dormir(700); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1; S.population = (S.population || 0) + b.n;
  if (b.sx > 0 || b.dep > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx);
}
/* la couleur du premier point de la dernière image d'un message de l'autre, lue DANS le navigateur (canvas) */
const couleurImage = (S, sel) => S.page.evaluate(async s => {
  const im = [...document.querySelectorAll(s)].pop(); if (!im) return null;
  await new Promise(r => im.complete && im.naturalWidth ? r() : im.addEventListener('load', r, { once: true }));
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  return { nw: im.naturalWidth, nh: im.naturalHeight, rgb: Array.from(x.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data).slice(0, 3), src: im.src.slice(0, 5) };
}, sel);

async function parcours(b, ctx) {
  const { svc } = ctx;
  const A = await ouvrir(b, svc.base, PROFILS.iphone), B = await ouvrir(b, svc.base, PROFILS.bureau), C = await ouvrir(b, svc.base, PROFILS.bureau);
  A.nom = 'Alice'; B.nom = 'Bruno'; C.nom = 'Alice (second appareil)';
  const tous = [A, B, C];
  try {
    await connecter(A, 'alice'); await connecter(B, 'bruno');
    /* le contact : un lien, accepté (les gestes du lien sont joués par sonde-opmessages-serveur) */
    const code = await A.page.evaluate(async () => (await (await fetch('/api/contacts/lien', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: JSON.stringify({ max: 1, jours: 7 }) })).json()).code);
    const acc = await B.page.evaluate(async c => {
      const h = { 'Content-Type': 'application/json', 'X-OPM': '1' };
      const r = await fetch('/api/liens/accepter', { method: 'POST', headers: h, body: JSON.stringify({ code: c }) }), j = await r.json();
      const d = await fetch('/api/conversations/directe', { method: 'POST', headers: h, body: JSON.stringify({ uid: j.contact.id }) }), dj = await d.json();   // ce que fait la page après un lien accepté
      return [r.status, d.status, dj.conversation.id];
    }, code);
    v('population : Alice et Bruno sont contacts (lien accepté) et leur conversation à deux existe', acc.slice(0, 2), [200, 201]);
    /* une conversation sans message n'est pas encore dans la liste : on l'ouvre par son adresse (#messages/<id>), comme un lien */
    for (const [S, nom] of [[A, NOMS.bruno], [B, NOMS.alice]]) {
      await S.page.goto(S.base + '/#messages/' + acc[2]); await S.page.reload();
      await S.page.waitForFunction(n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(n), nom, { timeout: 15000 });
    }
    const stock = (S) => S.page.evaluate(async () => (await (await fetch('/api/moi/stockage')).json()).utilise);

    /* ═══ 1. UNE PHOTO ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Une photo : choisie, réduite, « Envoi… », vue chez l\'autre sans recharger, dessinée ──');
    await toucher(A, '#compo-plus');
    await verifier('« + » propose « Photo » et « Fichier » (une petite feuille, rien d\'ouvert encore)', A, () => document.querySelectorAll('#menu-msg [data-plus]').length === 2 && !document.getElementById('menu-fond').hidden, null, 4000, () => lire(A, '#menu-msg'));
    await capture(A, '1-plus');
    await A.page.route('**/api/pieces?*', async (route) => { await dormir(1500); await route.continue(); });        // le dépôt est LENT : on peut voir « Envoi… »
    await A.page.keyboard.press('Escape');
    await verifier('Échap referme la feuille « Joindre »', A, () => document.getElementById('menu-fond').hidden, null, 3000);
    await choisirDansPlus(A, 'photo', { name: 'carre-rouge.png', mimeType: 'image/png', buffer: PNG_ROUGE });
    await verifier('⛔ « Envoi… » : tant que le dépôt court, le dernier message d\'Alice le dit (et la photo de l\'appareil est déjà dans la bulle)', A, () => [...document.querySelectorAll('#conv-messages .statut')].some(e => e.textContent === 'Envoi…') && !!document.querySelector('#conv-messages .msg.de-moi .photo img'), null, 15000, () => lire(A, '#conv-messages'));
    await capture(A, '1-envoi');
    await verifier('l\'envoi se termine : le statut passe à « Envoyé » (ou « Lu »)', A, () => [...document.querySelectorAll('#conv-messages .statut')].some(e => /^(Envoyé|Lu)/.test(e.textContent)), null, 15000, () => lire(A, '#conv-messages'));
    await A.page.unroute('**/api/pieces?*');
    await verifier('⛔ la photo paraît chez Bruno SANS recharger la page', B, () => !!document.querySelector('#conv-messages .msg.de-autre .photo img'), null, 15000, () => lire(B, '#conv-messages'));
    const cb = await couleurImage(B, '#conv-messages .msg.de-autre .photo img');
    vrai('⛔ l\'image se DESSINE chez Bruno : une adresse blob:, une largeur naturelle > 0, la couleur de l\'original (' + JSON.stringify(cb && cb.rgb) + ' pour ' + ROUGE + ')', !!cb && cb.src === 'blob:' && cb.nw === 8 && cb.rgb.every((x, i) => Math.abs(x - ROUGE[i]) <= 16));
    const ca = await couleurImage(A, '#conv-messages .msg.de-moi .photo img');
    v('et chez Alice : l\'image de son appareil, adoptée par la page (elle se dessine, de la même couleur, et aucune pièce n\'a été relue)', [ca && ca.nw, ca && ca.rgb.every((x, i) => Math.abs(x - ROUGE[i]) <= 16), ca && ca.src, A.lectures], [8, true, 'blob:', 0]);
    v('⛔ UNE seule requête de dépôt pour cette photo, avec le genre « photo » et la conversation (jamais un nom de fichier dans l\'adresse)', [A.envois.length, /genre=photo/.test(A.envois[0] || ''), /conv=c_/.test(A.envois[0] || ''), /nom=/.test(A.envois[0] || '')], [1, true, true, false]);
    await capture(B, '1-recu');
    await largeur(A, 'conversation avec une photo'); await largeur(B, 'conversation avec une photo');

    /* une GRANDE image : réduite à ≈ 250 Ko avant de partir */
    const avant = await stock(A);
    await choisirDansPlus(A, 'photo', { name: 'bruit.png', mimeType: 'image/png', buffer: pngBruit(2400, 1600) });
    await verifier('une image de bruit de 2 400 × 1 600 (≈ 11 Mo) part : la bulle paraît chez Bruno', B, () => document.querySelectorAll('#conv-messages .msg.de-autre .photo img').length >= 2, null, 60000, () => lire(B, '#conv-messages'));
    const apres = await stock(A), gros = await couleurImage(B, '#conv-messages .msg.de-autre .photo img');
    vrai('⛔ elle a été RÉDUITE avant de partir : ' + (apres - avant) + ' octets rangés (≤ 250 Ko = 256 000), jamais ses 11 Mo ; et elle tient en ≤ 1 600 px (' + (gros && gros.nw) + ' × ' + (gros && gros.nh) + ', le rapport 3:2 gardé)',
      apres - avant > 20000 && apres - avant <= 256000 && !!gros && gros.nw <= 1600 && gros.nw >= 640 && Math.abs(gros.nw / gros.nh - 1.5) < .01);

    /* ═══ 2. UN FICHIER ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Un fichier : son nom et sa taille, téléchargé octet pour octet, trop lourd refusé AVANT tout envoi ──');
    const pdf = F.pdf(9000);
    await choisirDansPlus(A, 'fichier', { name: 'Rapport 2026.pdf', mimeType: 'application/pdf', buffer: pdf });
    await verifier('la bulle « fichier » paraît chez Bruno : son nom et sa taille', B, () => { const f = document.querySelector('#conv-messages .msg.de-autre .fichier'); return !!f && /Rapport 2026\.pdf/.test(f.textContent) && /Ko/.test(f.textContent); }, null, 15000, () => lire(B, '#conv-messages'));
    v('la taille dite est celle du fichier (9 Ko)', await B.page.evaluate(() => document.querySelector('#conv-messages .msg.de-autre .fichier .fichier-taille').textContent), '9 Ko');
    const [dl] = await Promise.all([B.page.waitForEvent('download', { timeout: 10000 }), toucher(B, '#conv-messages .msg.de-autre .fichier')]);
    const octetsRecus = fs.readFileSync(await dl.path());
    v('⛔ Bruno le TÉLÉCHARGE : le nom proposé est celui du fichier, et les octets sont exactement les siens (population : ' + octetsRecus.length + ' octets)', [dl.suggestedFilename(), octetsRecus.equals(pdf)], ['Rapport 2026.pdf', true]);
    /* un nom avec des accents s'AFFICHE tel quel (le téléchargement de ce nom-là n'est pas jugé ici : le Chromium de ce conteneur rend « download » pour TOUT nom non ASCII, même sur une page nue — mesuré) */
    await choisirDansPlus(A, 'fichier', { name: 'Été final.pdf', mimeType: 'application/pdf', buffer: F.pdf(300) });
    await verifier('un nom à accents s\'affiche tel quel chez Bruno', B, () => [...document.querySelectorAll('#conv-messages .msg.de-autre .fichier .fichier-nom')].some(e => e.textContent === 'Été final.pdf'), null, 15000, () => lire(B, '#conv-messages'));
    await capture(B, '2-fichier');
    const envoisAvant = A.envois.length;
    await choisirDansPlus(A, 'fichier', { name: 'enorme.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(FICHIER_MAX + 1024, 7) });
    await verifier('⛔ un fichier plus lourd que le maximum du service est refusé sur place, avec la phrase et le maximum', A, () => /trop lourd/.test(document.getElementById('avis').textContent) && /700 Ko au plus/.test(document.getElementById('avis').textContent), null, 8000, () => lire(A, '#avis'));
    v('…sans ouvrir la moindre connexion de dépôt, et sans bulle de plus (population : le refus a eu lieu)', [A.envois.length - envoisAvant, await nombre(A, '#conv-messages .msg.de-moi .fichier')], [0, 2]);

    /* ═══ 3. UN VOCAL ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Un vocal : enregistré (micro simulé), envoyé, lu chez l\'autre ──');
    const vocauxAvant = await nombre(B, '#conv-messages .vocal');
    await toucher(A, '#compo-micro');
    await verifier('le micro DÉMARRE l\'enregistrement (la barre d\'enregistrement paraît, la durée court)', A, () => !document.getElementById('enreg').hidden, null, 8000, () => lire(A, '#avis'));
    await capture(A, '3-enregistrement');
    await dormir(1700);
    await toucher(A, '#enreg-envoyer');
    await verifier('⛔ le vocal part pour de vrai : la bulle paraît chez Bruno, avec sa durée (≥ 1 s)', B, n => document.querySelectorAll('#conv-messages .vocal').length > n && /\d+:\d\d/.test(document.querySelector('#conv-messages .vocal:last-of-type .vocal-duree, #conv-messages .msg:last-of-type .vocal-duree').textContent), vocauxAvant, 20000, () => lire(B, '#conv-messages'));
    await verifier('et chez Alice aussi (sa propre bulle vocale)', A, () => document.querySelectorAll('#conv-messages .msg.de-moi .vocal').length >= 1, null, 8000);
    const lecturesAvant = await B.page.evaluate(() => window.__plays.length);
    await toucher(B, '#conv-messages .msg.de-autre .vocal');
    await verifier('⛔ Bruno LIT le vocal : un élément audio démarre sur une adresse blob:, le bouton passe en « lecture »', B, n => window.__plays.length > n && window.__plays[window.__plays.length - 1] === 'blob:' && !!document.querySelector('#conv-messages .vocal[data-lecture]'), lecturesAvant, 12000, () => B.page.evaluate(() => JSON.stringify({ plays: window.__plays, lecture: !!document.querySelector('.vocal[data-lecture]'), avis: (document.getElementById('avis') || {}).textContent })));
    await verifier('…et la lecture se termine toute seule (le bouton reprend sa forme de repos)', B, () => !document.querySelector('#conv-messages .vocal[data-lecture]'), null, 15000);
    await largeur(B, 'conversation avec vocal et fichier');

    /* ═══ 4. LA PHOTO DE PROFIL ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La photo de profil : posée par Alice, vue de Bruno en direct, retirée ──');
    await onglet(A, 'reglages');
    await verifier('Réglages : le profil, la confidentialité, les contacts, les appareils, le stockage, l\'à propos, la sortie', A, () => ['reg-profil', 'reg-conf', 'reg-contact', 'reg-autres', 'reg-stock', 'reg-apropos', 'reg-sortir'].every(i => !!document.getElementById(i)) && !!document.querySelector('#reg-conf [data-reg-cle="presence"]'), null, 12000, () => lire(A, '#vue-reglages'));
    await capture(A, '4-reglages');
    await largeur(A, 'Réglages');
    await toucher(A, '#reg-profil-bouton');
    await verifier('la feuille « Profil » s\'ouvre avec le prénom (le nom complet d\'un accès bêta), le nom, le statut', A, () => !!document.getElementById('pf-prenom') && document.getElementById('pf-prenom').value === 'Alice Martin', null, 10000, () => lire(A, '#info-corps'));
    await choisir(A, () => toucher(A, '[data-act="profil-photo"]'), { name: 'moi.png', mimeType: 'image/png', buffer: PNG_ROUGE });
    await verifier('⛔ la photo de profil est posée : l\'avatar de la feuille la montre', A, () => !!document.querySelector('#info-corps .profil-photo .avatar[style*="background-image"]'), null, 15000, () => lire(A, '#info-corps'));
    await verifier('⛔ Bruno la voit SANS recharger : l\'avatar d\'Alice dans sa liste porte une image', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !!l.querySelector('.avatar[style*="background-image"]'); }, NOMS.alice, 15000, () => B.page.evaluate(() => document.getElementById('liste-conv').innerHTML.slice(0, 300)));
    await capture(B, '4-photo-profil');
    await saisir(A, '#pf-statut', 'En tournée'); await toucher(A, '[data-act="profil-enregistrer"]');
    await verifier('le profil est enregistré (« Profil enregistré »)', A, () => /Profil enregistré/.test(document.getElementById('mot').textContent), null, 8000, () => lire(A, '#mot'));
    await saisir(A, '#pf-prenom', ''); await toucher(A, '[data-act="profil-enregistrer"]');
    await verifier('⛔ un prénom vide : refus dit sur place', A, () => /prénom ne peut pas être vide/.test(document.getElementById('info-erreur').textContent), null, 4000, () => lire(A, '#info-erreur'));
    await saisir(A, '#pf-prenom', 'Alice Martin'); await toucher(A, '[data-act="profil-enregistrer"]');
    await verifier('⛔ la réussite suivante EFFACE le refus d\'avant', A, () => document.getElementById('info-erreur').hidden && !document.getElementById('info-erreur').textContent, null, 8000, () => lire(A, '#info-erreur'));
    await toucher(A, '[data-act="profil-photo-retirer"]');
    await verifier('la photo est retirée : l\'avatar de Bruno redevient des initiales', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !l.querySelector('.avatar[style*="background-image"]'); }, NOMS.alice, 15000);
    await toucher(A, '#g-annuler');
    await verifier('la feuille se referme', A, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 6000);

    /* ═══ 5. LES RÉGLAGES ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Les réglages : interrupteurs réciproques, refus dit puis effacé, stockage, autres appareils ──');
    await verifier('population : Alice est en ligne pour Bruno (le point vert de la liste)', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !!l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 12000);
    await A.page.route('**/api/moi/confidentialite', async (route) => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '30' }, body: JSON.stringify({ error: 'quota_atteint', retry: 30 }) });
      else await route.continue();
    });
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('⛔ le service refuse (429) : l\'interrupteur NE tourne PAS, et la phrase le dit avec l\'attente', A, () => document.querySelector('[data-reg-cle="presence"]').getAttribute('aria-checked') === 'true' && /réessaie dans 30 s/.test(document.getElementById('reg-conf').textContent), null, 8000, () => lire(A, '#reg-conf'));
    await A.page.unroute('**/api/moi/confidentialite');
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('⛔ la réussite suivante tourne l\'interrupteur ET efface le refus', A, () => document.querySelector('[data-reg-cle="presence"]').getAttribute('aria-checked') === 'false' && !/réessaie dans/.test(document.getElementById('reg-conf').textContent), null, 8000, () => lire(A, '#reg-conf'));
    await verifier('⛔ RÉCIPROQUE : Bruno ne voit plus Alice en ligne', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 15000);
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('elle rallume : Bruno la revoit en ligne', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !!l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 15000);
    await verifier('le stockage dit ce qui est utilisé sur 2 Go, avec sa jauge', A, () => /utilisés sur 2 Go/.test(document.getElementById('reg-stock').textContent) && !!document.querySelector('#reg-stock .jauge i'), null, 8000, () => lire(A, '#reg-stock'));
    await verifier('« À propos » dit la version et les maximums', A, () => /version \d/.test(document.getElementById('reg-apropos').textContent) && /Au plus/.test(document.getElementById('reg-apropos').textContent), null, 8000, () => lire(A, '#reg-apropos'));
    await largeur(A, 'Réglages (rempli)');
    /* « Déconnecter les autres appareils » : une seconde session d'Alice, coupée */
    await connecter(C, 'alice');
    await toucher(A, '#reg-autres');
    await verifier('une première touche DEMANDE confirmation (« Toucher encore »)', A, () => /Toucher encore/.test(document.getElementById('reg-autres').textContent), null, 3000, () => lire(A, '#reg-autres'));
    await toucher(A, '#reg-autres');
    await verifier('⛔ la seconde touche déconnecte : « Un autre appareil déconnecté »', A, () => /Un autre appareil déconnecté/.test(document.getElementById('mot').textContent), null, 8000, () => lire(A, '#mot'));
    await verifier('⛔ l\'autre appareil d\'Alice REPART à l\'écran de connexion (sa session est coupée)', C, () => !document.getElementById('connexion').hidden, null, 12000, () => lire(C, 'body'));
    vrai('population : le nom d\'Alice est toujours dans sa barre', (await lire(A, '#moi-nom')) === NOMS.alice);

    /* ═══ 6. LA PHOTO D'UN GROUPE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La photo d\'un groupe : à la création ──');
    await onglet(A, 'messages');
    await toucher(A, '#btn-groupe');
    await verifier('la feuille « Nouveau groupe » s\'ouvre', A, () => !document.getElementById('feuille').inert && !document.getElementById('g-contacts').hidden, null, 8000);
    await choisir(A, () => A.page.locator('#g-photo').click(), { name: 'groupe.png', mimeType: 'image/png', buffer: PNG_ROUGE });
    await verifier('la photo choisie remplit le rond', A, () => document.getElementById('g-photo').classList.contains('avec-image'), null, 10000);
    await saisir(A, '#g-nom', 'Équipe photo');
    await toucher(A, '#g-contacts .contact[role="checkbox"]');
    await toucher(A, '#g-creer');
    await verifier('⛔ le groupe est créé AVEC sa photo : sa ligne porte une image, chez Alice…', A, () => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent.includes('Équipe photo')); return !!l && !!l.querySelector('.avatar[style*="background-image"]'); }, null, 20000, () => A.page.evaluate(() => document.getElementById('liste-conv').innerHTML.slice(0, 400)));
    await verifier('…et chez Bruno (membre), sans recharger', B, () => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent.includes('Équipe photo')); return !!l && !!l.querySelector('.avatar[style*="background-image"]'); }, null, 20000, () => B.page.evaluate(() => document.getElementById('liste-conv').innerHTML.slice(0, 400)));
    await capture(B, '6-groupe');

    /* ═══ 7. LA FIN : RIEN D'ANORMAL ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La fin : aucune erreur, aucun débordement, rien d\'extérieur ──');
    /* un refus du service est LOGUÉ par le navigateur (« Failed to load resource … status of 4xx ») : on les compte et on les NOMME — Alice : la visite sans session (401) et le refus
       que la sonde a fait faire (429) ; Bruno : la visite sans session. Toute autre erreur de console est un défaut. */
    const refus = S => S.console.filter(t => /Failed to load resource/.test(t)).map(t => (/status of (\d{3})/.exec(t) || [])[1]);
    for (const [S, attendus] of [[A, ['401', '429']], [B, ['401']]]) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + S.ecrans + ' écrans mesurés en largeur', S.gestes > 3 && S.ecrans >= 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus attendu', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : les refus réseau relevés sont exactement ceux qu\'on attendait', refus(S).sort(), attendus);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
    }
  } finally { for (const S of tous) { try { await S.ctx.close(); } catch (e) { /* déjà fermé */ } } }
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 },
    pieces: { photoMax: PHOTO_MAX, fichierMax: FICHIER_MAX, avatarMax: AVATAR_MAX },
    quotas: { piece: { max: 1000, fenetreMs: 3600000 }, moi_avatar: { max: 1000, fenetreMs: 3600000 }, moi_maj: { max: 100000, fenetreMs: 3600000 } } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await og.fermer(); process.exit(2); }
  try { await parcours(b, { svc, og }); }
  catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    try { await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
