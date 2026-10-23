#!/usr/bin/env python3
"""Mutations de la relecture adverse de la v772 (test-2875 §4 bis, test-2876, test-747). Chaque mutation s'applique sur une COPIE
(dossier temporaire : tests/ + app.html + beta.html fabriquée par beta-build.js), jamais sur le dépôt ; le motif doit se trouver
UNE fois (une mutation mal visée ne prouve rien), puis le banc visé doit tomber. Un témoin non muté ferme le tour."""
import os, shutil, subprocess, sys, re, tempfile
DEPOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC=os.path.join(tempfile.mkdtemp(prefix='mut-garde-cats-'),'copie')
os.makedirs(SC)
shutil.copytree(DEPOT+'/tests', SC+'/tests')
src=open(DEPOT+'/app.html',encoding='utf8').read()
def banc(nom):
    r=subprocess.run(['node','tests/'+nom],cwd=SC,capture_output=True,text=True,timeout=120)
    sortie=r.stdout+r.stderr
    m=re.findall(r'(\d+) ✓ +(\d+) ✗',sortie)
    return r.returncode, (m[-1] if m else None), [l.strip() for l in sortie.splitlines() if '✗' in l and 'test-' not in l][:4]
MUTS=[
 ('M1 go() : la carte jugée sur boxes entier (ancien défaut)', "const carte=(view==='carteBox'); if(carte) item=null;", "const carte=false;", ['test-2875.js']),
 ('M2 adresse : canSee(it) pour la carte (ancien défaut)', "if(it&&!(v==='carteBox'?(userSeesModule(currentUser,'boxes',false,true)&&!catBloque('carteBox')):canSee(it))) v='dashboard';", "if(it&&!canSee(it)) v='dashboard';", ['test-2875.js']),
 ('M3 go() : droits des box de la personne plus lus pour la carte', "(carte && !userSeesModule(currentUser,'boxes',false,true)) || ", "", ['test-2875.js']),
 ('M4 adresse : catBloque(carteBox) oublié', "(userSeesModule(currentUser,'boxes',false,true)&&!catBloque('carteBox'))", "(userSeesModule(currentUser,'boxes',false,true))", ['test-2875.js']),
 ('M5 adresse : droits des box de la personne oubliés', "(userSeesModule(currentUser,'boxes',false,true)&&!catBloque('carteBox'))", "(!catBloque('carteBox'))", ['test-2875.js']),
 ('M6 go() : parCat jamais vrai (mauvais message)', "const parCat=catBloque(view);", "const parCat=false;", ['test-2875.js']),
 ('M7 test-747 : instruction entre { et view=', "|| parCat){ view='dashboard';", "|| parCat){ const x=1; view='dashboard';", ['test-747.js']),
 ('M8 menuLigne : la valeur propre de validations n\'est plus lue (ouverture d\'office affichée, donc écrite)', "if(m.k==='validations'&&!planBloque(m.k)&&!metierBloque(m.k)){ const r=moduleReglage(u,'validations'); on=r?r.v:false; }", "", ['test-2876.js']),
 ('M9 menuLigne : valeur propre lue mais ouverte en dur', "on=r?r.v:false; }\n      return ligne(nom", "on=true; }\n      return ligne(nom", ['test-2876.js']),
 ('M10 menuLigne : la branche ne passe plus par moduleReglage (rôle ignoré)', "const r=moduleReglage(u,'validations'); on=r?r.v:false; }\n      return ligne(nom", "const r=null; on=r?r.v:false; }\n      return ligne(nom", ['test-2876.js']),
]
bad=0
for nom,a,b,bancs in MUTS:
    n=src.count(a)
    if n!=1:
        print('!! %s : motif trouvé %d fois'%(nom,n)); bad+=1; continue
    open(SC+'/app.html','w',encoding='utf8').write(src.replace(a,b))
    # beta = app + préfixes : pour les bancs qui lisent aussi beta.html, on la fabrique
    subprocess.run(['node',DEPOT+'/beta-build.js'],cwd=SC,capture_output=True)
    for bn in bancs:
        env=dict(os.environ)
        rc,tot,lignes=banc(bn)
        print(('MORD   ' if rc!=0 else 'NE MORD PAS ')+nom+' → '+bn+' '+str(tot)+' '+str(lignes[:2]))
        if rc==0: bad+=1
# témoin : copie non mutée
open(SC+'/app.html','w',encoding='utf8').write(src); subprocess.run(['node',DEPOT+'/beta-build.js'],cwd=SC,capture_output=True)
for bn in ['test-2875.js','test-2876.js','test-747.js']:
    rc,tot,_=banc(bn); print('TÉMOIN '+bn+' rc=%d %s'%(rc,tot))
sys.exit(1 if bad else 0)
