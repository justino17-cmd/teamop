#!/usr/bin/env python3
"""Contre-épreuve de entreprise-corrections.js (étape 7, 17 novembre 2026) : on REMET chaque défaut dans une COPIE du prototype (jamais dans le dépôt),
on rejoue la section qui le garde, et on exige qu'elle TOMBE. Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit.
Usage : python3 entreprise-corrections-mutations.py [numéros…]   (sans argument : toutes)"""
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
COPIE = '/tmp/mut/racine'
M = {
 '01': ("['fl-forme', () => ''],", "['fl-forme', v => v ? '' : 'Choisis la forme juridique.'],"),
 '02': ("|| (v.match(/\\d/g) || []).length < 6 ?", "?"),
 '03': ("position:sticky;bottom:0;z-index:2;background:var(--feuille);margin:0 -16px;", "position:static;margin:0 -16px;"),
 '04': ("const cent = x => Math.round(x * 100) / 100;", "const cent = x => x;"),
 '05': (" clientNouveau@crm',", " clientNouveau@crm clientEnreg@crm',"),   # + retrait de la ligne m (voir plus bas)
 '06': ("c.querySelector('.tete') || c.querySelector('.tete-tel'); const html = `<div class=\"info petit droits-note\"", "c.querySelector('.tete, .tete-tel'); const html = `<div class=\"info petit droits-note\""),
 '07': ("entreprise:!!droitVoit('entreprise'),", ""),
 '08': ("['entreprise', 'accueil', 'boiteMail'].includes(route)", "['entreprise', 'accueil'].includes(route)"),
 '09': (" opdz:{ k:'ventes', d:'l' },", " opd:{ k:'ventes', d:'l' }, opdz:{ k:'ventes', d:'l' },"),
 '10': (".logo i{flex:none}.menu a.logo > span{min-width:0;flex:1 1 auto}", ".menu a.logo > span{flex:1 1 auto}"),
 '11': ("const entRetour = () => { RETOUR = { lib:'Mon entreprise', route:'entreprise', h:'entreprise', fn:null }; };", "const entRetour = () => {};"),
 '12': ("    : L.length ? `<div class=\"ent-ban attention\" role=\"status\"><span>Tes factures peuvent partir.", "    : false ? `<div class=\"ent-ban attention\" role=\"status\"><span>Tes factures peuvent partir."),
 '13': ("padding-block:6px;flex:none}", "padding-block:6px}"),
}
SECTION = {'12': '01'}
AUTRE_SONDE = {'06': 'entreprise-achats-lisible.js'}   # la note de lecture seule d'Achats se garde dans la sonde d'Achats
def lancer(n):
    p = os.path.join(COPIE, 'apercu', 'prototype-op-gestion.html'); src = open(os.path.join(RACINE, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
    ancien, neuf = M[n]; assert src.count(ancien) == 1, (n, src.count(ancien)); s = src.replace(ancien, neuf)
    if n == '05':   # le verbe revient dans « c » ET quitte « m »
        assert s.count("clientEnreg@crm terminer@inter") == 1; s = s.replace("clientEnreg@crm terminer@inter", "terminer@inter")
    open(p, 'w', encoding='utf-8').write(s)
    r = subprocess.run(['node', os.path.join(ICI, AUTRE_SONDE.get(n, 'entreprise-corrections.js'))] + ([] if n in AUTRE_SONDE else [SECTION.get(n, n)]), env=dict(os.environ, RACINE=COPIE), capture_output=True, text=True, timeout=570)
    sortie = r.stdout + r.stderr; bilan = [l for l in sortie.splitlines() if l.startswith('== ')]
    return r.returncode, (bilan[-1] if bilan else sortie[-200:].replace('\n', ' '))
if __name__ == '__main__':
    if os.path.exists(COPIE): shutil.rmtree(COPIE)
    shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(COPIE, 'apercu'))
    mal = 0
    for n in (sys.argv[1:] or sorted(M)):
        try: code, bilan = lancer(n)
        except subprocess.TimeoutExpired: code, bilan = 99, 'délai dépassé'
        tombe = code != 0; mal += 0 if tombe else 1
        print(f"mutation {n} : {'TOMBE ✓' if tombe else 'NE CASSE RIEN ✗'} · {bilan}", flush=True)
    print(f"== {len(sys.argv[1:] or M) - mal} mutations attrapées · {mal} qui ne cassent rien"); sys.exit(1 if mal else 0)
