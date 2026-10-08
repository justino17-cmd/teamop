# Les mutations de la PAGE des heures de travail, jouées contre la sonde (la page servie est régénérée à chaque fois, puis restaurée depuis le commit).
import subprocess
W = __import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))      # la racine du dépôt
F = 'apercu/opmessages/index.html'
M = [
  ('P1', 'la bannière d\'une conversation Pro n\'est jamais retenue', "    if (arriveeRetenue(ev)) return;\n", "    if (false && arriveeRetenue(ev)) return;\n"),
  ('P2', 'retenue même côté Pro (le côté n\'est plus lu)', "    if (!modesActifs() || etat.mode === 'pro' || typeof source.heuresPro !== 'function') return false;", "    if (!modesActifs() || typeof source.heuresPro !== 'function') return false;"),
  ('P3', 'le dernier jour se retire', "      if (!jours.length) { reg.notifErreur", "      if (false) { reg.notifErreur"),
]
env = dict(__import__('os').environ, NODE_PATH='/opt/node22/lib/node_modules/playwright/node_modules:/opt/node22/lib/node_modules')
mord = 0
for (code, nom, avant, apres) in M + M:
    p = W + '/' + F
    s = open(p, encoding='utf-8').read()
    if s.count(avant) != 1: print(code, 'CIBLE INTROUVABLE', s.count(avant)); continue
    open(p, 'w', encoding='utf-8').write(s.replace(avant, apres))
    subprocess.run(['node', 'scripts/opmsg-public.js'], cwd=W, capture_output=True)
    try:
        r = subprocess.run(['node', 'tests/sonde-opmessages-heures-pro.js'], cwd=W, capture_output=True, text=True, timeout=400, env=env); sortie = r.stdout + r.stderr
    except subprocess.TimeoutExpired: sortie = 'DÉLAI'
    subprocess.run(['git', 'checkout', F, 'server-msg/public/index.html', 'server-msg/public/opmsg-ui.js'], cwd=W, capture_output=True)
    ko = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')]
    if ko: mord += 1
    print(code, ('MORD : ' + str(len(ko)) + ' ✗ — ' + ko[0][:150]) if ko else 'NE MORD PAS', '—', nom)
d = subprocess.run(['git', 'diff', '--stat'], cwd=W, capture_output=True, text=True).stdout.strip()
print('—— bilan :', mord, 'sur', 2 * len(M), '— arbre propre' if not d else '— ⚠️ ARBRE SALE : ' + d)
