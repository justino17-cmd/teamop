#!/bin/bash
# État de chaque voie d'après SON journal (par run), pas d'après la date du dossier.
W=/root/.claude/projects/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/subagents/workflows
echo "$(date +%H:%M) · debout depuis $(uptime | sed 's/.*up *//;s/,.*//') · charge $(cut -d' ' -f1-3 /proc/loadavg) · relevé : $(pgrep -f suivi-machine.sh | wc -l)"
for d in $W/wf_*; do j=$d/journal.jsonl; [ -f $j ] || continue
  last=$(ls -t $d/*.jsonl 2>/dev/null | head -1); age=$(( ( $(date +%s) - $(date -r "$last" +%s) ) / 60 ))
  [ $age -gt 240 ] && continue
  lab=$(grep -o '"label":"[^"]*"' $j | tail -1 | sed 's/"label":"//;s/"$//'); res=$(grep -c '"type":"result"' $j); lances=$(grep -c '"type":"started"' $j)
  etat="en cours"; [ "$res" -ge "$lances" ] && [ "$lances" -gt 0 ] && etat="FINIE ?"
  printf '%-14s il y a %3d min · %-9s · %s\n' "$(basename $d)" "$age" "$etat" "$lab"
done | sort -k4,4n
