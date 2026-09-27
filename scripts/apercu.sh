#!/usr/bin/env bash
# Fabrique le canal d'aperçu : des copies des pages en refonte, servies sous
# teamop.fr/apercu/, que Justin teste dans Safari AVANT que quoi que ce soit ne
# remplace les pages que les clients utilisent.
#
# Pourquoi un dossier sur main plutôt qu'une branche : GitHub Pages ne sert que
# main, et l'API n'accepte que l'origine teamop.fr (CORS). Un fichier local ne
# pourrait donc rien charger. Sous /apercu/, même origine, même session, vraies
# données — sans toucher aux points d'entrée des clients.
#
#   bash scripts/apercu.sh tour.html index.html   → construit apercu/ depuis la branche courante
#   bash scripts/apercu.sh portail                → les dix pages du portail et de ses voisines
#
# Ce script ne commite ni ne pousse rien : ça se fait à la main, en connaissance
# de cause (voir CLAUDE.md, section Aperçu).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# APERCU_SORTIE : un autre dossier que apercu/ — tests/test-836.js refait les copies à côté et les compare à celles
# du dépôt (« un aperçu plus vieux que la page qu'il double est pire que pas d'aperçu », CLAUDE.md)
SORTIE="${APERCU_SORTIE:-apercu}"
mkdir -p "$SORTIE"

RUBAN='<div id="apercu-ruban" style="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99999;font:600 12px/1 -apple-system,system-ui,sans-serif;letter-spacing:.06em;color:#fff;background:#B26E12;padding:8px 14px;border-radius:99px;box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:none">APERÇU · refonte en cours</div>'

# Le portail et les pages vers lesquelles le site envoie (27 septembre 2026 au soir, Justin : « au niveau des
# connexions ou création de compte, j'ai pas mon thème »). Leurs copies d'aperçu se renvoient LES UNES AUX AUTRES
# et vers le site d'aperçu (apercu/site/) : sinon un clic sur « Mentions légales » depuis l'aperçu ramenait à la
# page en service, dans l'ancien thème — et l'aperçu disait faux sur ce que le client verra.
PORTAIL="espace.html connexion.html reinit.html recap-abonnement.html merci.html mentions-legales.html confidentialite.html sous-traitance.html registre-traitements.html 404.html"

# <base href="/"> : les chemins relatifs (icônes, autres pages) résolvent vers la
# racine, comme si la page était à sa vraie place.
apercu_page() {
  local src="$1" dst="$SORTIE/$1" famille=""
  [ -f "$src" ] || { echo "absent : $src"; return 1; }
  case " $PORTAIL " in *" $1 "*) famille="portail" ;; esac
  # OP GESTION : l'aperçu doit avoir SES données (préfixe elanB_, espace de synchro
  # bêta), exactement comme beta.html — sinon il écrirait dans les vraies.
  if [ "$src" = "app.html" ]; then
    node beta-build.js "$SORTIE/app.source.html" >/dev/null
    src="$SORTIE/app.source.html"
  fi
  python3 - "$src" "$dst" "$RUBAN" "$famille" <<'PY'
import sys, io, re
src, dst, ruban, famille = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
s = io.open(src, encoding='utf-8').read()
if '<base ' not in s:
    s = re.sub(r'(<head[^>]*>)', r'\1<base href="/">', s, count=1)
# jamais de service worker depuis un aperçu : il prendrait le contrôle du vrai site
s = re.sub(r"navigator\.serviceWorker\.register\(", "(function(){return Promise.reject(new Error('aperçu : pas de service worker'))})(", s)
if famille == 'portail':
    # un aperçu ne se référence pas (espace.html, recap et les pages juridiques n'ont pas de noindex à elles)
    if 'name="robots"' not in s:
        s = s.replace('<base href="/">', '<base href="/"><meta name="robots" content="noindex">', 1)
    # les pages de la famille → leur copie d'aperçu ; le site → le site d'aperçu. Les APPLICATIONS (app, messages,
    # tour) restent les vraies : l'aperçu habille le portail, il ne double pas OP GESTION.
    # ⛔ Sauf la VALEUR du retour après connexion (`encodeURIComponent('recap-abonnement.html…')`) : espace.html
    # n'accepte qu'un nom de page nu (RETOUR_PAIEMENT, chemin strictement contrôlé) — c'est la navigation qui
    # l'emmène dans l'aperçu, ci-dessous.
    fam = 'espace|connexion|reinit|recap-abonnement|merci|mentions-legales|confidentialite|sous-traitance|registre-traitements'
    s, n1 = re.subn(r"""(?<!encodeURIComponent\()(["'(])/?(""" + fam + r""")\.html""", r"\1/apercu/\2.html", s)
    s, n2 = re.subn(r"""(["'(])/?(index|tarifs|applications|creer|elan|metiers|opmessages|pourquoi)\.html""", r"\1/apercu/site/\2.html", s)
    s, n3 = re.subn(r"location\.href=RETOUR_PAIEMENT;", "location.href='/apercu/'+RETOUR_PAIEMENT;", s)
    # l'adresse d'une entreprise (teamop.fr/e/nom) passe par la page d'erreur EN SERVICE : dans l'aperçu, on va
    # droit à la connexion d'aperçu, qui lit ?e= exactement comme quand 404.html l'y envoie
    s, n4 = re.subn(r"location\.href='/e/'\+", "location.href='/apercu/connexion.html?e='+", s)
    s, n5 = re.subn(r"history\.replaceState\(null,'','/e/'\+adr\)", "history.replaceState(null,'','/apercu/connexion.html?e='+adr)", s)
    print(f"   liens : {n1} vers le portail d'aperçu, {n2} vers le site d'aperçu, {n3} retour(s) de paiement, {n4 + n5} adresse(s) d'entreprise")
s = s.replace('</body>', ruban + '</body>', 1) if '</body>' in s else s + ruban
io.open(dst, 'w', encoding='utf-8').write(s)
print(f"{dst}  ({len(s)//1024} Ko)")
PY
}

[ $# -eq 0 ] && set -- tour.html
[ "$*" = "portail" ] && set -- $PORTAIL
for page in "$@"; do apercu_page "$page"; done
rm -f "$SORTIE/app.source.html"
