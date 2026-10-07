/* ══ SONDE DE BOUT EN BOUT — LES APPELS À DEUX, LA VRAIE PAGE SERVIE, DE VRAIS NAVIGATEURS, DE LA VRAIE VOIX ═══════════════════════════════════════════════════
   `tests/test-984.js` fait parler le module de la page au vrai service avec une FAUSSE connexion pair à pair. Cette sonde joue la VRAIE PAGE (`server-msg/public/`, générée depuis l'interface de Justin)
   dans DEUX navigateurs Chromium — un téléphone (393 px, au doigt) et un bureau (1280 px, à la souris) — contre le VRAI service (`server-msg/index.js`), un OP GESTION factice pour la porte bêta,
   et, si `turnserver` est installé, un VRAI coturn. La pile WebRTC est la vraie ; le micro et la caméra sont ceux que Chromium fabrique (une tonalité, un damier qui bouge).

   Ce qu'elle prouve, et que rien d'autre ne peut prouver :
     · la VOIX passe : les octets audio reçus CROISSENT des deux côtés (`getStats`), l'élément audio de la page joue le flux de l'autre, la durée court ;
     · la caméra de l'un devient l'image de l'autre (les images sont décodées : `framesDecoded` croît), et son extinction ramène l'appel à l'audio ;
     · l'appel ENTRANT sonne dans la page de l'autre, quelle que soit la vue ouverte (une conversation) : Refuser / Répondre, aucune demande de micro ni de caméra avant la réponse, une sonnerie qui s'arrête ;
     · refuser, annuler, sans réponse : chaque issue DITE (« a refusé l'appel », « Pas de réponse. », « Appel manqué. ») et l'historique des deux mis à jour ;
     · raccrocher libère le micro et la caméra : TOUTE piste fabriquée par `getUserMedia` est « ended » à la fin, de chaque côté, par quel que soit le chemin (raccrocher, refuser, l'autre raccroche) ;
     · la page qu'on FERME raccroche (le raccrochage part par `keepalive`) : l'autre ne reste pas 45 s dans le vide ;
     · deux onglets d'une même session : un seul prend l'appel, l'autre le laisse sans créer de connexion ;
     · le RELAIS : forcé (`iceTransportPolicy: 'relay'`, seul moyen de ne PAS passer en direct), la voix passe VRAIMENT par le vrai coturn avec les identifiants du vrai service — la paire retenue est « relay » ;
     · ⛔ le PARE-FEU SORTANT du relais, TRAVERSÉ par ce vrai appel (relecture, I2) : quand la machine le permet (root, `iptables`, `setpriv`, l'utilisateur `turnserver`), le vrai script de production pose de vraies règles,
       coturn tourne sous l'utilisateur qu'elles visent, et l'appel relayé des deux côtés ne perd pas un paquet (aucun refus ; des paquets comptés par la règle des ports de relais et par celle des ports d'écoute) —
       sinon « NON VÉRIFIÉ », jamais vert ; `SONDE_PARE_FEU=non` l'écarte, pour comparer ;
     · la mise en page des écrans d'appel, aux deux largeurs, mesurée deux fois et contre la largeur POSÉE.
   Chaque contre-épreuve est jouée : le détecteur de « la voix passe » rend FAUX sur la connexion fermée du même appel, le détecteur de « relais » rend FAUX sur l'appel direct.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Tout se passe sur 127.0.0.1. Jamais plus de DEUX navigateurs à la fois, tous tués à la fin (même sur erreur).

   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-appels.js
              … --rapide       (tout sauf le bloc 3, la vidéo — pour les mutations : une minute et demie de moins)
              CAPTURES=/dossier   (les deux écrans côte à côte aux étapes clés)   ·   SEULEMENT=1,5   (ne joue que ces blocs : pour chercher, jamais pour conclure)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). Sans coturn : le relais est « NON VÉRIFIÉ » (dit, jamais vert). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-appels.js'); process.exit(2); }
}
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const V = require(path.join(T.SERVICE, 'outils', 'verifier-relais.js'));
const CHROME = '/opt/pw-browsers/chromium';
const RAPIDE = process.argv.includes('--rapide');
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
/* de la vraie voix et de la vraie image fabriquées par Chromium ; la boucle locale est permise aux candidats (un conteneur n'a qu'une adresse) et les adresses ne sont pas masquées par mDNS (un conteneur ne le résout pas) */
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];

const PROFILS = {
  telephone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1280', w: 1280, h: 800, dpr: 1, mobile: false, insets: null },
};
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc' };

/* ── l'ouverture d'une page : un contexte NEUF (ses propres cookies, ses propres autorisations) par personne ──
   Chaque page note ce que le navigateur fabrique : les pistes de `getUserMedia` (pour prouver qu'elles sont toutes ARRÊTÉES à la fin), les connexions pair à pair et leur configuration (les identifiants du
   relais arrivent-ils intacts ?), les contextes audio de la sonnerie (créés, puis fermés ?). `window.__relaisSeul` force la politique « relay » (le seul moyen de prouver le relais : l'application n'en a pas
   d'autre). Rien de tout cela ne change ce que la page FAIT : les enveloppes rendent exactement ce que rendent les originaux. */
async function ouvrir(b, base, pf, o) {
  const ctx = o.ctx || await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile,
    colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera'], baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  const S = { ctx, page, pf, nom: o.nom, base, erreurs: [], console: [], gestes: 0 };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') { let u = ''; try { u = /Failed to load resource/.test(m.text()) ? ' [' + new URL(m.location().url).pathname + ']' : ''; } catch (e) { /* sans adresse */ } S.console.push((m.text() + u).slice(0, 240)); } });          // l'adresse du fichier qui a échoué est dite : « Failed to load resource » seul n'accuse personne
  await page.addInitScript(() => {
    window.__media = 0; window.__pistes = []; window.__pcs = []; window.__confs = []; window.__setConfs = []; window.__ctx = { crees: 0, fermes: 0 }; window.__relaisSeul = false; window.__vibre = 0; window.__iceErreurs = []; window.__ajouts = []; window.__contraintes = []; window.__deuxCameras = false;
    try {
      const md = navigator.mediaDevices, g = md.getUserMedia.bind(md);
      md.getUserMedia = async function (c) { window.__media++; window.__contraintes.push(JSON.stringify(c)); const f = await g(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
      /* le NOMBRE de caméras est celui que la sonde décide : UNE par défaut, DEUX (avant et arrière) quand `__deuxCameras` — le navigateur de la sonde n'a qu'une fausse caméra */
      const ed = md.enumerateDevices.bind(md);
      md.enumerateDevices = async function () {
        const l = await ed(), autres = l.filter(d => d.kind !== 'videoinput'), une = l.filter(d => d.kind === 'videoinput')[0] || { kind: 'videoinput', deviceId: 'camera-sonde', label: 'Caméra (sonde)', groupId: 'groupe-sonde' };
        return autres.concat(window.__deuxCameras ? [une, { kind: 'videoinput', deviceId: 'camera-arriere-sonde', label: 'Caméra arrière (sonde)', groupId: 'groupe-arriere-sonde' }] : [une]);
      };
    } catch (e) { /* rien */ }
    /* de quoi RETENIR la requête « répondre » : la sonnerie doit s'arrêter au toucher, pas à la réponse du service (quelques dizaines de millisecondes plus tard, où une autre ligne l'arrête aussi) */
    const f0 = window.fetch;
    window.fetch = function (u, o) {
      if (window.__retenirReponse && /\/repondre$/.test(String((u && u.url) || u))) return new Promise((ok, ko) => { window.__lacherReponse = () => { window.__lacherReponse = null; f0.call(window, u, o).then(ok, ko); }; });
      return f0.apply(this, arguments);
    };
    const PC = window.RTCPeerConnection;
    if (PC) {
      const Faux = function (conf, ...r) {
        conf = Object.assign({}, conf);
        window.__confs.push(JSON.parse(JSON.stringify(conf)));
        if (window.__relaisSeul) conf.iceTransportPolicy = 'relay';
        const pc = new PC(conf, ...r); window.__pcs.push(pc);
        /* ⛔ `setConfiguration` (le renouvellement des identifiants du relais) redonne une configuration SANS la politique « relay » que la sonde a forcée à la construction : la sonde la lui remet, sinon le renouvellement se
           jouerait avec une politique que le test n'a jamais voulue (et les configurations posées sont relevées dans `__setConfs`) */
        const poser = pc.setConfiguration.bind(pc);
        pc.setConfiguration = function (c2) { window.__setConfs.push(JSON.parse(JSON.stringify(c2 || {}))); const d = Object.assign({}, c2); if (window.__relaisSeul) d.iceTransportPolicy = 'relay'; return poser(d); };
        const ajout = pc.addIceCandidate.bind(pc);
        pc.addIceCandidate = async function (c) { try { const r = await ajout(c); window.__ajouts.push({ ok: true, c: String(c && c.candidate).slice(0, 90) }); return r; } catch (e) { window.__ajouts.push({ ok: false, c: String(c && c.candidate).slice(0, 90), e: String(e && e.message).slice(0, 80) }); throw e; } };
        pc.addEventListener('icecandidateerror', (e) => { window.__iceErreurs.push({ url: e.url, code: e.errorCode, texte: e.errorText, adresse: e.address, port: e.port }); });
        return pc;
      };
      Faux.prototype = PC.prototype; Object.setPrototypeOf(Faux, PC); window.RTCPeerConnection = Faux;
    }
    const AC = window.AudioContext;
    if (AC) window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__ctx.crees++; } close() { window.__ctx.fermes++; return super.close(); } };
    try { const vib = navigator.vibrate ? navigator.vibrate.bind(navigator) : null; navigator.vibrate = function (p) { if (p && (Array.isArray(p) || p > 0)) window.__vibre++; return vib ? vib(p) : true; }; } catch (e) { /* rien */ }
    /* l'état de la voix : les octets REÇUS et ÉMIS de la dernière connexion, les images décodées, la paire retenue — lus par la sonde, jamais écrits */
    /* le détail de ce que la liaison a essayé : candidats locaux et distants, paires et leur état, erreurs des serveurs — de quoi dire POURQUOI une liaison ne s'établit pas */
    window.__diag = async () => {
      const pc = window.__pcs[window.__pcs.length - 1]; if (!pc) return { pc: false };
      const rapport = await pc.getStats(), loc = [], dist = [], paires = [];
      rapport.forEach(s => {
        if (s.type === 'local-candidate') loc.push((s.candidateType || '?') + ' ' + (s.protocol || '') + ' ' + (s.address || s.ip || '?') + ':' + (s.port || '?') + (s.relayProtocol ? ' via ' + s.relayProtocol : '') + (s.url ? ' [' + s.url + ']' : ''));
        if (s.type === 'remote-candidate') dist.push((s.candidateType || '?') + ' ' + (s.protocol || '') + ' ' + (s.address || s.ip || '?') + ':' + (s.port || '?'));
        if (s.type === 'candidate-pair') paires.push(s.state + (s.nominated ? '*' : '') + ' ' + s.localCandidateId + '→' + s.remoteCandidateId);
      });
      return { etat: pc.iceConnectionState, collecte: pc.iceGatheringState, signalisation: pc.signalingState, locaux: loc, distants: dist, paires, erreursIce: window.__iceErreurs.slice(0, 6), ajouts: window.__ajouts.slice(0, 8) };
    };
    window.__stats = async () => {
      const pc = window.__pcs[window.__pcs.length - 1];
      const o = { pc: !!pc, etat: pc ? pc.iceConnectionState : null, audioRecu: 0, audioEmis: 0, videoRecu: 0, images: 0, paire: null, locale: null, distante: null };
      if (!pc) return o;
      let rapport; try { rapport = await pc.getStats(); } catch (e) { return o; }
      const tout = {}; rapport.forEach(s => { tout[s.id] = s; });
      rapport.forEach(s => {
        if (s.type === 'inbound-rtp' && s.kind === 'audio') o.audioRecu = s.bytesReceived || 0;
        if (s.type === 'outbound-rtp' && s.kind === 'audio') o.audioEmis = s.bytesSent || 0;
        if (s.type === 'inbound-rtp' && s.kind === 'video') { o.videoRecu = s.bytesReceived || 0; o.images = s.framesDecoded || 0; }
      });
      let paire = null;
      rapport.forEach(s => { if (s.type === 'transport' && s.selectedCandidatePairId && tout[s.selectedCandidatePairId]) paire = tout[s.selectedCandidatePairId]; });
      if (!paire) rapport.forEach(s => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') paire = s; });
      if (paire) { o.paire = paire.state; o.locale = (tout[paire.localCandidateId] || {}).candidateType || null; o.distante = (tout[paire.remoteCandidateId] || {}).candidateType || null; o.brute = { l: paire.localCandidateId, r: paire.remoteCandidateId, connus: Object.keys(tout).filter(k => /candidate/i.test(tout[k].type)).slice(0, 12).join(',') }; }
      return o;
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
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  try { if (S.pf.mobile) await loc.tap(); else await loc.click(); }
  catch (e) { throw new Error(String(e.message).split('\n')[0] + ' — ' + sel.slice(0, 90)); }
}
async function saisir(S, sel, texte) { await S.page.locator(sel).fill(texte); S.gestes++; }
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]);
  await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
}
async function onglet(S, vue) { if (vue === 'reglages' && await S.page.evaluate(() => { const s = document.getElementById('vue-reglages'); return !!s && !s.hidden && s.getClientRects().length > 0; })) return;   /* déjà dans le Profil (une rubrique ouverte) : « Profil » n'est plus un onglet (7 octobre 2026), et la rubrique se choisit d'ici */ await toucher(S, 'a[data-vue="' + vue + '"]'); await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 }).catch(() => {}); }
const stats = (S) => S.page.evaluate(() => window.__stats());
/* la paire retenue se lit quand le navigateur l'a nommée : « connecté » arrive un instant avant que les statistiques sachent laquelle (mesuré : un côté la rendait vide) — on attend qu'elle ait un type */
async function paire(S) { let s = null; for (let i = 0; i < 50; i++) { s = await stats(S); if (s.locale) return s; await dormir(100); } return s; }
const diag = (S) => S.page.evaluate(() => window.__diag()).then(d => JSON.stringify(d).slice(0, 1800)).catch(() => '?');
/* la voix passe : les octets reçus CROISSENT entre deux lectures (et, avec `video`, les images décodées aussi) */
async function croit(S, o) {
  const a = await stats(S); await dormir((o && o.ms) || 1300); const b = await stats(S);
  return { audio: b.audioRecu > a.audioRecu && b.audioRecu > 0, emis: b.audioEmis > a.audioEmis, images: b.images > a.images && b.images > 0, avant: a, apres: b };
}
const pistesVivantes = (S) => S.page.evaluate(() => ({ total: window.__pistes.length, vivantes: window.__pistes.filter(t => t.readyState === 'live').length, genres: window.__pistes.filter(t => t.readyState === 'live').map(t => t.kind) }));
const ecranAppel = (S) => visible(S, '#appel-ecran');
const motVu = (S) => lire(S, '#mot');
/* un « ecran d'appel fermé » : la page a quitté la couche appel et rien d'autre ne la recouvre */
const attendreFermeture = (titre, S, ms) => verifier(titre, S, () => !document.documentElement.dataset.appel, null, ms || 12000, async () => 'écran=' + (await ecranAppel(S)) + ' statut=«' + (await lire(S, '#appel-statut')) + '»');

