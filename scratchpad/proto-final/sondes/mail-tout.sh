#!/bin/bash
# Rejoue toutes les sondes de la Boîte mail, UNE à la fois (un seul navigateur), et rend le total. Sort en 1 si une sonde tombe.
# Usage : bash scratchpad/proto-final/sondes/mail-tout.sh [dossier-de-captures]
cd "$(dirname "$0")/../../.." || exit 9
export CAP="${1:-${CAP:-/tmp/mail-captures}}"
ko=0; total_ok=0; total_ko=0
for s in defauts montage persistance reconnaissance telephone theme liens roles perf absent visite kit; do
  sortie=$(timeout 290 node scratchpad/proto-final/sondes/mail-$s.js 2>&1); code=$?
  bilan=$(echo "$sortie" | grep -oE '[0-9]+ ✓ · [0-9]+ ✗' | tail -1)
  printf '%-16s %s (code %d)\n' "mail-$s" "${bilan:-sans bilan}" "$code"
  [ $code -ne 0 ] && { ko=1; echo "$sortie" | grep '✗' | head -4; }
  n=$(echo "$bilan" | grep -oE '^[0-9]+'); k=$(echo "$bilan" | grep -oE '· [0-9]+' | grep -oE '[0-9]+')
  total_ok=$((total_ok + ${n:-0})); total_ko=$((total_ko + ${k:-0}))
done
echo "TOTAL : $total_ok ✓ · $total_ko ✗"
exit $ko
