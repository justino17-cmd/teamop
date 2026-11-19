#!/usr/bin/env python3
# Contre-épreuve de la sonde adverse clients-restes2-adverse.js, tour 3 (19 novembre 2026) : on JOUE la sonde sur des COPIES de la page (RACINE=…), jamais sur la page du dépôt.
#   « tombe »  : le défaut remis fait tomber le contrôle visé (la sonde regarde au bon endroit) ;
#   « passe »  : le correctif proposé le fait passer (le contrôle n'accuse pas à tort).
# Usage : python3 mutations-clients-restes3.py <numéro>   (une mutation à la fois, un navigateur à la fois)
import os, re, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(DEPOT, 'apercu')
M = {
 # les gardes du tour 3, retirées une à une : la sonde doit tomber à chaque fois
 1: ('V1', 'tombe', [("const cli = Object.keys(CLIENTS).find(k => k !== '__nv' && !CLIENTS[k].archive && dit(k));", "const cli = Object.keys(CLIENTS).find(k => k !== '__nv' && dit(k));")], {'SEUL': 'V'}),
 2: ('H3', 'tombe', [("if (route === 'client' && h !== ici && cliInfosRetenir(() => lireHash(), true)) return;", "if (route === 'client' && h !== ici && cliInfosRetenir(() => aller(h), true)) { histRemplacer('#' + ici); return; }")], {'SEUL': 'H'}),   # l'ancien comportement remis
 3: ('R2', 'tombe', [("const nActTrouves = enArch && cq ?", "const nActTrouves = false && enArch && cq ?")], {'SEUL': 'R'}),
 4: ('R1', 'tombe', [("${L.length && nArchTrouves ? `<p class=\"gris petit\"", "${false && L.length && nArchTrouves ? `<p class=\"gris petit\"")], {'SEUL': 'R'}),
 5: ('H4', 'tombe', [("if (CLI_RETENU && CLI_RETENU.adr) { CLI_RETENU = null; cliAdresseRendre(); }", "")], {'SEUL': 'H'}),   # « Continuer » ne remet plus l'adresse de la fiche
 6: ('H2', 'tombe', [("cliInfosRetenir(() => lireHash(), true)) return;", "cliInfosRetenir(() => { history.go(1); }, true)) return;")], {'SEUL': 'H'}),   # le correctif « évident » (défaire le recul) n'en est pas un : « Abandonner » ne partirait plus
}
n = int(sys.argv[1]); ctl, att, reps, env = M[n]
rac = '/tmp/mut-clients-restes3-%d' % n
shutil.rmtree(rac, ignore_errors=True); os.makedirs(rac); shutil.copytree(SRC, os.path.join(rac, 'apercu'))
f = os.path.join(rac, 'apercu', 'prototype-op-gestion.html'); s = open(f, encoding='utf-8').read()
for a, b in reps:
    if s.count(a) != 1: sys.exit('MUTATION %d : le motif est trouvé %d fois (1 attendu) : %s' % (n, s.count(a), a[:60]))
    s = s.replace(a, b)
open(f, 'w', encoding='utf-8').write(s)
e = dict(os.environ, RACINE=rac, PROFIL=env.get('PROFIL', 'mac'), QUI='marc'); e.update({k: v for k, v in env.items() if k != 'PROFIL'}); e['PROFIL'] = env.get('PROFIL', 'mac')
sonde = os.path.join(DEPOT, 'scratchpad/proto-final/campagne/sondes/clients-restes2-adverse.js')
r = subprocess.run(['node', sonde], env=e, capture_output=True, text=True, timeout=400)
sortie = r.stdout + r.stderr
tout = [l for l in sortie.split('\n') if l.strip().startswith(('✓ ' + ctl[0], '✗ ' + ctl[0]))]
for l in tout: print('    ' + l.strip()[:130])
ligne = [l for l in tout if l.strip().startswith(('✓ ' + ctl, '✗ ' + ctl))]
tombe = any(l.strip().startswith('✗ ' + ctl) for l in ligne)
print('MUTATION %d (%s, attendu : %s) : %s → %s' % (n, ctl, att, ligne[0].strip()[:150] if ligne else 'AUCUNE LIGNE', 'OK' if (tombe == (att == 'tombe') and ligne) else 'ÉCHEC DE LA CONTRE-ÉPREUVE'))
shutil.rmtree(rac, ignore_errors=True)
sys.exit(0 if (ligne and tombe == (att == 'tombe')) else 1)
