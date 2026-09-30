import subprocess, re, sys
W = sys.argv[1]
M = [
 ('M1 état : la réponse normale ne rend plus le métier', 'server/index.js', "paye: p.paye, motif: p.motif, opMessages, metier, versionMin", "paye: p.paye, motif: p.motif, opMessages, versionMin"),
 ('M2 état : la réponse « sans formule » ne rend plus le métier', 'server/index.js', "return res.json({ ok: true, opMessages, metier, versionMin", "return res.json({ ok: true, opMessages, versionMin"),
 ('M3 route : un métier hors liste passe', 'server/index.js', "if (m && !METIERS_OK.includes(m)) return res.status(400)", "if (false && m && !METIERS_OK.includes(m)) return res.status(400)"),
 ('M4 état : une valeur écrite à la main est servie telle quelle', 'server/index.js', "const metierOk = m => (METIERS_OK.includes(m) ? m : '');", "const metierOk = m => (typeof m === 'string' ? m : '');"),
 ('M5 relais du portail : le métier demandé n\'est plus gardé', 'server/index.js', ",\n    metier: metierOk(d && d.metier) }));", " }));"),
 ('M6 « Lien de connexion » : le métier n\'est plus reporté', 'server/index.js', "metier: prev.metier, metierPar: prev.metierPar, metierTs: prev.metierTs };", "};"),
 ('M7 route sans garde', 'server/index.js', "app.post('/api/monitor/espaces/metier', monPatronStrict, (req, res) => {", "app.post('/api/monitor/espaces/metier', (req, res) => { req.tourUser = req.tourUser || { nom: 'x' };"),
 ('M8 application : forfaitServeurSync n\'appelle plus metierServeurAppliquer', 'app.html', "try{ metierServeurAppliquer(j); }catch(e){}", ""),
 ('M9 application : propriété héritée acceptée', 'app.html', "!Object.prototype.hasOwnProperty.call(METIERS,m)", "!METIERS[m]"),
 ('M10 application : vide remet en 3D', 'app.html', "function metierServeurAppliquer(j){\n  const m=j&&j.metier;", "function metierServeurAppliquer(j){\n  const m=(j&&j.metier)||'3d';"),
 ('M11 application : réécrit à chaque ouverture', 'app.html', "||db.metier===m) return false;", ") return false;"),
 ('M12 application : lu APRÈS le test sur la formule', 'app.html', "    try{ metierServeurAppliquer(j); }catch(e){}\n", "    if(!(j&&j.formule)) return;\n    try{ metierServeurAppliquer(j); }catch(e){}\n"),
 ('M13 Tour : l\'acceptation ne pose plus le métier', 'tour.html', "var metierDem=MET_L[dm.metier]?dm.metier:''", "var metierDem=''"),
 ('M14 Tour : la fiche ne filtre plus une valeur hors liste', 'tour.html', "  if(m&&!MET_L[m]){ toast('Métier inconnu'); return; }\n", ""),
 ('M15 portail : le métier n\'est plus obligatoire', 'espace.html', "    if(!metier) manque.push('métier');\n", ""),
 ('M16 portail : cliResume ne relaie plus le métier', 'espace.html', ",\n      metier:String((x&&x.metier)||'').slice(0,20) }));", " }));"),
]
res = []
for nom, f, a, b in M:
    p = W + '/' + f
    s = open(p, encoding='utf-8').read()
    n = s.count(a)
    if n != 1:
        res.append((nom, 'MOTIF ' + str(n) + ' occurrences')); continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    try:
        r = subprocess.run(['node', 'tests/test-848.js'], cwd=W, capture_output=True, text=True, timeout=180)
        sortie = r.stdout + r.stderr
        tot = re.findall(r'(\d+) ✓\s+(\d+) ✗', sortie)
        res.append((nom, 'code %d · %s' % (r.returncode, (tot[-1][0] + ' ✓ ' + tot[-1][1] + ' ✗') if tot else 'pas de total')))
    except subprocess.TimeoutExpired:
        res.append((nom, 'DÉLAI'))
    subprocess.run(['git', 'checkout', '--', f], cwd=W)
for nom, r in res:
    mord = ('code 1' in r) or ('DÉLAI' in r)
    print(('MORD   ' if mord else 'RATE   ') + nom + ' → ' + r)
d = subprocess.run(['git', 'diff', '--stat'], cwd=W, capture_output=True, text=True).stdout
print('diff restant :', repr(d))
