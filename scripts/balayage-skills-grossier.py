#!/usr/bin/env python3
"""Balayage statique GROSSIER d'un dossier de skills — ce n'est PAS SkillSpector.

Né le 28 octobre 2026, le jour où SkillSpector n'a pas pu être installé (voir PROVENANCE-trailofbits.md) : il ne remplace pas le scanner
(71 motifs en 17 catégories, analyse des dépendances, score), il dit seulement CE QU'ON VOIT À L'ŒIL, pour aider une relecture humaine.
Il ne décide rien : chaque constat se relit en contexte (la plupart sont des exemples d'attaque cités par un skill pour dire de les traiter
comme des données — « ignore previous instructions » —, ou de la prose sur des outils d'envoi).

Lecture seule : il ouvre des fichiers et imprime. Il n'exécute rien de ce qu'il lit, n'ouvre aucune connexion, n'écrit aucun fichier.
Usage : python3 -I scripts/balayage-skills-grossier.py <dossier> [<dossier> ...]   (sortie : JSON sur la sortie standard)
`-I` : l'interpréteur ne charge rien depuis le dossier courant ni depuis celui du script (un fichier tiers ne s'importe pas).
"""
import json
import os
import re
import sys
import unicodedata

MOTIFS = {
    "reseau_sortant": r"\b(curl|wget|fetch\(|requests\.(get|post)|urllib|httpx|http\.client|axios|XMLHttpRequest|nc -|socket\.)",
    "execution_shell": r"\b(subprocess|os\.system|child_process|exec\(|eval\(|Popen|bash -c|sh -c|\| *(ba)?sh\b)",
    "installation_paquets": r"\b(pip install|npm (i|install)|uv (pip|tool) install|npx |curl[^\n]*\| *(ba)?sh|brew install|apt(-get)? install)",
    "identifiants": r"(\.ssh|\.aws|\.env\b|credentials|id_rsa|api[_-]?key|secret|token|password|keychain|\.npmrc|\.netrc)",
    "obfuscation": r"(base64|atob\(|b64decode|\\x[0-9a-f]{2}\\x|fromCharCode|rot13)",
    "injection_de_prompt": r"(ignore (all |any )?(previous|prior|above) (instructions|rules)|disregard|you are now|do not (tell|inform|mention) the user|without (telling|informing|asking) the user|secretly|hidden instruction|override (the )?(system|safety))",
    "ecriture_de_configuration": r"(settings\.json|CLAUDE\.md|\.claude/|enabledPlugins|hooks\b|crontab|\.bashrc|\.zshrc|authorized_keys)",
    "envoi_de_donnees_a_un_tiers": r"(send .{0,40}(to|via) (codex|gemini|openai|antigravity|external|third)|upload|exfil|webhook|telemetry|analytics\.|POST )",
}
IGNORES = {".git", "node_modules", "__pycache__"}


def invisibles(texte):
    """Caractères de format Unicode (espaces de largeur nulle, inversion de sens…) : ils cachent du texte à l'œil."""
    return [c for c in texte if unicodedata.category(c) == "Cf"]


def balayer(racine):
    constats = {}
    for dossier, sous_dossiers, fichiers in os.walk(racine):
        sous_dossiers[:] = [d for d in sous_dossiers if d not in IGNORES]
        for nom in fichiers:
            chemin = os.path.join(dossier, nom)
            rel = os.path.relpath(chemin, racine)
            try:
                with open(chemin, encoding="utf-8", errors="strict") as f:
                    texte = f.read()
            except (OSError, UnicodeDecodeError):
                constats.setdefault("binaire_ou_illisible", []).append(rel)
                continue
            for famille, motif in MOTIFS.items():
                n = len(re.findall(motif, texte, re.I))
                if n:
                    constats.setdefault(famille, []).append([rel, n])
            inv = invisibles(texte)
            if inv:
                constats.setdefault("caracteres_invisibles", []).append([rel, len(inv)])
            if nom.endswith((".sh", ".py", ".js")) or os.access(chemin, os.X_OK):
                constats.setdefault("scripts_ou_executables", []).append(rel)
    return constats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sortie = {}
    for cible in sys.argv[1:]:
        if not os.path.isdir(cible):
            sys.exit("pas un dossier : " + cible)
        sortie[cible] = balayer(cible)
    json.dump(sortie, sys.stdout, indent=1, ensure_ascii=False)
    print()
