/* ══ SONDE DE BOUT EN BOUT — LES NOTIFICATIONS, L'EXPORT ET LA SUPPRESSION D'OP MESSAGES, DANS DE VRAIS NAVIGATEURS ═══════════════════════════════
   `tests/test-958.js` fait parler le module de données de la page au vrai service avec un FAUX navigateur ; `tests/test-956.js` et `test-957.js` jouent le service seul. Celle-ci joue ce
   que seul un navigateur voit : la VRAIE PAGE SERVIE (`server-msg/public/`), le VRAI `sw.js` enregistré dans un vrai Chromium, le VRAI service, un OP GESTION factice et un faux service push —
   tout sur 127.0.0.1.

   ⛔ CE QUE CETTE SONDE NE PEUT PAS JOUER, ET DIT : un vrai abonnement push passe par le service push du navigateur (Google, Mozilla, Apple) — c'est-à-dire par Internet, que ce conteneur
   n'a pas. Dans ce navigateur-ci, `PushManager.subscribe` ÉCHOUERAIT ; la sonde le remplace par un abonnement de banc (un vrai appareil P-256 inscrit chez le faux service push), TOUT LE RESTE est
   réel : l'autorisation (accordée par le contexte), l'enregistrement du service worker (portée « / », CSP comprise), le manifeste, la clé du service passée au navigateur, la page, les routes. Et
   l'arrivée d'une notification est jouée par un évènement `push` fabriqué et remis au VRAI `sw.js`, avec la charge DÉCHIFFRÉE de ce que le VRAI service a envoyé au faux service push.
   Un vrai push sur un vrai téléphone n'est vérifiable que par Justin (iPhone : page ajoutée à l'écran d'accueil).

   Ce qu'elle joue : le manifeste servi et lu ; AUCUN service worker avant la demande ; Réglages > Notifications (activer, essai, aperçu, désactiver) au téléphone (393) et au bureau (1440) ;
   les états « impossible ici » (iPhone hors écran d'accueil, navigateur sans push) et « refusée » ; une notification montrée par le vrai `sw.js`, touchée → la conversation s'ouvre ; la page
   visible acquitte, la page cachée non ; Réglages > Compte : l'export téléchargé (un par jour, le refus dit), la feuille « Supprimer mon compte » jusqu'à l'écran de connexion avec la date,
   la reconnexion qui annule ; la sourdine ; un compte supprimé dans la liste et le compositeur ; l'absence d'erreur dans la console et de débordement d'écran.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-push.js
              CAPTURES=/dossier   (une capture de chaque navigateur à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const P = require('./outils-push');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-push.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const PROFILS = {
  iphone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false, insets: null },
};
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dora: 'pw-dora-12345' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', dora: 'Dora Leroy' };
const ACK_MS = 1500;
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

/* L'abonnement de banc qu'on met À LA PLACE de celui du service push du navigateur (le seul morceau qui exigerait Internet) : un vrai appareil P-256, et l'état « abonné » qui survit à un rechargement. */
const INIT_PUSH = ({ sub }) => {
  const b64u = (b) => { const u = new Uint8Array(b); let t = ''; for (const o of u) t += String.fromCharCode(o); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const cree = () => ({ endpoint: sub.endpoint, expirationTime: null, options: {}, toJSON() { return { endpoint: sub.endpoint, expirationTime: null, keys: sub.keys }; },
    async unsubscribe() { sessionStorage.removeItem('__sub'); window.__desinscriptions = (window.__desinscriptions || 0) + 1; return true; } });
  if (typeof PushManager !== 'undefined') {
    PushManager.prototype.subscribe = async function (o) { window.__souscriptions = (window.__souscriptions || 0) + 1; window.__souscrit = { visibleSeul: o.userVisibleOnly, octets: new Uint8Array(o.applicationServerKey).length, cle: b64u(o.applicationServerKey) }; sessionStorage.setItem('__sub', '1'); return cree(); };
    PushManager.prototype.getSubscription = async function () { return sessionStorage.getItem('__sub') === '1' ? cree() : null; };
  }
  /* la visibilité de la page se joue : la sonde dit si la page est « sous les yeux » (le navigateur sans écran ne le sait pas) */
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis || 'visible' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => (window.__vis || 'visible') !== 'visible' });
};

