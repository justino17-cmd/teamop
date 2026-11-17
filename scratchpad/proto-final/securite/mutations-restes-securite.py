#!/usr/bin/env python3
# CONTRE-ÉPREUVE de restes-garde.js (restes de la sécurité, tour 1, 17 novembre 2026) : on REMET chaque défaut, un par un, et la garde doit TOMBER (un ✗ nommé).
# ⛔ Ordre : correctif commité → mutation → git checkout (le correctif est dans HEAD : rien ne se perd). Vérifie après chaque mutation que la page a VRAIMENT changé (git diff non vide).
# Lancer au premier plan, depuis la racine du dépôt : python3 scratchpad/proto-final/securite/mutations-restes-securite.py
import subprocess, sys, re
GARDE = ['node', 'scratchpad/proto-final/securite/restes-garde.js']
PG, PC = 'apercu/prototype-op-gestion.html', 'apercu/prototype-comptabilite.html'
MUTS = [
 ('M1 cliNet ne nettoie plus le nom', PG, "const nomClientNet = (t, n) => libelleSur(t, n || 80);", "const nomClientNet = (t, n) => String(t == null ? '' : t);"),
 ('M2 mlLire jette sans champ mail', PG, "const mail = String((m.de && m.de.mail) || '').toLowerCase(),", "const mail = m.de.mail.toLowerCase(),"),
 ('M3 un fournisseur se voit rattacher la commande d\'un autre', PG, "COMMANDES.find(c => c.num === bc && c.four === f.nom)", "COMMANDES.find(c => c.num === bc)"),
 ('M4 FEC d\'OP GESTION : plus de neutralisation', PG, "const fecTexteSur = v => /^[\\s\\u0000-\\u001f]*[=+\\-@]/.test(v) ? \"'\" + v : v;", "const fecTexteSur = v => v;"),   # (la variante « première lettre seule » est équivalente : net() rogne avant)
 ('M5 FEC de la Comptabilité : plus de neutralisation', PC, "const fecTexteSur = v => /^[\\s\\u0000-\\u001f]*[=+\\-@]/.test(v) ? \"'\" + v : v;", "const fecTexteSur = v => v;"),
 ('M6 lienSur laisse passer tout schéma', PG, "return /^(https?:\\/\\/|mailto:|tel:)/i.test(x) ||", "return true ||"),
 ('M7 le filet de toast est éteint', PG, "const sp = document.createElement('span'); sp.appendChild(toastSur(msg)); t.replaceChildren(sp);", "t.innerHTML = `<span>${msg}</span>`;"),
 ('M8 uniteSure refuse « pièce(s) » (ancienne règle)', PG, "return x.length >= 1 && x.length <= 20 && !/[<>\"`\\u0000-\\u001f\\u007f\\u202a-\\u202e\\u2066-\\u2069]/.test(x) ? x : ''; };", "return /^[\\p{L}\\p{M}\\p{N}\\/².³°µ%. -]{1,12}$/u.test(x) ? x : ''; };"),
 ('M9 l\'expéditeur piégé entre brut : ni mlDeNet à l\'entrée, ni cliNet ni mailNom à la création', PG, "const mlM = (id, d, h, de, objet, txt, x = {}) => ({ id, d, h, de:mlDeNet(de), objet,", "const mlM = (id, d, h, de, objet, txt, x = {}) => ({ id, d, h, de, objet,", "const mlDeNet = de => {", "const mlDeNet = de => { return de; ", "CLIENTS[c] = cliNet({ nom:mailNom(m), type:'part', contact:mailNom(m),", "CLIENTS[c] = ({ nom:m.de.nom, type:'part', contact:m.de.nom,"),
 ('M10 un rel=\"noopener\" seul revient', PG, "rel=\"noopener noreferrer\" aria-label=\"Voir ${esc(l)}\"", "rel=\"noopener\" aria-label=\"Voir ${esc(l)}\""),
]
tombent = 0
SEULES = sys.argv[1:]
for mut in MUTS:
    nom, f, paires = mut[0], mut[1], mut[2:]
    if SEULES and not any(nom.startswith(x + ' ') for x in SEULES): continue
    s = open(f, encoding='utf-8').read(); ok = True
    for a, b in zip(paires[0::2], paires[1::2]):
        if s.count(a) != 1: ok = False; print('✗ MUTATION NON APPLICABLE (ancre introuvable ou multiple :', s.count(a), ')', nom, a[:50]); break
        s = s.replace(a, b)
    if not ok: continue
    open(f, 'w', encoding='utf-8').write(s)
    d = subprocess.run(['git', 'diff', '--stat', f], capture_output=True, text=True).stdout
    try:
        r = subprocess.run(GARDE, capture_output=True, text=True, timeout=240)
        sortie = r.stdout; code = r.returncode
    except subprocess.TimeoutExpired:
        sortie = ''; code = 99
    subprocess.run(['git', 'checkout', f], check=True)
    m = re.findall(r'== (\d+) ✓ · (\d+) ✗', sortie)
    ko = [l.strip()[:110] for l in sortie.splitlines() if l.startswith(' ✗')]
    tombe = bool(d.strip()) and code != 0
    tombent += tombe
    print(('TOMBE ' if tombe else 'NE MORD PAS ') + nom, '| page changée :', bool(d.strip()), '|', m[-1] if m else code, '|', ' / '.join(ko[:2]))
print(tombent, 'mutations jouées font tomber la garde')
