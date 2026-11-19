#!/bin/bash
# Rejoue TOUTES les sondes de la famille « compta » (Comptabilité : compta-reste = achats, paie, banque, fiscal, conformité ; compta-ventes = ventes,
# clients, paiements, caisse), UNE à la fois (un seul navigateur), et dit pour chacune « N ✓ · M ✗ » et son code de sortie. FINI à la fin ; sort en 1 si une
# exécution tombe.
#   bash scratchpad/proto-final/campagne/sondes/compta-tout.sh               # le passage ESSENTIEL (ordinateur « mac » + téléphone « iphone »)
#   COMPLET=1 bash …/compta-tout.sh                                           # + les autres profils des sondes de mise en page (ipad, android, windows, petit, mac720)
#   AVEC_BALAYAGE=1 bash …/compta-tout.sh                                     # + les balayages (recensements de gestes, longs : un quart d'heure et plus)
# Journal complet : $CAP/compta-tout.log (hors dépôt). Durée : voir la ligne « DURÉE » que le script imprime en fin de passage.
#
# CE QUI EST JOUÉ (le passage essentiel) : TOUTES les sondes sur UN ordinateur (mac, jour) ; et sur UN téléphone (iphone, la NUIT quand la sonde sait la
# jouer) celles qui regardent le RENDU ou qui sont courtes : mise en page, corrections de mise en page, restes, cadre, tableaux, en ligne, détails, écrans de
# droits par rôle (marc au bureau, julie au téléphone quand le rôle change ce que la sonde voit).
# CE QUI EST LAISSÉ DE CÔTÉ (pour tenir dans la durée, et DIT ici) — sous COMPLET=1 :
#   · le TÉLÉPHONE des parcours fonctionnels et des recontrôles longs (reste parcours-a à g, cadre-parcours, recontrole-ndf, recontrole-parcours, parties montants+ndf et
#     chiffres du recontrôle ; ventes parcours-a à j, recontrole-r2b/r4/r5) : même fonction que sur ordinateur, seul le rendu change et il est déjà gardé par les sondes de mise en page ;
#   · mac NUIT et iphone JOUR des sondes qui prennent « nuit » ;
#   · les profils ipad, android, windows, petit, mac720 des sondes de mise en page.
# CE QUI N'EST JOUÉ QUE SOUS AVEC_BALAYAGE=1 : les BALAYAGES (compta-reste-balayage, compta-reste-recontrole-balayage, compta-ventes-balayage), des RECENSEMENTS (page neuve,
#   un geste, ce qu'il a fait ; une heure à eux seuls) sans verdict propre — le verdict s'y fabrique : « ✓ » = geste touché, « ✗ » = geste non touché ou erreur de console —,
#   et la partie « mots » du recontrôle (chaque geste de quinze onglets, plus de sept minutes par navigateur : par groupes d'onglets).
# CE QUI N'EST JAMAIS JOUÉ : les EXPLORATIONS (compta-*-explore, compta-reste-cadre-explore, compta-reste-paie-explore, compta-ventes-cadre-explore), compta-ventes-balayage-rapide
#   (variante du balayage) et les OUTILS : ce ne sont pas des contrôles (elles écrivent des captures et des relevés) ; les mutations (*.py) ont leur lanceur.
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
# duo <niveau du téléphone> <nom> <commande…> : la sonde sur l'ordinateur (toujours) puis sur le téléphone (niveau E = dans le passage essentiel, C = sous COMPLET=1).
duo(){ local tel="$1" nom="$2"; shift 2; sonde E "$nom mac" "$@" mac; sonde "$tel" "$nom iphone" "$@" iphone; }
# duon <niveau du téléphone> <nom> <commande…> : pour les sondes qui prennent « nuit » — ordinateur de jour, téléphone de nuit ; l'autre moitié sous COMPLET=1.
duon(){ local tel="$1" nom="$2"; shift 2; sonde E "$nom mac jour" "$@" mac; sonde "$tel" "$nom iphone nuit" "$@" iphone nuit; sonde C "$nom mac nuit" "$@" mac nuit; sonde C "$nom iphone jour" "$@" iphone; }

