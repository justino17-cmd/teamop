#!/usr/bin/env bash
# ⛔ PRÉPARE — SANS RIEN POUSSER — LE COMMIT QUI DÉPLOIE LE SERVEUR SEUL SUR `main`.
#
# Justin, 23 septembre 2026 : « on ne publie rien en version publique tant que le serveur n'est
# pas fait à part de Firebase ». `app.html` et `sw.js` ne bougent pas sur `main` ; seul
# `server/` part, avec ce qui le SURVEILLE (`.github/scripts/surveillance.js`, qui lit les champs
# de `/health`) et ce qui le GARDE (les suites de `scripts/bancs-serveur.liste`, lancées par le
# job `bancs` dont le déploiement dépend) — plus les pages qui parlent au serveur (paiement, remerciement, Tour) et
# que ces suites lisent (`PAGES_LIEES`).
#
# ⛔ CE SCRIPT NE POUSSE RIEN. Pousser sur `main` un commit qui touche `server/**` DÉPLOIE LE VPS
# en quelques minutes, chez tous les clients : c'est une décision de Justin, jamais d'un agent.
# Il fabrique le commit dans un arbre à part, lance les bancs, et affiche la commande — c'est tout.
#
# ⛔ POURQUOI UN SCRIPT PLUTÔT QU'UNE MARCHE À SUIVRE. Le commit mélange trois sources (le `main`
# du moment, le serveur de la branche, deux workflows réécrits) ; le refaire à la main, c'est
# oublier une pièce — et la pièce oubliée est toujours celle qui garde (le `needs`, la liste,
# la surveillance). Relancé demain, il repart du `main` de demain.
#
# ⛔ ET `server-msg/` PART AVEC (OP MESSAGES, service à part — design/opmessages/SERVEUR.md § 3.10) : son code, son
# workflow de déploiement (`deploiement-messages.yml`), sa liste de bancs (`scripts/bancs-messages.liste`), sa surveillance,
# le mode d'emploi de son installation, et les suites de la liste. Sans eux, rien d'OP MESSAGES n'arriverait jamais sur
# `main` — et le workflow n'a de sens qu'AVEC ses bancs. Un push sur `server-msg/**` ne redémarre pas `teamop-api` : les
# deux services se déploient chacun par son workflow, et ne partagent que la machine.
#
# Usage : bash scripts/preparer-deploiement-serveur.sh [dossier-de-l-arbre]
set -euo pipefail
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$(git -C "$RACINE" rev-parse HEAD)"
DEST="${1:-$(mktemp -d)/deploiement-serveur}"

# 0. On déploie ce qui est COMMITÉ, jamais un brouillon : un fichier modifié et non commité
#    partirait sans être dans l'historique de la branche, donc sans avoir été relu.
if ! git -C "$RACINE" diff --quiet || ! git -C "$RACINE" diff --cached --quiet; then
  echo "✗ l'arbre de la branche n'est pas propre — commite d'abord (git status)"; exit 1
fi
git -C "$RACINE" fetch -q origin main
[ -e "$DEST" ] && { echo "✗ $DEST existe déjà — donne un autre dossier"; exit 1; }
git -C "$RACINE" worktree add -q --detach "$DEST" origin/main
cd "$DEST"
BASE="$(git rev-parse --short HEAD)"
echo "arbre : $DEST (main = $BASE, branche = ${SOURCE:0:8})"

# 1. Ce qui part : le serveur, sa surveillance, le compteur et sa liste, et les suites de la liste.
# ⚠️ Le script lui-même part aussi : `test-728` (dans la liste) le relit, et c'est lui qui dit
#    comment ce commit a été fait. Oublié à la première exécution — et c'est la porte qui l'a dit.
git checkout -q "$SOURCE" -- server .github/scripts/surveillance.js scripts/bancs-ci.sh scripts/bancs-serveur.liste \
  scripts/preparer-deploiement-serveur.sh
