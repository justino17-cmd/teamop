#!/usr/bin/env python3
"""Mutations des CARROUSELS d'écrans du site (aperçu) — chaque garde remise en défaut, une par une, et la sonde
(scratchpad/sonde-carrousel.js) doit TOMBER. Règle du dépôt : correctif → banc → commit → mutation → git checkout.
⛔ Ne se lance que sur un arbre PROPRE pour les fichiers mutés (sinon `git checkout` emporterait un travail non commité).
Usage : python3 scratchpad/mutations-carrousel.py            (toutes)      SEULES=M1,M5 python3 scratchpad/mutations-carrousel.py"""
import os, subprocess, sys

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
JS, CSS, GEN, SITE = 'vitrine/v2/carrousel.js', 'vitrine/v2/carrousel.css', 'scripts/site-marine.js', 'vitrine/v2/site.css'

# (nom, fichier(s), avant, après, ce qui doit tomber, environnement de la sonde — ou BANC : le banc à lancer à sa place)
# Le carrousel du 9 octobre 2026 au soir (Justin : « une fois qu'on voit le Mac, ça change de page, on voit le téléphone, et c'est
# tout ») : UNE paire par place, le Mac puis le téléphone, sans légende, sans pastille, sans bouton.
B = {'PAGES': 'index', 'PROFILS': 'bureau', 'MODES': 'light', 'GESTES': 'index'}
T = {'PAGES': 'index', 'PROFILS': 'téléphone', 'MODES': 'light', 'GESTES': 'index'}
SANS = lambda pg, pr='bureau', mo='light': {'PAGES': pg, 'PROFILS': pr, 'MODES': mo, 'GESTES': 'aucune'}
BANC = {'BANC': 'tests/test-835.js'}
MUTATIONS = [
    ('M1 plus d\'horloge', JS, "if (points[i] && e.target === points[i].querySelector('i')) montrer(i + 1, 1);", "/* muté */", "il passe seul à l'autre appareil", B),
    ('M3 la souris ne le fait plus attendre', JS, "if (e.pointerType === 'mouse') arret('survol', true);", "/* muté */", 'la souris posée dessus le fait attendre', B),
    ('M4 hors de l\'écran, il tourne', JS, "arret('horsvue', !oui);", "arret('horsvue', false);", "hors de l'écran, il attend", T),
    ('M5 plus de glissement au doigt', JS, "if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) montrer(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);", "/* muté */", 'glisser à gauche', T),
    ('M7 « animations réduites » ignoré', JS, "enPause = !!(reduit && reduit.matches);", "enPause = false;", 'rien ne bouge seul', B),
    ('M8 l\'écran caché se charge', CSS, ".c-vue { position: absolute; inset: 0; display: none; }", ".c-vue { position: absolute; inset: 0; display: block; }", 'ne se chargent pas', SANS('index')),
    ('M9 l\'appareil des cartes coupé par le bas', CSS, ".grande-carte .bas { align-items: flex-end; padding: 30px 20px 40px; }",
     ".grande-carte .bas { align-items: flex-start; padding: 30px 20px 0; max-height: 420px; overflow: hidden; }", 'EN ENTIER', SANS('index')),
    ('M10 le téléphone plus haut que sa scène', CSS, "--ap-l: calc(var(--c-h) * 430 / 902); margin: 0; }", "--ap-l: calc(var(--c-h) * 430 / 600); margin: 0; }", 'EN ENTIER', SANS('elan')),
    ('M12 la scène ne coupe plus l\'appareil qui glisse', CSS, "container-type: size; overflow: hidden; overflow-x: clip; overflow-y: visible;", "container-type: size; overflow: visible;",
     'ne se voit jamais hors de sa scène', SANS('index')),
    ('M13 une page hors 3D montre du 3D', GEN, "  const neutre = !!METIERS[cle] && !m.trois;", "  const neutre = false;", 'que des écrans neutres', SANS('logiciel-plombier')),
    ('M14 l\'autre appareil ne se prépare plus', JS, "if (oui && !vu) { vu = true; setTimeout(function () { charger(vues[(i + 1) % n]); }, 700); }", "/* muté */",
     "l'autre sont chargés", SANS('applications')),
    ('M16 le Mac sans sa version de nuit', GEN, "srcset=\"${CAP}${nom}-nuit.webp 3024w, ${CAP}${nom}-nuit-1x.webp 1512w\"", "srcset=\"${CAP}${nom}-jour.webp 3024w, ${CAP}${nom}-jour-1x.webp 1512w\"",
     "l'écran suit le mode", SANS('index', 'bureau', 'dark')),
    ('M17 il glisse à l\'envers', JS, "c.classList.toggle('c-avant', vers > 0); c.classList.toggle('c-arriere', vers < 0);",
     "c.classList.toggle('c-avant', vers < 0); c.classList.toggle('c-arriere', vers > 0);", "il passe seul à l'autre appareil", T),
    ('M18 l\'écran préparé se voit déjà (deux appareils à l\'écran)', CSS, ".c-vue.c-prete { opacity: 0; }", ".c-vue.c-prete { opacity: 1; }", 'UN seul appareil', SANS('index')),
    ('M19 la page hors 3D prend les captures du 3D', GEN, "const NEUTRE_DE = { factures: 'facturesNeutre', compta: 'comptaNeutre' };", "const NEUTRE_DE = {};",
     'rien que des écrans neutres', SANS('logiciel-plombier')),
    ('M20 une case revient à un seul appareil', GEN, "  if (!POUR_LA_RACINE) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];", "  if (false) { const k = PAIRE_DE[v.mac || v.iphone || v.duo[0]];",
     'chaque case porte le Mac, puis le téléphone', SANS('elan')),
    ('M21 l\'horloge ne tourne plus (cachée pour de bon)', CSS, ".c-horloge { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }",
     ".c-horloge { display: none; }", "passent d'elles-mêmes du Mac au téléphone", SANS('elan')),
    ('M22 plus de vague : la grille bascule d\'un bloc', CSS, ".vue.alterne.c-anime .c-vue.c-on, .vue.alterne.c-anime .c-vue.c-sort { animation-delay: calc(var(--i, 0) * 70ms); }", "/* muté */",
     'en vague', SANS('elan')),
    # ⚠️ retirer la seule règle de carrousel.css ne change RIEN : site.css éteint toute animation de la page (`* { animation: none
    #  !important }`) — essayé le 9 octobre 2026, la mutation passait. Il faut retirer les DEUX gardes (fichiers et cibles en listes).
    ('M24 « animations réduites » : la glissade reprend le dessus', [CSS, SITE],
     ["[data-carrousel].c-anime.c-avant .c-vue.c-on, [data-carrousel].c-anime.c-avant .c-vue.c-sort,\n  [data-carrousel].c-anime.c-arriere .c-vue.c-on, [data-carrousel].c-anime.c-arriere .c-vue.c-sort { animation: none; }",
      "*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }"],
     ["/* muté */", "*, *::before, *::after { transition: none !important; scroll-behavior: auto !important; }"],
     'SANS glisser', T),
    ('M26 les appareils se chevauchent en glissant', CSS, "@keyframes c-entre-avant { from { transform: translateX(100%); } to { transform: none; } }",
     "@keyframes c-entre-avant { from { transform: translateX(30%); } to { transform: none; } }", 'ne se chevauchent jamais', SANS('index')),
    ('M27 les pastilles se voient', CSS, ".c-horloge { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; }",
     ".c-horloge { display: flex; gap: 8px; justify-content: center; padding: 18px; }", 'rien à voir ni à toucher', SANS('index')),
    ('M28 le téléphone avant le Mac', GEN, "  const ecrans = [cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles })), cadreIphone(ecranIphone(i, altIphone(i)))];",
     "  const ecrans = [cadreIphone(ecranIphone(i, altIphone(i))), cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles }))];", 'le Mac puis le téléphone', SANS('index')),
    ('M29 un carrousel qui fait défiler plusieurs écrans', GEN, "  const ecrans = [cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles })), cadreIphone(ecranIphone(i, altIphone(i)))];",
     "  const ecrans = [cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles })), cadreIphone(ecranIphone(i, altIphone(i))), cadreMac(ecranMac('mac-tableau', altMac('mac-tableau'), { tailles })), cadreIphone(ecranIphone('iphone-tableau', altIphone('iphone-tableau')))];",
     'DEUX écrans', SANS('index')),
    # — le banc (tests/test-835.js) : ses gardes de l'aperçu, remises en défaut par le générateur —
    ('B1 (banc) le téléphone avant le Mac', GEN, "  const ecrans = [cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles })), cadreIphone(ecranIphone(i, altIphone(i)))];",
     "  const ecrans = [cadreIphone(ecranIphone(i, altIphone(i))), cadreMac(ecranMac(m, altMac(m), { tot: o.tot, tailles }))];", 'UNE paire', BANC),
    ('B2 (banc) la légende revient', GEN, "    + horloge(ecrans.length) + '</div>';", "    + horloge(ecrans.length) + '<p class=\"c-legende\">' + fr(t) + '</p></div>';", 'ni légende', BANC),
    ('B3 (banc) une case sans horloge', GEN, "      + ecrans.map((x, j) => `<span class=\"c-vue${j ? '' : ' c-on'}\">${x}</span>`).join('') + '</span></span>' + horloge(ecrans.length) + '</span>'; }",
     "      + ecrans.map((x, j) => `<span class=\"c-vue${j ? '' : ' c-on'}\">${x}</span>`).join('') + '</span></span>' + '</span>'; }", 'son horloge invisible', BANC),
    ('B4 (banc) les deux cartes, le même écran', GEN, ": carPaire(paireDe(nom), { carte: true })}", ": carPaire(paireDe(m.duo[0][3]), { carte: true })}", 'les cartes montrent des écrans différents', BANC),
    ('B5 (banc) une case, le téléphone d\'un autre écran', GEN, "    const ecrans = [cadreMac(ecranMac(PAIRES[k][0], alt, { tailles: VUE_TAILLES.mac })), cadreIphone(ecranIphone(PAIRES[k][1], alt))];",
     "    const ecrans = [cadreMac(ecranMac(PAIRES[k][0], alt, { tailles: VUE_TAILLES.mac })), cadreIphone(ecranIphone(PAIRES.tableau[1], alt))];", 'sur le MÊME écran', BANC),
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
