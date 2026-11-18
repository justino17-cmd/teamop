#!/bin/bash
# Rejoue le RECONTRÔLE ADVERSE du bouton Retour (18 novembre 2026), une exécution à la fois (un seul navigateur : la machine est partagée).
# Cinq regards, par ordre : le premier (retour-recontrole.js) touche chaque bouton d'écran et joue les pièges ; le second (-b) descend d'un niveau dans chaque fenêtre ; le troisième (-c) parcourt
# la Boîte mail ; le quatrième (-d) touche tout ce qui s'ouvre DANS le cadre de la Comptabilité ; le cinquième (-e) CAPTURE les défauts constatés (à regarder).
# ✅ Les cinq défauts constatés le 18/11/2026 (voir refonte/retour-recontrole.json) sont CORRIGÉS au tour 1 des restes (final/restes-retour-tour1.json) : cadres, autres, courrier sur ordinateur et d sortent en 0.
#   Une exécution qui retombe en 1 est une régression : le calque concerné a perdu sa place dans CAL_GENRES, ou le cadre ne dit plus ses couches (opc_calque).
# Journal : $CAP/retour-recontrole/resume.txt (hors dépôt).
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; D="$CAP/retour-recontrole"; mkdir -p "$D"; : > "$D/resume.txt"
S=scratchpad/proto-final/sondes
j(){ n="$1"; s="$2"; shift; shift; t0=$(date +%s); timeout 590 env "$@" node $S/$s > "$D/$n.log" 2>&1; c=$?; echo "$(( $(date +%s)-t0 ))s code=$c $n :: $(grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗' "$D/$n.log" | tail -1)" | tee -a "$D/resume.txt"; }
for p in android iphone mac; do j "pieges-$p" retour-recontrole.js PROFIL=$p SECTION=pieges; done
for p in android mac; do j "roles-$p" retour-recontrole.js PROFIL=$p SECTION=roles; done
for p in android iphone mac; do j "cadres-$p" retour-recontrole.js PROFIL=$p SECTION=cadres; j "autres-$p" retour-recontrole.js PROFIL=$p SECTION=autres; done
for p in android ipad mac; do j "courrier-$p" retour-recontrole.js PROFIL=$p SECTION=courrier; done
j scan-android-0 retour-recontrole.js PROFIL=android SECTION=scan SCAN_DE=0 SCAN_A=10
j scan-android-1 retour-recontrole.js PROFIL=android SECTION=scan SCAN_DE=10 SCAN_A=21
j scan-mac-0 retour-recontrole.js PROFIL=mac SECTION=scan SCAN_DE=0 SCAN_A=11
j scan-mac-1 retour-recontrole.js PROFIL=mac SECTION=scan SCAN_DE=11 SCAN_A=21
j scan-iphone-fiches retour-recontrole.js PROFIL=iphone SECTION=scan SCAN_DETAILS=1 NB=10
j b-android retour-recontrole-b.js PROFIL=android ROUTES=clients,taches NB1=8 NB2=10
j b-mac retour-recontrole-b.js PROFIL=mac ROUTES=clients,taches,interventions NB1=8 NB2=10
j b-iphone retour-recontrole-b.js PROFIL=iphone ROUTES=devis,planning,absences NB1=8 NB2=10
for p in android ipad mac iphone; do j "c-$p" retour-recontrole-c.js PROFIL=$p NB=24; done
for p in android mac iphone; do j "d-$p" retour-recontrole-d.js PROFIL=$p NB=30; done
for p in android mac; do j "e-$p" retour-recontrole-e.js PROFIL=$p; done
echo FINI | tee -a "$D/resume.txt"
