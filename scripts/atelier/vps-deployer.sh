#!/usr/bin/env bash
# LE DÉPLOIEMENT DU SERVEUR, REÇU DE L'ATELIER (19 novembre 2026) — étape 2 du départ de GitHub (scratchpad/demenagement/PLAN.md).
# Installé sur le serveur des clients en /usr/local/sbin/teamop-deployer par scripts/atelier/installer-cle-deploiement-vps.sh, et
# lancé UNIQUEMENT comme « commande forcée » de la clé de déploiement de l'atelier (authorized_keys : command=…,from=…,restrict).
# Cette clé n'ouvre donc PAS de shell : elle ne sait faire que deux choses, que ce script lit dans SSH_ORIGINAL_COMMAND :
#   etat              → écrit le commit en service (pour que l'atelier n'envoie que ce qui manque)
#   deployer <sha40>  → lit sur l'entrée un paquet git (git bundle), avance /opt/teamop/repo en avance rapide SEULEMENT jusqu'à <sha>,
#                       relance npm ci si le verrou a changé, redémarre teamop-api et vérifie /health.
# ⛔ Avant : GitHub Actions tenait une clé root SANS restriction. Ici la clé ne peut que déployer un commit qui DESCEND du commit en
#    service (jamais réécrire l'histoire), depuis l'adresse de l'atelier seulement. Rien d'autre ne passe.
# ⛔ Le journal du service ne sort pas d'ici (identifiants d'espaces) : il se lit sur le serveur, par quelqu'un qui y a accès.
set -euo pipefail
REPO="${TEAMOP_REPO:-/opt/teamop/repo}"
SERVICE="${TEAMOP_SERVICE:-teamop-api}"
MAX_OCTETS=$((300 * 1024 * 1024))
export GIT_TERMINAL_PROMPT=0
read -r -a ARGS <<< "${SSH_ORIGINAL_COMMAND:-}"
cd "$REPO"
case "${ARGS[0]:-}" in
  etat)
    git rev-parse HEAD
    exit 0 ;;
  site)
    # LE SITE teamop.fr (19 novembre 2026, étape 3) : l'atelier assemble le site (scripts/assembler-site.sh, liste blanche) et l'envoie
    # en archive tar sur l'entrée. On l'ouvre dans un dossier NEUF, on retire tout lien symbolique ou fichier spécial (un lien vers
    # /etc servi par Caddy serait une fuite), on exige index.html, puis on bascule « actuel » d'un coup. La version d'avant est gardée.
    BASE=/opt/teamop/site; MAXS=$((200 * 1024 * 1024))
    mkdir -p "$BASE"; NEUF="$(mktemp -d "$BASE/v-$(date +%Y%m%d-%H%M%S)-XXXX")"
    head -c "$((MAXS + 1))" | tar -xz --no-same-owner --no-same-permissions -C "$NEUF" -f - || { rm -rf "$NEUF"; echo "✗ archive du site illisible : rien n'est changé"; exit 3; }
    [ "$(du -sb "$NEUF" | cut -f1)" -le "$MAXS" ] || { rm -rf "$NEUF"; echo "✗ site trop gros : rien n'est changé"; exit 3; }
    find "$NEUF" ! -type f ! -type d -delete
    [ -s "$NEUF/index.html" ] && [ -s "$NEUF/404.html" ] || { rm -rf "$NEUF"; echo "✗ index.html ou 404.html manquent : rien n'est changé"; exit 3; }
    chmod -R u=rwX,go=rX "$NEUF"
    ln -sfn "$NEUF" "$BASE/actuel.tmp" && mv -T "$BASE/actuel.tmp" "$BASE/actuel"
    # On garde les deux dernières versions (retour en arrière possible), on efface les autres.
    ls -1d "$BASE"/v-* | sort | head -n -2 | xargs -r rm -rf
    echo "✅ site en place : $(find "$NEUF" -type f | wc -l) fichiers ($(basename "$NEUF"))"
    exit 0 ;;
  deployer)
    ATTENDU="${ARGS[1]:-}"
    [[ "$ATTENDU" =~ ^[0-9a-f]{40}$ ]] || { echo "✗ commit attendu absent ou mal formé"; exit 2; }
    ;;
  *)
    echo "✗ commande refusée : cette clé ne sait que « etat », « deployer <commit> » et « site »"; exit 2 ;;
esac

cd "$REPO"
PAQUET="$(mktemp /tmp/teamop-paquet.XXXXXX)"
trap 'rm -f "$PAQUET"' EXIT
head -c "$((MAX_OCTETS + 1))" > "$PAQUET"
[ "$(stat -c %s "$PAQUET")" -le "$MAX_OCTETS" ] || { echo "✗ paquet trop gros (plus de 300 Mo) : rien n'est touché"; exit 3; }
git bundle verify -q "$PAQUET" >/dev/null 2>&1 || { echo "✗ paquet git invalide ou incomplet (le serveur n'a pas le commit de base) : rien n'est touché"; exit 3; }
git fetch -q "$PAQUET" "+refs/heads/main:refs/depuis-atelier/main"
git cat-file -e "$ATTENDU^{commit}" 2>/dev/null || { echo "✗ le paquet ne contient pas ${ATTENDU:0:8}"; exit 3; }

AVANT="$(git rev-parse HEAD)"
# ⛔ Avance rapide seulement : un commit qui ne descend pas de celui en service est refusé (histoire réécrite, mauvaise branche).
git merge-base --is-ancestor "$AVANT" "$ATTENDU" || { echo "✗ ${ATTENDU:0:8} ne descend pas de ${AVANT:0:8} (en service) : refusé, rien n'est touché"; exit 4; }
git merge --ff-only -q "$ATTENDU"
APRES="$(git rev-parse HEAD)"
[ "$APRES" = "$ATTENDU" ] || { echo "✗ le dépôt est sur ${APRES:0:8} au lieu de ${ATTENDU:0:8}"; exit 4; }
echo "dépôt : ${AVANT:0:8} → ${APRES:0:8}"

if ! git diff --quiet "$AVANT" "$APRES" -- server/package-lock.json server/package.json; then
  echo "dépendances modifiées → npm ci"
  (cd server && npm ci --omit=dev --no-audit --no-fund)
fi
if git diff --quiet "$AVANT" "$APRES" -- server; then
  echo "rien de changé dans server/ : pas de redémarrage"
  exit 0
fi
systemctl restart "$SERVICE"
for _ in $(seq 1 15); do
  if curl -sf --max-time 5 localhost:8080/health >/dev/null; then echo "✅ $SERVICE redémarré sur ${APRES:0:8}, /health répond"; exit 0; fi
  sleep 2
done
systemctl is-active --quiet "$SERVICE" || echo "le service n'est pas actif — lire le journal SUR le serveur : journalctl -u $SERVICE -n 50"
echo "✗ /health ne répond pas après le redémarrage"
exit 5
