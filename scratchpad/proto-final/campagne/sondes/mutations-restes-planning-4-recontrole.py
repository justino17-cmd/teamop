#!/usr/bin/env python3
# Mutation du recontrôle du tour 4 du Planning : retirer la règle des lignes de panneau doit faire tomber la sonde du FOND (restes-planning-4-recontrole-fond.js).
# Correctif commité avant de muter ; restauration par écriture du texte d'origine, jamais par git checkout.
import subprocess, sys, os
D = os.path.dirname(__file__); P = os.path.join(D, '..', '..', '..', '..', 'apercu', 'prototype-op-gestion.html')
R = ".panneau .ligne-clic,.panneau .kpi-l,.panneau > .btn{flex-shrink:0}\n"
orig = open(P, encoding='utf-8').read(); assert orig.count(R) == 1
chute = 0
try:
    open(P, 'w', encoding='utf-8').write(orig.replace(R, ''))
    r = subprocess.run(['node', os.path.join(D, 'restes-planning-4-recontrole-fond.js'), 'mac'], capture_output=True, text=True, timeout=300)
    chute = 1 if r.returncode == 1 else 0
    print('M1 règle retirée : sonde du fond ' + ('TOMBE' if chute else 'RESTE VERTE (mutation inutile)'), [l for l in r.stdout.splitlines() if '✗' in l][:3])
finally:
    open(P, 'w', encoding='utf-8').write(orig)
sys.exit(0 if chute else 1)
