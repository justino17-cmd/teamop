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
 ('M7', 'mutation', "dvnCreer ne pose plus le point de la carte (clients-05 corrigé)", [("{ const g = geoDeAdresse(f.adr); if (g) CR_GEO[cli] = g; }   /* comme pour le client créé avec une intervention", "{ }   /* comme pour le client créé avec une intervention")], 'clients-creer.js', r'il a lui aussi sa position', 'tombe'),
 ('M8', 'mutation', "clientEnreg ne recalcule plus le point ni le secteur (clients-07 corrigé)", [("if (c.adr !== adrAvant) { const kk", "if (false) { const kk")], 'clients-modifier.js', r'clients-07', 'tombe'),
 ('M9', 'mutation', "la recherche redevient une phrase d'un seul tenant (clients-01 corrigé)", [("return mots.every(m => botte.includes(m)) ||", "return botte.includes(cq) ||")], 'clients-liste.js', r'recherche « hôtel plage »', 'tombe'),
 ('M10', 'mutation', "la recherche par téléphone ne reconnaît plus les points ni +33 (clients-18 corrigé)", [("let cqt = /^[\\d\\s.+()]+$/.test(cq) ? cq.replace(/\\D/g, '') : '';", "let cqt = /^[\\d ]+$/.test(cq) ? cq.replace(/\\s/g, '') : '';")], 'clients-liste.js', r'clients-18 : recherche « 06.55.44.33.22 »', 'tombe'),
 ('M11', 'mutation', "le message « aucun résultat » ne dit plus quoi faire (clients-02 corrigé)", [(" Vérifie l’orthographe, ou touche « ＋ Nouveau client » pour l’ajouter.", "")], 'clients-liste.js', r'clients-02 : … et il dit comment', 'tombe'),
 ('M12', 'mutation', "la feuille de l'en-tête de « Par mois » est retirée : la phrase se recoince à côté du bouton (clients-03 corrigé)", [("html #contenu .tete.cl-tete{flex-wrap:wrap", "html #contenu .tete.cl-tete-off{flex-wrap:wrap"), ("html .cl-tete>div:first-child{flex:1 1 100%}", "html .cl-tete-off>div:first-child{flex:1 1 100%}")], 'clients-corriges.js', r'clients-03', 'tombe'),
 ('M13', 'mutation', "le nom du client ne se modifie plus (clients-06 corrigé)", [("Object.assign(c, { nom:v('nom'), contact:", "Object.assign(c, { contact:")], 'clients-corriges.js', r'le nouveau nom est enregistré|l’en-tête de la fiche porte le nouveau nom', 'tombe'),
 ('M14', 'mutation', "« N passages » revient à côté de chaque appareil (clients-10 corrigé)", [("</span></div>`).join('');   /* le chiffre était celui du CLIENT", "</span><span class=\"gris petit\">${INTS.filter(i => i.cli === k && i.st !== 'annulee').length} passages</span></div>`).join('');   /* le chiffre était celui du CLIENT")], 'clients-corriges.js', r'aucun « N passages »', 'tombe'),
 ('M15', 'mutation', "Infos : contact et e-mail redeviennent deux colonnes étroites sur téléphone (clients-13 corrigé)", [("  .deux-champs.ci-champs{grid-template-columns:minmax(0,1fr)} }", " }")], 'clients-corriges.js', r'contact et e-mail de l’Hôtel se lisent en entier', 'tombe'),
 ('M16', 'mutation', "les suggestions d'adresse ne regardent plus que le dernier mot (clients-16 corrigé)", [("return q.every(m => A.includes(m)) && sansAccent(a) !== sansAccent(CREA.nv.adr).trim();", "return A.includes(q[q.length - 1] || '');")], 'clients-corriges.js', r'clients-16', 'tombe'),
 ('M17', 'mutation', "« ‹ Contrats » revient dans le formulaire de contrat (clients-09 corrigé)", [("<button type=\"button\" class=\"lien retour\" data-retour=\"1\">‹ Retour</button><div class=\"tete\"><div><span class=\"surtitre\">Nouveau contrat</span>", "<button type=\"button\" class=\"lien retour\" data-go=\"contrats\">‹ Contrats</button><div class=\"tete\"><div><span class=\"surtitre\">Nouveau contrat</span>")], 'clients-gestes.js', r'clients-09', 'tombe'),
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
