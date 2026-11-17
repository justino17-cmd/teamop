#!/bin/bash
# Rejoue les sondes « Mon entreprise » et « Achats et frais » l'une après l'autre (UN navigateur à la fois), rend 1 si l'une tombe.
# Usage : bash scratchpad/proto-final/sondes/entreprise-tout.sh [sortie]   (RAPIDE=1 : profils réduits pour les sondes qui le supportent)
cd "$(dirname "$0")/../../.." || exit 2
SORTIE=${1:-/tmp/entreprise-tout}; mkdir -p "$SORTIE"; MAL=0
for s in ${SONDES:-structure champs destinations garde-facture liens lecture-seule phrases logo achats-lisible rapide corrections}; do
  timeout 590 node "scratchpad/proto-final/sondes/entreprise-$s.js" > "$SORTIE/$s.out" 2>&1; code=$?
  bilan=$(grep -E '^== [0-9]+ ✓' "$SORTIE/$s.out" | tail -1); echo "$s : ${bilan:-(pas de bilan)} · sortie $code"; [ $code -ne 0 ] && MAL=1
done
exit $MAL
