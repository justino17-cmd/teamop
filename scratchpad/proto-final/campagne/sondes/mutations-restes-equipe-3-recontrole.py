#!/usr/bin/env python3
# Mutations NEUVES du recontrôle adverse « restes équipe » tour 3 (19 novembre 2026) : chaque garde est retirée SÉPARÉMENT (les mutations des correcteurs retiraient deux sites d'un coup),
# sur une COPIE hors dépôt. usage : python3 mutations-restes-equipe-3-recontrole.py [numéro…]   ⛔ 127.0.0.1 seulement, au premier plan
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_TMP', '/tmp/rc3/mutN')
src = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
M = [
 ('1 NOM_INVISIBLE ne couvre plus U+2061-206F (reste 2060)', [("\\u2060-\\u206F\\uFEFF]/;", "\\u2060\\uFEFF]/;")], 'I', 'mac'),
 ('2 Inviter : eqxVal... non : la valeur lue par le formulaire d\'invitation redevient rognée par trim()', [("V[id] = el ? blancsRogne(el.value) : '';", "V[id] = el ? el.value.trim() : '';")], 'I', 'mac'),
 ('3 Modifier : eqxVal redevient rognée par trim() (le site Inviter reste sain)', [("const eqxVal = id => blancsRogne((document.getElementById(id) || {}).value || '');", "const eqxVal = id => ((document.getElementById(id) || {}).value || '').trim();")], 'I', 'mac'),
 ('4 le Prénom de Modifier ne passe plus par nomPersonneOk (valeur brute nettoyée)', [("pr = nomPersonneOk(eqxVal('eqx-mp')), no = nomPersonneOk(eqxVal('eqx-mn'))", "pr = nomPersonneNet(eqxVal('eqx-mp')), no = nomPersonneOk(eqxVal('eqx-mn'))")], 'I', 'mac'),
 ('5 « Déconnecter partout » revient seul sur une désactivée', [("${p.actif ? `<button type=\"button\" class=\"btn gris\" data-sec2=\"telephone|${esc(k)}\">Nouveau téléphone</button><button type=\"button\" class=\"btn gris\" data-sec2=\"deconnecter|${esc(k)}\">Déconnecter partout</button>` : ''}", "${p.actif ? `<button type=\"button\" class=\"btn gris\" data-sec2=\"telephone|${esc(k)}\">Nouveau téléphone</button>` : ''}<button type=\"button\" class=\"btn gris\" data-sec2=\"deconnecter|${esc(k)}\">Déconnecter partout</button>")], 'G', 'mac'),
 ('6 l\'en-tête « désactivé(e) » ne se dit plus que pour l\'invitée (une personne connue désactivée n\'est plus annoncée)', [("${!p.actif ? ' · désactivé(e)' : p.invite ?", "${!p.actif && p.invite ? ' · désactivé(e)' : p.invite ?", 2)], 'H', 'mac'),
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
