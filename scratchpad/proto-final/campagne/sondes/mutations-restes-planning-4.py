#!/usr/bin/env python3
# Mutation du tour 4 du Planning : retirer la règle qui garde la hauteur d'une ligne de panneau doit faire tomber restes-planning-4.js.
# Ordre du dépôt : correctif commité AVANT de muter ; la restauration se fait par écriture du texte d'origine, jamais par git checkout.
import subprocess, sys, os
P = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'apercu', 'prototype-op-gestion.html')
R = ".panneau .ligne-clic,.panneau .kpi-l,.panneau > .btn{flex-shrink:0}\n"
orig = open(P, encoding='utf-8').read()
assert orig.count(R) == 1, 'la règle à muter est absente ou en double'
chute = 0
try:
    open(P, 'w', encoding='utf-8').write(orig.replace(R, ''))
    r = subprocess.run(['node', os.path.join(os.path.dirname(__file__), 'restes-planning-4.js'), 'mac'], capture_output=True, text=True, timeout=300)
    chute = 1 if r.returncode == 1 else 0
    print('M1 règle retirée : sonde ' + ('TOMBE' if chute else 'RESTE VERTE (mutation inutile)'), r.stdout.strip().splitlines()[-2:])
finally:
    open(P, 'w', encoding='utf-8').write(orig)
sys.exit(0 if chute else 1)
