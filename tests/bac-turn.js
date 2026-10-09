/* ══ LE BAC À SABLE DE `install-turn.sh` — PARTAGÉ PAR `test-982` (le script joué), `sonde-opmessages-relais.js` (sa configuration contre un VRAI coturn) ET `mutations-appels.js` ═════════
   Ce n'est pas une suite : il n'imprime rien et n'est pas dans `tests/test-*.js`, donc le compteur ne le lance pas.

   Une racine factice (`OPMSG_RACINE`), un PATH réduit à quelques outils RÉELS (aucun `turnserver`, `nginx`, `ufw`, `certbot` de la machine : ce bac est le même ici et sur le runner de
   la CI) et de FAUX binaires — `apt-get`, `systemctl`, `certbot`, `nginx`, `ufw`, `chown`, `sleep` — qui NOTENT chaque appel (arguments ET environnement) dans l'état du bac. Un petit
   serveur HTTP joue le `/health` de l'instance : il répond « j'ai un relais » d'après la configuration que l'instance a LUE à son dernier « redémarrage » (celui du faux `systemctl`).
   Un contrôle SIMULÉ remplace `outils/verifier-relais.js` (son verdict se pose par un drapeau) : le VRAI contrôle, lui, est éprouvé par la sonde contre un vrai coturn. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');
const { RACINE } = require('./bac-messages.js');
const SCRIPT = path.join(RACINE, 'server-msg', 'install-turn.sh');
const lire = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };

/* ── les options que coturn 4.6.1 connaît : les noms de son fichier d'exemple livré avec le paquet (+ denied-peer-ip / allowed-peer-ip, documentés dans les exemples) ── */
const OPTIONS_COTURN = new Set(('acme-redirect allocation-default-address-family allow-loopback-peers allowed-peer-ip alt-listening-port alt-tls-listening-port alternate-server aux-server bps-capacity cert channel-lifetime '
  + 'check-origin-consistency cipher-list cli-ip cli-max-output-sessions cli-password cli-port denied-peer-ip dh-file dh1066 dh566 ec-curve-name external-ip fingerprint keep-address-family listening-device '
  + 'listening-ip listening-port log-binding log-file lt-cred-mech max-allocate-lifetime max-allocate-timeout max-bps max-port min-port mobility mongo-userdb mysql-userdb new-log-timestamp no-auth no-cli no-dtls '
  + 'no-multicast-peers no-rfc5780 no-software-attribute no-stdout-log no-stun no-stun-backward-compatibility no-tcp no-tcp-relay no-tls no-tlsv1 no-tlsv1_1 no-tlsv1_2 no-udp no-udp-relay oauth permission-lifetime '
  + 'pidfile pkey pkey-pwd proc-group proc-user prometheus psql-userdb realm redis-statsdb redis-userdb relay-device relay-ip relay-threads response-origin-only-with-rfc5780 secret-key-file secure-stun server-name '
  + 'server-relay simple-log stale-nonce static-auth-secret stun-only syslog syslog-facility tcp-proxy-port tls-alternate-server tls-listening-port total-quota udp-self-balance use-auth-secret user user-quota '
  + 'userdb verbose web-admin web-admin-ip web-admin-listen-on-workers web-admin-port').split(' '));

/* ── des adresses en BigInt (IPv4 sur 32 bits, IPv6 sur 128) : le banc calcule la couverture lui-même ── */
function enBigInt(s) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return { v6: false, n: s.split('.').reduce((a, o) => (a << 8n) + BigInt(o), 0n) };
  let tete = s, queue = '';
  if (s.includes('::')) [tete, queue] = s.split('::');
  const gs = (x) => x === '' ? [] : x.split(':');
  const a = gs(tete), b = gs(queue), mid = new Array(8 - a.length - b.length).fill('0');
  return { v6: true, n: [...a, ...mid, ...b].reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g, 16)), 0n) };
}
const cidr = (c) => {
  const [ip, bits] = c.split('/'), a = enBigInt(ip), tot = a.v6 ? 128n : 32n, h = tot - BigInt(bits);
  const debut = (a.n >> h) << h;
  return { v6: a.v6, debut, fin: debut + (1n << h) - 1n };
};
const A_REFUSER = ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.168.0.0/16', '::1/128', 'fc00::/7', 'fe80::/10', '::ffff:0:0/96', '64:ff9b::/96'];

