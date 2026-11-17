#!/usr/bin/env python3
"""Contre-épreuve de la campagne « planning » : remet chaque défaut corrigé, un par un, dans une COPIE du prototype
(le dépôt n'est jamais touché : une copie légère faite de liens, sauf la page mutée), lance la sonde qui garde le correctif
et exige qu'elle TOMBE. Une mutation qui ne casse rien veut dire que la sonde ne regarde pas au bon endroit.
Usage : python3 mutations-planning.py [numéro …]      (sans argument : toutes)"""
import os, shutil, subprocess, sys, tempfile
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PAGE = os.path.join('apercu', 'prototype-op-gestion.html')
S = 'scratchpad/proto-final/campagne/sondes/'
# (nom, ancien, nouveau, commande de la sonde, phrase attendue dans la sortie)
M = [
 ('01 position du client créé à la main non rangée', "const g = geoDeAdresse(CLIENTS[k].adr); if (g) CR_GEO[k] = g; }", "const g = null; if (g) CR_GEO[k] = g; }", ['node', S+'planning-parcours2.js', 'mac', 'P12'], 'posé au dépôt'),
 ('01b liens vers le dépôt quand la position manque', "dst = geo ? ll[0].toFixed(5) + ',' + ll[1].toFixed(5) : encodeURIComponent(c.adr || '')", "dst = ll[0].toFixed(5) + ',' + ll[1].toFixed(5)", ['node', S+'planning-parcours2.js', 'mac', 'P13'], 'visent l’adresse écrite'),
 ('03 Échap ne referme plus les fenêtres Sur mesure', "if (multiPop && route === 'planning' && !document.querySelector('.fen,.voile,#dtpop'))", "if (false && multiPop && route === 'planning' && !document.querySelector('.fen,.voile,#dtpop'))", ['node', S+'planning-parcours2.js', 'mac', 'P9'], 'Échap referme'),
 ('05a flèches de date à 40 px au doigt', "@media (pointer:coarse){.pl-barre .seg button,.pl-nav button,.pl-equipe button{min-height:44px}.pl-nav button{min-width:44px}}", "@media (pointer:coarse){.pl-barre .seg button,.pl-equipe button{min-height:44px}}", ['node', S+'planning-mise-en-page.js', 'iphone', 'jour'], 'Précédent'),
 ('05b interventions du mois à 43 px', "@media (pointer:coarse){.pl-mj .pc{min-height:44px;display:flex;flex-direction:column;justify-content:center}}", "", ['node', S+'planning-mise-en-page.js', 'iphone', 'mois'], 'cibles au doigt'),
 ('05c boutons « Par personne / colonnes » à 38 px', ".pm-mini{height:48px}.pm-mini button,.pm-mini b{line-height:44px!important;min-height:44px}", ".pm-mini{height:44px}.pm-mini button,.pm-mini b{line-height:38px!important}", ['node', S+'planning-mise-en-page.js', 'iphone', 'multi'], 'cibles au doigt'),
 ('05d repères de la carte à 30 px', ".cr-mk[data-crpin]::after{content:'';position:absolute;inset:-9.5px;border-radius:50%}", "", ['node', S+'planning-mise-en-page.js', 'iphone', 'carte'], 'cibles au doigt'),
 ('06 poignée de durée à 18 px', "  .pc .tire::before{content:'';position:absolute;left:0;right:0;top:-10px;bottom:0}}", "}", ['node', S+'planning-parcours.js', 'iphone', 'P4'], 'poignée se saisit'),
 ('07a l\'onde de l\'urgence avale le toucher', "position:absolute;inset:-6px;pointer-events:none;", "position:absolute;inset:-6px;", ['node', S+'planning-marqueurs.js', 'iphone'], 'pointer-events'),
 ('07b repères non écartés', "ecart = matchMedia('(pointer:coarse)').matches ? 45 : 31;", "ecart = 0;", ['node', S+'planning-marqueurs.js', 'mac'], '✗'),
 ('07d le tracé ne se refait plus à la fin d’un simple recadrage (repères hors champ empilés)', "crLV = { c:map.getCenter(), z:map.getZoom(), jour:jourCarte, focus:focusCarte }; crTracerReel(); });", "crLV = { c:map.getCenter(), z:map.getZoom(), jour:jourCarte, focus:focusCarte }; }); map.on('zoomend', () => crTracerReel());", ['node', S+'planning-marqueurs.js', 'iphone'], '✗'),
 ('11 une carte amenée à l’écran se pose sous la colonne des noms (Vue d’ensemble)', ".pl-defile:has(.pg-g){scroll-padding-left:172px}@media (max-width:760px){.pl-defile:has(.pg-g){scroll-padding-left:150px}}\n", "", ['node', S+'planning-mise-en-page.js', 'petit', 'general'], 'cibles au doigt'),
 ('07c cadrage sans la place de la légende', "paddingBottomRight:tel() ? [60, 178] : [70, 60]", "paddingBottomRight:tel() ? [60, 60] : [70, 60]", ['node', S+'planning-marqueurs.js', 'iphone'], '✗'),
 ('08 ni la garde du plugin ni le rattrapage du montage', [("if (window.L && L.map && L.maplibreGL) return Promise.resolve();", "if (window.L && L.map) return Promise.resolve();"), ("crChargerLeaflet().then(() => { try { crMonter(el); } catch (e) { try { if (el._m) el._m.remove(); } catch (x) {} el._m = null; crLf = null; crRepli(e && e.message || 'la carte n’a pas pu s’afficher'); } }, e => crRepli(e && e.message)); }", "crChargerLeaflet().then(() => crMonter(el), e => crRepli(e && e.message)); }")], None, ['node', S+'planning-carte-reessayer.js'], 'Réessayer'),
 ('10 la poignée de la liste ne ramène plus la carte', "const haut = l.getBoundingClientRect().top < innerHeight * .3 && k;", "const haut = false;", ['node', S+'planning-poignee-liste.js', 'iphone'], 'second toucher'),
 ('01c la commune se cherche partout dans l’adresse (la rue qui porte le nom d’une autre commune l’emporte)', [("const queue = [cp ? cp[1] : '', vir >= 0 ? a.slice(vir + 1) : ''];", "const queue = [];"), ("return COMMUNES.filter(x => a.includes(x[0])).sort((x, y) => a.lastIndexOf(y[0]) - a.lastIndexOf(x[0]))[0] || null;", "return COMMUNES.find(x => a.includes(x[0])) || null;")], "", ['node', S+'planning-recontrole.js', 'mac', 'R1'], '✗'),
 ('05e « Voir dans Tâches » à 41 px', ".t-ici-tout{display:flex;align-items:center;min-height:44px;padding:10px;", ".t-ici-tout{display:block;padding:10px;", ['node', S+'planning-recontrole.js', 'iphone', 'R5'], '✗'),
 ('07e la vue retenue prend le jour du moment (un mouvement tardif de l\'ancienne carte valide l\'ancien cadrage pour le nouveau jour)', "jour:jourCarte, focus:focusCarte }; crTracerReel(); });", "jour:plRef, focus:crFocus }; crTracerReel(); });", ['node', S+'planning-recontrole.js', 'mac', 'R7b'], '✗'),
 ('12a la bulle de trajet se pose au milieu sans regarder les repères', "if (places.some(q => q[0] > pt.x - b.w / 2 - 19 && q[0] < pt.x + b.w / 2 + 19 && q[1] > pt.y - 30 && q[1] < pt.y + 30)) continue;", "", ['node', S+'planning-recontrole.js', 'ipad', 'R12'], '✗'),
 ('12b un repère à sa vraie place sous un bouton de la carte n\'est pas écarté', "|| (X > 0 && X < sz.x && Y > 0 && Y < sz.y && sous(X, Y))) { let trouve = false;", ") { let trouve = false;", ['node', S+'planning-recontrole.js', 'ipad', 'R12'], '✗'),
 ('13a une intervention terminée garde la main qui attrape', ".pc.fait{cursor:pointer}", "", ['node', S+'planning-recontrole.js', 'mac', 'R13'], '✗'),
 ('13b le glissement d\'une terminée ne dit rien', "toast('Une intervention terminée ne se déplace pas.');", "", ['node', S+'planning-recontrole.js', 'mac', 'R13'], '✗'),
 ('13c le relâcher du glissement clique la colonne dessous (menu Créer ici)', "if (parle) bloque(); };", "};", ['node', S+'planning-recontrole.js', 'mac', 'R13'], '✗'),
 ('14 le focus ne ramène plus la carte à moitié cachée', "document.addEventListener('focusin', ev => { const e = ev.target, sc = e.closest && e.closest('.pl-defile');", "document.addEventListener('focusin-neutralise', ev => { const e = ev.target, sc = e.closest && e.closest('.pl-defile');", ['node', S+'planning-recontrole.js', 'iphone', 'R14'], '✗'),
]

