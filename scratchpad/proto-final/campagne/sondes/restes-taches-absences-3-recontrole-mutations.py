#!/usr/bin/env python3
# Contre-épreuve du recontrôle adverse du tour 3 : chaque défaut est remis sur une COPIE de apercu/ (jamais sur le dépôt) ; la sonde doit tomber.
import subprocess, shutil, os, sys
DEP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
RAC = '/tmp/rac-restes3r'; PAGE = 'apercu/prototype-op-gestion.html'
SONDE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'restes-taches-absences-3-recontrole.js')
def sub(s, a, b):
    assert s.count(a) == 1, 'ancre introuvable ou multiple : ' + a[:70]
    return s.replace(a, b)
B = "const b0 = document.querySelector('[data-%s]'); if (b0) b0.disabled = true; "
M = [
 ('R1', 'Nouvelle absence : le bouton n\'est plus grisé (fin avant début)', lambda s: sub(s, B % 'anouvok', '')),
 ('R2', 'Modifier les dates : le bouton n\'est plus grisé', lambda s: sub(s, B % 'axok', '')),
 ('R3', 'Proposer d\'autres dates : le bouton n\'est plus grisé', lambda s: sub(s, B % 'amodifok', '')),
 ('R4', 'Nouvelle absence : le bouton reste grisé après correction (jamais réactivé)', lambda s: sub(s, "  if (btn) btn.disabled = !!(autre || attente || !aJours(a));", "  if (btn) btn.disabled = btn.disabled || !!(autre || attente || !aJours(a));")),
 ('R5', 'glisser : le refus week-end n\'est plus annoncé pendant', lambda s: sub(s, "const non = !!autre || sansJour || !!attente;", "const non = !!autre;")),
 ('R6', 'glisser : annonce « rien ne bougera » même sur un jour libre', lambda s: sub(s, "const non = !!autre || sansJour || !!attente;", "const non = true;")),
 ('R7', 'aAppliquer : fin avant début n\'est plus refusée', lambda s: sub(s, "  if (!du || !au || au < du) { toast('La date de fin est avant la date de début'); return false; }\n  const autre", "  const autre")),
 ('R8', 'Modifier les dates : le bouton ne se réactive plus', lambda s: sub(s, "  if (btn) btn.disabled = !!(autre || attente || !aJours(p));", "  if (btn) btn.disabled = btn.disabled || !!(autre || attente || !aJours(p));")),
]
choix = sys.argv[1:]; ko = 0
for (n, nom, f) in M:
    if choix and n not in choix: continue
    shutil.rmtree(RAC, ignore_errors=True); os.makedirs(RAC); subprocess.run(['cp', '-r', os.path.join(DEP, 'apercu'), RAC], check=True)
    p = os.path.join(RAC, PAGE); s = open(p, encoding='utf-8').read(); t = f(s); assert t != s, 'la mutation ne change rien : ' + nom
    open(p, 'w', encoding='utf-8').write(t)
    r = subprocess.run(['node', SONDE], env=dict(os.environ, RACINE=RAC), capture_output=True, text=True, timeout=570)
    last = [l for l in r.stdout.splitlines() if l.startswith('==')]; tombe = r.returncode != 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + n + ' ' + nom + ' → ' + (last[0] if last else 'code ' + str(r.returncode))); sys.stdout.flush()
    if not tombe: ko += 1
shutil.rmtree(RAC, ignore_errors=True); sys.exit(1 if ko else 0)
