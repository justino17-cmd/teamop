#!/usr/bin/env python3
"""Mutations de test-3205 (modèle par défaut, budget, fiche de poste des agents au travail), 30 octobre 2026.

Règle du dépôt : correctif -> banc -> `git commit` -> mutation -> `git checkout`. Ce script RESTAURE chaque fichier par
`git checkout -- <fichier>` après chaque mutation : lancer d'abord `git status` (rien de non commité dans ces fichiers).
Chaque mutation doit faire tomber test-3205 (code de sortie 1) ET changer vraiment le fichier (`git diff` non vide) ;
sinon elle est comptée « ne mord pas » ou « mal visée ».
Lancer depuis la racine du dépôt, au premier plan : python3 scratchpad/mutations-modele-travail.py
"""
import subprocess, sys

MUT = [
    # (nom, fichier, ancien, nouveau)
    ("défaut Opus retiré (Sonnet partout)", "server/cerveau.js",
     "return travail === true && AGENTS_TRAVAIL.includes(id) ? MODELE_TRAVAIL_DEFAUT : MODELE_DEFAUT;",
     "return MODELE_DEFAUT;"),
    ("Opus aussi pour le juge (travail ignoré)", "server/cerveau.js",
     "return travail === true && AGENTS_TRAVAIL.includes(id) ? MODELE_TRAVAIL_DEFAUT : MODELE_DEFAUT;",
     "return AGENTS_TRAVAIL.includes(id) ? MODELE_TRAVAIL_DEFAUT : MODELE_DEFAUT;"),
    ("Opus pour tous les agents (liste ignorée)", "server/cerveau.js",
     "return travail === true && AGENTS_TRAVAIL.includes(id) ? MODELE_TRAVAIL_DEFAUT : MODELE_DEFAUT;",
     "return travail === true ? MODELE_TRAVAIL_DEFAUT : MODELE_DEFAUT;"),
    ("le réglage de Justin ne gagne plus", "server/cerveau.js",
     "if (regles && typeof regles === 'object' && Object.prototype.hasOwnProperty.call(regles, id) && typeof regles[id] === 'string' && FORME_MODELE.test(regles[id])) return regles[id];",
     ""),
    ("travail « presque vrai » accepté", "server/cerveau.js",
     "return travail === true && AGENTS_TRAVAIL.includes(id)",
     "return travail && AGENTS_TRAVAIL.includes(id)"),
    ("identifiant d'Opus inventé", "server/cerveau.js",
     "const MODELE_TRAVAIL_DEFAUT = 'claude-opus-5-5';",
     "const MODELE_TRAVAIL_DEFAUT = 'claude-opus-5-6';"),
    ("penser n'envoie plus le drapeau travail au choix du modèle", "server/cerveau.js",
     "const modele = modeleDe(id, travail), [tIn, tOut]",
     "const modele = modeleDe(id), [tIn, tOut]"),
    ("budget par défaut baissé à 150", "server/cerveau.js",
     "const TOTAL_USD = 195;",
     "const TOTAL_USD = 150;"),
    ("estimation du rejeu : « avant » compté en Opus", "server/outils/evaluation-travail/rejouer.js",
     "CERVEAU.modeleParDefaut(ag, mode === 'apres', cfg.modeles)",
     "CERVEAU.modeleParDefaut(ag, true, cfg.modeles)"),
    ("estimation du rejeu : « après » compté en Sonnet", "server/outils/evaluation-travail/rejouer.js",
     "CERVEAU.modeleParDefaut(ag, mode === 'apres', cfg.modeles)",
     "CERVEAU.modeleParDefaut(ag, false, cfg.modeles)"),
    ("fiche non branchée chez Camille", "server/agent-camille.js",
     " + require('./agents-fiches').blocTravail('camille');",
     ";"),
    ("fiche de Léa posée même interrupteur coupé", "server/agent-lea.js",
     "(travailActif() ? FICHES.blocTravail(ID) : '')",
     "FICHES.blocTravail(ID)"),
    ("fiche de Margaux doublée", "server/agent-margaux.js",
     "].join('\\n') + require('./agents-fiches').blocTravail('margaux');",
     "].join('\\n') + require('./agents-fiches').blocTravail('margaux') + require('./agents-fiches').blocTravail('margaux');"),
    ("le rappel de fiche reprend le bloc qui parle à Justin", "server/agents-fiches.js",
     "    '- Ta mission : ' + f.mission + '\\n' +",
     "    '- Ta mission : ' + f.mission + '\\n' + METHODE + '\\n' +"),
    ("le rappel oublie l'interdit", "server/agents-fiches.js",
     "    '- Tu ne fais jamais : ' + liste(f.jamais) + '.\\n' +\n    '- Vérifier",
     "    '- Vérifier"),
]

def sh(*a, **k):
    return subprocess.run(a, capture_output=True, text=True, timeout=k.get("timeout", 120))

bilan = []
for nom, fic, ancien, nouveau in MUT:
    src = open(fic, encoding="utf-8").read()
    if src.count(ancien) != 1:
        bilan.append((nom, "MAL VISÉE (motif trouvé %d fois)" % src.count(ancien)))
        continue
    open(fic, "w", encoding="utf-8").write(src.replace(ancien, nouveau, 1))
    try:
        diff = sh("git", "diff", "--stat", "--", fic).stdout.strip()
        if not diff:
            bilan.append((nom, "MAL VISÉE (git diff vide)"))
            continue
        try:
            r = sh("node", "tests/test-3205.js", timeout=120)
            tombe = r.returncode != 0
        except subprocess.TimeoutExpired:
            tombe = True
        bilan.append((nom, "TOMBE" if tombe else "NE MORD PAS"))
    finally:
        sh("git", "checkout", "--", fic)

ok = True
for nom, etat in bilan:
    print("%-70s %s" % (nom, etat))
    ok = ok and etat == "TOMBE"
propre = sh("git", "status", "--short", "--", *sorted({m[1] for m in MUT})).stdout.strip()
print("fichiers mutés restaurés :", "oui" if not propre else "NON — " + propre)
sys.exit(0 if ok and not propre else 1)
