/* ══ SONDE — LE VOCAL DE JUSTIN ARRIVE CHEZ L'AGENT, L'AGENT RÉPOND, ET « ÉCOUTER » LIT SA RÉPONSE (OP MESSAGES, 28 octobre 2026) ═══════════════════════════════════════════
   Justin : « ça serait bien qu'ils puissent lire ça [mes vocaux] et même eux me répondre vocalement ». Contre le VRAI serveur de la Tour (ses seize agents, un FAUX Anthropic), le VRAI
   service d'OP MESSAGES (le pont, son accès bêta), un FAUX ouvrier de transcription, et la VRAIE page dans Chromium (127.0.0.1 seulement), Justin au téléphone (390 px, au doigt) :
     1. Justin envoie un vocal et ne touche à rien : l'ouvrier reçoit les octets, le texte (simulé) entre au registre de la Tour marqué 🎤, Victor y répond comme à un texte, SA RÉPONSE
        paraît dans la page ;
     2. sous la réponse de l'agent : « Écouter » — 32 px dans la mise en page, 44 px qui RÉPONDENT au doigt, du côté de la bulle reçue, rien ne défile de côté ; RIEN sous MON message ;
     3. toucher : `speechSynthesis.speak` est appelé (injecté : ce Chromium n'a aucune voix) EN `fr-FR`, avec la voix locale, DANS LE GESTE (`navigator.userActivation.isActive`), le texte lu
        sans lien, sans mise en forme, sans arobase ni émoji ; le lien dit « Arrêter » ; retoucher l'arrête ; la lecture se TAIT à la fin ;
     4. le menu du message (⋯) : la même ligne, « Écouter » puis « Arrêter la lecture » — et le geste du menu est un geste (userActivation) ;
     5. UN SEUL SON À LA FOIS : un second message coupe le premier ; lancer un VOCAL coupe la voix ; un message SUPPRIMÉ pendant qu'on l'écoute coupe la voix ;
     6. sans synthèse du navigateur, ou avec une seule voix DISTANTE (Chrome : « Google français »), ni lien ni ligne de menu ; une voix locale qui arrive plus tard (`voiceschanged`) fait paraître le lien ;
     7. la transcription qui traîne : « Ça prend plus longtemps que d'habitude » (délai réduit pour la sonde), puis le texte quand l'ouvrier répond ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-ecoute.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const P = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
if (!fs.existsSync(path.join(T.RACINE, 'server', 'node_modules'))) { console.log('  — server/node_modules absent : sonde non exécutée (npm i dans server/)'); console.log('\n0 ✓  0 ✗'); process.exit(0); }
let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const RACINE = T.RACINE;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const MDP = 'mot-de-passe-de-la-sonde-ecoute', MDP_J = 'pw-justin-sonde-ecoute';
const SECRET = crypto.randomBytes(32).toString('hex'), SECRET_OUV = 'OuvrierEcoute-' + 'Wz'.repeat(18);
const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1280, height: 860 } };
const dort = T.dort;
setTimeout(() => { console.log('  ✗ sonde FIGÉE au-delà de 240 s'); process.exit(1); }, 240000).unref();

/* ── le faux Anthropic : « Reçu <marqueur> » + une phrase assez longue pour avoir son lien « Écouter » ── */
const recus = [];
const faux = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
  let j = {}; try { j = JSON.parse(b); } catch (e) {}
  const brut = JSON.stringify(j.messages || []);
  const marq = (brut.match(/MARQ-[a-z0-9]+/g) || []).pop() || null;
  recus.push({ marq, brut });
  r.writeHead(200, { 'Content-Type': 'application/json' });
  r.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: marq ? 'Reçu ' + marq + '. Je prépare le point de la semaine, puis je te le renvoie ce soir avec les devis en attente.' : 'Reçu.' }], usage: { input_tokens: 1, output_tokens: 1 } }));
}); });

