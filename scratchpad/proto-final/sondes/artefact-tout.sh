#!/bin/bash
# Rejoue TOUTES les sondes « artefact » (bac à sable simulé), une à la fois, et dit pour chacune « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ».
# Un seul navigateur à la fois (lib.js prend une place sur quatre pour toute la machine). Sort en 1 si une sonde tombe. Journal : $CAP/artefact-tout.log (hors dépôt).
#   RECENSEMENT=0 pour sauter le recensement (le plus long) ; MUTATIONS=1 pour rejouer aussi les mutations (une vingtaine de minutes de plus).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/artefact-tout.log"; : > "$J"; MAL=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | { grep "✗" | head -3 || true; } | { l=$(cat); [ -n "$l" ] && echo "$l" || echo "$s" | tail -4; } | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
if [ "${BASE:-1}" != "0" ]; then   # BASE=0 : sauter les neuf sondes d'avant le recensement (pour ne rejouer que lui)
lance "fonctions de sortie (pont, refus, copie, liens, câblage)" node $S/artefact-telechargements.js
lance "cadres voisins (comptabilité, atelier, paiement)" node $S/artefact-cadres.js
lance "module de courrier (aperçu PDF › Télécharger)" node $S/artefact-courrier.js
lance "rangement refusé (3 variantes, 3 rôles, 2 appareils)" node $S/artefact-rangement.js
lance "carte (hôtes coupés, repli dit)" node $S/artefact-carte.js
lance "captures (carte du numéro, texte à copier, jour/nuit)" node $S/artefact-captures.js
lance "adresses (#nom simple, noms réservés)" node $S/artefact-adresses.js
lance "bac : mord sur la version corrigée" node $S/artefact-bac-preuve.js
lance "voir comme l'application (bande, cadre, refus du rangement, jour et nuit)" PROFILS=mac,iphone node $S/artefact-voir-app.js
fi
# Le recensement touche CHAQUE geste de chaque route et se borne par le temps (DUREE_S, 300 s par défaut, jusqu'à la fin : une exécution dure toujours le plafond).
# Mesuré le 17/11 (machine calme) : les neuf sondes d'avant durent ~12 minutes ; six recensements de 5 minutes dépasseraient les 25 minutes de la famille.
# PAR DÉFAUT : trois recensements de 200 s — le gérant à l'ordinateur, le gérant au téléphone, la technicienne au téléphone ; LAISSÉS DE CÔTÉ : Julie (secrétariat), qui voit un sous-ensemble
# de ce que voit le gérant, et la technicienne à l'ordinateur — RECENSEMENT_COMPLET=1 rejoue les six (marc, julie, sm × mac, iphone) à 300 s (une demi-heure de plus).
if [ "${RECENSEMENT:-1}" != "0" ]; then
  if [ -n "$RECENSEMENT_COMPLET" ]; then for q in marc julie sm; do for p in mac iphone; do lance "recensement $q/$p" QUI=$q PROFIL=$p node $S/artefact-recensement.js; done; done
  else for qp in marc/mac marc/iphone sm/iphone; do q=${qp%/*}; p=${qp#*/}; lance "recensement $q/$p (200 s)" QUI=$q PROFIL=$p DUREE_S=200 node $S/artefact-recensement.js; done; fi
fi
if [ -n "$MUTATIONS" ]; then lance "mutations (le bac et les sondes mordent)" node $S/artefact-mutations.js; fi
echo FINI | tee -a "$J"; exit $MAL
