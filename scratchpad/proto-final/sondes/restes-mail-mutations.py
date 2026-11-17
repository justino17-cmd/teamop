#!/usr/bin/env python3
# Contre-épreuve de la voie « restes » de la Boîte mail, tour 1 (17 novembre 2026) : on REMET chaque défaut corrigé dans une COPIE (jamais dans le dépôt)
# et la sonde restes-mail-tour1.js (la partie qui le garde) doit tomber. Même mécanique que mail-mutations.py.
# Usage : python3 restes-mail-mutations.py [de] [a]
import os, shutil, subprocess, sys, tempfile
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
COURRIER, PAGE = 'apercu/prototype-courrier.js', 'apercu/prototype-op-gestion.html'
R = 'restes-mail-tour1.js'
M = [
 ('R1 : le titre de la feuille n\'est plus mesuré (retombe en « Nouveau messa… » sur téléphone)', COURRIER, '    fitSheetTitles();\n    if(a&&a!==document.body', '    if(a&&a!==document.body', R + ':1p'),
 ('R2 : pastille d\'une ligne choisie de nouveau en voile blanc', COURRIER, '.opc .msg.sel .hpast{background:rgba(0,0,0,.3);color:#fff}', '.opc .msg.sel .hpast{background:rgba(255,255,255,.24);color:#fff}', R + ':4'),
 ('R3 : paysage — le grand titre garde sa taille', COURRIER, '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .list .large-title{font-size:20px;line-height:24px}', '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .list .large-title{font-size:34px;line-height:41px}', R + ':2'),
 ('R3b : paysage — la phrase sous le grand titre reste', COURRIER, '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .list .lt-sub{display:none}', '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .list .lt-sub{display:block}', R + ':2'),
 ('R4 : la bulle de l\'hôte ne retire plus celle du module', PAGE, "if (mb) mb.classList.remove('show'); } catch (e) {}", "} catch (e) {}", R + ':5'),
 ('R5 : la bulle d\'une fenêtre repasse en haut, sur le titre et la croix', PAGE, "body:has(.fen-voile) #toast{bottom:var(--toast-bas,150px);z-index:300}}", "body:has(.fen-voile) #toast{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:300}}", R + ':5'),
]
de = int(sys.argv[1]) if len(sys.argv) > 1 else 1
a = int(sys.argv[2]) if len(sys.argv) > 2 else len(M)
tmp = tempfile.mkdtemp(prefix='mutations-mail-')
racine = os.path.join(tmp, 'depot'); os.makedirs(racine)
shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
mordent, muets = [], []
for i, (nom, fic, ancien, nouveau, sonde) in enumerate(M, 1):
    if i < de or i > a: continue
    cible = os.path.join(racine, fic); orig = open(os.path.join(DEPOT, fic), encoding='utf-8').read()
    n = orig.count(ancien)
    if n != 1:
        print('M%d %s : ⚠ motif trouvé %d fois (attendu 1) — mutation NON jouée' % (i, nom, n)); muets.append((i, nom, 'motif')); continue
    open(cible, 'w', encoding='utf-8').write(orig.replace(ancien, nouveau))
    if open(cible, encoding='utf-8').read() == orig: print('M%d : la mutation n\'a rien changé' % i); continue
    env = dict(os.environ, RACINE=racine, CAP=os.path.join(tmp, 'cap'))
    try:
        fichier, _, partie = sonde.partition(':')
        if partie: env['PARTIE'] = partie
        r = subprocess.run(['node', os.path.join(SONDES, fichier)], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=560)
        sortie, code = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired as e:
        sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 124
    ko = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')][:2]
    bilan = [l for l in sortie.split('\n') if l.startswith('==')]
    if code != 0: mordent.append(i); print('M%d MORD  %s  → %s  [%s]  %s' % (i, nom, sonde, bilan[-1] if bilan else 'code %d' % code, (ko[0][:110] if ko else '')))
    else: muets.append((i, nom, sonde)); print('M%d MUETTE %s  → %s ne tombe PAS  [%s]' % (i, nom, sonde, bilan[-1] if bilan else ''))
    shutil.copyfile(os.path.join(DEPOT, fic), cible)   # on remet l'original dans la copie avant le tour suivant
print('\nmutations jouées : %d · qui mordent : %d · muettes : %d' % (len(mordent) + len(muets), len(mordent), len(muets)))
print('git status du dépôt (doit rester sans changement dans apercu/) :', subprocess.run(['git', 'status', '--short', 'apercu'], cwd=DEPOT, capture_output=True, text=True).stdout.strip() or 'propre')
shutil.rmtree(tmp, ignore_errors=True)
sys.exit(0 if not muets else 2)
