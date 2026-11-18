#!/usr/bin/env python3
# Contre-épreuve du regard gérant C : on REMET chaque défaut dans une COPIE de la page (jamais dans le dépôt) et on vérifie que la
# section de la sonde qui le garde tombe. Un contrôle qui ne tombe pas ne garde rien.
#   python3 mutations-regard-gerant-c.py [numéro de mutation ...]
# La copie est une ferme de liens : tout le dépôt vu par la sonde (variable RACINE de lib.js) sauf la page, qui est la copie mutée.
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
TMP = os.environ.get('MUT_TMP', '/tmp/mut-regard-c')
M = [  # (nom, section de la sonde, avant, après)
 ('rond vide des bandeaux rendu', [1], "html .ms-bandeau .t-etat{display:none}   /* le rond vide", "html .ms-bandeau .t-etat{display:flex}   /* le rond vide"),
 ('pastille du menu : sa marge retirée', [2], ".menu a .nb{margin-left:auto;margin-right:-4px;min-width:20px;height:20px;padding:0 5px;", ".menu a .nb{margin-left:auto;min-width:20px;height:20px;padding:0 6px;"),
 ('état de l\'article à côté du nom (grille retirée)', [3], "html .ms-l.sk-l:not(.fx-a){display:grid;grid-template-columns:auto minmax(0,1fr) auto;", "html .ms-l.sk-l:not(.fx-a){display:flex;grid-template-columns:auto minmax(0,1fr) auto;"),
 ('invite de « Ce qui a bougé » longue au téléphone', [4], "tel() ? 'Article, personne…' :", "tel() ? 'Chercher un article, une personne…' :"),
 ('invite des articles du fournisseur longue au téléphone', [4], "tel() ? 'Article, référence, fournisseur…' :", "tel() ? 'Chercher un article, une référence, un fournisseur' :"),
 ('titre et bouton de « À commander » sur la même ligne', [5], "html .fx-ch{flex-wrap:wrap}html .fx-ch>div{flex:1 1 100%}html .fx-ch h3{white-space:normal}", "html .fx-ch{flex-wrap:nowrap}"),
 ('bouton du stock vide qui sort de la carte', [6], "html .ms-vb .btn{max-width:100%;white-space:normal;", "html .ms-vb .btn{max-width:none;white-space:nowrap;"),
 ('adresse e-mail de la fiche fournisseur coupée', [7], "html .fx-lg .saisie[type=email]{width:min(70%,340px)}", "html .fx-lg .saisie[type=email]{width:min(52%,240px)}"),
 ('numéro de commande coupé au tiret', [8], ".replace('-', '\\u2011')}</span>", "}</span>"),
 ('tuiles de la fiche camion à largeurs égales', [9], "html .kpis.md-kpis{grid-template-columns:minmax(0,.8fr) minmax(0,1.5fr) minmax(0,1fr)}\n  html .md-kpis .kpi b{font-size:clamp(17px,5vw,22px);white-space:nowrap}", "html .kpis.md-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}"),
 ('montant d\'une carte de dépôt coupé avant la virgule', [10], "html .md-c .client-chiffres b{white-space:nowrap}", "html .md-c .client-chiffres b{overflow-wrap:anywhere}"),
 ('tuile de la fiche camion à 320 px : police non réduite', [9], "html .md-kpis .kpi{padding-inline:8px}html .md-kpis .kpi b{font-size:15px}", "html .md-kpis .kpi{padding-inline:8px}"),
 ('« · 6 » seul sur sa ligne', [8], "${BX.cfg.okLib}\\u00a0·\\u00a0${n}", "${BX.cfg.okLib} · ${n}"),
 ('segmenté Matériel : marges de 2 px (320)', [11], "html .fx-seg button{padding:0 5px!important;gap:3px!important;font-size:12px!important}html .fx-seg .pr-nb{min-width:0;padding:0 2px;font-size:10.5px}html .fx-seg .pr-nb:not(.chaud){background:none;padding:0}", "html .fx-seg button{padding:0 2px!important;gap:2px!important;font-size:12.5px!important}html .fx-seg .pr-nb{min-width:16px;padding:0 3px;font-size:11px}"),
 ('bouton noir de l\'en-tête à 16 px (deux lignes)', [12], "html .fx-tete .actions>.btn:not(.fx-photo):not(.fx-plusb){padding-inline:8px;font-size:14px}}", "}"),
 ('titre de groupe à l\'ancienne (une chaîne, point collé en bout de ligne)', [13], "const titre = pack ? msPts([esc(cat), esc(pack) + fin]) : msPts([esc(cat) + fin]);", "const titre = esc(cat + (pack ? ' · ' + pack : '') + ' · ' + A.length);"),
 ('points médians visibles en tête de ligne (conteneur sans coupe)', [13, 14], "html .pts{display:block;overflow:hidden}", "html .pts{display:block;overflow:visible}"),
 ('clavier qui monte seul sur tactile', [15], "!matchMedia('(pointer:coarse)').matches && !(navigator.maxTouchPoints > 0 && !matchMedia('(hover:hover)').matches) && ", ""),
 ('boutons du stock vide à largeurs différentes', [16], "html .ms-vb:has(>.btn:nth-child(2)){display:grid;", "html .ms-vb:has(>.btn:nth-child(2)){display:flex;"),
 ('ligne de lieux du Stock à l\'ancienne (point en bout de ligne)', [17], "return it.length ? msPts(it) : 'Nulle part pour l’instant'; })();", "return it.length ? it.join(' · ') : 'Nulle part pour l’instant'; })();"),
 ('lignes de la fiche camion à l\'ancienne (« · » en bout de ligne)', [18], "const cl = o.a <= 0 ? 'md-rg' : 'md-o', sub = o.cible != null ? (m > 0 ? msPts([", "const cl = o.a <= 0 ? 'md-rg' : 'md-o', sub = o.cible != null ? (m > 0 ? ((A => A.join(' · ')))([")),
 ('colonne du montant plus étroite que lui (carte de dépôt)', [10], "html .md-c .client-chiffres,html .fx-c .client-chiffres{grid-template-columns:minmax(0,1fr) minmax(max-content,1fr) minmax(0,1.3fr)}", "html .md-c .client-chiffres,html .fx-c .client-chiffres{grid-template-columns:1fr 1fr 1.3fr}"),
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
        r = subprocess.run(['node', os.path.join(ICI, 'regard-gerant-c.js')] + [str(x) for x in sec], env=dict(os.environ, RACINE=TMP), capture_output=True, text=True, timeout=300)
        tomb = r.stdout.count('  ✗'); bilan.append((k, nom, tomb)); print(f'mutation {k} ({nom}) : {tomb} contrôle(s) tombent', 'OK' if tomb else '← LE BANC NE VOIT PAS CE DÉFAUT', flush=True)
    shutil.rmtree(TMP, ignore_errors=True)
    sys.exit(1 if any(t == 0 for _, _, t in bilan) else 0)
main()