/* la largeur d'un écran, deux fois, contre la largeur POSÉE */
const mesures = { ecrans: 0, population: 0, debordements: [], largeurs: new Set(), textes: new Set() };
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    const dep = document.documentElement.scrollWidth; window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    const hors = Array.from(document.querySelectorAll('#appel-ecran *')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length;
    /* les textes que la personne lit (et ceux que lit un lecteur d'écran : étiquettes, infobulles) de l'écran d'appel, de la liste des appels et des avis */
    const textes = [];
    for (const e of document.querySelectorAll('#appel-ecran, #appel-ecran *, #liste-appels, #liste-appels *, #mot, #annonce-appel')) {
      for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) textes.push(n.textContent.replace(/\s+/g, ' ').trim());
      for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute && e.getAttribute(a); if (v) textes.push(v); }
    }
    return { dep, sx, n: document.querySelectorAll('#appel-ecran *').length, hors, textes };
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
  const ctx = await b.newContext({ viewport: { width: Math.min(2400, imgs.reduce((s, i) => s + i.w, 0) + 60 * imgs.length), height: Math.max(...imgs.map(i => i.h)) + 70 } });
  const p = await ctx.newPage();
  await p.setContent('<body style="margin:0;background:#1c1c1e;color:#fff;font:14px system-ui;display:flex;gap:24px;padding:16px;align-items:flex-start">' +
    imgs.map(i => '<figure style="margin:0"><figcaption style="margin-bottom:6px">' + i.nom.replace(/</g, '&lt;') + '</figcaption><img style="width:' + i.w + 'px;border-radius:12px;display:block" src="data:image/png;base64,' + i.data + '"></figure>').join('') + '</body>');
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '.png'), fullPage: true });
  await ctx.close();
}

/* L'adresse de cette machine hors boucle locale (celle d'`eth0`) : ⛔ UN RELAIS SUR 127.0.0.1 NE SERT À RIEN À UN NAVIGATEUR — coturn refuse par défaut les pairs en boucle locale, et la pile WebRTC ne forme aucune paire avec
   un candidat distant en boucle locale (mesuré : quatre candidats « relay » récoltés de chaque côté, échangés, ajoutés, zéro paire). Le relais de la sonde écoute donc sur l'adresse de la machine. */
const adresseLocale = () => { for (const l of Object.values(os.networkInterfaces())) for (const i of l || []) if (i.family === 'IPv4' && !i.internal) return i.address; return null; };
/* Les plafonds et les plages refusées de PRODUCTION, lus dans le script qui les pose : la sonde joue les appels avec EUX (un plafond trop juste pour un appel — le renouvellement qui alloue de nouveau pendant que
   l'ancienne allocation vit encore — se verrait ici, et nulle part ailleurs). */
function constantesRelais() {
  const sh = fs.readFileSync(path.join(T.SERVICE, 'install-turn.sh'), 'utf8');
  const n = (k) => Number((new RegExp('^' + k + '=(\\d+)', 'm').exec(sh) || [])[1]);
  const refuses = Array.from(/REFUSES=\(\n([\s\S]*?)\n\)/.exec(sh)[1].matchAll(/"([^"]+)"/g)).map(m => m[1]);
  return { userQuota: n('USER_QUOTA'), totalQuota: n('TOTAL_QUOTA'), maxBps: n('MAX_BPS'), bpsCapacite: n('BPS_CAPACITE'), refuses };
}
/* Ce que coturn a VU, d'après son journal bavard (`verbose`) : par personne, combien d'allocations ont été ouvertes en tout et combien l'étaient AU MÊME INSTANT au plus (le pic) — « new » ouvre, « closed » ferme. */
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
/* Les allocations que le quota ou la capacité de coturn ont REFUSÉES (486 « Allocation Quota Reached ») : ce qu'un plafond trop juste ferait, en silence, au navigateur (il n'aurait simplement pas de relais). */
const refusAllocations = (texte) => String(texte).split('\n').filter(l => /ALLOCATE processed, error 486/.test(l)).length;
/* ⛔ UNE MESURE DE « CE QUE CET APPEL OUVRE » PART D'UN RELAIS AU REPOS. OBSERVÉ dans le journal bavard de coturn (cause non établie : une page vide qui ouvre et ferme des connexions ne le reproduit pas) : certaines allocations
   que Chromium vient de RENDRE (Refresh lifetime=0) ne sont refermées que 47 à 55 s plus tard, par le chien de garde de coturn (« allocation watchdog determined stale session state »), et comptent dans le quota de la
   personne pendant ce temps — les sessions concernées avaient reçu un paquet d'un pair. Un bloc qui compte les allocations d'UN appel, lancé juste après trois autres, voyait donc la deuxième REFUSÉE (486) : [1, 2, 1] au lieu
   de [2, 2, 0], une fois sur deux. On attend donc que le journal ne montre plus aucune allocation tenue par ces personnes, et on le DIT. */
async function attendreRepos(coturn, ids, ms) {
  const t0 = Date.now();
  const tenues = () => { const m = lireAllocations(coturn.journal()); return ids.reduce((s, id) => s + ((m.get(id) || { courant: 0 }).courant), 0); };
  let n = tenues();
  while (n > 0 && Date.now() - t0 < (ms || 80000)) { await dormir(500); n = tenues(); }
  return { ok: n === 0, restantes: n, attente: Math.round((Date.now() - t0) / 100) / 10 };
}
/* ⛔ LE PARE-FEU SORTANT DU RELAIS, EN VRAI (relecture du gardien, I2). Quand la machine le permet (root, `iptables`, `setpriv`, l'utilisateur `turnserver`), le VRAI script de production pose de VRAIES règles et coturn
   tourne SOUS l'utilisateur qu'elles visent : un appel relayé des deux côtés, par de vrais navigateurs, doit passer à travers — aucun paquet refusé, des paquets comptés par la règle des ports de relais (relais ↔ relais)
   ET par celle des ports d'écoute (la réponse de coturn à ses clients). Sinon la sonde le DIT (NON VÉRIFIÉ), jamais vert. SONDE_PARE_FEU=non l'écarte (pour comparer). */
const PARE_FEU = path.join(T.SERVICE, 'turn-pare-feu.sh');
const sys = (cmd, args, env) => spawnSync(cmd, args, { encoding: 'utf8', env: env || process.env });
const pareFeuPossible = () => process.env.SONDE_PARE_FEU !== 'non' && typeof process.getuid === 'function' && process.getuid() === 0 && sys('iptables', ['-S', 'OUTPUT']).status === 0
  && sys('setpriv', ['--version']).status === 0 && sys('id', ['-u', 'turnserver']).status === 0;
