#!/bin/bash
# Rejoue TOUTES les sondes de la famille « contrats » (liste, fiche, nouveau contrat, signature, renouvellement, visite comprise, droits), UNE à la fois (un seul
# navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. FINI à la fin ; sort en 1 si une exécution tombe.
#   bash scratchpad/proto-final/campagne/sondes/contrats-tout.sh             # le passage par défaut (mac + iphone, jour et nuit, voir ci-dessous)
#   COMPLET=1 bash …/contrats-tout.sh                                         # + le JOUR des cinq autres profils de la sonde de mise en page (ipad, android, windows, petit, mac720)
#   AVEC_BALAYAGE=1 bash …/contrats-tout.sh                                   # + le balayage (recensement de gestes)
# Journal complet : $CAP/contrats-tout.log (hors dépôt). Durée : voir la ligne « DURÉE » imprimée en fin de passage.
#
# CE QUI EST JOUÉ (le passage par défaut, ~20 min mesurées le 19/11 sur machine calme : 1 369 s pour tout moins la moitié « jour » des profils de la dernière ligne) : TOUTES les sondes
# sur l'ordinateur « mac » ET le téléphone « iphone », jour ET nuit quand la sonde prend « nuit » ; la sonde de mise en page sur les cinq autres profils (ipad, android, windows,
# petit, mac720) en NUIT.
# CE QUI EST LAISSÉ DE CÔTÉ (pour tenir dans les 25 minutes) — sous COMPLET=1 : la moitié « jour » de la sonde de mise en page sur ces cinq profils (+ ~2,5 min).
# CE QUI N'EST JOUÉ QUE SOUS AVEC_BALAYAGE=1 : contrats-balayage, un RECENSEMENT (page neuve, un geste, ce qu'il a fait) sans verdict propre — le verdict s'y fabrique :
#   « ✓ » = geste touché, « ✗ » = geste non touché ou erreur de console.
# CE QUI N'EST JAMAIS JOUÉ : contrats-outils.js (un outil, pas un contrôle).
# Les sondes réécrivent des relevés JSON suivis dans campagne/ : à la fin le script LISTE ceux qui ont bougé ; les remettre (git checkout -- <fichier>) avant de
# commiter, sauf si l'on veut vraiment les renouveler.
# Tout le corps est dans une fonction : bash lit un script au fur et à mesure, et le modifier pendant qu'il tourne le fait dérailler.
main(){
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP; J="$CAP/contrats-tout.log"; : > "$J"
S=scratchpad/proto-final/campagne/sondes
DELAI="${DELAI:-420}"; ko=0; T0=$(date +%s)

# Le balayage n'imprime pas de total : lignes « 12 T libellé … » (touché) ou « 12 ✗ libellé … » (non touché) ; « err N [...] » : N > 0 = erreur de console.
synth_bal(){ awk '/^ *[0-9]+ T /{ ok++ } /^ *[0-9]+ ✗ /{ ko++ } /^err [1-9]/{ ko++ } END{ printf "%d ✓ · %d ✗", ok, ko }' <<< "$1"; }

lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  if [ -n "$SYN" ]; then b="$(synth_$SYN "$s")"; if [ $code -eq 0 ] && { ! echo "$b" | grep -qE ' 0 ✗$' || echo "$b" | grep -qE '^0 ✓'; }; then code=1; fi; nom="$nom (verdict fabriqué)"; fi
  [ $code -eq 0 ] && [ -z "$b" ] && b="aucun total imprimé"
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep -E "✗|ÉCHEC|Error" | grep -vE '^[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | sed 's/^/    /' | tee -a "$J"; ko=$((ko+1)); fi; }
sonde(){ local niv="$1"; shift; [ "$niv" = C ] && [ -z "$COMPLET" ] && return 0; lance "$@"; }
PC=mac; TEL=iphone
duo(){ local tel="$1" nom="$2"; shift 2; sonde E "$nom mac" "$@" mac; sonde "$tel" "$nom iphone" "$@" iphone; }
duon(){ local tel="$1" nom="$2"; shift 2; sonde E "$nom mac jour" "$@" mac; sonde "$tel" "$nom iphone nuit" "$@" iphone nuit; sonde E "$nom mac nuit" "$@" mac nuit; sonde E "$nom iphone jour" "$@" iphone; }

# Sondes qui se jouent par profil, sans nuit : ordinateur, puis téléphone (courtes : le téléphone est dans le passage essentiel ; les parcours longs seulement sous COMPLET=1).
for x in atelier debut fiche-taches recontrole-d renouvellement roles visite-comprise; do duo E "contrats $x" node $S/contrats-$x.js; done
for x in parcours-a parcours-b parcours-c; do duo E "contrats $x" node $S/contrats-$x.js; done
# Sondes qui prennent « nuit » : ordinateur de jour, téléphone de nuit (et l'autre moitié sous COMPLET=1).
duon E "contrats fiche-barre" node $S/contrats-fiche-barre.js
duon E "contrats mise-en-page" node $S/contrats-mise-en-page.js
for x in recontrole-a recontrole-b recontrole-c recontrole-e; do duon E "contrats $x" node $S/contrats-$x.js; done
for p in ipad android windows petit mac720; do
  sonde E "contrats mise-en-page $p nuit" node $S/contrats-mise-en-page.js $p nuit
  sonde C "contrats mise-en-page $p jour" node $S/contrats-mise-en-page.js $p
done

# ───────────── balayage (opt-in) : route = écran de « Contrats » ─────────────
if [ -n "$AVEC_BALAYAGE" ]; then
  for r in contrats contrat-x-c1 contrat-x-c3 contrat-nouveau signer-x-c3; do SYN=bal lance "balayage contrats marc mac $r" node $S/contrats-balayage.js mac marc $r; done
  for r in contrats contrat-x-c1 contrat-nouveau; do SYN=bal lance "balayage contrats marc iphone $r" node $S/contrats-balayage.js iphone marc $r; done
fi

echo "DURÉE $(( $(date +%s)-T0 )) s" | tee -a "$J"
git status --short scratchpad/proto-final/campagne/*.json | sed 's/^/  relevé réécrit par une sonde : /' | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
}
main "$@"; exit $?
