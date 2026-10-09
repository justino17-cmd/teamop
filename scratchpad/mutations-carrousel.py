#!/usr/bin/env python3
"""Mutations des CARROUSELS d'écrans du site (aperçu) — chaque garde remise en défaut, une par une, et la sonde
(scratchpad/sonde-carrousel.js) doit TOMBER. Règle du dépôt : correctif → banc → commit → mutation → git checkout.
⛔ Ne se lance que sur un arbre PROPRE pour les fichiers mutés (sinon `git checkout` emporterait un travail non commité).
Usage : python3 scratchpad/mutations-carrousel.py            (toutes)      SEULES=M1,M5 python3 scratchpad/mutations-carrousel.py"""
import os, subprocess, sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
JS, CSS, GEN, SITE = 'vitrine/v2/carrousel.js', 'vitrine/v2/carrousel.css', 'scripts/site-marine.js', 'vitrine/v2/site.css'

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
    ('M10 l\'iPhone plus haut que sa scène', CSS, "--ap-l: calc(var(--c-h) * 430 / 902); margin: 0; }", "--ap-l: calc(var(--c-h) * 430 / 600); margin: 0; }",
     'EN ENTIER', {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M11 la légende ne suit plus', JS, "if (legende) legende.textContent = titres[j];", "/* muté */",
     'disent le même écran', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M12 la scène ne coupe plus l\'appareil qui glisse', CSS, "container-type: size; overflow: hidden; overflow-x: clip; overflow-y: visible;", "container-type: size; overflow: visible;",
     'ne se voit jamais hors de sa scène', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
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
    ('M18 l\'écran préparé se voit déjà (deux appareils à l\'écran)', CSS, ".c-vue.c-prete { opacity: 0; }", ".c-vue.c-prete { opacity: 1; }",
     'UN seul appareil', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M19 la page hors 3D prend les captures du 3D', GEN, "const NEUTRE_DE = { factures: 'facturesNeutre', compta: 'comptaNeutre' };", "const NEUTRE_DE = {};",
     'rien que des écrans neutres', {'PAGES': 'logiciel-plombier', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M20 une case revient à un seul appareil', GEN, "  if (!POUR_LA_RACINE) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];", "  if (false) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];",
     "chaque case porte l'iPhone, puis le Mac", {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M21 l\'horloge des cases ne tourne plus', CSS, ".c-horloge { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }",
     ".c-horloge { display: none; }", "passent d'elles-mêmes au Mac", {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M22 plus de vague : la grille bascule d\'un bloc', CSS, ".vue.alterne.c-anime .c-vue.c-on, .vue.alterne.c-anime .c-vue.c-sort { animation-delay: calc(var(--i, 0) * 70ms); }", "/* muté */",
     'en vague', {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    ('M23 le ⏸ des cases ne fait rien', JS, "b.addEventListener('click', function () { arrete = !arrete; membres.forEach(function (x) { x.pause(arrete); }); maj(); });", "/* muté */",
     'le ⏸ des cases', {'PAGES': 'elan', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    # ⚠️ retirer la seule règle de carrousel.css ne change RIEN : site.css éteint toute animation de la page (`* { animation: none
    #  !important }`) — essayé le 9 octobre 2026, la mutation passait. Il faut retirer les DEUX gardes (fichiers et cibles en listes).
    ('M24 « animations réduites » : la glissade reprend le dessus', [CSS, SITE],
     ["[data-carrousel].c-anime.c-avant .c-vue.c-on, [data-carrousel].c-anime.c-avant .c-vue.c-sort,\n  [data-carrousel].c-anime.c-arriere .c-vue.c-on, [data-carrousel].c-anime.c-arriere .c-vue.c-sort { animation: none; }",
      "*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }"],
     ["/* muté */", "*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }"],
     'SANS glisser', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M25 le Mac avant l\'iPhone', GEN, "    vues.push(cadreIphone(ecranIphone(i, altIphone(i), { tot: j === 0 && o.tot }))); titres.push(t + LEGENDE_APPAREIL.iphone);\n    vues.push(cadreMac(ecranMac(m, altMac(m), { tailles }))); titres.push(t + LEGENDE_APPAREIL.mac);",
     "    vues.push(cadreMac(ecranMac(m, altMac(m), { tailles }))); titres.push(t + LEGENDE_APPAREIL.mac);\n    vues.push(cadreIphone(ecranIphone(i, altIphone(i), { tot: j === 0 && o.tot }))); titres.push(t + LEGENDE_APPAREIL.iphone);",
     "l'iPhone, puis le Mac (", {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}),
    ('M26 les appareils se chevauchent en glissant', CSS, "@keyframes c-entre-avant { from { transform: translateX(100%); } to { transform: none; } }",
     "@keyframes c-entre-avant { from { transform: translateX(30%); } to { transform: none; } }",
     'ne se chevauchent jamais', {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'aucune'}),
    # — le banc (tests/test-835.js) : ses gardes de l'aperçu, remises en défaut par le générateur —
    ('B1 (banc) le Mac avant l\'iPhone', GEN, "    vues.push(cadreIphone(ecranIphone(i, altIphone(i), { tot: j === 0 && o.tot }))); titres.push(t + LEGENDE_APPAREIL.iphone);\n    vues.push(cadreMac(ecranMac(m, altMac(m), { tailles }))); titres.push(t + LEGENDE_APPAREIL.mac);",
     "    vues.push(cadreMac(ecranMac(m, altMac(m), { tailles }))); titres.push(t + LEGENDE_APPAREIL.mac);\n    vues.push(cadreIphone(ecranIphone(i, altIphone(i), { tot: j === 0 && o.tot }))); titres.push(t + LEGENDE_APPAREIL.iphone);",
     "l'iPhone, puis le Mac du même écran", {'BANC': 'tests/test-835.js'}),
    ('B2 (banc) dix écrans par grande scène', GEN, "const SCENE = SCENE_TOUT.slice(0, 4);", "const SCENE = SCENE_TOUT.slice(0, 5);",
     'huit au plus', {'BANC': 'tests/test-835.js'}),
    ('B3 (banc) la légende tait l\'appareil', GEN, "const LEGENDE_APPAREIL = { iphone: ', sur iPhone', mac: ', sur Mac' };", "const LEGENDE_APPAREIL = { iphone: '', mac: '' };",
     "la légende dit l'appareil", {'BANC': 'tests/test-835.js'}),
    ('B4 (banc) une case, le Mac d\'un autre écran', GEN, "    const ecrans = [cadreIphone(ecranIphone(PAIRES[k][1], alt)), cadreMac(ecranMac(PAIRES[k][0], alt, { tailles: VUE_TAILLES.mac }))];",
     "    const ecrans = [cadreIphone(ecranIphone(PAIRES[k][1], alt)), cadreMac(ecranMac(PAIRES.tableau[0], alt, { tailles: VUE_TAILLES.mac }))];",
     'sur le MÊME écran', {'BANC': 'tests/test-835.js'}),
    ('B5 (banc) le ⏸ des cases disparaît', GEN, "  const pause = !POUR_LA_RACINE && liste.some(x => x[4]) ?", "  const pause = false ?",
     'un seul ⏸ pour les cases', {'BANC': 'tests/test-835.js'}),
]

def sh(c, **kw):
    return subprocess.run(c, shell=True, cwd=RACINE, capture_output=True, text=True, **kw)

def main():
    seules = os.environ.get('SEULES', '').split(',') if os.environ.get('SEULES') else None
    sales = sh('git status --porcelain -- ' + ' '.join([JS, CSS, GEN, SITE, 'apercu/site'])).stdout.strip()
    if sales:
        print('⛔ arbre non propre pour les fichiers mutés — committer avant de muter :\n' + sales); sys.exit(2)
    mord, rate = [], []
    for nom, f, avant, apres, attendu, env in MUTATIONS:
        if seules and nom.split()[0] not in seules: continue
        # une mutation peut toucher PLUSIEURS fichiers (deux gardes qui se couvrent l'une l'autre se retirent ensemble)
        fs_, av_, ap_ = (f, avant, apres) if isinstance(f, list) else ([f], [avant], [apres])
        textes = [open(os.path.join(RACINE, x), encoding='utf-8').read() for x in fs_]
        manque = [x + ' (' + str(t.count(a)) + ' fois)' for x, t, a in zip(fs_, textes, av_) if t.count(a) != 1]
        if manque:
            print('✗ ' + nom + ' : la cible est introuvable — ' + ', '.join(manque) + ' — mutation mal visée'); rate.append(nom); continue
        for x, t, a, b in zip(fs_, textes, av_, ap_): open(os.path.join(RACINE, x), 'w', encoding='utf-8').write(t.replace(a, b))
        f = ' '.join(fs_)
        try:
            if GEN in fs_: sh('node scripts/site-marine.js', timeout=120)
            # la mutation a bien touché le fichier SERVI (règle du dépôt : vérifier que la mutation a frappé le bon endroit)
            d = sh('git diff --stat').stdout.strip()
            e = dict(os.environ); e.update(env)
            r = subprocess.run('node ' + (env.get('BANC') or 'scratchpad/sonde-carrousel.js'), shell=True, cwd=RACINE, capture_output=True, text=True, env=e, timeout=900)
            sortie = r.stdout + r.stderr
            tombe = r.returncode != 0 and any(attendu in l for l in sortie.splitlines() if l.strip().startswith('✗'))
            (mord if tombe else rate).append(nom)
            print(('✓ mord   ' if tombe else '✗ RATE   ') + nom + '  (' + (d.splitlines()[-1] if d else 'aucun diff !') + ')')
            if not tombe:
                print('   attendu : « ' + attendu + ' » — échecs vus : ' + ' | '.join([l.strip()[:120] for l in sortie.splitlines() if l.strip().startswith('✗')][:4]))
        finally:
            sh('git checkout -- ' + f + ' apercu/site')
    print('\n' + str(len(mord)) + ' mordent, ' + str(len(rate)) + ' ratent')
    reste = sh('git status --porcelain -- ' + ' '.join([JS, CSS, GEN, SITE, 'apercu/site'])).stdout.strip()
    print('arbre après les mutations : ' + ('PROPRE' if not reste else 'SALE ⛔\n' + reste))
    sys.exit(1 if rate or reste else 0)

main()
