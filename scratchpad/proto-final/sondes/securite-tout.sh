#!/bin/bash
# Rejoue TOUTES les gardes de l'audit de sécurité (étape 7, 17 novembre 2026), une à la fois (un seul navigateur), et dit pour chacune
# « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ». Sort en 1 si une garde tombe, et NOMME laquelle. Journal : $CAP/securite-tout.log (hors dépôt).
#   bash scratchpad/proto-final/sondes/securite-tout.sh            → les huit gardes
#   RAPIDE=1 bash …/securite-tout.sh                                → seulement celles qui ne lancent pas de navigateur (statique)
# Couverture, dite plutôt que cachée : ces gardes ouvrent leur(s) profil(s) elles-mêmes (ordinateur « mac », jour) et aucune ne lit PROFIL, NUIT ou QUI dans l'environnement :
# elles prouvent des REFUS (injection, fichiers, accès, confiance, liens, politique de contenu), pas une mise en page — il n'y a pas de téléphone ni de nuit à y rejouer.
# La contre-épreuve (chaque faille remise dans une copie doit faire tomber sa garde) est à part : python3 scratchpad/proto-final/sondes/securite-mutations.py
ICI="$(cd "$(dirname "$0")" && pwd)"; RACINE="$(cd "$ICI/../../.." && pwd)"; cd "$RACINE" || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/securite-tout.log"; : > "$J"; MAL=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then MAL=1; echo "$s" | { grep "✗" | head -6 || true; } | { l=$(cat); [ -n "$l" ] && echo "$l" || echo "$s" | tail -4; } | cut -c1-240 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
lance "statique (politiques, empreintes, fichiers : sans navigateur)" node $S/securite-statique.js
if [ -z "$RAPIDE" ]; then
  # securite-politique sert les bibliothèques tierces depuis une copie locale, effacée à chaque redémarrage : on la restaure (empreintes comparées à celles de la page).
  bash $S/bibliotheques-locales.sh >> "$J" 2>&1 || { echo "0s code=1 bibliothèques locales manquantes :: "; MAL=1; }
  lance "injection (un texte venu d'ailleurs n'est jamais du code)" node $S/securite-injection.js
  lance "fichiers (SVG, formules de tableur, import borné)" node $S/securite-fichiers.js
  lance "accès (Comptabilité, client simulé)" node $S/securite-acces.js
  lance "confiance (un numéro cité par un inconnu)" node $S/securite-confiance.js
  lance "liens (courriel hostile, lien lu comme il s'ouvre)" node $S/securite-liens.js
  lance "politique (rien ne sort, l'usage normal passe)" node $S/securite-politique.js
fi
echo FINI | tee -a "$J"; exit $MAL
