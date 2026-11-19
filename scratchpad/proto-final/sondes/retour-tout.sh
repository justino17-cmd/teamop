#!/bin/bash
# Rejoue TOUTES les sondes « bouton Retour » (calques isolés, parcours, atelier), une à la fois, et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Un seul navigateur à la fois : ne jamais en lancer deux en parallèle. Journal : $CAP/retour-tout.log (hors dépôt). Sort en 1 dès qu'une exécution tombe.
# Couverture : voir « DURÉE » plus bas (profils joués par défaut, profils laissés de côté, COMPLET=1 pour tout) ; jour seulement (un calque n'a pas de teinte à lui : la nuit ne change que des couleurs que d'autres sondes mesurent).
# retour-captures est un outil de capture (à regarder), il n'est pas rejoué ici.
# Le recontrôle adverse est rejoué à la fin (voir plus bas). Les contre-épreuves (mutations) se lancent à part : node scratchpad/proto-final/sondes/retour-mutations.js
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; J="$CAP/retour-tout.log"; : > "$J"
tombe=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env "$@" 2>&1); local code=$?; local b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"; if [ $code -ne 0 ]; then tombe=1; echo "$s" | { grep "✗" | head -4 || true; } | { l=$(cat); [ -n "$l" ] && echo "$l" || echo "$s" | tail -4; } | cut -c1-260 | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
# DURÉE : ~100 s par exécution de calques (mesuré le 17/11, machine calme) ; les 13 sortes de calques × 7 profils dépassent les 25 minutes d'une famille.
# Par défaut (ESSENTIEL) : un téléphone (android) ET un ordinateur (mac) pour TOUS les genres de calques, puis le parcours, l'atelier et le courrier (un téléphone) ;
# LAISSÉS DE CÔTÉ par défaut : les calques sur iphone, ipad, windows et petit (les mêmes écrans que android et mac à d'autres largeurs : le calque se ferme par le même
# mécanisme d'historique) — COMPLET=1 les rejoue (une demi-heure de plus).
tels="android mac"; [ -n "$COMPLET" ] && tels="android iphone mac"
for p in $tels; do lance "calques $p (1/3)" PROFIL=$p GENRE=panneau,fenetre,date node $S/retour-calques.js; lance "calques $p (2/3)" PROFIL=$p GENRE=planning,recherche,pdf,visionneuse node $S/retour-calques.js; lance "calques $p (3/3)" PROFIL=$p GENRE=paiement,carte,atelier,nouveautes,menu node $S/retour-calques.js; done
if [ -n "$COMPLET" ]; then for p in ipad windows petit; do lance "calques $p (1/2)" PROFIL=$p GENRE=panneau,fenetre,date,planning,recherche,pdf node $S/retour-calques.js; lance "calques $p (2/2)" PROFIL=$p GENRE=visionneuse,paiement,carte,atelier,nouveautes,menu node $S/retour-calques.js; done; fi
for p in android mac; do lance "parcours $p" PROFIL=$p node $S/retour-parcours.js; done
for p in android mac; do lance "atelier retour $p" PROFIL=$p node $S/atelier-retour.js; done
# La Boîte mail et une fenêtre de l'hôte dans le même historique : le module n'empile ses niveaux qu'au téléphone, on joue donc un téléphone (l'ordinateur n'a rien à y prouver).
lance "courrier android" PROFIL=android node $S/retour-courrier.js
if [ -n "$COMPLET" ]; then for p in iphone; do lance "parcours $p" PROFIL=$p node $S/retour-parcours.js; lance "atelier retour $p" PROFIL=$p node $S/atelier-retour.js; done; for p in iphone petit; do lance "courrier $p" PROFIL=$p node $S/retour-courrier.js; done; fi
# Le RECONTRÔLE ADVERSE (retour-recontrole*.js : chaque bouton d'écran, les pièges, les rôles, le cadre de la Comptabilité, la Boîte mail) a son propre script ; la partie ESSENTIELLE (une dizaine de minutes) est rejouée ici,
# pour qu'une seule commande (tout-rejouer.sh) la couvre. SANS_RECONTROLE=1 la saute ; COMPLET=1 joue la série entière (plus d'une heure). Les sondes « restes » de la campagne : campagne/sondes/retour-tout.sh.
if [ -z "$SANS_RECONTROLE" ]; then
  bash $S/retour-recontrole-tout.sh 2>&1 | grep -E 'code=[0-9]+ ' | sed -E 's/ code=([0-9]+) / code=\1 recontrôle /' | tee -a "$J"; [ "${PIPESTATUS[0]}" -ne 0 ] && tombe=1
fi
echo FINI | tee -a "$J"; exit $tombe
