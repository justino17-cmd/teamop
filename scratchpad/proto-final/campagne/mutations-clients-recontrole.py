#!/usr/bin/env python3
# Recontrôle ADVERSE « clients » (17 novembre 2026) — CONTRE-ÉPREUVES de MES sondes (clients-recontrole-*.js) : on remet un défaut que la correction a réglé,
# sur une COPIE de la page (jamais le fichier du dépôt), et ma sonde DOIT tomber sur le contrôle qui le garde. Sinon elle ne regarde pas au bon endroit.
# On réutilise les remplacements de mutations-clients.py (mêmes défauts, mêmes motifs de texte) mais on joue MES sondes.
# Usage : python3 mutations-clients-recontrole.py [M9 M10 …]
import importlib.util, os, re, shutil, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('mc', os.path.join(D, 'mutations-clients.py')); mc = importlib.util.module_from_spec(spec); spec.loader.exec_module(mc)
BASE = {e[0]: e for e in mc.E}
# numéro de mutation → (ma sonde, profil, motif de la ligne qui doit tomber)
A = {
 'M9':  ('clients-recontrole-liste.js', 'mac', r'recherche « hôtel plage »'),
 'M10': ('clients-recontrole-liste.js', 'mac', r'recherche « 06\.55\.44\.33\.22 »'),
 'M11': ('clients-recontrole-liste.js', 'mac', r'« aucun résultat » \(260 signes sans espace\) : il dit quoi faire'),
 'M12': ('clients-recontrole-liste.js', 'iphone', r'« Par mois » : la phrase d’aide prend la largeur'),
 'M7':  ('clients-recontrole-creations.js', 'mac', r'création « avec un devis rapide »'),
 'M5':  ('clients-recontrole-creations.js', 'mac', r'création « avec une intervention »'),
 'M8':  ('clients-recontrole-fiche.js', 'mac', r'adresse → Rochefort'),
 'M13': ('clients-recontrole-fiche.js', 'mac', r'renommer un particulier : l’en-tête porte le nouveau nom'),
 'M14': ('clients-recontrole-petits.js', 'mac', r'clients-10 \[vp\]'),
 'M15': ('clients-recontrole-petits.js', 'iphone', r'clients-13 : sur téléphone, chaque champ'),
 'M16': ('clients-recontrole-petits.js', 'mac', r'clients-16 : « gravière salles »|clients-16 : « rue de la gare »'),
 'M17': ('clients-recontrole-parcours.js', 'mac', r'P1 : « ‹ Retour » ramène à la fiche'),
}
TMP = '/tmp/mut-clients-rc'
def jouer(n):
    _, _, titre, remps, _, _, _ = BASE[n]; sonde, profil, motif = A[n]
    if os.path.isdir(TMP): shutil.rmtree(TMP)
    os.makedirs(TMP + '/apercu')
    for f in os.listdir(os.path.join(mc.DEPOT, 'apercu')):
        s = os.path.join(mc.DEPOT, 'apercu', f)
        if f != 'prototype-op-gestion.html': os.symlink(s, os.path.join(TMP, 'apercu', f))
    neuf = open(mc.PAGE, encoding='utf-8').read(); src = neuf
    for (a, b) in remps:
        if neuf.count(a) < 1: return n, titre, 'MUTATION NON POSÉE (motif absent : %r)' % a[:60]
        neuf = neuf.replace(a, b, 1)
    assert neuf != src
    open(TMP + '/apercu/prototype-op-gestion.html', 'w', encoding='utf-8').write(neuf)
    r = subprocess.run(['node', os.path.join(mc.SONDES, sonde)], env=dict(os.environ, RACINE=TMP, PROFIL=profil, QUI='marc'), capture_output=True, text=True, timeout=560)
    L = r.stdout.split('\n'); ligne = [l for l in L if re.search(motif, l)]
    tombe = any(l.strip().startswith('✗') for l in ligne); passe = any(l.strip().startswith('✓') for l in ligne)
    bilan = re.findall(r'== (\d+ ✓ · \d+ ✗)', r.stdout)
    return n, titre, ('OK' if tombe else 'RATÉ') + ' · ' + sonde + '/' + profil + ' · vu : ' + ('tombe' if tombe else 'passe' if passe else 'introuvable') + ' · ' + (bilan[-1] if bilan else '?')
if __name__ == '__main__':
    for n in (sys.argv[1:] or list(A)):
        n_, t, res = jouer(n); print('%s %s → %s' % (n_, t, res), flush=True)
