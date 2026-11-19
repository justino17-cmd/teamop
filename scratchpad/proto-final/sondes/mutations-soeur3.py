#!/usr/bin/env python3
# CONTRE-ÉPREUVE du rejeu sœur 3 : chaque défaut est REMIS dans le prototype, la sonde qui le garde doit tomber, puis `git checkout` restaure.
# ⛔ À lancer avec les correctifs COMMITÉS (git checkout restaure depuis HEAD) ; vérifie `git diff --stat apercu/` vide à la fin. Un seul navigateur à la fois, un délai par exécution.
import subprocess, sys, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
S = 'scratchpad/proto-final/sondes/'
G, C = 'apercu/prototype-op-gestion.html', 'apercu/prototype-courrier.js'
SEC, TMP, EQ, BOX = 'securite-soeur3.js', 'temps-retour-systeme.js', 'equipe-semaines-nommees.js', 'boite-quitter-calques.js'
M = [
 ('R4 minuterie de 700 ms remise', G, [("function navEtatVu(){", "document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('a[href^=\"#\"]')) window.__nc = Date.now(); }, true);\nfunction navEtatVu(){"), ("TT.sys = cpProg === null && navEtatVu();", "TT.sys = cpProg === null && Date.now() - (window.__nc || 0) > 700;")], TMP),
 ('R4 la marque d\'historique n\'est plus posée', G, [("function navEtatMarquer(){ try {", "function navEtatMarquer(){ return; try {")], TMP),
 ('R4 toute entrée neuve passe pour un retour', G, [("function navEtatVu(){ try { return !!(history.state && history.state.nav); }", "function navEtatVu(){ try { return true; }")], TMP),
 ('2 plage unique du premier au dernier', G, [("<small>${esc(eqxPlagesSem(R.pt))}</small>", "<small>Du ${esc(jCourt(R.pt[0]))} au ${esc(jCourt(ajoute(R.pt[R.pt.length - 1], 6)))}</small>")], EQ),
 ('2 les semaines contiguës ne se rejoignent plus', G, [("if (d && ajoute(d.fin, 1) === m) d.fin = ajoute(m, 6); else R.push", "R.push")], EQ),
 ('3 l\'aperçu du PDF ne part plus', C, [("if(location.hash!==HIST.hash){ if(pdfv) fermerApercu(); var o", "if(location.hash!==HIST.hash){ var o")], BOX),
 ('3 la feuille « Ajouter une boîte » ne part plus', C, [("o.classList.contains(\"ov-menu\")||o.querySelector(\".sheet.acct\")", "o.classList.contains(\"ov-menu\")")], BOX),
 ('3 la feuille du message part aussi (sur-correction)', C, [("o.classList.contains(\"ov-menu\")||o.querySelector(\".sheet.acct\")", "true")], BOX),
 ('C1 la marque va toujours sur le Prénom', G, [("return nbSignes(CREA.nv.nom || '') >= nbSignes(CREA.nv.contact || '') ? 'nom' : 'contact'; }", "return 'contact'; }")], SEC),
 ('C2 unités non bornées au collage', G, [(" && av.length + x.length + ap.length <= unitesMax(m); while", "; while")], SEC),
 ('C2 refusLong sans unités', G, [("const refusLong = (t, max, lib) => { const x = libelleSur(t, 1e9), n = nbSignes(x);", "const refusLong = (t, max, lib) => { const x = libelleSur(t, 1e9), n = nbSignes(x); if (n <= max) return '';")], SEC),
 ('R1 le champ plus long que le plafond est recoupé', G, [("if (!tenait) return;", "")], SEC),
 ('R5 note de tâche sans maxlength', G, [('<textarea id="tk-n" rows="3" maxlength="600">', '<textarea id="tk-n" rows="3">')], SEC),
 ('R5 note de tâche sans refus', G, [("refusTexte(document.getElementById('tk-n').value, NOTE_MAX, 'Note')", "''")], SEC),
 ('R5 motif de création sans refus', G, [("refusTexte(document.getElementById('n-motif').value, MOTIF_MAX, 'Ce que le client a dit')", "''")], SEC),
 ('R5 motif de modification sans refus', G, [("refusTexte(document.getElementById('m-motif').value, MOTIF_MAX, 'Ce que le client a dit')", "''")], SEC),
 ('R5 courriel sans maxlength', G, [('<textarea id="ml-m" rows="9" maxlength="5000">', '<textarea id="ml-m" rows="9">')], SEC),
 ('N-b anneau de focus bleu sur un champ refusé', G, [('html body [aria-invalid="true"]:focus,html body [aria-invalid="true"]:focus-visible{outline:3px solid var(--rouge);outline-offset:2px}', '')], SEC),
]
sel = sys.argv[1:]
bad = 0
for nom, f, subs, sonde in M:
    if sel and not any(x in nom for x in sel): continue
    path = os.path.join(R, f); src = open(path, encoding='utf-8').read(); t = src
    for a, b in subs:
        if t.count(a) != 1: print('✗ MUTATION MAL VISÉE (%d occurrences) : %s :: %s' % (t.count(a), nom, a[:60])); bad += 1; t = None; break
        t = t.replace(a, b)
    if t is None: continue
    open(path, 'w', encoding='utf-8').write(t)
    try:
        r = subprocess.run(['node', S + sonde], cwd=R, capture_output=True, text=True, timeout=290, env=dict(os.environ, PROFIL='mac', PROFILS='mac'))
        out = r.stdout.splitlines(); bil = [l for l in out if l.strip().startswith('==')][-1:] ; ko = [l for l in out if l.strip().startswith('✗')]
        mord = r.returncode != 0
    except subprocess.TimeoutExpired: mord, bil, ko = False, ['délai dépassé'], []
    subprocess.run(['git', 'checkout', '--', f], cwd=R)
    print(('MORD   ' if mord else 'ne mord PAS ') + nom + ' → ' + (bil[0] if bil else '') + ' · ' + (ko[0].strip()[:110] if ko else '')); sys.stdout.flush()
    if not mord: bad += 1
d = subprocess.run(['git', 'diff', '--stat', 'apercu/'], cwd=R, capture_output=True, text=True).stdout.strip()
print('git diff --stat apercu/ :', d or 'vide'); sys.exit(1 if bad or d else 0)
