#!/usr/bin/env python3
# Mutations CÔTÉ v763 (30 septembre 2026). Le serveur peut partir SEUL : les bancs de `scripts/bancs-serveur.liste` tournent
# alors contre l'app.html de `main` — la v763 en service. Les branches « v763 » de test-842, test-845 et test-803 ne
# s'exécutent QUE là : c'est donc là qu'on les éprouve. Un banc qui passe ne prouve rien tant qu'on ne l'a pas vu échouer.
# L'arbre est bâti par scratchpad/simuler-serveur-seul.sh (SANS_BANCS=1) : `main`, plus le serveur et les bancs de la branche.
# ⚠️ On ne restaure PAS par `git checkout` : dans cet arbre, server/index.js est une COPIE de la branche, et `git checkout`
# remettrait celui de `main`. Chaque fichier muté est réécrit avec son contenu d'avant la mutation.
# Usage : python3 scratchpad/mutations-serveur-seul.py
import os, re, subprocess, sys, tempfile, shutil
DEPOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARBRE = os.path.join(tempfile.mkdtemp(prefix='mut-serveur-seul-'), 'arbre')

def sh(cmd, cwd=None, timeout=None, env=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, timeout=timeout, env=env)

r = sh('bash scratchpad/simuler-serveur-seul.sh ' + ARBRE, cwd=DEPOT, env=dict(os.environ, SANS_BANCS='1'))
if r.returncode:
    print(r.stdout, r.stderr); sys.exit(1)
print(r.stdout.strip())
ver = re.search(r"APP_VERSION\s*=\s*'(\d+)'", open(os.path.join(ARBRE, 'app.html'), encoding='utf-8').read())
if not ver or int(ver.group(1)) >= 767:
    print('✗ l\'arbre ne porte pas une page d\'avant la v767 (%s) : rien à éprouver ici' % (ver and ver.group(1))); sys.exit(1)

S, A = 'server/index.js', 'app.html'
MUT = [
  ('V1 serveur : un non-payé de nouveau servi « formule + paye:false » (la v763 écrirait le Gratuit et poserait le bandeau)', S,
   "return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f)));",
   "return !!(p && (p.bloque || !RANG_FORMULE.includes(f)));", ['845']),
  ('V2 v763 : les places servies se rangent aussi d\'une réponse NON payée', A,
   "_placesSrv=(j.paye&&j.places!=null)?",
   "_placesSrv=(j.places!=null)?", ['842']),
  ('V3 v763 : la suspension n\'est plus posée (rien ne grise)', A,
   "try{ suspensionPoser(j); suspensionRappel(); }catch(e){}",
   "try{ suspensionPoser({}); suspensionRappel(); }catch(e){}", ['845']),
  ('V4 v763 : la limite connue s\'inverse — une vérification impossible ne lève plus la grisaille (la v763 serait autre que celle en service)', A,
   "try{ suspensionPoser(j); suspensionRappel(); }catch(e){}",
   "try{ if(!j.verificationImpossible) suspensionPoser(j); suspensionRappel(); }catch(e){}", ['845']),
]

def banc(n):
    try:
        r = subprocess.run('node tests/test-%s.js' % n, cwd=ARBRE, shell=True, capture_output=True, text=True, timeout=400)
    except subprocess.TimeoutExpired:
        return False, 'délai dépassé'
    tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout + r.stderr)
    d = tot[-1] if tot else ('?', '?')
    return r.returncode == 0, '%s ✓ %s ✗ (code %d)' % (d[0], d[1], r.returncode)

# le témoin d'abord : sans mutation, les bancs visés passent dans cet arbre
for n in sorted({b for m in MUT for b in m[4]}):
    vert, txt = banc(n)
    print(('✓' if vert else '✗') + ' (témoin) test-%s sur la v%s sans mutation : %s' % (n, ver.group(1), txt), flush=True)
    if not vert:
        sh('git worktree remove --force ' + ARBRE, cwd=DEPOT); sys.exit(1)

mordent = 0
for (nom, fichier, avant, apres, bancs) in MUT:
    chemin = os.path.join(ARBRE, fichier)
    orig = open(chemin, encoding='utf-8').read()
    if orig.count(avant) != 1:
        print('✗ ' + nom + ' — ancre trouvée %d fois' % orig.count(avant), flush=True); continue
    open(chemin, 'w', encoding='utf-8').write(orig.replace(avant, apres))
    mord = ''
    for n in bancs:
        vert, txt = banc(n)
        if not vert:
            mord = 'test-%s : %s' % (n, txt); break
    open(chemin, 'w', encoding='utf-8').write(orig)
    if mord:
        mordent += 1; print('✓ ' + nom + ' — ' + mord, flush=True)
    else:
        print('✗ ' + nom + ' — aucun banc ne tombe (' + ', '.join(bancs) + ')', flush=True)

print('\n%d / %d mutations mordent (arbre : main v%s + le serveur de la branche)' % (mordent, len(MUT), ver.group(1)))
sh('git worktree remove --force ' + ARBRE, cwd=DEPOT)
sys.exit(0 if mordent == len(MUT) else 1)
