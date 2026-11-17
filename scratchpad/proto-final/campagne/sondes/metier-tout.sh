#!/bin/bash
# Rejoue TOUTES les sondes de la campagne « métiers » (famille « metier » : les quatorze sondes metier-3d-*.js), UNE à la fois (un seul
# navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 dès qu'une exécution tombe, et écrit FINI à la fin.
# Journal : $CAP/metier-tout.log (hors dépôt).
#   bash scratchpad/proto-final/campagne/sondes/metier-tout.sh
# Ce que chaque sonde sait jouer :
#   · parcours (A à K) et mise-en-page, zone-pastilles, carte-boutons : elles bouclent d'elles-mêmes sur leurs profils (la mise en page
#     prend une liste de profils en argument : jouée ici UN profil à la fois, jour ET de nuit — c'est la sonde qui fait les deux) ;
#   · gestes : « profil:qui[:routes] » (marc = gérant, sm = la technicienne, qui n'a que le registre) ; mots : « jeux de métiers » puis
#     profil, rôle, écrans ;
#   · donnees, fiches, creation, droits, multi, carte-filtres, menu : elles n'ont pas d'argument et ouvrent l'application sur le Mac
#     (le menu rejoue en plus le téléphone pour la feuille « Menu » de la technicienne) : jouées une fois.
# ÉCARTÉS : metier-3d-outils.js (outil partagé) et metier-3d-mutations.py (la contre-épreuve, qui réécrit des copies : jouée à part).
# LAISSÉS DE CÔTÉ pour tenir dans les 25 minutes : windows et mac720 pour la mise en page et les gestes (mêmes règles que mac), les
# métiers autres que ceux de « mots » ci-dessous (la sonde « donnees » lit déjà les 24, la sonde « fiches » sept, « creation » sept jeux).
# Pour tout jouer : TOUS=1 (ajoute windows et mac720, les gestes de la technicienne sur Mac, le passage de « mots » sur trois métiers de plus).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP
J="$CAP/metier-tout.log"; : > "$J"; DELAI="${DELAI:-590}"; ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: ${b:-sans bilan}$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')" | tee -a "$J"
  if [ $code -ne 0 ]; then ko=1; echo "$s" | grep '✗' | grep -vE '^[[:space:]]*(==)?[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
# Le dossier d'écriture des sondes (fixé en dur dans metier-3d-outils.js) vit sous /tmp : une machine qui redémarre l'efface, et « donnees »
# puis « gestes » tombent alors sur un ENOENT qui n'a rien à voir avec l'application (vu le 17 novembre, 12 h 25). On le recrée, sans le deviner.
mkdir -p "$(node -e "process.stdout.write(require('./$S/metier-3d-outils.js').CAP)")"
# jouer <fichier sans metier-3d-> [arguments…]
jouer(){ local f="$1"; shift; lance "metier-3d-$f $*" node "$S/metier-3d-$f.js" "$@"; }
# « mots » n'a pas de verdict : il RELÈVE les mots d'un autre métier et rend une ligne JSON (écrans ouverts, boutons de création touchés, erreurs de page)
# puis « relevés : N dans des données d'exemple (écartés), M dans des TEXTES ». Le verdict est posé ICI, et dit : ✓ = écrans ouverts + boutons
# touchés ; ✗ = erreurs de page + relevés dans des TEXTES qui ne sont pas le nom de l'entreprise fictive de la démonstration (« Clim Services 17 »,
# qui porte le mot « clim » chez tout métier : c'est un nom propre, pas un texte de l'application). Un relevé réel se lit dans la sortie.
mots(){ local t0=$(date +%s); local s; s=$(timeout "$DELAI" node "$S/metier-3d-mots.js" "$@" 2>&1); local code=$?
  local j; j=$(echo "$s" | grep -E '^\{"packs"' | tail -1); local e=0 b=0 t=0 r=0
  if [ -n "$j" ]; then e=$(echo "$j" | grep -oE '"ecrans":[0-9]+' | grep -oE '[0-9]+'); b=$(echo "$j" | grep -oE '"touches":[0-9]+' | grep -oE '[0-9]+'); t=$(echo "$j" | grep -oE '"erreurs":[0-9]+' | grep -oE '[0-9]+'); fi
  r=$(echo "$s" | grep -E '^   \[' | grep -vcE 'Clim Services 17')
  local nok=$((e+b)) nko=$((t+r)); [ -z "$j" ] && { nok=0; nko=1; }
  echo "$(( $(date +%s)-t0 ))s code=$code metier-3d-mots $* :: $nok ✓ · $nko ✗$([ $code -eq 124 ] && echo ' · DÉLAI DÉPASSÉ')" | tee -a "$J"
  if [ $code -ne 0 ] || [ $nko -ne 0 ]; then ko=1; echo "$s" | grep -E '✗|ERREUR|^   \[' | grep -v 'Clim Services 17' | head -3 | cut -c1-220 | tee -a "$J"; fi; }
# 1. Ce qui se lit sur l'ordinateur sans argument
jouer menu; jouer droits; jouer donnees; jouer fiches; jouer creation; jouer multi; jouer carte-filtres
# 2. Les parcours de bout en bout (A à K ; ils bouclent sur Mac et iPhone, et la technicienne)
jouer parcours
# 3. Les gestes : le gérant sur ordinateur et téléphone, la technicienne au téléphone
jouer gestes mac:marc; jouer gestes iphone:marc; jouer gestes iphone:sm
# 4. Les mots d'un autre métier, par jeu de métiers (profil, rôle)
mots plomberie mac marc; mots nettoyage iphone marc; mots 3d mac marc
# 5. Le toucher et la mise en page (la sonde joue jour ET nuit)
jouer carte-boutons mac,iphone; jouer zone-pastilles iphone,android,petit,ipad
for p in mac ipad iphone android petit; do jouer mise-en-page $p; done
if [ -n "$TOUS" ]; then
  jouer gestes mac:sm; jouer gestes windows:marc; jouer gestes mac720:marc
  mots climatisation mac marc; mots electricite iphone marc; mots "plomberie,electricite" android marc
  for p in windows mac720; do jouer mise-en-page $p; done
fi
echo FINI | tee -a "$J"; exit $ko
