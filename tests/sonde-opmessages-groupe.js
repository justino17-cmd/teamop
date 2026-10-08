/* ══ SONDE DE BOUT EN BOUT — LES APPELS À PLUSIEURS ET LA SALLE (étape 8), LA VRAIE PAGE SERVIE, DE VRAIS NAVIGATEURS, UNE VRAIE MAILLE ═══════════════════════════════════════════════════════════════
   `tests/test-990.js` fait parler le moteur de la page au vrai service avec une FAUSSE connexion pair à pair. Cette sonde joue la VRAIE PAGE (`server-msg/public/`, générée depuis l'interface de Justin) dans DEUX
   navigateurs Chromium — un téléphone (390 px, au doigt, avec le nom d'un iPhone) et un bureau (1280 px, à la souris) — contre le VRAI service, un OP GESTION factice pour la porte bêta et, si `turnserver` est installé,
   un VRAI coturn. La pile WebRTC est la vraie ; le micro est une tonalité de 440 Hz continue (un fichier que Chromium lit à la place du micro : « qui parle » se mesure vraiment), la caméra un damier qui bouge.

   Ce qu'elle prouve, et que rien d'autre ne peut prouver :
     · une VRAIE réunion en maille à QUATRE pages (Ana et Cleo sur le téléphone, Ben et Dan au bureau, Eve pour la cinquième place) : chaque page porte TROIS liaisons, et sur CHACUNE les octets audio et les images
       décodées MONTENT (`getStats`, par liaison) ; chaque vignette montre l'image décodée de l'autre ; la voix est reconnue pour ce qu'elle est (la tonalité arrive à 440 Hz) ;
     · qui parle s'allume (le contour vert suit le micro ouvert, et s'éteint quand tout le monde se tait), la main levée et les réactions arrivent chez tous, la discussion de la conversation, l'épingle et la vue
       « intervenant », le sondage (le décompte est le même partout) et le minuteur ;
     · le plafond de débit posé par liaison (audio 32 kbit/s, vidéo selon le nombre de présents) et ce que la maille COÛTE : débit sortant et entrant d'une page, processeur d'une page ;
     · l'hôte : la salle PLEINE (le cinquième en vidéo reçoit « La salle est pleine »), « couper le micro » (demandé ET honoré, une personne puis tous), le co-hôte, l'exclusion (l'exclu ne reçoit plus rien et ne revient
       pas), le verrouillage (la phrase du refus), la salle d'attente (Admettre, Refuser, ni micro ni caméra avant l'admission), l'hôte qui part (le rôle passe) et « Terminer pour tous » ;
     · le partage d'écran d'un bureau (la piste d'écran REMPLACE la caméra chez les autres) — et le bouton ABSENT sur un iPhone ; l'enregistrement LOCAL de l'hôte (un fichier lu par ffprobe : image et voix, la tonalité
       retrouvée par Goertzel), avec le bandeau « REC » chez tous ;
     · une réunion PROGRAMMÉE : « Rejoindre » dans l'agenda et dans la fiche, la salle d'attente demandée, le LIEN d'invité (un compte qui n'est pas invité entre ; l'ancien lien meurt au renouvellement) ;
     · la mise en page des écrans de la salle, aux deux largeurs, mesurée deux fois et contre la largeur POSÉE ; aucun texte anglais, aucun « undefined » ; aucune erreur JavaScript.
   Chaque contre-épreuve est jouée : le détecteur de « la voix passe » rend FAUX sur la page dont les connexions sont fermées ; « qui parle » s'éteint quand les micros sont coupés ; l'exclu ne revient pas.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Tout se passe sur 127.0.0.1. Jamais plus de DEUX navigateurs à la fois, tous tués à la fin (même sur erreur).

   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-groupe.js
              … --relais       (ajoute les blocs 10 et 11 : une réunion à QUATRE en vidéo et à SIX en audio, FORCÉES par le vrai coturn — ce qu'elles consomment d'allocations ; plusieurs minutes de plus ; les navigateurs y perdent le réseau de BOUCLAGE, qui compterait pour un second réseau : `SANS_BOUCLE=1` fait pareil sans les blocs)
              CAPTURES=/dossier   (les écrans côte à côte aux étapes clés)   ·   SEULEMENT=1,2   (ne joue que ces blocs : pour chercher, jamais pour conclure ; les blocs 1 à 7 forment UNE réunion)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-groupe.js'); process.exit(2); }
}
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const V = require(path.join(T.SERVICE, 'outils', 'verifier-relais.js'));
const CHROME = '/opt/pw-browsers/chromium';
const AVEC_RELAIS = process.argv.includes('--relais');
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const PROFILS = {
  telephone: { nom: 'iPhone 390', w: 390, h: 844, dpr: 2, mobile: true, insets: { top: 47, bottom: 34 }, ua: UA_IPHONE },
  bureau: { nom: 'bureau 1280', w: 1280, h: 800, dpr: 1, mobile: false, insets: null, ua: null },
};
const LOGINS = ['ana', 'ben', 'cleo', 'dan', 'eve', 'fay'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567', dan: 'pw-dan-12345678', eve: 'pw-eve-12345678', fay: 'pw-fay-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc', dan: 'Dan Banc', eve: 'Eve Banc', fay: 'Fay Banc' };

/* La tonalité qui tient lieu de micro : 440 Hz, deux secondes (un nombre entier de périodes : elle boucle sans à-coup). Chromium lit ce fichier à la place du micro fabriqué (une brève tonalité par seconde, qui ne
   fait pas « parler » assez longtemps pour être mesurée). */
function ecrireTonalite(dir) {
  const sr = 48000, n = sr * 2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / sr) * 12000), 44 + i * 2);
  const f = path.join(dir, 'tonalite-440.wav'); fs.writeFileSync(f, buf); return f;
}

/* ── l'ouverture d'une page : un contexte NEUF (ses propres cookies, ses propres autorisations) par personne ──
   Chaque page note ce que le navigateur fabrique : les pistes de `getUserMedia` (toutes ARRÊTÉES à la fin ?), les connexions pair à pair (numérotées), les écrans demandés, et sait dire, par liaison, les octets, les images
   et le niveau de voix (`__maille`), les plafonds de débit posés (`__plafonds`). `window.__relaisSeul` force la politique « relay » (le seul moyen de prouver le relais). Rien de tout cela ne change ce que la page FAIT. */
async function ouvrir(b, base, pf, o) {
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, userAgent: pf.ua || undefined,
    colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'], baseURL: base, acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const S = { ctx, page, pf, nom: o.nom, login: o.login, base, erreurs: [], console: [], gestes: 0 };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') { let u = ''; try { u = /Failed to load resource/.test(m.text()) ? ' [' + new URL(m.location().url).pathname + ']' : ''; } catch (e) { /* sans adresse */ } S.console.push((m.text() + u).slice(0, 240)); } });
  await page.addInitScript(() => {
    window.__media = 0; window.__pistes = []; window.__pcs = []; window.__confs = []; window.__cands = []; window.__relaisSeul = false; window.__ecrans = 0; window.__ecranReel = null; window.__iceErreurs = []; window.__seq = 0;
    try {
      const md = navigator.mediaDevices, g = md.getUserMedia.bind(md);
      md.getUserMedia = async function (c) { window.__media++; const f = await g(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
      /* l'écran partagé : le VRAI s'il existe et répond (un Chromium sans écran n'a rien à capturer) ; sinon une toile qui change — la piste d'écran, l'émetteur et les autres sont les vrais */
      const reel = md.getDisplayMedia ? md.getDisplayMedia.bind(md) : null;
      md.getDisplayMedia = async function (c) {
        window.__ecrans++;
        if (reel && window.__ecranReel !== false) {
          try { const f = await Promise.race([reel(c), new Promise((ok, ko) => setTimeout(() => ko(new Error('délai')), 4000))]); f.getTracks().forEach(t => window.__pistes.push(t)); window.__ecranReel = true; return f; } catch (e) { window.__ecranReel = false; }
        }
        const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g2 = cv.getContext('2d'); let k = 0;
        const dessiner = () => { k++; g2.fillStyle = '#123456'; g2.fillRect(0, 0, 1280, 720); g2.fillStyle = '#ffcc00'; g2.fillRect((k * 9) % 1200, 100 + (k % 7) * 60, 80, 80); g2.fillStyle = '#ffffff'; g2.font = '48px sans-serif'; g2.fillText('écran partagé ' + k, 40, 80); };
        dessiner(); const iv = setInterval(dessiner, 100);
        window.addEventListener('pagehide', () => clearInterval(iv));
        const f = cv.captureStream(10); f.getTracks().forEach(t => { window.__pistes.push(t); const arret = t.stop.bind(t); t.stop = function () { clearInterval(iv); arret(); }; });
        return f;
      };
    } catch (e) { /* rien */ }
    const PC = window.RTCPeerConnection;
    if (PC) {
      const Faux = function (conf, ...r) {
        conf = Object.assign({}, conf);
        if (window.__relaisSeul) conf.iceTransportPolicy = 'relay';
        const pc = new PC(conf, ...r); pc.__n = ++window.__seq; window.__pcs.push(pc); window.__confs.push([pc.__n, (conf.iceServers || []).map(s => [].concat(s.urls))]);
        pc.addEventListener('icecandidate', (e) => { if (e.candidate) window.__cands.push([pc.__n, e.candidate.type, e.candidate.protocol, e.candidate.relayProtocol || '', e.candidate.address || '']); });
        const poser = pc.setConfiguration.bind(pc);
        pc.setConfiguration = function (c2) { const d = Object.assign({}, c2); if (window.__relaisSeul) d.iceTransportPolicy = 'relay'; window.__confs.push([pc.__n, (d.iceServers || []).map(s => [].concat(s.urls))]); return poser(d); };
        pc.addEventListener('icecandidateerror', (e) => { window.__iceErreurs.push({ url: e.url, code: e.errorCode, texte: e.errorText }); });
        return pc;
      };
      Faux.prototype = PC.prototype; Object.setPrototypeOf(Faux, PC); window.RTCPeerConnection = Faux;
    }
    /* l'état de chaque liaison OUVERTE : les octets reçus et émis, les images décodées, le niveau de voix de l'autre, la paire retenue */
    window.__maille = async () => {
      const out = [];
      for (const pc of window.__pcs) {
        if (pc.signalingState === 'closed') continue;
        const o = { n: pc.__n, etat: pc.connectionState, ice: pc.iceConnectionState, audioRecu: 0, audioEmis: 0, videoRecu: 0, videoEmis: 0, images: 0, imagesEmises: 0, locale: null, distante: null, niveau: 0, largeur: 0 };
        let r; try { r = await pc.getStats(); } catch (e) { continue; }
        const tout = {}; r.forEach(s => { tout[s.id] = s; });
        r.forEach(s => {
          if (s.type === 'inbound-rtp' && s.kind === 'audio') { o.audioRecu = s.bytesReceived || 0; o.niveau = s.audioLevel || 0; }
          if (s.type === 'outbound-rtp' && s.kind === 'audio') o.audioEmis = s.bytesSent || 0;
          if (s.type === 'inbound-rtp' && s.kind === 'video') { o.videoRecu = s.bytesReceived || 0; o.images = s.framesDecoded || 0; o.largeur = s.frameWidth || 0; }
          if (s.type === 'outbound-rtp' && s.kind === 'video') { o.videoEmis = s.bytesSent || 0; o.imagesEmises = s.framesEncoded || 0; }
        });
        let paire = null;
        r.forEach(s => { if (s.type === 'transport' && s.selectedCandidatePairId && tout[s.selectedCandidatePairId]) paire = tout[s.selectedCandidatePairId]; });
        if (paire) { o.locale = (tout[paire.localCandidateId] || {}).candidateType || null; o.distante = (tout[paire.remoteCandidateId] || {}).candidateType || null; }
        out.push(o);
      }
      return out;
    };
    window.__plafonds = () => {
      const out = [];
      for (const pc of window.__pcs) { if (pc.signalingState === 'closed') continue; for (const s of pc.getSenders()) if (s.track) out.push({ n: pc.__n, kind: s.track.kind, max: ((s.getParameters().encodings || [{}])[0] || {}).maxBitrate === undefined ? null : s.getParameters().encodings[0].maxBitrate }); }
      return out;
    };
  });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}

/* ── lectures et attentes (au geste) ── */
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const visible = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getClientRects(); const c = getComputedStyle(e); return r.length > 0 && c.visibility !== 'hidden' && c.display !== 'none'; }, sel);
async function attendre(S, fn, arg, ms) { try { await S.page.waitForFunction(fn, arg, { timeout: ms || 10000, polling: 50 }); return true; } catch (e) { return false; } }
async function verifier(titre, S, fn, arg, ms, ceQuOnVoit) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else { const vu = ceQuOnVoit ? await ceQuOnVoit().catch(() => '?') : ''; v(titre, 'non vu à temps (' + (ms || 10000) + ' ms)' + (vu ? ' ; vu : ' + vu : ''), 'vu'); }
  return ok;
}
async function toucher(S, sel, o) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  const force = !!(o && o.force);          // un bouton « grisé » (aria-disabled) qu'on touche exprès : Playwright le croit désactivé et attendrait pour toujours
  try { if (S.pf.mobile) await loc.tap({ force }); else await loc.click({ force }); }
  catch (e) {
    /* UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU : qui recouvre l'élément, au point que le doigt toucherait ? */
    const vu = await S.page.evaluate((s) => { const e = Array.from(document.querySelectorAll(s)).find(x => x.getClientRects().length > 0); if (!e) return 'introuvable ou invisible'; const r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify({ r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], dessus: t ? (t.tagName + '#' + t.id + '.' + String(t.className).slice(0, 40)) : null }); }, sel).catch(() => '?');
    const diag = await S.page.evaluate(async (s) => { const e = Array.from(document.querySelectorAll(s)).find(x => x.getClientRects().length > 0); if (!e) return null; const rs = []; for (let i = 0; i < 12; i++) { const r = e.getBoundingClientRect(); rs.push([Math.round(r.x*10)/10, Math.round(r.y*10)/10, Math.round(r.width*10)/10]); await new Promise(f => requestAnimationFrame(f)); }
      const anims = document.getAnimations().filter(a => a.playState === 'running').map(a => { const t = a.effect && a.effect.target; return (t ? (t.id || t.className || t.tagName) : '?') + ':' + (a.animationName || a.transitionProperty || 'anim'); }).slice(0, 12);
      return { rs: Array.from(new Set(rs.map(x => x.join(',')))).slice(0, 6), anims, disabled: e.disabled, pe: getComputedStyle(e).pointerEvents, inert: !!e.closest('[inert]') }; }, sel).catch(x => String(x));
    /* … et SI elle bouge (douze trames), quelles animations tournent, si elle est désactivée ou inerte : un toucher qui n'aboutit pas sur un bouton bien au-dessus (8 octobre 2026) se lisait sans ça */
    throw new Error(String(e.message).split('\n')[0] + ' — ' + sel.slice(0, 90) + ' — ' + vu + ' — ' + JSON.stringify(diag));
  }
}
async function saisir(S, sel, texte) { await S.page.locator(sel).fill(texte); S.gestes++; }
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]);
  await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
}
const salleOuverte = (S) => S.page.evaluate(() => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0);
const motVu = (S) => lire(S, '#mot');
const sansSalle = (titre, S, ms) => verifier(titre, S, () => !document.documentElement.dataset.appel && !document.documentElement.dataset.salle, null, ms || 12000, async () => 'salle=' + (await salleOuverte(S)) + ' statut=«' + (await lire(S, '#salle-statut')) + '»');
const tuiles = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#salle-scene > .salle-tuile')).map(t => {
  const vd = t.querySelector('video');
  return { uid: t.dataset.uid || 'vous', camera: t.dataset.camera, parle: t.classList.contains('parle'), epingle: t.classList.contains('epingle'), grand: t.classList.contains('grand'), coupe: !!t.querySelector('.tuile-nom.coupe'),
    main: !!t.querySelector('.salle-badge.main'), ecran: t.dataset.ecran === '1', w: vd ? vd.videoWidth : 0, t: vd ? vd.currentTime : 0, pret: vd ? vd.readyState : 0, nom: (t.querySelector('.tuile-nom') || {}).textContent || '' };
}));
const maille = (S) => S.page.evaluate(() => window.__maille());
/* la voix et l'image passent : sur CHAQUE liaison ouverte, les octets audio reçus (et les images décodées, avec `video`) CROISSENT entre deux lectures */
async function croit(S, o) {
  const a = await maille(S); await dormir((o && o.ms) || 1500); const b = await maille(S);
  const lie = b.map(y => ({ n: y.n, avant: a.find(x => x.n === y.n), apres: y })).filter(p => p.avant);
  const audio = lie.length > 0 && lie.every(p => p.apres.audioRecu > p.avant.audioRecu && p.apres.audioRecu > 0);
  const images = lie.length > 0 && lie.every(p => p.apres.images > p.avant.images && p.apres.images > 0);
  return { n: lie.length, audio, images, emis: lie.length > 0 && lie.every(p => p.apres.audioEmis > p.avant.audioEmis), lie };
}
const liaisons = (S, n) => verifier(S.nom + ' : ' + n + ' liaison(s) CONNECTÉE(S) (pair à pair, une par autre personne)', S, k => window.__pcs.filter(pc => pc.signalingState !== 'closed' && pc.connectionState === 'connected').length === k, n, 25000,
  async () => JSON.stringify((await maille(S)).map(x => x.etat + '/' + x.ice)));

