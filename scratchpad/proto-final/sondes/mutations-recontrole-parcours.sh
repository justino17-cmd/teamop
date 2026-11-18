#!/bin/bash
# CONTRE-ÉPREUVE du recontrôle des parcours (18 novembre 2026) : on casse EXPRÈS trois endroits de la page, dans une COPIE de apercu/ (jamais dans le dépôt),
# et on regarde quelle sonde tombe. Une mutation qui ne fait tomber ni parcours-1, ni parcours-2, ni parcours-10 prouve un TROU des douze parcours
# (ils jouent des valeurs rondes : jamais de quantité décimale, jamais de paiement en deux fois) ; c'est recontrole-parcours.js qui doit alors tomber.
#   A : la fenêtre de paiement du client demande le TOTAL au lieu du reste dû       → depuis le 18 novembre les parcours 2 (chèque de 100,07 puis carte) et 10 (chèque de 60,01 puis carte) tombent, et R=5 aussi
#   B : une quantité décimale « 2,5 » se lit « 2 » (parseInt)                      → depuis le 18 novembre le parcours 1 (« Liquide de nettoyage » 2,5 × 12,49) et le 10 (« Nettoyant » 2,5) tombent, et R=1 aussi
#   C : le TTC s'arrondit vers le bas au lieu du centime le plus proche                          → parcours-2 tombe (7 ✗) ET R=1 (R1-11) : celle-là, les parcours la voyaient déjà
# ⛔ 127.0.0.1 seulement. Un seul navigateur à la fois. Rend une ligne par couple (mutation, sonde) puis FINI.
ICI="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$ICI/../../.." && pwd)"
M="$(mktemp -d)"; trap 'rm -rf "$M"' EXIT
cp -r "$REPO/apercu" "$M/apercu"; for d in icons vitrine sons; do [ -d "$REPO/$d" ] && ln -s "$REPO/$d" "$M/$d"; done
export RACINE="$M"; cd "$ICI" || exit 1
muter() { python3 - "$1" "$REPO/apercu/prototype-op-gestion.html" "$M/apercu/prototype-op-gestion.html" <<'PY'
import sys
k, src, dst = sys.argv[1:4]
s = open(src, encoding='utf-8').read()
muts = {
 'A': ("const m = cpR(restant(f));", "const m = cpR(ttcDe(f));"),
 'B': ("parseFloat(String(l.q).replace(',','.')) > 0 && !/[a-z]/i.test(l.q) ? parseFloat(String(l.q).replace(',','.'))", "parseFloat(String(l.q).replace(',','.')) > 0 && !/[a-z]/i.test(l.q) ? parseInt(String(l.q).replace(',','.'))"),
 'C': ("Math.floor((2 * h * (1000 + Math.round(tva * 10)) + 1000) / 2000)", "Math.floor((2 * h * (1000 + Math.round(tva * 10))) / 2000)"),
}
a, b = muts[k]
assert s.count(a) == 1, ('la mutation ' + k + ' ne vise plus une ligne unique : ' + str(s.count(a)))
open(dst, 'w', encoding='utf-8').write(s.replace(a, b))
PY
}
for m in A B C; do
  muter "$m" || { echo "mutation $m : IMPOSSIBLE (la page a changé)"; continue; }
  for s in parcours-1 parcours-2 parcours-10; do printf '%s sur %s : ' "$s" "$m"; PROFIL=mac timeout 200 node "$s.js" 2>&1 | grep -E '^== ' | tail -1; done
  printf 'recontrole-parcours R=1,5 sur %s : ' "$m"; R=1,5 timeout 280 node recontrole-parcours.js 2>&1 | grep -E '^== ' | tail -1
done
echo FINI
