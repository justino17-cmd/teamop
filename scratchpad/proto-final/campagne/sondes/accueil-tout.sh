#!/bin/bash
# Rejoue TOUTES les sondes de l'Accueil (Accueil, Statistiques, Historique), UNE à la fois, sur les profils et les rôles qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/accueil-tout.sh            # le jeu ESSENTIEL : mac, iphone, ipad et petit (320 px), jour ET nuit quand la sonde le prend (~15 min)
#   AVEC_TOUS=1 bash …/accueil-tout.sh                                     # + windows, android, et l'autre moitié jour/nuit de chaque profil (~30 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/accueil-tout.log (hors dépôt).
#
# CE QUI N'EST PAS REJOUÉ, ET POURQUOI (des outils, pas des contrôles — ils n'ont ni « N ✓ · M ✗ » ni code de sortie qui juge) :
#   accueil-outils.js (la bibliothèque) · accueil-recon.js et accueil-roles.js (recensent ce que voit chaque personne, sortie JSON : aucun contrôle ; accueil-parcours.js joue déjà d'autres rôles que le gérant
#   et la famille « droits » (droits-tout.sh) joue les droits du menu) · accueil-gestes.js (touche chaque geste d'un écran et les range dans un rapport)
#   accueil-destinations.js, accueil-histo-cas.js, accueil-historique-lignes.js (explorations : elles écrivent ce que chaque tuile ou ligne ouvre, sans verdict — la COHÉRENCE
#   qu'elles regardaient est jouée avec verdict par accueil-coherence.js et accueil-recontrole-parcours.js) · accueil-regard.js (captures à regarder, pas de contrôle).
# Profils laissés de côté dans le jeu essentiel : windows et android (et, pour chaque profil, la moitié jour/nuit qui n'est pas jouée) — joués avec AVEC_TOUS=1.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole} 2>/dev/null
J="${CAP:-/tmp}/accueil-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
ESSENTIELS="mac iphone ipad petit"; AUTRES="windows android"
# lance <libellé> <VARIABLES=valeur…> node <sonde> <arguments> : UNE sonde à la fois, 400 s au plus. Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 400 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }
plus(){ [ -n "$AVEC_TOUS" ] && lance "$@"; return 0; }

# Les sondes qui ne prennent que le profil (le jour : elles n'ont pas d'option nuit).
for f in accueil-coherence accueil-corrections accueil-parcours accueil-parcours2 accueil-mots accueil-vides accueil-recontrole-divers; do
  for p in $ESSENTIELS; do lance "$f $p" node "$S/$f.js" $p; done
  [ -n "$AVEC_TOUS" ] && for p in $AUTRES; do lance "$f $p" node "$S/$f.js" $p; done
done

# Celles qui prennent « nuit » : un profil de jour sur deux, un de nuit sur deux (et l'inverse avec AVEC_TOUS).
for f in accueil-recontrole accueil-recontrole-parcours accueil-restes-1; do
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone nuit" node "$S/$f.js" iphone nuit
  lance "$f ipad" node "$S/$f.js" ipad
  lance "$f petit nuit" node "$S/$f.js" petit nuit
  if [ -n "$AVEC_TOUS" ]; then
    lance "$f mac nuit" node "$S/$f.js" mac nuit; lance "$f iphone" node "$S/$f.js" iphone; lance "$f ipad nuit" node "$S/$f.js" ipad nuit
    lance "$f petit" node "$S/$f.js" petit; lance "$f windows" node "$S/$f.js" windows; lance "$f android nuit" node "$S/$f.js" android nuit
  fi
done

# Le recontrôle des « restes » (4 parties A à E : argent reçu sur place, bilan, fondu du graphique, autres rôles, valeurs longues) : « [partie] [profil] [nuit] », toutes les parties à la suite.
lance "accueil-restes-1-recontrole toutes mac" node "$S/accueil-restes-1-recontrole.js" toutes mac
lance "accueil-restes-1-recontrole toutes iphone nuit" node "$S/accueil-restes-1-recontrole.js" toutes iphone nuit
lance "accueil-restes-1-recontrole toutes ipad" node "$S/accueil-restes-1-recontrole.js" toutes ipad
lance "accueil-restes-1-recontrole toutes petit nuit" node "$S/accueil-restes-1-recontrole.js" toutes petit nuit
if [ -n "$AVEC_TOUS" ]; then
  lance "accueil-restes-1-recontrole toutes mac nuit" node "$S/accueil-restes-1-recontrole.js" toutes mac nuit; lance "accueil-restes-1-recontrole toutes iphone" node "$S/accueil-restes-1-recontrole.js" toutes iphone
  lance "accueil-restes-1-recontrole toutes windows" node "$S/accueil-restes-1-recontrole.js" toutes windows; lance "accueil-restes-1-recontrole toutes android nuit" node "$S/accueil-restes-1-recontrole.js" toutes android nuit
fi

# La mise en page : jour ET nuit, valeurs usuelles ET valeurs longues.
lance "accueil-mise-en-page mac" node "$S/accueil-mise-en-page.js" mac
lance "accueil-mise-en-page iphone" node "$S/accueil-mise-en-page.js" iphone
lance "accueil-mise-en-page mac nuit" node "$S/accueil-mise-en-page.js" mac nuit
lance "accueil-mise-en-page iphone nuit long" node "$S/accueil-mise-en-page.js" iphone nuit long
lance "accueil-mise-en-page ipad" node "$S/accueil-mise-en-page.js" ipad
lance "accueil-mise-en-page petit nuit long" node "$S/accueil-mise-en-page.js" petit nuit long
if [ -n "$AVEC_TOUS" ]; then
  for p in windows android; do lance "accueil-mise-en-page $p" node "$S/accueil-mise-en-page.js" $p; done
  lance "accueil-mise-en-page mac long" node "$S/accueil-mise-en-page.js" mac long
  lance "accueil-mise-en-page ipad nuit" node "$S/accueil-mise-en-page.js" ipad nuit
  lance "accueil-mise-en-page android nuit long" node "$S/accueil-mise-en-page.js" android nuit long
fi

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
