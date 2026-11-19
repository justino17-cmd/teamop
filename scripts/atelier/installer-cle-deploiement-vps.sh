#!/usr/bin/env bash
# LE GESTE ROOT DE L'ÉTAPE 2 du départ de GitHub (scratchpad/demenagement/PLAN.md), à lancer UNE fois SUR LE SERVEUR DES CLIENTS.
# Il pose /usr/local/sbin/teamop-deployer (scripts/atelier/vps-deployer.sh) et autorise la clé de déploiement de l'atelier, mais
# BRIDÉE : elle ne peut lancer que ce script (« etat » ou « deployer <commit> »), seulement depuis l'adresse de l'atelier, sans
# shell, sans tunnel, sans transfert. Ce n'est PAS une seconde porte root : c'est un bouton « déployer ».
#   bash installer-cle-deploiement-vps.sh 'ssh-ed25519 AAAA… atelier-deploiement-serveur'
# La clé publique passe en argument (une clé publique n'est pas un secret). Relancer le script remplace la ligne, sans doublon.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "✗ à lancer en root, sur le serveur des clients"; exit 1; }
ICI="$(cd "$(dirname "$0")" && pwd)"
CLE="${1:-}"
ATELIER_IP="217.154.229.84"
[[ "$CLE" =~ ^ssh-ed25519\ [A-Za-z0-9+/]{68}\ atelier-deploiement-serveur$ ]] || { echo "✗ clé attendue : « ssh-ed25519 <68 signes> atelier-deploiement-serveur »"; exit 1; }
[ -d /opt/teamop/repo/.git ] || { echo "✗ /opt/teamop/repo n'est pas là : ce n'est pas le serveur des clients"; exit 1; }
bash -n "$ICI/vps-deployer.sh" || { echo "✗ vps-deployer.sh ne se lit pas"; exit 1; }

install -o root -g root -m 755 "$ICI/vps-deployer.sh" /usr/local/sbin/teamop-deployer
AK=/root/.ssh/authorized_keys
cp -a "$AK" "$AK.avant-cle-atelier"
LIGNE="command=\"/usr/local/sbin/teamop-deployer\",from=\"$ATELIER_IP\",restrict $CLE"
{ grep -v ' atelier-deploiement-serveur$' "$AK.avant-cle-atelier" || true; echo "$LIGNE"; } > "$AK.neuf"
chmod 600 "$AK.neuf"; mv "$AK.neuf" "$AK"
echo "✅ /usr/local/sbin/teamop-deployer posé ; clé de l'atelier autorisée, bridée (commande forcée, depuis $ATELIER_IP seulement)"
echo "--- clés autorisées pour root :"
ssh-keygen -lf "$AK"
