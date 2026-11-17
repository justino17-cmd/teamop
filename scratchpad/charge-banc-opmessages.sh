#!/usr/bin/env bash
# SONDE — rejouer un banc d'OP MESSAGES SOUS CHARGE : VAGUES vagues de PARALLELE passages lancés de front, avec BRULEURS processus
# qui occupent les cœurs pendant toute la série. Garde la sortie de chaque passage et dit, pour chaque chute, ce que le banc a
# imprimé (« attendu / obtenu », la mort, le diagnostic).
#
# C'est ce qui a fait sortir l'instabilité de test-981 (17 novembre 2026) : 30 passages verts à six de front, puis 1 chute sur 60
# et 2 sur 120 à douze de front avec quatre brûleurs — et, l'outil corrigé, 60 sur 60. Une machine ne se charge pas en dormant :
# chaque vague attend ses propres processus, jamais une durée.
#
#   bash scratchpad/charge-banc-opmessages.sh <dossier de sortie> [vagues=5] [parallele=6] [bruleurs=0] [banc=tests/test-981.js]
#   ESPION=scratchpad/espion-horloge-opmessages.js bash scratchpad/charge-banc-opmessages.sh /tmp/serie 10 12 4
#       → relève en plus, par passage, chaque lecture ILLISIBLE du fichier d'horloge par un service (<dossier>/espion-V-I.jsonl)
#
# Sort en 1 dès qu'un passage tombe. ⚠️ Rien d'autre ne doit tourner sur la machine (une autre série, la suite complète) : les
# bancs de temps tombent sous la contention, et l'on mesurerait la voisine.
set -uo pipefail
DEPOT="$(cd "$(dirname "$0")/.." && pwd)"
SORTIE="${1:?dossier de sortie}"; VAGUES="${2:-5}"; PARALLELE="${3:-6}"; BRULEURS="${4:-0}"; BANC="${5:-tests/test-981.js}"
mkdir -p "$SORTIE"; rm -f "$SORTIE"/passage-*.txt "$SORTIE"/passage-*.code "$SORTIE"/espion-*.jsonl
SORTIE="$(cd "$SORTIE" && pwd)"
case "${ESPION:-}" in ''|/*) ;; *) ESPION="$DEPOT/$ESPION" ;; esac
cd "$DEPOT"

pids_bruleurs=()
for _ in $(seq 1 "$BRULEURS"); do
  node -e 'for(;;){ let x=0; for(let i=0;i<5e7;i++) x+=i; }' & pids_bruleurs+=($!)
done
arreter_bruleurs() { for p in "${pids_bruleurs[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; }
trap arreter_bruleurs EXIT

debut=$(date +%s)
for v in $(seq 1 "$VAGUES"); do
  pids=()
  for i in $(seq 1 "$PARALLELE"); do
    ( if [ -n "${ESPION:-}" ]; then export NODE_OPTIONS="--require=$ESPION" ESPION_JOURNAL="$SORTIE/espion-$v-$i.jsonl"; fi
      node "$BANC" > "$SORTIE/passage-$v-$i.txt" 2>&1; echo $? > "$SORTIE/passage-$v-$i.code" ) &
    pids+=($!)
  done
  for p in "${pids[@]}"; do wait "$p"; done
done
fin=$(date +%s)
arreter_bruleurs

verts=0; chutes=0
for c in "$SORTIE"/passage-*.code; do
  f="${c%.code}.txt"; rc=$(cat "$c")
  total=$(grep -oE '[0-9]+ ✓ +[0-9]+ ✗' "$f" | tail -1)
  ko=$(printf '%s' "$total" | grep -oE '[0-9]+ ✗' | grep -oE '^[0-9]+')
  if [ "$rc" = "0" ] && [ "${ko:-x}" = "0" ]; then verts=$((verts+1)); continue; fi
  chutes=$((chutes+1))
  echo "──── CHUTE : $(basename "$f") — code $rc — ${total:-aucun total}"
  grep -n -A2 -E '✗|PREMIÈRE CHUTE' "$f" | cut -c1-900 | head -60
done
echo "════ $((verts+chutes)) passages en $((fin-debut)) s (parallèle $PARALLELE, brûleurs $BRULEURS) : $verts verts, $chutes chutes"
if [ -n "${ESPION:-}" ]; then
  vides=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -c '"lu"')
  lectures=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -o '"lectures":[0-9]*}' | grep -o '[0-9]*' | awk '{s+=$1} END{print s+0}')
  services=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -c '"fin"')
  echo "════ l'espion : $vides lecture(s) illisible(s) du fichier d'horloge, sur $lectures lectures comptées par $services services arrêtés proprement"
fi
[ "$chutes" = "0" ]
