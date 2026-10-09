#!/usr/bin/env python3
"""Mutations des CARROUSELS d'écrans du site (aperçu) — chaque garde remise en défaut, une par une, et la sonde
(scratchpad/sonde-carrousel.js) doit TOMBER. Règle du dépôt : correctif → banc → commit → mutation → git checkout.
⛔ Ne se lance que sur un arbre PROPRE pour les fichiers mutés (sinon `git checkout` emporterait un travail non commité).
Usage : python3 scratchpad/mutations-carrousel.py            (toutes)      SEULES=M1,M5 python3 scratchpad/mutations-carrousel.py"""
import os, subprocess, sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
JS, CSS, GEN = 'vitrine/v2/carrousel.js', 'vitrine/v2/carrousel.css', 'scripts/site-marine.js'

# (nom, fichier, avant, après, ce qui doit tomber, environnement de la sonde)
MUTATIONS = [
    ('M1 plus d\'horloge', JS, "if (points[i] && e.target === points[i].querySelector('i')) montrer(i + 1, 1);", "/* muté */",
     'il défile seul', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M2 le bouton ⏸ ne fait rien', JS, "if (lecture) lecture.addEventListener('click', function () { enPause = !enPause; etat(); });", "/* muté */",
     'arrête pour de bon', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M3 la souris ne le fait plus attendre', JS, "if (e.pointerType === 'mouse') arret('survol', true);", "/* muté */",
     'la souris posée dessus le fait attendre', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M4 hors de l\'écran, il tourne', JS, "arret('horsvue', !oui);", "arret('horsvue', false);",
     "hors de l'écran, il attend", {'PAGES': 'index', 'PROFILS': 'téléphone', 'MODES': 'light', 'GESTES': 'index'}),
    ('M5 plus de glissement au doigt', JS, "if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) montrer(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);", "/* muté */",
     'glisser à gauche', {'PAGES': 'index', 'PROFILS': 'téléphone', 'MODES': 'light', 'GESTES': 'index'}),
    ('M6 plus de flèches au clavier', JS, "e.preventDefault(); montrer(i + d, d); if (points[i]) points[i].focus();", "/* muté */",
     'au clavier passe', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M7 « animations réduites » ignoré', JS, "enPause = !!(reduit && reduit.matches);", "enPause = false;",
     'arrêté au départ', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M8 les écrans cachés se chargent', CSS, ".c-vue { position: absolute; inset: 0; display: none; }", ".c-vue { position: absolute; inset: 0; display: block; }",
     'ne se chargent pas', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M9 l\'iPhone des cartes coupé par le bas', CSS, ".grande-carte .bas { align-items: flex-end; padding: 30px 20px 40px; }",
     ".grande-carte .bas { align-items: flex-start; padding: 30px 20px 0; max-height: 420px; overflow: hidden; }",
     'EN ENTIER', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M10 les cases recoupent leurs appareils', CSS, ".tuile-f .vue.duo { display: block; flex: 0 0 auto; margin-top: auto; height: auto; max-height: none; aspect-ratio: 1 / .74; padding: 0; }",
     ".tuile-f .vue.duo { display: block; flex: 0 0 auto; margin-top: auto; height: auto; max-height: none; aspect-ratio: 1 / .3; padding: 0; }",
     'EN ENTIER', {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M11 la légende ne suit plus', JS, "if (legende) legende.textContent = titres[j];", "/* muté */",
     'disent le même écran', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M12 le Mac et l\'iPhone se désaccordent', JS, "vues.forEach(function (L) {\n          L.forEach(function (v) { if (v.classList.contains('c-sort'))",
     "vues.slice(0, 1).forEach(function (L) {\n          L.forEach(function (v) { if (v.classList.contains('c-sort'))",
     'disent le même écran', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    # (rendre seulement `permis` toujours vrai ne changerait rien : le cycle factures / encaissements / connexion est neutre de lui-même —
    #  c'est la scène Mac + iPhone, tout en 3D, qui arriverait chez le plombier)
    ('M13 une page hors 3D montre du 3D', GEN, "const neutre = !!METIERS[cle] && !m.trois, permis = k => !neutre || !troisD(k);",
     "const neutre = false, permis = k => true;",
     'que des écrans neutres', {'PAGES': 'logiciel-plombier', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M14 le suivant ne se prépare plus', JS, "if (oui && !vu) { vu = true; setTimeout(function () { prets((i + 1) % n); }, 700); }", "/* muté */",
     'le suivant sont chargés', {'PAGES': 'applications', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M15 les commandes restent cachées', JS, "if (commandes) commandes.hidden = false;", "/* muté */",
     'commandes visibles', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M16 un écran sans sa version de nuit', GEN, "`<source data-nuit media=\"(prefers-color-scheme: dark)\" srcset=\"${CAP}${nom}-nuit.webp\">`",
     "`<source data-nuit media=\"(prefers-color-scheme: dark)\" srcset=\"${CAP}${nom}-jour.webp\">`",
     "l'écran suit le mode", {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'dark', 'GESTES': 'aucune'}),
    ('M17 les écrans défilent à l\'envers', JS, "c.classList.toggle('c-avant', vers > 0); c.classList.toggle('c-arriere', vers < 0);",
     "c.classList.toggle('c-avant', vers < 0); c.classList.toggle('c-arriere', vers > 0);",
     "il défile seul", {'PAGES': 'index', 'PROFILS': 'téléphone', 'MODES': 'light', 'GESTES': 'index'}),
    ('M18 l\'iPhone repasse derrière le Mac', CSS, ".c-scene .ap-mac { isolation: isolate; }\n.c-scene .ap-iphone { isolation: isolate; z-index: 1; }", "/* muté */",
     "passe DEVANT le Mac", {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M19 la page hors 3D prend les captures du 3D', GEN, "const NEUTRE_DE = { factures: 'facturesNeutre', compta: 'comptaNeutre' };", "const NEUTRE_DE = {};",
     'rien que des écrans neutres', {'PAGES': 'logiciel-plombier', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M20 une case revient à un seul appareil', GEN, "  if (!POUR_LA_RACINE) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];", "  if (false) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];",
     'chaque case montre le Mac ET', {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
]

def sh(c, **kw):
    return subprocess.run(c, shell=True, cwd=RACINE, capture_output=True, text=True, **kw)

def main():
    seules = os.environ.get('SEULES', '').split(',') if os.environ.get('SEULES') else None
    sales = sh('git status --porcelain -- ' + ' '.join([JS, CSS, GEN, 'apercu/site'])).stdout.strip()
    if sales:
        print('⛔ arbre non propre pour les fichiers mutés — committer avant de muter :\n' + sales); sys.exit(2)
    mord, rate = [], []
    for nom, f, avant, apres, attendu, env in MUTATIONS:
        if seules and nom.split()[0] not in seules: continue
        chemin = os.path.join(RACINE, f)
        s = open(chemin, encoding='utf-8').read()
        if s.count(avant) != 1:
            print('✗ ' + nom + ' : la cible est introuvable (' + str(s.count(avant)) + ' fois) — mutation mal visée'); rate.append(nom); continue
        open(chemin, 'w', encoding='utf-8').write(s.replace(avant, apres))
        try:
            if f == GEN: sh('node scripts/site-marine.js', timeout=120)
            # la mutation a bien touché le fichier SERVI (règle du dépôt : vérifier que la mutation a frappé le bon endroit)
            d = sh('git diff --stat').stdout.strip()
            e = dict(os.environ); e.update(env)
            r = subprocess.run('node scratchpad/sonde-carrousel.js', shell=True, cwd=RACINE, capture_output=True, text=True, env=e, timeout=900)
            sortie = r.stdout + r.stderr
            tombe = r.returncode != 0 and any(attendu in l for l in sortie.splitlines() if l.strip().startswith('✗'))
            (mord if tombe else rate).append(nom)
            print(('✓ mord   ' if tombe else '✗ RATE   ') + nom + '  (' + (d.splitlines()[-1] if d else 'aucun diff !') + ')')
            if not tombe:
                print('   attendu : « ' + attendu + ' » — échecs vus : ' + ' | '.join([l.strip()[:120] for l in sortie.splitlines() if l.strip().startswith('✗')][:4]))
        finally:
            sh('git checkout -- ' + f + ' apercu/site')
    print('\n' + str(len(mord)) + ' mordent, ' + str(len(rate)) + ' ratent')
    reste = sh('git status --porcelain -- ' + ' '.join([JS, CSS, GEN, 'apercu/site'])).stdout.strip()
    print('arbre après les mutations : ' + ('PROPRE' if not reste else 'SALE ⛔\n' + reste))
    sys.exit(1 if rate or reste else 0)

main()
