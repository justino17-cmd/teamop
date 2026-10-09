/* Le bac à sable de `server-msg/install-sfu.sh` (le serveur de visio) : une racine factice (`OPMSG_RACINE`), un PATH réduit à quelques outils réels, et de FAUX binaires qui
   NOTENT chaque appel (arguments ET environnement) et simulent juste ce qu'il faut — `systemctl` (qui rejoue les `ExecStartPre=+` de l'unité, donc le VRAI pare-feu de la visio
   contre un faux noyau), `nginx`, `ufw`, `curl` (qui sert une archive FACTICE de LiveKit), `useradd`, `id`, `uname`, `ip`, `apt-get`, `chown`, `sleep`. Un petit serveur HTTP joue
   le `/health` de l'instance : il dit « je vois la visio » d'après la configuration que l'instance a LUE à son dernier redémarrage (celui du faux `systemctl`), pas d'après le disque.
   Le contrôle (`outils/verifier-visio.js`) est remplacé par un faux qui note ses arguments — le vrai est joué contre un VRAI LiveKit par `test-953`.
   Même méthode que `bac-turn.js`, dont il reprend le faux noyau (iptables). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const { RACINE } = require('./bac-messages.js');
const { reel, PROLOGUE, IPTABLES_FAUX } = require('./bac-turn.js');
const SCRIPT = path.join(RACINE, 'server-msg', 'install-sfu.sh');
const lire = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };

const OUTILS_REELS = ['bash', 'sh', 'sed', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'ln', 'cat', 'cmp', 'dirname', 'tr', 'cut', 'head', 'grep', 'awk', 'tar', 'gzip', 'sha256sum', 'mktemp', 'seq'];
const FAUX = {
  systemctl: PROLOGUE + `cmd="$1"; shift || true
[ "\${1:-}" = "--quiet" ] && shift
unite="\${1:-}"
case "$cmd" in
  is-active)
    case "$unite" in
      nginx) [ -f "$E/nginx-actif" ] ;;
      opmsg-visio-*) [ -f "$E/actif-$unite" ] ;;
      teamop-msg@*) [ -f "$E/unite-actif" ] ;;
      *) false ;;
    esac ;;
  restart|start)
    case "$unite" in
      opmsg-visio-*)
        U="$BAC_R/etc/systemd/system/$unite.service"
        [ -f "$U" ] || { rm -f "$E/actif-$unite"; exit 1; }
        if [ -f "$E/visio-refuse" ]; then rm -f "$E/actif-$unite"; exit 1; fi
        # systemd REJOUE les ExecStartPre=+ de l'unité (le VRAI pare-feu de la visio, contre le faux noyau) : une commande qui échoue = l'unité ne démarre pas
        while IFS= read -r l; do case "$l" in Environment=*) export "\${l#Environment=}" ;; esac; done < "$U"
        while IFS= read -r l; do
          case "$l" in ExecStartPre=+*) c="\${l#ExecStartPre=+}"; c="$BAC_R\${c}"; echo "ExecStartPre \${l#ExecStartPre=+}" >> "$E/appels.log"; bash $c || { rm -f "$E/actif-$unite"; exit 1; } ;; esac
        done < "$U"
        : > "$E/actif-$unite" ;;
      teamop-msg@*) i="\${unite#teamop-msg@}"; : > "$E/unite-actif"; cp "$BAC_R/etc/opmsg/$i.json" "$E/config-lue-$i.json" ;;
    esac ;;
  stop)
    case "$unite" in
      opmsg-visio-*)
        rm -f "$E/actif-$unite"
        U="$BAC_R/etc/systemd/system/$unite.service"
        if [ -f "$U" ]; then
          while IFS= read -r l; do case "$l" in Environment=*) export "\${l#Environment=}" ;; esac; done < "$U"
          while IFS= read -r l; do case "$l" in ExecStopPost=+*) c="\${l#ExecStopPost=+}"; c="$BAC_R\${c}"; echo "ExecStopPost \${l#ExecStopPost=+}" >> "$E/appels.log"; bash $c || true ;; esac; done < "$U"
        fi ;;
    esac ;;
  *) : ;;
esac
`,
  nginx: PROLOGUE + `if [ "$1" = "-t" ]; then [ -f "$E/nginx-refuse" ] && { echo "nginx: [emerg] refus simulé" >&2; exit 1; }; fi
exit 0
`,
  ufw: PROLOGUE + `if [ "$1" = "status" ]; then if [ -f "$E/ufw-actif" ]; then echo "Status: active"; else echo "Status: inactive"; fi; fi
exit 0
`,
  /* une archive de LiveKit FACTICE (construite par le bac), servie à l'adresse demandée — et notée ; « curl-refuse » : un réseau qui ne joint pas GitHub */
  curl: PROLOGUE + `[ -f "$E/curl-refuse" ] && exit 22
o=""; while [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then o="$2"; shift; fi; shift; done
[ -n "$o" ] || exit 2
cp "$E/archive.tar.gz" "$o"
`,
  useradd: PROLOGUE + `n=""; for a in "$@"; do n="$a"; done; : > "$E/compte-$n"
`,
  'apt-get': PROLOGUE,
  chown: PROLOGUE,
  sleep: PROLOGUE,
  uname: PROLOGUE + `if [ -f "$E/arch" ]; then cat "$E/arch"; else echo x86_64; fi
`,
  /* la table de routage : la source de la route par défaut est l'adresse PUBLIQUE du bac (203.0.113.7, un réseau de documentation), sauf « ip-privee » */
  ip: PROLOGUE + `if [ -f "$E/ip-privee" ]; then echo "192.0.2.1 via 10.0.0.1 dev eth0 src 10.1.2.3 uid 0"; else echo "192.0.2.1 via 203.0.113.1 dev eth0 src 203.0.113.7 uid 0"; fi
`,
};
/* `id -u <compte de la visio>` : il existe si le faux useradd l'a créé (ou si le bac le dit déjà là) ; le reste va au vrai `id` */
const ID_FAUX = (reelId) => `#!/bin/bash
E="$BAC_ETAT"
if [ "$1" = "-u" ] && [ -n "\${2:-}" ]; then case "$2" in opmsg-visio-*) [ -f "$E/compte-$2" ] && { echo 997; exit 0; }; exit 1 ;; esac; fi
exec "${reelId}" "$@"
`;
/* le contrôle FACTICE : il note ses arguments, et échoue à l'étape qu'on lui demande */
const VERIFIEUR_FAUX = `'use strict';
const fs = require('fs'), E = process.env.BAC_ETAT;
const args = process.argv.slice(2), etape = args[1] === '--public' ? 'public' : args[1] === '--avis' ? 'avis' : 'local';
fs.appendFileSync(E + '/appels.log', 'verifier-visio ' + args.join(' ') + ' config=' + (process.env.OPMSG_CONFIG ? 'oui' : 'non') + '\\n');
if (fs.existsSync(E + '/verifier-refuse-' + etape)) { console.log('  ✗ (' + etape + ') ce que le contrôle refuse'); console.log('\\n⛔ 1 contrôle(s) en échec.'); process.exit(1); }
console.log('  ✓ (' + etape + ') ce que le contrôle vérifie'); console.log('\\n✓ Le serveur de visio fait ce qu\\'il doit.'); process.exit(0);
`;
/* Le bloc HTTPS de l'instance, tel qu'install-msg.sh le pose (réduit à ce que le script lit : l'ancre de la clé TLS, et ce qui l'entoure) */
const BLOC_NGINX = (dom, port) => `server {
    listen 80;
    server_name ${dom};
    access_log off;
    location / { return 301 https://${dom}$request_uri; }
}
server {
    listen 443 ssl;
    server_name ${dom};
    ssl_certificate     /etc/letsencrypt/live/${dom}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${dom}/privkey.pem;
    access_log off;
    client_max_body_size 64k;
    location / {
        proxy_pass http://127.0.0.1:${port};
    }
}
`;

