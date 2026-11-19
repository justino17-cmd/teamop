# Mutations du tour 5 : chaque défaut remis doit faire tomber la sonde qui le garde. Page restaurée par git checkout après CHAQUE mutation (le correctif est commité avant).
import subprocess, sys
P = 'apercu/prototype-op-gestion.html'
S = 'scratchpad/proto-final/campagne/sondes/'
MUT = [
 ('Terminer ne vide plus la saisie / ne s\'arrête plus sur un refus', "ACTIONS.terminer = function(b){ if (!releveFlush()) return;", "ACTIONS.terminer = function(b){ releveFlush();", 'interventions-restes-tour6-adverse.js'),
 ('le clic ne s\'arrête plus sur un refus (arrêt du clic)', "&& b.dataset.action === 'terminer') { ev.stopPropagation(); ev.preventDefault(); }", "&& b.dataset.action === 'terminer') { }", 'interventions-restes-tour6-adverse.js'),
 ('la marque de refus n\'est plus relue au Terminer', "if (ok && releveRefuse()) ok = false; return ok;", "return ok;", 'interventions-restes-tour6-adverse.js'),
 ('champ non touché validé quand même (écriture sans geste)', "if (t.value === av) return true;", "", 'interventions-restes-tour5-adverse-ecrit.js'),
 ('« 1.200,5 » plus lu comme un nombre', "if (nb > 1 && /^-?\\d[\\d.,]*$/.test(t))", "if (false && nb > 1 && /^-?\\d[\\d.,]*$/.test(t))", 'interventions-restes-tour6-adverse.js'),
 ('« 1,2,3 » accepté (cxNum non vérifié)', "if (isFinite(n)) { lu = lu || t;", "if (true) { lu = lu || t;", 'interventions-restes-tour6-adverse.js'),
]
tombe = 0
for nom, a, b, sonde in MUT:
    s = open(P, encoding='utf-8').read()
    if s.count(a) != 1: print('✗ ancre introuvable ou multiple :', nom, s.count(a)); continue
    open(P, 'w', encoding='utf-8').write(s.replace(a, b))
    d = subprocess.run(['git', 'diff', '--stat', P], capture_output=True, text=True).stdout.strip().splitlines()[-1:]
    try: r = subprocess.run(['node', S + sonde, 'mac'], capture_output=True, text=True, timeout=200); sortie = r.stdout.splitlines()[-1:] ; code = r.returncode
    except subprocess.TimeoutExpired: sortie, code = ['délai'], 9
    subprocess.run(['git', 'checkout', P], check=True)
    ok = subprocess.run(['git', 'diff', '--quiet', P]).returncode == 0
    print(('TOMBE ' if code != 0 else 'NE MORD PAS ') + nom, '|', sortie, '| diff pendant :', d, '| page restaurée :', ok)
    tombe += code != 0
print(tombe, 'sur', len(MUT))
