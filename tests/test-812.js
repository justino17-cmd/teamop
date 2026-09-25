/* ⛔ CE QUE CE FICHIER GARDE — LE FILET DU SERVEUR (durcissement de l'étape 0, 25 septembre 2026).

   Mesuré ce jour-là sur le vrai serveur : un corps JSON malformé (`{"t":`) envoyé à n'importe
   quelle route rendait la page d'erreur d'Express AVEC SA PILE — chemins du serveur, versions des
   bibliothèques — à n'importe qui, parce qu'Express ne s'en abstient que sous
   `NODE_ENV=production`, que l'unité systemd ne posait pas. Et une promesse rejetée sans
   gestionnaire arrêtait le processus (Node 22) : l'API de toutes les entreprises, et chaque écoute
   en cours, coupées le temps que systemd relance.

   On lance le VRAI serveur, isolé sur 127.0.0.1, et on lui parle en HTTP ; le gestionnaire de
   rejets, lui, est pris dans le fichier réel et joué dans un processus à part — on ne peut pas
   faire rejeter une promesse au serveur sans lui ajouter une porte pour ça. */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
let enfant = null;
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b812-'));
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

console.log('\n── 812 · le filet du serveur : jamais une pile dans une réponse, jamais un arrêt pour une promesse ──');
(async () => {
  const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  /* ── 1. le gestionnaire de rejets, joué ── */
  {
    const i = SRC.indexOf('const incidents = { rejet: [], erreur: [] };'), j = SRC.indexOf("app.get('/health'", i);
    vrai('le filet du processus existe dans le serveur', i > 0 && j > i);
    const bloc = SRC.slice(i, j);
    const script = bloc + `
      setTimeout(() => { Promise.reject(Object.assign(new Error('adresse client@exemple.fr dans le message'), { code: 'ESSAI' })); }, 10);
      setTimeout(() => { Promise.reject(new Error('seconde')); }, 20);
      setTimeout(() => { console.log('VIVANT ' + incidentsHeure('rejet')); process.exit(0); }, 200);`;
    const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 10000 });
    v('⛔ une promesse rejetée sans gestionnaire n\'arrête plus le processus (Node 22 l\'arrêtait)', [r.status, /VIVANT 2/.test(r.stdout)], [0, true]);
    vrai('   elle est dite au journal, avec son code', /promesse rejetée sans gestionnaire — ESSAI/.test(r.stderr));
    v('⛔ et jamais son MESSAGE (qui peut porter une adresse ou un nom de client)', /client@exemple\.fr/.test(r.stderr + r.stdout), false);
  }

  /* ── 1 bis. une route `async` qui rejette (`gardien`, N1) : l'enveloppe ET le filet final du
     fichier réel, joués sur une application neuve — on ne peut pas faire rejeter une route du
     serveur sans lui ajouter une porte pour ça. ── */
  {
    const i = SRC.indexOf('const enveloppe = (fn) =>'), j = SRC.indexOf("// Le serveur n'écoute que sur 127.0.0.1", i);
    const k = SRC.indexOf("app.use((req, res) => { res.status(404)"), l = SRC.indexOf('const PORT = process.env.PORT', k);
    vrai('l\'enveloppe des routes et le filet final existent dans le serveur', i > 0 && j > i && k > 0 && l > k);
    const script = 'const express = require(' + JSON.stringify(path.join(RACINE, 'server', 'node_modules', 'express')) + '); const app = express();\n'
      + 'const incidentNoter = () => {}; const incidentOu = () => "";\n' + SRC.slice(i, j) + `
      app.set('trust proxy', 1);
      app.get('/async', async (req, res) => { await null; throw new Error('boum'); });
      app.get('/sync', (req, res) => { throw new Error('boum'); });
      app.get('/bon', async (req, res) => { await null; res.json({ ok: true }); });
      app.get('/perso', async (req, res) => { await null; throw Object.assign(new Error('x'), { code: 'PERSO' }); });
      app.use((err, req, res, next) => { if (err && err.code === 'PERSO') return res.status(418).type('text/plain').send('perso'); next(err); });
      ` + SRC.slice(k, l) + `
      const s = app.listen(0, '127.0.0.1', async () => { const b = 'http://127.0.0.1:' + s.address().port; const out = {};
        for (const r of ['/async', '/sync', '/bon', '/perso']) { const t0 = Date.now(); const c = new AbortController(); const to = setTimeout(() => c.abort(), 5000);
          try { const x = await fetch(b + r, { signal: c.signal }); out[r] = [x.status, (await x.text()).slice(0, 40), Date.now() - t0 < 3000]; } catch (e) { out[r] = ['PENDUE']; } clearTimeout(to); }
        out.reglage = app.get('trust proxy');
        console.log(JSON.stringify(out)); s.close(); process.exit(0); });`;
    const r = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 30000 });
    let o = {}; try { o = JSON.parse(String(r.stdout || '').trim().split('\n').pop()); } catch (e) {}
    v('⛔ N1 — une route async qui rejette RÉPOND (500, texte brut), au lieu de pendre jusqu\'au délai du mandataire', o['/async'], [500, 'erreur du serveur', true]);
    v('   une exception synchrone, pareil', o['/sync'], [500, 'erreur du serveur', true]);
    v('   une route qui marche n\'est pas touchée', o['/bon'], [200, '{"ok":true}', true]);
    v('   un middleware d\'erreur (quatre paramètres) en reste un — il n\'est pas enveloppé', o['/perso'], [418, 'perso', true]);
    v('   et `app.get(réglage)` lit toujours un réglage, il n\'est pas pris pour une route', o.reglage, 1);
  }

  /* ── 2. le vrai serveur ── */
  let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … partie serveur SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const vap = webpush.generateVAPIDKeys();
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey }));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  /* Sans NODE_ENV, exactement comme l'unité systemd d'aujourd'hui : c'est ce cas qu'on garde. */
  const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) });
  delete env.NODE_ENV;
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let pret = false; for (let k = 0; k < 100 && !pret; k++) { try { pret = (await fetch(B + '/health')).ok; } catch (e) {} if (!pret) await dormir(100); }
  vrai('le serveur démarre (sans NODE_ENV, comme en production aujourd\'hui)', pret);
  const brut = async (route, corps, type) => { const r = await fetch(B + route, { method: 'POST', headers: { 'Content-Type': type || 'application/json' }, body: corps });
    return { s: r.status, type: r.headers.get('content-type') || '', txt: await r.text() }; };
  const pile = t => /\bat [^\n]*\(|node_modules|\/server\/|body-parser|SyntaxError/.test(t);
  try {
    let r = await brut('/api/doc/lire', '{"t":');
    v('⛔ un JSON malformé : 400, en texte brut, SANS pile', [r.s, /^text\/plain/.test(r.type), pile(r.txt), r.txt], [400, true, false, 'requête illisible']);
    r = await brut('/api/compte/connexion', '{"email":"a@b.fr","h":' );
    v('   sur une autre route aussi', [r.s, pile(r.txt)], [400, false]);
    r = await brut('/api/doc/ecrire', '"' + 'x'.repeat(6500000) + '"');
    v('⛔ un corps trop lourd : 413, en texte brut, sans pile', [r.s, pile(r.txt), r.txt], [413, false, 'requête trop lourde']);
    const g = await fetch(B + '/api/nulle-part/<b>quelque-chose</b>');
    const gt = await g.text();
    v('⛔ une route inconnue : 404, un mot, et l\'adresse demandée n\'est pas renvoyée', [g.status, gt, /quelque-chose/.test(gt)], [404, 'introuvable', false]);
    const h = await (await fetch(B + '/health')).json();
    v('/health publie le filet : zéro rejet, zéro erreur de route (un 4xx n\'en est pas une)', h.processus, { rejets1h: 0, erreurs1h: 0 });
    v('⛔ le journal du serveur ne contient pas le corps reçu', /quelque-chose|xxxxxxxxxx/.test(journal), false);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  /* ── 3. l'unité systemd d'une installation neuve ── */
  const INST = fs.readFileSync(path.join(RACINE, 'server', 'install.sh'), 'utf8');
  vrai('une installation neuve pose NODE_ENV=production dans l\'unité', /\[Service\][\s\S]*?\nEnvironment=NODE_ENV=production\n[\s\S]*?\[Install\]/.test(INST));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