/* ── le faux ouvrier de transcription ── */
const OUV = { travaux: [], enAttente: [] };
OUV.serveur = http.createServer((q, r) => {
  const rep = (code, j) => { r.writeHead(code, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
  if (q.headers.authorization !== 'Bearer ' + SECRET_OUV) { q.resume(); return rep(401, { error: 'non_autorise' }); }
  if (q.method === 'GET' && q.url === '/sante') { q.resume(); return rep(200, { ok: true, sha: 'banc0000', occupe: false }); }
  if (q.method === 'POST' && q.url === '/transcrire') { const m = []; q.on('data', d => m.push(d)); q.on('end', () => { const t = { octets: Buffer.concat(m), repondre: rep }; OUV.travaux.push(t); OUV.enAttente.push(t); }); return; }
  q.resume(); rep(404, { error: 'introuvable' });
});
OUV.relacher = (code, j) => { const t = OUV.enAttente.shift(); if (t) t.repondre(code, j); return !!t; };

/* ── la Tour : le VRAI serveur ── */
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3130-'));
const D = path.join(banc, 'data'); fs.mkdirSync(D);
async function lancerTour(pont) {
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const cfg = path.join(banc, 'config.json'), vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP), agents: { cleApi: 'sk-ant-banc', reunionsAuto: false }, opmsgPont: pont }));
  const modes = {}; for (const a of require(path.join(RACINE, 'server', 'agents.js')).AGENTS) modes[a.id] = 'brouillon';
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false }, modes }));
  require('./banc-horaires.js').toujoursOuvert(D);
  const port = await T.portLibre(), base = 'http://127.0.0.1:' + port;
  let sortie = '';
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + faux.address().port }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
  const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 20000, 100);
  if (!vivant) { try { enfant.kill('SIGKILL'); } catch (e) {} throw new Error('la Tour n\'a pas démarré\n' + sortie.slice(0, 1500)); }
  const t = { base, enfant, tuer: async () => { try { enfant.kill('SIGKILL'); } catch (e) {} await T.attendre(() => enfant.exitCode !== null || enfant.signalCode !== null, 4000, 20); } };
  const lg = await (await fetch(base + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json();
  t.api = async (methode, chemin, corps) => { const r = await fetch(base + chemin, { method: methode, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lg.token }, body: corps === undefined ? undefined : JSON.stringify(corps) }); let j = null; try { j = await r.json(); } catch (e) {} return { code: r.status, j }; };
  t.fil = async (fil) => ((await t.api('GET', '/api/monitor/conversations/' + fil)).j || {}).messages || [];
  return t;
}

/* ── ce que la page reçoit AVANT son script : une synthèse vocale qui note tout (ce Chromium n'a aucune voix) ── */
const INJECTION = (voix) => `(() => {
  const V = window.__voix = { parles: [], annulations: 0, file: [] };
  class U { constructor(t) { this.text = t; this.lang = ''; this.voice = null; this.onend = null; this.onerror = null; } }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true, writable: true });
  const ecouteurs = [];
  const synth = {
    getVoices() { return window.__voixListe; },
    speak(u) { V.parles.push({ text: u.text, lang: u.lang, voix: u.voice && u.voice.name, geste: !!(navigator.userActivation && navigator.userActivation.isActive) }); V.file.push(u); },
    cancel() { V.annulations++; const q = V.file.splice(0); for (const u of q) if (typeof u.onerror === 'function') u.onerror({ error: 'canceled' }); },
    addEventListener(t, f) { if (t === 'voiceschanged') ecouteurs.push(f); },
  };
  window.__voixListe = ${JSON.stringify(voix)};
  window.__voixChange = (liste) => { window.__voixListe = liste; for (const f of ecouteurs) f({}); };
  window.__voixFinir = () => { const u = V.file.shift(); if (u && typeof u.onend === 'function') u.onend({}); return !!u; };
  ${voix === null ? "Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });" : "Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });"}
})();`;
const VOIX_LOCALE = [{ name: 'Amélie', lang: 'fr-FR', localService: true, default: true }];
const VOIX_GOOGLE = [{ name: 'Google français', lang: 'fr-FR', localService: false, default: true }];

