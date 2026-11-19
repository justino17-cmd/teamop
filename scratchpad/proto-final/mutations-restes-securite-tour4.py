#!/usr/bin/env python3
# CONTRE-ÉPREUVE de restes-securite-tour4.js (19 novembre 2026) : on REMET chaque défaut du point (1) « consignes d'accès » et du point (2) « un plafond refuse », un par un,
# et la sonde doit TOMBER (un ✗ nommé). Chaque mutation ne rejoue que la TRANCHE de la sonde qu'elle vise (SECTIONS / FORMES : plus vite, même sonde, mêmes contrôles).
# ⛔ Ordre : correctif commité → mutation → git checkout. On vérifie (a) que l'ancre existe EXACTEMENT une fois, (b) que la page a VRAIMENT changé (git diff non vide),
# (c) que le texte muté est bien dans le fichier, (d) qu'après restauration git diff est VIDE. Au premier plan, depuis la racine du dépôt, un délai par exécution.
import subprocess, sys, os
SONDE = ['node', 'scratchpad/proto-final/sondes/restes-securite-tour4.js']
PG = 'apercu/prototype-op-gestion.html'
# (nom, ancre, remplacement, SECTIONS, FORMES)
MUTS = [
 ('M1 (1) les consignes d’accès repassent par libelleSur : le saut de ligne disparaît, « 4821Sonner » revient',
  "const accesNet = (t, n) => coupeSure(accesLignes(t).slice(0, ACCES_LIGNES).join('\\n'), n || 200);",
  "const accesNet = (t, n) => coupeSure(libelleSur(t, 1e9), n || 200);", 'acces', None),
 ('M2 (1) la limite de 3 lignes saute',
  "const ACCES_LIGNES = 3;", "const ACCES_LIGNES = 9;", 'acces', None),
 ('M3 (1) les blancs ne sont plus réduits par ligne',
  ".split('\\n').map(l => libelleSur(l, 1e9)).filter(Boolean);", ".split('\\n').map(l => l.trim()).filter(Boolean);", 'acces', None),
 ('M4 (1) les lignes vides restent',
  ".map(l => libelleSur(l, 1e9)).filter(Boolean);", ".map(l => libelleSur(l, 1e9));", 'acces', None),
 ('M5 (2) le plafond ne refuse plus jamais (la fonction commune se tait)',
  "if (n > max) return { k, m:'Le champ « ' + nom", "if (n > max + 99999) return { k, m:'Le champ « ' + nom", 'formes', '0,3'),
 ('M6 (2) la fiche client ignore le verdict du plafond',
  "if (pl) return refus(pl.m, pl.k); }", "if (false) return refus(pl.m, pl.k); }", 'formes', '0'),
 ('M7 (2) le devis ignore le verdict du plafond',
  "else if (f.nv && clientPlafondRefus(dvnClientObj(f))) f.err", "else if (false && clientPlafondRefus(dvnClientObj(f))) f.err", 'formes', '1'),
 ('M8 (2) la création d’intervention ignore le verdict du plafond',
  "{ const pl = clientPlafondRefus(cliCrea()); if (pl) {", "{ const pl = clientPlafondRefus(cliCrea()); if (false) {", 'formes', '2'),
 ('M9 (2) « Nouveau client » ignore le verdict du plafond',
  "const pl = clientPlafondRefus(csClientObj(f, nom)); if (pl) f.err = pl.m;", "const pl = clientPlafondRefus(csClientObj(f, nom)); if (false) f.err = pl.m;", 'formes', '3'),
 ('M10 (2) le devis xylophage ignore le verdict du plafond',
  "{ const pl = clientPlafondRefus(dxClientObj()); if (pl) return pl.m; }", "{ const pl = clientPlafondRefus(dxClientObj()); if (false) return pl.m; }", 'formes', '4'),
 ('M11 (2) le plafond compte des unités UTF-16 et non des signes (drapeaux refusés à tort)',
  "const nbSignes = t => graphemes(t).length;", "const nbSignes = t => String(t == null ? '' : t).length;", 'formes', '0'),
 ('M12 (2) la fonction de plafond lit le texte DÉJÀ COUPÉ : coupe silencieuse, plus de refus',
  "function clientPlafondRefus(c){ const o = cliNet(c, true);", "function clientPlafondRefus(c){ const o = cliNet(c);", 'formes', '0,3'),
]
tombent = 0; n = 0; problemes = 0
for nom, a, b, sections, formes in MUTS:
    s = open(PG, encoding='utf-8').read()
    if s.count(a) != 1:
        print('✗ ANCRE INTROUVABLE OU MULTIPLE (%d) : %s' % (s.count(a), nom)); problemes += 1; continue
    open(PG, 'w', encoding='utf-8').write(s.replace(a, b)); n += 1
    d = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout
    touche = b in open(PG, encoding='utf-8').read()
    env = dict(os.environ, SECTIONS=sections)
    if formes: env['FORMES'] = formes
    try:
        r = subprocess.run(SONDE, capture_output=True, text=True, timeout=420, env=env); sortie, code = r.stdout, r.returncode
    except subprocess.TimeoutExpired as e:
        sortie, code = (e.stdout or b'').decode() if isinstance(e.stdout, bytes) else (e.stdout or ''), 99
    subprocess.run(['git', 'checkout', PG], check=True)
    vide = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout.strip() == ''
    ko = [l.strip()[:120] for l in sortie.splitlines() if l.startswith('  ✗')]
    # la sonde sort avec le NOMBRE de ✗ : une sortie 2 sur 2 ✗ nommés est une chute, une sortie 2 sans ✗ nommé (plantage) n'en est pas une
    tombe = bool(d.strip()) and touche and code != 99 and bool(ko) and code == len(ko) and vide
    tombent += 1 if tombe else 0
    print(('TOMBE ' if tombe else 'NE TOMBE PAS ') + nom + ' · code ' + str(code) + ' · diff mutation non vide : ' + str(bool(d.strip())) + ' · texte muté présent : ' + str(touche) + ' · diff vide après restauration : ' + str(vide) + ' · ✗ ' + str(len(ko)) + ' : ' + ' | '.join(ko[:2]))
    sys.stdout.flush()
fin = subprocess.run(['git', 'diff', '--stat', PG], capture_output=True, text=True).stdout.strip()
print('== %d mutations jouées sur %d, %d font tomber la sonde ; git diff final : %s' % (n, len(MUTS), tombent, 'VIDE' if not fin else fin))
sys.exit(0 if tombent == n and n == len(MUTS) and not fin else 1)
