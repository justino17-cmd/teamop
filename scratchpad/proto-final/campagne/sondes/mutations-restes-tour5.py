# Mutations du tour 5 : chaque défaut remis doit faire tomber la sonde qui le garde. Page restaurée par git checkout après CHAQUE mutation (le correctif est commité avant).
import subprocess, sys
P = 'apercu/prototype-op-gestion.html'
S = 'scratchpad/proto-final/campagne/sondes/'
MUT = [
 ('plafond du prix unitaire retiré', "if (!isNaN(v) && v >= DV_PU_MAX) { toast('Ce prix est trop grand", "if (false && !isNaN(v) && v >= DV_PU_MAX) { toast('Ce prix est trop grand", 'devis-contrats-plafond-tour5.js'),
 ('plafond du total par la quantité retiré', "if (l.pu != null && nq * l.pu > DV_PU_MAX) { t.value = l.q;", "if (false && l.pu != null && nq * l.pu > DV_PU_MAX) { t.value = l.q;", 'devis-contrats-plafond-tour5.js'),
 ('tiret final / plage plus refusés', "\\d\\s+\\d|-|\\d[.,]\\d+[.,]\\d/.test(sans)", "\\d\\s+\\d|\\d[.,]\\d+[.,]\\d/.test(sans)", 'interventions-restes-tour5-frappe.js'),
 ('validation à la sortie du champ retirée', "if (t && t.dataset && t.dataset.releve) releveValider(t); });", "if (false) releveValider(t); });", 'interventions-restes-tour5-frappe.js'),
 ('enregistrement sans validation (Terminer)', "ACTIONS.terminer = function(b){ releveFlush();", "ACTIONS.terminer = function(b){", 'interventions-restes-tour5-frappe.js'),
 ('relevé écrit en direct à la frappe', "if (t.dataset.releve) { const ex = releveExemple(t);", "if (t.dataset.releve) { { const G0 = fiche(t.dataset.id); (G0.releves = G0.releves || {})[t.dataset.releve] = t.value.replace(/[^\\d,.-]/g, ''); } const ex = releveExemple(t);", 'interventions-restes-tour5-frappe.js'),
 ('bulle plus posée au-dessus de la barre', "if (rc && rc.height && rc.top < innerHeight && rc.bottom > 0) t.style.setProperty", "if (false && rc && rc.height && rc.top < innerHeight && rc.bottom > 0) t.style.setProperty", 'interventions-restes-tour5-toast.js'),
]
tombe = 0
for nom, a, b, sonde in MUT:
    s = open(P, encoding='utf-8').read()
    if s.count(a) != 1: print('✗ ancre introuvable ou multiple :', nom, s.count(a)); continue
    open(P, 'w', encoding='utf-8').write(s.replace(a, b))
    d = subprocess.run(['git', 'diff', '--stat', P], capture_output=True, text=True).stdout.strip().splitlines()[-1:]
    try: r = subprocess.run(['node', S + sonde, 'mac'], capture_output=True, text=True, timeout=200); sortie = r.stdout.splitlines()[-1:] ; code = r.returncode
    except subprocess.TimeoutExpired: sortie, code = ['délai'], 9
    subprocess.run(['git', 'checkout', P], check=True)
    ok = subprocess.run(['git', 'diff', '--quiet', P]).returncode == 0
    print(('TOMBE ' if code != 0 else 'NE MORD PAS ') + nom, '|', sortie, '| diff pendant :', d, '| page restaurée :', ok)
    tombe += code != 0
print(tombe, 'sur', len(MUT))
