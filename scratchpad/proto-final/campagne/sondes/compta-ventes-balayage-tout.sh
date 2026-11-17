#!/bin/bash
# Lance le balayage des écrans « compta-ventes » sur un profil (un seul navigateur pour toute la série).
# usage : bash compta-ventes-balayage-tout.sh <profil> [qui]   — sortie dans campagne/balayage-compta-ventes-<qui>-<profil>.json
P=${1:-mac}; Q=${2:-marc}; D="$(cd "$(dirname "$0")" && pwd)"
S="cpSysteme=false;"
timeout 900 node "$D/compta-ventes-balayage.js" "$P" \
 "$Q@@ensemble@@comptabilite@@${S}CP.onglet='ensemble';rendre()" \
 "$Q@@dossiers@@comptabilite@@${S}CP.onglet='dossiers';rendre()" \
 "$Q@@fventes@@comptabilite@@${S}CP.onglet='fventes';CX.cat='ventes';CX.st='tous';rendre()" \
 "$Q@@fventes-clients@@comptabilite@@${S}CP.onglet='fventes';CX.cat='clients';CX.st='tous';rendre()" \
 "$Q@@clients@@comptabilite@@${S}CP.onglet='clients';rendre()" \
 "$Q@@contrats@@comptabilite@@${S}CP.onglet='contrats';rendre()" \
 "$Q@@paiements@@comptabilite@@${S}CP.onglet='paiements';CX.psens='tous';CX.pmode='tous';rendre()" \
 "$Q@@caisse@@comptabilite@@${S}CP.onglet='caisse';rendre()"
