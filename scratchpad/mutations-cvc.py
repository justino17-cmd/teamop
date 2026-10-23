#!/usr/bin/env python3
"""Mutations du bloc CVC (chauffage / climatisation) : chaque défaut REMIS dans app.html doit faire tomber au moins un contrôle du banc visé.
Au premier plan, délai par exécution. ⛔ Le correctif DOIT être commité avant (git checkout restaure depuis HEAD). Usage : python3 scratchpad/mutations-cvc.py <banc> [préfixe]"""
import subprocess, sys, re, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
BANC = sys.argv[1]; PRE = sys.argv[2] if len(sys.argv) > 2 else ''
MUTS = {}
exec(open(os.path.join(os.path.dirname(__file__), 'mutations-cvc-liste.py'), encoding='utf-8').read())
src0 = open('app.html', encoding='utf-8').read()
tot = 0; mord = 0; muets = []
for nom, (old, new) in MUTS.items():
    if PRE and not nom.startswith(PRE): continue
    tot += 1
    if src0.count(old) != 1:
        print('  ?? %s : motif trouvé %d fois (la mutation ne vise pas une seule place)' % (nom, src0.count(old))); muets.append(nom + ' (mal visée)'); continue
    open('app.html', 'w', encoding='utf-8').write(src0.replace(old, new))
    try:
        r = subprocess.run(['node', 'tests/' + BANC], capture_output=True, text=True, timeout=60)
        m = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
        ko = int(m[-1][1]) if m else -1
        morde = (r.returncode != 0)
    except subprocess.TimeoutExpired:
        ko = -2; morde = True
    finally:
        subprocess.run(['git', 'checkout', 'app.html'], capture_output=True)
    d = subprocess.run(['git', 'diff', '--stat', 'app.html'], capture_output=True, text=True).stdout.strip()
    assert not d, 'app.html n’est pas revenu à HEAD !'
    print('  %s %-34s ✗ %s' % ('✔ mord ' if morde else '✘ MUET ', nom, ko))
    if morde: mord += 1
    else: muets.append(nom)
print('\n%d mutations, %d mordent, %d muettes %s' % (tot, mord, len(muets), muets))
sys.exit(1 if muets else 0)
