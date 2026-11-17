#!/usr/bin/env python3
# Contre-épreuve des sondes des RESTES de l'accueil (accueil-restes-1.js) : on remet un défaut dans une COPIE de la page (jamais dans le dépôt) et on exige que la sonde
# tombe sur un contrôle. Chaque mutation prouve d'abord qu'elle touche son motif exactement une fois.
# Usage : python3 mutations-accueil-restes.py [M1 M2 ...]   (le profil iphone sert pour le graphique : M4 ; les autres, mac)
import os, shutil, subprocess, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
S = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes/')
PAGE = 'apercu/prototype-op-gestion.html'
MUT = {
  'M1': ('mac', "« Terminer » n'écrit plus la ligne du paiement reçu sur place", "journalPaieTerrain(i, P.etat === 'rien' ? null : P, mt || (P.etat === 'total' && fa ? ttcDe(fa) : 0)); }", "}"),
  'M2': ('mac', "le journal de départ n'a plus la ligne de l'argent déjà reçu sur place", "|| FACTURES.some(f => f.int === i.id && f.num !== '—')) return;\n    P.journale = true;", "|| true) return;\n    P.journale = true;"),
  'M3': ('mac', "la ligne se double (plus de garde « déjà écrite »)", "if (!P || P.journale || !(v > 0)) return; P.journale = true;", "if (!P || !(v > 0)) return;"),
  'M4': ('iphone', "le graphique des 12 mois n'a plus son fondu ni sa marge au téléphone", "@media (max-width:760px){ .st-graph{padding-left:30px!important;-webkit-mask-image:linear-gradient(90deg,rgba(0,0,0,0) 0,#000 30px);mask-image:linear-gradient(90deg,rgba(0,0,0,0) 0,#000 30px)} }", ""),
  'M5': ('mac', "le tableau du bilan ne dit plus les reçus sur place", "${notePlace ? `<br><small>${notePlace}</small>` : ''}", ""),
  'M6': ('mac', "la tuile « Encaissé » du bilan ne dit plus « hors X € reçus sur place »", "ecart(S.enc, P.enc), surPlace > 0 ? 'hors ' + eur0(surPlace) + ' reçus sur place' : '')", "ecart(S.enc, P.enc), '')"),
}
def jouer(cle):
    profil, titre, avant, apres = MUT[cle]
    tmp = f'/tmp/mut-rs-{cle}'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
    f = os.path.join(tmp, PAGE); s = open(f, encoding='utf-8').read(); n = s.count(avant)
    if n != 1: print(f'{cle} : ✗ la mutation ne trouve pas son motif exactement une fois ({n})'); return False
    open(f, 'w', encoding='utf-8').write(s.replace(avant, apres, 1))
    r = subprocess.run(['timeout', '880', 'node', S + 'accueil-restes-1.js', profil], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=900)
    rouges = [l for l in r.stdout.splitlines() if l.startswith(' ✗')]; tombe = r.returncode == 1 and bool(rouges)
    bilan = [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:] or ['(pas de bilan)']
    print(f'{cle} : {"✓ la sonde TOMBE" if tombe else "✗ la sonde reste verte (code " + str(r.returncode) + ")"} — {titre} — {bilan[0]}')
    for l in rouges[:3]: print('      ', l[:180])
    shutil.rmtree(tmp, ignore_errors=True); return tombe
if __name__ == '__main__':
    cles = sys.argv[1:] or list(MUT); ok = [jouer(k) for k in cles]
    print(f'\n{sum(ok)} ✓ · {len(ok) - sum(ok)} ✗ sur {len(ok)} mutations'); sys.exit(0 if all(ok) else 1)
