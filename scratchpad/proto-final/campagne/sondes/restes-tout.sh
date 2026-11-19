#!/bin/bash
# Rejoue les sondes « RESTES » de la campagne (contrats, planning tour 2, tâches · absences · menu, technicien), UNE à la fois (un seul navigateur),
# et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe. Les sondes « restes » de la Boîte mail vivent dans
# scratchpad/proto-final/sondes/restes-tout.sh (même famille, autre dossier) : tout-rejouer.sh joue les deux.
#   bash scratchpad/proto-final/campagne/sondes/restes-tout.sh          # tout
#   RAPIDE=1 bash …/restes-tout.sh                                      # un seul profil par sonde
# Durée visée : 25 minutes au plus. Journal complet : $CAP/restes-tout.log (hors dépôt).
# Écartés : les mutations (*.py, outils d'éprouve de sonde) et les captures à regarder sans contrôle propre ; restes-taches-absences-2-captures.js et
# restes-taches-absences-2-recontrole-captures.js COMPTENT leurs contrôles (l'écran est lu avant chaque capture) : ils sont joués une fois.
# Les sondes « taches-absences » choisissent leurs profils elles-mêmes (iphone, mac, ipad, petit, android selon la partie) : un seul lancement chacune.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-tout}"; mkdir -p "$CAP"; J="$CAP/restes-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
profils(){ if [ -n "$RAPIDE" ]; then echo "$1"; else echo "$@"; fi; }

for p in $(profils mac iphone android); do lance "contrats (tour 1) $p jour" node $S/restes-contrats-1.js $p; done
[ -z "$RAPIDE" ] && lance "contrats (tour 1) iphone nuit" node $S/restes-contrats-1.js iphone nuit
for p in $(profils mac iphone); do lance "contrat composé HT/TTC $p" node $S/restes-contrats-composes.js $p; done

for p in $(profils mac iphone ipad); do lance "planning tour 2 $p jour" node $S/restes-planning-2.js $p; done
[ -z "$RAPIDE" ] && lance "planning tour 2 iphone nuit" node $S/restes-planning-2.js iphone nuit

lance "tâches · absences (tour 1, six parties)" node $S/restes-taches-absences-1.js
lance "tâches · absences : menu de la Comptabilité au téléphone" node $S/restes-taches-absences-1-bureau-tel.js
lance "tâches · absences : recontrôle adverse tour 1" node $S/restes-taches-absences-1-recontrole.js
lance "tâches · absences : recontrôle adverse tour 2" node $S/restes-taches-absences-2-recontrole.js
lance "tâches · absences : panneaux corrigés (tour 2, captures contrôlées)" node $S/restes-taches-absences-2-captures.js
lance "tâches · absences : recontrôle tour 2 (captures contrôlées)" node $S/restes-taches-absences-2-recontrole-captures.js

for p in $(profils iphone android petit mac); do lance "technicien (tour 1) $p jour" node $S/restes-technicien-1.js $p 0; done
[ -z "$RAPIDE" ] && { lance "technicien (tour 1) iphone nuit" node $S/restes-technicien-1.js iphone 1; lance "technicien (tour 1) petit nuit" node $S/restes-technicien-1.js petit 1; }
lance "technicien : pied du menu au doigt, iPad jour" node $S/restes-technicien-2.js ipad 0
[ -z "$RAPIDE" ] && lance "technicien : pied du menu au doigt, iPad nuit" node $S/restes-technicien-2.js ipad 1
# ── Les restes qui n'étaient pas rejoués (ajoutés le 19/11/2026) : une exécution par sonde sur son profil d'origine (celui que la sonde prend sans
#    argument), le profil voisin avec TOUT=1. Chaque famille de restes garde sa place : accueil, client, contrats, devis·atelier, équipe, planning, tâches, technicien.
tout(){ [ -n "$TOUT" ] && [ -z "$RAPIDE" ] && lance "$@"; return 0; }
lance "accueil tour 3 recontrôle (parties A à D) mac" node $S/restes-accueil-3-recontrole.js ABCD mac
lance "accueil tour 3 recontrôle : la vue mac" node $S/restes-accueil-3-recontrole-vue.js
lance "accueil tour 4 mac" node $S/restes-accueil-4.js mac
lance "accueil tour 4 recontrôle mac" node $S/restes-accueil-4-recontrole.js mac
lance "accueil tour 5 mac" node $S/restes-accueil-5.js mac
tout "accueil tour 4 iphone" node $S/restes-accueil-4.js iphone
tout "accueil tour 5 iphone" node $S/restes-accueil-5.js iphone

lance "client tour 1 iphone" node $S/restes-client-1.js iphone
lance "client tour 1 recontrôle iphone" node $S/restes-client-1-recontrole.js iphone
lance "client tour 2 mac" node $S/restes-client-2.js mac
lance "client tour 2 recontrôle mac" node $S/restes-client-2-recontrole.js mac
lance "client tour 2 recontrôle : la barre iphone" node $S/restes-client-2-recontrole-barre.js iphone
lance "client tour 2 recontrôle : le paiement mac" node $S/restes-client-2-recontrole-paiement.js mac
lance "client tour 3 recontrôle iphone" node $S/restes-client-3-recontrole.js iphone
lance "client tour 4 recontrôle iphone" node $S/restes-client-4-recontrole.js iphone
lance "client tour 4 : relancer iphone" node $S/restes-client-4-relancer.js iphone
tout "client tour 2 iphone" node $S/restes-client-2.js iphone

