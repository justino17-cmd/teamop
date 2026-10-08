# Les mutations des heures de travail côté Pro (le service et le module), jouées contre test-968 : poser, lancer, restaurer (git checkout). ⛔ COMMITER AVANT de lancer.
import subprocess, sys
W = __import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__)))      # la racine du dépôt
M = [
  ('H01', 'le Pro hors des heures n\'est plus retenu', 'server-msg/push.js', "    if (charge.retenable === true && horsHeuresPro(moi, charge)) {", "    if (false && charge.retenable === true && horsHeuresPro(moi, charge)) {"),
  ('H02', 'le Perso est retenu aussi (le côté n\'est plus lu)', 'server-msg/push.js', "    return pro && heuresPro.horsHeures(r, moi.tz, horloge());", "    return heuresPro.horsHeures(r, moi.tz, horloge());"),
  ('H03', 'le résumé part sans attendre la reprise', 'server-msg/push.js', "      if (moi && moi.prefs && moi.prefs.heures_pro && heuresPro.horsHeures(moi.prefs.heures_pro, moi.tz, horloge())) continue;", "      if (false) continue;"),
  ('H04', 'le résumé compte aussi ce qui a été lu', 'server-msg/push.js', "      try { convs = convs.filter(c => stockage.pushConvNonLue(uid, c)); }", "      try { convs = convs.filter(c => true || stockage.pushConvNonLue(uid, c)); }"),
  ('H05', 'la route écrit un réglage invalide', 'server-msg/routes.js', "        else return refus(res, 400, 'champ_invalide');\n      }\n", "        else p.heures_pro = b.prefs.heures_pro;\n      }\n"),
  ('H06', 'une nuit appartient au jour où elle FINIT', 'server-msg/heures-pro.js', "  return (r.jours.includes(jour) && minute >= r.debut) || (r.jours.includes(veille) && minute < r.fin);", "  return (r.jours.includes(jour) && minute >= r.debut) || (r.jours.includes(jour) && minute < r.fin);"),
  ('H07', 'la fin de la plage est INCLUSE', 'server-msg/heures-pro.js', "  if (r.debut < r.fin) return r.jours.includes(jour) && minute >= r.debut && minute < r.fin;", "  if (r.debut < r.fin) return r.jours.includes(jour) && minute >= r.debut && minute <= r.fin;"),
  ('H08', 'un fuseau inconnu se lit comme Paris (il coupe)', 'server-msg/heures-pro.js', "  try { parts = formateur(tz || FUSEAU_DEFAUT).formatToParts(new Date(t)); } catch (e) { return null; }", "  try { parts = formateur(tz || FUSEAU_DEFAUT).formatToParts(new Date(t)); } catch (e) { parts = formateur(FUSEAU_DEFAUT).formatToParts(new Date(t)); }"),
  ('H09', 'le module ne lit plus le fuseau de la personne', 'server-msg/heures-pro.js', "  try { parts = formateur(tz || FUSEAU_DEFAUT).formatToParts(new Date(t)); }", "  try { parts = formateur(FUSEAU_DEFAUT).formatToParts(new Date(t)); }"),
  ('H10', 'une mention ne se compte plus', 'server-msg/push.js', "    r.set(charge.tag, (r.get(charge.tag) || 0) + (charge.type === 'mention' ? 1 : 0));", "    r.set(charge.tag, (r.get(charge.tag) || 0));"),
]
mord = 0
for (code, nom, f, avant, apres) in M:
    p = W + '/' + f
    s = open(p, encoding='utf-8').read()
    if s.count(avant) != 1:
        print(code, 'CIBLE INTROUVABLE (' + str(s.count(avant)) + ')'); continue
    open(p, 'w', encoding='utf-8').write(s.replace(avant, apres))
    try:
        r = subprocess.run(['node', 'tests/test-968.js'], cwd=W, capture_output=True, text=True, timeout=180)
        sortie = r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        sortie = 'DÉLAI'
    subprocess.run(['git', 'checkout', f], cwd=W, capture_output=True)
    ko = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')]
    if ko or 'DÉLAI' in sortie: mord += 1
    print(code, ('MORD : ' + str(len(ko)) + ' ✗ — ' + (ko[0][:150] if ko else 'délai')) if (ko or 'DÉLAI' in sortie) else 'NE MORD PAS', '—', nom)
d = subprocess.run(['git', 'diff', '--stat'], cwd=W, capture_output=True, text=True).stdout.strip()
print('—— bilan :', mord, 'sur', len(M), '— arbre propre' if not d else '— ⚠️ ARBRE SALE : ' + d)
