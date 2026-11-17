#!/bin/bash
# usage: file2.sh sortie "sonde:profil:nuit:qui ..." — une sonde après l'autre
cd "$(dirname "$0")"; O=$1; shift; : > $O
for t in $@; do IFS=: read S P N Q <<< "$t"; echo "#### $S $P nuit=$N qui=${Q:-marc}" >> $O; PROFIL=$P NUIT=$N QUI=${Q:-marc} timeout 200 node $S.js >> $O 2>&1; echo "fin $?" >> $O; done
echo TERMINE >> $O
