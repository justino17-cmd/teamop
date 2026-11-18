#!/usr/bin/env python3
# Mutations sur COPIES (jamais sur la page livrée) : la sonde compta-ventes-cadre-explore.js doit tomber sur CHACUNE. usage : python3 compta-ventes-cadre-explore-mutations.py [numéros]
# Les quatre premières étaient survivantes (recontrôle du 18/11 : « 12 ✓ · 0 ✗ ») ; les deux suivantes étaient déjà couvertes (V6, V9) ; la dernière garde le FILTRE (ce qu'il montre, pas seulement sa pastille).
# Une mutation vise l'OCCURRENCE réellement lue : la page porte deux fois « VUES.ventes » (l'ancienne, recouverte, et celle de la fenêtre) — `apres` ancre la mutation APRÈS la définition vivante,
# et le script écrit la ligne touchée : une mutation qui frappe la copie recouverte ne prouve rien.
import hashlib, os, re, shutil, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SONDE = os.path.join(os.path.dirname(__file__), 'compta-ventes-cadre-explore.js')
PAGE = 'prototype-comptabilite.html'
VIVANTE = "const L0 = E.filter(e => e.j === 'VE' && e.etat !== 'supprimee' && !e.essai).map(e => factureDe(e.piece)).filter(f => f && (f.e.date >= '2026-10-01' || !f.lettree"
MUT = [
 ('M1 le TTC de CHAQUE ligne +1 €', "<td class=\"n lt-m\" role=\"cell\">${nb(f.ttc)}</td>\n          <td class=\"lt-e\" role=\"cell\">${OPL_ANNULEES", "<td class=\"n lt-m\" role=\"cell\">${nb(f.ttc + 1)}</td>\n          <td class=\"lt-e\" role=\"cell\">${OPL_ANNULEES"),
 ('M2 le nom du client faux sur CHAQUE ligne', "<td class=\"lt-t\" role=\"cell\">${esc(nomTiers(cli))}<span class=\"sec\">${esc(f.e.lib.split(' · ')[0])}</span><span class=\"sec seul-tel mono\">", "<td class=\"lt-t\" role=\"cell\">${esc(nomTiers(cli))} (faux)<span class=\"sec\">${esc(f.e.lib.split(' · ')[0])}</span><span class=\"sec seul-tel mono\">"),
 ('M3 la tuile « En retard » +1', "<span>En retard</span><b>${retard.length}</b>", "<span>En retard</span><b>${retard.length + 1}</b>"),
 ('M4 l\'état de CHAQUE ligne payée faux (« À encaisser »)', "<span class=\"st ok\">Payée · ${p.mode}", "<span class=\"st ok\">À encaisser · ${p.mode}"),
 ('M8 l\'état de CHAQUE ligne à encaisser faux (« Payée »)', "`<span class=\"st warn\">À encaisser</span><span class=\"sec\">${f.e.ech", "`<span class=\"st ok\">Payée · virement</span><span class=\"sec\">${f.e.ech"),
 ('M5 « Reste à encaisser » +1 €', "<span>Reste à encaisser</span><b>${eur(oplDus())}</b>", "<span>Reste à encaisser</span><b>${eur(oplDus() + 1)}</b>"),
 ('M6 la pastille « Payées » compte toutes les factures', "['payees', 'Payées', payees.length]", "['payees', 'Payées', L0.length]"),
 ('M7 le filtre « Payées » montre toutes les factures (la pastille reste juste)', "UI.vf === 'payees' ? payees : L0", "UI.vf === 'payees' ? L0 : L0"),
]
def h(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
avant = {n: h(os.path.join(R, 'apercu', n)) for n in os.listdir(os.path.join(R, 'apercu')) if n.endswith('.html')}
choix = set(sys.argv[1:]); nok = 0
for nom, a, b in MUT:
    if choix and nom.split()[0][1:] not in choix: continue
    d = tempfile.mkdtemp(prefix='mut-vce-'); shutil.copytree(os.path.join(R, 'apercu'), os.path.join(d, 'apercu'))
    p = os.path.join(d, 'apercu', PAGE); s = open(p, encoding='utf-8').read()
    base = s.index(VIVANTE); i = s.index(a, base)   # l'occurrence APRÈS la définition vivante
    if s.count(a, base) != 1: print('MAL VISÉE', nom, s.count(a, base)); nok += 1; shutil.rmtree(d, ignore_errors=True); continue
    ligne = s.count('\n', 0, i) + 1
    open(p, 'w', encoding='utf-8').write(s[:i] + b + s[i + len(a):])
    r = subprocess.run(['node', SONDE], env=dict(os.environ, RACINE=d), capture_output=True, text=True, timeout=560)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); tombe = r.returncode == 1 and m and int(m[-1][1]) > 0
    tombes = re.findall(r'  ✗ (V\w+)', r.stdout)
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom + ' (ligne ' + str(ligne) + ')', m[-1] if m else r.stdout[-200:] + r.stderr[-200:], sorted(set(tombes))); nok += 0 if tombe else 1
    shutil.rmtree(d, ignore_errors=True)
apres = {n: h(os.path.join(R, 'apercu', n)) for n in avant}
print('pages livrées inchangées par les mutations :', 'oui' if apres == avant else 'NON')
sys.exit(1 if nok or apres != avant else 0)
