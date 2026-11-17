#!/usr/bin/env python3
"""Contre-épreuve de accueil-restes-3.js : chaque mutation remet UN défaut, la sonde doit tomber, puis le fichier est restauré (git checkout : le correctif est commité AVANT)."""
import subprocess, sys
PAGE='apercu/prototype-op-gestion.html'; SONDE='scratchpad/proto-final/campagne/sondes/accueil-restes-3.js'
M=[
 ('moyen : seuls espèces/chèque comptent', "&& !FACTURES.some(f => f.int === i.id && f.num !== '—'))\n    .map(({ i, P }) => ({ d:cpDM(P.recuLe || i.d)", "&& (P.mode === 'Espèces' || P.mode === 'Chèque') && !FACTURES.some(f => f.int === i.id && f.num !== '—'))\n    .map(({ i, P }) => ({ d:cpDM(P.recuLe || i.d)", 'M'),
 ('jour : le jour prévu décide', "d:cpDM(P.recuLe || i.d)", "d:cpDM(i.d)", 'D'),
 ('jour : recuLe jamais posé', "if (F.paiement && F.paiement.etat !== 'rien' && !F.paiement.recuLe) {", "if (false && F.paiement && F.paiement.etat !== 'rien' && !F.paiement.recuLe) {", 'D'),
 ('facture partie : la ligne additionne tout', "(dejaPartie ? encaisserPaieTech(fa, P) : ENCAISSEMENTS", "(false ? 0 : ENCAISSEMENTS", 'F'),
 ('facture partie : plus que le reste', "const reste = restant(f), v = P.etat === 'total' ? reste : Math.min(reste, parseFloat(String(P.montant).replace(',','.')) || 0);", "const reste = restant(f), v = P.etat === 'total' ? reste : (parseFloat(String(P.montant).replace(',','.')) || 0);", 'F'),
 ('graphique : seuil à 557', "@container (max-width:527px)", "@container (max-width:557px)", 'C'),
 ('bilan : unité à la ligne', "\n.bil-t b{white-space:nowrap}", "", 'T'),
]
bad=0
for nom,a,b,part in M:
    s=open(PAGE).read(); n=s.count(a)
    if n<1: print('✗ ancre absente :',nom); bad+=1; continue
    open(PAGE,'w').write(s.replace(a,b))
    try:
        r=subprocess.run(['node',SONDE,part,'mac'],capture_output=True,text=True,timeout=300)
        tombe = r.returncode!=0
    except subprocess.TimeoutExpired: tombe=False; print('délai dépassé')
    subprocess.run(['git','checkout',PAGE])
    print(('✓ tombe  ' if tombe else '✗ NE TOMBE PAS  ')+nom+f' ({n} occurrence(s) mutée(s))'); bad+= 0 if tombe else 1
sys.exit(1 if bad else 0)
