# Mutations du site « jour / nuit automatique » (Justin, 29 septembre 2026 : « Sur le site je veux pas le bouton jour
# nuit je veux que sa soit automatique »). Chaque mutation remet UN morceau de l'ancien bouton ou du mode forcé, et
# tests/test-835.js ou tests/test-836.js doit tomber. Usage, dans un arbre à part au code COMMITÉ (CLAUDE.md : commit
# avant mutation) :  python3 scratchpad/mutations-site-auto.py <racine de l'arbre>
import subprocess, sys, os, re
R = sys.argv[1]
def sh(c, t=300): return subprocess.run(c, shell=True, cwd=R, capture_output=True, text=True, timeout=t)
assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'arbre sale'
BOUTON = """<button class="mode" type="button" hidden aria-label="Passer en mode nuit" title="Passer en mode nuit"><svg class="lune" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="soleil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg></button>"""
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
]
mord = 0
for (k, t, f, old, new) in M:
    p = os.path.join(R, f); s = open(p, encoding='utf-8').read()
    if s.count(old) < 1: print(f'⚠ {k} ancre absente'); continue
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    d = sh('git diff --stat').stdout.strip().split('\n')[-1]
    res, bite = [], False
    for b in ['835', '836']:
        r = sh(f'node tests/test-{b}.js')
        tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
        res.append(f'test-{b}: code {r.returncode}, {tot[-1][1] if tot else "?"} ✗')
        if r.returncode != 0: bite = True
    mord += bite
    print(('✓ MORD ' if bite else '✗ NE MORD PAS ') + k + ' · ' + t + ' · ' + d + ' · ' + ' · '.join(res), flush=True)
    sh(f'git checkout -- {f}')
    assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'restauration ratée'
print(f'{mord}/{len(M)} mordent')
