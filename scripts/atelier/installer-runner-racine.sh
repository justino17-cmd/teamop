#!/usr/bin/env bash
# LE GESTE EN ROOT de l'étape 1 du départ de GitHub (scratchpad/demenagement/PLAN.md) : fait tenir par systemd l'exécuteur des
# vérifications de la forge (forgejo-runner), déjà téléchargé, vérifié (sha256) et enregistré par le compte « atelier » dans
# /home/atelier/runner. Il tourne SOUS LE COMPTE atelier, jamais en root : un travail de la forge n'a pas plus de droits qu'une
# commande de la porte.
#   git clone --depth 1 -b <branche> https://github.com/justino17-cmd/teamop.git /root/outils-teamop     # une copie à ROOT
#   bash /root/outils-teamop/scripts/atelier/installer-runner-racine.sh
# ⛔ SE LANCE DEPUIS UNE COPIE QUI APPARTIENT À ROOT (même règle que installer-forge-racine.sh).
set -euo pipefail
if [ "$(id -u)" != 0 ]; then echo "✗ à lancer en root, sur le serveur d'atelier"; exit 1; fi
ICI="$(cd "$(dirname "$0")" && pwd)"
for f in "$ICI" "$0"; do if [ "$(stat -c %U "$f")" != root ]; then echo "✗ $f n'appartient pas à root : lancer ce script depuis une copie de root"; exit 1; fi; done
case "$ICI" in /home/*) echo "✗ ce script ne se lance pas depuis un dossier personnel"; exit 1;; esac
if [ -d /opt/teamop ] || [ -d /etc/teamop ] || systemctl list-unit-files 2>/dev/null | grep -qE '^teamop-(api|msg)'; then echo "✗ ce serveur porte la production : rien de ceci ne s'y installe"; exit 1; fi
if id -nG atelier 2>/dev/null | tr ' ' '\n' | grep -qxE 'sudo|docker|lxd|adm|disk|root'; then echo "✗ le compte atelier est dans un groupe d'administration : à retirer d'abord"; exit 1; fi
R=/home/atelier/runner
[ -x "$R/bin/forgejo-runner" ] && [ -s "$R/.runner" ] && [ -s "$R/config.yml" ] || { echo "✗ l'exécuteur n'est pas prêt dans $R (téléchargé, enregistré, réglé) : à faire d'abord par le compte atelier"; exit 1; }

echo "── [1/2] Le service…"
cat > /etc/systemd/system/atelier-runner.service <<'UNITE'
[Unit]
Description=Exécuteur des vérifications de la forge (forgejo-runner, compte atelier)
After=network-online.target atelier-forge.service
Wants=network-online.target

[Service]
User=atelier
Group=atelier
WorkingDirectory=/home/atelier/runner
Environment=HOME=/home/atelier
ExecStart=/home/atelier/runner/bin/forgejo-runner daemon --config /home/atelier/runner/config.yml
Restart=always
RestartSec=5
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
systemctl daemon-reload
systemctl enable --now atelier-runner.service

echo "── [2/2] Il tourne ?"
sleep 3
if systemctl is-active --quiet atelier-runner.service; then echo "✅ atelier-runner actif (compte atelier) — les envois vers la forge lancent les vérifications"; else echo "✗ le service ne tient pas :"; journalctl -u atelier-runner -n 20 --no-pager; exit 1; fi
