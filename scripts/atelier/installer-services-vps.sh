#!/usr/bin/env bash
# LE GESTE ROOT QUI SORT OP MESSAGES DE GITHUB (20 novembre 2026) — suite de l'étape 2 du départ de GitHub. SUR LE SERVEUR DES CLIENTS.
#   bash installer-services-vps.sh 'ssh-ed25519 AAAA… atelier-msg-beta'
# 1. Le miroir d'OP MESSAGES (/opt/opmsg/repo) lit désormais le code dans /opt/teamop/repo, la copie que l'atelier tient à jour
#    (teamop-deployer), au lieu de GitHub. Il ne fait que LIRE : /opt/teamop/repo n'est jamais avancé par OP MESSAGES.
# 2. La clé de l'atelier pour la bêta d'OP MESSAGES est autorisée, bridée comme l'ancienne : commande forcée
#    `/opt/opmsg/deployer.sh --seulement=beta`, et en plus depuis l'adresse de l'atelier seulement.
# 3. Les clés que tenait GitHub (ses Actions sont coupées depuis le 19/11) sont RETIRÉES : « deploiement github actions teamop »,
#    « opmsg-deploiement-beta », « teamop-essai-deploiement ». Une clé privée dormante chez un tiers est une porte, pas une sauvegarde.
# ⚠ server-msg/install-msg.sh ne cite JAMAIS /opt/teamop (OP MESSAGES et OP GESTION restent séparés, test-930) : une RÉINSTALLATION
#    d'OP MESSAGES remettrait GitHub comme source — la relancer avec OPMSG_DEPOT=/opt/teamop/repo.
# Une copie d'authorized_keys est gardée. Relancer le script ne crée pas de doublon.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "✗ à lancer en root, sur le serveur des clients"; exit 1; }
CLE="${1:-}"
ATELIER_IP="217.154.229.84"
[[ "$CLE" =~ ^ssh-ed25519\ [A-Za-z0-9+/]{68}\ atelier-msg-beta$ ]] || { echo "✗ clé attendue : « ssh-ed25519 <68 signes> atelier-msg-beta »"; exit 1; }
[ -d /opt/teamop/repo/.git ] || { echo "✗ /opt/teamop/repo n'est pas là : ce n'est pas le serveur des clients"; exit 1; }

if [ -d /opt/opmsg/repo ]; then
  git --git-dir=/opt/opmsg/repo remote set-url origin /opt/teamop/repo
  git -c credential.helper= --git-dir=/opt/opmsg/repo fetch --prune --quiet origin
  echo "✅ miroir d'OP MESSAGES : lit /opt/teamop/repo (main = $(git --git-dir=/opt/opmsg/repo rev-parse --short refs/heads/main))"
else
  echo "(OP MESSAGES n'est pas installé ici : miroir non touché)"
fi

AK=/root/.ssh/authorized_keys
cp -a "$AK" "$AK.avant-services-$(date +%Y%m%d-%H%M%S)"
LIGNE="restrict,from=\"$ATELIER_IP\",command=\"/opt/opmsg/deployer.sh --seulement=beta\" $CLE"
{ grep -vE ' (atelier-msg-beta|deploiement github actions teamop|opmsg-deploiement-beta|teamop-essai-deploiement)$' "$AK" || true; echo "$LIGNE"; } > "$AK.neuf"
chmod 600 "$AK.neuf"; mv "$AK.neuf" "$AK"
echo "✅ clé de l'atelier pour OP MESSAGES bêta autorisée (bridée) ; clés de GitHub retirées"
echo "--- clés autorisées pour root :"
ssh-keygen -lf "$AK"
