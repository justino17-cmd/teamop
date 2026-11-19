#!/bin/bash
# Rejoue les sondes « RESTES » de la BOÎTE MAIL (tours 1 et 2 et leurs recontrôles adverses), de l'ARTEFACT (le prototype dans un cadre), de la SÉCURITÉ (champs, plafonds,
# coupes) et de VÉHICULES · TEMPS DE TRAVAIL, UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe.
# Les autres sondes « restes » (accueil, client, contrats, devis·atelier, équipe, planning, tâches, technicien, Comptabilité) vivent dans
# scratchpad/proto-final/campagne/sondes/restes-tout.sh : tout-rejouer.sh joue les deux.
#   bash scratchpad/proto-final/sondes/restes-tout.sh          # l'essentiel : environ 10 minutes (la famille entière, les deux scripts : environ 28 minutes)
#   TOUT=1 bash …/restes-tout.sh                               # TOUT : environ 24 minutes — à lancer en fond (run_in_background)
#   RAPIDE=1 bash …/restes-tout.sh                             # le tour 1 et le tour 2 de la Boîte mail seulement (pas les recontrôles, rien d'autre)
# Chaque sonde de la Boîte mail se joue PARTIE par PARTIE (variable PARTIE=1…6, comme mail-tout.sh joue corr-telephone) : une partie tient dans le délai, la sonde entière non.
# Mesuré le 19/11/2026 (secondes) : la Boîte mail 532 s, le reste 909 s. La durée visée de la famille est de 25 minutes : LAISSÉ DE CÔTÉ dans la version courte (TOUT=1 les rejoue) :
#   - Boîte mail : recontrôle du tour 1, parties 1 (50) et 3 (49) ;
#   - artefact : tour 1 recontrôle sur les deux profils (99), recontrôle c (43, jour et nuit sur mac et iphone) ;
#   - sécurité : tour 2 recontrôle (82), tour 2 captures mesurées (39), tour 3 recontrôle (97), tour 4 (86), tour 4 recontrôle B (107) ;
#   - Véhicules · Temps de travail : tours 1 et 2 recontrôle (75 et 92), joués sur mac seul (la sonde accepte PROFILS=mac,iphone,…).
# Écartés (aucun contrôle propre, des captures À REGARDER) : restes-securite-tour1-captures.js. Écartés aussi : les mutations (*.py, outils d'éprouve de sonde).
# Journal complet : $CAP/restes-mail-tout.log (hors dépôt).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-mail-tout}"; mkdir -p "$CAP"; J="$CAP/restes-mail-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
# tout <nom> <commande…> : une exécution qui n'a lieu que dans la version complète
tout(){ [ -n "$TOUT" ] && [ -z "$RAPIDE" ] && lance "$@"; return 0; }
for n in 1 2 3 4 5; do lance "mail tour 1 partie $n" PARTIE=$n node $S/restes-mail-tour1.js; done
lance "mail tour 2 (paysage court, sept tailles)" node $S/restes-mail-tour2.js
if [ -z "$RAPIDE" ]; then
  for n in 2 4 5 6; do lance "mail tour 1 recontrôle partie $n" PARTIE=$n node $S/restes-mail-tour1-recontrole.js; done
  for n in 1 3; do tout "mail tour 1 recontrôle partie $n" PARTIE=$n node $S/restes-mail-tour1-recontrole.js; done
  for n in 1 2 3 4 5; do lance "mail tour 2 recontrôle partie $n" PARTIE=$n node $S/restes-mail-tour2-recontrole.js; done
fi
# ── Les restes qui n'étaient pas rejoués (ajoutés le 19/11/2026) : l'artefact (le prototype dans un cadre), la sécurité (champs, plafonds, coupes), Véhicules et Temps de travail.
#    Profils : ordinateur (mac) et téléphone (iphone) ; les sondes qui en jouent six d'elles-mêmes sont ramenées à ces deux-là (PROFILS=…).
[ -z "$RAPIDE" ] && {
tout "artefact tour 1 recontrôle (mac, iphone) (lourd)" PROFILS=mac,iphone node $S/restes-artefact-tour1-recontrole.js
lance "artefact tour 1 recontrôle b (mac, iphone)" PROFILS=mac,iphone node $S/restes-artefact-tour1-recontrole-b.js
tout "artefact tour 1 recontrôle c (mac, iphone, jour)" PROFILS=mac,iphone JOUR=1 node $S/restes-artefact-tour1-recontrole-c.js
lance "artefact tour 2 (mac, iphone)" PROFILS=mac,iphone node $S/restes-artefact-tour2.js
lance "sécurité tour 1 recontrôle" node $S/restes-securite-tour1-recontrole.js
tout "sécurité tour 2 recontrôle (lourd)" node $S/restes-securite-tour2-recontrole.js
tout "sécurité tour 2 : captures d'un nom de 118 signes (largeurs mesurées)" node $S/restes-securite-tour2-captures.js
lance "sécurité tour 3 (plafonds, coupes)" node $S/restes-securite-tour3.js
tout "sécurité tour 3 recontrôle (lourd)" node $S/restes-securite-tour3-recontrole.js
tout "sécurité tour 4 (lourd)" node $S/restes-securite-tour4.js
lance "sécurité tour 4 recontrôle A" node $S/restes-securite-tour4-recontrole-a.js
tout "sécurité tour 4 recontrôle B (lourd)" node $S/restes-securite-tour4-recontrole-b.js
lance "sécurité tour 4 : le titre" node $S/restes-securite-tour4-titre.js
lance "véhicules · temps de travail tour 1 (mac)" PROFILS=mac node $S/restes-vehtemps-1.js
tout "véhicules · temps de travail tour 1 recontrôle (mac)" PROFILS=mac node $S/restes-vehtemps-tour1-recontrole.js
tout "véhicules · temps de travail tour 2 recontrôle (mac)" PROFILS=mac node $S/restes-vehtemps-tour2-recontrole.js
}
echo FINI | tee -a "$J"
exit $ko
