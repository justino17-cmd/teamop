#!/usr/bin/env python3
# Contre-épreuve des sondes de la partie « technicien » (campagne du 17 novembre 2026) : on remet un défaut dans une COPIE de la page (jamais dans le dépôt :
# RACINE pointe la copie), on rejoue la sonde qui doit le voir, et on exige au moins un contrôle ✗. Une mutation qui ne casse rien dit que la sonde ne regarde pas
# au bon endroit — ou que la mutation a frappé ailleurs : on vérifie d'abord que le motif est présent UNE fois.
# usage : python3 mutations-technicien.py [M1 M2 …]   (sans argument : toutes)
import os, shutil, subprocess, sys, re
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes')
PAGE = 'apercu/prototype-op-gestion.html'
MUTS = {
 'M1': ('une note de frais envoyée ne s\'écrit plus', 'NDF.unshift(n);\n', '/* mutation */\n', 'technicien-parcours-frais.js', ['iphone'], r'F3a|F3d'),
 'M2': ('la demande de congé ne s\'enregistre plus', "DEMANDES_ABS.push({ id:'d' + Date.now(), tech:a.tech,", "[].push({ id:'d' + Date.now(), tech:a.tech,", 'technicien-parcours-taches-conges.js', ['iphone'], r'C3a|C3b'),
 'M3': ('« Y aller » envoie une destination vide', 'btn gris petit" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adr)}" target="_blank" rel="noopener">Y aller</a>', 'btn gris petit" href="https://www.google.com/maps/dir/?api=1&destination=" target="_blank" rel="noopener">Y aller</a>', 'technicien-parcours-menu-droits.js', ['iphone'], r'J4'),
 'M4': ('la barre du bas perd « Mes tâches » pour « Mes congés »', "terrain:['majournee', 'techfrais', 'mesheures', 'taches', 'moncamion', 'absences']", "terrain:['majournee', 'techfrais', 'mesheures', 'absences', 'moncamion', 'taches']", 'technicien-parcours-menu-droits.js', ['iphone'], r'B1|B5'),
}
def main():
    noms = sys.argv[1:] or list(MUTS)
    bilan = []
    for n in noms:
        titre, vieux, neuf, sonde, args, motif = MUTS[n]
        tmp = f'/tmp/mut-technicien-{n}'
        shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp + '/apercu')
        for f in os.listdir(os.path.join(RACINE, 'apercu')):
            p = os.path.join(RACINE, 'apercu', f)
            if os.path.isfile(p): shutil.copy(p, tmp + '/apercu/' + f)
        s = open(tmp + '/' + PAGE, encoding='utf-8').read()
        if s.count(vieux) != 1: print(n, 'MOTIF ABSENT OU MULTIPLE (', s.count(vieux), ') : mutation non jouée'); bilan.append((n, None)); continue
        open(tmp + '/' + PAGE, 'w', encoding='utf-8').write(s.replace(vieux, neuf))
        env = dict(os.environ, RACINE=tmp)
        r = subprocess.run(['timeout', '580', 'node', os.path.join(SONDES, sonde)] + args, env=env, cwd=RACINE, capture_output=True, text=True)
        sortie = r.stdout + r.stderr
        ko = [l for l in sortie.splitlines() if l.startswith('  ✗')]
        vu = [l for l in ko if re.search(motif, l)]
        print(f'{n} {titre} → {len(ko)} ✗ dont {len(vu)} attendus ({motif})')
        for l in ko[:6]: print('   ', l[:200])
        bilan.append((n, bool(vu)))
        shutil.rmtree(tmp, ignore_errors=True)
    print('\nMUTATIONS :', ' '.join(f'{n}={"tombe" if b else "NE TOMBE PAS" if b is False else "non jouée"}' for n, b in bilan))
    sys.exit(0 if all(b for _, b in bilan) else 1)
main()
