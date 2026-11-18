#!/usr/bin/env python3
# Mutations sur COPIES (jamais sur la page livrée) : la sonde restes-compta-plein-ecran.js doit tomber sur chacune. usage : python3 restes-compta-plein-ecran-mutations.py
import os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SONDE = os.path.join(os.path.dirname(__file__), 'restes-compta-plein-ecran.js')
MUT = [
 ('A le ≡ de la Comptabilité redevient visible au téléphone (deux boutons à trois traits)', 'prototype-comptabilite.html', '@media (max-width:760px){html.cadre .barre .ouvrir-menu{display:none}}', ''),
 ('B la carte « Copie ce texte » retombe sous le cadre', 'prototype-op-gestion.html', 'body:has(#cpsys:not([hidden])) #sortie-carte{z-index:9200}', ''),
 ('C la bulle retombe sous le cadre', 'prototype-op-gestion.html', 'body:has(#cpsys:not([hidden])) #toast{z-index:9200}', ''),
 ('D le bouton « Menu » du cadre n\'apparaît plus au téléphone (menu inaccessible)', 'prototype-op-gestion.html', '@media (max-width:760px){.cpsys-barre .cpsys-menu{display:inline-flex;min-height:44px}}', ''),
 ('E le bouton « Menu » apparaît aussi sur ordinateur', 'prototype-op-gestion.html', '.cpsys-barre .cpsys-menu{display:none;align-items:center;gap:7px}', '.cpsys-barre .cpsys-menu{display:inline-flex;align-items:center;gap:7px}'),
]
nok = 0
for nom, page, a, b in MUT:
    d = tempfile.mkdtemp(prefix='mut-cpe-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', page); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('MAL VISÉE', nom, s.count(a)); nok += 1; continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    r = subprocess.run(['node', SONDE], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout)
    tombe = r.returncode == 1 and m and int(m[-1][1]) > 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom, m[-1] if m else r.stdout[-200:] + r.stderr[-200:]); nok += 0 if tombe else 1
    shutil.rmtree(d, ignore_errors=True)
sys.exit(1 if nok else 0)