mapfile -t SUITES < <(grep -vE '^[[:space:]]*(#|$)' scripts/bancs-serveur.liste)
# ⚠️ Une liste vide ou tronquée ferait passer la porte sur rien : on exige la population.
[ "${#SUITES[@]}" -ge 25 ] || { echo "✗ la liste des bancs serveur n'a que ${#SUITES[@]} suite(s)"; exit 1; }
for f in "${SUITES[@]}"; do git checkout -q "$SOURCE" -- "$f"; done

# 1 bis. OP MESSAGES : le service, son workflow, sa liste, sa surveillance, son mode d'emploi, l'aide partagée des bancs.
# ⚠️ `tests/bac-messages.js` n'est pas une suite (le compteur ne le lance pas) mais `test-931` et `test-932` le chargent :
#    oublié, ils tomberaient ici sur « module introuvable », sur un déploiement juste.
# ⚠️ Et `tests/outils-msg.js` + `tests/lib-horloge-msg.js` : l'aide partagée des suites 900 à 910 (le service lancé en processus,
#    le faux OP GESTION, l'horloge décalable). Oubliés à la fusion des deux chantiers, la porte d'OP MESSAGES tombait sur « module
#    introuvable » sur un déploiement juste.
# ⚠️ Et `tests/outils-tel.js` (l'aide des suites 914 à 919 du compte par téléphone : faux OVH, numéros d'essai) et
#    `scripts/opmsg-public.js` (le générateur de l'interface servie, que `test-941` exécute) : oubliés le 2 octobre 2026, six
#    suites mouraient ici sur « module introuvable » — la porte l'a dit, sur un déploiement juste. Et le générateur RELIT
#    `apercu/opmessages/index.html`, le modèle d'où sort `server-msg/public/` (test-941 exige qu'ils soient d'accord) : l'aperçu
#    part donc avec lui — une page d'aperçu à données fictives, aucun point d'entrée client ne change.
OPMSG_FICHIERS=(server-msg .github/workflows/deploiement-messages.yml .github/scripts/surveillance-messages.js
                scripts/bancs-messages.liste design/opmessages tests/bac-messages.js tests/outils-msg.js tests/lib-horloge-msg.js
                tests/outils-tel.js scripts/opmsg-public.js apercu/opmessages .gitignore)
for f in "${OPMSG_FICHIERS[@]}"; do git checkout -q "$SOURCE" -- "$f"; done
mapfile -t SUITES_MSG < <(grep -vE '^[[:space:]]*(#|$)' scripts/bancs-messages.liste)
# ⚠️ Même exigence que pour la liste du serveur : une liste vide ou tronquée ferait passer la porte sur rien.
[ "${#SUITES_MSG[@]}" -ge 5 ] || { echo "✗ la liste des bancs d'OP MESSAGES n'a que ${#SUITES_MSG[@]} suite(s)"; exit 1; }
for f in "${SUITES_MSG[@]}"; do git checkout -q "$SOURCE" -- "$f"; done
# ⚠️ Les pages que ces suites font parler au serveur partent avec lui : `test-797`, `test-839` et `test-840` lisent la
#    page de paiement (ses refus, sa grille de prix). Restée celle de `main`, elle ne saurait pas DIRE le refus que le
#    serveur neuf rend — et les bancs tomberaient ici, sur un serveur juste (relecture adverse, 28 septembre 2026, nuit).
#    ⚠️ Et la page de remerciement (29 septembre 2026, « 2 oui ») : `test-839` exécute la VRAIE `merci.html` au retour
#    de Stripe (« Abonnement confirmé — rien n'est prélevé avant le … ») ; restée celle de `main`, elle ne lit pas
#    `?debut=` et la couture tombe (relevé par `relecteur`).
#    ⚠️ Et la Tour (29 septembre 2026, soir, carte refusée = impayé) : le serveur neuf rend `impaye`, `impayeStripe` et
#    `impayesPartiels` à `/api/monitor/espaces/liste` ; restée celle de `main`, la Tour afficherait « la cliente garde son
#    accès jusqu'à ce que ce soit réglé » et « Formule attribuée, jamais payée » à côté d'une entreprise grisée — et
#    treize suites de la liste lisent `tour.html` (relevé par `relecteur`).
PAGES_LIEES=(recap-abonnement.html apercu/recap-abonnement.html merci.html apercu/merci.html tour.html apercu/tour.html)
for f in "${PAGES_LIEES[@]}"; do git checkout -q "$SOURCE" -- "$f"; done

