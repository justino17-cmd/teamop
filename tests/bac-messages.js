/* ══ LE BAC À SABLE DE L'INSTALLATION ET DU DÉPLOIEMENT D'OP MESSAGES ═════════════════════════════
   Partagé par `test-931` (l'installation) et `test-932` (le déployeur). Ce n'est pas une suite : il
   n'imprime rien et n'est pas dans `tests/test-*.js`, donc le compteur ne le lance pas.

   Ce qu'il fait : une racine factice (`OPMSG_RACINE`) où `install-msg.sh` et `deployer.sh` écrivent comme
   sur un VPS, un DÉPÔT d'origine local (un vrai dépôt git, avec un `server-msg/` factice mais le VRAI
   `deployer.sh`), et des FAUX BINAIRES dans le PATH — `systemctl`, `nginx`, `caddy`, `certbot`, `useradd`,
   `id`, `chown`, `runuser`, `apt-get` — qui journalisent chaque appel et simulent juste ce qu'il faut. Le
   faux `systemctl restart` lance VRAIMENT le faux service (un petit serveur HTTP) : c'est ce qui permet
   de jouer le contrôle de /health, et le retour arrière, pour de bon.
   ⚠️ Modèle : `tests/test-729.js` (la clé maître, exécutée dans un bac à sable complet). Rien ici ne peut
   toucher /etc, /opt ni un vrai service : toutes les écritures tombent sous `bac.d`.
   ⚠️ Un banc qui tourne sur le runner GitHub n'est pas root : aucun `chown -o root`, aucun `useradd`
   réel — c'est pourquoi ces deux-là sont simulés et journalisés. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

const RACINE = path.join(__dirname, '..');
const SERVER_MSG = path.join(RACINE, 'server-msg');
const INSTALL = path.join(SERVER_MSG, 'install-msg.sh');
const DEPLOYER = path.join(SERVER_MSG, 'deployer.sh');

/* ── Le faux service : ce que `lancer.sh` démarrerait, réduit à /health ───────────────────── */
const INDEX_FACTICE = `'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
if (fs.existsSync(path.join(__dirname, 'PLANTE'))) process.exit(1);          // une release qui meurt au démarrage
const ment = fs.existsSync(path.join(__dirname, 'MENT'))
  ? fs.readFileSync(path.join(__dirname, 'MENT'), 'utf8').trim() : null;      // une release qui répond le MAUVAIS sha
const sha = ment || process.env.OPMSG_SHA;
http.createServer((q, r) => {
  if (q.url === '/health') { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, instance: process.env.OPMSG_INSTANCE, sha })); return; }
  r.statusCode = 404; r.end();
}).listen(Number(process.env.PORT), '127.0.0.1');
`;

/* ── La pose de clé factice : les quatre comportements du vrai (`server/poser-cle.js`), sans rien d'autre ──
   ⚠️ Elle GÉNÈRE et AFFICHE une clé quand on ne lui en donne pas : c'est le défaut de l'outil de `server/`
   que `install-msg.sh` doit empêcher d'atteindre l'écran. Elle sert donc aussi de piège. */
const POSER_CLE_FACTICE = `'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const inst = process.argv[2], arg = String(process.argv[3] || '').trim();
const DIR = process.env.OPMSG_KEK_DIR, DATA = process.env.OPMSG_DATA, DROP = process.env.OPMSG_DROPIN_DIR;
const KEK = path.join(DIR, inst + '.kek');
fs.appendFileSync(path.join(process.env.BAC_ETAT, 'poser-cle.log'), 'instance=' + inst + ' cle_en_argument=' + (arg ? 'oui' : 'non') + '\\n');
const existante = () => { try { const v = fs.readFileSync(KEK, 'utf8').trim(); return /^[0-9a-f]{64}$/i.test(v) ? v : null; } catch (e) { return null; } };
const dropin = () => { fs.mkdirSync(DROP, { recursive: true }); fs.writeFileSync(path.join(DROP, 'kek.conf'), '[Service]\\nLoadCredential=kek:' + KEK + '\\n'); };
const poser = (h) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(KEK, h, { mode: 0o600 }); };
const bases = fs.existsSync(path.join(DATA, 'msg.db')) ? 1 : 0;
if (existante()) { dropin(); console.log('Une clé est DÉJÀ posée. On n\\'y touche pas.'); process.exit(0); }
if (arg) {
  if (!/^[0-9a-f]{64}$/i.test(arg)) { console.error('Attendu : 64 hexadécimaux'); process.exit(1); }
  poser(arg.toLowerCase()); dropin();
  if (process.env.FACTICE_AFFICHE) console.log('Clé posée : ' + arg);          // un outil négligent
  console.log('Clé du séquestre posée.'); process.exit(0);
}
if (bases) { console.error('INCIDENT : des données existent et la clé est ABSENTE'); process.exit(1); }
const neuve = crypto.randomBytes(32).toString('hex'); poser(neuve); dropin();
console.log('Clé maître générée : ' + neuve);                                 // le piège : l'outil de server/ fait ça
process.exit(0);
`;

