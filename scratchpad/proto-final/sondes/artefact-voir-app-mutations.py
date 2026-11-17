#!/usr/bin/env python3
# MUTATIONS de « Voir comme l'application » (17 novembre 2026, voie « restes », artefact, tour 1).
# Une mutation = un défaut remis dans la page (ou dans une page voisine), puis la partie de la sonde qui le garde est rejouée : elle DOIT tomber.
# ⛔ À lancer APRÈS avoir commité le correctif (git checkout restaurerait aussi lui) ; ici on restaure par réécriture du texte d'origine, et on relit
# `git diff --stat` à la fin : il doit être vide pour les fichiers touchés. Un seul navigateur à la fois, chaque exécution avec un délai.
#   python3 artefact-voir-app-mutations.py [numéro ...]
import subprocess, sys, re, os
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PRINCIPALE = os.path.join(RACINE, 'apercu', 'prototype-op-gestion.html')
COMPTA = os.path.join(RACINE, 'apercu', 'prototype-comptabilite.html')
DOCS = os.path.join(RACINE, 'apercu', 'prototype-documents.html')
SONDE = 'scratchpad/proto-final/sondes/artefact-voir-app.js'
HORS = 'scratchpad/proto-final/sondes/recontrole-artefact-hors.js'
# (nom, fichier, ancien, nouveau, sonde, environnement)
M = [
 ("1 le bouton « Voir comme l'application » n'est plus posé dans la bande", PRINCIPALE, "${enApp() ? '' : '<button type=\"button\" class=\"rl-voir\"", "${true ? '' : '<button type=\"button\" class=\"rl-voir\"", SONDE, {'SEC': 'A'}),
 ("2 le drapeau de session n'est jamais posé", PRINCIPALE, "try { if (oui) sessionStorage.setItem(APP_VOIR_CLE, '1'); else sessionStorage.removeItem(APP_VOIR_CLE); return true; }", "try { if (!oui) sessionStorage.removeItem(APP_VOIR_CLE); return true; }", SONDE, {'SEC': 'A,D'}),
 ("3 l'adresse #lien- n'est jamais posée (le rangement refusé ne passe plus)", PRINCIPALE, "history.replaceState(null, '', location.pathname + location.search + h); return true; } catch (e) { try { location.hash = h.replace(/^#/, ''); return true; } catch (e2) { return false; } } }", "return true; } catch (e) { return false; } }", SONDE, {'SEC': 'C'}),
 ("4 « Revenir au mode test » ne retire pas le drapeau", PRINCIPALE, "try { if (oui) sessionStorage.setItem(APP_VOIR_CLE, '1'); else sessionStorage.removeItem(APP_VOIR_CLE); return true; }", "try { if (oui) sessionStorage.setItem(APP_VOIR_CLE, '1'); return true; }", SONDE, {'SEC': 'A'}),
 ("5 un rechargement refusé ne dit rien", PRINCIPALE, "function appDire(t){ if (document.getElementById('cn-err')) cnxDire(t); else toast(t); }", "function appDire(t){ }", SONDE, {'SEC': 'F'}),
 ("6 un rechargement refusé ne remet pas les choses comme avant", PRINCIPALE, "const echec = () => { appDrapeauPoser(avantDrapeau); appAdresse(avantHash);", "const echec = () => {", SONDE, {'SEC': 'F'}),
 ("7 le lien de retour est proposé aussi dans la coque (OPG_MODE_APP)", PRINCIPALE, "var APP_PAR_BOUTON = MODE_APP && !window.OPG_MODE_APP && ", "var APP_PAR_BOUTON = MODE_APP && ", SONDE, {'SEC': 'B'}),
 ("8 le lien de retour est proposé aussi avec ?app=1", PRINCIPALE, "!/[?&](app|lien)=/.test(location.search) && (appDrapeau()", "(appDrapeau()", SONDE, {'SEC': 'B'}),
 ("9 le drapeau ne suffit plus à ouvrir l'application (adresse perdue)", PRINCIPALE, "/^#lien-[a-z0-9-]+$/.test(location.hash) || appDrapeau();", "/^#lien-[a-z0-9-]+$/.test(location.hash);", SONDE, {'SEC': 'D'}),
 ("10 histRemplacer sans try", PRINCIPALE, "function histRemplacer(h){ try { history.replaceState(null, '', h); } catch (e) {} }", "function histRemplacer(h){ history.replaceState(null, '', h); }", SONDE, {'SEC': 'H'}),
 ("11 la rubrique refusée à une technicienne : replaceState nu", PRINCIPALE, "rlRefus(route, param); route = R.accueil || 'accueil'; param = null; histRemplacer('#' + route); }", "rlRefus(route, param); route = R.accueil || 'accueil'; param = null; history.replaceState(null, '', '#' + route); }", SONDE, {'SEC': 'H'}),
 ("12 vueFactures : replaceState nu", PRINCIPALE, "CX.st = 'tous'; route = 'comptabilite'; histRemplacer('#comptabilite'); return vueComptabilite(); };", "CX.st = 'tous'; route = 'comptabilite'; history.replaceState(null, '', '#comptabilite'); return vueComptabilite(); };", SONDE, {'SEC': 'H'}),
 ("13 historique refusé : la bascule jette au lieu de se rabattre", PRINCIPALE, "function appAdresse(h){ try { history.replaceState(null, '', location.pathname + location.search + h); return true; } catch (e) { try { location.hash = h.replace(/^#/, ''); return true; } catch (e2) { return false; } } }", "function appAdresse(h){ history.replaceState(null, '', location.pathname + location.search + h); return true; }", SONDE, {'SEC': 'E'}),
 ("14 le lien de retour reste posé quand l'écran de connexion a disparu", PRINCIPALE, "body:has(#cnx) #cnx-test{display:inline-flex}", "#cnx-test{display:inline-flex}", SONDE, {'SEC': 'A'}),
 ("15 la Comptabilité (cadre) hors artefact : plus de lien, « pas disponible »", COMPTA, "const dansArtefact = () => { try { return window.parent !== window && window.parent !== window.top; } catch (e) { return true; } };", "const dansArtefact = () => true;", HORS, {}),
 ("16 l'atelier (cadre) hors artefact : plus de lien, « pas disponible »", DOCS, "function dansArtefact(){ try{ return window.parent!==window&&window.parent!==window.top }catch(e){ return true } }", "function dansArtefact(){ return true }", HORS, {}),
 ("17 le rechargement qui part n'est plus reconnu : une page lente se défait", PRINCIPALE, "addEventListener('beforeunload', part, { once:true }); addEventListener('pagehide', part, { once:true });", "", SONDE, {'SEC': 'F'}),
]
choix = [int(x) for x in sys.argv[1:]] if sys.argv[1:] else None
bilan = []
for nom, fichier, ancien, nouveau, sonde, env in M:
    n = int(nom.split()[0])
    if choix and n not in choix: continue
    src = open(fichier, encoding='utf-8').read()
    if src.count(ancien) != 1:
        print(f"#{nom} : ANCRE INTROUVABLE ({src.count(ancien)} occurrences) — mutation non jouée"); bilan.append((nom, 'ancre')); continue
    try:
        open(fichier, 'w', encoding='utf-8').write(src.replace(ancien, nouveau))
        # la mutation a-t-elle touché le bon endroit ? (git diff : une seule zone change)
        d = subprocess.run(['git', 'diff', '--numstat', fichier], cwd=RACINE, capture_output=True, text=True).stdout.strip()
        e = dict(os.environ, PROFILS='mac', JOUR='1', **env)
        try:
            r = subprocess.run(['node', sonde], cwd=RACINE, capture_output=True, text=True, timeout=560, env=e)
            sortie = r.stdout + r.stderr; code = r.returncode
        except subprocess.TimeoutExpired:
            sortie = 'DÉLAI'; code = 99
        b = re.findall(r'(\d+) ✓\s+·?\s*(\d+) ✗', sortie)
        res = b[-1] if b else ('?', '?')
        tombees = [l.strip()[:150] for l in sortie.splitlines() if l.strip().startswith('✗')][:2]
        mord = code != 0 and res[1] not in ('0', '?')
        print(f"#{nom} : diff {d or '(aucun)'} → {res[0]} ✓ · {res[1]} ✗ code={code} {'MORD' if mord else 'NE MORD PAS'}")
        for t in tombees: print('     ', t)
        bilan.append((nom, 'mord' if mord else 'ne mord pas'))
    finally:
        open(fichier, 'w', encoding='utf-8').write(src)
print('\nBILAN :', sum(1 for _, x in bilan if x == 'mord'), 'mutations attrapées sur', len(bilan))
for nom, x in bilan:
    if x != 'mord': print('  ⚠', nom, x)
st = subprocess.run(['git', 'status', '--short', 'apercu'], cwd=RACINE, capture_output=True, text=True).stdout.strip()
print('git status apercu :', st or '(propre)')
