#!/bin/bash
# Contre-épreuve du tour 3 : chaque correction est défaite à son tour, la sonde qui la garde doit TOMBER ; la page est restaurée (git checkout) après chaque essai.
# ⛔ À lancer APRÈS avoir commité (la restauration relit le commit). Sortie : une ligne par mutation.
cd "$(dirname "$0")/../../../.." || exit 1
S=scratchpad/proto-final/campagne/sondes; CAP=${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour3}
muter() { # fichier ancien nouveau
  python3 - "$1" "$2" "$3" <<'PY'
import sys
f,a,b=sys.argv[1:4]; s=open(f,encoding='utf-8').read()
assert s.count(a)==1,("ancre introuvable ou multiple",a[:60],s.count(a)); open(f,'w',encoding='utf-8').write(s.replace(a,b))
PY
}
essai() { # nom fichier ancien nouveau sonde profil
  if [ -n "$MUT" ] && ! [[ " $MUT " == *" ${1%%-*} "* ]]; then return; fi
  muter "$2" "$3" "$4" || { echo "$1 : MUTATION NON POSÉE"; return; }
  PROFIL=$6 timeout 280 node "$S/$5" > "$CAP/mut-$1.log" 2>&1; local c=$?
  echo "$1 ($5 $6) : sortie $c — $(tail -1 "$CAP/mut-$1.log") — $(grep -c '✗' "$CAP/mut-$1.log") lignes ✗"
  git checkout -q -- "$2"
}
C=apercu/prototype-courrier.js; O=apercu/prototype-op-gestion.html
essai M1-menu-hors-historique $C 'function overlayDePage(){ return !!$("#overlay"); }' 'function overlayDePage(){ var o=$("#overlay"); return !!o&&!o.classList.contains("ov-menu"); }' retour-restes3.js mac
essai M2-orpheline-non-sautee $C 'if(st>HIST.niv){ HIST.ignorer++;' 'if(false){ HIST.ignorer++;' retour-restes3.js mac
essai M3-aller-ne-range-pas-securite $O 'fermerMenu(); opsRanger(); if (location.hash' 'fermerMenu(); if (location.hash' retour-restes3.js iphone
essai M4-redimensionnement-sans-suivi $O "SECU.ouvert = e.matches; opsDessiner(); }); } catch (e) {}" "}); } catch (e) {}" retour-restes3.js iphone
essai M5-barre-ne-ferme-pas-le-panneau $O 'cpSysteme = false; cpCouchePartir(); if (cpSysDe' 'cpSysteme = false; if (cpSysDe' retour-restes3-compta.js android
essai M6-double-clic-non-dedoublonne $O "else if (a === 'retour') { if (!cpSysteme) return;" "else if (a === 'retour') { " retour-restes3-compta.js android
git status --short apercu/ | head -3; echo FIN
