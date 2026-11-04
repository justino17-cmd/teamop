/* test-3246 — RIEN DU CLIENT D'UNE ENTREPRISE NE PASSE PAR TEAM OP (4 novembre 2026, essai des mails de A à Z).
 *
 * L'essai de bout en bout (`scripts/controle/mails-a-z.js`, navigateur + vrai serveur + deux facteurs SMTP) a trouvé deux fuites que
 * les bancs ne voyaient pas, et ce banc les garde sur le VRAI serveur isolé, sans navigateur :
 *   1. `/api/bug` recopiait ce que l'application lui envoyait : « domaine du destinataire : client-dupont.fr » (un domaine
 *      d'ENTREPRISE nomme le client) et, dans le message, l'adresse que le serveur de messagerie recopie dans son refus. Ça finissait
 *      dans bugs.jsonl, le courriel de la vigie, mails-envoyes.json et la Tour. On ne garde qu'un domaine de messagerie PUBLIQUE ;
 *   2. un envoi demandé « par la boîte mb… » dont la boîte a été déconnectée ailleurs retombait EN SILENCE dans le mode simple : le
 *      document partait par le SMTP de TEAM OP. Il est refusé (409), et le facteur ne reçoit rien.
 * Contre-épreuves (`MUTER=1` remet l'ancien comportement dans une copie du serveur) : le banc doit tomber. */
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      détail : ' + JSON.stringify(d).slice(0, 400) : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3246-'));
let enfant = null;
process.on('exit', () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => { c.on('error', () => {}); let t = '', corps = false, msg = '', a = [];
    c.write('220 banc\r\n');
    c.on('data', d => { t += d; let i; while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; f.recus.push({ a: a.slice(), brut: msg }); msg = ''; a = []; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('RCPT TO')) { a.push(l.slice(8).replace(/[<>]/g, '').trim().toLowerCase()); c.write('250 ok\r\n'); }
      else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
      else c.write('250 ok\r\n'); } }); });
  return f;
}

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* le serveur : celui du dépôt, ou une copie MUTÉE (contre-épreuve) */
  let SERVEUR = path.join(RACINE, 'server', 'index.js');
  if (process.env.MUTER) {
    let s = fs.readFileSync(SERVEUR, 'utf8');
    s = s.replace(/const msg = req\.body && req\.body\.msg \? bugAnonymiser\(req\.body\.msg\) : '', src = bugAnonymiser\(req\.body && req\.body\.src\), stack = bugAnonymiser\(req\.body && req\.body\.stack\);/,
      "const msg = req.body && req.body.msg, src = req.body && req.body.src, stack = req.body && req.body.stack;")
      .replace("if (useMailbox && useMailbox.id && !mb) return res.status(409)", "if (false) return res.status(409)");
    SERVEUR = path.join(RACINE, 'server', '.banc-3246-mute.js'); fs.writeFileSync(SERVEUR, s);
    process.on('exit', () => { try { fs.unlinkSync(SERVEUR); } catch (e) {} });
  }
  const fct = facteur(); await new Promise(r => fct.s.listen(0, '127.0.0.1', r));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const T = 'clim-banc-zqx', CLE = 'CLE-BANC-3246-ZQX';
  const sha = x => crypto.createHash('sha256').update(x).digest('hex'), b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'clim-banc': { slug: 'clim-banc', nom: 'Clim Banc', email: 'patron@clim-banc-zqx.fr', t: T, code: b64({ t: T, k: CLE }), ts: Date.now() } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc-3246-' + 'k'.repeat(30),
    smtp: { host: '127.0.0.1', port: fct.s.address().port, secure: false, user: 'contact@teamop.fr', pass: 'x', from: '"TeamOP" <contact@teamop.fr>' }, notifDemandes: 'contact@teamop.fr' }));
  const PORT = await new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/t', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1', TEAMOP_IDTK_URL: 'http://127.0.0.1:1/i',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/c', TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre' + (process.env.MUTER ? ' (copie MUTÉE)' : ''), vivant);
  if (!vivant) { console.log(journal.slice(-800)); process.exit(1); }
  const poster = (chemin, corps, ent) => fetch(B + chemin, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, ent || {}), body: JSON.stringify(corps) });

  console.log('\n── 3246 · 1. /api/bug : ni adresse, ni domaine d\'entreprise ──');
  /* la forme exacte qu'envoie la v795 en service, et une variante avec l'adresse recopiée par le serveur de messagerie */
  await poster('/api/bug', { teamId: T, app: 'opgestion', version: '795', msg: 'Envoi e-mail refusé par le serveur : 550 5.1.1 <mme-kwzyx@client-wkzyx.fr>: Recipient address rejected', src: 'srvMail', line: 0, stack: 'domaine du destinataire : client-wkzyx.fr' });
  await poster('/api/bug', { teamId: T, app: 'opgestion', version: '795', msg: 'Envoi e-mail refusé par le serveur : quota', src: 'srvMail', line: 0, stack: 'domaine du destinataire : orange.fr' });
  await dormir(800);
  const bugs = fs.readFileSync(path.join(D, 'bugs.jsonl'), 'utf8');
  const tout = bugs + (fs.existsSync(path.join(D, 'mails-envoyes.json')) ? fs.readFileSync(path.join(D, 'mails-envoyes.json'), 'utf8') : '') + fct.recus.map(m => m.brut).join('\n');
  vrai('population : les deux rapports sont rangés, et la vigie a écrit', bugs.trim().split('\n').length === 2 && fct.recus.length >= 1, { lignes: bugs.trim().split('\n').length, recus: fct.recus.length });
  v('ni l\'adresse ni le domaine du client, nulle part (bugs.jsonl, journal des envois, courriel de la vigie)', ['kwzyx', 'wkzyx'].filter(j => tout.includes(j)), []);
  vrai('l\'adresse est remplacée par « [adresse] », le domaine d\'entreprise par « domaine d’entreprise »', /\[adresse\]/.test(bugs) && /domaine du destinataire : domaine d’entreprise/.test(bugs), bugs.slice(0, 400));
  vrai('le domaine d\'une messagerie PUBLIQUE reste (il sert au diagnostic et ne nomme personne)', /domaine du destinataire : orange\.fr/.test(bugs));

  console.log('\n── 3246 · 2. une boîte demandée et introuvable ne se rabat pas sur la plateforme ──');
  const n0 = fct.recus.length;
  const r = await poster('/api/sendmail', { teamId: T, to: 'mme-kwzyx@client-wkzyx.fr', subject: 'Devis DV-ZQX', text: 'Bonjour', useMailbox: { id: 'mbDisparue' } }, { 'x-teamop-kh': sha(CLE) });
  const j = await r.json().catch(() => ({}));
  v('réponse 409', r.status, 409);
  vrai('le message dit de reconnecter la boîte, sans les mots que l\'écran prend pour un mot de passe', /boîte mail introuvable/.test(j.error || '') && !/refus|auth|login|invalid|password|mot de passe/i.test(j.error || ''), j);
  await dormir(500);
  v('le facteur de TEAM OP n\'a rien reçu', fct.recus.length - n0, 0);
  /* et le mode simple (aucune boîte demandée) part toujours — c'est la v795 en service, sans copie cachée depuis 91641d89 */
  const r2 = await poster('/api/sendmail', { teamId: T, to: 'mme-kwzyx@client-wkzyx.fr', subject: 'Devis DV-ZQX', text: 'Bonjour' }, { 'x-teamop-kh': sha(CLE) });
  v('contre-épreuve : sans boîte demandée, l\'envoi d\'aujourd\'hui (v795) part toujours', r2.status, 200);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
