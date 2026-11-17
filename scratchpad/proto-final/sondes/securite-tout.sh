#!/bin/bash
# Rejoue TOUTES les gardes de l'audit de sécurité (étape 7, 17 novembre 2026), une à la fois (un seul navigateur), et rend le bilan.
#   bash scratchpad/proto-final/sondes/securite-tout.sh            → les huit gardes
#   RAPIDE=1 bash …/securite-tout.sh                                → seulement celles qui ne lancent pas de navigateur (statique)
# Chaque garde rend « N ✓ · M ✗ » et sort en 1 si un contrôle tombe ; ce script sort en 1 dès qu'une garde tombe, et NOMME laquelle.
# La contre-épreuve (chaque faille remise dans une copie doit faire tomber sa garde) est à part : python3 scratchpad/proto-final/sondes/securite-mutations.py
ICI="$(cd "$(dirname "$0")" && pwd)"; RACINE="$(cd "$ICI/../../.." && pwd)"; cd "$RACINE"
GARDES="securite-statique.js"
[ -z "$RAPIDE" ] && GARDES="$GARDES securite-injection.js securite-fichiers.js securite-acces.js securite-confiance.js securite-liens.js securite-politique.js"
chute=0
for g in $GARDES; do
  sortie=$(timeout 580 node "$ICI/$g" 2>&1); code=$?
  bilan=$(echo "$sortie" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗' | tail -1)
  echo "$g : ${bilan:-sans bilan} (code $code)"
  if [ "$code" != "0" ]; then chute=1; echo "$sortie" | grep -E '✗' | head -6 | cut -c1-240; fi
done
exit $chute
