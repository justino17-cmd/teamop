#!/bin/bash
# Contre-épreuve du tour 4 des restes « Retour » : chaque correction est défaite SUR UNE COPIE des pages (RACINE=/tmp/opg-mut4, le dépôt n'est jamais touché) ; la sonde qui la garde doit TOMBER.
cd "$(dirname "$0")/../../../.." || exit 1
S=scratchpad/proto-final/campagne/sondes; R=/tmp/opg-mut4; CAP=${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour4}; mkdir -p "$CAP"
rm -rf "$R"; mkdir -p "$R"; tar --exclude=.git --exclude=./scratchpad --exclude=node_modules -cf - . | tar -xf - -C "$R"
C=apercu/prototype-courrier.js; O=apercu/prototype-op-gestion.html
muter() { python3 - "$R/$1" "$2" "$3" <<'PY'
import sys
f,a,b=sys.argv[1:4]; s=open(f,encoding='utf-8').read()
assert s.count(a)==1,("ancre introuvable ou multiple",a[:60],s.count(a)); open(f,'w',encoding='utf-8').write(s.replace(a,b))
PY
}
rendre() { cp "$1" "$R/$1"; }
essai() { # nom fichier ancien nouveau sonde profil [section]
  if [ -n "$MUT" ] && ! [[ " $MUT " == *" ${1%%-*} "* ]]; then return; fi
  rendre "$2"; muter "$2" "$3" "$4" || { echo "$1 : MUTATION NON POSÉE"; return; }
  RACINE=$R PROFIL=$6 SECTION=${7:-A,B,C,D,E,F,G,H} timeout 280 node "$S/$5" > "$CAP/mut-$1.log" 2>&1; local c=$?
  echo "$1 ($5 $6) : sortie $c — $(grep -c '✗' "$CAP/mut-$1.log") lignes ✗"
  rendre "$2"
}
essai M8-apercu-ferme-avec-le-composeur $C '    if(pdfv) fermerApercu();   // la couche' '    if(false) fermerApercu();   // la couche' retour-restes3-recontrole.js mac F
# M7 (aperçu sorti de histCible) et M9 (feuille « Fermer le message » sortie de histCible) sont des mutants ÉQUIVALENTS dans toute population jouable : le composeur qui les porte prête son niveau, l'historique se repose aussitôt ; seule une lecture sans composeur (aucun message de la démonstration n'offre l'aperçu en lecture) les distinguerait.
essai M9-feuille-brouillon-sans-sa-couche $C '    else if($("#cDiscard")){ var dc=$' '    else if(false){ var dc=$' retour-restes3-recontrole.js iphone F
essai M10-menu-survit-au-depart $C 'if(o&&o.classList.contains("ov-menu")) closeOverlay(); return; }' 'return; }' retour-restes3-recontrole.js iphone E
essai M11-cadre-garde-sa-couche-hors-ecran $O "  if (!voulu) { cpCouchePartir(); /*" "  if (!voulu) { /*" retour-restes3-recontrole.js android G
echo FIN
