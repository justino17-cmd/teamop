/* Les faux et le lanceur des bancs d'OP Courrier (server-courrier/). Tout se passe sur 127.0.0.1 : un FAUX OP GESTION (qui dit qui est la personne),
   un FAUX Yousign AVEC ÉTAT (demandes, documents, signataires, activation, annulation, relances, téléchargements) et le VRAI serveur lancé en processus. */
'use strict';
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..', 'server-courrier');

const ecouter = (srv) => new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok('http://127.0.0.1:' + srv.address().port)));
const corps = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

async function fauxGestion() {
  const jetons = new Map();   // jeton → { id, nom, role }
  const st = { appels: 0, panne: new Set() };
  const srv = http.createServer((req, res) => {
    st.appels++;
    const m = /^Bearer ([a-f0-9]{48})$/.exec(req.headers.authorization || '');
    if (req.url !== '/api/monitor/moi' || !m) { res.writeHead(401).end('{}'); return; }
    if (st.panne.has(m[1])) { req.socket.destroy(); return; }
    const u = jetons.get(m[1]);
    if (!u) { res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"error":"session expirée"}'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(Object.assign({ ok: true }, u)));
  });
  const url = await ecouter(srv);
  return { url, st, jetons, ajouter(jeton, u) { jetons.set(jeton, u); }, retirer: (j) => jetons.delete(j), fermer: () => srv.close() };
}

const PDF = (marque, n = 200) => Buffer.from('%PDF-1.4\n% ' + marque + '\n' + 'x'.repeat(n) + '\n%%EOF\n');

async function fauxYousign(cle = 'CLE-YOUSIGN-DE-BANC') {
  const st = { demandes: new Map(), appels: [], echecs: new Map(), n: 0, telechargements: 0 };
  const echoue = (etape) => { const v = st.echecs.get(etape); if (v) { if (v.fois !== undefined && --v.fois <= 0) st.echecs.delete(etape); return true; } return false; };
  const srv = http.createServer(async (req, res) => {
    const b = await corps(req);
    const rep = (code, o, entetes) => { res.writeHead(code, entetes || { 'Content-Type': 'application/json' }); res.end(Buffer.isBuffer(o) ? o : JSON.stringify(o || {})); };
    const u = new URL(req.url, 'http://x'); const p = u.pathname;
    st.appels.push({ m: req.method, p, auth: req.headers.authorization, ct: req.headers['content-type'] || '', corps: b });
    if (req.headers.authorization !== 'Bearer ' + cle) return rep(401, { message: 'unauthorized' });
    let m;
    if (req.method === 'GET' && p === '/v3/signature_requests') return echoue('tester') ? rep(403) : rep(200, { data: [] });
    if (req.method === 'POST' && p === '/v3/signature_requests') {
      if (echoue('creer')) return rep(500);
      const j = JSON.parse(b.toString()); const id = 'sr_' + (++st.n);
      st.demandes.set(id, { id, corps: j, docs: [], signers: [], etat: 'draft', rappels: [], annulee: false, supprimee: false });
      return rep(201, { id, status: 'draft' });
    }
    if (!(m = /^\/v3\/signature_requests\/([^/]+)(?:\/(.*))?$/.exec(p))) return rep(404);
    const d = st.demandes.get(m[1]); if (!d) return rep(404);
    const reste = m[2] || '';
    if (req.method === 'DELETE' && !reste) { d.supprimee = true; st.demandes.delete(d.id); return rep(204, ''); }
    if (req.method === 'POST' && reste === 'documents') {
      if (echoue('document')) return rep(500);
      if (!/^multipart\/form-data/.test(req.headers['content-type'] || '')) return rep(400);
      const id = 'doc_' + (++st.n); const pdf = b.toString('latin1').includes('%PDF-') && b.toString('latin1').includes('signable_document');
      if (!pdf) return rep(400);
      d.docs.push({ id }); return rep(201, { id, total_pages: 3 });
    }
    if (req.method === 'POST' && reste === 'signers') {
      if (echoue('signataire')) return rep(500);
      const j = JSON.parse(b.toString()); const id = 'sg_' + (++st.n); d.signers.push(Object.assign({ id }, j)); return rep(201, { id });
    }
    if (req.method === 'POST' && reste === 'activate') { if (echoue('activer')) return rep(500); d.etat = 'ongoing'; return rep(200, { id: d.id, status: 'ongoing' }); }
    if (req.method === 'POST' && reste === 'cancel') { if (echoue('annuler')) return rep(500); d.annulee = true; return rep(200, {}); }
    if ((m = /^signers\/([^/]+)\/send_reminder$/.exec(reste)) && req.method === 'POST') { if (echoue('relancer')) return rep(500); d.rappels.push(m[1]); return rep(204, ''); }
    if ((m = /^documents\/([^/]+)\/download$/.exec(reste))) { st.telechargements++; if (echoue('signe')) return rep(500); return rep(200, PDF('SIGNE ' + d.id + ' ' + m[1]), { 'Content-Type': 'application/pdf' }); }
    if ((m = /^signers\/([^/]+)\/audit_trails\/download$/.exec(reste))) { st.telechargements++; if (echoue('preuve')) return rep(500); return rep(200, PDF('PREUVE ' + d.id + ' ' + m[1]), { 'Content-Type': 'application/pdf' }); }
    return rep(404);
  });
  const url = await ecouter(srv);
  return { url, st, cle, fermer: () => srv.close(), derniere: () => [...st.demandes.values()].pop() };
}