# ───────────── compta-reste : achats, paie, banque, fiscal, conformité ─────────────
duo E "reste cadre-coherence" node $S/compta-reste-cadre-coherence.js
sonde E "reste cadre-mots" node $S/compta-reste-cadre-mots.js
duo C "reste cadre-parcours" node $S/compta-reste-cadre-parcours.js
duon E "reste corr" node $S/compta-reste-corr.js
duo E "reste details" node $S/compta-reste-details.js
duo E "reste enligne" node $S/compta-reste-enligne.js
SYN=mep sonde E "reste mise-en-page mac jour" node $S/compta-reste-mise-en-page.js mac jour
SYN=mep sonde E "reste mise-en-page iphone nuit" node $S/compta-reste-mise-en-page.js iphone nuit
SYN=mep sonde C "reste mise-en-page mac nuit" node $S/compta-reste-mise-en-page.js mac nuit
SYN=mep sonde C "reste mise-en-page iphone jour" node $S/compta-reste-mise-en-page.js iphone jour
for p in ipad android windows petit mac720; do SYN=mep sonde C "reste mise-en-page $p jour+nuit" node $S/compta-reste-mise-en-page.js $p les-deux; done
sonde E "reste mots marc" node $S/compta-reste-mots.js marc
sonde E "reste mots julie" node $S/compta-reste-mots.js julie
for x in a b c d f g; do duo C "reste parcours-$x" node $S/compta-reste-parcours-$x.js; done
duon E "reste recontrole-bilan" node $S/compta-reste-recontrole-bilan.js
duon C "reste recontrole-ndf" node $S/compta-reste-recontrole-ndf.js
duon E "reste recontrole-paiement-mots" node $S/compta-reste-recontrole-paiement-mots.js
duon C "reste recontrole-parcours" node $S/compta-reste-recontrole-parcours.js
# « recontrole » entière dépasse cinq minutes : on la joue par PARTIES (une par navigateur, c'est son propre argument). « ndf » ne se joue pas seule (elle lit
# l'état que « montants » laisse : seule, 0 ✓ · 7 ✗) : « montants ndf » ensemble. La partie « mots » touche chaque geste de quinze onglets (balayage déguisé) : voir plus bas.
sonde E "reste recontrole mac jour parties montants+ndf" node $S/compta-reste-recontrole.js mac jour "montants ndf"
sonde E "reste recontrole mac jour partie chiffres" node $S/compta-reste-recontrole.js mac jour chiffres
sonde E "reste recontrole mac jour partie mise" node $S/compta-reste-recontrole.js mac jour mise
sonde E "reste recontrole iphone nuit partie mise" node $S/compta-reste-recontrole.js iphone nuit mise
sonde C "reste recontrole iphone nuit parties montants+ndf" node $S/compta-reste-recontrole.js iphone nuit "montants ndf"
sonde C "reste recontrole iphone nuit partie chiffres" node $S/compta-reste-recontrole.js iphone nuit chiffres
sonde E "reste roles (marc, julie, sm, kb)" node $S/compta-reste-roles.js
duo E "reste tableaux" node $S/compta-reste-tableaux.js

# Restes de cohérence (cadre OP COMPTABLE / OP GESTION, tours 2 et 3) et pièces du recontrôle qui n'avaient pas leur ligne : « profil [qui] » pour les deux premières, « profil [nuit] » pour les autres.
duo E "reste coherence-2" node $S/compta-restes-coherence-2.js
duo E "reste coherence-2 recontrole" node $S/compta-restes-coherence-2-recontrole.js
duon E "reste coherence-3" node $S/compta-restes-coherence-3.js
duon E "reste coherence-3 recontrole" node $S/compta-restes-coherence-3-recontrole.js
duon E "reste recontrole-bulletin" node $S/compta-reste-recontrole-bulletin.js
duon E "reste recontrole-cadre-mots" node $S/compta-reste-recontrole-cadre-mots.js
duo E "reste recontrole-coh" node $S/compta-reste-recontrole-coh.js

# ───────────── compta-ventes : ventes, clients, paiements, caisse ─────────────
duo E "ventes annulee-cadre" node $S/compta-ventes-annulee-cadre.js
sonde E "ventes corrections-mep mac jour" node $S/compta-ventes-corrections-mep.js mac jour
sonde E "ventes corrections-mep iphone nuit" node $S/compta-ventes-corrections-mep.js iphone nuit
sonde C "ventes corrections-mep mac nuit" node $S/compta-ventes-corrections-mep.js mac nuit
sonde C "ventes corrections-mep iphone jour" node $S/compta-ventes-corrections-mep.js iphone jour
duo E "ventes enligne" node $S/compta-ventes-enligne.js
sonde E "ventes mise-en-page mac marc jour" node $S/compta-ventes-mise-en-page.js mac marc jour
sonde E "ventes mise-en-page iphone marc nuit" node $S/compta-ventes-mise-en-page.js iphone marc nuit
sonde C "ventes mise-en-page mac marc nuit" node $S/compta-ventes-mise-en-page.js mac marc nuit
sonde C "ventes mise-en-page iphone marc jour" node $S/compta-ventes-mise-en-page.js iphone marc jour
for p in ipad android windows petit mac720; do sonde C "ventes mise-en-page $p marc jour+nuit" node $S/compta-ventes-mise-en-page.js $p marc les-deux; done
for x in a b c e f g h i j; do duo C "ventes parcours-$x" node $S/compta-ventes-parcours-$x.js; done
sonde E "ventes parcours-d mac marc" node $S/compta-ventes-parcours-d.js mac marc
sonde E "ventes parcours-d iphone julie" node $S/compta-ventes-parcours-d.js iphone julie
for r in r1 r2 r3; do
  sonde E "ventes recontrole-$r mac marc jour" node $S/compta-ventes-recontrole-$r.js mac marc jour
  sonde E "ventes recontrole-$r iphone julie nuit" node $S/compta-ventes-recontrole-$r.js iphone julie nuit
