#!/bin/bash
# Toutes les sondes du GUIDE DES NOUVEAUTÉS, l'une après l'autre (un seul navigateur à la fois : la machine est partagée).
# Usage : bash guide-tout.sh [rapide]   — « rapide » : un profil par famille, jour seulement (la passe complète dure une demi-heure sous charge).
# Chaque ligne rend « N ✓ · M ✗ » et le code de sortie compte : une sonde qui meurt après son bilan tombe aussi.
cd "$(dirname "$0")" || exit 2
R="${1:-complet}"; KO=0; TOT=""
jouer() {   # jouer <nom> <env...> -- <script>
  local nom="$1"; shift; local envs=(); while [ "$1" != "--" ]; do envs+=("$1"); shift; done; shift
  local sortie code bilan
  sortie=$(env "${envs[@]}" timeout 570 node "$1" 2>&1); code=$?
  bilan=$(printf '%s\n' "$sortie" | grep -oE '== [0-9]+ ✓ · [0-9]+ ✗' | tail -1)
  printf '%-60s %s  (sortie %s)\n' "$nom" "${bilan:-(pas de bilan)}" "$code"
  if [ "$code" != 0 ]; then KO=$((KO+1)); printf '%s\n' "$sortie" | grep -E '^ ✗' | head -6; fi
}
jouer "mots · mac · les quatre personnes"            PROFIL=mac QUI=marc,julie,sm,kb -- guide-mots.js
jouer "mots · iphone · gérant, bureau, technicienne" PROFIL=iphone QUI=marc,julie,sm -- guide-mots.js
jouer "lib · guide:true le laisse paraître"          PROFIL=mac -- guide-lib.js
jouer "voir · mac · les quatre personnes"            PROFIL=mac QUI=marc,julie,sm,kb -- guide-voir.js
jouer "voir · iphone · les quatre personnes"         PROFIL=iphone QUI=marc,julie,sm,kb -- guide-voir.js
jouer "fermer · mac · gérant et technicienne"        PROFIL=mac QUI=marc,sm -- guide-fermer.js
jouer "fermer · iphone · bureau et technicienne"     PROFIL=iphone QUI=julie,sm -- guide-fermer.js
jouer "première connexion · mac · gérant"            PROFIL=mac QUI=marc -- guide-premiere-connexion.js
jouer "première connexion · iphone · technicienne"   PROFIL=iphone QUI=sm -- guide-premiere-connexion.js
if [ "$R" = "rapide" ]; then
  jouer "mise en page · iphone · jour"               PROFIL=iphone QUI=marc,julie,sm NUIT=0 -- guide-mise-en-page.js
else
  for P in petit android iphone ipad; do jouer "mise en page · $P · jour et nuit"  PROFIL=$P QUI=marc,julie,sm NUIT=both -- guide-mise-en-page.js; done
  for P in mac mac720 windows; do jouer "mise en page · $P · jour et nuit"         PROFIL=$P QUI=marc,julie,sm NUIT=both -- guide-mise-en-page.js; done
  jouer "voir · android et petit écran · technicienne" PROFIL=android QUI=sm -- guide-voir.js
  jouer "voir · ipad · gérant et bureau"               PROFIL=ipad QUI=marc,julie -- guide-voir.js
fi
echo; echo "== $KO famille(s) en échec"
exit $((KO ? 1 : 0))
