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
/* ⛔ PROFIL EN RUBRIQUES (6 octobre 2026) : une carte de réglage n'est montrée que dans SA rubrique — on la touche comme la personne le ferait (« Profil › Confidentialité ») */
const rubrique = async (S, sec) => { const pg = S.page || S; await pg.waitForFunction((x) => !!document.querySelector('[data-reg-sec="' + x + '"]'), sec, { timeout: 9000 }).catch(() => {}); await pg.evaluate((x) => { const b = document.querySelector('[data-reg-sec="' + x + '"]'); if (b) b.click(); }, sec); await pg.waitForFunction((x) => { const s = document.getElementById('reg-sec-' + x); return !!s && !s.hidden; }, sec, { timeout: 9000 }).catch(() => {}); };
const F = require('./outils-pieces');
const C = T.compteur(), { v, vrai, fin } = C;
T.sauterSiSansDependances();
/* ⛔ POUR LES MUTATIONS DE LA PAGE (tests/mutations-pieces.js --sondes) : rejouer les sept sections entières pour chaque mutation coûte plus d'une heure sur une machine partagée.
   SONDE_SECTIONS=6b,3 ne joue que ces sections (1 à 6, 6b = « 6 bis », 7 est toujours jouée mais ne compte que ce qui a eu lieu) ; SONDE_ARRET=1 s'arrête au PREMIER échec (le reste ne prouverait rien
   de plus : la mutation est tombée) en refermant proprement les navigateurs et le service. Sans ces variables, la sonde joue tout, comme avant. */
const SECTIONS = (process.env.SONDE_SECTIONS || '').split(',').map(x => x.trim()).filter(Boolean);
const voulu = (id) => !SECTIONS.length || SECTIONS.includes(id);
const arretSiRate = () => { if (process.env.SONDE_ARRET === '1' && C.ko > 0) throw new Error('arrêt au premier échec (SONDE_ARRET=1)'); };

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
  arretSiRate();
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else { const reste = vu ? await vu().catch(() => '?') : ''; v(titre, 'non vu à temps' + (reste ? ' ; vu : ' + reste : ''), 'vu'); }
  return ok;
}
async function toucher(S, sel) {
  arretSiRate();
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
  /* ⛔ une photo choisie ne part plus d'elle-même (6 octobre 2026) : l'aperçu s'ouvre — la photo en grand, la légende — et c'est la flèche qui l'envoie (`sonde-opmessages-legende.js` le garde en détail) */
  if (quoi === 'photo') {
    await S.page.waitForFunction(() => { const e = document.getElementById('envoi-photos'); return !!e && !e.hidden && !!document.getElementById('ep-grande').getAttribute('src'); }, null, { timeout: 8000 });
    await toucher(S, '#ep-envoyer');
  }
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
async function onglet(S, vue) { if (vue === 'reglages' && await S.page.evaluate(() => { const s = document.getElementById('vue-reglages'); return !!s && !s.hidden && s.getClientRects().length > 0; })) return;   /* déjà dans le Profil (une rubrique ouverte) : « Profil » n'est plus un onglet (7 octobre 2026), et la rubrique se choisit d'ici */ await retourListe(S); await toucher(S, 'a[data-vue="' + vue + '"]'); await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 }); }
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