/* ── le bac à sable ── */
const OUTILS_REELS = ['bash', 'sh', 'sed', 'cp', 'mv', 'rm', 'mkdir', 'chmod', 'ln', 'cat', 'cmp', 'dirname', 'tr', 'cut', 'head', 'grep'];
function reel(nom) { for (const d of (process.env.PATH || '').split(':')) { const p = path.join(d, nom); try { if (fs.statSync(p).isFile()) return p; } catch (e) { /* suivant */ } } return null; }
const PROLOGUE = '#!/bin/bash\nE="$BAC_ETAT"; echo "${0##*/} $*" >> "$E/appels.log"; export -p >> "$E/env.log"\n';
const FAUX = {
  systemctl: PROLOGUE + `cmd="$1"; shift || true
case "$cmd" in
  is-active)
    [ "\${1:-}" = "--quiet" ] && shift
    case "$1" in
      nginx) [ -f "$E/nginx-actif" ] ;;
      coturn) [ -f "$E/coturn-actif" ] ;;
      teamop-msg@*) [ -f "$E/unite-actif" ] ;;
      *) false ;;
    esac ;;
  restart|start)
    case "$1" in
      coturn) if [ -f "$E/coturn-refuse" ]; then rm -f "$E/coturn-actif"; exit 1; fi
              # systemd REJOUE les ExecStartPre= du drop-in de coturn (le vrai script de pare-feu, contre le faux noyau) : une commande qui échoue = l'unité ne démarre pas
              DI="$BAC_R/etc/systemd/system/coturn.service.d/opmsg.conf"
              if [ -f "$DI" ]; then
                while IFS= read -r l; do case "$l" in Environment=*) export "\${l#Environment=}" ;; esac; done < "$DI"
                while IFS= read -r l; do
                  case "$l" in ExecStartPre=+*) c="\${l#ExecStartPre=+}"; c="$BAC_R\${c}"; echo "ExecStartPre \${l#ExecStartPre=+}" >> "$E/appels.log"; bash $c || { rm -f "$E/coturn-actif"; exit 1; } ;; esac
                done < "$DI"
              fi
              : > "$E/coturn-actif" ;;
      teamop-msg@*) i="\${1#teamop-msg@}"; if [ -f "$E/unite-refuse" ] && [ ! -f "$E/unite-refuse-une-fois-passe" ]; then : > "$E/unite-refuse-une-fois-passe"; rm -f "$E/unite-actif"; exit 1; fi
                    : > "$E/unite-actif"; cp "$BAC_R/etc/opmsg/$i.json" "$E/config-lue-$i.json" ;;
    esac ;;
  stop) case "$1" in coturn)
          rm -f "$E/coturn-actif"
          DI="$BAC_R/etc/systemd/system/coturn.service.d/opmsg.conf"
          if [ -f "$DI" ]; then
            while IFS= read -r l; do case "$l" in Environment=*) export "\${l#Environment=}" ;; esac; done < "$DI"
            while IFS= read -r l; do case "$l" in ExecStopPost=+*) c="\${l#ExecStopPost=+}"; c="$BAC_R\${c}"; echo "ExecStopPost \${l#ExecStopPost=+}" >> "$E/appels.log"; bash $c || true ;; esac; done < "$DI"
          fi ;; esac ;;
  *) : ;;
esac
`,
  'apt-get': PROLOGUE + `case "$*" in
  *coturn*) [ -f "$E/apt-refuse" ] || { printf '#!/bin/bash\\nexit 0\\n' > "$BAC_BIN/turnserver"; chmod 755 "$BAC_BIN/turnserver"; } ;;
  *certbot*) [ -f "$E/apt-refuse-certbot" ] || { cp "$BAC_BIN/.certbot-faux" "$BAC_BIN/certbot"; chmod 755 "$BAC_BIN/certbot"; } ;;
  *iptables*) [ -f "$E/apt-refuse-iptables" ] || { cp "$BAC_BIN/.iptables-faux" "$BAC_BIN/iptables"; cp "$BAC_BIN/.iptables-faux" "$BAC_BIN/ip6tables"; chmod 755 "$BAC_BIN/iptables" "$BAC_BIN/ip6tables"; } ;;
esac
`,
  nginx: PROLOGUE + `if [ "$1" = "-t" ]; then [ -f "$E/nginx-refuse" ] && { echo "nginx: [emerg] refus simulé" >&2; exit 1; }; fi
exit 0
`,
  ufw: PROLOGUE + `if [ "$1" = "status" ]; then if [ -f "$E/ufw-actif" ]; then echo "Status: active"; else echo "Status: inactive"; fi; fi
exit 0
`,
  chown: PROLOGUE,
  sleep: PROLOGUE,
};
/* Un faux iptables : des chaînes et des règles rangées dans l'état du bac, une famille (IPv4/IPv6) par nom d'appel. Il sait -N -F -X -A -I -C -D -S, comme le script de pare-feu s'en sert.
   Drapeaux du bac : `iptables-absent-v6` (le noyau n'a pas d'IPv6 : toute commande échoue), `iptables-refuse-v4` / `-v6` (une règle ne se pose pas), `iptables-oublie-v4` / `-v6` (les règles se posent mais `-C` ne les relit jamais). Chaque appel est noté. */
