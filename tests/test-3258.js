/* ══ « CORRIGÉ » N'ENVOIE PLUS DE COURRIEL AU CLIENT ═══════════════════════════════════════════════════════════════════════════════════
   Justin, 5 novembre 2026, capture du Courrier de la Tour à l'appui : « il faudrait que ça arrête d'envoyer des mails à chaque truc
   corrigé ». Toka Clim avait reçu « Votre application a été améliorée ✅ » six fois dans la même conversation — un par incident fermé,
   pour des coupures de réseau de son propre téléphone.

   La règle : passer un incident « corrigé » (route `/api/monitor/status`) n'écrit à AUCUNE entreprise, sauf demande explicite
   `prevenir: true` dans le corps — qu'aucun écran de la Tour n'envoie aujourd'hui. Le banc lance le VRAI serveur, isolé (sa
   configuration, ses données, son port, aucun SMTP : un envoi y est « simulé » et compté dans `mailsSimules`), et lui parle en HTTP.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');

let webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
catch (e) { console.log('  … banc non exécuté : server/node_modules absent'); console.log('════ test-3258 : 0 ✓ 0 ✗ ════'); process.exit(0); }

(async () => {
  let enfant = null;
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3258-'));
  const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  try {
    const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
    const H = 3600000, now = Date.now(), MDP = 'banc-3258-patron';
    const I = (id) => ({ id, app: 'opgestion', type: 'reseau', statut: 'nouveau', count: 3, firstTs: now - 2 * H, lastTs: now - H, message: 'Coupure ' + id,
      entreprises: [{ nom: 'Client Qzw ' + id, email: 'client-' + id + '@exemple-qzw.fr', count: 3, lastTs: now }], appareils: { a: 1 }, notes: '', mailEnvoye: false });
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
    fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [I('qzw-a'), I('qzw-b')], users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
    const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
    let journal = '';
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
      TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    vrai('le serveur démarre', vivant, journal.slice(-300));
    const TP = (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token;
    vrai('une session de patron', TP);
    const statut = async (corps) => { const r = await fetch('http://127.0.0.1:' + PORT + '/api/monitor/status', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TP }, body: JSON.stringify(corps) }); return { code: r.status, j: await r.json() }; };

    const a = await statut({ id: 'qzw-a', statut: 'corrige', note: 'Réseau du téléphone' });
    v('« corrigé » sans demande : 200, l\'incident est fermé', [a.code, a.j.issue && a.j.issue.statut], [200, 'corrige']);
    v('⛔ … et AUCUN courriel au client, ni envoyé ni simulé, et l\'incident ne se dit pas « prévenu »', [a.j.mails, a.j.mailsSimules, a.j.issue && a.j.issue.mailEnvoye], [0, 0, false]);
    vrai('le journal du serveur ne mentionne aucun courriel de surveillance', !/monitor mail/.test(journal), journal.slice(-300));

    const b = await statut({ id: 'qzw-b', statut: 'corrige', prevenir: true });
    v('« corrigé » avec `prevenir: true` (geste explicite) : un seul courriel, simulé faute de SMTP, et l\'incident se dit prévenu', [b.code, b.j.mailsSimules, b.j.issue && b.j.issue.mailEnvoye], [200, 1, true]);
    const b2 = await statut({ id: 'qzw-b', statut: 'corrige', prevenir: true });
    v('un second « corrigé » ne réécrit pas au client', b2.j.mailsSimules, 0);

    /* Contre-épreuve de la Tour : aucun écran n'envoie `prevenir` aujourd'hui. On lit le code de l'appel (commentaires retirés). */
    const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const appels = T.match(/apiPost\('\/api\/monitor\/status',\{[^}]*\}/g) || [];
    vrai('la Tour appelle bien la route de statut (population non vide)', appels.length > 0, appels.length);
    v('aucun appel de la Tour ne demande à prévenir le client', appels.filter(x => /prevenir/.test(x)).length, 0);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  finally { fin(); console.log(`════ test-3258 : ${ok} ✓ ${ko} ✗ ════`); process.exit(ko ? 1 : 0); }
})();
