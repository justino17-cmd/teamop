# Mutations du tour 7 : chaque défaut remis doit faire tomber la sonde qui le garde. Page restaurée par git checkout après CHAQUE mutation (le correctif est commité avant).
import subprocess, sys
P = 'apercu/prototype-op-gestion.html'
S = 'scratchpad/proto-final/campagne/sondes/'
MUT = [
 ('retour à l\'ancienne consommation : tout bouton à data-action consomme la marque', "if (!releveFlush(b.dataset.action === 'terminer') && b.dataset.action === 'terminer') {", "if (!releveFlush() && b.dataset.action === 'terminer') {", 'interventions-restes-tour6-recontrole.js'),
 ('la mémoire du refus n\'est plus lue (seule la marque du champ, perdue au redessin)', "const t = document.querySelector('input[data-releve][data-refuse]'); if (!t && !cles.length) return false;", "const t = document.querySelector('input[data-releve][data-refuse]'); if (!t) return false;", 'interventions-restes-tour6-recontrole.js'),
 ('la bulle de refus à quatre lignes sur petit téléphone', "@media (max-height:620px){#toast{font-size:13.5px;line-height:1.35;padding:8px 12px 8px 14px;border-radius:14px}}", "@media (max-height:620px){}", 'interventions-restes-tour7-recouvrement.js', 'petit'),
]
tombe = 0
for nom, a, b, sonde, *pf in MUT:
    prof = pf[0] if pf else 'mac'
    s = open(P, encoding='utf-8').read()
    if s.count(a) != 1: print('✗ ancre introuvable ou multiple :', nom, s.count(a)); continue
    open(P, 'w', encoding='utf-8').write(s.replace(a, b))
    d = subprocess.run(['git', 'diff', '--stat', P], capture_output=True, text=True).stdout.strip().splitlines()[-1:]
    try: r = subprocess.run(['node', S + sonde, prof], capture_output=True, text=True, timeout=200); sortie = r.stdout.splitlines()[-1:] ; code = r.returncode
    except subprocess.TimeoutExpired: sortie, code = ['délai'], 9
    subprocess.run(['git', 'checkout', P], check=True)
    ok = subprocess.run(['git', 'diff', '--quiet', P]).returncode == 0
    print(('TOMBE ' if code != 0 else 'NE MORD PAS ') + nom, '|', sortie, '| diff pendant :', d, '| page restaurée :', ok)
    tombe += code != 0
print(tombe, 'sur', len(MUT))
