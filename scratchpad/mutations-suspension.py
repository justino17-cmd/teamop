#!/usr/bin/env python3
# Mutations du chantier « plus de Gratuit : non payé = suspendu » (#279, commit 7ea5837).
# Chaque mutation remet UN défaut dans un arbre à part (git worktree), et au moins un banc doit tomber.
# L'ordre du dépôt : correctif → banc → commit → mutation → restauration (git checkout dans l'arbre à part).
import os, subprocess, sys, shutil

# Usage : python3 scratchpad/mutations-suspension.py [dossier-du-worktree]   (par défaut : un dossier temporaire neuf)
import tempfile
DEPOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARBRE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.mkdtemp(prefix='mut-suspension-'), 'arbre')

def sh(cmd, cwd=None, timeout=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, timeout=timeout)

if os.path.exists(ARBRE):
    sh('git worktree remove --force ' + ARBRE, cwd=DEPOT)
    shutil.rmtree(ARBRE, ignore_errors=True)
r = sh('git worktree add --detach ' + ARBRE + ' HEAD', cwd=DEPOT)
if r.returncode:
    print(r.stderr); sys.exit(1)
os.symlink(DEPOT + '/server/node_modules', ARBRE + '/server/node_modules')

S, A, T, P = 'server/index.js', 'app.html', 'tour.html', 'espace.html'
MUT = [
  ('M1 route etat : un non-payé servi avec sa formule (ancienne forme)', S,
   "if (p.bloque || !p.paye || !RANG_FORMULE.includes(fServie)) return res.json(",
   "if (p.bloque || !RANG_FORMULE.includes(fServie)) return res.json(", ['761', '845', '848']),
  ('M2 route etat : une formule que l\'application ne connaît pas servie quand même', S,
   "if (p.bloque || !p.paye || !RANG_FORMULE.includes(fServie)) return res.json(",
   "if (p.bloque || !p.paye) return res.json(", ['761', '842', '845']),
  ('M3 espacePaye : une fiche Gratuit sans rien redevient « payée, gratuit »', S,
   "return { paye: false, motif: 'formule Gratuit (retirée le 30 septembre 2026) — ' + pourquoi + ' : suspendue jusqu\\'au règlement' };",
   "return { paye: true, motif: 'gratuit' };", ['727', '761', '842']),
  ('M4 aboManuelDe : la fiche Gratuit réglée « active » à la main redevient payée', S,
   "return !!(e && e.aboStatut) && !(e.formule === 'gratuit' && (e.aboStatut === 'actif' || e.aboStatut === 'essai'));",
   "return !!(e && e.aboStatut);", ['761', '727']),
  ('M5 « Revoir le lien » : l\'abonnement réglé à la main n\'est plus reporté', S,
   "    aboStatut: prev.aboStatut, aboFin: prev.aboFin, aboPar: prev.aboPar, aboTs: prev.aboTs, aboDepuis: prev.aboDepuis,\n    formuleDepuis: prev.formuleDepuis };",
   "    };", ['848']),
  ('M6 période offerte d\'un code retiré : retombe sur « gratuit »', S,
   "formuleServie: formulePromo(e, code) || (RANG_FORMULE.includes(e.formule) ? e.formule : 'premium') };",
   "formuleServie: formulePromo(e, code) || e.formule };", ['727']),
  ('M7 gratuitPayeIllisible : un abonnement illisible ne sert plus rien', S,
   "return !!(e && e.formule === 'gratuit' && s && (s.surs || []).some(aboDeGestion) && !(fp && fp.f && fp.f !== 'gratuit'));",
   "return false;", ['727', '844']),
  ('M8 gratuitPayeIllisible : l\'abonnement d\'une voisine d\'adresse sert la petite', S,
   "return !!(e && e.formule === 'gratuit' && s && (s.surs || []).some(aboDeGestion) && !(fp && fp.f && fp.f !== 'gratuit'));",
   "return !!(e && e.formule === 'gratuit' && s && !(fp && fp.f && fp.f !== 'gratuit'));", ['727', '842']),
  ('M9 rappel J-7 : ne rejoue plus la règle de la fiche Gratuit payée illisible', S,
   "const servie = gratuitPayeIllisible(e, s, fp) ? 'pro' : ((fp && fp.f) || e.formule);",
   "const servie = (fp && fp.f) || e.formule;", ['844']),
  ('M10 Mon espace : un non-payé ne se dit plus « Suspendu »', S,
   "if (p.bloque || !p.paye || !RANG_FORMULE.includes(f)) return { statut: 'suspendu' };",
   "if (p.bloque || !RANG_FORMULE.includes(f)) return { statut: 'suspendu' };", ['727']),
  ('M11 route Tour : la formule Gratuit de nouveau acceptée', S,
   "  if (f === 'gratuit') return res.status(400).json({ error: REFUS_GRATUIT });\n  if (!RANG_FORMULE.includes(f)) return res.status(400).json({ error: 'formule inconnue' });\n  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));",
   "  if (!['gratuit', 'pro', 'business', 'premium'].includes(f)) return res.status(400).json({ error: 'formule inconnue' });\n  const q = Math.max(1, Math.min(50, parseInt((req.body || {}).quantite, 10) || 1));", ['761', '842', '845', '727', '848']),
  ('M12 app : une réponse « formule + paye:false » n\'est plus lue comme une suspension', A,
   "const nonPaye=!!(j.formule&&(j.paye!==true||!PLANS[j.formule]));",
   "const nonPaye=false;", ['845', '848']),
  ('M13 app : une page d\'erreur du proxy décide de nouveau', A,
   "    if(!r.ok||!j||j.ok!==true) return;\n", "", ['845']),
  ('M14 app : une vérification impossible pose de nouveau un état', A,
   "if(!j.verificationImpossible){ try{ suspensionPoser(",
   "if(true){ try{ suspensionPoser(", ['761', '845']),
  ('M15 app : la bêta peut être suspendue', A,
   "function accesSuspendu(){ return !BETA_ESSAI && suspensionGrise(); }",
   "function accesSuspendu(){ return suspensionGrise(); }", ['761', '749']),
  ('M16 app : les Paramètres sont grisés aussi (plus moyen de régler)', A,
   "function suspensionBloque(k){ return k!=='parametres' && accesSuspendu(); }",
   "function suspensionBloque(k){ return accesSuspendu(); }", ['761']),
  ('M17 app : la suspension ne grise plus les catégories', A,
   "if(!horsSusp&&suspensionBloque(k)) return true; ", "", ['761', '751']),
  ('M18 app : un « gratuit » resté dans une base d\'avant n\'est plus lu Pro', A,
   "  return PLANS[f]?f:'pro'; }", "  return f; }", ['838', '761']),
  ('M19 app : go() ne mène plus à l\'écran « Accès suspendu »', A,
   "if(accesSuspendu()){ if(view!=='parametres') view='suspendu'; }", "if(false){ if(view!=='parametres') view='suspendu'; }", ['775', '751', '761']),
  ('M21 route etat : la suspension de la Tour rend des jours de sursis à qui ne paie pas', S,
   "motif: 'accès suspendu', opMessages, metier, versionMin, enLigne, suspendu: true, sursisJours: 0 });",
   "motif: 'accès suspendu', opMessages, metier, versionMin, enLigne, suspendu: true, sursisJours: (!p.bloque && suspendu && sursisJours > 0) ? sursisJours : 0 });", ['761']),
  ('M22 app : l\'accès revenu, une adresse #v=suspendu restée garde l\'écran « Accès suspendu »', A,
   "  else if(view==='suspendu') view='dashboard';\n", "", ['775', '761']),
  ('M20 portail : une formule « Gratuit » redevient affichée comme un abonnement', P,
   "return (p&&!/^(découverte|gratuit)$/i.test(p))?p:''; }", "return p; }", ['848', '813']),
]

