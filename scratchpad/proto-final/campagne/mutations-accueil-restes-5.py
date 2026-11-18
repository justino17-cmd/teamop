# Mutations du tour 5 de l'Accueil : chaque défaut remis doit faire tomber restes-accueil-5.js. Les correctifs sont COMMITÉS avant de muter ; restauration par git checkout.
import subprocess, sys
P='apercu/prototype-op-gestion.html'
M=[
 ("R1 « Remettre à faire » laisse la ligne", "const remettre = argentSurPlaceRetirer(i.id); rendre();", "const remettre = null; rendre();"),
 ("R2 « Annuler » de « Remettre à faire » ne remet pas la ligne", "annuler(); remettre(); rendre();", "annuler(); rendre();"),
 ("R3 le retrait n'efface pas le drapeau (re-Terminer ne repose pas la ligne)", "  if (P) delete P.journale;\n  if (!pris.length) return null;", "  if (!pris.length) return null;"),
 ("R4 le retrait ne retire rien du journal", "pris.slice().reverse().forEach(({ l }) => JOURNAL.splice(JOURNAL.indexOf(l), 1));", ""),
 ("R5 « Recommencer » laisse la ligne", "argentSurPlaceRetirer('i1'); if (M.paiement) {", "if (M.paiement) {"),
 ("R6 « Recommencer » garde le drapeau d'encaissement (50 € perdus avec la facture envoyée)", "delete M.paiement.encaisse; ", ""),
 ("R7 « Recommencer » garde la date de réception", "delete M.paiement.recuLe; ", ""),
 ("R8 « Recommencer » ne retire plus son drapeau de ligne seul (le retrait le fait aussi : mutation neutralisée, attendue VERTE)", "delete M.paiement.recuH; delete M.paiement.journale; }", "delete M.paiement.recuH; }"),
]
s0=open(P,encoding='utf-8').read(); tombes=0
for nom,a,b in M:
    if s0.count(a)!=1: print('?? ancre introuvable/multiple', nom, s0.count(a)); sys.exit(2)
    open(P,'w',encoding='utf-8').write(s0.replace(a,b,1))
    r=subprocess.run(['node','scratchpad/proto-final/campagne/sondes/restes-accueil-5.js'],capture_output=True,text=True,timeout=300)
    sortie=[l for l in r.stdout.splitlines() if l.startswith('== ')]
    mord = r.returncode!=0
    tombes+=mord; print(('TOMBE ' if mord else 'VERT  '), nom, sortie[-1] if sortie else r.stderr[-200:])
open(P,'w',encoding='utf-8').write(s0)
print(tombes,'/',len(M),'mutations tombées')
