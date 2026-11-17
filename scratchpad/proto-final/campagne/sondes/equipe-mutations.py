#!/usr/bin/env python3
# Contre-épreuve des corrections de la campagne « équipe » (17 novembre 2026) : on REMET chaque défaut dans apercu/prototype-op-gestion.html,
# on rejoue la sonde qui le garde, et elle doit TOMBER (code de sortie ≠ 0 et au moins un ✗) ; puis le fichier est restauré à l'octet.
# ⛔ Les corrections doivent être COMMITÉES avant (git checkout restaure depuis HEAD). Au premier plan, avec un délai par exécution.
# usage : python3 equipe-mutations.py [numéro de mutation …]
import subprocess, sys, os, re
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
PAGE = os.path.join(RACINE, 'apercu', 'prototype-op-gestion.html')
SONDES = os.path.dirname(os.path.abspath(__file__))
M = [
 # (nom, ancien texte, nouveau texte, sonde + arguments, ce qui doit tomber)
 ('M1 equipe-01 : secuReposer accepte son propre compte', "  if (k === acteur()) { toast('Pour ton propre compte, demande à un autre administrateur.'); return false; }\n  if (!secuGarde('equipe-inviter', () => secuReposer(k)", "  if (!secuGarde('equipe-inviter', () => secuReposer(k)", ['equipe-corrections.js', 'mac'], 'equipe-01'),
 ('M2 equipe-02 : une personne du bureau garde l\'ancien nom', "EQUIPE.filter(p => !eqxTerrain(p)).forEach(p => { if (H_GENS[p.k])", "EQUIPE.filter(p => false).forEach(p => { if (H_GENS[p.k])", ['equipe-parcours.js'], 'equipe-02'),
 ('M3 equipe-19 : « Désactiver » redevient un « modifier »', "m:'relancer mdp actif', s:'desact',", "m:'relancer mdp actif desact',", ['equipe-droits-supprimer.js'], 'equipe-19'),
 ('M4 equipe-11 : Temps de travail demande de nouveau « Supprimer »', "pointage:{ equipe:['temps'] }, vehicules", "pointage:{ equipe:['temps', 'temps.s'] }, vehicules", ['equipe-corrections.js', 'mac'], 'equipe-11'),
 ('M5 equipe-11 : Dépôts et camions demande de nouveau « Supprimer »', "boxes:{ equipe:['stock'], terrain:['stock'] }", "boxes:{ equipe:['stock', 'stock.s'], terrain:['stock'] }", ['equipe-corrections.js', 'mac'], 'equipe-11'),
 ('M6 equipe-18 : les cases d\'un Responsable en lecture redeviennent actives', "fige = admin || soi || lecture,", "fige = admin || soi,", ['equipe-corrections.js', 'mac'], 'equipe-18'),
 ('M7 equipe-15 : le tableau reprend ses noms courts', "const EQX_CATS = Object.fromEntries(DR_CATS);", "const EQX_CATS = { planif:'Planning', inter:'Interventions', crm:'Clients', ventes:'Devis et factures', compta:'Comptabilité', stock:'Stock', temps:'Temps de travail', com:'Boîte mail', achats:'Achats et frais', admin:'L’entreprise et l’équipe' };", ['equipe-corrections.js', 'mac'], 'equipe-15'),
 ('M8 equipe-16 : le tableau reste au lieu de passer en listes sur iPad', "@container eqxdr (max-width:1000px){.eqx-dr-tab{display:none}", "@container eqxdr (max-width:10px){.eqx-dr-tab{display:none}", ['equipe-corrections.js', 'ipad'], 'equipe-16'),
 ('M9 equipe-08 : la valeur longue repasse en une ligne', ".ligne.eqx-l>b,.cn-acces .ligne>b{white-space:normal", ".ligne.eqx-l>b,.cn-acces .ligne>b{white-space:nowrap", ['equipe-mise-en-page.js', 'iphone'], 'fiche-long'),
 ('M10 equipe-10 : « Annuler » du toast à 40 px', "@media (pointer:coarse){#toast button{min-height:44px;min-width:44px}}", "@media (pointer:coarse){#toast button{min-height:40px}}", ['equipe-corrections.js', 'iphone'], 'equipe-10'),
 ('M11 equipe-09 : e-mail et rôle côte à côte sur téléphone', "@media (max-width:600px){.deux-champs.eqx-2c{grid-template-columns:minmax(0,1fr)}", "@media (max-width:6px){.deux-champs.eqx-2c{grid-template-columns:minmax(0,1fr)}", ['equipe-corrections.js', 'iphone'], 'equipe-09'),
 ('M12 equipe-13 : l\'ancien nom « Reposer » revient', ">Lui donner un mot de passe provisoire</button>", ">Reposer un mot de passe provisoire</button>", ['equipe-corrections.js', 'mac'], 'equipe-13'),
 ('M13 equipe-04 : l\'e-mail faux ne s\'écrit plus sous le champ', "['eq-m', v => !/^[^@\\s]+@", "['eq-mx', v => !/^[^@\\s]+@", ['equipe-parcours.js'], 'equipe-04'),
 ('M14 equipe-05 : une habilitation de même nom s\'ajoute deux fois', "const e = p.habil.find(h => nomNorm(h[0]) === nomNorm(v)); if (!e) return '';", "const e = null; if (!e) return '';", ['equipe-parcours.js'], 'equipe-05'),
 ('M15 equipe-06 : une fin avant l\'obtention passe', "v < obt0 ? 'La fin ne peut pas", "false ? 'La fin ne peut pas", ['equipe-corrections.js', 'mac'], 'equipe-06'),
 ('M16 equipe-07 : une date vide passe en silence', "!v ? 'Choisis la date de fin, ou coche « Sans date de fin ».' : ", "", ['equipe-corrections.js', 'mac'], 'equipe-07'),
]
def jouer(cmd):
    try:
        r = subprocess.run(['timeout', '420', 'node'] + cmd, cwd=SONDES, capture_output=True, text=True, timeout=440)
        return r.returncode, r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return 124, 'délai'
choix = set(sys.argv[1:])
orig = open(PAGE, encoding='utf-8').read(); bilan = []
for nom, a, b, cmd, motif in M:
    num = nom.split(' ')[0][1:]
    if choix and num not in choix: continue
    if orig.count(a) != 1:
        print('✗ %s : l\'ancre n\'est pas unique (%d) — mutation non posée' % (nom, orig.count(a))); bilan.append((nom, 'ancre')); continue
    open(PAGE, 'w', encoding='utf-8').write(orig.replace(a, b))
    try:
        code, sortie = jouer(cmd)
    finally:
        open(PAGE, 'w', encoding='utf-8').write(orig)
    tombe = [l for l in sortie.split('\n') if l.strip().startswith('✗') and motif in l]
    ok = code != 0 and len(tombe) >= 1
    print(('✓' if ok else '✗'), nom, '→ code', code, '·', len(tombe), 'contrôle(s) %s tombé(s)' % motif, '|', (tombe[0].strip()[:110] if tombe else sortie.strip().split('\n')[-1][:110]))
    bilan.append((nom, ok))
ko = [n for n, o in bilan if o is not True]
print('\n== %d mutations, %d attrapées, %d qui ne mordent pas' % (len(bilan), len(bilan) - len(ko), len(ko)))
for n in ko: print(' ✗', n)
assert open(PAGE, encoding='utf-8').read() == orig
sys.exit(1 if ko else 0)
