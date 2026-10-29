#!/usr/bin/env bash
# Scanne un skill (ou un dossier de skills) AVANT de le recopier dans .claude/skills/ — avec SkillSpector (NVIDIA), toujours en mode statique.
#
#   bash scripts/scanner-skills.sh <dossier> [--recursive] [--json <fichier>] [--grossier]
#   bash scripts/scanner-skills.sh --aide
#
# ⛔ CE SCRIPT N'INSTALLE RIEN. Si SkillSpector manque, il dit comment l'installer (c'est du code tiers, et l'installer est une
#    décision de Justin, pas un geste automatique — le 28 octobre 2026, le classifieur de permissions de la session a refusé `uv pip install`
#    du dépôt cloné, et ce refus n'a pas été contourné) puis sort en 3 SANS VERDICT. « Pas de scanner » n'est jamais « scanné, rien trouvé ».
# ⛔ TOUJOURS `--no-llm`. Sans lui, SkillSpector envoie le CONTENU des fichiers scannés au fournisseur configuré (par défaut build.nvidia.com).
#    Ce script ne laisse pas l'option : il passe `--no-llm` à chaque appel et refuse `--llm`.
#    Même en `--no-llm`, la vérification des dépendances (SC4) envoie des NOMS et VERSIONS de paquets à api.osv.dev (jamais de contenu).
# ⛔ Un scan RÉDUIT le risque, il ne l'annule pas : ce n'est pas un bac à sable. La règle de CLAUDE.md (« Les skills tiers ») demande en plus
#    de RELIRE les scripts du skill à la main (réseau, exécution, fichiers touchés) avant de recopier.
# ⛔ Les rapports vont dans le dossier temporaire de la session (ou celui qu'on nomme), JAMAIS dans le dépôt.
#
# Codes de sortie : 0 = scan fait, risque <= 50 (SAFE ou CAUTION) · 1 = risque > 50 (DO_NOT_INSTALL) ou couverture incomplète · 2 = erreur
#                   (SkillSpector) · 3 = SkillSpector absent : AUCUN VERDICT · 4 = mauvais appel (ce script).
set -uo pipefail

SEUIL_MAX_SKILLS=100
aide() { sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; }

cible=''; recursif=0; json=''; grossier=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --aide|-h|--help) aide; exit 0 ;;
    --recursive) recursif=1 ;;
    --grossier) grossier=1 ;;
    --json) shift; json="${1:-}"; [ -n "$json" ] || { echo "--json demande un nom de fichier" >&2; exit 4; } ;;
    --llm|--no-llm) echo "Refusé : ce script passe toujours --no-llm et n'accepte pas d'option d'analyse par un modèle (le contenu des fichiers partirait chez un tiers)." >&2; exit 4 ;;
    -*) echo "Option inconnue : $1 (voir --aide)" >&2; exit 4 ;;
    *) [ -z "$cible" ] || { echo "Un seul dossier à la fois (reçu : $cible puis $1)" >&2; exit 4; }; cible="$1" ;;
  esac
  shift
done

[ -n "$cible" ] || { echo "Il manque le dossier à scanner. Exemple : bash scripts/scanner-skills.sh /chemin/vers/skill-a-installer" >&2; exit 4; }
[ -d "$cible" ] || { echo "Pas un dossier : $cible" >&2; exit 4; }

# Le balayage grossier est un SUBSTITUT de relecture, jamais un verdict : il ne remplace pas SkillSpector.
if [ "$grossier" -eq 1 ]; then
  echo "== BALAYAGE GROSSIER (ce n'est PAS SkillSpector : aucun score, aucun verdict ; chaque constat se relit en contexte) ==" >&2
  exec python3 -I "$(dirname "$0")/balayage-skills-grossier.py" "$cible"
fi

bin="${SKILLSPECTOR_BIN:-}"
[ -n "$bin" ] || bin="$(command -v skillspector 2>/dev/null || true)"
if [ -z "$bin" ] || [ ! -x "$bin" ]; then
  cat >&2 <<'MSG'
SkillSpector (NVIDIA) n'est pas installé : AUCUN SCAN N'A EU LIEU, donc AUCUN VERDICT (ni SAFE, ni CAUTION, ni DO_NOT_INSTALL).
Ne recopiez pas le skill « parce que le scanner n'a rien dit » : il n'a rien dit du tout.

Pour l'installer (c'est du code tiers, Apache-2.0 ; à décider par Justin ; l'installation s'ouvre au réseau pour télécharger les dépendances) :
  1. Un dossier de travail HORS du dépôt :   mkdir -p "${TMPDIR:-/tmp}/skillspector" && cd "${TMPDIR:-/tmp}/skillspector"
  2. Récupérer le code :                      git clone https://github.com/NVIDIA/SkillSpector.git && cd SkillSpector
     (version relue le 28 octobre 2026 : commit d501c0d5035c2ed6385740a384d942bb05651fda, v2.12.0 — vérifier `git log -1`)
  3. Un environnement isolé et l'installation:  uv venv .venv && uv pip install --python .venv/bin/python .
  4. Dire à ce script où il est :              export SKILLSPECTOR_BIN="$PWD/.venv/bin/skillspector"
  Autre voie du README : `docker build -t skillspector .` puis `docker run --rm -v "$PWD:/scan" skillspector scan ./skill/ --no-llm`.
  Ne jamais configurer de clé d'API pour ce scan : le mode statique n'en demande aucune.

En attendant, un balayage GROSSIER (pas un scanner) aide une relecture à la main :  bash scripts/scanner-skills.sh <dossier> --grossier
MSG
  exit 3
fi

args=(scan "$cible" --no-llm --fail-on-incomplete)
[ "$recursif" -eq 1 ] && args+=(--recursive --max-skills "$SEUIL_MAX_SKILLS")
if [ -n "$json" ]; then
  # Le rapport peut citer des chemins et des extraits : il ne s'écrit jamais dans l'arbre git.
  depot="$(cd "$(dirname "$0")/.." && pwd -P)"
  abs="$(realpath -m -- "$json")"
  case "$abs" in
    "$depot"|"$depot"/*) echo "Refusé : $json est DANS le dépôt. Écrivez le rapport dans le dossier temporaire de la session." >&2; exit 4 ;;
  esac
  args+=(--format json --output "$json")
fi

echo "== SkillSpector, mode statique (--no-llm). Dépendances : seuls des noms et versions de paquets sortent, vers api.osv.dev ==" >&2
"$bin" "${args[@]}"
rc=$?
case "$rc" in
  0) echo "== Sortie 0 : risque <= 50 (SAFE ou CAUTION). Lire le rapport quand même, et relire à la main les scripts du skill. ==" >&2 ;;
  1) echo "== Sortie 1 : risque > 50 (DO_NOT_INSTALL) OU couverture incomplète. Ne pas recopier avant d'avoir compris chaque constat. ==" >&2 ;;
  *) echo "== Sortie $rc : le scan a échoué (entrée illisible ou erreur interne). AUCUN VERDICT. ==" >&2 ;;
esac
exit "$rc"
