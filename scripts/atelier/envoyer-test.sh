#!/usr/bin/env bash
# L'ENVOI D'UNE BRANCHE À L'ESPACE DE TEST (test.teamop.fr), DEPUIS L'ATELIER — 20 novembre 2026, départ de GitHub (scratchpad/demenagement/PLAN.md).
# Lancé par `.forgejo/workflows/deploiement-test.yml` (déclenchement MANUEL, sur la phrase de Justin), dans un dépôt cloné en entier, la branche extraite.
#   bash scripts/atelier/envoyer-test.sh <branche>
# Ce qu'il fait : demande au serveur ce que son miroir possède déjà (« etat »), fabrique un PAQUET GIT (git bundle) de la branche SANS ce que le miroir a déjà,
# et l'envoie sur l'entrée d'une commande forcée (`/usr/local/sbin/deployer-test --ssh` côté serveur) avec « <sha> <branche> ». La clé (~/.ssh/deploiement-test, compte
# atelier) n'ouvre pas de shell : elle ne sait que cela, depuis l'adresse de l'atelier seulement (server/install-test.sh, geste root de Justin).
# ⛔ Le serveur ne va JAMAIS chercher le code : il reçoit ce paquet, le contrôle (taille, `git bundle verify`, tête = le sha) et refuse le reste.
# ⛔ Aucun secret ici ni à l'écran ; la sortie du serveur ne contient ni journal ni configuration (deployer-test.sh).
# Variables pour les BANCS seulement : TEAMOP_TEST_SSH (une commande qui remplace ssh : reçoit la demande en dernier argument, le paquet sur l'entrée).
set -euo pipefail
BRANCHE="${1:-}"
[[ "$BRANCHE" =~ ^[A-Za-z0-9._/-]{1,100}$ ]] || { echo "✗ nom de branche illisible (lettres, chiffres, . _ / - seulement)"; exit 2; }
MAX_OCTETS=$((300 * 1024 * 1024))
if [ -n "${TEAMOP_TEST_SSH:-}" ]; then
  S=("$TEAMOP_TEST_SSH")
else
  K="$HOME/.ssh/deploiement-test"
  [ -s "$K" ] || { echo "✗ la clé de déploiement de l'espace de test manque sur l'atelier ($K)"; exit 1; }
  KH="$(mktemp)"
  # Empreinte attendue : SHA256:roC/SIeqnxPTGhAe/88vEXbcn7oNWQWC0T26mBDv1vQ (celle du serveur des clients, la même que pour le déploiement du serveur)
  printf '%s\n' 'api.teamop.fr ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOx14gh/gaXmkrB1xVioeWjc2MHduIP9T5WRQZntZ+Sn' > "$KH"
  S=(ssh -i "$K" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 -o UserKnownHostsFile="$KH" -o StrictHostKeyChecking=yes root@api.teamop.fr)
fi
P="$(mktemp)"; SORTIE="$(mktemp)"
trap 'rm -f "$P" "$SORTIE" "${KH:-}"' EXIT

SHA="$(git rev-parse --verify --quiet "HEAD^{commit}")" || { echo "✗ pas de commit extrait"; exit 1; }
git update-ref "refs/heads/$BRANCHE" "$SHA"
echo "branche : $BRANCHE · commit : ${SHA:0:8}"

ETAT="$("${S[@]}" etat)" || { echo "✗ le serveur n'a pas répondu à « etat »"; exit 1; }
case "$ETAT" in *"non installé"*) echo "$ETAT"; echo "rien n'est envoyé : l'espace de test n'est pas installé sur le serveur"; exit 0 ;; esac
CONNUS=()
while IFS= read -r l; do
  [[ "$l" =~ ^[0-9a-f]{40}$ ]] && git cat-file -e "$l^{commit}" 2>/dev/null && CONNUS+=("$l")
done <<<"$ETAT"
echo "le miroir du serveur possède ${#CONNUS[@]} tête(s) que l'atelier connaît"

# Ce qu'on n'envoie pas : tout ce que le miroir a déjà. Si la tête demandée y est déjà, on envoie quand même la tête seule (un paquet vide n'existe pas) : ses parents sont connus.
EXCLUS=()
for c in ${CONNUS[@]+"${CONNUS[@]}"}; do [ "$c" = "$SHA" ] || EXCLUS+=("$c"); done
for c in ${CONNUS[@]+"${CONNUS[@]}"}; do
  if [ "$c" = "$SHA" ]; then
    while IFS= read -r parent; do [ -z "$parent" ] || EXCLUS+=("$parent"); done < <(git rev-list --parents -n 1 "$SHA" | cut -d' ' -f2-)
  fi
done
if [ "${#EXCLUS[@]}" -gt 0 ]; then
  git bundle create --quiet "$P" "refs/heads/$BRANCHE" --not "${EXCLUS[@]}" >/dev/null 2>&1 \
    || git bundle create --quiet "$P" "refs/heads/$BRANCHE" >/dev/null 2>&1 || { echo "✗ le paquet n'a pas pu être fabriqué"; exit 1; }
else
  git bundle create --quiet "$P" "refs/heads/$BRANCHE" >/dev/null 2>&1 || { echo "✗ le paquet n'a pas pu être fabriqué"; exit 1; }
fi
TAILLE="$(stat -c %s "$P")"
[ "$TAILLE" -le "$MAX_OCTETS" ] || { echo "✗ paquet de $((TAILLE / 1048576)) Mo : au-delà du plafond de 300 Mo, rien n'est envoyé"; exit 1; }
echo "paquet : $((TAILLE / 1024)) Ko"
"${S[@]}" "$SHA $BRANCHE" < "$P" | tee "$SORTIE"
