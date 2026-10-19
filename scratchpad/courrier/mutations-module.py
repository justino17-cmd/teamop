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
  ('G01 le journal est allumé sur une valeur « truthy », sans méthode', M, 'CAP.journalEnvois=c.journalEnvois===true&&typeof SRC.envois==="function";', 'CAP.journalEnvois=!!c.journalEnvois;', 'tests/test-2702.js'),
  ('G02 le téléchargement est promis sans méthode piece', M, 'CAP.telechargerPiece=c.telechargerPiece===true&&typeof SRC.piece==="function";', 'CAP.telechargerPiece=c.telechargerPiece===true;', 'tests/test-2702.js'),
  ('G03 le suivi est allumé sur une valeur « truthy »', M, 'CAP.suivi=c.suivi===true&&typeof SRC.suivi==="function";', 'CAP.suivi=!!c.suivi;', 'tests/test-2702.js'),
  ('G04 « envois » devient un dossier que la source remplit', M, 'return !!f&&!f.journal; })', 'return !!f; })', 'tests/test-2702.js'),
  ("G05 un journal illisible vide ce qu'on avait lu", M, '}).catch(function(e){ LOAD.envois="ko";', '}).catch(function(e){ for(var i=MESSAGES.length-1;i>=0;i--) if(MESSAGES[i].jr) MESSAGES.splice(i,1); LOAD.envois="ko";', 'tests/test-2702.js'),
  ('G06 on peut marquer / archiver / répondre à une ligne du journal', M, 'if(!m||m.jr) return;   // le journal', 'if(!m) return;   // le journal', 'tests/test-2702.js'),
  ("G07 la barre d'outils d'une ligne du journal porte les gestes de rangement", M, "if(!m||m.jr) return '';", "if(!m) return '';", 'tests/test-2702.js'),
  ('G08 un nom de pièce garde ses séparateurs de chemin', M, '.replace(/[\\\\\\/:*?"<>|]+/g,"_")', '', 'tests/test-2702.js'),
  ("G09 un nom de pièce garde l'inversion de sens d'écriture", M, '\\u202a-\\u202e', '\\u202a-\\u202d', 'tests/test-2702.js'),
  ("G10 la pièce garde le type annoncé par l'expéditeur", M, 'new Blob([b],{type:"application/octet-stream"})', 'new Blob([b],{type:b.type})', 'tests/test-2702.js'),
  ('G11 un double clic télécharge deux fois', M, '||a.dl) return;', ') return;', 'tests/test-2702.js'),
  ("G12 le bouton de pièce s'affiche même sans identifiant", M, '(dlOk&&a.id!=null?', '(dlOk?', 'tests/test-2702.js'),
  ("G13 le suivi n'est plus appliqué avant la réponse", M, 'm.suivi=neuf; repeindreSuivi(m,patch.statut||"");', 'repeindreSuivi(m,patch.statut||"");', 'tests/test-2702.js'),
  ("G14 un suivi refusé n'est pas défait", M, 'm.suivi=avant; if(vivant){ repeindreSuivi(m); toast(', 'if(vivant){ repeindreSuivi(m); toast(', 'tests/test-2702.js'),
  ('G15 un message sans suivi connu montre un faux suivi', M, '||m.folder!=="inbox"||!m.suivi) return "";', '||m.folder!=="inbox") return "";', 'tests/test-2702.js'),
  ("G16 répondre ne garde pas le message d'origine", M, 'enReponseA:m.src?m.sid:null,', '', 'tests/test-2702.js'),
  ('G17 la source ne reçoit pas enReponseA', M, ',enReponseA:m.repA||undefined}; }', '}; }', 'tests/test-2702.js'),
  ("G18 la marque de réponse survit à l'envoi", M, 'var enfil=!!m.repA; delete m.repA;', 'var enfil=!!m.repA;', 'tests/test-2702.js'),
  ('G19 le brouillon perd sa marque de réponse', M, 'if(d.enReponseA) m.repA=String(d.enReponseA); else delete m.repA; }', '}', 'tests/test-2702.js'),
  ('G20 le composeur ne rend pas enReponseA', M, 'noTrust:state.compose.noTrust,enReponseA:state.compose.enReponseA}; }', 'noTrust:state.compose.noTrust}; }', 'tests/test-2702.js'),
  ('G21 la réponse rapide ne répond pas dans le fil', M, 'noTrust:rm?rm.noTrust:null,enReponseA:rm?rm.enReponseA:null}); }', 'noTrust:rm?rm.noTrust:null}); }', 'tests/test-2702.js'),
  ("G22 le journal disparaît dès qu'on change de vue (Pro / Perso)", M, 'function inScopeOf(m,sc){ if(sc==="all"||m.jr) return true;', 'function inScopeOf(m,sc){ if(sc==="all") return true;', 'tests/test-2702.js'),
  ('G23 on peut sélectionner plusieurs lignes du journal', M, 'function setMulti(on,firstId){ if(on&&folderOf(state.folder).journal){ toast("Le journal des envois est en lecture seule"); return; }', 'function setMulti(on,firstId){', 'tests/test-2702.js'),
  ('G24 un statut inventé passe pour un suivi', M, 'if(SUIVI_ETATS[i][0]===x.statut) return', 'if(true) return', 'tests/test-2702.js'),
  ('G25 une ligne du journal arrive non lue', M, 'read:true,flagged:false,vip:false,att:[],at:+r.date||0', 'read:false,flagged:false,vip:false,att:[],at:+r.date||0', 'tests/test-2702.js'),
  ("G26 le sujet d'un envoi n'est pas échappé", M, '\'<h1 class="rsubj" tabindex="-1">\'+H(m.subject||"(Sans objet)")+\'</h1>\'+\n      \'<div class="sched-banner\'', '\'<h1 class="rsubj" tabindex="-1">\'+(m.subject||"(Sans objet)")+\'</h1>\'+\n      \'<div class="sched-banner\'', 'tests/test-2702.js'),
  ('G27 piece() sort du contrat écrit en tête', M, '     piece(idMessage, idPiece)   → Blob', '     pièce(idMessage, idPiece)   → Blob', 'tests/test-2702.js'),
  ("G28 l'aperçu d'un envoi sans texte n'est plus dit", M, '(aperçu non conservé pour ce message)', '(vide)', 'tests/test-2702.js'),
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
        if os.environ.get('FILTRE') and os.environ['FILTRE'] not in nom: continue
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
joue = len([x for x in MUTATIONS if not os.environ.get('FILTRE') or os.environ['FILTRE'] in x[0]])
print('\n%d mutations sur %d tombent' % (tombent, joue))
sys.exit(0 if tombent == joue else 1)
