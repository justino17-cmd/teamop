#!/usr/bin/env python3
# Contre-épreuve du regard gérant A (second regard, 18 novembre 2026). Le premier agent annonçait « 13 mutations sur 13 qui tombent »
# mais le fichier qui les jouait n'a pas été gardé : on le refait. On REMET chaque défaut dans une COPIE de la page (jamais dans le dépôt)
# et on vérifie que la section de regard-gerant-a.js qui le garde tombe. Un contrôle qui ne tombe pas ne garde rien.
#   python3 mutations-regard-gerant-a.py [numéro de mutation ...]
# La copie est une ferme de liens : tout le dépôt vu par la sonde (variable RACINE de lib.js) sauf la page, qui est la copie mutée.
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
TMP = os.environ.get('MUT_TMP', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/mut-regard-a')
M = [  # (nom, section de la sonde, avant, après)
 ('phrase d\'intro des Tâches sans plafond (le bouton PDF retombe sous elle)', [2], ".tkx-intro{max-width:64ch}", ".tkx-intro{max-width:none}"),
 ('bandeau « Retards d\'équipe » : le texte ne prend plus la place qui reste', [5], ".tkx-resume>span:last-child{flex:1 1 0;min-width:0}", ".tkx-resume>span:last-child{flex:none}"),
 ('bandeau « Retards d\'équipe » : brun terne de jour au lieu du jeton --alerte-fond', [6], "padding:10px 14px;border-radius:var(--r2);background:var(--alerte-fond);", "padding:10px 14px;border-radius:var(--r2);background:color-mix(in srgb,var(--orange) 10%,var(--surf));"),
 ('six vues du planning : la rangée ne passe plus à la ligne sur iPad (900 → 760 px)', ['4b'], "@media (max-width:900px){.pl-barre>.seg[aria-label=\"Vue\"]{flex-wrap:wrap;overflow:visible}", "@media (max-width:760px){.pl-barre>.seg[aria-label=\"Vue\"]{flex-wrap:wrap;overflow:visible}"),
 ('bilan du mois : plus collé à l\'écran quand la grille défile', [7], ".pl-defile>.pl-mrec{position:sticky;left:0}", ".pl-defile>.pl-mrec{position:static}"),
 ('nom du client long : centré par le bouton', [8], ".tete .lien{text-align:left}", ".tete .lien{text-align:center}"),
 ('menu « Équipe » des Tâches : 80 px, mot collé à la flèche', [9], "#contenu .t-pour{flex:0 0 98px;max-width:98px;font-size:13px;padding-left:8px;padding-right:4px}", "#contenu .t-pour{flex:0 0 80px;max-width:80px;font-size:13px;padding-left:8px;padding-right:2px}"),
 ('nom du mois du calendrier : sous la colonne des noms', [10], ".ac-mo em{left:calc(var(--nomw) + 8px)}", ".ac-mo em{left:8px}"),
 ('vue d\'ensemble : colonne des jours à 162 px, le samedi sort', [3], "cw = tel() ? 170 : 140,", "cw = tel() ? 170 : 162,"),
 ('invite de la saisie de tâche, téléphone : texte long (l\'ellipse seule ne se mesure pas : elle ne change ni le texte ni la place)', [4], "placeholder=\"${tel() ? 'Nouvelle tâche' : tOnglet === 'auj' ? (innerWidth < 900 ?", "placeholder=\"${tel() ? 'Nouvelle tâche pour demain, appeler le client' : tOnglet === 'auj' ? (innerWidth < 900 ?"),
 ('liste d\'interventions vide : « Rien ici. » nu', [11], "function intVide(f){", "function intVide(f){ return '<div class=\"info petit\">Rien ici.</div>';"),
]
def ferme():
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for n in os.listdir(REPO):
        if n in ('apercu', '.git'): continue
        os.symlink(os.path.join(REPO, n), os.path.join(TMP, n))
    for n in os.listdir(os.path.join(REPO, 'apercu')):
        if n != os.path.basename(PAGE): os.symlink(os.path.join(REPO, 'apercu', n), os.path.join(TMP, 'apercu', n))
def main():
    vues = [int(a) for a in sys.argv[1:]] or list(range(1, len(M) + 1)); src = open(os.path.join(REPO, PAGE), encoding='utf-8').read(); bilan = []
    for k in vues:
        nom, sec, a, b = M[k - 1]
        assert src.count(a) == 1, f'mutation {k} : motif trouvé {src.count(a)} fois'
        ferme(); open(os.path.join(TMP, PAGE), 'w', encoding='utf-8').write(src.replace(a, b))
        # la copie doit DIFFÉRER de l'original, sinon la mutation n'a rien changé
        assert open(os.path.join(TMP, PAGE), encoding='utf-8').read() != src
        r = subprocess.run(['node', os.path.join(ICI, 'regard-gerant-a.js')] + [str(x) for x in sec], env=dict(os.environ, RACINE=TMP), capture_output=True, text=True, timeout=300)
        tomb = r.stdout.count('  ✗'); bilan.append((k, nom, tomb)); print(f'mutation {k} ({nom}) : {tomb} contrôle(s) tombent', 'OK' if tomb else '← LE BANC NE VOIT PAS CE DÉFAUT', flush=True)
    shutil.rmtree(TMP, ignore_errors=True)
    sys.exit(1 if any(t == 0 for _, _, t in bilan) else 0)
main()