/* le nombre d'images d'un GIF, en le PARCOURANT (jamais en cherchant un octet : « 0x2C » se trouve dans n'importe quelles données) */
function imagesGif(b) {
  if (b.length < 14 || b.subarray(0, 3).toString('latin1') !== 'GIF') return -1;
  let i = 13 + ((b[10] & 0x80) ? 3 * (1 << ((b[10] & 7) + 1)) : 0), n = 0;
  const sous = () => { while (i < b.length && b[i]) i += b[i] + 1; i++; };
  while (i < b.length) {
    if (b[i] === 0x3B) return n;
    if (b[i] === 0x21) { i += 2; sous(); }
    else if (b[i] === 0x2C) { n++; const lct = (b[i + 9] & 0x80) ? 3 * (1 << ((b[i + 9] & 7) + 1)) : 0; i += 10 + lct + 1; sous(); }
    else return -1;
  }
  return -1;
}

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
    s1: { if (!voulu('1')) break s1;
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

    }
    /* ═══ 2. UN FICHIER ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    s2: { if (!voulu('2')) break s2;
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

    }
    /* ═══ 3. UN VOCAL ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    s3: { if (!voulu('3')) break s3;
    console.log('\n── Un vocal : enregistré (micro simulé), envoyé, lu chez l\'autre ──');
    const vocauxAvant = await nombre(B, '#conv-messages .vocal');
    /* le compteur de la barre d'enregistrement, relevé à chaque changement : ce que la personne VOIT au moment d'envoyer */
    await A.page.evaluate(() => { window.__cpt = ''; new MutationObserver(() => { window.__cpt = document.getElementById('enreg-duree').textContent; }).observe(document.getElementById('enreg-duree'), { childList: true, characterData: true, subtree: true }); });
    await toucher(A, '#compo-micro');
    await verifier('le micro DÉMARRE l\'enregistrement (la barre d\'enregistrement paraît, la durée court)', A, () => !document.getElementById('enreg').hidden, null, 8000, () => lire(A, '#avis'));
    await capture(A, '3-enregistrement');
    await dormir(1700);
    await toucher(A, '#enreg-envoyer');
    await verifier('⛔ le vocal part pour de vrai : la bulle paraît chez Bruno, avec sa durée (≥ 1 s)', B, n => document.querySelectorAll('#conv-messages .vocal').length > n && /\d+:\d\d/.test(document.querySelector('#conv-messages .vocal:last-of-type .vocal-duree, #conv-messages .msg:last-of-type .vocal-duree').textContent), vocauxAvant, 20000, () => lire(B, '#conv-messages'));
    await verifier('et chez Alice aussi (sa propre bulle vocale)', A, () => document.querySelectorAll('#conv-messages .msg.de-moi .vocal').length >= 1, null, 8000);
    {
      const compteur = await A.page.evaluate(() => window.__cpt);
      const dureeDe = (S, sens) => S.page.evaluate(s => { const l = [...document.querySelectorAll('#conv-messages .msg.' + s + ' .vocal-duree')]; return l.length ? l[l.length - 1].textContent : null; }, sens);
      vrai('population : le compteur a tourné (« ' + compteur + ' » à l\'envoi) — l\'enregistrement a duré plus d\'une seconde', /^0:0[1-9]$|^0:[1-5]\d$/.test(compteur));
      v('⛔ la durée de la bulle est EXACTEMENT celle que le compteur montrait à l\'envoi — ni arrondie vers le haut (1:05 devenait 1:06, 0:01 devenait 0:02), ni celle, un instant plus tard, de l\'arrêt du micro — chez Alice comme chez Bruno', [await dureeDe(A, 'de-moi'), await dureeDe(B, 'de-autre')], [compteur, compteur]);
    }
    const lecturesAvant = await B.page.evaluate(() => window.__plays.length);
    await toucher(B, '#conv-messages .msg.de-autre .vocal');
    await verifier('⛔ Bruno LIT le vocal : un élément audio démarre sur une adresse blob:, le bouton passe en « lecture »', B, n => window.__plays.length > n && window.__plays[window.__plays.length - 1] === 'blob:' && !!document.querySelector('#conv-messages .vocal[data-lecture]'), lecturesAvant, 12000, () => B.page.evaluate(() => JSON.stringify({ plays: window.__plays, lecture: !!document.querySelector('.vocal[data-lecture]'), avis: (document.getElementById('avis') || {}).textContent })));
    await verifier('…et la lecture se termine toute seule (le bouton reprend sa forme de repos)', B, () => !document.querySelector('#conv-messages .vocal[data-lecture]'), null, 15000);
    await largeur(B, 'conversation avec vocal et fichier');

    }
    /* ═══ 4. LA PHOTO DE PROFIL ══════════════════════════════════════════════════════════════════════════════════════════════ */
    s4: { if (!voulu('4')) break s4;
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

    }
    /* ═══ 5. LES RÉGLAGES ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    s5: { if (!voulu('5')) break s5;
    console.log('\n── Les réglages : interrupteurs réciproques, refus dit puis effacé, stockage, autres appareils ──');
    await verifier('population : Alice est en ligne pour Bruno (le point vert de la liste)', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !!l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 12000);
    await A.page.route('**/api/moi/confidentialite', async (route) => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '30' }, body: JSON.stringify({ error: 'quota_atteint', retry: 30 }) });
      else await route.continue();
    });
    await rubrique(A, 'confidentialite');
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('⛔ le service refuse (429) : l\'interrupteur NE tourne PAS, et la phrase le dit avec l\'attente', A, () => document.querySelector('[data-reg-cle="presence"]').getAttribute('aria-checked') === 'true' && /réessaie dans 30 s/.test(document.getElementById('reg-conf').textContent), null, 8000, () => lire(A, '#reg-conf'));
    await A.page.unroute('**/api/moi/confidentialite');
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('⛔ la réussite suivante tourne l\'interrupteur ET efface le refus', A, () => document.querySelector('[data-reg-cle="presence"]').getAttribute('aria-checked') === 'false' && !/réessaie dans/.test(document.getElementById('reg-conf').textContent), null, 8000, () => lire(A, '#reg-conf'));
    await verifier('⛔ RÉCIPROQUE : Bruno ne voit plus Alice en ligne', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 15000);
    await toucher(A, '[data-reg-cle="presence"]');
    await verifier('elle rallume : Bruno la revoit en ligne', B, nom => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent === nom); return !!l && !!l.querySelector('.avatar.en-ligne'); }, NOMS.alice, 15000);
    await rubrique(A, 'stockage');
    await verifier('le stockage dit ce qui est utilisé sur 50 Go, avec sa jauge', A, () => /utilisés sur 50 Go/.test(document.getElementById('reg-stock').textContent) && !!document.querySelector('#reg-stock .jauge i'), null, 8000, () => lire(A, '#reg-stock'));
    await rubrique(A, 'apropos');
    await verifier('« À propos » dit la version et les maximums', A, () => /version \d/.test(document.getElementById('reg-apropos').textContent) && /Au plus/.test(document.getElementById('reg-apropos').textContent), null, 8000, () => lire(A, '#reg-apropos'));
    await largeur(A, 'Réglages (rempli)');
    /* « Déconnecter les autres appareils » : une seconde session d'Alice, coupée */
    await connecter(C, 'alice');
    await rubrique(A, 'appareils');
    await toucher(A, '#reg-autres');
    await verifier('une première touche DEMANDE confirmation (« Toucher encore »)', A, () => /Toucher encore/.test(document.getElementById('reg-autres').textContent), null, 3000, () => lire(A, '#reg-autres'));
    await toucher(A, '#reg-autres');
    await verifier('⛔ la seconde touche déconnecte : « Un autre appareil déconnecté »', A, () => /Un autre appareil déconnecté/.test(document.getElementById('mot').textContent), null, 8000, () => lire(A, '#mot'));
    await verifier('⛔ l\'autre appareil d\'Alice REPART à l\'écran de connexion (sa session est coupée)', C, () => !document.getElementById('connexion').hidden, null, 12000, () => lire(C, 'body'));
    vrai('population : le nom d\'Alice est toujours dans sa barre', (await lire(A, '#moi-nom')) === NOMS.alice);

    }
    /* ═══ 6. LA PHOTO D'UN GROUPE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    s6: { if (!voulu('6')) break s6;
    console.log('\n── La photo d\'un groupe : à la création ──');
    await onglet(A, 'messages');
    await toucher(A, '#btn-plus'); await toucher(A, '[data-nd-act="groupe"]');
    await verifier('la feuille « Nouveau groupe » s\'ouvre', A, () => !document.getElementById('feuille').inert && !document.getElementById('g-contacts').hidden, null, 8000);
    await choisir(A, () => A.page.locator('#g-photo').click(), { name: 'groupe.png', mimeType: 'image/png', buffer: PNG_ROUGE });
    await verifier('la photo choisie remplit le rond', A, () => document.getElementById('g-photo').classList.contains('avec-image'), null, 10000);
    await saisir(A, '#g-nom', 'Équipe photo');
    await toucher(A, '#g-contacts .contact[role="checkbox"]');
    await toucher(A, '#g-creer');
    await verifier('⛔ le groupe est créé AVEC sa photo : sa ligne porte une image, chez Alice…', A, () => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent.includes('Équipe photo')); return !!l && !!l.querySelector('.avatar[style*="background-image"]'); }, null, 20000, () => A.page.evaluate(() => document.getElementById('liste-conv').innerHTML.slice(0, 400)));
    await verifier('…et chez Bruno (membre), sans recharger', B, () => { const l = [...document.querySelectorAll('#liste-conv .conv')].find(x => x.querySelector('.conv-nom').textContent.includes('Équipe photo')); return !!l && !!l.querySelector('.avatar[style*="background-image"]'); }, null, 20000, () => B.page.evaluate(() => document.getElementById('liste-conv').innerHTML.slice(0, 400)));
    await capture(B, '6-groupe');

    }
    /* ═══ 6 bis. LA RELECTURE DU TESTEUR (3 octobre 2026) ═════════════════════════════════════════════════════════════════════ */
    s6b: { if (!voulu('6b')) break s6b;
    console.log('\n── La relecture du testeur : onze photos dites, un GIF qui reste animé, des photos qui gardent leurs proportions, une photo indisponible lisible, une pièce refusée qui reste (Réessayer / Annuler), un statut qui dit vrai ──');
    if (!SECTIONS.length) { await ouvrirConvAvec(A, NOMS.bruno); await ouvrirConvAvec(B, NOMS.alice); }      // (une section jouée seule : les deux pages n'ont pas quitté la conversation, et une conversation sans message n'est pas dans la liste)
    const photosMsg = (S, sens) => S.page.evaluate(s => [...document.querySelectorAll('#conv-messages .msg.' + s + ' .photos')].map(e => e.querySelectorAll('.photo').length), sens);
    /* les octets de la photo-message la plus récente (k = 0) ou de la k-ième avant elle, lus du SERVICE par la page de Bruno (même origine : le navigateur ne lit pas un blob:) */
    const octetsPiece = async (S, conv, k) => Buffer.from(await S.page.evaluate(async ([c, k2]) => {
      const j = await (await fetch('/api/conversations/' + c + '/messages?limite=80')).json(), l = j.messages.filter(x => x.type === 'photo'), m = l[l.length - 1 - k2];
      return Array.from(new Uint8Array(await (await fetch('/api/pieces/' + m.meta.pieces[0].id)).arrayBuffer()));
    }, [conv, k || 0]));

    /* ── 1. onze photos choisies : la onzième se DIT ── */
    const onze = Array.from({ length: 11 }, (_, i) => ({ name: 'p' + (i + 1) + '.png', mimeType: 'image/png', buffer: F.png({ couleur: [15 * i + 20, 70, 170 - 10 * i] }) }));
    const envoisAvant11 = A.envois.length, msgPhotosB0 = (await photosMsg(B, 'de-autre')).length;
    await choisirDansPlus(A, 'photo', onze);
    await verifier('⛔ onze photos choisies : la page DIT que la onzième n\'a pas été envoyée (relecture du testeur : elle disparaissait sans un mot)', A, () => /10 photos au plus par envoi : la onzième n'a pas été envoyée/.test(document.getElementById('avis').textContent), null, 20000, () => lire(A, '#avis'));
    await capture(A, '6b-onze-photos');
    await verifier('…et les DIX premières arrivent chez Bruno, en UN message de dix photos', B, n => { const l = [...document.querySelectorAll('#conv-messages .msg.de-autre .photos')]; return l.length === n + 1 && l[l.length - 1].querySelectorAll('.photo').length === 10; }, msgPhotosB0, 40000, () => lire(B, '#conv-messages'));
    v('population : DIX dépôts, pas onze (la onzième n\'a quitté l\'appareil à aucun moment)', A.envois.length - envoisAvant11, 10);

    /* ── 2. un GIF reste un GIF ── */
    const gifAnime = F.gif({ images: 2, netscape: true, commentaire: 'canari-gif-9f3a-secret' });
    const msgPhotosB1 = (await photosMsg(B, 'de-autre')).length;
    await choisirDansPlus(A, 'photo', { name: 'anime.gif', mimeType: 'image/gif', buffer: gifAnime });
    await verifier('un GIF animé de 2 images part : la bulle paraît chez Bruno', B, n => document.querySelectorAll('#conv-messages .msg.de-autre .photos').length > n, msgPhotosB1, 25000, () => lire(B, '#conv-messages'));
    const octGif = await octetsPiece(B, acc[2], 0);
    v('⛔ il reste ANIMÉ (relecture du testeur : il devenait une image fixe, sans que rien ne le dise) : « GIF89a », les DEUX images, la boucle, et le commentaire retiré par le service', [octGif.subarray(0, 6).toString('latin1'), imagesGif(octGif), octGif.includes(Buffer.from('NETSCAPE2.0')), octGif.includes(Buffer.from('canari-gif-9f3a'))], ['GIF89a', 2, true, false]);
    const gifLourd = F.gif({ commentaire: 'x'.repeat(PHOTO_MAX + 20000) });
    await choisirDansPlus(A, 'photo', { name: 'lourd.gif', mimeType: 'image/gif', buffer: gifLourd });
    await verifier('⛔ un GIF plus lourd que le maximum d\'une photo (' + Math.round(PHOTO_MAX / 1024) + ' Ko) : la page DIT qu\'il part sans mouvement', A, () => /Un GIF était trop lourd pour rester animé : il est parti sans mouvement/.test(document.getElementById('avis').textContent), null, 20000, () => lire(A, '#avis'));
    await verifier('…et il arrive chez Bruno', B, n => document.querySelectorAll('#conv-messages .msg.de-autre .photos').length > n, msgPhotosB1 + 1, 25000);
    const octLourd = await octetsPiece(B, acc[2], 0);
    v('…en image fixe : un JPEG (FF D8 FF), pas un GIF', [octLourd[0], octLourd[1], octLourd[2]], [0xFF, 0xD8, 0xFF]);

    /* ── 3. une photo seule garde ses proportions ── */
    const msgPhotosB2 = (await photosMsg(B, 'de-autre')).length;
    const FORMES = [['haute', 400, 800], ['large', 800, 400], ['panorama', 1600, 160], ['minuscule', 20, 20]];
    for (const [nom, w, h] of FORMES) await choisirDansPlus(A, 'photo', { name: nom + '.png', mimeType: 'image/png', buffer: F.png({ w, h, couleur: [90, 140, 210] }) });
    await verifier('quatre photos de formes différentes (haute, large, panorama, minuscule) arrivent chez Bruno', B, n => document.querySelectorAll('#conv-messages .msg.de-autre .photos').length >= n + 4, msgPhotosB2, 40000, () => lire(B, '#conv-messages'));
    for (const [S, sens] of [[B, 'de-autre'], [A, 'de-moi']]) await verifier('…et les quatre cases sont des IMAGES dessinées (largeur naturelle connue), pas des cases en attente — chez ' + S.nom, S, s => { const l = [...document.querySelectorAll('#conv-messages .msg.' + s + ' .photos.une .photo')].slice(-4); return l.length === 4 && l.every(c => { const i = c.querySelector('img'); return !!i && i.complete && i.naturalWidth > 0; }); }, sens, 20000, () => lire(S, '#conv-messages'));
    const mesures = (S, sens) => S.page.evaluate(s => [...document.querySelectorAll('#conv-messages .msg.' + s + ' .photos.une .photo')].slice(-4).map(bt => { const r = bt.getBoundingClientRect(), im = bt.querySelector('img'); return { w: Math.round(r.width), h: Math.round(r.height), nw: im ? im.naturalWidth : 0, nh: im ? im.naturalHeight : 0, ajuste: im ? getComputedStyle(im).objectFit : null }; }), sens);
    for (const [S, sens] of [[B, 'de-autre'], [A, 'de-moi']]) {
      const m = await mesures(S, sens);
      vrai(S.nom + ' : (population) quatre photos seules mesurées, avec leurs dimensions naturelles (' + JSON.stringify(m.map(x => x.nw + '×' + x.nh)) + ')', m.length === 4 && m.every(x => x.nw > 0 && x.nh > 0));
      const [haute, large, pano, mini] = m;
      v(S.nom + ' : ⛔ la photo HAUTE (400 × 800) garde son rapport 1:2 — pas un 200 × 150 recadré —, dans une boîte d\'au plus 240 × 320', [Math.abs(haute.w / haute.h - haute.nw / haute.nh) < .02, haute.w <= 241, haute.h <= 321, haute.h > haute.w], [true, true, true, true]);
      v(S.nom + ' : ⛔ la photo LARGE (800 × 400) garde son rapport 2:1', [Math.abs(large.w / large.h - large.nw / large.nh) < .02, large.w <= 241, large.h <= 321, large.w > large.h], [true, true, true, true]);
      v(S.nom + ' : ⛔ le PANORAMA (1 600 × 160) est vu ENTIER (contain), dans une boîte qui ne dépasse pas 240 de large ni ne tombe sous 72 de haut', [pano.ajuste, pano.w <= 241, pano.h >= 72, pano.w > pano.h], ['contain', true, true, true]);
      v(S.nom + ' : ⛔ une image minuscule (20 × 20) n\'est pas un point : au moins 72 px de côté', [mini.w >= 72, mini.h >= 72], [true, true]);
    }
    await capture(B, '6b-proportions'); await capture(A, '6b-proportions');
    await largeur(A, 'conversation avec des photos de toutes formes'); await largeur(B, 'conversation avec des photos de toutes formes');

    /* ── 4. une photo indisponible se LIT (la pièce n'existe plus chez le service : 404) ── */
    await B.page.route('**/api/pieces/f_*', route => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'introuvable' }) }));
    await choisirDansPlus(A, 'photo', { name: 'disparue.png', mimeType: 'image/png', buffer: F.png({ couleur: [200, 120, 20] }) });
    await verifier('⛔ une photo que le service ne rend plus (404) : la case dit « Photo indisponible » EN TOUTES LETTRES, pas par une seule icône', B, () => { const c = [...document.querySelectorAll('#conv-messages .msg.de-autre .photo.indisponible')].pop(); const t = c && c.querySelector('.photo-etat'); return !!t && t.textContent === 'Photo indisponible' && t.getClientRects().length > 0 && c.getAttribute('aria-label') === 'Photo indisponible'; }, null, 25000, () => B.page.evaluate(() => document.querySelector('#conv-messages').innerHTML.slice(-400)));
    const caseIndispo = await B.page.evaluate(() => { const c = [...document.querySelectorAll('#conv-messages .msg.de-autre .photo.indisponible')].pop(), t = c.querySelector('.photo-etat'), rc = c.getBoundingClientRect(), rt = t.getBoundingClientRect(); return { dedans: rt.left >= rc.left - 1 && rt.right <= rc.right + 1 && rt.top >= rc.top - 1 && rt.bottom <= rc.bottom + 1, coupe: t.scrollWidth > t.clientWidth + 1, w: Math.round(rc.width), lignes: Math.round(rt.height / parseFloat(getComputedStyle(t).lineHeight)) }; });
    v('…et le texte tient DANS la case, sur deux lignes au plus, sans être coupé ni cassé au milieu d\'un mot ; la case est au moins aussi large qu\'une vignette de grille (118 px) — même pour une image de 8 × 8 points, dont la boîte n\'est que de 72 (case de ' + caseIndispo.w + ' px, ' + caseIndispo.lignes + ' ligne(s))', [caseIndispo.dedans, caseIndispo.coupe, caseIndispo.lignes <= 2, caseIndispo.w >= 118], [true, false, true, true]);
    await capture(B, '6b-indisponible');
    await B.page.unroute('**/api/pieces/f_*');

    /* ── 5. une pièce que le service refuse POUR L'INSTANT reste, avec « Réessayer » et « Annuler » ── */
    const msgPhotosA0 = (await photosMsg(A, 'de-moi')).length, msgPhotosB3 = (await photosMsg(B, 'de-autre')).length, envoisRefus0 = A.envois.length;
    await A.page.route('**/api/pieces?*', route => route.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '20' }, body: JSON.stringify({ error: 'quota_atteint', retry: 20 }) }));
    await choisirDansPlus(A, 'photo', { name: 'refusee.png', mimeType: 'image/png', buffer: F.png({ couleur: [160, 60, 200] }) });
    await verifier('⛔ le service refuse (429) : la photo RESTE dans le fil, avec « Pas envoyé : Trop de demandes en peu de temps (réessaie dans 20 s). » — UNE seule invitation à réessayer, avec l\'attente exacte', A, () => { const t = [...document.querySelectorAll('#conv-messages .msg.de-moi .echec-texte')].pop(); return !!t && t.textContent === 'Pas envoyé : Trop de demandes en peu de temps (réessaie dans 20 s).'; }, null, 20000, () => lire(A, '#conv-messages'));
    await capture(A, '6b-refus-429');
    const echec = await A.page.evaluate(() => { const m = [...document.querySelectorAll('#conv-messages .msg.de-moi')].pop(), bt = [...m.querySelectorAll('.echec button')]; return { photos: m.querySelectorAll('.photo').length, boutons: bt.map(x => x.textContent), hauteurs: bt.map(x => Math.round(x.getBoundingClientRect().height)), statut: !!m.querySelector('.statut'), avis: document.getElementById('avis').textContent }; });
    v('…avec ses deux boutons, assez grands pour un doigt (≥ 44 px), l\'image toujours là, et AUCUN statut « Envoi… » / « En attente de connexion… » par-dessus', [echec.photos, echec.boutons, echec.hauteurs.every(h => h >= 44), echec.statut], [1, ['Réessayer', 'Annuler'], true, false]);
    vrai('…et l\'avis le dit aussi (la personne peut être ailleurs) : « Une photo n\'a pas pu être envoyée : Trop de demandes… »', /^Une photo n'a pas pu être envoyée : Trop de demandes en peu de temps/.test(echec.avis));
    await dormir(1500);
    v('⛔ elle ne repart PAS toute seule : un seul dépôt tenté en 1,5 s de plus, et Bruno ne voit rien de neuf', [A.envois.length - envoisRefus0, (await photosMsg(B, 'de-autre')).length], [1, msgPhotosB3]);
    await A.page.unroute('**/api/pieces?*');
    await toucher(A, '#conv-messages .msg.de-moi .echec [data-reessayer]');
    await verifier('⛔ « Réessayer » : la photo part (même bulle), Bruno la voit UNE fois, et plus rien ne reste en échec', B, n => document.querySelectorAll('#conv-messages .msg.de-autre .photos').length === n + 1, msgPhotosB3, 25000, () => lire(B, '#conv-messages'));
    await verifier('…chez Alice : la bulle a trouvé son statut (« Envoyé » ou « Lu »), l\'échec a disparu, UNE bulle de plus', A, n => !document.querySelector('#conv-messages .echec') && document.querySelectorAll('#conv-messages .msg.de-moi .photos').length === n + 1 && /^(Envoyé|Lu)/.test([...document.querySelectorAll('#conv-messages .statut')].pop().textContent), msgPhotosA0, 25000, () => lire(A, '#conv-messages'));
    await A.page.route('**/api/pieces?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'disque_plein' }) }));
    const envoisRefus1 = A.envois.length;
    await choisirDansPlus(A, 'photo', { name: 'annulee.png', mimeType: 'image/png', buffer: F.png({ couleur: [20, 160, 160] }) });
    await verifier('⛔ le service est en lecture seule (503) : la photo reste aussi, avec SA phrase', A, () => { const t = [...document.querySelectorAll('#conv-messages .msg.de-moi .echec-texte')].pop(); return !!t && /^Pas envoyé : Le service est momentanément en lecture seule/.test(t.textContent); }, null, 20000, () => lire(A, '#conv-messages'));
    await toucher(A, '#conv-messages .msg.de-moi .echec [data-annuler]');
    await verifier('⛔ « Annuler » : la bulle disparaît pour de bon, et rien n\'est parti', A, n => !document.querySelector('#conv-messages .echec') && document.querySelectorAll('#conv-messages .msg.de-moi .photos').length === n + 1, msgPhotosA0, 8000, () => lire(A, '#conv-messages'));
    await dormir(1200);
    v('…aucun dépôt de plus après l\'annulation, et Bruno n\'a rien de plus', [A.envois.length - envoisRefus1, (await photosMsg(B, 'de-autre')).length], [1, msgPhotosB3 + 1]);
    await A.page.unroute('**/api/pieces?*');

    /* ── 6. hors ligne : le statut dit vrai, la panne se dit UNE fois, les essais s'espacent, et rien n'arrive en double au retour ── */
    await A.page.evaluate(() => { window.__avisVus = []; new MutationObserver(() => { const t = document.getElementById('avis').textContent; if (t) window.__avisVus.push(t); }).observe(document.getElementById('avis'), { childList: true, characterData: true, subtree: true }); });
    const msgPhotosA1 = (await photosMsg(A, 'de-moi')).length, msgPhotosB4 = (await photosMsg(B, 'de-autre')).length;
    await A.ctx.setOffline(true);
    await choisirDansPlus(A, 'photo', { name: 'hors-ligne.png', mimeType: 'image/png', buffer: F.png({ couleur: [10, 160, 90] }) });
    await verifier('⛔ réseau coupé : la panne se DIT (un avis), au lieu d\'un petit statut que personne ne lit', A, () => window.__avisVus.some(t => /^Pas de connexion : ta photo partira dès que le réseau reviendra/.test(t)), null, 12000, () => lire(A, '#avis'));
    await verifier('…et le message attend (« En attente de connexion… »)', A, () => [...document.querySelectorAll('#conv-messages .statut')].some(e => e.textContent === 'En attente de connexion…'), null, 8000, () => lire(A, '#conv-messages'));
    await dormir(1000);
    const envoisHL0 = A.envois.length;
    const echant = await A.page.evaluate(() => new Promise(ok => { const vus = []; const t0 = Date.now(); const id = setInterval(() => { vus.push([...document.querySelectorAll('#conv-messages .statut')].map(e => e.textContent).join('|')); if (Date.now() - t0 > 5500) { clearInterval(id); ok(vus); } }, 100); }));
    v('⛔ pendant cinq secondes hors ligne, le statut dit TOUJOURS « En attente de connexion… » — jamais « Envoi… » alors que rien ne part (' + echant.length + ' relevés)', [echant.length > 40, Array.from(new Set(echant))], [true, ['En attente de connexion…']]);
    vrai('⛔ les essais s\'ESPACENT : entre une et deux requêtes de dépôt en cinq secondes (le testeur en comptait 21 en 12 s) — ' + (A.envois.length - envoisHL0) + ' relevée(s)', A.envois.length - envoisHL0 >= 1 && A.envois.length - envoisHL0 <= 2);
    await A.ctx.setOffline(false);
    await verifier('⛔ le réseau revient : la photo part, UNE fois chez Bruno', B, n => document.querySelectorAll('#conv-messages .msg.de-autre .photos').length === n + 1, msgPhotosB4, 40000, () => lire(B, '#conv-messages'));
    await verifier('…et chez Alice : plus d\'attente, UNE bulle de plus, « Envoyé » ou « Lu »', A, n => document.querySelectorAll('#conv-messages .msg.de-moi .photos').length === n + 1 && /^(Envoyé|Lu)/.test([...document.querySelectorAll('#conv-messages .statut')].pop().textContent), msgPhotosA1, 25000, () => lire(A, '#conv-messages'));
    await dormir(1500);
    v('⛔ aucun doublon au retour (chez Bruno, chez Alice), et UN seul avis « Pas de connexion » pendant toute la coupure', [(await photosMsg(B, 'de-autre')).length, (await photosMsg(A, 'de-moi')).length, (await A.page.evaluate(() => window.__avisVus.filter(t => /^Pas de connexion/.test(t)).length))], [msgPhotosB4 + 1, msgPhotosA1 + 1, 1]);

    /* ── 7. MA présence : la barre latérale ne dit plus « Disponible » quand elle est coupée ── */
    await onglet(B, 'reglages'); await rubrique(B, 'confidentialite');
    await verifier('population : la barre latérale de Bruno dit « Disponible », point vert', B, () => document.getElementById('moi-statut-texte').textContent === 'Disponible' && !document.getElementById('moi-statut').classList.contains('masque'), null, 5000, () => lire(B, '#moi-statut'));
    const vert = await B.page.evaluate(() => getComputedStyle(document.querySelector('#moi-statut i')).backgroundColor);
    await toucher(B, '[data-reg-cle="presence"]');
    await verifier('⛔ Bruno masque sa présence : SA barre ne dit plus « Disponible » avec un point vert — « Présence masquée »', B, () => document.getElementById('moi-statut-texte').textContent === 'Présence masquée' && document.getElementById('moi-statut').classList.contains('masque'), null, 8000, () => lire(B, '#moi-statut'));
    const gris = await B.page.evaluate(() => getComputedStyle(document.querySelector('#moi-statut i')).backgroundColor);
    vrai('…le point n\'est plus vert (' + vert + ' → ' + gris + '), et la barre est bien VISIBLE à l\'écran (bureau)', gris !== vert && await B.page.evaluate(() => document.getElementById('moi-statut').getClientRects().length > 0));
    await capture(B, '6b-presence-masquee');
    await toucher(B, '[data-reg-cle="presence"]');
    await verifier('il rallume : « Disponible » revient, le point reverdit', B, () => document.getElementById('moi-statut-texte').textContent === 'Disponible' && !document.getElementById('moi-statut').classList.contains('masque'), null, 8000, () => lire(B, '#moi-statut'));

    }
    /* ═══ 7. LA FIN : RIEN D'ANORMAL ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La fin : aucune erreur, aucun débordement, rien d\'extérieur ──');
    /* un refus du service est LOGUÉ par le navigateur (« Failed to load resource … status of 4xx ») : on les compte et on les NOMME — Alice : la visite sans session (401) et le refus
       que la sonde a fait faire (429) ; Bruno : la visite sans session. Toute autre erreur de console est un défaut. */
    const refus = S => S.console.filter(t => /Failed to load resource/.test(t)).map(t => (/status of (\d{3})/.exec(t) || [])[1] || 'reseau');
    if (voulu('6b')) vrai('Alice : (population) la coupure voulue a bien été vue du navigateur (' + refus(A).filter(x => x === 'reseau').length + ' requête(s) tombée(s) hors ligne)', refus(A).filter(x => x === 'reseau').length >= 1);
    for (const [S, attendus] of [[A, ['401', '429', '429', '503']], [B, ['401', '404']]]) {
      if (!SECTIONS.length) vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + S.ecrans + ' écrans mesurés en largeur', S.gestes > 3 && S.ecrans >= 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus attendu', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      if (!SECTIONS.length) v(S.nom + ' : les refus réseau relevés (hors la coupure voulue) sont exactement ceux qu\'on attendait', refus(S).filter(x => x !== 'reseau').sort(), attendus.slice().sort());
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
