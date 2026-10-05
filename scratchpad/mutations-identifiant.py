# Mutations de l'identifiant « Prénom#1234 » et des demandes de contact : chacune remet un défaut, test-996 doit tomber (14/14 le 5 octobre 2026).
# Lancer depuis la racine d'un arbre COMMITÉ (git checkout restaure chaque fichier) : python3 scratchpad/mutations-identifiant.py
import subprocess, sys
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/'
M=[
 ('M01 identifiant : un compte caché est trouvé','server-msg/telephone.js',"const visible = !!p && p.etat === 'actif' && p.suppression_le === null && p.id !== uid && p.trouvable === 'tous' && !bloque;\n    let rep = { trouve: false };\n    if (visible) {\n      noterTrouve(uid, p.id);\n      const deja","const visible = !!p && p.etat === 'actif' && p.suppression_le === null && p.id !== uid && !bloque;\n    let rep = { trouve: false };\n    if (visible) {\n      noterTrouve(uid, p.id);\n      const deja"),
 ('M02 identifiant : qui m\'a bloqué me trouve','server-msg/telephone.js',"p.trouvable === 'tous' && !bloque;\n    let rep = { trouve: false };\n    if (visible) {\n      noterTrouve(uid, p.id);\n      const deja","p.trouvable === 'tous';\n    let rep = { trouve: false };\n    if (visible) {\n      noterTrouve(uid, p.id);\n      const deja"),
 ('M03 identifiant : plus de latence plancher','server-msg/telephone.js',"      rep = { trouve: true, id: p.id, prenom: p.prenom, identifiant: stockage.identDe(p.id), deja_contact: deja, demande: deja ? 'aucune' : relation(uid, p.id) };\n    }\n    const reste = cfg.rechercheLatenceMs - (Date.now() - t0);\n    if (reste > 0) await dort(reste);","      rep = { trouve: true, id: p.id, prenom: p.prenom, identifiant: stockage.identDe(p.id), deja_contact: deja, demande: deja ? 'aucune' : relation(uid, p.id) };\n    }\n    const reste = 0;"),
 ('M04 identifiant : la recherche n\'est pas comptée (plafond non partagé)','server-msg/telephone.js',"    stockage.rechercheNoter(uid);\n\n    const p = stockage.personneParIdent(","    \n\n    const p = stockage.personneParIdent("),
 ('M05 demander sans avoir trouvé','server-msg/telephone.js',"    const fin = trouves.get(uid + '|' + id);\n    const p = fin && fin > horloge() ? stockage.personneParId(id) : null;\n    const t = p ? stockage.telTrouvableLire(id) : null;\n    if (!p || p.etat !== 'actif' || t !== 'tous' || stockage.contactBloque(uid, id) || stockage.suppressionLe(id) !== null) { rendre([q.cle]); return refus(res, 404, 'introuvable'); }\n    trouves.delete(uid + '|' + id);\n    const r = stockage.demandeCreer","    const p = stockage.personneParId(id);\n    const t = p ? stockage.telTrouvableLire(id) : null;\n    if (!p || p.etat !== 'actif' || t !== 'tous' || stockage.contactBloque(uid, id) || stockage.suppressionLe(id) !== null) { rendre([q.cle]); return refus(res, 404, 'introuvable'); }\n    const r = stockage.demandeCreer"),
 ('M06 ajout direct au lieu d\'une demande','server-msg/stockage.js',"      Q('INSERT INTO demande_contact(de, vers, etat, masque, ts) VALUES(?, ?, ?, 0, ?)').run(de, vers, 'attente', horloge());\n      return 'envoyee';","      Q('INSERT INTO demande_contact(de, vers, etat, masque, ts) VALUES(?, ?, ?, 0, ?)').run(de, vers, 'attente', horloge());\n      contactLier(de, vers);\n      return 'envoyee';"),
 ('M07 un refus efface la demande (relance possible)','server-msg/stockage.js',"      Q(`UPDATE demande_contact SET etat = 'refusee' WHERE de = ? AND vers = ?`).run(de, uid);","      Q('DELETE FROM demande_contact WHERE de = ? AND vers = ?').run(de, uid);"),
 ('M08 l\'effacement garde les demandes','server-msg/stockage.js',"      if (IDENT) Q('DELETE FROM demande_contact WHERE de = ? OR vers = ?').run(uid, uid);\n",""),
 ('M09 l\'identifiant ne suit plus le prénom','server-msg/stockage.js',"      if (n.prenom !== cur.prenom) identAttribuer(id);","      "),
 ('M10 les comptes d\'avant n\'ont pas d\'identifiant','server-msg/stockage.js',"  if (IDENT) identCompleter();","  "),
 ('M11 pas de notification de demande','server-msg/telephone.js',"    if (r === 'envoyee') prevenir(id, 'contact_demande',","    if (r === 'jamais') prevenir(id, 'contact_demande',"),
 ('M12 un nom seul est accepté (retrouvé par la base du prénom)','server-msg/stockage.js',"  const m = /^(.*)#\\s*(\\d{4,5})$/.exec(texte.trim());\n  if (!m) return null;","  const m = /^(.*)#\\s*(\\d{4,5})$/.exec(texte.trim()) || [null, texte, '1000'];"),
 ('M13 deux Karim peuvent avoir le même numéro (libre ignoré)','server-msg/stockage.js',"for (let i = 0; n === null && i < 40; i++) { const c = crypto.randomInt(1000, 10000); if (libre(c)) n = c; }","for (let i = 0; n === null && i < 40; i++) { const c = crypto.randomInt(1000, 10000); n = c; }"),
 ('M14 l\'effacement garde l\'identifiant','server-msg/stockage.js',"      if (IDENT) Q('UPDATE personne SET ident_base = NULL, ident_num = NULL WHERE id = ?').run(uid);",""),
]
mord=0
for nom,f,a,b in M:
    src=open(R+f,encoding='utf-8').read()
    if src.count(a)!=1: print('MAL VISÉE',nom,src.count(a)); continue
    open(R+f,'w',encoding='utf-8').write(src.replace(a,b))
    try:
        p=subprocess.run(['node','tests/test-996.js'],cwd=R,capture_output=True,text=True,timeout=240)
        out=p.stdout; code=p.returncode
    except subprocess.TimeoutExpired: out='TIMEOUT'; code=-1
    subprocess.run(['git','checkout',f],cwd=R,capture_output=True)
    ko=[l for l in out.split('\n') if l.strip().startswith('✗')]
    print(('MORD ' if code!=0 else 'SURVIT ')+nom+' : '+(ko[0].strip()[:150] if ko else out[-200:].strip()))
    if code!=0: mord+=1
d=subprocess.run(['git','diff','--stat'],cwd=R,capture_output=True,text=True).stdout
print(mord,'/',len(M),'mordent ; git diff après :',repr(d))
