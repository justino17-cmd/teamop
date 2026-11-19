#!/usr/bin/env bash
# Installe NOTRE FORGE (Forgejo : un « GitHub » libre et léger) sur le serveur d'atelier, dans le compte « atelier », SANS droits
# d'administrateur : elle n'écoute que 127.0.0.1:3000 tant qu'un geste en root ne l'a pas mise derrière Caddy (installer-forge-racine.sh).
#   bash scripts/atelier/forge-installer.sh            # à lancer sous le compte atelier, sur l'atelier (par la porte)
# Ce qu'il fait, et qu'on peut relancer sans rien casser : télécharge la version épinglée (empreinte vérifiée, signature si la
# clé de publication se récupère), écrit la configuration (inscriptions fermées, tout privé, pas de SSH), crée les comptes
# « justin » (administrateur) et « claude », l'organisation « teamop », le dépôt « teamop », et y pousse la copie complète du
# code avec son historique (~/miroir/teamop.git).
# ⛔ AUCUN secret ne s'affiche : mots de passe et jetons vont dans ~/forge/secrets (700), jamais sur la sortie.
set -euo pipefail
VERSION="${FORGE_VERSION:-17.0.1}"; DOMAINE="${FORGE_DOMAINE:-git.teamop.fr}"
[ "$(id -un)" = atelier ] || { echo "✗ à lancer sous le compte atelier"; exit 1; }
D="$HOME/forge"; mkdir -p "$D/bin" "$D/data" "$D/conf" "$D/log" "$D/secrets"; chmod 700 "$D/secrets"; cd "$D"
BIN="$D/bin/forgejo-$VERSION"; CONF="$D/conf/app.ini"; F() { "$BIN" --config "$CONF" --work-path "$D/data" "$@"; }

echo "── [1/6] Le programme (Forgejo $VERSION)…"
if [ ! -x "$BIN" ]; then
  BASE="https://codeberg.org/forgejo/forgejo/releases/download/v$VERSION"; N="forgejo-$VERSION-linux-amd64"
  curl -fsSL -o "bin/$N.xz" "$BASE/$N.xz"; curl -fsSL -o "bin/$N.xz.sha256" "$BASE/$N.xz.sha256"; curl -fsSL -o "bin/$N.xz.asc" "$BASE/$N.xz.asc" || true
  ( cd bin && echo "$(awk '{print $1}' "$N.xz.sha256")  $N.xz" | sha256sum -c - >/dev/null ) && echo "   ✓ empreinte du téléchargement vérifiée" || { echo "   ✗ empreinte fausse : on n'installe pas"; exit 1; }
  if gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys EB114F5E6C0DC2BCDD183550A4B61A2DC5923710 >/dev/null 2>&1 && gpg --batch --verify "bin/$N.xz.asc" "bin/$N.xz" >/dev/null 2>&1; then echo "   ✓ signature de l'éditeur vérifiée"; else echo "   ⚠ signature NON vérifiée (clé de publication non récupérée) — empreinte seule"; fi
  xz -dc "bin/$N.xz" > "$BIN" && chmod 755 "$BIN" && rm -f "bin/$N.xz"
fi
"$BIN" --version | head -1 | cut -c1-80

echo "── [2/6] La configuration…"
if [ ! -s "$CONF" ]; then
  umask 077
  cat > "$CONF" <<INI
APP_NAME = TeamOP, atelier
RUN_USER = atelier
RUN_MODE = prod
WORK_PATH = $D/data

[server]
HTTP_ADDR = 127.0.0.1
HTTP_PORT = 3000
DOMAIN = $DOMAINE
ROOT_URL = https://$DOMAINE/
DISABLE_SSH = true
OFFLINE_MODE = true
LFS_START_SERVER = false

[database]
DB_TYPE = sqlite3
PATH = $D/data/forgejo.db

[repository]
ROOT = $D/data/depots
DEFAULT_PRIVATE = private
DEFAULT_BRANCH = main

[security]
INSTALL_LOCK = true
SECRET_KEY = $("$BIN" generate secret SECRET_KEY)
INTERNAL_TOKEN = $("$BIN" generate secret INTERNAL_TOKEN)
REVERSE_PROXY_LIMIT = 1
REVERSE_PROXY_TRUSTED_PROXIES = 127.0.0.0/8
PASSWORD_HASH_ALGO = argon2
MIN_PASSWORD_LENGTH = 12

[oauth2]
JWT_SECRET = $("$BIN" generate secret JWT_SECRET)

[service]
DISABLE_REGISTRATION = true
REQUIRE_SIGNIN_VIEW = true
DEFAULT_KEEP_EMAIL_PRIVATE = true
ENABLE_NOTIFY_MAIL = false
ENABLE_CAPTCHA = false

[openid]
ENABLE_OPENID_SIGNIN = false
ENABLE_OPENID_SIGNUP = false

[session]
COOKIE_SECURE = true
PROVIDER = file

[mailer]
ENABLED = false

[actions]
ENABLED = true

[packages]
ENABLED = false

[federation]
ENABLED = false

[cron.update_checker]
ENABLED = false

[other]
SHOW_FOOTER_VERSION = false

[log]
MODE = file
LEVEL = Info
ROOT_PATH = $D/log
INI
  umask 022; chmod 600 "$CONF"; echo "   écrite"
else echo "   déjà là (gardée)"; fi
F migrate >/dev/null 2>&1 && echo "   ✓ base prête" || { echo "   ✗ la base ne se prépare pas"; F migrate 2>&1 | tail -3; exit 1; }

