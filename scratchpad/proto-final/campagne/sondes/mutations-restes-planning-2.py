#!/usr/bin/env python3
# Contre-épreuve de restes-planning-2.js : on REMET chaque défaut, la sonde doit tomber ; on restaure par git checkout (le correctif est COMMITÉ avant,
# règle du dépôt : sinon le checkout efface correctif et mutation d'un coup). Une mutation qui ne casse rien = on vérifie d'abord qu'elle a touché le bon endroit.
# Usage : python3 mutations-restes-planning-2.py [M1 M2 …]   (au premier plan, un délai par exécution)
import subprocess, sys, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
SONDE = 'scratchpad/proto-final/campagne/sondes/restes-planning-2.js'
MUT = {
 'M1': ('commune hors liste : la devinette dans la rue revient', 'if (cp && cp[1].replace(/[^a-z]/g, \'\').length > 1) return null;', '', ['mac', 'S1']),
 'M2': ('les chiffres ne suivent plus les personnes masquées', "const kpiDe = (tech, d) => plVue === 'carte' || (!plMasques.has(tech || '')", "const kpiDe = (tech, d) => plVue === 'carte' || (true", ['mac', 'S2']),
 'M3': ('la note qui dit le filtre disparaît', "const note = !filtre ? '' : `", "const note = true ? '' : `", ['mac', 'S2']),
 'M4': ('le panneau « interventions » reprend toute l\'équipe', "const { J, DANS: DANS0, ABS } = kpiPopulation(), filtre = kpiFiltre(),", "const { J, DANS: DANS0, ABS } = kpiPopulation(), filtre = false,", ['mac', 'S2']),
 'M6': ('le titre de la période repasse sous la flèche à 320 px', '@media (max-width:380px){.pl-nav b{white-space:normal', '@media (max-width:1px){.pl-nav b{white-space:normal', ['petit', 'S2']),
 'M5': ('la carte ne retrace plus les repères à l\'arrivée du fond', "try { crTracerReel(); } catch (e) {} };", "};", ['ipad', 'S3']),
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
