#!/usr/bin/env bash
# Met la BÊTA d'OP MESSAGES de l'atelier (lancée dans le compte atelier, ~/opmsg-beta, données d'ESSAI) sous systemd et derrière Caddy.
#   bash /root/outils-teamop/scripts/atelier/installer-msg-racine.sh msg-atelier.teamop.fr      # en root, depuis une copie de ROOT
# ⛔ Bêta seulement : la clé maître de cette instance est née sur le serveur, dans le compte atelier — bon pour des essais, jamais
# pour de vrais comptes (la production suit design/opmessages/INSTALLER-LE-SERVEUR.md, sur un serveur de production).
set -euo pipefail
HOTE="${1:-}"
if ! [[ "$HOTE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$ ]]; then echo "usage : bash installer-msg-racine.sh <nom, par exemple msg-atelier.teamop.fr>"; exit 1; fi
if [ "$(id -u)" != 0 ]; then echo "✗ à lancer en root, sur le serveur d'atelier"; exit 1; fi
ICI="$(cd "$(dirname "$0")" && pwd)"
if [ "$(stat -c %U "$ICI")" != root ] || [ "$(stat -c %U "$0")" != root ]; then echo "✗ à lancer depuis une copie qui appartient à root"; exit 1; fi
case "$HOTE" in teamop.fr|www.teamop.fr|api.teamop.fr|msg.teamop.fr|msg-beta.teamop.fr) echo "✗ $HOTE est une adresse déjà en service ailleurs"; exit 1;; esac
if [ -d /opt/teamop ] || [ -d /etc/teamop ] || [ -d /opt/opmsg ]; then echo "✗ ce serveur porte la production"; exit 1; fi
[ -s /home/atelier/opmsg-beta/beta.json ] && [ -s /home/atelier/opmsg-beta/cred/kek ] || { echo "✗ la bêta n'est pas préparée dans /home/atelier/opmsg-beta"; exit 1; }
grep -q "\"domaine\": *\"$HOTE\"" /home/atelier/opmsg-beta/beta.json || { echo "✗ la configuration de la bêta ne porte pas le nom $HOTE"; exit 1; }
IP_MOI="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
IP_NOM="$(getent ahostsv4 "$HOTE" 2>/dev/null | awk '{print $1; exit}' || true)"
if [ "$IP_NOM" != "$IP_MOI" ]; then echo "✗ $HOTE mène à « ${IP_NOM:-nulle part} », pas à ce serveur ($IP_MOI) : poser ou attendre l'enregistrement DNS (type A)."; exit 1; fi

echo "── [1/3] Le service…"
cat > /etc/systemd/system/atelier-opmsg.service <<'UNITE'
[Unit]
Description=OP MESSAGES, bêta de l'atelier (données d'essai)
After=network.target

[Service]
User=atelier
WorkingDirectory=/home/atelier/teamop/server-msg
Environment=NODE_ENV=production
Environment=OPMSG_INSTANCE=beta
Environment=OPMSG_CONFIG=/home/atelier/opmsg-beta/beta.json
Environment=OPMSG_DATA=/home/atelier/opmsg-beta/data
Environment=CREDENTIALS_DIRECTORY=/home/atelier/opmsg-beta/cred
Environment=HOME=/home/atelier
ExecStart=/usr/bin/node /home/atelier/teamop/server-msg/index.js
Restart=always
RestartSec=3
NoNewPrivileges=yes
CapabilityBoundingSet=
RestrictSUIDSGID=yes

[Install]
WantedBy=multi-user.target
UNITE
for p in $(pgrep -u atelier -f 'server-msg/index\.js' || true); do kill "$p" 2>/dev/null || true; done; sleep 1
systemctl daemon-reload && systemctl enable -q atelier-opmsg && systemctl restart atelier-opmsg
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 2 http://127.0.0.1:8091/health && break; sleep 0.5; done
curl -s --max-time 3 http://127.0.0.1:8091/health | grep -q '"ok":true' || { echo "✗ la bêta ne démarre pas :"; systemctl status atelier-opmsg --no-pager 2>&1 | sed -n '3,6p'; exit 1; }

echo "── [2/3] Caddy…"
if ! grep -q "^$HOTE {" /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.avant-$(date +%Y%m%d-%H%M%S)"
  { cat /etc/caddy/Caddyfile; cat <<CADDY

$HOTE {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		-Server
	}
	request_body {
		max_size 120MB
	}
	reverse_proxy 127.0.0.1:8091 {
		flush_interval -1
	}
}
CADDY
  } > /etc/caddy/Caddyfile.neuf
  if caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.neuf >/dev/null 2>&1; then mv /etc/caddy/Caddyfile.neuf /etc/caddy/Caddyfile; else echo "✗ configuration de Caddy refusée (l'ancienne reste)"; caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.neuf 2>&1 | tail -3; exit 1; fi
  systemctl restart caddy
fi

echo "── [3/3] Vérifications…"
OK=0; for i in $(seq 1 25); do curl -s --max-time 6 "https://$HOTE/health" 2>/dev/null | grep -q '"ok":true' && { OK=1; break; }; sleep 3; done
[ "$OK" = 1 ] && echo "   ✓ https://$HOTE répond (OP MESSAGES, bêta)" || echo "   ✗ https://$HOTE ne répond pas encore (certificat : réessayer dans une minute)"
for h in atelier.teamop.fr git.teamop.fr; do [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$h/" )" != 000 ] && echo "   ✓ https://$h répond toujours" || echo "   ✗ https://$h ne répond plus"; done
