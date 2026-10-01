/* ══ SONDE CUMULATIVE — OP MESSAGES, « DE A À Z » ═══════════════════════════════════════════════════════════════════════════
   Justin : « je veux que tu testes tout de A à Z d'OP MESSAGES, elle doit fonctionner parfaitement ». Cette sonde est LE test
   d'OP MESSAGES : elle grandit à chaque étape (1 : liste, feuille « Nouveau groupe », navigation ; 2 : la conversation ; 3 à 5 :
   appels, agenda, réunion — chaque étape AJOUTE son bloc, aucune ne retire celui d'avant).

   Elle ne remplace pas `tests/test-856.js` ni `tests/test-857.js` (qui lisent le texte, les jetons et le module de données) :
   elle JOUE la page dans un vrai navigateur, avec de vrais gestes — le doigt sur téléphone, la souris et le clavier au bureau —
   et elle compte. Ce que les bancs ne peuvent pas voir (un retour système qui quitte la page, un champ qui fait zoomer iOS, une
   liste qui revient à une autre hauteur, un vocal réellement enregistré puis réécouté) n'existe qu'ici.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION (CLAUDE.md : « une assertion sur un ensemble vide passe et ne prouve rien ») : « 0
   débordement » ne s'écrit qu'après « N éléments examinés », « 0 erreur » après « N gestes portés ».
   ⛔ UNE LARGEUR SE MESURE DEUX FOIS (deux trames, une lecture forcée, puis 700 ms plus tard) et CONTRE LA LARGEUR POSÉE, jamais
   contre innerWidth (une page qui s'élargit emporte innerWidth avec elle).
   ⛔ UN CONTRASTE SE LIT AU PIXEL : la capture du texte, la capture du MÊME texte rendu transparent, et le fond réellement peint
   (décor, verre, bulle) en est déduit — jamais recalculé à la main.

   Lancer :   node tests/sonde-opmessages.js            (tout — plusieurs minutes)
              node tests/sonde-opmessages.js --rapide   (un téléphone, jour — pour les mutations)
              OPMSG_RACINE=/chemin/d/une/copie node tests/sonde-opmessages.js   (la page lue dans une COPIE du dépôt)
   Elle sert le dépôt elle-même sur 127.0.0.1 et lance /opt/pw-browsers/chromium (SwiftShader : le seul chemin qui floute vraiment
   une vitre mince — CLAUDE.md). Aucun appel hors 127.0.0.1. Sort en code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), http = require('http');

/* playwright-core n'est pas une dépendance du dépôt : on le cherche où il vit, et on le DIT au lieu de mourir sur un MODULE_NOT_FOUND */
let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) {
    console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages.js');
    process.exit(2);
  }
}
const RACINE = path.resolve(process.env.OPMSG_RACINE || path.join(__dirname, '..'));
const PAGE_URL = '/apercu/opmessages/index.html';
const CHROME = '/opt/pw-browsers/chromium';
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ── le serveur statique : le dépôt, sur 127.0.0.1, et la liste de TOUT ce qu'il a servi ── */
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain' };
function servir(racine) {
  const servis = [];
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]); servis.push(u);
    let x = path.join(racine, u.replace(/^\/+/, ''));
    if (!x.startsWith(racine)) { r.writeHead(403); return r.end(); }
    try { if (fs.statSync(x).isDirectory()) x = path.join(x, 'index.html'); } catch (e) { /* 404 */ }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(x)] || 'application/octet-stream' }); r.end(d); });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ base: 'http://127.0.0.1:' + srv.address().port, servis, fermer: () => srv.close() })));
}

/* ── le navigateur : SwiftShader, un micro factice qui accepte tout (le refus et l'absence ont leur propre lancement) ── */
const ARGS_BASE = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required'];
const lancer = extra => pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS_BASE.concat(extra || []) });
const MICRO_FACTICE = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];

/* ── les appareils (la largeur POSÉE est celle du profil, jamais innerWidth) ── */
const PROFILS = {
  iphone:     { nom: 'iPhone 393',    w: 393,  h: 852,  dpr: 2, mobile: true,  insets: { top: 54, bottom: 34 } },
  android412: { nom: 'Android 412',   w: 412,  h: 915,  dpr: 2, mobile: true,  insets: null },
  android360: { nom: 'Android 360',   w: 360,  h: 740,  dpr: 2, mobile: true,  insets: null },
  ipad820:    { nom: 'iPad 820',      w: 820,  h: 1180, dpr: 1, mobile: true,  insets: null },
  bureau1024: { nom: 'bureau 1024',   w: 1024, h: 768,  dpr: 1, mobile: false, insets: null },
  bureau1440: { nom: 'bureau 1440',   w: 1440, h: 900,  dpr: 1, mobile: false, insets: null }
};
/* l'horloge de l'aperçu est posée : le mardi 6 octobre 2026 à 14 h 10 (Paris) — « Aujourd'hui 14:02 » et « Lu 14:06 » sont alors de vraies valeurs à comparer */
const HEURE_POSEE = new Date('2026-10-06T14:10:00+02:00');

async function ouvrirPage(b, pf, o) {
  o = o || {};
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: o.h || pf.h }, deviceScaleFactor: o.dpr || pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile,
    colorScheme: o.dark ? 'dark' : 'light', reducedMotion: o.mouvementReduit ? 'reduce' : 'no-preference', locale: 'fr-FR', timezoneId: 'Europe/Paris',
    permissions: o.permissions || []
  });
  const page = await ctx.newPage();
  const S = { ctx, page, pf, erreurs: [], rejets: [], console: [], reseau: [], gestes: 0 };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 200)); });
  page.on('request', r => S.reseau.push(r.url()));
  /* les instruments posés AVANT la page : les rejets non rattrapés, les popstate (une navigation par geste), le micro (qui a demandé quoi, et si la
     piste a été RELÂCHÉE), les lectures audio — des témoins qui enveloppent l'API réelle sans en changer le comportement */
  await page.addInitScript(() => {
    window.__rejets = []; window.addEventListener('unhandledrejection', e => window.__rejets.push(String(e.reason && e.reason.message || e.reason)));
    window.__pops = 0; window.addEventListener('popstate', () => window.__pops++);
    window.__micro = { demandes: 0, pistes: [] };
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async c => { window.__micro.demandes++; const f = await orig(c); f.getTracks().forEach(t => window.__micro.pistes.push(t)); return f; };
    }
    window.__audios = []; const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__audios.push(this); return play.apply(this, arguments); };
  });
  S.cdp = await ctx.newCDPSession(page);
  if (pf.insets) await S.cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top || 0, bottom: pf.insets.bottom || 0, left: pf.insets.left || 0, right: pf.insets.right || 0 } });
  if (o.media) await S.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: o.dark ? 'dark' : 'light' }].concat(o.media) });
  if (o.horloge !== false) await page.clock.install({ time: HEURE_POSEE });
  await page.goto(o.base + (o.url || PAGE_URL), { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#liste-conv .conv').length > 0, null, { timeout: 8000 });
  await dormir(450);
  S.fermer = async () => { try { await ctx.close(); } catch (e) { /* déjà fermé */ } };
  return S;
}

/* un geste = le doigt sur un téléphone, la souris au bureau ; Playwright vérifie que la cible est visible, stable, et REÇOIT l'événement
   (un élément recouvert fait échouer le geste : c'est ce qu'on veut) */
async function geste(S, sel, opts) {
  const l = S.page.locator(sel).first();
  if (S.pf.mobile) await l.tap(Object.assign({ timeout: 6000 }, opts)); else await l.click(Object.assign({ timeout: 6000 }, opts));
  S.gestes++;
}
const lire = (S, expr) => S.page.evaluate(expr);

/* ── les comptes : un contrôle tombé = code de sortie 1 ── */
let ok = 0, ko = 0;
const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + JSON.stringify(d) : '')); } };
const info = t => console.log('    · ' + t);
const titre = t => console.log('\n── ' + t + ' ──');

/* ══ LES INSTRUMENTS — exécutés DANS la page ══════════════════════════════════════════════════════════════════════════════════ */
/* un débordement horizontal : deux lectures séparées (deux trames + une lecture forcée, puis 700 ms), contre la largeur POSÉE */
async function mesurerLargeur(S, etiquette) {
  const R = await S.page.evaluate(async W => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth;
    await new Promise(r => setTimeout(r, 700));
    const l1 = document.documentElement.scrollWidth;
    await new Promise(r => setTimeout(r, 450)); void document.body.offsetWidth;
    const l2 = document.documentElement.scrollWidth;
    const y = scrollY; scrollTo(9999, y); const poussee = scrollX; scrollTo(0, y);
    const hors = []; let n = 0;
    for (const e of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (e.closest('.epingles, .puces, svg, script, style, noscript, [hidden]')) continue;       // défilent de côté PAR CONSTRUCTION, ou ne sont pas là
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
      if (e.closest('.notif') && !document.getElementById('notif').classList.contains('on')) continue;   // hors écran en HAUT, pas de côté
      if (e.closest('#feuille') && !document.documentElement.classList.contains('feuille-ouverte')) continue;
      n++;
      if (r.right > W + 0.5 || r.left < -0.5) hors.push((e.id ? '#' + e.id : e.tagName + '.' + String(e.className && e.className.baseVal === undefined ? e.className : '').split(' ')[0]) + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
    }
    return { l1, l2, poussee, hors: hors.slice(0, 6), n };
  }, S.pf.w);
  v(etiquette + ' : aucun débordement horizontal (posé ' + S.pf.w + ' px · lectures ' + R.l1 + ' puis ' + R.l2 + ' · poussée de côté ' + R.poussee + ' · ' + R.n + ' éléments examinés)',
    R.n > 10 && R.l1 <= S.pf.w && R.l2 <= S.pf.w && R.poussee === 0 && R.hors.length === 0, R);
}
async function mesurerTextes(S, etiquette) {
  const R = await S.page.evaluate(() => {
    let n = 0, min = 999; const trop = [];
    for (const e of document.body.querySelectorAll('*')) {
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(e.tagName)) continue;
      if (!Array.from(e.childNodes).some(c => c.nodeType === 3 && c.textContent.trim())) continue;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || !e.getClientRects().length) continue;
      if (e.closest('[hidden], .sr-seul')) continue;
      n++; const fs = parseFloat(cs.fontSize); if (fs < min) min = fs;
      if (fs < 11) trop.push(e.tagName + '.' + String(e.className).split(' ')[0] + ' ' + fs + 'px « ' + e.textContent.trim().slice(0, 20) + ' »');
    }
    return { n, min, trop: trop.slice(0, 6) };
  });
  v(etiquette + ' : aucun texte sous 11 px (' + R.n + ' textes examinés, plus petit : ' + R.min + ' px)', R.n > 5 && R.trop.length === 0, R);
}
async function mesurerCibles(S, etiquette, extra) {
  const seuil = S.pf.mobile ? 44 : 32;
  const R = await S.page.evaluate(sv => {
    const sel = 'button, a[href], input:not([type=hidden]):not(.sr-seul), textarea, [role=checkbox], [role=switch]';
    let n = 0, mw = 9999, mh = 9999; const petites = [];
    for (const e of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (e.closest('[inert], [hidden]')) continue;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      n++; mw = Math.min(mw, r.width); mh = Math.min(mh, r.height);
      if (r.width < sv - 0.5 || r.height < sv - 0.5) petites.push((e.id ? '#' + e.id : e.tagName + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
    return { n, petites: petites.slice(0, 8), mw: Math.round(mw), mh: Math.round(mh) };
  }, seuil);
  v(etiquette + ' : cibles ≥ ' + seuil + ' px (' + R.n + ' cibles examinées, plus petite ' + R.mw + '×' + R.mh + ')', R.n >= 3 && R.petites.length === 0, R);
}
/* un champ de saisie fait 16 px au moins : en dessous, Safari zoome la page au focus et elle reste zoomée */
async function mesurerChamps(S, etiquette) {
  const R = await S.page.evaluate(() => {
    const champs = [...document.querySelectorAll('input[type=text], input[type=search], textarea')].filter(e => !e.closest('[hidden]') && !e.closest('[inert]') && e.getClientRects().length);
    return { n: champs.length, tailles: champs.map(e => (e.id || e.tagName) + ' ' + parseFloat(getComputedStyle(e).fontSize)) };
  });
  v(etiquette + ' : tout champ de saisie fait ≥ 16 px (' + R.n + ' champs : ' + R.tailles.join(', ') + ')', R.n >= 1 && R.tailles.every(t => parseFloat(t.split(' ').pop()) >= 16), R);
}

/* le contraste AU PIXEL. Trois choses sont lues, aucune n'est recalculée à la main : la capture du texte tel qu'il est peint, la capture du
   MÊME endroit avec le texte rendu transparent (le fond réellement peint : décor, verre, bulle), et la couleur CALCULÉE de l'encre. Le contraste
   est celui de l'encre posée sur CHAQUE pixel de fond de la boîte du texte — le pire compte. nink prouve que le texte est bien peint (un
   zéro sur un ensemble vide ne prouve rien). */
const JS_CONTRASTE = async ([a, b, ink, mode]) => {
  const dec = async s => { const bl = new Blob([Uint8Array.from(atob(s), c => c.charCodeAt(0))], { type: 'image/png' }); const bm = await createImageBitmap(bl); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return x.getImageData(0, 0, bm.width, bm.height); };
  const A = await dec(a), B = await dec(b);
  const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  const L = (r, g, bb) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(bb);
  let min = 99, pixels = 0, nink = 0, inkpeint = null, dmax = 0;
  for (let i = 0; i < B.data.length; i += 4) {
    const br = B.data[i], bg = B.data[i + 1], bb = B.data[i + 2];
    const al = ink[3];
    const ir = al * ink[0] + (1 - al) * br, ig = al * ink[1] + (1 - al) * bg, ib = al * ink[2] + (1 - al) * bb;
    const l1 = L(ir, ig, ib), l2 = L(br, bg, bb), c = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
    pixels++; if (c < min) min = c;
    const d = Math.abs(A.data[i] - br) + Math.abs(A.data[i + 1] - bg) + Math.abs(A.data[i + 2] - bb);
    if (d > 90) nink++;
    if (d > dmax) { dmax = d; inkpeint = [A.data[i], A.data[i + 1], A.data[i + 2]]; }
  }
  return { min, pixels, nink, inkpeint };
};
async function contraste(S, sel, o) {
  o = o || {};
  const prop = o.bordure ? 'bordure' : 'texte';
  await S.page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
  await dormir(220);
  const lireBoite = () => S.page.evaluate(([s, p]) => {
    const e = document.querySelector(s); if (!e) return null;
    let r, couleur;
    if (p === 'texte') {
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 3 }); const t = w.nextNode(); if (!t) return null;
      const rg = document.createRange(); rg.selectNodeContents(t); r = rg.getBoundingClientRect(); couleur = getComputedStyle(t.parentElement).color;
    } else { r = e.getBoundingClientRect(); couleur = getComputedStyle(e).borderLeftColor; }
    return { x: r.x, y: r.y, w: r.width, h: r.height, couleur };
  }, [sel, prop]);
  let bx = await lireBoite(); if (!bx) { v('contraste « ' + sel + ' » : l\'élément existe', false); return null; }
  await dormir(120); const bx2 = await lireBoite();
  if (Math.abs(bx2.x - bx.x) > 0.5 || Math.abs(bx2.y - bx.y) > 0.5) { await dormir(500); bx = await lireBoite(); } else bx = bx2;
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(bx.couleur);
  if (!m) { v('contraste « ' + sel + ' » : couleur lisible (reçu ' + bx.couleur + ')', false); return null; }      // une forme inconnue se JETTE, on ne la devine pas
  const ink = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  const clip = { x: Math.max(0, bx.x), y: Math.max(0, bx.y), width: Math.max(2, bx.w), height: Math.max(2, bx.h) };
  const vue = (await S.page.screenshot({ clip })).toString('base64');
  const style = await S.page.addStyleTag({ content: prop === 'texte' ? '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }' : '*, *::before, *::after { border-color: transparent !important; }' });
  await dormir(80);
  const fond = (await S.page.screenshot({ clip })).toString('base64');
  await style.evaluate(e => e.remove());
  /* le décodage se fait DANS la page (createImageBitmap n'est pas une requête : la politique du navigateur ne le voit pas). ⛔ Une seconde page dans
     le même navigateur passe au premier plan et met la première en ARRIÈRE-PLAN, où les transitions CSS ne tournent plus : la feuille « Nouveau
     groupe » restait alors hors de l'écran — mesuré le 1er octobre 2026 en ouvrant une page de décodage. */
  const R = await S.page.evaluate(JS_CONTRASTE, [vue, fond, ink, prop]);
  const seuil = o.seuil || 4.5;
  v('contraste au pixel « ' + (o.nom || sel) + ' » : ' + R.min.toFixed(2) + ':1 (≥ ' + seuil + ' · ' + R.pixels + ' pixels de fond lus, ' + R.nink + ' d\'encre PEINTE)', R.pixels > 20 && R.nink >= 4 && R.min >= seuil, R);
  S.contrastes = (S.contrastes || 0) + 1;
  return R;
}

/* ── un fichier d'essai fabriqué par le navigateur lui-même (aucune dépendance) : une grande image de 2 400 × 1 600, une image « cassée »
      (de l'octet quelconque rangé sous un nom .png), et une image de 192 px du dépôt ── */
async function fabriquerFichiers(b, base) {
  const dossier = fs.mkdtempSync(path.join(require('os').tmpdir(), 'opmsg-'));
  const p = await (await b.newContext()).newPage();
  await p.goto(base + '/icons/opmsg-192.png');
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 2400, 1600); g.addColorStop(0, '#2a4a9c'); g.addColorStop(1, '#ff9f0a'); x.fillStyle = g; x.fillRect(0, 0, 2400, 1600); x.fillStyle = '#fff'; x.font = '200px sans-serif'; x.fillText('OP MSG', 700, 900); return c.toDataURL('image/png').split(',')[1]; });
  await p.context().close();
  const F = { grande: path.join(dossier, 'grande.png'), cassee: path.join(dossier, 'cassee.png'), petite: path.join(RACINE, 'icons', 'opmsg-192.png'), dossier };
  fs.writeFileSync(F.grande, Buffer.from(b64, 'base64'));
  fs.writeFileSync(F.cassee, Buffer.from('ceci n\'est pas une image — des octets quelconques '.repeat(40)));
  return F;
}

