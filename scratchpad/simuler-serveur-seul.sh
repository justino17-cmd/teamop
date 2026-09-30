#!/usr/bin/env bash
# Simulation du déploiement « serveur seul » (étapes 1 à 3 de scripts/preparer-deploiement-serveur.sh), depuis les FICHIERS
# DE TRAVAIL de la branche — sans commit ni envoi. Les bancs de la liste serveur tournent alors contre les pages de `main`
# (l'app.html EN SERVICE) : c'est ce qui dit si le serveur peut partir seul, sans l'application.
# Usage : bash scratchpad/simuler-serveur-seul.sh <dossier-neuf>    (SANS_BANCS=1 : l'arbre seul, pour y muter —
#         scratchpad/mutations-serveur-seul.py). L'arbre se retire par `git worktree remove --force <dossier>`.
set -euo pipefail
RACINE=/home/user/teamop
DEST="$1"
git -C "$RACINE" fetch -q origin main
git -C "$RACINE" worktree add -q --detach "$DEST" origin/main
cd "$DEST"
tar -C "$RACINE/server" --exclude=node_modules -cf - . | tar -C server -xf -
for f in .github/scripts/surveillance.js scripts/bancs-ci.sh scripts/bancs-serveur.liste scripts/preparer-deploiement-serveur.sh \
         .github/workflows/deploiement.yml .github/workflows/ci.yml \
         recap-abonnement.html apercu/recap-abonnement.html merci.html apercu/merci.html tour.html apercu/tour.html; do
  cp "$RACINE/$f" "$f"
done
mapfile -t SUITES < <(grep -vE '^[[:space:]]*(#|$)' scripts/bancs-serveur.liste)
for f in "${SUITES[@]}"; do cp "$RACINE/$f" "$f"; done
node -e '
  const fs = require("fs");
  const avant = "run: bash scripts/bancs-ci.sh\n";
  const apres = "run: BANCS_PLANCHER=$(sed -n \x27s/^#plancher //p\x27 scripts/bancs-serveur.liste) bash scripts/bancs-ci.sh $(grep -vE \x27^[[:space:]]*(#|$)\x27 scripts/bancs-serveur.liste)\n";
  for (const w of [".github/workflows/deploiement.yml", ".github/workflows/ci.yml"]) {
    const s = fs.readFileSync(w, "utf8"); const n = s.split(avant).length - 1;
    if (n !== 1) { console.error("✗ " + w + " : ligne des bancs trouvée " + n + " fois"); process.exit(1); }
    fs.writeFileSync(w, s.replace(avant, apres)); }'
ln -s "$RACINE/server/node_modules" server/node_modules
echo "arbre : $DEST — app.html de main : v$(sed -n "s/.*APP_VERSION *= *'\([0-9]*\)'.*/\1/p" app.html | head -1)"
[ -n "${SANS_BANCS:-}" ] && exit 0
BANCS_PLANCHER="$(sed -n 's/^#plancher //p' scripts/bancs-serveur.liste)" bash scripts/bancs-ci.sh "${SUITES[@]}"
