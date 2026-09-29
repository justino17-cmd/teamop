# Mutations du référencement (Justin, 29 septembre 2026 : « Fais l'optimisation SEO avec les fichiers fournis »). Chaque
# mutation défait UNE garde — canonique, Open Graph, JSON-LD, plan du site, robots, menu Métiers, pages métier, lignes des
# pages juridiques, un H1 — et tests/test-846.js (ou test-835/836) doit tomber. Usage, dans un arbre à part au code COMMITÉ
# (CLAUDE.md : commit avant mutation) :  python3 scratchpad/mutations-seo.py <racine de l'arbre>
import subprocess, sys, os, re
R = sys.argv[1]
def sh(c, t=600): return subprocess.run(c, shell=True, cwd=R, capture_output=True, text=True, timeout=t)
assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'arbre sale'
REGEN = 'node scripts/site-marine.js >/dev/null && node scripts/site-marine.js --racine >/dev/null'
FIN = None
G = 'scripts/site-marine.js'
M = [
 ('Q1', 'plus d\'adresse canonique (générateur)', G, '  return `<link rel="canonical" href="${u}">\n', '  return `\n', REGEN),
 ('Q2', 'l\'accueil canonique en « /index.html »', G, "const urlDe = cle => SITE_URL + (cle === 'index' ? '' : cle + '.html');", "const urlDe = cle => SITE_URL + cle + '.html';", REGEN),
 ('Q3', 'le JSON-LD sur toutes les pages', G, "+ (cle === 'index' ? `<script type=\"application/ld+json\">", "+ (true ? `<script type=\"application/ld+json\">", REGEN),
 ('Q4', 'un prix du JSON-LD recopié à la main (et faux)', G, "offers: FORMULES_GESTION.map(f => ({ '@type': 'Offer', name: f.nom, price: f.prix, priceCurrency: 'EUR' }))", "offers: FORMULES_GESTION.map(f => ({ '@type': 'Offer', name: f.nom, price: f.prix === '15' ? '19' : f.prix, priceCurrency: 'EUR' }))", REGEN),
 ('Q5', 'l\'image de partage désigne un fichier qui n\'existe pas', G, "vitrine/v2/captures/mac-tableau-jour-1x.webp'", "vitrine/v2/captures/partage.jpg'", REGEN),
 ('Q6', 'le menu Métiers ramené aux ancres de metiers.html', G, "L('Plomberie', 'logiciel-plombier.html')", "L('Plomberie', 'metiers.html#m-plomberie')", REGEN),
 ('Q7', 'les pages métier hors du plan du site', G, "Object.keys(PAGES).map(c => u(urlDe(c),", "Object.keys(PAGES).filter(c => !/^logiciel/.test(c)).map(c => u(urlDe(c),", REGEN),
 ('Q8', 'robots.txt ferme tout le site', 'robots.txt', 'Allow: /\n', 'Disallow: /\n'),
 ('Q9', 'robots.txt ne désigne plus le plan du site', 'robots.txt', 'Sitemap: https://teamop.fr/sitemap.xml\n', ''),
 ('Q10', 'les balises d\'une page juridique sur une LIGNE À ELLE (les lignes citées se décalent)', 'mentions-legales.html', '</title> <meta name="description"', '</title>\n<meta name="description"'),
 ('Q11', 'une page voisine canonique sur une AUTRE page', 'confidentialite.html', '<link rel="canonical" href="https://teamop.fr/confidentialite.html">', '<link rel="canonical" href="https://teamop.fr/mentions-legales.html">'),
 ('Q12', 'deux pages avec la même description', 'reinit.html', 'content="Choisissez un nouveau mot de passe pour votre compte TEAM OP, depuis le lien reçu par e-mail."', 'content="Connexion à l&#39;espace de votre entreprise sur TEAM OP : entrez son adresse, teamop.fr/e/ suivi de son nom, puis vos identifiants."'),
 ('Q13', 'une page métier promet le « temps réel »', G, "chaque plombier travaille sur son téléphone, et les changements arrivent chez les autres en quelques secondes", "chaque plombier travaille sur son téléphone, et les changements arrivent chez les autres en temps réel", REGEN),
 ('Q14', 'la page plombier parle de box', G, "Raccords, flexibles, cartouches, joints : suivez vos pièces", "Raccords, flexibles, cartouches, joints : suivez chaque box", REGEN),
 ('Q15', 'un second H1 dans les pages métier', G, "<h2 class=\"h2 moyen\">${fr('Quelle formule choisir ?')}</h2>", "<h1 class=\"h2 moyen\">${fr('Quelle formule choisir ?')}</h1>", REGEN),
 ('Q16', 'un titre de page métier au-delà de 60 caractères', G, 'titre: "Logiciel anti-nuisibles 3D : registre sanitaire | TEAM OP",', 'titre: "Logiciel anti-nuisibles 3D : registre et interventions | TEAM OP",', REGEN),
 ('Q17', 'l\'aperçu reçoit une adresse canonique', G, "${racine ? teteSeo(cle) : ''}", "${teteSeo(cle)}", REGEN),
 ('Q18', 'une page du dépôt perd lang="fr"', 'guide-email.html', '<html lang="fr"', '<html'),
 ('Q19', 'la page 404 reçoit une adresse canonique', '404.html', '<title>TEAM OP</title>', '<title>TEAM OP</title> <link rel="canonical" href="https://teamop.fr/404.html">'),
 # Q20 retire LES DEUX liens (la scène ET les actions du bas) : n'en retirer qu'un laissait l'autre, et la page restait juste.
 ('Q20', 'les pages métier sans aucun lien vers les tarifs', G, '<a class="lien-suite" href="tarifs.html">Voir les tarifs ›</a>', '', REGEN),
 ('Q21', 'une capture de l\'entreprise 3D sur la page plombier', G, "'iphone-factures', \"OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser\"],\n      [\"En fin de journée\", \"Chaque encaissement, à sa place.\", \"Ce qui était prévu, ce qui est encaissé, l'écart du jour.\", 'iphone-compta', \"OP GESTION sur un iPhone : le contrôle des encaissements du jour\"]],\n    blocs: [\n      [\"Une fiche d'intervention prête pour la plomberie.\"", "'iphone-intervention', \"OP GESTION sur un iPhone : les factures, ce qui est encaissé et ce qui reste à encaisser\"],\n      [\"En fin de journée\", \"Chaque encaissement, à sa place.\", \"Ce qui était prévu, ce qui est encaissé, l'écart du jour.\", 'iphone-compta', \"OP GESTION sur un iPhone : le contrôle des encaissements du jour\"]],\n    blocs: [\n      [\"Une fiche d'intervention prête pour la plomberie.\"", REGEN),
 ('Q22', 'le prix d\'une formule recopié à la main sur les pages métier (et faux)', G, "['Pro', prixDe('pro') + ' € TTC", "['Pro', '19' + ' € TTC", REGEN),
 ('Q23', 'le plan du site nomme une page qui n\'existe pas', G, "const HORS_GENERATEUR = [['confidentialite.html', '0.2'], ['mentions-legales.html', '0.2']];", "const HORS_GENERATEUR = [['confidentialite.html', '0.2'], ['mentions-legales.html', '0.2'], ['blog.html', '0.5']];", REGEN),
 ('Q24', 'une page métier perd son entrée dans le menu (et donc le pied)', G, ", L('Chauffage / Climatisation', 'logiciel-chauffage-climatisation.html')", '', REGEN),
]
mord = 0
SEULES = [x for x in os.environ.get('SEULES', '').split(',') if x]
for (k, t, f, old, new, *apres) in M:
    if SEULES and k not in SEULES: continue
    p = os.path.join(R, f); s = open(p, encoding='utf-8').read()
    if old is FIN: s = s + new
    elif s.count(old) < 1: print(f'⚠ {k} ancre absente', flush=True); continue
    else: s = s.replace(old, new) if k == 'Q20' else s.replace(old, new, 1)
    open(p, 'w', encoding='utf-8').write(s)
    if apres:
        r0 = sh(apres[0])
        if r0.returncode != 0: print(f'   ({k} : la régénération a échoué — {r0.stderr.strip()[:120]})')
    d = sh('git diff --stat').stdout.strip().split('\n')[-1]
    res, bite = [], False
    for b in ['846', '835', '836']:
        r = sh(f'node tests/test-{b}.js')
        tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
        res.append(f'test-{b}: code {r.returncode}, {tot[-1][1] if tot else "?"} ✗')
        if r.returncode != 0: bite = True
    mord += bite
    print(('✓ MORD ' if bite else '✗ NE MORD PAS ') + k + ' · ' + t + ' · ' + d + ' · ' + ' · '.join(res), flush=True)
    sh('git checkout -- .'); sh('git clean -fdq -- "*.html" sitemap.xml robots.txt apercu/site 2>/dev/null')
    assert sh('git status --short | grep -v "^??"').stdout.strip() == '', 'restauration ratée'
print(f'{mord}/{len(M)} mordent')