/* ── petits gestes ── */
const txt = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
const nb = (S, sel) => S.page.evaluate(s => document.querySelectorAll(s).length, sel);
const hist = S => S.page.evaluate(() => ({ n: history.state && history.state.n, hash: location.hash, len: history.length, conv: document.documentElement.dataset.conv || null, vue: document.documentElement.dataset.vue || null, feuille: document.documentElement.classList.contains('feuille-ouverte'), photo: !document.getElementById('visionneuse').hidden }));
async function attendre(S, fn, arg, delai) { try { await S.page.waitForFunction(fn, arg, { timeout: delai || 5000 }); return true; } catch (e) { return false; } }
async function attendreConv(S, nom) { return attendre(S, n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-messages').getAttribute('aria-busy') === 'false' && (!n || document.getElementById('conv-titre').textContent.includes(n)), nom); }
async function attendreListe(S) { return attendre(S, () => !document.documentElement.dataset.conv); }
const parLargeur = S => S.pf.w >= 1100 ? 'maitre-detail' : S.pf.w >= 900 ? 'remplace' : 'recouvre';
async function ouvrirConv(S, id, nom) { await geste(S, '#liste-conv [data-ouvrir="' + id + '"]'); const ok = await attendreConv(S, nom); await dormir(500); return ok; }
/* fermer la conversation avec le geste de l'appareil : le retour de la barre (jusqu'à 1 099 px), Échap au-delà */
async function fermerConv(S) {
  if (S.pf.w < 1100) await geste(S, '#conv-retour'); else { await S.page.keyboard.press('Escape'); S.gestes++; }
  const ok = await attendreListe(S); await dormir(450); return ok;
}
const taper = async (S, texte) => { await S.page.keyboard.type(texte, { delay: 12 }); S.gestes++; };
async function envoyerTexte(S, texte) {
  const n0 = await nb(S, '#conv-messages .msg');
  await S.page.locator('#saisie').fill(texte); S.gestes++;
  if (!S.pf.mobile) await S.page.keyboard.press('Enter'); else await geste(S, '#envoyer');
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0);
  await dormir(150);
}

/* ══ ÉTAPE 1 — LA LISTE MESSAGES ══════════════════════════════════════════════════════════════════════════════════════════════ */
async function etapeListe(S) {
  const nom = S.nom;
  titre(nom + ' — la liste');
  const u = await S.page.evaluate(() => ({
    nbConv: document.querySelectorAll('#liste-conv li > button.conv').length, pins: document.querySelectorAll('#epingles .epingle-bouton').length,
    h1: document.querySelector('#vue-messages h1').textContent, dark: matchMedia('(prefers-color-scheme: dark)').matches,
    tabs: getComputedStyle(document.getElementById('tabs')).display !== 'none', side: getComputedStyle(document.querySelector('.side')).display !== 'none',
    conv: getComputedStyle(document.getElementById('conv-ecran')).display, vide: getComputedStyle(document.getElementById('conv-vide')).display,
    bouton: !!document.querySelector('[class~=mode], [data-theme], [data-mode]'), cs: getComputedStyle(document.documentElement).colorScheme,
    meta: document.querySelector('meta[name=color-scheme]') && document.querySelector('meta[name=color-scheme]').content
  }));
  v(nom + ' : l\'appareil est en ' + (S.dark ? 'nuit' : 'jour') + ', la page l\'a suivi, sans bouton', u.dark === S.dark && !u.bouton);
  v(nom + ' : color-scheme déclaré (meta « ' + u.meta + ' » + feuille « ' + u.cs + ' »)', u.meta === 'light dark' && /light dark|normal/.test(u.cs) && u.cs !== 'normal');
  v(nom + ' : 6 conversations, chacune est un BOUTON (clavier, doigt, lecteur d\'écran) ; 4 épinglés qui en sont aussi', u.nbConv === 6 && u.pins === 4 && u.h1 === 'Messages', u);
  const nav = S.pf.w < 900 ? (u.tabs && !u.side) : (!u.tabs && u.side);
  v(nom + ' : navigation = ' + (S.pf.w < 900 ? 'barre d\'onglets seule' : 'barre latérale seule') + ' (jamais les deux)', nav, u);
  v(nom + ' : aucune conversation ouverte au départ' + (S.pf.w >= 1100 ? ' — le détail dit « Choisissez une conversation »' : ''), u.conv === 'none' && (S.pf.w >= 1100 ? u.vide !== 'none' : u.vide === 'none'), u);
  await mesurerLargeur(S, nom + ' · liste'); await mesurerTextes(S, nom + ' · liste'); await mesurerCibles(S, nom + ' · liste'); await mesurerChamps(S, nom + ' · liste');
  await contraste(S, '#liste-conv li:first-child .conv-heure', { nom: 'heure de liste (15 px, --sub sur la carte)' });
  await contraste(S, '#liste-conv li:first-child .conv-apercu', { nom: 'aperçu de liste (15 px, --sub sur la carte)' });
  await contraste(S, '.mention-apercu', { nom: 'mention « Aperçu — données d\'exemple » (12 px)' });
  if (S.pf.w < 900) await contraste(S, '#tabs .tab:not([aria-current]) span', { nom: 'libellé d\'un onglet inactif (11 px, sur le verre de la barre)' });
  else await contraste(S, '.moi-statut', { nom: 'statut « Disponible » de la barre latérale (11 px)' });
}

/* ══ ÉTAPE 2 — LA CONVERSATION ════════════════════════════════════════════════════════════════════════════════════════════════ */
async function etapeConversation(S) {
  const nom = S.nom, mode = parLargeur(S);
  titre(nom + ' — ouvrir la conversation de groupe (' + mode + ')');
  const av = await S.page.evaluate(() => ({ points: [...document.querySelectorAll('#liste-conv [data-ouvrir]')].filter(b => b.querySelector('.point')).map(b => b.dataset.ouvrir) }));
  v(nom + ' : (population) avant d\'ouvrir, la liste porte ' + av.points.length + ' conversations non lues : ' + av.points.join(', '), av.points.sort().join() === 'v1,v2');
  const h0 = await hist(S);
  const ouverte = await ouvrirConv(S, 'v1', 'Équipe dépôt');
  v(nom + ' : un toucher sur la ligne « Équipe dépôt » ouvre la conversation', ouverte);
  const h1 = await hist(S);
  v(nom + ' : ouvrir POSE une entrée d\'historique (n 0 → ' + h1.n + ', ' + h0.len + ' → ' + h1.len + ' entrées) et l\'adresse la nomme (' + h1.hash + ')', h0.n === 0 && h1.n === 1 && h1.len === h0.len + 1 && h1.hash === '#messages/v1' && h1.conv === '1', { h0, h1 });
  const g = await S.page.evaluate(() => { const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
    const row = document.querySelector('#liste-conv [data-ouvrir="v1"]'), c = r('conv-ecran'), l = r('contenu');
    return { conv: c, liste: l, tabs: getComputedStyle(document.getElementById('tabs')).display, retour: getComputedStyle(document.getElementById('conv-retour')).display, retourR: r('conv-retour'),
      inertListe: document.getElementById('contenu').inert, inertApp: document.getElementById('app').inert, sel: row.getAttribute('aria-current'), vide: getComputedStyle(document.getElementById('conv-vide')).display,
      couvre: (() => { const b = row.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e && !!e.closest('.conv-ecran'); })(), W: innerWidth, H: innerHeight }; });
  if (mode === 'recouvre') {
    v(nom + ' : la conversation recouvre tout l\'écran (' + g.conv.w + '×' + g.conv.h + ' pour ' + S.pf.w + '×' + S.pf.h + '), la barre d\'onglets est masquée, la liste est inerte et couverte',
      g.conv.x === 0 && g.conv.y === 0 && g.conv.w === S.pf.w && g.conv.b >= g.H - 1 && g.tabs === 'none' && g.inertListe && g.couvre, g);
  } else if (mode === 'remplace') {
    v(nom + ' : entre 900 et 1 100 px la conversation REMPLACE la liste (elle commence à 236 px, après la barre latérale), avec un retour visible ; la liste est inerte et couverte',
      g.conv.x === 236 && g.conv.r === S.pf.w && g.retour !== 'none' && g.inertListe && g.couvre, g);
  } else {
    v(nom + ' : MAÎTRE-DÉTAIL — la liste (colonne de ' + g.liste.w + ' px) et la conversation (' + g.conv.w + ' px) côte à côte, sans recouvrement ; la ligne ouverte est en surbrillance (aria-current) ; pas de bouton retour ; la liste reste active',
      g.liste.r <= g.conv.x + 1 && g.conv.x >= 236 + 340 && g.liste.w >= 340 && g.liste.w <= 440 && g.sel === 'true' && g.retour === 'none' && !g.inertListe && !g.couvre && g.vide === 'none', g);
  }
  const c = await S.page.evaluate(() => { const q = s => [...document.querySelectorAll(s)]; const fil = document.getElementById('conv-fil');
    return { titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), badge: { t: document.getElementById('conv-badge').textContent, vis: !document.getElementById('conv-badge').hidden, label: document.getElementById('conv-retour').getAttribute('aria-label') },
      nbMsg: q('#conv-messages .msg').length, noms: q('.msg-nom').map(e => e.textContent), datage: q('.datage').map(e => e.textContent), recues: q('.bulle.recue').map(e => e.textContent), envoyees: q('.bulle.envoyee').map(e => e.textContent),
      photos: q('.msg .photo').length, vocaux: q('.vocal').map(e => e.querySelector('.vocal-duree').textContent), nbBarres: q('.vocal .onde i').length, statut: q('.statut').map(e => e.textContent),
      saisie: (q('.saisie-ind')[0] || { getAttribute: () => null }).getAttribute('aria-label'), pointV1: !!document.querySelector('#liste-conv [data-ouvrir="v1"] .point'), bas: fil.scrollHeight - fil.scrollTop - fil.clientHeight, sh: fil.scrollHeight, ch: fil.clientHeight,
      compoVis: !document.getElementById('compo').hidden, ferme: !document.getElementById('compo-ferme').hidden, focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }; });
  v(nom + ' : l\'en-tête dit le groupe et son chevron (« ' + c.titre + ' »)', c.titre === 'Équipe dépôt');
  const attendu = av.points.filter(id => id !== 'v1').length;
  v(nom + ' : le badge du retour compte les AUTRES conversations non lues — ' + attendu + ' (calculé sur la liste, pas écrit en dur) : « ' + c.badge.t + ' »', c.badge.vis === (attendu > 0) && (attendu === 0 || +c.badge.t === attendu) && /autre conversation non lue/.test(c.badge.label), c);
  v(nom + ' : ouvrir la conversation la marque LUE — le point de « Équipe dépôt » a disparu de la liste', !c.pointV1);
  v(nom + ' : 6 messages, le datage « Aujourd\'hui 14:02 » (horloge posée à 14 h 10), le nom d\'auteur seulement au PREMIER message d\'une série (Inès, Mathis — le vocal de Mathis n\'en porte pas)', c.nbMsg === 6 && c.datage.join() === 'Aujourd\'hui 14:02' && c.noms.join() === 'Inès,Mathis', c);
  v(nom + ' : bulles reçues (2) et envoyées (2), 2 photos, un vocal de 0:08 à 10 barres', c.recues.length === 2 && c.envoyees.length === 2 && c.photos === 2 && c.vocaux.join() === '0:08' && c.nbBarres === 10, c);
  v(nom + ' : « Lu 14:06 » sous le DERNIER message envoyé (une seule fois), et l\'indicateur de saisie dit qui écrit', c.statut.join() === 'Lu 14:06' && /Mathis est en train d'écrire/.test(c.saisie), c);
  v(nom + ' : la conversation est défilée en bas à l\'ouverture (reste ' + c.bas.toFixed(1) + ' px sur ' + c.sh + ' de contenu, fenêtre de ' + c.ch + ' px)', c.bas < 2, c);
  v(nom + ' : le champ de saisie est là, le micro aussi, la flèche d\'envoi n\'est pas montrée tant qu\'il n\'y a rien à envoyer', c.compoVis && !c.ferme && await S.page.evaluate(() => document.getElementById('envoyer').hidden && !document.getElementById('compo-micro').hidden));
  await mesurerLargeur(S, nom + ' · conversation'); await mesurerTextes(S, nom + ' · conversation'); await mesurerCibles(S, nom + ' · conversation'); await mesurerChamps(S, nom + ' · conversation');
  await contraste(S, '.bulle.recue', { nom: 'texte de la bulle reçue (17 px)' });
  await contraste(S, '.bulle.envoyee', { nom: 'texte de la bulle envoyée (17 px, blanc sur --fill)' });
  await contraste(S, '.datage', { nom: 'datage « Aujourd\'hui 14:02 » (11 px)' });
  await contraste(S, '.statut', { nom: 'statut « Lu 14:06 » (11 px)' });
  await contraste(S, '.msg-nom', { nom: 'nom d\'auteur (11 px)' });
  await contraste(S, '.vocal.recue .vocal-duree', { nom: 'durée du vocal reçu (13 px)' });
  await contraste(S, '.conv-titre-nom span', { nom: 'nom dans la barre en verre (12 px)' });
  if (S.pf.w < 1100) await contraste(S, '#conv-badge', { nom: 'badge des non-lus (12 px, blanc sur --fill)' });      // au-delà de 1 100 px la liste est à côté : le retour n'existe pas
  /* la police ne bouge pas, le texte ne se coupe pas : une bulle ne déborde jamais de sa colonne */
  const b = await S.page.evaluate(() => { const col = document.getElementById('conv-messages').getBoundingClientRect(); return [...document.querySelectorAll('.bulle, .vocal, .photos')].map(e => e.getBoundingClientRect().width / col.width); });
  v(nom + ' : aucune bulle ne dépasse 78 % de sa colonne (' + b.length + ' bulles mesurées, la plus large ' + (Math.max(...b) * 100).toFixed(0) + ' %)', b.length >= 6 && Math.max(...b) <= 0.781, b);
}

/* ── lire les six conversations : chacune s'ouvre, dit la même chose que la source, et rend la liste à sa place ── */
async function etapeToutLire(S) {
  const nom = S.nom;
  titre(nom + ' — ouvrir chaque conversation, la lire, revenir');
  v(nom + ' : retour par le geste de l\'appareil ferme la conversation', await fermerConv(S));
  const h = await hist(S);
  v(nom + ' : l\'entrée d\'historique est rendue (n = ' + h.n + ', adresse ' + h.hash + ') et la page n\'a pas été quittée', h.n === 0 && h.hash === '#messages' && !h.conv);
  const NOMS = { v1: 'Équipe dépôt', v2: 'Camille Roux', v3: 'Chantier Les Tilleuls', v4: 'Mathis Lambert', v5: 'Général', v6: 'Hugo Perrin' };
  let lus = 0, portes = 0;
  for (const id of Object.keys(NOMS)) {
    const ok = await ouvrirConv(S, id, NOMS[id]); portes++;
    const r = await S.page.evaluate(async i => { const c = await window.OPMSG_SOURCE.ouvrir(i); const q = s => [...document.querySelectorAll(s)];
      return { attendu: c.messages.length, obtenu: q('#conv-messages .msg').length + q('#conv-messages .systeme').length, type: c.type, noms: q('.msg-nom').length, compoVis: !document.getElementById('compo').hidden, ferme: !document.getElementById('compo-ferme').hidden, annonces: c.annoncesSeulement && c.admins.indexOf('moi') < 0,
        point: !!document.querySelector('#liste-conv [data-ouvrir="' + i + '"] .point'), titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), bas: (f => f.scrollHeight - f.scrollTop - f.clientHeight)(document.getElementById('conv-fil')) }; }, id);
    const bon = ok && r.attendu === r.obtenu && r.titre === NOMS[id] && !r.point && (r.type === 'direct' ? r.noms === 0 : true) && (r.annonces ? (!r.compoVis && r.ferme) : (r.compoVis && !r.ferme)) && r.bas < 2;
    if (bon) lus++;
    v(nom + ' : « ' + NOMS[id] + ' » (' + r.type + ') — ' + r.obtenu + ' messages comme la source, lue, défilée en bas' + (r.type === 'direct' ? ', aucun nom d\'auteur (une personne en face)' : '') + (r.annonces ? ', champ remplacé par « Seuls les admins peuvent écrire » (groupe d\'annonces, je ne suis pas admin)' : ''), bon, r);
    if (id !== 'v6') await fermerConv(S);
  }
  const tout = await S.page.evaluate(async () => (await window.OPMSG_SOURCE.lister()).filter(c => c.nonLu).length);
  v(nom + ' : (population) ' + portes + ' conversations ouvertes, ' + lus + ' lues sans défaut ; plus aucune non lue dans la source (' + tout + ')', portes === 6 && lus === 6 && tout === 0);
  await fermerConv(S);
  v(nom + ' : une conversation lue n\'a plus de point dans la liste (' + await nb(S, '#liste-conv .point') + ' points)', (await nb(S, '#liste-conv .point')) === 0);
}