def appliquer(fichier, avant, apres):
    chemin = os.path.join(ARBRE, fichier)
    s = open(chemin, encoding='utf-8').read()
    n = s.count(avant)
    if n != 1:
        return 'ancre trouvée %d fois' % n
    open(chemin, 'w', encoding='utf-8').write(s.replace(avant, apres))
    return ''

def banc(n):
    try:
        r = subprocess.run('node tests/test-%s.js' % n, cwd=ARBRE, shell=True, capture_output=True, text=True, timeout=400)
    except subprocess.TimeoutExpired:
        return False, 'délai dépassé'
    import re
    tot = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout + r.stderr)
    dernier = tot[-1] if tot else ('?', '?')
    return r.returncode == 0, '%s ✓ %s ✗ (code %d)' % (dernier[0], dernier[1], r.returncode)

# Mutations NEUTRES, vérifiées à la main : elles ne changent AUCUN comportement (une autre ligne fait déjà le travail).
# M10 : `formuleServieDe` pose `f = ''` quand rien n'est payé, donc `!RANG_FORMULE.includes(f)` suspend déjà — retirer
# `!p.paye` du test ne change rien. Une mutation neutre ne dit rien du banc (CLAUDE.md, « une mutation qui ne casse rien »).
NEUTRES = {'M10'}
bilan = []
for (nom, fichier, avant, apres, bancs) in MUT:
    err = appliquer(fichier, avant, apres)
    if err:
        bilan.append((nom, 'ANCRE', err)); print('✗ ' + nom + ' — ' + err, flush=True); continue
    # la mutation a bien touché le fichier (et lui seul)
    d = sh('git diff --stat', cwd=ARBRE).stdout.strip().splitlines()
    mord = []
    for n in bancs:
        vert, txt = banc(n)
        if not vert:
            mord.append('test-%s : %s' % (n, txt))
            break
    sh('git checkout -- ' + fichier, cwd=ARBRE)
    propre = sh('git status --porcelain --untracked-files=no', cwd=ARBRE).stdout.strip()
    if mord:
        bilan.append((nom, 'MORD', mord[0])); print('✓ ' + nom + ' — ' + mord[0], flush=True)
    elif nom.split(' ')[0] in NEUTRES:
        bilan.append((nom, 'NEUTRE', '')); print('· ' + nom + ' — neutre, comme attendu (voir NEUTRES)', flush=True)
    else:
        bilan.append((nom, 'NE MORD PAS', ', '.join(bancs))); print('✗ ' + nom + ' — aucun banc ne tombe (' + ', '.join(bancs) + ')', flush=True)
    if propre:
        print('   ⚠️ arbre pas propre après restauration : ' + propre, flush=True)

print('\n%d / %d mutations mordent (%d neutre(s), vérifiée(s) à la main)' % (sum(1 for b in bilan if b[1] == 'MORD'), len(bilan) - sum(1 for b in bilan if b[1] == 'NEUTRE'), sum(1 for b in bilan if b[1] == 'NEUTRE')))
sh('git worktree remove --force ' + ARBRE, cwd=DEPOT)
