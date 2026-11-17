#!/bin/bash
# Rejoue le RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), une sonde à la fois (un seul navigateur).
#   bash scratchpad/proto-final/sondes/recontrole-tout.sh          → tout
#   RAPIDE=1 bash …/recontrole-tout.sh                            → seulement ce qui ne lance pas de navigateur (fuzz des liens)
# Chaque sonde rend « N ✓ · M ✗ » et sort en 1 si un contrôle tombe ; un ✗ de ce lot est une faille qui reste OUVERTE (ou une casse), pas une erreur de la sonde :
# les ✗ attendus sont listés dans scratchpad/proto-final/securite/recontrole.json. Une sonde qui tombe sur un délai se REJOUE avant d'en conclure quoi que ce soit.
ICI="$(cd "$(dirname "$0")" && pwd)"; SEC="$ICI/../securite"; RACINE="$(cd "$ICI/../../.." && pwd)"; cd "$RACINE"
SONDES="recontrole-liens-fuzz.js"
[ -z "$RAPIDE" ] && SONDES="$SONDES recontrole-nomclient.js recontrole-confiance.js recontrole-casse.js recontrole-url.js recontrole-client.js recontrole-acces-client.js recontrole-fichiers.js recontrole-sortie.js 'recontrole-donnees.js --clics=4 --decal=0' 'recontrole-donnees.js --clics=4 --decal=3 --qui=julie'"
eval "set -- $SONDES"
for g in "$@"; do
  fichier="${g%% *}"; args="${g#"$fichier"}"
  sortie=$(timeout 580 node "$SEC/$fichier" $args 2>&1); code=$?
  OUT="${OPG_SORTIES:-/tmp}"; mkdir -p "$OUT"; echo "$sortie" > "$OUT/$(basename "$fichier" .js)$(echo "$args" | tr -d ' =-').txt"   # la sortie ENTIÈRE se garde : le filtre ci-dessous n'en montre que les échecs
  bilan=$(echo "$sortie" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗' | tail -1)
  echo "$g : ${bilan:-sans bilan} (code $code)"
  echo "$sortie" | grep -E '✗|SORTIE|FUITE|EXÉCUTION' | head -12 | cut -c1-300
done
