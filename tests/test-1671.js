/* ⛔ CE QUE CE FICHIER GARDE — LES PIÈCES AUTOUR DU SERVEUR DE SIGNATURE D'OP COURRIER (`server-courrier/`) : son installation, sa saisie des clés, son workflow, sa séparation.
     1. `configurer-yousign.js` EXÉCUTÉ (entrée redirigée) : la clé et le secret ne sont JAMAIS réécrits (ni en sortie ni en erreur), deux saisies différentes n'écrivent rien,
        le fichier reste en 0600, « vérifier » dit identique / différente sans rien afficher, « tester » parle au (faux) Yousign ;
     2. `install-courrier.sh` : syntaxe, arguments refusés AVANT toute action, clé maître jamais régénérée sur des données, jamais affichée, nginx sans journal d'accès, seules deux routes servies ;
     3. le workflow ne part QUE à la main, bancs en `needs`, interrupteur `COURRIER_ACTIF`, aucun secret interpolé dans un script ;
     4. la séparation : le service ne lit ni `server/` ni `server-msg/`, ni Firebase ; `fetch` n'est écrit que dans yousign.js, auth.js ; les chemins Yousign que dans yousign.js ;
     5. la couture avec OP GESTION : la route `/api/monitor/moi` rend bien { ok, id, nom, role } (ce que la porte de ce service lit) ;
     6. la liste de bancs et son plancher. ⛔ Un motif vise du CODE (commentaires retirés), jamais une phrase. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const F = require('./courrier-faux');
const RAC = path.join(__dirname, '..'), SC = path.join(RAC, 'server-courrier');
const lire = (f) => fs.readFileSync(path.join(RAC, f), 'utf8');
const sansCommJs = (t) => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const sansCommSh = (t) => t.replace(/^[ \t]*#.*$/gm, ' ');

(async () => {
  const CLE = 'CLE-API-SECRETE-0123456789abcdef', SEC = 'SECRET-WEBHOOK-0123456789abcdef', AUTRE = 'AUTRE-VALEUR-0123456789abcdef';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-conf-'));
  const conf = path.join(dossier, 'beta.json');
  const reset = () => fs.writeFileSync(conf, JSON.stringify({ origines: ['https://teamop.fr'], yousign: { sandbox: true } }), { mode: 0o600 });
  const conf_ = (arg, lignes, extra) => spawnSync(process.execPath, [path.join(SC, 'configurer-yousign.js')].concat(arg), { input: lignes.join('\n') + '\n', env: Object.assign({ PATH: process.env.PATH, OPCOURRIER_CONFIG: conf, OPCOURRIER_SANS_REDEMARRAGE: '1' }, extra || {}), encoding: 'utf8', timeout: 15000 });
  const confAsync = (arg, lignes) => new Promise((ok2) => {   // asynchrone : le faux Yousign vit dans CE processus, un spawnSync le gèlerait
    const e = require('child_process').spawn(process.execPath, [path.join(SC, 'configurer-yousign.js')].concat(arg), { env: { PATH: process.env.PATH, OPCOURRIER_CONFIG: conf, OPCOURRIER_SANS_REDEMARRAGE: '1' } });
    let o = '', er = ''; e.stdout.on('data', (d) => { o += d; }); e.stderr.on('data', (d) => { er += d; }); e.on('close', (st) => ok2({ status: st, stdout: o, stderr: er })); e.stdin.end(lignes.join('\n') + '\n');
  });
  const toutSortie = (p) => p.stdout + p.stderr;
  const secretsAbsents = (p) => ![CLE, SEC, AUTRE, CLE.slice(0, 12), SEC.slice(0, 12)].some((s) => toutSortie(p).includes(s));

  console.log('\n── 1. configurer-yousign.js ──');
  reset();
  let p = conf_(['beta'], ['sandbox', CLE, CLE, SEC, SEC]);
  v('pose la clé et le secret : code 0, « posé »', [p.status, /✓ posé/.test(p.stdout)], [0, true]);
  vrai('…sans JAMAIS réécrire la clé ni le secret (sortie standard + erreur)', secretsAbsents(p));
  vrai('…la sortie est non vide (population : les invites sont là)', p.stdout.length > 80 && /Clé API Yousign/.test(p.stdout));
  let c = JSON.parse(fs.readFileSync(conf, 'utf8'));
  v('le fichier porte la clé, le secret, le bac à sable', [c.yousign.cleApi, c.yousign.secretWebhook, c.yousign.sandbox], [CLE, SEC, true]);
  v('…en 0600, et les autres réglages sont gardés', [(fs.statSync(conf).mode & 0o777).toString(8), c.origines], ['600', ['https://teamop.fr']]);
  p = conf_(['beta'], ['production', AUTRE, 'AUTRE-DIFFERENT-0123456789abcd', SEC, SEC]);
  v('deux saisies différentes : refus (code 1), rien modifié', [p.status, JSON.parse(fs.readFileSync(conf, 'utf8')).yousign.cleApi], [1, CLE]);
  vrai('…et la valeur tapée n\'est pas réécrite', secretsAbsents(p));
  p = conf_(['beta'], ['', '', '', '', '']);
  v('tout laisser vide : « inchangé », valeurs gardées', [p.status, JSON.parse(fs.readFileSync(conf, 'utf8')).yousign.cleApi, /inchangée/.test(p.stdout)], [0, CLE, true]);
  p = conf_(['beta'], ['sandbox', 'court', 'court']);
  v('une valeur trop courte : refus', p.status, 1);
  p = conf_(['beta', 'verifier'], [CLE, SEC]);
  vrai('« vérifier » : identique pour les deux, sans rien afficher', p.status === 0 && /clé API : identique/.test(p.stdout) && /secret du webhook : identique/.test(p.stdout) && secretsAbsents(p));
  p = conf_(['beta', 'verifier'], [AUTRE, SEC]);
  vrai('« vérifier » : DIFFÉRENTE quand elle l\'est', /clé API : DIFFÉRENTE/.test(p.stdout) && /secret du webhook : identique/.test(p.stdout) && secretsAbsents(p));
  p = conf_(['milieu'], []); v('instance inconnue : usage, code 2', p.status, 2);
  const ys = await F.fauxYousign(CLE);
  c = JSON.parse(fs.readFileSync(conf, 'utf8')); c.yousign.urlApi = ys.url; fs.writeFileSync(conf, JSON.stringify(c), { mode: 0o600 });
  p = await confAsync(['beta', 'tester'], []);
  vrai('« tester » contre le faux Yousign : la clé est acceptée', p.status === 0 && /Yousign accepte la clé/.test(p.stdout) && secretsAbsents(p));
  c.yousign.cleApi = AUTRE; fs.writeFileSync(conf, JSON.stringify(c), { mode: 0o600 });
  p = await confAsync(['beta', 'tester'], []);
  vrai('…refusée quand elle est fausse : statut 401 dit, clé jamais écrite', p.status === 1 && /statut 401/.test(p.stderr) && secretsAbsents(p));
  ys.fermer(); fs.rmSync(dossier, { recursive: true, force: true });

  console.log('\n── 2. install-courrier.sh ──');
  const inst = path.join(SC, 'install-courrier.sh'), SH = lire('server-courrier/install-courrier.sh'), code = sansCommSh(SH);
  v('syntaxe bash', spawnSync('bash', ['-n', inst]).status, 0);
  for (const [t, args] of [['instance inconnue', ['milieu', 'courrier.teamop.fr']], ['domaine illisible', ['beta', 'pas un domaine']], ['sans adresse pour le certificat', ['beta', 'courrier-beta.teamop.fr']], ['option inconnue', ['beta', 'courrier-beta.teamop.fr', '--rm']], ['branche illisible', ['beta', 'courrier-beta.teamop.fr', '--email', 'a@b.fr', '--branche', 'x;rm -rf /']]]) {
    const r = spawnSync('bash', [inst].concat(args), { encoding: 'utf8', timeout: 10000 });
    v('refusé avant toute action (code 2) : ' + t, [r.status, /refusé/.test(r.stdout)], [2, true]);
  }
  const iKek = code.indexOf('openssl rand'), iRefus = code.indexOf('contient des données mais la clé maître');
  vrai('la clé maître n\'est tirée qu\'APRÈS le refus « des données sans clé »', iRefus > 0 && iKek > iRefus);
  vrai('…et jamais affichée (tirée vers un fichier, aucun « cat » ni « echo » de la clé)', /openssl rand -hex 32 > "\$KEK"/.test(code) && !/cat\s+"?\$KEK/.test(code) && !/echo[^\n]*\$\(?\s*cat/.test(code));
  vrai('le service reçoit la clé par credential systemd (pas par variable)', /LoadCredential=kek:\$KEK/.test(code) && !/Environment=OPCOURRIER_KEK/.test(code));
  vrai('nginx : aucun journal d\'accès (adresses réseau)', /access_log off;/.test(code));
  vrai('nginx : l\'adresse transmise est celle vue par nginx (le client ne peut pas la forger)', /proxy_set_header X-Forwarded-For \\\$remote_addr;/.test(code) && !/proxy_add_x_forwarded_for/.test(code));
  vrai('nginx : 25 Mo + marge, et seules /health et /api/signature/ sont servies', /client_max_body_size 26m;/.test(code) && /location = \/health/.test(code) && /location \/api\/signature\//.test(code) && /location \/ \{ return 404; \}/.test(code));
  vrai('le service tourne sous un utilisateur dédié, durci, et le code lui est en lecture seule', /User=opcourrier/.test(code) && /ProtectSystem=strict/.test(code) && /NoNewPrivileges=true/.test(code) && /ReadWritePaths=\$DONNEES/.test(code));
  vrai('Node 22 par le dépôt apt SIGNÉ, jamais « curl | bash »', /signed-by=/.test(code) && !/\|\s*(ba)?sh\b/.test(code));
  vrai('rien ne touche à OP GESTION ni OP MESSAGES (aucun chemin /opt/teamop, /etc/teamop, /opt/opmsg, /etc/opmsg dans le code exécuté)', !/\/(opt|etc)\/(teamop|opmsg)/.test(code));
  vrai('aucun `set -x` (il afficherait les commandes)', !/set -[a-z]*x/.test(code));
  vrai('le certificat attend que le DNS pointe ici', code.indexOf('getent ahostsv4') > 0 && code.indexOf('getent ahostsv4') < code.indexOf('certbot --nginx'));
  const DEP = lire('server-courrier/deployer-courrier.sh');
  v('le déployeur : syntaxe', spawnSync('bash', ['-n', path.join(SC, 'deployer-courrier.sh')]).status, 0);
  let r = spawnSync('bash', [path.join(SC, 'deployer-courrier.sh'), 'prod', 'pas-un-sha'], { encoding: 'utf8' });
  v('le déployeur refuse un SHA incomplet (code 2)', r.status, 2);
  r = spawnSync('bash', [path.join(SC, 'deployer-courrier.sh'), 'milieu', 'a'.repeat(40)], { encoding: 'utf8' });
  v('…et une instance inconnue (code 2)', r.status, 2);
  vrai('…il revient en arrière si /health ne rend pas le bon SHA, et n\'affiche aucun journal', /bascule "\$AVANT"/.test(DEP) && !/journalctl/.test(sansCommSh(DEP)));

  console.log('\n── 3. Le workflow ──');
  const W = lire('.github/workflows/deploiement-courrier.yml'), Wc = sansCommSh(W);
  vrai('ne part QUE à la main (workflow_dispatch, ni push, ni pull_request, ni schedule)', /workflow_dispatch:/.test(Wc) && !/^\s*(push|pull_request|pull_request_target|schedule|workflow_run):/m.test(Wc));
  vrai('le job qui parle au VPS attend les bancs ET l\'interrupteur COURRIER_ACTIF', /deployer:[\s\S]*needs: bancs/.test(Wc) && /vars\.COURRIER_ACTIF == 'oui'/.test(Wc));
  vrai('la production passe par un environnement à relecteur', /courrier-prod/.test(Wc));
  const runs = [...Wc.matchAll(/run: \|?\n?([\s\S]*?)(?=\n\s{6}- |\n\s{2}\w+:|$)/g)].map((m) => m[1]).join('\n');
  vrai('population : des scripts `run:` ont été trouvés', runs.length > 200);
  vrai('aucun secret ni entrée interpolés dans un script (tout passe par env:)', !/\$\{\{\s*(secrets|inputs)\./.test(runs));
  vrai('aucune apostrophe dans le mot d\'un ${var:?…} (casse le parse du script entier)', ![...runs.matchAll(/\$\{[A-Za-z_]+:\?([^}]*)\}/g)].some((m) => /['"]/.test(m[1])));
  vrai('la clé d\'hôte est vérifiée (StrictHostKeyChecking=yes)', /StrictHostKeyChecking=yes/.test(Wc));

  console.log('\n── 4. La séparation ──');
  const fichiers = fs.readdirSync(SC).filter((f) => f.endsWith('.js'));
  vrai('population : les modules du service sont là (≥ 9)', fichiers.length >= 9);
  const src = {}; fichiers.forEach((f) => { src[f] = sansCommJs(lire('server-courrier/' + f)); });
  vrai('aucun module ne lit server/ ni server-msg/ ni un dossier voisin', fichiers.every((f) => !/require\(\s*['"]\.\.\//.test(src[f])));
  vrai('ni Firebase ni Firestore', fichiers.every((f) => !/firebase|firestore|googleapis/i.test(src[f])));
  v('`fetch(` n\'est écrit que dans yousign.js et auth.js', fichiers.filter((f) => /\bfetch\(|fetchImpl\(/.test(src[f])).sort(), ['auth.js', 'yousign.js']);
  v('les chemins de l\'API Yousign ne sont écrits que dans yousign.js', fichiers.filter((f) => /signature_requests/.test(src[f])), ['yousign.js']);
  v('seuls index.js (démarrage refusé, mode débogage) et configurer-yousign.js écrivent à la console', fichiers.filter((f) => /console\.(log|error|warn)\(/.test(src[f])).sort(), ['configurer-yousign.js', 'index.js']);
  vrai('X-Powered-By retiré, trust proxy 1', /app\.disable\('x-powered-by'\)/.test(src['index.js']) && /app\.set\('trust proxy', 1\)/.test(src['index.js']));
  vrai('l\'adresse réseau vient de req.ip, jamais d\'un en-tête brut', /req\.ip/.test(src['index.js']) && !/headers\[['"]x-forwarded-for['"]\]/i.test(src['index.js']));
  vrai('le HMAC se compare en temps constant', /timingSafeEqual/.test(src['index.js']));
  const pk = JSON.parse(lire('server-courrier/package.json'));
  v('une seule dépendance de production (express) — chaque dépendance est une surface d\'attaque', Object.keys(pk.dependencies), ['express']);

  console.log('\n── 5. La couture avec OP GESTION (ce que la porte lit) ──');
  const GES = sansCommJs(lire('server/index.js'));
  vrai('GET /api/monitor/moi existe, gardée par monAdmin', /app\.get\('\/api\/monitor\/moi', monAdmin,/.test(GES));
  vrai('…et rend { ok, id, nom, role } — les champs que auth.js exige', /res\.json\(\{ ok: true, id: req\.tourUser\.id, nom: req\.tourUser\.nom, role: req\.tourUser\.role/.test(GES));
  vrai('…le rôle « patron » est celui que monPatron compare', /req\.tourUser\.role !== 'patron'/.test(GES) && /roles = \['patron'\]/.test(src['auth.js']));
  vrai('…et la forme du jeton (48 hexadécimaux) est celle de monAdmin', /\[a-f0-9\]\{48\}/.test(GES) && /\[a-f0-9\]\{48\}/.test(src['auth.js']));

  console.log('\n── 6. La liste de bancs ──');
  const L = lire('scripts/bancs-courrier.liste');
  const suites = L.split('\n').filter((l) => /^tests\/test-\d+\.js$/.test(l.trim()));
  vrai('la liste nomme ses suites, et elles existent', suites.length >= 2 && suites.every((s) => fs.existsSync(path.join(RAC, s.trim()))));
  vrai('un plancher de vérifications est posé (les suites sautent sans `npm ci`)', /^#plancher \d+/m.test(L));
  vrai('LISEZMOI.md existe et nomme les gestes de Justin (DNS, installeur, clé, webhook)', (() => { const t = lire('server-courrier/LISEZMOI.md'); return ['courrier-beta.teamop.fr', 'install-courrier.sh', 'configurer-yousign.js', 'kek', 'webhook/yousign', 'OVH', 'IONOS'].every((m) => t.includes(m)); })());

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
