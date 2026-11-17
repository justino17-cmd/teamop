#!/usr/bin/env python3
# Contre-épreuve des restes « Tâches · Absences · Menu », tour 1 : on REMET chaque défaut sur une COPIE de apercu/ (jamais sur le dépôt)
# et la sonde doit tomber. usage : python3 restes-taches-absences-1-mutations.py [numéro…]   — RACINE=/tmp/rac-restes
import subprocess, shutil, os, sys, re
DEP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
RAC = '/tmp/rac-restes'
PAGE = 'apercu/prototype-op-gestion.html'
SONDES = os.path.dirname(os.path.abspath(__file__))
def sub(s, a, b):
    assert s.count(a) == 1, 'ancre introuvable ou multiple : ' + a[:70]
    return s.replace(a, b)
M = [
 ('B', 'sélecteur de période : règle ≤ 400 px retirée', 'restes-taches-absences-1.js', 'B',
  lambda s: sub(s, "@media (max-width:400px){.ac-ctrl .ac-per{padding:2px;gap:0}.ac-ctrl .ac-per button{padding:0 3px;font-size:13px;min-width:0}}", "")),
 ('A', '« Au » ne suit plus « Du »', 'restes-taches-absences-1.js', 'A',
  lambda s: sub(s, "au.value < ev.target.value) { au.value", "false && au.value < ev.target.value) { au.value")),
 ('C', 'le message ancien reste collé sur la fiche', 'restes-taches-absences-1.js', 'C',
  lambda s: sub(s, "Date.now() - (to._t0 || 0) > 400) to.classList.remove('on'); }", "Date.now() - (to._t0 || 0) > 4e9) to.classList.remove('on'); }")),
 ('D', 'le relâcher d\'un autre doigt renouvelle l\'avale', 'restes-taches-absences-1.js', 'D',
  lambda s: sub(s, "const relache = () => { fin(); if (tenu) { tenu = false; mbAvale = Date.now(); } };", "const relache = () => { fin(); if (mbAvale) mbAvale = Date.now(); };")),
 ('E', '« Voir comme Marc » ne change plus le rôle', 'restes-taches-absences-1.js', 'E',
  lambda s: sub(s, "if (typeof ROLE !== 'undefined' && ROLE === 'tech') return rlChanger('patron', { h:'absences', muet:true });", "")),
 ('F', '« rtt » en minuscules', 'restes-taches-absences-1.js', 'F',
  lambda s: sub(s, "`${n} j ${aTypeBas(t)}`", "`${n} j ${t.toLowerCase()}`")),
 ('G', 'avis de décision : colonne de texte écrasée', 'taches-absences-recontrole-avis.js', 'petit',
  lambda s: sub(s, ".a-avis{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;", ".a-avis{display:flex;align-items:center;gap:12px;") .replace("flex:1 1 180px;min-width:0;", "flex:1;min-width:0;")),
 ('H', 'absence de week-end posée par le gérant', 'taches-absences-recontrole-saisie.js', 'iphone',
  lambda s: sub(s, "    if (!aJours(a)) return toast('Ces jours ne sont pas travaillés : choisis d’autres dates');\n", "")
   .replace("if (btn) btn.disabled = !!(autre || attente || !aJours(a));", "").replace("if (!aJours(a)) { el.innerHTML = '<div class=\"a-alerte\"><b>Ces jours ne sont pas travaillés</b><small>Week-end ou jour férié : il n’y a rien à poser. Choisis d’autres dates.</small></div>'; return; }", "")),
 ('I', 'absence posée sur une demande en attente', 'taches-absences-recontrole-saisie.js', 'iphone',
  lambda s: sub(s, "    if (DEMANDES_ABS.some(x => x.tech === a.tech && x.du <= a.au && a.du <= x.au)) return toast(", "    if (false) return toast(")
   .replace("if (btn) btn.disabled = !!(autre || attente || !aJours(a));", "if (btn) btn.disabled = !!(autre || !aJours(a));").replace("(attente && !autre ?", "(false ?")),
 ('J', 'la demande de congé du technicien classée « planning »', 'taches-absences-recontrole-saisie.js', 'iphone',
  lambda s: sub(s, "  atdem:{ d:'l' }, atenvoi:{ d:'l' },", "  atdem:{ k:'planif', d:'c' }, atenvoi:{ k:'planif', d:'m' },")),
 ('K', 'le bouton « Menu » de la fenêtre Comptabilité retiré', 'restes-taches-absences-1-bureau-tel.js', '',
  lambda s: sub(s, "if (!seul && ret && !z.querySelector('.cpsys-menu')) ret.insertAdjacentHTML(", "if (false) ret.insertAdjacentHTML(")),
 ('L', 'la feuille « Menu » reste sous la Comptabilité', 'restes-taches-absences-1-bureau-tel.js', '',
  lambda s: sub(s, "if (z && !z.hidden && v) v.style.zIndex = '9100';", "")),
 ('M', 'boutons de la barre à 40 px', 'restes-taches-absences-1-bureau-tel.js', '',
  lambda s: sub(s, "  .cpsys-barre button{min-height:44px!important;padding:0 10px!important;", "  .cpsys-barre button{min-height:40px!important;padding:0 10px!important;")),
]
choix = sys.argv[1:]
ko = 0
for (n, nom, sonde, arg, f) in M:
    if choix and n not in choix: continue
    shutil.rmtree(RAC, ignore_errors=True); os.makedirs(RAC)
    subprocess.run(['cp', '-r', os.path.join(DEP, 'apercu'), RAC], check=True)
    p = os.path.join(RAC, PAGE); s = open(p, encoding='utf-8').read(); t = f(s)
    assert t != s, 'la mutation ne change rien : ' + nom
    open(p, 'w', encoding='utf-8').write(t)
    env = dict(os.environ, RACINE=RAC)
    if sonde.startswith('restes'): env['PARTIES'] = arg; cmd = ['node', os.path.join(SONDES, sonde)]
    else: cmd = ['node', os.path.join(SONDES, sonde), arg]
    r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=570)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout)
    tombe = r.returncode != 0 or (m and int(m[-1][1]) > 0)
    print(('✓ tombe  ' if tombe else '✗ NE TOMBE PAS  ') + n + ' — ' + nom + ' → ' + (m[-1][0] + ' ✓ · ' + m[-1][1] + ' ✗' if m else 'pas de bilan'), flush=True)
    if not tombe: ko += 1
shutil.rmtree(RAC, ignore_errors=True)
print('== mutations qui ne tombent pas :', ko); sys.exit(1 if ko else 0)
