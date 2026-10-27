/* ══ LE BAC À SABLE DE L'ESPACE DE TEST — partagé par test-2988 (déployeur) et test-2989 (installeur) ══════
   Un faux VPS : une racine factice (`TEAMOP_TEST_RACINE`), la PRODUCTION posée dedans en sentinelles (données,
   configuration, dépôt, unité, clé maître), et de FAUX binaires devant le PATH — git, npm, systemctl, runuser,
   curl, nginx, certbot… Chacun écrit une ligne dans un journal : c'est ce journal qui prouve l'ORDRE des gestes.
   Le reste (bash, jq, openssl, sed, find, flock, tar, node) est le vrai.

   ⛔ Les fichiers de l'espace de test (deployer-test.sh, install-test.sh, nginx-teamop-test.conf) sont ceux
   du dépôt, recopiés tels quels : ce qu'on joue est ce qui sera lancé sur le VPS.
   Les sentinelles de la production sont hachées avant et après : un seul octet qui bouge fait tomber le banc. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');

const RACINE_DEPOT = path.join(__dirname, '..');
const SHA_A = 'a'.repeat(40), SHA_B = 'b'.repeat(40), SHA_C = 'c'.repeat(40), SHA_D = 'd'.repeat(40), SHA_E = 'e'.repeat(40), SHA_F = 'f'.repeat(40);
const CANARI_BUILD = 'CANARI_CLE_ESSAIS_9f3a';        // ce que le faux fabricant de pages imprime : ne doit JAMAIS sortir à l'écran
const CANARI_AGENTS = 'sk-ant-CANARI-AGENTS-0001-PRODUCTION';     // la clé d'agents de la « production » du bac

function ecrire(p, texte, mode) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, texte); if (mode) fs.chmodSync(p, mode); }
function faux(dir, nom, corps) { ecrire(path.join(dir, nom), '#!/bin/bash\n' + corps, 0o755); }

function creerBac() {
  const B = fs.mkdtempSync(path.join(os.tmpdir(), 'teamop-bac-essais-'));
  const R = path.join(B, 'racine'), E = path.join(B, 'etat'), BIN = path.join(B, 'bin'), FIX = path.join(E, 'fix');
  fs.mkdirSync(R, { recursive: true }); fs.mkdirSync(BIN, { recursive: true }); fs.mkdirSync(FIX, { recursive: true });
  fs.writeFileSync(path.join(E, 'log'), ''); fs.writeFileSync(path.join(E, 'connus'), '');

  /* ── La production, en sentinelles ── */
  ecrire(path.join(R, 'opt/teamop/data/socle-annuaire.db'), 'ANNUAIRE-DE-PRODUCTION');
  ecrire(path.join(R, 'opt/teamop/config.json'), JSON.stringify({ apiKey: 'PROD-API-KEY', agents: { cleApi: CANARI_AGENTS, reunionsAuto: true }, stripe: { secretKey: 'sk_live_' + 'PRODUCTIONPRODUCTION' } }), 0o600);
  ecrire(path.join(R, 'opt/teamop/repo/server/index.js'), '// code de production');
  ecrire(path.join(R, 'etc/systemd/system/teamop-api.service'), '[Service]\nExecStart=/usr/bin/node index.js\n');
  ecrire(path.join(R, 'etc/teamop/kek'), 'f'.repeat(64), 0o600);
  ecrire(path.join(R, 'etc/nginx/sites-available/api.teamop.fr'), 'server { server_name api.teamop.fr; }\n');
  ecrire(path.join(R, 'etc/caddy/Caddyfile'), 'api.teamop.fr {\n    reverse_proxy 127.0.0.1:8080\n}\n');   // sentinelle : seul le mode Caddy y ajoute UNE ligne d'import

  /* ── Les « commits » du faux dépôt : un arbre par SHA, avec le VRAI déployeur et le VRAI modèle nginx ── */
  const arbre = (sha, extra) => {
    const d = path.join(FIX, sha);
    ecrire(path.join(d, 'server/index.js'), '// serveur ' + sha);
    ecrire(path.join(d, 'server/package.json'), '{"name":"teamop-api"}');
    ecrire(path.join(d, 'recap-abonnement.html'), '<!-- page de paiement ' + sha + ' -->');
    for (const f of ['deployer-test.sh', 'install-test.sh', 'nginx-teamop-test.conf', 'caddy-teamop-test.caddy'])
      if (fs.existsSync(path.join(RACINE_DEPOT, 'server', f))) ecrire(path.join(d, 'server', f), fs.readFileSync(path.join(RACINE_DEPOT, 'server', f), 'utf8'), 0o755);
    /* Un FAUX créateur de tarifs : le vrai (server/stripe-essai-prix.js) parle à api.stripe.com, ce que le bac ne doit jamais faire — il est éprouvé par test-2990 contre un faux Stripe.
       Celui-ci note l'appel (qui, quelle config) et écrit une table de dix tarifs dans la config, comme le vrai. Il n'imprime rien d'autre qu'une ligne. */
    ecrire(path.join(d, 'server/stripe-essai-prix.js'), `
const fs = require('fs'), path = require('path');
const C = process.env.TEAMOP_CONFIG, cfg = JSON.parse(fs.readFileSync(C, 'utf8'));
const voisins = fs.existsSync(path.join(__dirname, 'index.js')) && fs.existsSync(path.join(__dirname, '..', 'recap-abonnement.html'));
if (!voisins) { fs.appendFileSync(process.env.BAC_ETAT + '/log', 'prixessai sans-voisins\\n'); console.error('server/index.js illisible à côté de ce script (banc)'); process.exit(1); }
fs.appendFileSync(process.env.BAC_ETAT + '/log', 'prixessai cfg=' + path.basename(C) + ' cle=' + /^(sk|rk)_test_/.test(String(cfg.stripe && cfg.stripe.secretKey)) + '\\n');
if (fs.existsSync(process.env.BAC_ETAT + '/prix_echec')) { console.error('Stripe a refusé (banc)'); process.exit(1); }
const t = {}; for (let i = 0; i < 10; i++) t['price_PROD' + i] = 'price_TEST' + i;
cfg.stripe = Object.assign({}, cfg.stripe, { prixEssai: t });
fs.writeFileSync(C, JSON.stringify(cfg, null, 2) + '\\n');   // la forme de jq et du vrai script : un second passage de l'installeur ne change pas un octet
console.log('10 tarif(s) de test prêts (faux créateur du banc)');
`);
    ecrire(path.join(d, 'scripts/essais-build.js'), `
const fs = require('fs'), path = require('path');
const [dir, sha, branche] = process.argv.slice(2);
const E = process.env.BAC_ETAT, R = process.env.BAC_RACINE;
const lien = n => { try { return path.basename(fs.readlinkSync(path.join(R, 'opt/teamop/test', n))); } catch (e) { return '-'; } };
fs.appendFileSync(E + '/log', 'build as=' + process.env.BAC_UTILISATEUR + ' sha=' + sha.slice(0, 8) + ' branche=' + branche + ' current=' + lien('current').slice(0, 8) + ' pages=' + lien('pages') + ' cfg=' + process.env.TEAMOP_CONFIG + ' data=' + process.env.TEAMOP_DATA + ' cwd=' + process.cwd() + '\\n');
const iP = process.argv.indexOf('--parcours'), parcours = iP > 0 ? process.argv[iP + 1] : '';
fs.appendFileSync(E + '/log', 'build-args parcours=' + (parcours || '-') + ' arguments=' + (process.argv.length - 2) + '\\n');
console.log('espaceTestCle=${CANARI_BUILD}');
if (fs.existsSync(E + '/build_echec')) { console.error('boum ${CANARI_BUILD}'); process.exit(3); }
fs.writeFileSync(path.join(dir, 'essais.html'), '<p>' + branche + ' ' + sha.slice(0, 7) + '</p>' + (parcours ? '<!--parcours:' + fs.readFileSync(parcours, 'utf8') + '-->' : ''));
`);
    if (extra) extra(d);
    return d;
  };
  arbre(SHA_A); arbre(SHA_B); arbre(SHA_C); arbre(SHA_D); arbre(SHA_E); arbre(SHA_F);
  /* le « miroir » que `git clone` recopie, et la tête de la branche */
  const miroir = path.join(FIX, 'mirror'); fs.cpSync(path.join(FIX, SHA_A), miroir, { recursive: true });
  fs.writeFileSync(path.join(FIX, 'HEAD'), SHA_A + '\n');

  /* ── Les faux binaires ── */
  faux(BIN, 'git', `
E="$BAC_ETAT"; FIX="$E/fix"
while [ $# -gt 0 ]; do case "$1" in -c) shift 2 ;; -C) REPO="$2"; shift 2 ;; *) break ;; esac; done
cmd="$1"; shift
echo "git $cmd as=\${BAC_UTILISATEUR:--}" >> "$E/log"
case "$cmd" in
  cat-file) s="\${2%%^*}"; grep -qx "$s" "$E/connus"; exit $? ;;
  fetch)
    [ -f "$E/git_echec" ] && exit 1
    last="\${@: -1}"
    if [[ "$last" =~ ^[0-9a-f]{40}$ ]]; then [ -d "$FIX/$last" ] || exit 1; echo "$last" >> "$E/connus"
    else for d in "$FIX"/*/; do n="$(basename "$d")"; [[ "$n" =~ ^[0-9a-f]{40}$ ]] && echo "$n" >> "$E/connus"; done; true; fi ;;
  archive) tar -c -C "$FIX/\${@: -1}" . ;;
  clone) dir="\${@: -1}"; mkdir -p "$dir/.git"; cp -r "$FIX/mirror/." "$dir/" ;;
  rev-parse) [ -f "$E/branche_absente" ] && exit 1; cat "$FIX/HEAD" ;;
  ls-remote) # « git ls-remote <dépôt> refs/heads/<branche> » : la tête de la branche, lue PAR ROOT (jamais depuis le miroir de teamoptest)
    [ -f "$E/branche_absente" ] && exit 0
    ref="\${@: -1}"; printf '%s\\t%s\\n' "$(cat "$FIX/HEAD")" "$ref" ;;
  checkout) # comme le vrai : un fichier identique n'est pas réécrit (le script qui tourne n'est jamais tronqué)
    sha="\${@: -1}"
    if [ -d "$FIX/$sha" ] && [ -n "$REPO" ]; then
      ( cd "$FIX/$sha" && find . -type f ) | while read -r f; do cmp -s "$FIX/$sha/$f" "$REPO/$f" || { mkdir -p "$(dirname "$REPO/$f")"; cp "$FIX/$sha/$f" "$REPO/$f"; }; done
    fi ;;
esac
exit 0
`);
  faux(BIN, 'runuser', `
# runuser -u USER -- commande… : exécute la commande ; la trace dit « en tant que qui »
user="$2"; shift 3
echo "runuser $user $1" >> "$BAC_ETAT/log"
# « test -r/-x <chemin> » : ce que le compte de test PEUT lire est dit par le fichier « lisibles » du bac (rien par défaut : les droits de la production tiennent)
if [ "$1" = "test" ]; then grep -qxF "$3" "$BAC_ETAT/lisibles" 2>/dev/null; exit $?; fi
BAC_UTILISATEUR="$user" exec "$@"
`);
  /* Le faux systemd-run : il n'APPLIQUE aucune restriction (le bac ne peut pas — c'est `deployer-test --sonde` qui le vérifie sur la vraie machine, et le dit), mais il fait ce que ferait
     systemd de pire côté usage : il REFUSE une option ou une propriété qu'il ne connaît pas (une faute de frappe dans la cellule échoue ici comme là-bas), il note les propriétés posées
     (c'est ce journal qui prouve ce que chaque étape a le droit de faire) et lance la commande sous l'utilisateur demandé, dans le dossier de travail demandé. */
  faux(BIN, 'systemd-run', `
props=(); envs=()
while [ $# -gt 0 ]; do case "$1" in
  --quiet|--wait|--pipe|--collect) shift ;;
  -p) props+=("$2"); shift 2 ;;
  -E) envs+=("$2"); shift 2 ;;
  --) shift; break ;;
  *) echo "systemd-run (faux) : option inconnue $1" >&2; exit 64 ;;
esac; done
get() { local p; for p in "\${props[@]}"; do case "$p" in "$1="*) printf '%s' "\${p#*=}"; return ;; esac; done; }
CONNUES=" User Group NoNewPrivileges PrivateTmp PrivateDevices ProtectHome ProtectSystem ProtectKernelTunables ProtectKernelModules ProtectControlGroups RestrictSUIDSGID PrivateNetwork WorkingDirectory ReadWritePaths InaccessiblePaths "
for p in "\${props[@]}"; do case "$CONNUES" in *" \${p%%=*} "*) ;; *) echo "systemd-run (faux) : propriété inconnue \${p%%=*}" >&2; exit 65 ;; esac; done
noms=""; for e in "\${envs[@]}"; do noms="$noms \${e%%=*}"; done
echo "cellule user=$(get User) net=$(get PrivateNetwork) systeme=$(get ProtectSystem) nopriv=$(get NoNewPrivileges) cwd=$(get WorkingDirectory) rw=$(get ReadWritePaths) inv=$(get InaccessiblePaths) env=\${noms# } cmd=$1" >> "$BAC_ETAT/log"
[ -f "$BAC_ETAT/cellule_refuse" ] && exit 1
case " $* " in *" teamop-sonde "*)
  if [ -f "$BAC_ETAT/cellule_percee" ]; then echo "  ✗ visible depuis la cellule : /etc/nginx"; echo "  ✗ la cellule a du RÉSEAU"; exit 1; fi
  echo "  la cellule tient"; exit 0 ;;
esac
for e in "\${envs[@]}"; do export "$e"; done
cd "$(get WorkingDirectory)" || exit 1
BAC_UTILISATEUR="$(get User)" exec "$@"
`);
  faux(BIN, 'npm', `
echo "npm $1 as=\${BAC_UTILISATEUR:--} args=$*" >> "$BAC_ETAT/log"
[ -f "$BAC_ETAT/npm_echec" ] && exit 1
prefix=""; while [ $# -gt 0 ]; do [ "$1" = "--prefix" ] && prefix="$2"; shift; done
mkdir -p "$prefix/node_modules"
exit 0
`);
  faux(BIN, 'systemctl', `
E="$BAC_ETAT"; R="$BAC_RACINE"
cur="$(basename "$(readlink "$R/opt/teamop/test/current" 2>/dev/null)" 2>/dev/null | cut -c1-8)"
pag="$(basename "$(readlink "$R/opt/teamop/test/pages" 2>/dev/null)" 2>/dev/null)"
echo "systemctl $* | current=$cur pages=$pag" >> "$E/log"
case "$1" in
  is-active) [ -f "$E/nginx_inactif" ] && [ "$3" = "nginx" ] && exit 3
             [ "$3" = "caddy" ] && [ ! -f "$E/caddy_actif" ] && exit 3   # Caddy n'est actif que si le bac le dit
             exit 0 ;;
  restart) [ -f "$E/restart_echec" ] && exit 1; exit 0 ;;
esac
exit 0
`);
  faux(BIN, 'curl', `
E="$BAC_ETAT"; R="$BAC_RACINE"; FIX="$E/fix"
url="\${@: -1}"
case "$url" in
  http://127.0.0.1:*/health)
    cur="$(basename "$(readlink "$R/opt/teamop/test/current" 2>/dev/null)" 2>/dev/null)"
    echo "curl health current=\${cur:0:8}" >> "$E/log"
    if [ -n "$cur" ] && grep -qx "$cur" "$E/malsains" 2>/dev/null; then exit 22; fi
    echo '{"ok":true,"v":5}' ;;
  http://127.0.0.1:*/api/essais/courriels) printf '%s' "$(cat "$E/routes" 2>/dev/null || echo 403)" ;;
  https://raw.githubusercontent.com/justino17-cmd/teamop/*)
    # un fichier du dépôt, lu PAR SON SHA (immuable : pas de cache périmé) — ce que l'installeur pose en root
    rest="\${url#https://raw.githubusercontent.com/justino17-cmd/teamop/}"; sha="\${rest%%/*}"; chemin="\${rest#*/}"
    echo "curl raw sha=\${sha:0:8} $chemin" >> "$E/log"
    [ -f "$E/raw_echec" ] && exit 22
    f="$FIX/$sha/$chemin"; [ -f "$f" ] || exit 22
    out=""; prev=""; for a in "$@"; do [ "$prev" = "-o" ] && out="$a"; prev="$a"; done
    if [ -f "$E/raw_vide" ]; then : > "$out"; else cp "$f" "$out"; fi ;;
  https://*essais.html) printf '%s' "$(cat "$E/pages_code" 2>/dev/null || echo 401)" ;;
  *) exit 7 ;;
esac
exit 0
`);
  faux(BIN, 'chown', `echo "chown $*" >> "$BAC_ETAT/log"; exit 0`);
  faux(BIN, 'chgrp', `echo "chgrp $*" >> "$BAC_ETAT/log"; exit 0`);
  faux(BIN, 'useradd', `echo "useradd $*" >> "$BAC_ETAT/log"; : > "$BAC_ETAT/utilisateur"; exit 0`);
  faux(BIN, 'id', `
if [ "$1" = "-u" ]; then echo 0; exit 0; fi
[ -f "$BAC_ETAT/utilisateur" ] && exit 0 || exit 1
`);
  faux(BIN, 'apt-get', `echo "apt-get $*" >> "$BAC_ETAT/log"; exit 0`);
  faux(BIN, 'getent', `
if [ "$1" = "ahostsv4" ]; then [ -f "$BAC_ETAT/dns_absent" ] && exit 2; echo "203.0.113.7 STREAM $2"; exit 0; fi
if [ "$1" = "group" ]; then exit 0; fi
exit 2
`);
  faux(BIN, 'nginx', `
R="$BAC_RACINE"
case "$1" in
  -v) echo "nginx version: nginx/\${BAC_NGINX_VERSION:-1.24.0}" >&2; exit 0 ;;
  -t) echo "nginx -t" >> "$BAC_ETAT/log"
      # un « @@ » resté dans un fichier posé = un trou du modèle non rempli : nginx le refuserait
      if grep -rq '@@' "$R/etc/nginx/sites-available" 2>/dev/null; then echo "nginx: [emerg] unknown directive" >&2; exit 1; fi
      [ -f "$BAC_ETAT/nginx_refuse" ] && { echo "nginx: [emerg] refus de test" >&2; exit 1; }
      exit 0 ;;
esac
exit 0
`);
  faux(BIN, 'caddy', `
R="$BAC_RACINE"
case "$1" in version) echo "\${BAC_CADDY_VERSION:-v2.6.2} h1:bac"; exit 0 ;; esac
echo "caddy $*" >> "$BAC_ETAT/log"
case "$1" in
  validate)
    cp "$R/etc/caddy/Caddyfile" "$BAC_ETAT/caddyfile-au-validate" 2>/dev/null || true
    if grep -rq '@@' "$R/etc/caddy/teamop-test" 2>/dev/null; then echo "caddy: trou du modèle non rempli" >&2; exit 1; fi
    [ -f "$BAC_ETAT/caddy_refuse" ] && { echo "caddy: refus de test" >&2; exit 1; }
    exit 0 ;;
esac
exit 0
`);
  /* Un faux htpasswd : le mot de passe arrive par l'ENTRÉE STANDARD (jamais en argument) ; il rend un hachage bcrypt d'apparence ($2y$10$…) dérivé du mot de passe. */
  faux(BIN, 'htpasswd', `
echo "htpasswd $*" >> "$BAC_ETAT/log"
mdp="$(cat)"
printf 'essai:$2y$10$%s\\n' "$(printf '%s' "$mdp" | sha256sum | cut -c1-53)"
`);
  faux(BIN, 'certbot', `
R="$BAC_RACINE"
echo "certbot $*" >> "$BAC_ETAT/log"
# l'état du fichier nginx AU MOMENT du certificat : il ne doit pas encore contenir le bloc 443
cp "$R/etc/nginx/sites-available/teamop-test.conf" "$BAC_ETAT/nginx-au-certificat" 2>/dev/null || true
[ -f "$BAC_ETAT/certbot_echec" ] && { echo "Challenge failed for domain test.teamop.fr"; exit 1; }
mkdir -p "$R/etc/letsencrypt/live/test.teamop.fr"; echo cert > "$R/etc/letsencrypt/live/test.teamop.fr/fullchain.pem"
exit 0
`);

  const env = Object.assign({}, process.env, {
    PATH: BIN + path.delimiter + process.env.PATH, TEAMOP_TEST_RACINE: R, BAC_ETAT: E, BAC_RACINE: R,
    TEAMOP_TEST_ESSAIS_SANTE: '2', TEAMOP_TEST_PAUSE_SANTE: '0', LC_ALL: 'C.UTF-8',
  });
  delete env.BAC_UTILISATEUR;

  const hacher = (rel) => { const out = []; const marche = (p) => { const st = fs.lstatSync(p); if (st.isDirectory()) fs.readdirSync(p).sort().forEach(n => marche(path.join(p, n))); else out.push(path.relative(R, p) + ':' + crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') + ':' + (st.mode & 0o777).toString(8)); }; marche(path.join(R, rel)); return out.join('\n'); };
  const PRODUCTION = ['opt/teamop/data', 'opt/teamop/config.json', 'opt/teamop/repo', 'etc/systemd/system/teamop-api.service', 'etc/teamop/kek', 'etc/nginx/sites-available/api.teamop.fr'];
  const empreinteProduction = () => PRODUCTION.map(hacher).join('\n');

  return {
    B, R, E, BIN, FIX, env, SHA_A, SHA_B, SHA_C, SHA_D, SHA_E, SHA_F, CANARI_BUILD, CANARI_AGENTS, empreinteProduction,
    chemin: (rel) => path.join(R, rel),
    lire: (rel) => fs.readFileSync(path.join(R, rel), 'utf8'),
    existe: (rel) => fs.existsSync(path.join(R, rel)),
    lien: (rel) => { try { return fs.readlinkSync(path.join(R, rel)); } catch (e) { return null; } },
    journal: () => fs.readFileSync(path.join(E, 'log'), 'utf8').split('\n').filter(Boolean),
    poser: (nom, contenu) => fs.writeFileSync(path.join(E, nom), contenu === undefined ? '1' : contenu),
    retirer: (nom) => fs.rmSync(path.join(E, nom), { force: true }),
    /* Pose le VPS « installé » : l'unité, la configuration, le miroir avec un déployeur ANCIEN (il diffère du vrai). */
    /* Pose le VPS « installé » : l'unité, la configuration, le miroir (un dossier — rien n'y est exécuté), et LE DÉPLOYEUR DE ROOT dans /usr/local/sbin, là où l'installeur le pose.
       ⛔ Il n'y a plus de déployeur dans le miroir : un déployeur que le compte de test peut écrire, c'est un script que root exécute et que la branche écrit. */
    installer(opts) {
      opts = opts || {};
      ecrire(path.join(R, 'etc/systemd/system/teamop-api-test.service'), '[Service]\nEnvironment=PORT=8095\nUser=teamoptest\n');
      ecrire(path.join(R, 'opt/teamop/test/config.json'), JSON.stringify({ espaceTest: true, espaceTestCle: '1'.repeat(64) }), 0o640);
      this.poserDeployeur();
      fs.mkdirSync(path.join(R, 'opt/teamop/test/repo'), { recursive: true });
      fs.mkdirSync(path.join(R, 'opt/teamop/test/data'), { recursive: true });
      if (opts.pagesVides) {
        ecrire(path.join(R, 'opt/teamop/test/pages.d/vide/essais.html'), 'attente');
        fs.symlinkSync('pages.d/vide', path.join(R, 'opt/teamop/test/pages'));
      }
    },
    poserDeployeur() { ecrire(path.join(R, 'usr/local/sbin/deployer-test'), fs.readFileSync(path.join(RACINE_DEPOT, 'server/deployer-test.sh'), 'utf8'), 0o755); },
    /* Le déployeur, tel que root le lance : arguments libres (« <sha> <branche> », « --sonde », « --ssh »), environnement libre (SSH_ORIGINAL_COMMAND…). */
    lancer(args, extraEnv) {
      const script = path.join(R, 'usr/local/sbin/deployer-test');
      const r = spawnSync('bash', [script].concat(args), { encoding: 'utf8', env: Object.assign({}, env, extraEnv || {}), timeout: 60000 });
      return { rc: r.status, sortie: String(r.stdout || '') + String(r.stderr || ''), out: String(r.stdout || ''), err: String(r.stderr || '') };
    },
    deployer(sha, branche, extraEnv) { return this.lancer([].concat(sha === undefined ? [] : [sha], branche === undefined ? [] : [branche]), extraEnv); },
    nettoyer() { try { fs.rmSync(B, { recursive: true, force: true }); } catch (e) {} },
  };
}

/* Le texte d'un script SANS ses lignes de commentaire entières : on garde ce qui s'EXÉCUTE (la règle de CLAUDE.md :
   un motif de banc vise du code, jamais une phrase). */
function code(chemin) {
  return fs.readFileSync(chemin, 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
}

module.exports = { creerBac, code, RACINE_DEPOT, SHA_A, SHA_B, SHA_C, SHA_D, SHA_E, SHA_F, CANARI_BUILD, CANARI_AGENTS, ecrire };
