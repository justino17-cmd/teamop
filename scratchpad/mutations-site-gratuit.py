import subprocess, re, sys
W = sys.argv[1]
GEN = 'scripts/site-marine.js'
M = [
 ('S1 le Gratuit revient dans les formules', GEN, "const FORMULES_GESTION = [\n", "const FORMULES_GESTION = [\n  F('gratuit', 'Gratuit', '0', '€ pour toujours', '1 utilisateur', 'Pour découvrir.', 'Inclus', ['Planning']),\n", ['835', '846']),
 ('S2 la jauge 7 h / 9 h revient', GEN, "par rapport à sa capacité (sept heures au départ, réglable sur sa fiche) : orange aux trois quarts, rouge quand la journée est pleine.", ": au-delà de sept heures elle passe à l'orange, au-delà de neuf au rouge.", ['846']),
 ('S3 « Le plus choisi » revient', GEN, "'Support prioritaire'], true),", "'Support prioritaire'], true, 'Le plus choisi'),", ['846']),
 ('S4 « 3 mois offerts sur chaque future application » revient', GEN, "'Votre logo et votre couleur d\\'entreprise, pour toute l\\'équipe', 'Création sur mesure", "'Votre logo et votre couleur d\\'entreprise, pour toute l\\'équipe', '3 mois offerts sur chaque future application', 'Création sur mesure", ['846']),
 ('S5 la page OP MESSAGES reprend les icônes TEAM OP', GEN, "const ICONES = cle => cle === 'opmessages'", "const ICONES = cle => cle === 'aucune-page'", ['835']),
 ('S6 la carte Pro de la page stock ne dit plus « Pas de »', GEN, "\"Pas de stock dans Pro : le planning,", "\"Dans Pro : le planning,", ['846']),
 ('S7 la page de paiement reprend un Gratuit', 'recap-abonnement.html', "  pro: {\n    groupe: 'gestion',", "  gratuit: {\n    groupe: 'gestion',\n    nom: 'Gratuit',\n    desc: 'Pour découvrir',\n    prixMensuel: 0,\n    utilisateurs: 1,\n    couleur: 'var(--m-link)',\n    fond: 'none',\n    badge: null,\n    boutonTexte: 'Créer mon compte gratuit',\n    boutonFond: 'var(--m-accent)',\n    droits: []\n  },\n  pro: {\n    groupe: 'gestion',", ['837', '846']),
 ('S8 un ancien lien « ?formule=gratuit » n\'ouvre plus Pro', 'recap-abonnement.html', "if (formuleActive === 'gratuit') formuleActive = 'pro';", "", ['837', '839']),
]
res = []
for nom, f, a, b, tests in M:
    p = W + '/' + f
    s = open(p, encoding='utf-8').read()
    if s.count(a) != 1:
        res.append((nom, 'MOTIF %d' % s.count(a))); continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b, 1))
    if f == GEN:
        subprocess.run(['node', GEN, '--racine'], cwd=W, capture_output=True); subprocess.run(['node', GEN], cwd=W, capture_output=True)
    else:
        subprocess.run(['bash', 'scripts/apercu.sh', 'portail'], cwd=W, capture_output=True)
    out = []
    for t in tests:
        try:
            r = subprocess.run(['node', 'tests/test-%s.js' % t], cwd=W, capture_output=True, text=True, timeout=300)
            tot = re.findall(r'(\d+) ✓\s+(\d+) ✗', r.stdout + r.stderr)
            out.append('%s:%d(%s)' % (t, r.returncode, (tot[-1][1] + '✗') if tot else '?'))
        except subprocess.TimeoutExpired:
            out.append(t + ':DÉLAI')
    subprocess.run(['git', 'checkout', '--', '.'], cwd=W)
    res.append((nom, ' '.join(out)))
for nom, r in res:
    mord = bool(re.search(r':1\(', r))
    print(('MORD   ' if mord else 'RATE   ') + nom + ' → ' + r)
d = subprocess.run(['git', 'status', '--short'], cwd=W, capture_output=True, text=True).stdout
print('état restant :', repr(d))
