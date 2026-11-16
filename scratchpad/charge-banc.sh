#!/bin/bash
# ══ UN BANC SOUS CHARGE : N passages en parallèle, plusieurs tours, pendant que des processus occupent les cœurs ══════════════
#
# Pourquoi : un banc vert à vide ne dit rien d'une CI chargée. `tests/test-981.js` (les appels à deux d'OP MESSAGES) passait
# 12 fois sur 12 à vide et tombait 8 fois sur 80 ici (16 novembre 2026) — trois courses dans les outils du banc, aucune dans
# le service. « Une course de banc se joue au geste, jamais au chronomètre » : ce lanceur est la façon de le vérifier.
#
#   bash scratchpad/charge-banc.sh tests/test-981.js            # 3 tours × 20 passages, 12 brûleurs : 60 passages
#   bash scratchpad/charge-banc.sh tests/test-981.js 4 20 12    # tours, passages en parallèle, brûleurs
#   BANC_TEMPS=1 bash scratchpad/charge-banc.sh tests/test-981.js   # garde aussi les temps réels que le banc imprime
#
# La sortie de chaque passage ROUGE est gardée (dossier imprimé à la fin) ; un passage vert n'en laisse pas. Code de sortie :
# 0 si tous verts, 1 sinon. ⚠️ Vert = code de sortie 0 du banc (pas son bandeau : un banc qui meurt après son total n'est pas vert).
# ⚠️ Ne rien lancer d'autre pendant ce temps : c'est une mesure sous charge, et elle charge la machine pour tout le monde.
BANC=${1:?usage : charge-banc.sh <banc> [tours] [parallele] [bruleurs]}
TOURS=${2:-3}; PAR=${3:-20}; BRUL=${4:-12}
OUT=$(mktemp -d "${TMPDIR:-/tmp}/charge-banc-XXXXXX")
pids=()
for _ in $(seq 1 "$BRUL"); do node -e 'for(;;){}' & pids+=($!); done
trap 'kill "${pids[@]}" 2>/dev/null' EXIT
verts=0; rouges=0
for t in $(seq 1 "$TOURS"); do
  jobs=()
  for p in $(seq 1 "$PAR"); do
    ( timeout 600 node "$BANC" > "$OUT/t$t-p$p.txt" 2>&1; echo $? > "$OUT/t$t-p$p.code" ) &
    jobs+=($!)
  done
  wait "${jobs[@]}"
  for p in $(seq 1 "$PAR"); do
    c=$(cat "$OUT/t$t-p$p.code"); b=$(grep -oE '[0-9]+ ✓ +[0-9]+ ✗' "$OUT/t$t-p$p.txt" | tail -1)
    grep -h "temps réels" "$OUT/t$t-p$p.txt" >> "$OUT/temps.txt" 2>/dev/null
    if [ "$c" = 0 ]; then verts=$((verts+1)); rm -f "$OUT/t$t-p$p.txt" "$OUT/t$t-p$p.code"; else rouges=$((rouges+1)); echo "ROUGE tour $t passage $p : code $c, $b → $OUT/t$t-p$p.txt"; fi
  done
done
echo "TOTAL : $verts verts, $rouges rouges ($TOURS tours × $PAR en parallèle, $BRUL brûleurs) — sorties : $OUT"
[ "$rouges" = 0 ]
