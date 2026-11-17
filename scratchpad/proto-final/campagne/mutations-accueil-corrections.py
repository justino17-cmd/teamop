#!/usr/bin/env python3
# Contre-épreuve de accueil-corrections.js : on REMET chaque défaut corrigé dans une COPIE de la page (jamais dans le dépôt) et on exige que la sonde tombe.
# Chaque mutation prouve d'abord qu'elle touche son motif exactement une fois. Usage : python3 mutations-accueil-corrections.py [C1 C2 ...]
import os, shutil, subprocess, sys
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDE = os.path.join(RACINE, 'scratchpad/proto-final/campagne/sondes/accueil-corrections.js')
PAGE = 'apercu/prototype-op-gestion.html'
MUTATIONS = {
  'C1': ("les parts de paiement redeviennent arrondies une à une (101 %)", "if (r > 0) { bas[i]++; r--; }", "if (false) { bas[i]++; r--; }"),
  'C2': ("payer() n'écrit plus dans l'Historique", "journalPaiement(f, v, m, ROLE === 'client' ? { qui:'client', action:'a payé en ligne' } : {});", ""),
  'C3': ("« Annuler » n'écrit plus sa ligne", "journalPaiement(f, e0.ttc, e0.mode, { action:'a annulé le paiement noté' }); ", ""),
  'C4': ("le rapprochement bancaire n'écrit plus dans l'Historique", "journalPaiement(f, r.m, 'Virement', { plus:' · vu sur le relevé de banque' });", ""),
  'C5': ("l'Accueil d'un jour sans intervention redevient un cadre vide", "${auj.length ? '' : `<p class=\"gris\" style=\"margin:6px 0 12px\">", "${true ? '' : `<p class=\"gris\" style=\"margin:6px 0 12px\">"),
  'C6': ("« HT de contrats par an » redevient « de contrats par an »", "<span>HT de contrats par an</span>", "<span>de contrats par an</span>"),
  'C7': ("OP Lia enregistre un paiement sans l'Historique", "journalPaiement(f, cpR(v), mode);", ""),
  'C8': ("« Paiement en partie » n'écrit plus dans l'Historique", "journalPaiement(f, v, m); fermerPanneau();", "fermerPanneau();"),
}
def jouer(cle, profil='mac'):
    titre, avant, apres = MUTATIONS[cle]
    tmp = f'/tmp/mut-accc-{cle}'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    shutil.copytree(os.path.join(RACINE, 'apercu'), os.path.join(tmp, 'apercu'))
    f = os.path.join(tmp, PAGE); s = open(f, encoding='utf-8').read(); n = s.count(avant)
    if n != 1: print(f'{cle} : ✗ la mutation ne trouve pas son motif exactement une fois ({n})'); return False
    open(f, 'w', encoding='utf-8').write(s.replace(avant, apres, 1))
    r = subprocess.run(['timeout', '560', 'node', SONDE, profil], env={**os.environ, 'RACINE': tmp}, capture_output=True, text=True, timeout=600)
    rouges = [l for l in r.stdout.splitlines() if l.startswith(' ✗')]; tombe = r.returncode == 1 and bool(rouges)
    bilan = [l for l in r.stdout.splitlines() if l.startswith('== ')][-1:] or ['(pas de bilan)']
    print(f'{cle} : {"✓ la sonde TOMBE" if tombe else "✗ la sonde reste verte (code " + str(r.returncode) + ")"} — {titre} — {bilan[0]}')
    for l in rouges[:3]: print('      ', l[:180])
    shutil.rmtree(tmp, ignore_errors=True); return tombe
if __name__ == '__main__':
    cles = sys.argv[1:] or list(MUTATIONS); ok = [jouer(c) for c in cles]
    print(f'\n== {sum(ok)} ✓ · {len(ok) - sum(ok)} ✗'); sys.exit(0 if all(ok) else 1)
