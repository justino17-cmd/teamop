#!/usr/bin/env python3
# Contre-épreuve de restes-planning-3-recontrole.js (18 novembre 2026) : on REMET un défaut, la sonde doit tomber ; restauration par git checkout (la page est COMMITÉE avant).
# Usage : python3 mutations-restes-planning-3-recontrole.py [N1 N2 …]   (au premier plan, un délai par exécution)
import subprocess, sys, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
SONDE = 'scratchpad/proto-final/campagne/sondes/restes-planning-3-recontrole.js'
MUT = {
 'N1': ('la période du Sur mesure recompte la colonne « Non assigné »', "const n = techsVus().filter(t => t.id).length;", "const n = techsVus().length;", ['mac', 'F']),
 'N2': ('une personne écartée un seul jour n\'est plus datée', "D.length === 1 ? 'le ' + jlong(D[0]) : D.length + ' jours'", "D.length + ' jours'", ['mac', 'C']),
 'N3': ('le panneau « de travail prévu » reprend l\'ancienne phrase', "pour ce qui est affiché seulement", "pour les personnes affichées seulement", ['mac', 'E']),
 'N4': ('l\'ouverture depuis une absence masque aussi « Non assigné »', "plMasques = new Set(TECHS.map(t => t.id).filter(x => x !== a.tech && x !== ''));", "plMasques = new Set(TECHS.map(t => t.id).filter(x => x !== a.tech));", ['mac', 'E']),
}
veut = [a for a in sys.argv[1:] if a in MUT] or list(MUT)
def sh(*a, **k): return subprocess.run(a, cwd=RACINE, capture_output=True, text=True, **k)
assert sh('git', 'diff', '--quiet', '--', PAGE).returncode == 0, 'la page porte déjà une modification non commitée'
bilan = []
for k in veut:
    nom, a, b, (profil, parc) = MUT[k]
    s = open(os.path.join(RACINE, PAGE), encoding='utf-8').read()
    assert s.count(a) == 1, (k, 'ancre', s.count(a))
    open(os.path.join(RACINE, PAGE), 'w', encoding='utf-8').write(s.replace(a, b))
    d = sh('git', 'diff', '--stat', '--', PAGE).stdout.strip().splitlines()[-1]
    try:
        r = sh('timeout', '300', 'node', SONDE, profil, parc)
        sortie = r.stdout + r.stderr
        bilan.append((k, nom, 'TOMBE' if r.returncode == 1 else 'NE TOMBE PAS', [l.strip()[:140] for l in sortie.splitlines() if l.startswith(' ✗')][:2]))
    except subprocess.TimeoutExpired:
        bilan.append((k, nom, 'DÉLAI', []))
    finally:
        sh('git', 'checkout', '--', PAGE)
    print(k, bilan[-1][2], '|', nom, '|', d, flush=True)
assert sh('git', 'diff', '--quiet', '--', PAGE).returncode == 0, 'la page n\'est pas restaurée'
for b in bilan: print(b)
sys.exit(0 if all(b[2] == 'TOMBE' for b in bilan) else 1)