/* ══ LA SAISIE : texte court, long, multi-ligne, HTML piégé, Entrée ═══════════════════════════════════════════════════════════ */
async function etapeSaisie(S) {
  const nom = S.nom, bureau = !S.pf.mobile;
  titre(nom + ' — écrire (' + (bureau ? 'souris + clavier' : 'doigt') + ')');
  S.page.on('dialog', d => { S.dialogues = (S.dialogues || 0) + 1; d.dismiss().catch(() => {}); });
  await ouvrirConv(S, 'v3', 'Chantier Les Tilleuls');
  const ta = S.page.locator('#saisie');
  const e0 = await S.page.evaluate(() => ({ envoyerCache: document.getElementById('envoyer').hidden, microVu: !document.getElementById('compo-micro').hidden, h1: document.getElementById('saisie').offsetHeight, lh: parseFloat(getComputedStyle(document.getElementById('saisie')).fontSize) }));
  v(nom + ' : vide → le micro, pas de flèche ; champ à ' + e0.lh + ' px de police (≥ 16 : iOS ne zoome pas)', e0.envoyerCache && e0.microVu && e0.lh >= 16, e0);
  /* un vrai clavier : on pose le focus par un geste puis on frappe */
  await geste(S, '#saisie'); await taper(S, 'Bonjour à tous');
  const e1 = await S.page.evaluate(() => ({ envoyerVu: !document.getElementById('envoyer').hidden, microCache: document.getElementById('compo-micro').hidden, val: document.getElementById('saisie').value }));
  v(nom + ' : du texte saisi → la flèche d\'envoi remplace le micro', e1.envoyerVu && e1.microCache && e1.val === 'Bonjour à tous', e1);
  const n0 = await nb(S, '#conv-messages .msg');
  if (bureau) { await S.page.keyboard.press('Enter'); S.gestes++; } else await geste(S, '#envoyer');
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0);
  await dormir(200);
  let s = await S.page.evaluate(() => { const m = [...document.querySelectorAll('#conv-messages .msg')].pop(); const fil = document.getElementById('conv-fil'); const li = document.querySelector('#liste-conv li:first-child');
    return { n: document.querySelectorAll('#conv-messages .msg').length, texte: m.querySelector('.bulle').textContent, sens: m.className, statut: (m.querySelector('.statut') || {}).textContent, champ: document.getElementById('saisie').value, hChamp: document.getElementById('saisie').offsetHeight,
      envoyerCache: document.getElementById('envoyer').hidden, bas: fil.scrollHeight - fil.scrollTop - fil.clientHeight,
      tete: { nom: li.querySelector('.conv-nom').textContent, apercu: li.querySelector('.conv-apercu').textContent, heure: li.querySelector('.conv-heure').textContent } }; });
  v(nom + ' : ' + (bureau ? 'Entrée' : 'la flèche') + ' envoie — la bulle paraît en bas (envoyée, « Envoyé »), le champ se vide et retrouve sa hauteur d\'une ligne, la flèche repart', s.n === n0 + 1 && s.texte === 'Bonjour à tous' && /de-moi/.test(s.sens) && s.statut === 'Envoyé' && s.champ === '' && s.hChamp === e0.h1 && s.envoyerCache, { s, h1: e0.h1 });
  v(nom + ' : la conversation défile en bas à l\'envoi (reste ' + s.bas.toFixed(1) + ' px)', s.bas < 2, s);
  v(nom + ' : la liste REMONTE la conversation en tête avec le bon aperçu et l\'heure — « ' + s.tete.nom + ' · ' + s.tete.apercu + ' · ' + s.tete.heure + ' »', s.tete.nom === 'Chantier Les Tilleuls' && s.tete.apercu === 'Vous : Bonjour à tous' && s.tete.heure === 'maintenant', s);
  await dormir(1800);
  const lu = await txt(S, '#conv-messages .msg:last-of-type .statut');
  v(nom + ' : 1,5 s plus tard « Envoyé » devient « ' + lu + ' » (la source simule la lecture, dans l\'aperçu seulement)', /^Lu \d\d:\d\d$/.test(lu || ''), lu);

  /* multi-ligne : Maj+Entrée au bureau, Entrée au doigt = retour à la ligne, et la bulle le garde */
  await ta.fill(''); await geste(S, '#saisie'); await taper(S, 'ligne un');
  await S.page.keyboard.press(bureau ? 'Shift+Enter' : 'Enter'); await taper(S, 'ligne deux');
  const m1 = await S.page.evaluate(() => ({ val: document.getElementById('saisie').value, h: document.getElementById('saisie').offsetHeight, n: document.querySelectorAll('#conv-messages .msg').length }));
  v(nom + ' : ' + (bureau ? 'Maj+Entrée' : 'Entrée au doigt') + ' va à la ligne SANS envoyer, le champ grandit (' + e0.h1 + ' → ' + m1.h + ' px)', m1.val === 'ligne un\nligne deux' && m1.h > e0.h1 + 15 && m1.n === n0 + 1, m1);
  if (bureau) { await S.page.keyboard.press('Enter'); S.gestes++; } else await geste(S, '#envoyer');
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0 + 1); await dormir(150);
  const m2 = await S.page.evaluate(() => { const b = [...document.querySelectorAll('#conv-messages .bulle')].pop(); return { t: b.innerText, h: b.getBoundingClientRect().height, ws: getComputedStyle(b).whiteSpace }; });
  v(nom + ' : la bulle garde le retour à la ligne (« ligne un⏎ligne deux », ' + Math.round(m2.h) + ' px de haut pour deux lignes)', m2.t === 'ligne un\nligne deux' && m2.h >= 44 && m2.ws === 'pre-wrap', m2);
  /* le champ grandit jusqu'à ~5 lignes puis défile */
  await ta.fill('1\n2\n3\n4\n5\n6\n7\n8'); S.gestes++;
  const m3 = await S.page.evaluate(() => { const t = document.getElementById('saisie'), cs = getComputedStyle(t); const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom); return { h: t.offsetHeight, lignes: (t.offsetHeight - pad) / 22, defile: t.scrollHeight > t.clientHeight, ov: cs.overflowY }; });
  v(nom + ' : huit lignes saisies → le champ plafonne à 5 lignes (' + m3.lignes.toFixed(1) + ') et défile (' + m3.h + ' px)', m3.lignes > 4.8 && m3.lignes <= 5.05 && m3.defile, m3);
  await ta.fill(''); S.gestes++;
  /* un mot interminable se coupe dans la bulle */
  const long = 'W'.repeat(180) + ' fin';
  await envoyerTexte(S, long);
  const l1 = await S.page.evaluate(() => { const b = [...document.querySelectorAll('#conv-messages .bulle')].pop(), col = document.getElementById('conv-messages').getBoundingClientRect(), r = b.getBoundingClientRect(); return { sw: b.scrollWidth, cw: b.clientWidth, part: r.width / col.width, droite: r.right, W: innerWidth, texte: b.textContent.length }; });
  v(nom + ' : un texte de 184 signes sans espace se coupe DANS la bulle (' + Math.round(l1.part * 100) + ' % de la colonne, rien ne dépasse à droite)', l1.texte === 184 && l1.sw <= l1.cw + 1 && l1.part <= 0.781 && l1.droite <= l1.W, l1);
  await mesurerLargeur(S, nom + ' · avec un mot de 180 signes');
  /* HTML piégé : affiché tel quel, rien ne s'exécute */
  const PIEGES = ['<img src=x onerror=alert(1)>', '<script>window.__pwned=1</script>', '"><svg onload="window.__pwned=2">', '&lt;b&gt;gras&lt;/b&gt; <b>gras</b>'];
  let intacts = 0;
  for (const p of PIEGES) {
    await envoyerTexte(S, p);
    const r = await S.page.evaluate(() => { const m = [...document.querySelectorAll('#conv-messages .msg')].pop(), b = m.querySelector('.bulle'); const li = document.querySelector('#liste-conv li:first-child .conv-apercu');
      return { t: b.textContent, enfants: b.children.length, injectes: document.querySelectorAll('#conv-messages img, #conv-messages script, #conv-messages svg, #liste-conv img, #liste-conv script, #liste-conv b').length, apercu: li.textContent, pwned: window.__pwned || null, aperEnfants: li.children.length }; });
    if (r.t === p && r.enfants === 0 && r.injectes === 0 && r.apercu === 'Vous : ' + p && !r.pwned && r.aperEnfants === 0) intacts++;
    else v(nom + ' : HTML piégé « ' + p + ' »', false, r);
  }
  await dormir(300);
  v(nom + ' : (population) ' + PIEGES.length + ' messages piégés envoyés — ' + intacts + ' affichés TELS QUELS dans la bulle ET dans la liste, 0 élément injecté, 0 script exécuté, ' + (S.dialogues || 0) + ' fenêtre alert()', intacts === PIEGES.length && !(S.dialogues || 0));
  /* Entrée et blanc */
  await ta.fill('   '); S.gestes++;
  const nA = await nb(S, '#conv-messages .msg');
  await S.page.keyboard.press('Enter'); await dormir(250);
  const bl = await S.page.evaluate(() => ({ n: document.querySelectorAll('#conv-messages .msg').length, envoyerCache: document.getElementById('envoyer').hidden }));
  v(nom + ' : un message fait d\'espaces ne part pas, la flèche reste cachée', bl.n === nA && bl.envoyerCache, bl);
  await ta.fill('envoyé par Ctrl+Entrée'); S.gestes++;
  await S.page.keyboard.press('Control+Enter'); await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, nA); await dormir(150);
  v(nom + ' : Ctrl+Entrée envoie partout', (await nb(S, '#conv-messages .msg')) === nA + 1);
  if (!bureau) {
    await ta.fill('ne part pas par Entrée'); await geste(S, '#saisie'); const nB = await nb(S, '#conv-messages .msg'); await S.page.keyboard.press('Enter'); await dormir(250);
    v(nom + ' : au doigt, Entrée ne ENVOIE PAS (retour à la ligne) — la flèche seule envoie', (await nb(S, '#conv-messages .msg')) === nB);
    await ta.fill('');
  }
  /* assez de messages pour que la conversation défile : le bas se tient à chaque envoi */
  for (let i = 1; i <= 6; i++) await envoyerTexte(S, 'Message de remplissage numéro ' + i + ', assez long pour passer sur deux lignes dans la colonne.');
  const f = await S.page.evaluate(() => { const fil = document.getElementById('conv-fil'); return { defile: fil.scrollHeight > fil.clientHeight + 50, sh: fil.scrollHeight, ch: fil.clientHeight, bas: fil.scrollHeight - fil.scrollTop - fil.clientHeight }; });
  v(nom + ' : (population) la conversation défile (' + f.sh + ' px de contenu pour ' + f.ch + ') ET reste calée en bas après 6 envois de plus (reste ' + f.bas.toFixed(1) + ' px)', f.defile && f.bas < 2, f);
  /* le brouillon se garde, par conversation */
  await ta.fill('brouillon du chantier'); S.gestes++;
  await fermerConv(S);
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  const d1 = await S.page.evaluate(() => document.getElementById('saisie').value);
  await fermerConv(S);
  await ouvrirConv(S, 'v3', 'Chantier Les Tilleuls');
  const d2 = await S.page.evaluate(() => document.getElementById('saisie').value);
  v(nom + ' : le brouillon reste attaché à SA conversation (vide ailleurs : « ' + d1 + ' », retrouvé ici : « ' + d2 + ' »)', d1 === '' && d2 === 'brouillon du chantier');
  await ta.fill(''); S.gestes++;
  await mesurerLargeur(S, nom + ' · conversation pleine'); await mesurerTextes(S, nom + ' · conversation pleine'); await mesurerCibles(S, nom + ' · conversation pleine');
  await fermerConv(S);
}

