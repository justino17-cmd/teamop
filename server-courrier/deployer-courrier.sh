#!/usr/bin/env bash
# Déployeur d'OP Courrier — posé par `install-courrier.sh` dans /opt/opcourrier/deployer.sh (root).
# Usage : /opt/opcourrier/deployer.sh <beta|prod> <sha de 40 hexadécimaux>
# Par la CI (workflow « Déploiement d'OP Courrier ») : clé SSH à commande forcée sur ce fichier ; la demande arrive dans SSH_ORIGINAL_COMMAND.
# Il met à jour le miroir, installe les dépendances, redémarre, contrôle que /health rend LE BON SHA, sinon revient en arrière.
# ⛔ Il n'affiche jamais de journal ni de configuration (la sortie d'un job GitHub est publique) : seulement l'état de /health.
set -euo pipefail
if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  case "$SSH_ORIGINAL_COMMAND" in *$'\n'*|*$'\r'*) echo "refusé : une seule ligne"; exit 2 ;; esac
  read -r CIBLE SHA RESTE <<<"$SSH_ORIGINAL_COMMAND" || true
  [ -z "${RESTE:-}" ] || { echo "refusé : trop de mots"; exit 2; }
else
  CIBLE="${1:-}"; SHA="${2:-}"
fi
[[ "$CIBLE" =~ ^(beta|prod)$ ]] || { echo "refusé : beta ou prod"; exit 2; }
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "refusé : SHA complet (40 hexadécimaux)"; exit 2; }
PORT="$(sed -n "s/^Environment=PORT=//p" "/etc/systemd/system/opcourrier-$CIBLE.service" 2>/dev/null | head -1)"
[[ "$PORT" =~ ^[0-9]{4,5}$ ]] || { echo "refusé : $CIBLE n est pas installé (unité introuvable)"; exit 2; }
MIROIR=/opt/opcourrier/repo; UNITE="opcourrier-$CIBLE"
exec 9>/var/lock/opcourrier-deploiement; flock -n 9 || { echo "refusé : un déploiement est déjà en cours"; exit 3; }
AVANT="$(git -C "$MIROIR" rev-parse HEAD)"
git -C "$MIROIR" fetch -q origin
git -C "$MIROIR" cat-file -e "$SHA^{commit}" 2>/dev/null || { echo "refusé : ce commit n'existe pas dans le dépôt"; exit 2; }
bascule() {
  git -C "$MIROIR" checkout -q --detach "$1"
  ( cd "$MIROIR/server-courrier" && npm ci --omit=dev --ignore-scripts --no-audit --no-fund >/dev/null )
  printf '[Service]\nEnvironment=OPCOURRIER_SHA=%s\n' "$1" > "/etc/systemd/system/$UNITE.service.d/sha.conf"
  systemctl daemon-reload; systemctl restart "$UNITE"
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do sleep 1; R="$(curl -fsS "http://127.0.0.1:$PORT/health" 2>/dev/null || true)"; case "$R" in *"\"sha\":\"$1\""*) return 0 ;; esac; done
  return 1
}
if bascule "$SHA"; then echo "✓ $UNITE sert $SHA"; else echo "✗ $UNITE ne sert pas $SHA — retour à $AVANT"; bascule "$AVANT" || echo "✗ le retour a échoué aussi"; exit 1; fi