done
for r in r2b r4 r5; do duo C "ventes recontrole-$r" node $S/compta-ventes-recontrole-$r.js; done
for x in 1 2 3; do duon E "ventes restes-$x" node $S/compta-ventes-restes-$x.js; done

# Restes des ventes (lots 1 à 7) et leurs recontrôles (rc) : tous prennent « profil [nuit] » sauf mention.
for x in restes1-rc1 restes1-rc2 restes2-1 restes2-2 restes2-rc-pdf restes2-rc-qte restes2-rc-remb restes3-lignes restes3-rc restes4 restes4-rc-a restes4-rc-b restes5-qte restes5-rc restes5-rc2 restes6 restes6-commande restes6-rc restes6-rc2; do duon E "ventes $x" node $S/compta-ventes-$x.js; done
duo E "ventes restes2-rc-dvt" node $S/compta-ventes-restes2-rc-dvt.js
sonde E "ventes restes2-rc-julie mac" node $S/compta-ventes-restes2-rc-julie.js mac julie
sonde E "ventes restes2-rc-julie iphone" node $S/compta-ventes-restes2-rc-julie.js iphone julie
duo E "ventes restes3-rc-duree" node $S/compta-ventes-restes3-rc-duree.js
duon E "ventes restes3-rc-fait (julie)" node $S/compta-ventes-restes3-rc-fait.js
duon E "ventes restes3-rc-remb (julie)" node $S/compta-ventes-restes3-rc-remb.js
duon E "ventes restes3-remb (julie)" node $S/compta-ventes-restes3-remb.js
sonde E "ventes restes3-rc-largeurs mac jour" node $S/compta-ventes-restes3-rc-largeurs.js
sonde E "ventes restes3-rc-largeurs mac nuit" node $S/compta-ventes-restes3-rc-largeurs.js nuit
sonde E "ventes restes7-boite mac jour" PROFIL=mac node $S/compta-ventes-restes7-boite.js
sonde E "ventes restes7-boite iphone nuit" PROFIL=iphone NUIT=1 node $S/compta-ventes-restes7-boite.js

# ───────────── balayages (opt-in) ─────────────
if [ -n "$AVEC_BALAYAGE" ]; then
  Q=marc
  for g in achats paie banque fiscal conformite; do SYN=bal lance "balayage reste $g mac" bash $S/compta-reste-balayage-tout.sh mac $g $Q; done
  SYN=bal lance "balayage ventes mac" bash $S/compta-ventes-balayage-tout.sh mac $Q
  SYN=bal lance "balayage ventes iphone julie" bash $S/compta-ventes-balayage-tout.sh iphone julie
  # recontrole, partie « mots » : chaque geste de chaque onglet est touché et la fenêtre lue (par groupes d'onglets, un navigateur chacun) — verdict propre : « N ✓ · M ✗ »
  for g in fachats,ndf,fournisseurs paiemois,fiches salaries,charges,banque,enligne tva,ecritures,normes,archives,cloture,envoi; do lance "reste recontrole mac jour partie mots onglets $g" ONG=$g node $S/compta-reste-recontrole.js mac jour mots; done
  for g in achats banque; do SYN=bal lance "recontrole-balayage reste $g iphone nuit" NUIT=1 bash $S/compta-reste-recontrole-balayage-tout.sh iphone $g $Q; done
fi

echo "DURÉE $(( $(date +%s)-T0 )) s" | tee -a "$J"
git status --short scratchpad/proto-final/campagne/*.json | sed 's/^/  relevé réécrit par une sonde : /' | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
}
main "$@"; exit $?