const IPTABLES_FAUX = PROLOGUE + `fam=v4; [ "\${0##*/}" = "ip6tables" ] && fam=v6
[ -f "$E/iptables-absent-$fam" ] && { echo "faux $fam : indisponible" >&2; exit 3; }
CH="$E/ipt-$fam.chaines"; RG="$E/ipt-$fam.regles"; : >> "$CH"; : >> "$RG"
op="$1"; shift
existe() { case "$1" in OUTPUT|INPUT|FORWARD) return 0 ;; esac; grep -qxF "$1" "$CH"; }
retirer_lignes() { local pre="$1" garde=() l; while IFS= read -r l; do case "$l" in "$pre"*) ;; *) garde+=("$l") ;; esac; done < "$RG"; printf '%s\\n' "\${garde[@]}" | sed '/^$/d' > "$RG.n"; mv "$RG.n" "$RG"; }
case "$op" in
  -N) existe "$1" && { echo "Chain already exists" >&2; exit 1; }; echo "$1" >> "$CH" ;;
  -F) existe "$1" || { echo "No chain" >&2; exit 1; }; retirer_lignes "$1|" ;;
  -X) existe "$1" || exit 1; grep -q "^$1|" "$RG" && exit 1; l2=(); while IFS= read -r l; do [ "$l" = "$1" ] || l2+=("$l"); done < "$CH"; printf '%s\\n' "\${l2[@]}" | sed '/^$/d' > "$CH" ;;
  -A) c="$1"; shift; existe "$c" || exit 1; [ -f "$E/iptables-refuse-$fam" ] && { echo "refus simulé" >&2; exit 1; }; echo "$c|$*" >> "$RG" ;;
  -I) c="$1"; shift; shift; existe "$c" || exit 1; [ -f "$E/iptables-refuse-$fam" ] && { echo "refus simulé" >&2; exit 1; }; { echo "$c|$*"; cat "$RG"; } > "$RG.n"; mv "$RG.n" "$RG" ;;
  -C) c="$1"; shift; [ -f "$E/iptables-oublie-$fam" ] && exit 1; grep -qxF "$c|$*" "$RG" ;;
  -D) c="$1"; shift; grep -qxF "$c|$*" "$RG" || exit 1; trouve=""; l3=(); while IFS= read -r l; do if [ -z "$trouve" ] && [ "$l" = "$c|$*" ]; then trouve=1; else l3+=("$l"); fi; done < "$RG"; printf '%s\\n' "\${l3[@]}" | sed '/^$/d' > "$RG" ;;
  -S) c="\${1:-}"; [ -z "$c" ] || existe "$c" || exit 1
      case "$c" in OUTPUT|INPUT|FORWARD) echo "-P $c ACCEPT" ;; "") ;; *) echo "-N $c" ;; esac
      while IFS= read -r l; do [ -z "$c" ] || [ "\${l%%|*}" = "$c" ] && echo "-A \${l%%|*} \${l#*|}"; done < "$RG"; : ;;
  *) : ;;
esac
`;
const ID_FAUX = (reelId) => `#!/bin/bash
[ "$1" = "-u" ] && [ "\${2:-}" = "turnserver" ] && { echo 998; exit 0; }
exec "${reelId}" "$@"
`;
const CERTBOT_FAUX = PROLOGUE + `[ -f "$E/certbot-refuse" ] && exit 1
d=""; while [ $# -gt 0 ]; do if [ "$1" = "-d" ]; then d="$2"; fi; shift; done
mkdir -p "$BAC_R/etc/letsencrypt/live/$d"; echo CERT-FACTICE > "$BAC_R/etc/letsencrypt/live/$d/fullchain.pem"; echo CLE-FACTICE > "$BAC_R/etc/letsencrypt/live/$d/privkey.pem"
`;
const VERIFIEUR_FAUX = `'use strict';
const fs = require('fs'), E = process.env.BAC_ETAT;
fs.appendFileSync(E + '/appels.log', 'verifier-relais ' + process.argv.slice(2).join(' ') + ' config=' + (process.env.OPMSG_CONFIG ? 'oui' : 'non') + '\\n');
if (fs.existsSync(E + '/verifier-refuse')) { console.log('  ✗ (UDP) il REFUSE de relayer vers la machine elle-même (127.0.0.1) — ACCEPTÉ'); console.log('\\n⛔ 1 contrôle(s) en échec.'); process.exit(1); }
console.log('  ✓ (UDP) le relais ACCEPTE nos identifiants : une allocation réussit'); console.log('\\n✓ Le relais fait ce qu\\'il doit.'); process.exit(0);
`;

