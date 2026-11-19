#!/usr/bin/env python3
# Recontrôle adverse restes-achats tour 4 : mutations jouées une à une sur apercu/prototype-op-gestion.html (18 novembre 2026).
# Une mutation = un remplacement exact (une seule occurrence), vérifié par git diff, puis les sondes de garde, puis git checkout.
import subprocess, sys, json, re, os
RACINE = '/home/user/wt-soeur'; P = RACINE + '/apercu/prototype-op-gestion.html'; S = RACINE + '/scratchpad/proto-final/campagne/sondes/'
def sh(*a, **k): return subprocess.run(a, cwd=RACINE, capture_output=True, text=True, **k)
CO = ('achats-restes1-coherence', 'mac'); TU = ('achats-restes3-adverse-tuile', 'mac'); R3 = ('achats-restes3', 'mac')
KM = ('achats-restes1-km', 'mac'); KM2 = ('achats-restes2-adverse-km', 'mac'); KM3 = ('achats-restes3-adverse-km', 'mac')
R4 = ('achats-restes4', 'mac'); TA = ('achats-restes3-adverse-tarif', 'mac'); AD = ('achats-restes2-adverse', 'mac'); PN = ('achats-parcours-notes', 'mac')
PU = ('achats-restes1-puce', 'iphone nuit'); PUC = ('achats-restes3-adverse-puces', 'iphone nuit'); R3I = ('achats-restes3', 'iphone nuit')
NEW = ('achats-tour4-recontrole', 'mac'); NEWI = ('achats-tour4-recontrole', 'iphone nuit')
M = [
 ('a1', "filtre « sans facture » de la Comptabilité = sans justificatif", "sansfacture:x.src !== 'ndf' && x.sf", "sansfacture:x.src !== 'ndf' && !x.piece", [CO, TU, R3, NEW]),
 ('a2', "tuile Fournisseurs compte les sans justificatif", "x.src === 'ach' && x.sf).length}</b><span>achats sans facture", "x.src === 'ach' && !x.piece).length}</b><span>achats sans facture", [CO, TU, R3, NEW]),
 ('a3', "définition sf : toute pièce rend la TVA récupérable", "sf:!!a.tva && a.piece !== 'facture'", "sf:!!a.tva && !a.piece", [CO, TU, R3, NEW]),
 ('a4', "cpDed (Comptabilité/TVA) : tout justificatif déduit", "const cpDed = a => !!a.tva && a.piece === 'facture'", "const cpDed = a => !!a.tva && !!a.piece", [CO, TU, R3, NEW]),
 ('b1', "phrase du km : eur() au lieu des centimes entiers", "= ${eur(axKmMontant(k, AX.kmTarif))} · sans ticket", "= ${eur(k * AX.kmTarif)} · sans ticket", [KM2, KM3, KM, NEW]),
 ('b2', "montant enregistré du km : flottant", "m = km ? (k > 0 ? axKmMontant(k, AX.kmTarif) : NaN)", "m = km ? (k > 0 ? k * AX.kmTarif : NaN)", [KM2, KM3, KM, NEW]),
 ('b3', "toast d'envoi du km : axR2 sur km×tarif", "`Note envoyée : ${axN(k)} km, ${eur(n.ttc)}.", "`Note envoyée : ${axN(k)} km, ${eur(axR2(k * AX.kmTarif))}.", [KM2, KM3, NEW]),
 ('c1', "puce : ancien offsetLeft", "rb.left - rr.left + row.scrollLeft,", "b.offsetLeft,", [PU, PUC, R3I, NEWI]),
 ('c2', "puce : garde « déjà visible » inversée", "if (row.scrollLeft + 4 <= gauche && bord <= row.scrollLeft + row.clientWidth - 4) return;", "if (!(row.scrollLeft + 4 <= gauche && bord <= row.scrollLeft + row.clientWidth - 4)) return;", [PU, PUC, R3I, NEWI]),
 ('d1', "phrase « 00,603 » mauvaise", "'Le zéro de tête est en trop : tape '", "'Écris le montant en chiffres : tape '", [R4, TA, NEW]),
 ('d2', "phrase « 1.500 » ancienne", "'Un tarif au kilomètre se tape comme 0,603.'", "'Indique le montant.'", [R4, TA, NEW]),
 ('d3', "« 1 500 » (espace) n'a plus sa phrase", "/^\\d{1,3}([. \\u00a0]\\d{3})+$/.test(txt)", "/^\\d{1,3}([.]\\d{3})+$/.test(txt)", [R4, TA, NEW]),
 ('e1', "« dont N notes » compte l'inverse", "=== 'Note de frais').length)}</span></button></div>", "!== 'Note de frais').length)}</span></button></div>", [R3, TU, CO, NEW]),
 ('e2', "« dont » pluriel à partir de 1", "(n > 1 ? ' notes de frais' : ' note de frais')", "(n > 0 ? ' notes de frais' : ' note de frais')", [R3, TU, NEW]),
 ('e3', "« dont N » compte aussi les notes non « sans facture »", "x.src === 'ach' && x.sf && (ACHATS.find(a => a.id === x.id) || {}).mode === 'Note de frais'", "x.src === 'ach' && (ACHATS.find(a => a.id === x.id) || {}).mode === 'Note de frais'", [R3, TU, CO, NEW]),
 ('f1', "note km : on dit « TVA non récupérable : pas de ticket »", "const tvaTxt = n.km ? 'indemnité kilométrique : ni ticket ni TVA' : n.recu ?", "const tvaTxt = n.recu ?", [AD, PN, KM2, NEW]),
 ('f2', "Comptabilité : une dépense sans TVA compte dans « sans facture »", "const A = ACHATS.filter(a => cpOct(a.d) && a.tva), avec", "const A = ACHATS.filter(a => cpOct(a.d)), avec", [CO, TU, R3, NEW]),
 ('f3', "sf posé aussi pour une dépense sans TVA", "sf:!!a.tva && a.piece !== 'facture'", "sf:a.piece !== 'facture'", [CO, TU, R3, NEW]),
]
choix = sys.argv[1:]
def jouer(sondes):
    res = {}
    for f, args in sondes:
        if not os.path.exists(S + f + '.js'): res[f + ' ' + args] = 'ABSENTE'; continue
        try: r = subprocess.run(['node', S + f + '.js'] + args.split(), cwd=S, capture_output=True, text=True, timeout=240); sortie = r.stdout + r.stderr
        except subprocess.TimeoutExpired: res[f + ' ' + args] = 'DÉLAI'; continue
        m = re.findall(r'(\d+) ✓ · (\d+) ✗', sortie); res[f + ' ' + args] = (int(m[-1][0]), int(m[-1][1])) if m else 'MORTE ' + sortie[-120:].replace('\n', ' ')
        sh('git', 'checkout', '--', 'scratchpad/proto-final')   # les sondes réécrivent des json de balayage
    return res
