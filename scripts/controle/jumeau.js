/* Le JUMEAU de teamop.fr : le site et le serveur RÉELS, montés sur cette machine, pour qu'un client
   fictif les parcoure de bout en bout sans qu'un seul octet ne parte en production.

   Justin, 17 octobre 2026 : « je voudrais qu'ils partent du site internet comme s'ils commandaient
   l'application […] je veux un contrôle ». Pourquoi un jumeau et pas teamop.fr :
     · commander pour de vrai, c'est payer pour de vrai (la clé Stripe du VPS est en mode réel) ;
     · ouvrir un compte en production, c'est une entreprise de plus dans l'annuaire, des courriels
       envoyés, et une Tour où il faut faire le ménage — chaque semaine ;
     · et piloter `app.html` en production expose au navigateur les données de vrais clients (CLAUDE.md).

   Ce qui est RÉEL ici :
     · les pages, celles que le site sert, assemblées par `scripts/assembler-site.sh` (la même liste
       blanche que la publication) et servies AU NAVIGATEUR SOUS LEUR VRAIE ADRESSE : la page croit être
       sur https://teamop.fr, elle appelle https://api.teamop.fr — mêmes origines, même CORS qu'en ligne ;
     · le serveur, `server/index.js`, avec ses vraies routes, son vrai stockage (dans un dossier jetable)
       et son vrai envoi de courriel (vers un facteur local qui garde tout).
   Ce qui est SIMULÉ, et le rapport le dit :
     · Stripe : une imitation AVEC ÉTAT dans le processus du serveur (sessions de paiement, abonnements),
       et une fausse page de paiement « checkout.stripe.com » où le client fictif paie ;
     · tout le reste du web (Firebase, polices, Google) : COUPÉ, et chaque tentative est comptée ;
     · le service worker : désactivé (il garderait en cache des réponses de l'API d'un passage à l'autre).

   Usage (depuis un parcours) :
     const J = await require('./jumeau').demarrer({ sortie: '/chemin/rapport' });
     const page = await J.onglet({ profil: 'telephone' });
     await page.aller('https://teamop.fr/'); …
     await J.arreter();
   ⛔ 127.0.0.1 seulement. Des entreprises et des adresses fictives (`@exemple.fr`) seulement. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const DEPOT = path.join(__dirname, '..', '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/* Les adresses IP « du client » et « de l'attaquant », prises dans la plage réservée à la documentation
   (RFC 5737) : le serveur est derrière `trust proxy`, il lit `X-Forwarded-For` comme derrière nginx — c'est ce
   qui permet de voir l'anti-abus compter PAR ADRESSE, comme en ligne. */
const IP_CLIENT = '203.0.113.10';

const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.txt': 'text/plain;charset=utf-8', '.xml': 'application/xml', '.pdf': 'application/pdf' };

