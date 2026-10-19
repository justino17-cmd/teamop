#!/usr/bin/env python3
"""Contre-épreuve de tests/test-2710.js — le socle de l'équipe d'agents (19 octobre 2026).

Règle du dépôt : « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER ». Chaque
mutation REMET un défaut que le banc garde, dans une COPIE de server/ (node_modules en lien) :
l'arbre de travail n'est jamais touché, donc le piège du `git checkout` qui efface un correctif
non commité ne se pose pas. Le témoin (aucune mutation) doit passer ; chaque mutation doit faire
TOMBER le banc (code de sortie ≠ 0, ou au moins un ✗). Une mutation qui ne casse rien dit que le
banc ne regarde pas au bon endroit — ou que le défaut est neutralisé par une autre garde.

Usage : python3 scratchpad/mutations-agents.py        (≈ 3 minutes, 4 copies en parallèle)
"""
import os, re, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AG = 'server/agents.js'
IX = 'server/index.js'

# (nom, fichier, texte exact à remplacer, remplacement)
MUTATIONS = [
    ('M01 arrêt → auto sans passer par brouillon', AG, "if (b.mode === 'auto' && avant === 'arret')", "if (false)"),
    ('M02 `!b.pause` reprend sur un corps vide', AG, "const reprendre = b.pause === false;", "const reprendre = !b.pause;"),
    ('M03 plus aucune forme fermée sur les champs', AG, "if (Array.isArray(regle) ? !regle.includes(v) : !regle.test(v)) return null;", "if (false) return null;"),
    ('M04 un champ en trop passe', AG, "if (cles.length !== Object.keys(schema).length) return null;", ""),
    ('M05 un type non chaîne passe', AG, "if (typeof v !== 'string') return null;", ""),
    ('M06 un fichier illisible est réécrit', AG, "if (illisibles.has(nom)) {", "if (false) {"),
    ('M07 un état illisible laisse agir', AG, "if (illisibles.has(F_ETAT)) return { ok: false, raison: 'etat_illisible' };", ""),
    ('M08 une décision se prend plusieurs fois', AG, "if (v.statut !== 'en_attente') return { code: 409", "if (false) return { code: 409"),
    ('M09 une proposition ne périme jamais', AG, "if (v.statut === 'en_attente' && t - v.ts > VALIDATION_VIE_MS)", "if (false)"),
    ('M10 l\'exécuteur tourne pendant une pause', AG, "if (fn && !enPause()) {", "if (fn) {"),
    ('M11 une adresse en clair dans le journal', AG, "cible: cible.includes('@') ? masque(cible) : monStr(cible, 80),", "cible: monStr(cible, 80),"),
    ('M12 une adresse en clair dans le résumé', AG, "resume: monStr(sansAdr(resume), RESUME_MAX)", "resume: monStr(resume, RESUME_MAX)"),
    ('M13 la file ne se borne plus', AG, "const ATTENTE_PAR_AGENT = 20;", "const ATTENTE_PAR_AGENT = 100000;"),
    ('M14 un compte simple pose la pause', AG, "app.post('/api/monitor/agents/pause', monPatronStrict", "app.post('/api/monitor/agents/pause', monAdmin"),
    ('M15 un compte simple change un mode', AG, "app.post('/api/monitor/agents/mode', monPatronStrict", "app.post('/api/monitor/agents/mode', monAdmin"),
    ('M16 un compte simple décide', AG, "app.post('/api/monitor/agents/validations/decider', monPatronStrict", "app.post('/api/monitor/agents/validations/decider', monAdmin"),
    ('M17 un agent neuf est en brouillon par défaut', AG, "? etat.modes[id] : 'arret';", "? etat.modes[id] : 'brouillon';"),
    ('M18 un agent se donne une tâche à lui-même', AG, "if (!IDS.has(vers) || vers === de)", "if (!IDS.has(vers))"),
    ('M19 une tâche ne périme jamais', AG, "&& t - k.ts > TACHE_VIE_MS", "&& false"),
    ('M20 la pause n\'arrête plus', AG, "if (etat.pause.actif === true) return { ok: false, raison: 'pause' };", ""),
    ('M21 un agent à l\'arrêt agit', AG, "if (m === 'arret') return { ok: false, raison: 'arret' };", ""),
    ('M22 le geste de mode n\'est plus journalisé', IX, "'agents/mode': 'a changé le mode d’un agent', ", ""),
    ('M23 la cible du geste ne dit plus l\'agent', IX, "'t', 'id', 'agent']", "'t', 'id']"),
    ('M24 une route des agents rangée en console commune', IX, "support\\/(box|mails|envoyes)|entreprises)$/;", "support\\/(box|mails|envoyes)|entreprises|agents(\\/.*)?)$/;"),
    ('M25 le socle n\'est plus monté', IX, "agentsMod = require('./agents')(app,", "agentsMod = (() => ({}))(app,"),
]


