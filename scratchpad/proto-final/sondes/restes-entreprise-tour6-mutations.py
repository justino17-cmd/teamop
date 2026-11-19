#!/usr/bin/env python3
# Contre-épreuve du tour 6 des restes « entreprise » (recontrôle adverse) : on REMET un défaut dans une COPIE (jamais dans les fichiers du dépôt) et la sonde visée doit tomber (code de sortie ≠ 0).
# Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit : on le DIT. Avant chaque tour on vérifie que la mutation a changé le fichier (un `replace`
# qui ne trouve rien n'éprouve rien).
# Usage : python3 mail-mutations.py [de] [a]     (indices 1..N, pour couper le lot en tours de moins de 5 minutes)
import os, shutil, subprocess, sys, tempfile
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
COURRIER, PAGE = 'apercu/prototype-courrier.js', 'apercu/prototype-op-gestion.html'
# (nom, fichier, ancien, nouveau, sonde qui doit tomber)
M = [
 ('T1 : l\'option du créneau choisi n\'est plus retirée à la création', PAGE, "if (o.option && o.optMail === oc.mail && o.tech === oc.t && o.d === oc.d && o.h === oc.h) BUREAU.splice(q, 1);", "if (false) BUREAU.splice(q, 1);", 'restes-entreprise-tour6-creneau.js'),
 ('T2 : l\'option du créneau ne se retire qu\'avec la case Planning', PAGE, "if (CREA.optCren) { const oc", "if (CREA.optCren && mbxPeutTenir()) { const oc", 'restes-entreprise-tour6-creneau.js'),
 ('T3 : toute option de la proposition est retirée à la création (pas seulement celle du créneau)', PAGE, "o.optMail === oc.mail && o.tech === oc.t && o.d === oc.d && o.h === oc.h) BUREAU.splice(q, 1);", "o.optMail === oc.mail) BUREAU.splice(q, 1);", 'restes-entreprise-tour6-creneau.js'),
 ('T4 : la confirmation libère aussi l\'option du créneau choisi (garde de mbxLiberer ignorée)', PAGE, "!(garde && garde(BUREAU[k]))", "true", 'restes-entreprise-tour6-creneau.js'),
 ('T5 : sans la case Planning, mbxLiberer retire quand même les autres options', PAGE, "let n = 0; if (!mbxPeutTenir()) return n; for (let k = BUREAU.length - 1; k >= 0; k--) if (BUREAU[k].option && BUREAU[k].optMail === id && !(garde", "let n = 0; for (let k = BUREAU.length - 1; k >= 0; k--) if (BUREAU[k].option && BUREAU[k].optMail === id && !(garde", 'restes-entreprise-tour6-creneau.js'),
 ('T6 : le toast compte l\'option du créneau parmi celles d\'un collègue (une personne seule lit « options tenues »)', PAGE, "optMail === m.cren.orig && !mmeCren(o)).length;", "optMail === m.cren.orig).length;", 'restes-entreprise-tour6-creneau.js'),
 ('T7 : l\'identité du créneau n\'est pas posée sur la création', PAGE, "CREA.optCren = { mail:m.cren.orig, t:c.t, d:c.d, h:c.h };", "", 'restes-entreprise-tour6-creneau.js'),
 ('T8 : l\'option est retirée AVANT la photo d\'Annuler (Annuler ne la rend plus)', PAGE, "const mm = CREA.mail && mlDe(CREA.mail); pile.push(", "if (CREA.optCren) { const oc = CREA.optCren; for (let q = BUREAU.length - 1; q >= 0; q--) { const o = BUREAU[q]; if (o.option && o.optMail === oc.mail && o.tech === oc.t && o.d === oc.d && o.h === oc.h) BUREAU.splice(q, 1); } } const mm = CREA.mail && mlDe(CREA.mail); pile.push(", 'restes-entreprise-tour6-creneau.js'),

 ('D1 : sondes réparées — la garde « droit que tu n\'as pas » du profil retirée', PAGE, "if (moi && !droitAdmin(moi) && DR_CATS.some(([c]) => ['c', 'm', 's'].some(x => PROFILS[pk].cats[c][x] && !peut(c, x, moi)))) {", "if (false) {", 'droits-restauration.js'),
 ('D2 : la case Supprimer de Clients perd son geste (archiver un client)', PAGE, "m:'changer un client, ses coordonnées, ses notes', s:'archiver un client' }", "m:'changer un client, ses coordonnées, ses notes' }", 'droits-fiche.js'),
 ('D3 : un MutationObserver des droits s\'abonne', PAGE, "new MutationObserver(() => docBarres())", "new MutationObserver(() => { docBarres(); if (typeof droitsMaj === 'function') droitsMaj(); })", 'droits-fabrication-css.js'),
 ('D4 : créer un client n\'est plus gardé (clientNouveau retiré de la case Créer de Clients)', PAGE, " clientNouveau@crm", "", 'droits-gestes-reels.js'),
]
de = int(sys.argv[1]) if len(sys.argv) > 1 else 1
a = int(sys.argv[2]) if len(sys.argv) > 2 else len(M)
tmp = tempfile.mkdtemp(prefix='mutations-mail-')
racine = os.path.join(tmp, 'depot'); os.makedirs(racine)
shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
mordent, muets = [], []
for i, (nom, fic, ancien, nouveau, sonde) in enumerate(M, 1):
    if i < de or i > a: continue
    cible = os.path.join(racine, fic); orig = open(os.path.join(DEPOT, fic), encoding='utf-8').read()
    n = orig.count(ancien)
    if n != 1:
        print('M%d %s : ⚠ motif trouvé %d fois (attendu 1) — mutation NON jouée' % (i, nom, n)); muets.append((i, nom, 'motif')); continue
    open(cible, 'w', encoding='utf-8').write(orig.replace(ancien, nouveau))
    if open(cible, encoding='utf-8').read() == orig: print('M%d : la mutation n\'a rien changé' % i); continue
    env = dict(os.environ, RACINE=racine, CAP=os.path.join(tmp, 'cap'))
    try:
        fichier, _, partie = sonde.partition(':')
        if partie: env['PARTIE'] = partie
        r = subprocess.run(['node', os.path.join(SONDES, fichier)] + ([partie] if partie else []), cwd=DEPOT, env=env, capture_output=True, text=True, timeout=560)
        sortie, code = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired as e:
        sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 124
    ko = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')][:2]
    bilan = [l for l in sortie.split('\n') if l.startswith('==')]
    if code != 0: mordent.append(i); print('M%d MORD  %s  → %s  [%s]  %s' % (i, nom, sonde, bilan[-1] if bilan else 'code %d' % code, (ko[0][:110] if ko else '')))
    else: muets.append((i, nom, sonde)); print('M%d MUETTE %s  → %s ne tombe PAS  [%s]' % (i, nom, sonde, bilan[-1] if bilan else ''))
    shutil.copyfile(os.path.join(DEPOT, fic), cible)   # on remet l'original dans la copie avant le tour suivant
print('\nmutations jouées : %d · qui mordent : %d · muettes : %d' % (len(mordent) + len(muets), len(mordent), len(muets)))
print('git status du dépôt (doit rester sans changement dans apercu/) :', subprocess.run(['git', 'status', '--short', 'apercu'], cwd=DEPOT, capture_output=True, text=True).stdout.strip() or 'propre')
shutil.rmtree(tmp, ignore_errors=True)
sys.exit(0 if not muets else 2)
