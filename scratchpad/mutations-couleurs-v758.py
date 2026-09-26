#!/usr/bin/env python3
"""Éprouve test-825 et scratchpad/sonde-pile-client.js sur les deux correctifs de la relecture v758 (couleurs figées au
départ d'un technicien, pile des collègues sur la ligne du client). Chaque mutation remet UN défaut dans une COPIE
d'app.html (jamais dans le fichier du dépôt : pas de `git checkout`, donc aucun correctif non commité ne peut partir
avec) ; la sonde, elle, joue la bêta GÉNÉRÉE depuis cette copie (beta-build.js lancé dans un dossier à part).
Usage : python3 scratchpad/mutations-couleurs-v758.py [nom…]"""
import os, subprocess, sys, re, tempfile, shutil
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(RACINE, 'app.html'), encoding='utf-8').read()
MUTATIONS = [
  ('M1 un départ ne fige personne', "  techCouleursFiger(avantT,db.techniciens);   // v758 : son départ ne change la couleur de personne", "", False),
  ('M2 les prévenus figés quand même', "if(t&&t.id&&!t.couleur&&!ok.has(t.id)&&av[t.id]", "if(t&&t.id&&!t.couleur&&av[t.id]", False),
  ('M3 une seule passe', "for(let tour=0; tour<=16; tour++){", "for(let tour=0; tour<=0; tour++){", False),
  ('M4 figé à la NOUVELLE couleur', "t.couleur=av[t.id]; chg++;", "t.couleur=ap[t.id]; chg++;", False),
  ('M5 annonce sans simulation', "const sans=id?techCouleursSimuler(T,T.map(t=>t.id===id?{...t,couleur:''}:t),[id]):techCouleursDe(T);", "const sans=techCouleursDe(T.map(t=>t.id===id?{...t,couleur:''}:t));", False),
  ('M6 modifier une fiche ne fige personne', "    techCouleursFiger(avantT,db.techniciens,[id].concat(prev));   // v758 : seuls elle, et ceux que le choix a prévenus", "", False),
  ('M7 créer une fiche ne fige personne', "  techCouleursFiger(avantT,db.techniciens,[tid].concat(prev));\n", "\n", False),
  ('M8 pas de prévenu', "  const m=techCouleursDe(T||[]); return (T||[]).filter(t=>t&&t.id!==sauf&&!t.couleur&&String(m[t.id]||'').toUpperCase()===C).map(t=>t.id); }", "  return []; }", False),
  ('M9 Jour : la pile reste devant l’heure', "const pileA=planPileAutres(i,gr.id), pileBas=!!pileA&&planInfosPlace(i,hpx)>=1;", "const pileA=planPileAutres(i,gr.id), pileBas=false;", True),
  ('M10 Multi : la pile reste devant l’heure', "const pileA=planPileAutres(i,t.id), pileBas=!!pileA&&planInfosPlace(i,haut)>=1;", "const pileA=planPileAutres(i,t.id), pileBas=false;", True),
  ('M11 le nom du client ne se coupe plus', ".ci.ci-av .ci-t{ flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; }", ".ci.ci-av .ci-t{ flex:1 1 auto; }", True),
  ('M12 la pile collée au nom', ".ci.ci-av .tpil{ margin:0 0 0 auto; padding-left:4px; vertical-align:0; }", ".ci.ci-av .tpil{ padding-left:4px; }", True),
]
def compte(sortie):
  m = re.findall(r'(\d+) ✓ +(\d+) ✗', sortie); return (int(m[-1][0]), int(m[-1][1])) if m else (0, -1)
choisies = [m for m in MUTATIONS if not sys.argv[1:] or any(a in m[0] for a in sys.argv[1:])]
bilan = []
tmp = tempfile.mkdtemp(prefix='mut-v758-')
for nom, avant, apres, sonde in choisies:
  n = SRC.count(avant)
  if n != 1: print(f'{nom} : ⛔ motif trouvé {n} fois — NON appliquée', flush=True); bilan.append((nom, None)); continue
  copie = os.path.join(tmp, 'app.html'); open(copie, 'w', encoding='utf-8').write(SRC.replace(avant, apres, 1))
  r = subprocess.run(['node', 'tests/test-825.js'], cwd=RACINE, env=dict(os.environ, APP_FICHIER=copie), capture_output=True, text=True, timeout=120)
  bo, bk = compte(r.stdout + r.stderr); tb = [l.strip()[2:100] for l in (r.stdout).splitlines() if l.strip().startswith('✗')]
  so, sk, ts = '-', 0, []
  if sonde:
    subprocess.run(['node', os.path.join(RACINE, 'beta-build.js'), os.path.join(tmp, 'beta.html')], cwd=tmp, capture_output=True, text=True, timeout=60)
    s = subprocess.run(['node', 'scratchpad/sonde-pile-client.js'], cwd=RACINE, env=dict(os.environ, SOURCE=os.path.join(tmp, 'beta.html')), capture_output=True, text=True, timeout=300)
    so, sk = compte(s.stdout + s.stderr); ts = [l.strip()[2:100] for l in s.stdout.splitlines() if l.strip().startswith('✗')]
  print(f'{nom} : banc {bo} ✓ {bk} ✗ · sonde {so} ✓ {sk} ✗', flush=True)
  for t in (tb[:2] + ts[:2]): print('      ✗ ' + t, flush=True)
  bilan.append((nom, (bk > 0) or (sk > 0)))
shutil.rmtree(tmp, ignore_errors=True)
mord = sum(1 for _, b in bilan if b)
print(f'\n{mord} / {len(bilan)} mutations mordent (banc OU sonde)')
