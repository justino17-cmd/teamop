#!/bin/bash
# Rejoue TOUTES les sondes du TECHNICIEN (Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés), UNE à la fois, sur les profils et les rôles qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/technicien-tout.sh         # le jeu ESSENTIEL : le téléphone (iphone) de jour, l'ordinateur (mac) de nuit (~30 min)
#   AVEC_TOUS=1 bash …/technicien-tout.sh                                  # + iphone de nuit, mac de jour, android, petit (320 px), ipad (~60 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/technicien-tout.log (hors dépôt).
#
# CONVENTIONS (elles changent d'une sonde à l'autre) : la nuit s'écrit « 1 » en 2ᵉ argument (jamais « nuit ») ; le rôle (« sm » technicienne, « kb » chef d'équipe) en 3ᵉ.
# CE QUI N'EST PAS REJOUÉ, ET POURQUOI (des outils, pas des contrôles) :
#   technicien-explore.js (recense, « ne conclut rien », variables d'environnement) · technicien-balayage.js (balaie UN écran, arguments <profil> <qui> <route> [préparation] : il ÉCRIT le rapport
#   de gestes auquel technicien-recontrole-balayage.js compare — c'est ce dernier, avec verdict, qui est rejoué).
# Laissés de côté dans le jeu essentiel : android, petit, ipad, les deux autres combinaisons jour/nuit, et le balayage de recontrôle sur ordinateur (trop long) — joués avec AVEC_TOUS=1.
# ⚠️ Les sondes « balayage » et « mise en page » réécrivent leurs rapports JSON dans scratchpad/proto-final/campagne/ (suivis par git) : `git status` les montre après un rejeu.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole} 2>/dev/null
J="${CAP:-/tmp}/technicien-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
# lance <libellé> <VARIABLES=valeur…> node <sonde> <arguments> : UNE sonde à la fois, 400 s au plus (DELAI=… pour une sonde plus longue). Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "${DELAI:-400}" env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }

# Les sondes « [profil] [nuit=0|1] » : le téléphone de jour, l'ordinateur de nuit ; le reste avec AVEC_TOUS.
for f in technicien-corrections technicien-parcours-frais technicien-parcours-heures technicien-parcours-intervention technicien-parcours-prevenir-bureau \
         technicien-parcours-tache-pour-marc technicien-parcours-taches-conges technicien-valeurs-longues; do
  lance "$f iphone 0" node "$S/$f.js" iphone 0
  lance "$f mac 1" node "$S/$f.js" mac 1
  [ -n "$AVEC_TOUS" ] && { lance "$f iphone 1" node "$S/$f.js" iphone 1; lance "$f mac 0" node "$S/$f.js" mac 0; lance "$f android 1" node "$S/$f.js" android 1; lance "$f petit 0" node "$S/$f.js" petit 0; lance "$f ipad 0" node "$S/$f.js" ipad 0; }
done

# La barre du bas n'existe que sur téléphone : sur ordinateur la sonde attend un onglet qui n'y est pas et ne finit qu'à son délai (mesuré le 17/11 : 217 s perdues). On la joue sur les trois téléphones.
lance "technicien-barre iphone 0" node "$S/technicien-barre.js" iphone 0
lance "technicien-barre android 1" node "$S/technicien-barre.js" android 1
lance "technicien-barre petit 0" node "$S/technicien-barre.js" petit 0
[ -n "$AVEC_TOUS" ] && { lance "technicien-barre iphone 1" node "$S/technicien-barre.js" iphone 1; lance "technicien-barre android 0" node "$S/technicien-barre.js" android 0; lance "technicien-barre petit 1" node "$S/technicien-barre.js" petit 1; }

# 320 px : la cible de « Mes congés » (technicien-09) ne se joue qu'au plus petit écran.
lance "technicien-absences-petit petit 0" node "$S/technicien-absences-petit.js" petit 0
lance "technicien-absences-petit petit 1" node "$S/technicien-absences-petit.js" petit 1

