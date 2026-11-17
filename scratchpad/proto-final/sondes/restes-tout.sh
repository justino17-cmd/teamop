#!/bin/bash
# Rejoue les sondes « RESTES » de la BOÎTE MAIL (tours 1 et 2 et leurs recontrôles adverses), UNE à la fois (un seul navigateur), et dit pour chacune
# « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe. Les autres sondes « restes » (contrats, planning, tâches, technicien) vivent dans
# scratchpad/proto-final/campagne/sondes/restes-tout.sh : tout-rejouer.sh joue les deux.
#   bash scratchpad/proto-final/sondes/restes-tout.sh          # tout
#   RAPIDE=1 bash …/restes-tout.sh                             # le tour 1 et le tour 2 seulement (pas les recontrôles)
# Chaque sonde se joue PARTIE par PARTIE (variable PARTIE=1…6, comme mail-tout.sh joue corr-telephone) : une partie tient dans le délai, la sonde entière non.
# Durée visée : 25 minutes au plus. Journal complet : $CAP/restes-mail-tout.log (hors dépôt). Écartés : les mutations (*.py, outils d'éprouve de sonde).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-mail-tout}"; mkdir -p "$CAP"; J="$CAP/restes-mail-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for n in 1 2 3 4 5; do lance "mail tour 1 partie $n" PARTIE=$n node $S/restes-mail-tour1.js; done
lance "mail tour 2 (paysage court, sept tailles)" node $S/restes-mail-tour2.js
if [ -z "$RAPIDE" ]; then
  for n in 1 2 3 4 5 6; do lance "mail tour 1 recontrôle partie $n" PARTIE=$n node $S/restes-mail-tour1-recontrole.js; done
  for n in 1 2 3 4 5; do lance "mail tour 2 recontrôle partie $n" PARTIE=$n node $S/restes-mail-tour2-recontrole.js; done
fi
echo FINI | tee -a "$J"
exit $ko
