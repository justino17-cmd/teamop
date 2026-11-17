#!/usr/bin/env python3
# Contre-épreuve du bouton principal de nuit (voie « nuit », 17 novembre 2026) : on remet chaque défaut dans UNE COPIE de la page
# (jamais dans le dépôt), on rejoue la sonde nuit-bouton-principal.js sur cette copie (RACINE=…), elle doit TOMBER.
# Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit.   python3 scratchpad/proto-final/sondes/nuit-mutations.py
import os, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
MUT = [
 ('M1 le bouton principal de nuit redevient bleu nuit', '--fill:#e9eef8; --on-fill:#0b1426; --fill-doux', '--fill:#2c3d63; --on-fill:#f0f3f8; --fill-doux'),
 ('M2 l\'encre du bouton principal reste claire sur l\'aplat clair', '--fill:#e9eef8; --on-fill:#0b1426;', '--fill:#e9eef8; --on-fill:#f0f3f8;'),
 ('M3 les puces choisies prennent l\'aplat du bouton principal', '.cb-chip[aria-pressed="true"]{background:var(--fill-doux);color:var(--on-doux)', '.cb-chip[aria-pressed="true"]{background:var(--fill);color:var(--on-fill)'),
 ('M4 le bleu nuit des repères disparaît (--fill-doux = aplat clair)', '--fill-doux:#2c3d63; --on-doux:#f0f3f8;', '--fill-doux:#e9eef8; --on-doux:#0b1426;'),
 ('M5 .btn lit le jeton doux (le bouton principal redevient bleu nuit)', '.btn{min-height:46px;padding:0 18px;border:0;border-radius:999px;background:var(--fill);color:var(--on-fill)', '.btn{min-height:46px;padding:0 18px;border:0;border-radius:999px;background:var(--fill-doux);color:var(--on-doux)'),
]
tombees = 0
for nom, a, b in MUT:
    t = tempfile.mkdtemp(prefix='opg-mut-')
    try:
        shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(t, 'apercu'))
        p = os.path.join(t, PAGE); s = open(p, encoding='utf-8').read()
        if s.count(a) < 1: print('  ? mutation mal visée (motif absent) :', nom); sys.exit(2)
        open(p, 'w', encoding='utf-8').write(s.replace(a, b, 1))
        env = dict(os.environ, RACINE=t, QUI='marc', PROFILS='mac')
        try: r = subprocess.run(['node', os.path.join(RACINE, 'scratchpad/proto-final/sondes/nuit-bouton-principal.js')], env=env, capture_output=True, text=True, timeout=200)
        except subprocess.TimeoutExpired: print('  ? délai dépassé, à rejouer :', nom); sys.exit(2)
        if r.returncode != 0: tombees += 1; print('  ✓ tombe :', nom, '·', [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:])
        else: print('  ✗ NE TOMBE PAS :', nom)
    finally: shutil.rmtree(t, ignore_errors=True)
print(f'== {tombees} mutations sur {len(MUT)} tombent'); sys.exit(0 if tombees == len(MUT) else 1)
