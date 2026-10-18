#!/usr/bin/env python3
"""Mutations d'OP Courrier (module + branchement OP GESTION) : on REMET un défaut que les bancs gardent, un par un, et on vérifie que le banc visé TOMBE.
   Règle du dépôt : correctif → banc → `git commit` → mutation → `git checkout` (jamais l'inverse : `git checkout` restaure depuis HEAD et emporterait un correctif non commité).
   Ce script refuse de partir si un des fichiers visés n'est pas propre, restaure par `git checkout -- <fichier>` après CHAQUE mutation, et vérifie que la mutation a bien CHANGÉ le
   fichier (une mutation qui ne touche rien ne prouve rien). Au premier plan, avec un délai par exécution. Lancer depuis la racine :  python3 scratchpad/courrier/mutations-module.py"""
import subprocess, sys, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
os.chdir(RACINE)
M = 'opcourrier.js'; A = 'app.html'
# (nom, fichier, ancien, neuf, banc visé)
MUTATIONS = [
  ('M01 la feuille perd all:initial (l\'héritage de l\'hôte traverse)', M, '    all:initial; display:block; color-scheme:light;', '    display:block; color-scheme:light;', 'tests/test-2702.js'),
  ('M02 un sélecteur sort de .opc', M, '  .opc .sr{position:absolute !important;', '  .sr{position:absolute !important;', 'tests/test-2702.js'),
  ('M03 le module sort du réseau (fetch)', M, 'function lireMX(d){\n    if(typeof SRC.lireMX!=="function") return null;', 'function lireMX(d){\n    fetch("https://dns.google/resolve?name="+d);\n    if(typeof SRC.lireMX!=="function") return null;', 'tests/test-2702.js'),
  ('M04 une donnée d\'exemple revient dans le module', M, 'var TITRE = String(opt.titre || "OP Courrier");', 'var TITRE = String(opt.titre || "OP Courrier"); var EXEMPLE = "lea.fontaine@atelier-nord.fr";', 'tests/test-2702.js'),
  ('M05 une capacité devient « truthy »', M, 'CAP[k]=c[k]===true;', 'CAP[k]=!!c[k];', 'tests/test-2702.js'),
  ('M06 la clé de stockage est écrite en dur', M, 'var LS = String(opt.cleStockage || "opcourrier");', 'var LS = "elanB_courrier";', 'tests/test-2702.js'),
  ('M07 ce que la source rend est copié sur l\'appareil', M, 'MESSAGES.forEach(function(m){ if(m.user) snap.user.push(nettoye(m)); });', 'MESSAGES.forEach(function(m){ if(m.user||m.src) snap.user.push(nettoye(m)); });', 'tests/test-2702.js'),
  ('M08 un envoi refusé reste « Envoyé »', M, 'm.sending=false; m.folder="drafts"; delete m.sendAt; m.at=Date.now(); m.user=true;', 'm.sending=false; m.folder="sent"; delete m.sendAt; m.at=Date.now(); m.user=true;', 'tests/test-2702.js'),
  ('M09 la colonne des boîtes redevient « fixed »', M, '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sidebar{position:absolute;', '.opc:where([data-fmt="phone"],[data-fmt="pad"]) .sidebar{position:fixed;', 'tests/test-2702.js'),
  ('M10 une requête de largeur d\'écran revient', M, '  @media (max-width:520px) {', '  @media (min-width:700px) {.opc .sg-row{gap:1px}}\n  @media (max-width:520px) {', 'tests/test-2702.js'),
  ('M11 la lecture différée se trompe de méthode', M, 'return SRC.lire(m.sid);', 'return SRC.lire2(m.sid);', 'tests/test-2702.js'),
  ('M12 la porte BETA_ESSAI disparaît', A, '  if(BETA_ESSAI) return courrierVue();', '  return courrierVue();', 'tests/test-2703.js'),
  ('M13 une liste illisible devient une liste vide (boites)', A, "if(!r.ok) throw await refus(r,'Lecture des boîtes refusée');", 'if(!r.ok) return [];', 'tests/test-2703.js'),
  ('M14 un refus de /api/replies devient « aucun message »', A, "if(!r.ok) throw await refus(r,'Lecture de la réception refusée');", 'if(!r.ok) return [];', 'tests/test-2703.js'),
  ('M15 l\'envoi ne passe plus par la boîte connectée', A, ',useMailbox:{id:m.boite}};', '};', 'tests/test-2703.js'),
  ('M16 la vue d\'avant bouge d\'un caractère', A, 'views.boiteMail=function(){\n  if(BETA_ESSAI) return courrierVue();   // OP Courrier (bêta seulement) : voir le bloc juste au-dessus. En production : la vue d\'avant, ci-dessous, inchangée.\n  setHeader(\'Boîte mail\'', 'views.boiteMail=function(){\n  if(BETA_ESSAI) return courrierVue();   // OP Courrier (bêta seulement) : voir le bloc juste au-dessus. En production : la vue d\'avant, ci-dessous, inchangée.\n  setHeader(\'Boîte  mail\'', 'tests/test-2703.js'),
  ('M17 la clé du module n\'est plus vidée en quittant l\'entreprise', A, "'usage','espace_admin','courrier']", "'usage','espace_admin']", 'tests/test-2703.js'),
  ('M18 le module est chargé au démarrage', A, '<meta name="theme-color" content="#0D1624" media="(prefers-color-scheme: dark)">', '<meta name="theme-color" content="#0D1624" media="(prefers-color-scheme: dark)"><script src="opcourrier.js"></script>', 'tests/test-2703.js'),
  ('M19 la preuve de clé n\'est plus présentée au retrait', A, "const r=await fetch(PUSH_API+'/api/mailbox/disconnect',{method:'POST',headers:await enteteEquipe({'Content-Type':'application/json'}),", "const r=await fetch(PUSH_API+'/api/mailbox/disconnect',{method:'POST',headers:{'Content-Type':'application/json'},", 'tests/test-2703.js'),
]
# Mutations qui ne se voient qu'au NAVIGATEUR (sondes playwright-core : voir pilote.js) ; lancer avec --navigateur, NODE_PATH posé. Chacune dure plusieurs minutes.
NAVIGATEUR = [
  ('N01 le calque n\'est plus promu dans la couche supérieure (la feuille passe SOUS la barre de l\'hôte)', M, '  try{ layerEl.showPopover(); }catch(e){', '  try{ }catch(e){', 'scratchpad/courrier/sonde-module.js'),
  ('N02 le format se décide sur l\'ÉCRAN, pas sur le conteneur', M, 'var w = hote.getBoundingClientRect().width || conteneur.clientWidth || window.innerWidth || 1024;', 'var w = window.innerWidth;', 'scratchpad/courrier/sonde-module.js'),
  ('N03 la feuille de l\'hôte entre dans le module (plus d\'arbre d\'ombre)', M, 'var sr = hote.attachShadow({mode:"open"});', 'var sr = hote; sr.getElementById=function(i){ return sr.querySelector("#"+i); };', 'scratchpad/courrier/sonde-module.js'),
  ('N04 une liste de boîtes illisible redevient « Aucune boîte »', M, 'function(e){ LOAD.boites="ko"; LOAD.err=msgErr(e,"Impossible de lire vos boîtes mail."); return null; })', 'function(e){ LOAD.boites="ok"; LOAD.err=""; return null; })', 'scratchpad/courrier/sonde-module.js'),
  ('N05 la zone d\'OP GESTION ne reçoit plus la hauteur qui reste (le module s\'effondre)', A, "  if(z.style.height!==h+'px') z.style.height=h+'px';", "  void h;", 'scratchpad/courrier/sonde-gestion.js'),
]
if '--navigateur' in sys.argv: MUTATIONS = NAVIGATEUR
def sh(*a, **k): return subprocess.run(a, capture_output=True, text=True, **k)
# beta.html est GÉNÉRÉE depuis app.html : une mutation d'app.html se propage par `node beta-build.js`, sinon la sonde qui lit beta.html ne verrait JAMAIS le défaut
fichiers = sorted({m[1] for m in MUTATIONS} | ({'beta.html'} if any(m[1] == A for m in MUTATIONS) else set()))
sale = sh('git', 'status', '--porcelain', '--', *fichiers).stdout.strip()
if sale: sys.exit('REFUS : fichiers visés non commités (git checkout les restaurerait depuis HEAD et emporterait le correctif) :\n' + sale)
tombent = 0; cours = None
try:
    for nom, f, ancien, neuf, banc in MUTATIONS:
        cours = f
        t = open(f, encoding='utf-8').read()
        n = t.count(ancien)
        if n != 1: print('  ?? %s : ancre trouvée %d fois (une mutation mal visée ne prouve rien)' % (nom, n)); continue
        open(f, 'w', encoding='utf-8').write(t.replace(ancien, neuf, 1))
        if f == A: sh('node', 'beta-build.js')
        if sh('git', 'diff', '--quiet', '--', f).returncode == 0: print('  ?? %s : la mutation n\'a rien changé' % nom); continue
        try: r = sh('node', banc, timeout=(600 if banc.startswith('scratchpad') else 170))
        except subprocess.TimeoutExpired: r = None
        sh('git', 'checkout', '--', f, *(['beta.html'] if f == A else []))
        if r is None: print('  ?? %s : délai dépassé' % nom); continue
        sortie = r.stdout + r.stderr
        import re
        m = re.findall(r'(\d+) ✓\s+(\d+) ✗', sortie); bilan = m[-1] if m else (re.findall(r'TOTAL (\d+)/(\d+)', sortie) or [('?', '?')])[-1]
        tombe = r.returncode != 0
        tombent += tombe
        print('  %s %s → %s ✓ · %s ✗ (%s)' % ('✓ tombe ' if tombe else '✗ VERT   ', nom, bilan[0], bilan[1], banc))
finally:
    if cours: sh('git', 'checkout', '--', *fichiers)
print('\n%d mutations sur %d tombent' % (tombent, len(MUTATIONS)))
sys.exit(0 if tombent == len(MUTATIONS) else 1)