/* la largeur d'un écran de la salle, deux fois, contre la largeur POSÉE ; et tout ce que l'écran DIT, relevé pour le jugement final (anglais, « undefined ») */
const mesures = { ecrans: 0, population: 0, debordements: [], largeurs: new Set(), textes: new Set() };
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    const dep = document.documentElement.scrollWidth; window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    const hors = Array.from(document.querySelectorAll('#salle-ecran *')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest('[hidden]') && (r.right > innerWidth + 1 || r.left < -1); }).length;
    const textes = [];
    for (const e of document.querySelectorAll('#salle-ecran, #salle-ecran *, #mot, #annonce-appel, #conv-salle, #conv-salle *')) {
      if (e.closest('[hidden]')) continue;
      for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) textes.push(n.textContent.replace(/\s+/g, ' ').trim());
      for (const a of ['aria-label', 'title', 'placeholder']) { const x = e.getAttribute && e.getAttribute(a); if (x) textes.push(x); }
    }
    return { dep, sx, n: document.querySelectorAll('#salle-ecran *').length, hors, textes };
  });
  const a = await mesure(); await dormir(500); const b = await mesure();
  mesures.ecrans++; mesures.population += b.n; mesures.largeurs.add(S.pf.w); for (const t of b.textes) mesures.textes.add(t);
  if (b.sx > 0 || b.dep > S.pf.w + 1 || b.hors > 0) mesures.debordements.push(S.pf.w + ' px · ' + etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx + ', ' + b.hors + ' élément(s) hors de l\'écran (1re mesure ' + a.dep + ')');
}
async function capturer(b, nom, personnes) {
  if (!DOSSIER_CAPTURES) return;
  fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true });
  const imgs = [];
  for (const S of personnes) imgs.push({ nom: S.nom + ' · ' + S.pf.nom, data: (await S.page.screenshot({ type: 'png' })).toString('base64'), w: S.pf.w, h: S.pf.h });
  const ctx = await b.newContext({ viewport: { width: Math.min(2600, imgs.reduce((s, i) => s + i.w, 0) + 60 * imgs.length), height: Math.max(...imgs.map(i => i.h)) + 70 } });
  const p = await ctx.newPage();
  await p.setContent('<body style="margin:0;background:#1c1c1e;color:#fff;font:14px system-ui;display:flex;gap:24px;padding:16px;align-items:flex-start">' +
    imgs.map(i => '<figure style="margin:0"><figcaption style="margin-bottom:6px">' + i.nom.replace(/</g, '&lt;') + '</figcaption><img style="width:' + i.w + 'px;border-radius:12px;display:block" src="data:image/png;base64,' + i.data + '"></figure>').join('') + '</body>');
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '.png'), fullPage: true });
  await ctx.close();
}

/* ── ce que coûte un navigateur : le temps de processeur de ses processus de rendu (SystemInfo.getProcessInfo, en secondes cumulées) ── */
async function tempsCpu(b) {
  const c = await b.newBrowserCDPSession();
  try { const r = await c.send('SystemInfo.getProcessInfo'); return (r.processInfo || []).map(p => ({ type: p.type, id: p.id, cpu: p.cpuTime })); } finally { await c.detach().catch(() => {}); }
}

/* ── le relais : le vrai coturn, aux plafonds de PRODUCTION (`install-turn.sh`) ── */
const adresseLocale = () => { for (const l of Object.values(os.networkInterfaces())) for (const i of l || []) if (i.family === 'IPv4' && !i.internal) return i.address; return null; };
function constantesRelais() {
  const sh = fs.readFileSync(path.join(T.SERVICE, 'install-turn.sh'), 'utf8');
  const n = (k) => Number((new RegExp('^' + k + '=(\\d+)', 'm').exec(sh) || [])[1]);
  const refuses = Array.from(/REFUSES=\(\n([\s\S]*?)\n\)/.exec(sh)[1].matchAll(/"([^"]+)"/g)).map(m => m[1]);
  return { userQuota: n('USER_QUOTA'), totalQuota: n('TOTAL_QUOTA'), maxBps: n('MAX_BPS'), bpsCapacite: n('BPS_CAPACITE'), refuses };
}
/* Ce que coturn a VU, d'après son journal bavard : par personne, les allocations ouvertes en tout et AU MÊME INSTANT au plus (le pic). */
function lireAllocations(texte) {
  const ouvertes = new Map(), par = new Map();
  for (const l of String(texte).split('\n')) {
    let m = /session (\d+): new, realm=<[^>]*>, username=<(\d+):([^>]+)>/.exec(l);
    if (m) { const p = par.get(m[3]) || { total: 0, pic: 0, courant: 0 }; par.set(m[3], p); p.total++; p.courant++; p.pic = Math.max(p.pic, p.courant); ouvertes.set(m[1], m[3]); continue; }
    m = /session (\d+): closed/.exec(l);
    if (m && ouvertes.has(m[1])) { par.get(ouvertes.get(m[1])).courant--; ouvertes.delete(m[1]); }
  }
  return par;
}
const refusAllocations = (texte) => String(texte).split('\n').filter(l => /ALLOCATE processed, error 486/.test(l)).length;
async function attendreRepos(coturn, ms) {
  const t0 = Date.now();
  const tenues = () => { let n = 0; for (const p of lireAllocations(coturn.journal()).values()) n += Math.max(0, p.courant); return n; };
  let n = tenues();
  while (n > 0 && Date.now() - t0 < (ms || 80000)) { await dormir(500); n = tenues(); }
  return { ok: n === 0, restantes: n, attente: Math.round((Date.now() - t0) / 100) / 10 };
}
async function demarrerCoturn(dir, secret, ip) {
  const bin = fs.existsSync('/usr/bin/turnserver') ? '/usr/bin/turnserver' : null;
  if (!bin || !ip) return null;
  const port = await T.portLibre();
  const P = constantesRelais(), journal = process.env.JOURNAL_COTURN || path.join(dir, 'coturn-sonde.log');
  const conf = ['listening-port=' + port, 'listening-ip=' + ip, 'relay-ip=' + ip, 'min-port=49400', 'max-port=49500', 'realm=sonde.opmsg', 'use-auth-secret', 'static-auth-secret=' + secret,
    'no-tls', 'no-dtls', 'no-cli', 'no-tcp-relay', 'fingerprint', 'no-software-attribute', 'user-quota=' + P.userQuota, 'total-quota=' + P.totalQuota, 'max-bps=' + P.maxBps, 'bps-capacity=' + P.bpsCapacite,
    ...P.refuses.map(r => 'denied-peer-ip=' + r), 'verbose', 'log-file=' + journal, 'no-stdout-log', 'simple-log', ''].join('\n');
  const f = path.join(dir, 'coturn-sonde.conf');
  fs.writeFileSync(f, conf, { mode: 0o600 }); fs.writeFileSync(journal, '');
  let proc = null, mort = null;
  const demarrer = () => { const p = spawn(bin, ['-c', f, '--pidfile='], { stdio: 'ignore' }); proc = p; mort = null; p.on('exit', (c) => { if (p === proc) mort = c; }); };
  const sonPret = () => T.attendre(async () => {
    if (mort !== null) return 'mort';
    try { const l = await V.ouvrir({ hote: ip, port, transport: 'udp' }); const m = await l.echange(V.message(0x0001, [], crypto.randomBytes(12), null), 600); l.fermer(); return !!m && m.type === 0x0101; } catch (e) { return false; }
  }, 8000, 150);
  demarrer();
  if ((await sonPret()) !== true) { try { proc.kill('SIGKILL'); } catch (e) { /* rien */ } return null; }
  return { port, ip, constantes: P, journal: () => { try { return fs.readFileSync(journal, 'utf8'); } catch (e) { return ''; } },
    arreter: async () => { if (mort === null) { proc.kill('SIGTERM'); await T.attendre(() => mort !== null, 3000); if (mort === null) proc.kill('SIGKILL'); } } };
}