async function ouvrir(b, base, pf, o) {
  o = o || {};
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: 'Europe/Paris', permissions: o.notifications === false ? [] : ['notifications'], baseURL: base, acceptDownloads: true, userAgent: o.ua,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, nom: '?', base, erreurs: [], console: [], gestes: 0, requetes: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('request', r => { const u = new URL(r.url()); if (u.origin === new URL(base).origin) S.requetes.push(r.method() + ' ' + u.pathname); });
  if (o.sub) await page.addInitScript(INIT_PUSH, { sub: o.sub });
  if (o.sansPush) await page.addInitScript(() => { try { delete window.PushManager; } catch (e) { window.PushManager = undefined; } try { delete window.Notification; } catch (e) { window.Notification = undefined; } });
  if (o.ua) await page.addInitScript((ua) => { Object.defineProperty(navigator, 'userAgent', { get: () => ua }); Object.defineProperty(navigator, 'platform', { get: () => 'iPhone' }); }, o.ua);
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
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
/* un toucher sur une commande GRISÉE (aria-disabled) : Playwright refuse d'agir sur un élément « désactivé » — c'est précisément ce qu'on veut éprouver, on force */
async function toucherGrise(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  if (S.pf.mobile) await loc.tap({ force: true }); else await loc.click({ force: true });
}
async function saisir(S, sel, texte) { await S.page.locator(sel).fill(texte); S.gestes++; }
async function capture(S, nom) {
  if (!DOSSIER_CAPTURES) return;
  try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '-' + S.pf.nom.replace(/\W+/g, '') + '.png') }); } catch (e) { /* facultatif */ }
}
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
}
async function retourListe(S) {
  const vis = await S.page.evaluate(() => { const e = document.getElementById('conv-retour'); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  if (vis) { await toucher(S, '#conv-retour'); await S.page.waitForFunction(() => document.documentElement.dataset.conv !== '1', null, { timeout: 4000 }).catch(() => {}); }
}
async function onglet(S, vue) { await retourListe(S); await toucher(S, 'a[data-vue="' + vue + '"]'); await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 }); }
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length };
  });
  await mesure(); await dormir(600); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1; S.population = (S.population || 0) + b.n;
  if (b.sx > 0 || b.dep > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx);
}
const reg = (S) => lire(S, '#reg-notif');
const dechiffrer = (app, e) => JSON.parse(P.dechiffrer(app, e.corps));

