#!/usr/bin/env python3
"""Mutations du COMPOSITEUR (lot « compositeur », recontrôle du 17 novembre 2026) — les 14 correctifs tout-01 à tout-14 : on remet chaque défaut sur une COPIE, la sonde durable qui le garde doit tomber.
Modèle : atelier-mutations.py (même mécanique). Mutations de l'atelier dans OP GESTION : sur des COPIES (jamais dans le dépôt), on remet un défaut à la fois puis on lance la sonde qui doit le voir (RACINE=<copie>).
« mord » = la sonde rend au moins un ✗ (exit 1) ou meurt (exit 2) ; « survit » = elle reste verte : la sonde ne regarde pas là, ou une autre garde couvre. Avant chaque mutation on
vérifie que l'ancien texte est UNIQUE dans le fichier (une mutation qui frappe ailleurs ne prouve rien) et que le fichier a bien changé.
Usage : python3 compositeur-mutations.py [filtre-sur-le-nom]   — le journal va dans CAP/mutations.log"""
import os, re, shutil, subprocess, sys, time
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
CAP = os.environ.get('CAP', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap'); COPIE = os.path.join(CAP, 'mut', 'racine')
os.makedirs(os.path.join(COPIE, 'apercu'), exist_ok=True)
FICHIERS = {'P': 'apercu/prototype-op-gestion.html', 'A': 'apercu/prototype-documents.html'}
for f in ['prototype-op-gestion.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'opcourrier.js']:
    shutil.copy(os.path.join(DEPOT, 'apercu', f), os.path.join(COPIE, 'apercu', f))
ORIGINE = {k: open(os.path.join(DEPOT, v), encoding='utf-8').read() for k, v in FICHIERS.items()}
def M(nom, f, old, new, sonde, env=None): return dict(nom=nom, f=f, old=old, new=new, sonde=sonde, env=env or {})
R = "atelier-roles.js"; N = "atelier-numeros.js"; T = "atelier-retour.js"; E = "atelier-echecs.js"; D = "atelier-devis.js"; C = "atelier-contrat.js"; G = "atelier-miseenpage.js"; S = "atelier-seule.js"; GR = "atelier-grand.js"
MUT = [
 M("T06 le second clic du même geste n'est plus avalé après « Créer »", 'A', "creerDocument(d); _SILENCE=performance.now()+450;", "creerDocument(d);", "compositeur-gestes.js"),
 M("T10 Tab ignore la confirmation ouverte par-dessus la fenêtre", 'A', "if(document.querySelector('.voile:not(.fen-v)')) return; /* une confirmation", "/* une confirmation", "compositeur-gestes.js"),
 M("T12a un client au même e-mail n'est plus signalé", 'A', "if(mail&&String(c.email||'').trim().toLowerCase()===mail) return {client:c,raison:'même adresse e-mail'};", "", "compositeur-gestes.js"),
 M("T12b un client au même nom n'est plus signalé", 'A', "if(nom&&norm(c.nom||'')===nom) return {client:c,raison:'même nom'};", "", "compositeur-gestes.js"),
 M("T05 un prix ne se réécrit plus à deux décimales", 'A', "const champPrix=c=>Math.floor(c/100)+','+String(c%100).padStart(2,'0');", "const champPrix=c=>String(c/100).replace('.',',');", "compositeur-gestes.js"),
 M("T14 la pastille « Modifié » n'est plus posée dès la première lettre", 'A', "if(tt&&!tt.querySelector('.vv-opt-b')){ const em", "if(false){ const em", "compositeur-gestes.js"),
 M("T09 plus de mise en service au catalogue envoyé à l'atelier", 'P', "{ ref:'MO-MS', des:'Mise en service et contrôle d’étanchéité', unite:'forfait', puC:12000, tvaBp:1000, cat:'Main-d’œuvre' },", "", "atelier-devis.js"),   # gardée par le catalogue EXACT d'atelier-devis (références MO-H…DEP-Z3) : compositeur-gestes ne regarde qu'une prestation de chaque famille
 M("T13 le modèle « maintenance » ne dit plus HT", 'A', "Le prix de la maintenance est de {{prix}} HT par an (hors taxes : la TVA s’ajoute).", "Le prix de la maintenance est de {{prix}} par an.", "compositeur-liste.js"),
 M("T11 un envoyé ne se dit plus « envoyé aujourd'hui »", 'P', "return 'envoyé ' + (n === 0 ? 'aujourd’hui' : n === 1 ? 'hier' : 'il y a ' + n + ' jours');", "return 'Envoyé le ' + opdDate(x.maj);", "compositeur-liste.js"),
 M("T08 le titre de la carte des composés perd son rembourrage", 'P', ".opd-liste .opd-t{margin:6px 0 4px;padding:0 12px}", ".opd-liste .opd-t{margin:6px 0 4px;padding:0}", "compositeur-liste.js"),
 M("T02 la rangée de gestes d'un article ne rétrécit plus (320 px)", 'A', ".vv-a .vv-l-a{flex:0 1 auto;max-width:100%;margin:0}", ".vv-a .vv-l-a{flex:none;margin:0}", "compositeur-mise-en-page.js", {'PROFIL':'petit'}),
 M("T02b la rangée de gestes passe sur deux lignes à 360 px", 'A', "@media (max-width:400px){.vv-a .vv-l-a{gap:2px}.vv-a .vv-l-a .bt.contour{margin-right:0}}", "", "compositeur-mise-en-page.js", {'PROFIL':'android'}),
 M("T01 l'aperçu s'ouvre de nouveau sur « Ajuster » au téléphone", 'A', "if(!V.zoomVoulu&&V.zoom==='ajuster'&&fit<.7) V.zoom=1;", "", "compositeur-mise-en-page.js", {'PROFIL':'iphone'}),
 M("T03 l'échelle ne règle plus que la première zone", 'A', "zones.forEach(zone=>{", "zones.slice(0,1).forEach(zone=>{", "compositeur-mise-en-page.js", {'PROFIL':'ipad'}),
 M("T07a un brouillon supprimé est ré-adopté par sauverStock (plus « connu »)", 'A', "fermerDoc(); if(APP) OPG.connus.add(id);", "fermerDoc();", "compositeur-gestes.js"),
 M("T07b « Supprimer ce brouillon » est proposé aussi pour un document envoyé", 'A', "const suppr=APP&&d&&d.etat==='brouillon'&&(d.type", "const suppr=APP&&d&&(d.type", "compositeur-gestes.js", {'PROFIL':'iphone'}),   # au téléphone le menu existe aussi pour un document envoyé ; à l'ordinateur il n'y a pas de menu du tout

 # ── restes du recontrôle, tour 1 (garde : compositeur-restes1.js) ──
 M("R1 le menu « ⋯ » ne range plus la feuille « Contrat » (elle le recouvre au petit écran)", 'A', "  if(FEN&&FEN.souple) fermerFenetre(false);\n", "", "compositeur-restes1.js", {'PROFIL':'petit'}),
 M("R2 les infobulles ne se masquent plus sous un menu ouvert (CSS)", 'A', "@media (max-width:760px){ body.menu-ouvert #toasts{visibility:hidden} }", "", "compositeur-restes1.js", {'PROFIL':'iphone'}),
 M("R2b un menu ouvert ne pose plus sa classe", 'A', "if(o.menu) document.body.classList.add('menu-ouvert');", "", "compositeur-restes1.js", {'PROFIL':'iphone'}),
 M("R3a « Délai » garde ses lignes dans le champ", 'A', "V.delai=uneLigne(t);", "V.delai=t.value.replace(/\\s*\\n\\s*/g,' ');", "compositeur-restes1.js", {'PROFIL':'iphone'}),
 M("R3b « Paiement » garde ses lignes dans le champ", 'A', "V.paiement=uneLigne(t);", "V.paiement=t.value.replace(/\\s*\\n\\s*/g,' ');", "compositeur-restes1.js", {'PROFIL':'iphone'}),
 M("R3c le curseur ne reste plus à sa place après un collage", 'A', "try{ t.setSelectionRange(c,c) }catch(e){}", "", "compositeur-restes1.js", {'PROFIL':'iphone'}),
 M("R4 un blanc du modèle ne se met plus entre crochets (résumé de bibliothèque)", 'A', "const v=defVar(k); return v?'['+v.n+']':(k==='entreprise'?'le prestataire':'['+k+']') });", "const v=defVar(k); return v?v.n:(k==='entreprise'?'le prestataire':k) });", "compositeur-restes1.js", {'PROFIL':'iphone'}),
]
filtre = sys.argv[1] if len(sys.argv) > 1 else ''
journal = open(os.path.join(CAP, 'mutations.log'), 'a', encoding='utf-8')
def dire(*a):
    t = ' '.join(str(x) for x in a); print(t, flush=True); journal.write(t + '\n'); journal.flush()
dire('== atelier-mutations ' + time.strftime('%H:%M:%S') + (' filtre=' + filtre if filtre else ''))
mordu = survit = 0; resume = []
for m in MUT:
    if filtre and not re.search(filtre, m['nom']): continue
    cible = os.path.join(COPIE, FICHIERS[m['f']]); src = ORIGINE[m['f']]
    olds = m['old'] if isinstance(m['old'], list) else [m['old']]; news = m['new'] if isinstance(m['new'], list) else [m['new']]
    nn = [src.count(o) for o in olds]
    if any(n != 1 for n in nn): dire('⚠ %s : l\'ancien texte est présent %s fois (attendu 1) — mutation IGNORÉE' % (m['nom'], nn)); resume.append((m['nom'], 'IGNORÉE', '')); continue
    nouveau = src
    for o, w in zip(olds, news): nouveau = nouveau.replace(o, w)
    if nouveau == src: dire('⚠ %s : le fichier ne change pas' % m['nom']); continue
    open(cible, 'w', encoding='utf-8').write(nouveau)
    env = dict(os.environ, RACINE=COPIE, CAP=CAP + '/mut/', ACTUEL=os.path.join(COPIE, FICHIERS['A']), **m['env']); t0 = time.time()      # ACTUEL : la sonde « page seule » lit la page MUTÉE, pas celle du dépôt
    try: r = subprocess.run(['node', os.path.join(ICI, m['sonde'])], env=env, capture_output=True, text=True, timeout=290); sortie, code = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired as e: sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 124
    open(cible, 'w', encoding='utf-8').write(src)      # restauré TOUT DE SUITE (la copie, jamais le dépôt)
    bilan = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie); ko = int(bilan[-1][1]) if bilan else -1
    qui = [l.strip()[:110] for l in sortie.splitlines() if l.strip().startswith('✗')][:2]
    if code in (1, 2, 124) or ko > 0: mordu += 1; etat = 'MORD' + (' (la sonde plante)' if code == 2 else ' (délai)' if code == 124 else ''); 
    else: survit += 1; etat = 'SURVIT'
    dire('%-8s %-68s %-22s %3ds  %s' % (etat, m['nom'], m['sonde'], time.time() - t0, ' | '.join(qui)[:200])); resume.append((m['nom'], etat, m['sonde']))
dire('== %d mordent · %d survivent · sur %d' % (mordu, survit, mordu + survit))
shutil.copy(os.path.join(DEPOT, FICHIERS['P']), os.path.join(COPIE, FICHIERS['P']))      # la copie revient à l'état du dépôt
assert open(os.path.join(DEPOT, FICHIERS['P']), encoding='utf-8').read() == open(os.path.join(COPIE, FICHIERS['P']), encoding='utf-8').read()
subprocess.run(['git', '-C', DEPOT, 'status', '--short', FICHIERS['P'], FICHIERS['A']])      # le dépôt n'a pas bougé : rien ne s'affiche ici
