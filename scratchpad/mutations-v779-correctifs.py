# Mutations de tests/test-3170.js : chaque défaut remis dans app.html doit faire tomber le banc ; app.html est restauré à la fin (COMMITER AVANT, puis `git checkout app.html`).
import subprocess,sys,os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=R+'/app.html'
orig=open(P,encoding='utf8').read()
M=[
("retrait non appelé","    metierResiduRetirer(rs);\n","    \n"),
("refus ignoré","{ try{ views.parametres(); }catch(e){} return; }\n    metierResiduRetirer(rs);","{ }\n    metierResiduRetirer(rs);"),
("garde bêta retirée","if(typeof BETA_ESSAI==='undefined'||!BETA_ESSAI||typeof db==='undefined') return null;","if(typeof db==='undefined') return null;"),
("perso emporté","produits:(db.produits||[]).filter(p=>p&&ids.has(p.id)&&!p.perso).length","produits:(db.produits||[]).filter(p=>p&&ids.has(p.id)).length"),
("perso emporté au retrait","db.produits=(db.produits||[]).filter(p=>!(p&&r.ids.has(p.id)&&!p.perso));","db.produits=(db.produits||[]).filter(p=>!(p&&r.ids.has(p.id)));"),
("fournisseurs gardés","  db.fournisseurs=(db.fournisseurs||[]).filter(f=>!(f&&r.noms.has(String(f.nom||'').trim().toUpperCase())));\n","\n"),
("journée d'essai emportée","const dm=x=>!!(x&&x.demo&&x.demo!=='compta');\n  try{ syncRetraitVoulu","const dm=x=>!!(x&&x.demo);\n  try{ syncRetraitVoulu"),
("montant retiré","...(estMetier3D()?{}:{ montant:p[8]||DEMO_MONTANTS[k%DEMO_MONTANTS.length] }),","..."+"({}),"),
("montant aussi en 3D","...(estMetier3D()?{}:{ montant:p[8]||DEMO_MONTANTS[k%DEMO_MONTANTS.length] }),","...({ montant:p[8]||DEMO_MONTANTS[k%DEMO_MONTANTS.length] }),"),
("tva restaurant 10","Recharge en fluide R32',72,'pièce',1],['Main-d’œuvre',58,'h',1]]","Recharge en fluide R32',72,'pièce',1],['Main-d’œuvre',58,'h',1]]"),  # traité à part
("droit de collection","const _grp=(coll==='docsMetier'&&typeof docmDef==='function')?","const _grp=(false&&typeof docmDef==='function')?"),
("réseau = ancien","}).catch(()=>{ _devisMetierReseau=true; return false; });","}).catch(()=>{ return false; });"),
("panne retenue","}).catch(()=>{ _devisMetierReseau=true; return false; });","}).catch(()=>{ _devisMetierReseau=true; _devisMetierOk=false; return false; });"),
("502 = ancien","if(r.ok===false) throw new Error('etat '+r.status); return r.json();","return r.json();"),
("toast nom muet","(entrepriseNom()?'':' · Renseigne le nom de ton entreprise (Paramètres) pour les PDF')","''"),
("catch du modal muet","if(el&&!el.textContent){ el.textContent='⚠ Le serveur ne répond pas","if(false){ el.textContent='⚠ Le serveur ne répond pas"),
]
for nom,a,b in M:
    s=orig
    if nom=="tva restaurant 10":
        i=s.index("ajoute('note-depannage',c1,{interventionId:iid(c1)},{execLe:todayISO(),tva:'20'")
        s=s[:i]+s[i:].replace("tva:'20'","tva:'10'",1)
    else:
        if s.count(a)!=1: print("ANCRE",nom,s.count(a)); continue
        s=s.replace(a,b)
    open(P,'w',encoding='utf8').write(s)
    r=subprocess.run(['node','tests/test-3170.js'],cwd=R,capture_output=True,text=True,timeout=120)
    last=[l for l in r.stdout.splitlines() if '════' in l][-1:] or [r.stderr[-150:]]
    print(('MORD ' if r.returncode else 'NE MORD PAS '),nom,last)
open(P,'w',encoding='utf8').write(orig)
