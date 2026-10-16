/* ══ SONDE — RÉUNIONS, LOT 1 : AVANT D'ENTRER, ÉPINGLER POUR SOI, LES RACCOURCIS, « TU PARLES ? », LA QUALITÉ DU RÉSEAU (la vraie page servie, deux navigateurs) ═════════
   12 octobre 2026, Justin : « fait dans l'ordre 1 . 2 . 3 . 4 » — le lot 1 : « entrer et être à l'aise ». Contre le VRAI service, une vraie maille (WebRTC sur la boucle locale) ; le micro est une
   tonalité de 440 Hz (un fichier que Chromium lit à la place du micro : « tu parles » se mesure vraiment), la caméra le damier de Chromium.
     1. AVANT D'ENTRER (Ana, bureau, depuis la fiche de la réunion) : « Annuler » RAMÈNE à la fiche (la feuille est posée dessus) et relâche tout ; puis la feuille se voit (sa caméra JOUE),
        s'entend (la jauge du micro MONTE), coupe et rallume micro et caméra (« Couper » pressé = coupé, comme dans la salle ; la caméra est RELÂCHÉE quand on la coupe) ; Ana entre micro coupé : en salle, le micro est coupé, la caméra allumée, et l'aperçu a TOUT lâché avant (aucune piste vivante qui ne soit pas celle de la salle).
     2. « TU PARLES ? TON MICRO EST COUPÉ » : micro coupé, la tonalité fait paraître le bandeau ; « Activer le micro » l'ouvre (chez Ben, la tuile d'Ana perd son « micro coupé »).
     3. Ben (téléphone, iPhone 390 px) entre depuis l'agenda, CAMÉRA COUPÉE : la feuille tient dans l'écran ; en salle, sa caméra n'a JAMAIS été demandée (chez Ana, sa tuile dit « Caméra désactivée »).
     4. ÉPINGLER POUR MOI : Cleo entre (par le service, muette) — l'épingle doit DÉCIDER contre Ana, qui parle. Ben touche la tuile de Cleo (le bouton paraît), l'épingle : chez lui la vue
        passe en « intervenant », Cleo devant ; chez Ana, RIEN ne change. Le panneau Participants dit « Ne plus épingler », et le retire. Chez l'hôte (Ana), la ligne de Cleo propose « Épingler
        pour moi » ET « Épingler pour tous » ; ⛔ son « pour moi » ne change RIEN chez Ben.
     5. LES RACCOURCIS (Ana, bureau) : M coupe et rouvre le micro (Ben le voit), V la caméra, H la main (Ben la voit), G la vue, ? la liste (Échap la ferme) ; ⛔ dans le champ de la discussion, « m »
        s'ÉCRIT et le micro ne bouge pas ; l'interrupteur « Raccourcis d'une lettre » les coupe (WCAG 2.1.4 — « M » ne fait plus rien) et « Plus » le dit ; l'espace tenu ouvre le
        micro, le lâcher le recoupe ; ⛔ panneau ouvert, l'espace ne parle pas.
     6. LA QUALITÉ DU RÉSEAU : une liaison saine ne montre AUCUN badge (population : le moteur l'a jugée « bonne ») ; des statistiques dégradées (pertes et aller-retour posés dans `getStats`
        par la sonde) font paraître « Connexion faible » sur la tuile de Ben — ⛔ mais PAS sur « Vous » : une liaison faible sur deux peut être la sienne (le moteur ne juge « Vous » qu'à
        partir de trois) ; quand il juge « Vous » faible (simulé), le badge ET l'avis paraissent.
     7. LE FLOU : sur ce Chromium (aucun effet d'appareil), « Plus » le DIT au lieu d'un interrupteur mort ; sur l'iPhone, il dit où le régler ; ⛔ contre-épreuve : un appareil qui sait flouter
        (capacité simulée) reçoit l'interrupteur, et le toucher demande `backgroundBlur: true` à la piste.
     8. Ben quitte, rouvre la feuille « avant d'entrer », puis « Annuler » : la caméra et le micro sont RELÂCHÉS.
   Et partout : aucune erreur JavaScript ; rien ne déborde à 390 px.
   ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION ; deux navigateurs au plus.
   Lancer :   node tests/sonde-opmessages-reunion-confort.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc' };
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/* la tonalité qui tient lieu de micro : 440 Hz, amplitude 0,3, deux secondes (un nombre entier de périodes : elle boucle sans à-coup) */
function ecrireTonalite(dir) {
  const sr = 48000, n = sr * 2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / sr) * 0.3 * 32767), 44 + i * 2);
  const f = path.join(dir, 'tonalite-440.wav'); fs.writeFileSync(f, buf); return f;
}

/* ce que la page fabrique, NOTÉ sans rien changer à ce qu'elle fait : chaque piste de `getUserMedia` (pour savoir si elle vit encore), chaque demande, et chaque `applyConstraints`.
   `window.__degrader` (posé par la sonde) ajoute aux statistiques des liaisons des pertes et un aller-retour de 600 ms ; `window.__flouSimule` donne aux caméras la capacité `backgroundBlur`. */
