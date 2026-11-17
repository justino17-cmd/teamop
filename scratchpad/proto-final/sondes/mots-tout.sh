#!/bin/bash
# TOUT LE CONTRÔLE DES MOTS, DANS L'ORDRE : (1) les règles s'éprouvent sur du texte fabriqué, (2) le navigateur relit chaque rôle (un à la fois : la machine est
# partagée), (3) la visite parlée, le guide des nouveautés et la connexion, (4) le relevé profond déjà fait est recontrôlé. Sort en 1 au premier rôle qui tombe.
# usage : bash scratchpad/proto-final/sondes/mots-tout.sh   (≈ 25 minutes : à lancer en arrière-plan, pas dans une commande de 580 s)
cd "$(dirname "$0")/../../.." || exit 2
S=scratchpad/proto-final/sondes; rc=0
node $S/mots-regles-banc.js || rc=1
for q in marc julie sm kb client; do echo "── $q"; timeout 590 node $S/mots-interdits.js $q || rc=1; done
echo "── visite, guide, connexion"; timeout 590 node $S/mots-hors-rubriques.js mac && timeout 590 node $S/mots-visite.js mac || rc=1
node $S/mots-interdits.js --corpus connexion guide-marc guide-julie guide-sm guide-kb visite || rc=1
exit $rc
