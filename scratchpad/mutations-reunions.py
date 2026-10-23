#!/usr/bin/env python3
"""Mutations des réunions (test-2884, test-2885) — SUR UNE COPIE du dépôt, jamais sur lui.
La copie : `server/*.js` en vrais fichiers (un fichier lié résoudrait ses `require` vers le dépôt et ignorerait la mutation), les deux bancs en vrais fichiers,
tout le reste de la racine en liens. Chaque mutation remplace UN texte qui doit exister UNE fois (sinon « mal visée ») ; elle doit faire tomber la suite nommée.
Un « survit » est un banc aveugle — ou une mutation neutralisée par une autre garde : vérifier avant de conclure.
Usage : mutations-reunions.py [préfixe de nom …]"""
import os, subprocess, sys, tempfile, shutil
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lire(f): return open(os.path.join(R, f), encoding='utf-8').read()
REU, EQ, AC, CV, IDX = (lire('server/' + f) for f in ('reunions.js', 'agent-equipe.js', 'agent-conversation.js', 'conversations.js', 'index.js'))
F = {'reunions.js': REU, 'agent-equipe.js': EQ, 'agent-conversation.js': AC, 'conversations.js': CV, 'index.js': IDX}
# (nom, fichier, [(avant, après), …], suites)
M = [
 ("M01 heure de Paris = UTC+2 figé", 'reunions.js', [("heure: (+p.hour) % 24,", "heure: (new Date(ts).getUTCHours() + 2) % 24,")], ['2884']),
 ("M02 tsParis : une seule passe (l'écart de l'instant nominal)", 'reunions.js', [("return nominal - decalageParis(premier);", "return premier;")], ['2884']),
 ("M03 rattrapage : la limite devient incluse", 'reunions.js', [("p.heure >= c.heure && p.heure < c.limite", "p.heure >= c.heure && p.heure <= c.limite")], ['2884']),
 ("M04 créneau : l'heure dite n'est plus incluse", 'reunions.js', [("p.heure >= c.heure && p.heure < c.limite", "p.heure > c.heure && p.heure < c.limite")], ['2884']),
 ("M05 jamais deux fois : la clé n'est plus cherchée", 'reunions.js', [("    if (reunions.some(r => r && r.cle === d.cle)) return { saute: 'deja' };\n", "")], ['2884']),
 ("M06 une réunion coupée se rejoue (elle reste « en cours »)", 'reunions.js', [("for (const r of reunions) if (r && r.statut === 'en_cours') r.statut = 'interrompue';", "for (const r of reunions) if (r && r.statut === 'en_cours') r.statut = 'en_cours';")], ['2884']),
 ("M07 état illisible : la vérification de chaque minute continue", 'reunions.js', [("    if (illisible()) return { saute: 'illisible' };\n    if (reunions.some", "    if (reunions.some")], ['2884']),
 ("M08 écriture par-dessus un fichier illisible (route ET écriture)", 'reunions.js', [("    if (illisibles.has(nom)) { console.error('⛔ ' + nom + ' NON réécrit", "    if (false) { console.error('⛔ ' + nom + ' NON réécrit"), ("    if (illisibles.has(F_LECONS)) return res.status(503)", "    if (false) return res.status(503)")], ['2884']),
 ("M09 tous les agents participent, allumés ou non", 'reunions.js', [("const participants = ORDRE.concat(['ines']).filter(x => agents.peutAgir(x).ok);", "const participants = ORDRE.concat(['ines']);")], ['2884']),
 ("M10 aucun agent allumé : plus de ligne", 'reunions.js', [("      dire('Réunion annulée : aucun agent n’est allumé');\n", "")], ['2884']),
 ("M11 la pause ne retient plus la réunion", 'reunions.js', [("    if (agents.enPause()) return { ok: false, raison: 'pause' };\n", "")], ['2884']),
 ("M12 plusieurs réunions en même temps", 'reunions.js', [("    if (enCours) return { ok: false, raison: 'en_cours' };\n    if (illisible()) return { ok: false, raison: 'illisible' };", "    if (illisible()) return { ok: false, raison: 'illisible' };")], ['2884', '2885']),
 ("M13 faits : la fenêtre du lundi est celle de la semaine en cours", 'reunions.js', [("lundiMinuit(R.ts, R.type === 'bilan' ? 0 : 1)", "lundiMinuit(R.ts, 0)")], ['2884']),
 ("M14 faits : les changements de mode comptent comme du travail", 'reunions.js', [("e.action === 'mode' || ", "")], ['2884']),
 ("M15 faits : la réunion se compte elle-même", 'reunions.js', [(" || /^réunion/.test(String(e.action))", "")], ['2884']),
 ("M16 faits : les incidents ne reçoivent plus la fenêtre", 'reunions.js', [("faitsExt.incidents(debut, R.ts)", "faitsExt.incidents(0, 0)")], ['2884']),
 ("M17 objectifs : plus de plafond de trois", 'reunions.js', [("OBJECTIFS_MAX = 3;", "OBJECTIFS_MAX = 4;")], ['2884']),
 ("M18 texte d'agent : adresses et numéros ne sont plus masqués", 'reunions.js', [("const propre = (t, n) => masquer(", "const propre = (t, n) => (")], ['2884', '2885']),
 ("M19 leçons : trois par bilan", 'reunions.js', [("LECONS_PAR_BILAN = 2", "LECONS_PAR_BILAN = 3")], ['2884']),
 ("M20 leçons : vingt et une par agent", 'reunions.js', [("LECONS_MAX = 20", "LECONS_MAX = 21")], ['2884']),
 ("M21 leçons : les plus anciennes d'abord", 'reunions.js', [(".concat(liste).slice(0, LECONS_MAX)", ".concat(liste).reverse().slice(0, LECONS_MAX)")], ['2884']),
 ("M22 leçons : le doublon passe", 'reunions.js', [("      if (liste.some(l => l.texte.toLowerCase() === cle)) return refus('leçon refusée', 'doublon');\n", "")], ['2884']),
 ("M23 bilan : un statut hors liste passe", 'reunions.js', [("      if (!STATUTS_BILAN.includes(str('statut'))) return refus('bilan refusé', 'statut');\n", "")], ['2884']),
 ("M24 outils : tous les outils à toutes les réunions", 'reunions.js', [("return type === 'bilan' ? [bilan, lecon] : [fixer];", "return [fixer, bilan, lecon];")], ['2884', '2885']),
 ("M25 exécution : une leçon se range un lundi", 'reunions.js', [("a.nom === 'ajouter_lecon' && R.type === 'bilan'", "a.nom === 'ajouter_lecon'")], ['2884']),
 ("M26 mémoire : plus dans la messagerie", 'agent-equipe.js', [("      memoire(id);\n  }", "      '';\n  }")], ['2884', '2885']),
 ("M27 mémoire : plus dans la conversation d'avant", 'agent-conversation.js', [("SYSTEM[id] + memoire(id) + await", "SYSTEM[id] + await")], ['2884']),
 ("M28 mémoire : un bloc vide même sans objectif ni leçon", 'reunions.js', [("    if (!liste.length && !lc.length) return '';\n", "")], ['2884']),
 ("M29 fil des réunions : plafond de 20 comme les autres", 'conversations.js', [("PAR_HEURE_FIL_REUNION = 45", "PAR_HEURE_FIL_REUNION = 20")], ['2884']),
 ("M30 réunion : une @mention réveille la messagerie", 'conversations.js', [("if (!reunion && m.mentions.some", "if (m.mentions.some")], ['2884']),
 ("M31 réunion : le texte long vaut dans tous les fils", 'conversations.js', [("const reunion = o.reunion === true && fil === 'reunions';", "const reunion = o.reunion === true;")], ['2884']),
 ("M32 index : plus de minuterie d'une minute", 'index.js', [("      setInterval(ticReunions, 60000).unref();\n", "")], ['2885']),
 ("M33 index : la mémoire n'est pas branchée sur la messagerie", 'index.js', [("agentEquipe = require('./agent-equipe')({ agents: agentsMod, conversations: conversationsMod, cerveau: cerveauMod, faits: faitsAgents,\n        memoire: (id) => reunionsMod ? reunionsMod.memoire(id) : '' });", "agentEquipe = require('./agent-equipe')({ agents: agentsMod, conversations: conversationsMod, cerveau: cerveauMod, faits: faitsAgents });")], ['2885']),
 ("M34 index : les réunions ne sont pas montées", 'index.js', [("reunionsMod = require('./reunions')(app,", "reunionsMod = null; void (app,")], ['2885']),
 ("M35 index : plus de première vérification au démarrage", 'index.js', [("      setTimeout(ticReunions, 5000).unref();\n", "")], ['2885']),
 ("M36 notification : un autre titre", 'reunions.js', [("CRENEAUX[R.type].titre + ' terminée'", "CRENEAUX[R.type].titre + ' finie'")], ['2884']),
 ("M37 absents : plus de ligne", 'reunions.js', [("    if (run.absents.length) dire('N’ont pas pu parler : '", "    if (false) dire('N’ont pas pu parler : '")], ['2884']),
 ("M38 une cause générale ne coupe plus la réunion (tour de table)", 'reunions.js', [("      if (o.cause && o.cause !== 'vide') { if (GLOBALES.includes(o.cause)) return abandon(o.cause); absent(id, o.cause); }\n      else if (o.parle) { run.parles.add(id); citer(id, o.mentions); }\n    }\n\n    /* 3.", "      if (o.cause && o.cause !== 'vide') { absent(id, o.cause); }\n      else if (o.parle) { run.parles.add(id); citer(id, o.mentions); }\n    }\n\n    /* 3.")], ['2884']),
 ("M39 l'heure finie ne coupe plus le tour de table", 'reunions.js', [("      if (finie()) { absent(id, 'temps'); continue; }\n", "")], ['2884']),
 ("M40 l'heure finie ne coupe plus la discussion", 'reunions.js', [("run.queue.length && prises < DISCUSSION_MAX && !finie()", "run.queue.length && prises < DISCUSSION_MAX")], ['2884']),
 ("M41 discussion : douze prises de parole → quatre-vingt-dix-neuf", 'reunions.js', [("DISCUSSION_MAX = 12", "DISCUSSION_MAX = 99")], ['2884']),
 ("M42 discussion : deux tours par agent → neuf", 'reunions.js', [("TOURS_PAR_AGENT = 2", "TOURS_PAR_AGENT = 9")], ['2884']),
 ("M43 discussion : « RAS » est publié", 'reunions.js', [("    if (o.ras && RAS.test(t)) return Object.assign(sortie, { ras: true });\n", "")], ['2884', '2885']),
 ("M44 compte rendu : coupé à 600 comme une parole", 'reunions.js', [("{ max: COMPTE_RENDU_MAX });\n      if (o.parle) R.compteRendu", "{});\n      if (o.parle) R.compteRendu")], ['2884']),
 ("M45 lancer à la main un mardi consomme le créneau du jour", 'reunions.js', [("cle = (p.jourSemaine === c.jour && !reunions.some(r => r && r.cle === duJour)) ? duJour : 'manuelle:' + id;", "cle = !reunions.some(r => r && r.cle === duJour) ? duJour : 'manuelle:' + id;")], ['2884']),
 ("M46 objectifs lancés un samedi : la semaine écoulée", 'reunions.js', [("(type === 'objectifs' && p.jourSemaine >= 6)", "(false)")], ['2884']),
 ("M47 rattrapage : la discussion garde une heure", 'reunions.js', [("RATTRAPAGE_COURT_MS = 20 * 60000", "RATTRAPAGE_COURT_MS = 60 * 60000")], ['2884']),
 ("M48 retrait de leçon : l'identifiant n'est plus contrôlé", 'reunions.js', [("    if (typeof b.id !== 'string' || !ID_LECON.test(b.id)) return res.status(400)", "    if (typeof b.id !== 'string') return res.status(400)")], ['2884']),
 ("M49 Victor ne fixe plus ses objectifs en concluant", 'reunions.js', [(" Enregistre aussi TES objectifs de la semaine (outil fixer_objectifs), sans les détailler dans le compte rendu.", "")], ['2884']),
 ("M50 Inès ne passe plus en dernier", 'reunions.js', [(".concat(R.participants.includes('ines') ? ['ines'] : [])", ".concat([])")], ['2884']),
 ("M51 « X écrit… » n'est plus posé", 'reunions.js', [("    conversations.ecrit(FIL, id, true);\n    try {", "    try {")], ['2884']),
 ("M52 un agent éteint en cours de route parle quand même", 'reunions.js', [("    const p = agents.peutAgir(id);\n    if (!p.ok) return { cause: p.raison };\n    let r;", "    let r;")], ['2884']),
 ("M53 sans clé : la réunion n'est pas annulée d'emblée", 'reunions.js', [("    if (b && (b.illisible || !b.cle)) {", "    if (false) {")], ['2884']),
 ("M54 route : la réunion lancée à la main n'est plus gardée par le patron strict", 'reunions.js', [("app.post('/api/monitor/agents/reunions/lancer', monPatronStrict,", "app.post('/api/monitor/agents/reunions/lancer', monAdmin,")], ['2885']),
 ("M55 MON_GESTES : le lancement n'est plus déclaré", 'index.js', [("'agents/reunions/lancer': 'a lancé une réunion de l’équipe d’agents', ", "")], ['2885']),
 ("M57 semaine ISO : l'année du 1er janvier", 'reunions.js', [("d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);", "d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));")], ['2884']),
 ("M58 lundi 00 h : on recule de 7 × 24 h en millisecondes", 'reunions.js', [("function lundiMinuit(ts, avant) { const p = parisParties(ts), j = jourPlus(p, 1 - p.jourSemaine - 7 * (avant || 0)); return tsParis(j.annee, j.mois, j.jour, 0, 0); }", "function lundiMinuit(ts, avant) { const p = parisParties(ts), j = jourPlus(p, 1 - p.jourSemaine); return tsParis(j.annee, j.mois, j.jour, 0, 0) - 7 * 86400000 * (avant || 0); }")], ['2884']),
]
sel = sys.argv[1:]
def arbre(fichier, avant_apres):
    d = tempfile.mkdtemp(prefix='mut-reu-')
    for e in os.listdir(R):
        if e in ('server', 'tests', '.git'): continue
        os.symlink(os.path.join(R, e), os.path.join(d, e))
    os.makedirs(os.path.join(d, 'server')); os.makedirs(os.path.join(d, 'tests'))
    for e in os.listdir(os.path.join(R, 'server')):
        src = os.path.join(R, 'server', e)
        if e == 'node_modules' or os.path.isdir(src): os.symlink(src, os.path.join(d, 'server', e))
        else: shutil.copy(src, os.path.join(d, 'server', e))
    for t in ('test-2884.js', 'test-2885.js'): shutil.copy(os.path.join(R, 'tests', t), os.path.join(d, 'tests', t))
    s = F[fichier]
    for a, b in avant_apres: s = s.replace(a, b)
    open(os.path.join(d, 'server', fichier), 'w', encoding='utf-8').write(s)
    return d
