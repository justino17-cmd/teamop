#!/bin/bash
# Rejoue TOUTES les sondes « artefact » (bac à sable simulé), une à la fois, et dit pour chacune « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ».
# Un seul navigateur à la fois (lib.js prend une place sur quatre pour toute la machine). Sort en 1 si une sonde tombe. Journal : $CAP/artefact-tout.log (hors dépôt).
#   RECENSEMENT=0 pour sauter le recensement (le plus long) ; MUTATIONS=1 pour rejouer aussi les mutations (une vingtaine de minutes de plus).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/artefact-tout.log"; : > "$J"; MAL=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | grep "✗" | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
lance "fonctions de sortie (pont, refus, copie, liens, câblage)" node $S/artefact-telechargements.js
lance "cadres voisins (comptabilité, atelier, paiement)" node $S/artefact-cadres.js
lance "module de courrier (aperçu PDF › Télécharger)" node $S/artefact-courrier.js
lance "rangement refusé (3 variantes, 3 rôles, 2 appareils)" node $S/artefact-rangement.js
lance "carte (hôtes coupés, repli dit)" node $S/artefact-carte.js
lance "adresses (#nom simple, noms réservés)" node $S/artefact-adresses.js
lance "bac : mord sur la version corrigée" node $S/artefact-bac-preuve.js
if [ "${RECENSEMENT:-1}" != "0" ]; then
  for q in marc julie sm; do for p in mac iphone; do lance "recensement $q/$p" QUI=$q PROFIL=$p node $S/artefact-recensement.js; done; done
fi
if [ -n "$MUTATIONS" ]; then lance "mutations (le bac et les sondes mordent)" node $S/artefact-mutations.js; fi
echo FINI | tee -a "$J"; exit $MAL
