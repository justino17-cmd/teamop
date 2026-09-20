#!/usr/bin/env bash
# Lance TOUTES les suites de tests/, suite par suite, et sort en 1 si l'une d'elles échoue.
#
# ⛔ POURQUOI CE FICHIER EXISTE PLUTÔT QU'UN BLOC `run:` RECOPIÉ DANS DEUX WORKFLOWS.
# Depuis le 19 septembre 2026, le déploiement du VPS attend ce script (deploiement.yml) ET la
# CI le lance sur toute branche (ci.yml). Deux copies d'un compteur divergent toujours — et
# c'est précisément un compteur faux qui a fait écrire « 2 598 » dans CLAUDE.md pour 2 989.
#
# ⛔ ON COMPTE SUITE PAR SUITE, EN PRENANT LE DERNIER TOTAL DE CHAQUE SORTIE. Un `grep -c` sur
# les ✓ ment EN MOINS : sept suites (716 à 722) impriment leur total dans un bandeau d'un
# autre format et seraient sautées EN SILENCE.
#
# ⛔ ET ON REGARDE LE CODE DE SORTIE AUTANT QUE LE BANDEAU. Un banc qui imprime « 12 ✓ 0 ✗ »
# puis MEURT (une exception dans du code asynchrone, un fichier manquant après le total) a
# l'air vert et ne l'est pas. La première version de ce compteur faisait `|| true` sur
# l'exécution : elle jetait le code de sortie. Relevé par la troisième vérification.
set -uo pipefail
cd "$(dirname "$0")/.."

echecs=0; total=0; suites=0; coupables=''
for f in tests/test-*.js; do
  sortie=$(node "$f" 2>&1); rc=$?
  suites=$((suites+1))
  ligne=$(printf '%s\n' "$sortie" | grep -oE '[0-9]+ ✓ +[0-9]+ ✗' | tail -1)

  if [ -z "$ligne" ]; then
    echo "::error::$f n'a rendu AUCUN total — il s'est interrompu avant la fin"
    printf '%s\n' "$sortie" | tail -15
    echecs=$((echecs+1)); coupables="$coupables $f(interrompu)"; continue
  fi

  ok=$(printf '%s' "$ligne" | grep -oE '^[0-9]+')
  ko=$(printf '%s' "$ligne" | grep -oE '[0-9]+ ✗' | grep -oE '[0-9]+')
  total=$((total+ok))

  if [ "$ko" != "0" ]; then
    echo "::error::$f : $ko échec(s)"
    printf '%s\n' "$sortie" | grep '✗' | head -20
    echecs=$((echecs+1)); coupables="$coupables $f($ko✗)"; continue
  fi

  # Vert au bandeau, mort au retour : c'est un échec, et il est plus grave qu'un ✗.
  if [ "$rc" != "0" ]; then
    echo "::error::$f a imprimé « $ligne » puis est mort (code $rc) — le total ment"
    printf '%s\n' "$sortie" | tail -15
    echecs=$((echecs+1)); coupables="$coupables $f(mort:$rc)"; continue
  fi
done

echo "$suites suites · $total vérifications"
# ⛔ LE NOM DU COUPABLE DOIT TENIR DANS LES TROIS DERNIÈRES LIGNES. Le détail de l'échec est
# imprimé plus haut, au moment où il survient — et c'est trop haut. Le 20 septembre 2026, une
# suite est tombée, la sortie a été lue par `| tail -3`, et le nom du banc est parti avec :
# une demi-heure à relancer les 94 suites une par une pour retrouver ce que ce script avait
# déjà écrit. Un compteur qui SAIT qui a échoué doit le redire À LA FIN, là où on regarde.
[ "$echecs" = "0" ] || {
  echo "::error::$echecs suite(s) en échec :$coupables"
  echo "::error::rien ne part chez un client."
  exit 1
}
exit 0
