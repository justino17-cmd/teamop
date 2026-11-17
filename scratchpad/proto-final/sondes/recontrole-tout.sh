#!/bin/bash
# Rejoue les RECONTRÔLES ADVERSES, UNE sonde à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe.
#   1. le recontrôle de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026) : scratchpad/proto-final/securite/recontrole-*.js ;
#   2. le recontrôle de l'artefact (le prototype dans un cadre, sans réseau, sans téléchargement direct) : recontrole-artefact-*.js, dans ce dossier.
#   bash scratchpad/proto-final/sondes/recontrole-tout.sh        # tout
#   RAPIDE=1 bash …/recontrole-tout.sh                           # seulement ce qui ne lance pas de navigateur (fuzz des liens)
# Un ✗ de la partie 1 est une faille qui reste OUVERTE (ou une casse), pas une erreur de la sonde : les ✗ attendus sont listés dans securite/recontrole.json.
# Durée visée : 25 minutes au plus. Journal complet : $CAP/recontrole-tout.log (hors dépôt).
# LAISSÉ DE CÔTÉ pour tenir ce temps (à rejouer à la main : PROFIL=<p> QUI=<q> node recontrole-artefact-recensement.js) :
#   - le recensement de l'artefact n'est joué que pour le gérant sur ordinateur et la technicienne sur iPhone (la secrétaire n'ajoute pas d'écran propre) ;
#   - les sondes d'artefact à profil (cadres, historique, hôte) ne sont jouées que sur mac ; la carte joue ses deux profils (mac, iphone) d'elle-même.
# Écartés : recontrole-artefact-pose.js (bibliothèque de pose du bac, aucune exécution propre) et recontrole-artefact-captures.js (captures à regarder, sans contrôle).
# La carte de l'artefact lit des copies locales des bibliothèques (Leaflet, MapLibre) : si le dossier $DEP manque, elles sont téléchargées aux mêmes versions
# que le prototype (cdnjs, unpkg) — le seul accès réseau de ce script, et il passe par le proxy de la machine.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole-tout}"; mkdir -p "$CAP"; J="$CAP/recontrole-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
SEC=scratchpad/proto-final/securite

lance "securite liens (fuzz, sans navigateur)" node $SEC/recontrole-liens-fuzz.js
if [ -z "$RAPIDE" ]; then
  lance "securite restes (garde rapide : clients, expéditeurs, FEC, liens, bulles, unités, import — la contre-épreuve est mutations-restes-securite.py)" node $SEC/restes-garde.js
  lance "securite restes (unité sans entité)" node $SEC/restes-unite-entite.js
  for f in nomclient confiance casse url client acces-client fichiers sortie chemins clientsaisi titre casse2 saisie; do lance "securite $f" node $SEC/recontrole-$f.js; done
  lance "securite données (4 clics, gérant)" node $SEC/recontrole-donnees.js --clics=4 --decal=0
  lance "securite données (4 clics, décalage 3, secrétaire)" node $SEC/recontrole-donnees.js --clics=4 --decal=3 --qui=julie

  # 2. l'artefact
  DEP="${DEP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/dep}"; export DEP
  if [ ! -s "$DEP/leaflet-maplibre-gl.js" ]; then mkdir -p "$DEP"
    curl -sSfL -o "$DEP/leaflet.min.js" https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js
    curl -sSfL -o "$DEP/maplibre-gl.min.js" https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js
    curl -sSfL -o "$DEP/leaflet-maplibre-gl.js" https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js
  fi
  lance "artefact cadres (comptabilité, atelier, paiement) mac" PROFIL=mac node $S/recontrole-artefact-cadres.js
  lance "artefact hors cadre (le téléchargement arrive encore)" node $S/recontrole-artefact-hors.js
  lance "artefact hôte (le prototype dans un cadre) mac" PROFIL=mac node $S/recontrole-artefact-hote.js
  lance "artefact historique qui jette mac" PROFIL=mac node $S/recontrole-artefact-historique.js
  lance "artefact pages voisines (pont refusé)" node $S/recontrole-artefact-voisins.js
  lance "artefact pages voisines d'une autre origine" node $S/recontrole-artefact-origine.js
  lance "artefact courrier (notifications, son, rangement refusés)" node $S/recontrole-artefact-courrier.js
  lance "artefact carte (bibliothèques chargées) mac et iphone" node $S/recontrole-artefact-carte.js
  lance "artefact recensement gérant mac" QUI=marc PROFIL=mac node $S/recontrole-artefact-recensement.js
  lance "artefact recensement technicienne iphone" QUI=sm PROFIL=iphone node $S/recontrole-artefact-recensement.js
fi
echo FINI | tee -a "$J"
exit $ko
