#!/bin/bash
# Rejoue les sondes du PLANNING (mise en page, gestes, marqueurs de la carte, parcours du bureau, recontrôle adverse), UNE à la fois
# (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe.
#   bash scratchpad/proto-final/campagne/sondes/planning-tout.sh        # l'essentiel : environ 21 minutes (mesuré le 19/11/2026 : 1 268 s)
#   TOUT=1 bash …/planning-tout.sh                                       # plus de profils, la nuit et les gestes de chaque vue : à lancer en fond (une heure et demie)
#   RAPIDE=1 bash …/planning-tout.sh                                     # ordinateur (mac) seul, une exécution par sonde
# Le verdict d'une exécution est son code de sortie ; le « N ✓ · M ✗ » n'est qu'un affichage. Journal complet : $CAP/planning-tout.log (hors dépôt).
# Les sondes « restes-planning-* » (tours 2 à 4 des restes) sont de la famille « restes » : campagne/sondes/restes-tout.sh les joue.
# ÉCARTÉ : planning-restes-captures.js — il prend deux captures À REGARDER et ne compte qu'un contrôle (la carte est montée) ; il est joué une fois,
# sur iphone, parce que « la carte amenée à l'écran » ne se voit que sur téléphone.
# Les sondes qui parlent de la carte réelle chargent Leaflet et MapLibre depuis le réseau (le proxy de la machine) : sans réseau, « carte réelle
# indisponible » est ce que la page doit dire, et les contrôles de repères tombent — ce n'est pas un défaut de la page.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/planning-tout}"; mkdir -p "$CAP"; J="$CAP/planning-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
# profils <liste courte> [liste complète] : mac seul avec RAPIDE, la liste complète avec TOUT, sinon la liste courte
profils(){ local court="$1" tout="${2:-$1}"; if [ -n "$RAPIDE" ]; then echo mac; elif [ -n "$TOUT" ]; then echo $tout; else echo $court; fi; }
# tout <nom> <commande…> : une exécution qui n'a lieu que dans la version complète
tout(){ [ -n "$TOUT" ] && [ -z "$RAPIDE" ] && lance "$@"; return 0; }

for p in $(profils "mac iphone" "mac windows ipad iphone android petit"); do lance "mise en page $p jour" node $S/planning-mise-en-page.js $p; done
for p in $(profils "mac iphone" "mac ipad iphone petit"); do lance "mise en page $p nuit" node $S/planning-mise-en-page.js $p nuit; done

# Les gestes de chaque vue (recensés depuis le DOM, tous touchés) coûtent environ 9 minutes par profil (mesuré le 19/11/2026 : mac 573 s, iphone 553 s, la limite de 590 s
# d'une exécution) : l'essentiel joue l'iphone entier et, sur mac, la seule vue « carte » (la seule où un geste recensé n'est pas touché : 57 sur 60).
[ -z "$RAPIDE" ] && lance "gestes de chaque vue iphone" node $S/planning-gestes.js iphone
lance "gestes de la vue carte mac" node $S/planning-gestes.js mac carte
tout "gestes de chaque vue mac (lourd)" node $S/planning-gestes.js mac jour semaine mois general multi
tout "gestes de chaque vue ipad (lourd)" node $S/planning-gestes.js ipad
tout "gestes de chaque vue iphone nuit (lourd)" node $S/planning-gestes.js iphone nuit

for p in $(profils "mac iphone" "mac iphone ipad"); do lance "marqueurs de la carte $p" node $S/planning-marqueurs.js $p; done
lance "carte : plugin injoignable, « Réessayer » reste là" node $S/planning-carte-reessayer.js

for p in $(profils "mac iphone"); do lance "parcours du bureau P1 à P8 $p" node $S/planning-parcours.js $p; done
for p in $(profils "mac iphone"); do lance "parcours du bureau P9 et suivants $p" node $S/planning-parcours2.js $p; done
tout "parcours du bureau P1 à P8 iphone nuit" node $S/planning-parcours.js iphone nuit

[ -z "$RAPIDE" ] && lance "poignée de la liste de la carte iphone" node $S/planning-poignee-liste.js iphone
[ -z "$RAPIDE" ] && lance "poser chez une personne absente, au doigt, iphone" node $S/planning-recontrole-absent-doigt.js iphone

lance "recontrôle R1 à R14 mac" node $S/planning-recontrole.js mac
tout "recontrôle R1 à R14 iphone" node $S/planning-recontrole.js iphone
tout "recontrôle R1 à R14 iphone nuit" node $S/planning-recontrole.js iphone nuit
[ -z "$RAPIDE" ] && lance "recontrôle parcours PA iphone" node $S/planning-recontrole-parcours.js iphone PA
lance "recontrôle parcours PB mac" node $S/planning-recontrole-parcours.js mac PB
[ -z "$RAPIDE" ] && lance "recontrôle parcours PC petit" node $S/planning-recontrole-parcours.js petit PC

[ -z "$RAPIDE" ] && lance "captures de la carte et de la liste iphone (une carte montée)" node $S/planning-restes-captures.js iphone
echo FINI | tee -a "$J"
exit $ko
