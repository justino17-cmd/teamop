#!/bin/bash
# Rejoue TOUTES les sondes de la famille « compta » (Comptabilité : compta-reste = achats, paie, banque, fiscal, conformité ; compta-ventes = ventes,
# clients, paiements, caisse), UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. FINI à la fin ; sort en 1 si une
# exécution tombe.
#   bash scratchpad/proto-final/campagne/sondes/compta-tout.sh               # le passage ESSENTIEL (ordinateur « mac » + téléphone « iphone »)
#   COMPLET=1 bash …/compta-tout.sh                                           # + les autres profils des sondes de mise en page (ipad, android, windows, petit, mac720)
#   AVEC_BALAYAGE=1 bash …/compta-tout.sh                                     # + les balayages (recensements de gestes, longs : un quart d'heure et plus)
# Journal complet : $CAP/compta-tout.log (hors dépôt). Durée : voir la ligne « DURÉE » que le script imprime en fin de passage.
#
# CE QUI EST JOUÉ : chaque sonde sur UN ordinateur (mac, jour) ET UN téléphone (iphone ; la NUIT quand la sonde sait la jouer, le jour sinon). Les sondes qui
# prennent un rôle (« qui ») sont jouées par le gérant (marc) sur ordinateur et par la secrétaire (julie) sur téléphone quand le rôle change ce qu'elles voient.
# CE QUI EST LAISSÉ DE CÔTÉ (pour tenir dans la durée, et DIT ici) :
#   · les profils ipad, android, windows, petit, mac720 des sondes de mise en page — sous COMPLET=1 ;
#   · mac NUIT et iphone JOUR des sondes qui prennent « nuit » — sous COMPLET=1 ;
#   · les BALAYAGES (compta-reste-balayage, compta-reste-recontrole-balayage, compta-ventes-balayage, contrats-balayage) : ce sont des RECENSEMENTS (page
#     neuve, un geste, ce qu'il a fait ; une heure à eux seuls), sans verdict propre — le verdict s'y fabrique : « ✓ » = geste touché, « ✗ » = geste non touché
#     ou erreur de console. Sous AVEC_BALAYAGE=1 seulement ;
#   · les EXPLORATIONS (compta-*-explore, compta-reste-cadre-explore, compta-reste-paie-explore, compta-ventes-cadre-explore), compta-ventes-balayage-rapide
#     (une variante du balayage) et les OUTILS : ce ne sont pas des contrôles (elles écrivent des captures et des relevés) ; les mutations (*.py) ont leur lanceur.
# Les sondes réécrivent des relevés JSON suivis dans campagne/ (mise-en-page-*.json, mots-compta-reste.json, balayage-*.json…) : à la fin le script LISTE ceux
# qui ont bougé ; les remettre (git checkout -- <fichier>) avant de commiter, sauf si l'on veut vraiment les renouveler.
# Tout le corps est dans une fonction : bash lit un script au fur et à mesure, et le modifier pendant qu'il tourne le fait dérailler.
main(){
ICI="$(cd "$(dirname "$0")" && pwd)"; cd "$ICI/../../../.." || exit 1
CAP="${CAP:-/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap}"; mkdir -p "$CAP"; export CAP; J="$CAP/compta-tout.log"; : > "$J"
S=scratchpad/proto-final/campagne/sondes
DELAI="${DELAI:-420}"; ko=0; T0=$(date +%s)

# Sondes sans total « N ✓ · M ✗ » : on fabrique le verdict depuis ce qu'elles impriment (le critère est écrit ici, pas deviné).
synth_mep(){ # « jour iphone tva glisse=0 petits=0 champs=0 écrasés=0 … » : une ligne est ✓ si rien ne glisse, aucun champ trop petit, aucun texte écrasé et — AU DOIGT
  # seulement (iphone, android, ipad, petit) — aucune cible sous 44 px (sur ordinateur le plancher est celui de la souris : 40 px de rangée n'est pas un défaut)
  awk '/(jour|nuit) [a-z0-9]+ +[a-z]+ +glisse=/{ doigt = ($2 ~ /^(iphone|android|ipad|petit)$/); bon = ($0 ~ /glisse=(0|false) /) && ($0 ~ / champs=0 /) && ($0 ~ / écrasés=0 /) && (!doigt || $0 ~ / petits=0 /); if (bon) ok++; else ko++ }
       /^erreurs \[\]/{ ok++ } /^erreurs \[[^]]/{ ko++ } END{ printf "%d ✓ · %d ✗", ok, ko }' <<< "$1"; }
synth_bal(){ # lignes « 12 T libellé … » (touché) ou « 12 ✗ libellé … » (non touché) ; « err N [...] » : N > 0 = erreur de console
  awk '/^ *[0-9]+ T /{ ok++ } /^ *[0-9]+ ✗ /{ ko++ } /^err [1-9]/{ ko++ } END{ printf "%d ✓ · %d ✗", ok, ko }' <<< "$1"; }

# lance <nom> <commande…> : SYN=mep|bal en préfixe si la sonde n'imprime pas de total
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout "$DELAI" env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE '[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗' | tail -1)
  if [ -n "$SYN" ]; then b="$(synth_$SYN "$s")"; if [ $code -eq 0 ] && { ! echo "$b" | grep -qE ' 0 ✗$' || echo "$b" | grep -qE '^0 ✓'; }; then code=1; fi; nom="$nom (verdict fabriqué)"; fi
  [ $code -eq 0 ] && [ -z "$b" ] && b="aucun total imprimé"
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  if [ $code -ne 0 ] && [ "$SYN" = mep ]; then echo "$s" | grep -E 'glisse=' | grep -vE 'glisse=(0|false) petits=0 champs=0 écrasés=0' | head -4 | cut -c1-200 | sed 's/^/    /' | tee -a "$J"; fi
  if [ $code -ne 0 ]; then echo "$s" | grep -E "✗|ÉCHEC|Error" | grep -vE '^[[:space:]]*[0-9]+ ✓' | head -3 | cut -c1-220 | sed 's/^/    /' | tee -a "$J"; ko=$((ko+1)); fi; }
