#!/usr/bin/env python3
"""Éprouve le banc (tests/test-828.js) et la sonde au doigt (scratchpad/sonde-tour-barre.js) de la barre
de la Tour v2.67 : chaque mutation remet UN défaut dans une COPIE de tour.html (jamais dans le fichier du
dépôt : aucun `git checkout` n'est nécessaire, donc aucun correctif non commité ne peut partir avec — règle
du dépôt), puis on regarde qui tombe. Une mutation que rien ne voit se DIT, avec la raison probable.
Usage : python3 scratchpad/mutations-tour-barre.py [nom…]"""
import os, subprocess, sys, re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COPIE = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'mut-tour-barre.html')
SRC = open(os.path.join(RACINE, 'tour.html'), encoding='utf-8').read()

MUTATIONS = [
  ('M1 appui tenu sur la bulle = menu', "if(bar.classList.contains('tire')||feuilleVisible()) return;\n      long=true;",
                                       "if(feuilleVisible()) return;\n      long=true;"),
  ('M2 clic du relâcher non avalé', "    if(leveA&&Date.now()-leveA>500) return;\n    e.preventDefault(); e.stopPropagation(); },true);",
                                   "    if(leveA&&Date.now()-leveA>500) return;\n    },true);"),
  ('M3 place dans transform', "translate:calc(var(--bb-i) * (100% + var(--bb-gout)) + var(--bb-dx)) 0;scale:1;",
                             "transform:translateX(calc(var(--bb-i) * (100% + var(--bb-gout)) + var(--bb-dx)));scale:1;"),
  ('M4 bulle reprise en plein geste', "  if(bar.classList.contains('tire')) return;\n  var cur=$('bb-cur'); if(!cur) return;\n  var tabs=",
                                     "  var cur=$('bb-cur'); if(!cur) return;\n  var tabs="),
  ('M5 vue invisible admise', "if(l.length<BAS_MAX&&dispo.indexOf(t)>=0&&l.indexOf(t)<0) l.push(t);",
                             "if(l.length<BAS_MAX&&t&&l.indexOf(t)<0) l.push(t);"),
  ('M6 repli ignoré (rangement plein)', "if(Object.prototype.hasOwnProperty.call(_barreRepli,APP)) brut=_barreRepli[APP];",
                                       "if(false) brut=_barreRepli[APP];"),
  ('M7 deux marques (fond gardé)', ".barre-bas.cur-on .bb.on{background:transparent;box-shadow:none}", ""),
  ('M8 compteurs de « Plus » perdus', "if(BAS.indexOf(o.t)<0){ derriere+=n; return; }", "if(BAS.indexOf(o.t)<0){ return; }"),
  ('M9 toast qui mange les taps', "#toast{pointer-events:none}", ""),
  ('M10 clic après glissé non avalé', "bar.addEventListener('click',function(e){ if(Date.now()-finBulle>350) return; e.preventDefault(); e.stopPropagation(); },true);", ""),
  ('M11 plus de prise au contact', "var surBulle=iOn>=0&&visible&&x>=r.left-4&&x<=r.right+4;", "var surBulle=false;"),
  ('M12 plus de ressort au bord', "if(t<a) t=a-elastique(a-t,dim); else if(t>z) t=z+elastique(t-z,dim);", ""),
  ('M13 rattrapage instantané', "if(s.rattrape){ var k=Math.min(1,(now-s.tEng)/170)", "if(s.rattrape){ var k=1"),
  ('M14 la barre se réécrit à chaque fois', "if(el.getAttribute('data-sig')===sig&&el.querySelector('.bb')){ majBarreBas(); return; }", ""),
]

def lancer(cmd, env, delai):
  try:
    r = subprocess.run(cmd, cwd=RACINE, env=env, capture_output=True, text=True, timeout=delai)
    sortie = r.stdout + r.stderr
    m = re.findall(r'(\d+) ✓ +(\d+) ✗', sortie)
    return (int(m[-1][0]), int(m[-1][1])) if m else (0, -1), r.returncode, sortie
  except subprocess.TimeoutExpired:
    return (0, -1), 124, 'DÉLAI DÉPASSÉ'

choisies = [m for m in MUTATIONS if not sys.argv[1:] or any(a in m[0] for a in sys.argv[1:])]
bilan = []
for nom, avant, apres in choisies:
  n = SRC.count(avant)
  if n != 1:
    print(f'{nom} : ⛔ motif trouvé {n} fois — mutation NON appliquée'); bilan.append((nom, 'motif', '', '')); continue
  open(COPIE, 'w', encoding='utf-8').write(SRC.replace(avant, apres, 1))
  env = dict(os.environ, TOUR_FICHIER=COPIE, MODES='dark')
  (bo, bk), bc, _ = lancer(['node', 'tests/test-828.js'], env, 60)
  (so, sk), sc, ss = lancer(['node', 'scratchpad/sonde-tour-barre.js'], env, 400)
  tombes = [l.strip()[2:90] for l in ss.splitlines() if l.strip().startswith('✗')]
  print(f'{nom} : banc {bo} ✓ {bk} ✗ (sortie {bc}) · sonde {so} ✓ {sk} ✗ (sortie {sc})', flush=True)
  for t in tombes[:4]: print('      sonde ✗ ' + t, flush=True)
  bilan.append((nom, bk, sk, bc))
os.remove(COPIE) if os.path.exists(COPIE) else None
mordues = sum(1 for b in bilan if b[1] not in ('motif',) and ((isinstance(b[1], int) and b[1] > 0) or (isinstance(b[2], int) and b[2] > 0)))
print(f'\n{mordues} / {len(bilan)} mutations mordent (banc OU sonde)')
