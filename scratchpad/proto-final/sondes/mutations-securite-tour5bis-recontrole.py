#!/usr/bin/env python3
# MUTATIONS du recontrôle tour 5 bis : chaque mutation est posée sur une COPIE du dossier apercu/ (jamais sur le dépôt), la sonde qui doit tomber lit la copie (RACINE=…).
# usage : python3 mutations-securite-tour5bis-recontrole.py <nom> ...   (sans nom : la liste)  — rend « nom : N ✓ · M ✗ » ; si M == 0, la mutation n'a pas mordu.
import os, re, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SONDES = os.path.join(DEPOT, 'scratchpad', 'proto-final', 'sondes')
PAGE = 'apercu/prototype-op-gestion.html'
OLD_INV = r"/^[­͏؜ᅟᅠ឴឵᠋-᠏​-‏⁠-⁯ㅤ︀-️﻿ﾠ\s]*$/"
M = {
 # nom : (fichier, [(avant, après)], sonde)
 'n5-tk-t': (PAGE, [("const t = nfc(document.getElementById('tk-t').value).trim();", "const t = String(document.getElementById('tk-t').value).trim();")], 'restes-securite-tour5bis-recontrole-b.js'),
 'n5-pa-lib': (PAGE, [("const lib = nfc(document.getElementById('pa-lib').value).trim()", "const lib = String(document.getElementById('pa-lib').value).trim()")], 'restes-securite-tour5bis-recontrole-b.js'),
 'n5-ml-o': (PAGE, [("objet:nfc(document.getElementById('ml-o').value)", "objet:String(document.getElementById('ml-o').value)")], 'restes-securite-tour5bis-recontrole-b.js'),
 'n5-dvn': (PAGE, [("if (o != null) f.objet = nfc(o); }", "if (o != null) f.objet = o; }")], 'restes-securite-tour5bis-recontrole-b.js'),
 'n5-crea': (PAGE, [("CREA[t.dataset.cchamp] = nfc(texteNet(t.value));", "CREA[t.dataset.cchamp] = texteNet(t.value);")], 'restes-securite-tour5bis-recontrole-b.js'),
 'n5-t-nom': (PAGE, [("const v = nfc(document.getElementById('t-nom').value).trim();", "const v = String(document.getElementById('t-nom').value).trim();")], 'restes-securite-tour5bis-recontrole-b.js'),
 'bi-ancienne-liste': (PAGE, [("if (!m || !/^(insertText|insertFromPaste|insertFromDrop)$/.test(e.inputType || '')) return;", "if (!m || !/^insert/.test(e.inputType || '') || e.inputType === 'insertCompositionText' || e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') return;")], 'restes-securite-tour5bis-recontrole-a.js'),
 'bi-composition': (PAGE, [("if (!m || !/^(insertText|insertFromPaste|insertFromDrop)$/.test(e.inputType || '')) return;", "if (!m || !/^insert/.test(e.inputType || '')) return;")], 'restes-securite-tour5bis-recontrole-a.js'),
 'liseré-aria': (PAGE, [("if (c) { c.setAttribute('aria-invalid', 'true'); c.focus();", "if (c) { c.focus();")], 'restes-securite-tour5bis-recontrole-c.js'),
 'liseré-jamais-retiré': (PAGE, [("c.addEventListener('input', () => c.removeAttribute('aria-invalid'), { once:true }); } retu", "} retu")], 'restes-securite-tour5bis-recontrole-c.js'),
 'liseré-focus': (PAGE, [("c.setAttribute('aria-invalid', 'true'); c.focus(); c.addEventListener", "c.setAttribute('aria-invalid', 'true'); c.addEventListener")], 'restes-securite-tour5bis-recontrole-c.js'),
 'n1-garde': (PAGE, [("if (/^delete/.test(e.inputType || '')) return;", "")], 'restes-securite-tour5bis-recontrole-a.js'),
 'n3-ancienne-liste': (PAGE, [("const INVISIBLES = /^[\\p{Default_Ignorable_Code_Point}\\u2800\\ufff9-\\ufffb\\s]*$/u;", "const INVISIBLES = " + OLD_INV + ";")], 'restes-securite-tour5bis-recontrole-n3.js'),
 'n2-soustraction': (PAGE, [("if (nbSignes(av + g.slice(0, mid).join('') + ap) <= m) lo = mid; else hi = mid - 1;", "if (nbSignes(av) + nbSignes(g.slice(0, mid).join('')) + nbSignes(ap) <= m) lo = mid; else hi = mid - 1;")], 'restes-securite-tour5bis-recontrole-a.js'),
 'pdf-nfc': ('apercu/prototype-documents.html', [("for(const ch of String(s).normalize('NFC')){", "for(const ch of String(s)){")], 'restes-securite-tour5bis-recontrole-pdf.js'),
}
if len(sys.argv) < 2:
    print('\n'.join(M)); sys.exit(0)
for nom in sys.argv[1:]:
    fichier, rempl, sonde = M[nom]
    racine = '/tmp/claude-0/r5/mut/' + nom; shutil.rmtree(racine, ignore_errors=True); os.makedirs(racine)
    shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(racine, 'apercu'))
    p = os.path.join(racine, fichier); s = open(p, encoding='utf-8').read()
    for av, ap in rempl:
        n = s.count(av)
        if n != 1: print(nom, ': ANCRE TROUVÉE', n, 'FOIS (attendu 1) :', av[:70]); sys.exit(2)
        s = s.replace(av, ap)
    open(p, 'w', encoding='utf-8').write(s)
    env = dict(os.environ, RACINE=racine, SORTIE='/tmp/claude-0/r5/mut/out-' + nom + '/')
    r = subprocess.run(['node', os.path.join(SONDES, sonde)], capture_output=True, text=True, env=env, timeout=500)
    m = re.findall(r'== (\d+) ✓ · (\d+) ✗', r.stdout)
    tombes = [l.strip()[:150] for l in r.stdout.splitlines() if l.lstrip().startswith('✗')][:6]
    print(nom, ':', (m[-1][0] + ' ✓ · ' + m[-1][1] + ' ✗') if m else 'PAS DE BILAN ' + r.stdout[-200:] + r.stderr[-200:])
    for t in tombes: print('    ', t)
    sys.stdout.flush()
