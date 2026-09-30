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
  ('M1 règle de suspension : un non-payé servi avec sa formule (ancienne forme)', S,
   "return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f)));",
   "return !!(p && (p.bloque || !RANG_FORMULE.includes(f)));", ['761', '845', '848']),
  ('M2 règle de suspension : une formule que l\'application ne connaît pas servie quand même', S,
   "return !!(p && (p.bloque || !p.paye || !RANG_FORMULE.includes(f)));",
   "return !!(p && (p.bloque || !p.paye));", ['761', '842', '845']),
  ('M3 espacePaye : une fiche Gratuit sans rien redevient « payée, gratuit »', S,
   "return { paye: false, motif: 'formule Gratuit (retirée le 30 septembre 2026) — ' + pourquoi + ' : suspendue jusqu\\'au règlement' };",
   "return { paye: true, motif: 'gratuit' };", ['727', '761', '842']),
  ('M4 aboManuelDe : la fiche Gratuit réglée « active » à la main redevient payée', S,
   "  if (court && e.formule === 'gratuit') return false;\n",
   "", ['727', '761']),
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
   "const servie = gratuitPayeIllisible(e, s, fp) ? formuleGratuitIllisible(s) : ((fp && fp.f) || e.formule);",
   "const servie = (fp && fp.f) || e.formule;", ['844']),
  ('M10 Mon espace : ne lit plus la règle unique de suspension', S,
   "  if (accesSuspenduPar(p, f)) return { statut: 'suspendu' };",
   "  if (p.bloque) return { statut: 'suspendu' };", ['727']),
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
  ('M23 réglage à la main ÉCHU : il décide de nouveau (payeur suspendu, période ignorée)', S,
   "  return !(court && e.aboFin && e.aboFin < (jour || new Date().toISOString().slice(0, 10)));",
   "  return true;", ['727', '844', '840']),
  ('M24 rappel J-7 : le réglage à la main se juge de nouveau AUJOURD\'HUI (lien de paiement à une abonnée)', S,
   "if (!e.formule || aboManuelDe(e, jourApres(finLe))) return { etat: 'aucun' };",
   "if (!e.formule || aboManuelDe(e)) return { etat: 'aucun' };", ['844']),
  ('M25 facturation différée : le réglage à la main se juge de nouveau aujourd\'hui', S,
   "if (lue && aboManuelDe(lue, jourApres(po.finLe))) return null;",
   "if (lue && aboManuelDe(lue)) return null;", ['840']),
  ('M26 Stripe illisible redevient « rien de payé »', S,
   "const illisible = !s && !!(config.stripe && config.stripe.secretKey) && !espStripeCache.data;",
   "const illisible = false;", ['727', '761']),
  ('M27 route : le doute servi comme un paiement (formule de la fiche)', S,
   "    if (p.inconnu) return res.json({ ok: true, verificationImpossible: true, opMessages, metier, versionMin, enLigne, suspendu, sursisJours });\n",
   "", ['761']),
  ('M28 registre des codes illisible : de nouveau « non payé » (fiche payante)', S,
   "  if (promosIllisible) return payeInconnu('registre des codes illisible');\n  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };",
   "  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };", ['803']),
  ('M29 Mon espace : le doute dit une formule', S,
   "  if (!p || p.inconnu) return '';",
   "  if (!p) return '';", ['727']),
  ('M30 fiche Gratuit payée d\'avant la bascule : toujours Pro, même au tarif Business Premium', S,
   "  return rang >= 0 ? RANG_FORMULE[rang] : 'pro';",
   "  return 'pro';", ['727']),
  ('M31 « Revoir le lien » : la garde ne lit plus que prev.t', S,
   "  const tPrev = String(espaceT(prev) || '');",
   "  const tPrev = String(prev.t || '');", ['848']),
  ('M32 réglage échu : le motif ne le dit plus à la Tour', S,
   "  return { paye: false, motif: aboEchuMotif(e) + 'aucun paiement ni code promo' };",
   "  return { paye: false, motif: 'aucun paiement ni code promo' };", ['727']),
  ('M33 app : un code promo tapé depuis l\'écran suspendu ne relit plus l\'état', A,
   "    try{ if(typeof _susp!=='undefined'&&_susp&&_susp.suspendu) await forfaitServeurSync(true); }catch(e){}\n",
   "", ['803']),
  ('M34 app : « ＋ Créer » pendant une suspension dit de nouveau « aucune création »', A,
   "  if(typeof accesSuspendu==='function'&&accesSuspendu()){ go('suspendu'); return; }\n",
   "", ['761']),
  ('M35 app : « J\'ai réglé — vérifier » affirme de nouveau sans avoir lu', A,
   "  let lu=false; try{ lu=await forfaitServeurSync(true); }catch(e){}",
   "  let lu=true; try{ await forfaitServeurSync(true); }catch(e){}", ['761']),
  ('M36 app : forfaitServeurSync dit « lu » sur une vérification impossible', A,
   "_placesSrv=null; return !j.verificationImpossible; }",
   "_placesSrv=null; return true; }", ['845']),
  ('M37 Tour : le courriel de bienvenue nomme de nouveau « Payer mon abonnement »', T,
   "Ton accès s\\'ouvre dès que ton abonnement est réglé : au premier lancement, l\\'application affiche « Accès suspendu » et le bouton « Régler mon abonnement ».",
   "Pour débloquer tous les avantages de ta formule : paye ton abonnement (l\\'app te guide, bouton « Payer mon abonnement »).", ['841']),
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
NEUTRES = set()   # (M10 était neutre tant que « Mon espace » avait sa propre copie de la règle ; elle lit désormais `accesSuspenduPar`)
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