/* Lance le VRAI serveur. `option` : { secretWebhook, cleApi, quotas, origines, sansYousign, config:{…fusionné}, kek } */
async function lancer(gestionUrl, yousignUrl, option = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-banc-'));
  const secret = option.secretWebhook || 'SECRET-WEBHOOK-DE-BANC';
  const conf = Object.assign({
    origines: option.origines || ['https://teamop.fr'], gestion: { url: gestionUrl, timeoutMs: 1500 },
    yousign: option.sansYousign ? {} : { cleApi: option.cleApi || 'CLE-YOUSIGN-DE-BANC', secretWebhook: secret, sandbox: true, urlApi: yousignUrl },
    quotas: option.quotas || {},
  }, option.config || {});
  const fconf = path.join(dir, 'instance.json'); fs.writeFileSync(fconf, JSON.stringify(conf), { mode: 0o600 });
  const data = path.join(dir, 'data');
  const port = 20000 + Math.floor(Math.random() * 20000);
  const env = { OPCOURRIER_DEBUG: process.env.OPCOURRIER_DEBUG, PATH: process.env.PATH, OPCOURRIER_CONFIG: fconf, OPCOURRIER_DATA: data, OPCOURRIER_INSTANCE: 'beta', PORT: String(port), OPCOURRIER_KEK: option.kek || crypto.randomBytes(32).toString('hex'), OPCOURRIER_SHA: 'abcdef1234567' };
  const enfant = spawn(process.execPath, [path.join(RACINE, 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let sortie = ''; enfant.stdout.on('data', (d) => { sortie += d; }); enfant.stderr.on('data', (d) => { sortie += d; });
  const url = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 100; i++) { try { const r = await fetch(url + '/health'); if (r.ok) break; } catch (e) { /* pas encore */ } await new Promise((r) => setTimeout(r, 100)); }
  const sortieDe = () => sortie;
  return {
    url, dir, data, secret, sortie: sortieDe, kek: env.OPCOURRIER_KEK, enfant,
    async stop() { enfant.kill('SIGTERM'); await new Promise((r) => { enfant.on('exit', r); setTimeout(r, 3000); }); },
    signer(corpsBrut) { return 'sha256=' + crypto.createHmac('sha256', secret).update(corpsBrut).digest('hex'); },
  };
}

module.exports = { fauxGestion, fauxYousign, lancer, PDF, RACINE, attendre: (ms) => new Promise((r) => setTimeout(r, ms)) };