function bac(opts = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-visio-'));
  const b = { d, R: path.join(d, 'racine'), E: path.join(d, 'etat'), bin: path.join(d, 'bin'), serveurs: [] };
  for (const x of [b.R, b.E, b.bin]) fs.mkdirSync(x, { recursive: true });
  for (const o of OUTILS_REELS) { const p = reel(o); if (p) fs.symlinkSync(p, path.join(b.bin, o)); }
  fs.writeFileSync(path.join(b.bin, 'id'), ID_FAUX(reel('id') || '/usr/bin/id'), { mode: 0o755 });
  fs.writeFileSync(path.join(b.bin, 'iptables'), IPTABLES_FAUX, { mode: 0o755 });
  fs.writeFileSync(path.join(b.bin, 'ip6tables'), IPTABLES_FAUX, { mode: 0o755 });
  fs.symlinkSync(process.execPath, path.join(b.bin, 'node'));
  for (const [nom, txt] of Object.entries(FAUX)) fs.writeFileSync(path.join(b.bin, nom), txt, { mode: 0o755 });
  if (opts.nginx !== false) fs.writeFileSync(path.join(b.E, 'nginx-actif'), '');
  if (opts.ufw !== false) fs.writeFileSync(path.join(b.E, 'ufw-actif'), '');
  fs.mkdirSync(path.join(b.R, 'etc', 'opmsg'), { recursive: true });
  fs.mkdirSync(path.join(b.R, 'etc', 'nginx', 'sites-available'), { recursive: true });
  fs.writeFileSync(path.join(b.E, 'appels.log'), ''); fs.writeFileSync(path.join(b.E, 'env.log'), '');
  /* l'archive FACTICE de LiveKit : un `livekit-server` qui dit sa version — son empreinte est passée au script par la porte des bancs (OPMSG_VISIO_EMPREINTE_BANC) */
  {
    const a = path.join(b.d, 'archive'); fs.mkdirSync(a);
    fs.writeFileSync(path.join(a, 'livekit-server'), '#!/bin/bash\n[ "$1" = "--version" ] && { echo "livekit-server version ' + (opts.version || '1.13.7') + '"; exit 0; }\nexit 0\n', { mode: 0o755 });
    fs.writeFileSync(path.join(a, 'LICENSE'), 'Apache 2.0 (factice)\n');
    const r = spawnSync(reel('tar'), ['-czf', path.join(b.E, 'archive.tar.gz'), '-C', a, 'livekit-server', 'LICENSE']);
    if (r.status !== 0) throw new Error('le bac ne sait pas faire son archive');
    b.empreinte = crypto.createHash('sha256').update(fs.readFileSync(path.join(b.E, 'archive.tar.gz'))).digest('hex');
  }
  b.ports = {};
  /* ⛔ LE PORT D'UNE INSTANCE, et tout ce qui le cite (sa configuration, sa copie « lue », son .env, son bloc nginx) : tiré SOUS la plage des ports éphémères (voir
     bac-turn.js), et RE-TIRÉ par `b.serveur` si quelqu'un l'occupe déjà. Le 9 octobre 2026, le déploiement de la bêta est tombé sur test-959 : 25525 était pris
     sur la machine de GitHub, `listen` a jeté EADDRINUSE et le banc est mort avant son total — sans rien dire du script qu'il éprouve. */
  const poserPort = (nom) => {
    b.ports[nom] = 20000 + crypto.randomInt(0, 10000);
    const dom = 'msg-' + nom + '.teamop.fr', f = path.join(b.R, 'etc', 'opmsg', nom + '.json');
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8')); cfg.port = b.ports[nom];
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    fs.writeFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.env'), 'PORT=' + b.ports[nom] + '\n');
    fs.writeFileSync(path.join(b.R, 'etc', 'nginx', 'sites-available', 'opmsg-' + nom + '.conf'), BLOC_NGINX(dom, b.ports[nom]));
    fs.copyFileSync(f, path.join(b.E, 'config-lue-' + nom + '.json'));
  };
  b.reposerPort = poserPort;
  /* installe une instance : sa configuration (celle qu'install-msg.sh écrit), son port, son bloc nginx, la version du service qui connaît la visio, et un service qui tourne */
  b.instance = (nom, extra) => {
    const dom = 'msg-' + nom + '.teamop.fr';
    const cfg = Object.assign({ instance: nom, domaine: dom, origine: 'https://' + dom, port: 0, contactEmail: 'contact@teamop.fr', vapidPublicKey: 'BANC-PUBLIQUE', vapidPrivateKey: 'BANC-PRIVEE' }, extra || {});
    const f = path.join(b.R, 'etc', 'opmsg', nom + '.json');
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    poserPort(nom);
    if (opts.unite !== false) fs.writeFileSync(path.join(b.E, 'unite-actif'), '');
    if (opts.version_service !== 'ancienne') {
      const o = path.join(b.R, 'opt', 'opmsg', nom, 'current', 'outils');
      fs.mkdirSync(o, { recursive: true }); fs.writeFileSync(path.join(o, 'verifier-visio.js'), VERIFIEUR_FAUX);
      fs.copyFileSync(path.join(RACINE, 'server-msg', 'visio-pare-feu.sh'), path.join(o, '..', 'visio-pare-feu.sh'));
    }
    return f;
  };
  b.noyau = (fam) => ({ chaines: (lire(path.join(b.E, 'ipt-' + fam + '.chaines')) || '').split('\n').filter(Boolean), regles: (lire(path.join(b.E, 'ipt-' + fam + '.regles')) || '').split('\n').filter(Boolean) });
  b.config = (nom) => { try { return JSON.parse(fs.readFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.json'), 'utf8')); } catch (e) { return null; } };
  b.octets = (rel) => lire(path.join(b.R, rel));
  b.existe = (rel) => fs.existsSync(path.join(b.R, rel));
  b.journal = () => lire(path.join(b.E, 'appels.log')).split('\n').filter(Boolean);
  b.env = () => lire(path.join(b.E, 'env.log'));
  b.drapeau = (n, on = true) => { const p = path.join(b.E, n); if (on) fs.writeFileSync(p, ''); else fs.rmSync(p, { force: true }); };
  b.ecrireEtat = (n, txt) => fs.writeFileSync(path.join(b.E, n), txt);
  /* le /health de l'instance : « je vois la visio » d'après la configuration LUE au dernier redémarrage (« health-visio-ko » : configurée mais sa sonde ne répond pas) */
  b.serveur = (nom) => new Promise((ok) => {
    const s = http.createServer((q, r) => {
      if (q.url !== '/health') { r.statusCode = 404; r.end(); return; }
      let cfg = {}; try { cfg = JSON.parse(lire(path.join(b.E, 'config-lue-' + nom + '.json'))); } catch (e) { /* pas encore */ }
      const configuree = !!(cfg.appels && cfg.appels.visio);
      const visio = configuree ? { configuree: true, ok: !fs.existsSync(path.join(b.E, 'health-visio-ko')), ageS: 1, echecs: 0, avisRecus: 0, avisRefuses: 0, retraitsForces: 0, commandesEchouees: 0 } : { configuree: false };
      r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, instance: nom, visio }));
    });
    let essais = 0;
    s.on('error', (e) => { if (e && e.code === 'EADDRINUSE' && ++essais < 20) { poserPort(nom); s.listen(b.ports[nom], '127.0.0.1'); } else throw e; });
    s.listen(b.ports[nom], '127.0.0.1', () => { b.serveurs.push(s); b.portsRetires = (b.portsRetires || 0) + essais; ok(); });
  });
  /* joue le script : → { status, out, err } */
  b.lancer = (args, env) => new Promise((ok) => {
    const e = Object.assign({ PATH: b.bin, LC_ALL: 'C.UTF-8', HOME: b.d, TMPDIR: b.d, BAC_ETAT: b.E, BAC_R: b.R, BAC_BIN: b.bin, OPMSG_RACINE: b.R, OPMSG_VISIO_EMPREINTE_BANC: b.empreinte }, env || {});
    const p = spawn(reel('bash'), [SCRIPT].concat(args), { env: e, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (x) => { out += x; }); p.stderr.on('data', (x) => { err += x; });
    const garde = setTimeout(() => { try { p.kill('SIGKILL'); } catch (x) { /* fini */ } }, 90000);
    p.on('close', (status) => { clearTimeout(garde); ok({ status, out, err }); });
  });
  /* l'état du disque, fichier par fichier (empreinte + droits) : deux installations de suite doivent laisser le MÊME */
  b.etat = () => {
    const out = {};
    (function parcourir(dir) {
      for (const n of fs.readdirSync(dir).sort()) {
        const p = path.join(dir, n), rel = path.relative(b.R, p), st = fs.lstatSync(p);
        if (st.isDirectory()) { out[rel + '/'] = (st.mode & 0o777).toString(8); parcourir(p); }
        else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) + ' ' + (st.mode & 0o777).toString(8);
      }
    })(b.R);
    return out;
  };
  b.fin = () => { for (const s of b.serveurs) { try { s.close(); } catch (e) { /* fermé */ } } try { fs.rmSync(b.d, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } };
  return b;
}

const RE_SECRET = /^[A-Za-z0-9_-]{32,128}$/;
const visioDe = (b, nom) => { const c = b.config(nom); return c && c.appels && c.appels.visio ? c.appels.visio : null; };
const index = (journal, re) => journal.findIndex(l => re.test(l));
const compte = (journal, re) => journal.filter(l => re.test(l)).length;
const modeDe = (b, rel) => { try { return (fs.statSync(path.join(b.R, rel)).mode & 0o777).toString(8); } catch (e) { return null; } };

module.exports = { bac, SCRIPT, RE_SECRET, visioDe, index, compte, modeDe, lire };