/* ══ LES PHOTOS : le vrai sélecteur de fichier, la réduction par canvas, la vignette, l'agrandissement ═══════════════════════════ */
async function choisirFichiers(S, fichiers) {
  const [fc] = await Promise.all([S.page.waitForEvent('filechooser', { timeout: 6000 }), geste(S, '#compo-plus')]);
  await fc.setFiles(fichiers);
}
async function etapePhotos(S, F) {
  const nom = S.nom;
  titre(nom + ' — joindre une photo, l\'agrandir');
  await ouvrirConv(S, 'v2', 'Camille Roux');
  const n0 = await nb(S, '#conv-messages .msg');
  await choisirFichiers(S, F.grande);
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0); await dormir(400);
  const p1 = await S.page.evaluate(async () => { const m = [...document.querySelectorAll('#conv-messages .msg')].pop(), im = m.querySelector('.photo img'); await new Promise(r => im.complete ? r() : im.addEventListener('load', r)); const b = im.parentElement.getBoundingClientRect();
    const f = document.getElementById('conv-fil'); return { une: !!m.querySelector('.photos.une'), src: im.src.slice(0, 5), w: im.naturalWidth, h: im.naturalHeight, bw: Math.round(b.width), bh: Math.round(b.height), moi: /de-moi/.test(m.className), bas: f.scrollHeight - f.scrollTop - f.clientHeight, alt: im.alt }; });
  v(nom + ' : une photo de 2 400 × 1 600 est RÉDUITE par un canvas à ' + p1.w + ' × ' + p1.h + ' (≤ 1 280), posée dans une bulle de ' + p1.bw + '×' + p1.bh + ' (blob:, jamais envoyée ailleurs), la conversation défile en bas', p1.une && p1.src === 'blob:' && p1.w === 1280 && p1.h === 853 && p1.moi && p1.bas < 2 && /Photo envoyée/.test(p1.alt), p1);
  await choisirFichiers(S, [F.petite, F.grande]);
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0 + 1); await dormir(500);
  const p2 = await S.page.evaluate(() => { const m = [...document.querySelectorAll('#conv-messages .msg')].pop(); return { n: m.querySelectorAll('.photo img').length, tailles: [...m.querySelectorAll('.photo')].map(b => Math.round(b.getBoundingClientRect().width) + '×' + Math.round(b.getBoundingClientRect().height)), une: !!m.querySelector('.photos.une') }; });
  v(nom + ' : deux fichiers choisis → UN message à deux vignettes de 118 × 88', p2.n === 2 && !p2.une && p2.tailles.join() === '118×88,118×88', p2);
  /* validité : une image illisible n'envoie rien, et le dit */
  const nC = await nb(S, '#conv-messages .msg');
  await choisirFichiers(S, F.cassee); await dormir(900);
  const c1 = await S.page.evaluate(() => ({ n: document.querySelectorAll('#conv-messages .msg').length, avis: document.getElementById('avis').hidden ? null : document.getElementById('avis').textContent }));
  v(nom + ' : une image illisible n\'est PAS envoyée et le dit (« ' + c1.avis + ' »)', c1.n === nC && /n'a pas pu être lue/.test(c1.avis || ''), c1);
  await choisirFichiers(S, [F.cassee, F.petite]); await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, nC); await dormir(500);
  const c2 = await S.page.evaluate(() => ({ n: document.querySelectorAll('#conv-messages .msg').length, photos: [...document.querySelectorAll('#conv-messages .msg')].pop().querySelectorAll('.photo img').length, avis: document.getElementById('avis').hidden ? null : document.getElementById('avis').textContent }));
  v(nom + ' : une illisible parmi deux → la bonne part, l\'autre est signalée (« ' + c2.avis + ' »)', c2.n === nC + 1 && c2.photos === 1 && /Une image n'a pas pu/.test(c2.avis || ''), c2);
  await mesurerLargeur(S, nom + ' · photos'); await mesurerCibles(S, nom + ' · photos');

  /* l'agrandir : toucher la vignette ; l'✕, Échap, le retour système et le fond la ferment */
  const miniature = '#conv-messages .photo[data-photo]';
  const ferm = [
    ['la croix ✕', async () => { await geste(S, '#visionneuse-fermer'); }],
    ['Échap', async () => { await S.page.keyboard.press('Escape'); S.gestes++; }],
    ['le retour système (page.goBack)', async () => { await S.page.goBack(); S.gestes++; }],
    ['un toucher sur le fond', async () => { if (S.pf.mobile) await S.page.touchscreen.tap(S.pf.w / 2, S.pf.h - 6); else await S.page.mouse.click(8, S.pf.h - 6); S.gestes++; }]
  ];
  let fermees = 0;
  for (const [nomF, f] of ferm) {
    const hAvant = await hist(S);
    await geste(S, miniature + ' >> nth=0'); await dormir(350);
    const o = await S.page.evaluate(() => { const vz = document.getElementById('visionneuse'), im = document.getElementById('visionneuse-img'); const r = vz.getBoundingClientRect();
      return { vis: !vz.hidden, src: im.src.slice(0, 5), nat: im.naturalWidth, plein: Math.round(r.width) + '×' + Math.round(r.height), inert: document.getElementById('app').inert, foyer: document.activeElement.id }; });
    const hOuvert = await hist(S);
    const bonO = o.vis && o.src === 'blob:' && o.nat > 100 && o.plein === S.pf.w + '×' + S.pf.h && o.inert && o.foyer === 'visionneuse-fermer' && hOuvert.n === hAvant.n + 1 && hOuvert.photo;
    await f(); await dormir(500);
    const fe = await S.page.evaluate(() => ({ vis: !document.getElementById('visionneuse').hidden, inert: document.getElementById('app').inert, foyer: document.activeElement.matches('[data-photo]'), conv: document.documentElement.dataset.conv }));
    const hFerme = await hist(S);
    const bon = bonO && !fe.vis && !fe.inert && fe.conv === '1' && hFerme.n === hAvant.n && fe.foyer;
    if (bon) fermees++;
    v(nom + ' : photo agrandie (pleine fenêtre ' + o.plein + ', focus sur ✕, fond inerte, +1 entrée) puis fermée par ' + nomF + ' (entrée rendue, la conversation reste, focus rendu à la vignette)', bon, { o, fe, hAvant, hOuvert, hFerme });
  }
  v(nom + ' : (population) 4 façons de fermer jouées, ' + fermees + ' sans défaut', fermees === 4);
  /* deux couches empilées : le retour ferme la photo, puis la conversation */
  await geste(S, miniature + ' >> nth=0'); await dormir(300);
  const pops0 = await S.page.evaluate(() => window.__pops);
  await S.page.goBack(); await dormir(450);
  const a = await hist(S); await S.page.goBack(); await dormir(450); const b = await hist(S);
  const pops1 = await S.page.evaluate(() => window.__pops);
  v(nom + ' : conversation + photo = deux entrées ; le 1er retour ferme la photo (n ' + a.n + ', conversation ouverte), le 2e ferme la conversation (n ' + b.n + ') — ' + (pops1 - pops0) + ' popstate pour 2 retours (une navigation par geste)', !a.photo && a.conv === '1' && a.n === 1 && !b.conv && b.n === 0 && pops1 - pops0 === 2, { a, b });
}

