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
  for (const [t, args] of [['instance inconnue', ['milieu', 'courrier.teamop.fr']], ['domaine illisible', ['beta', 'pas un domaine']], ['option inconnue', ['beta', 'courrier-beta.teamop.fr', '--rm']], ['branche illisible', ['beta', 'courrier-beta.teamop.fr', '--email', 'a@b.fr', '--branche', 'x;rm -rf /']]]) {
    const r = spawnSync('bash', [inst].concat(args), { encoding: 'utf8', timeout: 10000 });
    v('refusé avant toute action (code 2) : ' + t, [r.status, /refusé/.test(r.stdout)], [2, true]);
  }
  const iKek = code.indexOf('openssl rand'), iRefus = code.indexOf('contient des données mais la clé maître');
  // la garde de la clé maître est EXÉCUTÉE (la section 4 du script, dans un bac à sable), pas seulement lue
  const bloc = SH.slice(SH.indexOf('echo "── 4. La clé maître"'), SH.indexOf('echo "── 5.')).replace('chown root:root "$KEK"', 'true');
  vrai('population : la section « clé maître » est trouvée', bloc.length > 300 && /openssl rand/.test(bloc));
  const bac = (garni, avecCle) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-kek-')), kek = path.join(d, 'kek-beta'), don = path.join(d, 'data'); fs.mkdirSync(don);
    if (garni) fs.writeFileSync(path.join(don, 'courrier.db'), 'x');
    if (avecCle) fs.writeFileSync(kek, 'ANCIENNE-CLE\n', { mode: 0o600 });
    const r = spawnSync('bash', ['-c', 'set -euo pipefail\nKEK="$1"; DONNEES="$2"\n' + bloc, 'x', kek, don], { encoding: 'utf8' });
    return { code: r.status, sortie: r.stdout + r.stderr, kek: fs.existsSync(kek) ? fs.readFileSync(kek, 'utf8') : null, mode: fs.existsSync(kek) ? (fs.statSync(kek).mode & 0o777).toString(8) : null };
  };
  let k = bac(true, false);
  v('des données SANS clé maître : REFUS (code 1) et aucune clé neuve', [k.code, k.kek], [1, null]);
  k = bac(true, true); v('des données AVEC leur clé : la clé est gardée telle quelle', [k.code, k.kek], [0, 'ANCIENNE-CLE\n']);
  k = bac(false, false);
  vrai('rien du tout : une clé de 64 hexadécimaux est tirée, en 0600…', k.code === 0 && /^[0-9a-f]{64}\n$/.test(k.kek || '') && k.mode === '600');
  vrai('…et elle n\'est écrite NULLE PART dans la sortie', k.kek && !k.sortie.includes(k.kek.trim()));
  vrai('la clé maître n\'est tirée qu\'APRÈS le refus « des données sans clé »', iRefus > 0 && iKek > iRefus);
  vrai('…et jamais affichée (tirée vers un fichier, aucun « cat » ni « echo » de la clé)', /openssl rand -hex 32 > "\$KEK"/.test(code) && !/cat\s+"?\$KEK/.test(code) && !/echo[^\n]*\$\(?\s*cat/.test(code));
  vrai('le service reçoit la clé par credential systemd (pas par variable)', /LoadCredential=kek:\$KEK/.test(code) && !/Environment=OPCOURRIER_KEK/.test(code));
  vrai('nginx : aucun journal d\'accès (adresses réseau)', /access_log off;/.test(code));
  vrai('nginx : l\'adresse transmise est celle vue par nginx (le client ne peut pas la forger)', /proxy_set_header X-Forwarded-For \\\$remote_addr;/.test(code) && !/proxy_add_x_forwarded_for/.test(code));
  vrai('nginx : 25 Mo + marge, et seules /health et /api/signature/ sont servies', /client_max_body_size 26m;/.test(code) && /location = \/health/.test(code) && /location \/api\/signature\//.test(code) && /location \/ \{ return 404; \}/.test(code));
  vrai('le service tourne sous un utilisateur dédié, durci, et le code lui est en lecture seule', /User=opcourrier/.test(code) && /ProtectSystem=strict/.test(code) && /NoNewPrivileges=true/.test(code) && /ReadWritePaths=\$DONNEES/.test(code));
  // COHABITATION avec teamop-api et OP MESSAGES sur le même VPS
  const ecritNginx = [...code.matchAll(/(?:>|cp |mv |rm -f |ln -sfn )[^\n]*\/etc\/nginx[^\n]*/g)].map((m) => m[0]).join('\n') + '\n' + code.match(/SITE="[^"]*"/)[0];
  vrai('nginx : le SEUL fichier posé est sites-available/courrier-<instance> (+ son lien) — ni nginx.conf, ni conf.d, ni un site existant', /SITE="\/etc\/nginx\/sites-available\/courrier-\$INSTANCE"/.test(code) && /LIEN="\/etc\/nginx\/sites-enabled\/courrier-\$INSTANCE"/.test(code) && !/nginx\.conf|conf\.d|sites-available\/(default|api|opmsg)/.test(code) && !/>\s*\/etc\/nginx\/(?!sites)/.test(code));
  const iT = code.indexOf('nginx -t >/dev/null'), iR = code.indexOf('systemctl reload nginx');
  vrai('`nginx -t` AVANT tout rechargement, et sur refus : fichier retiré, exit 1, aucun reload', iT > 0 && iR > iT && /rm -f "\$SITE" "\$LIEN"/.test(code) && code.slice(iT, iR).includes('exit 1'));
  vrai('Node, nginx, les autres certificats : ni installés, ni mis à jour, ni apt upgrade', !/nodesource|apt(-get)? +(upgrade|dist-upgrade|full-upgrade)|install[^\n]*\s(nodejs|nginx)\b/.test(code) && /Node 22\.5 minimum/.test(code) && /aucun proxy actif/.test(code));
  vrai('certbot : CE domaine seulement (jamais renew, delete, --expand ni -d d\'un autre)', (code.match(/certbot --nginx -d "\$DOMAINE" --cert-name "\$DOMAINE"/g) || []).length === 1 && !/certbot +(renew|delete|revoke)|--expand/.test(code) && (code.match(/certbot[^\n]*-d "/g) || []).length === 1);
  vrai('pare-feu : rien n\'est ouvert (ni ufw, ni iptables, ni nft, ni firewall-cmd)', !/\b(ufw|iptables|ip6tables|nft|firewall-cmd)\b/.test(code));
  vrai('le port est refusé s\'il appartient à un autre service du VPS, et vérifié libre (ss)', /8080\|8090\|8091\|7880\|7881\|3478\|5349/.test(code) && /\/dev\/tcp\/127\.0\.0\.1/.test(code));
  vrai('le service n\'écoute que sur 127.0.0.1', /listen\(config\.port, '127\.0\.0\.1'/.test(sansCommJs(lire('server-courrier/index.js'))) && /proxy_pass http:\/\/127\.0\.0\.1:\$PORT/.test(code));
  // CADDY (le proxy réel de ce VPS) : la section est EXÉCUTÉE avec un faux `caddy` et un faux `systemctl`
  const bCad = SH.slice(SH.indexOf('# --- caddy debut ---'), SH.indexOf('# --- caddy fin ---'));
  vrai('population : la section Caddy est trouvée', bCad.length > 500 && /caddy validate/.test(bCad));
  const bacCaddy = (validate, deux) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-caddy-')), bin = path.join(d, 'bin'), cdy = path.join(d, 'caddy'); fs.mkdirSync(bin); fs.mkdirSync(cdy);
    const CF = '{\n  email x@y.fr\n}\napi.teamop.fr {\n  reverse_proxy 127.0.0.1:8080\n}\nimport /etc/caddy/opmsg/*.caddy\n';
    fs.writeFileSync(path.join(cdy, 'Caddyfile'), CF);
    fs.writeFileSync(path.join(bin, 'caddy'), '#!/bin/sh\necho "validate $*" >> "' + d + '/appels"\n' + (validate ? 'exit 0' : 'exit 1') + '\n', { mode: 0o755 });
    fs.writeFileSync(path.join(bin, 'systemctl'), '#!/bin/sh\necho "systemctl $*" >> "' + d + '/appels"\n', { mode: 0o755 });
    const run = () => spawnSync('bash', ['-c', 'set -euo pipefail\nINSTANCE=beta; DOMAINE=courrier-beta.teamop.fr; PORT=8192; CDY="$1"\n' + bCad, 'x', cdy], { encoding: 'utf8', env: { PATH: bin + ':' + process.env.PATH } });
    const r1 = run(); const r2 = deux ? run() : null;
    const lire2 = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    return { r1, r2, CF, cf: lire2(path.join(cdy, 'Caddyfile')), site: lire2(path.join(cdy, 'opcourrier', 'beta.caddy')), appels: lire2(path.join(d, 'appels')) || '', reste: fs.readdirSync(cdy).concat(fs.existsSync(path.join(cdy, 'opcourrier')) ? fs.readdirSync(path.join(cdy, 'opcourrier')) : []) };
  };
  let cd = bacCaddy(true, true);
  vrai('Caddy : le fichier à nous est créé (domaine, port local, plafond 26 Mo, 404 ailleurs, X-Forwarded-For écrasé)', cd.r1.status === 0 && /courrier-beta\.teamop\.fr \{/.test(cd.site) && /reverse_proxy 127\.0\.0\.1:8192/.test(cd.site) && /max_size 26MB/.test(cd.site) && /respond 404/.test(cd.site) && /header_up X-Forwarded-For \{remote_host\}/.test(cd.site) && /path \/health \/api\/signature\/\*/.test(cd.site));
  v('Caddy : UNE seule ligne import ajoutée, même relancé deux fois', (cd.cf.match(/^import \/etc\/caddy\/opcourrier\/\*\.caddy$/gm) || []).length, 1);
  vrai('Caddy : le Caddyfile existant (api.teamop.fr, import opmsg) est conservé tel quel, seule la ligne est ajoutée', cd.cf.startsWith(cd.CF) && cd.r2.status === 0);
  vrai('Caddy : validate AVANT reload, et reload fait', /validate[\s\S]*systemctl reload caddy/.test(cd.appels) && cd.r1.status === 0);
  vrai('Caddy : les sauvegardes temporaires sont nettoyées', !cd.reste.some((f) => /avant/.test(f)));
  cd = bacCaddy(false, false);
  vrai('Caddy : validate refusé → code 1, Caddyfile restauré à l\'identique, fichier à nous retiré', cd.r1.status === 1 && cd.cf === cd.CF && cd.site === null);
  vrai('Caddy : validate refusé → RIEN n\'est rechargé', !/reload/.test(cd.appels) && /validate/.test(cd.appels));
  vrai('Caddy : aucun certbot, aucun nginx dans la section (Caddy obtient son certificat seul)', !/certbot|nginx/.test(bCad.replace(/^\s*#.*$/gm, '')));
  vrai('le proxy est détecté (nginx OU caddy, OPCOURRIER_PROXY force) et deux proxys actifs = refus', /OPCOURRIER_PROXY/.test(code) && /nginx ET caddy sont actifs/.test(code));
  // la détection du proxy, EXÉCUTÉE avec un faux systemctl
  const bPx = SH.slice(SH.indexOf('actif() {'), SH.indexOf('echo "   proxy : $PROXY"') + 'echo "   proxy : $PROXY"'.length);
  const dPx = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-px-')); fs.writeFileSync(path.join(dPx, 'systemctl'), '#!/bin/sh\ncase " $ACTIFS " in *" $3 "*) exit 0;; esac\nexit 1\n', { mode: 0o755 });
  const px = (actifs, forcer) => spawnSync('bash', ['-c', 'set -euo pipefail\n' + bPx], { encoding: 'utf8', env: { PATH: dPx + ':' + process.env.PATH, ACTIFS: actifs, OPCOURRIER_PROXY: forcer || '' } });
  vrai('proxy : seul Caddy actif → caddy', /proxy : caddy/.test(px('caddy').stdout) && px('caddy').status === 0);
  vrai('proxy : seul nginx actif → nginx', /proxy : nginx/.test(px('nginx').stdout));
  v('proxy : nginx ET caddy actifs → REFUS (code 1)', px('nginx caddy').status, 1);
  vrai('proxy : OPCOURRIER_PROXY lève le doute, une valeur inconnue est refusée', /proxy : nginx/.test(px('nginx caddy', 'nginx').stdout) && px('', 'apache').status === 2);
  v('proxy : aucun actif → REFUS (code 1)', px('').status, 1);
  // la vérification « port libre » (section 1 bis) EXÉCUTÉE contre un vrai port occupé
  const blocPort = SH.slice(SH.indexOf('echo "── 1 bis.'), SH.indexOf('echo "── 2.'));
  const occupe = require('net').createServer(); await new Promise((r2) => occupe.listen(0, '127.0.0.1', r2));
  const pOcc = occupe.address().port; const pLibre = await new Promise((r2) => { const t = require('net').createServer(); t.listen(0, '127.0.0.1', () => { const q = t.address().port; t.close(() => r2(q)); }); });
  const essai = (port) => spawnSync('bash', ['-c', 'set -euo pipefail\nINSTANCE=beta; PORT="$1"\n' + blocPort, 'x', String(port)], { encoding: 'utf8', timeout: 10000 });
  vrai('population : la section « port » est trouvée', blocPort.length > 100 && /\/dev\/tcp\/127\.0\.0\.1/.test(blocPort));
  v('un port déjà écouté par un autre service : REFUS (code 1)', essai(pOcc).status, 1);
  v('un port libre : accepté', essai(pLibre).status, 0);
  occupe.close();
  // le contrôle de port, EXÉCUTÉ
  for (const [port, attendu] of [['8080', 2], ['8090', 2], ['8091', 2], ['7880', 2], ['3478', 2], ['443', 2], ['abc', 2]]) {
    const rr = spawnSync('bash', [inst, 'beta', 'courrier-beta.teamop.fr', '--email', 'a@b.fr'], { encoding: 'utf8', env: { PATH: process.env.PATH, OPCOURRIER_PORT: port }, timeout: 10000 });
    v('port ' + port + ' refusé avant toute action', [rr.status, /refusé/.test(rr.stdout)], [attendu, true]);
  }
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
  /* Deux, et c'est DÉCIDÉ : express, et nodemailer (le même paquet, la même version majeure que `server/`) pour envoyer le code à usage unique de la signature maison.
     Une troisième se justifie par écrit ici, avec sa raison — chaque dépendance est une surface d'attaque. */
  v('deux dépendances de production, nommées (express ; nodemailer pour le code de la signature maison)', Object.keys(pk.dependencies).sort(), ['express', 'nodemailer']);
  vrai('…nodemailer est de la même version majeure que celui de server/ (un seul paquet à surveiller)', String(pk.dependencies.nodemailer).replace(/^\D+/, '').split('.')[0] === String(JSON.parse(lire('server/package.json')).dependencies.nodemailer).replace(/^\D+/, '').split('.')[0]);

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
  vrai('LISEZMOI.md existe et nomme les gestes de Justin (DNS, installeur, clé, webhook)', (() => { const t = lire('server-courrier/LISEZMOI.md'); return ['courrier-beta.teamop.fr', 'install-courrier.sh', 'configurer-yousign.js', 'kek', 'webhook/yousign', '217.154.6.139'].every((m) => t.includes(m)); })());

  /* Pris sur le vrai VPS (19 octobre 2026) : `NODE: unbound variable` à la ligne de l'unité systemd — une variable
     employée dans l'installeur qui n'y est jamais affectée. Chaque $MAJUSCULE employée doit être affectée (ou venir de l'environnement nommé). */
  {
    const t = lire('server-courrier/install-courrier.sh').replace(/^\s*#.*$/gm, '');
    const employees = new Set([...t.matchAll(/\$\{?([A-Z][A-Z0-9_]+)/g)].map((m) => m[1]));
    const affectees = new Set([...t.matchAll(/(?:^|[\s;(])(?:local\s+|export\s+|readonly\s+)?([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]).concat([...t.matchAll(/\bfor\s+([A-Z][A-Z0-9_]*)\s+in\b/g)].map((m) => m[1])).concat([...t.matchAll(/\bread\s+(?:-[a-z]+\s+)*([A-Z][A-Z0-9_]+)/g)].map((m) => m[1])));
    const env = ['BASH_SOURCE', 'EUID', 'HOME', 'PATH', 'OPCOURRIER_PROXY', 'OPCOURRIER_RACINE', 'PWD', 'RANDOM', 'UID'];
    const orphelines = [...employees].filter((x) => !affectees.has(x) && !env.includes(x) && !/^[0-9]/.test(x));
    v('⛔ installeur : aucune variable employée sans être affectée (le « NODE: unbound variable » du vrai VPS)', orphelines, []);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
