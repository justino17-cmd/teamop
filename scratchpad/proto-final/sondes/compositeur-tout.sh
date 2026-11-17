#!/bin/bash
# Rejoue TOUTES les sondes du compositeur de contrat (famille « compositeur »), UNE à la fois (un seul navigateur), et dit pour chacune
# « N ✓ · M ✗ » et son code de sortie. Sort en 1 dès qu'une exécution tombe, et écrit FINI à la fin. Journal : $CAP/compositeur-tout.log (hors dépôt).
#   bash scratchpad/proto-final/sondes/compositeur-tout.sh
# Profils joués (chaque sonde le lit dans PROFIL, et NUIT=1 pour la nuit) : un ORDINATEUR de jour et un TÉLÉPHONE de nuit pour toutes ;
# en plus le PETIT téléphone (320 px) là où la mise en page se joue à 320 (gestes, mise en page, restes 1), et l'iPad pour la mise en page.
# LAISSÉS DE CÔTÉ pour tenir dans les 25 minutes de la famille : windows et android (mêmes règles que mac et iphone pour ces sondes),
# l'ordinateur de nuit et le téléphone de jour (la nuit et le jour ne changent que les couleurs ; une sonde qui veut les deux le fait elle-même).
# Pour tout jouer : TOUS=1 bash …/compositeur-tout.sh (ajoute windows, android, mac de nuit, iphone de jour : environ 45 minutes).
# Une sonde qui n'imprime pas « N ✓ · M ✗ » est montrée « sans bilan » : le code de sortie reste le verdict.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP
J="$CAP/compositeur-tout.log"; : > "$J"; DELAI="${DELAI:-590}"; ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-sans bilan}$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')" | tee -a "$J"
  if [ $code -ne 0 ]; then ko=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*(==)?[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
# jouer <sonde> <profil> [nuit]
jouer(){ local f="$1" p="$2" n="${3:-0}"; lance "compositeur-$f PROFIL=$p NUIT=$n" PROFIL=$p NUIT=$n node "$S/compositeur-$f.js"; }
for f in gestes liste mise-en-page restes1 restes1-recontrole restes2; do jouer $f mac 0; jouer $f iphone 1; done
for f in gestes mise-en-page restes1; do jouer $f petit 0; done
jouer mise-en-page ipad 0
if [ -n "$TOUS" ]; then
  for f in gestes liste mise-en-page restes1 restes1-recontrole restes2; do jouer $f mac 1; jouer $f iphone 0; done
  for f in gestes restes1 restes1-recontrole restes2; do jouer $f windows 0; jouer $f android 1; done
fi
echo FINI | tee -a "$J"; exit $ko
