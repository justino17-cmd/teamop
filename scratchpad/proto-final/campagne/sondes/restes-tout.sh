#!/bin/bash
# Rejoue les sondes « RESTES » de la campagne (contrats, planning tour 2, tâches · absences · menu, technicien), UNE à la fois (un seul navigateur),
# et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe. Les sondes « restes » de la Boîte mail vivent dans
# scratchpad/proto-final/sondes/restes-tout.sh (même famille, autre dossier) : tout-rejouer.sh joue les deux.
#   bash scratchpad/proto-final/campagne/sondes/restes-tout.sh          # tout
#   RAPIDE=1 bash …/restes-tout.sh                                      # un seul profil par sonde
# Durée visée : 25 minutes au plus. Journal complet : $CAP/restes-tout.log (hors dépôt).
# Écartés : les mutations (*.py, outils d'éprouve de sonde) et les captures à regarder sans contrôle propre ; restes-taches-absences-2-captures.js et
# restes-taches-absences-2-recontrole-captures.js COMPTENT leurs contrôles (l'écran est lu avant chaque capture) : ils sont joués une fois.
# Les sondes « taches-absences » choisissent leurs profils elles-mêmes (iphone, mac, ipad, petit, android selon la partie) : un seul lancement chacune.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-tout}"; mkdir -p "$CAP"; J="$CAP/restes-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
profils(){ if [ -n "$RAPIDE" ]; then echo "$1"; else echo "$@"; fi; }

for p in $(profils mac iphone android); do lance "contrats (tour 1) $p jour" node $S/restes-contrats-1.js $p; done
[ -z "$RAPIDE" ] && lance "contrats (tour 1) iphone nuit" node $S/restes-contrats-1.js iphone nuit
for p in $(profils mac iphone); do lance "contrat composé HT/TTC $p" node $S/restes-contrats-composes.js $p; done

for p in $(profils mac iphone ipad); do lance "planning tour 2 $p jour" node $S/restes-planning-2.js $p; done
[ -z "$RAPIDE" ] && lance "planning tour 2 iphone nuit" node $S/restes-planning-2.js iphone nuit

lance "tâches · absences (tour 1, six parties)" node $S/restes-taches-absences-1.js
lance "tâches · absences : menu de la Comptabilité au téléphone" node $S/restes-taches-absences-1-bureau-tel.js
lance "tâches · absences : recontrôle adverse tour 1" node $S/restes-taches-absences-1-recontrole.js
lance "tâches · absences : recontrôle adverse tour 2" node $S/restes-taches-absences-2-recontrole.js
lance "tâches · absences : panneaux corrigés (tour 2, captures contrôlées)" node $S/restes-taches-absences-2-captures.js
lance "tâches · absences : recontrôle tour 2 (captures contrôlées)" node $S/restes-taches-absences-2-recontrole-captures.js

for p in $(profils iphone android petit mac); do lance "technicien (tour 1) $p jour" node $S/restes-technicien-1.js $p 0; done
[ -z "$RAPIDE" ] && { lance "technicien (tour 1) iphone nuit" node $S/restes-technicien-1.js iphone 1; lance "technicien (tour 1) petit nuit" node $S/restes-technicien-1.js petit 1; }
lance "technicien : pied du menu au doigt, iPad jour" node $S/restes-technicien-2.js ipad 0
[ -z "$RAPIDE" ] && lance "technicien : pied du menu au doigt, iPad nuit" node $S/restes-technicien-2.js ipad 1
echo FINI | tee -a "$J"
exit $ko
