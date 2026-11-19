#!/usr/bin/env python3
# Contre-épreuve des RETOUCHES du regard gérant F (18 novembre 2026) : on défait chaque retouche dans une COPIE de la page (jamais dans le dépôt)
# et la sonde qui la garde doit tomber (sortie ≠ 0). Une mutation qui ne tombe pas est mal visée : on la corrige.
#   python3 scratchpad/proto-final/sondes/mutations-regard-gerant-f-retouches.py   — « N mutations, M tombent », sortie 1 si l'une ne tombe pas.
# ⛔ À lancer APRÈS avoir commité (une mutation interrompue ne doit jamais laisser le fichier du dépôt dans un état muté : ici on ne touche qu'une copie).
import os, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = os.path.join(RACINE, 'apercu', 'prototype-op-gestion.html')
src = open(PAGE, encoding='utf-8').read()
S = os.path.join(RACINE, 'scratchpad/proto-final/sondes')
RET, PLAN = S + '/regard-gerant-f-retouches.js', S + '/regard-gerant-f-recontrole-plan.js'
MUT = [
  ('1', PLAN, 'iphone,petit', 'le plan de l\'aperçu redevient 4/3 sur téléphone', '@media (max-width:760px){.rg-doc .d3-plan{aspect-ratio:3/4}}', '@media (max-width:760px){.rg-doc .d3-plan{aspect-ratio:4/3}}'),
  ('2', RET, '2', '« Fermer » repart seul à gauche', '.doc-barre+.actions{justify-content:center}', '.doc-barre+.actions{justify-content:flex-start}'),
  ('3', RET, '3', '« Créer le devis » reprend son ancien rembourrage et passe sur deux lignes', '.dx-barre .btn{padding:0 12px;max-width:54%}}', '.dx-barre .btn{padding:0 16px;max-width:46%}}'),
  ('4', RET, '4', 'les colonnes d\'activité se resserrent à gauche', '.d3-h{display:flex;flex-direction:column;align-items:center;gap:4px;flex:1 1 64px;min-width:64px}', '.d3-h{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:64px}'),
  ('5', RET, '5', 'l\'écran vide de la carte des box perd son bouton', '<span class="gris">Quand un client est suivi au registre sanitaire, le plan de ses box paraît ici. Pour commencer, ouvre un client.</span><span class="ms-vb"><button type="button" class="btn" data-go="clients">Voir mes clients</button></span>', '<span class="gris">Quand un client est suivi au registre sanitaire, le plan de ses box paraît ici. Pour commencer, ouvre un client.</span>'),
  ('5', RET, '5', 'l\'écran vide de la technicienne perd son bouton', '<span class="ms-vb"><button type="button" class="btn" data-go="majournee">Voir ma journée</button></span>', ''),
  ('6', RET, '6', 'le fondu du haut de menu repasse à 34 px', '.menu .m-liste.m-plus-haut{-webkit-mask-image:linear-gradient(transparent,#000 12px);mask-image:linear-gradient(transparent,#000 12px)}', '.menu .m-liste.m-plus-haut{-webkit-mask-image:linear-gradient(transparent,#000 34px);mask-image:linear-gradient(transparent,#000 34px)}'),
  ('6', RET, '6', 'la rangée pile contre le bord n\'est plus reconnue (fondu gardé)', "l.classList.toggle('m-pile-haut', pileHaut);", "l.classList.toggle('m-pile-haut', false);"),
  ('8', RET, '8', '« Planifier » perd sa cible sur la fiche d\'un site', 'data-rg="planifier|${k}" style="margin-top:6px">Planifier</button>', 'data-rg="plan-x|${k}" style="margin-top:6px">Planifier</button>'),
]
tombent = 0
for sec, sonde, arg, nom, a, b in MUT:
    if src.count(a) != 1:
        print('  ✗ ancre introuvable ou multiple (%d) : %s' % (src.count(a), nom)); sys.exit(2)
    tmp = tempfile.mkdtemp(prefix='mutgfr-')
    try:
        shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
        open(os.path.join(tmp, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(src.replace(a, b))
        r = subprocess.run(['node', sonde, arg], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=500)
        ok = r.returncode != 0
        bilan = [l for l in r.stdout.splitlines() if l.startswith('==')]
        print('  %s mutation (retouche %s) : %s  %s' % ('tombe ✓' if ok else 'NE TOMBE PAS ✗', sec, nom, bilan[-1] if bilan else r.stderr[-120:]))
        tombent += ok
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
print('\n%d mutations, %d tombent' % (len(MUT), tombent)); sys.exit(0 if tombent == len(MUT) else 1)
