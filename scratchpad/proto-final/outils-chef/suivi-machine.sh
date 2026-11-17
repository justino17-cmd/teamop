#!/bin/bash
# Relevé de la machine toutes les 15 s, sur le disque qui survit aux redémarrages : pour savoir ce qui précède une chute.
while true; do
  m=$(free -m | awk 'NR==2{print $3" Mo pris, "$7" Mo libres"}')
  c=$(pgrep -fc 'chrome-headless-shell' 2>/dev/null)
  n=$(pgrep -fc '^node ' 2>/dev/null)
  p=$(ps -eo rss,comm --sort=-rss | awk 'NR==2{printf "%d Mo %s", $1/1024, $2}')
  cl=$(ps -eo rss,args | awk '/\/opt\/claude-code\/bin\/claude/ && !/awk/ {s+=$1} END{printf "%d", s/1024}')
  echo "$(date +%H:%M:%S) charge $(cut -d' ' -f1-3 /proc/loadavg) · $m · claude ${cl} Mo · chrome $c · node $n · plus gros : $p" >> /home/user/suivi-machine.log
  sleep 15
done
