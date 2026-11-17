#!/usr/bin/env python3
# Contre-épreuve des sondes du RECONTRÔLE adverse de l'accueil (accueil-recontrole.js, accueil-recontrole-parcours.js) : on remet un défaut dans une COPIE de la page
# (jamais dans le dépôt) et on exige que la sonde tombe sur un contrôle. Chaque mutation prouve d'abord qu'elle touche son motif exactement une fois.
# Usage : python3 mutations-accueil-recontrole.py [R1 R2 ...]
import os, shutil, subprocess, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
S = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes/')
PAGE = 'apercu/prototype-op-gestion.html'
MUT = {
  'R1': ('accueil-recontrole.js', "payer() n'écrit plus dans l'Historique", "journalPaiement(f, v, m, ROLE === 'client' ? { qui:'client', action:'a payé en ligne' } : {});", ""),
  'R2': ('accueil-recontrole.js', "la tuile « reçu en octobre » de l'Accueil oublie les reçus sur place", "${eur(ENCAISSEMENTS.reduce((s,e)=>s+e.ttc,0) + cpPaieTerrain().reduce((s,e)=>s+e.ttc,0))}</b><span>reçu en octobre", "${eur(ENCAISSEMENTS.reduce((s,e)=>s+e.ttc,0))}</b><span>reçu en octobre"),
  'R3': ('accueil-recontrole-parcours.js', "payer() n'écrit plus dans l'Historique (parcours A)", "journalPaiement(f, v, m, ROLE === 'client' ? { qui:'client', action:'a payé en ligne' } : {});", ""),
  'R4': ('accueil-recontrole-parcours.js', "le bouton « Chèque » de la fiche n'encaisse plus (le montant de l'Accueil ne bouge pas)", "ENCAISSEMENTS.unshift({ d:o.d || '31/10', h:o.h || hm(MAINT_MIN), cli:f.cli, fac:f.num, mode:m, ttc:v, tva:f.tva, photo:o.photo, preuve:o.photo ? undefined : undefined });", ""),
}
def jouer(cle, profil='mac'):
    sonde, titre, avant, apres = MUT[cle]
    tmp = f'/tmp/mut-rc-{cle}'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
    f = os.path.join(tmp, PAGE); s = open(f, encoding='utf-8').read(); n = s.count(avant)
    if n != 1: print(f'{cle} : ✗ la mutation ne trouve pas son motif exactement une fois ({n})'); return False
    open(f, 'w', encoding='utf-8').write(s.replace(avant, apres, 1))
    r = subprocess.run(['timeout', '560', 'node', S + sonde, profil], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=600)
    rouges = [l for l in r.stdout.splitlines() if l.startswith(' ✗')]; tombe = r.returncode == 1 and bool(rouges)
    bilan = [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:] or ['(pas de bilan)']
    print(f'{cle} : {"✓ la sonde TOMBE" if tombe else "✗ la sonde reste verte (code " + str(r.returncode) + ")"} — {titre} — {bilan[0]}')
    for l in rouges[:3]: print('      ', l[:180])
    shutil.rmtree(tmp, ignore_errors=True); return tombe
if __name__ == '__main__':
    cles = sys.argv[1:] or list(MUT); ok = [jouer(k) for k in cles]
    print(f'\n{sum(ok)} ✓ · {len(ok) - sum(ok)} ✗ sur {len(ok)} mutations'); sys.exit(0 if all(ok) else 1)
