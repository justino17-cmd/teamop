#!/usr/bin/env python3
# Contre-épreuve du second regard du bureau (18 novembre 2026) : on REMET chaque défaut un par un dans apercu/prototype-op-gestion.html,
# la sonde doit tomber (code 1), puis `git checkout` rend le fichier. ⛔ Le correctif doit être COMMITÉ avant de lancer ce script.
# Usage : python3 scratchpad/proto-final/sondes/mutations-regard-bureau-a-recontrole.py   (depuis la racine du dépôt, au premier plan)
import subprocess, sys
P = 'apercu/prototype-op-gestion.html'
SONDE = 'scratchpad/proto-final/sondes/regard-bureau-a-recontrole.js'
M = [
 ("6a pastille d'état à 320 px : règle du N° en 11,5 px retirée", ".tableau table.l:not(:has(thead th:nth-child(5))) td.mono{font-size:11.5px}", "", ['6', 'a']),
 ("6b résumé des tâches : retour à la ligne de la sœur (fusionné) retiré", ".t-ici{min-width:0}.t-ici summary{flex-wrap:wrap;row-gap:0}", "", ['6', 'b']),
 ("6b/6h coche ✅ remise (gabarit des fiches)", '<summary><b>${T.length} tâche', '<summary><span aria-hidden="true">✅</span><b>${T.length} tâche', ['6', 'b']),
 ("6h coche ✅ remise (gabarit des fiches), lue par § 6 h", '<summary><b>${T.length} tâche', '<summary><span aria-hidden="true">✅</span><b>${T.length} tâche', ['6', 'h']),
 ("5 références de pièces : insécable retiré", ".cp-pj{white-space:nowrap}", ".cp-pj{}", ['5']),
 ("5 coche sortie du mot insécable", "<span class=\"cp-pj\">${k === 1 ? '✓&nbsp;' : ''}${m}</span>", "${k === 1 ? '✓&nbsp;' : ''}<span class=\"cp-pj\">${m}</span>", ['5']),
 ("6d sous-onglets Ventes : grille de deux colonnes retirée", ".cx-sous:not(:has(button:nth-child(5))){display:grid;grid-template-columns:1fr 1fr}", "", ['6', 'd']),
 ("6e objet de facture : trois lignes retirées", ".cx-row .cx-doc .petit{white-space:normal;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}", "", ['6', 'e']),
 ("6f tuile du prochain passage : coupe à 32 signes remise", "esc(proch.titre)", "esc(proch.titre.length>32?proch.titre.slice(0,31)+'…':proch.titre)", ['6', 'f']),
 ("6f onglets fiche client : 3 + 3 retiré", ".seg[aria-label=\"Fiche client\"]:has(button:nth-child(6)){display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}", "", ['6', 'f']),
 ("6c filtres Devis iPad : rembourrage réduit retiré", ".seg:has([data-dvf]) button{padding:0 12px}", "", ['6', 'c']),
 ("6g devis : mot « Qté » retiré", 'aria-label="Désignation"><span class="fac-et fac-et-q" aria-hidden="true">Qté</span>', 'aria-label="Désignation">', ['6', 'g']),
 ("6g devis : aria-label de la quantité retiré", 'aria-label="Quantité"><span class="fac-et fac-et-p"', 'aria-label=""><span class="fac-et fac-et-p"', ['6', 'g']),
]
def sh(*a, **k): return subprocess.run(a, capture_output=True, text=True, **k)
etat = sh('git', 'status', '--porcelain', P).stdout.strip()
if etat: sys.exit('refus : ' + P + ' a des modifications non commitées (le git checkout les effacerait) :\n' + etat)
tombes = 0
for nom, ancien, neuf, args in M:
    s = open(P, encoding='utf-8').read()
    n = s.count(ancien)
    if n < 1: print('  ?? motif introuvable :', nom); continue
    # la 2ᵉ occurrence d'une ligne commune aux deux gabarits n'est pas visée ici : on remplace la PREMIÈRE trouvée dans le gabarit des fiches (n = 1 attendu)
    open(P, 'w', encoding='utf-8').write(s.replace(ancien, neuf, 1))
    diff = sh('git', 'diff', '--stat', P).stdout.strip().splitlines()[-1:]
    try: r = sh('node', SONDE, *args, timeout=400); code = r.returncode; ko = [l for l in r.stdout.splitlines() if 'N ✓' in l or ' ✗' in l and '==' in l]
    except subprocess.TimeoutExpired: code = 99; ko = ['délai dépassé']
    sh('git', 'checkout', P)
    propre = not sh('git', 'status', '--porcelain', P).stdout.strip()
    tombe = code == 1; tombes += tombe
    print(('  ✓ TOMBE ' if tombe else '  ✗ NE TOMBE PAS '), nom, '|', ' '.join(diff), '|', ko[-1:] if ko else '', '| fichier restauré' if propre else '| ⚠️ fichier NON restauré')
print('== %d / %d mutations font tomber la sonde' % (tombes, len(M)))
sys.exit(0 if tombes == len(M) else 1)
