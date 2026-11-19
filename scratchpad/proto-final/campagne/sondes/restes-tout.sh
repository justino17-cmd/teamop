#!/bin/bash
# Rejoue les sondes « RESTES » de la campagne (accueil, client, contrats, devis·atelier, équipe, planning, tâches · absences, technicien, Comptabilité plein écran),
# UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe.
# Les sondes « restes » de la Boîte mail, de l'artefact, de la sécurité et de Véhicules · Temps de travail vivent dans scratchpad/proto-final/sondes/restes-tout.sh
# (même famille, autre dossier) : tout-rejouer.sh joue les deux.
#   bash scratchpad/proto-final/campagne/sondes/restes-tout.sh          # l'essentiel : environ 17 minutes
#   TOUT=1 bash …/restes-tout.sh                                        # TOUT, tous les profils : environ 1 heure — à lancer en fond (run_in_background)
#   RAPIDE=1 bash …/restes-tout.sh                                      # un seul profil par sonde, sans les sondes lourdes
# Mesuré le 19/11/2026 : tout ce qui est joué ci-dessous, en profils complets, fait 3 219 s (54 minutes) sans le délai d'une sonde — la durée visée de la famille est de
# 25 minutes ; la version courte garde donc UNE exécution par sonde et met à part (TOUT=1) :
#   - les profils voisins : contrats tour 1 sur iphone, android et iphone de nuit, planning tour 2 sur iphone, ipad et iphone de nuit, technicien de nuit, pied du menu ipad de nuit,
#     accueil tour 4 et 5 sur iphone, client tour 2 sur iphone, contrats tour 6 sur iphone ;
#   - les sondes de plus de 45 secondes (secondes mesurées) : accueil tour 3 recontrôle 106, Comptabilité plein écran 108, contrats 1-recontrole 58, 2-recontrole 50, 3-recontrole 93,
#     4-recontrole 52, 5 50, 5-recontrole 117, 6 94, 6-balayage 88, devis·atelier tour 1 67 et 89, recontrôle 1 73, tour 2 recontrôle 1 72 et 2 88, équipe tour 1 recontrôle 80,
#     tour 2 recontrôle 131, restes mineurs section I 108, planning tour 3 recontrôle 110, tour 2 recontrôle 114, technicien recontrôle 56, 2 et 3 (43 et 49).
# ÉCARTÉS (aucun contrôle propre : des captures À REGARDER) : restes-accueil-3-recontrole-vue.js, restes-contrats-6-captures.js, restes-taches-absences-3-recontrole-captures.js ;
# restes-taches-absences-2-captures et 2-recontrole-captures COMPTENT leurs contrôles (l'écran est lu avant chaque capture) : joués une fois ;
# restes-devis-atelier-recontrole-3.js est un relevé de phrases qui ne tombe pas.
# Écartés aussi : les mutations (*.py, outils d'éprouve de sonde).
# Les sondes « taches-absences » choisissent leurs profils elles-mêmes (iphone, mac, ipad, petit, android selon la partie) : un seul lancement chacune.
# Une sonde qui ne finissait pas (restes-devis-atelier-ia.js : ni fermeture ni verdict, 590 s de délai) a reçu sa fermeture et son code de sortie — rien n'a été affaibli.
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
# tout <nom> <commande…> : une exécution qui n'a lieu que dans la version complète (profil voisin ou sonde lourde)
tout(){ [ -n "$TOUT" ] && [ -z "$RAPIDE" ] && lance "$@"; return 0; }

