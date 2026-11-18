#!/usr/bin/env python3
# Contre-épreuve de la sonde nuit-recontrole-etats.js (restes « nuit », tour 1, 18 novembre 2026) : on remet chaque défaut dans UNE COPIE de la
# page (jamais dans le dépôt), on rejoue la sonde sur cette copie (RACINE=…), elle doit TOMBER. Ces trois défauts sont ceux que la sonde du
# correcteur (nuit-bouton-principal.js) NE VOIT PAS : survol, bouton éteint, bouton du toast.   python3 scratchpad/proto-final/sondes/nuit-recontrole-mutations.py
import os, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
MUT = [
 ('R1 le survol de nuit redevient bleu nuit (texte sombre sur #344873)', ':root[data-mode="nuit"] .btn:not(.gris):not(.rouge):not(.vert):hover{background:#fff}', ':root[data-mode="nuit"] .btn:not(.gris):not(.rouge):not(.vert):hover{background:#344873}'),
 ('R2 le bouton éteint n\'est plus éteint', '.btn[disabled]{opacity:.4;cursor:not-allowed}', '.btn[disabled]{opacity:1;cursor:not-allowed}'),
 ('R3 le bouton du toast lit le bleu nuit avec l\'encre sombre', '#toast button{min-height:40px;padding:0 16px;border-radius:999px;border:0;background:var(--fill);color:var(--on-fill)', '#toast button{min-height:40px;padding:0 16px;border-radius:999px;border:0;background:var(--fill-doux);color:var(--on-fill)'),
]
tombees = 0
for nom, a, b in MUT:
    t = tempfile.mkdtemp(prefix='opg-mut-')
    try:
        shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(t, 'apercu'))
        p = os.path.join(t, PAGE); s = open(p, encoding='utf-8').read()
        if s.count(a) != 1: print('  ? mutation mal visée (motif absent ou en double :', s.count(a), ') :', nom); sys.exit(2)
        open(p, 'w', encoding='utf-8').write(s.replace(a, b, 1))
        env = dict(os.environ, RACINE=t, PROFILS='mac')
        try: r = subprocess.run(['node', os.path.join(RACINE, 'scratchpad/proto-final/sondes/nuit-recontrole-etats.js')], env=env, capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired: print('  ? délai dépassé, à rejouer :', nom); sys.exit(2)
        if r.returncode != 0: tombees += 1; print('  ✓ tombe :', nom, '·', [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:])
        else: print('  ✗ NE TOMBE PAS :', nom)
    finally: shutil.rmtree(t, ignore_errors=True)
print(f'== {tombees} mutations sur {len(MUT)} tombent'); sys.exit(0 if tombees == len(MUT) else 1)
