#!/usr/bin/env python3
"""Mutations des packs métier (v766, Tour v2.78) — chaque défaut remis doit faire tomber un banc.
Joué dans un arbre git à part (worktree), jamais dans la copie de travail : `git checkout` y restaure depuis HEAD.
Usage : python3 scratchpad/mutations-packs-metier.py <dossier-du-worktree>"""
import subprocess, sys, os
W = sys.argv[1]
def lire(f): return open(os.path.join(W, f), encoding='utf-8').read()
def ecrire(f, s): open(os.path.join(W, f), 'w', encoding='utf-8').write(s)
def banc(t):
    try:
        r = subprocess.run(['node', 'tests/test-%s.js' % t], cwd=W, capture_output=True, text=True, timeout=400)
        return r.returncode, (r.stdout + r.stderr)
    except subprocess.TimeoutExpired:
        return 124, 'DÉLAI'
M = [
  ('serveur : la maçonnerie retirée de METIERS_OK', 'server/index.js', "'nettoyage', 'maconnerie', 'menuiserie'", "'nettoyage', 'menuiserie'", ['848']),
  ('Tour : « autre » retiré de MET_L', 'tour.html', ",autre:'Autre métier de terrain'};\nfunction metDemande", "};\nfunction metDemande", ['848']),
  ('portail : « autre » retiré de METIER_L', 'espace.html', ",autre:'Autre métier de terrain'};", "};", ['848']),
  ('portail : l\'option « autre » écrite à la main revient', 'espace.html', ".join('')}</select>\n        <p class=\"muted\" style=\"margin:6px 0 0;font-size:12px\">Votre application est réglée sur votre métier", ".join('')}<option value=\"autre\">Un autre métier — précisez-le dans votre besoin</option></select>\n        <p class=\"muted\" style=\"margin:6px 0 0;font-size:12px\">Votre application est réglée sur votre métier", ['848']),
  ('application : le paysagiste ne masque plus les box', 'app.html', "{k:'dechets',l:'Déchets verts évacués',u:'m³'},{k:'tps',l:'Temps passé sur site',u:'h'}],\n    masque:['registre','carteBox','devisXylo','boxes'] }", "{k:'dechets',l:'Déchets verts évacués',u:'m³'},{k:'tps',l:'Temps passé sur site',u:'h'}],\n    masque:['registre','carteBox','devisXylo'] }", ['848']),
  ('application : « Dératisation » dans le pack multiservices', 'app.html', "types:['Petits travaux','Maintenance préventive'", "types:['Petits travaux','Dératisation','Maintenance préventive'", ['848']),
  ('application : « Autre » sans relevé', 'app.html', "releves:[{k:'tps',l:'Temps passé sur site',u:'h'},{k:'materiel',l:'Matériel utilisé',u:'',txt:true}],", "releves:[{k:'tps',l:'Temps passé sur site',u:'h'}],", ['848']),
  ('application : la couverture retirée de METIERS_ORDRE', 'app.html', "'paysagiste','couverture','multiservices'", "'paysagiste','multiservices'", ['848', '835']),
  ('application : le pack couverture sans types (retombe sur la liste 3D)', 'app.html', "types:['Réparation de toiture','Recherche de fuite',", "typesX:['Réparation de toiture','Recherche de fuite',", ['848']),
  ('site : la couverture redevient « sur mesure »', 'scripts/site-marine.js', "['couverture', 'Couverture / Zinguerie', 'Toiture · gouttières · étanchéité', 1]", "['couverture', 'Couverture / Zinguerie', 'Toiture · gouttières · étanchéité', 0]", ['835']),
  ('site : une puce porte une clé inconnue de l\'application', 'scripts/site-marine.js', "['paysagiste', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', 1]", "['espaces-verts', 'Paysagiste / Espaces verts', 'Entretien · création · élagage', 1]", ['835']),
  ('maquette : la carte Couverture disparaît', 'apercu/site-apple.html', '    <div class="carte"><h3>Couverture</h3>', '    <div class="carte-x"><h3>Couverture</h3>', ['756']),
  ('maquette : une carte « Bientôt » revient', 'apercu/site-apple.html', '    <div class="carte toute"><h3>Autre</h3>', '    <div class="carte"><h3>Bientôt</h3><p>Packs en préparation.</p></div>\n    <div class="carte toute"><h3>Autre</h3>', ['756']),
  ('Tour : un numéro de version resté en arrière dans le balisage', 'tour.html', 'console interne · v2.78', 'console interne · v2.77', ['829']),
]
mordues = 0
for nom, f, av, ap, bancs in M:
    s = lire(f)
    n = s.count(av)
    if n != 1:
        print('  ⚠ ANCRE introuvable ou multiple (%d) — %s' % (n, nom)); continue
    ecrire(f, s.replace(av, ap))
    d = subprocess.run(['git', 'diff', '--stat'], cwd=W, capture_output=True, text=True).stdout.strip().splitlines()
    res = []
    for t in bancs:
        c, out = banc(t)
        import re
        tot = re.findall(r'(\d+) ✓ +(\d+) ✗', out)
        res.append('test-%s %s (code %d)' % (t, ('%s ✓ %s ✗' % tot[-1]) if tot else '?', c))
    tombe = any(' 0 ✗' not in r or '(code 0)' not in r for r in res)
    mordues += 1 if tombe else 0
    print(('  ✓ MORD   ' if tombe else '  ✗ PASSE  ') + nom + ' — ' + ' · '.join(res) + ' — ' + (d[-1] if d else 'aucun diff !'))
    subprocess.run(['git', 'checkout', '--', f], cwd=W)
    if subprocess.run(['git', 'diff', '--quiet'], cwd=W).returncode != 0:
        print('  ⛔ le worktree n\'est pas revenu propre'); sys.exit(2)
print('\n%d/%d mutations mordent' % (mordues, len(M)))
