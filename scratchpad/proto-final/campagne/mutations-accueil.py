#!/usr/bin/env python3
# Contre-épreuve des sondes « accueil » : on remet un défaut dans une COPIE de la page (jamais dans le dépôt), on lance la sonde qui doit le voir,
# et on exige qu'elle tombe (code de sortie 1). Une mutation qui ne casse rien = une sonde qui ne regarde pas au bon endroit.
# Chaque mutation prouve d'abord qu'elle a TOUCHÉ le fichier (une occurrence, texte différent). Usage : python3 mutations-accueil.py [M1 M2 ...]
import os, shutil, subprocess, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes')
PAGE = 'apercu/prototype-op-gestion.html'
MUTATIONS = {
  'M1': ("« à recevoir » de l'Accueil oublie les factures en retard", 'accueil-coherence.js',
         "FACTURES.filter(f=>['envoyee','retard','partielle'].includes(f.st)).reduce((s,f)=>s+restant(f),0))}</b><span>à recevoir", "FACTURES.filter(f=>['envoyee','partielle'].includes(f.st)).reduce((s,f)=>s+restant(f),0))}</b><span>à recevoir"),
  'M2': ("la recherche de l'Historique redevient sensible à la casse", 'accueil-coherence.js',
         "sansAccent(hTexte(j)).replace(/\\s+/g, ' ').includes(sansAccent(hCherche.trim()).replace(/\\s+/g, ' '))", "hTexte(j).replace(/\\s+/g, ' ').includes(hCherche.trim().replace(/\\s+/g, ' '))"),
  'M3': ("le filtre « Personne » de l'Historique ne filtre plus", 'accueil-parcours.js',
         "(hQui === 'tous' || j.qui === hQui)", "(true)"),
  'M4': ("« période précédente » des Statistiques ne recule plus", 'accueil-parcours.js',
         "const n = stDecale(stK, +b.dataset.stnav * ST_LONG[stPer]);", "const n = stK;"),
}
def jouer(cle):
    titre, sonde, avant, apres = MUTATIONS[cle]
    tmp = f'/tmp/mut-accueil-{cle}'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
    f = os.path.join(tmp, PAGE); s = open(f, encoding='utf-8').read()
    n = s.count(avant)
    if n != 1: print(f'{cle} : ✗ la mutation ne trouve pas son motif exactement une fois ({n})'); return False
    open(f, 'w', encoding='utf-8').write(s.replace(avant, apres, 1))
    if open(f, encoding='utf-8').read() == open(os.path.join(RACINE, PAGE), encoding='utf-8').read(): print(f'{cle} : ✗ le fichier n’a pas changé'); return False
    r = subprocess.run(['timeout', '560', 'node', os.path.join(SONDES, sonde), 'mac'], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=600)
    # une sonde déjà rouge sur un défaut CONNU (« accueil-NN · … ») ne prouve rien : il faut un contrôle rouge qui n'en porte pas le numéro
    nouveaux = [l for l in r.stdout.splitlines() if l.startswith(' ✗') and 'accueil-0' not in l]
    tombe = r.returncode == 1 and bool(nouveaux); bilan = [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:] or ['(pas de bilan)']
    print(f'{cle} : {"✓ la sonde TOMBE" if tombe else "✗ la sonde reste verte (code " + str(r.returncode) + ")"} — {titre} — {sonde} {bilan[0]}')
    for l in r.stdout.splitlines():
        if l.startswith(' ✗'): print('      ', l[:200])
    shutil.rmtree(tmp, ignore_errors=True); return tombe
if __name__ == '__main__':
    cles = sys.argv[1:] or list(MUTATIONS); ok = [jouer(c) for c in cles]
    print(f'\n== {sum(ok)} ✓ · {len(ok) - sum(ok)} ✗'); sys.exit(0 if all(ok) else 1)
