"""Mutations de la v2.92 : on remet chaque défaut, le banc qui le garde DOIT tomber, puis `git checkout`. ⛔ Lancer APRÈS le commit (sinon le checkout efface le correctif).
   python3 scratchpad/courrier/mutations-v292.py   — chaque ligne : (fichier, ancien, neuf, banc)."""
import subprocess, sys
M = [
 ('opcourrier.js', 'state.selected=null; clearSearch(); state.folder="inbox"; state.filter="all";\n      if(isPhone())', 'state.selected=null; clearSearch();\n      if(isPhone())', 'tests/test-2702.js', 'clic boîte : ne revient plus à la Réception'),
 ('opcourrier.js', 'function nomPartage(a){ var n=', 'function nomPartage(a){ return false; var n=', 'tests/test-2702.js', 'noms identiques non distingués'),
 ('opcourrier.js', 'return typeof u==="string"&&u.length<=LOGO_MAX&&/^data:image\\/(png|jpeg);', 'return typeof u==="string"&&u.length<=LOGO_MAX&&/^data:image\\/(png|jpeg|svg\\+xml);', 'tests/test-2702.js', 'logo SVG accepté'),
 ('opcourrier.js', 'if(m.autoSrc===false&&r.cat==="notif"', 'if(false&&m.autoSrc===false&&r.cat==="notif"', 'tests/test-2702.js', 'tri par la source retiré'),
 ('opcourrier.js', 'if(!CAP.signature){\n        // Pas de prestataire', 'if(false){\n        // Pas de prestataire', 'tests/test-2702.js', 'signature : envoi sans prestataire'),
 ('opcourrier.js', '>Code SMS</option>', '>Avancée — code par SMS</option>', 'tests/test-2702.js', 'libellé du niveau'),
 ('opcourrier.js', 'LOAD.boites=e&&e.calme===true?"calme":"ko"', 'LOAD.boites="ko"', 'tests/test-2702.js', 'état calme retiré'),
 ('opcourrier.js', '&&nomSuivi(s.assigne)===nomSuivi(CAP.moi)', '&&true', 'tests/test-2702.js', 'suivi : « Assignés à moi » = tout le monde'),
 ('opcourrier.js', '(!m.read||(CAP.suivi&&!!m.suivi&&m.suivi.statut==="aTraiter"))', '(!m.read)', 'tests/test-2702.js', 'suivi : la pastille ne compte plus les « À traiter »'),
 ('opcourrier.js', 'if(suiviDossiers().length) h+=sect("hSuivi","Suivi",suiviDossiers());', '', 'tests/test-2702.js', 'suivi : section retirée'),
 ('tour.html', 'suivi:true,moi:MYNOM}', 'suivi:true}', 'tests/test-2704.js', 'suivi : la Tour ne dit plus qui est moi'),
 ('tour.html', "return cheminArrivee(r.boite,vers).then(function(){\n        return appel('/api/monitor/mail/deplacer'", "return Promise.resolve().then(function(){\n        return appel('/api/monitor/mail/deplacer'", 'tests/test-2704.js', 'archiver : dossier d’arrivée non vérifié'),
 ('tour.html', "automatique:typeof m.auto==='boolean'?m.auto:undefined}", "automatique:undefined}", 'tests/test-2704.js', 'automatique non passé'),
 ('tour.html', "return chemin(boite,dossier,false).then(function(ch){ return ch!==null?ch:chemin(boite,dossier,true); })", "return chemin(boite,dossier,false)", 'tests/test-2704.js', 'dossiers non relus à neuf'),
 ('app.html', "if(BETA_ESSAI){ const e=new Error('Espace de test", "if(false){ const e=new Error('Espace de test", 'tests/test-2703.js', 'bêta : état calme retiré'),
]
bad = 0
for f, a, b, banc, nom in M:
    s = open(f, encoding='utf8').read()
    if s.count(a) != 1:
        print('CIBLE ABSENTE/MULTIPLE', nom, s.count(a)); bad += 1; continue
    open(f, 'w', encoding='utf8').write(s.replace(a, b))
    try:
        r = subprocess.run(['node', banc], capture_output=True, text=True, timeout=300)
        tombe = r.returncode != 0
        diff = subprocess.run(['git', 'diff', '--stat', f], capture_output=True, text=True).stdout.strip().splitlines()[-1:]
        print(('TOMBE  ' if tombe else 'VERT !! ') + nom + ' — ' + banc + ' — ' + ' '.join(diff))
        if not tombe: bad += 1
    finally:
        subprocess.run(['git', 'checkout', f])
print('git status:', subprocess.run(['git', 'status', '--short'], capture_output=True, text=True).stdout.replace('\n', ' | '))
sys.exit(1 if bad else 0)