const INIT = () => {
  window.__media = []; window.__pistes = []; window.__contraintes = []; window.__degrader = false; window.__flouSimule = false;
  const md = navigator.mediaDevices;
  if (md && md.getUserMedia) {
    const g = md.getUserMedia.bind(md);
    md.getUserMedia = async function (c) { window.__media.push({ audio: !!(c && c.audio), video: !!(c && c.video) }); const f = await g(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
  }
  const T0 = window.MediaStreamTrack && MediaStreamTrack.prototype;
  if (T0) {
    const cap = T0.getCapabilities, ac = T0.applyConstraints, cl = T0.clone;
    T0.getCapabilities = function () { const c = cap ? cap.call(this) : {}; if (window.__flouSimule && this.kind === 'video') return Object.assign({}, c, { backgroundBlur: [false, true] }); return c; };
    T0.applyConstraints = function (x) { window.__contraintes.push(JSON.stringify(x || {})); if (x && 'backgroundBlur' in x) return Promise.resolve(); return ac.call(this, x); };
    T0.clone = function () { const t = cl.call(this); window.__pistes.push(t); return t; };
  }
  const PC = window.RTCPeerConnection;
  if (PC) {
    const gs = PC.prototype.getStats;
    let perdus = 0;
    PC.prototype.getStats = async function (...a) {
      const r = await gs.apply(this, a);
      if (!window.__degrader) return r;
      perdus += 400;
      const m = new Map(); r.forEach((x, k) => m.set(k, x.type === 'transport' ? Object.assign({}, x, { selectedCandidatePairId: 'degrade-cp' }) : x));
      m.set('degrade-cp', { id: 'degrade-cp', type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.6 });
      m.set('degrade-in', { id: 'degrade-in', type: 'inbound-rtp', kind: 'audio', packetsLost: perdus, packetsReceived: perdus * 2, jitter: 0.2 });
      return m;
    };
  }
};

(async () => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR && process.env.TMPDIR.length < 40 ? process.env.TMPDIR : os.tmpdir(), 'conf-'));
  const tonalite = ecrireTonalite(dir);
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], appels: { balayageMs: 100, perduMs: 120000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600 } } });
  let b = null;
  try {
    b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--use-file-for-fake-audio-capture=' + tonalite, '--autoplay-policy=no-user-gesture-required', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
  } catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await C0.post('/api/liens/accepter', { code: l.j.code }); }
    const idA = A0.moi.id, idB = B0.moi.id, idC = C0.moi.id;
    const debut = Date.now() + 2 * 60000;
    const cr = await A0.post('/api/reunions', { titre: 'Point confort', debut, fin: debut + 3600000, invites: [B0.moi.id, C0.moi.id] });
    const R = cr.j.reunion.id;
    vrai('population : une réunion « Point confort » dans deux minutes, Ben et Cleo invités', cr.code === 201 && !!R);

    const ouvrir = async (login, pf) => {
      const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr || 1, isMobile: !!pf.mobile, hasTouch: !!pf.mobile, userAgent: pf.ua || undefined,
        reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera'] });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, pf, nom: NOMS[login], erreurs: [] }; page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.addInitScript(INIT);
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const lire = (S, sel) => S.page.evaluate(x => { const e = document.querySelector(x); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) : '(absent)'; }, sel);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    /* un geste : au doigt sur le téléphone, à la souris au bureau — et il PORTE (l'élément visible, et c'est lui qui est sous le point) */
    const toucher = async (S, sel) => {
      const l = S.page.locator(sel).first();
      await l.waitFor({ state: 'visible', timeout: 12000 });
      await l.scrollIntoViewIfNeeded();
      if (S.pf.mobile) await l.tap(); else await l.click();
    };
    const pistesVivantes = (S) => S.page.evaluate(() => window.__pistes.filter(t => t.readyState === 'live').map(t => t.kind).sort());
    const salle = (S) => S.page.evaluate(async () => { const a = OPMSG_SOURCE.appelActif(); return a ? OPMSG_SOURCE.appel(a.id) : null; });
    const deborde = (S) => S.page.evaluate((w) => { void document.body.offsetWidth; return Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - w; }, S.pf.w);

    const A = await ouvrir('ana', { w: 1280, h: 860 }), B = await ouvrir('ben', { w: 390, h: 844, dpr: 2, mobile: true, ua: UA_IPHONE });

    /* ═══ 1. AVANT D'ENTRER — Ana, au bureau, depuis la fiche ═══ */
    console.log('\n1. Avant d\'entrer (Ana, bureau, depuis la fiche de la réunion)');
    await A.page.evaluate(r => { location.hash = '#reunions/' + r; }, R);
    vrai('la fiche propose « Rejoindre »', await att(A, () => !!document.querySelector('#info-corps [data-reu="rejoindre"][data-type="video"]'), null, 15000));
    await toucher(A, '#info-corps [data-reu="rejoindre"][data-type="video"]');
    vrai('population : « Avant d\'entrer » s\'ouvre, caméra et micro vivants', await att(A, () => document.getElementById('feuille-titre').textContent === 'Avant d\'entrer' && document.getElementById('avant-video').videoWidth > 0, null, 15000) && (await pistesVivantes(A)).length === 2);
    await toucher(A, '#g-annuler');
    vrai('⛔ « Annuler » RAMÈNE à la fiche de la réunion (la feuille était posée dessus, pas à sa place)', await att(A, () => document.documentElement.classList.contains('feuille-ouverte') && !!document.querySelector('#info-corps [data-reu="rejoindre"][data-type="video"]') && !document.getElementById('avant-rejoindre')));
    v('⛔ …et l\'aperçu a lâché caméra et micro (la fiche a pris la place de la feuille)', await pistesVivantes(A), []);
    const mediaAvant = (await A.page.evaluate(() => window.__media.length));
    await toucher(A, '#info-corps [data-reu="rejoindre"][data-type="video"]');
    vrai('⛔ « Rejoindre » n\'entre PAS tout de suite : la feuille « Avant d\'entrer » s\'ouvre, avec le titre de la réunion', await att(A, () => document.getElementById('feuille-titre').textContent === 'Avant d\'entrer' && !!document.getElementById('avant-rejoindre') && /Point confort/.test(document.getElementById('info-corps').textContent) && document.documentElement.dataset.salle !== '1'));
    vrai('elle se VOIT : sa caméra joue dans l\'aperçu (une image décodée)', await att(A, () => { const v = document.getElementById('avant-video'); return document.getElementById('avant-apercu').dataset.camera === 'on' && v && v.videoWidth > 0 && v.readyState >= 2; }, null, 15000));
    vrai('elle s\'ENTEND : la jauge du micro monte avec la tonalité', await att(A, () => +document.getElementById('avant-niveau').getAttribute('aria-valuenow') >= 10, null, 10000));
    v('population : l\'aperçu a demandé UNE fois micro et caméra ensemble', (await A.page.evaluate(() => window.__media)).slice(mediaAvant), [{ audio: true, video: true }]);
    v('rien ne part : aucune liaison n\'existe encore, la salle n\'est pas ouverte', await A.page.evaluate(() => [document.documentElement.dataset.salle === '1', OPMSG_SOURCE.appelActif()]), [false, null]);
    await capture(A, '1-avant-bureau');
    await toucher(A, '#avant-cam');
    vrai('« Caméra » coupée : l\'aperçu dit « Caméra coupée »', await att(A, () => document.getElementById('avant-apercu').dataset.camera === 'off' && /Caméra coupée/.test(document.getElementById('avant-sans').textContent) && document.getElementById('avant-cam').getAttribute('aria-pressed') === 'true' && document.getElementById('avant-cam').getAttribute('aria-label') === 'Couper la caméra'));
    v('⛔ …et la caméra est RELÂCHÉE (plus aucune piste vidéo vivante), le micro reste pour la jauge', await pistesVivantes(A), ['audio']);
    await toucher(A, '#avant-cam');
    vrai('rallumée : l\'image revient', await att(A, () => { const v = document.getElementById('avant-video'); return document.getElementById('avant-apercu').dataset.camera === 'on' && v.videoWidth > 0; }, null, 15000));
    await toucher(A, '#avant-micro');
    vrai('« Micro » coupé en entrant : « Couper le micro » est PRESSÉ (comme dans la salle), l\'icône barrée, la jauge passe au gris', await att(A, () => { const b = document.getElementById('avant-micro'); return b.getAttribute('aria-pressed') === 'true' && b.getAttribute('aria-label') === 'Couper le micro' && b.querySelector('use').getAttribute('href') === '#i-mic-off' && document.getElementById('avant-apercu').dataset.micro === 'off'; }));
    await toucher(A, '#avant-rejoindre');
    vrai('« Rejoindre » : Ana est dans la salle', await att(A, () => document.documentElement.dataset.salle === '1' && !document.documentElement.classList.contains('feuille-ouverte'), null, 20000));
    vrai('⛔ elle entre MICRO COUPÉ (son choix), caméra allumée', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true' && document.getElementById('salle-cam').getAttribute('aria-pressed') === 'true', null, 15000));
    v('⛔ l\'aperçu a TOUT lâché : les seules pistes vivantes sont celles de la salle (un micro, une caméra) — plus la copie d\'écoute du micro coupé', await pistesVivantes(A), ['audio', 'audio', 'video']);

    /* ═══ 2. « TU PARLES ? TON MICRO EST COUPÉ » ═══ */
    console.log('\n2. « Tu parles ? Ton micro est coupé »');
    vrai('⛔ micro coupé, la tonalité « parle » : le bandeau paraît', await att(A, () => /Tu parles \? Ton micro est coupé/.test(document.getElementById('salle-bandeaux').textContent), null, 10000));
    v('population : la piste ENVOYÉE reste muette (rien ne part pendant qu\'on écoute la copie)', await A.page.evaluate(() => window.__pistes.filter(t => t.kind === 'audio' && t.readyState === 'live').map(t => t.enabled).sort()), [false, true]);
    await capture(A, '2-tu-parles');

    /* ═══ 3. BEN ENTRE DEPUIS L'AGENDA, AU TÉLÉPHONE, CAMÉRA COUPÉE ═══ */
    console.log('\n3. Ben entre depuis l\'agenda (iPhone 390 px), caméra coupée');
    await B.page.evaluate(() => { location.hash = '#reunions'; });
    vrai('l\'agenda de Ben montre « Rejoindre »', await att(B, () => !!document.querySelector('#liste-reunions .reunion-rejoindre'), null, 15000));
    const mediaB0 = await B.page.evaluate(() => window.__media.length);
    await toucher(B, '#liste-reunions .reunion-rejoindre');
    vrai('la feuille « Avant d\'entrer » s\'ouvre au téléphone, et sa caméra joue', await att(B, () => document.getElementById('feuille-titre').textContent === 'Avant d\'entrer' && document.getElementById('avant-video').videoWidth > 0, null, 15000));
    v('⛔ rien ne déborde à 390 px (la feuille entière, « Rejoindre » compris, tient en largeur)', await deborde(B), 0);
    vrai('« Rejoindre » est à portée (visible en faisant défiler la feuille)', await B.page.evaluate(() => { const r = document.getElementById('avant-rejoindre').getBoundingClientRect(); return r.width > 300 && r.height >= 44; }));
    await capture(B, '3-avant-telephone');
    await toucher(B, '#avant-cam');
    await att(B, () => document.getElementById('avant-apercu').dataset.camera === 'off');
    await toucher(B, '#avant-rejoindre');
    vrai('Ben est dans la salle, caméra coupée (son choix), micro ouvert', await att(B, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-cam').getAttribute('aria-pressed') === 'false' && document.getElementById('salle-micro').getAttribute('aria-pressed') === 'false', null, 20000));
    const mediaB = (await B.page.evaluate(() => window.__media)).slice(mediaB0);
    v('⛔ sa caméra n\'a pas été redemandée en entrant : l\'aperçu (micro + caméra), puis la salle (le micro SEUL)', mediaB, [{ audio: true, video: true }, { audio: true, video: false }]);
    vrai('chez Ana, la tuile de Ben : « Caméra désactivée »', await att(A, uid => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"]'); return !!t && t.dataset.camera === 'off' && /caméra désactivée/.test(t.getAttribute('aria-label')); }, idB, 20000));
    /* la tonalité d'Ana passe chez Ben dès qu'elle ouvre son micro — par le bandeau */
    await toucher(A, '#salle-bandeaux [data-sa="muet-activer"]');
    vrai('Ana touche « Activer le micro » : son micro s\'ouvre, le bandeau s\'en va', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'false' && !/Tu parles/.test(document.getElementById('salle-bandeaux').textContent)));
    vrai('…et chez Ben, la tuile d\'Ana n\'est plus « micro coupé »', await att(B, uid => { const t = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"]'); return !!t && !/micro coupé/.test(t.getAttribute('aria-label')); }, idA, 15000));
    v('⛔ la copie d\'écoute s\'est arrêtée avec le micro ouvert : un micro, une caméra', await pistesVivantes(A), ['audio', 'video']);

    /* ═══ 3 bis. LA BARRE RONDE SEULE (16 octobre 2026, Justin : « ok fait les deux ») — la rangée de pastilles est rangée dans « Plus », Réagir et Lever la main en tête ═══ */
    console.log('\n3 bis. La barre ronde seule ; « Plus » commence par Réagir et Lever la main');
    /* un geste de « Plus » : l'ouvrir, toucher la ligne, et le panneau se referme (le focus revient sur « Plus ») */
    /* « Plus » ouvert ET posé : il se redessine une fois de lui-même, quand la liste des micros et des caméras arrive — on attend que son contenu ne bouge plus (300 ms sans
       changement), sinon on toucherait une ligne que ce redessin remplace */
    const plusOuvert = async (S) => {
      if (await S.page.evaluate(() => document.getElementById('salle-panneau').hidden)) await toucher(S, '#salle-plus');
      await att(S, () => !!document.querySelector('#salle-panneau-corps [data-sa="reaction"]'));
      await S.page.evaluate(() => new Promise(fin => { const c = document.getElementById('salle-panneau-corps'); let t = setTimeout(fini, 300); const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(fini, 300); }); function fini() { o.disconnect(); clearTimeout(garde); fin(); } const garde = setTimeout(fini, 4000); o.observe(c, { childList: true, subtree: true, attributes: true }); }));
    };
    const geste = async (S, sa, s2) => {
      const sel = '#salle-panneau-corps [data-sa="' + sa + '"]' + (s2 ? '[data-s="' + s2 + '"]' : '');
      await plusOuvert(S);
      if (!await att(S, q => !!document.querySelector(q), sel)) return false;
      await toucher(S, sel);
      return att(S, () => document.getElementById('salle-panneau').hidden && document.activeElement === document.getElementById('salle-plus'));
    };
    for (const [S, qui] of [[A, 'Ana (bureau)'], [B, 'Ben (iPhone)']]) {
      v('population : chez ' + qui + ', la barre ronde est là — Micro, Caméra, Participants, Plus', await S.page.evaluate(() => ['salle-micro', 'salle-cam', 'salle-participants', 'salle-plus'].map(id => { const b = document.getElementById(id), r = b && b.getBoundingClientRect(); return !!r && r.width > 0 && !b.hidden; })), [true, true, true, true]);
      v('⛔ …et rien au-dessus d\'elle : ni la rangée de pastilles, ni Réagir, ni Lever la main, ni Enregistrer', await S.page.evaluate(() => [document.querySelectorAll('.salle-pastilles, .salle-pastille').length, ['salle-reagir', 'salle-emojis', 'salle-main', 'salle-vue', 'salle-pip', 'salle-annoter', 'salle-partage-changer', 'salle-rec-btn'].filter(id => document.getElementById(id)).length]), [0, 0]);
      await plusOuvert(S);
      v('« Plus » chez ' + qui + ' : Réagir d\'abord (quatre réactions, puis « Lever la main »), puis l\'affichage', await att(S, () => !!document.querySelector('#salle-panneau-corps [data-sa="reaction"]')) && await S.page.evaluate(() => {
        const rubs = Array.from(document.querySelectorAll('#salle-panneau-corps > .salle-rub')).map(r => r.textContent.trim());
        const premiere = document.querySelector('#salle-panneau-corps > .salle-liste');
        return [rubs.slice(0, 2), Array.from(premiere.querySelectorAll('[data-sa="reaction"]')).map(b => b.getAttribute('aria-label') + ' ' + b.textContent), premiere.querySelector('[data-sa="main"]').getAttribute('role'), premiere.querySelector('[data-sa="main"]').getAttribute('aria-checked'), /Lever la main/.test(premiere.querySelector('[data-sa="main"]').textContent)];
      }), [['Réagir', 'Affichage'], ['Pouce levé 👍', 'Cœur ❤️', 'Bravo 👏', 'Rire 😂'], 'switch', 'false', true]);
      v('…« Vue intervenant » est un interrupteur, éteint (on est en galerie)', await S.page.evaluate(() => { const b = document.querySelector('#salle-panneau-corps [data-sa="vue"]'); return [b.getAttribute('role'), b.getAttribute('aria-checked'), document.getElementById('salle-scene').dataset.vue]; }), ['switch', 'false', 'galerie']);
      await capture(S, S === A ? '3b-plus-bureau' : '3b-plus-telephone');
      await toucher(S, '#salle-panneau-fermer');
    }
    vrai('Ben réagit depuis « Plus » (un cœur) : le panneau se referme, le focus revient sur « Plus »', await geste(B, 'reaction', 'coeur'));
    vrai('…et Ana voit le cœur sur la vignette de Ben', await att(A, uid => { const r = document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"] .salle-reaction'); return !!r && /❤/.test(r.textContent); }, idB, 15000));
    vrai('Ben lève la main depuis « Plus » : le panneau se referme', await geste(B, 'main'));
    vrai('…sa main paraît sur sa vignette, chez lui et chez Ana', await att(B, () => !!document.querySelector('#salle-vous-badges .salle-badge.main')) && await att(A, uid => !!document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"] .salle-badge.main'), idB, 15000));
    await plusOuvert(B);
    vrai('…et « Plus » rouvert la dit levée (l\'interrupteur allumé)', await att(B, () => { const b = document.querySelector('#salle-panneau-corps [data-sa="main"]'); return !!b && b.getAttribute('aria-checked') === 'true'; }));
    await toucher(B, '#salle-panneau-corps [data-sa="main"]');
    vrai('Ben la baisse : plus de main, ni chez lui ni chez Ana', await att(B, () => document.getElementById('salle-panneau').hidden && !document.querySelector('#salle-vous-badges .salle-badge.main')) && await att(A, uid => !document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"] .salle-badge.main'), idB, 15000));
    vrai('Ana passe en « Vue intervenant » depuis « Plus »', await geste(A, 'vue') && await att(A, () => document.getElementById('salle-scene').dataset.vue === 'intervenant'));
    vrai('…et revient à la galerie (l\'interrupteur allumé l\'éteint)', await geste(A, 'vue') && await att(A, () => document.getElementById('salle-scene').dataset.vue === 'galerie'));

    /* ═══ 4. ÉPINGLER POUR MOI ═══ */
    console.log('\n4. Épingler pour moi (Cleo entre, muette : l\'épingle doit DÉCIDER contre Ana, qui parle)');
    const tuile = uid => '.salle-tuile[data-uid="' + uid + '"]';
    const jc = await C0.post('/api/reunions/' + R + '/rejoindre', { type: 'audio' });
    vrai('population : Cleo entre dans la salle (par le service, sans navigateur : muette)', jc.code === 200 && !!(jc.j && jc.j.appel));
    vrai('…Ana et Ben voient sa tuile', await att(A, uid => !!document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"]'), idC, 15000) && await att(B, uid => !!document.querySelector('#salle-scene > .salle-tuile[data-uid="' + uid + '"]'), idC, 15000));
    vrai('population : chez Ben, Ana PARLE (sans épingle, c\'est elle que la vue « intervenant » mettrait devant)', await att(B, async uid => { const a = OPMSG_SOURCE.appelActif(); const s = a && await OPMSG_SOURCE.appel(a.id); return !!s && s.membres.some(m => m.id === uid && m.parle); }, idA, 15000));
    v('population : chez Ben, la vue est la galerie et le bouton d\'épingle de la tuile de Cleo est caché (pas de survol au doigt)', await B.page.evaluate(sel => { const b = document.querySelector(sel + ' .salle-tuile-epingle'); return [document.getElementById('salle-scene').dataset.vue, !!b, b && getComputedStyle(b).opacity]; }, tuile(idC)), ['galerie', true, '0']);
    await toucher(B, tuile(idC));
    vrai('Ben touche la tuile de Cleo : le bouton « Épingler Cleo pour moi » paraît', await att(B, sel => { const b = document.querySelector(sel + ' .salle-tuile-epingle'); return getComputedStyle(b).opacity === '1' && b.getAttribute('aria-label') === 'Épingler Cleo pour moi' && b.getAttribute('aria-pressed') === 'false'; }, tuile(idC)));
    await toucher(B, tuile(idC) + ' .salle-tuile-epingle');
    vrai('⛔ épinglée : chez Ben la vue passe en « intervenant », CLEO devant (pas Ana qui parle), le bouton pressé — son nom ne change pas', await att(B, sel => { const t = document.querySelector(sel), b = t.querySelector('.salle-tuile-epingle'); return document.getElementById('salle-scene').dataset.vue === 'intervenant' && t.classList.contains('grand') && document.querySelectorAll('#salle-scene .salle-tuile.grand').length === 1 && b.getAttribute('aria-pressed') === 'true' && b.getAttribute('aria-label') === 'Épingler Cleo pour moi' && /épinglé pour toi/.test(t.getAttribute('aria-label')); }, tuile(idC)));
    v('⛔ …et chez Ana RIEN ne change : sa vue reste la galerie, aucune épingle (l\'épingle n\'engage que Ben)', await A.page.evaluate(() => [document.getElementById('salle-scene').dataset.vue, document.querySelectorAll('.salle-tuile.epingle, .salle-tuile-epingle[aria-pressed="true"]').length]), ['galerie', 0]);
    await capture(B, '4-epingle-pour-moi');
    await toucher(B, '#salle-participants');
    vrai('le panneau Participants de Ben dit « Ne plus épingler » sur la ligne de Cleo (un nom qui change, sans état pressé)', await att(B, uid => { const x = document.querySelector('#salle-panneau-corps [data-sa="epingler-moi"][data-uid="' + uid + '"]'); return !!x && /Ne plus épingler/.test(x.textContent) && !x.hasAttribute('aria-pressed'); }, idC));
    await toucher(B, '#salle-panneau-corps [data-sa="epingler-moi"][data-uid="' + idC + '"]');
    vrai('touché : l\'épingle est retirée (le bouton redevient « Épingler pour moi », Cleo n\'est plus devant)', await att(B, ([uid, sel]) => { const x = document.querySelector('#salle-panneau-corps [data-sa="epingler-moi"][data-uid="' + uid + '"]'); return !!x && /Épingler pour moi/.test(x.textContent) && !document.querySelector(sel).classList.contains('grand'); }, [idC, tuile(idC)]));
    await toucher(B, '#salle-panneau-fermer');
    await toucher(A, '#salle-participants');
    await toucher(A, '#salle-panneau-corps [data-sa="ligne"][data-uid="' + idC + '"]');
    vrai('chez l\'hôte (Ana), la ligne de Cleo propose « Épingler pour moi » ET « Épingler pour tous »', await att(A, uid => !!document.querySelector('#salle-panneau-corps [data-sa="epingler-moi"][data-uid="' + uid + '"]') && /Épingler pour tous/.test((document.querySelector('#salle-panneau-corps [data-sa="epingler"][data-uid="' + uid + '"]') || {}).textContent || ''), idC));
    await toucher(A, '#salle-panneau-corps [data-sa="epingler-moi"][data-uid="' + idC + '"]');
    vrai('l\'hôte épingle Cleo POUR ELLE : chez Ana, Cleo devant', await att(A, sel => document.getElementById('salle-scene').dataset.vue === 'intervenant' && document.querySelector(sel).classList.contains('grand'), tuile(idC)));
    await toucher(A, '#salle-panneau-fermer');
    /* une preuve que Ben a reçu un état PLUS RÉCENT que l'épingle d'Ana : elle lève la main, il la voit */
    await A.page.evaluate(() => document.getElementById('salle-ecran').focus({ preventScroll: true }));
    await A.page.keyboard.press('h');
    vrai('population : Ana lève la main, et Ben la voit (son état est plus récent que l\'épingle d\'Ana)', await att(A, () => !!document.querySelector('#salle-vous-badges .salle-badge.main')) && await att(B, sel => !!document.querySelector('#salle-scene > ' + sel + ' .salle-badge.main'), tuile(idA), 15000));
    v('⛔ …et chez Ben, Cleo n\'est épinglée pour PERSONNE (ni tuile « épinglée », ni devant, rien dans son état)', await B.page.evaluate(async sel => { const t = document.querySelector(sel); const a = OPMSG_SOURCE.appelActif(); const s = a && await OPMSG_SOURCE.appel(a.id); return [t.classList.contains('epingle'), t.classList.contains('grand'), (s && s.epingle) || null]; }, tuile(idC)), [false, false, null]);
    await A.page.evaluate(() => document.getElementById('salle-ecran').focus({ preventScroll: true }));
    await A.page.keyboard.press('h');
    vrai('Ana baisse la main', await att(A, () => !document.querySelector('#salle-vous-badges .salle-badge.main')));
    await toucher(A, tuile(idC) + ' .salle-tuile-epingle');
    vrai('Ana retire son épingle (le bouton de la tuile) : Cleo n\'est plus devant chez elle', await att(A, sel => !document.querySelector(sel).classList.contains('grand') && document.querySelector(sel + ' .salle-tuile-epingle').getAttribute('aria-pressed') === 'false', tuile(idC)));
    if (await A.page.evaluate(() => document.getElementById('salle-scene').dataset.vue !== 'galerie')) await geste(A, 'vue');
    await att(A, () => document.getElementById('salle-scene').dataset.vue === 'galerie');
    if (await B.page.evaluate(() => document.getElementById('salle-scene').dataset.vue !== 'galerie')) await geste(B, 'vue');
    await att(B, () => document.getElementById('salle-scene').dataset.vue === 'galerie');

    /* ═══ 5. LES RACCOURCIS ═══ */
    console.log('\n5. Les raccourcis clavier (Ana, bureau)');
    const presse = async (k) => { await A.page.evaluate(() => { const e = document.getElementById('salle-ecran'); e.focus({ preventScroll: true }); }); await A.page.keyboard.press(k); };
    await presse('m');
    vrai('M : le micro se coupe', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true'));
    vrai('…et Ben le voit (« micro coupé » sur la tuile d\'Ana)', await att(B, sel => /micro coupé/.test(document.querySelector('#salle-scene > ' + sel).getAttribute('aria-label')), tuile(idA), 15000));
    await presse('m');
    vrai('M de nouveau : le micro se rouvre', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'false'));
    await presse('v');
    vrai('V : la caméra se coupe', await att(A, () => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'false'));
    await presse('v');
    vrai('V de nouveau : elle se rallume', await att(A, () => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'true', null, 15000));
    await presse('h');
    vrai('H : la main se lève (Ben la voit)', await att(A, () => !!document.querySelector('#salle-vous-badges .salle-badge.main')) && await att(B, sel => !!document.querySelector('#salle-scene > ' + sel + ' .salle-badge.main'), tuile(idA), 15000));
    await presse('h');
    vrai('H de nouveau : elle se baisse', await att(A, () => !document.querySelector('#salle-vous-badges .salle-badge.main')));
    await presse('g');
    vrai('G : la vue passe en « intervenant »', await att(A, () => document.getElementById('salle-scene').dataset.vue === 'intervenant'));
    await presse('g');
    await att(A, () => document.getElementById('salle-scene').dataset.vue === 'galerie');
    await presse('?');
    vrai('? : la liste des raccourcis s\'ouvre (M, V, H, G, Espace)', await att(A, () => document.getElementById('salle-panneau-titre').textContent === 'Raccourcis clavier' && ['M', 'V', 'H', 'G', 'Espace'].every(k => Array.from(document.querySelectorAll('#salle-panneau-corps kbd')).some(x => x.textContent === k))));
    vrai('…et en tête, l\'interrupteur « Raccourcis d\'une lettre », allumé', await att(A, () => { const x = document.querySelector('#salle-panneau-corps [data-sa="raccourcis-basculer"][role="switch"]'); return !!x && x.getAttribute('aria-checked') === 'true' && /Raccourcis d'une lettre/.test(x.textContent); }));
    await toucher(A, '#salle-panneau-corps [data-sa="raccourcis-basculer"]');
    vrai('touché : il s\'éteint (WCAG 2.1.4 — un lecteur d\'écran, la commande vocale)', await att(A, () => document.querySelector('#salle-panneau-corps [data-sa="raccourcis-basculer"]').getAttribute('aria-checked') === 'false'));
    await A.page.keyboard.press('Escape');
    vrai('Échap la ferme (et la salle reste ouverte)', await att(A, () => document.getElementById('salle-panneau').hidden && document.documentElement.dataset.salle === '1'));
    await presse('m');
    await toucher(A, '#salle-plus');
    vrai('raccourcis coupés : « Plus » le dit (« Coupés »)', await att(A, () => /Raccourcis clavier\s*Coupés/.test(document.getElementById('salle-panneau-corps').textContent)));
    v('⛔ …et « M » n\'a RIEN fait (le micro est resté ouvert)', await A.page.evaluate(() => document.getElementById('salle-micro').getAttribute('aria-pressed')), 'false');
    await toucher(A, '#salle-panneau-corps [data-sa="raccourcis"]');
    await toucher(A, '#salle-panneau-corps [data-sa="raccourcis-basculer"]');
    vrai('on les rallume (« Plus », puis « Raccourcis clavier »)', await att(A, () => document.querySelector('#salle-panneau-corps [data-sa="raccourcis-basculer"]').getAttribute('aria-checked') === 'true'));
    await toucher(A, '#salle-panneau-fermer');
    await att(A, () => document.getElementById('salle-panneau').hidden);
    await toucher(A, '#salle-discussion');
    await att(A, () => !!document.getElementById('salle-saisie'));
    await A.page.locator('#salle-saisie').focus();
    await A.page.keyboard.type('mvh');
    v('⛔ dans le champ de la discussion, « m », « v », « h » S\'ÉCRIVENT : le micro, la caméra et la main ne bougent pas', await A.page.evaluate(() => [document.getElementById('salle-saisie').value, document.getElementById('salle-micro').getAttribute('aria-pressed'), document.getElementById('salle-cam').getAttribute('aria-pressed'), document.querySelector('#salle-vous-badges .salle-badge.main') ? 'true' : 'false']), ['mvh', 'false', 'true', 'false']);
    await A.page.locator('#salle-saisie').fill('');
    await A.page.keyboard.press('Escape');
    await att(A, () => document.getElementById('salle-panneau').hidden);
    await presse('m');
    await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true');
    await A.page.evaluate(() => document.getElementById('salle-ecran').focus({ preventScroll: true }));
    await A.page.keyboard.down('Space');
    vrai('⛔ l\'espace TENU ouvre le micro', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'false'));
    await A.page.keyboard.up('Space');
    vrai('⛔ …lâché, il le recoupe', await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'true'));
    await toucher(A, '#salle-participants');
    await att(A, () => { const p = document.getElementById('salle-panneau'); return !p.hidden && p.contains(document.activeElement); });     // le panneau prend le foyer, à l'image suivante
    await A.page.evaluate(() => document.getElementById('salle-ecran').focus({ preventScroll: true }));                                            // …puis il revient à la salle (un clic sur son fond)
    v('population : panneau OUVERT, le foyer sur la salle elle-même', await A.page.evaluate(() => [document.getElementById('salle-panneau').hidden, document.activeElement && document.activeElement.id]), [false, 'salle-ecran']);
    await A.page.keyboard.down('Space');
    /* lu PENDANT que l'espace est tenu (le relâcher recoupe le micro de toute façon) : la touche est traitée quand `down` rend la main */
    v('⛔ panneau ouvert, l\'espace TENU ne parle PAS (il garde son sens : défiler, appuyer) — le micro reste coupé', await A.page.evaluate(() => document.getElementById('salle-micro').getAttribute('aria-pressed')), 'true');
    await A.page.keyboard.up('Space');
    await toucher(A, '#salle-panneau-fermer');
    await att(A, () => document.getElementById('salle-panneau').hidden);
    await presse('m');
    await att(A, () => document.getElementById('salle-micro').getAttribute('aria-pressed') === 'false');

    /* ═══ 6. LA QUALITÉ DU RÉSEAU ═══ */
    console.log('\n6. La qualité du réseau de chaque liaison');
    vrai('population : le moteur d\'Ana a jugé la liaison avec Ben — « bonne » sur la boucle locale ; « Vous » n\'est PAS jugé (deux liaisons, dont celle de Cleo, muette)', await att(A, async uid => { const a = OPMSG_SOURCE.appelActif(); const s = a && await OPMSG_SOURCE.appel(a.id); return !!s && s.membres.some(m => m.id === uid && m.reseau === 'bonne') && s.moi.reseau === null; }, idB, 15000));
    v('⛔ une liaison saine ne montre AUCUN badge (on ne montre que ce qui demande l\'attention)', await A.page.evaluate(sel => document.querySelectorAll('#salle-scene > ' + sel + ' .salle-badge.reseau, #salle-vous-badges .salle-badge.reseau').length, tuile(idB)), 0);
    await A.page.evaluate(() => { window.__degrader = true; });
    vrai('⛔ des pertes et 600 ms d\'aller-retour sur la paire CHOISIE (posés dans getStats) : « Connexion faible » sur la tuile de Ben', await att(A, uid => { const t = document.querySelector('.salle-tuile[data-uid="' + uid + '"]'); const b = t && t.querySelector('.salle-badge.reseau.faible'); return !!b && b.getAttribute('aria-label') === 'Connexion faible' && /connexion faible/.test(t.getAttribute('aria-label')); }, idB, 15000));
    await toucher(A, '#salle-participants');
    vrai('…et dans le panneau Participants (« connexion faible » sous le nom de Ben)', await att(A, () => /connexion faible/.test(document.getElementById('salle-panneau-corps').textContent)));
    await toucher(A, '#salle-panneau-fermer');
    v('⛔ …mais PAS sur « Vous », et aucun avis : une liaison faible sur deux peut être la SIENNE (le moteur n\'a rien conclu sur moi)', await A.page.evaluate(async () => { const a = OPMSG_SOURCE.appelActif(); const s = await OPMSG_SOURCE.appel(a.id); return [s.moi.reseau, document.querySelectorAll('#salle-vous-badges .salle-badge.reseau').length, /Ta connexion est faible/.test(document.getElementById('salle-avis').textContent)]; }), [null, 0, false]);
    await capture(A, '6-connexion-faible');
    /* contre-épreuve : quand le moteur juge MA connexion faible (à partir de trois liaisons — simulé ici sur ce qu'il rend à la page), « Vous » et l'avis le disent */
    await A.page.evaluate(() => { const src = window.OPMSG_SOURCE, ap = src.appel; window.__appelVrai = ap; src.appel = async (...x) => { const s = await ap.apply(src, x); if (s && s.moi) s.moi = Object.assign({}, s.moi, { reseau: 'faible' }); return s; }; });
    /* la salle se redessine à son prochain changement : Ana lève la main */
    await A.page.evaluate(() => document.getElementById('salle-ecran').focus({ preventScroll: true }));
    await A.page.keyboard.press('h');
    vrai('…quand le moteur juge MA connexion faible : le badge sur « Vous », et l\'avis, avec ce qui aide', await att(A, () => !!document.querySelector('#salle-vous-badges .salle-badge.reseau.faible') && /Ta connexion est faible/.test(document.getElementById('salle-avis').textContent) && /Couper ta caméra/.test(document.getElementById('salle-avis').textContent), null, 10000));
    await att(A, () => !!document.querySelector('#salle-vous-badges .salle-badge.main'));      // la page a relu sa main (la touche suivante la baisse : elle lit cet état)
    await A.page.evaluate(() => { window.OPMSG_SOURCE.appel = window.__appelVrai; document.getElementById('salle-ecran').focus({ preventScroll: true }); });
    await A.page.keyboard.press('h');
    vrai('(Ana baisse la main)', await att(A, () => !document.querySelector('#salle-vous-badges .salle-badge.main')));
    await A.page.evaluate(() => { window.__degrader = false; });
    vrai('les statistiques redeviennent saines : les badges s\'en vont', await att(A, sel => document.querySelectorAll('#salle-scene > ' + sel + ' .salle-badge.reseau, #salle-vous-badges .salle-badge.reseau').length === 0, tuile(idB), 15000));

    /* ═══ 7. LE FLOU ═══ */
    console.log('\n7. L\'arrière-plan flou');
    await toucher(A, '#salle-plus');
    vrai('Chromium sans effet d\'appareil : « Plus » DIT que le navigateur ne le propose pas (pas d\'interrupteur mort)', await att(A, () => /Arrière-plan flou\s*Ton navigateur ne le propose pas sur cet appareil/.test(document.getElementById('salle-panneau-corps').textContent) && !document.querySelector('[data-sa="flou"]')));
    /* (15 octobre 2026, « plus simple ») la rubrique « Bientôt » (ce qui n'était pas fait) est retirée de « Plus » — l'ancien contrôle lisait un élément qui n'existe plus, donc passait toujours */
    v('« Plus » ne promet plus rien (population : « Arrière-plan flou » y est, ci-dessus) : ni rubrique « Bientôt », ni « Sous-titres en direct », ni « Salles de sous-groupes »', await A.page.evaluate(() => { const c = document.getElementById('salle-panneau-corps'), t = c.textContent;
      return [/Arrière-plan flou/.test(t), !!c.querySelector('.salle-bientot'), Array.from(c.querySelectorAll('.salle-rub, .rubrique')).some(r => /^\s*Bientôt\s*$/.test(r.textContent)), /Sous-titres en direct|Salles de sous-groupes/.test(t)]; }), [true, false, false, false]);
    await toucher(A, '#salle-panneau-fermer');
    await A.page.evaluate(() => { window.__flouSimule = true; });
    await toucher(A, '#salle-plus');
    vrai('⛔ contre-épreuve : un appareil qui sait flouter reçoit l\'interrupteur', await att(A, () => !!document.querySelector('#salle-panneau-corps [data-sa="flou"][role="switch"][aria-checked="false"]')));
    await toucher(A, '#salle-panneau-corps [data-sa="flou"]');
    vrai('le toucher demande `backgroundBlur: true` à la caméra, et l\'interrupteur s\'allume', await att(A, () => window.__contraintes.includes('{"backgroundBlur":true}') && document.querySelector('[data-sa="flou"]').getAttribute('aria-checked') === 'true'));
    await toucher(A, '#salle-panneau-corps [data-sa="flou"]');
    await att(A, () => window.__contraintes.includes('{"backgroundBlur":false}'));
    await toucher(A, '#salle-panneau-fermer');
    await A.page.evaluate(() => { window.__flouSimule = false; });
    await toucher(B, '#salle-cam');
    await att(B, () => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'true', null, 15000);
    await toucher(B, '#salle-plus');
    vrai('sur l\'iPhone, « Plus » dit OÙ le régler (Centre de contrôle, Effets vidéo, Portrait)', await att(B, () => /Centre de contrôle : Effets vidéo, puis Portrait/.test(document.getElementById('salle-panneau-corps').textContent)));
    v('rien ne déborde à 390 px, panneau « Plus » ouvert', await deborde(B), 0);
    await toucher(B, '#salle-panneau-fermer');

    /* ═══ 8. ANNULER AVANT D'ENTRER RELÂCHE TOUT ═══ */
    console.log('\n8. « Annuler » avant d\'entrer relâche la caméra et le micro');
    await toucher(B, '#salle-quitter');
    vrai('Ben quitte la salle', await att(B, () => document.documentElement.dataset.salle !== '1', null, 15000));
    await att(B, () => !document.documentElement.dataset.appel, null, 10000);
    await B.page.evaluate(() => { location.hash = '#reunions'; });
    await att(B, () => !!document.querySelector('#liste-reunions .reunion-rejoindre'), null, 15000);
    await toucher(B, '#liste-reunions .reunion-rejoindre');
    vrai('population : la feuille se rouvre, caméra et micro vivants', await att(B, () => document.getElementById('avant-video') && document.getElementById('avant-video').videoWidth > 0, null, 15000) && (await pistesVivantes(B)).length === 2);
    await toucher(B, '#g-annuler');
    vrai('« Annuler » : la feuille se ferme', await att(B, () => !document.documentElement.classList.contains('feuille-ouverte')));
    v('⛔ …et la caméra et le micro sont RELÂCHÉS (plus aucune piste vivante)', await pistesVivantes(B), []);
    v('…et rien n\'a été rejoint', await B.page.evaluate(() => OPMSG_SOURCE.appelActif()), null);

    for (const [nom, S] of [['Ana', A], ['Ben', B]]) v('aucune erreur JavaScript chez ' + nom, S.erreurs, []);
  } finally {
    await b.close(); await svc.arreter(); await og.fermer();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* rien */ }
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