/* ── Les faux binaires ─────────────────────────────────────────────────────────────────────── */
const FAUX = {
  systemctl: `#!/usr/bin/env bash
E="$BAC_ETAT"; echo "$(date +%s%N) systemctl $*" >> "$E/appels.log"
cmd="$1"; shift || true
case "$cmd" in
  is-active)
    [ "\${1:-}" = "--quiet" ] && shift
    case "$1" in
      nginx) [ -f "$E/proxy-nginx" ] ;;
      caddy) [ -f "$E/proxy-caddy" ] ;;
      teamop-msg@*) p="$E/pid-\${1#teamop-msg@}"; [ -f "$p" ] && kill -0 "$(cat "$p")" 2>/dev/null ;;
      *) false ;;
    esac ;;
  reload) echo "reload $1" >> "$E/rechargements.log" ;;
  restart|start)
    inst="\${1#teamop-msg@}"; p="$E/pid-$inst"
    [ -f "$p" ] && { kill "$(cat "$p")" 2>/dev/null || true; rm -f "$p"; sleep 0.2; }
    [ -f "$E/refuse-demarrage" ] && exit 1
    port="$(sed -n 's/^PORT=//p' "$BAC_R/etc/opmsg/$inst.env")"
    cd "$BAC_R/opt/opmsg/$inst/current" || exit 1
    sha="$(basename "$(readlink -f "$BAC_R/opt/opmsg/$inst/current")")"
    # ⚠️ Le descripteur 9 (le verrou du déployeur) et les tuyaux du banc ne doivent PAS être hérités : un
    # faux service qui garde le verrou bloquerait tous les déploiements suivants, comme un tuyau ouvert
    # bloquerait le banc qui attend la fin de la sortie.
    PORT="$port" OPMSG_INSTANCE="$inst" OPMSG_SHA="$sha" setsid node index.js </dev/null >"$E/service-$inst.log" 2>&1 9>&- &
    echo $! > "$p" ;;
  stop)
    inst="\${1#teamop-msg@}"; p="$E/pid-$inst"
    [ -f "$p" ] && { kill "$(cat "$p")" 2>/dev/null || true; rm -f "$p"; } ;;
  *) : ;;   # daemon-reload, enable… : journalisés, rien de plus
esac
`,
  nginx: `#!/usr/bin/env bash
E="$BAC_ETAT"
case "$1" in
  -v) echo "nginx version: nginx/$(cat "$E/nginx-version" 2>/dev/null || echo 1.24.0)" >&2 ;;
  -t)
    echo "nginx -t" >> "$E/appels.log"
    [ -f "$E/nginx-refuse" ] && { echo "nginx: [emerg] refus simulé" >&2; exit 1; }
    # Un contrôle réel, même grossier : des accolades déséquilibrées dans un fichier d'OP MESSAGES, et nginx refuse.
    for f in "$BAC_R"/etc/nginx/sites-available/opmsg-*.conf "$BAC_R"/etc/nginx/conf.d/opmsg-*.conf; do
      [ -f "$f" ] || continue
      o=$(tr -cd '{' < "$f" | wc -c); c=$(tr -cd '}' < "$f" | wc -c)
      [ "$o" = "$c" ] || { echo "nginx: [emerg] accolades déséquilibrées" >&2; exit 1; }
    done ;;
esac
`,
  caddy: `#!/usr/bin/env bash
E="$BAC_ETAT"; echo "caddy $*" >> "$E/appels.log"
[ "$1" = "validate" ] && [ -f "$E/caddy-refuse" ] && { echo "caddy: refus simulé" >&2; exit 1; }
exit 0
`,
  certbot: `#!/usr/bin/env bash
E="$BAC_ETAT"; echo "certbot $*" >> "$E/appels.log"
[ -f "$E/certbot-refuse" ] && exit 1
d=""; while [ $# -gt 0 ]; do [ "$1" = "-d" ] && d="$2"; shift; done
mkdir -p "$BAC_R/etc/letsencrypt/live/$d"; echo certificat-factice > "$BAC_R/etc/letsencrypt/live/$d/fullchain.pem"; echo cle-factice > "$BAC_R/etc/letsencrypt/live/$d/privkey.pem"
`,
  useradd: `#!/usr/bin/env bash
echo "useradd $*" >> "$BAC_ETAT/appels.log"; : > "$BAC_ETAT/user-opmsg"
`,
  id: `#!/usr/bin/env bash
if [ "\${1:-}" = "opmsg" ]; then [ -f "$BAC_ETAT/user-opmsg" ]; exit $?; fi
exec /usr/bin/id "$@"
`,
  'apt-get': `#!/usr/bin/env bash
echo "apt-get $*" >> "$BAC_ETAT/appels.log"
`,
  chown: `#!/usr/bin/env bash
echo "chown $*" >> "$BAC_ETAT/appels.log"
`,
  runuser: `#!/usr/bin/env bash
echo "runuser $*" >> "$BAC_ETAT/appels.log"
[ "$1" = "-u" ] && shift 2
[ "$1" = "--" ] && shift
exec "$@"
`
};

