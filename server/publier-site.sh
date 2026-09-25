#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════════
#  Pose les fichiers du site dans /opt/teamop/site — ÉTAPE G, PAS ENCORE EN SERVICE
# ══════════════════════════════════════════════════════════════════════════════════════════════
#
#  ⛔ CE SCRIPT S'EXÉCUTE SUR LE VPS, et il n'est branché sur RIEN pour l'instant : ni sur
#     `deploiement.yml`, ni sur un `cron`. Tant que le DNS de `teamop.fr` pointe sur GitHub
#     Pages, ce qu'il pose n'est servi à personne. C'est voulu — voir `nginx-teamop.conf`.
#
#  ⛔ ET LE JOUR OÙ ON LE BRANCHE, IL FAUT SAVOIR CE QU'ON BRANCHE.
#     `deploiement.yml` ne part aujourd'hui que sur `server/**`. Y ajouter le site ferait
#     partir un déploiement à CHAQUE poussée sur `main` — donc `app.html` aussi. Ce n'est pas
#     plus permissif qu'aujourd'hui (GitHub Pages publie déjà tout `main` en quelques minutes),
#     mais ça déplace la règle de Justin d'un endroit à un autre, et ça se décide, ça ne se
#     glisse pas dans un `paths:`.
#
#  ── CE QU'IL FAIT ──────────────────────────────────────────────────────────────────────────
#  Copie depuis /opt/teamop/repo vers /opt/teamop/site, en ne prenant QUE ce qui doit être
#  servi, et en une seule bascule : on remplit un dossier à côté, puis on renomme. Un `rsync`
#  direct sur le dossier servi laisse, pendant quelques secondes, un site à moitié à jour —
#  une page neuve qui appelle un fichier qui n'est pas encore là. C'est la même règle que
#  `espacesEcrire()` dans ce dépôt : temporaire, puis renommage.

set -euo pipefail

REPO="${TEAMOP_REPO:-/opt/teamop/repo}"
CIBLE="${TEAMOP_SITE:-/opt/teamop/site}"
NEUF="${CIBLE}.neuf"
ANCIEN="${CIBLE}.ancien"

[ -d "$REPO" ] || { echo "dépôt introuvable : $REPO"; exit 1; }

# ── CE QUI SE SERT ────────────────────────────────────────────────────────────────────────
# Une liste BLANCHE, pas une liste noire. Une liste noire oublie toujours le fichier suivant —
# et ici « oublier » veut dire publier. `nginx-teamop.conf` refuse les mêmes chemins de son
# côté : ceinture et bretelles, parce que ces deux fichiers se modifient à des moments
# différents et par des gestes différents.
#
# ⛔ `beta.html`, `messages-beta.html` et `dev.html` NE SONT PAS DANS LA LISTE. La bêta est un
#    outil d'équipe, jamais un canal public (CLAUDE.md). Elle est servie par GitHub Pages
#    aujourd'hui ; si le site déménage, il faudra décider où elle vit — pas la recopier ici
#    par réflexe. `tour.html` non plus : son authentification est CÔTÉ JAVASCRIPT, donc la
#    page se télécharge entière par n'importe qui (mesuré : 633 Ko à un anonyme, 19 septembre
#    2026). Tant qu'elle est comme ça, elle ne gagne rien à être sur deux hébergeurs.
PAGES=(
  index.html 404.html
  applications.html elan.html opmessages.html metiers.html tarifs.html pourquoi.html
  connexion.html creer.html creer-application.html recap-abonnement.html merci.html
  espace.html messages.html app.html reinit.html
  mentions-legales.html confidentialite.html sous-traitance.html registre-traitements.html
  guide-email.html
  sw.js fond-anime-teamop.js op-fs.js
  manifest.webmanifest manifest-teamop.webmanifest manifest-opmsg.webmanifest
)
DOSSIERS=( icons sons )

rm -rf "$NEUF"
mkdir -p "$NEUF"

manquants=0
for f in "${PAGES[@]}"; do
  if [ -f "$REPO/$f" ]; then
    cp -p "$REPO/$f" "$NEUF/$f"
  else
    # ⛔ ON LE DIT, ON NE L'AVALE PAS. Un fichier absent de la liste, c'est une page qui rend
    # 404 chez un client — et un script qui se tait laisse découvrir ça par un appel.
    echo "⚠ absent du dépôt, donc pas publié : $f"
    manquants=$((manquants + 1))
  fi
done

for d in "${DOSSIERS[@]}"; do
  [ -d "$REPO/$d" ] && cp -a "$REPO/$d" "$NEUF/$d"
done

# ── LE CONTRÔLE QUI COMPTE : EST-CE QUE ÇA RESSEMBLE À UN SITE ? ──────────────────────────
# Un `cp` qui échoue à moitié, un dépôt à moitié cloné, un disque plein : on ne bascule pas
# sur un dossier vide. `index.html` et `app.html` sont les deux qu'on ne peut pas perdre.
for indispensable in index.html app.html sw.js; do
  [ -s "$NEUF/$indispensable" ] || { echo "✗ $indispensable absent ou vide — on ne bascule pas"; rm -rf "$NEUF"; exit 1; }
done
# `app.html` fait plus de 2,6 Mo : un fichier tronqué passerait le test « non vide ».
TAILLE=$(stat -c%s "$NEUF/app.html")
[ "$TAILLE" -gt 1000000 ] || { echo "✗ app.html ne fait que $TAILLE octets — tronqué ? on ne bascule pas"; rm -rf "$NEUF"; exit 1; }

# ── LA BASCULE, EN UN GESTE ───────────────────────────────────────────────────────────────
rm -rf "$ANCIEN"
[ -d "$CIBLE" ] && mv "$CIBLE" "$ANCIEN"
mv "$NEUF" "$CIBLE"
rm -rf "$ANCIEN"

echo "site publié dans $CIBLE — $(find "$CIBLE" -type f | wc -l) fichier(s), app.html : $((TAILLE / 1024)) Ko"
[ "$manquants" -gt 0 ] && echo "⚠ $manquants fichier(s) de la liste manquaient au dépôt"
exit 0
