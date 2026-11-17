#!/bin/bash
# Rejoue TOUTES les sondes de la famille « secu » (double authentification « OP Security », étape 2), une à la fois, et dit pour chacune
# « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ». Un seul navigateur à la fois (lib.js prend une place sur quatre pour toute la machine). Sort en 1 si une sonde tombe.
#   PROFILS="mac iphone" pour restreindre les sondes qui savent jouer plusieurs profils ; MUTATIONS : les contre-épreuves de la voie sont dans
#   double-auth-mutations.py (famille « double »), pas ici. Journal : $CAP/secu-tout.log (hors dépôt).
# Couverture, dite plutôt que cachée :
#   · secu-activation, -auto, -demo, -inactif, -inhabituelle, -mots, -nombre, -secrets, -telephone ouvrent chacune leur(s) profil(s) elles-mêmes (mac, parfois iphone ; inhabituelle joue jour ET nuit) :
#     elles ne prennent AUCUN argument, on ne peut donc pas les rejouer sur les autres profils sans les modifier — c'est l'étape suivante qui décidera si cela vaut la peine ;
#   · secu-structure (le téléphone selon la largeur) prend PROFILS / NUIT : jouée sur les sept profils, jour puis nuit ;
#   · secu-captures (mesures au pixel : débordement, cibles, champs) prend PROFIL / NUIT : jouée sur mac, iphone et android, jour ET nuit — les quatre autres profils sont couverts
#     par secu-structure (même largeurs) et par double-tout.sh (-appareils joue mac720, windows, ipad, petit) ;
#   · secu-crypto n'ouvre aucun navigateur (les pièces pures du socle, jouées dans Node).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/secu-tout.log"; : > "$J"; MAL=0
P="${PROFILS:-mac mac720 windows ipad iphone android petit}"
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | { grep "✗" | head -4 || true; } | { l=$(cat); [ -n "$l" ] && echo "$l" || echo "$s" | tail -4; } | cut -c1-260 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
lance "crypto (SHA, HMAC, HOTP, hasard : Node seul)" node $S/secu-crypto.js
for s in activation auto demo inactif inhabituelle mots nombre secrets telephone; do lance "$s" node $S/secu-$s.js; done
for n in 0 1; do lance "structure nuit=$n ($(echo $P | tr ' ' ','))" PROFILS=${P// /,} NUIT=$([ $n = 1 ] && echo 1) node $S/secu-structure.js; done
for p in mac iphone android; do for n in 0 1; do lance "captures $p nuit=$n" PROFIL=$p NUIT=$([ $n = 1 ] && echo 1) node $S/secu-captures.js; done; done
echo FINI | tee -a "$J"; exit $MAL