sortie = {}
if 'base' in choix or not choix:
    sortie['base'] = jouer([CO, TU, R3, KM, KM2, KM3, R4, TA, AD, PN, PU, PUC, R3I, NEW, NEWI]); print('base', sortie['base'], flush=True)
for mid, desc, old, new, sondes in M:
    if choix and mid not in choix: continue
    s = open(P).read(); assert s.count(old) == 1, (mid, s.count(old))
    open(P, 'w').write(s.replace(old, new)); d = sh('git', 'diff', '--numstat', '--', 'apercu/prototype-op-gestion.html').stdout.strip()
    try: r = jouer(sondes)
    finally: sh('git', 'checkout', '--', 'apercu/prototype-op-gestion.html')
    b = sortie.get('base', {}); tombe = [k for k, v in r.items() if not isinstance(v, tuple) or v[1] > (b.get(k, (0, 0))[1] if isinstance(b.get(k), tuple) else 0)]
    sortie[mid] = {'desc': desc, 'diff': d, 'sondes': r, 'tombent': tombe, 'verdict': 'TOMBE' if tombe else 'SURVIT'}; print(mid, sortie[mid]['verdict'], d, tombe, flush=True)
json.dump(sortie, open('/tmp/claude-0/-home-user-teamop/66d907c8-a0df-5f44-8ca4-2108f8a1ade2/scratchpad/m/mut-%s.json' % ('-'.join(choix) or 'tout'), 'w'), ensure_ascii=False, indent=1)
