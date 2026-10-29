/* ⛔ L'ÉTABLI DU VRAI SERVEUR POUR HUGO, MARGAUX, EMMA ET SARAH (test-2917) — 23 octobre 2026. Rien ne sort : 127.0.0.1 seulement.
 *
 * Le VRAI `server/index.js`, isolé, avec :
 *   · un STRIPE SIMULÉ dans son processus (`fetch` vers api.stripe.com remplacé, chargé AVANT le serveur) dont l'état vit dans un fichier JSON que le banc lit et écrit : les abonnements
 *     (liste, lecture, `cancel_at_period_end`), les factures ; chaque appel est NOTÉ (méthode, chemin, corps, clé d'idempotence) — c'est là qu'on prouve que la seule écriture est la
 *     fin de période ;
 *   · la fausse boîte IMAP (`faux-imap.js`) et un facteur SMTP de banc : le serveur « envoie » et le banc lit chaque message ;
 *   · un faux Claude (`fetch` vers api.anthropic.com) qui GARDE chaque requête et peut jouer un OUTIL (`{ texte, actions:[{ nom, entree }] }`) ;
 *   · des données jetables : des clients, des espaces, des tâches déjà déposées (le banc n'a pas de route pour déposer la tâche d'un agent), un registre de Margaux déjà avancé.
 * Ce que cet établi juge, ce sont les COUTURES (`index.js` branche les adaptateurs sur les verdicts du serveur) que les bancs de module ne voient pas.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const FAUX = path.join(__dirname, 'faux-imap.js');
const { facteur } = require('./banc-serveur-courrier.js');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');

/* o : { modes, charte, clients, espaces, abos, factures, taches, avant(D), claude (source JS : (requete, n) => texte | { texte, actions }) } */
async function demarrer(o) {
  o = o || {};
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'bgest-'));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ces bancs (`test-3021`)
  const MDP = 'mot-de-passe-du-banc-patron', MDP2 = 'mot-de-passe-du-banc-agent';
  const fact = facteur();
  const portSmtp = await new Promise(res => fact.s.listen(0, '127.0.0.1', () => res(fact.s.address().port)));
  const boites = [{ id: 'b-contact', email: 'contact@banc-gestion.fr' }];
  fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify(boites.map(b => ({ id: b.id, email: b.email, pass: 'x', imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, nom: 'TEAM OP', ts: Date.now(), par: 'banc' }))));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify(o.clients || {}));
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(o.espaces || {}));
  fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: o.modes || {} }));
  if (o.charte) fs.writeFileSync(path.join(D, 'agents-charte.json'), JSON.stringify(o.charte));
  if (o.taches) fs.writeFileSync(path.join(D, 'agents-taches.json'), JSON.stringify(o.taches));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'u-agent', nom: 'Agent', email: '', hash: sha(MDP2), role: 'collaborateur', actif: true, ts: Date.now() }] }));
  const IMAP = path.join(banc, 'faux-imap.json');
  fs.writeFileSync(IMAP, JSON.stringify({ boites: { 'contact@banc-gestion.fr': { messages: [], actions: [] } } }));
  const STRIPE = path.join(banc, 'stripe.json');
  fs.writeFileSync(STRIPE, JSON.stringify(Object.assign({ abos: o.abos || [], factures: o.factures || {}, appels: [] }, o.liste ? { liste: o.liste } : {})));   // o.liste : une LISTE de factures que le faux Stripe sert à GET /v1/invoices?… (created[gte], created[lt], status, limit, starting_after, has_more) — test-3162, test-3163
  if (o.avant) o.avant(D);

  const PRE = path.join(banc, 'precharge.js'), TRACE = path.join(banc, 'recu.jsonl');
  const reponse = o.claude || "(r, n) => 'Réponse de banc.'";
  fs.writeFileSync(PRE, `const fs = require('fs'); const vrai = globalThis.fetch; let n = 0; const rep = (${reponse});
const lire = () => JSON.parse(fs.readFileSync(${JSON.stringify(STRIPE)}, 'utf8')); const ecrire = e => fs.writeFileSync(${JSON.stringify(STRIPE)}, JSON.stringify(e));
const json = (code, x) => new Response(JSON.stringify(x), { status: code, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) {
    const corps = String(opts && opts.body); fs.appendFileSync(${JSON.stringify(TRACE)}, corps + '\\n');
    const j = JSON.parse(corps); n++; let r = await rep(j, n); if (typeof r === 'string') r = { texte: r, actions: [] };
    const content = []; if (r.texte) content.push({ type: 'text', text: r.texte });
    (r.actions || []).forEach((a, i) => content.push({ type: 'tool_use', id: 'toolu_banc' + n + '_' + i, name: a.nom, input: a.entree }));
    return json(200, { id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: (r.actions || []).length ? 'tool_use' : 'end_turn', content, usage: { input_tokens: 900, output_tokens: 400 } });
  }
  if (u.startsWith('https://api.stripe.com/')) {
    const e = lire(); const m = ((opts && opts.method) || 'GET').toUpperCase();
    const corps = opts && opts.body ? String(opts.body) : ''; const h = (opts && opts.headers) || {};
    e.appels.push({ m, u: u.slice('https://api.stripe.com'.length), corps, cle: h['Idempotency-Key'] || '', auth: h.Authorization || '' });
    const sortie = (code, x) => { ecrire(e); return json(code, x); };
    const abo = id => e.abos.find(a => a.id === id);
    const avecFacture = a => Object.assign({}, a, e.factures['sub:' + a.id] ? { latest_invoice: e.factures['sub:' + a.id] } : {});
    let x;
    if ((x = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)(\\?.*)?$/.exec(u))) {
      const a = abo(decodeURIComponent(x[1])); if (!a) return sortie(404, { error: { message: 'No such subscription' } });
      if (m === 'POST') { if (/(^|&)cancel_at_period_end=true(&|$)/.test(corps)) a.cancel_at_period_end = true; return sortie(200, a); }
      return sortie(200, /expand\\[\\]=latest_invoice/.test(u) ? avecFacture(a) : a);
    }
    if (u.startsWith('https://api.stripe.com/v1/subscriptions?')) { if (e.panneListe) return sortie(500, { error: { message: 'panne simulée de la liste' } }); return sortie(200, { data: e.abos, has_more: false }); }   // panneListe : la lecture de la liste échoue (test-2917 §8 bis)
    /* LA LISTE DE FACTURES (compta de la Tour, 28 octobre 2026) : seulement si le banc en a posé une (o.liste) et que la requête n'est ni « d'un abonnement » ni « d'un client » (les lectures de Margaux et de Hugo gardent leur réponse) */
    if (Array.isArray(e.liste) && u.startsWith('https://api.stripe.com/v1/invoices?') && !/[?&](subscription|customer)=/.test(u)) {
      if (e.panneFactures) return sortie(500, { error: { message: 'panne simulée des factures' } });
      const q = new URLSearchParams(u.slice(u.indexOf('?') + 1));
      const gte = q.has('created[gte]') ? +q.get('created[gte]') : -Infinity, lt = q.has('created[lt]') ? +q.get('created[lt]') : Infinity, st = q.get('status') || '';
      const limite = Math.min(100, +q.get('limit') || 10);
      let l = e.liste.filter(f => f.created >= gte && f.created < lt && (!st || f.status === st)).sort((a, b) => b.created - a.created || (a.id < b.id ? 1 : -1));
      const apres = q.get('starting_after'); if (apres) { const i = l.findIndex(f => f.id === apres); l = i >= 0 ? l.slice(i + 1) : []; }
      return sortie(200, { object: 'list', data: l.slice(0, limite), has_more: l.length > limite });
    }
    if ((x = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/invoices\\?subscription=([^&]+)/.exec(u))) { const f = e.factures['open:' + decodeURIComponent(x[1])]; return sortie(200, { data: f ? [f] : [], has_more: false }); }
    if ((x = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/invoices\\?customer=([^&]+)/.exec(u))) return sortie(200, { data: e.factures['cus:' + decodeURIComponent(x[1])] || [], has_more: false });
    return sortie(200, { data: [], has_more: false });
  }
  return vrai.apply(this, arguments); };\n`);

  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', agents: { cleApi: 'sk-ant-banc-gestion-xxxxxxxxxxxxxxxx', reunionsAuto: false }, stripe: { secretKey: 'sk_de_banc_gestion' },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' }, contactEmail: 'contact@banc-gestion.fr' };
  Object.assign(conf, o.config || {});   // o.config : des réglages de plus dans config.json (ex. `pauline`, test-3020)
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(conf));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '', enfant = null;
  const lancer = async () => {
    journal = '';
    enfant = spawn(process.execPath, ['--require', PRE, '-r', FAUX, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9',
        TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs', TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z',
        FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: path.join(RACINE, 'server') }, o.env || {}),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    for (let i = 0; i < 150; i++) { try { if ((await fetch(B + '/health')).ok) return true; } catch (e) {} await dormir(100); }
    return false;
  };
  let nAdr = 0;
  const http = async (methode, route, jeton, corps) => {
    for (let essai = 0; essai < 60; essai++) {
      const r = await fetch(B + route, { method: methode, headers: Object.assign({ 'X-Forwarded-For': '10.117.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) }, corps !== undefined ? { 'Content-Type': 'application/json' } : {}, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
        body: corps === undefined ? undefined : JSON.stringify(corps) });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (r.status === 429 && j && j.error === 'trop de requêtes') { await dormir(2500); continue; }
      return { s: r.status, j: j || {}, txt };
    }
    return { s: 0, j: {}, txt: '' };
  };
  const vivant = await lancer();
  const S = { vivant, B, D, banc, http, fact, journal: () => journal, TP: '', TA: '' };
  if (vivant) {
    S.TP = (await http('POST', '/api/monitor/login', '', { nom: 'Patron', pass: MDP })).j.token;
    S.TA = (await http('POST', '/api/monitor/login', '', { nom: 'Agent', pass: MDP2 })).j.token;
  }
  S.get = (r, j) => http('GET', r, j === undefined ? S.TP : j);
  S.post = (r, c, j) => http('POST', r, j === undefined ? S.TP : j, c === undefined ? {} : c);
  S.claudeRecus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean) : [];   // une ligne encore en cours d'écriture par le serveur n'est pas encore une requête (28 octobre 2026)
  S.stripe = () => JSON.parse(fs.readFileSync(STRIPE, 'utf8'));
  S.poserStripe = f => { const e = S.stripe(); f(e); fs.writeFileSync(STRIPE + '.tmp', JSON.stringify(e)); fs.renameSync(STRIPE + '.tmp', STRIPE); };
  S.fichier = nom => JSON.parse(fs.readFileSync(path.join(D, nom), 'utf8'));
  S.attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { if (await f()) return true; await dormir(150); } return false; };
  /* les courriels que le serveur a envoyés, lus par mailparser : [{ to, subject, text, html, brut }] */
  S.courriels = async () => { const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser')); const l = []; for (const brut of fact.recus) { const m = await simpleParser(brut); l.push({ to: String((m.to && m.to.text) || ''), subject: String(m.subject || ''), text: String(m.text || ''), html: String(m.html || ''), brut }); } return l; };
  S.tuer = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} await dormir(300); };
  S.fin = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fact.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  return S;
}
module.exports = { demarrer, dormir, sha };
