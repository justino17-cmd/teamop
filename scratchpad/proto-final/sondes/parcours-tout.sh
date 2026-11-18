#!/bin/bash
# Rejoue TOUS les parcours de « UNE SEMAINE DE L'ENTREPRISE » (17 novembre 2026), une sonde à la fois (un seul navigateur sur la machine), et dit pour chacune :
#   <durée>s code=<sortie> <nom> :: <N ✓ · M ✗>
# puis FINI. Sort en 1 si une exécution tombe. Réglages : PROFILS="mac iphone" (les profils des parcours 1 à 11 ; le parcours 12 joue lui-même les téléphones et l'iPad),
# SONDES="parcours-3 parcours-7" pour n'en jouer que quelques-unes, NUIT=1 pour la nuit. Journal complet : $CAP/parcours-tout.log (hors dépôt).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI" || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/parcours}"; mkdir -p "$CAP"; LOG="$CAP/parcours-tout.log"; : > "$LOG"
PROFILS="${PROFILS:-mac iphone}"; MAL=0
for n in 1 2 3 4 5 6 7 8 9 10 11 12; do
  nom="parcours-$n"
  if [ -n "$SONDES" ]; then case " $SONDES " in *" $nom "*) ;; *) continue ;; esac; fi
  profils="$PROFILS"; [ "$n" = 12 ] && profils="(téléphones)"
  for pr in $profils; do
    t0=$(date +%s)
    if [ "$n" = 12 ]; then timeout 2900 node "$nom.js" > /tmp/parcours-sortie-$$.out 2>&1; code=$?; else PROFIL="$pr" timeout 570 node "$nom.js" > /tmp/parcours-sortie-$$.out 2>&1; code=$?; fi
    t1=$(date +%s); bilan=$(grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗' /tmp/parcours-sortie-$$.out | tail -1)
    etiquette="$nom"; [ "$n" != 12 ] && etiquette="$nom@$pr"
    echo "$((t1 - t0))s code=$code $etiquette :: ${bilan:-aucun bilan}"
    { echo "##### $etiquette (code $code)"; cat /tmp/parcours-sortie-$$.out; } >> "$LOG"
    [ "$code" -ne 0 ] && MAL=1
  done
done
rm -f /tmp/parcours-sortie-$$.out
echo FINI; exit $MAL
