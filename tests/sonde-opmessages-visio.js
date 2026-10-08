/* ══ SONDE DE BOUT EN BOUT — LA SALLE PAR LE SERVEUR DE VISIO (LiveKit) : LA VRAIE PAGE SERVIE, DE VRAIS NAVIGATEURS, LE VRAI SERVICE, LE VRAI LIVEKIT ══════════════════════════════════════════════════════
   `test-952` à `test-954` éprouvent le service et le module ; cette sonde joue la VRAIE PAGE (`server-msg/public/`) dans deux navigateurs Chromium (trois téléphones de 390 px au doigt, trois bureaux à la souris)
   contre le VRAI service et le VRAI LiveKit (la version épinglée, construite depuis ses sources : `LIVEKIT_SERVER_BIN`), ses avis branchés sur le service. Le micro est une tonalité de 440 Hz, la caméra un damier.

   Ce qu'elle prouve, et que rien d'autre ne peut prouver :
     · ⛔ SIX personnes en vidéo dans UNE salle (la maille en refuse une cinquième) : chaque page reçoit l'image décodée et la voix des cinq autres, par UNE connexion au serveur de visio (deux voies : une qui
       envoie, une qui reçoit) — jamais cinq liaisons ; ce qu'une page ENVOIE ne grandit pas avec le nombre de personnes ;
     · la vue le dit (« par le serveur de visio »), qui parle s'allume et s'éteint, le partage d'écran d'un bureau remplace sa caméra chez les autres ;
     · ⛔ l'hôte RETIRE quelqu'un : sa page quitte la salle ET sa connexion au serveur de visio se ferme (il ne reçoit plus rien) ; « Terminer pour tous » ferme tout ;
     · aucune erreur JavaScript, aucun texte « undefined ».
   ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre. ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION.
   Tout se passe sur 127.0.0.1 ; deux navigateurs, tués à la fin (même sur erreur).

   Lancer :   LIVEKIT_SERVER_BIN=/chemin/livekit-server NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-visio.js
              CAPTURES=/dossier   (les écrans côte à côte aux étapes clés)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de LiveKit, pas de dépendances du service). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const BIN = process.env.LIVEKIT_SERVER_BIN;
if (!BIN || !fs.existsSync(BIN)) { console.error('Sonde non lançable : LIVEKIT_SERVER_BIN ne désigne pas le binaire de LiveKit.'); process.exit(2); }
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PROFILS = {
  telephone: { nom: 'iPhone 390', w: 390, h: 844, dpr: 2, mobile: true, ua: UA_IPHONE },
  bureau: { nom: 'bureau 1280', w: 1280, h: 800, dpr: 1, mobile: false, ua: null },
};
const LOGINS = ['ana', 'ben', 'cleo', 'dan', 'eve', 'fay'];
const MOTS = Object.fromEntries(LOGINS.map(l => [l, 'pw-' + l + '-123456789'.slice(0, 13 - l.length)]));
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc', dan: 'Dan Banc', eve: 'Eve Banc', fay: 'Fay Banc' };

function ecrireTonalite(dir) {
  const sr = 48000, n = sr * 2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / sr) * 12000), 44 + i * 2);
  const f = path.join(dir, 'tonalite-440.wav'); fs.writeFileSync(f, buf); return f;
}

/* une page : un contexte NEUF par personne ; on compte les connexions WebRTC que la page ouvre (celles de LiveKit comprises) et ce qu'elles reçoivent et envoient */
async function ouvrir(b, base, pf, o) {
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, userAgent: pf.ua || undefined,
    colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera'], baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  /* ⛔ LA MÉTA DE LA PAGE permet `wss:` (la visio de production ; `https:` en est sorti le 8 octobre — la lecture de `/rtc/validate` est sur l'origine du service) ; cette sonde sert LiveKit en `ws://` sur la
     boucle locale (pas de certificat ici) : elle n'élargit QUE la méta, à l'adresse exacte de son LiveKit. L'EN-TÊTE que pose le service, lui, est celui de la production — il nomme l'adresse de la visio et rien
     d'autre (vérifié au bloc 1). ⛔ Le remplacement doit TROUVER sa cible : quand la méta a changé, il ne trouvait plus rien, la page refusait LiveKit et la sonde accusait la visio (8 octobre 2026). */
  if (o.visioLocale) await page.route((u) => u.pathname === '/' || u.pathname === '/index.html', async (route) => {
    const r = await route.fetch(); let html = await r.text();
    const cible = "connect-src 'self' wss:;";
    if (!html.includes(cible)) throw new Error('la méta de la page a changé : « ' + cible + ' » introuvable — la sonde ne peut pas y ajouter son LiveKit local');
    html = html.replace(cible, "connect-src 'self' wss: " + o.visioLocale + ' ' + o.visioLocale.replace(/^ws/, 'http') + ';');
    await route.fulfill({ response: r, body: html });
  });
  const S = { ctx, page, pf, nom: o.nom, login: o.login, base, erreurs: [], console: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('console', m => { if (m.type() !== 'error') return; let u = ''; try { u = /Failed to load resource/.test(m.text()) ? ' [' + new URL(m.location().url).pathname + ']' : ''; } catch (e) { /* sans adresse */ } S.console.push((m.text().replace(/access_token=[A-Za-z0-9._-]+/g, 'access_token=…') + u).slice(0, 240)); });
  await page.addInitScript(() => {
    window.__pcs = []; window.__media = 0; window.__ecrans = 0;
    try {
      const md = navigator.mediaDevices, g = md.getUserMedia.bind(md);
      md.getUserMedia = async function (c) { window.__media++; return g(c); };
      md.getDisplayMedia = async function () {
        window.__ecrans++;
        const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g2 = cv.getContext('2d'); let k = 0;
        const dessiner = () => { k++; g2.fillStyle = '#123456'; g2.fillRect(0, 0, 1280, 720); g2.fillStyle = '#ffcc00'; g2.fillRect((k * 9) % 1200, 100 + (k % 7) * 60, 80, 80); };
        dessiner(); const iv = setInterval(dessiner, 100);
        const f = cv.captureStream(10); f.getTracks().forEach(t => { const arret = t.stop.bind(t); t.stop = function () { clearInterval(iv); arret(); }; });
        return f;
      };
    } catch (e) { /* rien */ }
    const PC = window.RTCPeerConnection;
    if (PC) {
      const Faux = function (...a) { const pc = new PC(...a); window.__pcs.push(pc); return pc; };
      Faux.prototype = PC.prototype; Object.setPrototypeOf(Faux, PC); window.RTCPeerConnection = Faux;
    }
    /* les octets reçus et envoyés, toutes connexions ouvertes confondues ; les images décodées */
    window.__vivante = (pc) => pc.signalingState !== 'closed' && (pc.connectionState === 'connected' || pc.connectionState === 'connecting');
    window.__bilan = async () => {
      const o = { ouvertes: 0, audioRecu: 0, videoRecu: 0, images: 0, emis: 0, pistesRecues: 0, creees: window.__pcs.length };
      for (const pc of window.__pcs) {
        if (!window.__vivante(pc)) continue;
        o.ouvertes++;
        let r; try { r = await pc.getStats(); } catch (e) { continue; }
        r.forEach(s => {
          if (s.type === 'inbound-rtp' && s.kind === 'audio') { o.audioRecu += s.bytesReceived || 0; o.pistesRecues++; }
          if (s.type === 'inbound-rtp' && s.kind === 'video') { o.videoRecu += s.bytesReceived || 0; o.images += s.framesDecoded || 0; o.pistesRecues++; }
          if (s.type === 'outbound-rtp') o.emis += s.bytesSent || 0;
        });
      }
      return o;
    };
  });
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
async function attendre(S, fn, arg, ms) { try { await S.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 60 }); return true; } catch (e) { return false; } }
async function verifier(titre, S, fn, arg, ms, ceQuOnVoit) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else { const vu = ceQuOnVoit ? await ceQuOnVoit().catch(() => '?') : ''; v(titre, 'non vu à temps (' + (ms || 12000) + ' ms)' + (vu ? ' ; vu : ' + vu : ''), 'vu'); }
  return ok;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