const PROFILS = {
  telephone: { w: 390, h: 844, dpr: 3, tac: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1' },
  bureau: { w: 1440, h: 900, dpr: 1, tac: false, ua: '' },
};

/* ── Le courrier : un facteur SMTP qui garde tout, et le décodage de ce qu'il reçoit ──────────────────────────
   ⛔ Le point doublé (RFC 5321 §4.5.2) est retiré : une ligne qui commence par « . » voyage « .. », et sans ce
   retrait on accuse le serveur d'écrire « set-admin..sh » (CLAUDE.md, test-832). */
function facteur() {
  const recus = [];
  const srv = net.createServer(c => {
    c.write('220 jumeau\r\n'); let t = '', corps = false, msg = '', de = '', a = [];
    c.on('data', d => { t += d; let i;
      while ((i = t.indexOf('\r\n')) >= 0) { let l = t.slice(0, i); t = t.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(Object.assign(decoder(msg), { enveloppe: { de, a: a.slice() } })); msg = ''; a = []; c.write('250 ok\r\n'); }
          else { if (l.startsWith('..')) l = l.slice(1); msg += l + '\n'; } continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-jumeau\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('MAIL FROM')) { de = l.slice(10).replace(/[<>]/g, '').trim(); c.write('250 ok\r\n'); }
        else if (h.startsWith('RCPT TO')) { a.push(l.slice(8).replace(/[<>]/g, '').trim()); c.write('250 ok\r\n'); }
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n'); } });
    c.on('error', () => {});
  });
  return { recus, srv };
}
function qp(s) { return Buffer.from(s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8'); }
function enTete2047(s) {   // « =?UTF-8?Q?…?= » et « =?UTF-8?B?…?= »
  /* deux mots codés côte à côte se recollent SANS l'espace qui les sépare (RFC 2047 §6.2) — sinon « TEAM O P » */
  return String(s || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (_, cs, enc, txt) =>
    enc.toUpperCase() === 'B' ? Buffer.from(txt, 'base64').toString('utf8') : qp(txt.replace(/_/g, ' ')));
}
function decoder(brut) {
  const [tete, ...reste] = brut.split(/\n\n/); const corps = reste.join('\n\n');
  const entetes = {}; tete.replace(/\n[ \t]+/g, ' ').split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) entetes[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
  const parties = [];
  const lirePartie = (h, c) => {
    const ct = (h['content-type'] || 'text/plain').toLowerCase(), b = /boundary="?([^";]+)"?/i.exec(h['content-type'] || '');
    if (b) { c.split('--' + b[1]).slice(1).forEach(p => { if (p.startsWith('--')) return; const [ph, ...pc] = p.replace(/^\n/, '').split(/\n\n/);
      const hh = {}; ph.replace(/\n[ \t]+/g, ' ').split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) hh[l.slice(0, i).toLowerCase()] = l.slice(i + 1).trim(); });
      lirePartie(hh, pc.join('\n\n')); }); return; }
    const enc = (h['content-transfer-encoding'] || '').toLowerCase();
    const txt = enc === 'quoted-printable' ? qp(c) : enc === 'base64' ? (/^(text|application\/json)/.test(ct) ? Buffer.from(c.replace(/\s+/g, ''), 'base64').toString('utf8') : '') : c;
    parties.push({ type: ct.split(';')[0], texte: txt, nom: (/name="?([^";]+)/i.exec(h['content-disposition'] || h['content-type'] || '') || [])[1] || '' });
  };
  lirePartie(entetes, corps);
  const texte = parties.filter(p => p.type === 'text/plain').map(p => p.texte).join('\n');
  const html = parties.filter(p => p.type === 'text/html').map(p => p.texte).join('\n');
  const liens = [...new Set(((texte + '\n' + html).match(/https?:\/\/[^\s"'<>)\]]+/g) || []).map(x => x.replace(/&amp;/g, '&').replace(/[.,;]+$/, '')))];
  return { a: enTete2047(entetes.to), de: enTete2047(entetes.from), sujet: enTete2047(entetes.subject), texte, html, liens,
    pieces: parties.filter(p => p.nom).map(p => p.nom), entetes };
}

/* ── Stripe, imité DANS le processus du serveur, AVEC un état ─────────────────────────────────────────────────
   Le serveur appelle Stripe par `fetch` (pas de bibliothèque — CLAUDE.md). Le préchargement remplace `fetch`
   avant `index.js` : une session de paiement créée par la vraie route est GARDÉE (`etat.json`), le jumeau la
   « paie » quand le client touche le bouton de la fausse page, et l'abonnement apparaît alors dans la liste que
   `espacePaye()` relit — exactement le chemin réel, sans webhook (le serveur n'en a pas : il relit la liste). */
function prechargementStripe(fichierEtat, journal) {
  return `'use strict'; const fs = require('fs'); const vrai = globalThis.fetch;
const ETAT = ${JSON.stringify(fichierEtat)}, JOURNAL = ${JSON.stringify(journal)};
const lire = () => { try { return JSON.parse(fs.readFileSync(ETAT, 'utf8')); } catch (e) { return { sessions: {}, abos: [], prix: [] }; } };
const ecrire = e => { const t = ETAT + '.' + process.pid; fs.writeFileSync(t, JSON.stringify(e)); fs.renameSync(t, ETAT); };
const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  /* ⛔ rien ne sort du serveur non plus : ce qui n'est ni Stripe ni la machine est refusé, et NOTÉ (Google, Firebase…) */
  if (!u.startsWith('https://api.stripe.com/')) {
    if (/^https?:\\/\\/(127\\.0\\.0\\.1|localhost)[:/]/.test(u)) return vrai.apply(this, arguments);
    fs.appendFileSync(JOURNAL, JSON.stringify({ ts: Date.now(), sortie: u.slice(0, 200) }) + '\\n');
    throw new TypeError('jumeau : sortie coupée vers ' + u.split('/').slice(0, 3).join('/'));
  }
  const o = opts || {}, h = o.headers || {}, methode = (o.method || 'GET').toUpperCase();
  const chemin = u.slice('https://api.stripe.com'.length);
  fs.appendFileSync(JOURNAL, JSON.stringify({ ts: Date.now(), methode, chemin, version: h['Stripe-Version'] || null,
    cle: /^Bearer sk_jumeau_/.test(String(h.Authorization || '')), corps: String(o.body || '').slice(0, 4000) }) + '\\n');
  const e = lire();
  if (process.env.JUMEAU_STRIPE === 'panne') return json({ error: { message: 'panne simulée' } }, 500);
  if (chemin.startsWith('/v1/prices')) return json({ data: e.prix, has_more: false });
  if (methode === 'POST' && chemin.startsWith('/v1/checkout/sessions')) {
    const p = new URLSearchParams(String(o.body || '')), id = 'cs_jumeau_' + (Object.keys(e.sessions).length + 1);
    const lignes = []; for (let i = 0; p.has('line_items[' + i + '][price]'); i++) lignes.push({ prix: p.get('line_items[' + i + '][price]'), qte: +p.get('line_items[' + i + '][quantity]') || 1 });
    const meta = {}, metaAbo = {};
    for (const [k, v] of p) { let m = /^metadata\\[(\\w+)\\]$/.exec(k); if (m) meta[m[1]] = v; m = /^subscription_data\\[metadata\\]\\[(\\w+)\\]$/.exec(k); if (m) metaAbo[m[1]] = v; }
    e.sessions[id] = { id, lignes, meta, metaAbo, email: p.get('customer_email') || '', ref: p.get('client_reference_id') || '',
      essai: +p.get('subscription_data[trial_end]') || 0, succes: p.get('success_url') || '', annule: p.get('cancel_url') || '', payee: false };
    ecrire(e);
    return json({ id, object: 'checkout.session', url: 'https://checkout.stripe.com/c/pay/' + id });
  }
  const r1 = /^\\/v1\\/subscriptions\\/([^?]+)/.exec(chemin);
  if (r1) { const s = e.abos.find(x => x.id === decodeURIComponent(r1[1])); return s ? json(Object.assign({ latest_invoice: null }, s)) : json({ error: { message: 'inconnu' } }, 404); }
  if (chemin.startsWith('/v1/subscriptions')) return json({ data: e.abos, has_more: false });
  return json({ object: 'list', data: [], has_more: false });
};\n`;
}

/* ── Le protocole du navigateur (CDP), par le point d'entrée du NAVIGATEUR : plusieurs onglets, plusieurs
   contextes (le client sur son téléphone, Justin dans la Tour) multiplexés sur une seule connexion ───────── */
function client(ws) {
  let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return {
    envoyer(methode, params, session) { const i = ++id;
      return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify(Object.assign({ id: i, method: methode, params: params || {} }, session ? { sessionId: session } : {}))); }); },
    sur(f) { E.push(f); },
  };
}

async function demarrer(opts) {
  const o = opts || {};
  const SORTIE = path.resolve(o.sortie || fs.mkdtempSync(path.join(os.tmpdir(), 'controle-')));
  fs.mkdirSync(path.join(SORTIE, 'captures'), { recursive: true });
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'jumeau-'));
  const DATA = path.join(BANC, 'data'); fs.mkdirSync(DATA, { recursive: true });
  const SITE = path.join(BANC, 'site');
  const enfants = [];
  const arreter = async () => {
    for (const e of enfants) { try { process.kill(-e.pid, 'SIGKILL'); } catch (x) { try { e.kill('SIGKILL'); } catch (y) {} } }
    try { fct.srv.close(); } catch (x) {}
    if (!o.garder) try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (x) {}
  };
  process.on('exit', () => { for (const e of enfants) { try { process.kill(-e.pid, 'SIGKILL'); } catch (x) {} } });

  if (!fs.existsSync(path.join(DEPOT, 'server', 'node_modules'))) throw new Error('server/node_modules absent : cd server && npm ci');

  /* 1. le site, par la MÊME liste blanche que la publication */
  execFileSync('bash', [path.join(DEPOT, 'scripts', 'assembler-site.sh'), SITE], { cwd: DEPOT, stdio: 'ignore' });

  /* 2. le facteur, Stripe imité, la configuration jetable */
  const fct = facteur();
  const portSmtp = await new Promise(r => fct.srv.listen(0, '127.0.0.1', () => r(fct.srv.address().port)));
  const ETAT = path.join(BANC, 'stripe-etat.json'), JOURNAL_STRIPE = path.join(BANC, 'stripe.jsonl');
  fs.writeFileSync(JOURNAL_STRIPE, '');
  const SRC_SERVEUR = fs.readFileSync(o.serveur || path.join(DEPOT, 'server', 'index.js'), 'utf8');
  /* les tarifs RÉELS du serveur (publics : ceux de la page de paiement), avec des montants plausibles */
  const PRIX_MOIS = { pro: 1500, business: 2500, premium: 5000, msgpro: 900, msgpremium: 1900 };
  const prix = [];
  for (const [k, m] of Object.entries(PRIX_MOIS)) {
    const l = new RegExp('^\\s*' + k + ": \\['(price_\\w+)',\\s*'(price_\\w+)'", 'm').exec(SRC_SERVEUR);
    if (l) { prix.push({ id: l[1], unit_amount: m, currency: 'eur', recurring: { interval: 'month' }, product: { name: k } });
      prix.push({ id: l[2], unit_amount: m * 10, currency: 'eur', recurring: { interval: 'year' }, product: { name: k } }); }
  }
  fs.writeFileSync(ETAT, JSON.stringify({ sessions: {}, abos: [], prix }));
  fs.writeFileSync(path.join(BANC, 'stripe-imite.js'), prechargementStripe(ETAT, JOURNAL_STRIPE));
  const vap = require(path.join(DEPOT, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
  const MDP_TOUR = 'jumeau-' + crypto.randomBytes(6).toString('hex');
  const config = Object.assign({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'jumeau-' + crypto.randomBytes(8).toString('hex'),
    adminPassHash: crypto.createHash('sha256').update(MDP_TOUR).digest('hex'),
    comptes: { actif: true }, stripe: { secretKey: 'sk_jumeau_' + crypto.randomBytes(12).toString('hex') },
    /* les avis destinés à TEAM OP (nouvelle demande, nouveau compte) : une adresse fictive, lue par le facteur */
    notifDemandes: 'equipe@exemple.fr', alertEmail: 'equipe@exemple.fr', contactEmail: 'equipe@exemple.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'jumeau', pass: 'jumeau', from: 'contact@teamop.fr' },
    documents: { copieFirebase: false },
  }, o.config || {});
  const CFG = path.join(BANC, 'config.json');
  fs.writeFileSync(CFG, JSON.stringify(config, null, 2), { mode: 0o600 });
  if (o.espaces) fs.writeFileSync(path.join(DATA, 'espaces.json'), JSON.stringify(o.espaces));
  /* ⛔ L'ÉTAT DE PRODUCTION QUE LE DÉPÔT NE PORTE PAS, posé comme en ligne :
     · la version exigée — en ligne, `/api/version` rend la version publiée (767 le 17 octobre 2026) : le jumeau
       exige celle de l'`app.html` qu'il sert ;
     · la copie des documents depuis Firebase — active en ligne, où une entreprise NEUVE n'a rien chez Google et
       part d'un document vide. Le jumeau n'a pas Firebase : la copie y est coupée avec un inventaire complet et
       vide, ce qui donne à une entreprise neuve exactement le même départ. (Une entreprise ANCIENNE, recopiée
       depuis Firebase, n'est pas jouée ici — le rapport le dit.) */
  const appServie = fs.existsSync(path.join(SITE, 'app.html')) ? fs.readFileSync(path.join(SITE, 'app.html'), 'utf8') : '';
  const VERSION_APP = +((/APP_VERSION\s*=\s*'(\d+)'/.exec(appServie) || [])[1] || 0);
  fs.writeFileSync(path.join(DATA, 'versions.json'), JSON.stringify({ min: VERSION_APP, minFirestore: VERSION_APP, enLigne: 'enLigne', maj: Date.now(), par: 'jumeau' }));
  fs.mkdirSync(path.join(DATA, 'documents'), { recursive: true });
  fs.writeFileSync(path.join(DATA, 'documents', 'inventaire.json'), JSON.stringify({ complet: true, espaces: {}, ts: Date.now(), par: 'jumeau' }));

  /* 3. le VRAI serveur, isolé, son journal gardé (on y cherchera erreurs et données personnelles) */
  const portApi = await libre();
  const JOURNAL_SRV = path.join(SORTIE, 'serveur.log');
  const sortieSrv = fs.openSync(JOURNAL_SRV, 'w');
  /* `donnees` : des fichiers posés dans les données du serveur avant son démarrage (une boîte reliée, par exemple) ;
     `requires` : des modules chargés avant lui — `tests/faux-imap.js` remplace imapflow par une boîte de banc, sans réseau. */
  for (const [f, c] of Object.entries(typeof o.donnees === 'function' ? o.donnees({ portSmtp, DATA }) : (o.donnees || {}))) fs.writeFileSync(path.join(DATA, f), typeof c === 'string' ? c : JSON.stringify(c));
  const avant = [].concat(...(o.requires || []).map(r => ['--require', r]));
  const srv = spawn(process.execPath, avant.concat(['--require', path.join(BANC, 'stripe-imite.js'), o.serveur || path.join(DEPOT, 'server', 'index.js')]), {
    /* la liste des abonnements relue à chaque fois (en ligne : 5 min de cache) — sinon le paiement ne « se voit » pas */
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: CFG, TEAMOP_DATA: DATA, PORT: String(portApi), TEAMOP_STRIPE_CACHE_MS: '1',
      TEAMOP_FB_ADMIN: path.join(BANC, 'pas-de-firebase.json') }, o.envServeur || {}),
    stdio: ['ignore', sortieSrv, sortieSrv], detached: true });
  enfants.push(srv);
  let vivant = false;
  for (let i = 0; i < 200 && !vivant; i++) { await dormir(100); try { vivant = (await fetch('http://127.0.0.1:' + portApi + '/health')).ok; } catch (e) {} }
  if (!vivant) { await arreter(); throw new Error('le serveur du jumeau ne démarre pas — voir ' + JOURNAL_SRV); }

  /* L'API du jumeau, appelée DIRECTEMENT (la passe d'attaque, les vérifications) : comme depuis Internet, derrière nginx */
  const API = 'http://127.0.0.1:' + portApi;
  const api = async (chemin, opt) => {
    const x = Object.assign({}, opt || {}); const h = Object.assign({ 'X-Forwarded-For': x.ip || IP_CLIENT }, x.headers || {});
    if (x.json !== undefined) { h['Content-Type'] = 'application/json'; x.body = JSON.stringify(x.json); }
    const t0 = Date.now(); const r = await fetch(API + chemin, { method: x.method || (x.body ? 'POST' : 'GET'), headers: h, body: x.body, redirect: 'manual' });
    const texte = await r.text(); let corps = null; try { corps = JSON.parse(texte); } catch (e) {}
    return { status: r.status, entetes: Object.fromEntries(r.headers), texte, corps, ms: Date.now() - t0 };
  };

  /* 4. le navigateur */
  const portNav = await libre();
  const nav = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    /* une cliente française a un appareil en français : sans ça, navigator.language vaut « en-US » et la page se croit
       chez un étranger (la fenêtre de langue, les formats de date) */
    '--lang=' + (o.langue || 'fr-FR'), '--accept-lang=' + (o.langue || 'fr-FR') + ',fr',
    '--remote-debugging-port=' + portNav, '--user-data-dir=' + path.join(BANC, 'nav'), 'about:blank'], { stdio: 'ignore', detached: true });
  enfants.push(nav);
  let ver = null;
  for (let i = 0; i < 200 && !ver; i++) { await dormir(100); try { ver = await (await fetch('http://127.0.0.1:' + portNav + '/json/version')).json(); } catch (e) {} }
  if (!ver) { await arreter(); throw new Error('le navigateur ne démarre pas'); }
  const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const C = client(ws);

  /* Ce que le jumeau a vu passer, pour le rapport */
  const traces = { api: [], site404: [], sorties: [], stripePages: [] };

  /* La fausse page de paiement de Stripe : le montant, le compte, et un bouton « Payer » qui fait ce que Stripe
     fait quand la carte passe — un abonnement naît (statut `active`, ou `trialing` avec une fin d'essai), puis
     retour vers `success_url`. */
  const etatStripe = () => JSON.parse(fs.readFileSync(ETAT, 'utf8'));
  const payerSession = (id, carte) => {
    const e = etatStripe(), s = e.sessions[id]; if (!s) return null;
    if (!s.payee && carte !== 'refusee') {
      s.payee = true; const t = Math.floor(Date.now() / 1000);
      e.abos.push({ id: 'sub_jumeau_' + (e.abos.length + 1), object: 'subscription', status: s.essai ? 'trialing' : 'active', created: t,
        metadata: Object.assign({}, s.metaAbo), customer: { id: 'cus_jumeau_' + id, email: s.email },
        current_period_end: s.essai || t + 30 * 86400, trial_end: s.essai || null, cancel_at_period_end: false,
        items: { data: s.lignes.map(l => ({ price: Object.assign({}, (e.prix.find(p => p.id === l.prix) || { id: l.prix, unit_amount: 0, recurring: { interval: 'month' } })), quantity: l.qte })) } });
      const t2 = ETAT + '.j'; fs.writeFileSync(t2, JSON.stringify(e)); fs.renameSync(t2, ETAT);
    }
    return s;
  };
  const pageStripe = (u) => {
    const id = (/\/c\/pay\/([\w]+)/.exec(u) || [])[1] || '', s = etatStripe().sessions[id];
    if (!s) return '<!doctype html><meta charset="utf-8"><title>Stripe (jumeau)</title><p>Session inconnue.</p>';
    const total = s.lignes.reduce((a, l) => a + l.qte * (((etatStripe().prix.find(p => p.id === l.prix)) || {}).unit_amount || 0), 0) / 100;
    return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paiement (Stripe simulé)</title>' +
      '<body style="font-family:sans-serif;padding:24px"><h1>Stripe — paiement simulé</h1><p id="compte">' + s.email + '</p><p id="total">' + total.toFixed(2) + ' € / période</p>' +
      '<button id="payer" style="min-height:48px;font-size:18px" onclick="location.href=\'https://checkout.stripe.com/jumeau/payer?s=' + id + '\'">Payer</button> ' +
      '<button id="refuser" onclick="location.href=\'https://checkout.stripe.com/jumeau/payer?s=' + id + '&carte=refusee\'">Carte refusée</button> ' +
      '<a id="annuler" href="' + s.annule + '">Retour</a></body>';
  };

  const lireSite = (u) => {
    let p = decodeURIComponent(new URL(u).pathname); if (p.endsWith('/')) p += 'index.html';
    let x = path.join(SITE, p);
    if (!x.startsWith(SITE)) return null;
    if (!fs.existsSync(x) && !path.extname(x) && fs.existsSync(x + '.html')) x += '.html';   // GitHub Pages : /tarifs → tarifs.html
    if (fs.existsSync(x) && fs.statSync(x).isDirectory()) x = path.join(x, 'index.html');
    if (!fs.existsSync(x)) return null;
    return { corps: fs.readFileSync(x), type: TYPES[path.extname(x).toLowerCase()] || 'application/octet-stream' };
  };

  /* L'aiguillage de CHAQUE requête du navigateur. Rien ne sort : teamop.fr → le site assemblé, api.teamop.fr → le
     serveur du jumeau, Stripe → l'imitation, le reste → coupé et compté. */
  const aiguiller = async (m, session, onglet) => {
    const { requestId, request } = m.params; const u = request.url;
    const finir = (code, entetes, corps) => C.envoyer('Fetch.fulfillRequest', { requestId, responseCode: code,
      responseHeaders: Object.entries(entetes).map(([name, value]) => ({ name, value: String(value) })),
      body: Buffer.from(corps || '').toString('base64') }, session).catch(() => {});
    try {
      if (/^(data|blob|about|chrome):/.test(u)) return C.envoyer('Fetch.continueRequest', { requestId }, session).catch(() => {});
      const url = new URL(u);
      if (url.hostname === 'teamop.fr' || url.hostname === 'www.teamop.fr') {
        if (url.pathname === '/sw.js') return finir(404, { 'Content-Type': 'text/plain' }, 'service worker coupé par le jumeau');
        const f = lireSite(u);
        if (!f) { traces.site404.push({ url: u, depuis: onglet.url }); const p404 = lireSite('https://teamop.fr/404.html');
          return finir(404, { 'Content-Type': 'text/html;charset=utf-8' }, p404 ? p404.corps : 'introuvable'); }
        return finir(200, { 'Content-Type': f.type, 'Cache-Control': 'no-store' }, f.corps);
      }
      if (url.hostname === 'api.teamop.fr') {
        const h = Object.assign({}, request.headers, { 'X-Forwarded-For': onglet.ip || IP_CLIENT, Host: 'api.teamop.fr' });
        delete h['Accept-Encoding']; delete h['accept-encoding'];
        let corps;
        if (request.postDataEntries && request.postDataEntries.length) corps = Buffer.concat(request.postDataEntries.map(e => Buffer.from(e.bytes || '', 'base64')));
        else if (request.postData !== undefined) corps = Buffer.from(request.postData);
        const t0 = Date.now(); let r;
        try { r = await fetch(API + url.pathname + url.search, { method: request.method, headers: h, body: ['GET', 'HEAD'].includes(request.method) ? undefined : corps, redirect: 'manual' }); }
        catch (e) { traces.api.push({ methode: request.method, chemin: url.pathname, statut: 0, ms: Date.now() - t0, depuis: onglet.url, onglet: onglet.nom });
          return C.envoyer('Fetch.failRequest', { requestId, errorReason: 'ConnectionRefused' }, session).catch(() => {}); }
        const b = Buffer.from(await r.arrayBuffer());
        traces.api.push({ methode: request.method, chemin: url.pathname, statut: r.status, ms: Date.now() - t0, depuis: onglet.url, onglet: onglet.nom,
          corps: r.status >= 400 ? b.toString('utf8').slice(0, 300) : undefined });
        const entetes = []; r.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k)) entetes.push({ name: k, value: v }); });
        return C.envoyer('Fetch.fulfillRequest', { requestId, responseCode: r.status, responseHeaders: entetes, body: b.toString('base64') }, session).catch(() => {});
      }
      if (url.hostname === 'checkout.stripe.com') {
        if (url.pathname === '/jumeau/payer') {
          const s = payerSession(url.searchParams.get('s'), url.searchParams.get('carte'));
          traces.stripePages.push({ geste: url.searchParams.get('carte') === 'refusee' ? 'carte refusée' : 'payé', session: url.searchParams.get('s') });
          const cible = s ? (url.searchParams.get('carte') === 'refusee' ? s.annule : s.succes.replace('{CHECKOUT_SESSION_ID}', s.id)) : 'https://teamop.fr/';
          return finir(200, { 'Content-Type': 'text/html;charset=utf-8' }, '<!doctype html><meta charset="utf-8"><script>location.replace(' + JSON.stringify(cible) + ')</script>');
        }
        traces.stripePages.push({ geste: 'page de paiement', url: u });
        return finir(200, { 'Content-Type': 'text/html;charset=utf-8' }, pageStripe(u));
      }
      traces.sorties.push({ url: u.slice(0, 200), depuis: onglet.url });
      return C.envoyer('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }, session).catch(() => {});
    } catch (e) {
      return C.envoyer('Fetch.failRequest', { requestId, errorReason: 'Failed' }, session).catch(() => {});
    }
  };

  const onglets = new Map(), tous = [];   // sessionId → onglet ; et tous ceux qui ont été ouverts, pour le rapport
  C.sur(m => {
    const og = m.sessionId && onglets.get(m.sessionId); if (!og) return;
    if (m.method === 'Fetch.requestPaused') return aiguiller(m, m.sessionId, og);
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails || {};
      og.erreurs.push({ type: 'exception', texte: ((d.exception || {}).description || d.text || '').slice(0, 600), url: d.url || og.url, ligne: d.lineNumber, page: og.url, etape: og.etape }); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      og.erreurs.push({ type: 'console.error', texte: (m.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || '')).join(' ').slice(0, 600), page: og.url, etape: og.etape });
    if (m.method === 'Page.javascriptDialogOpening') {
      og.dialogues.push({ type: m.params.type, message: m.params.message.slice(0, 300), page: og.url, etape: og.etape });
      const rep = og.reponseDialogue; og.reponseDialogue = undefined;
      C.envoyer('Page.handleJavaScriptDialog', { accept: rep !== false, promptText: typeof rep === 'string' ? rep : '' }, m.sessionId).catch(() => {});
    }
    if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId) og.url = m.params.frame.url;
    if (m.method === 'Page.loadEventFired') og.charges++;
  });

  let nCapt = 0;
  async function onglet(oo) {
    const op = oo || {}; const pr = PROFILS[op.profil || 'telephone'];
    const ctx = op.contexte || (await C.envoyer('Target.createBrowserContext', { disposeOnDetach: true })).browserContextId;
    const { targetId } = await C.envoyer('Target.createTarget', { url: 'about:blank', browserContextId: ctx });
    const { sessionId } = await C.envoyer('Target.attachToTarget', { targetId, flatten: true });
    const og = { nom: op.nom || 'client', ip: op.ip || IP_CLIENT, erreurs: [], dialogues: [], url: 'about:blank', charges: 0, etape: '', contexte: ctx, sessionId, reponseDialogue: undefined };
    onglets.set(sessionId, og); tous.push(og);
    const e = (me, pa) => C.envoyer(me, pa, sessionId);
    await e('Page.enable'); await e('Runtime.enable');
    await e('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    await e('Emulation.setDeviceMetricsOverride', { width: pr.w, height: pr.h, deviceScaleFactor: pr.dpr, mobile: pr.tac });
    await e('Emulation.setTouchEmulationEnabled', { enabled: pr.tac, maxTouchPoints: pr.tac ? 5 : 1 });
    if (pr.ua) await e('Emulation.setUserAgentOverride', { userAgent: pr.ua, platform: 'iPhone' });
    await e('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: op.mode || 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    /* pas de service worker : il garderait d'un passage à l'autre des réponses de l'API (le rapport le dit) */
    await e('Page.addScriptToEvaluateOnNewDocument', { source: "try{ Object.defineProperty(navigator, 'serviceWorker', { get: () => ({ register: () => Promise.reject(new Error('jumeau : pas de service worker')), getRegistrations: () => Promise.resolve([]), getRegistration: () => Promise.resolve(undefined), addEventListener(){}, removeEventListener(){}, controller: null, ready: new Promise(()=>{}) }) }); }catch(e){}" });

    const ev = async (expr) => {
      const r = await e('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text || '').slice(0, 400));
      return r.result.value;
    };
    const attendre = async (fn, ms) => { const fin = Date.now() + (ms || 8000);
      while (Date.now() < fin) { let v = false; try { v = await fn(); } catch (x) {} if (v) return v; await dormir(150); } return false; };
    const aller = async (url, ms) => { const n0 = og.charges; await e('Page.navigate', { url });
      await attendre(async () => og.charges > n0, ms || 15000); await dormir(600); };
    /* Toucher au CENTRE de l'élément, amené au milieu de l'écran — et seulement si c'est bien LUI qui est sous le
       doigt (CLAUDE.md : une frappe qui tombe à côté ne compte pas, elle se DIT perdue). La cible se désigne par
       un sélecteur, ou par son TEXTE visible (le plus petit élément cliquable qui le porte). */
    const localiser = (cible) => ev(`(()=>{ const c=${JSON.stringify(cible)};
      const vis = el => { const r=el.getBoundingClientRect(), s=getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
      let el=null;
      if (c.sel) el=[...document.querySelectorAll(c.sel)].find(vis)||null;
      else { const norm=t=>(t||'').replace(/\\s+/g,' ').trim().toLowerCase(); const t=norm(c.texte);
        const cand=[...document.querySelectorAll('a,button,[role=button],[onclick],label,summary,input[type=submit],input[type=button],.btn,.chip,.tab,li,div,span')]
          .filter(x=>vis(x) && (c.exact ? norm(x.innerText||x.value)===t : norm(x.innerText||x.value).includes(t)));
        cand.sort((a,b)=>{ const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect(); return ra.width*ra.height - rb.width*rb.height; });
        el=cand.find(x=>x.matches('a,button,[role=button],[onclick],input,summary,label'))||cand[0]||null; }
      if(!el) return null;
      el.scrollIntoView({block:'center',inline:'center'}); const r=el.getBoundingClientRect();
      const x=r.left+r.width/2, y=r.top+r.height/2, d=document.elementFromPoint(x,y);
      return { x, y, w:r.width, h:r.height, dessus: !!d && (d===el || el.contains(d) || d.contains(el)), nom: (el.innerText||el.value||el.getAttribute('aria-label')||el.tagName).trim().slice(0,60), balise: el.tagName };
    })()`);
    const toucher = async (cible, ms) => {
      const c = typeof cible === 'string' ? { texte: cible } : cible;
      const b = await attendre(async () => { const x = await localiser(c); return x && x.dessus ? x : false; }, ms || 6000);
      if (!b) return null;
      await dormir(120);
      if (pr.tac) { await e('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y }] }); await dormir(50); await e('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      else { await e('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 }); await dormir(40); await e('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 }); }
      await dormir(350);
      return b;
    };
    /* Taper COMME un clavier (Input.insertText) dans un champ amené sous le doigt : les écouteurs `input` de la
       page tournent comme chez un client. */
    const taper = async (sel, texte) => {
      const ok = await attendre(() => ev(`(()=>{ const el=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.getClientRects().length); if(!el) return false;
        el.scrollIntoView({block:'center'}); el.focus(); if('value' in el){ el.value=''; el.dispatchEvent(new Event('input',{bubbles:true})); } return document.activeElement===el; })()`), 5000);
      if (!ok) return false;
      await e('Input.insertText', { text: String(texte) });
      await ev(`(()=>{ const el=document.activeElement; if(el) el.dispatchEvent(new Event('change',{bubbles:true})); return 1; })()`);
      return true;
    };
    /* Choisir dans une liste déroulante : un vrai client passe par le sélecteur natif, que le navigateur piloté ne
       dessine pas — on pose la valeur et on émet ce que le sélecteur émet (`input` puis `change`). */
    const choisir = (sel, valeur) => ev(`(()=>{ const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false;
      const o=[...el.options].find(x=>x.value===${JSON.stringify(valeur)}||x.text.trim()===${JSON.stringify(valeur)}); if(!o) return false;
      el.scrollIntoView({block:'center'}); el.value=o.value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    const texte = () => ev(`(document.body?document.body.innerText:'').replace(/\\s+/g,' ')`);
    const capture = async (nom) => { try {
      const r = await e('Page.captureScreenshot', { format: 'png' }); const f = path.join(SORTIE, 'captures', String(++nCapt).padStart(2, '0') + '-' + nom.replace(/[^\w-]+/g, '-').slice(0, 50) + '.png');
      fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return f; } catch (x) { return null; } };
    /* Ce qu'un client ne doit jamais voir : un défilement de côté (on DEMANDE à la page si elle bouge — CLAUDE.md), un
       « undefined » / « NaN » / « null » / « [object Object] » à l'écran, une commande sous 44 px au doigt. */
    const auditEcran = () => ev(`(async()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;
      const y=scrollY; scrollTo(9999,y); const cote=scrollX; scrollTo(0,y);
      const txt=document.body?document.body.innerText:''; const mots=(txt.match(/\\b(undefined|NaN|\\[object Object\\])\\b/g)||[]);
      /* ⛔ UNE CIBLE TACTILE SE MESURE À CE QU'UN DOIGT DÉCLENCHE, PAS À SON RECTANGLE (CLAUDE.md, 22 septembre 2026) :
         une pilule de 29 px peut répondre sur 45 grâce à un ::after. On amène chaque petite cible au milieu de l'écran et
         on cherche, pixel après pixel depuis son centre, jusqu'où le toucher tombe encore sur ELLE (elementFromPoint voit
         les pseudo-éléments). Version du 17 octobre 2026 : la première mesurait le rectangle et accusait la pilule. */
      const petits=[]; if(${pr.tac}){ const y0=scrollY;
        const touche=(el,x,y)=>{ const d=document.elementFromPoint(x,y); return !!d && (d===el||el.contains(d)); };
        const zone=(el,cx,cy,dx,dy)=>{ let n=0; for(let k=1;k<=30;k++){ if(!touche(el,cx+dx*k,cy+dy*k)) break; n=k; } return n; };
        for(const el of document.querySelectorAll('a,button,[role=button],input[type=checkbox],input[type=radio],select')){
          let r=el.getBoundingClientRect(); if(!r.width||!r.height||getComputedStyle(el).visibility==='hidden') continue;
          if(Math.min(r.width,r.height)>=44 || !(el.innerText||el.getAttribute('aria-label')||'').trim()) continue;
          /* un lien DANS une phrase est exempté (WCAG 2.5.8) : on le touche sur la ligne, pas sur sa boîte */
          if(getComputedStyle(el).display==='inline' && el.parentElement && (el.parentElement.innerText||'').trim().length > (el.innerText||'').trim().length+20) continue;
          el.scrollIntoView({block:'center',inline:'center'}); r=el.getBoundingClientRect();
          const cx=r.left+r.width/2, cy=r.top+r.height/2; if(!touche(el,cx,cy)) continue;   // recouvert : une autre mesure
          const h=r.height<44 ? zone(el,cx,cy,0,-1)+zone(el,cx,cy,0,1)+1 : r.height, w=r.width<44 ? zone(el,cx,cy,-1,0)+zone(el,cx,cy,1,0)+1 : r.width;
          if(Math.min(w,h)<44) petits.push((el.innerText||el.getAttribute('aria-label')).trim().replace(/\\s+/g,' ').slice(0,40)+' '+Math.round(w)+'×'+Math.round(h)); }
        scrollTo(0,y0); }
      return { defileDeCote: cote, motsSuspects: [...new Set(mots)], ciblesPetites: petits.slice(0,12), titre: document.title };
    })()`).catch(x => ({ erreur: String(x.message || x) }));
    /* Qu'est-ce qui COUVRE l'écran ? Le point au milieu de la fenêtre doit appartenir à la page (contenu, menu, barres) ;
       sinon on rend le texte de la fenêtre ou du voile posé dessus — c'est ce que le client a sous les yeux. */
    const couverture = () => ev(`(()=>{ const x=innerWidth/2, y=innerHeight/2; const el=document.elementFromPoint(x,y); if(!el) return null;
      if(el.closest('#content,.sidebar,#tabbar,.rf-tabs,.topbar,header,main')) return null;
      let c=el; while(c.parentElement && c.parentElement!==document.body) c=c.parentElement;
      return { id:c.id||'', classe:String(c.className||'').slice(0,60), texte:(c.innerText||'').replace(/\\s+/g,' ').trim().slice(0,160) }; })()`).catch(() => null);
    const fermer = async () => { onglets.delete(sessionId); try { await C.envoyer('Target.closeTarget', { targetId }); } catch (x) {} };
    return Object.assign(og, { e, ev, attendre, aller, toucher, taper, choisir, texte, couverture, capture, auditEcran, localiser, fermer,
      repondreDialogue(v) { og.reponseDialogue = v; } });
  }

  const courriers = () => fct.recus;
  const attendreCourrier = async (pred, ms) => { const fin = Date.now() + (ms || 10000);
    while (Date.now() < fin) { const c = fct.recus.find(pred); if (c) return c; await dormir(150); } return null; };
  const journalStripe = () => fs.readFileSync(JOURNAL_STRIPE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => !x.sortie);
  const sortiesServeur = () => fs.readFileSync(JOURNAL_STRIPE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => x.sortie).map(x => x.sortie);
  const journalServeur = () => { try { return fs.readFileSync(JOURNAL_SRV, 'utf8'); } catch (e) { return ''; } };
  /* L'espace créé pour une adresse : l'annuaire (`espaces.json`) se relit jusqu'à ce qu'il le porte */
  const attendreEspace = async (email, ms) => { const fin = Date.now() + (ms || 10000);
    while (Date.now() < fin) { const a = lireDonnees('espaces.json') || {};
      const k = Object.keys(a).find(x => a[x] && String(a[x].email || '').toLowerCase() === String(email).toLowerCase());
      if (k) return { cle: k, e: a[k] }; await dormir(200); } return null; };
  const lireDonnees = f => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch (e) { return null; } };

  return { SORTIE, DATA, SITE, API, VERSION_APP, MDP_TOUR, IP_CLIENT, config, api, onglet, arreter, courriers, attendreCourrier,
    etatStripe, attendreEspace, journalStripe, sortiesServeur, journalServeur, ongletsOuverts: () => tous.slice(), lireDonnees, traces, dormir, sourceServeur: SRC_SERVEUR,
    surCdp: f => C.sur(f) };   // pour une sonde : écouter un événement du navigateur (une pause du débogueur sur une page figée)
}

module.exports = { demarrer, decoder, PROFILS };
