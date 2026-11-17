#!/bin/bash
# Rejoue TOUTES les sondes des DROITS (qui voit quoi, qui peut quoi), une à la fois, et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Un seul navigateur à la fois : ne jamais en lancer deux en parallèle. Journal : $CAP/droits-tout.log (hors dépôt). Sort en 1 si une exécution tombe.
#
# Ce qui se joue : les sondes des droits jouent des RÔLES (Marc, Julie, Sophie, Karim, et des personnes fabriquées à cases réglées), pas des
# profils d'appareil — elles ne prennent aucun argument et ouvrent l'ordinateur (mac) ; seules « fiche » (le détail des droits : iphone, ipad, android,
# petit, jour et nuit) et « terrain » le font d'elles-mêmes. Un droit ne dépend pas de la largeur de l'écran : la mise en page des écrans de droits
# sur téléphone est tenue par « fiche » et par les captures (droits-captures.js).
# Écartés (des outils, pas des sondes) : droits-commun (bibliothèque), droits-captures (des PNG à REGARDER), droits-etat-avant (écrit un JSON de
# comparaison), droits-recensement (source de la table des gestes, lue par droits-table), droits-mutations (la contre-épreuve, son propre lancement).
# Variables : SONDES="menus table" ne joue que celles dont le nom contient l'un de ces mots.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/droits-tout.log"; : > "$J"
MAL=0
lance(){ # lance <nom affiché> <script> [arguments…]
  local nom="$1"; shift
  if [ -n "$SONDES" ]; then local ok=0 s; for s in $SONDES; do case "$nom" in *"$s"*) ok=1;; esac; done; [ $ok -eq 1 ] || return 0; fi
  local t0=$(date +%s); local s; s=$(timeout 590 node "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  [ $code -eq 124 ] && b="${b:+$b · }DÉLAI DÉPASSÉ (590 s)"
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-aucun total}" | tee -a "$J"
  if [ $code -ne 0 ]; then MAL=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*==' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
for s in table menus cases-voir formes lecture-seule partiel fiche restauration soi-meme acteur fabrication-css gestes-reels gestes-garde specifiques ponts bureau-toutes-cases terrain compta; do
  [ -f "$S/droits-$s.js" ] || { echo "0s code=2 droits-$s :: ABSENTE" | tee -a "$J"; MAL=1; continue; }
  lance "droits-$s" $S/droits-$s.js
done
echo FINI | tee -a "$J"
exit $MAL