# 2. Les deux workflows de la branche — la ligne des bancs lance la LISTE, pas tout (voir
#    l'en-tête de la liste). ⚠️ Remplacement exact, compté : un workflow dont la ligne a changé
#    de forme ne doit pas partir tel quel, avec la suite complète qui tomberait à chaque poussée.
git checkout -q "$SOURCE" -- .github/workflows/deploiement.yml .github/workflows/ci.yml
node -e '
  const fs = require("fs");
  const avant = "run: bash scripts/bancs-ci.sh\n";
  const apres = "run: BANCS_PLANCHER=$(sed -n \x27s/^#plancher //p\x27 scripts/bancs-serveur.liste) bash scripts/bancs-ci.sh $(grep -vE \x27^[[:space:]]*(#|$)\x27 scripts/bancs-serveur.liste)\n";
  for (const w of [".github/workflows/deploiement.yml", ".github/workflows/ci.yml"]) {
    const s = fs.readFileSync(w, "utf8");
    const n = s.split(avant).length - 1;
    if (n !== 1) { console.error("✗ " + w + " : ligne des bancs trouvée " + n + " fois"); process.exit(1); }
    fs.writeFileSync(w, s.replace(avant, apres));
  }'

# 3. Les preuves, dans cet arbre-là — contre les pages que `main` sert VRAIMENT.
[ -d "$RACINE/server/node_modules" ] || { echo "✗ $RACINE/server/node_modules manque : les suites qui montent le serveur SAUTERAIENT, vertes sans rien prouver"; exit 1; }
# ⛔ Le lien ne doit JAMAIS finir dans le commit, même si un banc tombe : on le retire à la sortie,
#    quelle qu'elle soit (un arbre laissé avec lui, puis commité à la main, pousserait un lien
#    vers le disque d'une session morte).
[ -d "$RACINE/server-msg/node_modules" ] || { echo "✗ $RACINE/server-msg/node_modules manque (npm ci --omit=dev --ignore-scripts --prefix server-msg) : les suites d'OP MESSAGES SAUTERAIENT, vertes sans rien prouver"; exit 1; }
trap 'rm -f "$DEST/server/node_modules" "$DEST/server-msg/node_modules"' EXIT
ln -s "$RACINE/server/node_modules" server/node_modules
ln -s "$RACINE/server-msg/node_modules" server-msg/node_modules
for f in server/*.js; do node --check "$f"; done
find server-msg -name '*.js' -not -path '*/node_modules/*' -print0 | xargs -0 -n1 node --check
for f in server-msg/*.sh; do bash -n "$f"; done
node scripts/verifier-syntaxe.js >/dev/null
BANCS_PLANCHER="$(sed -n 's/^#plancher //p' scripts/bancs-serveur.liste)" bash scripts/bancs-ci.sh "${SUITES[@]}"
# Et la porte d'OP MESSAGES — celle que son workflow lance avant de déployer, avec SON plancher (la liste du serveur n'a
# pas le même nombre de vérifications : un seul plancher ferait passer l'une ou bloquer l'autre).
BANCS_PLANCHER="$(sed -n 's/^#plancher //p' scripts/bancs-messages.liste)" bash scripts/bancs-ci.sh "${SUITES_MSG[@]}"
# ⛔ ET LA SUITE COMPLÈTE DE CET ARBRE, TELLE QUE « Vérification des pages » LA JOUERA SUR MAIN APRÈS LA POUSSÉE. Les deux
#    listes ne suffisent pas : les pages qui partent avec le serveur (`PAGES_LIEES`, `apercu/opmessages`…) sont LUES par des
#    suites qui ne sont dans aucune liste, et qui restent celles de main. Le 2 octobre 2026, `fa32298` est parti avec la Tour
#    v2.81 et la page de paiement neuve : cinq suites de main les attendaient d'avant, et la CI de main est passée au rouge
#    APRÈS la mise en ligne — le serveur était juste, mais un main rouge ne garde plus rien. On rejoue donc tout, ICI, avant
#    le commit. ⚠️ Ce que cet arbre ne peut pas voir : la version de Node de GitHub (22.23, celle du VPS) quand la machine de
#    travail en a une autre — `test-913` tombait LÀ-BAS seulement. Une suite qui dépend du moment ou de la version se joue au
#    geste (voir son en-tête), jamais au hasard d'une machine.
bash scripts/bancs-ci.sh
rm server/node_modules server-msg/node_modules

# 4. Le commit — dans l'arbre à part, JAMAIS poussé par ce script.
# PIED_COMMIT (facultatif) : les lignes de fin du message (l'attribution de la session qui prépare), passées par
# l'environnement — un commit déjà fait ne se réécrit pas après coup (« amend » d'un déploiement, refusé le 2 octobre 2026).
# La version d'application se LIT sur le main de l'arbre : écrite en dur (« v695 »), elle a menti dans le message
# du déploiement du 27 septembre 2026, main étant alors en v757.
VAPP="$(sed -n "s/.*APP_VERSION *= *'\([0-9]*\)'.*/\1/p" app.html | head -1)"
[ -n "$VAPP" ] || { echo "✗ APP_VERSION illisible dans app.html de main"; exit 1; }
git add server .github/scripts/surveillance.js .github/workflows/deploiement.yml .github/workflows/ci.yml \
        scripts/bancs-ci.sh scripts/bancs-serveur.liste scripts/preparer-deploiement-serveur.sh "${SUITES[@]}" "${PAGES_LIEES[@]}" \
        "${OPMSG_FICHIERS[@]}" "${SUITES_MSG[@]}"
