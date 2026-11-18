#!/usr/bin/env python3
# Mutations des restes compta-ventes, tour 4 : chaque défaut remis doit faire tomber la sonde qui le garde.
# ⛔ Le correctif est COMMITÉ avant : la restauration se fait par `git checkout` du seul fichier. Au premier plan, un délai par exécution.
import subprocess, sys, re
RACINE = '/home/user/wt-soeur'
PAGE = RACINE + '/apercu/prototype-op-gestion.html'
S = 'compta-ventes-restes4.js mac'
MUT = [
 ('N1 les minutes se lisent de nouveau comme un nombre brut au prix de l’heure', "const lu = mn !== null ? mn / 60 : qteLire(v),", "const lu = mn !== null ? mn : qteLire(v),", S),
 ('N2 une durée en minutes passe sur une ligne qui n’est pas à l’heure', "if (mn !== null && !(mn > 0 && ligneHeure(l))) {", "if (mn !== null && !(mn > 0)) {", S),
 ('N3 le total de ligne n’est plus arrondi au centime', "const totLigne = l => Math.round((l.pu || 0) * qteDe(l) * 100 + 1e-7) / 100;", "const totLigne = l => (l.pu || 0) * qteDe(l);", S),
 ('N4 le Total HT redevient une somme de bruts', "const htDe = f => Math.round(lignesDe(f).reduce((s,l) => s + totLigne(l), 0) * 100 + 1e-7) / 100;", "const htDe = f => lignesDe(f).reduce((s,l) => s + (l.pu || 0) * qteDe(l), 0);", S),
 ('N5 la pièce se compare de nouveau caractère pour caractère', "qteNorm(v) === qteNorm(l.q0)", "v === l.q0", S),
 ('N6 la comparaison de la pièce ignore la casse mais plus les espaces', "toLowerCase().replace(/[\\s\\u00a0\\u202f]/g, '')", "toLowerCase()", S),
 ('N7 « 0 min » passe en silence', "const lu = mn !== null ? mn / 60 : qteLire(v), nq", "const lu = mn !== null ? (mn / 60 || 1) : qteLire(v), nq", S),
]
def sh(c, t=250):
    return subprocess.run(c, shell=True, cwd=RACINE, capture_output=True, text=True, timeout=t)
if sh('git status --short apercu/prototype-op-gestion.html').stdout.strip():
    sys.exit('la page a des changements non commités : on commite AVANT de muter')
src = open(PAGE, encoding='utf-8').read(); tombees = 0
for nom, a, b, sonde in MUT:
    assert src.count(a) == 1, (nom, src.count(a))
    open(PAGE, 'w', encoding='utf-8').write(src.replace(a, b))
    assert sh('git diff --stat apercu/prototype-op-gestion.html').stdout.strip(), 'la mutation n’a rien changé'
    try:
        r = sh('node scratchpad/proto-final/campagne/sondes/' + sonde, 250); sortie = r.stdout + r.stderr
        m = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie); rouge = r.returncode != 0
        print(('TOMBE   ' if rouge else 'PASSE !! ') + nom, m[-1] if m else sortie[-120:].strip())
        tombees += rouge
    finally:
        sh('git checkout apercu/prototype-op-gestion.html')
print(tombees, '/', len(MUT), 'mutations tombent'); sys.exit(0 if tombees == len(MUT) else 1)
