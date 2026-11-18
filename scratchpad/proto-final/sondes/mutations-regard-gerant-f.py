#!/usr/bin/env python3
# Contre-épreuve de regard-gerant-f.js : on remet chaque défaut dans une COPIE de la page (jamais dans le dépôt) et la sonde doit tomber.
# Usage : python3 scratchpad/proto-final/sondes/mutations-regard-gerant-f.py   — rend « N mutations, M tombent », sortie 1 si l'une ne tombe pas.
import os, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = os.path.join(RACINE, 'apercu', 'prototype-op-gestion.html')
src = open(PAGE, encoding='utf-8').read()
MUT = [
  ('13', 'la ligne « box affichées » recolle à « Voir les box »', '.cb-planc>.gris.petit{display:block;margin-top:2px}', '.cb-planc>.gris.petit{margin-top:2px}'),
  ('12', 'le registre redouble « Télécharger » sous la barre du document', '<div class="actions"><button type="button" class="btn gris" data-ferme="1">Fermer</button></div>`, true);   /* le document porte déjà', '<div class="actions"><button type="button" class="btn" data-rg="pdftel|${k}">Télécharger</button><button type="button" class="btn gris" data-ferme="1">Fermer</button></div>`, true);   /* le document porte déjà'),
  ('12', 'le plan des box redouble « Enregistrer en PDF »', '<div class="actions"><button type="button" class="btn gris" data-ferme="1">Fermer</button></div>`, true);   /* « Enregistrer en PDF » doublait', '<div class="actions"><button type="button" class="btn" data-cbx="pdf-ok">Enregistrer en PDF</button><button type="button" class="btn gris" data-ferme="1">Fermer</button></div>`, true);   /* « Enregistrer en PDF » doublait'),
  ('12', 'la barre du document n\'écrit plus au journal', "if (b.dataset.pdfdl) { pdfTelecharger(doc, nom); docTrace(doc, 'tel'); }", 'if (b.dataset.pdfdl) { pdfTelecharger(doc, nom); }'),
  ('12', 'le plan des box part vers une autre adresse que celle du client', 'data-a="${esc(CB_MAIL[c] || \'\')}" data-corps', 'data-a="autre@exemple.fr" data-corps'),
  ('12', 'le registre part sans adresse prérenseignée', 'data-a="${esc(CLIENTS[RG_SITES[k]].mail)}"', 'data-a=""'),
  ('15', 'la note du relevé reste à côté de « ＋ Photo » sur téléphone', '.cb-nph input{flex:1 1 240px;', '.cb-nph input{flex:1 1 120px;'),
  ('14', 'les commandes de fenêtre ne passent plus à la ligne', '.actions .btn{max-width:100%;white-space:normal;', '.actions .btn{max-width:100%;white-space:nowrap;'),
]
tombent = 0
for sec, nom, a, b in MUT:
    if src.count(a) != 1:
        print('  ✗ ancre introuvable ou multiple (%d) : %s' % (src.count(a), nom)); sys.exit(2)
    tmp = tempfile.mkdtemp(prefix='mutgf-')
    try:
        shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
        open(os.path.join(tmp, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(src.replace(a, b))
        r = subprocess.run(['node', os.path.join(RACINE, 'scratchpad/proto-final/sondes/regard-gerant-f.js'), sec], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=420)
        ok = r.returncode != 0
        bilan = [l for l in r.stdout.splitlines() if l.startswith('==')]
        print('  %s mutation (section %s) : %s  %s' % ('tombe ✓' if ok else 'NE TOMBE PAS ✗', sec, nom, bilan[-1] if bilan else r.stderr[-120:]))
        tombent += ok
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
print('\n%d mutations, %d tombent' % (len(MUT), tombent)); sys.exit(0 if tombent == len(MUT) else 1)
