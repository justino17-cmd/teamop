#!/usr/bin/env python3
# Contre-épreuve du RECONTRÔLE ADVERSE des restes de CLIENTS, tour 4 (19 novembre 2026). On JOUE les sondes sur des COPIES de la page (RACINE=…), jamais sur la page du dépôt.
#   « tombe » : le défaut remis fait tomber le contrôle visé ;  « passe » : le correctif proposé le fait passer (le contrôle n'accuse pas à tort).
# Chaque mutation REMET UN DÉFAUT (une garde retirée) : le contrôle visé de clients-restes4-adverse.js doit tomber (la page intacte est à 0 ✗ : mesuré avant d'écrire ces mutations).
# Usage : python3 mutations-clients-restes4.py <numéro>   (une mutation à la fois, un navigateur à la fois)
import os, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(DEPOT, 'apercu'); SD = os.path.join(DEPOT, 'scratchpad/proto-final/campagne/sondes')
S4 = 'clients-restes4-adverse.js'
G = 'prototype-op-gestion.html'; C = 'prototype-comptabilite.html'
M = {
 1: ('A1', [(G, "</button></p>` : L.length && nActTrouves ?", "</button></p>` : false && L.length && nActTrouves ?")], {'SEUL': 'A'}),
 2: ('B1', [(G, "(peut('crm', 's') ? 'restaure-le depuis « Clients »' : 'demande à un responsable de le restaurer')", "'restaure-le depuis « Clients »'")], {'SEUL': 'B', 'QUI': 'julie', 'PROFIL': 'iphone'}),
 3: ('C', [(G, "new RegExp('(^|[^a-z0-9])' + m + 's?([^a-z0-9]|$)').test(s)", "s.includes(m)")], {'SEUL': 'C'}),
 4: ('D1', [(G, "[data-menu],[data-cnx=\"sortir\"]'); if", "[data-menu]'); if")], {'SEUL': 'D'}),
 5: ('D6', [(G, "fn:() => { if (!cliInfosRetenir(() => sessionFermer())) sessionFermer(); } }", "fn:() => sessionFermer() }")], {'SEUL': 'D'}),
 6: ('E2', [(C, "if (f.t !== t) { f.t = t; n++; }", "if (false) { f.t = t; n++; }")], {'SEUL': 'E'}),
 7: ('E2', [(C, "if (f.t !== t) { f.t = t; n++; }", "if (f.t !== t) { f.t = t; }")], {'SEUL': 'E'}),
}
n = int(sys.argv[1]); ctl, reps, env = M[n]; sonde, att = S4, 'tombe'
rac = '/tmp/mut-clients-restes4-%d' % n
shutil.rmtree(rac, ignore_errors=True); os.makedirs(rac); shutil.copytree(SRC, os.path.join(rac, 'apercu'))
for page, a, b in reps:
    f = os.path.join(rac, 'apercu', page); s = open(f, encoding='utf-8').read()
    if s.count(a) != 1: sys.exit('MUTATION %d : le motif est trouvé %d fois (1 attendu) : %s' % (n, s.count(a), a[:70]))
    open(f, 'w', encoding='utf-8').write(s.replace(a, b))
e = dict(os.environ, RACINE=rac, PROFIL=env.get('PROFIL', 'mac'), QUI='marc'); e.update({k: v for k, v in env.items() if k != 'PROFIL'})
r = subprocess.run(['node', os.path.join(SD, sonde)], env=e, capture_output=True, text=True, timeout=500)
sortie = r.stdout + r.stderr
ligne = [l.strip() for l in sortie.split('\n') if l.strip().startswith(('✓ ' + ctl + ' ', '✗ ' + ctl + ' '))]
tombe = any(l.startswith('✗') for l in ligne)
for l in ligne: print('    ' + l[:150])
bilan = [l for l in sortie.split('\n') if l.startswith('== ')]
print('MUTATION %d (%s, attendu : %s) : %s → %s' % (n, ctl, att, bilan[-1] if bilan else 'SANS BILAN', 'OK' if (ligne and tombe == (att == 'tombe')) else 'ÉCHEC DE LA CONTRE-ÉPREUVE'))
shutil.rmtree(rac, ignore_errors=True)
sys.exit(0 if (ligne and tombe == (att == 'tombe')) else 1)
