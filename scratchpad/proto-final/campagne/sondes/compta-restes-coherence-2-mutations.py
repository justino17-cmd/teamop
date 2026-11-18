#!/usr/bin/env python3
# Mutations sur COPIES (jamais sur les pages livrées) : la sonde compta-restes-coherence-2.js doit tomber sur CHACUNE. usage : python3 compta-restes-coherence-2-mutations.py [numéros]
# 1x = le reçu sur place (hôte et cadre), 2x = le crédit de TVA, 3x = la promesse des heures. Chaque mutation dit sa page et sa ligne ; les pages livrées sont comparées par empreinte avant / après.
import hashlib, os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SONDE = os.path.join(os.path.dirname(__file__), 'compta-restes-coherence-2.js')
HOTE, CADRE = 'prototype-op-gestion.html', 'prototype-comptabilite.html'
MUT = [
 ('1a l\'hôte n\'envoie plus le reçu au cadre', HOTE, "    recus:cpPaieTerrain().map(e => ({ id:e.int,", "    recus:[].map(e => ({ id:e.int,"),
 ('1b le cadre pose le reçu sans sa TVA collectée', CADRE, "tva > 0 && ['445710', null, 0, tva, 'TVA collectée · ' + piece, { taux:+r.tva, base:ht }]", "false"),
 ('1c le reçu repris à la facture n\'est plus contrepassé (compté deux fois)', CADRE, "!e.contrePar && e.etat !== 'supprimee' && !voulus.has(e.recuSP)", "!e.contrePar && e.etat !== 'supprimee' && false"),
 ('1d le moyen de paiement du reçu est ignoré (toujours la caisse)', CADRE, "const tres = { carte:'467100', chq:'511200', esp:'530000', vir:'512000' }[mode], j = { carte:'PS', chq:'BQ', esp:'CA', vir:'BQ' }[mode];", "const tres = '530000', j = 'CA';"),
 ('1e le reçu est compté en chiffre d\'affaires au lieu d\'un acompte (706000)', CADRE, "['419100', null, 0, ht, 'Acompte reçu · '", "['706000', null, 0, ht, 'Acompte reçu · '"),
 ('2a le solde négatif ne se dit jamais crédit', CADRE, "const credit = !!T && T.credit > 0 && !(T.due > 0),", "const credit = false,"),
 ('2b l\'écran TVA garde « À payer à l\'État » pour un crédit', CADRE, "<div class=\"tot\"><span>${Z.mot}</span>", "<div class=\"tot\"><span>À payer à l’État</span>"),
 ('2c la tuile VIVANTE de l\'accueil garde « TVA d\'octobre » pour un crédit', CADRE, "${kpi('tva', tvaZ.mois, tvaZ.eur,", "${kpi('tva', 'TVA d’octobre', tvaZ.eur,"),
 ('2d la TVA arrêtée dit « à payer » pour un crédit', CADRE, "${tvaDit(T).credit ? 'Crédit de ' + tvaDit(T).eur + ' (l’État te doit cette somme)' : tvaDit(T).eur + ' à payer'}", "${tvaDit(T).eur + ' à payer'}"),
 ('2e un solde à PAYER se dit « crédit » (contre-épreuve)', CADRE, "const credit = !!T && T.credit > 0 && !(T.due > 0),", "const credit = true,"),
 ('3a la liste « À faire » promet de nouveau les heures d\'OP GESTION', CADRE, "opcSi('Les fiches se calculent avec les heures validées dans OP GESTION.', 'Les fiches se calculent en fin de mois, avec les heures, les absences et les primes d’octobre.')", "'Les fiches se calculent avec les heures validées dans OP GESTION.'"),
 ('3b la fiche de paie promet de nouveau les heures d\'OP GESTION', CADRE, "opcSi('Calculée toute seule avec les heures validées dans OP GESTION.', 'Calculée toute seule avec les heures, les absences et les primes d’octobre.')", "'Calculée toute seule avec les heures validées dans OP GESTION.'"),
 ('3c la rubrique Paie promet de nouveau les heures d\'OP GESTION', CADRE, "opcSi('Les heures pointées et validées dans OP GESTION deviennent les fiches de paie. ', 'Les heures, les absences et les primes du mois deviennent les fiches de paie. ')", "'Les heures pointées et validées dans OP GESTION deviennent les fiches de paie. '"),
 ('3d « Heures du mois reçues d\'OP GESTION » revient', CADRE, "[opcSi('Heures du mois reçues d’OP GESTION', 'Heures du mois'), true,", "['Heures du mois reçues d’OP GESTION', true,"),
]
def h(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
avant = {n: h(os.path.join(R, 'apercu', n)) for n in os.listdir(os.path.join(R, 'apercu')) if n.endswith('.html')}
choix = set(sys.argv[1:]); nok = 0
for nom, page, a, b in MUT:
    if choix and nom.split()[0] not in choix: continue
    d = tempfile.mkdtemp(prefix='mut-rc2-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', page); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('MAL VISÉE', nom, s.count(a)); nok += 1; shutil.rmtree(d, ignore_errors=True); continue
    ligne = s.count('\n', 0, s.index(a)) + 1
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    r = subprocess.run(['node', SONDE], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); tombe = r.returncode == 1 and m and int(m[-1][1]) > 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom + ' (' + page[10:-5] + ' l.' + str(ligne) + ')', m[-1] if m else r.stdout[-200:] + r.stderr[-200:], sorted(set(re.findall(r'  ✗ (\w+)', r.stdout)))); nok += 0 if tombe else 1
    shutil.rmtree(d, ignore_errors=True)
apres = {n: h(os.path.join(R, 'apercu', n)) for n in avant}
print('pages livrées inchangées par les mutations :', 'oui' if apres == avant else 'NON')
sys.exit(1 if nok or apres != avant else 0)
