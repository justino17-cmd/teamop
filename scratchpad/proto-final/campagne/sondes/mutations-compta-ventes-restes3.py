#!/usr/bin/env python3
# Mutations des restes compta-ventes, tour 3 : chaque défaut remis doit faire tomber la sonde qui le garde.
# ⛔ Le correctif est COMMITÉ avant : la restauration se fait par `git checkout` du seul fichier. Au premier plan, un délai par exécution.
import subprocess, sys, re
RACINE = '/home/user/wt-soeur'
PAGE = RACINE + '/apercu/prototype-op-gestion.html'
SONDES = RACINE + '/scratchpad/proto-final/campagne/sondes/'
MUT = [
 ('M1 « 2h30 » ne se lit plus en heures', "if (d && +d[2] < 60) return +d[1] + (+d[2]) / 60;", "", 'compta-ventes-restes2-rc-qte.js mac'),
 ('M2 la main-d’œuvre préparée repasse au prix de la durée entière, sans qn', "q:duree(f), qn:f / 60, pu:TARIFS.horaire });", "q:duree(f), pu:f / 60 * TARIFS.horaire });", 'compta-ventes-restes2-rc-qte.js mac'),
 ('M3 la pièce préparée ne retrouve plus son total en retapant son texte', "const lu = qteLire(v), nq = (l.q0 != null && v === l.q0) ? l.qn0 : lu === null ? NaN : lu;", "const lu = qteLire(v), nq = lu === null ? NaN : lu;", 'compta-ventes-restes2-rc-qte.js mac'),
 ('M4 le plafond de quantité redevient 1 000 000', "if (nq > DV_Q_MAX) {", "if (nq >= 1e6) {", 'compta-ventes-restes2-rc-qte.js mac'),
 ('M5 la tâche « Rembourser » naît de nouveau au nom de Marc', "qui:tkxMoi(), d:AUJ, h:null, urgent:true, cle:'remb-'", "qui:'marc', d:AUJ, h:null, urgent:true, cle:'remb-'", 'compta-ventes-restes3-remb.js mac jour julie'),
 ('M6 « Voir la tâche » mène de nouveau à MES tâches', 'data-tmodif="${r.id}">Voir la tâche', 'data-go="taches">Voir la tâche', 'compta-ventes-restes3-remb.js mac jour julie'),
 ('M7 plus de geste quand la tâche est supprimée', "${!r ? ' <button type=\"button\" class=\"lien\" data-action=\"rembourseNote\"", "${false ? ' <button type=\"button\" class=\"lien\" data-action=\"rembourseNote\"", 'compta-ventes-restes3-remb.js mac jour julie'),
 ('M8 les mots au-dessus des champs ne s’affichent plus au téléphone', ".fac-lgs .fac-et{display:block;grid-row:2;", ".fac-lgs .fac-et{display:none;grid-row:2;", 'compta-ventes-restes3-lignes.js iphone jour'),
 ('M9 à 320 px les colonnes redépassent la carte', "@media (max-width:420px){.fac-lgs .dv-lg{grid-template-columns:minmax(0,1fr) 72px 112px 44px}", "@media (max-width:420px){.fac-lgs .dv-lg{grid-template-columns:minmax(0,1fr) 88px 128px 44px}", 'compta-ventes-restes3-lignes.js petit nuit'),
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
