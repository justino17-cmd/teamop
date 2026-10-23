#!/usr/bin/env python3
"""Mutations du panneau des réunions de la Tour (sonde-tour-reunions.js) — SUR UNE COPIE de tour.html (TOUR_FICHIER), jamais sur le dépôt.
Un « SURVIT » est une sonde aveugle. Usage : mutations-tour-reunions.py [préfixe …]"""
import subprocess, os, sys, tempfile
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=open(R+'/tour.html',encoding='utf-8').read()
M=[
 ("T1 Lancer sans confirmation", "if(!confirm('Lancer « '+MS_REU_LIB[type]+' » maintenant ?", "if(false&&!confirm('Lancer « '+MS_REU_LIB[type]+' » maintenant ?"),
 ("T2 Retirer sans confirmation", "if(!l||!confirm('Retirer cette leçon de '", "if(!l||false&&!confirm('Retirer cette leçon de '"),
 ("T3 un rafraîchissement raté vide le panneau", "},function(e){ R.enVol=false; if(!R.d){ R.lec=-1; R.err=msgErreur(e); } messPeindreReunions(); });", "},function(e){ R.enVol=false; R.d=null; R.lec=-1; R.err=msgErreur(e); messPeindreReunions(); });"),
 ("T4 boutons pas grisés pendant l'appel", "R.lance=true; messPeindreReunions();", "R.lance=false;"),
 ("T5 le panneau paraît sur tous les fils", "if(MS.fil!=='reunions'){ if(!c.hidden){", "if(false){ if(!c.hidden){"),
 ("T6 le bilan sans mot (couleur seule)", "esc(MS_BILAN_LIB[x.bilan.statut]||x.bilan.statut)+'</span>", "''+'</span>"),
 ("T7 pas de plafond de hauteur", ".ms-reu{flex:none;max-height:min(46%,360px);overflow-y:auto;", ".ms-reu{flex:none;overflow-y:auto;"),
 ("T8 le téléphone ne démarre plus plié", "matchMedia('(max-width:899px)').matches:false)}};", "false:false)}};"),
 ("T9 un 409 n'est plus dit", "else toast((x.d&&x.d.error)||('Le serveur a refusé ('+x.status+').'));\n    messPeindreReunions(); return x;", "messPeindreReunions(); return x;"),
 ("T10 fin de réunion : heure absente", "' en cours — jusqu’à '+esc(cours.jusqua)+'</b>", "' en cours</b>"),
]
sel=sys.argv[1:]
surv=[]
for nom,a,b in M:
    if sel and not any(nom.startswith(x) for x in sel): continue
    if S.count(a)!=1: print('??',nom,S.count(a)); surv.append(nom); continue
    f=os.path.join(tempfile.mkdtemp(prefix='mut-tour-reu-'),'tour.html')
    open(f,'w',encoding='utf-8').write(S.replace(a,b))
    r=subprocess.run(['node',R+'/scratchpad/sonde-tour-reunions.js'],env=dict(os.environ,PROFILS='1440:light,telephone:dark',TOUR_FICHIER=f),capture_output=True,text=True,timeout=300)
    if r.returncode!=0: print('✓',nom,'— tombe')
    else: print('✗',nom,'— SURVIT'); surv.append(nom)
print('survivants :',surv)
