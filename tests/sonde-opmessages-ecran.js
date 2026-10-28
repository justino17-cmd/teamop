/* ══ SONDE DE BOUT EN BOUT — LE PARTAGE D'ÉCRAN, CHEZ TOUT LE MONDE, AUX PIXELS (Justin, 28 octobre 2026, 21 h 29) ═══════════════════════════════════════════════════════
   « Le partage d'écran marche pas » : Justin partageait, sa fenêtre montrait l'écran, et l'invité (lien, sans compte) ne voyait que deux avatars. Ce n'était pas le réseau : l'image ARRIVAIT (piste vivante, 1280×720,
   images décodées) mais `invite.js` ne lisait pas `partage`, donc la tuile restait en `data-camera="off"` et la vidéo à `opacity:0`. Cette sonde le PROUVE chez les trois sortes de participants, contre le VRAI service
   (`server-msg/index.js`, 127.0.0.1), les VRAIES pages (`index.html`, `invite.html`), de VRAIS navigateurs, le vrai WebRTC en maille (pas de LiveKit ici) :
     · l'ORGANISATEUR (un compte) partage son écran ; un participant CONNECTÉ (Ben) et un INVITÉ sans compte (Paul, par lien, admis à la porte) le voient — et le voient AUX PIXELS : la vidéo a des dimensions, son
       `currentTime` AVANCE, ses pixels ne sont pas noirs (plusieurs couleurs, un écart-type), la TUILE est peinte (`opacity:1`, `data-ecran="1"`) et une capture de la tuile contient le jaune et le bleu de l'écran ;
     · l'écran a la GRANDE place (au moins 55 % de la scène, plus grand que toute autre tuile) et se lit ENTIER (`contain`) : le cadre bleu de la capture a le rapport 16/9, rien n'est rogné ;
     · il disparaît PROPREMENT : au bouton « partage » de la page (tuile normale, plus de grande place, vidéo masquée) comme au « Arrêter le partage » du navigateur (la piste passe à `ended` : l'événement est joué) ;
     · caméra de l'organisateur COUPÉE pendant le partage (le cas de la capture de Justin) : l'écran arrive quand même ;
     · quelqu'un qui ARRIVE pendant le partage le voit aussi — un invité (lien, admis en cours de route) et un connecté ; deux partages successifs marchent, chacun avec ses pixels ;
     · aucune erreur JavaScript, nulle part.
   Limite DITE : il n'y a pas d'écran à capturer en mode sans fenêtre ; `getDisplayMedia` rend donc la piste d'une TOILE qui bouge (un cadre bleu 960×540, un carré jaune qui court, un compteur « ECRAN n »), par le
   même `captureStream` que n'importe quelle piste vidéo. Tout le reste — l'envoi par `replaceTrack`, le service, l'état `partage`, la réception, les tuiles — est le vrai chemin. Un envoi depuis Safari ou la boîte de
   permission « Enregistrement de l'écran » de macOS ne se joue pas ici.
   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre. Tout se passe sur 127.0.0.1.

   Lancer :   NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-opmessages-ecran.js        CAPTURES=/dossier : les écrans aux étapes clés
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const T = require('./outils-msg');
const O = require('./outils-invite');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-opmessages-ecran.js'); process.exit(2); }
}
const CHROME = process.env.CHROME_SONDE || '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
if (DOSSIER) fs.mkdirSync(DOSSIER, { recursive: true });
setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (9 min)'); process.exit(1); }, 540000).unref();

const att = (p, f, a, ms) => p.waitForFunction(f, a, { timeout: ms || 20000 }).then(() => true, () => false);

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
/* ce que la CAPTURE d'une tuile contient : le jaune du carré, le bleu du cadre (et le rapport de sa boîte englobante), la lumière moyenne */
function lireCapture(buf) {
  const { w, h, px, bpp } = lirePng(buf); let jaune = 0, bleu = 0, somme = 0; const col = new Array(w).fill(0), lig = new Array(h).fill(0);
  const proche = (i, r, g, b, tol) => Math.abs(px[i] - r) <= tol && Math.abs(px[i + 1] - g) <= tol && Math.abs(px[i + 2] - b) <= tol;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * bpp; somme += px[i] * .3 + px[i + 1] * .6 + px[i + 2] * .1;
    if (proche(i, 255, 204, 0, 40)) jaune++;
    if (proche(i, 18, 52, 86, 22)) { bleu++; col[x]++; lig[y]++; }
  }
  /* la boîte du cadre bleu : les colonnes (puis les lignes) où le bleu fait plus de 40 % — les coins arrondis de la tuile laissent voir le décor derrière, qui peut être un bleu nuit : un seul point ne fait pas une boîte */
  const xs = col.map((n, x) => n > .4 * h ? x : -1).filter(x => x >= 0); const x0 = xs[0], x1 = xs[xs.length - 1];
  const ys = lig.map((n, y) => n > .4 * (xs.length || 1) ? y : -1).filter(y => y >= 0); const y0 = ys[0], y1 = ys[ys.length - 1];
  return { w, h, jaune, bleu, luma: Math.round(somme / (w * h)), rapport: xs.length && ys.length ? (x1 - x0 + 1) / (y1 - y0 + 1) : 0, boite: [x0, y0, x1, y1] };
}

