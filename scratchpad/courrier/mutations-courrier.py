#!/usr/bin/env python3
"""Éprouve test-2700 et test-2701 par MUTATION : on remet le défaut que chaque garde existe pour attraper, on joue le banc, il DOIT tomber.
⛔ Le correctif est COMMITÉ avant (CLAUDE.md : `git checkout` restaure depuis HEAD) ; chaque mutation est restaurée par `git checkout -- <fichier>` et on vérifie
que `git status` est propre avant la suivante. Au premier plan, un délai par exécution. Usage : python3 scratchpad/courrier/mutations-courrier.py [numéros…]"""
import subprocess, sys, re, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(R)
def sh(*a, **k): return subprocess.run(a, capture_output=True, text=True, timeout=k.get('t', 180))
def propre():
    return sh('git', 'status', '--short', '--untracked-files=no').stdout.strip() == ''
# (nom, fichier, de, vers, bancs)
T2701, T2700 = 'tests/test-2701.js', 'tests/test-2700.js'
PAGE = 'courrier-beta.html'
M = [
 ('M01 data-theme remis sur <html>', PAGE, '<html lang="fr">', '<html lang="fr" data-theme="dark">', [T2701]),
 ('M02 noindex retiré', PAGE, '<meta name="robots" content="noindex, nofollow">', '', [T2701]),
 ('M03 la politique laisse sortir un 3ᵉ hôte', PAGE, 'connect-src https://dns.google https://cloudflare-dns.com;', 'connect-src https://dns.google https://cloudflare-dns.com https://evil.example;', [T2701]),
 ('M04 clé de stockage de la maquette', PAGE, 'var LS="opcourrierB_v2"', 'var LS="opcourrier.v2"', [T2701]),
 ('M05 un accès au stockage hors persist/restore (dans la tranche)', PAGE, '  function acctExists(id){', '  function oubli(){ return localStorage.getItem(LS); }\n  function acctExists(id){', [T2701]),
 ('M06 restore relit un thème dans le document', PAGE, '    if(snap.accounts&&snap.accounts.length) snap.accounts.forEach', '    if(snap.theme) document.documentElement.setAttribute("data-theme",snap.theme);\n    if(snap.accounts&&snap.accounts.length) snap.accounts.forEach', [T2701]),
 ('M07 la frappe lit le MX (detect(false) → detect(true))', PAGE, 'tmr=setTimeout(function(){ detect(false); },350);', 'tmr=setTimeout(function(){ detect(true); },350);', [T2701]),
 ('M08 fermer la feuille déclenche une lecture (garde isConnected retirée)', PAGE, 'if(!mIn.isConnected) return;', '', [T2701]),
 ('M09 plus d’attente du geste (bloc « idle » retiré)', PAGE, 'if(!geste){', 'if(false){', [T2701]),
 ('M10 l’arrivée simulée part hors démo', PAGE, '  if(DEMO) setTimeout(receiveMail,180000);', '  setTimeout(receiveMail,180000);', [T2701]),
 ('M11 receiveMail sans sa garde de démo', PAGE, 'function receiveMail(){\n    if(!DEMO) return;\n', 'function receiveMail(){\n', [T2701]),
 ('M12 signSim sans sa garde de démo', PAGE, 'if(act==="signSim"){ if(!DEMO) return; var x=', 'if(act==="signSim"){ var x=', [T2701]),
 ('M13 une pastille redit « Maquette »', PAGE, '<span class="demo-pill" title="Bêta — aucun vrai mail n\'est lu ni envoyé">Bêta<span class="dp-long"> — aucun vrai mail n\'est lu ni envoyé</span></span>', '<span class="demo-pill" title="Maquette : aucun vrai e-mail n\'est envoyé ou reçu">Maquette</span>', [T2701]),
 ('M14 coteDuHash accepte #pro2', PAGE, 'return h==="#pro"?"pro"', 'return h.indexOf("#pro")===0?"pro"', [T2701]),
 ('M15 le hash est lu AVANT restore()', PAGE, '  restore();\n  if(coteDuHash()) ouvrirCote(coteDuHash());', '  if(coteDuHash()) ouvrirCote(coteDuHash());\n  restore();', [T2701]),
 ('M16 un appel réseau en plus', PAGE, '  var mxCache={};', '  var mxCache={}; function espion(){ fetch("https://api.exemple.fr/x"); }', [T2701]),
 ('M17 un fichier externe chargé', PAGE, '<title>OP Courrier</title>', '<title>OP Courrier</title>\n<link rel="stylesheet" href="https://cdn.exemple.fr/x.css">', [T2701]),
 ('M18 un bouton de thème revient', PAGE, '<div class="app" id="app"', '<button id="btnTheme">☾</button><div class="app" id="app"', [T2701]),
 ('M19 la fabrique n’ajoute plus l’entrée', 'beta-build.js', 's = s.split(COURRIER_ANCRE).join(COURRIER_RANGEE);', '/* s = s.split(COURRIER_ANCRE).join(COURRIER_RANGEE); */', [T2701]),
 ('M20 app.html (publique) reçoit l’entrée', 'app.html', '<div id="suite-fly">', '<div id="suite-fly"><a id="suite-opcourrier" href="courrier-beta.html#pro">OP Courrier</a>', [T2701]),
 ('M21 beta.html : la barre SUITE ne reste plus (une occurrence)', 'beta.html', "pied.classList.toggle('sans-suite',!(soOn||BETA_ESSAI))", "pied.classList.toggle('sans-suite',!soOn)", [T2701]),
 ('M22 OP MESSAGES : le nom d’hôte devient trop large', 'apercu/opmessages/index.html', '/^msg-beta\\.teamop\\.fr$/i', '/^msg-beta\\./i', [T2701]),
 ('M23 OP MESSAGES : le clic navigue au lieu d’ouvrir un onglet', 'apercu/opmessages/index.html', "window.open(courrierUrl(), '_blank', 'noopener');", "window.open(courrierUrl(), '_blank');", [T2701]),
 ('M24 OP MESSAGES : le clic ne vérifie plus le canal', 'apercu/opmessages/index.html', " || !courrierBeta()) return; window.open", ") return; window.open", [T2701]),
 ('M25 OP MESSAGES : la carte s’écrit partout', 'apercu/opmessages/index.html', "(courrierBeta() ? '<div class=\"carte\"><button type=\"button\" class=\"reglage presse\" id=\"reg-courrier\">", "(true ? '<div class=\"carte\"><button type=\"button\" class=\"reglage presse\" id=\"reg-courrier\">", [T2701]),
 ('M26 le serveur d’OP GESTION connaît OP Courrier', 'server/index.js', "const fs = require('fs');", "const fs = require('fs'); /* OP Courrier */", [T2701]),
 ('M27 le service worker met la page en cache', 'sw.js', "  if (url.pathname.endsWith('/courrier-beta.html')) return;   // canal d'essai OP Courrier : toujours la dernière poussée\n", '', [T2701]),
 ('M28 la page entre au sitemap', 'sitemap.xml', '</urlset>', '<url><loc>https://teamop.fr/courrier-beta.html</loc></url></urlset>', [T2701]),
 ('M29 le tri : le seuil d’indésirable de la PAGE baisse', PAGE, '(!trusted && s.score >= 5)', '(!trusted && s.score >= 3)', [T2700]),
 ('M30 le tri : le moteur de RÉFÉRENCE change', 'tests/courrier-moteur-tri/classify.js', '(!trusted && s.score >= 5)', '(!trusted && s.score >= 2)', [T2700]),
 ('M31 le tri : un jeu à l’aveugle est amputé', 'tests/courrier-moteur-tri/blind3_cases.js', lambda t: t.replace('module.exports = [', 'module.exports = ([', 1).rstrip()[:-2] + ']).slice(1);', None, [T2700]),
]
sel = set(sys.argv[1:])
vus, tombes = 0, 0
for nom, f, de, vers, bancs in M:
    num = nom.split()[0][1:]
    if sel and num not in sel and nom.split()[0] not in sel: continue
    if not propre(): print('✗ ARBRE SALE AVANT', nom, sh('git', 'status', '--short').stdout); sys.exit(2)
    src = open(f, encoding='utf8').read()
    n = 1 if callable(de) else src.count(de)
    if n < 1:
        print('✗', nom, '— la mutation ne trouve PAS sa cible dans', f); vus += 1; continue
    nouveau = de(src) if callable(de) else src.replace(de, vers, 1)
    if nouveau == src: print('✗', nom, '— la mutation ne change RIEN'); vus += 1; continue
    open(f, 'w', encoding='utf8').write(nouveau)
    try:
        rouges = []
        for b in bancs:
            r = sh('node', b, t=240)
            m = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout)
            rouges.append((b, m[-1] if m else None, r.returncode))
        tombe = any(rc != 0 or (m and int(m[1]) > 0) for _, m, rc in rouges)
        diff = sh('git', 'diff', '--stat', '--', f).stdout.strip().splitlines()[-1:] 
        print(('✓ ' if tombe else '✗ SURVIT ') + nom + ' → ' + ' ; '.join('%s %s (code %s)' % (os.path.basename(b), '%s ✓ %s ✗' % m if m else 'aucun total', rc) for b, m, rc in rouges))
        vus += 1; tombes += tombe
    finally:
        sh('git', 'checkout', '--', f)
    if not propre(): print('✗ ARBRE SALE APRÈS', nom); sys.exit(2)
print('\n%d mutations, %d font tomber le banc' % (vus, tombes))
sys.exit(0 if vus == tombes else 1)
