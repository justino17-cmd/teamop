#!/usr/bin/env python3
# Contre-épreuve des sondes « métiers » : on REMET quatre défauts dans une COPIE de la page (jamais dans le dépôt : RACINE pointe la copie) et la sonde qui garde
# chacun doit tomber. Une sonde qui reste verte sous la mutation ne garde rien. Usage : python3 metier-3d-mutations.py  (≈ 4 passages de navigateur).
import os, re, shutil, subprocess, sys, tempfile
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
MUTS = [
 ("M1 le technicien voit le Registre même sans pack 3D", "pack3d = typeof PACKS_ENT !== 'undefined' && PACKS_ENT.includes('3d')", "pack3d = true", 'metier-3d-menu.js', "technicienne"),
 ("M2 le groupe 3D du menu paraît toujours", "const metiersA3d = () => PACKS_ENT.includes('3d');", "const metiersA3d = () => true;", 'metier-3d-menu.js', "groupe 3D"),
 # ⚠️ DEUX gardes se doublent ici (le filtre des types ET le retrait qui suit) : retirer l'une seule ne change rien (la première passe a rendu « reste vert », à juste titre)
 ("M3 « Traitement du bois » proposé à tout métier", [("J.types.filter(t => t !== 'Traitement du bois' || PACKS_ENT.includes('3d'))", "J.types.filter(t => true)"), ("if (!metiersA3d()) { const kb = TYPES.indexOf('Traitement du bois'); if (kb >= 0) TYPES.splice(kb, 1); }", "")], None, 'metier-3d-creation.js', "Traitement du bois"),
 ("M4 un titre de plomberie parle de climatisation", "'Dépannage':'Dépannage plomberie'", "'Dépannage':'Dépannage climatisation'", 'metier-3d-donnees.js', "climatisation"),
]
src = open(os.path.join(DEPOT, PAGE), encoding='utf-8').read(); bilan = []
SEULES = sys.argv[1:]
for nom, a, b, sonde, _ in MUTS:
    if SEULES and nom.split(' ')[0] not in SEULES: continue
    paires = a if isinstance(a, list) else [(a, b)]
    if any(src.count(x) < 1 for x, _ in paires): bilan.append((nom, 'MUTATION NON POSÉE (motif absent)', '')); continue
    racine = tempfile.mkdtemp(prefix='mut3d-'); shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
    p = os.path.join(racine, PAGE); mut = src
    for x, y in paires: mut = mut.replace(x, y, 1)
    open(p, 'w', encoding='utf-8').write(mut)
    assert open(p, encoding='utf-8').read() != src, 'la mutation n\'a rien changé'
    r = subprocess.run(['node', os.path.join(ICI, sonde)], cwd=DEPOT, env=dict(os.environ, RACINE=racine), capture_output=True, text=True, timeout=1500)
    sortie = r.stdout; m = re.findall(r'(\d+) ✓ · (\d+) ✗', sortie); ko = [l.strip()[:150] for l in sortie.splitlines() if l.strip().startswith('✗')]
    bilan.append((nom, (m[-1][0] + ' ✓ · ' + m[-1][1] + ' ✗') if m else 'pas de bilan', ' | '.join(ko[:3]))); shutil.rmtree(racine, ignore_errors=True)
tombent = 0
for nom, res, ko in bilan:
    t = ' ✗' in res and not res.startswith('0 ✗') and not res.endswith(' · 0 ✗'); tombent += 1 if t else 0
    print(('TOMBE   ' if t else 'RESTE VERT ') + nom + ' → ' + res + ('\n    ' + ko if ko else ''))
print(f'\n{tombent} mutations sur {len(bilan)} font tomber leur sonde')
sys.exit(0 if tombent == len(bilan) else 1)