(async () => {
  console.log('── sonde · le vocal de Justin chez l\'agent, et « Écouter » ──');
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  await new Promise(r => OUV.serveur.listen(0, '127.0.0.1', r));
  let tour = null, svc = null, b = null;
  const pages = [];
  const fermer = async () => { for (const X of pages) { try { await X.ctx.close(); } catch (e) {} } try { if (b) await b.close(); } catch (e) {} if (svc) await svc.arreter(); if (tour) await tour.tuer(); faux.close(); try { OUV.serveur.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  try {
    const portOpm = await T.portLibre(), urlOpm = 'http://127.0.0.1:' + portOpm;
    tour = await lancerTour({ url: urlOpm, secret: SECRET, pasLireMs: 60, pasEnvoiMs: 40, attenteMaxMs: 400, vocalPasMs: 100, vocalDelaiMs: 120000 });
    const a1 = await tour.api('POST', '/api/monitor/beta', { login: 'justin', pass: MDP_J, nom: 'Justin', chantier: 'sonde écoute', apps: ['messages'] });
    vrai('(population) l\'accès de Justin est ouvert par la VRAIE route de la Tour', a1.code === 200 && /^b[0-9a-f]{10}$/.test(a1.j.compte.id));
    const trCfg = { url: 'http://127.0.0.1:' + OUV.serveur.address().port, secret: SECRET_OUV, sondeMs: 60, delaiSondeMs: 1000, delaiBaseMs: 120000, delaiParSMs: 100, file: 4, parPersonne: 3, budgetHeureS: 300, essais: 2, parHeure: 30, dureeMaxS: 60 };
    svc = await T.lancerService({ port: portOpm, urlGestion: tour.base, config: { origines: [urlOpm], beta: { relectureMs: 3500, timeoutMs: 3000 }, pont: { actif: true, secretSha256: sha(SECRET), justin: a1.j.compte.id }, transcription: trCfg } });
    const justin = await T.connecter(svc, {}, 'justin', MDP_J, '198.51.100.77');
    const prets = await T.attendre(async () => ((await justin.get('/api/conversations')).j.conversations || []).length >= 20, 25000, 100);
    vrai('(population) OP MESSAGES a ses seize agents et ses quatre groupes (le pont a installé)', !!prets);
    const liste = (await justin.get('/api/conversations')).j.conversations;
    const victor = liste.find(c => c.type === 'direct' && c.autre.prenom === 'Victor'), equipe = liste.find(c => c.type === 'groupe' && c.nom === 'Équipe');
    vrai('(population) la directe avec Victor et le groupe Équipe existent', !!victor && !!equipe);
    vrai('(population) l\'ouvrier de transcription est sondé', !!(await T.attendre(async () => { const h = await (await fetch(svc.base + '/health')).json(); return h.transcription && h.transcription.ok === true; }, 8000, 50)));

    try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
    catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await fermer(); process.exit(2); }
    const ouvrir = async (pf, voix, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf));
      await ctx.addInitScript(INJECTION(voix));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [] };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill('justin'); await page.locator('#c-pass').fill(MDP_J); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const voix = (X) => X.page.evaluate(() => ({ parles: window.__voix.parles.slice(), annulations: window.__voix.annulations, file: window.__voix.file.length }));
    const liens = (X) => X.page.evaluate(() => Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).map(m => { const l = m.querySelector('.ecouter-lien'); return { mid: m.dataset.mid, moi: m.classList.contains('de-moi'), texte: (m.querySelector('.bulle') || {}).textContent || '', lien: l ? { mot: l.textContent, label: l.getAttribute('aria-label'), actif: l.hasAttribute('data-actif') } : null }; }));
    const lienDe = (X, motif) => X.page.evaluate((mot) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => (x.querySelector('.bulle') || {}).textContent && x.querySelector('.bulle').textContent.indexOf(mot) >= 0); if (!m) return null; const l = m.querySelector('.ecouter-lien'); return l ? l.dataset.ecouter : false; }, motif);
    /* l'appui LONG au doigt (le menu d'un message sur téléphone : le ⋯ n'y existe pas) — un vrai contact tactile retenu 650 ms, par le protocole du navigateur */
    const appuiLong = async (X, selecteur) => {
      const cdp = X.cdp || (X.cdp = await X.ctx.newCDPSession(X.page));
      const r = await X.page.evaluate((sel) => { const e = document.querySelector(sel); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: Math.round(b.left + Math.min(b.width / 2, 60)), y: Math.round(b.top + b.height / 2) }; }, selecteur);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
      await X.page.waitForTimeout(650);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await X.page.waitForTimeout(650);                                  // le premier clic qui suit le relâcher est avalé par la page (une demi-seconde) : un vrai doigt met plus longtemps
    };
    const idsApres = async (mot) => (await justin.get('/api/conversations/' + victor.id + '/messages')).j.messages.filter(m => (m.texte || '').indexOf(mot) >= 0);

    /* ═══ 1. LE VOCAL DE JUSTIN ARRIVE CHEZ L'AGENT, L'AGENT RÉPOND ═══════════════════════════════════════════════════════════════════════ */
    console.log('\n── 1. Justin envoie un vocal et ne touche à rien : Victor y répond comme à un texte ──');
    const A = await ouvrir(TEL, VOIX_LOCALE, '#messages/' + victor.id);
    vrai('la conversation avec Victor est ouverte dans la page', await att(A, () => !!document.getElementById('conv-messages')));
    const corps = Buffer.concat([P.webm(3000), Buffer.from('VOCAL-ECOUTE-1')]);
    const d = await P.deposer(justin, { conv: victor.id, genre: 'vocal', corps });
    const env = await justin.post('/api/conversations/' + victor.id + '/messages', { cid: 'opm-sonde-vocal-0001', type: 'vocal', piece: d.j.id, dur: 5, bars: [6, 14, 18, 10, 16, 6, 12, 18, 9, 14] });
    v('Justin envoie un vocal (201)', env.code, 201);
    vrai('le vocal paraît dans la page', await att(A, () => !!document.querySelector('#conv-messages .vocal')));
    vrai('⛔ SANS un geste de plus, l\'ouvrier reçoit les octets EXACTS du vocal (le pont les a demandés)', !!(await T.attendre(() => OUV.travaux.length === 1, 8000, 20)) && OUV.travaux[0].octets.equals(corps));
    const nA = recus.length;
    OUV.relacher(200, { ok: true, texte: 'Victor, MARQ-ecoute1 fais le point sur la semaine', langue: 'fr' });
    const dansReg = await T.attendre(async () => (await tour.fil('victor')).find(m => m.de === 'justin' && /MARQ-ecoute1/.test(m.texte)), 15000, 60);
    vrai('le texte entre au registre de la Tour, de Justin, marqué 🎤', !!dansReg && (await tour.fil('victor')).filter(m => /MARQ-ecoute1/.test(m.texte))[0].texte.startsWith('🎤 '));
    vrai('⛔ Victor y répond (faux cerveau : il a reçu le texte du vocal) et SA RÉPONSE paraît dans la page de Justin', await att(A, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre .bulle')).some(x => /Reçu MARQ-ecoute1/.test(x.textContent)), null, 20000) && recus.slice(nA).some(r => /fais le point sur la semaine/.test(r.brut)));
    await capture(A, 'ecoute1-reponse');

    /* ═══ 2. LE LIEN « ÉCOUTER » ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 2. Sous la réponse de l\'agent : « Écouter » (32 px, 44 px au doigt) ; rien sous mon message ──');
    vrai('le lien paraît sous la réponse de Victor', await att(A, () => !!document.querySelector('#conv-messages .msg.de-autre .ecouter-lien')));
    const etat1 = await liens(A);
    vrai('(population) la page montre mon vocal, mon texte 🎤 ne vient pas du fil (c\'est le registre de la Tour) et au moins une réponse de Victor', etat1.some(m => m.moi) && etat1.some(m => !m.moi && /Reçu MARQ-ecoute1/.test(m.texte)));
    v('⛔ RIEN sous mes propres messages', etat1.filter(m => m.moi && m.lien).length, 0);
    const rep = etat1.find(m => !m.moi && /Reçu MARQ-ecoute1/.test(m.texte));
    v('le lien dit « Écouter » et son nom accessible le dit aussi', rep.lien && [rep.lien.mot, rep.lien.label, rep.lien.actif], ['Écouter', 'Écouter ce message à voix haute', false]);
    const geo = await A.page.evaluate((mid) => {
      const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.dataset.mid === mid), l = m.querySelector('.ecouter-lien'), bu = m.querySelector('.bulle'), r = l.getBoundingClientRect(), rb = bu.getBoundingClientRect();
      const repond = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === l || l.contains(e)); };
      return { h: Math.round(r.height), g: Math.round(r.left), d: Math.round(r.right), bulleG: Math.round(rb.left), zone: [repond(r.left + r.width / 2, r.top - 5), repond(r.left + r.width / 2, r.bottom + 5)], large: document.documentElement.scrollWidth <= innerWidth + 1, vue: innerWidth, largeur: Math.round(r.width) };
    }, rep.mid);
    v('⛔ 32 px dans la mise en page, mais 44 px qui RÉPONDENT au doigt (5 px au-dessus et au-dessous) ; dans l\'écran ; rien ne défile de côté', [geo.h, geo.zone, geo.g >= 0 && geo.d <= geo.vue, geo.large], [32, [true, true], true, true]);
    vrai('…du côté de la bulle reçue (à gauche), et PAS étiré sur la colonne (un toucher à côté ne lance pas la voix)', Math.abs(geo.g - geo.bulleG) <= 16 && geo.largeur < 140);
    await capture(A, 'ecoute2-lien');

    /* ═══ 3. LA VOIX ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 3. Toucher « Écouter » : speak() en fr-FR, DANS le geste ──');
    const lien1 = A.page.locator('#conv-messages .msg[data-mid="' + rep.mid + '"] .ecouter-lien');
    await lien1.tap();
    vrai('⛔ `speechSynthesis.speak` est appelé', !!(await att(A, () => window.__voix.parles.length >= 1)));
    const s1 = await voix(A);
    v('…en français de France, avec la voix locale', [s1.parles[0].lang, s1.parles[0].voix], ['fr-FR', 'Amélie']);
    v('⛔ DANS LE GESTE (`navigator.userActivation.isActive` au moment de `speak` : Safari exige ça)', s1.parles.every(p => p.geste), true);
    vrai('…le texte lu est celui de la réponse de Victor', /Je prépare le point de la semaine/.test(s1.parles.map(p => p.text).join(' ')) && s1.parles.every(p => p.text.length <= 200));
    const e2 = (await liens(A)).find(m => m.mid === rep.mid);
    v('le lien dit « Arrêter » (le nom accessible aussi), sans refaire le message', e2.lien && [e2.lien.mot, e2.lien.label, e2.lien.actif], ['Arrêter', 'Arrêter la lecture à voix haute', true]);
    await capture(A, 'ecoute3-lecture');
    await lien1.tap();
    vrai('retoucher le lien ARRÊTE la lecture (une annulation) et il redit « Écouter »', await att(A, (mid) => window.__voix.annulations >= 1 && document.querySelector('.msg[data-mid="' + mid + '"] .ecouter-lien').textContent === 'Écouter', rep.mid));
    await lien1.tap();
    await att(A, () => window.__voix.file.length >= 1);
    const avantFin = (await voix(A)).parles.length;
    await A.page.evaluate(() => { while (window.__voixFinir()); });
    vrai('⛔ la lecture va au bout : le libellé redevient « Écouter », plus rien en cours', await att(A, (mid) => document.querySelector('.msg[data-mid="' + mid + '"] .ecouter-lien').textContent === 'Écouter', rep.mid) && avantFin >= 1);

    /* un message avec un lien, du gras, une mention, un émoji */
    const poste = await T.client(svc.base).post('/api/pont/poster', { messages: [{ fil: 'victor', de: 'victor', texte: '**Important** : le devis DOS-000123 est prêt, voir https://exemple.fr/devis/123 puis confirme-moi l\'envoi 👍', cid: 'sonde-ecoute-0001' }] }, { entetes: { 'X-OPM-Pont': SECRET } });
    v('(population) un second message de Victor, avec un lien, du gras et un émoji', [poste.code, poste.j.resultats[0].ok], [200, true]);
    vrai('il paraît en direct, avec son lien « Écouter »', await att(A, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre')).some(m => /DOS-000123/.test(m.textContent) && !!m.querySelector('.ecouter-lien'))));
    const mid2 = await lienDe(A, 'DOS-000123');
    const avant2 = (await voix(A)).parles.length;
    await A.page.locator('#conv-messages .msg[data-mid="' + mid2 + '"] .ecouter-lien').tap();
    await att(A, (n) => window.__voix.parles.length > n, avant2);
    const s2 = await voix(A);
    v('⛔ ce que la voix lit : sans le lien, sans les étoiles, sans l\'émoji', s2.parles.slice(avant2).map(p => p.text).join(' '), 'Important : le devis DOS-000123 est prêt, voir puis confirme-moi l\'envoi');

    /* ═══ 4. LE MENU ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 4. Le menu du message : la même ligne, un geste ──');
    const annulAvant = (await voix(A)).annulations;
    await appuiLong(A, '#conv-messages .msg[data-mid="' + rep.mid + '"] .bulle');
    vrai('le menu s\'ouvre (appui long au doigt) avec « Écouter »', await att(A, () => !!document.querySelector('#menu-msg [data-menu="ecouter"]')));
    const libMenu = await A.page.evaluate(() => document.querySelector('#menu-msg [data-menu="ecouter"]').textContent);
    v('(la voix du message précédent lit encore : le menu de CET autre message propose « Écouter »)', libMenu, 'Écouter');
    await A.page.locator('#menu-msg [data-menu="ecouter"]').tap();
    vrai('⛔ le geste du MENU lance la voix de l\'autre message : l\'ancienne est coupée (un seul son), la nouvelle part', await att(A, (n) => window.__voix.annulations > n && window.__voix.parles.length > 0, annulAvant));
    const s3 = await voix(A);
    v('⛔ …dans le geste (userActivation) et en fr-FR', [s3.parles[s3.parles.length - 1].geste, s3.parles[s3.parles.length - 1].lang], [true, 'fr-FR']);
    vrai('…et c\'est la réponse de Victor qui est lue', /Je prépare le point/.test(s3.parles[s3.parles.length - 1].text));
    vrai('(le menu s\'est refermé)', await att(A, () => document.getElementById('menu-fond').hidden));
    await appuiLong(A, '#conv-messages .msg[data-mid="' + rep.mid + '"] .bulle');
    vrai('rouvert pendant l\'écoute : la ligne dit « Arrêter la lecture »', await att(A, () => { const b = document.querySelector('#menu-msg [data-menu="ecouter"]'); return !!b && b.textContent === 'Arrêter la lecture'; }));
    const annul3 = (await voix(A)).annulations;
    await A.page.locator('#menu-msg [data-menu="ecouter"]').tap();
    vrai('…et la toucher ARRÊTE', await att(A, (n) => window.__voix.annulations > n, annul3));
    await A.page.evaluate(() => document.activeElement && document.activeElement.blur());

    /* ═══ 5. UN SEUL SON À LA FOIS ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 5. Un seul son à la fois ──');
    await A.page.locator('#conv-messages .msg[data-mid="' + rep.mid + '"] .ecouter-lien').tap();
    await att(A, () => window.__voix.file.length >= 1);
    const annul4 = (await voix(A)).annulations;
    await A.page.locator('#conv-messages .msg[data-mid="' + mid2 + '"] .ecouter-lien').tap();
    vrai('⛔ écouter l\'autre message coupe le premier (une annulation) : un seul lien dit « Arrêter »', await att(A, (n) => window.__voix.annulations === n + 1 && document.querySelectorAll('#conv-messages .ecouter-lien[data-actif]').length === 1, annul4));
    const vo = await A.page.evaluate(() => { const m = Array.from(document.querySelectorAll('#conv-messages .msg.de-moi')).find(x => x.querySelector('.vocal')); return m ? m.dataset.mid : null; });
    vrai('(population) mon vocal est dans le fil', !!vo);
    const annul5 = (await voix(A)).annulations;
    await A.page.locator('#conv-messages .msg[data-mid="' + vo + '"] [data-lire]').tap();
    vrai('⛔ lancer un VOCAL coupe la voix (une annulation) : plus aucun lien « Arrêter »', await att(A, (n) => window.__voix.annulations > n && document.querySelectorAll('#conv-messages .ecouter-lien[data-actif]').length === 0, annul5));
    /* un message supprimé pendant qu'on l'écoute */
    await A.page.locator('#conv-messages .msg[data-mid="' + mid2 + '"] .ecouter-lien').tap();
    await att(A, () => window.__voix.file.length >= 1);
    const annul6 = (await voix(A)).annulations;
    const seqs = (await justin.get('/api/conversations/' + victor.id + '/messages')).j.messages.filter(m => /DOS-000123/.test(m.texte || ''));
    const suppr = await T.client(svc.base).post('/api/pont/supprimer', { fil: 'victor', seq: seqs[0].seq }, { entetes: { 'X-OPM-Pont': SECRET } });
    v('(la Tour supprime ce message : il part pour tous, comme quand Justin le supprime là-bas)', [suppr.code, suppr.j.ok], [200, true]);
    vrai('⛔ le message SUPPRIMÉ pendant l\'écoute : la voix se tait', await att(A, (n) => window.__voix.annulations > n && document.querySelectorAll('#conv-messages .ecouter-lien[data-actif]').length === 0, annul6));
    await capture(A, 'ecoute5-fin');

    /* ═══ 6. SANS SYNTHÈSE, SANS VOIX LOCALE ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 6. Sans synthèse, avec une voix distante seulement, ou avec une voix qui arrive plus tard ──');
    const B = await ouvrir(TEL, null, '#messages/' + victor.id);
    vrai('(population) la réponse de Victor est dans la page sans synthèse', await att(B, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre .bulle')).some(x => /Reçu MARQ-ecoute1/.test(x.textContent))));
    v('⛔ SANS synthèse du navigateur : aucun lien « Écouter »', await B.page.evaluate(() => document.querySelectorAll('.ecouter-lien').length), 0);
    await appuiLong(B, '#conv-messages .msg.de-autre .bulle');
    vrai('(le menu est ouvert)', await att(B, () => !!document.querySelector('#menu-msg [data-menu="repondre"]')));
    v('…ni ligne dans le menu', await B.page.evaluate(() => document.querySelectorAll('#menu-msg [data-menu="ecouter"]').length), 0);
    const C = await ouvrir(TEL, VOIX_GOOGLE, '#messages/' + victor.id);
    vrai('(population) la réponse de Victor est dans la page, voix distante seule', await att(C, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre .bulle')).some(x => /Reçu MARQ-ecoute1/.test(x.textContent))));
    v('⛔ avec une SEULE voix distante (« Google français » : le texte partirait sur un serveur) : aucun lien', await C.page.evaluate(() => document.querySelectorAll('.ecouter-lien').length), 0);
    await C.page.evaluate((l) => window.__voixChange(l), VOIX_LOCALE);
    vrai('…la voix locale arrive (« voiceschanged ») : le lien PARAÎT, sans recharger', await att(C, () => document.querySelectorAll('#conv-messages .ecouter-lien').length >= 1));
    await C.page.evaluate((l) => window.__voixChange(l), VOIX_GOOGLE);
    vrai('…elle repart : le lien disparaît', await att(C, () => document.querySelectorAll('#conv-messages .ecouter-lien').length === 0));

    /* ═══ 7. LA TRANSCRIPTION QUI TRAÎNE ══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 7. « Voir la transcription » quand l\'ouvrier traîne : la phrase change ──');
    const corps2 = Buffer.concat([P.webm(3000), Buffer.from('VOCAL-ECOUTE-2')]);
    const d2 = await P.deposer(justin, { conv: equipe.id, genre: 'vocal', corps: corps2 });
    await justin.post('/api/conversations/' + equipe.id + '/messages', { cid: 'opm-sonde-vocal-0002', type: 'vocal', piece: d2.j.id, dur: 1, bars: [6, 14, 18, 10, 16, 6, 12, 18, 9, 14] });
    vrai('(l\'ouvrier reçoit ce vocal aussi : le pont l\'a demandé)', !!(await T.attendre(() => OUV.travaux.length === 2, 8000, 20)));
    const E = await ouvrir(BUREAU, VOIX_LOCALE, '#messages/' + equipe.id);
    vrai('le vocal est dans le groupe, « Voir la transcription » sous lui', await att(E, () => !!document.querySelector('#conv-messages .transcrire-lien')));
    await E.page.locator('#conv-messages .transcrire-lien').first().click();
    vrai('« Transcription en cours… »', await att(E, () => /Transcription en cours…/.test((document.querySelector('#conv-messages p.transcription') || {}).textContent || '')));
    const lent = await att(E, () => /plus longtemps que d'habitude/.test((document.querySelector('#conv-messages p.transcription') || {}).textContent || ''), null, 45000);
    vrai('⛔ l\'ouvrier ne répond pas : au bout de 31,5 s (30 s + 1,5 s par seconde de vocal), la phrase CHANGE — « Ça prend plus longtemps que d\'habitude » — et « Réessayer » paraît', lent && await E.page.evaluate(() => !!document.querySelector('#conv-messages p.transcription .tr-reessayer')));
    await capture(E, 'ecoute7-lent');
    OUV.relacher(200, { ok: true, texte: 'Enfin le texte', langue: 'fr' });
    vrai('le texte arrive quand l\'ouvrier répond, la phrase de lenteur disparaît', await att(E, () => /Enfin le texte/.test((document.querySelector('#conv-messages p.transcription') || {}).textContent || '') && !/plus longtemps/.test(document.getElementById('conv-messages').textContent)));

    /* ═══ aucune erreur JavaScript ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    for (const [nom, X] of [['téléphone', A], ['sans synthèse', B], ['voix distante', C], ['bureau', E]]) v('aucune erreur JavaScript (' + nom + ')', X.erreurs, []);
    void dort;
  } catch (e) {
    console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1;
  } finally { await fermer(); }
})().catch(e => { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => fin());
