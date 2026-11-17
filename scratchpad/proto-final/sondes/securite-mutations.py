#!/usr/bin/env python3
# CONTRE-ÉPREUVE des sondes securite-*.js (audit de sécurité, étape 7 sur 8, 17 novembre 2026) : chaque mutation REMET une faille dans une COPIE du dépôt
# (jamais dans le dépôt : les fichiers de la copie sont des fichiers à part, tout le reste est un lien), puis la sonde qui garde cette faille est jouée
# contre la copie avec RACINE=<copie>. Une mutation « tombe » si la sonde sort en 1 ET si le contrôle visé (son libellé) est parmi les ✗.
# Une mutation qui ne fait rien tomber ne dit pas que le code est bon : elle dit que la sonde ne regarde pas au bon endroit (règle du dépôt) —
# chaque remplacement DOIT donc trouver sa cible le nombre de fois attendu, sinon le script s'arrête.
#   python3 securite-mutations.py                 → toutes les mutations (plusieurs minutes : un navigateur par lot)
#   python3 securite-mutations.py M01 M05         → seulement celles-là
#   python3 securite-mutations.py --liste         → la liste
# Rend, sur la dernière ligne, « N mutations · T tombées · R résistantes » ; sortie 1 s'il en reste une qui résiste.
import os, sys, shutil, subprocess, json, re
ICI = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
COPIE = '/tmp/opg-securite-copie'
SORTIE = os.environ.get('OPG_SORTIE_MUT', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/securite-mutations.json')
OG = 'apercu/prototype-op-gestion.html'; CM = 'apercu/prototype-comptabilite.html'; CO = 'apercu/prototype-courrier.js'; SRC = 'scratchpad/proto-final/atelier/page.source'
AND = 'mobile/android/app/src/main/AndroidManifest.xml'; FP = 'mobile/android/app/src/main/res/xml/file_paths.xml'
# (id, faille, fichier, ancien, nouveau, nombre attendu, sonde, libellé qui doit tomber)
M = [
 ('M01', 'S01', OG, "<span><b>${esc(a.t)}</b><br><span class=\"gris petit\">${esc(a.s)}</span></span>", "<span><b>${a.t}</b><br><span class=\"gris petit\">${a.s}</span></span>", 1, 'securite-injection.js', 'B5 S01'),
 ('M02', 'S02', OG, "<h2>${esc(g.nom)} ${esc(j.action)}</h2>", "<h2>${g.nom} ${j.action}</h2>", 1, 'securite-injection.js', 'B4 S02'),
 ('M03', 'S03 (entrée)', OG, "const pr = nomPersonneOk(eqxVal('eq-p')), no = nomPersonneOk(eqxVal('eq-n')), m = eqxVal('eq-m');", "const pr = eqxVal('eq-p'), no = eqxVal('eq-n'), m = eqxVal('eq-m');", 1, 'securite-injection.js', 'A1 S03'),
 ('M04', 'S03 (sortie)', OG, "const eqNom = p => nomPersonneNet(p.prenom) + ' ' + nomPersonneNet(p.nom);", "const eqNom = p => p.prenom + ' ' + p.nom;", 1, 'securite-injection.js', 'B1 S03'),
 ('M05', 'S07 (sortie)', OG, "esc(prU(q, (x || {}).u || 'u'));", "prU(q, (x || {}).u || 'u');", 1, 'securite-injection.js', 'B2 S07'),
 ('M06', 'S07 (entrée)', OG, "  if (!uniteSure(pdxEl('pr-u').value)) return refus(", "  if (false) return refus(", 1, 'securite-injection.js', 'A2 S07'),
 ('M07', 'S08', OG, "${esc(f.contact)} · ${esc(f.tel)} · ${esc(f.delai)}", "${esc(f.contact)} · ${f.tel} · ${f.delai}", 1, 'securite-injection.js', 'B3 S08'),
 ('M08', 'S09', OG, "perdu.map(esc).join(', ')", "perdu.join(', ')", 1, 'securite-injection.js', 'A5 S09'),
 ('M09', 'S12 (les DEUX couches : libelleSur retire déjà < > ")', OG, [("return toast(`Plateforme enregistrée : ${esc(n)}.`); }", "return toast(`Plateforme enregistrée : ${n}.`); }"), ("const n = libelleSur((document.getElementById('pa-n') || {}).value, 60);", "const n = (document.getElementById('pa-n') || {}).value.trim();")], None, 1, 'securite-injection.js', 'A4 S12'),
 ('M10', 'S04', OG, "const VX_TYPES_OK = /^(image\\/(png|jpe?g|gif|webp|heic|heif)|application\\/pdf)$/i;", "const VX_TYPES_OK = /./;", 1, 'securite-fichiers.js', 'S04 un SVG'),
 ('M11', 'S06 (FEC)', OG, "[5, 7, 8, 10].includes(i) ? net(v).replace(/^[=+\\-@]/, \"'$&\") : net(v)).join('\\t')", "net(v)).join('\\t')", 1, 'securite-fichiers.js', 'S06 FEC'),
 ('M12', 'S06 (Véhicules)', OG, "q = s => '\"' + (/^[=+\\-@\\t\\r]/.test(String(s)) ? \"'\" : '') + String(s).replace(/\"/g, '\"\"') + '\"'", "q = s => '\"' + String(s).replace(/\"/g, '\"\"') + '\"'", 2, 'securite-fichiers.js', 'S06 CSV Véhicules'),
 ('M13', 'S11', OG, "  if (R.length > 5001) return toast(", "  if (false) return toast(", 1, 'securite-fichiers.js', 'S11 un fichier de 6 000'),
 ('M14', 'S13', CM, "  if (window.parent === window || ev.source !== window.parent) return;", "", 1, 'securite-acces.js', 'S13'),
 ('M15', 'S14', OG, "const ecMien = cli => !(RL_ACTIF && ROLE === 'client') || cli === RL_CLI.cli;", "const ecMien = cli => true;", 1, 'securite-acces.js', 'S14'),
 ('M16', 'S05', OG, "facture:fac && cli && FACTURES.find(o => o.num === fac && o.cli === cli), devis:dvn && cli && DV.find(o => o.num === dvn && o.cli === cli),", "facture:fac && FACTURES.find(o => o.num === fac), devis:dvn && DV.find(o => o.num === dvn),", 1, 'securite-confiance.js', None),
 ('M17', 'S15', CO, "'</a>'+fin; });", "'</a>'+fin; });", 0, 'securite-liens.js', None),   # remplacée plus bas (mutation à regex)
 ('M18', 'S10 (balise absente)', CM, '<meta http-equiv="Content-Security-Policy"', '<meta http-equiv="X-Essai"', 1, 'securite-statique.js', 'S10 prototype-comptabilite.html : porte'),
 ('M19', 'S10 (connect-src ouvert)', OG, "connect-src 'self' blob: https://tiles.openfreemap.org", "connect-src 'self' https: blob: https://tiles.openfreemap.org", 1, 'securite-statique.js', 'S10 prototype-op-gestion.html : aucun joker'),
 ('M20', 'S16', OG, "j.integrity = 'sha384-NElt3Op+9NBMCYaef5HxeJmU4Xeard/Lku8ek6hoPTvYkQPh3zLIrJP7KiRocsxO'; ", "", 1, 'securite-statique.js', 'S16 leaflet.min.js'),
 ('M21', 'S17 (sauvegarde)', AND, 'android:allowBackup="false"', 'android:allowBackup="true"', 1, 'securite-statique.js', 'S17 Android : la sauvegarde'),
 ('M22', 'S17 (?auto=)', OG, "if (window.OPG_MODE_APP) return false;", "", 1, 'securite-statique.js', 'S17 dans la coque'),
 ('M23', 'S17 (FileProvider)', FP, '<cache-path name="partage" path="partage/" />', '<external-path name="my_images" path="." />', 1, 'securite-statique.js', 'S17 Android : le FileProvider'),
 ('M24', 'S18', SRC, '<!-- polices : plus de feuille Google', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><!-- polices : plus de feuille Google', 1, 'securite-statique.js', 'S18 page.source'),
 ('M25', 'S10 (politique active, dynamique)', OG, '<meta http-equiv="Content-Security-Policy"', '<meta http-equiv="X-Essai"', 1, 'securite-politique.js', None),
]
def vide(): shutil.rmtree(COPIE, ignore_errors=True); os.makedirs(COPIE)
def lier(rel):
    """rend le fichier rel RÉEL dans la copie : chaque dossier du chemin devient un vrai dossier dont les voisins sont des liens"""
    cur_src, cur_dst = DEPOT, COPIE
    for i, part in enumerate(rel.split('/')):
        s = os.path.join(cur_src, part)
        if i == len(rel.split('/')) - 1: return os.path.join(cur_dst, part)
        d = os.path.join(cur_dst, part)
        if not os.path.isdir(d) or os.path.islink(d):
            if os.path.islink(d): os.unlink(d)
            os.makedirs(d, exist_ok=True)
            for e in os.listdir(s):
                if e != part and not os.path.exists(os.path.join(d, e)): os.symlink(os.path.join(s, e), os.path.join(d, e))
        cur_src, cur_dst = s, d
def preparer(rien=None):
    vide()
    for e in os.listdir(DEPOT):
        if e != '.git': os.symlink(os.path.join(DEPOT, e), os.path.join(COPIE, e))
def poser(rel, texte):
    # un lien vers un dossier racine (apercu, mobile, scratchpad) devient un dossier réel au premier fichier modifié
    parts = rel.split('/'); top = os.path.join(COPIE, parts[0])
    if os.path.islink(top):
        os.unlink(top); os.makedirs(top)
        for e in os.listdir(os.path.join(DEPOT, parts[0])): os.symlink(os.path.join(DEPOT, parts[0], e), os.path.join(top, e))
    cur_src, cur_dst = os.path.join(DEPOT, parts[0]), top
    for part in parts[1:-1]:
        s, d = os.path.join(cur_src, part), os.path.join(cur_dst, part)
        if os.path.islink(d):
            os.unlink(d); os.makedirs(d)
            for e in os.listdir(s): os.symlink(os.path.join(s, e), os.path.join(d, e))
        cur_src, cur_dst = s, d
    f = os.path.join(cur_dst, parts[-1])
    if os.path.islink(f): os.unlink(f)
    open(f, 'w', encoding='utf8').write(texte)
def muter(m):
    mid, faille, rel, ancien, nouveau, n, sonde, libelle = m
    t = open(os.path.join(DEPOT, rel), encoding='utf8').read()
    if mid == 'M17':   # S15 : le texte d'un lien redevient l'adresse brute (adresseVue n'est plus appelée)
        a = "'+adresseVue(u)+'</a>'+fin; });"; b = "'+u+'</a>'+fin; });"; k = t.count(a)
        if k != 1: print('✗ M17 cible trouvée', k, 'fois'); sys.exit(2)
        return t.replace(a, b)
    if isinstance(ancien, list):
        for x, y in ancien:
            if t.count(x) != 1: print('✗', mid, faille, ': « %s » trouvé %d fois, attendu 1' % (x[:70], t.count(x))); sys.exit(2)
            t = t.replace(x, y)
        return t
    k = t.count(ancien)
    if k != n: print('✗', mid, faille, ': « %s » trouvé %d fois, attendu %d' % (ancien[:70], k, n)); sys.exit(2)
    return t.replace(ancien, nouveau)
def jouer(m):
    mid, faille, rel, ancien, nouveau, n, sonde, libelle = m
    preparer(); poser(rel, muter(m))
    env = dict(os.environ, RACINE=COPIE)
    try: r = subprocess.run(['node', os.path.join(ICI, sonde)], capture_output=True, text=True, timeout=560, env=env, cwd=DEPOT)
    except subprocess.TimeoutExpired: return {'id': mid, 'faille': faille, 'sonde': sonde, 'resultat': 'délai dépassé (à REJOUER : la machine est partagée)'}
    sortie = r.stdout + r.stderr; echecs = [l.strip() for l in sortie.split('\n') if l.strip().startswith('✗')]
    bil = re.findall(r'(\d+) ✓ +· +(\d+) ✗|== (\d+) ✓ · (\d+) ✗', sortie)
    tombe = r.returncode == 1 and (libelle is None or any(libelle in l for l in echecs))
    return {'id': mid, 'faille': faille, 'sonde': sonde, 'sortie': r.returncode, 'echecs': len(echecs), 'attendu': libelle, 'tombe': bool(tombe), 'extraits': [e[:150] for e in echecs[:4]]}
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--liste' in sys.argv:
        for m in M: print(m[0], m[1], '→', m[6], '·', m[7] or '(n\'importe quel ✗)')
        return
    choix = [m for m in M if not args or m[0] in args]; res = []
    for m in choix:
        r = jouer(m); res.append(r)
        print(('✓ tombe  ' if r.get('tombe') else '✗ RÉSISTE') if 'tombe' in r else '? ', r['id'], r['faille'], '·', r['sonde'], '·', ('%d ✗ : %s' % (r['echecs'], ' | '.join(r['extraits'][:2])) if 'echecs' in r else r['resultat']), flush=True)
    shutil.rmtree(COPIE, ignore_errors=True)
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True); json.dump(res, open(SORTIE, 'w'), ensure_ascii=False, indent=1)
    t = sum(1 for r in res if r.get('tombe')); print('%d mutations · %d tombées · %d résistantes' % (len(res), t, len(res) - t)); sys.exit(0 if t == len(res) else 1)
main()