ok = 0; surv = []
for nom, fichier, paires, suites in M:
    if sel and not any(nom.startswith(x) for x in sel): continue
    mal = [a for a, b in paires if F[fichier].count(a) != 1]
    if mal:
        print('  ?? %s : motif absent ou multiple (%s)' % (nom, mal[0][:60].replace('\n', '⏎'))); surv.append(nom + ' (mal visée)'); continue
    if not suites:
        print('  -- %s : sans suite (documentaire)' % nom); continue
    d = arbre(fichier, paires)
    tombe = []
    for s in suites:
        try:
            r = subprocess.run(['node', os.path.join(d, 'tests', 'test-%s.js' % s)], capture_output=True, text=True, timeout=170)
            sortie = r.stdout + r.stderr
            if r.returncode != 0: tombe.append(s)
        except subprocess.TimeoutExpired: tombe.append(s + ' (délai)')
        if tombe: break
    shutil.rmtree(d, ignore_errors=True)
    if tombe: ok += 1; print('  ✓ %s — tombe : %s' % (nom, ', '.join(tombe)))
    else: surv.append(nom); print('  ✗ %s — SURVIT' % nom)
print('\n%d mutation(s) tombent, %d survivent ou sont mal visées%s' % (ok, len(surv), (' : ' + '; '.join(surv)) if surv else ''))
sys.exit(1 if surv else 0)