/* ══ LE VOCAL : lire un exemple, ENREGISTRER un vrai (micro factice), l'envoyer, le réécouter, l'annuler ═══════════════════════════ */
async function etapeVocal(S) {
  const nom = S.nom, bureau = !S.pf.mobile;
  titre(nom + ' — le vocal');
  await ouvrirConv(S, 'v4', 'Mathis Lambert');
  await geste(S, '.vocal[data-lire]'); await dormir(1400);
  const e1 = await S.page.evaluate(() => { const b = document.querySelector('.vocal[data-lire]'); return { lecture: b.hasAttribute('data-lecture'), joue: b.querySelectorAll('.onde i.joue').length, pause: getComputedStyle(b.querySelector('.pause')).display, play: getComputedStyle(b.querySelector('.play')).display, label: b.getAttribute('aria-label') }; });
  v(nom + ' : un vocal d\'exemple se « lit » : le bouton passe en pause, ' + e1.joue + ' barre(s) sur 10 déjà jouée(s) après 1,4 s (sans son : aucun fichier dans l\'aperçu)', e1.lecture && e1.joue >= 1 && e1.joue < 10 && e1.pause !== 'none' && e1.play === 'none' && /pause/.test(e1.label), e1);
  await geste(S, '.vocal[data-lire]'); await dormir(250);
  const e2 = await S.page.evaluate(() => ({ lecture: !!document.querySelector('[data-lecture]'), joue: document.querySelectorAll('.onde i.joue').length }));
  v(nom + ' : un second toucher le met en pause (aucune barre jouée, plus de lecture)', !e2.lecture && e2.joue === 0, e2);

  /* enregistrer : toucher démarre, la flèche envoie */
  const nMsg = () => nb(S, '#conv-messages .msg');
  const n0 = await nMsg();
  await geste(S, '#compo-micro');
  const ouvert = await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000);
  await dormir(1500);
  const r1 = await S.page.evaluate(() => ({ enreg: !document.getElementById('enreg').hidden, compo: !document.getElementById('compo').hidden, duree: document.getElementById('enreg-duree').textContent, barres: document.querySelectorAll('#enreg-onde i').length,
    demandes: window.__micro.demandes, pistes: window.__micro.pistes.map(t => t.readyState), foyer: document.activeElement && document.activeElement.id }));
  v(nom + ' : toucher le micro démarre un VRAI enregistrement (getUserMedia ×' + r1.demandes + ', piste ' + r1.pistes.join() + ') : la barre d\'enregistrement remplace le champ, la durée avance (« ' + r1.duree + ' »), la forme d\'onde se dessine (' + r1.barres + ' barres)',
    ouvert && r1.enreg && !r1.compo && r1.demandes === 1 && r1.pistes.join() === 'live' && /^0:0[1-3]$/.test(r1.duree) && r1.barres >= 8, r1);
  await mesurerCibles(S, nom + ' · barre d\'enregistrement'); await mesurerLargeur(S, nom + ' · barre d\'enregistrement');
  await geste(S, '#enreg-envoyer');
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n0, 6000); await dormir(400);
  const r2 = await S.page.evaluate(() => { const m = [...document.querySelectorAll('#conv-messages .msg')].pop(), b = m.querySelector('.vocal'); return { vocal: !!b, moi: b && b.classList.contains('envoyee'), duree: b && b.querySelector('.vocal-duree').textContent, barres: b ? b.querySelectorAll('.onde i').length : 0, enreg: !document.getElementById('enreg').hidden, compo: !document.getElementById('compo').hidden,
    pistes: window.__micro.pistes.map(t => t.readyState), apercu: document.querySelector('#liste-conv li:first-child .conv-apercu').textContent, nom: document.querySelector('#liste-conv li:first-child .conv-nom').textContent }; });
  v(nom + ' : la flèche envoie le vocal (« ' + r2.duree + ' », ' + r2.barres + ' barres), le micro est RELÂCHÉ (piste ' + r2.pistes.join() + '), le champ revient ; la liste dit « ' + r2.apercu + ' » et remonte la conversation',
    n0 + 1 === await nMsg() && r2.vocal && r2.moi && /^0:\d\d$/.test(r2.duree) && r2.duree !== '0:00' && r2.barres === 10 && !r2.enreg && r2.compo && r2.pistes.join() === 'ended' && /^Vous : Message vocal · 0:\d\d$/.test(r2.apercu) && r2.nom === 'Mathis Lambert', r2);
  /* le réécouter : un vrai Audio */
  await geste(S, '.vocal.envoyee >> nth=-1'); await dormir(500);
  const l1 = await S.page.evaluate(() => ({ lectures: window.__audios.length, src: window.__audios[0] && window.__audios[0].src.slice(0, 5), lecture: !!document.querySelector('.vocal.envoyee[data-lecture]') }));
  await attendre(S, () => !document.querySelector('[data-lecture]'), null, 15000); await dormir(200);
  const l2 = await S.page.evaluate(() => ({ lecture: !!document.querySelector('[data-lecture]'), t: window.__audios[0] ? window.__audios[0].currentTime : -1, fini: window.__audios[0] ? window.__audios[0].ended : null, erreur: window.__audios[0] && window.__audios[0].error && window.__audios[0].error.code }));
  v(nom + ' : un vocal enregistré se RELIT par un vrai Audio (' + l1.lectures + ' lecture, source ' + l1.src + ', temps ' + l2.t.toFixed(2) + ' s, terminé : ' + l2.fini + '), puis le bouton revient seul', l1.lectures === 1 && l1.src === 'blob:' && l1.lecture && !l2.lecture && (l2.fini || l2.t > 0.5) && !l2.erreur, { l1, l2 });
  /* annuler */
  const n1 = await nMsg();
  await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000); await dormir(500);
  await geste(S, '#enreg-annuler'); await dormir(500);
  const a1 = await S.page.evaluate(() => ({ enreg: !document.getElementById('enreg').hidden, compo: !document.getElementById('compo').hidden, pistes: window.__micro.pistes.map(t => t.readyState) }));
  v(nom + ' : annuler (corbeille) ne publie rien, relâche le micro (pistes ' + a1.pistes.join() + ') et rend le champ', (await nMsg()) === n1 && !a1.enreg && a1.compo && a1.pistes.every(s => s === 'ended') && a1.pistes.length === 2, a1);
  /* trop court */
  await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000);
  /* le clic part DE LA PAGE, tout de suite : le délai d'un geste de Playwright (visible, stable, actif) dépasserait la seconde et rendrait le test faux */
  await S.page.evaluate(() => document.getElementById('enreg-envoyer').click()); await dormir(500);
  const t1 = await S.page.evaluate(() => ({ avis: document.getElementById('avis').hidden ? null : document.getElementById('avis').textContent, compo: !document.getElementById('compo').hidden }));
  v(nom + ' : un vocal de moins d\'une seconde n\'est pas envoyé et le dit (« ' + t1.avis + ' »)', (await nMsg()) === n1 && /trop court/.test(t1.avis || '') && t1.compo, t1);
  /* trop court, mais PAS vide : 450 ms de prise (le navigateur a eu le temps de livrer des morceaux). Seule la durée minimale la refuse — sans ce cas, la
     garde « aucun morceau » masquait la durée minimale (mutation S11, jouée le 1er octobre 2026 : la sonde restait verte avec un minimum de 0) */
  await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000); await dormir(450);
  await S.page.evaluate(() => document.getElementById('enreg-envoyer').click()); await dormir(500);
  const t2 = await S.page.evaluate(() => ({ avis: document.getElementById('avis').hidden ? null : document.getElementById('avis').textContent, compo: !document.getElementById('compo').hidden }));
  v(nom + ' : une prise de 450 ms (pas vide) est refusée elle aussi — durée minimale, pas seulement « rien enregistré » (« ' + t2.avis + ' »)', (await nMsg()) === n1 && /trop court/.test(t2.avis || '') && t2.compo, t2);
  /* maintenir : le relâcher envoie */
  const c = await S.page.evaluate(() => { const r = document.getElementById('compo-micro').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (bureau) { await S.page.mouse.move(c.x, c.y); await S.page.mouse.down(); await dormir(1300); await S.page.mouse.up(); }
  else { await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] }); await dormir(1300); await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  S.gestes++;
  await attendre(S, n => document.querySelectorAll('#conv-messages .msg').length > n, n1, 6000); await dormir(300);
  const h1 = await S.page.evaluate(() => ({ enreg: !document.getElementById('enreg').hidden, vocaux: document.querySelectorAll('.vocal.envoyee').length }));
  v(nom + ' : MAINTENIR le micro 1,3 s puis relâcher envoie le vocal tout seul (' + h1.vocaux + ' vocaux envoyés en tout)', (await nMsg()) === n1 + 1 && !h1.enreg && h1.vocaux === 2, h1);
  /* Échap annule, quitter la conversation aussi */
  if (bureau) {
    await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000); await dormir(300);
    await S.page.keyboard.press('Escape'); await dormir(500);
    const k = await S.page.evaluate(() => ({ enreg: !document.getElementById('enreg').hidden, conv: document.documentElement.dataset.conv }));
    v(nom + ' : Échap annule l\'enregistrement SANS fermer la conversation', !k.enreg && k.conv === '1', k);
  }
  await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('enreg').hidden, null, 4000); await dormir(300);
  await fermerConv(S);
  await ouvrirConv(S, 'v4', 'Mathis Lambert');
  const q = await S.page.evaluate(() => ({ enreg: !document.getElementById('enreg').hidden, pistes: window.__micro.pistes.map(t => t.readyState) }));
  v(nom + ' : quitter la conversation en pleine prise annule l\'enregistrement et relâche le micro (' + q.pistes.length + ' pistes, toutes « ended »)', !q.enreg && q.pistes.every(s => s === 'ended'), q);
  await fermerConv(S);
}

/* ══ LE RETOUR, SOUS TOUTES SES FORMES : bouton, retour système, Échap, caméra, avancer ═════════════════════════════════════════ */
async function etapeRetour(S) {
  const nom = S.nom, mode = parLargeur(S);
  titre(nom + ' — le retour (' + mode + ')');
  /* retour système */
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  const p0 = await S.page.evaluate(() => window.__pops);
  await S.page.goBack(); S.gestes++; await attendreListe(S); await dormir(400);
  const r1 = await hist(S), p1 = await S.page.evaluate(() => window.__pops);
  v(nom + ' : le retour SYSTÈME (bouton Android, geste d\'iOS, navigateur) ferme la conversation au lieu de quitter la page — ' + (p1 - p0) + ' popstate (une navigation, pas deux)', !r1.conv && r1.n === 0 && r1.hash === '#messages' && p1 - p0 === 1 && (await S.page.evaluate(() => /index\.html$/.test(location.pathname))), { r1, pops: p1 - p0 });
  await S.page.goForward(); S.gestes++; await attendreConv(S, 'Équipe dépôt'); await dormir(300);
  const r2 = await hist(S);
  v(nom + ' : « avancer » rouvre la même conversation (la route est écrite dans l\'historique)', r2.conv === '1' && r2.hash === '#messages/v1' && r2.n === 1, r2);
  /* Échap */
  await S.page.keyboard.press('Escape'); S.gestes++; await attendreListe(S); await dormir(300);
  const r3 = await hist(S);
  v(nom + ' : Échap ramène à la liste (entrée rendue, n = ' + r3.n + ')', !r3.conv && r3.n === 0, r3);
  /* la caméra mène à Appels, coquille « bientôt » ; le retour revient à la conversation */
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  await geste(S, '#conv-cam'); await attendre(S, () => document.documentElement.dataset.vue === 'appels'); await dormir(500);
  const c1 = await S.page.evaluate(() => ({ vue: document.documentElement.dataset.vue, conv: document.documentElement.dataset.conv || null, titre: document.querySelector('#vue-appels h1').textContent, bientot: document.querySelector('#vue-appels .coquille h2').textContent, visible: !document.getElementById('vue-appels').hidden,
    tabs: getComputedStyle(document.getElementById('tabs')).display !== 'none', courant: (document.querySelector('[data-vue][aria-current=page]') || {}).dataset && document.querySelector('[data-vue][aria-current=page]').dataset.vue }));
  v(nom + ' : la caméra mène à l\'onglet Appels (coquille « ' + c1.bientot + ' »), la conversation est fermée, ' + (S.pf.w < 900 ? 'la barre d\'onglets est revenue, l\'onglet courant est Appels' : 'l\'entrée de la barre latérale est « Appels »'), c1.vue === 'appels' && !c1.conv && c1.visible && c1.titre === 'Appels' && c1.bientot === 'Bientôt disponible' && c1.courant === 'appels' && (S.pf.w < 900 ? c1.tabs : true), c1);
  await mesurerLargeur(S, nom + ' · coquille Appels');
  await S.page.goBack(); S.gestes++; await attendreConv(S, 'Équipe dépôt'); await dormir(300);
  const c2 = await hist(S);
  v(nom + ' : le retour système revient à la conversation d\'où l\'on est parti la caméra', c2.vue === 'messages' && c2.conv === '1' && c2.hash === '#messages/v1', c2);
  await fermerConv(S);
  /* bouton de la barre latérale ouvert pendant une conversation (au-delà de 900 px) */
  if (S.pf.w >= 900) {
    await ouvrirConv(S, 'v1', 'Équipe dépôt');
    await geste(S, '#nav-side [data-vue="reunions"]'); await attendre(S, () => document.documentElement.dataset.vue === 'reunions'); await dormir(400);
    const s1 = await hist(S);
    v(nom + ' : un autre onglet de la barre latérale ferme la conversation et montre Réunions', s1.vue === 'reunions' && !s1.conv, s1);
    await S.page.goBack(); await attendreConv(S, 'Équipe dépôt'); await fermerConv(S);
  }
  /* maître-détail : passer d'une conversation à l'autre REMPLACE l'entrée */
  if (mode === 'maitre-detail') {
    await ouvrirConv(S, 'v1', 'Équipe dépôt');
    const a = await hist(S);
    await geste(S, '#liste-conv [data-ouvrir="v2"]'); await attendreConv(S, 'Camille Roux'); await dormir(400);
    const b = await S.page.evaluate(() => ({ titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), sel: [...document.querySelectorAll('#liste-conv [aria-current=true]')].map(e => e.dataset.ouvrir), n: history.state.n, len: history.length, ancienne: document.querySelector('#liste-conv [data-ouvrir="v1"]').hasAttribute('aria-current') }));
    v(nom + ' : au bureau, cliquer une autre ligne CHANGE de conversation sans empiler d\'historique (n ' + a.n + ' → ' + b.n + ', ' + a.len + ' → ' + b.len + ' entrées), la surbrillance suit (' + b.sel.join() + ')', b.titre === 'Camille Roux' && b.n === a.n && b.len === a.len && b.sel.join() === 'v2' && !b.ancienne, { a, b });
    await S.page.keyboard.press('Escape'); await attendreListe(S); await dormir(400);
    const d = await S.page.evaluate(() => ({ vide: getComputedStyle(document.getElementById('conv-vide')).display, conv: getComputedStyle(document.getElementById('conv-ecran')).display, txt: document.getElementById('conv-vide').textContent.trim(), sel: document.querySelectorAll('#liste-conv [aria-current=true]').length, n: history.state.n }));
    v(nom + ' : Échap ferme la conversation et le détail redit « ' + d.txt + ' » (aucune ligne en surbrillance)', d.vide !== 'none' && d.conv === 'none' && d.sel === 0 && d.n === 0, d);
  }
}

/* ══ LES ÉPINGLÉS, ET LE LIEN DIRECT ══════════════════════════════════════════════════════════════════════════════════════════ */
async function etapeEpingles(S) {
  const nom = S.nom;
  titre(nom + ' — ouvrir depuis un épinglé');
  await geste(S, '#epingles [data-ouvrir="v2"]'); const ok = await attendreConv(S, 'Camille Roux'); await dormir(400);
  const e = await S.page.evaluate(() => ({ titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), ep: document.querySelector('#epingles [data-ouvrir="v2"]').getAttribute('aria-current'), n: history.state.n }));
  v(nom + ' : un épinglé (« Camille Roux ») ouvre sa conversation, comme la ligne (' + (e.ep === 'true' ? 'surbrillance posée' : 'caché sous la conversation') + ')', ok && e.titre === 'Camille Roux' && e.n === 1 && e.ep === 'true', e);
  await fermerConv(S);
}

