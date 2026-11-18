# Mutations du tour 4 de l'Accueil : chaque défaut remis doit faire tomber restes-accueil-4.js. Les correctifs sont COMMITÉS avant de muter ; restauration par git checkout.
import subprocess, sys
P='apercu/prototype-op-gestion.html'
M=[
 ("A1 menu sans l'argent", "const defaire = argentSurPlaceCompter(i); rendre(); toast('Marquée terminée', defaire ? { lib:'Annuler', fn:() => { annuler(); defaire(); rendre(); } } : ANNULER);", "rendre(); toast('Marquée terminée', ANNULER);"),
 ("A2 annulation du menu oublie l'argent", "annuler(); defaire(); rendre();", "annuler(); rendre();"),
 ("A3 aucune date posée", "if (posee) { P.recuLe = AUJ; P.recuH = hm(MAINT_MIN); }\n  journalPaieTerrain", "journalPaieTerrain"),
 ("A4 date écrasée même déjà posée", "const posee = !P.recuLe,", "const posee = true,"),
 ("A5 un paiement « rien » écrit quand même", "if (!P || P.etat === 'rien') return null;\n  const posee", "if (!P) return null;\n  const posee"),
 ("B1 registre sans l'argent", "const defaireArgent = Iv && stAvant !== 'fait' && Iv.st === 'fait' ? argentSurPlaceCompter(Iv) : null;", "const defaireArgent = null;"),
 ("B2 annulation du registre oublie l'argent", "if (defaireArgent) defaireArgent(); if (F)", "if (F)"),
 ("C1 ligne figée sur l'ancien montant", "if (l) l.det = eur(v) + ' · ' + P.mode; return; }", "return; }"),
 ("C2 ligne doublée au re-Terminer", "if (P.journale) { const l = JOURNAL.find", "if (false && P.journale) { const l = JOURNAL.find"),
 ("D1 l'annulation ne retire pas la ligne", "ajoutees.forEach(l => { const k = JOURNAL.indexOf(l); if (k >= 0) JOURNAL.splice(k, 1); }); };", "};"),
]
s0=open(P,encoding='utf-8').read(); tombes=0
for nom,a,b in M:
    if s0.count(a)!=1: print('?? ancre introuvable/multiple', nom, s0.count(a)); sys.exit(2)
    open(P,'w',encoding='utf-8').write(s0.replace(a,b,1))
    r=subprocess.run(['node','scratchpad/proto-final/campagne/sondes/restes-accueil-4.js'],capture_output=True,text=True,timeout=300)
    sortie=[l for l in r.stdout.splitlines() if l.startswith('== ')]
    mord = r.returncode!=0
    tombes+=mord; print(('TOMBE ' if mord else 'VERT  '), nom, sortie[-1] if sortie else r.stderr[-200:])
open(P,'w',encoding='utf-8').write(s0)
print(tombes,'/',len(M),'mutations tombées')
