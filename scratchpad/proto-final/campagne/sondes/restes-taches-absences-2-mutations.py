#!/usr/bin/env python3
# Contre-épreuve des restes « Tâches · Absences · Menu », tour 2 : on REMET chaque défaut sur une COPIE de apercu/ (jamais sur le dépôt)
# et la sonde doit tomber. usage : python3 restes-taches-absences-2-mutations.py [numéro…]   — RACINE=/tmp/rac-restes
import subprocess, shutil, os, sys, re
DEP = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
RAC = '/tmp/rac-restes2'
PAGE = 'apercu/prototype-op-gestion.html'
SONDES = os.path.dirname(os.path.abspath(__file__))
def sub(s, a, b):
    assert s.count(a) == 1, 'ancre introuvable ou multiple : ' + a[:70]
    return s.replace(a, b)
M = [
 ('N1', '« Modifier les dates » : plus de règle week-end (aperçu)', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "  if (btn) btn.disabled = !!(autre || attente || !aJours(p));\n  if (!aJours(p)) {", "  if (false) {")),
 ('N2', '« Modifier les dates » : aAppliquer sans règle week-end', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "if (!aJours({ tech:a.tech, du, au, demi:du === au ? demi || null : null })) {", "if (false) {")),
 ('N3', '« Modifier les dates » : aAppliquer ne regarde plus les demandes en attente', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "  if (attente) { aDepl = null; aRendreGarde(); toast(`${aPrenom(a.tech)} a déjà ${aAbsDeja(attente)} : accorde-la", "  if (false) { aDepl = null; aRendreGarde(); toast(`${aPrenom(a.tech)} a déjà ${aAbsDeja(attente)} : accorde-la")),
 ('N4', '« Proposer d\'autres dates » : week-end accepté (envoi)', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "    if (!aJours({ tech:d.tech, du:p.du, au:p.au, demi:p.demi })) return toast(", "    if (false) return toast(")),
 ('N5', '« Proposer d\'autres dates » : week-end non signalé (aperçu)', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "  if (!apres) { el.innerHTML", "  if (false) { el.innerHTML")),
 ('N6', '« Au » ne suit plus « Du » chez le gérant', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "  if (au && !au.dataset.touche && ev.target.value && au.value < ev.target.value) { au.value = ev.target.value; if (typeof dtPeindre === 'function') dtPeindre(au); } }, true);", "  }, true);")),
 ('N7', 'touchcancel laisse le doigt « tenu »', 'restes-taches-absences-1-recontrole.js', '',
  lambda s: sub(s, "document.addEventListener('touchcancel', () => { fin(); tenu = false; }, { passive:true });", "document.addEventListener('touchcancel', fin, { passive:true });")),
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
    if sonde.startswith('restes') and arg: env['PARTIES'] = arg; cmd = ['node', os.path.join(SONDES, sonde)]
    else: cmd = ['node', os.path.join(SONDES, sonde)] + ([arg] if arg else [])
    r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=570)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout)
    tombe = r.returncode != 0 or (m and int(m[-1][1]) > 0)
    print(('✓ tombe  ' if tombe else '✗ NE TOMBE PAS  ') + n + ' — ' + nom + ' → ' + (m[-1][0] + ' ✓ · ' + m[-1][1] + ' ✗' if m else 'pas de bilan'), flush=True)
    if not tombe: ko += 1
shutil.rmtree(RAC, ignore_errors=True)
print('== mutations qui ne tombent pas :', ko); sys.exit(1 if ko else 0)