/* ══ ÉTAPE 1 — LA FEUILLE « NOUVEAU GROUPE » (jouée avec l'historique de l'étape 2) ═══════════════════════════════════════════ */
async function etapeFeuille(S, F) {
  const nom = S.nom;
  titre(nom + ' — la feuille « Nouveau groupe »');
  const h0 = await hist(S);
  await geste(S, '#btn-groupe'); await dormir(800);
  const s = await S.page.evaluate(() => { const f = document.getElementById('feuille').getBoundingClientRect(), corps = document.getElementById('feuille-corps'), a = document.getElementById('g-annonces').getBoundingClientRect();
    return { classe: document.documentElement.classList.contains('feuille-ouverte'), vis: getComputedStyle(document.getElementById('feuille')).visibility, left: f.left, top: f.top, bas: f.bottom, w: f.width, h: innerHeight, W: innerWidth, compteur: document.getElementById('g-compteur').textContent, creerOff: document.getElementById('g-creer').getAttribute('aria-disabled'),
      appInert: document.getElementById('app').inert, foyer: document.activeElement.id, sh: corps.scrollHeight, ch: corps.clientHeight, annoncesBas: a.bottom, annoncesHaut: a.top }; });
  v(nom + ' : la feuille s\'ouvre (visible, dans l\'écran, fond inerte, focus dans la feuille), compteur « 0 / 6 », Créer désactivé', s.classe && s.vis === 'visible' && s.top >= 0 && s.bas <= s.h + 1 && s.appInert && s.foyer === 'feuille' && s.compteur === '0 / 6' && s.creerOff === 'true', s);
  const h1 = await hist(S);
  v(nom + ' : ouvrir la feuille POSE une entrée d\'historique (n 0 → ' + h1.n + ')', h0.n === 0 && h1.n === 1 && h1.feuille, { h0, h1 });
  if (S.pf.w >= 700) {
    const centre = Math.abs(s.left + s.w / 2 - s.W / 2) < 2;
    v(nom + ' : dès 700 px la feuille est une FENÊTRE centrée (' + Math.round(s.w) + ' px de large, ' + Math.round(s.top) + ' px du haut), plus une feuille du bas pleine largeur', centre && s.w <= 520 && s.top > 8, s);
    if (S.pf.h >= 800) v(nom + ' : sur ' + S.pf.h + ' px de haut la feuille tient en entier — « Seuls les admins écrivent » est visible sans défiler (contenu ' + s.sh + ' pour ' + s.ch + ' px, dernier réglage à ' + Math.round(s.annoncesBas) + ' px)', s.sh <= s.ch + 1 && s.annoncesBas <= s.bas, s);
  } else v(nom + ' : au téléphone c\'est une feuille du bas, pleine largeur (' + Math.round(s.w) + ' px)', Math.abs(s.w - s.W) < 1 && Math.abs(s.bas - s.h) < 2, s);
  await mesurerLargeur(S, nom + ' · feuille'); await mesurerTextes(S, nom + ' · feuille'); await mesurerCibles(S, nom + ' · feuille'); await mesurerChamps(S, nom + ' · feuille');
  await contraste(S, '#g-contacts .contact:first-child .rond', { bordure: true, seuil: 3, nom: 'contour d\'une case décochée (non-texte, ≥ 3:1)' });
  await contraste(S, '#g-contacts .contact:first-child .contact-role', { nom: 'rôle d\'un contact (13 px)' });
  /* Créer est inerte tant qu'aucun contact n'est choisi */
  const nAv = await nb(S, '#liste-conv > li');
  await geste(S, '#g-creer', { force: true }); await dormir(300);      // aria-disabled : Playwright le croit inactif, un doigt, lui, touche quand même
  const i0 = await S.page.evaluate(() => ({ ouverte: document.documentElement.classList.contains('feuille-ouverte'), n: document.querySelectorAll('#liste-conv > li').length, notif: document.getElementById('notif').classList.contains('on') }));
  v(nom + ' : « Créer » sans contact ne crée rien (feuille ouverte, ' + nAv + ' conversations, pas de bannière)', i0.ouverte && i0.n === nAv && !i0.notif, i0);
  /* cocher, retirer par la puce ✕, recocher, clavier */
  for (const id of ['c1', 'c2', 'c3']) { await geste(S, '#g-contacts .contact[data-id="' + id + '"]'); await dormir(120); }
  let k = await S.page.evaluate(() => ({ compteur: document.getElementById('g-compteur').textContent, puces: [...document.querySelectorAll('#g-puces .puce')].map(x => x.dataset.retirer), creerOff: document.getElementById('g-creer').getAttribute('aria-disabled') }));
  v(nom + ' : 3 contacts cochés → « 3 / 6 », 3 puces avatar dans l\'ordre du choix, Créer actif', k.compteur === '3 / 6' && k.puces.join() === 'c1,c2,c3' && k.creerOff === 'false', k);
  await geste(S, '#g-puces .puce[data-retirer="c2"]'); await dormir(250);
  k = await S.page.evaluate(() => ({ compteur: document.getElementById('g-compteur').textContent, puces: [...document.querySelectorAll('#g-puces .puce')].map(x => x.dataset.retirer), c2: document.querySelector('#g-contacts .contact[data-id=c2]').getAttribute('aria-checked') }));
  v(nom + ' : la puce ✕ retire Mathis (« 2 / 6 », sa ligne décochée)', k.compteur === '2 / 6' && k.puces.join() === 'c1,c3' && k.c2 === 'false', k);
  await geste(S, '#g-contacts .contact[data-id="c2"]'); await dormir(150);
  k = await S.page.evaluate(() => document.getElementById('g-compteur').textContent + ' | ' + [...document.querySelectorAll('#g-puces .puce')].map(x => x.dataset.retirer).join());
  v(nom + ' : recocher Mathis → « 3 / 6 », sa puce revient en dernier', k === '3 / 6 | c1,c3,c2', k);
  await S.page.locator('#g-contacts .contact[data-id="c6"]').focus(); await S.page.keyboard.press('Space'); await dormir(120);
  k = await S.page.evaluate(() => document.querySelector('#g-contacts .contact[data-id=c6]').getAttribute('aria-checked') + ' ' + document.getElementById('g-compteur').textContent);
  v(nom + ' : au clavier, Espace coche une ligne (« 4 / 6 »)', k === 'true 4 / 6', k);
  await S.page.locator('#g-contacts .contact[data-id="c6"]').click({ force: true }); await dormir(120);
  /* la recherche de contact */
  await geste(S, '#g-recherche'); await taper(S, 'inès'); await dormir(200);
  k = await S.page.evaluate(() => ({ visibles: [...document.querySelectorAll('#g-contacts .contact')].filter(x => !x.hidden).map(x => x.dataset.id), compteur: document.getElementById('g-compteur').textContent }));
  v(nom + ' : « inès » (sans accent ni casse exacte) ne laisse qu\'Inès, la sélection tient (« 3 / 6 »)', k.visibles.join() === 'c3' && k.compteur === '3 / 6', k);
  await S.page.locator('#g-recherche').fill(''); await dormir(150);
  /* nom, réglages */
  await geste(S, '#g-nom'); await taper(S, 'Équipe terrain'); await S.page.keyboard.press('Enter');
  await geste(S, '#g-annonces'); await geste(S, '#g-ephemeres'); await dormir(250);
  k = await S.page.evaluate(() => ({ annonces: document.getElementById('g-annonces').getAttribute('aria-checked'), eph: document.getElementById('g-ephemeres-val').textContent, nom: document.getElementById('g-nom').value }));
  v(nom + ' : nom saisi, « Seuls les admins écrivent » activé, messages éphémères → « 24 heures »', k.annonces === 'true' && k.eph === '24 heures' && k.nom === 'Équipe terrain', k);
  /* la photo du groupe : une image illisible laisse la pastille de repli ET le dit ; un vrai fichier est réduit à 512 px ; une illisible de plus ne casse pas la bonne */
  await S.page.setInputFiles('#g-photo-fichier', F.cassee); await dormir(800);
  const ph0 = await S.page.evaluate(() => ({ avec: document.getElementById('g-photo').classList.contains('avec-image'), mot: document.getElementById('mot').classList.contains('on') ? document.getElementById('mot').textContent : null, icone: getComputedStyle(document.getElementById('g-photo').querySelector('svg')).display }));
  v(nom + ' : une image illisible laisse la PASTILLE de repli (icône visible) ET le dit (« ' + ph0.mot + ' »)', !ph0.avec && ph0.icone !== 'none' && /pastille/.test(ph0.mot || ''), ph0);
  await dormir(2500);
  await S.page.setInputFiles('#g-photo-fichier', F.grande); await dormir(800);
  const ph = await S.page.evaluate(async () => { const g = document.getElementById('g-photo'), u = /url\("?(blob:[^")]+)/.exec(g.style.backgroundImage); const dim = await new Promise(r => { if (!u) return r(null); const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = u[1]; }); return { avec: g.classList.contains('avec-image'), dim, icone: getComputedStyle(g.querySelector('svg')).display }; });
  v(nom + ' : la photo choisie (2 400 × 1 600) est RÉDUITE à ' + (ph.dim ? ph.dim.join(' × ') : '?') + ' (≤ 512), remplit le rond, l\'icône s\'efface', ph.avec && ph.dim && Math.max(...ph.dim) === 512 && ph.icone === 'none', ph);
  await S.page.setInputFiles('#g-photo-fichier', F.cassee); await dormir(800);
  const ph2 = await S.page.evaluate(() => ({ avec: document.getElementById('g-photo').classList.contains('avec-image'), mot: document.getElementById('mot').classList.contains('on') ? document.getElementById('mot').textContent : null }));
  v(nom + ' : une illisible de plus ne casse pas la bonne photo (« ' + ph2.mot + ' ») : on ne casse pas ce qui marche', ph2.avec && /conservée/.test(ph2.mot || ''), ph2);
  await mesurerLargeur(S, nom + ' · feuille avec 3 membres'); await mesurerCibles(S, nom + ' · feuille avec 3 membres');
  /* Créer : la feuille part, le groupe est en tête, la bannière descend puis s'efface seule */
  await S.page.evaluate(() => { window.__j = []; const n = document.getElementById('notif'); new MutationObserver(() => window.__j.push([n.classList.contains('on') ? 'on' : 'off', performance.now()])).observe(n, { attributes: true, attributeFilter: ['class'] }); document.getElementById('g-creer').addEventListener('click', () => window.__j.push(['clic', performance.now()]), true); });
  await geste(S, '#g-creer'); await dormir(900);
  /* la bannière met ~0,5 s à descendre : on attend qu'elle ait ATTEINT sa place (un processeur chargé ralentit les transitions), au lieu de parier sur une durée */
  await attendre(S, () => { const n = document.getElementById('notif'); return n.classList.contains('on') && parseFloat(getComputedStyle(n).opacity) > 0.95 && n.getBoundingClientRect().top >= 0; }, null, 5000);
  const c = await S.page.evaluate(() => { const li = document.querySelector('#liste-conv > li:first-child'), n = document.getElementById('notif'), r = n.getBoundingClientRect(), f = document.getElementById('feuille');
    return { classe: document.documentElement.classList.contains('feuille-ouverte'), fvis: getComputedStyle(f).visibility, appInert: document.getElementById('app').inert, nom: li.querySelector('.conv-nom').textContent, apercu: li.querySelector('.conv-apercu').textContent, point: !!li.querySelector('.point'), heure: li.querySelector('.conv-heure').textContent, total: document.querySelectorAll('#liste-conv > li').length,
      photo: li.querySelector('.avatar').style.backgroundImage.slice(0, 9), neuves: document.querySelectorAll('#liste-conv .conv-neuve').length, n: history.state.n,
      banniere: { on: n.classList.contains('on'), op: parseFloat(getComputedStyle(n).opacity), haut: r.top, g: r.left, d: r.right, w: innerWidth, texte: document.getElementById('notif-texte').textContent, aide: document.getElementById('notif-aide').textContent, role: n.getAttribute('role') }, foyer: document.activeElement.id }; });
  v(nom + ' : la feuille s\'est refermée (invisible, fond actif), l\'entrée d\'historique rendue (n = ' + c.n + '), le focus revenu au bouton Groupe', !c.classe && c.fvis === 'hidden' && !c.appInert && c.n === 0 && c.foyer === 'btn-groupe', c);
  v(nom + ' : le groupe est EN TÊTE — « ' + c.nom + ' · ' + c.apercu + ' », point non-lu, « ' + c.heure + ' », sa photo (' + c.photo + '…) dans la liste, ' + c.total + ' conversations', c.nom === 'Équipe terrain (4)' && c.apercu === 'Vous avez créé le groupe · Camille, Inès, Mathis' && c.point && c.heure === 'maintenant' && c.photo === 'url("blob' && c.total === nAv + 1, c);
  const bn = c.banniere;
  v(nom + ' : la bannière est visible et dans l\'écran (haut ' + Math.round(bn.haut) + ' px), dit « Vous avez été ajouté au groupe « Équipe terrain » » et nomme les membres prévenus ; zone vivante', bn.on && bn.op > 0.95 && bn.haut >= (S.pf.insets ? S.pf.insets.top : 0) && bn.g >= 0 && bn.d <= bn.w && /Vous avez été ajouté au groupe « Équipe terrain »/.test(bn.texte) && /Camille, Inès, Mathis/.test(bn.aide) && bn.role === 'status', bn);
  v(nom + ' : (a) UNE seule ligne rejoue son entrée (' + c.neuves + ' conversation neuve)', c.neuves === 1, c);
  await dormir(3300);
  const J = await S.page.evaluate(() => ({ j: window.__j, on: document.getElementById('notif').classList.contains('on'), bas: document.getElementById('notif').getBoundingClientRect().bottom }));
  const tClic = J.j.find(e => e[0] === 'clic')[1], tOn = J.j.find(e => e[0] === 'on')[1], tOff = J.j.find(e => e[0] === 'off')[1];
  v(nom + ' : la bannière paraît ' + Math.round(tOn - tClic) + ' ms après le clic (≈ 300) et reste ' + Math.round(tOff - tOn) + ' ms (≈ 3 500), puis s\'efface seule', tOn - tClic > 250 && tOn - tClic < 700 && tOff - tOn > 3300 && tOff - tOn < 3900 && !J.on && J.bas <= 0, J);
  /* (a) une deuxième création, puis la frappe dans la recherche : plus aucune ligne ne rejoue son entrée */
  await geste(S, '#btn-groupe'); await dormir(700); await geste(S, '#g-contacts .contact[data-id="c4"]'); await geste(S, '#g-creer'); await dormir(1200);
  const neuf2 = await nb(S, '#liste-conv .conv-neuve');
  await geste(S, '#recherche-conv'); await taper(S, 'zz');
  const neuf3 = await nb(S, '#liste-conv .conv-neuve');
  await S.page.locator('#recherche-conv').fill(''); await dormir(150);
  const neuf4 = await nb(S, '#liste-conv .conv-neuve');
  v(nom + ' : (a) après DEUX créations, la frappe dans la recherche ne rejoue l\'entrée d\'aucune ligne (neuves : ' + neuf2 + ' à la création, ' + neuf3 + ' pendant la frappe, ' + neuf4 + ' après)', neuf2 === 1 && neuf3 === 0 && neuf4 === 0);
  /* la recherche et le retour au calme */
  await S.page.locator('#recherche-conv').fill('tilleuls'); await dormir(200);
  k = await S.page.evaluate(() => [...document.querySelectorAll('#liste-conv .conv-nom')].map(x => x.textContent));
  v(nom + ' : la recherche « tilleuls » ne garde que le chantier', k.length === 1 && /Tilleuls/.test(k[0]), k);
  await S.page.locator('#recherche-conv').fill('zzz'); await dormir(150);
  k = await txt(S, '#liste-conv .vide');
  v(nom + ' : une recherche sans résultat le DIT', k === 'Aucun résultat pour « zzz »', k);
  await S.page.locator('#recherche-conv').fill(''); await dormir(100);
  /* fermer par Annuler / voile / Échap / retour système : l'entrée est rendue à chaque fois, rien n'est créé */
  const total = await nb(S, '#liste-conv > li'); const L0 = (await hist(S)).len;
  const fermetures = [
    ['Annuler', async () => geste(S, '#g-annuler')],
    ['le voile', async () => { const t = await S.page.evaluate(() => document.getElementById('feuille').getBoundingClientRect().top); const y = Math.max(8, t / 2); if (S.pf.mobile) await S.page.touchscreen.tap(S.pf.w / 2, y); else await S.page.mouse.click(S.pf.w / 2, y); S.gestes++; }],
    ['Échap', async () => { await S.page.keyboard.press('Escape'); S.gestes++; }],
    ['le retour système', async () => { await S.page.goBack(); S.gestes++; }]
  ];
  let fermes = 0;
  for (const [g, f] of fermetures) {
    await geste(S, '#btn-groupe'); await dormir(700);
    await geste(S, '#g-contacts .contact[data-id="c4"]'); await dormir(120);
    await f(); await dormir(800);
    const r = await S.page.evaluate(() => ({ ouverte: document.documentElement.classList.contains('feuille-ouverte'), total: document.querySelectorAll('#liste-conv > li').length, foyer: document.activeElement.id, n: history.state.n, len: history.length, hash: location.hash }));
    const bon = !r.ouverte && r.total === total && r.foyer === 'btn-groupe' && r.n === 0 && r.len <= L0 + 1 && r.hash === '#messages';
    if (bon) fermes++;
    v(nom + ' : ' + g + ' referme la feuille sans rien créer (' + total + ' conversations), rend l\'entrée d\'historique (n = ' + r.n + ', ' + r.len + ' entrées), le focus revient au bouton Groupe', bon, r);
  }
  v(nom + ' : (population) 4 façons de fermer jouées, ' + fermes + ' sans défaut', fermes === 4);
  await geste(S, '#btn-groupe'); await dormir(700);
  k = await S.page.evaluate(() => document.getElementById('g-compteur').textContent + ' | nom « ' + document.getElementById('g-nom').value + ' »');
  v(nom + ' : rouverte, la feuille repart de zéro (« 0 / 6 », nom vide)', k === '0 / 6 | nom «  »', k);
  /* glisser la feuille (téléphone) : un petit geste revient, un grand geste ferme */
  if (S.pf.w < 700) {
    const t = await S.page.evaluate(() => { const r = document.querySelector('.poignee').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const glisser = async dy => { await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y }] }); for (let i = 1; i <= 6; i++) { await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: t.x, y: t.y + dy * i / 6 }] }); await dormir(40); } await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); S.gestes++; };
    await glisser(40); await dormir(900);
    k = await S.page.evaluate(() => { const f = document.getElementById('feuille'); return { ouverte: document.documentElement.classList.contains('feuille-ouverte'), dy: Math.round(f.getBoundingClientRect().top - (innerHeight - f.offsetHeight)), tr: f.style.transform }; });
    v(nom + ' : un petit glissé (40 px) ramène la feuille à sa place (décalage ' + k.dy + ' px)', k.ouverte && Math.abs(k.dy) <= 1 && k.tr === '', k);
    await glisser(420); await dormir(900);
    k = await S.page.evaluate(() => ({ ouverte: document.documentElement.classList.contains('feuille-ouverte'), n: history.state.n, foyer: document.activeElement.id }));
    v(nom + ' : un grand glissé (420 px) ferme la feuille (entrée rendue, focus rendu)', !k.ouverte && k.n === 0 && k.foyer === 'btn-groupe', k);
  } else { await S.page.keyboard.press('Escape'); await dormir(600); }
}

