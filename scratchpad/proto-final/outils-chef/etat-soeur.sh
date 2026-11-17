#!/bin/bash
# Met à jour la colonne « État » de la ligne d'une session sœur dans VOIES-EN-COURS.md, commite et pousse.
#   /home/user/etat-soeur.sh <numéro> '<état>'   (plusieurs paires possibles : n1 'état1' n2 'état2' …)
cd /home/user/teamop || exit 1
python3 - "$@" <<'PY'
import sys,re
p='scratchpad/proto-final/VOIES-EN-COURS.md'
s=open(p,encoding='utf-8').read().split('\n')
a=sys.argv[1:]
for k in range(0,len(a),2):
    n,etat=a[k],a[k+1]
    import datetime; etat=etat.replace('@H', datetime.datetime.now().strftime('%-H h %M'))
    for i,l in enumerate(s):
        if l.startswith(f'| {n} | session_'):
            c=l.split(' | ')
            # dernière cellule = état (la ligne finit par « | » ou « | |»)
            corps=l.rstrip()
            assert corps.endswith('|'), l
            j=corps.rstrip('|').rstrip().rfind('|')
            s[i]=corps[:j+1]+' '+etat+' |'
            break
    else:
        raise SystemExit(f'ligne de la sœur {n} introuvable')
open(p,'w',encoding='utf-8').write('\n'.join(s))
PY
[ $? -eq 0 ] || exit 1
git add scratchpad/proto-final/VOIES-EN-COURS.md && git commit -q -m "Voies en cours : état des sessions sœurs [skip ci]

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cw6RN2Nf56UygsM6AYoN1P" && (bash /home/user/pousser-chef.sh || bash /home/user/pousser-chef.sh)
