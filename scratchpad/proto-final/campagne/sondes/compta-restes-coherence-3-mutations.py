#!/usr/bin/env python3
# Mutations sur COPIES (jamais sur les pages livrées) : la sonde compta-restes-coherence-3.js doit tomber sur CHACUNE. usage : python3 compta-restes-coherence-3-mutations.py [préfixes : h1 r2 …]
# h = l'hôte et le crédit de TVA, r = le plafond d'un reçu, p = la promesse sur les paies, t = la double négation, e = la règle du crédit (« l'État te doit »). Chaque mutation dit sa page et sa ligne ; les pages livrées sont comparées par empreinte avant / après.
import hashlib, os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SONDE = os.path.join(os.path.dirname(__file__), 'compta-restes-coherence-3.js')
HOTE, CADRE = 'prototype-op-gestion.html', 'prototype-comptabilite.html'
MUT = [
 ("h1 le solde négatif n'est plus dit crédit (cpTvaDit)", 'prototype-op-gestion.html', 'const credit = tv.aPayer < 0, m = Math.abs(tv.aPayer);', 'const credit = false, m = tv.aPayer;'),
 ("h2 l'écran TVA de l'hôte redit « à payer » pour un crédit", 'prototype-op-gestion.html', "<h3>${cpTvaDit(tv).credit ? 'Crédit de TVA d’octobre · ' : 'TVA d’octobre · à payer '}${cpTvaDit(tv).eur}</h3>", '<h3>TVA d’octobre · à payer ${eur(tv.aPayer)}</h3>'),
 ('h3 la liste de normes redit « à déclarer et payer » pour un crédit', 'prototype-op-gestion.html', "d:`${cpTvaDit(tv).credit ? 'Crédit de TVA de ' + cpTvaDit(tv).eur + ' : rien à payer en novembre, il se reporte sur ta prochaine déclaration (à déclarer quand même, avant ta date limite).' : eur(tv.aPayer) + ' à déclarer et payer en novembre, avant ta date limite.'} Elle", 'd:`${eur(tv.aPayer)} à déclarer et payer en novembre, avant ta date limite. Elle'),
 ("h4 le KPI de l'ancienne vue (recouverte) lit de nouveau tv.aPayer sans la règle (garde par le source)", 'prototype-op-gestion.html', '<b style="color:var(--${cpTvaDit(tv).credit ? \'vert\' : \'orange\'})">${cpTvaDit(tv).eur}</b><span>${cpTvaDit(tv).titre}${cpTvaDit(tv).credit ? \' · se reporte\' : \'\'}</span>', '<b style="color:var(--orange)">${eur(tv.aPayer)}</b><span>TVA d’octobre à payer en novembre</span>'),
 ('h5 un solde POSITIF se dit crédit (contre-épreuve)', 'prototype-op-gestion.html', 'const credit = tv.aPayer < 0, m = Math.abs(tv.aPayer);', 'const credit = true, m = Math.abs(tv.aPayer);'),
 ('h6 la liste « à faire » montre le solde négatif tel quel', 'prototype-op-gestion.html', "cpTvaDit(tv).m, 'Voir la TVA'", "tv.aPayer, 'Voir la TVA'"),
 ("r1 le plafond n'est plus lu côté hôte (le reçu de 1e9 € recompte)", 'prototype-op-gestion.html', 'ttc:(paiementTropGros(P.montant) ? 0 : parseFloat', 'ttc:(false ? 0 : parseFloat'),
 ("r2 la saisie d'un reçu absurde n'est plus refusée", 'prototype-op-gestion.html', "if (paiementTropGros(t.value)) { Pm.montant = '';", "if (false) { Pm.montant = '';"),
 ("r3 le cadre n'a plus de plafond propre", 'prototype-comptabilite.html', '+r.ttc <= (+max > 0 ? +max : 1e6)', '+r.ttc <= 1e12'),
 ("r4 l'hôte n'envoie plus le plafond au cadre (deux constantes)", 'prototype-op-gestion.html', '    recuMax:PAIEMENT_MAX,\n', ''),
 ('r5 le plafond est trop bas (1000 € refusés)', 'prototype-op-gestion.html', 'const PAIEMENT_MAX = 1e6;', 'const PAIEMENT_MAX = 500;'),
 ("r6 le cadre refuse un reçu d'exactement le plafond", 'prototype-comptabilite.html', '+r.ttc <= (+max > 0 ? +max : 1e6)', '+r.ttc < (+max > 0 ? +max : 1e6)'),
 ('p1 la paie du cadre redit « toutes les heures sont validées » en mode application', 'prototype-comptabilite.html', "'Les heures du mois sont toutes saisies'), d:", "'Toutes les heures du mois sont validées'), d:"),
 ('p2 la paie du cadre redit « 4 semaines complètes » en mode application', 'prototype-comptabilite.html', "'6 salariés : les heures, les absences et les primes d’octobre sont saisies ici ; la liaison avec OP GESTION n’envoie pas les heures.')", "'6 salariés, 4 semaines complètes et la dernière jusqu’au 31.')"),
 ('p3 la démonstration perd son récit (contre-épreuve)', 'prototype-comptabilite.html', "opcSi('Toutes les heures du mois sont validées dans OP GESTION', 'Les heures du mois", "opcSi('Les heures sont validées', 'Les heures du mois"),
 ('t1 la TVA payée sur les achats redevient « − X » (signe moins)', 'prototype-comptabilite.html', 'qu’on enlève</span><b>${eur(T.ded)}</b>', 'qu’on enlève</span><b>− ${eur(T.ded)}</b>'),
 ('t2 « moins la TVA payée sur tes achats » revient', 'prototype-comptabilite.html', '<span>TVA payée sur tes achats, qu’on enlève</span>', '<span>moins la TVA payée sur tes achats</span>'),
 ("e1 « l'État te doit cette somme » revient dans la règle du cadre", 'prototype-comptabilite.html', "suite:credit ? 'rien à payer : il se reporte sur ta prochaine déclaration' :", "suite:credit ? 'l’État te doit cette somme : elle se reporte sur ta prochaine déclaration' :"),
 ("e2 la mention « à faire relire par l'expert-comptable » disparaît", 'prototype-comptabilite.html', '<i>(Règle à faire relire par l’expert-comptable.)</i> ', ''),
 ('e3 un chiffre de seuil entre dans la règle du remboursement', 'prototype-comptabilite.html', 'un remboursement est possible sur demande, mais', 'un remboursement est possible sur demande au-delà de 760 €, mais'),
 ('e4 le remboursement redevient automatique', 'prototype-comptabilite.html', 'mais il n’arrive pas tout seul.', 'et l’État te le rembourse.'),
 ("e5 « l'État te la rend » revient (TVA déductible, grand livre)", 'prototype-comptabilite.html', 'elle se déduit de la TVA que tu dois à l’État.`', 'l’État te la rend, elle diminue ta TVA à payer.`'),
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
