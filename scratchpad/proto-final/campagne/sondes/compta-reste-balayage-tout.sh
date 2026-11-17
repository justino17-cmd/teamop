#!/bin/bash
# Balayage des écrans « compta-reste » : bash compta-reste-balayage-tout.sh <profil> <groupe> [qui]
# groupes : achats · paie · banque · fiscal · conformite  (un navigateur par groupe, 580 s au plus)
P=${1:-mac}; G=${2:-achats}; Q=${3:-marc}; D="$(cd "$(dirname "$0")" && pwd)"
S="cpSysteme=false;"
o() { echo "$Q@@$G-$1@@comptabilite@@${S}CP.onglet='$1';$2rendre()"; }
case "$G" in
 achats) A=("$(o fachats "CX.cat='achats';CX.st='tous';")" "$(o ndf "CX.cat='ndf';CX.st='tous';")" "$(o fournisseurs "")");;
 paie) A=("$(o paiemois "")" "$(o fiches "")" "$(o salaries "")" "$(o charges "")");;
 banque) A=("$(o banque "")" "$(o enligne "")" "$(o cloture "")");;
 fiscal) A=("$(o tva "")" "$(o ecritures "")" "$(o balance "")" "$(o grandlivre "")" "$(o resultat "")" "$(o envoi "")");;
 conformite) A=("$(o normes "")" "$(o archives "")");;
esac
GROUPE=$G timeout 580 node "$D/compta-reste-balayage.js" "$P" "${A[@]}"
