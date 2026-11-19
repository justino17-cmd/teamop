#!/usr/bin/env python3
# Contre-épreuve de regard-technicien-b.js : on REMET chaque défaut dans apercu/prototype-op-gestion.html, la sonde doit tomber
# (sur le contrôle visé, et d'abord parce que la mutation a bien changé le fichier), puis on restaure par git checkout.
# ⛔ Le correctif doit être COMMITÉ avant (git checkout restaure depuis HEAD) ; ⛔ rien d'autre ne doit modifier la page pendant ce lot.
#   python3 mutations-regard-technicien-b.py [numéro ...]
import subprocess, sys, os
RAC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = os.path.join(RAC, 'apercu', 'prototype-op-gestion.html')
SONDE = os.path.join(RAC, 'scratchpad', 'proto-final', 'sondes', 'regard-technicien-b.js')
M = [
 ('pied collant remis au bas -1px (le contenu défile dessous)', 'iphone', '#calque .panneau>.vh-pied{position:sticky;bottom:calc(-1px - var(--pan-bas))', '#calque .panneau>.vh-pied{position:sticky;bottom:-1px', 'le pied touche le bas'),
 ('bouton qui avance au même poids que Annuler', 'iphone', 'html .mat-pied .btn:not(.gris){flex:1.6 1 52%}html .mat-pied .btn.gris{flex:1 1 30%}', '', 'tient sur UNE ligne'),
 ('trio sur trois colonnes à 360 px', 'android', '@media (max-width:379px){html .mc-page .vh-cam-g{', '@media (max-width:359px){html .mc-page .vh-cam-g{', 'trois boutons'),
 ('« 1 prévus »', 'iphone', "prévu${c > 1 ? 's' : ''} : le compte y est", 'prévus : le compte y est', 'singulier'),
 ('unité détachée de son nombre', 'iphone', r"const mcNom = n => esc(n).replace(/ ([^ ()]{1,6}\))/g, '\u00a0$1');", "const mcNom = n => esc(n);", 'ne se détache pas'),
 ('état d\'envoi laissé à droite', 'iphone', 'html .mc-dr{flex:1 1 100%;max-width:100%;', 'html .mc-dr{max-width:100%;', 'passe sous le nom'),
 ('sans camion : phrase grise seule', 'iphone', '<div class="carte mc-ok"><span><b>Aucun camion ne t’est confié pour l’instant.</b>', '<div class="gris"><span><b>Aucun camion ne t’est confié pour l’instant.</b>', 'sans camion'),
 ('champs du plein non alignés', 'android', '<div class="deux-champs vx-ali"><label class="champ">Montant payé', '<div class="deux-champs"><label class="champ">Montant payé', 'même hauteur'),
 ('bouton « J\'ai tout pris » tombé sous le titre à 360 px', 'android', '@media (max-width:379px){html .mc-tete-c{', '@media (max-width:300px){html .mc-tete-c{', 'même rangée'),
 ('chiffre seul sur sa ligne', 'iphone', "à l’atelier\\u00a0' + prNum(at)", "à l’atelier ' + prNum(at)", 'gardent leur chiffre'),
 ('« Fermer » des messages à largeur naturelle', 'iphone', '<div class="fo-pied mat-pied"><button type="button" class="btn" data-ferme="1">Fermer</button></div>`);\n}', '<div class="fo-pied"><button type="button" class="btn" data-ferme="1">Fermer</button></div>`);\n}', 'prend la largeur'),
 ('boutons de feuille non empilés à 320 px', 'petit', '@media (max-width:340px){html .mat-pied .btn,', '@media (max-width:240px){html .mat-pied .btn,', 'tient sur UNE ligne'),
 ('champs du plein empilés sans air (320 px)', 'petit', '@media (max-width:340px){html .deux-champs.vx-ali>.champ+.champ{margin-top:14px}}', '', 'de l\'air (≥ 10 px)'),
]
sel = [int(a) for a in sys.argv[1:]] or list(range(1, len(M) + 1))
ko = 0
for n in sel:
    nom, prof, a, b, motif = M[n - 1]
    src = open(PAGE, encoding='utf-8').read()
    if src.count(a) != 1:
        print(f'M{n} {nom} : motif trouvé {src.count(a)} fois (attendu 1) — mutation MAL VISÉE'); ko += 1; continue
    open(PAGE, 'w', encoding='utf-8').write(src.replace(a, b))
    try:
        d = subprocess.run(['git', '-C', RAC, 'diff', '--stat', '--', PAGE], capture_output=True, text=True).stdout.strip()
        r = subprocess.run(['node', SONDE], capture_output=True, text=True, timeout=200, env={**os.environ, 'PROFILS': prof, 'NUIT': '0'})
        sortie = r.stdout
        tombe = [l for l in sortie.split('\n') if l.startswith('  ✗')]
        ok = r.returncode == 1 and any(motif in l for l in tombe)
        print(f'M{n} {"attrapée" if ok else "PAS ATTRAPÉE"} : {nom} ({prof}) · fichier modifié : {"oui" if d else "NON"} · ✗ : {len(tombe)} · ' + (tombe[0][:110] if tombe else sortie[-150:]))
        ko += 0 if ok else 1
    finally:
        subprocess.run(['git', '-C', RAC, 'checkout', '--', PAGE])
print(f'\n{len(sel) - ko}/{len(sel)} mutations attrapées'); sys.exit(1 if ko else 0)
