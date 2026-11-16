#!/bin/bash
# gestes DANS les fenêtres de chaque tâche (une page neuve par geste). usage : bash taches-absences-niveau2.sh <profil> [qui]
P=${1:-mac}; Q=${2:-marc}; D="$(cd "$(dirname "$0")" && pwd)"
for t in t1 t2 t3 t4 t5 t8 t9 t10 t11 t14; do
  timeout 280 node "$D/taches-absences-balayage.js" $P $Q taches "tDetail('$t')" "fiche-$t" "#calque .panneau" 2>&1 | grep -v "^err 0" 
done
