#!/usr/bin/env python3
# Une BANDE : plusieurs scènes d'un même profil côte à côte (téléphone : 4 de front), pour les regarder d'un coup d'œil.
#   regard-bande.py <profil> <jour|nuit> <scène[:s<n>]> ...      →  B-<profil>-<mode>-<première scène>.png
import sys, os
from PIL import Image
CAP = os.environ.get('CAP_REGARD', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-a/')
pr, mode, scenes = sys.argv[1], sys.argv[2], sys.argv[3:]
ims = []
for sc in scenes:
    nom, _, s = sc.partition(':'); f = f'{CAP}{nom}-{pr}-{mode}-{s or "s0"}.png'
    if os.path.exists(f): ims.append(Image.open(f).convert('RGB'))
    else: print('manque', f)
if not ims: sys.exit(1)
m = 6; W = sum(i.width for i in ims) + m * (len(ims) - 1); H = max(i.height for i in ims)
out = Image.new('RGB', (W, H), (255, 0, 255)); x = 0
for i in ims: out.paste(i, (x, 0)); x += i.width + m
if max(out.size) > 2000: k = 2000 / max(out.size); out = out.resize((int(out.width * k), int(out.height * k)), Image.LANCZOS)
dest = f'{CAP}B-{pr}-{mode}-{scenes[0].replace(":", "_")}.png'; out.save(dest); print(dest, out.size)
