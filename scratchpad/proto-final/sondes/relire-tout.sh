#!/bin/bash
# Rejoue la RELECTURE ADVERSE de l'application : le menu au téléphone (relire-menu-telephone*.js, ici) et le compositeur de devis et de contrat
# (relire-tout/*.js, la relecture « tout »), UNE sonde à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie.
# Sort en 1 si une exécution tombe.
#   bash scratchpad/proto-final/sondes/relire-tout.sh          # tout
#   RAPIDE=1 bash …/relire-tout.sh                             # le menu sur iphone seul, et le compositeur sur mac seul
# Durée visée : 25 minutes au plus. Journal complet : $CAP/relire-tout.log (hors dépôt).
# PROFILS LAISSÉS DE CÔTÉ pour tenir ce temps (à rejouer à la main : PROFIL=<p> NUIT=<0|1> QUI=<q> node relire-tout/<sonde>.js) :
#   - compositeur : mac720 et android (même colonne que mac / même téléphone qu'iphone), la nuit hors mise en page et devis complet ;
#   - menu au téléphone : android de nuit (iphone et petit de nuit sont joués).
# Les sondes d'une famille voisine ne sont pas jouées ici : « atelier » (atelier-tout.sh) joue le compositeur lui-même, ici on rejoue sa RELECTURE.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/relire-tout}"; mkdir -p "$CAP"; J="$CAP/relire-tout.log"; : > "$J"
ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  # une sonde qui n'imprime pas de total (✓/✗ ligne à ligne) : on compte ses lignes, et on le dit
  if [ -z "$b" ]; then local n k; n=$(echo "$s" | grep -cE '^[[:space:]]*✓'); k=$(echo "$s" | grep -cE '^[[:space:]]*✗'); [ $((n+k)) -gt 0 ] && b="$n ✓ · $k ✗ (comptés ligne à ligne)"; fi
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -3 | cut -c1-220 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/sondes
R=$S/relire-tout
profils(){ if [ -n "$RAPIDE" ]; then echo "$1"; else echo "$@"; fi; }

# 1. le menu au téléphone (jour et nuit, trois rôles) — une exécution par profil et par moment
for p in $(profils iphone android petit); do
  lance "menu téléphone 1 $p jour" PROFILS=$p NUITS=0 node $S/relire-menu-telephone.js
  [ "$p" != android ] && [ -z "$RAPIDE" ] && lance "menu téléphone 1 $p nuit" PROFILS=$p NUITS=1 node $S/relire-menu-telephone.js
  lance "menu téléphone 2 (barre du bas, Jour/Nuit retenu) $p" PROFILS=$p node $S/relire-menu-telephone-2.js
  lance "menu téléphone 3 (mes congés, espace client) $p" PROFILS=$p node $S/relire-menu-telephone-3.js
done
lance "menu téléphone 4 (ligne allumée, encoche)" node $S/relire-menu-telephone-4.js

# 2. le compositeur de devis et de contrat, sur ordinateur (mac), jour
for s in absent cas-limites chips contrat-complet contrat-gestes deux-onglets double-creer lignes-gestes liste-numeros nouveau-client rapide retour-editeur roles saisie sorties titre-liste valeurs mise-en-page; do
  lance "compositeur $s mac jour" PROFIL=mac NUIT=0 QUI=marc node $R/$s.js; done
lance "compositeur devis complet mac jour (secrétariat)" PROFIL=mac NUIT=0 QUI=julie node $R/devis-complet.js
lance "compositeur devis complet mac jour (gérant)" PROFIL=mac NUIT=0 QUI=marc node $R/devis-complet.js
# 3. ce qui n'a de sens que sur un autre appareil
lance "compositeur clavier windows" PROFIL=windows NUIT=0 node $R/clavier.js
lance "compositeur clavier (confirmation) windows" PROFIL=windows node $R/clavier-confirm.js
for p in $(profils ipad); do lance "compositeur rotation $p" PROFIL=$p NUIT=0 node $R/rotation.js; lance "compositeur rotation (deux scénarios) $p" PROFIL=$p node $R/rotation2.js; done
for p in $(profils petit); do lance "compositeur colonne des étapes, valeurs longues $p" PROFIL=$p NUIT=0 node $R/debord-form.js; lance "compositeur liste, valeurs longues $p" PROFIL=$p NUIT=0 node $R/liste-long.js; done
lance "compositeur menu de l'éditeur iphone" PROFIL=iphone node $R/menu-editeur.js
lance "compositeur messages à action iphone" PROFIL=iphone NUIT=0 node $R/toasts.js
for p in $(profils iphone petit ipad); do lance "compositeur mise en page $p jour" PROFIL=$p NUIT=0 node $R/mise-en-page.js; done
if [ -z "$RAPIDE" ]; then
  lance "compositeur mise en page mac nuit" PROFIL=mac NUIT=1 node $R/mise-en-page.js
  lance "compositeur mise en page iphone nuit" PROFIL=iphone NUIT=1 node $R/mise-en-page.js
  lance "compositeur devis complet iphone nuit" PROFIL=iphone NUIT=1 QUI=marc node $R/devis-complet.js
fi
echo FINI | tee -a "$J"
exit $ko