# ── Contrats
lance "contrats (tour 1) mac jour" node $S/restes-contrats-1.js mac
tout "contrats (tour 1) iphone jour" node $S/restes-contrats-1.js iphone
tout "contrats (tour 1) android jour" node $S/restes-contrats-1.js android
tout "contrats (tour 1) iphone nuit" node $S/restes-contrats-1.js iphone nuit
lance "contrat composé HT/TTC mac" node $S/restes-contrats-composes.js mac
lance "contrat composé HT/TTC iphone" node $S/restes-contrats-composes.js iphone
tout "contrats tour 1 recontrôle mac (lourd)" node $S/restes-contrats-1-recontrole.js mac
lance "contrats tour 1 recontrôle : les écrans petit" node $S/restes-contrats-1-recontrole-ecrans.js petit
tout "contrats tour 2 recontrôle mac (lourd)" node $S/restes-contrats-2-recontrole.js mac
lance "contrats tour 2 recontrôle : facturation petit" node $S/restes-contrats-2-recontrole-facturation.js petit
lance "contrats tour 2 recontrôle : visites petit" node $S/restes-contrats-2-recontrole-visites.js petit
tout "contrats tour 3 recontrôle mac (lourd)" node $S/restes-contrats-3-recontrole.js mac
lance "contrats tour 3 recontrôle : la liste" node $S/restes-contrats-3-recontrole-liste.js
lance "contrats tour 4 mac" node $S/restes-contrats-4.js mac
tout "contrats tour 4 recontrôle mac (lourd)" node $S/restes-contrats-4-recontrole.js mac
tout "contrats tour 5 mac (lourd)" node $S/restes-contrats-5.js mac
tout "contrats tour 5 recontrôle mac (lourd)" node $S/restes-contrats-5-recontrole.js mac
tout "contrats tour 6 mac (lourd)" node $S/restes-contrats-6.js mac
tout "contrats tour 6 : balayage (lourd)" node $S/restes-contrats-6-balayage.js
tout "contrats tour 6 iphone" node $S/restes-contrats-6.js iphone

# ── Planning
lance "planning tour 2 mac jour" node $S/restes-planning-2.js mac
tout "planning tour 2 iphone jour" node $S/restes-planning-2.js iphone
tout "planning tour 2 ipad jour" node $S/restes-planning-2.js ipad
tout "planning tour 2 iphone nuit" node $S/restes-planning-2.js iphone nuit
tout "planning tour 2 recontrôle mac (lourd)" node $S/restes-planning-2-recontrole.js mac
lance "planning tour 3 mac" node $S/restes-planning-3.js mac
tout "planning tour 3 recontrôle mac (lourd)" node $S/restes-planning-3-recontrole.js mac
lance "planning tour 4 mac" node $S/restes-planning-4.js mac
lance "planning tour 4 recontrôle mac" node $S/restes-planning-4-recontrole.js mac
lance "planning tour 4 recontrôle : le fond mac" node $S/restes-planning-4-recontrole-fond.js mac

# ── Tâches · absences
lance "tâches · absences (tour 1, six parties)" node $S/restes-taches-absences-1.js
lance "tâches · absences : menu de la Comptabilité au téléphone" node $S/restes-taches-absences-1-bureau-tel.js
lance "tâches · absences : recontrôle adverse tour 1" node $S/restes-taches-absences-1-recontrole.js
lance "tâches · absences : recontrôle adverse tour 2" node $S/restes-taches-absences-2-recontrole.js
lance "tâches · absences : panneaux corrigés (tour 2, captures contrôlées)" node $S/restes-taches-absences-2-captures.js
lance "tâches · absences : recontrôle tour 2 (captures contrôlées)" node $S/restes-taches-absences-2-recontrole-captures.js
lance "tâches · absences tour 3 recontrôle" node $S/restes-taches-absences-3-recontrole.js

