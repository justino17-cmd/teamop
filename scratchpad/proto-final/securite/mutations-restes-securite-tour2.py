#!/usr/bin/env python3
# CONTRE-ÉPREUVE de restes-securite-tour2.js (18 novembre 2026) : on REMET chaque défaut, un par un, et la sonde doit TOMBER (un ✗ nommé).
# ⛔ Ordre : correctif commité → mutation → git checkout. Vérifie que la page a VRAIMENT changé (git diff non vide). Au premier plan, depuis la racine du dépôt.
import subprocess, sys, re
GARDE = ['node', 'scratchpad/proto-final/securite/restes-securite-tour2.js']
PG = 'apercu/prototype-op-gestion.html'
MUTS = [
 ('N1 le plafond d\'un nom de client revient à 80', PG, "const NOM_MAX = 120;", "const NOM_MAX = 80;"),
 ('N2 le champ « Raison sociale / Nom » du devis perd son maxlength', PG, '<input id="dvn-nom" maxlength="120" value=', '<input id="dvn-nom" value='),
 ('N3 le champ de la fiche client perd son maxlength', PG, '<input data-ci="nom" maxlength="120" value=', '<input data-ci="nom" value='),
 ('N4 le filet laisse passer tout style sans url()', PG, "!(a.name === 'style' && /^\\s*color\\s*:\\s*var\\(--[a-z-]+\\)\\s*;?\\s*$/i.test(a.value))", "!(a.name === 'style' && !/url\\(|expression|@import|behavior/i.test(a.value))"),
 ('N5 le filet ne garde plus la couleur d\'avertissement', PG, "/^\\s*color\\s*:\\s*var\\(--[a-z-]+\\)\\s*;?\\s*$/i.test(a.value))", "false)"),
 ('N6 l\'entrée du courrier recoupe à 80', PG, ".replace(/\\s+/g, ' ').trim().slice(0, NOM_MAX), mail:mailAdr({ de:d }) }; };", ".replace(/\\s+/g, ' ').trim().slice(0, 80), mail:mailAdr({ de:d }) }; };"),
]
tombent = 0; n = 0
for nom, f, a, b in MUTS:
    s = open(f, encoding='utf-8').read()
    if s.count(a) != 1: print('✗ ANCRE INTROUVABLE OU MULTIPLE', s.count(a), nom); continue
    open(f, 'w', encoding='utf-8').write(s.replace(a, b)); n += 1
    d = subprocess.run(['git', 'diff', '--stat', f], capture_output=True, text=True).stdout
    try:
        r = subprocess.run(GARDE, capture_output=True, text=True, timeout=200); sortie, code = r.stdout, r.returncode
    except subprocess.TimeoutExpired:
        sortie, code = '', 99
    subprocess.run(['git', 'checkout', f], check=True)
    ko = [l.strip()[:110] for l in sortie.splitlines() if l.startswith('  ✗')]
    tombe = bool(d.strip()) and code == 1 and ko
    tombent += 1 if tombe else 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom + ' · code ' + str(code) + ' · ' + ' | '.join(ko[:2]))
print('== %d mutations jouées, %d font tomber la sonde' % (n, tombent)); sys.exit(0 if tombent == n and n == len(MUTS) else 1)
