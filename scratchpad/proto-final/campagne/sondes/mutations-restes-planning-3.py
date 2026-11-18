#!/usr/bin/env python3
# Contre-épreuve de restes-planning-3.js : on REMET chaque défaut, la sonde doit tomber ; on restaure par git checkout (le correctif est COMMITÉ avant,
# règle du dépôt : sinon le checkout efface correctif et mutation d'un coup). Une mutation qui ne casse rien = on vérifie d'abord qu'elle a touché le bon endroit.
# Usage : python3 mutations-restes-planning-3.py [M1 M2 …]   (au premier plan, un délai par exécution)
import subprocess, sys, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
SONDE = 'scratchpad/proto-final/campagne/sondes/restes-planning-3.js'
MUT = {
 'M1': ('le compte « N sur M » recompte la colonne « Non assigné »', "const P = TECHS.filter(t => t.id), cache", "const P = TECHS.slice(), cache", ['mac', 'T1']),
 'M2': ('en Sur mesure, la personne écartée un jour n\'est plus nommée', "  if (plVue === 'multi') {\n    const J = joursPeriode();", "  if (false && plVue === 'multi') {\n    const J = joursPeriode();", ['mac', 'T2']),
 'M3': ('iPad portrait : le sélecteur ne passe plus sur deux rangées', '@media (max-width:900px){.pl-barre>.seg[aria-label="Vue"]{flex-wrap:wrap;overflow:visible}', '@media (max-width:1px){.pl-barre>.seg[aria-label="Vue"]{flex-wrap:wrap;overflow:visible}', ['ipad', 'T3']),
 'M4': ('l\'en-tête du Planning ne passe plus à la ligne quand un libellé ne tient pas', '.btn{flex:1 1 0;min-width:max-content;min-height:46px', '.btn{flex:1 1 0;min-width:0;min-height:46px', ['android', 'T4']),
}
veut = [a for a in sys.argv[1:] if a in MUT] or list(MUT)
def sh(*a, **k): return subprocess.run(a, cwd=RACINE, capture_output=True, text=True, **k)
assert sh('git', 'diff', '--quiet', '--', PAGE).returncode == 0, 'la page porte déjà une modification non commitée : on ne mute pas par-dessus'
bilan = []
for k in veut:
    nom, a, b, (profil, parc) = MUT[k]
    s = open(os.path.join(RACINE, PAGE), encoding='utf-8').read()
    assert s.count(a) == 1, (k, 'ancre', s.count(a))
    open(os.path.join(RACINE, PAGE), 'w', encoding='utf-8').write(s.replace(a, b))
    d = sh('git', 'diff', '--stat', '--', PAGE).stdout.strip().splitlines()[-1]
    try:
        r = sh('timeout', '560', 'node', SONDE, profil, parc)
        sortie = r.stdout + r.stderr
        fin = [l for l in sortie.splitlines() if l.startswith('== ') and '✓' in l]
        tombe = r.returncode == 1
        bilan.append((k, nom, 'TOMBE' if tombe else 'NE TOMBE PAS', fin[-1] if fin else sortie[-200:], [l.strip()[:150] for l in sortie.splitlines() if l.startswith(' ✗')][:3]))
    except subprocess.TimeoutExpired:
        bilan.append((k, nom, 'DÉLAI', '', []))
    finally:
        sh('git', 'checkout', '--', PAGE)
    print(k, bilan[-1][2], '|', nom, '|', d, flush=True)
assert sh('git', 'diff', '--quiet', '--', PAGE).returncode == 0, 'la page n\'est pas restaurée'
for b in bilan: print(b)
sys.exit(0 if all(b[2] == 'TOMBE' for b in bilan) else 1)