def copie(dest):
    """Une copie de server/ (node_modules en lien) et du banc, hors de l'arbre de travail."""
    os.makedirs(os.path.join(dest, 'server'))
    os.makedirs(os.path.join(dest, 'tests'))
    for f in os.listdir(os.path.join(RACINE, 'server')):
        s = os.path.join(RACINE, 'server', f)
        if f == 'node_modules':
            os.symlink(s, os.path.join(dest, 'server', f))
        elif os.path.isfile(s):
            shutil.copy2(s, os.path.join(dest, 'server', f))
    shutil.copy2(os.path.join(RACINE, 'tests', 'test-2710.js'), os.path.join(dest, 'tests', 'test-2710.js'))


def joue(nom, fichier, avant, apres):
    dest = tempfile.mkdtemp(prefix='mut-agents-')
    try:
        copie(dest)
        if fichier:
            p = os.path.join(dest, fichier)
            src = open(p, encoding='utf8').read()
            n = src.count(avant)
            if n != 1:
                return nom, 'INVALIDE', 'le motif apparaît %d fois (attendu : 1)' % n
            open(p, 'w', encoding='utf8').write(src.replace(avant, apres))
        r = subprocess.run(['node', os.path.join(dest, 'tests', 'test-2710.js')], capture_output=True, text=True, timeout=240)
        sortie = (r.stdout or '') + (r.stderr or '')
        m = re.findall(r'(\d+) ✓ +(\d+) ✗', sortie)
        total = '%s ✓ %s ✗' % m[-1] if m else 'aucun total'
        tombe = r.returncode != 0 or (m and int(m[-1][1]) > 0)
        return nom, ('TOMBE' if tombe else 'VERT'), total + ' · code ' + str(r.returncode)
    except subprocess.TimeoutExpired:
        return nom, 'TOMBE', 'délai dépassé (le banc ne rend plus la main)'
    finally:
        shutil.rmtree(dest, ignore_errors=True)


def main():
    temoin = joue('TÉMOIN (aucune mutation)', None, '', '')
    print('%-62s %-8s %s' % temoin)
    if temoin[1] != 'VERT':
        print('⛔ le témoin ne passe pas : les mutations ne prouveraient rien')
        sys.exit(2)
    with ThreadPoolExecutor(max_workers=4) as ex:
        res = list(ex.map(lambda m: joue(*m), MUTATIONS))
    mal = []
    for r in res:
        print('%-62s %-8s %s' % r)
        if r[1] != 'TOMBE':
            mal.append(r[0])
    print('\n%d mutations : %d font tomber le banc, %d non' % (len(res), len(res) - len(mal), len(mal)))
    if mal:
        print('⛔ à regarder (le banc ne voit pas, ou une autre garde neutralise) :')
        for n in mal:
            print('   ·', n)
        sys.exit(1)


if __name__ == '__main__':
    main()
