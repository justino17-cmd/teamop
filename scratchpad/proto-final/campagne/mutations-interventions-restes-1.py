#!/usr/bin/env python3
# Contre-épreuve de interventions-restes-1.js : chaque mutation REMET un défaut dans une COPIE de la page (le dépôt n'est jamais touché),
# la sonde est lancée sur cette copie (RACINE=...) et doit tomber (code 1). Une mutation qui laisse la sonde verte = un garde aveugle.
# usage : python3 mutations-interventions-restes-1.py [numéro de mutation ...]
import os, shutil, subprocess, sys, tempfile
DEP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = os.path.join(DEP, 'apercu', 'prototype-op-gestion.html')
SONDE = os.path.join(DEP, 'scratchpad', 'proto-final', 'campagne', 'sondes', 'interventions-restes-1.js')
SRC = open(PAGE, encoding='utf-8').read()
M = [
 ('garantie : le bloc « Paiement » de la fiche revient', "${enGarantie(i) ? `<div class=\"carte\"><h3>Paiement</h3>", "${false ? `<div class=\"carte\"><h3>Paiement</h3>", 'iphone', '^A'),
 ('garantie : « Paiement sur place » revient sur la fiche terminée', "enGarantie(i) || ctrCompris(i) && !f ? '' : f && f.st === 'payee'", "ctrCompris(i) && !f ? '' : f && f.st === 'payee'", 'iphone', '^A'),
 ('entretien : coché d’office après un dépannage', "const SUITE_ENTRETIEN = ['Entretien', 'Mise en service', 'Installation'];", "const SUITE_ENTRETIEN = ['Entretien', 'Mise en service', 'Installation', 'Dépannage'];", 'iphone', '^B'),
 ('autre passage : la fiche d’un autre client parle encore du ventilateur', "const autrePassageNom = i => histoireVentilo(i) ? 'Remplacer le ventilateur' : 'Un autre passage';", "const autrePassageNom = i => 'Remplacer le ventilateur';", 'iphone', '^B'),
 ('autre passage : le client d’un autre passage lit une ligne vide', "if (F.suite.ventilo && !histoireVentilo(i)) ven =", "if (false) ven =", 'iphone', '^B'),
 ('filtre : « Toutes » redéfile sur iPad', "\n.seg:has([data-filtreint]){flex-wrap:wrap;overflow-x:visible}.seg:has([data-filtreint]) button{flex:1 1 auto}", "", 'ipad', '^C'),
 ('date à fixer : le tiret revient au téléphone', "'<b class=\"jl-h\">Date à fixer</b>'", "'<b class=\"jl-h\">—</b><span class=\"gris mini\">date à fixer</span>'", 'iphone', '^C'),
 ('44 px : la case du secteur retombe à 40 px', "<label class=\"case\" style=\"border:0;min-height:44px\"><input type=\"checkbox\" data-csect=\"1\"", "<label class=\"case\" style=\"border:0;min-height:40px\"><input type=\"checkbox\" data-csect=\"1\"", 'ipad', '^D'),
 ('relevé : « abc » repasse', "if (/^\\d+([.,]\\d+)?$/.test(ex || '')) {", "if (false) {", 'iphone', '^E'),
 ('téléphone : plus de limite à 20 chiffres', "n >= 6 && n <= 20; };", "n >= 6 && n <= 30; };", 'iphone', '^F'),
 ('téléphone : « poste 12 » refusé de nouveau', "const c = t.replace(TEL_POSTE, '');", "const c = t;", 'iphone', '^F'),
 ('prix : plus de plafond sur une ligne de facture', "if (!isNaN(v) && v >= DV_PU_MAX) {", "if (!isNaN(v) && v >= 1e99) {", 'iphone', '^F'),
]
sel = [int(x) for x in sys.argv[1:]] or list(range(1, len(M) + 1))
bilan = []
for n in sel:
    nom, a, b, prof, sect = M[n - 1]
    if SRC.count(a) != 1: print(f'M{n} {nom} : motif trouvé {SRC.count(a)} fois, mutation IMPOSSIBLE'); bilan.append((n, 'impossible')); continue
    racine = tempfile.mkdtemp(prefix='mut-interv-')
    try:
        for e in os.listdir(DEP):
            if e != 'apercu': os.symlink(os.path.join(DEP, e), os.path.join(racine, e))
        os.mkdir(os.path.join(racine, 'apercu'))
        for e in os.listdir(os.path.join(DEP, 'apercu')):
            if e != 'prototype-op-gestion.html': os.symlink(os.path.join(DEP, 'apercu', e), os.path.join(racine, 'apercu', e))
        open(os.path.join(racine, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(SRC.replace(a, b))
        try:
            r = subprocess.run(['node', SONDE, prof, 'jour', sect], env={**os.environ, 'RACINE': racine}, capture_output=True, text=True, timeout=400)
            sortie = r.stdout; code = r.returncode
        except subprocess.TimeoutExpired as e: sortie = '(délai)'; code = -1
        bil = [l for l in sortie.splitlines() if l.startswith('== ')]; ko = [l[:150] for l in sortie.splitlines() if l.startswith(' ✗')][:3]
        etat = 'TOMBE (bien)' if code == 1 else 'RESTE VERT (garde aveugle)' if code == 0 else f'code {code}'
        print(f'M{n} {nom} → {etat} · {bil[-1] if bil else "?"}'); [print('     ', k) for k in ko]
        bilan.append((n, etat))
    finally: shutil.rmtree(racine, ignore_errors=True)
print('\nBILAN :', sum(1 for _, e in bilan if e.startswith('TOMBE')), 'tombent sur', len(bilan))
sys.exit(0 if all(e.startswith('TOMBE') for _, e in bilan) else 1)
