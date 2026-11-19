#!/usr/bin/env python3
"""Mutations du tour 6 (prix d'un contrat par la règle commune, seuil de la liste) : sur des COPIES, jamais dans le dépôt. « mord » = la sonde rend au moins un ✗ ou meurt.
Usage : python3 mutations-restes-contrats-6.py [filtre]"""
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
COPIE = '/tmp/opg6/mut/racine'; os.makedirs(os.path.join(COPIE, 'apercu'), exist_ok=True)
for f in ['prototype-op-gestion.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'opcourrier.js', 'prototype-courrier.js']:
    shutil.copy(os.path.join(DEPOT, 'apercu', f), os.path.join(COPIE, 'apercu', f))
PAGE = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
MUT = [
 ("M1 le nettoyage du « € » est retiré", "const ctrPrixTexte = x => String(x == null ? '' : x).trim().replace(/\\s*(€|euros?|eur)\\s*$/i, '').trim();", "const ctrPrixTexte = x => String(x == null ? '' : x).trim();"),
 ("M2 « 0x10 » passe (Number lit l'hexadécimal, la phrase commune n'est plus consultée)", ["const u = ctrPrixClair(t), n = u != null ? u : cxNum(t); if (!isFinite(n)) return NaN;", "{ const r = cxMontantRefus(t); if (r && !/^« /.test(r) && !/^Un montant a au plus/.test(r)) return r; }"], ["const u = ctrPrixClair(t), n = u != null ? u : Number(t); if (!isFinite(n)) return NaN;", ""]),
 ("M3 20 chiffres redit « au moins 1 € » au lieu de « trop grand »", "if (t.replace(/\\D/g, '').length >= 20) return 'Ce prix est trop grand : maximum ' + eur(CTR_PRIX_MAX) + ' par an.';", "if (t.replace(/\\D/g, '').length >= 20) return 'Indique le prix du contrat : au moins 1 €.';"),
 ("M4 le seuil de la liste redescend à 840 px", "@container ctrl (max-width:920px)", "@container ctrl (max-width:840px)"),
 ("M5 « 1.000,50 » lu en 1 000 500 (séparateurs mal lus)", "const u = ctrPrixClair(t), n = u != null ? u : cxNum(t);", "const u = ctrPrixClair(t), n = u != null ? u : Number(t.replace(/[.,]/g, ''));"),
 ("M7 Facturation et Début se remettent côte à côte au téléphone", "@media (max-width:420px){.deux-champs.ctr-fact{grid-template-columns:minmax(0,1fr)}}", "@media (max-width:420px){.deux-champs.ctr-fact{grid-template-columns:1fr 1fr}}"),
 ("M6 un prix illisible redit « au moins 1 € »", "if (r && !/^« /.test(r) && !/^Un montant a au plus/.test(r)) return r; }", "if (r && !/^« /.test(r) && !/^Un montant a au plus/.test(r)) return 'Indique le prix du contrat : au moins 1 €.'; }"),
]
filtre = sys.argv[1] if len(sys.argv) > 1 else ''; bilan = []
def appliquer(page, old, new):
    olds = old if isinstance(old, list) else [old]; news = new if isinstance(new, list) else [new]
    for o, n in zip(olds, news):
        assert page.count(o) == 1, ('ancre non unique', o[:50], page.count(o)); page = page.replace(o, n)
    return page
for nom, old, new in MUT:
    if filtre and filtre not in nom: continue
    open(os.path.join(COPIE, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(appliquer(PAGE, old, new))
    try: r = subprocess.run(['node', os.path.join(ICI, 'restes-contrats-6.js')] + (['android'] if nom.startswith('M7') else []), env=dict(os.environ, RACINE=COPIE), capture_output=True, text=True, timeout=300); code = r.returncode; sortie = r.stdout
    except subprocess.TimeoutExpired: code, sortie = 2, 'délai'
    ligne = [l for l in sortie.splitlines() if '✓' in l and '✗' in l][-1:] or ['']
    bilan.append((nom, code)); print(('MORD    ' if code else 'SURVIT  ') + nom, '|', ligne[0].strip(), flush=True)
print('\n%d mutations, %d mordent' % (len(bilan), sum(1 for _, c in bilan if c)))
