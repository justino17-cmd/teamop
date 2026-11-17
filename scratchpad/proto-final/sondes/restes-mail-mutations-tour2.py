#!/usr/bin/env python3
# Contre-épreuve de la voie « restes » de la Boîte mail, tour 2 (17 novembre 2026) : on REMET chaque défaut corrigé dans une COPIE (jamais dans le dépôt)
# et la sonde la sonde qui le garde doit tomber. Même mécanique que mail-mutations.py.
# Usage : python3 restes-mail-mutations.py [de] [a]
import os, shutil, subprocess, sys, tempfile
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
COURRIER, PAGE = 'apercu/prototype-courrier.js', 'apercu/prototype-op-gestion.html'
R = 'restes-mail-tour1.js'
# T5 (rendre le grand titre) retirée : repliée sur ses messages, la liste n'a plus besoin de le cacher — mutation neutralisée par la garde du pli (T6), pas une garde manquante
R1, R2 = 'restes-mail-tour1-recontrole.js', 'restes-mail-tour2.js'
M = [
 ('T1 : la pastille de la ligne choisie est de nouveau un voile noir partout (gris sous du blanc sur téléphone)', COURRIER, '.opc:where(:not([data-fmt="phone"])) .msg.sel .hpast{', '.opc .msg.sel .hpast{', R1 + ':1'),
 ('T2 : la bulle ne passe plus au-dessus de la Comptabilité plein écran', PAGE, 'body:has(#cpsys:not([hidden])) #toast{z-index:9200}', 'body:has(#cpsys:not([hidden])) #toast{z-index:90}', R1 + ':5'),
 ('T3 : la rotation ne remesure plus le titre de la feuille', COURRIER, 'fitSheetTitles(); listeCourtePlier(); catFade(); });', 'listeCourtePlier(); catFade(); });', R1 + ':3'),
 ('T4 : la bulle du module ne se pose plus au-dessus de celle de l\'hôte', COURRIER, 'function toast(msg,action){ toastCorps(msg,action); surHote(); }', 'function toast(msg,action){ toastCorps(msg,action); }', R1 + ':6'),
 ('T6 : paysage court — la liste ne s\'ouvre plus pliée sur ses messages', COURRIER, 'var court=window.matchMedia("(max-height:380px)").matches&&', 'var court=false&&', R2),
 ('T7 : paysage court — le titre de la barre repasse à 17 px (coupé en « Boîte de réce… »)', COURRIER, '.list .lb-title{font-size:14px}', '.list .lb-title{font-size:17px}', R2),
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
