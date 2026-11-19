#!/usr/bin/env python3
# Contre-épreuve « compta-ventes » : on remet un défaut dans une COPIE des pages (jamais dans le dépôt) et on vérifie que la sonde qui garde ce comportement TOMBE.
# Une sonde qui reste verte sous mutation ne garde rien. usage : python3 compta-ventes-mutations.py [M1 M2 …]
# La copie vit dans le dossier temporaire ; lib.js la sert à la place du dépôt (RACINE). Un seul navigateur à la fois (les sondes passent par lib.ouvrir).
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_DIR', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/mut-compta-ventes')
PAGE = 'apercu/prototype-op-gestion.html'; CADRE = 'apercu/prototype-comptabilite.html'
# (nom, fichier, ancre exacte, remplacement, sonde qui doit tomber, ce que la mutation remet)
M = [
 ('M1', PAGE, "const restant = f => ttcDe(f) - (f.recu || 0);", "const restant = f => ttcDe(f);", 'b', "le reste dû ignore les paiements partiels"),
 ('M2', PAGE, "ENCAISSEMENTS.unshift({ d:o.d || '31/10', h:o.h || hm(MAINT_MIN), cli:f.cli, fac:f.num, mode:m, ttc:v, tva:f.tva, photo:o.photo, preuve:o.photo ? undefined : undefined });", "", 'b', "un encaissement ne laisse aucune ligne dans les paiements"),
 ('M3', PAGE, "if (d.opc_relance) { const q = d.opc_relance, f = q.num ? cmptFactureDe(q.num) : null; if (f && f.st !== 'payee') { facRelanceNoter(f); if (q.n > f.relances) f.relances = q.n; } }", "", 'd', "une relance faite dans le cadre n'arrive plus sur la facture"),
 ('M4', PAGE, "enc:ENCAISSEMENTS.map(e => ({ d:cxIso(e.d), cli:e.cli, nom:nom(e.cli), type:typ(e.cli), fac:e.fac, mode:e.mode, ttc:cpR(e.ttc), tva:e.tva })) };", "enc:[] };", 'd', "le cadre ne reçoit plus les paiements d'OP GESTION"),
 ('M5', PAGE, "FACTURES.unshift({ id:'av' + Date.now(), num, cli:f.cli, objet:'Avoir sur ' + f.num, ht:htDe(f),", "FACTURES.unshift({ id:'av' + Date.now(), num, cli:f.cli, objet:'Avoir sur ' + f.num, ht:0,", 'c', "un avoir de 0 €"),
 ('M6', PAGE, "const num = 'AV-2026-00' + String(7 + FACTURES.filter(x => x.st === 'avoir').length).padStart(2, '0');", "const num = 'AV-2026-0007';", 'c', "tous les avoirs prennent le même numéro (garde : numéro qui se suit)"),
 ('M7', PAGE, "if (!(v >= .01)) { toast('Indique le montant reçu.'); return; }   /* 0,001 € « payait en partie » une facture de 121 € : le plus petit paiement est un centime · 13 novembre 2026 */", "", 'b', "un paiement partiel sous un centime est accepté"),
 ('M8', PAGE, "if (!d) return toast('Écris ce que tu factures (la désignation).');", "", 'a', "une facture sans désignation est acceptée"),
]
def prepare():
    if os.path.exists(TMP): shutil.rmtree(TMP)
    os.makedirs(TMP); shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(TMP, 'apercu'))
def lancer(nom, sonde):
    env = dict(os.environ, RACINE=TMP)
    r = subprocess.run(['node', os.path.join(ICI, f'compta-ventes-parcours-{sonde}.js'), 'mac'], env=env, capture_output=True, text=True, timeout=900)
    sortie = r.stdout; m = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie)
    # les contrôles qui tombent, par NOM (le début de la ligne, avant « → »)
    tombes = {re.split(r' → | :: ', l.strip())[0] for l in sortie.splitlines() if l.strip().startswith('✗')}
    return r.returncode, (m[-1] if m else None), tombes
BASE = {}   # sonde → ensemble des contrôles qui tombent SANS mutation (les défauts déjà rapportés) : une mutation mord si elle en fait tomber d'AUTRES
def base(sonde):
    if sonde not in BASE:
        shutil.copyfile(os.path.join(DEPOT, PAGE), os.path.join(TMP, PAGE)); shutil.copyfile(os.path.join(DEPOT, CADRE), os.path.join(TMP, CADRE))
        code, bilan, tombes = lancer('base', sonde); BASE[sonde] = tombes; print(f'base sonde {sonde} : bilan={bilan}, {len(tombes)} contrôle(s) déjà tombé(s) (défauts rapportés)')
    return BASE[sonde]
choix = [a for a in sys.argv[1:]] or [m[0] for m in M]
prepare(); resultats = []
for nom, fichier, ancre, rempl, sonde, quoi in M:
    if nom not in choix: continue
    src = os.path.join(DEPOT, fichier); dst = os.path.join(TMP, fichier); shutil.copyfile(src, dst)
    t = open(dst, encoding='utf-8').read()
    if t.count(ancre) != 1: print(f'{nom} : ANCRE ABSENTE OU MULTIPLE ({t.count(ancre)}) — mutation non jouée'); resultats.append((nom, 'ancre', None)); continue
    avant = base(sonde); open(dst, 'w', encoding='utf-8').write(t.replace(ancre, rempl))
    code, bilan, tombes = lancer(nom, sonde); nouveaux = sorted(tombes - avant); mord = bool(nouveaux) or code == 2
    print(f'{nom} [{quoi}] sonde {sonde} : {"MORD" if mord else "NE MORD PAS"}  bilan={bilan}  nouveaux contrôles tombés : {len(nouveaux)}  {[x[:90] for x in nouveaux[:2]]}'); resultats.append((nom, 'mord' if mord else 'ne-mord-pas', bilan))
    shutil.copyfile(src, dst)   # la copie revient à l'original avant la mutation suivante
n = sum(1 for r in resultats if r[1] == 'mord'); print(f'\n{n} mutations mordent sur {len(resultats)} jouées')
