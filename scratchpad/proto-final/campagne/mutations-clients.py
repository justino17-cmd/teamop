#!/usr/bin/env python3
# Campagne « clients » (17 novembre 2026) — CONTRE-ÉPREUVES. Deux sens, sur une COPIE de la page (jamais le fichier du dépôt) :
#  · « mutation » : on casse un comportement juste → la sonde DOIT tomber (sinon elle ne regarde pas au bon endroit) ;
#  · « correctif » : on applique le correctif recommandé dans clients.json → le contrôle du défaut DOIT passer (sinon la sonde accuse à tort).
# Usage : python3 mutations-clients.py [numéros…]   (une copie par essai dans /tmp/mut-clients, servie par lib.js via RACINE)
import os, re, shutil, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(D, '..', '..', '..'))
PAGE = os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'); SONDES = os.path.join(D, 'sondes')
TMP = '/tmp/mut-clients'
E = [
 ('M1', 'mutation', "clientEnreg : le contrôle du téléphone retiré", [("if (!cfTelOk(v('tel'))) return toast('Le numéro de téléphone est à vérifier : des chiffres, avec éventuellement des espaces ou un +.');", "")], 'clients-modifier.js', r'téléphone « abc » refusé', 'tombe'),
 ('M2', 'mutation', "dvnCreer : « téléphone ou e-mail » n'est plus exigé", [("else if (f.nv && !f.tel && !f.mail) f.err = 'Indique un téléphone ou un e-mail, pour pouvoir lui envoyer le devis.';", "")], 'clients-creer.js', r'devis sans téléphone ni e-mail', 'tombe'),
 ('M3', 'mutation', "carte de la liste : le « payé » affiche 1 € de trop", [("<span><b>${eur(paye)}</b><small>payé</small></span>", "<span><b>${eur(paye + 1)}</b><small>payé</small></span>")], 'clients-liste.js', r'chaque carte affiche le payé', 'tombe'),
 ('M4', 'mutation', "« Par mois » : le reste à payer n'est plus compté", [("else if (f.st !== 'avoir') x.apayer += restant(f);", "else if (f.st !== 'avoir') x.apayer += 0;")], 'clients-liste.js', r'« payé » \+ « à payer » égale', 'tombe'),
 ('M5', 'mutation', "cCreer : le point de la carte du client créé n'est plus posé", [("const g = geoDeAdresse(CLIENTS[k].adr); if (g) CR_GEO[k] = g; }", "}")], 'clients-creer.js', r'il a sa position sur la carte des tournées', 'tombe'),
 ('S1', 'correctif', "dvnCreer pose le point de la carte (clients-05)", [("if (r) SECT_CLI[cli] = r.secteur;", "if (r) SECT_CLI[cli] = r.secteur; { const g = geoDeAdresse(f.adr); if (g) CR_GEO[cli] = g; }")], 'clients-creer.js', r'il a lui aussi sa position', 'passe'),
 ('S2', 'correctif', "clientEnreg recalcule le point et le secteur (clients-07)", [("Object.assign(c, { contact:v('contact'), tel:cfTelFmt(v('tel')), mail:v('mail'), type:v('type') === 'part' ? 'part' : 'pro', adr:v('adr'), acces:v('acces') });", "Object.assign(c, { contact:v('contact'), tel:cfTelFmt(v('tel')), mail:v('mail'), type:v('type') === 'part' ? 'part' : 'pro', adr:v('adr'), acces:v('acces') }); { const g = geoDeAdresse(c.adr); if (g) CR_GEO[b.dataset.cli] = g; else delete CR_GEO[b.dataset.cli]; const r = reconnaitre(c.adr); if (r) SECT_CLI[b.dataset.cli] = r.secteur; }")], 'clients-modifier.js', r'clients-07', 'passe'),
 ('M6', 'mutation', "« Enregistrer » la fiche client dépend de « créer un client » (l'erreur trouvée puis corrigée par un autre lot, droits-01)", [(" clientEnreg@crm", ""), ("clientNouveau@crm", "clientNouveau@crm clientEnreg@crm")], 'clients-roles.js', r'l’onglet Infos est modifiable', 'tombe'),
 ('S4', 'correctif', "la recherche cherche chaque mot (clients-01)", [("(!cq || sansAccent([c.nom, c.contact, c.adr, c.mail, CONTRATS.some(x => x.cli === k && x.st === 'signe') ? 'contrat' : ''].join(' ')).includes(cq)", "(!cq || cq.split(' ').filter(Boolean).every(m => sansAccent([c.nom, c.contact, c.adr, c.mail, CONTRATS.some(x => x.cli === k && x.st === 'signe') ? 'contrat' : ''].join(' ')).includes(m))")], 'clients-liste.js', r'recherche « hôtel plage »', 'passe'),
]
def jouer(n):
    t = [e for e in E if e[0] == n][0]; _, genre, titre, remps, sonde, motif, attendu = t
    if os.path.isdir(TMP): shutil.rmtree(TMP)
    os.makedirs(TMP + '/apercu')
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        s = os.path.join(DEPOT, 'apercu', f)
        if f != 'prototype-op-gestion.html': os.symlink(s, os.path.join(TMP, 'apercu', f))
    src = open(PAGE, encoding='utf-8').read(); neuf = src
    for (a, b) in remps:
        if neuf.count(a) < 1: return n, titre, 'MUTATION NON POSÉE (motif absent : %r)' % a[:60]
        neuf = neuf.replace(a, b, 1)
    open(TMP + '/apercu/prototype-op-gestion.html', 'w', encoding='utf-8').write(neuf)
    r = subprocess.run(['node', os.path.join(SONDES, sonde)], env=dict(os.environ, RACINE=TMP, PROFIL=os.environ.get('PROFIL', 'mac'), QUI='marc'), capture_output=True, text=True, timeout=560)
    sortie = r.stdout; ligne = [l for l in sortie.split('\n') if re.search(motif, l)]
    tombe = any(l.strip().startswith('✗') for l in ligne) or any(l.startswith(' ✗') and re.search(motif, l) for l in sortie.split('\n'))
    passe = any(l.strip().startswith('✓') for l in ligne)
    bilan = re.findall(r'== (\d+ ✓ · \d+ ✗)', sortie)
    ok = (attendu == 'tombe' and tombe) or (attendu == 'passe' and passe and not tombe)
    return n, titre, ('OK' if ok else 'RATÉ') + ' · attendu : ' + attendu + ' · vu : ' + ('tombe' if tombe else 'passe' if passe else 'introuvable') + ' · ' + (bilan[-1] if bilan else '?')
if __name__ == '__main__':
    ids = sys.argv[1:] or [e[0] for e in E]
    for n in ids:
        n_, titre, res = jouer(n); print('%s [%s] %s → %s' % (n_, [e for e in E if e[0] == n][0][1], titre, res), flush=True)
