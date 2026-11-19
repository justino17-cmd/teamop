#!/bin/bash
# Rejoue les sondes « RETOUR » de la CAMPAGNE (les restes du bouton Retour, tours 1 à 4 : cadre de la Comptabilité, Boîte mail, OP Security, aperçu PDF, feuille « Fermer le message »),
# UNE à la fois (un seul navigateur), et dit pour chacune « <durée>s code=<n> <nom> :: <N ✓ · M ✗> ». Sort en 1 si une exécution tombe.
# Les sondes des calques, du parcours et du recontrôle d'origine vivent dans scratchpad/proto-final/sondes/retour-tout.sh (même famille, autre dossier) : tout-rejouer.sh joue les deux.
#   COMPLET=1 : tous les profils (ordinateur, iPad, iPhone, Android) pour chaque sonde, et la nuit — une demi-heure de plus ; par défaut ESSENTIEL (voir plus bas).
# Journal : $CAP/retour-tout.log (hors dépôt).
# Écartés (outils, pas des gardes) : retour-restes3-constat.js, -double.js et -apercu-pdf.js (ils MESURENT un état et rendent 0 sans verdict : constats pas à pas), -cap.js et
# retour-restes2-recontrole-cap.js (captures à regarder) ; retour-restes3-mutations.sh et retour-restes4-mutations.sh (contre-épreuves : elles modifient la page puis la restaurent par git checkout,
# à lancer à part, APRÈS commit, jamais dans un rejeu).
# Chaque sonde choisit ce qu'elle joue : un PROFIL (mac par défaut sauf les deux « recontrole » du cadre, android), NUIT=1 pour la nuit, QUI pour le rôle. Par défaut : un ordinateur ET un
# téléphone, jour ; la nuit n'est jouée qu'une fois (iphone) — un calque n'a pas de teinte à lui, la nuit ne change que des couleurs que d'autres sondes mesurent.
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour-campagne}"; mkdir -p "$CAP"; J="$CAP/retour-tout.log"; : > "$J"; ko=0
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 590 env -u CAP "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ *·? *[0-9]+ ✗' | tail -1)
  [ $code -ne 0 ] && ko=1
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ]; then echo "$s" | grep "✗" | grep -vE '^[[:space:]]*==? *[0-9]+ ✓' | head -4 | cut -c1-240 | tee -a "$J"; [ $code -eq 124 ] && echo "    (DÉLAI DÉPASSÉ)" | tee -a "$J"; fi; }
S=scratchpad/proto-final/campagne/sondes
essentiel="mac android"; [ -n "$COMPLET" ] && essentiel="mac windows ipad iphone android petit"
# Tour 1 : la Boîte mail (PROFIL), le cadre de la Comptabilité (PROFILC) et les cinq autres sections se rejouent d'une traite
lance "tour 1 attaque (courrier, compta, sécurité, confirmation, feuille, iPad) mac" PROFIL=mac PROFILC=android node $S/retour-restes1-attaque.js
lance "tour 1 attaque iphone" PROFIL=iphone PROFILC=iphone node $S/retour-restes1-attaque.js
# Tour 2 : « ‹ OP GESTION » fait partir la couche du cadre d'abord, puis recule
for p in $essentiel; do lance "tour 2 recontrôle $p" PROFIL=$p node $S/retour-restes2-recontrole.js; lance "tour 2 recontrôle (suite) $p" PROFIL=$p node $S/retour-restes2-recontrole-b.js; done
lance "tour 2 recontrôle iphone nuit" PROFIL=iphone NUIT=1 node $S/retour-restes2-recontrole.js
# Tour 3 : la règle « Retour ferme la couche du dessus, rien d'autre » (Boîte mail, OP Security, cadre de la Comptabilité)
for p in $essentiel iphone; do lance "tour 3 garde $p" PROFIL=$p node $S/retour-restes3.js; done
for p in $essentiel; do lance "tour 3 compta $p" PROFIL=$p node $S/retour-restes3-compta.js; done
for p in $essentiel ipad; do lance "tour 3 recontrôle $p" PROFIL=$p node $S/retour-restes3-recontrole.js; done
lance "tour 3 garde iphone nuit" PROFIL=iphone NUIT=1 node $S/retour-restes3.js
# Tour 4 : l'aperçu d'un PDF et la feuille « Fermer le message » sont des niveaux d'historique
for p in $essentiel iphone; do lance "tour 4 recontrôle $p" PROFIL=$p node $S/retour-restes4-recontrole.js; done
lance "tour 4 recontrôle android nuit" PROFIL=android NUIT=1 node $S/retour-restes4-recontrole.js
if [ -n "$COMPLET" ]; then for p in windows ipad iphone android petit; do lance "tour 3 recontrôle nuit $p" PROFIL=$p NUIT=1 node $S/retour-restes3-recontrole.js; done; fi
echo FINI | tee -a "$J"; exit $ko
