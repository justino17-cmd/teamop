#!/usr/bin/env python3
# Angle « dépendances » : les CORRECTIFS PROPOSÉS, posés dans une COPIE des pages (jamais dans les pages elles-mêmes : l'audit ne modifie rien).
#   python3 dependances-corrections.py             → copie /tmp/opg-dependances-copie (apercu/ en liens, sauf les pages corrigées) + dependances-corrections.diff
#   OPG_NIVEAU=inline python3 …                    → variante « politique sans empreintes de scripts » ('unsafe-inline' gardé) : la copie sert à mesurer ce que la politique bloque MÊME quand un script en ligne s'exécute
#   OPG_SANS=dependances-02 python3 …              → contre-épreuve : la copie garde CE défaut (le .diff n'est alors pas écrit)
# Les sondes se rejouent ensuite contre la copie :  RACINE=/tmp/opg-dependances-copie node scratchpad/proto-final/securite/dependances-csp.js
# Chaque remplacement DOIT trouver sa cible le nombre de fois attendu, sinon le script s'arrête : un correctif qui ne s'applique pas ne prouve rien.
# ⛔ La page des documents est FABRIQUÉE depuis scratchpad/proto-final/atelier/page.source (fabriquer.sh) : le vrai correctif s'y écrit, puis on relance
#    la fabrication. Ce script ne touche que la COPIE, pour la preuve.
import os, sys, shutil, subprocess, hashlib, base64, re
ICI = os.path.dirname(os.path.abspath(__file__))
DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
COPIE = os.environ.get('OPG_COPIE', '/tmp/opg-dependances-copie')
NIVEAU = os.environ.get('OPG_NIVEAU', 'hash')
SANS = [x for x in os.environ.get('OPG_SANS', '').split(',') if x]
APERCU = os.path.join(DEPOT, 'apercu')
PAGES = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html']
TETE = '<meta charset="utf-8">'

# (page, libellé, ancien, nouveau, nombre d'occurrences attendu) — les remplacements « de contenu » ; la politique, elle, se calcule (empreintes) ci-dessous
CORRECTIFS = [
 # dependances-03 : l'interrupteur de test de la garde des droits (window.DROITS_GARDE === false) n'existe plus dans le code livré
 ('prototype-op-gestion.html', 'dependances-03 : droitsGeste n\'a plus d\'interrupteur « window.DROITS_GARDE === false »',
  "if (!ev.target || !ev.target.closest || window.DROITS_GARDE === false) return;", "if (!ev.target || !ev.target.closest) return;", 1),
 # dependances-02 : l'atelier de documents ne demande plus ses 13 familles de polices à Google (adresse IP et navigateur de chaque personne qui l'ouvre)
 ('prototype-documents.html', 'dependances-02 : plus de feuille de polices Google dans l\'atelier (les polices se servent depuis le site ; à défaut, la police du système)',
  None, '', 1),
]

