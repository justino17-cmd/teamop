#!/usr/bin/env python3
# Mutations des sondes « compta-reste » : on remet un défaut dans une COPIE de la page (jamais dans le dépôt), on rejoue la sonde qui doit le voir, et elle doit TOMBER.
# usage : python3 compta-reste-mutations.py [M1 M2 …]      (RACINE pointe la copie : lib.js la sert à la place du dépôt)
import os, re, shutil, subprocess, sys
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
COPIE = '/tmp/mut-compta-reste'
PAGE = 'apercu/prototype-op-gestion.html'
SONDES = os.path.join(DEPOT, 'scratchpad/proto-final/campagne/sondes')
MUT = {
 'M1': ('parcours-b', "o.paye = cxDm(AUJ); o.mode = m;", "o.mode = m;", 'payer un fournisseur ne marque plus la facture payée'),
 'M2': ('parcours-c', "ACHATS.push(A); n.etat = 'validee'; if (sans)", "n.etat = 'validee'; if (sans)", 'valider une note de frais ne crée plus la dépense'),
 'M3': ('parcours-d', "if (a === 'frais') { CP.frais[x] = '627'; rendre();", "if (a === 'frais') { rendre();", '« Ce sont des frais bancaires » n’explique plus la ligne'),
 'M4': ('parcours-f', "const netPaye = cpRp(netAvant - pas + paniersOk);", "const netPaye = cpRp(netAvant + pas + paniersOk);", 'le net payé ajoute l’impôt au lieu de le retirer'),
 'M5': ('parcours-a', "const cxNum = v => parseFloat(String(v || '').replace(/\\s/g, '').replace(',', '.'));", "const cxNum = v => parseFloat(String(v || '').replace(/\\s/g, '').replace(',', ''));", 'la virgule décimale d’une dépense est perdue'),
 'M6': ('parcours-g', "apres:() => { CP.envoye = '31/10'; cpSceller(); toast('Octobre envoyé'); }", "apres:() => { toast('Octobre envoyé'); }", 'l’envoi à l’expert-comptable ne fige plus octobre'),
 'M7': ('parcours-a', "if (!(ht > 0)) return toast('Indique le montant HT.');", "", 'un montant négatif ou nul est accepté'),
}
choix = sys.argv[1:] or list(MUT)
if os.path.exists(COPIE): shutil.rmtree(COPIE)
shutil.copytree(os.path.join(DEPOT, 'apercu'), os.path.join(COPIE, 'apercu'))
for d in ('icons', 'vitrine', 'sons'):
    if os.path.isdir(os.path.join(DEPOT, d)): os.symlink(os.path.join(DEPOT, d), os.path.join(COPIE, d))
src = open(os.path.join(COPIE, PAGE), encoding='utf-8').read(); tombe = 0
for k in choix:
    sonde, ancien, neuf, nom = MUT[k]
    n = src.count(ancien)
    if n != 1: print(f'{k} : ANCRE INTROUVABLE ou multiple ({n}) — mutation non jouée : {nom}'); continue
    open(os.path.join(COPIE, PAGE), 'w', encoding='utf-8').write(src.replace(ancien, neuf, 1))
    r = subprocess.run(['node', os.path.join(SONDES, f'compta-reste-{sonde}.js'), 'mac'], env=dict(os.environ, RACINE=COPIE), capture_output=True, text=True, timeout=420)
    m = re.findall(r'(\d+) ✓ · (\d+) ✗', r.stdout); bilan = m[-1] if m else ('?', '?')
    mord = r.returncode != 0 and bilan[1] not in ('0', '?')
    tombe += mord; print(f'{k} : {"MORD" if mord else "NE MORD PAS"} · {sonde} → {bilan[0]} ✓ · {bilan[1]} ✗ (code {r.returncode}) · {nom}')
open(os.path.join(COPIE, PAGE), 'w', encoding='utf-8').write(src)
print(f'== {tombe} mutations sur {len(choix)} attrapées')
