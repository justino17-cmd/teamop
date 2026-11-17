#!/usr/bin/env bash
# Installe LA PORTE DE L'ATELIER (scripts/atelier/porte.js) sur le serveur d'atelier : Caddy (HTTPS), le service, sa clé.
#   bash scripts/atelier/installer-porte.sh atelier.teamop.fr            # à lancer en root, SUR L'ATELIER
#   bash scripts/atelier/installer-porte.sh atelier.teamop.fr --nouvelle-cle   # remplace la clé (l'ancienne ne marche plus)
#
# ⛔ Jamais sur le serveur des clients : la porte exécute des commandes. Elle tourne sous le compte « atelier », sans droits
# d'administrateur, n'écoute que 127.0.0.1, et le serveur ne garde que l'EMPREINTE de la clé.
# ⛔ La clé s'affiche UNE fois, à la fin, sur l'écran de celui qui installe : elle se colle dans le formulaire sécurisé de la
# session Claude (jamais dans la conversation), puis on efface l'écran (`clear`).
set -euo pipefail
HOTE="${1:-}"; NOUVELLE="${2:-}"
if ! [[ "$HOTE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$ ]]; then echo "usage : bash installer-porte.sh <nom du serveur, par exemple atelier.teamop.fr>"; exit 1; fi
if [ "$(id -u)" != 0 ]; then echo "✗ à lancer en root, sur le serveur d'atelier"; exit 1; fi
if [ -d /opt/teamop/repo ] || systemctl list-unit-files 2>/dev/null | grep -q '^teamop-api'; then echo "✗ ce serveur porte l'API des clients : la porte ne s'installe pas ici"; exit 1; fi
command -v node >/dev/null || { echo "✗ Node absent : lancer d'abord la commande de base"; exit 1; }
ICI="$(cd "$(dirname "$0")" && pwd)"

echo "── [1/5] Le nom $HOTE mène-t-il à ce serveur ?"
IP_MOI="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
IP_NOM="$(getent ahostsv4 "$HOTE" 2>/dev/null | awk '{print $1; exit}')"
if [ -z "$IP_NOM" ]; then echo "✗ $HOTE ne mène nulle part pour l'instant : l'enregistrement DNS n'est pas encore en place (ou pas encore propagé). Réessayer dans quelques minutes."; exit 1; fi
if [ "$IP_NOM" != "$IP_MOI" ]; then echo "✗ $HOTE mène à $IP_NOM, pas à ce serveur ($IP_MOI) : corriger l'enregistrement DNS."; exit 1; fi
echo "   oui ($IP_MOI)"

echo "── [2/5] Caddy (HTTPS automatique)…"
if ! command -v caddy >/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy
fi

echo "── [3/5] Le service…"
id atelier >/dev/null 2>&1 || adduser --disabled-password --gecos "" atelier
install -d -m 755 /opt/atelier-porte
install -m 644 "$ICI/porte.js" /opt/atelier-porte/porte.js
install -d -m 750 -o root -g atelier /etc/atelier-porte
CLE=""
if [ ! -s /etc/atelier-porte/empreinte ] || [ "$NOUVELLE" = "--nouvelle-cle" ]; then
  CLE="$(openssl rand -hex 32)"
  printf '%s' "$CLE" | sha256sum | awk '{print $1}' > /etc/atelier-porte/empreinte.tmp
  chown root:atelier /etc/atelier-porte/empreinte.tmp && chmod 640 /etc/atelier-porte/empreinte.tmp
  mv /etc/atelier-porte/empreinte.tmp /etc/atelier-porte/empreinte
fi
cat > /etc/systemd/system/atelier-porte.service <<'UNITE'
[Unit]
Description=Porte de l'atelier (commandes d'une session Claude)
After=network.target

[Service]
User=atelier
Environment=PORTE_EMPREINTE=/etc/atelier-porte/empreinte
Environment=PORTE_DOSSIER=/home/atelier
Environment=HOME=/home/atelier
Environment=USER=atelier
ExecStart=/usr/bin/node /opt/atelier-porte/porte.js
Restart=always
RestartSec=2
NoNewPrivileges=yes
KillMode=process

[Install]
WantedBy=multi-user.target
UNITE
systemctl daemon-reload && systemctl enable -q atelier-porte && systemctl restart atelier-porte

echo "── [4/5] Caddy : $HOTE → la porte…"
[ -f /etc/caddy/Caddyfile ] && [ ! -f /etc/caddy/Caddyfile.avant-porte ] && cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.avant-porte
cat > /etc/caddy/Caddyfile <<CADDY
$HOTE {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		-Server
	}
	handle /porte/* {
		reverse_proxy 127.0.0.1:7070
	}
	handle {
		respond "Atelier" 200
	}
}
CADDY
caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1 || { echo "✗ la configuration de Caddy est refusée"; caddy validate --config /etc/caddy/Caddyfile 2>&1 | tail -3; exit 1; }
systemctl enable -q caddy && systemctl reload caddy 2>/dev/null || systemctl restart caddy

echo "── [5/5] Vérifications…"
sleep 1
if curl -s --max-time 5 http://127.0.0.1:7070/porte/sante | grep -q '"ok":true'; then echo "   ✓ le service répond sur le serveur"; else echo "   ✗ le service ne répond pas : journalctl -u atelier-porte -n 20"; exit 1; fi
OK_HTTPS=0
for i in $(seq 1 20); do
  if curl -s --max-time 6 "https://$HOTE/porte/sante" 2>/dev/null | grep -q '"ok":true'; then OK_HTTPS=1; break; fi
  sleep 3
done
if [ "$OK_HTTPS" = 1 ]; then echo "   ✓ https://$HOTE/porte/sante répond (certificat obtenu)"; else echo "   ✗ https://$HOTE ne répond pas encore : le certificat peut demander une minute — relancer : curl -s https://$HOTE/porte/sante"; fi
if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 -X POST "https://$HOTE/porte/exec" -d '{"cmd":"id"}')" = 401 ]; then echo "   ✓ sans clé, la porte refuse (401)"; fi

if [ -n "$CLE" ]; then
  echo
  echo "════════════════════════════════════════════════════════════════════════"
  echo " LA CLÉ DE LA PORTE — affichée UNE fois. Copie-la dans le formulaire"
  echo " sécurisé de la session Claude (PAS dans la conversation), puis tape : clear"
  echo
  echo "   $CLE"
  echo
  echo "════════════════════════════════════════════════════════════════════════"
else
  echo "   (la clé existante est gardée ; pour la remplacer : --nouvelle-cle)"
fi
