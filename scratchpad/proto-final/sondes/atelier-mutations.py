#!/usr/bin/env python3
"""Mutations de l'atelier dans OP GESTION : sur des COPIES (jamais dans le dépôt), on remet un défaut à la fois puis on lance la sonde qui doit le voir (RACINE=<copie>).
« mord » = la sonde rend au moins un ✗ (exit 1) ou meurt (exit 2) ; « survit » = elle reste verte : la sonde ne regarde pas là, ou une autre garde couvre. Avant chaque mutation on
vérifie que l'ancien texte est UNIQUE dans le fichier (une mutation qui frappe ailleurs ne prouve rien) et que le fichier a bien changé.
Usage : python3 atelier-mutations.py [filtre-sur-le-nom]   — le journal va dans CAP/mutations.log"""
import os, re, shutil, subprocess, sys, time
ICI = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
CAP = os.environ.get('CAP', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap'); COPIE = os.path.join(CAP, 'mut', 'racine')
os.makedirs(os.path.join(COPIE, 'apercu'), exist_ok=True)
FICHIERS = {'P': 'apercu/prototype-op-gestion.html', 'A': 'apercu/prototype-documents.html'}
for f in ['prototype-op-gestion.html', 'prototype-documents.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'opcourrier.js']:
    shutil.copy(os.path.join(DEPOT, 'apercu', f), os.path.join(COPIE, 'apercu', f))
ORIGINE = {k: open(os.path.join(DEPOT, v), encoding='utf-8').read() for k, v in FICHIERS.items()}
def M(nom, f, old, new, sonde, env=None): return dict(nom=nom, f=f, old=old, new=new, sonde=sonde, env=env or {})
R = "atelier-roles.js"; N = "atelier-numeros.js"; T = "atelier-retour.js"; E = "atelier-echecs.js"; D = "atelier-devis.js"; C = "atelier-contrat.js"; G = "atelier-miseenpage.js"; S = "atelier-seule.js"
MUT = [
 M("P1 la liste accepte un état inconnu", 'P', " || typeof etat !== 'string' || !OPD_ETATS.includes(etat)) continue;", " || typeof etat !== 'string') continue;", R),
 M("P2 le prototype n'écoute plus que le cadre → écoute tout le monde", 'P', "if (!f || ev.source !== f.contentWindow || !ev.data", "if (!f || !ev.data", R),
 M("P3 « __proto__ » accepté comme identifiant de client", 'P', "|| id in CLIENTS) return;   // « in »", "|| Object.prototype.hasOwnProperty.call(CLIENTS, id)) return;   // « in »", R),
 M("P4 le client d'une ligne composée n'est plus échappé", 'P', "<b>${esc(x.client || 'Sans client')}</b>", "<b>${x.client || 'Sans client'}</b>", R),
 M("P5 dvNum ne compte plus les devis composés", 'P', ", ...opdNums('devis', 'D-2026-')) + 1)", ") + 1)", N),
 M("P6 le numéro de « Contrat rapide » ne compte plus les composés", 'P', "Math.max(opdContratMax(), ...opdNums('contrat', 'CTR-2026-'))", "opdContratMax()", N),
 M("P7 chiffre 2 de Devis : les composés ne comptent plus", 'P', "eur(somme(tab.attente) + atS(AT.attente))", "eur(somme(tab.attente))", D),
 M("P8 ouvrir l'atelier ne pousse plus d'entrée d'historique", 'P', "try { history.pushState({ opdz:1 }, '', location.href); OPDZ.push = true; } catch (e) { OPDZ.push = false; }", "OPDZ.push = false;", T),
 M("P9 fermer par bouton ne consomme plus l'entrée poussée", 'P', "OPDZ.ignore++; try { history.back(); } catch (e) { OPDZ.ignore--; }", "", T),
 M("P10 le cadre masqué passe en display:none (largeur 0)", 'P', "#opdz[hidden]{display:flex;visibility:hidden;pointer-events:none}", "#opdz[hidden]{display:none}", E),
 M("P11 le délai d'attente de l'atelier passe de 8 s à 80 s", 'P', "else { opdAttente(false); clearTimeout(OPDZ.tAtt); OPDZ.tAtt = setTimeout(() => { if (opdOuvert() && !OPDZ.pret) opdAttente(true); }, 8000); }", "else { opdAttente(false); clearTimeout(OPDZ.tAtt); OPDZ.tAtt = setTimeout(() => { if (opdOuvert() && !OPDZ.pret) opdAttente(true); }, 80000); }", E),
 M("P12 l'ouverture ne vérifie plus le rôle", 'P', "if (!rlPermis(droit)) return toast(", "if (false) return toast(", R),
 M("P13 un second « prêt » ne ferme plus la fenêtre", 'P', "if (deuxieme) { opdFermer('fin'); return; }", "", E),
 M("P14 le prototype ne renvoie plus ses données à l'atelier après un rendu", 'P', "const v = r0.apply(this, arguments); try { opdSync(); } catch (e) {} return v; }; })();", "const v = r0.apply(this, arguments); return v; }; })();", N),
 M("P15 l'encoche du haut n'est plus réservée", 'P', "padding-top:env(safe-area-inset-top,0px)}\n#opdz[hidden]", "}\n#opdz[hidden]", G, {"PROFIL": "iphone", "NUIT": "0"}),
 M("P16 le lien mailto: n'est plus échappé", 'P', "const lienMail = m => 'mailto:' + esc(String(m == null ? '' : m).trim());", "const lienMail = m => 'mailto:' + String(m == null ? '' : m).trim();", R),
 M("P17 le contact garde sa fonction (« Mme Bernard, directrice »)", 'P', "if (personne && nomC.trim() && nomC.trim() !== c.nom) o.contact = nomC.trim(); return o; });", "if (personne && nomC.trim() && nomC.trim() !== c.nom) o.contact = lig(c.contact); return o; });", D),
 M("P18 les prix du catalogue perdent leurs centimes", 'P', "puC:Math.round(Number(x.pv) * 100)", "puC:Math.round(Number(x.pv)) * 100", D),
 M("A1 l'atelier écoute tout message, plus seulement son hôte", 'A', "if(!HOTE||e.source!==HOTE) return; const d=e.data;", "if(!HOTE) return; const d=e.data;", R),
 M("A2 le catalogue reçu n'est plus borné (prix négatif, décimal, énorme)", 'A', "||!Number.isInteger(puC)||puC<0||puC>1e9||!Number.isInteger(tva)||tva<0||tva>10000) continue; refs.add(ref);", ") continue; refs.add(ref);", R),
 M("A3 les clés de rangement ne sont plus à part (opg)", 'A', "const PFX='documents-sur-mesure-'+(APP?'opg-':'');", "const PFX='documents-sur-mesure-';", E),
 M("A4 les numéros n'suivent plus la série d'OP GESTION", 'A', "if(APP){      // la série d'OP GESTION", "if(false){      // la série d'OP GESTION", D),
 M("A5 l'atelier ne demande plus sa fermeture", 'A', "function opdPlanifierFin(){ if(!OPG.ouvert) return;", "function opdPlanifierFin(){ return;", T),
 M("A6 le rangement n'adopte plus les documents d'un autre onglet", 'A', "if(APP){ try{ adopterAutres(JSON.parse(localStorage.getItem(CLE_STOCK)||'null'),false) }catch(e){} }", "", E),
 M("A7 l'entreprise d'exemple (forme, capital, RCS…) reste", 'A', "if(APP) identVideApp();", "", D),
 M("A8 le rôle n'est plus lu strictement (vrai ou faux)", 'A', "devis:own(r,'devis')===true,contrats:own(r,'contrats')===true", "devis:!!own(r,'devis'),contrats:!!own(r,'contrats')", R),
 M("A9 le client choisi d'avance est posé APRÈS l'état de départ (il compte comme « avoir commencé »)", 'A', ["  if(typeof clientId==='string'&&S.clients.some(c=>c.id===clientId)) V.clientId=clientId;      // choisi d'avance (fiche client d'OP GESTION) : compris dans l'état de départ, donc fermer ne demande rien\n", "  V.sig0=vvSig(V);\n  return V;"], ["", "  V.sig0=vvSig(V); if(typeof clientId==='string'&&S.clients.some(c=>c.id===clientId)) V.clientId=clientId;\n  return V;"], C),
 M("A10 « Non enregistré » n'est plus dit au prototype", 'A', "if(S.stockage===false&&OPG.sauves[d.id]!==d.maj) r.nr=1;", "", E),
 M("A11 l'accueil de l'atelier réapparaît dans OP GESTION", 'A', "html[data-app] #vue-accueil{display:none!important}", "html[data-app] #vue-accueil{display:block}", D),
 M("A12 le nom du document repasse à 15 px au doigt (iPad)", 'A', "html[data-app] .nom-doc{font-size:16px}", "html[data-app] .nom-doc{font-size:15px}", G, {"PROFIL": "ipad", "NUIT": "0"}),
 M("A13 la liste n'est plus envoyée au prototype après un rangement", 'A', "{ const f0=sauverStock; sauverStock=function(){ const v=f0.apply(this,arguments); opdDocsEnvoyer(); return v } }", "", D),
 M("A14 le thème de départ n'est plus lu dans l'adresse du cadre", 'A', "if(APP){ const m=new URLSearchParams(location.search).get('mode'); appliquerModeApp(m); }", "if(APP){ }", D),
 M("A17 l'entreprise d'OP GESTION redevient modifiable dans l'atelier", 'A', "if(APP&&!nouveau&&id===DEFAUT_ID){      // l'entreprise appartient à OP GESTION", "if(false&&!nouveau&&id===DEFAUT_ID){      // l'entreprise appartient à OP GESTION", D),
 M("P19 les raccourcis du prototype partent pendant que l'atelier est ouvert", 'P', "if (!z.contains(ev.target)) ev.stopImmediatePropagation();", "", E),
 M("P20 le mode jour/nuit n'est plus transmis à l'atelier en direct", 'P', "(() => { const m0 = cxEnLigneMode; cxEnLigneMode = function(){ m0(); opdEnvoyer(opdModeMsg()); }; })();", "", D),
 M("P21 z-index de l'atelier repasse sous la Comptabilité", 'P', "#opdz{position:fixed;inset:0;z-index:9100;", "#opdz{position:fixed;inset:0;z-index:8900;", D),
 M("A18 « __proto__ » accepté comme identifiant de client ou référence d'article dans l'atelier", 'A', ["||RE_PROTO.test(id)||vus.has(id)", "if(!ref||!des||RE_PROTO.test(ref)||refs.has(ref)"], ["||vus.has(id)", "if(!ref||!des||refs.has(ref)"], R),
 M("A15 la page SEULE devient « dans OP GESTION »", 'A', "const APP=/[?&]app=1\\b/.test(location.search);", "const APP=true;", S, {"SEULE_UNE": "1"}),
 M("A16 la page SEULE range sous les clés opg", 'A', "const PFX='documents-sur-mesure-'+(APP?'opg-':'');", "const PFX='documents-sur-mesure-opg-';", S, {"SEULE_UNE": "1"}),
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