/* ── ffprobe / ffmpeg pour juger le fichier de l'enregistrement : les flux, la durée, la tonalité (Goertzel) et une image qui n'est pas noire ── */
const ffAvailable = () => spawnSync('ffprobe', ['-version']).status === 0 && spawnSync('ffmpeg', ['-version']).status === 0;
function goertzel(echantillons, sr, f) {
  const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let s1 = 0, s2 = 0;
  for (let i = 0; i < echantillons.length; i++) { const s0 = echantillons[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / echantillons.length;
}
function jugerFichier(fichier) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration', '-of', 'json', fichier], { encoding: 'utf8' });
  let info = null; try { info = JSON.parse(p.stdout); } catch (e) { info = null; }
  /* ⛔ un fichier de MediaRecorder n'a pas de durée dans son en-tête (écrit au fil de l'eau) : on la lit en le DÉCODANT jusqu'au bout */
  const dec = spawnSync('ffmpeg', ['-v', 'info', '-i', fichier, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const dernier = Array.from(String(dec.stderr).matchAll(/time=(\d+):(\d+):([\d.]+)/g)).pop();
  const flux = info ? info.streams || [] : [], duree = dernier ? (+dernier[1]) * 3600 + (+dernier[2]) * 60 + parseFloat(dernier[3]) : NaN;
  const a = spawnSync('ffmpeg', ['-v', 'error', '-i', fichier, '-vn', '-ac', '1', '-ar', '16000', '-t', '4', '-f', 's16le', '-'], { maxBuffer: 20 * 1024 * 1024 });
  const pcm = new Int16Array(a.stdout.buffer, a.stdout.byteOffset, Math.floor(a.stdout.length / 2)), x = Array.from(pcm.subarray(8000, 56000), s => s / 32768);
  const g440 = x.length ? goertzel(x, 16000, 440) : 0, g1000 = x.length ? Math.max(...[330, 550, 1000, 2000].map(f => goertzel(x, 16000, f))) : 0;          // les voisins : 330, 550, 1000 et 2000 Hz
  const sg = spawnSync('ffmpeg', ['-v', 'error', '-i', fichier, '-an', '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const yavg = Array.from(String(sg.stdout).matchAll(/YAVG=([\d.]+)/g)).map(m => parseFloat(m[1]));
  const moyenne = yavg.length ? yavg.reduce((s, y) => s + y, 0) / yavg.length : 0;
  return { video: flux.filter(f => f.codec_type === 'video').length, audio: flux.filter(f => f.codec_type === 'audio').length, duree, g440, g1000, echantillons: x.length, images: yavg.length, luminance: Math.round(moyenne * 10) / 10,
    codecs: flux.map(f => f.codec_name).join('+') };
}

setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (1500 s)'); process.exit(1); }, 1500000).unref();

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-groupe-'));
  const SECRET = crypto.randomBytes(24).toString('hex');
  const navigateurs = [];
  let og = null, svc = null, coturn = null;
  const SEUL = (process.env.SEULEMENT || '').split(',').filter(Boolean);
  const bloc = async (titre, fn) => {
    if (SEUL.length && !SEUL.includes(titre.split('.')[0])) return;
    console.log('\n' + titre);
    try { await fn(); } catch (e) { v(titre + ' : le bloc est allé jusqu\'au bout', 'EXCEPTION : ' + String(e && e.message || e).split('\n').filter(Boolean).slice(0, 4).join(' | ').slice(0, 520), 'sans exception'); }
  };
  try {
    const tonalite = ecrireTonalite(dir);
    const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-audio-capture=' + tonalite, '--autoplay-policy=no-user-gesture-required',
      '--disable-features=WebRtcHideLocalIpsWithMdns'];
    /* ⛔ le bouclage compte pour un SECOND réseau : Chromium ouvre une allocation chez coturn PAR RÉSEAU et par adresse de relais, donc deux avec lui (mesuré : 2 par liaison pour UNE adresse). Un téléphone n'a qu'un réseau actif : `SANS_BOUCLE=1` retire le bouclage pour mesurer le relais comme un appareil ordinaire le voit (les trajets directs passent alors par l'adresse de la machine). */
    if (!process.env.SANS_BOUCLE && !AVEC_RELAIS) ARGS.push('--allow-loopback-in-peer-connection');          // avec `--relais`, le bouclage est retiré d'office : les blocs 10 et 11 comptent des allocations
    coturn = AVEC_RELAIS ? await demarrerCoturn(dir, SECRET, adresseLocale()) : null;
    const comptes = {}; for (const l of LOGINS) comptes[l] = { pass: MOTS[l], nom: NOMS[l], actif: true };
    og = await T.fauxOpGestion(comptes);
    const appels = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000, groupeSignalMax: 4000, salleEvtMax: 600 };
    if (coturn) appels.relais = { secret: SECRET, hote: coturn.ip, port: coturn.port, ttlS: 900 };
    svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels } });
    const base = svc.base;

    /* les personnes sont contacts d'Ana (par l'API : le parcours du lien a sa propre sonde) ; un GROUPE de cinq pour les appels */
    const nav = (login) => { const n = T.navigateur(base); const src = creerSourceServeur({ OPMSG, base, fetch: n.fetch, EventSource: n.EventSource, navigateur: { priseEnCharge: () => ({ ok: false }), permission: () => 'default', visible: () => true, surMessage() {}, abonnementActuel: async () => null }, attente: () => 60, webrtc: { RTCPeerConnection: function () { throw new Error('la sonde n\'ouvre aucune connexion ici'); } } }); return { src, login }; };
    const api = {}; for (const l of LOGINS) { api[l] = nav(l); await api[l].src.connexion(l, MOTS[l]); await api[l].src.demarrer(); }
    const id = {}; for (const l of LOGINS) id[l] = api[l].src.moi().id;
    for (const l of LOGINS.slice(1)) { const lien = await api.ana.src.lienContact(); await api[l].src.accepterLien(lien.code); }
    const grp = await api.ana.src.creerGroupe({ nom: 'Équipe salle', membres: [id.ben, id.cleo, id.dan, id.eve] });
    const lienBen = await api.ben.src.lienContact(); await api.dan.src.accepterLien(lienBen.code);          // Ben connaît Dan et Cleo : il pourra les inviter à sa réunion
    const lienBen2 = await api.ben.src.lienContact(); await api.cleo.src.accepterLien(lienBen2.code);
    for (const l of LOGINS) api[l].src.arreter();

    console.log('\n── sonde des appels à plusieurs · ' + (coturn ? 'coturn réel sur ' + coturn.ip + ':' + coturn.port : AVEC_RELAIS ? 'SANS coturn (le relais est NON VÉRIFIÉ)' : 'sans le relais (--relais pour l\'ajouter)') + ' ──');
    const bT = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bT);
    const bB = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bB);
    const A = await ouvrir(bT, base, PROFILS.telephone, { nom: NOMS.ana, login: 'ana' });
    const C = await ouvrir(bT, base, PROFILS.telephone, { nom: NOMS.cleo, login: 'cleo' });
    const B = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.ben, login: 'ben' });
    const D = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.dan, login: 'dan' });
    const E = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.eve, login: 'eve' });
    const quatre = [A, B, C, D], tous = [A, B, C, D, E];
    for (const S of tous) await connecter(S, S.login);
    for (const S of tous) S.console.length = 0;                 // avant la session, la page lit /api/moi et reçoit 401 : c'est ce que le navigateur journalise, et c'est normal
    vrai('population : cinq personnes connectées dans deux navigateurs (deux téléphones « iPhone » au doigt, trois bureaux à la souris)', (await Promise.all(tous.map(S => lire(S, '#moi-nom')))).every((t, i) => t && t.includes(['Ana', 'Ben', 'Cleo', 'Dan', 'Eve'][i])) && A.pf.mobile && C.pf.mobile && !B.pf.mobile);

    const ouvrirConv = async (S, nom) => {
      await toucher(S, 'a[data-vue="messages"]');
      await toucher(S, '#liste-conv .conv:has(.conv-nom:text-is("' + nom + '"))');
      await S.page.waitForFunction(n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(n), nom, { timeout: 7000 });
    };
    /* aller à un onglet : sur un téléphone, la barre d'onglets se cache pendant qu'une CONVERSATION est ouverte — on revient d'abord à la liste */
    const allerA = async (S, vue) => { if (await S.page.evaluate(() => document.documentElement.dataset.conv === '1' && !document.querySelector('a[data-vue="reunions"]').getClientRects().length)) await toucher(S, '#conv-retour'); await toucher(S, 'a[data-vue="' + vue + '"]'); };
    /* une salle restée ouverte par un bloc qui a échoué (ou par une exécution partielle) ne doit pas fausser le suivant : tout le monde en sort */
    const toutQuitter = async (pages) => {
      for (const S of pages) {
        for (let i = 0; i < 3 && await S.page.evaluate(() => !!document.documentElement.dataset.salle); i++) {
          await toucher(S, '#salle-quitter');
          if (await visible(S, '[data-sa="quitter-simple"]')) await toucher(S, '[data-sa="quitter-simple"]');
          await attendre(S, () => !document.documentElement.dataset.salle, null, 8000);
        }
      }
    };
    const repondre = async (S) => { await verifier(S.nom + ' : la sonnerie est là (Refuser / Répondre)', S, () => !!document.documentElement.dataset.appel && document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 12000, async () => 'appel=' + (await S.page.evaluate(() => document.documentElement.dataset.appel))); await toucher(S, '#appel-repondre'); };
    const dansLaSalle = (S, n) => verifier(S.nom + ' : dans la salle, ' + n + ' vignette(s) d\'autres personnes (plus « Vous »)', S, k => document.documentElement.dataset.salle === '1' && document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === k, n, 20000,
      async () => 'salle=' + (await salleOuverte(S)) + ' tuiles=' + JSON.stringify((await tuiles(S)).map(t => t.uid.slice(0, 4))) + ' statut=«' + (await lire(S, '#salle-statut')) + '» erreurs=' + JSON.stringify(S.erreurs.slice(-3)) + ' html=' + JSON.stringify(await S.page.evaluate(() => Object.assign({}, document.documentElement.dataset))) + ' appel=«' + (await lire(S, '#appel-nom')) + '/' + (await lire(S, '#appel-statut')) + '» mot=«' + (await motVu(S)) + '» pcs=' + (await S.page.evaluate(() => window.__pcs.length)));
    const parler = (S, oui) => S.page.evaluate((o) => { const b = document.getElementById('salle-micro'); const muet = b.getAttribute('aria-pressed') === 'true'; if (muet === !o) return false; b.click(); return true; }, oui);

        /* ═══ 1. UN APPEL DE GROUPE EN VIDÉO À QUATRE, EN MAILLE ═══════════════════════════════════════════════════ */
    await bloc('1. Un appel de groupe en vidéo : Ana appelle « Équipe salle » — quatre pages se joignent deux à deux, chacune reçoit l\'image et la voix des trois autres', async () => {
      await ouvrirConv(A, 'Équipe salle');
      await toucher(A, '#conv-cam');
      await verifier('Ana : la salle s\'ouvre (écran « En réunion », pas l\'écran d\'appel à deux), seule d\'abord', A, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0 && /Équipe|Ben|Cleo|Dan|Eve|Ana/.test(document.getElementById('salle-titre').textContent), null, 12000, async () => 'appel=' + (await A.page.evaluate(() => document.documentElement.dataset.appel)) + ' salle=' + (await salleOuverte(A)));
      vrai('l\'écran d\'appel à deux est CACHÉ pendant que la salle est là', !(await visible(A, '#appel-ecran')) && (await visible(A, '#salle-ecran')));
      await verifier('… elle dit qui sonne (quatre personnes), et que personne n\'est encore là', A, () => /sonnent/.test((document.getElementById('salle-seul') || {}).textContent || ''), null, 8000, async () => '«' + (await lire(A, '#salle-scene')) + '»');
      await largeur(A, 'salle · seul, ça sonne');
      for (const S of [B, C, D, E]) await verifier(S.nom + ' : l\'appel ENTRANT sonne dans SA page (c\'est une salle)', S, () => !!document.documentElement.dataset.appel && document.getElementById('appel-ecran').hasAttribute('data-entrant') && document.documentElement.dataset.salle !== '1', null, 14000);
      const sonn = await B.page.evaluate(() => ({ media: window.__media, pcs: window.__pcs.length, repondre: document.getElementById('appel-repondre').getClientRects().length > 0 }));
      v('⛔ Ben n\'a demandé NI micro NI caméra, et aucune connexion n\'existe, tant qu\'il n\'a pas répondu', [sonn.media, sonn.pcs, sonn.repondre], [0, 0, true]);
      for (const S of [B, C, D]) await toucher(S, '#appel-repondre');
      await Promise.all([A, B, C, D].map(S => dansLaSalle(S, 3)));
      await Promise.all(quatre.map(S => liaisons(S, 3)));
      const croissances = [];
      for (const S of quatre) { const c = await croit(S, { ms: 2500 }); croissances.push([S.nom, c.n, c.audio, c.images, c.emis]); }
      v('⛔ LA VOIX ET L\'IMAGE PASSENT, par liaison : sur CHACUNE des 3 liaisons de chacune des 4 pages, les octets audio reçus ET les images décodées montent, et la page en émet', croissances, quatre.map(S => [S.nom, 3, true, true, true]));
      /* au GESTE, pas au chronomètre : la liaison est établie et ses images décodées (lu plus haut), mais la vignette n'a son image qu'une fois le flux lié et la lecture partie — on l'attend, et on dit laquelle manque */
      for (const S of quatre) await verifier(S.nom + ' : trois vignettes d\'autres personnes, chacune avec une image DÉCODÉE (largeur > 0) qui avance', S, () => {
        const ts = Array.from(document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]'));
        return ts.length === 3 && ts.every(t => { const vd = t.querySelector('video'); return t.dataset.camera === 'on' && !!vd && vd.videoWidth > 0 && vd.readyState >= 2; });
      }, null, 8000, async () => JSON.stringify((await tuiles(S)).filter(x => x.uid !== 'vous').map(x => [x.nom, x.camera, x.w, x.pret])));
      const t0 = await tuiles(B); await dormir(1200); const t1 = await tuiles(B);
      vrai('… et le temps de lecture des vignettes de Ben avance (une image qui bouge, pas une image fixe)', t0.filter(x => x.uid !== 'vous').every(x => { const y = t1.find(z => z.uid === x.uid); return y && y.t > x.t; }));
      const plafonds = await Promise.all(quatre.map(S => S.page.evaluate(() => window.__plafonds())));
      v('⛔ le DÉBIT est plafonné par liaison à quatre présents : 400 kbit/s en vidéo, 32 kbit/s en audio (RTCRtpSender.setParameters), sur les 3 liaisons de chaque page',
        plafonds.map(p => [p.filter(x => x.kind === 'video' && x.max === 400000).length, p.filter(x => x.kind === 'audio' && x.max === 32000).length]), quatre.map(() => [3, 3]));
      const rp = await Promise.all(quatre.map(S => maille(S)));
      vrai('les liaisons se sont établies en DIRECT (la paire retenue est locale ou réflexive, jamais « relay ») — le relais n\'a servi à personne, et ne devait pas', rp.every(l => l.length === 3 && l.every(x => ['host', 'srflx', 'prflx'].includes(x.locale))));
      vrai('Ana (l\'appelante) est l\'hôte : ses commandes d\'hôte sont là (Participants affiche des lignes à toucher), celles de Ben n\'y sont pas', await A.page.evaluate(() => { document.getElementById('salle-participants').click(); return true; }) && await verifier('… le panneau Participants d\'Ana liste des lignes à toucher', A, () => document.querySelectorAll('#salle-panneau-corps button.salle-rang[data-sa="ligne"]').length === 3, null, 6000));
      await toucher(A, '#salle-panneau-fermer');
      await toucher(B, '#salle-participants');
      await verifier('… celui de Ben (un simple participant) liste les mêmes personnes SANS ligne à toucher', B, () => document.querySelectorAll('#salle-panneau-corps .salle-rang').length >= 4 && document.querySelectorAll('#salle-panneau-corps button.salle-rang[data-sa="ligne"]').length === 0, null, 6000, async () => (await lire(B, '#salle-panneau-corps')));
      await toucher(B, '#salle-panneau-fermer');
      for (const S of quatre) await largeur(S, 'salle à quatre (' + S.pf.w + ' px)');
      await capturer(bB, '10-salle-quatre', [A, C, B]);
      /* ⛔ la salle est PLEINE : Eve, dont le téléphone sonne encore, répond après les trois autres — quatre en vidéo au plus */
      await toucher(E, '#appel-repondre');
      await verifier('⛔ Eve répond en CINQUIÈME : elle reçoit « La salle est pleine » (pas de salle pour elle, pas de micro, pas de connexion)', E, () => /salle est pleine/.test(document.getElementById('mot').textContent), null, 8000, async () => 'mot=«' + (await motVu(E)) + '»');
      const eve = await E.page.evaluate(() => ({ media: window.__media, pcs: window.__pcs.length, salle: document.documentElement.dataset.salle === '1' }));
      v('… et elle n\'a ni micro, ni connexion, ni salle', [eve.media, eve.pcs, eve.salle], [0, 0, false]);
      await sansSalle('… la sonnerie d\'Eve se ferme (la salle ne peut pas l\'accueillir), et la phrase reste lisible', E, 8000);
    });

        /* les gestes d'un panneau : ouvrir (en fermant celui qui est ouvert), fermer */
    const panneau = async (S, nom) => {
      if (await visible(S, '#salle-panneau')) { await toucher(S, '#salle-panneau-fermer'); await S.page.waitForFunction(() => document.getElementById('salle-panneau').hidden, null, { timeout: 4000 }); }
      await toucher(S, '#salle-' + nom);
      await S.page.waitForFunction(n => !document.getElementById('salle-panneau').hidden && document.getElementById('salle-' + n).getAttribute('aria-expanded') === 'true', nom, { timeout: 6000 });
    };
    const fermer = async (S) => { if (await visible(S, '#salle-panneau')) { await toucher(S, '#salle-panneau-fermer'); await S.page.waitForFunction(() => document.getElementById('salle-panneau').hidden, null, { timeout: 4000 }); } };
    const ligne = (uid) => '#salle-panneau-corps button.salle-rang[data-sa="ligne"][data-uid="' + uid + '"]';
    const geste = (act, uid) => '#salle-panneau-corps [data-sa="' + act + '"]' + (uid ? '[data-uid="' + uid + '"]' : '');
    const lireConv = async (login) => { const n = nav(login); await n.src.connexion(login, MOTS[login]); await n.src.demarrer(); try { return (await n.src.ouvrir(grp.id)).messages; } finally { n.src.arreter(); } };
    const MESURES = {};

    /* ═══ 2. QUI PARLE, LA MAIN, LES RÉACTIONS, LA DISCUSSION, L'ÉPINGLE, LE SONDAGE, LE MINUTEUR ═════════════════ */
    await bloc('2. Qui parle (le contour vert suit le micro), la main levée, les réactions, la discussion, l\'épingle, le sondage, le minuteur — chez tous', async () => {
      const allumees = async (S) => JSON.stringify((await tuiles(S)).filter(t => t.parle).map(t => t.uid.slice(0, 4)));
      for (const S of quatre) await verifier(S.nom + ' : les trois autres s\'allument (micro ouvert = contour vert)', S, () => document.querySelectorAll('#salle-scene > .salle-tuile.parle[data-uid]').length === 3, null, 12000, async () => 'allumées=' + await allumees(S));
      for (const S of [B, C, D]) await parler(S, false);
      await Promise.all([B, C, D].map(S => verifier(S.nom + ' : seule Ana reste allumée (les trois autres ont coupé leur micro)', S, (u) => { const l = Array.from(document.querySelectorAll('#salle-scene > .salle-tuile.parle[data-uid]')); return l.length === 1 && l[0].dataset.uid === u; }, id.ana, 12000, async () => 'allumées=' + await allumees(S))));
      await verifier('⛔ CONTRE-ÉPREUVE : chez Ana, plus personne n\'est allumé (on ne s\'allume pas en silence)', A, () => document.querySelectorAll('#salle-scene > .salle-tuile.parle[data-uid]').length === 0, null, 12000, async () => 'allumées=' + await allumees(A));
      await verifier('… et le micro coupé de Ben se VOIT chez Ana (l\'icône rouge sur sa vignette)', A, u => !!document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] .tuile-nom.coupe'), id.ben, 8000);
      for (const S of [B, C, D]) await parler(S, true);
      await verifier('… tout le monde reparle : les trois autres se rallument chez Ana', A, () => document.querySelectorAll('#salle-scene > .salle-tuile.parle[data-uid]').length === 3, null, 12000, async () => 'allumées=' + await allumees(A));

      /* la main levée */
      await toucher(C, '#salle-main');
      for (const S of [A, B, D]) await verifier(S.nom + ' : la main de Cleo est LEVÉE (badge sur sa vignette)', S, u => !!document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] .salle-badge.main'), id.cleo, 10000, async () => JSON.stringify((await tuiles(S)).find(t => t.uid === id.cleo)));
      await verifier('… et Cleo le voit aussi (le bouton dit « Baisser la main », enfoncé)', C, () => /Baisser/.test(document.getElementById('salle-main').textContent) && document.getElementById('salle-main').getAttribute('aria-pressed') === 'true', null, 6000);
      await toucher(C, '#salle-main');
      await verifier('… elle la baisse : le badge disparaît chez Ben', B, u => !document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] .salle-badge.main'), id.cleo, 10000);

      /* les réactions */
      await toucher(B, '#salle-reagir');
      vrai('Ben : la palette de réactions s\'ouvre (quatre réactions)', await visible(B, '#salle-emojis') && (await B.page.evaluate(() => document.querySelectorAll('#salle-emojis [data-reaction]').length)) === 4);
      await toucher(B, '#salle-emojis [data-reaction="coeur"]');
      for (const S of [A, C, D]) await verifier(S.nom + ' : le cœur de Ben monte de SA vignette', S, u => { const r = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] .salle-reaction'); return !!r && r.textContent.includes('❤'); }, id.ben, 10000);
      await verifier('… et il s\'EFFACE de lui-même (rien ne s\'accumule)', A, () => document.querySelectorAll('.salle-reaction').length === 0, null, 8000);
      vrai('… la palette se referme après le choix', !(await visible(B, '#salle-emojis')));

      /* la discussion : la conversation du groupe, le même fil */
      await panneau(A, 'discussion');
      await saisir(A, '#salle-saisie', 'Bonjour la salle');
      await A.page.locator('#salle-saisie').press('Enter'); A.gestes++;
      await verifier('Cleo (panneau fermé) : un nouveau message est annoncé sur le bouton Discussion (pastille « 1 »)', C, () => { const n = document.getElementById('salle-discussion-n'); return !n.hidden && n.textContent.trim() === '1'; }, null, 12000, async () => '«' + (await lire(C, '#salle-discussion-n')) + '» ' + (await visible(C, '#salle-discussion-n')));
      await panneau(C, 'discussion');
      await verifier('Cleo ouvre la discussion : elle lit « Bonjour la salle », signé Ana, et la pastille s\'efface', C, () => /Bonjour la salle/.test(document.getElementById('salle-fil').textContent) && /Ana/.test(document.getElementById('salle-fil').textContent) && document.getElementById('salle-discussion-n').hidden, null, 10000, async () => '«' + (await lire(C, '#salle-panneau-corps')) + '»');
      await saisir(C, '#salle-saisie', 'Bien reçu'); await C.page.locator('#salle-saisie').press('Enter'); C.gestes++;
      await verifier('Ana lit la réponse de Cleo dans la discussion de la salle', A, () => /Bien reçu/.test(document.getElementById('salle-fil').textContent), null, 10000);
      const fil = await lireConv('ben');
      v('⛔ c\'est la MÊME conversation : le groupe contient les deux messages, dans l\'ordre (la discussion de la salle n\'est pas un canal à part)', fil.filter(m => !m.systeme).slice(-2).map(m => m.texte), ['Bonjour la salle', 'Bien reçu']);
      await largeur(A, 'salle · discussion ouverte'); await largeur(C, 'salle · discussion ouverte');
      await capturer(bT, '20-discussion', [A, C]);
      await fermer(A); await fermer(C);

      /* l'épingle et la vue « intervenant » */
      await panneau(A, 'participants');
      await toucher(A, ligne(id.ben));
      await toucher(A, geste('epingler', id.ben));
      await fermer(A);
      for (const S of [C, D]) await verifier(S.nom + ' : la vignette de Ben est ÉPINGLÉE', S, u => !!document.querySelector('#salle-scene > .salle-tuile.epingle[data-uid="' + u + '"]'), id.ben, 10000);
      await toucher(C, '#salle-vue');
      await verifier('Cleo passe en vue « intervenant » : l\'épinglé (Ben) est la GRANDE vignette, les autres suivent', C, u => { const s = document.getElementById('salle-scene'); const g = s.querySelector('.salle-tuile.grand'); return s.dataset.vue === 'intervenant' && !!g && g.dataset.uid === u; }, id.ben, 8000, async () => JSON.stringify((await tuiles(C)).map(t => [t.uid.slice(0, 4), t.grand, t.epingle])));
      await largeur(C, 'salle · vue intervenant (téléphone)');
      await capturer(bT, '21-intervenant', [A, C]);
      await toucher(C, '#salle-vue');
      await verifier('… elle revient à la galerie (le bouton le dit)', C, () => document.getElementById('salle-scene').dataset.vue === 'galerie' && !document.querySelector('.salle-tuile.grand'), null, 6000);
      await panneau(A, 'participants');
      await toucher(A, ligne(id.ben));
      await toucher(A, geste('epingler', id.ben));
      await fermer(A);
      await verifier('⛔ CONTRE-ÉPREUVE : Ana RETIRE l\'épingle : plus aucune vignette n\'est épinglée chez Dan', D, () => document.querySelectorAll('.salle-tuile.epingle').length === 0, null, 10000);

      /* le sondage */
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="sondage-nouveau"]');
      await saisir(A, '#salle-sq', 'On commence ?'); await saisir(A, '#salle-sc0', 'Oui'); await saisir(A, '#salle-sc1', 'Plus tard');
      await toucher(A, '[data-sa="sondage-lancer"]');
      for (const S of [B, C, D]) await verifier(S.nom + ' : le sondage « On commence ? » est là, avec ses deux choix', S, () => { const s = document.querySelector('#salle-bandeaux .salle-sondage'); return !!s && /On commence/.test(s.textContent) && s.querySelectorAll('[data-sa="voter"]').length === 2; }, null, 10000);
      await toucher(B, '#salle-bandeaux [data-sa="voter"][data-i="0"]');
      await toucher(D, '#salle-bandeaux [data-sa="voter"][data-i="1"]');
      await verifier('⛔ le décompte est le MÊME chez tous : Ana lit un « Oui » et un « Plus tard », deux votes', A, () => { const s = document.querySelector('#salle-bandeaux .salle-sondage'); const b = s ? s.querySelectorAll('[data-sa="voter"]') : []; return b.length === 2 && b[0].textContent.trim().endsWith('1') && b[1].textContent.trim().endsWith('1') && /2 votes/.test(s.textContent); }, null, 12000, async () => '«' + (await lire(A, '#salle-bandeaux')) + '»');
      await verifier('… Ben voit son choix marqué (« Oui » enfoncé), pas celui de Dan', B, () => { const b = document.querySelectorAll('#salle-bandeaux [data-sa="voter"]'); return b[0].getAttribute('aria-pressed') === 'true' && b[1].getAttribute('aria-pressed') === 'false'; }, null, 8000);
      await verifier('… chez Cleo (qui n\'a pas voté) le décompte est le même', C, () => { const s = document.querySelector('#salle-bandeaux .salle-sondage'); return !!s && /2 votes/.test(s.textContent); }, null, 8000);
      await largeur(B, 'salle · sondage (bureau)');
      await fermer(A);
      await toucher(A, '#salle-bandeaux [data-sa="sondage-fermer"]');
      await verifier('Ana TERMINE le sondage : il est « terminé » chez Ben, et on ne peut plus voter', B, () => { const s = document.querySelector('#salle-bandeaux .salle-sondage'); return !!s && /terminé/.test(s.textContent) && Array.from(s.querySelectorAll('[data-sa="voter"]')).every(b => b.disabled); }, null, 10000);
      await toucher(B, '#salle-bandeaux [data-sa="sondage-masquer"]');
      await verifier('… Ben le masque pour lui seul', B, () => !document.querySelector('#salle-bandeaux .salle-sondage'), null, 6000);
      vrai('… Dan, lui, voit encore le sondage', await visible(D, '#salle-bandeaux .salle-sondage'));

      /* le minuteur */
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="minuteur"][data-s="60"]');
      for (const S of [B, C]) await verifier(S.nom + ' : le minuteur court (un décompte de moins d\'une minute)', S, () => { const m = document.getElementById('salle-minuteur'); return !!m && /^00:\d\d$/.test(m.textContent.trim()); }, null, 10000, async () => '«' + (await lire(S, '#salle-bandeaux')) + '»');
      await panneau(A, 'plus');
      /* 8 octobre 2026 : « le logo OP MESSAGES en design motion avec le chrono, au style 100 % Apple » */
      const mn = await B.page.evaluate(() => { const c = document.querySelector('.minuteur-carte'); if (!c) return null; const img = c.querySelector('.mn-logo img'), b = c.querySelector('#salle-minuteur'), cs = getComputedStyle(b);
        return { logo: !!img && img.complete && img.naturalWidth > 0, anneau: !!c.querySelector('.mn-reste'), p: parseFloat(c.style.getPropertyValue('--mn-p')), poids: cs.fontWeight, chiffres: cs.fontVariantNumeric, etat: c.dataset.etat, anim: getComputedStyle(img).animationName, mouvement: matchMedia('(prefers-reduced-motion: reduce)').matches }; });
      v('le minuteur façon Apple (Ben) : le logo OP MESSAGES chargé dans un anneau ENTAMÉ, chiffres fins (300) et tabulaires, état « court », le logo respire (sauf mouvement réduit)', mn && [mn.logo, mn.anneau, mn.p > 0 && mn.p < 1, mn.poids, /tabular-nums/.test(mn.chiffres), mn.etat, mn.anim === (mn.mouvement ? 'none' : 'mn-souffle')], [true, true, true, '300', true, 'court', true]);
      if (DOSSIER_CAPTURES) { await B.page.waitForTimeout(1200); await B.page.screenshot({ path: path.join(DOSSIER_CAPTURES, 'minuteur-apple.png') }); }
      await toucher(A, geste('minuteur-arreter'));
      await verifier('Ana l\'ARRÊTE : le minuteur disparaît chez Cleo', C, () => !document.getElementById('salle-minuteur'), null, 10000);
      await fermer(A);
    });

    /* ═══ 3. CE QUE COÛTE LA MAILLE À QUATRE ═══════════════════════════════════════════════════════════════════ */
    await bloc('3. Ce que coûte la maille à QUATRE en vidéo : le débit sortant et entrant d\'une page, le processeur d\'une page', async () => {
      for (const S of quatre) await parler(S, true);
      await dormir(2500);
      const lot0 = await Promise.all(quatre.map(maille)), cpu0 = [await tempsCpu(bT), await tempsCpu(bB)], h0 = Date.now();
      await dormir(10000);
      const lot1 = await Promise.all(quatre.map(maille)), cpu1 = [await tempsCpu(bT), await tempsCpu(bB)], dt = (Date.now() - h0) / 1000;
      const kbits = (o0, o1, champs) => o1.reduce((s, y) => { const x = o0.find(z => z.n === y.n); return x ? s + champs.reduce((t, c) => t + (y[c] - x[c]), 0) : s; }, 0) * 8 / 1000 / dt;
      const sortant = lot1.map((l, i) => kbits(lot0[i], l, ['audioEmis', 'videoEmis'])), entrant = lot1.map((l, i) => kbits(lot0[i], l, ['audioRecu', 'videoRecu']));
      const images = lot1.map((l, i) => l.reduce((s, y) => { const x = lot0[i].find(z => z.n === y.n); return x ? s + (y.imagesEmises - x.imagesEmises) : s; }, 0) / dt / Math.max(1, l.length));
      const proc = [0, 1].map(k => { let somme = 0, n = 0; for (const p of cpu1[k]) { if (p.type !== 'renderer') continue; const q = cpu0[k].find(z => z.id === p.id); if (q) { somme += p.cpu - q.cpu; n++; } } return { somme: somme / dt * 100, n }; });
      const moy = (t) => Math.round(t.reduce((s, x) => s + x, 0) / t.length);
      console.log('  ℹ️  MESURE (4 pages en vidéo 640×480, ' + Math.round(dt) + ' s, tous les micros ouverts) · débit SORTANT par page : ' + sortant.map(Math.round).join(' / ') + ' kbit/s (moyenne ' + moy(sortant) + ', soit ' + Math.round(moy(sortant) / 3) + ' par liaison) · ENTRANT : ' + entrant.map(Math.round).join(' / ') + ' kbit/s (moyenne ' + moy(entrant) + ') · images émises par liaison : ' + images.map(x => Math.round(x * 10) / 10).join(' / ') + ' /s');
      console.log('  ℹ️  MESURE · processeur des processus de rendu : téléphone émulé (2 pages actives) ' + Math.round(proc[0].somme) + ' % d\'un cœur au total, soit ~' + Math.round(proc[0].somme / 2) + ' % par page ; bureau (2 pages actives + Eve au repos) ' + Math.round(proc[1].somme) + ' %, soit ~' + Math.round(proc[1].somme / 2) + ' % par page (' + proc[0].n + ' + ' + proc[1].n + ' processus de rendu) — Chromium logiciel sur une machine de ' + os.cpus().length + ' cœurs');
      vrai('population : quatre pages mesurées, trois liaisons chacune, des octets réellement émis et reçus', lot1.every(l => l.length === 3) && sortant.every(x => x > 50) && entrant.every(x => x > 50));
      vrai('⛔ le plafond TIENT : le débit sortant d\'une page reste sous trois liaisons × (400 + 32) kbit/s plus 15 % d\'en-têtes (' + Math.round(3 * 432 * 1.15) + ' kbit/s) — mesuré ' + moy(sortant), sortant.every(x => x < 3 * 432 * 1.15));
      vrai('… et l\'entrant est de même ordre (chacun reçoit ce que trois autres émettent POUR LUI)', entrant.every(x => x < 3 * 432 * 1.15 && x > 50));
      MESURES.maille4 = { sortant: moy(sortant), entrant: moy(entrant), cpuTel: Math.round(proc[0].somme / 2), cpuBureau: Math.round(proc[1].somme / 2) };
    });

    /* ═══ 4. LE PARTAGE D'ÉCRAN ════════════════════════════════════════════════════════════════════════════════ */
    await bloc('4. Le partage d\'écran : Ben (bureau) partage — la piste d\'écran REMPLACE sa caméra chez les autres ; le bouton est ABSENT sur un iPhone ; l\'hôte peut l\'interdire', async () => {
      vrai('le bouton « Partager » existe au bureau et N\'EXISTE PAS sur l\'iPhone (le navigateur y dit « iPhone » : on ne l\'affiche pas)', (await visible(B, '#salle-partage')) && !(await visible(A, '#salle-partage')) && !(await visible(C, '#salle-partage')));
      const avantRatio = (await tuiles(C)).find(t => t.uid === id.ben);
      vrai('population : avant le partage, la vignette de Ben chez Cleo montre sa CAMÉRA (4:3, ' + avantRatio.w + ' px de large)', avantRatio.camera === 'on' && avantRatio.w > 0);
      await toucher(B, '#salle-partage');
      await verifier('Ben : le partage est en cours (bouton enfoncé, « Arrêter »)', B, () => document.getElementById('salle-partage').getAttribute('aria-pressed') === 'true' && /Arrêter/.test(document.getElementById('salle-partage').textContent), null, 12000, async () => 'avis=«' + (await lire(B, '#salle-avis')) + '» écrans=' + (await B.page.evaluate(() => window.__ecrans)));
      const reel = await B.page.evaluate(() => window.__ecranReel);
      console.log('  ℹ️  écran partagé : ' + (reel ? 'le VRAI getDisplayMedia de Chromium' : 'une toile qui change (ce Chromium n\'a pas d\'écran à capturer) — la piste, l\'émetteur et les autres sont les vrais'));
      await verifier('Cleo : la vignette de Ben porte un ÉCRAN partagé (badge) et son image devient 16:9 (la caméra était en 4:3)', C, u => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"]'), vd = t && t.querySelector('video'); return !!t && t.dataset.ecran === '1' && !!t.querySelector('.salle-badge') && !!vd && vd.videoWidth > 0 && vd.videoWidth / vd.videoHeight > 1.6; }, id.ben, 20000, async () => JSON.stringify((await tuiles(C)).find(t => t.uid === id.ben)));
      await verifier('Dan reçoit aussi cet écran (la piste d\'écran a remplacé la caméra sur CHAQUE liaison de Ben)', D, u => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"]'), vd = t && t.querySelector('video'); return !!t && t.dataset.ecran === '1' && !!vd && vd.videoWidth / vd.videoHeight > 1.6; }, id.ben, 20000, async () => JSON.stringify((await tuiles(D)).find(t => t.uid === id.ben)));
      const cr = await croit(C, { ms: 2000 });
      vrai('… et les images de Ben MONTENT chez Cleo pendant le partage (le flux vit)', cr.images);
      await largeur(B, 'salle · je partage mon écran (bureau)'); await largeur(C, 'salle · quelqu\'un partage (téléphone)');
      await capturer(bT, '30-partage', [C, A]);
      await toucher(B, '#salle-partage');
      await verifier('Ben ARRÊTE : sa caméra REVIENT chez Cleo (4:3, plus d\'écran)', C, u => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"]'), vd = t && t.querySelector('video'); return !!t && t.dataset.ecran === '0' && !!vd && vd.videoWidth > 0 && vd.videoWidth / vd.videoHeight < 1.5; }, id.ben, 20000, async () => JSON.stringify((await tuiles(C)).find(t => t.uid === id.ben)));
      /* l'hôte interdit le partage : le bouton de Dan est grisé, le geste ne demande RIEN au navigateur */
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="partage-ok"]');
      await verifier('Ana INTERDIT le partage des participants : le bouton de Dan est grisé', D, () => document.getElementById('salle-partage').getAttribute('aria-disabled') === 'true', null, 10000);
      const avant = await D.page.evaluate(() => window.__ecrans);
      await toucher(D, '#salle-partage', { force: true });
      await verifier('… Dan touche quand même : la page DIT que l\'hôte ne l\'autorise pas', D, () => /n'autorise pas le partage/.test(document.getElementById('salle-avis').textContent), null, 6000, async () => '«' + (await lire(D, '#salle-avis')) + '»');
      v('⛔ … et le navigateur de Dan n\'a reçu AUCUNE demande d\'écran', [await D.page.evaluate(() => window.__ecrans)], [avant]);
      await toucher(A, '[data-sa="partage-ok"]');
      await verifier('Ana le RÉAUTORISE : le bouton de Dan se dégrise', D, () => document.getElementById('salle-partage').getAttribute('aria-disabled') === 'false', null, 10000);
      await fermer(A);
    });

    /* ═══ 5. L'HÔTE ════════════════════════════════════════════════════════════════════════════════════════════ */
    let appelId = null;
    await bloc('5. L\'hôte : tout couper, un seul micro, co-hôte, exclusion (l\'exclu ne revient pas), verrou, salle d\'attente', async () => {
      appelId = await A.page.evaluate(() => history.state && history.state.r && history.state.r.appel);
      vrai('population : l\'identifiant de l\'appel est lu dans la route d\'Ana', typeof appelId === 'string' && appelId.length > 6);
      /* « tout couper » : une DEMANDE que les pages honorent */
      await panneau(A, 'participants');
      await toucher(A, geste('couper-tous'));
      for (const S of [B, C, D]) await verifier(S.nom + ' : son micro est COUPÉ (la demande est honorée) et le bandeau le dit', S, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true' && /demandé à tous de couper/.test(document.getElementById('salle-bandeaux').textContent), null, 12000, async () => 'micro=' + (await S.page.evaluate(() => document.getElementById('salle-micro').getAttribute('aria-pressed'))) + ' bandeaux=«' + (await lire(S, '#salle-bandeaux')) + '»');
      v('… Ana, qui a demandé, n\'est PAS coupée (la demande va aux autres)', [await A.page.evaluate(() => document.getElementById('salle-micro').getAttribute('aria-pressed'))], ['false']);
      await toucher(B, '#salle-bandeaux [data-sa="micro-rouvrir"]');
      await verifier('Ben RÉACTIVE son micro d\'un geste (le bandeau s\'efface, sa vignette n\'est plus « coupée » chez Ana)', A, u => !document.querySelector('#salle-scene > .salle-tuile[data-uid="' + u + '"] .tuile-nom.coupe'), id.ben, 12000);
      vrai('… Cleo et Dan restent coupés (la demande ne se rejoue pas)', (await tuiles(A)).filter(t => [id.cleo, id.dan].includes(t.uid)).every(t => t.coupe));
      await toucher(C, '#salle-bandeaux [data-sa="micro-ok"]'); await parler(C, true); await parler(D, true);
      /* un seul micro */
      await toucher(A, ligne(id.dan));
      await toucher(A, geste('couper', id.dan));
      await verifier('Ana demande à Dan seul : son micro se coupe, le bandeau le NOMME (« Ana a coupé ton micro »)', D, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true' && /Ana a coupé ton micro/.test(document.getElementById('salle-bandeaux').textContent), null, 12000, async () => '«' + (await lire(D, '#salle-bandeaux')) + '»');
      vrai('… Cleo, elle, n\'est pas touchée', (await C.page.evaluate(() => document.getElementById('salle-micro').getAttribute('aria-pressed'))) === 'false');
      await toucher(D, '#salle-bandeaux [data-sa="micro-rouvrir"]');
      /* le co-hôte */
      await toucher(A, ligne(id.ben));
      await toucher(A, geste('cohote', id.ben));
      await fermer(A);
      await panneau(B, 'participants');
      await verifier('Ana nomme Ben CO-HÔTE : il voit désormais des lignes à toucher dans Participants (les gestes d\'hôte)', B, () => document.querySelectorAll('#salle-panneau-corps button.salle-rang[data-sa="ligne"]').length === 3, null, 10000, async () => '«' + (await lire(B, '#salle-panneau-corps')) + '»');
      await fermer(B);
      await panneau(B, 'plus');
      vrai('… son panneau « Plus » porte la Sécurité, pas « Terminer pour tous » (réservé à l\'hôte seul)', (await visible(B, '[data-sa="verrou"]')) && !(await visible(B, '[data-sa="terminer-demander"]')));
      await fermer(B);

      /* l'exclusion — par le co-hôte */
      await panneau(B, 'participants');
      await toucher(B, ligne(id.dan));
      await toucher(B, geste('retirer-demander', id.dan));
      await verifier('Ben (co-hôte) demande à retirer Dan : une CONFIRMATION nomme ce que ça fait (« ne pourra plus y revenir »)', B, () => /ne pourra plus y revenir/.test(document.getElementById('salle-panneau-corps').textContent), null, 6000);
      await toucher(B, geste('retirer-confirmer', id.dan));
      await verifier('⛔ Dan est RETIRÉ : sa salle se ferme, la phrase de l\'hôte est dite', D, () => !document.documentElement.dataset.salle && /t'a retiré/.test(document.getElementById('mot').textContent), null, 12000, async () => 'salle=' + (await salleOuverte(D)) + ' mot=«' + (await motVu(D)) + '»');
      await fermer(B);
      for (const S of [A, B, C]) await verifier(S.nom + ' : la vignette de Dan a disparu (deux autres personnes restent)', S, () => document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === 2, null, 12000);
      const dm = await maille(D);
      vrai('⛔ Dan ne reçoit plus RIEN : toutes ses connexions sont fermées (le détecteur de « la voix passe » rend FAUX chez lui — la contre-épreuve du détecteur)', dm.length === 0 && !(await croit(D, { ms: 600 })).audio);
      const nd = nav('dan'); await nd.src.connexion('dan', MOTS.dan); await nd.src.demarrer();
      let refus = null; try { await nd.src.rejoindreAppel(appelId); } catch (e) { refus = e; }
      nd.src.arreter();
      v('⛔ l\'exclu NE REVIENT PAS : le service lui répond « exclu » avec la phrase de l\'hôte', [refus && refus.code, refus && refus.phrase && refus.phrase()], ['exclu', 'L\'hôte t\'a retiré de cette salle : tu ne peux pas y revenir.']);
      await largeur(A, 'salle à trois (après l\'exclusion)');

      /* le verrou */
      await ouvrirConv(E, 'Équipe salle');
      await verifier('Eve (dans la conversation du groupe) : la bannière « Appel en cours · 3 participants » propose d\'entrer', E, () => { const b = document.getElementById('conv-salle'); return !b.hidden && /Appel en cours/.test(b.textContent) && /3 participants/.test(b.textContent); }, null, 12000, async () => 'bannière=«' + (await lire(E, '#conv-salle')) + '» visible=' + (await visible(E, '#conv-salle')));
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="verrou"]');
      await verifier('Ana VERROUILLE la salle (l\'interrupteur est allumé)', A, () => document.querySelector('[data-sa="verrou"]').getAttribute('aria-checked') === 'true', null, 8000);
      await fermer(A);
      await toucher(E, '#conv-salle');
      await verifier('⛔ la salle verrouillée : Eve reçoit la phrase du refus, et n\'entre pas', E, () => /verrouillé la salle/.test(document.getElementById('mot').textContent) && document.documentElement.dataset.salle !== '1', null, 10000, async () => 'mot=«' + (await motVu(E)) + '» salle=' + (await salleOuverte(E)));
      v('… sans micro ni connexion', [await E.page.evaluate(() => window.__media), await E.page.evaluate(() => window.__pcs.length)], [0, 0]);
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="verrou"]');
      await toucher(A, '[data-sa="attente"]');
      await fermer(A);
      /* la salle d'attente */
      await toucher(E, '#conv-salle');
      await verifier('⛔ la salle D\'ATTENTE : Eve voit « Salle d\'attente » (pas de grille, pas de commandes), sans micro ni caméra', E, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').hasAttribute('data-attente') && /Salle d'attente/.test(document.getElementById('salle-scene').textContent), null, 12000, async () => 'salle=' + (await salleOuverte(E)) + ' mot=«' + (await motVu(E)) + '» scène=«' + (await lire(E, '#salle-scene')) + '»');
      v('… population : aucun micro demandé, aucune connexion, les commandes cachées', [await E.page.evaluate(() => window.__media), await E.page.evaluate(() => window.__pcs.length), await visible(E, '#salle-cmds') || await visible(E, '.salle-cmds'), await visible(E, '#salle-micro')], [0, 0, false, false]);
      await largeur(E, 'salle d\'attente (bureau)');
      await verifier('Ana : « Eve attend d\'être admis. » (bandeau) et la pastille « 1 » sur Participants', A, () => /Eve attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent) && document.getElementById('salle-participants-n').textContent.trim() === '1', null, 12000, async () => '«' + (await lire(A, '#salle-bandeaux')) + '»');
      await panneau(A, 'participants');
      await toucher(A, geste('refuser', id.eve));
      await verifier('⛔ Ana REFUSE : Eve est renvoyée avec la phrase de l\'hôte', E, () => document.documentElement.dataset.salle !== '1' && /pas accepté ta demande/.test(document.getElementById('mot').textContent), null, 12000, async () => 'mot=«' + (await motVu(E)) + '» salle=' + (await salleOuverte(E)));
      await fermer(A);
      await toucher(E, '#conv-salle');
      await verifier('Eve redemande : elle attend de nouveau', E, () => document.getElementById('salle-ecran').hasAttribute('data-attente') && document.documentElement.dataset.salle === '1', null, 12000);
      await verifier('Ana : le bandeau propose « Admettre » (un seul geste)', A, () => !!document.querySelector('#salle-bandeaux [data-sa="admettre"]'), null, 12000);
      await toucher(A, '#salle-bandeaux [data-sa="admettre"]');
      await dansLaSalle(E, 3);
      await liaisons(E, 3);
      const em = await E.page.evaluate(() => window.__media);
      vrai('⛔ Eve est ADMISE : le micro et la caméra ne sont demandés qu\'à ce moment-là (avant : zéro), et ses trois liaisons passent', em > 0 && (await croit(E, { ms: 2000 })).audio);
      await panneau(A, 'plus');
      await toucher(A, '[data-sa="attente"]');
      await fermer(A);
    });

    /* ═══ 6. L'ENREGISTREMENT LOCAL ════════════════════════════════════════════════════════════════════════════ */
    await bloc('6. L\'enregistrement LOCAL de l\'hôte : le bandeau « REC » chez tous, un fichier lu par ffprobe (image et voix), la tonalité retrouvée par Goertzel', async () => {
      if (!ffAvailable()) { console.log('  ⚠️  NON VÉRIFIÉ : ffprobe/ffmpeg absents — l\'enregistrement n\'est pas jugé (il faut alors le MASQUER, jamais le laisser).'); return; }
      for (const S of [A, B, C, E]) await parler(S, true);
      vrai('population : le bouton « Enregistrer » existe pour l\'hôte (Ana) et pour le co-hôte (Ben), PAS pour Cleo', (await visible(A, '#salle-rec-btn')) && (await visible(B, '#salle-rec-btn')) && !(await visible(C, '#salle-rec-btn')));
      await toucher(A, '#salle-rec-btn');
      for (const S of [A, B, C, E]) await verifier(S.nom + ' : le bandeau « REC » est là', S, () => !document.getElementById('salle-rec').hidden && /REC/.test(document.getElementById('salle-rec').textContent), null, 12000, async () => 'rec=«' + (await lire(S, '#salle-rec')) + '» caché=' + !(await visible(S, '#salle-rec')));
      vrai('… et Ben (co-hôte) ne peut pas enregistrer en même temps : son bouton dit QUI enregistre', await verifier('… le bouton de Ben', B, () => /Enregistré par/.test(document.getElementById('salle-rec-btn').textContent) && document.getElementById('salle-rec-btn').getAttribute('aria-disabled') === 'true', null, 8000, async () => '«' + (await lire(B, '#salle-rec-btn')) + '»'));
      await largeur(C, 'salle · REC (téléphone)');
      await dormir(7000);
      /* depuis le 7 octobre 2026, l'arrêt ouvre la carte « Enregistrement terminé » (l'envoyer aux absents, le garder, le supprimer) : le fichier se range par « Enregistrer sur cet appareil » */
      await toucher(A, '#salle-rec-btn');
      await verifier('Ana : l\'arrêt ouvre la carte « Enregistrement terminé »', A, () => !document.getElementById('rec-fin').hidden, null, 15000);
      const [dl] = await Promise.all([A.page.waitForEvent('download', { timeout: 30000 }), A.page.locator('#rec-fin-garder').click()]);
      await verifier('… « Enregistrer sur cet appareil » ferme la carte (elle ne couvre plus les commandes de la salle)', A, () => document.getElementById('rec-fin').hidden, null, 6000);
      const fichier = path.join(dir, 'enregistrement.webm'); await dl.saveAs(fichier);
      const J = jugerFichier(fichier);
      console.log('  ℹ️  fichier : ' + dl.suggestedFilename() + ' · ' + fs.statSync(fichier).size + ' octets · ' + J.codecs + ' · ' + (Math.round(J.duree * 10) / 10) + ' s · luminance moyenne ' + J.luminance + ' sur ' + J.images + ' images · Goertzel 440 Hz ' + (Math.round(J.g440 * 10000) / 10000) + ' contre ses voisins ' + (Math.round(J.g1000 * 10000) / 10000));
      v('⛔ le fichier est LISIBLE : un flux image et un flux voix', [J.video, J.audio], [1, 1]);
      vrai('… il dure ce qu\'on a enregistré (au moins quatre secondes — mesuré ' + (Math.round(J.duree * 10) / 10) + ' s)', J.duree >= 4);
      vrai('⛔ … la voix y est : la tonalité de 440 Hz domine (Goertzel ' + (Math.round(J.g440 * 10000) / 10000) + ') ses voisins 330, 550, 1000 et 2000 Hz (' + (Math.round(J.g1000 * 10000) / 10000) + ') — au moins huit fois plus (le traitement de la voix du navigateur atténue une tonalité constante : on juge ce qu\'elle DOMINE, pas son amplitude)', J.echantillons > 30000 && J.g440 > 0.002 && J.g440 > 8 * J.g1000);
      vrai('… l\'image n\'est pas noire (luminance moyenne ' + J.luminance + ' sur ' + J.images + ' images)', J.images > 20 && J.luminance > 15);
      for (const S of [B, C, E]) await verifier(S.nom + ' : le bandeau « REC » s\'éteint à l\'arrêt', S, () => document.getElementById('salle-rec').hidden, null, 12000);
    });

    /* ═══ 7. L'HÔTE QUI PART ═══════════════════════════════════════════════════════════════════════════════════ */
    await bloc('7. L\'hôte qui part : le rôle passe au co-hôte, « Terminer pour tous » met fin à la salle', async () => {
      await toucher(A, '#salle-quitter');
      await verifier('Ana (l\'hôte) touche « Quitter » : on lui demande — partir (le rôle passe) ou terminer pour tous', A, () => !document.getElementById('salle-panneau').hidden && !!document.querySelector('[data-sa="quitter-simple"]') && !!document.querySelector('[data-sa="terminer-confirmer"]'), null, 6000, async () => '«' + (await lire(A, '#salle-panneau-corps')) + '»');
      await largeur(A, 'salle · l\'hôte quitte (téléphone)');
      await toucher(A, '[data-sa="quitter-simple"]');
      await sansSalle('Ana a quitté : sa salle se ferme', A);
      for (const S of [B, C, E]) await verifier(S.nom + ' : la salle continue à deux autres', S, () => document.documentElement.dataset.salle === '1' && document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === 2, null, 15000);
      await panneau(B, 'plus');
      await verifier('⛔ le rôle PASSE : Ben (co-hôte, le plus ancien) est maintenant l\'hôte — « Terminer pour tous » apparaît chez lui', B, () => !!document.querySelector('[data-sa="terminer-demander"]'), null, 12000, async () => '«' + (await lire(B, '#salle-panneau-corps')) + '»');
      await fermer(B);
      vrai('… et pas chez Cleo (qui n\'est rien de plus qu\'une participante)', !(await (async () => { await panneau(C, 'plus'); const r = await visible(C, '[data-sa="terminer-demander"]'); await fermer(C); return r; })()));
      await toucher(B, '#salle-quitter');
      await toucher(B, '[data-sa="terminer-confirmer"]');
      for (const S of [B, C, E]) await sansSalle(S.nom + ' : la salle est TERMINÉE pour tous', S, 15000);
      vrai('… Cleo lit pourquoi', /mis fin|terminé/.test((await motVu(C)) || ''));
      await verifier('plus aucune connexion ni aucune piste vivante nulle part (le micro et la caméra sont libérés)', C, () => window.__pcs.every(pc => pc.signalingState === 'closed') && window.__pistes.every(t => t.readyState === 'ended'), null, 12000, async () => JSON.stringify(await C.page.evaluate(() => ({ pcs: window.__pcs.map(pc => pc.signalingState), pistes: window.__pistes.map(t => t.kind + ':' + t.readyState) }))));
      for (const S of [A, B, D, E]) vrai(S.nom + ' : toutes ses pistes sont arrêtées', await S.page.evaluate(() => window.__pistes.every(t => t.readyState === 'ended')));
    });

    /* ═══ 8. UNE RÉUNION PROGRAMMÉE ════════════════════════════════════════════════════════════════════════════ */
    await bloc('8. Une réunion PROGRAMMÉE : « Rejoindre » dans l\'agenda et dans la fiche, la salle d\'attente demandée, le lien d\'invité (renouvelé : l\'ancien meurt)', async () => {
      const quand = (ms) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(Date.now() + ms)).replace(' ', 'T');
      await toutQuitter(tous);
      const nb = nav('ben'); await nb.src.connexion('ben', MOTS.ben); await nb.src.demarrer();
      const r = await nb.src.programmer({ titre: 'Point salle', lieu: '', debut: quand(5 * 60000), fin: quand(65 * 60000), tz: 'Europe/Paris', repetition: 'aucune', rappels: [], invites: [id.ana, id.cleo], notifier: false, salle_attente: true });
      const codeAncien = await nb.src.lienReunion(r.id);
      vrai('population : la réunion « Point salle » commence dans cinq minutes (la salle est ouverte quinze minutes avant), avec salle d\'attente, deux invités, et un lien d\'invité', typeof r.id === 'string' && typeof codeAncien === 'string' && codeAncien.length >= 20);
      /* sur un téléphone, la barre d'onglets se cache pendant qu'une CONVERSATION est ouverte (Ana a lancé l'appel depuis celle du groupe) : on revient à la liste */
      const entrerAgenda = async (S) => { await allerA(S, 'reunions'); await verifier(S.nom + ' : l\'agenda du jour montre « Point salle » avec un « Rejoindre »', S, () => !!document.querySelector('#liste-reunions .reunion-rejoindre') && /Point salle/.test(document.getElementById('liste-reunions').textContent), null, 12000, async () => '«' + (await lire(S, '#liste-reunions')) + '»'); };
      /* Ben, l'organisateur : « Rejoindre » dans l'agenda */
      await entrerAgenda(B);
      await largeur(B, 'agenda · Rejoindre (bureau)');
      await toucher(B, '#liste-reunions .reunion-rejoindre');
      await verifier('Ben entre : la salle « Point salle » s\'ouvre, il en est l\'hôte', B, () => document.documentElement.dataset.salle === '1' && /Point salle/.test(document.getElementById('salle-titre').textContent), null, 14000, async () => 'mot=«' + (await motVu(B)) + '» salle=' + (await salleOuverte(B)));
      /* Ana, invitée : la FICHE */
      await entrerAgenda(A);
      await toucher(A, '#liste-reunions [data-reunion]');
      await verifier('Ana ouvre la fiche : « Rejoindre » (vidéo) et « Rejoindre en audio » sont là', A, () => !!document.querySelector('#info-corps [data-reu="rejoindre"][data-type="video"]') && !!document.querySelector('#info-corps [data-reu="rejoindre"][data-type="audio"]'), null, 12000, async () => '«' + (await lire(A, '#info-corps')) + '»');
      await largeur(A, 'fiche d\'une réunion · Rejoindre (téléphone)');
      const m0 = await A.page.evaluate(() => window.__media);
      await toucher(A, '#info-corps [data-reu="rejoindre"][data-type="video"]');
      await verifier('⛔ la salle d\'attente est demandée : Ana attend d\'être admise (pas de grille, pas de commandes)', A, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').hasAttribute('data-attente'), null, 14000, async () => 'mot=«' + (await motVu(A)) + '» salle=' + (await salleOuverte(A)));
      v('… et elle n\'a demandé NI micro NI caméra pour l\'instant', [await A.page.evaluate(() => window.__media)], [m0]);
      await verifier('Ben : « Ana Banc attend d\'être admis. » — il l\'admet d\'un geste', B, () => /Ana attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent), null, 12000, async () => '«' + (await lire(B, '#salle-bandeaux')) + '»');
      await toucher(B, '#salle-bandeaux [data-sa="admettre"]');
      await dansLaSalle(A, 1);
      await Promise.all([A, B].map(S => liaisons(S, 1)));
      vrai('… Ana est admise, la voix passe entre eux', (await croit(A, { ms: 1800 })).audio && (await croit(B, { ms: 600 })).audio);
      /* Cleo, invitée : l'AGENDA */
      await entrerAgenda(C);
      await toucher(C, '#liste-reunions .reunion-rejoindre');
      await verifier('Cleo, par le « Rejoindre » de l\'agenda : elle attend aussi', C, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').hasAttribute('data-attente'), null, 14000);
      await verifier('Ben : le bandeau de Cleo', B, () => /Cleo attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent), null, 12000);
      await toucher(B, '#salle-bandeaux [data-sa="admettre"]');
      await dansLaSalle(C, 2);
      await Promise.all([A, B, C].map(S => liaisons(S, 2)));
      /* le LIEN d'invité : Dan, qui n'est pas invité, l'ouvre dans une page DÉJÀ ouverte (seul le fragment change) */
      await D.page.evaluate((c) => { location.hash = '#reunion=' + c; }, codeAncien);
      await verifier('⛔ Dan, qui n\'est pas invité, ouvre le lien dans sa page déjà ouverte : la feuille montre « Point salle » avec l\'heure', D, () => { const f = document.getElementById('feuille'); return f.dataset.mode === 'invite-reunion' && !f.inert && /Point salle/.test(document.querySelector('.invite-carte h3') ? document.querySelector('.invite-carte h3').textContent : ''); }, null, 14000, async () => 'mode=' + (await D.page.evaluate(() => document.getElementById('feuille').dataset.mode)) + ' corps=«' + (await lire(D, '#info-corps')) + '»');
      vrai('… le code du lien n\'est plus dans l\'adresse ni dans l\'historique (la route est revenue)', !/reunion=/.test(await D.page.evaluate(() => location.href)));
      vrai('… elle dit que la salle d\'attente existe', /laissera entrer/.test(await lire(D, '#info-corps')));
      await largeur(D, 'lien d\'invité · aperçu (bureau)');
      await toucher(D, '#info-corps [data-reu="invite-rejoindre"][data-type="audio"]');
      await verifier('Dan rejoint par le lien : il attend lui aussi (salle d\'attente)', D, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').hasAttribute('data-attente'), null, 14000, async () => 'mot=«' + (await motVu(D)) + '»');
      await verifier('Ben : le bandeau de Dan', B, () => /Dan attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent), null, 12000);
      await toucher(B, '#salle-bandeaux [data-sa="admettre"]');
      await dansLaSalle(D, 3);
      await Promise.all([A, B, C, D].map(S => liaisons(S, 3)));
      vrai('… quatre pages dans la salle de la réunion, trois liaisons chacune, la voix passe', (await croit(D, { ms: 2000 })).audio);
      await capturer(bB, '40-reunion', [B, D, C]);
      /* la fin, et la fiche de l'hôte : le lien se copie, se renouvelle */
      await toucher(B, '#salle-quitter');
      await toucher(B, '[data-sa="terminer-confirmer"]');
      for (const S of [A, B, C, D]) await sansSalle(S.nom + ' : la réunion est terminée pour lui', S, 15000);
      await toucher(B, 'a[data-vue="reunions"]');
      await toucher(B, '#liste-reunions [data-reunion]');
      await verifier('Ben ouvre sa fiche : la Salle (interrupteur « Salle d\'attente » allumé, copier / renouveler le lien) est là', B, () => !!document.querySelector('#info-corps [data-reu="attente"][aria-checked="true"]') && !!document.querySelector('#info-corps [data-reu="lien-copier"]') && !!document.querySelector('#info-corps [data-reu="lien-renouveler"]'), null, 12000, async () => '«' + (await lire(B, '#info-corps')) + '»');
      await largeur(B, 'fiche de l\'organisateur · Salle (bureau)');
      await toucher(B, '#info-corps [data-reu="lien-copier"]');
      await verifier('« Copier le lien d\'invité » : la page le dit', B, () => /Lien d'invité copié/.test(document.getElementById('mot').textContent), null, 8000, async () => '«' + (await motVu(B)) + '»');
      const presse = await B.page.evaluate(() => navigator.clipboard.readText().catch(() => null));
      v('… et le presse-papiers porte le lien (adresse de la page + #reunion=<code>)', [/#reunion=[A-Za-z0-9_-]{20,64}$/.test(presse || ''), (presse || '').includes(codeAncien)], [true, true]);
      await toucher(B, '#info-corps [data-reu="lien-renouveler"]');
      await verifier('« Renouveler le lien » : la page dit que l\'ancien ne marche plus', B, () => /ancien ne marche plus/.test(document.getElementById('mot').textContent), null, 8000, async () => '«' + (await motVu(B)) + '»');
      const codeNouveau = await nb.src.lienReunion(r.id);
      v('⛔ le lien a CHANGÉ (le code n\'est plus le même), et c\'est le nouveau que le presse-papiers porte', [codeNouveau !== codeAncien, ((await B.page.evaluate(() => navigator.clipboard.readText().catch(() => ''))) || '').includes(codeNouveau)], [true, true]);
      nb.src.arreter();
      /* l'ancien lien est MORT, le nouveau montre la réunion — dans une page qui charge de zéro */
      await E.page.goto('about:blank'); await E.page.goto(base + '/#reunion=' + codeAncien);
      await verifier('⛔ Eve ouvre l\'ANCIEN lien : « ce lien n\'est plus valable »', E, () => { const f = document.getElementById('feuille'); return f.dataset.mode === 'invite-reunion' && /n'est plus valable/.test(document.getElementById('info-corps').textContent); }, null, 16000, async () => 'mode=' + (await E.page.evaluate(() => (document.getElementById('feuille') || {}).dataset && document.getElementById('feuille').dataset.mode)) + ' corps=«' + (await lire(E, '#info-corps')) + '»');
      await E.page.goto('about:blank'); await E.page.goto(base + '/#reunion=' + codeNouveau);
      await verifier('… le NOUVEAU lien montre la réunion', E, () => /Point salle/.test((document.querySelector('.invite-carte h3') || {}).textContent || ''), null, 16000, async () => '«' + (await lire(E, '#info-corps')) + '»');
      /* quelqu'un qui n'a pas de session : la connexion DIT à quelle réunion le lien mène */
      const X = await ouvrir(bB, base, PROFILS.bureau, { nom: 'Visiteur', login: 'visiteur' });
      try {
        await X.page.goto(base + '/#reunion=' + codeNouveau);
        await verifier('Un visiteur sans session : l\'écran de connexion dit « Tu es invité à « Point salle » »', X, () => !document.getElementById('connexion').hidden && !document.getElementById('connexion-invite').hidden && /Point salle/.test(document.getElementById('connexion-invite').textContent), null, 14000, async () => 'invite=«' + (await lire(X, '#connexion-invite')) + '»');
        v('… et il n\'apprend RIEN d\'autre que le titre et l\'heure (aucun nom de participant dans la page)', [/Ana|Ben|Cleo|Dan|Eve/.test(await lire(X, '#connexion'))], [false]);
      } finally { await X.ctx.close(); }
    });

    /* ═══ 9. LA MISE EN PAGE, LES TEXTES, LES ERREURS ══════════════════════════════════════════════════════════ */
    await bloc('9. La mise en page, les textes et les erreurs — sur toute la sonde', async () => {
      v('⛔ ' + mesures.ecrans + ' écrans de la salle mesurés deux fois (' + mesures.population + ' éléments examinés) : aucun ne déborde de la largeur posée', mesures.debordements, []);
      vrai('population : des écrans ont été mesurés aux DEUX largeurs (390 et 1280 px), au moins douze', mesures.ecrans >= 12 && mesures.largeurs.has(390) && mesures.largeurs.has(1280));
      const textes = [...mesures.textes];
      const connus = ['Quitter', 'Micro', 'Caméra', 'Participants', 'Réagir', 'Lever la main', 'Salle d\'attente'].filter(m => textes.some(t => t.includes(m)));
      vrai('population : ' + textes.length + ' textes relevés sur les écrans de la salle, dont les commandes (' + connus.join(', ') + ')', textes.length >= 40 && connus.length === 7);
      v('⛔ aucun « undefined », « null », « NaN » ni « [object » dans ce que la salle dit', textes.filter(t => /undefined|\bnull\b|\bNaN\b|\[object|\{\{/.test(t)), []);
      v('⛔ aucun mot anglais dans ce que la salle dit (commandes, avis, panneaux, bandeaux)', textes.filter(t => /\b(mute|unmute|leave|join|raise hand|share screen|settings|loading|error|cancel|waiting room|host|guest|hang ?up|microphone|camera on|camera off|participant list|end meeting)\b/i.test(t)), []);
      /* les refus que la sonde a PROVOQUÉS (salle pleine, verrouillée, exclu, lien mort) sont journalisés par Chrome ; ils sont nommés, tout le reste est une erreur */
      const attendu = (x) => /status of (403|404|409|410|423)\b.*\[\/api\/(ice|appels\/[^\]]*|salles\/[^\]]*|reunions\/[^\]]*)\]/.test(x);
      const refusVus = tous.reduce((s, S) => s + S.console.filter(attendu).length, 0);
      for (const S of tous) S.console = S.console.filter(x => !attendu(x));
      vrai('population : les refus provoqués (salle pleine, verrouillée, exclu, ancien lien) sont bien passés par le navigateur — ' + refusVus + ' relevés, nommés puis écartés', refusVus >= 3);
      v('⛔ aucune erreur JavaScript, aucune autre erreur de console dans les cinq pages sur toute la sonde (population : ' + tous.reduce((s, S) => s + S.gestes, 0) + ' gestes portés)', tous.map(S => S.erreurs.concat(S.console)), tous.map(() => []));
      console.log('\n── MESURES de la maille à quatre (vidéo) : débit sortant par page ' + (MESURES.maille4 ? MESURES.maille4.sortant + ' kbit/s, entrant ' + MESURES.maille4.entrant + ' kbit/s, processeur ~' + MESURES.maille4.cpuTel + ' % (téléphone émulé) / ~' + MESURES.maille4.cpuBureau + ' % (bureau) d\'un cœur par page' : '(non mesuré)') + ' ──');
    });

    /* ═══ 10 ET 11. LE RELAIS EN VRAI : ce qu'une réunion FORCÉE par coturn consomme d'allocations ══════════════════════════════════════════ */
    /* La maille ouvre UNE liaison par paire : si aucun trajet direct n'existe (un réseau qui bloque l'UDP, un NAT symétrique), chaque liaison passe par le relais, et chaque liaison relayée DEMANDE des allocations à
       coturn (le navigateur en ouvre une par adresse de relais). Le quota par personne (`user-quota`) et la capacité (`total-quota`) sont ceux de PRODUCTION (`install-turn.sh`). Cette mesure ne dit pas « tout passe » :
       elle dit COMBIEN, et si le quota suffit. */
    const mesureRelais = async (titre, pages, lancer, nParLiaison) => {
      const P = coturn.constantes;
      await toutQuitter(pages);
      const repos = await attendreRepos(coturn, 100000);
      vrai('population : coturn est au repos avant la mesure (aucune allocation tenue par les personnes de la sonde' + (repos.attente > 0.5 ? ' — attendu ' + repos.attente + ' s' : '') + ')', repos.ok);
      const debut = coturn.journal().length;
      for (const S of pages) await S.page.evaluate(() => { window.__relaisSeul = true; });
      await lancer();
      const t0 = Date.now();
      const n = pages.length - 1;
      const prets = await Promise.all(pages.map(S => attendre(S, k => window.__pcs.filter(pc => pc.signalingState !== 'closed' && pc.connectionState === 'connected').length === k, n, 70000)));
      const duree = Math.round((Date.now() - t0) / 100) / 10;
      await dormir(3000);
      const lies = await Promise.all(pages.map(S => maille(S)));
      const journal = coturn.journal().slice(debut), alloc = lireAllocations(journal), refus = refusAllocations(journal);
      if (process.env.DEBUG_ALLOC) fs.writeFileSync(process.env.DEBUG_ALLOC, journal.split('\n').filter(l => /session \d+|ALLOCATE|Refresh|transport|origin/.test(l)).join('\n') + '\n' + JSON.stringify(await pages[0].page.evaluate(() => ({ confs: window.__confs, cands: window.__cands.filter(c => c[1] === 'relay' || c[1] === 'srflx'), pcs: window.__pcs.map(pc => [pc.__n, pc.connectionState, pc.iceConnectionState]) }))));          // de quoi COMPTER, ligne par ligne, ce que chaque liaison ouvre, et les configurations que la page a posées
      const uids = pages.map(S => id[S.login]);
      const lignes = uids.map((u, i) => { const a = alloc.get(u) || { total: 0, pic: 0 }; return pages[i].login + ' ' + a.total + ' (pic ' + a.pic + ')'; });
      const total = uids.reduce((s, u) => s + ((alloc.get(u) || { total: 0 }).total), 0), pic = uids.reduce((s, u) => s + ((alloc.get(u) || { pic: 0 }).pic), 0);
      const relayees = lies.reduce((s, l) => s + l.filter(x => x.locale === 'relay' && x.etat === 'connected').length, 0);
      console.log('  ℹ️  MESURE · ' + titre + ' : ' + relayees + '/' + pages.length * n + ' liaisons établies PAR LE RELAIS en ' + duree + ' s · allocations par personne (au total, pic simultané) : ' + lignes.join(', ') + ' · en tout ' + total + ' ouvertes (pic ' + pic + ' à la fois) sur les ' + P.totalQuota + ' que le relais porte · ' + refus + ' refusée(s) (486) · quota par personne ' + P.userQuota + (nParLiaison ? ' · ' + Math.round(10 * total / (pages.length * n)) / 10 + ' allocation(s) par liaison' : ''));
      MESURES[titre] = { relayees, attendues: pages.length * n, total, pic, refus, parPersonne: uids.map(u => (alloc.get(u) || { total: 0 }).total), duree };
      vrai('population : la réunion forcée par le relais a vraiment ouvert des allocations chez coturn', total > 0 && relayees > 0);
      vrai('⛔ toutes les liaisons (' + pages.length * n + ') s\'établissent par le RELAIS, sans une allocation refusée par le quota (' + relayees + '/' + pages.length * n + ', ' + refus + ' refus)', relayees === pages.length * n && refus === 0 && prets.every(Boolean));
      vrai('⛔ le quota par personne (' + P.userQuota + ') tient : personne n\'en a tenu plus de ' + P.userQuota + ' à la fois (pic ' + Math.max(...uids.map(u => (alloc.get(u) || { pic: 0 }).pic)) + ')', uids.every(u => ((alloc.get(u) || { pic: 0 }).pic) <= P.userQuota));
      return MESURES[titre];
    };
    const finirAppel = async (pages) => {
      for (const S of pages) { if (await S.page.evaluate(() => !!document.documentElement.dataset.salle)) { await toucher(S, '#salle-quitter'); if (await visible(S, '[data-sa="quitter-simple"]')) await toucher(S, '[data-sa="quitter-simple"]'); } }
      for (const S of pages) await sansSalle(S.nom + ' a quitté', S, 15000);
      for (const S of pages) await S.page.evaluate(() => { window.__relaisSeul = false; });
    };
    if (AVEC_RELAIS) await bloc('10. Le RELAIS : une réunion à QUATRE en vidéo FORCÉE par coturn (aucun trajet direct) — ce qu\'elle ouvre d\'allocations, quota de production', async () => {
      if (!coturn) { console.log('  ⚠️  NON VÉRIFIÉ : `turnserver` n\'est pas installé — le relais n\'est pas éprouvé.'); return; }
      await mesureRelais('quatre en vidéo', quatre, async () => {
        await ouvrirConv(A, 'Équipe salle');
        await toucher(A, '#conv-cam');
        for (const S of [B, C, D]) await repondre(S);
      }, true);
      const aud = await Promise.all(quatre.map(S => croit(S, { ms: 2500 })));
      vrai('… et la voix ET l\'image passent par le relais (octets audio et images décodées qui montent, par liaison, sur les quatre pages)', aud.every(c => c.audio && c.images));
      await largeur(A, 'salle à quatre par le relais');
      await finirAppel(quatre);
      await ouvrirConv(E, 'Équipe salle').catch(() => {});
    });
    if (AVEC_RELAIS) await bloc('11. Le RELAIS : une réunion à SIX en audio FORCÉE par coturn — cinq liaisons par personne', async () => {
      if (!coturn) return;
      const F = await ouvrir(bT, base, PROFILS.telephone, { nom: NOMS.fay, login: 'fay' });
      try {
        await connecter(F, 'fay'); F.console.length = 0;
        const six = [A, B, C, D, E, F];
        await mesureRelais('six en audio', six, async () => {
          await allerA(A, 'appels');
          await toucher(A, '#btn-nouvel-appel');
          await A.page.waitForFunction(() => document.getElementById('feuille').dataset.mode === 'appel' && !document.getElementById('feuille').inert, null, { timeout: 6000 });
          for (const nom of [NOMS.ben, NOMS.cleo, NOMS.dan, NOMS.eve, NOMS.fay]) await toucher(A, '#g-contacts .contact:has(.contact-nom:text-is("' + nom + '"))');
          v('« Nouvel appel » à plusieurs : cinq personnes choisies, le résumé les compte', [await lire(A, '#g-resume')], ['5 participants']);
          await toucher(A, '#g-creer');
          for (const S of [B, C, D, E, F]) await repondre(S);
        }, true);
        const aud = await Promise.all(six.map(S => croit(S, { ms: 2500 })));
        vrai('… et la voix passe par le relais sur les cinq liaisons des six pages', aud.every(c => c.audio && c.n === 5));
        await finirAppel(six);
      } finally { await F.ctx.close(); }
    });

    /*@@BLOCS@@*/
  } finally {
    for (const b of navigateurs) { try { await b.close(); } catch (e) { /* déjà fermé */ } }
    if (svc) await svc.arreter();
    if (coturn) await coturn.arreter();
    if (og) await og.fermer();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* rien */ }
  }
  fin();
})().catch((e) => { console.log('  ✗ la sonde a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
