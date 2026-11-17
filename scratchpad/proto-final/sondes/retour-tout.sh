#!/bin/bash
# Rejoue TOUTES les sondes « bouton Retour » (calques isolés, parcours, atelier), une à la fois, et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Un seul navigateur à la fois : ne jamais en lancer deux en parallèle. Journal : $CAP/retour-tout.log (hors dépôt). Sort en 1 dès qu'une exécution tombe.
# Les contre-épreuves (mutations) se lancent à part : node scratchpad/proto-final/sondes/retour-mutations.js
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/retour-tout.log"; : > "$J"
tombe=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then tombe=1; echo "$s" | grep "✗" | head -4 | cut -c1-260 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for p in android iphone mac; do lance "calques $p (1/3)" PROFIL=$p GENRE=panneau,fenetre,date node $S/retour-calques.js; lance "calques $p (2/3)" PROFIL=$p GENRE=planning,recherche,pdf,visionneuse node $S/retour-calques.js; lance "calques $p (3/3)" PROFIL=$p GENRE=paiement,carte,atelier,nouveautes,menu node $S/retour-calques.js; done
for p in ipad windows petit; do lance "calques $p (1/2)" PROFIL=$p GENRE=panneau,fenetre,date,planning,recherche,pdf node $S/retour-calques.js; lance "calques $p (2/2)" PROFIL=$p GENRE=visionneuse,paiement,carte,atelier,nouveautes,menu node $S/retour-calques.js; done
for p in android iphone mac; do lance "parcours $p" PROFIL=$p node $S/retour-parcours.js; done
for p in android iphone mac; do lance "atelier retour $p" PROFIL=$p node $S/atelier-retour.js; done
echo FINI | tee -a "$J"; exit $tombe
