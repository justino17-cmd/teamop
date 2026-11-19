#!/usr/bin/env bash
# TOUS LES BANCS, EN PARALLÈLE, SUR NOS MACHINES (19 novembre 2026) — la vérification que GitHub Actions faisait en 6 morceaux,
# jouée par la forge de l'atelier. Prouvé à la main le 18/11 : ~840 suites, ~47 000 vérifications, 7 minutes à 8 en parallèle.
#   bash scripts/atelier/bancs-paralleles.sh [parallélisme]        (depuis la racine du dépôt)
# Sort en 1 si une suite échoue (code de sortie non nul), en 2 si aucune suite n'a tourné : un ensemble vide ne passe jamais.
# Une suite qui échoue est REJOUÉE SEULE une fois : sous charge, quelques bancs minutés tombent (test-1016 le 18/11) ;
# un échec qui se reproduit seul est un vrai échec. Le verdict compte par le DERNIER « N ✓ M ✗ » et par le code de sortie.
set -uo pipefail
P="${1:-8}"
SORTIE="$(mktemp -d)"
trap 'rm -rf "$SORTIE"' EXIT
une() {
  f="$1"; n="$(basename "$f" .js)"; s="$(timeout 900 node "$f" 2>&1)"; c=$?
  t="$(printf '%s\n' "$s" | grep -aoE '[0-9]+ ✓ +[0-9]+ ✗' | tail -1)"
  echo "$n|$c|$t" >> "$SORTIE/resultats.txt"
  [ "$c" -ne 0 ] && printf '%s\n' "$s" | tail -40 > "$SORTIE/$n.echec.txt"
  return 0
}
export -f une; export SORTIE
ls tests/test-*.js | xargs -P "$P" -I{} bash -c 'une "$@"' _ {}
[ -s "$SORTIE/resultats.txt" ] || { echo "✗ aucune suite n'a tourné"; exit 2; }
echoues="$(awk -F'|' '$2!=0{print $1}' "$SORTIE/resultats.txt" | sort)"
vrais=""
for n in $echoues; do
  s="$(timeout 900 node "tests/$n.js" 2>&1)"; c=$?
  if [ "$c" -ne 0 ]; then vrais="$vrais $n"; echo "══ $n échoue (rejouée seule) :"; printf '%s\n' "$s" | grep -a '✗' | grep -avE '(^|[^0-9])0 ✗' | head -12; printf '%s\n' "$s" | tail -15
  else echo "≈ $n : tombée sous charge, verte rejouée seule"; fi
done
total="$(wc -l < "$SORTIE/resultats.txt")"
verif="$(awk -F'|' '{split($3,a," "); s+=a[1]} END{print s+0}' "$SORTIE/resultats.txt")"
echo "── $total suites, $verif vérifications"
if [ -n "$vrais" ]; then echo "SUITES EN ÉCHEC :$vrais"; exit 1; fi
echo "aucune suite en échec"
