#!/usr/bin/env python3
# Mutations de la séparation Perso / Pro de l'agenda d'OP MESSAGES (8 octobre 2026, « il faudrait bien séparer l'agenda perso
# et pro ») : chaque défaut est REMIS dans l'arbre de travail, le banc ou la sonde qui le garde est lancé, puis tout est
# restauré par `git checkout`.
#   python3 scratchpad/mutations-agenda-cote.py "$PWD"            toutes (S01–S14 : le service ; P01–P12 : la page, contre
#                                                                  tests/sonde-opmessages-agenda-cote.js — il faut Chromium)
#   python3 scratchpad/mutations-agenda-cote.py "$PWD" S03 P09     seulement celles-là
# ⛔ L'ARBRE DOIT ÊTRE PROPRE (tout commité) : `git checkout` restaure depuis HEAD et emporterait un correctif non commité
# (CLAUDE.md). Le script refuse de partir sur un arbre sale, et vérifie à la fin que rien n'est resté muté.
# Mesuré le 8 octobre 2026 : 20 sur 20 tombent (et les 13 mutations G01–G13 de la page vivent dans tests/mutations-opmessages.js).
import subprocess, sys, os
ARBRE = sys.argv[1]
os.chdir(ARBRE)
def run(cmd, t=900):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=t)
        return r.returncode, r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return 124, 'DÉLAI'
SERVICE = [
 ('S01', 'server-msg/stockage.js', "if (type === 'canal') return 'pro';", "if (type === 'canal' || type === 'reunion') return 'pro';", 'tests/test-929.js'),
 ('S02', 'server-msg/stockage.js', "if ((cote === 'perso' || cote === 'pro') && COTES_AGENDA) Q('UPDATE evenement SET cote = ? WHERE id = ?').run(cote, id);", "", 'tests/test-998.js'),
 ('S03', 'server-msg/stockage.js', "if (cote !== undefined && COTES_AGENDA) Q('UPDATE evenement SET cote", "if (COTES_AGENDA) Q('UPDATE evenement SET cote", 'tests/test-998.js'),
 ('S04', 'server-msg/routes-agenda.js', "if (b.cote !== null && b.cote !== 'perso' && b.cote !== 'pro') return { erreur: 'champ_invalide' };", "", 'tests/test-998.js'),
 ('S05', 'server-msg/stockage.js', "if ((cote === 'perso' || cote === 'pro') && COTES) Q('UPDATE membre SET cote = ? WHERE conv = ? AND uid = ?').run(cote, conv, hote);", "", 'tests/test-929.js'),
 ('S06', 'server-msg/stockage.js', "      rang.cote = coteDe(uid, r.conv, 'reunion');", "", 'tests/test-929.js'),
 ('S07', 'server-msg/stockage.js', "    rang.cote = coteDe(uid, r.conv, 'reunion');\n    return { reunion: rang", "    return { reunion: rang", 'tests/test-929.js'),
 ('S08', 'server-msg/routes.js', " && req.conv.conv.type !== 'reunion') return refus(res, 400, 'champ_invalide');", ") return refus(res, 400, 'champ_invalide');", 'tests/test-929.js'),
 ('S09', 'server-msg/compte.js', "rappel_minutes_avant: e.rappel, cote: e.cote }", "rappel_minutes_avant: e.rappel }", 'tests/test-998.js'),
 ('S10', 'server-msg/public/source-serveur.js', "'salle_attente', 'ordre_du_jour', 'cote'];", "'salle_attente', 'ordre_du_jour'];", 'tests/test-976.js'),
 ('S11', 'server-msg/public/source-serveur.js', "      cote: x.cote === 'perso' || x.cote === 'pro' ? x.cote : null });", "      cote: null });", 'tests/test-976.js'),
 ('S12', 'server-msg/routes-reunions.js', "if (b.cote !== undefined && b.cote !== null && b.cote !== 'perso' && b.cote !== 'pro') return refus(res, 400, 'champ_invalide');", "", 'tests/test-929.js'),
 ('S13', 'server-msg/stockage.js', "const choisi = COTES ? (Q('SELECT cote FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL').get(conv, uid) || {}).cote : null;", "const choisi = null;", 'tests/test-929.js'),
 ('S14', 'server-msg/public/source-serveur.js', "        cote: r.cote === 'perso' || r.cote === 'pro' ? r.cote : null };", "        cote: null };", 'tests/test-976.js'),
]
PAGE = [
 ('P01', "for (const r of reu.liste) if (duCote(coteReu(r)))", "for (const r of reu.liste) if (true)"),
 ('P06', "if (cote) champs.cote = cote;", ""),
 ('P09', "const coteReu = r => { const c = r && etat.conversations.find(x => x.id === r.conv); return c ? coteDe(c) :", "const coteReu = r => { const c = null; return c ? coteDe(c) :"),
 ('P10', "    if ($('vue-reunions') && $('vue-reunions').dataset.pret && reu.charge) rendreReunions();      // l'Agenda ne montre que le côté où l'on est\n", ""),
 ('P11', "    if (sigCotesReunions() !== cotesAvant) {", "    if (false) {"),
 ('P12', "await source.rangerCote(d.conv, v === 'auto' ? null : v);", ""),
]
quoi = sys.argv[2:] or [m[0] for m in SERVICE] + [m[0] for m in PAGE]
assert run('git diff --quiet && git diff --cached --quiet')[0] == 0, 'arbre sale : commiter avant de muter'
resultats = []
for (i, f, a, b, banc) in SERVICE:
    if i not in quoi: continue
    s = open(f, encoding='utf-8').read()
    if s.count(a) != 1: resultats.append((i, 'MAL VISÉE (%d)' % s.count(a))); continue
    open(f, 'w', encoding='utf-8').write(s.replace(a, b))
    code, out = run('node ' + banc, 600)
    run('git checkout -- ' + f)
    ko = [l for l in out.splitlines() if l.strip().startswith('✗')]
    resultats.append((i, ('MORD : ' + str(len(ko)) + ' ✗ — ' + (ko[0].strip()[:110] if ko else 'code %d' % code)) if code != 0 else 'NE MORD PAS'))
    print(resultats[-1], flush=True)
for (i, a, b) in PAGE:
    if i not in quoi: continue
    f = 'apercu/opmessages/index.html'
    s = open(f, encoding='utf-8').read()
    if s.count(a) != 1: resultats.append((i, 'MAL VISÉE (%d)' % s.count(a))); continue
    open(f, 'w', encoding='utf-8').write(s.replace(a, b))
    g = run('node scripts/opmsg-public.js', 120)
    code, out = run('node tests/sonde-opmessages-agenda-cote.js', 900)
    run('git checkout -- apercu/opmessages/index.html server-msg/public')
    ko = [l for l in out.splitlines() if l.strip().startswith('✗')]
    resultats.append((i, ('MORD : ' + str(len(ko)) + ' ✗ — ' + (ko[0].strip()[:110] if ko else 'code %d' % code)) if code != 0 else 'NE MORD PAS'))
    print(resultats[-1], flush=True)
assert run('git diff --quiet')[0] == 0, 'RESTAURATION RATÉE'
print('—— bilan :', sum(1 for r in resultats if r[1].startswith('MORD')), 'sur', len(resultats))
