#!/usr/bin/env python3
# Assemble les captures du regard en UNE image à regarder (outil Read) : jour au-dessus, nuit dessous ;
# les trois téléphones côte à côte. Hors dépôt : tout va dans le dossier des captures.
#   regard-montage.py <scène> <groupe> [s<n>]   groupe : bureau (mac, windows) | tablette (ipad) | tel (iphone, android, petit) | un profil seul
import sys, os
from PIL import Image, ImageDraw
CAP = os.environ.get('CAP_REGARD', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-gerant-a/')
GROUPES = {'mac': ['mac'], 'windows': ['windows'], 'ipad': ['ipad'], 'tel': ['iphone', 'android', 'petit'], 'iphone': ['iphone'], 'android': ['android'], 'petit': ['petit']}
def main():
    scene, groupe = sys.argv[1], sys.argv[2]; s = sys.argv[3] if len(sys.argv) > 3 else 's0'
    profils = GROUPES[groupe]; lignes = []
    for mode in ('jour', 'nuit'):
        ims = []
        for pr in profils:
            f = f'{CAP}{scene}-{pr}-{mode}-{s}.png'
            if os.path.exists(f): ims.append(Image.open(f).convert('RGB'))
        if ims: lignes.append(ims)
    if not lignes: print('aucune capture', scene, groupe, s); sys.exit(1)
    # tablette : jour | nuit côte à côte (820 de large chacun) ; sinon jour au-dessus, nuit dessous
    cote = groupe == 'ipad'
    marge = 8
    if cote:
        ims = [l[0] for l in lignes]; W = sum(i.width for i in ims) + marge * (len(ims) - 1); H = max(i.height for i in ims)
        out = Image.new('RGB', (W, H), (255, 0, 255)); x = 0
        for i in ims: out.paste(i, (x, 0)); x += i.width + marge
    else:
        rangees = []
        for l in lignes:
            W = sum(i.width for i in l) + marge * (len(l) - 1); H = max(i.height for i in l)
            r = Image.new('RGB', (W, H), (255, 0, 255)); x = 0
            for i in l: r.paste(i, (x, 0)); x += i.width + marge
            rangees.append(r)
        W = max(r.width for r in rangees); H = sum(r.height for r in rangees) + marge * (len(rangees) - 1)
        out = Image.new('RGB', (W, H), (255, 0, 255)); y = 0
        for r in rangees: out.paste(r, (0, y)); y += r.height + marge
    # plafond de lisibilité pour l'outil Read : on garde les captures telles quelles tant que ça tient
    m = max(out.width, out.height)
    if m > 2000: k = 2000 / m; out = out.resize((int(out.width * k), int(out.height * k)), Image.LANCZOS)
    dest = f'{CAP}M-{scene}-{groupe}-{s}.png'; out.save(dest); print(dest, out.size)
main()
