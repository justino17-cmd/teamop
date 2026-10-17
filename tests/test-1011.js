/* ⛔ CE QUE CE FICHIER GARDE — L'API NE DIT PAS SUR QUOI ELLE TOURNE (17 octobre 2026).

   Le contrôle client mystère (scripts/controle/) a relevé « X-Powered-By: Express » sur chaque réponse de l'API.
   L'en-tête ne sert à personne, sauf à qui cherche une faille d'une version connue : `app.disable('x-powered-by')`.
   On le garde sur le VRAI serveur, parlé en HTTP — une route d'erreur comme une route qui répond — parce qu'un
   motif sur le texte d'index.js garderait une phrase (CLAUDE.md : « un motif de banc doit viser du code »).
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(d).slice(0, 200) : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  console.log('\n── test-1011 : l\'API ne dit pas sur quoi elle tourne ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n0 ✓  0 ✗'); return; }
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b1011-'));
  const data = path.join(banc, 'data'); fs.mkdirSync(data);
  const vap = require(path.join(RACINE, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey }));
  const port = await libre();
  const srv = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: data, PORT: String(port) }), stdio: 'ignore' });
  const fin = () => { try { srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', fin);
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch('http://127.0.0.1:' + port + '/health')).ok; } catch (e) {} }
  vrai('le vrai serveur répond', vivant);
  /* la population : des réponses de toutes les formes — une qui réussit, un refus, une route inconnue, une requête
     préalable du navigateur (OPTIONS) — sinon « aucun en-tête » pourrait passer sur une seule réponse choisie */
  const essais = [['GET', '/health', 200], ['GET', '/api/monitor/clients', 401], ['GET', '/api/nexiste-pas-du-tout', 404], ['OPTIONS', '/api/compte/moi', 204]];
  let vues = 0;
  for (const [m, chemin, attendu] of essais) {
    let r = null; try { r = await fetch('http://127.0.0.1:' + port + chemin, { method: m, headers: { Origin: 'https://teamop.fr', 'Access-Control-Request-Method': 'GET' } }); } catch (e) {}
    if (!r) { vrai(m + ' ' + chemin + ' : une réponse', false); continue; }
    vues++;
    vrai(m + ' ' + chemin + ' (' + r.status + ') : aucun en-tête X-Powered-By', !r.headers.get('x-powered-by'), r.headers.get('x-powered-by'));
    if (attendu && r.status !== attendu) console.log('    (statut ' + r.status + ', attendu ' + attendu + ' — sans importance ici : on regarde l\'en-tête)');
  }
  vrai('(population) quatre réponses de formes différentes ont été lues', vues === essais.length, vues);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
