#!/usr/bin/env python3
# Contre-épreuve des restes du technicien (tour 1) : on remet chaque défaut dans une COPIE de la page (jamais dans le dépôt : un `git checkout` effacerait aussi les correctifs
# non commités) et on exige que la sonde qui le garde tombe. Chaque jeu de mutations pose une copie servie par lib.js (RACINE) faite de liens vers le dépôt, sauf la page mutée.
# Usage : python3 mutations-restes-technicien-1.py <jeu> <dossier-de-sortie>    jeu = journee | formulaires | camion
import os, sys, shutil
DEPOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
JEUX = {
 'journee': [  # restes-technicien-1.js
  ("M1 la page n'est plus réordonnée", "  if (!jour) return h;\n  const camion = K.find(", "  if (!jour || true) return h;\n  const camion = K.find("),
  ("M2 le rappel du matin revient sur les autres écrans", "((o.d === AUJ && ptJour(k, AUJ).length) || ailleurs)", "((o.d === AUJ && ptJour(k, AUJ).length))"),
 ],
 'formulaires': [  # restes-technicien-2.js
  ("M3 le liseré d'un refus redevient vert", ".a-avis:has(.a-dec-i.non){box-shadow:inset 3px 0 0 var(--rouge)}", ""),
  ("M4 « C'est quoi ? » repart pré-rempli", '<option value="" selected disabled>Choisis dans la liste…</option>', ''),
  ("M5 les vides de « Il manque » reviennent", '.panneau .mq-i,.panneau .mq-s{margin:0}.panneau .mq-l{margin:0;padding:0 0 0 22px;display:flex;flex-direction:column;gap:6px}', ''),
  ("M6 « Nouveautés » retombe à 40 px", "@media (pointer:coarse){.nv-menu{min-height:44px}}", ""),
 ],
 'camion': [  # technicien-parcours-prevenir-bureau.js (K1c)
  ("M7 le bouton grisé ne dit plus pourquoi", "if (pb && !s) { s = document.createElement('span');", "if (false && !s) { s = document.createElement('span');"),
 ],
}
jeu, sortie = sys.argv[1], sys.argv[2]
page = open(os.path.join(DEPOT, 'apercu', 'prototype-op-gestion.html'), encoding='utf-8').read()
for nom, a, b in JEUX[jeu]:
    assert page.count(a) == 1, (nom, page.count(a))
    page = page.replace(a, b)
shutil.rmtree(sortie, ignore_errors=True); os.makedirs(os.path.join(sortie, 'apercu'))
for e in os.listdir(DEPOT):
    if e not in ('apercu', '.git'): os.symlink(os.path.join(DEPOT, e), os.path.join(sortie, e))
for e in os.listdir(os.path.join(DEPOT, 'apercu')):
    if e != 'prototype-op-gestion.html': os.symlink(os.path.join(DEPOT, 'apercu', e), os.path.join(sortie, 'apercu', e))
open(os.path.join(sortie, 'apercu', 'prototype-op-gestion.html'), 'w', encoding='utf-8').write(page)
print(len(JEUX[jeu]), 'mutation(s) posée(s) dans', sortie)
