#!/usr/bin/env python3
# Contre-épreuve du tour 5 des restes « entreprise » (recontrôle adverse) : on REMET un défaut dans une COPIE (jamais dans les fichiers du dépôt) et la sonde visée doit tomber (code de sortie ≠ 0).
# Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit : on le DIT. Avant chaque tour on vérifie que la mutation a changé le fichier (un `replace`
# qui ne trouve rien n'éprouve rien).
# Usage : python3 mail-mutations.py [de] [a]     (indices 1..N, pour couper le lot en tours de moins de 5 minutes)
import os, shutil, subprocess, sys, tempfile
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
COURRIER, PAGE = 'apercu/prototype-courrier.js', 'apercu/prototype-op-gestion.html'
# (nom, fichier, ancien, nouveau, sonde qui doit tomber)
M = [
 ('R1 : mbxLiberer retire sans la case Planning', PAGE, "let n = 0; if (!mbxPeutTenir()) return n; for (let k = BUREAU.length", "let n = 0; for (let k = BUREAU.length", 'entreprise-restes5-deuxpersonnes.js'),
 ('R2 : le toast dit toujours « libérées » (branche des options d\'un collègue retirée)', PAGE, "(nLib ? ' : les autres options sont libérées. ' : nResteOpt ? ' : les options tenues par un collègue restent au planning jusqu’à leur échéance. ' : '. ')", "' : les autres options sont libérées. '", 'entreprise-restes4-recontrole.js:a'),
 ('R2b : le toast dit « libérées » même quand rien n\'était tenu', PAGE, "(nLib ? ' : les autres options sont libérées. ' : nResteOpt ?", "(nLib || !nResteOpt ? ' : les autres options sont libérées. ' : nResteOpt ?", 'entreprise-restes4-recontrole.js:c'),
 ('R3 : les créneaux proposés tiennent des options sans la case Planning', PAGE, "const mbxPeutTenir = () => peut('planif', 'm');", "const mbxPeutTenir = () => true;", 'entreprise-restes4-creneaux.js'),
 ('R4 : rembourseNote sans sa garde', PAGE, "rembourseNote(b){ if (!peut('ventes', 'm')) return droitsRefus('ventes', 'm', 'action', 'rembourseNote'); const f", "rembourseNote(b){ const f", 'droits-restes5-verbes.js'),
 ('R5 : trfannul sans sa garde', PAGE, "if (a === 'trfannul') { if (!peut('achats', 'm')) return droitsRefus('achats', 'm', 'axa', 'trfannul'); const u", "if (a === 'trfannul') { const u", 'droits-restes5-verbes.js'),
 ('R6 : pdx|piece sans sa garde', PAGE, "if (a === 'piece') { if (!peut('stock', 'm')) return droitsRefus('stock', 'm', 'pdx', 'piece'); const i", "if (a === 'piece') { const i", 'droits-restes5-verbes.js'),
 ('R7 : transfertok sort de la liste des verbes qui exigent le droit de décider', PAGE, "['transfert', 'transfertok', 'commande', 'magasin', 'refuser', 'refok'].includes(a) && d", "['transfert', 'commande', 'magasin', 'refuser', 'refok'].includes(a) && d", 'droits-restes5-verbes.js'),
 ('R8 : rangc retiré de la table (« Voir les clients archivés » reprend la forme d\'une écriture)', PAGE, "sortie:{ d:'l' }, rangc:{ d:'l' }, secv:{ d:'l' }, v:{ d:'l' },", "sortie:{ d:'l' }, secv:{ d:'l' }, v:{ d:'l' },", 'droits-restes5-verbes.js'),
 ('R9 : sortie retiré de la table', PAGE, "sortie:{ d:'l' }, rangc:{ d:'l' }, secv:{ d:'l' }, v:{ d:'l' },", "rangc:{ d:'l' }, secv:{ d:'l' }, v:{ d:'l' },", 'droits-restes5-verbes.js'),
 ('R10 : secv retiré de la table', PAGE, "sortie:{ d:'l' }, rangc:{ d:'l' }, secv:{ d:'l' }, v:{ d:'l' },", "sortie:{ d:'l' }, rangc:{ d:'l' }, v:{ d:'l' },", 'droits-restes5-verbes.js'),
 ('R11 : data-v classé en modification (refuse la valeur d\'un bouton)', PAGE, "secv:{ d:'l' }, v:{ d:'l' },", "secv:{ d:'l' }, v:{ d:'m' },", 'droits-restes5-verbes.js'),
 ('R12 : reglages sorti de la lecture de axa', PAGE, "regle reglages kmtarif", "regle kmtarif", 'droits-restes5-verbes.js'),
 ('R13 : trfannul sorti de la table (retombe sur la forme)', PAGE, "m:'demmod trfannul budget budgetok", "m:'demmod budget budgetok", 'droits-table.js'),
 ('R14 : sxdadd remis dans la table alors que la page ne le porte plus', PAGE, "sxauto:{ k:'stock', d:'m' },\n  /* temps", "sxauto:{ k:'stock', d:'m' }, sxdadd:{ k:'stock', d:'m' },\n  /* temps", 'droits-table.js'),
]
de = int(sys.argv[1]) if len(sys.argv) > 1 else 1
a = int(sys.argv[2]) if len(sys.argv) > 2 else len(M)
tmp = tempfile.mkdtemp(prefix='mutations-mail-')
racine = os.path.join(tmp, 'depot'); os.makedirs(racine)
shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
mordent, muets = [], []
for i, (nom, fic, ancien, nouveau, sonde) in enumerate(M, 1):
    if i < de or i > a: continue
    cible = os.path.join(racine, fic); orig = open(os.path.join(DEPOT, fic), encoding='utf-8').read()
    n = orig.count(ancien)
    if n != 1:
        print('M%d %s : ⚠ motif trouvé %d fois (attendu 1) — mutation NON jouée' % (i, nom, n)); muets.append((i, nom, 'motif')); continue
    open(cible, 'w', encoding='utf-8').write(orig.replace(ancien, nouveau))
    if open(cible, encoding='utf-8').read() == orig: print('M%d : la mutation n\'a rien changé' % i); continue
    env = dict(os.environ, RACINE=racine, CAP=os.path.join(tmp, 'cap'))
    try:
        fichier, _, partie = sonde.partition(':')
        if partie: env['PARTIE'] = partie
        r = subprocess.run(['node', os.path.join(SONDES, fichier)] + ([partie] if partie else []), cwd=DEPOT, env=env, capture_output=True, text=True, timeout=560)
        sortie, code = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired as e:
        sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 124
    ko = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')][:2]
    bilan = [l for l in sortie.split('\n') if l.startswith('==')]
    if code != 0: mordent.append(i); print('M%d MORD  %s  → %s  [%s]  %s' % (i, nom, sonde, bilan[-1] if bilan else 'code %d' % code, (ko[0][:110] if ko else '')))
    else: muets.append((i, nom, sonde)); print('M%d MUETTE %s  → %s ne tombe PAS  [%s]' % (i, nom, sonde, bilan[-1] if bilan else ''))
    shutil.copyfile(os.path.join(DEPOT, fic), cible)   # on remet l'original dans la copie avant le tour suivant
print('\nmutations jouées : %d · qui mordent : %d · muettes : %d' % (len(mordent) + len(muets), len(mordent), len(muets)))
print('git status du dépôt (doit rester sans changement dans apercu/) :', subprocess.run(['git', 'status', '--short', 'apercu'], cwd=DEPOT, capture_output=True, text=True).stdout.strip() or 'propre')
shutil.rmtree(tmp, ignore_errors=True)
sys.exit(0 if not muets else 2)