function portLibre() {
  const r = spawnSync(process.execPath, ['-e',
    "const s=require('net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"], { encoding: 'utf8' });
  return String(r.stdout).trim();
}

/* Un dépôt d'origine local : un vrai dépôt git. `uploadpack.allowFilter` : l'installation clone SANS blobs
   (`--filter=blob:none`), comme sur GitHub, et le serveur local doit l'accepter pour que ce soit éprouvé. */
function git(dir, ...a) {
  const r = spawnSync('git', ['-C', dir, '-c', 'user.name=banc', '-c', 'user.email=banc@teamop.invalid', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('git ' + a.join(' ') + ' : ' + r.stderr);
  return String(r.stdout).trim();
}

/* ⚠️ Tout ce qui est écrit dans l'environnement du bac est listé ICI : un script qui lirait une autre
   variable de l'environnement réel (un HOME, un PATH de vrai système) ne serait pas isolé. */
function bac(opts = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-bac-'));
  const b = { d, R: path.join(d, 'racine'), E: path.join(d, 'etat'), bin: path.join(d, 'bin'), origine: path.join(d, 'origine') };
  for (const x of [b.R, b.E, b.bin]) fs.mkdirSync(x, { recursive: true });
  for (const [nom, txt] of Object.entries(FAUX)) { fs.writeFileSync(path.join(b.bin, nom), txt, { mode: 0o755 }); }
  b.port = portLibre();

  // Le dépôt d'origine : un server-msg/ factice, mais le VRAI déployeur (c'est lui que l'installation copie).
  fs.mkdirSync(path.join(b.origine, 'server-msg'), { recursive: true });
  git(b.origine, 'init', '-q', '-b', 'main');
  git(b.origine, 'config', 'uploadpack.allowFilter', 'true');
  git(b.origine, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  fs.copyFileSync(DEPLOYER, path.join(b.origine, 'server-msg', 'deployer.sh'));
  fs.writeFileSync(path.join(b.origine, 'server-msg', 'index.js'), INDEX_FACTICE);
  fs.writeFileSync(path.join(b.origine, 'server-msg', 'poser-cle.js'), POSER_CLE_FACTICE);
  fs.writeFileSync(path.join(b.origine, 'server-msg', 'package.json'), JSON.stringify({ name: 'opmsg-factice', version: '1.0.0', private: true }, null, 1));
  fs.writeFileSync(path.join(b.origine, 'server-msg', 'package-lock.json'),
    JSON.stringify({ name: 'opmsg-factice', version: '1.0.0', lockfileVersion: 3, requires: true, packages: { '': { name: 'opmsg-factice', version: '1.0.0' } } }, null, 1));
  git(b.origine, 'add', '-A'); git(b.origine, 'commit', '-q', '-m', 'premier');
  b.sha = () => git(b.origine, 'rev-parse', 'HEAD');

  /* Un commit de plus sur main : `fichiers` = { 'server-msg/x': 'contenu' | null (supprimé) }. */
  b.commit = (fichiers, msg) => {
    for (const [f, t] of Object.entries(fichiers || {})) {
      const p = path.join(b.origine, f);
      if (t === null) { fs.rmSync(p, { force: true }); continue; }
      fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t);
    }
    git(b.origine, 'add', '-A');
    git(b.origine, 'commit', '-q', '--allow-empty', '-m', msg || 'commit ' + Math.random());
    return b.sha();
  };
  /* Une branche à côté de main : son commit n'est PAS sur main. */
  b.hors_main = () => {
    const sur = b.sha();
    git(b.origine, 'checkout', '-q', '-b', 'lateral');
    const s = b.commit({ 'server-msg/lateral.txt': 'x' }, 'sur une branche');
    git(b.origine, 'checkout', '-q', 'main');
    return s;
  };

  b.env = (extra) => Object.assign({}, {
    PATH: b.bin + path.delimiter + process.env.PATH,
    HOME: path.join(b.d, 'home'),
    OPMSG_RACINE: b.R,
    OPMSG_DEPOT: 'file://' + b.origine,
    OPMSG_PORT: b.port,
    OPMSG_ESSAIS_SANTE: '25', OPMSG_PAUSE_SANTE: '0.2',   // 5 s d'attente de /health au lieu de 40 : un échec simulé ne coûte pas une demi-minute
    OPMSG_PROXY: 'nginx',
    BAC_ETAT: b.E,
    BAC_R: b.R,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null'
  }, extra || {});
  fs.mkdirSync(path.join(b.d, 'home'), { recursive: true });

  /* Un proxy « déjà là » avec un bloc d'api.teamop.fr qui ne doit JAMAIS bouger. */
  b.apiNginx = path.join(b.R, 'etc', 'nginx', 'sites-available', 'api.teamop.fr');
  b.apiTexte = 'server {\n    server_name api.teamop.fr;\n    location / { proxy_pass http://127.0.0.1:8080; }\n}\n';
  b.caddyfile = path.join(b.R, 'etc', 'caddy', 'Caddyfile');
  b.caddyTexte = 'api.teamop.fr {\n    reverse_proxy 127.0.0.1:8080\n}\n';
  b.proxy = (qui) => {
    fs.rmSync(path.join(b.E, 'proxy-nginx'), { force: true }); fs.rmSync(path.join(b.E, 'proxy-caddy'), { force: true });
    if (qui === 'nginx') {
      fs.mkdirSync(path.dirname(b.apiNginx), { recursive: true });
      fs.mkdirSync(path.join(b.R, 'etc', 'nginx', 'sites-enabled'), { recursive: true });
      fs.writeFileSync(b.apiNginx, b.apiTexte);
      fs.symlinkSync(b.apiNginx, path.join(b.R, 'etc', 'nginx', 'sites-enabled', 'api.teamop.fr'));
      fs.writeFileSync(path.join(b.E, 'proxy-nginx'), '');
    } else if (qui === 'caddy') {
      fs.mkdirSync(path.dirname(b.caddyfile), { recursive: true });
      fs.writeFileSync(b.caddyfile, b.caddyTexte);
      fs.writeFileSync(path.join(b.E, 'proxy-caddy'), '');
    }
  };
  b.drapeau = (nom, v) => { if (v === false) fs.rmSync(path.join(b.E, nom), { force: true }); else fs.writeFileSync(path.join(b.E, nom), String(v === undefined ? '' : v)); };

  /* L'installation. `entree` = ce que Justin tape (clé maître deux fois, clé publique…) — par l'ENTRÉE STANDARD. */
  b.installer = (instance, entree, env) => {
    const r = spawnSync('bash', [INSTALL, instance], { input: entree === undefined ? '' : entree, encoding: 'utf8', env: b.env(env), timeout: 90000 });
    return { rc: r.status, sortie: String(r.stdout || '') + String(r.stderr || ''), brut: r };
  };
  b.deployer = (instance, sha, extra, env) => {
    const r = spawnSync('bash', [path.join(b.R, 'opt', 'opmsg', 'deployer.sh'), instance, sha].concat(extra || []), { encoding: 'utf8', env: b.env(env), timeout: 120000 });
    return { rc: r.status, sortie: String(r.stdout || '') + String(r.stderr || '') };
  };
  /* Comme la CI : la commande arrive dans SSH_ORIGINAL_COMMAND, jamais en argument. */
  b.deployerSsh = (commande, env) => {
    const r = spawnSync('bash', [path.join(b.R, 'opt', 'opmsg', 'deployer.sh')], { encoding: 'utf8', timeout: 120000,
      env: b.env(Object.assign({ SSH_ORIGINAL_COMMAND: commande }, env || {})) });
    return { rc: r.status, sortie: String(r.stdout || '') + String(r.stderr || '') };
  };

  /* Ce que le faux service répond sur /health, lu de l'extérieur (curl réel). */
  b.sante = (instance) => {
    const r = spawnSync('curl', ['-sf', '--max-time', '3', 'http://127.0.0.1:' + b.port + '/health'], { encoding: 'utf8' });
    try { return JSON.parse(r.stdout); } catch (e) { return null; }
  };
  b.lire = (rel) => { try { return fs.readFileSync(path.join(b.R, rel), 'utf8'); } catch (e) { return null; } };
  b.existe = (rel) => fs.existsSync(path.join(b.R, rel));
  b.journal = (nom) => { try { return fs.readFileSync(path.join(b.E, nom || 'appels.log'), 'utf8'); } catch (e) { return ''; } };
  b.lien = (instance) => { try { return path.basename(fs.realpathSync(path.join(b.R, 'opt', 'opmsg', instance, 'current'))); } catch (e) { return null; } };

  /* L'état d'une racine : chemin → empreinte du contenu (ou cible du lien), pour comparer deux passages. */
  b.etat = (exclure) => {
    const out = {};
    const crypto = require('crypto');
    (function parcourir(dir) {
      for (const n of fs.readdirSync(dir).sort()) {
        const p = path.join(dir, n), rel = path.relative(b.R, p);
        if (exclure && exclure.test(rel)) continue;
        const st = fs.lstatSync(p);
        if (st.isSymbolicLink()) out[rel] = '→ ' + fs.readlinkSync(p);
        else if (st.isDirectory()) { out[rel + '/'] = (st.mode & 0o777).toString(8); parcourir(p); }
        else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) + ' ' + (st.mode & 0o777).toString(8);
      }
    })(b.R);
    return out;
  };

  b.fin = () => {
    for (const f of fs.existsSync(b.E) ? fs.readdirSync(b.E) : []) {
      if (!/^pid-/.test(f)) continue;
      try { process.kill(Number(fs.readFileSync(path.join(b.E, f), 'utf8')), 'SIGKILL'); } catch (e) {}
    }
    try { fs.rmSync(b.d, { recursive: true, force: true }); } catch (e) {}
  };
  return b;
}

/* Un lot de contrôles au format du dépôt (`N ✓  M ✗`). */
function banc() {
  const t = { ok: 0, ko: 0 };
  t.v = (txt, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { t.ok++; console.log('  ✓ ' + txt); } else { t.ko++; console.log('  ✗ ' + txt + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
  t.vrai = (txt, a) => t.v(txt, !!a, true);
  t.fin = () => { console.log('\n' + t.ok + ' ✓  ' + t.ko + ' ✗'); process.exitCode = t.ko ? 1 : 0; };
  return t;
}

/* Lecture d'un script SANS ses commentaires (`#` en début de ligne ou après du blanc, hors chaînes simples) :
   un motif de banc vise du CODE, jamais la phrase qui l'explique juste au-dessus. */
function sansCommentaires(src) {
  return src.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
}
function sansCommentairesJs(src) {
  return src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

module.exports = { bac, banc, sansCommentaires, sansCommentairesJs, RACINE, SERVER_MSG, INSTALL, DEPLOYER, INDEX_FACTICE, POSER_CLE_FACTICE };
