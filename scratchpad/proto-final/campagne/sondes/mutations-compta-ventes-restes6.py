#!/usr/bin/env python3
# Mutations des restes compta-ventes, tour 6 : chaque défaut remis doit faire tomber la sonde qui le garde.
# ⛔ Le correctif est COMMITÉ avant : la restauration se fait par `git checkout` du seul fichier. Au premier plan, un délai par exécution.
import subprocess, sys, re
RACINE = '/home/user/wt-soeur'
PAGE = RACINE + '/apercu/prototype-op-gestion.html'
S = 'compta-ventes-restes6.js mac'; C = 'compta-ventes-restes6-commande.js mac'
MUT = [
 ('M1 la ligne d’acompte ne refuse plus le prix (drapeau ET prix négatif ignorés)', "const ligneAcompte = l => !!l && (l.acompte === true || l.pu < 0);", "const ligneAcompte = l => false;", S),
 ('M2 le drapeau seul ne suffit plus : une ligne vidée n’est plus reconnue', "(l.acompte === true || l.pu < 0)", "(l.pu < 0)", S),
 ('M3 le prix négatif seul ne suffit plus : une ligne d’avant le drapeau échappe à la garde', "(l.acompte === true || l.pu < 0)", "(l.acompte === true)", S),
 ('M4 la quantité de l’acompte n’est plus gardée', "if (ligneAcompte(l)) { t.value = l.q;", "if (false) { t.value = l.q;", S),
 ('M5 une unité inconnue multiplie de nouveau le prix en silence', "&& qteLire(v) !== null && !qteUniteConnue(v)) {", "&& false) {", S),
 ('M6 « forfait » suffit de nouveau à faire une ligne à l’heure', "&& !/forfait/i.test(String(l.d || '')) && l.pu === TARIFS.horaire", "&& l.pu === TARIFS.horaire", S),
 ('M7 le total de ligne de commande n’est plus arrondi au centime', "const cmdLigneHT = l => Math.round((Number(l.q) || 0) * (Number(l.pu) || 0) * 100 + 1e-7) / 100;", "const cmdLigneHT = l => (Number(l.q) || 0) * (Number(l.pu) || 0);", S),
 ('M8 le champ de prix de la commande redit « Prix HT »', "<span class=\"gris petit\">Prix unitaire HT</span><input inputmode=\"decimal\" data-cedl", "<span class=\"gris petit\">Prix HT</span><input inputmode=\"decimal\" data-cedl", C),
]
def sh(c, t=280):
    return subprocess.run(c, shell=True, cwd=RACINE, capture_output=True, text=True, timeout=t)
if sh('git status --short apercu/prototype-op-gestion.html').stdout.strip():
    sys.exit('la page a des changements non commités : on commite AVANT de muter')
src = open(PAGE, encoding='utf-8').read(); tombees = 0
for nom, a, b, sonde in MUT:
    assert src.count(a) == 1, (nom, src.count(a))
    open(PAGE, 'w', encoding='utf-8').write(src.replace(a, b))
    assert sh('git diff --stat apercu/prototype-op-gestion.html').stdout.strip(), 'la mutation n’a rien changé'
    try:
        r = sh('node scratchpad/proto-final/campagne/sondes/' + sonde); sortie = r.stdout + r.stderr
        m = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie); rouge = r.returncode != 0
        print(('TOMBE   ' if rouge else 'PASSE !! ') + nom, m[-1] if m else sortie[-120:].strip(), flush=True)
        tombees += rouge
    finally:
        sh('git checkout apercu/prototype-op-gestion.html')
print(tombees, '/', len(MUT), 'mutations tombent'); sys.exit(0 if tombees == len(MUT) else 1)
