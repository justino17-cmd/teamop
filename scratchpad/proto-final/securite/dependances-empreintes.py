#!/usr/bin/env python3
# Angle « dépendances » : l'empreinte de chaque script EN LIGNE est écrite dans la politique de contenu de sa page. Elle se CALCULE sur le texte final :
# la moindre retouche d'un script (un correctif d'un autre angle, un bouton de plus) change l'empreinte, et la page SE TAIT (le navigateur refuse son script).
# Ce petit outil est donc l'ÉTAPE FINALE de toute fabrication, et son mode « --verifier » est le garde-fou :
#   python3 dependances-empreintes.py --verifier [dossier]     → code 0 si chaque page porte les bonnes empreintes, 1 sinon (nomme la page)
#   python3 dependances-empreintes.py --ecrire   [dossier]     → réécrit les empreintes de chaque page (idempotent : relancé, il ne change plus rien)
# Le dossier est celui qui contient les pages (défaut : apercu/ du dépôt). ⛔ Il ne pose PAS la politique : c'est le correctif dependances-01 qui la pose ; ici on ne tient que ses empreintes.
import os, sys, re, hashlib, base64
ICI = os.path.dirname(os.path.abspath(__file__))
DOSSIER = next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(ICI, '..', '..', '..', 'apercu'))
PAGES = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html']
META = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(">)')
def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf8')).digest()).decode() + "'"
def blocs(h): return [m.group(1) for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', h)]
def recalcule(h):
    m = META.search(h)
    if not m: return None, 'aucune politique de contenu dans la page'
    pol = m.group(2)
    d = re.search(r'script-src ([^;]*);', pol)
    if not d: return None, 'pas de directive script-src'
    mots = [x for x in d.group(1).split() if not x.startswith("'sha256-")]
    if "'unsafe-inline'" in mots: return None, "script-src garde 'unsafe-inline' : pas d'empreintes à tenir"
    neuf = ' '.join(mots + sorted({sha(b) for b in blocs(h)}))
    return h[:m.start(2)] + pol[:d.start(1)] + neuf + pol[d.end(1):] + h[m.end(2):], None
def main():
    ecrire = '--ecrire' in sys.argv; mauvaises = 0
    for p in PAGES:
        chemin = os.path.join(DOSSIER, p); h = open(chemin, encoding='utf8').read()
        neuf, err = recalcule(h)
        if err: print('✗ %s : %s' % (p, err)); mauvaises += 1; continue
        if neuf == h: print('✓ %s : empreintes à jour (%d script(s) en ligne)' % (p, len(blocs(h)))); continue
        if ecrire: open(chemin, 'w', encoding='utf8').write(neuf); print('↻ %s : empreintes réécrites (%d script(s) en ligne)' % (p, len(blocs(h))))
        else: print('✗ %s : les empreintes ne correspondent plus aux scripts (le navigateur refuserait de les exécuter) — relancer avec --ecrire' % p); mauvaises += 1
    sys.exit(1 if mauvaises else 0)
main()
