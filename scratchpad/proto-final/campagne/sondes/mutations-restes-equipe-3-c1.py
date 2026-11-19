#!/usr/bin/env python3
# Mutations NEUVES du recontrôle adverse « restes équipe » tour 3 (19 novembre 2026) : chaque garde est retirée SÉPARÉMENT (les mutations des correcteurs retiraient deux sites d'un coup),
# sur une COPIE hors dépôt. usage : python3 mutations-restes-equipe-3-recontrole.py [numéro…]   ⛔ 127.0.0.1 seulement, au premier plan
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_TMP', '/tmp/rc3/mutN')
src = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
BU = chr(92) + 'u'
def U(x): return x.replace('@U', BU)
ANC = U("const NOM_INVISIBLE = /[@U00AD@U034F@U115F@U1160@U17B4@U17B5@U180B-@U180D@U200B-@U200F@U202A-@U202E@U2060-@U206F@U3164@UFE00-@UFE0F@UFEFF@UFFA0]/;")
def sans(*morceaux):
    t = ANC
    for m in morceaux: assert U(m) in t, m; t = t.replace(U(m), '', 1)
    return [(ANC, t)]
M = [
 ('1 NOM_INVISIBLE revient a la liste d\'avant (ni 3164, 115F, 1160, FFA0)', sans('@U115F@U1160', '@U3164', '@UFFA0'), 'J', 'mac'),
 ('2 NOM_INVISIBLE perd U+FE00-FE0F', sans('@UFE00-@UFE0F'), 'J', 'mac'),
 ('3 NOM_INVISIBLE perd U+034F', sans('@U034F'), 'J', 'mac'),
 ('4 NOM_INVISIBLE perd U+17B4-17B5 et 180B-180D', sans('@U17B4@U17B5@U180B-@U180D'), 'J', 'mac'),
 ('5 nomPersonneOk n\'exige plus un signe visible', [("NOM_PERS_OK.test(x) && NOM_VISIBLE.test(x) ? x : null", "NOM_PERS_OK.test(x) ? x : null")], 'J', 'mac'),
 ('6 nomPersonneNet ne retire plus ces signes', [(".replace(NOM_INVISIBLE_G, '').replace(/'/g", ".replace(/'/g")], 'J', 'mac'),
 ('7 nomPersonneNet ne vide plus un nom sans signe visible', [(".replace(/^.*$/u, m => NOM_VISIBLE.test(m) ? m : '')", "")], 'J', 'mac'),
]
choix = set(sys.argv[1:]); bilan = []
for nom, subs, sec, prof in M:
    n = int(nom.split(' ')[0])
    if choix and str(n) not in choix: continue
    page = src; ok = True
    for t in subs:
        a, b = t[0], t[1]; attendu = t[2] if len(t) > 2 else 1
        if page.count(a) != attendu: ok = False; print(f'  ! mutation {n} : motif introuvable ou multiple ({page.count(a)}) : {a[:70]}'); break
        page = page.replace(a, b)
    if not ok: bilan.append((n, nom, 'MOTIF')); continue
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        p = os.path.join(DEPOT, 'apercu', f)
        if os.path.isfile(p) and f != 'prototype-op-gestion.html': shutil.copy(p, os.path.join(TMP, 'apercu', f))
    open(os.path.join(TMP, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(page)
    env = dict(os.environ, RACINE=TMP)
    try:
        r = subprocess.run(['node', os.path.join(ICI, 'restes-equipe-3-mineurs.js'), prof, sec], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=300); sortie = r.stdout + r.stderr; code = r.returncode
    except subprocess.TimeoutExpired: sortie = ''; code = 124
    tombes = [l.strip()[:120] for l in sortie.split('\n') if l.startswith('  ✗')]; tot = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie)
    etat = 'TOMBE' if code == 1 and tombes else ('PASSE (la sonde ne voit pas ce défaut)' if code == 0 else f'code {code}')
    print(f'mutation {nom} : {etat} {tot[-1] if tot else ""}'); [print('    ✗', t) for t in tombes[:2]]
    bilan.append((n, nom, etat))
shutil.rmtree(TMP, ignore_errors=True)
mauvais = [b for b in bilan if not b[2].startswith('TOMBE')]
print(f'\n== {len(bilan) - len(mauvais)} mutation(s) sur {len(bilan)} tombent'); [print('  ⚠', b[0], b[1], '→', b[2]) for b in mauvais]
sys.exit(1 if mauvais else 0)