async function parcours(b, ctx) {
  const { svc, og, fps } = ctx;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const appA = P.appareil(fps.endpoint('sonde-alice'));
  const A = await ouvrir(b, svc.base, PROFILS.iphone, { sub: appA.sub });
  const B = await ouvrir(b, svc.base, PROFILS.bureau, { notifications: false, sub: P.appareil(fps.endpoint('sonde-bruno')).sub });
  A.nom = 'Alice'; B.nom = 'Bruno';
  const tous = [A, B];
  try {
    /* ═══ 1. LES FICHIERS SERVIS, VUS PAR LE NAVIGATEUR ══════════════════════════════════════════════════════════════════════════ */
    console.log('── Le manifeste est lu, et AUCUN service worker n\'existe avant la demande ──');
    await connecter(A, 'alice'); await connecter(B, 'bruno');
    const avant = await A.page.evaluate(async () => {
      const lien = document.querySelector('link[rel="manifest"]'), m = lien ? await (await fetch(lien.href)).json() : null;
      const apple = document.querySelector('link[rel="apple-touch-icon"]');
      return { lien: lien && lien.getAttribute('href'), nom: m && m.name, affichage: m && m.display, apple: apple && apple.getAttribute('href'), reg: !!(await navigator.serviceWorker.getRegistration('/')), perm: Notification.permission };
    });
    v('la page déclare son manifeste (lu par le navigateur : « OP MESSAGES », standalone) et son icône d\'écran d\'accueil', [avant.lien, avant.nom, avant.affichage, avant.apple], ['manifest.webmanifest', 'OP MESSAGES', 'standalone', 'opmsg-apple-touch.png']);
    v('⛔ AUCUN service worker n\'est enregistré tant que la personne n\'a rien demandé (même avec l\'autorisation déjà accordée au site)', [avant.reg, avant.perm, A.ctx.serviceWorkers().length], [false, 'granted', 0]);
    await capture(A, '1-accueil');

    /* le contact et la conversation Alice-Bruno */
    const code = await A.page.evaluate(async () => (await (await fetch('/api/contacts/lien', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: JSON.stringify({ max: 1, jours: 7 }) })).json()).code);
    const acc = await B.page.evaluate(async c => {
      const h = { 'Content-Type': 'application/json', 'X-OPM': '1' };
      const r = await fetch('/api/liens/accepter', { method: 'POST', headers: h, body: JSON.stringify({ code: c }) }), j = await r.json();
      const d = await fetch('/api/conversations/directe', { method: 'POST', headers: h, body: JSON.stringify({ uid: j.contact.id }) }), dj = await d.json();
      return [r.status, d.status, dj.conversation.id, j.contact.id];
    }, code);
    v('population : Alice et Bruno sont contacts et leur conversation à deux existe', acc.slice(0, 2), [200, 201]);
    const conv = acc[2];
    const bruno = (texte) => B.page.evaluate(async ([c, t]) => (await fetch('/api/conversations/' + c + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: JSON.stringify({ cid: 'cid-sonde-' + Math.random().toString(36).slice(2, 12), texte: t }) })).status, [conv, texte]);

    /* ═══ 2. RÉGLAGES > NOTIFICATIONS (iPhone) ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Réglages > Notifications : activer, essai, aperçu (au doigt, iPhone 393) ──');
    await onglet(A, 'reglages');
    await verifier('la rubrique « Notifications » paraît dans Réglages : l\'interrupteur est coupé, la phrase dit que le navigateur demandera l\'autorisation', A, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'false' && /Désactivées/.test(e.textContent); }, null, 10000, () => reg(A));
    v('les trois commandes attendues, l\'essai absent tant que rien n\'est activé', await A.page.evaluate(() => ['reg-notif-sw', 'reg-notif-apercu', 'reg-notif-essai'].map(i => !!document.getElementById(i))), [true, true, false]);
    await capture(A, '2-notifications-coupees');
    await largeur(A, 'Réglages (notifications coupées)');
    await toucher(A, '#reg-notif-sw');
    await verifier('⛔ activer : l\'interrupteur passe à « Activées » — après l\'abonnement ET la réponse du service, pas avant', A, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'true' && /Activées/.test(e.textContent); }, null, 15000, () => reg(A));
    const cleService = (await T.client(svc.base).get('/api/config')).j.push.vapid;
    const sous = await A.page.evaluate(() => ({ n: window.__souscriptions, s: window.__souscrit }));
    v('⛔ le navigateur a reçu la clé du service, convertie en octets (65 octets, la même clé), et l\'abonnement est « visible » (userVisibleOnly)', [sous.n, sous.s.octets, sous.s.cle === cleService, sous.s.visibleSeul], [1, 65, true, true]);
    const sw = await A.page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/'); return r ? { scope: r.scope, actif: !!r.active } : null; });
    v('⛔ le VRAI service worker est enregistré, à la portée « / », actif (la politique de la page le laisse faire : worker-src)', [sw && sw.scope === A.base + '/', sw && sw.actif, A.ctx.serviceWorkers().length], [true, true, 1]);
    v('le service a inscrit l\'appareil (un abonnement chez Alice) et /health le compte', [sql('SELECT COUNT(*) AS n FROM push').n, (await T.client(svc.base).get('/health')).j.push.abonnements], [1, 1]);
    await verifier('l\'essai paraît (rien d\'autre n\'a changé)', A, () => !!document.getElementById('reg-notif-essai'), null, 5000);
    await capture(A, '2-notifications-activees');
    await toucher(A, '#reg-notif-essai');
    await verifier('⛔ l\'essai DIT combien d\'appareils l\'ont reçue', A, () => /Notification envoyée à 1 appareil/.test(document.getElementById('reg-notif').textContent), null, 15000, () => reg(A));
    const essais = fps.envois.filter(e => e.chemin === '/push/sonde-alice');
    vrai('population : le faux service push a reçu la notification d\'essai du vrai service', essais.length === 1);
    const chargeEssai = dechiffrer(appA, essais[0]);
    v('et ce qu\'il a reçu se déchiffre avec les clés de l\'appareil : une notification d\'essai', chargeEssai.type, 'essai');
    /* cette charge, REMISE AU VRAI sw.js : une notification est montrée (le cœur du push qu'on ne peut pas faire venir de Google) */
    const livrer = (S, charge) => S.ctx.serviceWorkers()[0].evaluate(async (data) => {
      self.dispatchEvent(new PushEvent('push', { data }));
      const debut = Date.now();
      for (;;) { const ns = await self.registration.getNotifications(); if (ns.length) return ns.map(n => ({ title: n.title, body: n.body, tag: n.tag, data: n.data, icon: new URL(n.icon).pathname })); if (Date.now() - debut > 4000) return []; await new Promise(r => setTimeout(r, 25)); }
    }, JSON.stringify(charge));
    const montre = await livrer(A, chargeEssai);
    v('⛔ le vrai sw.js MONTRE la notification, avec le titre, le texte, l\'icône du dépôt et l\'adresse à ouvrir', montre.map(n => [n.title, n.body, n.icon, n.data.url]), [['OP MESSAGES', 'Les notifications fonctionnent sur cet appareil.', '/opmsg-192.png', '/']]);
    await A.ctx.serviceWorkers()[0].evaluate(async () => { for (const n of await self.registration.getNotifications()) n.close(); });
    v('la charge n\'est pas sa propre sentinelle : une charge ILLISIBLE montre quand même « Nouveau message » (Safari retire l\'abonnement d\'un push silencieux)',
      (await A.ctx.serviceWorkers()[0].evaluate(async () => {
        self.dispatchEvent(new PushEvent('push', { data: 'pas du json {{{' }));
        const debut = Date.now(); for (;;) { const ns = await self.registration.getNotifications(); if (ns.length) { const r = ns.map(n => [n.title, n.body]); for (const n of ns) n.close(); return r; } if (Date.now() - debut > 4000) return []; await new Promise(r => setTimeout(r, 25)); }
      })), [['OP MESSAGES', 'Nouveau message']]);

    await toucher(A, '#reg-notif-apercu');
    await verifier('l\'aperçu : l\'interrupteur tourne (le service a retenu le réglage) et la phrase change', A, () => { const e = document.getElementById('reg-notif-apercu'); return !!e && e.getAttribute('aria-checked') === 'true' && /montre le nom et le début/.test(e.textContent); }, null, 10000, () => reg(A));
    v('le service l\'a retenu', JSON.parse(sql('SELECT prefs FROM personne WHERE id = ?', (await A.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.id))).prefs).apercu_notif, true);

    /* ═══ 3. UN MESSAGE ARRIVE PAGE CACHÉE : LA NOTIFICATION PART, AVEC L'APERÇU — ET LA TOUCHER OUVRE LA CONVERSATION ═══════════════════ */
    console.log('\n── Un message arrive, la page est cachée : la notification part ; la toucher ouvre la conversation ──');
    await A.page.evaluate(() => { window.__vis = 'hidden'; });
    const avantEnvoi = fps.envois.length, t0 = Date.now(), acksAvantCache = A.requetes.filter(r => r === 'POST /api/flux/ack').length;
    v('Bruno écrit', await bruno('Salut Alice, la visite est à 14 h'), 201);
    const arrivee = await T.attendre(() => fps.envois.length > avantEnvoi && fps.envois[fps.envois.length - 1], 12000, 20);
    vrai('⛔ page CACHÉE : aucun acquittement n\'est parti, et la notification arrive au faux service push après le délai du service (' + (arrivee ? arrivee.t - t0 : '?') + ' ms)', !!arrivee && A.requetes.filter(r => r === 'POST /api/flux/ack').length === acksAvantCache && arrivee.t - t0 >= ACK_MS - 100);
    const chargeMsg = dechiffrer(appA, arrivee);
    v('⛔ avec l\'aperçu activé : le nom de l\'auteur en titre, le texte en corps, l\'adresse de la conversation', [chargeMsg.titre, chargeMsg.corps, chargeMsg.url, chargeMsg.tag], ['Bruno Petit', 'Salut Alice, la visite est à 14 h', '/#messages/' + conv, conv]);
    await livrer(A, chargeMsg);
    await A.page.evaluate(() => { window.__vis = 'visible'; });
    v('population : Alice est sur Réglages, aucune conversation ouverte', [await A.page.evaluate(() => document.documentElement.dataset.conv || ''), await A.page.evaluate(() => document.documentElement.dataset.vue)], ['', 'reglages']);
    /* toucher la notification : l'évènement de clic est joué DANS le vrai service worker */
    await A.ctx.serviceWorkers()[0].evaluate(async (tag) => {
      const n = (await self.registration.getNotifications({ tag }))[0];
      self.dispatchEvent(new NotificationEvent('notificationclick', { notification: n, action: '' }));
    }, conv);
    await verifier('⛔ toucher la notification OUVRE la conversation avec Bruno dans la page déjà ouverte (le service worker a prévenu la page, qui n\'a laissé passer qu\'une conversation)', A, () => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes('Bruno Petit'), null, 10000, () => A.page.evaluate(() => document.documentElement.dataset.conv + ' / ' + document.documentElement.dataset.vue));
    v('la notification touchée est fermée', await A.ctx.serviceWorkers()[0].evaluate(async () => (await self.registration.getNotifications()).length), 0);
    await capture(A, '3-conversation-ouverte');

    /* ═══ 4. L'ACQUITTEMENT PAR LA PAGE VISIBLE ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La page visible acquitte ce qu\'elle montre ──');
    const acksAvant = A.requetes.filter(r => r === 'POST /api/flux/ack').length;
    v('Bruno écrit, la page d\'Alice est sous ses yeux', await bruno('Je suis devant la maison'), 201);
    const ack = await T.attendre(() => A.requetes.filter(r => r === 'POST /api/flux/ack').length > acksAvant, 8000, 20);
    vrai('⛔ la page VISIBLE envoie son acquittement (POST /api/flux/ack, que le service accepte avec l\'en-tête maison : aucune erreur de console)', !!ack);

    /* ═══ 5. DÉSACTIVER ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Désactiver ──');
    await onglet(A, 'reglages');
    await toucher(A, '#reg-notif-sw');
    await verifier('l\'interrupteur revient à « Désactivées »', A, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'false' && /Désactivées/.test(e.textContent) && !document.getElementById('reg-notif-essai'); }, null, 15000, () => reg(A));
    v('⛔ le service n\'a plus l\'appareil, le navigateur s\'est désabonné', [sql('SELECT COUNT(*) AS n FROM push').n, await A.page.evaluate(() => window.__desinscriptions)], [0, 1]);
    await largeur(A, 'Réglages (notifications coupées de nouveau)');

    /* ═══ 6. LES ÉTATS OÙ L'INTERRUPTEUR NE PEUT PAS TOURNER ═════════════════════════════════════════════════════════════════════ */
    console.log('\n── Les états où l\'interrupteur ne peut pas tourner : iPhone hors écran d\'accueil, navigateur sans push, autorisation refusée ──');
    {
      const cas = [
        ['iPhone dans Safari (hors écran d\'accueil)', { ua: UA_IPHONE, sansPush: true, notifications: false }, PROFILS.iphone, [/écran d'accueil/, /rouvre-le depuis son icône/]],
        ['navigateur sans notifications', { sansPush: true, notifications: false }, PROFILS.bureau, [/ne sait pas recevoir de notifications/, /Chrome, Firefox, Edge ou Safari/]],
      ];
      for (const [titre, opts, pf, motifs] of cas) {
        const X = await ouvrir(b, svc.base, pf, opts); X.nom = titre; tous.push(X);
        await connecter(X, 'dora'); await onglet(X, 'reglages');
        await verifier(titre + ' : l\'interrupteur est grisé, et la phrase dit pourquoi et comment en sortir', X, ([a, c]) => { const e = document.getElementById('reg-notif-sw'); const t = e ? e.textContent : ''; return !!e && e.getAttribute('aria-disabled') === 'true' && new RegExp(a).test(t) && new RegExp(c).test(t); }, [motifs[0].source, motifs[1].source], 10000, () => reg(X));
        await capture(X, '6-' + (titre.startsWith('iPhone') ? 'ios' : 'navigateur'));
        await toucherGrise(X, '#reg-notif-sw');
        await dormir(250);
        v('⛔ le toucher ne fait RIEN : aucun service worker, aucun abonnement au service, aucune requête d\'abonnement', [X.ctx.serviceWorkers().length, sql('SELECT COUNT(*) AS n FROM push').n, X.requetes.filter(r => /push\/abonner/.test(r)).length], [0, 0, 0]);
        v('(l\'aperçu reste réglable : il vaut pour tous les appareils de la personne)', await X.page.evaluate(() => !!document.getElementById('reg-notif-apercu')), true);
        await largeur(X, titre);
      }
      /* l'autorisation REFUSÉE par le navigateur : le réglage du site est « bloqué » */
      const R = await ouvrir(b, svc.base, PROFILS.iphone, { notifications: false, sub: P.appareil(fps.endpoint('sonde-refusee')).sub }); R.nom = 'autorisation refusée'; tous.push(R);
      let cdp = null; try { cdp = await b.newBrowserCDPSession(); await cdp.send('Browser.setPermission', { permission: { name: 'notifications' }, setting: 'denied', origin: svc.base }); } catch (e) { cdp = null; }
      await connecter(R, 'dora'); await onglet(R, 'reglages');
      const perm = await R.page.evaluate(() => Notification.permission);
      if (perm === 'denied') {
        await verifier('l\'autorisation est refusée par le navigateur : l\'état dit comment la rouvrir (le cadenas, les réglages du site)', R, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-disabled') === 'true' && /refusé les notifications/.test(e.textContent) && /cadenas/.test(e.textContent); }, null, 10000, () => reg(R));
        await toucherGrise(R, '#reg-notif-sw'); await dormir(250);
        v('⛔ …et le toucher ne redemande rien et n\'enregistre rien', [R.ctx.serviceWorkers().length, R.requetes.filter(r => /push\/abonner/.test(r)).length], [0, 0]);
        await capture(R, '6-refusee');
      } else console.log('  — la permission « bloquée » n\'a pas pu être posée dans ce navigateur (Notification.permission = ' + perm + ') : l\'état « refusée » est joué par test-958');
      await largeur(R, 'autorisation refusée');
    }

    /* ═══ 7. RÉGLAGES > COMPTE : L'EXPORT ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── Réglages > Compte : exporter mes données ──');
    await onglet(A, 'reglages');
    await verifier('la rubrique « Compte » paraît avec « Exporter mes données » et « Supprimer mon compte »', A, () => !!document.getElementById('reg-export') && !!document.getElementById('reg-supprimer'), null, 8000, () => lire(A, '#vue-reglages'));
    await capture(A, '7-compte');
    await largeur(A, 'Réglages > Compte');
    const [dl] = await Promise.all([A.page.waitForEvent('download', { timeout: 15000 }), toucher(A, '#reg-export')]);
    const contenu = fs.readFileSync(await dl.path(), 'utf8');
    let ex = null; try { ex = JSON.parse(contenu); } catch (e) { ex = null; }
    v('⛔ le navigateur TÉLÉCHARGE le fichier : un nom daté, un JSON valide, le format de l\'export, la conversation avec Bruno et ses messages', [/^opmessages-export-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), ex && ex.format, ex && ex.conversations.some(c => c.messages.some(m => m.texte === 'Salut Alice, la visite est à 14 h'))], [true, 'opmessages-export-v1', true]);
    await verifier('la page dit le nom du fichier, sa taille et qu\'un autre sera possible demain', A, () => /a été téléchargé/.test(document.getElementById('reg-compte').textContent) && /opmessages-export-/.test(document.getElementById('reg-compte').textContent), null, 8000, () => lire(A, '#reg-compte'));
    await toucher(A, '#reg-export');
    await verifier('⛔ le deuxième export du jour est REFUSÉ et la phrase le dit — et la réussite d\'avant ne reste pas à côté du refus (un verdict à la fois)', A, () => { const t = document.getElementById('reg-compte').textContent; return /un export par jour/.test(t) && /réessaie dans 24 h/.test(t) && !/a été téléchargé/.test(t); }, null, 10000, () => lire(A, '#reg-compte'));
    await capture(A, '7-export-refuse');

    /* ═══ 8. LA SOURDINE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La sourdine d\'une conversation ──');
    await A.page.goto(A.base + '/#messages/' + conv); await A.page.reload();
    await A.page.waitForFunction(() => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes('Bruno Petit'), null, { timeout: 15000 });
    await toucher(A, '#conv-titre');
    await verifier('les infos de la conversation proposent « Mettre en sourdine » : 8 heures, 1 semaine, Toujours', A, () => [...document.querySelectorAll('#info-corps [data-act="sourdine"]')].map(x => x.textContent).join('|') === '8 heures|1 semaine|Toujours', null, 10000, () => lire(A, '#info-corps'));
    await capture(A, '8-sourdine-proposee');
    await toucher(A, '#info-corps [data-act="sourdine"][data-duree="8h"]');
    await verifier('⛔ en sourdine : « Notifications coupées », l\'échéance dite, « Réactiver »', A, () => { const t = document.getElementById('info-corps').textContent; return /Notifications coupées/.test(t) && /En sourdine jusqu'au/.test(t) && !!document.querySelector('#info-corps [data-act="sourdine"][data-duree="off"]'); }, null, 10000, () => lire(A, '#info-corps'));
    const idA = await A.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.id);
    const muet = sql('SELECT muet_jusqua AS m FROM membre WHERE conv = ? AND uid = ?', conv, idA).m;
    vrai('le service a retenu l\'échéance (dans huit heures, à une minute près)', Math.abs(muet - (Date.now() + 8 * 3600000)) < 60000);
    await capture(A, '8-sourdine-posee');
    await toucher(A, '#info-corps [data-act="sourdine"][data-duree="off"]');
    await verifier('« Réactiver » : la proposition revient, le service n\'a plus d\'échéance', A, () => !!document.querySelector('#info-corps [data-act="sourdine"][data-duree="8h"]') && !/Notifications coupées/.test(document.getElementById('info-corps').textContent), null, 10000, () => lire(A, '#info-corps'));
    v('et le service n\'a plus d\'échéance', sql('SELECT muet_jusqua AS m FROM membre WHERE conv = ? AND uid = ?', conv, idA).m, 0);
    await A.page.keyboard.press('Escape');
    await largeur(A, 'infos de la conversation');

    /* ═══ 9. SUPPRIMER MON COMPTE, JUSQU'À L'ÉCRAN DE CONNEXION — ET SE RECONNECTER ═══════════════════════════════════════════════════════ */
    console.log('\n── Supprimer mon compte : la feuille, la case, le bouton, l\'écran de connexion, la reconnexion qui annule ──');
    await onglet(A, 'reglages');
    await toucher(A, '#reg-supprimer');
    await verifier('la feuille « Supprimer mon compte » dit ce qui part, ce qui reste chez les autres, et le délai LU du service (14 jours)', A, () => { const t = document.getElementById('info-corps').textContent; return /Ce qui sera effacé/.test(t) && /Ce qui reste chez les autres/.test(t) && /Compte supprimé/.test(t) && /dans 14 jours/.test(t) && /Supprimer définitivement ton compte \?/.test(t); }, null, 10000, () => lire(A, '#info-corps'));
    v('le titre de la feuille', await lire(A, '#feuille-titre'), 'Supprimer mon compte');
    await capture(A, '9-suppression-feuille');
    await largeur(A, 'feuille Supprimer mon compte');
    v('⛔ le bouton « Oui, supprimer » est grisé tant que la case n\'est pas cochée', await A.page.evaluate(() => document.getElementById('sp-oui').getAttribute('aria-disabled')), 'true');
    await toucherGrise(A, '#sp-oui');
    await verifier('⛔ le toucher sans la case dit « Coche la case » et ne supprime RIEN', A, () => /Coche la case/.test(document.getElementById('info-erreur').textContent) && !document.getElementById('info-erreur').hidden, null, 5000, () => lire(A, '#info-corps'));
    v('population : rien n\'est programmé, Alice est connectée', [sql('SELECT suppression_le AS s FROM personne WHERE id = ?', idA).s, await A.page.evaluate(async () => (await fetch('/api/moi')).status)], [null, 200]);
    await A.page.locator('#sp-case').check();
    await verifier('la case cochée dégrise le bouton et efface le refus d\'avant', A, () => document.getElementById('sp-oui').getAttribute('aria-disabled') === null && document.getElementById('info-erreur').hidden, null, 5000);
    await capture(A, '9-suppression-cochee');
    await toucher(A, '#sp-oui');
    await verifier('⛔ la page REPART à l\'écran de connexion, avec la date de l\'effacement dite à la personne', A, () => !document.getElementById('connexion').hidden && /Ton compte sera supprimé le /.test(document.getElementById('connexion-erreur').textContent), null, 20000, () => A.page.evaluate(() => location.href + ' | ' + document.getElementById('connexion-erreur').textContent));
    const prevue = sql('SELECT suppression_le AS s FROM personne WHERE id = ?', idA).s;
    /* la date se dit dans le fuseau de la PERSONNE (celui du navigateur : Europe/Paris ici), pas dans celui du banc */
    const dateAttendue = new Date(prevue).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    const dite = await lire(A, '#connexion-erreur');
    vrai('⛔ la date affichée est CELLE DU SERVICE (' + dateAttendue + '), à quatorze jours — lu : « ' + dite + ' »', dite.includes(dateAttendue) && Math.abs(prevue - (Date.now() + 14 * 86400000)) < 5 * 60000);
    v('l\'adresse a été nettoyée (ni motif ni date restent dans la barre)', await A.page.evaluate(() => location.search), '');
    v('⛔ la session est coupée côté service : /api/moi répond 401, plus aucune session d\'Alice', [await A.page.evaluate(async () => (await fetch('/api/moi')).status), sql('SELECT COUNT(*) AS n FROM session WHERE personne = ?', idA).n], [401, 0]);
    await capture(A, '9-ecran-connexion');
    await saisir(A, '#c-login', 'alice'); await saisir(A, '#c-pass', MOTS.alice); await toucher(A, '#c-entrer');
    await verifier('⛔ se reconnecter ANNULE la suppression : la page s\'ouvre et DIT « Bon retour : la suppression de ton compte est annulée »', A, () => { const a = document.getElementById('avis'); return !document.getElementById('app').hidden && !a.hidden && /la suppression de ton compte est annulée/.test(a.textContent); }, null, 20000, () => A.page.evaluate(() => location.href + ' | ' + document.getElementById('avis').textContent));
    v('le service a effacé l\'échéance', sql('SELECT suppression_le AS s FROM personne WHERE id = ?', idA).s, null);
    await capture(A, '9-bon-retour');

    /* ═══ 10. UN COMPTE SUPPRIMÉ DANS LA LISTE ET LE COMPOSITEUR ═══════════════════════════════════════════════════════════════════════ */
    console.log('\n── Un compte supprimé : « Compte supprimé » dans la liste, le compositeur dit qu\'on n\'y écrit plus ──');
    {
      const Bb = await T.connecter(svc, og, 'bruno', MOTS.bruno), Cb = await T.connecter(svc, og, 'chloe', MOTS.chloe);
      const l = await Cb.post('/api/contacts/lien', {}); await Bb.post('/api/liens/accepter', { code: l.j.code });
      const cc = (await Bb.post('/api/conversations/directe', { uid: Cb.moi.id })).j.conversation.id;
      await Cb.post('/api/conversations/' + cc + '/messages', { cid: 'cid-sonde-chloe-1', texte: 'Dernier mot de Chloé' });
      await B.page.goto(B.base + '/'); await B.page.waitForFunction(() => !document.getElementById('app').hidden, null, { timeout: 15000 });
      await verifier('population : avant, la conversation porte le nom de Chloé', B, () => [...document.querySelectorAll('#liste-conv .conv-nom')].some(e => e.textContent === 'Chloé Durand'), null, 15000, () => lire(B, '#liste-conv'));
      const S2 = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
      S2.suppressionProgrammer(Cb.moi.id, Date.now() - 1000);
      const eff = S2.compteEffacer(Cb.moi.id); S2.fermer();
      vrai('population : le compte de Chloé est effacé en base', eff.effacee);
      await B.page.reload();
      await verifier('⛔ la LISTE de Bruno : « Compte supprimé » à la place de Chloé', B, () => [...document.querySelectorAll('#liste-conv .conv-nom')].some(e => /^Compte\s+supprimé$/.test(e.textContent)) && ![...document.querySelectorAll('#liste-conv .conv-nom')].some(e => e.textContent === 'Chloé Durand'), null, 15000, () => lire(B, '#liste-conv'));
      await toucher(B, '#liste-conv .conv:has(.conv-nom:text-is("Compte supprimé"))');
      await verifier('⛔ la conversation s\'ouvre : le dernier mot de Chloé reste lisible, et le compositeur est REMPLACÉ par « Ce compte a été supprimé : tu ne peux plus lui écrire. »', B,
        () => document.documentElement.dataset.conv === '1' && [...document.querySelectorAll('#conv-messages .msg')].some(e => /Dernier mot de Chloé/.test(e.textContent)) && document.getElementById('compo').hidden && !document.getElementById('compo-ferme').hidden && /Ce compte a été supprimé/.test(document.getElementById('compo-ferme').textContent),
        null, 15000, () => B.page.evaluate(() => [document.getElementById('compo').hidden, document.getElementById('compo-ferme').textContent].join(' | ')));
      await capture(B, '10-compte-supprime');
      await largeur(B, 'conversation avec un compte supprimé');
    }

    /* ═══ 10 bis. LE MÊME PARCOURS AU BUREAU (1440), À LA SOURIS ═════════════════════════════════════════════════════════════════════ */
    console.log('\n── Au bureau (1440) : Réglages > Notifications et Compte, la feuille « Supprimer mon compte », à la souris ──');
    {
      const D = await ouvrir(b, svc.base, PROFILS.bureau, { sub: P.appareil(fps.endpoint('sonde-dora')).sub }); D.nom = 'Dora (bureau)'; tous.push(D);
      await connecter(D, 'dora'); await onglet(D, 'reglages');
      await verifier('au bureau aussi : la rubrique Notifications est là, coupée', D, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'false' && e.getAttribute('aria-disabled') === null; }, null, 10000, () => reg(D));
      await toucher(D, '#reg-notif-sw');
      await verifier('à la souris : activer fonctionne, l\'essai paraît', D, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'true' && !!document.getElementById('reg-notif-essai'); }, null, 15000, () => reg(D));
      await toucher(D, '#reg-notif-essai');
      await verifier('l\'essai dit combien d\'appareils l\'ont reçue', D, () => /Notification envoyée à 1 appareil/.test(document.getElementById('reg-notif').textContent), null, 15000, () => reg(D));
      await capture(D, '10b-reglages-bureau');
      await largeur(D, 'Réglages au bureau (notifications activées)');
      await toucher(D, '#reg-supprimer');
      await verifier('la feuille de suppression s\'ouvre au centre de l\'écran (bureau), avec son titre', D, () => document.getElementById('feuille-titre').textContent === 'Supprimer mon compte' && !document.getElementById('feuille').inert, null, 10000);
      await capture(D, '10b-suppression-bureau');
      await largeur(D, 'feuille Supprimer mon compte au bureau');
      await toucher(D, '[data-act="suppression-annuler"]');
      await verifier('« Non, garder mon compte » referme la feuille sans rien faire', D, () => document.getElementById('feuille').inert, null, 8000);
      const idD = await D.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.id);
      v('population : le compte de Dora est intact (aucune suppression programmée, toujours connectée)', [sql('SELECT suppression_le AS s FROM personne WHERE id = ?', idD).s, await D.page.evaluate(async () => (await fetch('/api/moi')).status)], [null, 200]);
      await toucher(D, '#reg-notif-sw');
      await verifier('désactiver à la souris', D, () => { const e = document.getElementById('reg-notif-sw'); return !!e && e.getAttribute('aria-checked') === 'false'; }, null, 15000, () => reg(D));
    }

    /* ═══ 11. LA FIN : RIEN D'ANORMAL ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La fin : aucune erreur, aucun débordement ──');
    const refus = S => S.console.filter(t => /Failed to load resource/.test(t)).map(t => (/status of (\d{3})/.exec(t) || [])[1]);
    for (const S of tous) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.ecrans || 0) + ' écrans mesurés en largeur', S.gestes > 2 && (S.ecrans || 0) >= 1);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus du service', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
      /* un refus du service est LOGUÉ par le navigateur : on les compte et on les NOMME — des 401 (la visite sans session, la session coupée par la suppression, le flux qui se rouvre) ; Alice a en plus
         UN 429, le deuxième export du jour, que la sonde a fait faire exprès. Tout autre refus est un défaut. */
      const r = refus(S), autres = r.filter(x => x !== '401' && x !== '429');
      v(S.nom + ' : les refus réseau relevés sont des 401 (session absente ou coupée)' + (S.nom === 'Alice' ? ' et UN seul 429 (le deuxième export du jour)' : ' et rien d\'autre') + ' — relevé : ' + (r.join(', ') || 'aucun'), [autres, r.filter(x => x === '429').length], [[], S.nom === 'Alice' ? 1 : 0]);
    }
  } finally { /* les contextes se ferment avec le navigateur */ }
  return { A, B, tous, sql };
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ urlGestion: og.url, env: { OPMSG_TEST_PUSH: fps.hote }, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 },
    push: { ackMs: ACK_MS, contact: 'mailto:exploitation@exemple.invalid' },
    quotas: { moi_maj: { max: 100000, fenetreMs: 3600000 } } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await og.fermer(); await fps.fermer(); process.exit(2); }
  let res = null;
  try { res = await parcours(b, { svc, og, fps }); }
  catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    try { await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await og.fermer(); await fps.fermer();
  }
  fin();
})();