lance "Comptabilité en plein écran (téléphone et ordinateur)" node $S/restes-compta-plein-ecran.js

lance "contrats tour 1 recontrôle mac" node $S/restes-contrats-1-recontrole.js mac
lance "contrats tour 1 recontrôle : les écrans petit" node $S/restes-contrats-1-recontrole-ecrans.js petit
lance "contrats tour 2 recontrôle mac" node $S/restes-contrats-2-recontrole.js mac
lance "contrats tour 2 recontrôle : facturation petit" node $S/restes-contrats-2-recontrole-facturation.js petit
lance "contrats tour 2 recontrôle : visites petit" node $S/restes-contrats-2-recontrole-visites.js petit
lance "contrats tour 3 recontrôle mac" node $S/restes-contrats-3-recontrole.js mac
lance "contrats tour 3 recontrôle : la liste" node $S/restes-contrats-3-recontrole-liste.js
lance "contrats tour 4 mac" node $S/restes-contrats-4.js mac
lance "contrats tour 4 recontrôle mac" node $S/restes-contrats-4-recontrole.js mac
lance "contrats tour 5 mac" node $S/restes-contrats-5.js mac
lance "contrats tour 5 recontrôle mac" node $S/restes-contrats-5-recontrole.js mac
lance "contrats tour 6 mac" node $S/restes-contrats-6.js mac
lance "contrats tour 6 : balayage" node $S/restes-contrats-6-balayage.js
tout "contrats tour 6 : captures mac" node $S/restes-contrats-6-captures.js mac
tout "contrats tour 6 iphone" node $S/restes-contrats-6.js iphone

lance "devis·atelier tour 1 mac" node $S/restes-devis-atelier-1.js mac
lance "devis·atelier tour 1 : envoi et signature mac" node $S/restes-devis-atelier-2.js mac
lance "devis·atelier tour 1 : ipad, iphone, android" node $S/restes-devis-atelier-3.js
lance "devis·atelier : Créer avec l'IA mac" node $S/restes-devis-atelier-ia.js mac
lance "devis·atelier recontrôle 1 mac" node $S/restes-devis-atelier-recontrole-1.js mac
lance "devis·atelier recontrôle 2 : iphone, ipad, android" node $S/restes-devis-atelier-recontrole-2.js
lance "devis·atelier tour 2 recontrôle 1 : cinq appareils" node $S/restes-devis-atelier-tour2-recontrole-1.js
lance "devis·atelier tour 2 recontrôle 2 mac" node $S/restes-devis-atelier-tour2-recontrole-2.js

lance "équipe tour 1 mac" node $S/restes-equipe-1.js mac
lance "équipe tour 1 recontrôle iphone" node $S/restes-equipe-1-recontrole.js iphone
lance "équipe tour 1 recontrôle b iphone" node $S/restes-equipe-1-recontrole-b.js iphone
lance "équipe tour 2 recontrôle iphone" node $S/restes-equipe-2-recontrole.js iphone
for s in H S I G; do lance "équipe tour 3 (restes mineurs, section $s) iphone" node $S/restes-equipe-3-mineurs.js iphone $s; done

lance "planning tour 3 mac" node $S/restes-planning-3.js mac
lance "planning tour 3 recontrôle mac" node $S/restes-planning-3-recontrole.js mac
lance "planning tour 4 mac" node $S/restes-planning-4.js mac
lance "planning tour 4 recontrôle mac" node $S/restes-planning-4-recontrole.js mac
lance "planning tour 4 recontrôle : le fond mac" node $S/restes-planning-4-recontrole-fond.js mac
lance "planning tour 2 recontrôle mac" node $S/restes-planning-2-recontrole.js mac

lance "tâches · absences tour 3 recontrôle" node $S/restes-taches-absences-3-recontrole.js
lance "tâches · absences tour 3 recontrôle (captures contrôlées)" node $S/restes-taches-absences-3-recontrole-captures.js

lance "technicien tour 3 iphone" node $S/restes-technicien-3.js iphone 0
lance "technicien recontrôle iphone" node $S/restes-technicien-recontrole.js iphone 0
lance "technicien recontrôle 2 iphone" node $S/restes-technicien-recontrole-2.js iphone 0
lance "technicien recontrôle 3 iphone" node $S/restes-technicien-recontrole-3.js iphone 0
lance "technicien recontrôle : alignement iphone" node $S/restes-technicien-recontrole-alignement.js iphone 0
lance "technicien recontrôle : avis iphone" node $S/restes-technicien-recontrole-avis.js iphone 0
lance "technicien recontrôle : menu petit" node $S/restes-technicien-recontrole-menu.js petit 0
lance "technicien recontrôle : le mot long ipad" node $S/restes-technicien-recontrole-mot.js ipad
lance "technicien recontrôle : la puce iphone" node $S/restes-technicien-recontrole-puce.js iphone 0
echo FINI | tee -a "$J"
exit $ko
