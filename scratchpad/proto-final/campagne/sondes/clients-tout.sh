#!/bin/bash
# Rejoue TOUTES les sondes de la rubrique CLIENTS (liste, fiche, création, modification, droits, clavier), UNE à la fois, sur les profils et les rôles qu'elles savent jouer.
#   bash scratchpad/proto-final/campagne/sondes/clients-tout.sh            # le jeu ESSENTIEL : l'ordinateur (mac, le gérant, de jour) et le téléphone (iphone, le secrétariat, de nuit) (~25 min)
#   AVEC_TOUS=1 bash …/clients-tout.sh                                     # + mac de nuit, iphone de jour, android, petit (320 px), ipad, windows ; le gérant ET le secrétariat partout (~60 min)
# Une ligne par exécution : « <durée>s code=<n> <sonde et arguments> :: N ✓ · M ✗ », puis FINI. Sortie 1 si une exécution tombe. Journal : $CAP/clients-tout.log (hors dépôt).
#
# CONVENTIONS : ces sondes se règlent par VARIABLES (PROFIL, QUI = marc|julie, NUIT). ⚠️ « NUIT » se lit « !!process.env.NUIT » : NUIT=0 serait la NUIT. Le jour ne pose donc AUCUNE variable NUIT.
# CE QUI N'EST PAS REJOUÉ, ET POURQUOI (un outil, pas un contrôle) :
#   clients-balayage.js (balaie un écran, arguments <profil> <qui> <route> [préparation], il ÉCRIT son rapport de gestes ; sans verdict, sans « N ✓ · M ✗ »).
# Profils laissés de côté dans le jeu essentiel : android, petit, ipad, windows (sauf pour le clavier), et les deux autres combinaisons jour/nuit — joués avec AVEC_TOUS=1.
# ⚠️ Les sondes ne rangent rien dans le dépôt, mais `git status` après un rejeu reste à lire.
cd "$(dirname "$0")/../../../.." || exit 9   # racine du dépôt
CAPB=/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap
# Les sondes rangent leurs captures dans ces dossiers (codés en dur) : un redémarrage de la machine les efface, et une sonde sans dossier meurt à sa première capture.
mkdir -p "$CAPB"/{campagne-accueil,campagne-client,campagne-clients,campagne-interventions,campagne-taches-absences,campagne-technicien,campagne-technicien-recontrole,clients-recontrole,restes-clients3-recontrole,restes-clients4} 2>/dev/null
J="${CAP:-/tmp}/clients-tout.log"; mkdir -p "$(dirname "$J")" 2>/dev/null; : > "$J"; ko=0; n=0
S=scratchpad/proto-final/campagne/sondes
# lance <libellé> <VARIABLES=valeur…> node <sonde> : UNE sonde à la fois, 400 s au plus. Le verdict est le CODE DE SORTIE (une sonde qui imprime
# son total puis meurt a l'air verte) ; une sonde qui tombe montre ses premiers « ✗ ».
lance(){ local nom="$1"; shift; local t0=$(date +%s); local s; s=$(timeout 400 env "$@" 2>&1); local code=$?
  local b; b=$(echo "$s" | grep -oE "[0-9]+ ✓ +· +[0-9]+ ✗|[0-9]+ ✓ +[0-9]+ ✗" | tail -1); n=$((n+1)); [ $code -ne 0 ] && ko=$((ko+1))
  echo "$(( $(date +%s)-t0 ))s code=$code $nom :: $b" | tee -a "$J"
  [ $code -ne 0 ] && echo "$s" | grep "✗" | grep -vE "^[[:space:]]*[0-9]+ ✓" | head -3 | cut -c1-220 | tee -a "$J"; }
# jouer <sonde> : les deux combinaisons essentielles ; avec AVEC_TOUS, toutes les autres (profils × jour/nuit).
jouer(){ local f="$1"
  lance "$f PROFIL=mac QUI=marc" PROFIL=mac QUI=marc node "$S/$f.js"
  lance "$f PROFIL=iphone QUI=julie NUIT=1" PROFIL=iphone QUI=julie NUIT=1 node "$S/$f.js"
  if [ -n "$AVEC_TOUS" ]; then
    lance "$f PROFIL=mac QUI=julie NUIT=1" PROFIL=mac QUI=julie NUIT=1 node "$S/$f.js"
    lance "$f PROFIL=iphone QUI=marc" PROFIL=iphone QUI=marc node "$S/$f.js"
    for p in android petit ipad windows; do lance "$f PROFIL=$p QUI=marc" PROFIL=$p QUI=marc node "$S/$f.js"; done
    lance "$f PROFIL=petit QUI=julie NUIT=1" PROFIL=petit QUI=julie NUIT=1 node "$S/$f.js"
  fi; }

# Les sondes qui prennent le rôle (QUI) : liste, fiche, création, modification, gestes depuis la fiche, puis les cinq recontrôles qui le lisent.
for f in clients-liste clients-fiche clients-creer clients-modifier clients-gestes clients-recontrole-creations clients-recontrole-fiche clients-recontrole-liste clients-recontrole-parcours clients-recontrole-petits; do jouer $f; done