async function connecter(S) {
  await S.page.goto(S.base + '/');
  await S.page.locator('#c-login').fill(S.login); await S.page.locator('#c-pass').fill(MOTS[S.login]);
  await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
}
const tuiles = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]')).map(t => {
  const vd = t.querySelector('video');
  return { uid: t.dataset.uid, camera: t.dataset.camera, parle: t.classList.contains('parle'), w: vd ? vd.videoWidth : 0, h: vd ? vd.videoHeight : 0, t: vd ? vd.currentTime : 0, pret: vd ? vd.readyState : 0 };
}));
const bilan = (S) => S.page.evaluate(() => window.__bilan());
async function capturer(b, nom, personnes) {
  if (!DOSSIER_CAPTURES) return;
  fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true });
  /* une capture n'est qu'un témoin : sous la charge de six pages qui décodent cinq vidéos chacune, elle peut tarder — elle ne fait jamais tomber la sonde */
  for (const S of personnes) await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '-' + S.login + '.png'), timeout: 30000 }).catch(() => console.log('  (capture « ' + nom + ' » de ' + S.login + ' non prise : trop lente)'));
}

setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (900 s)'); process.exit(1); }, 900000).unref();

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-visio-'));
  const navigateurs = [];
  let og = null, svc = null, lk = null;
  try {
    const tonalite = ecrireTonalite(dir);
    const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio',
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + tonalite, '--autoplay-policy=no-user-gesture-required',
      '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'];

    /* LiveKit : la boucle locale, ses avis vers le service (dont le port est choisi d'avance) */
    const portSvc = await T.portLibre(), portLk = await T.portLibre(), portTcp = await T.portLibre(), portUdp = await T.portLibre();
    const CLE = 'APIsonde' + crypto.randomBytes(3).toString('hex'), SECRET = crypto.randomBytes(36).toString('base64url');
    const conf = ['port: ' + portLk, 'bind_addresses: ["127.0.0.1"]', 'rtc:', '  tcp_port: ' + portTcp, '  udp_port: ' + portUdp, '  use_external_ip: false', '  node_ip: 127.0.0.1',
      'keys:', '  ' + CLE + ': ' + SECRET, 'webhook:', '  api_key: ' + CLE, '  urls:', '    - http://127.0.0.1:' + portSvc + '/api/visio/avis', 'room:', '  empty_timeout: 30', 'logging:', '  level: warn'].join('\n');
    fs.writeFileSync(path.join(dir, 'livekit.yaml'), conf, { mode: 0o600 });
    lk = spawn(BIN, ['--config', path.join(dir, 'livekit.yaml')], { stdio: ['ignore', 'ignore', 'pipe'] });
    let journalLk = ''; lk.stderr.on('data', (d) => { journalLk = (journalLk + d).slice(-4000); });
    vrai('LiveKit (version épinglée) répond sur la boucle locale', !!(await T.attendre(async () => { try { return (await fetch('http://127.0.0.1:' + portLk + '/')).ok; } catch (e) { return false; } }, 20000, 100)));

    const comptes = {}; for (const l of LOGINS) comptes[l] = { pass: MOTS[l], nom: NOMS[l], actif: true };
    og = await T.fauxOpGestion(comptes);
    const appels = { balayageMs: 200, perduMs: 30000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, salleEvtMax: 600,
      visio: { url: 'ws://127.0.0.1:' + portLk, interne: 'http://127.0.0.1:' + portLk, cle: CLE, secret: SECRET, maxVideo: 12, maxAudio: 25, sondeMs: 200, delaiMs: 2000 } };
    svc = await T.lancerService({ urlGestion: og.url, port: portSvc, config: { appels } });
    const base = svc.base;
    vrai('le service voit la visio en service (/health)', !!(await T.attendre(async () => { const j = await (await fetch(base + '/health')).json(); return j.visio && j.visio.ok; }, 8000, 100)));

    /* les personnes sont contacts d'Ana ; un GROUPE de six */
    const nav = (login) => { const n = T.navigateur(base); const src = creerSourceServeur({ OPMSG, base, fetch: n.fetch, EventSource: n.EventSource, navigateur: { priseEnCharge: () => ({ ok: false }), permission: () => 'default', visible: () => true, surMessage() {}, abonnementActuel: async () => null }, attente: () => 60, webrtc: { RTCPeerConnection: function () { throw new Error('aucune connexion ici'); } } }); return { src }; };
    const api = {}; for (const l of LOGINS) { api[l] = nav(l); await api[l].src.connexion(l, MOTS[l]); await api[l].src.demarrer(); }
    const id = {}; for (const l of LOGINS) id[l] = api[l].src.moi().id;
    for (const l of LOGINS.slice(1)) { const lien = await api.ana.src.lienContact(); await api[l].src.accepterLien(lien.code); }
    await api.ana.src.creerGroupe({ nom: 'Équipe visio', membres: LOGINS.slice(1).map(l => id[l]) });
    for (const l of LOGINS) api[l].src.arreter();

    const bT = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bT);
    const bB = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bB);
    const P = {};
    for (const [l, b, pf] of [['ana', bT, PROFILS.telephone], ['cleo', bT, PROFILS.telephone], ['eve', bT, PROFILS.telephone], ['ben', bB, PROFILS.bureau], ['dan', bB, PROFILS.bureau], ['fay', bB, PROFILS.bureau]]) P[l] = await ouvrir(b, base, pf, { nom: NOMS[l], login: l, visioLocale: 'ws://127.0.0.1:' + portLk });
    const csp = (await fetch(base + '/')).headers.get('content-security-policy') || '';
    v('⛔ l\'EN-TÊTE du service (celui de la production) : connect-src = le service et l\'adresse EXACTE de la visio, rien d\'autre', /connect-src ([^;]+)/.exec(csp)[1].trim().split(/\s+/), ["'self'", 'ws://127.0.0.1:' + portLk, 'http://127.0.0.1:' + portLk]);
    const tous = LOGINS.map(l => P[l]);
    for (const S of tous) await connecter(S);
    for (const S of tous) S.console.length = 0;          // avant la session, la page lit /api/moi et reçoit 401 : c'est normal

    console.log('\n1. Six personnes en vidéo dans une salle par le serveur de visio');
    const A = P.ana;
    await toucher(A, 'a[data-vue="messages"]');
    await toucher(A, '#liste-conv .conv:has(.conv-nom:text-is("Équipe visio"))');
    await A.page.waitForFunction(() => document.documentElement.dataset.conv === '1', null, { timeout: 8000 });
    await toucher(A, '#conv-cam');
    await verifier('Ana : la salle s\'ouvre', A, () => document.documentElement.dataset.salle === '1', null, 12000);
    for (const l of LOGINS.slice(1)) {
      const S = P[l];
      await verifier(S.nom + ' : ça sonne', S, () => !!document.documentElement.dataset.appel && document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 15000);
      await toucher(S, '#appel-repondre');
    }
    for (const S of tous) await verifier(S.nom + ' : cinq vignettes d\'autres personnes, chacune avec une image DÉCODÉE (largeur > 0)', S, () => {
      const ts = Array.from(document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]'));
      return ts.length === 5 && ts.every(t => { const vd = t.querySelector('video'); return !!vd && vd.videoWidth > 0 && vd.readyState >= 2; });
    }, null, 30000, async () => JSON.stringify((await tuiles(S)).map(x => [x.uid.slice(0, 5), x.camera, x.w, x.pret])) + ' erreurs=' + JSON.stringify(S.erreurs.slice(-3)) + ' console=' + JSON.stringify(S.console.slice(-3)));
    const avant = await Promise.all(tous.map(bilan)); await dormir(2500); const apres = await Promise.all(tous.map(bilan));
    v('⛔ sur chaque page, la voix ET l\'image arrivent (octets audio et images décodées qui montent) et la page envoie', tous.map((S, i) => [S.login, apres[i].audioRecu > avant[i].audioRecu, apres[i].images > avant[i].images, apres[i].emis > avant[i].emis]), tous.map(S => [S.login, true, true, true]));
    v('⛔ chaque page porte DEUX connexions au plus (une qui envoie, une qui reçoit) — jamais cinq liaisons comme la maille', tous.map(S => apres[tous.indexOf(S)].ouvertes <= 2), tous.map(() => true));
    v('chaque page reçoit dix pistes (la voix et l\'image des cinq autres)', apres.map(b => b.pistesRecues >= 10), tous.map(() => true));
    const t0 = await tuiles(P.ben); await dormir(1200); const t1 = await tuiles(P.ben);
    vrai('les vignettes de Ben AVANCENT (une image qui bouge, pas une image fixe)', t0.length === 5 && t0.every(x => { const y = t1.find(z => z.uid === x.uid); return y && y.t > x.t; }));
    await toucher(A, '#salle-plus');
    await verifier('Informations : « par le serveur de visio », 6 sur 12 personnes', A, () => /par le serveur de visio/.test(document.getElementById('salle-panneau-corps').textContent) && /6 sur 12 personnes/.test(document.getElementById('salle-panneau-corps').textContent), null, 6000, async () => await lire(A, '#salle-panneau-corps'));
    await toucher(A, '#salle-panneau-fermer');
    await capturer(bT, '1-six-en-video', tous);

    console.log('\n2. Qui parle');
    await verifier('tout le monde parle (la tonalité) : chez Ana, les cinq vignettes s\'allument', A, () => document.querySelectorAll('#salle-scene > .salle-tuile[data-uid].parle').length === 5, null, 15000, async () => JSON.stringify((await tuiles(A)).map(x => x.parle)));
    for (const S of tous) if (S !== P.ben) await S.page.evaluate(() => { const b = document.getElementById('salle-micro'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); });
    await verifier('⛔ tous coupent leur micro sauf Ben : chez Ana, seule la vignette de Ben reste allumée', A, (u) => { const ts = Array.from(document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]')); const on = ts.filter(t => t.classList.contains('parle')).map(t => t.dataset.uid); return on.length === 1 && on[0] === u; }, id.ben, 15000, async () => JSON.stringify((await tuiles(A)).map(x => [x.uid.slice(0, 5), x.parle])));

    console.log('\n3. Le partage d\'écran d\'un bureau');
    await toucher(P.ben, '#salle-partage');
    await verifier('chez Dan, la vignette de Ben passe à l\'image de l\'écran (1280 × 720)', P.dan, (u) => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] video'); return !!t && t.videoWidth === 1280 && t.videoHeight === 720; }, id.ben, 20000, async () => JSON.stringify((await tuiles(P.dan)).filter(x => x.uid === id.ben)));
    await capturer(bB, '3-partage', [P.dan, A]);

    console.log('\n4. L\'hôte retire Fay');
    const F = P.fay;
    vrai('population : Fay a des connexions ouvertes avant le retrait', (await bilan(F)).ouvertes >= 1);
    /* le geste de l'hôte, par la page : Participants → la ligne de Fay → Retirer → Confirmer */
    const geste = (act, uid) => '#salle-panneau-corps [data-sa="' + act + '"]' + (uid ? '[data-uid="' + uid + '"]' : '');
    await toucher(A, '#salle-participants');
    await toucher(A, '#salle-panneau-corps button.salle-rang[data-sa="ligne"][data-uid="' + id.fay + '"]');
    await toucher(A, geste('retirer-demander', id.fay));
    const fayAvantRetrait = F.console.length;                 // ce que la page de Fay écrit APRÈS son retrait se lit à partir d'ici (§ 6)
    await toucher(A, geste('retirer-confirmer', id.fay));
    await verifier('⛔ la page de Fay quitte la salle et dit qu\'elle a été retirée', F, () => !document.documentElement.dataset.salle && /retiré/.test(document.getElementById('mot').textContent + ' ' + ((document.getElementById('appel-avis') || {}).textContent || '')), null, 15000, async () => 'salle=' + await F.page.evaluate(() => document.documentElement.dataset.salle) + ' mot=' + await lire(F, '#mot'));
    await verifier('⛔ et sa connexion au serveur de visio est FERMÉE (plus aucune liaison vivante : elle ne reçoit plus rien)', F, () => !window.__pcs.some(window.__vivante), null, 15000, async () => JSON.stringify(await bilan(F)));
    for (const S of [A, P.ben, P.cleo, P.dan, P.eve]) await verifier(S.nom + ' : quatre vignettes (Fay est partie)', S, () => document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === 4, null, 15000);

    console.log('\n5. Terminer pour tous');
    await toucher(A, '#salle-quitter');
    await toucher(A, '[data-sa="terminer-confirmer"]');
    for (const S of [A, P.ben, P.cleo, P.dan, P.eve]) await verifier(S.nom + ' : plus de salle, plus de liaison vivante avec le serveur de visio', S, () => !document.documentElement.dataset.salle && !window.__pcs.some(window.__vivante), null, 20000, async () => 'salle=' + await S.page.evaluate(() => document.documentElement.dataset.salle) + ' ' + JSON.stringify(await bilan(S)));

    console.log('\n6. Ce que les pages ont dit');
    v('aucune erreur JavaScript sur les six pages', tous.map(S => [S.login, S.erreurs]), tous.map(S => [S.login, []]));
    /* le POULS d'une page (« je suis toujours là », toutes les 15 s) peut croiser « Terminer pour tous » : il revient 409 et la page relit la salle — un refus NOMMÉ, pas une erreur (la sonde de la maille l'admet aussi) */
    const pouls = (x) => /status of 409\b.*\[\/api\/appels\/[^\]]*\/signal\]/.test(x);
    console.log('  (refus nommés : ' + tous.reduce((n, S) => n + S.console.filter(pouls).length, 0) + ' pouls croisés avec la fin de la salle)');
    /* ⛔ LA PERSONNE RETIRÉE : c'est le serveur de visio qui la coupe (voulu — elle ne doit plus rien recevoir, et on n'attend pas qu'une page se déconnecte poliment),
       et livekit-client écrit en partant que ses canaux de données se sont fermés (« DataChannel error on lossy: User-Initiated Abort », « publisher data channel 'LOSSY'
       closed unexpectedly »). Ce n'est pas une panne de la page : nommés, comptés, chez FAY seule et APRÈS son retrait seulement — ailleurs ou avant, ils comptent. */
    const fermeture = (S, x, i) => S === F && i >= fayAvantRetrait && /^(DataChannel error on (lossy|reliable): User-Initiated Abort|publisher data channel '(LOSSY|RELIABLE)' closed unexpectedly)/.test(x);
    console.log('  (fermeture nommée : ' + F.console.filter((x, i) => fermeture(F, x, i)).length + ' message(s) de livekit-client chez Fay, coupée par le serveur de visio à son retrait)');
    v('aucune autre erreur dans la console', tous.map(S => [S.login, S.console.filter((x, i) => !pouls(x) && !/Failed to load resource.*401/.test(x) && !fermeture(S, x, i))]), tous.map(S => [S.login, []]));
    const textes = await Promise.all(tous.map(S => S.page.evaluate(() => document.body.innerText)));
    vrai('aucun « undefined » ni « NaN » à l\'écran', textes.every(t => !/\bundefined\b|\bNaN\b/.test(t)));
    const s = (await (await fetch(base + '/health')).json()).visio;
    vrai('le service a vu les entrées (aucun avis refusé : LiveKit signe ce que le service attend)', s && s.avisRefuses === 0);
  } catch (e) {
    console.log('  ✗ la sonde a levé : ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e)); process.exitCode = 1;
  } finally {
    for (const b of navigateurs) { try { await b.close(); } catch (e) { /* déjà fermé */ } }
    if (svc) await svc.arreter();
    if (og) await og.fermer();
    if (lk) { lk.kill('SIGTERM'); await T.attendre(() => lk.exitCode !== null, 5000); }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* rien */ }
  }
  fin();
})();
