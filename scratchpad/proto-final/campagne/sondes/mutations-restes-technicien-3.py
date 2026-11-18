#!/usr/bin/env python3
# Contre-épreuve de restes-technicien-3.js et des deux sondes du recontrôle (alignement, mot) : chaque correctif du tour 2 est REMIS À L'ENVERS, la sonde qui le garde doit tomber ;
# puis la page est restaurée par git checkout (le correctif est COMMITÉ avant : sinon le checkout l'effacerait avec la mutation).
# Usage : python3 mutations-restes-technicien-3.py   (une mutation à la fois, un navigateur à la fois)
import subprocess, sys, os, re
RACINE = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
PAGE = os.path.join(RACINE, 'apercu/prototype-op-gestion.html'); S = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes')
if subprocess.run(['git', 'diff', '--quiet', '--', PAGE], cwd=RACINE).returncode != 0: sys.exit('la page porte des modifications non commitées : commite avant de muter')
MUT = [
 ('M1 pastille ovale : le filet et la marge de .info reviennent', 'restes-technicien-recontrole-alignement.js iphone 1', ';padding:0;border:0}', '}'),
 ('M2 adresse longue : le texte du message ne se coupe plus', 'restes-technicien-recontrole-mot.js ipad', '#mj-messages .ligne>span,#mj-autres .ligne>span{min-width:0;overflow-wrap:anywhere}', ''),
 ('M3 « Je l\'ai pris » sans réseau repart comme avant', 'restes-technicien-3.js iphone 0', 'hors = navigator.onLine === false; let enFile = 0;', 'hors = false; let enFile = 0;'),
 ('M4 320 × 568 : la carte du véhicule reste avant la liste', 'restes-technicien-3.js petit 0', 'html .mc-page>#mc-vehicule{order:1}', 'html .mc-page>#mc-vehicule{order:0}'),
 ('M5 achat en magasin : « € » n\'est plus retiré', 'restes-technicien-3.js iphone 0', "const mTxtA = axMontantTxt(g('ax-m').value)", "const mTxtA = g('ax-m').value"),
 ('M6 invite d\'Articles longue sur iPad (la mesure de 378 px pour 363)', 'restes-technicien-3.js ipad 0', "tel() || innerWidth < 1000 ? (innerWidth < 340 ? 'Article, fournisseur'", "tel() ? (innerWidth < 340 ? 'Article, fournisseur'"),
 ('M7 « (0,5 L) » : l\'espace insécable disparaît (escN et mcNom)', 'restes-technicien-3.js iphone 0', "const escN = s => esc(s).replace(/(\\d) (?=(?:L|kg|g|mL|cl|m|cm|mm|µF|u)\\b)/g, '$1\\u00a0');", "const escN = s => esc(s);"),
 ('M8 « à remettre à bord » revient sur Ma journée', 'restes-technicien-3.js iphone 0', "${sxPl(n, 'article')} ${n > 1 ? 'manquent' : 'manque'} à bord", "${sxPl(n, 'article')} à remettre à bord"),
 ('M9 la phrase « Il est 10:40… » revient sur 320 × 568', 'restes-technicien-3.js petit 0', '.ptx-carte.mj-pt .ptx-hnow{display:none}', '.ptx-carte.mj-pt .ptx-hnow{display:block}'),
 ('M11 kilomètres : la règle des montants ne s'applique plus au champ km (retour au silence, 1,5 km)', 'restes-technicien-recontrole-3.js iphone 0', "return !(r && r !== 'Indique le montant.' && !/ne se lit pas/.test(r)); }", "return true; }"),
 ('M12 kilomètres : la fonction qui enregistre ne refuse plus (le champ seul)', 'restes-technicien-recontrole-3.js iphone 0', "if (km && axKmClair(kTxt) === false) { const z = g('rn-km');", "if (false) { const z = g('rn-km');"),
 ('M10 absence d\'un jour (« Sophie Martin · RTT », 38 px à 320) : la zone qui répond ne s\'agrandit plus', 'technicien-mise-en-page.js petit 0', '.acm-x[style*="--n:1;"]::after{content:"";position:absolute;top:0;bottom:0;left:-3px;right:-3px}', ''),
]
tombees = 0
for nom, sonde, a, b in MUT:
    src = open(PAGE, encoding='utf-8').read()
    if src.count(a) != 1: print('✗ ancre introuvable ou multiple pour', nom, src.count(a)); continue
    open(PAGE, 'w', encoding='utf-8').write(src.replace(a, b))
    try:
        r = subprocess.run(['node', os.path.join(S, sonde.split()[0])] + sonde.split()[1:], cwd=S, capture_output=True, text=True, timeout=420)
        tot = re.findall(r'(\d+) ✓ +· +(\d+) ✗', r.stdout)[-1:] or [('?', '?')]
        mord = r.returncode != 0
    except subprocess.TimeoutExpired: tot, mord = [('?', 'délai')], False
    finally: subprocess.run(['git', 'checkout', '--', PAGE], cwd=RACINE)
    print(('tombe ' if mord else 'NE TOMBE PAS ') + nom + ' → ' + str(tot[0])); tombees += 1 if mord else 0
print(f'\n{tombees}/{len(MUT)} mutations tombent')
sys.exit(0 if tombees == len(MUT) else 1)
