#!/usr/bin/env python3
# Contre-épreuve du RECONTRÔLE ADVERSE des restes de CLIENTS, tour 3 (19 novembre 2026). On JOUE les sondes sur des COPIES de la page (RACINE=…), jamais sur la page du dépôt.
#   « tombe » : le défaut remis fait tomber le contrôle visé ;  « passe » : le correctif proposé le fait passer (le contrôle n'accuse pas à tort).
# ⚠️ POURQUOI CE FICHIER : les mutations 3 et 4 de mutations-clients-restes3.py jouaient la sonde avec SEUL=R. Or R pose la recherche puis redessine SANS ouvrir « Clients » :
#    avec SEUL=R, R1 et R2 TOMBENT sur la page NON mutée (mesuré le 19/11 : « 1 ✓ · 2 ✗ »). Ces deux mutations « tombaient » donc pour une mauvaise raison. Ici on joue la sonde ENTIÈRE.
# Usage : python3 mutations-clients-restes3-recontrole.py <numéro>   (une mutation à la fois, un navigateur à la fois)
import os, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SRC = os.path.join(DEPOT, 'apercu'); SD = os.path.join(DEPOT, 'scratchpad/proto-final/campagne/sondes')
ADV2, ADV3 = 'clients-restes2-adverse.js', 'clients-restes3-adverse.js'
AUSSI = "${L.length && nActTrouves ? `<p class=\"gris petit\" style=\"margin:12px 0 0\">${nActTrouves === 1 ? 'Un client de ta liste correspond aussi' : nActTrouves + ' clients de ta liste correspondent aussi'}. <button type=\"button\" class=\"lien\" data-rangc=\"tous\" data-garde=\"1\">Voir ${nActTrouves === 1 ? 'le client' : 'les clients'} de ma liste</button></p>` : ''}"
M = {
 # les deux mutations du correcteur qui tombaient pour une mauvaise raison, rejouées avec la sonde ENTIÈRE (R2 et R1)
 1: (ADV2, 'R2', 'tombe', [("const nActTrouves = enArch && cq ?", "const nActTrouves = false && enArch && cq ?")], {}),
 2: (ADV2, 'R1', 'tombe', [("${L.length && nArchTrouves ? `<p class=\"gris petit\"", "${false && L.length && nArchTrouves ? `<p class=\"gris petit\"")], {}),
 # les contrôles neufs : la garde retirée les fait tomber
 3: (ADV3, 'D2', 'tombe', [("if (CLI_RETENU && CLI_RETENU.adr) { CLI_RETENU = null; cliAdresseRendreApres(); }", "")], {'SEUL': 'D'}),
 4: (ADV3, 'D3', 'tombe', [("if (CLI_RETENU && CLI_RETENU.adr) { CLI_RETENU = null; cliAdresseRendreApres(); }", "")], {'SEUL': 'D'}),
 5: (ADV3, 'D6', 'tombe', [("if (R.adr) cliAdresseRendreApres(); return fermerPanneau(); }   /* un champ est refusé", "return fermerPanneau(); }   /* un champ est refusé")], {'SEUL': 'D'}),
 # les défauts constatés : le correctif PROPOSÉ fait passer le contrôle (il n'accuse pas à tort)
 6: (ADV3, 'Q1', 'passe', [("      <span class=\"client-chiffres\"><span><b>${eur(paye)}</b><small>payé</small></span><span><b style=\"color:${du?'var(--orange)':'inherit'}\">${eur(du)}</b><small>à recevoir</small></span><span><b>${proch?jcourt(proch.d):'—'}</b><small>prochain passage</small></span></span></button>`; return enArch && peut('crm', 's') ? `<div class=\"client-arch\">${carte}<button type=\"button\" class=\"btn gris\" data-action=\"clientRestaurer\" data-cli=\"${k}\">Remettre dans la liste</button></div>` : carte; }).join('')}</div>", "      <span class=\"client-chiffres\"><span><b>${eur(paye)}</b><small>payé</small></span><span><b style=\"color:${du?'var(--orange)':'inherit'}\">${eur(du)}</b><small>à recevoir</small></span><span><b>${proch?jcourt(proch.d):'—'}</b><small>prochain passage</small></span></span></button>`; return enArch && peut('crm', 's') ? `<div class=\"client-arch\">${carte}<button type=\"button\" class=\"btn gris\" data-action=\"clientRestaurer\" data-cli=\"${k}\">Remettre dans la liste</button></div>` : carte; }).join('')}</div>" + AUSSI)], {'SEUL': 'Q'}),
 7: (ADV3, 'V2', 'passe', [("sansAccent(CLIENTS[k].nom).split(/\\s+/).filter(m => m.length > 3 && !['madame','monsieur','restaurant','cabinet','camping','hotel','copropriete','dentaire'].includes(m)).some(m => s.includes(m));\n  const cli", "sansAccent(CLIENTS[k].nom).split(/\\s+/).filter(m => m.length > 3 && !['madame','monsieur','restaurant','cabinet','camping','hotel','copropriete','dentaire'].includes(m)).some(m => new RegExp('\\\\b' + m + '\\\\b').test(s));\n  const cli")], {'SEUL': 'V'}),
}
n = int(sys.argv[1]); sonde, ctl, att, reps, env = M[n]
rac = '/tmp/mut-clients-restes3-rec-%d' % n
shutil.rmtree(rac, ignore_errors=True); os.makedirs(rac); shutil.copytree(SRC, os.path.join(rac, 'apercu'))
f = os.path.join(rac, 'apercu', 'prototype-op-gestion.html'); s = open(f, encoding='utf-8').read()
for a, b in reps:
    if s.count(a) != 1: sys.exit('MUTATION %d : le motif est trouvé %d fois (1 attendu) : %s' % (n, s.count(a), a[:70]))
    s = s.replace(a, b)
open(f, 'w', encoding='utf-8').write(s)
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
