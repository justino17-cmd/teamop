#!/bin/bash
# Pousse les commits du chef de chantier SANS fusionner dans /home/user/teamop (des sondes peuvent y lire les pages) :
# la fusion avec la branche distante se fait dans l'arbre à part /home/user/wt-chef, et c'est elle qui est poussée.
cd /home/user/teamop || exit 1
BR=claude/op-gestion-interface-yb6p32; MOI=$(git rev-parse HEAD)
git fetch -q origin $BR || exit 1; REM=$(git rev-parse FETCH_HEAD)
[ -d /home/user/wt-chef ] || git worktree add -q --detach /home/user/wt-chef $REM
git -C /home/user/wt-chef checkout -q --detach $REM || exit 1
git -C /home/user/wt-chef merge -q -m "Fusion de la branche [skip ci]" $MOI || { echo "✗ conflit de fusion dans /home/user/wt-chef"; exit 1; }
(cd /home/user/wt-chef && node scratchpad/proto-final/sondes/compiler-pages.js >/dev/null) || { echo "✗ une page ne compile pas après fusion"; exit 1; }
git -C /home/user/wt-chef push -q origin HEAD:$BR || exit 1
git fetch -q origin $BR
echo "poussé · commits non poussés : $(git log origin/$BR..HEAD --oneline | wc -l) · non commité : $(git status --short | wc -l)"
