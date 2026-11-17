#!/bin/bash
# Rejoue TOUTES les sondes de l'Accueil (Accueil, Statistiques, Historique), UNE à la fois, sur les profils et les rôles qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/accueil-tout.sh            # le jeu ESSENTIEL : un ordinateur (mac) et un téléphone (iphone), jour ET nuit quand la sonde le prend (~25 min)
#   AVEC_TOUS=1 bash …/accueil-tout.sh                                     # + windows, ipad, android, petit (320 px), nuit partout, valeurs longues (~50 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/accueil-tout.log (hors dépôt).
#
# CE QUI N'EST PAS REJOUÉ, ET POURQUOI (des outils, pas des contrôles — ils n'ont ni « N ✓ · M ✗ » ni code de sortie qui juge) :
#   accueil-outils.js (la bibliothèque) · accueil-recon.js (recense, sortie JSON) · accueil-gestes.js (touche chaque geste d'un écran et les range dans un rapport)
#   accueil-destinations.js, accueil-histo-cas.js, accueil-historique-lignes.js (explorations : elles écrivent ce que chaque tuile ou ligne ouvre, sans verdict — la COHÉRENCE
#   qu'elles regardaient est jouée avec verdict par accueil-coherence.js et accueil-recontrole-parcours.js) · accueil-regard.js (captures à regarder, pas de contrôle).
# Profils laissés de côté dans le jeu essentiel : windows, ipad, android, petit — joués avec AVEC_TOUS=1.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole} 2>/dev/null
J="${CAP:-/tmp}/accueil-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
# lance <libellé> <VARIABLES=valeur…> node <sonde> <arguments> : UNE sonde à la fois, 400 s au plus. Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 400 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }
plus(){ [ -n "$AVEC_TOUS" ] && lance "$@"; return 0; }

# Les sondes qui ne prennent que le profil.
for f in accueil-coherence accueil-corrections accueil-parcours accueil-parcours2 accueil-mots accueil-roles accueil-vides; do
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone" node "$S/$f.js" iphone
  [ -n "$AVEC_TOUS" ] && for p in windows ipad android petit; do lance "$f $p" node "$S/$f.js" $p; done
done
lance "accueil-recontrole-divers mac" node "$S/accueil-recontrole-divers.js" mac
lance "accueil-recontrole-divers iphone" node "$S/accueil-recontrole-divers.js" iphone
plus "accueil-recontrole-divers petit" node "$S/accueil-recontrole-divers.js" petit

# Celles qui prennent « nuit » : jour sur l'ordinateur, nuit sur le téléphone (et l'inverse avec AVEC_TOUS).
for f in accueil-recontrole accueil-recontrole-parcours accueil-restes-1; do
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone nuit" node "$S/$f.js" iphone nuit
  [ -n "$AVEC_TOUS" ] && { lance "$f mac nuit" node "$S/$f.js" mac nuit; lance "$f iphone" node "$S/$f.js" iphone; lance "$f ipad" node "$S/$f.js" ipad; lance "$f petit nuit" node "$S/$f.js" petit nuit; }
done

# La mise en page : jour ET nuit, valeurs usuelles ET valeurs longues.
lance "accueil-mise-en-page mac" node "$S/accueil-mise-en-page.js" mac
lance "accueil-mise-en-page iphone" node "$S/accueil-mise-en-page.js" iphone
lance "accueil-mise-en-page mac nuit" node "$S/accueil-mise-en-page.js" mac nuit
lance "accueil-mise-en-page iphone nuit long" node "$S/accueil-mise-en-page.js" iphone nuit long
if [ -n "$AVEC_TOUS" ]; then
  for p in windows ipad android petit; do lance "accueil-mise-en-page $p" node "$S/accueil-mise-en-page.js" $p; done
  lance "accueil-mise-en-page mac long" node "$S/accueil-mise-en-page.js" mac long
  lance "accueil-mise-en-page petit nuit long" node "$S/accueil-mise-en-page.js" petit nuit long
fi

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
