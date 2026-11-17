#!/bin/bash
# Rejoue TOUTES les sondes de « Tâches » et « Absences et congés » (famille « taches »), UNE à la fois (un seul navigateur), et dit pour
# chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 dès qu'une exécution tombe, et écrit FINI à la fin. Journal : $CAP/taches-tout.log.
#   bash scratchpad/proto-final/campagne/sondes/taches-tout.sh
# Les parcours A, B, C, E, F, G, H, I ont leurs profils et leurs rôles écrits dans la sonde (gérant sur Mac, technicienne sur iPhone…) :
# ils sont joués une fois. Les sondes qui prennent un profil en argument sont jouées sur un ORDINATEUR (mac) et un TÉLÉPHONE (iphone,
# plus le petit 320 px là où la largeur compte) ; celles qui prennent aussi « nuit » le sont de jour ET de nuit.
# ÉCARTÉS : taches-absences-outils.js (outil partagé), taches-absences-balayage.js et -explore.js (outils à arguments : route, préparation,
# étiquette ; le balayage ÉCRIT un fichier de rapport dans campagne/), taches-absences-niveau2.sh (dix balayages de suite, mêmes écritures).
# LAISSÉS DE CÔTÉ pour tenir dans les 25 minutes : windows, ipad (sauf avis et soldes), android (sauf mise en page) — mêmes règles que mac et iphone.
# Pour tout jouer : TOUS=1 (ajoute windows, ipad, android et les nuits manquantes).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP
J="$CAP/taches-tout.log"; : > "$J"; DELAI="${DELAI:-590}"; ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-sans bilan}$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')" | tee -a "$J"
  if [ $code -ne 0 ]; then ko=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*(==)?[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
# jouer <fichier sans taches-absences-> [arguments…]
jouer(){ local f="$1"; shift; lance "taches-absences-$f $*" node "$S/taches-absences-$f.js" "$@"; }
for p in a b c e f g h i; do jouer parcours-$p; done
jouer parcours-d iphone; jouer parcours-d petit
jouer mise-en-page mac non; jouer mise-en-page iphone non; jouer mise-en-page petit non; jouer mise-en-page android non
jouer recontrole-liens mac; jouer recontrole-liens iphone nuit
jouer recontrole-saisie iphone; jouer recontrole-saisie mac nuit
jouer recontrole-telephone iphone; jouer recontrole-telephone petit nuit
jouer recontrole-avis petit; jouer recontrole-avis iphone
jouer sonde-export iphone; jouer sonde-export mac
jouer sonde-soldes petit; jouer sonde-soldes iphone
if [ -n "$TOUS" ]; then
  jouer parcours-d android; jouer mise-en-page ipad non; jouer mise-en-page windows non
  jouer recontrole-liens mac nuit; jouer recontrole-liens iphone; jouer recontrole-saisie iphone nuit; jouer recontrole-saisie mac
  jouer recontrole-telephone iphone nuit; jouer recontrole-telephone mac; jouer recontrole-avis android; jouer recontrole-avis ipad
  jouer sonde-export petit; jouer sonde-soldes android; jouer sonde-soldes ipad
fi
echo FINI | tee -a "$J"; exit $ko