# Celles qui n'ont pas de rôle (PROFIL et NUIT seulement) : cohérence entre écrans, corrections, droits croisés, droits par personne.
for f in clients-croise clients-corriges clients-roles clients-recontrole-droits; do
  lance "$f PROFIL=mac" PROFIL=mac node "$S/$f.js"
  lance "$f PROFIL=iphone NUIT=1" PROFIL=iphone NUIT=1 node "$S/$f.js"
  if [ -n "$AVEC_TOUS" ]; then
    lance "$f PROFIL=mac NUIT=1" PROFIL=mac NUIT=1 node "$S/$f.js"; lance "$f PROFIL=iphone" PROFIL=iphone node "$S/$f.js"
    for p in android petit ipad windows; do lance "$f PROFIL=$p" PROFIL=$p node "$S/$f.js"; done
  fi
done

# Les restes du tour 1 (17 novembre) : les décisions du chef et les casses du recontrôle ; le gérant seul (la case « archiver un client » n'est pas au secrétariat) ; les créations par la Boîte mail et « Composer un devis ».
lance "clients-restes PROFIL=mac QUI=marc" PROFIL=mac QUI=marc node "$S/clients-restes.js"
lance "clients-restes PROFIL=iphone QUI=marc NUIT=1" PROFIL=iphone QUI=marc NUIT=1 node "$S/clients-restes.js"
lance "clients-restes-creations PROFIL=mac" PROFIL=mac node "$S/clients-restes-creations.js"
# Les restes du tour 2 (18 novembre) : la sonde ADVERSE du recontrôle (saisie d'Infos gardée à toutes les portes, client archivé proposé nulle part, numéro « +33 06 », Ctrl+Z, recherche d'un archivé) ; le gérant sur tout, la secrétaire sur téléphone (sans la case d'archivage : le geste n'existe pas).
lance "clients-restes-recontrole PROFIL=mac QUI=marc" PROFIL=mac QUI=marc node "$S/clients-restes-recontrole.js"
lance "clients-restes-recontrole PROFIL=iphone QUI=julie NUIT=1" PROFIL=iphone QUI=julie NUIT=1 node "$S/clients-restes-recontrole.js"
if [ -n "$AVEC_TOUS" ]; then for p in ipad windows; do lance "clients-restes-recontrole PROFIL=$p QUI=marc" PROFIL=$p QUI=marc node "$S/clients-restes-recontrole.js"; done; for p in iphone android petit; do lance "clients-restes-recontrole PROFIL=$p QUI=marc NUIT=1" PROFIL=$p QUI=marc NUIT=1 node "$S/clients-restes-recontrole.js"; done; fi
if [ -n "$AVEC_TOUS" ]; then for p in ipad windows; do lance "clients-restes PROFIL=$p QUI=marc" PROFIL=$p QUI=marc node "$S/clients-restes.js"; done; for p in android petit; do lance "clients-restes PROFIL=$p QUI=marc NUIT=1" PROFIL=$p QUI=marc NUIT=1 node "$S/clients-restes.js"; done; fi

# Le recontrôle ADVERSE du tour 2 (19 novembre) : historique après « Abandonner » (H), Devis IA et client archivé (V), Ctrl+Z regardé (U), recherche archivés (R), numéros limites (T), rangement à toutes les largeurs (W), toutes les sorties de la fiche (S).
# ⚠️ H3, V1, R1 et R2 TOMBENT tant que ces défauts ne sont pas corrigés (restes-clients-tour2-recontrole.json) : ce sont des constats, pas du bruit.
lance "clients-restes2-adverse PROFIL=mac QUI=marc" PROFIL=mac QUI=marc node "$S/clients-restes2-adverse.js"
lance "clients-restes2-adverse PROFIL=iphone QUI=julie NUIT=1" PROFIL=iphone QUI=julie NUIT=1 node "$S/clients-restes2-adverse.js"

# Les restes des tours 3 et 4 (19 novembre) : l'historique après « Abandonner », la recherche dans « Archivés », la dictée, « Se déconnecter » avec une saisie, le fil de la Comptabilité sous le nom ACTUEL du client. Le gérant sur ordinateur, le secrétariat sur téléphone (ses droits changent le message de la dictée).
for f in clients-restes3-adverse clients-restes4-adverse; do
  lance "$f PROFIL=mac QUI=marc" PROFIL=mac QUI=marc node "$S/$f.js"
  lance "$f PROFIL=iphone QUI=julie NUIT=1" PROFIL=iphone QUI=julie NUIT=1 node "$S/$f.js"
  if [ -n "$AVEC_TOUS" ]; then lance "$f PROFIL=ipad QUI=julie" PROFIL=ipad QUI=julie node "$S/$f.js"; lance "$f PROFIL=windows QUI=marc NUIT=1" PROFIL=windows QUI=marc NUIT=1 node "$S/$f.js"; for p in android petit; do lance "$f PROFIL=$p QUI=marc" PROFIL=$p QUI=marc node "$S/$f.js"; done; fi
done

# Le clavier n'existe que sur ordinateur : mac et windows.
lance "clients-clavier PROFIL=mac" PROFIL=mac node "$S/clients-clavier.js"
lance "clients-clavier PROFIL=windows" PROFIL=windows node "$S/clients-clavier.js"

echo "TOTAL : $n exécution(s) · $ko tombée(s)" | tee -a "$J"
echo FINI | tee -a "$J"
[ $ko -eq 0 ]