# sonde <niveau E|C> <nom> <commande…> : niveau C = seulement sous COMPLET=1
sonde(){ local niv="$1"; shift; [ "$niv" = C ] && [ -z "$COMPLET" ] && return 0; lance "$@"; }
PC=mac; TEL=iphone

# ───────────── compta-reste : achats, paie, banque, fiscal, conformité ─────────────
for p in $PC $TEL; do sonde E "reste cadre-coherence $p" node $S/compta-reste-cadre-coherence.js $p; done
sonde E "reste cadre-mots" node $S/compta-reste-cadre-mots.js
for p in $PC $TEL; do sonde E "reste cadre-parcours $p" node $S/compta-reste-cadre-parcours.js $p; done
sonde E "reste corr mac jour" node $S/compta-reste-corr.js mac
sonde E "reste corr iphone nuit" node $S/compta-reste-corr.js iphone nuit
sonde C "reste corr mac nuit" node $S/compta-reste-corr.js mac nuit
sonde C "reste corr iphone jour" node $S/compta-reste-corr.js iphone
for p in $PC $TEL; do sonde E "reste details $p" node $S/compta-reste-details.js $p; done
for p in $PC $TEL; do sonde E "reste enligne $p" node $S/compta-reste-enligne.js $p; done
SYN=mep sonde E "reste mise-en-page mac jour" node $S/compta-reste-mise-en-page.js mac jour
SYN=mep sonde E "reste mise-en-page iphone nuit" node $S/compta-reste-mise-en-page.js iphone nuit
SYN=mep sonde C "reste mise-en-page mac nuit" node $S/compta-reste-mise-en-page.js mac nuit
SYN=mep sonde C "reste mise-en-page iphone jour" node $S/compta-reste-mise-en-page.js iphone jour
for p in ipad android windows petit mac720; do SYN=mep sonde C "reste mise-en-page $p jour+nuit" node $S/compta-reste-mise-en-page.js $p les-deux; done
sonde E "reste mots marc" node $S/compta-reste-mots.js marc
sonde E "reste mots julie" node $S/compta-reste-mots.js julie
for x in a b c d f g; do for p in $PC $TEL; do sonde E "reste parcours-$x $p" node $S/compta-reste-parcours-$x.js $p; done; done
for r in bilan ndf paiement-mots parcours; do
  sonde E "reste recontrole-$r mac jour" node $S/compta-reste-recontrole-$r.js mac
  sonde E "reste recontrole-$r iphone nuit" node $S/compta-reste-recontrole-$r.js iphone nuit