def copie(page_mutee):
    t = tempfile.mkdtemp(prefix='mut-planning-')
    for n in os.listdir(RACINE):
        if n in ('.git', 'node_modules'): continue
        if n == 'apercu': continue
        os.symlink(os.path.join(RACINE, n), os.path.join(t, n))
    os.mkdir(os.path.join(t, 'apercu'))
    for n in os.listdir(os.path.join(RACINE, 'apercu')):
        if n == 'prototype-op-gestion.html': continue
        os.symlink(os.path.join(RACINE, 'apercu', n), os.path.join(t, 'apercu', n))
    with open(os.path.join(t, PAGE), 'w', encoding='utf-8') as f: f.write(page_mutee)
    return t

def main():
    veut = sys.argv[1:]
    src = open(os.path.join(RACINE, PAGE), encoding='utf-8').read()
    ok = ko = 0
    for nom, ancien, nouveau, cmd, phrase in M:
        if veut and nom.split(' ')[0] not in veut: continue
        paires = ancien if isinstance(ancien, list) else [(ancien, nouveau)]
        mut = src; mal = False
        for a, b in paires:
            n = src.count(a)
            if n != 1:
                print('?? %s : motif trouvé %d fois (attendu 1) — mutation non jouée' % (nom, n)); ko += 1; mal = True; break
            mut = mut.replace(a, b)
        if mal: continue
        t = copie(mut)
        try:
            r = subprocess.run(cmd, cwd=RACINE, env=dict(os.environ, RACINE=t), capture_output=True, text=True, timeout=560)
            sortie = r.stdout + r.stderr
            tombe = r.returncode != 0 and phrase in sortie
            print(('✓ ' if tombe else '✗ ') + nom + ' → ' + ('la sonde tombe (code %d)' % r.returncode if tombe else 'LA SONDE NE TOMBE PAS (code %d, phrase « %s » %s)' % (r.returncode, phrase, 'absente' if phrase not in sortie else 'présente')))
            if not tombe: print('\n'.join('     | ' + l for l in sortie.strip().split('\n')[-6:]))
            ok += tombe; ko += (not tombe)
        except subprocess.TimeoutExpired:
            print('✗ ' + nom + ' → délai dépassé'); ko += 1
        finally:
            shutil.rmtree(t, ignore_errors=True)
    print('\n%d mutation(s) attrapée(s) · %d non attrapée(s)' % (ok, ko)); sys.exit(1 if ko else 0)
main()
