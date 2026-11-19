#!/usr/bin/env python3
# Contre-épreuve de restes-client-1.js (17 novembre 2026) : on remet chaque défaut dans une COPIE de la page (jamais dans le dépôt)
# et on exige que la sonde tombe. Usage : python3 mutations-restes-client-1.py [numéros...]  (toutes par défaut)
import os, shutil, subprocess, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
COPIE = '/tmp/mutc'
PAGE = 'apercu/prototype-op-gestion.html'
SONDE = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes/restes-client-1.js')
M = [
 ('M1 metiersSync parle avant la garde du rôle', "&& ROLE !== 'client') {   /* un CLIENT qui tape", ") {   /* un CLIENT qui tape", 'iphone'),
 ('M2 seconde demande de contrat acceptée (gardes de ecDemande et du geste)', "if (contrat && ecDemandeContrat(RL_CLI.cli)) return toast(", "if (false) return toast(", 'iphone'),
 ('M3 le mot long sort de la carte', ".ec-l > span:first-child{min-width:0;overflow-wrap:anywhere}", "", 'petit'),
 ('M4 le numéro de contrat se coupe', ".ec-num{white-space:nowrap}", "", 'petit'),
 ('M5 on salue un organisme par son nom', "return p && !/^(syndic", "return p && !/^(zzzz", 'mac'),
 ('M6 le nom de l’entreprise répété dans la page', "body.rl-client .ec-tete{display:none}", "", 'mac'),
 ('M7 onglets de la page ET barre du bas sur téléphone', "@media (max-width:760px){ body.rl-client .ec-seg{display:none} }", "", 'iphone'),
 ('M8 le menu de gauche répète les cinq entrées', "const L = ROLE === 'client' ? `<div class=\"rl-contact\">", "const L = ROLE === 'zzz' ? `<div class=\"rl-contact\">", 'mac'),
 ('M9 la barre du bas dans un autre ordre', "client:['accueil', 'factures', 'interventions', 'devis', 'contrats']", "client:['accueil', 'factures', 'devis', 'interventions', 'contrats']", 'iphone'),
 ('M10 la barre ne porte plus les comptes', "aria-label=\"${esc(t.nom)}${n ? (ROLE === 'client' ? ', ' + n", "aria-label=\"${esc(t.nom)}${n ? (ROLE === 'zzz' ? ', ' + n", 'iphone'),
 ('M11 le carré OP du logiciel revient pour le client', "${ROLE === 'client' ? rlMarqueEnt() : '<i>OP</i>'}<b>", "<i>OP</i><b>", 'iphone'),
 ('M12 la phrase du paiement d’avant', "Démonstration : aucun paiement réel. Dans l’application, le paiement se fait sur la page sécurisée de la banque.", "Carte d’essai : aucun argent ne bouge.", 'iphone'),
 ('M13 deux devis du même ventilateur', "objet:'Remplacer la carte électronique de l’unité extérieure', lignes:[['Carte électronique", "objet:'Remplacement du ventilateur extérieur', lignes:[['Carte électronique", 'iphone'),
 ('M14 le menu du client dit « Gérant »', "const sousMoi = R => { if (ROLE === 'client') return 'Client'; const p =", "const sousMoi = R => { const p =", 'mac'),
]
sel = [int(a) for a in sys.argv[1:]] or list(range(1, len(M) + 1))
bad = 0
for i in sel:
    nom, old, new, profil = M[i - 1]
    shutil.rmtree(COPIE, ignore_errors=True); shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(COPIE, 'apercu'))
    chemin = os.path.join(COPIE, PAGE); s = open(chemin, encoding='utf8').read()
    assert s.count(old) == 1, (nom, s.count(old))
    open(chemin, 'w', encoding='utf8').write(s.replace(old, new))
    r = subprocess.run(['node', SONDE, profil], env=dict(os.environ, RACINE=COPIE), capture_output=True, text=True, timeout=300)
    fin = [l for l in r.stdout.splitlines() if l.startswith('== ')]
    tombe = r.returncode != 0
    print(('TOMBE ' if tombe else 'VERT (MAL) ') + nom, '|', profil, '|', fin[-1] if fin else r.stderr[-120:])
    if not tombe: bad += 1
shutil.rmtree(COPIE, ignore_errors=True)
sys.exit(1 if bad else 0)