/* ══ OUVRIR LE GROUPE QU'ON VIENT DE CRÉER ═══════════════════════════════════════════════════════════════════════════════════ */
async function etapeGroupeCree(S) {
  const nom = S.nom;
  titre(nom + ' — ouvrir le groupe qu\'on vient de créer');
  await S.page.locator('#recherche-conv').fill('Équipe terrain'); await dormir(200);
  await geste(S, '#liste-conv [data-ouvrir]'); const ok = await attendreConv(S, 'Équipe terrain (4)'); await dormir(500);
  const g = await S.page.evaluate(() => { const q = s => [...document.querySelectorAll(s)]; return { titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), systeme: q('.systeme').map(e => e.textContent), nb: q('#conv-messages .msg').length, datage: q('.datage').map(e => e.textContent), avatar: document.querySelector('#conv-titre .avatar').style.backgroundImage.slice(0, 9),
    compo: !document.getElementById('compo').hidden, point: !!document.querySelector('#liste-conv .point') }; });
  v(nom + ' : le groupe créé s\'ouvre — « ' + g.titre + ' », sa photo dans la barre, le message système « ' + g.systeme[0] + ' », daté « ' + g.datage[0] + ' », lu (plus de point)', ok && g.titre === 'Équipe terrain (4)' && g.systeme.join() === 'Vous avez créé le groupe · Camille, Inès, Mathis' && g.nb === 0 && /^Aujourd'hui \d\d:\d\d$/.test(g.datage[0]) && g.avatar === 'url("blob' && g.compo, g);
  await contraste(S, '.systeme', { nom: 'message système (11 px)' });
  await envoyerTexte(S, 'Premier message du nouveau groupe');
  const e = await S.page.evaluate(() => ({ n: document.querySelectorAll('#conv-messages .msg').length, nom: document.querySelector('#liste-conv li:first-child .conv-nom').textContent }));
  v(nom + ' : on peut y écrire (le groupe reste en tête de la liste)', e.n === 1 && e.nom === 'Équipe terrain (4)', e);
  await fermerConv(S);
  await S.page.locator('#recherche-conv').fill(''); await dormir(100);
}

/* ══ UN LIEN DIRECT, UNE CONVERSATION INCONNUE ═══════════════════════════════════════════════════════════════════════════════ */
async function etapeLiens(b, base, pf, nom) {
  titre(nom + ' — liens directs');
  let S = await ouvrirPage(b, pf, { base, url: PAGE_URL + '#messages/v3' });
  const ok = await attendreConv(S, 'Chantier Les Tilleuls'); await dormir(500);
  const h = await hist(S);
  v(nom + ' : un lien direct #messages/v3 ouvre la conversation (' + (ok ? 'ouverte' : 'PAS ouverte') + ', n = ' + h.n + ')', ok && h.conv === '1' && h.n === 0, h);
  await fermerConv(S);
  const h2 = await hist(S);
  v(nom + ' : arrivé par un lien (aucune entrée à rendre), le retour REMPLACE la route au lieu de quitter la page (adresse ' + h2.hash + ', la page est toujours là)', !h2.conv && h2.hash === '#messages' && (await S.page.evaluate(() => /index\.html$/.test(location.pathname))), h2);
  v(nom + ' : lien direct — 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
  S = await ouvrirPage(b, pf, { base, url: PAGE_URL + '#messages/zzz' });
  await dormir(700);
  const i = await S.page.evaluate(() => ({ conv: document.documentElement.dataset.conv || null, hash: location.hash, mot: document.getElementById('mot').classList.contains('on') ? document.getElementById('mot').textContent : null, liste: document.querySelectorAll('#liste-conv .conv').length }));
  v(nom + ' : une conversation inconnue (#messages/zzz) retombe sur la liste et le DIT (« ' + i.mot + ' »)', !i.conv && i.hash === '#messages' && /n'existe plus/.test(i.mot || '') && i.liste === 6, i);
  v(nom + ' : conversation inconnue — 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ LE MICRO REFUSÉ, LE MICRO ABSENT : une phrase claire, jamais une erreur, jamais un bouton muet ═══════════════════════════════ */
async function etapeMicroIndisponible(b, base, pf, nom, cas) {
  titre(nom + ' — micro ' + cas.nom);
  const S = await ouvrirPage(b, pf, { base, permissions: cas.permissions });
  S.nom = nom;
  if (cas.refuser) { const cb = await b.newBrowserCDPSession(); await cb.send('Browser.setPermission', { permission: { name: 'microphone' }, setting: 'denied', origin: base }); }
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  const n0 = await nb(S, '#conv-messages .msg');
  let bon = 0;
  for (let essai = 1; essai <= 2; essai++) {
    await geste(S, '#compo-micro'); await attendre(S, () => !document.getElementById('avis').hidden, null, 5000); await dormir(250);
    const r = await S.page.evaluate(() => ({ avis: document.getElementById('avis').hidden ? null : document.getElementById('avis').textContent, enreg: !document.getElementById('enreg').hidden, compo: !document.getElementById('compo').hidden, pistes: window.__micro.pistes.length, demandes: window.__micro.demandes, n: document.querySelectorAll('#conv-messages .msg').length, micro: !document.getElementById('compo-micro').hidden }));
    const ok = cas.attendu.test(r.avis || '') && !r.enreg && r.compo && r.pistes === 0 && r.n === n0 && r.micro;
    if (ok) bon++;
    v(nom + ' : micro ' + cas.nom + ', essai ' + essai + ' — le toucher dit « ' + r.avis + ' », la barre d\'enregistrement n\'apparaît pas, aucun message n\'est créé, le bouton répond encore (demandes au navigateur : ' + r.demandes + ')', ok, r);
    await S.page.evaluate(() => { document.getElementById('avis').hidden = true; });
  }
  v(nom + ' : (population) 2 essais joués, ' + bon + ' propres — 0 erreur JavaScript, 0 rejet, 0 erreur console', bon === 2 && S.erreurs.length === 0 && S.console.length === 0 && (await S.page.evaluate(() => window.__rejets.length)) === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ LES RÉGLAGES DE L'APPAREIL : mouvement réduit, transparence réduite ═════════════════════════════════════════════════════ */
async function etapeReglages(b, base) {
  titre('mouvement réduit et transparence réduite (iPhone, nuit)');
  const pf = PROFILS.iphone;
  const S = await ouvrirPage(b, pf, { base, dark: true, mouvementReduit: true, media: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  S.nom = 'iPhone réglages';
  const r = await S.page.evaluate(() => ({ mouvement: matchMedia('(prefers-reduced-motion: reduce)').matches, transparence: matchMedia('(prefers-reduced-transparency: reduce)').matches }));
  v('mouvement réduit : l\'appareil le demande (' + r.mouvement + ')', r.mouvement);
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  const a = await S.page.evaluate(() => { const pts = [...document.querySelectorAll('.saisie-ind i')]; return { n: pts.length, anim: pts.map(p => getComputedStyle(p).animationName), conv: getComputedStyle(document.getElementById('conv-ecran')).animationName, tr: getComputedStyle(document.querySelector('.tabs-bulle')).transitionDuration }; });
  v('mouvement réduit : l\'indicateur de saisie ne bouge plus (' + a.n + ' points, animation « ' + a.anim.join(', ') + ' »), l\'écran ne glisse plus (« ' + a.conv + ' »), les transitions sont à 0 s', a.n === 3 && a.anim.every(x => x === 'none') && a.conv === 'none' && /^0s/.test(a.tr), a);
  await envoyerTexte(S, 'sans une seule animation');
  const m = await S.page.evaluate(() => ({ n: document.querySelectorAll('#conv-messages .msg').length, bas: (f => f.scrollHeight - f.scrollTop - f.clientHeight)(document.getElementById('conv-fil')) }));
  v('mouvement réduit : le parcours marche quand même (message envoyé, ' + m.n + ' messages, calé en bas)', m.n === 7 && m.bas < 2, m);
  if (r.transparence) {
    const t = await S.page.evaluate(() => ['.conv-nav', '.composer'].map(s => { const c = getComputedStyle(document.querySelector(s)); return { s, bf: c.backdropFilter, bg: c.backgroundColor }; }));
    v('transparence réduite : plus de flou ET une matière pleine à la place (' + t.map(x => x.s + ' ' + x.bf + ' ' + x.bg).join(' · ') + ')', t.every(x => x.bf === 'none' && /^rgb\(/.test(x.bg)), t);
    await contraste(S, '.bulle.recue', { nom: 'bulle reçue en transparence réduite' });
  } else info('ce Chromium ne connaît pas prefers-reduced-transparency : la règle est gardée par le texte (test-856), pas par la mesure');
  v('réglages de l\'appareil : 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ TOURNER, REDIMENSIONNER : 390 → 1 440 → 390 avec une conversation ouverte et un brouillon ════════════════════════════════ */
async function etapeRedimension(b, base) {
  titre('redimensionner en conversation ouverte : 390 → 1 099 → 1 100 → 1 440 → 390');
  const pf = { nom: 'fenêtre 390', w: 390, h: 844, dpr: 1, mobile: false, insets: null };
  const S = await ouvrirPage(b, pf, { base });
  S.nom = pf.nom;
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  await S.page.locator('#saisie').fill('brouillon pendant la rotation'); S.gestes++;
  let cases = 0, passages = 0;
  for (const [w, h, attendu] of [[1099, 800, 'remplace'], [1100, 800, 'maitre-detail'], [1440, 900, 'maitre-detail'], [820, 1180, 'recouvre'], [390, 844, 'recouvre']]) {
    await S.page.setViewportSize({ width: w, height: h }); await dormir(700); passages++;
    S.pf = Object.assign({}, pf, { w, h });
    const r = await S.page.evaluate(() => { const c = document.getElementById('conv-ecran').getBoundingClientRect(), l = document.getElementById('contenu').getBoundingClientRect();
      return { conv: document.documentElement.dataset.conv, titre: document.querySelector('.conv-titre-nom > span').textContent.trim(), n: document.querySelectorAll('#conv-messages .msg').length, brouillon: document.getElementById('saisie').value, cx: Math.round(c.left), cr: Math.round(c.right), lr: Math.round(l.right), retour: getComputedStyle(document.getElementById('conv-retour')).display, inertListe: document.getElementById('contenu').inert, hn: history.state.n, display: getComputedStyle(document.getElementById('conv-ecran')).display }; });
    const geo = attendu === 'maitre-detail' ? (r.lr <= r.cx + 1 && r.retour === 'none' && !r.inertListe) : attendu === 'remplace' ? (r.cx === 236 && r.retour !== 'none' && r.inertListe) : (r.cx === 0 && r.cr === w && r.retour !== 'none' && r.inertListe);
    const bon = r.conv === '1' && r.titre === 'Équipe dépôt' && r.n === 6 && r.brouillon === 'brouillon pendant la rotation' && r.hn === 1 && r.display !== 'none' && geo;
    if (bon) cases++;
    v('à ' + w + ' px (' + attendu + ') : la conversation est TOUJOURS ouverte (« ' + r.titre + ' », ' + r.n + ' messages, brouillon gardé, entrée d\'historique intacte n = ' + r.hn + '), la mise en page est celle de cette largeur', bon, r);
    await mesurerLargeur(S, w + ' px · redimensionné');
  }
  v('(population) ' + passages + ' largeurs jouées, ' + cases + ' sans défaut — 0 erreur JavaScript, 0 erreur console', cases === passages && S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ LA LISTE REVIENT À LA MÊME HAUTEUR ═════════════════════════════════════════════════════════════════════════════════════════ */
async function etapeDefilement(b, base) {
  titre('la liste revient à la même position de défilement');
  for (const [pf, h] of [[PROFILS.android360, 420], [{ nom: 'bureau 1024', w: 1024, h: 768, dpr: 1, mobile: false, insets: null }, 420]]) {
    const S = await ouvrirPage(b, pf, { base, h }); S.nom = pf.nom + ' (fenêtre de ' + h + ' px)';
    await S.page.evaluate(() => window.scrollTo(0, 99999)); await dormir(300);
    const y0 = await S.page.evaluate(() => ({ y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight }));
    v(S.nom + ' : (population) la liste défile (' + y0.max + ' px à parcourir) et on est descendu à ' + y0.y + ' px', y0.max > 40 && y0.y > 40, y0);
    await geste(S, '#liste-conv [data-ouvrir="v6"]'); await attendreConv(S, 'Hugo Perrin'); await dormir(600);
    const y1 = await S.page.evaluate(() => Math.round(scrollY));
    v(S.nom + ' : la conversation ouverte laisse la liste où elle est (' + y1 + ' px)', Math.abs(y1 - y0.y) <= 1, { y0, y1 });
    /* ce que fait iOS quand le clavier s'ouvre sur le champ : la FENÊTRE est ramenée en haut pendant que la conversation est ouverte. Sans ce geste, la
       position gardée par le navigateur masquait la mémoire de la liste (mutation S04 : la sonde restait verte) */
    await S.page.evaluate(() => window.scrollTo(0, 0)); await dormir(200);
    await fermerConv(S);
    await dormir(300);
    const y2 = await S.page.evaluate(() => Math.round(scrollY));
    v(S.nom + ' : retour à la liste → MÊME position de défilement (' + y0.y + ' px avant, ' + y2 + ' px après)', Math.abs(y2 - y0.y) <= 1, { y0, y2 });
    v(S.nom + ' : 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
    await S.fermer();
  }
}

/* ══ UN TRÈS GRAND ÉCRAN : la liste ne s'étale plus sur 2 268 px ═════════════════════════════════════════════════════════════════ */
async function etapeLarge(b, base) {
  titre('un très grand écran (2 560 × 1 300) : colonnes bornées');
  const pf = { nom: 'bureau 2560', w: 2560, h: 1300, dpr: 1, mobile: false, insets: null };
  const S = await ouvrirPage(b, pf, { base }); S.nom = pf.nom;
  const l = await S.page.evaluate(() => { const r = e => e.getBoundingClientRect(); const row = document.querySelector('#liste-conv .conv'); return { ligne: Math.round(r(row).width), colonne: Math.round(r(document.getElementById('contenu')).width), vide: getComputedStyle(document.getElementById('conv-vide')).display !== 'none' }; });
  v('2 560 px : la liste est une COLONNE (' + l.colonne + ' px, lignes de ' + l.ligne + ' px — plus les 2 268 px d\'avant), le détail attend « Choisissez une conversation »', l.ligne <= 460 && l.colonne <= 460 && l.vide, l);
  await ouvrirConv(S, 'v1', 'Équipe dépôt');
  const c = await S.page.evaluate(() => { const r = e => e.getBoundingClientRect(); const col = r(document.getElementById('conv-messages')), b = [...document.querySelectorAll('.bulle')].map(e => r(e).width); return { col: Math.round(col.width), plus: Math.round(Math.max(...b)), conv: Math.round(r(document.getElementById('conv-ecran')).width), composer: Math.round(r(document.querySelector('.compo-ligne')).width) }; });
  v('2 560 px : la conversation fait ' + c.conv + ' px mais sa colonne de messages est bornée à ' + c.col + ' px (plus large bulle ' + c.plus + ' px), la barre de saisie aussi (' + c.composer + ' px)', c.col <= 860 && c.plus <= 0.781 * c.col && c.composer <= 860, c);
  await mesurerLargeur(S, 'bureau 2560 · conversation');
  await fermerConv(S);
  await geste(S, '#nav-side [data-vue="appels"]'); await dormir(600);
  const a = await S.page.evaluate(() => Math.round(document.querySelector('#vue-appels').getBoundingClientRect().width));
  v('2 560 px : les autres vues (Appels) sont bornées à ' + a + ' px (≤ 1 000)', a <= 1000, a);
  v('2 560 px : 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ LES PLUS LONGUES VALEURS PLAUSIBLES ═════════════════════════════════════════════════════════════════════════════════════════ */
async function etapeStress(b, base, W) {
  titre('valeurs les plus longues plausibles à ' + W + ' px (un nom de groupe de 40 signes, 6 membres)');
  const pf = { nom: 'stress ' + W, w: W, h: 780, dpr: 1, mobile: true, insets: null };
  const S = await ouvrirPage(b, pf, { base }); S.nom = pf.nom;
  await geste(S, '#btn-groupe'); await dormir(700);
  for (const id of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) { await geste(S, '#g-contacts .contact[data-id="' + id + '"]'); await dormir(80); }
  await geste(S, '#g-nom'); await taper(S, 'M'.repeat(40)); await S.page.keyboard.press('Enter');
  await mesurerLargeur(S, 'stress ' + W + ' · feuille, 6 membres, nom de 40 signes');
  await geste(S, '#g-creer'); await dormir(1300);
  await mesurerLargeur(S, 'stress ' + W + ' · liste après Créer');
  const n = await S.page.evaluate(() => { const e = document.querySelector('#liste-conv .conv-nom'); return { t: e.textContent.length, coupe: e.scrollWidth > e.clientWidth, w: e.clientWidth }; });
  v('stress ' + W + ' : le nom de ' + n.t + ' signes est COUPÉ par une ellipse (boîte de ' + n.w + ' px), il ne pousse pas la ligne', n.coupe && n.w > 60, n);
  await geste(S, '#liste-conv [data-ouvrir]'); await attendreConv(S, 'MMMM'); await dormir(500);
  await mesurerLargeur(S, 'stress ' + W + ' · conversation au nom de 40 signes');
  const t = await S.page.evaluate(() => { const e = document.querySelector('.conv-titre-nom > span'); const r = document.querySelector('.conv-titre').getBoundingClientRect(); return { coupe: e.scrollWidth > e.clientWidth, w: Math.round(r.width), centre: Math.abs((r.left + r.width / 2) - innerWidth / 2) < 40 }; });
  v('stress ' + W + ' : le nom de 40 signes est coupé dans la barre (' + t.w + ' px), la barre reste équilibrée', t.coupe && t.centre, t);
  await S.page.locator('#saisie').fill('W'.repeat(300)); S.gestes++;
  await geste(S, '#envoyer'); await dormir(500);
  await mesurerLargeur(S, 'stress ' + W + ' · mot de 300 signes dans la bulle');
  v('stress ' + W + ' : 0 erreur JavaScript, 0 erreur console', S.erreurs.length === 0 && S.console.length === 0, { e: S.erreurs, c: S.console });
  await S.fermer();
}

/* ══ LA FIN D'UN PARCOURS : les comptes ═══════════════════════════════════════════════════════════════════════════════════════════ */
const AUTORISES = new Set(['/apercu/opmessages/index.html', '/apercu/opmessages/source.js', '/icons/opmsg-192.png', '/icons/opmsg-favicon-32.png']);
async function finParcours(S) {
  const nom = S.nom;
  const rej = await S.page.evaluate(() => window.__rejets);
  v(nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.contrastes || 0) + ' contrastes lus au pixel — 0 erreur JavaScript, 0 rejet non rattrapé, 0 erreur console', S.gestes > 40 && S.erreurs.length === 0 && rej.length === 0 && S.console.length === 0, { erreurs: S.erreurs, rejets: rej, console: S.console });
  const dehors = S.reseau.filter(u => !/^http:\/\/127\.0\.0\.1:\d+\//.test(u) && !/^(blob|data):/.test(u));
  const servis = S.reseau.filter(u => /^http:\/\/127\.0\.0\.1:\d+\//.test(u)).map(u => u.replace(/^http:\/\/127\.0\.0\.1:\d+/, ''));
  v(nom + ' : (population) ' + S.reseau.length + ' requêtes vues — ' + dehors.length + ' hors 127.0.0.1 ; les ' + servis.length + ' servies sont les 4 fichiers permis (' + [...new Set(servis)].join(', ') + ')', S.reseau.length >= 3 && dehors.length === 0 && servis.every(u => AUTORISES.has(u)), { dehors, servis });
  await S.fermer();
}

async function parcours(b, base, F, pf, dark) {
  const S = await ouvrirPage(b, pf, { base, dark });
  S.nom = pf.nom + ' ' + (dark ? 'nuit' : 'jour'); S.dark = dark;
  console.log('\n════ ' + S.nom + ' (' + pf.w + '×' + pf.h + ', ' + (pf.mobile ? 'doigt' : 'souris + clavier') + ') ════');
  await etapeListe(S);
  await etapeConversation(S);
  await etapeToutLire(S);
  await etapeSaisie(S);
  await etapePhotos(S, F);
  await etapeVocal(S);
  await etapeRetour(S);
  await etapeEpingles(S);
  await etapeFeuille(S, F);
  await etapeGroupeCree(S);
  await finParcours(S);
}

async function principal() {
  const rapide = process.argv.includes('--rapide');
  const seul = (process.argv.find(a => a.startsWith('--profil=')) || '').slice(9);
  const scenario = (process.argv.find(a => a.startsWith('--seul=')) || '').slice(7);       // un seul scénario hors parcours (pour les mutations)
  const jourSeul = process.argv.includes('--jour');
  if (!fs.existsSync(path.join(RACINE, PAGE_URL))) { console.error('page introuvable : ' + path.join(RACINE, PAGE_URL)); process.exit(2); }
  const srv = await servir(RACINE);
  const b = await lancer(MICRO_FACTICE);
  const t0 = Date.now();
  try {
    const F = await fabriquerFichiers(b, srv.base);
    const plan = scenario ? [] : rapide ? [[PROFILS.iphone, false]] : [
      [PROFILS.iphone, false], [PROFILS.iphone, true], [PROFILS.android412, false], [PROFILS.android412, true], [PROFILS.android360, false], [PROFILS.android360, true],
      [PROFILS.ipad820, false], [PROFILS.ipad820, true], [PROFILS.bureau1024, false], [PROFILS.bureau1024, true], [PROFILS.bureau1440, false], [PROFILS.bureau1440, true]];
    for (const [pf, dark] of plan) { if (seul && !pf.nom.includes(seul)) continue; if (jourSeul && dark) continue; await parcours(b, srv.base, F, pf, dark); }
    const veut = n => scenario ? scenario === n : (!rapide && !seul);
    if (scenario || (!rapide && !seul)) {
      if (veut('liens')) { await etapeLiens(b, srv.base, PROFILS.iphone, 'iPhone 393 jour'); await etapeLiens(b, srv.base, PROFILS.bureau1440, 'bureau 1440 jour'); }
      if (veut('defilement')) await etapeDefilement(b, srv.base);
      if (veut('large')) await etapeLarge(b, srv.base);
      if (veut('redimension')) await etapeRedimension(b, srv.base);
      if (veut('stress')) for (const W of [360, 393, 412]) await etapeStress(b, srv.base, W);
      if (veut('reglages')) await etapeReglages(b, srv.base);
      /* le micro REFUSÉ (la permission est retirée) et le micro ABSENT (aucun périphérique) : deux navigateurs, deux causes réelles */
      if (veut('micro')) {
        /* ⛔ le refus se joue dans un navigateur SANS `--use-fake-ui-for-media-stream` : ce drapeau accorde le micro d'office, par-dessus la permission
           retirée — mesuré le 1er octobre 2026, la barre d'enregistrement apparaissait alors malgré le refus (le micro « refusé » était ACCORDÉ) */
        const b3 = await lancer(['--use-fake-device-for-media-stream']);
        try {
          await etapeMicroIndisponible(b3, srv.base, PROFILS.iphone, 'iPhone 393', { nom: 'refusé', refuser: true, permissions: [], attendu: /refusé/ });
          await etapeMicroIndisponible(b3, srv.base, PROFILS.bureau1440, 'bureau 1440', { nom: 'refusé', refuser: true, permissions: [], attendu: /refusé/ });
        } finally { await b3.close(); }
        const b2 = await lancer(['--use-fake-ui-for-media-stream']);        // aucun périphérique factice : le navigateur ne trouve AUCUN micro
        try { await etapeMicroIndisponible(b2, srv.base, PROFILS.iphone, 'iPhone 393', { nom: 'absent', permissions: ['microphone'], attendu: /Aucun micro/ }); await etapeMicroIndisponible(b2, srv.base, PROFILS.bureau1440, 'bureau 1440', { nom: 'absent', permissions: ['microphone'], attendu: /Aucun micro/ }); } finally { await b2.close(); }
      }
    }
  } finally { await b.close(); srv.fermer(); }
  console.log('\n(durée : ' + Math.round((Date.now() - t0) / 1000) + ' s)');
  console.log('\n═══ sonde-opmessages : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
  process.exit(ko ? 1 : 0);
}

if (require.main === module) principal().catch(e => { console.error('SONDE MORTE :', e); process.exit(2); });
module.exports = { RACINE, PAGE_URL, PROFILS, HEURE_POSEE, servir, lancer, ouvrirPage, geste, lire, dormir, MICRO_FACTICE, ARGS_BASE };
