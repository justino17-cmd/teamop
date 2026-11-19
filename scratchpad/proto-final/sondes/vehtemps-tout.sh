#!/bin/bash
# Rejoue TOUTES les sondes de la voie « Véhicules et Temps de travail » (étapes 1 à 5), une à la fois, sur les six profils, jour ET nuit quand la sonde le sait,
# et dit pour chacune « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ». Un seul navigateur à la fois (lib.js prend une place sur quatre pour toute la machine). Sort en 1 si une sonde tombe.
#   PROFILS="mac iphone" pour restreindre ; NUIT=0,1 par défaut (jour ET nuit) ; COMPLET=1 pour les six profils ; MUTATIONS=1 pour rejouer aussi les mutations (longues) ; SEULS="camion voisins" pour des familles.
# Journal : $CAP/vehtemps-tout.log (hors dépôt). Le verdict d'une sonde est son CODE DE SORTIE ; le « N ✓ · M ✗ » n'est qu'un affichage.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/vehtemps-tout.log"; : > "$J"; MAL=0
# DURÉE (mesurée le 19/11, machine seule, jour ET nuit sur mac + iphone + petit) : « Mon camion » 323 s, écrans voisins 225 s, visites de Véhicules 248 s, gestes des feuilles 182 s, gestes
# de la fiche 130 s, le reste 17 à 95 s chacune ; la famille entière sur les six profils dépasserait l'heure (« Mon camion » seul : 11 minutes).
# Par défaut (ESSENTIEL, ~26 minutes mesurées en deux passages) : un ORDINATEUR (mac) et un TÉLÉPHONE (iphone), jour ET nuit, plus le PLUS ÉTROIT (petit, 320 px — celui qui fait tomber « Mon camion ») joué sur « Mon camion »
# seulement, de jour. LAISSÉS DE CÔTÉ par défaut : windows, ipad, android, et petit pour tout le reste — mêmes mises en page que mac et iphone à d'autres largeurs, aucune règle propre à ces écrans
# dans la famille. COMPLET=1 rejoue les six profils partout (plus d'une heure : à lancer en arrière-plan avec un délai long) ; PROFILS="mac windows" les choisit un à un.
# Pas rejoués non plus : vehtemps-avant.js, -captures.js, -v-captures.js, -v4-captures.js, -v5-captures.js, -feuilles.js (captures à REGARDER, sans contrôle) et vehtemps-rc-balayage.js
# (balayage : il écrit un JSON et se compare à une autre version, il ne juge pas).
if [ -n "$COMPLET" ]; then P="${PROFILS:-mac windows ipad iphone android petit}"; else P="${PROFILS:-mac iphone}"; fi; P="${P// /,}"; N="${NUIT:-0,1}"
veut(){ [ -z "$SEULS" ] && return 0; for s in $SEULS; do [ "$s" = "$1" ] && return 0; done; return 1; }
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 1500 env -u SEULS "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | grep "✗" | head -4 | cut -c1-260 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
if veut camion;   then lance "Mon camion (structure, états, Ma journée, gestes, mise en page)" PROFILS=$P NUIT=$N node $S/vehtemps-v5-camion.js
  # le plus étroit (petit, 320 px) : jour SEULEMENT par défaut (nuit : COMPLET=1) — il tombe aux deux teintes pour la même raison (le bouton « Noter un plein » sous la ligne de flottaison)
  if [ -n "$COMPLET" ]; then :; else lance "Mon camion sur le plus étroit (petit, jour)" PROFILS=petit NUIT=0 node $S/vehtemps-v5-camion.js; fi; fi
if veut voisins;  then lance "écrans voisins (Accueil, Équipe, Paie, Planning, Tâches, guide)" PROFILS=$P NUIT=$N node $S/vehtemps-v5-voisins.js; fi
if veut visites;  then lance "visites parlées (cinq chapitres + le guide du salarié)" node $S/vehtemps-v5-visites.js; fi
if veut visites4; then lance "Véhicules : les visites (immersion et partie parlée : aucun sélecteur perdu)" node $S/vehtemps-v4-visites.js; fi
if veut liste;    then lance "Véhicules : la liste" PROFILS=$P NUIT=$N node $S/vehtemps-v1-liste.js; fi
if veut fiche;    then lance "Véhicules : la fiche" PROFILS=$P NUIT=$N node $S/vehtemps-v2-fiche.js; fi
if veut vgestes;  then lance "Véhicules : les gestes de la fiche" PROFILS=$P node $S/vehtemps-v3-gestes.js; fi
if veut feuilles; then lance "Véhicules : les feuilles" PROFILS=$P NUIT=$N node $S/vehtemps-v4-feuilles.js; fi
if veut gestes4;  then lance "Véhicules : les gestes des feuilles" PROFILS=$P node $S/vehtemps-v4-gestes.js; fi
if veut table;    then lance "Véhicules : la table « rien d'utile ne se perd »" PROFILS=mac,iphone node $S/vehtemps-v4-table.js; fi
if veut t1;       then lance "Temps de travail : la structure" PROFILS=$P NUIT=$N node $S/vehtemps-t1-structure.js; lance "Temps de travail : les gestes du gérant" PROFILS=mac,iphone node $S/vehtemps-t1-gestes.js; fi
if veut t5;       then lance "Temps de travail : la journée d'une personne" PROFILS=$P NUIT=$N node $S/vehtemps-t5-journee.js; fi
if veut t6;       then lance "Temps de travail : le salarié (Mes heures)" PROFILS=$P NUIT=$N node $S/vehtemps-t6-salarie.js; lance "Temps de travail : gestes du salarié, comptés (§ 5.3)" PROFILS=$P node $S/vehtemps-t56-gestes.js; fi
if veut corr;     then lance "correcteur : les droits (Ses heures, Corriger les pointages, mois fermé)" PROFILS=mac,iphone node $S/vehtemps-corr-droits.js; lance "correcteur : Véhicules" PROFILS=mac,iphone node $S/vehtemps-corr-vehicules.js; lance "correcteur : Temps de travail (gérant)" PROFILS=mac,windows,mac720,iphone PROFILS_G=mac,iphone node $S/vehtemps-corr-temps.js; lance "correcteur : le téléphone" PROFILS=iphone,android,petit node $S/vehtemps-corr-telephone.js; fi
# Le recontrôle adverse (étape 9) : les défauts annoncés « corrigés » rejoués AUTREMENT (au toucher), et ce que les corrections ont cassé à côté
if veut rc;       then lance "recontrôle : trois parcours de bout en bout (gérant, gérant, salariée)" node $S/vehtemps-rc-parcours.js; lance "recontrôle adverse (Véhicules, Temps de travail, droits, téléphone)" PROFILS=mac,iphone node $S/vehtemps-rc-rejeu.js; fi
if [ -n "$MUTATIONS" ]; then lance "mutations (chacune doit faire tomber une sonde)" MIN=${MIN:-1} node $S/vehtemps-mutations.js; fi
echo FINI | tee -a "$J"; exit $MAL
