#!/usr/bin/env python3
# RECONTRÔLE ADVERSE du tour 5 — mutations jouées sur une COPIE de la page (le dépôt n'est jamais touché : `git diff --stat apercu/` reste vide).
# La copie vit dans /tmp/claude-0/mutroot (tout le dépôt en liens, SAUF apercu/prototype-op-gestion.html, copié) ; les sondes la servent par RACINE.
# Usage : python3 mutations-restes-securite-tour5-recontrole.py [indices] — chaque mutation : ancre EXACTEMENT une fois, texte muté présent, sonde lancée sur la copie, copie restaurée.
import subprocess, sys, os, shutil
ROOT = os.getcwd(); MR = '/tmp/claude-0/mutroot'
SRC = ROOT + '/apercu/prototype-op-gestion.html'; CP = MR + '/apercu/prototype-op-gestion.html'
T5 = 'scratchpad/proto-final/sondes/restes-securite-tour5.js'
A = 'scratchpad/proto-final/sondes/restes-securite-tour5-recontrole-a.js'
B = 'scratchpad/proto-final/sondes/restes-securite-tour5-recontrole-b.js'
CO = 'scratchpad/proto-final/sondes/restes-securite-tour5-compta.js'
# (nom, ancre, remplacement, sonde, SECTIONS, attendu : 'tombe' ou 'passe-un-ko-de-moins')
MUTS = [
 ('R1 (du tour 5 : M1b) libelleSur ne normalise plus en NFC', "const libelleSur = (t, n) => coupeSure(String(t == null ? '' : t).normalize('NFC').replace(", "const libelleSur = (t, n) => coupeSure(String(t == null ? '' : t).replace(", T5, 'pdf'),
 ('R2 (M2b) la coupe fine compte des unités UTF-16 et non des signes', "const ins = coupeSure(String(txt), Math.max(place, 0));", "const ins = String(txt).slice(0, Math.max(place, 0));", T5, 'graph'),
 ('R3 (M2e) la moitié de drapeau n’est cherchée qu’à pleine longueur', "if (v.length >= m - 1) v = sansOrphelin(v);", "if (v.length >= m) v = sansOrphelin(v);", T5, 'graph'),
 ('R4 (M3a) une ligne d’invisibles compte de nouveau comme une ligne', ".filter(l => l && !INVISIBLES.test(l));", ".filter(Boolean);", T5, 'invis'),
 ('R5 (M5a) n-titre : le refus avec phrase saute', "{ const pl = refusLong(document.getElementById('n-titre').value, 120, 'Ce qu’il faut faire'); if (pl) {", "{ const pl = refusLong(document.getElementById('n-titre').value, 120, 'Ce qu’il faut faire'); if (false) {", T5, 'dix'),
 ('R6 (M4a) un signe de contrôle redevient « rien »', ".replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]/g, ' ').replace(/[<>\"`\\u202a-\\u202e\\u2066-\\u2069]/g, '')", ".replace(/[\\t\\n\\r\\v\\f\\u2028\\u2029]/g, ' ').replace(/[\\u0000-\\u001f\\u007f-\\u009f<>\"`\\u202a-\\u202e\\u2066-\\u2069]/g, '')", T5, 'ctrl'),
 # --- de mon cru, que le correcteur n'a pas jouées ---
 ('X1 (cru) le curseur ne suit plus l’insertion coupée (setRangeText « select » au lieu de « end »)', "t.setRangeText(ins, a, b, 'end');", "t.setRangeText(ins, a, b, 'select');", A, ''),
 ('X2 (cru) nbSignes compte en unités UTF-16 (le drapeau compte 4)', "const nbSignes = t => graphemes(t).length;", "const nbSignes = t => String(t == null ? '' : t).length;", T5, 'graph'),
 ('X3 (cru) l’écouteur input recoupe aussi les champs SANS maxlength (maxChamp rend 120 partout)', "const maxChamp = e => { const m = e && e.getAttribute && parseInt(e.getAttribute('maxlength'), 10); return m > 0 &&", "const maxChamp = e => { const m = e && e.getAttribute && (parseInt(e.getAttribute('maxlength'), 10) || 120); return m > 0 &&", A, ''),
 ('X4 (cru) pdfOctets : un signe combinant est effacé au lieu d’être composé (NFC → NFD)', "txt = String(txt == null ? '' : txt).normalize('NFC');", "txt = String(txt == null ? '' : txt).normalize('NFD');", B, 'pdf'),
 ('X5 (cru) les contrôles C1 (U+0080-9F) ne sont plus des espaces', ".replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]/g, ' ')", ".replace(/[\\u0000-\\u001f\\u007f\\u2028\\u2029]/g, ' ')", T5, 'ctrl'),
 ('X6 (cru) CORRECTIF PROPOSÉ à N1 : l’écouteur input ne recoupe plus une SUPPRESSION (doit FAIRE PASSER A1)', "document.addEventListener('input', e => { if (!e.isTrusted) return; const t = e.target, m = maxChamp(t); if (!m) return;", "document.addEventListener('input', e => { if (!e.isTrusted) return; if (/^delete/.test(e.inputType || '')) return; const t = e.target, m = maxChamp(t); if (!m) return;", A, '', 'corrige'),
]
sel = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else range(len(MUTS))
orig = open(SRC, encoding='utf-8').read(); res = []
for idx in sel:
    m = MUTS[idx]; nom, a, b, sonde, sections = m[:5]; mode = m[5] if len(m) > 5 else 'tombe'
    shutil.copyfile(SRC, CP); s = orig
    if s.count(a) != 1: print('ANCRE %d fois : %s' % (s.count(a), nom)); res.append((nom, 'ANCRE')); continue
    open(CP, 'w', encoding='utf-8').write(s.replace(a, b))
    chg = open(CP, encoding='utf-8').read() != orig and b in open(CP, encoding='utf-8').read()
    env = dict(os.environ, RACINE=MR, SORTIE='/tmp/claude-0/t5r/mut/')
    if sections: env['SECTIONS'] = sections
    try:
        r = subprocess.run(['node', sonde], capture_output=True, text=True, timeout=500, env=env); out, code = r.stdout, r.returncode
    except subprocess.TimeoutExpired: out, code = '', 99
    ko = [l.strip()[:110] for l in out.splitlines() if l.startswith('  ✗')]
    nok = len([l for l in out.splitlines() if l.startswith('  ✓')])
    if mode == 'corrige': verdict = 'CORRIGE (A1 passe)' if not any(k.startswith('✗ A1') for k in ko) and chg else 'NE CORRIGE PAS'
    else: verdict = 'TOMBE' if chg and len(ko) > (3 if sonde == A else 0) and code != 99 else 'NE TOMBE PAS'
    print('%s · %s · ✓ %d · ✗ %d · %s' % (verdict, nom, nok, len(ko), ' || '.join(ko[:2]))); sys.stdout.flush(); res.append((nom, verdict))
shutil.copyfile(SRC, CP)
d = subprocess.run(['git', 'diff', '--stat', 'apercu/'], capture_output=True, text=True).stdout.strip()
print('== %d jouées ; git diff --stat apercu/ : %s' % (len(res), d or 'VIDE'))
