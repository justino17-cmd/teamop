#!/bin/bash
# Rejoue TOUTES les sondes de la famille « double » (double authentification, étape 3 : pirate, verrouillage, Sécurité, Équipe, Mon compte, gestes sensibles), une à la fois,
# et dit pour chacune « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ». Un seul navigateur à la fois. Sort en 1 si une sonde tombe. Journal : $CAP/double-tout.log (hors dépôt).
# Couverture, dite plutôt que cachée : ces huit sondes ouvrent chacune leurs profils (ordinateur ET téléphone, jour ET nuit pour -appareils, -compte et -securite) et leurs rôles
# (Marc, Sophie, Karim…) elles-mêmes ; aucune ne lit PROFIL, NUIT ou QUI dans l'environnement, donc il n'y a rien à faire varier ici.
# La contre-épreuve de la voie (chaque faille remise doit faire tomber sa sonde) est à part : python3 scratchpad/proto-final/sondes/double-auth-mutations.py
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/double-tout.log"; : > "$J"; MAL=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | { grep "✗" | head -4 || true; } | { l=$(cat); [ -n "$l" ] && echo "$l" || echo "$s" | tail -4; } | cut -c1-260 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for s in appareils compte equipe fenetre mots pirate securite sensibles; do lance "$s" node $S/double-auth-$s.js; done
echo FINI | tee -a "$J"; exit $MAL
