#!/usr/bin/env python3
# Contre-épreuve de restes-equipe-1-recontrole.js (18 novembre 2026) : on REMET chaque défaut corrigé dans une COPIE de la page (jamais dans la page),
# on rejoue les sections de la sonde qui le gardent, et la sonde doit TOMBER. Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit.
# usage : python3 mutations-restes-equipe-1.py [numéro…]   ⛔ 127.0.0.1 seulement ; chaque exécution au premier plan, avec un délai.
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/mut-restes-equipe'
PAGE = os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html')
src = open(PAGE, encoding='utf-8').read()
# (nom, [(avant, après)], sections de la sonde, profil)
M = [
 ('1 la bulle ne reconnaît que les fiches de Mon entreprise (.ent-pan)', [("m0.closest('#calque .panneau')", "m0.closest('.ent-pan')")], 'A', 'iphone'),
 ('2 [ÉQUIVALENTE : la feuille #calque .panneau est découpée au bas de l\'écran (bottom == innerHeight mesuré à 320 et 390 px), la borne est redondante ici] la bulle ne borne plus par le bas de l\'écran', [("Math.min(pr.bottom, window.innerHeight, ac ?", "Math.min(pr.bottom, ac ?")], 'A', 'petit'),
 ('3 la phrase du nom redevient la liste de sept lignes', [("const NOM_PERS_REFUS = 'Lettres, chiffres, espaces et tirets seulement (60 signes au plus).';", "const NOM_PERS_REFUS = 'Un prénom ou un nom s’écrit avec des lettres, des chiffres, des espaces, des points ou des tirets (60 signes au plus) : pas de < > \" & ni de signes spéciaux.';")], 'A', 'iphone'),
 ('4 un compte désactivé reçoit de nouveau les gestes de mot de passe (fiche)', [("const mdpOutils = !p.actif ? `", "const mdpOutils = false ? `")], 'D', 'iphone'),
 ('5 un compte désactivé reçoit de nouveau le lien (rangée d\'actions de la fiche)', [(": p.actif ? `<button type=\"button\" class=\"btn gris\" data-eq=\"mdp|${k}\">Lui envoyer un lien pour choisir le sien</button>` : ''}<button type=\"button\" class=\"btn gris\" data-eq=\"${p.actif ? 'desact' : 'actif'}|${k}\"", ": `<button type=\"button\" class=\"btn gris\" data-eq=\"mdp|${k}\">Lui envoyer un lien pour choisir le sien</button>`}<button type=\"button\" class=\"btn gris\" data-eq=\"${p.actif ? 'desact' : 'actif'}|${k}\"")], 'D', 'iphone'),
 ('6 « Voir » seul dans le bandeau des comptes verrouillés', [("${V.length > 1 ? 'Voir ces comptes' : 'Voir ce compte'}", "Voir")], 'F', 'iphone'),
 ('7 le filtre Invités vide redit « Personne ici pour le moment »', [("f === 'invites' ? 'Aucune invitation en attente. Pour inviter quelqu’un, touche « ＋ Inviter une personne ».' :", "")], 'C', 'iphone'),
 ('8 la fiche de soi parle de nouveau à la troisième personne (bouton)', [("${soi ? 'M’envoyer un lien pour choisir un nouveau mot de passe' : 'Lui envoyer un lien pour choisir le sien'}", "Lui envoyer un lien pour choisir le sien")], 'E', 'iphone'),
]
sel = [int(a) for a in sys.argv[1:]]
bilan = []
for n, (nom, subs, sec, prof) in enumerate(M, 1):
    if sel and n not in sel: continue
    s = src; ok = True
    for a, b in subs:
        if s.count(a) < 1: ok = False; print(f'  ! mutation {n} : motif introuvable ({s.count(a)}) : {a[:70]}'); break
        s = s.replace(a, b)
    if not ok: bilan.append((n, nom, 'MOTIF INTROUVABLE')); continue
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        p = os.path.join(DEPOT, 'apercu', f)
        if os.path.isfile(p) and f != 'prototype-op-gestion.html': shutil.copy(p, os.path.join(TMP, 'apercu', f))
    open(os.path.join(TMP, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(s)
    env = dict(os.environ, RACINE=TMP)
    try:
        r = subprocess.run(['node', os.path.join(ICI, 'restes-equipe-1-recontrole.js'), prof, sec], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=300)
        sortie = r.stdout + r.stderr; code = r.returncode
    except subprocess.TimeoutExpired: sortie = ''; code = 124
    tot = re.findall(r'(\d+) ✓ · (\d+) ✗', sortie)
    # une section SEULE est jouée (tous les profils qui passent par elle) ; la sonde doit sortir en 1 (elle tombe) — et on nomme ce qui est tombé
    tombes = [l.strip()[:110] for l in sortie.split('\n') if l.startswith('  ✗')]
    etat = 'TOMBE' if code == 1 and tombes else ('PASSE (la sonde ne voit pas ce défaut)' if code == 0 else f'code {code}')
    print(f'mutation {nom} : {etat} {tot[-1] if tot else ""}'); [print('    ✗', t) for t in tombes[:2]]
    bilan.append((n, nom, etat))
shutil.rmtree(TMP, ignore_errors=True)
mauvais = [b for b in bilan if not b[2].startswith('TOMBE') and 'ÉQUIVALENTE' not in b[1]]
print(f'\n== {len(bilan) - len(mauvais)} mutation(s) sur {len(bilan)} font tomber la sonde'); [print('  ⚠', b[0], b[1], '→', b[2]) for b in mauvais]
sys.exit(1 if mauvais else 0)
