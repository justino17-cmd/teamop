#!/bin/bash
# Rejoue TOUTES les sondes de l'ESPACE CLIENT (ce que voit le client : factures, devis, rendez-vous, documents, demandes), UNE à la fois, sur les profils qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/client-tout.sh             # le jeu ESSENTIEL : le téléphone (iphone) de jour, l'ordinateur (mac) de nuit, plus le « mode application » (~20 min)
#   AVEC_TOUS=1 bash …/client-tout.sh                                      # + iphone de nuit, mac de jour, android, petit (320 px), ipad, windows (~45 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/client-tout.log (hors dépôt).
#
# CONVENTIONS (propres à cette famille) : « app » en dernier argument ouvre le MODE APPLICATION, sans la bande « Tester en tant que » — ce que voit un vrai client ; sans lui, le prototype nu
# garde son échafaudage. La nuit s'écrit « nuit » (3ᵉ argument), le jour « jour » quand un argument suit. client-recontrole prend ses SECTIONS en 3ᵉ argument avant « app » : on les nomme toutes.
# CE QUI N'EST PAS REJOUÉ : client-outils.js (la bibliothèque : ouvrir le prototype nu et passer en Client) · client-rapport.py (fabrique le rapport JSON des constats, pas une sonde).
# Profils laissés de côté dans le jeu essentiel : android, petit, ipad, windows, et les deux autres combinaisons jour/nuit — joués avec AVEC_TOUS=1.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole} 2>/dev/null
J="${CAP:-/tmp}/client-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
# lance <libellé> <VARIABLES=valeur…> node <sonde> <arguments> : UNE sonde à la fois, 400 s au plus. Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 400 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }
SECT=mots,paiement,autres,demande,routes,regard
AUTRES="android petit ipad windows"

# Les sondes « [profil] [app] » : constats de mise en page et de vocabulaire, mots et documents (PDF recalculés au centime).
for f in client-constats client-mots-documents; do
  lance "$f iphone" node "$S/$f.js" iphone
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone app" node "$S/$f.js" iphone app
  lance "$f mac app" node "$S/$f.js" mac app
  [ -n "$AVEC_TOUS" ] && for p in $AUTRES; do lance "$f $p" node "$S/$f.js" $p; done
done
lance "client-document iphone" node "$S/client-document.js" iphone
lance "client-document mac" node "$S/client-document.js" mac
[ -n "$AVEC_TOUS" ] && for p in $AUTRES; do lance "client-document $p" node "$S/client-document.js" $p; done

# Les sondes « [profil] [nuit] » : parcours de bout en bout, gestes (cinq clients), captures à regarder.
for f in client-parcours client-gestes client-regard; do
  lance "$f iphone" node "$S/$f.js" iphone
  lance "$f mac nuit" node "$S/$f.js" mac nuit
  [ -n "$AVEC_TOUS" ] && { lance "$f iphone nuit" node "$S/$f.js" iphone nuit; lance "$f mac" node "$S/$f.js" mac; for p in $AUTRES; do lance "$f $p" node "$S/$f.js" $p; done; }
done

# La mise en page : jour ET nuit, valeurs usuelles ET valeurs longues, nu ET en mode application.
lance "client-mise-en-page iphone jour" node "$S/client-mise-en-page.js" iphone jour
lance "client-mise-en-page iphone nuit longs" node "$S/client-mise-en-page.js" iphone nuit longs
lance "client-mise-en-page mac jour" node "$S/client-mise-en-page.js" mac jour
lance "client-mise-en-page mac nuit longs app" node "$S/client-mise-en-page.js" mac nuit longs app
lance "client-mise-en-page android jour app" node "$S/client-mise-en-page.js" android jour app
if [ -n "$AVEC_TOUS" ]; then
  for p in petit ipad windows; do lance "client-mise-en-page $p jour" node "$S/client-mise-en-page.js" $p jour; lance "client-mise-en-page $p nuit longs app" node "$S/client-mise-en-page.js" $p nuit longs app; done
  lance "client-mise-en-page iphone jour longs app" node "$S/client-mise-en-page.js" iphone jour longs app
fi

# Le recontrôle adverse : six sections (mots, paiement, autres, demande, routes, regard), nu puis en mode application.
lance "client-recontrole iphone jour" node "$S/client-recontrole.js" iphone jour $SECT
lance "client-recontrole mac nuit" node "$S/client-recontrole.js" mac nuit $SECT
lance "client-recontrole iphone jour app" node "$S/client-recontrole.js" iphone jour $SECT app
lance "client-recontrole mac nuit app" node "$S/client-recontrole.js" mac nuit $SECT app
if [ -n "$AVEC_TOUS" ]; then
  lance "client-recontrole iphone nuit" node "$S/client-recontrole.js" iphone nuit $SECT
  lance "client-recontrole mac jour app" node "$S/client-recontrole.js" mac jour $SECT app
  for p in $AUTRES; do lance "client-recontrole $p jour app" node "$S/client-recontrole.js" $p jour $SECT app; done
fi

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
