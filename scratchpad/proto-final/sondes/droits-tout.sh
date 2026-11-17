#!/bin/bash
# Rejoue les sondes des DROITS l'une après l'autre (UN navigateur à la fois), rend 1 si l'une tombe.
# Usage : bash scratchpad/proto-final/sondes/droits-tout.sh [sortie]   (SONDES="menus table …" pour en choisir)
cd "$(dirname "$0")/../../.." || exit 2
SORTIE=${1:-/tmp/droits-tout}; mkdir -p "$SORTIE"; MAL=0
for s in ${SONDES:-table menus cases-voir formes lecture-seule partiel fiche restauration soi-meme acteur fabrication-css gestes-reels gestes-garde specifiques ponts bureau-toutes-cases}; do
  f="scratchpad/proto-final/sondes/droits-$s.js"; [ -f "$f" ] || { echo "$s : ABSENTE"; MAL=1; continue; }
  timeout 590 node "$f" > "$SORTIE/$s.out" 2>&1; code=$?
  bilan=$(grep -E '^== [0-9]+ ✓' "$SORTIE/$s.out" | tail -1); echo "$s : ${bilan:-(pas de bilan)} · sortie $code"; [ $code -ne 0 ] && MAL=1
done
exit $MAL
