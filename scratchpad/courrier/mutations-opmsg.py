#!/usr/bin/env python3
"""Mutations de la rubrique Courrier d'OP MESSAGES : chaque défaut est remis un par un dans le dépôt (l'aperçu, la source du service ou le générateur), la sortie servie est REGÉNÉRÉE (sinon la page servie
ne voit jamais la mutation), puis `tests/test-2705.js` doit TOMBER ; le fichier est restauré par `git checkout`. ⛔ CORRECTIF → BANC → COMMIT → MUTATION : `git status` doit être propre avant (CLAUDE.md).
   python3 scratchpad/courrier/mutations-opmsg.py [filtre]   (au premier plan)"""
import os, subprocess, sys, re
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AP, SRCS, GEN = 'apercu/opmessages/index.html', 'server-msg/public/source-serveur.js', 'scripts/opmsg-public.js'
M = [
 ("le Courrier entre dans ORDRE sans que le service l'ait dit", AP, "if (COUR.ouvert) ORDRE.splice(", "if (true) ORDRE.splice("),
 ("la page devine la bêta par son adresse", AP, "COUR.ouvert = (await source.courrierOuvert()) === true;", "COUR.ouvert = location.hostname.indexOf('beta') >= 0;"),
 ("une lecture refusée ouvre le Courrier", AP, "catch (e) { COUR.ouvert = false; } }", "catch (e) { COUR.ouvert = true; } }"),
 ("le Courrier paraît côté Perso", AP, "((k !== 'accueil' && k !== 'courrier') || !modesActifs() || etat.mode === 'pro')", "(k !== 'accueil' || !modesActifs() || etat.mode === 'pro')"),
 ("les deux côtés Pro et Perso", AP, "cotes: ['pro'], cote: 'pro', cleStockage: 'opmsg_courrier'", "cotes: ['pro', 'perso'], cote: 'pro', cleStockage: 'opmsg_courrier'"),
 ("la clé de stockage d'une autre application", AP, "cleStockage: 'opmsg_courrier'", "cleStockage: 'elanB_courrier'"),
 ("le module reste monté en quittant la rubrique", AP, "if (prec && prec.vue === 'courrier') courrierDemonter();", ""),
 ("un thème écrit dans la page", AP, "titre: 'OP Courrier', titreDocument: false });", "titre: 'OP Courrier', theme: () => 'jour', titreDocument: false });"),
 ("le service ouvre toujours le Courrier", SRCS, "return !!c && c.instance === 'beta';", "return true;"),
 ("une configuration illisible ouvre le Courrier", SRCS, "catch (e) { return false; } }\n    function courrierSource()", "catch (e) { return true; } }\n    function courrierSource()"),
 ("l'adaptateur sait marquer", SRCS, "marquage: false, deplacement: false, reglagesServeur: false, simulation: false, dossiers: ['inbox'], destinataires: 1 })", "marquage: true, deplacement: false, reglagesServeur: false, simulation: false, dossiers: ['inbox'], destinataires: 1 })"),
 ("l'adaptateur promet Google", SRCS, "oauth: false, programmeServeur: false, signature: false, marquage: false", "oauth: true, programmeServeur: false, signature: false, marquage: false"),
 ("l'adaptateur rend une boîte d'exemple", SRCS, "boites: () => Promise.resolve([]),", "boites: () => Promise.resolve([{ id: 'x', email: 'a@exemple.fr' }]),"),
 ("« Ajouter une boîte » réussit", SRCS, "envoyer: bientot, ajouterBoite: bientot, retirerBoite: bientot", "envoyer: bientot, ajouterBoite: () => Promise.resolve({ id: 'x', email: 'a@b.fr' }), retirerBoite: bientot"),
 ("« Bientôt » ne dit plus bientôt", SRCS, "const BIENTOT = 'Bientôt : la connexion", "const BIENTOT = 'Erreur : la connexion"),
 ("l'adaptateur lit les messages d'OP GESTION", SRCS, "messages: () => Promise.resolve([]),", "messages: () => fetch('/api/monitor/mail/liste').then(r => r.json()),"),
 ("la page servie perd les images data:", GEN, "img-src 'self' blob: data:; media-src", "img-src 'self' blob:; media-src"),
 ("le générateur ne copie plus le module", GEN, ", 'opcourrier.js': Buffer.from(courrier, 'utf8') };", " };"),
]
filtre = sys.argv[1] if len(sys.argv) > 1 else ''
st = subprocess.run(['git', 'status', '--short', '--', AP, SRCS, GEN, 'server-msg/public'], cwd=R, capture_output=True, text=True).stdout.strip()
if st: print("ARRÊT : le dépôt n'est pas propre (commiter le correctif AVANT de muter)\n" + st); sys.exit(2)
tombes = vives = total = 0
for nom, f, ancien, nouveau in M:
    if filtre and filtre not in nom: continue
    total += 1
    s = open(os.path.join(R, f), encoding='utf-8').read(); n = s.count(ancien)
    if n != 1: print('MAL VISÉE   ', nom, '— motif trouvé', n, 'fois'); continue
    open(os.path.join(R, f), 'w', encoding='utf-8').write(s.replace(ancien, nouveau, 1))
    try:
        g = subprocess.run(['node', 'scripts/opmsg-public.js'], cwd=R, capture_output=True, text=True, timeout=60)
        if g.returncode != 0: tombe, etat = True, ('le générateur REFUSE', '')
        else:
            r = subprocess.run(['node', 'tests/test-2705.js'], cwd=R, capture_output=True, text=True, timeout=200)
            k = re.findall(r'(\d+) ✓ +(\d+) ✗', r.stdout); etat = k[-1] if k else ('?', '?'); tombe = r.returncode != 0
            if not tombe and f == GEN:   # une mutation du GÉNÉRATEUR est aussi jouée contre son propre banc (test-941 : la sortie, ses refus, la population)
                r2 = subprocess.run(['node', 'tests/test-941.js'], cwd=R, capture_output=True, text=True, timeout=200); tombe = r2.returncode != 0; etat = ('2705 vert', 'test-941 tombe' if tombe else 'rien')
    except subprocess.TimeoutExpired: tombe, etat = True, ('délai', '')
    finally: subprocess.run(['git', 'checkout', '--', AP, SRCS, GEN, 'server-msg/public'], cwd=R)
    print(('TOMBE   ' if tombe else 'VIVANTE ') + nom + '  [' + ' ✗'.join(map(str, etat)) + ']')
    if tombe: tombes += 1
    else: vives += 1
print('\n%d mutations jouées · %d tombent · %d survivent' % (total, tombes, vives))
sys.exit(1 if vives else 0)
