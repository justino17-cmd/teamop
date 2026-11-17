#!/bin/bash
# Ajoute une session sœur au tableau de VOIES-EN-COURS.md, retire la ligne de la voie d'ici qu'elle remplace, commite et pousse.
#   /home/user/noter-soeur.sh <numéro> <session_id> '<voie et args>' '<motif de la ligne locale à retirer, ou vide>'
cd /home/user/teamop || exit 1
N="$1" S="$2" A="$3" L="$4" H="$(date +%-H' h '%M)" python3 - <<'PY'
import os,re
n,sid,args,loc,h=os.environ['N'],os.environ['S'],os.environ['A'],os.environ['L'],os.environ['H']
p='scratchpad/proto-final/VOIES-EN-COURS.md'
s=open(p,encoding='utf-8').read()
a="RESTE À OUVRIR, dès que leur partie est corrigée"
assert s.count(a)==1
i=s.index(a)
# la ligne se pose à la fin du tableau des sœurs (juste avant la ligne vide qui précède « RESTE À OUVRIR »)
k=s.rfind('\n|',0,i); k=s.index('\n',k+1)+1
s=s[:k]+f"| {n} | {sid} | {args} | {h} | |\n"+s[k:]
if loc and loc in s:
    i=s.index(loc); j=s.index('\n',i)+1; s=s[:i]+s[j:]
s=re.sub(r"État au 17 novembre, \d+ h \d\d","État au 17 novembre, "+h,s,count=1)
open(p,'w',encoding='utf-8').write(s)
PY
git add scratchpad/proto-final/VOIES-EN-COURS.md && git commit -q -m "Voies en cours : session sœur $1 ouverte [skip ci]

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cw6RN2Nf56UygsM6AYoN1P" && (bash /home/user/pousser-chef.sh || bash /home/user/pousser-chef.sh)
