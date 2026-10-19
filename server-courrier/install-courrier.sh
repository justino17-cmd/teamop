#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Installation du serveur d'OP Courrier (signature Yousign) sur SON VPS — à lancer EN ROOT, SUR LE VPS.
#
#  Usage :  bash install-courrier.sh <beta|prod> <domaine> --email <adresse pour le certificat> [--branche <b>] [--sans-certificat]
#    beta  → courrier-beta.teamop.fr, port 8192, service opcourrier-beta
#    prod  → courrier.teamop.fr,      port 8193, service opcourrier-prod
#  Rejouable : ce qui existe est gardé (la configuration, la clé maître, les données).
#
#  ⛔ ON COHABITE avec teamop-api (127.0.0.1:8080) et OP MESSAGES sur le MÊME VPS, et on ne casse rien :
#     · nginx : on n'AJOUTE que /etc/nginx/sites-available/courrier-<instance> (+ son lien) ; jamais nginx.conf, conf.d ni un site existant ;
#       `nginx -t` AVANT tout rechargement, et au moindre refus notre fichier est retiré (ou remis comme avant) — rien n'est rechargé ;
#     · port local libre VÉRIFIÉ (8192 beta / 8193 prod ; jamais 8080, 8090, 8091, 7880, 7881, 3478, 5349), sur 127.0.0.1 seulement ;
#     · certificat pour CE domaine seulement (certbot --nginx -d <domaine>) ; les autres certificats ne sont pas touchés ;
#     · Node n'est ni installé ni mis à jour (22.5 minimum exigé), aucun apt upgrade ; utilisateur dédié `opcourrier`, unité `opcourrier-<instance>` ;
#     · pare-feu : rien n'est ouvert (443 l'est déjà) ;
#     · le service refuse de démarrer sous /opt/teamop, /etc/teamop, /opt/opmsg, /etc/opmsg.
#  ⛔ ON NE FAIT JAMAIS AFFICHER UN SECRET : ce script n'écrit nulle part la clé maître, la clé Yousign ni le secret du webhook. La clé maître
#     est tirée au sort dans /etc/opcourrier/kek-<instance> (0600, root) ; les clés Yousign se posent par `configurer-yousign.js` (saisie masquée).
#  ⛔ LA CLÉ MAÎTRE N'EST JAMAIS RÉGÉNÉRÉE SI DES DONNÉES EXISTENT : des PDF scellés avec l'ancienne deviendraient illisibles. Données sans clé = REFUS.
# ══════════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

INSTANCE="${1:-}"; DOMAINE="${2:-}"; shift 2 || true
EMAIL=""; BRANCHE="main"; CERTIF=1
while [ "$#" -gt 0 ]; do
  case "$1" in
    --email) EMAIL="${2:-}"; shift 2 ;;
    --branche) BRANCHE="${2:-}"; shift 2 ;;
    --sans-certificat) CERTIF=0; shift ;;
    *) echo "refusé : option inconnue « $1 »"; exit 2 ;;
  esac
done
[[ "$INSTANCE" =~ ^(beta|prod)$ ]] || { echo "refusé : l'instance doit valoir beta ou prod"; exit 2; }
[[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$ ]] || { echo "refusé : domaine illisible"; exit 2; }
[[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,80}$ ]] || { echo "refusé : nom de branche illisible"; exit 2; }
if [ "$CERTIF" = 1 ]; then [[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}$ ]] || { echo "refusé : --email <adresse> est nécessaire pour le certificat (ou --sans-certificat)"; exit 2; }; fi
[ "$(id -u)" = 0 ] || { echo "refusé : à lancer en root"; exit 2; }
case "$INSTANCE" in beta) PORT_DEFAUT=8192 ;; prod) PORT_DEFAUT=8193 ;; esac
PORT="${OPCOURRIER_PORT:-$PORT_DEFAUT}"
[[ "$PORT" =~ ^[0-9]{4,5}$ ]] || { echo "refusé : port illisible"; exit 2; }
# les ports des autres services de ce VPS : jamais pour nous
case "$PORT" in 8080|8090|8091|7880|7881|3478|5349|80|443|22) echo "refusé : le port $PORT appartient à un autre service de ce VPS"; exit 2 ;; esac