echo "── [3/6] Les comptes…"
creer() { # nom, admin(0/1)
  if F admin user list 2>/dev/null | awk '{print $2}' | grep -qx "$1"; then echo "   $1 : déjà là"; return; fi
  local extra=""; [ "$2" = 1 ] && extra="--admin"
  F admin user create --username "$1" --email "$1@$DOMAINE" --random-password --must-change-password=false $extra > "$D/secrets/$1.creation" 2>&1 && chmod 600 "$D/secrets/$1.creation" && echo "   $1 : créé (mot de passe dans ~/forge/secrets/$1.creation)" || { echo "   ✗ $1 : création refusée"; tail -2 "$D/secrets/$1.creation" | sed 's/assword.*/assword …/'; exit 1; }
}
creer justin 1; creer claude 0
jeton() { # nom, étiquette, portées, fichier
  [ -s "$D/secrets/$4" ] && return 0
  F admin user generate-access-token --username "$1" --token-name "$2" --scopes "$3" --raw > "$D/secrets/$4" 2>/dev/null && chmod 600 "$D/secrets/$4" && echo "   jeton « $2 » de $1 : rangé" || { echo "   ✗ jeton de $1 refusé"; rm -f "$D/secrets/$4"; exit 1; }
}
jeton justin installation all justin.jeton-installation
jeton claude session "write:repository,read:user,read:organization" claude.jeton

echo "── [4/6] Démarrage (boucle locale seulement)…"
if ! curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/api/healthz; then
  (nohup "$BIN" --config "$CONF" --work-path "$D/data" web >> "$D/log/sortie.log" 2>&1 &)
  for i in $(seq 1 40); do curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/api/healthz && break; sleep 0.5; done
fi
curl -s --max-time 3 http://127.0.0.1:3000/api/healthz | grep -q '"status": *"pass"' && echo "   ✓ la forge répond sur 127.0.0.1:3000" || { echo "   ✗ la forge ne répond pas"; tail -5 "$D/log/sortie.log"; exit 1; }
echo "   ⚠ elle ne redémarre PAS seule avec le serveur tant que l'unité systemd n'est pas posée (geste en root : installer-forge-racine.sh)"

echo "── [5/6] L'organisation et le dépôt…"
# Le jeton d'installation ne sert pas tant que le compte doit changer son mot de passe : on lève l'obligation le temps du montage,
# on la remet à la fin (Justin choisit le sien à sa première connexion).
F admin user must-change-password --unset justin >/dev/null 2>&1 || true
api() { curl -s -o "$D/log/api.derniere" -w '%{http_code}' -H "Authorization: token $(cat "$D/secrets/justin.jeton-installation")" -H 'Content-Type: application/json' "$@"; }
c=$(api http://127.0.0.1:3000/api/v1/orgs/teamop); [ "$c" = 200 ] || { c=$(api -X POST http://127.0.0.1:3000/api/v1/orgs -d '{"username":"teamop","visibility":"private"}'); [ "$c" = 201 ] && echo "   organisation teamop : créée" || { echo "   ✗ organisation : $c"; head -c 200 "$D/log/api.derniere"; exit 1; }; }
c=$(api http://127.0.0.1:3000/api/v1/repos/teamop/teamop); [ "$c" = 200 ] || { c=$(api -X POST http://127.0.0.1:3000/api/v1/orgs/teamop/repos -d '{"name":"teamop","private":true,"default_branch":"main","description":"TeamOP : OP GESTION, OP MESSAGES, site"}'); [ "$c" = 201 ] && echo "   dépôt teamop/teamop : créé (privé)" || { echo "   ✗ dépôt : $c"; head -c 200 "$D/log/api.derniere"; exit 1; }; }
c=$(api -X PUT http://127.0.0.1:3000/api/v1/repos/teamop/teamop/collaborators/claude -d '{"permission":"write"}'); [ "$c" = 204 ] && echo "   claude : peut écrire dans le dépôt" || echo "   ⚠ droit de claude : $c"

echo "── [6/6] Le code et son historique…"
M="$HOME/miroir/teamop.git"
if [ -d "$M" ] && git -C "$M" rev-parse --verify -q refs/heads/main >/dev/null; then
  git -C "$M" -c http.extraHeader="Authorization: token $(cat "$D/secrets/justin.jeton-installation")" push -q --prune http://127.0.0.1:3000/teamop/teamop.git '+refs/heads/*:refs/heads/*' '+refs/tags/*:refs/tags/*' 2>&1 | tail -3
  echo "   branches dans la forge : $(git -c http.extraHeader="Authorization: token $(cat "$D/secrets/claude.jeton")" ls-remote --heads http://127.0.0.1:3000/teamop/teamop.git 2>/dev/null | wc -l) · dans la copie : $(git -C "$M" for-each-ref refs/heads | wc -l)"
  echo "   main : forge $(git -c http.extraHeader="Authorization: token $(cat "$D/secrets/claude.jeton")" ls-remote http://127.0.0.1:3000/teamop/teamop.git refs/heads/main 2>/dev/null | cut -c1-12) · copie $(git -C "$M" rev-parse refs/heads/main | cut -c1-12)"
else echo "   ⚠ la copie complète (~/miroir/teamop.git) n'est pas encore finie : relancer ce script ensuite"; fi
F admin user must-change-password justin >/dev/null 2>&1 && echo "   justin devra choisir son mot de passe à la première connexion" || echo "   ⚠ l'obligation de changer le mot de passe de justin n'a pas pu être remise"
echo "── fini. Reste, en root : mettre la forge derrière Caddy (installer-forge-racine.sh) et le nom $DOMAINE."
