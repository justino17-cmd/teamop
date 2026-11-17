#!/bin/bash
# Rejoue TOUTES les sondes de l'atelier (puis, avec AVEC_MENU=1, celles du menu), une à la fois, et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Un seul navigateur à la fois : ne jamais en lancer deux en parallèle. Durée : une vingtaine de minutes. Journal : $CAP/tout.log (hors dépôt).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/tout.log"; : > "$J"
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then echo "$s" | grep "✗" | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for p in mac iphone ipad; do lance "devis $p" PROFIL=$p node $S/atelier-devis.js; done
for p in mac iphone android; do lance "contrat $p" PROFIL=$p node $S/atelier-contrat.js; done
lance "roles et pont" node $S/atelier-roles.js
for p in android iphone mac; do lance "retour $p" PROFIL=$p node $S/atelier-retour.js; done
for p in mac android; do lance "numeros $p" PROFIL=$p node $S/atelier-numeros.js; done
lance "echecs" node $S/atelier-echecs.js
for p in mac mac720 windows ipad iphone android petit; do lance "mise en page $p" PROFIL=$p node $S/atelier-miseenpage.js; done
for p in mac mac720 windows ipad iphone android petit; do lance "compositeur en grand $p" PROFIL=$p node $S/atelier-grand.js; done
lance "page seule (4 configurations)" node $S/atelier-seule.js
if [ -n "$AVEC_MENU" ]; then for f in $S/menu-*.js; do case "$f" in *menu-commun.js|*menu-mutations.js) continue;; esac; lance "$(basename $f)" node "$f"; done; fi
echo FINI | tee -a "$J"
