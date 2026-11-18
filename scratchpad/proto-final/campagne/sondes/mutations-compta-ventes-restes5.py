#!/usr/bin/env python3
# Mutations des restes compta-ventes, tour 5 : chaque défaut remis doit faire tomber la sonde qui le garde.
# ⛔ Le correctif est COMMITÉ avant : la restauration se fait par `git checkout` du seul fichier. Au premier plan, un délai par exécution.
import subprocess, sys, re
RACINE = '/home/user/wt-soeur'
PAGE = RACINE + '/apercu/prototype-op-gestion.html'
S = 'compta-ventes-restes4-rc-a.js mac'; B = 'compta-ventes-restes4-rc-b.js mac'; Q = 'compta-ventes-restes5-qte.js iphone'
MUT = [
 ('M1 la désignation « main-d’œuvre » suffit de nouveau à faire une ligne à l’heure', "String(l.d || '')) && l.pu === TARIFS.horaire);", "String(l.d || '')));", S),
 ('M2 le drapeau « à l’heure » n’est plus lu', "|| l.heure === true ||", "||", S),
 ('M3 le drapeau n’est plus posé par une durée acceptée', "if (mn !== null) l.heure = true; else delete l.heure;", "delete l.heure;", S),
 ('M4 un prix illisible vide de nouveau le prix en silence', "if (isNaN(v) && t.value.trim() !== '') { toast(", "if (false) { toast(", B),
 ('M5 la ligne d’acompte se retourne de nouveau en retapant « 40 »', "if (lg0.pu < 0 && t.value.trim() !== '') {", "if (false) {", B),
 ('M6 la quantité garde le texte tapé (« 90 minutes »)', "l.q = mn !== null ? prNum(mn) + ' min' : v;", "l.q = v;", Q),
 ('M7 la colonne de quantité de la facture repasse à 72 px sur téléphone', "minmax(0,1fr) 92px 98px 44px;column-gap:6px}", "minmax(0,1fr) 72px 112px 44px}", Q),
 ('M8 la colonne de quantité du bureau repasse à 88 px', ".fac-lgs .dv-lg{grid-template-columns:minmax(0,1fr) 100px 110px 128px 44px}", ".fac-lgs .dv-lg{grid-template-columns:minmax(0,1fr) 88px 110px 128px 44px}", 'compta-ventes-restes5-qte.js mac'),
]
def sh(c, t=250):
    return subprocess.run(c, shell=True, cwd=RACINE, capture_output=True, text=True, timeout=t)
if sh('git status --short apercu/prototype-op-gestion.html').stdout.strip():
    sys.exit('la page a des changements non commités : on commite AVANT de muter')
src = open(PAGE, encoding='utf-8').read(); tombees = 0
for nom, a, b, sonde in MUT:
    assert src.count(a) == 1, (nom, src.count(a))
    open(PAGE, 'w', encoding='utf-8').write(src.replace(a, b))
    assert sh('git diff --stat apercu/prototype-op-gestion.html').stdout.strip(), 'la mutation n’a rien changé'
    try:
        r = sh('node scratchpad/proto-final/campagne/sondes/' + sonde, 250); sortie = r.stdout + r.stderr
        m = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie); rouge = r.returncode != 0
        print(('TOMBE   ' if rouge else 'PASSE !! ') + nom, m[-1] if m else sortie[-120:].strip())
        tombees += rouge
    finally:
        sh('git checkout apercu/prototype-op-gestion.html')
print(tombees, '/', len(MUT), 'mutations tombent'); sys.exit(0 if tombees == len(MUT) else 1)