/* ── un navigateur : la piste d'écran est une toile qui bouge, et les connexions pair à pair sont relevées ── */
async function contexte(b, base, mobile) {
  const c = await b.newContext({ viewport: { width: mobile ? 390 : 1280, height: mobile ? 844 : 800 }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'], baseURL: base, reducedMotion: 'reduce' });
  await c.addInitScript(() => {
    window.__pc = []; window.__ecrans = [];
    const PC = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends PC { constructor(...a) { super(...a); window.__pc.push(this); } };
    if (navigator.mediaDevices) navigator.mediaDevices.getDisplayMedia = async function () {
      const cv = document.createElement('canvas'); cv.width = 960; cv.height = 540; const g = cv.getContext('2d'); let k = 0;     // 16/9, plus léger qu'un 720p : cinq navigateurs encodent et décodent en logiciel sur 4 cœurs partagés
      const d = () => { k++; g.fillStyle = '#123456'; g.fillRect(0, 0, 960, 540); g.fillStyle = '#ffcc00'; g.fillRect(30 + (k * 7) % 750, 75 + (k % 7) * 45, 90, 90); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText('ECRAN ' + k, 75, 450); };
      d(); const tic = setInterval(d, 125);
      const f = cv.captureStream(8), piste = f.getVideoTracks()[0]; window.__ecrans.push(piste);
      const arret = piste.stop.bind(piste); piste.stop = () => { clearInterval(tic); arret(); };
      return f;
    };
  });
  return c;
}
function suivre(page, nom) {
  const S = { page, nom, erreurs: [] };
  page.setDefaultTimeout(45000);
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 200)));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  return S;
}

/* ── ce que UNE page montre de l'écran partagé ──
   `sel` : { scene, tuile } de la page (invité : #grille / #grille .tuile ; connecté : #salle-scene / #salle-scene .salle-tuile). On cherche la tuile marquée `data-ecran="1"` (la page la marque, ou elle ne le fait pas :
   c'est ce que la sonde juge), puis on lit sa vidéo ET on la capture. */