function bac(opts = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-turn-'));
  const b = { d, R: path.join(d, 'racine'), E: path.join(d, 'etat'), bin: path.join(d, 'bin'), serveurs: [] };
  for (const x of [b.R, b.E, b.bin]) fs.mkdirSync(x, { recursive: true });
  for (const o of OUTILS_REELS) { const p = reel(o); if (p) fs.symlinkSync(p, path.join(b.bin, o)); }
  fs.writeFileSync(path.join(b.bin, 'id'), ID_FAUX(reel('id') || '/usr/bin/id'), { mode: 0o755 });
  fs.writeFileSync(path.join(b.bin, '.iptables-faux'), IPTABLES_FAUX, { mode: 0o755 });          // (celui que le faux `apt-get` installe quand la machine n'en a pas : `bac({ iptables: false })`)
  if (opts.iptables !== false) { fs.copyFileSync(path.join(b.bin, '.iptables-faux'), path.join(b.bin, 'iptables')); fs.copyFileSync(path.join(b.bin, '.iptables-faux'), path.join(b.bin, 'ip6tables')); }
  fs.symlinkSync(process.execPath, path.join(b.bin, 'node'));
  for (const [nom, txt] of Object.entries(FAUX)) fs.writeFileSync(path.join(b.bin, nom), txt, { mode: 0o755 });
  fs.writeFileSync(path.join(b.bin, '.certbot-faux'), CERTBOT_FAUX, { mode: 0o755 });
  if (opts.certbot !== false) fs.copyFileSync(path.join(b.bin, '.certbot-faux'), path.join(b.bin, 'certbot'));
  if (opts.coturn) fs.writeFileSync(path.join(b.bin, 'turnserver'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
  if (opts.nginx !== false) fs.writeFileSync(path.join(b.E, 'nginx-actif'), '');
  if (opts.ufw !== false) fs.writeFileSync(path.join(b.E, 'ufw-actif'), '');
  fs.mkdirSync(path.join(b.R, 'etc', 'opmsg'), { recursive: true });
  fs.mkdirSync(path.join(b.R, 'etc', 'nginx', 'sites-available'), { recursive: true });
  fs.writeFileSync(path.join(b.E, 'appels.log'), ''); fs.writeFileSync(path.join(b.E, 'env.log'), '');
  b.ports = {};
  /* LE PORT D'UNE INSTANCE, et tout ce qui le cite (sa configuration, sa copie « lue », son .env) :       // ⛔ SOUS la plage des ports éphémères (32768-60999) : un port tiré dedans tombait quelquefois sur le port source d'une connexion sortante en cours — EADDRINUSE, un banc « mort » qui avait l'air de tomber (pris deux fois par le lanceur de mutations)
     ⛔ ET RE-TIRÉ par `b.serveur` si quelqu'un l'occupe quand même (9 octobre 2026 : 25525 était pris sur la machine de GitHub — test-959, le bac jumeau, est mort
     avant son total et le déploiement de la bêta est tombé avec lui). */
  const poserPort = (nom) => {
    b.ports[nom] = 20000 + crypto.randomInt(0, 10000);
    const f = path.join(b.R, 'etc', 'opmsg', nom + '.json');
    const cfg = JSON.parse(fs.readFileSync(f, 'utf8')); cfg.port = b.ports[nom];
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    fs.writeFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.env'), 'PORT=' + b.ports[nom] + '\n');
    fs.copyFileSync(f, path.join(b.E, 'config-lue-' + nom + '.json'));
  };
  b.reposerPort = poserPort;
  /* installe une instance : sa configuration (celle qu'`install-msg.sh` écrit), son port, un contrôle simulé, et un service qui tourne déjà avec cette configuration */
  b.instance = (nom, extra) => {
    const cfg = Object.assign({ instance: nom, domaine: 'msg-' + nom + '.teamop.fr', origine: 'https://msg-' + nom + '.teamop.fr', port: 0, contactEmail: 'contact@teamop.fr', vapidPublicKey: 'BANC-PUBLIQUE', vapidPrivateKey: 'BANC-PRIVEE' }, extra || {});
    const f = path.join(b.R, 'etc', 'opmsg', nom + '.json');
    fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + '\n', { mode: 0o600 });
    poserPort(nom);
    if (opts.unite !== false) fs.writeFileSync(path.join(b.E, 'unite-actif'), '');
    if (opts.verifieur !== false) {
      const o = path.join(b.R, 'opt', 'opmsg', nom, 'current', 'outils');
      fs.mkdirSync(o, { recursive: true }); fs.writeFileSync(path.join(o, 'verifier-relais.js'), VERIFIEUR_FAUX);
      fs.copyFileSync(path.join(RACINE, 'server-msg', 'turn-pare-feu.sh'), path.join(o, '..', 'turn-pare-feu.sh'));
    }
    return f;
  };
  b.noyau = (fam) => ({ chaines: (lire(path.join(b.E, 'ipt-' + fam + '.chaines')) || '').split('\n').filter(Boolean), regles: (lire(path.join(b.E, 'ipt-' + fam + '.regles')) || '').split('\n').filter(Boolean) });
  b.config = (nom) => { try { return JSON.parse(fs.readFileSync(path.join(b.R, 'etc', 'opmsg', nom + '.json'), 'utf8')); } catch (e) { return null; } };
  b.octets = (rel) => lire(path.join(b.R, rel));
  b.journal = () => lire(path.join(b.E, 'appels.log')).split('\n').filter(Boolean);
  b.env = () => lire(path.join(b.E, 'env.log'));
  b.drapeau = (n, on = true) => { const p = path.join(b.E, n); if (on) fs.writeFileSync(p, ''); else fs.rmSync(p, { force: true }); };
  /* le /health de l'instance : « j'ai un relais » d'après la configuration LUE au dernier redémarrage */
  b.serveur = (nom) => new Promise((ok) => {
    const s = http.createServer((q, r) => {
      if (q.url !== '/health') { r.statusCode = 404; r.end(); return; }
      let cfg = {}; try { cfg = JSON.parse(lire(path.join(b.E, 'config-lue-' + nom + '.json'))); } catch (e) { /* pas encore */ }
      const sans = fs.existsSync(path.join(b.E, 'health-sans-relais'));
      r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, instance: nom, appels: { turn: !sans && !!(cfg.appels && cfg.appels.relais) } }));
    });
    let essais = 0;
    s.on('error', (e) => { if (e && e.code === 'EADDRINUSE' && ++essais < 20) { poserPort(nom); s.listen(b.ports[nom], '127.0.0.1'); } else throw e; });
    s.listen(b.ports[nom], '127.0.0.1', () => { b.serveurs.push(s); b.portsRetires = (b.portsRetires || 0) + essais; ok(); });
  });
  /* joue le script : → { status, out, err } */
  b.lancer = (args, env) => new Promise((ok) => {
    const e = Object.assign({ PATH: b.bin, LC_ALL: 'C.UTF-8', HOME: b.d, BAC_ETAT: b.E, BAC_R: b.R, BAC_BIN: b.bin, OPMSG_RACINE: b.R }, env || {});
    const p = spawn(reel('bash'), [SCRIPT].concat(args), { env: e, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (x) => { out += x; }); p.stderr.on('data', (x) => { err += x; });
    const garde = setTimeout(() => { try { p.kill('SIGKILL'); } catch (x) { /* fini */ } }, 60000);
    p.on('close', (status) => { clearTimeout(garde); ok({ status, out, err }); });
  });
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
/* la ligne de coturn qui porte un secret partagé (écrite en pièces : un motif de recherche de secrets la prendrait pour un secret en dur) */
const LIGNE_SECRET = ['static', 'auth', 'secret'].join('-') + '=';
const secretDe = (b, nom) => { const c = b.config(nom); return c && c.appels && c.appels.relais ? c.appels.relais.secret : null; };
const lignesConf = (b) => (b.octets('etc/turnserver.conf') || '').split('\n').filter(l => l.trim() && !/^\s*#/.test(l));
const modeDe = (b, rel) => { try { return (fs.statSync(path.join(b.R, rel)).mode & 0o777).toString(8); } catch (e) { return null; } };
const index = (journal, re) => journal.findIndex(l => re.test(l));
const compte = (journal, re) => journal.filter(l => re.test(l)).length;
const dernier = (journal, re) => { for (let i = journal.length - 1; i >= 0; i--) if (re.test(journal[i])) return i; return -1; };

module.exports = { bac, reel, SCRIPT, OPTIONS_COTURN, enBigInt, cidr, A_REFUSER, RE_SECRET, LIGNE_SECRET, secretDe, lignesConf, modeDe, index, compte, dernier, lire, PROLOGUE, IPTABLES_FAUX };   // PROLOGUE et IPTABLES_FAUX : repris par bac-visio.js (le serveur de visio a le même genre de pare-feu sortant)
