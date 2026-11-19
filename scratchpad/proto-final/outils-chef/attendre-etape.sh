#!/bin/bash
# Attend qu'une voie (un run) atteigne l'étape N (étiquette « voie:N:nom » dans son journal), ou qu'elle soit finie.
# Sort tout de suite si c'est déjà le cas ; borné à 3 h. Une seule ligne en sortie : c'est la notification.
#   /home/user/attendre-etape.sh wf_cb393850-8a2 6
W=/root/.claude/projects/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/subagents/workflows
j=$W/$1/journal.jsonl; N=$2; fin=$(( $(date +%s) + 10800 ))
while [ $(date +%s) -lt $fin ]; do
  [ -f "$j" ] || { echo "✗ journal absent : $1"; exit 1; }
  lab=$(grep -o '"label":"[^"]*"' "$j" | tail -1 | sed 's/"label":"//;s/"$//'); n=$(echo "$lab" | cut -d: -f2)
  res=$(grep -c '"type":"result"' "$j"); lances=$(grep -c '"type":"started"' "$j")
  if [ "${n:-0}" -ge "$N" ] 2>/dev/null; then echo "$(date +%H:%M) · $1 est à l'étape $n : $lab"; exit 0; fi
  # « finie » doit tenir DEUX relevés de suite : entre deux étapes, le journal a un instant autant de résultats que de départs.
  if [ "$res" -ge "$lances" ] && [ "$lances" -gt 0 ]; then calme=$(( ${calme:-0} + 1 )); else calme=0; fi
  if [ "${calme:-0}" -ge 3 ]; then echo "$(date +%H:%M) · $1 paraît FINIE ou arrêtée à : $lab"; exit 0; fi
  sleep 20
done
echo "$(date +%H:%M) · délai de 3 h écoulé, $1 toujours à : $lab"; exit 2