def sha(t): return "'sha256-" + base64.b64encode(hashlib.sha256(t.encode('utf8')).digest()).decode() + "'"
def blocs_en_ligne(h):
    # exactement ce que fait le navigateur : de <script> au PREMIER </script> (une balise avec src= n'a pas de texte à signer)
    return [m.group(1) for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', h)]
def politique(h, page):
    hotes_js = "'self' https://cdnjs.cloudflare.com https://unpkg.com"
    if NIVEAU == 'inline': js = hotes_js + " 'unsafe-inline'"
    else: js = hotes_js + ' ' + ' '.join(sorted({sha(b) for b in blocs_en_ligne(h)}))
    attr = ''
    if NIVEAU != 'inline' and 'onclick="event.stopPropagation()"' in h:
        attr = " script-src-attr 'unsafe-hashes' " + sha('event.stopPropagation()') + ';'
    elif NIVEAU == 'inline': attr = " script-src-attr 'unsafe-inline';"
    tuiles = 'https://tiles.openfreemap.org https://server.arcgisonline.com'
    return ("default-src 'none'; script-src " + js + ';' + attr + " style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: " + tuiles + "; font-src 'self' data:; "
            "connect-src 'self' blob: " + tuiles + "; frame-src 'self' blob: data:; worker-src blob:; media-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'")

def lire(p): return open(p, encoding='utf8').read()
def main():
    shutil.rmtree(COPIE, ignore_errors=True); os.makedirs(os.path.join(COPIE, 'apercu'))
    for e in os.listdir(DEPOT):
        if e in ('apercu', '.git'): continue
        os.symlink(os.path.join(DEPOT, e), os.path.join(COPIE, e))
    for e in os.listdir(APERCU):
        if e in PAGES: continue
        os.symlink(os.path.join(APERCU, e), os.path.join(COPIE, 'apercu', e))
    textes = {p: lire(os.path.join(APERCU, p)) for p in PAGES}
    for page, lib, ancien, nouveau, n in CORRECTIFS:
        if any(lib.startswith(x) for x in SANS): print('— laissé tel quel :', lib); continue
        if ancien is None:   # la feuille de polices : on retrouve la balise <link …fonts.googleapis.com…> entière
            m = re.findall(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]*">\n?', textes[page])
            if len(m) != n: print('✗ %s : %d feuille(s) de polices trouvée(s), attendu %d' % (lib, len(m), n)); sys.exit(1)
            textes[page] = textes[page].replace(m[0], nouveau); print('✓', lib, '(%d)' % len(m)); continue
        k = textes[page].count(ancien)
        if k != n: print('✗ %s : « %s » trouvé %d fois, attendu %d' % (lib, ancien[:70], k, n)); sys.exit(1)
        textes[page] = textes[page].replace(ancien, nouveau); print('✓', lib, '(%d)' % k)
    # dependances-01 : une politique de contenu et une politique de référent, en balise (le site est servi sans en-têtes : GitHub Pages)
    if not any('dependances-01'.startswith(x) or x == 'dependances-01' for x in SANS):
        for p in PAGES:
            if textes[p].count(TETE) != 1: print('✗ dependances-01 : %s porte %d balises charset, attendu 1' % (p, textes[p].count(TETE))); sys.exit(1)
            pol = politique(textes[p], p)
            # la politique se calcule SUR le texte final de la page : toute retouche d'un script oblige à la recalculer (étape de fabrication, voir dependances.json › correction)
            textes[p] = textes[p].replace(TETE, TETE + '<meta http-equiv="Content-Security-Policy" content="' + pol + '"><meta name="referrer" content="same-origin">', 1)
            print('✓ dependances-01 : politique %s posée dans %s (%d signes)' % (NIVEAU, p, len(pol)))
    else: print('— laissé tel quel : dependances-01 (aucune politique)')
    for p, t in textes.items(): open(os.path.join(COPIE, 'apercu', p), 'w', encoding='utf8').write(t)
    if SANS or NIVEAU != 'hash': print('copie (niveau %s, sans : %s) : %s' % (NIVEAU, ','.join(SANS) or '—', COPIE)); return
    sortie = []
    for p in PAGES:
        r = subprocess.run(['diff', '-u', '--label', 'a/apercu/' + p, '--label', 'b/apercu/' + p, os.path.join(APERCU, p), os.path.join(COPIE, 'apercu', p)], capture_output=True, text=True)
        sortie.append(r.stdout)
    tete = ("CORRECTIFS PROPOSÉS — angle « dépendances » (17 novembre 2026). Rien n'est appliqué : le chef de chantier décide. Se rejoue : git apply --check <ce fichier>, puis git apply.\n"
            "Ce que contient chaque morceau (les mêmes sondes, rejouées contre une copie corrigée par dependances-corrections.py, passent : voir dependances.json › contreEpreuve) :\n"
            " · les QUATRE pages : dependances-01 (politique de contenu en balise, avec l'empreinte de chaque script en ligne ; politique de référent « same-origin ») ;\n"
            " · prototype-op-gestion.html : dependances-03 (plus d'interrupteur de test sur la garde des droits) ;\n"
            " · prototype-documents.html : dependances-02 (plus de feuille de polices Google).\n"
            "⛔ L'empreinte d'un script se CALCULE sur le texte final de la page : à chaque retouche d'un script, relancer le calcul (voir la règle de fabrication dans dependances.json).\n"
            "⛔ prototype-documents.html est FABRIQUÉ : le vrai correctif s'écrit dans scratchpad/proto-final/atelier/page.source et dans l'en-tête de fabriquer.sh, puis on relance la fabrication.\n"
            "Pas dans ce fichier : les empreintes d'intégrité (SRI) des bibliothèques tierces, déjà proposées par ponts-corrections.diff (ponts-05) — les deux se complètent.\n\n")
    open(os.path.join(ICI, 'dependances-corrections.diff'), 'w', encoding='utf8').write(tete + ''.join(sortie))
    print('copie :', COPIE, '· diff :', os.path.join(ICI, 'dependances-corrections.diff'))
main()
