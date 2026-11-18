#!/usr/bin/env python3
# Restes « clients », tour 2 (18 novembre 2026) — CONTRE-ÉPREUVES de clients-restes-recontrole.js (les corrections du recontrôle adverse) : on remet, sur une COPIE de la page (jamais le fichier du dépôt),
# un défaut que les corrections ont réglé, et la sonde DOIT tomber sur le contrôle qui le garde. Une mutation qui ne fait tomber que des contrôles sans rapport avec elle
# (ou aucun) dit que la sonde ne regarde pas au bon endroit — ou que la mutation a frappé ailleurs : on le relit.
# Usage : python3 mutations-clients-restes2.py [T1 R2 …]   (au premier plan, un navigateur à la fois)
import os, re, shutil, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)); DEPOT = os.path.abspath(os.path.join(D, '..', '..', '..'))
PAGE = os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'); SONDES = os.path.join(D, 'sondes'); TMP = '/tmp/mut-clients-restes2'
# nom : (titre, ancien, nouveau, sonde, profil, motif de la ligne qui doit tomber)
M = {
 'T1':  ('la palette, Ctrl+1 et l’adresse ne demandent plus avant de quitter Infos', "function aller(h){ if (route === 'client' && h !== route", "function aller(h){ if (false && h !== route", 'clients-restes-recontrole.js', 'mac', r'A5 « palette puis  l’historique'),
 'T2':  ('le retour du navigateur ne demande plus avant de quitter Infos', "  if (route === 'client' && h !== ici && cliInfosRetenir(() => aller(h), true))", "  if (false && h !== ici && cliInfosRetenir(() => aller(h), true))", 'clients-restes-recontrole.js', 'mac', r'retour du navigateur'),
 'T3':  ('« Nouvelle facture » propose de nouveau un client archivé', "const C = Object.entries(CLIENTS).filter(([, c]) => !c.archive).sort(", "const C = Object.entries(CLIENTS).sort(", 'clients-restes-recontrole.js', 'mac', r'B1 « Nouvelle facture'),
 'T4':  ('« Nouvelle réserve » propose de nouveau un client archivé', '<datalist id="bxl-clients">${Object.entries(CLIENTS).filter(([, c]) => !c.archive).map(', '<datalist id="bxl-clients">${Object.entries(CLIENTS).map(', 'clients-restes-recontrole.js', 'mac', r'B1 « Nouvelle réserve'),
 'T5':  ('« Modifier l’intervention » propose de nouveau les clients archivés', "Object.entries(CLIENTS).filter(([k, c]) => !c.archive || k === i.cli).map(", "Object.entries(CLIENTS).map(", 'clients-restes-recontrole.js', 'mac', r'B1 « Modifier une intervention'),
 'T6':  ('« +33 06 … » n’est plus ramené à « 06 … »', "/^(?:0033|33)0?(?=\\d{9}$)/, '0'", "/^(?:0033|33)(?=\\d{9}$)/, '0'", 'clients-restes-recontrole.js', 'mac', r'C1 :'),
 'T7':  ('« (+33) 6 … » n’est plus reconnu comme un numéro français', "return /^\\(?\\s*(\\+|00)?[\\d\\s.()-]+$/.test(t) && /^0\\d{9}$/.test(n)", "return /^(\\+|00)?[\\d\\s.()-]+$/.test(t) && /^0\\d{9}$/.test(n)", 'clients-restes-recontrole.js', 'mac', r'C2 :'),
 'T8':  ('deux numéros sont de nouveau rognés à 30 signes', "o.tel = libelleSur(o.tel, 60);", "o.tel = libelleSur(o.tel, 30);", 'clients-restes-recontrole.js', 'mac', r'C7 :'),
 'T9':  ('Ctrl+Z supprime de nouveau un client dont la fiche a été complétée', "if ((s.NVSIG && JSON.stringify(CLIENTS[s.NVCLI]) !== s.NVSIG) || TACHES.some(x => x.lien && x.lien.cli === s.NVCLI)) gardeCli = true;", "if (false) gardeCli = true;", 'clients-restes-recontrole.js', 'mac', r'D1 :'),
 'T10': ('« Archivés » ressort de la vue à 320 et 360 px', ".seg:has([data-dvf]),.seg:has([data-rangc]){flex-wrap:wrap;overflow-x:visible}", ".seg:has([data-dvf]){flex-wrap:wrap;overflow-x:visible}", 'clients-restes-recontrole.js', 'petit', r'B5 :'),
 'T11': ('archiver sans la case passe par l’action appelée à la main', "ACTIONS.clientArchiverOk = function(b){ const k = b.dataset.cli, c = CLIENTS[k]; if (!c || !peut('crm', 's')) return;", "ACTIONS.clientArchiverOk = function(b){ const k = b.dataset.cli, c = CLIENTS[k]; if (!c) return;", 'clients-restes-recontrole.js', 'mac:julie', r'B0 : et l’action'),
 'T13': ('« Abandonner » redemande de nouveau (le choix n’est plus retenu)', "  CLI_PASSE = true; setTimeout(() => { CLI_PASSE = false; }, 1500);\n  if (R.suite) return R.suite();", "  if (R.suite) return R.suite();", 'clients-restes-recontrole.js', 'mac', r'A5 « palette puis  « Abandonner »'),
 'T12': ('la recherche d’un client archivé répond de nouveau « aucun client »', "${nArchTrouves ? `${nArchTrouves === 1", "${false ? `${nArchTrouves === 1", 'clients-restes-recontrole.js', 'mac', r'F1 :'),
}
def jouer(n):
    titre, a, b, sonde, profil, motif = M[n]; profil, _, qui = profil.partition(':'); qui = qui or 'marc'
    if os.path.isdir(TMP): shutil.rmtree(TMP)
    os.makedirs(TMP + '/apercu')
    for f in os.listdir(os.path.join(DEPOT, 'apercu')):
        if f != 'prototype-op-gestion.html': os.symlink(os.path.join(DEPOT, 'apercu', f), os.path.join(TMP, 'apercu', f))
    src = open(PAGE, encoding='utf-8').read()
    if src.count(a) != 1: return n, titre, 'MUTATION NON POSÉE (%d occurrence(s) du motif %r)' % (src.count(a), a[:60])
    open(TMP + '/apercu/prototype-op-gestion.html', 'w', encoding='utf-8').write(src.replace(a, b, 1))
    r = subprocess.run(['node', os.path.join(SONDES, sonde)], env=dict(os.environ, RACINE=TMP, PROFIL=profil, QUI=qui), capture_output=True, text=True, timeout=560)
    L = r.stdout.split('\n'); tombes = [l.strip() for l in L if re.match(r'\s+✗', l)]; cible = [l for l in tombes if re.search(motif, l)]
    bilan = [l for l in L if re.match(r'== ', l)]
    return n, titre, ('TOMBE sur la ligne visée' if cible else ('tombe AILLEURS seulement' if tombes else 'NE TOMBE PAS')) + ' · ' + (bilan[-1] if bilan else '?') + ((' · ' + cible[0][:110]) if cible else '')
if __name__ == '__main__':
    ids = sys.argv[1:] or list(M)
    ok = 0
    for n in ids:
        res = jouer(n); print(' '.join(str(x) for x in res), flush=True)
        if 'TOMBE sur' in res[2]: ok += 1
    shutil.rmtree(TMP, ignore_errors=True)
    print('%d mutation(s) sur %d font tomber la ligne visée' % (ok, len(ids))); sys.exit(0 if ok == len(ids) else 1)