git diff --cached --name-only | grep -q 'node_modules' && { echo "✗ node_modules dans le commit — rien ne se fait"; exit 1; }
git -c user.name="$(git -C "$RACINE" config user.name || echo TeamOP)" \
    -c user.email="$(git -C "$RACINE" config user.email || echo noreply@teamop.fr)" \
    commit -q -F - <<MSG
Serveur seul : déploiement depuis ${SOURCE:0:8} (app.html et sw.js ne bougent pas : v${VAPP})

server/, sa surveillance (.github/scripts/surveillance.js) et ses bancs
(scripts/bancs-serveur.liste, lancés par le job « bancs » dont le déploiement dépend).
Les pages que ces bancs font parler au serveur partent avec lui : ${PAGES_LIEES[*]}.
server-msg/ (OP MESSAGES, service à part), son workflow (deploiement-messages.yml) et ses bancs
(scripts/bancs-messages.liste) : la bêta se déploie à chaque poussée sur server-msg/, la production
jamais sans l'approbation de l'environnement msg-prod.
Préparé par scripts/preparer-deploiement-serveur.sh sur main = $BASE.${PIED_COMMIT:+

$PIED_COMMIT}
MSG
echo
git --no-pager diff --stat "$BASE" HEAD | tail -5
echo
echo "✓ commit prêt : $(git rev-parse --short HEAD) — RIEN N'A ÉTÉ POUSSÉ."
echo "  ⛔ Pousser déploie le VPS chez tous les clients. Sur décision de Justin seulement :"
echo "     git -C \"$DEST\" push origin HEAD:main"
