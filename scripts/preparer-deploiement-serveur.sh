#!/usr/bin/env bash
# ⛔ PRÉPARE — SANS RIEN POUSSER — LE COMMIT QUI DÉPLOIE LE SERVEUR SEUL SUR `main`.
#
# Justin, 23 septembre 2026 : « on ne publie rien en version publique tant que le serveur n'est
# pas fait à part de Firebase ». `app.html` et `sw.js` restent donc en v695 sur `main` ; seul
# `server/` part, avec ce qui le SURVEILLE (`.github/scripts/surveillance.js`, qui lit les champs
# de `/health`) et ce qui le GARDE (les suites de `scripts/bancs-serveur.liste`, lancées par le
# job `bancs` dont le déploiement dépend).
#
# ⛔ CE SCRIPT NE POUSSE RIEN. Pousser sur `main` un commit qui touche `server/**` DÉPLOIE LE VPS
# en quelques minutes, chez tous les clients : c'est une décision de Justin, jamais d'un agent.
# Il fabrique le commit dans un arbre à part, lance les bancs, et affiche la commande — c'est tout.
#
# ⛔ POURQUOI UN SCRIPT PLUTÔT QU'UNE MARCHE À SUIVRE. Le commit mélange trois sources (le `main`
# du moment, le serveur de la branche, deux workflows réécrits) ; le refaire à la main, c'est
# oublier une pièce — et la pièce oubliée est toujours celle qui garde (le `needs`, la liste,
# la surveillance). Relancé demain, il repart du `main` de demain.
#
# Usage : bash scripts/preparer-deploiement-serveur.sh [dossier-de-l-arbre]
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$(git -C "$RACINE" rev-parse HEAD)"
DEST="${1:-$(mktemp -d)/deploiement-serveur}"

# 0. On déploie ce qui est COMMITÉ, jamais un brouillon : un fichier modifié et non commité
#    partirait sans être dans l'historique de la branche, donc sans avoir été relu.
if ! git -C "$RACINE" diff --quiet || ! git -C "$RACINE" diff --cached --quiet; then
  echo "✗ l'arbre de la branche n'est pas propre — commite d'abord (git status)"; exit 1
fi
git -C "$RACINE" fetch -q origin main
[ -e "$DEST" ] && { echo "✗ $DEST existe déjà — donne un autre dossier"; exit 1; }
git -C "$RACINE" worktree add -q --detach "$DEST" origin/main
cd "$DEST"
BASE="$(git rev-parse --short HEAD)"
echo "arbre : $DEST (main = $BASE, branche = ${SOURCE:0:8})"

# 1. Ce qui part : le serveur, sa surveillance, le compteur et sa liste, et les suites de la liste.
git checkout -q "$SOURCE" -- server .github/scripts/surveillance.js scripts/bancs-ci.sh scripts/bancs-serveur.liste
mapfile -t SUITES < <(grep -vE '^[[:space:]]*(#|$)' scripts/bancs-serveur.liste)
# ⚠️ Une liste vide ou tronquée ferait passer la porte sur rien : on exige la population.
[ "${#SUITES[@]}" -ge 25 ] || { echo "✗ la liste des bancs serveur n'a que ${#SUITES[@]} suite(s)"; exit 1; }
for f in "${SUITES[@]}"; do git checkout -q "$SOURCE" -- "$f"; done

# 2. Les deux workflows de la branche — la ligne des bancs lance la LISTE, pas tout (voir
#    l'en-tête de la liste). ⚠️ Remplacement exact, compté : un workflow dont la ligne a changé
#    de forme ne doit pas partir tel quel, avec la suite complète qui tomberait à chaque poussée.
git checkout -q "$SOURCE" -- .github/workflows/deploiement.yml .github/workflows/ci.yml
node -e '
  const fs = require("fs");
  const avant = "run: bash scripts/bancs-ci.sh\n";
  const apres = "run: bash scripts/bancs-ci.sh $(grep -vE \x27^[[:space:]]*(#|$)\x27 scripts/bancs-serveur.liste)\n";
  for (const w of [".github/workflows/deploiement.yml", ".github/workflows/ci.yml"]) {
    const s = fs.readFileSync(w, "utf8");
    const n = s.split(avant).length - 1;
    if (n !== 1) { console.error("✗ " + w + " : ligne des bancs trouvée " + n + " fois"); process.exit(1); }
    fs.writeFileSync(w, s.replace(avant, apres));
  }'

# 3. Les preuves, dans cet arbre-là — contre les pages que `main` sert VRAIMENT.
[ -d "$RACINE/server/node_modules" ] || { echo "✗ $RACINE/server/node_modules manque : les suites qui montent le serveur SAUTERAIENT, vertes sans rien prouver"; exit 1; }
ln -s "$RACINE/server/node_modules" server/node_modules
for f in server/*.js; do node --check "$f"; done
node scripts/verifier-syntaxe.js >/dev/null
bash scripts/bancs-ci.sh "${SUITES[@]}"
rm server/node_modules

# 4. Le commit — dans l'arbre à part, JAMAIS poussé par ce script.
git add server .github/scripts/surveillance.js .github/workflows/deploiement.yml .github/workflows/ci.yml \
        scripts/bancs-ci.sh scripts/bancs-serveur.liste "${SUITES[@]}"
git -c user.name="$(git -C "$RACINE" config user.name || echo TeamOP)" \
    -c user.email="$(git -C "$RACINE" config user.email || echo noreply@teamop.fr)" \
    commit -q -F - <<MSG
Serveur seul : déploiement depuis ${SOURCE:0:8} (app.html et sw.js restent en v695)

server/, sa surveillance (.github/scripts/surveillance.js) et ses bancs
(scripts/bancs-serveur.liste, lancés par le job « bancs » dont le déploiement dépend).
Préparé par scripts/preparer-deploiement-serveur.sh sur main = $BASE.
MSG
echo
git --no-pager diff --stat "$BASE" HEAD | tail -5
echo
echo "✓ commit prêt : $(git rev-parse --short HEAD) — RIEN N'A ÉTÉ POUSSÉ."
echo "  ⛔ Pousser déploie le VPS chez tous les clients. Sur décision de Justin seulement :"
echo "     git -C \"$DEST\" push origin HEAD:main"
