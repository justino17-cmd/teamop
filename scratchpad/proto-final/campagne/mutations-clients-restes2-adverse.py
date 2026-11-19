#!/usr/bin/env python3
# Contre-épreuve de la sonde adverse clients-restes2-adverse.js (18 novembre 2026) : on JOUE la sonde sur des COPIES de la page (RACINE=…), jamais sur la page du dépôt.
#   « tombe »  : le défaut remis fait tomber le contrôle visé (la sonde regarde au bon endroit) ;
#   « passe »  : le correctif proposé le fait passer (le contrôle n'accuse pas à tort).
# Usage : python3 mutations-clients-restes2-adverse.py <numéro>   (une mutation à la fois, un navigateur à la fois)
import os, re, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(DEPOT, 'apercu')
M = {
 # numéro : (contrôle visé, attendu, remplacements (ancien, nouveau), variables de la sonde)
 1: ('S1', 'tombe', [("  if (CLI_LIBRE || !clientInfosSale()) return;\n  const el = ev.target.closest", "  return;\n  const el = ev.target.closest"), ("if (route === 'client' && h !== ici && cliInfosRetenir(() => aller(h), true)) {", "if (false) {")], {'SEUL': 'S'}),   # les DEUX gardes (clic et adresse) : l'une seule est masquée par l'autre, un lien du menu passant par les deux
 2: ('V1', 'passe', [("const cli = Object.keys(CLIENTS).find(k => k !== '__nv' && sansAccent(CLIENTS[k].nom).split", "const cli = Object.keys(CLIENTS).find(k => k !== '__nv' && !CLIENTS[k].archive && sansAccent(CLIENTS[k].nom).split")], {'SEUL': 'V'}),
 3: ('T4', 'tombe', [("n = n.replace(partiel ? /^(?:0033|33)0?/ :", "n = n.replace(partiel ? /^(?:0033|33)(?!)/ :")], {'SEUL': 'T'}),
 4: ('W1', 'tombe', [(",.seg:has([data-rangc]){flex-wrap:wrap;overflow-x:visible}", "{}"), (",.seg:has([data-rangc]) button{flex:1 1 auto}", "")], {'SEUL': 'W', 'PROFIL': 'petit'}),
 5: ('U2', 'tombe', [("if ((s.NVSIG && JSON.stringify(CLIENTS[s.NVCLI]) !== s.NVSIG) ||", "if (true ||")], {'SEUL': 'U'}),
 6: ('H2', 'tombe', [("cliInfosRetenir(() => aller(h), true)) { histRemplacer('#' + ici); return; }", "cliInfosRetenir(() => aller(h), true)) { history.go(1); return; }")], {'SEUL': 'H'}),   # ⚠️ ce correctif ÉVIDENT de H3 (défaire le recul) n'en est PAS un : H3 passe mais « Abandonner » ne part plus (H2 tombe). Gardé pour qu'on ne le retente pas.
}
n = int(sys.argv[1]); ctl, att, reps, env = M[n]
rac = '/tmp/mut-clients-restes2-%d' % n
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
