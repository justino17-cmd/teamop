#!/bin/bash
# Les contrôles d'étape de la voie « entreprise » (à zéro ✗ avant chaque poussée). Usage : bash scratchpad/proto-final/sondes/controles-etape.sh
cd "$(dirname "$0")/../../.." || exit 2; MAL=0
for c in "node scratchpad/proto-final/sondes/compiler-pages.js" "node scripts/verifier-syntaxe.js" "node tests/test-835.js" "node tests/test-836.js" "node tests/test-837.js" "node tests/test-1008.js" "node tests/test-2994.js" "bash scripts/verif-secrets.sh"; do
  $c > /tmp/controle.out 2>&1; code=$?; echo "$c : sortie $code · $(grep -oE '[0-9]+ ✓ +[0-9]+ ✗' /tmp/controle.out | tail -1)"; [ $code -ne 0 ] && { MAL=1; tail -5 /tmp/controle.out; }
done; exit $MAL
