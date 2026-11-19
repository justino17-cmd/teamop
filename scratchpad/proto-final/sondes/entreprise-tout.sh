#!/bin/bash
# Rejoue TOUTES les sondes de l'ENTREPRISE (« Mon entreprise », « Achats et frais », leurs corrections et leur recontrôle), une à la fois, et dit pour
# chacune « N ✓ · M ✗ » et son code de sortie. Un seul navigateur à la fois. Journal : $CAP/entreprise-tout.log (hors dépôt). Sort en 1 si une exécution tombe.
#
# Ce qui se joue : la plupart des sondes jouent d'elles-mêmes leurs profils (structure, achats-lisible, corrections : petit, android, iphone, ipad, mac720,
# mac, jour et nuit) et ne prennent aucun argument ; celles qui n'ouvrent que « mac » (champs, destinations, garde-facture, liens, logo, phrases, rapide)
# et « lecture-seule » (iphone) se lancent une fois. Les deux sondes à SECTIONS se jouent section par section (une exécution chacune : un délai ou un
# plantage n'emporte pas les autres) : corrections 01 à 13 (la 12 avec la 01), recontrôle r01 à r13, casse1 à casse5, p1 à p3.
# Écartés (des outils, pas des sondes) : entreprise-commun (bibliothèque), entreprise-captures (des PNG à REGARDER), entreprise-mutations et
# entreprise-corrections-mutations.py (les contre-épreuves, leur propre lancement). Variables : SONDES="liens logo" ne joue que celles dont le nom
# contient l'un de ces mots ; RAPIDE=1 ne joue pas les sections du recontrôle ni des corrections (les sondes complètes suffisent à un contrôle court).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/entreprise-tout.log"; : > "$J"
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
for s in rapide structure champs destinations garde-facture liens lecture-seule phrases logo achats-lisible; do
  [ -f "$S/entreprise-$s.js" ] || { echo "0s code=2 entreprise-$s :: ABSENTE" | tee -a "$J"; MAL=1; continue; }
  lance "entreprise-$s" $S/entreprise-$s.js
done
for s in restes2-bandeau restes2-toast; do lance "entreprise-$s" $S/entreprise-$s.js; done
lance "entreprise-restes1-recontrole g" $S/entreprise-restes1-recontrole.js g
for s in restes3-bandeau restes3-lien restes3-blanc; do lance "entreprise-$s" $S/entreprise-$s.js; done
# recontrôle du tour 3 : « c » (créneaux proposés → options au planning sans la case Planning) est réglé au tour 4 (restes4-creneaux) : il rentre dans la série
for n in a b c d e f; do lance "entreprise-restes3-recontrole $n" $S/entreprise-restes3-recontrole.js $n; done
lance "entreprise-restes4-creneaux" $S/entreprise-restes4-creneaux.js
# tour 5 : le toast de « Confirmer le créneau » dit ce qui s'est passé (a, c) ; retirer une option est une écriture au planning, jouée à deux personnes
lance "entreprise-restes4-recontrole a" $S/entreprise-restes4-recontrole.js a
lance "entreprise-restes4-recontrole c" $S/entreprise-restes4-recontrole.js c
lance "entreprise-restes5-deuxpersonnes" $S/entreprise-restes5-deuxpersonnes.js
if [ -z "$RAPIDE" ]; then
  # « 12 » est jouée avec « 01 » (même bloc) ; « 06 » n'a pas de section
  for n in 01 02 03 04 05 07 08 09 10 11 13; do lance "entreprise-corrections $n" $S/entreprise-corrections.js $n; done
  for n in r01 r02 r03 r04 r05 r06 r07 r08 r09 r10 r11 r12 r13 casse1 casse1b casse2 casse3 casse4 casse5 p1 p2 p3; do lance "entreprise-recontrole $n" $S/entreprise-recontrole.js $n; done
fi
echo FINI | tee -a "$J"
exit $MAL
