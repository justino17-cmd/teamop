#!/usr/bin/env python3
# Contre-épreuve de la correction du regard gérant A (18 novembre 2026) : on REMET chaque défaut dans une COPIE de la page (jamais dans le dépôt)
# et on vérifie que la sonde qui le garde tombe (sortie ≠ 0 ET au moins un ✗), après avoir vérifié que la mutation a touché UNE occurrence.
import os, shutil, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.abspath(os.path.join(ICI, '..', '..', '..'))
PAGE = 'apercu/prototype-op-gestion.html'
TMP = os.environ.get('MUT_TMP', '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/mut-correction')
LARG = ('regard-gerant-a-recontrole-largeur.js', ['petit'])
FEN = ('regard-gerant-a-recontrole-fenetres.js', ['petit'])
COR = ('regard-gerant-a-correction.js', [])
M = [
 ('A  la bande « tâches pour toi » : plus de retour à la ligne (le titre nowrap pousse la page à 340 px)', [LARG, FEN],
  ".t-ici{min-width:0}.t-ici summary{flex-wrap:wrap;row-gap:0}", ".t-ici{min-width:0}.t-ici summary{row-gap:0}"),
 ('B  feuille Interventions et factures à 320 px : l\'ancienne grille à quatre colonnes', [COR],
  "@media (max-width:380px){.st-int,.st-int-3{grid-template-columns:minmax(0,1fr) auto;", "@media (max-width:1px){.st-int,.st-int-3{grid-template-columns:minmax(0,1fr) auto;"),
 ('C1 puces : les morceaux gardent leur puce sous 600 px (la puce reste seule en bout de ligne)', [COR],
  "@media (max-width:600px){.pp{display:inline-flex;flex-wrap:wrap;column-gap:14px}.pp>span+span::before{content:none}}", "@media (max-width:1px){.pp{display:inline-flex;flex-wrap:wrap;column-gap:14px}.pp>span+span::before{content:none}}"),
 ('C2 puces : l\'en-tête d\'intervention retrouve son texte joint par « · »', [COR],
  "${pp([jlong(i.d) + ' · ' + i.h + '\\u00a0–\\u00a0' + fin(i.h,i.dur), insec(t.nom)], true)}", "${jlong(i.d)} · ${i.h}\\u00a0–\\u00a0${fin(i.h,i.dur)} · ${insec(t.nom)}"),
 ('C3 puces : la fiche client retrouve son texte joint par « · »', [COR],
  "${pp([c.contact && c.contact !== c.nom ? esc(c.contact) : '', insec(c.tel), esc(c.adr || '')].filter(Boolean))}", "${[c.contact && c.contact !== c.nom ? esc(c.contact) : '', insec(c.tel), esc(c.adr || '')].filter(Boolean).join(' · ')}"),
 ('D  pastille de congés : l\'alerte reste dans la colonne étroite jusqu\'à 380 px seulement', [COR],
  "@media (max-width:430px){.as-t thead th:last-child", "@media (max-width:380px){.as-t thead th:last-child"),
 ('E  case « Absente » sans rembourrage', [COR],
  ".pg-abs{flex:1;padding:0 8px;text-align:center;border-radius:12px;", ".pg-abs{flex:1;border-radius:12px;"),
]
def ferme():
    shutil.rmtree(TMP, ignore_errors=True); os.makedirs(os.path.join(TMP, 'apercu'))
    for n in os.listdir(REPO):
        if n in ('apercu', '.git'): continue
        os.symlink(os.path.join(REPO, n), os.path.join(TMP, n))
    for n in os.listdir(os.path.join(REPO, 'apercu')):
        if n != os.path.basename(PAGE): os.symlink(os.path.join(REPO, 'apercu', n), os.path.join(TMP, 'apercu', n))
ferme(); src = open(os.path.join(REPO, PAGE), encoding='utf-8').read(); bad = 0
sel = sys.argv[1:]
for k, (nom, sondes, avant, apres) in enumerate(M):
    if sel and nom.split()[0] not in sel: continue
    n = src.count(avant)
    if n != 1: print('?? mutation mal visée (%d occurrences) : %s' % (n, nom)); bad += 1; continue
    open(os.path.join(TMP, PAGE), 'w', encoding='utf-8').write(src.replace(avant, apres))
    env = dict(os.environ, RACINE=TMP); tombe = False; det = []
    for (f, args) in sondes:
        try:
            r = subprocess.run(['node', os.path.join(ICI, f)] + args, env=env, capture_output=True, text=True, timeout=400)
            ks = r.stdout.count('  ✗'); det.append('%s : %d ✗ (code %d)' % (f.replace('regard-gerant-a-', ''), ks, r.returncode)); tombe = tombe or (r.returncode == 1 and ks > 0)
        except subprocess.TimeoutExpired: det.append(f + ' : délai')
    print(('TOMBE   ' if tombe else 'NE TOMBE PAS ') + nom + ' — ' + ' ; '.join(det)); bad += 0 if tombe else 1
print('== %d mutation(s) qui ne tombent pas' % bad); sys.exit(1 if bad else 0)
