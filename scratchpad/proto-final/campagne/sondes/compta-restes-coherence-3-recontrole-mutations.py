#!/usr/bin/env python3
# Recontrôle adverse, tour 3 : mutations À MOI, sur COPIES d'apercu/ (jamais sur les pages livrées, comparées par empreinte à la fin). Chaque mutation dit quelle sonde du correcteur doit tomber.
# usage : python3 compta-restes-coherence-3-recontrole-mutations.py [préfixes : n1 r2 …]   « occ » = quelle occurrence remplacer quand le texte existe deux fois (la vue recouverte puis la vue vivante : on mute la dernière)
import hashlib, os, re, shutil, subprocess, sys, tempfile
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.abspath(os.path.join(D, '..', '..', '..', '..'))
H, C = 'prototype-op-gestion.html', 'prototype-comptabilite.html'
S3, SE, S2, SR = 'compta-restes-coherence-3.js', 'compta-ventes-cadre-explore.js', 'compta-restes-coherence-2.js', 'compta-restes-coherence-2-recontrole.js'
MUT = [
 # (nom, sonde, page, avant, après, occurrence : 1 = première, -1 = dernière, 0 = doit être unique)
 ("n1 ventes : une SEULE relance ne se dit plus (> 1)", SE, C, "${F.relances ? ' · ' + plur(F.relances, 'relance') : ''}</span>` : pp > 0", "${F.relances > 1 ? ' · ' + plur(F.relances, 'relance') : ''}</span>` : pp > 0", 0),
 ("n2 ventes : à égalité de date, l'ordre des pièces est inversé", SE, C, "b.e.date.localeCompare(a.e.date) || b.e.piece.localeCompare(a.e.piece));", "b.e.date.localeCompare(a.e.date) || a.e.piece.localeCompare(b.e.piece));", -1),
 ("n3 ventes : l'échéance d'une facture à encaisser (pas en retard) devient sa date d'émission", SE, C, "<span class=\"st warn\">À encaisser</span><span class=\"sec\">${f.e.ech ? 'due le ' + dCourt(f.e.ech) : ''}", "<span class=\"st warn\">À encaisser</span><span class=\"sec\">${f.e.ech ? 'due le ' + dCourt(f.e.date) : ''}", -1),
 ("n4 ventes : le moyen d'une ligne payée est celui de la ligne d'avant (décalage)", SE, C, "<span class=\"st ok\">Payée · ${p.mode}${OPL_AVOIRS", "<span class=\"st ok\">Payée · ${(p.mode || '').slice(0, 3)}${OPL_AVOIRS", -1),
 ("n5 ventes : la date d'émission affichée recule d'un jour (jour 1 → date)", SE, C, "${dCourt(f.e.date)}</td><td class=\"n lt-m\"", "${dCourt(f.e.date.slice(0, 8) + '01')}</td><td class=\"n lt-m\"", -1),
 ("q1 reçu : le chèque va dans le compte du virement", S2, C, "{ carte:'467100', chq:'511200', esp:'530000', vir:'512000' }[mode]", "{ carte:'467100', chq:'512000', esp:'530000', vir:'512000' }[mode]", -1),
 ("q2 reçu : une date future n'est plus ramenée à aujourd'hui", S2, C, "d = r.d > AUJ ? AUJ : r.d,", "d = r.d,", 0),
 ("q3 reçu : la clé de correspondance oublie le moyen (modifier le moyen ne recrée rien)", S2, C, "+ '|' + oplMode(r.mode) + '|' + r.d;", "+ '|' + r.d;", 0),
 ("q4 reçu : la TVA du reçu est calculée sur le TTC (ttc*taux) et non extraite", S2, C, "tva = r2(ttc - ttc / (1 + (+r.tva) / 100))", "tva = r2(ttc * (+r.tva) / 100)", 0),
 ("q5 reçu : la ligne de relevé du virement n'est jamais retirée", S2, C, "const k = RELEVE.findIndex(x => x.pointe === ref(e, 0)); if (k >= 0) {", "const k = -1; if (k >= 0) {", 0),
 ("h7 hôte : le crédit à zéro se dit crédit (<= 0)", S3, H, "const credit = tv.aPayer < 0, m = Math.abs(tv.aPayer);", "const credit = tv.aPayer <= 0, m = Math.abs(tv.aPayer);", 0),
 ("h8 hôte : le montant du crédit garde son signe moins", S3, H, "m = Math.abs(tv.aPayer);\n  return { credit, m, eur:eur(m),", "m = Math.abs(tv.aPayer);\n  return { credit, m, eur:eur(tv.aPayer),", 0),
 ("h9 hôte : le texte d'aide du crédit disparaît (report + remboursement)", S3, H, "aide:credit ? ' Un crédit de TVA se reporte sur la déclaration suivante ; un remboursement peut se demander (à faire relire par ton expert-comptable).' : ''", "aide:''", 0),
 ("r7 hôte : paiementTropGros refuse aussi exactement 1 000 000 (>=)", S3, H, "> PAIEMENT_MAX;", ">= PAIEMENT_MAX;", 0),
 ("r8 hôte : le plafond envoyé au cadre est 1e9", S3, H, "    recuMax:PAIEMENT_MAX,\n", "    recuMax:1e9,\n", 0),
 ("p4 paie : la phrase d'application affirme que la liaison envoie les heures", S3, C, "la liaison avec OP GESTION n’envoie pas les heures.", "la liaison avec OP GESTION envoie les heures chaque semaine.", 0),
 ("p5 paie : même promesse, mais verrouillée par OP GESTION (contrôle recontrôle-2)", SR, C, "la liaison avec OP GESTION n’envoie pas les heures.", "les heures sont verrouillées par OP GESTION.", 0),
 ("p6 paie : la promesse remise dans VUES.paie (étape) en mode application", SR, C, "opcSi('Heures du mois reçues d’OP GESTION', 'Heures du mois saisies')", "opcSi('Heures du mois reçues d’OP GESTION', 'Heures du mois reçues d’OP GESTION')", 0),
 ("p4b paie : « OP GESTION envoie les heures » (vraie promesse, le lookbehind doit laisser passer)", SR, C, "la liaison avec OP GESTION n’envoie pas les heures.", "OP GESTION envoie les heures du mois.", 0),
 ("p7 paie : « Toutes les heures du mois sont validées dans OP GESTION » revient en mode application", SR, C, "'Les heures du mois sont toutes saisies'), d:", "'Toutes les heures du mois sont validées dans OP GESTION'), d:", 0),
 ("p8 paie : « heures transmises par OP GESTION » (autre tournure)", SR, C, "la liaison avec OP GESTION n’envoie pas les heures.", "les heures sont transmises chaque semaine par OP GESTION.", 0),
 ("e6 crédit : « l'État vous doit » (vouvoiement) dans la carte TVA du cadre", S3, C, "il n’y a donc rien à payer ce mois-ci.", "l’État vous doit la différence.", 0),
 ("e7 crédit : « il vous sera remboursé » dans l'écran TVA du cadre", S3, C, "mais il n’arrive pas tout seul.", "il vous sera remboursé.", 0),
 ("e8 crédit : « rendu par l'État » dans la TVA déductible du grand livre", S3, C, "elle se déduit de la TVA que tu dois à l’État.`", "elle est rendue par l’État.`", 0),
 ("e9 crédit : seuil chiffré dans l'écran de l'hôte", S3, H, "un remboursement peut se demander (à faire relire", "un remboursement peut se demander dès 150 € (à faire relire", 0),
 ("e10 crédit : la mention « à faire relire » disparaît de l'hôte", S3, H, " (à faire relire par ton expert-comptable).'", ".'", 0),
 ("d1 double négation revient sur le crédit précédent", S3, C, "<span>Crédit du mois précédent, qu’on enlève aussi</span><b>${eur(T.credPrec)}</b>", "<span>moins le crédit du mois précédent</span><b>− ${eur(T.credPrec)}</b>", 0),
]
def h(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
avant = {n: h(os.path.join(R, 'apercu', n)) for n in os.listdir(os.path.join(R, 'apercu')) if n.endswith(('.html', '.js'))}
choix = set(sys.argv[1:]); nok = 0
for nom, sonde, page, a, b, occ in MUT:
    if choix and nom.split()[0] not in choix: continue
    d = tempfile.mkdtemp(prefix='mut-rc3-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', page); s = open(p, encoding='utf-8').read(); n = s.count(a)
    if n == 0 or (occ == 0 and n != 1): print('MAL VISÉE', nom, n); nok += 1; shutil.rmtree(d, ignore_errors=True); continue
    i = s.index(a) if occ in (0, 1) else s.rindex(a)
    open(p, 'w', encoding='utf-8').write(s[:i] + b + s[i + len(a):])
    r = subprocess.run(['node', os.path.join(D, sonde)], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); tombe = r.returncode == 1 and m and int(m[-1][1]) > 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom, '[' + sonde[:-3] + ']', m[-1] if m else (r.stdout[-200:] + r.stderr[-200:]), sorted(set(re.findall(r'  ✗ (?:\S+ · )?(\w+)', r.stdout))), flush=True); nok += 0 if tombe else 1
    shutil.rmtree(d, ignore_errors=True)
apres = {n: h(os.path.join(R, 'apercu', n)) for n in avant}
print('pages livrées inchangées :', 'oui' if apres == avant else 'NON')
sys.exit(1 if nok or apres != avant else 0)