# ── Technicien (« 0 » jour, « 1 » nuit)
for p in iphone android petit mac; do lance "technicien (tour 1) $p jour" node $S/restes-technicien-1.js $p 0; done
tout "technicien (tour 1) iphone nuit" node $S/restes-technicien-1.js iphone 1
tout "technicien (tour 1) petit nuit" node $S/restes-technicien-1.js petit 1
lance "technicien : pied du menu au doigt, iPad jour" node $S/restes-technicien-2.js ipad 0
tout "technicien : pied du menu au doigt, iPad nuit" node $S/restes-technicien-2.js ipad 1
lance "technicien tour 3 iphone" node $S/restes-technicien-3.js iphone 0
tout "technicien recontrôle iphone (lourd)" node $S/restes-technicien-recontrole.js iphone 0
tout "technicien recontrôle 2 iphone (lourd)" node $S/restes-technicien-recontrole-2.js iphone 0
tout "technicien recontrôle 3 iphone (lourd)" node $S/restes-technicien-recontrole-3.js iphone 0
lance "technicien recontrôle : alignement iphone" node $S/restes-technicien-recontrole-alignement.js iphone 0
lance "technicien recontrôle : avis iphone" node $S/restes-technicien-recontrole-avis.js iphone 0
lance "technicien recontrôle : menu petit" node $S/restes-technicien-recontrole-menu.js petit 0
lance "technicien recontrôle : le mot long ipad" node $S/restes-technicien-recontrole-mot.js ipad
lance "technicien recontrôle : la puce iphone" node $S/restes-technicien-recontrole-puce.js iphone 0

# ── Accueil
tout "accueil tour 3 recontrôle (parties A à D) mac (lourd)" node $S/restes-accueil-3-recontrole.js ABCD mac
lance "accueil tour 4 mac" node $S/restes-accueil-4.js mac
lance "accueil tour 4 recontrôle mac" node $S/restes-accueil-4-recontrole.js mac
lance "accueil tour 5 mac" node $S/restes-accueil-5.js mac
tout "accueil tour 4 iphone" node $S/restes-accueil-4.js iphone
tout "accueil tour 5 iphone" node $S/restes-accueil-5.js iphone

# ── Client (espace client)
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

# ── Comptabilité en plein écran
tout "Comptabilité en plein écran (téléphone et ordinateur) (lourd)" node $S/restes-compta-plein-ecran.js

# ── Devis · atelier
tout "devis·atelier tour 1 mac (lourd)" node $S/restes-devis-atelier-1.js mac
tout "devis·atelier tour 1 : envoi et signature mac (lourd)" node $S/restes-devis-atelier-2.js mac
lance "devis·atelier tour 1 : ipad, iphone, android" node $S/restes-devis-atelier-3.js
lance "devis·atelier : Créer avec l'IA mac" node $S/restes-devis-atelier-ia.js mac
tout "devis·atelier recontrôle 1 mac (lourd)" node $S/restes-devis-atelier-recontrole-1.js mac
lance "devis·atelier recontrôle 2 : iphone, ipad, android" node $S/restes-devis-atelier-recontrole-2.js
tout "devis·atelier tour 2 recontrôle 1 : cinq appareils (lourd)" node $S/restes-devis-atelier-tour2-recontrole-1.js
tout "devis·atelier tour 2 recontrôle 2 mac (lourd)" node $S/restes-devis-atelier-tour2-recontrole-2.js

# ── Équipe
lance "équipe tour 1 mac" node $S/restes-equipe-1.js mac
tout "équipe tour 1 recontrôle iphone (lourd)" node $S/restes-equipe-1-recontrole.js iphone
lance "équipe tour 1 recontrôle b iphone" node $S/restes-equipe-1-recontrole-b.js iphone
tout "équipe tour 2 recontrôle iphone (lourd)" node $S/restes-equipe-2-recontrole.js iphone
# une section = un navigateur neuf (H finit « comme Julie » : les autres sections ne doivent pas en hériter)
for s in H S G; do lance "équipe tour 3 (restes mineurs, section $s) iphone" node $S/restes-equipe-3-mineurs.js iphone $s; done
tout "équipe tour 3 (restes mineurs, section I) iphone (lourd)" node $S/restes-equipe-3-mineurs.js iphone I
echo FINI | tee -a "$J"
exit $ko
