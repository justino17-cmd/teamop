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

# ⛔ UN VERT DOIT PROUVER QU'IL A REGARDÉ QUELQUE CHOSE (relecture du 17 novembre 2026). Un passage ne compte vert que s'il a rendu le code 0, zéro ✗ ET au moins un ✓ : un banc qui se
# saute (sans `server-msg/node_modules` il écrit « 0 ✓  0 ✗ » et sort en 0) n'a rien joué. Et la série doit être ENTIÈRE : un passage tué avant d'écrire son code de sortie ne laisse
# rien — on compte donc ce qu'on ATTENDAIT (vagues × parallèle), pas ce qu'on trouve.
attendus=$((VAGUES * PARALLELE)); verts=0; chutes=0; min=''; max=''
for v in $(seq 1 "$VAGUES"); do for i in $(seq 1 "$PARALLELE"); do
  f="$SORTIE/passage-$v-$i.txt"; c="$SORTIE/passage-$v-$i.code"
  if [ ! -s "$c" ]; then chutes=$((chutes+1)); echo "──── CHUTE : passage-$v-$i n'a laissé AUCUN code de sortie (tué avant sa fin ?)"; tail -3 "$f" 2>/dev/null | cut -c1-300; continue; fi
  rc=$(cat "$c")
  total=$(grep -oE '[0-9]+ ✓ +[0-9]+ ✗' "$f" | tail -1)
  ok=$(printf '%s' "$total" | grep -oE '^[0-9]+'); ko=$(printf '%s' "$total" | grep -oE '[0-9]+ ✗' | grep -oE '^[0-9]+')
  if [ "$rc" = "0" ] && [ "${ko:-x}" = "0" ] && [ "${ok:-0}" -gt 0 ]; then
    verts=$((verts+1))
    if [ -z "$min" ] || [ "$ok" -lt "$min" ]; then min=$ok; fi
    if [ -z "$max" ] || [ "$ok" -gt "$max" ]; then max=$ok; fi
    continue
  fi
  chutes=$((chutes+1))
  echo "──── CHUTE : $(basename "$f") — code $rc — ${total:-aucun total}$([ "${ok:-0}" = "0" ] && [ "${ko:-x}" = "0" ] && echo ' — AUCUN contrôle joué (le banc s est-il sauté ?)')"
  grep -n -A2 -E '✗|PREMIÈRE CHUTE' "$f" | cut -c1-900 | head -60
done; done
echo "════ $attendus passages attendus, en $((fin-debut)) s (parallèle $PARALLELE, brûleurs $BRULEURS) : $verts verts (de ${min:-0} à ${max:-0} contrôles joués chacun), $chutes chutes"
if [ -n "${ESPION:-}" ]; then
  vides=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -c '"lu"')
  lectures=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -o '"lectures":[0-9]*}' | grep -o '[0-9]*' | awk '{s+=$1} END{print s+0}')
  services=$(cat "$SORTIE"/espion-*.jsonl 2>/dev/null | grep -c '"fin"')
  echo "════ l'espion : $vides lecture(s) illisible(s) du fichier d'horloge, sur $lectures lectures comptées par $services services arrêtés proprement"
  # un zéro sur une population vide ne prouve rien : un espion qui n'a rien vu (journal impossible à écrire, greffon pas chargé) rendrait « 0 lecture illisible » lui aussi
  if [ "$services" = "0" ] || [ "$lectures" = "0" ]; then echo "════ ⛔ l'espion n'a RIEN vu (aucun service, aucune lecture) : son zéro ne prouve rien"; chutes=$((chutes+1)); fi
fi
[ "$chutes" = "0" ] && [ "$verts" = "$attendus" ]
