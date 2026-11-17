#!/bin/bash
# Rejoue TOUTES les sondes des INTERVENTIONS (liste, création, fiche, parcours de la technicienne, facture au retour, côté client), UNE à la fois, sur les profils et rôles qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/interventions-tout.sh      # le jeu ESSENTIEL : l'ordinateur (mac) de jour, le téléphone (iphone) de nuit (~25 min)
#   AVEC_TOUS=1 bash …/interventions-tout.sh                               # + mac de nuit, iphone de jour, android, petit (320 px), ipad, windows (~55 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/interventions-tout.log (hors dépôt).
#
# CONVENTIONS : la nuit s'écrit « nuit » (3ᵉ argument, ou 4ᵉ pour le recontrôle des parcours qui prend d'abord A|B|C). interventions-recontrole-parcours joue A (la technicienne, sur téléphone),
# B (le bureau crée, planifie, replanifie) et C (« Terminer » incomplet puis la facture) — on les joue tous trois. Les variables CONTRE et REEL des sondes sont des CONTRE-ÉPREUVES (elles posent
# un défaut exprès) : jamais posées ici.
# CE QUI N'EST PAS REJOUÉ, ET POURQUOI (des outils, sans verdict) :
#   interventions-outils.js (la bibliothèque) · interventions-balayage.js et interventions-recontrole-balayage.js (touchent chaque geste d'un écran sous la forme <qui:route[:préparation]> et
#   écrivent un rapport JSON — pas de « N ✓ · M ✗ », pas de code de sortie qui juge).
# Profils laissés de côté dans le jeu essentiel : android, petit, ipad, windows, et les deux autres combinaisons jour/nuit — joués avec AVEC_TOUS=1.
# ⚠️ interventions-mise-en-page.js réécrit son rapport interventions-mep-<profil>-<jour|nuit>.json dans scratchpad/proto-final/campagne/ (suivi par git) : `git status` le montre après un rejeu.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole} 2>/dev/null
J="${CAP:-/tmp}/interventions-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
# lance <libellé> <VARIABLES=valeur…> node <sonde> <arguments> : UNE sonde à la fois, 400 s au plus. Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 400 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }
AUTRES="android petit ipad windows"

# Les sondes « [profil] [nuit] » : l'ordinateur de jour, le téléphone de nuit.
for f in interventions-client interventions-parcours-bureau interventions-parcours-facture interventions-parcours-suite interventions-parcours-tech interventions-restes-1 interventions-mise-en-page; do
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone nuit" node "$S/$f.js" iphone nuit
  [ -n "$AVEC_TOUS" ] && { lance "$f mac nuit" node "$S/$f.js" mac nuit; lance "$f iphone" node "$S/$f.js" iphone; for p in $AUTRES; do lance "$f $p" node "$S/$f.js" $p; done; lance "$f petit nuit" node "$S/$f.js" petit nuit; }
done

# Qui voit quoi, et le retour d'une fiche : « [profil] » seul.
for f in interventions-parcours-roles interventions-retour; do
  lance "$f mac" node "$S/$f.js" mac
  lance "$f iphone" node "$S/$f.js" iphone
  [ -n "$AVEC_TOUS" ] && for p in $AUTRES; do lance "$f $p" node "$S/$f.js" $p; done
done

# Le recontrôle adverse : toutes ses sections, puis les trois parcours A, B, C.
lance "interventions-recontrole mac" node "$S/interventions-recontrole.js" mac
lance "interventions-recontrole iphone nuit" node "$S/interventions-recontrole.js" iphone nuit
[ -n "$AVEC_TOUS" ] && { lance "interventions-recontrole mac nuit" node "$S/interventions-recontrole.js" mac nuit; lance "interventions-recontrole iphone" node "$S/interventions-recontrole.js" iphone; lance "interventions-recontrole petit" node "$S/interventions-recontrole.js" petit; lance "interventions-recontrole ipad" node "$S/interventions-recontrole.js" ipad; }
for q in A B C; do
  lance "interventions-recontrole-parcours $q petit" node "$S/interventions-recontrole-parcours.js" $q petit
  lance "interventions-recontrole-parcours $q iphone nuit" node "$S/interventions-recontrole-parcours.js" $q iphone nuit
  [ -n "$AVEC_TOUS" ] && { lance "interventions-recontrole-parcours $q mac" node "$S/interventions-recontrole-parcours.js" $q mac; lance "interventions-recontrole-parcours $q android" node "$S/interventions-recontrole-parcours.js" $q android; lance "interventions-recontrole-parcours $q ipad nuit" node "$S/interventions-recontrole-parcours.js" $q ipad nuit; }
done

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
