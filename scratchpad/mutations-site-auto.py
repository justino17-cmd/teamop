# Mutations du site « jour / nuit automatique » (Justin, 29 septembre 2026 : « Sur le site je veux pas le bouton jour
# nuit je veux que sa soit automatique »). Chaque mutation remet UN morceau de l'ancien bouton ou du mode forcé, et
# tests/test-835.js ou tests/test-836.js doit tomber. Usage, dans un arbre à part au code COMMITÉ (CLAUDE.md : commit
# avant mutation) :  python3 scratchpad/mutations-site-auto.py <racine de l'arbre>
import subprocess, sys, os, re
R = sys.argv[1]
def sh(c, t=300): return subprocess.run(c, shell=True, cwd=R, capture_output=True, text=True, timeout=t)
assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'arbre sale'
BOUTON = """<button class="mode" type="button" hidden aria-label="Passer en mode nuit" title="Passer en mode nuit"><svg class="lune" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="soleil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg></button>"""
REGEN = 'node scripts/site-marine.js >/dev/null && node scripts/site-marine.js --racine >/dev/null'
FIN = None   # l'ajout se fait en fin de fichier
TOUS_TETE = '*TETE*'   # tous les fichiers suivis qui portent la tête du mode
M = [
 ('S1', 'le bouton remis dans UNE page juridique', 'mentions-legales.html', '<div class="barre-droite"><a class="btn-retour"', '<div class="barre-droite">' + BOUTON + '<a class="btn-retour"'),
 ('S2', 'le script mode.js remis dans le portail', 'espace.html', '</body>', '<script src="/vitrine/v2/mode.js" defer></script>\n</body>'),
 ('S3', 'la nuit forcée remise dans site.css', 'vitrine/v2/site.css', '@media (prefers-color-scheme: dark) {\n  :root {', '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {'),
 ('S4', 'la nuit forcée remise dans theme.css', 'vitrine/v2/theme.css', '@media (prefers-color-scheme: dark) {\n  :root {', '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {'),
 ('S5', 'mode.js ne retire plus le mode posé par une vieille page', 'vitrine/v2/mode.js', "  document.documentElement.removeAttribute('data-theme');\n", ''),
 ('S6', 'mode.js rebranche un bouton', 'vitrine/v2/mode.js', "})();\n", "  var b = document.querySelector('.mode'); if (b) b.addEventListener('click', function () {});\n})();\n"),
 ('S7', 'la tête relit le choix et force le mode (générateur)', 'scripts/site-marine.js', "(function () { try { localStorage.removeItem('teamop_site_mode'); } catch (e) {} })();", "(function () { try { var m = localStorage.getItem('teamop_site_mode'); if (m === 'nuit') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {} })();"),
 ('S8', "la tête n'efface plus l'ancien choix (générateur)", 'scripts/site-marine.js', "try { localStorage.removeItem('teamop_site_mode'); } catch (e) {}", "try { } catch (e) {}"),
 ('S9', "le bouton remis dans l'en-tête du site (générateur)", 'scripts/site-marine.js', '<div class="nav-droite"><a class="pilule"', '<div class="nav-droite">' + BOUTON + '<a class="pilule"'),
 ('S10', "une ligne de plus dans la tête d'une page juridique", 'sous-traitance.html', '<meta name="color-scheme" content="light dark">\n', '<meta name="color-scheme" content="light dark">\n<meta name="x" content="y">\n'),
 ('S11', "la tête d'une page du portail relit le choix", 'connexion.html', "(function () { try { localStorage.removeItem('teamop_site_mode'); } catch (e) {} })();", "(function () { try { var m = localStorage.getItem('teamop_site_mode'); if (m === 'nuit') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {} })();"),
 ('S12', 'la règle du bouton remise dans theme.css', 'vitrine/v2/theme.css', '/* ── la marque : le même dessin', '.mode { width: 44px; height: 44px; }\n/* ── la marque : le même dessin'),
 ('S13', 'le bouton remis dans le coin de la page de remerciement', 'merci.html', '<body>\n', '<body>\n  <div class="coin-mode">' + BOUTON + '</div>\n'),
 # ── ce que la relecture adverse du 29 septembre au soir a fait passer à travers les bancs d'avant (tests/mode-site.js) ──
 ('S14', 'un bouton « mode on » dans l\'en-tête du site (générateur, pages régénérées)', 'scripts/site-marine.js', '<div class="nav-droite"><a class="pilule"', '<div class="nav-droite"><button class="mode on" type="button" aria-label="Passer en mode nuit">☾</button><a class="pilule"', REGEN),
 ('S15', 'un bouton sans classe, son dessin ☾ seul (générateur, pages régénérées)', 'scripts/site-marine.js', '<div class="nav-droite"><a class="pilule"', '<div class="nav-droite"><button id="bascule" type="button">☾</button><a class="pilule"', REGEN),
 ('S16', 'un bouton « mode on » dans une page juridique, sans changer ses lignes', 'mentions-legales.html', '<body>', '<body><button class="mode on" type="button">☾</button>'),
 ('S17', 'mode.js remis dans le portail, sans barre initiale', 'espace.html', '</body>', '<script src="vitrine/v2/mode.js" defer></script>\n</body>'),
 ('S18', 'la tête du site réduite au seul script (les couleurs de barre et color-scheme perdues)', 'scripts/site-marine.js', '\n${TETE_MODE}\n', "\n<script>(function () { try { localStorage.removeItem('teamop_site_mode'); } catch (e) {} })();</script>\n", REGEN),
 ('S19', 'un second :root en fin de site.css (le jour en noir)', 'vitrine/v2/site.css', FIN, '\n:root { --bg: #000; --text: #fff; }\n'),
 ('S20', 'un second bloc de nuit en fin de theme.css (la nuit en blanc)', 'vitrine/v2/theme.css', FIN, '\n@media (prefers-color-scheme: dark) { :root { --m-bg: #fff; --m-text: #000; } }\n'),
 ('S21', 'color-scheme « light » seul dans site.css', 'vitrine/v2/site.css', 'color-scheme: light dark;', 'color-scheme: light;'),
 ('S22', 'html { color-scheme: light } en fin de theme.css', 'vitrine/v2/theme.css', FIN, '\nhtml { color-scheme: light; }\n'),
 ('S23', 'la meta color-scheme à « light » dans la tête (générateur)', 'scripts/site-marine.js', '<meta name="color-scheme" content="light dark">', '<meta name="color-scheme" content="light">'),
 ('S24', 'mode.js commenté par // (il ne fait plus rien)', 'vitrine/v2/mode.js', "  try { localStorage.removeItem('teamop_site_mode'); } catch (e) {}\n  document.documentElement.removeAttribute('data-theme');", "  // try { localStorage.removeItem('teamop_site_mode'); } catch (e) {}\n  // document.documentElement.removeAttribute('data-theme');"),
 ('S25', 'mode.js sort avant de rien faire (return)', 'vitrine/v2/mode.js', "  'use strict';\n", "  'use strict';\n  return;\n"),
 ('S26', 'le script de la tête rendu inerte (type="text/plain"), dans TOUTES les pages et le générateur', TOUS_TETE, "<script>/* le jour et la nuit suivent l'appareil", "<script type=\"text/plain\">/* le jour et la nuit suivent l'appareil"),
 ('S27', 'un texte figé en sombre dans site.css', 'vitrine/v2/site.css', FIN, '\n.pilule { color: #0b1426; }\n'),
 ('S28', 'un fond « white » dans site.css', 'vitrine/v2/site.css', FIN, '\n.tuile-f { background: white; }\n'),
 ('S29', 'un fond en dur, PREMIÈRE règle d\'un @media, dans site.css', 'vitrine/v2/site.css', FIN, '\n@media (max-width:600px){ .tuile-f{ background:#123456; } }\n'),
 ('S30', 'un fond blanc en dur dans theme.css', 'vitrine/v2/theme.css', FIN, '\n.carte { background:#fff; }\n'),
 ('S31', 'la garde de l\'ancien bouton retirée de site.css', 'vitrine/v2/site.css', '.mode, .coin-mode { display: none !important; }\n', ''),
 ('S32', 'la garde de l\'ancien bouton retirée de theme.css', 'vitrine/v2/theme.css', '.mode, .coin-mode { display: none !important; }\n', ''),
 ('S33', 'un bouton ☾ dans une page hors des deux listes (guide-email.html : le recensement)', 'guide-email.html', '<body>', '<body><button type="button" aria-label="Passer en mode nuit">☾</button>'),
]
mord = 0
for (k, t, f, old, new, *apres) in M:
    fichiers = [f]
    if f == TOUS_TETE:
        fichiers = [x for x in sh('git ls-files "*.html" scripts/site-marine.js').stdout.split() if old in open(os.path.join(R, x), encoding='utf-8').read()]
    absent = False
    for x in fichiers:
        p = os.path.join(R, x); s = open(p, encoding='utf-8').read()
        if old is FIN: s = s + new
        elif s.count(old) < 1: absent = True; break
        else: s = s.replace(old, new) if f == TOUS_TETE else s.replace(old, new, 1)
        open(p, 'w', encoding='utf-8').write(s)
    if absent: print(f'⚠ {k} ancre absente'); sh('git checkout -- .'); continue
    if apres: r0 = sh(apres[0]); assert r0.returncode == 0, r0.stderr
    d = sh('git diff --stat').stdout.strip().split('\n')[-1]
    res, bite = [], False
    for b in ['835', '836']:
        r = sh(f'node tests/test-{b}.js')
        tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
        res.append(f'test-{b}: code {r.returncode}, {tot[-1][1] if tot else "?"} ✗')
        if r.returncode != 0: bite = True
    mord += bite
    print(('✓ MORD ' if bite else '✗ NE MORD PAS ') + k + ' · ' + t + ' · ' + d + ' · ' + ' · '.join(res), flush=True)
    sh('git checkout -- .')
    assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'restauration ratée'
print(f'{mord}/{len(M)} mordent')
