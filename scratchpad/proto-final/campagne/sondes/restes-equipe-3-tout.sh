#!/bin/bash
# une section = un navigateur neuf (H finit « comme Julie » : les autres sections ne doivent pas en hériter)
cd "$(dirname "$0")"; tot=0; ko=0
for pr in iphone android petit mac ipad; do for n in "" nuit; do for s in H S I G; do
  [ -n "$n" ] && [ "$s" != "H" ] && [ "$s" != "G" ] && continue
  out=$(timeout 280 node restes-equipe-3-mineurs.js $pr $n $s 2>&1); l=$(echo "$out" | grep -E "^== " | tail -1); echo "$pr $n $s : $l"; echo "$out" | grep -E "^ ✗|ÉCHEC" | head -5
done; done; done
