#!/bin/bash
# Rejoue TOUTES les sondes de MATÉRIEL (Mon camion, Stock, Dépôts, Four, voisins), une à la fois, et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Un seul navigateur à la fois : ne jamais en lancer deux en parallèle. Journal : $CAP/materiel-tout.log (hors dépôt). Sort en 1 si une exécution tombe.
#
# Profils joués : mac (ordinateur) et iphone (téléphone) pour tout ; android pour « doublon » et « technicien-corrections » (l'écran du technicien).
# DURÉE : environ 25 minutes par défaut (mesuré le 17/11 : 38 min au complet, 25,5 min sans ipad ni android). LAISSÉS DE CÔTÉ pour tenir les 25 minutes de la famille : ipad et android
# pour les sondes d'APPAREILS (mise en page), mac720, windows et petit, « boucles mac » et « four-appareils mac nuit » (le mac de nuit est déjà
# joué par depots-appareils, stock-appareils et nuit). COMPLET=1 remet ipad, android, « boucles mac » et « four-appareils mac nuit » : 38 minutes.
# Les trois autres profils se rejouent à la main : « node materiel-<sonde>.js mac720 windows petit ».
# Écartés (des outils, pas des sondes) : les « -captures » (elles écrivent des PNG à REGARDER, rien à conclure) et « -mutations » (la
# contre-épreuve, qui rejoue les sondes sur des copies mutées : elle a son propre lancement, DEPUIS=… DRY=1).
# Variables : COMPLET=1 (voir plus haut) ; SONDES="camion table" ne joue que celles dont le nom contient l'un de ces mots.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/materiel-tout.log"; : > "$J"
MAL=0
lance(){ # lance <nom affiché> <script> [arguments…]  (les variables d'environnement se posent AVANT l'appel de lance : NUIT=0 lance …)
  local nom="$1"; shift
  if [ -n "$SONDES" ]; then local ok=0 s; for s in $SONDES; do case "$nom" in *"$s"*) ok=1;; esac; done; [ $ok -eq 1 ] || return 0; fi
  local t0=$(date +%s); local s; s=$(timeout 590 node "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  [ $code -eq 124 ] && b="${b:+$b · }DÉLAI DÉPASSÉ (590 s)"
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-aucun total}" | tee -a "$J"
  if [ $code -ne 0 ]; then MAL=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*==' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
if [ -n "$COMPLET" ]; then APP="mac iphone ipad android"; else APP="mac iphone"; fi

# 1. Sans navigateur : les fonctions réelles de la page, lues dans le fichier (présence, définition unique).
lance "fonctions"        $S/materiel-fonctions.js
lance "depots-fonctions" $S/materiel-depots-fonctions.js
lance "four-fonctions"   $S/materiel-four-fonctions.js
# 2. Les sondes qui jouent d'elles-mêmes leurs rôles et profils : un seul lancement.
lance "camion"           $S/materiel-camion.js
lance "gestes"           $S/materiel-gestes.js
lance "pieces"           $S/materiel-pieces.js
lance "depots-mots"      $S/materiel-depots-mots.js
lance "depots-roles"     $S/materiel-depots-roles.js
lance "depots-visites"   $S/materiel-depots-visites.js
lance "four-roles"       $S/materiel-four-roles.js
lance "four-visites"     $S/materiel-four-visites.js
lance "stock-coherence"  $S/materiel-stock-coherence.js
lance "stock-mots"       $S/materiel-stock-mots.js
lance "stock-roles"      $S/materiel-stock-roles.js
lance "stock-visites"    $S/materiel-stock-visites.js
# 3. Les sondes à PROFIL en argument : ordinateur puis téléphone.
for p in mac iphone; do
  [ $p = mac ] && [ -z "$COMPLET" ] || lance "boucles $p"            $S/materiel-boucles.js $p
  lance "table $p"              $S/materiel-table.js $p
  lance "coherence $p"          $S/materiel-coherence.js $p
  lance "roles $p"              $S/materiel-roles.js $p
  lance "mots $p"               $S/materiel-mots.js $p
  lance "visites $p"            $S/materiel-visites.js $p
  lance "voisins $p"            $S/materiel-voisins.js $p
  lance "bureau-corrections $p" $S/materiel-bureau-corrections.js $p
  lance "depots-gestes $p"      $S/materiel-depots-gestes.js $p
  lance "four-gestes $p"        $S/materiel-four-gestes.js $p
  lance "four-mots $p"          $S/materiel-four-mots.js $p
  lance "stock-gestes $p"       $S/materiel-stock-gestes.js $p
done
lance "doublon iphone"  $S/materiel-doublon.js iphone
lance "doublon android" $S/materiel-doublon.js android
for p in iphone android; do lance "technicien-corrections $p" $S/materiel-technicien-corrections.js $p; done
# 4. Les sondes d'APPAREILS (mise en page) : un profil par exécution, jour ET nuit pour celles qui prennent les deux d'elles-mêmes.
for p in $APP; do
  lance "appareils $p"           $S/materiel-appareils.js $p
  lance "depots-appareils $p"    $S/materiel-depots-appareils.js $p
  lance "stock-appareils $p"     $S/materiel-stock-appareils.js $p
  lance "nuit $p"                $S/materiel-nuit.js $p
  lance "four-densite $p"        $S/materiel-four-densite.js $p
  lance "stock-densite $p"       $S/materiel-stock-densite.js $p
  lance "four-appareils $p jour" $S/materiel-four-appareils.js $p
  [ $p = mac ] && [ -z "$COMPLET" ] || lance "four-appareils $p nuit" $S/materiel-four-appareils.js $p nuit
done
echo FINI | tee -a "$J"
exit $MAL
