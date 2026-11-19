#!/usr/bin/env python3
# Mutations DU RECONTRÔLEUR sur la logique du reçu (copies, page livrée inchangée) : on joue la sonde du correcteur (compta-restes-coherence-2.js) ET celle du recontrôle sur la même copie.
# Une mutation que la première laisse passer et que la seconde attrape dit ce que la première ne jouait pas.
import hashlib, os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
D = os.path.dirname(__file__); S1 = os.path.join(D, 'compta-restes-coherence-2.js'); S2 = os.path.join(D, 'compta-restes-coherence-2-recontrole.js')
PAGE = 'prototype-comptabilite.html'
MUT = [
 ('R1 un chèque reçu sur place entre dans 512000 au lieu de 511200', "chq:'511200', esp:'530000', vir:'512000' }[mode], j =", "chq:'512000', esp:'530000', vir:'512000' }[mode], j ="),
 ('R2 la ligne de relevé d’un virement n’est plus retirée quand le reçu change', "const k = RELEVE.findIndex(x => x.pointe === ref(e, 0)); if (k >= 0) { RELEVE.splice(k, 1);", "const k = RELEVE.findIndex(x => x.pointe === ref(e, 0)); if (false) { RELEVE.splice(k, 1);"),
 ('R3 la TVA du reçu est calculée sur le HT au lieu du TTC (taux appliqué au TTC)', "tva = r2(ttc - ttc / (1 + (+r.tva) / 100))", "tva = r2(ttc * (+r.tva) / 100)"),
 ('R4 le reçu n’est plus repris quand la facture part (la clé ne change plus)', "const oplRecuCle = r => r.id + '|' + r2(+r.ttc) + '|' + oplMode(r.mode) + '|' + r.d;", "const oplRecuCle = r => r.id;"),
]
def h(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
avant = {n: h(os.path.join(R, 'apercu', n)) for n in os.listdir(os.path.join(R, 'apercu')) if n.endswith('.html')}
choix = set(sys.argv[1:])
for nom, a, b in MUT:
    if choix and nom.split()[0][1:] not in choix: continue
    d = tempfile.mkdtemp(prefix='mut-rr-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', PAGE); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('MAL VISÉE', nom, s.count(a)); shutil.rmtree(d, ignore_errors=True); continue
    i = s.index(a); ligne = s.count('\n', 0, i) + 1; open(p, 'w', encoding='utf-8').write(s[:i] + b + s[i + len(a):])
    res = []
    for nm, S in (('correcteur', S1), ('recontrôle', S2)):
        r = subprocess.run(['node', S], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
        m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); ko = re.findall(r'  ✗ (\w+)', r.stdout)
        res.append(nm + ' ' + ('TOMBE' if r.returncode == 1 and m and int(m[-1][1]) > 0 else 'SURVIT') + ' ' + (str(m[-1]) if m else r.stdout[-120:]) + ' ' + ' '.join(sorted(set(ko))[:6]))
    print(nom, '(ligne', ligne, ') →', ' | '.join(res), flush=True); shutil.rmtree(d, ignore_errors=True)
apres = {n: h(os.path.join(R, 'apercu', n)) for n in avant}
print('pages livrées inchangées par les mutations :', 'oui' if apres == avant else 'NON')