const LIRE = `(sel) => new Promise(async (ok) => {
  const scene = document.querySelector(sel.scene), tuiles = Array.from(document.querySelectorAll(sel.tuile));
  const t = tuiles.find(x => x.dataset.ecran === '1') || null;
  const v = t && t.querySelector('video');
  if (!v) { ok({ scene: !!scene, nTuiles: tuiles.length, tuile: false, grille: scene ? scene.dataset.ecran || null : null }); return; }
  const t0 = v.currentTime; for (let i = 0; i < 40 && !(v.currentTime > t0 + .2); i++) await new Promise(r => setTimeout(r, 150));      // au geste : le temps AVANCE (6 s au plus, sous charge)
  await new Promise(r => setTimeout(r, 250));
  let pixels = null;
  if (v.videoWidth > 0) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 36; const g = c.getContext('2d');
    try { g.drawImage(v, 0, 0, 64, 36); const d = g.getImageData(0, 0, 64, 36).data; let s = 0, s2 = 0, n = 0; const cl = new Set();
      for (let p = 0; p < d.length; p += 4) { const l = d[p] * .3 + d[p + 1] * .6 + d[p + 2] * .1; s += l; s2 += l * l; n++; cl.add((d[p] >> 5) + ',' + (d[p + 1] >> 5) + ',' + (d[p + 2] >> 5)); }
      const m = s / n; pixels = { luma: Math.round(m), ecartType: Math.round(Math.sqrt(Math.max(0, s2 / n - m * m))), couleurs: cl.size }; } catch (e) { pixels = 'err ' + e.message; }
  }
  const r = t.getBoundingClientRect(), rs = scene.getBoundingClientRect(), cs = getComputedStyle(v);
  const autres = tuiles.filter(x => x !== t).map(x => { const q = x.getBoundingClientRect(); return q.width * q.height; });
  ok({ scene: true, nTuiles: tuiles.length, tuile: true, grille: scene.dataset.ecran || null, camera: t.dataset.camera, opacite: cs.opacity, objectFit: cs.objectFit, grand: t.classList.contains('grand'),
    piste: v.srcObject ? v.srcObject.getVideoTracks().map(p => p.readyState).join() : '', w: v.videoWidth, h: v.videoHeight, avance: v.currentTime > t0, paused: v.paused, pixels,
    part: Math.round(100 * (r.width * r.height) / Math.max(1, rs.width * rs.height)), largeurPart: Math.round(100 * r.width / Math.max(1, rs.width)), plusGrande: autres.every(a => r.width * r.height > a), nAutres: autres.length });
})`;
const lire = (S, sel) => S.page.evaluate(`(${LIRE})(${JSON.stringify(sel)})`);
async function pixelsPeints(S, sel, nom) {
  /* une capture par `clip` (le rectangle de la tuile), sans l'attente de « stabilité » d'une capture d'élément : sous charge (d'autres sessions tournent sur la machine) elle n'aboutissait pas en 20 s */
  const r = await S.page.evaluate((s) => { const t = Array.from(document.querySelectorAll(s)).find(x => x.dataset.ecran === '1'); if (!t) return null; const q = t.getBoundingClientRect(); return { x: Math.max(0, Math.floor(q.x)), y: Math.max(0, Math.floor(q.y)), width: Math.floor(q.width), height: Math.floor(q.height) }; }, sel.tuile);
  if (!r || r.width < 10 || r.height < 10) return null;
  const buf = await S.page.screenshot({ clip: r, animations: 'allow', timeout: 60000 });
  if (DOSSIER && nom) fs.writeFileSync(path.join(DOSSIER, nom + '.png'), buf);
  return lireCapture(buf);
}
const SEL_INVITE = { scene: '#grille', tuile: '#grille .tuile' }, SEL_CONNECTE = { scene: '#salle-scene', tuile: '#salle-scene .salle-tuile' };

