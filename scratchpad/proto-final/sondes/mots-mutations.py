#!/usr/bin/env python3
# CONTRE-ÉPREUVE des mots : on remet, dans une COPIE de la page (jamais dans le dépôt : pas de `git checkout`, rien à restaurer), un défaut de chaque famille
# et on exige que mots-interdits.js le nomme. Un banc qui ne tombe sur aucun défaut remis ne prouve rien (même discipline que les bancs du serveur).
# Une copie hors dépôt : /tmp/mots-mut/apercu/ (les cinq fichiers du prototype), servie par lib.js grâce à RACINE=/tmp/mots-mut.
# usage : python3 scratchpad/proto-final/sondes/mots-mutations.py   (≈ 6 minutes : un relevé du gérant)
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
COPIE = '/tmp/mots-mut'
FICHIERS = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-documents.html', 'prototype-paiement.html', 'prototype-courrier.js']
# (écran lu, texte d'origine, texte mutant, ce que la sonde doit nommer)
MUT = [
    ('statistiques', "Comment va l’entreprise, sur la période que tu choisis.", "Comment va l’entreprise (prototype), sur la période que tu choisis.", "echafaudage"),
    ('historique', "Qui a fait quoi, et quand.", "Le patron voit qui a fait quoi, et quand.", "patron"),
    ('entreprise', "Ce qui s’écrit sur tes factures, tes devis et tes e-mails", "Ce qui s’écrit sur tes factures, tes devis et tes courriels", "deux-mots-courriel"),
    ('statistiques', "${x.n} ${x.n > 1 ? 'interventions' : 'intervention'}${x.n ?", "${x.n} int.${x.n ?", "abreviation"),
    ('equipe', "Qui fait quoi, ce que chacun peut faire, et ses habilitations.", "Qui fait quoi, ce que chacun peut faire, et l'ensemble de ses habilitations.", "apostrophe-droite"),
    ('accueil', "Planning de l’équipe", "Dashboard de l’équipe", "jargon"),
    ('achats', "Le matériel que ton équipe demande", "Le matériel que votre équipe demande", "vouvoiement-equipe"),
    ('stock', "Ce qu’il te reste, et où il est.", "Ce qu’il te reste, et où il est, avec tout ce qui est prévu cette semaine, ce qui est en retard, ce qui attend une réponse du fournisseur et ce que l’équipe doit encore préparer avant lundi matin.", "phrase-longue"),
]
if os.path.exists(COPIE): shutil.rmtree(COPIE)
os.makedirs(COPIE + '/apercu')
for f in FICHIERS: shutil.copy(os.path.join(RACINE, 'apercu', f), COPIE + '/apercu/' + f)
p = COPIE + '/apercu/prototype-op-gestion.html'; s = open(p, encoding='utf-8').read()
posees = []
for (ecran, avant, apres, regle) in MUT:
    n = s.count(avant)
    if n == 0: print('✗ le texte d’origine n’existe plus : ' + avant[:60]); sys.exit(2)
    s = s.replace(avant, apres, 1); posees.append((ecran, avant, apres, regle))
open(p, 'w', encoding='utf-8').write(s)
env = dict(os.environ, RACINE=COPIE)
r = subprocess.run(['node', os.path.join(ICI, 'mots-interdits.js'), 'marc'], env=env, capture_output=True, text=True, timeout=590)
sortie = r.stdout + r.stderr; ok = ko = 0
for (ecran, avant, apres, regle) in posees:
    vu = [l for l in sortie.split('\n') if regle in l]
    if vu: ok += 1; print('  ✓ ' + regle + ' remis, la sonde le nomme')
    else: ko += 1; print('  ✗ ' + regle + ' remis (' + apres[:50] + '…) : la sonde ne dit rien')
if r.returncode == 0: ko += 1; print('  ✗ la sonde est sortie en 0 alors que des défauts étaient remis')
else: ok += 1; print('  ✓ la sonde sort en 1 sur la copie mutée')
shutil.rmtree(COPIE)
print('%d ✓ · %d ✗' % (ok, ko)); sys.exit(1 if ko else 0)
