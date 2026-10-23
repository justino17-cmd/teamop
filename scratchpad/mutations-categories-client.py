#!/usr/bin/env python3
"""Mutations de test-2875 (catégories par client, côté application).
Chaque mutation s'applique sur une COPIE (dossier temporaire : tests/test-2875.js + app.html + beta.html), jamais sur le dépôt.
On vérifie d'abord que la mutation a changé le fichier (une mutation mal visée ne prouve rien), puis que le banc tombe."""
import os, re, shutil, subprocess, sys, tempfile

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = open(os.path.join(RACINE, 'app.html'), encoding='utf8').read()
BETA = open(os.path.join(RACINE, 'beta.html'), encoding='utf8').read()

MUTATIONS = [
    ('M1 catBloque sans la garde BETA_ESSAI', 'function catBloque(k){\n  if(BETA_ESSAI) return false;\n', 'function catBloque(k){\n'),
    ('M2 userSeesModule : catBloque APRES le test admin', "if(!horsCats&&catBloque(k)) return false; if(u.role==='admin') return true;", "if(u.role==='admin') return true; if(!horsCats&&catBloque(k)) return false;"),
    ('M3 cats:null ne retire plus le réglage', 'if(c===null) nv=null;', 'if(c===null) return false;'),
    ('M4 une clé cats absente efface le réglage', "if(!j||typeof j!=='object'||!Object.prototype.hasOwnProperty.call(j,'cats')) return false;", "if(!j||typeof j!=='object') return false; if(!Object.prototype.hasOwnProperty.call(j,'cats')) j={cats:null};"),
    ('M5 une liste illisible ferme tout', "if(c.length&&!nv.length&&!c.some(x=>typeof x==='string'&&CATS_TOUJOURS.indexOf(x)>=0)) return false;", ''),
    ('M6 la sous-catégorie ne suit plus son parent', "const p=(VUE_PARENT&&VUE_PARENT[k])||k;", "const p=k;"),
    ('M7 le tableau de bord peut être fermé (les DEUX gardes retirées : la seconde, catsConnues, couvre la première)', "if(CATS_TOUJOURS.indexOf(p)>=0||CATS_TOUJOURS.indexOf(k)>=0) return false;\n    if(catsConnues().indexOf(p)<0) return false;", ""),
    ('M8 go() ne regarde plus catBloque', " || catBloque(view)){ const parCat", "){ const parCat"),
    ('M9 espaceQuitter laisse la clé', "    try{ localStorage.removeItem(P+'cats'); }catch(_){}\n", ''),
    ('M10 espaceQuitter laisse la mémoire de séance', "    try{ _cats=undefined; }catch(_){}\n", ''),
    ('M11 le réglage s\'écrit dans db', "  _cats=nv;\n  try{", "  _cats=nv; db.cats=nv; save();\n  try{"),
    ('M12 le préfixe est écrit en dur', "function catsCle(){ return STORE_KEY.split('_')[0]+'_cats'; }", "function catsCle(){ return 'elan_cats'; }"),
    ('M13 catsServeurAppliquer appelée APRÈS le test de formule', "    try{ catsServeurAppliquer(j); }catch(e){}\n", ''),
    ('M14 notifVoitModule : l\'admin voit une rubrique retirée', "if(currentUser.role==='admin') return !catBloque(k);", "if(currentUser.role==='admin') return true;"),
    ('M15 la même liste redessine encore', "if(JSON.stringify(av?av.slice().sort():null)===JSON.stringify(nv)) return false;", ""),
    ('M16 un rangement illisible ferme tout', "if(Array.isArray(a)) v=a.filter(x=>typeof x==='string'); }catch(e){}", "if(Array.isArray(a)) v=a.filter(x=>typeof x==='string'); }catch(e){ v=[]; }"),
]

def jouer(app, beta):
    d = tempfile.mkdtemp(prefix='mutc-')
    os.makedirs(os.path.join(d, 'tests'))
    shutil.copy(os.path.join(RACINE, 'tests', 'test-2875.js'), os.path.join(d, 'tests'))
    open(os.path.join(d, 'app.html'), 'w', encoding='utf8').write(app)
    open(os.path.join(d, 'beta.html'), 'w', encoding='utf8').write(beta)
    r = subprocess.run(['node', os.path.join(d, 'tests', 'test-2875.js')], capture_output=True, text=True, timeout=120)
    shutil.rmtree(d, ignore_errors=True)
    m = re.findall(r'(\d+) ✓\s+(\d+) ✗', r.stdout)
    return r.returncode, (m[-1] if m else None), r.stdout

# témoin : sans mutation, le banc doit passer
rc, tot, _ = jouer(APP, BETA)
print('témoin (aucune mutation) : rc=%s %s' % (rc, tot))
if rc != 0:
    sys.exit('le témoin tombe déjà : rien à conclure')
mal = 0
for nom, a, b in MUTATIONS:
    if APP.count(a) != 1 or BETA.count(a) != 1:
        print('%-60s MAL VISÉE (%d / %d occurrences)' % (nom, APP.count(a), BETA.count(a))); mal += 1; continue
    rc, tot, sortie = jouer(APP.replace(a, b), BETA.replace(a, b))
    tombes = [l.strip() for l in sortie.splitlines() if '✗' in l and 'attendu' not in l][:2]
    print('%-60s %s  rc=%s  %s' % (nom, 'MORD' if rc else 'NE MORD PAS', rc, tot))
    for t in tombes: print('      ' + t[:150])
sys.exit(1 if mal else 0)