/* Les paquets que chaque règle de la chaîne a vus depuis sa pose, règle par règle (jamais « un total ») : { externe, relais, ecoute, refus, regles } d'après `iptables -L … -v -n -x`. null si la chaîne n'existe pas. */
function compteursPareFeu() {
  const r = sys('iptables', ['-L', 'OPMSG-TURN', '-v', '-n', '-x']);
  if (r.status !== 0) return null;
  const k = { externe: 0, relais: 0, ecoute: 0, refus: 0, regles: 0 };
  for (const l of String(r.stdout).split('\n')) {
    const m = /^\s*(\d+)\s+\d+\s+(RETURN|DROP)\s/.exec(l); if (!m) continue;
    k.regles++;
    const n = Number(m[1]);
    if (m[2] === 'DROP') k.refus += n; else if (/ADDRTYPE/.test(l)) k.externe += n; else if (/dpts:/.test(l)) k.relais += n; else if (/sports/.test(l)) k.ecoute += n;
  }
  return k;
}
/* ── un VRAI coturn, pour la sonde seulement : la configuration de PRODUCTION (plafonds et plages refusées lus dans `install-turn.sh`), sur l'adresse de la machine ── */
async function demarrerCoturn(dir, secret, ip) {
  const bin = fs.existsSync('/usr/bin/turnserver') ? '/usr/bin/turnserver' : null;
  if (!bin || !ip) return null;
  const port = await T.portLibre();
  const P = constantesRelais(), journal = process.env.JOURNAL_COTURN || path.join(dir, 'coturn-sonde.log');          // JOURNAL_COTURN=/fichier : garder le journal bavard de coturn pour l'étudier
  /* ⛔ AVEC LES PLAFONDS ET LES PLAGES REFUSÉES DE PRODUCTION (`install-turn.sh`) : un appel doit tenir dedans, renouvellement compris. Le journal bavard n'existe que dans ce bac (celui de production est vers /dev/null). */
  const conf = ['listening-port=' + port, 'listening-ip=' + ip, 'relay-ip=' + ip, 'min-port=49400', 'max-port=49500', 'realm=sonde.opmsg', 'use-auth-secret', 'static-auth-secret=' + secret,
    'no-tls', 'no-dtls', 'no-cli', 'no-tcp-relay', 'fingerprint', 'no-software-attribute', 'user-quota=' + P.userQuota, 'total-quota=' + P.totalQuota, 'max-bps=' + P.maxBps, 'bps-capacity=' + P.bpsCapacite,
    ...P.refuses.map(r => 'denied-peer-ip=' + r), 'verbose', 'log-file=' + journal, 'no-stdout-log', 'simple-log', ''].join('\n');
  const f = path.join(dir, 'coturn-sonde.conf');
  /* le pare-feu d'abord (comme systemd : `ExecStartPre`), coturn ensuite, SOUS l'utilisateur que les règles visent ; les fichiers de la sonde deviennent lisibles (et le journal inscriptible) par lui */
  const pareFeu = pareFeuPossible() ? { env: Object.assign({}, process.env, { OPMSG_TURN_PORT_MIN: '49400', OPMSG_TURN_PORT_MAX: '49500', OPMSG_TURN_PORTS_ECOUTE: port + ',' + (port + 1) }), pose: false, sortie: '' } : null;
  if (pareFeu) {
    const r = sys('bash', [PARE_FEU, 'start'], pareFeu.env);
    pareFeu.pose = r.status === 0; pareFeu.sortie = String(r.stdout || '') + String(r.stderr || '');
    process.on('exit', () => { sys('bash', [PARE_FEU, 'stop'], pareFeu.env); });          // même quand la sonde meurt sur son délai global : aucune règle ne reste dans le noyau
    fs.chmodSync(dir, 0o755);
  }
  fs.writeFileSync(f, conf, { mode: pareFeu ? 0o644 : 0o600 }); fs.writeFileSync(journal, '');
  if (pareFeu) fs.chmodSync(journal, 0o666);
  const lancer = () => pareFeu && pareFeu.pose ? spawn('setpriv', ['--reuid=turnserver', '--regid=turnserver', '--clear-groups', bin, '-c', f, '--pidfile='], { stdio: 'ignore' }) : spawn(bin, ['-c', f, '--pidfile='], { stdio: 'ignore' });
  let proc = null, mort = null;
  const demarrer = () => { const p = lancer(); proc = p; mort = null; p.on('exit', (c) => { if (p === proc) mort = c; }); };
  const sonPret = () => T.attendre(async () => {
    if (mort !== null) return 'mort';
    try { const l = await V.ouvrir({ hote: ip, port, transport: 'udp' }); const m = await l.echange(V.message(0x0001, [], crypto.randomBytes(12), null), 600); l.fermer(); return !!m && m.type === 0x0101; } catch (e) { return false; }
  }, 8000, 150);
  demarrer();
  const pret = await sonPret();
  if (pret !== true) { try { proc.kill('SIGKILL'); } catch (e) { /* rien */ } if (pareFeu) sys('bash', [PARE_FEU, 'stop'], pareFeu.env); return null; }
  return { port, ip, pareFeu, journal: () => { try { return fs.readFileSync(journal, 'utf8'); } catch (e) { return ''; } },
    arreter: async () => { if (mort === null) { proc.kill('SIGTERM'); await T.attendre(() => mort !== null, 3000); if (mort === null) proc.kill('SIGKILL'); } if (pareFeu) sys('bash', [PARE_FEU, 'stop'], pareFeu.env); },
    /* `systemctl restart coturn` : toutes les allocations tombent d'un coup ; le pare-feu est retiré à l'arrêt puis reposé au démarrage (ExecStopPost, ExecStartPre) ; la même configuration, le même port */
    redemarrer: async () => {
      if (mort === null) { proc.kill('SIGTERM'); await T.attendre(() => mort !== null, 3000); if (mort === null) proc.kill('SIGKILL'); await T.attendre(() => mort !== null, 3000); }
      if (pareFeu) { sys('bash', [PARE_FEU, 'stop'], pareFeu.env); pareFeu.pose = sys('bash', [PARE_FEU, 'start'], pareFeu.env).status === 0; }
      demarrer();
      return (await sonPret()) === true;
    } };
}

setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (420 s)'); process.exit(1); }, 420000).unref();

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-appels-'));
  const SECRET = crypto.randomBytes(24).toString('hex');
  const navigateurs = [];
  let og = null, svc = null, coturn = null;
  const SEUL = (process.env.SEULEMENT || '').split(',').filter(Boolean);          // SEULEMENT=1,5 : ne joue que ces blocs (pour chercher, jamais pour conclure)
  const bloc = async (titre, fn) => {
    if (SEUL.length && !SEUL.includes(titre.split('.')[0])) return;
    console.log('\n' + titre);
    try { await fn(); } catch (e) { v(titre + ' : le bloc est allé jusqu\'au bout', 'EXCEPTION : ' + String(e && e.message || e).split('\n').filter(Boolean).slice(0, 4).join(' | ').slice(0, 520), 'sans exception'); }
  };
  try {
    coturn = await demarrerCoturn(dir, SECRET, adresseLocale());
    og = await T.fauxOpGestion({ ana: { pass: MOTS.ana, nom: NOMS.ana, actif: true }, ben: { pass: MOTS.ben, nom: NOMS.ben, actif: true }, cleo: { pass: MOTS.cleo, nom: NOMS.cleo, actif: true } });
    const appels = { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600, iceParHeure: 900, signalMax: 2000 };
    if (coturn) appels.relais = { secret: SECRET, hote: coturn.ip, port: coturn.port, ttlS: 60 };          // UNE minute (quinze en production) : le renouvellement, aux trois quarts de leur vie, tombe à 45 s d'appel — le bloc 5 bis le joue
    svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { appels } });
    const base = svc.base;

    /* les deux personnes sont contacts (par l'API : le parcours du lien a sa propre sonde) */
    const nav = (login) => { const n = T.navigateur(base); const src = creerSourceServeur({ OPMSG, base, fetch: n.fetch, EventSource: n.EventSource, navigateur: { priseEnCharge: () => ({ ok: false }), permission: () => 'default', visible: () => true, surMessage() {}, abonnementActuel: async () => null }, attente: () => 60 }); return { src, login }; };
    const na = nav('ana'), nb = nav('ben'), nc = nav('cleo');
    await na.src.connexion('ana', MOTS.ana); await na.src.demarrer(); await nb.src.connexion('ben', MOTS.ben); await nb.src.demarrer(); await nc.src.connexion('cleo', MOTS.cleo); await nc.src.demarrer();
    const lien = await na.src.lienContact(); await nb.src.accepterLien(lien.code);
    const lienC = await na.src.lienContact(); await nc.src.accepterLien(lienC.code);
    const lienBC = await nb.src.lienContact(); await nc.src.accepterLien(lienBC.code);
    const idAna = na.src.moi().id, idBen = nb.src.moi().id, idCleo = nc.src.moi().id;
    await na.src.conversationPour([idBen]);                            // la conversation directe existe : Ben l'ouvrira avant que l'appel n'arrive
    await na.src.creerGroupe({ nom: 'Équipe appels', membres: [idBen, idCleo] });         // un GROUPE : on n'y appelle pas encore
    na.src.arreter(); nb.src.arreter(); nc.src.arreter();

    console.log('\n── sonde des appels · ' + (coturn ? 'coturn réel sur ' + coturn.ip + ':' + coturn.port + (coturn.pareFeu ? ' SOUS LE PARE-FEU DU RELAIS' : '') : 'SANS coturn (le relais est NON VÉRIFIÉ)') + ' · ' + (RAPIDE ? 'rapide' : 'complète') + ' ──');
    if (coturn && coturn.pareFeu) {
      const k = compteursPareFeu();
      vrai('⛔ population : le pare-feu sortant du relais est DANS LE NOYAU (le VRAI script, de VRAIES règles — quatre —, relues par `verifier`) et coturn tourne SOUS l\'utilisateur qu\'elles visent' + (coturn.pareFeu.pose ? '' : ' — ' + coturn.pareFeu.sortie.trim()),
        coturn.pareFeu.pose && sys('bash', [PARE_FEU, 'verifier'], coturn.pareFeu.env).status === 0 && !!k && k.regles === 4);
    } else if (coturn) console.log('  ⚠️  NON VÉRIFIÉ : le pare-feu sortant du relais demande root, `iptables`, `setpriv` et l\'utilisateur `turnserver` — les appels relayés de cette sonde ne l\'ont pas traversé.');
    const bT = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bT);
    const bB = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); navigateurs.push(bB);
    let A = await ouvrir(bT, base, PROFILS.telephone, { nom: NOMS.ana });
    let B = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.ben });
    await connecter(A, 'ana'); await connecter(B, 'ben');
    A.console.length = 0; B.console.length = 0;                          // avant la session, la page lit /api/moi et reçoit 401 : c'est ce que le navigateur journalise, et c'est normal
    vrai('population : les deux personnes sont connectées dans deux navigateurs (un téléphone au doigt, un bureau à la souris)', (await lire(A, '#moi-nom')).includes('Ana') && (await lire(B, '#moi-nom')).includes('Ben') && A.pf.mobile && !B.pf.mobile);

    /* le geste qui lance un appel depuis l'onglet « Appels » : « Nouvel appel », un contact, audio ou vidéo, « Appeler » */
    let feuilleVue = false;
    const appeler = async (S, nomAutre, type) => {
      await onglet(S, 'appels');
      await toucher(S, '#btn-nouvel-appel');
      await S.page.waitForFunction(() => document.getElementById('feuille').dataset.mode === 'appel' && !document.getElementById('feuille').inert, null, { timeout: 6000 });
      if (!feuilleVue) {
        feuilleVue = true;
        const sel = '#g-contacts .contact:has(.contact-nom:text-is("' + nomAutre + '"))';
        /* (étape 8) la feuille choisit des PARTICIPANTS : un seul fait un appel à deux, deux ou plus un appel de groupe (la sonde des appels de groupe joue le second) */
        v('⛔ la feuille « Nouvel appel » : on choisit des PARTICIPANTS (cases à cocher), rien n\'est choisi, « Appeler » est grisé', [await lire(S, '#feuille-titre'), await S.page.getAttribute(sel, 'role'), await S.page.getAttribute(sel, 'aria-checked'), await lire(S, '#g-resume'), await S.page.getAttribute('#g-creer', 'aria-disabled')], ['Nouvel appel', 'checkbox', 'false', 'Choisir les participants', 'true']);
        await toucher(S, sel);
        v('… choisir Ben le COCHE et le compte (« 1 participant »), « Appeler » est actif ; le re-toucher le décoche', [await S.page.getAttribute(sel, 'aria-checked'), await lire(S, '#g-resume'), await S.page.getAttribute('#g-creer', 'aria-disabled')], ['true', '1 participant', 'false']);
        await toucher(S, sel);
        v('… décoché : rien n\'est choisi, « Appeler » est de nouveau grisé', [await S.page.getAttribute(sel, 'aria-checked'), await S.page.getAttribute('#g-creer', 'aria-disabled')], ['false', 'true']);
        /* ⛔ choisir un SECOND contact l'AJOUTE (un appel de groupe), il ne remplace plus le premier ; décocher les deux rend la feuille vide */
        const selC = '#g-contacts .contact:has(.contact-nom:text-is("' + NOMS.cleo + '"))';
        await toucher(S, sel); await toucher(S, selC);
        v('⛔ choisir un SECOND contact l\'AJOUTE : Ben et Cleo restent cochés, le résumé dit « 2 participants »', [await S.page.getAttribute(sel, 'aria-checked'), await S.page.getAttribute(selC, 'aria-checked'), await lire(S, '#g-resume')], ['true', 'true', '2 participants']);
        await toucher(S, sel);
        await toucher(S, selC);
        await largeur(S, 'feuille Nouvel appel');
      }
      await toucher(S, '#g-contacts .contact:has(.contact-nom:text-is("' + nomAutre + '"))');
      if (type === 'video') await toucher(S, '#g-choix .g-pilule[data-type="video"]');
      await toucher(S, '#g-creer');
    };
    const decrocher = async (S) => { await toucher(S, '#appel-repondre'); };

    /* ═══ 1. UN APPEL AUDIO, DE BOUT EN BOUT, EN DIRECT ═══════════════════════════════════════════════════════ */
    await bloc('1. Un appel AUDIO : Ana (téléphone) appelle Ben (bureau) — il sonne, Ben répond, la voix passe, raccrocher libère le micro', async () => {
      /* Ben est dans une CONVERSATION avec Ana quand l'appel arrive : l'écran d'appel la recouvre, et la rend après */
      await toucher(B, 'a[data-vue="messages"]');
      await toucher(B, '#liste-conv .conv:has(.conv-nom:text-is("' + NOMS.ana + '"))');
      await B.page.waitForFunction(n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(n), NOMS.ana, { timeout: 7000 });
      await appeler(A, NOMS.ben, 'audio');
      await verifier('Ana : l\'écran d\'appel est là, il dit « Sonnerie… » et le nom de Ben', A, () => !!document.documentElement.dataset.appel && /Sonnerie/.test(document.getElementById('appel-statut').textContent) && /Ben/.test(document.getElementById('appel-nom').textContent), null, 8000, async () => 'statut=«' + (await lire(A, '#appel-statut')) + '» nom=«' + (await lire(A, '#appel-nom')) + '»');
      vrai('la mention « Aperçu — les autres participants sont simulés » et le bouton Haut-parleur n\'existent PAS dans la version servie (display:none)', !(await visible(A, '.appel-mention')) && !(await visible(A, '#appel-hp')));
      await verifier('Ben : l\'appel ENTRANT sonne dans SA page, sans qu\'il ait rien fait — Refuser et Répondre, le nom d\'Ana, « Appel audio entrant »', B, () => !!document.documentElement.dataset.appel && document.getElementById('appel-ecran').hasAttribute('data-entrant') && /Ana/.test(document.getElementById('appel-nom').textContent) && /Appel audio entrant/.test(document.getElementById('appel-statut').textContent), null, 9000, async () => 'statut=«' + (await lire(B, '#appel-statut')) + '» nom=«' + (await lire(B, '#appel-nom')) + '»');
      v('les deux commandes de la sonnerie sont là (et celles d\'un appel en cours sont cachées)', [await visible(B, '#appel-repondre'), await visible(B, '#appel-refuser'), await visible(B, '#appel-micro'), await visible(B, '#appel-raccrocher')], [true, true, false, false]);
      const rb = await B.page.evaluate(() => ({ media: window.__media, pcs: window.__pcs.length, ctx: window.__ctx.crees, pistes: window.__pistes.length }));
      v('⛔ Ben n\'a demandé NI micro NI caméra, et aucune connexion n\'existe, tant qu\'il n\'a pas répondu — mais la sonnerie est lancée (un contexte audio)', [rb.media, rb.pcs, rb.pistes, rb.ctx >= 1], [0, 0, 0, true]);
      await largeur(A, 'appel sortant (sonnerie)'); await largeur(B, 'appel entrant');
      const tailles = await B.page.evaluate(() => ['#appel-refuser .rond-cmd', '#appel-repondre .rond-cmd'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      vrai('Refuser et Répondre sont des cibles de 44 px au moins — ' + JSON.stringify(tailles), tailles.every(([w, h]) => w >= 44 && h >= 44));
      await capturer(bB, '01-sonnerie', [A, B]);
      /* ⛔ la sonnerie s'arrête AU TOUCHER de « Répondre » : la requête vers le service est RETENUE dans la page, et le contexte audio de la sonnerie est déjà fermé (le survivant de la mutation D04 :
         la réponse du service arrête aussi la sonnerie, quelques dizaines de millisecondes plus tard — la ligne du toucher n'avançait l'arrêt que de ce délai, et aucune mesure ne le voyait) */
      await B.page.evaluate(() => { window.__retenirReponse = true; });
      await decrocher(B);
      const retenue = await attendre(B, () => typeof window.__lacherReponse === 'function', null, 6000);
      const sonRetenu = await B.page.evaluate(() => ({ crees: window.__ctx.crees, fermes: window.__ctx.fermes }));
      v('⛔ la sonnerie S\'ARRÊTE AU TOUCHER de « Répondre » — population : la requête vers le service est RETENUE dans la page ; le contexte audio de la sonnerie est déjà fermé', [retenue, sonRetenu.crees >= 1 && sonRetenu.fermes >= sonRetenu.crees], [true, true]);
      await B.page.evaluate(() => { window.__retenirReponse = false; if (window.__lacherReponse) window.__lacherReponse(); });
      await verifier('Ben répond : l\'appel COURT pour les deux (« Appel en cours · 00:0x »)', A, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 14000, async () => 'Ana : «' + (await lire(A, '#appel-statut')) + '»');
      await verifier('… et chez Ben', B, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 14000, async () => 'Ben : «' + (await lire(B, '#appel-statut')) + '»');
      const apres = await B.page.evaluate(() => ({ ctxCrees: window.__ctx.crees, ctxFermes: window.__ctx.fermes }));
      v('⛔ la sonnerie S\'ARRÊTE dès qu\'il répond : le contexte audio de la sonnerie est fermé', [apres.ctxFermes >= apres.ctxCrees && apres.ctxCrees >= 1], [true]);
      const sa = await paire(A), sb = await paire(B);
      v('⛔ la liaison est ÉTABLIE des deux côtés, en DIRECT (la paire retenue est locale ou réflexive, jamais « relay » — et elle a un type)', [sa.etat, sb.etat, ['host', 'srflx', 'prflx'].includes(sa.locale), ['host', 'srflx', 'prflx'].includes(sb.locale), sa.paire], ['connected', 'connected', true, true, 'succeeded']);
      const ca = await croit(A), cb = await croit(B);
      vrai('⛔ LA VOIX PASSE : les octets audio reçus CROISSENT chez Ana (' + ca.avant.audioRecu + ' → ' + ca.apres.audioRecu + ') et chez Ben (' + cb.avant.audioRecu + ' → ' + cb.apres.audioRecu + '), et chacun en émet', ca.audio && cb.audio && ca.emis && cb.emis);
      const lecture = await A.page.evaluate(() => { const a = document.getElementById('appel-audio-distant'); return { flux: !!a.srcObject, pistes: a.srcObject ? a.srcObject.getAudioTracks().map(t => t.readyState) : [], pause: a.paused, fini: a.ended, mute: a.muted, auto: a.autoplay }; });
      /* (ce que la page branche, pas ce que le haut-parleur joue : un Chromium sans carte son ne fait pas avancer l'horloge d'un élément — les octets reçus ci-dessus sont la preuve que la voix ARRIVE) */
      v('l\'élément audio d\'Ana est BRANCHÉ sur le flux de Ben (une piste vivante, pas en pause, ni fini ni muet, lecture automatique)', [lecture.flux, lecture.pistes, lecture.pause, lecture.fini, lecture.mute, lecture.auto], [true, ['live'], false, false, false, true]);
      const d1 = await lire(A, '#appel-statut'); await dormir(1300); const d2 = await lire(A, '#appel-statut');
      vrai('la durée COURT (« ' + d1 + ' » puis « ' + d2 + ' »)', d1 !== d2 && /\d\d:\d\d/.test(d2));
      const id1 = await B.page.evaluate(() => ({ pcs: window.__pcs.length, conf: window.__confs[0] }));
      if (coturn) {
        const turn = (id1.conf.iceServers || []).find(s => s.username);
        v('⛔ les identifiants du relais arrivent INTACTS à la connexion de la page : les adresses du vrai coturn, « échéance:identifiant », le HMAC du secret recalculé ici',
          [turn && turn.urls.slice().sort(), turn && turn.username.endsWith(':' + idBen), turn && turn.credential === crypto.createHmac('sha1', SECRET).update(turn.username).digest('base64')],
          [['turn:' + coturn.ip + ':' + coturn.port + '?transport=tcp', 'turn:' + coturn.ip + ':' + coturn.port + '?transport=udp'], true, true]);
      }
      await largeur(A, 'appel audio en cours'); await largeur(B, 'appel audio en cours');
      await capturer(bB, '02-audio-en-cours', [A, B]);
      /* — le micro — */
      await toucher(A, '#appel-micro');
      const muet = await A.page.evaluate(() => ({ presse: document.getElementById('appel-micro').getAttribute('aria-pressed'), texte: document.querySelector('#appel-micro .appel-cmd-texte').textContent, pistes: window.__pcs[0].getSenders().filter(s => s.track && s.track.kind === 'audio').map(s => s.track.enabled) }));
      v('Ana coupe son micro : le bouton le dit (« Muet », pressé) et la piste émise est désactivée', [muet.presse, muet.texte, muet.pistes], ['true', 'Muet', [false]]);
      await toucher(A, '#appel-micro');
      v('… et le rallume', await A.page.evaluate(() => window.__pcs[0].getSenders().filter(s => s.track && s.track.kind === 'audio').map(s => s.track.enabled)), [true]);
      /* — raccrocher — */
      const pcAvant = await A.page.evaluate(() => window.__pcs.length);
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche : son écran d\'appel se ferme', A);
      await attendreFermeture('⛔ Ben l\'apprend sans rien faire : son écran se ferme aussi', B);
      const pa = await pistesVivantes(A), pb = await pistesVivantes(B);
      v('⛔ TOUTE piste fabriquée par `getUserMedia` est ARRÊTÉE de chaque côté (population : au moins une piste a existé) — le voyant du micro s\'éteint', [pa.total >= 1 && pb.total >= 1, pa.vivantes, pb.vivantes], [true, 0, 0]);
      const apresStats = await stats(A);
      const ferme = await A.page.evaluate(() => ({ etat: window.__pcs[window.__pcs.length - 1].iceConnectionState, signalisation: window.__pcs[window.__pcs.length - 1].signalingState }));
      v('⛔ CONTRE-ÉPREUVE : sur la connexion FERMÉE du même appel, le détecteur de « la voix passe » rend FAUX (aucun octet n\'est plus lisible)', [ferme.signalisation, apresStats.audioRecu, (await croit(A, { ms: 500 })).audio], ['closed', 0, false]);
      await verifier('l\'avis d\'après (lecteur d\'écran) dit « Appel terminé · mm:ss »', A, () => /Appel terminé · \d\d:\d\d/.test(document.getElementById('annonce-appel').textContent), null, 6000, async () => 'annonce=«' + (await lire(A, '#annonce-appel')) + '»');
      await verifier('Ana revient là où elle était (l\'onglet des appels), l\'historique porte la ligne : sortant, audio, « Ben Banc »', A, n => { const l = document.querySelector('#liste-appels .appel-item'); return !!l && l.textContent.includes(n) && /sortant/.test(l.textContent); }, NOMS.ben, 8000, async () => 'liste=«' + (await lire(A, '#liste-appels')) + '»');
      v('⛔ Ben revient à sa CONVERSATION (l\'écran d\'appel l\'avait recouverte, il n\'a rien rouvert)', [await B.page.evaluate(() => document.documentElement.dataset.conv), await B.page.evaluate(() => document.getElementById('conv-titre').textContent.includes('Ana'))], ['1', true]);
      await onglet(B, 'appels');
      await verifier('l\'historique de Ben : « Ana Banc », entrant', B, n => { const l = document.querySelector('#liste-appels .appel-item'); return !!l && l.textContent.includes(n) && /entrant/.test(l.textContent); }, NOMS.ana, 8000, async () => 'liste=«' + (await lire(B, '#liste-appels')) + '»');
      v('population : ' + (A.gestes + B.gestes) + ' gestes portés, aucune erreur JavaScript non rattrapée dans les deux pages', [A.erreurs, B.erreurs], [[], []]);
    });

    /* ═══ 2. REFUSER, ANNULER, SANS RÉPONSE ═══════════════════════════════════════════════════════════════════ */
    await bloc('2. Ben (bureau) appelle Ana en VIDÉO : elle refuse ; il annule ; elle ne répond pas — chaque issue dite, caméra relâchée', async () => {
      const mediaAna0 = await A.page.evaluate(() => window.__media);
      await appeler(B, NOMS.ana, 'video');
      await verifier('Ana : l\'appel VIDÉO entrant sonne sur son téléphone (« Appel vidéo entrant », l\'icône de Répondre est la caméra)', A, () => document.getElementById('appel-ecran').hasAttribute('data-entrant') && /Appel vidéo entrant/.test(document.getElementById('appel-statut').textContent) && document.querySelector('#appel-repondre use').getAttribute('href') === '#i-video', null, 10000, async () => 'statut=«' + (await lire(A, '#appel-statut')) + '»');
      await verifier('… et la vibration accompagne la sonnerie (le téléphone vibre)', A, () => window.__vibre >= 1, null, 4000);
      await largeur(A, 'appel vidéo entrant');
      await verifier('Ben (l\'appelant) a demandé SA caméra pendant la sonnerie (permission accordée d\'avance) et la montre : « Sonnerie… »', B, () => /Sonnerie/.test(document.getElementById('appel-statut').textContent) && window.__media >= 1, null, 8000);
      await toucher(A, '#appel-refuser');
      await attendreFermeture('Ana refuse : son écran se ferme', A);
      await verifier('⛔ Ben l\'apprend avec SA phrase : « Ana Banc a refusé l\'appel. »', B, () => /Ana Banc a refusé l'appel/.test(document.getElementById('mot').textContent) && !document.documentElement.dataset.appel, null, 10000, async () => 'mot=«' + (await motVu(B)) + '» écran=' + (await ecranAppel(B)));
      v('⛔ la caméra de Ben est RELÂCHÉE (aucune piste vivante ; population : sa caméra avait été prise), celle d\'Ana jamais prise', [(await pistesVivantes(B)).vivantes, (await B.page.evaluate(() => window.__pistes.length)) >= 1, (await A.page.evaluate(() => window.__media)) - mediaAna0], [0, true, 0]);
      /* — annuler pendant la sonnerie — */
      await appeler(B, NOMS.ana, 'audio');
      await verifier('Ana : ça sonne de nouveau', A, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await toucher(B, '#appel-raccrocher');
      await attendreFermeture('Ben annule : son écran se ferme', B);
      await verifier('⛔ Ana a MANQUÉ cet appel : son écran se ferme avec « Appel manqué. »', A, () => /Appel manqué/.test(document.getElementById('mot').textContent) && !document.documentElement.dataset.appel, null, 10000, async () => 'mot=«' + (await motVu(A)) + '» page=' + (await A.page.evaluate(() => JSON.stringify({ appel: document.documentElement.dataset.appel || null, statut: document.getElementById('appel-statut').textContent, entrant: document.getElementById('appel-ecran').hasAttribute('data-entrant'), visible: document.visibilityState, sonneries: window.__ctx }))));
      const son = await A.page.evaluate(() => ({ crees: window.__ctx.crees, fermes: window.__ctx.fermes }));
      v('⛔ la sonnerie d\'Ana S\'EST ARRÊTÉE avec l\'appel (tous les contextes audio créés sont fermés ; population : plusieurs sonneries ont eu lieu)', [son.crees >= 2, son.fermes >= son.crees], [true, true]);
      await onglet(A, 'appels');
      await verifier('l\'historique d\'Ana porte un appel MANQUÉ de Ben (le nom en rouge)', A, n => !!Array.from(document.querySelectorAll('#liste-appels .appel-item')).find(l => l.textContent.includes(n) && l.querySelector('.appel-nom-ligne.manque')), NOMS.ben, 8000, async () => 'liste=«' + (await lire(A, '#liste-appels')) + '»');
      /* — sans réponse : l'horloge DU SERVICE avance de 46 s — */
      await appeler(B, NOMS.ana, 'audio');
      await verifier('Ana : ça sonne', A, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      svc.avancer(46000);
      await verifier('⛔ +46 s sans réponse : « Pas de réponse. » chez Ben, « Appel manqué. » chez Ana, les deux écrans fermés', B, () => /Pas de réponse/.test(document.getElementById('mot').textContent) && !document.documentElement.dataset.appel, null, 10000, async () => 'mot=«' + (await motVu(B)) + '»');
      await verifier('… et chez Ana', A, () => !document.documentElement.dataset.appel, null, 10000);
      v('population : plus aucune piste vivante, aucune erreur de page', [(await pistesVivantes(A)).vivantes, (await pistesVivantes(B)).vivantes, A.erreurs, B.erreurs], [0, 0, [], []]);
      /* — un GROUPE (étape 8) : la caméra de la conversation appelle TOUT le groupe, dans une SALLE — pas un appel à deux. La salle elle-même
         (vignettes, voix, gestes de l'hôte) est jouée par la sonde des appels de groupe ; ici on prouve l'aiguillage, puis on sort, pour que la suite
         trouve tout le monde libre. — */
      await onglet(A, 'messages');
      await toucher(A, '#liste-conv .conv:has(.conv-nom:text-is("Équipe appels"))');
      await A.page.waitForFunction(() => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes('Équipe appels'), null, { timeout: 7000 });
      await toucher(A, '#conv-cam');
      await verifier('⛔ la caméra d\'un GROUPE appelle TOUT le groupe : la SALLE s\'ouvre, pas l\'écran d\'appel à deux', A, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 10000, async () => 'mot=«' + (await motVu(A)) + '» écran à deux=' + (await ecranAppel(A)));
      vrai('… l\'écran d\'appel à deux est caché pendant que la salle est là', !(await ecranAppel(A)) && (await visible(A, '#salle-ecran')));
      await verifier('… et Ben, membre du groupe, l\'entend sonner dans SA page', B, () => !!document.documentElement.dataset.appel && document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 12000);
      for (let i = 0; i < 3 && await A.page.evaluate(() => !!document.documentElement.dataset.salle); i++) {
        await toucher(A, '#salle-quitter');
        if (await visible(A, '[data-sa="quitter-simple"]')) await toucher(A, '[data-sa="quitter-simple"]');
        await A.page.waitForFunction(() => !document.documentElement.dataset.salle, null, { timeout: 8000 }).catch(() => {});
      }
      await verifier('⛔ Ana sort de la salle, seule : l\'appel finit pour tous — la sonnerie de Ben s\'arrête', B, () => !document.documentElement.dataset.appel, null, 12000, async () => 'Ben : écran=' + (await ecranAppel(B)) + ' mot=«' + (await motVu(B)) + '»');
      await verifier('… et chez Ana, plus de salle ni d\'appel', A, () => !document.documentElement.dataset.appel && !document.documentElement.dataset.salle, null, 8000);
      v('population : plus aucune piste vivante, aucune erreur de page', [(await pistesVivantes(A)).vivantes, (await pistesVivantes(B)).vivantes, A.erreurs, B.erreurs], [0, 0, [], []]);
      await toucher(A, '#conv-retour');
    });

    if (!RAPIDE) {
      /* ═══ 3. LA VIDÉO : LA CAMÉRA DE L'UN, L'IMAGE DE L'AUTRE ═══════════════════════════════════════════════ */
      await bloc('3. Un appel en VIDÉO : la caméra de chacun devient l\'image de l\'autre, l\'éteindre ramène à l\'audio', async () => {
        await appeler(A, NOMS.ben, 'video');
        await verifier('Ben : appel vidéo entrant', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant') && /Appel vidéo entrant/.test(document.getElementById('appel-statut').textContent), null, 10000);
        await decrocher(B);
        await verifier('l\'appel court des deux côtés, en mise en page VIDÉO (l\'autre en grand, « Vous » en vignette)', A, () => /Appel en cours|Vidéo activée/.test(document.getElementById('appel-statut').textContent) && document.getElementById('appel-ecran').dataset.mise === 'video', null, 14000, async () => 'Ana : «' + (await lire(A, '#appel-statut')) + '» mise=' + (await A.page.evaluate(() => document.getElementById('appel-ecran').dataset.mise)));
        await verifier('… et chez Ben', B, () => /Appel en cours|Vidéo activée/.test(document.getElementById('appel-statut').textContent) && document.getElementById('appel-ecran').dataset.mise === 'video', null, 14000, async () => 'Ben : «' + (await lire(B, '#appel-statut')) + '» mise=' + (await B.page.evaluate(() => document.getElementById('appel-ecran').dataset.mise)));
        const ca = await croit(A, { ms: 1800 }), cb = await croit(B, { ms: 1800 });
        vrai('⛔ l\'IMAGE passe : les images décodées CROISSENT chez Ana (' + ca.avant.images + ' → ' + ca.apres.images + ') et chez Ben (' + cb.avant.images + ' → ' + cb.apres.images + '), la voix aussi', ca.images && cb.images && ca.audio && cb.audio);
        const vignette = await A.page.evaluate(() => { const t = document.querySelector('#appel-scene .tuile:not(.vous)'); const v2 = t && t.querySelector('video'); return { camera: t && t.dataset.camera, flux: !!(v2 && v2.srcObject), largeur: v2 ? v2.videoWidth : 0, vous: document.getElementById('appel-vous').dataset.camera }; });
        v('la vignette de l\'AUTRE montre son image (caméra « on », un flux, des pixels) ; « Vous » montre la sienne', [vignette.camera, vignette.flux, vignette.largeur > 0, vignette.vous], ['on', true, true, 'on']);
        const nbCamReel = await A.page.evaluate(async () => (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput').length);
        v('⛔ avec UNE seule caméra, « Retourner la caméra » n\'existe pas (population : l\'appareil n\'en connaît qu\'une et la sienne est allumée)', [nbCamReel, await visible(A, '#appel-flip'), vignette.vous], [1, false, 'on']);
        await largeur(A, 'appel vidéo'); await largeur(B, 'appel vidéo');
        await capturer(bB, '03-video', [A, B]);
        /* — Ana éteint sa caméra : Ben revient à l'audio — */
        await toucher(A, '#appel-cam');
        await verifier('Ana éteint sa caméra : sa piste vidéo est ARRÊTÉE (le voyant s\'éteint)', A, () => window.__pistes.filter(t => t.kind === 'video' && t.readyState === 'live').length === 0, null, 6000);
        /* le décodeur de Ben finit de montrer les dernières images EN VOL (quelques centaines de ms après l'arrêt de la piste) : on attend que son compteur se fige, PUIS on mesure — sinon la contre-épreuve accuse la caméra
           éteinte d'envoyer encore (un passage sur trois, sous charge) */
        for (let i = 0, prec = -1; i < 12; i++) { const x = (await stats(B)).images; if (x === prec) break; prec = x; await dormir(700); }
        const sansImage = await croit(B, { ms: 1600 });
        v('⛔ CONTRE-ÉPREUVE : la caméra d\'Ana éteinte, les images décodées chez Ben NE croissent PLUS (le détecteur d\'images distingue — population : elles croissaient juste avant), la voix passe toujours', [sansImage.images, sansImage.audio], [false, true]);
        await verifier('⛔ Ben le VOIT : la vignette d\'Ana n\'a plus de caméra (« off »), et il reste en vidéo tant que SA caméra est allumée', B, () => document.querySelector('#appel-scene .tuile:not(.vous)').dataset.camera === 'off', null, 8000, async () => 'caméra=' + (await B.page.evaluate(() => document.querySelector('#appel-scene .tuile:not(.vous)').dataset.camera)));
        await toucher(B, '#appel-cam');
        await verifier('Ben éteint la sienne aussi : l\'appel REDEVIENT audio chez les deux (la mise en page suit les caméras)', B, () => document.getElementById('appel-ecran').dataset.mise === 'audio', null, 8000);
        await verifier('… chez Ana aussi', A, () => document.getElementById('appel-ecran').dataset.mise === 'audio', null, 8000);
        const cc = await croit(A);
        vrai('la voix passe toujours (population : les octets reçus croissent)', cc.audio);
        /* — Ana rallume sa caméra : l'appel passe en vidéo chez Ben, sans qu'il ait rien touché — (son appareil a maintenant DEUX caméras : le bouton « Retourner la caméra » va paraître) — */
        await A.page.evaluate(() => { window.__deuxCameras = true; });
        await toucher(A, '#appel-cam');
        await verifier('⛔ Ana RALLUME sa caméra : l\'appel passe en vidéo CHEZ BEN, qui n\'a rien touché (l\'image d\'Ana arrive)', B, () => document.getElementById('appel-ecran').dataset.mise === 'video' && document.querySelector('#appel-scene .tuile:not(.vous)').dataset.camera === 'on', null, 10000);
        const ci = await croit(B, { ms: 1800 });
        vrai('… et les images décodées chez Ben croissent de nouveau (' + ci.avant.images + ' → ' + ci.apres.images + ')', ci.images);
        /* ⛔ la vignette d'Ana chez Ben a été REFAITE au passage audio → vidéo : elle est rebranchée sur le flux, avec des pixels (le survivant de la mutation D06 : les images décodées croissent même sans élément qui les montre) */
        await verifier('⛔ la vignette d\'Ana, REFAITE chez Ben au passage audio → vidéo, montre son image : un flux est branché dessus et elle a des pixels', B, () => { const t = document.querySelector('#appel-scene .tuile:not(.vous)'); const v2 = t && t.querySelector('video'); return !!(v2 && v2.srcObject && v2.videoWidth > 0); }, null, 8000,
          async () => JSON.stringify(await B.page.evaluate(() => { const t = document.querySelector('#appel-scene .tuile:not(.vous)'); const v2 = t && t.querySelector('video'); return { camera: t && t.dataset.camera, flux: !!(v2 && v2.srcObject), largeur: v2 ? v2.videoWidth : null }; })));
        /* — RETOURNER LA CAMÉRA : une piste neuve prend la place de l'ancienne, l'ancienne s'ARRÊTE, l'autre voit toujours l'image — */
        const etatVideo = () => ({ total: window.__pistes.filter(t => t.kind === 'video').length, vivantes: window.__pistes.filter(t => t.kind === 'video' && t.readyState === 'live').length });
        await verifier('⛔ avec DEUX caméras et la sienne allumée, « Retourner la caméra » paraît dans la vignette « Vous » (44 px au moins)', A, () => { const b = document.getElementById('appel-flip'); if (!b || b.hidden) return false; const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }, null, 8000,
          async () => 'bouton : ' + (await A.page.evaluate(() => { const b = document.getElementById('appel-flip'); return b ? (b.hidden ? 'caché' : JSON.stringify(b.getBoundingClientRect())) : 'absent'; })));
        const av = await A.page.evaluate(etatVideo);
        await toucher(A, '#appel-flip');
        await verifier('⛔ le retournement : UNE piste vidéo NEUVE et l\'ancienne ARRÊTÉE — une seule piste vidéo vivante (population : il y en avait une avant)', A, (n) => { const l = window.__pistes.filter(t => t.kind === 'video'); return l.length === n + 1 && l.filter(t => t.readyState === 'live').length === 1; }, av.total, 8000,
          async () => 'avant ' + JSON.stringify(av) + ', maintenant ' + JSON.stringify(await A.page.evaluate(etatVideo)));
        vrai('   la caméra demandée est l\'ARRIÈRE : `facingMode` « environment » dans la demande de la page', /"facingMode":\{"ideal":"environment"\}/.test(await A.page.evaluate(() => window.__contraintes[window.__contraintes.length - 1] || '')));
        const cf = await croit(B, { ms: 1800 });
        const camBen = await B.page.evaluate(() => document.querySelector('#appel-scene .tuile:not(.vous)').dataset.camera);
        v('⛔ l\'AUTRE voit toujours l\'image d\'Ana : sa caméra reste « on » chez Ben et les images décodées CROISSENT (la piste neuve est remise à l\'émetteur, sans renégociation), la voix aussi', [camBen, cf.images, cf.audio], ['on', true, true]);
        await toucher(A, '#appel-flip');
        await verifier('… un second retournement revient à la caméra AVANT (`facingMode` « user »), toujours UNE piste vidéo vivante', A, (n) => { const l = window.__pistes.filter(t => t.kind === 'video'); return l.length === n + 2 && l.filter(t => t.readyState === 'live').length === 1 && /"facingMode":\{"ideal":"user"\}/.test(window.__contraintes[window.__contraintes.length - 1] || ''); }, av.total, 8000,
          async () => 'maintenant ' + JSON.stringify(await A.page.evaluate(etatVideo)) + ', dernière demande ' + (await A.page.evaluate(() => window.__contraintes[window.__contraintes.length - 1])));
        await toucher(A, '#appel-cam');
        await verifier('la caméra éteinte, « Retourner la caméra » disparaît avec elle', A, () => document.getElementById('appel-flip').hidden, null, 6000);
        await verifier('… et Ben revient à l\'audio (la caméra d\'Ana est éteinte, la sienne l\'était déjà)', B, () => document.getElementById('appel-ecran').dataset.mise === 'audio', null, 8000);
        await toucher(B, '#appel-msg');
        await attendreFermeture('Ben touche « Message » : l\'appel se raccroche, son écran se ferme', B); await attendreFermeture('Ana l\'apprend : son écran se ferme', A);
        await B.page.waitForFunction(() => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes('Ana'), null, { timeout: 8000 }).catch(() => {});
        v('⛔ « Message » pendant l\'appel RACCROCHE et ouvre la conversation avec Ana (la vue messages, la conversation ouverte)', [await B.page.evaluate(() => document.documentElement.dataset.vue), await B.page.evaluate(() => document.documentElement.dataset.conv), await B.page.evaluate(() => document.getElementById('conv-titre').textContent.includes('Ana'))], ['messages', '1', true]);
        const pa = await pistesVivantes(A), pb = await pistesVivantes(B);
        v('⛔ micro ET caméra relâchés des deux côtés (population : des pistes audio et vidéo ont existé)', [await A.page.evaluate(() => window.__pistes.some(t => t.kind === 'video')), await B.page.evaluate(() => window.__pistes.some(t => t.kind === 'video')), pa.vivantes, pb.vivantes], [true, true, 0, 0]);
      });
    }

    {
      /* ═══ 4. LA PAGE QU'ON FERME, DEUX ONGLETS ═════════════════════════════════════════════════════════════ */
      await bloc('4. La page qu\'on FERME raccroche (l\'autre n\'attend pas 45 s) ; deux onglets d\'une même session — un seul prend l\'appel', async () => {
        await appeler(A, NOMS.ben, 'audio');
        await verifier('Ben : ça sonne', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
        /* le DEUXIÈME onglet de Ben (même contexte, donc même session) */
        const B2 = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.ben + ' (onglet 2)', ctx: B.ctx });
        await B2.page.goto(base + '/');
        await B2.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
        await verifier('l\'appel SONNE AUSSI dans le second onglet (il le retrouve au chargement : la liste des appels dit « actif »)', B2, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000, async () => 'statut=«' + (await lire(B2, '#appel-statut')) + '»');
        await decrocher(B);
        await verifier('le premier onglet répond : la liaison s\'établit', B, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 14000);
        await verifier('⛔ le second onglet LAISSE l\'appel : « pris sur un autre de tes appareils », écran fermé', B2, () => /pris sur un autre/.test(document.getElementById('mot').textContent) && !document.documentElement.dataset.appel, null, 10000, async () => 'mot=«' + (await motVu(B2)) + '»');
        v('⛔ et il n\'a créé AUCUNE connexion ni demandé aucun micro (population : le premier onglet en a une, et la voix y passe)', [await B2.page.evaluate(() => [window.__pcs.length, window.__media, window.__pistes.length]), (await B.page.evaluate(() => window.__pcs.length)) >= 1, (await croit(B)).audio], [[0, 0, 0], true, true]);
        await appeler(B2, NOMS.ana, 'audio');
        await verifier('⛔ le second onglet de Ben, qui n\'a pas l\'appel, en LANCE un : le service refuse (Ben est déjà dans un appel) et la page DIT « Tu es déjà dans un appel… » — pas une phrase générique', B2, () => /Tu es déjà dans un appel/.test(document.getElementById('mot').textContent) && !document.documentElement.dataset.appel, null, 8000, async () => 'mot=«' + (await motVu(B2)) + '»');
        await B2.page.close();
        /* — Ana FERME sa page en pleine conversation : Ben ne reste pas 45 s dans le vide — */
        const t0 = Date.now();
        await A.page.close({ runBeforeUnload: true });
        await attendreFermeture('⛔ Ana ferme sa page : l\'appel prend fin chez Ben dans les secondes qui suivent (le raccrochage est parti par `keepalive`), pas au bout de 45 s', B, 15000);
        vrai('… en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s (sous les 15 s : ce n\'est pas le délai du pouls perdu)', Date.now() - t0 < 15000);
        v('la pièce vivante : le micro de Ben est relâché', (await pistesVivantes(B)).vivantes, 0);
        const ancien = A;
        A = await ouvrir(bT, base, PROFILS.telephone, { nom: NOMS.ana });
        await connecter(A, 'ana');
        A.console.length = 0;
        await ancien.ctx.close();
      });
    }

    /* ═══ 4 ter. UN SECOND APPAREIL (T1, T4), LE REFUS « OCCUPÉ » DANS LA FEUILLE (T3), LES FLÈCHES (T2) — relevés par le testeur ═══════════════ */
    await bloc('4 ter. Un SECOND APPAREIL de Ben (une autre session) : il laisse l\'appel sans rester « entrant » et relit son historique à la fin ; le refus « occupé » reste LISIBLE dans la feuille ; les flèches disent le sens', async () => {
      const B2 = await ouvrir(bB, base, PROFILS.bureau, { nom: NOMS.ben + ' (2e appareil)' });
      await connecter(B2, 'ben');
      await onglet(B2, 'appels'); await onglet(B, 'appels'); await onglet(A, 'appels');
      const lignes = (S) => S.page.evaluate(() => document.querySelectorAll('#liste-appels .appel-item').length);
      const teteT = (S) => S.page.evaluate(() => { const l = document.querySelector('#liste-appels .appel-item .appel-heure'); return l ? +l.dataset.t : 0; });
      const passer = async () => {                          // Ana appelle Ben, Ben répond sur le premier appareil, Ana raccroche
        await appeler(A, NOMS.ben, 'audio');
        await verifier('les DEUX appareils de Ben sonnent', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
        await verifier('   … le second aussi', B2, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
        await decrocher(B);
        await verifier('le premier appareil répond : la liaison s\'établit', B, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 14000);
      };
      /* ── T1 + T4 : le second appareil laisse l'appel, n'est plus « entrant », et RELIT son historique quand l'appel finit ── */
      const n0 = await lignes(B2), t0 = await teteT(B2);
      await passer();
      await verifier('⛔ T4 — le second appareil a LAISSÉ l\'appel : l\'écran est fermé ET n\'est plus « entrant » (ni « Répondre » ni « Refuser » ne restent posés pour la prochaine fois)', B2, () => !document.documentElement.dataset.appel && !document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche', A); await attendreFermeture('Ben l\'apprend (premier appareil)', B);
      const relu = await attendre(B2, (x) => document.querySelectorAll('#liste-appels .appel-item').length > x, n0, 10000);
      v('⛔ T1 — le second appareil de Ben, qui a vu l\'appel « pris ailleurs » et n\'a rien tenu, relit son historique QUAND L\'APPEL FINIT : une ligne de plus, plus récente (population : ' + n0 + ' ligne(s) avant)', [relu, (await teteT(B2)) > t0], [true, true]);
      /* ── T1 (entrer dans l'onglet) : si l'événement de fin n'a PAS pu faire relire la liste (le service ne répond pas à cet instant), revenir sur l'onglet Appels la relit ── */
      const bloque = (url) => /\/api\/appels(\?|$)/.test(url.pathname + url.search);
      await B2.page.route(bloque, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"serveur"}' }));
      const n1 = await lignes(B2);
      await passer();
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche (2e appel)', A); await attendreFermeture('Ben l\'apprend (2e appel)', B);
      await dormir(1500);
      v('   contrôle : la liste de CE second appareil est restée celle d\'avant (la relecture par événement a échoué : le service répondait 503) — sans cela la suite ne prouverait rien', await lignes(B2), n1);
      await B2.page.unroute(bloque);
      await onglet(B2, 'messages'); await onglet(B2, 'appels');
      const relu2 = await attendre(B2, (x) => document.querySelectorAll('#liste-appels .appel-item').length > x, n1, 10000);
      vrai('⛔ T1 — ENTRER dans l\'onglet Appels relit l\'historique : le second appel y est (' + n1 + ' → ' + (await lignes(B2)) + ' ligne(s))', relu2);
      /* ── T2 : ↙ pour un appel reçu, ↗ pour un appel émis ── */
      const fleche = (S) => S.page.evaluate(() => {
        const d = (id) => { const p = document.querySelector('#' + id + ' path'); return p ? p.getAttribute('d') : ''; };
        const sens = (d1) => /H5V9/.test(d1) ? 'bas-gauche' : /h10v10/.test(d1) ? 'haut-droite' : '?';       // la pointe : le coin qu'elle dessine
        const ic = (it) => { const u = it.querySelector('.appel-kind use'); return u ? u.getAttribute('href').slice(1) : null; };
        const premiere = document.querySelector('#liste-appels .appel-item');
        return { entrant: sens(d('i-entrant')), sortant: sens(d('i-sortant')), premiere: premiere ? ic(premiere) : null };
      });
      const fa = await fleche(A), fb = await fleche(B);
      v('⛔ T2 — la flèche d\'un appel REÇU pointe vers le bas à gauche (↙), celle d\'un appel ÉMIS vers le haut à droite (↗) ; la première ligne d\'Ana (qui a appelé) porte la sortante, celle de Ben (qui a reçu) l\'entrante',
        [fb.entrant, fb.sortant, fa.premiere, fb.premiere], ['bas-gauche', 'haut-droite', 'i-sortant', 'i-entrant']);
      await B2.ctx.close();

      /* ── T3 : le refus « occupé » reste LISIBLE dans la feuille « Nouvel appel » (le mot s'efface en 2,4 s, la feuille reste ouverte) ── */
      const cleo = T.client(base);
      await cleo.post('/api/beta/entrer', { login: 'cleo', pass: MOTS.cleo });
      const rc = await cleo.post('/api/appels', { uid: idBen, type: 'audio' });
      await verifier('population : Cleo (par le service) appelle Ben — il sonne', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await decrocher(B);
      await verifier('Ben est DANS un appel (avec Cleo)', B, () => /Appel en cours|Connexion/.test(document.getElementById('appel-statut').textContent), null, 14000);
      await appeler(A, NOMS.ben, 'audio');
      const dit = await attendre(A, () => { const e = document.getElementById('g-erreur'); return e && !e.hidden && /déjà dans un appel/.test(e.textContent); }, null, 10000);
      await dormir(3200);                                   // le mot de la page (2,4 s) est parti : le refus, lui, doit rester sous les yeux
      v('⛔ T3 — le refus « occupé » est LISIBLE dans la feuille APRÈS que le mot a disparu (3 s plus tard), et la feuille est toujours ouverte', [dit, await A.page.evaluate(() => { const e = document.getElementById('g-erreur'); return !e.hidden && /déjà dans un appel/.test(e.textContent) && !document.getElementById('mot').classList.contains('on'); }), await A.page.evaluate(() => document.getElementById('feuille').dataset.mode === 'appel' && !document.getElementById('feuille').inert), rc.code], [true, true, true, 201]);
      /* le 409 du refus est ATTENDU : Chrome le journalise comme « Failed to load resource » — on le retire du relevé APRÈS avoir compté qu'il y est (sinon la dernière vérification de la sonde accuserait la page) */
      const refus409 = A.console.filter(x => /status of 409/.test(x)).length;
      vrai('population : Chrome a journalisé le 409 attendu du refus (' + refus409 + ')', refus409 === 1);
      for (let i = A.console.length - 1; i >= 0; i--) if (/status of 409/.test(A.console[i])) A.console.splice(i, 1);
      await toucher(A, '#g-contacts .contact:has(.contact-nom:text-is("' + NOMS.cleo + '"))');
      v('   choisir quelqu\'un d\'autre EFFACE le refus (il ne parle plus de la bonne personne)', await A.page.evaluate(() => document.getElementById('g-erreur').hidden), true);
      await toucher(A, '#g-annuler');
      await A.page.waitForFunction(() => document.getElementById('feuille').inert, null, { timeout: 6000 });
      await toucher(B, '#appel-raccrocher'); await attendreFermeture('Ben raccroche', B);
    });

    /* ═══ 5. LE RELAIS : LA VOIX PASSE PAR LE VRAI COTURN ═════════════════════════════════════════════════════ */
    await bloc('5. Le RELAIS : forcé, la voix passe par le vrai coturn avec les identifiants du vrai service', async () => {
      if (!coturn) { console.log('  ⚠️  NON VÉRIFIÉ : turnserver (coturn) est absent de cette machine — le relais n\'a pas été joué par les navigateurs.'); return; }
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = true; });
      const repos5 = await attendreRepos(coturn, [idAna, idBen]);
      vrai('population : coturn ne tient plus aucune allocation d\'Ana ni de Ben avant cet appel (' + (repos5.attente > 0.6 ? 'attendu ' + repos5.attente + ' s : il garde parfois ~50 s ce que Chromium a rendu' : 'rien à attendre') + ')', repos5.ok);
      const dejaVu = (id) => (lireAllocations(coturn.journal()).get(id) || { total: 0 }).total;          // les appels d'AVANT (même contre coturn) ont ouvert les leurs : on compte ce que CET appel ajoute
      const a0 = dejaVu(idAna), b0 = dejaVu(idBen), r0 = refusAllocations(coturn.journal()), pf0 = coturn.pareFeu ? compteursPareFeu() : null;
      await appeler(A, NOMS.ben, 'audio');
      await verifier('Ben : ça sonne', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await decrocher(B);
      await verifier('la liaison s\'établit EN RELAIS SEUL (aucune route directe permise)', A, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 20000, async () => 'statut=«' + (await lire(A, '#appel-statut')) + '» Ana=' + (await diag(A)) + ' Ben=' + (await diag(B)));
      const sa = await paire(A), sb = await paire(B);
      v('⛔ la paire retenue passe par le RELAIS des deux côtés (type « relay »)' + (sa.locale === 'relay' && sb.locale === 'relay' ? '' : ' — Ana ' + JSON.stringify(sa) + ' Ben ' + JSON.stringify(sb)), [sa.locale, sb.locale], ['relay', 'relay']);
      const ca = await croit(A), cb = await croit(B);
      const P = constantesRelais();
      v('⛔ MESURÉ contre le vrai coturn, avec les plafonds de PRODUCTION : le navigateur ouvre UNE ALLOCATION par adresse de relais — DEUX par personne (UDP, puis TCP : cette sonde n\'a pas de TLS), jamais plus — et le quota par personne (' + P.userQuota + ') n\'en refuse aucune', [dejaVu(idAna) - a0, dejaVu(idBen) - b0, refusAllocations(coturn.journal()) - r0], [2, 2, 0]);
      vrai('⛔ LA VOIX PASSE par le vrai coturn : les octets audio reçus croissent des deux côtés (' + ca.avant.audioRecu + ' → ' + ca.apres.audioRecu + ' ; ' + cb.avant.audioRecu + ' → ' + cb.apres.audioRecu + ')', ca.audio && cb.audio);
      if (coturn.pareFeu) {
        const pf1 = compteursPareFeu();
        v('⛔ LE PARE-FEU A LAISSÉ PASSER UN VRAI APPEL RELAYÉ DES DEUX CÔTÉS : aucun paquet refusé, des paquets comptés par la règle des ports de relais (relais ↔ relais : ' + (pf1.relais - pf0.relais) + ') ET par celle des ports d\'écoute (la réponse de coturn à ses clients : ' + (pf1.ecoute - pf0.ecoute) + ')',
          [pf1.refus - pf0.refus, pf1.relais - pf0.relais > 0, pf1.ecoute - pf0.ecoute > 0], [0, true, true]);
      }
      const conf = await A.page.evaluate(() => window.__confs[window.__confs.length - 1]);
      const turn = (conf.iceServers || []).find(s => s.username);
      v('les identifiants donnés par la page sont ceux du service : l\'utilisateur porte l\'identifiant d\'Ana, le mot de passe est le HMAC du secret (recalculé ici) — et la paire a bien été négociée AVEC eux', [turn.username.endsWith(':' + idAna), turn.credential === crypto.createHmac('sha1', SECRET).update(turn.username).digest('base64')], [true, true]);
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche', A); await attendreFermeture('Ben l\'apprend', B);
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = false; });
      /* la contre-épreuve du détecteur : l'appel du premier bloc est passé en DIRECT, et le détecteur le disait (locale ≠ relay) — ici, le même détecteur dit « relay » */
      vrai('population : l\'appel en relais a eu sa propre connexion de chaque côté (configuration lue), aucune erreur de page', (await A.page.evaluate(() => window.__confs.length)) >= 1 && (await B.page.evaluate(() => window.__confs.length)) >= 1 && A.erreurs.length === 0 && B.erreurs.length === 0);
    });

    /* ═══ 5 bis. LE RENOUVELLEMENT DES IDENTIFIANTS DU RELAIS, DANS DE VRAIS NAVIGATEURS ═══════════════════════════════════════
       ⛔ MESURÉ ICI même (relecture, I1) : renouveler en RELANÇANT la liaison laissait deux allocations de plus chez le relais à chaque renouvellement — le navigateur ne rend pas celles de la liaison précédente
       avant la fin de l'appel — jusqu'au quota de la personne ; la deuxième relance se heurtait au 486. Chacun redemande donc ses identifiants SANS relancer la liaison : ils servent à la prochaine collecte. */
    if (!RAPIDE) await bloc('5 bis. Le RENOUVELLEMENT des identifiants du relais : chacun redemande les siens SANS relancer la liaison — l\'appel continue, le relais ne compte aucune allocation de plus, et les identifiants neufs ouvrent une allocation', async () => {
      if (!coturn) { console.log('  ⚠️  NON VÉRIFIÉ : turnserver (coturn) est absent de cette machine — le renouvellement n\'a pas été joué par les navigateurs.'); return; }
      const P = constantesRelais();
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = true; });
      const repos5b = await attendreRepos(coturn, [idAna, idBen]);
      vrai('population : coturn ne tient plus aucune allocation d\'Ana ni de Ben avant cet appel (' + (repos5b.attente > 0.6 ? 'attendu ' + repos5b.attente + ' s' : 'rien à attendre') + ')', repos5b.ok);
      await appeler(A, NOMS.ben, 'audio');
      await verifier('Ben : ça sonne', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await decrocher(B);
      await verifier('la liaison s\'établit EN RELAIS SEUL', A, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 20000);
      const sa0 = await paire(A), sb0 = await paire(B);
      v('la paire retenue passe par le relais des deux côtés AVANT le renouvellement', [sa0.locale, sb0.locale], ['relay', 'relay']);
      const avant = lireAllocations(coturn.journal());
      const compter = (id) => (lireAllocations(coturn.journal()).get(id) || { total: 0 }).total;
      const n0 = [compter(idAna), compter(idBen)], r0 = refusAllocations(coturn.journal());
      const rap = (S) => S.page.evaluate(() => ({ configs: window.__setConfs.length, derniere: window.__setConfs[window.__setConfs.length - 1] || null, premiere: window.__confs[window.__confs.length - 1] || null, connexions: window.__pcs.length }));
      const bases = [(await rap(A)).connexions, (await rap(B)).connexions];          // la page garde les connexions des appels d'avant : on compte ce qui s'AJOUTE
      /* aux trois quarts de la minute (45 s), CHACUN redemande ses identifiants (le service en donne à qui est dans l'appel) et les donne à sa connexion */
      const renouvele = await (async () => { for (let t = 0; t < 100000; t += 500) { const [a, b] = [await rap(A), await rap(B)]; if (a.configs >= 1 && b.configs >= 1) return true; await dormir(500); } return false; })();
      vrai('⛔ le renouvellement a LIEU, de chaque côté, dans les 100 s (la configuration de la connexion reçoit des serveurs neufs — l\'appelé aussi, sans qu\'on le lui dise)', renouvele);
      const ra = await rap(A), rb = await rap(B);
      const turnDe = (conf) => ((conf && conf.iceServers) || []).find(x => x.username) || { username: '0:?', credential: '' };
      const hmacDe = (u) => crypto.createHmac('sha1', SECRET).update(u).digest('base64');
      v('⛔ les identifiants neufs ont une AUTRE échéance (plus tardive), la bonne signature (HMAC recalculé ici), et sont ceux de LA personne (l\'appelante ; l\'appelé de même)',
        [Number(turnDe(ra.derniere).username.split(':')[0]) > Number(turnDe(ra.premiere).username.split(':')[0]), turnDe(ra.derniere).credential === hmacDe(turnDe(ra.derniere).username), turnDe(ra.derniere).username.endsWith(':' + idAna),
         Number(turnDe(rb.derniere).username.split(':')[0]) > Number(turnDe(rb.premiere).username.split(':')[0]), turnDe(rb.derniere).credential === hmacDe(turnDe(rb.derniere).username), turnDe(rb.derniere).username.endsWith(':' + idBen)], [true, true, true, true, true, true]);
      await dormir(2500);
      v('⛔ le renouvellement NE RELANCE PAS la liaison : aucune connexion de plus de chaque côté, et chez coturn aucune allocation de plus (deux par personne, comme avant) et aucune refusée par un plafond',
        [ra.connexions - bases[0], rb.connexions - bases[1], compter(idAna) - n0[0], compter(idBen) - n0[1], refusAllocations(coturn.journal()) - r0], [0, 0, 0, 0, 0]);
      /* les identifiants neufs OUVRENT une allocation chez le vrai coturn (ce qu'une relance après un changement de réseau en ferait) ; on la rend aussitôt */
      const lien = await V.ouvrir({ hote: coturn.ip, port: coturn.port, transport: 'udp' });
      let ouverte = null;
      try { const sess = V.session(lien); ouverte = await sess.allouer({ username: turnDe(ra.derniere).username, credential: turnDe(ra.derniere).credential }); if (ouverte.ok) await sess.rendre(); } finally { lien.fermer(); }
      v('⛔ les identifiants RENOUVELÉS ouvrent une allocation chez le vrai coturn (une relance après un changement de réseau trouvera donc son relais)', ouverte && ouverte.ok, true);
      const sa = await paire(A), sb = await paire(B);
      const ca = await croit(A, { ms: 2000 }), cb = await croit(B, { ms: 2000 });
      vrai('⛔ APRÈS le renouvellement l\'appel continue : la même liaison, la paire passe toujours par le relais, et la voix passe des deux côtés (' + ca.avant.audioRecu + ' → ' + ca.apres.audioRecu + ' ; ' + cb.avant.audioRecu + ' → ' + cb.apres.audioRecu + ')',
        sa.locale === 'relay' && sb.locale === 'relay' && ca.audio && cb.audio && /Appel en cours/.test(await lire(A, '#appel-statut')));
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche', A); await attendreFermeture('Ben l\'apprend', B);
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = false; });
      vrai('aucune erreur de page pendant le renouvellement (population : ' + P.userQuota + ' allocations au plus par personne chez coturn)', A.erreurs.length === 0 && B.erreurs.length === 0 && avant.size >= 2);
    });

    /* ═══ 5 ter. coturn REDÉMARRE EN PLEIN APPEL ═══════════════════════════════════════════════════════════════════════
       Question 41 de la conception (l'option « relancer coturn chaque nuit ») : toutes les allocations tombent d'un coup. L'appel relayé se rétablit-il SEUL — la relance de la liaison par l'appelante, avec les
       identifiants qu'elle tient (quinze minutes en production, une ici) ? MESURÉ, pas supposé : sans cette preuve, la recommandation de la question 41 serait une hypothèse. */
    if (!RAPIDE) await bloc('5 ter. coturn REDÉMARRE en plein appel relayé : toutes les allocations tombent d\'un coup — la voix revient-elle seule ?', async () => {
      if (!coturn) { console.log('  ⚠️  NON VÉRIFIÉ : turnserver (coturn) est absent de cette machine — la relance de coturn en plein appel n\'a pas été jouée.'); return; }
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = true; });
      await appeler(A, NOMS.ben, 'audio');
      await verifier('Ben : ça sonne', B, () => document.getElementById('appel-ecran').hasAttribute('data-entrant'), null, 10000);
      await decrocher(B);
      await verifier('la liaison s\'établit EN RELAIS SEUL', A, () => /Appel en cours/.test(document.getElementById('appel-statut').textContent), null, 20000, async () => 'statut=«' + (await lire(A, '#appel-statut')) + '» Ana=' + (await diag(A)) + ' Ben=' + (await diag(B)));
      const c0a = await croit(A), c0b = await croit(B);
      vrai('population : la voix passe par le relais AVANT la relance de coturn (' + c0a.avant.audioRecu + ' → ' + c0a.apres.audioRecu + ' ; ' + c0b.avant.audioRecu + ' → ' + c0b.apres.audioRecu + ')', c0a.audio && c0b.audio);
      const lus = async () => [(await stats(A)).audioRecu, (await stats(B)).audioRecu];
      const t0 = Date.now();
      vrai('coturn redémarre (arrêt, pare-feu retiré puis reposé, même configuration, même port) et répond de nouveau à un STUN', (await coturn.redemarrer()) === true);
      const base = await lus();
      let revenu = null;
      for (let i = 0; i < 100 && revenu === null; i++) { await dormir(500); const x = await lus(); if (x[0] > base[0] + 4000 && x[1] > base[1] + 4000) revenu = Math.round((Date.now() - t0) / 100) / 10; }
      vrai('⛔ MESURÉ : après la relance de coturn en plein appel, la voix REVIENT d\'elle-même, des deux côtés' + (revenu === null ? ' — jamais en 50 s : Ana ' + (await diag(A)) + ' Ben ' + (await diag(B)) : ' — en ' + revenu + ' s, relance comprise'), revenu !== null);
      if (revenu !== null) {
        const sa = await paire(A), sb = await paire(B);
        v('   et par le relais, comme avant (la paire retenue est de type « relay » des deux côtés)', [sa.locale, sb.locale], ['relay', 'relay']);
        vrai('   et l\'appel est toujours « en cours » (la veille n\'a pas raccroché)', /Appel en cours/.test(await lire(A, '#appel-statut')));
      }
      await toucher(A, '#appel-raccrocher');
      await attendreFermeture('Ana raccroche', A); await attendreFermeture('Ben l\'apprend', B);
      for (const S of [A, B]) await S.page.evaluate(() => { window.__relaisSeul = false; });
    });

    /* ═══ 6. UN ÉCRAN D'APPEL AU TÉLÉPHONE ET AU BUREAU : LA MISE EN PAGE ═════════════════════════════════════ */
    await bloc('6. La mise en page : aucun débordement, aux deux largeurs, dans tous les états de l\'écran d\'appel', async () => {
      v('⛔ ' + mesures.ecrans + ' écrans mesurés deux fois (' + mesures.population + ' éléments examinés) : aucun ne déborde de la largeur posée', mesures.debordements, []);
      vrai('population : des écrans ont été mesurés aux DEUX largeurs (393 et 1280 px), au moins six', mesures.ecrans >= 6 && mesures.largeurs.has(393) && mesures.largeurs.has(1280));
      /* ⛔ AUCUN TEXTE ANGLAIS, AUCUN « undefined » : tout ce que les écrans d'appel ont dit pendant la sonde (relevé à chaque mesure), jugé ici */
      const textes = [...mesures.textes];
      const connus = ['Répondre', 'Refuser', 'Raccrocher'].filter(m => textes.some(t => t.includes(m)));
      vrai('population : ' + textes.length + ' textes relevés sur les écrans d\'appel, dont les commandes de la sonnerie (' + connus.join(', ') + ')', textes.length >= 20 && connus.length === 3);
      v('⛔ aucun « undefined », « null », « NaN » ni « [object » dans ce que les écrans d\'appel disent', textes.filter(t => /undefined|\bnull\b|\bNaN\b|\[object|\{\{/.test(t)), []);
      v('⛔ aucun mot anglais dans ce que les écrans d\'appel disent (sonnerie, commandes, avis, liste)', textes.filter(t => /\b(calling|ringing|incoming|outgoing|accept|decline|reject|hang ?up|unmute|mute|speaker|missed|answer|video call|audio call|connecting|call ended|calls?)\b/i.test(t)), []);
    });

    /* ⛔ `/api/ice` répond 404 à qui n'est plus dans un appel qui sonne ou qui court : l'appelante dont l'appelé refuse AVANT que sa page ne demande ses identifiants le reçoit (une course normale, sans dommage — le moteur n'en
       tire qu'« pas de relais » et l'appel est déjà fini). Chrome le journalise « Failed to load resource » : seul CE 404-là, avec son adresse, est retiré du relevé — tout autre refus reste une erreur. */
    { const ice404 = (x) => /status of 404.*\[\/api\/ice\]/.test(x); for (const S of [A, B]) S.console = S.console.filter(x => !ice404(x)); }
    v('aucune erreur JavaScript, aucune erreur de console dans les deux pages sur toute la sonde (population : ' + (A.gestes + B.gestes) + ' gestes portés)', [A.erreurs.concat(A.console), B.erreurs.concat(B.console)], [[], []]);
  } finally {
    for (const b of navigateurs) { try { await b.close(); } catch (e) { /* déjà fermé */ } }
    if (svc) await svc.arreter();
    if (coturn) await coturn.arreter();
    if (og) await og.fermer();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* rien */ }
  }
  fin();
})().catch((e) => { console.log('  ✗ la sonde a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
