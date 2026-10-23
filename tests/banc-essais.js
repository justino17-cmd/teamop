/* L'ÉTABLI COMMUN DES BANCS DE L'ESPACE DE TEST (`test-2981` à `test-2984`) — ce n'est pas une suite (son nom ne commence pas par `test-`).
   Il lance le VRAI `server/index.js`, isolé (127.0.0.1, dossier jetable), avec — ou sans — `espaceTest`, contre un FAUX serveur d'envoi qui COMPTE ses connexions
   (c'est ce compteur qui prouve « rien n'est parti » : un courriel envoyé ouvre une connexion, un courriel capté n'en ouvre aucune) et un FAUX Anthropic.
   Jamais `api.teamop.fr`, jamais un vrai SMTP, jamais un vrai Claude. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

const dormir = ms => new Promise(r => setTimeout(r, ms));
const kh = k => crypto.createHash('sha256').update(k).digest('hex');
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const attendre = async (f, n, pas) => { for (let i = 0; i < (n || 80); i++) { const x = await f(); if (x) return x; await dormir(pas || 100); } return f(); };

/* Le facteur du banc : il note chaque CONNEXION et chaque message reçu. */
function facteur() {
  const recus = []; let connexions = 0;
  const s = net.createServer(c => {
    connexions++;
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  return { s, recus, connexions: () => connexions };
}
/* Quoted-printable en UTF-8, pour lire ce que le facteur a reçu. */
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');

/* Un faux Anthropic : il répond « bonjour » et note chaque requête. */
function fauxAnthropic() {
  const recus = [];
  const s = http.createServer((q, r) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
    let j = {}; try { j = JSON.parse(b); } catch (e) {}
    recus.push({ url: q.url, corps: j });
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: j.model, stop_reason: 'end_turn', content: [{ type: 'text', text: 'Bonjour, je suis là.' }], usage: { input_tokens: 10, output_tokens: 10 } }));
  }); });
  return { s, recus };
}

/* o : { essai: bool, config: {…fusionné dans la config}, donnees: (dossier) => {…préparer le dossier de données avant le démarrage}, anthropic: fauxAnthropic, banc, port, dossier } */
async function lancer(o) {
  o = o || {};
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const banc = o.banc || fs.mkdtempSync(path.join(os.tmpdir(), 'bessai-'));
  const D = o.dossier || path.join(banc, 'data');
  fs.mkdirSync(D, { recursive: true });
  if (o.donnees) o.donnees(D);
  const smtp = o.smtp || facteur();
  if (!o.smtp) await new Promise(res => smtp.s.listen(0, '127.0.0.1', res));
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-essais';
  const CLE = o.cle || crypto.randomBytes(32).toString('hex');
  const conf = Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), comptes: { actif: true },
    notifDemandes: 'patron@exemple-essai.fr', smtp: { host: '127.0.0.1', port: smtp.s.address().port, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } },
    o.essai ? { espaceTest: true, espaceTestCle: CLE, espaceTestOrigine: 'https://test.teamop.fr', courrielsCaptes: true } : {}, o.config || {});
  const CONFIG = path.join(banc, 'config.json');
  fs.writeFileSync(CONFIG, JSON.stringify(conf));
  const port = o.port || await libre(), B = 'http://127.0.0.1:' + port;
  let sortie = '', enfant = null, sortis = 0;
  const demarrer = async () => {
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: CONFIG, TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') },
      o.anthropic ? { ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + o.anthropic.s.address().port } : {});
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
    const cet = enfant; cet.on('exit', () => { sortis++; });
    let vivant = false;
    for (let i = 0; i < 200 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
    return vivant;
  };
  const arreter = async () => { if (enfant) { try { enfant.kill('SIGKILL'); } catch (e) {} } await dormir(100); };
  const appel = async (route, corps, jeton, methode) => {
    const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'), redirect: 'manual',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; const txt = await r.text(); try { j = JSON.parse(txt); } catch (e) {}
    return { s: r.status, j: j || {}, txt, h: r.headers };
  };
  const tour = async () => (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  const vivant = await demarrer();
  return { banc, D, B, port, CLE, MDP, conf, CONFIG, smtp, vivant, appel, tour, demarrer, arreter, sortie: () => sortie, sortis: () => sortis, enfant: () => enfant,
    nettoyer: async () => { await arreter(); try { smtp.s.close(); } catch (e) {} if (!o.banc) { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} } } };
}

/* Le faux « localStorage » + la lecture du fragment `#essai=` : ce que fait le petit script que le build injecte dans les pages de test (l'autre chantier).
   Ici on prouve que le fragment que RENDT le serveur se range et que les VRAIS appels de la page réussissent avec ce qu'il a rangé. */
function lireFragment(location) {
  const m = /#essai=([A-Za-z0-9_-]+)$/.exec(String(location || ''));
  if (!m) return null;
  try { return JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (e) { return null; }
}

module.exports = { RACINE, dormir, kh, libre, attendre, facteur, lisible, fauxAnthropic, lancer, lireFragment };
