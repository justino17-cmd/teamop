#!/bin/bash
# Imprime UNE ligne à chaque fois qu'une voie de CETTE machine change d'étape (nouvelle étiquette dans son journal).
# Sert au chef de chantier à passer l'étape SUIVANTE sur une session sœur (une autre machine) : arrêter la voie d'ici (TaskStop)
# dès que la ligne paraît, puis ouvrir la sœur avec les mêmes args plus « depuis ». Lancé par l'outil Monitor (30 min, à réarmer).
W=/root/.claude/projects/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/subagents/workflows
declare -A vu
premier=1
while true; do
  for d in $W/wf_*; do j=$d/journal.jsonl; [ -f "$j" ] || continue
    r=$(basename $d); lab=$(grep -o '"label":"[^"]*"' "$j" | tail -1 | sed 's/"label":"//;s/"$//')
    [ -n "$lab" ] || continue
    if [ "${vu[$r]}" != "$lab" ]; then
      [ $premier -eq 0 ] && echo "$(date +%H:%M) ÉTAPE · $r · ${vu[$r]:-(nouvelle voie)} → $lab"
      vu[$r]="$lab"
    fi
  done
  premier=0
  sleep 20
done