done
# « recontrole » entière dépasse cinq minutes : on la joue par PARTIES (une par navigateur, c'est son propre argument)
for part in montants ndf chiffres mots mise; do sonde E "reste recontrole mac jour partie $part" node $S/compta-reste-recontrole.js mac jour $part; done
for part in montants ndf chiffres mots mise; do sonde E "reste recontrole iphone nuit partie $part" node $S/compta-reste-recontrole.js iphone nuit $part; done
sonde E "reste roles (marc, julie, sm, kb)" node $S/compta-reste-roles.js
for p in $PC $TEL; do sonde E "reste tableaux $p" node $S/compta-reste-tableaux.js $p; done

# ───────────── compta-ventes : ventes, clients, paiements, caisse ─────────────
for p in $PC $TEL; do sonde E "ventes annulee-cadre $p" node $S/compta-ventes-annulee-cadre.js $p; done
sonde E "ventes corrections-mep mac jour+nuit" node $S/compta-ventes-corrections-mep.js mac les-deux
sonde E "ventes corrections-mep iphone jour+nuit" node $S/compta-ventes-corrections-mep.js iphone les-deux
for p in $PC $TEL; do sonde E "ventes enligne $p" node $S/compta-ventes-enligne.js $p; done
sonde E "ventes mise-en-page mac marc jour" node $S/compta-ventes-mise-en-page.js mac marc jour
sonde E "ventes mise-en-page iphone marc nuit" node $S/compta-ventes-mise-en-page.js iphone marc nuit
sonde C "ventes mise-en-page mac marc nuit" node $S/compta-ventes-mise-en-page.js mac marc nuit
sonde C "ventes mise-en-page iphone marc jour" node $S/compta-ventes-mise-en-page.js iphone marc jour
for p in ipad android windows petit mac720; do sonde C "ventes mise-en-page $p marc jour+nuit" node $S/compta-ventes-mise-en-page.js $p marc les-deux; done
for x in a b c e f g h i j; do for p in $PC $TEL; do sonde E "ventes parcours-$x $p" node $S/compta-ventes-parcours-$x.js $p; done; done
sonde E "ventes parcours-d mac marc" node $S/compta-ventes-parcours-d.js mac marc
sonde E "ventes parcours-d iphone julie" node $S/compta-ventes-parcours-d.js iphone julie
for r in r1 r2 r3; do
  sonde E "ventes recontrole-$r mac marc jour" node $S/compta-ventes-recontrole-$r.js mac marc jour
  sonde E "ventes recontrole-$r iphone julie nuit" node $S/compta-ventes-recontrole-$r.js iphone julie nuit
done
for r in r2b r4 r5; do for p in $PC $TEL; do sonde E "ventes recontrole-$r $p" node $S/compta-ventes-recontrole-$r.js $p; done; done
for x in 1 2 3; do
  sonde E "ventes restes-$x mac jour" node $S/compta-ventes-restes-$x.js mac
  sonde E "ventes restes-$x iphone nuit" node $S/compta-ventes-restes-$x.js iphone nuit
done

# ───────────── balayages (opt-in) ─────────────
if [ -n "$AVEC_BALAYAGE" ]; then
  Q=marc
  for g in achats paie banque fiscal conformite; do SYN=bal lance "balayage reste $g mac" bash $S/compta-reste-balayage-tout.sh mac $g $Q; done
  SYN=bal lance "balayage ventes mac" bash $S/compta-ventes-balayage-tout.sh mac $Q
  SYN=bal lance "balayage ventes iphone julie" bash $S/compta-ventes-balayage-tout.sh iphone julie
  for g in achats banque; do SYN=bal lance "recontrole-balayage reste $g iphone nuit" NUIT=1 bash $S/compta-reste-recontrole-balayage-tout.sh iphone $g $Q; done
fi

echo "DURÉE $(( $(date +%s)-T0 )) s" | tee -a "$J"
git status --short scratchpad/proto-final/campagne/*.json | sed 's/^/  relevé réécrit par une sonde : /' | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
}
main "$@"; exit $?
