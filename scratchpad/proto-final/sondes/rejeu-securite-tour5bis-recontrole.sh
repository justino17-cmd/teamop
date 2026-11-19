#!/bin/bash
# Rejeu du recontrôle tour 5 bis : les sondes restes-sécurité des tours 1 à 5 bis, UNE à la fois (un seul navigateur). Journal : /tmp/claude-0/r5/rejeu.log
cd "$(dirname "$0")/../../.." || exit 1
S=scratchpad/proto-final/sondes; SEC=scratchpad/proto-final/securite; J=/tmp/claude-0/r5/rejeu.log; : > "$J"
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  [ -z "$b" ] && { local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); b="$n ✓ · $k ✗ (lignes)"; }
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  echo "$s" | grep -E "^[[:space:]]*✗" | grep -v "== " | head -4 | cut -c1-200 | tee -a "$J"; }
lance restes-garde node $SEC/restes-garde.js
lance tour1_recontrole node $S/restes-securite-tour1-recontrole.js
lance tour2_captures node $S/restes-securite-tour2-captures.js
lance tour2_recontrole node $S/restes-securite-tour2-recontrole.js
lance tour3 node $S/restes-securite-tour3.js
lance tour3_recontrole node $S/restes-securite-tour3-recontrole.js
lance tour4 node $S/restes-securite-tour4.js
lance tour4_a node $S/restes-securite-tour4-recontrole-a.js
lance tour4_b node $S/restes-securite-tour4-recontrole-b.js
lance tour4_c node $S/restes-securite-tour4-recontrole-c.js
lance tour4_d node $S/restes-securite-tour4-recontrole-d.js
lance tour4_pdf node $S/restes-securite-tour4-recontrole-pdf.js
lance tour4_pdf2 node $S/restes-securite-tour4-recontrole-pdf2.js
lance tour4_titre node $S/restes-securite-tour4-titre.js
lance tour5 node $S/restes-securite-tour5.js
lance tour5_compta node $S/restes-securite-tour5-compta.js
lance tour5_recontrole_a node $S/restes-securite-tour5-recontrole-a.js
lance tour5_recontrole_b node $S/restes-securite-tour5-recontrole-b.js
lance tour5bis node $S/restes-securite-tour5bis.js
echo FINI | tee -a "$J"
