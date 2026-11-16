#!/usr/bin/env python3
# Contre-épreuve des sondes de la Boîte mail : on REMET un défaut dans une COPIE (jamais dans les fichiers du dépôt) et la sonde visée doit tomber (code de sortie ≠ 0).
# Une mutation qui ne casse rien dit que la sonde ne regarde pas au bon endroit : on le DIT. Avant chaque tour on vérifie que la mutation a changé le fichier (un `replace`
# qui ne trouve rien n'éprouve rien).
# Usage : python3 mail-mutations.py [de] [a]     (indices 1..N, pour couper le lot en tours de moins de 5 minutes)
import os, shutil, subprocess, sys, tempfile
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
COURRIER, PAGE = 'apercu/prototype-courrier.js', 'apercu/prototype-op-gestion.html'
# (nom, fichier, ancien, nouveau, sonde qui doit tomber)
M = [
 ('D01 : « r » sans preventDefault', COURRIER, 'else if(e.key==="r"&&state.selected){ e.preventDefault(); var sm', 'else if(e.key==="r"&&state.selected){ var sm', 'mail-defauts.js'),
 ('D02 : la phrase rapide collée après la signature', COURRIER, 'body0=(model.intro||"")+curSig+(model.body||"")', 'body0=curSig+(model.intro||"")+(model.body||"")', 'mail-defauts.js'),
 ('H1 : opt.hote ignoré par le module', COURRIER, 'var HOTE = (opt.hote && typeof opt.hote === "object") ? opt.hote : null;', 'var HOTE = null;', 'mail-reconnaissance.js'),
 ('H2 : agir ne rend pas la main à l\'hôte', COURRIER, 'try{ HOTE.agir(hb.getAttribute("data-hote"),hm0?horsModule(hm0):null); }', 'try{ /* rien */ }', 'mail-reconnaissance.js'),
 ('H9 : le module ne suit plus le Jour / Nuit du prototype', PAGE, "theme:() => document.documentElement.dataset.mode === 'nuit' ? 'nuit' : 'jour'", "theme:() => 'jour'", 'mail-theme.js'),
 ('hôte remonté à chaque rendre()', PAGE, 'courrierCaler(); courrierRafraichir(); return v; }; })();', 'courrierDemonter(); courrierCaler(); courrierRafraichir(); return v; }; })();', 'mail-persistance.js'),
 ('téléphone : l\'hôte ne s\'arrête plus au-dessus de la barre d\'onglets', PAGE, "const r0 = place.getBoundingClientRect(), bas = barre && cs.display !== 'none' && cs.position === 'fixed' ? barre.getBoundingClientRect().top : innerHeight;", "const r0 = place.getBoundingClientRect(), bas = innerHeight;", 'mail-telephone.js'),
 ('D04 : deux nombres différents pour la même boîte', COURRIER, 'return u?plural(u,"non lu","non lus"):"tout est lu"; }', 'return plural(folderMessages("inbox").length,"message","messages")+", "+plural(u,"non lu","non lus"); }', 'mail-defauts.js'),
 ('D14 : la liste entière redessinée', COURRIER, 'var msgsTous=msgs; msgs=msgs.slice(0,lim);', 'var msgsTous=msgs;', 'mail-perf.js'),
 ('liens : ouvrir ne lève plus la recherche', COURRIER, 'closeOverlay(); clearSearch(); state.filter="all"; state.cat="tout";\n    var f=m.folder;', 'closeOverlay(); state.filter="all"; state.cat="tout";\n    var f=m.folder;', 'mail-liens.js'),
 ('liens : une demande faite avant le montage se perd', PAGE, "else COURRIER.suite.push(f);", "else { /* perdue */ }", 'mail-liens.js'),
 ('rôles : le module d\'un rôle reste monté pour le suivant', PAGE, "  if (COURRIER.inst && COURRIER.role !== ROLE) courrierDemonter();   // un autre rôle", "  if (false) courrierDemonter();   // un autre rôle", 'mail-persistance.js'),
 ('fichier absent : l\'erreur de chargement est avalée', PAGE, "s.onerror = () => { s.remove(); fin(false); };", "s.onerror = () => { s.remove(); };", 'mail-absent.js'),
 ('une information porte la pastille « Nouveau contact »', PAGE, "m.dossier !== 'recu' || m.info) return null; const R = mlLire(m);", "m.dossier !== 'recu') return null; const R = mlLire(m);", 'mail-reconnaissance.js'),
 ('D12 : on peut répondre à un indésirable', COURRIER, 'disRep=(!m||m.folder==="junk")?" disabled":""', 'disRep=""', 'mail-defauts.js'),
 ('D07 : un refus avec la coche verte', COURRIER, 'var refus=!!(action&&action.refus)||REFUS_RE.test(String(msg));', 'var refus=false;', 'mail-defauts.js'),
 ('bandeau : le geste « Créer l\'intervention » disparaît', PAGE, "if (R.sujet === 'panne') { act('ml:creerint|' + id, 'Créer l’intervention', !R.relance);", "if (R.sujet === 'panne') { ", 'mail-reconnaissance.js'),
 ('rôles : la Boîte mail s\'ouvre sans permission', PAGE, "if (route !== 'boiteMail' || !place || (typeof rlPermis === 'function' && !rlPermis('boiteMail')))", "if (route !== 'boiteMail' || !place)", 'mail-roles.js'),
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
        r = subprocess.run(['node', os.path.join(SONDES, sonde)], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=280)
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
