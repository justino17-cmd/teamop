/* ⛔ CE QUE CE FICHIER GARDE — LE JOURNAL DES GESTES DE LA TOUR (17 octobre 2026).

   Mesuré au jumeau (scripts/controle/audit-tour.js) : après avoir accepté une demande, ouvert un espace et envoyé son
   e-mail d'accès, le Journal de la Tour disait « Aucune action depuis l'ouverture de la console » — les gestes ne vivaient
   que dans la page qui les avait faits. Le serveur les note désormais (`MON_GESTES`, `monGesteNoter`, server/index.js).
   Deux moitiés, et elles ne se remplacent pas :
     1. la TABLE : chaque route POST de la Tour, dans tous les fichiers de server/, y est classée — un geste ou `null`
        (une lecture) — et aucune entrée ne vise une route disparue. Une route neuve oublie d'être journalisée sans un
        mot : c'est ce que ce contrôle refuse ;
     2. le VRAI serveur, parlé en HTTP : un geste réussi s'inscrit (qui, quoi, la console, la cible), un refus non, une
        lecture non, un mot de passe jamais, une adresse seulement masquée — et le journal survit à un redémarrage.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

(async () => {
  console.log('\n── test-1015 : le journal des gestes de la Tour ──');
  /* ══ 1. LA TABLE CONTRE LES ROUTES ══ */
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const i0 = SRC.indexOf('const MON_GESTES = {'), i1 = i0 < 0 ? -1 : SRC.indexOf('\n};', i0);
  vrai('(population) la table MON_GESTES est trouvée dans le fichier réel', i0 > 0 && i1 > i0);
  let TABLE = {};
  try { TABLE = vm.runInNewContext('(' + SRC.slice(i0 + 'const MON_GESTES = '.length, i1 + 2) + ')'); } catch (e) { vrai('la table se lit', false, e.message); }
  const routes = new Set();
  for (const f of fs.readdirSync(path.dirname(SERVEUR)).filter(f => f.endsWith('.js'))) {
    for (const m of nu(fs.readFileSync(path.join(path.dirname(SERVEUR), f), 'utf8')).matchAll(/app\.post\(\s*'\/api\/monitor\/([^']+)'/g)) routes.add(m[1].toLowerCase().replace(/\/+$/, ''));
  }
  vrai('(population) les routes POST de la Tour sont recensées dans server/ (' + routes.size + ')', routes.size >= 60, routes.size);
  v('chaque route POST de la Tour est classée dans la table (un geste, ou null pour une lecture)', [...routes].filter(r => !(r in TABLE)).sort(), []);
  v('aucune entrée de la table ne vise une route disparue', Object.keys(TABLE).filter(k => !routes.has(k)).sort(), []);
  const gestes = Object.values(TABLE).filter(Boolean);
  vrai('(population) la table porte des gestes, pas seulement des lectures (' + gestes.length + ')', gestes.length >= 40);
  v('un geste se lit comme une phrase après un nom (« Justin a … »)', gestes.filter(g => !/^a /.test(g)), []);

  /* ══ 2. LE VRAI SERVEUR ══ */
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … partie serveur SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b1015-'));
  const D = path.join(banc, 'data'); fs.mkdirSync(D);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-du-banc-1015', SECRET_COLLAB = 'secret-du-collaborateur-1015-qz';
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP) }));
  /* monitor.json vit à côté de config.json (MONITOR_PATH). Le patron y a son compte, comme en production : la connexion par le mot de passe de configuration n'est qu'un repli tant
     qu'aucun compte n'existe, et sa session tombe dès que le premier est créé */
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: kh(MDP), role: 'patron', actif: true, ts: Date.now() }] }));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({
    'camille@exemple-1015.fr': { email: 'camille@exemple-1015.fr', entreprise: 'Hygiène Exemple', inscrit: Date.now() - 3600e3,
      demandes: [{ app: 'OP GESTION', formule: 'Business', date: Date.now() - 3600e3 }] } }));
  const port = await libre(), B = 'http://127.0.0.1:' + port;
  let srv = null, sortie = '';
  const lancer = async () => {
    srv = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(port),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    srv.stdout.on('data', d => { sortie += d; }); srv.stderr.on('data', d => { sortie += d; });
    for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch(B + '/health')).ok) return true; } catch (e) {} }
    return false;
  };
  const arreter = async () => { if (!srv) return; const p = new Promise(r => srv.once('exit', r)); srv.kill('SIGKILL'); await p; srv = null; };
  const fin = () => { try { if (srv) srv.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', fin);
  const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: methode === 'GET' ? undefined : JSON.stringify(corps || {}) });
    let j = null; try { j = JSON.parse(await r.text()); } catch (e) {} return { s: r.status, j: j || {} }; };

  vrai('le vrai serveur démarre', await lancer(), sortie.slice(0, 300));
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const actions = async () => ((await appel('/api/monitor/journal', null, PATRON, 'GET')).j.actions) || [];
  v('au départ, aucun geste (la connexion n\'en est pas un : elle va au journal des connexions)', (await actions()).length, 0);

  /* des gestes qui réussissent, de formes différentes */
  let r = await appel('/api/monitor/clients/demande', { email: 'camille@exemple-1015.fr', idx: 0 }, PATRON);   // sans `traite` : la route classe (c'est ce qu'envoie « Accepter »)
  v('classer la demande : 200', r.s, 200);
  r = await appel('/api/monitor/users', { nom: 'Collaboratrice', pass: SECRET_COLLAB }, PATRON);
  v('créer un compte de la Tour : 200', r.s, 200);
  /* une lecture, et des refus */
  r = await appel('/api/monitor/entreprise/apercu-suppression', { t: 't-banc-1015' }, PATRON);
  v('(population) une LECTURE qui réussit (l\'aperçu d\'une suppression, 200) — elle ne doit pas s\'inscrire', r.s, 200);
  r = await appel('/api/monitor/espaces/statut', { nom: 'personne' }, PATRON); vrai('une lecture refusée (404) — pas un geste', r.s >= 400);
  r = await appel('/api/monitor/clients/note', { email: 'inconnu@exemple-1015.fr', note: 'x' }, PATRON); v('une note sur un client inconnu : 404', r.s, 404);
  r = await appel('/api/monitor/clients/note', { email: 'camille@exemple-1015.fr', note: 'rappeler lundi' }); vrai('sans session : refusé', r.s === 401 || r.s === 403);
  /* une collaboratrice fait un geste : c'est son nom qui s'inscrit */
  const COLLAB = (await appel('/api/monitor/login', { nom: 'Collaboratrice', pass: SECRET_COLLAB })).j.token;
  vrai('(population) la collaboratrice ouvre une session', COLLAB);
  /* on laisse passer l'écriture que la connexion vient de programmer (monSave, 500 ms) : le geste suivant doit s'écrire de
     LUI-MÊME — sa route n'écrit que les comptes du site, et sans ça une écriture voisine le sauverait par chance */
  await dormir(700);
  r = await appel('/api/monitor/clients/note', { email: 'camille@exemple-1015.fr', note: 'rappeler lundi' }, COLLAB);
  v('la collaboratrice écrit une note : 200', r.s, 200);

  let A = await actions();
  v('trois gestes inscrits, le plus récent d\'abord (les refus et la lecture n\'y sont pas)', A.map(a => a.geste), [TABLE['clients/note'], TABLE['users'], TABLE['clients/demande']]);
  v('qui : le nom du compte qui a fait le geste', A.map(a => a.qui), ['Collaboratrice', 'Patron', 'Patron']);
  v('la console du geste : OP GESTION pour un client, aucune pour un compte de la Tour (route commune)', A.map(a => a.app || null), ['gestion', null, 'gestion']);
  v('la cible : le nom du compte créé', A[1] && A[1].cible, 'Collaboratrice');
  v('⛔ une adresse n\'entre que masquée', A[2] && A[2].cible, 'c***@exemple-1015.fr');
  v('le détail dit ce que le geste a décidé (« classée »)', A[2] && A[2].detail, 'classée');
  await dormir(900);   // monSave écrit 500 ms après le dernier geste
  const disque = fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8');   // MONITOR_PATH vit à côté de la configuration, pas dans les données
  vrai('⛔ le mot de passe du compte créé n\'est NULLE PART dans le journal ni sur le disque', !JSON.stringify(A).includes(SECRET_COLLAB) && !disque.includes(SECRET_COLLAB));
  vrai('⛔ l\'adresse en clair n\'est pas dans les gestes', !JSON.stringify(A).includes('camille@exemple-1015.fr'));
  vrai('⛔ la note (un texte libre) n\'est pas dans les gestes', !JSON.stringify(A).includes('rappeler lundi'));
  const collabRefus = await appel('/api/monitor/journal', null, COLLAB, 'GET');
  vrai('le journal reste réservé au patron', collabRefus.s === 403, collabRefus.s);

  /* le journal survit à un redémarrage — c'est toute sa raison d'être */
  await arreter();
  vrai('le serveur redémarre sur les mêmes données', await lancer(), sortie.slice(-300));
  const P2 = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  const A2 = ((await appel('/api/monitor/journal', null, P2, 'GET')).j.actions) || [];
  v('après redémarrage, les trois gestes sont toujours là', A2.map(a => a.geste), A.map(a => a.geste));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await arreter(); fin();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
