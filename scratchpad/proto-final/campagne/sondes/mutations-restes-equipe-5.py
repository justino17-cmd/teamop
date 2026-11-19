#!/usr/bin/env python3
# Mutations du tour 5 « restes équipe » (19 novembre 2026) : chaque garde est retirée SÉPARÉMENT, sur une COPIE hors dépôt (jamais sur le fichier du dépôt).
# usage : python3 mutations-restes-equipe-4.py [numéro…]   ⛔ 127.0.0.1 seulement, au premier plan
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_TMP', '/tmp/rc5/mut')
page0 = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
mod0 = open(os.path.join(DEPOT, 'apercu', 'prototype-courrier.js'), encoding='utf-8').read()
EF = "eqFiche = function (k) {"
# (nom, [(fichier, ancien, neuf)], phase, profil)
M = [
 ('1 courrierSource().envoyer ne relit plus la case Créer (R1 : case retirée pendant qu\'une fenêtre est ouverte)', [('p', "    envoyer:mail => { if (!peut('com', 'c')) {", "    envoyer:mail => { if (false) {")], 'B', 'mac'),
 ('2 secuReposer ne refuse plus un compte désactivé (R3 : appel direct et bouton fabriqué)', [('p', "  if (!p.actif) { toast('Le compte de ' + esc(p.prenom) + ' est désactivé : réactive-le d’abord.'); return false; }   /* tour 5 : refus DANS la fonction", "  if (false) { toast('x'); return false; }   /* tour 5 : refus DANS la fonction")], 'T', 'mac'),
]
choix = set(sys.argv[1:]); bilan = []
for nom, subs, sec, prof in M:
    n = int(nom.split(' ')[0])
    if choix and str(n) not in choix: continue
    page, mod, ok = page0, mod0, True
    for f, a, b in subs:
        src = page if f == 'p' else mod
        if src.count(a) != 1: ok = False; print(f'  ! mutation {n} : motif introuvable ou multiple ({src.count(a)}) : {a[:70]}'); break
        src = src.replace(a, b)
        if f == 'p': page = src
        else: mod = src
    if not ok: bilan.append((n, nom, 'MOTIF')); continue
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        p = os.path.join(DEPOT, 'apercu', f)
        if os.path.isfile(p) and f not in ('prototype-op-gestion.html', 'prototype-courrier.js'): shutil.copy(p, os.path.join(TMP, 'apercu', f))
    open(os.path.join(TMP, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(TMP, 'apercu', 'prototype-courrier.js'), 'w', encoding='utf-8').write(mod)
    env = dict(os.environ, RACINE=TMP)
    try:
        r = subprocess.run(['node', os.path.join(ICI, 'restes-equipe-4-recontrole.js'), prof, sec], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=420); sortie = r.stdout + r.stderr; code = r.returncode
    except subprocess.TimeoutExpired: sortie = ''; code = 124
    tombes = [l.strip()[:150] for l in sortie.split('\n') if l.startswith('  ✗')]; tot = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie)
    etat = 'TOMBE' if code == 1 and tombes else ('PASSE (la sonde ne voit pas ce défaut)' if code == 0 else f'code {code}')
    print(f'mutation {nom} : {etat} {tot[-1] if tot else ""}'); [print('    ✗', t) for t in tombes[:2]]
    bilan.append((n, nom, etat))
shutil.rmtree(TMP, ignore_errors=True)
mauvais = [b for b in bilan if not b[2].startswith('TOMBE')]
print(f'\n{len(bilan) - len(mauvais)}/{len(bilan)} mutations tombent' + (' · À EXAMINER : ' + ', '.join(str(b[0]) for b in mauvais) if mauvais else ''))
sys.exit(1 if mauvais else 0)
