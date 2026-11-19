#!/usr/bin/env python3
# Mutations du tour 4 « restes équipe » (19 novembre 2026) : chaque garde est retirée SÉPARÉMENT, sur une COPIE hors dépôt (jamais sur le fichier du dépôt).
# usage : python3 mutations-restes-equipe-4.py [numéro…]   ⛔ 127.0.0.1 seulement, au premier plan
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_TMP', '/tmp/rc4/mut')
page0 = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
mod0 = open(os.path.join(DEPOT, 'apercu', 'prototype-courrier.js'), encoding='utf-8').read()
EF = "eqFiche = function (k) {"
# (nom, [(fichier, ancien, neuf)], phase, profil)
M = [
 ('1 courrierRepondre ne lit plus la case Créer (appel direct, raccourci R, boutons fabriqués passent)', [('p', "  if (!peut('com', 'c')) { droitsRefus('com', 'c', 'courrier', cle); return false; }", "")], 'N3', 'mac'),
 ('2 « Proposer une visite » ne lit plus la case Planning › Modifier', [('p', "if (cle === 'creneau' && !peut('planif', 'm')) {", "if (false) {")], 'N3', 'mac'),
 ('3 mbxConfier ne lit plus la case Créer (appel direct)', [('p', "  if (!peut('com', 'c')) return droitsRefus('com', 'c', 'mbx', 'confok');", "")], 'N3', 'mac'),
 ('4 le module remet « Répondre » dans la case Modifier (bouton et raccourci R)', [('m', 'reply:"ecrire",replyAll:"ecrire"', 'reply:"ranger",replyAll:"ranger"')], 'N3', 'mac'),
 ('5 le bandeau propose « Proposer une visite » sans la case Planning', [('p', "if (o.id.startsWith('ml:creneau|') && !peut('planif', 'm')) return false;", "")], 'N3', 'mac'),
 ('6 « En faire une tâche » (ml:tache) retourne dans les gestes non classés d\'écriture — plus de case Créer au clic ni dans le gestionnaire', [('p', "  if ((a === 'tache' || a === 'confok') && !peut('com', 'c')) return droitsRefus('com', 'c', 'ml', a);", ""), ('p', "ml:{ k:'com', c:'ajout repondre modele creneau tache confok creerint@inter planifdv@inter', m:'reco accord@ventes", "ml:{ k:'com', c:'ajout creerint@inter planifdv@inter', m:'reco tache creneau repondre modele confok accord@ventes")], 'N3', 'mac'),
 ('7 la seconde déclaration de eqFiche est précédée d\'une première (la morte revient)', [('p', EF, "function eqFiche(k){ return ''; }\n" + EF)], 'D', 'mac'),
 ('8 la fiche qui gagne perd son bloc d\'accès (la fiche ne s\'ouvre plus comme avant)', [('p', "if (p && A && peut('admin', 'm') && !P.querySelector('.cn-acces')) {", "if (false) {")], 'D', 'mac'),
 ('9 la fiche qui gagne perd sa phrase « Dernier administrateur actif » (la fiche de l administrateur ne s ouvre plus comme avant)', [('p', "${seulAdmin ? '<span class=\"gris petit\">Dernier administrateur actif", "${false ? '<span class=\"gris petit\">Dernier administrateur actif")], 'D', 'mac'),
 ('10 secuPanTelephone ne refuse plus un compte désactivé (le bouton fabriqué ouvre le panneau)', [('p', "function secuPanTelephone(k){ const p = eqDe(k); if (!p || !secuPeut()) return;\n  if (!p.actif) return", "function secuPanTelephone(k){ const p = eqDe(k); if (!p || !secuPeut()) return;\n  if (false) return")], 'T', 'mac'),
 ('11 secuPanDeconnecter ne refuse plus un compte désactivé', [('p', "function secuPanDeconnecter(k){ const p = eqDe(k); if (!p || !secuPeut()) return;\n  if (!p.actif) return", "function secuPanDeconnecter(k){ const p = eqDe(k); if (!p || !secuPeut()) return;\n  if (false) return")], 'T', 'mac'),
 ('12 secuNouveauTelephone / secuDeconnecter (les fonctions qui écrivent) ne refusent plus un compte désactivé', [('p', "function secuNouveauTelephone(k, par){ const p = eqDe(k); if (!p || !secuPeut()) return false;\n  if (!p.actif) {", "function secuNouveauTelephone(k, par){ const p = eqDe(k); if (!p || !secuPeut()) return false;\n  if (false) {"), ('p', "function secuDeconnecter(k){ const p = eqDe(k); if (!p || !secuPeut()) return false;\n  if (!p.actif) {", "function secuDeconnecter(k){ const p = eqDe(k); if (!p || !secuPeut()) return false;\n  if (false) {")], 'T', 'mac'),
]
choix = set(sys.argv[1:]); bilan = []
for nom, subs, sec, prof in M:
    n = int(nom.split(' ')[0])
    if choix and str(n) not in choix: continue
    page, mod, ok = page0, mod0, True
    for f, a, b in subs:
        src = page if f == 'p' else mod
        if src.count(a) != 1: ok = False; print(f'  ! mutation {n} : motif introuvable ou multiple ({src.count(a)}) : {a[:70]}'); break
        src = src.replace(a, b)
        if f == 'p': page = src
        else: mod = src
    if not ok: bilan.append((n, nom, 'MOTIF')); continue
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        p = os.path.join(DEPOT, 'apercu', f)
        if os.path.isfile(p) and f not in ('prototype-op-gestion.html', 'prototype-courrier.js'): shutil.copy(p, os.path.join(TMP, 'apercu', f))
    open(os.path.join(TMP, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(page)
    open(os.path.join(TMP, 'apercu', 'prototype-courrier.js'), 'w', encoding='utf-8').write(mod)
    env = dict(os.environ, RACINE=TMP)
    try:
        r = subprocess.run(['node', os.path.join(ICI, 'restes-equipe-4.js'), prof, sec], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=420); sortie = r.stdout + r.stderr; code = r.returncode
    except subprocess.TimeoutExpired: sortie = ''; code = 124
    tombes = [l.strip()[:150] for l in sortie.split('\n') if l.startswith('  ✗')]; tot = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie)
    etat = 'TOMBE' if code == 1 and tombes else ('PASSE (la sonde ne voit pas ce défaut)' if code == 0 else f'code {code}')
    print(f'mutation {nom} : {etat} {tot[-1] if tot else ""}'); [print('    ✗', t) for t in tombes[:2]]
    bilan.append((n, nom, etat))
shutil.rmtree(TMP, ignore_errors=True)
mauvais = [b for b in bilan if not b[2].startswith('TOMBE')]
print(f'\n{len(bilan) - len(mauvais)}/{len(bilan)} mutations tombent' + (' · À EXAMINER : ' + ', '.join(str(b[0]) for b in mauvais) if mauvais else ''))
sys.exit(1 if mauvais else 0)
