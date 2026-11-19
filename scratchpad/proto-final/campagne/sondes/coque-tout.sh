#!/bin/bash
# Rejoue les sondes de la COQUE (menu, connexion, recherche et clavier, création rapide, Jour/Nuit/adresses, espace client, mise en page),
# UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. Sort en 1 si une exécution tombe.
#   bash scratchpad/proto-final/campagne/sondes/coque-tout.sh            # l'essentiel : environ 25 minutes (mesuré le 19/11/2026 : 1 496 s, avec les trois sondes de la recherche et de la visite)
#   TOUT=1 bash …/coque-tout.sh                                          # TOUT, tous les profils : environ 44 minutes (2 660 s) — à lancer en fond
#   RAPIDE=1 bash …/coque-tout.sh                                        # ordinateur seul (mac), une exécution par sonde : une dizaine de minutes
# Le verdict d'une exécution est son code de sortie ; le « N ✓ · M ✗ » n'est qu'un affichage. Journal complet : $CAP/coque-tout.log (hors dépôt).
# LAISSÉ DE CÔTÉ dans la version courte (durée visée : 25 minutes ; TOUT=1 les rejoue) :
#   - coque-mise-en-page : la nuit sur petit (jour joué sur les sept profils, nuit sur mac et iphone) ;
#   - coque-menu : ipad et android (même menu qu'iphone, mesuré 76 et 120 contrôles verts), joué sur mac, iphone, iphone de nuit ;
#   - coque-menu-choisie : ipad et la nuit hors mac ; coque-connexion : petit et iphone de jour (mac et iphone de nuit sont joués) ;
#   - coque-clavier : windows côté secrétaire et le Mac simulé (Cmd) — windows côté gérant est joué (trois minutes chacun) ;
#   - coque-creation mac côté technicienne ; coque-mode-adresse iphone gérant ; coque-parcours ipad ; coque-recontrole windows ; coque-regard iphone et windows de nuit ;
#   - coque-guide.js : il ne fait que lancer guide-voir, guide-mots et guide-fermer, déjà rejoués par guide-tout.sh (famille « guide »).
# coque-recontrole et coque-clavier sont faites pour l'ORDINATEUR (raccourcis clavier) : sur iphone, 9 contrôles de clavier tombent, ce n'est pas un défaut.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/coque-tout}"; mkdir -p "$CAP"; J="$CAP/coque-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
# profils <liste courte> [liste complète] : mac seul avec RAPIDE, la liste complète avec TOUT, sinon la liste courte
profils(){ local court="$1" tout="${2:-$1}"; if [ -n "$RAPIDE" ]; then echo mac; elif [ -n "$TOUT" ]; then echo $tout; else echo $court; fi; }
# court <nom> <commande…> : une exécution qui n'a lieu que dans la version complète
tout(){ [ -n "$TOUT" ] && [ -z "$RAPIDE" ] && lance "$@"; return 0; }

for p in $(profils "mac windows mac720 ipad iphone android petit"); do lance "mise en page $p jour" PROFIL=$p node $S/coque-mise-en-page.js; done
for p in $(profils "mac iphone" "mac iphone petit"); do lance "mise en page $p nuit" PROFIL=$p NUIT=1 node $S/coque-mise-en-page.js; done

for p in $(profils "mac iphone" "mac ipad iphone android"); do lance "menu $p (4 personnes)" PROFIL=$p node $S/coque-menu.js; done
[ -z "$RAPIDE" ] && lance "menu iphone nuit" PROFIL=iphone NUIT=1 node $S/coque-menu.js
for p in $(profils "mac windows" "mac windows ipad"); do lance "menu choisie $p" PROFIL=$p node $S/coque-menu-choisie.js; done
[ -z "$RAPIDE" ] && lance "menu choisie mac nuit" PROFIL=mac NUIT=1 node $S/coque-menu-choisie.js

for p in $(profils "mac" "mac iphone petit"); do lance "connexion $p" PROFIL=$p node $S/coque-connexion.js; done
[ -z "$RAPIDE" ] && lance "connexion iphone nuit" PROFIL=iphone NUIT=1 node $S/coque-connexion.js

lance "creation mac marc" PROFIL=mac QUI=marc node $S/coque-creation.js
if [ -z "$RAPIDE" ]; then lance "creation iphone marc" PROFIL=iphone QUI=marc node $S/coque-creation.js; lance "creation iphone sm" PROFIL=iphone QUI=sm node $S/coque-creation.js; fi
tout "creation mac sm" PROFIL=mac QUI=sm node $S/coque-creation.js

lance "clavier windows marc" PROFIL=windows QUI=marc node $S/coque-clavier.js
tout "clavier windows julie" PROFIL=windows QUI=julie node $S/coque-clavier.js
tout "clavier mac720 marc (Cmd)" PROFIL=mac720 QUI=marc MAC=1 node $S/coque-clavier.js

lance "mode et adresses mac marc" PROFIL=mac QUI=marc node $S/coque-mode-adresse.js
[ -z "$RAPIDE" ] && lance "mode et adresses iphone sm" PROFIL=iphone QUI=sm node $S/coque-mode-adresse.js
tout "mode et adresses iphone marc" PROFIL=iphone QUI=marc node $S/coque-mode-adresse.js

for p in $(profils "mac iphone" "mac ipad iphone"); do lance "parcours $p marc" PROFIL=$p QUI=marc node $S/coque-parcours.js; done
for p in $(profils "mac iphone"); do lance "espace client $p" PROFIL=$p node $S/coque-client.js; done

lance "recontrole mac" PROFIL=mac node $S/coque-recontrole.js
tout "recontrole windows" PROFIL=windows node $S/coque-recontrole.js
for p in $(profils "petit windows" "petit iphone windows"); do lance "regard $p" PROFIL=$p node $S/coque-regard.js; done
[ -z "$RAPIDE" ] && lance "regard petit nuit" PROFIL=petit NUIT=1 node $S/coque-regard.js
tout "regard windows nuit" PROFIL=windows NUIT=1 node $S/coque-regard.js
lance "mots courants de chaque rôle (recherche) mac" PROFIL=mac node $S/coque-mots-roles.js
lance "tour 2 recontrôle (mots cachés, visite parlée ; la partie C joue l'iphone) mac" PROFIL=mac node $S/coque-tour2-recontrole.js
lance "visite parlée : raccourcis muets, mac" PROFIL=mac node $S/coque-visite-raccourcis.js
tout "guide (3 sondes) mac" PROFIL=mac node $S/coque-guide.js
echo FINI | tee -a "$J"
exit $ko
