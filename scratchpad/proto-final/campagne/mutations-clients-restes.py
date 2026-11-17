#!/usr/bin/env python3
# Restes « clients », tour 1 (17 novembre 2026) — CONTRE-ÉPREUVES de clients-restes.js et clients-restes-creations.js : on remet, sur une COPIE de la page (jamais le fichier du dépôt),
# un défaut que les corrections ont réglé, et la sonde DOIT tomber sur le contrôle qui le garde. Une mutation qui ne fait tomber que des contrôles sans rapport avec elle
# (ou aucun) dit que la sonde ne regarde pas au bon endroit — ou que la mutation a frappé ailleurs : on le relit.
# Usage : python3 mutations-clients-restes.py [R1 R2 …]   (au premier plan, un navigateur à la fois)
import os, re, shutil, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(D, '..', '..', '..'))
PAGE = os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'); SONDES = os.path.join(D, 'sondes'); TMP = '/tmp/mut-clients-restes'
# nom : (titre, ancien, nouveau, sonde, profil, motif de la ligne qui doit tomber)
M = {
 'R1':  ('clientFinir ne pose plus le point de la carte', "c.tel = cfTelFmt(c.tel); cliPositionner(k, c.adr); }", "c.tel = cfTelFmt(c.tel); }", 'clients-restes-creations.js', 'mac', r'son point sur la carte est à Rochefort'),
 'R2':  ('la recherche ne normalise pas le numéro enregistré', "(cqt && cfTelChiffres(c.tel).includes(cqt))", "(cqt && String(c.tel || '').replace(/\\D/g, '').includes(cqt))", 'clients-restes.js', 'mac', r'recherche « \+33 5 46 11 22 44 »'),
 'R3':  ('vider e-mail ET téléphone est de nouveau permis', "if (!L.tel && !L.mail && (c.tel || c.mail)) return refus(", "if (false) return refus(", 'clients-restes.js', 'mac', r'clients-12 : vider e-mail ET téléphone'),
 'R4':  ('quitter Infos ne demande plus rien', "function clientInfosSale(){ if (route !== 'client'", "function clientInfosSale(){ if (true) return false; if (route !== 'client'", 'clients-restes.js', 'mac', r'clients-15 : une saisie non enregistrée'),
 'R5':  ('un client archivé reste dans la liste', "if (k === '__nv' || !!c.archive !== enArch) return false;", "if (k === '__nv') return false;", 'clients-restes.js', 'mac', r'le client archivé quitte la liste'),
 'R6':  ('renommer un particulier ne renomme plus son contact', "const contact = L.type === 'part' && L.contact === c.contact && c.contact === nomAvant && L.nom !== nomAvant ? L.nom : L.contact;", "const contact = L.contact;", 'clients-restes.js', 'mac', r'casse 2 : renommer un particulier renomme'),
 'R7':  ('renommer un client ne suit plus dans ses tâches', "if (c.nom !== nomAvant) TACHES.forEach(", "if (false) TACHES.forEach(", 'clients-restes.js', 'mac', r'casse 7'),
 'R8':  ('le doublon de nom ne replie plus les espaces', "const cfNomCle = n => sansAccent(String(n || '')).replace(/\\s+/g, ' ').trim();", "const cfNomCle = n => sansAccent(String(n || '')).trim();", 'clients-restes.js', 'mac', r'casse 6'),
 'R9':  ('Annuler ne retire plus le client né avec l’intervention', "if (s.NVCLI && CLIENTS[s.NVCLI]", "if (false && CLIENTS[s.NVCLI]", 'clients-restes.js', 'mac', r'casse 8'),
 'R10': ('un client créé avec une intervention peut se passer d’adresse', "const manque = !String(CREA.nv.adr || '').trim() ? 'adr' :", "const manque = false ? 'adr' :", 'clients-restes.js', 'mac', r'clients-04 : sans adresse'),
 'R11': ('deux rangements enfoncés pendant une recherche', "aria-pressed=\"${chercheClient.trim() && !enArch ? k==='tous' : rangClients===k}\"", "aria-pressed=\"${rangClients===k||(chercheClient&&k==='tous')}\"", 'clients-restes.js', 'mac', r'casse 5'),
 'R12': ('retirer un appareil ne le retire pas', "a = c && c.appareils[n]; if (!a) return; c.appareils.splice(n, 1);", "a = c && c.appareils[n]; if (!a) return;", 'clients-restes.js', 'mac', r'retirer le premier appareil'),
 'R13': ('« Le client seul » n’est plus proposé', "<button type=\"button\" class=\"btn gris\" data-action=\"clientSeul\">Le client seul</button>", "", 'clients-restes.js', 'mac', r'casse 4 : le panneau'),
 'R14': ('les suggestions d’adresse repassent à 42 px', ".adr-sug button{min-height:44px;", ".adr-sug button{min-height:42px;", 'clients-restes.js', 'iphone', r'casse 10'),
 'R15': ('un client archivé reste proposé pour un nouveau devis', "Object.entries(CLIENTS).filter(([k, c]) => k !== '__nv' && !c.archive)", "Object.entries(CLIENTS).filter(([k, c]) => k !== '__nv')", 'clients-restes.js', 'mac', r'il n’est plus proposé pour un nouveau devis'),
 'R16': ('« C’est un client » (courriel) ne place plus le client', "appareils:[] }); clientFinir(k);\n    journalAjout('marc', 'client', 'a créé le client', { t:'client', id:k, lib:m.de.nom", "appareils:[] });\n    journalAjout('marc', 'client', 'a créé le client', { t:'client', id:k, lib:m.de.nom", 'clients-restes-creations.js', 'mac', r'son point sur la carte est à Rochefort'),
 'R17': ('le client né dans l’atelier n’est plus placé', "appareils:[] });\n  clientFinir(id);\n", "appareils:[] });\n", 'clients-restes-creations.js', 'mac', r'avec son point sur la carte à Rochefort'),
 'R18': ('le refus de doublon ne normalise pas le numéro', "(t.length >= 6 && cfTelChiffres(c.tel) === t)", "(t.length >= 6 && String(c.tel || '').replace(/\\D/g, '') === t)", 'clients-restes.js', 'mac', r'le refus de doublon voit'),
 'R19': ('« +33 » s’enregistre tel quel', "const cfTelFmt = t => { t = String(t || '').trim(); const n = cfTelChiffres(t); return /^(\\+|00)?[\\d\\s.()-]+$/.test(t)", "const cfTelFmt = t => { t = String(t || '').trim(); const n = cfTelChiffres(t); return /^[\\d\\s.()-]+$/.test(t)", 'clients-restes.js', 'mac', r'« \+33 6 12 98 76 54 » s’enregistre'),
 'R21': ('« Confirmer le créneau » (courriel) ne place plus le client', "appareils:[] }); clientFinir(cl); }", "appareils:[] }); }", 'clients-restes-creations.js', 'mac', r'point à Aytré'),
 'R20': ('« Enregistrer » de la fenêtre de saisie ne mène pas à l’onglet demandé', "if (b.dataset.v === 'enreg' && !clientEnregistrer(param)) return fermerPanneau();", "if (b.dataset.v === 'enreg') clientEnregistrer(param);", 'clients-restes.js', 'mac', r'« Enregistrer » avec un champ refusé'),
}
def jouer(n):
    titre, a, b, sonde, profil, motif = M[n]
    if os.path.isdir(TMP): shutil.rmtree(TMP)
    os.makedirs(TMP + '/apercu')
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        if f != 'prototype-op-gestion.html': os.symlink(os.path.join(DEPOT, 'apercu', f), os.path.join(TMP, 'apercu', f))
    src = open(PAGE, encoding='utf-8').read()
    if src.count(a) != 1: return n, titre, 'MUTATION NON POSÉE (%d occurrence(s) du motif %r)' % (src.count(a), a[:60])
    open(TMP + '/apercu/prototype-op-gestion.html', 'w', encoding='utf-8').write(src.replace(a, b, 1))
    r = subprocess.run(['node', os.path.join(SONDES, sonde)], env=dict(os.environ, RACINE=TMP, PROFIL=profil, QUI='marc'), capture_output=True, text=True, timeout=560)
    L = r.stdout.split('\n'); tombes = [l.strip() for l in L if re.match(r'\s+✗', l)]; cible = [l for l in tombes if re.search(motif, l)]
    bilan = [l for l in L if re.match(r'== ', l)]
    return n, titre, ('TOMBE sur la ligne visée' if cible else ('tombe AILLEURS seulement' if tombes else 'NE TOMBE PAS')) + ' · ' + (bilan[-1] if bilan else '?') + ((' · ' + cible[0][:110]) if cible else '')
if __name__ == '__main__':
    ids = sys.argv[1:] or list(M)
    ok = 0
    for n in ids:
        res = jouer(n); print(' '.join(str(x) for x in res), flush=True)
        if 'TOMBE sur' in res[2]: ok += 1
    shutil.rmtree(TMP, ignore_errors=True)
    print('%d mutation(s) sur %d font tomber la ligne visée' % (ok, len(ids))); sys.exit(0 if ok == len(ids) else 1)