# Menu, barre du bas, droits : la technicienne (sm) et le chef d'équipe (kb).
lance "technicien-parcours-menu-droits iphone 0 sm" node "$S/technicien-parcours-menu-droits.js" iphone 0 sm
lance "technicien-parcours-menu-droits mac 1 kb" node "$S/technicien-parcours-menu-droits.js" mac 1 kb
lance "technicien-recontrole-droits iphone 0 sm" node "$S/technicien-recontrole-droits.js" iphone 0 sm
lance "technicien-recontrole-droits mac 1 kb" node "$S/technicien-recontrole-droits.js" mac 1 kb
lance "technicien-recontrole-liens iphone 0 sm" node "$S/technicien-recontrole-liens.js" iphone 0 sm
lance "technicien-recontrole-liens mac 1 kb" node "$S/technicien-recontrole-liens.js" mac 1 kb
if [ -n "$AVEC_TOUS" ]; then
  for r in "iphone 1 kb" "mac 0 sm" "android 0 sm" "petit 1 sm"; do
    lance "technicien-parcours-menu-droits $r" node "$S/technicien-parcours-menu-droits.js" $r
    lance "technicien-recontrole-droits $r" node "$S/technicien-recontrole-droits.js" $r
    lance "technicien-recontrole-liens $r" node "$S/technicien-recontrole-liens.js" $r
  done
fi

# Les trois parcours du chef d'équipe (congé refusé puis accepté, frais, tâche) : P1, P2, P3.
lance "technicien-recontrole-parcours iphone 0 P1,P2,P3" node "$S/technicien-recontrole-parcours.js" iphone 0 P1,P2,P3
lance "technicien-recontrole-parcours mac 1 P1,P2,P3" node "$S/technicien-recontrole-parcours.js" mac 1 P1,P2,P3
[ -n "$AVEC_TOUS" ] && { lance "technicien-recontrole-parcours iphone 1 P1,P2,P3" node "$S/technicien-recontrole-parcours.js" iphone 1 P1,P2,P3; lance "technicien-recontrole-parcours android 0 P1,P2,P3" node "$S/technicien-recontrole-parcours.js" android 0 P1,P2,P3; }

# Le balayage de recontrôle : chaque geste de six écrans, comparé au rapport d'avant les corrections (qui n'existe que pour mac et iphone). Sur téléphone : ~4 min ; sur ordinateur il y a plus de gestes
# à toucher (plus de 400 s mesurés le 17/11, délai dépassé) : il n'est joué qu'avec AVEC_TOUS, et avec un délai de 900 s.
lance "technicien-recontrole-balayage iphone sm 0" node "$S/technicien-recontrole-balayage.js" iphone sm 0
if [ -n "$AVEC_TOUS" ]; then
  DELAI=900 lance "technicien-recontrole-balayage mac sm 1" node "$S/technicien-recontrole-balayage.js" mac sm 1
  lance "technicien-recontrole-balayage iphone sm 1" node "$S/technicien-recontrole-balayage.js" iphone sm 1; lance "technicien-recontrole-balayage iphone kb 0" node "$S/technicien-recontrole-balayage.js" iphone kb 0
  DELAI=900 lance "technicien-recontrole-balayage mac sm 0" node "$S/technicien-recontrole-balayage.js" mac sm 0
fi

# La mise en page : 6 écrans × profils × jour ET nuit (3ᵉ argument « 2 » = les deux), puis l'ordinateur.
lance "technicien-mise-en-page iphone,android,petit 2 sm" node "$S/technicien-mise-en-page.js" iphone,android,petit 2 sm
lance "technicien-mise-en-page mac 2 sm" node "$S/technicien-mise-en-page.js" mac 2 sm
[ -n "$AVEC_TOUS" ] && lance "technicien-mise-en-page ipad,windows,mac720 2 sm" node "$S/technicien-mise-en-page.js" ipad,windows,mac720 2 sm

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
