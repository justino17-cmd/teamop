#!/usr/bin/env bash
# Ce qui peut partir sur `main` quand on publie la BÊTA : beta.html (et REPRISE.md), RIEN d'autre.
#
# ⛔ Pris le 28 octobre 2026 (relecture adverse du pack nettoyage) : le commit de la branche de travail contenait aussi demo.html (régénéré
# en v778 : servi PUBLIQUEMENT sur teamop.fr, il aurait publié le pack nettoyage dans la démonstration publique, sans phrase de Justin, alors
# que rien ne se publie en version publique tant que le serveur n'est pas séparé de Firebase) et sw.js (cache v978 pour un app.html public
# resté en v773 : le couple version/cache est cassé). beta.html n'est jamais mis en cache par le service worker : il n'a besoin de rien d'autre.
#
# Usage : bash scripts/verifier-publication-bete.sh [base] [tête]
#   - sans argument : compare l'INDEX (ce qui est prêt à être commité) à HEAD ;
#   - avec une base (par défaut origin/main) et une tête : compare les deux (une demande de fusion déjà bâtie).
# Sort en 1 et NOMME chaque fichier de trop.
set -euo pipefail
AUTORISES=("beta.html" "REPRISE.md")
if [ "$#" -ge 1 ]; then
  base="$1"; tete="${2:-HEAD}"
  liste=$(git diff --name-only "$base" "$tete")
  quoi="$base..$tete"
else
  liste=$(git diff --cached --name-only)
  quoi="l'index"
fi
if [ -z "$liste" ]; then echo "publication bêta : rien à publier ($quoi est vide)"; exit 1; fi
trop=()
while IFS= read -r f; do
  [ -z "$f" ] && continue
  ok=0
  for a in "${AUTORISES[@]}"; do [ "$f" = "$a" ] && ok=1; done
  [ "$ok" -eq 0 ] && trop+=("$f")
done <<< "$liste"
if [ "${#trop[@]}" -gt 0 ]; then
  echo "publication bêta REFUSÉE ($quoi) : seuls beta.html et REPRISE.md partent sur main. En trop :"
  for f in "${trop[@]}"; do echo "  - $f"; done
  echo "(demo.html, sw.js et app.html restent sur la branche : rien en version publique sans une phrase de Justin)"
  exit 1
fi
echo "publication bêta : OK ($quoi ne touche que beta.html / REPRISE.md)"