DEPOT="https://github.com/justino17-cmd/teamop.git"
OPT=/opt/opcourrier; MIROIR="$OPT/repo"; DONNEES="$OPT/$INSTANCE/data"
ETC=/etc/opcourrier; CONF="$ETC/$INSTANCE.json"; KEK="$ETC/kek-$INSTANCE"
UNITE="opcourrier-$INSTANCE"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "── 1. Ce qui doit déjà être là (rien n'est mis à jour)"
node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)' 2>/dev/null || { echo "✗ Node 22.5 minimum est nécessaire (node:sqlite) ; ce script ne l'installe ni ne le met à jour"; exit 1; }
command -v nginx >/dev/null && systemctl is-active --quiet nginx || { echo "✗ nginx n'est pas actif : ce script s'ajoute à nginx, il ne l'installe pas"; exit 1; }
[ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ] || { echo "✗ /etc/nginx/sites-available et sites-enabled sont attendus"; exit 1; }
NODE="$(command -v node)"
case "$NODE" in /root/*|/home/*) echo "✗ node ($NODE) est dans un dossier personnel : le service dédié ne pourrait pas le lancer"; exit 1 ;; esac
manquants=""; for c in git curl openssl; do command -v "$c" >/dev/null || manquants="$manquants $c"; done
# seulement ce qui MANQUE, sans mise à jour du reste
[ -z "$manquants" ] || { apt-get update -qq; DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends $manquants >/dev/null; }
echo "── 1 bis. Le port local $PORT"
if ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$PORT\$"; then
  if ! systemctl is-active --quiet "opcourrier-$INSTANCE" 2>/dev/null; then echo "✗ le port $PORT est déjà pris par un autre service : choisis-en un libre (OPCOURRIER_PORT=…)"; exit 1; fi
fi

echo "── 2. L'utilisateur et les dossiers"
id opcourrier >/dev/null 2>&1 || useradd --system --home-dir "$OPT" --shell /usr/sbin/nologin opcourrier
install -d -m 0755 "$OPT" "$ETC"
install -d -m 0700 -o opcourrier -g opcourrier "$OPT/$INSTANCE" "$DONNEES"

echo "── 3. Le code (miroir en lecture seule pour le service)"
if [ -d "$MIROIR/.git" ]; then git -C "$MIROIR" fetch -q origin "$BRANCHE"; else git clone -q "$DEPOT" "$MIROIR"; git -C "$MIROIR" fetch -q origin "$BRANCHE"; fi
SHA="$(git -C "$MIROIR" rev-parse "origin/$BRANCHE")"
git -C "$MIROIR" checkout -q --detach "$SHA"
( cd "$MIROIR/server-courrier" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null )
install -m 0755 -o root -g root "$MIROIR/server-courrier/deployer-courrier.sh" "$OPT/deployer.sh"

echo "── 4. La clé maître"
if [ -s "$KEK" ]; then
  echo "   (déjà posée — gardée)"
elif [ -n "$(ls -A "$DONNEES" 2>/dev/null)" ]; then
  echo "✗ REFUS : $DONNEES contient des données mais la clé maître $KEK manque."
  echo "  Une clé neuve rendrait les PDF et les fiches scellés définitivement illisibles. Restaure la clé d'origine (gestionnaire de mots de passe) dans $KEK (0600)."
  exit 1
else
  umask 077; openssl rand -hex 32 > "$KEK"; chmod 600 "$KEK"; chown root:root "$KEK"
  echo "   clé maître tirée au sort (non affichée) — À SAUVEGARDER : voir LISEZMOI.md, étape « sauvegarder la clé maître »"
fi

echo "── 5. La configuration (sans aucune clé Yousign : elles se posent à part)"
if [ ! -s "$CONF" ]; then
  umask 077
  cat > "$CONF" <<JSON
{
  "origines": ["https://teamop.fr"],
  "gestion": { "url": "https://api.teamop.fr" },
  "yousign": { "sandbox": true }
}
JSON
fi
chown opcourrier:opcourrier "$CONF"; chmod 600 "$CONF"

echo "── 6. Le service systemd"
install -d -m 0755 "/etc/systemd/system/$UNITE.service.d"
cat > "/etc/systemd/system/$UNITE.service" <<UNIT
[Unit]
Description=OP Courrier — signature électronique ($INSTANCE)
After=network-online.target
Wants=network-online.target

[Service]
User=opcourrier
Group=opcourrier
Environment=OPCOURRIER_INSTANCE=$INSTANCE
Environment=OPCOURRIER_CONFIG=$CONF
Environment=OPCOURRIER_DATA=$DONNEES
Environment=PORT=$PORT
Environment=NODE_ENV=production
LoadCredential=kek:$KEK
ExecStart=$NODE --disable-warning=ExperimentalWarning $MIROIR/server-courrier/index.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ReadWritePaths=$DONNEES
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

[Install]
WantedBy=multi-user.target
UNIT
cat > "/etc/systemd/system/$UNITE.service.d/sha.conf" <<DROP
[Service]
Environment=OPCOURRIER_SHA=$SHA
DROP
systemctl daemon-reload
systemctl enable --now "$UNITE" >/dev/null
systemctl restart "$UNITE"

echo "── 7. nginx : UN fichier ajouté, rien d'existant touché (aucun journal d'accès : il porterait des adresses réseau)"
SITE="/etc/nginx/sites-available/courrier-$INSTANCE"; LIEN="/etc/nginx/sites-enabled/courrier-$INSTANCE"
SAUVE=""; [ -f "$SITE" ] && { SAUVE="$SITE.avant"; cp "$SITE" "$SAUVE"; }
cat > "$SITE" <<NGINX
limit_req_zone \$binary_remote_addr zone=$UNITE:10m rate=10r/s;
server {
    listen 80;
    server_name $DOMAINE;
    access_log off;
    client_max_body_size 26m;
    location = /health { proxy_pass http://127.0.0.1:$PORT; }
    location /api/signature/ {
        limit_req zone=$UNITE burst=30 nodelay;
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
    location / { return 404; }
}
NGINX
ln -sfn "$SITE" "$LIEN"
if ! nginx -t >/dev/null 2>&1; then
  echo "✗ nginx refuse la configuration (nginx -t) : RIEN n'est rechargé, mon fichier est retiré."
  if [ -n "$SAUVE" ]; then mv "$SAUVE" "$SITE"; else rm -f "$SITE" "$LIEN"; fi
  nginx -t 2>&1 | head -5 || true
  exit 1
fi
[ -z "$SAUVE" ] || rm -f "$SAUVE"
systemctl reload nginx
if [ "$CERTIF" = 1 ]; then
  IPS="$(hostname -I)"; DNS="$(getent ahostsv4 "$DOMAINE" | awk '{print $1}' | sort -u | head -1 || true)"
  if [ -z "$DNS" ] || ! grep -qw "$DNS" <<<"$IPS"; then
    echo "✗ $DOMAINE ne pointe pas vers ce serveur ($DNS ≠ une adresse de ce VPS). Corrige le DNS chez OVH puis relance cette commande."
    exit 1
  fi
  command -v certbot >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends certbot python3-certbot-nginx >/dev/null; }
  certbot plugins 2>/dev/null | grep -q nginx || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends python3-certbot-nginx >/dev/null
  # CE domaine seulement : certbot ne réécrit que le bloc dont le server_name est celui-ci, et ne renouvelle ni ne modifie les autres certificats
  if ! certbot --nginx -d "$DOMAINE" --cert-name "$DOMAINE" --non-interactive --agree-tos -m "$EMAIL" --redirect --keep-until-expiring >/dev/null 2>&1; then
    echo "✗ le certificat n'a pas pu être obtenu pour $DOMAINE (le site reste en HTTP, rien d'autre n'a bougé). Relance quand le DNS est en place."
    exit 1
  fi
  nginx -t >/dev/null 2>&1 || { echo "✗ nginx -t échoue après le certificat : regarde « nginx -t » avant tout rechargement"; exit 1; }
fi

echo "── 8. Contrôle"
for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && break; sleep 1; done
curl -fsS "http://127.0.0.1:$PORT/health" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log("   service : "+j.service+" · instance "+j.instance+" · signature prête : "+j.signature.pret)})'
echo
echo "✓ $UNITE installé. Reste à poser les clés Yousign (saisie masquée) :"
echo "    cd $MIROIR/server-courrier && sudo node configurer-yousign.js $INSTANCE"
echo "  Adresse du webhook à déclarer chez Yousign : https://$DOMAINE/api/signature/webhook/yousign"
