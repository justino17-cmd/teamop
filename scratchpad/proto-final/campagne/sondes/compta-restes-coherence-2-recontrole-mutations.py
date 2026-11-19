#!/usr/bin/env python3
# Mutations DU RECONTRÔLEUR (18 novembre 2026), sur COPIES, jamais sur la page livrée : celles du correcteur visaient le TTC, le client, l'état, la tuile, les filtres ; ici on vise ce que la sonde
# compta-ventes-cadre-explore.js ne dit pas lire : la DATE d'émission, l'ÉCHÉANCE, le nombre de RELANCES, le MOYEN de paiement, la date du paiement, l'ORDRE des lignes.
# Chaque mutation vise l'occurrence après la définition VIVANTE de VUES.ventes (la page en porte deux). usage : python3 …-mutations.py [numéros]
import hashlib, os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SONDE = os.path.join(os.path.dirname(__file__), 'compta-ventes-cadre-explore.js')
PAGE = 'prototype-comptabilite.html'
VIVANTE = "const L0 = E.filter(e => e.j === 'VE' && e.etat !== 'supprimee' && !e.essai).map(e => factureDe(e.piece)).filter(f => f && (f.e.date >= '2026-10-01' || !f.lettree"
MUT = [
 ('N1 la DATE d’émission de chaque ligne devient l’échéance', '${dCourt(f.e.date)}</td><td class="n lt-m"', '${dCourt(f.e.ech || f.e.date)}</td><td class="n lt-m"'),
 ('N2 l’ÉCHÉANCE d’une facture en retard devient sa date d’émission', "due le ${dCourt(f.e.ech)}${F.relances ?", "due le ${dCourt(f.e.date)}${F.relances ?"),
 ('N3 le nombre de RELANCES +1', "plur(F.relances, 'relance')", "plur(F.relances + 1, 'relance')"),
 ('N4 le MOYEN de paiement de chaque ligne payée devient « carte »', '<span class="st ok">Payée · ${p.mode}${OPL_AVOIRS', '<span class="st ok">Payée · carte${OPL_AVOIRS'),
 ('N5 l’ORDRE des lignes est inversé', ")).sort((a, b) => b.e.date.localeCompare(a.e.date) || b.e.piece.localeCompare(a.e.piece));", ")).sort((a, b) => a.e.date.localeCompare(b.e.date) || a.e.piece.localeCompare(b.e.piece));"),
 ('N6 la DATE du paiement de chaque ligne payée est celle de l’émission', '<span class="sec">le ${dCourt(p.date)}</span>', '<span class="sec">le ${dCourt(f.e.date)}</span>'),
]
def h(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
avant = {n: h(os.path.join(R, 'apercu', n)) for n in os.listdir(os.path.join(R, 'apercu')) if n.endswith('.html')}
choix = set(sys.argv[1:]); nok = 0
for nom, a, b in MUT:
    if choix and nom.split()[0][1:] not in choix: continue
    d = tempfile.mkdtemp(prefix='mut-rc-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', PAGE); s = open(p, encoding='utf-8').read()
    base = s.index(VIVANTE); n = s.count(a, base)
    if n < 1: print('MAL VISÉE', nom, n); nok += 1; shutil.rmtree(d, ignore_errors=True); continue
    i = s.index(a, base); ligne = s.count('\n', 0, i) + 1
    open(p, 'w', encoding='utf-8').write(s[:i] + b + s[i + len(a):])
    r = subprocess.run(['node', SONDE], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); tombe = r.returncode == 1 and m and int(m[-1][1]) > 0
    tombes = re.findall(r'  ✗ (V\w+)', r.stdout)
    print(('TOMBE ' if tombe else 'SURVIT ') + nom + ' (ligne ' + str(ligne) + ', occurrences après la vivante : ' + str(n) + ')', m[-1] if m else r.stdout[-200:] + r.stderr[-200:], sorted(set(tombes)), flush=True); nok += 0 if tombe else 1
    shutil.rmtree(d, ignore_errors=True)
apres = {n: h(os.path.join(R, 'apercu', n)) for n in avant}
print('pages livrées inchangées par les mutations :', 'oui' if apres == avant else 'NON')
sys.exit(1 if nok or apres != avant else 0)