/* ce qu'on exige d'une page qui MONTRE l'écran : une série de contrôles, chacun nommé pour qui il parle */
async function exigerEcran(S, sel, qui, nomCapture, o) {
  o = o || {};
  const arrive = await att(S.page, (a) => { const t = Array.from(document.querySelectorAll(a.tuile)).find(x => x.dataset.ecran === '1'); const vd = t && t.querySelector('video'); return !!(vd && vd.videoWidth > 0 && vd.readyState >= 2); }, sel, 25000);
  vrai(qui + ' : la tuile de l\'écran existe (data-ecran=1) et sa vidéo a des dimensions', arrive);
  if (!arrive) {      // une mesure qui échoue DIT pourquoi : les tuiles telles que la page les montre, leurs vidéos, les liaisons
    console.log('      ' + qui + ' — tuiles : ' + JSON.stringify(await S.page.evaluate((a) => Array.from(document.querySelectorAll(a.tuile)).map(t => ({ uid: (t.dataset.uid || '').slice(0, 6), cam: t.dataset.camera, ecr: t.dataset.ecran, cls: t.className, w: (t.querySelector('video') || {}).videoWidth, src: !!(t.querySelector('video') || {}).srcObject })), sel)));
    console.log('      ' + qui + ' — liaisons : ' + JSON.stringify(await S.page.evaluate(() => window.__pc.map(p => p.connectionState + '/' + p.iceConnectionState))));
    if (DOSSIER) await S.page.screenshot({ path: path.join(DOSSIER, 'echec-' + S.nom + '.png') });
  }
  const m = await lire(S, sel);
  vrai(qui + ' : population — ' + m.nTuiles + ' tuile(s) dans la scène, dont celle de l\'écran', m.scene && m.tuile && m.nTuiles >= 2);
  if (!m.tuile) return m;
  v(qui + ' : la piste reçue est vivante', m.piste.split(',').includes('live'), true);
  vrai(qui + ' : la vidéo mesure ' + m.w + '×' + m.h + ' (> 0) et son currentTime AVANCE', m.w > 0 && m.h > 0 && m.avance);
  vrai(qui + ' : les pixels de la vidéo ne sont pas noirs (luma ' + (m.pixels && m.pixels.luma) + ', ' + (m.pixels && m.pixels.couleurs) + ' couleurs, écart-type ' + (m.pixels && m.pixels.ecartType) + ')', !!m.pixels && typeof m.pixels === 'object' && m.pixels.couleurs >= 6 && m.pixels.ecartType >= 10);
  v(qui + ' : ⛔ la tuile est PEINTE (data-camera on, vidéo à opacity 1)', [m.camera, m.opacite], ['on', '1']);
  v(qui + ' : l\'écran se lit ENTIER (object-fit contain)', m.objectFit, 'contain');
  vrai(qui + ' : la grande place — ' + m.part + ' % de la scène, ' + m.largeurPart + ' % de sa largeur, plus grande que chacune des ' + m.nAutres + ' autre(s)' + (m.nAutres ? '' : ' (aucune autre)'), m.largeurPart >= 55 && (m.nAutres === 0 || m.plusGrande));
  if (o.grand) vrai(qui + ' : la page la marque « grand »', m.grand);
  const c = await pixelsPeints(S, sel, nomCapture);
  vrai(qui + ' : la CAPTURE de la tuile (' + (c && c.w) + '×' + (c && c.h) + ') contient le jaune (' + (c && c.jaune) + ' px) et le bleu (' + (c && c.bleu) + ' px) de l\'écran, lumière ' + (c && c.luma), !!c && c.jaune > 150 && c.bleu > 3000 && c.luma > 20);
  vrai(qui + ' : le cadre bleu de la capture est du 16/9 (' + (c && c.rapport.toFixed(2)) + ') — l\'écran n\'est pas rogné', !!c && c.rapport > 1.7 && c.rapport < 1.85);
  return m;
}
/* ce qu'on exige d'une page où plus personne ne partage */
async function exigerPlusEcran(S, sel, qui) {
  const ok = await att(S.page, (a) => !Array.from(document.querySelectorAll(a.tuile)).some(x => x.dataset.ecran === '1'), sel);
  vrai(qui + ' : plus aucune tuile « écran »', ok);
  const m = await S.page.evaluate((a) => {
    const sc = document.querySelector(a.scene), ts = Array.from(document.querySelectorAll(a.tuile));
    return { n: ts.length, grille: sc && sc.dataset.ecran || null, camerasOn: ts.filter(t => t.dataset.camera === 'on' && !t.querySelector('video').srcObject).length,
      visiblesSansCamera: ts.filter(t => { if (t.dataset.camera !== 'off') return false; const cs = getComputedStyle(t.querySelector('video')); return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0'; }).length };
  }, sel);
  vrai(qui + ' : population — ' + m.n + ' tuiles', m.n >= 2);
  vrai(qui + ' : la scène n\'est plus en partage (' + m.grille + ')', m.grille !== '1');
  v(qui + ' : aucune vidéo visible sur une tuile « sans caméra » (l\'écran disparu ne reste pas peint)', m.visiblesSansCamera, 0);
}

(async () => {
  const B = await O.monter(); const { svc, S, pers, cl } = B;
  const b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  const toutes = [];
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'); const jA = O.jetonCompte(), jB = O.jetonCompte(), jC = O.jetonCompte();
    S.sessionAjouter({ h: B.sha(jA), personne: ana.id, appareil: null, ttlMs: 86400000 }); S.sessionAjouter({ h: B.sha(jB), personne: ben.id, appareil: null, ttlMs: 86400000 }); S.sessionAjouter({ h: B.sha(jC), personne: cleo.id, appareil: null, ttlMs: 86400000 });
    const a1 = cl(ana);
    if (S.contactLier) { S.contactLier(ana.id, ben.id); S.contactLier(ana.id, cleo.id); }
    const rid = await B.programmer(a1, { titre: 'teste', invites: [ben.id, cleo.id], salle_attente: false });
    const lienJ = await B.lien(a1, rid), base = svc.base;
    const ouvrir = async (cookie, nom) => { const c = await contexte(b, base); if (cookie) await c.addCookies([{ name: 'opm', value: cookie, url: base }]); const s = suivre(await c.newPage(), nom); toutes.push(s); return s; };
    const H = await ouvrir(jA, 'organisateur');

    /* ─ les gestes ─ */
    const entrerConnecte = async (X) => {
      await X.page.goto(base + '/#reunions');
      await att(X.page, () => document.querySelector('#liste-reunions [data-reunion]'));
      await X.page.click('#liste-reunions [data-reunion]');
      await att(X.page, () => document.querySelector('#info-corps [data-reu="rejoindre"]'));
      await X.page.click('#info-corps [data-reu="rejoindre"][data-type="video"]').catch(() => X.page.click('#info-corps [data-reu="rejoindre"]'));
      await att(X.page, () => document.getElementById('avant-rejoindre'));
      /* le bouton est touché dans la page (`click()`) : un navigateur affamé n'aboutit pas à l'attente de « stabilité » de Playwright (deux trames identiques), et ce n'est pas ce que la sonde juge */
      await X.page.evaluate(() => document.getElementById('avant-rejoindre').click());
      return att(X.page, () => !document.getElementById('salle-ecran').hidden);
    };
    const entrerInvite = async (X, nom) => {
      await X.page.goto(lienJ.startsWith('http') ? lienJ : base + '/invite.html#i=' + lienJ);
      await att(X.page, () => !document.getElementById('p-identite').hidden);
      await X.page.fill('#c-nom', nom); await X.page.fill('#c-ent', 'Durand'); await X.page.click('#b-continuer');
      await att(X.page, () => !document.getElementById('p-prepa').hidden); await X.page.click('#b-entrer');
      await att(X.page, () => !document.getElementById('p-attente').hidden);
      await att(H.page, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent));
      await H.page.click('#salle-participants'); await att(H.page, () => document.querySelector('.salle-rang [data-sa="admettre"]'));
      await H.page.click('.salle-rang [data-sa="admettre"]');
      const ok = await att(X.page, () => !document.getElementById('p-salle').hidden && document.querySelectorAll('#grille .tuile').length >= 2);
      await H.page.keyboard.press('Escape');
      return ok;
    };
    const partager = async (actif) => {
      const etat = () => H.page.evaluate(() => document.getElementById('salle-partage').getAttribute('aria-pressed') === 'true');
      if ((await etat()) !== actif) await H.page.click('#salle-partage');
      return att(H.page, (a) => (document.getElementById('salle-partage').getAttribute('aria-pressed') === 'true') === a, actif);
    };
    const camera = async (allumee) => {
      const lit = () => H.page.evaluate(() => document.getElementById('salle-cam').getAttribute('aria-pressed') !== 'true');
      if ((await lit()) !== allumee) await H.page.click('#salle-cam');
      await att(H.page, (a) => (document.getElementById('salle-cam').getAttribute('aria-pressed') !== 'true') === a, allumee);
    };

    /* ═══ 1. LA SALLE : l'organisateur, un connecté (Ben), un invité sans compte (Paul) ═══ */
    console.log('1. l\'organisateur ouvre la salle ; Ben (connecté) et Paul (invité par lien, admis à la porte) entrent');
    await H.page.goto(base + '/#reunions/' + rid);
    await att(H.page, () => document.querySelector('#info-corps [data-reu="rejoindre"]'));
    await H.page.click('#info-corps [data-reu="rejoindre"][data-type="video"]').catch(() => H.page.click('#info-corps [data-reu="rejoindre"]'));
    await att(H.page, () => document.getElementById('avant-rejoindre')); await H.page.click('#avant-rejoindre');
    vrai('l\'organisateur est dans la salle', await att(H.page, () => !document.getElementById('salle-ecran').hidden));
    const Bn = await ouvrir(jB, 'Ben'); const I = await ouvrir(null, 'Paul');
    vrai('Ben est dans la salle', await entrerConnecte(Bn));
    vrai('Paul (invité) est dans la salle, deux tuiles au moins', await entrerInvite(I, 'Paul'));
    vrai('avant tout partage, la salle de l\'invité montre ses tuiles à plat : population ' + await I.page.evaluate(() => document.querySelectorAll('#grille .tuile').length) + ' tuile(s)', await att(I.page, () => document.querySelectorAll('#grille .tuile').length >= 3));
    await exigerPlusEcran(I, SEL_INVITE, 'AVANT — invité');
    await exigerPlusEcran(Bn, SEL_CONNECTE, 'AVANT — Ben');

    /* ═══ 2. PREMIER PARTAGE, caméra allumée ═══ */
    console.log('2. l\'organisateur partage son écran (caméra allumée)');
    vrai('le partage démarre chez l\'organisateur', await partager(true));
    await exigerEcran(I, SEL_INVITE, 'invité', '2-invite-partage');
    if (DOSSIER) await I.page.screenshot({ path: path.join(DOSSIER, '2-invite-page-entiere.png') }).catch(() => {});
    await exigerEcran(Bn, SEL_CONNECTE, 'Ben (connecté)', '2-ben-partage', { grand: true });
    vrai('organisateur : sa propre vignette montre son écran (data-ecran=1, vidéo avec des dimensions)', await att(H.page, () => { const t = document.querySelector('#salle-scene .salle-tuile.vous[data-ecran="1"]'); const vd = t && t.querySelector('video'); return !!(vd && vd.videoWidth > 0); }));
    const hp = await pixelsPeints(H, { tuile: '#salle-scene .salle-tuile' }, '2-orga-partage');
    vrai('organisateur : la capture de sa vignette contient l\'écran partagé (jaune ' + (hp && hp.jaune) + ' px, bleu ' + (hp && hp.bleu) + ' px)', !!hp && hp.jaune > 100 && hp.bleu > 1000);

    /* ═══ 3. ARRÊT PAR LE BOUTON DE LA PAGE ═══ */
    console.log('3. l\'organisateur arrête le partage (bouton de la page)');
    vrai('le partage est arrêté chez l\'organisateur', await partager(false));
    await exigerPlusEcran(I, SEL_INVITE, 'invité');
    await exigerPlusEcran(Bn, SEL_CONNECTE, 'Ben');

    /* ═══ 4. DEUXIÈME PARTAGE, caméra COUPÉE (le cas de la capture de Justin) ═══ */
    console.log('4. deuxième partage de suite, caméra de l\'organisateur COUPÉE');
    await camera(false);
    vrai('l\'organisateur a coupé sa caméra', await H.page.evaluate(() => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'true'));
    vrai('le deuxième partage démarre', await partager(true));
    await exigerEcran(I, SEL_INVITE, 'invité (caméra coupée)', '4-invite-partage-camera-coupee');
    await exigerEcran(Bn, SEL_CONNECTE, 'Ben (caméra coupée)', '4-ben-partage-camera-coupee', { grand: true });

    /* ═══ 5. ARRÊT PAR LE NAVIGATEUR (« Arrêter le partage » : la piste passe à ended) ═══ */
    console.log('5. « Arrêter le partage » du navigateur : la piste d\'écran se termine');
    const fini = await H.page.evaluate(() => { const p = window.__ecrans[window.__ecrans.length - 1]; if (!p) return 'aucune piste d\'écran'; p.stop(); p.dispatchEvent(new Event('ended')); return p.readyState; });
    v('population : la piste d\'écran du 2ᵉ partage existe et se termine', fini, 'ended');
    vrai('la page de l\'organisateur retombe d\'elle-même (bouton non appuyé)', await att(H.page, () => document.getElementById('salle-partage').getAttribute('aria-pressed') !== 'true'));
    await exigerPlusEcran(I, SEL_INVITE, 'invité');
    await exigerPlusEcran(Bn, SEL_CONNECTE, 'Ben');

    /* Paul et Ben ont tout vu : leurs navigateurs se ferment (cinq pages qui décodent de la vidéo en logiciel affament la machine), les arrivants du pas suivant sont jugés seuls avec l'organisateur */
    await Bn.page.context().close(); await I.page.context().close();
    /* ═══ 6. DES ARRIVANTS EN COURS DE PARTAGE : un invité (Léa) et un connecté (Cléo) ═══ */
    console.log('6. Paul et Ben partent ; il partage de nouveau (3ᵉ fois, caméra rallumée) ; Léa (invitée par lien) et Cléo (connectée) ARRIVENT pendant le partage');
    await camera(true);
    vrai('le troisième partage démarre', await partager(true));
    const L = await ouvrir(null, 'Lea'); const Cl = await ouvrir(jC, 'Cleo');
    vrai('Léa (invitée) entre pendant le partage', await entrerInvite(L, 'Léa'));
    vrai('Cléo (connectée) entre pendant le partage', await entrerConnecte(Cl));
    await exigerEcran(L, SEL_INVITE, 'invitée ARRIVÉE pendant le partage', '6-invitee-arrivee-en-partage');
    await exigerEcran(Cl, SEL_CONNECTE, 'Cléo ARRIVÉE pendant le partage', '6-cleo-arrivee-en-partage', { grand: true });
    vrai('le partage s\'arrête', await partager(false));
    for (const [X, sel, q] of [[L, SEL_INVITE, 'Léa'], [Cl, SEL_CONNECTE, 'Cléo']]) await exigerPlusEcran(X, sel, 'fin — ' + q);

    /* ═══ 7. AUCUNE ERREUR ═══ */
    console.log('7. aucune erreur JavaScript');
    vrai('population : ' + toutes.length + ' pages observées', toutes.length === 5);
    for (const X of toutes) v(X.nom + ' : aucune erreur JavaScript', X.erreurs, []);
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await b.close(); } catch (e) { /* déjà */ } await B.arreter(); }
  fin();
})();
