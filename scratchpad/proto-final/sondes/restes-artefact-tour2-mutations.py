#!/usr/bin/env python3
# MUTATIONS des restes « artefact », tour 2 (17 novembre 2026) : un défaut remis dans la page, la sonde qui le garde rejouée — elle DOIT tomber.
# À lancer APRÈS avoir commité le correctif ; on restaure par réécriture du texte d'origine et on relit `git status apercu` à la fin (doit être propre).
# Un seul navigateur à la fois, chaque exécution avec un délai.   python3 restes-artefact-tour2-mutations.py [numéro ...]
import subprocess, sys, re, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
P = lambda n: os.path.join(RACINE, 'apercu', n)
PRINCIPALE, DOCS = P('prototype-op-gestion.html'), P('prototype-documents.html')
S1 = 'scratchpad/proto-final/sondes/restes-artefact-tour1-recontrole.js'   # § 3 : le clavier atteint le lien (JOUR=1 PROFILS=mac)
S2 = 'scratchpad/proto-final/sondes/restes-artefact-tour2.js'
M = [
 ("1 le lien de retour est posé HORS de #cnx (enfant de body) : le clavier ne l'atteint plus", PRINCIPALE,
  [("c.insertAdjacentHTML('afterbegin', '<button type=\"button\" id=\"cnx-test\"", "document.body.insertAdjacentHTML('beforeend', '<button type=\"button\" id=\"cnx-test\""),
   ("#cnx #cnx-test{display:inline-flex}", "body:has(#cnx) #cnx-test{display:inline-flex}")], S1, {'JOUR': '1', 'PROFILS': 'mac'}),
 ("2 le lien de retour n'est plus reposé sur les écrans qui recréent #cnx (observateur retiré)", PRINCIPALE,
  [("new MutationObserver(cnxTestPoser).observe(document.body, { childList:true });", "")], S1, {'JOUR': '1', 'PROFILS': 'mac'}),
 ("3 le bouton « Voir comme l'application » reste affiché pendant la visite parlée", PRINCIPALE,
  [("body.gd-on .rl-voir{display:none!important}", "")], S2, {'PROFILS': 'mac'}),
 ("4 le PDF de l'atelier part tel quel au pont (Blob né dans le cadre)", DOCS,
  [("data:await blobPourPont(blob)", "data:blob")], S2, {'PROFILS': 'mac'}),
 ("5 la page principale envoie ses données telles quelles au pont du parent", PRINCIPALE,
  [("data:await donneesPourPont(data) }", "data }")], S2, {'PROFILS': 'mac'}),
 ("6 la page principale refait un Blob de la mauvaise fenêtre (la sienne)", PRINCIPALE,
  [("return new H.Blob([await data.arrayBuffer()], { type:data.type || '' });", "return new Blob([await data.arrayBuffer()], { type:data.type || '' });"),
   ("return new H.Blob([data]); }", "return new Blob([data]); }")], S2, {'PROFILS': 'mac'}),
]
choix = [int(x) for x in sys.argv[1:]] if sys.argv[1:] else None
bilan = []
for nom, fichier, rempl, sonde, env in M:
    n = int(nom.split()[0])
    if choix and n not in choix: continue
    src = open(fichier, encoding='utf-8').read(); neuf = src; ok = True
    for a, b in rempl:
        if neuf.count(a) != 1: print(f"#{nom} : ANCRE INTROUVABLE ({neuf.count(a)} occurrences) — non jouée"); bilan.append((nom, 'ancre')); ok = False; break
        neuf = neuf.replace(a, b)
    if not ok: continue
    try:
        open(fichier, 'w', encoding='utf-8').write(neuf)
        d = subprocess.run(['git', 'diff', '--numstat', fichier], cwd=RACINE, capture_output=True, text=True).stdout.strip()
        e = dict(os.environ, **env)
        try:
            r = subprocess.run(['node', sonde], cwd=RACINE, capture_output=True, text=True, timeout=560, env=e); sortie = r.stdout + r.stderr; code = r.returncode
        except subprocess.TimeoutExpired:
            sortie = 'DÉLAI'; code = 99
        b = re.findall(r'(\d+) ✓\s+·?\s*(\d+) ✗', sortie); res = b[-1] if b else ('?', '?')
        tombees = [l.strip()[:150] for l in sortie.splitlines() if l.strip().startswith('✗')][:2]
        mord = code != 0 and res[1] not in ('0', '?')
        print(f"#{nom} : diff {d or '(aucun)'} → {res[0]} ✓ · {res[1]} ✗ code={code} {'MORD' if mord else 'NE MORD PAS'}")
        for t in tombees: print('     ', t)
        bilan.append((nom, 'mord' if mord else 'ne mord pas'))
    finally:
        open(fichier, 'w', encoding='utf-8').write(src)
print('\nBILAN :', sum(1 for _, x in bilan if x == 'mord'), 'mutations attrapées sur', len(bilan))
for nom, x in bilan:
    if x != 'mord': print('  ⚠', nom, x)
st = subprocess.run(['git', 'status', '--short', 'apercu'], cwd=RACINE, capture_output=True, text=True).stdout.strip()
print('git status apercu :', st or '(propre)')
