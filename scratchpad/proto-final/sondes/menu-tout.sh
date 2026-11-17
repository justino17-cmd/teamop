#!/bin/bash
# Rejoue TOUTES les sondes du menu (famille « menu »), UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code
# de sortie. Sort en 1 dès qu'une exécution tombe, et écrit FINI à la fin. Journal : $CAP/menu-tout.log (hors dépôt).
#   bash scratchpad/proto-final/sondes/menu-tout.sh
# Les sondes « menu » ne prennent ni profil ni rôle en argument : chacune boucle d'elle-même sur ses profils (mac, windows, mac720, ipad,
# iphone, android, petit selon la sonde), ses rôles (marc, julie, sm) et le jour ET la nuit quand elle le prend. Elles sont donc jouées
# TELLES QUELLES, une fois, sans RAPIDE (qui n'en garde que la moitié et ne sert qu'aux mutations). Seule « menu-recontrole » est coupée
# en six parties (PART=A…F, qu'elle sait jouer seules) pour que chaque exécution tienne sous le délai.
# ÉCARTÉS : menu-commun.js (outil partagé) et menu-mutations.js (contre-épreuve qui rejoue les sondes sur des copies mutées : elle a
# sa propre commande et dure une heure).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP
J="$CAP/menu-tout.log"; : > "$J"; DELAI="${DELAI:-590}"; ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-sans bilan}$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')" | tee -a "$J"
  if [ $code -ne 0 ]; then ko=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*(==)?[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for f in ordinateur telephone defilement poste renommages routes memoire nu echafaudage pack3d visites conges conges-bureau; do
  lance "menu-$f" node "$S/menu-$f.js"; done
for part in A B C D E F; do lance "menu-recontrole PART=$part" PART=$part node "$S/menu-recontrole.js"; done
echo FINI | tee -a "$J"; exit $ko
