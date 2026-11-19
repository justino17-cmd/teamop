#!/usr/bin/env python3
# Contre-épreuve de equipe-droits-joues.js (tour 3 « restes équipe », 19 novembre 2026) : on REMET chaque défaut corrigé (ou on retire chaque garde posée) dans une COPIE de la page hors dépôt,
# on rejoue le cas concerné, et la sonde doit TOMBER. Une mutation qui ne tombe pas est dite (équivalente, ou sonde manquante).
# usage : python3 mutations-restes-equipe-droits.py [numéro…]   ⛔ 127.0.0.1 seulement ; au premier plan.
import os, shutil, subprocess, sys, re
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..', '..'))
TMP = os.environ.get('MUT_TMP', '/tmp/mut-restes-equipe-droits')
PAGE = os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html')
src = open(PAGE, encoding='utf-8').read()
FILTRE = "items = items.filter(it => it === '---' || !it.droit || peut(it.droit[0], it.droit[1]));"
CLIC = "if (it.droit && !peut(it.droit[0], it.droit[1])) { fermerMenu(); return droitsRefus(it.droit[0], it.droit[1], 'menu', b.textContent.trim()); } "
# (nom, [(avant, après)], case, profil)
M = [
 ('1 « Supprimer l\'absence » n\'est plus filtré par la case (et la garde du clic part avec)', [("l:'Supprimer l’absence', danger:true, droit:['planif', 's'],", "l:'Supprimer l’absence', danger:true,")], 'planif.s', 'mac'),
 ('2 « Supprimer » un créneau bloqué n\'est plus filtré par la case', [("l:'Supprimer', danger:true, droit:['planif', 's'], fn:() => { memo(); BUREAU", "l:'Supprimer', danger:true, fn:() => { memo(); BUREAU")], 'planif.s', 'mac'),
 ('3 « Dupliquer le lendemain » (créneau bloqué) n\'est plus filtré par la case Créer', [("l:'Dupliquer le lendemain', droit:['planif', 'c'],", "l:'Dupliquer le lendemain',")], 'planif.c', 'mac'),
 ('4 data-asuppr sort de la table des gestes (le bouton fabriqué passe)', [("asuppr:{ k:'planif', d:'s' },", "")], 'planif.s', 'mac'),
 ('5 [ÉQUIVALENTE ATTENDUE : le filtre du menu est doublé par la garde du clic — le geste est refusé, dit et rien n\'est écrit] le menu ne filtre plus les entrées sans la case', [(FILTRE, "")], 'planif.s', 'mac'),
 ('6 ni le filtre du menu ni la garde du clic (les deux gardes de ouvrirMenu retirées)', [(FILTRE, ""), (CLIC, "")], 'planif.s', 'mac'),
 ('7 « Supprimer… » / « Annuler l\'intervention… » du menu d\'une intervention ne portent plus la case (la fenêtre s\'ouvre sans son bouton)', [("danger:true, droit:['planif', 's'], fn:() => planConfirmer('annuler', i.id) }", "danger:true, fn:() => planConfirmer('annuler', i.id) }"), ("danger:true, droit:['planif', 's'], fn:() => planConfirmer('supprimer', i.id) }", "danger:true, fn:() => planConfirmer('supprimer', i.id) }")], 'planif.s', 'mac'),
 ('8 l\'e-mail tapé à l\'envoi d\'un devis se range de nouveau dans la fiche sans « Modifier les clients »', [("if (!c || !peut('crm', 'm') || (c.mail || '').trim()", "if (!c || (c.mail || '').trim()")], 'crm.m', 'mac'),
 ('9 la garde en capture ne connaît plus « Enregistrer » de la fiche client (data-action clientEnreg classé lecture)', [("clientEnreg@crm ", "")], 'crm.m', 'mac'),
 ('10 le module de courrier ne refuse plus « C » (nouveau message) sans la case Créer', [(None, None)], 'com.c', 'mac'),
 ('11 le module de courrier ne refuse plus « # » (supprimer) sans la case Supprimer', [(None, None)], 'com.s', 'mac'),
 ('12 le module de courrier ne refuse plus « F » (drapeau) sans la case Modifier', [(None, None)], 'com.m', 'mac'),
 ('13 le module de courrier ne cache plus ses boutons sans la case (CSS data-ranger/data-supprimer/data-ecrire)', [(None, None)], 'com.m', 'mac'),
 ('14 la case Supprimer des demandes d\'achat (annuler une demande) n\'est plus lue par la garde (axa demannul reclassé lecture)', [("s:'demannul', l:'quand", "l:'demannul quand")], 'achats.s·terrain', 'mac'),
 ('15 « Supprimer cette note » (ndfsuppr) n\'est plus classé supprimer', [("s:'ndfsuppr', l:'retour", "l:'ndfsuppr retour")], 'achats.s·terrain', 'mac'),
]
# les mutations 10 à 13 visent le MODULE de courrier (prototype-courrier.js), pas la page
COURRIER = {
 10: [('if(e.key==="c"||e.key==="C"){ e.preventDefault(); if(droit("ecrire")) openCompose(); }', 'if(e.key==="c"||e.key==="C"){ e.preventDefault(); openCompose(); }')],
 11: [('function doAct(act,id){\n    if(ACT_DROIT[act]&&!droit(ACT_DROIT[act])) return;', 'function doAct(act,id){\n    if(ACT_DROIT[act]&&act!=="trash"&&!droit(ACT_DROIT[act])) return;')],
 12: [('function doAct(act,id){\n    if(ACT_DROIT[act]&&!droit(ACT_DROIT[act])) return;', 'function doAct(act,id){\n    if(ACT_DROIT[act]&&act!=="flag"&&!droit(ACT_DROIT[act])) return;')],
 13: [('.opc[data-ranger="0"] :is([data-act="reply"]', '.opc[data-ranger="0xx"] :is([data-act="reply"]'), ('.opc[data-supprimer="0"] :is([data-act="trash"]', '.opc[data-supprimer="0xx"] :is([data-act="trash"]'), ('.opc[data-ecrire="0"] :is(#btnCompose', '.opc[data-ecrire="0xx"] :is(#btnCompose')],
}
choix = set(sys.argv[1:]); bilan = []
for nom, subs, case, prof in M:
    n = int(nom.split(' ')[0])
    if choix and str(n) not in choix: continue
    page = src; courrier = None
    if n in COURRIER:
        courrier = open(os.path.join(DEPOT, 'apercu', 'prototype-courrier.js'), encoding='utf-8').read(); subs = COURRIER[n]
        for a, b in subs:
            if courrier.count(a) != 1: print(f'  ! mutation {n} : motif du module introuvable ou multiple ({courrier.count(a)}) : {a[:60]}'); courrier = None; break
            courrier = courrier.replace(a, b)
        if courrier is None: bilan.append((n, nom, 'MOTIF')); continue
    else:
        ok = True
        for a, b in subs:
            if page.count(a) != 1: ok = False; print(f'  ! mutation {n} : motif introuvable ou multiple ({page.count(a)}) : {a[:70]}'); break
            page = page.replace(a, b)
        if not ok: bilan.append((n, nom, 'MOTIF')); continue
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        p = os.path.join(DEPOT, 'apercu', f)
        if os.path.isfile(p): shutil.copy(p, os.path.join(TMP, 'apercu', f))
    open(os.path.join(TMP, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(page)
    if courrier is not None: open(os.path.join(TMP, 'apercu', 'prototype-courrier.js'), 'w', encoding='utf-8').write(courrier)
    env = dict(os.environ, RACINE=TMP)
    try:
        r = subprocess.run(['node', os.path.join(ICI, 'equipe-droits-joues.js'), prof, case], cwd=DEPOT, env=env, capture_output=True, text=True, timeout=420); sortie = r.stdout + r.stderr; code = r.returncode
    except subprocess.TimeoutExpired: sortie = ''; code = 124
    tot = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie); tombes = [l.strip()[:120] for l in sortie.split('\n') if l.startswith('  ✗')]
    etat = 'TOMBE' if code == 1 and tombes else ('PASSE (la sonde ne voit pas ce défaut)' if code == 0 else f'code {code}')
    print(f'mutation {nom} : {etat} {tot[-1] if tot else ""}'); [print('    ✗', t) for t in tombes[:2]]
    bilan.append((n, nom, etat))
shutil.rmtree(TMP, ignore_errors=True)
mauvais = [b for b in bilan if not b[2].startswith('TOMBE') and 'ÉQUIVALENTE' not in b[1]]
print(f'\n== {len(bilan) - len(mauvais)} mutation(s) sur {len(bilan)} tombent (ou sont déclarées équivalentes)'); [print('  ⚠', b[0], b[1], '→', b[2]) for b in mauvais]
sys.exit(1 if mauvais else 0)
