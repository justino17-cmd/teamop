#!/usr/bin/env bash
# LES GESTES EN ROOT de l'atelier, en une fois : met la forge derrière Caddy (HTTPS), la fait tenir par systemd, remet la porte
# à jour et la durcit, ferme l'interface d'administration de Caddy, pose fail2ban et la copie nocturne du code.
#   git clone --depth 1 -b <branche> https://github.com/justino17-cmd/teamop.git /root/outils-teamop     # une copie à ROOT
#   bash /root/outils-teamop/scripts/atelier/installer-forge-racine.sh atelier.teamop.fr git.teamop.fr
# ⛔ SE LANCE DEPUIS UNE COPIE QUI APPARTIENT À ROOT, jamais depuis /home/atelier : le compte « atelier » est celui par lequel
# une session Claude travaille ; un script qu'il peut modifier et que root exécute, c'est lui donner root (relecture de gardien).
set -euo pipefail
PORTE="${1:-}"; FORGE="${2:-}"
nom_ok() { [[ "$1" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$ ]]; }
if ! nom_ok "$PORTE" || ! nom_ok "$FORGE"; then echo "usage : bash installer-forge-racine.sh <nom de la porte> <nom de la forge>   (atelier.teamop.fr git.teamop.fr)"; exit 1; fi
if [ "$(id -u)" != 0 ]; then echo "✗ à lancer en root, sur le serveur d'atelier"; exit 1; fi
ICI="$(cd "$(dirname "$0")" && pwd)"
for f in "$ICI" "$ICI/porte.js" "$0"; do if [ "$(stat -c %U "$f")" != root ]; then echo "✗ $f n'appartient pas à root : lancer ce script depuis une copie de root (voir l'en-tête)"; exit 1; fi; done
case "$ICI" in /home/*) echo "✗ ce script ne se lance pas depuis un dossier personnel"; exit 1;; esac
for h in "$PORTE" "$FORGE"; do case "$h" in teamop.fr|www.teamop.fr|api.teamop.fr|msg*.teamop.fr) echo "✗ $h est une adresse de production"; exit 1;; esac; done
if [ -d /opt/teamop ] || [ -d /etc/teamop ] || systemctl list-unit-files 2>/dev/null | grep -qE '^teamop-(api|msg)'; then echo "✗ ce serveur porte la production : rien de ceci ne s'y installe"; exit 1; fi
if id -nG atelier 2>/dev/null | tr ' ' '\n' | grep -qxE 'sudo|docker|lxd|adm|disk|root'; then echo "✗ le compte atelier est dans un groupe d'administration : à retirer d'abord"; exit 1; fi
# Le PROGRAMME, pas ses voisins : le dossier garde aussi l'empreinte et la signature du téléchargement (forgejo-….sha256, .asc).
BIN="$(ls /home/atelier/forge/bin/ 2>/dev/null | grep -E '^forgejo-[0-9]+(\.[0-9]+)*$' | sort -V | tail -1 || true)"
[ -n "$BIN" ] && BIN="/home/atelier/forge/bin/$BIN"
[ -x "$BIN" ] || { echo "✗ la forge n'est pas installée dans /home/atelier/forge (forge-installer.sh d'abord)"; exit 1; }

echo "── [1/7] Les deux noms mènent-ils à ce serveur ?"
IP_MOI="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
for h in "$PORTE" "$FORGE"; do IP_NOM="$(getent ahostsv4 "$h" 2>/dev/null | awk '{print $1; exit}' || true)"
  if [ "$IP_NOM" != "$IP_MOI" ]; then echo "✗ $h mène à « ${IP_NOM:-nulle part} », pas à ce serveur ($IP_MOI) : poser ou attendre l'enregistrement DNS (type A)."; exit 1; fi; done
echo "   oui ($IP_MOI)"

echo "── [2/7] La porte : version à jour, service durci…"
install -m 644 -o root -g root "$ICI/porte.js" /opt/atelier-porte/porte.js
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
KillMode=process
NoNewPrivileges=yes
CapabilityBoundingSet=
RestrictSUIDSGID=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
LockPersonality=yes
TasksMax=8192

[Install]
WantedBy=multi-user.target
UNITE

echo "── [3/7] La forge : tenue par systemd…"
cat > /etc/systemd/system/atelier-forge.service <<UNITE
[Unit]
Description=Forge de l'atelier (Forgejo)
After=network.target

[Service]
User=atelier
WorkingDirectory=/home/atelier/forge
Environment=HOME=/home/atelier
Environment=USER=atelier
ExecStart=$BIN --config /home/atelier/forge/conf/app.ini --work-path /home/atelier/forge/data web
Restart=always
RestartSec=3
NoNewPrivileges=yes
CapabilityBoundingSet=
RestrictSUIDSGID=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
ProtectControlGroups=yes
LockPersonality=yes

[Install]
WantedBy=multi-user.target
UNITE
pkill -u atelier -f 'forgejo-[0-9.]* .*web' 2>/dev/null || true; sleep 1
systemctl daemon-reload
systemctl enable -q atelier-forge atelier-porte
systemctl restart atelier-forge atelier-porte
for i in $(seq 1 40); do curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/api/healthz && break; sleep 0.5; done
curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/api/healthz || { echo "✗ la forge ne démarre pas sous systemd :"; systemctl status atelier-forge --no-pager 2>&1 | sed -n '3,6p'; exit 1; }

echo "── [4/7] Caddy : les deux noms, interface d'administration fermée…"
[ -f /etc/caddy/Caddyfile ] && cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.avant-$(date +%Y%m%d-%H%M%S)"
cat > /etc/caddy/Caddyfile.neuf <<CADDY
{
	# L'interface d'administration de Caddy écoute par défaut sur 127.0.0.1:2019, sans clé : tout compte du serveur pourrait
	# réécrire la configuration. Fermée ; un changement de ce fichier s'applique par « systemctl restart caddy ».
	admin off
	servers {
		timeouts {
			read_header 10s
			read_body 60s
		}
	}
}

$PORTE {
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

$FORGE {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		-Server
	}
	request_body {
		max_size 512MB
	}
	reverse_proxy 127.0.0.1:3000
}
CADDY
if caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.neuf >/dev/null 2>&1; then mv /etc/caddy/Caddyfile.neuf /etc/caddy/Caddyfile; else echo "✗ configuration de Caddy refusée (l'ancienne reste en place) :"; caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.neuf 2>&1 | tail -3; exit 1; fi
systemctl enable -q caddy && systemctl restart caddy

echo "── [5/7] fail2ban (essais de connexion SSH)…"
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban >/dev/null 2>&1 && systemctl enable -q --now fail2ban && echo "   ✓ actif" || echo "   ⚠ fail2ban non installé"

echo "── [6/7] La copie du code, chaque nuit (GitHub → copie → forge, tant que GitHub reste la source)…"
cat > /opt/atelier-porte/miroir.sh <<'MIROIR'
#!/usr/bin/env bash
# Rafraîchit la copie complète du code et la pousse dans la forge. Lancé chaque nuit sous le compte atelier.
set -uo pipefail
M=/home/atelier/miroir/teamop.git; J=/home/atelier/forge/secrets/claude.jeton
git -C "$M" remote update --prune >/dev/null 2>&1 || { echo "miroir : GitHub injoignable"; exit 1; }
git -C "$M" -c http.extraHeader="Authorization: token $(cat "$J")" push -q --prune http://127.0.0.1:3000/teamop/teamop.git '+refs/heads/*:refs/heads/*' '+refs/tags/*:refs/tags/*' 2>&1 | tail -2
echo "miroir : $(git -C "$M" for-each-ref refs/heads | wc -l) branches, main $(git -C "$M" rev-parse --short refs/heads/main)"
MIROIR
chmod 755 /opt/atelier-porte/miroir.sh
cat > /etc/systemd/system/atelier-miroir.service <<'UNITE'
[Unit]
Description=Copie nocturne du code (GitHub vers la forge de l'atelier)
[Service]
Type=oneshot
User=atelier
ExecStart=/opt/atelier-porte/miroir.sh
UNITE
cat > /etc/systemd/system/atelier-miroir.timer <<'UNITE'
[Unit]
Description=Copie nocturne du code
[Timer]
OnCalendar=*-*-* 03:17:00
Persistent=true
[Install]
WantedBy=timers.target
UNITE
systemctl daemon-reload && systemctl enable -q --now atelier-miroir.timer && echo "   ✓ chaque nuit à 3 h 17"

echo "── [7/7] Vérifications…"
sleep 2
v() { if [ "$2" = "$3" ]; then echo "   ✓ $1"; else echo "   ✗ $1 (reçu $2, attendu $3)"; fi; }
v "le service de la porte répond" "$(curl -s --max-time 5 http://127.0.0.1:7070/porte/sante | grep -c '"ok":true')" 1
v "la forge répond sur le serveur" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/api/healthz)" 200
OK=0; for i in $(seq 1 25); do [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 "https://$FORGE/api/healthz" 2>/dev/null)" = 200 ] && { OK=1; break; }; sleep 3; done
v "https://$FORGE répond (certificat obtenu)" "$OK" 1
v "https://$PORTE/porte/sante répond toujours" "$(curl -s --max-time 8 "https://$PORTE/porte/sante" | grep -c '"ok":true')" 1
v "sans clé, la porte refuse" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -X POST "https://$PORTE/porte/exec" -d '{"cmd":"id"}')" 401
v "sans compte, la forge ne montre pas le code" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$FORGE/api/v1/repos/teamop/teamop")" 403
v "l'interface d'administration de Caddy est fermée" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:2019/config/ 2>/dev/null || true)" 000
v "un compte ne peut pas lire la mémoire d'un autre processus (ptrace_scope)" "$([ "$(cat /proc/sys/kernel/yama/ptrace_scope 2>/dev/null || echo 0)" -ge 1 ] && echo oui || echo non)" oui
echo
echo "Reste à faire par toi, sans rien coller dans la conversation :"
echo "  1. Ouvrir https://$FORGE , compte « justin », mot de passe provisoire :  grep -i password /home/atelier/forge/secrets/justin.creation"
echo "     (il te sera demandé d'en choisir un nouveau)."
echo "  2. Poser le jeton de Claude dans les secrets réseau de l'environnement (type Bearer, site $FORGE) :"
echo "     cat /home/atelier/forge/secrets/claude.jeton      puis :  clear"
